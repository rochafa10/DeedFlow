/**
 * Geological Risk Analyzer
 *
 * Analyzes geological risks for properties including earthquake/seismic hazards,
 * sinkhole susceptibility, and slope/landslide risks. Uses USGS data for seismic
 * analysis and state-specific karst geology data for sinkhole assessment.
 *
 * @module lib/risk/geological/geological-analyzer
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type {
  EarthquakeRiskAnalysis,
  SinkholeRiskAnalysis,
  SlopeRiskAnalysis,
  GeologicalRiskResult,
  SeismicHazardLevel,
  SinkholeRiskLevel,
  SlopeStabilityLevel,
  RiskLevel,
  DataSource,
} from '@/types/risk-analysis';
import { getUSGSService, type SeismicHazardData, type HistoricalEarthquakeSummary } from '@/lib/api/services/usgs-service';
import { logger } from '@/lib/logger';

// Create context logger for geological analysis
const geoLogger = logger.withContext('Geological Analyzer');

// ============================================
// Constants and Configuration
// ============================================

/**
 * States with significant karst geology (sinkhole-prone)
 *
 * Based on USGS karst mapping and state geological surveys.
 * High-risk states have extensive limestone, dolomite, or evaporite formations.
 */
export const KARST_GEOLOGY_STATES: Record<string, {
  riskLevel: 'high' | 'moderate' | 'low';
  karstType: 'limestone' | 'dolomite' | 'gypsum' | 'salt' | 'other';
  requiresDisclosure: boolean;
  insuranceConsiderations: string[];
}> = {
  FL: {
    riskLevel: 'high',
    karstType: 'limestone',
    requiresDisclosure: true,
    insuranceConsiderations: [
      'Florida requires sinkhole coverage to be offered',
      'Catastrophic ground cover collapse coverage is standard',
      'Full sinkhole coverage may have high premiums',
      'Ground penetrating radar survey recommended before purchase',
    ],
  },
  TX: {
    riskLevel: 'high',
    karstType: 'limestone',
    requiresDisclosure: false,
    insuranceConsiderations: [
      'Central Texas (Edwards Aquifer region) has highest risk',
      'Sinkhole coverage may not be included in standard policies',
      'Geological survey recommended for karst areas',
    ],
  },
  AL: {
    riskLevel: 'high',
    karstType: 'limestone',
    requiresDisclosure: false,
    insuranceConsiderations: [
      'Northern Alabama has extensive karst',
      'Check for earth movement exclusions in policy',
    ],
  },
  MO: {
    riskLevel: 'high',
    karstType: 'dolomite',
    requiresDisclosure: false,
    insuranceConsiderations: [
      'Southwest Missouri has dense sinkhole concentration',
      'Consider supplemental earth movement coverage',
    ],
  },
  KY: {
    riskLevel: 'high',
    karstType: 'limestone',
    requiresDisclosure: false,
    insuranceConsiderations: [
      'Mammoth Cave region has extensive karst',
      'Sinkhole damage typically excluded from standard policies',
    ],
  },
  TN: {
    riskLevel: 'high',
    karstType: 'limestone',
    requiresDisclosure: false,
    insuranceConsiderations: [
      'Middle Tennessee has significant karst geology',
      'Earth movement endorsement may be available',
    ],
  },
  PA: {
    riskLevel: 'moderate',
    karstType: 'limestone',
    requiresDisclosure: false,
    insuranceConsiderations: [
      'Lehigh Valley and southeastern PA have karst areas',
      'Mine subsidence insurance may also be relevant',
    ],
  },
  GA: {
    riskLevel: 'moderate',
    karstType: 'limestone',
    requiresDisclosure: false,
    insuranceConsiderations: [
      'Southwest Georgia has karst features',
      'Check policy for earth movement exclusions',
    ],
  },
  SC: {
    riskLevel: 'moderate',
    karstType: 'limestone',
    requiresDisclosure: false,
    insuranceConsiderations: [
      'Coastal Plain has some karst areas',
    ],
  },
  VA: {
    riskLevel: 'moderate',
    karstType: 'limestone',
    requiresDisclosure: false,
    insuranceConsiderations: [
      'Shenandoah Valley has karst geology',
    ],
  },
  MD: {
    riskLevel: 'moderate',
    karstType: 'limestone',
    requiresDisclosure: false,
    insuranceConsiderations: [
      'Frederick and Hagerstown valleys have karst',
    ],
  },
  IN: {
    riskLevel: 'moderate',
    karstType: 'limestone',
    requiresDisclosure: false,
    insuranceConsiderations: [
      'South-central Indiana has karst terrain',
    ],
  },
};

/**
 * Seismic hazard classification based on PGA (Peak Ground Acceleration)
 *
 * PGA values in % g (percent of gravitational acceleration)
 * Based on USGS National Seismic Hazard Model
 */
const PGA_THRESHOLDS = {
  very_low: 4,    // < 4% g
  low: 10,        // 4-10% g
  moderate: 20,   // 10-20% g
  high: 40,       // 20-40% g
  // very_high: > 40% g
};

/**
 * Seismic Design Category descriptions
 */
const SDC_DESCRIPTIONS: Record<string, string> = {
  A: 'Minimal seismic risk - Standard construction practices adequate',
  B: 'Low seismic risk - Basic seismic detailing required',
  C: 'Moderate seismic risk - Seismic design required for all buildings',
  D: 'High seismic risk - Stringent seismic design and detailing required',
  E: 'Very high seismic risk - Near major active fault, enhanced requirements',
  F: 'Highest seismic risk - Site-specific seismic study required',
};

// ============================================
// Earthquake Risk Analysis
// ============================================

/**
 * Classifies seismic hazard level based on PGA
 */
function classifySeismicHazard(pga: number): SeismicHazardLevel {
  if (pga < PGA_THRESHOLDS.very_low) return 'very_low';
  if (pga < PGA_THRESHOLDS.low) return 'low';
  if (pga < PGA_THRESHOLDS.moderate) return 'moderate';
  if (pga < PGA_THRESHOLDS.high) return 'high';
  return 'very_high';
}

/**
 * Generates earthquake mitigation recommendations based on risk level
 */
function generateEarthquakeMitigations(
  hazardLevel: SeismicHazardLevel,
  seismicDesignCategory: string | null
): string[] {
  const mitigations: string[] = [];

  if (hazardLevel === 'very_low' || hazardLevel === 'low') {
    mitigations.push('Standard construction practices are adequate for this seismic zone');
    mitigations.push('Secure heavy furniture and water heater for basic earthquake safety');
    return mitigations;
  }

  // Moderate and higher risk
  mitigations.push('Verify structure meets current seismic building codes');
  mitigations.push('Consider seismic retrofit evaluation for older buildings (pre-1980)');
  mitigations.push('Bolt structure to foundation if not already done');
  mitigations.push('Secure water heater, gas lines, and heavy appliances');
  mitigations.push('Install flexible gas line connections');

  if (hazardLevel === 'high' || hazardLevel === 'very_high') {
    mitigations.push('Professional seismic engineering assessment strongly recommended');
    mitigations.push('Consider cripple wall bracing if applicable');
    mitigations.push('Evaluate chimney and masonry elements for seismic vulnerability');
    mitigations.push('Earthquake insurance strongly recommended');
    mitigations.push('Develop earthquake preparedness and evacuation plan');
  }

  if (seismicDesignCategory === 'E' || seismicDesignCategory === 'F') {
    mitigations.push('CRITICAL: Near major fault - site-specific geotechnical study required');
    mitigations.push('Building may require special foundation design');
    mitigations.push('Verify any new construction meets enhanced seismic requirements');
  }

  return mitigations;
}

/**
 * Calculates earthquake risk score (0-100, higher = more risk)
 */
function calculateEarthquakeRiskScore(
  hazardLevel: SeismicHazardLevel,
  pga: number,
  historicalCount: number,
  maxMagnitude: number | null
): number {
  // Base score from hazard level
  let score: number;
  switch (hazardLevel) {
    case 'very_low':
      score = 10;
      break;
    case 'low':
      score = 25;
      break;
    case 'moderate':
      score = 45;
      break;
    case 'high':
      score = 70;
      break;
    case 'very_high':
      score = 90;
      break;
    default:
      score = 50;
  }

  // Adjust based on historical activity
  if (historicalCount > 100) score += 5;
  else if (historicalCount > 50) score += 3;
  else if (historicalCount > 20) score += 1;
  else if (historicalCount === 0) score -= 5;

  // Adjust based on max historical magnitude
  if (maxMagnitude !== null) {
    if (maxMagnitude >= 7.0) score += 10;
    else if (maxMagnitude >= 6.0) score += 5;
    else if (maxMagnitude >= 5.0) score += 2;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Analyzes earthquake risk for a property location
 *
 * Uses USGS seismic hazard data and historical earthquake catalog.
 *
 * @param coordinates - Property latitude and longitude
 * @returns Earthquake risk analysis result
 */
export async function analyzeEarthquakeRisk(
  coordinates: { latitude: number; longitude: number }
): Promise<EarthquakeRiskAnalysis> {
  const usgsService = getUSGSService();

  try {
    // Fetch seismic hazard and historical data in parallel
    const [hazardResponse, historyResponse] = await Promise.all([
      usgsService.getSeismicHazard(coordinates.latitude, coordinates.longitude),
      usgsService.getHistoricalEarthquakes(coordinates.latitude, coordinates.longitude, 80, 100, 2.5),
    ]);

    const hazard = hazardResponse.data;
    const history = historyResponse.data;

    const hazardLevel = classifySeismicHazard(hazard.pga);
    const mitigations = generateEarthquakeMitigations(hazardLevel, hazard.seismicDesignCategory);

    return {
      hazardLevel,
      pga: hazard.pga,
      spectralAcceleration02: hazard.ss,
      spectralAcceleration10: hazard.s1,
      distanceToFault: null, // Would require additional USGS fault data
      nearestFaultName: null,
      historicalQuakeCount: history.count,
      maxHistoricalMagnitude: history.maxMagnitude,
      seismicDesignCategory: hazard.seismicDesignCategory,
      mitigationRecommendations: mitigations,
      dataSource: {
        name: 'USGS National Seismic Hazard Model (NSHM)',
        type: 'api',
        url: 'https://earthquake.usgs.gov/ws/designmaps/',
        reliability: 'high',
      },
      confidence: 90,
    };
  } catch (error) {
    // Return default low-risk analysis if API fails
    geoLogger.error('USGS API error', {
      error: error instanceof Error ? error.message : String(error),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    });
    return createDefaultEarthquakeRisk(coordinates);
  }
}

/**
 * Creates a default earthquake risk analysis when API data is unavailable
 */
function createDefaultEarthquakeRisk(
  coordinates: { latitude: number; longitude: number }
): EarthquakeRiskAnalysis {
  return {
    hazardLevel: 'low',
    pga: 5, // Default to low risk
    spectralAcceleration02: null,
    spectralAcceleration10: null,
    distanceToFault: null,
    nearestFaultName: null,
    historicalQuakeCount: 0,
    maxHistoricalMagnitude: null,
    seismicDesignCategory: null,
    mitigationRecommendations: [
      'Seismic data unavailable - recommend local geological survey consultation',
      'Standard earthquake preparedness measures advised',
    ],
    dataSource: {
      name: 'Default (API unavailable)',
      type: 'estimated',
      reliability: 'low',
    },
    confidence: 30,
  };
}

// ============================================
// Sinkhole Risk Analysis
// ============================================

/**
 * Classifies sinkhole risk level based on state and karst data
 */
function classifySinkholeRisk(
  stateCode: string,
  inKarstArea: boolean,
  sinkholesNearby: number
): SinkholeRiskLevel {
  const stateData = KARST_GEOLOGY_STATES[stateCode];

  // Not in a known karst state
  if (!stateData && !inKarstArea && sinkholesNearby === 0) {
    return 'negligible';
  }

  // Has nearby sinkholes - always elevated risk
  if (sinkholesNearby > 10) return 'very_high';
  if (sinkholesNearby > 5) return 'high';
  if (sinkholesNearby > 2) return 'moderate';
  if (sinkholesNearby > 0) return 'low';

  // In karst area but no nearby sinkholes
  if (inKarstArea || stateData?.riskLevel === 'high') {
    return 'moderate';
  }

  if (stateData?.riskLevel === 'moderate') {
    return 'low';
  }

  return 'negligible';
}

/**
 * Generates sinkhole mitigation recommendations
 */
function generateSinkholeMitigations(
  riskLevel: SinkholeRiskLevel,
  stateCode: string
): string[] {
  const mitigations: string[] = [];
  const stateData = KARST_GEOLOGY_STATES[stateCode];

  if (riskLevel === 'negligible') {
    mitigations.push('Sinkhole risk is negligible in this area');
    return mitigations;
  }

  // General recommendations for any sinkhole risk
  mitigations.push('Conduct thorough property inspection for signs of ground settlement');
  mitigations.push('Check for cracks in foundation, walls, and driveway');
  mitigations.push('Look for evidence of previous repairs or filled depressions');

  if (riskLevel === 'low' || riskLevel === 'moderate') {
    mitigations.push('Consider ground penetrating radar (GPR) survey before purchase');
    mitigations.push('Review property history for any sinkhole claims or repairs');
    mitigations.push('Ensure proper drainage away from foundation');
  }

  if (riskLevel === 'high' || riskLevel === 'very_high') {
    mitigations.push('STRONGLY RECOMMEND professional geological assessment');
    mitigations.push('Ground penetrating radar (GPR) survey essential');
    mitigations.push('Compaction grouting may be needed if voids are detected');
    mitigations.push('Sinkhole insurance coverage strongly recommended');
    mitigations.push('Install deep foundations or underpinning if building');
    mitigations.push('Monitor for new cracks, doors sticking, or settling');
  }

  // Florida-specific (skip low risk areas)
  if (stateCode === 'FL' && riskLevel !== 'low') {
    mitigations.push('Florida law requires sellers to disclose known sinkholes');
    mitigations.push('Request sinkhole inspection contingency in purchase contract');
    mitigations.push('Verify if property has had previous sinkhole claims with insurance');
  }

  return mitigations;
}

/**
 * Calculates sinkhole risk score (0-100, higher = more risk)
 */
function calculateSinkholeRiskScore(
  riskLevel: SinkholeRiskLevel,
  sinkholesNearby: number,
  inKarstArea: boolean
): number {
  let score: number;

  switch (riskLevel) {
    case 'negligible':
      score = 5;
      break;
    case 'low':
      score = 20;
      break;
    case 'moderate':
      score = 45;
      break;
    case 'high':
      score = 70;
      break;
    case 'very_high':
      score = 90;
      break;
    default:
      score = 25;
  }

  // Adjust for karst area
  if (inKarstArea && score < 40) {
    score += 10;
  }

  // Adjust for nearby sinkholes
  score += Math.min(15, sinkholesNearby * 2);

  return Math.min(100, Math.max(0, score));
}

/**
 * Analyzes sinkhole risk for a property location
 *
 * Uses state karst geology data and sinkhole databases.
 * Note: Full implementation would query state geological surveys or
 * commercial sinkhole databases for precise data.
 *
 * @param coordinates - Property latitude and longitude
 * @param stateCode - Two-letter state code
 * @returns Sinkhole risk analysis result
 */
export function analyzeSinkholeRisk(
  coordinates: { latitude: number; longitude: number },
  stateCode: string
): SinkholeRiskAnalysis {
  const stateData = KARST_GEOLOGY_STATES[stateCode.toUpperCase()];
  const inKarstArea = !!stateData;

  // In production, this would query actual sinkhole databases
  // For now, estimate based on state-level data
  const estimatedSinkholesNearby = stateData?.riskLevel === 'high' ? 2 :
                                    stateData?.riskLevel === 'moderate' ? 1 : 0;

  const riskLevel = classifySinkholeRisk(
    stateCode.toUpperCase(),
    inKarstArea,
    estimatedSinkholesNearby
  );

  const mitigations = generateSinkholeMitigations(riskLevel, stateCode.toUpperCase());
  const insuranceConsiderations = stateData?.insuranceConsiderations || [
    'Sinkhole coverage may not be included in standard homeowner policies',
    'Check policy for earth movement exclusions',
  ];

  return {
    riskLevel,
    inKarstArea,
    karstType: stateData?.karstType || null,
    distanceToNearestSinkhole: null, // Would require precise data
    sinkholesWithinOneMile: estimatedSinkholesNearby,
    sinkholesWithinFiveMiles: estimatedSinkholesNearby * 3,
    subsidenceHistory: false, // Would require historical data
    stateRequiresDisclosure: stateData?.requiresDisclosure || false,
    insuranceConsiderations,
    mitigationRecommendations: mitigations,
    dataSource: {
      name: 'State Karst Geology Database',
      type: stateData ? 'database' : 'estimated',
      reliability: stateData ? 'medium' : 'low',
    },
    confidence: stateData ? 60 : 40,
  };
}

// ============================================
// Slope/Landslide Risk Analysis
// ============================================

/**
 * Classifies slope stability based on slope percentage and other factors
 */
function classifySlopeStability(
  slopePercentage: number | null,
  inLandslideZone: boolean
): SlopeStabilityLevel {
  if (inLandslideZone) {
    return 'highly_unstable';
  }

  if (slopePercentage === null) {
    return 'stable'; // Default assumption
  }

  // Slope percentage thresholds
  if (slopePercentage < 5) return 'stable';
  if (slopePercentage < 15) return 'marginally_stable';
  if (slopePercentage < 30) return 'unstable';
  return 'highly_unstable';
}

/**
 * Generates slope mitigation recommendations
 */
function generateSlopeMitigations(
  stabilityLevel: SlopeStabilityLevel,
  slopePercentage: number | null
): string[] {
  const mitigations: string[] = [];

  if (stabilityLevel === 'stable') {
    mitigations.push('Slope conditions appear favorable - standard grading practices adequate');
    return mitigations;
  }

  // General recommendations for any slope concerns
  mitigations.push('Ensure proper drainage and runoff management');
  mitigations.push('Maintain vegetation cover to prevent erosion');

  if (stabilityLevel === 'marginally_stable') {
    mitigations.push('Consider retaining walls for any cuts or fills');
    mitigations.push('Professional grading plan recommended for any construction');
    mitigations.push('Install French drains to manage subsurface water');
  }

  if (stabilityLevel === 'unstable' || stabilityLevel === 'highly_unstable') {
    mitigations.push('STRONGLY RECOMMEND geotechnical engineering assessment');
    mitigations.push('Detailed slope stability analysis required before development');
    mitigations.push('Engineered retaining structures may be necessary');
    mitigations.push('Deep foundation systems may be required');
    mitigations.push('Avoid construction during wet season');
    mitigations.push('Install comprehensive drainage system');
    mitigations.push('Consider slope reinforcement (soil nails, geogrid)');
  }

  if (stabilityLevel === 'highly_unstable') {
    mitigations.push('WARNING: High landslide susceptibility - significant engineering required');
    mitigations.push('Development may not be feasible without major stabilization');
    mitigations.push('Verify insurance availability for landslide damage');
  }

  return mitigations;
}

/**
 * Calculates slope risk score (0-100, higher = more risk)
 */
function calculateSlopeRiskScore(
  stabilityLevel: SlopeStabilityLevel,
  slopePercentage: number | null,
  inLandslideZone: boolean
): number {
  let score: number;

  switch (stabilityLevel) {
    case 'stable':
      score = 10;
      break;
    case 'marginally_stable':
      score = 35;
      break;
    case 'unstable':
      score = 65;
      break;
    case 'highly_unstable':
      score = 90;
      break;
    default:
      score = 25;
  }

  // Adjust for landslide zone
  if (inLandslideZone) {
    score = Math.max(score, 70);
  }

  // Adjust for extreme slopes
  if (slopePercentage !== null && slopePercentage > 40) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Analyzes slope and landslide risk for a property location
 *
 * Note: Full implementation would integrate with USGS landslide data,
 * digital elevation models (DEM), and state landslide inventories.
 *
 * @param coordinates - Property latitude and longitude
 * @param elevationData - Optional elevation/slope data if available
 * @returns Slope risk analysis result
 */
export function analyzeSlopeRisk(
  coordinates: { latitude: number; longitude: number },
  elevationData?: {
    slopePercentage?: number;
    maxSlopePercentage?: number;
    slopeAspect?: SlopeRiskAnalysis['slopeAspect'];
  }
): SlopeRiskAnalysis {
  const slopePercentage = elevationData?.slopePercentage ?? null;
  const maxSlopePercentage = elevationData?.maxSlopePercentage ?? slopePercentage;
  const slopeAspect = elevationData?.slopeAspect ?? null;

  // In production, this would query USGS landslide data
  const inLandslideZone = false;
  const landslideSusceptibility = slopePercentage !== null && slopePercentage > 20 ?
    'moderate' : 'very_low';

  const stabilityLevel = classifySlopeStability(maxSlopePercentage, inLandslideZone);
  const mitigations = generateSlopeMitigations(stabilityLevel, slopePercentage);

  const drainageConsiderations: string[] = [];
  if (slopePercentage !== null && slopePercentage > 10) {
    drainageConsiderations.push('Install terracing or berms to control runoff');
    drainageConsiderations.push('Position downspouts and drains away from slope');
  }
  if (slopeAspect === 'N' || slopeAspect === 'NE' || slopeAspect === 'NW') {
    drainageConsiderations.push('North-facing slope may retain moisture longer');
  }

  return {
    stabilityLevel,
    slopePercentage,
    maxSlopePercentage,
    slopeAspect,
    landslideSusceptibility: landslideSusceptibility as SlopeRiskAnalysis['landslideSusceptibility'],
    inLandslideZone,
    historicalLandslides: 0, // Would require historical data
    soilType: null, // Would require SSURGO/NRCS data
    drainageConsiderations,
    mitigationRecommendations: mitigations,
    dataSource: {
      name: elevationData ? 'Digital Elevation Model' : 'Estimated',
      type: elevationData ? 'calculated' : 'estimated',
      reliability: elevationData ? 'medium' : 'low',
    },
    confidence: elevationData ? 65 : 40,
  };
}

// ============================================
// Combined Geological Risk Analysis
// ============================================

/**
 * Determines overall geological risk level from individual analyses
 */
function determineOverallGeologicalRisk(
  earthquakeScore: number,
  sinkholeScore: number,
  slopeScore: number
): RiskLevel {
  const maxScore = Math.max(earthquakeScore, sinkholeScore, slopeScore);
  const avgScore = (earthquakeScore + sinkholeScore + slopeScore) / 3;

  // If any single risk is severe, overall is at least high
  if (maxScore >= 80) return 'very_high';
  if (maxScore >= 65 || avgScore >= 55) return 'high';
  if (maxScore >= 45 || avgScore >= 35) return 'moderate';
  if (maxScore >= 25 || avgScore >= 20) return 'low';
  return 'minimal';
}

/**
 * Generates combined geological risk warnings
 */
function generateGeologicalWarnings(
  earthquake: EarthquakeRiskAnalysis,
  sinkhole: SinkholeRiskAnalysis,
  slope: SlopeRiskAnalysis
): string[] {
  const warnings: string[] = [];

  // Earthquake warnings
  if (earthquake.hazardLevel === 'very_high') {
    warnings.push('CRITICAL: Very high seismic hazard - major earthquake risk');
  }
  if (earthquake.seismicDesignCategory === 'F') {
    warnings.push('Site-specific seismic study required by building code');
  }
  if (earthquake.maxHistoricalMagnitude !== null && earthquake.maxHistoricalMagnitude >= 7.0) {
    warnings.push(`Area has experienced magnitude ${earthquake.maxHistoricalMagnitude} earthquake`);
  }

  // Sinkhole warnings
  if (sinkhole.riskLevel === 'very_high' || sinkhole.riskLevel === 'high') {
    warnings.push('HIGH SINKHOLE RISK: Professional geological assessment essential');
  }
  if (sinkhole.stateRequiresDisclosure) {
    warnings.push('State requires sinkhole disclosure - verify compliance');
  }

  // Slope warnings
  if (slope.stabilityLevel === 'highly_unstable') {
    warnings.push('CRITICAL: Slope instability - development may not be feasible');
  }
  if (slope.inLandslideZone) {
    warnings.push('Property is in a mapped landslide hazard zone');
  }

  return warnings;
}

/**
 * Performs comprehensive geological risk analysis for a property
 *
 * Combines earthquake, sinkhole, and slope risk assessments into a
 * single geological risk profile.
 *
 * @param coordinates - Property latitude and longitude
 * @param stateCode - Two-letter state code
 * @param elevationData - Optional elevation/slope data
 * @returns Complete geological risk assessment
 *
 * @example
 * ```typescript
 * const result = await analyzeGeologicalRisk(
 *   { latitude: 34.0522, longitude: -118.2437 },
 *   'CA'
 * );
 * console.log(result.overallRiskLevel);
 * console.log(result.earthquake.hazardLevel);
 * ```
 */
export async function analyzeGeologicalRisk(
  coordinates: { latitude: number; longitude: number },
  stateCode: string,
  elevationData?: {
    slopePercentage?: number;
    maxSlopePercentage?: number;
    slopeAspect?: SlopeRiskAnalysis['slopeAspect'];
  }
): Promise<GeologicalRiskResult> {
  // Run all analyses
  const [earthquake, sinkhole, slope] = await Promise.all([
    analyzeEarthquakeRisk(coordinates),
    Promise.resolve(analyzeSinkholeRisk(coordinates, stateCode)),
    Promise.resolve(analyzeSlopeRisk(coordinates, elevationData)),
  ]);

  // Calculate individual risk scores
  const earthquakeScore = calculateEarthquakeRiskScore(
    earthquake.hazardLevel,
    earthquake.pga,
    earthquake.historicalQuakeCount,
    earthquake.maxHistoricalMagnitude
  );

  const sinkholeScore = calculateSinkholeRiskScore(
    sinkhole.riskLevel,
    sinkhole.sinkholesWithinOneMile,
    sinkhole.inKarstArea
  );

  const slopeScore = calculateSlopeRiskScore(
    slope.stabilityLevel,
    slope.slopePercentage,
    slope.inLandslideZone
  );

  // Determine overall risk and primary concern
  const overallRiskLevel = determineOverallGeologicalRisk(earthquakeScore, sinkholeScore, slopeScore);

  let primaryConcern: GeologicalRiskResult['primaryConcern'] = 'none';
  const maxScore = Math.max(earthquakeScore, sinkholeScore, slopeScore);
  if (maxScore >= 40) {
    if (earthquakeScore === maxScore) primaryConcern = 'earthquake';
    else if (sinkholeScore === maxScore) primaryConcern = 'sinkhole';
    else primaryConcern = 'slope';
  }

  // Calculate combined score (weighted average)
  const combinedRiskScore = Math.round(
    earthquakeScore * 0.5 + sinkholeScore * 0.3 + slopeScore * 0.2
  );

  // Generate warnings and combine recommendations
  const warnings = generateGeologicalWarnings(earthquake, sinkhole, slope);

  const recommendations = [
    ...earthquake.mitigationRecommendations.slice(0, 3),
    ...sinkhole.mitigationRecommendations.slice(0, 3),
    ...slope.mitigationRecommendations.slice(0, 3),
  ];

  // Calculate overall confidence (weighted by data availability)
  const confidence = Math.round(
    earthquake.confidence * 0.5 + sinkhole.confidence * 0.3 + slope.confidence * 0.2
  );

  return {
    earthquake,
    sinkhole,
    slope,
    overallRiskLevel,
    combinedRiskScore,
    primaryConcern,
    criticalWarnings: warnings,
    recommendations,
    analyzedAt: new Date(),
    confidence,
  };
}

/**
 * Gets geological risk score for the 125-point scoring system
 *
 * Converts 0-100 risk score to scoring contribution.
 * Lower risk = higher score (better).
 *
 * @param result - Geological risk analysis result
 * @returns Score from 0 to 5 (5 = minimal risk)
 */
export function getGeologicalRiskScore(result: GeologicalRiskResult): number {
  // Convert 0-100 risk to 0-5 score (inverted - lower risk = higher score)
  const score = 5 * (1 - result.combinedRiskScore / 100);
  return Math.round(score * 100) / 100;
}
