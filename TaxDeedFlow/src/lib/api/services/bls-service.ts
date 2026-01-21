/**
 * Bureau of Labor Statistics (BLS) API Service
 *
 * Provides access to employment and unemployment data.
 * Free public API - no API key required for basic access (limited to 25 queries/day).
 * With API key: 500 queries/day.
 *
 * API Documentation: https://www.bls.gov/developers/
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
 * BLS Series IDs for common data
 * Format: LAUS{state_fips}{area_code}{measure_code}
 */
export const BLS_SERIES = {
  // Unemployment Rate by State (seasonally adjusted)
  UNEMPLOYMENT_RATE: (stateFips: string) => `LASST${stateFips}0000000003`,
  // Employment by State
  EMPLOYMENT: (stateFips: string) => `LASST${stateFips}0000000005`,
  // Labor Force by State
  LABOR_FORCE: (stateFips: string) => `LASST${stateFips}0000000006`,
  // National Unemployment Rate
  NATIONAL_UNEMPLOYMENT: 'LNS14000000',
  // CPI (Consumer Price Index)
  CPI_ALL_URBAN: 'CUUR0000SA0',
};

/**
 * BLS time series data point
 */
export interface BLSDataPoint {
  year: string;
  period: string;
  periodName: string;
  value: string;
  footnotes: Array<{ code: string; text: string }>;
}

/**
 * BLS series response
 */
export interface BLSSeries {
  seriesID: string;
  data: BLSDataPoint[];
}

/**
 * Employment summary for a state
 */
export interface EmploymentSummary {
  state: string;
  stateAbbr: string;
  latestMonth: string;
  latestYear: string;
  unemploymentRate: number;
  employmentCount?: number;
  laborForce?: number;
  nationalUnemploymentRate: number;
  comparison: 'below_national' | 'at_national' | 'above_national';
  trend: 'improving' | 'stable' | 'worsening';
  economicHealth: 'strong' | 'moderate' | 'weak';
}

/**
 * BLS API Response
 */
interface BLSAPIResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results?: {
    series: BLSSeries[];
  };
}

/**
 * BLS Service Configuration
 */
export interface BLSServiceConfig {
  apiKey?: string; // Optional - increases rate limit to 500/day
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default configuration
 */
const DEFAULT_BLS_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://api.bls.gov/publicAPI/v2',
  timeout: 30000,
  retries: 2,
  retryDelay: 2000,
  serviceName: 'bls',
};

/**
 * Default cache config - 7 days (monthly data)
 */
const DEFAULT_BLS_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 604800000, // 7 days
  maxSize: 100,
};

/**
 * Default rate limit - without key: 25/day ≈ 1/hour
 */
const DEFAULT_BLS_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 0.5, // Conservative
  burstSize: 5,
  queueExcess: true,
};

/**
 * State FIPS codes for BLS
 */
const STATE_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10',
  FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19', KS: '20',
  KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28',
  MO: '29', MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36',
  NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45',
  SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54',
  WI: '55', WY: '56', DC: '11', PR: '72',
};

/**
 * State names
 */
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia', PR: 'Puerto Rico',
};

/**
 * Bureau of Labor Statistics API Service
 *
 * Free public API for employment and economic data.
 */
export class BLSService extends BaseApiService {
  private apiKey?: string;

  constructor(config?: BLSServiceConfig) {
    const apiKey = config?.apiKey || process.env.BLS_API_KEY;

    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_BLS_CONFIG,
      baseUrl: DEFAULT_BLS_CONFIG.baseUrl!,
    };

    super(
      apiConfig,
      { ...DEFAULT_BLS_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_BLS_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.apiKey = apiKey;
    this.logger.info(`BLSService initialized (${apiKey ? 'with API key - 500 req/day' : 'no key - 25 req/day'})`);
  }

  /**
   * Get time series data for one or more series
   *
   * @param seriesIds - Array of BLS series IDs
   * @param startYear - Start year (default: current year - 2)
   * @param endYear - End year (default: current year)
   * @returns Promise resolving to series data
   */
  public async getSeriesData(
    seriesIds: string[],
    startYear?: number,
    endYear?: number
  ): Promise<ApiResponse<BLSSeries[]>> {
    if (!seriesIds || seriesIds.length === 0) {
      throw new ValidationError(
        'At least one series ID is required',
        'seriesIds',
        'validation',
        'seriesIds',
        { required: 'true' },
        seriesIds
      );
    }

    if (seriesIds.length > 50) {
      throw new ValidationError(
        'Maximum 50 series per request',
        'seriesIds',
        'validation',
        'seriesIds',
        { max: '50' },
        seriesIds.length
      );
    }

    const currentYear = new Date().getFullYear();
    const start = startYear || currentYear - 2;
    const end = endYear || currentYear;

    const endpoint = '/timeseries/data/';

    const requestBody: Record<string, unknown> = {
      seriesid: seriesIds,
      startyear: start.toString(),
      endyear: end.toString(),
    };

    if (this.apiKey) {
      requestBody.registrationkey = this.apiKey;
    }

    const response = await this.post<BLSAPIResponse>(endpoint, requestBody);

    if (response.data.status !== 'REQUEST_SUCCEEDED') {
      this.logger.warn('BLS API returned non-success status', {
        status: response.data.status,
        messages: response.data.message,
      });
    }

    return {
      ...response,
      data: response.data.Results?.series || [],
    };
  }

  /**
   * Get unemployment rate for a state
   *
   * @param stateAbbr - State abbreviation (e.g., 'PA')
   * @param years - Number of years of data (default 3)
   * @returns Promise resolving to unemployment data
   */
  public async getStateUnemploymentRate(
    stateAbbr: string,
    years: number = 3
  ): Promise<ApiResponse<BLSDataPoint[]>> {
    const normalizedState = stateAbbr.toUpperCase();
    const fips = STATE_FIPS[normalizedState];

    if (!fips) {
      throw new ValidationError(
        `Invalid state abbreviation: ${stateAbbr}`,
        'stateAbbr',
        'validation',
        'stateAbbr',
        { validValues: Object.keys(STATE_FIPS).join(', ') },
        stateAbbr
      );
    }

    const seriesId = BLS_SERIES.UNEMPLOYMENT_RATE(fips);
    const currentYear = new Date().getFullYear();

    const response = await this.getSeriesData(
      [seriesId],
      currentYear - years,
      currentYear
    );

    const series = response.data.find((s) => s.seriesID === seriesId);

    return {
      ...response,
      data: series?.data || [],
    };
  }

  /**
   * Get employment summary for a state with analysis
   *
   * @param stateAbbr - State abbreviation
   * @returns Promise resolving to employment summary
   */
  public async getEmploymentSummary(stateAbbr: string): Promise<ApiResponse<EmploymentSummary>> {
    const normalizedState = stateAbbr.toUpperCase();
    const fips = STATE_FIPS[normalizedState];

    if (!fips) {
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

    // Get state unemployment and national unemployment in one request
    const seriesIds = [
      BLS_SERIES.UNEMPLOYMENT_RATE(fips),
      BLS_SERIES.NATIONAL_UNEMPLOYMENT,
    ];

    const response = await this.getSeriesData(seriesIds, currentYear - 2, currentYear);

    const stateData = response.data.find((s) => s.seriesID === seriesIds[0]);
    const nationalData = response.data.find((s) => s.seriesID === seriesIds[1]);

    if (!stateData || stateData.data.length === 0) {
      throw new ValidationError(
        'No unemployment data available for state',
        'stateAbbr',
        'data',
        'stateAbbr',
        {},
        stateAbbr
      );
    }

    // Get latest data point
    const latestState = stateData.data[0];
    const latestNational = nationalData?.data[0];

    const stateRate = parseFloat(latestState.value);
    const nationalRate = latestNational ? parseFloat(latestNational.value) : 4.0; // fallback

    // Calculate trend (compare to 12 months ago if available)
    const yearAgoData = stateData.data.find(
      (d) => parseInt(d.year) === parseInt(latestState.year) - 1 && d.period === latestState.period
    );
    const yearAgoRate = yearAgoData ? parseFloat(yearAgoData.value) : stateRate;

    let trend: 'improving' | 'stable' | 'worsening';
    if (stateRate < yearAgoRate - 0.5) {
      trend = 'improving';
    } else if (stateRate > yearAgoRate + 0.5) {
      trend = 'worsening';
    } else {
      trend = 'stable';
    }

    // Compare to national
    let comparison: 'below_national' | 'at_national' | 'above_national';
    if (stateRate < nationalRate - 0.5) {
      comparison = 'below_national';
    } else if (stateRate > nationalRate + 0.5) {
      comparison = 'above_national';
    } else {
      comparison = 'at_national';
    }

    // Economic health assessment
    let economicHealth: 'strong' | 'moderate' | 'weak';
    if (stateRate < 4.0 && comparison !== 'above_national') {
      economicHealth = 'strong';
    } else if (stateRate > 6.0 || (stateRate > 5.0 && comparison === 'above_national')) {
      economicHealth = 'weak';
    } else {
      economicHealth = 'moderate';
    }

    const summary: EmploymentSummary = {
      state: STATE_NAMES[normalizedState] || normalizedState,
      stateAbbr: normalizedState,
      latestMonth: latestState.periodName,
      latestYear: latestState.year,
      unemploymentRate: stateRate,
      nationalUnemploymentRate: nationalRate,
      comparison,
      trend,
      economicHealth,
    };

    return {
      ...response,
      data: summary,
    };
  }

  /**
   * Get Consumer Price Index (CPI) data
   *
   * @param years - Number of years of data
   * @returns Promise resolving to CPI data
   */
  public async getCPIData(years: number = 3): Promise<ApiResponse<BLSDataPoint[]>> {
    const currentYear = new Date().getFullYear();

    const response = await this.getSeriesData(
      [BLS_SERIES.CPI_ALL_URBAN],
      currentYear - years,
      currentYear
    );

    const series = response.data.find((s) => s.seriesID === BLS_SERIES.CPI_ALL_URBAN);

    return {
      ...response,
      data: series?.data || [],
    };
  }

  /**
   * Get multiple states' unemployment for comparison
   *
   * @param stateAbbrs - Array of state abbreviations
   * @returns Promise resolving to unemployment data by state
   */
  public async compareStatesUnemployment(
    stateAbbrs: string[]
  ): Promise<ApiResponse<Record<string, { rate: number; month: string; year: string }>>> {
    const validStates = stateAbbrs
      .map((s) => s.toUpperCase())
      .filter((s) => STATE_FIPS[s]);

    if (validStates.length === 0) {
      throw new ValidationError(
        'No valid state abbreviations provided',
        'stateAbbrs',
        'validation',
        'stateAbbrs',
        { validValues: Object.keys(STATE_FIPS).join(', ') },
        stateAbbrs
      );
    }

    const seriesIds = validStates.map((s) => BLS_SERIES.UNEMPLOYMENT_RATE(STATE_FIPS[s]));
    const currentYear = new Date().getFullYear();

    const response = await this.getSeriesData(seriesIds, currentYear - 1, currentYear);

    const result: Record<string, { rate: number; month: string; year: string }> = {};

    validStates.forEach((state, index) => {
      const series = response.data.find((s) => s.seriesID === seriesIds[index]);
      if (series && series.data.length > 0) {
        const latest = series.data[0];
        result[state] = {
          rate: parseFloat(latest.value),
          month: latest.periodName,
          year: latest.year,
        };
      }
    });

    return {
      ...response,
      data: result,
    };
  }
}

/**
 * Singleton instance
 */
let blsServiceInstance: BLSService | null = null;

export function getBLSService(config?: BLSServiceConfig): BLSService {
  if (!blsServiceInstance) {
    blsServiceInstance = new BLSService(config);
  }
  return blsServiceInstance;
}

export function resetBLSService(): void {
  blsServiceInstance = null;
}

export default BLSService;
