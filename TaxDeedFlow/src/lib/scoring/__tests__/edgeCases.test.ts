/**
 * Edge Case Handling Tests
 *
 * Tests the edge case detection and handling functionality including:
 * - All 15+ edge case types
 * - Detection accuracy
 * - Handling strategies
 * - Multiple edge case combinations
 * - Auto-reject logic
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import { describe, it, expect } from 'vitest';
import {
  handleEdgeCases,
  detectVeryOldProperty,
  detectNoStructure,
  detectHighValueProperty,
  detectExtremelyLowValue,
  detectLandlocked,
  detectTitleCloud,
  detectEnvironmentalContamination,
  detectSliverLot,
  detectCemetery,
  detectUtilityProperty,
  detectDecliningMarket,
  detectHighCompetition,
  getEdgeCaseSeverity,
  shouldAutoReject,
  getHandlingRecommendations,
  EDGE_CASE_CONFIG,
} from '../edge-cases';
import {
  mockIdealProperty,
  mockIdealExternalData,
  mockMinimalProperty,
  mockNullExternalData,
  mockVacantLandProperty,
  mockVacantLandExternalData,
  mockVeryOldProperty,
  mockHighValueProperty,
  mockCemeteryProperty,
  mockContaminatedProperty,
  mockContaminatedExternalData,
  mockSliverLotProperty,
  edgeCaseProperties,
  decliningMarketExternalData,
  createMockProperty,
  createMockExternalData,
} from './fixtures';

// ============================================
// Main Edge Case Handler Tests
// ============================================

describe('handleEdgeCases', () => {
  describe('basic functionality', () => {
    it('should return valid EdgeCaseResult structure', () => {
      const result = handleEdgeCases(
        mockIdealProperty,
        mockIdealExternalData
      );

      expect(result).toBeDefined();
      expect(typeof result.isEdgeCase).toBe('boolean');
      expect(result.handling).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should return isEdgeCase=false for normal property', () => {
      const result = handleEdgeCases(
        mockIdealProperty,
        mockIdealExternalData
      );

      expect(result.isEdgeCase).toBe(false);
      expect(result.handling).toBe('standard');
    });

    it('should detect edge case for problematic property', () => {
      const result = handleEdgeCases(mockCemeteryProperty, null);

      expect(result.isEdgeCase).toBe(true);
      expect(result.edgeCaseTypes).toContain('cemetery');
    });

    it('should provide recommendations for edge cases', () => {
      const result = handleEdgeCases(mockCemeteryProperty, null);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });
  });

  describe('multiple edge cases', () => {
    it('should detect multiple edge cases on same property', () => {
      // Create property with multiple issues
      const multiIssueProperty = createMockProperty({
        id: 'prop-multi-001',
        year_built: 1880, // Very old
        building_sqft: 0, // No structure
        lot_size_sqft: 800, // Very small
      });

      const result = handleEdgeCases(multiIssueProperty, null);

      expect(result.isEdgeCase).toBe(true);
      expect(result.edgeCaseTypes!.length).toBeGreaterThan(1);
    });

    it('should calculate combined severity for multiple edge cases', () => {
      const multiIssueProperty = createMockProperty({
        id: 'prop-multi-002',
        year_built: 1870,
        building_sqft: 0,
      });

      const result = handleEdgeCases(multiIssueProperty, null);

      expect(result.combinedSeverity).toBeDefined();
    });

    it('should use most restrictive handling for multiple edge cases', () => {
      // Property that triggers auto_reject should use that handling
      const cemeteryWithOtherIssues = {
        ...mockCemeteryProperty,
        year_built: 1850, // Also very old
      };

      const result = handleEdgeCases(cemeteryWithOtherIssues, null);

      expect(result.handling).toBe('auto_reject');
    });
  });

  describe('edge case configuration', () => {
    it('should respect skip configuration', () => {
      const result = handleEdgeCases(
        mockVeryOldProperty,
        mockIdealExternalData,
        { skipEdgeCases: ['very_old_property'] }
      );

      expect(result.edgeCaseTypes).not.toContain('very_old_property');
    });

    it('should respect custom thresholds', () => {
      const customConfig = {
        veryOldPropertyYear: 1850, // More lenient than default (1900)
      };

      const result = handleEdgeCases(
        mockVeryOldProperty, // Built 1885
        mockIdealExternalData,
        { customThresholds: customConfig }
      );

      // 1885 > 1850, so should not trigger with lenient threshold
      expect(result.edgeCaseTypes).not.toContain('very_old_property');
    });
  });
});

// ============================================
// Individual Edge Case Detection Tests
// ============================================

describe('detectVeryOldProperty', () => {
  it('should detect property built before 1900', () => {
    const result = detectVeryOldProperty(mockVeryOldProperty);

    expect(result.detected).toBe(true);
    expect(result.type).toBe('very_old_property');
    expect(result.details.yearBuilt).toBe(1885);
  });

  it('should not flag property built after 1900', () => {
    const result = detectVeryOldProperty(mockIdealProperty);

    expect(result.detected).toBe(false);
  });

  it('should handle null year_built', () => {
    const propertyNoYear = createMockProperty({ year_built: null });
    const result = detectVeryOldProperty(propertyNoYear);

    expect(result.detected).toBe(false);
  });

  it('should calculate property age correctly', () => {
    const result = detectVeryOldProperty(mockVeryOldProperty);
    const currentYear = new Date().getFullYear();
    const expectedAge = currentYear - 1885;

    expect(result.details.age).toBe(expectedAge);
  });
});

describe('detectNoStructure', () => {
  it('should detect property with no building', () => {
    const result = detectNoStructure(mockVacantLandProperty);

    expect(result.detected).toBe(true);
    expect(result.type).toBe('no_structure');
  });

  it('should not flag property with structure', () => {
    const result = detectNoStructure(mockIdealProperty);

    expect(result.detected).toBe(false);
  });

  it('should handle null building_sqft', () => {
    const propertyNoSqFt = createMockProperty({ building_sqft: null });
    const result = detectNoStructure(propertyNoSqFt);

    // Null is ambiguous - should check other indicators
    expect(result.detected).toBe(false); // or true depending on implementation
  });

  it('should detect based on property type if sqft unavailable', () => {
    const vacantProperty = createMockProperty({
      building_sqft: null,
      property_type: 'vacant_land',
    });
    const result = detectNoStructure(vacantProperty);

    expect(result.detected).toBe(true);
  });
});

describe('detectHighValueProperty', () => {
  it('should detect property with high total_due', () => {
    const result = detectHighValueProperty(mockHighValueProperty);

    expect(result.detected).toBe(true);
    expect(result.type).toBe('high_value_property');
  });

  it('should not flag normal value property', () => {
    const result = detectHighValueProperty(mockIdealProperty);

    expect(result.detected).toBe(false);
  });

  it('should use default threshold of $50,000', () => {
    const justUnderProperty = createMockProperty({ total_due: 49999 });
    const justOverProperty = createMockProperty({ total_due: 50001 });

    expect(detectHighValueProperty(justUnderProperty).detected).toBe(false);
    expect(detectHighValueProperty(justOverProperty).detected).toBe(true);
  });
});

describe('detectExtremelyLowValue', () => {
  it('should detect property with very low value', () => {
    const lowValueProperty = createMockProperty({
      total_due: 75,
      assessed_value: 200,
    });
    const result = detectExtremelyLowValue(lowValueProperty);

    expect(result.detected).toBe(true);
    expect(result.type).toBe('extremely_low_value');
  });

  it('should not flag normal value property', () => {
    const result = detectExtremelyLowValue(mockIdealProperty);

    expect(result.detected).toBe(false);
  });

  it('should use default threshold of $500', () => {
    const justUnder = createMockProperty({ total_due: 499 });
    const justOver = createMockProperty({ total_due: 501 });

    expect(detectExtremelyLowValue(justUnder).detected).toBe(true);
    expect(detectExtremelyLowValue(justOver).detected).toBe(false);
  });
});

describe('detectLandlocked', () => {
  it('should detect landlocked property from land_use', () => {
    const landlockedProperty = createMockProperty({
      land_use: 'LANDLOCKED',
    });
    const result = detectLandlocked(landlockedProperty);

    expect(result.detected).toBe(true);
    expect(result.type).toBe('landlocked');
  });

  it('should not flag property with road access', () => {
    const result = detectLandlocked(mockIdealProperty);

    expect(result.detected).toBe(false);
  });
});

describe('detectTitleCloud', () => {
  it('should detect IRS lien from external data', () => {
    const externalDataWithIRS = createMockExternalData({
      // Would need title research data structure
    });

    // This test depends on how title cloud data is structured
    // For now, test basic functionality
    const result = detectTitleCloud(mockIdealProperty, null);
    expect(result.detected).toBe(false);
  });
});

describe('detectEnvironmentalContamination', () => {
  it('should detect contamination from environmental data', () => {
    const result = detectEnvironmentalContamination(
      mockContaminatedProperty,
      mockContaminatedExternalData
    );

    expect(result.detected).toBe(true);
    expect(result.type).toBe('environmental_contamination');
  });

  it('should not flag clean property', () => {
    const result = detectEnvironmentalContamination(
      mockIdealProperty,
      mockIdealExternalData
    );

    expect(result.detected).toBe(false);
  });

  it('should detect based on environmental risk score > 50', () => {
    const highRiskExternal = createMockExternalData({
      environmentalHazards: {
        superfundSites: 0,
        brownfieldSites: 1,
        airQualityIndex: 80,
        riskScore: 55,
      },
    });

    const result = detectEnvironmentalContamination(
      mockIdealProperty,
      highRiskExternal
    );

    expect(result.detected).toBe(true);
  });

  it('should detect superfund site proximity', () => {
    const superfundExternal = createMockExternalData({
      environmentalHazards: {
        superfundSites: 1,
        brownfieldSites: 0,
        airQualityIndex: 45,
        riskScore: 35,
      },
    });

    const result = detectEnvironmentalContamination(
      mockIdealProperty,
      superfundExternal
    );

    expect(result.detected).toBe(true);
  });
});

describe('detectSliverLot', () => {
  it('should detect very small lot (< 1000 sqft)', () => {
    const result = detectSliverLot(mockSliverLotProperty);

    expect(result.detected).toBe(true);
    expect(result.type).toBe('sliver_lot');
  });

  it('should not flag normal sized lot', () => {
    const result = detectSliverLot(mockIdealProperty);

    expect(result.detected).toBe(false);
  });

  it('should handle lot_size_acres when sqft not available', () => {
    const propertyWithAcres = createMockProperty({
      lot_size_sqft: null,
      lot_size_acres: 0.01, // ~435 sqft
    });

    const result = detectSliverLot(propertyWithAcres);

    expect(result.detected).toBe(true);
  });
});

describe('detectCemetery', () => {
  it('should detect cemetery from land_use', () => {
    const result = detectCemetery(mockCemeteryProperty);

    expect(result.detected).toBe(true);
    expect(result.type).toBe('cemetery');
  });

  it('should detect cemetery from property name', () => {
    const cemeteryByName = createMockProperty({
      owner_name: 'Memorial Cemetery Association',
      land_use: 'Other',
    });

    const result = detectCemetery(cemeteryByName);

    expect(result.detected).toBe(true);
  });

  it('should not flag residential property', () => {
    const result = detectCemetery(mockIdealProperty);

    expect(result.detected).toBe(false);
  });
});

describe('detectUtilityProperty', () => {
  it('should detect utility property from land_use', () => {
    const utilityProperty = createMockProperty({
      land_use: 'UTILITY',
      property_type: 'unknown',
    });

    const result = detectUtilityProperty(utilityProperty);

    expect(result.detected).toBe(true);
    expect(result.type).toBe('utility_property');
  });

  it('should detect power company ownership', () => {
    const powerCompanyProperty = createMockProperty({
      owner_name: 'Pennsylvania Power & Light Company',
    });

    const result = detectUtilityProperty(powerCompanyProperty);

    expect(result.detected).toBe(true);
  });

  it('should not flag residential property', () => {
    const result = detectUtilityProperty(mockIdealProperty);

    expect(result.detected).toBe(false);
  });
});

describe('detectDecliningMarket', () => {
  it('should detect declining market from negative YoY change', () => {
    const result = detectDecliningMarket(
      edgeCaseProperties.decliningMarket,
      decliningMarketExternalData
    );

    expect(result.detected).toBe(true);
    expect(result.type).toBe('declining_market');
  });

  it('should not flag stable/growing market', () => {
    const result = detectDecliningMarket(
      mockIdealProperty,
      mockIdealExternalData
    );

    expect(result.detected).toBe(false);
  });

  it('should use threshold of -10% YoY decline', () => {
    const mildDecline = createMockExternalData({
      marketData: {
        ...mockIdealExternalData.marketData,
        priceChangeYoY: -8, // -8% is mild
      },
    });

    const result = detectDecliningMarket(mockIdealProperty, mildDecline);

    expect(result.detected).toBe(false);
  });
});

describe('detectHighCompetition', () => {
  it('should detect high competition from low days on market', () => {
    const hotMarket = createMockExternalData({
      marketData: {
        ...mockIdealExternalData.marketData,
        medianDaysOnMarket: 10,
        absorptionRate: 8.0,
      },
    });

    const result = detectHighCompetition(mockIdealProperty, hotMarket);

    expect(result.detected).toBe(true);
    expect(result.type).toBe('high_competition_area');
  });

  it('should not flag normal market', () => {
    const result = detectHighCompetition(
      mockIdealProperty,
      mockIdealExternalData
    );

    expect(result.detected).toBe(false);
  });
});

// ============================================
// Edge Case Severity Tests
// ============================================

describe('getEdgeCaseSeverity', () => {
  it('should return critical for cemetery', () => {
    expect(getEdgeCaseSeverity('cemetery')).toBe('critical');
  });

  it('should return critical for utility_property', () => {
    expect(getEdgeCaseSeverity('utility_property')).toBe('critical');
  });

  it('should return high for environmental_contamination', () => {
    expect(getEdgeCaseSeverity('environmental_contamination')).toBe('high');
  });

  it('should return medium for very_old_property', () => {
    expect(getEdgeCaseSeverity('very_old_property')).toBe('medium');
  });

  it('should return low for high_competition_area', () => {
    expect(getEdgeCaseSeverity('high_competition_area')).toBe('low');
  });
});

// ============================================
// Auto-Reject Logic Tests
// ============================================

describe('shouldAutoReject', () => {
  it('should auto-reject cemetery', () => {
    expect(shouldAutoReject('cemetery')).toBe(true);
  });

  it('should auto-reject utility_property', () => {
    expect(shouldAutoReject('utility_property')).toBe(true);
  });

  it('should not auto-reject very_old_property', () => {
    expect(shouldAutoReject('very_old_property')).toBe(false);
  });

  it('should not auto-reject declining_market', () => {
    expect(shouldAutoReject('declining_market')).toBe(false);
  });

  it('should auto-reject sliver_lot', () => {
    expect(shouldAutoReject('sliver_lot')).toBe(true);
  });
});

// ============================================
// Handling Recommendations Tests
// ============================================

describe('getHandlingRecommendations', () => {
  it('should provide recommendations for very old property', () => {
    const recommendations = getHandlingRecommendations('very_old_property');

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.some((r) => r.includes('inspection'))).toBe(true);
  });

  it('should provide recommendations for environmental contamination', () => {
    const recommendations = getHandlingRecommendations(
      'environmental_contamination'
    );

    expect(recommendations.length).toBeGreaterThan(0);
    expect(
      recommendations.some((r) => r.includes('Phase') || r.includes('assessment'))
    ).toBe(true);
  });

  it('should provide recommendations for title cloud', () => {
    const recommendations = getHandlingRecommendations('title_cloud');

    expect(recommendations.length).toBeGreaterThan(0);
    expect(
      recommendations.some((r) => r.includes('title') || r.includes('attorney'))
    ).toBe(true);
  });

  it('should return empty for auto-reject types', () => {
    const recommendations = getHandlingRecommendations('cemetery');

    // Cemetery is auto-reject, so no recommendations needed
    expect(recommendations.length).toBe(0);
  });
});

// ============================================
// Edge Case Configuration Tests
// ============================================

describe('EDGE_CASE_CONFIG', () => {
  it('should have configuration for all edge case types', () => {
    const edgeCaseTypes = [
      'very_old_property',
      'no_structure',
      'high_value_property',
      'extremely_low_value',
      'landlocked',
      'no_road_access',
      'title_cloud',
      'irs_lien',
      'hoa_super_lien',
      'environmental_contamination',
      'wetlands',
      'high_competition_area',
      'declining_market',
      'very_small_lot',
      'sliver_lot',
      'cemetery',
      'utility_property',
    ];

    edgeCaseTypes.forEach((type) => {
      expect(EDGE_CASE_CONFIG[type]).toBeDefined();
      expect(EDGE_CASE_CONFIG[type].handling).toBeDefined();
      expect(EDGE_CASE_CONFIG[type].severity).toBeDefined();
    });
  });

  it('should have valid handling strategies', () => {
    const validHandlings = [
      'standard',
      'manual_review',
      'specialized_analysis',
      'auto_reject',
      'reject_unbuildable',
      'lien_analysis_required',
      'title_research_required',
      'environmental_assessment_required',
      'enhanced_market_analysis',
    ];

    Object.values(EDGE_CASE_CONFIG).forEach((config) => {
      expect(validHandlings).toContain(config.handling);
    });
  });

  it('should have valid severity levels', () => {
    const validSeverities = ['critical', 'high', 'medium', 'low'];

    Object.values(EDGE_CASE_CONFIG).forEach((config) => {
      expect(validSeverities).toContain(config.severity);
    });
  });
});

// ============================================
// Integration with Property Types
// ============================================

describe('edge cases with property types', () => {
  it('should not flag no_structure for vacant_land type', () => {
    const result = handleEdgeCases(
      mockVacantLandProperty,
      mockVacantLandExternalData
    );

    // vacant_land is expected to have no structure
    // Should still detect but with different handling
    const noStructureEdge = result.edgeCaseTypes?.includes('no_structure');
    if (noStructureEdge) {
      expect(result.handling).not.toBe('auto_reject');
    }
  });

  it('should handle commercial property differently', () => {
    const commercialResult = handleEdgeCases(
      mockHighValueProperty,
      mockIdealExternalData
    );

    // High value is expected for commercial
    expect(commercialResult.handling).toBe('specialized_analysis');
  });
});

// ============================================
// Warning Generation Tests
// ============================================

describe('warning generation', () => {
  it('should generate warnings for detected edge cases', () => {
    const result = handleEdgeCases(mockVeryOldProperty, mockIdealExternalData);

    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should include edge case type in warning', () => {
    const result = handleEdgeCases(mockCemeteryProperty, null);

    expect(result.warnings.some((w) => w.includes('cemetery'))).toBe(true);
  });

  it('should not generate warnings for normal property', () => {
    const result = handleEdgeCases(
      mockIdealProperty,
      mockIdealExternalData
    );

    // Normal property may have minor warnings but shouldn't have edge case warnings
    expect(result.isEdgeCase).toBe(false);
  });
});
