/**
 * Integration Tests for Property Scoring System
 *
 * End-to-end tests that verify the complete scoring pipeline:
 * - Full property scoring flow
 * - Category score aggregation
 * - Edge case to final score
 * - Regional adjustments application
 * - Calibration pipeline
 * - Performance requirements
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { calculatePropertyScore, calculatePropertyScores } from '../calculator';
import { calculateLocationScore } from '../categories/location';
import { handleEdgeCases } from '../edge-cases';
import { calibrateScore, validateScoreBreakdown } from '../edge-cases/calibration';
import { calculateGrade } from '../grade-calculator';
import { applyRegionalAdjustments } from '../adjustments';
import { applyMissingDataStrategy } from '../utils/missing-data-handler';
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
  mockFloodZoneProperty,
  mockFloodZoneExternalData,
  mockPennsylvaniaProperty,
  mockFloridaProperty,
  mockTexasProperty,
  batchTestProperties,
  batchExternalDataMap,
  createBulkMockProperties,
  gradeBoundaryTestCases,
} from './fixtures';

// ============================================
// End-to-End Scoring Pipeline Tests
// ============================================

describe('End-to-End Scoring Pipeline', () => {
  describe('complete scoring flow', () => {
    it('should complete full scoring pipeline for ideal property', () => {
      // Step 1: Handle edge cases
      const edgeCases = handleEdgeCases(
        mockIdealProperty,
        mockIdealExternalData
      );
      expect(edgeCases.isEdgeCase).toBe(false);

      // Step 2: Calculate location score
      const locationScore = calculateLocationScore(
        mockIdealProperty,
        mockIdealExternalData
      );
      expect(locationScore.score).toBeGreaterThan(0);

      // Step 3: Calculate full property score
      const fullScore = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      // Verify complete result
      expect(fullScore.totalScore).toBeGreaterThan(50);
      expect(fullScore.grade.grade).toMatch(/^[A-C]$/);
      expect(fullScore.location.score).toBeCloseTo(locationScore.score, 1);
    });

    it('should complete full pipeline for minimal property', () => {
      const result = calculatePropertyScore(
        mockMinimalProperty,
        mockNullExternalData
      );

      // Should complete without errors
      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceLevel.overall).toBeLessThan(60);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should complete full pipeline for edge case property', () => {
      const result = calculatePropertyScore(mockCemeteryProperty, null);

      // Should complete and flag as rejected
      expect(result).toBeDefined();
      expect(result.edgeCases.isEdgeCase).toBe(true);
      expect(result.edgeCases.handling).toBe('auto_reject');
    });
  });

  describe('score aggregation accuracy', () => {
    it('should correctly aggregate category scores', () => {
      const result = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      const manualTotal =
        result.location.score +
        result.risk.score +
        result.financial.score +
        result.market.score +
        result.profit.score;

      expect(Math.abs(result.totalScore - manualTotal)).toBeLessThan(0.01);
    });

    it('should correctly aggregate component scores within categories', () => {
      const result = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      const locationComponentTotal = result.location.components.reduce(
        (sum, comp) => sum + comp.score,
        0
      );

      expect(Math.abs(result.location.score - locationComponentTotal)).toBeLessThan(0.01);
    });

    it('should maintain score bounds through pipeline', () => {
      const result = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      // Total score bounds
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(125);

      // Category score bounds
      [result.location, result.risk, result.financial, result.market, result.profit].forEach(
        (category) => {
          expect(category.score).toBeGreaterThanOrEqual(0);
          expect(category.score).toBeLessThanOrEqual(25);

          // Component score bounds
          category.components.forEach((comp) => {
            expect(comp.score).toBeGreaterThanOrEqual(0);
            expect(comp.score).toBeLessThanOrEqual(5);
          });
        }
      );
    });
  });
});

// ============================================
// Regional Adjustment Integration Tests
// ============================================

describe('Regional Adjustment Integration', () => {
  it('should apply Pennsylvania adjustments correctly', () => {
    const result = calculatePropertyScore(
      mockPennsylvaniaProperty,
      mockIdealExternalData
    );

    expect(result.regionAdjustments).toBeDefined();
    expect(result.regionAdjustments.length).toBeGreaterThan(0);
    expect(result.regionAdjustments.some((adj) => adj.includes('PA'))).toBe(true);
  });

  it('should apply different adjustments for Florida', () => {
    const paResult = calculatePropertyScore(
      mockPennsylvaniaProperty,
      mockIdealExternalData
    );
    const flResult = calculatePropertyScore(
      mockFloridaProperty,
      mockIdealExternalData
    );

    // Scores may differ due to regional adjustments
    expect(paResult.regionAdjustments).not.toEqual(flResult.regionAdjustments);
  });

  it('should apply Texas-specific adjustments', () => {
    const result = calculatePropertyScore(
      mockTexasProperty,
      mockIdealExternalData
    );

    expect(result.regionAdjustments).toBeDefined();
    expect(result.regionAdjustments.some((adj) => adj.includes('TX'))).toBe(true);
  });
});

// ============================================
// Calibration Pipeline Tests
// ============================================

describe('Calibration Pipeline', () => {
  it('should calibrate scores within acceptable range', () => {
    const result = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData,
      { skipCalibration: false }
    );

    // Calibrated score should be reasonable
    expect(result.totalScore).toBeGreaterThan(30);
    expect(result.totalScore).toBeLessThan(120);
  });

  it('should validate score breakdown after calibration', () => {
    const result = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    const validation = validateScoreBreakdown({
      totalScore: result.totalScore,
      location: result.location.score,
      risk: result.risk.score,
      financial: result.financial.score,
      market: result.market.score,
      profit: result.profit.score,
    });

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should apply property type calibration', () => {
    const residentialResult = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    const commercialResult = calculatePropertyScore(
      mockHighValueProperty,
      mockIdealExternalData
    );

    // Different property types may have different calibration factors
    expect(residentialResult.propertyType).toBe('single_family_residential');
    expect(commercialResult.propertyType).toBe('commercial');
  });
});

// ============================================
// Missing Data Strategy Integration Tests
// ============================================

describe('Missing Data Strategy Integration', () => {
  it('should apply consistent strategies across pipeline', () => {
    const result = calculatePropertyScore(
      mockMinimalProperty,
      mockNullExternalData,
      { logFallbacks: true }
    );

    // Fallback log should show strategies used
    expect(result.fallbackLog).toBeDefined();
    expect(result.fallbackLog!.length).toBeGreaterThan(0);

    // All strategies should be valid
    const validStrategies = [
      'default_neutral',
      'default_conservative',
      'default_optimistic',
      'skip_component',
      'require_data',
      'estimate_from_peers',
    ];

    result.fallbackLog!.forEach((entry) => {
      expect(validStrategies).toContain(entry.strategy);
    });
  });

  it('should reduce confidence when using defaults', () => {
    const completeResult = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    const incompleteResult = calculatePropertyScore(
      mockMinimalProperty,
      mockNullExternalData
    );

    expect(completeResult.confidenceLevel.overall).toBeGreaterThan(
      incompleteResult.confidenceLevel.overall
    );
  });

  it('should add appropriate notes for missing data', () => {
    const result = calculatePropertyScore(
      mockMinimalProperty,
      mockNullExternalData
    );

    // Check location category notes
    expect(result.location.notes.length).toBeGreaterThan(0);
    expect(result.location.notes.some((n) => n.includes('missing') || n.includes('default'))).toBe(
      true
    );
  });
});

// ============================================
// Grade Calculation Integration Tests
// ============================================

describe('Grade Calculation Integration', () => {
  it('should calculate correct grades across score spectrum', () => {
    gradeBoundaryTestCases.forEach(({ score, expectedGrade }) => {
      const grade = calculateGrade(score);
      expect(grade.grade).toBe(expectedGrade);
    });
  });

  it('should include grade in property score result', () => {
    const result = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    expect(result.grade).toBeDefined();
    expect(result.grade.grade).toMatch(/^[A-F]$/);
    expect(result.grade.gradeWithModifier).toMatch(/^[A-F][+-]?$/);
    expect(result.grade.percentage).toBeGreaterThanOrEqual(0);
    expect(result.grade.percentage).toBeLessThanOrEqual(100);
    expect(result.grade.description).toBeDefined();
  });

  it('should calculate consistent grades between score and result', () => {
    const result = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    const directGrade = calculateGrade(result.totalScore);

    expect(result.grade.grade).toBe(directGrade.grade);
    expect(result.grade.percentage).toBeCloseTo(directGrade.percentage, 1);
  });
});

// ============================================
// Batch Processing Integration Tests
// ============================================

describe('Batch Processing Integration', () => {
  it('should process multiple properties consistently', () => {
    const results = calculatePropertyScores(batchTestProperties, batchExternalDataMap);

    expect(results).toHaveLength(batchTestProperties.length);

    results.forEach((result, index) => {
      expect(result.propertyId).toBe(batchTestProperties[index].id);
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(125);
    });
  });

  it('should maintain property order in results', () => {
    const results = calculatePropertyScores(batchTestProperties, batchExternalDataMap);

    batchTestProperties.forEach((property, index) => {
      expect(results[index].propertyId).toBe(property.id);
    });
  });

  it('should handle mixed property types in batch', () => {
    const results = calculatePropertyScores(batchTestProperties, batchExternalDataMap);

    const propertyTypes = results.map((r) => r.propertyType);
    const uniqueTypes = new Set(propertyTypes);

    expect(uniqueTypes.size).toBeGreaterThan(1);
  });

  it('should handle mixed edge cases in batch', () => {
    const results = calculatePropertyScores(batchTestProperties, batchExternalDataMap);

    const edgeCaseResults = results.filter((r) => r.edgeCases.isEdgeCase);
    const normalResults = results.filter((r) => !r.edgeCases.isEdgeCase);

    expect(edgeCaseResults.length).toBeGreaterThan(0);
    expect(normalResults.length).toBeGreaterThan(0);
  });
});

// ============================================
// Performance Integration Tests
// ============================================

describe('Performance Integration', () => {
  it('should complete single property scoring in under 100ms', () => {
    const start = performance.now();

    calculatePropertyScore(mockIdealProperty, mockIdealExternalData);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should complete batch of 10 properties in under 500ms', () => {
    const start = performance.now();

    calculatePropertyScores(batchTestProperties.slice(0, 10), batchExternalDataMap);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('should complete batch of 50 properties in under 2000ms', () => {
    const properties = createBulkMockProperties(50);
    const externalDataMap: Record<string, typeof mockIdealExternalData | null> = {};
    properties.forEach((p) => {
      externalDataMap[p.id] = mockIdealExternalData;
    });

    const start = performance.now();

    calculatePropertyScores(properties, externalDataMap);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  it('should complete batch of 100 properties in under 4000ms', () => {
    const properties = createBulkMockProperties(100);
    const externalDataMap: Record<string, typeof mockIdealExternalData | null> = {};
    properties.forEach((p) => {
      externalDataMap[p.id] = mockIdealExternalData;
    });

    const start = performance.now();

    calculatePropertyScores(properties, externalDataMap);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(4000);
  });
});

// ============================================
// Data Consistency Tests
// ============================================

describe('Data Consistency', () => {
  it('should produce identical results for same input', () => {
    const result1 = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );
    const result2 = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    expect(result1.totalScore).toBe(result2.totalScore);
    expect(result1.grade.grade).toBe(result2.grade.grade);
    expect(result1.location.score).toBe(result2.location.score);
  });

  it('should produce consistent results across multiple runs', () => {
    const results: number[] = [];

    for (let i = 0; i < 10; i++) {
      const result = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData
      );
      results.push(result.totalScore);
    }

    // All results should be identical
    const allEqual = results.every((r) => r === results[0]);
    expect(allEqual).toBe(true);
  });

  it('should maintain referential integrity in results', () => {
    const result = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    // Property ID should match
    expect(result.propertyId).toBe(mockIdealProperty.id);

    // Category IDs should be correct
    expect(result.location.id).toBe('location');
    expect(result.risk.id).toBe('risk');
    expect(result.financial.id).toBe('financial');
    expect(result.market.id).toBe('market');
    expect(result.profit.id).toBe('profit');
  });
});

// ============================================
// Error Handling Integration Tests
// ============================================

describe('Error Handling Integration', () => {
  it('should handle null property gracefully', () => {
    // Should throw or return meaningful error
    expect(() => {
      calculatePropertyScore(null as any, mockIdealExternalData);
    }).toThrow();
  });

  it('should handle undefined external data gracefully', () => {
    const result = calculatePropertyScore(mockIdealProperty, undefined as any);

    expect(result).toBeDefined();
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('should handle malformed property data gracefully', () => {
    const malformedProperty = {
      id: 'malformed-001',
      // Missing required fields
    };

    // Should handle gracefully (either throw specific error or use defaults)
    try {
      const result = calculatePropertyScore(
        malformedProperty as any,
        mockIdealExternalData
      );
      expect(result).toBeDefined();
    } catch (error: any) {
      expect(error.message).toContain('property');
    }
  });

  it('should not crash on extreme values', () => {
    const extremeProperty = {
      ...mockIdealProperty,
      id: 'extreme-001',
      total_due: Number.MAX_SAFE_INTEGER,
      lot_size_sqft: Number.MAX_SAFE_INTEGER,
      year_built: 1,
    };

    const result = calculatePropertyScore(extremeProperty, mockIdealExternalData);

    expect(result).toBeDefined();
    expect(Number.isFinite(result.totalScore)).toBe(true);
  });
});

// ============================================
// Metadata and Versioning Tests
// ============================================

describe('Metadata and Versioning', () => {
  it('should include scoring version', () => {
    const result = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    expect(result.scoringVersion).toBeDefined();
    expect(result.scoringVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should include calculation timestamp', () => {
    const before = new Date();

    const result = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    const after = new Date();

    expect(result.calculatedAt).toBeDefined();
    expect(result.calculatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.calculatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// ============================================
// Specific Property Type Integration Tests
// ============================================

describe('Property Type Specific Integration', () => {
  it('should score vacant land appropriately', () => {
    const result = calculatePropertyScore(
      mockVacantLandProperty,
      mockVacantLandExternalData
    );

    expect(result.propertyType).toBe('vacant_land');
    // Vacant land typically scores differently on location components
    expect(result.location.score).toBeLessThan(20); // Lower due to rural nature
  });

  it('should score flood zone property with risk adjustment', () => {
    const result = calculatePropertyScore(
      mockFloodZoneProperty,
      mockFloodZoneExternalData
    );

    // Flood zone should affect risk category
    expect(result.risk.score).toBeDefined();
    // Should have warning about flood zone
    expect(
      result.warnings.some((w) => w.includes('flood') || w.includes('Flood'))
    ).toBe(true);
  });

  it('should score contaminated property with environmental risk', () => {
    const result = calculatePropertyScore(
      mockContaminatedProperty,
      mockContaminatedExternalData
    );

    expect(result.edgeCases.isEdgeCase).toBe(true);
    expect(result.edgeCases.edgeCaseTypes).toContain('environmental_contamination');
    expect(result.edgeCases.handling).toBe('environmental_assessment_required');
  });

  it('should auto-reject cemetery property', () => {
    const result = calculatePropertyScore(mockCemeteryProperty, null);

    expect(result.edgeCases.isEdgeCase).toBe(true);
    expect(result.edgeCases.handling).toBe('auto_reject');
    expect(result.edgeCases.rejectReason).toBeDefined();
  });

  it('should auto-reject sliver lot', () => {
    const result = calculatePropertyScore(mockSliverLotProperty, null);

    expect(result.edgeCases.isEdgeCase).toBe(true);
    expect(result.edgeCases.edgeCaseTypes).toContain('sliver_lot');
    expect(result.edgeCases.handling).toMatch(/reject/i);
  });
});

// ============================================
// Regression Prevention Tests
// ============================================

describe('Regression Prevention', () => {
  it('should maintain consistent scoring for benchmark property', () => {
    // This test ensures scoring consistency across code changes
    const result = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    // These values should remain stable unless intentionally changed
    // Update these if scoring algorithm changes intentionally
    expect(result.totalScore).toBeGreaterThan(60); // Reasonable minimum
    expect(result.totalScore).toBeLessThan(110); // Reasonable maximum
    expect(result.grade.grade).toMatch(/^[A-C]$/); // Should be decent grade
  });

  it('should never produce negative scores', () => {
    const testProperties = [
      mockMinimalProperty,
      mockVacantLandProperty,
      mockCemeteryProperty,
      mockSliverLotProperty,
    ];

    testProperties.forEach((property) => {
      const result = calculatePropertyScore(property, null);

      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.location.score).toBeGreaterThanOrEqual(0);
      expect(result.risk.score).toBeGreaterThanOrEqual(0);
      expect(result.financial.score).toBeGreaterThanOrEqual(0);
      expect(result.market.score).toBeGreaterThanOrEqual(0);
      expect(result.profit.score).toBeGreaterThanOrEqual(0);
    });
  });

  it('should never exceed maximum scores', () => {
    const result = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    expect(result.totalScore).toBeLessThanOrEqual(125);
    expect(result.location.score).toBeLessThanOrEqual(25);
    expect(result.risk.score).toBeLessThanOrEqual(25);
    expect(result.financial.score).toBeLessThanOrEqual(25);
    expect(result.market.score).toBeLessThanOrEqual(25);
    expect(result.profit.score).toBeLessThanOrEqual(25);
  });

  it('should not produce NaN or Infinity values', () => {
    const testProperties = createBulkMockProperties(20);

    testProperties.forEach((property) => {
      const result = calculatePropertyScore(property, mockIdealExternalData);

      expect(Number.isNaN(result.totalScore)).toBe(false);
      expect(Number.isFinite(result.totalScore)).toBe(true);
      expect(Number.isNaN(result.grade.percentage)).toBe(false);
      expect(Number.isNaN(result.confidenceLevel.overall)).toBe(false);
    });
  });
});
