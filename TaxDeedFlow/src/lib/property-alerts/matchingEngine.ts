/**
 * Property Matching Engine - Property Alert System
 *
 * This module matches properties against user-defined alert rule criteria
 * including score thresholds, location filters, property types, price ranges,
 * and acreage requirements. It calculates match scores and provides detailed
 * reasons for each match.
 *
 * @module lib/property-alerts/matchingEngine
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import type { AlertRule, MatchCriteria, MatchReasons, MatchResult } from './types';

// ============================================
// Type Definitions
// ============================================

/**
 * Simplified property interface for matching
 * Includes only fields needed for alert matching
 */
export interface MatchableProperty {
  /** Property ID */
  id: string;
  /** County ID reference */
  county_id: string;
  /** County name for display */
  county_name?: string;
  /** Property type classification */
  property_type?: string | null;
  /** Total amount due */
  total_due?: number | null;
  /** Lot size in acres */
  lot_size_acres?: number | null;
  /** Investment score (0-125) */
  total_score?: number | null;
}

// ============================================
// Constants
// ============================================

/**
 * Weights for each criteria in match score calculation
 * Higher weights for more important criteria
 * Total should sum to 1.0
 */
const CRITERIA_WEIGHTS = {
  score: 0.35, // Most important - investment quality
  county: 0.25, // Location preference
  propertyType: 0.20, // Property type preference
  price: 0.15, // Budget constraint
  acreage: 0.05, // Size preference
};

/**
 * Minimum number of criteria that must match for a valid alert
 * At least score OR (county + price) must match
 */
const MIN_REQUIRED_MATCHES = 1;

// ============================================
// Individual Criteria Matching Functions
// ============================================

/**
 * Check if property meets score threshold requirement
 *
 * @param property Property to check
 * @param scoreThreshold Minimum required score (0-125)
 * @returns True if property score meets or exceeds threshold
 */
function matchesScoreThreshold(
  property: MatchableProperty,
  scoreThreshold: number | null | undefined
): boolean {
  // If no threshold specified, consider it a match (no restriction)
  if (scoreThreshold === null || scoreThreshold === undefined) {
    return true;
  }

  // If property has no score, it doesn't match
  if (property.total_score === null || property.total_score === undefined) {
    return false;
  }

  return property.total_score >= scoreThreshold;
}

/**
 * Check if property is in one of the allowed counties
 *
 * @param property Property to check
 * @param countyIds Array of allowed county IDs
 * @returns True if property county is in the allowed list
 */
function matchesCounty(
  property: MatchableProperty,
  countyIds: string[] | null | undefined
): boolean {
  // If no counties specified, all counties match
  if (!countyIds || countyIds.length === 0) {
    return true;
  }

  return countyIds.includes(property.county_id);
}

/**
 * Check if property type is in the allowed types
 *
 * @param property Property to check
 * @param propertyTypes Array of allowed property types
 * @returns True if property type is in the allowed list
 */
function matchesPropertyType(
  property: MatchableProperty,
  propertyTypes: string[] | null | undefined
): boolean {
  // If no types specified, all types match
  if (!propertyTypes || propertyTypes.length === 0) {
    return true;
  }

  // If property has no type, it doesn't match specific type requirements
  if (!property.property_type) {
    return false;
  }

  return propertyTypes.includes(property.property_type);
}

/**
 * Check if property price is within budget
 *
 * @param property Property to check
 * @param maxBid Maximum bid amount willing to pay
 * @returns True if property price is at or below max bid
 */
function matchesPriceRange(
  property: MatchableProperty,
  maxBid: number | null | undefined
): boolean {
  // If no max bid specified, all prices match
  if (maxBid === null || maxBid === undefined) {
    return true;
  }

  // If property has no price, it doesn't match
  if (property.total_due === null || property.total_due === undefined) {
    return false;
  }

  return property.total_due <= maxBid;
}

/**
 * Check if property acreage is within desired range
 *
 * @param property Property to check
 * @param minAcres Minimum acreage required
 * @param maxAcres Maximum acreage allowed
 * @returns True if property acreage is within range
 */
function matchesAcreageRange(
  property: MatchableProperty,
  minAcres: number | null | undefined,
  maxAcres: number | null | undefined
): boolean {
  // If no acreage requirements specified, all sizes match
  if (
    (minAcres === null || minAcres === undefined) &&
    (maxAcres === null || maxAcres === undefined)
  ) {
    return true;
  }

  // If property has no acreage data, it doesn't match specific acreage requirements
  if (property.lot_size_acres === null || property.lot_size_acres === undefined) {
    return false;
  }

  const acres = property.lot_size_acres;

  // Check minimum if specified
  if (minAcres !== null && minAcres !== undefined && acres < minAcres) {
    return false;
  }

  // Check maximum if specified
  if (maxAcres !== null && maxAcres !== undefined && acres > maxAcres) {
    return false;
  }

  return true;
}

// ============================================
// Match Reason Generation
// ============================================

/**
 * Get detailed reasons why a property matched the alert criteria
 *
 * @param property Property that was matched
 * @param rule Alert rule to match against
 * @returns Detailed match reasons with specific values
 */
export function getMatchReasons(
  property: MatchableProperty,
  rule: AlertRule | MatchCriteria
): MatchReasons {
  const reasons: string[] = [];
  const matchReasons: MatchReasons = {
    scoreMatch: false,
    countyMatch: false,
    propertyTypeMatch: false,
    priceWithinBudget: false,
    acresInRange: false,
    reasons: [],
  };

  // Check score match
  if (rule.scoreThreshold !== null && rule.scoreThreshold !== undefined) {
    matchReasons.scoreMatch = matchesScoreThreshold(property, rule.scoreThreshold);
    if (matchReasons.scoreMatch && property.total_score !== null) {
      reasons.push(
        `Investment score ${property.total_score} meets threshold of ${rule.scoreThreshold}`
      );
    }
  }

  // Check county match
  if (rule.countyIds && rule.countyIds.length > 0) {
    matchReasons.countyMatch = matchesCounty(property, rule.countyIds);
    if (matchReasons.countyMatch) {
      const countyName = property.county_name || property.county_id;
      reasons.push(`Located in preferred county: ${countyName}`);
    }
  } else {
    // If no county restriction, consider it a match
    matchReasons.countyMatch = true;
  }

  // Check property type match
  if (rule.propertyTypes && rule.propertyTypes.length > 0) {
    matchReasons.propertyTypeMatch = matchesPropertyType(property, rule.propertyTypes);
    if (matchReasons.propertyTypeMatch && property.property_type) {
      const typeLabel = property.property_type.replace(/_/g, ' ');
      reasons.push(`Property type matches: ${typeLabel}`);
    }
  } else {
    // If no type restriction, consider it a match
    matchReasons.propertyTypeMatch = true;
  }

  // Check price match
  if (rule.maxBid !== null && rule.maxBid !== undefined) {
    matchReasons.priceWithinBudget = matchesPriceRange(property, rule.maxBid);
    if (matchReasons.priceWithinBudget && property.total_due !== null && property.total_due !== undefined) {
      reasons.push(
        `Price $${property.total_due.toLocaleString()} within budget of $${rule.maxBid.toLocaleString()}`
      );
    }
  } else {
    // If no price restriction, consider it a match
    matchReasons.priceWithinBudget = true;
  }

  // Check acreage match
  const hasAcreageRequirement =
    (rule.minAcres !== null && rule.minAcres !== undefined) ||
    (rule.maxAcres !== null && rule.maxAcres !== undefined);

  if (hasAcreageRequirement) {
    matchReasons.acresInRange = matchesAcreageRange(
      property,
      rule.minAcres,
      rule.maxAcres
    );
    if (matchReasons.acresInRange && property.lot_size_acres !== null && property.lot_size_acres !== undefined) {
      let acreageDesc = `${property.lot_size_acres.toFixed(2)} acres`;
      if (rule.minAcres && rule.maxAcres) {
        acreageDesc += ` within range ${rule.minAcres}-${rule.maxAcres} acres`;
      } else if (rule.minAcres) {
        acreageDesc += ` meets minimum of ${rule.minAcres} acres`;
      } else if (rule.maxAcres) {
        acreageDesc += ` within maximum of ${rule.maxAcres} acres`;
      }
      reasons.push(acreageDesc);
    }
  } else {
    // If no acreage restriction, consider it a match
    matchReasons.acresInRange = true;
  }

  matchReasons.reasons = reasons;
  return matchReasons;
}

// ============================================
// Match Score Calculation
// ============================================

/**
 * Calculate how well a property matches the alert criteria
 * Returns a score from 0-100 based on weighted criteria matches
 *
 * @param property Property to evaluate
 * @param rule Alert rule to match against
 * @returns Match score (0-100)
 */
export function calculateMatchScore(
  property: MatchableProperty,
  rule: AlertRule | MatchCriteria
): number {
  let totalWeight = 0;
  let matchedWeight = 0;

  // Score threshold
  if (rule.scoreThreshold !== null && rule.scoreThreshold !== undefined) {
    totalWeight += CRITERIA_WEIGHTS.score;
    if (matchesScoreThreshold(property, rule.scoreThreshold)) {
      matchedWeight += CRITERIA_WEIGHTS.score;
    }
  }

  // County filter
  if (rule.countyIds && rule.countyIds.length > 0) {
    totalWeight += CRITERIA_WEIGHTS.county;
    if (matchesCounty(property, rule.countyIds)) {
      matchedWeight += CRITERIA_WEIGHTS.county;
    }
  }

  // Property type filter
  if (rule.propertyTypes && rule.propertyTypes.length > 0) {
    totalWeight += CRITERIA_WEIGHTS.propertyType;
    if (matchesPropertyType(property, rule.propertyTypes)) {
      matchedWeight += CRITERIA_WEIGHTS.propertyType;
    }
  }

  // Price range
  if (rule.maxBid !== null && rule.maxBid !== undefined) {
    totalWeight += CRITERIA_WEIGHTS.price;
    if (matchesPriceRange(property, rule.maxBid)) {
      matchedWeight += CRITERIA_WEIGHTS.price;
    }
  }

  // Acreage range
  const hasAcreageRequirement =
    (rule.minAcres !== null && rule.minAcres !== undefined) ||
    (rule.maxAcres !== null && rule.maxAcres !== undefined);

  if (hasAcreageRequirement) {
    totalWeight += CRITERIA_WEIGHTS.acreage;
    if (matchesAcreageRange(property, rule.minAcres, rule.maxAcres)) {
      matchedWeight += CRITERIA_WEIGHTS.acreage;
    }
  }

  // If no criteria were specified, return 0 (invalid rule)
  if (totalWeight === 0) {
    return 0;
  }

  // Calculate percentage match
  const matchPercentage = (matchedWeight / totalWeight) * 100;
  return Math.round(matchPercentage * 10) / 10; // Round to 1 decimal place
}

// ============================================
// Main Matching Function
// ============================================

/**
 * Determine if a property matches an alert rule
 * Returns detailed match result with score and reasons
 *
 * @param property Property to evaluate
 * @param rule Alert rule to match against
 * @returns Match result with boolean, score, and detailed reasons
 */
export function matchProperty(
  property: MatchableProperty,
  rule: AlertRule | MatchCriteria
): MatchResult {
  const matchReasons = getMatchReasons(property, rule);
  const matchScore = calculateMatchScore(property, rule);

  // A property matches if ALL specified criteria are met
  // We check each criterion that was actually specified in the rule
  let criteriaCount = 0;
  let matchedCount = 0;

  // Score threshold (if specified)
  if (rule.scoreThreshold !== null && rule.scoreThreshold !== undefined) {
    criteriaCount++;
    if (matchReasons.scoreMatch) matchedCount++;
  }

  // County filter (if specified)
  if (rule.countyIds && rule.countyIds.length > 0) {
    criteriaCount++;
    if (matchReasons.countyMatch) matchedCount++;
  }

  // Property type filter (if specified)
  if (rule.propertyTypes && rule.propertyTypes.length > 0) {
    criteriaCount++;
    if (matchReasons.propertyTypeMatch) matchedCount++;
  }

  // Price range (if specified)
  if (rule.maxBid !== null && rule.maxBid !== undefined) {
    criteriaCount++;
    if (matchReasons.priceWithinBudget) matchedCount++;
  }

  // Acreage range (if specified)
  const hasAcreageRequirement =
    (rule.minAcres !== null && rule.minAcres !== undefined) ||
    (rule.maxAcres !== null && rule.maxAcres !== undefined);

  if (hasAcreageRequirement) {
    criteriaCount++;
    if (matchReasons.acresInRange) matchedCount++;
  }

  // Property matches if ALL specified criteria are met
  // AND at least one criterion was specified
  const matches = criteriaCount > 0 && matchedCount === criteriaCount;

  return {
    matches,
    score: matchScore,
    reasons: matchReasons,
  };
}

// ============================================
// Batch Matching Functions
// ============================================

/**
 * Match multiple properties against a single alert rule
 * Returns only matching properties with their match details
 *
 * @param properties Array of properties to evaluate
 * @param rule Alert rule to match against
 * @returns Array of matching properties with match results
 */
export function matchProperties(
  properties: MatchableProperty[],
  rule: AlertRule | MatchCriteria
): Array<{ property: MatchableProperty; result: MatchResult }> {
  return properties
    .map((property) => ({
      property,
      result: matchProperty(property, rule),
    }))
    .filter((match) => match.result.matches);
}

/**
 * Get the best matching properties sorted by match score
 *
 * @param properties Array of properties to evaluate
 * @param rule Alert rule to match against
 * @param limit Maximum number of results to return
 * @returns Top matching properties sorted by score (descending)
 */
export function getTopMatches(
  properties: MatchableProperty[],
  rule: AlertRule | MatchCriteria,
  limit: number = 10
): Array<{ property: MatchableProperty; result: MatchResult }> {
  const matches = matchProperties(properties, rule);

  return matches
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, limit);
}

/**
 * Count how many properties match a given rule
 *
 * @param properties Array of properties to evaluate
 * @param rule Alert rule to match against
 * @returns Number of matching properties
 */
export function countMatches(
  properties: MatchableProperty[],
  rule: AlertRule | MatchCriteria
): number {
  return properties.filter((property) => matchProperty(property, rule).matches)
    .length;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Validate that an alert rule has at least one criterion specified
 *
 * @param rule Alert rule to validate
 * @returns True if rule has valid criteria
 */
export function isValidRule(rule: AlertRule | MatchCriteria): boolean {
  return (
    (rule.scoreThreshold !== null && rule.scoreThreshold !== undefined) ||
    (rule.countyIds !== null && rule.countyIds !== undefined && rule.countyIds.length > 0) ||
    (rule.propertyTypes !== null && rule.propertyTypes !== undefined && rule.propertyTypes.length > 0) ||
    (rule.maxBid !== null && rule.maxBid !== undefined) ||
    (rule.minAcres !== null && rule.minAcres !== undefined) ||
    (rule.maxAcres !== null && rule.maxAcres !== undefined)
  );
}

/**
 * Get human-readable description of match quality based on score
 *
 * @param score Match score (0-100)
 * @returns Description string
 */
export function getMatchQualityDescription(score: number): string {
  if (score >= 95) return 'Perfect match';
  if (score >= 85) return 'Excellent match';
  if (score >= 75) return 'Very good match';
  if (score >= 60) return 'Good match';
  if (score >= 40) return 'Fair match';
  if (score >= 20) return 'Partial match';
  return 'Poor match';
}
