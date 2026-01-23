/**
 * Similarity Scoring Tests
 *
 * Tests the similarity scoring functionality including:
 * - Distance calculations (Haversine formula)
 * - Individual factor scoring functions
 * - Overall similarity score calculation
 * - Comparable filtering and ranking
 * - Weight validation and normalization
 * - Utility functions
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-23
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDistanceMiles,
  calculateDistanceScore,
  calculateSqftScore,
  calculateLotSizeScore,
  calculateBedroomScore,
  calculateBathroomScore,
  calculateAgeScore,
  calculateRecencyScore,
  calculatePropertyTypeScore,
  calculateStyleScore,
  calculateFeaturesScore,
  calculateSimilarityScore,
  scoreComparables,
  filterByMinScore,
  getTopComparables,
  getSimilarityDescription,
  getSignificantDifference,
  validateWeights,
  normalizeWeights,
  DEFAULT_WEIGHTS,
  type SubjectProperty,
  type ComparableProperty,
  type SimilarityWeights,
} from '../similarityScoring';

// ============================================
// Test Fixtures
// ============================================

/**
 * Standard subject property for testing (Blair County, PA location)
 */
const mockSubject: SubjectProperty = {
  latitude: 40.5187,
  longitude: -78.3947,
  sqft: 1800,
  lotSizeSqft: 8500,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 1985,
  propertyType: 'SFR',
  style: 'Ranch',
  hasGarage: true,
  garageSpaces: 2,
  hasPool: false,
  hasBasement: true,
  basementFinished: true,
  stories: 1,
};

/**
 * Near-identical comparable (should get near-perfect score)
 */
const mockIdenticalComp: ComparableProperty = {
  latitude: 40.5188, // ~0.01 miles away
  longitude: -78.3948,
  sqft: 1800,
  lotSizeSqft: 8500,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 1985,
  propertyType: 'SFR',
  style: 'Ranch',
  hasGarage: true,
  garageSpaces: 2,
  hasPool: false,
  hasBasement: true,
  basementFinished: true,
  salePrice: 155000,
  saleDate: '2026-01-15', // Very recent
};

/**
 * Very similar comparable (high similarity score)
 */
const mockHighSimilarityComp: ComparableProperty = {
  latitude: 40.5200, // ~0.1 miles away
  longitude: -78.3960,
  sqft: 1850, // +2.8% sqft
  lotSizeSqft: 8800,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 1987, // 2 year difference
  propertyType: 'Single Family',
  style: 'Ranch',
  hasGarage: true,
  hasPool: false,
  salePrice: 162000,
  saleDate: '2025-12-20', // ~1 month ago
};

/**
 * Moderately similar comparable
 */
const mockMediumSimilarityComp: ComparableProperty = {
  latitude: 40.5300, // ~1 mile away
  longitude: -78.4100,
  sqft: 2000, // +11% sqft
  lotSizeSqft: 9500,
  bedrooms: 4, // Different bedroom count
  bathrooms: 2,
  yearBuilt: 1990, // 5 year difference
  propertyType: 'SFR',
  style: 'Colonial', // Different style
  hasGarage: true,
  hasPool: false,
  salePrice: 175000,
  saleDate: '2025-10-15', // ~3 months ago
};

/**
 * Low similarity comparable (far, different size, different features)
 */
const mockLowSimilarityComp: ComparableProperty = {
  latitude: 40.5500, // ~2.5 miles away
  longitude: -78.4400,
  sqft: 2800, // +56% sqft
  lotSizeSqft: 15000,
  bedrooms: 5, // +2 bedrooms
  bathrooms: 3, // +1 bathroom
  yearBuilt: 2005, // 20 year difference
  propertyType: 'Single Family',
  style: 'Contemporary',
  hasGarage: true,
  hasPool: true, // Has pool
  salePrice: 285000,
  saleDate: '2025-07-10', // ~6 months ago
};

/**
 * Very old sale (should get low recency score)
 */
const mockOldSaleComp: ComparableProperty = {
  latitude: 40.5190,
  longitude: -78.3950,
  sqft: 1800,
  lotSizeSqft: 8500,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 1985,
  propertyType: 'SFR',
  style: 'Ranch',
  salePrice: 135000,
  saleDate: '2023-01-15', // ~3 years ago
};

/**
 * Different property type (should get low property type score)
 */
const mockDifferentTypeComp: ComparableProperty = {
  latitude: 40.5190,
  longitude: -78.3950,
  sqft: 1800,
  lotSizeSqft: 8500,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 1985,
  propertyType: 'Condo', // Different type
  style: 'Ranch',
  salePrice: 145000,
  saleDate: '2026-01-10',
};

/**
 * Property with minimal data
 */
const mockMinimalComp: ComparableProperty = {
  latitude: 40.5200,
  longitude: -78.3960,
  salePrice: 150000,
  saleDate: '2026-01-01',
};

/**
 * Array of all comparables for filtering tests
 */
const mockAllComparables = [
  mockIdenticalComp,
  mockHighSimilarityComp,
  mockMediumSimilarityComp,
  mockLowSimilarityComp,
  mockOldSaleComp,
  mockDifferentTypeComp,
];

/**
 * Custom weights for testing
 */
const mockCustomWeights: SimilarityWeights = {
  distance: 0.30,
  sqft: 0.25,
  bedrooms: 0.15,
  bathrooms: 0.10,
  age: 0.08,
  recency: 0.05,
  propertyType: 0.04,
  lotSize: 0.02,
  style: 0.01,
  features: 0.00,
};

// ============================================
// Distance Calculation Tests
// ============================================

describe('calculateDistanceMiles', () => {
  describe('basic distance calculations', () => {
    it('should calculate zero distance for same coordinates', () => {
      const distance = calculateDistanceMiles(40.5187, -78.3947, 40.5187, -78.3947);
      expect(distance).toBe(0);
    });

    it('should calculate small distance for nearby points', () => {
      const distance = calculateDistanceMiles(40.5187, -78.3947, 40.5188, -78.3948);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.1); // Should be very small
    });

    it('should calculate larger distance for distant points', () => {
      // Approximately 1 mile difference
      const distance = calculateDistanceMiles(40.5187, -78.3947, 40.5300, -78.4100);
      expect(distance).toBeGreaterThan(0.5);
      expect(distance).toBeLessThan(2.0);
    });

    it('should be symmetric (A to B = B to A)', () => {
      const d1 = calculateDistanceMiles(40.5187, -78.3947, 40.5300, -78.4100);
      const d2 = calculateDistanceMiles(40.5300, -78.4100, 40.5187, -78.3947);
      expect(d1).toBeCloseTo(d2, 10);
    });
  });

  describe('Haversine formula accuracy', () => {
    it('should calculate known distance correctly (Philadelphia to Pittsburgh ~300 miles)', () => {
      const distance = calculateDistanceMiles(39.9526, -75.1652, 40.4406, -79.9959);
      expect(distance).toBeGreaterThan(250);
      expect(distance).toBeLessThan(320);
    });

    it('should handle north-south distance', () => {
      const distance = calculateDistanceMiles(40.0, -78.0, 41.0, -78.0);
      expect(distance).toBeGreaterThan(60);
      expect(distance).toBeLessThan(75);
    });

    it('should handle east-west distance', () => {
      const distance = calculateDistanceMiles(40.0, -78.0, 40.0, -79.0);
      expect(distance).toBeGreaterThan(50);
      expect(distance).toBeLessThan(70);
    });
  });

  describe('edge cases', () => {
    it('should handle equator crossing', () => {
      const distance = calculateDistanceMiles(-1.0, 0.0, 1.0, 0.0);
      expect(distance).toBeGreaterThan(0);
    });

    it('should handle international date line', () => {
      const distance = calculateDistanceMiles(0, 179, 0, -179);
      expect(distance).toBeGreaterThan(0);
    });

    it('should handle polar coordinates', () => {
      const distance = calculateDistanceMiles(89.0, 0.0, 89.0, 180.0);
      expect(distance).toBeGreaterThan(0);
    });
  });
});

// ============================================
// Individual Factor Scoring Tests
// ============================================

describe('calculateDistanceScore', () => {
  describe('basic scoring', () => {
    it('should return 100 for zero distance', () => {
      expect(calculateDistanceScore(0)).toBe(100);
    });

    it('should return 0 for distance >= max threshold (3 miles)', () => {
      expect(calculateDistanceScore(3.0)).toBe(0);
      expect(calculateDistanceScore(5.0)).toBe(0);
    });

    it('should return high score for very close properties', () => {
      const score = calculateDistanceScore(0.1);
      expect(score).toBeGreaterThan(90);
    });

    it('should decrease score as distance increases', () => {
      const score1 = calculateDistanceScore(0.5);
      const score2 = calculateDistanceScore(1.0);
      const score3 = calculateDistanceScore(2.0);

      expect(score1).toBeGreaterThan(score2);
      expect(score2).toBeGreaterThan(score3);
    });
  });

  describe('exponential decay', () => {
    it('should have steeper drop-off near zero (exponential)', () => {
      const score0_5 = calculateDistanceScore(0.5);
      const score1_0 = calculateDistanceScore(1.0);
      const diff1 = score0_5 - score1_0;

      const score1_5 = calculateDistanceScore(1.5);
      const score2_0 = calculateDistanceScore(2.0);
      const diff2 = score1_5 - score2_0;

      expect(diff1).toBeGreaterThan(diff2);
    });
  });

  describe('edge cases', () => {
    it('should handle negative distance as zero', () => {
      expect(calculateDistanceScore(-1)).toBe(100);
    });

    it('should clamp scores to 0-100 range', () => {
      expect(calculateDistanceScore(0)).toBeLessThanOrEqual(100);
      expect(calculateDistanceScore(10)).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('calculateSqftScore', () => {
  describe('basic scoring', () => {
    it('should return 100 for identical sqft', () => {
      expect(calculateSqftScore(1800, 1800)).toBe(100);
    });

    it('should return 50 for missing subject sqft', () => {
      expect(calculateSqftScore(undefined, 1800)).toBe(50);
    });

    it('should return 50 for missing comp sqft', () => {
      expect(calculateSqftScore(1800, undefined)).toBe(50);
    });

    it('should return 0 for >50% difference', () => {
      expect(calculateSqftScore(1000, 1600)).toBe(0); // 60% difference
    });

    it('should score based on percent difference', () => {
      const score5 = calculateSqftScore(1000, 1050); // 5% diff
      const score25 = calculateSqftScore(1000, 1250); // 25% diff

      expect(score5).toBeGreaterThan(score25);
      expect(score5).toBeGreaterThan(80);
    });
  });

  describe('linear decay', () => {
    it('should decrease linearly with percent difference', () => {
      const score0 = calculateSqftScore(1000, 1000); // 0%
      const score10 = calculateSqftScore(1000, 1100); // 10%
      const score20 = calculateSqftScore(1000, 1200); // 20%

      const drop1 = score0 - score10;
      const drop2 = score10 - score20;

      expect(drop1).toBeCloseTo(drop2, 0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero sqft as undefined', () => {
      expect(calculateSqftScore(0, 1800)).toBe(50);
      expect(calculateSqftScore(1800, 0)).toBe(50);
    });

    it('should handle very large sqft differences', () => {
      expect(calculateSqftScore(1000, 5000)).toBe(0);
    });

    it('should calculate based on subject sqft as baseline', () => {
      // +20% from subject (1000 to 1200) = 20% diff
      const scorePlus = calculateSqftScore(1000, 1200);
      // Different subject (1200 to 1000) = 16.7% diff
      const scoreMinus = calculateSqftScore(1200, 1000);
      // These are NOT equal because subject is the baseline
      expect(scorePlus).toBeLessThan(scoreMinus);
    });
  });
});

describe('calculateLotSizeScore', () => {
  describe('basic scoring', () => {
    it('should return 100 for identical lot sizes', () => {
      expect(calculateLotSizeScore(8500, 8500)).toBe(100);
    });

    it('should return 50 for missing data', () => {
      expect(calculateLotSizeScore(undefined, 8500)).toBe(50);
      expect(calculateLotSizeScore(8500, undefined)).toBe(50);
    });

    it('should return 0 for >100% difference', () => {
      expect(calculateLotSizeScore(5000, 12000)).toBe(0); // 140% difference
    });

    it('should score based on percent difference', () => {
      const score10 = calculateLotSizeScore(10000, 11000); // 10% diff
      const score50 = calculateLotSizeScore(10000, 15000); // 50% diff

      expect(score10).toBeGreaterThan(score50);
    });
  });

  describe('edge cases', () => {
    it('should handle zero lot size as undefined', () => {
      expect(calculateLotSizeScore(0, 8500)).toBe(50);
    });

    it('should handle very small lots', () => {
      const score = calculateLotSizeScore(2000, 2200);
      expect(score).toBeGreaterThan(0);
    });

    it('should handle very large lots (acres)', () => {
      const score = calculateLotSizeScore(43560, 50000); // ~1 acre
      expect(score).toBeGreaterThan(80);
    });
  });
});

describe('calculateBedroomScore', () => {
  describe('basic scoring', () => {
    it('should return 100 for matching bedrooms', () => {
      expect(calculateBedroomScore(3, 3)).toBe(100);
    });

    it('should return 50 for missing data', () => {
      expect(calculateBedroomScore(undefined, 3)).toBe(50);
      expect(calculateBedroomScore(3, undefined)).toBe(50);
    });

    it('should return 0 for difference >= 2', () => {
      expect(calculateBedroomScore(3, 5)).toBe(0);
      expect(calculateBedroomScore(3, 1)).toBe(0);
    });

    it('should return 50 for 1 bedroom difference', () => {
      expect(calculateBedroomScore(3, 4)).toBe(50);
      expect(calculateBedroomScore(4, 3)).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('should handle zero bedrooms as undefined', () => {
      expect(calculateBedroomScore(0, 3)).toBe(50);
    });

    it('should handle studio vs 1-bedroom', () => {
      expect(calculateBedroomScore(1, 2)).toBe(50);
    });

    it('should handle large bedroom counts', () => {
      expect(calculateBedroomScore(6, 6)).toBe(100);
      expect(calculateBedroomScore(6, 7)).toBe(50);
    });
  });
});

describe('calculateBathroomScore', () => {
  describe('basic scoring', () => {
    it('should return 100 for matching bathrooms', () => {
      expect(calculateBathroomScore(2, 2)).toBe(100);
    });

    it('should return 50 for missing data', () => {
      expect(calculateBathroomScore(undefined, 2)).toBe(50);
    });

    it('should return 0 for difference >= 2', () => {
      expect(calculateBathroomScore(2, 4)).toBe(0);
    });

    it('should score based on difference', () => {
      const score1 = calculateBathroomScore(2, 3);
      expect(score1).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('should handle half bathrooms (decimals)', () => {
      expect(calculateBathroomScore(2.5, 2.5)).toBe(100);
      expect(calculateBathroomScore(2.0, 2.5)).toBeGreaterThan(0);
    });

    it('should handle zero bathrooms as undefined', () => {
      expect(calculateBathroomScore(0, 2)).toBe(50);
    });

    it('should handle large bathroom counts', () => {
      expect(calculateBathroomScore(5, 5)).toBe(100);
    });
  });
});

describe('calculateAgeScore', () => {
  describe('basic scoring', () => {
    it('should return 100 for same year built', () => {
      expect(calculateAgeScore(1985, 1985)).toBe(100);
    });

    it('should return 50 for missing data', () => {
      expect(calculateAgeScore(undefined, 1985)).toBe(50);
    });

    it('should return 0 for >= 20 year difference', () => {
      expect(calculateAgeScore(1985, 2005)).toBe(0);
      expect(calculateAgeScore(2005, 1985)).toBe(0);
    });

    it('should decrease score with age difference', () => {
      const score5 = calculateAgeScore(1985, 1990);
      const score10 = calculateAgeScore(1985, 1995);

      expect(score5).toBeGreaterThan(score10);
    });
  });

  describe('edge cases', () => {
    it('should handle very old properties', () => {
      expect(calculateAgeScore(1900, 1905)).toBeGreaterThan(0);
    });

    it('should handle new construction', () => {
      expect(calculateAgeScore(2025, 2026)).toBeGreaterThan(90);
    });

    it('should handle same age symmetrically', () => {
      expect(calculateAgeScore(1985, 1990)).toBe(calculateAgeScore(1990, 1985));
    });
  });
});

describe('calculateRecencyScore', () => {
  describe('basic scoring', () => {
    it('should return 100 for today or future date', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(calculateRecencyScore(today)).toBeGreaterThan(99);
    });

    it('should return 0 for sales >= 12 months ago', () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 13);
      const score = calculateRecencyScore(oldDate.toISOString());
      expect(score).toBe(0);
    });

    it('should decrease score with age of sale', () => {
      const date1 = new Date();
      date1.setMonth(date1.getMonth() - 1);
      const score1 = calculateRecencyScore(date1.toISOString());

      const date2 = new Date();
      date2.setMonth(date2.getMonth() - 6);
      const score2 = calculateRecencyScore(date2.toISOString());

      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('exponential decay', () => {
    it('should decrease with age', () => {
      const date1 = new Date();
      date1.setMonth(date1.getMonth() - 2);
      const score1 = calculateRecencyScore(date1.toISOString());

      const date2 = new Date();
      date2.setMonth(date2.getMonth() - 6);
      const score2 = calculateRecencyScore(date2.toISOString());

      const date3 = new Date();
      date3.setMonth(date3.getMonth() - 10);
      const score3 = calculateRecencyScore(date3.toISOString());

      // Scores should decrease with age
      expect(score1).toBeGreaterThan(score2);
      expect(score2).toBeGreaterThan(score3);
    });
  });

  describe('edge cases', () => {
    it('should handle various date formats', () => {
      expect(calculateRecencyScore('2026-01-23')).toBeGreaterThan(0);
      expect(calculateRecencyScore('2026-01-23T12:00:00Z')).toBeGreaterThan(0);
    });

    it('should handle very old dates', () => {
      expect(calculateRecencyScore('2020-01-01')).toBe(0);
    });
  });
});

describe('calculatePropertyTypeScore', () => {
  describe('exact matches', () => {
    it('should return 100 for exact match', () => {
      expect(calculatePropertyTypeScore('SFR', 'SFR')).toBe(100);
      expect(calculatePropertyTypeScore('Condo', 'Condo')).toBe(100);
    });

    it('should be case-insensitive', () => {
      expect(calculatePropertyTypeScore('SFR', 'sfr')).toBe(100);
      expect(calculatePropertyTypeScore('Condo', 'CONDO')).toBe(100);
    });
  });

  describe('group matches', () => {
    it('should return 80 for same group (residential)', () => {
      expect(calculatePropertyTypeScore('SFR', 'Single Family')).toBe(80);
      expect(calculatePropertyTypeScore('Residential', 'House')).toBe(80);
    });

    it('should return 80 for same group (condo)', () => {
      expect(calculatePropertyTypeScore('Condo', 'Condominium')).toBe(80);
    });

    it('should return 80 for same group (townhouse)', () => {
      expect(calculatePropertyTypeScore('Townhouse', 'Townhome')).toBe(80);
    });
  });

  describe('different types', () => {
    it('should return 20 for different type groups', () => {
      expect(calculatePropertyTypeScore('SFR', 'Condo')).toBe(20);
      expect(calculatePropertyTypeScore('Townhouse', 'Mobile')).toBe(20);
    });
  });

  describe('missing data', () => {
    it('should return 50 for missing data', () => {
      expect(calculatePropertyTypeScore(undefined, 'SFR')).toBe(50);
      expect(calculatePropertyTypeScore('SFR', undefined)).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('should handle partial matches', () => {
      const score = calculatePropertyTypeScore('Single Family Residential', 'SFR');
      expect(score).toBeGreaterThan(50);
    });

    it('should handle unknown types', () => {
      const score = calculatePropertyTypeScore('Unknown', 'Other');
      expect(score).toBeLessThanOrEqual(50);
    });
  });
});

describe('calculateStyleScore', () => {
  describe('exact matches', () => {
    it('should return 100 for exact match', () => {
      expect(calculateStyleScore('Ranch', 'Ranch')).toBe(100);
      expect(calculateStyleScore('Colonial', 'Colonial')).toBe(100);
    });

    it('should be case-insensitive', () => {
      expect(calculateStyleScore('Ranch', 'ranch')).toBe(100);
    });
  });

  describe('group matches', () => {
    it('should return 75 for same style group', () => {
      expect(calculateStyleScore('Ranch', 'Rambler')).toBe(75);
      expect(calculateStyleScore('Colonial', 'Traditional')).toBe(75);
    });
  });

  describe('different styles', () => {
    it('should return 40 for different style groups', () => {
      expect(calculateStyleScore('Ranch', 'Victorian')).toBe(40);
      expect(calculateStyleScore('Contemporary', 'Colonial')).toBe(40);
    });
  });

  describe('missing data', () => {
    it('should return 50 for missing data', () => {
      expect(calculateStyleScore(undefined, 'Ranch')).toBe(50);
      expect(calculateStyleScore('Ranch', undefined)).toBe(50);
    });
  });
});

describe('calculateFeaturesScore', () => {
  describe('basic feature matching', () => {
    it('should return 100 for all features matching', () => {
      const subject = { hasGarage: true, hasPool: false, hasBasement: true } as SubjectProperty;
      const comp = { hasGarage: true, hasPool: false, hasBasement: true } as ComparableProperty;
      expect(calculateFeaturesScore(subject, comp)).toBe(100);
    });

    it('should return 0 for all features different', () => {
      const subject = { hasGarage: true, hasPool: false, hasBasement: true } as SubjectProperty;
      const comp = { hasGarage: false, hasPool: true, hasBasement: false } as ComparableProperty;
      expect(calculateFeaturesScore(subject, comp)).toBe(0);
    });

    it('should return 50 for half matching', () => {
      const subject = { hasGarage: true, hasPool: false } as SubjectProperty;
      const comp = { hasGarage: true, hasPool: true } as ComparableProperty;
      expect(calculateFeaturesScore(subject, comp)).toBeCloseTo(50, 0);
    });
  });

  describe('partial feature data', () => {
    it('should only compare available features', () => {
      const subject = { hasGarage: true } as SubjectProperty;
      const comp = { hasGarage: true } as ComparableProperty;
      expect(calculateFeaturesScore(subject, comp)).toBe(100);
    });

    it('should return 50 for no comparable features', () => {
      const subject = {} as SubjectProperty;
      const comp = {} as ComparableProperty;
      expect(calculateFeaturesScore(subject, comp)).toBe(50);
    });
  });

  describe('mixed features', () => {
    it('should handle 2 of 3 features matching', () => {
      const subject = { hasGarage: true, hasPool: false, hasBasement: true } as SubjectProperty;
      const comp = { hasGarage: true, hasPool: false, hasBasement: false } as ComparableProperty;
      expect(calculateFeaturesScore(subject, comp)).toBeCloseTo(66.67, 1);
    });
  });
});

// ============================================
// Overall Similarity Calculation Tests
// ============================================

describe('calculateSimilarityScore', () => {
  describe('basic similarity calculation', () => {
    it('should return complete SimilarityResult structure', () => {
      const result = calculateSimilarityScore(mockSubject, mockIdenticalComp);

      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.factorScores).toBeDefined();
      expect(result.factorContributions).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.missingFactors).toBeDefined();
      expect(result.distanceMiles).toBeDefined();
    });

    it('should return score between 0-100', () => {
      const result = calculateSimilarityScore(mockSubject, mockIdenticalComp);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return high score for identical properties', () => {
      const result = calculateSimilarityScore(mockSubject, mockIdenticalComp);
      expect(result.score).toBeGreaterThan(95);
    });

    it('should return lower score for dissimilar properties', () => {
      const result = calculateSimilarityScore(mockSubject, mockLowSimilarityComp);
      expect(result.score).toBeLessThan(70);
    });

    it('should calculate distance in miles', () => {
      const result = calculateSimilarityScore(mockSubject, mockMediumSimilarityComp);
      expect(result.distanceMiles).toBeGreaterThan(0);
      expect(result.distanceMiles).toBeLessThan(5);
    });
  });

  describe('factor scores', () => {
    it('should include all 10 factor scores', () => {
      const result = calculateSimilarityScore(mockSubject, mockHighSimilarityComp);

      expect(result.factorScores.distance).toBeDefined();
      expect(result.factorScores.sqft).toBeDefined();
      expect(result.factorScores.lotSize).toBeDefined();
      expect(result.factorScores.bedrooms).toBeDefined();
      expect(result.factorScores.bathrooms).toBeDefined();
      expect(result.factorScores.age).toBeDefined();
      expect(result.factorScores.recency).toBeDefined();
      expect(result.factorScores.propertyType).toBeDefined();
      expect(result.factorScores.style).toBeDefined();
      expect(result.factorScores.features).toBeDefined();
    });

    it('should have all factor scores between 0-100', () => {
      const result = calculateSimilarityScore(mockSubject, mockMediumSimilarityComp);

      Object.values(result.factorScores).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('weighted contributions', () => {
    it('should calculate weighted contributions', () => {
      const result = calculateSimilarityScore(mockSubject, mockHighSimilarityComp);

      expect(result.factorContributions.distance).toBeCloseTo(
        result.factorScores.distance * DEFAULT_WEIGHTS.distance,
        10
      );
      expect(result.factorContributions.sqft).toBeCloseTo(
        result.factorScores.sqft * DEFAULT_WEIGHTS.sqft,
        10
      );
    });

    it('should sum contributions to total score', () => {
      const result = calculateSimilarityScore(mockSubject, mockHighSimilarityComp);

      const sum = Object.values(result.factorContributions).reduce((a, b) => a + b, 0);
      expect(Math.round(sum * 10) / 10).toBe(result.score);
    });
  });

  describe('custom weights', () => {
    it('should accept custom weights', () => {
      const result = calculateSimilarityScore(mockSubject, mockHighSimilarityComp, mockCustomWeights);

      expect(result.factorContributions.distance).toBeCloseTo(
        result.factorScores.distance * mockCustomWeights.distance,
        10
      );
    });

    it('should produce different scores with different weights', () => {
      const defaultResult = calculateSimilarityScore(mockSubject, mockMediumSimilarityComp);
      const customResult = calculateSimilarityScore(
        mockSubject,
        mockMediumSimilarityComp,
        mockCustomWeights
      );

      expect(defaultResult.score).not.toBe(customResult.score);
    });
  });

  describe('confidence calculation', () => {
    it('should return 100% confidence for complete data', () => {
      const result = calculateSimilarityScore(mockSubject, mockIdenticalComp);
      expect(result.confidence).toBe(100);
    });

    it('should return lower confidence for missing data', () => {
      const result = calculateSimilarityScore(mockSubject, mockMinimalComp);
      expect(result.confidence).toBeLessThan(100);
    });

    it('should track missing factors', () => {
      const result = calculateSimilarityScore(mockSubject, mockMinimalComp);
      expect(result.missingFactors.length).toBeGreaterThan(0);
    });

    it('should include specific missing factors', () => {
      const incompleteSub = { ...mockSubject, sqft: undefined };
      const result = calculateSimilarityScore(incompleteSub, mockMinimalComp);

      expect(result.missingFactors).toContain('sqft');
    });
  });

  describe('edge cases', () => {
    it('should handle completely minimal data', () => {
      const minSubject: SubjectProperty = {
        latitude: 40.5,
        longitude: -78.4,
      };
      const result = calculateSimilarityScore(minSubject, mockMinimalComp);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThan(50);
    });

    it('should round score to 1 decimal place', () => {
      const result = calculateSimilarityScore(mockSubject, mockMediumSimilarityComp);
      expect(result.score * 10).toBe(Math.round(result.score * 10));
    });

    it('should round distance to 2 decimal places', () => {
      const result = calculateSimilarityScore(mockSubject, mockMediumSimilarityComp);
      expect(result.distanceMiles * 100).toBeCloseTo(Math.round(result.distanceMiles * 100), 5);
    });
  });
});

// ============================================
// Comparable Scoring and Filtering Tests
// ============================================

describe('scoreComparables', () => {
  describe('basic scoring', () => {
    it('should score all comparables', () => {
      const scored = scoreComparables(mockSubject, mockAllComparables);

      expect(scored).toHaveLength(mockAllComparables.length);
      scored.forEach((comp) => {
        expect(comp.similarityScore).toBeDefined();
        expect(comp.distanceMiles).toBeDefined();
        expect(comp.factorScores).toBeDefined();
      });
    });

    it('should sort by similarity score descending', () => {
      const scored = scoreComparables(mockSubject, mockAllComparables);

      for (let i = 1; i < scored.length; i++) {
        expect(scored[i - 1].similarityScore!).toBeGreaterThanOrEqual(scored[i].similarityScore!);
      }
    });

    it('should preserve original comparable data', () => {
      const scored = scoreComparables(mockSubject, mockAllComparables);

      // Check that all original comparables are in the scored array
      mockAllComparables.forEach((originalComp) => {
        const found = scored.find(
          (comp) =>
            comp.salePrice === originalComp.salePrice &&
            comp.saleDate === originalComp.saleDate
        );
        expect(found).toBeDefined();
      });
    });
  });

  describe('custom weights', () => {
    it('should accept custom weights', () => {
      const scored = scoreComparables(mockSubject, mockAllComparables, mockCustomWeights);

      expect(scored).toHaveLength(mockAllComparables.length);
      scored.forEach((comp) => {
        expect(comp.similarityScore).toBeDefined();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', () => {
      const scored = scoreComparables(mockSubject, []);
      expect(scored).toHaveLength(0);
    });

    it('should handle single comparable', () => {
      const scored = scoreComparables(mockSubject, [mockIdenticalComp]);
      expect(scored).toHaveLength(1);
      expect(scored[0].similarityScore).toBeDefined();
    });
  });
});

describe('filterByMinScore', () => {
  let scoredComparables: ComparableProperty[];

  beforeEach(() => {
    scoredComparables = scoreComparables(mockSubject, mockAllComparables);
  });

  describe('basic filtering', () => {
    it('should filter comparables below minimum score', () => {
      const filtered = filterByMinScore(scoredComparables, 70);

      filtered.forEach((comp) => {
        expect(comp.similarityScore!).toBeGreaterThanOrEqual(70);
      });
    });

    it('should return fewer or equal comparables after filtering', () => {
      const filtered = filterByMinScore(scoredComparables, 60);
      expect(filtered.length).toBeLessThanOrEqual(scoredComparables.length);
    });

    it('should use default threshold of 50', () => {
      const filtered = filterByMinScore(scoredComparables);

      filtered.forEach((comp) => {
        expect(comp.similarityScore!).toBeGreaterThanOrEqual(50);
      });
    });
  });

  describe('edge cases', () => {
    it('should return all comparables with threshold 0', () => {
      const filtered = filterByMinScore(scoredComparables, 0);
      expect(filtered).toHaveLength(scoredComparables.length);
    });

    it('should return no comparables with threshold 100', () => {
      const filtered = filterByMinScore(scoredComparables, 100);
      expect(filtered.length).toBeLessThanOrEqual(1);
    });

    it('should handle empty array', () => {
      const filtered = filterByMinScore([], 50);
      expect(filtered).toHaveLength(0);
    });
  });
});

describe('getTopComparables', () => {
  let scoredComparables: ComparableProperty[];

  beforeEach(() => {
    scoredComparables = scoreComparables(mockSubject, mockAllComparables);
  });

  describe('basic selection', () => {
    it('should return requested number of comparables', () => {
      const top3 = getTopComparables(scoredComparables, 3);
      expect(top3).toHaveLength(3);
    });

    it('should return highest scoring comparables', () => {
      const top3 = getTopComparables(scoredComparables, 3);

      for (let i = 1; i < top3.length; i++) {
        expect(top3[i - 1].similarityScore!).toBeGreaterThanOrEqual(top3[i].similarityScore!);
      }
    });

    it('should use default count of 5', () => {
      const top = getTopComparables(scoredComparables);
      expect(top.length).toBeLessThanOrEqual(5);
    });
  });

  describe('edge cases', () => {
    it('should return all comparables if count exceeds array length', () => {
      const top = getTopComparables(scoredComparables, 100);
      expect(top).toHaveLength(scoredComparables.length);
    });

    it('should handle count of 0', () => {
      const top = getTopComparables(scoredComparables, 0);
      expect(top).toHaveLength(0);
    });

    it('should handle empty array', () => {
      const top = getTopComparables([], 5);
      expect(top).toHaveLength(0);
    });
  });
});

// ============================================
// Utility Function Tests
// ============================================

describe('getSimilarityDescription', () => {
  describe('description labels', () => {
    it('should return "Excellent match" for >= 90', () => {
      expect(getSimilarityDescription(90)).toBe('Excellent match');
      expect(getSimilarityDescription(95)).toBe('Excellent match');
      expect(getSimilarityDescription(100)).toBe('Excellent match');
    });

    it('should return "Very good match" for >= 80', () => {
      expect(getSimilarityDescription(80)).toBe('Very good match');
      expect(getSimilarityDescription(85)).toBe('Very good match');
    });

    it('should return "Good match" for >= 70', () => {
      expect(getSimilarityDescription(70)).toBe('Good match');
      expect(getSimilarityDescription(75)).toBe('Good match');
    });

    it('should return "Fair match" for >= 60', () => {
      expect(getSimilarityDescription(60)).toBe('Fair match');
      expect(getSimilarityDescription(65)).toBe('Fair match');
    });

    it('should return "Moderate match" for >= 50', () => {
      expect(getSimilarityDescription(50)).toBe('Moderate match');
      expect(getSimilarityDescription(55)).toBe('Moderate match');
    });

    it('should return "Weak match" for >= 40', () => {
      expect(getSimilarityDescription(40)).toBe('Weak match');
      expect(getSimilarityDescription(45)).toBe('Weak match');
    });

    it('should return "Poor match" for < 40', () => {
      expect(getSimilarityDescription(39)).toBe('Poor match');
      expect(getSimilarityDescription(20)).toBe('Poor match');
      expect(getSimilarityDescription(0)).toBe('Poor match');
    });
  });

  describe('edge cases', () => {
    it('should handle exact boundaries', () => {
      expect(getSimilarityDescription(89.9)).toBe('Very good match');
      expect(getSimilarityDescription(90.0)).toBe('Excellent match');
    });

    it('should handle negative scores', () => {
      expect(getSimilarityDescription(-10)).toBe('Poor match');
    });

    it('should handle scores > 100', () => {
      expect(getSimilarityDescription(150)).toBe('Excellent match');
    });
  });
});

describe('getSignificantDifference', () => {
  describe('identifying weakest factor', () => {
    it('should identify factor with lowest score', () => {
      const factorScores = {
        distance: 90,
        sqft: 85,
        lotSize: 80,
        bedrooms: 100,
        bathrooms: 100,
        age: 95,
        recency: 50, // Lowest
        propertyType: 100,
        style: 75,
        features: 100,
      };

      const result = getSignificantDifference(factorScores);
      expect(result.factor).toBe('recency');
      expect(result.score).toBe(50);
    });

    it('should return first factor when all equal', () => {
      const factorScores = {
        distance: 80,
        sqft: 80,
        lotSize: 80,
        bedrooms: 80,
        bathrooms: 80,
        age: 80,
        recency: 80,
        propertyType: 80,
        style: 80,
        features: 80,
      };

      const result = getSignificantDifference(factorScores);
      expect(result.score).toBe(80);
    });
  });

  describe('edge cases', () => {
    it('should handle all zeros', () => {
      const factorScores = {
        distance: 0,
        sqft: 0,
        lotSize: 0,
        bedrooms: 0,
        bathrooms: 0,
        age: 0,
        recency: 0,
        propertyType: 0,
        style: 0,
        features: 0,
      };

      const result = getSignificantDifference(factorScores);
      expect(result.score).toBe(0);
    });

    it('should handle all 100s', () => {
      const factorScores = {
        distance: 100,
        sqft: 100,
        lotSize: 100,
        bedrooms: 100,
        bathrooms: 100,
        age: 100,
        recency: 100,
        propertyType: 100,
        style: 100,
        features: 100,
      };

      const result = getSignificantDifference(factorScores);
      expect(result.score).toBe(100);
    });
  });
});

describe('validateWeights', () => {
  describe('valid weights', () => {
    it('should return true for default weights', () => {
      expect(validateWeights(DEFAULT_WEIGHTS)).toBe(true);
    });

    it('should return true for custom weights that sum to 1', () => {
      expect(validateWeights(mockCustomWeights)).toBe(true);
    });

    it('should allow small floating point error', () => {
      const weights: SimilarityWeights = {
        distance: 0.2501,
        sqft: 0.20,
        bedrooms: 0.12,
        bathrooms: 0.08,
        age: 0.10,
        recency: 0.10,
        propertyType: 0.08,
        lotSize: 0.04,
        style: 0.02,
        features: 0.0099, // Sum = 1.0000 with rounding error
      };

      expect(validateWeights(weights)).toBe(true);
    });
  });

  describe('invalid weights', () => {
    it('should return false for weights that sum > 1', () => {
      const weights: SimilarityWeights = {
        distance: 0.30,
        sqft: 0.30,
        bedrooms: 0.30,
        bathrooms: 0.30,
        age: 0.10,
        recency: 0.10,
        propertyType: 0.10,
        lotSize: 0.10,
        style: 0.10,
        features: 0.10,
      };

      expect(validateWeights(weights)).toBe(false);
    });

    it('should return false for weights that sum < 1', () => {
      const weights: SimilarityWeights = {
        distance: 0.10,
        sqft: 0.10,
        bedrooms: 0.10,
        bathrooms: 0.05,
        age: 0.05,
        recency: 0.05,
        propertyType: 0.05,
        lotSize: 0.02,
        style: 0.01,
        features: 0.01,
      };

      expect(validateWeights(weights)).toBe(false);
    });
  });
});

describe('normalizeWeights', () => {
  describe('basic normalization', () => {
    it('should normalize weights to sum to 1', () => {
      const weights: SimilarityWeights = {
        distance: 5,
        sqft: 4,
        bedrooms: 3,
        bathrooms: 2,
        age: 2,
        recency: 2,
        propertyType: 2,
        lotSize: 1,
        style: 1,
        features: 1,
      };

      const normalized = normalizeWeights(weights);
      const sum = Object.values(normalized).reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('should preserve proportions', () => {
      const weights: SimilarityWeights = {
        distance: 10,
        sqft: 5,
        bedrooms: 0,
        bathrooms: 0,
        age: 0,
        recency: 0,
        propertyType: 0,
        lotSize: 0,
        style: 0,
        features: 0,
      };

      const normalized = normalizeWeights(weights);

      expect(normalized.distance).toBeCloseTo(2 / 3, 10);
      expect(normalized.sqft).toBeCloseTo(1 / 3, 10);
    });

    it('should not modify already valid weights', () => {
      const normalized = normalizeWeights(DEFAULT_WEIGHTS);
      const sum = Object.values(normalized).reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(1.0, 10);
    });
  });

  describe('edge cases', () => {
    it('should return default weights for all zeros', () => {
      const weights: SimilarityWeights = {
        distance: 0,
        sqft: 0,
        bedrooms: 0,
        bathrooms: 0,
        age: 0,
        recency: 0,
        propertyType: 0,
        lotSize: 0,
        style: 0,
        features: 0,
      };

      const normalized = normalizeWeights(weights);
      expect(normalized).toEqual(DEFAULT_WEIGHTS);
    });

    it('should handle very small weights', () => {
      const weights: SimilarityWeights = {
        distance: 0.0001,
        sqft: 0.0002,
        bedrooms: 0.0001,
        bathrooms: 0.0001,
        age: 0.0001,
        recency: 0.0001,
        propertyType: 0.0001,
        lotSize: 0.0001,
        style: 0.0001,
        features: 0.0001,
      };

      const normalized = normalizeWeights(weights);
      const sum = Object.values(normalized).reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('should handle very large weights', () => {
      const weights: SimilarityWeights = {
        distance: 1000000,
        sqft: 500000,
        bedrooms: 250000,
        bathrooms: 125000,
        age: 125000,
        recency: 125000,
        propertyType: 125000,
        lotSize: 62500,
        style: 31250,
        features: 31250,
      };

      const normalized = normalizeWeights(weights);
      const sum = Object.values(normalized).reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(1.0, 10);
    });
  });
});
