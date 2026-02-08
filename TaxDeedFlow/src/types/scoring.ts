/**
 * Property Analysis Report System - Scoring Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the 125-point
 * investment scoring system. The scoring system evaluates properties across
 * 5 categories (Location, Risk, Financial, Market, Profit), each worth 25 points.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

// ============================================
// Grade Types
// ============================================

/**
 * Available letter grade levels (A through F)
 * Used for overall property investment rating
 */
export type GradeLevel = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Grade with optional modifier (+/-) for finer granularity
 * - A+/A/A-: Excellent (80-100%)
 * - B+/B/B-: Good (60-79%)
 * - C+/C/C-: Average (40-59%)
 * - D+/D/D-: Below Average (20-39%)
 * - F: Poor (0-19%)
 */
export type GradeWithModifier =
  | 'A+'
  | 'A'
  | 'A-'
  | 'B+'
  | 'B'
  | 'B-'
  | 'C+'
  | 'C'
  | 'C-'
  | 'D+'
  | 'D'
  | 'D-'
  | 'F';

/**
 * Complete grade result with calculation details
 * Provides both the grade and the underlying metrics
 */
export interface GradeResult {
  /** Letter grade (A-F) */
  grade: GradeLevel;
  /** Grade with modifier (A+, A, A-, etc.) */
  gradeWithModifier: GradeWithModifier;
  /** Percentage of maximum score achieved (0-100) */
  percentage: number;
  /** Minimum points threshold met for this grade */
  thresholdMet: number;
  /** Human-readable description of the grade meaning */
  description: string;
}

// ============================================
// Category and Component ID Types
// ============================================

/**
 * Valid category identifiers for the 5 scoring categories
 * Each category is worth 25 points (20% of total)
 */
export type CategoryId = 'location' | 'risk' | 'financial' | 'market' | 'profit';

/**
 * Location category component IDs
 * Measures neighborhood quality, accessibility, and amenities
 */
export type LocationComponentId =
  | 'walk_score'
  | 'crime_index'
  | 'school_rating'
  | 'amenity_count'
  | 'transit_score';

/**
 * Risk category component IDs
 * Measures natural hazards, environmental, and title risks
 */
export type RiskComponentId =
  | 'flood_zone'
  | 'environmental_hazards'
  | 'structural_risk'
  | 'title_issues'
  | 'zoning_compliance';

/**
 * Financial category component IDs
 * Measures tax efficiency, liens, and holding costs
 */
export type FinancialComponentId =
  | 'tax_efficiency'
  | 'lien_complexity'
  | 'assessment_ratio'
  | 'redemption_risk'
  | 'holding_costs';

/**
 * Market category component IDs
 * Measures supply/demand dynamics and appreciation trends
 */
export type MarketComponentId =
  | 'days_on_market'
  | 'price_trend'
  | 'inventory_level'
  | 'absorption_rate'
  | 'competition_level';

/**
 * Profit category component IDs
 * Measures ROI, cash flow, and exit strategy viability
 */
export type ProfitComponentId =
  | 'roi_potential'
  | 'cash_flow'
  | 'equity_margin'
  | 'exit_options'
  | 'time_to_profit';

/**
 * All valid component IDs across all categories
 * Union type for type-safe component references
 */
export type ComponentId =
  | LocationComponentId
  | RiskComponentId
  | FinancialComponentId
  | MarketComponentId
  | ProfitComponentId;

// ============================================
// Data Source Types
// ============================================

/**
 * Tracks where scoring data originated from
 * Used for transparency and reliability assessment
 */
export interface DataSource {
  /** Name of the data source (e.g., "Regrid", "FEMA", "WalkScore") */
  name: string;
  /** Type of data source */
  type: 'api' | 'database' | 'calculated' | 'estimated' | 'default';
  /** When the data was last updated */
  lastUpdated?: Date;
  /** Reliability assessment of this source */
  reliability: 'high' | 'medium' | 'low';
}

/**
 * Strategy used when scoring data is missing
 * Determines how to handle incomplete property information
 */
export type MissingDataStrategy =
  | 'default_neutral' // Use middle score (2.5 of 5)
  | 'default_conservative' // Use lower score (1.5 of 5)
  | 'default_optimistic' // Use higher score (3.5 of 5)
  | 'skip_component' // Exclude from calculation, redistribute weight
  | 'require_data' // Cannot score without this data
  | 'estimate_from_peers'; // Use similar property data

// ============================================
// Property Type Classifications
// ============================================

/**
 * Property types for type-specific scoring adjustments
 * Different property types have different scoring criteria
 */
export type PropertyType =
  | 'single_family_residential'
  | 'multi_family_residential'
  | 'commercial'
  | 'industrial'
  | 'vacant_land'
  | 'mixed_use'
  | 'agricultural'
  | 'unknown';

// ============================================
// Score Component Interfaces
// ============================================

/**
 * Individual component within a category (5 points max each)
 * Each category has 5 components, each worth up to 5 points
 */
export interface ComponentScore {
  /** Unique identifier for the component */
  id: ComponentId;
  /** Display name of the component */
  name: string;
  /** Calculated score (0-5) */
  score: number;
  /** Maximum possible score (always 5) */
  maxScore: 5;
  /** Original raw value before transformation */
  rawValue: unknown;
  /** Normalized value on 0-100 scale */
  normalizedValue: number;
  /** Confidence level for this component (0-100%) */
  confidence: number;
  /** Human-readable explanation of the score */
  description: string;
  /** Source of the data used for scoring */
  dataSource: DataSource;
  /** Strategy used if data was missing */
  missingDataStrategy: MissingDataStrategy;
}

/**
 * Score adjustment for regional or property-type factors
 * Applied to modify base scores based on context
 */
export interface ScoreAdjustment {
  /** Type of adjustment being applied */
  type: 'regional' | 'property_type' | 'market_condition' | 'data_quality';
  /** Multiplier applied (e.g., 1.1 = +10%, 0.9 = -10%) */
  factor: number;
  /** Reason for the adjustment */
  reason: string;
  /** Component or category this applies to */
  appliedTo: string;
}

/**
 * Base category score interface (25 points max each)
 * Aggregates 5 component scores into a category total
 */
export interface CategoryScore {
  /** Unique identifier for the category */
  id: CategoryId;
  /** Display name of the category */
  name: string;
  /** Calculated score (0-25) */
  score: number;
  /** Maximum possible score (default 25, adjustable with custom weights) */
  maxScore: number;
  /** Confidence level for this category (0-100%) */
  confidence: number;
  /** Percentage of required data present (0-100%) */
  dataCompleteness: number;
  /** Individual component scores (5 per category) */
  components: ComponentScore[];
  /** Additional notes about the scoring */
  notes: string[];
  /** Any adjustments applied to the score */
  adjustments: ScoreAdjustment[];
}

// ============================================
// Regional Adjustment Types
// ============================================

/**
 * Regional adjustment configuration
 * Allows tuning scores based on geographic location
 */
export interface RegionalAdjustment {
  /** State code (e.g., "PA", "FL") */
  state: string;
  /** Metro area name (optional) */
  metro?: string;
  /** County name (optional) */
  county?: string;
  /** Adjustments to apply for this region */
  adjustments: {
    /** Category this adjustment applies to */
    category: CategoryId;
    /** Component this adjustment applies to */
    component: ComponentId;
    /** Multiplier factor to apply */
    factor: number;
    /** Reason for this regional adjustment */
    reason: string;
  }[];
}

// ============================================
// Confidence Types
// ============================================

/**
 * Confidence level labels for human-readable display
 */
export type ConfidenceLabel = 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low';

/**
 * Individual factor affecting confidence calculation
 * Used to explain why confidence is at a certain level
 */
export interface ConfidenceFactor {
  /** Name of the factor (e.g., "Data Completeness", "Source Reliability") */
  name: string;
  /** Impact on confidence (-50 to +50) */
  impact: number;
  /** Weight of this factor in calculation (0-1) */
  weight: number;
  /** Status assessment of this factor */
  status: 'positive' | 'neutral' | 'negative';
  /** Detailed description of the factor */
  description: string;
}

/**
 * Complete confidence calculation result
 * Provides overall confidence with detailed breakdown
 */
export interface ConfidenceResult {
  /** Overall confidence percentage (0-100) */
  overall: number;
  /** Human-readable confidence label */
  label: ConfidenceLabel;
  /** Individual factors affecting confidence */
  factors: ConfidenceFactor[];
  /** Recommendations to improve confidence */
  recommendations: string[];
}

// ============================================
// Warning Types
// ============================================

/**
 * Warning about scoring limitations or concerns
 * Alerts users to potential issues with the score
 */
export interface ScoringWarning {
  /** Severity level of the warning */
  severity: 'info' | 'warning' | 'critical';
  /** Category this warning applies to (or 'overall') */
  category: CategoryId | 'overall';
  /** Warning message */
  message: string;
  /** Recommendation to address the warning */
  recommendation: string;
}

// ============================================
// Complete Score Breakdown
// ============================================

/**
 * Comprehensive score breakdown for a property
 * Contains all scoring details across all 5 categories
 */
export interface ScoreBreakdown {
  /** Unique identifier for this score calculation */
  id: string;
  /** Property ID this score belongs to */
  propertyId: string;
  /** Total calculated score (0-125) */
  totalScore: number;
  /** Grade result with all details */
  gradeResult: GradeResult;
  /** Overall confidence assessment */
  confidenceLevel: ConfidenceResult;

  /** Location category scores (25 points max) */
  location: CategoryScore;
  /** Risk category scores (25 points max) */
  risk: CategoryScore;
  /** Financial category scores (25 points max) */
  financial: CategoryScore;
  /** Market category scores (25 points max) */
  market: CategoryScore;
  /** Profit category scores (25 points max) */
  profit: CategoryScore;

  // Metadata
  /** Version of the scoring algorithm used */
  scoringVersion: string;
  /** When the score was calculated */
  calculatedAt: Date;
  /** Type of property being scored */
  propertyType: PropertyType;
  /** Regional adjustments applied to this score */
  regionalAdjustments: RegionalAdjustment[];
  /** Warnings about this score */
  warnings: ScoringWarning[];
}

// ============================================
// Property Data Interface
// ============================================

/**
 * Core property data used for scoring calculations
 * Represents the primary property information from the database
 */
export interface PropertyData {
  /** Unique property identifier (UUID) */
  id: string;
  /** Parcel ID from the county assessor */
  parcel_id: string;
  /** Full street address */
  address: string | null;
  /** City name */
  city: string | null;
  /** State code (e.g., 'PA', 'FL') */
  state: string;
  /** ZIP code */
  zip: string | null;
  /** Reference to the county (UUID) */
  county_id: string;
  /** County name for display */
  county_name: string;
  /** Current owner name(s) */
  owner_name: string | null;
  /** Total amount due (taxes, fees, penalties) */
  total_due: number | null;
  /** Base tax amount */
  tax_amount: number | null;
  /** Tax year the debt is from */
  tax_year: number | null;
  /** Type of sale (upset, judicial, repository, etc.) */
  sale_type: string | null;
  /** Scheduled auction date */
  sale_date: Date | null;
  /** Geographic coordinates */
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  /** Lot size in square feet */
  lot_size_sqft: number | null;
  /** Lot size in acres */
  lot_size_acres: number | null;
  /** Building square footage */
  building_sqft: number | null;
  /** Year the structure was built */
  year_built: number | null;
  /** Number of bedrooms */
  bedrooms: number | null;
  /** Number of bathrooms */
  bathrooms: number | null;
  /** County assessed value */
  assessed_value: number | null;
  /** Estimated market value */
  market_value: number | null;
  /** Property type classification */
  property_type: PropertyType;
  /** Zoning designation */
  zoning: string | null;
  /** Land use classification */
  land_use: string | null;
  /** Visual validation status */
  validation_status: 'APPROVED' | 'CAUTION' | 'REJECT' | null;
  /** Current pipeline stage */
  pipeline_stage: string | null;
  /** Whether Regrid data has been fetched */
  has_regrid_data: boolean;
  /** Whether screenshot has been captured */
  has_screenshot: boolean;
  /** URL to the property screenshot */
  screenshot_url: string | null;
  /** Assessed improvement value from county assessor (0 = vacant/no structure) */
  assessed_improvement_value: number | null;
  /** Flag indicating property is a vacant lot (from Regrid or assessor data) */
  is_vacant_lot: boolean;
  /** Flag indicating property is likely a mobile/manufactured home */
  is_likely_mobile_home: boolean;
}

// ============================================
// External Data Interface
// ============================================

/**
 * External data sources used for scoring enrichment
 * Represents data fetched from third-party APIs
 */
export interface ExternalData {
  /** Walk Score (0-100) from walkscore.com */
  walkScore: number | null;
  /** Transit Score (0-100) from walkscore.com */
  transitScore: number | null;
  /** Bike Score (0-100) from walkscore.com */
  bikeScore: number | null;

  /** Crime data for the area */
  crimeData: {
    /** Crime index (0-100, higher = more crime) */
    crimeIndex: number | null;
    /** Violent crime rate per 1000 residents */
    violentCrimeRate: number | null;
    /** Property crime rate per 1000 residents */
    propertyCrimeRate: number | null;
    /** Data source name */
    source: string | null;
    /** Date the data is from */
    asOf: Date | null;
  } | null;

  /** School rating information */
  schoolRating: {
    /** Overall school rating (1-10) */
    overallRating: number | null;
    /** Elementary school rating (1-10) */
    elementaryRating: number | null;
    /** Middle school rating (1-10) */
    middleRating: number | null;
    /** High school rating (1-10) */
    highRating: number | null;
    /** Data source (GreatSchools, Niche, etc.) */
    source: string | null;
  } | null;

  /** FEMA flood zone information */
  floodZone: {
    /** Flood zone code (A, AE, X, etc.) */
    zone: string | null;
    /** Risk level assessment */
    riskLevel: 'high' | 'moderate' | 'low' | 'minimal' | null;
    /** Whether flood insurance is required */
    insuranceRequired: boolean | null;
    /** Base flood elevation if available (feet) */
    baseFloodElevation: number | null;
  } | null;

  /** Nearby amenities count and details */
  nearbyAmenities: {
    /** Count of restaurants within 1 mile */
    restaurants: number | null;
    /** Count of grocery stores within 1 mile */
    groceryStores: number | null;
    /** Count of parks within 1 mile */
    parks: number | null;
    /** Count of hospitals within 5 miles */
    hospitals: number | null;
    /** Count of shopping centers within 2 miles */
    shopping: number | null;
    /** Total amenity score (calculated) */
    totalScore: number | null;
  } | null;

  /** Environmental hazard data */
  environmentalHazards: {
    /** Number of EPA Superfund sites within 1 mile */
    superfundSites: number | null;
    /** Number of brownfield sites within 0.5 mile */
    brownfieldSites: number | null;
    /** Air quality index (0-500, lower is better) */
    airQualityIndex: number | null;
    /** Overall environmental risk score (0-100) */
    riskScore: number | null;
  } | null;

  /** Market data for the area */
  marketData: {
    /** Median days on market for comparable properties */
    medianDaysOnMarket: number | null;
    /** Year-over-year price change percentage */
    priceChangeYoY: number | null;
    /** Active inventory count in the area */
    inventoryCount: number | null;
    /** Monthly absorption rate */
    absorptionRate: number | null;
    /** Median sale price in the area */
    medianSalePrice: number | null;
    /** Price per square foot */
    pricePerSqFt: number | null;
  } | null;

  /** Comparable sales data */
  comparableSales: {
    /** Number of comparable sales found */
    count: number;
    /** Average sale price of comparables */
    avgSalePrice: number | null;
    /** Median sale price of comparables */
    medianSalePrice: number | null;
    /** Average price per square foot */
    avgPricePerSqFt: number | null;
    /** Date range of comparable sales */
    dateRange: {
      start: Date;
      end: Date;
    } | null;
  } | null;

  /** Road access and landlocked status data */
  accessData: {
    /** Whether the property appears to be landlocked */
    landlocked: boolean;
    /** Type of road access (public_primary, public_residential, private, track, path, none) */
    roadAccessType: string;
    /** Distance to nearest public road in meters */
    distanceToPublicRoad: number;
    /** Risk level assessment (low, moderate, high, severe) */
    riskLevel: string | null;
    /** Analysis notes */
    notes: string[] | null;
  } | null;
}

// ============================================
// Data Availability Interface
// ============================================

/**
 * Tracks what data is available for a property
 * Used for confidence calculations and missing data handling
 */
export interface DataAvailability {
  // Core property data
  /** Whether basic property info exists */
  hasPropertyData: boolean;
  /** Whether Regrid enrichment data exists */
  hasRegridData: boolean;
  /** Whether visual validation has been performed */
  hasValidation: boolean;
  /** Whether address is available */
  hasAddress: boolean;
  /** Whether coordinates are available */
  hasCoordinates: boolean;
  /** Whether owner information is available */
  hasOwnerInfo: boolean;
  /** Whether parcel ID is available */
  hasParcelId: boolean;
  /** Whether total due amount is available */
  hasTotalDue: boolean;
  /** Whether sale date is available */
  hasSaleDate: boolean;

  // Valuation data
  /** Whether assessed value is available */
  hasAssessedValue: boolean;
  /** Whether market value is available */
  hasMarketValue: boolean;
  /** Whether comparable sales data is available */
  hasComparableSales: boolean;

  // External data
  /** Whether Walk Score is available */
  hasWalkScore: boolean;
  /** Whether crime data is available */
  hasCrimeData: boolean;
  /** Whether school ratings are available */
  hasSchoolRating: boolean;
  /** Whether flood zone info is available */
  hasFloodZone: boolean;
  /** Whether amenity data is available */
  hasAmenityData: boolean;
  /** Whether environmental data is available */
  hasEnvironmentalData: boolean;
  /** Whether market data is available */
  hasMarketData: boolean;
  /** Whether road access/landlocked data is available */
  hasAccessData: boolean;

  // Structure data
  /** Whether building square footage is available */
  hasBuildingSqFt: boolean;
  /** Whether lot size is available */
  hasLotSize: boolean;
  /** Whether year built is available */
  hasYearBuilt: boolean;
  /** Whether bedroom/bathroom count is available */
  hasBedroomBathroom: boolean;

  // Screenshot/visual data
  /** Whether screenshot URL is available */
  hasScreenshot: boolean;
  /** Whether street view is available */
  hasStreetView: boolean;

  /** Overall data completeness percentage (0-100) */
  completenessScore: number;
  /** List of critical missing fields */
  missingCriticalFields: string[];
  /** List of optional missing fields */
  missingOptionalFields: string[];
}

/**
 * Calculate data availability for a property
 * Analyzes property and external data to determine what's available
 *
 * @param property - Core property data from the database
 * @param externalData - External data from third-party APIs (or null)
 * @returns DataAvailability object with completeness metrics
 */
export function calculateDataAvailability(
  property: PropertyData,
  externalData: ExternalData | null
): DataAvailability {
  const availability: DataAvailability = {
    // Core property data
    hasPropertyData: !!property.id,
    hasRegridData: property.has_regrid_data,
    hasValidation: property.validation_status !== null,
    hasAddress: !!property.address,
    hasCoordinates: property.coordinates !== null,
    hasOwnerInfo: !!property.owner_name,
    hasParcelId: !!property.parcel_id,
    hasTotalDue: property.total_due !== null,
    hasSaleDate: property.sale_date !== null,

    // Valuation data
    hasAssessedValue: property.assessed_value !== null,
    hasMarketValue: property.market_value !== null,
    hasComparableSales:
      externalData?.comparableSales !== null &&
      (externalData?.comparableSales?.count ?? 0) > 0,

    // External data
    hasWalkScore: externalData?.walkScore !== null,
    hasCrimeData: externalData?.crimeData?.crimeIndex !== null,
    hasSchoolRating: externalData?.schoolRating?.overallRating !== null,
    hasFloodZone: externalData?.floodZone?.zone !== null,
    hasAmenityData: externalData?.nearbyAmenities !== null,
    hasEnvironmentalData: externalData?.environmentalHazards !== null,
    hasMarketData: externalData?.marketData !== null,
    hasAccessData: externalData?.accessData !== null,

    // Structure data
    hasBuildingSqFt: property.building_sqft !== null,
    hasLotSize:
      property.lot_size_sqft !== null || property.lot_size_acres !== null,
    hasYearBuilt: property.year_built !== null,
    hasBedroomBathroom:
      property.bedrooms !== null || property.bathrooms !== null,

    // Screenshot/visual data
    hasScreenshot: property.has_screenshot,
    hasStreetView: false, // Determined separately via Google Maps API

    completenessScore: 0,
    missingCriticalFields: [],
    missingOptionalFields: [],
  };

  // Define critical and optional fields for completeness calculation
  // Critical fields are worth 60% of the completeness score
  const criticalFields = [
    'hasAddress',
    'hasCoordinates',
    'hasTotalDue',
    'hasParcelId',
    'hasSaleDate',
  ];

  // Optional fields are worth 40% of the completeness score
  const optionalFields = [
    'hasRegridData',
    'hasValidation',
    'hasOwnerInfo',
    'hasAssessedValue',
    'hasMarketValue',
    'hasWalkScore',
    'hasCrimeData',
    'hasSchoolRating',
    'hasFloodZone',
    'hasAmenityData',
    'hasEnvironmentalData',
    'hasMarketData',
    'hasAccessData',
    'hasBuildingSqFt',
    'hasLotSize',
    'hasYearBuilt',
    'hasBedroomBathroom',
    'hasScreenshot',
    'hasComparableSales',
  ];

  // Check critical fields and collect missing ones
  criticalFields.forEach((field) => {
    if (!availability[field as keyof DataAvailability]) {
      // Convert field name to human-readable format
      // e.g., "hasAddress" -> "Address"
      availability.missingCriticalFields.push(field.replace('has', ''));
    }
  });

  // Check optional fields and collect missing ones
  optionalFields.forEach((field) => {
    if (!availability[field as keyof DataAvailability]) {
      availability.missingOptionalFields.push(field.replace('has', ''));
    }
  });

  // Calculate completeness score
  // Critical fields (60% weight): Each critical field is worth 12%
  // Optional fields (40% weight): Each optional field is worth ~2.2%
  const criticalScore =
    (criticalFields.filter(
      (f) => availability[f as keyof DataAvailability]
    ).length /
      criticalFields.length) *
    60;

  const optionalScore =
    (optionalFields.filter(
      (f) => availability[f as keyof DataAvailability]
    ).length /
      optionalFields.length) *
    40;

  availability.completenessScore = Math.round(criticalScore + optionalScore);

  return availability;
}
