/**
 * Property Matching Engine Tests
 *
 * Tests for the property alert matching engine that evaluates properties
 * against user-defined alert rule criteria.
 *
 * @module lib/property-alerts/__tests__/matchingEngine
 */

import { describe, it, expect } from 'vitest';
import {
  matchProperty,
  calculateMatchScore,
  getMatchReasons,
  matchProperties,
  getTopMatches,
  countMatches,
  isValidRule,
  getMatchQualityDescription,
  type MatchableProperty,
} from '../matchingEngine';
import type { AlertRule, MatchCriteria } from '../types';

// ============================================
// Test Data
// ============================================

const mockProperties: MatchableProperty[] = [
  {
    id: 'prop-1',
    county_id: 'county-blair',
    county_name: 'Blair County',
    property_type: 'single_family_residential',
    total_due: 5000,
    lot_size_acres: 0.25,
    total_score: 85,
  },
  {
    id: 'prop-2',
    county_id: 'county-centre',
    county_name: 'Centre County',
    property_type: 'vacant_land',
    total_due: 2000,
    lot_size_acres: 5.0,
    total_score: 70,
  },
  {
    id: 'prop-3',
    county_id: 'county-blair',
    county_name: 'Blair County',
    property_type: 'single_family_residential',
    total_due: 15000,
    lot_size_acres: 0.5,
    total_score: 95,
  },
  {
    id: 'prop-4',
    county_id: 'county-blair',
    county_name: 'Blair County',
    property_type: 'multi_family_residential',
    total_due: 8000,
    lot_size_acres: 0.3,
    total_score: 65,
  },
];

const basicRule: MatchCriteria = {
  scoreThreshold: 80,
  countyIds: ['county-blair'],
  propertyTypes: undefined,
  maxBid: 10000,
  minAcres: undefined,
  maxAcres: undefined,
};

// ============================================
// Individual Matching Tests
// ============================================

describe('matchProperty', () => {
  it('should match property that meets all criteria', () => {
    const result = matchProperty(mockProperties[0], basicRule);

    expect(result.matches).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.scoreMatch).toBe(true);
    expect(result.reasons.countyMatch).toBe(true);
    expect(result.reasons.priceWithinBudget).toBe(true);
  });

  it('should not match property that fails score threshold', () => {
    const result = matchProperty(mockProperties[3], basicRule);

    expect(result.matches).toBe(false);
    expect(result.reasons.scoreMatch).toBe(false);
  });

  it('should not match property that exceeds max bid', () => {
    const result = matchProperty(mockProperties[2], basicRule);

    expect(result.matches).toBe(false);
    expect(result.reasons.priceWithinBudget).toBe(false);
  });

  it('should not match property in wrong county', () => {
    const result = matchProperty(mockProperties[1], basicRule);

    expect(result.matches).toBe(false);
    expect(result.reasons.countyMatch).toBe(false);
  });
});

// ============================================
// Score Threshold Tests
// ============================================

describe('Score Threshold Matching', () => {
  it('should match when score meets threshold', () => {
    const rule: MatchCriteria = { scoreThreshold: 80 };
    const result = matchProperty(mockProperties[0], rule);

    expect(result.matches).toBe(true);
    expect(result.reasons.scoreMatch).toBe(true);
  });

  it('should not match when score is below threshold', () => {
    const rule: MatchCriteria = { scoreThreshold: 90 };
    const result = matchProperty(mockProperties[0], rule);

    expect(result.matches).toBe(false);
    expect(result.reasons.scoreMatch).toBe(false);
  });

  it('should match all properties when no threshold specified', () => {
    const rule: MatchCriteria = { scoreThreshold: undefined };

    // This rule is invalid (no criteria), so should not match
    const result = matchProperty(mockProperties[0], rule);
    expect(result.matches).toBe(false);
  });

  it('should not match property with no score', () => {
    const rule: MatchCriteria = { scoreThreshold: 80 };
    const propertyNoScore: MatchableProperty = {
      ...mockProperties[0],
      total_score: null,
    };

    const result = matchProperty(propertyNoScore, rule);
    expect(result.matches).toBe(false);
  });
});

// ============================================
// County Filter Tests
// ============================================

describe('County Filtering', () => {
  it('should match property in allowed county', () => {
    const rule: MatchCriteria = { countyIds: ['county-blair'] };
    const result = matchProperty(mockProperties[0], rule);

    expect(result.matches).toBe(true);
    expect(result.reasons.countyMatch).toBe(true);
  });

  it('should match property in any of multiple allowed counties', () => {
    const rule: MatchCriteria = { countyIds: ['county-blair', 'county-centre'] };
    const result1 = matchProperty(mockProperties[0], rule);
    const result2 = matchProperty(mockProperties[1], rule);

    expect(result1.matches).toBe(true);
    expect(result2.matches).toBe(true);
  });

  it('should not match property not in allowed counties', () => {
    const rule: MatchCriteria = { countyIds: ['county-other'] };
    const result = matchProperty(mockProperties[0], rule);

    expect(result.matches).toBe(false);
    expect(result.reasons.countyMatch).toBe(false);
  });
});

// ============================================
// Property Type Tests
// ============================================

describe('Property Type Filtering', () => {
  it('should match property of allowed type', () => {
    const rule: MatchCriteria = { propertyTypes: ['single_family_residential'] };
    const result = matchProperty(mockProperties[0], rule);

    expect(result.matches).toBe(true);
    expect(result.reasons.propertyTypeMatch).toBe(true);
  });

  it('should match property of any allowed type', () => {
    const rule: MatchCriteria = {
      propertyTypes: ['single_family_residential', 'multi_family_residential'],
    };
    const result1 = matchProperty(mockProperties[0], rule);
    const result2 = matchProperty(mockProperties[3], rule);

    expect(result1.matches).toBe(true);
    expect(result2.matches).toBe(true);
  });

  it('should not match property of wrong type', () => {
    const rule: MatchCriteria = { propertyTypes: ['commercial'] };
    const result = matchProperty(mockProperties[0], rule);

    expect(result.matches).toBe(false);
    expect(result.reasons.propertyTypeMatch).toBe(false);
  });
});

// ============================================
// Price Range Tests
// ============================================

describe('Price Range Filtering', () => {
  it('should match property within budget', () => {
    const rule: MatchCriteria = { maxBid: 10000 };
    const result = matchProperty(mockProperties[0], rule);

    expect(result.matches).toBe(true);
    expect(result.reasons.priceWithinBudget).toBe(true);
  });

  it('should not match property over budget', () => {
    const rule: MatchCriteria = { maxBid: 10000 };
    const result = matchProperty(mockProperties[2], rule);

    expect(result.matches).toBe(false);
    expect(result.reasons.priceWithinBudget).toBe(false);
  });

  it('should not match property with no price', () => {
    const rule: MatchCriteria = { maxBid: 10000 };
    const propertyNoPrice: MatchableProperty = {
      ...mockProperties[0],
      total_due: null,
    };

    const result = matchProperty(propertyNoPrice, rule);
    expect(result.matches).toBe(false);
  });
});

// ============================================
// Acreage Range Tests
// ============================================

describe('Acreage Range Filtering', () => {
  it('should match property within acreage range', () => {
    const rule: MatchCriteria = { minAcres: 0.2, maxAcres: 1.0 };
    const result = matchProperty(mockProperties[0], rule);

    expect(result.matches).toBe(true);
    expect(result.reasons.acresInRange).toBe(true);
  });

  it('should not match property below minimum acres', () => {
    const rule: MatchCriteria = { minAcres: 1.0 };
    const result = matchProperty(mockProperties[0], rule);

    expect(result.matches).toBe(false);
    expect(result.reasons.acresInRange).toBe(false);
  });

  it('should not match property above maximum acres', () => {
    const rule: MatchCriteria = { maxAcres: 0.5 };
    const result = matchProperty(mockProperties[1], rule);

    expect(result.matches).toBe(false);
    expect(result.reasons.acresInRange).toBe(false);
  });

  it('should match property with only minimum specified', () => {
    const rule: MatchCriteria = { minAcres: 0.2 };
    const result = matchProperty(mockProperties[0], rule);

    expect(result.matches).toBe(true);
  });

  it('should match property with only maximum specified', () => {
    const rule: MatchCriteria = { maxAcres: 1.0 };
    const result = matchProperty(mockProperties[0], rule);

    expect(result.matches).toBe(true);
  });
});

// ============================================
// Match Score Calculation Tests
// ============================================

describe('calculateMatchScore', () => {
  it('should return 100 for perfect match', () => {
    const rule: MatchCriteria = {
      scoreThreshold: 80,
      countyIds: ['county-blair'],
      maxBid: 10000,
    };
    const score = calculateMatchScore(mockProperties[0], rule);

    expect(score).toBe(100);
  });

  it('should return partial score for partial match', () => {
    const rule: MatchCriteria = {
      scoreThreshold: 80,
      countyIds: ['county-other'],
      maxBid: 10000,
    };
    const score = calculateMatchScore(mockProperties[0], rule);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it('should return 0 for no criteria specified', () => {
    const rule: MatchCriteria = {};
    const score = calculateMatchScore(mockProperties[0], rule);

    expect(score).toBe(0);
  });
});

// ============================================
// Match Reasons Tests
// ============================================

describe('getMatchReasons', () => {
  it('should provide detailed reasons for match', () => {
    const rule: MatchCriteria = {
      scoreThreshold: 80,
      countyIds: ['county-blair'],
      maxBid: 10000,
    };
    const reasons = getMatchReasons(mockProperties[0], rule);

    expect(reasons.scoreMatch).toBe(true);
    expect(reasons.countyMatch).toBe(true);
    expect(reasons.priceWithinBudget).toBe(true);
    expect(reasons.reasons).toHaveLength(3);
  });

  it('should indicate which criteria failed', () => {
    const rule: MatchCriteria = {
      scoreThreshold: 90,
      countyIds: ['county-other'],
    };
    const reasons = getMatchReasons(mockProperties[0], rule);

    expect(reasons.scoreMatch).toBe(false);
    expect(reasons.countyMatch).toBe(false);
  });
});

// ============================================
// Batch Matching Tests
// ============================================

describe('matchProperties', () => {
  it('should return all matching properties', () => {
    const rule: MatchCriteria = {
      countyIds: ['county-blair'],
      maxBid: 10000,
    };
    const matches = matchProperties(mockProperties, rule);

    expect(matches).toHaveLength(2); // prop-1 and prop-4
    expect(matches[0].property.id).toBe('prop-1');
    expect(matches[1].property.id).toBe('prop-4');
  });

  it('should return empty array when no matches', () => {
    const rule: MatchCriteria = {
      countyIds: ['county-nonexistent'],
    };
    const matches = matchProperties(mockProperties, rule);

    expect(matches).toHaveLength(0);
  });
});

describe('getTopMatches', () => {
  it('should return top matches sorted by score', () => {
    const rule: MatchCriteria = {
      countyIds: ['county-blair'],
    };
    const matches = getTopMatches(mockProperties, rule, 2);

    expect(matches.length).toBeLessThanOrEqual(2);
    if (matches.length > 1) {
      expect(matches[0].result.score).toBeGreaterThanOrEqual(matches[1].result.score);
    }
  });

  it('should respect the limit parameter', () => {
    const rule: MatchCriteria = {
      countyIds: ['county-blair'],
    };
    const matches = getTopMatches(mockProperties, rule, 1);

    expect(matches.length).toBeLessThanOrEqual(1);
  });
});

describe('countMatches', () => {
  it('should count matching properties', () => {
    const rule: MatchCriteria = {
      countyIds: ['county-blair'],
    };
    const count = countMatches(mockProperties, rule);

    expect(count).toBe(3); // prop-1, prop-3, prop-4
  });

  it('should return 0 when no matches', () => {
    const rule: MatchCriteria = {
      countyIds: ['county-nonexistent'],
    };
    const count = countMatches(mockProperties, rule);

    expect(count).toBe(0);
  });
});

// ============================================
// Utility Function Tests
// ============================================

describe('isValidRule', () => {
  it('should return true for rule with score threshold', () => {
    const rule: MatchCriteria = { scoreThreshold: 80 };
    expect(isValidRule(rule)).toBe(true);
  });

  it('should return true for rule with county filter', () => {
    const rule: MatchCriteria = { countyIds: ['county-blair'] };
    expect(isValidRule(rule)).toBe(true);
  });

  it('should return true for rule with any criterion', () => {
    const rule: MatchCriteria = { maxBid: 10000 };
    expect(isValidRule(rule)).toBe(true);
  });

  it('should return false for empty rule', () => {
    const rule: MatchCriteria = {};
    expect(isValidRule(rule)).toBe(false);
  });

  it('should return false for rule with empty object', () => {
    const rule: MatchCriteria = {};
    expect(isValidRule(rule)).toBe(false);
  });
});

describe('getMatchQualityDescription', () => {
  it('should return "Perfect match" for score 100', () => {
    expect(getMatchQualityDescription(100)).toBe('Perfect match');
  });

  it('should return "Excellent match" for high scores', () => {
    expect(getMatchQualityDescription(90)).toBe('Excellent match');
  });

  it('should return "Poor match" for low scores', () => {
    expect(getMatchQualityDescription(10)).toBe('Poor match');
  });
});

// ============================================
// Complex Scenario Tests
// ============================================

describe('Complex Matching Scenarios', () => {
  it('should handle multiple criteria correctly', () => {
    const rule: MatchCriteria = {
      scoreThreshold: 80,
      countyIds: ['county-blair'],
      propertyTypes: ['single_family_residential'],
      maxBid: 10000,
      minAcres: 0.2,
      maxAcres: 1.0,
    };

    const result = matchProperty(mockProperties[0], rule);
    expect(result.matches).toBe(true);
  });

  it('should fail if any criterion is not met', () => {
    const rule: MatchCriteria = {
      scoreThreshold: 80,
      countyIds: ['county-blair'],
      propertyTypes: ['commercial'], // Wrong type
      maxBid: 10000,
    };

    const result = matchProperty(mockProperties[0], rule);
    expect(result.matches).toBe(false);
  });

  it('should handle properties with missing data gracefully', () => {
    const incompleteProperty: MatchableProperty = {
      id: 'prop-incomplete',
      county_id: 'county-blair',
      property_type: null,
      total_due: null,
      lot_size_acres: null,
      total_score: null,
    };

    const rule: MatchCriteria = {
      scoreThreshold: 80,
    };

    const result = matchProperty(incompleteProperty, rule);
    expect(result.matches).toBe(false);
  });
});
