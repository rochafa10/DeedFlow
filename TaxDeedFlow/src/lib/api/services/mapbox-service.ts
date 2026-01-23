/**
 * Mapbox API Service
 *
 * Provides geocoding, routing, and mapping services.
 * Used for location-based analysis in the Tax Deed Flow system.
 *
 * API Documentation: https://docs.mapbox.com/api/
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
 * Geocoding result
 */
export interface GeocodingResult {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  address?: string;
  text: string;
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
  properties?: {
    accuracy?: string;
    mapbox_id?: string;
  };
  relevance: number;
}

/**
 * Isochrone (drive-time area)
 */
export interface IsochroneResult {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      contour: number; // minutes
      color?: string;
      opacity?: number;
    };
    geometry: {
      type: 'Polygon';
      coordinates: number[][][];
    };
  }>;
}

/**
 * Directions result
 */
export interface DirectionsResult {
  routes: Array<{
    distance: number; // meters
    duration: number; // seconds
    geometry: string; // encoded polyline
    legs: Array<{
      distance: number;
      duration: number;
      steps: Array<{
        distance: number;
        duration: number;
        maneuver: {
          type: string;
          instruction: string;
          location: [number, number];
        };
      }>;
    }>;
  }>;
  waypoints: Array<{
    name: string;
    location: [number, number];
  }>;
}

/**
 * Static map options
 */
export interface StaticMapOptions {
  width?: number;
  height?: number;
  zoom?: number;
  style?: 'streets-v12' | 'satellite-v9' | 'satellite-streets-v12' | 'light-v11' | 'dark-v11';
  marker?: {
    lng: number;
    lat: number;
    color?: string;
    label?: string;
  };
  padding?: number;
  retina?: boolean;
}

/**
 * Mapbox Service Configuration
 */
export interface MapboxServiceConfig {
  accessToken?: string;
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default configuration
 */
const DEFAULT_MAPBOX_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://api.mapbox.com',
  timeout: 15000,
  retries: 2,
  retryDelay: 1000,
  serviceName: 'mapbox',
};

/**
 * Default cache config - 7 days for geocoding (addresses don't change)
 */
const DEFAULT_MAPBOX_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 604800000, // 7 days
  maxSize: 500,
};

/**
 * Default rate limit - Mapbox has generous limits
 */
const DEFAULT_MAPBOX_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 10,
  burstSize: 20,
  queueExcess: true,
};

/**
 * Mapbox API Service
 *
 * Provides geocoding, isochrones, and directions functionality.
 */
export class MapboxService extends BaseApiService {
  private accessToken: string;

  constructor(config?: MapboxServiceConfig) {
    const accessToken = config?.accessToken || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

    if (!accessToken) {
      logger.warn('No MAPBOX_ACCESS_TOKEN found. API calls will fail.', {
        context: 'MapboxService'
      });
    }

    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_MAPBOX_CONFIG,
      baseUrl: DEFAULT_MAPBOX_CONFIG.baseUrl!,
    };

    super(
      apiConfig,
      { ...DEFAULT_MAPBOX_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_MAPBOX_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.accessToken = accessToken;
    this.logger.info('MapboxService initialized');
  }

  /**
   * Geocode an address to coordinates
   *
   * @param address - Address to geocode
   * @param options - Optional geocoding options
   * @returns Promise resolving to geocoding results
   *
   * @example
   * ```typescript
   * const mapbox = getMapboxService();
   * const results = await mapbox.geocode('123 Main St, Altoona, PA');
   * console.log(results.data[0].center); // [-78.3947, 40.5186]
   * ```
   */
  public async geocode(
    address: string,
    options?: {
      country?: string;
      types?: string[];
      limit?: number;
      proximity?: [number, number];
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

    const endpoint = `/geocoding/v5/mapbox.places/${encodeURIComponent(address.trim())}.json`;

    const params: Record<string, string | number | boolean | undefined> = {
      access_token: this.accessToken,
      limit: options?.limit || 5,
    };

    if (options?.country) params.country = options.country;
    if (options?.types) params.types = options.types.join(',');
    if (options?.proximity) params.proximity = options.proximity.join(',');

    const response = await this.get<{ features: GeocodingResult[] }>(endpoint, { params });

    return {
      ...response,
      data: response.data.features || [],
    };
  }

  /**
   * Reverse geocode coordinates to address
   *
   * @param lng - Longitude
   * @param lat - Latitude
   * @param types - Optional types to filter (address, poi, etc.)
   * @returns Promise resolving to geocoding results
   */
  public async reverseGeocode(
    lng: number,
    lat: number,
    types?: string[]
  ): Promise<ApiResponse<GeocodingResult[]>> {
    this.validateCoordinates(lat, lng);

    const endpoint = `/geocoding/v5/mapbox.places/${lng},${lat}.json`;

    const params: Record<string, string | number | boolean | undefined> = {
      access_token: this.accessToken,
      limit: 5,
    };

    if (types) params.types = types.join(',');

    const response = await this.get<{ features: GeocodingResult[] }>(endpoint, { params });

    return {
      ...response,
      data: response.data.features || [],
    };
  }

  /**
   * Get drive-time isochrone (area reachable within X minutes)
   *
   * @param lng - Center longitude
   * @param lat - Center latitude
   * @param minutes - Array of time contours in minutes (e.g., [5, 10, 15])
   * @param profile - Driving profile (driving, walking, cycling)
   * @returns Promise resolving to isochrone polygon
   */
  public async getIsochrone(
    lng: number,
    lat: number,
    minutes: number[] = [10, 20, 30],
    profile: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<ApiResponse<IsochroneResult>> {
    this.validateCoordinates(lat, lng);

    if (minutes.length === 0 || minutes.length > 4) {
      throw new ValidationError(
        'Minutes array must have 1-4 values',
        'minutes',
        'validation',
        'minutes',
        { min: '1', max: '4' },
        minutes
      );
    }

    const endpoint = `/isochrone/v1/mapbox/${profile}/${lng},${lat}`;

    const params = {
      access_token: this.accessToken,
      contours_minutes: minutes.join(','),
      polygons: true,
    };

    const response = await this.get<IsochroneResult>(endpoint, { params });

    return response;
  }

  /**
   * Get directions between two points
   *
   * @param from - Start coordinates [lng, lat]
   * @param to - End coordinates [lng, lat]
   * @param profile - Routing profile
   * @returns Promise resolving to directions
   */
  public async getDirections(
    from: [number, number],
    to: [number, number],
    profile: 'driving' | 'driving-traffic' | 'walking' | 'cycling' = 'driving'
  ): Promise<ApiResponse<DirectionsResult>> {
    this.validateCoordinates(from[1], from[0]);
    this.validateCoordinates(to[1], to[0]);

    const coordinates = `${from[0]},${from[1]};${to[0]},${to[1]}`;
    const endpoint = `/directions/v5/mapbox/${profile}/${coordinates}`;

    const params = {
      access_token: this.accessToken,
      geometries: 'polyline',
      steps: true,
      overview: 'full',
    };

    const response = await this.get<DirectionsResult>(endpoint, { params });

    return response;
  }

  /**
   * Get static map image URL
   *
   * @param lng - Center longitude
   * @param lat - Center latitude
   * @param options - Map options
   * @returns Static map URL
   */
  public getStaticMapUrl(
    lng: number,
    lat: number,
    options: StaticMapOptions = {}
  ): string {
    const {
      width = 600,
      height = 400,
      zoom = 15,
      style = 'streets-v12',
      marker,
      retina = true,
    } = options;

    let url = `https://api.mapbox.com/styles/v1/mapbox/${style}/static`;

    // Add marker if specified
    if (marker) {
      const markerStr = `pin-s${marker.label ? `-${marker.label}` : ''}+${(marker.color || 'ff0000').replace('#', '')}(${marker.lng},${marker.lat})`;
      url += `/${markerStr}`;
    }

    // Add center and zoom
    url += `/${lng},${lat},${zoom}`;

    // Add dimensions
    url += `/${width}x${height}${retina ? '@2x' : ''}`;

    // Add access token
    url += `?access_token=${this.accessToken}`;

    return url;
  }

  /**
   * Get distance between two points (in miles)
   *
   * @param from - Start coordinates [lng, lat]
   * @param to - End coordinates [lng, lat]
   * @returns Promise resolving to distance in miles and duration in minutes
   */
  public async getDistance(
    from: [number, number],
    to: [number, number]
  ): Promise<ApiResponse<{ distanceMiles: number; durationMinutes: number }>> {
    const directions = await this.getDirections(from, to, 'driving');

    const route = directions.data.routes[0];
    if (!route) {
      return {
        ...directions,
        data: { distanceMiles: 0, durationMinutes: 0 },
      };
    }

    return {
      ...directions,
      data: {
        distanceMiles: Math.round((route.distance / 1609.34) * 100) / 100, // meters to miles
        durationMinutes: Math.round(route.duration / 60),
      },
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
let mapboxServiceInstance: MapboxService | null = null;

export function getMapboxService(config?: MapboxServiceConfig): MapboxService {
  if (!mapboxServiceInstance) {
    mapboxServiceInstance = new MapboxService(config);
  }
  return mapboxServiceInstance;
}

export function resetMapboxService(): void {
  mapboxServiceInstance = null;
}

export default MapboxService;
