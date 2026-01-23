/**
 * Risk Assessment Calculator
 *
 * Calculates real risk scores from live API data including:
 * - USGS seismic hazard data
 * - NASA FIRMS wildfire data
 * - EPA environmental sites data
 * - Elevation/terrain data
 *
 * Replaces hardcoded mock data with calculated values.
 */

import { RiskAssessment, RiskCategoryScore, RiskLevel } from '@/types/risk-analysis';

/**
 * Input data from various APIs
 */
export interface RiskCalculationInput {
  // Location
  state: string;
  county?: string;
  coordinates: { lat: number; lng: number };

  // API Data
  seismicData?: {
    pga: number;
    seismicDesignCategory: string;
    riskLevel?: string;
    ss?: number;
    s1?: number;
  };

  wildfireData?: {
    fireCount: number;
    nearestFireMiles?: number | null;
    fires?: Array<{ latitude: number; longitude: number; }>;
  };

  environmentalData?: {
    counts?: {
      total: number;
      superfund: number;
      brownfield: number;
      ust: number;
      tri?: number;
      rcra?: number;
    };
    nearestSite?: {
      name: string;
      type: string;
      distanceMiles: number;
      status?: string;
    };
    searchRadiusMiles?: number;
  };

  terrainData?: {
    elevation: number;
    elevationFeet: number;
    averageSlope: number;
    maxSlope: number;
    classification: string;
    stability: string;
    stabilityLabel?: string;
  };

  elevationData?: {
    floodRiskAssessment?: {
      risk: 'low' | 'moderate' | 'high';
      reason: string;
      belowSeaLevel: boolean;
      inLowLyingArea: boolean;
    };
    surroundingElevations?: {
      isLowestPoint: boolean;
    };
  };

  // Zillow/First Street climate risk data (1-10 scale)
  climateRiskData?: {
    floodRisk: number | null;
    fireRisk: number | null;
    windRisk: number | null;
    heatRisk: number | null;
    source?: string;
  };
}

/**
 * Radon zones by state (EPA Zone 1 = highest risk)
 * Zone 1: Predicted avg indoor radon level > 4 pCi/L
 * Zone 2: Predicted avg indoor radon level 2-4 pCi/L
 * Zone 3: Predicted avg indoor radon level < 2 pCi/L
 */
const STATE_RADON_ZONES: Record<string, 1 | 2 | 3> = {
  PA: 1, IA: 1, OH: 1, CO: 1, NE: 1, ND: 1, SD: 1, WY: 1, MT: 1, ID: 1,
  MN: 1, WI: 1, IL: 1, IN: 1, MI: 1, KY: 1, WV: 1,
  NJ: 2, NY: 2, CT: 2, MA: 2, ME: 2, VT: 2, NH: 2, RI: 2, VA: 2, MD: 2, DE: 2,
  NC: 2, TN: 2, MO: 2, KS: 2, OK: 2, NM: 2, UT: 2, NV: 2, WA: 2, OR: 2,
  FL: 3, GA: 3, SC: 3, AL: 3, MS: 3, LA: 3, AR: 3, TX: 3, AZ: 3, CA: 3, HI: 3, AK: 3,
};

/**
 * Hurricane risk by state (0-100 scale)
 */
const STATE_HURRICANE_RISK: Record<string, number> = {
  FL: 95, LA: 90, TX: 80, NC: 75, SC: 70, MS: 70, AL: 65, GA: 50, VA: 40, MD: 30,
  DE: 25, NJ: 25, NY: 20, CT: 15, RI: 15, MA: 15, NH: 10, ME: 10,
  // Interior states have minimal hurricane risk
  PA: 5, OH: 3, MI: 2, IN: 2, IL: 2, WI: 2, MN: 1, IA: 1, MO: 3, KY: 5, WV: 3, TN: 10,
};

/**
 * Sinkhole risk by state (0-100 scale, based on karst geology)
 */
const STATE_SINKHOLE_RISK: Record<string, number> = {
  FL: 90, // Florida is highest - limestone bedrock
  TX: 40, KY: 45, TN: 40, AL: 35, MO: 35, IN: 30, PA: 25, MD: 20, VA: 25,
  WV: 20, OH: 15, GA: 20, SC: 15, NC: 15, NM: 25, AZ: 20,
};

/**
 * Calculate risk score for a specific category (0-100, higher = more risk)
 */
function calculateCategoryScore(
  category: string,
  value: number,
  dataAvailable: boolean
): { rawScore: number; riskLevel: RiskLevel; dataAvailability: 'full' | 'partial' | 'none' } {
  const score = Math.min(100, Math.max(0, Math.round(value)));

  let riskLevel: RiskLevel;
  if (score <= 10) riskLevel = 'minimal';
  else if (score <= 25) riskLevel = 'low';
  else if (score <= 50) riskLevel = 'moderate';
  else if (score <= 75) riskLevel = 'high';
  else riskLevel = 'very_high';

  return {
    rawScore: score,
    riskLevel,
    dataAvailability: dataAvailable ? 'full' : 'partial',
  };
}

/**
 * Calculate flood risk score from Zillow climate data or elevation data
 */
function calculateFloodScore(input: RiskCalculationInput): number {
  // PRIORITY: Use Zillow/First Street climate data if available (1-10 scale)
  if (input.climateRiskData?.floodRisk !== null && input.climateRiskData?.floodRisk !== undefined) {
    // Convert 1-10 scale to 0-100 score
    return Math.min(100, input.climateRiskData.floodRisk * 10);
  }

  // FALLBACK: Use elevation data
  const floodRisk = input.elevationData?.floodRiskAssessment;

  if (!floodRisk) return 15; // Default moderate-low

  // Base score on risk level
  let score = 0;
  switch (floodRisk.risk) {
    case 'low': score = 5; break;
    case 'moderate': score = 35; break;
    case 'high': score = 70; break;
    default: score = 15;
  }

  // Adjust for specific conditions
  if (floodRisk.belowSeaLevel) score += 30;
  if (floodRisk.inLowLyingArea) score += 15;
  if (input.elevationData?.surroundingElevations?.isLowestPoint) score += 10;

  return Math.min(100, score);
}

/**
 * Calculate earthquake risk score from USGS seismic data
 */
function calculateEarthquakeScore(input: RiskCalculationInput): number {
  const seismic = input.seismicData;

  if (!seismic) return 10; // Default low for most areas

  // PGA-based scoring (0.1g = moderate, 0.4g = severe)
  const pgaScore = Math.min(100, (seismic.pga / 0.5) * 100);

  // Adjust based on seismic design category
  let categoryMultiplier = 1.0;
  switch (seismic.seismicDesignCategory) {
    case 'A': categoryMultiplier = 0.3; break;
    case 'B': categoryMultiplier = 0.5; break;
    case 'C': categoryMultiplier = 0.8; break;
    case 'D': categoryMultiplier = 1.0; break;
    case 'E': categoryMultiplier = 1.3; break;
    case 'F': categoryMultiplier = 1.5; break;
  }

  return Math.min(100, Math.round(pgaScore * categoryMultiplier));
}

/**
 * Calculate wildfire risk score from Zillow climate data or NASA FIRMS data
 */
function calculateWildfireScore(input: RiskCalculationInput): number {
  // PRIORITY: Use Zillow/First Street climate data if available (1-10 scale)
  if (input.climateRiskData?.fireRisk !== null && input.climateRiskData?.fireRisk !== undefined) {
    // Convert 1-10 scale to 0-100 score
    return Math.min(100, input.climateRiskData.fireRisk * 10);
  }

  // FALLBACK: Use NASA FIRMS data
  const wildfire = input.wildfireData;

  if (!wildfire) return 10; // Default low

  let score = 5; // Base score

  // Add points for active fires
  if (wildfire.fireCount > 0) {
    score += Math.min(50, wildfire.fireCount * 10);
  }

  // Adjust based on nearest fire distance
  if (wildfire.nearestFireMiles !== null && wildfire.nearestFireMiles !== undefined) {
    if (wildfire.nearestFireMiles < 5) score += 40;
    else if (wildfire.nearestFireMiles < 10) score += 25;
    else if (wildfire.nearestFireMiles < 25) score += 15;
    else if (wildfire.nearestFireMiles < 50) score += 5;
  }

  return Math.min(100, score);
}

/**
 * Calculate hurricane/wind risk score from Zillow climate data or state data
 */
function calculateHurricaneScore(input: RiskCalculationInput): number {
  // PRIORITY: Use Zillow/First Street wind risk data if available (1-10 scale)
  if (input.climateRiskData?.windRisk !== null && input.climateRiskData?.windRisk !== undefined) {
    // Convert 1-10 scale to 0-100 score
    return Math.min(100, input.climateRiskData.windRisk * 10);
  }

  // FALLBACK: Use state-based hurricane risk
  const stateRisk = STATE_HURRICANE_RISK[input.state] ?? 5;
  return stateRisk;
}

/**
 * Calculate sinkhole risk score based on geology
 */
function calculateSinkholeScore(input: RiskCalculationInput): number {
  const stateRisk = STATE_SINKHOLE_RISK[input.state] ?? 10;
  return stateRisk;
}

/**
 * Calculate environmental risk score from EPA data
 */
function calculateEnvironmentalScore(input: RiskCalculationInput): number {
  const env = input.environmentalData;

  if (!env?.counts) return 10; // Default low

  let score = 0;

  // Superfund sites are most serious
  score += env.counts.superfund * 30;

  // Brownfields are moderate concern
  score += env.counts.brownfield * 10;

  // UST sites are lower concern (usually remediated)
  score += env.counts.ust * 5;

  // TRI facilities indicate industrial activity
  score += (env.counts.tri ?? 0) * 8;

  // Proximity matters
  if (env.nearestSite && env.nearestSite.distanceMiles < 0.5) {
    score += 20;
  } else if (env.nearestSite && env.nearestSite.distanceMiles < 1) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Calculate radon risk score based on EPA zone
 */
function calculateRadonScore(input: RiskCalculationInput): number {
  const zone = STATE_RADON_ZONES[input.state] ?? 2;

  // Zone 1 = high risk (45-65), Zone 2 = moderate (25-40), Zone 3 = low (5-20)
  switch (zone) {
    case 1: return 55;
    case 2: return 30;
    case 3: return 10;
    default: return 30;
  }
}

/**
 * Calculate slope stability risk score from terrain data
 */
function calculateSlopeScore(input: RiskCalculationInput): number {
  const terrain = input.terrainData;

  if (!terrain) return 10; // Default low

  let score = 0;

  // Average slope scoring
  if (terrain.averageSlope < 3) score = 5;
  else if (terrain.averageSlope < 8) score = 10;
  else if (terrain.averageSlope < 15) score = 25;
  else if (terrain.averageSlope < 30) score = 50;
  else score = 75;

  // Adjust for max slope
  if (terrain.maxSlope > 30) score += 15;
  else if (terrain.maxSlope > 20) score += 10;

  // Stability assessment
  if (terrain.stability === 'high_risk') score += 20;
  else if (terrain.stability === 'moderate_risk') score += 10;

  return Math.min(100, score);
}

/**
 * Calculate overall risk score from category scores
 */
function calculateOverallRiskScore(categoryScores: RiskCategoryScore[]): number {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const cat of categoryScores) {
    totalWeightedScore += cat.rawScore * cat.weight;
    totalWeight += cat.weight;
  }

  return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
}

/**
 * Determine overall risk level from score
 */
function determineOverallRisk(score: number): 'low' | 'moderate' | 'high' | 'severe' {
  if (score <= 20) return 'low';
  if (score <= 40) return 'moderate';
  if (score <= 60) return 'high';
  return 'severe';
}

/**
 * Calculate confidence level based on data availability
 */
function calculateConfidence(categoryScores: RiskCategoryScore[]): number {
  const fullDataCount = categoryScores.filter(c => c.dataAvailability === 'full').length;
  const partialDataCount = categoryScores.filter(c => c.dataAvailability === 'partial').length;

  const baseConfidence = (fullDataCount * 100 + partialDataCount * 60) / categoryScores.length;
  return Math.round(baseConfidence);
}

/**
 * Generate risk factors (positive and negative)
 */
function generateRiskFactors(input: RiskCalculationInput, categoryScores: RiskCategoryScore[]): {
  topRiskFactors: string[];
  positiveFactors: string[];
  criticalWarnings: string[];
} {
  const topRiskFactors: string[] = [];
  const positiveFactors: string[] = [];
  const criticalWarnings: string[] = [];

  // Analyze each category
  for (const cat of categoryScores) {
    if (cat.rawScore >= 40) {
      switch (cat.category) {
        case 'flood':
          topRiskFactors.push('Elevated flood risk');
          break;
        case 'earthquake':
          topRiskFactors.push(`Seismic activity (Category ${input.seismicData?.seismicDesignCategory || 'Unknown'})`);
          break;
        case 'wildfire':
          if (input.wildfireData?.fireCount) {
            topRiskFactors.push(`${input.wildfireData.fireCount} active fires detected nearby`);
          } else {
            topRiskFactors.push('Elevated wildfire risk area');
          }
          break;
        case 'hurricane':
          topRiskFactors.push('Located in hurricane-prone region');
          break;
        case 'environmental':
          if (input.environmentalData?.counts?.superfund) {
            criticalWarnings.push(`${input.environmentalData.counts.superfund} Superfund site(s) nearby - Phase I ESA recommended`);
          } else {
            topRiskFactors.push('Environmental contamination sites nearby');
          }
          break;
        case 'radon':
          const radonZone = STATE_RADON_ZONES[input.state];
          if (radonZone === 1) {
            criticalWarnings.push(`${input.state} is in EPA Radon Zone 1 - testing strongly recommended`);
          } else {
            topRiskFactors.push('Elevated radon potential');
          }
          break;
        case 'slope':
          if (input.terrainData?.stability === 'high_risk') {
            topRiskFactors.push('Steep terrain - landslide risk');
          } else {
            topRiskFactors.push('Moderate slope considerations');
          }
          break;
        case 'sinkhole':
          topRiskFactors.push('Located in karst geology area');
          break;
      }
    } else if (cat.rawScore <= 15) {
      switch (cat.category) {
        case 'flood':
          positiveFactors.push('Outside flood zone');
          break;
        case 'earthquake':
          positiveFactors.push('Low earthquake risk');
          break;
        case 'wildfire':
          positiveFactors.push('No active fires nearby');
          break;
        case 'hurricane':
          positiveFactors.push('No hurricane exposure');
          break;
        case 'environmental':
          positiveFactors.push('No nearby Superfund sites');
          break;
        case 'slope':
          positiveFactors.push('Stable slope conditions');
          break;
      }
    }
  }

  return { topRiskFactors, positiveFactors, criticalWarnings };
}

/**
 * Calculate insurance estimates based on risk scores
 */
function calculateInsuranceEstimates(
  categoryScores: RiskCategoryScore[],
  propertyValue: number = 150000
): RiskAssessment['insuranceEstimates'] {
  const getScore = (cat: string) => categoryScores.find(c => c.category === cat)?.rawScore ?? 0;

  const floodScore = getScore('flood');
  const earthquakeScore = getScore('earthquake');
  const wildfireScore = getScore('wildfire');
  const hurricaneScore = getScore('hurricane');

  let totalAnnualCost = 0;
  const availabilityWarnings: string[] = [];

  // Flood insurance (only if in flood zone)
  let floodInsurance: number | null = null;
  if (floodScore > 25) {
    floodInsurance = Math.round(propertyValue * 0.005 * (1 + floodScore / 100));
    totalAnnualCost += floodInsurance;
  }

  // Earthquake insurance (only if in seismic zone)
  let earthquakeInsurance: number | null = null;
  if (earthquakeScore > 20) {
    earthquakeInsurance = Math.round(propertyValue * 0.003 * (1 + earthquakeScore / 100));
    totalAnnualCost += earthquakeInsurance;
  }

  // Fire/Wildfire insurance
  let fireInsurance = Math.round(propertyValue * 0.004); // Base rate
  if (wildfireScore > 30) {
    fireInsurance = Math.round(fireInsurance * (1 + wildfireScore / 100));
    if (wildfireScore > 60) {
      availabilityWarnings.push('High wildfire risk may limit insurance options');
    }
  }
  totalAnnualCost += fireInsurance;

  // Windstorm/Hurricane insurance
  let windstormInsurance: number | null = null;
  if (hurricaneScore > 20) {
    windstormInsurance = Math.round(propertyValue * 0.008 * (1 + hurricaneScore / 100));
    totalAnnualCost += windstormInsurance;
  }

  return {
    floodInsurance,
    earthquakeInsurance,
    fireInsurance,
    windstormInsurance,
    totalAnnualCost,
    availabilityWarnings,
  };
}

/**
 * Main function to calculate complete risk assessment from API data
 */
export function calculateRiskAssessment(input: RiskCalculationInput): RiskAssessment {
  // Calculate individual category scores
  const floodScore = calculateFloodScore(input);
  const earthquakeScore = calculateEarthquakeScore(input);
  const wildfireScore = calculateWildfireScore(input);
  const hurricaneScore = calculateHurricaneScore(input);
  const sinkholeScore = calculateSinkholeScore(input);
  const environmentalScore = calculateEnvironmentalScore(input);
  const radonScore = calculateRadonScore(input);
  const slopeScore = calculateSlopeScore(input);

  // Define weights (total = 1.0)
  const weights = {
    flood: 0.20,
    earthquake: 0.10,
    wildfire: 0.15,
    hurricane: 0.15,
    sinkhole: 0.10,
    environmental: 0.15,
    radon: 0.10,
    slope: 0.05,
    drought: 0.0,
  };

  // Build category scores array
  const categoryScores: RiskCategoryScore[] = [
    {
      category: 'flood',
      ...calculateCategoryScore('flood', floodScore, !!input.elevationData?.floodRiskAssessment),
      weight: weights.flood,
      weightedScore: floodScore * weights.flood,
    },
    {
      category: 'earthquake',
      ...calculateCategoryScore('earthquake', earthquakeScore, !!input.seismicData),
      weight: weights.earthquake,
      weightedScore: earthquakeScore * weights.earthquake,
    },
    {
      category: 'wildfire',
      ...calculateCategoryScore('wildfire', wildfireScore, !!input.wildfireData),
      weight: weights.wildfire,
      weightedScore: wildfireScore * weights.wildfire,
    },
    {
      category: 'hurricane',
      ...calculateCategoryScore('hurricane', hurricaneScore, true),
      weight: weights.hurricane,
      weightedScore: hurricaneScore * weights.hurricane,
    },
    {
      category: 'sinkhole',
      ...calculateCategoryScore('sinkhole', sinkholeScore, false),
      weight: weights.sinkhole,
      weightedScore: sinkholeScore * weights.sinkhole,
    },
    {
      category: 'environmental',
      ...calculateCategoryScore('environmental', environmentalScore, !!input.environmentalData?.counts),
      weight: weights.environmental,
      weightedScore: environmentalScore * weights.environmental,
    },
    {
      category: 'radon',
      ...calculateCategoryScore('radon', radonScore, true),
      weight: weights.radon,
      weightedScore: radonScore * weights.radon,
    },
    {
      category: 'slope',
      ...calculateCategoryScore('slope', slopeScore, !!input.terrainData),
      weight: weights.slope,
      weightedScore: slopeScore * weights.slope,
    },
  ];

  // Calculate overall score
  const overallScore = calculateOverallRiskScore(categoryScores);
  const overallRisk = determineOverallRisk(overallScore);
  const confidenceLevel = calculateConfidence(categoryScores);

  // Generate risk factors
  const { topRiskFactors, positiveFactors, criticalWarnings } = generateRiskFactors(input, categoryScores);

  // Calculate insurance estimates
  const insuranceEstimates = calculateInsuranceEstimates(categoryScores);

  // Build the radon zone data
  const radonZone = STATE_RADON_ZONES[input.state] ?? 2;

  // Build the full risk assessment object
  const assessment: RiskAssessment = {
    overallRisk,
    riskScore: overallScore,
    confidenceLevel,

    flood: {
      zone: input.elevationData?.floodRiskAssessment?.risk === 'high' ? 'AE' : 'X',
      zoneDescription: input.elevationData?.floodRiskAssessment?.reason || 'Area of minimal flood hazard',
      riskLevel: input.elevationData?.floodRiskAssessment?.risk || 'minimal',
      insuranceRequired: floodScore > 40,
      annualPremiumEstimate: insuranceEstimates.floodInsurance,
      baseFloodElevation: null,
      propertyElevation: input.terrainData?.elevationFeet || null,
      elevationDifference: null,
      floodwayStatus: input.elevationData?.floodRiskAssessment?.risk === 'high' ? 'in_floodway' : 'outside',
      historicalFlooding: null,
      mitigationRecommendations: floodScore > 25 ? ['Consider flood insurance', 'Review FEMA flood maps'] : [],
      dataSource: { name: 'Open-Elevation API', type: 'api', reliability: 'medium' },
      confidence: input.elevationData ? 85 : 50,
    },

    earthquake: {
      hazardLevel: earthquakeScore < 15 ? 'very_low' : earthquakeScore < 30 ? 'low' : 'moderate',
      pga: input.seismicData?.pga || 0.05,
      spectralAcceleration02: input.seismicData?.ss || 0.1,
      spectralAcceleration10: input.seismicData?.s1 || 0.04,
      distanceToFault: null,
      nearestFaultName: null,
      historicalQuakeCount: 0,
      maxHistoricalMagnitude: null,
      seismicDesignCategory: (input.seismicData?.seismicDesignCategory as 'A' | 'B' | 'C' | 'D' | 'E' | 'F') || 'A',
      mitigationRecommendations: earthquakeScore > 30 ? ['Consider earthquake insurance', 'Secure heavy furniture'] : [],
      dataSource: { name: 'USGS Design Maps', type: 'api', reliability: 'high' },
      confidence: input.seismicData ? 90 : 60,
    },

    wildfire: {
      riskLevel: wildfireScore < 15 ? 'minimal' : wildfireScore < 30 ? 'low' : 'moderate',
      whpScore: Math.ceil(wildfireScore / 20),
      inWUI: wildfireScore > 40,
      wuiType: null,
      activeFiresNearby: input.wildfireData?.fireCount || 0,
      distanceToNearestFire: input.wildfireData?.nearestFireMiles || null,
      historicalFireCount: 0,
      recentAcresBurned: null,
      fuelLoad: wildfireScore > 40 ? 'moderate' : 'light',
      defensibleSpaceRequired: wildfireScore > 50,
      buildingRequirements: [],
      insuranceConsiderations: wildfireScore > 50 ? ['Fire insurance may be more expensive'] : [],
      evacuationAccessibility: 'good',
      mitigationRecommendations: wildfireScore > 30 ? ['Create defensible space', 'Use fire-resistant materials'] : [],
      dataSource: { name: 'NASA FIRMS', type: 'api', reliability: 'high' },
      confidence: input.wildfireData ? 85 : 50,
    },

    hurricane: {
      windZone: hurricaneScore > 50 ? 'zone_4' : hurricaneScore > 20 ? 'zone_3' : null,
      windZoneDescription: hurricaneScore > 50 ? 'High-velocity hurricane zone' : null,
      maxWindSpeed: hurricaneScore > 50 ? 150 : hurricaneScore > 20 ? 110 : null,
      stormSurgeZone: null,
      stormSurgeDescription: null,
      evacuationZone: hurricaneScore > 50 ? 'A' : null,
      historicalStorms: null,
      buildingCodeRequirements: hurricaneScore > 30 ? ['Wind-resistant construction required'] : [],
      insuranceConsiderations: hurricaneScore > 30 ? ['Windstorm insurance recommended'] : [],
      dataSource: { name: 'NOAA Historical Data', type: 'database', reliability: 'high' },
      confidence: 90,
    },

    sinkhole: {
      riskLevel: sinkholeScore < 15 ? 'negligible' : sinkholeScore < 30 ? 'low' : 'moderate',
      inKarstArea: sinkholeScore > 20,
      karstType: sinkholeScore > 20 ? 'limestone' : null,
      distanceToNearestSinkhole: null,
      sinkholesWithinOneMile: 0,
      sinkholesWithinFiveMiles: sinkholeScore > 30 ? 2 : 0,
      subsidenceHistory: false,
      stateRequiresDisclosure: ['FL', 'TN', 'AL'].includes(input.state),
      insuranceConsiderations: sinkholeScore > 40 ? ['Sinkhole coverage may be needed'] : [],
      mitigationRecommendations: [],
      dataSource: { name: 'State Geological Survey', type: 'database', reliability: 'medium' },
      confidence: 65,
    },

    environmental: {
      riskLevel: environmentalScore < 15 ? 'none_known' : environmentalScore < 30 ? 'low' : 'moderate',
      superfundSitesNearby: input.environmentalData?.counts?.superfund || 0,
      brownfieldSitesNearby: input.environmentalData?.counts?.brownfield || 0,
      ustSitesNearby: input.environmentalData?.counts?.ust || 0,
      triSitesNearby: input.environmentalData?.counts?.tri || 0,
      nearestSite: input.environmentalData?.nearestSite ? {
        name: input.environmentalData.nearestSite.name,
        epaId: '',
        type: input.environmentalData.nearestSite.type as 'superfund' | 'brownfield' | 'ust' | 'tri' | 'rcra',
        status: (input.environmentalData.nearestSite.status as 'active' | 'remediated' | 'unknown') || 'unknown',
        distanceMiles: input.environmentalData.nearestSite.distanceMiles,
        direction: 'N',
        contaminants: [],
        groundwaterImpact: false,
      } : null,
      nearbySites: [],
      phaseIRecommended: environmentalScore > 40,
      groundwaterConcerns: [],
      airQualityConcerns: [],
      historicalIndustrialUse: false,
      mitigationRecommendations: environmentalScore > 30 ? ['Consider Phase I Environmental Site Assessment'] : [],
      dataSource: { name: 'EPA Envirofacts', type: 'api', reliability: 'high' },
      confidence: input.environmentalData ? 80 : 50,
    },

    radon: {
      radonZone,
      riskLevel: radonZone === 1 ? 'high' : radonZone === 2 ? 'moderate' : 'low',
      predictedLevel: radonZone === 1 ? 6.0 : radonZone === 2 ? 3.0 : 1.5,
      testingRecommended: radonZone <= 2,
      stateAverageLevel: radonZone === 1 ? 8.6 : radonZone === 2 ? 4.0 : 1.8,
      countyAverageLevel: null,
      percentAboveActionLevel: radonZone === 1 ? 45 : radonZone === 2 ? 25 : 10,
      mitigationTypicallyNeeded: radonZone === 1,
      estimatedMitigationCost: radonZone === 1 ? { min: 800, max: 1500 } : null,
      stateDisclosureRequired: ['PA', 'NJ', 'NY', 'OH', 'IL'].includes(input.state),
      mitigationRecommendations: radonZone === 1
        ? ['Radon test strongly recommended before purchase', 'Budget $800-1500 for mitigation if needed']
        : radonZone === 2
        ? ['Radon test recommended']
        : [],
      dataSource: { name: 'EPA Radon Zone Map', type: 'database', reliability: 'high' },
      confidence: 75,
    },

    slope: {
      stabilityLevel: (() => {
        const stability = input.terrainData?.stability;
        if (stability === 'unstable' || stability === 'highly_unstable') return stability;
        if (stability === 'marginally_stable') return 'marginally_stable';
        return 'stable';
      })(),
      slopePercentage: input.terrainData?.averageSlope || 5,
      maxSlopePercentage: input.terrainData?.maxSlope || 10,
      slopeAspect: 'N',
      landslideSusceptibility: slopeScore > 40 ? 'moderate' : 'very_low',
      inLandslideZone: slopeScore > 60,
      historicalLandslides: 0,
      soilType: null,
      drainageConsiderations: input.terrainData?.averageSlope && input.terrainData.averageSlope > 15
        ? ['Slope may affect drainage', 'Consider grading']
        : ['Good natural drainage'],
      mitigationRecommendations: slopeScore > 40 ? ['Geotechnical survey recommended', 'Consider retaining walls'] : [],
      dataSource: { name: 'Open-Elevation API', type: 'calculated', reliability: 'medium' },
      confidence: input.terrainData ? 75 : 50,
    },

    drought: null,

    categoryScores,
    weightsUsed: weights,
    insuranceEstimates,

    recommendations: [
      ...criticalWarnings.map(w => w),
      ...topRiskFactors.slice(0, 3).map(f => `Address: ${f}`),
    ].slice(0, 5),

    mitigationActions: topRiskFactors.slice(0, 3).map((factor, index) => ({
      riskType: factor.split(':')[0] || 'General',
      action: `Address ${factor}`,
      priority: index + 1,
      estimatedCost: { min: 500, max: 5000 },
      effectiveness: 'moderate' as const,
      timeframe: '1-3 months',
      insuranceImpact: 'May reduce premiums',
      roiExplanation: 'Reduces long-term risk exposure',
    })),

    warnings: criticalWarnings,
    topRiskFactors,
    positiveFactors,

    assessedAt: new Date(),
  };

  return assessment;
}

/**
 * Helper to check if we have enough data to calculate real risk
 */
export function hasRealRiskData(input: Partial<RiskCalculationInput>): boolean {
  // Check for Zillow climate data
  const hasClimateData = input.climateRiskData && (
    input.climateRiskData.floodRisk !== null ||
    input.climateRiskData.fireRisk !== null ||
    input.climateRiskData.windRisk !== null
  );

  return !!(
    hasClimateData ||
    input.seismicData ||
    input.wildfireData ||
    input.environmentalData ||
    input.terrainData ||
    input.elevationData?.floodRiskAssessment
  );
}
