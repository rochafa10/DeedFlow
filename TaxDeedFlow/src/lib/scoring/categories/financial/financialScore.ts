/**
 * Financial Score Calculator - Financial Category (25 points)
 *
 * This file calculates the Financial category score, one of five categories
 * in the 125-point scoring system. Financial measures tax efficiency,
 * lien complexity, and investment costs.
 *
 * Components (5 points each, 25 points total):
 * 1. Tax Efficiency (tax_efficiency) - Ratio of tax debt to property value
 * 2. Lien Complexity (lien_complexity) - Number and severity of liens
 * 3. Assessment Ratio (assessment_ratio) - Assessed vs. market value ratio
 * 4. Redemption Risk (redemption_risk) - Likelihood of owner redemption
 * 5. Holding Costs (holding_costs) - Ongoing costs until sale/use
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import type {
  CategoryScore,
  ComponentScore,
  PropertyData,
  ExternalData,
  DataSource,
  MissingDataStrategy,
  FinancialComponentId,
  ScoreAdjustment,
} from '@/types/scoring';
import { SCORING_CONSTANTS } from '../../constants';
import { handleMissingData, type MissingDataResult } from '../../utils/missing-data-handler';
import { normalizeToScale, clampNormalized, normalizedToComponentScore } from '../../utils/normalization';

// ============================================
// Component Configuration
// ============================================

/**
 * Configuration for each financial component
 */
interface FinancialComponentConfig {
  /** Component ID */
  id: FinancialComponentId;
  /** Display name */
  name: string;
  /** Description of what this measures */
  description: string;
  /** How to normalize raw values */
  normalization: {
    /** Minimum raw value (maps to 0) */
    min: number;
    /** Maximum raw value (maps to 100) */
    max: number;
    /** Whether to invert (higher raw = lower score) */
    invert: boolean;
  };
  /** Default data source */
  defaultSource: string;
  /** Missing data handling key */
  missingDataKey: string;
}

/**
 * Financial component configurations
 */
const FINANCIAL_COMPONENTS: FinancialComponentConfig[] = [
  {
    id: 'tax_efficiency',
    name: 'Tax Efficiency',
    description: 'Ratio of tax debt to property value (lower is better)',
    normalization: { min: 0, max: 0.5, invert: true }, // 0-50% of value, inverted
    defaultSource: 'Property Data',
    missingDataKey: 'tax_to_value_ratio',
  },
  {
    id: 'lien_complexity',
    name: 'Lien Complexity',
    description: 'Number and severity of liens on the property',
    normalization: { min: 0, max: 10, invert: true }, // 0-10 liens, inverted
    defaultSource: 'Title Search',
    missingDataKey: 'lien_exposure',
  },
  {
    id: 'assessment_ratio',
    name: 'Assessment Ratio',
    description: 'How fairly property is assessed compared to market value',
    normalization: { min: 0.5, max: 1.5, invert: false }, // 50%-150% ratio
    defaultSource: 'County Assessor',
    missingDataKey: 'value_accuracy',
  },
  {
    id: 'redemption_risk',
    name: 'Redemption Risk',
    description: 'Likelihood that the owner will redeem the property',
    normalization: { min: 0, max: 100, invert: true }, // 0-100% probability, inverted
    defaultSource: 'Historical Data',
    missingDataKey: 'redemption_risk',
  },
  {
    id: 'holding_costs',
    name: 'Holding Costs',
    description: 'Estimated ongoing costs until property can be sold or used',
    normalization: { min: 0, max: 10000, invert: true }, // $0-$10k, inverted
    defaultSource: 'Calculated',
    missingDataKey: 'rehab_costs',
  },
];

// ============================================
// Main Calculation Function
// ============================================

/**
 * Calculate the Financial category score
 *
 * Evaluates property financials across 5 components:
 * - Tax Efficiency (tax debt to value ratio)
 * - Lien Complexity (number and severity of liens)
 * - Assessment Ratio (assessed vs. market value)
 * - Redemption Risk (likelihood of owner redemption)
 * - Holding Costs (ongoing costs until sale/use)
 *
 * @param property - Core property data
 * @param externalData - External data sources (title search, market data, etc.)
 * @returns CategoryScore with 5 components
 *
 * @example
 * const financialScore = calculateFinancialScore(
 *   { id: 'prop-123', total_due: 5000, market_value: 100000, ... },
 *   { titleData: { lienCount: 2 }, marketData: { ... }, ... }
 * );
 * // Returns: { id: 'financial', score: 18.5, components: [...], ... }
 */
export function calculateFinancialScore(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): CategoryScore {
  const components: ComponentScore[] = [];
  const notes: string[] = [];
  const adjustments: ScoreAdjustment[] = [];
  let totalConfidence = 0;
  let totalDataCompleteness = 0;
  let componentsWithData = 0;

  // Calculate each component
  for (const config of FINANCIAL_COMPONENTS) {
    const componentResult = calculateComponent(
      config,
      property,
      externalData
    );

    components.push(componentResult.component);
    notes.push(...componentResult.notes);

    // Track confidence and completeness
    totalConfidence += componentResult.component.confidence;
    if (componentResult.hasData) {
      totalDataCompleteness += 100;
      componentsWithData++;
    } else {
      totalDataCompleteness += componentResult.component.confidence * 0.5;
    }
  }

  // Calculate total category score (sum of 5 components)
  const totalScore = components.reduce((sum, c) => sum + c.score, 0);

  // Average confidence across components
  const avgConfidence = totalConfidence / FINANCIAL_COMPONENTS.length;

  // Data completeness percentage
  const dataCompleteness = totalDataCompleteness / FINANCIAL_COMPONENTS.length;

  // Add summary note
  if (componentsWithData === 0) {
    notes.push('Financial score based entirely on default values. Confidence is low.');
  } else if (componentsWithData < 3) {
    notes.push(
      `Financial score based on ${componentsWithData}/5 data points. Some components use defaults.`
    );
  }

  return {
    id: 'financial',
    name: 'Financial',
    score: Math.round(totalScore * 100) / 100,
    maxScore: SCORING_CONSTANTS.MAX_CATEGORY_SCORE,
    confidence: Math.round(avgConfidence * 10) / 10,
    dataCompleteness: Math.round(dataCompleteness * 10) / 10,
    components,
    notes,
    adjustments,
  };
}

// ============================================
// Component Calculation Functions
// ============================================

/**
 * Calculate a single financial component score
 *
 * @param config - Component configuration
 * @param property - Property data
 * @param externalData - External data sources
 * @returns Component score with metadata
 */
function calculateComponent(
  config: FinancialComponentConfig,
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): {
  component: ComponentScore;
  notes: string[];
  hasData: boolean;
} {
  const notes: string[] = [];
  let hasData = false;
  let rawValue: unknown = null;
  let normalizedValue = 50; // Default to middle
  let confidence = 100;
  let dataSource: DataSource = {
    name: config.defaultSource,
    type: 'default',
    reliability: 'low',
  };
  let missingDataStrategy: MissingDataStrategy = 'default_neutral';

  // Extract component-specific data and calculate score
  switch (config.id) {
    case 'tax_efficiency': {
      const result = calculateTaxEfficiency(property, externalData);
      rawValue = result.rawValue;
      normalizedValue = result.normalizedValue;
      hasData = result.hasData;
      confidence = result.confidence;
      dataSource = result.dataSource;
      missingDataStrategy = result.missingDataStrategy;
      notes.push(...result.notes);
      break;
    }

    case 'lien_complexity': {
      const result = calculateLienComplexity(property, externalData);
      rawValue = result.rawValue;
      normalizedValue = result.normalizedValue;
      hasData = result.hasData;
      confidence = result.confidence;
      dataSource = result.dataSource;
      missingDataStrategy = result.missingDataStrategy;
      notes.push(...result.notes);
      break;
    }

    case 'assessment_ratio': {
      const result = calculateAssessmentRatio(property, externalData);
      rawValue = result.rawValue;
      normalizedValue = result.normalizedValue;
      hasData = result.hasData;
      confidence = result.confidence;
      dataSource = result.dataSource;
      missingDataStrategy = result.missingDataStrategy;
      notes.push(...result.notes);
      break;
    }

    case 'redemption_risk': {
      const result = calculateRedemptionRisk(property, externalData);
      rawValue = result.rawValue;
      normalizedValue = result.normalizedValue;
      hasData = result.hasData;
      confidence = result.confidence;
      dataSource = result.dataSource;
      missingDataStrategy = result.missingDataStrategy;
      notes.push(...result.notes);
      break;
    }

    case 'holding_costs': {
      const result = calculateHoldingCosts(property, externalData);
      rawValue = result.rawValue;
      normalizedValue = result.normalizedValue;
      hasData = result.hasData;
      confidence = result.confidence;
      dataSource = result.dataSource;
      missingDataStrategy = result.missingDataStrategy;
      notes.push(...result.notes);
      break;
    }
  }

  // Convert normalized value (0-100) to component score (0-5)
  const score = normalizedToComponentScore(normalizedValue);

  const component: ComponentScore = {
    id: config.id,
    name: config.name,
    score: Math.round(score * 100) / 100,
    maxScore: SCORING_CONSTANTS.MAX_COMPONENT_SCORE,
    rawValue,
    normalizedValue: Math.round(normalizedValue * 10) / 10,
    confidence: Math.round(confidence * 10) / 10,
    description: config.description,
    dataSource,
    missingDataStrategy,
  };

  return { component, notes, hasData };
}

// ============================================
// Individual Component Calculators
// ============================================

/**
 * Calculate tax efficiency score
 * Measures the ratio of tax debt to property value
 * Lower ratio = better score (less debt relative to value)
 */
function calculateTaxEfficiency(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): {
  rawValue: unknown;
  normalizedValue: number;
  hasData: boolean;
  confidence: number;
  dataSource: DataSource;
  missingDataStrategy: MissingDataStrategy;
  notes: string[];
} {
  const notes: string[] = [];

  // Check if we have the necessary data
  const hasTotalDue = property.total_due !== null && property.total_due !== undefined;
  const hasValue = property.market_value !== null && property.market_value !== undefined
    || property.assessed_value !== null && property.assessed_value !== undefined;

  if (!hasTotalDue || !hasValue) {
    // Missing data - use handler
    const missingResult = handleMissingData('tax_to_value_ratio', false);
    notes.push(missingResult.note);

    return {
      rawValue: null,
      normalizedValue: missingResult.score * 20, // Convert 0-5 to 0-100
      hasData: false,
      confidence: missingResult.confidence,
      dataSource: { name: 'Default', type: 'default', reliability: 'low' },
      missingDataStrategy: missingResult.strategy,
      notes,
    };
  }

  // Calculate tax to value ratio
  const totalDue = property.total_due!;
  const propertyValue = property.market_value || property.assessed_value || 0;
  const ratio = propertyValue > 0 ? totalDue / propertyValue : 0.5;

  // Normalize: 0-50% ratio, inverted (lower ratio = better score)
  let normalized = normalizeToScale(ratio, 0, 0.5);
  normalized = 100 - normalized; // Invert: lower ratio = higher score

  // Clamp to valid range
  normalized = clampNormalized(normalized, 0, 100);

  // Add contextual note
  if (ratio < 0.05) {
    notes.push(`Excellent tax efficiency: ${(ratio * 100).toFixed(1)}% of value.`);
  } else if (ratio > 0.25) {
    notes.push(`High tax burden: ${(ratio * 100).toFixed(1)}% of value.`);
  }

  return {
    rawValue: ratio,
    normalizedValue: normalized,
    hasData: true,
    confidence: 95,
    dataSource: {
      name: 'Property Data',
      type: 'database',
      reliability: 'high',
    },
    missingDataStrategy: 'default_neutral',
    notes,
  };
}

/**
 * Calculate lien complexity score
 * Measures the number and severity of liens on the property
 * Fewer liens = better score
 */
function calculateLienComplexity(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): {
  rawValue: unknown;
  normalizedValue: number;
  hasData: boolean;
  confidence: number;
  dataSource: DataSource;
  missingDataStrategy: MissingDataStrategy;
  notes: string[];
} {
  const notes: string[] = [];

  // For now, we don't have title/lien data in the schema
  // This would come from title search data in a real implementation
  const missingResult = handleMissingData('lien_exposure', false);
  notes.push(missingResult.note);

  return {
    rawValue: null,
    normalizedValue: missingResult.score * 20, // Convert 0-5 to 0-100
    hasData: false,
    confidence: missingResult.confidence,
    dataSource: { name: 'Title Search', type: 'default', reliability: 'low' },
    missingDataStrategy: missingResult.strategy,
    notes,
  };
}

/**
 * Calculate assessment ratio score
 * Measures how fairly the property is assessed compared to market value
 * Ratio near 1.0 = better score (fair assessment)
 */
function calculateAssessmentRatio(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): {
  rawValue: unknown;
  normalizedValue: number;
  hasData: boolean;
  confidence: number;
  dataSource: DataSource;
  missingDataStrategy: MissingDataStrategy;
  notes: string[];
} {
  const notes: string[] = [];

  const hasAssessed = property.assessed_value !== null && property.assessed_value !== undefined;
  const hasMarket = property.market_value !== null && property.market_value !== undefined;

  if (!hasAssessed || !hasMarket) {
    const missingResult = handleMissingData('value_accuracy', false);
    notes.push(missingResult.note);

    return {
      rawValue: null,
      normalizedValue: missingResult.score * 20,
      hasData: false,
      confidence: missingResult.confidence,
      dataSource: { name: 'County Assessor', type: 'default', reliability: 'low' },
      missingDataStrategy: missingResult.strategy,
      notes,
    };
  }

  // Calculate assessment ratio
  const assessed = property.assessed_value!;
  const market = property.market_value!;
  const ratio = market > 0 ? assessed / market : 1.0;

  // Normalize: optimal ratio is 1.0 (100%), acceptable range 0.5-1.5
  // Score is highest at 1.0 and decreases as we move away from it
  let normalized: number;
  if (ratio >= 0.8 && ratio <= 1.2) {
    // Excellent range: 80-120%
    normalized = 100;
  } else if (ratio >= 0.5 && ratio <= 1.5) {
    // Acceptable range: 50-150%
    const distanceFrom1 = Math.abs(ratio - 1.0);
    normalized = 100 - (distanceFrom1 * 100); // Linear decrease
  } else {
    // Outside acceptable range
    normalized = 20;
  }

  normalized = clampNormalized(normalized, 0, 100);

  // Add contextual note
  if (ratio < 0.7) {
    notes.push(`Property may be underassessed (${(ratio * 100).toFixed(0)}% of market value).`);
  } else if (ratio > 1.3) {
    notes.push(`Property may be overassessed (${(ratio * 100).toFixed(0)}% of market value).`);
  }

  return {
    rawValue: ratio,
    normalizedValue: normalized,
    hasData: true,
    confidence: 80,
    dataSource: {
      name: 'County Assessor',
      type: 'database',
      reliability: 'medium',
    },
    missingDataStrategy: 'default_neutral',
    notes,
  };
}

/**
 * Calculate redemption risk score
 * Measures the likelihood that the owner will redeem the property
 * Lower redemption risk = better score for investor
 */
function calculateRedemptionRisk(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): {
  rawValue: unknown;
  normalizedValue: number;
  hasData: boolean;
  confidence: number;
  dataSource: DataSource;
  missingDataStrategy: MissingDataStrategy;
  notes: string[];
} {
  const notes: string[] = [];

  // Redemption risk calculation would require:
  // - Sale type (upset, judicial, repository)
  // - Time since tax delinquency
  // - Historical redemption rates for the county
  // - Property value vs. tax debt ratio

  // For now, estimate based on sale type if available
  if (property.sale_type) {
    const saleType = property.sale_type.toLowerCase();
    let riskPercentage = 50; // Default moderate risk

    if (saleType.includes('repository')) {
      // Repository sales have lower redemption risk (property already went through upset/judicial)
      riskPercentage = 20;
      notes.push('Repository sale: Lower redemption risk.');
    } else if (saleType.includes('judicial')) {
      // Judicial sales have moderate redemption risk
      riskPercentage = 40;
      notes.push('Judicial sale: Moderate redemption risk.');
    } else if (saleType.includes('upset')) {
      // Upset sales have higher redemption risk (first attempt)
      riskPercentage = 60;
      notes.push('Upset sale: Higher redemption risk.');
    }

    // Normalize and invert (lower risk = higher score)
    const normalized = 100 - normalizeToScale(riskPercentage, 0, 100);

    return {
      rawValue: riskPercentage,
      normalizedValue: normalized,
      hasData: true,
      confidence: 60,
      dataSource: {
        name: 'Sale Type Analysis',
        type: 'calculated',
        reliability: 'medium',
      },
      missingDataStrategy: 'default_neutral',
      notes,
    };
  }

  // No sale type data available
  const missingResult = handleMissingData('redemption_risk', false);
  notes.push(missingResult.note);

  return {
    rawValue: null,
    normalizedValue: missingResult.score * 20,
    hasData: false,
    confidence: missingResult.confidence,
    dataSource: { name: 'Historical Data', type: 'default', reliability: 'low' },
    missingDataStrategy: missingResult.strategy,
    notes,
  };
}

/**
 * Calculate holding costs score
 * Estimates ongoing costs until the property can be sold or used
 * Lower costs = better score
 */
function calculateHoldingCosts(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): {
  rawValue: unknown;
  normalizedValue: number;
  hasData: boolean;
  confidence: number;
  dataSource: DataSource;
  missingDataStrategy: MissingDataStrategy;
  notes: string[];
} {
  const notes: string[] = [];

  // Estimate holding costs based on:
  // - Annual taxes (if we can estimate)
  // - Insurance (rough estimate)
  // - Maintenance (rough estimate)
  // - Utilities (if occupied or need to maintain)

  const hasValue = property.assessed_value !== null || property.market_value !== null;

  if (hasValue) {
    const propertyValue = property.assessed_value || property.market_value || 0;

    // Rough estimate: 2-3% of property value per year
    // Divide by 12 for monthly holding costs
    const annualCostRate = 0.025; // 2.5%
    const estimatedAnnualCosts = propertyValue * annualCostRate;
    const estimatedMonthlyCosts = estimatedAnnualCosts / 12;

    notes.push(`Estimated monthly holding costs: $${estimatedMonthlyCosts.toFixed(0)}`);

    // Normalize: $0-$10k range, inverted (lower = better)
    let normalized = normalizeToScale(estimatedMonthlyCosts, 0, 10000);
    normalized = 100 - normalized; // Invert
    normalized = clampNormalized(normalized, 0, 100);

    return {
      rawValue: estimatedMonthlyCosts,
      normalizedValue: normalized,
      hasData: true,
      confidence: 50, // Low confidence as this is an estimate
      dataSource: {
        name: 'Calculated',
        type: 'estimated',
        reliability: 'low',
      },
      missingDataStrategy: 'estimate_from_peers',
      notes,
    };
  }

  // No data to estimate holding costs
  const missingResult = handleMissingData('rehab_costs', false);
  notes.push(missingResult.note);

  return {
    rawValue: null,
    normalizedValue: missingResult.score * 20,
    hasData: false,
    confidence: missingResult.confidence,
    dataSource: { name: 'Calculated', type: 'default', reliability: 'low' },
    missingDataStrategy: missingResult.strategy,
    notes,
  };
}
