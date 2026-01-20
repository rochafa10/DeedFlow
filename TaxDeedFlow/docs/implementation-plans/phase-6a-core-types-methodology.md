# Phase 6A: Core Types & Methodology

## Overview

Phase 6A establishes the foundational type definitions and scoring methodology for the 125-point investment scoring system. This phase provides the core building blocks that all subsequent scoring phases will rely upon.

### Phase 6A Objectives

1. Define the 125-point scoring system methodology
2. Establish grade calculation thresholds (A/B/C/D/F)
3. Create core TypeScript interfaces for scoring components
4. Define scoring constants and configuration types

---

## The 125-Point Scoring System

### Philosophy

The scoring system is designed around these core principles:

1. **Transparency**: Every score has clear thresholds, data sources, and explanations
2. **Consistency**: Unified handling of missing data, edge cases, and grade calculation
3. **Adaptability**: Regional adjustments and property-type-specific scoring
4. **Calibration**: Weights and thresholds can be tuned based on actual outcomes
5. **Confidence**: Multi-factor confidence calculation reflects data quality

### Score Categories

The system divides property evaluation into 5 equally-weighted categories, each worth a maximum of 25 points:

| Category | Max Points | Weight | Purpose |
|----------|------------|--------|---------|
| **Location** | 25 | 20% | Neighborhood quality, accessibility, amenities |
| **Risk** | 25 | 20% | Natural hazards, environmental concerns |
| **Financial** | 25 | 20% | Tax efficiency, liens, title clarity |
| **Market** | 25 | 20% | Supply/demand dynamics, appreciation trends |
| **Profit** | 25 | 20% | ROI, cash flow, exit strategy viability |

**Total Maximum Score: 125 points**

### Component Structure

Each category contains 5 components, each worth up to 5 points:

```
Category (25 points max)
├── Component 1 (5 points max)
├── Component 2 (5 points max)
├── Component 3 (5 points max)
├── Component 4 (5 points max)
└── Component 5 (5 points max)
```

---

## Grade Thresholds

Grades are calculated using **percentage-based thresholds** consistently across all contexts:

| Grade | Min Percentage | Min Points | Description |
|-------|----------------|------------|-------------|
| **A** | 80% | 100 | Excellent investment opportunity |
| **B** | 60% | 75 | Good investment with minor concerns |
| **C** | 40% | 50 | Average investment, proceed with caution |
| **D** | 20% | 25 | Below average, significant concerns |
| **F** | 0% | 0 | Poor investment, not recommended |

### Grade Modifier System

Within each grade, modifiers (+ and -) provide additional granularity:

- **A+**: 95-100% (119-125 points)
- **A**: 87-94% (109-118 points)
- **A-**: 80-86% (100-108 points)
- **B+**: 73-79% (92-99 points)
- **B**: 67-72% (84-91 points)
- **B-**: 60-66% (75-83 points)
- And so on...

---

## Core TypeScript Interfaces

### Grade Level Type

```typescript
// src/types/scoring.ts

/**
 * Available grade levels
 */
export type GradeLevel = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Grade with optional modifier
 */
export type GradeWithModifier =
  | 'A+' | 'A' | 'A-'
  | 'B+' | 'B' | 'B-'
  | 'C+' | 'C' | 'C-'
  | 'D+' | 'D' | 'D-'
  | 'F';
```

### Grade Result Interface

```typescript
/**
 * Grade result with unified calculation method
 */
export interface GradeResult {
  /** Letter grade (A-F) */
  grade: GradeLevel;
  /** Grade with modifier (A+, A, A-, etc.) */
  gradeWithModifier: GradeWithModifier;
  /** Percentage of maximum score achieved */
  percentage: number;
  /** Minimum points threshold met */
  thresholdMet: number;
  /** Human-readable description of the grade */
  description: string;
}
```

### Component Score Interface

```typescript
/**
 * Individual component within a category (5 points max each)
 */
export interface ComponentScore {
  /** Unique identifier for the component */
  id: string;
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
```

### Category Score Interface

```typescript
/**
 * Base category score interface (25 points max each)
 */
export interface CategoryScore {
  /** Unique identifier for the category */
  id: string;
  /** Display name of the category */
  name: string;
  /** Calculated score (0-25) */
  score: number;
  /** Maximum possible score (always 25) */
  maxScore: 25;
  /** Confidence level for this category (0-100%) */
  confidence: number;
  /** Percentage of required data present (0-100%) */
  dataCompleteness: number;
  /** Individual component scores */
  components: ComponentScore[];
  /** Additional notes about the scoring */
  notes: string[];
  /** Any adjustments applied to the score */
  adjustments: ScoreAdjustment[];
}
```

### Score Breakdown Interface

```typescript
/**
 * Comprehensive score breakdown for a property
 */
export interface ScoreBreakdown {
  /** Unique identifier for this score */
  id: string;
  /** Property ID this score belongs to */
  propertyId: string;
  /** Total calculated score (0-125) */
  totalScore: number;
  /** Grade result with all details */
  gradeResult: GradeResult;
  /** Overall confidence assessment */
  confidenceLevel: ConfidenceResult;

  /** Location category scores */
  location: CategoryScore;
  /** Risk category scores */
  risk: CategoryScore;
  /** Financial category scores */
  financial: CategoryScore;
  /** Market category scores */
  market: CategoryScore;
  /** Profit category scores */
  profit: CategoryScore;

  // Metadata
  /** Version of the scoring algorithm used */
  scoringVersion: string;
  /** When the score was calculated */
  calculatedAt: Date;
  /** Type of property being scored */
  propertyType: PropertyType;
  /** Regional adjustments applied */
  regionalAdjustments: RegionalAdjustment[];
  /** Warnings about the score */
  warnings: ScoringWarning[];
}
```

---

## Standardized File Paths

All scoring-related code should be organized in the following structure:

```
src/
├── types/
│   └── scoring.ts                 # All scoring type definitions
└── lib/
    └── scoring/
        ├── index.ts               # Re-exports all scoring modules
        ├── types.ts               # Extended scoring types
        ├── calculator.ts          # Main score calculation logic
        ├── constants.ts           # Scoring constants and thresholds
        ├── grade-calculator.ts    # Grade calculation functions
        ├── categories/
        │   ├── index.ts           # Category re-exports
        │   ├── location.ts        # Location category (Phase 6B)
        │   ├── risk.ts            # Risk category (Phase 6C)
        │   ├── financial.ts       # Financial category (Phase 6D)
        │   ├── market.ts          # Market category (Phase 6E)
        │   └── profit.ts          # Profit category (Phase 6F)
        └── utils/
            ├── index.ts           # Utility re-exports
            ├── normalization.ts   # Value normalization helpers
            ├── missing-data.ts    # Missing data handling
            └── confidence.ts      # Confidence calculation helpers
```

---

## Category and Component ID Types

### Category ID Type

```typescript
/**
 * Valid category identifiers for the 5 scoring categories
 */
export type CategoryId = 'location' | 'risk' | 'financial' | 'market' | 'profit';

/**
 * Category ID constants for type-safe references
 */
export const CATEGORY_IDS = {
  LOCATION: 'location' as const,
  RISK: 'risk' as const,
  FINANCIAL: 'financial' as const,
  MARKET: 'market' as const,
  PROFIT: 'profit' as const,
} as const;
```

### Component ID Types

```typescript
/**
 * Location category component IDs
 */
export type LocationComponentId =
  | 'walk_score'
  | 'crime_index'
  | 'school_rating'
  | 'amenity_count'
  | 'transit_score';

/**
 * Risk category component IDs
 */
export type RiskComponentId =
  | 'flood_zone'
  | 'environmental_hazards'
  | 'structural_risk'
  | 'title_issues'
  | 'zoning_compliance';

/**
 * Financial category component IDs
 */
export type FinancialComponentId =
  | 'tax_efficiency'
  | 'lien_complexity'
  | 'assessment_ratio'
  | 'redemption_risk'
  | 'holding_costs';

/**
 * Market category component IDs
 */
export type MarketComponentId =
  | 'days_on_market'
  | 'price_trend'
  | 'inventory_level'
  | 'absorption_rate'
  | 'competition_level';

/**
 * Profit category component IDs
 */
export type ProfitComponentId =
  | 'roi_potential'
  | 'cash_flow'
  | 'equity_margin'
  | 'exit_options'
  | 'time_to_profit';

/**
 * All valid component IDs across all categories
 */
export type ComponentId =
  | LocationComponentId
  | RiskComponentId
  | FinancialComponentId
  | MarketComponentId
  | ProfitComponentId;
```

---

## Property and External Data Interfaces

### PropertyData Interface

```typescript
/**
 * Core property data used for scoring calculations
 * This interface represents the primary property information from the database
 */
export interface PropertyData {
  /** Unique property identifier */
  id: string;
  /** Parcel ID from the county assessor */
  parcel_id: string;
  /** Full street address */
  address: string | null;
  /** City name */
  city: string | null;
  /** State code (e.g., 'PA') */
  state: string;
  /** ZIP code */
  zip: string | null;
  /** Reference to the county */
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
  /** Pipeline stage */
  pipeline_stage: string | null;
  /** Whether Regrid data has been fetched */
  has_regrid_data: boolean;
  /** Whether screenshot has been captured */
  has_screenshot: boolean;
  /** URL to the property screenshot */
  screenshot_url: string | null;
}
```

### ExternalData Interface

```typescript
/**
 * External data sources used for scoring enrichment
 * This interface represents data fetched from third-party APIs
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
    /** Violent crime rate per 1000 */
    violentCrimeRate: number | null;
    /** Property crime rate per 1000 */
    propertyCrimeRate: number | null;
    /** Data source */
    source: string | null;
    /** Data date */
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
    /** Risk level (high, moderate, low, minimal) */
    riskLevel: 'high' | 'moderate' | 'low' | 'minimal' | null;
    /** Whether flood insurance is required */
    insuranceRequired: boolean | null;
    /** Base flood elevation if available */
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
    /** Air quality index (0-500) */
    airQualityIndex: number | null;
    /** Overall environmental risk score */
    riskScore: number | null;
  } | null;
  /** Market data for the area */
  marketData: {
    /** Median days on market */
    medianDaysOnMarket: number | null;
    /** Year-over-year price change percentage */
    priceChangeYoY: number | null;
    /** Active inventory count */
    inventoryCount: number | null;
    /** Monthly absorption rate */
    absorptionRate: number | null;
    /** Median sale price */
    medianSalePrice: number | null;
    /** Price per square foot */
    pricePerSqFt: number | null;
  } | null;
  /** Comparable sales data */
  comparableSales: {
    /** Number of comps found */
    count: number;
    /** Average sale price of comps */
    avgSalePrice: number | null;
    /** Median sale price of comps */
    medianSalePrice: number | null;
    /** Average price per square foot */
    avgPricePerSqFt: number | null;
    /** Date range of comps */
    dateRange: {
      start: Date;
      end: Date;
    } | null;
  } | null;
}
```

### DataAvailability Interface

```typescript
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
    hasComparableSales: externalData?.comparableSales !== null && (externalData?.comparableSales?.count ?? 0) > 0,

    // External data
    hasWalkScore: externalData?.walkScore !== null,
    hasCrimeData: externalData?.crimeData?.crimeIndex !== null,
    hasSchoolRating: externalData?.schoolRating?.overallRating !== null,
    hasFloodZone: externalData?.floodZone?.zone !== null,
    hasAmenityData: externalData?.nearbyAmenities !== null,
    hasEnvironmentalData: externalData?.environmentalHazards !== null,
    hasMarketData: externalData?.marketData !== null,

    // Structure data
    hasBuildingSqFt: property.building_sqft !== null,
    hasLotSize: property.lot_size_sqft !== null || property.lot_size_acres !== null,
    hasYearBuilt: property.year_built !== null,
    hasBedroomBathroom: property.bedrooms !== null || property.bathrooms !== null,

    // Screenshot/visual data
    hasScreenshot: property.has_screenshot,
    hasStreetView: false, // Determined separately

    completenessScore: 0,
    missingCriticalFields: [],
    missingOptionalFields: [],
  };

  // Calculate completeness score
  const criticalFields = [
    'hasAddress', 'hasCoordinates', 'hasTotalDue', 'hasParcelId', 'hasSaleDate'
  ];
  const optionalFields = [
    'hasRegridData', 'hasValidation', 'hasOwnerInfo', 'hasAssessedValue',
    'hasMarketValue', 'hasWalkScore', 'hasCrimeData', 'hasSchoolRating',
    'hasFloodZone', 'hasAmenityData', 'hasEnvironmentalData', 'hasMarketData',
    'hasBuildingSqFt', 'hasLotSize', 'hasYearBuilt', 'hasBedroomBathroom',
    'hasScreenshot', 'hasComparableSales'
  ];

  // Check critical fields
  criticalFields.forEach(field => {
    if (!availability[field as keyof DataAvailability]) {
      availability.missingCriticalFields.push(field.replace('has', ''));
    }
  });

  // Check optional fields
  optionalFields.forEach(field => {
    if (!availability[field as keyof DataAvailability]) {
      availability.missingOptionalFields.push(field.replace('has', ''));
    }
  });

  // Calculate completeness score (critical fields worth more)
  const criticalScore = criticalFields.filter(f => availability[f as keyof DataAvailability]).length / criticalFields.length * 60;
  const optionalScore = optionalFields.filter(f => availability[f as keyof DataAvailability]).length / optionalFields.length * 40;
  availability.completenessScore = Math.round(criticalScore + optionalScore);

  return availability;
}
```

---

## Supporting Types

### Data Source Interface

```typescript
/**
 * Tracks where scoring data came from
 */
export interface DataSource {
  /** Name of the data source */
  name: string;
  /** Type of data source */
  type: 'api' | 'database' | 'calculated' | 'estimated' | 'default';
  /** When the data was last updated */
  lastUpdated?: Date;
  /** Reliability assessment */
  reliability: 'high' | 'medium' | 'low';
}
```

### Missing Data Strategy

```typescript
/**
 * Strategy used when scoring data is missing
 */
export type MissingDataStrategy =
  | 'default_neutral'       // Use middle score (2.5 of 5)
  | 'default_conservative'  // Use lower score (1.5 of 5)
  | 'default_optimistic'    // Use higher score (3.5 of 5)
  | 'skip_component'        // Exclude from calculation, redistribute weight
  | 'require_data'          // Cannot score without this data
  | 'estimate_from_peers';  // Use similar property data
```

### Property Type

```typescript
/**
 * Property types for type-specific scoring adjustments
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
```

### Score Adjustment Interface

```typescript
/**
 * Score adjustment for regional or property-type factors
 */
export interface ScoreAdjustment {
  /** Type of adjustment */
  type: 'regional' | 'property_type' | 'market_condition' | 'data_quality';
  /** Multiplier applied (e.g., 1.1 = +10%) */
  factor: number;
  /** Reason for the adjustment */
  reason: string;
  /** Component or category this applies to */
  appliedTo: string;
}
```

### Regional Adjustment Interface

```typescript
/**
 * Regional adjustment configuration
 */
export interface RegionalAdjustment {
  /** State code */
  state: string;
  /** Metro area (optional) */
  metro?: string;
  /** County name (optional) */
  county?: string;
  /** Adjustments to apply */
  adjustments: {
    category: string;
    component: string;
    factor: number;
    reason: string;
  }[];
}
```

### Confidence Types

```typescript
/**
 * Confidence level labels
 */
export type ConfidenceLabel = 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low';

/**
 * Confidence calculation result
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

/**
 * Individual factor affecting confidence
 */
export interface ConfidenceFactor {
  /** Name of the factor */
  name: string;
  /** Impact on confidence (-50 to +50) */
  impact: number;
  /** Weight of this factor (0-1) */
  weight: number;
  /** Status assessment */
  status: 'positive' | 'neutral' | 'negative';
  /** Description of the factor */
  description: string;
}
```

### Scoring Warning Interface

```typescript
/**
 * Warning about scoring limitations or concerns
 */
export interface ScoringWarning {
  /** Severity level */
  severity: 'info' | 'warning' | 'critical';
  /** Category this warning applies to */
  category: string;
  /** Warning message */
  message: string;
  /** Recommendation to address the warning */
  recommendation: string;
}
```

---

## Scoring Constants

### Grade Threshold Constants

```typescript
/**
 * Grade threshold configuration
 */
export const GRADE_THRESHOLDS = {
  A: { minPercent: 80, minPoints: 100, description: 'Excellent investment opportunity' },
  B: { minPercent: 60, minPoints: 75, description: 'Good investment with minor concerns' },
  C: { minPercent: 40, minPoints: 50, description: 'Average investment, proceed with caution' },
  D: { minPercent: 20, minPoints: 25, description: 'Below average, significant concerns' },
  F: { minPercent: 0, minPoints: 0, description: 'Poor investment, not recommended' },
} as const;
```

### Scoring System Constants

```typescript
/**
 * Core scoring system constants
 */
export const SCORING_CONSTANTS = {
  /** Maximum total score */
  MAX_TOTAL_SCORE: 125,
  /** Maximum category score */
  MAX_CATEGORY_SCORE: 25,
  /** Maximum component score */
  MAX_COMPONENT_SCORE: 5,
  /** Number of categories */
  CATEGORY_COUNT: 5,
  /** Number of components per category */
  COMPONENTS_PER_CATEGORY: 5,
  /** Current scoring algorithm version */
  SCORING_VERSION: '1.0.0',
} as const;
```

### Confidence Threshold Constants

```typescript
/**
 * Confidence level thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  VERY_HIGH: { min: 90, label: 'Very High' as const },
  HIGH: { min: 75, label: 'High' as const },
  MODERATE: { min: 50, label: 'Moderate' as const },
  LOW: { min: 25, label: 'Low' as const },
  VERY_LOW: { min: 0, label: 'Very Low' as const },
} as const;
```

---

## Grade Calculation Function

### Important: Percentage Calculation Formula

The grade calculation uses a simple percentage formula:

```
percentage = (score / 125) * 100
```

For example:
- Score of 100 points = (100 / 125) * 100 = **80%** = Grade A-
- Score of 75 points = (75 / 125) * 100 = **60%** = Grade B-
- Score of 50 points = (50 / 125) * 100 = **40%** = Grade C-
- Score of 25 points = (25 / 125) * 100 = **20%** = Grade D-

This formula must be used consistently across all scoring calculations to ensure alignment between phases.

```typescript
/**
 * Calculate grade from total score
 *
 * IMPORTANT: Percentage is calculated as (score / 125) * 100
 * This formula must be used consistently across all phases.
 *
 * @param totalScore - Score out of 125 points
 * @returns GradeResult with all grade details
 */
export function calculateGrade(totalScore: number): GradeResult {
  // CRITICAL: Use this exact formula for percentage calculation
  const percentage = (totalScore / SCORING_CONSTANTS.MAX_TOTAL_SCORE) * 100;

  let grade: GradeLevel;
  let thresholdMet: number;
  let description: string;

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

  const gradeWithModifier = calculateGradeModifier(grade, percentage);

  return {
    grade,
    gradeWithModifier,
    percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
    thresholdMet,
    description,
  };
}

/**
 * Calculate grade modifier (+, -, or none)
 */
function calculateGradeModifier(grade: GradeLevel, percentage: number): GradeWithModifier {
  if (grade === 'F') return 'F';

  // Get the range for this grade
  const gradeStart = GRADE_THRESHOLDS[grade].minPercent;
  const gradeEnd = grade === 'A' ? 100 : GRADE_THRESHOLDS[grade].minPercent + 20;
  const gradeRange = gradeEnd - gradeStart;

  // Calculate position within grade range
  const positionInGrade = percentage - gradeStart;
  const normalizedPosition = positionInGrade / gradeRange;

  if (normalizedPosition >= 0.75) {
    return `${grade}+` as GradeWithModifier;
  } else if (normalizedPosition >= 0.35) {
    return grade;
  } else {
    return `${grade}-` as GradeWithModifier;
  }
}
```

---

## Implementation Checklist

### Phase 6A Tasks

- [ ] Create `src/types/scoring.ts` with all type definitions
  - [ ] GradeLevel and GradeWithModifier types
  - [ ] GradeResult interface
  - [ ] ComponentScore interface
  - [ ] CategoryScore interface
  - [ ] ScoreBreakdown interface
  - [ ] CategoryId and ComponentId types
  - [ ] PropertyData interface
  - [ ] ExternalData interface
  - [ ] DataAvailability interface
- [ ] Create `src/lib/scoring/types.ts` with extended scoring types
- [ ] Create `src/lib/scoring/constants.ts` with scoring constants
- [ ] Create `src/lib/scoring/calculator.ts` with main calculation logic
- [ ] Create `src/lib/scoring/grade-calculator.ts` with grade calculation functions
- [ ] Create `src/lib/scoring/utils/` directory with utility functions
  - [ ] normalization.ts - Value normalization helpers
  - [ ] missing-data.ts - Missing data handling strategies
  - [ ] confidence.ts - Confidence calculation helpers
- [ ] Create `src/lib/scoring/categories/` directory (empty, for Phase 6B-6F)
- [ ] Add unit tests for grade calculation
- [ ] Add unit tests for data availability calculation
- [ ] Document all types with JSDoc comments
- [ ] Export types from package index

### File Structure

The complete file structure for Phase 6A (matching standardized paths):

```
src/
├── types/
│   └── scoring.ts                 # All scoring type definitions
│       ├── GradeLevel, GradeWithModifier
│       ├── GradeResult
│       ├── ComponentScore
│       ├── CategoryScore
│       ├── ScoreBreakdown
│       ├── CategoryId, ComponentId types
│       ├── PropertyData
│       ├── ExternalData
│       ├── DataAvailability
│       ├── DataSource
│       ├── MissingDataStrategy
│       ├── PropertyType
│       ├── ScoreAdjustment
│       ├── RegionalAdjustment
│       ├── ConfidenceResult, ConfidenceFactor
│       └── ScoringWarning
└── lib/
    └── scoring/
        ├── index.ts               # Re-exports all scoring modules
        ├── types.ts               # Extended scoring types (if needed)
        ├── calculator.ts          # Main score calculation logic
        ├── constants.ts           # SCORING_CONSTANTS, GRADE_THRESHOLDS, etc.
        ├── grade-calculator.ts    # calculateGrade, calculateGradeModifier
        ├── categories/
        │   └── index.ts           # Category re-exports (empty for Phase 6A)
        └── utils/
            ├── index.ts           # Utility re-exports
            ├── normalization.ts   # Value normalization helpers
            ├── missing-data.ts    # Missing data handling
            └── confidence.ts      # Confidence calculation helpers
```

### Key Exports from src/lib/scoring/index.ts

```typescript
// Types
export type {
  GradeLevel,
  GradeWithModifier,
  GradeResult,
  ComponentScore,
  CategoryScore,
  ScoreBreakdown,
  CategoryId,
  ComponentId,
  LocationComponentId,
  RiskComponentId,
  FinancialComponentId,
  MarketComponentId,
  ProfitComponentId,
  PropertyData,
  ExternalData,
  DataAvailability,
  DataSource,
  MissingDataStrategy,
  PropertyType,
  ScoreAdjustment,
  RegionalAdjustment,
  ConfidenceResult,
  ConfidenceFactor,
  ScoringWarning,
} from '@/types/scoring';

// Constants
export {
  SCORING_CONSTANTS,
  GRADE_THRESHOLDS,
  CONFIDENCE_THRESHOLDS,
  CATEGORY_IDS,
} from './constants';

// Functions
export { calculateGrade, calculateGradeModifier } from './grade-calculator';
export { calculateDataAvailability } from './utils/data-availability';
```

---

## Next Phase: 6B - Location Category

Phase 6B will implement the Location scoring category with these components:
1. Walk Score
2. Crime Index
3. School Rating
4. Amenity Count
5. Transit Score

Each component will use the interfaces defined in this phase.
