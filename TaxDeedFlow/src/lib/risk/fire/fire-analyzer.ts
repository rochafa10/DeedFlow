/**
 * Fire Risk Analyzer
 *
 * Analyzes wildfire risk for properties using NASA FIRMS active fire data,
 * state wildfire hazard maps, and Wildland-Urban Interface (WUI) data.
 *
 * @module lib/risk/fire/fire-analyzer
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type {
  WildfireRiskAnalysis,
  WildfireRiskLevel,
  RiskLevel,
  DataSource,
} from '@/types/risk-analysis';
import {
  getNASAFIRMSService,
  type ActiveFireSummary,
  type WildfireHazardPotential,
} from '@/lib/api/services/nasa-firms-service';
import { logger } from '@/lib/logger';

// Create context logger for fire analysis
const fireLogger = logger.withContext('Fire Analyzer');

// ============================================
// Constants and Configuration
// ============================================

/**
 * High-risk wildfire states based on historical data
 * Source: NIFC, USFS, state fire agencies
 */
export const WILDFIRE_RISK_STATES: Record<string, {
  riskLevel: 'high' | 'moderate' | 'low';
  seasonalPeak: string;
  insuranceConsiderations: string[];
  buildingRequirements: string[];
}> = {
  CA: {
    riskLevel: 'high',
    seasonalPeak: 'July - October',
    insuranceConsiderations: [
      'California FAIR Plan may be only option in high-risk areas',
      'Non-renewal common in fire-prone zones',
      'Defensible space compliance may affect coverage',
      'Consider California Wildfire Fund coverage',
    ],
    buildingRequirements: [
      'Chapter 7A (WUI) building standards required in SRA/LRA',
      'Class A fire-rated roofing required',
      'Ember-resistant vents mandatory',
      'Defensible space of 100+ feet required by law',
    ],
  },
  CO: {
    riskLevel: 'high',
    seasonalPeak: 'June - September',
    insuranceConsiderations: [
      'Insurers actively non-renewing in WUI areas',
      'FAIR plan available but limited',
      'Wildfire mitigation may reduce premiums',
    ],
    buildingRequirements: [
      'Fire-resistant construction in WUI areas',
      'Defensible space required',
      'Local fire district standards may apply',
    ],
  },
  AZ: {
    riskLevel: 'high',
    seasonalPeak: 'May - July',
    insuranceConsiderations: [
      'Limited insurer availability in high-risk areas',
      'Firewise certification may help with coverage',
    ],
    buildingRequirements: [
      'Fire-resistant construction recommended',
      'Defensible space of 30+ feet recommended',
    ],
  },
  NM: {
    riskLevel: 'high',
    seasonalPeak: 'May - July',
    insuranceConsiderations: [
      'Coverage may be limited in fire-prone areas',
    ],
    buildingRequirements: [
      'Fire-resistant materials recommended',
      'Defensible space recommended',
    ],
  },
  OR: {
    riskLevel: 'high',
    seasonalPeak: 'July - October',
    insuranceConsiderations: [
      'Non-renewals increasing in WUI zones',
      'Defensible space may be required for coverage',
    ],
    buildingRequirements: [
      'Fire-resistant construction in WUI',
      'Defensible space requirements vary by jurisdiction',
    ],
  },
  WA: {
    riskLevel: 'high',
    seasonalPeak: 'July - September',
    insuranceConsiderations: [
      'Coverage challenges in eastern Washington',
    ],
    buildingRequirements: [
      'WUI building codes in designated areas',
    ],
  },
  MT: {
    riskLevel: 'high',
    seasonalPeak: 'July - September',
    insuranceConsiderations: [
      'Rural properties may face coverage challenges',
    ],
    buildingRequirements: [
      'Fire-resistant construction recommended',
    ],
  },
  ID: {
    riskLevel: 'moderate',
    seasonalPeak: 'July - September',
    insuranceConsiderations: [
      'Moderate risk areas generally insurable',
    ],
    buildingRequirements: [
      'Local fire codes may apply',
    ],
  },
  NV: {
    riskLevel: 'moderate',
    seasonalPeak: 'June - September',
    insuranceConsiderations: [
      'Coverage generally available',
    ],
    buildingRequirements: [
      'Fire-resistant materials in WUI',
    ],
  },
  UT: {
    riskLevel: 'moderate',
    seasonalPeak: 'June - September',
    insuranceConsiderations: [
      'Coverage generally available',
    ],
    buildingRequirements: [
      'Local codes may require fire-resistant materials',
    ],
  },
  TX: {
    riskLevel: 'moderate',
    seasonalPeak: 'January - May',
    insuranceConsiderations: [
      'Central Texas and Panhandle higher risk',
    ],
    buildingRequirements: [
      'Local requirements vary',
    ],
  },
  OK: {
    riskLevel: 'moderate',
    seasonalPeak: 'January - April',
    insuranceConsiderations: [
      'Western Oklahoma higher risk',
    ],
    buildingRequirements: [
      'Local requirements vary',
    ],
  },
  FL: {
    riskLevel: 'low',
    seasonalPeak: 'April - June',
    insuranceConsiderations: [
      'Wildfire risk generally low',
      'Combined hurricane/fire policies may be needed',
    ],
    buildingRequirements: [
      'Standard construction adequate',
    ],
  },
};

/**
 * WHP score to risk level mapping
 */
const WHP_TO_RISK_LEVEL: Record<number, WildfireRiskLevel> = {
  1: 'minimal',
  2: 'low',
  3: 'moderate',
  4: 'high',
  5: 'very_high',
};

/**
 * Active fire distance thresholds for risk assessment
 */
const FIRE_DISTANCE_THRESHOLDS = {
  extreme: 5,     // Active fire within 5km = extreme risk
  very_high: 10,  // Active fire within 10km = very high risk
  high: 25,       // Active fire within 25km = high risk
  moderate: 50,   // Active fire within 50km = moderate risk
};

// ============================================
// Fire Risk Analysis
// ============================================

/**
 * Determines wildfire risk level based on multiple factors
 */
function determineWildfireRiskLevel(
  whpScore: number | null,
  activeFiresNearby: number,
  nearestFireDistance: number | null,
  stateRiskLevel: 'high' | 'moderate' | 'low' | null,
  inWUI: boolean
): WildfireRiskLevel {
  // Active fire proximity takes precedence
  if (nearestFireDistance !== null) {
    if (nearestFireDistance <= FIRE_DISTANCE_THRESHOLDS.extreme) return 'extreme';
    if (nearestFireDistance <= FIRE_DISTANCE_THRESHOLDS.very_high) return 'very_high';
    if (nearestFireDistance <= FIRE_DISTANCE_THRESHOLDS.high) return 'high';
    if (nearestFireDistance <= FIRE_DISTANCE_THRESHOLDS.moderate && activeFiresNearby >= 3) return 'high';
  }

  // Multiple active fires in vicinity
  if (activeFiresNearby >= 10) return 'very_high';
  if (activeFiresNearby >= 5) return 'high';

  // WHP score-based assessment
  if (whpScore !== null) {
    const baseLevel = WHP_TO_RISK_LEVEL[whpScore] || 'moderate';

    // Adjust based on WUI status
    if (inWUI && baseLevel !== 'very_high' && baseLevel !== 'extreme') {
      const levels: WildfireRiskLevel[] = ['minimal', 'low', 'moderate', 'high', 'very_high', 'extreme'];
      const idx = levels.indexOf(baseLevel);
      return levels[Math.min(idx + 1, levels.length - 1)];
    }

    return baseLevel;
  }

  // Fall back to state-level risk
  if (stateRiskLevel === 'high') return 'high';
  if (stateRiskLevel === 'moderate') return 'moderate';

  return 'low';
}

/**
 * Determines fuel load based on location and state
 */
function estimateFuelLoad(
  stateCode: string,
  whpScore: number | null
): WildfireRiskAnalysis['fuelLoad'] {
  // High WHP generally correlates with heavy fuel load
  if (whpScore !== null && whpScore >= 4) return 'heavy';
  if (whpScore !== null && whpScore >= 3) return 'moderate';

  // State-based estimation
  const heavyFuelStates = ['CA', 'OR', 'WA', 'MT', 'ID'];
  const moderateFuelStates = ['CO', 'AZ', 'NM', 'NV', 'UT'];

  if (heavyFuelStates.includes(stateCode.toUpperCase())) return 'heavy';
  if (moderateFuelStates.includes(stateCode.toUpperCase())) return 'moderate';

  return 'light';
}

/**
 * Generates wildfire mitigation recommendations
 */
function generateFireMitigations(
  riskLevel: WildfireRiskLevel,
  inWUI: boolean,
  stateCode: string
): string[] {
  const mitigations: string[] = [];
  const stateData = WILDFIRE_RISK_STATES[stateCode.toUpperCase()];

  if (riskLevel === 'minimal' || riskLevel === 'low') {
    mitigations.push('Maintain basic fire-safe landscaping');
    mitigations.push('Keep gutters and roof clear of debris');
    return mitigations;
  }

  // Defensible space recommendations
  if (riskLevel === 'moderate' || riskLevel === 'high' || riskLevel === 'very_high' || riskLevel === 'extreme') {
    mitigations.push('Create defensible space Zone 1 (0-30 feet): Remove dead vegetation, space plants apart');
    mitigations.push('Create defensible space Zone 2 (30-100 feet): Reduce fuel continuity, limb trees up');
    mitigations.push('Clear leaves and debris from roof and gutters regularly');
    mitigations.push('Install ember-resistant vents (1/8 inch mesh or smaller)');
    mitigations.push('Use Class A fire-rated roofing materials');
  }

  if (riskLevel === 'high' || riskLevel === 'very_high' || riskLevel === 'extreme') {
    mitigations.push('Replace wood siding with fire-resistant materials (stucco, cement board)');
    mitigations.push('Install dual-pane tempered glass windows');
    mitigations.push('Enclose decks and porches with fire-resistant materials');
    mitigations.push('Remove firewood and propane tanks 30+ feet from structures');
    mitigations.push('Create fire-resistant barriers around property');
    mitigations.push('Consider joining Firewise USA community for recognition');
  }

  if (riskLevel === 'very_high' || riskLevel === 'extreme') {
    mitigations.push('CRITICAL: Professional fire risk assessment strongly recommended');
    mitigations.push('Install exterior sprinkler system for structure protection');
    mitigations.push('Create multiple evacuation routes and emergency plan');
    mitigations.push('Consider fire-resistant safe room or shelter');
    mitigations.push('Register for emergency alerts (Ready, Set, Go! or similar)');
  }

  if (riskLevel === 'extreme') {
    mitigations.push('WARNING: Active fires nearby - monitor fire conditions closely');
    mitigations.push('Have evacuation kit ready at all times');
    mitigations.push('Know multiple evacuation routes');
  }

  // WUI-specific recommendations
  if (inWUI) {
    mitigations.push('Property is in Wildland-Urban Interface - higher building standards apply');
    mitigations.push('Verify compliance with local WUI building codes');
  }

  return mitigations;
}

/**
 * Calculates wildfire risk score (0-100, higher = more risk)
 */
function calculateWildfireRiskScore(
  riskLevel: WildfireRiskLevel,
  activeFiresNearby: number,
  nearestFireDistance: number | null,
  whpScore: number | null,
  inWUI: boolean
): number {
  // Base score from risk level
  let score: number;
  switch (riskLevel) {
    case 'minimal':
      score = 5;
      break;
    case 'low':
      score = 20;
      break;
    case 'moderate':
      score = 40;
      break;
    case 'high':
      score = 65;
      break;
    case 'very_high':
      score = 85;
      break;
    case 'extreme':
      score = 95;
      break;
    default:
      score = 40;
  }

  // Adjust for active fires
  if (nearestFireDistance !== null) {
    if (nearestFireDistance <= 5) score = Math.max(score, 95);
    else if (nearestFireDistance <= 10) score += 15;
    else if (nearestFireDistance <= 25) score += 10;
  }

  // Adjust for multiple active fires
  if (activeFiresNearby >= 10) score += 10;
  else if (activeFiresNearby >= 5) score += 5;

  // Adjust for WUI
  if (inWUI && score < 80) score += 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Analyzes wildfire risk for a property location
 *
 * Combines NASA FIRMS active fire data with state-level hazard data
 * and WUI status for comprehensive wildfire risk assessment.
 *
 * @param coordinates - Property latitude and longitude
 * @param stateCode - Two-letter state code
 * @returns Wildfire risk analysis result
 *
 * @example
 * ```typescript
 * const result = await analyzeWildfireRisk(
 *   { latitude: 34.0522, longitude: -118.2437 },
 *   'CA'
 * );
 * console.log(result.riskLevel);
 * console.log(result.activeFiresNearby);
 * ```
 */
export async function analyzeWildfireRisk(
  coordinates: { latitude: number; longitude: number },
  stateCode: string
): Promise<WildfireRiskAnalysis> {
  const firmsService = getNASAFIRMSService();
  const upperState = stateCode.toUpperCase();
  const stateData = WILDFIRE_RISK_STATES[upperState];

  try {
    // Fetch active fires and WHP in parallel
    const [activeFiresResponse, whpData] = await Promise.all([
      firmsService.getActiveFiresNearby(coordinates.latitude, coordinates.longitude, 50, 7),
      Promise.resolve(firmsService.estimateWildfireHazardPotential(
        coordinates.latitude,
        coordinates.longitude,
        stateCode
      )),
    ]);

    const activeFires = activeFiresResponse.data;

    // Determine risk level
    const riskLevel = determineWildfireRiskLevel(
      whpData.whpScore,
      activeFires.count,
      activeFires.nearest?.distanceKm ?? null,
      stateData?.riskLevel ?? null,
      whpData.inWUI
    );

    // Generate recommendations
    const mitigations = generateFireMitigations(riskLevel, whpData.inWUI, stateCode);
    const buildingRequirements = stateData?.buildingRequirements || [
      'Follow local fire codes and building requirements',
    ];
    const insuranceConsiderations = stateData?.insuranceConsiderations || [
      'Verify wildfire coverage in homeowner policy',
    ];

    // Assess evacuation accessibility (simplified - would use road network data in production)
    const evacuationAccessibility = riskLevel === 'extreme' || riskLevel === 'very_high' ?
      'limited' : 'good';

    return {
      riskLevel,
      whpScore: whpData.whpScore,
      inWUI: whpData.inWUI,
      wuiType: whpData.wuiType,
      activeFiresNearby: activeFires.count,
      distanceToNearestFire: activeFires.nearest?.distanceKm ?? null,
      historicalFireCount: 0, // Would require historical data API
      recentAcresBurned: null, // Would require NIFC data
      fuelLoad: estimateFuelLoad(stateCode, whpData.whpScore),
      defensibleSpaceRequired: riskLevel !== 'minimal' && riskLevel !== 'low',
      buildingRequirements,
      insuranceConsiderations,
      evacuationAccessibility,
      mitigationRecommendations: mitigations,
      dataSource: {
        name: 'NASA FIRMS / State Fire Agencies',
        type: 'api',
        url: 'https://firms.modaps.eosdis.nasa.gov/',
        reliability: 'high',
      },
      confidence: activeFires.count > 0 ? 85 : 70,
    };
  } catch (error) {
    // Return default analysis if API fails
    fireLogger.error('Fire risk analysis error', {
      error: error instanceof Error ? error.message : String(error),
      stateCode,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    });
    return createDefaultWildfireRisk(stateCode);
  }
}

/**
 * Creates a default wildfire risk analysis when API data is unavailable
 */
function createDefaultWildfireRisk(stateCode: string): WildfireRiskAnalysis {
  const stateData = WILDFIRE_RISK_STATES[stateCode.toUpperCase()];
  const riskLevel = stateData?.riskLevel === 'high' ? 'high' :
                    stateData?.riskLevel === 'moderate' ? 'moderate' : 'low';

  return {
    riskLevel,
    whpScore: stateData?.riskLevel === 'high' ? 3 : 2,
    inWUI: false,
    wuiType: null,
    activeFiresNearby: 0,
    distanceToNearestFire: null,
    historicalFireCount: 0,
    recentAcresBurned: null,
    fuelLoad: stateData?.riskLevel === 'high' ? 'moderate' : 'light',
    defensibleSpaceRequired: stateData?.riskLevel === 'high',
    buildingRequirements: stateData?.buildingRequirements || ['Follow local fire codes'],
    insuranceConsiderations: stateData?.insuranceConsiderations || ['Standard coverage typically available'],
    evacuationAccessibility: 'good',
    mitigationRecommendations: [
      'Fire data unavailable - recommend local fire department consultation',
      'Maintain basic fire-safe landscaping',
    ],
    dataSource: {
      name: 'Default (API unavailable)',
      type: 'estimated',
      reliability: 'low',
    },
    confidence: 40,
  };
}

/**
 * Gets wildfire risk score for the 125-point scoring system
 *
 * Converts wildfire risk to scoring contribution.
 * Lower risk = higher score (better).
 *
 * @param result - Wildfire risk analysis result
 * @returns Score from 0 to 5 (5 = minimal risk)
 */
export function getWildfireRiskScore(result: WildfireRiskAnalysis): number {
  const riskScore = calculateWildfireRiskScore(
    result.riskLevel,
    result.activeFiresNearby,
    result.distanceToNearestFire,
    result.whpScore,
    result.inWUI
  );

  // Convert 0-100 risk to 0-5 score (inverted)
  const score = 5 * (1 - riskScore / 100);
  return Math.round(score * 100) / 100;
}
