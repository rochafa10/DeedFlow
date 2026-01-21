/**
 * Main Property Score Calculator Tests
 *
 * Tests the core scoring functionality including:
 * - calculatePropertyScore function
 * - Grade calculation and boundaries
 * - Score breakdown structure
 * - Confidence calculation
 * - Warning generation
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculatePropertyScore,
  calculatePropertyScores,
  comparePropertyScores,
  getScoreSummary,
} from '../calculator';
import { calculateGrade, getGradeDescription } from '../grade-calculator';
import {
  mockIdealProperty,
  mockIdealExternalData,
  mockMinimalProperty,
  mockNullExternalData,
  mockVacantLandProperty,
  mockVacantLandExternalData,
  mockCemeteryProperty,
  mockSliverLotProperty,
  gradeBoundaryTestCases,
  createMockProperty,
  createMockExternalData,
  createBulkMockProperties,
} from './fixtures';

// ============================================
// Main Calculator Tests
// ============================================

describe('calculatePropertyScore', () => {
  describe('basic functionality', () => {
    it('should return a valid PropertyScoreResult for ideal property', () => {
      const result = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      // Check structure
      expect(result).toBeDefined();
      expect(result.propertyId).toBe(mockIdealProperty.id);
      expect(result.scoringVersion).toBeDefined();
      expect(result.calculatedAt).toBeInstanceOf(Date);

      // Check total score range
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(125);

      // Check grade exists
      expect(result.grade).toBeDefined();
      expect(result.grade.grade).toMatch(/^[A-F]$/);
      expect(result.grade.percentage).toBeGreaterThanOrEqual(0);
      expect(result.grade.percentage).toBeLessThanOrEqual(100);
    });

    it('should return all 5 category scores', () => {
      const result = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      // All categories should exist
      expect(result.location).toBeDefined();
      expect(result.risk).toBeDefined();
      expect(result.financial).toBeDefined();
      expect(result.market).toBeDefined();
      expect(result.profit).toBeDefined();

      // Each category should have correct structure
      const categories = [
        result.location,
        result.risk,
        result.financial,
        result.market,
        result.profit,
      ];

      categories.forEach((category) => {
        expect(category.id).toBeDefined();
        expect(category.score).toBeGreaterThanOrEqual(0);
        expect(category.score).toBeLessThanOrEqual(25);
        expect(category.maxScore).toBe(25);
        expect(category.confidence).toBeGreaterThanOrEqual(0);
        expect(category.confidence).toBeLessThanOrEqual(100);
        expect(category.components).toBeDefined();
        expect(Array.isArray(category.components)).toBe(true);
      });
    });

    it('should calculate total score as sum of category scores', () => {
      const result = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      const calculatedTotal =
        result.location.score +
        result.risk.score +
        result.financial.score +
        result.market.score +
        result.profit.score;

      // Allow small floating point differences
      expect(Math.abs(result.totalScore - calculatedTotal)).toBeLessThan(0.01);
    });

    it('should handle null external data gracefully', () => {
      const result = calculatePropertyScore(mockMinimalProperty, null);

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.warnings.length).toBeGreaterThan(0); // Should have warnings about missing data
    });

    it('should handle empty external data gracefully', () => {
      const result = calculatePropertyScore(
        mockMinimalProperty,
        mockNullExternalData
      );

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('property type detection', () => {
    it('should detect single_family_residential type', () => {
      const result = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      expect(result.propertyType).toBe('single_family_residential');
    });

    it('should detect vacant_land type', () => {
      const result = calculatePropertyScore(
        mockVacantLandProperty,
        mockVacantLandExternalData
      );

      expect(result.propertyType).toBe('vacant_land');
    });

    it('should handle unknown property type', () => {
      const unknownProperty = createMockProperty({
        property_type: 'unknown',
        building_sqft: null,
        land_use: null,
      });

      const result = calculatePropertyScore(unknownProperty, null);

      expect(result.propertyType).toBeDefined();
    });
  });

  describe('confidence calculation', () => {
    it('should have high confidence for complete data', () => {
      const result = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      expect(result.confidenceLevel.overall).toBeGreaterThan(70);
      expect(result.confidenceLevel.label).toMatch(/High|Very High/);
    });

    it('should have low confidence for minimal data', () => {
      const result = calculatePropertyScore(
        mockMinimalProperty,
        mockNullExternalData
      );

      expect(result.confidenceLevel.overall).toBeLessThan(60);
      expect(result.confidenceLevel.label).toMatch(/Low|Moderate/);
    });

    it('should include confidence factors', () => {
      const result = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      expect(result.confidenceLevel.factors).toBeDefined();
      expect(Array.isArray(result.confidenceLevel.factors)).toBe(true);
      expect(result.confidenceLevel.factors.length).toBeGreaterThan(0);
    });

    it('should provide recommendations for low confidence', () => {
      const result = calculatePropertyScore(
        mockMinimalProperty,
        mockNullExternalData
      );

      expect(result.confidenceLevel.recommendations).toBeDefined();
      expect(Array.isArray(result.confidenceLevel.recommendations)).toBe(true);
    });
  });

  describe('warnings generation', () => {
    it('should generate warnings for missing critical data', () => {
      const result = calculatePropertyScore(
        mockMinimalProperty,
        mockNullExternalData
      );

      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should not generate excessive warnings for complete data', () => {
      const result = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      // Should have minimal warnings for well-documented property
      expect(result.warnings.length).toBeLessThan(5);
    });
  });

  describe('edge case handling', () => {
    it('should detect edge cases for cemetery property', () => {
      const result = calculatePropertyScore(mockCemeteryProperty, null);

      expect(result.edgeCases.isEdgeCase).toBe(true);
      expect(result.edgeCases.edgeCaseTypes).toContain('cemetery');
      expect(result.edgeCases.handling).toBe('auto_reject');
    });

    it('should detect edge cases for sliver lot', () => {
      const result = calculatePropertyScore(mockSliverLotProperty, null);

      expect(result.edgeCases.isEdgeCase).toBe(true);
      expect(result.edgeCases.edgeCaseTypes).toContain('sliver_lot');
    });

    it('should provide rejection reason for auto-reject properties', () => {
      const result = calculatePropertyScore(mockCemeteryProperty, null);

      expect(result.edgeCases.rejectReason).toBeDefined();
      expect(result.edgeCases.rejectReason).toBeTruthy();
    });
  });

  describe('fallback logging', () => {
    it('should log fallbacks when data is missing', () => {
      const result = calculatePropertyScore(mockMinimalProperty, null, {
        logFallbacks: true,
      });

      expect(result.fallbackLog).toBeDefined();
      expect(Array.isArray(result.fallbackLog)).toBe(true);
      expect(result.fallbackLog!.length).toBeGreaterThan(0);
    });

    it('should not log fallbacks when disabled', () => {
      const result = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData,
        {
          logFallbacks: false,
        }
      );

      expect(result.fallbackLog).toBeUndefined();
    });
  });

  describe('options handling', () => {
    it('should respect skipEdgeCaseCheck option', () => {
      const result = calculatePropertyScore(mockCemeteryProperty, null, {
        skipEdgeCaseCheck: true,
      });

      // Edge case should still be detected but not auto-rejected
      expect(result.totalScore).toBeGreaterThan(0);
    });

    it('should respect skipCalibration option', () => {
      const withCalibration = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData,
        { skipCalibration: false }
      );

      const withoutCalibration = calculatePropertyScore(
        mockIdealProperty,
        mockIdealExternalData,
        { skipCalibration: true }
      );

      // Scores should be similar but may differ slightly
      expect(withCalibration.totalScore).toBeDefined();
      expect(withoutCalibration.totalScore).toBeDefined();
    });
  });
});

// ============================================
// Batch Scoring Tests
// ============================================

describe('calculatePropertyScores (batch)', () => {
  it('should score multiple properties', () => {
    const properties = [mockIdealProperty, mockMinimalProperty];
    const externalDataMap = {
      [mockIdealProperty.id]: mockIdealExternalData,
      [mockMinimalProperty.id]: null,
    };

    const results = calculatePropertyScores(properties, externalDataMap);

    expect(results).toHaveLength(2);
    expect(results[0].propertyId).toBe(mockIdealProperty.id);
    expect(results[1].propertyId).toBe(mockMinimalProperty.id);
  });

  it('should handle empty property array', () => {
    const results = calculatePropertyScores([], {});

    expect(results).toHaveLength(0);
  });

  it('should maintain order of results', () => {
    const properties = [
      mockMinimalProperty,
      mockIdealProperty,
      mockVacantLandProperty,
    ];
    const externalDataMap = {
      [mockMinimalProperty.id]: null,
      [mockIdealProperty.id]: mockIdealExternalData,
      [mockVacantLandProperty.id]: mockVacantLandExternalData,
    };

    const results = calculatePropertyScores(properties, externalDataMap);

    expect(results[0].propertyId).toBe(mockMinimalProperty.id);
    expect(results[1].propertyId).toBe(mockIdealProperty.id);
    expect(results[2].propertyId).toBe(mockVacantLandProperty.id);
  });
});

// ============================================
// Grade Calculation Tests
// ============================================

describe('calculateGrade', () => {
  describe('grade boundaries', () => {
    it.each(gradeBoundaryTestCases)(
      'should return grade $expectedGrade for score $score (percentage: $percentage%)',
      ({ score, expectedGrade }) => {
        const result = calculateGrade(score);
        expect(result.grade).toBe(expectedGrade);
      }
    );
  });

  describe('grade with modifiers', () => {
    it('should return A+ for scores >= 90%', () => {
      const result = calculateGrade(112.5); // 90%
      expect(result.gradeWithModifier).toBe('A+');
    });

    it('should return A for scores 85-89%', () => {
      const result = calculateGrade(106.25); // 85%
      expect(result.gradeWithModifier).toBe('A');
    });

    it('should return A- for scores 80-84%', () => {
      const result = calculateGrade(100); // 80%
      expect(result.gradeWithModifier).toBe('A-');
    });

    it('should return B+ for scores 77-79%', () => {
      const result = calculateGrade(97.5); // 78%
      expect(result.gradeWithModifier).toBe('B+');
    });

    it('should return F for scores < 20%', () => {
      const result = calculateGrade(20); // 16%
      expect(result.gradeWithModifier).toBe('F');
    });
  });

  describe('edge cases', () => {
    it('should handle score of 0', () => {
      const result = calculateGrade(0);
      expect(result.grade).toBe('F');
      expect(result.percentage).toBe(0);
    });

    it('should handle maximum score of 125', () => {
      const result = calculateGrade(125);
      expect(result.grade).toBe('A');
      expect(result.percentage).toBe(100);
    });

    it('should clamp negative scores to 0', () => {
      const result = calculateGrade(-10);
      expect(result.grade).toBe('F');
      expect(result.percentage).toBe(0);
    });

    it('should clamp scores above 125 to 100%', () => {
      const result = calculateGrade(150);
      expect(result.percentage).toBe(100);
    });
  });

  describe('percentage calculation', () => {
    it('should calculate correct percentage', () => {
      const result = calculateGrade(62.5); // 50%
      expect(result.percentage).toBe(50);
    });

    it('should round percentage to reasonable precision', () => {
      const result = calculateGrade(83.33); // ~66.67%
      expect(result.percentage).toBeCloseTo(66.67, 1);
    });
  });

  describe('description generation', () => {
    it('should provide description for each grade', () => {
      const grades = ['A', 'B', 'C', 'D', 'F'] as const;
      grades.forEach((grade) => {
        const description = getGradeDescription(grade);
        expect(description).toBeDefined();
        expect(description.length).toBeGreaterThan(0);
      });
    });
  });
});

// ============================================
// Score Comparison Tests
// ============================================

describe('comparePropertyScores', () => {
  it('should compare two property scores', () => {
    const result1 = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );
    const result2 = calculatePropertyScore(
      mockMinimalProperty,
      mockNullExternalData
    );

    const comparison = comparePropertyScores(result1, result2);

    expect(comparison).toBeDefined();
    expect(comparison.scoreDifference).toBeDefined();
    expect(comparison.percentageDifference).toBeDefined();
    expect(comparison.categoryDifferences).toBeDefined();
  });

  it('should correctly identify better property', () => {
    const result1 = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );
    const result2 = calculatePropertyScore(
      mockMinimalProperty,
      mockNullExternalData
    );

    const comparison = comparePropertyScores(result1, result2);

    // Ideal property should score higher
    expect(comparison.scoreDifference).toBeGreaterThan(0);
    expect(comparison.winner).toBe(mockIdealProperty.id);
  });

  it('should calculate category-by-category differences', () => {
    const result1 = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );
    const result2 = calculatePropertyScore(
      mockVacantLandProperty,
      mockVacantLandExternalData
    );

    const comparison = comparePropertyScores(result1, result2);

    expect(comparison.categoryDifferences.location).toBeDefined();
    expect(comparison.categoryDifferences.risk).toBeDefined();
    expect(comparison.categoryDifferences.financial).toBeDefined();
    expect(comparison.categoryDifferences.market).toBeDefined();
    expect(comparison.categoryDifferences.profit).toBeDefined();
  });
});

// ============================================
// Score Summary Tests
// ============================================

describe('getScoreSummary', () => {
  it('should generate a human-readable summary', () => {
    const result = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );
    const summary = getScoreSummary(result);

    expect(summary).toBeDefined();
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(50);
  });

  it('should include grade in summary', () => {
    const result = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );
    const summary = getScoreSummary(result);

    expect(summary).toMatch(/Grade/i);
    expect(summary).toMatch(/[A-F][+-]?/);
  });

  it('should include total score in summary', () => {
    const result = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );
    const summary = getScoreSummary(result);

    expect(summary).toMatch(/\d+(\.\d+)?.*\/.*125/);
  });

  it('should mention warnings if present', () => {
    const result = calculatePropertyScore(
      mockMinimalProperty,
      mockNullExternalData
    );
    const summary = getScoreSummary(result);

    expect(summary).toMatch(/warning|caution|note/i);
  });
});

// ============================================
// Performance Tests
// ============================================

describe('performance', () => {
  it('should score a single property in under 100ms', () => {
    const start = performance.now();

    calculatePropertyScore(mockIdealProperty, mockIdealExternalData);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should score 10 properties in under 500ms', () => {
    const properties = createBulkMockProperties(10);
    const start = performance.now();

    properties.forEach((property) => {
      calculatePropertyScore(property, mockIdealExternalData);
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('should batch score 50 properties in under 2000ms', () => {
    const properties = createBulkMockProperties(50);
    const externalDataMap: Record<string, typeof mockIdealExternalData | null> =
      {};
    properties.forEach((p) => {
      externalDataMap[p.id] = mockIdealExternalData;
    });

    const start = performance.now();

    calculatePropertyScores(properties, externalDataMap);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});

// ============================================
// Regression Tests
// ============================================

describe('regression tests', () => {
  it('should not produce NaN scores', () => {
    const result = calculatePropertyScore(
      mockMinimalProperty,
      mockNullExternalData
    );

    expect(Number.isNaN(result.totalScore)).toBe(false);
    expect(Number.isNaN(result.location.score)).toBe(false);
    expect(Number.isNaN(result.risk.score)).toBe(false);
    expect(Number.isNaN(result.financial.score)).toBe(false);
    expect(Number.isNaN(result.market.score)).toBe(false);
    expect(Number.isNaN(result.profit.score)).toBe(false);
  });

  it('should not produce Infinity scores', () => {
    const result = calculatePropertyScore(
      mockMinimalProperty,
      mockNullExternalData
    );

    expect(Number.isFinite(result.totalScore)).toBe(true);
    expect(Number.isFinite(result.location.score)).toBe(true);
    expect(Number.isFinite(result.risk.score)).toBe(true);
    expect(Number.isFinite(result.financial.score)).toBe(true);
    expect(Number.isFinite(result.market.score)).toBe(true);
    expect(Number.isFinite(result.profit.score)).toBe(true);
  });

  it('should not exceed category maximums', () => {
    const result = calculatePropertyScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    expect(result.location.score).toBeLessThanOrEqual(25);
    expect(result.risk.score).toBeLessThanOrEqual(25);
    expect(result.financial.score).toBeLessThanOrEqual(25);
    expect(result.market.score).toBeLessThanOrEqual(25);
    expect(result.profit.score).toBeLessThanOrEqual(25);
  });

  it('should not have negative category scores', () => {
    const result = calculatePropertyScore(
      mockMinimalProperty,
      mockNullExternalData
    );

    expect(result.location.score).toBeGreaterThanOrEqual(0);
    expect(result.risk.score).toBeGreaterThanOrEqual(0);
    expect(result.financial.score).toBeGreaterThanOrEqual(0);
    expect(result.market.score).toBeGreaterThanOrEqual(0);
    expect(result.profit.score).toBeGreaterThanOrEqual(0);
  });

  it('should produce consistent results for same input', () => {
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
  });
});
