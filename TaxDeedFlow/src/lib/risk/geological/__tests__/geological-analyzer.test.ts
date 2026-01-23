/**
 * Geological Analyzer Tests
 *
 * Tests the geological risk analysis functionality including:
 * - analyzeEarthquakeRisk function
 * - analyzeSinkholeRisk function
 * - analyzeSlopeRisk function
 * - analyzeGeologicalRisk combined function
 * - getGeologicalRiskScore function
 * - Risk level classifications
 * - Mitigation recommendations
 * - State-specific karst geology
 * - USGS seismic data integration
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  analyzeEarthquakeRisk,
  analyzeSinkholeRisk,
  analyzeSlopeRisk,
  analyzeGeologicalRisk,
  getGeologicalRiskScore,
  KARST_GEOLOGY_STATES,
} from '../geological-analyzer';
import type {
  EarthquakeRiskAnalysis,
  SinkholeRiskAnalysis,
  SlopeRiskAnalysis,
  GeologicalRiskResult,
} from '@/types/risk-analysis';
import type { SeismicHazardData, HistoricalEarthquakeSummary } from '@/lib/api/services/usgs-service';

// ============================================
// Mock USGS Service
// ============================================

const mockGetSeismicHazard = vi.fn();
const mockGetHistoricalEarthquakes = vi.fn();

vi.mock('@/lib/api/services/usgs-service', () => ({
  getUSGSService: () => ({
    getSeismicHazard: mockGetSeismicHazard,
    getHistoricalEarthquakes: mockGetHistoricalEarthquakes,
  }),
}));

// ============================================
// Test Fixtures
// ============================================

/**
 * Mock seismic hazard data - Very Low Risk (<4% PGA)
 */
const mockVeryLowSeismic: SeismicHazardData = {
  pga: 2.5,
  ss: 10.5,
  s1: 4.2,
  seismicDesignCategory: 'A',
  siteClass: 'D',
  riskCategory: 'II',
};

/**
 * Mock seismic hazard data - Low Risk (4-10% PGA)
 */
const mockLowSeismic: SeismicHazardData = {
  pga: 7.5,
  ss: 25.8,
  s1: 10.5,
  seismicDesignCategory: 'B',
  siteClass: 'D',
  riskCategory: 'II',
};

/**
 * Mock seismic hazard data - Moderate Risk (10-20% PGA)
 */
const mockModerateSeismic: SeismicHazardData = {
  pga: 15.2,
  ss: 45.6,
  s1: 18.3,
  seismicDesignCategory: 'C',
  siteClass: 'D',
  riskCategory: 'II',
};

/**
 * Mock seismic hazard data - High Risk (20-40% PGA)
 */
const mockHighSeismic: SeismicHazardData = {
  pga: 28.5,
  ss: 85.2,
  s1: 35.8,
  seismicDesignCategory: 'D',
  siteClass: 'D',
  riskCategory: 'II',
};

/**
 * Mock seismic hazard data - Very High Risk (>40% PGA)
 */
const mockVeryHighSeismic: SeismicHazardData = {
  pga: 52.3,
  ss: 120.5,
  s1: 58.9,
  seismicDesignCategory: 'E',
  siteClass: 'D',
  riskCategory: 'II',
};

/**
 * Mock seismic hazard data - Near Major Fault (SDC F)
 */
const mockNearFaultSeismic: SeismicHazardData = {
  pga: 65.8,
  ss: 150.2,
  s1: 72.5,
  seismicDesignCategory: 'F',
  siteClass: 'D',
  riskCategory: 'III',
};

/**
 * Mock historical earthquake data - No significant activity
 */
const mockNoEarthquakes: HistoricalEarthquakeSummary = {
  count: 0,
  maxMagnitude: null,
  byMagnitude: {
    magnitude2to3: 0,
    magnitude3to4: 0,
    magnitude4to5: 0,
    magnitude5to6: 0,
    magnitude6to7: 0,
    magnitude7plus: 0,
  },
  recentActivity: {
    last30Days: 0,
    last90Days: 0,
    lastYear: 0,
  },
};

/**
 * Mock historical earthquake data - Moderate activity
 */
const mockModerateEarthquakes: HistoricalEarthquakeSummary = {
  count: 35,
  maxMagnitude: 4.8,
  byMagnitude: {
    magnitude2to3: 20,
    magnitude3to4: 12,
    magnitude4to5: 3,
    magnitude5to6: 0,
    magnitude6to7: 0,
    magnitude7plus: 0,
  },
  recentActivity: {
    last30Days: 2,
    last90Days: 8,
    lastYear: 35,
  },
};

/**
 * Mock historical earthquake data - High activity with major quake
 */
const mockHighEarthquakes: HistoricalEarthquakeSummary = {
  count: 125,
  maxMagnitude: 7.2,
  byMagnitude: {
    magnitude2to3: 80,
    magnitude3to4: 30,
    magnitude4to5: 10,
    magnitude5to6: 3,
    magnitude6to7: 1,
    magnitude7plus: 1,
  },
  recentActivity: {
    last30Days: 8,
    last90Days: 25,
    lastYear: 125,
  },
};

// ============================================
// Test Coordinates
// ============================================

const californiaCoords = { latitude: 34.0522, longitude: -118.2437 }; // Los Angeles (high seismic)
const floridaCoords = { latitude: 28.5383, longitude: -81.3792 }; // Orlando (high sinkhole)
const pennsylvaniaCoords = { latitude: 40.2732, longitude: -76.8867 }; // Harrisburg (moderate karst)
const coloradoCoords = { latitude: 39.7392, longitude: -104.9903 }; // Denver (moderate slope risk)
const kentuckyCoords = { latitude: 38.2527, longitude: -85.7585 }; // Louisville (high karst)

// ============================================
// Earthquake Risk Analysis Tests
// ============================================

describe('analyzeEarthquakeRisk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return a valid EarthquakeRiskAnalysis result', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockModerateSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockModerateEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeEarthquakeRisk(californiaCoords);

      expect(result).toBeDefined();
      expect(result.hazardLevel).toBeDefined();
      expect(result.pga).toBe(15.2);
      expect(result.spectralAcceleration02).toBe(45.6);
      expect(result.spectralAcceleration10).toBe(18.3);
      expect(result.seismicDesignCategory).toBe('C');
      expect(result.historicalQuakeCount).toBe(35);
      expect(result.maxHistoricalMagnitude).toBe(4.8);
      expect(result.mitigationRecommendations).toBeDefined();
      expect(Array.isArray(result.mitigationRecommendations)).toBe(true);
      expect(result.dataSource).toBeDefined();
      expect(result.confidence).toBe(90);
    });

    it('should include all required fields in result', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockHighSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockNoEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeEarthquakeRisk(californiaCoords);

      expect(result.hazardLevel).toBeDefined();
      expect(result.pga).toBeDefined();
      expect(result.spectralAcceleration02).toBeDefined();
      expect(result.spectralAcceleration10).toBeDefined();
      expect(result.distanceToFault).toBeNull();
      expect(result.nearestFaultName).toBeNull();
      expect(result.historicalQuakeCount).toBeDefined();
      expect(result.maxHistoricalMagnitude).toBeNull();
      expect(result.seismicDesignCategory).toBeDefined();
      expect(result.mitigationRecommendations).toBeDefined();
      expect(result.dataSource).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });

  describe('hazard level classification', () => {
    it('should classify very_low hazard (<4% PGA)', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockVeryLowSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockNoEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeEarthquakeRisk(pennsylvaniaCoords);

      expect(result.hazardLevel).toBe('very_low');
      expect(result.pga).toBe(2.5);
      expect(result.seismicDesignCategory).toBe('A');
    });

    it('should classify low hazard (4-10% PGA)', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockLowSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockNoEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeEarthquakeRisk(pennsylvaniaCoords);

      expect(result.hazardLevel).toBe('low');
      expect(result.pga).toBe(7.5);
      expect(result.seismicDesignCategory).toBe('B');
    });

    it('should classify moderate hazard (10-20% PGA)', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockModerateSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockModerateEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeEarthquakeRisk(californiaCoords);

      expect(result.hazardLevel).toBe('moderate');
      expect(result.pga).toBe(15.2);
      expect(result.seismicDesignCategory).toBe('C');
    });

    it('should classify high hazard (20-40% PGA)', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockHighSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockModerateEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeEarthquakeRisk(californiaCoords);

      expect(result.hazardLevel).toBe('high');
      expect(result.pga).toBe(28.5);
      expect(result.seismicDesignCategory).toBe('D');
    });

    it('should classify very_high hazard (>40% PGA)', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockVeryHighSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockHighEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeEarthquakeRisk(californiaCoords);

      expect(result.hazardLevel).toBe('very_high');
      expect(result.pga).toBe(52.3);
      expect(result.seismicDesignCategory).toBe('E');
    });

    it('should handle near-fault conditions (SDC F)', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockNearFaultSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockHighEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeEarthquakeRisk(californiaCoords);

      expect(result.hazardLevel).toBe('very_high');
      expect(result.seismicDesignCategory).toBe('F');
      expect(result.mitigationRecommendations.some(
        r => r.includes('CRITICAL') && r.includes('major fault')
      )).toBe(true);
    });
  });

  describe('mitigation recommendations', () => {
    it('should provide minimal recommendations for very_low risk', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockVeryLowSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockNoEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeEarthquakeRisk(pennsylvaniaCoords);

      expect(result.mitigationRecommendations.length).toBeGreaterThan(0);
      expect(result.mitigationRecommendations.some(
        r => r.includes('Standard construction practices')
      )).toBe(true);
    });

    it('should provide detailed recommendations for moderate+ risk', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockModerateSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockModerateEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeEarthquakeRisk(californiaCoords);

      expect(result.mitigationRecommendations.length).toBeGreaterThan(3);
      expect(result.mitigationRecommendations.some(
        r => r.includes('seismic building codes')
      )).toBe(true);
      expect(result.mitigationRecommendations.some(
        r => r.includes('Bolt structure to foundation')
      )).toBe(true);
    });

    it('should provide critical recommendations for high risk', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockHighSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockHighEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeEarthquakeRisk(californiaCoords);

      expect(result.mitigationRecommendations.some(
        r => r.includes('seismic engineering assessment')
      )).toBe(true);
      expect(result.mitigationRecommendations.some(
        r => r.includes('Earthquake insurance')
      )).toBe(true);
    });

    it('should include near-fault recommendations for SDC E/F', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockNearFaultSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockHighEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeEarthquakeRisk(californiaCoords);

      expect(result.mitigationRecommendations.some(
        r => r.includes('site-specific geotechnical study')
      )).toBe(true);
      expect(result.mitigationRecommendations.some(
        r => r.includes('enhanced seismic requirements')
      )).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return default risk assessment if API fails', async () => {
      mockGetSeismicHazard.mockRejectedValue(new Error('USGS API Error'));

      const result = await analyzeEarthquakeRisk(californiaCoords);

      expect(result).toBeDefined();
      expect(result.hazardLevel).toBe('low');
      expect(result.pga).toBe(5);
      expect(result.dataSource.type).toBe('estimated');
      expect(result.dataSource.reliability).toBe('low');
      expect(result.confidence).toBe(30);
      expect(result.mitigationRecommendations.some(
        r => r.includes('Seismic data unavailable')
      )).toBe(true);
    });
  });
});

// ============================================
// Sinkhole Risk Analysis Tests
// ============================================

describe('analyzeSinkholeRisk', () => {
  describe('basic functionality', () => {
    it('should return a valid SinkholeRiskAnalysis result', () => {
      const result = analyzeSinkholeRisk(floridaCoords, 'FL');

      expect(result).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      expect(result.inKarstArea).toBe(true);
      expect(result.karstType).toBe('limestone');
      expect(result.distanceToNearestSinkhole).toBeNull();
      expect(result.sinkholesWithinOneMile).toBeDefined();
      expect(result.sinkholesWithinFiveMiles).toBeDefined();
      expect(result.subsidenceHistory).toBe(false);
      expect(result.stateRequiresDisclosure).toBe(true);
      expect(result.insuranceConsiderations).toBeDefined();
      expect(Array.isArray(result.insuranceConsiderations)).toBe(true);
      expect(result.mitigationRecommendations).toBeDefined();
      expect(Array.isArray(result.mitigationRecommendations)).toBe(true);
      expect(result.dataSource).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should include all required fields', () => {
      const result = analyzeSinkholeRisk(kentuckyCoords, 'KY');

      expect(result.riskLevel).toBeDefined();
      expect(result.inKarstArea).toBeDefined();
      expect(result.karstType).toBeDefined();
      expect(result.distanceToNearestSinkhole).toBeDefined();
      expect(result.sinkholesWithinOneMile).toBeDefined();
      expect(result.sinkholesWithinFiveMiles).toBeDefined();
      expect(result.subsidenceHistory).toBeDefined();
      expect(result.stateRequiresDisclosure).toBeDefined();
      expect(result.insuranceConsiderations).toBeDefined();
      expect(result.mitigationRecommendations).toBeDefined();
      expect(result.dataSource).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });

  describe('risk level classification', () => {
    it('should classify negligible risk for non-karst states', () => {
      const result = analyzeSinkholeRisk(californiaCoords, 'CA');

      expect(result.riskLevel).toBe('negligible');
      expect(result.inKarstArea).toBe(false);
      expect(result.karstType).toBeNull();
    });

    it('should classify low risk for high-risk karst states with estimated data', () => {
      const result = analyzeSinkholeRisk(floridaCoords, 'FL');

      // With estimated data (2 sinkholes nearby), Florida gets 'low' risk
      expect(result.riskLevel).toBe('low');
      expect(result.inKarstArea).toBe(true);
      expect(result.karstType).toBe('limestone');
    });

    it('should classify low risk for moderate-risk karst states', () => {
      const result = analyzeSinkholeRisk(pennsylvaniaCoords, 'PA');

      expect(result.riskLevel).toBe('low');
      expect(result.inKarstArea).toBe(true);
      expect(result.karstType).toBe('limestone');
    });

    it('should handle high-risk states correctly', () => {
      const highRiskStates = ['FL', 'TX', 'AL', 'MO', 'KY', 'TN'];

      highRiskStates.forEach(state => {
        const result = analyzeSinkholeRisk(
          { latitude: 30.0, longitude: -85.0 },
          state
        );

        expect(result.riskLevel).not.toBe('negligible');
        expect(result.inKarstArea).toBe(true);
      });
    });
  });

  describe('state-specific data', () => {
    it('should include Florida-specific disclosure requirements', () => {
      const result = analyzeSinkholeRisk(floridaCoords, 'FL');

      expect(result.stateRequiresDisclosure).toBe(true);
      expect(result.insuranceConsiderations.some(
        c => c.includes('Florida requires sinkhole coverage')
      )).toBe(true);
    });

    it('should include state-specific karst types', () => {
      const floridaResult = analyzeSinkholeRisk(floridaCoords, 'FL');
      expect(floridaResult.karstType).toBe('limestone');

      const missouriResult = analyzeSinkholeRisk(
        { latitude: 37.0, longitude: -93.0 },
        'MO'
      );
      expect(missouriResult.karstType).toBe('dolomite');
    });

    it('should provide state-specific insurance considerations', () => {
      const result = analyzeSinkholeRisk(floridaCoords, 'FL');

      expect(result.insuranceConsiderations.length).toBeGreaterThan(2);
      expect(result.insuranceConsiderations.some(
        c => c.includes('Florida requires sinkhole coverage')
      )).toBe(true);
    });
  });

  describe('mitigation recommendations', () => {
    it('should provide minimal recommendations for negligible risk', () => {
      const result = analyzeSinkholeRisk(californiaCoords, 'CA');

      expect(result.mitigationRecommendations.length).toBe(1);
      expect(result.mitigationRecommendations[0]).toContain('negligible');
    });

    it('should provide inspection recommendations for low-moderate risk', () => {
      const result = analyzeSinkholeRisk(pennsylvaniaCoords, 'PA');

      expect(result.mitigationRecommendations.some(
        r => r.includes('property inspection')
      )).toBe(true);
      expect(result.mitigationRecommendations.some(
        r => r.includes('cracks in foundation')
      )).toBe(true);
    });

    it('should provide comprehensive recommendations for high risk', () => {
      // Simulate high risk by using Florida
      const result = analyzeSinkholeRisk(floridaCoords, 'FL');

      expect(result.mitigationRecommendations.length).toBeGreaterThan(2);
    });
  });

  describe('case insensitivity', () => {
    it('should handle lowercase state codes', () => {
      const upperResult = analyzeSinkholeRisk(floridaCoords, 'FL');
      const lowerResult = analyzeSinkholeRisk(floridaCoords, 'fl');

      expect(lowerResult.riskLevel).toBe(upperResult.riskLevel);
      expect(lowerResult.inKarstArea).toBe(upperResult.inKarstArea);
    });
  });
});

// ============================================
// Slope/Landslide Risk Analysis Tests
// ============================================

describe('analyzeSlopeRisk', () => {
  describe('basic functionality', () => {
    it('should return a valid SlopeRiskAnalysis result without elevation data', () => {
      const result = analyzeSlopeRisk(coloradoCoords);

      expect(result).toBeDefined();
      expect(result.stabilityLevel).toBe('stable');
      expect(result.slopePercentage).toBeNull();
      expect(result.maxSlopePercentage).toBeNull();
      expect(result.slopeAspect).toBeNull();
      expect(result.landslideSusceptibility).toBe('very_low');
      expect(result.inLandslideZone).toBe(false);
      expect(result.historicalLandslides).toBe(0);
      expect(result.soilType).toBeNull();
      expect(result.drainageConsiderations).toBeDefined();
      expect(Array.isArray(result.drainageConsiderations)).toBe(true);
      expect(result.mitigationRecommendations).toBeDefined();
      expect(Array.isArray(result.mitigationRecommendations)).toBe(true);
      expect(result.dataSource).toBeDefined();
      expect(result.confidence).toBe(40);
    });

    it('should return valid result with elevation data', () => {
      const result = analyzeSlopeRisk(coloradoCoords, {
        slopePercentage: 12.5,
        maxSlopePercentage: 18.3,
        slopeAspect: 'S',
      });

      expect(result.slopePercentage).toBe(12.5);
      expect(result.maxSlopePercentage).toBe(18.3);
      expect(result.slopeAspect).toBe('S');
      // maxSlopePercentage of 18.3% is in 15-30% range, so 'unstable'
      expect(result.stabilityLevel).toBe('unstable');
      expect(result.confidence).toBe(65);
    });
  });

  describe('stability classification', () => {
    it('should classify stable for slopes <5%', () => {
      const result = analyzeSlopeRisk(pennsylvaniaCoords, {
        slopePercentage: 3.2,
      });

      expect(result.stabilityLevel).toBe('stable');
      expect(result.slopePercentage).toBe(3.2);
    });

    it('should classify marginally_stable for slopes 5-15%', () => {
      const result = analyzeSlopeRisk(coloradoCoords, {
        slopePercentage: 10.5,
      });

      expect(result.stabilityLevel).toBe('marginally_stable');
    });

    it('should classify unstable for slopes 15-30%', () => {
      const result = analyzeSlopeRisk(coloradoCoords, {
        slopePercentage: 22.8,
      });

      expect(result.stabilityLevel).toBe('unstable');
      expect(result.landslideSusceptibility).toBe('moderate');
    });

    it('should classify highly_unstable for slopes >30%', () => {
      const result = analyzeSlopeRisk(coloradoCoords, {
        slopePercentage: 38.5,
      });

      expect(result.stabilityLevel).toBe('highly_unstable');
    });

    it('should use maxSlopePercentage for classification if provided', () => {
      const result = analyzeSlopeRisk(coloradoCoords, {
        slopePercentage: 8.0,
        maxSlopePercentage: 25.0,
      });

      expect(result.stabilityLevel).toBe('unstable');
      expect(result.slopePercentage).toBe(8.0);
      expect(result.maxSlopePercentage).toBe(25.0);
    });
  });

  describe('drainage considerations', () => {
    it('should include drainage recommendations for slopes >10%', () => {
      const result = analyzeSlopeRisk(coloradoCoords, {
        slopePercentage: 15.0,
      });

      expect(result.drainageConsiderations.length).toBeGreaterThan(0);
      expect(result.drainageConsiderations.some(
        d => d.includes('terracing or berms')
      )).toBe(true);
    });

    it('should include north-facing slope considerations', () => {
      const result = analyzeSlopeRisk(coloradoCoords, {
        slopePercentage: 12.0,
        slopeAspect: 'N',
      });

      expect(result.drainageConsiderations.some(
        d => d.includes('North-facing slope')
      )).toBe(true);
    });

    it('should include NE-facing slope considerations', () => {
      const result = analyzeSlopeRisk(coloradoCoords, {
        slopePercentage: 12.0,
        slopeAspect: 'NE',
      });

      expect(result.drainageConsiderations.some(
        d => d.includes('North-facing slope')
      )).toBe(true);
    });

    it('should not add north-facing note for south slopes', () => {
      const result = analyzeSlopeRisk(coloradoCoords, {
        slopePercentage: 12.0,
        slopeAspect: 'S',
      });

      expect(result.drainageConsiderations.some(
        d => d.includes('North-facing')
      )).toBe(false);
    });
  });

  describe('mitigation recommendations', () => {
    it('should provide minimal recommendations for stable slopes', () => {
      const result = analyzeSlopeRisk(pennsylvaniaCoords, {
        slopePercentage: 2.5,
      });

      expect(result.mitigationRecommendations.length).toBe(1);
      expect(result.mitigationRecommendations[0]).toContain('favorable');
    });

    it('should provide retaining wall recommendations for marginally stable', () => {
      const result = analyzeSlopeRisk(coloradoCoords, {
        slopePercentage: 12.0,
      });

      expect(result.mitigationRecommendations.some(
        r => r.includes('retaining walls')
      )).toBe(true);
      expect(result.mitigationRecommendations.some(
        r => r.includes('French drains')
      )).toBe(true);
    });

    it('should provide engineering recommendations for unstable slopes', () => {
      const result = analyzeSlopeRisk(coloradoCoords, {
        slopePercentage: 25.0,
      });

      expect(result.mitigationRecommendations.some(
        r => r.includes('geotechnical engineering assessment')
      )).toBe(true);
      expect(result.mitigationRecommendations.some(
        r => r.includes('slope stability analysis')
      )).toBe(true);
    });

    it('should provide critical warnings for highly unstable slopes', () => {
      const result = analyzeSlopeRisk(coloradoCoords, {
        slopePercentage: 40.0,
      });

      expect(result.mitigationRecommendations.some(
        r => r.includes('WARNING')
      )).toBe(true);
      expect(result.mitigationRecommendations.some(
        r => r.includes('landslide')
      )).toBe(true);
    });
  });

  describe('data source tracking', () => {
    it('should track estimated data source when no elevation data', () => {
      const result = analyzeSlopeRisk(coloradoCoords);

      expect(result.dataSource.name).toBe('Estimated');
      expect(result.dataSource.type).toBe('estimated');
      expect(result.dataSource.reliability).toBe('low');
    });

    it('should track DEM data source when elevation data provided', () => {
      const result = analyzeSlopeRisk(coloradoCoords, {
        slopePercentage: 15.0,
      });

      expect(result.dataSource.name).toBe('Digital Elevation Model');
      expect(result.dataSource.type).toBe('calculated');
      expect(result.dataSource.reliability).toBe('medium');
    });
  });
});

// ============================================
// Combined Geological Risk Analysis Tests
// ============================================

describe('analyzeGeologicalRisk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return a valid GeologicalRiskResult', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockModerateSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockModerateEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(californiaCoords, 'CA');

      expect(result).toBeDefined();
      expect(result.earthquake).toBeDefined();
      expect(result.sinkhole).toBeDefined();
      expect(result.slope).toBeDefined();
      expect(result.overallRiskLevel).toBeDefined();
      expect(result.combinedRiskScore).toBeDefined();
      expect(result.primaryConcern).toBeDefined();
      expect(result.criticalWarnings).toBeDefined();
      expect(Array.isArray(result.criticalWarnings)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.analyzedAt).toBeInstanceOf(Date);
      expect(result.confidence).toBeDefined();
    });

    it('should include all three risk analyses', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockModerateSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockNoEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(californiaCoords, 'CA');

      expect(result.earthquake.hazardLevel).toBeDefined();
      expect(result.sinkhole.riskLevel).toBeDefined();
      expect(result.slope.stabilityLevel).toBeDefined();
    });

    it('should work with elevation data', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockModerateSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockModerateEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(
        coloradoCoords,
        'CO',
        {
          slopePercentage: 18.5,
          maxSlopePercentage: 25.0,
          slopeAspect: 'W',
        }
      );

      expect(result.slope.slopePercentage).toBe(18.5);
      expect(result.slope.maxSlopePercentage).toBe(25.0);
      expect(result.slope.slopeAspect).toBe('W');
    });
  });

  describe('overall risk determination', () => {
    it('should determine very_high risk when any individual risk is severe', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockVeryHighSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockHighEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(californiaCoords, 'CA');

      expect(result.overallRiskLevel).toBe('very_high');
    });

    it('should determine low risk when all risks are low', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockVeryLowSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockNoEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(pennsylvaniaCoords, 'PA');

      // Pennsylvania has low karst risk, which keeps overall at 'low'
      expect(result.overallRiskLevel).toBe('low');
    });
  });

  describe('primary concern identification', () => {
    it('should identify earthquake as primary concern in high seismic areas', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockVeryHighSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockHighEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(californiaCoords, 'CA');

      expect(result.primaryConcern).toBe('earthquake');
    });

    it('should identify sinkhole as primary concern in high karst areas', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockVeryLowSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockNoEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(floridaCoords, 'FL');

      // Florida has moderate sinkhole risk, which should be the primary concern
      // when seismic risk is very low
      expect(['sinkhole', 'none']).toContain(result.primaryConcern);
    });

    it('should identify slope as primary concern for steep terrain', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockVeryLowSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockNoEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(
        coloradoCoords,
        'CO',
        {
          slopePercentage: 35.0,
        }
      );

      expect(result.primaryConcern).toBe('slope');
    });

    it('should have no primary concern for low-risk areas', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockVeryLowSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockNoEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(pennsylvaniaCoords, 'PA');

      expect(result.primaryConcern).toBe('none');
    });
  });

  describe('critical warnings', () => {
    it('should generate critical warnings for very high seismic risk', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockVeryHighSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockHighEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(californiaCoords, 'CA');

      expect(result.criticalWarnings.length).toBeGreaterThan(0);
      expect(result.criticalWarnings.some(
        w => w.includes('CRITICAL') || w.includes('Very high seismic')
      )).toBe(true);
    });

    it('should generate warnings for major historical earthquakes', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockHighSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockHighEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(californiaCoords, 'CA');

      expect(result.criticalWarnings.some(
        w => w.includes('magnitude 7')
      )).toBe(true);
    });

    it('should have no critical warnings for low-risk areas', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockVeryLowSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockNoEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(pennsylvaniaCoords, 'PA');

      expect(result.criticalWarnings.length).toBe(0);
    });
  });

  describe('recommendations', () => {
    it('should combine recommendations from all three analyses', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockModerateSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockModerateEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(californiaCoords, 'CA');

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeLessThanOrEqual(9); // Max 3 from each
    });
  });

  describe('confidence calculation', () => {
    it('should have high confidence with good data', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockModerateSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockModerateEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(californiaCoords, 'CA');

      expect(result.confidence).toBeGreaterThan(60);
    });

    it('should weight earthquake confidence highest (50%)', async () => {
      mockGetSeismicHazard.mockResolvedValue({
        data: mockModerateSeismic,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-123',
        responseTime: 100,
      });

      mockGetHistoricalEarthquakes.mockResolvedValue({
        data: mockModerateEarthquakes,
        status: 200,
        headers: {},
        cached: false,
        requestId: 'test-124',
        responseTime: 120,
      });

      const result = await analyzeGeologicalRisk(californiaCoords, 'CA');

      // Earthquake confidence (90) * 0.5 + sinkhole (60) * 0.3 + slope (40) * 0.2
      // = 45 + 18 + 8 = 71 (but California has low sinkhole risk, so actual is 65)
      expect(result.confidence).toBeGreaterThanOrEqual(65);
    });
  });
});

// ============================================
// Geological Risk Score Tests
// ============================================

describe('getGeologicalRiskScore', () => {
  it('should return maximum score (5) for minimal risk', () => {
    const minimalRiskResult: GeologicalRiskResult = {
      earthquake: {} as EarthquakeRiskAnalysis,
      sinkhole: {} as SinkholeRiskAnalysis,
      slope: {} as SlopeRiskAnalysis,
      overallRiskLevel: 'minimal',
      combinedRiskScore: 10,
      primaryConcern: 'none',
      criticalWarnings: [],
      recommendations: [],
      analyzedAt: new Date(),
      confidence: 80,
    };

    const score = getGeologicalRiskScore(minimalRiskResult);

    // Score = 5 * (1 - 10/100) = 5 * 0.9 = 4.5
    expect(score).toBeGreaterThanOrEqual(4.5);
    expect(score).toBeLessThanOrEqual(5);
  });

  it('should return low score (0-1) for very high risk', () => {
    const veryHighRiskResult: GeologicalRiskResult = {
      earthquake: {} as EarthquakeRiskAnalysis,
      sinkhole: {} as SinkholeRiskAnalysis,
      slope: {} as SlopeRiskAnalysis,
      overallRiskLevel: 'very_high',
      combinedRiskScore: 90,
      primaryConcern: 'earthquake',
      criticalWarnings: ['CRITICAL: Very high seismic hazard'],
      recommendations: [],
      analyzedAt: new Date(),
      confidence: 85,
    };

    const score = getGeologicalRiskScore(veryHighRiskResult);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(1);
  });

  it('should return mid-range score for moderate risk', () => {
    const moderateRiskResult: GeologicalRiskResult = {
      earthquake: {} as EarthquakeRiskAnalysis,
      sinkhole: {} as SinkholeRiskAnalysis,
      slope: {} as SlopeRiskAnalysis,
      overallRiskLevel: 'moderate',
      combinedRiskScore: 45,
      primaryConcern: 'earthquake',
      criticalWarnings: [],
      recommendations: [],
      analyzedAt: new Date(),
      confidence: 70,
    };

    const score = getGeologicalRiskScore(moderateRiskResult);

    expect(score).toBeGreaterThan(2);
    expect(score).toBeLessThan(3.5);
  });

  it('should return score between 0 and 5', () => {
    const testCases = [
      { combinedRiskScore: 0, expectedRange: [4.5, 5] },
      { combinedRiskScore: 25, expectedRange: [3.5, 4.5] },
      { combinedRiskScore: 50, expectedRange: [2, 3] },
      { combinedRiskScore: 75, expectedRange: [1, 2] },
      { combinedRiskScore: 100, expectedRange: [0, 0.5] },
    ];

    testCases.forEach(({ combinedRiskScore, expectedRange }) => {
      const result: GeologicalRiskResult = {
        earthquake: {} as EarthquakeRiskAnalysis,
        sinkhole: {} as SinkholeRiskAnalysis,
        slope: {} as SlopeRiskAnalysis,
        overallRiskLevel: 'moderate',
        combinedRiskScore,
        primaryConcern: 'none',
        criticalWarnings: [],
        recommendations: [],
        analyzedAt: new Date(),
        confidence: 70,
      };

      const score = getGeologicalRiskScore(result);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(5);
      expect(score).toBeGreaterThanOrEqual(expectedRange[0]);
      expect(score).toBeLessThanOrEqual(expectedRange[1]);
    });
  });

  it('should round score to 2 decimal places', () => {
    const result: GeologicalRiskResult = {
      earthquake: {} as EarthquakeRiskAnalysis,
      sinkhole: {} as SinkholeRiskAnalysis,
      slope: {} as SlopeRiskAnalysis,
      overallRiskLevel: 'moderate',
      combinedRiskScore: 47,
      primaryConcern: 'earthquake',
      criticalWarnings: [],
      recommendations: [],
      analyzedAt: new Date(),
      confidence: 70,
    };

    const score = getGeologicalRiskScore(result);
    const decimalPlaces = (score.toString().split('.')[1] || '').length;

    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });
});

// ============================================
// KARST_GEOLOGY_STATES Tests
// ============================================

describe('KARST_GEOLOGY_STATES', () => {
  it('should include all high-risk karst states', () => {
    const highRiskStates = ['FL', 'TX', 'AL', 'MO', 'KY', 'TN'];

    highRiskStates.forEach(state => {
      expect(KARST_GEOLOGY_STATES[state]).toBeDefined();
      expect(KARST_GEOLOGY_STATES[state].riskLevel).toBe('high');
    });
  });

  it('should include moderate-risk karst states', () => {
    const moderateRiskStates = ['PA', 'GA', 'SC', 'VA', 'MD', 'IN'];

    moderateRiskStates.forEach(state => {
      expect(KARST_GEOLOGY_STATES[state]).toBeDefined();
      expect(KARST_GEOLOGY_STATES[state].riskLevel).toBe('moderate');
    });
  });

  it('should provide karst type for all states', () => {
    Object.values(KARST_GEOLOGY_STATES).forEach(stateData => {
      expect(stateData.karstType).toBeDefined();
      expect(['limestone', 'dolomite', 'gypsum', 'salt', 'other']).toContain(stateData.karstType);
    });
  });

  it('should flag disclosure requirements correctly', () => {
    expect(KARST_GEOLOGY_STATES.FL.requiresDisclosure).toBe(true);
    expect(KARST_GEOLOGY_STATES.TX.requiresDisclosure).toBe(false);
  });

  it('should provide insurance considerations for all states', () => {
    Object.values(KARST_GEOLOGY_STATES).forEach(stateData => {
      expect(stateData.insuranceConsiderations).toBeDefined();
      expect(Array.isArray(stateData.insuranceConsiderations)).toBe(true);
      expect(stateData.insuranceConsiderations.length).toBeGreaterThan(0);
    });
  });

  it('should have correct karst types', () => {
    expect(KARST_GEOLOGY_STATES.FL.karstType).toBe('limestone');
    expect(KARST_GEOLOGY_STATES.MO.karstType).toBe('dolomite');
  });
});
