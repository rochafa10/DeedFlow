/**
 * Similarity Scoring Module - Comparables Analysis
 *
 * This module calculates similarity scores between a subject property and
 * comparable sales based on multiple weighted factors including distance,
 * square footage, bedrooms, bathrooms, age, sale recency, and property type.
 *
 * @module lib/analysis/comparables/similarityScoring
 * @author Claude Code Agent
 * @date 2026-01-16
 */

// ============================================
// Type Definitions
// ============================================

/**
 * Subject property data for comparison
 */
export interface SubjectProperty {
  /** Property latitude */
  latitude: number;
  /** Property longitude */
  longitude: number;
  /** Living area in square feet */
  sqft?: number;
  /** Lot size in square feet */
  lotSizeSqft?: number;
  /** Number of bedrooms */
  bedrooms?: number;
  /** Number of bathrooms */
  bathrooms?: number;
  /** Year property was built */
  yearBuilt?: number;
  /** Property type (SFR, Condo, Townhouse, etc.) */
  propertyType?: string;
  /** Property style (Ranch, Colonial, Contemporary, etc.) */
  style?: string;
  /** Number of stories */
  stories?: number;
  /** Has garage */
  hasGarage?: boolean;
  /** Garage spaces */
  garageSpaces?: number;
  /** Has pool */
  hasPool?: boolean;
  /** Has basement */
  hasBasement?: boolean;
  /** Basement finished */
  basementFinished?: boolean;
}

/**
 * Comparable property data
 */
export interface ComparableProperty extends SubjectProperty {
  /** Sale price */
  salePrice: number;
  /** Sale date (ISO string) */
  saleDate: string;
  /** Property address */
  address?: string;
  /** Distance from subject (will be calculated) */
  distanceMiles?: number;
  /** Calculated similarity score */
  similarityScore?: number;
  /** Individual factor scores */
  factorScores?: FactorScores;
}

/**
 * Individual factor scores for transparency
 */
export interface FactorScores {
  distance: number;
  sqft: number;
  lotSize: number;
  bedrooms: number;
  bathrooms: number;
  age: number;
  recency: number;
  propertyType: number;
  style: number;
  features: number;
}

/**
 * Similarity score result
 */
export interface SimilarityResult {
  /** Overall similarity score (0-100) */
  score: number;
  /** Individual factor scores */
  factorScores: FactorScores;
  /** Weighted contribution of each factor */
  factorContributions: FactorScores;
  /** Confidence in the similarity score */
  confidence: number;
  /** Factors that couldn't be compared (missing data) */
  missingFactors: string[];
  /** Distance in miles */
  distanceMiles: number;
}

/**
 * Configuration for similarity weights
 */
export interface SimilarityWeights {
  distance: number;
  sqft: number;
  lotSize: number;
  bedrooms: number;
  bathrooms: number;
  age: number;
  recency: number;
  propertyType: number;
  style: number;
  features: number;
}

// ============================================
// Constants
// ============================================

/**
 * Default similarity weights
 * These can be customized based on market conditions or user preferences
 * Total should sum to 1.0
 */
export const DEFAULT_WEIGHTS: SimilarityWeights = {
  distance: 0.25,      // Most important - location is everything
  sqft: 0.20,          // Second most important - size matters
  bedrooms: 0.12,      // Bedroom count affects buyer pool
  bathrooms: 0.08,     // Bathroom count
  age: 0.10,           // Property age/year built
  recency: 0.10,       // How recent the sale was
  propertyType: 0.08,  // Must match type
  lotSize: 0.04,       // Lot size (less important in suburbs)
  style: 0.02,         // Architectural style
  features: 0.01,      // Additional features
};

/**
 * Maximum acceptable values for factor calculations
 */
const MAX_THRESHOLDS = {
  distanceMiles: 3.0,         // Max 3 miles for comparables
  sqftDifferencePercent: 0.5, // Max 50% difference in sqft
  lotSizeDifferencePercent: 1.0, // Max 100% difference in lot size
  bedroomDifference: 2,       // Max 2 bedroom difference
  bathroomDifference: 2,      // Max 2 bathroom difference
  ageDifference: 20,          // Max 20 year age difference
  recencyMonths: 12,          // Max 12 months for sale recency
};

/**
 * Property type mapping for comparison
 */
const PROPERTY_TYPE_GROUPS: Record<string, string[]> = {
  residential: ['SFR', 'Single Family', 'Residential', 'House', 'Detached'],
  condo: ['Condo', 'Condominium', 'Apartment', 'Unit'],
  townhouse: ['Townhouse', 'Townhome', 'Row House', 'Attached'],
  multi_family: ['Duplex', 'Triplex', 'Fourplex', 'Multi-Family', 'Multi Family'],
  manufactured: ['Mobile', 'Manufactured', 'Modular'],
  land: ['Land', 'Vacant', 'Lot'],
};

/**
 * Style mapping for comparison
 */
const STYLE_GROUPS: Record<string, string[]> = {
  traditional: ['Traditional', 'Colonial', 'Cape Cod', 'Georgian'],
  ranch: ['Ranch', 'Rambler', 'One-Story'],
  contemporary: ['Contemporary', 'Modern', 'Mid-Century Modern'],
  craftsman: ['Craftsman', 'Bungalow', 'Arts and Crafts'],
  victorian: ['Victorian', 'Queen Anne', 'Gothic'],
  mediterranean: ['Mediterranean', 'Spanish', 'Tuscan'],
};

// ============================================
// Distance Calculation
// ============================================

/**
 * Calculate distance between two coordinates using Haversine formula
 *
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in miles
 */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ============================================
// Individual Factor Scoring
// ============================================

/**
 * Calculate distance similarity score
 * Closer = higher score, with exponential decay
 *
 * @param distanceMiles Distance between properties
 * @returns Score 0-100
 */
export function calculateDistanceScore(distanceMiles: number): number {
  if (distanceMiles <= 0) return 100;
  if (distanceMiles >= MAX_THRESHOLDS.distanceMiles) return 0;

  // Exponential decay - closer properties get much higher scores
  const score = 100 * Math.exp(-distanceMiles / 1.0);
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate square footage similarity score
 *
 * @param subjectSqft Subject property sqft
 * @param compSqft Comparable property sqft
 * @returns Score 0-100
 */
export function calculateSqftScore(
  subjectSqft: number | undefined,
  compSqft: number | undefined
): number {
  if (!subjectSqft || !compSqft) return 50; // Neutral if unknown

  const percentDiff = Math.abs(subjectSqft - compSqft) / subjectSqft;

  if (percentDiff > MAX_THRESHOLDS.sqftDifferencePercent) return 0;

  // Linear decay
  const score = 100 * (1 - percentDiff / MAX_THRESHOLDS.sqftDifferencePercent);
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate lot size similarity score
 *
 * @param subjectLot Subject lot size in sqft
 * @param compLot Comparable lot size in sqft
 * @returns Score 0-100
 */
export function calculateLotSizeScore(
  subjectLot: number | undefined,
  compLot: number | undefined
): number {
  if (!subjectLot || !compLot) return 50; // Neutral if unknown

  const percentDiff = Math.abs(subjectLot - compLot) / subjectLot;

  if (percentDiff > MAX_THRESHOLDS.lotSizeDifferencePercent) return 0;

  const score = 100 * (1 - percentDiff / MAX_THRESHOLDS.lotSizeDifferencePercent);
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate bedroom similarity score
 *
 * @param subjectBeds Subject bedroom count
 * @param compBeds Comparable bedroom count
 * @returns Score 0-100
 */
export function calculateBedroomScore(
  subjectBeds: number | undefined,
  compBeds: number | undefined
): number {
  if (!subjectBeds || !compBeds) return 50;

  const diff = Math.abs(subjectBeds - compBeds);

  if (diff === 0) return 100;
  if (diff >= MAX_THRESHOLDS.bedroomDifference) return 0;

  // Step function with decay
  const score = 100 - (diff / MAX_THRESHOLDS.bedroomDifference) * 100;
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate bathroom similarity score
 *
 * @param subjectBaths Subject bathroom count
 * @param compBaths Comparable bathroom count
 * @returns Score 0-100
 */
export function calculateBathroomScore(
  subjectBaths: number | undefined,
  compBaths: number | undefined
): number {
  if (!subjectBaths || !compBaths) return 50;

  const diff = Math.abs(subjectBaths - compBaths);

  if (diff === 0) return 100;
  if (diff >= MAX_THRESHOLDS.bathroomDifference) return 0;

  const score = 100 - (diff / MAX_THRESHOLDS.bathroomDifference) * 100;
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate age/year built similarity score
 *
 * @param subjectYear Subject year built
 * @param compYear Comparable year built
 * @returns Score 0-100
 */
export function calculateAgeScore(
  subjectYear: number | undefined,
  compYear: number | undefined
): number {
  if (!subjectYear || !compYear) return 50;

  const diff = Math.abs(subjectYear - compYear);

  if (diff === 0) return 100;
  if (diff >= MAX_THRESHOLDS.ageDifference) return 0;

  const score = 100 - (diff / MAX_THRESHOLDS.ageDifference) * 100;
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate sale recency score
 * More recent sales are more relevant
 *
 * @param saleDate Sale date as ISO string
 * @returns Score 0-100
 */
export function calculateRecencyScore(saleDate: string): number {
  const sale = new Date(saleDate);
  const now = new Date();
  const monthsDiff =
    (now.getTime() - sale.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsDiff <= 0) return 100;
  if (monthsDiff >= MAX_THRESHOLDS.recencyMonths) return 0;

  // Exponential decay for recency
  const score = 100 * Math.exp(-monthsDiff / 6);
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate property type similarity score
 *
 * @param subjectType Subject property type
 * @param compType Comparable property type
 * @returns Score 0-100
 */
export function calculatePropertyTypeScore(
  subjectType: string | undefined,
  compType: string | undefined
): number {
  if (!subjectType || !compType) return 50;

  const normalizedSubject = subjectType.toLowerCase();
  const normalizedComp = compType.toLowerCase();

  // Exact match
  if (normalizedSubject === normalizedComp) return 100;

  // Check if they're in the same group
  for (const group of Object.values(PROPERTY_TYPE_GROUPS)) {
    const subjectInGroup = group.some((t) =>
      normalizedSubject.includes(t.toLowerCase())
    );
    const compInGroup = group.some((t) =>
      normalizedComp.includes(t.toLowerCase())
    );

    if (subjectInGroup && compInGroup) return 80;
  }

  // Different types
  return 20;
}

/**
 * Calculate style similarity score
 *
 * @param subjectStyle Subject property style
 * @param compStyle Comparable property style
 * @returns Score 0-100
 */
export function calculateStyleScore(
  subjectStyle: string | undefined,
  compStyle: string | undefined
): number {
  if (!subjectStyle || !compStyle) return 50;

  const normalizedSubject = subjectStyle.toLowerCase();
  const normalizedComp = compStyle.toLowerCase();

  // Exact match
  if (normalizedSubject === normalizedComp) return 100;

  // Check if they're in the same group
  for (const group of Object.values(STYLE_GROUPS)) {
    const subjectInGroup = group.some((s) =>
      normalizedSubject.includes(s.toLowerCase())
    );
    const compInGroup = group.some((s) =>
      normalizedComp.includes(s.toLowerCase())
    );

    if (subjectInGroup && compInGroup) return 75;
  }

  // Different styles
  return 40;
}

/**
 * Calculate features similarity score
 * Based on garage, pool, basement
 *
 * @param subject Subject property
 * @param comp Comparable property
 * @returns Score 0-100
 */
export function calculateFeaturesScore(
  subject: SubjectProperty,
  comp: ComparableProperty
): number {
  let matchingFeatures = 0;
  let totalFeatures = 0;

  // Garage comparison
  if (subject.hasGarage !== undefined && comp.hasGarage !== undefined) {
    totalFeatures++;
    if (subject.hasGarage === comp.hasGarage) matchingFeatures++;
  }

  // Pool comparison
  if (subject.hasPool !== undefined && comp.hasPool !== undefined) {
    totalFeatures++;
    if (subject.hasPool === comp.hasPool) matchingFeatures++;
  }

  // Basement comparison
  if (subject.hasBasement !== undefined && comp.hasBasement !== undefined) {
    totalFeatures++;
    if (subject.hasBasement === comp.hasBasement) matchingFeatures++;
  }

  if (totalFeatures === 0) return 50; // Neutral if no features to compare

  return (matchingFeatures / totalFeatures) * 100;
}

// ============================================
// Main Similarity Calculation
// ============================================

/**
 * Calculate overall similarity score between subject and comparable
 *
 * @param subject Subject property
 * @param comparable Comparable property
 * @param weights Optional custom weights
 * @returns Complete similarity result
 */
export function calculateSimilarityScore(
  subject: SubjectProperty,
  comparable: ComparableProperty,
  weights: SimilarityWeights = DEFAULT_WEIGHTS
): SimilarityResult {
  const missingFactors: string[] = [];

  // Calculate distance
  const distanceMiles = calculateDistanceMiles(
    subject.latitude,
    subject.longitude,
    comparable.latitude,
    comparable.longitude
  );

  // Calculate individual factor scores
  const factorScores: FactorScores = {
    distance: calculateDistanceScore(distanceMiles),
    sqft: calculateSqftScore(subject.sqft, comparable.sqft),
    lotSize: calculateLotSizeScore(subject.lotSizeSqft, comparable.lotSizeSqft),
    bedrooms: calculateBedroomScore(subject.bedrooms, comparable.bedrooms),
    bathrooms: calculateBathroomScore(subject.bathrooms, comparable.bathrooms),
    age: calculateAgeScore(subject.yearBuilt, comparable.yearBuilt),
    recency: calculateRecencyScore(comparable.saleDate),
    propertyType: calculatePropertyTypeScore(subject.propertyType, comparable.propertyType),
    style: calculateStyleScore(subject.style, comparable.style),
    features: calculateFeaturesScore(subject, comparable),
  };

  // Track missing factors
  if (!subject.sqft || !comparable.sqft) missingFactors.push('sqft');
  if (!subject.lotSizeSqft || !comparable.lotSizeSqft) missingFactors.push('lotSize');
  if (!subject.bedrooms || !comparable.bedrooms) missingFactors.push('bedrooms');
  if (!subject.bathrooms || !comparable.bathrooms) missingFactors.push('bathrooms');
  if (!subject.yearBuilt || !comparable.yearBuilt) missingFactors.push('age');
  if (!subject.propertyType || !comparable.propertyType) missingFactors.push('propertyType');
  if (!subject.style || !comparable.style) missingFactors.push('style');

  // Calculate weighted contributions
  const factorContributions: FactorScores = {
    distance: factorScores.distance * weights.distance,
    sqft: factorScores.sqft * weights.sqft,
    lotSize: factorScores.lotSize * weights.lotSize,
    bedrooms: factorScores.bedrooms * weights.bedrooms,
    bathrooms: factorScores.bathrooms * weights.bathrooms,
    age: factorScores.age * weights.age,
    recency: factorScores.recency * weights.recency,
    propertyType: factorScores.propertyType * weights.propertyType,
    style: factorScores.style * weights.style,
    features: factorScores.features * weights.features,
  };

  // Calculate overall score
  const score = Object.values(factorContributions).reduce((sum, val) => sum + val, 0);

  // Calculate confidence based on available data
  const totalFactors = Object.keys(factorScores).length;
  const availableFactors = totalFactors - missingFactors.length;
  const confidence = (availableFactors / totalFactors) * 100;

  return {
    score: Math.round(score * 10) / 10,
    factorScores,
    factorContributions,
    confidence,
    missingFactors,
    distanceMiles: Math.round(distanceMiles * 100) / 100,
  };
}

/**
 * Calculate similarity scores for multiple comparables
 *
 * @param subject Subject property
 * @param comparables Array of comparable properties
 * @param weights Optional custom weights
 * @returns Array of comparables with similarity scores, sorted by score
 */
export function scoreComparables(
  subject: SubjectProperty,
  comparables: ComparableProperty[],
  weights: SimilarityWeights = DEFAULT_WEIGHTS
): ComparableProperty[] {
  return comparables
    .map((comp) => {
      const result = calculateSimilarityScore(subject, comp, weights);
      return {
        ...comp,
        distanceMiles: result.distanceMiles,
        similarityScore: result.score,
        factorScores: result.factorScores,
      };
    })
    .sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
}

/**
 * Filter comparables by minimum similarity threshold
 *
 * @param comparables Scored comparables
 * @param minScore Minimum similarity score (0-100)
 * @returns Filtered comparables
 */
export function filterByMinScore(
  comparables: ComparableProperty[],
  minScore: number = 50
): ComparableProperty[] {
  return comparables.filter((comp) => (comp.similarityScore || 0) >= minScore);
}

/**
 * Get top N most similar comparables
 *
 * @param comparables Scored comparables
 * @param count Number to return
 * @returns Top N comparables
 */
export function getTopComparables(
  comparables: ComparableProperty[],
  count: number = 5
): ComparableProperty[] {
  return comparables.slice(0, count);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get human-readable similarity description
 *
 * @param score Similarity score (0-100)
 * @returns Description string
 */
export function getSimilarityDescription(score: number): string {
  if (score >= 90) return 'Excellent match';
  if (score >= 80) return 'Very good match';
  if (score >= 70) return 'Good match';
  if (score >= 60) return 'Fair match';
  if (score >= 50) return 'Moderate match';
  if (score >= 40) return 'Weak match';
  return 'Poor match';
}

/**
 * Get the most significant difference between subject and comparable
 *
 * @param factorScores Individual factor scores
 * @returns The factor with lowest score
 */
export function getSignificantDifference(
  factorScores: FactorScores
): { factor: string; score: number } {
  let minFactor = 'distance';
  let minScore = factorScores.distance;

  for (const [factor, score] of Object.entries(factorScores)) {
    if (score < minScore) {
      minFactor = factor;
      minScore = score;
    }
  }

  return { factor: minFactor, score: minScore };
}

/**
 * Validate weights sum to 1.0
 *
 * @param weights Weights to validate
 * @returns True if valid
 */
export function validateWeights(weights: SimilarityWeights): boolean {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) < 0.01; // Allow small floating point error
}

/**
 * Normalize weights to sum to 1.0
 *
 * @param weights Weights to normalize
 * @returns Normalized weights
 */
export function normalizeWeights(weights: SimilarityWeights): SimilarityWeights {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum === 0) return DEFAULT_WEIGHTS;

  return {
    distance: weights.distance / sum,
    sqft: weights.sqft / sum,
    lotSize: weights.lotSize / sum,
    bedrooms: weights.bedrooms / sum,
    bathrooms: weights.bathrooms / sum,
    age: weights.age / sum,
    recency: weights.recency / sum,
    propertyType: weights.propertyType / sum,
    style: weights.style / sum,
    features: weights.features / sum,
  };
}
