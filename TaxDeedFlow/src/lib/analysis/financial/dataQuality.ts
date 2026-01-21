/**
 * Data Quality Assessment Module - Phase 8D
 *
 * Assesses the quality and completeness of data used in financial analysis.
 * Provides transparency about data gaps and assumptions made.
 *
 * @module lib/analysis/financial/dataQuality
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type {
  DataQualityAssessment,
  DataQualityComponents,
  ComparablesAnalysis,
  PropertyFinancialData,
  RegridFinancialData,
} from './types';
import type { CostBreakdown, CostConfidence } from '@/types/costs';

// ============================================
// Quality Weights Configuration
// ============================================

/**
 * Weights for calculating overall quality score
 * Must sum to 1.0
 */
const QUALITY_WEIGHTS = {
  comparablesQuality: 0.35, // Comparables are critical for ARV
  costEstimateAccuracy: 0.25, // Cost estimates affect profitability
  marketDataFreshness: 0.20, // Recent data is more relevant
  propertyDataCompleteness: 0.20, // Complete property info needed
};

/**
 * Quality thresholds for classification
 */
const QUALITY_THRESHOLDS = {
  excellent: 85,
  good: 70,
  fair: 50,
  poor: 30,
};

// ============================================
// Main Quality Assessment Function
// ============================================

/**
 * Assess the overall quality of data used in financial analysis
 *
 * @param comparables - Comparables analysis data
 * @param costs - Cost breakdown with confidence levels
 * @param property - Property data
 * @param regridData - Regrid enrichment data (optional)
 * @returns Complete data quality assessment
 *
 * @example
 * ```typescript
 * const quality = assessDataQuality(
 *   comparablesAnalysis,
 *   costBreakdown,
 *   propertyData,
 *   regridData
 * );
 * console.log(quality.overallScore); // 78
 * console.log(quality.missingData); // ['year_built', 'bathrooms']
 * ```
 */
export function assessDataQuality(
  comparables: ComparablesAnalysis | null,
  costs: CostBreakdown,
  property: PropertyFinancialData,
  regridData?: RegridFinancialData | null
): DataQualityAssessment {
  // Calculate component scores
  const comparablesQuality = assessComparablesQuality(comparables);
  const costEstimateAccuracy = assessCostEstimateAccuracy(costs);
  const marketDataFreshness = assessMarketDataFreshness(comparables);
  const propertyDataCompleteness = assessPropertyDataCompleteness(property, regridData);

  const components: DataQualityComponents = {
    comparablesQuality,
    costEstimateAccuracy,
    marketDataFreshness,
    propertyDataCompleteness,
  };

  // Calculate weighted overall score
  const overallScore = Math.round(
    components.comparablesQuality * QUALITY_WEIGHTS.comparablesQuality +
    components.costEstimateAccuracy * QUALITY_WEIGHTS.costEstimateAccuracy +
    components.marketDataFreshness * QUALITY_WEIGHTS.marketDataFreshness +
    components.propertyDataCompleteness * QUALITY_WEIGHTS.propertyDataCompleteness
  );

  // Identify missing data fields
  const missingData = identifyMissingData(property, regridData, comparables);

  // Document assumptions made due to missing data
  const assumptions = documentAssumptions(property, regridData, comparables, costs);

  return {
    overallScore,
    components,
    missingData,
    assumptions,
  };
}

// ============================================
// Component Quality Assessors
// ============================================

/**
 * Assess quality of comparable sales data
 *
 * @param comparables - Comparables analysis data
 * @returns Quality score 0-100
 */
export function assessComparablesQuality(
  comparables: ComparablesAnalysis | null
): number {
  if (!comparables) {
    return 20; // Minimum score when no comparables available
  }

  let score = 0;

  // Number of comparables (max 30 points)
  if (comparables.comparablesCount >= 6) {
    score += 30;
  } else if (comparables.comparablesCount >= 4) {
    score += 22;
  } else if (comparables.comparablesCount >= 2) {
    score += 15;
  } else if (comparables.comparablesCount >= 1) {
    score += 8;
  }

  // Confidence level (max 30 points)
  switch (comparables.confidence) {
    case 'high':
      score += 30;
      break;
    case 'medium':
      score += 20;
      break;
    case 'low':
      score += 10;
      break;
  }

  // ARV range tightness (max 20 points)
  // Tighter range = more confidence
  const rangePercent = comparables.estimatedARV > 0
    ? (comparables.arvHighRange - comparables.arvLowRange) / comparables.estimatedARV
    : 1;

  if (rangePercent <= 0.10) {
    score += 20; // Very tight range (10%)
  } else if (rangePercent <= 0.20) {
    score += 15;
  } else if (rangePercent <= 0.30) {
    score += 10;
  } else if (rangePercent <= 0.40) {
    score += 5;
  }

  // Search radius (max 10 points)
  // Closer comps are better
  if (comparables.searchRadiusMiles <= 0.5) {
    score += 10;
  } else if (comparables.searchRadiusMiles <= 1) {
    score += 8;
  } else if (comparables.searchRadiusMiles <= 2) {
    score += 5;
  } else if (comparables.searchRadiusMiles <= 5) {
    score += 3;
  }

  // Price per sqft consistency (max 10 points)
  if (comparables.averagePricePerSqft > 0 && comparables.medianPricePerSqft > 0) {
    const ppsftVariance = Math.abs(comparables.averagePricePerSqft - comparables.medianPricePerSqft)
      / comparables.averagePricePerSqft;

    if (ppsftVariance <= 0.05) {
      score += 10; // Very consistent
    } else if (ppsftVariance <= 0.10) {
      score += 7;
    } else if (ppsftVariance <= 0.20) {
      score += 4;
    }
  }

  return Math.min(100, score);
}

/**
 * Assess accuracy of cost estimates
 *
 * @param costs - Cost breakdown with confidence levels
 * @returns Quality score 0-100
 */
export function assessCostEstimateAccuracy(costs: CostBreakdown): number {
  let score = 0;

  // Overall confidence (max 40 points)
  switch (costs.confidence) {
    case 'high':
      score += 40;
      break;
    case 'medium':
      score += 25;
      break;
    case 'low':
      score += 10;
      break;
  }

  // Acquisition costs completeness (max 15 points)
  if (costs.acquisition.bidAmount > 0) score += 5;
  if (costs.acquisition.buyersPremium !== undefined) score += 3;
  if (costs.acquisition.titleSearch !== undefined) score += 3;
  if (costs.acquisition.recordingFees !== undefined) score += 2;
  if (costs.acquisition.transferTax !== undefined) score += 2;

  // Rehab cost detail (max 20 points)
  if (costs.rehab.totalRehab > 0) {
    const rehabDetail = costs.rehab;
    let rehabDetailScore = 0;

    // Check if breakdown is provided vs just total (nested objects now)
    if (rehabDetail.interior?.total !== undefined && rehabDetail.interior.total > 0) rehabDetailScore += 4;
    if (rehabDetail.exterior?.total !== undefined && rehabDetail.exterior.total > 0) rehabDetailScore += 4;
    if (rehabDetail.structural?.total !== undefined && rehabDetail.structural.total > 0) rehabDetailScore += 4;
    if (rehabDetail.exterior?.landscaping !== undefined && rehabDetail.exterior.landscaping > 0) rehabDetailScore += 2;
    if (rehabDetail.permits !== undefined && rehabDetail.permits > 0) rehabDetailScore += 2;
    // Additional points for labor/material multipliers being set
    if (rehabDetail.laborMultiplier !== undefined && rehabDetail.laborMultiplier !== 1.0) rehabDetailScore += 2;
    if (rehabDetail.materialMultiplier !== undefined && rehabDetail.materialMultiplier !== 1.0) rehabDetailScore += 2;

    score += Math.min(20, rehabDetailScore);
  } else {
    // No rehab estimated - give partial credit if property is in good condition
    score += 10;
  }

  // Holding costs detail (max 15 points)
  const holdingDetail = costs.holding;
  if (holdingDetail.monthlyTaxes !== undefined) score += 3;
  if (holdingDetail.monthlyInsurance !== undefined) score += 3;
  if (holdingDetail.monthlyUtilities !== undefined) score += 3;
  if (holdingDetail.monthlyMaintenance !== undefined) score += 3;
  if (holdingDetail.monthlyLoanPayment !== undefined) score += 3;

  // Selling costs (max 10 points)
  const sellingDetail = costs.selling;
  if (sellingDetail.agentCommission !== undefined) score += 4;
  if (sellingDetail.closingCosts !== undefined) score += 3;
  if (sellingDetail.staging !== undefined) score += 3;

  return Math.min(100, score);
}

/**
 * Assess freshness of market data
 *
 * @param comparables - Comparables analysis data
 * @returns Quality score 0-100
 */
export function assessMarketDataFreshness(
  comparables: ComparablesAnalysis | null
): number {
  if (!comparables || !comparables.comparables || comparables.comparables.length === 0) {
    return 30; // Base score when no comparables
  }

  const now = new Date();
  let totalScore = 0;
  let validSales = 0;

  for (const comp of comparables.comparables) {
    if (!comp.saleDate) continue;

    const saleDate = new Date(comp.saleDate);
    const monthsAgo = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    validSales++;

    // Score based on recency
    if (monthsAgo <= 3) {
      totalScore += 100; // Very recent
    } else if (monthsAgo <= 6) {
      totalScore += 85;
    } else if (monthsAgo <= 9) {
      totalScore += 70;
    } else if (monthsAgo <= 12) {
      totalScore += 55;
    } else if (monthsAgo <= 18) {
      totalScore += 40;
    } else if (monthsAgo <= 24) {
      totalScore += 25;
    } else {
      totalScore += 10; // Old data
    }
  }

  if (validSales === 0) {
    return 30;
  }

  return Math.round(totalScore / validSales);
}

/**
 * Assess completeness of property data
 *
 * @param property - Property data
 * @param regridData - Regrid enrichment data
 * @returns Quality score 0-100
 */
export function assessPropertyDataCompleteness(
  property: PropertyFinancialData,
  regridData?: RegridFinancialData | null
): number {
  let score = 0;
  const maxScore = 100;

  // Essential fields (50 points total)
  if (property.address && property.address.trim() !== '') score += 15;
  if (property.sqft && property.sqft > 0) score += 15;
  if (property.totalDue && property.totalDue > 0) score += 10;
  if (property.propertyType) score += 10;

  // Important fields (30 points total)
  if (property.bedrooms && property.bedrooms > 0) score += 8;
  if (property.bathrooms && property.bathrooms > 0) score += 8;
  if (property.yearBuilt && property.yearBuilt > 1800) score += 8;
  if (property.lotSizeSqft && property.lotSizeSqft > 0) score += 6;

  // Location fields (10 points total)
  if (property.state) score += 3;
  if (property.county) score += 3;
  if (property.annualTaxes && property.annualTaxes > 0) score += 4;

  // Regrid enrichment bonus (10 points total)
  if (regridData) {
    let regridBonus = 0;
    if (regridData.building_sqft && regridData.building_sqft > 0) regridBonus += 2;
    if (regridData.year_built && regridData.year_built > 1800) regridBonus += 2;
    if (regridData.bedrooms && regridData.bedrooms > 0) regridBonus += 2;
    if (regridData.bathrooms && regridData.bathrooms > 0) regridBonus += 2;
    if (regridData.assessed_value && regridData.assessed_value > 0) regridBonus += 2;

    score += regridBonus;
  }

  return Math.min(maxScore, score);
}

// ============================================
// Missing Data & Assumptions
// ============================================

/**
 * Identify missing data fields
 *
 * @param property - Property data
 * @param regridData - Regrid data
 * @param comparables - Comparables data
 * @returns Array of missing field names
 */
export function identifyMissingData(
  property: PropertyFinancialData,
  regridData?: RegridFinancialData | null,
  comparables?: ComparablesAnalysis | null
): string[] {
  const missing: string[] = [];

  // Check essential property fields
  if (!property.sqft && !regridData?.building_sqft) {
    missing.push('building_sqft');
  }

  if (!property.yearBuilt && !regridData?.year_built) {
    missing.push('year_built');
  }

  if (!property.bedrooms && !regridData?.bedrooms) {
    missing.push('bedrooms');
  }

  if (!property.bathrooms && !regridData?.bathrooms) {
    missing.push('bathrooms');
  }

  if (!property.lotSizeSqft && !regridData?.lot_size_sqft) {
    missing.push('lot_size');
  }

  if (!property.annualTaxes) {
    missing.push('annual_taxes');
  }

  if (!property.propertyType && !regridData?.property_type) {
    missing.push('property_type');
  }

  // Check location data
  if (!regridData?.latitude || !regridData?.longitude) {
    missing.push('coordinates');
  }

  if (!regridData?.assessed_value) {
    missing.push('assessed_value');
  }

  // Check comparables data
  if (!comparables || comparables.comparablesCount === 0) {
    missing.push('comparable_sales');
  }

  return missing;
}

/**
 * Document assumptions made due to missing data
 *
 * @param property - Property data
 * @param regridData - Regrid data
 * @param comparables - Comparables data
 * @param costs - Cost breakdown
 * @returns Array of assumption descriptions
 */
export function documentAssumptions(
  property: PropertyFinancialData,
  regridData?: RegridFinancialData | null,
  comparables?: ComparablesAnalysis | null,
  costs?: CostBreakdown
): string[] {
  const assumptions: string[] = [];

  // Square footage assumptions
  if (!property.sqft && !regridData?.building_sqft) {
    assumptions.push('Building square footage estimated from county average for property type');
  }

  // Year built assumptions
  if (!property.yearBuilt && !regridData?.year_built) {
    assumptions.push('Year built assumed to be average for neighborhood (1970s)');
  }

  // Bedroom/bathroom assumptions
  if (!property.bedrooms && !regridData?.bedrooms) {
    assumptions.push('Bedrooms estimated from square footage using typical ratios');
  }
  if (!property.bathrooms && !regridData?.bathrooms) {
    assumptions.push('Bathrooms estimated from bedroom count using standard ratios');
  }

  // Tax assumptions
  if (!property.annualTaxes) {
    assumptions.push('Property taxes estimated from state/county average mill rates');
  }

  // ARV assumptions
  if (!comparables || comparables.comparablesCount === 0) {
    assumptions.push('ARV estimated from assessed value multiplied by sales ratio (no comparables available)');
  } else if (comparables.comparablesCount < 3) {
    assumptions.push('ARV based on limited comparables - wider margin of error expected');
  }

  // Rehab assumptions
  if (costs && costs.rehab.totalRehab === 0) {
    assumptions.push('Minimal rehab assumed - property may require more work upon inspection');
  }

  // Holding period assumptions
  if (costs && costs.holding.holdingPeriodMonths === undefined) {
    assumptions.push('Holding period estimated at 6 months for flip strategy');
  }

  return assumptions;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get quality level from score
 *
 * @param score - Quality score 0-100
 * @returns Quality level string
 */
export function getQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= QUALITY_THRESHOLDS.excellent) return 'excellent';
  if (score >= QUALITY_THRESHOLDS.good) return 'good';
  if (score >= QUALITY_THRESHOLDS.fair) return 'fair';
  return 'poor';
}

/**
 * Get color class for quality level (for UI)
 *
 * @param score - Quality score 0-100
 * @returns Tailwind color classes
 */
export function getQualityColor(score: number): string {
  const level = getQualityLevel(score);
  const colors = {
    excellent: 'text-green-600 bg-green-100',
    good: 'text-blue-600 bg-blue-100',
    fair: 'text-yellow-600 bg-yellow-100',
    poor: 'text-red-600 bg-red-100',
  };
  return colors[level];
}

/**
 * Get human-readable quality description
 *
 * @param score - Quality score 0-100
 * @returns Description string
 */
export function getQualityDescription(score: number): string {
  const level = getQualityLevel(score);
  const descriptions = {
    excellent: 'Excellent data quality - high confidence in analysis',
    good: 'Good data quality - reliable analysis with minor gaps',
    fair: 'Fair data quality - some assumptions made due to missing data',
    poor: 'Poor data quality - significant data gaps affect reliability',
  };
  return descriptions[level];
}

/**
 * Calculate impact of missing data on analysis reliability
 *
 * @param missingData - Array of missing field names
 * @returns Impact assessment object
 */
export function assessMissingDataImpact(missingData: string[]): {
  impactLevel: 'low' | 'medium' | 'high';
  affectedAreas: string[];
  recommendations: string[];
} {
  const criticalFields = ['building_sqft', 'comparable_sales'];
  const importantFields = ['year_built', 'bedrooms', 'bathrooms', 'annual_taxes'];

  const hasCriticalMissing = missingData.some(field => criticalFields.includes(field));
  const importantMissingCount = missingData.filter(field => importantFields.includes(field)).length;

  let impactLevel: 'low' | 'medium' | 'high';
  const affectedAreas: string[] = [];
  const recommendations: string[] = [];

  if (hasCriticalMissing || importantMissingCount >= 3) {
    impactLevel = 'high';
    recommendations.push('Consider obtaining property inspection before bidding');
    recommendations.push('Use conservative estimates when setting max bid');
  } else if (importantMissingCount >= 1) {
    impactLevel = 'medium';
    recommendations.push('Verify key assumptions before finalizing bid strategy');
  } else {
    impactLevel = 'low';
  }

  // Identify affected areas
  if (missingData.includes('building_sqft')) {
    affectedAreas.push('ARV calculation');
    affectedAreas.push('Price per sqft analysis');
  }
  if (missingData.includes('comparable_sales')) {
    affectedAreas.push('Market value estimation');
    affectedAreas.push('ARV confidence');
  }
  if (missingData.includes('year_built')) {
    affectedAreas.push('Rehab cost estimation');
    affectedAreas.push('Condition assessment');
  }
  if (missingData.includes('annual_taxes')) {
    affectedAreas.push('Holding cost calculation');
  }

  return {
    impactLevel,
    affectedAreas,
    recommendations,
  };
}
