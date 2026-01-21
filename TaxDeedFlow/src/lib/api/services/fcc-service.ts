/**
 * FCC Broadband Map API Service
 *
 * Provides broadband availability data from the FCC National Broadband Map.
 * Free public API - no API key required.
 *
 * API Documentation: https://broadbandmap.fcc.gov/data-download/nationwide-data
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
 * Technology types for broadband
 */
export type BroadbandTechnology =
  | 'fiber' // Fiber to the Premises
  | 'cable' // Cable Modem/HFC
  | 'dsl' // DSL
  | 'fixed_wireless' // Fixed Wireless
  | 'satellite' // Satellite
  | 'other';

/**
 * Broadband provider info
 */
export interface BroadbandProvider {
  providerName: string;
  providerId?: string;
  technology: BroadbandTechnology;
  maxDownload: number; // Mbps
  maxUpload: number; // Mbps
  lowLatency: boolean;
  businessService: boolean;
  residentialService: boolean;
}

/**
 * Broadband availability at a location
 */
export interface BroadbandAvailability {
  location: {
    lat: number;
    lng: number;
    address?: string;
    blockCode?: string;
  };
  providers: BroadbandProvider[];
  summary: {
    totalProviders: number;
    hasFiber: boolean;
    hasCable: boolean;
    hasDSL: boolean;
    hasFixedWireless: boolean;
    maxDownloadSpeed: number;
    maxUploadSpeed: number;
    underserved: boolean; // < 25/3 Mbps
    unserved: boolean; // < 10/1 Mbps
  };
  connectivityScore: number; // 0-100
}

/**
 * County broadband statistics
 */
export interface CountyBroadbandStats {
  countyName: string;
  stateName: string;
  fipsCode: string;
  totalHouseholds?: number;
  percentWithBroadband?: number;
  percentUnderserved?: number;
  percentUnserved?: number;
  averageDownloadSpeed?: number;
  providerCount?: number;
}

/**
 * FCC Service Configuration
 */
export interface FCCServiceConfig {
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default configuration
 */
const DEFAULT_FCC_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://broadbandmap.fcc.gov/api',
  timeout: 30000,
  retries: 2,
  retryDelay: 2000,
  serviceName: 'fcc-broadband',
};

/**
 * Default cache config - 30 days (broadband data updated quarterly)
 */
const DEFAULT_FCC_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 2592000000, // 30 days
  maxSize: 200,
};

/**
 * Default rate limit - public API, be respectful
 */
const DEFAULT_FCC_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 2,
  burstSize: 5,
  queueExcess: true,
};

/**
 * Technology code mapping
 */
const TECHNOLOGY_CODES: Record<number, BroadbandTechnology> = {
  10: 'dsl', // ADSL
  11: 'dsl', // ADSL2
  12: 'dsl', // VDSL
  20: 'dsl', // SDSL
  30: 'other', // Other Copper
  40: 'cable', // Cable Modem DOCSIS 1
  41: 'cable', // Cable Modem DOCSIS 2
  42: 'cable', // Cable Modem DOCSIS 3
  43: 'cable', // Cable Modem DOCSIS 3.1
  50: 'fiber', // Fiber to the Premises
  60: 'satellite', // Satellite
  70: 'fixed_wireless', // Terrestrial Fixed Wireless
  71: 'fixed_wireless', // Licensed Fixed Wireless
  72: 'fixed_wireless', // Licensed-by-Rule Fixed Wireless
  0: 'other', // Other
};

/**
 * FCC Broadband Map API Service
 *
 * Provides broadband availability data for property analysis.
 */
export class FCCService extends BaseApiService {
  constructor(config?: FCCServiceConfig) {
    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_FCC_CONFIG,
      baseUrl: DEFAULT_FCC_CONFIG.baseUrl!,
    };

    super(
      apiConfig,
      { ...DEFAULT_FCC_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_FCC_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.logger.info('FCCService initialized (free API, no key required)');
  }

  /**
   * Get broadband availability at a specific location
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to broadband availability
   *
   * @example
   * ```typescript
   * const fcc = getFCCService();
   * const broadband = await fcc.getBroadbandAvailability(40.5186, -78.3947);
   * console.log(broadband.data.summary.hasFiber); // true/false
   * ```
   */
  public async getBroadbandAvailability(
    lat: number,
    lng: number
  ): Promise<ApiResponse<BroadbandAvailability>> {
    this.validateCoordinates(lat, lng);

    // The FCC API uses a location-based endpoint
    const endpoint = '/public/map/location';

    try {
      const response = await this.get<{
        providers?: Array<{
          frn?: string;
          provider_name?: string;
          technology?: number;
          max_advertised_download_speed?: number;
          max_advertised_upload_speed?: number;
          low_latency?: boolean;
          business_residential_code?: string;
        }>;
        block_geoid?: string;
        error?: string;
      }>(endpoint, {
        params: {
          lat,
          lon: lng,
          format: 'json',
        },
      });

      // If API returns empty or error, create a default response
      if (!response.data.providers || response.data.error) {
        return this.createNoDataResponse(lat, lng, response);
      }

      const providers = this.parseProviders(response.data.providers);
      const summary = this.calculateSummary(providers);
      const connectivityScore = this.calculateConnectivityScore(summary);

      const availability: BroadbandAvailability = {
        location: {
          lat,
          lng,
          blockCode: response.data.block_geoid,
        },
        providers,
        summary,
        connectivityScore,
      };

      return {
        ...response,
        data: availability,
      };
    } catch (error) {
      // If the FCC API is unavailable, return a default response
      this.logger.warn('FCC API unavailable, returning default response', { error });
      return this.createNoDataResponse(lat, lng, {
        data: {},
        status: 503,
        headers: {},
        cached: false,
        requestId: `fcc_${Date.now()}`,
        responseTime: 0,
      });
    }
  }

  /**
   * Get broadband availability by address
   *
   * @param address - Street address
   * @returns Promise resolving to broadband availability
   */
  public async getBroadbandByAddress(address: string): Promise<ApiResponse<BroadbandAvailability>> {
    if (!address || address.trim().length === 0) {
      throw new ValidationError(
        'Address is required',
        'address',
        'validation',
        'address',
        { required: 'true' },
        address
      );
    }

    // FCC API accepts address-based queries
    const endpoint = '/public/map/address';

    try {
      const response = await this.get<{
        providers?: Array<{
          frn?: string;
          provider_name?: string;
          technology?: number;
          max_advertised_download_speed?: number;
          max_advertised_upload_speed?: number;
          low_latency?: boolean;
          business_residential_code?: string;
        }>;
        block_geoid?: string;
        lat?: number;
        lon?: number;
        error?: string;
      }>(endpoint, {
        params: {
          address: address.trim(),
          format: 'json',
        },
      });

      if (!response.data.providers || response.data.error) {
        return this.createNoDataResponse(
          response.data.lat || 0,
          response.data.lon || 0,
          response,
          address
        );
      }

      const providers = this.parseProviders(response.data.providers);
      const summary = this.calculateSummary(providers);
      const connectivityScore = this.calculateConnectivityScore(summary);

      const availability: BroadbandAvailability = {
        location: {
          lat: response.data.lat || 0,
          lng: response.data.lon || 0,
          address,
          blockCode: response.data.block_geoid,
        },
        providers,
        summary,
        connectivityScore,
      };

      return {
        ...response,
        data: availability,
      };
    } catch (error) {
      this.logger.warn('FCC API unavailable for address lookup', { error, address });
      return this.createNoDataResponse(0, 0, {
        data: {},
        status: 503,
        headers: {},
        cached: false,
        requestId: `fcc_${Date.now()}`,
        responseTime: 0,
      }, address);
    }
  }

  /**
   * Check if a location has adequate broadband for modern use
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to boolean and details
   */
  public async hasAdequateBroadband(
    lat: number,
    lng: number
  ): Promise<ApiResponse<{ adequate: boolean; reason: string; details: BroadbandAvailability }>> {
    const availability = await this.getBroadbandAvailability(lat, lng);

    const summary = availability.data.summary;
    let adequate = false;
    let reason = '';

    // FCC defines adequate as 25/3 Mbps minimum
    if (summary.maxDownloadSpeed >= 25 && summary.maxUploadSpeed >= 3) {
      adequate = true;
      reason = `Adequate broadband available (${summary.maxDownloadSpeed}/${summary.maxUploadSpeed} Mbps)`;
    } else if (summary.maxDownloadSpeed >= 10 && summary.maxUploadSpeed >= 1) {
      adequate = false;
      reason = `Underserved area (${summary.maxDownloadSpeed}/${summary.maxUploadSpeed} Mbps) - below 25/3 standard`;
    } else if (summary.totalProviders === 0) {
      adequate = false;
      reason = 'Unserved area - no broadband providers available';
    } else {
      adequate = false;
      reason = `Unserved area (${summary.maxDownloadSpeed}/${summary.maxUploadSpeed} Mbps) - below 10/1 minimum`;
    }

    return {
      ...availability,
      data: {
        adequate,
        reason,
        details: availability.data,
      },
    };
  }

  /**
   * Parse provider data from API response
   */
  private parseProviders(
    rawProviders: Array<{
      frn?: string;
      provider_name?: string;
      technology?: number;
      max_advertised_download_speed?: number;
      max_advertised_upload_speed?: number;
      low_latency?: boolean;
      business_residential_code?: string;
    }>
  ): BroadbandProvider[] {
    return rawProviders.map((p) => ({
      providerName: p.provider_name || 'Unknown Provider',
      providerId: p.frn,
      technology: TECHNOLOGY_CODES[p.technology || 0] || 'other',
      maxDownload: p.max_advertised_download_speed || 0,
      maxUpload: p.max_advertised_upload_speed || 0,
      lowLatency: p.low_latency || false,
      businessService: p.business_residential_code === 'B' || p.business_residential_code === 'X',
      residentialService: p.business_residential_code === 'R' || p.business_residential_code === 'X',
    }));
  }

  /**
   * Calculate summary from provider list
   */
  private calculateSummary(providers: BroadbandProvider[]): BroadbandAvailability['summary'] {
    const maxDownload = providers.length > 0
      ? Math.max(...providers.map((p) => p.maxDownload))
      : 0;
    const maxUpload = providers.length > 0
      ? Math.max(...providers.map((p) => p.maxUpload))
      : 0;

    return {
      totalProviders: providers.length,
      hasFiber: providers.some((p) => p.technology === 'fiber'),
      hasCable: providers.some((p) => p.technology === 'cable'),
      hasDSL: providers.some((p) => p.technology === 'dsl'),
      hasFixedWireless: providers.some((p) => p.technology === 'fixed_wireless'),
      maxDownloadSpeed: maxDownload,
      maxUploadSpeed: maxUpload,
      underserved: maxDownload < 25 || maxUpload < 3,
      unserved: maxDownload < 10 || maxUpload < 1,
    };
  }

  /**
   * Calculate connectivity score (0-100)
   */
  private calculateConnectivityScore(summary: BroadbandAvailability['summary']): number {
    let score = 0;

    // Speed-based scoring (max 50 points)
    if (summary.maxDownloadSpeed >= 1000) score += 50; // Gigabit
    else if (summary.maxDownloadSpeed >= 300) score += 40;
    else if (summary.maxDownloadSpeed >= 100) score += 30;
    else if (summary.maxDownloadSpeed >= 25) score += 20;
    else if (summary.maxDownloadSpeed >= 10) score += 10;
    else score += 0;

    // Technology diversity (max 30 points)
    if (summary.hasFiber) score += 15;
    if (summary.hasCable) score += 10;
    if (summary.hasDSL) score += 3;
    if (summary.hasFixedWireless) score += 2;

    // Provider competition (max 20 points)
    score += Math.min(summary.totalProviders * 5, 20);

    return Math.min(100, score);
  }

  /**
   * Create a default response when no data is available
   */
  private createNoDataResponse(
    lat: number,
    lng: number,
    baseResponse: Partial<ApiResponse<unknown>>,
    address?: string
  ): ApiResponse<BroadbandAvailability> {
    return {
      data: {
        location: {
          lat,
          lng,
          address,
        },
        providers: [],
        summary: {
          totalProviders: 0,
          hasFiber: false,
          hasCable: false,
          hasDSL: false,
          hasFixedWireless: false,
          maxDownloadSpeed: 0,
          maxUploadSpeed: 0,
          underserved: true,
          unserved: true,
        },
        connectivityScore: 0,
      },
      status: baseResponse.status || 200,
      headers: baseResponse.headers || {},
      cached: baseResponse.cached || false,
      requestId: baseResponse.requestId || `fcc_${Date.now()}`,
      responseTime: baseResponse.responseTime || 0,
    };
  }

  /**
   * Validates geographic coordinates
   */
  private validateCoordinates(lat: number, lng: number): void {
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      throw new ValidationError(
        'Invalid latitude. Must be a number between -90 and 90.',
        'coordinates',
        'validation',
        'latitude',
        { range: 'Must be between -90 and 90' },
        lat
      );
    }

    if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
      throw new ValidationError(
        'Invalid longitude. Must be a number between -180 and 180.',
        'coordinates',
        'validation',
        'longitude',
        { range: 'Must be between -180 and 180' },
        lng
      );
    }
  }
}

/**
 * Singleton instance
 */
let fccServiceInstance: FCCService | null = null;

export function getFCCService(config?: FCCServiceConfig): FCCService {
  if (!fccServiceInstance) {
    fccServiceInstance = new FCCService(config);
  }
  return fccServiceInstance;
}

export function resetFCCService(): void {
  fccServiceInstance = null;
}

export default FCCService;
