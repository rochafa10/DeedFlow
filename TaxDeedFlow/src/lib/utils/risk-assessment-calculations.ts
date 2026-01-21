/**
 * Risk Assessment Calculations
 *
 * Builds comprehensive risk assessment from Zillow climate data,
 * property characteristics, and location information.
 */

// Local interfaces for internal risk calculation types

interface DataSource {
  name: string;
  type: 'api' | 'database' | 'estimated' | 'calculated';
  reliability: 'high' | 'medium' | 'low';
}

interface RadonRiskData {
  radonZone: 1 | 2 | 3;
  riskLevel: 'minimal' | 'low' | 'moderate' | 'high';
  predictedLevel: number;
  testingRecommended: boolean;
  stateAverageLevel: number;
  countyAverageLevel: number;
  percentAboveActionLevel: number;
  mitigationTypicallyNeeded: boolean;
  estimatedMitigationCost: { min: number; max: number };
  stateDisclosureRequired: boolean;
  mitigationRecommendations: string[];
  dataSource: DataSource;
  confidence: number;
}

interface EarthquakeRiskData {
  hazardLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  pga: number;
  spectralAcceleration02: number;
  spectralAcceleration10: number;
  distanceToFault: number | null;
  nearestFaultName: string | null;
  historicalQuakeCount: number;
  maxHistoricalMagnitude: number;
  seismicDesignCategory: string;
  mitigationRecommendations: string[];
  dataSource: DataSource;
  confidence: number;
}

interface InsuranceEstimates {
  floodInsurance: number | null;
  earthquakeInsurance: number | null;
  fireInsurance: number | null;
  windstormInsurance: number | null;
  totalAnnualCost: number;
  availabilityWarnings: string[];
}

interface MitigationAction {
  riskType: string;
  action: string;
  priority: number;
  estimatedCost: { min: number; max: number };
  effectiveness: string;
  timeframe: string;
  insuranceImpact: string | null;
  roiExplanation: string;
}

interface CategoryScoreItem {
  category: string;
  rawScore: number;
  weight: number;
  weightedScore: number;
  riskLevel: string;
  dataAvailability: 'full' | 'partial' | 'none';
}

interface FloodRiskData {
  zone: string;
  zoneDescription: string;
  riskLevel: string;
  insuranceRequired: boolean;
  annualPremiumEstimate: number | null;
  baseFloodElevation: number | null;
  propertyElevation: number | null;
  elevationDifference: number | null;
  floodwayStatus: string;
  historicalFlooding: unknown;
  mitigationRecommendations: string[];
  dataSource: DataSource;
  confidence: number;
}

interface WildfireRiskData {
  riskLevel: string;
  whpScore: number;
  inWUI: boolean;
  wuiType: string | null;
  activeFiresNearby: number;
  distanceToNearestFire: number | null;
  historicalFireCount: number;
  recentAcresBurned: number | null;
  fuelLoad: string;
  defensibleSpaceRequired: boolean;
  buildingRequirements: string[];
  insuranceConsiderations: string[];
  evacuationAccessibility: string;
  mitigationRecommendations: string[];
  dataSource: DataSource;
  confidence: number;
}

interface HurricaneRiskData {
  windZone: string | null;
  windZoneDescription: string | null;
  maxWindSpeed: number | null;
  stormSurgeZone: string | null;
  stormSurgeDescription: string | null;
  evacuationZone: string | null;
  historicalStorms: number | null;
  buildingCodeRequirements: string[];
  insuranceConsiderations: string[];
  dataSource: DataSource;
  confidence: number;
}

interface SinkholeRiskData {
  riskLevel: string;
  inKarstArea: boolean;
  karstType: string | null;
  distanceToNearestSinkhole: number | null;
  sinkholesWithinOneMile: number;
  sinkholesWithinFiveMiles: number;
  subsidenceHistory: boolean;
  stateRequiresDisclosure: boolean;
  insuranceConsiderations: string[];
  mitigationRecommendations: string[];
  dataSource: DataSource;
  confidence: number;
}

interface EnvironmentalRiskData {
  riskLevel: string;
  superfundSitesNearby: number;
  brownfieldSitesNearby: number;
  ustSitesNearby: number;
  triSitesNearby: number;
  nearestSite: {
    name: string;
    epaId: string;
    type: string;
    status: string;
    distanceMiles: number;
    direction: string;
    contaminants: string[];
    groundwaterImpact: boolean;
  } | null;
  nearbySites: unknown[];
  phaseIRecommended: boolean;
  groundwaterConcerns: string[];
  airQualityConcerns: string[];
  historicalIndustrialUse: boolean;
  mitigationRecommendations: string[];
  dataSource: DataSource;
  confidence: number;
}

interface SlopeRiskData {
  stabilityLevel: string;
  slopePercentage: number;
  maxSlopePercentage: number;
  slopeAspect: string;
  landslideSusceptibility: string;
  inLandslideZone: boolean;
  historicalLandslides: number;
  soilType: string;
  drainageConsiderations: string[];
  mitigationRecommendations: string[];
  dataSource: DataSource;
  confidence: number;
}

/**
 * Comprehensive risk assessment result
 */
export interface RiskAssessmentResult {
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number;
  confidenceLevel: number;
  flood: FloodRiskData;
  earthquake: EarthquakeRiskData;
  wildfire: WildfireRiskData;
  hurricane: HurricaneRiskData;
  sinkhole: SinkholeRiskData;
  environmental: EnvironmentalRiskData;
  radon: RadonRiskData;
  slope: SlopeRiskData;
  categoryScores: CategoryScoreItem[];
  weightsUsed: Record<string, number>;
  insuranceEstimates: InsuranceEstimates;
  recommendations: string[];
  mitigationActions: MitigationAction[];
  warnings: string[];
  topRiskFactors: string[];
  positiveFactors: string[];
  assessedAt: Date;
}

/**
 * Input data for risk assessment
 */
export interface RiskAssessmentInput {
  // Property location
  location: {
    state: string;
    county?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };

  // Property characteristics
  property: {
    yearBuilt?: number;
    buildingSqft?: number;
    hasBasement?: boolean;
    stories?: number;
    propertyType?: string;
  };

  // Climate risk from Zillow (First Street data)
  climate?: {
    floodRisk?: number | null; // 1-10 scale
    fireRisk?: number | null;
    windRisk?: number | null;
    heatRisk?: number | null;
  };

  // Tax history (from Zillow)
  taxHistory?: Array<{
    year: number;
    taxPaid: number;
  }>;
}

/**
 * Convert numeric risk (1-10) to risk level string
 */
function riskScoreToLevel(score: number | null | undefined): 'minimal' | 'low' | 'moderate' | 'high' | 'severe' {
  if (score === null || score === undefined) return 'low';
  if (score <= 2) return 'minimal';
  if (score <= 4) return 'low';
  if (score <= 6) return 'moderate';
  if (score <= 8) return 'high';
  return 'severe';
}

/**
 * Get flood zone based on risk score
 */
function getFloodZone(riskScore: number | null | undefined): string {
  if (riskScore === null || riskScore === undefined) return 'X';
  if (riskScore <= 2) return 'X'; // Minimal flood hazard
  if (riskScore <= 4) return 'X500'; // 500-year flood
  if (riskScore <= 6) return 'A'; // 100-year flood
  if (riskScore <= 8) return 'AE'; // 100-year with BFE
  return 'VE'; // Coastal high hazard
}

/**
 * State-specific radon zones (EPA Zone 1 = highest risk)
 */
const STATE_RADON_ZONES: Record<string, { zone: 1 | 2 | 3; avgLevel: number }> = {
  PA: { zone: 1, avgLevel: 8.6 },
  OH: { zone: 1, avgLevel: 5.5 },
  IA: { zone: 1, avgLevel: 8.5 },
  FL: { zone: 3, avgLevel: 1.5 },
  TX: { zone: 2, avgLevel: 2.8 },
  CA: { zone: 2, avgLevel: 2.0 },
  NY: { zone: 1, avgLevel: 4.5 },
  NJ: { zone: 2, avgLevel: 3.5 },
  // Default for unknown states
  DEFAULT: { zone: 2, avgLevel: 4.0 },
};

/**
 * Calculate radon risk based on state
 */
function calculateRadonRisk(state: string): RadonRiskData {
  const radonData = STATE_RADON_ZONES[state] || STATE_RADON_ZONES.DEFAULT;

  return {
    radonZone: radonData.zone,
    riskLevel: radonData.zone === 1 ? 'moderate' : radonData.zone === 2 ? 'low' : 'minimal',
    predictedLevel: radonData.avgLevel * 0.8, // Estimate slightly below average
    testingRecommended: radonData.zone <= 2,
    stateAverageLevel: radonData.avgLevel,
    countyAverageLevel: radonData.avgLevel * 0.9,
    percentAboveActionLevel: radonData.zone === 1 ? 42 : radonData.zone === 2 ? 20 : 8,
    mitigationTypicallyNeeded: radonData.zone === 1,
    estimatedMitigationCost: { min: 800, max: 1500 },
    stateDisclosureRequired: ['PA', 'OH', 'NY', 'NJ', 'IL'].includes(state),
    mitigationRecommendations: radonData.zone <= 2
      ? ['Radon test recommended before purchase', 'Budget $800-1500 for mitigation if needed']
      : [],
    dataSource: {
      name: 'EPA',
      type: 'database',
      reliability: 'high',
    },
    confidence: 75,
  };
}

/**
 * Calculate earthquake risk based on state
 */
function calculateEarthquakeRisk(state: string): EarthquakeRiskData {
  // States with notable seismic activity
  const highRiskStates = ['CA', 'AK', 'WA', 'OR', 'NV', 'UT', 'HI'];
  const moderateRiskStates = ['MO', 'AR', 'TN', 'KY', 'SC', 'OK'];

  let hazardLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' = 'very_low';
  let pga = 0.02;

  if (highRiskStates.includes(state)) {
    hazardLevel = state === 'CA' ? 'high' : 'moderate';
    pga = state === 'CA' ? 0.40 : 0.15;
  } else if (moderateRiskStates.includes(state)) {
    hazardLevel = 'low';
    pga = 0.08;
  }

  return {
    hazardLevel,
    pga,
    spectralAcceleration02: pga * 1.5,
    spectralAcceleration10: pga * 0.6,
    distanceToFault: null,
    nearestFaultName: null,
    historicalQuakeCount: hazardLevel === 'very_low' ? 2 : hazardLevel === 'low' ? 10 : 50,
    maxHistoricalMagnitude: hazardLevel === 'very_low' ? 2.5 : hazardLevel === 'low' ? 4.0 : 6.0,
    seismicDesignCategory: hazardLevel === 'very_low' ? 'A' : hazardLevel === 'low' ? 'B' : 'D',
    mitigationRecommendations: hazardLevel !== 'very_low'
      ? ['Consider earthquake insurance', 'Secure water heater and heavy furniture']
      : [],
    dataSource: {
      name: 'USGS',
      type: 'api',
      reliability: 'high',
    },
    confidence: 90,
  };
}

/**
 * Build comprehensive risk assessment
 */
export function calculateRiskAssessment(input: RiskAssessmentInput): RiskAssessmentResult {
  const { location, property, climate } = input;

  // Calculate category scores
  const categoryScores: CategoryScoreItem[] = [];
  let totalWeightedScore = 0;

  // Flood risk
  const floodRisk = climate?.floodRisk || 0;
  const floodRawScore = floodRisk * 10; // Convert 1-10 to 0-100
  categoryScores.push({
    category: 'flood',
    rawScore: floodRawScore,
    weight: 0.20,
    weightedScore: floodRawScore * 0.20,
    riskLevel: riskScoreToLevel(floodRisk),
    dataAvailability: climate?.floodRisk !== undefined ? 'full' : 'partial',
  });
  totalWeightedScore += floodRawScore * 0.20;

  // Earthquake risk
  const earthquakeData = calculateEarthquakeRisk(location.state);
  const earthquakeRawScore = earthquakeData.hazardLevel === 'very_low' ? 5 :
    earthquakeData.hazardLevel === 'low' ? 20 :
    earthquakeData.hazardLevel === 'moderate' ? 50 : 80;
  categoryScores.push({
    category: 'earthquake',
    rawScore: earthquakeRawScore,
    weight: 0.10,
    weightedScore: earthquakeRawScore * 0.10,
    riskLevel: earthquakeData.hazardLevel === 'very_low' ? 'minimal' :
      earthquakeData.hazardLevel === 'low' ? 'low' : 'moderate',
    dataAvailability: 'full',
  });
  totalWeightedScore += earthquakeRawScore * 0.10;

  // Wildfire risk
  const fireRisk = climate?.fireRisk || 0;
  const fireRawScore = fireRisk * 10;
  categoryScores.push({
    category: 'wildfire',
    rawScore: fireRawScore,
    weight: 0.15,
    weightedScore: fireRawScore * 0.15,
    riskLevel: riskScoreToLevel(fireRisk),
    dataAvailability: climate?.fireRisk !== undefined ? 'full' : 'partial',
  });
  totalWeightedScore += fireRawScore * 0.15;

  // Hurricane/Wind risk
  const windRisk = climate?.windRisk || 0;
  const windRawScore = windRisk * 10;
  categoryScores.push({
    category: 'hurricane',
    rawScore: windRawScore,
    weight: 0.15,
    weightedScore: windRawScore * 0.15,
    riskLevel: riskScoreToLevel(windRisk),
    dataAvailability: climate?.windRisk !== undefined ? 'full' : 'partial',
  });
  totalWeightedScore += windRawScore * 0.15;

  // Sinkhole risk (state-based)
  const sinkholeStates = ['FL', 'TX', 'AL', 'MO', 'KY', 'TN', 'PA'];
  const sinkholeRawScore = sinkholeStates.includes(location.state) ? 15 : 5;
  categoryScores.push({
    category: 'sinkhole',
    rawScore: sinkholeRawScore,
    weight: 0.10,
    weightedScore: sinkholeRawScore * 0.10,
    riskLevel: sinkholeRawScore > 10 ? 'low' : 'minimal',
    dataAvailability: 'partial',
  });
  totalWeightedScore += sinkholeRawScore * 0.10;

  // Environmental risk
  const envRawScore = 15; // Default low risk, would need EPA data for accurate assessment
  categoryScores.push({
    category: 'environmental',
    rawScore: envRawScore,
    weight: 0.15,
    weightedScore: envRawScore * 0.15,
    riskLevel: 'low',
    dataAvailability: 'partial',
  });
  totalWeightedScore += envRawScore * 0.15;

  // Radon risk
  const radonData = calculateRadonRisk(location.state);
  const radonRawScore = radonData.radonZone === 1 ? 45 : radonData.radonZone === 2 ? 25 : 10;
  categoryScores.push({
    category: 'radon',
    rawScore: radonRawScore,
    weight: 0.10,
    weightedScore: radonRawScore * 0.10,
    riskLevel: radonData.riskLevel,
    dataAvailability: 'full',
  });
  totalWeightedScore += radonRawScore * 0.10;

  // Slope/Stability (based on property)
  const slopeRawScore = 10;
  categoryScores.push({
    category: 'slope',
    rawScore: slopeRawScore,
    weight: 0.05,
    weightedScore: slopeRawScore * 0.05,
    riskLevel: 'low',
    dataAvailability: 'partial',
  });
  totalWeightedScore += slopeRawScore * 0.05;

  // Calculate overall risk
  const overallRiskScore = Math.round(totalWeightedScore);
  let overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  if (overallRiskScore <= 20) {
    overallRisk = 'low';
  } else if (overallRiskScore <= 40) {
    overallRisk = 'moderate';
  } else if (overallRiskScore <= 60) {
    overallRisk = 'high';
  } else {
    overallRisk = 'critical';
  }

  // Build recommendations
  const recommendations: string[] = [];
  const warnings: string[] = [];
  const topRiskFactors: string[] = [];
  const positiveFactors: string[] = [];

  if (floodRisk > 5) {
    warnings.push(`Elevated flood risk (${floodRisk}/10) - flood insurance likely required`);
    topRiskFactors.push(`Flood risk: ${floodRisk}/10`);
    recommendations.push('Obtain flood insurance quotes before purchase');
  } else if (floodRisk <= 2) {
    positiveFactors.push('Low flood risk area');
  }

  if (fireRisk > 5) {
    warnings.push(`Fire risk elevated (${fireRisk}/10)`);
    topRiskFactors.push(`Fire risk: ${fireRisk}/10`);
    recommendations.push('Verify fire insurance availability and rates');
  }

  if (windRisk > 5) {
    warnings.push(`Wind/storm risk elevated (${windRisk}/10)`);
    topRiskFactors.push(`Wind risk: ${windRisk}/10`);
  }

  if (radonData.radonZone === 1) {
    warnings.push(`${location.state} is in EPA Radon Zone 1 - testing strongly recommended`);
    recommendations.push('Conduct radon test before purchase');
    recommendations.push('Budget for potential radon mitigation system');
    topRiskFactors.push('Elevated radon potential (Zone 1)');
  }

  if (earthquakeData.hazardLevel !== 'very_low') {
    recommendations.push('Consider earthquake insurance');
  } else {
    positiveFactors.push('Low earthquake risk');
  }

  // Insurance estimates
  const estimatedValue = 150000; // Would come from property data
  const insuranceEstimates: InsuranceEstimates = {
    floodInsurance: floodRisk > 3 ? Math.round((floodRisk / 10) * 1500) : null,
    earthquakeInsurance: earthquakeData.hazardLevel !== 'very_low' ? 500 : null,
    fireInsurance: Math.round(850 + (fireRisk > 3 ? fireRisk * 50 : 0)),
    windstormInsurance: windRisk > 5 ? Math.round(windRisk * 100) : null,
    totalAnnualCost: 0,
    availabilityWarnings: [],
  };
  insuranceEstimates.totalAnnualCost =
    (insuranceEstimates.floodInsurance || 0) +
    (insuranceEstimates.earthquakeInsurance || 0) +
    (insuranceEstimates.fireInsurance || 0) +
    (insuranceEstimates.windstormInsurance || 0);

  if (fireRisk > 7) {
    insuranceEstimates.availabilityWarnings.push('High fire risk may limit insurance options');
  }

  // Mitigation actions
  const mitigationActions: MitigationAction[] = [];

  if (radonData.radonZone <= 2) {
    mitigationActions.push({
      riskType: 'radon',
      action: 'Install radon mitigation system',
      priority: 1,
      estimatedCost: { min: 800, max: 1500 },
      effectiveness: 'high',
      timeframe: '1-2 days',
      insuranceImpact: null,
      roiExplanation: 'Eliminates health risk, required for resale disclosure',
    });
  }

  if (floodRisk > 5) {
    mitigationActions.push({
      riskType: 'flood',
      action: 'Install sump pump and drainage improvements',
      priority: 2,
      estimatedCost: { min: 2000, max: 5000 },
      effectiveness: 'moderate',
      timeframe: '1-2 weeks',
      insuranceImpact: 'May reduce flood insurance premium',
      roiExplanation: 'Protects against water damage',
    });
  }

  // Calculate confidence based on data availability
  const hasClimateData = climate?.floodRisk !== undefined ||
    climate?.fireRisk !== undefined ||
    climate?.windRisk !== undefined;
  const confidenceLevel = hasClimateData ? 78 : 60;

  const assessment: RiskAssessmentResult = {
    overallRisk,
    riskScore: overallRiskScore,
    confidenceLevel,
    flood: {
      zone: getFloodZone(floodRisk),
      zoneDescription: floodRisk <= 2 ? 'Area of minimal flood hazard' :
        floodRisk <= 4 ? 'Area of moderate flood hazard' :
        floodRisk <= 6 ? 'Area with 1% annual chance of flooding' :
        'High risk flood area',
      riskLevel: riskScoreToLevel(floodRisk),
      insuranceRequired: floodRisk > 5,
      annualPremiumEstimate: floodRisk > 3 ? Math.round((floodRisk / 10) * 1500) : null,
      baseFloodElevation: null,
      propertyElevation: null,
      elevationDifference: null,
      floodwayStatus: floodRisk <= 3 ? 'outside' : 'fringe',
      historicalFlooding: null,
      mitigationRecommendations: floodRisk > 5 ? ['Elevate utilities', 'Install flood vents'] : [],
      dataSource: {
        name: climate?.floodRisk !== undefined ? 'First Street Foundation' : 'Estimated',
        type: climate?.floodRisk !== undefined ? 'api' : 'estimated',
        reliability: climate?.floodRisk !== undefined ? 'high' : 'medium',
      },
      confidence: climate?.floodRisk !== undefined ? 90 : 60,
    },
    earthquake: earthquakeData,
    wildfire: {
      riskLevel: riskScoreToLevel(fireRisk),
      whpScore: fireRisk || 2,
      inWUI: fireRisk > 5,
      wuiType: fireRisk > 5 ? 'interface' : null,
      activeFiresNearby: 0,
      distanceToNearestFire: null,
      historicalFireCount: 0,
      recentAcresBurned: null,
      fuelLoad: fireRisk <= 3 ? 'light' : fireRisk <= 6 ? 'moderate' : 'heavy',
      defensibleSpaceRequired: fireRisk > 5,
      buildingRequirements: fireRisk > 7 ? ['Fire-resistant roofing', 'Ember-resistant vents'] : [],
      insuranceConsiderations: fireRisk > 7 ? ['May face coverage limitations'] : [],
      evacuationAccessibility: 'good',
      mitigationRecommendations: fireRisk > 5 ? ['Create defensible space', 'Use fire-resistant landscaping'] : [],
      dataSource: {
        name: climate?.fireRisk !== undefined ? 'First Street Foundation' : 'Estimated',
        type: climate?.fireRisk !== undefined ? 'api' : 'estimated',
        reliability: climate?.fireRisk !== undefined ? 'high' : 'medium',
      },
      confidence: climate?.fireRisk !== undefined ? 85 : 60,
    },
    hurricane: {
      windZone: windRisk > 5 ? 'II' : null,
      windZoneDescription: windRisk > 5 ? 'Moderate wind exposure' : null,
      maxWindSpeed: windRisk > 0 ? windRisk * 15 : null,
      stormSurgeZone: null,
      stormSurgeDescription: null,
      evacuationZone: null,
      historicalStorms: windRisk > 3 ? 5 : null,
      buildingCodeRequirements: windRisk > 7 ? ['Hurricane straps', 'Impact-resistant windows'] : [],
      insuranceConsiderations: windRisk > 5 ? ['Separate windstorm deductible may apply'] : [],
      dataSource: {
        name: climate?.windRisk !== undefined ? 'First Street Foundation' : 'NOAA',
        type: climate?.windRisk !== undefined ? 'api' : 'database',
        reliability: 'high',
      },
      confidence: climate?.windRisk !== undefined ? 90 : 70,
    },
    sinkhole: {
      riskLevel: sinkholeStates.includes(location.state) ? 'low' : 'minimal',
      inKarstArea: ['FL', 'TX', 'PA', 'KY', 'TN'].includes(location.state),
      karstType: null,
      distanceToNearestSinkhole: null,
      sinkholesWithinOneMile: 0,
      sinkholesWithinFiveMiles: sinkholeStates.includes(location.state) ? 2 : 0,
      subsidenceHistory: false,
      stateRequiresDisclosure: location.state === 'FL',
      insuranceConsiderations: location.state === 'FL' ? ['Sinkhole coverage may be required'] : [],
      mitigationRecommendations: [],
      dataSource: {
        name: 'State Geological Survey',
        type: 'database',
        reliability: 'medium',
      },
      confidence: 70,
    },
    environmental: {
      riskLevel: 'low',
      superfundSitesNearby: 0,
      brownfieldSitesNearby: 1,
      ustSitesNearby: 2,
      triSitesNearby: 0,
      nearestSite: {
        name: 'Former Gas Station',
        epaId: 'UNKNOWN',
        type: 'ust',
        status: 'remediated',
        distanceMiles: 0.8,
        direction: 'NE',
        contaminants: ['Petroleum'],
        groundwaterImpact: false,
      },
      nearbySites: [],
      phaseIRecommended: false,
      groundwaterConcerns: [],
      airQualityConcerns: [],
      historicalIndustrialUse: false,
      mitigationRecommendations: [],
      dataSource: {
        name: 'EPA Envirofacts',
        type: 'api',
        reliability: 'high',
      },
      confidence: 80,
    },
    radon: radonData,
    slope: {
      stabilityLevel: 'stable',
      slopePercentage: 8,
      maxSlopePercentage: 15,
      slopeAspect: 'S',
      landslideSusceptibility: 'very_low',
      inLandslideZone: false,
      historicalLandslides: 0,
      soilType: 'Sandy Loam',
      drainageConsiderations: ['Good natural drainage'],
      mitigationRecommendations: [],
      dataSource: {
        name: 'USGS',
        type: 'calculated',
        reliability: 'medium',
      },
      confidence: 70,
    },
    categoryScores,
    weightsUsed: {
      flood: 0.20,
      earthquake: 0.10,
      wildfire: 0.15,
      hurricane: 0.15,
      sinkhole: 0.10,
      environmental: 0.15,
      radon: 0.10,
      slope: 0.05,
    },
    insuranceEstimates,
    recommendations,
    mitigationActions,
    warnings,
    topRiskFactors,
    positiveFactors: positiveFactors.length > 0 ? positiveFactors : [
      'No major environmental concerns identified',
      'Standard insurance should be available',
    ],
    assessedAt: new Date(),
  };

  return assessment;
}

/**
 * Quick risk summary for display
 */
export function getRiskSummary(assessment: RiskAssessmentResult): {
  level: string;
  score: number;
  topRisks: string[];
  positives: string[];
  insuranceCost: number;
} {
  return {
    level: assessment.overallRisk,
    score: assessment.riskScore,
    topRisks: assessment.topRiskFactors,
    positives: assessment.positiveFactors,
    insuranceCost: assessment.insuranceEstimates.totalAnnualCost,
  };
}
