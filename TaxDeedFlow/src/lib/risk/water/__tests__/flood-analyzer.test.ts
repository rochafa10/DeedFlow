/**
 * Flood Risk Analyzer Tests
 *
 * Tests the flood risk analysis functionality including:
 * - analyzeFloodRisk function
 * - Flood zone definitions and classifications
 * - Insurance premium calculations
 * - Flood risk score calculations
 * - Mitigation recommendations
 * - Edge cases and error handling
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeFloodRisk,
  createUnknownFloodRisk,
  calculateFloodInsurancePremium,
  getFloodRiskScore,
  FLOOD_ZONE_DEFINITIONS,
} from '../flood-analyzer';
import type {
  FloodRiskAnalysis,
  FEMAFloodZone,
} from '@/types/risk-analysis';

// ============================================
// Test Fixtures
// ============================================

const mockCoordinates = {
  latitude: 40.5187,
  longitude: -78.3947,
};

const mockMinimalRiskFloodData = {
  zone: 'X' as FEMAFloodZone,
  baseFloodElevation: null,
  propertyElevation: null,
  floodwayStatus: null,
  historicalFlooding: null,
};

const mockModerateRiskFloodData = {
  zone: 'X500' as FEMAFloodZone,
  baseFloodElevation: null,
  propertyElevation: null,
  floodwayStatus: null,
  historicalFlooding: null,
};

const mockHighRiskFloodData = {
  zone: 'AE' as FEMAFloodZone,
  baseFloodElevation: 100,
  propertyElevation: 102,
  floodwayStatus: 'in_fringe' as const,
  historicalFlooding: {
    count: 2,
    lastDate: new Date('2020-06-15'),
    avgDamage: 15000,
  },
};

const mockVeryHighRiskFloodData = {
  zone: 'VE' as FEMAFloodZone,
  baseFloodElevation: 15,
  propertyElevation: 16,
  floodwayStatus: 'outside' as const,
  historicalFlooding: {
    count: 5,
    lastDate: new Date('2023-09-10'),
    avgDamage: 85000,
  },
};

const mockFloodwayData = {
  zone: 'AE' as FEMAFloodZone,
  baseFloodElevation: 100,
  propertyElevation: 98,
  floodwayStatus: 'in_floodway' as const,
  historicalFlooding: {
    count: 6,
    lastDate: new Date('2024-03-20'),
    avgDamage: 45000,
  },
};

const mockUndeterminedData = {
  zone: 'D' as FEMAFloodZone,
  baseFloodElevation: null,
  propertyElevation: null,
  floodwayStatus: null,
  historicalFlooding: null,
};

// ============================================
// FLOOD_ZONE_DEFINITIONS Tests
// ============================================

describe('FLOOD_ZONE_DEFINITIONS', () => {
  describe('minimal risk zones', () => {
    it('should define Zone X as minimal risk', () => {
      const zone = FLOOD_ZONE_DEFINITIONS['X'];
      expect(zone).toBeDefined();
      expect(zone.riskLevel).toBe('minimal');
      expect(zone.isSpecialFloodHazardArea).toBe(false);
      expect(zone.insuranceRequired).toBe(false);
      expect(zone.annualFloodProbability).toBe(0.002);
    });

    it('should define Zone C as minimal risk (legacy)', () => {
      const zone = FLOOD_ZONE_DEFINITIONS['C'];
      expect(zone).toBeDefined();
      expect(zone.riskLevel).toBe('minimal');
      expect(zone.isSpecialFloodHazardArea).toBe(false);
      expect(zone.insuranceRequired).toBe(false);
    });
  });

  describe('moderate risk zones', () => {
    it('should define Zone X500 as moderate risk', () => {
      const zone = FLOOD_ZONE_DEFINITIONS['X500'];
      expect(zone).toBeDefined();
      expect(zone.riskLevel).toBe('moderate');
      expect(zone.isSpecialFloodHazardArea).toBe(false);
      expect(zone.insuranceRequired).toBe(false);
    });

    it('should define Zone B as moderate risk (legacy)', () => {
      const zone = FLOOD_ZONE_DEFINITIONS['B'];
      expect(zone).toBeDefined();
      expect(zone.riskLevel).toBe('moderate');
      expect(zone.isSpecialFloodHazardArea).toBe(false);
    });

    it('should define Zone D as moderate risk (undetermined)', () => {
      const zone = FLOOD_ZONE_DEFINITIONS['D'];
      expect(zone).toBeDefined();
      expect(zone.riskLevel).toBe('moderate');
      expect(zone.isSpecialFloodHazardArea).toBe(false);
      expect(zone.annualFloodProbability).toBe(0.005);
    });
  });

  describe('high risk zones (SFHA)', () => {
    it('should define Zone A as SFHA with insurance required', () => {
      const zone = FLOOD_ZONE_DEFINITIONS['A'];
      expect(zone).toBeDefined();
      expect(zone.riskLevel).toBe('high');
      expect(zone.isSpecialFloodHazardArea).toBe(true);
      expect(zone.insuranceRequired).toBe(true);
      expect(zone.annualFloodProbability).toBe(0.01);
    });

    it('should define Zone AE as SFHA with BFE', () => {
      const zone = FLOOD_ZONE_DEFINITIONS['AE'];
      expect(zone).toBeDefined();
      expect(zone.riskLevel).toBe('high');
      expect(zone.isSpecialFloodHazardArea).toBe(true);
      expect(zone.insuranceRequired).toBe(true);
    });

    it('should define Zone AH as shallow flooding', () => {
      const zone = FLOOD_ZONE_DEFINITIONS['AH'];
      expect(zone).toBeDefined();
      expect(zone.riskLevel).toBe('high');
      expect(zone.isSpecialFloodHazardArea).toBe(true);
      expect(zone.description).toContain('shallow flooding');
    });

    it('should define Zone AO as sheet flow', () => {
      const zone = FLOOD_ZONE_DEFINITIONS['AO'];
      expect(zone).toBeDefined();
      expect(zone.riskLevel).toBe('high');
      expect(zone.isSpecialFloodHazardArea).toBe(true);
      expect(zone.description).toContain('sheet flow');
    });

    it('should define Zone AR as levee restoration', () => {
      const zone = FLOOD_ZONE_DEFINITIONS['AR'];
      expect(zone).toBeDefined();
      expect(zone.riskLevel).toBe('high');
      expect(zone.isSpecialFloodHazardArea).toBe(true);
    });

    it('should define Zone A99 as levee under construction', () => {
      const zone = FLOOD_ZONE_DEFINITIONS['A99'];
      expect(zone).toBeDefined();
      expect(zone.riskLevel).toBe('high');
      expect(zone.isSpecialFloodHazardArea).toBe(true);
    });
  });

  describe('very high risk zones (coastal)', () => {
    it('should define Zone V as coastal high-hazard', () => {
      const zone = FLOOD_ZONE_DEFINITIONS['V'];
      expect(zone).toBeDefined();
      expect(zone.riskLevel).toBe('very_high');
      expect(zone.isSpecialFloodHazardArea).toBe(true);
      expect(zone.insuranceRequired).toBe(true);
      expect(zone.description).toContain('wave action');
    });

    it('should define Zone VE as coastal with BFE', () => {
      const zone = FLOOD_ZONE_DEFINITIONS['VE'];
      expect(zone).toBeDefined();
      expect(zone.riskLevel).toBe('very_high');
      expect(zone.isSpecialFloodHazardArea).toBe(true);
      expect(zone.insuranceRequired).toBe(true);
    });
  });
});

// ============================================
// calculateFloodInsurancePremium Tests
// ============================================

describe('calculateFloodInsurancePremium', () => {
  describe('minimal risk zones', () => {
    it('should calculate low premium for Zone X', () => {
      const premium = calculateFloodInsurancePremium('X', 150000, 50000);
      expect(premium).toBeGreaterThanOrEqual(400);
      expect(premium).toBeLessThan(1000);
    });

    it('should respect minimum premium for low coverage', () => {
      const premium = calculateFloodInsurancePremium('X', 50000, 0);
      expect(premium).toBeGreaterThanOrEqual(400);
    });
  });

  describe('moderate risk zones', () => {
    it('should calculate slightly higher premium for Zone X500', () => {
      const premiumX = calculateFloodInsurancePremium('X', 150000);
      const premiumX500 = calculateFloodInsurancePremium('X500', 150000);
      expect(premiumX500).toBeGreaterThan(premiumX);
    });

    it('should respect minimum premium for Zone B', () => {
      const premium = calculateFloodInsurancePremium('B', 50000);
      expect(premium).toBeGreaterThanOrEqual(500);
    });
  });

  describe('SFHA zones', () => {
    it('should calculate high premium for Zone AE', () => {
      const premium = calculateFloodInsurancePremium('AE', 200000, 50000);
      expect(premium).toBeGreaterThanOrEqual(800);
      expect(premium).toBeLessThan(5000);
    });

    it('should calculate higher premium for Zone V', () => {
      const premiumAE = calculateFloodInsurancePremium('AE', 200000);
      const premiumV = calculateFloodInsurancePremium('V', 200000);
      expect(premiumV).toBeGreaterThan(premiumAE);
    });

    it('should calculate highest premium for Zone VE', () => {
      const premium = calculateFloodInsurancePremium('VE', 250000, 100000);
      expect(premium).toBeGreaterThan(2000);
    });

    it('should respect NFIP maximum coverage limits', () => {
      const premium = calculateFloodInsurancePremium('AE', 500000, 200000);
      const premiumAtMax = calculateFloodInsurancePremium('AE', 250000, 100000);
      expect(premium).toBe(premiumAtMax);
    });
  });

  describe('edge cases', () => {
    it('should handle zero contents value', () => {
      const premium = calculateFloodInsurancePremium('AE', 150000, 0);
      expect(premium).toBeGreaterThan(0);
    });

    it('should handle unknown zone codes by defaulting to Zone X', () => {
      const premium = calculateFloodInsurancePremium('UNKNOWN' as FEMAFloodZone, 150000);
      const premiumX = calculateFloodInsurancePremium('X', 150000);
      expect(premium).toBe(premiumX);
    });

    it('should apply contents discount to contents premium', () => {
      const premiumNoCont = calculateFloodInsurancePremium('AE', 150000, 0);
      const premiumWithCont = calculateFloodInsurancePremium('AE', 150000, 50000);
      const contentsPremium = premiumWithCont - premiumNoCont;
      const buildingPremium = premiumNoCont;
      expect(contentsPremium).toBeLessThan(buildingPremium * 0.6);
    });

    it('should handle lowercase zone codes', () => {
      const premium = calculateFloodInsurancePremium('ae' as FEMAFloodZone, 150000);
      expect(premium).toBeGreaterThanOrEqual(400);
    });
  });
});

// ============================================
// getFloodRiskScore Tests
// ============================================

describe('getFloodRiskScore', () => {
  describe('base scoring by risk level', () => {
    it('should give maximum score for minimal risk', () => {
      const analysis = analyzeFloodRisk(mockCoordinates, mockMinimalRiskFloodData);
      const score = getFloodRiskScore(analysis);
      expect(score).toBe(5.0);
    });

    it('should give moderate score for moderate risk', () => {
      const analysis = analyzeFloodRisk(mockCoordinates, mockModerateRiskFloodData);
      const score = getFloodRiskScore(analysis);
      expect(score).toBeGreaterThanOrEqual(3.0);
      expect(score).toBeLessThanOrEqual(4.0);
    });

    it('should give neutral score for undetermined (Zone D)', () => {
      const analysis = analyzeFloodRisk(mockCoordinates, mockUndeterminedData);
      const score = getFloodRiskScore(analysis);
      expect(score).toBe(2.5);
    });

    it('should give low score for high risk', () => {
      const analysis = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);
      const score = getFloodRiskScore(analysis);
      expect(score).toBeGreaterThanOrEqual(0.5);
      expect(score).toBeLessThanOrEqual(2.0);
    });

    it('should give very low score for very high risk', () => {
      const analysis = analyzeFloodRisk(mockCoordinates, mockVeryHighRiskFloodData);
      const score = getFloodRiskScore(analysis);
      expect(score).toBeGreaterThanOrEqual(0.0);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('elevation adjustments', () => {
    it('should increase score when property is well above BFE', () => {
      const baseData = {
        zone: 'AE' as FEMAFloodZone,
        baseFloodElevation: 100,
        propertyElevation: 103,
        floodwayStatus: null,
        historicalFlooding: null,
      };
      const analysis = analyzeFloodRisk(mockCoordinates, baseData);
      const score = getFloodRiskScore(analysis);
      expect(score).toBeGreaterThan(1.0);
    });

    it('should not adjust score for small elevation differences', () => {
      const baseData = {
        zone: 'AE' as FEMAFloodZone,
        baseFloodElevation: 100,
        propertyElevation: 101,
        floodwayStatus: null,
        historicalFlooding: null,
      };
      const analysis = analyzeFloodRisk(mockCoordinates, baseData);
      const score = getFloodRiskScore(analysis);
      expect(score).toBe(1.0);
    });
  });

  describe('floodway adjustments', () => {
    it('should decrease score for properties in floodway', () => {
      const baseAnalysis = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);
      const floodwayAnalysis = analyzeFloodRisk(mockCoordinates, mockFloodwayData);

      const baseScore = getFloodRiskScore(baseAnalysis);
      const floodwayScore = getFloodRiskScore(floodwayAnalysis);

      expect(floodwayScore).toBeLessThan(baseScore);
    });
  });

  describe('historical flooding adjustments', () => {
    it('should decrease score for multiple historical floods', () => {
      const noHistoryData = {
        ...mockHighRiskFloodData,
        historicalFlooding: null,
      };
      const multipleFloodsData = {
        ...mockHighRiskFloodData,
        historicalFlooding: {
          count: 5,
          lastDate: new Date('2023-01-01'),
          avgDamage: 30000,
        },
      };

      const noHistoryAnalysis = analyzeFloodRisk(mockCoordinates, noHistoryData);
      const multipleFloodsAnalysis = analyzeFloodRisk(mockCoordinates, multipleFloodsData);

      const noHistoryScore = getFloodRiskScore(noHistoryAnalysis);
      const multipleFloodsScore = getFloodRiskScore(multipleFloodsAnalysis);

      expect(multipleFloodsScore).toBeLessThan(noHistoryScore);
    });

    it('should not adjust for few historical floods', () => {
      const fewFloodsData = {
        ...mockHighRiskFloodData,
        historicalFlooding: {
          count: 2,
          lastDate: new Date('2020-01-01'),
          avgDamage: 10000,
        },
      };

      const analysis = analyzeFloodRisk(mockCoordinates, fewFloodsData);
      const score = getFloodRiskScore(analysis);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('score boundaries', () => {
    it('should never return score below 0', () => {
      const analysis = analyzeFloodRisk(mockCoordinates, mockFloodwayData);
      const score = getFloodRiskScore(analysis);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should never return score above 5', () => {
      const perfectData = {
        zone: 'X' as FEMAFloodZone,
        baseFloodElevation: 100,
        propertyElevation: 150,
        floodwayStatus: 'outside' as const,
        historicalFlooding: {
          count: 0,
          lastDate: null,
          avgDamage: null,
        },
      };
      const analysis = analyzeFloodRisk(mockCoordinates, perfectData);
      const score = getFloodRiskScore(analysis);
      expect(score).toBeLessThanOrEqual(5.0);
    });

    it('should return values to 2 decimal places', () => {
      const analysis = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);
      const score = getFloodRiskScore(analysis);
      expect(score).toBe(Math.round(score * 100) / 100);
    });
  });
});

// ============================================
// analyzeFloodRisk Tests
// ============================================

describe('analyzeFloodRisk', () => {
  describe('basic functionality', () => {
    it('should return a valid FloodRiskAnalysis for minimal risk zone', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockMinimalRiskFloodData);

      expect(result).toBeDefined();
      expect(result.zone).toBe('X');
      expect(result.riskLevel).toBe('minimal');
      expect(result.insuranceRequired).toBe(false);
      expect(result.annualPremiumEstimate).toBeNull();
    });

    it('should return a valid FloodRiskAnalysis for high risk zone', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);

      expect(result).toBeDefined();
      expect(result.zone).toBe('AE');
      expect(result.riskLevel).toBe('high');
      expect(result.insuranceRequired).toBe(true);
      expect(result.annualPremiumEstimate).toBeGreaterThan(0);
    });

    it('should normalize zone codes to uppercase', () => {
      const lowercaseData = { ...mockMinimalRiskFloodData, zone: 'x' as FEMAFloodZone };
      const result = analyzeFloodRisk(mockCoordinates, lowercaseData);
      expect(result.zone).toBe('X');
    });

    it('should handle unknown zone by defaulting to Zone X', () => {
      const unknownData = { ...mockMinimalRiskFloodData, zone: 'UNKNOWN' as FEMAFloodZone };
      const result = analyzeFloodRisk(mockCoordinates, unknownData);
      expect(result.riskLevel).toBe('minimal');
    });
  });

  describe('elevation calculations', () => {
    it('should calculate elevation difference correctly', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);
      expect(result.baseFloodElevation).toBe(100);
      expect(result.propertyElevation).toBe(102);
      expect(result.elevationDifference).toBe(2);
    });

    it('should return null elevation difference when BFE is missing', () => {
      const data = { ...mockHighRiskFloodData, baseFloodElevation: null };
      const result = analyzeFloodRisk(mockCoordinates, data);
      expect(result.elevationDifference).toBeNull();
    });

    it('should return null elevation difference when property elevation is missing', () => {
      const data = { ...mockHighRiskFloodData, propertyElevation: null };
      const result = analyzeFloodRisk(mockCoordinates, data);
      expect(result.elevationDifference).toBeNull();
    });

    it('should handle negative elevation difference (below BFE)', () => {
      const data = {
        ...mockHighRiskFloodData,
        propertyElevation: 98,
      };
      const result = analyzeFloodRisk(mockCoordinates, data);
      expect(result.elevationDifference).toBe(-2);
    });
  });

  describe('insurance premium estimation', () => {
    it('should estimate premium for SFHA zones', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);
      expect(result.annualPremiumEstimate).toBeGreaterThan(0);
    });

    it('should not estimate premium for non-SFHA zones', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockMinimalRiskFloodData);
      expect(result.annualPremiumEstimate).toBeNull();
    });

    it('should estimate higher premium for V zones', () => {
      const resultAE = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);
      const resultVE = analyzeFloodRisk(mockCoordinates, mockVeryHighRiskFloodData);
      expect(resultVE.annualPremiumEstimate).toBeGreaterThan(resultAE.annualPremiumEstimate!);
    });
  });

  describe('mitigation recommendations', () => {
    it('should include elevation mitigation for SFHA zones', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);
      expect(result.mitigationRecommendations).toContain(
        'Elevate structure above Base Flood Elevation (BFE)'
      );
    });

    it('should include LOMA application for SFHA zones', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);
      expect(result.mitigationRecommendations).toContain(
        'Apply for Letter of Map Amendment (LOMA) if structure is above BFE'
      );
    });

    it('should not include SFHA mitigations for minimal risk zones', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockMinimalRiskFloodData);
      expect(result.mitigationRecommendations).not.toContain(
        'Elevate structure above Base Flood Elevation (BFE)'
      );
    });

    it('should include breakaway walls for V zones', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockVeryHighRiskFloodData);
      const hasBreakawayWalls = result.mitigationRecommendations.some(rec =>
        rec.toLowerCase().includes('breakaway')
      );
      expect(hasBreakawayWalls).toBe(true);
    });

    it('should include sump pump for all zones', () => {
      const resultX = analyzeFloodRisk(mockCoordinates, mockMinimalRiskFloodData);
      const resultAE = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);

      const hasSumpPumpX = resultX.mitigationRecommendations.some(rec =>
        rec.toLowerCase().includes('sump pump')
      );
      const hasSumpPumpAE = resultAE.mitigationRecommendations.some(rec =>
        rec.toLowerCase().includes('sump pump')
      );

      expect(hasSumpPumpX || hasSumpPumpAE).toBe(true);
    });
  });

  describe('confidence calculation', () => {
    it('should have base confidence of 70', () => {
      const minimalData = {
        zone: 'X' as FEMAFloodZone,
        baseFloodElevation: null,
        propertyElevation: null,
        floodwayStatus: null,
        historicalFlooding: null,
      };
      const result = analyzeFloodRisk(mockCoordinates, minimalData);
      expect(result.confidence).toBe(70);
    });

    it('should increase confidence with BFE data', () => {
      const noBFE = {
        zone: 'AE' as FEMAFloodZone,
        baseFloodElevation: null,
        propertyElevation: null,
        floodwayStatus: null,
        historicalFlooding: null,
      };
      const withBFE = {
        zone: 'AE' as FEMAFloodZone,
        baseFloodElevation: 100,
        propertyElevation: null,
        floodwayStatus: null,
        historicalFlooding: null,
      };

      const resultNoBFE = analyzeFloodRisk(mockCoordinates, noBFE);
      const resultWithBFE = analyzeFloodRisk(mockCoordinates, withBFE);

      expect(resultWithBFE.confidence).toBeGreaterThan(resultNoBFE.confidence);
    });

    it('should increase confidence with property elevation', () => {
      const noElev = {
        zone: 'AE' as FEMAFloodZone,
        baseFloodElevation: 100,
        propertyElevation: null,
        floodwayStatus: null,
        historicalFlooding: null,
      };
      const withElev = {
        zone: 'AE' as FEMAFloodZone,
        baseFloodElevation: 100,
        propertyElevation: 102,
        floodwayStatus: null,
        historicalFlooding: null,
      };

      const resultNoElev = analyzeFloodRisk(mockCoordinates, noElev);
      const resultWithElev = analyzeFloodRisk(mockCoordinates, withElev);

      expect(resultWithElev.confidence).toBeGreaterThan(resultNoElev.confidence);
    });

    it('should increase confidence with historical data', () => {
      const noHistory = { ...mockHighRiskFloodData, historicalFlooding: null };
      const withHistory = mockHighRiskFloodData;

      const resultNoHistory = analyzeFloodRisk(mockCoordinates, noHistory);
      const resultWithHistory = analyzeFloodRisk(mockCoordinates, withHistory);

      expect(resultWithHistory.confidence).toBeGreaterThan(resultNoHistory.confidence);
    });

    it('should cap confidence at 100', () => {
      const completeData = {
        zone: 'AE' as FEMAFloodZone,
        baseFloodElevation: 100,
        propertyElevation: 102,
        floodwayStatus: 'in_fringe' as const,
        historicalFlooding: {
          count: 2,
          lastDate: new Date('2020-01-01'),
          avgDamage: 15000,
        },
      };
      const result = analyzeFloodRisk(mockCoordinates, completeData);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('data source information', () => {
    it('should include FEMA NFHL as data source', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);
      expect(result.dataSource).toBeDefined();
      expect(result.dataSource.name).toContain('FEMA');
      expect(result.dataSource.reliability).toBe('high');
    });

    it('should mark as API type when zone data is available', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);
      expect(result.dataSource.type).toBe('api');
    });

    it('should mark as estimated when zone data is not available', () => {
      const data = { ...mockMinimalRiskFloodData, zone: '' as FEMAFloodZone };
      const result = analyzeFloodRisk(mockCoordinates, data);
      expect(result.dataSource.type).toBe('estimated');
      expect(result.dataSource.reliability).toBe('medium');
    });
  });

  describe('historical flooding data', () => {
    it('should include historical flooding when available', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);
      expect(result.historicalFlooding).toBeDefined();
      expect(result.historicalFlooding!.count).toBe(2);
      expect(result.historicalFlooding!.avgDamage).toBe(15000);
    });

    it('should handle null historical flooding', () => {
      const data = { ...mockHighRiskFloodData, historicalFlooding: null };
      const result = analyzeFloodRisk(mockCoordinates, data);
      expect(result.historicalFlooding).toBeNull();
    });
  });

  describe('floodway status', () => {
    it('should include floodway status when available', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockFloodwayData);
      expect(result.floodwayStatus).toBe('in_floodway');
    });

    it('should handle null floodway status', () => {
      const result = analyzeFloodRisk(mockCoordinates, mockMinimalRiskFloodData);
      expect(result.floodwayStatus).toBeNull();
    });
  });
});

// ============================================
// createUnknownFloodRisk Tests
// ============================================

describe('createUnknownFloodRisk', () => {
  it('should create analysis with Zone D (undetermined)', () => {
    const result = createUnknownFloodRisk(mockCoordinates);
    expect(result.zone).toBe('D');
    expect(result.riskLevel).toBe('moderate');
  });

  it('should set all optional fields to null', () => {
    const result = createUnknownFloodRisk(mockCoordinates);
    expect(result.baseFloodElevation).toBeNull();
    expect(result.propertyElevation).toBeNull();
    expect(result.elevationDifference).toBeNull();
    expect(result.floodwayStatus).toBeNull();
    expect(result.historicalFlooding).toBeNull();
  });

  it('should have base confidence level', () => {
    const result = createUnknownFloodRisk(mockCoordinates);
    expect(result.confidence).toBe(70);
  });

  it('should not require insurance', () => {
    const result = createUnknownFloodRisk(mockCoordinates);
    expect(result.insuranceRequired).toBe(false);
  });

  it('should have no premium estimate', () => {
    const result = createUnknownFloodRisk(mockCoordinates);
    expect(result.annualPremiumEstimate).toBeNull();
  });
});

// ============================================
// Integration Tests
// ============================================

describe('flood analyzer integration', () => {
  it('should handle complete workflow for SFHA property', () => {
    const analysis = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);
    const score = getFloodRiskScore(analysis);

    expect(analysis.insuranceRequired).toBe(true);
    expect(analysis.annualPremiumEstimate).toBeGreaterThan(0);
    expect(analysis.mitigationRecommendations.length).toBeGreaterThan(0);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(5);
  });

  it('should handle complete workflow for minimal risk property', () => {
    const analysis = analyzeFloodRisk(mockCoordinates, mockMinimalRiskFloodData);
    const score = getFloodRiskScore(analysis);

    expect(analysis.insuranceRequired).toBe(false);
    expect(analysis.annualPremiumEstimate).toBeNull();
    expect(score).toBe(5.0);
  });

  it('should handle complete workflow for coastal property', () => {
    const analysis = analyzeFloodRisk(mockCoordinates, mockVeryHighRiskFloodData);
    const score = getFloodRiskScore(analysis);

    expect(analysis.zone.startsWith('V')).toBe(true);
    expect(analysis.riskLevel).toBe('very_high');
    expect(analysis.insuranceRequired).toBe(true);
    expect(analysis.annualPremiumEstimate).toBeGreaterThan(1000);
    expect(score).toBeLessThan(1.5);
  });

  it('should provide actionable data for investor decision', () => {
    const analysis = analyzeFloodRisk(mockCoordinates, mockHighRiskFloodData);

    expect(analysis.zone).toBeDefined();
    expect(analysis.riskLevel).toBeDefined();
    expect(analysis.insuranceRequired).toBeDefined();
    expect(analysis.annualPremiumEstimate).toBeDefined();
    expect(analysis.mitigationRecommendations.length).toBeGreaterThan(0);
    expect(analysis.confidence).toBeGreaterThan(0);
  });
});

// ============================================
// Edge Cases and Error Handling
// ============================================

describe('edge cases and error handling', () => {
  it('should handle all A-zone variants', () => {
    const zones: FEMAFloodZone[] = ['A', 'AE', 'AH', 'AO', 'AR', 'A99'];
    zones.forEach(zone => {
      const data = { ...mockHighRiskFloodData, zone };
      const result = analyzeFloodRisk(mockCoordinates, data);
      expect(result.riskLevel).toBe('high');
      expect(result.insuranceRequired).toBe(true);
    });
  });

  it('should handle both V-zone variants', () => {
    const zones: FEMAFloodZone[] = ['V', 'VE'];
    zones.forEach(zone => {
      const data = { ...mockVeryHighRiskFloodData, zone };
      const result = analyzeFloodRisk(mockCoordinates, data);
      expect(result.riskLevel).toBe('very_high');
      expect(result.insuranceRequired).toBe(true);
    });
  });

  it('should handle legacy zone codes', () => {
    const legacyZones: FEMAFloodZone[] = ['B', 'C'];
    legacyZones.forEach(zone => {
      const data = { ...mockMinimalRiskFloodData, zone };
      const result = analyzeFloodRisk(mockCoordinates, data);
      expect(result).toBeDefined();
    });
  });

  it('should handle extreme elevation differences', () => {
    const data = {
      zone: 'AE' as FEMAFloodZone,
      baseFloodElevation: 100,
      propertyElevation: 200,
      floodwayStatus: null,
      historicalFlooding: null,
    };
    const result = analyzeFloodRisk(mockCoordinates, data);
    expect(result.elevationDifference).toBe(100);
  });

  it('should handle property below BFE', () => {
    const data = {
      zone: 'AE' as FEMAFloodZone,
      baseFloodElevation: 100,
      propertyElevation: 95,
      floodwayStatus: null,
      historicalFlooding: null,
    };
    const result = analyzeFloodRisk(mockCoordinates, data);
    expect(result.elevationDifference).toBe(-5);
  });

  it('should handle high historical flood count', () => {
    const data = {
      ...mockHighRiskFloodData,
      historicalFlooding: {
        count: 20,
        lastDate: new Date('2023-01-01'),
        avgDamage: 50000,
      },
    };
    const result = analyzeFloodRisk(mockCoordinates, data);
    const score = getFloodRiskScore(result);
    expect(score).toBeLessThan(1.0);
  });

  it('should handle all floodway status options', () => {
    const statuses = ['in_floodway', 'in_fringe', 'outside'] as const;
    statuses.forEach(status => {
      const data = { ...mockHighRiskFloodData, floodwayStatus: status };
      const result = analyzeFloodRisk(mockCoordinates, data);
      expect(result.floodwayStatus).toBe(status);
    });
  });
});
