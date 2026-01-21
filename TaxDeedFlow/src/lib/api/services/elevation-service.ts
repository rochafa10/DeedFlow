/**
 * Open-Elevation API Service
 *
 * Provides elevation data for any location on Earth.
 * Free public API - no API key required.
 *
 * API Documentation: https://open-elevation.com/
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
 * Elevation data point
 */
export interface ElevationPoint {
  latitude: number;
  longitude: number;
  elevation: number; // meters
  elevationFeet: number; // feet
}

/**
 * Terrain/Slope analysis data
 */
export interface TerrainAnalysis {
  elevation: number; // meters
  elevationFeet: number; // feet
  averageSlope: number; // percentage
  maxSlope: number; // percentage
  slopeDirection: 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW' | 'flat';
  classification: 'flat' | 'gentle' | 'moderate' | 'steep' | 'very_steep';
  classificationLabel: string;
  stability: 'stable' | 'moderate_risk' | 'high_risk';
  stabilityLabel: string;
  developmentSuitability: string;
  assessment: string;
}

/**
 * Elevation analysis for flood risk
 */
export interface ElevationAnalysis {
  location: {
    lat: number;
    lng: number;
  };
  elevation: {
    meters: number;
    feet: number;
  };
  floodRiskAssessment: {
    risk: 'low' | 'moderate' | 'high';
    reason: string;
    belowSeaLevel: boolean;
    nearCoast: boolean;
    inLowLyingArea: boolean;
  };
  surroundingElevations?: {
    north: number;
    south: number;
    east: number;
    west: number;
    average: number;
    isLowestPoint: boolean;
  };
  terrain?: TerrainAnalysis;
}

/**
 * Elevation Service Configuration
 */
export interface ElevationServiceConfig {
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default configuration
 */
const DEFAULT_ELEVATION_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://api.open-elevation.com/api/v1',
  timeout: 30000,
  retries: 3,
  retryDelay: 2000,
  serviceName: 'open-elevation',
};

/**
 * Default cache config - permanent (elevation doesn't change)
 */
const DEFAULT_ELEVATION_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 31536000000, // 1 year (effectively permanent)
  maxSize: 1000,
};

/**
 * Default rate limit - public API, be respectful
 */
const DEFAULT_ELEVATION_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 1,
  burstSize: 5,
  queueExcess: true,
};

/**
 * Open-Elevation API Service
 *
 * Provides elevation data for flood risk analysis.
 */
export class ElevationService extends BaseApiService {
  constructor(config?: ElevationServiceConfig) {
    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_ELEVATION_CONFIG,
      baseUrl: DEFAULT_ELEVATION_CONFIG.baseUrl!,
    };

    super(
      apiConfig,
      { ...DEFAULT_ELEVATION_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_ELEVATION_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.logger.info('ElevationService initialized (free API, no key required)');
  }

  /**
   * Get elevation for a single point
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to elevation data
   *
   * @example
   * ```typescript
   * const elevation = getElevationService();
   * const data = await elevation.getElevation(40.5186, -78.3947);
   * console.log(data.data.elevationFeet); // 1200
   * ```
   */
  public async getElevation(lat: number, lng: number): Promise<ApiResponse<ElevationPoint>> {
    this.validateCoordinates(lat, lng);

    const endpoint = '/lookup';

    const response = await this.get<{
      results: Array<{
        latitude: number;
        longitude: number;
        elevation: number;
      }>;
    }>(endpoint, {
      params: {
        locations: `${lat},${lng}`,
      },
    });

    const result = response.data.results[0];

    if (!result) {
      throw new ValidationError(
        'No elevation data available for this location',
        'coordinates',
        'data',
        'coordinates',
        {},
        { lat, lng }
      );
    }

    return {
      ...response,
      data: {
        latitude: result.latitude,
        longitude: result.longitude,
        elevation: result.elevation,
        elevationFeet: Math.round(result.elevation * 3.28084),
      },
    };
  }

  /**
   * Get elevation for multiple points
   *
   * @param locations - Array of [lat, lng] pairs
   * @returns Promise resolving to elevation data for all points
   */
  public async getElevations(
    locations: Array<[number, number]>
  ): Promise<ApiResponse<ElevationPoint[]>> {
    if (!locations || locations.length === 0) {
      throw new ValidationError(
        'At least one location is required',
        'locations',
        'validation',
        'locations',
        { required: 'true' },
        locations
      );
    }

    // Validate all coordinates
    locations.forEach(([lat, lng], index) => {
      try {
        this.validateCoordinates(lat, lng);
      } catch (error) {
        throw new ValidationError(
          `Invalid coordinates at index ${index}`,
          'locations',
          'validation',
          `locations[${index}]`,
          {},
          { lat, lng }
        );
      }
    });

    const endpoint = '/lookup';
    const locationsStr = locations.map(([lat, lng]) => `${lat},${lng}`).join('|');

    const response = await this.get<{
      results: Array<{
        latitude: number;
        longitude: number;
        elevation: number;
      }>;
    }>(endpoint, {
      params: {
        locations: locationsStr,
      },
    });

    const points = response.data.results.map((r) => ({
      latitude: r.latitude,
      longitude: r.longitude,
      elevation: r.elevation,
      elevationFeet: Math.round(r.elevation * 3.28084),
    }));

    return {
      ...response,
      data: points,
    };
  }

  /**
   * Get elevation analysis with flood risk assessment
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @param checkSurrounding - Whether to check surrounding elevations
   * @returns Promise resolving to elevation analysis
   */
  public async getElevationAnalysis(
    lat: number,
    lng: number,
    checkSurrounding: boolean = true
  ): Promise<ApiResponse<ElevationAnalysis>> {
    this.validateCoordinates(lat, lng);

    let mainElevation: ElevationPoint;
    let surroundingData: ElevationAnalysis['surroundingElevations'] | undefined;

    if (checkSurrounding) {
      // Get elevation for main point and 4 surrounding points (0.01 degrees ≈ 1km)
      const offset = 0.01;
      const locations: Array<[number, number]> = [
        [lat, lng], // Center
        [lat + offset, lng], // North
        [lat - offset, lng], // South
        [lat, lng + offset], // East
        [lat, lng - offset], // West
      ];

      const response = await this.getElevations(locations);
      const [center, north, south, east, west] = response.data;

      mainElevation = center;

      const surroundingElevations = [north.elevation, south.elevation, east.elevation, west.elevation];
      const average = surroundingElevations.reduce((a, b) => a + b, 0) / 4;
      const isLowestPoint = center.elevation < Math.min(...surroundingElevations);

      surroundingData = {
        north: north.elevation,
        south: south.elevation,
        east: east.elevation,
        west: west.elevation,
        average: Math.round(average * 100) / 100,
        isLowestPoint,
      };
    } else {
      const response = await this.getElevation(lat, lng);
      mainElevation = response.data;
    }

    // Assess flood risk based on elevation
    const floodRisk = this.assessFloodRisk(mainElevation, surroundingData);

    // Calculate terrain/slope analysis if surrounding data is available
    const terrainData = surroundingData
      ? this.calculateTerrainAnalysis(mainElevation, surroundingData)
      : undefined;

    const analysis: ElevationAnalysis = {
      location: { lat, lng },
      elevation: {
        meters: mainElevation.elevation,
        feet: mainElevation.elevationFeet,
      },
      floodRiskAssessment: floodRisk,
      surroundingElevations: surroundingData,
      terrain: terrainData,
    };

    return {
      data: analysis,
      status: 200,
      headers: {},
      cached: false,
      requestId: `elevation_${Date.now()}`,
      responseTime: 0,
    };
  }

  /**
   * Calculate terrain/slope analysis from elevation data
   *
   * Slope classification based on USDA standards:
   * - 0-3%: Flat
   * - 3-8%: Gentle (suitable for most development)
   * - 8-15%: Moderate (some grading required)
   * - 15-30%: Steep (significant engineering required)
   * - >30%: Very steep (major constraints)
   */
  private calculateTerrainAnalysis(
    center: ElevationPoint,
    surrounding: ElevationAnalysis['surroundingElevations']
  ): TerrainAnalysis {
    // Distance between sample points (0.01 degrees ≈ ~1.1km at mid-latitudes)
    // Using approximate value for slope calculation
    const horizontalDistance = 1100; // meters (approximate)

    // Guard against undefined surrounding elevations - return flat terrain if not available
    if (!surrounding) {
      return {
        elevation: center.elevation,
        elevationFeet: center.elevation * 3.28084,
        averageSlope: 0,
        maxSlope: 0,
        slopeDirection: 'flat',
        classification: 'flat',
        classificationLabel: 'Flat (0-3%)',
        stability: 'stable',
        stabilityLabel: 'Stable terrain',
        developmentSuitability: 'Excellent - Flat terrain',
        assessment: 'Flat terrain with no slope data available',
      };
    }

    // Calculate slope to each cardinal direction
    const slopes = {
      north: Math.abs(surrounding.north - center.elevation) / horizontalDistance * 100,
      south: Math.abs(surrounding.south - center.elevation) / horizontalDistance * 100,
      east: Math.abs(surrounding.east - center.elevation) / horizontalDistance * 100,
      west: Math.abs(surrounding.west - center.elevation) / horizontalDistance * 100,
    };

    // Average slope
    const averageSlope = (slopes.north + slopes.south + slopes.east + slopes.west) / 4;

    // Max slope
    const maxSlope = Math.max(slopes.north, slopes.south, slopes.east, slopes.west);

    // Determine slope direction (direction of steepest descent)
    let slopeDirection: TerrainAnalysis['slopeDirection'] = 'flat';
    if (maxSlope > 1) {
      const maxSlopeKey = (Object.keys(slopes) as Array<keyof typeof slopes>).reduce((a, b) =>
        slopes[a] > slopes[b] ? a : b
      );

      // Determine if center is higher or lower than the max slope direction
      const isDescending = center.elevation > surrounding[maxSlopeKey];

      switch (maxSlopeKey) {
        case 'north': slopeDirection = isDescending ? 'N' : 'S'; break;
        case 'south': slopeDirection = isDescending ? 'S' : 'N'; break;
        case 'east': slopeDirection = isDescending ? 'E' : 'W'; break;
        case 'west': slopeDirection = isDescending ? 'W' : 'E'; break;
      }
    }

    // Classify slope based on USDA standards
    let classification: TerrainAnalysis['classification'];
    let classificationLabel: string;

    if (averageSlope < 3) {
      classification = 'flat';
      classificationLabel = 'Flat - Ideal for development';
    } else if (averageSlope < 8) {
      classification = 'gentle';
      classificationLabel = 'Gentle - Suitable for development';
    } else if (averageSlope < 15) {
      classification = 'moderate';
      classificationLabel = 'Moderate - Some grading required';
    } else if (averageSlope < 30) {
      classification = 'steep';
      classificationLabel = 'Steep - Significant engineering required';
    } else {
      classification = 'very_steep';
      classificationLabel = 'Very Steep - Major development constraints';
    }

    // Assess stability (simplified assessment based on slope)
    let stability: TerrainAnalysis['stability'];
    let stabilityLabel: string;

    if (maxSlope < 15) {
      stability = 'stable';
      stabilityLabel = 'No landslide risk';
    } else if (maxSlope < 30) {
      stability = 'moderate_risk';
      stabilityLabel = 'Low to moderate landslide risk';
    } else {
      stability = 'high_risk';
      stabilityLabel = 'Elevated landslide risk - geotechnical study recommended';
    }

    // Development suitability assessment
    let developmentSuitability: string;
    if (averageSlope < 8) {
      developmentSuitability = 'Standard foundation construction is appropriate';
    } else if (averageSlope < 15) {
      developmentSuitability = 'Stepped or terraced foundation may be required';
    } else if (averageSlope < 30) {
      developmentSuitability = 'Significant site work and specialized foundation design required';
    } else {
      developmentSuitability = 'Development not recommended without extensive engineering';
    }

    // Generate assessment text
    const assessment = `Property at ${center.elevation}m (${center.elevationFeet}ft) elevation is ${
      averageSlope < 8 ? 'suitable' : averageSlope < 15 ? 'moderately suitable' : 'challenging'
    } for residential use with ${
      averageSlope < 3 ? 'no' : averageSlope < 8 ? 'minimal' : averageSlope < 15 ? 'moderate' : 'significant'
    } slope concerns. ${developmentSuitability}.`;

    return {
      elevation: center.elevation,
      elevationFeet: center.elevationFeet,
      averageSlope: Math.round(averageSlope * 10) / 10,
      maxSlope: Math.round(maxSlope * 10) / 10,
      slopeDirection,
      classification,
      classificationLabel,
      stability,
      stabilityLabel,
      developmentSuitability,
      assessment,
    };
  }

  /**
   * Assess flood risk based on elevation
   */
  private assessFloodRisk(
    point: ElevationPoint,
    surrounding?: ElevationAnalysis['surroundingElevations']
  ): ElevationAnalysis['floodRiskAssessment'] {
    const elevation = point.elevation;
    const belowSeaLevel = elevation < 0;
    const nearCoast = elevation < 10; // Less than 10m above sea level
    const inLowLyingArea = surrounding?.isLowestPoint === true;

    let risk: 'low' | 'moderate' | 'high';
    let reason: string;

    if (belowSeaLevel) {
      risk = 'high';
      reason = `Location is ${Math.abs(elevation).toFixed(1)}m below sea level`;
    } else if (nearCoast && inLowLyingArea) {
      risk = 'high';
      reason = `Low elevation (${elevation.toFixed(1)}m) and lowest point in area`;
    } else if (nearCoast) {
      risk = 'moderate';
      reason = `Low coastal elevation (${elevation.toFixed(1)}m above sea level)`;
    } else if (inLowLyingArea) {
      risk = 'moderate';
      reason = `Lowest elevation point in surrounding area`;
    } else if (elevation < 30) {
      risk = 'moderate';
      reason = `Relatively low elevation (${elevation.toFixed(1)}m)`;
    } else {
      risk = 'low';
      reason = `Good elevation (${elevation.toFixed(1)}m above sea level)`;
    }

    return {
      risk,
      reason,
      belowSeaLevel,
      nearCoast,
      inLowLyingArea,
    };
  }

  /**
   * Check if location is in a flood-prone area based on elevation
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to flood risk boolean and details
   */
  public async isFloodProne(
    lat: number,
    lng: number
  ): Promise<ApiResponse<{ floodProne: boolean; risk: string; elevation: number }>> {
    const analysis = await this.getElevationAnalysis(lat, lng, true);

    return {
      ...analysis,
      data: {
        floodProne: analysis.data.floodRiskAssessment.risk !== 'low',
        risk: analysis.data.floodRiskAssessment.risk,
        elevation: analysis.data.elevation.meters,
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
let elevationServiceInstance: ElevationService | null = null;

export function getElevationService(config?: ElevationServiceConfig): ElevationService {
  if (!elevationServiceInstance) {
    elevationServiceInstance = new ElevationService(config);
  }
  return elevationServiceInstance;
}

export function resetElevationService(): void {
  elevationServiceInstance = null;
}

export default ElevationService;
