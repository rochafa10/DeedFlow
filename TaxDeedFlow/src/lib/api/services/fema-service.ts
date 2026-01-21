/**
 * FEMA API Service
 *
 * Provides access to FEMA flood zone and National Flood Hazard Layer (NFHL) data.
 * Used to assess flood risk for properties in the Tax Deed Flow system.
 *
 * API Documentation: https://hazards.fema.gov/gis/nfhl/rest/services
 */

import { BaseApiService } from '../base-service';
import {
  ApiConfig,
  CacheConfig,
  CircuitBreakerConfig,
  RateLimitConfig,
  FloodZoneResponse,
  NFHLResponse,
  ApiResponse,
} from '../types';
import { ApiError, ValidationError } from '../errors';

/**
 * FEMA flood zone code descriptions
 */
const FLOOD_ZONE_DESCRIPTIONS: Record<string, string> = {
  // High Risk Areas (Special Flood Hazard Areas)
  A: 'High risk area subject to inundation by the 1% annual chance flood event. No Base Flood Elevation (BFE) determined.',
  AE: 'High risk area subject to inundation by the 1% annual chance flood event. Base Flood Elevations determined.',
  AH: 'High risk area subject to inundation by 1% annual chance shallow flooding (usually areas of ponding). BFE determined.',
  AO: 'High risk area subject to inundation by 1% annual chance shallow flooding (sheet flow) with depths of 1-3 feet.',
  AR: 'Special Flood Hazard Area formerly protected by flood control system. Temporary designation.',
  'A99': 'Area to be protected by federal flood protection system under construction. BFE not determined.',
  V: 'Coastal high hazard area subject to inundation by the 1% annual chance flood with additional hazards from storm waves.',
  VE: 'Coastal high hazard area with velocity hazard (wave action). BFE determined.',

  // Moderate to Low Risk Areas
  B: 'Moderate flood hazard area between the 1% and 0.2% annual chance flood limits. Legacy zone (now Zone X).',
  C: 'Minimal flood hazard area outside the 0.2% annual chance flood limit. Legacy zone (now Zone X).',
  X: 'Area of minimal flood hazard. May include areas of 0.2% annual chance flood, protected by levees, or shallow flooding.',
  'X500': 'Area of moderate flood hazard (0.2% annual chance flood, a.k.a. 500-year flood).',

  // Other Zones
  D: 'Area with possible but undetermined flood hazards. No analysis has been conducted.',
};

/**
 * Determines if a flood zone is a Special Flood Hazard Area (SFHA)
 */
function isSFHA(zone: string): boolean {
  const upperZone = zone.toUpperCase();
  return (
    upperZone.startsWith('A') ||
    upperZone.startsWith('V') ||
    upperZone === 'AR'
  );
}

/**
 * FEMA NFHL API raw response types
 */
interface FEMAQueryResponse {
  features?: Array<{
    attributes: Record<string, unknown>;
    geometry?: {
      rings?: number[][][];
      x?: number;
      y?: number;
    };
  }>;
  error?: {
    code: number;
    message: string;
    details?: string[];
  };
}

interface FEMAIdentifyResponse {
  results?: Array<{
    layerId: number;
    layerName: string;
    value: string;
    displayFieldName: string;
    attributes: Record<string, unknown>;
  }>;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * FEMA API Service Configuration
 */
interface FEMAServiceConfig {
  /** Base URL for FEMA API (defaults to NFHL REST services) */
  baseUrl?: string;

  /** Custom cache configuration */
  cacheConfig?: Partial<CacheConfig>;

  /** Custom circuit breaker configuration */
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;

  /** Custom rate limit configuration */
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default FEMA service configuration
 */
const DEFAULT_FEMA_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://hazards.fema.gov/gis/nfhl/rest/services',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  serviceName: 'fema',
};

/**
 * Default cache configuration for FEMA service
 * Flood zone data changes infrequently, so we cache for 24 hours
 */
const DEFAULT_FEMA_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 86400000, // 24 hours
  maxSize: 500,
};

/**
 * FEMA API Service
 *
 * Provides methods to query FEMA flood zone data for property risk assessment.
 */
export class FEMAService extends BaseApiService {
  /**
   * Creates a new FEMA service instance
   *
   * @param config - Optional service configuration
   */
  constructor(config?: FEMAServiceConfig) {
    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_FEMA_CONFIG,
      baseUrl: config?.baseUrl || DEFAULT_FEMA_CONFIG.baseUrl!,
    };

    super(
      apiConfig,
      { ...DEFAULT_FEMA_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      config?.rateLimitConfig
    );

    this.logger.info('FEMAService initialized');
  }

  /**
   * Gets flood zone information for a geographic location
   *
   * @param lat - Latitude of the location
   * @param lng - Longitude of the location
   * @returns Promise resolving to flood zone information
   *
   * @example
   * ```typescript
   * const fema = new FEMAService();
   * const floodZone = await fema.getFloodZone(40.7128, -74.0060);
   * console.log(floodZone.data.floodZone); // 'AE'
   * ```
   */
  public async getFloodZone(lat: number, lng: number): Promise<ApiResponse<FloodZoneResponse>> {
    // Validate coordinates
    this.validateCoordinates(lat, lng);

    const endpoint = '/public/NFHL/MapServer/identify';

    try {
      // FEMA uses identify endpoint for point queries
      const response = await this.get<FEMAIdentifyResponse>(endpoint, {
        params: {
          geometry: `${lng},${lat}`,
          geometryType: 'esriGeometryPoint',
          sr: '4326', // WGS84
          layers: 'all:28', // S_FLD_HAZ_AR layer (flood hazard areas)
          tolerance: '1',
          mapExtent: `${lng - 0.001},${lat - 0.001},${lng + 0.001},${lat + 0.001}`,
          imageDisplay: '100,100,96',
          returnGeometry: 'false',
          f: 'json',
        },
      });

      // Check for API errors
      if (response.data.error) {
        throw new ApiError(
          `FEMA API error: ${response.data.error.message}`,
          response.data.error.code,
          endpoint,
          response.requestId
        );
      }

      // Parse the response
      const floodZoneData = this.parseFloodZoneResponse(response.data, lat, lng);

      return {
        ...response,
        data: floodZoneData,
      };
    } catch (error) {
      // If the identify endpoint fails, try the query endpoint as fallback
      if (error instanceof ApiError && error.statusCode >= 500) {
        return this.getFloodZoneFallback(lat, lng);
      }
      throw error;
    }
  }

  /**
   * Gets detailed NFHL (National Flood Hazard Layer) data for a location
   *
   * @param lat - Latitude of the location
   * @param lng - Longitude of the location
   * @returns Promise resolving to detailed NFHL information
   *
   * @example
   * ```typescript
   * const fema = new FEMAService();
   * const nfhl = await fema.getNFHLData(40.7128, -74.0060);
   * console.log(nfhl.data.hazardAreas); // Array of flood hazard areas
   * ```
   */
  public async getNFHLData(lat: number, lng: number): Promise<ApiResponse<NFHLResponse>> {
    // Validate coordinates
    this.validateCoordinates(lat, lng);

    const nfhlResponse: NFHLResponse = {
      hazardAreas: [],
    };

    // Query multiple layers to get comprehensive data
    const layerQueries = [
      this.queryNFHLLayer(lat, lng, 28, 'S_FLD_HAZ_AR'), // Flood hazard areas
      this.queryNFHLLayer(lat, lng, 3, 'S_FIRM_PAN'), // FIRM panels
      this.queryNFHLLayer(lat, lng, 19, 'S_LOMR'), // LOMA/LOMR
      this.queryNFHLLayer(lat, lng, 15, 'S_CBRS'), // Coastal Barrier Resources
    ];

    const results = await Promise.allSettled(layerQueries);

    // Process flood hazard areas
    if (results[0].status === 'fulfilled' && results[0].value?.features) {
      nfhlResponse.hazardAreas = results[0].value.features.map((feature) => ({
        zone: String(feature.attributes.FLD_ZONE || 'Unknown'),
        zoneSubtype: feature.attributes.ZONE_SUBTY ? String(feature.attributes.ZONE_SUBTY) : undefined,
        bfe: feature.attributes.STATIC_BFE ? Number(feature.attributes.STATIC_BFE) : undefined,
        staticBfe: Boolean(feature.attributes.STATIC_BFE),
      }));
    }

    // Process FIRM panel info
    if (results[1].status === 'fulfilled' && results[1].value?.features?.[0]) {
      const panel = results[1].value.features[0].attributes;
      nfhlResponse.firmPanel = {
        panelNumber: String(panel.FIRM_PAN || ''),
        suffix: String(panel.SUFFIX || ''),
        effectiveDate: String(panel.EFF_DATE || ''),
      };
    }

    // Process LOMA/LOMR info
    if (results[2].status === 'fulfilled' && results[2].value?.features) {
      nfhlResponse.lomaLomr = results[2].value.features.map((feature) => ({
        caseNumber: String(feature.attributes.CASE_NO || ''),
        determinationType: String(feature.attributes.LOMR_ID || ''),
        determinationDate: String(feature.attributes.EFF_DATE || ''),
      }));
    }

    // Process CBRS info
    if (results[3].status === 'fulfilled' && results[3].value?.features?.[0]) {
      const cbrs = results[3].value.features[0].attributes;
      nfhlResponse.cbrs = {
        unitName: String(cbrs.UNIT_NAME || ''),
        unitType: String(cbrs.UNIT_TYPE || ''),
        systemType: String(cbrs.SYSTEM_TYP || ''),
      };
    }

    return {
      data: nfhlResponse,
      status: 200,
      headers: {},
      cached: false,
      requestId: `nfhl_${Date.now()}`,
      responseTime: 0,
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

  /**
   * Parses FEMA identify response into FloodZoneResponse
   */
  private parseFloodZoneResponse(
    response: FEMAIdentifyResponse,
    lat: number,
    lng: number
  ): FloodZoneResponse {
    // Default response for areas outside NFHL coverage
    const defaultResponse: FloodZoneResponse = {
      floodZone: 'X',
      isSFHA: false,
      description: FLOOD_ZONE_DESCRIPTIONS['X'] || 'Area of minimal flood hazard.',
      raw: response as unknown as Record<string, unknown>,
    };

    if (!response.results || response.results.length === 0) {
      return defaultResponse;
    }

    // Find the flood hazard area result
    const floodResult = response.results.find(
      (r) => r.layerName === 'S_FLD_HAZ_AR' || r.layerId === 28
    );

    if (!floodResult?.attributes) {
      return defaultResponse;
    }

    const attrs = floodResult.attributes;
    const zone = String(attrs.FLD_ZONE || 'X');

    return {
      floodZone: zone,
      isSFHA: isSFHA(zone),
      description: FLOOD_ZONE_DESCRIPTIONS[zone] || `Flood Zone ${zone}`,
      bfe: attrs.STATIC_BFE ? Number(attrs.STATIC_BFE) : undefined,
      panelNumber: attrs.FIRM_PAN ? String(attrs.FIRM_PAN) : undefined,
      mapEffectiveDate: attrs.EFF_DATE ? String(attrs.EFF_DATE) : undefined,
      communityNumber: attrs.CID ? String(attrs.CID) : undefined,
      raw: response as unknown as Record<string, unknown>,
    };
  }

  /**
   * Fallback method using query endpoint instead of identify
   */
  private async getFloodZoneFallback(lat: number, lng: number): Promise<ApiResponse<FloodZoneResponse>> {
    const endpoint = '/public/NFHL/MapServer/28/query';

    const response = await this.get<FEMAQueryResponse>(endpoint, {
      params: {
        geometry: `${lng},${lat}`,
        geometryType: 'esriGeometryPoint',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'FLD_ZONE,ZONE_SUBTY,STATIC_BFE,FIRM_PAN,EFF_DATE,CID',
        returnGeometry: 'false',
        f: 'json',
      },
    });

    if (response.data.error) {
      throw new ApiError(
        `FEMA API error: ${response.data.error.message}`,
        response.data.error.code,
        endpoint,
        response.requestId
      );
    }

    const defaultResponse: FloodZoneResponse = {
      floodZone: 'X',
      isSFHA: false,
      description: FLOOD_ZONE_DESCRIPTIONS['X'] || 'Area of minimal flood hazard.',
      raw: response.data as unknown as Record<string, unknown>,
    };

    if (!response.data.features || response.data.features.length === 0) {
      return { ...response, data: defaultResponse };
    }

    const feature = response.data.features[0];
    const zone = String(feature.attributes.FLD_ZONE || 'X');

    return {
      ...response,
      data: {
        floodZone: zone,
        isSFHA: isSFHA(zone),
        description: FLOOD_ZONE_DESCRIPTIONS[zone] || `Flood Zone ${zone}`,
        bfe: feature.attributes.STATIC_BFE ? Number(feature.attributes.STATIC_BFE) : undefined,
        panelNumber: feature.attributes.FIRM_PAN ? String(feature.attributes.FIRM_PAN) : undefined,
        mapEffectiveDate: feature.attributes.EFF_DATE ? String(feature.attributes.EFF_DATE) : undefined,
        communityNumber: feature.attributes.CID ? String(feature.attributes.CID) : undefined,
        raw: response.data as unknown as Record<string, unknown>,
      },
    };
  }

  /**
   * Queries a specific NFHL layer
   */
  private async queryNFHLLayer(
    lat: number,
    lng: number,
    layerId: number,
    layerName: string
  ): Promise<FEMAQueryResponse> {
    const endpoint = `/public/NFHL/MapServer/${layerId}/query`;

    const response = await this.get<FEMAQueryResponse>(endpoint, {
      params: {
        geometry: `${lng},${lat}`,
        geometryType: 'esriGeometryPoint',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: '*',
        returnGeometry: 'false',
        f: 'json',
      },
      // Don't throw on error, we'll handle missing data gracefully
      cache: { ttl: 86400000 }, // 24 hour cache
    });

    this.logger.debug(`Queried NFHL layer ${layerName}`, {
      layerId,
      lat,
      lng,
      featureCount: response.data.features?.length || 0,
    });

    return response.data;
  }
}

/**
 * Creates a singleton FEMA service instance
 */
let femaServiceInstance: FEMAService | null = null;

export function getFEMAService(config?: FEMAServiceConfig): FEMAService {
  if (!femaServiceInstance) {
    femaServiceInstance = new FEMAService(config);
  }
  return femaServiceInstance;
}

/**
 * Resets the singleton instance (useful for testing)
 */
export function resetFEMAService(): void {
  femaServiceInstance = null;
}

export default FEMAService;
