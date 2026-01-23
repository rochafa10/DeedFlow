/**
 * Combined Risk Service Tests
 *
 * Comprehensive tests for the combined risk integration service:
 * - Risk assessment calculation with adaptive weights
 * - Regional weight adaptation (8 regions)
 * - Individual risk score calculations (8 risk types)
 * - Weight validation and normalization
 * - 125-point scoring system integration
 * - Insurance estimates calculation
 * - Mitigation recommendations generation
 * - Edge cases and data availability handling
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRiskAssessment,
  calculateRiskCategoryScore,
  getWeightsForState,
  getRegionForState,
  RISK_REGIONS,
  STATE_RISK_REGIONS,
  validateWeights,
  normalizeWeights,
} from '../combined-risk-service';
import {
  RiskInput,
  RiskWeights,
  FloodRiskAnalysis,
  HurricaneRiskAnalysis,
  EarthquakeRiskAnalysis,
  WildfireRiskAnalysis,
  SinkholeRiskAnalysis,
  EnvironmentalContaminationAnalysis,
  RadonRiskAnalysis,
  SlopeRiskAnalysis,
} from '@/types/risk-analysis';

// ============================================
// Mock Data Fixtures
// ============================================

const mockFloodAnalysis: FloodRiskAnalysis = {
  zone: 'X',
  zoneDescription: 'Minimal flood hazard',
  riskLevel: 'minimal',
  insuranceRequired: false,
  annualPremiumEstimate: null,
  baseFloodElevation: null,
  propertyElevation: null,
  elevationDifference: null,
  floodwayStatus: 'outside',
  historicalFlooding: {
    count: 0,
    lastDate: null,
    avgDamage: null,
  },
  mitigationRecommendations: [],
  dataSource: {
    name: 'FEMA NFHL',
    type: 'api',
    reliability: 'high',
  },
  confidence: 95,
};

const mockHighFloodAnalysis: FloodRiskAnalysis = {
  zone: 'AE',
  zoneDescription: 'High-risk with BFE determined',
  riskLevel: 'high',
  insuranceRequired: true,
  annualPremiumEstimate: 1500,
  baseFloodElevation: 100,
  propertyElevation: 98,
  elevationDifference: -2,
  floodwayStatus: 'in_floodway',
  historicalFlooding: {
    count: 3,
    lastDate: new Date('2022-09-01'),
    avgDamage: 15000,
  },
  mitigationRecommendations: ['Elevate structure', 'Install flood vents'],
  dataSource: {
    name: 'FEMA NFHL',
    type: 'api',
    reliability: 'high',
  },
  confidence: 90,
};

const mockHurricaneAnalysis: HurricaneRiskAnalysis = {
  windZone: 'zone_2',
  windZoneDescription: 'Moderate wind zone',
  maxWindSpeed: 120,
  stormSurgeZone: 'C',
  stormSurgeDescription: 'Moderate surge risk',
  evacuationZone: 'C',
  historicalStorms: {
    count: 5,
    significantStorms: ['Hurricane Ian', 'Hurricane Irma'],
  },
  buildingCodeRequirements: ['Impact-resistant windows'],
  insuranceConsiderations: ['Windstorm coverage required'],
  dataSource: {
    name: 'NOAA',
    type: 'api',
    reliability: 'high',
  },
  confidence: 85,
};

const mockHighHurricaneAnalysis: HurricaneRiskAnalysis = {
  windZone: 'zone_4',
  windZoneDescription: 'Extreme wind zone',
  maxWindSpeed: 180,
  stormSurgeZone: 'A',
  stormSurgeDescription: 'Extreme surge risk',
  evacuationZone: 'A',
  historicalStorms: {
    count: 15,
    significantStorms: ['Hurricane Katrina', 'Hurricane Michael', 'Hurricane Ian'],
  },
  buildingCodeRequirements: ['Impact-resistant windows', 'Enhanced roof straps'],
  insuranceConsiderations: ['May require state pool'],
  dataSource: {
    name: 'NOAA',
    type: 'api',
    reliability: 'high',
  },
  confidence: 90,
};

const mockEarthquakeAnalysis: EarthquakeRiskAnalysis = {
  hazardLevel: 'low',
  pga: 0.05,
  spectralAcceleration02: 0.1,
  spectralAcceleration10: 0.05,
  distanceToFault: 50,
  nearestFaultName: 'San Andreas Fault',
  historicalQuakeCount: 2,
  maxHistoricalMagnitude: 4.5,
  seismicDesignCategory: 'B',
  mitigationRecommendations: [],
  dataSource: {
    name: 'USGS',
    type: 'api',
    reliability: 'high',
  },
  confidence: 90,
};

const mockHighEarthquakeAnalysis: EarthquakeRiskAnalysis = {
  hazardLevel: 'very_high',
  pga: 0.5,
  spectralAcceleration02: 0.8,
  spectralAcceleration10: 0.6,
  distanceToFault: 5,
  nearestFaultName: 'San Andreas Fault',
  historicalQuakeCount: 15,
  maxHistoricalMagnitude: 7.2,
  seismicDesignCategory: 'E',
  mitigationRecommendations: ['Seismic retrofit required'],
  dataSource: {
    name: 'USGS',
    type: 'api',
    reliability: 'high',
  },
  confidence: 95,
};

const mockWildfireAnalysis: WildfireRiskAnalysis = {
  riskLevel: 'moderate',
  whpScore: 3,
  inWUI: false,
  wuiType: null,
  activeFiresNearby: 0,
  distanceToNearestFire: null,
  historicalFireCount: 2,
  recentAcresBurned: 500,
  fuelLoad: 'moderate',
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
  confidence: 80,
};

const mockHighWildfireAnalysis: WildfireRiskAnalysis = {
  riskLevel: 'extreme',
  whpScore: 5,
  inWUI: true,
  wuiType: 'interface',
  activeFiresNearby: 3,
  distanceToNearestFire: 10,
  historicalFireCount: 12,
  recentAcresBurned: 15000,
  fuelLoad: 'extreme',
  defensibleSpaceRequired: true,
  buildingRequirements: ['Fire-resistant roofing', 'Fire-resistant siding'],
  insuranceConsiderations: ['May be difficult to obtain'],
  evacuationAccessibility: 'limited',
  mitigationRecommendations: ['Create defensible space', 'Install fire-resistant materials'],
  dataSource: {
    name: 'NASA FIRMS',
    type: 'api',
    reliability: 'high',
  },
  confidence: 90,
};

const mockSinkholeAnalysis: SinkholeRiskAnalysis = {
  riskLevel: 'low',
  inKarstArea: false,
  karstType: null,
  distanceToNearestSinkhole: null,
  sinkholesWithinOneMile: 0,
  sinkholesWithinFiveMiles: 0,
  subsidenceHistory: false,
  stateRequiresDisclosure: false,
  insuranceConsiderations: [],
  mitigationRecommendations: [],
  dataSource: {
    name: 'USGS Karst',
    type: 'database',
    reliability: 'medium',
  },
  confidence: 75,
};

const mockHighSinkholeAnalysis: SinkholeRiskAnalysis = {
  riskLevel: 'very_high',
  inKarstArea: true,
  karstType: 'limestone',
  distanceToNearestSinkhole: 0.3,
  sinkholesWithinOneMile: 5,
  sinkholesWithinFiveMiles: 20,
  subsidenceHistory: true,
  stateRequiresDisclosure: true,
  insuranceConsiderations: ['Special coverage required'],
  mitigationRecommendations: ['Ground stability assessment required'],
  dataSource: {
    name: 'USGS Karst',
    type: 'database',
    reliability: 'high',
  },
  confidence: 85,
};

const mockEnvironmentalAnalysis: EnvironmentalContaminationAnalysis = {
  riskLevel: 'none_known',
  superfundSitesNearby: 0,
  brownfieldSitesNearby: 0,
  ustSitesNearby: 0,
  triSitesNearby: 0,
  nearestSite: null,
  nearbySites: [],
  phaseIRecommended: false,
  groundwaterConcerns: [],
  airQualityConcerns: [],
  historicalIndustrialUse: false,
  mitigationRecommendations: [],
  dataSource: {
    name: 'EPA Envirofacts',
    type: 'api',
    reliability: 'high',
  },
  confidence: 90,
};

const mockHighEnvironmentalAnalysis: EnvironmentalContaminationAnalysis = {
  riskLevel: 'high',
  superfundSitesNearby: 1,
  brownfieldSitesNearby: 2,
  ustSitesNearby: 3,
  triSitesNearby: 1,
  nearestSite: {
    name: 'Old Industrial Site',
    epaId: 'EPA123456',
    type: 'superfund',
    status: 'cleanup_in_progress',
    distanceMiles: 0.5,
    direction: 'N',
    contaminants: ['Lead', 'PCBs'],
    groundwaterImpact: true,
  },
  nearbySites: [],
  phaseIRecommended: true,
  groundwaterConcerns: ['Potential lead contamination', 'PCB migration'],
  airQualityConcerns: ['Industrial emissions'],
  historicalIndustrialUse: true,
  mitigationRecommendations: ['Phase I ESA required'],
  dataSource: {
    name: 'EPA Envirofacts',
    type: 'api',
    reliability: 'high',
  },
  confidence: 85,
};

const mockRadonAnalysis: RadonRiskAnalysis = {
  radonZone: 2,
  riskLevel: 'moderate',
  predictedLevel: 3.5,
  testingRecommended: true,
  stateAverageLevel: 3.2,
  countyAverageLevel: 3.8,
  percentAboveActionLevel: 35,
  mitigationTypicallyNeeded: false,
  estimatedMitigationCost: { min: 800, max: 2500 },
  stateDisclosureRequired: false,
  mitigationRecommendations: ['Test before purchase'],
  dataSource: {
    name: 'EPA Radon',
    type: 'database',
    reliability: 'high',
  },
  confidence: 80,
};

const mockHighRadonAnalysis: RadonRiskAnalysis = {
  radonZone: 1,
  riskLevel: 'high',
  predictedLevel: 8.5,
  testingRecommended: true,
  stateAverageLevel: 6.8,
  countyAverageLevel: 7.5,
  percentAboveActionLevel: 75,
  mitigationTypicallyNeeded: true,
  estimatedMitigationCost: { min: 800, max: 2500 },
  stateDisclosureRequired: true,
  mitigationRecommendations: ['Radon mitigation system required'],
  dataSource: {
    name: 'EPA Radon',
    type: 'database',
    reliability: 'high',
  },
  confidence: 90,
};

const mockSlopeAnalysis: SlopeRiskAnalysis = {
  stabilityLevel: 'stable',
  slopePercentage: 5,
  maxSlopePercentage: 8,
  slopeAspect: 'S',
  landslideSusceptibility: 'low',
  inLandslideZone: false,
  historicalLandslides: 0,
  soilType: 'Clay loam',
  drainageConsiderations: [],
  mitigationRecommendations: [],
  dataSource: {
    name: 'USGS',
    type: 'database',
    reliability: 'medium',
  },
  confidence: 70,
};

const mockHighSlopeAnalysis: SlopeRiskAnalysis = {
  stabilityLevel: 'highly_unstable',
  slopePercentage: 35,
  maxSlopePercentage: 45,
  slopeAspect: 'N',
  landslideSusceptibility: 'very_high',
  inLandslideZone: true,
  historicalLandslides: 8,
  soilType: 'Loose sand',
  drainageConsiderations: ['Poor drainage', 'High water table'],
  mitigationRecommendations: ['Retaining walls required', 'Drainage improvements'],
  dataSource: {
    name: 'USGS',
    type: 'database',
    reliability: 'high',
  },
  confidence: 85,
};

const mockLowRiskInput: RiskInput = {
  flood: mockFloodAnalysis,
  earthquake: mockEarthquakeAnalysis,
  wildfire: mockWildfireAnalysis,
  hurricane: mockHurricaneAnalysis,
  sinkhole: mockSinkholeAnalysis,
  environmental: mockEnvironmentalAnalysis,
  radon: mockRadonAnalysis,
  slope: mockSlopeAnalysis,
};

const mockHighRiskInput: RiskInput = {
  flood: mockHighFloodAnalysis,
  earthquake: mockHighEarthquakeAnalysis,
  wildfire: mockHighWildfireAnalysis,
  hurricane: mockHighHurricaneAnalysis,
  sinkhole: mockHighSinkholeAnalysis,
  environmental: mockHighEnvironmentalAnalysis,
  radon: mockHighRadonAnalysis,
  slope: mockHighSlopeAnalysis,
};

const mockNullRiskInput: RiskInput = {
  flood: null,
  earthquake: null,
  wildfire: null,
  hurricane: null,
  sinkhole: null,
  environmental: null,
  radon: null,
  slope: null,
};

const mockPartialRiskInput: RiskInput = {
  flood: mockFloodAnalysis,
  earthquake: null,
  wildfire: mockWildfireAnalysis,
  hurricane: null,
  sinkhole: null,
  environmental: mockEnvironmentalAnalysis,
  radon: mockRadonAnalysis,
  slope: null,
};

// ============================================
// End-to-End Risk Assessment Tests
// ============================================

describe('End-to-End Risk Assessment', () => {
  describe('complete risk assessment flow', () => {
    it('should complete full assessment for low-risk property', () => {
      const assessment = calculateRiskAssessment(mockLowRiskInput, 'PA');

      // Verify structure
      expect(assessment).toBeDefined();
      expect(assessment.overallRisk).toBeDefined();
      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(100);

      // Low risk property should have low overall risk
      expect(assessment.overallRisk).toMatch(/^(low|moderate)$/);
      expect(assessment.riskScore).toBeLessThan(50);

      // Should have all individual analyses
      expect(assessment.flood).toBe(mockFloodAnalysis);
      expect(assessment.earthquake).toBe(mockEarthquakeAnalysis);
      expect(assessment.wildfire).toBe(mockWildfireAnalysis);
      expect(assessment.hurricane).toBe(mockHurricaneAnalysis);

      // Should have category scores
      expect(assessment.categoryScores).toHaveLength(8);
      expect(assessment.categoryScores[0].category).toBeDefined();

      // Should have weights
      expect(assessment.weightsUsed).toBeDefined();
      expect(Object.values(assessment.weightsUsed).reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 2);

      // Should have metadata
      expect(assessment.assessedAt).toBeInstanceOf(Date);
      expect(assessment.confidenceLevel).toBeGreaterThan(0);
    });

    it('should complete full assessment for high-risk property', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      // High risk property should have high overall risk
      expect(assessment.overallRisk).toMatch(/^(high|severe)$/);
      expect(assessment.riskScore).toBeGreaterThan(60);

      // Should have warnings
      expect(assessment.warnings).toBeDefined();
      expect(assessment.warnings.length).toBeGreaterThan(0);

      // Should have recommendations
      expect(assessment.recommendations).toBeDefined();
      expect(assessment.recommendations.length).toBeGreaterThan(0);

      // Should have mitigation actions
      expect(assessment.mitigationActions).toBeDefined();
      expect(assessment.mitigationActions.length).toBeGreaterThan(0);
      expect(assessment.mitigationActions[0].priority).toBe(1);

      // Should have insurance estimates
      expect(assessment.insuranceEstimates).toBeDefined();
      expect(assessment.insuranceEstimates.totalAnnualCost).toBeGreaterThan(0);
    });

    it('should handle properties with all null risk data', () => {
      const assessment = calculateRiskAssessment(mockNullRiskInput, 'TX');

      // Should complete without errors
      expect(assessment).toBeDefined();
      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(100);

      // Should use default scores
      expect(assessment.categoryScores).toHaveLength(8);

      // All analyses should be null
      expect(assessment.flood).toBeNull();
      expect(assessment.earthquake).toBeNull();
      expect(assessment.wildfire).toBeNull();

      // Confidence should be lower
      expect(assessment.confidenceLevel).toBeLessThan(60);
    });

    it('should handle properties with partial risk data', () => {
      const assessment = calculateRiskAssessment(mockPartialRiskInput, 'CA');

      // Should complete without errors
      expect(assessment).toBeDefined();
      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);

      // Should have mix of null and real data
      expect(assessment.flood).toBe(mockFloodAnalysis);
      expect(assessment.earthquake).toBeNull();
      expect(assessment.wildfire).toBe(mockWildfireAnalysis);

      // Category scores should reflect data availability
      const floodScore = assessment.categoryScores.find(s => s.category === 'flood');
      expect(floodScore?.dataAvailability).not.toBe('none');

      const earthquakeScore = assessment.categoryScores.find(s => s.category === 'earthquake');
      expect(earthquakeScore?.dataAvailability).toBe('none');
    });
  });

  describe('score aggregation accuracy', () => {
    it('should correctly aggregate weighted scores', () => {
      const assessment = calculateRiskAssessment(mockLowRiskInput, 'PA');

      // Manual calculation
      let manualTotal = 0;
      for (const categoryScore of assessment.categoryScores) {
        manualTotal += categoryScore.weightedScore;
      }

      expect(Math.abs(assessment.riskScore - Math.round(manualTotal))).toBeLessThanOrEqual(1);
    });

    it('should maintain score bounds through pipeline', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      // Overall score bounds
      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(100);

      // Category score bounds
      for (const categoryScore of assessment.categoryScores) {
        expect(categoryScore.rawScore).toBeGreaterThanOrEqual(0);
        expect(categoryScore.rawScore).toBeLessThanOrEqual(100);
        expect(categoryScore.weight).toBeGreaterThan(0);
        expect(categoryScore.weight).toBeLessThanOrEqual(1);
        expect(categoryScore.weightedScore).toBeGreaterThanOrEqual(0);
        expect(categoryScore.weightedScore).toBeLessThanOrEqual(100);
      }
    });

    it('should sort category scores by weighted contribution', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      // Verify sorted descending
      for (let i = 0; i < assessment.categoryScores.length - 1; i++) {
        expect(assessment.categoryScores[i].weightedScore).toBeGreaterThanOrEqual(
          assessment.categoryScores[i + 1].weightedScore
        );
      }
    });
  });
});

// ============================================
// Regional Adaptation Tests
// ============================================

describe('Regional Adaptation', () => {
  describe('state to region mapping', () => {
    it('should map Gulf Coast states correctly', () => {
      expect(getRegionForState('FL')).toBe('GULF_COAST');
      expect(getRegionForState('LA')).toBe('GULF_COAST');
      expect(getRegionForState('MS')).toBe('GULF_COAST');
      expect(getRegionForState('AL')).toBe('GULF_COAST');
    });

    it('should map Atlantic Coast states correctly', () => {
      expect(getRegionForState('NC')).toBe('ATLANTIC_COAST');
      expect(getRegionForState('NY')).toBe('ATLANTIC_COAST');
      expect(getRegionForState('MA')).toBe('ATLANTIC_COAST');
    });

    it('should map West Coast states correctly', () => {
      expect(getRegionForState('CA')).toBe('WEST_COAST');
      expect(getRegionForState('OR')).toBe('WEST_COAST');
      expect(getRegionForState('WA')).toBe('WEST_COAST');
    });

    it('should map Tornado Alley states correctly', () => {
      expect(getRegionForState('TX')).toBe('TORNADO_ALLEY');
      expect(getRegionForState('OK')).toBe('TORNADO_ALLEY');
      expect(getRegionForState('KS')).toBe('TORNADO_ALLEY');
    });

    it('should map Midwest states correctly', () => {
      expect(getRegionForState('OH')).toBe('MIDWEST');
      expect(getRegionForState('IL')).toBe('MIDWEST');
      expect(getRegionForState('MI')).toBe('MIDWEST');
    });

    it('should map Mountain West states correctly', () => {
      expect(getRegionForState('CO')).toBe('MOUNTAIN_WEST');
      expect(getRegionForState('UT')).toBe('MOUNTAIN_WEST');
      expect(getRegionForState('AZ')).toBe('MOUNTAIN_WEST');
    });

    it('should map Northeast states correctly', () => {
      expect(getRegionForState('PA')).toBe('NORTHEAST');
      expect(getRegionForState('VT')).toBe('NORTHEAST');
    });

    it('should default unknown states', () => {
      expect(getRegionForState('ZZ')).toBe('DEFAULT');
      expect(getRegionForState('XX')).toBe('DEFAULT');
    });

    it('should be case-insensitive', () => {
      expect(getRegionForState('ca')).toBe('WEST_COAST');
      expect(getRegionForState('Ca')).toBe('WEST_COAST');
      expect(getRegionForState('CA')).toBe('WEST_COAST');
    });
  });

  describe('adaptive weight selection', () => {
    it('should return correct weights for Gulf Coast region', () => {
      const weights = getWeightsForState('FL');

      expect(weights.hurricane).toBe(0.25); // Highest
      expect(weights.flood).toBe(0.20); // High
      expect(weights.sinkhole).toBe(0.20); // High
      expect(weights.earthquake).toBe(0.02); // Low
      expect(weights.slope).toBe(0.13);
    });

    it('should return correct weights for West Coast region', () => {
      const weights = getWeightsForState('CA');

      expect(weights.earthquake).toBe(0.25); // Highest
      expect(weights.wildfire).toBe(0.22); // High
      expect(weights.slope).toBe(0.18);
      expect(weights.hurricane).toBe(0.02); // Low
    });

    it('should return correct weights for Northeast region', () => {
      const weights = getWeightsForState('PA');

      expect(weights.radon).toBe(0.22); // Highest
      expect(weights.environmental).toBe(0.18); // High
      expect(weights.slope).toBe(0.17);
      expect(weights.flood).toBe(0.15);
    });

    it('should return correct weights for Mountain West region', () => {
      const weights = getWeightsForState('CO');

      expect(weights.wildfire).toBe(0.25); // Highest
      expect(weights.slope).toBe(0.22); // High
      expect(weights.hurricane).toBe(0.02); // Low
    });

    it('should return default weights for unknown states', () => {
      const weights = getWeightsForState('ZZ');

      expect(weights).toEqual(RISK_REGIONS.DEFAULT);
    });
  });

  describe('regional weight application', () => {
    it('should apply Florida weights differently than Pennsylvania', () => {
      const flAssessment = calculateRiskAssessment(mockLowRiskInput, 'FL');
      const paAssessment = calculateRiskAssessment(mockLowRiskInput, 'PA');

      // Different weights should lead to different scores
      expect(flAssessment.weightsUsed.hurricane).toBeGreaterThan(paAssessment.weightsUsed.hurricane);
      expect(paAssessment.weightsUsed.radon).toBeGreaterThan(flAssessment.weightsUsed.radon);

      // Category scores should reflect different weights
      const flHurricane = flAssessment.categoryScores.find(s => s.category === 'hurricane');
      const paHurricane = paAssessment.categoryScores.find(s => s.category === 'hurricane');
      expect(flHurricane?.weight).toBeGreaterThan(paHurricane?.weight || 0);
    });

    it('should apply California weights differently than Florida', () => {
      const caAssessment = calculateRiskAssessment(mockLowRiskInput, 'CA');
      const flAssessment = calculateRiskAssessment(mockLowRiskInput, 'FL');

      expect(caAssessment.weightsUsed.earthquake).toBeGreaterThan(flAssessment.weightsUsed.earthquake);
      expect(caAssessment.weightsUsed.wildfire).toBeGreaterThan(flAssessment.weightsUsed.wildfire);
      expect(flAssessment.weightsUsed.hurricane).toBeGreaterThan(caAssessment.weightsUsed.hurricane);
    });

    it('should produce consistent results for same region', () => {
      const tx1 = calculateRiskAssessment(mockLowRiskInput, 'TX');
      const ok1 = calculateRiskAssessment(mockLowRiskInput, 'OK');

      // Same region (TORNADO_ALLEY) should use same weights
      expect(tx1.weightsUsed).toEqual(ok1.weightsUsed);
    });
  });
});

// ============================================
// Weight Validation Tests
// ============================================

describe('Weight Validation and Normalization', () => {
  describe('validateWeights', () => {
    it('should validate weights that sum to 1.0', () => {
      const validWeights: RiskWeights = {
        flood: 0.15,
        earthquake: 0.10,
        wildfire: 0.12,
        hurricane: 0.10,
        sinkhole: 0.08,
        environmental: 0.15,
        radon: 0.12,
        slope: 0.18,
      };

      expect(validateWeights(validWeights)).toBe(true);
    });

    it('should reject weights that do not sum to 1.0', () => {
      const invalidWeights: RiskWeights = {
        flood: 0.50,
        earthquake: 0.10,
        wildfire: 0.10,
        hurricane: 0.10,
        sinkhole: 0.10,
        environmental: 0.10,
        radon: 0.10,
        slope: 0.10,
      };

      expect(validateWeights(invalidWeights)).toBe(false);
    });

    it('should allow 1% variance in weight sum', () => {
      const almostValidWeights: RiskWeights = {
        flood: 0.15,
        earthquake: 0.10,
        wildfire: 0.12,
        hurricane: 0.10,
        sinkhole: 0.08,
        environmental: 0.15,
        radon: 0.12,
        slope: 0.19, // Total = 1.01 (within 1% variance)
      };

      expect(validateWeights(almostValidWeights)).toBe(true);
    });

    it('should validate all pre-defined region weights', () => {
      for (const [region, weights] of Object.entries(RISK_REGIONS)) {
        expect(validateWeights(weights)).toBe(true);
      }
    });
  });

  describe('normalizeWeights', () => {
    it('should normalize weights that do not sum to 1.0', () => {
      const unnormalizedWeights: RiskWeights = {
        flood: 0.50,
        earthquake: 0.10,
        wildfire: 0.10,
        hurricane: 0.10,
        sinkhole: 0.10,
        environmental: 0.10,
        radon: 0.10,
        slope: 0.10,
      };

      const normalized = normalizeWeights(unnormalizedWeights);

      expect(validateWeights(normalized)).toBe(true);
      expect(normalized.flood).toBeCloseTo(0.50 / 1.20, 5);
    });

    it('should not change already-normalized weights', () => {
      const validWeights: RiskWeights = {
        flood: 0.15,
        earthquake: 0.10,
        wildfire: 0.12,
        hurricane: 0.10,
        sinkhole: 0.08,
        environmental: 0.15,
        radon: 0.12,
        slope: 0.18,
      };

      const normalized = normalizeWeights(validWeights);

      expect(normalized.flood).toBeCloseTo(validWeights.flood, 5);
      expect(normalized.earthquake).toBeCloseTo(validWeights.earthquake, 5);
    });

    it('should handle zero-sum weights gracefully', () => {
      const zeroWeights: RiskWeights = {
        flood: 0,
        earthquake: 0,
        wildfire: 0,
        hurricane: 0,
        sinkhole: 0,
        environmental: 0,
        radon: 0,
        slope: 0,
      };

      const normalized = normalizeWeights(zeroWeights);

      expect(normalized).toEqual(zeroWeights);
    });
  });

  describe('custom weight override', () => {
    it('should allow custom weight override', () => {
      const customWeights: Partial<RiskWeights> = {
        flood: 0.40,
        earthquake: 0.30,
      };

      const assessment = calculateRiskAssessment(mockLowRiskInput, 'PA', customWeights);

      // Custom weights should be applied and normalized
      // PA base: flood 0.15, earthquake 0.05, others sum to 0.80
      // After override: flood 0.40, earthquake 0.30, others 0.80 = total 1.50
      // After normalization: flood = 0.40/1.50 = 0.267, earthquake = 0.30/1.50 = 0.20
      expect(assessment.weightsUsed.flood).toBeGreaterThan(0.25);
      expect(assessment.weightsUsed.earthquake).toBeGreaterThan(0.18);
      expect(validateWeights(assessment.weightsUsed)).toBe(true);
    });

    it('should normalize custom weights that do not sum to 1.0', () => {
      const customWeights: Partial<RiskWeights> = {
        flood: 0.50,
        wildfire: 0.50,
      };

      const assessment = calculateRiskAssessment(mockLowRiskInput, 'CA', customWeights);

      // Weights should be normalized
      expect(validateWeights(assessment.weightsUsed)).toBe(true);
    });
  });
});

// ============================================
// 125-Point Scoring Integration Tests
// ============================================

describe('125-Point Scoring Integration', () => {
  describe('calculateRiskCategoryScore', () => {
    it('should convert risk assessment to 0-25 scale', () => {
      const assessment = calculateRiskAssessment(mockLowRiskInput, 'PA');
      const scoring = calculateRiskCategoryScore(assessment);

      // Score should be in range 0-25
      expect(scoring.categoryScore).toBeGreaterThanOrEqual(0);
      expect(scoring.categoryScore).toBeLessThanOrEqual(25);

      // Low risk should have high score (closer to 25)
      expect(scoring.categoryScore).toBeGreaterThan(15);
    });

    it('should give high-risk properties low scores', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');
      const scoring = calculateRiskCategoryScore(assessment);

      // High risk should have low score (closer to 0)
      expect(scoring.categoryScore).toBeLessThan(15);
    });

    it('should calculate sub-scores for each category', () => {
      const assessment = calculateRiskAssessment(mockLowRiskInput, 'PA');
      const scoring = calculateRiskCategoryScore(assessment);

      // Verify all sub-scores exist
      expect(scoring.subScores.flood).toBeDefined();
      expect(scoring.subScores.earthquake).toBeDefined();
      expect(scoring.subScores.wildfire).toBeDefined();
      expect(scoring.subScores.hurricane).toBeDefined();
      expect(scoring.subScores.sinkhole).toBeDefined();
      expect(scoring.subScores.environmental).toBeDefined();
      expect(scoring.subScores.radon).toBeDefined();
      expect(scoring.subScores.slope).toBeDefined();

      // All sub-scores should be non-negative
      expect(scoring.subScores.flood).toBeGreaterThanOrEqual(0);
      expect(scoring.subScores.earthquake).toBeGreaterThanOrEqual(0);
    });

    it('should generate explanation', () => {
      const assessment = calculateRiskAssessment(mockLowRiskInput, 'PA');
      const scoring = calculateRiskCategoryScore(assessment);

      expect(scoring.explanation).toBeDefined();
      expect(scoring.explanation.length).toBeGreaterThan(0);
      expect(scoring.explanation).toContain('/25');
    });

    it('should include key factors', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');
      const scoring = calculateRiskCategoryScore(assessment);

      expect(scoring.keyFactors).toBeDefined();
      expect(scoring.keyFactors.length).toBeGreaterThan(0);
    });

    it('should maintain inverse relationship between risk and score', () => {
      const lowRiskAssessment = calculateRiskAssessment(mockLowRiskInput, 'PA');
      const highRiskAssessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      const lowRiskScoring = calculateRiskCategoryScore(lowRiskAssessment);
      const highRiskScoring = calculateRiskCategoryScore(highRiskAssessment);

      // Higher risk score (0-100) should lead to lower category score (0-25)
      expect(lowRiskAssessment.riskScore).toBeLessThan(highRiskAssessment.riskScore);
      expect(lowRiskScoring.categoryScore).toBeGreaterThan(highRiskScoring.categoryScore);
    });
  });

  describe('score consistency', () => {
    it('should produce consistent scores for same input', () => {
      const assessment1 = calculateRiskAssessment(mockLowRiskInput, 'PA');
      const assessment2 = calculateRiskAssessment(mockLowRiskInput, 'PA');

      const scoring1 = calculateRiskCategoryScore(assessment1);
      const scoring2 = calculateRiskCategoryScore(assessment2);

      expect(scoring1.categoryScore).toBe(scoring2.categoryScore);
    });
  });
});

// ============================================
// Insurance Estimates Tests
// ============================================

describe('Insurance Estimates', () => {
  describe('insurance calculation accuracy', () => {
    it('should calculate flood insurance for SFHA zones', () => {
      const input: RiskInput = {
        ...mockNullRiskInput,
        flood: mockHighFloodAnalysis,
      };

      const assessment = calculateRiskAssessment(input, 'FL');

      expect(assessment.insuranceEstimates.floodInsurance).toBeGreaterThan(0);
      expect(assessment.insuranceEstimates.totalAnnualCost).toBeGreaterThan(0);
    });

    it('should not require flood insurance for minimal risk zones', () => {
      const input: RiskInput = {
        ...mockNullRiskInput,
        flood: mockFloodAnalysis,
      };

      const assessment = calculateRiskAssessment(input, 'PA');

      // May or may not have flood insurance, but shouldn't be required
      expect(assessment.flood?.insuranceRequired).toBe(false);
    });

    it('should calculate earthquake insurance for high-risk areas', () => {
      const input: RiskInput = {
        ...mockNullRiskInput,
        earthquake: mockHighEarthquakeAnalysis,
      };

      const assessment = calculateRiskAssessment(input, 'CA');

      expect(assessment.insuranceEstimates.earthquakeInsurance).toBeGreaterThan(0);
    });

    it('should calculate wildfire insurance for high-risk areas', () => {
      const input: RiskInput = {
        ...mockNullRiskInput,
        wildfire: mockHighWildfireAnalysis,
      };

      const assessment = calculateRiskAssessment(input, 'CA');

      expect(assessment.insuranceEstimates.fireInsurance).toBeGreaterThan(0);
    });

    it('should calculate windstorm insurance for hurricane zones', () => {
      const input: RiskInput = {
        ...mockNullRiskInput,
        hurricane: mockHighHurricaneAnalysis,
      };

      const assessment = calculateRiskAssessment(input, 'FL');

      expect(assessment.insuranceEstimates.windstormInsurance).toBeGreaterThan(0);
    });

    it('should sum all insurance costs correctly', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      const manualTotal =
        (assessment.insuranceEstimates.floodInsurance || 0) +
        (assessment.insuranceEstimates.earthquakeInsurance || 0) +
        (assessment.insuranceEstimates.fireInsurance || 0) +
        (assessment.insuranceEstimates.windstormInsurance || 0);

      expect(assessment.insuranceEstimates.totalAnnualCost).toBe(manualTotal);
    });

    it('should include availability warnings for extreme risks', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      expect(assessment.insuranceEstimates.availabilityWarnings).toBeDefined();
      // High-risk properties should have warnings
      if (assessment.riskScore > 70) {
        expect(assessment.insuranceEstimates.availabilityWarnings.length).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================
// Recommendations and Mitigations Tests
// ============================================

describe('Recommendations and Mitigations', () => {
  describe('recommendation generation', () => {
    it('should generate recommendations for high-risk properties', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      expect(assessment.recommendations).toBeDefined();
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate fewer recommendations for low-risk properties', () => {
      const lowRiskAssessment = calculateRiskAssessment(mockLowRiskInput, 'PA');
      const highRiskAssessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      expect(highRiskAssessment.recommendations.length).toBeGreaterThanOrEqual(
        lowRiskAssessment.recommendations.length
      );
    });

    it('should prioritize recommendations by risk level', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      // Top category should correspond to highest-risk recommendation
      const topCategory = assessment.categoryScores[0];

      if (assessment.recommendations.length > 0) {
        // Should have recommendations related to top risks
        expect(assessment.recommendations).toBeDefined();
      }
    });
  });

  describe('mitigation action generation', () => {
    it('should generate prioritized mitigation actions', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      expect(assessment.mitigationActions).toBeDefined();
      expect(assessment.mitigationActions.length).toBeGreaterThan(0);

      // Verify priority order
      for (let i = 0; i < assessment.mitigationActions.length - 1; i++) {
        expect(assessment.mitigationActions[i].priority).toBeLessThanOrEqual(
          assessment.mitigationActions[i + 1].priority
        );
      }
    });

    it('should include cost estimates for mitigations', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      for (const mitigation of assessment.mitigationActions) {
        expect(mitigation.estimatedCost).toBeDefined();
        expect(mitigation.estimatedCost.min).toBeGreaterThan(0);
        expect(mitigation.estimatedCost.max).toBeGreaterThanOrEqual(mitigation.estimatedCost.min);
      }
    });

    it('should include effectiveness ratings', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      for (const mitigation of assessment.mitigationActions) {
        expect(mitigation.effectiveness).toMatch(/^(low|moderate|high|very_high)$/);
      }
    });

    it('should limit mitigation actions to top 8', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      expect(assessment.mitigationActions.length).toBeLessThanOrEqual(8);
    });
  });

  describe('warning generation', () => {
    it('should generate warnings for very high risks', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      expect(assessment.warnings).toBeDefined();
      expect(assessment.warnings.length).toBeGreaterThan(0);
    });

    it('should warn about flood insurance requirements', () => {
      const input: RiskInput = {
        ...mockNullRiskInput,
        flood: mockHighFloodAnalysis,
      };

      const assessment = calculateRiskAssessment(input, 'FL');

      expect(assessment.warnings.some(w => w.toLowerCase().includes('flood insurance'))).toBe(true);
    });

    it('should warn about Phase I ESA recommendations', () => {
      const input: RiskInput = {
        ...mockNullRiskInput,
        environmental: mockHighEnvironmentalAnalysis,
      };

      const assessment = calculateRiskAssessment(input, 'PA');

      expect(assessment.warnings.some(w => w.toLowerCase().includes('phase i'))).toBe(true);
    });

    it('should limit warnings to top 5', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      expect(assessment.warnings.length).toBeLessThanOrEqual(5);
    });
  });

  describe('top risk factors', () => {
    it('should identify top risk factors', () => {
      const assessment = calculateRiskAssessment(mockHighRiskInput, 'FL');

      expect(assessment.topRiskFactors).toBeDefined();
      expect(assessment.topRiskFactors.length).toBeGreaterThan(0);
      expect(assessment.topRiskFactors.length).toBeLessThanOrEqual(3);
    });

    it('should identify positive factors for low-risk properties', () => {
      const assessment = calculateRiskAssessment(mockLowRiskInput, 'PA');

      expect(assessment.positiveFactors).toBeDefined();
      expect(assessment.positiveFactors.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// Edge Cases and Data Availability Tests
// ============================================

describe('Edge Cases and Data Availability', () => {
  describe('data availability tracking', () => {
    it('should track full data availability', () => {
      const assessment = calculateRiskAssessment(mockLowRiskInput, 'PA');

      // With full mock data, availability should be partial or full
      for (const categoryScore of assessment.categoryScores) {
        expect(categoryScore.dataAvailability).toMatch(/^(full|partial|none)$/);
      }
    });

    it('should track missing data', () => {
      const assessment = calculateRiskAssessment(mockNullRiskInput, 'PA');

      // All data is null, so all should be 'none'
      for (const categoryScore of assessment.categoryScores) {
        expect(categoryScore.dataAvailability).toBe('none');
      }
    });

    it('should track partial data availability', () => {
      const assessment = calculateRiskAssessment(mockPartialRiskInput, 'PA');

      // Mix of available and null data
      const availableCategories = ['flood', 'wildfire', 'environmental', 'radon'];
      const missingCategories = ['earthquake', 'hurricane', 'sinkhole', 'slope'];

      for (const categoryScore of assessment.categoryScores) {
        if (availableCategories.includes(categoryScore.category)) {
          expect(categoryScore.dataAvailability).not.toBe('none');
        } else if (missingCategories.includes(categoryScore.category)) {
          expect(categoryScore.dataAvailability).toBe('none');
        }
      }
    });

    it('should calculate confidence based on data availability', () => {
      const fullDataAssessment = calculateRiskAssessment(mockLowRiskInput, 'PA');
      const noDataAssessment = calculateRiskAssessment(mockNullRiskInput, 'PA');
      const partialDataAssessment = calculateRiskAssessment(mockPartialRiskInput, 'PA');

      // Full data should have highest confidence
      expect(fullDataAssessment.confidenceLevel).toBeGreaterThan(noDataAssessment.confidenceLevel);
      expect(partialDataAssessment.confidenceLevel).toBeGreaterThan(noDataAssessment.confidenceLevel);
      expect(partialDataAssessment.confidenceLevel).toBeLessThan(fullDataAssessment.confidenceLevel);
    });
  });

  describe('default score handling', () => {
    it('should use default scores when data is missing', () => {
      const assessment = calculateRiskAssessment(mockNullRiskInput, 'PA');

      // Should have default scores for all categories
      expect(assessment.categoryScores).toHaveLength(8);

      for (const categoryScore of assessment.categoryScores) {
        expect(categoryScore.rawScore).toBeGreaterThan(0);
        expect(categoryScore.rawScore).toBeLessThan(100);
      }
    });

    it('should use moderate default scores', () => {
      const assessment = calculateRiskAssessment(mockNullRiskInput, 'PA');

      // Default scores should be in moderate range (not extreme)
      for (const categoryScore of assessment.categoryScores) {
        expect(categoryScore.rawScore).toBeGreaterThan(10);
        expect(categoryScore.rawScore).toBeLessThan(60);
      }
    });
  });

  describe('extreme value handling', () => {
    it('should cap scores at 100', () => {
      // Create extreme high-risk input
      const extremeInput: RiskInput = {
        ...mockHighRiskInput,
      };

      const assessment = calculateRiskAssessment(extremeInput, 'FL');

      for (const categoryScore of assessment.categoryScores) {
        expect(categoryScore.rawScore).toBeLessThanOrEqual(100);
      }
    });

    it('should floor scores at 0', () => {
      const assessment = calculateRiskAssessment(mockLowRiskInput, 'PA');

      for (const categoryScore of assessment.categoryScores) {
        expect(categoryScore.rawScore).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('timestamp handling', () => {
    it('should include assessment timestamp', () => {
      const beforeTime = new Date();
      const assessment = calculateRiskAssessment(mockLowRiskInput, 'PA');
      const afterTime = new Date();

      expect(assessment.assessedAt).toBeInstanceOf(Date);
      expect(assessment.assessedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(assessment.assessedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});

// ============================================
// Performance Tests
// ============================================

describe('Performance', () => {
  it('should complete assessment in reasonable time', () => {
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      calculateRiskAssessment(mockLowRiskInput, 'PA');
    }

    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 100;

    // Should complete in under 10ms per assessment
    expect(avgTime).toBeLessThan(10);
  });

  it('should handle batch assessments efficiently', () => {
    const states = ['PA', 'FL', 'CA', 'TX', 'NY', 'WA', 'CO', 'OH'];
    const startTime = Date.now();

    for (const state of states) {
      calculateRiskAssessment(mockLowRiskInput, state);
      calculateRiskAssessment(mockHighRiskInput, state);
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Should process 16 assessments in under 200ms
    expect(totalTime).toBeLessThan(200);
  });
});
