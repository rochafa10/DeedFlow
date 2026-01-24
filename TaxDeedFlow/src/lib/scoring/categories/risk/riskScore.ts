/**
 * Risk Score Calculator - Risk Category (25 points)
 *
 * This file calculates the Risk category score, one of five categories
 * in the 125-point scoring system. Risk measures flood zones, environmental
 * hazards, structural risks, title issues, and zoning compliance.
 *
 * Components (5 points each, 25 points total):
 * 1. Flood Zone (flood_zone) - FEMA flood zone risk assessment
 * 2. Environmental Hazards (environmental_hazards) - EPA and environmental risk
 * 3. Structural Risk (structural_risk) - Natural disaster and structural concerns
 * 4. Title Issues (title_issues) - Title clarity and lien risk
 * 5. Zoning Compliance (zoning_compliance) - Zoning and land use compliance
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-23
 */

import type {
  CategoryScore,
  ComponentScore,
  PropertyData,
  ExternalData,
  DataSource,
  MissingDataStrategy,
  RiskComponentId,
  ScoreAdjustment,
} from '@/types/scoring';
import { SCORING_CONSTANTS } from '../../constants';
import { handleMissingData, type MissingDataResult } from '../../utils/missing-data-handler';
import { normalizeToScale, clampNormalized } from '../../utils/normalization';

// ============================================
// Component Configuration
// ============================================

/**
 * Configuration for each risk component
 */
interface RiskComponentConfig {
  /** Component ID */
  id: RiskComponentId;
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
 * Risk component configurations
 */
const RISK_COMPONENTS: RiskComponentConfig[] = [
  {
    id: 'flood_zone',
    name: 'Flood Zone',
    description: 'FEMA flood zone designation and risk level',
    normalization: { min: 0, max: 100, invert: true }, // Higher risk = lower score
    defaultSource: 'FEMA',
    missingDataKey: 'flood_zone',
  },
  {
    id: 'environmental_hazards',
    name: 'Environmental Hazards',
    description: 'Environmental risk including Superfund sites, brownfields, and air quality',
    normalization: { min: 0, max: 100, invert: true }, // Higher risk = lower score
    defaultSource: 'EPA',
    missingDataKey: 'environmental',
  },
  {
    id: 'structural_risk',
    name: 'Structural Risk',
    description: 'Natural disaster risk including earthquakes, wildfires, and hurricanes',
    normalization: { min: 0, max: 100, invert: true }, // Higher risk = lower score
    defaultSource: 'USGS/NOAA',
    missingDataKey: 'structural_risk',
  },
  {
    id: 'title_issues',
    name: 'Title Issues',
    description: 'Title clarity and lien risk assessment',
    normalization: { min: 0, max: 100, invert: true }, // Higher risk = lower score
    defaultSource: 'County Records',
    missingDataKey: 'title',
  },
  {
    id: 'zoning_compliance',
    name: 'Zoning Compliance',
    description: 'Zoning designation and land use compliance',
    normalization: { min: 0, max: 100, invert: true }, // Higher risk = lower score
    defaultSource: 'County Planning',
    missingDataKey: 'zoning',
  },
];

// ============================================
// Main Calculation Function
// ============================================

/**
 * Calculate the Risk category score
 *
 * Evaluates property risk across 5 components:
 * - Flood Zone (FEMA flood risk)
 * - Environmental Hazards (EPA and environmental concerns)
 * - Structural Risk (natural disaster risk)
 * - Title Issues (title clarity and liens)
 * - Zoning Compliance (zoning and land use)
 *
 * @param property - Core property data
 * @param externalData - External data sources (FEMA, EPA, etc.)
 * @returns CategoryScore with 5 components
 *
 * @example
 * const riskScore = calculateRiskScore(
 *   { id: 'prop-123', address: '456 Oak St', state: 'PA', zoning: 'R-1' },
 *   { floodZone: { zone: 'X', riskLevel: 'minimal' }, environmentalHazards: { riskScore: 15 } }
 * );
 * // Returns: { id: 'risk', score: 18.5, components: [...], ... }
 */
export function calculateRiskScore(
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
  for (const config of RISK_COMPONENTS) {
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
  const avgConfidence = totalConfidence / RISK_COMPONENTS.length;

  // Data completeness percentage
  const dataCompleteness = totalDataCompleteness / RISK_COMPONENTS.length;

  // Add summary note
  if (componentsWithData === 0) {
    notes.push('Risk score based entirely on default values. Confidence is low.');
  } else if (componentsWithData < 3) {
    notes.push(
      `Risk score based on ${componentsWithData}/5 data points. Some components use defaults.`
    );
  }

  return {
    id: 'risk',
    name: 'Risk Assessment',
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
 * Calculate a single component score
 */
function calculateComponent(
  config: RiskComponentConfig,
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): {
  component: ComponentScore;
  notes: string[];
  hasData: boolean;
} {
  const notes: string[] = [];

  // Get raw value for this component
  const rawValueResult = getRawValue(config.id, property, externalData);
  const hasData = rawValueResult.hasData;
  const rawValue = rawValueResult.value;

  let score: number;
  let normalizedValue: number;
  let confidence: number;
  let missingDataStrategy: MissingDataStrategy = 'default_neutral';
  let dataSource: DataSource;
  let description: string;

  if (hasData && rawValue !== null) {
    // We have actual data - calculate score
    normalizedValue = normalizeRawValue(rawValue, config.normalization);
    score = normalizedValueToScore(normalizedValue);
    confidence = 90; // High confidence with actual data
    dataSource = {
      name: rawValueResult.source || config.defaultSource,
      type: 'api',
      reliability: 'high',
      lastUpdated: new Date(),
    };
    description = generateDescription(config.id, rawValue, score);
  } else {
    // Missing data - use handler
    const missingResult = handleMissingData(config.missingDataKey, false);
    score = missingResult.score;
    normalizedValue = (score / SCORING_CONSTANTS.MAX_COMPONENT_SCORE) * 100;
    confidence = missingResult.confidence;
    missingDataStrategy = missingResult.strategy;
    dataSource = {
      name: 'Default',
      type: 'default',
      reliability: 'low',
    };
    description = missingResult.note;
    notes.push(`${config.name}: ${missingResult.note}`);
  }

  return {
    component: {
      id: config.id,
      name: config.name,
      score: Math.round(score * 100) / 100,
      maxScore: SCORING_CONSTANTS.MAX_COMPONENT_SCORE,
      rawValue: rawValue,
      normalizedValue: Math.round(normalizedValue * 10) / 10,
      confidence: Math.round(confidence * 10) / 10,
      description,
      dataSource,
      missingDataStrategy,
    },
    notes,
    hasData,
  };
}

/**
 * Get raw value for a component from external data or property data
 */
function getRawValue(
  componentId: RiskComponentId,
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): {
  hasData: boolean;
  value: number | null;
  source?: string;
} {
  switch (componentId) {
    case 'flood_zone':
      if (externalData?.floodZone?.riskLevel) {
        // Convert risk level to numeric score (0-100)
        const riskScore = floodRiskLevelToScore(externalData.floodZone.riskLevel);
        return {
          hasData: true,
          value: riskScore,
          source: 'FEMA',
        };
      }
      break;

    case 'environmental_hazards':
      if (externalData?.environmentalHazards?.riskScore !== null &&
          externalData?.environmentalHazards?.riskScore !== undefined) {
        return {
          hasData: true,
          value: externalData.environmentalHazards.riskScore,
          source: 'EPA',
        };
      }
      // Calculate from individual hazards if riskScore not available
      if (externalData?.environmentalHazards) {
        const hazards = externalData.environmentalHazards;
        const superfundScore = hazards.superfundSites ? Math.min(100, hazards.superfundSites * 50) : 0;
        const brownfieldScore = hazards.brownfieldSites ? Math.min(100, hazards.brownfieldSites * 30) : 0;
        const airQualityScore = hazards.airQualityIndex
          ? Math.min(100, (hazards.airQualityIndex / 500) * 100)
          : 0;

        const avgRisk = (superfundScore + brownfieldScore + airQualityScore) / 3;
        if (avgRisk > 0) {
          return {
            hasData: true,
            value: avgRisk,
            source: 'EPA',
          };
        }
      }
      break;

    case 'structural_risk':
      // Structural risk would come from geological, fire, hurricane analyzers
      // These are not yet implemented in ExternalData, so default to missing data
      // TODO: Add geological, fire, hurricane data to ExternalData
      break;

    case 'title_issues':
      // Title issues would come from title research
      // Not yet implemented in PropertyData or ExternalData
      // TODO: Add title clarity assessment to PropertyData
      break;

    case 'zoning_compliance':
      // Check if zoning is present in property data
      if (property.zoning) {
        // For now, assume valid zoning = low risk (20)
        // Invalid or restrictive zoning would require additional logic
        // TODO: Add zoning validation and compliance checking
        return {
          hasData: true,
          value: 20, // Low risk if zoning is present
          source: 'County Planning',
        };
      }
      break;
  }

  return { hasData: false, value: null };
}

/**
 * Convert flood risk level to numeric score (0-100, higher = more risk)
 */
function floodRiskLevelToScore(riskLevel: 'high' | 'moderate' | 'low' | 'minimal'): number {
  switch (riskLevel) {
    case 'high':
      return 90;
    case 'moderate':
      return 60;
    case 'low':
      return 30;
    case 'minimal':
      return 10;
    default:
      return 50;
  }
}

/**
 * Normalize raw value to 0-100 scale
 */
function normalizeRawValue(
  value: number,
  config: RiskComponentConfig['normalization']
): number {
  // Clamp to expected range
  const clamped = Math.max(config.min, Math.min(config.max, value));

  // Normalize to 0-100
  const range = config.max - config.min;
  let normalized = ((clamped - config.min) / range) * 100;

  // Invert if needed (risk scores are inverted - higher risk = lower score)
  if (config.invert) {
    normalized = 100 - normalized;
  }

  return clampNormalized(normalized);
}

/**
 * Convert normalized value (0-100) to component score (0-5)
 */
function normalizedValueToScore(normalizedValue: number): number {
  return (normalizedValue / 100) * SCORING_CONSTANTS.MAX_COMPONENT_SCORE;
}

/**
 * Generate human-readable description for a component
 */
function generateDescription(
  componentId: RiskComponentId,
  rawValue: number,
  score: number
): string {
  const rating = getScoreRating(score);

  switch (componentId) {
    case 'flood_zone':
      return `Flood risk score of ${rawValue.toFixed(0)}. ${rating} flood risk level.`;

    case 'environmental_hazards':
      return `Environmental risk score of ${rawValue.toFixed(0)}. ${rating} environmental safety.`;

    case 'structural_risk':
      return `Structural risk score of ${rawValue.toFixed(0)}. ${rating} structural safety.`;

    case 'title_issues':
      return `Title risk score of ${rawValue.toFixed(0)}. ${rating} title clarity.`;

    case 'zoning_compliance':
      return `Zoning compliance score of ${rawValue.toFixed(0)}. ${rating} zoning compliance.`;

    default:
      return `Score: ${score.toFixed(2)}/5`;
  }
}

/**
 * Get rating label based on score
 */
function getScoreRating(score: number): string {
  if (score >= 4.5) return 'Excellent';
  if (score >= 3.5) return 'Good';
  if (score >= 2.5) return 'Average';
  if (score >= 1.5) return 'Below average';
  return 'Poor';
}

// ============================================
// Individual Component Calculators
// ============================================

/**
 * Calculate flood zone score
 *
 * @param floodZone - FEMA flood zone data
 * @returns Component score (0-5)
 */
export function calculateFloodZoneScore(
  floodZone: { riskLevel: 'high' | 'moderate' | 'low' | 'minimal' } | null
): number {
  if (!floodZone?.riskLevel) {
    const result = handleMissingData('flood_zone', false);
    return result.score;
  }

  const riskScore = floodRiskLevelToScore(floodZone.riskLevel);
  const normalized = 100 - clampNormalized(riskScore); // Invert (lower risk = higher score)
  return (normalized / 100) * SCORING_CONSTANTS.MAX_COMPONENT_SCORE;
}

/**
 * Calculate environmental hazards score
 *
 * @param environmentalRiskScore - Environmental risk score (0-100, higher = more risk)
 * @returns Component score (0-5)
 */
export function calculateEnvironmentalHazardsScore(
  environmentalRiskScore: number | null
): number {
  if (environmentalRiskScore === null || environmentalRiskScore === undefined) {
    const result = handleMissingData('environmental', false);
    return result.score;
  }

  // Invert (lower risk = higher score)
  const normalized = 100 - clampNormalized(environmentalRiskScore);
  return (normalized / 100) * SCORING_CONSTANTS.MAX_COMPONENT_SCORE;
}

/**
 * Calculate structural risk score
 *
 * @param structuralRiskScore - Structural risk score (0-100, higher = more risk)
 * @returns Component score (0-5)
 */
export function calculateStructuralRiskScore(
  structuralRiskScore: number | null
): number {
  if (structuralRiskScore === null || structuralRiskScore === undefined) {
    const result = handleMissingData('structural_risk', false);
    return result.score;
  }

  // Invert (lower risk = higher score)
  const normalized = 100 - clampNormalized(structuralRiskScore);
  return (normalized / 100) * SCORING_CONSTANTS.MAX_COMPONENT_SCORE;
}

/**
 * Calculate title issues score
 *
 * @param titleRiskScore - Title risk score (0-100, higher = more risk)
 * @returns Component score (0-5)
 */
export function calculateTitleIssuesScore(
  titleRiskScore: number | null
): number {
  if (titleRiskScore === null || titleRiskScore === undefined) {
    const result = handleMissingData('title', false);
    return result.score;
  }

  // Invert (lower risk = higher score)
  const normalized = 100 - clampNormalized(titleRiskScore);
  return (normalized / 100) * SCORING_CONSTANTS.MAX_COMPONENT_SCORE;
}

/**
 * Calculate zoning compliance score
 *
 * @param zoningRiskScore - Zoning compliance risk score (0-100, higher = more risk)
 * @returns Component score (0-5)
 */
export function calculateZoningComplianceScore(
  zoningRiskScore: number | null
): number {
  if (zoningRiskScore === null || zoningRiskScore === undefined) {
    const result = handleMissingData('zoning', false);
    return result.score;
  }

  // Invert (lower risk = higher score)
  const normalized = 100 - clampNormalized(zoningRiskScore);
  return (normalized / 100) * SCORING_CONSTANTS.MAX_COMPONENT_SCORE;
}

// ============================================
// Utility Exports
// ============================================

/**
 * Get risk component IDs
 */
export function getRiskComponentIds(): RiskComponentId[] {
  return RISK_COMPONENTS.map((c) => c.id);
}

/**
 * Get risk component configuration
 */
export function getRiskComponentConfig(
  componentId: RiskComponentId
): RiskComponentConfig | undefined {
  return RISK_COMPONENTS.find((c) => c.id === componentId);
}

/**
 * Check if all risk data is available
 */
export function hasCompleteRiskData(
  property: Partial<PropertyData>,
  externalData: Partial<ExternalData> | null
): boolean {
  if (!externalData) return false;

  return (
    externalData.floodZone?.riskLevel !== null &&
    externalData.environmentalHazards?.riskScore !== null &&
    property.zoning !== null
    // Note: structural_risk and title_issues not yet implemented
  );
}

/**
 * Get risk data completeness percentage
 */
export function getRiskDataCompleteness(
  property: Partial<PropertyData>,
  externalData: Partial<ExternalData> | null
): number {
  if (!externalData && !property) return 0;

  let available = 0;
  const total = 5;

  if (externalData?.floodZone?.riskLevel) available++;
  if (externalData?.environmentalHazards?.riskScore !== null &&
      externalData?.environmentalHazards?.riskScore !== undefined) available++;
  if (property?.zoning) available++;
  // structural_risk: not available (0)
  // title_issues: not available (0)

  return (available / total) * 100;
}
