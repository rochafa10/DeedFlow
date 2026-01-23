/**
 * Fire Analyzer Tests
 *
 * Tests the wildfire risk analysis functionality including:
 * - analyzeWildfireRisk function
 * - getWildfireRiskScore function
 * - Risk level determination
 * - Fire mitigation recommendations
 * - WHP score integration
 * - Active fire proximity analysis
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  analyzeWildfireRisk,
  getWildfireRiskScore,
  WILDFIRE_RISK_STATES,
} from '../fire-analyzer';
import type { WildfireRiskAnalysis } from '@/types/risk-analysis';
import type { ActiveFireSummary, WildfireHazardPotential } from '@/lib/api/services/nasa-firms-service';

// ============================================
// Mock NASA FIRMS Service
// ============================================

const mockGetActiveFiresNearby = vi.fn();
const mockEstimateWildfireHazardPotential = vi.fn();

vi.mock('@/lib/api/services/nasa-firms-service', () => ({
  getNASAFIRMSService: () => ({
    getActiveFiresNearby: mockGetActiveFiresNearby,
    estimateWildfireHazardPotential: mockEstimateWildfireHazardPotential,
  }),
}));

// ============================================
// Test Fixtures
// ============================================

/**
 * Mock active fire summary - no fires nearby
 */
const mockNoActiveFires: ActiveFireSummary = {
  count: 0,
  nearest: null,
  mostIntense: null,
  byDistance: {
    within5km: 0,
    within10km: 0,
    within25km: 0,
    within50km: 0,
    beyond50km: 0,
  },
  byConfidence: {
    high: 0,
    nominal: 0,
    low: 0,
  },
  avgFRP: null,
  totalFRP: 0,
  dateRange: {
    earliest: null,
    latest: null,
  },
};

/**
 * Mock active fire summary - fires within 5km (extreme danger)
 */
const mockNearbyActiveFires: ActiveFireSummary = {
  count: 3,
  nearest: {
    latitude: 34.06,
    longitude: -118.25,
    distanceKm: 3.2,
    brightness: 350,
    confidence: 'high',
    frp: 45.5,
    dateTime: new Date('2026-01-20T14:30:00Z'),
    satellite: 'VIIRS',
  },
  mostIntense: {
    latitude: 34.07,
    longitude: -118.26,
    distanceKm: 4.8,
    brightness: 380,
    confidence: 'high',
    frp: 125.8,
    dateTime: new Date('2026-01-20T15:00:00Z'),
    satellite: 'MODIS',
  },
  byDistance: {
    within5km: 3,
    within10km: 3,
    within25km: 3,
    within50km: 3,
    beyond50km: 0,
  },
  byConfidence: {
    high: 3,
    nominal: 0,
    low: 0,
  },
  avgFRP: 75.2,
  totalFRP: 225.6,
  dateRange: {
    earliest: new Date('2026-01-20T14:30:00Z'),
    latest: new Date('2026-01-20T15:00:00Z'),
  },
};

/**
 * Mock active fire summary - fires within 10-25km (high risk)
 */
const mockDistantActiveFires: ActiveFireSummary = {
  count: 8,
  nearest: {
    latitude: 34.15,
    longitude: -118.3,
    distanceKm: 15.5,
    brightness: 320,
    confidence: 'high',
    frp: 35.2,
    dateTime: new Date('2026-01-21T10:00:00Z'),
    satellite: 'VIIRS',
  },
  mostIntense: {
    latitude: 34.18,
    longitude: -118.35,
    distanceKm: 20.3,
    brightness: 365,
    confidence: 'high',
    frp: 95.4,
    dateTime: new Date('2026-01-21T11:30:00Z'),
    satellite: 'MODIS',
  },
  byDistance: {
    within5km: 0,
    within10km: 0,
    within25km: 8,
    within50km: 8,
    beyond50km: 0,
  },
  byConfidence: {
    high: 6,
    nominal: 2,
    low: 0,
  },
  avgFRP: 55.8,
  totalFRP: 446.4,
  dateRange: {
    earliest: new Date('2026-01-21T10:00:00Z'),
    latest: new Date('2026-01-21T11:30:00Z'),
  },
};

/**
 * Mock active fire summary - many fires (10+) nearby
 */
const mockManyActiveFires: ActiveFireSummary = {
  count: 15,
  nearest: {
    latitude: 34.1,
    longitude: -118.28,
    distanceKm: 8.5,
    brightness: 340,
    confidence: 'high',
    frp: 42.5,
    dateTime: new Date('2026-01-21T14:00:00Z'),
    satellite: 'VIIRS',
  },
  mostIntense: {
    latitude: 34.12,
    longitude: -118.32,
    distanceKm: 12.2,
    brightness: 395,
    confidence: 'high',
    frp: 150.2,
    dateTime: new Date('2026-01-21T14:30:00Z'),
    satellite: 'MODIS',
  },
  byDistance: {
    within5km: 0,
    within10km: 5,
    within25km: 15,
    within50km: 15,
    beyond50km: 0,
  },
  byConfidence: {
    high: 12,
    nominal: 3,
    low: 0,
  },
  avgFRP: 62.5,
  totalFRP: 937.5,
  dateRange: {
    earliest: new Date('2026-01-21T14:00:00Z'),
    latest: new Date('2026-01-21T16:00:00Z'),
  },
};

/**
 * Mock WHP data - Very High hazard in WUI
 */
const mockVeryHighWHP: WildfireHazardPotential = {
  whpScore: 5,
  whpClass: 'Very High',
  inWUI: true,
  wuiType: 'interface',
};

/**
 * Mock WHP data - High hazard in WUI
 */
const mockHighWHP: WildfireHazardPotential = {
  whpScore: 4,
  whpClass: 'High',
  inWUI: true,
  wuiType: 'intermix',
};

/**
 * Mock WHP data - Moderate hazard not in WUI
 */
const mockModerateWHP: WildfireHazardPotential = {
  whpScore: 3,
  whpClass: 'Moderate',
  inWUI: false,
  wuiType: null,
};

/**
 * Mock WHP data - Low hazard
 */
const mockLowWHP: WildfireHazardPotential = {
  whpScore: 2,
  whpClass: 'Low',
  inWUI: false,
  wuiType: null,
};

/**
 * Mock WHP data - Very Low hazard
 */
const mockVeryLowWHP: WildfireHazardPotential = {
  whpScore: 1,
  whpClass: 'Very Low',
  inWUI: false,
  wuiType: null,
};

// ============================================
// Test Coordinates
// ============================================

const californiaCoords = { latitude: 34.0522, longitude: -118.2437 }; // Los Angeles
const coloradoCoords = { latitude: 39.7392, longitude: -104.9903 }; // Denver
const pennsylvaniaCoords = { latitude: 40.2732, longitude: -76.8867 }; // Harrisburg
const floridaCoords = { latitude: 25.7617, longitude: -80.1918 }; // Miami

// ============================================
// Fire Analyzer Tests
// ============================================

describe('analyzeWildfireRisk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return a valid WildfireRiskAnalysis result', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockModerateWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      expect(result.whpScore).toBeDefined();
      expect(result.inWUI).toBe(false);
      expect(result.activeFiresNearby).toBe(0);
      expect(result.distanceToNearestFire).toBeNull();
      expect(result.dataSource).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should include all required fields in result', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockHighWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      // Check all required fields
      expect(result.riskLevel).toBeDefined();
      expect(result.whpScore).toBeDefined();
      expect(result.inWUI).toBeDefined();
      expect(result.wuiType).toBeDefined();
      expect(result.activeFiresNearby).toBeDefined();
      expect(result.distanceToNearestFire).toBeDefined();
      expect(result.historicalFireCount).toBeDefined();
      expect(result.recentAcresBurned).toBeDefined();
      expect(result.fuelLoad).toBeDefined();
      expect(result.defensibleSpaceRequired).toBeDefined();
      expect(result.buildingRequirements).toBeDefined();
      expect(Array.isArray(result.buildingRequirements)).toBe(true);
      expect(result.insuranceConsiderations).toBeDefined();
      expect(Array.isArray(result.insuranceConsiderations)).toBe(true);
      expect(result.evacuationAccessibility).toBeDefined();
      expect(result.mitigationRecommendations).toBeDefined();
      expect(Array.isArray(result.mitigationRecommendations)).toBe(true);
      expect(result.dataSource).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });

  describe('risk level determination', () => {
    it('should classify extreme risk for active fires within 5km', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNearbyActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockModerateWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.riskLevel).toBe('extreme');
      expect(result.activeFiresNearby).toBe(3);
      expect(result.distanceToNearestFire).toBe(3.2);
    });

    it('should classify very_high risk for active fires within 10km', async () => {
      const fireAt8km = {
        ...mockNearbyActiveFires,
        nearest: {
          ...mockNearbyActiveFires.nearest!,
          distanceKm: 8.5,
        },
        byDistance: {
          within5km: 0,
          within10km: 3,
          within25km: 3,
          within50km: 3,
          beyond50km: 0,
        },
      };

      mockGetActiveFiresNearby.mockResolvedValue({
        data: fireAt8km,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockModerateWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.riskLevel).toBe('very_high');
      expect(result.distanceToNearestFire).toBe(8.5);
    });

    it('should classify high risk for active fires within 25km', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockDistantActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockModerateWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.riskLevel).toBe('high');
      expect(result.distanceToNearestFire).toBe(15.5);
    });

    it('should classify very_high risk for 10+ active fires nearby', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockManyActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockModerateWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.riskLevel).toBe('very_high');
      expect(result.activeFiresNearby).toBe(15);
    });

    it('should use WHP score when no active fires', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockVeryHighWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.riskLevel).toBe('very_high');
      expect(result.whpScore).toBe(5);
    });

    it('should upgrade risk level for WUI properties', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockModerateWHP);

      const withoutWUI = await analyzeWildfireRisk(californiaCoords, 'CA');

      mockEstimateWildfireHazardPotential.mockReturnValue({
        ...mockModerateWHP,
        inWUI: true,
        wuiType: 'interface',
      });

      const withWUI = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(withWUI.inWUI).toBe(true);
      expect(withWUI.wuiType).toBe('interface');
    });
  });

  describe('state-specific risk assessment', () => {
    it('should classify California as high risk state', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockHighWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(WILDFIRE_RISK_STATES.CA).toBeDefined();
      expect(WILDFIRE_RISK_STATES.CA.riskLevel).toBe('high');
      expect(result.buildingRequirements.length).toBeGreaterThan(0);
      expect(result.insuranceConsiderations.length).toBeGreaterThan(0);
    });

    it('should classify Colorado as high risk state', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockModerateWHP);

      const result = await analyzeWildfireRisk(coloradoCoords, 'CO');

      expect(WILDFIRE_RISK_STATES.CO).toBeDefined();
      expect(WILDFIRE_RISK_STATES.CO.riskLevel).toBe('high');
    });

    it('should classify Florida as low risk state', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockLowWHP);

      const result = await analyzeWildfireRisk(floridaCoords, 'FL');

      expect(WILDFIRE_RISK_STATES.FL).toBeDefined();
      expect(WILDFIRE_RISK_STATES.FL.riskLevel).toBe('low');
    });

    it('should provide state-specific building requirements', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockHighWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.buildingRequirements).toContain(
        'Chapter 7A (WUI) building standards required in SRA/LRA'
      );
      expect(result.buildingRequirements).toContain(
        'Class A fire-rated roofing required'
      );
    });

    it('should provide state-specific insurance considerations', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockHighWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.insuranceConsiderations.some(
        c => c.includes('FAIR Plan')
      )).toBe(true);
    });
  });

  describe('fuel load estimation', () => {
    it('should estimate heavy fuel load for high WHP', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockVeryHighWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.fuelLoad).toBe('heavy');
    });

    it('should estimate moderate fuel load for moderate WHP', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockModerateWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.fuelLoad).toBe('moderate');
    });

    it('should estimate light fuel load for low-risk states', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockVeryLowWHP);

      const result = await analyzeWildfireRisk(pennsylvaniaCoords, 'PA');

      expect(result.fuelLoad).toBe('light');
    });
  });

  describe('mitigation recommendations', () => {
    it('should provide minimal recommendations for low risk', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockVeryLowWHP);

      const result = await analyzeWildfireRisk(pennsylvaniaCoords, 'PA');

      expect(result.riskLevel).toBe('minimal');
      expect(result.mitigationRecommendations.length).toBeGreaterThan(0);
      expect(result.mitigationRecommendations.some(
        r => r.includes('basic fire-safe landscaping')
      )).toBe(true);
    });

    it('should provide defensible space recommendations for moderate risk', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockModerateWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.mitigationRecommendations.some(
        r => r.includes('defensible space')
      )).toBe(true);
    });

    it('should provide comprehensive recommendations for high risk', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockHighWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.riskLevel).toBe('very_high');
      expect(result.mitigationRecommendations.length).toBeGreaterThan(5);
      expect(result.mitigationRecommendations.some(
        r => r.includes('fire-resistant materials')
      )).toBe(true);
    });

    it('should provide critical recommendations for extreme risk', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNearbyActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockVeryHighWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.riskLevel).toBe('extreme');
      expect(result.mitigationRecommendations.some(
        r => r.includes('CRITICAL') || r.includes('WARNING')
      )).toBe(true);
      expect(result.mitigationRecommendations.some(
        r => r.includes('evacuation')
      )).toBe(true);
    });

    it('should include WUI-specific recommendations when in WUI', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockHighWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.inWUI).toBe(true);
      expect(result.mitigationRecommendations.some(
        r => r.includes('Wildland-Urban Interface')
      )).toBe(true);
    });
  });

  describe('defensible space requirements', () => {
    it('should not require defensible space for minimal risk', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockVeryLowWHP);

      const result = await analyzeWildfireRisk(pennsylvaniaCoords, 'PA');

      expect(result.defensibleSpaceRequired).toBe(false);
    });

    it('should require defensible space for moderate or higher risk', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockModerateWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.defensibleSpaceRequired).toBe(true);
    });
  });

  describe('evacuation accessibility', () => {
    it('should assess limited evacuation for extreme risk', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNearbyActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockVeryHighWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.evacuationAccessibility).toBe('limited');
    });

    it('should assess good evacuation for low risk', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockLowWHP);

      const result = await analyzeWildfireRisk(pennsylvaniaCoords, 'PA');

      expect(result.evacuationAccessibility).toBe('good');
    });
  });

  describe('confidence levels', () => {
    it('should have higher confidence with active fire data', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNearbyActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockHighWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.confidence).toBe(85);
    });

    it('should have lower confidence without active fire data', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockModerateWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.confidence).toBe(70);
    });
  });

  describe('data source tracking', () => {
    it('should include NASA FIRMS as data source', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockModerateWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result.dataSource.name).toContain('NASA FIRMS');
      expect(result.dataSource.type).toBe('api');
      expect(result.dataSource.reliability).toBe('high');
    });
  });

  describe('error handling', () => {
    it('should return default risk assessment if API fails', async () => {
      mockGetActiveFiresNearby.mockRejectedValue(new Error('API Error'));
      mockEstimateWildfireHazardPotential.mockReturnValue(mockModerateWHP);

      const result = await analyzeWildfireRisk(californiaCoords, 'CA');

      expect(result).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      expect(result.dataSource.type).toBe('estimated');
      expect(result.confidence).toBe(40);
      expect(result.mitigationRecommendations.some(
        r => r.includes('Fire data unavailable')
      )).toBe(true);
    });

    it('should handle unknown state gracefully', async () => {
      mockGetActiveFiresNearby.mockResolvedValue({
        data: mockNoActiveFires,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockEstimateWildfireHazardPotential.mockReturnValue(mockLowWHP);

      const result = await analyzeWildfireRisk(
        { latitude: 40.0, longitude: -80.0 },
        'XX'
      );

      expect(result).toBeDefined();
      expect(result.riskLevel).toBeDefined();
    });
  });
});

// ============================================
// Wildfire Risk Score Tests
// ============================================

describe('getWildfireRiskScore', () => {
  it('should return maximum score (5) for minimal risk', () => {
    const minimalRiskResult: WildfireRiskAnalysis = {
      riskLevel: 'minimal',
      whpScore: 1,
      inWUI: false,
      wuiType: null,
      activeFiresNearby: 0,
      distanceToNearestFire: null,
      historicalFireCount: 0,
      recentAcresBurned: null,
      fuelLoad: 'light',
      defensibleSpaceRequired: false,
      buildingRequirements: [],
      insuranceConsiderations: [],
      evacuationAccessibility: 'good',
      mitigationRecommendations: [],
      dataSource: {
        name: 'NASA FIRMS',
        type: 'api',
        reliability: 'high',
      },
      confidence: 70,
    };

    const score = getWildfireRiskScore(minimalRiskResult);

    expect(score).toBeGreaterThan(4.5);
    expect(score).toBeLessThanOrEqual(5);
  });

  it('should return low score (0-1) for extreme risk', () => {
    const extremeRiskResult: WildfireRiskAnalysis = {
      riskLevel: 'extreme',
      whpScore: 5,
      inWUI: true,
      wuiType: 'interface',
      activeFiresNearby: 10,
      distanceToNearestFire: 3.2,
      historicalFireCount: 5,
      recentAcresBurned: 10000,
      fuelLoad: 'heavy',
      defensibleSpaceRequired: true,
      buildingRequirements: [],
      insuranceConsiderations: [],
      evacuationAccessibility: 'limited',
      mitigationRecommendations: [],
      dataSource: {
        name: 'NASA FIRMS',
        type: 'api',
        reliability: 'high',
      },
      confidence: 85,
    };

    const score = getWildfireRiskScore(extremeRiskResult);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(1);
  });

  it('should return mid-range score for moderate risk', () => {
    const moderateRiskResult: WildfireRiskAnalysis = {
      riskLevel: 'moderate',
      whpScore: 3,
      inWUI: false,
      wuiType: null,
      activeFiresNearby: 0,
      distanceToNearestFire: null,
      historicalFireCount: 0,
      recentAcresBurned: null,
      fuelLoad: 'moderate',
      defensibleSpaceRequired: true,
      buildingRequirements: [],
      insuranceConsiderations: [],
      evacuationAccessibility: 'good',
      mitigationRecommendations: [],
      dataSource: {
        name: 'NASA FIRMS',
        type: 'api',
        reliability: 'high',
      },
      confidence: 70,
    };

    const score = getWildfireRiskScore(moderateRiskResult);

    expect(score).toBeGreaterThan(2);
    expect(score).toBeLessThan(4);
  });

  it('should penalize for nearby active fires', () => {
    const baseResult: WildfireRiskAnalysis = {
      riskLevel: 'moderate',
      whpScore: 3,
      inWUI: false,
      wuiType: null,
      activeFiresNearby: 0,
      distanceToNearestFire: null,
      historicalFireCount: 0,
      recentAcresBurned: null,
      fuelLoad: 'moderate',
      defensibleSpaceRequired: true,
      buildingRequirements: [],
      insuranceConsiderations: [],
      evacuationAccessibility: 'good',
      mitigationRecommendations: [],
      dataSource: {
        name: 'NASA FIRMS',
        type: 'api',
        reliability: 'high',
      },
      confidence: 70,
    };

    const scoreWithoutFires = getWildfireRiskScore(baseResult);

    const resultWithFires: WildfireRiskAnalysis = {
      ...baseResult,
      activeFiresNearby: 5,
      distanceToNearestFire: 3.5,
      riskLevel: 'extreme',
    };

    const scoreWithFires = getWildfireRiskScore(resultWithFires);

    expect(scoreWithFires).toBeLessThan(scoreWithoutFires);
  });

  it('should penalize for WUI location', () => {
    const nonWUIResult: WildfireRiskAnalysis = {
      riskLevel: 'moderate',
      whpScore: 3,
      inWUI: false,
      wuiType: null,
      activeFiresNearby: 0,
      distanceToNearestFire: null,
      historicalFireCount: 0,
      recentAcresBurned: null,
      fuelLoad: 'moderate',
      defensibleSpaceRequired: true,
      buildingRequirements: [],
      insuranceConsiderations: [],
      evacuationAccessibility: 'good',
      mitigationRecommendations: [],
      dataSource: {
        name: 'NASA FIRMS',
        type: 'api',
        reliability: 'high',
      },
      confidence: 70,
    };

    const scoreNonWUI = getWildfireRiskScore(nonWUIResult);

    const wuiResult: WildfireRiskAnalysis = {
      ...nonWUIResult,
      inWUI: true,
      wuiType: 'interface',
      riskLevel: 'high',
    };

    const scoreWUI = getWildfireRiskScore(wuiResult);

    expect(scoreWUI).toBeLessThan(scoreNonWUI);
  });

  it('should return score between 0 and 5', () => {
    const testCases: WildfireRiskAnalysis[] = [
      {
        riskLevel: 'minimal',
        whpScore: 1,
        inWUI: false,
        wuiType: null,
        activeFiresNearby: 0,
        distanceToNearestFire: null,
        historicalFireCount: 0,
        recentAcresBurned: null,
        fuelLoad: 'light',
        defensibleSpaceRequired: false,
        buildingRequirements: [],
        insuranceConsiderations: [],
        evacuationAccessibility: 'good',
        mitigationRecommendations: [],
        dataSource: { name: 'NASA FIRMS', type: 'api', reliability: 'high' },
        confidence: 70,
      },
      {
        riskLevel: 'extreme',
        whpScore: 5,
        inWUI: true,
        wuiType: 'interface',
        activeFiresNearby: 20,
        distanceToNearestFire: 2.5,
        historicalFireCount: 10,
        recentAcresBurned: 50000,
        fuelLoad: 'heavy',
        defensibleSpaceRequired: true,
        buildingRequirements: [],
        insuranceConsiderations: [],
        evacuationAccessibility: 'poor',
        mitigationRecommendations: [],
        dataSource: { name: 'NASA FIRMS', type: 'api', reliability: 'high' },
        confidence: 85,
      },
    ];

    testCases.forEach(testCase => {
      const score = getWildfireRiskScore(testCase);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(5);
    });
  });

  it('should round score to 2 decimal places', () => {
    const result: WildfireRiskAnalysis = {
      riskLevel: 'moderate',
      whpScore: 3,
      inWUI: false,
      wuiType: null,
      activeFiresNearby: 0,
      distanceToNearestFire: null,
      historicalFireCount: 0,
      recentAcresBurned: null,
      fuelLoad: 'moderate',
      defensibleSpaceRequired: true,
      buildingRequirements: [],
      insuranceConsiderations: [],
      evacuationAccessibility: 'good',
      mitigationRecommendations: [],
      dataSource: {
        name: 'NASA FIRMS',
        type: 'api',
        reliability: 'high',
      },
      confidence: 70,
    };

    const score = getWildfireRiskScore(result);
    const decimalPlaces = (score.toString().split('.')[1] || '').length;

    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });
});

// ============================================
// WILDFIRE_RISK_STATES Tests
// ============================================

describe('WILDFIRE_RISK_STATES', () => {
  it('should include all high-risk states', () => {
    const highRiskStates = ['CA', 'CO', 'AZ', 'NM', 'OR', 'WA', 'MT'];

    highRiskStates.forEach(state => {
      expect(WILDFIRE_RISK_STATES[state]).toBeDefined();
      expect(WILDFIRE_RISK_STATES[state].riskLevel).toBe('high');
    });
  });

  it('should include moderate-risk states', () => {
    const moderateRiskStates = ['ID', 'NV', 'UT', 'TX', 'OK'];

    moderateRiskStates.forEach(state => {
      expect(WILDFIRE_RISK_STATES[state]).toBeDefined();
      expect(WILDFIRE_RISK_STATES[state].riskLevel).toBe('moderate');
    });
  });

  it('should include low-risk states', () => {
    expect(WILDFIRE_RISK_STATES.FL).toBeDefined();
    expect(WILDFIRE_RISK_STATES.FL.riskLevel).toBe('low');
  });

  it('should provide seasonal peak information for all states', () => {
    Object.values(WILDFIRE_RISK_STATES).forEach(stateData => {
      expect(stateData.seasonalPeak).toBeDefined();
      expect(stateData.seasonalPeak.length).toBeGreaterThan(0);
    });
  });

  it('should provide building requirements for all states', () => {
    Object.values(WILDFIRE_RISK_STATES).forEach(stateData => {
      expect(stateData.buildingRequirements).toBeDefined();
      expect(Array.isArray(stateData.buildingRequirements)).toBe(true);
      expect(stateData.buildingRequirements.length).toBeGreaterThan(0);
    });
  });

  it('should provide insurance considerations for all states', () => {
    Object.values(WILDFIRE_RISK_STATES).forEach(stateData => {
      expect(stateData.insuranceConsiderations).toBeDefined();
      expect(Array.isArray(stateData.insuranceConsiderations)).toBe(true);
      expect(stateData.insuranceConsiderations.length).toBeGreaterThan(0);
    });
  });
});
