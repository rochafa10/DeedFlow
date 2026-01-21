/**
 * Location Category Scoring Tests
 *
 * Tests the location scoring functionality including:
 * - All 5 location components (walkability, crime, schools, amenities, transit)
 * - Component score calculations
 * - Missing data handling
 * - Data completeness reporting
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import { describe, it, expect } from 'vitest';
import {
  calculateLocationScore,
  calculateWalkabilityScore,
  calculateCrimeSafetyScore,
  calculateSchoolQualityScore,
  calculateAmenitiesScore,
  calculateTransitAccessScore,
  getLocationComponentIds,
  getLocationComponentConfig,
  hasCompleteLocationData,
  getLocationDataCompleteness,
} from '../categories/location';
import {
  mockIdealProperty,
  mockIdealExternalData,
  mockMinimalProperty,
  mockNullExternalData,
  mockVacantLandProperty,
  mockVacantLandExternalData,
  createMockProperty,
  createMockExternalData,
} from './fixtures';

// ============================================
// Main Location Score Tests
// ============================================

describe('calculateLocationScore', () => {
  describe('basic functionality', () => {
    it('should return a valid CategoryScore structure', () => {
      const result = calculateLocationScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('location');
      expect(result.name).toBe('Location');
      expect(result.maxScore).toBe(25);
    });

    it('should calculate score between 0 and 25', () => {
      const result = calculateLocationScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(25);
    });

    it('should return 5 component scores', () => {
      const result = calculateLocationScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      expect(result.components).toHaveLength(5);
    });

    it('should have total score equal sum of components', () => {
      const result = calculateLocationScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      const componentSum = result.components.reduce(
        (sum, comp) => sum + comp.score,
        0
      );

      // Allow small floating point differences
      expect(Math.abs(result.score - componentSum)).toBeLessThan(0.01);
    });

    it('should have components with scores 0-5', () => {
      const result = calculateLocationScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      result.components.forEach((component) => {
        expect(component.score).toBeGreaterThanOrEqual(0);
        expect(component.score).toBeLessThanOrEqual(5);
        expect(component.maxScore).toBe(5);
      });
    });
  });

  describe('with complete data', () => {
    it('should score higher for ideal property', () => {
      const idealResult = calculateLocationScore(
        mockIdealProperty,
        mockIdealExternalData
      );
      const minimalResult = calculateLocationScore(
        mockMinimalProperty,
        mockNullExternalData
      );

      expect(idealResult.score).toBeGreaterThan(minimalResult.score);
    });

    it('should have high confidence with complete data', () => {
      const result = calculateLocationScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      expect(result.confidence).toBeGreaterThan(80);
    });

    it('should have high data completeness with all data', () => {
      const result = calculateLocationScore(
        mockIdealProperty,
        mockIdealExternalData
      );

      expect(result.dataCompleteness).toBeGreaterThan(90);
    });
  });

  describe('with missing data', () => {
    it('should handle null external data', () => {
      const result = calculateLocationScore(mockMinimalProperty, null);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should use default values for missing data', () => {
      const result = calculateLocationScore(
        mockMinimalProperty,
        mockNullExternalData
      );

      // Should get neutral/default scores (around 2.5 per component)
      result.components.forEach((component) => {
        expect(component.missingDataStrategy).toBeDefined();
      });
    });

    it('should have low confidence with missing data', () => {
      const result = calculateLocationScore(
        mockMinimalProperty,
        mockNullExternalData
      );

      expect(result.confidence).toBeLessThan(60);
    });

    it('should have low data completeness with missing data', () => {
      const result = calculateLocationScore(
        mockMinimalProperty,
        mockNullExternalData
      );

      expect(result.dataCompleteness).toBeLessThan(30);
    });

    it('should add notes about missing data', () => {
      const result = calculateLocationScore(
        mockMinimalProperty,
        mockNullExternalData
      );

      expect(result.notes.length).toBeGreaterThan(0);
    });
  });

  describe('rural vs urban properties', () => {
    it('should score rural property lower on walkability', () => {
      const urbanResult = calculateLocationScore(
        mockIdealProperty,
        mockIdealExternalData
      );
      const ruralResult = calculateLocationScore(
        mockVacantLandProperty,
        mockVacantLandExternalData
      );

      const urbanWalkability = urbanResult.components.find(
        (c) => c.id === 'walk_score'
      );
      const ruralWalkability = ruralResult.components.find(
        (c) => c.id === 'walk_score'
      );

      expect(urbanWalkability!.score).toBeGreaterThan(ruralWalkability!.score);
    });

    it('should score rural property lower on amenities', () => {
      const urbanResult = calculateLocationScore(
        mockIdealProperty,
        mockIdealExternalData
      );
      const ruralResult = calculateLocationScore(
        mockVacantLandProperty,
        mockVacantLandExternalData
      );

      const urbanAmenities = urbanResult.components.find(
        (c) => c.id === 'amenity_count'
      );
      const ruralAmenities = ruralResult.components.find(
        (c) => c.id === 'amenity_count'
      );

      expect(urbanAmenities!.score).toBeGreaterThan(ruralAmenities!.score);
    });
  });
});

// ============================================
// Individual Component Tests
// ============================================

describe('calculateWalkabilityScore', () => {
  it('should return max score for walk score of 90+', () => {
    const externalData = createMockExternalData({ walkScore: 95 });
    const result = calculateWalkabilityScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(4.5);
  });

  it('should return high score for walk score of 70-89', () => {
    const externalData = createMockExternalData({ walkScore: 78 });
    const result = calculateWalkabilityScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(3.5);
    expect(result.score).toBeLessThan(4.5);
  });

  it('should return medium score for walk score of 50-69', () => {
    const externalData = createMockExternalData({ walkScore: 55 });
    const result = calculateWalkabilityScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(2.5);
    expect(result.score).toBeLessThan(3.5);
  });

  it('should return low score for walk score of 25-49', () => {
    const externalData = createMockExternalData({ walkScore: 35 });
    const result = calculateWalkabilityScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(1.5);
    expect(result.score).toBeLessThan(2.5);
  });

  it('should return minimum score for walk score < 25', () => {
    const externalData = createMockExternalData({ walkScore: 12 });
    const result = calculateWalkabilityScore(mockIdealProperty, externalData);

    expect(result.score).toBeLessThan(1.5);
  });

  it('should handle null walk score with default strategy', () => {
    const externalData = createMockExternalData({ walkScore: null });
    const result = calculateWalkabilityScore(mockIdealProperty, externalData);

    expect(result.missingDataStrategy).not.toBe('require_data');
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('should have correct component ID and name', () => {
    const result = calculateWalkabilityScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    expect(result.id).toBe('walk_score');
    expect(result.name).toBe('Walkability');
  });
});

describe('calculateCrimeSafetyScore', () => {
  it('should return max score for very low crime (index < 15)', () => {
    const externalData = createMockExternalData({
      crimeData: {
        crimeIndex: 10,
        violentCrimeRate: 0.5,
        propertyCrimeRate: 3.0,
        source: 'Test',
        asOf: new Date(),
      },
    });
    const result = calculateCrimeSafetyScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(4.5);
  });

  it('should return high score for low crime (index 15-30)', () => {
    const externalData = createMockExternalData({
      crimeData: {
        crimeIndex: 25,
        violentCrimeRate: 1.2,
        propertyCrimeRate: 8.0,
        source: 'Test',
        asOf: new Date(),
      },
    });
    const result = calculateCrimeSafetyScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(3.5);
    expect(result.score).toBeLessThan(4.5);
  });

  it('should return medium score for moderate crime (index 30-50)', () => {
    const externalData = createMockExternalData({
      crimeData: {
        crimeIndex: 40,
        violentCrimeRate: 2.0,
        propertyCrimeRate: 15.0,
        source: 'Test',
        asOf: new Date(),
      },
    });
    const result = calculateCrimeSafetyScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(2.0);
    expect(result.score).toBeLessThan(3.5);
  });

  it('should return low score for high crime (index > 50)', () => {
    const externalData = createMockExternalData({
      crimeData: {
        crimeIndex: 65,
        violentCrimeRate: 4.0,
        propertyCrimeRate: 25.0,
        source: 'Test',
        asOf: new Date(),
      },
    });
    const result = calculateCrimeSafetyScore(mockIdealProperty, externalData);

    expect(result.score).toBeLessThan(2.0);
  });

  it('should handle null crime data with conservative default', () => {
    const externalData = createMockExternalData({ crimeData: null });
    const result = calculateCrimeSafetyScore(mockIdealProperty, externalData);

    expect(result.missingDataStrategy).toBe('default_conservative');
    expect(result.score).toBeLessThan(3.0);
  });
});

describe('calculateSchoolQualityScore', () => {
  it('should return max score for school rating of 9-10', () => {
    const externalData = createMockExternalData({
      schoolRating: {
        overallRating: 9.5,
        elementaryRating: 9,
        middleRating: 10,
        highRating: 9,
        source: 'Test',
      },
    });
    const result = calculateSchoolQualityScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(4.5);
  });

  it('should return high score for school rating of 7-8', () => {
    const externalData = createMockExternalData({
      schoolRating: {
        overallRating: 8,
        elementaryRating: 8,
        middleRating: 7,
        highRating: 8,
        source: 'Test',
      },
    });
    const result = calculateSchoolQualityScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(3.5);
    expect(result.score).toBeLessThan(4.5);
  });

  it('should return low score for school rating < 4', () => {
    const externalData = createMockExternalData({
      schoolRating: {
        overallRating: 3,
        elementaryRating: 3,
        middleRating: 3,
        highRating: 2,
        source: 'Test',
      },
    });
    const result = calculateSchoolQualityScore(mockIdealProperty, externalData);

    expect(result.score).toBeLessThan(2.0);
  });

  it('should handle null school rating with neutral default', () => {
    const externalData = createMockExternalData({ schoolRating: null });
    const result = calculateSchoolQualityScore(mockIdealProperty, externalData);

    expect(result.missingDataStrategy).toBe('default_neutral');
    // Neutral default should be around middle score
    expect(result.score).toBeGreaterThanOrEqual(2.0);
    expect(result.score).toBeLessThanOrEqual(3.0);
  });
});

describe('calculateAmenitiesScore', () => {
  it('should return max score for high amenity count (80+)', () => {
    const externalData = createMockExternalData({
      nearbyAmenities: {
        restaurants: 30,
        groceryStores: 8,
        parks: 10,
        hospitals: 3,
        shopping: 20,
        totalScore: 90,
      },
    });
    const result = calculateAmenitiesScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(4.0);
  });

  it('should return medium score for moderate amenities (40-60)', () => {
    const externalData = createMockExternalData({
      nearbyAmenities: {
        restaurants: 15,
        groceryStores: 3,
        parks: 5,
        hospitals: 2,
        shopping: 8,
        totalScore: 50,
      },
    });
    const result = calculateAmenitiesScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(2.5);
    expect(result.score).toBeLessThan(4.0);
  });

  it('should return low score for few amenities (< 30)', () => {
    const externalData = createMockExternalData({
      nearbyAmenities: {
        restaurants: 2,
        groceryStores: 1,
        parks: 2,
        hospitals: 1,
        shopping: 1,
        totalScore: 20,
      },
    });
    const result = calculateAmenitiesScore(mockIdealProperty, externalData);

    expect(result.score).toBeLessThan(2.5);
  });

  it('should calculate score from individual amenity counts if totalScore is null', () => {
    const externalData = createMockExternalData({
      nearbyAmenities: {
        restaurants: 20,
        groceryStores: 5,
        parks: 8,
        hospitals: 2,
        shopping: 10,
        totalScore: null,
      },
    });
    const result = calculateAmenitiesScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThan(0);
  });
});

describe('calculateTransitAccessScore', () => {
  it('should return max score for transit score of 80+', () => {
    const externalData = createMockExternalData({ transitScore: 85 });
    const result = calculateTransitAccessScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(4.0);
  });

  it('should return medium score for transit score of 40-60', () => {
    const externalData = createMockExternalData({ transitScore: 50 });
    const result = calculateTransitAccessScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(2.5);
    expect(result.score).toBeLessThan(4.0);
  });

  it('should return low score for transit score < 20', () => {
    const externalData = createMockExternalData({ transitScore: 10 });
    const result = calculateTransitAccessScore(mockIdealProperty, externalData);

    expect(result.score).toBeLessThan(2.0);
  });

  it('should handle null transit score appropriately', () => {
    const externalData = createMockExternalData({ transitScore: null });
    const result = calculateTransitAccessScore(mockIdealProperty, externalData);

    // Transit is often unavailable in rural areas, should use neutral default
    expect(result.missingDataStrategy).toBe('default_neutral');
  });

  it('should consider rural properties may not need transit', () => {
    const ruralProperty = createMockProperty({
      city: null,
      property_type: 'vacant_land',
    });
    const result = calculateTransitAccessScore(ruralProperty, mockNullExternalData);

    // Rural property without transit shouldn't be heavily penalized
    expect(result.score).toBeGreaterThanOrEqual(1.5);
  });
});

// ============================================
// Utility Function Tests
// ============================================

describe('getLocationComponentIds', () => {
  it('should return all 5 component IDs', () => {
    const ids = getLocationComponentIds();

    expect(ids).toHaveLength(5);
    expect(ids).toContain('walk_score');
    expect(ids).toContain('crime_index');
    expect(ids).toContain('school_rating');
    expect(ids).toContain('amenity_count');
    expect(ids).toContain('transit_score');
  });
});

describe('getLocationComponentConfig', () => {
  it('should return config for each component', () => {
    const ids = getLocationComponentIds();

    ids.forEach((id) => {
      const config = getLocationComponentConfig(id);
      expect(config).toBeDefined();
      expect(config.name).toBeDefined();
      expect(config.maxScore).toBe(5);
      expect(config.weight).toBeDefined();
      expect(config.defaultStrategy).toBeDefined();
    });
  });

  it('should have weights summing to 1', () => {
    const ids = getLocationComponentIds();
    const totalWeight = ids.reduce((sum, id) => {
      return sum + getLocationComponentConfig(id).weight;
    }, 0);

    expect(totalWeight).toBeCloseTo(1.0, 2);
  });
});

describe('hasCompleteLocationData', () => {
  it('should return true for property with all location data', () => {
    const result = hasCompleteLocationData(
      mockIdealProperty,
      mockIdealExternalData
    );

    expect(result).toBe(true);
  });

  it('should return false for property missing location data', () => {
    const result = hasCompleteLocationData(
      mockMinimalProperty,
      mockNullExternalData
    );

    expect(result).toBe(false);
  });

  it('should return false for null external data', () => {
    const result = hasCompleteLocationData(mockIdealProperty, null);

    expect(result).toBe(false);
  });
});

describe('getLocationDataCompleteness', () => {
  it('should return 100% for complete data', () => {
    const result = getLocationDataCompleteness(
      mockIdealProperty,
      mockIdealExternalData
    );

    expect(result).toBe(100);
  });

  it('should return low percentage for missing data', () => {
    const result = getLocationDataCompleteness(
      mockMinimalProperty,
      mockNullExternalData
    );

    expect(result).toBeLessThan(30);
  });

  it('should return partial percentage for some data', () => {
    const partialExternalData = createMockExternalData({
      walkScore: 70,
      transitScore: null,
      crimeData: null,
      schoolRating: null,
      nearbyAmenities: null,
    });

    const result = getLocationDataCompleteness(
      mockIdealProperty,
      partialExternalData
    );

    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(100);
  });
});

// ============================================
// Data Source Tracking Tests
// ============================================

describe('data source tracking', () => {
  it('should track data sources for each component', () => {
    const result = calculateLocationScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    result.components.forEach((component) => {
      expect(component.dataSource).toBeDefined();
      expect(component.dataSource.name).toBeDefined();
      expect(component.dataSource.type).toBeDefined();
      expect(component.dataSource.reliability).toBeDefined();
    });
  });

  it('should mark default values appropriately', () => {
    const result = calculateLocationScore(
      mockMinimalProperty,
      mockNullExternalData
    );

    const defaultComponents = result.components.filter(
      (c) => c.dataSource.type === 'default'
    );

    expect(defaultComponents.length).toBeGreaterThan(0);
  });
});

// ============================================
// Adjustment Tests
// ============================================

describe('score adjustments', () => {
  it('should track adjustments applied', () => {
    const result = calculateLocationScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    expect(result.adjustments).toBeDefined();
    expect(Array.isArray(result.adjustments)).toBe(true);
  });

  it('should not apply excessive adjustments', () => {
    const result = calculateLocationScore(
      mockIdealProperty,
      mockIdealExternalData
    );

    // Adjustments should be reasonable (within 20% of base score)
    const totalAdjustmentFactor = result.adjustments.reduce(
      (product, adj) => product * adj.factor,
      1
    );

    expect(totalAdjustmentFactor).toBeGreaterThan(0.8);
    expect(totalAdjustmentFactor).toBeLessThan(1.2);
  });
});

// ============================================
// Edge Cases
// ============================================

describe('edge cases', () => {
  it('should handle property with coordinates but no address', () => {
    const property = createMockProperty({
      address: null,
      coordinates: { latitude: 40.5187, longitude: -78.3947 },
    });

    const result = calculateLocationScore(property, mockIdealExternalData);

    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('should handle property with no coordinates', () => {
    const property = createMockProperty({
      coordinates: null,
    });

    const result = calculateLocationScore(property, mockIdealExternalData);

    expect(result).toBeDefined();
    // Should note that some location features couldn't be verified
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('should handle extreme walk score values', () => {
    const externalData = createMockExternalData({ walkScore: 100 });
    const result = calculateWalkabilityScore(mockIdealProperty, externalData);

    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.score).toBeGreaterThanOrEqual(4.5);
  });

  it('should handle zero walk score', () => {
    const externalData = createMockExternalData({ walkScore: 0 });
    const result = calculateWalkabilityScore(mockIdealProperty, externalData);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});
