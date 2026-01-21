/**
 * Investment Scoring Engine
 *
 * Calculates the 125-point investment score across 5 categories:
 * - Location (25 points): Median income, schools, walkability, broadband, amenities
 * - Risk (25 points): Inverted from RiskAssessment (lower risk = higher score)
 * - Financial (25 points): Price-to-ARV ratio, acquisition cost vs market
 * - Market (25 points): Days on market, absorption rate, price trends
 * - Profit (25 points): ROI, profit margin, cap rate, cash flow
 *
 * @module lib/analysis/scoring/investment-scorer
 */

import type { RiskAssessment } from '@/types/risk-analysis';
import type { FinancialAnalysis, ComparablesAnalysis } from '../financial/types';
import type {
  PropertyData,
  ExternalData,
  CategoryScore,
  ComponentScore,
  ScoreBreakdown,
  GradeResult,
  GradeLevel,
  GradeWithModifier,
  ConfidenceResult,
  ConfidenceLabel,
  ConfidenceFactor,
  ScoringWarning,
  DataSource,
  MissingDataStrategy,
  PropertyType,
  RegionalAdjustment,
  ScoreAdjustment,
  CategoryId,
  LocationComponentId,
  RiskComponentId,
  FinancialComponentId,
  MarketComponentId,
  ProfitComponentId,
} from '@/types/scoring';

// ============================================
// Constants
// ============================================

const SCORING_VERSION = '1.0.0';
const MAX_CATEGORY_SCORE = 25;
const MAX_COMPONENT_SCORE = 5;
const MAX_TOTAL_SCORE = 125;

// Grade thresholds (percentage of max score)
const GRADE_THRESHOLDS: Record<GradeWithModifier, { min: number; max: number }> = {
  'A+': { min: 95, max: 100 },
  'A': { min: 90, max: 94.99 },
  'A-': { min: 85, max: 89.99 },
  'B+': { min: 80, max: 84.99 },
  'B': { min: 75, max: 79.99 },
  'B-': { min: 70, max: 74.99 },
  'C+': { min: 65, max: 69.99 },
  'C': { min: 60, max: 64.99 },
  'C-': { min: 55, max: 59.99 },
  'D+': { min: 50, max: 54.99 },
  'D': { min: 45, max: 49.99 },
  'D-': { min: 40, max: 44.99 },
  'F': { min: 0, max: 39.99 },
};

// Grade descriptions
const GRADE_DESCRIPTIONS: Record<GradeLevel, string> = {
  A: 'Excellent Investment - Strong fundamentals across all categories',
  B: 'Good Investment - Solid opportunity with minor concerns',
  C: 'Average Investment - Proceed with caution, additional due diligence recommended',
  D: 'Below Average - Significant risks or concerns identified',
  F: 'Poor Investment - Not recommended for investment',
};

// ============================================
// Input Types
// ============================================

/**
 * Market data for scoring calculations
 */
export interface MarketData {
  /** Median days on market for area */
  medianDaysOnMarket?: number;
  /** Year-over-year price change percentage */
  priceChangeYoY?: number;
  /** Active inventory count in area */
  inventoryCount?: number;
  /** Monthly absorption rate */
  absorptionRate?: number;
  /** Median sale price in area */
  medianSalePrice?: number;
  /** Price per square foot */
  pricePerSqFt?: number;
  /** Competition level assessment */
  competitionLevel?: 'low' | 'medium' | 'high';
}

/**
 * Location data for scoring calculations
 */
export interface LocationData {
  /** Walk score (0-100) */
  walkScore?: number;
  /** Transit score (0-100) */
  transitScore?: number;
  /** Crime index (0-100, lower is better) */
  crimeIndex?: number;
  /** School rating (1-10) */
  schoolRating?: number;
  /** Median household income (Census ACS data) */
  medianIncome?: number;
  /** Median household income (Census ACS data) - alias */
  medianHouseholdIncome?: number;
  /** Population density (people per square mile) */
  populationDensity?: number;
  /** Median age of residents */
  medianAge?: number;
  /** Homeownership rate percentage */
  homeownershipRate?: number;
  /** Vacancy rate percentage */
  vacancyRate?: number;
  /** Broadband availability score (0-100) */
  broadbandScore?: number;
  /** Whether broadband is available */
  broadbandAvailable?: boolean;
  /** Nearby amenities count */
  amenityCount?: number;
  /** Employment rate percentage */
  employmentRate?: number;
}

/**
 * Input for investment score calculation
 */
export interface InvestmentScoreInput {
  /** Core property data */
  property: PropertyData;
  /** Risk assessment from risk aggregator */
  riskAssessment?: RiskAssessment;
  /** Financial analysis data */
  financialAnalysis?: FinancialAnalysis;
  /** Market data for the area */
  marketData?: MarketData;
  /** Location data for the area */
  locationData?: LocationData;
  /** External data from APIs */
  externalData?: ExternalData;
  /** Purchase price for calculations */
  purchasePrice?: number;
}

/**
 * Options for score calculation
 */
export interface InvestmentScoreOptions {
  /** Missing data handling strategy */
  missingDataStrategy?: MissingDataStrategy;
  /** Whether to apply regional adjustments */
  applyRegionalAdjustments?: boolean;
  /** Minimum confidence threshold to include component */
  minConfidenceThreshold?: number;
}

/**
 * Result of investment score calculation
 */
export interface InvestmentScoreResult {
  /** Total score (0-125) */
  totalScore: number;
  /** Letter grade */
  grade: GradeLevel;
  /** Grade with modifier */
  gradeWithModifier: GradeWithModifier;
  /** All category scores */
  categories: CategoryScore[];
  /** Full score breakdown */
  breakdown: ScoreBreakdown;
  /** Summary description */
  summary: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create a data source object
 */
function createDataSource(
  name: string,
  type: DataSource['type'],
  reliability: DataSource['reliability']
): DataSource {
  return {
    name,
    type,
    reliability,
    lastUpdated: new Date(),
  };
}

/**
 * Normalize a value to 0-100 scale
 */
function normalizeValue(
  value: number,
  min: number,
  max: number,
  invert = false
): number {
  const clamped = Math.max(min, Math.min(max, value));
  const normalized = ((clamped - min) / (max - min)) * 100;
  return invert ? 100 - normalized : normalized;
}

/**
 * Convert normalized value (0-100) to component score (0-5)
 */
function normalizedToComponentScore(normalized: number): number {
  return Math.round((normalized / 100) * MAX_COMPONENT_SCORE * 10) / 10;
}

/**
 * Get default score based on missing data strategy
 */
function getDefaultScore(strategy: MissingDataStrategy): number {
  switch (strategy) {
    case 'default_neutral':
      return 2.5;
    case 'default_conservative':
      return 1.5;
    case 'default_optimistic':
      return 3.5;
    case 'skip_component':
    case 'require_data':
      return 0;
    case 'estimate_from_peers':
      return 2.5; // Fallback to neutral if no peers
    default:
      return 2.5;
  }
}

/**
 * Calculate grade from percentage
 */
function calculateGrade(percentage: number): GradeResult {
  let gradeWithModifier: GradeWithModifier = 'F';
  let grade: GradeLevel = 'F';

  for (const [g, threshold] of Object.entries(GRADE_THRESHOLDS)) {
    if (percentage >= threshold.min && percentage <= threshold.max) {
      gradeWithModifier = g as GradeWithModifier;
      grade = g.charAt(0) as GradeLevel;
      break;
    }
  }

  return {
    grade,
    gradeWithModifier,
    percentage: Math.round(percentage * 10) / 10,
    thresholdMet: GRADE_THRESHOLDS[gradeWithModifier].min,
    description: GRADE_DESCRIPTIONS[grade],
  };
}

/**
 * Calculate confidence label from score
 */
function getConfidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= 90) return 'Very High';
  if (confidence >= 75) return 'High';
  if (confidence >= 50) return 'Moderate';
  if (confidence >= 25) return 'Low';
  return 'Very Low';
}

// ============================================
// Category Scoring Functions
// ============================================

/**
 * Calculate Location category score (25 points)
 */
function calculateLocationScore(
  input: InvestmentScoreInput,
  options: InvestmentScoreOptions
): CategoryScore {
  const { property, locationData, externalData } = input;
  const strategy = options.missingDataStrategy || 'default_neutral';
  const components: ComponentScore[] = [];
  const notes: string[] = [];
  const adjustments: ScoreAdjustment[] = [];

  // Component 1: Walk Score
  const walkScore = locationData?.walkScore ?? externalData?.walkScore;
  if (walkScore !== undefined && walkScore !== null) {
    const normalized = normalizeValue(walkScore, 0, 100);
    components.push({
      id: 'walk_score' as LocationComponentId,
      name: 'Walkability',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: walkScore,
      normalizedValue: normalized,
      confidence: 95,
      description: getWalkScoreDescription(walkScore),
      dataSource: createDataSource('WalkScore API', 'api', 'high'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('walk_score', 'Walkability', strategy));
    notes.push('Walk score data unavailable');
  }

  // Component 2: Crime Index (inverted - lower crime = higher score)
  const crimeIndex = locationData?.crimeIndex ?? externalData?.crimeData?.crimeIndex;
  if (crimeIndex !== undefined && crimeIndex !== null) {
    const normalized = normalizeValue(crimeIndex, 0, 100, true); // Invert
    components.push({
      id: 'crime_index' as LocationComponentId,
      name: 'Safety',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: crimeIndex,
      normalizedValue: normalized,
      confidence: 85,
      description: getCrimeDescription(crimeIndex),
      dataSource: createDataSource('Crime Data API', 'api', 'medium'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('crime_index', 'Safety', strategy));
    notes.push('Crime data unavailable');
  }

  // Component 3: School Rating
  const schoolRating = locationData?.schoolRating ?? externalData?.schoolRating?.overallRating;
  if (schoolRating !== undefined && schoolRating !== null) {
    const normalized = normalizeValue(schoolRating, 1, 10) ;
    components.push({
      id: 'school_rating' as LocationComponentId,
      name: 'School Quality',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: schoolRating,
      normalizedValue: normalized,
      confidence: 90,
      description: getSchoolDescription(schoolRating),
      dataSource: createDataSource('GreatSchools', 'api', 'high'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('school_rating', 'School Quality', strategy));
    notes.push('School rating data unavailable');
  }

  // Component 4: Amenity Count
  const amenityCount = locationData?.amenityCount ??
    (externalData?.nearbyAmenities?.totalScore);
  if (amenityCount !== undefined && amenityCount !== null) {
    const normalized = normalizeValue(amenityCount, 0, 50);
    components.push({
      id: 'amenity_count' as LocationComponentId,
      name: 'Nearby Amenities',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: amenityCount,
      normalizedValue: normalized,
      confidence: 80,
      description: `${amenityCount} amenities within 1 mile`,
      dataSource: createDataSource('Geoapify', 'api', 'medium'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('amenity_count', 'Nearby Amenities', strategy));
    notes.push('Amenity data unavailable');
  }

  // Component 5: Transit Score
  const transitScore = locationData?.transitScore ?? externalData?.transitScore;
  if (transitScore !== undefined && transitScore !== null) {
    const normalized = normalizeValue(transitScore, 0, 100);
    components.push({
      id: 'transit_score' as LocationComponentId,
      name: 'Transit Access',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: transitScore,
      normalizedValue: normalized,
      confidence: 90,
      description: getTransitDescription(transitScore),
      dataSource: createDataSource('WalkScore API', 'api', 'high'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('transit_score', 'Transit Access', strategy));
    notes.push('Transit score data unavailable');
  }

  // Calculate category totals
  const totalScore = components.reduce((sum, c) => sum + c.score, 0);
  const avgConfidence = components.reduce((sum, c) => sum + c.confidence, 0) / components.length;
  const dataCompleteness = (components.filter(c => c.rawValue !== null).length / components.length) * 100;

  return {
    id: 'location',
    name: 'Location',
    score: Math.round(totalScore * 10) / 10,
    maxScore: 25,
    confidence: Math.round(avgConfidence),
    dataCompleteness: Math.round(dataCompleteness),
    components,
    notes,
    adjustments,
  };
}

/**
 * Calculate Risk category score (25 points)
 * Inverted from RiskAssessment - lower risk = higher score
 */
function calculateRiskScore(
  input: InvestmentScoreInput,
  options: InvestmentScoreOptions
): CategoryScore {
  const { riskAssessment } = input;
  const strategy = options.missingDataStrategy || 'default_neutral';
  const components: ComponentScore[] = [];
  const notes: string[] = [];
  const adjustments: ScoreAdjustment[] = [];

  if (!riskAssessment) {
    // No risk data - return all default scores
    return {
      id: 'risk',
      name: 'Risk',
      score: getDefaultScore(strategy) * 5,
      maxScore: 25,
      confidence: 20,
      dataCompleteness: 0,
      components: [
        createDefaultComponent('flood_zone', 'Flood Risk', strategy),
        createDefaultComponent('environmental_hazards', 'Environmental', strategy),
        createDefaultComponent('structural_risk', 'Structural', strategy),
        createDefaultComponent('title_issues', 'Title Risk', strategy),
        createDefaultComponent('zoning_compliance', 'Zoning', strategy),
      ],
      notes: ['Risk assessment data unavailable - using default scores'],
      adjustments: [],
    };
  }

  // Helper to derive confidence from data availability
  const getConfidence = (availability: 'full' | 'partial' | 'none' | undefined): number => {
    switch (availability) {
      case 'full': return 90;
      case 'partial': return 70;
      case 'none': return 50;
      default: return 75;
    }
  };

  // Component 1: Flood Risk (inverted - lower risk = higher score)
  const floodRisk = riskAssessment.categoryScores?.find(c => c.category === 'flood');
  if (floodRisk) {
    const invertedScore = 100 - floodRisk.rawScore; // Invert: 0 risk = 100 score
    const floodZone = riskAssessment.flood?.zone || 'Unknown';
    components.push({
      id: 'flood_zone' as RiskComponentId,
      name: 'Flood Risk',
      score: normalizedToComponentScore(invertedScore),
      maxScore: 5,
      rawValue: floodRisk.rawScore,
      normalizedValue: invertedScore,
      confidence: getConfidence(floodRisk.dataAvailability),
      description: `Flood risk: ${floodRisk.riskLevel} (Zone: ${floodZone})`,
      dataSource: createDataSource('FEMA NFHL', 'api', 'high'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('flood_zone', 'Flood Risk', strategy));
    notes.push('Flood zone data unavailable');
  }

  // Component 2: Environmental Hazards
  const envRisk = riskAssessment.categoryScores?.find(c => c.category === 'environmental');
  if (envRisk) {
    const invertedScore = 100 - envRisk.rawScore;
    components.push({
      id: 'environmental_hazards' as RiskComponentId,
      name: 'Environmental',
      score: normalizedToComponentScore(invertedScore),
      maxScore: 5,
      rawValue: envRisk.rawScore,
      normalizedValue: invertedScore,
      confidence: getConfidence(envRisk.dataAvailability),
      description: `Environmental risk: ${envRisk.riskLevel}`,
      dataSource: createDataSource('EPA Envirofacts', 'api', 'medium'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('environmental_hazards', 'Environmental', strategy));
    notes.push('Environmental data unavailable');
  }

  // Component 3: Structural/Earthquake Risk
  const earthquakeRisk = riskAssessment.categoryScores?.find(c => c.category === 'earthquake');
  if (earthquakeRisk) {
    const invertedScore = 100 - earthquakeRisk.rawScore;
    components.push({
      id: 'structural_risk' as RiskComponentId,
      name: 'Seismic Risk',
      score: normalizedToComponentScore(invertedScore),
      maxScore: 5,
      rawValue: earthquakeRisk.rawScore,
      normalizedValue: invertedScore,
      confidence: getConfidence(earthquakeRisk.dataAvailability),
      description: `Seismic risk: ${earthquakeRisk.riskLevel}`,
      dataSource: createDataSource('USGS', 'api', 'high'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('structural_risk', 'Seismic Risk', strategy));
    notes.push('Seismic data unavailable');
  }

  // Component 4: Title Issues (use overall risk as proxy if no specific title data)
  // For now, use a calculated score based on sale type and liens
  const titleScore = calculateTitleRiskScore(input);
  components.push({
    id: 'title_issues' as RiskComponentId,
    name: 'Title Risk',
    score: titleScore.score,
    maxScore: 5,
    rawValue: titleScore.rawValue,
    normalizedValue: titleScore.normalizedValue,
    confidence: titleScore.confidence,
    description: titleScore.description,
    dataSource: createDataSource('Calculated', 'calculated', 'medium'),
    missingDataStrategy: 'default_neutral',
  });

  // Component 5: Zoning Compliance
  const zoningScore = calculateZoningScore(input);
  components.push({
    id: 'zoning_compliance' as RiskComponentId,
    name: 'Zoning',
    score: zoningScore.score,
    maxScore: 5,
    rawValue: zoningScore.rawValue,
    normalizedValue: zoningScore.normalizedValue,
    confidence: zoningScore.confidence,
    description: zoningScore.description,
    dataSource: createDataSource('Regrid/Municipal', 'database', 'medium'),
    missingDataStrategy: 'default_neutral',
  });

  // Calculate category totals
  const totalScore = components.reduce((sum, c) => sum + c.score, 0);
  const avgConfidence = components.reduce((sum, c) => sum + c.confidence, 0) / components.length;
  const dataCompleteness = (components.filter(c => c.rawValue !== null).length / components.length) * 100;

  return {
    id: 'risk',
    name: 'Risk',
    score: Math.round(totalScore * 10) / 10,
    maxScore: 25,
    confidence: Math.round(avgConfidence),
    dataCompleteness: Math.round(dataCompleteness),
    components,
    notes,
    adjustments,
  };
}

/**
 * Calculate Financial category score (25 points)
 */
function calculateFinancialScore(
  input: InvestmentScoreInput,
  options: InvestmentScoreOptions
): CategoryScore {
  const { property, financialAnalysis, purchasePrice } = input;
  const strategy = options.missingDataStrategy || 'default_neutral';
  const components: ComponentScore[] = [];
  const notes: string[] = [];
  const adjustments: ScoreAdjustment[] = [];

  const price = purchasePrice ?? property.total_due ?? 0;
  const arv = financialAnalysis?.comparables?.estimatedARV ?? property.market_value ?? 0;

  // Component 1: Price-to-ARV Ratio (lower is better)
  if (arv > 0 && price > 0) {
    const priceToARV = price / arv;
    // Ideal range: 0.3-0.5, Good: 0.5-0.7, Acceptable: 0.7-0.85
    let normalized: number;
    if (priceToARV <= 0.3) normalized = 100;
    else if (priceToARV <= 0.5) normalized = 90 - ((priceToARV - 0.3) / 0.2) * 20;
    else if (priceToARV <= 0.7) normalized = 70 - ((priceToARV - 0.5) / 0.2) * 30;
    else if (priceToARV <= 0.85) normalized = 40 - ((priceToARV - 0.7) / 0.15) * 20;
    else normalized = Math.max(0, 20 - ((priceToARV - 0.85) / 0.15) * 20);

    components.push({
      id: 'tax_efficiency' as FinancialComponentId,
      name: 'Price-to-ARV',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: priceToARV,
      normalizedValue: normalized,
      confidence: financialAnalysis ? 85 : 60,
      description: `${Math.round(priceToARV * 100)}% of estimated ARV`,
      dataSource: createDataSource('Financial Analysis', 'calculated', 'medium'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('tax_efficiency', 'Price-to-ARV', strategy));
    notes.push('Unable to calculate price-to-ARV ratio');
  }

  // Component 2: Lien Complexity (based on total due vs assessed value)
  const assessedValue = property.assessed_value ?? 0;
  if (assessedValue > 0 && price > 0) {
    const lienRatio = price / assessedValue;
    // Lower lien-to-assessed ratio is better (means less encumbered)
    let normalized: number;
    if (lienRatio <= 0.1) normalized = 100;
    else if (lienRatio <= 0.3) normalized = 80;
    else if (lienRatio <= 0.5) normalized = 60;
    else if (lienRatio <= 0.75) normalized = 40;
    else normalized = 20;

    components.push({
      id: 'lien_complexity' as FinancialComponentId,
      name: 'Lien Burden',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: lienRatio,
      normalizedValue: normalized,
      confidence: 70,
      description: `Lien is ${Math.round(lienRatio * 100)}% of assessed value`,
      dataSource: createDataSource('Property Records', 'database', 'high'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('lien_complexity', 'Lien Burden', strategy));
    notes.push('Assessed value unavailable for lien analysis');
  }

  // Component 3: Assessment Ratio (assessed vs market)
  if (assessedValue > 0 && arv > 0) {
    const assessmentRatio = assessedValue / arv;
    // Ratios around 0.8-1.0 suggest fair assessment
    // Lower ratios may indicate undervaluation (opportunity)
    // Higher ratios may indicate overassessment (risk)
    let normalized: number;
    if (assessmentRatio >= 0.7 && assessmentRatio <= 1.1) normalized = 80;
    else if (assessmentRatio < 0.7) normalized = 90; // Potentially undervalued
    else normalized = 60 - ((assessmentRatio - 1.1) / 0.5) * 40; // Overassessed

    components.push({
      id: 'assessment_ratio' as FinancialComponentId,
      name: 'Assessment Accuracy',
      score: normalizedToComponentScore(Math.max(0, normalized)),
      maxScore: 5,
      rawValue: assessmentRatio,
      normalizedValue: Math.max(0, normalized),
      confidence: 65,
      description: `Assessed at ${Math.round(assessmentRatio * 100)}% of market value`,
      dataSource: createDataSource('Calculated', 'calculated', 'medium'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('assessment_ratio', 'Assessment Accuracy', strategy));
    notes.push('Unable to calculate assessment ratio');
  }

  // Component 4: Redemption Risk (based on sale type)
  const redemptionScore = calculateRedemptionRiskScore(property);
  components.push(redemptionScore);

  // Component 5: Holding Costs (estimate based on property taxes)
  const holdingScore = calculateHoldingCostScore(input);
  components.push(holdingScore);

  // Calculate category totals
  const totalScore = components.reduce((sum, c) => sum + c.score, 0);
  const avgConfidence = components.reduce((sum, c) => sum + c.confidence, 0) / components.length;
  const dataCompleteness = (components.filter(c => c.rawValue !== null).length / components.length) * 100;

  return {
    id: 'financial',
    name: 'Financial',
    score: Math.round(totalScore * 10) / 10,
    maxScore: 25,
    confidence: Math.round(avgConfidence),
    dataCompleteness: Math.round(dataCompleteness),
    components,
    notes,
    adjustments,
  };
}

/**
 * Calculate Market category score (25 points)
 */
function calculateMarketScore(
  input: InvestmentScoreInput,
  options: InvestmentScoreOptions
): CategoryScore {
  const { marketData, externalData, financialAnalysis } = input;
  const strategy = options.missingDataStrategy || 'default_neutral';
  const components: ComponentScore[] = [];
  const notes: string[] = [];
  const adjustments: ScoreAdjustment[] = [];

  const market = marketData ?? externalData?.marketData;

  // Component 1: Days on Market
  const dom = market?.medianDaysOnMarket;
  if (dom !== undefined && dom !== null) {
    // Lower DOM is better (hot market)
    let normalized: number;
    if (dom <= 14) normalized = 100;
    else if (dom <= 30) normalized = 85;
    else if (dom <= 60) normalized = 70;
    else if (dom <= 90) normalized = 50;
    else normalized = Math.max(0, 30 - ((dom - 90) / 60) * 30);

    components.push({
      id: 'days_on_market' as MarketComponentId,
      name: 'Days on Market',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: dom,
      normalizedValue: normalized,
      confidence: 80,
      description: getDOMDescription(dom),
      dataSource: createDataSource('Realty API', 'api', 'high'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('days_on_market', 'Days on Market', strategy));
    notes.push('Days on market data unavailable');
  }

  // Component 2: Price Trend (YoY change)
  const priceChange = market?.priceChangeYoY;
  if (priceChange !== undefined && priceChange !== null) {
    // Positive change is good, but extreme appreciation may indicate bubble
    let normalized: number;
    if (priceChange >= 3 && priceChange <= 8) normalized = 90; // Healthy appreciation
    else if (priceChange >= 0 && priceChange < 3) normalized = 70; // Stable
    else if (priceChange > 8 && priceChange <= 15) normalized = 75; // Strong but watch
    else if (priceChange > 15) normalized = 60; // Potential bubble
    else if (priceChange >= -5 && priceChange < 0) normalized = 50; // Slight decline
    else normalized = Math.max(0, 30 + priceChange * 2); // Declining

    components.push({
      id: 'price_trend' as MarketComponentId,
      name: 'Price Trend',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: priceChange,
      normalizedValue: normalized,
      confidence: 85,
      description: getPriceTrendDescription(priceChange),
      dataSource: createDataSource('Realty API', 'api', 'high'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('price_trend', 'Price Trend', strategy));
    notes.push('Price trend data unavailable');
  }

  // Component 3: Inventory Level
  const inventory = market?.inventoryCount;
  if (inventory !== undefined && inventory !== null) {
    // Lower inventory generally means more demand
    let normalized: number;
    if (inventory <= 50) normalized = 90;
    else if (inventory <= 100) normalized = 80;
    else if (inventory <= 200) normalized = 65;
    else if (inventory <= 500) normalized = 50;
    else normalized = 35;

    components.push({
      id: 'inventory_level' as MarketComponentId,
      name: 'Inventory Level',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: inventory,
      normalizedValue: normalized,
      confidence: 75,
      description: `${inventory} active listings in area`,
      dataSource: createDataSource('Realty API', 'api', 'medium'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('inventory_level', 'Inventory Level', strategy));
    notes.push('Inventory data unavailable');
  }

  // Component 4: Absorption Rate
  const absorptionRate = market?.absorptionRate;
  if (absorptionRate !== undefined && absorptionRate !== null) {
    // Higher absorption rate is better (properties selling faster)
    let normalized: number;
    if (absorptionRate >= 0.25) normalized = 95; // Very hot (4+ months inventory)
    else if (absorptionRate >= 0.20) normalized = 85;
    else if (absorptionRate >= 0.15) normalized = 70;
    else if (absorptionRate >= 0.10) normalized = 55;
    else normalized = 40;

    components.push({
      id: 'absorption_rate' as MarketComponentId,
      name: 'Absorption Rate',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: absorptionRate,
      normalizedValue: normalized,
      confidence: 70,
      description: `${Math.round(absorptionRate * 100)}% monthly absorption`,
      dataSource: createDataSource('Calculated', 'calculated', 'medium'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('absorption_rate', 'Absorption Rate', strategy));
    notes.push('Absorption rate data unavailable');
  }

  // Component 5: Competition Level (derived from inventory/absorption or comparable count)
  const inventoryCount = market?.inventoryCount;
  // Note: absorptionRate already defined above for Component 4
  const comparableCount = financialAnalysis?.comparables?.comparablesCount;
  let competitionNormalized: number;
  let competitionDescription: string;

  if (inventoryCount !== null && inventoryCount !== undefined && absorptionRate !== null && absorptionRate !== undefined) {
    // Derive competition from months of inventory (inventory / absorption rate)
    const monthsOfInventory = absorptionRate > 0 ? inventoryCount / absorptionRate : 6;
    if (monthsOfInventory < 3) {
      competitionNormalized = 45; // High competition (seller's market)
      competitionDescription = 'High competition (seller\'s market)';
    } else if (monthsOfInventory < 6) {
      competitionNormalized = 65; // Moderate competition
      competitionDescription = 'Moderate competition (balanced market)';
    } else {
      competitionNormalized = 85; // Low competition (buyer's market)
      competitionDescription = 'Low competition (buyer\'s market)';
    }
  } else if (typeof comparableCount === 'number' && comparableCount > 0) {
    // Based on comparable count - more comps means more activity
    if (comparableCount >= 10) competitionNormalized = 70;
    else if (comparableCount >= 5) competitionNormalized = 80;
    else competitionNormalized = 60;
    competitionDescription = `${comparableCount} recent comparable sales`;
  } else {
    competitionNormalized = getDefaultScore(strategy) * 20;
    competitionDescription = 'Competition data unavailable';
    notes.push('Competition data unavailable');
  }

  const hasCompetitionData = (inventoryCount !== null && inventoryCount !== undefined) ||
    (typeof comparableCount === 'number' && comparableCount > 0);
  components.push({
    id: 'competition_level' as MarketComponentId,
    name: 'Competition',
    score: normalizedToComponentScore(competitionNormalized),
    maxScore: 5,
    rawValue: inventoryCount ?? comparableCount ?? null,
    normalizedValue: competitionNormalized,
    confidence: hasCompetitionData ? 70 : 30,
    description: competitionDescription,
    dataSource: createDataSource('Market Analysis', 'calculated', 'medium'),
    missingDataStrategy: 'default_neutral',
  });

  // Calculate category totals
  const totalScore = components.reduce((sum, c) => sum + c.score, 0);
  const avgConfidence = components.reduce((sum, c) => sum + c.confidence, 0) / components.length;
  const dataCompleteness = (components.filter(c => c.rawValue !== null).length / components.length) * 100;

  return {
    id: 'market',
    name: 'Market',
    score: Math.round(totalScore * 10) / 10,
    maxScore: 25,
    confidence: Math.round(avgConfidence),
    dataCompleteness: Math.round(dataCompleteness),
    components,
    notes,
    adjustments,
  };
}

/**
 * Calculate Profit category score (25 points)
 */
function calculateProfitScore(
  input: InvestmentScoreInput,
  options: InvestmentScoreOptions
): CategoryScore {
  const { property, financialAnalysis, purchasePrice } = input;
  const strategy = options.missingDataStrategy || 'default_neutral';
  const components: ComponentScore[] = [];
  const notes: string[] = [];
  const adjustments: ScoreAdjustment[] = [];

  const metrics = financialAnalysis?.metrics;
  const price = purchasePrice ?? property.total_due ?? 0;

  // Component 1: ROI Potential
  const roi = metrics?.roi;
  if (roi !== undefined && roi !== null) {
    let normalized: number;
    if (roi >= 100) normalized = 100;
    else if (roi >= 50) normalized = 85;
    else if (roi >= 30) normalized = 70;
    else if (roi >= 15) normalized = 55;
    else if (roi >= 0) normalized = 40;
    else normalized = Math.max(0, 30 + roi);

    components.push({
      id: 'roi_potential' as ProfitComponentId,
      name: 'ROI Potential',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: roi,
      normalizedValue: normalized,
      confidence: financialAnalysis ? 80 : 40,
      description: `${Math.round(roi)}% projected ROI`,
      dataSource: createDataSource('Financial Analysis', 'calculated', 'medium'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('roi_potential', 'ROI Potential', strategy));
    notes.push('ROI calculation unavailable');
  }

  // Component 2: Cash Flow (if rental projection available)
  const cashFlow = financialAnalysis?.revenue?.rental?.monthlyCashFlow;
  if (cashFlow !== undefined && cashFlow !== null) {
    let normalized: number;
    if (cashFlow >= 500) normalized = 95;
    else if (cashFlow >= 300) normalized = 80;
    else if (cashFlow >= 100) normalized = 65;
    else if (cashFlow >= 0) normalized = 50;
    else normalized = Math.max(0, 40 + cashFlow / 10);

    components.push({
      id: 'cash_flow' as ProfitComponentId,
      name: 'Cash Flow',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: cashFlow,
      normalizedValue: normalized,
      confidence: 70,
      description: `$${Math.round(cashFlow)}/month projected cash flow`,
      dataSource: createDataSource('Financial Analysis', 'calculated', 'medium'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('cash_flow', 'Cash Flow', strategy));
    notes.push('Cash flow projection unavailable');
  }

  // Component 3: Equity Margin (profit margin)
  const profitMargin = metrics?.profitMargin;
  if (profitMargin !== undefined && profitMargin !== null) {
    let normalized: number;
    if (profitMargin >= 40) normalized = 100;
    else if (profitMargin >= 30) normalized = 85;
    else if (profitMargin >= 20) normalized = 70;
    else if (profitMargin >= 10) normalized = 55;
    else if (profitMargin >= 0) normalized = 40;
    else normalized = Math.max(0, 30 + profitMargin);

    components.push({
      id: 'equity_margin' as ProfitComponentId,
      name: 'Profit Margin',
      score: normalizedToComponentScore(normalized),
      maxScore: 5,
      rawValue: profitMargin,
      normalizedValue: normalized,
      confidence: 75,
      description: `${Math.round(profitMargin)}% profit margin`,
      dataSource: createDataSource('Financial Analysis', 'calculated', 'medium'),
      missingDataStrategy: 'default_neutral',
    });
  } else {
    components.push(createDefaultComponent('equity_margin', 'Profit Margin', strategy));
    notes.push('Profit margin calculation unavailable');
  }

  // Component 4: Exit Options (based on property type and market)
  const exitScore = calculateExitOptionsScore(input);
  components.push(exitScore);

  // Component 5: Time to Profit (holding period consideration)
  const timeScore = calculateTimeToProfitScore(input);
  components.push(timeScore);

  // Calculate category totals
  const totalScore = components.reduce((sum, c) => sum + c.score, 0);
  const avgConfidence = components.reduce((sum, c) => sum + c.confidence, 0) / components.length;
  const dataCompleteness = (components.filter(c => c.rawValue !== null).length / components.length) * 100;

  return {
    id: 'profit',
    name: 'Profit',
    score: Math.round(totalScore * 10) / 10,
    maxScore: 25,
    confidence: Math.round(avgConfidence),
    dataCompleteness: Math.round(dataCompleteness),
    components,
    notes,
    adjustments,
  };
}

// ============================================
// Helper Component Calculators
// ============================================

function createDefaultComponent(
  id: string,
  name: string,
  strategy: MissingDataStrategy
): ComponentScore {
  const defaultScore = getDefaultScore(strategy);
  return {
    id: id as any,
    name,
    score: defaultScore,
    maxScore: 5,
    rawValue: null,
    normalizedValue: defaultScore * 20,
    confidence: 20,
    description: 'Data unavailable - using default score',
    dataSource: createDataSource('Default', 'default', 'low'),
    missingDataStrategy: strategy,
  };
}

function calculateTitleRiskScore(input: InvestmentScoreInput): ComponentScore {
  const { property } = input;
  let normalized = 70; // Default moderate score
  let description = 'Standard title risk';

  // Adjust based on sale type
  if (property.sale_type === 'judicial') {
    normalized = 85; // Judicial sales clear most liens
    description = 'Judicial sale - most liens cleared';
  } else if (property.sale_type === 'upset') {
    normalized = 65; // Upset sales may have surviving liens
    description = 'Upset sale - some liens may survive';
  } else if (property.sale_type === 'repository') {
    normalized = 75; // Repository sales typically clear
    description = 'Repository sale - generally clear title';
  }

  return {
    id: 'title_issues' as RiskComponentId,
    name: 'Title Risk',
    score: normalizedToComponentScore(normalized),
    maxScore: 5,
    rawValue: property.sale_type,
    normalizedValue: normalized,
    confidence: 60,
    description,
    dataSource: createDataSource('Sale Type Analysis', 'calculated', 'medium'),
    missingDataStrategy: 'default_neutral',
  };
}

function calculateZoningScore(input: InvestmentScoreInput): ComponentScore {
  const { property } = input;
  let normalized = 70;
  let description = 'Zoning status unknown';

  if (property.zoning) {
    const zoning = property.zoning.toLowerCase();
    if (zoning.includes('residential') || zoning.includes('r-1') || zoning.includes('r-2')) {
      normalized = 90;
      description = `Residential zoning: ${property.zoning}`;
    } else if (zoning.includes('mixed') || zoning.includes('commercial')) {
      normalized = 75;
      description = `Mixed/commercial zoning: ${property.zoning}`;
    } else if (zoning.includes('industrial')) {
      normalized = 50;
      description = `Industrial zoning: ${property.zoning}`;
    } else {
      normalized = 65;
      description = `Zoning: ${property.zoning}`;
    }
  }

  return {
    id: 'zoning_compliance' as RiskComponentId,
    name: 'Zoning',
    score: normalizedToComponentScore(normalized),
    maxScore: 5,
    rawValue: property.zoning,
    normalizedValue: normalized,
    confidence: property.zoning ? 80 : 30,
    description,
    dataSource: createDataSource('Property Records', 'database', 'medium'),
    missingDataStrategy: 'default_neutral',
  };
}

function calculateRedemptionRiskScore(property: PropertyData): ComponentScore {
  let normalized = 75;
  let description = 'Standard redemption risk';

  // Repository sales have no redemption period
  if (property.sale_type === 'repository') {
    normalized = 95;
    description = 'No redemption period';
  } else if (property.sale_type === 'upset') {
    normalized = 60;
    description = 'Redemption period may apply';
  } else if (property.sale_type === 'judicial') {
    normalized = 80;
    description = 'Limited redemption period';
  }

  return {
    id: 'redemption_risk' as FinancialComponentId,
    name: 'Redemption Risk',
    score: normalizedToComponentScore(normalized),
    maxScore: 5,
    rawValue: property.sale_type,
    normalizedValue: normalized,
    confidence: 70,
    description,
    dataSource: createDataSource('Sale Type Analysis', 'calculated', 'medium'),
    missingDataStrategy: 'default_neutral',
  };
}

function calculateHoldingCostScore(input: InvestmentScoreInput): ComponentScore {
  const { property, financialAnalysis } = input;

  const holdingCosts = financialAnalysis?.costs?.holding?.totalHolding ??
    (property.tax_amount ? property.tax_amount * 0.5 : null); // Estimate 6 months

  let normalized = 70;
  let description = 'Holding costs unknown';

  if (holdingCosts !== null) {
    const purchasePrice = input.purchasePrice ?? property.total_due ?? 10000;
    const holdingRatio = holdingCosts / purchasePrice;

    if (holdingRatio <= 0.05) {
      normalized = 95;
      description = 'Very low holding costs';
    } else if (holdingRatio <= 0.10) {
      normalized = 80;
      description = 'Low holding costs';
    } else if (holdingRatio <= 0.20) {
      normalized = 65;
      description = 'Moderate holding costs';
    } else if (holdingRatio <= 0.35) {
      normalized = 45;
      description = 'High holding costs';
    } else {
      normalized = 25;
      description = 'Very high holding costs';
    }
  }

  return {
    id: 'holding_costs' as FinancialComponentId,
    name: 'Holding Costs',
    score: normalizedToComponentScore(normalized),
    maxScore: 5,
    rawValue: holdingCosts,
    normalizedValue: normalized,
    confidence: holdingCosts ? 70 : 30,
    description,
    dataSource: createDataSource('Financial Analysis', 'calculated', 'medium'),
    missingDataStrategy: 'default_neutral',
  };
}

function calculateExitOptionsScore(input: InvestmentScoreInput): ComponentScore {
  const { property, financialAnalysis, marketData } = input;
  let normalized = 60;
  let description = 'Standard exit options';

  // Better exit options for residential properties with good metrics
  const propertyType = property.property_type || 'unknown';
  const hasGoodComps = (financialAnalysis?.comparables?.comparablesCount ?? 0) >= 3;
  const hasGoodMarket = marketData?.medianDaysOnMarket && marketData.medianDaysOnMarket < 60;

  if (propertyType === 'single_family_residential') {
    normalized = 80;
    description = 'Multiple exit strategies: flip, rent, wholesale';
  } else if (propertyType === 'multi_family_residential') {
    normalized = 85;
    description = 'Strong rental potential with flip option';
  } else if (propertyType === 'vacant_land') {
    normalized = 50;
    description = 'Limited exit options - hold or develop';
  } else if (propertyType === 'commercial') {
    normalized = 55;
    description = 'Commercial exit requires specialized buyers';
  }

  if (hasGoodComps) normalized += 5;
  if (hasGoodMarket) normalized += 5;

  normalized = Math.min(100, normalized);

  return {
    id: 'exit_options' as ProfitComponentId,
    name: 'Exit Options',
    score: normalizedToComponentScore(normalized),
    maxScore: 5,
    rawValue: propertyType,
    normalizedValue: normalized,
    confidence: 65,
    description,
    dataSource: createDataSource('Property Analysis', 'calculated', 'medium'),
    missingDataStrategy: 'default_neutral',
  };
}

function calculateTimeToProfitScore(input: InvestmentScoreInput): ComponentScore {
  const { financialAnalysis, marketData } = input;

  const holdingMonths = financialAnalysis?.recommendation?.timelineMonths ?? 6;
  const dom = marketData?.medianDaysOnMarket ?? 60;

  // Estimate total time to exit
  const totalTimeMonths = holdingMonths + (dom / 30);

  let normalized: number;
  let description: string;

  if (totalTimeMonths <= 3) {
    normalized = 95;
    description = 'Quick flip potential (~3 months)';
  } else if (totalTimeMonths <= 6) {
    normalized = 85;
    description = 'Short-term exit (~6 months)';
  } else if (totalTimeMonths <= 9) {
    normalized = 70;
    description = 'Medium-term hold (~9 months)';
  } else if (totalTimeMonths <= 12) {
    normalized = 55;
    description = 'Standard timeline (~12 months)';
  } else {
    normalized = 40;
    description = 'Long-term hold expected';
  }

  return {
    id: 'time_to_profit' as ProfitComponentId,
    name: 'Time to Profit',
    score: normalizedToComponentScore(normalized),
    maxScore: 5,
    rawValue: totalTimeMonths,
    normalizedValue: normalized,
    confidence: 60,
    description,
    dataSource: createDataSource('Market Analysis', 'calculated', 'medium'),
    missingDataStrategy: 'default_neutral',
  };
}

// ============================================
// Description Helper Functions
// ============================================

function getWalkScoreDescription(score: number): string {
  if (score >= 90) return 'Walker\'s Paradise - daily errands do not require a car';
  if (score >= 70) return 'Very Walkable - most errands can be accomplished on foot';
  if (score >= 50) return 'Somewhat Walkable - some errands can be accomplished on foot';
  if (score >= 25) return 'Car-Dependent - most errands require a car';
  return 'Almost All Errands Require a Car';
}

function getCrimeDescription(index: number): string {
  if (index <= 20) return 'Very Low Crime - significantly below national average';
  if (index <= 40) return 'Low Crime - below national average';
  if (index <= 60) return 'Average Crime - near national average';
  if (index <= 80) return 'High Crime - above national average';
  return 'Very High Crime - significantly above national average';
}

function getSchoolDescription(rating: number): string {
  if (rating >= 9) return 'Excellent Schools (9-10/10)';
  if (rating >= 7) return 'Good Schools (7-8/10)';
  if (rating >= 5) return 'Average Schools (5-6/10)';
  if (rating >= 3) return 'Below Average Schools (3-4/10)';
  return 'Poor Schools (1-2/10)';
}

function getTransitDescription(score: number): string {
  if (score >= 90) return 'Excellent Transit - world-class public transportation';
  if (score >= 70) return 'Excellent Transit - convenient for most trips';
  if (score >= 50) return 'Good Transit - many nearby public transportation options';
  if (score >= 25) return 'Some Transit - a few public transportation options';
  return 'Minimal Transit - limited public transportation';
}

function getDOMDescription(dom: number): string {
  if (dom <= 14) return 'Very Hot Market - properties selling in 2 weeks';
  if (dom <= 30) return 'Hot Market - properties selling within a month';
  if (dom <= 60) return 'Active Market - standard selling time';
  if (dom <= 90) return 'Slower Market - extended time on market';
  return 'Cold Market - properties sitting for extended periods';
}

function getPriceTrendDescription(change: number): string {
  if (change >= 10) return `Strong appreciation (+${Math.round(change)}% YoY)`;
  if (change >= 5) return `Healthy appreciation (+${Math.round(change)}% YoY)`;
  if (change >= 0) return `Stable prices (+${Math.round(change)}% YoY)`;
  if (change >= -5) return `Slight decline (${Math.round(change)}% YoY)`;
  return `Declining market (${Math.round(change)}% YoY)`;
}

// ============================================
// Confidence Calculation
// ============================================

function calculateConfidence(categories: CategoryScore[]): ConfidenceResult {
  const factors: ConfidenceFactor[] = [];

  // Factor 1: Data Completeness
  const avgCompleteness = categories.reduce((sum, c) => sum + c.dataCompleteness, 0) / categories.length;
  factors.push({
    name: 'Data Completeness',
    impact: (avgCompleteness - 50) / 2,
    weight: 0.3,
    status: avgCompleteness >= 70 ? 'positive' : avgCompleteness >= 40 ? 'neutral' : 'negative',
    description: `${Math.round(avgCompleteness)}% of required data available`,
  });

  // Factor 2: Component Confidence
  const avgComponentConfidence = categories.reduce((sum, c) =>
    sum + c.components.reduce((s, comp) => s + comp.confidence, 0) / c.components.length, 0) / categories.length;
  factors.push({
    name: 'Source Reliability',
    impact: (avgComponentConfidence - 50) / 2,
    weight: 0.3,
    status: avgComponentConfidence >= 70 ? 'positive' : avgComponentConfidence >= 40 ? 'neutral' : 'negative',
    description: `Average component confidence: ${Math.round(avgComponentConfidence)}%`,
  });

  // Factor 3: Category Balance
  const scores = categories.map(c => c.score / c.maxScore);
  const variance = calculateVariance(scores);
  const balanceImpact = variance < 0.05 ? 10 : variance < 0.1 ? 5 : variance < 0.2 ? 0 : -10;
  factors.push({
    name: 'Score Consistency',
    impact: balanceImpact,
    weight: 0.2,
    status: balanceImpact > 0 ? 'positive' : balanceImpact === 0 ? 'neutral' : 'negative',
    description: variance < 0.1 ? 'Consistent scores across categories' : 'Significant variation between categories',
  });

  // Factor 4: Critical Data Present
  const hasCriticalData = categories.every(c => c.dataCompleteness >= 20);
  factors.push({
    name: 'Critical Data Coverage',
    impact: hasCriticalData ? 15 : -20,
    weight: 0.2,
    status: hasCriticalData ? 'positive' : 'negative',
    description: hasCriticalData ? 'All categories have minimum data' : 'Some categories missing critical data',
  });

  // Calculate overall confidence
  const overall = Math.max(0, Math.min(100,
    50 + factors.reduce((sum, f) => sum + f.impact * f.weight, 0) * 2
  ));

  // Generate recommendations
  const recommendations: string[] = [];
  if (avgCompleteness < 70) {
    recommendations.push('Gather more property data to improve scoring accuracy');
  }
  if (avgComponentConfidence < 70) {
    recommendations.push('Verify data from primary sources for higher confidence');
  }
  if (variance > 0.15) {
    recommendations.push('Investigate categories with significantly lower scores');
  }

  return {
    overall: Math.round(overall),
    label: getConfidenceLabel(overall),
    factors,
    recommendations,
  };
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}

// ============================================
// Warning Generation
// ============================================

function generateWarnings(
  input: InvestmentScoreInput,
  categories: CategoryScore[],
  gradeResult: GradeResult
): ScoringWarning[] {
  const warnings: ScoringWarning[] = [];

  // Check for low category scores
  categories.forEach(category => {
    if (category.score < category.maxScore * 0.4) {
      warnings.push({
        severity: 'warning',
        category: category.id,
        message: `Low ${category.name} score (${category.score}/${category.maxScore})`,
        recommendation: `Review ${category.name.toLowerCase()} factors before investing`,
      });
    }

    // Check for low data completeness
    if (category.dataCompleteness < 30) {
      warnings.push({
        severity: 'info',
        category: category.id,
        message: `Limited data for ${category.name} category`,
        recommendation: `Gather more ${category.name.toLowerCase()} data for accurate scoring`,
      });
    }
  });

  // Check overall score
  if (gradeResult.grade === 'F') {
    warnings.push({
      severity: 'critical',
      category: 'overall',
      message: 'Property scored poorly across multiple categories',
      recommendation: 'This investment is not recommended without significant additional analysis',
    });
  }

  // Check for specific red flags
  if (input.riskAssessment?.riskScore && input.riskAssessment.riskScore > 70) {
    warnings.push({
      severity: 'warning',
      category: 'risk',
      message: 'High overall risk score detected',
      recommendation: 'Review risk factors carefully, especially flood and environmental risks',
    });
  }

  return warnings;
}

// ============================================
// Main Scoring Function
// ============================================

/**
 * Calculate the complete 125-point investment score
 *
 * @param input - Property data, risk assessment, financial analysis, and market data
 * @param options - Scoring configuration options
 * @returns Complete investment score result with breakdown
 */
export function calculateInvestmentScore(
  input: InvestmentScoreInput,
  options: InvestmentScoreOptions = {}
): InvestmentScoreResult {
  const defaultOptions: InvestmentScoreOptions = {
    missingDataStrategy: 'default_neutral',
    applyRegionalAdjustments: true,
    minConfidenceThreshold: 20,
  };
  const mergedOptions = { ...defaultOptions, ...options };

  // Calculate each category score
  const locationScore = calculateLocationScore(input, mergedOptions);
  const riskScore = calculateRiskScore(input, mergedOptions);
  const financialScore = calculateFinancialScore(input, mergedOptions);
  const marketScore = calculateMarketScore(input, mergedOptions);
  const profitScore = calculateProfitScore(input, mergedOptions);

  const categories: CategoryScore[] = [
    locationScore,
    riskScore,
    financialScore,
    marketScore,
    profitScore,
  ];

  // Calculate total score
  const totalScore = categories.reduce((sum, c) => sum + c.score, 0);
  const percentage = (totalScore / MAX_TOTAL_SCORE) * 100;

  // Calculate grade
  const gradeResult = calculateGrade(percentage);

  // Calculate confidence
  const confidenceLevel = calculateConfidence(categories);

  // Generate warnings
  const warnings = generateWarnings(input, categories, gradeResult);

  // Build score breakdown
  const breakdown: ScoreBreakdown = {
    id: `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    propertyId: input.property.id,
    totalScore: Math.round(totalScore * 10) / 10,
    gradeResult,
    confidenceLevel,
    location: locationScore,
    risk: riskScore,
    financial: financialScore,
    market: marketScore,
    profit: profitScore,
    scoringVersion: SCORING_VERSION,
    calculatedAt: new Date(),
    propertyType: input.property.property_type || 'unknown',
    regionalAdjustments: [], // Could be populated based on state
    warnings,
  };

  // Generate summary
  const summary = generateSummary(gradeResult, categories, warnings);

  return {
    totalScore: Math.round(totalScore * 10) / 10,
    grade: gradeResult.grade,
    gradeWithModifier: gradeResult.gradeWithModifier,
    categories,
    breakdown,
    summary,
  };
}

function generateSummary(
  grade: GradeResult,
  categories: CategoryScore[],
  warnings: ScoringWarning[]
): string {
  const strengths = categories
    .filter(c => c.score >= c.maxScore * 0.7)
    .map(c => c.name);

  const weaknesses = categories
    .filter(c => c.score < c.maxScore * 0.5)
    .map(c => c.name);

  let summary = `${grade.gradeWithModifier} Investment: ${grade.description}. `;

  if (strengths.length > 0) {
    summary += `Strengths in ${strengths.join(', ')}. `;
  }

  if (weaknesses.length > 0) {
    summary += `Areas of concern: ${weaknesses.join(', ')}. `;
  }

  if (warnings.some(w => w.severity === 'critical')) {
    summary += 'Critical warnings present - review carefully. ';
  }

  return summary.trim();
}

// Note: All types are exported at their definitions above:
// - MarketData (line ~84)
// - LocationData (line ~104)
// - InvestmentScoreInput (line ~138)
// - InvestmentScoreOptions (line ~158)
// - InvestmentScoreResult (line ~170)
