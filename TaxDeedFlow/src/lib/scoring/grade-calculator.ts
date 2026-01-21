/**
 * Grade Calculation Functions
 *
 * This file contains functions for calculating grades from scores.
 * The grade calculation uses a percentage-based system where:
 *
 * FORMULA: percentage = (score / 125) * 100
 *
 * This formula is critical and must be used consistently across all phases.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type { GradeLevel, GradeResult, GradeWithModifier } from '@/types/scoring';
import {
  GRADE_THRESHOLDS,
  SCORING_CONSTANTS,
  GRADE_MODIFIER_THRESHOLDS,
} from './constants';

/**
 * Calculate grade from total score
 *
 * IMPORTANT: Percentage is calculated as (score / 125) * 100
 * This formula must be used consistently across all phases.
 *
 * @param totalScore - Score out of 125 points (0-125)
 * @returns GradeResult with grade, modifier, percentage, and description
 *
 * @example
 * // 100 points = 80% = Grade A-
 * const result = calculateGrade(100);
 * // result.grade = 'A'
 * // result.gradeWithModifier = 'A-'
 * // result.percentage = 80
 *
 * @example
 * // 75 points = 60% = Grade B-
 * const result = calculateGrade(75);
 * // result.grade = 'B'
 * // result.gradeWithModifier = 'B-'
 * // result.percentage = 60
 */
export function calculateGrade(totalScore: number): GradeResult {
  // Clamp score to valid range
  const clampedScore = Math.max(
    0,
    Math.min(totalScore, SCORING_CONSTANTS.MAX_TOTAL_SCORE)
  );

  // CRITICAL: Use this exact formula for percentage calculation
  // percentage = (score / 125) * 100
  const percentage =
    (clampedScore / SCORING_CONSTANTS.MAX_TOTAL_SCORE) * 100;

  let grade: GradeLevel;
  let thresholdMet: number;
  let description: string;

  // Determine grade based on percentage thresholds
  if (percentage >= GRADE_THRESHOLDS.A.minPercent) {
    grade = 'A';
    thresholdMet = GRADE_THRESHOLDS.A.minPoints;
    description = GRADE_THRESHOLDS.A.description;
  } else if (percentage >= GRADE_THRESHOLDS.B.minPercent) {
    grade = 'B';
    thresholdMet = GRADE_THRESHOLDS.B.minPoints;
    description = GRADE_THRESHOLDS.B.description;
  } else if (percentage >= GRADE_THRESHOLDS.C.minPercent) {
    grade = 'C';
    thresholdMet = GRADE_THRESHOLDS.C.minPoints;
    description = GRADE_THRESHOLDS.C.description;
  } else if (percentage >= GRADE_THRESHOLDS.D.minPercent) {
    grade = 'D';
    thresholdMet = GRADE_THRESHOLDS.D.minPoints;
    description = GRADE_THRESHOLDS.D.description;
  } else {
    grade = 'F';
    thresholdMet = GRADE_THRESHOLDS.F.minPoints;
    description = GRADE_THRESHOLDS.F.description;
  }

  // Calculate grade modifier (+, -, or none)
  const gradeWithModifier = calculateGradeModifier(grade, percentage);

  return {
    grade,
    gradeWithModifier,
    percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal place
    thresholdMet,
    description,
  };
}

/**
 * Calculate grade modifier (+, -, or none) based on position within grade range
 *
 * The modifier is determined by where the percentage falls within its grade range:
 * - Position >= 75% of range: + modifier (top quarter)
 * - Position >= 35% of range: no modifier (middle portion)
 * - Position < 35% of range: - modifier (bottom portion)
 *
 * @param grade - The base grade level (A, B, C, D, F)
 * @param percentage - The calculated percentage (0-100)
 * @returns Grade with modifier (e.g., 'A+', 'A', 'A-')
 *
 * @example
 * // 95% is in the top quarter of A range (80-100)
 * calculateGradeModifier('A', 95); // Returns 'A+'
 *
 * @example
 * // 85% is in the middle of A range
 * calculateGradeModifier('A', 85); // Returns 'A'
 *
 * @example
 * // 81% is in the bottom quarter of A range
 * calculateGradeModifier('A', 81); // Returns 'A-'
 */
export function calculateGradeModifier(
  grade: GradeLevel,
  percentage: number
): GradeWithModifier {
  // F grade has no modifier
  if (grade === 'F') {
    return 'F';
  }

  // Get the percentage range for this grade
  const gradeStart = GRADE_THRESHOLDS[grade].minPercent;
  // Each grade spans 20 percentage points (except A which goes to 100)
  const gradeEnd = grade === 'A' ? 100 : gradeStart + 20;
  const gradeRange = gradeEnd - gradeStart;

  // Calculate position within the grade range (0 to 1)
  const positionInGrade = percentage - gradeStart;
  const normalizedPosition = positionInGrade / gradeRange;

  // Determine modifier based on position
  // Top 25%: + modifier
  // Middle 40%: no modifier
  // Bottom 35%: - modifier
  if (normalizedPosition >= GRADE_MODIFIER_THRESHOLDS.PLUS_THRESHOLD) {
    return `${grade}+` as GradeWithModifier;
  } else if (normalizedPosition >= GRADE_MODIFIER_THRESHOLDS.NEUTRAL_THRESHOLD) {
    return grade;
  } else {
    return `${grade}-` as GradeWithModifier;
  }
}

/**
 * Get the points required for a specific grade
 *
 * @param grade - The target grade level
 * @returns Minimum points required for that grade
 *
 * @example
 * getPointsForGrade('A'); // Returns 100
 * getPointsForGrade('B'); // Returns 75
 */
export function getPointsForGrade(grade: GradeLevel): number {
  return GRADE_THRESHOLDS[grade].minPoints;
}

/**
 * Get the percentage required for a specific grade
 *
 * @param grade - The target grade level
 * @returns Minimum percentage required for that grade
 *
 * @example
 * getPercentageForGrade('A'); // Returns 80
 * getPercentageForGrade('B'); // Returns 60
 */
export function getPercentageForGrade(grade: GradeLevel): number {
  return GRADE_THRESHOLDS[grade].minPercent;
}

/**
 * Convert a score to a percentage
 * Uses the standard formula: percentage = (score / 125) * 100
 *
 * @param score - Raw score (0-125)
 * @returns Percentage (0-100)
 *
 * @example
 * scoreToPercentage(100); // Returns 80
 * scoreToPercentage(62.5); // Returns 50
 */
export function scoreToPercentage(score: number): number {
  const clampedScore = Math.max(
    0,
    Math.min(score, SCORING_CONSTANTS.MAX_TOTAL_SCORE)
  );
  return (clampedScore / SCORING_CONSTANTS.MAX_TOTAL_SCORE) * 100;
}

/**
 * Convert a percentage to a score
 * Inverse of scoreToPercentage: score = (percentage / 100) * 125
 *
 * @param percentage - Percentage (0-100)
 * @returns Raw score (0-125)
 *
 * @example
 * percentageToScore(80); // Returns 100
 * percentageToScore(50); // Returns 62.5
 */
export function percentageToScore(percentage: number): number {
  const clampedPercentage = Math.max(0, Math.min(percentage, 100));
  return (clampedPercentage / 100) * SCORING_CONSTANTS.MAX_TOTAL_SCORE;
}

/**
 * Validate that a score is within valid bounds
 *
 * @param score - Score to validate
 * @returns True if score is valid (0-125)
 *
 * @example
 * isValidScore(100); // Returns true
 * isValidScore(-5); // Returns false
 * isValidScore(150); // Returns false
 */
export function isValidScore(score: number): boolean {
  return (
    typeof score === 'number' &&
    !isNaN(score) &&
    score >= 0 &&
    score <= SCORING_CONSTANTS.MAX_TOTAL_SCORE
  );
}

/**
 * Get a human-readable description of a score
 *
 * @param score - Score to describe (0-125)
 * @returns Human-readable description
 *
 * @example
 * describeScore(110); // Returns "Excellent investment opportunity (Grade A)"
 */
export function describeScore(score: number): string {
  const gradeResult = calculateGrade(score);
  return `${gradeResult.description} (Grade ${gradeResult.gradeWithModifier})`;
}

/**
 * Calculate how many points are needed to reach the next grade
 *
 * @param currentScore - Current score (0-125)
 * @returns Points needed for next grade, or 0 if already at A
 *
 * @example
 * pointsToNextGrade(70); // Returns 5 (need 75 for B)
 * pointsToNextGrade(95); // Returns 5 (need 100 for A)
 * pointsToNextGrade(100); // Returns 0 (already at A)
 */
export function pointsToNextGrade(currentScore: number): number {
  const { grade } = calculateGrade(currentScore);

  // Already at A, no next grade
  if (grade === 'A') {
    return 0;
  }

  // Get the next grade threshold
  const gradeOrder: GradeLevel[] = ['F', 'D', 'C', 'B', 'A'];
  const currentIndex = gradeOrder.indexOf(grade);
  const nextGrade = gradeOrder[currentIndex + 1];

  if (!nextGrade) {
    return 0;
  }

  const nextThreshold = GRADE_THRESHOLDS[nextGrade].minPoints;
  return Math.max(0, nextThreshold - currentScore);
}

/**
 * Get a description for a specific grade level
 *
 * @param grade - The grade level (A, B, C, D, F)
 * @returns Human-readable description of what the grade means
 *
 * @example
 * getGradeDescription('A'); // Returns "Excellent investment opportunity"
 * getGradeDescription('C'); // Returns "Average investment with some concerns"
 */
export function getGradeDescription(grade: GradeLevel): string {
  return GRADE_THRESHOLDS[grade].description;
}
