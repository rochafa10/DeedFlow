/**
 * Drought Risk Analyzer
 *
 * Analyzes drought risk for properties using U.S. Drought Monitor data,
 * historical drought patterns, and regional water availability. Particularly
 * relevant for agricultural land and vacant properties common in tax deed sales.
 *
 * @module lib/risk/drought/drought-analyzer
 * @author Claude Code Agent
 * @date 2026-01-22
 */

import type {
  DroughtRiskAnalysis,
  DroughtCategory,
  WaterAvailability,
  CropImpactLevel,
  RiskLevel,
  DataSource,
} from '@/types/risk-analysis';
import {
  getDroughtMonitorService,
  type DroughtData,
} from '@/lib/api/services/drought-monitor-service';

// ============================================
// Constants and Configuration
// ============================================

/**
 * Drought severity definitions based on U.S. Drought Monitor categories
 *
 * Source: U.S. Drought Monitor (NDMC, USDA, NOAA)
 * https://droughtmonitor.unl.edu/About/AbouttheData/DroughtClassification.aspx
 */
export const DROUGHT_SEVERITY_DEFINITIONS: Record<DroughtCategory, {
  riskLevel: RiskLevel;
  description: string;
  waterRestrictions: string[];
  agriculturalImpact: string;
  landValueImpact: string;
  cropImpact: CropImpactLevel;
}> = {
  none: {
    riskLevel: 'minimal',
    description: 'No drought conditions - Normal precipitation and water availability',
    waterRestrictions: [],
    agriculturalImpact: 'Normal growing conditions',
    landValueImpact: 'No drought-related impact on land value',
    cropImpact: 'none',
  },
  D0: {
    riskLevel: 'low',
    description: 'Abnormally Dry - Short-term dryness slowing planting, growth of crops or pastures',
    waterRestrictions: [
      'Voluntary water conservation requested',
      'Public awareness campaigns active',
    ],
    agriculturalImpact: 'Some crop stress, reduced pasture growth',
    landValueImpact: 'Minimal impact, mostly monitoring phase',
    cropImpact: 'minimal',
  },
  D1: {
    riskLevel: 'moderate',
    description: 'Moderate Drought - Some damage to crops, pastures; streams, reservoirs low',
    waterRestrictions: [
      'Voluntary watering restrictions',
      'Outdoor watering limited to specific days/times',
      'Car washing restrictions may apply',
    ],
    agriculturalImpact: 'Crop yields reduced 10-25%, pasture stressed',
    landValueImpact: 'Agricultural land value may decline 5-10%',
    cropImpact: 'moderate',
  },
  D2: {
    riskLevel: 'high',
    description: 'Severe Drought - Crop or pasture losses likely; water shortages common',
    waterRestrictions: [
      'Mandatory water restrictions in effect',
      'Outdoor irrigation severely limited or banned',
      'Commercial car washes only',
      'Landscaping restrictions',
    ],
    agriculturalImpact: 'Crop losses 25-50%, livestock may require supplemental feed',
    landValueImpact: 'Agricultural land value decline 10-20%, resale difficulty',
    cropImpact: 'severe',
  },
  D3: {
    riskLevel: 'very_high',
    description: 'Extreme Drought - Major crop/pasture losses; widespread water shortages',
    waterRestrictions: [
      'Severe mandatory water restrictions',
      'Outdoor watering banned except hand-watering',
      'Agricultural water allocations reduced',
      'Emergency water conservation measures',
    ],
    agriculturalImpact: 'Crop failures common (50%+ losses), livestock sales/relocation',
    landValueImpact: 'Agricultural land value decline 20-40%, very difficult to sell',
    cropImpact: 'critical',
  },
  D4: {
    riskLevel: 'very_high',
    description: 'Exceptional Drought - Exceptional and widespread crop/pasture losses; water emergencies',
    waterRestrictions: [
      'Emergency water restrictions - critical shortage',
      'All outdoor watering banned',
      'Agricultural water severely rationed or unavailable',
      'Potential well failures',
      'Water hauling may be necessary',
    ],
    agriculturalImpact: 'Catastrophic crop failures, livestock emergency (mass sales/deaths)',
    landValueImpact: 'Agricultural land value decline 40-60%, market essentially frozen',
    cropImpact: 'critical',
  },
};

/**
 * Drought-prone states with historical drought risk and characteristics
 *
 * Based on U.S. Drought Monitor historical data and state climate patterns.
 */
export const DROUGHT_PRONE_STATES: Record<string, {
  riskLevel: 'high' | 'moderate' | 'low';
  seasonalPeak: string;
  avgAnnualPrecipitation: number; // inches
  waterSource: string;
  historicalDroughtFrequency: string;
  investmentConsiderations: string[];
  waterRights: string[];
}> = {
  CA: {
    riskLevel: 'high',
    seasonalPeak: 'Summer-Fall (June-November)',
    avgAnnualPrecipitation: 22,
    waterSource: 'Snowpack, reservoirs, groundwater (over-allocated)',
    historicalDroughtFrequency: 'Severe drought 40% of last 20 years',
    investmentConsiderations: [
      'Water rights critical for agricultural land value',
      'Groundwater restrictions increasing (SGMA regulations)',
      'Reservoir levels directly impact property values',
      'Fire risk compounds during drought',
    ],
    waterRights: [
      'Prior appropriation system - "first in time, first in right"',
      'Groundwater now regulated under SGMA',
      'Water rights must be verified and transferable',
      'Senior rights holders prioritized during shortage',
    ],
  },
  TX: {
    riskLevel: 'high',
    seasonalPeak: 'Summer (June-September)',
    avgAnnualPrecipitation: 28,
    waterSource: 'Aquifers (Ogallala, Edwards), surface water',
    historicalDroughtFrequency: 'Severe drought 30% of last 20 years',
    investmentConsiderations: [
      'West Texas extremely drought-prone',
      'Edwards Aquifer levels critical for Hill Country',
      'Ogallala depletion affecting Panhandle',
      'Agricultural land values highly variable',
    ],
    waterRights: [
      'Rule of capture for groundwater (landowner owns)',
      'Surface water requires permit from TCEQ',
      'Groundwater districts impose pumping limits',
      'Water rights add significant land value',
    ],
  },
  AZ: {
    riskLevel: 'high',
    seasonalPeak: 'Year-round (chronic)',
    avgAnnualPrecipitation: 13,
    waterSource: 'Colorado River, groundwater (declining)',
    historicalDroughtFrequency: 'In drought 85% of last 20 years',
    investmentConsiderations: [
      'Colorado River cuts affecting water allocations',
      'Groundwater depletion severe in some areas',
      'Agricultural land without water rights has minimal value',
      'Development restrictions due to water scarcity',
    ],
    waterRights: [
      'Prior appropriation for surface water',
      'Active Management Areas restrict groundwater',
      'Colorado River allocations being reduced',
      'Water rights separate from land deed',
    ],
  },
  NM: {
    riskLevel: 'high',
    seasonalPeak: 'Summer-Fall (May-October)',
    avgAnnualPrecipitation: 14,
    waterSource: 'Rio Grande, aquifers (limited)',
    historicalDroughtFrequency: 'Severe drought 45% of last 20 years',
    investmentConsiderations: [
      'Rio Grande flows often insufficient',
      'Ancient water rights highly valuable',
      'Land without water rights very difficult to develop',
      'Drought is baseline condition',
    ],
    waterRights: [
      'Complex prior appropriation system',
      'Acequia water rights (historic irrigation)',
      'Pueblo water rights (senior)',
      'Interstate compact governs Rio Grande',
    ],
  },
  NV: {
    riskLevel: 'high',
    seasonalPeak: 'Year-round (arid climate)',
    avgAnnualPrecipitation: 9,
    waterSource: 'Colorado River, limited groundwater',
    historicalDroughtFrequency: 'Chronic drought conditions',
    investmentConsiderations: [
      'Lake Mead levels critical',
      'Las Vegas area highly water-stressed',
      'Rural land difficult to develop without water',
      'Most arid state in US',
    ],
    waterRights: [
      'Prior appropriation system',
      'Colorado River allocations being cut',
      'Groundwater basins over-appropriated',
      'Water rights required for development',
    ],
  },
  CO: {
    riskLevel: 'high',
    seasonalPeak: 'Summer (June-September)',
    avgAnnualPrecipitation: 17,
    waterSource: 'Snowpack, rivers (over-allocated)',
    historicalDroughtFrequency: 'Severe drought 35% of last 20 years',
    investmentConsiderations: [
      'Snowpack trends declining',
      'Water rights extremely valuable and complex',
      'Agricultural land value tied to water',
      'Wildfire risk increases during drought',
    ],
    waterRights: [
      'Prior appropriation - highly competitive',
      'Water courts adjudicate rights',
      'Buy-and-dry concerns (ag to municipal)',
      'Interstate compacts limit availability',
    ],
  },
  UT: {
    riskLevel: 'high',
    seasonalPeak: 'Summer (June-September)',
    avgAnnualPrecipitation: 12,
    waterSource: 'Snowpack, Great Salt Lake basin',
    historicalDroughtFrequency: 'Severe drought 40% of last 20 years',
    investmentConsiderations: [
      'Great Salt Lake at historic lows',
      'Rapid population growth straining supply',
      'Agricultural water being converted to municipal',
      'Water-wise landscaping increasingly required',
    ],
    waterRights: [
      'Prior appropriation system',
      'Water rights separate from land',
      'Secondary water systems common',
      'Change of use requires state approval',
    ],
  },
  OK: {
    riskLevel: 'moderate',
    seasonalPeak: 'Summer (June-September)',
    avgAnnualPrecipitation: 36,
    waterSource: 'Aquifers, lakes, rivers',
    historicalDroughtFrequency: 'Severe drought 25% of last 20 years',
    investmentConsiderations: [
      'Western Oklahoma much drier than eastern',
      'Ogallala Aquifer depletion in Panhandle',
      'Drought cycles can be multi-year',
    ],
    waterRights: [
      'Riparian rights for surface water',
      'Groundwater permits required',
      'Prior appropriation in some areas',
    ],
  },
  KS: {
    riskLevel: 'moderate',
    seasonalPeak: 'Summer (June-September)',
    avgAnnualPrecipitation: 28,
    waterSource: 'Ogallala Aquifer, Arkansas River',
    historicalDroughtFrequency: 'Severe drought 25% of last 20 years',
    investmentConsiderations: [
      'Western Kansas Ogallala depletion critical',
      'Irrigation-dependent agriculture at risk',
      'Water rights add 20-30% to land value',
    ],
    waterRights: [
      'Prior appropriation system',
      'Groundwater management districts',
      'Water rights are real property',
    ],
  },
  NE: {
    riskLevel: 'moderate',
    seasonalPeak: 'Summer (July-September)',
    avgAnnualPrecipitation: 23,
    waterSource: 'Ogallala Aquifer (largest reserves)',
    historicalDroughtFrequency: 'Severe drought 20% of last 20 years',
    investmentConsiderations: [
      'Better water situation than most Plains states',
      'Ogallala still declining in some areas',
      'Irrigation critical for crop yields',
    ],
    waterRights: [
      'Correlative rights system',
      'Natural Resources Districts manage water',
      'Groundwater generally available',
    ],
  },
  MT: {
    riskLevel: 'moderate',
    seasonalPeak: 'Summer (July-September)',
    avgAnnualPrecipitation: 15,
    waterSource: 'Snowpack, rivers, limited groundwater',
    historicalDroughtFrequency: 'Severe drought 30% of last 20 years',
    investmentConsiderations: [
      'Eastern Montana very dry',
      'Snowpack-dependent water supply',
      'Ranching land affected by forage availability',
    ],
    waterRights: [
      'Prior appropriation system',
      'Water rights critical for agriculture',
      'Surface water heavily appropriated',
    ],
  },
  ID: {
    riskLevel: 'moderate',
    seasonalPeak: 'Summer (July-September)',
    avgAnnualPrecipitation: 19,
    waterSource: 'Snake River, aquifer, snowpack',
    historicalDroughtFrequency: 'Severe drought 25% of last 20 years',
    investmentConsiderations: [
      'Southern Idaho irrigation-dependent',
      'Water rights highly valuable',
      'Aquifer levels generally stable',
    ],
    waterRights: [
      'Prior appropriation system',
      'Water rights separate from land',
      'Surface and groundwater conjunctive management',
    ],
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Classifies drought risk level based on current category and historical data
 */
function classifyDroughtRisk(
  currentCategory: DroughtCategory,
  historicalData: {
    percentageInDrought: number | null;
    percentageInSevereDrought: number | null;
  } | null
): RiskLevel {
  const baseDef = DROUGHT_SEVERITY_DEFINITIONS[currentCategory];
  let baseRisk = baseDef.riskLevel;

  // Adjust risk level if historical data shows chronic drought
  if (historicalData) {
    const { percentageInDrought, percentageInSevereDrought } = historicalData;

    // If location is in drought >60% of the time, elevate risk
    if (percentageInDrought && percentageInDrought > 60) {
      if (baseRisk === 'minimal') baseRisk = 'low';
      else if (baseRisk === 'low') baseRisk = 'moderate';
      else if (baseRisk === 'moderate') baseRisk = 'high';
    }

    // If severe drought is common (>20% of time), elevate further
    if (percentageInSevereDrought && percentageInSevereDrought > 20) {
      if (baseRisk === 'low') baseRisk = 'moderate';
      else if (baseRisk === 'moderate') baseRisk = 'high';
      else if (baseRisk === 'high') baseRisk = 'very_high';
    }
  }

  return baseRisk;
}

/**
 * Determines water availability classification
 */
function classifyWaterAvailability(
  droughtCategory: DroughtCategory,
  percentileRanking: number | null,
  stateData: typeof DROUGHT_PRONE_STATES[string] | null
): WaterAvailability {
  // Base classification on drought category
  if (droughtCategory === 'D4') return 'critical';
  if (droughtCategory === 'D3') return 'scarce';
  if (droughtCategory === 'D2') return 'limited';
  if (droughtCategory === 'D1') return 'adequate';

  // For D0 and none, consider state baseline and percentile
  if (stateData?.riskLevel === 'high') {
    // High-risk states: even 'none' might only be 'adequate'
    if (droughtCategory === 'D0') return 'adequate';
    if (percentileRanking && percentileRanking > 50) return 'abundant';
    return 'adequate';
  }

  // Low-risk states
  if (droughtCategory === 'D0') return 'adequate';
  return 'abundant';
}

/**
 * Generates drought mitigation recommendations
 */
function generateDroughtMitigations(
  droughtCategory: DroughtCategory,
  waterAvailability: WaterAvailability,
  stateCode: string | null
): string[] {
  const mitigations: string[] = [];
  const stateData = stateCode ? DROUGHT_PRONE_STATES[stateCode.toUpperCase()] : null;

  // Universal recommendations for any drought
  if (droughtCategory !== 'none') {
    mitigations.push(
      'Install water-efficient irrigation systems (drip, not spray)',
      'Implement xeriscaping with drought-tolerant native plants',
      'Add mulch to retain soil moisture and reduce evaporation'
    );
  }

  // Moderate drought (D1) and above
  if (droughtCategory === 'D1' || droughtCategory === 'D2') {
    mitigations.push(
      'Install rainwater harvesting system (cisterns, rain barrels)',
      'Reduce turf grass areas, replace with native groundcovers',
      'Upgrade to high-efficiency fixtures (toilets, faucets, showerheads)'
    );
    if (stateData) {
      mitigations.push(
        'Verify property water rights are senior and transferable',
        'Consider supplemental water storage capacity'
      );
    }
  }

  // Severe drought (D2) and above
  if (droughtCategory === 'D2' || droughtCategory === 'D3' || droughtCategory === 'D4') {
    mitigations.push(
      'Drill deeper well or add backup water source',
      'Install graywater recycling system for landscaping',
      'Consider desalination or water treatment if near brackish sources'
    );
    if (stateData) {
      mitigations.push(
        'Obtain comprehensive water rights analysis before purchase',
        'Verify well production capacity and aquifer sustainability',
        'Check for water hauling requirements during peak drought'
      );
    }
  }

  // Extreme/Exceptional drought (D3, D4)
  if (droughtCategory === 'D3' || droughtCategory === 'D4') {
    mitigations.push(
      'WARNING: Agricultural viability questionable - avoid farming/ranching',
      'Consider water banking or leasing arrangements',
      'May require water hauling infrastructure (storage tanks, access roads)',
      'Property may be unsellable until drought conditions improve'
    );
  }

  // State-specific recommendations
  if (stateData) {
    stateData.waterRights.forEach(right => {
      mitigations.push(`Water Rights: ${right}`);
    });
  }

  // Water availability specific
  if (waterAvailability === 'critical' || waterAvailability === 'scarce') {
    mitigations.push(
      'CRITICAL: Property may not have reliable water supply',
      'Required: Professional water resource assessment before purchase',
      'Consider: This property may be uninvestable during drought'
    );
  }

  return mitigations;
}

/**
 * Generates conservation strategies
 */
function generateConservationStrategies(
  droughtCategory: DroughtCategory,
  waterRestrictions: string[]
): string[] {
  const strategies: string[] = [];

  if (droughtCategory === 'none') {
    strategies.push(
      'Maintain water-wise landscaping as preventative measure',
      'Monitor local drought conditions regularly'
    );
    return strategies;
  }

  // Always recommend these for any drought
  strategies.push(
    'Reduce outdoor watering to comply with local restrictions',
    'Fix all leaks promptly (indoor and outdoor)',
    'Use pool covers to reduce evaporation'
  );

  // Add restriction-specific strategies
  if (waterRestrictions.length > 0) {
    strategies.push(
      'Comply strictly with mandatory water restrictions',
      'Track water usage to ensure within allocation limits'
    );
  }

  // Moderate+ drought
  if (droughtCategory !== 'D0') {
    strategies.push(
      'Prioritize water use for health/safety only',
      'Eliminate non-essential outdoor water use',
      'Consider temporary landscape dormancy'
    );
  }

  // Severe+ drought
  if (droughtCategory === 'D2' || droughtCategory === 'D3' || droughtCategory === 'D4') {
    strategies.push(
      'Prepare for potential well failure or supply interruption',
      'Arrange backup water supply plan (hauling, storage)',
      'Monitor well levels and aquifer conditions closely'
    );
  }

  return strategies;
}

/**
 * Calculate drought risk score for 125-point system
 * Scoring breakdown:
 * - Current drought category: 0-50 points
 * - Historical drought frequency: 0-30 points
 * - Water availability: 0-25 points
 * - State baseline risk: 0-20 points
 * Total: 0-125 points (higher = worse drought risk)
 */
function calculateDroughtRiskScore(analysis: DroughtRiskAnalysis): number {
  let score = 0;

  // 1. Current drought category (0-50 points)
  const categoryScores: Record<DroughtCategory, number> = {
    'none': 0,
    'D0': 10,
    'D1': 20,
    'D2': 35,
    'D3': 45,
    'D4': 50,
  };
  score += categoryScores[analysis.droughtCategory];

  // 2. Historical drought frequency (0-30 points)
  if (analysis.historicalDrought) {
    const { percentageInDrought, worstCategory } = analysis.historicalDrought;

    if (percentageInDrought) {
      // Percentage in any drought: 0-15 points
      score += Math.min(15, (percentageInDrought / 100) * 15);
    }

    // Add points if worst historical drought was severe (D2+)
    if (worstCategory && (worstCategory === 'D2' || worstCategory === 'D3' || worstCategory === 'D4')) {
      score += 15;
    } else if (worstCategory && worstCategory === 'D1') {
      score += 8;
    } else if (worstCategory && worstCategory === 'D0') {
      score += 3;
    }
  }

  // 3. Water availability (0-25 points)
  const waterScores: Record<WaterAvailability, number> = {
    'abundant': 0,
    'adequate': 5,
    'limited': 12,
    'scarce': 20,
    'critical': 25,
  };
  score += waterScores[analysis.waterAvailability];

  // 4. State baseline risk (0-20 points) - extracted from seasonalPeak
  if (analysis.seasonalPeak) {
    // States with chronic drought get higher baseline
    if (analysis.seasonalPeak.includes('Year-round') || analysis.seasonalPeak.includes('chronic')) {
      score += 20;
    } else if (analysis.seasonalPeak.includes('Summer-Fall')) {
      score += 15;
    } else if (analysis.seasonalPeak.includes('Summer')) {
      score += 10;
    } else {
      score += 5;
    }
  }

  // 5. Precipitation deficit bonus (0-10 points)
  if (analysis.precipitationDeficit) {
    // 50% deficit = 10 points
    score += Math.min(10, (Math.abs(analysis.precipitationDeficit) / 50) * 10);
  }

  return Math.min(125, Math.round(score));
}

// ============================================
// Main Drought Risk Analysis Function
// ============================================

/**
 * Analyze drought risk for a property location
 *
 * @param coordinates - Property coordinates { lat, lng }
 * @param stateCode - Two-letter state code (e.g., 'CA', 'TX')
 * @returns Promise resolving to comprehensive drought risk analysis
 */
export async function analyzeDroughtRisk(
  coordinates: { lat: number; lng: number },
  stateCode: string
): Promise<DroughtRiskAnalysis> {
  const droughtService = getDroughtMonitorService();
  const upperState = stateCode.toUpperCase();
  const stateData = DROUGHT_PRONE_STATES[upperState];

  try {
    // Fetch comprehensive drought data
    const droughtData: DroughtData = await droughtService.getDroughtData(
      coordinates.lat,
      coordinates.lng
    );

    const { current, historical, percentiles, waterRestrictions, dataQuality } = droughtData;

    // Classify risk and water availability
    const riskLevel = classifyDroughtRisk(current.category, historical ? {
      percentageInDrought: historical.percentageInDrought,
      percentageInSevereDrought: historical.percentageInSevereDrought,
    } : null);

    const primaryPercentile = percentiles[0]?.percentile || null;
    const waterAvailability = classifyWaterAvailability(
      current.category,
      primaryPercentile,
      stateData
    );

    const cropImpact = DROUGHT_SEVERITY_DEFINITIONS[current.category].cropImpact;

    // Generate recommendations
    const mitigationRecommendations = generateDroughtMitigations(
      current.category,
      waterAvailability,
      upperState
    );

    const conservationStrategies = generateConservationStrategies(
      current.category,
      waterRestrictions
    );

    // Build analysis result
    const analysis: DroughtRiskAnalysis = {
      riskLevel,
      droughtCategory: current.category,
      droughtDescription: current.description,
      percentileRanking: primaryPercentile,

      // Historical data
      historicalDrought: historical ? {
        count: historical.droughtEventCount,
        percentageInDrought: historical.percentageInDrought,
        worstCategory: historical.worstCategory,
        worstDroughtDate: historical.worstDroughtDate ? new Date(historical.worstDroughtDate) : null,
      } : null,

      // Water and land impact
      waterAvailability,
      waterRestrictions,
      cropImpact,
      landImpactDescription: DROUGHT_SEVERITY_DEFINITIONS[current.category].landValueImpact,

      // Climate context
      avgAnnualPrecipitation: stateData?.avgAnnualPrecipitation || null,
      precipitationDeficit: primaryPercentile ? (50 - primaryPercentile) : null,
      seasonalPeak: stateData?.seasonalPeak || null,

      // Recommendations
      mitigationRecommendations,
      conservationStrategies,

      // Metadata
      dataSource: {
        name: dataQuality.dataSource,
        type: 'api',
        url: 'https://droughtmonitor.unl.edu',
        lastUpdated: new Date(dataQuality.lastUpdated),
        reliability: dataQuality.confidence > 70 ? 'high' : 'medium',
      },
      confidence: dataQuality.confidence,
    };

    return analysis;
  } catch (error) {
    // Fallback to default drought analysis if service fails
    return createDefaultDroughtRisk(coordinates, upperState, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Create a default drought risk analysis when API data is unavailable
 */
export function createDefaultDroughtRisk(
  coordinates: { lat: number; lng: number },
  stateCode: string,
  errorMessage?: string
): DroughtRiskAnalysis {
  const upperState = stateCode.toUpperCase();
  const stateData = DROUGHT_PRONE_STATES[upperState];

  // Default to D0 (abnormally dry) for high-risk states, none otherwise
  const defaultCategory: DroughtCategory = stateData?.riskLevel === 'high' ? 'D0' : 'none';
  const defaultDef = DROUGHT_SEVERITY_DEFINITIONS[defaultCategory];

  const waterAvailability: WaterAvailability = stateData?.riskLevel === 'high' ? 'adequate' : 'abundant';

  return {
    riskLevel: defaultDef.riskLevel,
    droughtCategory: defaultCategory,
    droughtDescription: defaultDef.description + ' (Estimated - API data unavailable)',
    percentileRanking: null,

    historicalDrought: null,

    waterAvailability,
    waterRestrictions: stateData ? defaultDef.waterRestrictions : [],
    cropImpact: defaultDef.cropImpact,
    landImpactDescription: defaultDef.landValueImpact,

    avgAnnualPrecipitation: stateData?.avgAnnualPrecipitation || null,
    precipitationDeficit: null,
    seasonalPeak: stateData?.seasonalPeak || null,

    mitigationRecommendations: generateDroughtMitigations(defaultCategory, waterAvailability, upperState),
    conservationStrategies: generateConservationStrategies(defaultCategory, []),

    dataSource: {
      name: 'Estimated (State baseline)',
      type: 'estimated',
      lastUpdated: new Date(),
      reliability: 'low',
    },
    confidence: 30,
  };
}

/**
 * Get drought risk score for combined risk assessment (0-5 scale)
 *
 * Converts 125-point internal score to 0-5 scale for combined risk system
 */
export function getDroughtRiskScore(analysis: DroughtRiskAnalysis | null): number {
  if (!analysis) {
    return 0;
  }

  const fullScore = calculateDroughtRiskScore(analysis);

  // Convert 125-point scale to 0-5 scale
  // 0-25 = 0.5, 26-50 = 1.5, 51-75 = 2.5, 76-100 = 3.5, 101-125 = 4.5
  if (fullScore <= 25) return 0.5;
  if (fullScore <= 50) return 1.5;
  if (fullScore <= 75) return 2.5;
  if (fullScore <= 100) return 3.5;
  return 4.5;
}
