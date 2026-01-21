/**
 * OpenStreetMap/Nominatim API Service
 *
 * Provides free geocoding services via Nominatim.
 * No API key required, but rate limited to 1 request/second.
 *
 * API Documentation: https://nominatim.org/release-docs/develop/api/Overview/
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
 * Nominatim geocoding result
 */
export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  boundingbox?: [string, string, string, string];
  class?: string;
  type?: string;
  importance?: number;
}

/**
 * Parsed geocoding result
 */
export interface GeocodingResult {
  placeId: number;
  latitude: number;
  longitude: number;
  displayName: string;
  address: {
    houseNumber?: string;
    street?: string;
    neighborhood?: string;
    city?: string;
    county?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    countryCode?: string;
  };
  boundingBox?: {
    south: number;
    north: number;
    west: number;
    east: number;
  };
  type?: string;
  importance?: number;
}

/**
 * OSM Service Configuration
 */
export interface OSMServiceConfig {
  userAgent?: string;
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default configuration
 */
const DEFAULT_OSM_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://nominatim.openstreetmap.org',
  timeout: 15000,
  retries: 2,
  retryDelay: 2000,
  serviceName: 'osm-nominatim',
  headers: {
    'User-Agent': 'TaxDeedFlow/1.0 (property-analysis)',
  },
};

/**
 * Default cache config - 7 days (addresses rarely change)
 */
const DEFAULT_OSM_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 604800000, // 7 days
  maxSize: 500,
};

/**
 * Default rate limit - Nominatim requires max 1 req/sec
 */
const DEFAULT_OSM_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 1,
  burstSize: 1,
  queueExcess: true, // Queue excess requests
};

/**
 * OpenStreetMap/Nominatim API Service
 *
 * Free geocoding service with 1 request/second rate limit.
 */
export class OSMService extends BaseApiService {
  constructor(config?: OSMServiceConfig) {
    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_OSM_CONFIG,
      baseUrl: DEFAULT_OSM_CONFIG.baseUrl!,
      headers: {
        ...DEFAULT_OSM_CONFIG.headers,
        'User-Agent': config?.userAgent || DEFAULT_OSM_CONFIG.headers?.['User-Agent'] || '',
      },
    };

    super(
      apiConfig,
      { ...DEFAULT_OSM_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_OSM_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.logger.info('OSMService initialized (free geocoding, 1 req/sec limit)');
  }

  /**
   * Geocode an address to coordinates
   *
   * @param address - Address to geocode
   * @param options - Optional search options
   * @returns Promise resolving to geocoding results
   *
   * @example
   * ```typescript
   * const osm = getOSMService();
   * const results = await osm.geocode('123 Main St, Altoona, PA 16601');
   * console.log(results.data[0].latitude); // 40.5186
   * ```
   */
  public async geocode(
    address: string,
    options?: {
      country?: string;
      limit?: number;
      addressDetails?: boolean;
    }
  ): Promise<ApiResponse<GeocodingResult[]>> {
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

    const endpoint = '/search';

    const params: Record<string, string | number | boolean | undefined> = {
      q: address.trim(),
      format: 'json',
      addressdetails: options?.addressDetails !== false ? 1 : 0,
      limit: options?.limit || 5,
    };

    if (options?.country) {
      params.countrycodes = options.country.toLowerCase();
    }

    const response = await this.get<NominatimResult[]>(endpoint, { params });

    return {
      ...response,
      data: (response.data || []).map((r) => this.parseResult(r)),
    };
  }

  /**
   * Reverse geocode coordinates to address
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @param zoom - Zoom level (0-18, higher = more detail)
   * @returns Promise resolving to geocoding result
   */
  public async reverseGeocode(
    lat: number,
    lng: number,
    zoom: number = 18
  ): Promise<ApiResponse<GeocodingResult | null>> {
    this.validateCoordinates(lat, lng);

    const endpoint = '/reverse';

    const params = {
      lat,
      lon: lng,
      format: 'json',
      addressdetails: 1,
      zoom: Math.min(18, Math.max(0, zoom)),
    };

    const response = await this.get<NominatimResult>(endpoint, { params });

    return {
      ...response,
      data: response.data ? this.parseResult(response.data) : null,
    };
  }

  /**
   * Search for a place by structured query
   *
   * @param params - Structured address components
   * @returns Promise resolving to geocoding results
   */
  public async structuredSearch(params: {
    street?: string;
    city?: string;
    county?: string;
    state?: string;
    postalcode?: string;
    country?: string;
  }): Promise<ApiResponse<GeocodingResult[]>> {
    if (!Object.values(params).some((v) => v)) {
      throw new ValidationError(
        'At least one address component is required',
        'params',
        'validation',
        'params',
        { required: 'true' },
        params
      );
    }

    const endpoint = '/search';

    const queryParams: Record<string, string | number | boolean | undefined> = {
      format: 'json',
      addressdetails: 1,
      limit: 5,
    };

    // Map to Nominatim parameter names
    if (params.street) queryParams.street = params.street;
    if (params.city) queryParams.city = params.city;
    if (params.county) queryParams.county = params.county;
    if (params.state) queryParams.state = params.state;
    if (params.postalcode) queryParams.postalcode = params.postalcode;
    if (params.country) queryParams.countrycodes = params.country.toLowerCase();

    const response = await this.get<NominatimResult[]>(endpoint, { params: queryParams });

    return {
      ...response,
      data: (response.data || []).map((r) => this.parseResult(r)),
    };
  }

  /**
   * Look up a specific OSM object
   *
   * @param osmType - OSM object type (N=node, W=way, R=relation)
   * @param osmId - OSM object ID
   * @returns Promise resolving to geocoding result
   */
  public async lookup(
    osmType: 'N' | 'W' | 'R',
    osmId: number
  ): Promise<ApiResponse<GeocodingResult | null>> {
    const endpoint = '/lookup';

    const params = {
      osm_ids: `${osmType}${osmId}`,
      format: 'json',
      addressdetails: 1,
    };

    const response = await this.get<NominatimResult[]>(endpoint, { params });

    return {
      ...response,
      data: response.data?.[0] ? this.parseResult(response.data[0]) : null,
    };
  }

  /**
   * Parse Nominatim result to standard format
   */
  private parseResult(result: NominatimResult): GeocodingResult {
    const addr = result.address || {};

    return {
      placeId: result.place_id,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      address: {
        houseNumber: addr.house_number,
        street: addr.road,
        neighborhood: addr.neighbourhood || addr.suburb,
        city: addr.city || addr.town || addr.village,
        county: addr.county,
        state: addr.state,
        postalCode: addr.postcode,
        country: addr.country,
        countryCode: addr.country_code?.toUpperCase(),
      },
      boundingBox: result.boundingbox
        ? {
            south: parseFloat(result.boundingbox[0]),
            north: parseFloat(result.boundingbox[1]),
            west: parseFloat(result.boundingbox[2]),
            east: parseFloat(result.boundingbox[3]),
          }
        : undefined,
      type: result.type,
      importance: result.importance,
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
let osmServiceInstance: OSMService | null = null;

export function getOSMService(config?: OSMServiceConfig): OSMService {
  if (!osmServiceInstance) {
    osmServiceInstance = new OSMService(config);
  }
  return osmServiceInstance;
}

export function resetOSMService(): void {
  osmServiceInstance = null;
}

export default OSMService;
