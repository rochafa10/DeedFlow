/**
 * Flood Risk Analyzer
 *
 * Analyzes flood risk for properties using FEMA flood zone data.
 * Provides comprehensive flood risk assessment including insurance requirements,
 * premium estimates, and mitigation recommendations.
 *
 * @module lib/risk/water/flood-analyzer
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type {
  FloodRiskAnalysis,
  FloodMitigation,
  FEMAFloodZone,
  RiskLevel,
  DataSource,
} from '@/types/risk-analysis';

// ============================================
// FEMA Flood Zone Definitions
// ============================================

/**
 * Comprehensive FEMA flood zone definitions with risk characteristics
 *
 * Zones are categorized by risk level:
 * - Minimal Risk (Zone X, C): Outside 500-year floodplain
 * - Moderate Risk (Zone X500, B, D): 500-year floodplain or undetermined
 * - High Risk (Zone A, AE, AH, AO, AR, A99): 100-year floodplain (SFHA)
 * - Very High Risk (Zone V, VE): Coastal high-hazard with wave action
 */
export const FLOOD_ZONE_DEFINITIONS: Record<
  string,
  {
    riskLevel: RiskLevel;
    isSpecialFloodHazardArea: boolean;
    insuranceRequired: boolean;
    annualFloodProbability: number;
    description: string;
    detailedExplanation: string;
  }
> = {
  // Minimal Risk Zones
  X: {
    riskLevel: 'minimal',
    isSpecialFloodHazardArea: false,
    insuranceRequired: false,
    annualFloodProbability: 0.002,
    description: 'Area of minimal flood hazard',
    detailedExplanation:
      'Zone X (unshaded) represents areas outside the 0.2% annual chance floodplain (500-year flood). These areas have less than a 0.2% annual chance of flooding. While flood insurance is not required, about 25% of flood claims come from these low-risk areas.',
  },
  C: {
    riskLevel: 'minimal',
    isSpecialFloodHazardArea: false,
    insuranceRequired: false,
    annualFloodProbability: 0.002,
    description: 'Area of minimal flood hazard (older designation)',
    detailedExplanation:
      'Zone C is an older designation equivalent to Zone X (unshaded). It represents areas of minimal flood hazard outside the 500-year floodplain.',
  },

  // Moderate Risk Zones
  X500: {
    riskLevel: 'moderate',
    isSpecialFloodHazardArea: false,
    insuranceRequired: false,
    annualFloodProbability: 0.002,
    description: 'Area between 100-year and 500-year floodplain',
    detailedExplanation:
      'Zone X (shaded) or X500 represents the 0.2% annual chance flood hazard area (500-year flood). Properties have between 0.2% and 1% annual chance of flooding. Flood insurance is recommended but not required for federally-backed mortgages. Preferred Risk Policy (PRP) rates may be available.',
  },
  B: {
    riskLevel: 'moderate',
    isSpecialFloodHazardArea: false,
    insuranceRequired: false,
    annualFloodProbability: 0.002,
    description: 'Moderate flood hazard area (older designation)',
    detailedExplanation:
      'Zone B is an older designation equivalent to Zone X (shaded). It represents the area between the 100-year and 500-year flood levels, or areas protected by levees from 100-year floods.',
  },
  D: {
    riskLevel: 'moderate',
    isSpecialFloodHazardArea: false,
    insuranceRequired: false,
    annualFloodProbability: 0.005,
    description: 'Area with possible but undetermined flood hazard',
    detailedExplanation:
      'Zone D represents areas where flood hazards are undetermined but possible. No analysis has been performed. This is often found in areas being newly mapped or with limited data. A flood study is recommended before development.',
  },

  // High Risk Zones (SFHA)
  A: {
    riskLevel: 'high',
    isSpecialFloodHazardArea: true,
    insuranceRequired: true,
    annualFloodProbability: 0.01,
    description: 'High-risk zone, no BFE determined',
    detailedExplanation:
      'Zone A is a Special Flood Hazard Area (SFHA) with 1% annual chance of flooding (100-year flood). No Base Flood Elevation (BFE) has been determined. Flood insurance is MANDATORY for federally-backed mortgages. Over a 30-year mortgage, there is a 26% chance of flooding.',
  },
  AE: {
    riskLevel: 'high',
    isSpecialFloodHazardArea: true,
    insuranceRequired: true,
    annualFloodProbability: 0.01,
    description: 'High-risk zone with BFE determined',
    detailedExplanation:
      'Zone AE is a Special Flood Hazard Area where Base Flood Elevations (BFE) have been determined through detailed hydraulic analyses. Flood insurance is MANDATORY. Building must be elevated to or above BFE. This is the most common high-risk zone designation.',
  },
  AH: {
    riskLevel: 'high',
    isSpecialFloodHazardArea: true,
    insuranceRequired: true,
    annualFloodProbability: 0.01,
    description: 'High-risk zone with shallow flooding (1-3 feet)',
    detailedExplanation:
      'Zone AH represents areas with 1% annual chance of shallow flooding, usually ponding areas where flood depths are 1-3 feet. BFE is determined. Common around lakes, ponds, and low-lying areas without defined channels.',
  },
  AO: {
    riskLevel: 'high',
    isSpecialFloodHazardArea: true,
    insuranceRequired: true,
    annualFloodProbability: 0.01,
    description: 'High-risk zone with sheet flow (1-3 feet)',
    detailedExplanation:
      'Zone AO represents areas with 1% annual chance of shallow flooding with sheet flow on sloping terrain. Flood depths are typically 1-3 feet. Instead of BFE, flood depths are specified. Buildings must be elevated above the highest adjacent grade by the depth number.',
  },
  AR: {
    riskLevel: 'high',
    isSpecialFloodHazardArea: true,
    insuranceRequired: true,
    annualFloodProbability: 0.01,
    description: 'High-risk zone during levee restoration',
    detailedExplanation:
      'Zone AR represents areas with temporarily increased flood risk while a flood control system (like a levee) is being restored. Once restoration is complete, the zone may be revised. Properties face higher risk during this period.',
  },
  A99: {
    riskLevel: 'high',
    isSpecialFloodHazardArea: true,
    insuranceRequired: true,
    annualFloodProbability: 0.01,
    description: 'High-risk zone protected by levee under construction',
    detailedExplanation:
      'Zone A99 represents areas protected by a federal flood protection system under construction. The system must reach completion within a set timeframe. Once complete, the area may be remapped to a lower-risk zone.',
  },

  // Very High Risk Zones (Coastal)
  V: {
    riskLevel: 'very_high',
    isSpecialFloodHazardArea: true,
    insuranceRequired: true,
    annualFloodProbability: 0.01,
    description: 'Coastal high-hazard zone with wave action',
    detailedExplanation:
      'Zone V (Velocity) is a coastal Special Flood Hazard Area with additional hazards from storm-induced waves. Wave heights of 3 feet or more are expected. Structures must be elevated on pilings or columns. No BFE determined. This is the highest-risk coastal zone.',
  },
  VE: {
    riskLevel: 'very_high',
    isSpecialFloodHazardArea: true,
    insuranceRequired: true,
    annualFloodProbability: 0.01,
    description: 'Coastal high-hazard zone with BFE determined',
    detailedExplanation:
      'Zone VE is a coastal Special Flood Hazard Area where Base Flood Elevations have been determined. Subject to high-velocity wave action (waves 3+ feet). Strictest building requirements apply: structures must be on pilings/columns, no fill allowed, breakaway walls required below BFE. Insurance rates are highest in this zone.',
  },
};

// ============================================
// Flood Insurance Premium Calculator
// ============================================

/**
 * Calculate estimated annual flood insurance premium based on NFIP Risk Rating 2.0
 *
 * @param zone - FEMA flood zone code
 * @param buildingValue - Estimated building value in dollars
 * @param contentsValue - Optional contents value in dollars (default: 0)
 * @returns Estimated annual premium in dollars
 *
 * @example
 * ```typescript
 * const premium = calculateFloodInsurancePremium('AE', 200000, 50000);
 * // Returns estimated premium based on zone risk
 * ```
 */
export function calculateFloodInsurancePremium(
  zone: FEMAFloodZone,
  buildingValue: number,
  contentsValue: number = 0
): number {
  const zoneInfo = FLOOD_ZONE_DEFINITIONS[zone] ?? FLOOD_ZONE_DEFINITIONS['X'];

  // NFIP maximum coverage limits
  const maxBuildingCoverage = 250000;
  const maxContentsCoverage = 100000;

  const buildingCoverage = Math.min(buildingValue, maxBuildingCoverage);
  const contentsCoverage = Math.min(contentsValue, maxContentsCoverage);
  const totalCoverage = buildingCoverage + contentsCoverage;

  // If not in SFHA, use Preferred Risk Policy rates (much lower)
  if (!zoneInfo.isSpecialFloodHazardArea) {
    // PRP rates typically $400-800/year for low-risk zones
    if (zoneInfo.riskLevel === 'minimal') {
      return Math.max(totalCoverage * 0.002, 400);
    }
    // Moderate risk zones (X500, B, D)
    return Math.max(totalCoverage * 0.003, 500);
  }

  // SFHA zones - use Risk Rating 2.0 estimated rates
  let baseRate: number;

  switch (zone.toUpperCase()) {
    // Coastal V zones - highest rates
    case 'V':
    case 'VE':
      baseRate = 0.008; // ~0.8% of coverage
      break;

    // Standard A zones
    case 'A':
    case 'AE':
      baseRate = 0.004; // ~0.4% of coverage
      break;

    // Shallow flooding zones
    case 'AH':
    case 'AO':
      baseRate = 0.0035; // ~0.35% of coverage
      break;

    // Levee-related zones
    case 'AR':
    case 'A99':
      baseRate = 0.003; // ~0.3% of coverage
      break;

    default:
      baseRate = 0.004;
  }

  // Calculate premium with minimum thresholds
  const buildingPremium = Math.max(buildingCoverage * baseRate, 800);
  const contentsPremium = contentsCoverage > 0 ? Math.max(contentsCoverage * baseRate * 0.6, 200) : 0;

  return Math.round(buildingPremium + contentsPremium);
}

// ============================================
// Flood Risk Score Calculator
// ============================================

/**
 * Calculate flood risk score for the 125-point scoring system
 *
 * Scoring scale (0-5 points):
 * - 5/5: Zone X, C (minimal risk)
 * - 4/5: Zone X500, B (low-moderate risk)
 * - 3/5: Zone D (undetermined)
 * - 2/5: Zone A, AE, AH, AO, AR, A99 (high risk)
 * - 1/5: Zone V, VE (very high coastal risk)
 * - 0/5: V/VE with additional severe factors
 *
 * @param analysis - Complete flood risk analysis
 * @returns Score from 0 to 5
 */
export function getFloodRiskScore(analysis: FloodRiskAnalysis): number {
  const zone = analysis.zone.toUpperCase();
  const zoneInfo = FLOOD_ZONE_DEFINITIONS[zone] ?? FLOOD_ZONE_DEFINITIONS['X'];

  // Base score based on risk level
  let score: number;
  switch (zoneInfo.riskLevel) {
    case 'minimal':
      score = 5.0;
      break;
    case 'low':
      score = 4.0;
      break;
    case 'moderate':
      // Zone D (undetermined) gets a neutral score
      score = zone === 'D' ? 2.5 : 3.0;
      break;
    case 'high':
      score = 1.0;
      break;
    case 'very_high':
      score = 0.0;
      break;
    default:
      score = 2.5; // Neutral for unknown
  }

  // Adjustments based on additional factors

  // Positive adjustments
  if (analysis.elevationDifference !== null && analysis.elevationDifference > 2) {
    // Property is well above BFE - reduce risk
    score = Math.min(5.0, score + 0.5);
  }

  // Negative adjustments
  if (analysis.floodwayStatus === 'in_floodway') {
    // In the regulatory floodway - higher risk
    score = Math.max(0, score - 0.5);
  }

  if (analysis.historicalFlooding && analysis.historicalFlooding.count > 3) {
    // Multiple historical flood events
    score = Math.max(0, score - 0.25);
  }

  // Round to 2 decimal places
  return Math.round(score * 100) / 100;
}

// ============================================
// Mitigation Generator
// ============================================

/**
 * Generate flood mitigation recommendations based on zone and property characteristics
 *
 * @param zone - FEMA flood zone code
 * @param baseFloodElevation - BFE in feet if available
 * @param propertyElevation - Property elevation if available
 * @returns Array of mitigation recommendations
 */
function generateFloodMitigations(
  zone: FEMAFloodZone,
  baseFloodElevation?: number | null,
  propertyElevation?: number | null
): FloodMitigation[] {
  const mitigations: FloodMitigation[] = [];
  const zoneInfo = FLOOD_ZONE_DEFINITIONS[zone] ?? FLOOD_ZONE_DEFINITIONS['X'];

  // If in SFHA, add elevation and structural mitigations
  if (zoneInfo.isSpecialFloodHazardArea) {
    // Elevation is the most effective mitigation
    mitigations.push({
      riskType: 'flood',
      action: 'Elevate structure above Base Flood Elevation (BFE)',
      estimatedCost: { min: 30000, max: 150000 },
      effectiveness: 'very_high',
      timeframe: '3-6 months',
      insuranceImpact: 'Can reduce flood insurance premium by 50-90%',
      priority: 'recommended',
      bfeElevationGain: 2,
    });

    // Flood vents
    mitigations.push({
      riskType: 'flood',
      action: 'Install engineered flood vents in foundation',
      estimatedCost: { min: 500, max: 2500 },
      effectiveness: 'moderate',
      timeframe: '1-2 days',
      insuranceImpact: 'May qualify for lower NFIP rates',
      priority: 'recommended',
    });

    // Dry floodproofing
    mitigations.push({
      riskType: 'flood',
      action: 'Dry floodproof exterior walls (sealants, shields)',
      estimatedCost: { min: 3000, max: 15000 },
      effectiveness: 'moderate',
      timeframe: '1-2 weeks',
      insuranceImpact: 'Only applicable for non-residential or pre-FIRM buildings',
      priority: 'optional',
    });

    // LOMA application
    mitigations.push({
      riskType: 'flood',
      action: 'Apply for Letter of Map Amendment (LOMA) if structure is above BFE',
      estimatedCost: { min: 500, max: 2000 },
      effectiveness: 'very_high',
      timeframe: '60-90 days',
      insuranceImpact: 'If approved, removes mandatory flood insurance requirement',
      priority: 'recommended',
    });
  }

  // Coastal V zones require additional mitigations
  if (zone.toUpperCase().startsWith('V')) {
    mitigations.push({
      riskType: 'flood',
      action: 'Install breakaway walls below elevated floor',
      estimatedCost: { min: 5000, max: 20000 },
      effectiveness: 'high',
      timeframe: '2-4 weeks',
      insuranceImpact: 'Required for V-zone compliance',
      priority: 'critical',
    });
  }

  // General recommendations for all zones
  mitigations.push({
    riskType: 'flood',
    action: 'Install sump pump with battery backup',
    estimatedCost: { min: 1000, max: 3000 },
    effectiveness: 'moderate',
    timeframe: '1-2 days',
    priority: zoneInfo.isSpecialFloodHazardArea ? 'recommended' : 'optional',
  });

  return mitigations;
}

// ============================================
// Main Flood Risk Analyzer
// ============================================

/**
 * Analyze flood risk for a property based on coordinates and flood zone data
 *
 * @param coordinates - Property latitude and longitude
 * @param floodZoneData - FEMA flood zone data (typically from API or database)
 * @returns Comprehensive flood risk analysis
 *
 * @example
 * ```typescript
 * const analysis = analyzeFloodRisk(
 *   { latitude: 40.7128, longitude: -74.0060 },
 *   { zone: 'AE', baseFloodElevation: 12 }
 * );
 * ```
 */
export function analyzeFloodRisk(
  coordinates: { latitude: number; longitude: number },
  floodZoneData: {
    zone: FEMAFloodZone;
    baseFloodElevation?: number | null;
    propertyElevation?: number | null;
    floodwayStatus?: 'in_floodway' | 'in_fringe' | 'outside' | null;
    historicalFlooding?: {
      count: number;
      lastDate: Date | null;
      avgDamage: number | null;
    } | null;
  }
): FloodRiskAnalysis {
  // Normalize zone code
  const zone = floodZoneData.zone.toUpperCase() as FEMAFloodZone;

  // Get zone definition (default to X if unknown)
  const zoneInfo = FLOOD_ZONE_DEFINITIONS[zone] ?? FLOOD_ZONE_DEFINITIONS['X'];

  // Calculate elevation difference if both elevations are available
  const elevationDifference =
    floodZoneData.baseFloodElevation !== null &&
    floodZoneData.baseFloodElevation !== undefined &&
    floodZoneData.propertyElevation !== null &&
    floodZoneData.propertyElevation !== undefined
      ? floodZoneData.propertyElevation - floodZoneData.baseFloodElevation
      : null;

  // Estimate insurance premium (using $150,000 as default building value)
  // In production, this would use actual property value
  const estimatedPremium = zoneInfo.insuranceRequired
    ? calculateFloodInsurancePremium(zone, 150000)
    : null;

  // Generate mitigation recommendations
  const mitigations = generateFloodMitigations(
    zone,
    floodZoneData.baseFloodElevation,
    floodZoneData.propertyElevation
  );

  // Create mitigation recommendation strings
  const mitigationRecommendations = mitigations
    .filter((m) => m.priority !== 'optional')
    .map((m) => m.action);

  // Calculate confidence based on data availability
  let confidence = 70; // Base confidence
  if (floodZoneData.baseFloodElevation !== null && floodZoneData.baseFloodElevation !== undefined) {
    confidence += 15; // BFE increases confidence
  }
  if (floodZoneData.propertyElevation !== null && floodZoneData.propertyElevation !== undefined) {
    confidence += 10; // Property elevation increases confidence
  }
  if (floodZoneData.historicalFlooding) {
    confidence += 5; // Historical data increases confidence
  }

  // Data source information
  const dataSource: DataSource = {
    name: 'FEMA National Flood Hazard Layer (NFHL)',
    type: floodZoneData.zone ? 'api' : 'estimated',
    url: 'https://hazards.fema.gov/gis/nfhl/rest/services',
    reliability: floodZoneData.zone ? 'high' : 'medium',
  };

  return {
    zone,
    zoneDescription: zoneInfo.description,
    riskLevel: zoneInfo.riskLevel,
    insuranceRequired: zoneInfo.insuranceRequired,
    annualPremiumEstimate: estimatedPremium,
    baseFloodElevation: floodZoneData.baseFloodElevation ?? null,
    propertyElevation: floodZoneData.propertyElevation ?? null,
    elevationDifference,
    floodwayStatus: floodZoneData.floodwayStatus ?? null,
    historicalFlooding: floodZoneData.historicalFlooding ?? null,
    mitigationRecommendations,
    dataSource,
    confidence: Math.min(100, confidence),
  };
}

/**
 * Create a default/unknown flood risk analysis when no data is available
 *
 * Used when flood zone data cannot be retrieved. Returns a neutral assessment
 * with appropriate confidence level.
 *
 * @param coordinates - Property coordinates for reference
 * @returns Flood risk analysis with neutral/unknown values
 */
export function createUnknownFloodRisk(coordinates: {
  latitude: number;
  longitude: number;
}): FloodRiskAnalysis {
  return analyzeFloodRisk(coordinates, {
    zone: 'D', // Undetermined
    baseFloodElevation: null,
    propertyElevation: null,
    floodwayStatus: null,
    historicalFlooding: null,
  });
}
