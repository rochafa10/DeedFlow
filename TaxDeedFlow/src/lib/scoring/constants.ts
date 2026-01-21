/**
 * Scoring System Constants
 *
 * This file contains all constants, thresholds, and configuration values
 * for the 125-point property investment scoring system.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type { CategoryId, GradeLevel, ConfidenceLabel } from '@/types/scoring';

// ============================================
// Grade Threshold Configuration
// ============================================

/**
 * Grade threshold configuration
 * Defines the minimum percentage and points required for each grade level
 *
 * Grade Calculation Formula: percentage = (score / 125) * 100
 *
 * Example calculations:
 * - 100 points = (100/125)*100 = 80% = Grade A-
 * - 75 points = (75/125)*100 = 60% = Grade B-
 * - 50 points = (50/125)*100 = 40% = Grade C-
 * - 25 points = (25/125)*100 = 20% = Grade D-
 */
export const GRADE_THRESHOLDS: Record<
  GradeLevel,
  {
    /** Minimum percentage required for this grade */
    minPercent: number;
    /** Minimum points required for this grade */
    minPoints: number;
    /** Human-readable description of the grade */
    description: string;
  }
> = {
  A: {
    minPercent: 80,
    minPoints: 100,
    description: 'Excellent investment opportunity',
  },
  B: {
    minPercent: 60,
    minPoints: 75,
    description: 'Good investment with minor concerns',
  },
  C: {
    minPercent: 40,
    minPoints: 50,
    description: 'Average investment, proceed with caution',
  },
  D: {
    minPercent: 20,
    minPoints: 25,
    description: 'Below average, significant concerns',
  },
  F: {
    minPercent: 0,
    minPoints: 0,
    description: 'Poor investment, not recommended',
  },
} as const;

// ============================================
// Core Scoring System Constants
// ============================================

/**
 * Core scoring system constants
 * Defines the fundamental structure of the 125-point scoring system
 *
 * Structure:
 * - 5 Categories x 25 points each = 125 total
 * - 5 Components per category x 5 points each = 25 per category
 */
export const SCORING_CONSTANTS = {
  /** Maximum total score (sum of all 5 categories) */
  MAX_TOTAL_SCORE: 125,
  /** Maximum category score (sum of 5 components) */
  MAX_CATEGORY_SCORE: 25,
  /** Maximum component score (individual component) */
  MAX_COMPONENT_SCORE: 5,
  /** Number of scoring categories */
  CATEGORY_COUNT: 5,
  /** Number of components per category */
  COMPONENTS_PER_CATEGORY: 5,
  /** Current scoring algorithm version */
  SCORING_VERSION: '1.0.0',
} as const;

// ============================================
// Confidence Threshold Configuration
// ============================================

/**
 * Confidence level thresholds
 * Maps numerical confidence scores to human-readable labels
 */
export const CONFIDENCE_THRESHOLDS: Record<
  string,
  {
    /** Minimum confidence percentage for this level */
    min: number;
    /** Human-readable label */
    label: ConfidenceLabel;
  }
> = {
  VERY_HIGH: { min: 90, label: 'Very High' },
  HIGH: { min: 75, label: 'High' },
  MODERATE: { min: 50, label: 'Moderate' },
  LOW: { min: 25, label: 'Low' },
  VERY_LOW: { min: 0, label: 'Very Low' },
} as const;

// ============================================
// Category ID Constants
// ============================================

/**
 * Category ID constants for type-safe references
 * Use these instead of string literals for better type safety
 */
export const CATEGORY_IDS: Record<string, CategoryId> = {
  LOCATION: 'location',
  RISK: 'risk',
  FINANCIAL: 'financial',
  MARKET: 'market',
  PROFIT: 'profit',
} as const;

// ============================================
// Category Configuration
// ============================================

/**
 * Category configuration with display names and descriptions
 * Maps category IDs to their human-readable metadata
 */
export const CATEGORY_CONFIG: Record<
  CategoryId,
  {
    /** Display name for the category */
    name: string;
    /** Short description of what the category measures */
    description: string;
    /** Weight as a fraction of total (always 0.2 for equal weighting) */
    weight: number;
  }
> = {
  location: {
    name: 'Location',
    description: 'Neighborhood quality, accessibility, and amenities',
    weight: 0.2,
  },
  risk: {
    name: 'Risk Assessment',
    description: 'Natural hazards, environmental, and title concerns',
    weight: 0.2,
  },
  financial: {
    name: 'Financial Analysis',
    description: 'Tax efficiency, liens, and holding costs',
    weight: 0.2,
  },
  market: {
    name: 'Market Analysis',
    description: 'Supply/demand dynamics and appreciation trends',
    weight: 0.2,
  },
  profit: {
    name: 'Profit Potential',
    description: 'ROI, cash flow, and exit strategy viability',
    weight: 0.2,
  },
} as const;

// ============================================
// Grade Modifier Thresholds
// ============================================

/**
 * Grade modifier thresholds
 * Determines when to apply +, -, or no modifier within a grade
 *
 * Position within grade range:
 * - >= 75%: + modifier (e.g., A+)
 * - >= 35%: no modifier (e.g., A)
 * - < 35%: - modifier (e.g., A-)
 */
export const GRADE_MODIFIER_THRESHOLDS = {
  /** Threshold for + modifier (top 25% of grade range) */
  PLUS_THRESHOLD: 0.75,
  /** Threshold for no modifier (middle portion) */
  NEUTRAL_THRESHOLD: 0.35,
  // Below NEUTRAL_THRESHOLD gets - modifier
} as const;

// ============================================
// Data Quality Weights
// ============================================

/**
 * Data quality weights for completeness calculation
 * Critical fields have higher weight than optional fields
 */
export const DATA_QUALITY_WEIGHTS = {
  /** Weight for critical fields (60% of completeness score) */
  CRITICAL_WEIGHT: 0.6,
  /** Weight for optional fields (40% of completeness score) */
  OPTIONAL_WEIGHT: 0.4,
} as const;

// ============================================
// Missing Data Default Scores
// ============================================

/**
 * Default scores to use when data is missing
 * Based on the MissingDataStrategy type
 */
export const MISSING_DATA_DEFAULTS = {
  /** Neutral strategy: middle score */
  NEUTRAL: 2.5,
  /** Conservative strategy: lower score */
  CONSERVATIVE: 1.5,
  /** Optimistic strategy: higher score */
  OPTIMISTIC: 3.5,
} as const;

// ============================================
// Component Score Ranges
// ============================================

/**
 * Component score interpretation ranges
 * Maps score values to qualitative assessments
 */
export const COMPONENT_SCORE_RANGES = {
  /** Excellent score range */
  EXCELLENT: { min: 4.5, max: 5.0, label: 'Excellent' },
  /** Good score range */
  GOOD: { min: 3.5, max: 4.49, label: 'Good' },
  /** Average score range */
  AVERAGE: { min: 2.5, max: 3.49, label: 'Average' },
  /** Below average score range */
  BELOW_AVERAGE: { min: 1.5, max: 2.49, label: 'Below Average' },
  /** Poor score range */
  POOR: { min: 0, max: 1.49, label: 'Poor' },
} as const;

// ============================================
// Validation Constants
// ============================================

/**
 * Validation constants for score bounds checking
 */
export const VALIDATION = {
  /** Minimum valid score */
  MIN_SCORE: 0,
  /** Maximum valid component score */
  MAX_COMPONENT_SCORE: 5,
  /** Maximum valid category score */
  MAX_CATEGORY_SCORE: 25,
  /** Maximum valid total score */
  MAX_TOTAL_SCORE: 125,
  /** Maximum valid percentage */
  MAX_PERCENTAGE: 100,
  /** Minimum valid percentage */
  MIN_PERCENTAGE: 0,
} as const;
