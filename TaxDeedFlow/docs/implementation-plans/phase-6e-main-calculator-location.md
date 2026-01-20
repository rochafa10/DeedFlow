# Phase 6E: Main Calculator & Location Score

## Overview

This phase implements the main `InvestmentScoreCalculator` class that orchestrates all scoring components, along with the Location Score calculation module (25 points maximum).

---

## InvestmentScoreCalculator Class Structure

```typescript
// src/lib/analysis/scoring/InvestmentScoreCalculator.ts

import { calculateLocationScore } from './locationScore';
import { calculateRiskScore } from './riskScore';
import { calculateFinancialScore } from './financialScore';
import { calculateMarketScore } from './marketScore';
import { calculateProfitScore } from './profitScore';
import { calculateMultiFactorConfidence, DataAvailability } from './confidence';
import { applyRegionalAdjustments, REGIONAL_ADJUSTMENTS } from './regionalAdjustments';
import { detectPropertyType, PROPERTY_TYPE_WEIGHTS } from './propertyTypeScoring';
import { handleEdgeCases, EdgeCaseResult } from './edgeCases';
import { DEFAULT_CALIBRATION, applyCalibration } from './calibration';
import type {
  ScoreBreakdown,
  PropertyData,
  ExternalData,
  PropertyType,
  ScoringWarning,
  GradeResult,
  ScoreResult,
  CachedScore,
  CalculatorConfig,
  WalkScoreResponse,
  CrimeDataResponse,
  SchoolRatingsResponse,
  AmenityResponse,
} from '@/types/scoring';

const SCORING_VERSION = '2.0.0';

/**
 * Score caching interface for performance optimization
 */
interface ScoreCache {
  /**
   * Retrieve a cached score by property ID
   */
  get(propertyId: string): CachedScore | null;

  /**
   * Store a score in cache with optional TTL (time-to-live)
   * @param propertyId - Property identifier
   * @param score - Score result to cache
   * @param ttl - Time-to-live in seconds (default: 3600 = 1 hour)
   */
  set(propertyId: string, score: ScoreResult, ttl?: number): void;

  /**
   * Invalidate a cached score (e.g., when property data changes)
   */
  invalidate(propertyId: string): void;

  /**
   * Clear all cached scores
   */
  clear(): void;

  /**
   * Get cache statistics
   */
  getStats(): { hits: number; misses: number; size: number };
}

/**
 * Rate limiter for external API calls
 */
interface RateLimiter {
  /**
   * Check if we can make an API call
   */
  canProceed(apiName: string): boolean;

  /**
   * Record an API call
   */
  recordCall(apiName: string): void;

  /**
   * Get remaining calls for an API within the current window
   */
  getRemainingCalls(apiName: string): number;

  /**
   * Get time until rate limit resets (in seconds)
   */
  getResetTime(apiName: string): number;

  /**
   * Configure rate limits for an API
   */
  configure(apiName: string, maxCalls: number, windowSeconds: number): void;
}

/**
 * External API client for fetching location and market data
 */
interface ExternalApiClient {
  fetchWalkScore(latitude: number, longitude: number, address: string): Promise<WalkScoreResponse>;
  fetchCrimeData(latitude: number, longitude: number): Promise<CrimeDataResponse>;
  fetchSchoolRatings(latitude: number, longitude: number): Promise<SchoolRatingsResponse>;
  fetchNearbyAmenities(latitude: number, longitude: number): Promise<AmenityResponse>;
  fetchTransitScore(latitude: number, longitude: number, address: string): Promise<{ score: number }>;
}

/**
 * Configuration for the InvestmentScoreCalculator
 */
interface CalculatorConfig {
  /** Enable/disable caching */
  enableCache: boolean;
  /** Cache TTL in seconds */
  cacheTtl: number;
  /** Enable/disable rate limiting */
  enableRateLimiting: boolean;
  /** Calibration configuration */
  calibration: typeof DEFAULT_CALIBRATION;
  /** API timeout in milliseconds */
  apiTimeout: number;
  /** Retry configuration */
  retryConfig: {
    maxRetries: number;
    backoffMs: number;
  };
}

/**
 * Main Investment Score Calculator class
 * Orchestrates all scoring components with caching and rate limiting
 */
export class InvestmentScoreCalculator {
  private cache: ScoreCache;
  private rateLimiter: RateLimiter;
  private externalApiClient: ExternalApiClient;
  private config: CalculatorConfig;

  constructor(
    config: Partial<CalculatorConfig>,
    cache: ScoreCache,
    rateLimiter: RateLimiter,
    externalApiClient: ExternalApiClient
  ) {
    this.config = {
      enableCache: true,
      cacheTtl: 3600, // 1 hour default
      enableRateLimiting: true,
      calibration: DEFAULT_CALIBRATION,
      apiTimeout: 10000, // 10 seconds
      retryConfig: {
        maxRetries: 3,
        backoffMs: 1000,
      },
      ...config,
    };
    this.cache = cache;
    this.rateLimiter = rateLimiter;
    this.externalApiClient = externalApiClient;

    // Configure default rate limits
    this.initializeRateLimits();
  }

  private initializeRateLimits(): void {
    // Walk Score: 5000/day free tier, ~200/hour to be safe
    this.rateLimiter.configure('walkScore', 200, 3600);
    // FBI Crime API: generous limits
    this.rateLimiter.configure('crimeData', 500, 3600);
    // GreatSchools: 1000/day
    this.rateLimiter.configure('schoolRatings', 40, 3600);
    // Google Places: 1000/day free tier
    this.rateLimiter.configure('nearbyAmenities', 40, 3600);
  }

  /**
   * Main scoring method - calculates investment score for a property
   */
  async calculateScore(propertyId: string): Promise<ScoreResult> {
    // Check cache first
    if (this.config.enableCache) {
      const cached = this.cache.get(propertyId);
      if (cached && !this.isCacheExpired(cached)) {
        return cached.score;
      }
    }

    // Fetch property data
    const property = await this.fetchPropertyData(propertyId);
    if (!property) {
      throw new Error(`Property not found: ${propertyId}`);
    }

    // Fetch external data with rate limiting
    const externalData = await this.fetchExternalData(property);

    // Calculate the score
    const score = await this.calculatePropertyScore({
      property,
      externalData,
      calibrationConfig: this.config.calibration,
    });

    // Cache the result
    if (this.config.enableCache) {
      this.cache.set(propertyId, score, this.config.cacheTtl);
    }

    return score;
  }

  /**
   * Fetch external data with rate limiting and error handling
   */
  private async fetchExternalData(property: PropertyData): Promise<ExternalData> {
    const externalData: ExternalData = {};
    const { latitude, longitude } = property;

    if (!latitude || !longitude) {
      return externalData;
    }

    // Fetch data in parallel, respecting rate limits
    const fetchPromises: Promise<void>[] = [];

    // Walk Score
    if (this.rateLimiter.canProceed('walkScore')) {
      fetchPromises.push(
        this.externalApiClient
          .fetchWalkScore(latitude, longitude, property.propertyAddress || '')
          .then((data) => {
            externalData.walkScore = data;
            this.rateLimiter.recordCall('walkScore');
          })
          .catch((err) => console.warn('Walk Score fetch failed:', err))
      );
    }

    // Crime Data
    if (this.rateLimiter.canProceed('crimeData')) {
      fetchPromises.push(
        this.externalApiClient
          .fetchCrimeData(latitude, longitude)
          .then((data) => {
            externalData.crimeData = data;
            this.rateLimiter.recordCall('crimeData');
          })
          .catch((err) => console.warn('Crime data fetch failed:', err))
      );
    }

    // School Ratings
    if (this.rateLimiter.canProceed('schoolRatings')) {
      fetchPromises.push(
        this.externalApiClient
          .fetchSchoolRatings(latitude, longitude)
          .then((data) => {
            externalData.schoolRatings = data;
            this.rateLimiter.recordCall('schoolRatings');
          })
          .catch((err) => console.warn('School ratings fetch failed:', err))
      );
    }

    // Nearby Amenities
    if (this.rateLimiter.canProceed('nearbyAmenities')) {
      fetchPromises.push(
        this.externalApiClient
          .fetchNearbyAmenities(latitude, longitude)
          .then((data) => {
            externalData.nearbyAmenities = data;
            this.rateLimiter.recordCall('nearbyAmenities');
          })
          .catch((err) => console.warn('Amenities fetch failed:', err))
      );
    }

    await Promise.allSettled(fetchPromises);

    return externalData;
  }

  private async fetchPropertyData(propertyId: string): Promise<PropertyData | null> {
    // Implementation would fetch from database
    // This is a placeholder for the actual implementation
    throw new Error('fetchPropertyData must be implemented');
  }

  private isCacheExpired(cached: CachedScore): boolean {
    const now = Date.now();
    const cacheAge = now - cached.cachedAt.getTime();
    return cacheAge > this.config.cacheTtl * 1000;
  }

  /**
   * Invalidate cache for a specific property
   */
  invalidateCache(propertyId: string): void {
    this.cache.invalidate(propertyId);
  }

  /**
   * Get rate limiter status for monitoring
   */
  getRateLimitStatus(): Record<string, { remaining: number; resetIn: number }> {
    return {
      walkScore: {
        remaining: this.rateLimiter.getRemainingCalls('walkScore'),
        resetIn: this.rateLimiter.getResetTime('walkScore'),
      },
      crimeData: {
        remaining: this.rateLimiter.getRemainingCalls('crimeData'),
        resetIn: this.rateLimiter.getResetTime('crimeData'),
      },
      schoolRatings: {
        remaining: this.rateLimiter.getRemainingCalls('schoolRatings'),
        resetIn: this.rateLimiter.getResetTime('schoolRatings'),
      },
      nearbyAmenities: {
        remaining: this.rateLimiter.getRemainingCalls('nearbyAmenities'),
        resetIn: this.rateLimiter.getResetTime('nearbyAmenities'),
      },
    };
  }

  // ... calculatePropertyScore method below
}
```

---

## API Response Type Definitions

```typescript
// src/types/scoring/externalApis.ts

/**
 * Walk Score API Response
 * @see https://www.walkscore.com/professional/api.php
 */
export interface WalkScoreResponse {
  /** Walk Score (0-100) */
  score: number;
  /** Text description of the score */
  description: string;
  /** Walk Score logo URL */
  logo_url?: string;
  /** More info URL */
  more_info_link?: string;
  /** Transit Score (0-100) if available */
  transit_score?: number;
  /** Bike Score (0-100) if available */
  bike_score?: number;
  /** Status code */
  status: number;
  /** Timestamp of data */
  updated?: string;
}

/**
 * FBI Crime Data API Response
 * @see https://crime-data-explorer.fr.cloud.gov/pages/docApi
 */
export interface CrimeDataResponse {
  /** Crime index (0-100, where 100 is highest crime) */
  index: number;
  /** Letter grade (A-F) */
  grade: string;
  /** Violent crime rate per 100,000 */
  violentCrimeRate?: number;
  /** Property crime rate per 100,000 */
  propertyCrimeRate?: number;
  /** Comparison to national average (percentage) */
  nationalComparison?: number;
  /** Year of data */
  dataYear?: number;
  /** Source agency */
  source?: string;
  /** Detailed crime breakdown */
  breakdown?: {
    murder?: number;
    rape?: number;
    robbery?: number;
    aggravatedAssault?: number;
    burglary?: number;
    larceny?: number;
    motorVehicleTheft?: number;
    arson?: number;
  };
}

/**
 * GreatSchools API Response
 * @see https://www.greatschools.org/api/request-api-key
 */
export interface SchoolRatingsResponse {
  /** Average rating of nearby schools (1-10) */
  averageRating: number;
  /** Number of schools within search radius */
  nearbySchools: number;
  /** List of individual schools */
  schools?: Array<{
    /** School name */
    name: string;
    /** GreatSchools rating (1-10) */
    rating: number;
    /** School type (public, private, charter) */
    type: 'public' | 'private' | 'charter';
    /** Grade levels served */
    gradeLevels: string;
    /** Distance in miles */
    distance: number;
    /** School ID for linking */
    gsId?: string;
  }>;
  /** Best elementary school rating */
  bestElementary?: number;
  /** Best middle school rating */
  bestMiddle?: number;
  /** Best high school rating */
  bestHigh?: number;
}

/**
 * Google Places API Response (for amenities)
 * @see https://developers.google.com/maps/documentation/places/web-service/overview
 */
export interface AmenityResponse {
  /** Total count of amenities found */
  count: number;
  /** Categories of amenities found */
  categories: string[];
  /** Detailed amenity breakdown by category */
  byCategory?: {
    groceryStores?: number;
    restaurants?: number;
    cafes?: number;
    banks?: number;
    gyms?: number;
    parks?: number;
    hospitals?: number;
    pharmacies?: number;
    gasStations?: number;
    shoppingCenters?: number;
  };
  /** Search radius used (in meters) */
  searchRadius?: number;
  /** Notable nearby places */
  notable?: Array<{
    name: string;
    type: string;
    rating?: number;
    distance: number;
  }>;
}

/**
 * CachedScore type for the cache interface
 */
export interface CachedScore {
  /** The cached score result */
  score: ScoreResult;
  /** When the score was cached */
  cachedAt: Date;
  /** Property ID for reference */
  propertyId: string;
  /** TTL remaining (computed) */
  ttlRemaining?: number;
}
```

---

## Main Scoring Calculator

```typescript
// src/lib/analysis/scoring/index.ts

import { calculateLocationScore } from './locationScore';
import { calculateRiskScore } from './riskScore';
import { calculateFinancialScore } from './financialScore';
import { calculateMarketScore } from './marketScore';
import { calculateProfitScore } from './profitScore';
import { calculateMultiFactorConfidence, DataAvailability } from './confidence';
import { applyRegionalAdjustments, REGIONAL_ADJUSTMENTS } from './regionalAdjustments';
import { detectPropertyType, PROPERTY_TYPE_WEIGHTS } from './propertyTypeScoring';
import { handleEdgeCases } from './edgeCases';
import { DEFAULT_CALIBRATION, applyCalibration } from './calibration';
import type {
  ScoreBreakdown,
  PropertyData,
  ExternalData,
  PropertyType,
  ScoringWarning,
  GradeResult,
} from '@/types/scoring';

const SCORING_VERSION = '2.0.0';

interface ScoringInput {
  property: PropertyData;
  externalData: ExternalData;
  calibrationConfig?: CalibrationConfig;
}

/**
 * Main property scoring function
 *
 * ORCHESTRATION ORDER:
 * 1. Fetch property data
 * 2. Check data availability
 * 3. Detect edge cases EARLY
 * 4. If critical edge case (landlocked, condemned), return early with low score
 * 5. Calculate category scores with edge case context
 * 6. Apply property type weights
 * 7. Apply regional adjustments
 * 8. Apply edge case score adjustments
 * 9. Calculate total score
 * 10. Calculate grade
 * 11. Calculate confidence
 * 12. Add warnings and return
 */
export async function calculatePropertyScore(
  input: ScoringInput
): Promise<ScoreBreakdown> {
  const { property, externalData, calibrationConfig = DEFAULT_CALIBRATION } = input;
  const warnings: ScoringWarning[] = [];

  // Step 1: Check data availability first
  const availability = assessDataAvailability(property, externalData);

  // Step 2: Detect property type
  const propertyType = detectPropertyType(property, externalData);
  if (propertyType === 'unknown') {
    warnings.push({
      severity: 'warning',
      category: 'general',
      message: 'Property type could not be determined',
      recommendation: 'Verify property classification for accurate scoring',
    });
  }

  // Step 3: Check for edge cases EARLY (critical change in orchestration order)
  const edgeCaseResult = handleEdgeCases(property, externalData);
  if (edgeCaseResult.isEdgeCase) {
    warnings.push(...edgeCaseResult.warnings);
  }

  // Step 4: EARLY RETURN for critical edge cases
  // Landlocked, condemned, environmental hazard properties should return immediately
  // with a low score to avoid wasting API calls
  if (edgeCaseResult.isEdgeCase && edgeCaseResult.severity === 'critical') {
    const criticalResult = createCriticalEdgeCaseResult(
      property,
      propertyType,
      edgeCaseResult,
      warnings,
      availability
    );
    return criticalResult;
  }

  // Step 5: Calculate base category scores (with edge case context passed in)
  const [location, risk, financial, market, profit] = await Promise.all([
    calculateLocationScore(property, externalData, propertyType, edgeCaseResult),
    calculateRiskScore(property, externalData, propertyType, edgeCaseResult),
    calculateFinancialScore(property, externalData, propertyType, edgeCaseResult),
    calculateMarketScore(property, externalData, propertyType, edgeCaseResult),
    calculateProfitScore(property, externalData, propertyType, edgeCaseResult),
  ]);

  // Step 6: Apply property type weights
  const typeWeights = PROPERTY_TYPE_WEIGHTS[propertyType];
  const weightedScores = {
    location: location.score * typeWeights.location,
    risk: risk.score * typeWeights.risk,
    financial: financial.score * typeWeights.financial,
    market: market.score * typeWeights.market,
    profit: profit.score * typeWeights.profit,
  };

  // Step 7: Collect regional adjustments
  const regionalAdjustments: RegionalAdjustment[] = [];
  if (property.state && REGIONAL_ADJUSTMENTS[property.state]) {
    regionalAdjustments.push(REGIONAL_ADJUSTMENTS[property.state]);
  }

  // Step 8: Apply edge case score adjustments (for non-critical edge cases)
  for (const adjustment of edgeCaseResult.scoreAdjustments) {
    const category = adjustment.appliedTo as keyof typeof weightedScores;
    if (weightedScores[category] !== undefined) {
      weightedScores[category] *= adjustment.factor;
    }
  }

  // Step 9: Calculate total score with calibration
  const totalScore = Math.round(
    (weightedScores.location +
      weightedScores.risk +
      weightedScores.financial +
      weightedScores.market +
      weightedScores.profit) * 10
  ) / 10;

  // Step 10: Calculate grade using unified method
  const gradeResult = calculateGrade(totalScore);

  // Step 11: Calculate confidence
  const confidenceLevel = calculateMultiFactorConfidence(
    availability,
    [
      { category: 'location', confidence: location.confidence, weight: 1 },
      { category: 'risk', confidence: risk.confidence, weight: 1 },
      { category: 'financial', confidence: financial.confidence, weight: 1.2 },
      { category: 'market', confidence: market.confidence, weight: 1 },
      { category: 'profit', confidence: profit.confidence, weight: 1.2 },
    ],
    propertyType
  );

  // Step 12: Add confidence-based warnings
  if (confidenceLevel.overall < 50) {
    warnings.push({
      severity: 'critical',
      category: 'confidence',
      message: `Low confidence score (${confidenceLevel.overall}%)`,
      recommendation: 'Gather more data before making investment decision',
    });
  }

  return {
    totalScore,
    gradeResult,
    confidenceLevel,
    location,
    risk,
    financial,
    market,
    profit,
    scoringVersion: SCORING_VERSION,
    calculatedAt: new Date(),
    propertyType,
    regionalAdjustments,
    warnings,
    edgeCaseResult: edgeCaseResult.isEdgeCase ? edgeCaseResult : undefined,
  };
}

/**
 * Create a result for critical edge cases (landlocked, condemned, etc.)
 * Returns immediately with minimal processing to save API calls
 */
function createCriticalEdgeCaseResult(
  property: PropertyData,
  propertyType: PropertyType,
  edgeCaseResult: EdgeCaseResult,
  warnings: ScoringWarning[],
  availability: DataAvailability
): ScoreBreakdown {
  // Critical edge cases get very low scores
  const criticalScore = 5; // Out of 125

  // Add critical warning
  warnings.push({
    severity: 'critical',
    category: 'edge_case',
    message: `Critical issue detected: ${edgeCaseResult.reason}`,
    recommendation: edgeCaseResult.recommendation || 'This property is not recommended for investment',
  });

  // Create minimal score breakdown
  const minimalComponent = {
    score: 1,
    maxScore: 25,
    confidence: 100, // High confidence that this is a bad investment
    dataCompleteness: 0,
    components: [],
    notes: [`Scored low due to: ${edgeCaseResult.reason}`],
    adjustments: [],
  };

  return {
    totalScore: criticalScore,
    gradeResult: calculateGrade(criticalScore),
    confidenceLevel: {
      overall: 90, // High confidence in the negative assessment
      byCategory: {
        location: 90,
        risk: 100, // We're very confident about the risk
        financial: 50,
        market: 50,
        profit: 50,
      },
      factors: ['Critical edge case identified'],
    },
    location: minimalComponent,
    risk: { ...minimalComponent, score: 0, notes: [`Critical risk: ${edgeCaseResult.reason}`] },
    financial: minimalComponent,
    market: minimalComponent,
    profit: { ...minimalComponent, score: 0 },
    scoringVersion: SCORING_VERSION,
    calculatedAt: new Date(),
    propertyType,
    regionalAdjustments: [],
    warnings,
    edgeCaseResult,
    earlyExit: true,
    earlyExitReason: edgeCaseResult.reason,
  };
}
```

---

## Grade Determination

```typescript
/**
 * Unified grade calculation
 */
function calculateGrade(totalScore: number): GradeResult {
  const percentage = (totalScore / 125) * 100;

  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  let thresholdMet: number;
  let description: string;

  if (percentage >= 80) {
    grade = 'A';
    thresholdMet = 100;
    description = 'Excellent investment opportunity';
  } else if (percentage >= 60) {
    grade = 'B';
    thresholdMet = 75;
    description = 'Good investment with minor concerns';
  } else if (percentage >= 40) {
    grade = 'C';
    thresholdMet = 50;
    description = 'Average investment, proceed with caution';
  } else if (percentage >= 20) {
    grade = 'D';
    thresholdMet = 25;
    description = 'Below average, significant concerns';
  } else {
    grade = 'F';
    thresholdMet = 0;
    description = 'Poor investment, not recommended';
  }

  return { grade, percentage, thresholdMet, description };
}
```

### Grade Thresholds

| Grade | Percentage Range | Score Range (0-125) | Description |
|-------|------------------|---------------------|-------------|
| A | 80-100% | 100-125 | Excellent investment opportunity |
| B | 60-79% | 75-99 | Good investment with minor concerns |
| C | 40-59% | 50-74 | Average investment, proceed with caution |
| D | 20-39% | 25-49 | Below average, significant concerns |
| F | 0-19% | 0-24 | Poor investment, not recommended |

---

## Data Availability Assessment

```typescript
/**
 * Assess data availability for confidence calculation
 */
function assessDataAvailability(
  property: PropertyData,
  externalData: ExternalData
): DataAvailability {
  return {
    hasPropertyAddress: !!property.propertyAddress,
    hasAssessedValue: !!property.assessedValue && property.assessedValue > 0,
    hasMarketValue: !!externalData.marketValue && externalData.marketValue > 0,
    hasYearBuilt: !!property.yearBuilt,
    hasBuildingSqft: !!property.buildingSqft && property.buildingSqft > 0,
    hasLotSize: !!(property.lotSizeSqft || property.lotSizeAcres),
    hasLocationData: !!(externalData.walkScore || externalData.crimeData),
    hasRiskData: !!(externalData.fema || externalData.usgs),
    hasMarketData: !!externalData.marketData,
    hasComparables: !!(externalData.comparables && externalData.comparables.length > 0),
    hasRentEstimates: !!externalData.rentEstimate,
    dataAge: determineDataAge(externalData),
    sourceReliability: determineSourceReliability(externalData),
    conflictingData: detectConflictingData(property, externalData),
  };
}

function determineDataAge(externalData: ExternalData): DataAvailability['dataAge'] {
  const now = new Date();
  const dataDate = externalData.lastUpdated || externalData.fetchedAt;

  if (!dataDate) return 'unknown';

  const daysSinceUpdate = Math.floor(
    (now.getTime() - new Date(dataDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceUpdate < 7) return 'fresh';
  if (daysSinceUpdate < 30) return 'recent';
  return 'stale';
}

function determineSourceReliability(
  externalData: ExternalData
): DataAvailability['sourceReliability'] {
  // Check for high-reliability sources
  if (externalData.fema && externalData.census && externalData.marketData) {
    return 'high';
  }
  if (externalData.marketData || externalData.fema) {
    return 'medium';
  }
  return 'low';
}

function detectConflictingData(
  property: PropertyData,
  externalData: ExternalData
): boolean {
  // Check for major value conflicts
  if (property.assessedValue && externalData.marketValue) {
    const ratio = property.assessedValue / externalData.marketValue;
    // Flag if assessed is > 2x or < 0.25x market
    if (ratio > 2 || ratio < 0.25) {
      return true;
    }
  }

  // Check for conflicting property type info
  if (property.propertyType && externalData.regrid?.propertyType) {
    if (property.propertyType !== externalData.regrid.propertyType) {
      // Allow some flexibility
      const normalized1 = property.propertyType.toLowerCase();
      const normalized2 = externalData.regrid.propertyType.toLowerCase();
      if (!normalized1.includes(normalized2) && !normalized2.includes(normalized1)) {
        return true;
      }
    }
  }

  return false;
}
```

---

## Location Score Calculator (25 Points Maximum)

```typescript
// src/lib/analysis/scoring/locationScore.ts

import type {
  LocationScore,
  ComponentScore,
  PropertyData,
  ExternalData,
  PropertyType,
  EdgeCaseResult,
} from '@/types/scoring';
import { handleMissingData, MISSING_DATA_CONFIG } from './missingDataHandler';
import { applyRegionalAdjustments } from './regionalAdjustments';
import { getComponentWeightAdjustment } from './propertyTypeScoring';

/**
 * Note: edgeCaseContext is passed in so location scoring can:
 * 1. Skip expensive API calls if property is already flagged
 * 2. Add appropriate notes/warnings about edge case impacts
 * 3. Adjust confidence based on edge case severity
 */

export async function calculateLocationScore(
  property: PropertyData,
  externalData: ExternalData,
  propertyType: PropertyType,
  edgeCaseContext?: EdgeCaseResult
): Promise<LocationScore> {
  const components: ComponentScore[] = [];
  const notes: string[] = [];
  let totalConfidence = 0;
  let validComponentCount = 0;
  let dataCompleteness = 0;
  let maxDataCompleteness = 5;

  // 1. Walkability Score (0-5 points)
  const walkability = calculateWalkabilityComponent(
    externalData.walkScore,
    property.state,
    propertyType
  );
  components.push(walkability);
  if (walkability.rawValue !== null) {
    dataCompleteness++;
    totalConfidence += walkability.confidence;
    validComponentCount++;
  }

  // 2. Crime Safety (0-5 points)
  const crime = calculateCrimeComponent(
    externalData.crimeData,
    property.state,
    propertyType
  );
  components.push(crime);
  if (crime.rawValue !== null) {
    dataCompleteness++;
    totalConfidence += crime.confidence;
    validComponentCount++;
  } else {
    notes.push(crime.description);
  }

  // 3. School Quality (0-5 points)
  const schools = calculateSchoolComponent(
    externalData.schoolRatings,
    property.state,
    propertyType
  );
  components.push(schools);
  if (schools.rawValue !== null) {
    dataCompleteness++;
    totalConfidence += schools.confidence;
    validComponentCount++;
  } else {
    notes.push(schools.description);
  }

  // 4. Amenities (0-5 points)
  const amenities = calculateAmenityComponent(
    externalData.nearbyAmenities,
    property.state,
    propertyType
  );
  components.push(amenities);
  if (amenities.rawValue !== null) {
    dataCompleteness++;
    totalConfidence += amenities.confidence;
    validComponentCount++;
  }

  // 5. Transit Score (0-5 points)
  const transit = calculateTransitComponent(
    externalData.transitScore,
    property.state,
    propertyType
  );
  components.push(transit);
  if (transit.rawValue !== null) {
    dataCompleteness++;
    totalConfidence += transit.confidence;
    validComponentCount++;
  }

  // Calculate weighted score based on property type
  let score = 0;
  let totalWeight = 0;

  for (const component of components) {
    if (component.score >= 0) { // Skip if -1 (skipped component)
      const weight = getComponentWeightAdjustment(propertyType, 'location', component.name.toLowerCase().replace(' ', '_'));
      score += component.score * weight;
      totalWeight += weight;
    }
  }

  // Normalize score to 0-25 range
  score = totalWeight > 0 ? (score / totalWeight) * 5 : 12.5;
  score = Math.round(score * 10) / 10;

  const confidence = validComponentCount > 0
    ? Math.round(totalConfidence / validComponentCount)
    : 50;

  return {
    score,
    maxScore: 25,
    confidence,
    dataCompleteness: (dataCompleteness / maxDataCompleteness) * 100,
    components,
    notes,
    adjustments: [],
    walkScore: externalData.walkScore?.score,
    crimeIndex: externalData.crimeData?.index,
    schoolRating: externalData.schoolRatings?.averageRating,
    amenityCount: externalData.nearbyAmenities?.count,
    transitScore: externalData.transitScore?.score,
  };
}
```

---

## Location Score Components

### Walkability Component (0-5 Points)

```typescript
function calculateWalkabilityComponent(
  walkScore: { score: number } | undefined,
  state: string | undefined,
  propertyType: PropertyType
): ComponentScore {
  const missingDataResult = handleMissingData(
    'walkability',
    !!walkScore,
    undefined
  );

  if (!walkScore) {
    return {
      name: 'Walkability',
      score: missingDataResult.score,
      maxScore: 5,
      rawValue: null,
      normalizedValue: 50,
      confidence: missingDataResult.confidence,
      description: missingDataResult.note || 'Walk Score data unavailable',
      dataSource: { name: 'N/A', type: 'default', reliability: 'low' },
      missingDataStrategy: missingDataResult.strategy,
    };
  }

  const score = walkScore.score;

  // Walk Score 0-100 maps to 0-5 points
  const points = Math.round((score / 100) * 5 * 10) / 10;

  // Apply regional adjustment
  const { adjustedScore } = applyRegionalAdjustments(
    state || '',
    undefined,
    'location',
    'walkability',
    Math.min(5, points)
  );

  return {
    name: 'Walkability',
    score: adjustedScore,
    maxScore: 5,
    rawValue: score,
    normalizedValue: score,
    confidence: 100,
    description: getWalkabilityDescription(score),
    dataSource: { name: 'Walk Score API', type: 'api', reliability: 'high' },
    missingDataStrategy: 'default_neutral',
  };
}

function getWalkabilityDescription(score: number): string {
  if (score >= 90) return "Walker's Paradise - daily errands do not require a car";
  if (score >= 70) return 'Very Walkable - most errands can be accomplished on foot';
  if (score >= 50) return 'Somewhat Walkable - some errands can be accomplished on foot';
  if (score >= 25) return 'Car-Dependent - most errands require a car';
  return 'Almost All Errands Require a Car';
}
```

### Crime Safety Component (0-5 Points)

```typescript
function calculateCrimeComponent(
  crimeData: { index: number; grade: string } | undefined,
  state: string | undefined,
  propertyType: PropertyType
): ComponentScore {
  const missingDataResult = handleMissingData(
    'crime_safety',
    !!crimeData,
    undefined
  );

  if (!crimeData) {
    return {
      name: 'Crime Safety',
      score: missingDataResult.score,
      maxScore: 5,
      rawValue: null,
      normalizedValue: 50,
      confidence: missingDataResult.confidence,
      description: missingDataResult.note || 'Crime data not available - using conservative estimate',
      dataSource: { name: 'N/A', type: 'default', reliability: 'low' },
      missingDataStrategy: missingDataResult.strategy,
    };
  }

  // Crime index: 0 = safest, 100 = most dangerous
  // Invert so lower crime = higher score
  const safetyIndex = 100 - crimeData.index;
  const points = Math.round((safetyIndex / 100) * 5 * 10) / 10;

  const { adjustedScore } = applyRegionalAdjustments(
    state || '',
    undefined,
    'location',
    'crime_safety',
    Math.min(5, points)
  );

  return {
    name: 'Crime Safety',
    score: adjustedScore,
    maxScore: 5,
    rawValue: crimeData.index,
    normalizedValue: safetyIndex,
    confidence: 100,
    description: `Crime Index: ${crimeData.index} (${crimeData.grade} grade)`,
    dataSource: { name: 'FBI Crime Data', type: 'api', reliability: 'high' },
    missingDataStrategy: 'default_conservative',
  };
}
```

### School Quality Component (0-5 Points)

```typescript
function calculateSchoolComponent(
  schoolData: { averageRating: number; nearbySchools: number } | undefined,
  state: string | undefined,
  propertyType: PropertyType
): ComponentScore {
  const missingDataResult = handleMissingData(
    'school_quality',
    !!schoolData,
    undefined
  );

  if (!schoolData) {
    return {
      name: 'School Quality',
      score: missingDataResult.score,
      maxScore: 5,
      rawValue: null,
      normalizedValue: 50,
      confidence: missingDataResult.confidence,
      description: missingDataResult.note || 'School ratings not available',
      dataSource: { name: 'N/A', type: 'default', reliability: 'low' },
      missingDataStrategy: missingDataResult.strategy,
    };
  }

  // School rating 1-10 maps to 0-5 points
  const points = Math.round((schoolData.averageRating / 10) * 5 * 10) / 10;

  const { adjustedScore } = applyRegionalAdjustments(
    state || '',
    undefined,
    'location',
    'school_quality',
    Math.min(5, points)
  );

  return {
    name: 'School Quality',
    score: adjustedScore,
    maxScore: 5,
    rawValue: schoolData.averageRating,
    normalizedValue: schoolData.averageRating * 10,
    confidence: 100,
    description: `Average school rating: ${schoolData.averageRating}/10 (${schoolData.nearbySchools} nearby)`,
    dataSource: { name: 'GreatSchools.org', type: 'api', reliability: 'high' },
    missingDataStrategy: 'default_neutral',
  };
}
```

### Amenities Component (0-5 Points)

```typescript
function calculateAmenityComponent(
  amenityData: { count: number; categories: string[] } | undefined,
  state: string | undefined,
  propertyType: PropertyType
): ComponentScore {
  const missingDataResult = handleMissingData(
    'amenities',
    !!amenityData,
    undefined
  );

  if (!amenityData) {
    return {
      name: 'Nearby Amenities',
      score: missingDataResult.score,
      maxScore: 5,
      rawValue: null,
      normalizedValue: 50,
      confidence: missingDataResult.confidence,
      description: missingDataResult.note || 'Amenity data not available',
      dataSource: { name: 'N/A', type: 'default', reliability: 'low' },
      missingDataStrategy: missingDataResult.strategy,
    };
  }

  // Score based on amenity count (0-5 points)
  let points = 1;
  if (amenityData.count >= 30) points = 5;
  else if (amenityData.count >= 21) points = 4;
  else if (amenityData.count >= 11) points = 3;
  else if (amenityData.count >= 6) points = 2;

  const { adjustedScore } = applyRegionalAdjustments(
    state || '',
    undefined,
    'location',
    'amenities',
    points
  );

  return {
    name: 'Nearby Amenities',
    score: adjustedScore,
    maxScore: 5,
    rawValue: amenityData.count,
    normalizedValue: Math.min(100, (amenityData.count / 30) * 100),
    confidence: 100,
    description: `${amenityData.count} amenities within 1 mile (${amenityData.categories.slice(0, 3).join(', ')})`,
    dataSource: { name: 'Google Places API', type: 'api', reliability: 'high' },
    missingDataStrategy: 'estimate_from_peers',
  };
}
```

### Transit Access Component (0-5 Points)

```typescript
function calculateTransitComponent(
  transitData: { score: number } | undefined,
  state: string | undefined,
  propertyType: PropertyType
): ComponentScore {
  const missingDataResult = handleMissingData(
    'transit',
    !!transitData,
    undefined
  );

  if (!transitData) {
    return {
      name: 'Transit Access',
      score: missingDataResult.score,
      maxScore: 5,
      rawValue: null,
      normalizedValue: 50,
      confidence: missingDataResult.confidence,
      description: missingDataResult.note || 'Transit data unavailable',
      dataSource: { name: 'N/A', type: 'default', reliability: 'low' },
      missingDataStrategy: missingDataResult.strategy,
    };
  }

  const score = transitData.score;

  // Transit Score 0-100 maps to 0-5 points
  const points = Math.round((score / 100) * 5 * 10) / 10;

  const { adjustedScore } = applyRegionalAdjustments(
    state || '',
    undefined,
    'location',
    'transit',
    Math.min(5, points)
  );

  return {
    name: 'Transit Access',
    score: adjustedScore,
    maxScore: 5,
    rawValue: score,
    normalizedValue: score,
    confidence: 100,
    description: getTransitDescription(score),
    dataSource: { name: 'Walk Score Transit API', type: 'api', reliability: 'high' },
    missingDataStrategy: 'default_neutral',
  };
}

function getTransitDescription(score: number): string {
  if (score >= 90) return 'Excellent Transit - world-class public transportation';
  if (score >= 70) return 'Excellent Transit - convenient for most trips';
  if (score >= 50) return 'Good Transit - many nearby public transportation options';
  if (score >= 25) return 'Some Transit - a few public transportation options';
  return 'Minimal Transit - few or no public transportation options';
}
```

---

## Location Score Summary

### Component Breakdown

| Component | Points | Data Source | Scoring Method |
|-----------|--------|-------------|----------------|
| Walkability | 0-5 | Walk Score API | Direct 0-100 to 0-5 mapping |
| Crime Safety | 0-5 | FBI Crime Data | Inverted index (lower crime = higher score) |
| School Quality | 0-5 | GreatSchools.org | Rating 1-10 to 0-5 mapping |
| Nearby Amenities | 0-5 | Google Places API | Count-based tiers |
| Transit Access | 0-5 | Walk Score Transit API | Direct 0-100 to 0-5 mapping |
| **Total** | **0-25** | | |

### Score Interpretation

| Score Range | Rating | Description |
|-------------|--------|-------------|
| 20-25 | Excellent | Prime location, highly desirable |
| 15-19 | Good | Strong location with minor weaknesses |
| 10-14 | Average | Acceptable location, some concerns |
| 5-9 | Below Average | Location challenges exist |
| 0-4 | Poor | Significant location issues |

---

## File Structure

```
src/lib/analysis/scoring/
├── index.ts                        # Main calculator exports
├── InvestmentScoreCalculator.ts    # Main class with caching & rate limiting
├── locationScore.ts                # Location scoring (this file)
├── riskScore.ts                    # Risk scoring (Phase 6F)
├── financialScore.ts               # Financial scoring (Phase 6F)
├── marketScore.ts                  # Market scoring (Phase 6F)
├── profitScore.ts                  # Profit scoring (Phase 6F)
├── confidence.ts                   # Confidence calculation
├── missingDataHandler.ts           # Missing data strategies
├── propertyTypeScoring.ts          # Property type weights
├── regionalAdjustments.ts          # Regional adjustments
├── edgeCases.ts                    # Edge case handling
├── calibration.ts                  # Score calibration
├── cache/
│   ├── index.ts                    # ScoreCache implementation
│   ├── inMemoryCache.ts            # In-memory cache (development)
│   └── redisCache.ts               # Redis cache (production)
├── rateLimiter/
│   ├── index.ts                    # RateLimiter implementation
│   └── slidingWindowLimiter.ts     # Sliding window algorithm
└── apiClients/
    ├── index.ts                    # ExternalApiClient implementation
    ├── walkScoreClient.ts          # Walk Score API client
    ├── crimeDataClient.ts          # FBI Crime API client
    ├── schoolRatingsClient.ts      # GreatSchools API client
    └── amenitiesClient.ts          # Google Places API client

src/types/scoring/
├── index.ts                        # All scoring types
├── externalApis.ts                 # API response types (new)
├── scores.ts                       # Score result types
├── property.ts                     # Property data types
└── components.ts                   # Component score types
```

---

## Next Steps

- **Phase 6F**: Implement remaining score calculators (Risk, Financial, Market, Profit)
- **Phase 6G**: Create API endpoints for scoring
- **Phase 6H**: Build UI components for score display
