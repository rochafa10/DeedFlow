/**
 * U.S. Drought Monitor API Service
 *
 * Provides current and historical drought data from the U.S. Drought Monitor.
 * Free public API - no API key required.
 *
 * API Documentation: https://droughtmonitor.unl.edu/DmData/DataDownload.aspx
 * Data Source: National Drought Mitigation Center (NDMC)
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
import type { DroughtCategory } from '../../../types/risk-analysis';

/**
 * Current drought status for a location
 */
export interface DroughtStatus {
  /** Drought category (D0-D4 or none) */
  category: DroughtCategory;
  /** Drought severity level (0-5, 0 = none, 5 = D4 exceptional) */
  severity: number;
  /** Descriptive name of the drought category */
  description: string;
  /** Percentage of the area affected by this drought level */
  areaPercentage: number;
  /** Valid date for this drought status */
  validDate: string;
  /** State code */
  stateCode: string;
  /** County FIPS code if available */
  countyFips?: string;
}

/**
 * Historical drought statistics
 */
export interface HistoricalDrought {
  /** Location identifier */
  location: {
    lat: number;
    lng: number;
    stateCode: string;
    countyFips?: string;
  };
  /** Number of drought events in the period */
  droughtEventCount: number;
  /** Percentage of time in any drought condition (D0+) */
  percentageInDrought: number;
  /** Percentage of time in severe drought (D2+) */
  percentageInSevereDrought: number;
  /** Worst drought category experienced */
  worstCategory: DroughtCategory;
  /** Date of worst drought */
  worstDroughtDate: string | null;
  /** Average drought duration in weeks */
  averageDurationWeeks: number;
  /** Time period analyzed (in years) */
  periodYears: number;
  /** Weekly drought observations */
  weeklyData?: Array<{
    date: string;
    category: DroughtCategory;
    severity: number;
  }>;
}

/**
 * Drought percentile data
 */
export interface DroughtPercentile {
  /** Percentile ranking (0-100, lower = drier) */
  percentile: number;
  /** Precipitation percentile for the period */
  precipPercentile: number | null;
  /** Soil moisture percentile */
  soilMoisturePercentile: number | null;
  /** Streamflow percentile */
  streamflowPercentile: number | null;
  /** Period description (e.g., "30-day", "90-day") */
  period: string;
}

/**
 * Comprehensive drought data for a location
 */
export interface DroughtData {
  location: {
    lat: number;
    lng: number;
    stateCode: string;
    countyFips?: string;
  };
  current: DroughtStatus;
  percentiles: DroughtPercentile[];
  historical: HistoricalDrought | null;
  waterRestrictions: string[];
  dataQuality: {
    confidence: number;
    dataSource: string;
    lastUpdated: string;
  };
}

/**
 * Drought Monitor Service Configuration
 */
export interface DroughtMonitorServiceConfig {
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default configuration
 */
const DEFAULT_DROUGHT_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://usdmdataservices.unl.edu/api',
  timeout: 30000,
  retries: 3,
  retryDelay: 2000,
  serviceName: 'drought-monitor',
  headers: {
    'Accept': 'application/json',
  },
};

/**
 * Default cache config - 7 days for drought data (updates weekly on Thursdays)
 */
const DEFAULT_DROUGHT_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 604800000, // 7 days
  maxSize: 500,
};

/**
 * Default rate limit - public API, be respectful
 */
const DEFAULT_DROUGHT_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 1,
  burstSize: 3,
  queueExcess: true,
};

/**
 * Drought category severity mapping
 */
const DROUGHT_SEVERITY: Record<DroughtCategory, number> = {
  'none': 0,
  'D0': 1,
  'D1': 2,
  'D2': 3,
  'D3': 4,
  'D4': 5,
};

/**
 * Drought category descriptions
 */
const DROUGHT_DESCRIPTIONS: Record<DroughtCategory, string> = {
  'none': 'No drought conditions',
  'D0': 'Abnormally Dry',
  'D1': 'Moderate Drought',
  'D2': 'Severe Drought',
  'D3': 'Extreme Drought',
  'D4': 'Exceptional Drought',
};

/**
 * State-specific water restriction information
 */
const STATE_WATER_RESTRICTIONS: Record<string, string[]> = {
  'CA': ['Mandatory water conservation', 'Limited outdoor watering', 'No car washing with hose'],
  'TX': ['Outdoor watering restrictions', 'Limited irrigation hours'],
  'AZ': ['Groundwater management restrictions', 'Limited outdoor use'],
  'NM': ['Prior appropriation restrictions', 'Limited agricultural use'],
  'NV': ['Strict outdoor watering limits', 'Conservation mandate'],
  'CO': ['Water sharing agreements', 'Limited lawn watering'],
  'UT': ['Secondary water restrictions', 'Limited irrigation windows'],
};

/**
 * U.S. Drought Monitor API Service
 *
 * Provides drought status and historical data for property risk analysis.
 */
export class DroughtMonitorService extends BaseApiService {
  constructor(config?: DroughtMonitorServiceConfig) {
    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_DROUGHT_CONFIG,
      baseUrl: DEFAULT_DROUGHT_CONFIG.baseUrl!,
    };

    super(
      apiConfig,
      { ...DEFAULT_DROUGHT_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_DROUGHT_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.logger.info('DroughtMonitorService initialized (free API, no key required)');
  }

  /**
   * Get current drought status for a location
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to current drought status
   */
  public async getDroughtStatus(lat: number, lng: number): Promise<DroughtStatus> {
    this.validateCoordinates(lat, lng);

    try {
      // Get state code from coordinates
      const stateCode = await this.getStateFromCoordinates(lat, lng);

      // Fetch current drought data
      // U.S. Drought Monitor updates weekly on Thursdays
      const response = await this.get<{
        data: Array<{
          MapDate: string;
          StatisticFormatID: number;
          D0?: number;
          D1?: number;
          D2?: number;
          D3?: number;
          D4?: number;
          None?: number;
        }>;
      }>(`/StateStatistics/GetDroughtSeverityStatisticsByAreaPercent`, {
        params: {
          aoi: stateCode,
          statisticsType: '1', // Current conditions
        },
        cache: {
          ttl: this.cacheConfig.ttl,
        },
      });

      // Parse the response to determine drought category
      const latestData = response.data.data[0];
      if (!latestData) {
        return this.createDefaultDroughtStatus(stateCode);
      }

      // Determine highest drought category affecting the area
      const category = this.determineDroughtCategory(latestData);
      const areaPercentage = this.getAreaPercentage(latestData, category);

      return {
        category,
        severity: DROUGHT_SEVERITY[category],
        description: DROUGHT_DESCRIPTIONS[category],
        areaPercentage,
        validDate: latestData.MapDate,
        stateCode,
      };
    } catch (error) {
      this.logger.warn('Failed to fetch drought status, using fallback', {
        error: error instanceof Error ? error.message : String(error),
        lat,
        lng,
      });

      // Fallback to estimated drought status
      return this.estimateDroughtStatus(lat, lng);
    }
  }

  /**
   * Get historical drought data for a location
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @param years - Number of years of history to analyze (default: 10)
   * @returns Promise resolving to historical drought statistics
   */
  public async getHistoricalDrought(
    lat: number,
    lng: number,
    years: number = 10
  ): Promise<HistoricalDrought> {
    this.validateCoordinates(lat, lng);

    if (years < 1 || years > 25) {
      throw new ValidationError(
        'Years parameter must be between 1 and 25',
        '/historical',
        'historical-request',
        'years',
        { min: '1', max: '25' },
        years
      );
    }

    try {
      const stateCode = await this.getStateFromCoordinates(lat, lng);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - years);

      // Fetch historical time series data
      const response = await this.get<{
        data: Array<{
          MapDate: string;
          D0?: number;
          D1?: number;
          D2?: number;
          D3?: number;
          D4?: number;
          None?: number;
        }>;
      }>(`/StateStatistics/GetDroughtSeverityStatisticsByAreaPercent`, {
        params: {
          aoi: stateCode,
          statisticsType: '2', // Time series
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate),
        },
        cache: {
          ttl: this.cacheConfig.ttl,
        },
      });

      // Analyze historical data
      const weeklyData = response.data.data.map(entry => ({
        date: entry.MapDate,
        category: this.determineDroughtCategory(entry),
        severity: DROUGHT_SEVERITY[this.determineDroughtCategory(entry)],
      }));

      const analysis = this.analyzeHistoricalData(weeklyData, years);

      return {
        location: {
          lat,
          lng,
          stateCode,
        },
        droughtEventCount: analysis.eventCount,
        percentageInDrought: analysis.percentageInDrought,
        percentageInSevereDrought: analysis.percentageInSevereDrought,
        worstCategory: analysis.worstCategory,
        worstDroughtDate: analysis.worstDroughtDate,
        averageDurationWeeks: analysis.averageDurationWeeks,
        periodYears: years,
        weeklyData,
      };
    } catch (error) {
      this.logger.warn('Failed to fetch historical drought data, using fallback', {
        error: error instanceof Error ? error.message : String(error),
        lat,
        lng,
        years,
      });

      // Return minimal historical data
      return this.createDefaultHistoricalDrought(lat, lng, years);
    }
  }

  /**
   * Get comprehensive drought data for a location
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to comprehensive drought data
   */
  public async getDroughtData(lat: number, lng: number): Promise<DroughtData> {
    this.validateCoordinates(lat, lng);

    const [currentStatus, historicalData] = await Promise.all([
      this.getDroughtStatus(lat, lng),
      this.getHistoricalDrought(lat, lng, 10).catch(() => null),
    ]);

    const stateCode = currentStatus.stateCode;
    const waterRestrictions = STATE_WATER_RESTRICTIONS[stateCode] || [];

    return {
      location: {
        lat,
        lng,
        stateCode,
      },
      current: currentStatus,
      percentiles: this.estimatePercentiles(currentStatus),
      historical: historicalData,
      waterRestrictions,
      dataQuality: {
        confidence: historicalData ? 85 : 60,
        dataSource: 'U.S. Drought Monitor / NDMC',
        lastUpdated: currentStatus.validDate,
      },
    };
  }

  /**
   * Validate latitude and longitude
   */
  private validateCoordinates(lat: number, lng: number): void {
    if (lat < -90 || lat > 90) {
      throw new ValidationError(
        'Invalid latitude',
        '/drought',
        'coord-validation',
        'latitude',
        { min: '-90', max: '90' },
        lat
      );
    }

    if (lng < -180 || lng > 180) {
      throw new ValidationError(
        'Invalid longitude',
        '/drought',
        'coord-validation',
        'longitude',
        { min: '-180', max: '180' },
        lng
      );
    }
  }

  /**
   * Get state code from coordinates
   * This is a simplified version - in production, use a proper geocoding service
   */
  private async getStateFromCoordinates(lat: number, lng: number): Promise<string> {
    // Simple state boundary approximations
    // In production, this should use a proper geocoding API
    const stateMapping: Array<{ bounds: [number, number, number, number]; code: string }> = [
      { bounds: [32.5, -124.5, 42.0, -114.0], code: 'CA' },
      { bounds: [25.8, -106.6, 36.5, -93.5], code: 'TX' },
      { bounds: [31.3, -114.8, 37.0, -109.0], code: 'AZ' },
      { bounds: [31.3, -109.0, 37.0, -103.0], code: 'NM' },
      { bounds: [35.0, -119.0, 42.0, -114.0], code: 'NV' },
      { bounds: [37.0, -109.1, 41.0, -102.0], code: 'CO' },
      { bounds: [37.0, -114.0, 42.0, -109.0], code: 'UT' },
    ];

    for (const state of stateMapping) {
      const [minLat, minLng, maxLat, maxLng] = state.bounds;
      if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
        return state.code;
      }
    }

    // Default to California for western states, Texas for others
    return lng < -110 ? 'CA' : 'TX';
  }

  /**
   * Determine the highest drought category from API data
   */
  private determineDroughtCategory(data: {
    D0?: number;
    D1?: number;
    D2?: number;
    D3?: number;
    D4?: number;
    None?: number;
  }): DroughtCategory {
    // Check from worst to best
    if ((data.D4 || 0) > 0) return 'D4';
    if ((data.D3 || 0) > 0) return 'D3';
    if ((data.D2 || 0) > 0) return 'D2';
    if ((data.D1 || 0) > 0) return 'D1';
    if ((data.D0 || 0) > 0) return 'D0';
    return 'none';
  }

  /**
   * Get area percentage for a specific drought category
   */
  private getAreaPercentage(
    data: {
      D0?: number;
      D1?: number;
      D2?: number;
      D3?: number;
      D4?: number;
      None?: number;
    },
    category: DroughtCategory
  ): number {
    if (category === 'none') {
      return data.None || 100;
    }
    return data[category] || 0;
  }

  /**
   * Analyze historical weekly data
   */
  private analyzeHistoricalData(
    weeklyData: Array<{ date: string; category: DroughtCategory; severity: number }>,
    years: number
  ): {
    eventCount: number;
    percentageInDrought: number;
    percentageInSevereDrought: number;
    worstCategory: DroughtCategory;
    worstDroughtDate: string | null;
    averageDurationWeeks: number;
  } {
    if (weeklyData.length === 0) {
      return {
        eventCount: 0,
        percentageInDrought: 0,
        percentageInSevereDrought: 0,
        worstCategory: 'none',
        worstDroughtDate: null,
        averageDurationWeeks: 0,
      };
    }

    const totalWeeks = weeklyData.length;
    const droughtWeeks = weeklyData.filter(d => d.severity > 0).length;
    const severeDroughtWeeks = weeklyData.filter(d => d.severity >= 3).length;

    // Find worst drought
    const worstWeek = weeklyData.reduce((worst, current) =>
      current.severity > worst.severity ? current : worst
    );

    // Count drought events (consecutive weeks of drought)
    let eventCount = 0;
    let inDrought = false;
    let currentEventLength = 0;
    let totalEventLength = 0;

    for (const week of weeklyData) {
      if (week.severity > 0) {
        if (!inDrought) {
          eventCount++;
          inDrought = true;
        }
        currentEventLength++;
      } else {
        if (inDrought) {
          totalEventLength += currentEventLength;
          currentEventLength = 0;
          inDrought = false;
        }
      }
    }

    // Include final event if still in drought
    if (inDrought) {
      totalEventLength += currentEventLength;
    }

    const averageDurationWeeks = eventCount > 0 ? totalEventLength / eventCount : 0;

    return {
      eventCount,
      percentageInDrought: (droughtWeeks / totalWeeks) * 100,
      percentageInSevereDrought: (severeDroughtWeeks / totalWeeks) * 100,
      worstCategory: worstWeek.category,
      worstDroughtDate: worstWeek.date,
      averageDurationWeeks: Math.round(averageDurationWeeks),
    };
  }

  /**
   * Estimate drought percentiles based on current status
   */
  private estimatePercentiles(status: DroughtStatus): DroughtPercentile[] {
    const basePercentile = this.categoryToPercentile(status.category);

    return [
      {
        percentile: basePercentile,
        precipPercentile: basePercentile,
        soilMoisturePercentile: Math.max(0, basePercentile - 5),
        streamflowPercentile: Math.max(0, basePercentile - 10),
        period: '30-day',
      },
      {
        percentile: Math.max(0, basePercentile - 5),
        precipPercentile: Math.max(0, basePercentile - 5),
        soilMoisturePercentile: Math.max(0, basePercentile - 10),
        streamflowPercentile: Math.max(0, basePercentile - 15),
        period: '90-day',
      },
    ];
  }

  /**
   * Convert drought category to percentile (0-100, lower = drier)
   */
  private categoryToPercentile(category: DroughtCategory): number {
    const percentileMap: Record<DroughtCategory, number> = {
      'none': 60,
      'D0': 40,
      'D1': 25,
      'D2': 15,
      'D3': 8,
      'D4': 3,
    };
    return percentileMap[category];
  }

  /**
   * Create default drought status when API is unavailable
   */
  private createDefaultDroughtStatus(stateCode: string): DroughtStatus {
    return {
      category: 'none',
      severity: 0,
      description: DROUGHT_DESCRIPTIONS['none'],
      areaPercentage: 100,
      validDate: new Date().toISOString().split('T')[0],
      stateCode,
    };
  }

  /**
   * Create default historical drought data
   */
  private createDefaultHistoricalDrought(
    lat: number,
    lng: number,
    years: number
  ): HistoricalDrought {
    return {
      location: { lat, lng, stateCode: 'Unknown' },
      droughtEventCount: 0,
      percentageInDrought: 0,
      percentageInSevereDrought: 0,
      worstCategory: 'none',
      worstDroughtDate: null,
      averageDurationWeeks: 0,
      periodYears: years,
    };
  }

  /**
   * Estimate drought status using basic heuristics
   * Fallback when API is unavailable
   */
  private async estimateDroughtStatus(lat: number, lng: number): Promise<DroughtStatus> {
    const stateCode = await this.getStateFromCoordinates(lat, lng);

    // Drought-prone states get moderate default, others get none
    const droughtProneStates = ['CA', 'TX', 'AZ', 'NM', 'NV', 'CO', 'UT', 'OK', 'KS'];
    const category: DroughtCategory = droughtProneStates.includes(stateCode) ? 'D0' : 'none';

    return {
      category,
      severity: DROUGHT_SEVERITY[category],
      description: DROUGHT_DESCRIPTIONS[category],
      areaPercentage: category === 'none' ? 100 : 40,
      validDate: new Date().toISOString().split('T')[0],
      stateCode,
    };
  }

  /**
   * Format date for API requests (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Singleton instance
 */
let droughtMonitorServiceInstance: DroughtMonitorService | null = null;

/**
 * Get the singleton instance of DroughtMonitorService
 */
export function getDroughtMonitorService(config?: DroughtMonitorServiceConfig): DroughtMonitorService {
  if (!droughtMonitorServiceInstance) {
    droughtMonitorServiceInstance = new DroughtMonitorService(config);
  }
  return droughtMonitorServiceInstance;
}

export default DroughtMonitorService;
