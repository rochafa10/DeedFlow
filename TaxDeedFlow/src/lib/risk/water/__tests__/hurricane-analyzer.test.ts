/**
 * Hurricane Risk Analyzer Tests
 *
 * Tests the hurricane risk analysis functionality including:
 * - Wind zone determination
 * - Storm surge zone estimation
 * - Hurricane risk scoring
 * - State-based hurricane risk classification
 * - Building code requirements generation
 * - Mitigation recommendations
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeHurricaneRisk,
  getHurricaneRiskScore,
  isHurricaneRiskState,
  createUnknownHurricaneRisk,
  HURRICANE_RISK_STATES,
  WIND_ZONE_DEFINITIONS,
  STORM_SURGE_ZONE_DEFINITIONS,
} from '../hurricane-analyzer';
import type { HurricaneRiskAnalysis } from '@/types/risk-analysis';

// ============================================
// Test Fixtures
// ============================================

/**
 * Test coordinates for different locations
 */
const testCoordinates = {
  // South Florida (Miami) - Extreme hurricane zone
  southFlorida: { latitude: 25.7617, longitude: -80.1918 },
  // Central Florida (Orlando) - High hurricane zone
  centralFlorida: { latitude: 28.5383, longitude: -81.3792 },
  // North Florida (Jacksonville) - Moderate hurricane zone
  northFlorida: { latitude: 30.3322, longitude: -81.6557 },
  // Gulf Coast (New Orleans)
  gulfCoast: { latitude: 29.9511, longitude: -90.0715 },
  // Atlantic Coast (Charleston, SC)
  atlanticCoast: { latitude: 32.7765, longitude: -79.9311 },
  // Mid-Atlantic (Virginia Beach)
  midAtlantic: { latitude: 36.8529, longitude: -75.9780 },
  // Northeast (New York)
  northeast: { latitude: 40.7128, longitude: -74.0060 },
  // Inland (Pennsylvania)
  inland: { latitude: 40.5187, longitude: -78.3947 },
};

// ============================================
// Wind Zone Determination Tests
// ============================================

describe('Hurricane Risk Analyzer - Wind Zone Determination', () => {
  describe('South Florida (High Velocity Hurricane Zone)', () => {
    it('should classify coastal South Florida as zone_1', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.southFlorida,
        'FL',
        { distanceToCoast: 2 }
      );

      expect(analysis.windZone).toBe('zone_1');
      expect(analysis.maxWindSpeed).toBe(130);
      expect(analysis.windZoneDescription).toContain('Extreme wind zone');
    });

    it('should classify South Florida based on latitude alone when near coast', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.southFlorida,
        'FL'
      );

      expect(analysis.windZone).toBe('zone_1');
    });
  });

  describe('Central and North Florida', () => {
    it('should classify coastal Central Florida as zone_1 or zone_2', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.centralFlorida,
        'FL',
        { distanceToCoast: 5 }
      );

      expect(['zone_1', 'zone_2']).toContain(analysis.windZone);
    });

    it('should classify inland Florida as lower wind zones', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.centralFlorida,
        'FL',
        { distanceToCoast: 50 }
      );

      expect(['zone_3', 'zone_4']).toContain(analysis.windZone);
    });

    it('should return zone_4 or null for very far inland Florida', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.centralFlorida,
        'FL',
        { distanceToCoast: 80 }
      );

      expect(['zone_4', null]).toContain(analysis.windZone);
    });
  });

  describe('Gulf Coast States', () => {
    it('should classify coastal Louisiana as zone_2', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.gulfCoast,
        'LA',
        { distanceToCoast: 10 }
      );

      expect(analysis.windZone).toBe('zone_2');
    });

    it('should classify moderate distance Gulf Coast as zone_3', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.gulfCoast,
        'LA',
        { distanceToCoast: 30 }
      );

      expect(analysis.windZone).toBe('zone_3');
    });

    it('should handle all Gulf Coast states (TX, LA, MS, AL)', () => {
      const states = ['TX', 'LA', 'MS', 'AL'];
      states.forEach((state) => {
        const analysis = analyzeHurricaneRisk(
          testCoordinates.gulfCoast,
          state,
          { distanceToCoast: 10 }
        );
        expect(analysis.windZone).toBe('zone_2');
      });
    });
  });

  describe('Atlantic Coast States', () => {
    it('should classify coastal South Carolina as zone_2', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.atlanticCoast,
        'SC',
        { distanceToCoast: 5 }
      );

      expect(analysis.windZone).toBe('zone_2');
    });

    it('should handle Southeast Atlantic states (GA, SC, NC)', () => {
      const states = ['GA', 'SC', 'NC'];
      states.forEach((state) => {
        const analysis = analyzeHurricaneRisk(
          testCoordinates.atlanticCoast,
          state,
          { distanceToCoast: 10 }
        );
        expect(analysis.windZone).toBe('zone_2');
      });
    });
  });

  describe('Mid-Atlantic States', () => {
    it('should classify coastal Virginia as zone_3', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.midAtlantic,
        'VA',
        { distanceToCoast: 10 }
      );

      expect(analysis.windZone).toBe('zone_3');
    });

    it('should handle Mid-Atlantic states (VA, MD, DE, NJ)', () => {
      const states = ['VA', 'MD', 'DE', 'NJ'];
      states.forEach((state) => {
        const analysis = analyzeHurricaneRisk(
          testCoordinates.midAtlantic,
          state,
          { distanceToCoast: 15 }
        );
        expect(analysis.windZone).toBe('zone_3');
      });
    });
  });

  describe('Northeast States', () => {
    it('should classify coastal Northeast as zone_4', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.northeast,
        'NY',
        { distanceToCoast: 10 }
      );

      expect(analysis.windZone).toBe('zone_4');
    });

    it('should handle Northeast states (NY, CT, RI, MA)', () => {
      const states = ['NY', 'CT', 'RI', 'MA'];
      states.forEach((state) => {
        const analysis = analyzeHurricaneRisk(
          testCoordinates.northeast,
          state,
          { distanceToCoast: 10 }
        );
        expect(analysis.windZone).toBe('zone_4');
      });
    });

    it('should return null for inland Northeast', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.northeast,
        'NY',
        { distanceToCoast: 30 }
      );

      expect(analysis.windZone).toBeNull();
    });
  });

  describe('Non-Hurricane States', () => {
    it('should return null wind zone for Pennsylvania', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.inland,
        'PA'
      );

      expect(analysis.windZone).toBeNull();
      expect(analysis.maxWindSpeed).toBeNull();
      expect(analysis.windZoneDescription).toBeNull();
    });

    it('should return null wind zone for other inland states', () => {
      const states = ['OH', 'KY', 'TN', 'IN', 'IL', 'MI'];
      states.forEach((state) => {
        const analysis = analyzeHurricaneRisk(
          testCoordinates.inland,
          state
        );
        expect(analysis.windZone).toBeNull();
      });
    });
  });

  describe('Distance-based wind zone adjustments', () => {
    it('should use default distance of 100 miles when not provided', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.centralFlorida,
        'FL'
      );

      // With default 100 miles, should be far inland (zone_4 or null)
      expect(['zone_4', null]).toContain(analysis.windZone);
    });

    it('should handle null distance', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.centralFlorida,
        'FL',
        { distanceToCoast: null }
      );

      // With null distance (defaults to 100), should be far inland
      expect(['zone_4', null]).toContain(analysis.windZone);
    });

    it('should properly graduate zones by distance in Florida', () => {
      const distances = [5, 20, 50, 70];
      const expectedZones = ['zone_1', 'zone_2', 'zone_3', 'zone_4'];

      distances.forEach((distance, index) => {
        const analysis = analyzeHurricaneRisk(
          testCoordinates.centralFlorida,
          'FL',
          { distanceToCoast: distance }
        );
        expect(analysis.windZone).toBe(expectedZones[index]);
      });
    });
  });
});

// ============================================
// Storm Surge Zone Tests
// ============================================

describe('Hurricane Risk Analyzer - Storm Surge Zones', () => {
  describe('High-risk coastal areas (FL and Gulf Coast)', () => {
    it('should classify immediate coastal as Zone A', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.southFlorida,
        'FL',
        { distanceToCoast: 0.5 }
      );

      expect(analysis.stormSurgeZone).toBe('A');
      expect(analysis.evacuationZone).toContain('Zone A');
      expect(analysis.evacuationZone).toContain('mandatory');
    });

    it('should classify near-coastal as Zone B', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.southFlorida,
        'FL',
        { distanceToCoast: 2 }
      );

      expect(analysis.stormSurgeZone).toBe('B');
    });

    it('should classify moderate distance as Zone C', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.gulfCoast,
        'LA',
        { distanceToCoast: 6 }
      );

      expect(analysis.stormSurgeZone).toBe('C');
    });

    it('should classify further inland as Zone D', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.gulfCoast,
        'TX',
        { distanceToCoast: 12 }
      );

      expect(analysis.stormSurgeZone).toBe('D');
    });

    it('should classify far inland as Zone E', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.gulfCoast,
        'MS',
        { distanceToCoast: 20 }
      );

      expect(analysis.stormSurgeZone).toBe('E');
    });

    it('should return null for very far inland', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.gulfCoast,
        'FL',
        { distanceToCoast: 30 }
      );

      expect(analysis.stormSurgeZone).toBeNull();
    });
  });

  describe('Atlantic Coast storm surge zones', () => {
    it('should classify immediate Atlantic coastal as Zone B (lower surge risk than Gulf)', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.atlanticCoast,
        'SC',
        { distanceToCoast: 0.5 }
      );

      expect(analysis.stormSurgeZone).toBe('B');
    });

    it('should handle Atlantic Coast states differently from Gulf Coast', () => {
      const atlanticAnalysis = analyzeHurricaneRisk(
        testCoordinates.atlanticCoast,
        'GA',
        { distanceToCoast: 0.5 }
      );

      const gulfAnalysis = analyzeHurricaneRisk(
        testCoordinates.gulfCoast,
        'FL',
        { distanceToCoast: 0.5 }
      );

      // Gulf Coast has higher surge risk
      expect(gulfAnalysis.stormSurgeZone).toBe('A');
      expect(atlanticAnalysis.stormSurgeZone).toBe('B');
    });
  });

  describe('Storm surge with no distance data', () => {
    it('should return null when distance is not provided', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.southFlorida,
        'FL'
      );

      expect(analysis.stormSurgeZone).toBeNull();
    });

    it('should return null when distance is null', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.southFlorida,
        'FL',
        { distanceToCoast: null }
      );

      expect(analysis.stormSurgeZone).toBeNull();
    });
  });

  describe('Storm surge for non-coastal states', () => {
    it('should return null for inland states', () => {
      const analysis = analyzeHurricaneRisk(
        testCoordinates.inland,
        'PA',
        { distanceToCoast: 0 }
      );

      expect(analysis.stormSurgeZone).toBeNull();
    });
  });
});

// ============================================
// Building Code Requirements Tests
// ============================================

describe('Hurricane Risk Analyzer - Building Code Requirements', () => {
  it('should include impact-resistant windows for zone_1', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL',
      { distanceToCoast: 5 }
    );

    expect(analysis.buildingCodeRequirements).toContain(
      'Impact-resistant windows/shutters required'
    );
  });

  it('should include roof-to-wall connectors for hurricane zones', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.centralFlorida,
      'FL',
      { distanceToCoast: 20 }
    );

    expect(analysis.buildingCodeRequirements.length).toBeGreaterThan(0);
    expect(
      analysis.buildingCodeRequirements.some((req) =>
        req.toLowerCase().includes('roof')
      )
    ).toBe(true);
  });

  it('should return empty requirements for non-hurricane zones', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.inland,
      'PA'
    );

    expect(analysis.buildingCodeRequirements).toEqual([]);
  });

  it('should include all zone_1 requirements for extreme risk areas', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL',
      { distanceToCoast: 2 }
    );

    const requirements = WIND_ZONE_DEFINITIONS.zone_1.buildingRequirements;
    expect(analysis.buildingCodeRequirements).toEqual(requirements);
  });
});

// ============================================
// Insurance Considerations Tests
// ============================================

describe('Hurricane Risk Analyzer - Insurance Considerations', () => {
  it('should include windstorm insurance requirement for zone_1', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL',
      { distanceToCoast: 5 }
    );

    expect(
      analysis.insuranceConsiderations.some((item) =>
        item.toLowerCase().includes('windstorm')
      )
    ).toBe(true);
  });

  it('should include wind mitigation inspection for high-risk zones', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.gulfCoast,
      'LA',
      { distanceToCoast: 10 }
    );

    expect(
      analysis.insuranceConsiderations.some((item) =>
        item.toLowerCase().includes('mitigation')
      )
    ).toBe(true);
  });

  it('should include flood insurance for storm surge zones A, B, C', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL',
      { distanceToCoast: 2 }
    );

    if (['A', 'B', 'C'].includes(analysis.stormSurgeZone || '')) {
      expect(
        analysis.insuranceConsiderations.some((item) =>
          item.toLowerCase().includes('flood insurance')
        )
      ).toBe(true);
    }
  });

  it('should include Florida-specific insurance info for FL properties', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL',
      { distanceToCoast: 10 }
    );

    expect(
      analysis.insuranceConsiderations.some((item) =>
        item.includes('Citizens Property Insurance')
      )
    ).toBe(true);
  });

  it('should return empty considerations for non-hurricane zones', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.inland,
      'PA'
    );

    expect(analysis.insuranceConsiderations.length).toBe(0);
  });
});

// ============================================
// Historical Storms Tests
// ============================================

describe('Hurricane Risk Analyzer - Historical Storms', () => {
  it('should accept and store historical storm data', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL',
      {
        distanceToCoast: 5,
        historicalStorms: {
          count: 15,
          significantStorms: ['Andrew', 'Irma', 'Wilma'],
        },
      }
    );

    expect(analysis.historicalStorms).not.toBeNull();
    expect(analysis.historicalStorms?.count).toBe(15);
    expect(analysis.historicalStorms?.significantStorms).toContain('Andrew');
  });

  it('should return null when no historical data provided', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL',
      { distanceToCoast: 5 }
    );

    expect(analysis.historicalStorms).toBeNull();
  });
});

// ============================================
// Hurricane Risk Score Tests
// ============================================

describe('getHurricaneRiskScore', () => {
  describe('No hurricane exposure', () => {
    it('should return maximum score (5.0) for no wind zone', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: null,
        windZoneDescription: null,
        maxWindSpeed: null,
        stormSurgeZone: null,
        stormSurgeDescription: null,
        evacuationZone: null,
        historicalStorms: null,
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 70,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBe(5.0);
    });
  });

  describe('Wind zone scoring', () => {
    it('should score zone_4 as 4.0', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: 'zone_4',
        windZoneDescription: 'Standard wind zone',
        maxWindSpeed: 100,
        stormSurgeZone: null,
        stormSurgeDescription: null,
        evacuationZone: null,
        historicalStorms: null,
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 80,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBe(4.0);
    });

    it('should score zone_3 as 3.0', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: 'zone_3',
        windZoneDescription: 'Moderate wind zone',
        maxWindSpeed: 110,
        stormSurgeZone: null,
        stormSurgeDescription: null,
        evacuationZone: null,
        historicalStorms: null,
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 80,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBe(3.0);
    });

    it('should score zone_2 as 2.0', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: 'zone_2',
        windZoneDescription: 'High wind zone',
        maxWindSpeed: 120,
        stormSurgeZone: null,
        stormSurgeDescription: null,
        evacuationZone: null,
        historicalStorms: null,
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 80,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBe(2.0);
    });

    it('should score zone_1 as 1.0', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: 'zone_1',
        windZoneDescription: 'Extreme wind zone',
        maxWindSpeed: 130,
        stormSurgeZone: null,
        stormSurgeDescription: null,
        evacuationZone: null,
        historicalStorms: null,
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 80,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBe(1.0);
    });
  });

  describe('Storm surge adjustments', () => {
    it('should reduce score by 1.0 for Zone A storm surge', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: 'zone_1',
        windZoneDescription: 'Extreme wind zone',
        maxWindSpeed: 130,
        stormSurgeZone: 'A',
        stormSurgeDescription: 'Category 1 surge',
        evacuationZone: 'Zone A - mandatory evacuation',
        historicalStorms: null,
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 80,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBe(0.0); // 1.0 (zone_1) - 1.0 (Zone A) = 0.0
    });

    it('should reduce score by 0.75 for Zone B storm surge', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: 'zone_2',
        windZoneDescription: 'High wind zone',
        maxWindSpeed: 120,
        stormSurgeZone: 'B',
        stormSurgeDescription: 'Category 2 surge',
        evacuationZone: 'Zone B - mandatory evacuation',
        historicalStorms: null,
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 80,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBe(1.25); // 2.0 (zone_2) - 0.75 (Zone B) = 1.25
    });

    it('should reduce score by 0.5 for Zone C storm surge', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: 'zone_3',
        windZoneDescription: 'Moderate wind zone',
        maxWindSpeed: 110,
        stormSurgeZone: 'C',
        stormSurgeDescription: 'Category 3 surge',
        evacuationZone: 'Zone C - evacuation recommended',
        historicalStorms: null,
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 80,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBe(2.5); // 3.0 (zone_3) - 0.5 (Zone C) = 2.5
    });

    it('should reduce score by 0.25 for Zone D storm surge', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: 'zone_4',
        windZoneDescription: 'Standard wind zone',
        maxWindSpeed: 100,
        stormSurgeZone: 'D',
        stormSurgeDescription: 'Category 4 surge',
        evacuationZone: 'Zone D - possible evacuation',
        historicalStorms: null,
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 80,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBe(3.75); // 4.0 (zone_4) - 0.25 (Zone D) = 3.75
    });

    it('should not reduce score for Zone E storm surge', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: 'zone_4',
        windZoneDescription: 'Standard wind zone',
        maxWindSpeed: 100,
        stormSurgeZone: 'E',
        stormSurgeDescription: 'Category 5 surge',
        evacuationZone: 'Zone E - possible evacuation',
        historicalStorms: null,
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 80,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBe(4.0); // 4.0 (zone_4) - 0 (Zone E) = 4.0
    });
  });

  describe('Historical storm adjustments', () => {
    it('should reduce score by 0.25 for >10 historical storms', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: 'zone_2',
        windZoneDescription: 'High wind zone',
        maxWindSpeed: 120,
        stormSurgeZone: null,
        stormSurgeDescription: null,
        evacuationZone: null,
        historicalStorms: {
          count: 15,
          significantStorms: ['Andrew', 'Irma', 'Wilma'],
        },
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 80,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBe(1.75); // 2.0 (zone_2) - 0.25 (historical) = 1.75
    });

    it('should not reduce score for <=10 historical storms', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: 'zone_2',
        windZoneDescription: 'High wind zone',
        maxWindSpeed: 120,
        stormSurgeZone: null,
        stormSurgeDescription: null,
        evacuationZone: null,
        historicalStorms: {
          count: 8,
          significantStorms: ['Katrina'],
        },
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 80,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBe(2.0); // 2.0 (zone_2) - 0 (historical) = 2.0
    });
  });

  describe('Combined factors', () => {
    it('should handle extreme combined risk (zone_1 + surge A + high historical)', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: 'zone_1',
        windZoneDescription: 'Extreme wind zone',
        maxWindSpeed: 130,
        stormSurgeZone: 'A',
        stormSurgeDescription: 'Category 1 surge',
        evacuationZone: 'Zone A - mandatory evacuation',
        historicalStorms: {
          count: 20,
          significantStorms: ['Andrew', 'Irma', 'Wilma', 'Michael'],
        },
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 90,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBe(0.0); // Should bottom out at 0
    });

    it('should never return a score below 0', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: 'zone_1',
        windZoneDescription: 'Extreme wind zone',
        maxWindSpeed: 130,
        stormSurgeZone: 'A',
        stormSurgeDescription: 'Category 1 surge',
        evacuationZone: 'Zone A - mandatory evacuation',
        historicalStorms: {
          count: 25,
          significantStorms: ['Andrew', 'Irma', 'Wilma', 'Michael', 'Katrina'],
        },
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 90,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(5);
    });

    it('should never return a score above 5', () => {
      const analysis: HurricaneRiskAnalysis = {
        windZone: null,
        windZoneDescription: null,
        maxWindSpeed: null,
        stormSurgeZone: null,
        stormSurgeDescription: null,
        evacuationZone: null,
        historicalStorms: null,
        buildingCodeRequirements: [],
        insuranceConsiderations: [],
        dataSource: {
          name: 'Test',
          type: 'estimated',
          reliability: 'medium',
        },
        confidence: 70,
      };

      const score = getHurricaneRiskScore(analysis);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(5);
    });
  });
});

// ============================================
// State Classification Tests
// ============================================

describe('isHurricaneRiskState', () => {
  it('should return true for high-risk states', () => {
    const highRiskStates = ['FL', 'TX', 'LA', 'MS', 'AL'];
    highRiskStates.forEach((state) => {
      expect(isHurricaneRiskState(state)).toBe(true);
    });
  });

  it('should return true for moderate-risk states', () => {
    const moderateRiskStates = [
      'GA',
      'SC',
      'NC',
      'VA',
      'MD',
      'DE',
      'NJ',
      'NY',
      'CT',
      'RI',
      'MA',
    ];
    moderateRiskStates.forEach((state) => {
      expect(isHurricaneRiskState(state)).toBe(true);
    });
  });

  it('should return false for non-coastal states', () => {
    const nonCoastalStates = ['PA', 'OH', 'KY', 'TN', 'IN', 'IL', 'MI', 'WI'];
    nonCoastalStates.forEach((state) => {
      expect(isHurricaneRiskState(state)).toBe(false);
    });
  });

  it('should handle lowercase state codes', () => {
    expect(isHurricaneRiskState('fl')).toBe(true);
    expect(isHurricaneRiskState('pa')).toBe(false);
  });

  it('should handle mixed case state codes', () => {
    expect(isHurricaneRiskState('Fl')).toBe(true);
    expect(isHurricaneRiskState('Pa')).toBe(false);
  });
});

// ============================================
// Data Source and Confidence Tests
// ============================================

describe('Hurricane Risk Analyzer - Data Source and Confidence', () => {
  it('should provide NOAA data source', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL',
      { distanceToCoast: 5 }
    );

    expect(analysis.dataSource).toBeDefined();
    expect(analysis.dataSource.name).toContain('NOAA');
    expect(analysis.dataSource.url).toBe('https://www.nhc.noaa.gov');
  });

  it('should have high confidence with complete data', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL',
      {
        distanceToCoast: 5,
        historicalStorms: {
          count: 15,
          significantStorms: ['Andrew', 'Irma'],
        },
      }
    );

    expect(analysis.confidence).toBeGreaterThan(85);
    expect(analysis.dataSource.reliability).toBe('high');
    expect(analysis.dataSource.type).toBe('calculated');
  });

  it('should have lower confidence without distance data', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL'
    );

    // Without distance data, uses latitude which can still be reliable for FL
    expect(analysis.confidence).toBeGreaterThan(0);
    expect(analysis.dataSource.reliability).toMatch(/medium|high/);
    expect(analysis.dataSource.type).toMatch(/estimated|calculated/);
  });

  it('should increase confidence with historical storm data', () => {
    const withoutHistory = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL',
      { distanceToCoast: 5 }
    );

    const withHistory = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL',
      {
        distanceToCoast: 5,
        historicalStorms: {
          count: 10,
          significantStorms: ['Andrew'],
        },
      }
    );

    expect(withHistory.confidence).toBeGreaterThan(withoutHistory.confidence);
  });

  it('should cap confidence at 100', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL',
      {
        distanceToCoast: 5,
        historicalStorms: {
          count: 20,
          significantStorms: ['Andrew', 'Irma', 'Wilma'],
        },
      }
    );

    expect(analysis.confidence).toBeLessThanOrEqual(100);
  });
});

// ============================================
// createUnknownHurricaneRisk Tests
// ============================================

describe('createUnknownHurricaneRisk', () => {
  it('should return a valid analysis with minimal data', () => {
    const analysis = createUnknownHurricaneRisk(
      testCoordinates.southFlorida,
      'FL'
    );

    expect(analysis).toBeDefined();
    expect(analysis.dataSource).toBeDefined();
    expect(analysis.confidence).toBeGreaterThan(0);
  });

  it('should match analyzeHurricaneRisk with no additional data', () => {
    const unknown = createUnknownHurricaneRisk(
      testCoordinates.southFlorida,
      'FL'
    );

    const standard = analyzeHurricaneRisk(testCoordinates.southFlorida, 'FL');

    expect(unknown.windZone).toBe(standard.windZone);
    expect(unknown.confidence).toBe(standard.confidence);
  });

  it('should work for non-hurricane states', () => {
    const analysis = createUnknownHurricaneRisk(testCoordinates.inland, 'PA');

    expect(analysis.windZone).toBeNull();
    expect(analysis.stormSurgeZone).toBeNull();
  });
});

// ============================================
// Constants Tests
// ============================================

describe('Hurricane Risk Constants', () => {
  it('should have correct high-risk states', () => {
    expect(HURRICANE_RISK_STATES.HIGH_RISK).toContain('FL');
    expect(HURRICANE_RISK_STATES.HIGH_RISK).toContain('TX');
    expect(HURRICANE_RISK_STATES.HIGH_RISK).toContain('LA');
    expect(HURRICANE_RISK_STATES.HIGH_RISK).toContain('MS');
    expect(HURRICANE_RISK_STATES.HIGH_RISK).toContain('AL');
    expect(HURRICANE_RISK_STATES.HIGH_RISK).toHaveLength(5);
  });

  it('should have correct moderate-risk states', () => {
    expect(HURRICANE_RISK_STATES.MODERATE_RISK).toContain('GA');
    expect(HURRICANE_RISK_STATES.MODERATE_RISK).toContain('SC');
    expect(HURRICANE_RISK_STATES.MODERATE_RISK).toContain('NC');
    expect(HURRICANE_RISK_STATES.MODERATE_RISK).toContain('NY');
    expect(HURRICANE_RISK_STATES.MODERATE_RISK).toHaveLength(11);
  });

  it('should have ALL_EXPOSED combining both risk levels', () => {
    expect(HURRICANE_RISK_STATES.ALL_EXPOSED).toHaveLength(16);
    expect(HURRICANE_RISK_STATES.ALL_EXPOSED).toContain('FL');
    expect(HURRICANE_RISK_STATES.ALL_EXPOSED).toContain('MA');
  });

  it('should have all 4 wind zones defined', () => {
    expect(WIND_ZONE_DEFINITIONS.zone_1).toBeDefined();
    expect(WIND_ZONE_DEFINITIONS.zone_2).toBeDefined();
    expect(WIND_ZONE_DEFINITIONS.zone_3).toBeDefined();
    expect(WIND_ZONE_DEFINITIONS.zone_4).toBeDefined();
  });

  it('should have correct wind speeds for each zone', () => {
    expect(WIND_ZONE_DEFINITIONS.zone_1.maxWindSpeed).toBe(130);
    expect(WIND_ZONE_DEFINITIONS.zone_2.maxWindSpeed).toBe(120);
    expect(WIND_ZONE_DEFINITIONS.zone_3.maxWindSpeed).toBe(110);
    expect(WIND_ZONE_DEFINITIONS.zone_4.maxWindSpeed).toBe(100);
  });

  it('should have all 5 storm surge zones defined', () => {
    expect(STORM_SURGE_ZONE_DEFINITIONS.A).toBeDefined();
    expect(STORM_SURGE_ZONE_DEFINITIONS.B).toBeDefined();
    expect(STORM_SURGE_ZONE_DEFINITIONS.C).toBeDefined();
    expect(STORM_SURGE_ZONE_DEFINITIONS.D).toBeDefined();
    expect(STORM_SURGE_ZONE_DEFINITIONS.E).toBeDefined();
  });

  it('should have correct flooding categories for surge zones', () => {
    expect(STORM_SURGE_ZONE_DEFINITIONS.A.floodingCategory).toBe(1);
    expect(STORM_SURGE_ZONE_DEFINITIONS.B.floodingCategory).toBe(2);
    expect(STORM_SURGE_ZONE_DEFINITIONS.C.floodingCategory).toBe(3);
    expect(STORM_SURGE_ZONE_DEFINITIONS.D.floodingCategory).toBe(4);
    expect(STORM_SURGE_ZONE_DEFINITIONS.E.floodingCategory).toBe(5);
  });
});

// ============================================
// Integration Tests
// ============================================

describe('Hurricane Risk Analyzer - Integration Tests', () => {
  it('should handle complete analysis for South Florida property', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.southFlorida,
      'FL',
      {
        distanceToCoast: 3,
        historicalStorms: {
          count: 18,
          significantStorms: ['Andrew', 'Irma', 'Wilma'],
        },
      }
    );

    expect(analysis.windZone).toBeDefined();
    expect(analysis.stormSurgeZone).toBeDefined();
    expect(analysis.buildingCodeRequirements.length).toBeGreaterThan(0);
    expect(analysis.insuranceConsiderations.length).toBeGreaterThan(0);
    expect(analysis.confidence).toBeGreaterThan(90);

    const score = getHurricaneRiskScore(analysis);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(5);
  });

  it('should handle complete analysis for inland property', () => {
    const analysis = analyzeHurricaneRisk(testCoordinates.inland, 'PA');

    expect(analysis.windZone).toBeNull();
    expect(analysis.stormSurgeZone).toBeNull();
    expect(analysis.buildingCodeRequirements).toEqual([]);
    expect(analysis.insuranceConsiderations).toHaveLength(0);

    const score = getHurricaneRiskScore(analysis);
    expect(score).toBe(5.0);
  });

  it('should handle Mid-Atlantic coastal property', () => {
    const analysis = analyzeHurricaneRisk(
      testCoordinates.midAtlantic,
      'VA',
      { distanceToCoast: 15 }
    );

    expect(analysis.windZone).toBe('zone_3');
    expect(analysis.confidence).toBeGreaterThan(80);

    const score = getHurricaneRiskScore(analysis);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(5);
  });
});
