/**
 * USGS API Service
 *
 * Provides access to USGS (United States Geological Survey) seismic hazard data
 * and earthquake information for property risk assessment.
 *
 * API Documentation:
 * - Seismic Hazard: https://earthquake.usgs.gov/ws/designmaps/
 * - Earthquake Catalog: https://earthquake.usgs.gov/fdsnws/event/1/
 *
 * @module lib/api/services/usgs-service
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { BaseApiService } from '../base-service';
import type {
  ApiConfig,
  CacheConfig,
  CircuitBreakerConfig,
  RateLimitConfig,
  ApiResponse,
} from '../types';
import { ApiError, ValidationError } from '../errors';

// ============================================
// USGS API Response Types
// ============================================

/**
 * USGS Seismic Design Values Response
 */
interface USGSDesignMapsResponse {
  request: {
    date: string;
    referenceDocument: string;
    status: string;
    url: string;
    parameters: {
      latitude: number;
      longitude: number;
      riskCategory: string;
      siteClass: string;
      title: string;
    };
  };
  response: {
    data: {
      pgauh: number;      // PGA (Uniform Hazard)
      pgad: number;       // PGA (Deterministic)
      pga: number;        // PGA (Design)
      fpga: number;       // Site Factor Fpga
      pgam: number;       // MCEG PGA
      ssrt: number;       // Ss (Risk-Targeted)
      crs: number;        // Coefficient of Risk Ss
      ssuh: number;       // Ss (Uniform Hazard)
      ssd: number;        // Ss (Deterministic)
      ss: number;         // Ss (Design)
      fa: number;         // Site Factor Fa
      sms: number;        // SMS
      sds: number;        // SDS (Short Period Design)
      sdcs: string;       // Seismic Design Category (short period)
      s1rt: number;       // S1 (Risk-Targeted)
      cr1: number;        // Coefficient of Risk S1
      s1uh: number;       // S1 (Uniform Hazard)
      s1d: number;        // S1 (Deterministic)
      s1: number;         // S1 (Design)
      fv: number;         // Site Factor Fv
      sm1: number;        // SM1
      sd1: number;        // SD1 (1s Period Design)
      sdc1: string;       // Seismic Design Category (1s period)
      sdc: string;        // Seismic Design Category (governing)
      tl: number;         // Long-Period Transition
    };
    metadata: {
      regionName: string;
      spatialInterpolationMethod: string;
    };
  };
}

/**
 * USGS Earthquake Catalog Response
 */
interface USGSEarthquakeCatalogResponse {
  type: string;
  metadata: {
    generated: number;
    url: string;
    title: string;
    status: number;
    api: string;
    count: number;
  };
  features: Array<{
    type: string;
    properties: {
      mag: number;
      place: string;
      time: number;
      updated: number;
      tz: number | null;
      url: string;
      detail: string;
      felt: number | null;
      cdi: number | null;
      mmi: number | null;
      alert: string | null;
      status: string;
      tsunami: number;
      sig: number;
      net: string;
      code: string;
      ids: string;
      sources: string;
      types: string;
      nst: number | null;
      dmin: number | null;
      rms: number;
      gap: number | null;
      magType: string;
      type: string;
      title: string;
    };
    geometry: {
      type: string;
      coordinates: [number, number, number]; // [longitude, latitude, depth]
    };
    id: string;
  }>;
  bbox?: [number, number, number, number, number, number];
}

/**
 * Processed seismic hazard data
 */
export interface SeismicHazardData {
  /** Peak Ground Acceleration (% g) */
  pga: number;
  /** Spectral Acceleration at 0.2s (% g) */
  ss: number;
  /** Spectral Acceleration at 1.0s (% g) */
  s1: number;
  /** Design PGA (% g) */
  pgaDesign: number;
  /** Short Period Design Spectral Acceleration */
  sds: number;
  /** 1 Second Period Design Spectral Acceleration */
  sd1: number;
  /** Seismic Design Category (A-F) */
  seismicDesignCategory: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  /** Site class used */
  siteClass: string;
  /** Region name */
  regionName: string;
}

/**
 * Historical earthquake summary
 */
export interface HistoricalEarthquakeSummary {
  /** Total count of earthquakes in search radius */
  count: number;
  /** Maximum magnitude */
  maxMagnitude: number | null;
  /** Average magnitude */
  avgMagnitude: number | null;
  /** Most recent earthquake */
  mostRecent: {
    magnitude: number;
    place: string;
    time: Date;
    distanceKm: number;
  } | null;
  /** Largest earthquake */
  largest: {
    magnitude: number;
    place: string;
    time: Date;
    distanceKm: number;
  } | null;
  /** Earthquakes by magnitude range */
  byMagnitude: {
    minor: number;    // < 4.0
    light: number;    // 4.0 - 4.9
    moderate: number; // 5.0 - 5.9
    strong: number;   // 6.0 - 6.9
    major: number;    // 7.0+
  };
}

// ============================================
// Service Configuration
// ============================================

/**
 * USGS Service Configuration
 */
interface USGSServiceConfig {
  /** Custom cache configuration */
  cacheConfig?: Partial<CacheConfig>;
  /** Custom circuit breaker configuration */
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  /** Custom rate limit configuration */
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default USGS service configuration
 */
const DEFAULT_USGS_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://earthquake.usgs.gov',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  serviceName: 'usgs',
};

/**
 * Default cache configuration for USGS service
 * Seismic hazard data changes infrequently, cache for 7 days
 */
const DEFAULT_USGS_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 604800000, // 7 days
  maxSize: 500,
};

// ============================================
// USGS Service Class
// ============================================

/**
 * USGS API Service
 *
 * Provides methods to query seismic hazard data and historical earthquake
 * information for property risk assessment in the Tax Deed Flow system.
 *
 * @example
 * ```typescript
 * const usgs = new USGSService();
 *
 * // Get seismic hazard data
 * const hazard = await usgs.getSeismicHazard(40.7128, -74.0060);
 * console.log(hazard.data.pga); // Peak Ground Acceleration
 *
 * // Get historical earthquakes within 50 miles
 * const history = await usgs.getHistoricalEarthquakes(40.7128, -74.0060, 80);
 * console.log(history.data.count); // Number of earthquakes
 * ```
 */
export class USGSService extends BaseApiService {
  /**
   * Creates a new USGS service instance
   *
   * @param config - Optional service configuration
   */
  constructor(config?: USGSServiceConfig) {
    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_USGS_CONFIG,
      baseUrl: DEFAULT_USGS_CONFIG.baseUrl!,
    };

    super(
      apiConfig,
      { ...DEFAULT_USGS_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      config?.rateLimitConfig
    );

    this.logger.info('USGSService initialized');
  }

  /**
   * Gets seismic hazard data for a geographic location
   *
   * Uses USGS Design Maps API to retrieve seismic design values including
   * PGA (Peak Ground Acceleration), spectral accelerations, and seismic
   * design category.
   *
   * @param lat - Latitude of the location
   * @param lng - Longitude of the location
   * @param siteClass - Site class for soil conditions (default: 'D' for stiff soil)
   * @param riskCategory - Building risk category (default: 'II' for standard occupancy)
   * @returns Promise resolving to seismic hazard data
   *
   * @example
   * ```typescript
   * const hazard = await usgs.getSeismicHazard(34.0522, -118.2437);
   * console.log(`PGA: ${hazard.data.pga}% g`);
   * console.log(`Design Category: ${hazard.data.seismicDesignCategory}`);
   * ```
   */
  public async getSeismicHazard(
    lat: number,
    lng: number,
    siteClass: 'A' | 'B' | 'BC' | 'C' | 'CD' | 'D' | 'DE' | 'E' = 'D',
    riskCategory: 'I' | 'II' | 'III' | 'IV' = 'II'
  ): Promise<ApiResponse<SeismicHazardData>> {
    // Validate coordinates
    this.validateCoordinates(lat, lng);

    // USGS Design Maps endpoint (ASCE 7-22)
    const endpoint = '/ws/designmaps/asce7-22.json';

    try {
      const response = await this.get<USGSDesignMapsResponse>(endpoint, {
        params: {
          latitude: lat,
          longitude: lng,
          siteClass: siteClass,
          riskCategory: riskCategory,
          title: 'TaxDeedFlow Property Analysis',
        },
      });

      // Check for API errors
      if (response.data.request.status !== 'success') {
        throw new ApiError(
          `USGS API error: Request status ${response.data.request.status}`,
          500,
          endpoint,
          response.requestId
        );
      }

      // Parse and transform the response
      const hazardData = this.parseSeismicHazardResponse(response.data);

      return {
        ...response,
        data: hazardData,
      };
    } catch (error) {
      // If ASCE 7-22 fails, try fallback to ASCE 7-16
      if (error instanceof ApiError && error.statusCode >= 500) {
        return this.getSeismicHazardFallback(lat, lng, siteClass, riskCategory);
      }
      throw error;
    }
  }

  /**
   * Gets historical earthquake data within a radius of a location
   *
   * Queries the USGS Earthquake Catalog for earthquakes within a specified
   * radius and time period.
   *
   * @param lat - Latitude of the center point
   * @param lng - Longitude of the center point
   * @param radiusKm - Search radius in kilometers (default: 80 = ~50 miles)
   * @param years - Number of years to search back (default: 100)
   * @param minMagnitude - Minimum magnitude to include (default: 2.5)
   * @returns Promise resolving to historical earthquake summary
   *
   * @example
   * ```typescript
   * const history = await usgs.getHistoricalEarthquakes(34.0522, -118.2437, 80, 50);
   * console.log(`${history.data.count} earthquakes in last 50 years`);
   * if (history.data.maxMagnitude) {
   *   console.log(`Max magnitude: ${history.data.maxMagnitude}`);
   * }
   * ```
   */
  public async getHistoricalEarthquakes(
    lat: number,
    lng: number,
    radiusKm: number = 80,
    years: number = 100,
    minMagnitude: number = 2.5
  ): Promise<ApiResponse<HistoricalEarthquakeSummary>> {
    // Validate coordinates
    this.validateCoordinates(lat, lng);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);

    const endpoint = '/fdsnws/event/1/query';

    try {
      const response = await this.get<USGSEarthquakeCatalogResponse>(endpoint, {
        params: {
          format: 'geojson',
          latitude: lat,
          longitude: lng,
          maxradiuskm: radiusKm,
          starttime: startDate.toISOString().split('T')[0],
          endtime: endDate.toISOString().split('T')[0],
          minmagnitude: minMagnitude,
          orderby: 'time',
        },
      });

      // Parse and summarize the earthquake data
      const summary = this.summarizeEarthquakeData(response.data, lat, lng);

      return {
        ...response,
        data: summary,
      };
    } catch (error) {
      // If no earthquakes found, return empty summary
      if (error instanceof ApiError && error.statusCode === 404) {
        return {
          data: this.createEmptyEarthquakeSummary(),
          status: 200,
          headers: {},
          cached: false,
          requestId: `usgs_eq_${Date.now()}`,
          responseTime: 0,
        };
      }
      throw error;
    }
  }

  /**
   * Gets recent significant earthquakes globally
   *
   * Useful for context about current seismic activity.
   *
   * @param days - Number of days to look back (default: 7)
   * @param minMagnitude - Minimum magnitude (default: 4.5)
   * @returns Promise resolving to recent earthquake catalog
   */
  public async getRecentSignificantEarthquakes(
    days: number = 7,
    minMagnitude: number = 4.5
  ): Promise<ApiResponse<USGSEarthquakeCatalogResponse>> {
    const endpoint = '/fdsnws/event/1/query';

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.get<USGSEarthquakeCatalogResponse>(endpoint, {
      params: {
        format: 'geojson',
        starttime: startDate.toISOString().split('T')[0],
        endtime: endDate.toISOString().split('T')[0],
        minmagnitude: minMagnitude,
        orderby: 'magnitude',
      },
    });
  }

  // ============================================
  // Private Methods
  // ============================================

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

    // USGS only covers US territories
    // Basic check for continental US + Alaska + Hawaii + Puerto Rico
    const inUS = (
      (lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66) || // Continental US
      (lat >= 51 && lat <= 72 && lng >= -180 && lng <= -130) || // Alaska
      (lat >= 18 && lat <= 23 && lng >= -161 && lng <= -154) || // Hawaii
      (lat >= 17 && lat <= 19 && lng >= -68 && lng <= -65) // Puerto Rico
    );

    if (!inUS) {
      this.logger.warn('Coordinates may be outside USGS coverage area', { lat, lng });
    }
  }

  /**
   * Parses USGS Design Maps response into SeismicHazardData
   */
  private parseSeismicHazardResponse(response: USGSDesignMapsResponse): SeismicHazardData {
    const data = response.response.data;

    return {
      pga: data.pga,
      ss: data.ss,
      s1: data.s1,
      pgaDesign: data.pgam,
      sds: data.sds,
      sd1: data.sd1,
      seismicDesignCategory: data.sdc as SeismicHazardData['seismicDesignCategory'],
      siteClass: response.request.parameters.siteClass,
      regionName: response.response.metadata.regionName,
    };
  }

  /**
   * Fallback to ASCE 7-16 if 7-22 fails
   */
  private async getSeismicHazardFallback(
    lat: number,
    lng: number,
    siteClass: string,
    riskCategory: string
  ): Promise<ApiResponse<SeismicHazardData>> {
    const endpoint = '/ws/designmaps/asce7-16.json';

    const response = await this.get<USGSDesignMapsResponse>(endpoint, {
      params: {
        latitude: lat,
        longitude: lng,
        siteClass: siteClass,
        riskCategory: riskCategory,
        title: 'TaxDeedFlow Property Analysis (Fallback)',
      },
    });

    const hazardData = this.parseSeismicHazardResponse(response.data);

    return {
      ...response,
      data: hazardData,
    };
  }

  /**
   * Summarizes earthquake catalog data
   */
  private summarizeEarthquakeData(
    catalog: USGSEarthquakeCatalogResponse,
    centerLat: number,
    centerLng: number
  ): HistoricalEarthquakeSummary {
    const features = catalog.features;

    if (!features || features.length === 0) {
      return this.createEmptyEarthquakeSummary();
    }

    // Calculate distances and find extremes
    let maxMagnitude: number | null = null;
    let totalMagnitude = 0;
    let largestQuake: HistoricalEarthquakeSummary['largest'] = null;
    let mostRecentQuake: HistoricalEarthquakeSummary['mostRecent'] = null;

    const byMagnitude = {
      minor: 0,
      light: 0,
      moderate: 0,
      strong: 0,
      major: 0,
    };

    features.forEach((feature, index) => {
      const mag = feature.properties.mag;
      const coords = feature.geometry.coordinates;
      const distanceKm = this.haversineDistance(
        centerLat,
        centerLng,
        coords[1],
        coords[0]
      );

      totalMagnitude += mag;

      // Categorize by magnitude
      if (mag < 4.0) byMagnitude.minor++;
      else if (mag < 5.0) byMagnitude.light++;
      else if (mag < 6.0) byMagnitude.moderate++;
      else if (mag < 7.0) byMagnitude.strong++;
      else byMagnitude.major++;

      // Track largest
      if (maxMagnitude === null || mag > maxMagnitude) {
        maxMagnitude = mag;
        largestQuake = {
          magnitude: mag,
          place: feature.properties.place || 'Unknown location',
          time: new Date(feature.properties.time),
          distanceKm,
        };
      }

      // Most recent is the first one (ordered by time desc)
      if (index === 0) {
        mostRecentQuake = {
          magnitude: mag,
          place: feature.properties.place || 'Unknown location',
          time: new Date(feature.properties.time),
          distanceKm,
        };
      }
    });

    return {
      count: features.length,
      maxMagnitude,
      avgMagnitude: features.length > 0 ? Math.round((totalMagnitude / features.length) * 10) / 10 : null,
      mostRecent: mostRecentQuake,
      largest: largestQuake,
      byMagnitude,
    };
  }

  /**
   * Creates an empty earthquake summary for areas with no earthquakes
   */
  private createEmptyEarthquakeSummary(): HistoricalEarthquakeSummary {
    return {
      count: 0,
      maxMagnitude: null,
      avgMagnitude: null,
      mostRecent: null,
      largest: null,
      byMagnitude: {
        minor: 0,
        light: 0,
        moderate: 0,
        strong: 0,
        major: 0,
      },
    };
  }

  /**
   * Calculates distance between two points using Haversine formula
   *
   * @param lat1 - Latitude of point 1
   * @param lng1 - Longitude of point 1
   * @param lat2 - Latitude of point 2
   * @param lng2 - Longitude of point 2
   * @returns Distance in kilometers
   */
  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Converts degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// ============================================
// Singleton Factory
// ============================================

/**
 * Creates a singleton USGS service instance
 */
let usgsServiceInstance: USGSService | null = null;

export function getUSGSService(config?: USGSServiceConfig): USGSService {
  if (!usgsServiceInstance) {
    usgsServiceInstance = new USGSService(config);
  }
  return usgsServiceInstance;
}

/**
 * Resets the singleton instance (useful for testing)
 */
export function resetUSGSService(): void {
  usgsServiceInstance = null;
}

export default USGSService;
