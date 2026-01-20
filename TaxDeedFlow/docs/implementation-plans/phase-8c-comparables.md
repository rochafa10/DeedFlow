# Phase 8c: Comparable Property Analysis

## Overview

This document provides a complete, standalone implementation plan for the Comparable Property Analysis module. This module analyzes recent property sales to estimate the After Repair Value (ARV) for tax deed properties, enabling accurate investment calculations and bid strategies.

## Purpose

The comparables analysis system:
1. **Fetches comparable sales** from external APIs (Realtor.com, Zillow)
2. **Calculates similarity scores** between subject and comparable properties
3. **Applies price adjustments** for property differences
4. **Estimates ARV** using weighted averages
5. **Provides confidence levels** based on data quality

## Dependencies

- Phase 1: Database Schema (`comparable_sales` table)
- Phase 2: API Integration (Realtor.com, Zillow for comparables data)
- Phase 6: Scoring Algorithm (financial score integration)

---

## TypeScript Interfaces

### Core Comparables Types

```typescript
// src/lib/analysis/financial/types/comparables.ts

/**
 * Analysis result for comparable sales
 */
export interface ComparablesAnalysis {
  /** Array of comparable properties with adjustments */
  comparables: ComparableSale[];
  /** Summary statistics */
  summary: ComparablesSummary;
  /** Adjusted value estimate for subject property */
  adjustedValue: number;
  /** Confidence level based on data quality */
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Summary statistics for comparable sales
 */
export interface ComparablesSummary {
  /** Total number of comparables */
  count: number;
  /** Average sale price */
  avgSalePrice: number;
  /** Median sale price */
  medianSalePrice: number;
  /** Average price per square foot */
  avgPricePerSqft: number;
  /** Average days on market */
  avgDaysOnMarket: number;
  /** Price range */
  priceRange: { low: number; high: number };
}

/**
 * Individual comparable sale property
 */
export interface ComparableSale {
  /** Unique identifier */
  id: string;
  /** Street address */
  address: string;
  /** City */
  city: string;
  /** State code */
  state: string;
  /** ZIP code */
  zip: string;
  /** Sale price */
  salePrice: number;
  /** Date of sale */
  saleDate: string;
  /** Living area in square feet */
  sqft: number;
  /** Lot size in square feet */
  lotSizeSqft: number;
  /** Number of bedrooms */
  bedrooms: number;
  /** Number of bathrooms */
  bathrooms: number;
  /** Year built */
  yearBuilt: number;
  /** Property type (single_family, condo, etc.) */
  propertyType: string;
  /** Calculated price per square foot */
  pricePerSqft: number;
  /** Distance from subject property in miles */
  distanceMiles: number;
  /** Days on market before sale */
  daysOnMarket: number;
  /** Similarity score (0-100) */
  similarityScore: number;
  /** Price adjustments applied */
  adjustments: PriceAdjustments;
  /** Sale price after adjustments */
  adjustedPrice: number;
  /** Data source */
  source: 'realtor' | 'zillow' | 'manual' | 'mls';
}

/**
 * Price adjustments applied to comparable properties
 */
export interface PriceAdjustments {
  // Physical characteristics
  sqftAdjustment: number;
  lotSizeAdjustment: number;
  bedroomAdjustment: number;
  bathroomAdjustment: number;
  ageAdjustment: number;
  conditionAdjustment: number;

  // Location factors
  locationAdjustment: number;
  schoolDistrictAdjustment: number;
  neighborhoodAdjustment: number;

  // Property features
  garageAdjustment: number;
  basementAdjustment: number;
  poolAdjustment: number;
  viewAdjustment: number;
  updatesAdjustment: number;

  // Market timing
  marketConditionAdjustment: number;
  timeAdjustment: number;

  /** Sum of all adjustments */
  totalAdjustment: number;
}

/**
 * Subject property for comparison
 */
export interface SubjectProperty {
  address: string;
  latitude: number;
  longitude: number;
  sqft: number;
  lotSizeSqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  propertyType: string;
}

/**
 * Extended subject property with additional attributes
 */
export interface ExtendedSubjectProperty extends SubjectProperty {
  schoolRating?: number;
  neighborhoodTier?: 'A' | 'B' | 'C' | 'D' | 'F';
  garageType?: GarageType;
  basementType?: BasementType;
  poolType?: PoolType;
  viewType?: ViewType;
  updates?: PropertyUpdates;
  isHotMarket?: boolean;
  isColdClimate?: boolean;
  hoaMonthlyFee?: number;
}

/**
 * Extended comparable with additional attributes
 */
export interface ExtendedComparable extends ComparableSale {
  schoolRating?: number;
  neighborhoodTier?: 'A' | 'B' | 'C' | 'D' | 'F';
  garageType?: GarageType;
  basementType?: BasementType;
  poolType?: PoolType;
  viewType?: ViewType;
  updates?: PropertyUpdates;
  hoaMonthlyFee?: number;
}

/**
 * Property updates tracking
 */
export interface PropertyUpdates {
  kitchen?: 'full' | 'partial' | 'none';
  bathroom?: 'full' | 'partial' | 'none';
  hvac?: boolean;
  roof?: boolean;
  windows?: boolean;
  flooring?: boolean;
  electrical?: boolean;
  plumbing?: boolean;
  yearUpdated?: number;
}

// Type aliases for amenity categories
export type GarageType = 'attached1Car' | 'attached2Car' | 'attached3Car' |
                         'detached1Car' | 'detached2Car' | 'carport' | 'none';
export type BasementType = 'finishedFull' | 'finishedPartial' | 'unfinishedFull' |
                           'unfinishedPartial' | 'crawlspace' | 'slab' | 'walkout';
export type PoolType = 'ingroundHeated' | 'inground' | 'aboveground' | 'none';
export type ViewType = 'waterfront' | 'waterView' | 'mountainView' | 'golfCourse' |
                       'cityView' | 'parkView' | 'standard' | 'obstructed' | 'commercial';
```

### ARV Calculation Types

```typescript
// src/lib/analysis/financial/types/arv.ts

/**
 * ARV calculation result
 */
export interface ARVCalculation {
  /** Estimated After Repair Value */
  estimatedARV: number;
  /** Confidence level */
  arvConfidence: 'low' | 'medium' | 'high';
  /** Value range (low, mid, high) */
  arvRange: ARVRange;
  /** Conservative projected sale price */
  projectedSalePrice: number;
  /** Net proceeds after selling costs */
  netProceeds: number;
}

/**
 * ARV value range
 */
export interface ARVRange {
  low: number;
  mid: number;
  high: number;
}

/**
 * Comparables fetch options
 */
export interface ComparablesFetchOptions {
  /** Search radius in miles */
  radiusMiles?: number;
  /** Maximum results to return */
  maxResults?: number;
  /** Maximum age of sales in days */
  maxAgeDays?: number;
  /** Property types to include */
  propertyTypes?: string[];
  /** Minimum similarity score */
  minSimilarity?: number;
}

/**
 * Comparable selection criteria
 */
export interface ComparableSelectionCriteria {
  /** Maximum distance in miles */
  maxDistance: number;
  /** Maximum square footage difference percentage */
  maxSizeDiffPct: number;
  /** Maximum bedroom difference */
  maxBedroomDiff: number;
  /** Maximum bathroom difference */
  maxBathroomDiff: number;
  /** Maximum age difference in years */
  maxAgeDiff: number;
  /** Maximum sale age in days */
  maxSaleAgeDays: number;
  /** Minimum similarity score to include */
  minSimilarityScore: number;
}
```

---

## Adjustment Values Configuration

```typescript
// src/lib/analysis/financial/config/adjustmentValues.ts

/**
 * Comprehensive adjustment values per unit
 * These values are used to adjust comparable sale prices
 * to account for differences from the subject property
 */
export const ADJUSTMENT_VALUES = {
  // Core property adjustments
  sqftPerUnit: 50,              // $50 per sqft difference
  lotSizePerSqft: 2,            // $2 per lot sqft difference
  bedroomEach: 5000,            // $5,000 per bedroom
  bathroomEach: 3500,           // $3,500 per bathroom
  halfBathEach: 2000,           // $2,000 per half bath
  agePerYear: 500,              // $500 per year of age difference
  conditionMultiplier: 0.05,    // 5% per condition grade difference
  locationMultiplier: 0.03,     // 3% per location tier difference

  // Location and neighborhood adjustments
  schoolDistrictRating: {
    perPoint: 3000,             // $3,000 per rating point (1-10 scale)
    premiumThreshold: 8,        // Ratings 8+ get premium multiplier
    premiumMultiplier: 1.5,     // 50% bonus for top schools
  },
  neighborhoodTiers: {
    'A': 0.15,                  // +15% for A-tier neighborhoods
    'B': 0.05,                  // +5% for B-tier neighborhoods
    'C': 0,                     // Baseline for C-tier
    'D': -0.10,                 // -10% for D-tier
    'F': -0.20,                 // -20% for F-tier
  } as const,

  // Amenity adjustments - Garage
  garage: {
    attached1Car: 8000,
    attached2Car: 15000,
    attached3Car: 22000,
    detached1Car: 5000,
    detached2Car: 10000,
    carport: 3000,
    none: 0,
  } as const,

  // Amenity adjustments - Basement
  basement: {
    finishedFull: 20000,
    finishedPartial: 12000,
    unfinishedFull: 8000,
    unfinishedPartial: 4000,
    crawlspace: 0,
    slab: -2000,
    walkout: 5000,              // Bonus (add to base)
  } as const,

  // Amenity adjustments - Pool
  pool: {
    ingroundHeated: 25000,
    inground: 18000,
    aboveground: 3000,
    none: 0,
    coldClimateMultiplier: -0.5, // Reduces value in cold markets
  } as const,

  // Amenity adjustments - View
  view: {
    waterfront: 50000,
    waterView: 25000,
    mountainView: 15000,
    golfCourse: 12000,
    cityView: 8000,
    parkView: 5000,
    standard: 0,
    obstructed: -5000,
    commercial: -10000,
  } as const,

  // Updates and renovations
  updates: {
    kitchenFull: 25000,
    kitchenPartial: 12000,
    bathroomFull: 15000,
    bathroomPartial: 7500,
    hvacNew: 8000,
    roofNew: 10000,
    windowsNew: 8000,
    flooringNew: 6000,
    electricalUpdated: 5000,
    plumbingUpdated: 5000,
    exteriorPaint: 3000,
    landscaping: 4000,
    depreciationRate: 0.05,     // 5% per year depreciation on updates
  } as const,

  // Market condition adjustments
  marketCondition: {
    perMonthAppreciation: 0.004, // 0.4% per month market appreciation
    maxMonthsBack: 12,          // Only adjust for sales up to 12 months old
    hotMarketMultiplier: 1.5,   // Multiplier in hot markets
    coldMarketMultiplier: 0.5,  // Multiplier in cold markets
  } as const,

  // Time/sale recency adjustments
  time: {
    sameMonth: 0,
    per30Days: 0.004,           // 0.4% appreciation per 30 days
    staleThresholdDays: 180,    // Sales older than 6 months get extra scrutiny
    staleDiscountPct: 0.02,     // 2% additional discount for stale sales
    maxAdjustmentPct: 0.10,     // Cap time adjustment at 10%
  } as const,

  // Additional features
  fireplace: 3000,
  centralAir: 5000,
  deck: 4000,
  fence: 2500,
  sprinklerSystem: 3000,
  securitySystem: 2000,
  solarPanels: {
    owned: 15000,
    leased: 0,
  } as const,
  hoaAdjustment: -100,          // Per $1 monthly HOA fee
} as const;

export type AdjustmentValues = typeof ADJUSTMENT_VALUES;
```

---

## Comparable Selection and Filtering Logic

```typescript
// src/lib/analysis/financial/comparablesSelection.ts

import { ComparableSale, SubjectProperty, ComparableSelectionCriteria } from './types';

/**
 * Default selection criteria for comparables
 */
export const DEFAULT_SELECTION_CRITERIA: ComparableSelectionCriteria = {
  maxDistance: 2.0,             // 2 miles
  maxSizeDiffPct: 0.30,         // 30% size difference
  maxBedroomDiff: 2,            // 2 bedrooms
  maxBathroomDiff: 1.5,         // 1.5 bathrooms
  maxAgeDiff: 20,               // 20 years
  maxSaleAgeDays: 365,          // 1 year
  minSimilarityScore: 40,       // Minimum 40% similarity
};

/**
 * Filter comparables based on selection criteria
 */
export function filterComparables(
  comparables: ComparableSale[],
  subject: SubjectProperty,
  criteria: Partial<ComparableSelectionCriteria> = {}
): ComparableSale[] {
  const c = { ...DEFAULT_SELECTION_CRITERIA, ...criteria };

  return comparables.filter(comp => {
    // Distance check
    if (comp.distanceMiles > c.maxDistance) return false;

    // Size difference check
    const sizeDiff = Math.abs(subject.sqft - comp.sqft) / subject.sqft;
    if (sizeDiff > c.maxSizeDiffPct) return false;

    // Bedroom difference check
    if (Math.abs(subject.bedrooms - comp.bedrooms) > c.maxBedroomDiff) return false;

    // Bathroom difference check
    if (Math.abs(subject.bathrooms - comp.bathrooms) > c.maxBathroomDiff) return false;

    // Age difference check
    const ageDiff = Math.abs(subject.yearBuilt - comp.yearBuilt);
    if (ageDiff > c.maxAgeDiff) return false;

    // Sale recency check
    const saleDate = new Date(comp.saleDate);
    const daysSinceSale = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceSale > c.maxSaleAgeDays) return false;

    // Property type match (flexible)
    if (comp.propertyType !== subject.propertyType) {
      // Allow similar types
      const compatibleTypes = getCompatiblePropertyTypes(subject.propertyType);
      if (!compatibleTypes.includes(comp.propertyType)) return false;
    }

    return true;
  });
}

/**
 * Get compatible property types for matching
 */
function getCompatiblePropertyTypes(propertyType: string): string[] {
  const typeGroups: Record<string, string[]> = {
    single_family: ['single_family', 'detached'],
    condo: ['condo', 'condominium', 'apartment'],
    townhouse: ['townhouse', 'townhome', 'row_house'],
    multi_family: ['multi_family', 'duplex', 'triplex', 'fourplex'],
    mobile: ['mobile', 'manufactured', 'modular'],
  };

  // Find the group this type belongs to
  for (const [group, types] of Object.entries(typeGroups)) {
    if (types.includes(propertyType.toLowerCase())) {
      return types;
    }
  }

  return [propertyType];
}

/**
 * Rank comparables by relevance to subject property
 */
export function rankComparables(
  comparables: ComparableSale[],
  subject: SubjectProperty
): ComparableSale[] {
  // Calculate composite ranking score for each comparable
  const rankedComps = comparables.map(comp => {
    let rankScore = comp.similarityScore * 0.4; // 40% weight on similarity

    // Distance bonus (closer = better)
    if (comp.distanceMiles < 0.5) rankScore += 20;
    else if (comp.distanceMiles < 1.0) rankScore += 15;
    else if (comp.distanceMiles < 1.5) rankScore += 10;

    // Recency bonus (more recent = better)
    const saleDate = new Date(comp.saleDate);
    const monthsAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo < 3) rankScore += 15;
    else if (monthsAgo < 6) rankScore += 10;
    else if (monthsAgo < 9) rankScore += 5;

    // Size similarity bonus
    const sizeDiff = Math.abs(subject.sqft - comp.sqft) / subject.sqft;
    if (sizeDiff < 0.05) rankScore += 10;
    else if (sizeDiff < 0.10) rankScore += 7;
    else if (sizeDiff < 0.15) rankScore += 4;

    return { ...comp, _rankScore: rankScore };
  });

  // Sort by rank score descending
  return rankedComps
    .sort((a, b) => b._rankScore - a._rankScore)
    .map(({ _rankScore, ...comp }) => comp);
}

/**
 * Select optimal comparables for ARV calculation
 */
export function selectOptimalComparables(
  comparables: ComparableSale[],
  subject: SubjectProperty,
  targetCount: number = 5
): ComparableSale[] {
  // First filter by criteria
  const filtered = filterComparables(comparables, subject);

  // Then rank by relevance
  const ranked = rankComparables(filtered, subject);

  // Return top N
  return ranked.slice(0, targetCount);
}
```

---

## Similarity Score Calculation

```typescript
// src/lib/analysis/financial/similarityScore.ts

import { ComparableSale, SubjectProperty } from './types';

/**
 * Calculate similarity score between subject and comparable
 * Returns a score from 0-100
 */
export function calculateSimilarityScore(
  comp: ComparableSale,
  subject: SubjectProperty
): number {
  let score = 100;

  // ============================================
  // DISTANCE PENALTY (0-20 points)
  // ============================================
  if (comp.distanceMiles > 2) {
    score -= 20;
  } else if (comp.distanceMiles > 1) {
    score -= 10;
  } else if (comp.distanceMiles > 0.5) {
    score -= 5;
  }

  // ============================================
  // SIZE DIFFERENCE PENALTY (0-25 points)
  // ============================================
  const sizeDiffPct = Math.abs(subject.sqft - comp.sqft) / subject.sqft;
  if (sizeDiffPct > 0.3) {
    score -= 25;
  } else if (sizeDiffPct > 0.2) {
    score -= 15;
  } else if (sizeDiffPct > 0.1) {
    score -= 8;
  }

  // ============================================
  // BEDROOM DIFFERENCE PENALTY (0-15 points)
  // ============================================
  const bedDiff = Math.abs(subject.bedrooms - comp.bedrooms);
  score -= Math.min(bedDiff * 5, 15);

  // ============================================
  // BATHROOM DIFFERENCE PENALTY (0-10 points)
  // ============================================
  const bathDiff = Math.abs(subject.bathrooms - comp.bathrooms);
  score -= Math.min(bathDiff * 5, 10);

  // ============================================
  // AGE DIFFERENCE PENALTY (0-15 points)
  // ============================================
  const ageDiff = Math.abs(subject.yearBuilt - comp.yearBuilt);
  if (ageDiff > 20) {
    score -= 15;
  } else if (ageDiff > 10) {
    score -= 8;
  } else if (ageDiff > 5) {
    score -= 4;
  }

  // ============================================
  // SALE RECENCY BONUS/PENALTY (-15 to +5 points)
  // ============================================
  const saleDate = new Date(comp.saleDate);
  const monthsAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsAgo > 12) {
    score -= 15;
  } else if (monthsAgo > 6) {
    score -= 8;
  } else if (monthsAgo < 3) {
    score += 5; // Bonus for very recent sales
  }

  // ============================================
  // PROPERTY TYPE MATCH
  // ============================================
  if (comp.propertyType !== subject.propertyType) {
    score -= 10;
  }

  // Ensure score stays within bounds
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate weighted similarity based on multiple factors
 */
export function calculateWeightedSimilarity(
  comp: ComparableSale,
  subject: SubjectProperty,
  weights: SimilarityWeights = DEFAULT_WEIGHTS
): number {
  const scores = {
    distance: calculateDistanceScore(comp.distanceMiles),
    size: calculateSizeScore(subject.sqft, comp.sqft),
    bedrooms: calculateBedroomScore(subject.bedrooms, comp.bedrooms),
    bathrooms: calculateBathroomScore(subject.bathrooms, comp.bathrooms),
    age: calculateAgeScore(subject.yearBuilt, comp.yearBuilt),
    recency: calculateRecencyScore(comp.saleDate),
    type: comp.propertyType === subject.propertyType ? 100 : 70,
  };

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  const weightedScore = Object.entries(scores).reduce((sum, [key, score]) => {
    const weight = weights[key as keyof SimilarityWeights] || 0;
    return sum + (score * weight);
  }, 0);

  return weightedScore / totalWeight;
}

interface SimilarityWeights {
  distance: number;
  size: number;
  bedrooms: number;
  bathrooms: number;
  age: number;
  recency: number;
  type: number;
}

const DEFAULT_WEIGHTS: SimilarityWeights = {
  distance: 20,
  size: 25,
  bedrooms: 15,
  bathrooms: 10,
  age: 10,
  recency: 15,
  type: 5,
};

// Helper functions for individual score components
function calculateDistanceScore(distanceMiles: number): number {
  if (distanceMiles <= 0.25) return 100;
  if (distanceMiles <= 0.5) return 90;
  if (distanceMiles <= 1.0) return 80;
  if (distanceMiles <= 1.5) return 65;
  if (distanceMiles <= 2.0) return 50;
  return Math.max(0, 50 - (distanceMiles - 2) * 20);
}

function calculateSizeScore(subjectSqft: number, compSqft: number): number {
  const diffPct = Math.abs(subjectSqft - compSqft) / subjectSqft;
  if (diffPct <= 0.05) return 100;
  if (diffPct <= 0.10) return 90;
  if (diffPct <= 0.15) return 80;
  if (diffPct <= 0.20) return 65;
  if (diffPct <= 0.30) return 50;
  return Math.max(0, 50 - (diffPct - 0.30) * 200);
}

function calculateBedroomScore(subjectBeds: number, compBeds: number): number {
  const diff = Math.abs(subjectBeds - compBeds);
  if (diff === 0) return 100;
  if (diff === 1) return 80;
  if (diff === 2) return 50;
  return 20;
}

function calculateBathroomScore(subjectBaths: number, compBaths: number): number {
  const diff = Math.abs(subjectBaths - compBaths);
  if (diff <= 0.5) return 100;
  if (diff <= 1.0) return 80;
  if (diff <= 1.5) return 60;
  return 30;
}

function calculateAgeScore(subjectYear: number, compYear: number): number {
  const diff = Math.abs(subjectYear - compYear);
  if (diff <= 3) return 100;
  if (diff <= 7) return 85;
  if (diff <= 12) return 70;
  if (diff <= 20) return 50;
  return 30;
}

function calculateRecencyScore(saleDate: string): number {
  const months = (Date.now() - new Date(saleDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (months <= 3) return 100;
  if (months <= 6) return 85;
  if (months <= 9) return 70;
  if (months <= 12) return 55;
  return Math.max(20, 55 - (months - 12) * 3);
}
```

---

## Price Adjustment Functions

```typescript
// src/lib/analysis/financial/priceAdjustments.ts

import {
  ComparableSale,
  ExtendedComparable,
  SubjectProperty,
  ExtendedSubjectProperty,
  PriceAdjustments
} from './types';
import { ADJUSTMENT_VALUES } from './config/adjustmentValues';
import { calculateSimilarityScore } from './similarityScore';

/**
 * Apply all price adjustments to a comparable property
 */
export function applyAdjustments(
  comp: ComparableSale | ExtendedComparable,
  subject: SubjectProperty | ExtendedSubjectProperty
): ComparableSale {
  const adjustments: PriceAdjustments = {
    sqftAdjustment: 0,
    lotSizeAdjustment: 0,
    bedroomAdjustment: 0,
    bathroomAdjustment: 0,
    ageAdjustment: 0,
    conditionAdjustment: 0,
    locationAdjustment: 0,
    schoolDistrictAdjustment: 0,
    neighborhoodAdjustment: 0,
    garageAdjustment: 0,
    basementAdjustment: 0,
    poolAdjustment: 0,
    viewAdjustment: 0,
    updatesAdjustment: 0,
    marketConditionAdjustment: 0,
    timeAdjustment: 0,
    totalAdjustment: 0,
  };

  const extSubject = subject as ExtendedSubjectProperty;
  const extComp = comp as ExtendedComparable;

  // ============================================
  // CORE PROPERTY ADJUSTMENTS
  // ============================================

  // Square footage adjustment
  const sqftDiff = subject.sqft - comp.sqft;
  adjustments.sqftAdjustment = sqftDiff * ADJUSTMENT_VALUES.sqftPerUnit;

  // Lot size adjustment
  const lotDiff = subject.lotSizeSqft - comp.lotSizeSqft;
  adjustments.lotSizeAdjustment = lotDiff * ADJUSTMENT_VALUES.lotSizePerSqft;

  // Bedroom adjustment
  const bedDiff = subject.bedrooms - comp.bedrooms;
  adjustments.bedroomAdjustment = bedDiff * ADJUSTMENT_VALUES.bedroomEach;

  // Bathroom adjustment
  const bathDiff = subject.bathrooms - comp.bathrooms;
  adjustments.bathroomAdjustment = bathDiff * ADJUSTMENT_VALUES.bathroomEach;

  // Age adjustment (subject is newer = positive adjustment)
  const ageDiff = comp.yearBuilt - subject.yearBuilt;
  adjustments.ageAdjustment = ageDiff * ADJUSTMENT_VALUES.agePerYear;

  // ============================================
  // LOCATION & NEIGHBORHOOD ADJUSTMENTS
  // ============================================

  // Location adjustment based on distance
  if (comp.distanceMiles > 1) {
    adjustments.locationAdjustment =
      -comp.salePrice * ADJUSTMENT_VALUES.locationMultiplier * (comp.distanceMiles - 1);
  }

  // School district adjustment
  if (extSubject.schoolRating !== undefined && extComp.schoolRating !== undefined) {
    const ratingDiff = extSubject.schoolRating - extComp.schoolRating;
    let schoolAdj = ratingDiff * ADJUSTMENT_VALUES.schoolDistrictRating.perPoint;

    // Apply premium multiplier for top schools
    if (extSubject.schoolRating >= ADJUSTMENT_VALUES.schoolDistrictRating.premiumThreshold) {
      schoolAdj *= ADJUSTMENT_VALUES.schoolDistrictRating.premiumMultiplier;
    }
    adjustments.schoolDistrictAdjustment = schoolAdj;
  }

  // Neighborhood tier adjustment
  if (extSubject.neighborhoodTier && extComp.neighborhoodTier) {
    const subjectMultiplier = ADJUSTMENT_VALUES.neighborhoodTiers[extSubject.neighborhoodTier] || 0;
    const compMultiplier = ADJUSTMENT_VALUES.neighborhoodTiers[extComp.neighborhoodTier] || 0;
    adjustments.neighborhoodAdjustment = comp.salePrice * (subjectMultiplier - compMultiplier);
  }

  // ============================================
  // AMENITY ADJUSTMENTS
  // ============================================

  // Garage adjustment
  if (extSubject.garageType && extComp.garageType) {
    const subjectGarage = ADJUSTMENT_VALUES.garage[extSubject.garageType] || 0;
    const compGarage = ADJUSTMENT_VALUES.garage[extComp.garageType] || 0;
    adjustments.garageAdjustment = subjectGarage - compGarage;
  }

  // Basement adjustment
  if (extSubject.basementType && extComp.basementType) {
    const subjectBasement = ADJUSTMENT_VALUES.basement[extSubject.basementType] || 0;
    const compBasement = ADJUSTMENT_VALUES.basement[extComp.basementType] || 0;
    adjustments.basementAdjustment = subjectBasement - compBasement;
  }

  // Pool adjustment (with cold climate consideration)
  if (extSubject.poolType && extComp.poolType) {
    let subjectPool = ADJUSTMENT_VALUES.pool[extSubject.poolType] || 0;
    let compPool = ADJUSTMENT_VALUES.pool[extComp.poolType] || 0;

    // Reduce pool value in cold climates
    if (extSubject.isColdClimate) {
      subjectPool *= ADJUSTMENT_VALUES.pool.coldClimateMultiplier;
      compPool *= ADJUSTMENT_VALUES.pool.coldClimateMultiplier;
    }
    adjustments.poolAdjustment = subjectPool - compPool;
  }

  // View adjustment
  if (extSubject.viewType && extComp.viewType) {
    const subjectView = ADJUSTMENT_VALUES.view[extSubject.viewType] || 0;
    const compView = ADJUSTMENT_VALUES.view[extComp.viewType] || 0;
    adjustments.viewAdjustment = subjectView - compView;
  }

  // ============================================
  // UPDATES & RENOVATION ADJUSTMENTS
  // ============================================

  if (extSubject.updates && extComp.updates) {
    let updateAdj = 0;

    // Kitchen updates
    if (extSubject.updates.kitchen === 'full' && extComp.updates.kitchen !== 'full') {
      updateAdj += ADJUSTMENT_VALUES.updates.kitchenFull;
    } else if (extSubject.updates.kitchen === 'partial' && extComp.updates.kitchen === 'none') {
      updateAdj += ADJUSTMENT_VALUES.updates.kitchenPartial;
    }

    // Bathroom updates
    if (extSubject.updates.bathroom === 'full' && extComp.updates.bathroom !== 'full') {
      updateAdj += ADJUSTMENT_VALUES.updates.bathroomFull;
    } else if (extSubject.updates.bathroom === 'partial' && extComp.updates.bathroom === 'none') {
      updateAdj += ADJUSTMENT_VALUES.updates.bathroomPartial;
    }

    // HVAC
    if (extSubject.updates.hvac && !extComp.updates.hvac) {
      updateAdj += ADJUSTMENT_VALUES.updates.hvacNew;
    }

    // Roof
    if (extSubject.updates.roof && !extComp.updates.roof) {
      updateAdj += ADJUSTMENT_VALUES.updates.roofNew;
    }

    // Apply depreciation if update year is known
    if (extSubject.updates.yearUpdated) {
      const yearsSinceUpdate = new Date().getFullYear() - extSubject.updates.yearUpdated;
      updateAdj *= Math.pow(1 - ADJUSTMENT_VALUES.updates.depreciationRate, yearsSinceUpdate);
    }

    adjustments.updatesAdjustment = updateAdj;
  }

  // ============================================
  // MARKET & TIME ADJUSTMENTS
  // ============================================

  // Time adjustment based on sale date
  const saleDate = new Date(comp.saleDate);
  const daysSinceSale = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceSale > 0) {
    // Calculate appreciation adjustment
    const monthsSinceSale = daysSinceSale / 30;
    let timeAdj = comp.salePrice * ADJUSTMENT_VALUES.time.per30Days * monthsSinceSale;

    // Apply market condition multiplier
    if (extSubject.isHotMarket) {
      timeAdj *= ADJUSTMENT_VALUES.marketCondition.hotMarketMultiplier;
    }

    // Add stale sale discount for old sales
    if (daysSinceSale > ADJUSTMENT_VALUES.time.staleThresholdDays) {
      timeAdj -= comp.salePrice * ADJUSTMENT_VALUES.time.staleDiscountPct;
    }

    // Cap the adjustment
    const maxAdj = comp.salePrice * ADJUSTMENT_VALUES.time.maxAdjustmentPct;
    adjustments.timeAdjustment = Math.min(timeAdj, maxAdj);
    adjustments.marketConditionAdjustment = adjustments.timeAdjustment;
  }

  // ============================================
  // TOTAL ADJUSTMENT CALCULATION
  // ============================================

  adjustments.totalAdjustment =
    adjustments.sqftAdjustment +
    adjustments.lotSizeAdjustment +
    adjustments.bedroomAdjustment +
    adjustments.bathroomAdjustment +
    adjustments.ageAdjustment +
    adjustments.conditionAdjustment +
    adjustments.locationAdjustment +
    adjustments.schoolDistrictAdjustment +
    adjustments.neighborhoodAdjustment +
    adjustments.garageAdjustment +
    adjustments.basementAdjustment +
    adjustments.poolAdjustment +
    adjustments.viewAdjustment +
    adjustments.updatesAdjustment +
    adjustments.timeAdjustment;

  // Adjusted price
  const adjustedPrice = comp.salePrice + adjustments.totalAdjustment;

  // Calculate similarity score
  const similarityScore = calculateSimilarityScore(comp, subject);

  return {
    ...comp,
    adjustments,
    adjustedPrice,
    similarityScore,
  };
}
```

---

## ARV Calculation Functions

```typescript
// src/lib/analysis/financial/arvCalculator.ts

import { ComparableSale, ARVCalculation, ARVRange } from './types';

/**
 * Calculate After Repair Value (ARV) from comparable sales
 */
export function calculateARV(
  comparables: ComparableSale[],
  subjectProperty: { sqft: number; bedrooms: number; bathrooms: number }
): ARVCalculation {
  // Handle empty comparables
  if (comparables.length === 0) {
    return {
      estimatedARV: 0,
      arvConfidence: 'low',
      arvRange: { low: 0, mid: 0, high: 0 },
      projectedSalePrice: 0,
      netProceeds: 0,
    };
  }

  // Use adjusted prices from comparables
  const adjustedPrices = comparables.map(c => c.adjustedPrice);

  // Calculate statistics
  const sorted = [...adjustedPrices].sort((a, b) => a - b);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const mid = adjustedPrices.reduce((a, b) => a + b, 0) / adjustedPrices.length;

  // Calculate weighted ARV using similarity scores
  const weightedSum = comparables.reduce(
    (sum, c) => sum + c.adjustedPrice * c.similarityScore,
    0
  );
  const totalWeight = comparables.reduce((sum, c) => sum + c.similarityScore, 0);
  const weightedARV = totalWeight > 0 ? weightedSum / totalWeight : mid;

  // Determine confidence based on data quality
  const avgSimilarity = totalWeight / comparables.length;
  const priceSpread = (high - low) / mid;
  const confidence = determineARVConfidence(comparables.length, avgSimilarity, priceSpread);

  // Project sale price (conservative: 95% of ARV)
  const projectedSalePrice = weightedARV * 0.95;

  // Net proceeds (after 6% selling costs)
  const netProceeds = projectedSalePrice * 0.94;

  return {
    estimatedARV: weightedARV,
    arvConfidence: confidence,
    arvRange: { low, mid, high },
    projectedSalePrice,
    netProceeds,
  };
}

/**
 * Determine ARV confidence level based on comparables quality
 */
function determineARVConfidence(
  compCount: number,
  avgSimilarity: number,
  priceSpread: number
): 'low' | 'medium' | 'high' {
  // High confidence: 5+ comps, high similarity, tight price range
  if (compCount >= 5 && avgSimilarity > 70 && priceSpread < 0.2) {
    return 'high';
  }

  // Medium confidence: 3+ comps, moderate similarity, reasonable price range
  if (compCount >= 3 && avgSimilarity > 50 && priceSpread < 0.35) {
    return 'medium';
  }

  return 'low';
}

/**
 * Calculate ARV range with statistical methods
 */
export function calculateARVRange(
  comparables: ComparableSale[]
): ARVRange & { standardDeviation: number } {
  if (comparables.length === 0) {
    return { low: 0, mid: 0, high: 0, standardDeviation: 0 };
  }

  const prices = comparables.map(c => c.adjustedPrice);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;

  // Calculate standard deviation
  const squaredDiffs = prices.map(p => Math.pow(p - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  // Use percentiles for range
  const sorted = [...prices].sort((a, b) => a - b);
  const lowIndex = Math.floor(prices.length * 0.1);
  const highIndex = Math.floor(prices.length * 0.9);

  return {
    low: sorted[lowIndex] || sorted[0],
    mid: mean,
    high: sorted[highIndex] || sorted[sorted.length - 1],
    standardDeviation: stdDev,
  };
}

/**
 * Calculate weighted average ARV
 */
export function calculateWeightedARV(
  comparables: ComparableSale[],
  weights?: Record<string, number>
): number {
  if (comparables.length === 0) return 0;

  const defaultWeights = {
    similarityWeight: 0.5,
    recencyWeight: 0.3,
    distanceWeight: 0.2,
  };

  const w = { ...defaultWeights, ...weights };

  // Calculate composite weight for each comparable
  const weightedComps = comparables.map(comp => {
    const saleDate = new Date(comp.saleDate);
    const monthsAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    // Recency score (0-100): More recent = higher score
    const recencyScore = Math.max(0, 100 - monthsAgo * 8);

    // Distance score (0-100): Closer = higher score
    const distanceScore = Math.max(0, 100 - comp.distanceMiles * 40);

    // Composite weight
    const compositeWeight =
      comp.similarityScore * w.similarityWeight +
      recencyScore * w.recencyWeight +
      distanceScore * w.distanceWeight;

    return {
      ...comp,
      compositeWeight,
    };
  });

  // Calculate weighted average
  const totalWeight = weightedComps.reduce((sum, c) => sum + c.compositeWeight, 0);
  const weightedSum = weightedComps.reduce(
    (sum, c) => sum + c.adjustedPrice * c.compositeWeight,
    0
  );

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Validate ARV calculation
 */
export function validateARV(
  arv: number,
  comparables: ComparableSale[]
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check if ARV is reasonable
  if (arv <= 0) {
    return { isValid: false, warnings: ['ARV cannot be zero or negative'] };
  }

  // Check comparable count
  if (comparables.length < 3) {
    warnings.push('Insufficient comparables (fewer than 3)');
  }

  // Check for outliers
  const prices = comparables.map(c => c.adjustedPrice);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const hasOutliers = prices.some(p => Math.abs(p - mean) / mean > 0.5);
  if (hasOutliers) {
    warnings.push('Significant price outliers detected in comparables');
  }

  // Check similarity scores
  const avgSimilarity = comparables.reduce((sum, c) => sum + c.similarityScore, 0) / comparables.length;
  if (avgSimilarity < 50) {
    warnings.push('Low average similarity score indicates weak comparables');
  }

  // Check sale recency
  const oldSales = comparables.filter(c => {
    const months = (Date.now() - new Date(c.saleDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return months > 9;
  });
  if (oldSales.length > comparables.length / 2) {
    warnings.push('More than half of comparables are over 9 months old');
  }

  return { isValid: true, warnings };
}
```

---

## Main Comparables Analysis Function

```typescript
// src/lib/analysis/financial/comparablesAnalysis.ts

import {
  ComparableSale,
  ComparablesAnalysis,
  SubjectProperty,
  ComparablesSummary
} from './types';
import { applyAdjustments } from './priceAdjustments';
import { calculateSimilarityScore } from './similarityScore';
import { filterComparables, rankComparables } from './comparablesSelection';

/**
 * Analyze comparables and calculate adjusted values
 */
export function analyzeComparables(
  rawComparables: ComparableSale[],
  subject: SubjectProperty
): ComparablesAnalysis {
  // Handle empty input
  if (rawComparables.length === 0) {
    return createEmptyAnalysis();
  }

  // Apply adjustments to each comparable
  const adjustedComparables = rawComparables.map(comp =>
    applyAdjustments(comp, subject)
  );

  // Sort by similarity score (highest first)
  adjustedComparables.sort((a, b) => b.similarityScore - a.similarityScore);

  // Calculate summary statistics
  const summary = calculateSummary(adjustedComparables);

  // Calculate weighted adjusted value using top 5 comparables
  const topComps = adjustedComparables.slice(0, 5);
  const weightedSum = topComps.reduce(
    (sum, c) => sum + c.adjustedPrice * c.similarityScore,
    0
  );
  const totalWeight = topComps.reduce((sum, c) => sum + c.similarityScore, 0);
  const adjustedValue = totalWeight > 0 ? weightedSum / totalWeight : summary.avgSalePrice;

  // Determine confidence level
  const avgSimilarity = totalWeight / topComps.length;
  const priceSpread = (summary.priceRange.high - summary.priceRange.low) / summary.avgSalePrice;
  const confidence = determineConfidence(topComps.length, avgSimilarity, priceSpread);

  return {
    comparables: adjustedComparables,
    summary,
    adjustedValue,
    confidence,
  };
}

/**
 * Create empty analysis result
 */
function createEmptyAnalysis(): ComparablesAnalysis {
  return {
    comparables: [],
    summary: {
      count: 0,
      avgSalePrice: 0,
      medianSalePrice: 0,
      avgPricePerSqft: 0,
      avgDaysOnMarket: 0,
      priceRange: { low: 0, high: 0 },
    },
    adjustedValue: 0,
    confidence: 'low',
  };
}

/**
 * Calculate summary statistics for comparables
 */
function calculateSummary(comparables: ComparableSale[]): ComparablesSummary {
  const prices = comparables.map(c => c.salePrice);
  const sortedPrices = [...prices].sort((a, b) => a - b);

  return {
    count: comparables.length,
    avgSalePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
    medianSalePrice: sortedPrices[Math.floor(sortedPrices.length / 2)],
    avgPricePerSqft: comparables.reduce((sum, c) => sum + c.pricePerSqft, 0) / comparables.length,
    avgDaysOnMarket: comparables.reduce((sum, c) => sum + (c.daysOnMarket || 30), 0) / comparables.length,
    priceRange: {
      low: sortedPrices[0],
      high: sortedPrices[sortedPrices.length - 1],
    },
  };
}

/**
 * Determine analysis confidence level
 */
function determineConfidence(
  compCount: number,
  avgSimilarity: number,
  priceSpread: number
): 'low' | 'medium' | 'high' {
  if (compCount >= 5 && avgSimilarity > 75 && priceSpread < 0.15) {
    return 'high';
  }
  if (compCount >= 3 && avgSimilarity > 60 && priceSpread < 0.25) {
    return 'medium';
  }
  return 'low';
}

/**
 * Fetch comparables from external APIs
 */
export async function fetchComparables(
  address: string,
  latitude: number,
  longitude: number,
  radiusMiles: number = 1,
  maxResults: number = 10
): Promise<ComparableSale[]> {
  const comparables: ComparableSale[] = [];

  // Fetch from Realtor.com API
  try {
    const realtorComps = await fetchRealtorComparables(
      latitude,
      longitude,
      radiusMiles,
      maxResults
    );
    comparables.push(...realtorComps);
  } catch (error) {
    console.error('Error fetching Realtor comparables:', error);
  }

  // Fetch from Zillow API
  try {
    const zillowComps = await fetchZillowComparables(
      address,
      radiusMiles,
      maxResults
    );
    comparables.push(...zillowComps);
  } catch (error) {
    console.error('Error fetching Zillow comparables:', error);
  }

  // Deduplicate by address
  return deduplicateComparables(comparables);
}

/**
 * Deduplicate comparables by normalized address
 */
function deduplicateComparables(comparables: ComparableSale[]): ComparableSale[] {
  const seen = new Set<string>();
  return comparables.filter(comp => {
    const key = normalizeAddress(comp.address);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Normalize address for deduplication
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Placeholder API fetch functions
async function fetchRealtorComparables(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  maxResults: number
): Promise<ComparableSale[]> {
  // Implementation would call Realtor.com API
  // See Phase 2: API Integration for details
  return [];
}

async function fetchZillowComparables(
  address: string,
  radiusMiles: number,
  maxResults: number
): Promise<ComparableSale[]> {
  // Implementation would call Zillow API
  // See Phase 2: API Integration for details
  return [];
}
```

---

## UI Components

### ComparablesTable Component

```typescript
// src/components/reports/sections/ComparablesTable.tsx

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Home,
  ExternalLink,
  ArrowUpDown,
} from 'lucide-react';
import { ComparablesAnalysis, ComparableSale } from '@/lib/analysis/financial/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface ComparablesTableProps {
  comparables: ComparablesAnalysis;
  subjectAddress?: string;
}

type SortKey = 'similarity' | 'price' | 'date' | 'distance' | 'sqft';

export function ComparablesTable({ comparables, subjectAddress }: ComparablesTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('similarity');
  const [sortAsc, setSortAsc] = useState(false);

  const sortedComps = useMemo(() => {
    const sorted = [...comparables.comparables].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'similarity':
          comparison = b.similarityScore - a.similarityScore;
          break;
        case 'price':
          comparison = b.salePrice - a.salePrice;
          break;
        case 'date':
          comparison = new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
          break;
        case 'distance':
          comparison = a.distanceMiles - b.distanceMiles;
          break;
        case 'sqft':
          comparison = b.sqft - a.sqft;
          break;
      }
      return sortAsc ? -comparison : comparison;
    });
    return sorted;
  }, [comparables.comparables, sortBy, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Comparable Sales ({comparables.summary.count})
          </CardTitle>
          <div className="flex gap-2">
            <ConfidenceBadge confidence={comparables.confidence} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <SummaryStats summary={comparables.summary} adjustedValue={comparables.adjustedValue} />

        {/* Sort Controls */}
        <div className="flex gap-2 mb-4">
          <span className="text-sm text-gray-500 py-1">Sort by:</span>
          {(['similarity', 'price', 'date', 'distance', 'sqft'] as SortKey[]).map((key) => (
            <Button
              key={key}
              variant={sortBy === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleSort(key)}
              className="gap-1"
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
              {sortBy === key && (
                <ArrowUpDown className="h-3 w-3" />
              )}
            </Button>
          ))}
        </div>

        {/* Comparables Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Sale Price</TableHead>
                <TableHead className="text-right">$/sqft</TableHead>
                <TableHead className="text-center">Match</TableHead>
                <TableHead className="text-right">Adjusted</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedComps.map((comp) => (
                <ComparableRow
                  key={comp.id}
                  comp={comp}
                  isExpanded={expanded === comp.id}
                  onToggle={() => setExpanded(expanded === comp.id ? null : comp.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Empty State */}
        {comparables.comparables.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No comparable sales found for this property.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Sub-components

function SummaryStats({
  summary,
  adjustedValue
}: {
  summary: ComparablesAnalysis['summary'];
  adjustedValue: number;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
      <div>
        <div className="text-sm text-gray-500">Avg Sale Price</div>
        <div className="text-lg font-semibold">
          {formatCurrency(summary.avgSalePrice)}
        </div>
      </div>
      <div>
        <div className="text-sm text-gray-500">Median Price</div>
        <div className="text-lg font-semibold">
          {formatCurrency(summary.medianSalePrice)}
        </div>
      </div>
      <div>
        <div className="text-sm text-gray-500">Avg $/sqft</div>
        <div className="text-lg font-semibold">
          {formatCurrency(summary.avgPricePerSqft)}
        </div>
      </div>
      <div>
        <div className="text-sm text-gray-500">Adjusted Value</div>
        <div className="text-lg font-semibold text-blue-600">
          {formatCurrency(adjustedValue)}
        </div>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: 'low' | 'medium' | 'high' }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
    high: 'default',
    medium: 'secondary',
    low: 'destructive',
  };

  return (
    <Badge variant={variants[confidence]}>
      {confidence} confidence
    </Badge>
  );
}

function ComparableRow({
  comp,
  isExpanded,
  onToggle
}: {
  comp: ComparableSale;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <TableCell>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">{comp.address}</div>
              <div className="text-xs text-gray-500">
                {comp.city}, {comp.state} &bull; {comp.distanceMiles.toFixed(1)} mi
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(comp.salePrice)}
        </TableCell>
        <TableCell className="text-right">
          {formatCurrency(comp.pricePerSqft)}
        </TableCell>
        <TableCell className="text-center">
          <SimilarityBadge score={comp.similarityScore} />
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(comp.adjustedPrice)}
        </TableCell>
        <TableCell>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </TableCell>
      </TableRow>

      {/* Expanded Details */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-gray-50 p-4">
            <ComparableDetails comp={comp} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function SimilarityBadge({ score }: { score: number }) {
  let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
  if (score >= 80) variant = 'default';
  else if (score < 50) variant = 'destructive';

  return (
    <Badge variant={variant} className="font-mono">
      {score.toFixed(0)}%
    </Badge>
  );
}

function ComparableDetails({ comp }: { comp: ComparableSale }) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Property Details */}
      <div>
        <h4 className="font-semibold mb-2">Property Details</h4>
        <dl className="space-y-1 text-sm">
          <DetailRow label="Size" value={`${comp.sqft.toLocaleString()} sqft`} />
          <DetailRow label="Lot" value={`${comp.lotSizeSqft.toLocaleString()} sqft`} />
          <DetailRow label="Beds/Baths" value={`${comp.bedrooms}bd / ${comp.bathrooms}ba`} />
          <DetailRow label="Year Built" value={comp.yearBuilt.toString()} />
          <DetailRow
            label="Type"
            value={comp.propertyType.replace('_', ' ')}
            className="capitalize"
          />
        </dl>
      </div>

      {/* Sale Details */}
      <div>
        <h4 className="font-semibold mb-2">Sale Details</h4>
        <dl className="space-y-1 text-sm">
          <DetailRow label="Sale Date" value={formatDate(comp.saleDate)} />
          <DetailRow
            label="Days on Market"
            value={comp.daysOnMarket?.toString() || 'N/A'}
          />
          <DetailRow label="Source" value={comp.source} className="capitalize" />
        </dl>
      </div>

      {/* Adjustments */}
      <div>
        <h4 className="font-semibold mb-2">Price Adjustments</h4>
        <dl className="space-y-1 text-sm">
          {Object.entries(comp.adjustments)
            .filter(([key, value]) => key !== 'totalAdjustment' && value !== 0)
            .map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <dt className="text-gray-500">
                  {formatAdjustmentLabel(key)}
                </dt>
                <dd className={value > 0 ? 'text-green-600' : 'text-red-600'}>
                  {value > 0 ? '+' : ''}{formatCurrency(value)}
                </dd>
              </div>
            ))}
          <div className="flex justify-between font-semibold pt-2 border-t">
            <dt>Total Adjustment</dt>
            <dd className={comp.adjustments.totalAdjustment > 0 ? 'text-green-600' : 'text-red-600'}>
              {comp.adjustments.totalAdjustment > 0 ? '+' : ''}
              {formatCurrency(comp.adjustments.totalAdjustment)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  className = ''
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className={className}>{value}</dd>
    </div>
  );
}

function formatAdjustmentLabel(key: string): string {
  return key
    .replace('Adjustment', '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}
```

### ARV Summary Card Component

```typescript
// src/components/reports/sections/ARVSummaryCard.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, BarChart3, AlertCircle } from 'lucide-react';
import { ARVCalculation, ComparablesAnalysis } from '@/lib/analysis/financial/types';
import { formatCurrency } from '@/lib/utils/format';

interface ARVSummaryCardProps {
  arvCalculation: ARVCalculation;
  comparablesCount: number;
  purchasePrice?: number;
}

export function ARVSummaryCard({
  arvCalculation,
  comparablesCount,
  purchasePrice
}: ARVSummaryCardProps) {
  const { estimatedARV, arvConfidence, arvRange, projectedSalePrice, netProceeds } = arvCalculation;

  const priceToARV = purchasePrice && estimatedARV
    ? (purchasePrice / estimatedARV * 100).toFixed(1)
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            After Repair Value (ARV)
          </CardTitle>
          <ConfidenceBadge confidence={arvConfidence} />
        </div>
      </CardHeader>
      <CardContent>
        {/* Main ARV Display */}
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-blue-600">
            {formatCurrency(estimatedARV)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Based on {comparablesCount} comparable sales
          </div>
        </div>

        {/* ARV Range */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Value Range</span>
          </div>
          <div className="relative pt-6 pb-2">
            <div className="flex justify-between text-xs text-gray-500 absolute top-0 w-full">
              <span>{formatCurrency(arvRange.low)}</span>
              <span>{formatCurrency(arvRange.high)}</span>
            </div>
            <Progress
              value={calculateRangePosition(estimatedARV, arvRange.low, arvRange.high)}
              className="h-2"
            />
            <div
              className="absolute top-5 transform -translate-x-1/2"
              style={{
                left: `${calculateRangePosition(estimatedARV, arvRange.low, arvRange.high)}%`
              }}
            >
              <div className="w-3 h-3 bg-blue-600 rounded-full" />
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <MetricBox
            icon={<DollarSign className="h-4 w-4" />}
            label="Projected Sale"
            value={formatCurrency(projectedSalePrice)}
            sublabel="95% of ARV"
          />
          <MetricBox
            icon={<BarChart3 className="h-4 w-4" />}
            label="Net Proceeds"
            value={formatCurrency(netProceeds)}
            sublabel="After 6% costs"
          />
        </div>

        {/* Price to ARV Ratio */}
        {priceToARV && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Price to ARV Ratio</span>
              <span className={`font-semibold ${
                parseFloat(priceToARV) < 70 ? 'text-green-600' :
                parseFloat(priceToARV) < 80 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {priceToARV}%
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {parseFloat(priceToARV) < 70
                ? 'Excellent - Strong profit potential'
                : parseFloat(priceToARV) < 80
                ? 'Good - Moderate profit potential'
                : 'High - Limited profit margin'}
            </div>
          </div>
        )}

        {/* Confidence Warning */}
        {arvConfidence === 'low' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>Low confidence estimate.</strong> Limited comparable sales data available.
              Consider additional research before making investment decisions.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfidenceBadge({ confidence }: { confidence: 'low' | 'medium' | 'high' }) {
  const config = {
    high: { variant: 'default' as const, label: 'High Confidence' },
    medium: { variant: 'secondary' as const, label: 'Medium Confidence' },
    low: { variant: 'destructive' as const, label: 'Low Confidence' },
  };

  return (
    <Badge variant={config[confidence].variant}>
      {config[confidence].label}
    </Badge>
  );
}

function MetricBox({
  icon,
  label,
  value,
  sublabel
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 text-gray-500 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="font-semibold">{value}</div>
      <div className="text-xs text-gray-400">{sublabel}</div>
    </div>
  );
}

function calculateRangePosition(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}
```

### ComparablesMap Component

```typescript
// src/components/reports/sections/ComparablesMap.tsx

'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { ComparableSale, SubjectProperty } from '@/lib/analysis/financial/types';
import { formatCurrency } from '@/lib/utils/format';

interface ComparablesMapProps {
  subject: SubjectProperty;
  comparables: ComparableSale[];
  onComparableClick?: (comp: ComparableSale) => void;
}

export function ComparablesMap({
  subject,
  comparables,
  onComparableClick
}: ComparablesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  // Map initialization would use Leaflet or Mapbox
  // This is a placeholder for the map implementation

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Comparables Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={mapRef}
          className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center"
        >
          <div className="text-center text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Map showing {comparables.length} comparables</p>
            <p className="text-sm">Center: {subject.address}</p>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded-full" />
            <span>Subject Property</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full" />
            <span>High Match (&gt;80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full" />
            <span>Medium Match (50-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full" />
            <span>Low Match (&lt;50%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## API Route

```typescript
// src/app/api/analysis/comparables/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeComparables, fetchComparables } from '@/lib/analysis/financial/comparablesAnalysis';
import { calculateARV } from '@/lib/analysis/financial/arvCalculator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      address,
      latitude,
      longitude,
      sqft,
      bedrooms,
      bathrooms,
      yearBuilt,
      propertyType,
      radiusMiles = 1,
      maxResults = 10,
      fetchNew = true,
    } = body;

    // Validate required fields
    if (!latitude || !longitude || !sqft) {
      return NextResponse.json(
        { error: 'Missing required fields: latitude, longitude, sqft' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Check for existing comparables in database
    let existingComps: any[] = [];
    if (propertyId) {
      const { data } = await supabase
        .from('comparable_sales')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      existingComps = data || [];
    }

    // Fetch new comparables if requested or none exist
    let rawComparables = existingComps;
    if (fetchNew || existingComps.length === 0) {
      const fetchedComps = await fetchComparables(
        address,
        latitude,
        longitude,
        radiusMiles,
        maxResults
      );
      rawComparables = fetchedComps;

      // Store fetched comparables in database
      if (propertyId && fetchedComps.length > 0) {
        const comparablesToStore = fetchedComps.map(comp => ({
          property_id: propertyId,
          address: comp.address,
          city: comp.city,
          state: comp.state,
          zip: comp.zip,
          sale_price: comp.salePrice,
          sale_date: comp.saleDate,
          sqft: comp.sqft,
          lot_size_sqft: comp.lotSizeSqft,
          bedrooms: comp.bedrooms,
          bathrooms: comp.bathrooms,
          year_built: comp.yearBuilt,
          property_type: comp.propertyType,
          price_per_sqft: comp.pricePerSqft,
          distance_miles: comp.distanceMiles,
          days_on_market: comp.daysOnMarket,
          similarity_score: comp.similarityScore,
          source: comp.source,
        }));

        await supabase
          .from('comparable_sales')
          .upsert(comparablesToStore, { onConflict: 'property_id,address' });
      }
    }

    // Build subject property
    const subjectProperty = {
      address,
      latitude,
      longitude,
      sqft,
      lotSizeSqft: body.lotSizeSqft || sqft * 5,
      bedrooms: bedrooms || 3,
      bathrooms: bathrooms || 2,
      yearBuilt: yearBuilt || 1990,
      propertyType: propertyType || 'single_family',
    };

    // Analyze comparables
    const analysis = analyzeComparables(rawComparables, subjectProperty);

    // Calculate ARV
    const arvCalculation = calculateARV(
      analysis.comparables,
      { sqft, bedrooms, bathrooms }
    );

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        arv: arvCalculation,
        comparablesCount: analysis.comparables.length,
        confidence: analysis.confidence,
      },
    });

  } catch (error) {
    console.error('Comparables analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze comparables' },
      { status: 500 }
    );
  }
}
```

---

## Database Schema

```sql
-- Comparable sales table
CREATE TABLE comparable_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  sale_price DECIMAL(12,2) NOT NULL,
  sale_date DATE NOT NULL,
  sqft INTEGER,
  lot_size_sqft INTEGER,
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  year_built INTEGER,
  property_type TEXT,
  price_per_sqft DECIMAL(10,2),
  distance_miles DECIMAL(5,2),
  days_on_market INTEGER,
  similarity_score DECIMAL(5,2),
  adjustments JSONB,
  adjusted_price DECIMAL(12,2),
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, address)
);

-- Index for efficient querying
CREATE INDEX idx_comparable_sales_property ON comparable_sales(property_id);
CREATE INDEX idx_comparable_sales_location ON comparable_sales(city, state);
CREATE INDEX idx_comparable_sales_date ON comparable_sales(sale_date);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_comparable_sales_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comparable_sales_updated
  BEFORE UPDATE ON comparable_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_comparable_sales_timestamp();
```

---

## Folder Structure

```
src/lib/analysis/financial/
├── index.ts                    # Main exports
├── types/
│   ├── comparables.ts          # Comparable types
│   └── arv.ts                  # ARV types
├── config/
│   └── adjustmentValues.ts     # Adjustment configuration
├── comparablesAnalysis.ts      # Main analysis function
├── comparablesSelection.ts     # Selection and filtering
├── similarityScore.ts          # Similarity calculation
├── priceAdjustments.ts         # Price adjustment functions
└── arvCalculator.ts            # ARV calculation

src/components/reports/sections/
├── ComparablesTable.tsx        # Main comparables table
├── ARVSummaryCard.tsx          # ARV summary display
└── ComparablesMap.tsx          # Map visualization

src/app/api/analysis/
└── comparables/
    └── route.ts                # API endpoint
```

---

## Verification Steps

1. **Unit Tests**
   - Test similarity score calculation with various inputs
   - Test price adjustment calculations
   - Test ARV calculation with mock data
   - Validate filtering and selection logic

2. **Integration Tests**
   - Test API endpoint with real property data
   - Verify database storage and retrieval
   - Test with various comparable counts (0, 1-2, 3-5, 5+)

3. **UI Tests**
   - Verify table sorting functionality
   - Test expandable row behavior
   - Validate ARV display with different confidence levels
   - Test responsive layout

4. **Edge Cases**
   - Handle zero comparables gracefully
   - Handle extreme price variations
   - Test with missing property attributes

---

## Summary

This implementation plan provides a complete, standalone system for comparable property analysis:

- **Type Definitions**: Comprehensive TypeScript interfaces for all data structures
- **Selection Logic**: Filtering and ranking algorithms for optimal comparable selection
- **Similarity Scoring**: Multi-factor scoring with configurable weights
- **Price Adjustments**: 17+ adjustment categories for accurate value estimation
- **ARV Calculation**: Weighted average with confidence scoring
- **UI Components**: React components for displaying analysis results
- **API Integration**: Next.js route for server-side analysis
- **Database Schema**: Supabase table for persistent storage

The system supports both manual and automated comparable analysis, with confidence levels to indicate data reliability for investment decisions.
