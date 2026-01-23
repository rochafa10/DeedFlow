/**
 * Geoapify API Service
 *
 * Provides geocoding, places (POIs), and isochrone services.
 * Free tier: 3,000 requests/day
 *
 * API Documentation: https://www.geoapify.com/api/
 */

import { logger } from '@/lib/logger';
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
 * Place (POI) categories
 */
export type PlaceCategory =
  | 'accommodation'
  | 'activity'
  | 'commercial'
  | 'catering'
  | 'education'
  | 'entertainment'
  | 'healthcare'
  | 'heritage'
  | 'leisure'
  | 'natural'
  | 'office'
  | 'parking'
  | 'pet'
  | 'public_transport'
  | 'rental'
  | 'service'
  | 'sport'
  | 'tourism'
  | 'building';

/**
 * Place/POI result
 */
export interface GeoapifyPlace {
  name?: string;
  categories: string[];
  address: {
    housenumber?: string;
    street?: string;
    suburb?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    formatted?: string;
  };
  distance?: number;
  lat: number;
  lon: number;
  placeId: string;
  datasource?: {
    sourcename: string;
    attribution: string;
  };
}

/**
 * Amenities summary for a location
 */
export interface AmenitiesSummary {
  location: {
    lat: number;
    lng: number;
  };
  radius_meters: number;
  counts: {
    hospitals: number;
    schools: number;
    grocery_stores: number;
    restaurants: number;
    gas_stations: number;
    banks: number;
    pharmacies: number;
    parks: number;
    shopping: number;
    public_transport: number;
  };
  nearest: {
    hospital?: GeoapifyPlace;
    school?: GeoapifyPlace;
    grocery_store?: GeoapifyPlace;
    gas_station?: GeoapifyPlace;
    park?: GeoapifyPlace;
  };
  score: number; // 0-100 walkability/convenience score
}

/**
 * Geocoding result
 */
export interface GeoapifyGeocodingResult {
  lat: number;
  lon: number;
  formatted: string;
  address: {
    housenumber?: string;
    street?: string;
    suburb?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  confidence: number;
  placeId: string;
}

/**
 * Isochrone result
 */
export interface GeoapifyIsochrone {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      mode: string;
      range: number; // seconds
    };
    geometry: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: number[][][] | number[][][][];
    };
  }>;
}

/**
 * Geoapify Service Configuration
 */
export interface GeoapifyServiceConfig {
  apiKey?: string;
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default configuration
 */
const DEFAULT_GEOAPIFY_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://api.geoapify.com',
  timeout: 15000,
  retries: 2,
  retryDelay: 1000,
  serviceName: 'geoapify',
};

/**
 * Default cache config - 24 hours for POIs
 */
const DEFAULT_GEOAPIFY_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 86400000, // 24 hours
  maxSize: 300,
};

/**
 * Default rate limit - Free tier is 3,000/day ≈ 2/min
 */
const DEFAULT_GEOAPIFY_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 5,
  burstSize: 10,
  queueExcess: true,
};

/**
 * Geoapify API Service
 *
 * Provides geocoding, places, and isochrone functionality.
 */
export class GeoapifyService extends BaseApiService {
  private apiKey: string;

  constructor(config?: GeoapifyServiceConfig) {
    const apiKey = config?.apiKey || process.env.GEOAPIFY_API_KEY || '';

    if (!apiKey) {
      logger.warn('No GEOAPIFY_API_KEY found. API calls will fail.', {
        context: 'GeoapifyService'
      });
    }

    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_GEOAPIFY_CONFIG,
      baseUrl: DEFAULT_GEOAPIFY_CONFIG.baseUrl!,
    };

    super(
      apiConfig,
      { ...DEFAULT_GEOAPIFY_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_GEOAPIFY_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.apiKey = apiKey;
    this.logger.info('GeoapifyService initialized');
  }

  /**
   * Geocode an address to coordinates
   *
   * @param address - Address to geocode
   * @returns Promise resolving to geocoding results
   */
  public async geocode(address: string): Promise<ApiResponse<GeoapifyGeocodingResult[]>> {
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

    const endpoint = '/v1/geocode/search';

    const response = await this.get<{ features: Array<{ properties: Record<string, unknown> }> }>(
      endpoint,
      {
        params: {
          text: address.trim(),
          apiKey: this.apiKey,
          format: 'json',
          limit: 5,
        },
      }
    );

    const results = (response.data.features || []).map((f) => this.parseGeocodingResult(f.properties));

    return {
      ...response,
      data: results,
    };
  }

  /**
   * Get nearby places/POIs
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @param categories - Place categories to search
   * @param radius - Search radius in meters
   * @param limit - Maximum results
   * @returns Promise resolving to places
   */
  public async getNearbyPlaces(
    lat: number,
    lng: number,
    categories: PlaceCategory[] = ['commercial', 'healthcare', 'education'],
    radius: number = 5000,
    limit: number = 20
  ): Promise<ApiResponse<GeoapifyPlace[]>> {
    this.validateCoordinates(lat, lng);

    const endpoint = '/v2/places';

    const response = await this.get<{ features: Array<{ properties: Record<string, unknown> }> }>(
      endpoint,
      {
        params: {
          categories: categories.join(','),
          filter: `circle:${lng},${lat},${radius}`,
          bias: `proximity:${lng},${lat}`,
          limit,
          apiKey: this.apiKey,
        },
      }
    );

    const places = (response.data.features || []).map((f) => this.parsePlace(f.properties));

    return {
      ...response,
      data: places,
    };
  }

  /**
   * Get amenities summary for a location
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @param radiusMeters - Search radius in meters
   * @returns Promise resolving to amenities summary
   */
  public async getAmenitiesSummary(
    lat: number,
    lng: number,
    radiusMeters: number = 5000
  ): Promise<ApiResponse<AmenitiesSummary>> {
    this.validateCoordinates(lat, lng);

    // Fetch different categories in parallel
    const [healthcare, education, commercial, catering, leisure, transport] = await Promise.all([
      this.getNearbyPlaces(lat, lng, ['healthcare'], radiusMeters, 50),
      this.getNearbyPlaces(lat, lng, ['education'], radiusMeters, 50),
      this.getNearbyPlaces(lat, lng, ['commercial'], radiusMeters, 50),
      this.getNearbyPlaces(lat, lng, ['catering'], radiusMeters, 50),
      this.getNearbyPlaces(lat, lng, ['leisure', 'natural'], radiusMeters, 50),
      this.getNearbyPlaces(lat, lng, ['public_transport'], radiusMeters, 50),
    ]);

    // Categorize places
    const hospitals = healthcare.data.filter((p) =>
      p.categories.some((c) => c.includes('hospital'))
    );
    const pharmacies = healthcare.data.filter((p) =>
      p.categories.some((c) => c.includes('pharmacy'))
    );
    const schools = education.data;
    const groceryStores = commercial.data.filter((p) =>
      p.categories.some((c) => c.includes('supermarket') || c.includes('grocery'))
    );
    const gasStations = commercial.data.filter((p) =>
      p.categories.some((c) => c.includes('fuel') || c.includes('gas'))
    );
    const banks = commercial.data.filter((p) =>
      p.categories.some((c) => c.includes('bank'))
    );
    const shopping = commercial.data.filter((p) =>
      p.categories.some((c) => c.includes('shop') || c.includes('mall'))
    );
    const restaurants = catering.data;
    const parks = leisure.data.filter((p) =>
      p.categories.some((c) => c.includes('park') || c.includes('garden'))
    );
    const publicTransport = transport.data;

    // Find nearest of each type
    const findNearest = (places: GeoapifyPlace[]): GeoapifyPlace | undefined => {
      if (places.length === 0) return undefined;
      return places.reduce((nearest, place) =>
        (place.distance || Infinity) < (nearest.distance || Infinity) ? place : nearest
      );
    };

    // Calculate convenience score (0-100)
    const score = this.calculateConvenienceScore({
      hospitals: hospitals.length,
      schools: schools.length,
      groceryStores: groceryStores.length,
      restaurants: restaurants.length,
      parks: parks.length,
      publicTransport: publicTransport.length,
    });

    const summary: AmenitiesSummary = {
      location: { lat, lng },
      radius_meters: radiusMeters,
      counts: {
        hospitals: hospitals.length,
        schools: schools.length,
        grocery_stores: groceryStores.length,
        restaurants: restaurants.length,
        gas_stations: gasStations.length,
        banks: banks.length,
        pharmacies: pharmacies.length,
        parks: parks.length,
        shopping: shopping.length,
        public_transport: publicTransport.length,
      },
      nearest: {
        hospital: findNearest(hospitals),
        school: findNearest(schools),
        grocery_store: findNearest(groceryStores),
        gas_station: findNearest(gasStations),
        park: findNearest(parks),
      },
      score,
    };

    return {
      data: summary,
      status: 200,
      headers: {},
      cached: false,
      requestId: `amenities_${Date.now()}`,
      responseTime: 0,
    };
  }

  /**
   * Get isochrone (reachable area within time limit)
   *
   * @param lat - Center latitude
   * @param lng - Center longitude
   * @param minutes - Time limit in minutes
   * @param mode - Travel mode
   * @returns Promise resolving to isochrone polygon
   */
  public async getIsochrone(
    lat: number,
    lng: number,
    minutes: number = 15,
    mode: 'drive' | 'walk' | 'bicycle' | 'transit' = 'drive'
  ): Promise<ApiResponse<GeoapifyIsochrone>> {
    this.validateCoordinates(lat, lng);

    const endpoint = '/v1/isoline';

    const response = await this.get<GeoapifyIsochrone>(endpoint, {
      params: {
        lat,
        lon: lng,
        type: 'time',
        range: minutes * 60, // Convert to seconds
        mode,
        apiKey: this.apiKey,
      },
    });

    return response;
  }

  /**
   * Parse geocoding result from API response
   */
  private parseGeocodingResult(props: Record<string, unknown>): GeoapifyGeocodingResult {
    return {
      lat: props.lat as number,
      lon: props.lon as number,
      formatted: props.formatted as string || '',
      address: {
        housenumber: props.housenumber as string | undefined,
        street: props.street as string | undefined,
        suburb: props.suburb as string | undefined,
        district: props.district as string | undefined,
        city: props.city as string | undefined,
        county: props.county as string | undefined,
        state: props.state as string | undefined,
        postcode: props.postcode as string | undefined,
        country: props.country as string | undefined,
        country_code: props.country_code as string | undefined,
      },
      confidence: props.confidence as number || 0,
      placeId: props.place_id as string || '',
    };
  }

  /**
   * Parse place from API response
   */
  private parsePlace(props: Record<string, unknown>): GeoapifyPlace {
    return {
      name: props.name as string | undefined,
      categories: (props.categories || []) as string[],
      address: {
        housenumber: props.housenumber as string | undefined,
        street: props.street as string | undefined,
        suburb: props.suburb as string | undefined,
        district: props.district as string | undefined,
        city: props.city as string | undefined,
        county: props.county as string | undefined,
        state: props.state as string | undefined,
        postcode: props.postcode as string | undefined,
        country: props.country as string | undefined,
        country_code: props.country_code as string | undefined,
        formatted: props.formatted as string | undefined,
      },
      distance: props.distance as number | undefined,
      lat: props.lat as number,
      lon: props.lon as number,
      placeId: props.place_id as string || '',
      datasource: props.datasource as GeoapifyPlace['datasource'],
    };
  }

  /**
   * Calculate convenience score (0-100)
   */
  private calculateConvenienceScore(counts: {
    hospitals: number;
    schools: number;
    groceryStores: number;
    restaurants: number;
    parks: number;
    publicTransport: number;
  }): number {
    let score = 0;

    // Healthcare (max 20 points)
    score += Math.min(counts.hospitals * 10, 20);

    // Education (max 15 points)
    score += Math.min(counts.schools * 3, 15);

    // Grocery/Shopping (max 20 points)
    score += Math.min(counts.groceryStores * 5, 20);

    // Dining (max 15 points)
    score += Math.min(counts.restaurants * 1.5, 15);

    // Recreation (max 15 points)
    score += Math.min(counts.parks * 5, 15);

    // Transit (max 15 points)
    score += Math.min(counts.publicTransport * 3, 15);

    return Math.round(Math.min(100, score));
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
let geoapifyServiceInstance: GeoapifyService | null = null;

export function getGeoapifyService(config?: GeoapifyServiceConfig): GeoapifyService {
  if (!geoapifyServiceInstance) {
    geoapifyServiceInstance = new GeoapifyService(config);
  }
  return geoapifyServiceInstance;
}

export function resetGeoapifyService(): void {
  geoapifyServiceInstance = null;
}

export default GeoapifyService;
