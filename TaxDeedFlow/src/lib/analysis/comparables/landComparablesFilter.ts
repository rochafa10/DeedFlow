/**
 * Land Comparables Filter & Scoring Module
 *
 * Specialized module for filtering and scoring comparable land sales.
 * Uses different weights than house comparables - lot size is primary,
 * building characteristics are irrelevant.
 *
 * @module lib/analysis/comparables/landComparablesFilter
 * @author Claude Code Agent
 * @date 2026-01-18
 */

import {
  calculateDistanceMiles,
  calculateDistanceScore,
  calculateLotSizeScore,
  calculateRecencyScore,
  calculatePropertyTypeScore,
  type SubjectProperty,
  type ComparableProperty,
  type SimilarityWeights,
  type FactorScores,
} from "./similarityScoring";

// ============================================
// Land-Specific Weights
// ============================================

/**
 * Weights optimized for vacant land comparables
 * Building characteristics (sqft, bedrooms, bathrooms, style, features) are zeroed out
 */
export const LAND_WEIGHTS: SimilarityWeights = {
  distance: 0.30,      // Location still very important
  lotSize: 0.35,       // PRIMARY factor for land - similar sized lots
  recency: 0.15,       // Recent sales more relevant
  propertyType: 0.10,  // Should all be land
  sqft: 0.0,           // Not applicable for land
  bedrooms: 0.0,       // Not applicable for land
  bathrooms: 0.0,      // Not applicable for land
  age: 0.0,            // Not applicable for land
  style: 0.0,          // Not applicable for land
  features: 0.0,       // Not applicable for land
};

/**
 * Price deviation thresholds for outlier detection
 */
const PRICE_THRESHOLDS = {
  /** Maximum acceptable price per sqft deviation from median (e.g., 3x = very expensive lot) */
  maxPricePerSqftMultiple: 3.0,
  /** Minimum acceptable price per sqft as fraction of median (e.g., 0.25 = very cheap lot) */
  minPricePerSqftFraction: 0.25,
  /** If price differs from median by more than this %, flag as outlier */
  outlierPercentThreshold: 200,
};

// ============================================
// Type Definitions
// ============================================

export interface LandComparable extends ComparableProperty {
  /** Price per square foot of lot */
  pricePerSqft?: number;
  /** Whether this comp is flagged as an outlier */
  isOutlier?: boolean;
  /** Reason for being flagged as outlier */
  outlierReason?: string;
  /** Land similarity score (0-100) */
  landSimilarityScore?: number;
}

export interface LandSubject extends SubjectProperty {
  /** Lot size in square feet */
  lotSizeSqft: number;
  /** Lot size in acres (optional, calculated from sqft) */
  lotSizeAcres?: number;
}

export interface FilteredLandComparables {
  /** All comparables after initial filtering */
  all: LandComparable[];
  /** Top similar comparables (recommended for valuation) */
  top: LandComparable[];
  /** Outliers that were excluded */
  outliers: LandComparable[];
  /** Stats about the filtering */
  stats: {
    originalCount: number;
    afterTypeFilter: number;
    afterUnitFilter: number;
    afterOutlierFilter: number;
    medianPricePerSqft: number;
    medianTotalPrice: number;
    priceRange: { min: number; max: number };
  };
}

// ============================================
// Filtering Functions
// ============================================

/**
 * Check if an address looks like a condo/apartment unit
 * Unit numbers indicate multi-unit buildings, not vacant land
 *
 * @param address Property address
 * @returns True if address appears to be a unit
 */
export function isUnitAddress(address: string | undefined): boolean {
  if (!address) return false;

  const normalized = address.toUpperCase();

  // Common unit indicators
  const unitPatterns = [
    /#\s*\d+/,           // # 123, #123
    /\bUNIT\s*\d+/,      // UNIT 1, UNIT 123
    /\bAPT\s*\.?\s*\d+/, // APT 1, APT. 123
    /\bSTE\s*\.?\s*\d+/, // STE 1, STE. 123
    /\bSUITE\s*\d+/,     // SUITE 123
    /\bFLOOR\s*\d+/,     // FLOOR 2
    /\b\d+[A-Z]$/,       // 123A, 456B (unit letters at end)
  ];

  return unitPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Check if a property type indicates vacant land
 *
 * @param propertyType Property type string
 * @returns True if it's a land/lot type
 */
export function isLandType(propertyType: string | undefined): boolean {
  if (!propertyType) return false;

  const normalized = propertyType.toLowerCase();

  const landKeywords = [
    'land', 'lot', 'vacant', 'acreage', 'parcel',
    'undeveloped', 'raw land', 'building lot'
  ];

  return landKeywords.some(keyword => normalized.includes(keyword));
}

/**
 * Calculate price per square foot for a land sale
 *
 * @param price Sale price
 * @param lotSizeSqft Lot size in square feet
 * @returns Price per sqft, or null if invalid
 */
export function calculatePricePerSqft(
  price: number,
  lotSizeSqft: number | undefined
): number | null {
  if (!lotSizeSqft || lotSizeSqft <= 0 || price <= 0) return null;
  return price / lotSizeSqft;
}

/**
 * Calculate median of an array of numbers
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Detect if a comparable is a price outlier
 *
 * @param comp Comparable with price per sqft
 * @param medianPricePerSqft Median price per sqft of all comps
 * @returns Outlier status and reason
 */
export function detectPriceOutlier(
  comp: LandComparable,
  medianPricePerSqft: number
): { isOutlier: boolean; reason?: string } {
  if (!comp.pricePerSqft || medianPricePerSqft <= 0) {
    return { isOutlier: false };
  }

  const ratio = comp.pricePerSqft / medianPricePerSqft;

  // Too expensive compared to median
  if (ratio > PRICE_THRESHOLDS.maxPricePerSqftMultiple) {
    return {
      isOutlier: true,
      reason: `Price/sqft is ${ratio.toFixed(1)}x higher than median`,
    };
  }

  // Too cheap compared to median
  if (ratio < PRICE_THRESHOLDS.minPricePerSqftFraction) {
    return {
      isOutlier: true,
      reason: `Price/sqft is ${(1/ratio).toFixed(1)}x lower than median`,
    };
  }

  return { isOutlier: false };
}

/**
 * Calculate land similarity score
 * Uses land-specific weights that prioritize lot size and distance
 *
 * @param subject Subject land property
 * @param comp Comparable land property
 * @param preCalculatedDistance Optional pre-calculated distance (from API)
 * @returns Similarity score 0-100
 */
export function calculateLandSimilarityScore(
  subject: LandSubject,
  comp: LandComparable,
  preCalculatedDistance?: number
): number {
  // Use pre-calculated distance if available, otherwise calculate from coordinates
  let distanceMiles: number;

  if (preCalculatedDistance !== undefined && preCalculatedDistance > 0) {
    // API provided distance
    distanceMiles = preCalculatedDistance;
  } else if (comp.distanceMiles !== undefined && comp.distanceMiles > 0) {
    // Distance already on the comparable
    distanceMiles = comp.distanceMiles;
  } else if (subject.latitude && subject.longitude && comp.latitude && comp.longitude) {
    // Calculate from coordinates if both have valid coords
    distanceMiles = calculateDistanceMiles(
      subject.latitude,
      subject.longitude,
      comp.latitude,
      comp.longitude
    );
  } else {
    // Default to 1 mile if no distance info available (middle-range score)
    distanceMiles = 1;
  }

  // Calculate factor scores
  const distanceScore = calculateDistanceScore(distanceMiles);
  const lotSizeScore = calculateLotSizeScore(subject.lotSizeSqft, comp.lotSizeSqft);
  const recencyScore = comp.saleDate ? calculateRecencyScore(comp.saleDate) : 50;
  const propertyTypeScore = calculatePropertyTypeScore(subject.propertyType || 'land', comp.propertyType);

  // Apply land-specific weights
  const weightedScore =
    distanceScore * LAND_WEIGHTS.distance +
    lotSizeScore * LAND_WEIGHTS.lotSize +
    recencyScore * LAND_WEIGHTS.recency +
    propertyTypeScore * LAND_WEIGHTS.propertyType;

  // Bonus for similar lot size (within 25%)
  const lotSizeDiff = subject.lotSizeSqft && comp.lotSizeSqft
    ? Math.abs(subject.lotSizeSqft - comp.lotSizeSqft) / subject.lotSizeSqft
    : 1;

  const lotSizeBonus = lotSizeDiff < 0.25 ? 10 : 0;

  return Math.min(100, Math.round(weightedScore + lotSizeBonus));
}

// ============================================
// Main Filter Function
// ============================================

/**
 * Filter and score land comparables
 *
 * This is the main function to use for processing API results for vacant land.
 * It filters out non-land types, unit addresses, and price outliers,
 * then scores remaining comps by similarity to the subject lot.
 *
 * @param subject Subject land property
 * @param comparables Raw comparables from API
 * @param topCount Number of top comps to return (default 5)
 * @returns Filtered and scored comparables
 */
export function filterLandComparables(
  subject: LandSubject,
  comparables: ComparableProperty[],
  topCount: number = 5
): FilteredLandComparables {
  const originalCount = comparables.length;

  // Step 1: Filter out non-land property types
  let filtered = comparables.filter(comp => {
    const propType = comp.propertyType?.toLowerCase() || '';
    // Accept if explicitly land OR if building sqft is 0/undefined
    return isLandType(comp.propertyType) ||
           !comp.sqft ||
           comp.sqft === 0 ||
           propType.includes('lot') ||
           propType.includes('vacant');
  });
  const afterTypeFilter = filtered.length;

  // Step 2: For LAND comparables, skip unit address filter
  // Land parcels often have lot numbers like "# 8" or "Lot 5" which are NOT condo units
  // Only filter if property type explicitly suggests condo/apartment
  filtered = filtered.filter(comp => {
    const propType = comp.propertyType?.toLowerCase() || '';
    // Only filter if it's explicitly a condo/apartment type
    if (propType.includes('condo') || propType.includes('apartment') || propType.includes('unit')) {
      return !isUnitAddress(comp.address);
    }
    // For land types, keep all addresses (lot numbers are OK)
    return true;
  });
  const afterUnitFilter = filtered.length;

  // Step 3: Calculate price per sqft for all remaining
  const landComps: LandComparable[] = filtered.map(comp => ({
    ...comp,
    pricePerSqft: calculatePricePerSqft(comp.salePrice, comp.lotSizeSqft) ?? undefined,
    isOutlier: false,
  }));

  // Step 4: Calculate median price per sqft
  const pricesPerSqft = landComps
    .map(c => c.pricePerSqft)
    .filter((p): p is number => p !== null && p !== undefined && p > 0);

  const medianPricePerSqft = calculateMedian(pricesPerSqft);

  // Step 5: Detect and mark outliers
  const outliers: LandComparable[] = [];
  const nonOutliers: LandComparable[] = [];

  for (const comp of landComps) {
    const { isOutlier, reason } = detectPriceOutlier(comp, medianPricePerSqft);

    if (isOutlier) {
      outliers.push({ ...comp, isOutlier: true, outlierReason: reason });
    } else {
      nonOutliers.push(comp);
    }
  }
  const afterOutlierFilter = nonOutliers.length;

  // Step 6: Calculate land similarity scores
  // Use pre-existing distance if available, otherwise calculate from coordinates
  const scoredComps = nonOutliers.map(comp => {
    // Determine distance: use pre-existing, or calculate if coords available
    let distance: number;
    if (comp.distanceMiles !== undefined && comp.distanceMiles > 0) {
      distance = comp.distanceMiles;
    } else if (subject.latitude && subject.longitude && comp.latitude && comp.longitude) {
      distance = calculateDistanceMiles(
        subject.latitude,
        subject.longitude,
        comp.latitude,
        comp.longitude
      );
    } else {
      // Default to 1 mile if no distance info (middle-range for scoring)
      distance = 1;
    }

    return {
      ...comp,
      landSimilarityScore: calculateLandSimilarityScore(subject, comp, distance),
      distanceMiles: distance,
    };
  });

  // Step 7: Sort by similarity score (descending)
  scoredComps.sort((a, b) => (b.landSimilarityScore || 0) - (a.landSimilarityScore || 0));

  // Step 8: Get top N comps
  const topComps = scoredComps.slice(0, topCount);

  // Calculate stats
  const allPrices = scoredComps.map(c => c.salePrice).filter(p => p > 0);
  const stats = {
    originalCount,
    afterTypeFilter,
    afterUnitFilter,
    afterOutlierFilter,
    medianPricePerSqft: Math.round(medianPricePerSqft * 100) / 100,
    medianTotalPrice: Math.round(calculateMedian(allPrices)),
    priceRange: {
      min: allPrices.length > 0 ? Math.min(...allPrices) : 0,
      max: allPrices.length > 0 ? Math.max(...allPrices) : 0,
    },
  };

  return {
    all: scoredComps,
    top: topComps,
    outliers,
    stats,
  };
}

/**
 * Format a land comparable for display
 *
 * @param comp Land comparable
 * @returns Formatted display object
 */
export function formatLandComparable(comp: LandComparable): {
  address: string;
  salePrice: string;
  lotSize: string;
  pricePerSqft: string;
  distance: string;
  saleDate: string;
  score: string;
} {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const formatLotSize = (sqft: number | undefined) => {
    if (!sqft) return 'N/A';
    if (sqft >= 43560) {
      return `${(sqft / 43560).toFixed(2)} acres`;
    }
    return `${sqft.toLocaleString()} sqft`;
  };

  return {
    address: comp.address || 'Unknown',
    salePrice: formatCurrency(comp.salePrice),
    lotSize: formatLotSize(comp.lotSizeSqft),
    pricePerSqft: comp.pricePerSqft
      ? `${formatCurrency(comp.pricePerSqft)}/sqft`
      : 'N/A',
    distance: comp.distanceMiles
      ? `${comp.distanceMiles.toFixed(2)} mi`
      : 'N/A',
    saleDate: comp.saleDate
      ? new Date(comp.saleDate).toLocaleDateString()
      : 'N/A',
    score: comp.landSimilarityScore
      ? `${comp.landSimilarityScore}%`
      : 'N/A',
  };
}

/**
 * Estimate land value based on comparable sales
 *
 * @param subject Subject land property
 * @param topComps Top similar comparables
 * @returns Estimated value and confidence
 */
export function estimateLandValue(
  subject: LandSubject,
  topComps: LandComparable[]
): {
  estimatedValue: number;
  valuePerSqft: number;
  confidence: 'high' | 'medium' | 'low';
  compCount: number;
} {
  if (topComps.length === 0 || !subject.lotSizeSqft) {
    return {
      estimatedValue: 0,
      valuePerSqft: 0,
      confidence: 'low',
      compCount: 0,
    };
  }

  // Weight by similarity score
  let totalWeight = 0;
  let weightedPricePerSqft = 0;

  for (const comp of topComps) {
    if (comp.pricePerSqft && comp.landSimilarityScore) {
      const weight = comp.landSimilarityScore / 100;
      weightedPricePerSqft += comp.pricePerSqft * weight;
      totalWeight += weight;
    }
  }

  const avgPricePerSqft = totalWeight > 0
    ? weightedPricePerSqft / totalWeight
    : 0;

  const estimatedValue = avgPricePerSqft * subject.lotSizeSqft;

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';

  if (topComps.length >= 3) {
    const avgScore = topComps.reduce((sum, c) => sum + (c.landSimilarityScore || 0), 0) / topComps.length;
    if (avgScore >= 70 && topComps.length >= 5) {
      confidence = 'high';
    } else if (avgScore >= 50) {
      confidence = 'medium';
    }
  }

  return {
    estimatedValue: Math.round(estimatedValue),
    valuePerSqft: Math.round(avgPricePerSqft * 100) / 100,
    confidence,
    compCount: topComps.length,
  };
}
