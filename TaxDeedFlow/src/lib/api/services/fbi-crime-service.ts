/**
 * FBI Crime Data API Service
 *
 * Provides access to FBI Crime Data Explorer (CDE) for crime statistics.
 * Free public API - no API key required.
 *
 * API Documentation: https://crime-data-explorer.fr.cloud.gov/api
 */

import { BaseApiService } from '../base-service';
import {
  ApiConfig,
  CacheConfig,
  CircuitBreakerConfig,
  RateLimitConfig,
  ApiResponse,
} from '../types';
import { ValidationError } from '../errors';

/**
 * Crime offense types
 */
export type OffenseType =
  | 'aggravated-assault'
  | 'burglary'
  | 'larceny'
  | 'motor-vehicle-theft'
  | 'homicide'
  | 'rape'
  | 'robbery'
  | 'arson'
  | 'violent-crime'
  | 'property-crime';

/**
 * Crime data for a state/county
 */
export interface CrimeData {
  year: number;
  state: string;
  stateAbbr?: string;
  population?: number;
  offenses: {
    violentCrime?: number;
    propertyCrime?: number;
    homicide?: number;
    rape?: number;
    robbery?: number;
    aggravatedAssault?: number;
    burglary?: number;
    larceny?: number;
    motorVehicleTheft?: number;
    arson?: number;
  };
  rates?: {
    violentCrimeRate?: number;
    propertyCrimeRate?: number;
  };
}

/**
 * Crime summary with analysis
 */
export interface CrimeSummary {
  state: string;
  stateAbbr: string;
  latestYear: number;
  violentCrimeRate: number;
  propertyCrimeRate: number;
  nationalComparison: {
    violentCrime: 'below_average' | 'average' | 'above_average';
    propertyCrime: 'below_average' | 'average' | 'above_average';
  };
  trend: 'decreasing' | 'stable' | 'increasing';
  riskLevel: 'low' | 'moderate' | 'high';
  topOffenses: Array<{ type: string; count: number }>;
}

/**
 * Single state estimate record
 */
interface FBIEstimateRecord {
  year: number;
  state_abbr: string;
  state_name: string;
  population?: number;
  violent_crime?: number;
  homicide?: number;
  rape_legacy?: number;
  rape_revised?: number;
  robbery?: number;
  aggravated_assault?: number;
  property_crime?: number;
  burglary?: number;
  larceny?: number;
  motor_vehicle_theft?: number;
  arson?: number;
}

/**
 * State estimates response
 */
interface FBIEstimatesResponse {
  results?: FBIEstimateRecord[];
}

/**
 * FBI Crime Service Configuration
 */
export interface FBICrimeServiceConfig {
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * FBI API Key - required for Crime Data Explorer API
 */
const FBI_API_KEY = process.env.FBI_CRIME_API_KEY || '';

/**
 * Default configuration
 */
const DEFAULT_FBI_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://api.usa.gov/crime/fbi/cde',
  timeout: 30000,
  retries: 2,
  retryDelay: 2000,
  serviceName: 'fbi-crime',
};

/**
 * Default cache config - 30 days (crime data updated annually)
 */
const DEFAULT_FBI_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 2592000000, // 30 days
  maxSize: 100,
};

/**
 * Default rate limit - public API, be respectful
 */
const DEFAULT_FBI_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 2,
  burstSize: 5,
  queueExcess: true,
};

/**
 * US national average crime rates (per 100,000 population, 2022)
 */
const NATIONAL_AVERAGES = {
  violentCrimeRate: 380, // per 100k
  propertyCrimeRate: 1954, // per 100k
};

/**
 * State FIPS codes
 */
const STATE_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10',
  FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19', KS: '20',
  KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28',
  MO: '29', MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36',
  NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45',
  SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54',
  WI: '55', WY: '56', DC: '11',
};

/**
 * FBI Crime Data API Service
 *
 * Free public API for crime statistics by state/county.
 */
export class FBICrimeService extends BaseApiService {
  constructor(config?: FBICrimeServiceConfig) {
    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_FBI_CONFIG,
      baseUrl: DEFAULT_FBI_CONFIG.baseUrl!,
    };

    super(
      apiConfig,
      { ...DEFAULT_FBI_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_FBI_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.logger.info('FBICrimeService initialized (free API, no key required)');
  }

  /**
   * Get state crime estimates
   *
   * @param stateAbbr - State abbreviation (e.g., 'PA')
   * @param years - Number of years of data (default 5)
   * @returns Promise resolving to crime data
   *
   * @example
   * ```typescript
   * const fbi = getFBICrimeService();
   * const data = await fbi.getStateCrimeData('PA', 5);
   * console.log(data.data[0].offenses.violentCrime);
   * ```
   */
  public async getStateCrimeData(
    stateAbbr: string,
    years: number = 5
  ): Promise<ApiResponse<CrimeData[]>> {
    const normalizedState = stateAbbr.toUpperCase();

    if (!STATE_FIPS[normalizedState]) {
      throw new ValidationError(
        `Invalid state abbreviation: ${stateAbbr}`,
        'stateAbbr',
        'validation',
        'stateAbbr',
        { validValues: Object.keys(STATE_FIPS).join(', ') },
        stateAbbr
      );
    }

    const currentYear = new Date().getFullYear();
    const fromYear = currentYear - years;

    const endpoint = `/estimates/states/${normalizedState}`;

    const response = await this.get<FBIEstimatesResponse>(endpoint, {
      params: {
        from: fromYear,
        to: currentYear - 1, // Data usually lags by 1-2 years
        api_key: FBI_API_KEY,
      },
    });

    const crimeData = (response.data.results || []).map((r) =>
      this.parseCrimeData(r)
    );

    return {
      ...response,
      data: crimeData.sort((a, b) => b.year - a.year), // Most recent first
    };
  }

  /**
   * Get crime summary with analysis for a state
   *
   * @param stateAbbr - State abbreviation
   * @returns Promise resolving to crime summary with risk analysis
   */
  public async getCrimeSummary(stateAbbr: string): Promise<ApiResponse<CrimeSummary>> {
    const crimeData = await this.getStateCrimeData(stateAbbr, 5);

    if (crimeData.data.length === 0) {
      throw new ValidationError(
        'No crime data available for state',
        'stateAbbr',
        'data',
        'stateAbbr',
        {},
        stateAbbr
      );
    }

    const latestData = crimeData.data[0];
    const population = latestData.population || 1;

    // Calculate rates per 100,000
    const violentCrimeRate = ((latestData.offenses.violentCrime || 0) / population) * 100000;
    const propertyCrimeRate = ((latestData.offenses.propertyCrime || 0) / population) * 100000;

    // Compare to national averages
    const compareToNational = (rate: number, national: number): 'below_average' | 'average' | 'above_average' => {
      if (rate < national * 0.8) return 'below_average';
      if (rate > national * 1.2) return 'above_average';
      return 'average';
    };

    // Calculate trend
    const trend = this.calculateTrend(crimeData.data);

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(violentCrimeRate, propertyCrimeRate);

    // Get top offenses
    const offenses = latestData.offenses;
    const topOffenses = Object.entries(offenses)
      .filter(([_, count]) => typeof count === 'number' && count > 0)
      .map(([type, count]) => ({ type: this.formatOffenseType(type), count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const summary: CrimeSummary = {
      state: latestData.state,
      stateAbbr: stateAbbr.toUpperCase(),
      latestYear: latestData.year,
      violentCrimeRate: Math.round(violentCrimeRate * 10) / 10,
      propertyCrimeRate: Math.round(propertyCrimeRate * 10) / 10,
      nationalComparison: {
        violentCrime: compareToNational(violentCrimeRate, NATIONAL_AVERAGES.violentCrimeRate),
        propertyCrime: compareToNational(propertyCrimeRate, NATIONAL_AVERAGES.propertyCrimeRate),
      },
      trend,
      riskLevel,
      topOffenses,
    };

    return {
      ...crimeData,
      data: summary,
    };
  }

  /**
   * Get offense-specific data for a state
   *
   * @param stateAbbr - State abbreviation
   * @param offense - Offense type
   * @param years - Number of years
   * @returns Promise resolving to offense data
   */
  public async getOffenseData(
    stateAbbr: string,
    offense: OffenseType,
    years: number = 5
  ): Promise<ApiResponse<Array<{ year: number; count: number; rate: number }>>> {
    const normalizedState = stateAbbr.toUpperCase();
    const currentYear = new Date().getFullYear();

    const endpoint = `/summarized/state/${normalizedState}/${offense}`;

    const response = await this.get<{ results?: Array<{ year: number; count: number; rate: number }> }>(
      endpoint,
      {
        params: {
          from: currentYear - years,
          to: currentYear - 1,
          api_key: FBI_API_KEY,
        },
      }
    );

    return {
      ...response,
      data: response.data.results || [],
    };
  }

  /**
   * Parse raw FBI API response to CrimeData
   */
  private parseCrimeData(raw: FBIEstimateRecord): CrimeData {
    return {
      year: raw.year,
      state: raw.state_name,
      stateAbbr: raw.state_abbr,
      population: raw.population,
      offenses: {
        violentCrime: raw.violent_crime,
        propertyCrime: raw.property_crime,
        homicide: raw.homicide,
        rape: raw.rape_revised || raw.rape_legacy,
        robbery: raw.robbery,
        aggravatedAssault: raw.aggravated_assault,
        burglary: raw.burglary,
        larceny: raw.larceny,
        motorVehicleTheft: raw.motor_vehicle_theft,
        arson: raw.arson,
      },
      rates: raw.population
        ? {
            violentCrimeRate: ((raw.violent_crime || 0) / raw.population) * 100000,
            propertyCrimeRate: ((raw.property_crime || 0) / raw.population) * 100000,
          }
        : undefined,
    };
  }

  /**
   * Calculate crime trend over years
   */
  private calculateTrend(data: CrimeData[]): 'decreasing' | 'stable' | 'increasing' {
    if (data.length < 2) return 'stable';

    // Compare most recent to oldest
    const recent = data[0].offenses.violentCrime || 0;
    const older = data[data.length - 1].offenses.violentCrime || 0;

    if (older === 0) return 'stable';

    const percentChange = ((recent - older) / older) * 100;

    if (percentChange < -10) return 'decreasing';
    if (percentChange > 10) return 'increasing';
    return 'stable';
  }

  /**
   * Calculate risk level based on crime rates
   */
  private calculateRiskLevel(
    violentCrimeRate: number,
    propertyCrimeRate: number
  ): 'low' | 'moderate' | 'high' {
    const violentRatio = violentCrimeRate / NATIONAL_AVERAGES.violentCrimeRate;
    const propertyRatio = propertyCrimeRate / NATIONAL_AVERAGES.propertyCrimeRate;
    const avgRatio = (violentRatio + propertyRatio) / 2;

    if (avgRatio < 0.8) return 'low';
    if (avgRatio > 1.3) return 'high';
    return 'moderate';
  }

  /**
   * Format offense type for display
   */
  private formatOffenseType(type: string): string {
    return type
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }
}

/**
 * Singleton instance
 */
let fbiCrimeServiceInstance: FBICrimeService | null = null;

export function getFBICrimeService(config?: FBICrimeServiceConfig): FBICrimeService {
  if (!fbiCrimeServiceInstance) {
    fbiCrimeServiceInstance = new FBICrimeService(config);
  }
  return fbiCrimeServiceInstance;
}

export function resetFBICrimeService(): void {
  fbiCrimeServiceInstance = null;
}

export default FBICrimeService;
