/**
 * OpenStreetMap Access Analysis Service
 *
 * Provides road access analysis using OpenStreetMap data via Overpass API.
 * Free public API - no API key required.
 *
 * Used for detecting landlocked properties and analyzing road access types.
 *
 * API Documentation: https://wiki.openstreetmap.org/wiki/Overpass_API
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
 * Road access types based on OSM highway tags
 */
export type RoadAccessType =
  | 'public_primary' // Primary/secondary/tertiary highways
  | 'public_residential' // Residential streets
  | 'public_service' // Service roads (public access)
  | 'private' // Private roads/driveways
  | 'limited_access' // Gated communities, restricted access
  | 'track' // Unpaved tracks
  | 'path' // Footpaths, trails
  | 'none'; // No road access found

/**
 * OSM road data element
 */
interface OSMElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: {
    highway?: string;
    name?: string;
    access?: string;
    surface?: string;
    [key: string]: string | undefined;
  };
  geometry?: Array<{ lat: number; lon: number }>;
  distance?: number;
}

/**
 * Overpass API response structure
 */
interface OverpassResponse {
  version: number;
  generator: string;
  osm3s?: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OSMElement[];
}

/**
 * Road access analysis result
 */
export interface RoadAccessAnalysis {
  /** Whether the property appears to be landlocked */
  isLandlocked: boolean;

  /** Type of nearest road access */
  roadAccessType: RoadAccessType;

  /** Distance to nearest public road in meters */
  distanceToPublicRoad: number;

  /** Distance to nearest road of any type in meters */
  distanceToNearestRoad: number;

  /** Number of public roads within 100m */
  nearbyPublicRoads: number;

  /** Details of nearest roads */
  nearestRoads: Array<{
    name: string;
    type: RoadAccessType;
    distance: number;
    surface?: string;
  }>;

  /** Risk level assessment */
  riskLevel: 'low' | 'moderate' | 'high' | 'severe';

  /** Analysis notes */
  notes: string[];
}

/**
 * Point of Interest (POI) category
 */
export type POICategory =
  | 'amenity' // General amenities
  | 'shop' // Retail shops
  | 'healthcare' // Hospitals, clinics
  | 'education' // Schools
  | 'transportation' // Transit stops
  | 'emergency' // Police, fire stations
  | 'leisure' // Parks, recreation;

/**
 * Point of Interest from OSM
 */
export interface PointOfInterest {
  id: number;
  name: string;
  category: POICategory;
  type: string; // Specific type (e.g., 'hospital', 'supermarket')
  distance: number; // Distance in meters
  lat: number;
  lon: number;
  address?: string;
}

/**
 * OSM Service Configuration
 */
export interface OSMServiceConfig {
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default configuration
 */
const DEFAULT_OSM_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://overpass-api.de/api',
  timeout: 30000,
  retries: 2,
  retryDelay: 2000,
  serviceName: 'osm-access',
};

/**
 * Default cache config - 7 days (OSM data is relatively stable)
 */
const DEFAULT_OSM_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 604800000, // 7 days
  maxSize: 500,
};

/**
 * Default rate limit - Overpass API has usage policies
 * https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
 */
const DEFAULT_OSM_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 0.5, // Conservative: 1 request per 2 seconds
  burstSize: 2,
  queueExcess: true,
};

/**
 * Road type classifications for access analysis
 */
const ROAD_TYPE_CLASSIFICATION: Record<string, RoadAccessType> = {
  // Public primary roads
  motorway: 'public_primary',
  trunk: 'public_primary',
  primary: 'public_primary',
  secondary: 'public_primary',
  tertiary: 'public_primary',

  // Public residential
  residential: 'public_residential',
  living_street: 'public_residential',
  unclassified: 'public_residential',

  // Service roads
  service: 'public_service',

  // Private/restricted
  private: 'private',
  driveway: 'private',

  // Limited access
  track: 'track',

  // Paths (typically not vehicle accessible)
  path: 'path',
  footway: 'path',
  cycleway: 'path',
  bridleway: 'path',
  steps: 'path',
  pedestrian: 'path',
};

/**
 * OpenStreetMap Access Analysis Service
 *
 * Free public API for road access and POI analysis.
 */
export class OSMAccessService extends BaseApiService {
  constructor(config?: OSMServiceConfig) {
    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_OSM_CONFIG,
      baseUrl: DEFAULT_OSM_CONFIG.baseUrl!,
    };

    super(
      apiConfig,
      { ...DEFAULT_OSM_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_OSM_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.logger.info('OSMAccessService initialized (free Overpass API, no key required)');
  }

  /**
   * Analyzes road access for a property location
   *
   * @param lat - Latitude of the property
   * @param lng - Longitude of the property
   * @param searchRadius - Search radius in meters (default: 500m)
   * @returns Promise resolving to road access analysis
   *
   * @example
   * ```typescript
   * const osm = new OSMAccessService();
   * const analysis = await osm.analyzeRoadAccess(40.7128, -74.0060);
   * if (analysis.data.isLandlocked) {
   *   console.log('Warning: Property may be landlocked!');
   * }
   * ```
   */
  public async analyzeRoadAccess(
    lat: number,
    lng: number,
    searchRadius: number = 500
  ): Promise<ApiResponse<RoadAccessAnalysis>> {
    // Validate coordinates
    this.validateCoordinates(lat, lng);

    if (searchRadius < 10 || searchRadius > 5000) {
      throw new ValidationError(
        'Search radius must be between 10 and 5000 meters',
        'road-access',
        'validation',
        'searchRadius',
        { range: 'Must be between 10 and 5000 meters' },
        searchRadius
      );
    }

    const endpoint = '/interpreter';

    // Build Overpass QL query to find roads within radius
    const query = this.buildRoadQuery(lat, lng, searchRadius);

    const response = await this.post<OverpassResponse>(endpoint, query, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Analyze the road data
    const analysis = this.analyzeRoadData(response.data.elements, lat, lng);

    return {
      ...response,
      data: analysis,
    };
  }

  /**
   * Finds nearby points of interest
   *
   * @param lat - Latitude of the location
   * @param lng - Longitude of the location
   * @param category - POI category to search for
   * @param radius - Search radius in meters (default: 1000m)
   * @param limit - Maximum number of results (default: 10)
   * @returns Promise resolving to array of POIs
   *
   * @example
   * ```typescript
   * const osm = new OSMAccessService();
   * const hospitals = await osm.findNearbyPOIs(40.7128, -74.0060, 'healthcare', 5000);
   * console.log(`Found ${hospitals.data.length} hospitals within 5km`);
   * ```
   */
  public async findNearbyPOIs(
    lat: number,
    lng: number,
    category: POICategory,
    radius: number = 1000,
    limit: number = 10
  ): Promise<ApiResponse<PointOfInterest[]>> {
    // Validate coordinates
    this.validateCoordinates(lat, lng);

    if (radius < 10 || radius > 10000) {
      throw new ValidationError(
        'Search radius must be between 10 and 10000 meters',
        'poi-search',
        'validation',
        'radius',
        { range: 'Must be between 10 and 10000 meters' },
        radius
      );
    }

    const endpoint = '/interpreter';

    // Build Overpass QL query for POIs
    const query = this.buildPOIQuery(lat, lng, category, radius, limit);

    const response = await this.post<OverpassResponse>(endpoint, query, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Parse POI data
    const pois = this.parsePOIData(response.data.elements, lat, lng, category);

    return {
      ...response,
      data: pois,
    };
  }

  /**
   * Quick check if a location is likely landlocked
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to boolean (true if landlocked)
   *
   * @example
   * ```typescript
   * const osm = new OSMAccessService();
   * const isLandlocked = await osm.isLandlocked(40.7128, -74.0060);
   * ```
   */
  public async isLandlocked(lat: number, lng: number): Promise<ApiResponse<boolean>> {
    const analysis = await this.analyzeRoadAccess(lat, lng, 200);

    return {
      ...analysis,
      data: analysis.data.isLandlocked,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Builds Overpass QL query for road search
   */
  private buildRoadQuery(lat: number, lng: number, radius: number): string {
    // Overpass QL: Find all highways within radius, sorted by distance
    return `
[out:json][timeout:25];
(
  way["highway"](around:${radius},${lat},${lng});
);
out geom;
    `.trim();
  }

  /**
   * Builds Overpass QL query for POI search
   */
  private buildPOIQuery(
    lat: number,
    lng: number,
    category: POICategory,
    radius: number,
    limit: number
  ): string {
    // Map category to OSM tags
    const tagFilter = this.getPOITagFilter(category);

    return `
[out:json][timeout:25];
(
  ${tagFilter}(around:${radius},${lat},${lng});
);
out center ${limit};
    `.trim();
  }

  /**
   * Gets OSM tag filter for POI category
   */
  private getPOITagFilter(category: POICategory): string {
    switch (category) {
      case 'amenity':
        return 'node["amenity"]';
      case 'shop':
        return 'node["shop"]';
      case 'healthcare':
        return 'node["amenity"~"hospital|clinic|doctors|pharmacy"]';
      case 'education':
        return 'node["amenity"~"school|university|college|kindergarten"]';
      case 'transportation':
        return 'node["public_transport"~"stop_position|platform|station"]';
      case 'emergency':
        return 'node["amenity"~"police|fire_station"]';
      case 'leisure':
        return 'node["leisure"]';
      default:
        return 'node["amenity"]';
    }
  }

  /**
   * Analyzes road data to determine access type and landlocked status
   */
  private analyzeRoadData(elements: OSMElement[], lat: number, lng: number): RoadAccessAnalysis {
    const roads: Array<{
      name: string;
      type: RoadAccessType;
      distance: number;
      surface?: string;
      isPublic: boolean;
    }> = [];

    // Process each road element
    for (const element of elements) {
      if (element.type !== 'way' || !element.tags?.highway) {
        continue;
      }

      const highwayType = element.tags.highway;
      const roadType = ROAD_TYPE_CLASSIFICATION[highwayType] || 'public_service';
      const name = element.tags.name || `Unnamed ${highwayType}`;
      const surface = element.tags.surface;

      // Check if explicitly marked as private
      const isPrivate = element.tags.access === 'private' || element.tags.access === 'no';
      const finalType = isPrivate ? 'private' : roadType;

      // Calculate distance to road
      const distance = this.calculateDistanceToRoad(element, lat, lng);

      const isPublic = this.isPublicRoad(finalType);

      roads.push({
        name,
        type: finalType,
        distance,
        surface,
        isPublic,
      });
    }

    // Sort roads by distance
    roads.sort((a, b) => a.distance - b.distance);

    // Find nearest public road
    const nearestPublicRoad = roads.find((r) => r.isPublic);
    const nearestAnyRoad = roads[0];

    const distanceToPublicRoad = nearestPublicRoad?.distance ?? Infinity;
    const distanceToNearestRoad = nearestAnyRoad?.distance ?? Infinity;
    const roadAccessType = nearestPublicRoad?.type || nearestAnyRoad?.type || 'none';

    // Count public roads within 100m
    const nearbyPublicRoads = roads.filter((r) => r.isPublic && r.distance <= 100).length;

    // Determine if landlocked
    const isLandlocked = this.determineIfLandlocked(
      distanceToPublicRoad,
      roadAccessType,
      nearbyPublicRoads
    );

    // Assess risk level
    const riskLevel = this.assessRiskLevel(
      isLandlocked,
      distanceToPublicRoad,
      roadAccessType,
      nearbyPublicRoads
    );

    // Generate analysis notes
    const notes = this.generateAnalysisNotes(
      isLandlocked,
      distanceToPublicRoad,
      roadAccessType,
      nearbyPublicRoads,
      roads.length
    );

    // Prepare nearest roads summary (top 5)
    const nearestRoads = roads.slice(0, 5).map((r) => ({
      name: r.name,
      type: r.type,
      distance: Math.round(r.distance),
      surface: r.surface,
    }));

    return {
      isLandlocked,
      roadAccessType,
      distanceToPublicRoad: Math.round(distanceToPublicRoad),
      distanceToNearestRoad: Math.round(distanceToNearestRoad),
      nearbyPublicRoads,
      nearestRoads,
      riskLevel,
      notes,
    };
  }

  /**
   * Parses POI data from Overpass response
   */
  private parsePOIData(
    elements: OSMElement[],
    centerLat: number,
    centerLng: number,
    category: POICategory
  ): PointOfInterest[] {
    const pois: PointOfInterest[] = [];

    for (const element of elements) {
      if (!element.lat || !element.lon) {
        continue;
      }

      const tags = element.tags || {};
      const name = tags.name || 'Unnamed';

      // Determine specific type based on tags
      let type = 'unknown';
      if (tags.amenity) type = tags.amenity;
      else if (tags.shop) type = tags.shop;
      else if (tags.leisure) type = tags.leisure;
      else if (tags.public_transport) type = tags.public_transport;

      const distance = this.calculateDistance(centerLat, centerLng, element.lat, element.lon);

      pois.push({
        id: element.id,
        name,
        category,
        type,
        distance: Math.round(distance),
        lat: element.lat,
        lon: element.lon,
      });
    }

    // Sort by distance
    pois.sort((a, b) => a.distance - b.distance);

    return pois;
  }

  /**
   * Calculates distance to a road (closest point on the road geometry)
   */
  private calculateDistanceToRoad(road: OSMElement, lat: number, lng: number): number {
    if (!road.geometry || road.geometry.length === 0) {
      // No geometry, use node location if available
      if (road.lat && road.lon) {
        return this.calculateDistance(lat, lng, road.lat, road.lon);
      }
      return Infinity;
    }

    // Find minimum distance to any point on the road
    let minDistance = Infinity;

    for (const point of road.geometry) {
      const distance = this.calculateDistance(lat, lng, point.lat, point.lon);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance;
  }

  /**
   * Calculates distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Determines if a road type is considered public access
   */
  private isPublicRoad(roadType: RoadAccessType): boolean {
    return (
      roadType === 'public_primary' ||
      roadType === 'public_residential' ||
      roadType === 'public_service'
    );
  }

  /**
   * Determines if property is landlocked based on road access
   */
  private determineIfLandlocked(
    distanceToPublicRoad: number,
    roadAccessType: RoadAccessType,
    nearbyPublicRoads: number
  ): boolean {
    // Landlocked if:
    // 1. No public road within 200m, OR
    // 2. Only access is via private/path/track, OR
    // 3. No road access at all
    return (
      distanceToPublicRoad > 200 ||
      roadAccessType === 'private' ||
      roadAccessType === 'path' ||
      roadAccessType === 'track' ||
      roadAccessType === 'none' ||
      nearbyPublicRoads === 0
    );
  }

  /**
   * Assesses risk level based on access analysis
   */
  private assessRiskLevel(
    isLandlocked: boolean,
    distanceToPublicRoad: number,
    roadAccessType: RoadAccessType,
    nearbyPublicRoads: number
  ): 'low' | 'moderate' | 'high' | 'severe' {
    if (roadAccessType === 'none') {
      return 'severe';
    }

    if (isLandlocked) {
      if (distanceToPublicRoad > 500 || roadAccessType === 'path') {
        return 'severe';
      }
      if (distanceToPublicRoad > 200 || roadAccessType === 'track') {
        return 'high';
      }
      return 'moderate';
    }

    if (roadAccessType === 'private' || roadAccessType === 'limited_access') {
      return 'moderate';
    }

    if (nearbyPublicRoads >= 2) {
      return 'low';
    }

    return 'low';
  }

  /**
   * Generates analysis notes
   */
  private generateAnalysisNotes(
    isLandlocked: boolean,
    distanceToPublicRoad: number,
    roadAccessType: RoadAccessType,
    nearbyPublicRoads: number,
    totalRoads: number
  ): string[] {
    const notes: string[] = [];

    if (isLandlocked) {
      notes.push('⚠️ Property appears to be LANDLOCKED - no public road access within 200m');
    }

    if (roadAccessType === 'none') {
      notes.push('❌ No road access found within search radius');
    } else if (roadAccessType === 'private') {
      notes.push('🔒 Nearest road is PRIVATE - may require easement or right-of-way');
    } else if (roadAccessType === 'track') {
      notes.push('🚜 Nearest access is unpaved TRACK - may be seasonal or 4WD only');
    } else if (roadAccessType === 'path') {
      notes.push('🚶 Only footpath/trail access - not suitable for vehicles');
    }

    if (distanceToPublicRoad > 500) {
      notes.push(`📍 Public road is ${Math.round(distanceToPublicRoad)}m away - significant distance`);
    } else if (distanceToPublicRoad > 200 && distanceToPublicRoad <= 500) {
      notes.push(`📍 Public road is ${Math.round(distanceToPublicRoad)}m away`);
    }

    if (nearbyPublicRoads === 0) {
      notes.push('🚫 No public roads within 100m');
    } else if (nearbyPublicRoads === 1) {
      notes.push('✓ One public road within 100m');
    } else {
      notes.push(`✓ ${nearbyPublicRoads} public roads within 100m`);
    }

    if (totalRoads === 0) {
      notes.push('⚠️ OSM data may be incomplete for this area');
    }

    if (!isLandlocked && roadAccessType.startsWith('public')) {
      notes.push('✅ Property has good public road access');
    }

    return notes;
  }

  /**
   * Validates coordinates
   */
  private validateCoordinates(lat: number, lng: number): void {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new ValidationError(
        'Latitude and longitude must be numbers',
        'coordinates',
        'validation',
        'coordinates',
        { type: 'Must be numbers' },
        { lat, lng }
      );
    }

    if (lat < -90 || lat > 90) {
      throw new ValidationError(
        'Latitude must be between -90 and 90',
        'coordinates',
        'validation',
        'latitude',
        { range: 'Must be between -90 and 90' },
        lat
      );
    }

    if (lng < -180 || lng > 180) {
      throw new ValidationError(
        'Longitude must be between -180 and 180',
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
let osmServiceInstance: OSMAccessService | null = null;

/**
 * Gets or creates the singleton OSM service instance
 *
 * @param config - Optional configuration (only used on first call)
 * @returns OSMAccessService instance
 *
 * @example
 * ```typescript
 * const osm = getOSMService();
 * const analysis = await osm.analyzeRoadAccess(lat, lng);
 * ```
 */
export function getOSMService(config?: OSMServiceConfig): OSMAccessService {
  if (!osmServiceInstance) {
    osmServiceInstance = new OSMAccessService(config);
  }
  return osmServiceInstance;
}

/**
 * Resets the singleton instance (useful for testing)
 */
export function resetOSMService(): void {
  osmServiceInstance = null;
}

export default OSMAccessService;
