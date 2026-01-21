/**
 * Environmental Risk Analyzer
 *
 * Analyzes environmental contamination and radon risks for properties using
 * EPA Envirofacts data for contamination sites and EPA radon zone data.
 *
 * Risk Types:
 * - Contamination: Superfund, brownfield, UST, TRI, RCRA sites nearby
 * - Radon: Indoor radon potential based on geology and zone classification
 *
 * @module lib/risk/environmental/environmental-analyzer
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import {
  EnvironmentalContaminationAnalysis,
  RadonRiskAnalysis,
  EnvironmentalRiskResult,
  ContaminationRiskLevel,
  ContaminationSite,
  RadonZone,
  RiskLevel,
  DataSource,
} from '@/types/risk-analysis';
import {
  getEPAService,
  EnvironmentalSitesSummary,
  RadonZoneData,
  EPASiteType,
} from '@/lib/api/services';

// ============================================================================
// Constants
// ============================================================================

/**
 * States with radon disclosure requirements
 */
const RADON_DISCLOSURE_STATES: Record<string, boolean> = {
  AK: true,
  CA: true,
  CO: true,
  CT: true,
  FL: true,
  IL: true,
  IN: true,
  IA: true,
  KS: true,
  ME: true,
  MD: true,
  MI: true,
  MN: true,
  MT: true,
  NE: true,
  NH: true,
  NJ: true,
  NY: true,
  NC: true,
  OH: true,
  PA: true,
  RI: true,
  SD: true,
  TN: true,
  VA: true,
  WI: true,
};

/**
 * Contaminant categories and their risk factors
 */
const CONTAMINANT_RISK_FACTORS: Record<string, number> = {
  'heavy metals': 1.5,
  'lead': 1.4,
  'arsenic': 1.5,
  'petroleum': 1.2,
  'benzene': 1.4,
  'toluene': 1.2,
  'pcb': 1.5,
  'tce': 1.4,
  'pce': 1.4,
  'chlorinated solvents': 1.4,
  'asbestos': 1.3,
  'radioactive': 1.6,
  'pesticides': 1.3,
};

// ============================================================================
// Contamination Risk Analysis
// ============================================================================

/**
 * Analyzes environmental contamination risk for a property
 *
 * @param coordinates - Property coordinates
 * @param stateCode - State code for disclosure requirements
 * @param countyFips - County FIPS for additional context
 * @returns Contamination risk analysis
 *
 * @example
 * ```typescript
 * const analysis = await analyzeContaminationRisk(
 *   { latitude: 40.7128, longitude: -74.0060 },
 *   'NY'
 * );
 * console.log(analysis.riskLevel); // 'low'
 * ```
 */
export async function analyzeContaminationRisk(
  coordinates: { latitude: number; longitude: number },
  stateCode: string,
  countyFips?: string
): Promise<EnvironmentalContaminationAnalysis> {
  const epaService = getEPAService();
  const { latitude, longitude } = coordinates;

  // Get environmental sites within 2 miles
  const sitesResponse = await epaService.getEnvironmentalSitesNearby(
    latitude,
    longitude,
    2 // 2 mile radius
  );

  const sites = sitesResponse.data;

  // Convert EPA sites to ContaminationSite format
  const nearbySites: ContaminationSite[] = convertToContaminationSites(sites, latitude, longitude);

  // Determine risk level based on site proximity and count
  const riskLevel = calculateContaminationRiskLevel(sites);

  // Find nearest site
  const nearestSite = nearbySites.length > 0 ? nearbySites[0] : null;

  // Determine if Phase I ESA is recommended
  const phaseIRecommended = determinePhaseIRecommendation(sites, nearestSite);

  // Identify groundwater concerns
  const groundwaterConcerns = identifyGroundwaterConcerns(sites);

  // Identify air quality concerns
  const airQualityConcerns = identifyAirQualityConcerns(sites);

  // Check for historical industrial use indicators
  const historicalIndustrialUse = sites.counts.brownfield > 0 || sites.counts.rcra > 2;

  // Generate mitigation recommendations
  const mitigationRecommendations = generateContaminationMitigations(
    riskLevel,
    nearestSite,
    phaseIRecommended,
    groundwaterConcerns.length > 0
  );

  // Calculate confidence based on data availability
  const confidence = calculateContaminationConfidence(sites);

  return {
    riskLevel,
    superfundSitesNearby: sites.counts.superfund,
    brownfieldSitesNearby: sites.counts.brownfield,
    ustSitesNearby: sites.counts.ust,
    triSitesNearby: sites.counts.tri,
    nearestSite,
    nearbySites,
    phaseIRecommended,
    groundwaterConcerns,
    airQualityConcerns,
    historicalIndustrialUse,
    mitigationRecommendations,
    dataSource: {
      name: 'EPA Envirofacts',
      type: 'api',
      url: 'https://www.epa.gov/enviro',
      reliability: 'high',
    },
    confidence,
  };
}

/**
 * Converts EPA sites summary to ContaminationSite array
 */
function convertToContaminationSites(
  sites: EnvironmentalSitesSummary,
  queryLat: number,
  queryLng: number
): ContaminationSite[] {
  const contaminationSites: ContaminationSite[] = [];

  // Add Superfund sites
  for (const site of sites.superfundSites) {
    contaminationSites.push({
      name: site.name,
      epaId: site.epaId,
      type: 'superfund',
      status: site.status,
      distanceMiles: site.distanceMiles || 0,
      direction: site.direction || 'N',
      contaminants: site.contaminants,
      groundwaterImpact: true, // Superfund sites typically have groundwater impact
    });
  }

  // Add Brownfield sites
  for (const site of sites.brownfieldSites) {
    contaminationSites.push({
      name: site.name,
      epaId: site.siteId,
      type: 'brownfield',
      status: mapCleanupStatus(site.cleanupStatus),
      distanceMiles: site.distanceMiles || 0,
      direction: site.direction || 'N',
      contaminants: [],
      groundwaterImpact: false,
    });
  }

  // Add UST sites
  for (const site of sites.ustSites) {
    contaminationSites.push({
      name: site.name,
      epaId: site.facilityId,
      type: 'ust',
      status: site.hasRelease ? 'active' : 'monitored',
      distanceMiles: site.distanceMiles || 0,
      direction: site.direction || 'N',
      contaminants: site.tankContents,
      groundwaterImpact: site.hasRelease,
    });
  }

  // Add TRI facilities
  for (const facility of sites.triFacilities) {
    contaminationSites.push({
      name: facility.name,
      epaId: facility.triId,
      type: 'tri',
      status: 'active',
      distanceMiles: facility.distanceMiles || 0,
      direction: facility.direction || 'N',
      contaminants: facility.chemicals,
      groundwaterImpact: facility.landReleasesLbs > 0,
    });
  }

  // Add RCRA facilities
  for (const facility of sites.rcraFacilities) {
    contaminationSites.push({
      name: facility.name,
      epaId: facility.handlerId,
      type: 'rcra',
      status: facility.hasViolations ? 'active' : 'monitored',
      distanceMiles: facility.distanceMiles || 0,
      direction: facility.direction || 'N',
      contaminants: facility.wasteTypes,
      groundwaterImpact: false,
    });
  }

  // Sort by distance
  contaminationSites.sort((a, b) => a.distanceMiles - b.distanceMiles);

  return contaminationSites;
}

/**
 * Maps EPA cleanup status to our standard status
 */
function mapCleanupStatus(status: string): ContaminationSite['status'] {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('complet') || lowerStatus.includes('closed')) {
    return 'remediated';
  }
  if (lowerStatus.includes('progress') || lowerStatus.includes('ongoing')) {
    return 'cleanup_in_progress';
  }
  if (lowerStatus.includes('monitor')) {
    return 'monitored';
  }
  return 'unknown';
}

/**
 * Calculates contamination risk level based on EPA sites
 */
function calculateContaminationRiskLevel(
  sites: EnvironmentalSitesSummary
): ContaminationRiskLevel {
  const { counts, countsByDistance, nearestSite } = sites;

  // Severe risk: Superfund site within 0.5 miles or multiple high-risk sites very close
  if (counts.superfund > 0 && countsByDistance.within05Miles > 0) {
    return 'severe';
  }

  // High risk: Any site within 0.25 miles or multiple sites within 0.5 miles
  if (countsByDistance.within025Miles > 0 || countsByDistance.within05Miles >= 3) {
    return 'high';
  }

  // Moderate risk: Sites within 1 mile or TRI facility nearby
  if (countsByDistance.within1Mile >= 2 || counts.tri > 0) {
    return 'moderate';
  }

  // Low risk: Some sites within 2 miles
  if (counts.total > 0) {
    return 'low';
  }

  // No known risk
  return 'none_known';
}

/**
 * Determines if Phase I Environmental Site Assessment is recommended
 */
function determinePhaseIRecommendation(
  sites: EnvironmentalSitesSummary,
  nearestSite: ContaminationSite | null
): boolean {
  // Always recommend Phase I if:
  // 1. Any Superfund site within 1 mile
  if (sites.counts.superfund > 0) {
    return true;
  }

  // 2. Any site within 0.25 miles
  if (sites.countsByDistance.within025Miles > 0) {
    return true;
  }

  // 3. UST with known release nearby
  const ustWithRelease = sites.ustSites.some(
    (s) => s.hasRelease && (s.distanceMiles || 10) < 0.5
  );
  if (ustWithRelease) {
    return true;
  }

  // 4. Multiple brownfield sites (indicates industrial history)
  if (sites.counts.brownfield >= 2) {
    return true;
  }

  // 5. High-volume TRI facility nearby
  const highVolumeTRI = sites.triFacilities.some(
    (f) => f.totalReleasesLbs > 10000 && (f.distanceMiles || 10) < 1
  );
  if (highVolumeTRI) {
    return true;
  }

  return false;
}

/**
 * Identifies potential groundwater concerns
 */
function identifyGroundwaterConcerns(sites: EnvironmentalSitesSummary): string[] {
  const concerns: string[] = [];

  // Superfund sites often affect groundwater
  if (sites.counts.superfund > 0) {
    concerns.push('Superfund site(s) may have contaminated local groundwater');
  }

  // UST releases
  const ustReleases = sites.ustSites.filter((s) => s.hasRelease);
  if (ustReleases.length > 0) {
    concerns.push(
      `${ustReleases.length} underground storage tank site(s) with reported releases`
    );
  }

  // TRI land releases
  const triLandReleases = sites.triFacilities.filter((f) => f.landReleasesLbs > 0);
  if (triLandReleases.length > 0) {
    concerns.push(
      'TRI facility with land releases may affect soil and groundwater'
    );
  }

  return concerns;
}

/**
 * Identifies potential air quality concerns
 */
function identifyAirQualityConcerns(sites: EnvironmentalSitesSummary): string[] {
  const concerns: string[] = [];

  // TRI air releases
  const triAirReleases = sites.triFacilities.filter((f) => f.airReleasesLbs > 1000);
  if (triAirReleases.length > 0) {
    concerns.push(
      `${triAirReleases.length} TRI facility(s) with significant air emissions`
    );
  }

  // RCRA facilities
  if (sites.counts.rcra > 0) {
    concerns.push('RCRA hazardous waste facility may have air quality impacts');
  }

  return concerns;
}

/**
 * Generates contamination mitigation recommendations
 */
function generateContaminationMitigations(
  riskLevel: ContaminationRiskLevel,
  nearestSite: ContaminationSite | null,
  phaseIRecommended: boolean,
  hasGroundwaterConcerns: boolean
): string[] {
  const recommendations: string[] = [];

  if (phaseIRecommended) {
    recommendations.push(
      'Obtain a Phase I Environmental Site Assessment before purchase'
    );
  }

  if (riskLevel === 'severe' || riskLevel === 'high') {
    recommendations.push(
      'Consider Phase II ESA with soil and groundwater sampling'
    );
    recommendations.push(
      'Review EPA records for detailed contamination history'
    );
  }

  if (hasGroundwaterConcerns) {
    recommendations.push(
      'Test well water if property uses private well'
    );
    recommendations.push(
      'Verify municipal water source is not affected'
    );
  }

  if (nearestSite?.type === 'superfund') {
    recommendations.push(
      'Review Superfund site cleanup progress and timeline'
    );
    recommendations.push(
      'Check for institutional controls or deed restrictions'
    );
  }

  if (riskLevel !== 'none_known' && recommendations.length === 0) {
    recommendations.push(
      'Monitor EPA updates for nearby sites'
    );
  }

  return recommendations;
}

/**
 * Calculates confidence level for contamination analysis
 */
function calculateContaminationConfidence(sites: EnvironmentalSitesSummary): number {
  // Base confidence from EPA data availability
  let confidence = 70;

  // Increase confidence if we have site data
  if (sites.counts.total > 0) {
    confidence += 10;
  }

  // EPA data is generally reliable
  confidence += 10;

  return Math.min(confidence, 90);
}

// ============================================================================
// Radon Risk Analysis
// ============================================================================

/**
 * Analyzes radon risk for a property
 *
 * @param stateCode - State code
 * @param stateFips - State FIPS code
 * @param countyFips - County FIPS code (optional)
 * @param countyName - County name for reference
 * @param stateName - State name for reference
 * @returns Radon risk analysis
 *
 * @example
 * ```typescript
 * const analysis = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');
 * console.log(analysis.radonZone); // 1
 * ```
 */
export function analyzeRadonRisk(
  stateCode: string,
  stateFips: string,
  countyFips?: string,
  countyName?: string,
  stateName?: string
): RadonRiskAnalysis {
  const epaService = getEPAService();

  // Get radon zone data
  const radonData = epaService.getRadonZone(
    stateFips,
    countyFips,
    countyName,
    stateName
  );

  const zoneData = radonData.data;

  // Determine risk level from zone
  const riskLevel = radonZoneToRiskLevel(zoneData.radonZone);

  // Check state disclosure requirements
  const stateDisclosureRequired = RADON_DISCLOSURE_STATES[stateCode.toUpperCase()] || false;

  // Determine if testing is recommended
  const testingRecommended = zoneData.radonZone <= 2; // Zone 1 or 2

  // Determine if mitigation is typically needed
  const mitigationTypicallyNeeded = zoneData.radonZone === 1;

  // Estimate mitigation cost
  const estimatedMitigationCost = mitigationTypicallyNeeded
    ? { min: 800, max: 2500 }
    : zoneData.radonZone === 2
    ? { min: 800, max: 1500 }
    : null;

  // Get state and county averages (using zone data prediction)
  const stateAverageLevel = zoneData.predictedLevel;
  const countyAverageLevel = zoneData.predictedLevel;

  // Estimate percentage above action level (4 pCi/L)
  const percentAboveActionLevel = estimatePercentAboveActionLevel(zoneData.radonZone);

  // Generate mitigation recommendations
  const mitigationRecommendations = generateRadonMitigations(
    zoneData.radonZone,
    testingRecommended,
    mitigationTypicallyNeeded
  );

  // Calculate confidence
  const confidence = zoneData.confidence === 'high' ? 85 : zoneData.confidence === 'medium' ? 70 : 55;

  return {
    radonZone: zoneData.radonZone,
    riskLevel,
    predictedLevel: zoneData.predictedLevel,
    testingRecommended,
    stateAverageLevel,
    countyAverageLevel,
    percentAboveActionLevel,
    mitigationTypicallyNeeded,
    estimatedMitigationCost,
    stateDisclosureRequired,
    mitigationRecommendations,
    dataSource: {
      name: 'EPA Radon Zone Map',
      type: 'database',
      url: 'https://www.epa.gov/radon/epa-map-radon-zones',
      reliability: 'high',
    },
    confidence,
  };
}

/**
 * Converts radon zone to risk level
 */
function radonZoneToRiskLevel(zone: RadonZone): RiskLevel {
  switch (zone) {
    case 1:
      return 'high';
    case 2:
      return 'moderate';
    case 3:
      return 'low';
    default:
      return 'moderate';
  }
}

/**
 * Estimates percentage of homes above EPA action level based on zone
 */
function estimatePercentAboveActionLevel(zone: RadonZone): number {
  switch (zone) {
    case 1:
      return 50; // Zone 1: ~50% above 4 pCi/L
    case 2:
      return 25; // Zone 2: ~25% above 4 pCi/L
    case 3:
      return 10; // Zone 3: ~10% above 4 pCi/L
    default:
      return 25;
  }
}

/**
 * Generates radon mitigation recommendations
 */
function generateRadonMitigations(
  zone: RadonZone,
  testingRecommended: boolean,
  mitigationTypicallyNeeded: boolean
): string[] {
  const recommendations: string[] = [];

  if (testingRecommended) {
    recommendations.push(
      'Conduct professional radon testing before purchase or during inspection period'
    );
  }

  if (zone === 1) {
    recommendations.push(
      'Property is in EPA Zone 1 (highest radon potential) - testing is strongly recommended'
    );
    recommendations.push(
      'Budget $800-$2,500 for radon mitigation system if levels exceed 4 pCi/L'
    );
    recommendations.push(
      'Consider radon-resistant new construction techniques if building'
    );
  } else if (zone === 2) {
    recommendations.push(
      'Property is in EPA Zone 2 (moderate radon potential) - testing is recommended'
    );
    recommendations.push(
      'Mitigation may be needed if levels exceed EPA action level of 4 pCi/L'
    );
  } else {
    recommendations.push(
      'Property is in EPA Zone 3 (lower radon potential) - testing still recommended'
    );
    recommendations.push(
      'Elevated levels can still occur in any zone due to local geology'
    );
  }

  if (mitigationTypicallyNeeded) {
    recommendations.push(
      'Active soil depressurization (ASD) is the most common mitigation method'
    );
    recommendations.push(
      'Verify any existing radon mitigation system is functioning'
    );
  }

  return recommendations;
}

// ============================================================================
// Combined Environmental Risk Analysis
// ============================================================================

/**
 * Performs comprehensive environmental risk analysis
 *
 * @param coordinates - Property coordinates
 * @param stateCode - State code
 * @param stateFips - State FIPS code
 * @param countyFips - County FIPS code (optional)
 * @param countyName - County name (optional)
 * @param stateName - State name (optional)
 * @returns Combined environmental risk result
 *
 * @example
 * ```typescript
 * const result = await analyzeEnvironmentalRisk(
 *   { latitude: 40.7128, longitude: -74.0060 },
 *   'NY', '36', '061', 'New York', 'New York'
 * );
 * console.log(result.overallRiskLevel); // 'moderate'
 * ```
 */
export async function analyzeEnvironmentalRisk(
  coordinates: { latitude: number; longitude: number },
  stateCode: string,
  stateFips: string,
  countyFips?: string,
  countyName?: string,
  stateName?: string
): Promise<EnvironmentalRiskResult> {
  // Run both analyses
  const [contamination, radon] = await Promise.all([
    analyzeContaminationRisk(coordinates, stateCode, countyFips),
    Promise.resolve(
      analyzeRadonRisk(stateCode, stateFips, countyFips, countyName, stateName)
    ),
  ]);

  // Calculate combined risk score (0-100, higher = more risk)
  const contaminationScore = getContaminationRiskScore(contamination);
  const radonScore = getRadonRiskScore(radon);

  // Weight contamination slightly higher (60/40)
  const combinedRiskScore = contaminationScore * 0.6 + radonScore * 0.4;

  // Determine overall risk level
  const overallRiskLevel = scoreToRiskLevel(combinedRiskScore);

  // Determine primary concern
  const primaryConcern = determinePrimaryConcern(
    contamination.riskLevel,
    radon.riskLevel,
    contaminationScore,
    radonScore
  );

  // Generate critical warnings
  const criticalWarnings = generateEnvironmentalWarnings(contamination, radon);

  // Combine recommendations
  const recommendations = [
    ...contamination.mitigationRecommendations.slice(0, 3),
    ...radon.mitigationRecommendations.slice(0, 2),
  ];

  // Calculate overall confidence
  const confidence = Math.round(
    (contamination.confidence * 0.6 + radon.confidence * 0.4)
  );

  return {
    contamination,
    radon,
    overallRiskLevel,
    combinedRiskScore: Math.round(combinedRiskScore),
    primaryConcern,
    criticalWarnings,
    recommendations,
    analyzedAt: new Date(),
    confidence,
  };
}

/**
 * Calculates contamination risk score (0-100)
 */
export function getContaminationRiskScore(
  analysis: EnvironmentalContaminationAnalysis
): number {
  const levelScores: Record<ContaminationRiskLevel, number> = {
    none_known: 0,
    low: 25,
    moderate: 50,
    high: 75,
    severe: 95,
  };

  let score = levelScores[analysis.riskLevel];

  // Adjust based on site proximity
  if (analysis.nearestSite) {
    if (analysis.nearestSite.distanceMiles < 0.25) {
      score += 10;
    } else if (analysis.nearestSite.distanceMiles < 0.5) {
      score += 5;
    }
  }

  // Adjust for Phase I recommendation
  if (analysis.phaseIRecommended) {
    score += 5;
  }

  // Adjust for groundwater concerns
  score += analysis.groundwaterConcerns.length * 3;

  return Math.min(score, 100);
}

/**
 * Calculates radon risk score (0-100)
 */
export function getRadonRiskScore(analysis: RadonRiskAnalysis): number {
  const zoneScores: Record<RadonZone, number> = {
    1: 75,
    2: 45,
    3: 20,
  };

  let score = zoneScores[analysis.radonZone];

  // Adjust based on predicted level
  if (analysis.predictedLevel !== null) {
    if (analysis.predictedLevel >= 8) {
      score += 15;
    } else if (analysis.predictedLevel >= 4) {
      score += 10;
    } else if (analysis.predictedLevel >= 2) {
      score += 5;
    }
  }

  // Adjust for percentage above action level
  if (analysis.percentAboveActionLevel !== null) {
    score += Math.min(analysis.percentAboveActionLevel / 5, 10);
  }

  return Math.min(score, 100);
}

/**
 * Gets combined environmental risk score (0-100)
 */
export function getEnvironmentalRiskScore(result: EnvironmentalRiskResult): number {
  return result.combinedRiskScore;
}

/**
 * Converts score to risk level
 */
function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'very_high';
  if (score >= 60) return 'high';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low';
  return 'minimal';
}

/**
 * Determines primary environmental concern
 */
function determinePrimaryConcern(
  contaminationLevel: ContaminationRiskLevel,
  radonRiskLevel: RiskLevel,
  contaminationScore: number,
  radonScore: number
): EnvironmentalRiskResult['primaryConcern'] {
  // Check if both are concerns
  const contaminationConcern = contaminationLevel !== 'none_known' && contaminationLevel !== 'low';
  const radonConcern = radonRiskLevel !== 'minimal' && radonRiskLevel !== 'low';

  if (contaminationConcern && radonConcern) {
    return 'both';
  }

  if (contaminationConcern) {
    return 'contamination';
  }

  if (radonConcern) {
    return 'radon';
  }

  return 'none';
}

/**
 * Generates critical environmental warnings
 */
function generateEnvironmentalWarnings(
  contamination: EnvironmentalContaminationAnalysis,
  radon: RadonRiskAnalysis
): string[] {
  const warnings: string[] = [];

  // Contamination warnings
  if (contamination.riskLevel === 'severe') {
    warnings.push('SEVERE CONTAMINATION RISK: Superfund or major contamination site nearby');
  } else if (contamination.riskLevel === 'high') {
    warnings.push('HIGH CONTAMINATION RISK: Multiple contamination sites within 0.5 miles');
  }

  if (contamination.phaseIRecommended) {
    warnings.push('Phase I Environmental Site Assessment strongly recommended');
  }

  if (contamination.groundwaterConcerns.length > 0) {
    warnings.push('Potential groundwater contamination - verify water source safety');
  }

  // Radon warnings
  if (radon.radonZone === 1) {
    warnings.push('HIGH RADON ZONE: Area has elevated radon potential - testing required');
  }

  if (radon.predictedLevel !== null && radon.predictedLevel >= 4) {
    warnings.push(
      `Predicted radon level (${radon.predictedLevel} pCi/L) exceeds EPA action level of 4 pCi/L`
    );
  }

  return warnings;
}

// ============================================================================
// Exports
// ============================================================================

export {
  RADON_DISCLOSURE_STATES,
};
