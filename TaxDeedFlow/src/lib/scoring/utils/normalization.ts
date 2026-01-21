/**
 * Value Normalization Utilities
 *
 * This file contains helper functions for normalizing raw values
 * to standardized scales (0-100 or 0-5) for scoring purposes.
 *
 * Normalization ensures consistent scoring regardless of the
 * original data range or units.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import { SCORING_CONSTANTS } from '../constants';

/**
 * Normalize a value from an arbitrary range to a 0-100 scale
 *
 * Uses linear interpolation: normalized = ((value - min) / (max - min)) * 100
 *
 * @param value - The raw value to normalize
 * @param min - The minimum possible value in the original range
 * @param max - The maximum possible value in the original range
 * @returns Normalized value on 0-100 scale
 *
 * @example
 * // Walk Score already on 0-100 scale
 * normalizeToScale(75, 0, 100); // Returns 75
 *
 * @example
 * // School rating on 1-10 scale
 * normalizeToScale(8, 1, 10); // Returns 77.78
 *
 * @example
 * // Crime index (inverted - lower is better)
 * normalizeToScale(30, 0, 100); // Returns 30
 * // Then use invertNormalizedValue(30) to get 70
 */
export function normalizeToScale(
  value: number,
  min: number,
  max: number
): number {
  // Handle edge cases
  if (min === max) {
    return 50; // Default to middle if range is zero
  }

  if (value <= min) {
    return 0;
  }

  if (value >= max) {
    return 100;
  }

  // Linear normalization
  return ((value - min) / (max - min)) * 100;
}

/**
 * Invert a normalized value (0-100 becomes 100-0)
 * Used when lower raw values should result in higher scores
 *
 * @param normalizedValue - Value on 0-100 scale
 * @returns Inverted value on 0-100 scale
 *
 * @example
 * // Crime index: lower crime = better score
 * invertNormalizedValue(30); // Returns 70 (low crime = high score)
 * invertNormalizedValue(80); // Returns 20 (high crime = low score)
 */
export function invertNormalizedValue(normalizedValue: number): number {
  return 100 - Math.max(0, Math.min(100, normalizedValue));
}

/**
 * Convert a normalized 0-100 value to a component score (0-5)
 *
 * @param normalizedValue - Value on 0-100 scale
 * @returns Score on 0-5 scale
 *
 * @example
 * normalizedToComponentScore(100); // Returns 5
 * normalizedToComponentScore(50); // Returns 2.5
 * normalizedToComponentScore(0); // Returns 0
 */
export function normalizedToComponentScore(normalizedValue: number): number {
  const clamped = Math.max(0, Math.min(100, normalizedValue));
  return (clamped / 100) * SCORING_CONSTANTS.MAX_COMPONENT_SCORE;
}

/**
 * Convert a component score (0-5) to a normalized value (0-100)
 *
 * @param componentScore - Score on 0-5 scale
 * @returns Normalized value on 0-100 scale
 *
 * @example
 * componentScoreToNormalized(5); // Returns 100
 * componentScoreToNormalized(2.5); // Returns 50
 * componentScoreToNormalized(0); // Returns 0
 */
export function componentScoreToNormalized(componentScore: number): number {
  const clamped = Math.max(0, Math.min(SCORING_CONSTANTS.MAX_COMPONENT_SCORE, componentScore));
  return (clamped / SCORING_CONSTANTS.MAX_COMPONENT_SCORE) * 100;
}

/**
 * Normalize a value using a custom curve
 * Useful for non-linear relationships (e.g., crime rates)
 *
 * @param value - Raw value to normalize
 * @param min - Minimum of range
 * @param max - Maximum of range
 * @param curve - Curve type: 'linear', 'logarithmic', 'exponential', 'sigmoid'
 * @returns Normalized value on 0-100 scale
 *
 * @example
 * // Use logarithmic curve for crime rates (diminishing returns)
 * normalizeWithCurve(50, 0, 100, 'logarithmic');
 */
export function normalizeWithCurve(
  value: number,
  min: number,
  max: number,
  curve: 'linear' | 'logarithmic' | 'exponential' | 'sigmoid'
): number {
  // First, linear normalization to 0-1 range
  let normalized: number;

  if (min === max) {
    normalized = 0.5;
  } else if (value <= min) {
    normalized = 0;
  } else if (value >= max) {
    normalized = 1;
  } else {
    normalized = (value - min) / (max - min);
  }

  // Apply curve transformation
  let curved: number;

  switch (curve) {
    case 'logarithmic':
      // Logarithmic curve: fast initial growth, slowing down
      // Good for diminishing returns (e.g., walk score beyond 80)
      curved = Math.log(1 + normalized * (Math.E - 1));
      break;

    case 'exponential':
      // Exponential curve: slow initial growth, accelerating
      // Good for penalty systems (e.g., crime index)
      curved = (Math.exp(normalized) - 1) / (Math.E - 1);
      break;

    case 'sigmoid':
      // S-curve: slow at extremes, steep in middle
      // Good for balanced scoring around a midpoint
      curved = 1 / (1 + Math.exp(-10 * (normalized - 0.5)));
      break;

    case 'linear':
    default:
      curved = normalized;
      break;
  }

  return curved * 100;
}

/**
 * Normalize a boolean value to a score
 * Useful for yes/no conditions
 *
 * @param value - Boolean value to normalize
 * @param trueScore - Score when true (default: 100)
 * @param falseScore - Score when false (default: 0)
 * @returns Normalized value
 *
 * @example
 * // Has flood insurance required
 * normalizeBoolean(true, 0, 100); // Returns 0 (bad: insurance required)
 * normalizeBoolean(false, 100, 0); // Returns 100 (good: no insurance needed)
 */
export function normalizeBoolean(
  value: boolean,
  trueScore: number = 100,
  falseScore: number = 0
): number {
  return value ? trueScore : falseScore;
}

/**
 * Normalize a categorical value to a score
 * Maps discrete categories to numeric scores
 *
 * @param value - Categorical value
 * @param mapping - Object mapping categories to scores
 * @param defaultScore - Score if category not found (default: 50)
 * @returns Normalized value on 0-100 scale
 *
 * @example
 * const floodZoneMapping = {
 *   'X': 100,      // Minimal risk
 *   'B': 75,       // Moderate risk
 *   'C': 75,       // Moderate risk
 *   'AE': 25,      // High risk
 *   'A': 10,       // Very high risk
 *   'V': 0,        // Coastal high hazard
 * };
 * normalizeCategorical('X', floodZoneMapping); // Returns 100
 * normalizeCategorical('A', floodZoneMapping); // Returns 10
 */
export function normalizeCategorical<T extends string | number>(
  value: T,
  mapping: Record<string | number, number>,
  defaultScore: number = 50
): number {
  const score = mapping[value as string | number];
  return score !== undefined ? score : defaultScore;
}

/**
 * Apply a threshold-based normalization
 * Values below/above thresholds get minimum/maximum scores
 *
 * @param value - Raw value to normalize
 * @param excellentThreshold - Value at or above this gets 100
 * @param poorThreshold - Value at or below this gets 0
 * @returns Normalized value on 0-100 scale
 *
 * @example
 * // Walk Score thresholds
 * normalizeWithThresholds(90, 80, 30); // Returns 100 (>= 80 is excellent)
 * normalizeWithThresholds(55, 80, 30); // Returns 50 (linear between thresholds)
 * normalizeWithThresholds(20, 80, 30); // Returns 0 (<= 30 is poor)
 */
export function normalizeWithThresholds(
  value: number,
  excellentThreshold: number,
  poorThreshold: number
): number {
  if (value >= excellentThreshold) {
    return 100;
  }

  if (value <= poorThreshold) {
    return 0;
  }

  // Linear interpolation between thresholds
  return ((value - poorThreshold) / (excellentThreshold - poorThreshold)) * 100;
}

/**
 * Clamp a normalized value to valid range
 *
 * @param value - Value to clamp
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (default: 100)
 * @returns Clamped value within range
 */
export function clampNormalized(
  value: number,
  min: number = 0,
  max: number = 100
): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate weighted average of multiple normalized values
 *
 * @param values - Array of {value, weight} objects
 * @returns Weighted average on 0-100 scale
 *
 * @example
 * weightedAverage([
 *   { value: 80, weight: 0.5 },  // 50% weight
 *   { value: 60, weight: 0.3 },  // 30% weight
 *   { value: 40, weight: 0.2 },  // 20% weight
 * ]); // Returns 66 (80*0.5 + 60*0.3 + 40*0.2)
 */
export function weightedAverage(
  values: Array<{ value: number; weight: number }>
): number {
  if (values.length === 0) {
    return 0;
  }

  const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);

  if (totalWeight === 0) {
    return 0;
  }

  const weightedSum = values.reduce(
    (sum, v) => sum + v.value * v.weight,
    0
  );

  return weightedSum / totalWeight;
}

/**
 * Round a score to a specified number of decimal places
 *
 * @param score - Score to round
 * @param decimals - Number of decimal places (default: 1)
 * @returns Rounded score
 */
export function roundScore(score: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(score * factor) / factor;
}
