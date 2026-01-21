/**
 * Water Risk Analysis Module
 *
 * Exports all water risk analysis functionality including flood and hurricane
 * risk analyzers, and provides a combined water risk analysis function.
 *
 * @module lib/risk/water
 * @author Claude Code Agent
 * @date 2026-01-16
 */

// ============================================
// Re-exports from Flood Analyzer
// ============================================

export {
  FLOOD_ZONE_DEFINITIONS,
  calculateFloodInsurancePremium,
  getFloodRiskScore,
  analyzeFloodRisk,
  createUnknownFloodRisk,
} from './flood-analyzer';

// ============================================
// Re-exports from Hurricane Analyzer
// ============================================

export {
  HURRICANE_RISK_STATES,
  WIND_ZONE_DEFINITIONS,
  STORM_SURGE_ZONE_DEFINITIONS,
  getHurricaneRiskScore,
  analyzeHurricaneRisk,
  createUnknownHurricaneRisk,
  isHurricaneRiskState,
} from './hurricane-analyzer';

// ============================================
// Type Re-exports
// ============================================

export type {
  FloodRiskAnalysis,
  HurricaneRiskAnalysis,
  WaterRiskResult,
  FloodMitigation,
  HurricaneMitigation,
  FEMAFloodZone,
  WindZone,
  StormSurgeZone,
  RiskLevel,
  CombinedWaterRisk,
  PrimaryWaterConcern,
  DataSource,
  MitigationOption,
  WaterRiskScoring,
} from '@/types/risk-analysis';

// ============================================
// Combined Analysis Imports
// ============================================

import type {
  FloodRiskAnalysis,
  HurricaneRiskAnalysis,
  WaterRiskResult,
  CombinedWaterRisk,
  PrimaryWaterConcern,
  FEMAFloodZone,
} from '@/types/risk-analysis';

import {
  analyzeFloodRisk,
  getFloodRiskScore,
  calculateFloodInsurancePremium,
} from './flood-analyzer';

import {
  analyzeHurricaneRisk,
  getHurricaneRiskScore,
  isHurricaneRiskState,
} from './hurricane-analyzer';

// ============================================
// Combined Water Risk Analysis
// ============================================

/**
 * Perform comprehensive water risk analysis combining flood and hurricane risks
 *
 * This function analyzes both flood zone data (from FEMA) and hurricane exposure
 * to provide a complete water risk assessment for property investment decisions.
 *
 * @param coordinates - Property latitude and longitude
 * @param floodData - FEMA flood zone data
 * @param state - Two-letter state code
 * @param options - Optional additional data for more accurate analysis
 * @returns Complete water risk analysis including scores and recommendations
 *
 * @example
 * ```typescript
 * const waterRisk = await analyzeWaterRisks(
 *   { latitude: 25.7617, longitude: -80.1918 },
 *   { zone: 'AE', baseFloodElevation: 8 },
 *   'FL',
 *   { distanceToCoast: 2, buildingValue: 250000 }
 * );
 *
 * console.log(waterRisk.combinedRiskLevel); // 'severe'
 * console.log(waterRisk.totalInsuranceCost); // ~5000
 * console.log(waterRisk.combinedWaterRiskScore); // 1.5
 * ```
 */
export function analyzeWaterRisks(
  coordinates: { latitude: number; longitude: number },
  floodData: {
    zone: FEMAFloodZone;
    baseFloodElevation?: number | null;
    propertyElevation?: number | null;
    floodwayStatus?: 'in_floodway' | 'in_fringe' | 'outside' | null;
    historicalFlooding?: {
      count: number;
      lastDate: Date | null;
      avgDamage: number | null;
    } | null;
  },
  state: string,
  options?: {
    distanceToCoast?: number | null;
    buildingValue?: number;
    historicalStorms?: {
      count: number;
      significantStorms: string[];
    } | null;
  }
): WaterRiskResult {
  // Analyze flood risk
  const floodAnalysis = analyzeFloodRisk(coordinates, floodData);

  // Analyze hurricane risk
  const hurricaneAnalysis = analyzeHurricaneRisk(coordinates, state, {
    distanceToCoast: options?.distanceToCoast,
    historicalStorms: options?.historicalStorms,
  });

  // Calculate individual scores
  const floodRiskScore = getFloodRiskScore(floodAnalysis);
  const hurricaneRiskScore = getHurricaneRiskScore(hurricaneAnalysis);

  // Calculate combined risk level
  const combinedRiskLevel = calculateCombinedRiskLevel(floodAnalysis, hurricaneAnalysis);

  // Determine primary concern
  const primaryConcern = determinePrimaryConcern(floodAnalysis, hurricaneAnalysis);

  // Calculate insurance costs
  const buildingValue = options?.buildingValue ?? 150000;
  const floodInsurance = floodAnalysis.insuranceRequired
    ? calculateFloodInsurancePremium(floodData.zone, buildingValue)
    : floodAnalysis.annualPremiumEstimate ?? 0;

  const windstormInsurance = calculateWindstormInsurance(hurricaneAnalysis, buildingValue);

  const totalInsuranceCost = floodInsurance + windstormInsurance;

  // Generate critical warnings
  const criticalWarnings = generateCriticalWarnings(floodAnalysis, hurricaneAnalysis);

  // Generate combined recommendations
  const recommendations = generateCombinedRecommendations(floodAnalysis, hurricaneAnalysis);

  // Calculate combined water risk score (weighted average)
  // Weight depends on whether hurricane risk is applicable
  const hasHurricaneRisk = isHurricaneRiskState(state);
  let combinedWaterRiskScore: number;

  if (hasHurricaneRisk) {
    // In hurricane states, weight both equally
    combinedWaterRiskScore = (floodRiskScore * 0.5 + hurricaneRiskScore * 0.5);
  } else {
    // In non-hurricane states, flood risk is primary
    combinedWaterRiskScore = floodRiskScore * 0.9 + hurricaneRiskScore * 0.1;
  }

  // Calculate overall confidence (weighted average of both analyses)
  const confidence = Math.round(
    (floodAnalysis.confidence + hurricaneAnalysis.confidence) / 2
  );

  return {
    flood: floodAnalysis,
    hurricane: hurricaneAnalysis,
    combinedRiskLevel,
    primaryConcern,
    totalInsuranceCost,
    insuranceBreakdown: {
      flood: Math.round(floodInsurance),
      windstorm: Math.round(windstormInsurance),
    },
    criticalWarnings,
    recommendations,
    floodRiskScore,
    hurricaneRiskScore,
    combinedWaterRiskScore: Math.round(combinedWaterRiskScore * 100) / 100,
    analyzedAt: new Date(),
    confidence,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate combined water risk level from flood and hurricane analyses
 */
function calculateCombinedRiskLevel(
  flood: FloodRiskAnalysis,
  hurricane: HurricaneRiskAnalysis
): CombinedWaterRisk {
  // Map risk levels to numeric scores
  const riskScores: Record<string, number> = {
    minimal: 10,
    low: 25,
    moderate: 50,
    high: 75,
    very_high: 100,
  };

  const floodScore = riskScores[flood.riskLevel] ?? 25;

  // Hurricane risk level is inferred from wind zone
  let hurricaneScore = 10; // Default: minimal
  if (hurricane.windZone === 'zone_1') {
    hurricaneScore = 90;
  } else if (hurricane.windZone === 'zone_2') {
    hurricaneScore = 70;
  } else if (hurricane.windZone === 'zone_3') {
    hurricaneScore = 50;
  } else if (hurricane.windZone === 'zone_4') {
    hurricaneScore = 30;
  }

  // Take maximum risk and add bonus if both are elevated
  let combinedScore = Math.max(floodScore, hurricaneScore);
  if (floodScore >= 50 && hurricaneScore >= 50) {
    combinedScore = Math.min(100, combinedScore + 15); // Compound risk
  }

  // Map to combined risk level
  if (combinedScore >= 80) return 'severe';
  if (combinedScore >= 55) return 'high';
  if (combinedScore >= 30) return 'moderate';
  return 'low';
}

/**
 * Determine the primary water risk concern
 */
function determinePrimaryConcern(
  flood: FloodRiskAnalysis,
  hurricane: HurricaneRiskAnalysis
): PrimaryWaterConcern {
  const floodHighRisk = flood.riskLevel === 'high' || flood.riskLevel === 'very_high';
  const hurricaneHighRisk = hurricane.windZone === 'zone_1' || hurricane.windZone === 'zone_2';

  if (floodHighRisk && hurricaneHighRisk) return 'both';
  if (floodHighRisk) return 'flood';
  if (hurricaneHighRisk) return 'hurricane';
  return 'none';
}

/**
 * Calculate windstorm insurance estimate based on hurricane risk
 */
function calculateWindstormInsurance(
  hurricane: HurricaneRiskAnalysis,
  buildingValue: number
): number {
  if (!hurricane.windZone) {
    // No hurricane risk - minimal windstorm coverage needed
    return Math.round(buildingValue * 0.001);
  }

  // Rates based on wind zone
  let rate: number;
  switch (hurricane.windZone) {
    case 'zone_1':
      rate = 0.025; // 2.5% for highest risk
      break;
    case 'zone_2':
      rate = 0.015; // 1.5%
      break;
    case 'zone_3':
      rate = 0.008; // 0.8%
      break;
    case 'zone_4':
      rate = 0.004; // 0.4%
      break;
    default:
      rate = 0.002;
  }

  // Adjust for storm surge risk
  if (hurricane.stormSurgeZone && ['A', 'B'].includes(hurricane.stormSurgeZone)) {
    rate *= 1.25; // 25% surcharge for high surge risk
  }

  return Math.round(buildingValue * rate);
}

/**
 * Generate critical warnings that require immediate attention
 */
function generateCriticalWarnings(
  flood: FloodRiskAnalysis,
  hurricane: HurricaneRiskAnalysis
): string[] {
  const warnings: string[] = [];

  // Flood warnings
  if (flood.riskLevel === 'very_high') {
    warnings.push(
      `COASTAL FLOOD ZONE ${flood.zone}: Property subject to high-velocity wave action. ` +
        'Strictest building requirements apply. Insurance costs will be significantly elevated.'
    );
  } else if (flood.riskLevel === 'high') {
    warnings.push(
      `FLOOD ZONE ${flood.zone}: Property is in a Special Flood Hazard Area. ` +
        'Flood insurance is MANDATORY for federally-backed mortgages.'
    );
  }

  if (flood.floodwayStatus === 'in_floodway') {
    warnings.push(
      'REGULATORY FLOODWAY: Property is within the floodway. Development restrictions apply. ' +
        'Highest flood risk and insurance rates.'
    );
  }

  // Hurricane warnings
  if (hurricane.windZone === 'zone_1') {
    warnings.push(
      `EXTREME WIND ZONE: Design wind speed ${hurricane.maxWindSpeed ?? 130} mph. ` +
        'Impact-resistant construction required. High windstorm insurance costs.'
    );
  }

  if (hurricane.stormSurgeZone && ['A', 'B'].includes(hurricane.stormSurgeZone)) {
    warnings.push(
      `STORM SURGE ZONE ${hurricane.stormSurgeZone}: Property is in a storm surge inundation area. ` +
        `${hurricane.evacuationZone ?? 'Evacuation will likely be required during major hurricanes.'}`
    );
  }

  // Combined warnings
  if (
    flood.riskLevel === 'high' &&
    hurricane.stormSurgeZone &&
    ['A', 'B', 'C'].includes(hurricane.stormSurgeZone)
  ) {
    warnings.push(
      'DUAL WATER HAZARD: Property faces both riverine/coastal flood risk AND storm surge risk. ' +
        'Consider this carefully in investment analysis - insurance costs may be prohibitive.'
    );
  }

  return warnings;
}

/**
 * Generate combined recommendations from both analyses
 */
function generateCombinedRecommendations(
  flood: FloodRiskAnalysis,
  hurricane: HurricaneRiskAnalysis
): string[] {
  const recommendations: string[] = [];

  // Flood recommendations
  if (flood.insuranceRequired) {
    recommendations.push('Obtain flood insurance quote before closing');
    recommendations.push('Request elevation certificate from seller');
  }

  if (flood.riskLevel === 'high' || flood.riskLevel === 'very_high') {
    recommendations.push('Investigate LOMA/LOMR eligibility if structure appears above BFE');
    recommendations.push('Factor flood mitigation costs into rehab budget');
  }

  // Hurricane recommendations
  if (hurricane.windZone && ['zone_1', 'zone_2'].includes(hurricane.windZone)) {
    recommendations.push('Obtain wind mitigation inspection for insurance credits');
    recommendations.push('Budget for impact-resistant window/door installation');
    recommendations.push('Verify roof meets current wind code requirements');
  }

  if (hurricane.stormSurgeZone && ['A', 'B', 'C'].includes(hurricane.stormSurgeZone)) {
    recommendations.push('Understand evacuation requirements and routes');
    recommendations.push('Verify structure elevation relative to surge levels');
  }

  // General recommendations
  if (flood.insuranceRequired || hurricane.windZone === 'zone_1') {
    recommendations.push(
      'Consider total water-related insurance costs in investment analysis'
    );
  }

  return recommendations;
}

// ============================================
// Quick Analysis Functions
// ============================================

/**
 * Quick check if a property has significant water risk based on state and zone
 *
 * @param state - Two-letter state code
 * @param floodZone - FEMA flood zone code
 * @returns true if property has elevated water risk
 */
export function hasSignificantWaterRisk(state: string, floodZone: FEMAFloodZone): boolean {
  // High flood risk zones
  const highFloodRiskZones = ['A', 'AE', 'AH', 'AO', 'AR', 'A99', 'V', 'VE'];

  if (highFloodRiskZones.includes(floodZone.toUpperCase())) {
    return true;
  }

  // High hurricane risk states with coastal zones
  if (isHurricaneRiskState(state)) {
    const highHurricaneStates = ['FL', 'TX', 'LA', 'MS', 'AL'];
    if (highHurricaneStates.includes(state.toUpperCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Get a simple water risk summary string for display
 *
 * @param waterRisk - Complete water risk result
 * @returns Human-readable summary string
 */
export function getWaterRiskSummary(waterRisk: WaterRiskResult): string {
  const parts: string[] = [];

  // Flood zone summary
  parts.push(`Flood Zone ${waterRisk.flood.zone} (${waterRisk.flood.riskLevel} risk)`);

  // Hurricane summary if applicable
  if (waterRisk.hurricane.windZone) {
    parts.push(
      `Wind Zone ${waterRisk.hurricane.windZone.replace('_', ' ')} (${waterRisk.hurricane.maxWindSpeed ?? 'unknown'} mph)`
    );
  }

  // Insurance summary
  if (waterRisk.totalInsuranceCost > 0) {
    parts.push(`Est. insurance: $${waterRisk.totalInsuranceCost.toLocaleString()}/yr`);
  }

  return parts.join(' | ');
}
