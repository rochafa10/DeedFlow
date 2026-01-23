/**
 * Elevation API Service Tests
 *
 * Tests the Open-Elevation API service functionality including:
 * - Single point elevation retrieval
 * - Multiple point elevation retrieval
 * - Elevation analysis with flood risk assessment
 * - Terrain and slope analysis
 * - Flood risk classification
 * - Coordinate validation
 * - Error handling
 * - Singleton pattern
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ElevationService,
  getElevationService,
  resetElevationService,
  type ElevationPoint,
  type ElevationAnalysis,
  type TerrainAnalysis,
} from '../elevation-service';
import { ValidationError } from '../../errors';
import type { ApiResponse } from '../../types';

// ============================================
// Mock Data - Single Point Response
// ============================================

const mockSinglePointResponse = {
  results: [
    {
      latitude: 40.5186,
      longitude: -78.3947,
      elevation: 365.4,
    },
  ],
};

const mockLowElevationResponse = {
  results: [
    {
      latitude: 29.7604,
      longitude: -95.3698, // Houston
      elevation: 12.3,
    },
  ],
};

const mockBelowSeaLevelResponse = {
  results: [
    {
      latitude: 33.5123,
      longitude: -116.1739, // Death Valley area
      elevation: -52.0,
    },
  ],
};

const mockHighElevationResponse = {
  results: [
    {
      latitude: 39.7392,
      longitude: -104.9903, // Denver
      elevation: 1609.0, // ~1 mile high
    },
  ],
};

// ============================================
// Mock Data - Multiple Points Response
// ============================================

const mockMultiplePointsResponse = {
  results: [
    {
      latitude: 40.5186,
      longitude: -78.3947,
      elevation: 355.2,
    },
    {
      latitude: 40.5286,
      longitude: -78.3947,
      elevation: 380.5,
    },
    {
      latitude: 40.5086,
      longitude: -78.3947,
      elevation: 365.4,
    },
    {
      latitude: 40.5186,
      longitude: -78.4047,
      elevation: 370.8,
    },
    {
      latitude: 40.5186,
      longitude: -78.3847,
      elevation: 360.1,
    },
  ],
};

const mockSteepTerrainResponse = {
  results: [
    {
      latitude: 45.8326,
      longitude: -121.6857, // Mt. Hood area
      elevation: 1200.0,
    },
    {
      latitude: 45.8426,
      longitude: -121.6857, // North - higher
      elevation: 1450.0,
    },
    {
      latitude: 45.8226,
      longitude: -121.6857, // South - lower
      elevation: 950.0,
    },
    {
      latitude: 45.8326,
      longitude: -121.6957, // East
      elevation: 1180.0,
    },
    {
      latitude: 45.8326,
      longitude: -121.6757, // West
      elevation: 1220.0,
    },
  ],
};

// ============================================
// Helper Functions
// ============================================

/**
 * Creates a mock fetch response with proper headers
 */
function createMockResponse(
  data: any,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Map(Object.entries({
      'content-type': 'application/json',
      ...headers,
    })) as any,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

// ============================================
// Test Setup
// ============================================

describe('ElevationService', () => {
  let service: ElevationService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset singleton between tests
    resetElevationService();

    // Create fresh service instance with caching disabled for tests
    service = new ElevationService({
      cacheConfig: { enabled: false },
    });

    // Mock global fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Silence console logs during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Constructor Tests
  // ============================================

  describe('constructor', () => {
    it('should create service with default config', () => {
      const newService = new ElevationService();
      expect(newService).toBeDefined();
      expect(newService).toBeInstanceOf(ElevationService);
    });

    it('should create service with custom cache config', () => {
      const newService = new ElevationService({
        cacheConfig: { enabled: true, ttl: 3600000 },
      });
      expect(newService).toBeDefined();
    });

    it('should create service with custom circuit breaker config', () => {
      const newService = new ElevationService({
        circuitBreakerConfig: { failureThreshold: 10 },
      });
      expect(newService).toBeDefined();
    });

    it('should create service with custom rate limit config', () => {
      const newService = new ElevationService({
        rateLimitConfig: { requestsPerSecond: 2, burstSize: 3 },
      });
      expect(newService).toBeDefined();
    });

    it('should create service with all custom configs', () => {
      const newService = new ElevationService({
        cacheConfig: { enabled: true, ttl: 31536000000 },
        circuitBreakerConfig: { failureThreshold: 5, resetTimeout: 60000 },
        rateLimitConfig: { requestsPerSecond: 1, burstSize: 5 },
      });
      expect(newService).toBeDefined();
    });
  });

  // ============================================
  // getElevation Tests (Single Point)
  // ============================================

  describe('getElevation', () => {
    it('should retrieve elevation for valid coordinates', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockSinglePointResponse)
      );

      const result = await service.getElevation(40.5186, -78.3947);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.latitude).toBe(40.5186);
      expect(result.data.longitude).toBe(-78.3947);
      expect(result.data.elevation).toBe(365.4);
    });

    it('should convert elevation to feet correctly', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockSinglePointResponse)
      );

      const result = await service.getElevation(40.5186, -78.3947);

      // 365.4 meters * 3.28084 ≈ 1199 feet
      expect(result.data.elevationFeet).toBe(Math.round(365.4 * 3.28084));
    });

    it('should include correct API endpoint parameters', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockSinglePointResponse)
      );

      await service.getElevation(40.5186, -78.3947);

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain('/lookup');
      expect(callUrl).toContain('locations=40.5186%2C-78.3947');
    });

    it('should handle high elevation locations', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockHighElevationResponse)
      );

      const result = await service.getElevation(39.7392, -104.9903);

      expect(result.data.elevation).toBe(1609.0);
      expect(result.data.elevationFeet).toBeGreaterThan(5000);
    });

    it('should handle below sea level locations', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockBelowSeaLevelResponse)
      );

      const result = await service.getElevation(33.5123, -116.1739);

      expect(result.data.elevation).toBeLessThan(0);
      expect(result.data.elevation).toBe(-52.0);
    });

    it('should throw ValidationError when no results returned', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ results: [] })
      );

      await expect(service.getElevation(40.5186, -78.3947))
        .rejects
        .toThrow('No elevation data available');
    });

    it('should throw ValidationError for invalid latitude - too low', async () => {
      await expect(service.getElevation(-91, -78.3947))
        .rejects
        .toThrow(ValidationError);

      await expect(service.getElevation(-91, -78.3947))
        .rejects
        .toThrow('Invalid latitude');
    });

    it('should throw ValidationError for invalid latitude - too high', async () => {
      await expect(service.getElevation(91, -78.3947))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for NaN latitude', async () => {
      await expect(service.getElevation(NaN, -78.3947))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid longitude - too low', async () => {
      await expect(service.getElevation(40.5186, -181))
        .rejects
        .toThrow(ValidationError);

      await expect(service.getElevation(40.5186, -181))
        .rejects
        .toThrow('Invalid longitude');
    });

    it('should throw ValidationError for invalid longitude - too high', async () => {
      await expect(service.getElevation(40.5186, 181))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for NaN longitude', async () => {
      await expect(service.getElevation(40.5186, NaN))
        .rejects
        .toThrow(ValidationError);
    });
  });

  // ============================================
  // getElevations Tests (Multiple Points)
  // ============================================

  describe('getElevations', () => {
    it('should retrieve elevations for multiple points', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const locations: Array<[number, number]> = [
        [40.5186, -78.3947],
        [40.5286, -78.3947],
        [40.5086, -78.3947],
        [40.5186, -78.4047],
        [40.5186, -78.3847],
      ];

      const result = await service.getElevations(locations);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(5);
    });

    it('should format locations parameter correctly', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const locations: Array<[number, number]> = [
        [40.5186, -78.3947],
        [40.5286, -78.3947],
      ];

      await service.getElevations(locations);

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain('40.5186%2C-78.3947%7C40.5286%2C-78.3947');
    });

    it('should convert all elevations to feet', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const locations: Array<[number, number]> = [
        [40.5186, -78.3947],
        [40.5286, -78.3947],
      ];

      const result = await service.getElevations(locations);

      result.data.forEach((point) => {
        expect(point.elevationFeet).toBe(Math.round(point.elevation * 3.28084));
      });
    });

    it('should throw ValidationError for empty locations array', async () => {
      await expect(service.getElevations([]))
        .rejects
        .toThrow(ValidationError);

      await expect(service.getElevations([]))
        .rejects
        .toThrow('At least one location is required');
    });

    it('should throw ValidationError for invalid coordinates at specific index', async () => {
      const locations: Array<[number, number]> = [
        [40.5186, -78.3947],
        [91, -78.3947], // Invalid latitude
      ];

      await expect(service.getElevations(locations))
        .rejects
        .toThrow(ValidationError);

      await expect(service.getElevations(locations))
        .rejects
        .toThrow('Invalid coordinates at index 1');
    });

    it('should validate all coordinates before making API call', async () => {
      const locations: Array<[number, number]> = [
        [40.5186, -78.3947],
        [40.5286, -78.3947],
        [100, -78.3947], // Invalid at index 2
      ];

      await expect(service.getElevations(locations))
        .rejects
        .toThrow(ValidationError);

      // Fetch should not be called due to validation error
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // getElevationAnalysis Tests
  // ============================================

  describe('getElevationAnalysis', () => {
    it('should retrieve elevation analysis with surrounding data', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, true);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.location.lat).toBe(40.5186);
      expect(result.data.location.lng).toBe(-78.3947);
    });

    it('should include elevation in both meters and feet', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, true);

      expect(result.data.elevation.meters).toBe(355.2);
      expect(result.data.elevation.feet).toBe(Math.round(355.2 * 3.28084));
    });

    it('should include surrounding elevations when checkSurrounding is true', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, true);

      expect(result.data.surroundingElevations).toBeDefined();
      expect(result.data.surroundingElevations?.north).toBe(380.5);
      expect(result.data.surroundingElevations?.south).toBe(365.4);
      expect(result.data.surroundingElevations?.east).toBe(370.8);
      expect(result.data.surroundingElevations?.west).toBe(360.1);
    });

    it('should calculate average surrounding elevation', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, true);

      const expectedAvg = (380.5 + 365.4 + 370.8 + 360.1) / 4;
      expect(result.data.surroundingElevations?.average).toBe(
        Math.round(expectedAvg * 100) / 100
      );
    });

    it('should detect if location is lowest point', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, true);

      // Center is 365.4, all surrounding are higher
      expect(result.data.surroundingElevations?.isLowestPoint).toBe(true);
    });

    it('should not include surrounding elevations when checkSurrounding is false', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockSinglePointResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, false);

      expect(result.data.surroundingElevations).toBeUndefined();
    });

    it('should include terrain analysis when surrounding data is available', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, true);

      expect(result.data.terrain).toBeDefined();
      expect(result.data.terrain?.elevation).toBe(355.2);
      expect(result.data.terrain?.averageSlope).toBeGreaterThanOrEqual(0);
      expect(result.data.terrain?.maxSlope).toBeGreaterThanOrEqual(0);
      expect(result.data.terrain?.classification).toBeDefined();
      expect(result.data.terrain?.stability).toBeDefined();
    });

    it('should not include terrain analysis when checkSurrounding is false', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockSinglePointResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, false);

      expect(result.data.terrain).toBeUndefined();
    });

    it('should include flood risk assessment', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, true);

      expect(result.data.floodRiskAssessment).toBeDefined();
      expect(result.data.floodRiskAssessment.risk).toMatch(/^(low|moderate|high)$/);
      expect(result.data.floodRiskAssessment.reason).toBeDefined();
      expect(result.data.floodRiskAssessment.belowSeaLevel).toBeDefined();
      expect(result.data.floodRiskAssessment.nearCoast).toBeDefined();
      expect(result.data.floodRiskAssessment.inLowLyingArea).toBeDefined();
    });
  });

  // ============================================
  // Terrain Analysis Tests
  // ============================================

  describe('terrain analysis', () => {
    it('should classify flat terrain correctly', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, true);

      // Small variations in elevation = flat terrain
      expect(result.data.terrain?.classification).toBe('flat');
      expect(result.data.terrain?.averageSlope).toBeLessThan(3);
    });

    it('should classify steep terrain correctly', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockSteepTerrainResponse)
      );

      const result = await service.getElevationAnalysis(45.8326, -121.6857, true);

      // Large elevation differences = steep/very steep terrain
      expect(['moderate', 'steep', 'very_steep']).toContain(result.data.terrain?.classification);
      expect(result.data.terrain?.averageSlope).toBeGreaterThan(8);
    });

    it('should calculate slope direction for steep terrain', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockSteepTerrainResponse)
      );

      const result = await service.getElevationAnalysis(45.8326, -121.6857, true);

      expect(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW', 'flat']).toContain(
        result.data.terrain?.slopeDirection
      );
    });

    it('should assess stability based on slope', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, true);

      expect(['stable', 'moderate_risk', 'high_risk']).toContain(
        result.data.terrain?.stability
      );
    });

    it('should provide development suitability assessment', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, true);

      expect(result.data.terrain?.developmentSuitability).toBeDefined();
      expect(result.data.terrain?.developmentSuitability.length).toBeGreaterThan(0);
    });

    it('should provide terrain assessment text', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, true);

      expect(result.data.terrain?.assessment).toBeDefined();
      expect(result.data.terrain?.assessment).toContain('elevation');
    });

    it('should mark flat terrain as stable', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, true);

      expect(result.data.terrain?.stability).toBe('stable');
    });
  });

  // ============================================
  // Flood Risk Assessment Tests
  // ============================================

  describe('flood risk assessment', () => {
    it('should classify below sea level as high risk', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockBelowSeaLevelResponse)
      );

      const result = await service.getElevationAnalysis(33.5123, -116.1739, false);

      expect(result.data.floodRiskAssessment.risk).toBe('high');
      expect(result.data.floodRiskAssessment.belowSeaLevel).toBe(true);
      expect(result.data.floodRiskAssessment.reason).toContain('below sea level');
    });

    it('should classify low coastal elevation as moderate-high risk', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockLowElevationResponse)
      );

      const result = await service.getElevationAnalysis(29.7604, -95.3698, false);

      expect(['moderate', 'high']).toContain(result.data.floodRiskAssessment.risk);
      expect(result.data.floodRiskAssessment.nearCoast).toBe(false);
    });

    it('should classify high elevation as low risk', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockHighElevationResponse)
      );

      const result = await service.getElevationAnalysis(39.7392, -104.9903, false);

      expect(result.data.floodRiskAssessment.risk).toBe('low');
      expect(result.data.floodRiskAssessment.belowSeaLevel).toBe(false);
      expect(result.data.floodRiskAssessment.nearCoast).toBe(false);
    });

    it('should flag lowest point in area as moderate-high risk', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      const result = await service.getElevationAnalysis(40.5186, -78.3947, true);

      // Center (355.2) is lowest point - all surrounding are higher
      expect(result.data.surroundingElevations?.isLowestPoint).toBe(true);
      expect(['moderate', 'high']).toContain(result.data.floodRiskAssessment.risk);
    });

    it('should include detailed reason for flood risk classification', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockHighElevationResponse)
      );

      const result = await service.getElevationAnalysis(39.7392, -104.9903, false);

      expect(result.data.floodRiskAssessment.reason).toBeDefined();
      expect(result.data.floodRiskAssessment.reason.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // isFloodProne Tests
  // ============================================

  describe('isFloodProne', () => {
    it('should return flood prone status for low elevation', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          results: [
            { latitude: 29.7604, longitude: -95.3698, elevation: 12.3 },
            { latitude: 29.7704, longitude: -95.3698, elevation: 15.0 },
            { latitude: 29.7504, longitude: -95.3698, elevation: 10.5 },
            { latitude: 29.7604, longitude: -95.3798, elevation: 14.2 },
            { latitude: 29.7604, longitude: -95.3598, elevation: 11.8 },
          ],
        })
      );

      const result = await service.isFloodProne(29.7604, -95.3698);

      expect(result).toBeDefined();
      expect(result.data.floodProne).toBeDefined();
      expect(result.data.risk).toMatch(/^(low|moderate|high)$/);
      expect(result.data.elevation).toBe(12.3);
    });

    it('should return not flood prone for high elevation', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          results: [
            { latitude: 39.7392, longitude: -104.9903, elevation: 1609.0 },
            { latitude: 39.7492, longitude: -104.9903, elevation: 1620.0 },
            { latitude: 39.7292, longitude: -104.9903, elevation: 1598.0 },
            { latitude: 39.7392, longitude: -105.0003, elevation: 1615.0 },
            { latitude: 39.7392, longitude: -104.9803, elevation: 1603.0 },
          ],
        })
      );

      const result = await service.isFloodProne(39.7392, -104.9903);

      expect(result.data.floodProne).toBe(false);
      expect(result.data.risk).toBe('low');
    });

    it('should always check surrounding elevations', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockMultiplePointsResponse)
      );

      await service.isFloodProne(40.5186, -78.3947);

      // Should request 5 points (center + 4 cardinal directions)
      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain('%7C'); // URL-encoded pipe character
    });
  });

  // ============================================
  // Singleton Pattern Tests
  // ============================================

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getElevationService();
      const instance2 = getElevationService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getElevationService();
      resetElevationService();
      const instance2 = getElevationService();

      expect(instance1).not.toBe(instance2);
    });

    it('should accept config on first call only', () => {
      const instance1 = getElevationService({
        cacheConfig: { enabled: false },
      });
      const instance2 = getElevationService({
        cacheConfig: { enabled: true },
      });

      expect(instance1).toBe(instance2);
    });

    it('should use fresh config after reset', () => {
      getElevationService({ cacheConfig: { enabled: false } });
      resetElevationService();
      const newInstance = getElevationService({ cacheConfig: { enabled: true } });

      expect(newInstance).toBeDefined();
    });
  });

  // ============================================
  // Edge Cases and Boundary Conditions
  // ============================================

  describe('edge cases', () => {
    it('should handle boundary coordinates - North Pole', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          results: [{ latitude: 90, longitude: 0, elevation: 0 }],
        })
      );

      await expect(service.getElevation(90, 0))
        .resolves
        .toBeDefined();
    });

    it('should handle boundary coordinates - South Pole', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          results: [{ latitude: -90, longitude: 0, elevation: 2800 }],
        })
      );

      await expect(service.getElevation(-90, 0))
        .resolves
        .toBeDefined();
    });

    it('should handle boundary coordinates - International Date Line', async () => {
      fetchMock
        .mockResolvedValueOnce(
          createMockResponse({
            results: [{ latitude: 0, longitude: 180, elevation: 0 }],
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            results: [{ latitude: 0, longitude: -180, elevation: 0 }],
          })
        );

      await expect(service.getElevation(0, 180))
        .resolves
        .toBeDefined();

      await expect(service.getElevation(0, -180))
        .resolves
        .toBeDefined();
    });

    it('should handle coordinates at equator and prime meridian', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          results: [{ latitude: 0, longitude: 0, elevation: 0 }],
        })
      );

      await expect(service.getElevation(0, 0))
        .resolves
        .toBeDefined();
    });

    it('should handle very high elevations (Mt. Everest)', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          results: [{ latitude: 27.9881, longitude: 86.9250, elevation: 8849 }],
        })
      );

      const result = await service.getElevation(27.9881, 86.9250);

      expect(result.data.elevation).toBe(8849);
      expect(result.data.elevationFeet).toBeGreaterThan(29000);
    });

    it('should handle very low elevations (Dead Sea)', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          results: [{ latitude: 31.5, longitude: 35.5, elevation: -430 }],
        })
      );

      const result = await service.getElevation(31.5, 35.5);

      expect(result.data.elevation).toBe(-430);
      expect(result.data.elevationFeet).toBeLessThan(-1400);
    });

    it('should handle zero elevation (sea level)', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          results: [{ latitude: 40.7128, longitude: -74.0060, elevation: 0 }],
        })
      );

      const result = await service.getElevation(40.7128, -74.0060);

      expect(result.data.elevation).toBe(0);
      expect(result.data.elevationFeet).toBe(0);
    });
  });
});
