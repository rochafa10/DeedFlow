/**
 * Location Scoring Utilities
 *
 * Calculates Walk Score, Transit Score, Bike Score, and School Rating
 * based on Geoapify amenities data.
 *
 * These are custom calculations inspired by official methodologies but
 * using available POI data from Geoapify.
 */

import { AmenitiesSummary, GeoapifyPlace } from '@/lib/api/services/geoapify-service';

/**
 * Location scores result
 */
export interface LocationScores {
  walkScore: number;      // 0-100
  transitScore: number;   // 0-100
  bikeScore: number;      // 0-100
  schoolRating: number;   // 0-10
  details: {
    walkScore: WalkScoreDetails;
    transitScore: TransitScoreDetails;
    bikeScore: BikeScoreDetails;
    schoolRating: SchoolRatingDetails;
  };
}

/**
 * Custom weight options for Walk Score calculation
 */
export interface WalkScoreWeights {
  grocery: number;      // Default: 30
  restaurant: number;   // Default: 25
  shopping: number;     // Default: 20
  healthcare: number;   // Default: 15
  entertainment: number; // Default: 10
}

/**
 * Custom weight options for Overall Location Score
 */
export interface OverallLocationWeights {
  geoapify?: {
    walk?: number;      // Default: 0.15 (15%)
    transit?: number;   // Default: 0.10 (10%)
    bike?: number;      // Default: 0.10 (10%)
    school?: number;    // Default: 0.25 (25%)
  };
  census?: {
    income?: number;        // Default: 0.10 (10%)
    homeownership?: number; // Default: 0.10 (10%)
    vacancy?: number;       // Default: 0.10 (10%)
    crime?: number;         // Default: 0.10 (10%)
  };
}

interface WalkScoreDetails {
  groceryScore: number;
  restaurantScore: number;
  shoppingScore: number;
  healthcareScore: number;
  entertainmentScore: number;
  nearestGroceryMeters: number | null;
  nearestRestaurantMeters: number | null;
}

interface TransitScoreDetails {
  stopsNearby: number;
  nearestStopMeters: number | null;
  hasFrequentService: boolean;
  transitDensity: number;
}

interface BikeScoreDetails {
  parksNearby: number;
  nearestParkMeters: number | null;
  recreationScore: number;
  infrastructureScore: number;
}

interface SchoolRatingDetails {
  schoolsNearby: number;
  nearestSchoolMeters: number | null;
  schoolDensity: number;
}

/**
 * Distance decay function
 * Returns a score from 0-1 based on distance, with closer = higher score
 * Uses exponential decay for realistic distance weighting
 */
function distanceDecay(distanceMeters: number | undefined, idealDistance: number = 400): number {
  if (!distanceMeters || distanceMeters <= 0) return 0;

  // Within ideal distance = full score
  if (distanceMeters <= idealDistance) return 1;

  // Exponential decay beyond ideal distance
  // At 2x ideal distance = ~0.37, at 3x = ~0.14, at 5x = ~0.02
  const decay = Math.exp(-(distanceMeters - idealDistance) / (idealDistance * 2));
  return Math.max(0, decay);
}

/**
 * Count-based score with diminishing returns
 * First few amenities matter most, then diminishing returns
 */
function countScore(count: number, idealCount: number, maxScore: number): number {
  if (count <= 0) return 0;

  // Logarithmic curve for diminishing returns
  // First amenity = big impact, subsequent ones = smaller impact
  const normalizedCount = Math.log(1 + count) / Math.log(1 + idealCount);
  return Math.min(maxScore, normalizedCount * maxScore);
}

/**
 * Calculate Walk Score (0-100)
 *
 * Based on:
 * - Distance to nearest grocery store (most important)
 * - Number and proximity of restaurants
 * - Shopping options
 * - Healthcare access
 * - Entertainment/services
 */
export function calculateWalkScore(
  amenities: AmenitiesSummary,
  customWeights?: Partial<WalkScoreWeights>
): { score: number; details: WalkScoreDetails } {
  const { counts, nearest } = amenities;

  // Weights for different amenity types (must sum to 100)
  const DEFAULT_WEIGHTS: WalkScoreWeights = {
    grocery: 30,      // Most essential for walkability
    restaurant: 25,   // Dining options
    shopping: 20,     // Retail access
    healthcare: 15,   // Medical services
    entertainment: 10 // Services/entertainment
  };

  const WEIGHTS = { ...DEFAULT_WEIGHTS, ...customWeights };

  // Grocery score (0-WEIGHTS.grocery points)
  // Distance-weighted + count bonus
  const nearestGroceryMeters = nearest.grocery_store?.distance || null;
  const groceryDistanceScore = nearestGroceryMeters
    ? distanceDecay(nearestGroceryMeters, 400) * (WEIGHTS.grocery * 0.67)  // ~67% for proximity
    : 0;
  const groceryCountScore = countScore(counts.grocery_stores, 5, WEIGHTS.grocery * 0.33);  // ~33% for variety
  const groceryScore = groceryDistanceScore + groceryCountScore;

  // Restaurant score (0-WEIGHTS.restaurant points)
  const restaurantCountScore = countScore(counts.restaurants, 20, WEIGHTS.restaurant);
  const nearestRestaurantMeters = null; // We don't track nearest restaurant

  // Shopping score (0-WEIGHTS.shopping points)
  const shoppingScore = countScore(counts.shopping, 15, WEIGHTS.shopping);

  // Healthcare score (0-WEIGHTS.healthcare points)
  const nearestHospitalMeters = nearest.hospital?.distance || null;
  const healthcareDistanceScore = nearestHospitalMeters
    ? distanceDecay(nearestHospitalMeters, 1000) * (WEIGHTS.healthcare * 0.53)  // ~53% for proximity
    : 0;
  const healthcareCountScore = countScore(counts.hospitals + counts.pharmacies, 5, WEIGHTS.healthcare * 0.47);
  const healthcareScore = healthcareDistanceScore + healthcareCountScore;

  // Entertainment/services score (0-WEIGHTS.entertainment points)
  const entertainmentScore = countScore(counts.banks + counts.gas_stations, 8, WEIGHTS.entertainment);

  const totalScore = Math.round(
    groceryScore + restaurantCountScore + shoppingScore + healthcareScore + entertainmentScore
  );

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    details: {
      groceryScore: Math.round(groceryScore),
      restaurantScore: Math.round(restaurantCountScore),
      shoppingScore: Math.round(shoppingScore),
      healthcareScore: Math.round(healthcareScore),
      entertainmentScore: Math.round(entertainmentScore),
      nearestGroceryMeters,
      nearestRestaurantMeters
    }
  };
}

/**
 * Calculate Transit Score (0-100)
 *
 * Based on:
 * - Number of transit stops nearby
 * - Distance to nearest transit
 * - Transit density (stops per sq km)
 */
export function calculateTransitScore(amenities: AmenitiesSummary): { score: number; details: TransitScoreDetails } {
  const { counts, radius_meters } = amenities;
  const transitStops = counts.public_transport;

  // No transit = 0
  if (transitStops === 0) {
    return {
      score: 0,
      details: {
        stopsNearby: 0,
        nearestStopMeters: null,
        hasFrequentService: false,
        transitDensity: 0
      }
    };
  }

  // Calculate transit density (stops per sq km)
  const radiusKm = radius_meters / 1000;
  const areaKmSq = Math.PI * radiusKm * radiusKm;
  const transitDensity = transitStops / areaKmSq;

  // Scoring tiers based on transit availability
  // Urban areas: 10+ stops = excellent, 5-10 = good, 1-5 = minimal
  let score = 0;

  // Base score from stop count (0-60 points)
  if (transitStops >= 20) {
    score = 60;  // Excellent transit coverage
  } else if (transitStops >= 10) {
    score = 40 + (transitStops - 10) * 2;  // 40-60
  } else if (transitStops >= 5) {
    score = 20 + (transitStops - 5) * 4;   // 20-40
  } else {
    score = transitStops * 4;               // 0-20
  }

  // Density bonus (0-40 points)
  // High density = stops are well distributed
  const densityScore = Math.min(40, transitDensity * 10);
  score += densityScore;

  // Estimate if area has frequent service (heuristic)
  const hasFrequentService = transitStops >= 10 && transitDensity > 2;

  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    details: {
      stopsNearby: transitStops,
      nearestStopMeters: null, // Would need separate query
      hasFrequentService,
      transitDensity: Math.round(transitDensity * 10) / 10
    }
  };
}

/**
 * Calculate Bike Score (0-100)
 *
 * Based on:
 * - Parks and green spaces (recreational biking)
 * - Flat commercial areas (practical biking destinations)
 * - Overall amenity density (more destinations = more bikeable)
 */
export function calculateBikeScore(amenities: AmenitiesSummary): { score: number; details: BikeScoreDetails } {
  const { counts, nearest, radius_meters } = amenities;

  // Parks are key for bike score (recreational riding)
  const parksNearby = counts.parks;
  const nearestParkMeters = nearest.park?.distance || null;

  // Recreation score (0-40 points) - parks and leisure
  let recreationScore = 0;
  if (nearestParkMeters) {
    recreationScore += distanceDecay(nearestParkMeters, 500) * 20;  // Proximity bonus
  }
  recreationScore += countScore(parksNearby, 5, 20);  // Count bonus

  // Infrastructure score (0-30 points) - based on overall density of destinations
  // More destinations nearby = more reasons to bike
  const totalAmenities = counts.restaurants + counts.shopping + counts.grocery_stores;
  const infrastructureScore = countScore(totalAmenities, 50, 30);

  // Transit integration (0-15 points) - bikes + transit work well together
  const transitIntegration = Math.min(15, counts.public_transport * 1.5);

  // Flat terrain bonus (0-15 points) - we can't measure this, use moderate default
  // Could be improved with elevation API data
  const terrainBonus = 8;  // Assume moderate terrain

  const totalScore = recreationScore + infrastructureScore + transitIntegration + terrainBonus;

  return {
    score: Math.min(100, Math.max(0, Math.round(totalScore))),
    details: {
      parksNearby,
      nearestParkMeters,
      recreationScore: Math.round(recreationScore),
      infrastructureScore: Math.round(infrastructureScore)
    }
  };
}

/**
 * Calculate School Rating (0-10)
 *
 * Based on:
 * - Number of schools nearby
 * - Distance to nearest school
 * - School density
 */
export function calculateSchoolRating(amenities: AmenitiesSummary): { score: number; details: SchoolRatingDetails } {
  const { counts, nearest, radius_meters } = amenities;
  const schoolsNearby = counts.schools;
  const nearestSchoolMeters = nearest.school?.distance || null;

  // No schools = low rating but not zero (schools may exist outside search radius)
  if (schoolsNearby === 0) {
    return {
      score: 3,  // Default baseline
      details: {
        schoolsNearby: 0,
        nearestSchoolMeters: null,
        schoolDensity: 0
      }
    };
  }

  // Calculate school density
  const radiusKm = radius_meters / 1000;
  const areaKmSq = Math.PI * radiusKm * radiusKm;
  const schoolDensity = schoolsNearby / areaKmSq;

  let score = 0;

  // Distance to nearest school (0-4 points)
  // Ideal: within 0.5 miles (~800m)
  if (nearestSchoolMeters) {
    if (nearestSchoolMeters <= 400) {
      score += 4;  // Very close
    } else if (nearestSchoolMeters <= 800) {
      score += 3;  // Walking distance
    } else if (nearestSchoolMeters <= 1600) {
      score += 2;  // ~1 mile
    } else {
      score += 1;  // Far but exists
    }
  }

  // Number of schools (0-4 points) - more options = better
  if (schoolsNearby >= 5) {
    score += 4;
  } else if (schoolsNearby >= 3) {
    score += 3;
  } else if (schoolsNearby >= 2) {
    score += 2;
  } else {
    score += 1;
  }

  // Density bonus (0-2 points)
  if (schoolDensity > 1) {
    score += 2;
  } else if (schoolDensity > 0.5) {
    score += 1;
  }

  return {
    score: Math.min(10, Math.max(1, Math.round(score))),
    details: {
      schoolsNearby,
      nearestSchoolMeters,
      schoolDensity: Math.round(schoolDensity * 100) / 100
    }
  };
}

/**
 * Calculate all location scores from amenities data
 */
export function calculateLocationScores(
  amenities: AmenitiesSummary,
  customWalkWeights?: Partial<WalkScoreWeights>
): LocationScores {
  const walkResult = calculateWalkScore(amenities, customWalkWeights);
  const transitResult = calculateTransitScore(amenities);
  const bikeResult = calculateBikeScore(amenities);
  const schoolResult = calculateSchoolRating(amenities);

  return {
    walkScore: walkResult.score,
    transitScore: transitResult.score,
    bikeScore: bikeResult.score,
    schoolRating: schoolResult.score,
    details: {
      walkScore: walkResult.details,
      transitScore: transitResult.details,
      bikeScore: bikeResult.details,
      schoolRating: schoolResult.details
    }
  };
}

/**
 * Get score label for display
 */
export function getWalkScoreLabel(score: number): string {
  if (score >= 90) return "Walker's Paradise";
  if (score >= 70) return "Very Walkable";
  if (score >= 50) return "Somewhat Walkable";
  if (score >= 25) return "Car-Dependent";
  return "Almost All Errands Require a Car";
}

export function getTransitScoreLabel(score: number): string {
  if (score >= 90) return "Excellent Transit";
  if (score >= 70) return "Excellent Transit";
  if (score >= 50) return "Good Transit";
  if (score >= 25) return "Some Transit";
  return "Minimal Transit";
}

export function getBikeScoreLabel(score: number): string {
  if (score >= 90) return "Biker's Paradise";
  if (score >= 70) return "Very Bikeable";
  if (score >= 50) return "Bikeable";
  return "Somewhat Bikeable";
}

export function getSchoolRatingLabel(score: number): string {
  if (score >= 9) return "Excellent";
  if (score >= 7) return "Good";
  if (score >= 5) return "Average";
  if (score >= 3) return "Below Average";
  return "Limited Options";
}

/**
 * Census Data for Location Scoring
 * Data from US Census Bureau ACS 5-Year Estimates
 */
export interface CensusDataForScoring {
  medianHouseholdIncome?: number | null;  // e.g., 60594
  homeownershipRate?: number | null;      // e.g., 72.4 (percentage)
  vacancyRate?: number | null;            // e.g., 9.4 (percentage)
  crimeRate?: 'low' | 'moderate' | 'high' | string | null;
}

/**
 * Overall Location Score (0-25 points)
 *
 * Enhanced scoring combining Geoapify amenities (60%) + Census demographics (40%):
 *
 * GEOAPIFY (60% total):
 * - Walk Score: 15% weight
 * - Transit Score: 10% weight
 * - Bike Score: 10% weight
 * - School Rating: 25% weight
 *
 * CENSUS DATA (40% total):
 * - Income Score: 10% (higher median income = better investment area)
 * - Homeownership: 10% (higher = more stable neighborhood)
 * - Vacancy Rate: 10% (lower = healthier rental/resale market)
 * - Crime Rate: 10% (lower = safer, better appreciation)
 */
export interface OverallLocationScore {
  score: number;      // 0-25
  maxScore: number;   // 25
  grade: string;      // A+, A, A-, B+, etc.
  percentage: number; // 0-100
  breakdown?: {
    geoapifyScore: number;  // 0-60
    censusScore: number;    // 0-40
  };
}

/**
 * Score median household income (0-100)
 * Higher income areas typically have better appreciation and lower risk
 */
function scoreIncome(income: number | null | undefined): number {
  if (!income || income <= 0) return 50; // Default to average if unknown

  // Scoring tiers based on US median (~$75k) and investment desirability
  if (income >= 100000) return 100;  // High income area
  if (income >= 85000) return 90;
  if (income >= 75000) return 80;    // Above national median
  if (income >= 60000) return 70;
  if (income >= 50000) return 60;    // Near median
  if (income >= 40000) return 45;
  if (income >= 30000) return 30;
  return 20; // Very low income area
}

/**
 * Score homeownership rate (0-100)
 * Higher homeownership = more stable neighborhood, better maintained properties
 */
function scoreHomeownership(rate: number | null | undefined): number {
  if (rate === null || rate === undefined) return 50; // Default if unknown

  // US average homeownership is ~65%
  if (rate >= 80) return 100;  // Very stable neighborhood
  if (rate >= 70) return 85;
  if (rate >= 65) return 75;   // Above average
  if (rate >= 55) return 60;
  if (rate >= 45) return 45;
  if (rate >= 35) return 30;
  return 20; // Very low homeownership (transient area)
}

/**
 * Score vacancy rate (0-100)
 * Lower vacancy = healthier market, easier to rent/sell
 */
function scoreVacancy(rate: number | null | undefined): number {
  if (rate === null || rate === undefined) return 50; // Default if unknown

  // US average vacancy is ~6-7% for housing
  if (rate <= 3) return 100;   // Very tight market
  if (rate <= 5) return 90;
  if (rate <= 7) return 80;    // Healthy market
  if (rate <= 10) return 65;
  if (rate <= 15) return 45;
  if (rate <= 20) return 30;
  return 15; // Very high vacancy (distressed area)
}

/**
 * Score crime rate (0-100)
 * Lower crime = safer investment, better appreciation
 */
function scoreCrime(crimeRate: string | null | undefined): number {
  if (!crimeRate) return 50; // Default if unknown

  const normalized = crimeRate.toLowerCase().trim();

  if (normalized === 'low' || normalized === 'low risk' || normalized === 'very low') {
    return 100;
  }
  if (normalized === 'moderate' || normalized === 'medium' || normalized === 'average') {
    return 60;
  }
  if (normalized === 'high' || normalized === 'high risk' || normalized === 'elevated') {
    return 25;
  }
  if (normalized === 'very high' || normalized === 'severe') {
    return 10;
  }

  return 50; // Unknown value, default to average
}

/**
 * Calculate overall location score combining Geoapify + Census data
 */
export function calculateOverallLocationScore(
  locationScores: LocationScores,
  censusData?: CensusDataForScoring | null,
  customWeights?: OverallLocationWeights
): OverallLocationScore {
  const { walkScore, transitScore, bikeScore, schoolRating } = locationScores;

  // DEFAULT GEOAPIFY WEIGHTS (60% total)
  const DEFAULT_GEOAPIFY_WEIGHTS = {
    walk: 0.15,      // 15% - walkability
    transit: 0.10,   // 10% - public transit
    bike: 0.10,      // 10% - bikeability
    school: 0.25     // 25% - schools (major for resale)
  };

  // DEFAULT CENSUS WEIGHTS (40% total)
  const DEFAULT_CENSUS_WEIGHTS = {
    income: 0.10,        // 10% - median income
    homeownership: 0.10, // 10% - stability indicator
    vacancy: 0.10,       // 10% - market health
    crime: 0.10          // 10% - safety
  };

  // Merge custom weights with defaults
  const GEOAPIFY_WEIGHTS = {
    ...DEFAULT_GEOAPIFY_WEIGHTS,
    ...(customWeights?.geoapify || {})
  };

  const CENSUS_WEIGHTS = {
    ...DEFAULT_CENSUS_WEIGHTS,
    ...(customWeights?.census || {})
  };

  // Normalize Geoapify scores to 0-100 scale
  const normalizedWalk = walkScore;           // Already 0-100
  const normalizedTransit = transitScore;     // Already 0-100
  const normalizedBike = bikeScore;           // Already 0-100
  const normalizedSchool = schoolRating * 10; // 0-10 -> 0-100

  // Calculate Geoapify component (0-60 points worth)
  const geoapifyPercentage =
    (normalizedWalk * GEOAPIFY_WEIGHTS.walk) +
    (normalizedTransit * GEOAPIFY_WEIGHTS.transit) +
    (normalizedBike * GEOAPIFY_WEIGHTS.bike) +
    (normalizedSchool * GEOAPIFY_WEIGHTS.school);

  // Calculate Census component (0-40 points worth)
  let censusPercentage = 0;
  if (censusData) {
    const incomeScore = scoreIncome(censusData.medianHouseholdIncome);
    const homeownershipScore = scoreHomeownership(censusData.homeownershipRate);
    const vacancyScore = scoreVacancy(censusData.vacancyRate);
    const crimeScore = scoreCrime(censusData.crimeRate);

    censusPercentage =
      (incomeScore * CENSUS_WEIGHTS.income) +
      (homeownershipScore * CENSUS_WEIGHTS.homeownership) +
      (vacancyScore * CENSUS_WEIGHTS.vacancy) +
      (crimeScore * CENSUS_WEIGHTS.crime);
  } else {
    // If no census data, use neutral scores (50) for census factors
    censusPercentage = 50 * (CENSUS_WEIGHTS.income + CENSUS_WEIGHTS.homeownership +
                             CENSUS_WEIGHTS.vacancy + CENSUS_WEIGHTS.crime);
  }

  // Total percentage (0-100)
  const percentage = Math.round(geoapifyPercentage + censusPercentage);

  // Convert to 0-25 scale
  const score = Math.round((percentage / 100) * 25);

  // Calculate letter grade
  const grade = getLocationGrade(percentage);

  return {
    score: Math.min(25, Math.max(0, score)),
    maxScore: 25,
    grade,
    percentage,
    breakdown: {
      geoapifyScore: Math.round(geoapifyPercentage),
      censusScore: Math.round(censusPercentage)
    }
  };
}

/**
 * Convert percentage to letter grade
 */
function getLocationGrade(percentage: number): string {
  if (percentage >= 97) return "A+";
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}

/**
 * Get description for overall location score
 */
export function getOverallLocationLabel(score: number, maxScore: number): string {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return "Excellent Location";
  if (percentage >= 75) return "Very Good Location";
  if (percentage >= 60) return "Good Location";
  if (percentage >= 40) return "Fair Location";
  return "Below Average Location";
}
