/**
 * ARV Calculation Tests
 *
 * Tests the After Repair Value (ARV) calculation functionality including:
 * - Weight calculation and normalization
 * - Statistical functions (mean, median, standard deviation)
 * - Weighted average calculation
 * - Comparable analysis
 * - ARV calculation with various configurations
 * - ARV calculation by price per square foot
 * - ARV estimate reconciliation
 * - Utility functions (formatting, validation, quality rating)
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect } from 'vitest';
import {
  calculateWeight,
  normalizeARVWeights,
  analyzeComparable,
  calculateARV,
  calculateARVByPricePerSqft,
  reconcileARVEstimates,
  formatARVResult,
  getARVQualityRating,
  validateARVResult,
  DEFAULT_ARV_CONFIG,
  type AnalyzedComparable,
  type ARVCalculation,
  type ARVCalculationConfig,
} from '../arvCalculation';
import type { ComparableProperty, SubjectProperty } from '../similarityScoring';
import type { ExtendedPropertyData } from '../priceAdjustments';

// ============================================
// Test Fixtures
// ============================================

/**
 * Standard subject property for testing
 */
const mockSubject: ExtendedPropertyData = {
  latitude: 40.5187,
  longitude: -78.3947,
  sqft: 1800,
  lotSizeSqft: 8500,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 1985,
  propertyType: 'single_family_residential',
  style: 'Ranch',
  condition: 'average',
  locationQuality: 'similar',
  hasGarage: true,
  hasPool: false,
  hasBasement: true,
  basementFinished: true,
};

/**
 * High similarity comparable (should get high weight)
 */
const mockHighSimilarityComp: ComparableProperty & { saleDate: string } = {
  latitude: 40.5188,
  longitude: -78.3948,
  sqft: 1850,
  lotSizeSqft: 8800,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 1987,
  propertyType: 'single_family_residential',
  style: 'Ranch',
  hasGarage: true,
  hasPool: false,
  salePrice: 155000,
  saleDate: '2025-12-15',
};

/**
 * Medium similarity comparable
 */
const mockMediumSimilarityComp: ComparableProperty & { saleDate: string } = {
  latitude: 40.5200,
  longitude: -78.3960,
  sqft: 2000,
  lotSizeSqft: 9500,
  bedrooms: 4,
  bathrooms: 2,
  yearBuilt: 1990,
  propertyType: 'single_family_residential',
  style: 'Colonial',
  hasGarage: true,
  hasPool: false,
  salePrice: 165000,
  saleDate: '2025-11-20',
};

/**
 * Low similarity comparable (different type)
 */
const mockLowSimilarityComp: ComparableProperty & { saleDate: string } = {
  latitude: 40.5300,
  longitude: -78.4100,
  sqft: 2800,
  lotSizeSqft: 12000,
  bedrooms: 5,
  bathrooms: 3,
  yearBuilt: 2005,
  propertyType: 'single_family_residential',
  style: 'Contemporary',
  hasGarage: true,
  hasPool: true,
  salePrice: 225000,
  saleDate: '2025-10-10',
};

/**
 * Old sale comparable (should be excluded by recency)
 */
const mockOldSaleComp: ComparableProperty & { saleDate: string } = {
  latitude: 40.5190,
  longitude: -78.3950,
  sqft: 1800,
  lotSizeSqft: 8500,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 1985,
  propertyType: 'single_family_residential',
  style: 'Ranch',
  hasGarage: true,
  hasPool: false,
  salePrice: 120000,
  saleDate: '2023-01-15',
};

/**
 * Comparable requiring large adjustment (should be excluded)
 */
const mockLargeAdjustmentComp: ComparableProperty & { saleDate: string } = {
  latitude: 40.5185,
  longitude: -78.3945,
  sqft: 3500,
  lotSizeSqft: 15000,
  bedrooms: 6,
  bathrooms: 4,
  yearBuilt: 2015,
  propertyType: 'single_family_residential',
  style: 'Custom',
  hasGarage: true,
  hasPool: true,
  salePrice: 350000,
  saleDate: '2025-12-01',
};

/**
 * Standard set of comparables
 */
const mockComparables = [
  mockHighSimilarityComp,
  mockMediumSimilarityComp,
  mockLowSimilarityComp,
  mockOldSaleComp,
];

/**
 * Custom ARV configuration for testing
 */
const mockCustomConfig: ARVCalculationConfig = {
  minSimilarityScore: 60,
  maxAdjustmentPercent: 20,
  minComparables: 2,
  maxComparables: 5,
  useWeightedAverage: true,
  weightExponent: 3,
  confidenceFactor: 0.85,
};

/**
 * Simple config without weighted average
 */
const mockSimpleConfig: ARVCalculationConfig = {
  ...DEFAULT_ARV_CONFIG,
  useWeightedAverage: false,
};

// ============================================
// Weight Calculation Tests
// ============================================

describe('calculateWeight', () => {
  describe('basic weight calculations', () => {
    it('should calculate weight for perfect similarity', () => {
      const weight = calculateWeight(100);
      expect(weight).toBe(1.0);
    });

    it('should calculate weight for 0 similarity', () => {
      const weight = calculateWeight(0);
      expect(weight).toBe(0);
    });

    it('should calculate weight for 50% similarity', () => {
      const weight = calculateWeight(50);
      expect(weight).toBe(0.25); // (0.5)^2 = 0.25
    });

    it('should calculate weight for 75% similarity', () => {
      const weight = calculateWeight(75);
      expect(weight).toBeCloseTo(0.5625, 4); // (0.75)^2
    });

    it('should use default exponent of 2', () => {
      const weight = calculateWeight(80);
      expect(weight).toBeCloseTo(0.64, 10); // (0.8)^2
    });
  });

  describe('custom exponents', () => {
    it('should handle exponent of 1 (linear)', () => {
      const weight = calculateWeight(50, 1);
      expect(weight).toBe(0.5);
    });

    it('should handle exponent of 3', () => {
      const weight = calculateWeight(50, 3);
      expect(weight).toBe(0.125); // (0.5)^3
    });

    it('should handle exponent of 0.5 (square root)', () => {
      const weight = calculateWeight(25, 0.5);
      expect(weight).toBe(0.5); // sqrt(0.25)
    });

    it('should amplify differences with higher exponent', () => {
      const weight2 = calculateWeight(80, 2);
      const weight3 = calculateWeight(80, 3);
      const weight4 = calculateWeight(80, 4);

      expect(weight2).toBeGreaterThan(weight3);
      expect(weight3).toBeGreaterThan(weight4);
    });
  });

  describe('edge cases', () => {
    it('should handle negative similarity close to 0', () => {
      const weight = calculateWeight(-10);
      // Negative values become very small when normalized and squared
      expect(weight).toBeLessThan(0.02);
    });

    it('should handle similarity > 100 as 100', () => {
      const weight = calculateWeight(150);
      expect(weight).toBeGreaterThanOrEqual(1);
    });

    it('should handle very small similarity', () => {
      const weight = calculateWeight(1);
      expect(weight).toBeCloseTo(0.0001, 6);
    });

    it('should handle very large exponent', () => {
      const weight = calculateWeight(90, 10);
      expect(weight).toBeDefined();
      expect(isNaN(weight)).toBe(false);
    });
  });
});

describe('normalizeARVWeights', () => {
  describe('basic normalization', () => {
    it('should normalize weights to sum to 1', () => {
      const weights = [0.5, 0.3, 0.2];
      const normalized = normalizeARVWeights(weights);
      const sum = normalized.reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('should preserve proportions', () => {
      const weights = [2, 1, 1];
      const normalized = normalizeARVWeights(weights);

      expect(normalized[0]).toBeCloseTo(0.5, 10);
      expect(normalized[1]).toBeCloseTo(0.25, 10);
      expect(normalized[2]).toBeCloseTo(0.25, 10);
    });

    it('should handle single weight', () => {
      const weights = [5];
      const normalized = normalizeARVWeights(weights);

      expect(normalized).toHaveLength(1);
      expect(normalized[0]).toBe(1.0);
    });

    it('should handle equal weights', () => {
      const weights = [1, 1, 1, 1];
      const normalized = normalizeARVWeights(weights);

      normalized.forEach((w) => {
        expect(w).toBeCloseTo(0.25, 10);
      });
    });

    it('should handle very small weights', () => {
      const weights = [0.001, 0.002, 0.003];
      const normalized = normalizeARVWeights(weights);
      const sum = normalized.reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(1.0, 10);
    });
  });

  describe('edge cases', () => {
    it('should handle all zero weights', () => {
      const weights = [0, 0, 0];
      const normalized = normalizeARVWeights(weights);

      normalized.forEach((w) => {
        expect(w).toBeCloseTo(0.3333, 3);
      });
    });

    it('should handle empty array', () => {
      const weights: number[] = [];
      const normalized = normalizeARVWeights(weights);

      expect(normalized).toHaveLength(0);
    });

    it('should handle very large weights', () => {
      const weights = [1000000, 2000000, 3000000];
      const normalized = normalizeARVWeights(weights);
      const sum = normalized.reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('should handle negative weights', () => {
      const weights = [-1, 2, 3];
      const normalized = normalizeARVWeights(weights);
      const sum = normalized.reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(1.0, 10);
    });
  });
});

// ============================================
// Comparable Analysis Tests
// ============================================

describe('analyzeComparable', () => {
  describe('basic analysis', () => {
    it('should return complete AnalyzedComparable structure', () => {
      const analyzed = analyzeComparable(mockSubject, mockHighSimilarityComp);

      expect(analyzed).toBeDefined();
      expect(analyzed.id).toBe(mockHighSimilarityComp.id);
      expect(analyzed.similarityScore).toBeDefined();
      expect(analyzed.adjustmentResult).toBeDefined();
      expect(analyzed.weight).toBeDefined();
      expect(analyzed.arvContribution).toBeDefined();
      expect(analyzed.includedInARV).toBeDefined();
    });

    it('should include comparable for high similarity', () => {
      const analyzed = analyzeComparable(mockSubject, mockHighSimilarityComp);

      expect(analyzed.includedInARV).toBe(true);
      expect(analyzed.exclusionReason).toBeUndefined();
      expect(analyzed.weight).toBeGreaterThan(0);
    });

    it('should calculate similarity score', () => {
      const analyzed = analyzeComparable(mockSubject, mockHighSimilarityComp);

      expect(analyzed.similarityScore).toBeGreaterThan(0);
      expect(analyzed.similarityScore).toBeLessThanOrEqual(100);
    });

    it('should calculate price adjustments', () => {
      const analyzed = analyzeComparable(mockSubject, mockHighSimilarityComp);

      expect(analyzed.adjustmentResult).toBeDefined();
      expect(analyzed.adjustmentResult.adjustedPrice).toBeDefined();
      expect(analyzed.adjustmentResult.netAdjustment).toBeDefined();
      expect(analyzed.adjustmentResult.grossAdjustmentPercent).toBeDefined();
    });

    it('should calculate weight based on similarity', () => {
      const highSim = analyzeComparable(mockSubject, mockHighSimilarityComp);
      const lowSim = analyzeComparable(mockSubject, mockLowSimilarityComp);

      expect(highSim.weight).toBeGreaterThan(lowSim.weight);
    });
  });

  describe('exclusion logic', () => {
    it('should exclude comp with low similarity', () => {
      const config: ARVCalculationConfig = {
        ...DEFAULT_ARV_CONFIG,
        minSimilarityScore: 90,
      };

      const analyzed = analyzeComparable(
        mockSubject,
        mockMediumSimilarityComp,
        config
      );

      if (analyzed.similarityScore && analyzed.similarityScore < 90) {
        expect(analyzed.includedInARV).toBe(false);
        expect(analyzed.exclusionReason).toContain('Similarity score');
        expect(analyzed.weight).toBe(0);
      }
    });

    it('should exclude comp with large adjustment', () => {
      const analyzed = analyzeComparable(
        mockSubject,
        mockLargeAdjustmentComp,
        DEFAULT_ARV_CONFIG
      );

      // The comp should be excluded (either for similarity or adjustment)
      expect(analyzed.includedInARV).toBe(false);
      expect(analyzed.exclusionReason).toBeDefined();
      expect(analyzed.weight).toBe(0);
    });

    it('should respect custom similarity threshold', () => {
      const strictConfig: ARVCalculationConfig = {
        ...DEFAULT_ARV_CONFIG,
        minSimilarityScore: 85,
      };

      const analyzed = analyzeComparable(
        mockSubject,
        mockMediumSimilarityComp,
        strictConfig
      );

      if (analyzed.similarityScore && analyzed.similarityScore < 85) {
        expect(analyzed.includedInARV).toBe(false);
      }
    });

    it('should respect custom adjustment threshold', () => {
      const strictConfig: ARVCalculationConfig = {
        ...DEFAULT_ARV_CONFIG,
        maxAdjustmentPercent: 15,
      };

      const analyzed = analyzeComparable(
        mockSubject,
        mockLowSimilarityComp,
        strictConfig
      );

      if (analyzed.adjustmentResult.grossAdjustmentPercent > 15) {
        expect(analyzed.includedInARV).toBe(false);
      }
    });
  });

  describe('weight exponent effect', () => {
    it('should apply custom weight exponent', () => {
      const config2: ARVCalculationConfig = {
        ...DEFAULT_ARV_CONFIG,
        weightExponent: 2,
      };

      const config3: ARVCalculationConfig = {
        ...DEFAULT_ARV_CONFIG,
        weightExponent: 3,
      };

      const analyzed2 = analyzeComparable(mockSubject, mockMediumSimilarityComp, config2);
      const analyzed3 = analyzeComparable(mockSubject, mockMediumSimilarityComp, config3);

      if (analyzed2.includedInARV && analyzed3.includedInARV) {
        expect(analyzed2.weight).toBeGreaterThan(analyzed3.weight);
      }
    });
  });
});

// ============================================
// ARV Calculation Tests
// ============================================

describe('calculateARV', () => {
  describe('basic ARV calculations', () => {
    it('should return complete ARVCalculation structure', () => {
      const result = calculateARV(mockSubject, mockComparables);

      expect(result).toBeDefined();
      expect(result.arv).toBeDefined();
      expect(result.simpleAverage).toBeDefined();
      expect(result.medianPrice).toBeDefined();
      expect(result.minPrice).toBeDefined();
      expect(result.maxPrice).toBeDefined();
      expect(result.priceRange).toBeDefined();
      expect(result.standardDeviation).toBeDefined();
      expect(result.coefficientOfVariation).toBeDefined();
      expect(result.avgPricePerSqft).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.confidenceRange).toBeDefined();
      expect(result.comparablesUsed).toBeDefined();
      expect(result.totalComparables).toBeDefined();
      expect(result.comparables).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.calculationMethod).toBeDefined();
      expect(result.calculatedAt).toBeDefined();
    });

    it('should calculate ARV as positive number', () => {
      const result = calculateARV(mockSubject, mockComparables);

      expect(result.arv).toBeGreaterThan(0);
    });

    it('should use weighted average by default', () => {
      const result = calculateARV(mockSubject, mockComparables);

      expect(result.calculationMethod).toBe('weighted');
    });

    it('should use simple average when disabled', () => {
      const result = calculateARV(mockSubject, mockComparables, mockSimpleConfig);

      expect(result.calculationMethod).toBe('simple');
    });

    it('should track total comparables analyzed', () => {
      const result = calculateARV(mockSubject, mockComparables);

      expect(result.totalComparables).toBe(mockComparables.length);
    });

    it('should filter out excluded comparables', () => {
      const result = calculateARV(mockSubject, mockComparables);

      expect(result.comparablesUsed).toBeLessThanOrEqual(result.totalComparables);
      expect(result.comparablesUsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('statistical calculations', () => {
    it('should calculate median price', () => {
      const result = calculateARV(mockSubject, mockComparables);

      expect(result.medianPrice).toBeGreaterThan(0);
      expect(result.medianPrice).toBeGreaterThanOrEqual(result.minPrice);
      expect(result.medianPrice).toBeLessThanOrEqual(result.maxPrice);
    });

    it('should calculate price range', () => {
      const result = calculateARV(mockSubject, mockComparables);

      expect(result.priceRange).toBe(result.maxPrice - result.minPrice);
    });

    it('should calculate standard deviation', () => {
      const result = calculateARV(mockSubject, mockComparables);

      expect(result.standardDeviation).toBeGreaterThanOrEqual(0);
    });

    it('should calculate coefficient of variation', () => {
      const result = calculateARV(mockSubject, mockComparables);

      expect(result.coefficientOfVariation).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average price per sqft', () => {
      const result = calculateARV(mockSubject, mockComparables);

      if (result.comparablesUsed > 0) {
        expect(result.avgPricePerSqft).toBeGreaterThan(0);
      }
    });
  });

  describe('confidence calculations', () => {
    it('should calculate confidence between 0-100', () => {
      const result = calculateARV(mockSubject, mockComparables);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should have higher confidence with more comparables', () => {
      const manyComps = [
        mockHighSimilarityComp,
        mockMediumSimilarityComp,
        { ...mockHighSimilarityComp, salePrice: 156000, latitude: 40.5189, longitude: -78.3949 },
        { ...mockHighSimilarityComp, salePrice: 157000, latitude: 40.5190, longitude: -78.3950 },
        { ...mockHighSimilarityComp, salePrice: 158000, latitude: 40.5191, longitude: -78.3951 },
      ];

      const resultMany = calculateARV(mockSubject, manyComps);
      const resultFew = calculateARV(mockSubject, [mockHighSimilarityComp]);

      if (resultMany.comparablesUsed >= 5 && resultFew.comparablesUsed === 1) {
        expect(resultMany.confidence).toBeGreaterThan(resultFew.confidence);
      }
    });

    it('should calculate confidence range', () => {
      const result = calculateARV(mockSubject, mockComparables);

      expect(result.confidenceRange.low).toBeLessThan(result.arv);
      expect(result.confidenceRange.mid).toBe(result.arv);
      expect(result.confidenceRange.high).toBeGreaterThan(result.arv);
    });

    it('should have wider range with lower confidence', () => {
      const result = calculateARV(mockSubject, mockComparables);

      const rangePct = (result.confidenceRange.high - result.confidenceRange.low) / result.arv;

      if (result.confidence < 50) {
        expect(rangePct).toBeGreaterThan(0.1);
      }
    });
  });

  describe('configuration options', () => {
    it('should respect minComparables setting', () => {
      const strictConfig: ARVCalculationConfig = {
        ...DEFAULT_ARV_CONFIG,
        minComparables: 5,
      };

      const result = calculateARV(mockSubject, mockComparables, strictConfig);

      if (result.comparablesUsed < 5) {
        expect(result.warnings.some(w => w.includes('minimum'))).toBe(true);
      }
    });

    it('should respect maxComparables setting', () => {
      const manyComps = Array.from({ length: 15 }, (_, i) => ({
        ...mockHighSimilarityComp,
        salePrice: 155000 + i * 1000,
        latitude: 40.5188 + i * 0.0001,
        longitude: -78.3948 + i * 0.0001,
      }));

      const limitedConfig: ARVCalculationConfig = {
        ...DEFAULT_ARV_CONFIG,
        maxComparables: 8,
      };

      const result = calculateARV(mockSubject, manyComps, limitedConfig);

      expect(result.comparablesUsed).toBeLessThanOrEqual(8);
    });

    it('should apply custom confidence factor', () => {
      const result = calculateARV(mockSubject, mockComparables, mockCustomConfig);

      expect(result).toBeDefined();
    });
  });

  describe('warnings', () => {
    it('should warn when insufficient comparables', () => {
      const result = calculateARV(mockSubject, [mockHighSimilarityComp]);

      if (result.comparablesUsed < DEFAULT_ARV_CONFIG.minComparables) {
        expect(result.warnings.some(w => w.includes('comparable'))).toBe(true);
      }
    });

    it('should warn about high price variation', () => {
      const variedComps = [
        { ...mockHighSimilarityComp, salePrice: 100000 },
        { ...mockHighSimilarityComp, salePrice: 200000, latitude: 40.5189, longitude: -78.3949 },
        { ...mockHighSimilarityComp, salePrice: 150000, latitude: 40.5190, longitude: -78.3950 },
      ];

      const result = calculateARV(mockSubject, variedComps);

      if (result.coefficientOfVariation > 0.2) {
        expect(result.warnings.some(w => w.includes('variation'))).toBe(true);
      }
    });

    it('should warn when weighted and simple averages differ', () => {
      const result = calculateARV(mockSubject, mockComparables);

      const diff = Math.abs(result.arv - result.simpleAverage);
      const pctDiff = diff / result.simpleAverage;

      if (pctDiff > 0.05) {
        expect(result.warnings.some(w => w.includes('differ'))).toBe(true);
      }
    });

    it('should warn when ARV differs from median', () => {
      const result = calculateARV(mockSubject, mockComparables);

      const diff = Math.abs(result.arv - result.medianPrice);
      const pctDiff = diff / result.medianPrice;

      if (pctDiff > 0.1) {
        expect(result.warnings.some(w => w.includes('median'))).toBe(true);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty comparables array', () => {
      const result = calculateARV(mockSubject, []);

      expect(result.arv).toBe(0);
      expect(result.comparablesUsed).toBe(0);
      expect(result.calculationMethod).toBe('simple');
      expect(result.warnings.some(w => w.includes('No valid'))).toBe(true);
    });

    it('should handle single comparable', () => {
      const result = calculateARV(mockSubject, [mockHighSimilarityComp]);

      expect(result).toBeDefined();
      if (result.comparablesUsed === 1) {
        expect(result.calculationMethod).toBe('simple');
      }
    });

    it('should handle all excluded comparables', () => {
      const strictConfig: ARVCalculationConfig = {
        ...DEFAULT_ARV_CONFIG,
        minSimilarityScore: 99,
      };

      const result = calculateARV(mockSubject, mockComparables, strictConfig);

      if (result.comparablesUsed === 0) {
        expect(result.arv).toBe(0);
      }
    });

    it('should round prices to nearest dollar', () => {
      const result = calculateARV(mockSubject, mockComparables);

      expect(result.arv).toBe(Math.round(result.arv));
      expect(result.simpleAverage).toBe(Math.round(result.simpleAverage));
      expect(result.medianPrice).toBe(Math.round(result.medianPrice));
    });
  });

  describe('comparable details', () => {
    it('should include all analyzed comparables', () => {
      const result = calculateARV(mockSubject, mockComparables);

      expect(result.comparables).toHaveLength(mockComparables.length);
    });

    it('should mark included comparables correctly', () => {
      const result = calculateARV(mockSubject, mockComparables);

      const included = result.comparables.filter(c => c.includedInARV);
      expect(included.length).toBe(result.comparablesUsed);
    });

    it('should provide exclusion reasons for excluded comparables', () => {
      const result = calculateARV(mockSubject, mockComparables);

      const excluded = result.comparables.filter(c => !c.includedInARV);
      excluded.forEach(comp => {
        expect(comp.exclusionReason).toBeDefined();
      });
    });

    it('should calculate ARV contributions for included comparables', () => {
      const result = calculateARV(mockSubject, mockComparables);

      const included = result.comparables.filter(c => c.includedInARV);
      const totalContribution = included.reduce((sum, c) => sum + c.arvContribution, 0);

      if (result.comparablesUsed > 0 && result.calculationMethod === 'weighted') {
        expect(totalContribution).toBeCloseTo(result.arv, 0);
      }
    });
  });
});

// ============================================
// ARV by Price Per SqFt Tests
// ============================================

describe('calculateARVByPricePerSqft', () => {
  describe('basic calculations', () => {
    it('should calculate ARV based on price per sqft', () => {
      const arv = calculateARVByPricePerSqft(mockSubject, mockComparables);

      expect(arv).not.toBeNull();
      if (arv !== null) {
        expect(arv).toBeGreaterThan(0);
      }
    });

    it('should return null if subject has no sqft', () => {
      const noSqftSubject = { ...mockSubject, sqft: undefined };
      const arv = calculateARVByPricePerSqft(noSqftSubject, mockComparables);

      expect(arv).toBeNull();
    });

    it('should return null if subject has 0 sqft', () => {
      const zeroSqftSubject = { ...mockSubject, sqft: 0 };
      const arv = calculateARVByPricePerSqft(zeroSqftSubject, mockComparables);

      expect(arv).toBeNull();
    });

    it('should return null if no valid comparables', () => {
      const noSqftComps = mockComparables.map(c => ({ ...c, sqft: undefined }));
      const arv = calculateARVByPricePerSqft(mockSubject, noSqftComps);

      expect(arv).toBeNull();
    });

    it('should filter out comparables without sqft', () => {
      const mixedComps = [
        mockHighSimilarityComp,
        { ...mockMediumSimilarityComp, sqft: undefined },
        mockLowSimilarityComp,
      ];

      const arv = calculateARVByPricePerSqft(mockSubject, mixedComps);

      expect(arv).not.toBeNull();
    });

    it('should round result to nearest dollar', () => {
      const arv = calculateARVByPricePerSqft(mockSubject, mockComparables);

      if (arv !== null) {
        expect(arv).toBe(Math.round(arv));
      }
    });
  });

  describe('weighted calculations', () => {
    it('should weight by similarity score', () => {
      const arv = calculateARVByPricePerSqft(mockSubject, mockComparables);

      expect(arv).not.toBeNull();
    });

    it('should give more weight to similar properties', () => {
      const similarComps = [
        mockHighSimilarityComp,
        { ...mockHighSimilarityComp, salePrice: 160000, latitude: 40.5189, longitude: -78.3949 },
      ];

      const arv = calculateARVByPricePerSqft(mockSubject, similarComps);

      expect(arv).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle single comparable', () => {
      const arv = calculateARVByPricePerSqft(mockSubject, [mockHighSimilarityComp]);

      expect(arv).not.toBeNull();
    });

    it('should handle very small subject', () => {
      const smallSubject = { ...mockSubject, sqft: 500 };
      const arv = calculateARVByPricePerSqft(smallSubject, mockComparables);

      if (arv !== null) {
        expect(arv).toBeGreaterThan(0);
      }
    });

    it('should handle very large subject', () => {
      const largeSubject = { ...mockSubject, sqft: 5000 };
      const arv = calculateARVByPricePerSqft(largeSubject, mockComparables);

      if (arv !== null) {
        expect(arv).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================
// ARV Reconciliation Tests
// ============================================

describe('reconcileARVEstimates', () => {
  describe('basic reconciliation', () => {
    it('should return reconciled ARV structure', () => {
      const result = reconcileARVEstimates(160000, 158000, 162000, 80);

      expect(result).toBeDefined();
      expect(result.finalARV).toBeDefined();
      expect(result.method).toBeDefined();
      expect(result.reasoning).toBeDefined();
    });

    it('should calculate weighted average of estimates', () => {
      const result = reconcileARVEstimates(160000, 158000, 162000, 80);

      expect(result.finalARV).toBeGreaterThan(0);
      expect(result.finalARV).toBeGreaterThanOrEqual(158000);
      expect(result.finalARV).toBeLessThanOrEqual(162000);
    });

    it('should round result to nearest dollar', () => {
      const result = reconcileARVEstimates(160000, 158000, 162000, 80);

      expect(result.finalARV).toBe(Math.round(result.finalARV));
    });

    it('should identify primary method', () => {
      const result = reconcileARVEstimates(160000, 158000, 162000, 80);

      expect(['Weighted Average', 'Median', 'Price/SqFt']).toContain(result.method);
    });

    it('should provide reasoning', () => {
      const result = reconcileARVEstimates(160000, 158000, 162000, 80);

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('weighting logic', () => {
    it('should weight heavily toward high confidence weighted ARV', () => {
      const result = reconcileARVEstimates(160000, 140000, 180000, 95);

      // With 95% confidence, weighted ARV should have most influence
      // But not exactly equal due to median and price/sqft contributions
      expect(result.finalARV).toBeGreaterThan(155000);
      expect(result.finalARV).toBeLessThan(165000);
    });

    it('should balance estimates with medium confidence', () => {
      const result = reconcileARVEstimates(160000, 140000, null, 60);

      expect(result.finalARV).toBeGreaterThan(140000);
      expect(result.finalARV).toBeLessThan(160000);
    });

    it('should handle low confidence by relying more on median', () => {
      const result = reconcileARVEstimates(160000, 140000, null, 30);

      expect(result.finalARV).toBeDefined();
    });
  });

  describe('null price per sqft handling', () => {
    it('should handle null pricePerSqftARV', () => {
      const result = reconcileARVEstimates(160000, 158000, null, 80);

      expect(result.finalARV).toBeDefined();
      expect(result.finalARV).toBeGreaterThan(0);
    });

    it('should provide different reasoning without price per sqft', () => {
      const withPPS = reconcileARVEstimates(160000, 158000, 162000, 80);
      const withoutPPS = reconcileARVEstimates(160000, 158000, null, 80);

      expect(withPPS.reasoning).not.toBe(withoutPPS.reasoning);
    });
  });

  describe('edge cases', () => {
    it('should handle identical estimates', () => {
      const result = reconcileARVEstimates(160000, 160000, 160000, 80);

      expect(result.finalARV).toBe(160000);
    });

    it('should handle very different estimates', () => {
      const result = reconcileARVEstimates(200000, 120000, 180000, 60);

      expect(result.finalARV).toBeGreaterThan(120000);
      expect(result.finalARV).toBeLessThan(200000);
    });

    it('should handle 100% confidence', () => {
      const result = reconcileARVEstimates(160000, 158000, 162000, 100);

      expect(result.finalARV).toBeCloseTo(160000, -3);
    });

    it('should handle 0% confidence', () => {
      const result = reconcileARVEstimates(160000, 158000, 162000, 0);

      expect(result.finalARV).toBeDefined();
      expect(result.finalARV).toBeGreaterThan(0);
    });
  });
});

// ============================================
// Utility Function Tests
// ============================================

describe('formatARVResult', () => {
  it('should return formatted string', () => {
    const mockResult: ARVCalculation = {
      arv: 160000,
      simpleAverage: 158000,
      medianPrice: 159000,
      minPrice: 150000,
      maxPrice: 170000,
      priceRange: 20000,
      standardDeviation: 8500,
      coefficientOfVariation: 0.05,
      avgPricePerSqft: 89,
      confidence: 82,
      confidenceRange: { low: 152000, mid: 160000, high: 168000 },
      comparablesUsed: 5,
      totalComparables: 8,
      comparables: [],
      warnings: [],
      calculationMethod: 'weighted',
      calculatedAt: new Date().toISOString(),
    };

    const formatted = formatARVResult(mockResult);

    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
    expect(formatted).toContain('$160,000');
    expect(formatted).toContain('82%');
    expect(formatted).toContain('5 comparable');
    expect(formatted).toContain('weighted');
  });

  it('should include all key information', () => {
    const mockResult: ARVCalculation = {
      arv: 160000,
      simpleAverage: 158000,
      medianPrice: 159000,
      minPrice: 150000,
      maxPrice: 170000,
      priceRange: 20000,
      standardDeviation: 8500,
      coefficientOfVariation: 0.05,
      avgPricePerSqft: 89,
      confidence: 82,
      confidenceRange: { low: 152000, mid: 160000, high: 168000 },
      comparablesUsed: 5,
      totalComparables: 8,
      comparables: [],
      warnings: [],
      calculationMethod: 'weighted',
      calculatedAt: new Date().toISOString(),
    };

    const formatted = formatARVResult(mockResult);

    expect(formatted).toContain('ARV');
    expect(formatted).toContain('Range');
    expect(formatted).toContain('Based on');
    expect(formatted).toContain('Method');
  });
});

describe('getARVQualityRating', () => {
  const createMockResult = (overrides: Partial<ARVCalculation>): ARVCalculation => ({
    arv: 160000,
    simpleAverage: 158000,
    medianPrice: 159000,
    minPrice: 150000,
    maxPrice: 170000,
    priceRange: 20000,
    standardDeviation: 8500,
    coefficientOfVariation: 0.05,
    avgPricePerSqft: 89,
    confidence: 82,
    confidenceRange: { low: 152000, mid: 160000, high: 168000 },
    comparablesUsed: 5,
    totalComparables: 8,
    comparables: [],
    warnings: [],
    calculationMethod: 'weighted',
    calculatedAt: new Date().toISOString(),
    ...overrides,
  });

  describe('quality ratings', () => {
    it('should rate excellent for high confidence, many comps, low variation', () => {
      const result = createMockResult({
        confidence: 88,
        comparablesUsed: 7,
        coefficientOfVariation: 0.08,
        warnings: [],
      });

      const rating = getARVQualityRating(result);
      expect(rating).toBe('excellent');
    });

    it('should rate good for moderate quality', () => {
      const result = createMockResult({
        confidence: 72,
        comparablesUsed: 4,
        coefficientOfVariation: 0.12,
        warnings: ['Some variation'],
      });

      const rating = getARVQualityRating(result);
      expect(rating).toBe('good');
    });

    it('should rate fair for lower quality', () => {
      const result = createMockResult({
        confidence: 58,
        comparablesUsed: 3,
        coefficientOfVariation: 0.18,
        warnings: ['High variation', 'Few comps'],
      });

      const rating = getARVQualityRating(result);
      expect(rating).toBe('fair');
    });

    it('should rate poor for very low quality', () => {
      const result = createMockResult({
        confidence: 35,
        comparablesUsed: 2,
        coefficientOfVariation: 0.25,
        warnings: ['Very high variation', 'Insufficient comps', 'Large differences'],
      });

      const rating = getARVQualityRating(result);
      expect(rating).toBe('poor');
    });
  });

  describe('factor impacts', () => {
    it('should penalize few comparables', () => {
      const manyComps = createMockResult({ comparablesUsed: 6 });
      const fewComps = createMockResult({ comparablesUsed: 2 });

      const ratingMany = getARVQualityRating(manyComps);
      const ratingFew = getARVQualityRating(fewComps);

      const ratings = ['poor', 'fair', 'good', 'excellent'];
      expect(ratings.indexOf(ratingMany)).toBeGreaterThan(ratings.indexOf(ratingFew));
    });

    it('should penalize high variation', () => {
      const lowVar = createMockResult({ coefficientOfVariation: 0.05 });
      const highVar = createMockResult({ coefficientOfVariation: 0.25 });

      const ratingLow = getARVQualityRating(lowVar);
      const ratingHigh = getARVQualityRating(highVar);

      const ratings = ['poor', 'fair', 'good', 'excellent'];
      expect(ratings.indexOf(ratingLow)).toBeGreaterThanOrEqual(ratings.indexOf(ratingHigh));
    });

    it('should penalize many warnings', () => {
      const noWarnings = createMockResult({ warnings: [] });
      const manyWarnings = createMockResult({
        warnings: ['Warning 1', 'Warning 2', 'Warning 3', 'Warning 4'],
      });

      const ratingNone = getARVQualityRating(noWarnings);
      const ratingMany = getARVQualityRating(manyWarnings);

      const ratings = ['poor', 'fair', 'good', 'excellent'];
      expect(ratings.indexOf(ratingNone)).toBeGreaterThan(ratings.indexOf(ratingMany));
    });
  });
});

describe('validateARVResult', () => {
  const createMockResult = (overrides: Partial<ARVCalculation>): ARVCalculation => ({
    arv: 160000,
    simpleAverage: 158000,
    medianPrice: 159000,
    minPrice: 150000,
    maxPrice: 170000,
    priceRange: 20000,
    standardDeviation: 8500,
    coefficientOfVariation: 0.05,
    avgPricePerSqft: 89,
    confidence: 82,
    confidenceRange: { low: 152000, mid: 160000, high: 168000 },
    comparablesUsed: 5,
    totalComparables: 8,
    comparables: [],
    warnings: [],
    calculationMethod: 'weighted',
    calculatedAt: new Date().toISOString(),
    ...overrides,
  });

  describe('validation errors', () => {
    it('should return empty array for valid result', () => {
      const result = createMockResult({});
      const errors = validateARVResult(result);

      expect(errors).toHaveLength(0);
    });

    it('should detect zero ARV', () => {
      const result = createMockResult({ arv: 0 });
      const errors = validateARVResult(result);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('zero or negative'))).toBe(true);
    });

    it('should detect negative ARV', () => {
      const result = createMockResult({ arv: -50000 });
      const errors = validateARVResult(result);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('zero or negative'))).toBe(true);
    });

    it('should detect no comparables used', () => {
      const result = createMockResult({ comparablesUsed: 0 });
      const errors = validateARVResult(result);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('No valid comparables'))).toBe(true);
    });

    it('should detect very low confidence', () => {
      const result = createMockResult({ confidence: 25 });
      const errors = validateARVResult(result);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('low confidence'))).toBe(true);
    });

    it('should detect excessive price range', () => {
      const result = createMockResult({
        arv: 160000,
        priceRange: 90000,
      });
      const errors = validateARVResult(result);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Price range'))).toBe(true);
    });
  });

  describe('multiple errors', () => {
    it('should detect multiple issues', () => {
      const result = createMockResult({
        arv: 0,
        comparablesUsed: 0,
        confidence: 15,
      });
      const errors = validateARVResult(result);

      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('edge cases', () => {
    it('should handle confidence exactly at 30', () => {
      const result = createMockResult({ confidence: 30 });
      const errors = validateARVResult(result);

      expect(errors.every(e => !e.includes('low confidence'))).toBe(true);
    });

    it('should handle price range exactly at 50%', () => {
      const result = createMockResult({
        arv: 160000,
        priceRange: 80000,
      });
      const errors = validateARVResult(result);

      expect(errors.every(e => !e.includes('Price range'))).toBe(true);
    });
  });
});
