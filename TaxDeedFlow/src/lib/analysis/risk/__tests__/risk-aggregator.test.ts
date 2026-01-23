/**
 * Risk Aggregator Tests
 *
 * Comprehensive tests for the risk aggregation engine:
 * - Full aggregation pipeline from multiple API sources
 * - Individual risk fetcher functions (8 risk types)
 * - Score calculation and weighting system
 * - State-specific weight adjustments
 * - Insurance estimation logic
 * - Recommendation and mitigation generation
 * - Error handling and timeout scenarios
 * - Data availability and confidence tracking
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-23
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  RiskAssessment,
  FloodRiskAnalysis,
  EarthquakeRiskAnalysis,
  WildfireRiskAnalysis,
} from '@/types/risk-analysis';

// Mock service modules
const mockFEMAService = {
  getFloodZone: vi.fn(),
};

const mockUSGSService = {
  getSeismicHazard: vi.fn(),
};

const mockNASAFIRMSService = {
  getActiveFiresNearby: vi.fn(),
};

const mockEPAService = {
  getEnvironmentalSitesNearby: vi.fn(),
  getRadonZone: vi.fn(),
};

const mockElevationService = {
  getElevationAnalysis: vi.fn(),
};

const mockNOAAService = {
  getClimateRiskAssessment: vi.fn(),
};

vi.mock('@/lib/api/services/fema-service', () => ({
  getFEMAService: () => mockFEMAService,
}));

vi.mock('@/lib/api/services/usgs-service', () => ({
  getUSGSService: () => mockUSGSService,
}));

vi.mock('@/lib/api/services/nasa-firms-service', () => ({
  getNASAFIRMSService: () => mockNASAFIRMSService,
}));

vi.mock('@/lib/api/services/epa-service', () => ({
  getEPAService: () => mockEPAService,
}));

vi.mock('@/lib/api/services/elevation-service', () => ({
  getElevationService: () => mockElevationService,
}));

vi.mock('@/lib/api/services/noaa-service', () => ({
  getNOAAService: () => mockNOAAService,
}));

// Import after mocking
import {
  aggregateRiskData,
  type RiskAggregationInput,
  type RiskAggregationOptions,
} from '../risk-aggregator';

// ============================================
// Mock Data Fixtures
// ============================================

const mockCoordinates = {
  lat: 40.5186,
  lng: -78.3947,
};

const mockPAInput: RiskAggregationInput = {
  coordinates: mockCoordinates,
  state: 'PA',
  county: 'Blair',
  propertyValue: 150000,
  buildingSqft: 1500,
};

const mockFLInput: RiskAggregationInput = {
  coordinates: { lat: 28.5383, lng: -81.3792 },
  state: 'FL',
  county: 'Orange',
  propertyValue: 250000,
  buildingSqft: 2000,
};

const mockCAInput: RiskAggregationInput = {
  coordinates: { lat: 34.0522, lng: -118.2437 },
  state: 'CA',
  county: 'Los Angeles',
  propertyValue: 500000,
  buildingSqft: 2500,
};

// ============================================
// Helper Functions
// ============================================

function setupDefaultMocks() {
  mockFEMAService.getFloodZone.mockResolvedValue({
    success: true,
    data: {
      floodZone: 'X',
      description: 'Minimal flood hazard',
      bfe: null,
    },
  });

  mockUSGSService.getSeismicHazard.mockResolvedValue({
    success: true,
    data: {
      pga: 0.05,
      ss: 0.1,
      s1: 0.05,
      seismicDesignCategory: 'A',
    },
  });

  mockNASAFIRMSService.getActiveFiresNearby.mockResolvedValue({
    success: true,
    data: {
      count: 0,
      nearest: null,
    },
  });

  mockEPAService.getEnvironmentalSitesNearby.mockResolvedValue({
    success: true,
    data: {
      superfundSites: [],
      brownfieldSites: [],
      ustSites: [],
      triFacilities: [],
    },
  });

  mockEPAService.getRadonZone.mockResolvedValue({
    success: true,
    data: {
      radonZone: 2,
      predictedLevel: null,
    },
  });

  mockElevationService.getElevationAnalysis.mockResolvedValue({
    success: true,
    data: {
      terrain: {
        averageSlope: 5,
        maxSlope: 8,
        slopeDirection: 'S',
      },
    },
  });

  mockNOAAService.getClimateRiskAssessment.mockResolvedValue(null);
}

function setupHighRiskMocks() {
  mockFEMAService.getFloodZone.mockResolvedValue({
    success: true,
    data: {
      floodZone: 'AE',
      description: 'High-risk with BFE determined',
      bfe: 100,
    },
  });

  mockUSGSService.getSeismicHazard.mockResolvedValue({
    success: true,
    data: {
      pga: 0.5,
      ss: 0.8,
      s1: 0.6,
      seismicDesignCategory: 'E',
    },
  });

  mockNASAFIRMSService.getActiveFiresNearby.mockResolvedValue({
    success: true,
    data: {
      count: 15,
      nearest: {
        distanceKm: 10,
      },
    },
  });

  mockEPAService.getEnvironmentalSitesNearby.mockResolvedValue({
    success: true,
    data: {
      superfundSites: [{ name: 'Test Site' }],
      brownfieldSites: [],
      ustSites: [],
      triFacilities: [],
    },
  });

  mockEPAService.getRadonZone.mockResolvedValue({
    success: true,
    data: {
      radonZone: 1,
      predictedLevel: 8.5,
    },
  });

  mockElevationService.getElevationAnalysis.mockResolvedValue({
    success: true,
    data: {
      terrain: {
        averageSlope: 35,
        maxSlope: 45,
        slopeDirection: 'N',
      },
    },
  });
}

// ============================================
// End-to-End Aggregation Tests
// ============================================

describe('End-to-End Risk Aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe('complete aggregation flow', () => {
    it('should complete full aggregation for low-risk Pennsylvania property', async () => {
      const result = await aggregateRiskData(mockPAInput);

      expect(result).toBeDefined();
      expect(result.overallRisk).toMatch(/^(low|moderate|high|severe)$/);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);

      expect(result.categoryScores).toHaveLength(8);
      expect(result.weightsUsed).toBeDefined();
      expect(result.assessedAt).toBeInstanceOf(Date);

      expect(result.flood).toBeDefined();
      expect(result.earthquake).toBeDefined();
      expect(result.wildfire).toBeDefined();
      expect(result.hurricane).toBeDefined();
      expect(result.sinkhole).toBeDefined();
      expect(result.environmental).toBeDefined();
      expect(result.radon).toBeDefined();
      expect(result.slope).toBeDefined();
    });

    it('should complete full aggregation for high-risk California property', async () => {
      setupHighRiskMocks();

      const result = await aggregateRiskData(mockCAInput);

      expect(result.overallRisk).toMatch(/^(high|severe)$/);
      expect(result.riskScore).toBeGreaterThan(50);

      expect(result.insuranceEstimates).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.mitigationActions).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.topRiskFactors).toBeDefined();
      expect(result.positiveFactors).toBeDefined();
    });

    it('should handle all risk data in parallel', async () => {
      await aggregateRiskData(mockPAInput);

      expect(mockFEMAService.getFloodZone).toHaveBeenCalledTimes(1);
      expect(mockUSGSService.getSeismicHazard).toHaveBeenCalledTimes(1);
      expect(mockNASAFIRMSService.getActiveFiresNearby).toHaveBeenCalledTimes(1);
    });
  });

  describe('score calculation accuracy', () => {
    it('should correctly calculate overall risk score from weighted category scores', async () => {
      const result = await aggregateRiskData(mockPAInput);

      const manualTotal = result.categoryScores.reduce(
        (sum, score) => sum + score.weightedScore,
        0
      );

      const totalWeight = Object.values(result.weightsUsed).reduce((a, b) => a + b, 0);
      const expectedScore = Math.round(manualTotal / totalWeight);

      expect(Math.abs(result.riskScore - expectedScore)).toBeLessThanOrEqual(1);
    });

    it('should maintain score bounds (0-100)', async () => {
      const result = await aggregateRiskData(mockPAInput);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);

      result.categoryScores.forEach(categoryScore => {
        expect(categoryScore.rawScore).toBeGreaterThanOrEqual(0);
        expect(categoryScore.rawScore).toBeLessThanOrEqual(100);
        expect(categoryScore.weightedScore).toBeGreaterThanOrEqual(0);
        expect(categoryScore.weightedScore).toBeLessThanOrEqual(100);
      });
    });

    it('should correctly determine overall risk level', async () => {
      setupHighRiskMocks();

      const result = await aggregateRiskData(mockFLInput);

      if (result.riskScore >= 70) {
        expect(result.overallRisk).toBe('severe');
      } else if (result.riskScore >= 50) {
        expect(result.overallRisk).toBe('high');
      } else if (result.riskScore >= 30) {
        expect(result.overallRisk).toBe('moderate');
      } else {
        expect(result.overallRisk).toBe('low');
      }
    });

    it('should calculate confidence level based on data availability', async () => {
      const result = await aggregateRiskData(mockPAInput);

      expect(result.confidenceLevel).toBeGreaterThan(0);
      expect(result.confidenceLevel).toBeLessThanOrEqual(100);

      const hasFullData = result.categoryScores.some(s => s.dataAvailability === 'full');
      if (hasFullData) {
        expect(result.confidenceLevel).toBeGreaterThan(50);
      }
    });
  });
});

// ============================================
// State-Specific Weight Adjustment Tests
// ============================================

describe('State-Specific Weight Adjustments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('should apply Florida-specific weights (hurricane + flood heavy)', async () => {
    const result = await aggregateRiskData(mockFLInput);

    expect(result.weightsUsed.hurricane).toBeGreaterThan(0.20);
    expect(result.weightsUsed.flood).toBeGreaterThan(0.15);
    expect(result.weightsUsed.sinkhole).toBeGreaterThan(0.10);
    expect(result.weightsUsed.earthquake).toBeLessThan(0.10);
  });

  it('should apply California-specific weights (earthquake + wildfire heavy)', async () => {
    const result = await aggregateRiskData(mockCAInput);

    expect(result.weightsUsed.earthquake).toBeGreaterThan(0.20);
    expect(result.weightsUsed.wildfire).toBeGreaterThan(0.20);
    expect(result.weightsUsed.hurricane).toBeLessThan(0.10);
  });

  it('should apply Pennsylvania-specific weights (radon + environmental heavy)', async () => {
    const result = await aggregateRiskData(mockPAInput);

    expect(result.weightsUsed.radon).toBeGreaterThan(0.15);
    expect(result.weightsUsed.environmental).toBeGreaterThan(0.10);
    expect(result.weightsUsed.flood).toBeGreaterThan(0.15);
  });

  it('should normalize weights to sum to 1.0', async () => {
    const result = await aggregateRiskData(mockPAInput);

    const totalWeight = Object.values(result.weightsUsed).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBeCloseTo(1.0, 2);
  });

  it('should apply different weights for different states', async () => {
    const paResult = await aggregateRiskData(mockPAInput);
    const flResult = await aggregateRiskData(mockFLInput);
    const caResult = await aggregateRiskData(mockCAInput);

    expect(paResult.weightsUsed).not.toEqual(flResult.weightsUsed);
    expect(flResult.weightsUsed).not.toEqual(caResult.weightsUsed);
    expect(caResult.weightsUsed).not.toEqual(paResult.weightsUsed);
  });
});

// ============================================
// Individual Risk Fetcher Tests
// ============================================

describe('Individual Risk Fetchers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe('flood risk fetcher', () => {
    it('should fetch and map flood zone data', async () => {
      const result = await aggregateRiskData(mockPAInput);

      expect(result.flood).toBeDefined();
      expect(result.flood?.zone).toBe('X');
      expect(result.flood?.riskLevel).toBe('minimal');
      expect(result.flood?.insuranceRequired).toBe(false);
    });

    it('should handle high-risk flood zones', async () => {
      mockFEMAService.getFloodZone.mockResolvedValue({
        success: true,
        data: {
          floodZone: 'AE',
          description: 'High-risk with BFE',
          bfe: 100,
        },
      });

      const result = await aggregateRiskData(mockPAInput);

      expect(result.flood?.zone).toBe('AE');
      expect(result.flood?.riskLevel).toBe('high');
      expect(result.flood?.insuranceRequired).toBe(true);
      expect(result.flood?.annualPremiumEstimate).toBeGreaterThan(0);
    });

    it('should create default flood risk on API failure', async () => {
      mockFEMAService.getFloodZone.mockRejectedValue(new Error('API Error'));

      const result = await aggregateRiskData(mockPAInput);

      expect(result.flood).toBeDefined();
      expect(result.flood?.confidence).toBeLessThan(50);
    });
  });

  describe('earthquake risk fetcher', () => {
    it('should fetch and map earthquake hazard data', async () => {
      const result = await aggregateRiskData(mockPAInput);

      expect(result.earthquake).toBeDefined();
      expect(result.earthquake?.hazardLevel).toBe('very_low'); // PGA 0.05 maps to very_low
      expect(result.earthquake?.pga).toBe(0.05);
      expect(result.earthquake?.seismicDesignCategory).toBe('A');
    });

    it('should handle high seismic hazard areas', async () => {
      mockUSGSService.getSeismicHazard.mockResolvedValue({
        success: true,
        data: {
          pga: 0.5,
          ss: 0.8,
          s1: 0.6,
          seismicDesignCategory: 'E',
        },
      });

      const result = await aggregateRiskData(mockCAInput);

      expect(result.earthquake?.hazardLevel).toBe('high'); // PGA 0.5 maps to high (0.4-0.6)
      expect(result.earthquake?.pga).toBeGreaterThan(0.4);
      expect(result.earthquake?.seismicDesignCategory).toMatch(/^[D-F]$/);
    });
  });

  describe('wildfire risk fetcher', () => {
    it('should fetch and map wildfire data', async () => {
      const result = await aggregateRiskData(mockPAInput);

      expect(result.wildfire).toBeDefined();
      expect(result.wildfire?.activeFiresNearby).toBe(0);
    });

    it('should handle extreme wildfire risk', async () => {
      mockNASAFIRMSService.getActiveFiresNearby.mockResolvedValue({
        success: true,
        data: {
          count: 15,
          nearest: { distanceKm: 10 },
        },
      });

      const result = await aggregateRiskData(mockCAInput);

      expect(result.wildfire?.activeFiresNearby).toBeGreaterThan(10);
    });
  });

  describe('environmental risk fetcher', () => {
    it('should recommend Phase I ESA for Superfund sites', async () => {
      mockEPAService.getEnvironmentalSitesNearby.mockResolvedValue({
        success: true,
        data: {
          superfundSites: [{ name: 'Test Site' }],
          brownfieldSites: [],
          ustSites: [],
          triFacilities: [],
        },
      });

      const result = await aggregateRiskData(mockPAInput);

      expect(result.environmental?.phaseIRecommended).toBe(true);
      expect(result.environmental?.superfundSitesNearby).toBeGreaterThan(0);
    });
  });

  describe('radon risk fetcher', () => {
    it('should fetch radon zone data', async () => {
      const result = await aggregateRiskData(mockPAInput);

      expect(result.radon).toBeDefined();
      expect(result.radon?.radonZone).toBeGreaterThanOrEqual(1);
      expect(result.radon?.radonZone).toBeLessThanOrEqual(3);
    });

    it('should recommend testing for high-risk zones', async () => {
      mockEPAService.getRadonZone.mockResolvedValue({
        success: true,
        data: {
          radonZone: 1,
          predictedLevel: 8.5,
        },
      });

      const result = await aggregateRiskData(mockPAInput);

      expect(result.radon?.radonZone).toBe(1);
      expect(result.radon?.testingRecommended).toBe(true);
    });
  });

  describe('slope risk fetcher', () => {
    it('should fetch slope stability data', async () => {
      const result = await aggregateRiskData(mockPAInput);

      expect(result.slope).toBeDefined();
      expect(result.slope?.stabilityLevel).toBeDefined();
      expect(result.slope?.slopePercentage).toBeGreaterThanOrEqual(0);
    });

    it('should identify unstable slopes', async () => {
      mockElevationService.getElevationAnalysis.mockResolvedValue({
        success: true,
        data: {
          terrain: {
            averageSlope: 35,
            maxSlope: 45,
            slopeDirection: 'N',
          },
        },
      });

      const result = await aggregateRiskData(mockPAInput);

      expect(result.slope?.stabilityLevel).toMatch(/^(unstable|highly_unstable)$/);
      expect(result.slope?.inLandslideZone).toBe(true);
    });
  });
});

// ============================================
// Insurance Estimation Tests
// ============================================

describe('Insurance Estimation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHighRiskMocks();
  });

  it('should calculate flood insurance for SFHA zones', async () => {
    const result = await aggregateRiskData(mockFLInput);

    expect(result.insuranceEstimates.floodInsurance).toBeGreaterThan(0);
    expect(result.insuranceEstimates.totalAnnualCost).toBeGreaterThan(0);
  });

  it('should calculate earthquake insurance for high-risk areas', async () => {
    const result = await aggregateRiskData(mockCAInput);

    expect(result.insuranceEstimates.earthquakeInsurance).toBeGreaterThan(0);
  });

  it('should calculate wildfire insurance for extreme risk areas', async () => {
    const result = await aggregateRiskData(mockCAInput);

    expect(result.insuranceEstimates.fireInsurance).toBeGreaterThan(0);
  });

  it('should calculate total annual insurance cost correctly', async () => {
    const result = await aggregateRiskData(mockCAInput);

    const manualTotal =
      (result.insuranceEstimates.floodInsurance || 0) +
      (result.insuranceEstimates.earthquakeInsurance || 0) +
      (result.insuranceEstimates.fireInsurance || 0) +
      (result.insuranceEstimates.windstormInsurance || 0);

    expect(result.insuranceEstimates.totalAnnualCost).toBe(manualTotal);
  });
});

// ============================================
// Recommendations and Mitigations Tests
// ============================================

describe('Recommendations and Mitigations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHighRiskMocks();
  });

  it('should generate recommendations for high-risk properties', async () => {
    const result = await aggregateRiskData(mockCAInput);

    expect(result.recommendations).toBeDefined();
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should prioritize mitigation actions', async () => {
    const result = await aggregateRiskData(mockCAInput);

    expect(result.mitigationActions).toBeDefined();
    expect(result.mitigationActions.length).toBeGreaterThan(0);

    for (let i = 0; i < result.mitigationActions.length - 1; i++) {
      expect(result.mitigationActions[i].priority).toBeLessThanOrEqual(
        result.mitigationActions[i + 1].priority
      );
    }
  });

  it('should include cost estimates for mitigation actions', async () => {
    const result = await aggregateRiskData(mockFLInput);

    result.mitigationActions.forEach(action => {
      expect(action.estimatedCost).toBeDefined();
      expect(action.estimatedCost.min).toBeGreaterThan(0);
      expect(action.estimatedCost.max).toBeGreaterThanOrEqual(action.estimatedCost.min);
    });
  });

  it('should identify top risk factors', async () => {
    const result = await aggregateRiskData(mockCAInput);

    expect(result.topRiskFactors).toBeDefined();
    expect(result.topRiskFactors.length).toBeGreaterThan(0);
    // May return more than 3 factors for very high-risk properties
    expect(result.topRiskFactors.length).toBeLessThanOrEqual(10);
  });

  it('should generate warnings for critical risks', async () => {
    const result = await aggregateRiskData(mockCAInput);

    expect(result.warnings).toBeDefined();
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ============================================
// Skip Options Tests
// ============================================

describe('Skip Options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('should skip flood assessment when requested', async () => {
    const options: RiskAggregationOptions = {
      skip: { flood: true },
    };

    const result = await aggregateRiskData(mockPAInput, options);

    expect(mockFEMAService.getFloodZone).not.toHaveBeenCalled();
    expect(result.flood).toBeNull();
  });

  it('should skip multiple assessments when requested', async () => {
    const options: RiskAggregationOptions = {
      skip: { flood: true, earthquake: true, wildfire: true },
    };

    const result = await aggregateRiskData(mockPAInput, options);

    expect(mockFEMAService.getFloodZone).not.toHaveBeenCalled();
    expect(mockUSGSService.getSeismicHazard).not.toHaveBeenCalled();
    expect(mockNASAFIRMSService.getActiveFiresNearby).not.toHaveBeenCalled();

    expect(result.flood).toBeNull();
    expect(result.earthquake).toBeNull();
    expect(result.wildfire).toBeNull();
  });

  it('should still complete aggregation with skipped assessments', async () => {
    const options: RiskAggregationOptions = {
      skip: { flood: true, wildfire: true },
    };

    const result = await aggregateRiskData(mockPAInput, options);

    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.overallRisk).toBeDefined();
  });
});

// ============================================
// Error Handling Tests
// ============================================

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('should handle API errors gracefully', async () => {
    mockFEMAService.getFloodZone.mockRejectedValue(new Error('API Error'));

    const result = await aggregateRiskData(mockPAInput);

    expect(result).toBeDefined();
    expect(result.flood).toBeDefined();
    expect(result.flood?.confidence).toBeLessThan(50);
  });

  it('should continue aggregation despite individual failures', async () => {
    mockFEMAService.getFloodZone.mockRejectedValue(new Error('Flood API Error'));
    mockUSGSService.getSeismicHazard.mockRejectedValue(new Error('USGS API Error'));

    const result = await aggregateRiskData(mockPAInput);

    expect(result).toBeDefined();
    expect(result.overallRisk).toBeDefined();
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
  });

  it('should handle missing property value gracefully', async () => {
    const input: RiskAggregationInput = {
      coordinates: mockCoordinates,
      state: 'PA',
    };

    const result = await aggregateRiskData(input);

    expect(result).toBeDefined();
    expect(result.insuranceEstimates).toBeDefined();
  });
});

// ============================================
// Performance Tests
// ============================================

describe('Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('should complete aggregation in reasonable time', async () => {
    const startTime = Date.now();

    await aggregateRiskData(mockPAInput);

    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(2000);
  });

  it('should handle multiple parallel requests efficiently', async () => {
    const startTime = Date.now();

    await Promise.all([
      aggregateRiskData(mockPAInput),
      aggregateRiskData(mockFLInput),
      aggregateRiskData(mockCAInput),
    ]);

    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(3000);
  });
});
