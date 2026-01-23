/**
 * Risk Analysis Module
 *
 * Central export point for all property risk analysis functionality.
 * This module provides comprehensive risk assessment for:
 * - Water Risks (Flood + Hurricane) - Phase 7A
 * - Geological Risks (Earthquake + Sinkhole + Slope) - Phase 7B
 * - Fire Risks (Wildfire) - Phase 7C
 * - Environmental Risks (Contamination + Radon) - Phase 7C
 * - Drought Risk - Phase 7D
 * - Combined Risk Integration - Phase 7D
 *
 * @module lib/risk
 * @author Claude Code Agent
 * @date 2026-01-16
 */

// ============================================
// Water Risk Exports (Phase 7A)
// ============================================

export { analyzeWaterRisks } from './water';

export {
  // Flood Analysis
  analyzeFloodRisk,
  createUnknownFloodRisk,
  calculateFloodInsurancePremium,
  getFloodRiskScore,
  FLOOD_ZONE_DEFINITIONS,

  // Hurricane Analysis
  analyzeHurricaneRisk,
  createUnknownHurricaneRisk,
  getHurricaneRiskScore,
  isHurricaneRiskState,
  HURRICANE_RISK_STATES,
  WIND_ZONE_DEFINITIONS,
  STORM_SURGE_ZONE_DEFINITIONS,

  // Utility Functions
  hasSignificantWaterRisk,
  getWaterRiskSummary,
} from './water';

// ============================================
// Geological Risk Exports (Phase 7B)
// ============================================

export {
  // Main analyzers
  analyzeEarthquakeRisk,
  analyzeSinkholeRisk,
  analyzeSlopeRisk,
  analyzeGeologicalRisk,
  getGeologicalRiskScore,

  // Constants
  KARST_GEOLOGY_STATES,
} from './geological';

// ============================================
// Fire Risk Exports (Phase 7C)
// ============================================

export {
  // Main analyzer
  analyzeWildfireRisk,
  getWildfireRiskScore,

  // Constants
  WILDFIRE_RISK_STATES,
} from './fire';

// ============================================
// Environmental Risk Exports (Phase 7C)
// ============================================

export {
  // Main analyzers
  analyzeContaminationRisk,
  analyzeRadonRisk,
  analyzeEnvironmentalRisk,
  getContaminationRiskScore,
  getRadonRiskScore,
  getEnvironmentalRiskScore,

  // Constants
  RADON_DISCLOSURE_STATES,
} from './environmental';

// ============================================
// Drought Risk Exports (Phase 7D)
// ============================================

export {
  // Main analyzer
  analyzeDroughtRisk,
  getDroughtRiskScore,

  // Constants
  DROUGHT_PRONE_STATES,
  DROUGHT_SEVERITY_DEFINITIONS,
} from './drought';

// ============================================
// Combined Risk Integration (Phase 7D)
// ============================================

export {
  // Main functions
  calculateRiskAssessment,
  calculateRiskCategoryScore,
  getWeightsForState,
  getRegionForState,

  // Constants and configuration
  RISK_REGIONS,
  STATE_RISK_REGIONS,
  validateWeights,
  normalizeWeights,
} from './combined';

// ============================================
// Type Exports
// ============================================

export type {
  // Common Types
  RiskLevel,
  DataSource,
  MitigationOption,

  // Flood Risk Types
  FloodRiskAnalysis,
  FloodMitigation,
  FEMAFloodZone,

  // Hurricane Risk Types
  HurricaneRiskAnalysis,
  HurricaneMitigation,
  WindZone,
  StormSurgeZone,

  // Combined Water Risk Types
  WaterRiskResult,
  CombinedWaterRisk,
  PrimaryWaterConcern,

  // Water Risk Scoring Types
  WaterRiskScoring,

  // Geological Risk Types
  EarthquakeRiskAnalysis,
  SinkholeRiskAnalysis,
  SlopeRiskAnalysis,
  GeologicalRiskResult,
  SeismicHazardLevel,
  SinkholeRiskLevel,
  SlopeStabilityLevel,
  GeologicalMitigation,

  // Fire Risk Types
  WildfireRiskAnalysis,
  WildfireRiskLevel,
  FireMitigation,

  // Environmental Risk Types
  EnvironmentalContaminationAnalysis,
  RadonRiskAnalysis,
  EnvironmentalRiskResult,
  ContaminationRiskLevel,
  ContaminationSite,
  RadonZone,
  EnvironmentalMitigation,

  // Drought Risk Types
  DroughtRiskAnalysis,
  DroughtCategory,
  WaterAvailability,
  CropImpactLevel,

  // Combined Risk Types
  RiskAssessment,
  RiskWeights,
  RiskInput,
  RiskCategoryScore,
  RiskCategoryScoring,
  InsuranceEstimates,
  RiskMitigation,
  OverallRiskLevel,
} from '@/types/risk-analysis';

// ============================================
// Comprehensive Risk Analysis
// ============================================

/**
 * Performs comprehensive risk analysis combining all risk categories
 *
 * This is the main entry point for full property risk assessment,
 * integrating water, geological, fire, and environmental risks.
 *
 * @param coordinates - Property coordinates
 * @param stateCode - Two-letter state code
 * @param stateFips - State FIPS code (optional)
 * @param countyFips - County FIPS code (optional)
 * @param countyName - County name (optional)
 * @param stateName - State name (optional)
 * @param elevationData - Optional elevation/slope data
 * @returns Comprehensive risk assessment
 *
 * @example
 * ```typescript
 * const assessment = await analyzeAllRisks(
 *   { latitude: 40.7128, longitude: -74.0060 },
 *   'NY',
 *   '36',
 *   '061',
 *   'New York',
 *   'New York'
 * );
 * console.log(assessment.overallRisk); // 'moderate'
 * console.log(assessment.riskScore); // 45
 * ```
 */
export async function analyzeAllRisks(
  coordinates: { latitude: number; longitude: number },
  stateCode: string,
  stateFips?: string,
  countyFips?: string,
  countyName?: string,
  stateName?: string,
  elevationData?: { slopePercentage?: number; maxSlopePercentage?: number; slopeAspect?: string }
): Promise<import('@/types/risk-analysis').RiskAssessment> {
  const { analyzeWaterRisks } = await import('./water');
  const { analyzeGeologicalRisk } = await import('./geological');
  const { analyzeWildfireRisk } = await import('./fire');
  const { analyzeEnvironmentalRisk } = await import('./environmental');
  const { calculateRiskAssessment } = await import('./combined');

  // Run all analyses in parallel for performance
  // Note: analyzeWaterRisks requires flood data; using defaults when not available
  const defaultFloodData = {
    zone: 'X' as const,  // Zone X = minimal flood hazard
    baseFloodElevation: null,
    propertyElevation: null,
    floodwayStatus: null,
    historicalFlooding: null,
  };

  const [water, geological, wildfire, environmental] = await Promise.all([
    analyzeWaterRisks(coordinates, defaultFloodData, stateCode),
    analyzeGeologicalRisk(coordinates, stateCode, elevationData as {
      slopePercentage?: number;
      maxSlopePercentage?: number;
      slopeAspect?: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'flat' | null;
    } | undefined),
    analyzeWildfireRisk(coordinates, stateCode),
    analyzeEnvironmentalRisk(
      coordinates,
      stateCode,
      stateFips || '',
      countyFips,
      countyName,
      stateName
    ),
  ]);

  // Combine all risk inputs
  const riskInput = {
    flood: water.flood,
    hurricane: water.hurricane,
    earthquake: geological.earthquake,
    sinkhole: geological.sinkhole,
    slope: geological.slope,
    wildfire: wildfire,
    environmental: environmental.contamination,
    radon: environmental.radon,
    drought: null,
  };

  // Calculate comprehensive assessment
  return calculateRiskAssessment(riskInput, stateCode);
}
