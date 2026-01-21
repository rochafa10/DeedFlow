/**
 * Risk Aggregation Engine
 *
 * Aggregates risk data from multiple API sources (FEMA, USGS, NASA FIRMS, EPA, etc.)
 * into a unified RiskAssessment structure for property analysis.
 *
 * @module lib/analysis/risk/risk-aggregator
 * @author Claude Code Agent
 * @date 2026-01-17
 */

import type {
  RiskAssessment,
  RiskWeights,
  RiskCategoryScore,
  InsuranceEstimates,
  RiskMitigation,
  OverallRiskLevel,
  RiskLevel,
  FloodRiskAnalysis,
  EarthquakeRiskAnalysis,
  WildfireRiskAnalysis,
  HurricaneRiskAnalysis,
  SinkholeRiskAnalysis,
  EnvironmentalContaminationAnalysis,
  RadonRiskAnalysis,
  SlopeRiskAnalysis,
  DataSource,
  FEMAFloodZone,
} from '@/types/risk-analysis';

import { getFEMAService } from '@/lib/api/services/fema-service';
import { getUSGSService } from '@/lib/api/services/usgs-service';
import { getNASAFIRMSService } from '@/lib/api/services/nasa-firms-service';
import { getEPAService } from '@/lib/api/services/epa-service';
import { getElevationService } from '@/lib/api/services/elevation-service';
import { getNOAAService } from '@/lib/api/services/noaa-service';

// ============================================
// Types
// ============================================

export interface RiskAggregationInput {
  coordinates: {
    lat: number;
    lng: number;
  };
  state: string;
  county?: string;
  propertyValue?: number;
  buildingSqft?: number;
}

export interface RiskAggregationOptions {
  /** Skip specific risk assessments */
  skip?: {
    flood?: boolean;
    earthquake?: boolean;
    wildfire?: boolean;
    hurricane?: boolean;
    sinkhole?: boolean;
    environmental?: boolean;
    radon?: boolean;
    slope?: boolean;
  };
  /** Use cached data if available within TTL */
  useCache?: boolean;
  /** Timeout for individual API calls in ms */
  timeout?: number;
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_WEIGHTS: RiskWeights = {
  flood: 0.20,
  earthquake: 0.10,
  wildfire: 0.15,
  hurricane: 0.15,
  sinkhole: 0.05,
  environmental: 0.15,
  radon: 0.10,
  slope: 0.10,
};

// State-specific weight adjustments
const STATE_WEIGHT_ADJUSTMENTS: Record<string, Partial<RiskWeights>> = {
  FL: { hurricane: 0.25, flood: 0.25, sinkhole: 0.15, earthquake: 0.05, wildfire: 0.05 },
  CA: { earthquake: 0.25, wildfire: 0.25, flood: 0.15, hurricane: 0.05, sinkhole: 0.05 },
  TX: { hurricane: 0.20, flood: 0.20, wildfire: 0.15, earthquake: 0.05 },
  PA: { flood: 0.20, radon: 0.20, environmental: 0.15, slope: 0.15, earthquake: 0.05, hurricane: 0.05 },
  OK: { earthquake: 0.15, wildfire: 0.15, flood: 0.15 },
  AZ: { wildfire: 0.25, earthquake: 0.15, flood: 0.10 },
};

// ============================================
// Main Aggregation Function
// ============================================

/**
 * Aggregate risk data from all sources into a unified RiskAssessment
 *
 * @param input - Property coordinates, state, and optional details
 * @param options - Aggregation options
 * @returns Complete RiskAssessment with all risk categories
 *
 * @example
 * ```typescript
 * const risk = await aggregateRiskData({
 *   coordinates: { lat: 40.5186, lng: -78.3947 },
 *   state: 'PA',
 *   propertyValue: 150000,
 * });
 * console.log(risk.overallRisk); // 'low' | 'moderate' | 'high' | 'severe'
 * ```
 */
export async function aggregateRiskData(
  input: RiskAggregationInput,
  options: RiskAggregationOptions = {}
): Promise<RiskAssessment> {
  const { coordinates, state, county, propertyValue = 150000, buildingSqft = 1500 } = input;
  const skip = options.skip ?? {};
  const timeout = options.timeout ?? 10000;

  // Fetch all risk data in parallel
  const [
    floodResult,
    earthquakeResult,
    wildfireResult,
    hurricaneResult,
    sinkholeResult,
    environmentalResult,
    radonResult,
    slopeResult,
  ] = await Promise.allSettled([
    skip.flood ? Promise.resolve(null) : fetchFloodRisk(coordinates, timeout),
    skip.earthquake ? Promise.resolve(null) : fetchEarthquakeRisk(coordinates, timeout),
    skip.wildfire ? Promise.resolve(null) : fetchWildfireRisk(coordinates, timeout),
    skip.hurricane ? Promise.resolve(null) : fetchHurricaneRisk(coordinates, state, timeout),
    skip.sinkhole ? Promise.resolve(null) : fetchSinkholeRisk(coordinates, state, timeout),
    skip.environmental ? Promise.resolve(null) : fetchEnvironmentalRisk(coordinates, timeout),
    skip.radon ? Promise.resolve(null) : fetchRadonRisk(state, county, timeout),
    skip.slope ? Promise.resolve(null) : fetchSlopeRisk(coordinates, timeout),
  ]);

  // Extract results, handling failures gracefully
  const flood = extractResult<FloodRiskAnalysis>(floodResult);
  const earthquake = extractResult<EarthquakeRiskAnalysis>(earthquakeResult);
  const wildfire = extractResult<WildfireRiskAnalysis>(wildfireResult);
  const hurricane = extractResult<HurricaneRiskAnalysis>(hurricaneResult);
  const sinkhole = extractResult<SinkholeRiskAnalysis>(sinkholeResult);
  const environmental = extractResult<EnvironmentalContaminationAnalysis>(environmentalResult);
  const radon = extractResult<RadonRiskAnalysis>(radonResult);
  const slope = extractResult<SlopeRiskAnalysis>(slopeResult);

  // Get state-adjusted weights
  const weights = getAdjustedWeights(state);

  // Calculate category scores
  const categoryScores = calculateCategoryScores({
    flood,
    earthquake,
    wildfire,
    hurricane,
    sinkhole,
    environmental,
    radon,
    slope,
  }, weights);

  // Calculate overall risk score (0-100, higher = more risk)
  const riskScore = calculateOverallRiskScore(categoryScores, weights);

  // Determine overall risk level
  const overallRisk = determineOverallRiskLevel(riskScore);

  // Calculate confidence level
  const confidenceLevel = calculateConfidenceLevel(categoryScores);

  // Generate insurance estimates
  const insuranceEstimates = calculateInsuranceEstimates(
    { flood, earthquake, wildfire, hurricane },
    propertyValue,
    buildingSqft
  );

  // Generate prioritized recommendations
  const { recommendations, mitigationActions } = generateRecommendations(
    { flood, earthquake, wildfire, hurricane, sinkhole, environmental, radon, slope },
    categoryScores
  );

  // Identify top risk factors and positive factors
  const { topRiskFactors, positiveFactors, warnings } = analyzeRiskFactors(
    { flood, earthquake, wildfire, hurricane, sinkhole, environmental, radon, slope },
    categoryScores
  );

  return {
    overallRisk,
    riskScore,
    confidenceLevel,
    flood,
    earthquake,
    wildfire,
    hurricane,
    sinkhole,
    environmental,
    radon,
    slope,
    categoryScores,
    weightsUsed: weights,
    insuranceEstimates,
    recommendations,
    mitigationActions,
    warnings,
    topRiskFactors,
    positiveFactors,
    assessedAt: new Date(),
  };
}

// ============================================
// Individual Risk Fetchers
// ============================================

async function fetchFloodRisk(
  coordinates: { lat: number; lng: number },
  timeout: number
): Promise<FloodRiskAnalysis | null> {
  try {
    const femaService = getFEMAService();
    const result = await Promise.race([
      femaService.getFloodZone(coordinates.lat, coordinates.lng),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
    ]);

    if (!result || !result.data) return null;

    // Map FEMA result to FloodRiskAnalysis
    const floodData = result.data;
    const zone = (floodData.floodZone || 'X') as FEMAFloodZone;
    const riskLevel = mapFloodZoneToRiskLevel(zone);
    const insuranceRequired = isFloodInsuranceRequired(zone);

    return {
      zone,
      zoneDescription: floodData.description || getFloodZoneDescription(zone),
      riskLevel,
      insuranceRequired,
      annualPremiumEstimate: insuranceRequired ? estimateFloodInsurancePremium(zone) : null,
      baseFloodElevation: floodData.bfe ?? null,
      propertyElevation: null,
      elevationDifference: null,
      floodwayStatus: null, // Not directly available in FloodZoneResponse
      historicalFlooding: null,
      mitigationRecommendations: getFloodMitigationRecommendations(zone),
      dataSource: {
        name: 'FEMA NFHL',
        type: 'api',
        reliability: 'high',
        lastUpdated: new Date(),
      },
      confidence: 85,
    };
  } catch (error) {
    console.error('[RiskAggregator] Flood risk fetch failed:', error);
    return createDefaultFloodRisk();
  }
}

async function fetchEarthquakeRisk(
  coordinates: { lat: number; lng: number },
  timeout: number
): Promise<EarthquakeRiskAnalysis | null> {
  try {
    const usgsService = getUSGSService();
    const result = await Promise.race([
      usgsService.getSeismicHazard(coordinates.lat, coordinates.lng),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
    ]);

    if (!result || !result.data) return null;

    const seismicData = result.data;
    const pga = seismicData.pga ?? 0;
    const hazardLevel = mapPGAToHazardLevel(pga);

    return {
      hazardLevel,
      pga,
      spectralAcceleration02: seismicData.ss ?? null, // 0.2s spectral acceleration
      spectralAcceleration10: seismicData.s1 ?? null, // 1.0s spectral acceleration
      distanceToFault: null, // Not available from basic hazard data
      nearestFaultName: null, // Not available from basic hazard data
      historicalQuakeCount: 0, // Would need separate historical query
      maxHistoricalMagnitude: null, // Would need separate historical query
      seismicDesignCategory: seismicData.seismicDesignCategory || mapPGAToDesignCategory(pga),
      mitigationRecommendations: getEarthquakeMitigationRecommendations(hazardLevel),
      dataSource: {
        name: 'USGS',
        type: 'api',
        reliability: 'high',
        lastUpdated: new Date(),
      },
      confidence: 90,
    };
  } catch (error) {
    console.error('[RiskAggregator] Earthquake risk fetch failed:', error);
    return createDefaultEarthquakeRisk();
  }
}

async function fetchWildfireRisk(
  coordinates: { lat: number; lng: number },
  timeout: number
): Promise<WildfireRiskAnalysis | null> {
  try {
    const firmsService = getNASAFIRMSService();
    const result = await Promise.race([
      firmsService.getActiveFiresNearby(coordinates.lat, coordinates.lng, 25),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
    ]);

    if (!result || !result.data) return null;

    const fireData = result.data;
    const activeFiresNearby = fireData.count ?? 0;
    const riskLevel = mapActiveFiresToRiskLevel(activeFiresNearby);

    return {
      riskLevel,
      whpScore: null,
      inWUI: false,
      wuiType: null,
      activeFiresNearby,
      distanceToNearestFire: fireData.nearest?.distanceKm ?? null,
      historicalFireCount: 0,
      recentAcresBurned: null,
      fuelLoad: null,
      defensibleSpaceRequired: riskLevel !== 'minimal' && riskLevel !== 'low',
      buildingRequirements: getWildfireBuildingRequirements(riskLevel),
      insuranceConsiderations: getWildfireInsuranceConsiderations(riskLevel),
      evacuationAccessibility: null,
      mitigationRecommendations: getWildfireMitigationRecommendations(riskLevel),
      dataSource: {
        name: 'NASA FIRMS',
        type: 'api',
        reliability: 'high',
        lastUpdated: new Date(),
      },
      confidence: 75,
    };
  } catch (error) {
    console.error('[RiskAggregator] Wildfire risk fetch failed:', error);
    return createDefaultWildfireRisk();
  }
}

async function fetchHurricaneRisk(
  coordinates: { lat: number; lng: number },
  state: string,
  timeout: number
): Promise<HurricaneRiskAnalysis | null> {
  try {
    // Hurricane risk is primarily relevant for coastal states
    const hurricaneStates = ['FL', 'TX', 'LA', 'NC', 'SC', 'GA', 'AL', 'MS', 'VA', 'MD', 'DE', 'NJ', 'NY', 'CT', 'RI', 'MA', 'NH', 'ME'];
    if (!hurricaneStates.includes(state)) {
      return createMinimalHurricaneRisk();
    }

    const noaaService = getNOAAService();
    const result = await Promise.race([
      noaaService.getClimateRiskAssessment(coordinates.lat, coordinates.lng, state),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
    ]);

    if (!result) return createMinimalHurricaneRisk();

    const windZone = mapStateToWindZone(state, coordinates);

    return {
      windZone,
      windZoneDescription: getWindZoneDescription(windZone),
      maxWindSpeed: getMaxWindSpeed(windZone),
      stormSurgeZone: null,
      stormSurgeDescription: null,
      evacuationZone: null,
      historicalStorms: null,
      buildingCodeRequirements: getHurricaneBuildingRequirements(windZone),
      insuranceConsiderations: getHurricaneInsuranceConsiderations(windZone, state),
      dataSource: {
        name: 'NOAA',
        type: 'api',
        reliability: 'medium',
        lastUpdated: new Date(),
      },
      confidence: 70,
    };
  } catch (error) {
    console.error('[RiskAggregator] Hurricane risk fetch failed:', error);
    return createMinimalHurricaneRisk();
  }
}

async function fetchSinkholeRisk(
  coordinates: { lat: number; lng: number },
  state: string,
  timeout: number
): Promise<SinkholeRiskAnalysis | null> {
  try {
    // Sinkhole risk is primarily relevant for karst geology states
    const karstStates = ['FL', 'TX', 'AL', 'MO', 'KY', 'TN', 'PA', 'IN', 'OH', 'VA', 'WV'];
    const inKarstArea = karstStates.includes(state);

    return {
      riskLevel: inKarstArea ? 'low' : 'negligible',
      inKarstArea,
      karstType: inKarstArea ? 'limestone' : null,
      distanceToNearestSinkhole: null,
      sinkholesWithinOneMile: 0,
      sinkholesWithinFiveMiles: 0,
      subsidenceHistory: false,
      stateRequiresDisclosure: state === 'FL',
      insuranceConsiderations: inKarstArea
        ? ['Consider sinkhole coverage', 'May require geological survey']
        : [],
      mitigationRecommendations: inKarstArea
        ? ['Monitor for signs of subsidence', 'Maintain proper drainage']
        : [],
      dataSource: {
        name: 'State Geological Survey',
        type: 'estimated',
        reliability: 'medium',
      },
      confidence: 60,
    };
  } catch (error) {
    console.error('[RiskAggregator] Sinkhole risk fetch failed:', error);
    return createDefaultSinkholeRisk();
  }
}

async function fetchEnvironmentalRisk(
  coordinates: { lat: number; lng: number },
  timeout: number
): Promise<EnvironmentalContaminationAnalysis | null> {
  try {
    const epaService = getEPAService();
    const result = await Promise.race([
      epaService.getEnvironmentalSitesNearby(coordinates.lat, coordinates.lng, 1),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
    ]);

    if (!result || !result.data) return createDefaultEnvironmentalRisk();

    const envData = result.data;
    const superfundCount = envData.superfundSites?.length ?? 0;
    const brownfieldCount = envData.brownfieldSites?.length ?? 0;
    const ustCount = envData.ustSites?.length ?? 0;
    const triCount = envData.triFacilities?.length ?? 0;

    const totalSites = superfundCount + brownfieldCount + ustCount + triCount;
    const riskLevel = mapEnvironmentalSitesToRiskLevel(totalSites, superfundCount);

    return {
      riskLevel,
      superfundSitesNearby: superfundCount,
      brownfieldSitesNearby: brownfieldCount,
      ustSitesNearby: ustCount,
      triSitesNearby: triCount,
      nearestSite: null,
      nearbySites: [],
      phaseIRecommended: superfundCount > 0 || totalSites >= 3,
      groundwaterConcerns: superfundCount > 0 ? ['Potential groundwater contamination from nearby Superfund site'] : [],
      airQualityConcerns: triCount > 0 ? ['TRI facility nearby may affect air quality'] : [],
      historicalIndustrialUse: false,
      mitigationRecommendations: getEnvironmentalMitigationRecommendations(riskLevel, superfundCount > 0),
      dataSource: {
        name: 'EPA Envirofacts',
        type: 'api',
        reliability: 'high',
        lastUpdated: new Date(),
      },
      confidence: 80,
    };
  } catch (error) {
    console.error('[RiskAggregator] Environmental risk fetch failed:', error);
    return createDefaultEnvironmentalRisk();
  }
}

async function fetchRadonRisk(
  state: string,
  county: string | undefined,
  timeout: number
): Promise<RadonRiskAnalysis | null> {
  try {
    const epaService = getEPAService();
    const result = await Promise.race([
      epaService.getRadonZone(state, county),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
    ]);

    if (!result || !result.data) return createDefaultRadonRisk(state);

    const radonData = result.data;
    const radonZone = radonData.radonZone;
    const riskLevel = mapRadonZoneToRiskLevel(radonZone);

    return {
      radonZone,
      riskLevel,
      predictedLevel: radonData.predictedLevel ?? null,
      testingRecommended: radonZone <= 2,
      stateAverageLevel: null, // Not available from EPA API
      countyAverageLevel: null, // Not available from EPA API
      percentAboveActionLevel: null, // Not available from EPA API
      mitigationTypicallyNeeded: radonZone === 1,
      estimatedMitigationCost: radonZone === 1 ? { min: 800, max: 2500 } : null,
      stateDisclosureRequired: isRadonDisclosureRequired(state),
      mitigationRecommendations: getRadonMitigationRecommendations(radonZone),
      dataSource: {
        name: 'EPA Radon Data',
        type: 'api',
        reliability: 'high',
        lastUpdated: new Date(),
      },
      confidence: 85,
    };
  } catch (error) {
    console.error('[RiskAggregator] Radon risk fetch failed:', error);
    return createDefaultRadonRisk(state);
  }
}

async function fetchSlopeRisk(
  coordinates: { lat: number; lng: number },
  timeout: number
): Promise<SlopeRiskAnalysis | null> {
  try {
    const elevationService = getElevationService();
    const result = await Promise.race([
      elevationService.getElevationAnalysis(coordinates.lat, coordinates.lng),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
    ]);

    if (!result || !result.data) return createDefaultSlopeRisk();

    const elevData = result.data;
    const slopePercentage = elevData.terrain?.averageSlope ?? 0;
    const stabilityLevel = mapSlopeToStabilityLevel(slopePercentage);

    return {
      stabilityLevel,
      slopePercentage,
      maxSlopePercentage: elevData.terrain?.maxSlope ?? null,
      slopeAspect: elevData.terrain?.slopeDirection ?? null,
      landslideSusceptibility: mapSlopeToLandslideSusceptibility(slopePercentage),
      inLandslideZone: slopePercentage > 30,
      historicalLandslides: 0,
      soilType: null,
      drainageConsiderations: slopePercentage > 15 ? ['May require drainage improvements'] : [],
      mitigationRecommendations: getSlopeMitigationRecommendations(stabilityLevel),
      dataSource: {
        name: 'Open-Elevation',
        type: 'api',
        reliability: 'medium',
        lastUpdated: new Date(),
      },
      confidence: 70,
    };
  } catch (error) {
    console.error('[RiskAggregator] Slope risk fetch failed:', error);
    return createDefaultSlopeRisk();
  }
}

// ============================================
// Score Calculation Functions
// ============================================

function calculateCategoryScores(
  risks: {
    flood: FloodRiskAnalysis | null;
    earthquake: EarthquakeRiskAnalysis | null;
    wildfire: WildfireRiskAnalysis | null;
    hurricane: HurricaneRiskAnalysis | null;
    sinkhole: SinkholeRiskAnalysis | null;
    environmental: EnvironmentalContaminationAnalysis | null;
    radon: RadonRiskAnalysis | null;
    slope: SlopeRiskAnalysis | null;
  },
  weights: RiskWeights
): RiskCategoryScore[] {
  const scores: RiskCategoryScore[] = [];

  // Flood score (0-100, higher = more risk)
  const floodRaw = risks.flood ? riskLevelToScore(risks.flood.riskLevel) : 25;
  scores.push({
    category: 'flood',
    rawScore: floodRaw,
    weight: weights.flood,
    weightedScore: floodRaw * weights.flood,
    riskLevel: risks.flood?.riskLevel ?? 'low',
    dataAvailability: risks.flood ? 'full' : 'none',
  });

  // Earthquake score
  const earthquakeRaw = risks.earthquake ? hazardLevelToScore(risks.earthquake.hazardLevel) : 15;
  scores.push({
    category: 'earthquake',
    rawScore: earthquakeRaw,
    weight: weights.earthquake,
    weightedScore: earthquakeRaw * weights.earthquake,
    riskLevel: risks.earthquake ? mapHazardToRiskLevel(risks.earthquake.hazardLevel) : 'low',
    dataAvailability: risks.earthquake ? 'full' : 'none',
  });

  // Wildfire score
  const wildfireRaw = risks.wildfire ? wildfireRiskLevelToScore(risks.wildfire.riskLevel) : 15;
  scores.push({
    category: 'wildfire',
    rawScore: wildfireRaw,
    weight: weights.wildfire,
    weightedScore: wildfireRaw * weights.wildfire,
    riskLevel: risks.wildfire ? mapWildfireToRiskLevel(risks.wildfire.riskLevel) : 'low',
    dataAvailability: risks.wildfire ? 'full' : 'none',
  });

  // Hurricane score
  const hurricaneRaw = risks.hurricane ? windZoneToScore(risks.hurricane.windZone) : 10;
  scores.push({
    category: 'hurricane',
    rawScore: hurricaneRaw,
    weight: weights.hurricane,
    weightedScore: hurricaneRaw * weights.hurricane,
    riskLevel: risks.hurricane?.windZone ? 'moderate' : 'minimal',
    dataAvailability: risks.hurricane ? 'full' : 'none',
  });

  // Sinkhole score
  const sinkholeRaw = risks.sinkhole ? sinkholeRiskLevelToScore(risks.sinkhole.riskLevel) : 10;
  scores.push({
    category: 'sinkhole',
    rawScore: sinkholeRaw,
    weight: weights.sinkhole,
    weightedScore: sinkholeRaw * weights.sinkhole,
    riskLevel: risks.sinkhole ? mapSinkholeToRiskLevel(risks.sinkhole.riskLevel) : 'minimal',
    dataAvailability: risks.sinkhole ? 'partial' : 'none',
  });

  // Environmental score
  const environmentalRaw = risks.environmental ? contaminationRiskLevelToScore(risks.environmental.riskLevel) : 15;
  scores.push({
    category: 'environmental',
    rawScore: environmentalRaw,
    weight: weights.environmental,
    weightedScore: environmentalRaw * weights.environmental,
    riskLevel: risks.environmental ? mapContaminationToRiskLevel(risks.environmental.riskLevel) : 'low',
    dataAvailability: risks.environmental ? 'full' : 'none',
  });

  // Radon score
  const radonRaw = risks.radon ? radonZoneToScore(risks.radon.radonZone) : 30;
  scores.push({
    category: 'radon',
    rawScore: radonRaw,
    weight: weights.radon,
    weightedScore: radonRaw * weights.radon,
    riskLevel: risks.radon?.riskLevel ?? 'moderate',
    dataAvailability: risks.radon ? 'full' : 'none',
  });

  // Slope score
  const slopeRaw = risks.slope ? stabilityLevelToScore(risks.slope.stabilityLevel) : 15;
  scores.push({
    category: 'slope',
    rawScore: slopeRaw,
    weight: weights.slope,
    weightedScore: slopeRaw * weights.slope,
    riskLevel: risks.slope ? mapStabilityToRiskLevel(risks.slope.stabilityLevel) : 'low',
    dataAvailability: risks.slope ? 'partial' : 'none',
  });

  return scores;
}

function calculateOverallRiskScore(
  categoryScores: RiskCategoryScore[],
  weights: RiskWeights
): number {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightedSum = categoryScores.reduce((sum, score) => sum + score.weightedScore, 0);
  return Math.round(weightedSum / totalWeight);
}

function determineOverallRiskLevel(riskScore: number): OverallRiskLevel {
  if (riskScore >= 70) return 'severe';
  if (riskScore >= 50) return 'high';
  if (riskScore >= 30) return 'moderate';
  return 'low';
}

function calculateConfidenceLevel(categoryScores: RiskCategoryScore[]): number {
  const availabilityScores: Record<string, number> = {
    full: 100,
    partial: 60,
    none: 30,
  };

  const totalConfidence = categoryScores.reduce(
    (sum, score) => sum + availabilityScores[score.dataAvailability],
    0
  );
  return Math.round(totalConfidence / categoryScores.length);
}

// ============================================
// Insurance Estimation
// ============================================

function calculateInsuranceEstimates(
  risks: {
    flood: FloodRiskAnalysis | null;
    earthquake: EarthquakeRiskAnalysis | null;
    wildfire: WildfireRiskAnalysis | null;
    hurricane: HurricaneRiskAnalysis | null;
  },
  propertyValue: number,
  buildingSqft: number
): InsuranceEstimates {
  const warnings: string[] = [];

  // Flood insurance
  let floodInsurance: number | null = null;
  if (risks.flood?.insuranceRequired) {
    floodInsurance = risks.flood.annualPremiumEstimate ?? Math.round(propertyValue * 0.005);
  }

  // Earthquake insurance (typically 0.5-1.5% of coverage in high-risk areas)
  let earthquakeInsurance: number | null = null;
  if (risks.earthquake && risks.earthquake.hazardLevel !== 'very_low' && risks.earthquake.hazardLevel !== 'low') {
    earthquakeInsurance = Math.round(propertyValue * 0.008);
    warnings.push('Earthquake insurance recommended for this area');
  }

  // Fire/wildfire insurance
  let fireInsurance: number | null = null;
  if (risks.wildfire && ['high', 'very_high', 'extreme'].includes(risks.wildfire.riskLevel)) {
    fireInsurance = Math.round(propertyValue * 0.012);
    warnings.push('Additional wildfire coverage may be required or difficult to obtain');
  }

  // Windstorm/hurricane insurance
  let windstormInsurance: number | null = null;
  if (risks.hurricane?.windZone && risks.hurricane.windZone !== null) {
    windstormInsurance = Math.round(propertyValue * 0.015);
    warnings.push('Separate windstorm policy may be required');
  }

  const totalAnnualCost =
    (floodInsurance ?? 0) +
    (earthquakeInsurance ?? 0) +
    (fireInsurance ?? 0) +
    (windstormInsurance ?? 0);

  return {
    floodInsurance,
    earthquakeInsurance,
    fireInsurance,
    windstormInsurance,
    totalAnnualCost,
    availabilityWarnings: warnings,
  };
}

// ============================================
// Recommendations Generation
// ============================================

function generateRecommendations(
  risks: {
    flood: FloodRiskAnalysis | null;
    earthquake: EarthquakeRiskAnalysis | null;
    wildfire: WildfireRiskAnalysis | null;
    hurricane: HurricaneRiskAnalysis | null;
    sinkhole: SinkholeRiskAnalysis | null;
    environmental: EnvironmentalContaminationAnalysis | null;
    radon: RadonRiskAnalysis | null;
    slope: SlopeRiskAnalysis | null;
  },
  categoryScores: RiskCategoryScore[]
): { recommendations: string[]; mitigationActions: RiskMitigation[] } {
  const recommendations: string[] = [];
  const mitigationActions: RiskMitigation[] = [];

  // Sort categories by risk score (highest first)
  const sortedScores = [...categoryScores].sort((a, b) => b.rawScore - a.rawScore);

  // Generate recommendations for top risks
  for (const score of sortedScores.slice(0, 3)) {
    if (score.rawScore < 30) continue; // Skip low-risk categories

    switch (score.category) {
      case 'flood':
        if (risks.flood?.insuranceRequired) {
          recommendations.push('Obtain flood insurance before closing');
          mitigationActions.push({
            riskType: 'flood',
            action: 'Elevate utilities and HVAC above flood level',
            priority: 1,
            estimatedCost: { min: 2000, max: 8000 },
            effectiveness: 'high',
            timeframe: '1-2 weeks',
            insuranceImpact: 'May reduce flood insurance premium by 10-20%',
            roiExplanation: 'Prevents costly water damage to critical systems',
          });
        }
        break;

      case 'earthquake':
        recommendations.push('Consider earthquake insurance');
        mitigationActions.push({
          riskType: 'earthquake',
          action: 'Secure water heater and heavy furniture',
          priority: 2,
          estimatedCost: { min: 200, max: 500 },
          effectiveness: 'moderate',
          timeframe: '1 day',
          insuranceImpact: null,
          roiExplanation: 'Low-cost prevention of common earthquake damage',
        });
        break;

      case 'wildfire':
        recommendations.push('Create defensible space around property');
        mitigationActions.push({
          riskType: 'wildfire',
          action: 'Create 30-foot defensible space zone',
          priority: 1,
          estimatedCost: { min: 500, max: 3000 },
          effectiveness: 'very_high',
          timeframe: '1-2 weeks',
          insuranceImpact: 'Required by many insurers, may reduce premiums',
          roiExplanation: 'Significantly reduces fire damage risk',
        });
        break;

      case 'environmental':
        if (risks.environmental?.phaseIRecommended) {
          recommendations.push('Order Phase I Environmental Site Assessment before purchase');
        }
        break;

      case 'radon':
        if (risks.radon?.testingRecommended) {
          recommendations.push('Conduct radon testing before closing');
          mitigationActions.push({
            riskType: 'radon',
            action: 'Install radon mitigation system if levels exceed 4 pCi/L',
            priority: 2,
            estimatedCost: { min: 800, max: 2500 },
            effectiveness: 'very_high',
            timeframe: '1-2 days',
            insuranceImpact: null,
            roiExplanation: 'Protects occupant health from radiation exposure',
          });
        }
        break;
    }
  }

  return { recommendations, mitigationActions };
}

function analyzeRiskFactors(
  risks: {
    flood: FloodRiskAnalysis | null;
    earthquake: EarthquakeRiskAnalysis | null;
    wildfire: WildfireRiskAnalysis | null;
    hurricane: HurricaneRiskAnalysis | null;
    sinkhole: SinkholeRiskAnalysis | null;
    environmental: EnvironmentalContaminationAnalysis | null;
    radon: RadonRiskAnalysis | null;
    slope: SlopeRiskAnalysis | null;
  },
  categoryScores: RiskCategoryScore[]
): { topRiskFactors: string[]; positiveFactors: string[]; warnings: string[] } {
  const topRiskFactors: string[] = [];
  const positiveFactors: string[] = [];
  const warnings: string[] = [];

  // Analyze each risk category
  if (risks.flood) {
    if (risks.flood.riskLevel === 'high' || risks.flood.riskLevel === 'very_high') {
      topRiskFactors.push(`Located in FEMA ${risks.flood.zone} flood zone`);
      warnings.push('Flood insurance is required for this property');
    } else if (risks.flood.riskLevel === 'minimal' || risks.flood.riskLevel === 'low') {
      positiveFactors.push('Low flood risk (Zone X)');
    }
  }

  if (risks.earthquake) {
    if (risks.earthquake.hazardLevel === 'high' || risks.earthquake.hazardLevel === 'very_high') {
      topRiskFactors.push('Located in high seismic hazard area');
    } else if (risks.earthquake.hazardLevel === 'very_low') {
      positiveFactors.push('Minimal earthquake risk');
    }
  }

  if (risks.wildfire) {
    if (['high', 'very_high', 'extreme'].includes(risks.wildfire.riskLevel)) {
      topRiskFactors.push(`Wildfire risk level: ${risks.wildfire.riskLevel}`);
      if (risks.wildfire.activeFiresNearby > 0) {
        warnings.push(`${risks.wildfire.activeFiresNearby} active fires within 25 miles`);
      }
    } else if (risks.wildfire.riskLevel === 'minimal' || risks.wildfire.riskLevel === 'low') {
      positiveFactors.push('Low wildfire risk');
    }
  }

  if (risks.environmental) {
    if (risks.environmental.superfundSitesNearby > 0) {
      topRiskFactors.push(`${risks.environmental.superfundSitesNearby} Superfund site(s) within 1 mile`);
      warnings.push('Phase I ESA strongly recommended');
    }
    if (risks.environmental.riskLevel === 'none_known') {
      positiveFactors.push('No known environmental contamination nearby');
    }
  }

  if (risks.radon?.radonZone === 1) {
    topRiskFactors.push('Located in EPA Radon Zone 1 (highest risk)');
  } else if (risks.radon?.radonZone === 3) {
    positiveFactors.push('Low radon risk area (Zone 3)');
  }

  return { topRiskFactors, positiveFactors, warnings };
}

// ============================================
// Helper Functions
// ============================================

function extractResult<T>(result: PromiseSettledResult<T | null>): T | null {
  if (result.status === 'fulfilled') {
    return result.value;
  }
  return null;
}

function getAdjustedWeights(state: string): RiskWeights {
  const stateAdjustments = STATE_WEIGHT_ADJUSTMENTS[state];
  if (!stateAdjustments) {
    return DEFAULT_WEIGHTS;
  }

  // Merge adjustments with defaults
  const adjusted = { ...DEFAULT_WEIGHTS, ...stateAdjustments };

  // Normalize weights to sum to 1.0
  const total = Object.values(adjusted).reduce((a, b) => a + b, 0);
  const normalized: RiskWeights = {
    flood: adjusted.flood / total,
    earthquake: adjusted.earthquake / total,
    wildfire: adjusted.wildfire / total,
    hurricane: adjusted.hurricane / total,
    sinkhole: adjusted.sinkhole / total,
    environmental: adjusted.environmental / total,
    radon: adjusted.radon / total,
    slope: adjusted.slope / total,
  };

  return normalized;
}

// Mapping functions for risk levels to scores (0-100, higher = more risk)
function riskLevelToScore(level: RiskLevel): number {
  const scores: Record<RiskLevel, number> = {
    minimal: 10,
    low: 25,
    moderate: 50,
    high: 75,
    very_high: 90,
  };
  return scores[level];
}

function hazardLevelToScore(level: string): number {
  const scores: Record<string, number> = {
    very_low: 10,
    low: 25,
    moderate: 50,
    high: 75,
    very_high: 90,
  };
  return scores[level] ?? 50;
}

function wildfireRiskLevelToScore(level: string): number {
  const scores: Record<string, number> = {
    minimal: 5,
    low: 15,
    moderate: 40,
    high: 65,
    very_high: 85,
    extreme: 95,
  };
  return scores[level] ?? 40;
}

function windZoneToScore(zone: string | null): number {
  if (!zone) return 10;
  const scores: Record<string, number> = {
    zone_1: 30,
    zone_2: 50,
    zone_3: 70,
    zone_4: 90,
  };
  return scores[zone] ?? 30;
}

function sinkholeRiskLevelToScore(level: string): number {
  const scores: Record<string, number> = {
    negligible: 5,
    low: 20,
    moderate: 45,
    high: 70,
    very_high: 90,
  };
  return scores[level] ?? 20;
}

function contaminationRiskLevelToScore(level: string): number {
  const scores: Record<string, number> = {
    none_known: 10,
    low: 25,
    moderate: 50,
    high: 75,
    severe: 95,
  };
  return scores[level] ?? 25;
}

function radonZoneToScore(zone: 1 | 2 | 3): number {
  const scores: Record<number, number> = {
    1: 75,
    2: 45,
    3: 15,
  };
  return scores[zone] ?? 45;
}

function stabilityLevelToScore(level: string): number {
  const scores: Record<string, number> = {
    stable: 10,
    marginally_stable: 35,
    unstable: 65,
    highly_unstable: 90,
  };
  return scores[level] ?? 35;
}

// Risk level mapping functions
function mapFloodZoneToRiskLevel(zone: FEMAFloodZone): RiskLevel {
  if (['X', 'C'].includes(zone)) return 'minimal';
  if (['X500', 'B'].includes(zone)) return 'low';
  if (['D', 'A99', 'AR'].includes(zone)) return 'moderate';
  if (['A', 'AE', 'AH', 'AO'].includes(zone)) return 'high';
  if (['V', 'VE'].includes(zone)) return 'very_high';
  return 'moderate';
}

function mapPGAToHazardLevel(pga: number): 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' {
  if (pga < 0.1) return 'very_low';
  if (pga < 0.2) return 'low';
  if (pga < 0.4) return 'moderate';
  if (pga < 0.6) return 'high';
  return 'very_high';
}

function mapPGAToDesignCategory(pga: number): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | null {
  if (pga < 0.15) return 'A';
  if (pga < 0.25) return 'B';
  if (pga < 0.35) return 'C';
  if (pga < 0.50) return 'D';
  if (pga < 0.75) return 'E';
  return 'F';
}

function mapActiveFiresToRiskLevel(count: number): 'minimal' | 'low' | 'moderate' | 'high' | 'very_high' | 'extreme' {
  if (count === 0) return 'minimal';
  if (count <= 2) return 'low';
  if (count <= 5) return 'moderate';
  if (count <= 10) return 'high';
  if (count <= 20) return 'very_high';
  return 'extreme';
}

function mapEnvironmentalSitesToRiskLevel(total: number, superfund: number): 'none_known' | 'low' | 'moderate' | 'high' | 'severe' {
  if (total === 0) return 'none_known';
  if (superfund > 0) return superfund > 1 ? 'severe' : 'high';
  if (total <= 2) return 'low';
  if (total <= 5) return 'moderate';
  return 'high';
}

function mapRadonZoneToRiskLevel(zone: 1 | 2 | 3): RiskLevel {
  if (zone === 1) return 'high';
  if (zone === 2) return 'moderate';
  return 'low';
}

function mapSlopeToStabilityLevel(slope: number): 'stable' | 'marginally_stable' | 'unstable' | 'highly_unstable' {
  if (slope < 10) return 'stable';
  if (slope < 20) return 'marginally_stable';
  if (slope < 35) return 'unstable';
  return 'highly_unstable';
}

function mapSlopeToLandslideSusceptibility(slope: number): 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' {
  if (slope < 5) return 'very_low';
  if (slope < 15) return 'low';
  if (slope < 25) return 'moderate';
  if (slope < 40) return 'high';
  return 'very_high';
}

// Additional helper mappings
function mapHazardToRiskLevel(hazard: string): RiskLevel {
  const map: Record<string, RiskLevel> = {
    very_low: 'minimal',
    low: 'low',
    moderate: 'moderate',
    high: 'high',
    very_high: 'very_high',
  };
  return map[hazard] ?? 'moderate';
}

function mapWildfireToRiskLevel(wildfire: string): RiskLevel {
  const map: Record<string, RiskLevel> = {
    minimal: 'minimal',
    low: 'low',
    moderate: 'moderate',
    high: 'high',
    very_high: 'very_high',
    extreme: 'very_high',
  };
  return map[wildfire] ?? 'moderate';
}

function mapSinkholeToRiskLevel(sinkhole: string): RiskLevel {
  const map: Record<string, RiskLevel> = {
    negligible: 'minimal',
    low: 'low',
    moderate: 'moderate',
    high: 'high',
    very_high: 'very_high',
  };
  return map[sinkhole] ?? 'low';
}

function mapContaminationToRiskLevel(contamination: string): RiskLevel {
  const map: Record<string, RiskLevel> = {
    none_known: 'minimal',
    low: 'low',
    moderate: 'moderate',
    high: 'high',
    severe: 'very_high',
  };
  return map[contamination] ?? 'low';
}

function mapStabilityToRiskLevel(stability: string): RiskLevel {
  const map: Record<string, RiskLevel> = {
    stable: 'minimal',
    marginally_stable: 'low',
    unstable: 'high',
    highly_unstable: 'very_high',
  };
  return map[stability] ?? 'low';
}

// Insurance and other helpers
function isFloodInsuranceRequired(zone: FEMAFloodZone): boolean {
  const requiredZones = ['A', 'AE', 'AH', 'AO', 'AR', 'A99', 'V', 'VE'];
  return requiredZones.includes(zone);
}

function estimateFloodInsurancePremium(zone: FEMAFloodZone): number {
  const premiums: Record<string, number> = {
    X: 0,
    C: 0,
    X500: 400,
    B: 400,
    D: 600,
    A: 1200,
    AE: 1500,
    AH: 1500,
    AO: 1500,
    AR: 1800,
    A99: 1000,
    V: 3500,
    VE: 4000,
  };
  return premiums[zone] ?? 1000;
}

function getFloodZoneDescription(zone: FEMAFloodZone): string {
  const descriptions: Record<string, string> = {
    X: 'Minimal flood hazard area',
    C: 'Minimal flood hazard area (legacy)',
    X500: '500-year floodplain (moderate risk)',
    B: 'Moderate flood hazard area (legacy)',
    D: 'Undetermined flood hazard',
    A: '100-year floodplain (high risk)',
    AE: '100-year floodplain with BFE determined',
    AH: 'Shallow flooding area (1-3 feet)',
    AO: 'Sheet flow flooding area',
    AR: 'High risk during levee restoration',
    A99: 'Protected by levee under construction',
    V: 'Coastal high-hazard with wave action',
    VE: 'Coastal high-hazard with BFE determined',
  };
  return descriptions[zone] ?? 'Unknown flood zone';
}

function mapStateToWindZone(state: string, coordinates: { lat: number; lng: number }): 'zone_1' | 'zone_2' | 'zone_3' | 'zone_4' | null {
  // Simplified wind zone mapping based on state
  const zone4States = ['FL']; // Coastal Florida
  const zone3States = ['TX', 'LA', 'MS', 'AL']; // Gulf Coast
  const zone2States = ['NC', 'SC', 'GA']; // Atlantic Coast
  const zone1States = ['VA', 'MD', 'DE', 'NJ', 'NY', 'CT', 'RI', 'MA']; // Northern Atlantic

  if (zone4States.includes(state) && coordinates.lat < 27) return 'zone_4';
  if (zone4States.includes(state)) return 'zone_3';
  if (zone3States.includes(state)) return 'zone_3';
  if (zone2States.includes(state)) return 'zone_2';
  if (zone1States.includes(state)) return 'zone_1';
  return null;
}

function getWindZoneDescription(zone: 'zone_1' | 'zone_2' | 'zone_3' | 'zone_4' | null): string | null {
  if (!zone) return null;
  const descriptions: Record<string, string> = {
    zone_1: 'Basic wind speed 90-100 mph',
    zone_2: 'Basic wind speed 100-110 mph',
    zone_3: 'Basic wind speed 110-140 mph',
    zone_4: 'Basic wind speed 140+ mph (extreme)',
  };
  return descriptions[zone];
}

function getMaxWindSpeed(zone: 'zone_1' | 'zone_2' | 'zone_3' | 'zone_4' | null): number | null {
  if (!zone) return null;
  const speeds: Record<string, number> = {
    zone_1: 100,
    zone_2: 110,
    zone_3: 140,
    zone_4: 170,
  };
  return speeds[zone];
}

function isRadonDisclosureRequired(state: string): boolean {
  const disclosureStates = ['PA', 'NJ', 'IL', 'MN', 'FL', 'CA', 'CO', 'IA', 'ME', 'MD', 'NE', 'OH', 'RI', 'VA'];
  return disclosureStates.includes(state);
}

// Mitigation recommendation functions
function getFloodMitigationRecommendations(zone: FEMAFloodZone): string[] {
  if (['X', 'C'].includes(zone)) return [];
  const recs = ['Consider flood insurance even if not required'];
  if (['A', 'AE', 'AH', 'AO', 'V', 'VE'].includes(zone)) {
    recs.push('Elevate utilities above Base Flood Elevation');
    recs.push('Install flood vents in foundation');
    recs.push('Use flood-resistant building materials');
  }
  return recs;
}

function getEarthquakeMitigationRecommendations(hazard: string): string[] {
  if (hazard === 'very_low') return [];
  const recs = ['Secure water heater and large appliances'];
  if (['moderate', 'high', 'very_high'].includes(hazard)) {
    recs.push('Consider seismic retrofit for foundation');
    recs.push('Install flexible gas line connections');
    recs.push('Bolt bookcases and heavy furniture to walls');
  }
  return recs;
}

function getWildfireBuildingRequirements(risk: string): string[] {
  if (['minimal', 'low'].includes(risk)) return [];
  return [
    'Class A fire-rated roofing required',
    'Non-combustible exterior materials recommended',
    'Tempered glass windows in high-risk areas',
  ];
}

function getWildfireInsuranceConsiderations(risk: string): string[] {
  if (['minimal', 'low'].includes(risk)) return [];
  return [
    'May require specialized wildfire coverage',
    'Some insurers may not offer coverage in extreme risk areas',
    'Defensible space may be required for coverage',
  ];
}

function getWildfireMitigationRecommendations(risk: string): string[] {
  if (['minimal', 'low'].includes(risk)) return [];
  return [
    'Create and maintain defensible space (minimum 30 feet)',
    'Remove dead vegetation and debris from property',
    'Install ember-resistant vents',
    'Keep gutters clean of debris',
  ];
}

function getHurricaneBuildingRequirements(zone: 'zone_1' | 'zone_2' | 'zone_3' | 'zone_4' | null): string[] {
  if (!zone) return [];
  const requirements = ['Impact-resistant windows or shutters required'];
  if (['zone_3', 'zone_4'].includes(zone)) {
    requirements.push('Hurricane straps/clips for roof-to-wall connections');
    requirements.push('Reinforced garage doors');
    requirements.push('Miami-Dade County approved products in FL');
  }
  return requirements;
}

function getHurricaneInsuranceConsiderations(zone: 'zone_1' | 'zone_2' | 'zone_3' | 'zone_4' | null, state: string): string[] {
  if (!zone) return [];
  const considerations = ['Separate windstorm deductible may apply'];
  if (state === 'FL') {
    considerations.push('Citizens Insurance may be only option in high-risk areas');
  }
  if (['zone_3', 'zone_4'].includes(zone)) {
    considerations.push('Higher premiums in coastal areas');
    considerations.push('Wind mitigation credits available for retrofits');
  }
  return considerations;
}

function getEnvironmentalMitigationRecommendations(risk: string, hasSuperfund: boolean): string[] {
  const recs: string[] = [];
  if (hasSuperfund) {
    recs.push('Order Phase I Environmental Site Assessment');
    recs.push('Check EPA Superfund site status and remediation progress');
    recs.push('Test well water if using private well');
  }
  if (['moderate', 'high', 'severe'].includes(risk)) {
    recs.push('Research property historical use');
    recs.push('Consider soil and groundwater testing');
  }
  return recs;
}

function getRadonMitigationRecommendations(zone: 1 | 2 | 3): string[] {
  if (zone === 3) return ['Radon testing optional but recommended'];
  const recs = ['Conduct short-term radon test'];
  if (zone === 1) {
    recs.push('Plan for radon mitigation system if levels exceed 4 pCi/L');
    recs.push('Budget $800-$2,500 for mitigation system');
  }
  return recs;
}

function getSlopeMitigationRecommendations(stability: string): string[] {
  if (stability === 'stable') return [];
  const recs = ['Ensure proper drainage away from foundation'];
  if (['unstable', 'highly_unstable'].includes(stability)) {
    recs.push('Consider retaining wall installation');
    recs.push('Plant deep-rooted vegetation for erosion control');
    recs.push('Consult geotechnical engineer');
  }
  return recs;
}

// Default risk creators for when API calls fail
function createDefaultFloodRisk(): FloodRiskAnalysis {
  return {
    zone: 'X',
    zoneDescription: 'Minimal flood hazard (assumed)',
    riskLevel: 'low',
    insuranceRequired: false,
    annualPremiumEstimate: null,
    baseFloodElevation: null,
    propertyElevation: null,
    elevationDifference: null,
    floodwayStatus: null,
    historicalFlooding: null,
    mitigationRecommendations: [],
    dataSource: { name: 'Default', type: 'default', reliability: 'low' },
    confidence: 30,
  };
}

function createDefaultEarthquakeRisk(): EarthquakeRiskAnalysis {
  return {
    hazardLevel: 'low',
    pga: 0.1,
    spectralAcceleration02: null,
    spectralAcceleration10: null,
    distanceToFault: null,
    nearestFaultName: null,
    historicalQuakeCount: 0,
    maxHistoricalMagnitude: null,
    seismicDesignCategory: 'A',
    mitigationRecommendations: [],
    dataSource: { name: 'Default', type: 'default', reliability: 'low' },
    confidence: 30,
  };
}

function createDefaultWildfireRisk(): WildfireRiskAnalysis {
  return {
    riskLevel: 'low',
    whpScore: null,
    inWUI: false,
    wuiType: null,
    activeFiresNearby: 0,
    distanceToNearestFire: null,
    historicalFireCount: 0,
    recentAcresBurned: null,
    fuelLoad: null,
    defensibleSpaceRequired: false,
    buildingRequirements: [],
    insuranceConsiderations: [],
    evacuationAccessibility: null,
    mitigationRecommendations: [],
    dataSource: { name: 'Default', type: 'default', reliability: 'low' },
    confidence: 30,
  };
}

function createMinimalHurricaneRisk(): HurricaneRiskAnalysis {
  return {
    windZone: null,
    windZoneDescription: null,
    maxWindSpeed: null,
    stormSurgeZone: null,
    stormSurgeDescription: null,
    evacuationZone: null,
    historicalStorms: null,
    buildingCodeRequirements: [],
    insuranceConsiderations: [],
    dataSource: { name: 'Default', type: 'estimated', reliability: 'medium' },
    confidence: 70,
  };
}

function createDefaultSinkholeRisk(): SinkholeRiskAnalysis {
  return {
    riskLevel: 'negligible',
    inKarstArea: false,
    karstType: null,
    distanceToNearestSinkhole: null,
    sinkholesWithinOneMile: 0,
    sinkholesWithinFiveMiles: 0,
    subsidenceHistory: false,
    stateRequiresDisclosure: false,
    insuranceConsiderations: [],
    mitigationRecommendations: [],
    dataSource: { name: 'Default', type: 'default', reliability: 'low' },
    confidence: 30,
  };
}

function createDefaultEnvironmentalRisk(): EnvironmentalContaminationAnalysis {
  return {
    riskLevel: 'low',
    superfundSitesNearby: 0,
    brownfieldSitesNearby: 0,
    ustSitesNearby: 0,
    triSitesNearby: 0,
    nearestSite: null,
    nearbySites: [],
    phaseIRecommended: false,
    groundwaterConcerns: [],
    airQualityConcerns: [],
    historicalIndustrialUse: false,
    mitigationRecommendations: [],
    dataSource: { name: 'Default', type: 'default', reliability: 'low' },
    confidence: 30,
  };
}

function createDefaultRadonRisk(state: string): RadonRiskAnalysis {
  // Default based on EPA zone data for common states
  const highRadonStates = ['PA', 'OH', 'IA', 'NE', 'ND', 'SD', 'MT', 'ID', 'CO'];
  const radonZone: 1 | 2 | 3 = highRadonStates.includes(state) ? 1 : 2;

  return {
    radonZone,
    riskLevel: radonZone === 1 ? 'high' : 'moderate',
    predictedLevel: null,
    testingRecommended: radonZone <= 2,
    stateAverageLevel: null,
    countyAverageLevel: null,
    percentAboveActionLevel: null,
    mitigationTypicallyNeeded: radonZone === 1,
    estimatedMitigationCost: radonZone === 1 ? { min: 800, max: 2500 } : null,
    stateDisclosureRequired: isRadonDisclosureRequired(state),
    mitigationRecommendations: getRadonMitigationRecommendations(radonZone),
    dataSource: { name: 'Default', type: 'estimated', reliability: 'medium' },
    confidence: 50,
  };
}

function createDefaultSlopeRisk(): SlopeRiskAnalysis {
  return {
    stabilityLevel: 'stable',
    slopePercentage: 5,
    maxSlopePercentage: null,
    slopeAspect: null,
    landslideSusceptibility: 'low',
    inLandslideZone: false,
    historicalLandslides: 0,
    soilType: null,
    drainageConsiderations: [],
    mitigationRecommendations: [],
    dataSource: { name: 'Default', type: 'default', reliability: 'low' },
    confidence: 30,
  };
}
