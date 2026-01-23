/**
 * Hurricane Risk Analyzer
 *
 * Analyzes hurricane risk for properties based on location, wind zones,
 * storm surge exposure, and historical hurricane activity.
 *
 * @module lib/risk/water/hurricane-analyzer
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type {
  HurricaneRiskAnalysis,
  HurricaneMitigation,
  WindZone,
  StormSurgeZone,
  RiskLevel,
  DataSource,
} from '@/types/risk-analysis';

// ============================================
// States with Hurricane Risk
// ============================================

/**
 * States with significant hurricane exposure
 *
 * High Risk: Direct Gulf/Atlantic coastal exposure with frequent hurricanes
 * Moderate Risk: Coastal states with less frequent but possible hurricane impacts
 * Low Risk: States that may experience remnants but rarely direct impacts
 */
export const HURRICANE_RISK_STATES = {
  /**
   * High-risk coastal states with frequent hurricane impacts
   */
  HIGH_RISK: ['FL', 'TX', 'LA', 'MS', 'AL'] as const,

  /**
   * Moderate-risk coastal states with periodic hurricane impacts
   */
  MODERATE_RISK: ['GA', 'SC', 'NC', 'VA', 'MD', 'DE', 'NJ', 'NY', 'CT', 'RI', 'MA'] as const,

  /**
   * All states that may experience some hurricane impacts
   */
  ALL_EXPOSED: [
    'FL', 'TX', 'LA', 'MS', 'AL',
    'GA', 'SC', 'NC', 'VA', 'MD',
    'DE', 'NJ', 'NY', 'CT', 'RI', 'MA',
  ] as const,
};

// Type helper for hurricane risk states
type HurricaneRiskState = typeof HURRICANE_RISK_STATES.ALL_EXPOSED[number];

// ============================================
// Wind Zone Definitions
// ============================================

/**
 * Wind zone definitions based on ASCE 7 and building codes
 *
 * Wind zones determine design wind speed requirements for structures.
 * Higher zones require more robust construction to withstand hurricane-force winds.
 */
export const WIND_ZONE_DEFINITIONS: Record<
  string,
  {
    description: string;
    maxWindSpeed: number;
    riskLevel: RiskLevel;
    buildingRequirements: string[];
  }
> = {
  zone_1: {
    description: 'Extreme wind zone (South Florida, Gulf Coast)',
    maxWindSpeed: 130,
    riskLevel: 'very_high',
    buildingRequirements: [
      'Impact-resistant windows/shutters required',
      'Roof-to-wall connectors (hurricane straps) required',
      'Wind-rated garage doors required',
      'Secondary water resistance for roof required',
      'Reinforced concrete block or equivalent construction',
    ],
  },
  zone_2: {
    description: 'High wind zone (Coastal areas)',
    maxWindSpeed: 120,
    riskLevel: 'high',
    buildingRequirements: [
      'Impact-resistant windows/shutters recommended',
      'Roof-to-wall connectors required',
      'Wind-rated garage doors required',
      'Enhanced roof attachment required',
    ],
  },
  zone_3: {
    description: 'Moderate wind zone (Inland coastal)',
    maxWindSpeed: 110,
    riskLevel: 'moderate',
    buildingRequirements: [
      'Storm shutters recommended',
      'Roof-to-wall connectors recommended',
      'Standard enhanced wind construction',
    ],
  },
  zone_4: {
    description: 'Standard wind zone (Further inland)',
    maxWindSpeed: 100,
    riskLevel: 'low',
    buildingRequirements: [
      'Standard construction adequate',
      'Basic wind resistance features',
    ],
  },
};

// ============================================
// Storm Surge Zone Definitions
// ============================================

/**
 * Storm surge evacuation zone definitions
 *
 * Zones indicate the hurricane category at which flooding from storm surge
 * is expected. Zone A floods first (Category 1), Zone E floods last (Category 5).
 */
export const STORM_SURGE_ZONE_DEFINITIONS: Record<
  string,
  {
    description: string;
    floodingCategory: number;
    evacuationRequired: 'mandatory' | 'recommended' | 'possible';
    riskLevel: RiskLevel;
  }
> = {
  A: {
    description: 'Category 1 storm surge inundation - Highest risk, evacuate early',
    floodingCategory: 1,
    evacuationRequired: 'mandatory',
    riskLevel: 'very_high',
  },
  B: {
    description: 'Category 2 storm surge inundation - High risk, mandatory evacuation likely',
    floodingCategory: 2,
    evacuationRequired: 'mandatory',
    riskLevel: 'high',
  },
  C: {
    description: 'Category 3 storm surge inundation - Moderate-high risk, evacuation recommended',
    floodingCategory: 3,
    evacuationRequired: 'recommended',
    riskLevel: 'high',
  },
  D: {
    description: 'Category 4 storm surge inundation - Moderate risk, may need to evacuate',
    floodingCategory: 4,
    evacuationRequired: 'possible',
    riskLevel: 'moderate',
  },
  E: {
    description: 'Category 5 storm surge inundation - Lower risk but possible during major storms',
    floodingCategory: 5,
    evacuationRequired: 'possible',
    riskLevel: 'low',
  },
};

// ============================================
// Hurricane Risk Score Calculator
// ============================================

/**
 * Calculate hurricane risk score for the 125-point scoring system
 *
 * Scoring scale (0-5 points):
 * - 5/5: No hurricane exposure (inland, non-coastal state)
 * - 4/5: Zone 4 wind zone, no storm surge risk
 * - 3/5: Zone 3 wind zone or minor storm surge risk
 * - 2/5: Zone 2 wind zone or moderate storm surge risk
 * - 1/5: Zone 1 wind zone (high hurricane zone)
 * - 0/5: Zone 1 + Storm Surge Zone A/B (extreme combined risk)
 *
 * @param analysis - Complete hurricane risk analysis
 * @returns Score from 0 to 5
 */
export function getHurricaneRiskScore(analysis: HurricaneRiskAnalysis): number {
  // If not in a hurricane zone, return maximum score
  if (!analysis.windZone) {
    return 5.0;
  }

  // Base score based on wind zone
  let score: number;
  switch (analysis.windZone) {
    case 'zone_4':
      score = 4.0;
      break;
    case 'zone_3':
      score = 3.0;
      break;
    case 'zone_2':
      score = 2.0;
      break;
    case 'zone_1':
      score = 1.0;
      break;
    default:
      score = 2.5; // Neutral for unknown
  }

  // Adjust for storm surge risk
  if (analysis.stormSurgeZone) {
    const surgeInfo = STORM_SURGE_ZONE_DEFINITIONS[analysis.stormSurgeZone];
    if (surgeInfo) {
      switch (analysis.stormSurgeZone) {
        case 'A':
          score = Math.max(0, score - 1.0);
          break;
        case 'B':
          score = Math.max(0, score - 0.75);
          break;
        case 'C':
          score = Math.max(0, score - 0.5);
          break;
        case 'D':
          score = Math.max(0, score - 0.25);
          break;
        case 'E':
          // Minimal impact
          break;
      }
    }
  }

  // Adjust for historical storm activity
  if (analysis.historicalStorms && analysis.historicalStorms.count > 10) {
    score = Math.max(0, score - 0.25);
  }

  // Round to 2 decimal places and ensure within bounds
  return Math.max(0, Math.min(5, Math.round(score * 100) / 100));
}

// ============================================
// Wind Zone Determination
// ============================================

/**
 * Determine wind zone based on state, distance to coast, and latitude
 *
 * @param state - Two-letter state code
 * @param distanceToCoast - Distance from coast in miles (optional)
 * @param latitude - Property latitude (optional, for FL zone determination)
 * @returns Wind zone classification
 */
function determineWindZone(
  state: string,
  distanceToCoast?: number | null,
  latitude?: number | null
): WindZone {
  const stateUpper = state.toUpperCase();

  // Check if state has hurricane exposure
  if (!isHurricaneRiskState(stateUpper)) {
    return null; // No hurricane risk
  }

  // Default distance assumption if not provided
  const distance = distanceToCoast ?? 100;

  // South Florida - High Velocity Hurricane Zone (most stringent)
  // Below approximately latitude 27 (roughly from Tampa/Fort Pierce southward)
  if (stateUpper === 'FL' && latitude !== null && latitude !== undefined && latitude < 27) {
    return 'zone_1';
  }

  // Florida coastal areas
  if (stateUpper === 'FL') {
    if (distance < 10) return 'zone_1';
    if (distance < 30) return 'zone_2';
    if (distance < 60) return 'zone_3';
    return 'zone_4';
  }

  // Gulf Coast states (TX, LA, MS, AL)
  if (['TX', 'LA', 'MS', 'AL'].includes(stateUpper)) {
    if (distance < 15) return 'zone_2';
    if (distance < 40) return 'zone_3';
    if (distance < 80) return 'zone_4';
    return null; // Far inland, minimal risk
  }

  // Southeast Atlantic Coast (GA, SC, NC)
  if (['GA', 'SC', 'NC'].includes(stateUpper)) {
    if (distance < 15) return 'zone_2';
    if (distance < 40) return 'zone_3';
    if (distance < 75) return 'zone_4';
    return null;
  }

  // Mid-Atlantic (VA, MD, DE, NJ)
  if (['VA', 'MD', 'DE', 'NJ'].includes(stateUpper)) {
    if (distance < 20) return 'zone_3';
    if (distance < 50) return 'zone_4';
    return null;
  }

  // Northeast (NY, CT, RI, MA)
  if (['NY', 'CT', 'RI', 'MA'].includes(stateUpper)) {
    if (distance < 15) return 'zone_4';
    return null;
  }

  return null; // Default: no hurricane zone
}

/**
 * Estimate storm surge zone based on distance to coast
 *
 * This is a simplified estimation. In production, this would use
 * NOAA SLOSH model data for accurate surge zone determination.
 *
 * @param distanceToCoast - Distance from coast in miles
 * @param state - Two-letter state code
 * @returns Storm surge zone or null if not in surge risk area
 */
function estimateStormSurgeZone(
  distanceToCoast: number | null | undefined,
  state: string
): StormSurgeZone {
  const stateUpper = state.toUpperCase();

  // Only coastal states have storm surge risk
  if (!isHurricaneRiskState(stateUpper)) {
    return null;
  }

  // If no distance available, assume not in surge zone
  if (distanceToCoast === null || distanceToCoast === undefined) {
    return null;
  }

  // South Florida and Gulf Coast - higher surge risk
  if (['FL', 'TX', 'LA', 'MS', 'AL'].includes(stateUpper)) {
    if (distanceToCoast < 1) return 'A';
    if (distanceToCoast < 3) return 'B';
    if (distanceToCoast < 8) return 'C';
    if (distanceToCoast < 15) return 'D';
    if (distanceToCoast < 25) return 'E';
    return null;
  }

  // Atlantic Coast
  if (['GA', 'SC', 'NC', 'VA', 'MD', 'DE', 'NJ', 'NY'].includes(stateUpper)) {
    if (distanceToCoast < 1) return 'B';
    if (distanceToCoast < 5) return 'C';
    if (distanceToCoast < 12) return 'D';
    if (distanceToCoast < 20) return 'E';
    return null;
  }

  return null;
}

// ============================================
// Mitigation Generator
// ============================================

/**
 * Generate hurricane mitigation recommendations
 *
 * @param windZone - Wind zone classification
 * @param stormSurgeZone - Storm surge zone if applicable
 * @param state - Two-letter state code
 * @returns Array of mitigation recommendations
 */
function generateHurricaneMitigations(
  windZone: WindZone,
  stormSurgeZone: StormSurgeZone,
  state: string
): HurricaneMitigation[] {
  const mitigations: HurricaneMitigation[] = [];

  // If no hurricane risk, minimal mitigations needed
  if (!windZone) {
    return mitigations;
  }

  const zoneInfo = WIND_ZONE_DEFINITIONS[windZone];
  const isHighRisk = windZone === 'zone_1' || windZone === 'zone_2';

  // Impact-resistant windows (critical for high-risk zones)
  if (isHighRisk) {
    mitigations.push({
      riskType: 'hurricane',
      action: 'Install impact-resistant windows and doors (Large Missile certified)',
      estimatedCost: { min: 10000, max: 40000 },
      effectiveness: 'very_high',
      timeframe: '1-2 weeks',
      insuranceImpact: 'Up to 45% discount on windstorm insurance in FL',
      priority: 'critical',
      windRatingImprovement: 'Large Missile Impact Certified',
    });
  }

  // Roof-to-wall connectors (important for all hurricane zones)
  mitigations.push({
    riskType: 'hurricane',
    action: 'Install roof-to-wall connectors (hurricane clips/straps)',
    estimatedCost: { min: 2000, max: 10000 },
    effectiveness: 'very_high',
    timeframe: '2-5 days',
    insuranceImpact: 'Major insurance discount factor',
    priority: windZone === 'zone_4' ? 'recommended' : 'critical',
    windRatingImprovement: 'Roof-to-Wall Connection Upgrade',
  });

  // Reinforced garage door
  mitigations.push({
    riskType: 'hurricane',
    action: 'Install wind-rated garage door or garage door bracing kit',
    estimatedCost: { min: 500, max: 3000 },
    effectiveness: 'high',
    timeframe: '1 day',
    insuranceImpact: 'Garage doors are a common failure point in hurricanes',
    priority: isHighRisk ? 'critical' : 'recommended',
  });

  // Roof upgrade (for moderate and high risk zones)
  if (windZone !== 'zone_4') {
    mitigations.push({
      riskType: 'hurricane',
      action: 'Upgrade to wind-rated roofing (120+ mph rating)',
      estimatedCost: { min: 8000, max: 25000 },
      effectiveness: 'very_high',
      timeframe: '1-2 weeks',
      insuranceImpact: 'Secondary water resistance credit available',
      priority: 'recommended',
      windRatingImprovement: 'FBC-rated roof covering',
    });
  }

  // Storm shutters (if not using impact windows)
  mitigations.push({
    riskType: 'hurricane',
    action: 'Install storm shutters (accordion, roll-down, or panel)',
    estimatedCost: { min: 3000, max: 15000 },
    effectiveness: 'high',
    timeframe: '1-3 days',
    insuranceImpact: 'Opening protection credit on insurance',
    priority: isHighRisk ? 'recommended' : 'optional',
  });

  // Storm surge mitigations
  if (stormSurgeZone && ['A', 'B', 'C'].includes(stormSurgeZone)) {
    mitigations.push({
      riskType: 'hurricane',
      action: 'Elevate structure above storm surge level',
      estimatedCost: { min: 50000, max: 200000 },
      effectiveness: 'very_high',
      timeframe: '2-6 months',
      insuranceImpact: 'Significant flood insurance reduction',
      priority: 'critical',
    });

    mitigations.push({
      riskType: 'hurricane',
      action: 'Install flood vents in enclosures below elevated floor',
      estimatedCost: { min: 500, max: 2000 },
      effectiveness: 'moderate',
      timeframe: '1 day',
      priority: 'critical',
    });
  }

  // Whole-house generator (recommended for all hurricane zones)
  mitigations.push({
    riskType: 'hurricane',
    action: 'Install whole-house generator for extended power outages',
    estimatedCost: { min: 5000, max: 15000 },
    effectiveness: 'moderate',
    timeframe: '1-2 days',
    priority: 'recommended',
  });

  return mitigations;
}

// ============================================
// Main Hurricane Risk Analyzer
// ============================================

/**
 * Analyze hurricane risk for a property based on location and state
 *
 * @param coordinates - Property latitude and longitude
 * @param state - Two-letter state code
 * @param additionalData - Optional additional data for more accurate analysis
 * @returns Comprehensive hurricane risk analysis
 *
 * @example
 * ```typescript
 * const analysis = analyzeHurricaneRisk(
 *   { latitude: 25.7617, longitude: -80.1918 },
 *   'FL',
 *   { distanceToCoast: 2 }
 * );
 * ```
 */
export function analyzeHurricaneRisk(
  coordinates: { latitude: number; longitude: number },
  state: string,
  additionalData?: {
    distanceToCoast?: number | null;
    historicalStorms?: {
      count: number;
      significantStorms: string[];
    } | null;
  }
): HurricaneRiskAnalysis {
  const stateUpper = state.toUpperCase();

  // Determine wind zone
  const windZone = determineWindZone(
    stateUpper,
    additionalData?.distanceToCoast,
    coordinates.latitude
  );

  // Get wind zone info if applicable
  const windZoneInfo = windZone ? WIND_ZONE_DEFINITIONS[windZone] : null;

  // Estimate storm surge zone
  const stormSurgeZone = estimateStormSurgeZone(
    additionalData?.distanceToCoast,
    stateUpper
  );
  const surgeZoneInfo = stormSurgeZone
    ? STORM_SURGE_ZONE_DEFINITIONS[stormSurgeZone]
    : null;

  // Generate building code requirements
  const buildingCodeRequirements = windZoneInfo?.buildingRequirements ?? [];

  // Generate insurance considerations
  const insuranceConsiderations: string[] = [];
  if (windZone === 'zone_1' || windZone === 'zone_2') {
    insuranceConsiderations.push(
      'Windstorm insurance may be required separately from homeowners policy'
    );
    insuranceConsiderations.push(
      'Wind mitigation inspection can significantly reduce premiums'
    );
  }
  if (stormSurgeZone && ['A', 'B', 'C'].includes(stormSurgeZone)) {
    insuranceConsiderations.push(
      'Flood insurance MANDATORY for federally-backed mortgages in surge zone'
    );
  }
  if (stateUpper === 'FL') {
    insuranceConsiderations.push(
      'Citizens Property Insurance available if private coverage unavailable'
    );
    insuranceConsiderations.push(
      'Wind mitigation credits up to 45% available in Florida'
    );
  }

  // Determine evacuation zone based on storm surge
  const evacuationZone = stormSurgeZone
    ? `Zone ${stormSurgeZone} - ${surgeZoneInfo?.evacuationRequired ?? 'possible'} evacuation`
    : null;

  // Generate mitigations
  const mitigations = generateHurricaneMitigations(windZone, stormSurgeZone, stateUpper);

  // Calculate confidence
  let confidence = 65; // Base confidence
  if (additionalData?.distanceToCoast !== null && additionalData?.distanceToCoast !== undefined) {
    confidence += 20; // Distance data increases confidence significantly
  }
  if (additionalData?.historicalStorms) {
    confidence += 10;
  }
  // State-level data is always available
  confidence += 5;

  // Data source
  const dataSource: DataSource = {
    name: 'NOAA/NHC Hurricane Data',
    type: additionalData?.distanceToCoast !== null ? 'calculated' : 'estimated',
    url: 'https://www.nhc.noaa.gov',
    reliability: additionalData?.distanceToCoast !== null ? 'high' : 'medium',
  };

  return {
    windZone,
    windZoneDescription: windZoneInfo?.description ?? null,
    maxWindSpeed: windZoneInfo?.maxWindSpeed ?? null,
    stormSurgeZone,
    stormSurgeDescription: surgeZoneInfo?.description ?? null,
    evacuationZone,
    historicalStorms: additionalData?.historicalStorms ?? null,
    buildingCodeRequirements,
    insuranceConsiderations,
    dataSource,
    confidence: Math.min(100, confidence),
  };
}

/**
 * Create a default/unknown hurricane risk analysis when no data is available
 *
 * Used when hurricane risk cannot be determined. Returns a neutral assessment
 * based on state location only.
 *
 * @param coordinates - Property coordinates
 * @param state - Two-letter state code
 * @returns Hurricane risk analysis with baseline values
 */
export function createUnknownHurricaneRisk(
  coordinates: { latitude: number; longitude: number },
  state: string
): HurricaneRiskAnalysis {
  return analyzeHurricaneRisk(coordinates, state);
}

/**
 * Check if a state has any hurricane risk exposure
 *
 * @param state - Two-letter state code
 * @returns true if the state may experience hurricanes
 */
export function isHurricaneRiskState(state: string): state is HurricaneRiskState {
  return (HURRICANE_RISK_STATES.ALL_EXPOSED as readonly string[]).includes(state.toUpperCase());
}
