# Phase 6B: Missing Data Handling & Confidence Calculation

## Overview

This phase implements consistent handling of missing data across all scoring components and provides a multi-factor confidence calculation system to help investors understand the reliability of property scores.

---

## Missing Data Handling Strategy

Consistent handling of missing data is critical for fair scoring:

```typescript
// src/lib/analysis/scoring/missingDataHandler.ts

/**
 * Missing data handling strategies
 *
 * - default_neutral: Use middle-ground score (2.5) when data unavailable
 * - default_conservative: Use lower score to protect investor (2.0)
 * - default_optimistic: Use higher score when risk is typically low (4.0)
 * - skip_component: Exclude component from category calculation entirely
 * - require_data: Mark as critical - score cannot be calculated without it
 * - estimate_from_peers: Estimate value from similar properties in area
 */
export type MissingDataStrategy =
  | 'default_neutral'
  | 'default_conservative'
  | 'default_optimistic'
  | 'skip_component'
  | 'require_data'
  | 'estimate_from_peers';

/**
 * Configuration for missing data handling by component
 */
export const MISSING_DATA_CONFIG: Record<string, {
  strategy: MissingDataStrategy;
  defaultScore: number;
  confidencePenalty: number;
  reason: string;
}> = {
  // Location components
  'walkability': {
    strategy: 'default_neutral',
    defaultScore: 2.5,
    confidencePenalty: 20,
    reason: 'Walk Score unavailable - using neutral score',
  },
  'crime_safety': {
    strategy: 'default_conservative',
    defaultScore: 2.0,
    confidencePenalty: 25,
    reason: 'Crime data unavailable - conservative estimate for safety',
  },
  'school_quality': {
    strategy: 'default_neutral',
    defaultScore: 2.5,
    confidencePenalty: 15,
    reason: 'School ratings unavailable',
  },
  'amenities': {
    strategy: 'estimate_from_peers',
    defaultScore: 2.5,
    confidencePenalty: 10,
    reason: 'Estimated from similar properties in area',
  },
  'transit': {
    strategy: 'default_neutral',
    defaultScore: 2.5,
    confidencePenalty: 15,
    reason: 'Transit data unavailable',
  },

  // Risk components
  'flood_risk': {
    strategy: 'default_conservative',
    defaultScore: 2.0,
    confidencePenalty: 30,
    reason: 'Flood zone unknown - conservative estimate',
  },
  'earthquake_risk': {
    strategy: 'default_optimistic',
    defaultScore: 4.0,
    confidencePenalty: 10,
    reason: 'Most areas have low earthquake risk',
  },
  'wildfire_risk': {
    strategy: 'default_optimistic',
    defaultScore: 4.0,
    confidencePenalty: 10,
    reason: 'Most areas have low wildfire risk',
  },
  'hurricane_risk': {
    strategy: 'default_optimistic',
    defaultScore: 4.0,
    confidencePenalty: 10,
    reason: 'Calculated from geographic location',
  },
  'terrain_slope': {
    strategy: 'default_optimistic',
    defaultScore: 4.0,
    confidencePenalty: 15,
    reason: 'Assuming flat terrain without elevation data',
  },

  // Property condition component
  'property_condition': {
    strategy: 'default_conservative',
    defaultScore: 2.0,
    confidencePenalty: 35,
    reason: 'Property condition unknown - recommend inspection',
  },

  // Financial components
  'tax_to_value_ratio': {
    strategy: 'require_data',
    defaultScore: 0,
    confidencePenalty: 50,
    reason: 'Cannot calculate without assessed value',
  },
  'value_accuracy': {
    strategy: 'skip_component',
    defaultScore: 0,
    confidencePenalty: 25,
    reason: 'Market value comparison unavailable',
  },
  'rehab_costs': {
    strategy: 'estimate_from_peers',
    defaultScore: 2.5,
    confidencePenalty: 30,
    reason: 'Estimated from property age and size',
  },
  'lien_exposure': {
    strategy: 'default_conservative',
    defaultScore: 2.0,
    confidencePenalty: 35,
    reason: 'Lien status unknown - recommend title search',
  },
  'title_clarity': {
    strategy: 'default_conservative',
    defaultScore: 2.0,
    confidencePenalty: 40,
    reason: 'Title status unknown - recommend title search',
  },

  // Market components
  'appreciation_rate': {
    strategy: 'default_neutral',
    defaultScore: 2.5,
    confidencePenalty: 25,
    reason: 'Historical appreciation data unavailable',
  },
  'days_on_market': {
    strategy: 'default_neutral',
    defaultScore: 2.5,
    confidencePenalty: 20,
    reason: 'Market velocity data unavailable',
  },
  'inventory_level': {
    strategy: 'default_neutral',
    defaultScore: 2.5,
    confidencePenalty: 20,
    reason: 'Inventory data unavailable',
  },
  'competition': {
    strategy: 'default_conservative',
    defaultScore: 2.0,
    confidencePenalty: 15,
    reason: 'Assuming moderate competition',
  },
  'demand': {
    strategy: 'default_neutral',
    defaultScore: 2.5,
    confidencePenalty: 20,
    reason: 'Demand indicators unavailable',
  },

  // Profit components
  'roi_potential': {
    strategy: 'require_data',
    defaultScore: 0,
    confidencePenalty: 50,
    reason: 'Cannot calculate ROI without market value',
  },
  'profit_margin': {
    strategy: 'require_data',
    defaultScore: 0,
    confidencePenalty: 50,
    reason: 'Cannot calculate margin without market value',
  },
  'cash_flow': {
    strategy: 'skip_component',
    defaultScore: 0,
    confidencePenalty: 30,
    reason: 'Rent estimate unavailable',
  },
  'resale_value': {
    strategy: 'skip_component',
    defaultScore: 0,
    confidencePenalty: 25,
    reason: 'Cannot project resale without market value',
  },
  'rent_potential': {
    strategy: 'skip_component',
    defaultScore: 0,
    confidencePenalty: 30,
    reason: 'Rent data unavailable',
  },
};

/**
 * Apply missing data strategy to a component
 */
export function handleMissingData(
  componentKey: string,
  hasData: boolean,
  estimatedValue?: number
): {
  score: number;
  confidence: number;
  strategy: MissingDataStrategy;
  note: string;
} {
  const config = MISSING_DATA_CONFIG[componentKey];

  if (!config) {
    return {
      score: 2.5,
      confidence: 50,
      strategy: 'default_neutral',
      note: 'Unknown component - using default neutral score',
    };
  }

  if (hasData) {
    return {
      score: estimatedValue ?? config.defaultScore,
      confidence: 100,
      strategy: config.strategy,
      note: '',
    };
  }

  // Handle based on strategy
  switch (config.strategy) {
    case 'require_data':
      return {
        score: 0,
        confidence: 100 - config.confidencePenalty,
        strategy: config.strategy,
        note: `REQUIRED: ${config.reason}`,
      };

    case 'skip_component':
      return {
        score: -1, // Indicates skip
        confidence: 100 - config.confidencePenalty,
        strategy: config.strategy,
        note: config.reason,
      };

    case 'estimate_from_peers':
      return {
        score: estimatedValue ?? config.defaultScore,
        confidence: 100 - config.confidencePenalty,
        strategy: config.strategy,
        note: config.reason,
      };

    default:
      return {
        score: config.defaultScore,
        confidence: 100 - config.confidencePenalty,
        strategy: config.strategy,
        note: config.reason,
      };
  }
}

/**
 * Peer criteria for estimate_from_peers strategy
 */
export interface PeerCriteria {
  sameCounty: boolean;
  sameSaleType: boolean;
  similarValueRange: {
    min: number;
    max: number;
  };
  maxAgeDays: number;
}

/**
 * Estimated value result from peer analysis
 */
export interface EstimatedValue {
  value: number;
  confidence: number;
  peerCount: number;
  methodology: string;
  dataPoints: {
    countyAverage?: number;
    saleTypeAverage?: number;
    valueRangeAverage?: number;
  };
}

/**
 * Estimate a component value from peer properties
 *
 * This function calculates an estimated value by analyzing similar properties
 * based on the provided peer criteria. It uses a weighted average approach
 * that prioritizes more relevant peer matches.
 *
 * @param propertyId - The property to estimate for
 * @param componentId - The component being estimated (e.g., 'amenities', 'rehab_costs')
 * @param peerCriteria - Criteria for selecting peer properties
 * @returns Promise resolving to estimated value with confidence metrics
 */
export async function estimateFromPeers(
  propertyId: string,
  componentId: string,
  peerCriteria: PeerCriteria
): Promise<EstimatedValue> {
  // Implementation approach:
  // 1. Query properties matching peer criteria
  // 2. Calculate weighted averages based on similarity
  // 3. Apply confidence based on peer count and match quality

  // Default peer criteria if not specified
  const criteria: PeerCriteria = {
    sameCounty: peerCriteria.sameCounty ?? true,
    sameSaleType: peerCriteria.sameSaleType ?? false,
    similarValueRange: peerCriteria.similarValueRange ?? { min: 0, max: Infinity },
    maxAgeDays: peerCriteria.maxAgeDays ?? 365,
  };

  // This would be implemented with actual database queries:
  // const peers = await supabase
  //   .from('property_scores')
  //   .select('*')
  //   .eq('county_id', property.county_id)
  //   .gte('created_at', new Date(Date.now() - criteria.maxAgeDays * 24 * 60 * 60 * 1000))
  //   .not('id', 'eq', propertyId);

  // Placeholder implementation showing the logic:
  const dataPoints: EstimatedValue['dataPoints'] = {};

  // Step 1: Get county-level average for this component
  // SELECT AVG(component_score) FROM property_scores WHERE county_id = ? AND component_id = ?
  const countyAverage = 2.5; // Placeholder - would come from DB
  dataPoints.countyAverage = countyAverage;

  // Step 2: Get sale-type specific average if criteria specifies
  let saleTypeAverage: number | undefined;
  if (criteria.sameSaleType) {
    // SELECT AVG(component_score) FROM property_scores ps
    // JOIN properties p ON ps.property_id = p.id
    // WHERE p.sale_type = ? AND ps.component_id = ?
    saleTypeAverage = 2.5; // Placeholder
    dataPoints.saleTypeAverage = saleTypeAverage;
  }

  // Step 3: Get value-range specific average
  let valueRangeAverage: number | undefined;
  if (criteria.similarValueRange.min > 0 || criteria.similarValueRange.max < Infinity) {
    // SELECT AVG(component_score) FROM property_scores ps
    // JOIN properties p ON ps.property_id = p.id
    // WHERE p.total_due BETWEEN ? AND ? AND ps.component_id = ?
    valueRangeAverage = 2.5; // Placeholder
    dataPoints.valueRangeAverage = valueRangeAverage;
  }

  // Step 4: Calculate weighted final estimate
  // Weight: county avg (1x), sale type (1.5x), value range (2x)
  let totalWeight = 0;
  let weightedSum = 0;
  let peerCount = 0;

  if (countyAverage !== undefined) {
    weightedSum += countyAverage * 1.0;
    totalWeight += 1.0;
    peerCount += 10; // Placeholder count
  }

  if (saleTypeAverage !== undefined) {
    weightedSum += saleTypeAverage * 1.5;
    totalWeight += 1.5;
    peerCount += 5;
  }

  if (valueRangeAverage !== undefined) {
    weightedSum += valueRangeAverage * 2.0;
    totalWeight += 2.0;
    peerCount += 3;
  }

  const estimatedValue = totalWeight > 0 ? weightedSum / totalWeight : 2.5;

  // Step 5: Calculate confidence based on peer data quality
  // More peers + better matches = higher confidence
  const baseConfidence = 50;
  const peerBonus = Math.min(30, peerCount * 2); // Up to 30 points for peer count
  const matchBonus = (criteria.sameSaleType ? 10 : 0) + (valueRangeAverage ? 10 : 0);
  const confidence = Math.min(85, baseConfidence + peerBonus + matchBonus);

  return {
    value: Math.round(estimatedValue * 100) / 100,
    confidence,
    peerCount,
    methodology: buildMethodologyDescription(criteria, dataPoints),
    dataPoints,
  };
}

/**
 * Build a human-readable methodology description
 */
function buildMethodologyDescription(
  criteria: PeerCriteria,
  dataPoints: EstimatedValue['dataPoints']
): string {
  const parts: string[] = [];

  if (dataPoints.countyAverage !== undefined) {
    parts.push(`county average (${dataPoints.countyAverage.toFixed(2)})`);
  }

  if (dataPoints.saleTypeAverage !== undefined) {
    parts.push(`sale type peers (${dataPoints.saleTypeAverage.toFixed(2)})`);
  }

  if (dataPoints.valueRangeAverage !== undefined) {
    parts.push(`similar value properties (${dataPoints.valueRangeAverage.toFixed(2)})`);
  }

  if (parts.length === 0) {
    return 'No peer data available - using default neutral score';
  }

  return `Estimated from: ${parts.join(', ')}`;
}

/**
 * Get default peer criteria for a component
 */
export function getDefaultPeerCriteria(componentId: string): PeerCriteria {
  switch (componentId) {
    case 'amenities':
      return {
        sameCounty: true,
        sameSaleType: false,
        similarValueRange: { min: 0, max: Infinity },
        maxAgeDays: 180,
      };

    case 'rehab_costs':
      return {
        sameCounty: true,
        sameSaleType: true,
        similarValueRange: { min: 0, max: Infinity },
        maxAgeDays: 365,
      };

    default:
      return {
        sameCounty: true,
        sameSaleType: false,
        similarValueRange: { min: 0, max: Infinity },
        maxAgeDays: 365,
      };
  }
}
```

---

## Multi-Factor Confidence Calculation

```typescript
// src/lib/analysis/scoring/confidence.ts

/**
 * Data availability tracking for confidence calculation
 */
export interface DataAvailability {
  // Core property data
  hasPropertyAddress: boolean;
  hasAssessedValue: boolean;
  hasMarketValue: boolean;
  hasYearBuilt: boolean;
  hasBuildingSqft: boolean;
  hasLotSize: boolean;
  hasCoordinates: boolean;
  hasOwnerInfo: boolean;
  hasParcelId: boolean;

  // External data
  hasLocationData: boolean;
  hasRiskData: boolean;
  hasMarketData: boolean;
  hasComparables: boolean;
  hasRentEstimates: boolean;

  // Quality indicators
  dataAge: 'fresh' | 'recent' | 'stale' | 'unknown';
  sourceReliability: 'high' | 'medium' | 'low' | 'unknown';
  conflictingData: boolean;
}

/**
 * Confidence level type for consistent threshold alignment with Phase 6A
 */
export type ConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';

/**
 * Confidence factor result
 */
export interface ConfidenceFactor {
  name: string;
  impact: number;
  weight: number;
  status: 'positive' | 'negative' | 'neutral';
  description: string;
}

/**
 * Confidence calculation result
 */
export interface ConfidenceResult {
  overall: number;
  label: 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low';
  factors: ConfidenceFactor[];
  recommendations: string[];
}

/**
 * Property type enumeration
 */
export type PropertyType =
  | 'single_family_residential'
  | 'multi_family_residential'
  | 'commercial'
  | 'vacant_land'
  | 'industrial'
  | 'agricultural'
  | 'mixed_use'
  | 'unknown';

/**
 * Calculate comprehensive confidence score
 */
export function calculateMultiFactorConfidence(
  availability: DataAvailability,
  categoryConfidences: { category: string; confidence: number; weight: number }[],
  propertyType: PropertyType
): ConfidenceResult {
  const factors: ConfidenceFactor[] = [];
  let baseConfidence = 50; // Start at 50%

  // Factor 1: Core Property Data (up to +20 or -30)
  const coreDataScore = calculateCoreDataScore(availability);
  factors.push({
    name: 'Core Property Data',
    impact: coreDataScore,
    weight: 1.5,
    status: coreDataScore >= 0 ? 'positive' : 'negative',
    description: getCoreDataDescription(availability),
  });
  baseConfidence += coreDataScore;

  // Factor 2: External Data Coverage (up to +15 or -20)
  const externalDataScore = calculateExternalDataScore(availability);
  factors.push({
    name: 'External Data Coverage',
    impact: externalDataScore,
    weight: 1.2,
    status: externalDataScore >= 0 ? 'positive' : 'negative',
    description: getExternalDataDescription(availability),
  });
  baseConfidence += externalDataScore;

  // Factor 3: Data Freshness (up to +10 or -15)
  const freshnessScore = getDataFreshnessScore(availability.dataAge);
  factors.push({
    name: 'Data Freshness',
    impact: freshnessScore,
    weight: 0.8,
    status: freshnessScore >= 0 ? 'positive' : 'negative',
    description: `Data is ${availability.dataAge}`,
  });
  baseConfidence += freshnessScore;

  // Factor 4: Source Reliability (up to +10 or -15)
  const reliabilityScore = getSourceReliabilityScore(availability.sourceReliability);
  factors.push({
    name: 'Source Reliability',
    impact: reliabilityScore,
    weight: 1.0,
    status: reliabilityScore >= 0 ? 'positive' : 'negative',
    description: `Source reliability is ${availability.sourceReliability}`,
  });
  baseConfidence += reliabilityScore;

  // Factor 5: Data Consistency (up to +5 or -20)
  const consistencyScore = availability.conflictingData ? -20 : 5;
  factors.push({
    name: 'Data Consistency',
    impact: consistencyScore,
    weight: 1.3,
    status: consistencyScore >= 0 ? 'positive' : 'negative',
    description: availability.conflictingData
      ? 'WARNING: Conflicting data detected between sources'
      : 'Data is consistent across sources',
  });
  baseConfidence += consistencyScore;

  // Factor 6: Category Score Confidence (weighted average adjustment)
  const categoryAvg = categoryConfidences.reduce(
    (sum, c) => sum + c.confidence * c.weight,
    0
  ) / categoryConfidences.reduce((sum, c) => sum + c.weight, 0);
  const categoryAdjustment = (categoryAvg - 50) / 5; // Scale to -10 to +10
  factors.push({
    name: 'Category Data Quality',
    impact: categoryAdjustment,
    weight: 1.0,
    status: categoryAdjustment >= 0 ? 'positive' : 'negative',
    description: `Average category confidence: ${categoryAvg.toFixed(0)}%`,
  });
  baseConfidence += categoryAdjustment;

  // Factor 7: Property Type Adjustment
  const propertyTypeAdjustment = getPropertyTypeConfidenceAdjustment(propertyType);
  factors.push({
    name: 'Property Type',
    impact: propertyTypeAdjustment,
    weight: 0.5,
    status: propertyTypeAdjustment >= 0 ? 'positive' : 'neutral',
    description: `${propertyType} - ${getPropertyTypeNote(propertyType)}`,
  });
  baseConfidence += propertyTypeAdjustment;

  // Clamp final confidence
  const overall = Math.max(0, Math.min(100, Math.round(baseConfidence)));

  return {
    overall,
    label: getConfidenceLabel(overall),
    factors,
    recommendations: generateConfidenceRecommendations(factors, overall),
  };
}

function calculateCoreDataScore(availability: DataAvailability): number {
  let score = 0;
  if (availability.hasPropertyAddress) score += 3;
  if (availability.hasAssessedValue) score += 5;
  if (availability.hasMarketValue) score += 7;
  if (availability.hasYearBuilt) score += 2;
  if (availability.hasBuildingSqft) score += 2;
  if (availability.hasLotSize) score += 1;

  // Penalty for missing critical data
  if (!availability.hasAssessedValue && !availability.hasMarketValue) score -= 15;
  if (!availability.hasPropertyAddress) score -= 10;

  return score;
}

function calculateExternalDataScore(availability: DataAvailability): number {
  let score = 0;
  if (availability.hasLocationData) score += 4;
  if (availability.hasRiskData) score += 3;
  if (availability.hasMarketData) score += 5;
  if (availability.hasComparables) score += 5;
  if (availability.hasRentEstimates) score += 3;

  // Penalty for no external data
  const hasAnyExternal = availability.hasLocationData ||
    availability.hasRiskData ||
    availability.hasMarketData;
  if (!hasAnyExternal) score -= 15;

  return score;
}

function getDataFreshnessScore(age: string): number {
  switch (age) {
    case 'fresh': return 10;
    case 'recent': return 5;
    case 'stale': return -10;
    default: return -5;
  }
}

function getSourceReliabilityScore(reliability: string): number {
  switch (reliability) {
    case 'high': return 10;
    case 'medium': return 3;
    case 'low': return -10;
    default: return -5;
  }
}

function getPropertyTypeConfidenceAdjustment(propertyType: PropertyType): number {
  // Standard property types have more reliable data
  switch (propertyType) {
    case 'single_family_residential': return 5;
    case 'multi_family_residential': return 3;
    case 'commercial': return 0;
    case 'vacant_land': return -5; // Less comparable data
    case 'industrial': return -3;
    case 'agricultural': return -5;
    case 'mixed_use': return -3;
    default: return -10;
  }
}

function getPropertyTypeNote(propertyType: PropertyType): string {
  switch (propertyType) {
    case 'single_family_residential': return 'Most reliable scoring model';
    case 'multi_family_residential': return 'Good data availability';
    case 'commercial': return 'Specialized analysis recommended';
    case 'vacant_land': return 'Limited comparables - use caution';
    case 'industrial': return 'Specialized market';
    case 'agricultural': return 'Unique valuation factors';
    case 'mixed_use': return 'Complex analysis needed';
    default: return 'Property type unknown - reduced confidence';
  }
}

function getCoreDataDescription(availability: DataAvailability): string {
  const missing: string[] = [];
  if (!availability.hasPropertyAddress) missing.push('address');
  if (!availability.hasAssessedValue) missing.push('assessed value');
  if (!availability.hasMarketValue) missing.push('market value');

  if (missing.length === 0) return 'All core property data available';
  return `Missing: ${missing.join(', ')}`;
}

function getExternalDataDescription(availability: DataAvailability): string {
  const available: string[] = [];
  if (availability.hasLocationData) available.push('location');
  if (availability.hasRiskData) available.push('risk');
  if (availability.hasMarketData) available.push('market');
  if (availability.hasComparables) available.push('comparables');
  if (availability.hasRentEstimates) available.push('rental');

  if (available.length === 0) return 'No external data sources available';
  return `Available: ${available.join(', ')}`;
}

/**
 * Get confidence label based on score
 * Thresholds aligned with Phase 6A:
 * - Very High: 90+
 * - High: 75-89
 * - Medium: 50-74
 * - Low: 25-49
 * - Very Low: <25
 */
export function getConfidenceLabel(confidence: number): ConfidenceResult['label'] {
  if (confidence >= 90) return 'Very High';
  if (confidence >= 75) return 'High';
  if (confidence >= 50) return 'Moderate';
  if (confidence >= 25) return 'Low';
  return 'Very Low';
}

/**
 * Get confidence level enum value (for type-safe operations)
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 90) return 'very_high';
  if (confidence >= 75) return 'high';
  if (confidence >= 50) return 'medium';
  if (confidence >= 25) return 'low';
  return 'very_low';
}

function generateConfidenceRecommendations(
  factors: ConfidenceFactor[],
  overall: number
): string[] {
  const recommendations: string[] = [];

  const negativeFactor = factors.filter(f => f.status === 'negative');
  for (const factor of negativeFactor) {
    switch (factor.name) {
      case 'Core Property Data':
        recommendations.push('Obtain property appraisal or market analysis');
        break;
      case 'External Data Coverage':
        recommendations.push('Research additional data sources for this area');
        break;
      case 'Data Freshness':
        recommendations.push('Verify data with current sources');
        break;
      case 'Data Consistency':
        recommendations.push('CRITICAL: Resolve data conflicts before proceeding');
        break;
    }
  }

  if (overall < 50) {
    recommendations.push('Consider manual inspection before bidding');
    recommendations.push('Limit bid amount to account for uncertainty');
  }

  return recommendations;
}
```

---

## Strategy Descriptions

| Strategy | Default Score | Use Case | Risk Level |
|----------|---------------|----------|------------|
| `default_neutral` | 2.5 | Data that varies widely, no clear default | Medium |
| `default_conservative` | 2.0 | Safety-critical data, unknown risks | Low (safer) |
| `default_optimistic` | 4.0 | Rare risks, most properties are fine | Higher |
| `skip_component` | N/A | Non-essential calculations | N/A |
| `require_data` | 0 | Critical calculations that need data | Blocked |
| `estimate_from_peers` | Varies | Can estimate from nearby properties | Medium |

---

## Confidence Score Interpretation

Thresholds aligned with Phase 6A for consistency:

| Score Range | Label | Interpretation |
|-------------|-------|----------------|
| 90-100 | Very High | Excellent data coverage, high reliability |
| 75-89 | High | Good data, minor gaps acceptable |
| 50-74 | Moderate | Significant gaps, exercise caution |
| 25-49 | Low | Many unknowns, additional research needed |
| 0-24 | Very Low | Critical data missing, manual review required |

---

## Implementation Checklist

- [ ] Create `src/lib/analysis/scoring/missingDataHandler.ts`
- [ ] Create `src/lib/analysis/scoring/confidence.ts`
- [ ] Add unit tests for missing data strategies
- [ ] Add unit tests for confidence calculation
- [ ] Integrate with scoring engine from Phase 6A
- [ ] Display confidence indicators in UI
- [ ] Add confidence-based bid recommendations
