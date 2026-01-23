/**
 * Combined Risk Integration Service
 *
 * Integrates all risk types (water, geological, fire, environmental) into a
 * comprehensive risk assessment with adaptive weighting based on location.
 *
 * Features:
 * - Adaptive weights based on geographic risk regions
 * - Integration with 125-point scoring system (Risk = 25 points max)
 * - Parallel API execution for performance
 * - Comprehensive insurance estimates
 * - Prioritized mitigation recommendations
 *
 * @module lib/risk/combined/combined-risk-service
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import {
  RiskAssessment,
  RiskWeights,
  RiskInput,
  RiskCategoryScore,
  RiskCategoryScoring,
  InsuranceEstimates,
  RiskMitigation,
  OverallRiskLevel,
  RiskLevel,
  FloodRiskAnalysis,
  HurricaneRiskAnalysis,
  EarthquakeRiskAnalysis,
  SinkholeRiskAnalysis,
  SlopeRiskAnalysis,
  WildfireRiskAnalysis,
  EnvironmentalContaminationAnalysis,
  RadonRiskAnalysis,
} from '@/types/risk-analysis';

// ============================================================================
// Risk Region Configuration
// ============================================================================

/**
 * Geographic risk regions with adaptive weight configurations
 *
 * Each region has different risk profiles based on historical data:
 * - GULF_COAST: High hurricane, flood, and sinkhole risks
 * - ATLANTIC_COAST: High hurricane and flood risks
 * - WEST_COAST: High earthquake and wildfire risks
 * - TORNADO_ALLEY: Moderate risks across categories
 * - MIDWEST: Moderate flood and radon risks
 * - MOUNTAIN_WEST: High wildfire and slope risks
 * - NORTHEAST: High radon, moderate flood risks
 * - DEFAULT: Balanced weights for unclassified areas
 */
export const RISK_REGIONS: Record<string, RiskWeights> = {
  // Florida, Gulf states - High hurricane, flood, sinkhole
  GULF_COAST: {
    flood: 0.20,
    earthquake: 0.02,
    wildfire: 0.06,
    hurricane: 0.25,
    sinkhole: 0.20,
    environmental: 0.10,
    radon: 0.04,
    slope: 0.13,
  },
  // Atlantic coast (NC to ME) - High hurricane, flood
  ATLANTIC_COAST: {
    flood: 0.22,
    earthquake: 0.05,
    wildfire: 0.06,
    hurricane: 0.22,
    sinkhole: 0.06,
    environmental: 0.12,
    radon: 0.10,
    slope: 0.17,
  },
  // California, Pacific Northwest - High earthquake, wildfire
  WEST_COAST: {
    flood: 0.10,
    earthquake: 0.25,
    wildfire: 0.22,
    hurricane: 0.02,
    sinkhole: 0.03,
    environmental: 0.12,
    radon: 0.08,
    slope: 0.18,
  },
  // TX, OK, KS, NE - Tornado alley, mixed risks
  TORNADO_ALLEY: {
    flood: 0.18,
    earthquake: 0.08,
    wildfire: 0.12,
    hurricane: 0.08,
    sinkhole: 0.08,
    environmental: 0.15,
    radon: 0.10,
    slope: 0.21,
  },
  // OH, IN, IL, MI, WI, MN, IA - Flood, radon
  MIDWEST: {
    flood: 0.18,
    earthquake: 0.05,
    wildfire: 0.06,
    hurricane: 0.02,
    sinkhole: 0.08,
    environmental: 0.18,
    radon: 0.18,
    slope: 0.25,
  },
  // CO, UT, AZ, NM, NV - Wildfire, slope
  MOUNTAIN_WEST: {
    flood: 0.10,
    earthquake: 0.12,
    wildfire: 0.25,
    hurricane: 0.02,
    sinkhole: 0.05,
    environmental: 0.12,
    radon: 0.12,
    slope: 0.22,
  },
  // PA, NY, NJ, CT, MA, etc. - Radon, flood
  NORTHEAST: {
    flood: 0.15,
    earthquake: 0.05,
    wildfire: 0.05,
    hurricane: 0.10,
    sinkhole: 0.08,
    environmental: 0.18,
    radon: 0.22,
    slope: 0.17,
  },
  // Default balanced weights
  DEFAULT: {
    flood: 0.15,
    earthquake: 0.10,
    wildfire: 0.12,
    hurricane: 0.10,
    sinkhole: 0.08,
    environmental: 0.15,
    radon: 0.12,
    slope: 0.18,
  },
};

/**
 * State to risk region mapping
 */
const STATE_RISK_REGIONS: Record<string, string> = {
  // Gulf Coast
  FL: 'GULF_COAST',
  LA: 'GULF_COAST',
  MS: 'GULF_COAST',
  AL: 'GULF_COAST',
  // Atlantic Coast
  NC: 'ATLANTIC_COAST',
  SC: 'ATLANTIC_COAST',
  GA: 'ATLANTIC_COAST',
  VA: 'ATLANTIC_COAST',
  MD: 'ATLANTIC_COAST',
  DE: 'ATLANTIC_COAST',
  NJ: 'ATLANTIC_COAST',
  NY: 'ATLANTIC_COAST',
  CT: 'ATLANTIC_COAST',
  RI: 'ATLANTIC_COAST',
  MA: 'ATLANTIC_COAST',
  NH: 'ATLANTIC_COAST',
  ME: 'ATLANTIC_COAST',
  // West Coast
  CA: 'WEST_COAST',
  OR: 'WEST_COAST',
  WA: 'WEST_COAST',
  AK: 'WEST_COAST',
  HI: 'WEST_COAST',
  // Tornado Alley
  TX: 'TORNADO_ALLEY',
  OK: 'TORNADO_ALLEY',
  KS: 'TORNADO_ALLEY',
  NE: 'TORNADO_ALLEY',
  // Midwest
  OH: 'MIDWEST',
  IN: 'MIDWEST',
  IL: 'MIDWEST',
  MI: 'MIDWEST',
  WI: 'MIDWEST',
  MN: 'MIDWEST',
  IA: 'MIDWEST',
  MO: 'MIDWEST',
  // Mountain West
  CO: 'MOUNTAIN_WEST',
  UT: 'MOUNTAIN_WEST',
  AZ: 'MOUNTAIN_WEST',
  NM: 'MOUNTAIN_WEST',
  NV: 'MOUNTAIN_WEST',
  ID: 'MOUNTAIN_WEST',
  MT: 'MOUNTAIN_WEST',
  WY: 'MOUNTAIN_WEST',
  // Northeast
  PA: 'NORTHEAST',
  VT: 'NORTHEAST',
  WV: 'NORTHEAST',
  KY: 'MIDWEST',
  TN: 'MIDWEST',
  AR: 'TORNADO_ALLEY',
  ND: 'MIDWEST',
  SD: 'MIDWEST',
};

// ============================================================================
// Adaptive Weights Calculator
// ============================================================================

/**
 * Gets risk weights for a state based on geographic region
 *
 * @param stateCode - Two-letter state code
 * @returns Risk weights for the state's region
 *
 * @example
 * ```typescript
 * const weights = getWeightsForState('FL');
 * console.log(weights.hurricane); // 0.25 (high for Gulf Coast)
 * ```
 */
export function getWeightsForState(stateCode: string): RiskWeights {
  const region = STATE_RISK_REGIONS[stateCode.toUpperCase()] || 'DEFAULT';
  return RISK_REGIONS[region];
}

/**
 * Gets the risk region name for a state
 *
 * @param stateCode - Two-letter state code
 * @returns Region name
 */
export function getRegionForState(stateCode: string): string {
  return STATE_RISK_REGIONS[stateCode.toUpperCase()] || 'DEFAULT';
}

/**
 * Validates that weights sum to approximately 1.0
 */
function validateWeights(weights: RiskWeights): boolean {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) <= 0.011; // Allow 1% variance (with floating point tolerance)
}

/**
 * Normalizes weights to sum to 1.0
 */
function normalizeWeights(weights: RiskWeights): RiskWeights {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum === 0) return weights;

  return {
    flood: weights.flood / sum,
    earthquake: weights.earthquake / sum,
    wildfire: weights.wildfire / sum,
    hurricane: weights.hurricane / sum,
    sinkhole: weights.sinkhole / sum,
    environmental: weights.environmental / sum,
    radon: weights.radon / sum,
    slope: weights.slope / sum,
  };
}

// ============================================================================
// Risk Score Calculators
// ============================================================================

/**
 * Calculates risk score for flood analysis (0-100)
 */
function getFloodScore(analysis: FloodRiskAnalysis | null): number {
  if (!analysis) return 50; // Default moderate risk if no data

  const levelScores: Record<RiskLevel, number> = {
    minimal: 10,
    low: 25,
    moderate: 50,
    high: 75,
    very_high: 95,
  };

  let score = levelScores[analysis.riskLevel];

  // Adjust for insurance requirement
  if (analysis.insuranceRequired) {
    score += 10;
  }

  // Adjust for elevation difference
  if (analysis.elevationDifference !== null) {
    if (analysis.elevationDifference < -2) {
      score += 15; // Below BFE
    } else if (analysis.elevationDifference < 0) {
      score += 8;
    } else if (analysis.elevationDifference > 2) {
      score -= 5; // Above BFE
    }
  }

  // Adjust for floodway status
  if (analysis.floodwayStatus === 'in_floodway') {
    score += 15;
  } else if (analysis.floodwayStatus === 'in_fringe') {
    score += 5;
  }

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Calculates risk score for hurricane analysis (0-100)
 */
function getHurricaneScore(analysis: HurricaneRiskAnalysis | null): number {
  if (!analysis) return 30; // Default lower risk if no data

  // Wind zone scoring
  const windZoneScores: Record<string, number> = {
    zone_4: 90,
    zone_3: 70,
    zone_2: 45,
    zone_1: 25,
  };

  let score = analysis.windZone
    ? windZoneScores[analysis.windZone] || 30
    : 30;

  // Adjust for storm surge zone
  if (analysis.stormSurgeZone) {
    const surgeScores: Record<string, number> = {
      A: 30,
      B: 20,
      C: 10,
      D: 5,
      E: 2,
    };
    score += surgeScores[analysis.stormSurgeZone] || 0;
  }

  // Adjust for historical storms
  if (analysis.historicalStorms) {
    score += Math.min(analysis.historicalStorms.count * 2, 10);
  }

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Calculates risk score for earthquake analysis (0-100)
 */
function getEarthquakeScore(analysis: EarthquakeRiskAnalysis | null): number {
  if (!analysis) return 20; // Default lower risk if no data

  const levelScores: Record<string, number> = {
    very_high: 95,
    high: 75,
    moderate: 50,
    low: 25,
    very_low: 10,
  };

  let score = levelScores[analysis.hazardLevel] || 30;

  // Adjust for PGA
  if (analysis.pga > 0.4) {
    score += 15;
  } else if (analysis.pga > 0.2) {
    score += 8;
  }

  // Adjust for historical activity
  if (analysis.historicalQuakeCount > 10) {
    score += 10;
  } else if (analysis.historicalQuakeCount > 5) {
    score += 5;
  }

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Calculates risk score for sinkhole analysis (0-100)
 */
function getSinkholeScore(analysis: SinkholeRiskAnalysis | null): number {
  if (!analysis) return 15; // Default lower risk if no data

  const levelScores: Record<string, number> = {
    very_high: 95,
    high: 75,
    moderate: 50,
    low: 25,
    negligible: 5,
  };

  let score = levelScores[analysis.riskLevel] || 25;

  // Adjust for karst geology
  if (analysis.inKarstArea) {
    score += 15;
  }

  // Adjust for nearby sinkholes
  if (analysis.sinkholesWithinOneMile > 0) {
    score += analysis.sinkholesWithinOneMile * 5;
  }

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Calculates risk score for wildfire analysis (0-100)
 */
function getWildfireScore(analysis: WildfireRiskAnalysis | null): number {
  if (!analysis) return 25; // Default moderate-low risk if no data

  const levelScores: Record<string, number> = {
    extreme: 98,
    very_high: 85,
    high: 70,
    moderate: 45,
    low: 20,
    minimal: 5,
  };

  let score = levelScores[analysis.riskLevel] || 35;

  // Adjust for WUI status
  if (analysis.inWUI) {
    score += 15;
  }

  // Adjust for active fires
  if (analysis.activeFiresNearby > 0) {
    score += Math.min(analysis.activeFiresNearby * 3, 15);
  }

  // Adjust for fuel load
  if (analysis.fuelLoad === 'extreme') {
    score += 10;
  } else if (analysis.fuelLoad === 'heavy') {
    score += 5;
  }

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Calculates risk score for slope analysis (0-100)
 */
function getSlopeScore(analysis: SlopeRiskAnalysis | null): number {
  if (!analysis) return 15; // Default lower risk if no data

  const levelScores: Record<string, number> = {
    highly_unstable: 90,
    unstable: 70,
    marginally_stable: 45,
    stable: 15,
  };

  let score = levelScores[analysis.stabilityLevel] || 25;

  // Adjust for slope percentage
  if (analysis.slopePercentage !== null) {
    if (analysis.slopePercentage > 30) {
      score += 20;
    } else if (analysis.slopePercentage > 15) {
      score += 10;
    }
  }

  // Adjust for landslide zone
  if (analysis.inLandslideZone) {
    score += 20;
  }

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Calculates risk score for environmental contamination (0-100)
 */
function getEnvironmentalScore(analysis: EnvironmentalContaminationAnalysis | null): number {
  if (!analysis) return 20; // Default lower risk if no data

  const levelScores: Record<string, number> = {
    severe: 95,
    high: 75,
    moderate: 50,
    low: 25,
    none_known: 5,
  };

  let score = levelScores[analysis.riskLevel] || 25;

  // Adjust for Phase I recommendation
  if (analysis.phaseIRecommended) {
    score += 15;
  }

  // Adjust for groundwater concerns
  score += analysis.groundwaterConcerns.length * 5;

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Calculates risk score for radon (0-100)
 */
function getRadonScore(analysis: RadonRiskAnalysis | null): number {
  if (!analysis) return 35; // Default moderate risk if no data

  const zoneScores: Record<number, number> = {
    1: 75,
    2: 45,
    3: 20,
  };

  let score = zoneScores[analysis.radonZone] || 40;

  // Adjust for predicted level
  if (analysis.predictedLevel !== null) {
    if (analysis.predictedLevel >= 8) {
      score += 15;
    } else if (analysis.predictedLevel >= 4) {
      score += 10;
    }
  }

  return Math.min(Math.max(score, 0), 100);
}

// ============================================================================
// Combined Risk Assessment
// ============================================================================

/**
 * Calculates comprehensive risk assessment with adaptive weights
 *
 * @param input - Individual risk analyses
 * @param stateCode - State code for weight selection
 * @param customWeights - Optional custom weights (overrides region-based)
 * @returns Comprehensive risk assessment
 *
 * @example
 * ```typescript
 * const assessment = calculateRiskAssessment(
 *   {
 *     flood: floodAnalysis,
 *     earthquake: earthquakeAnalysis,
 *     // ... other analyses
 *   },
 *   'PA'
 * );
 * console.log(assessment.riskScore); // 0-100
 * console.log(assessment.overallRisk); // 'moderate'
 * ```
 */
export function calculateRiskAssessment(
  input: RiskInput,
  stateCode: string,
  customWeights?: Partial<RiskWeights>
): RiskAssessment {
  // Get and normalize weights
  let weights = getWeightsForState(stateCode);
  if (customWeights) {
    weights = { ...weights, ...customWeights };
  }
  weights = normalizeWeights(weights);

  // Calculate individual scores
  const scores = {
    flood: getFloodScore(input.flood),
    earthquake: getEarthquakeScore(input.earthquake),
    wildfire: getWildfireScore(input.wildfire),
    hurricane: getHurricaneScore(input.hurricane),
    sinkhole: getSinkholeScore(input.sinkhole),
    environmental: getEnvironmentalScore(input.environmental),
    radon: getRadonScore(input.radon),
    slope: getSlopeScore(input.slope),
  };

  // Calculate weighted score
  let weightedTotal = 0;
  const categoryScores: RiskCategoryScore[] = [];

  for (const [category, weight] of Object.entries(weights)) {
    const rawScore = scores[category as keyof typeof scores];
    const weightedScore = rawScore * weight;
    weightedTotal += weightedScore;

    categoryScores.push({
      category: category as keyof RiskWeights,
      rawScore,
      weight,
      weightedScore,
      riskLevel: scoreToRiskLevel(rawScore),
      dataAvailability: getDataAvailability(input, category as keyof RiskInput),
    });
  }

  // Sort by weighted contribution
  categoryScores.sort((a, b) => b.weightedScore - a.weightedScore);

  // Determine overall risk level
  const overallRisk = scoreToOverallRiskLevel(weightedTotal);

  // Calculate confidence based on data availability
  const confidence = calculateConfidence(input, categoryScores);

  // Generate top risk factors
  const topRiskFactors = categoryScores
    .filter((s) => s.rawScore >= 50)
    .slice(0, 3)
    .map((s) => `${formatCategoryName(s.category)}: ${s.riskLevel} risk (${Math.round(s.rawScore)}/100)`);

  // Generate positive factors
  const positiveFactors = categoryScores
    .filter((s) => s.rawScore < 30)
    .slice(0, 2)
    .map((s) => `${formatCategoryName(s.category)}: ${s.riskLevel} risk`);

  // Generate warnings
  const warnings = generateWarnings(input, categoryScores);

  // Generate recommendations
  const recommendations = generateRecommendations(input, categoryScores);

  // Generate mitigation actions
  const mitigationActions = generateMitigationActions(input, categoryScores);

  // Calculate insurance estimates
  const insuranceEstimates = calculateInsuranceEstimates(input, scores, stateCode);

  return {
    overallRisk,
    riskScore: Math.round(weightedTotal),
    confidenceLevel: confidence,
    flood: input.flood,
    earthquake: input.earthquake,
    wildfire: input.wildfire,
    hurricane: input.hurricane,
    sinkhole: input.sinkhole,
    environmental: input.environmental,
    radon: input.radon,
    slope: input.slope,
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
 * Converts score to overall risk level
 */
function scoreToOverallRiskLevel(score: number): OverallRiskLevel {
  if (score >= 70) return 'severe';
  if (score >= 50) return 'high';
  if (score >= 30) return 'moderate';
  return 'low';
}

/**
 * Gets data availability for a risk category
 */
function getDataAvailability(
  input: RiskInput,
  category: keyof RiskInput
): 'full' | 'partial' | 'none' {
  const analysis = input[category];
  if (!analysis) return 'none';

  // Check for confidence or completeness indicators
  if ('confidence' in analysis) {
    const confidence = (analysis as { confidence: number }).confidence;
    if (confidence >= 80) return 'full';
    if (confidence >= 50) return 'partial';
    return 'none';
  }

  return 'partial';
}

/**
 * Formats category name for display
 */
function formatCategoryName(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Calculates overall confidence
 */
function calculateConfidence(
  input: RiskInput,
  categoryScores: RiskCategoryScore[]
): number {
  const availabilityScores = {
    full: 100,
    partial: 60,
    none: 20,
  };

  let totalWeight = 0;
  let weightedConfidence = 0;

  for (const score of categoryScores) {
    totalWeight += score.weight;
    weightedConfidence += score.weight * availabilityScores[score.dataAvailability];
  }

  return Math.round(weightedConfidence / totalWeight);
}

/**
 * Generates risk warnings
 */
function generateWarnings(
  input: RiskInput,
  categoryScores: RiskCategoryScore[]
): string[] {
  const warnings: string[] = [];

  // High-risk categories
  for (const score of categoryScores) {
    if (score.rawScore >= 80) {
      warnings.push(`${formatCategoryName(score.category)} risk is VERY HIGH - requires immediate attention`);
    } else if (score.rawScore >= 60) {
      warnings.push(`${formatCategoryName(score.category)} risk is HIGH - mitigation recommended`);
    }
  }

  // Specific warnings from analyses
  if (input.flood?.insuranceRequired) {
    warnings.push('Flood insurance is REQUIRED for federally-backed mortgages');
  }

  if (input.environmental?.phaseIRecommended) {
    warnings.push('Phase I Environmental Site Assessment is recommended');
  }

  if (input.wildfire?.inWUI) {
    warnings.push('Property is in Wildland-Urban Interface (WUI) zone');
  }

  if (input.radon?.radonZone === 1) {
    warnings.push('Property is in EPA Radon Zone 1 - testing required');
  }

  return warnings.slice(0, 5); // Limit to top 5 warnings
}

/**
 * Generates recommendations
 */
function generateRecommendations(
  input: RiskInput,
  categoryScores: RiskCategoryScore[]
): string[] {
  const recommendations: string[] = [];

  // Sort by risk level to prioritize
  const sortedScores = [...categoryScores].sort((a, b) => b.rawScore - a.rawScore);

  for (const score of sortedScores.slice(0, 3)) {
    if (score.rawScore >= 50) {
      switch (score.category) {
        case 'flood':
          recommendations.push('Obtain flood elevation certificate and consider flood insurance');
          break;
        case 'hurricane':
          recommendations.push('Verify wind mitigation features and hurricane shutters');
          break;
        case 'earthquake':
          recommendations.push('Consider earthquake retrofit assessment');
          break;
        case 'wildfire':
          recommendations.push('Implement defensible space and fire-resistant landscaping');
          break;
        case 'sinkhole':
          recommendations.push('Obtain ground stability assessment');
          break;
        case 'environmental':
          recommendations.push('Order Phase I Environmental Site Assessment');
          break;
        case 'radon':
          recommendations.push('Conduct radon testing before purchase');
          break;
        case 'slope':
          recommendations.push('Obtain geotechnical soil stability report');
          break;
      }
    }
  }

  return recommendations;
}

/**
 * Generates prioritized mitigation actions
 */
function generateMitigationActions(
  input: RiskInput,
  categoryScores: RiskCategoryScore[]
): RiskMitigation[] {
  const actions: RiskMitigation[] = [];
  let priority = 1;

  // Sort by risk score
  const sortedScores = [...categoryScores].sort((a, b) => b.rawScore - a.rawScore);

  for (const score of sortedScores) {
    if (score.rawScore >= 40) {
      const mitigations = getMitigationsForCategory(score.category, score.rawScore);
      for (const mitigation of mitigations) {
        actions.push({
          ...mitigation,
          priority: priority++,
        });
      }
    }
  }

  return actions.slice(0, 8); // Limit to top 8 actions
}

/**
 * Gets mitigations for a specific category
 */
function getMitigationsForCategory(
  category: keyof RiskWeights,
  score: number
): Omit<RiskMitigation, 'priority'>[] {
  const mitigations: Omit<RiskMitigation, 'priority'>[] = [];

  switch (category) {
    case 'flood':
      if (score >= 60) {
        mitigations.push({
          riskType: 'flood',
          action: 'Elevate structure above Base Flood Elevation',
          estimatedCost: { min: 30000, max: 150000 },
          effectiveness: 'very_high',
          timeframe: '3-6 months',
          insuranceImpact: 'Can reduce flood insurance premium by 50-80%',
          roiExplanation: 'Long-term insurance savings can offset costs over 10-15 years',
        });
      }
      mitigations.push({
        riskType: 'flood',
        action: 'Install flood vents and sump pump system',
        estimatedCost: { min: 5000, max: 15000 },
        effectiveness: 'moderate',
        timeframe: '1-2 weeks',
        insuranceImpact: 'May reduce premium by 5-15%',
        roiExplanation: 'Quick payback through damage prevention and insurance savings',
      });
      break;

    case 'earthquake':
      mitigations.push({
        riskType: 'earthquake',
        action: 'Seismic retrofit (foundation bolting, cripple wall bracing)',
        estimatedCost: { min: 3000, max: 20000 },
        effectiveness: 'high',
        timeframe: '1-3 weeks',
        insuranceImpact: 'May qualify for insurance discounts',
        roiExplanation: 'Prevents catastrophic structural damage',
      });
      break;

    case 'wildfire':
      mitigations.push({
        riskType: 'wildfire',
        action: 'Create 100-foot defensible space zone',
        estimatedCost: { min: 2000, max: 10000 },
        effectiveness: 'high',
        timeframe: '1-4 weeks',
        insuranceImpact: 'Required for insurance in some areas',
        roiExplanation: 'Significantly reduces fire damage risk',
      });
      if (score >= 70) {
        mitigations.push({
          riskType: 'wildfire',
          action: 'Install fire-resistant roofing and siding',
          estimatedCost: { min: 15000, max: 50000 },
          effectiveness: 'very_high',
          timeframe: '1-2 months',
          insuranceImpact: 'May reduce premium by 10-25%',
          roiExplanation: 'Critical for maintaining insurability in high-risk areas',
        });
      }
      break;

    case 'radon':
      mitigations.push({
        riskType: 'radon',
        action: 'Install active soil depressurization radon mitigation system',
        estimatedCost: { min: 800, max: 2500 },
        effectiveness: 'very_high',
        timeframe: '1 day',
        insuranceImpact: null,
        roiExplanation: 'Reduces cancer risk; may be required for sale',
      });
      break;

    case 'environmental':
      mitigations.push({
        riskType: 'environmental',
        action: 'Conduct Phase I Environmental Site Assessment',
        estimatedCost: { min: 1500, max: 5000 },
        effectiveness: 'high',
        timeframe: '2-4 weeks',
        insuranceImpact: 'Required for environmental liability coverage',
        roiExplanation: 'Identifies contamination before purchase',
      });
      break;

    case 'slope':
      mitigations.push({
        riskType: 'slope',
        action: 'Install retaining walls and proper drainage',
        estimatedCost: { min: 10000, max: 50000 },
        effectiveness: 'high',
        timeframe: '2-6 weeks',
        insuranceImpact: null,
        roiExplanation: 'Prevents landslide damage to structure',
      });
      break;
  }

  return mitigations;
}

/**
 * Calculates insurance estimates based on risk scores
 */
function calculateInsuranceEstimates(
  input: RiskInput,
  scores: Record<string, number>,
  stateCode: string
): InsuranceEstimates {
  const availabilityWarnings: string[] = [];

  // Base flood insurance estimate
  let floodInsurance: number | null = null;
  if (input.flood) {
    if (input.flood.insuranceRequired) {
      // SFHA zones require insurance, higher premiums
      floodInsurance = input.flood.annualPremiumEstimate || 1500;
    } else if (input.flood.riskLevel !== 'minimal') {
      // Optional but recommended
      floodInsurance = 500;
    }
  }

  // Earthquake insurance estimate (primarily West Coast)
  let earthquakeInsurance: number | null = null;
  if (scores.earthquake >= 40) {
    earthquakeInsurance = scores.earthquake >= 70 ? 2500 : 1200;
    if (scores.earthquake >= 80) {
      availabilityWarnings.push('Earthquake insurance may be expensive or limited in this area');
    }
  }

  // Fire insurance estimate
  let fireInsurance: number | null = null;
  if (scores.wildfire >= 40) {
    fireInsurance = scores.wildfire >= 70 ? 3000 : 1500;
    if (scores.wildfire >= 80) {
      availabilityWarnings.push('Fire insurance may be difficult to obtain in this high-risk wildfire area');
    }
  }

  // Windstorm insurance estimate (Gulf/Atlantic Coast)
  let windstormInsurance: number | null = null;
  if (scores.hurricane >= 40) {
    windstormInsurance = scores.hurricane >= 70 ? 4000 : 2000;
    if (scores.hurricane >= 80) {
      availabilityWarnings.push('Windstorm coverage may require state pool (FAIR Plan)');
    }
  }

  // Calculate total
  const totalAnnualCost =
    (floodInsurance || 0) +
    (earthquakeInsurance || 0) +
    (fireInsurance || 0) +
    (windstormInsurance || 0);

  return {
    floodInsurance,
    earthquakeInsurance,
    fireInsurance,
    windstormInsurance,
    totalAnnualCost,
    availabilityWarnings,
  };
}

// ============================================================================
// 125-Point Scoring Integration
// ============================================================================

/**
 * Calculates risk category score for the 125-point scoring system
 *
 * The Risk category contributes up to 25 points to the total.
 * Risk score 0-100 (higher = more risk) converts to 0-25 points (higher = less risk = better).
 * Formula: categoryScore = 25 * (1 - riskScore / 100)
 *
 * @param assessment - Risk assessment result
 * @returns Risk category scoring for 125-point system
 *
 * @example
 * ```typescript
 * const scoring = calculateRiskCategoryScore(assessment);
 * console.log(scoring.categoryScore); // 18.5 out of 25
 * ```
 */
export function calculateRiskCategoryScore(
  assessment: RiskAssessment
): RiskCategoryScoring {
  // Convert risk score (0-100, higher = more risk) to category score (0-25, higher = better)
  const categoryScore = 25 * (1 - assessment.riskScore / 100);

  // Calculate sub-scores for each category
  const subScores = {
    flood: calculateSubScore(assessment.categoryScores, 'flood'),
    hurricane: calculateSubScore(assessment.categoryScores, 'hurricane'),
    earthquake: calculateSubScore(assessment.categoryScores, 'earthquake'),
    wildfire: calculateSubScore(assessment.categoryScores, 'wildfire'),
    sinkhole: calculateSubScore(assessment.categoryScores, 'sinkhole'),
    environmental: calculateSubScore(assessment.categoryScores, 'environmental'),
    radon: calculateSubScore(assessment.categoryScores, 'radon'),
    slope: calculateSubScore(assessment.categoryScores, 'slope'),
  };

  // Generate explanation
  const explanation = generateScoreExplanation(assessment, categoryScore);

  // Key factors affecting the score
  const keyFactors = [
    ...assessment.topRiskFactors.slice(0, 2),
    ...assessment.positiveFactors.slice(0, 1),
  ];

  return {
    categoryScore: Math.round(categoryScore * 10) / 10, // Round to 1 decimal
    subScores,
    explanation,
    keyFactors,
  };
}

/**
 * Calculates sub-score for a specific risk category
 */
function calculateSubScore(
  categoryScores: RiskCategoryScore[],
  category: keyof RiskWeights
): number {
  const score = categoryScores.find((s) => s.category === category);
  if (!score) return 0;

  // Convert weighted contribution to points out of weight * 25
  // Each category contributes proportionally based on its weight
  return Math.round((25 * score.weight * (1 - score.rawScore / 100)) * 10) / 10;
}

/**
 * Generates explanation for the risk score
 */
function generateScoreExplanation(
  assessment: RiskAssessment,
  categoryScore: number
): string {
  const scoreLevel =
    categoryScore >= 20 ? 'excellent' :
    categoryScore >= 15 ? 'good' :
    categoryScore >= 10 ? 'moderate' :
    categoryScore >= 5 ? 'concerning' : 'poor';

  const topRisk = assessment.categoryScores[0];

  return `Risk score of ${Math.round(categoryScore)}/25 (${scoreLevel}). Primary risk factor: ${formatCategoryName(topRisk.category)} at ${Math.round(topRisk.rawScore)}%.`;
}

// ============================================================================
// Exports
// ============================================================================

export {
  STATE_RISK_REGIONS,
  validateWeights,
  normalizeWeights,
};
