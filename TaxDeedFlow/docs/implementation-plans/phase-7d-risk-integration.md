# Phase 7D: Risk Integration & Combined Assessment

## Overview

This document specifies the combined risk assessment system that orchestrates all individual risk analyzers (flood, earthquake, wildfire, hurricane, sinkhole, environmental, radon, slope), applies location-adaptive weights, calculates an overall risk score, and integrates with the 125-point scoring system from Phase 6.

The risk integration layer is responsible for:
1. Orchestrating parallel execution of all risk analyzers
2. Applying location-adaptive weights based on geography
3. Calculating a unified overall risk score (0-100)
4. Aggregating mitigation actions and recommendations
5. Generating warnings for high-risk conditions
6. Converting risk scores to the 25-point Risk Category in the 125-point system

---

## TypeScript Interfaces

### Combined Risk Assessment Types

```typescript
// src/types/risk-integration.ts

import type {
  FloodRiskAnalysis,
  EarthquakeRiskAnalysis,
  WildfireRiskAnalysis,
  HurricaneRiskAnalysis,
  SinkholeRiskAnalysis,
  EnvironmentalRiskAnalysis,
  RadonRiskAnalysis,
  SlopeRiskAnalysis,
  RiskMitigation,
  InsuranceEstimates,
} from './risk';

/**
 * Risk weights for each risk type (must sum to 1.0)
 */
export interface RiskWeights {
  flood: number;
  earthquake: number;
  wildfire: number;
  hurricane: number;
  sinkhole: number;
  environmental: number;
  radon: number;
  slope: number;
}

/**
 * Input parameters for risk analysis
 */
export interface RiskInput {
  latitude: number;
  longitude: number;
  state: string;
  propertyValue: number;
  yearBuilt: number;
  sqft: number;
  lotSizeAcres?: number;
  distanceToCoast?: number;
}

/**
 * Complete risk assessment result
 */
export interface RiskAssessment {
  // Overall summary
  overallRisk: 'low' | 'moderate' | 'high' | 'severe';
  riskScore: number; // 0-100 (lower is better)
  confidenceLevel: number; // 0-100

  // Individual risk analyses
  flood: FloodRiskAnalysis;
  earthquake: EarthquakeRiskAnalysis;
  wildfire: WildfireRiskAnalysis;
  hurricane: HurricaneRiskAnalysis;
  sinkhole: SinkholeRiskAnalysis;
  environmental: EnvironmentalRiskAnalysis;
  radon: RadonRiskAnalysis;
  slope: SlopeRiskAnalysis;

  // Weights and transparency
  weightsUsed: RiskWeights;
  weightExplanations: string[];

  // Insurance and mitigation
  insuranceEstimates: InsuranceEstimates;
  recommendations: string[];
  mitigationActions: RiskMitigation[];
  warnings: string[];
}

/**
 * Risk category aggregation for scoring system integration
 */
export interface RiskCategoryScore {
  category: 'risk';
  totalPoints: number; // 0-25 for 125-point system
  maxPoints: 25;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  confidence: number;

  // Component breakdown (5 points each)
  components: {
    floodRisk: ComponentScore;
    naturalDisaster: ComponentScore; // Combined earthquake, wildfire, hurricane
    environmentalRisk: ComponentScore;
    sinkholeRadon: ComponentScore; // Combined sinkhole and radon
    terrain: ComponentScore;
  };

  dataCompleteness: number;
  missingData: string[];
  explanations: ComponentExplanation[];
}

interface ComponentScore {
  name: string;
  score: number;
  maxScore: number;
  rawValue?: number | string;
  dataSource: string;
  confidence: number;
}

interface ComponentExplanation {
  component: string;
  score: number;
  reason: string;
  dataUsed: string;
}
```

---

## RISK_REGIONS Configuration

```typescript
// src/lib/analysis/risk/riskRegions.ts

/**
 * High-risk states/regions for each risk type
 * Used by calculateAdaptiveWeights() to adjust risk weights by location
 */
export const RISK_REGIONS = {
  /**
   * Earthquake risk regions
   * Based on USGS seismic hazard maps and historical activity
   */
  earthquake: {
    // States with high seismic activity
    high: ['CA', 'AK', 'WA', 'OR', 'NV', 'UT', 'HI'],
    // States with moderate seismic zones (e.g., New Madrid)
    moderate: ['MT', 'ID', 'WY', 'MO', 'AR', 'TN', 'SC'],
    // States with minimal seismic risk
    low: ['FL', 'TX', 'MI', 'WI', 'MN', 'IA', 'KS', 'NE', 'ND', 'SD'],
  },

  /**
   * Hurricane risk regions
   * Based on NOAA historical hurricane tracks and landfall data
   */
  hurricane: {
    // Gulf Coast states with high hurricane frequency
    coastal_high: ['FL', 'TX', 'LA', 'MS', 'AL'],
    // Atlantic coastal states with moderate hurricane risk
    coastal_moderate: ['NC', 'SC', 'GA', 'VA', 'MD', 'NJ', 'NY', 'MA', 'CT', 'RI'],
    // All other states (non-coastal or interior)
    non_coastal: [], // Dynamically determined
  },

  /**
   * Wildfire risk regions
   * Based on USFS wildfire risk data and historical fire activity
   */
  wildfire: {
    // Extreme wildfire risk (annual major fires)
    extreme: ['CA'],
    // Very high risk (frequent fires, WUI zones)
    very_high: ['OR', 'WA', 'CO', 'AZ', 'NM', 'MT', 'ID'],
    // High risk (significant fire history)
    high: ['NV', 'UT', 'WY', 'TX', 'OK'],
    // Moderate risk (occasional fires)
    moderate: ['FL', 'GA', 'SC', 'NC'],
  },

  /**
   * Sinkhole risk regions
   * Based on karst geology and historical sinkhole data
   */
  sinkhole: {
    // Very high risk (active karst terrain)
    very_high: ['FL'], // Especially central FL
    // High risk (significant karst formations)
    high: ['TX', 'TN', 'AL', 'KY', 'MO'],
    // Moderate risk (some karst areas)
    moderate: ['PA', 'MD', 'VA', 'WV', 'IN', 'OH', 'GA'],
  },

  /**
   * Radon risk zones
   * Based on EPA radon zone map
   */
  radon: {
    // EPA Zone 1 (highest predicted radon levels)
    zone1_high: ['PA', 'OH', 'IN', 'IL', 'IA', 'NE', 'KS', 'CO', 'ND', 'SD', 'MN', 'WI'],
    // EPA Zone 2 (moderate predicted radon levels)
    zone2_moderate: ['NY', 'NJ', 'MA', 'CT', 'RI', 'ME', 'VT', 'NH', 'MI', 'MO', 'KY', 'TN', 'NC', 'VA', 'WV', 'MD'],
    // EPA Zone 3 (lowest predicted radon levels)
    zone3_low: ['FL', 'TX', 'LA', 'MS', 'AL', 'GA', 'SC', 'CA', 'OR', 'WA', 'AZ', 'NV', 'NM'],
  },

  /**
   * Central Florida sinkhole hotspot coordinates
   * Used for enhanced sinkhole weight adjustment
   */
  floridaSinkholeHotspot: {
    latMin: 27.5,
    latMax: 29.5,
    lngMin: -82.5,
    lngMax: -80.5,
  },
} as const;

export type RiskRegionType = keyof typeof RISK_REGIONS;
```

---

## calculateAdaptiveWeights Function

```typescript
// src/lib/analysis/risk/adaptiveWeights.ts

import { RISK_REGIONS } from './riskRegions';
import type { RiskWeights } from '@/types/risk-integration';

/**
 * Calculate location-adaptive risk weights
 *
 * Adjusts base weights based on geographic location to ensure
 * relevant risks are weighted appropriately. For example:
 * - California: Higher earthquake and wildfire weights
 * - Florida: Higher hurricane and sinkhole weights
 * - Pennsylvania: Higher radon weights
 *
 * @param state - Two-letter state code
 * @param latitude - Property latitude
 * @param longitude - Property longitude
 * @param distanceToCoast - Optional distance to coast in miles
 * @returns Normalized risk weights that sum to 1.0
 */
export function calculateAdaptiveWeights(
  state: string,
  latitude: number,
  longitude: number,
  distanceToCoast?: number
): RiskWeights {
  const stateUpper = state.toUpperCase();

  // Start with base weights (total = 0.85, leaves room for adjustments)
  const weights: RiskWeights = {
    flood: 0.20,
    earthquake: 0.12,
    wildfire: 0.12,
    hurricane: 0.12,
    sinkhole: 0.08,
    environmental: 0.10,
    radon: 0.06,
    slope: 0.05,
  };

  // --- EARTHQUAKE ADJUSTMENTS ---
  if (RISK_REGIONS.earthquake.high.includes(stateUpper)) {
    weights.earthquake = 0.25;
    weights.hurricane -= 0.05; // Reduce hurricane weight in western states
  } else if (RISK_REGIONS.earthquake.low.includes(stateUpper)) {
    weights.earthquake = 0.05;
  }

  // --- HURRICANE ADJUSTMENTS ---
  if (RISK_REGIONS.hurricane.coastal_high.includes(stateUpper)) {
    const coastDist = distanceToCoast ?? 100;
    if (coastDist < 25) {
      // Very close to coast - highest hurricane risk
      weights.hurricane = 0.30;
      weights.flood += 0.05; // Storm surge flood risk
    } else if (coastDist < 75) {
      weights.hurricane = 0.20;
    } else {
      weights.hurricane = 0.10;
    }
  } else if (!RISK_REGIONS.hurricane.coastal_moderate.includes(stateUpper)) {
    // Non-coastal state - minimal hurricane weight
    weights.hurricane = 0.02;
    // Redistribute to other relevant risks
    weights.wildfire += 0.05;
    weights.earthquake += 0.05;
  }

  // --- WILDFIRE ADJUSTMENTS ---
  if (RISK_REGIONS.wildfire.extreme.includes(stateUpper)) {
    weights.wildfire = 0.28;
  } else if (RISK_REGIONS.wildfire.very_high.includes(stateUpper)) {
    weights.wildfire = 0.22;
  } else if (
    !RISK_REGIONS.wildfire.high.includes(stateUpper) &&
    !RISK_REGIONS.wildfire.moderate.includes(stateUpper)
  ) {
    weights.wildfire = 0.05;
  }

  // --- SINKHOLE ADJUSTMENTS ---
  if (RISK_REGIONS.sinkhole.very_high.includes(stateUpper)) {
    weights.sinkhole = 0.20;

    // Check if in Central Florida sinkhole hotspot
    const hotspot = RISK_REGIONS.floridaSinkholeHotspot;
    if (
      latitude > hotspot.latMin &&
      latitude < hotspot.latMax &&
      longitude > hotspot.lngMin &&
      longitude < hotspot.lngMax
    ) {
      weights.sinkhole = 0.25;
    }
  } else if (RISK_REGIONS.sinkhole.high.includes(stateUpper)) {
    weights.sinkhole = 0.15;
  } else if (!RISK_REGIONS.sinkhole.moderate.includes(stateUpper)) {
    weights.sinkhole = 0.03;
  }

  // --- RADON ADJUSTMENTS ---
  if (RISK_REGIONS.radon.zone1_high.includes(stateUpper)) {
    weights.radon = 0.10;
  } else if (RISK_REGIONS.radon.zone3_low.includes(stateUpper)) {
    weights.radon = 0.02;
  }

  // --- NORMALIZE WEIGHTS TO SUM TO 1.0 ---
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(weights) as (keyof RiskWeights)[]) {
    weights[key] = weights[key] / total;
  }

  return weights;
}

/**
 * Get human-readable explanations for weight adjustments
 * Used for transparency in the UI
 */
export function explainWeightAdjustments(
  state: string,
  weights: RiskWeights
): string[] {
  const explanations: string[] = [];
  const stateUpper = state.toUpperCase();

  if (weights.earthquake > 0.20) {
    explanations.push(
      `Earthquake risk weighted higher (${(weights.earthquake * 100).toFixed(0)}%) due to ${stateUpper}'s seismic activity`
    );
  }

  if (weights.hurricane > 0.20) {
    explanations.push(
      `Hurricane risk weighted higher (${(weights.hurricane * 100).toFixed(0)}%) due to coastal location in ${stateUpper}`
    );
  }

  if (weights.wildfire > 0.20) {
    explanations.push(
      `Wildfire risk weighted higher (${(weights.wildfire * 100).toFixed(0)}%) due to ${stateUpper}'s fire history`
    );
  }

  if (weights.sinkhole > 0.12) {
    explanations.push(
      `Sinkhole risk weighted higher (${(weights.sinkhole * 100).toFixed(0)}%) due to karst geology in ${stateUpper}`
    );
  }

  if (weights.radon > 0.08) {
    explanations.push(
      `Radon risk weighted higher (${(weights.radon * 100).toFixed(0)}%) - ${stateUpper} is in EPA Zone 1`
    );
  }

  if (explanations.length === 0) {
    explanations.push('Standard risk weights applied for this location');
  }

  return explanations;
}
```

---

## calculateOverallRiskScore Function

```typescript
// src/lib/analysis/risk/calculateOverallRiskScore.ts

import type {
  RiskWeights,
  FloodRiskAnalysis,
  EarthquakeRiskAnalysis,
  WildfireRiskAnalysis,
  HurricaneRiskAnalysis,
  SinkholeRiskAnalysis,
  EnvironmentalRiskAnalysis,
  RadonRiskAnalysis,
  SlopeRiskAnalysis,
} from '@/types/risk';

/**
 * Risk level to numeric score mapping
 * Higher score = higher risk (0-100 scale)
 */
const RISK_LEVEL_SCORES: Record<string, number> = {
  negligible: 5,
  minimal: 10,
  low: 20,
  moderate: 50,
  high: 75,
  very_high: 90,
  extreme: 100,
  severe: 100,
};

/**
 * Calculate the overall weighted risk score from all risk analyses
 *
 * @param flood - Flood risk analysis result
 * @param earthquake - Earthquake risk analysis result
 * @param wildfire - Wildfire risk analysis result
 * @param hurricane - Hurricane risk analysis result
 * @param sinkhole - Sinkhole risk analysis result
 * @param environmental - Environmental risk analysis result
 * @param radon - Radon risk analysis result
 * @param slope - Slope/terrain risk analysis result
 * @param weights - Location-adaptive risk weights
 * @returns Weighted overall risk score (0-100)
 */
export function calculateOverallRiskScore(
  flood: FloodRiskAnalysis,
  earthquake: EarthquakeRiskAnalysis,
  wildfire: WildfireRiskAnalysis,
  hurricane: HurricaneRiskAnalysis,
  sinkhole: SinkholeRiskAnalysis,
  environmental: EnvironmentalRiskAnalysis,
  radon: RadonRiskAnalysis,
  slope: SlopeRiskAnalysis,
  weights: RiskWeights
): number {
  // Convert each risk level to numeric score
  const floodScore = RISK_LEVEL_SCORES[flood.riskLevel] || 50;
  const earthquakeScore = RISK_LEVEL_SCORES[earthquake.riskLevel] || 20;
  const wildfireScore = RISK_LEVEL_SCORES[wildfire.riskLevel] || 20;
  const hurricaneScore = RISK_LEVEL_SCORES[hurricane.riskLevel] || 20;
  const sinkholeScore = RISK_LEVEL_SCORES[sinkhole.riskLevel] || 10;
  const environmentalScore = RISK_LEVEL_SCORES[environmental.overallRisk] || 20;
  const radonScore = RISK_LEVEL_SCORES[radon.predictedLevelCategory] || 20;

  // Slope risk is derived from landslide risk level
  const slopeScore =
    slope.landslideRisk === 'high' ? 75 :
    slope.landslideRisk === 'moderate' ? 50 : 20;

  // Apply adaptive weights and calculate weighted average
  const weightedScore =
    floodScore * weights.flood +
    earthquakeScore * weights.earthquake +
    wildfireScore * weights.wildfire +
    hurricaneScore * weights.hurricane +
    sinkholeScore * weights.sinkhole +
    environmentalScore * weights.environmental +
    radonScore * weights.radon +
    slopeScore * weights.slope;

  return Math.round(weightedScore);
}

/**
 * Convert overall risk score to risk level category
 */
export function getOverallRiskLevel(
  score: number
): 'low' | 'moderate' | 'high' | 'severe' {
  if (score >= 75) return 'severe';
  if (score >= 50) return 'high';
  if (score >= 30) return 'moderate';
  return 'low';
}

/**
 * Get risk level color for UI display
 */
export function getRiskLevelColor(level: string): string {
  const colors: Record<string, string> = {
    low: '#22c55e',       // green-500
    minimal: '#22c55e',   // green-500
    moderate: '#eab308',  // yellow-500
    high: '#f97316',      // orange-500
    very_high: '#ef4444', // red-500
    severe: '#dc2626',    // red-600
    extreme: '#991b1b',   // red-800
  };
  return colors[level] || '#6b7280'; // gray-500 default
}

/**
 * Get risk level badge variant for shadcn/ui Badge component
 */
export function getRiskLevelVariant(
  level: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (['severe', 'extreme', 'very_high'].includes(level)) {
    return 'destructive';
  }
  if (level === 'high') {
    return 'default';
  }
  return 'secondary';
}
```

---

## Main analyzePropertyRisk Orchestration

```typescript
// src/lib/analysis/risk/index.ts

import { analyzeFloodRisk } from './floodRisk';
import { analyzeEarthquakeRisk } from './earthquakeRisk';
import { analyzeWildfireRisk } from './wildfireRisk';
import { analyzeHurricaneRisk } from './hurricaneRisk';
import { analyzeSinkholeRisk } from './sinkholeRisk';
import { analyzeEnvironmentalRisk } from './environmentalRisk';
import { analyzeRadonRisk } from './radonRisk';
import { analyzeSlopeRisk } from './slopeAnalysis';
import { calculateAdaptiveWeights, explainWeightAdjustments } from './adaptiveWeights';
import { calculateOverallRiskScore, getOverallRiskLevel } from './calculateOverallRiskScore';
import { estimateInsurance } from './insuranceEstimator';
import type { RiskAssessment, RiskInput, RiskMitigation } from '@/types/risk-integration';

/**
 * Main orchestration function for comprehensive property risk analysis
 *
 * Executes all risk analyzers in parallel, applies location-adaptive weights,
 * calculates overall risk score, and aggregates recommendations and warnings.
 *
 * @param input - Property details including location, value, and characteristics
 * @returns Complete risk assessment with all individual analyses
 */
export async function analyzePropertyRisk(
  input: RiskInput
): Promise<RiskAssessment> {
  const {
    latitude,
    longitude,
    state,
    propertyValue,
    yearBuilt,
    sqft,
    lotSizeAcres,
    distanceToCoast,
  } = input;

  // Step 1: Calculate location-adaptive weights
  const weightsUsed = calculateAdaptiveWeights(
    state,
    latitude,
    longitude,
    distanceToCoast
  );
  const weightExplanations = explainWeightAdjustments(state, weightsUsed);

  // Step 2: Run all risk analyses in parallel for performance
  const [
    flood,
    earthquake,
    wildfire,
    hurricane,
    sinkhole,
    environmental,
    radon,
    slope,
  ] = await Promise.all([
    analyzeFloodRisk(latitude, longitude, propertyValue),
    analyzeEarthquakeRisk(latitude, longitude, state),
    analyzeWildfireRisk(latitude, longitude, state),
    analyzeHurricaneRisk(latitude, longitude, state, distanceToCoast),
    analyzeSinkholeRisk(latitude, longitude, state),
    analyzeEnvironmentalRisk(latitude, longitude, state),
    analyzeRadonRisk(latitude, longitude, state),
    analyzeSlopeRisk(latitude, longitude, lotSizeAcres),
  ]);

  // Step 3: Calculate insurance estimates
  const insuranceEstimates = estimateInsurance({
    propertyValue,
    yearBuilt,
    sqft,
    flood,
    earthquake,
    wildfire,
    hurricane,
    sinkhole,
  });

  // Step 4: Calculate overall risk score using adaptive weights
  const riskScore = calculateOverallRiskScore(
    flood,
    earthquake,
    wildfire,
    hurricane,
    sinkhole,
    environmental,
    radon,
    slope,
    weightsUsed
  );

  // Step 5: Determine overall risk level
  const overallRisk = getOverallRiskLevel(riskScore);

  // Step 6: Collect and sort all mitigation actions by priority
  const mitigationActions = collectMitigationActions(
    flood,
    earthquake,
    wildfire,
    hurricane,
    sinkhole,
    environmental,
    radon,
    slope
  );

  // Step 7: Collect all recommendations
  const recommendations = collectRecommendations(
    flood,
    earthquake,
    wildfire,
    hurricane,
    sinkhole,
    environmental,
    radon,
    slope
  );

  // Step 8: Generate warnings for high-risk conditions
  const warnings = collectWarnings(
    flood,
    earthquake,
    wildfire,
    hurricane,
    sinkhole,
    environmental,
    radon,
    slope
  );

  // Step 9: Calculate confidence level based on data availability
  const confidenceLevel = calculateConfidenceLevel(
    flood,
    earthquake,
    wildfire,
    hurricane,
    sinkhole,
    environmental,
    radon,
    slope
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
    weightsUsed,
    weightExplanations,
    insuranceEstimates,
    recommendations,
    mitigationActions,
    warnings,
  };
}

/**
 * Collect all mitigation actions from individual risk analyses
 * Sorted by priority: critical > recommended > optional
 */
function collectMitigationActions(...analyses: any[]): RiskMitigation[] {
  const actions: RiskMitigation[] = [];

  for (const analysis of analyses) {
    if (analysis.mitigationOptions) {
      actions.push(...analysis.mitigationOptions);
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, recommended: 1, optional: 2 };
  actions.sort((a, b) =>
    (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
  );

  return actions;
}

/**
 * Collect all recommendations from individual risk analyses
 * De-duplicates recommendations
 */
function collectRecommendations(...analyses: any[]): string[] {
  const recommendations: string[] = [];

  for (const analysis of analyses) {
    if (analysis.recommendations) {
      recommendations.push(...analysis.recommendations);
    }
  }

  return [...new Set(recommendations)];
}

/**
 * Generate warnings for high-risk conditions
 * Alerts users to significant risk factors
 */
function collectWarnings(...analyses: any[]): string[] {
  const warnings: string[] = [];

  for (const analysis of analyses) {
    const riskLevel =
      analysis.riskLevel ||
      analysis.overallRisk ||
      analysis.predictedLevelCategory;

    if (['high', 'very_high', 'extreme', 'severe'].includes(riskLevel)) {
      const riskType = getRiskTypeName(analysis);
      warnings.push(
        `HIGH ${riskType.toUpperCase()} RISK: Significant concern for this property`
      );
    }
  }

  return warnings;
}

/**
 * Identify risk type from analysis object structure
 */
function getRiskTypeName(analysis: any): string {
  if (analysis.zone !== undefined) return 'flood';
  if (analysis.seismicZone !== undefined) return 'earthquake';
  if (analysis.fireHistoryCount !== undefined) return 'wildfire';
  if (analysis.windZone !== undefined) return 'hurricane';
  if (analysis.karstTerrain !== undefined) return 'sinkhole';
  if (analysis.nearbySuperfundSites !== undefined) return 'environmental';
  if (analysis.epaZone !== undefined) return 'radon';
  if (analysis.averageSlope !== undefined) return 'slope/terrain';
  return 'unknown';
}

/**
 * Calculate overall confidence level based on data availability
 */
function calculateConfidenceLevel(...analyses: any[]): number {
  let totalConfidence = 0;
  let count = 0;

  for (const analysis of analyses) {
    if (analysis.confidence !== undefined) {
      totalConfidence += analysis.confidence;
      count++;
    } else {
      // Default confidence if not specified
      totalConfidence += 80;
      count++;
    }
  }

  return count > 0 ? Math.round(totalConfidence / count) : 75;
}
```

---

## Integration with 125-Point Scoring System

```typescript
// src/lib/analysis/scoring/riskScoring.ts

import type {
  RiskAssessment,
  RiskCategoryScore,
  ComponentScore,
  ComponentExplanation,
} from '@/types/risk-integration';

/**
 * Maximum points for the Risk category in 125-point system
 */
const MAX_RISK_POINTS = 25;

/**
 * Component weights within the 25-point Risk category
 * Each component is worth 5 points maximum
 */
const RISK_COMPONENTS = {
  floodRisk: 5,
  naturalDisaster: 5, // Combined earthquake, wildfire, hurricane
  environmentalRisk: 5,
  sinkholeRadon: 5, // Combined sinkhole and radon
  terrain: 5,
};

/**
 * Convert overall risk score (0-100, higher = worse) to
 * category points (0-25, higher = better)
 *
 * Inverse relationship: Low risk = high points
 */
export function calculateRiskCategoryScore(
  riskAssessment: RiskAssessment
): RiskCategoryScore {
  const missingData: string[] = [];
  const explanations: ComponentExplanation[] = [];

  // Component 1: Flood Risk (5 points)
  const floodRisk = scoreFloodRisk(riskAssessment.flood, explanations);

  // Component 2: Natural Disaster (5 points)
  // Combines earthquake, wildfire, hurricane with adaptive weights
  const naturalDisaster = scoreNaturalDisaster(
    riskAssessment.earthquake,
    riskAssessment.wildfire,
    riskAssessment.hurricane,
    riskAssessment.weightsUsed,
    explanations
  );

  // Component 3: Environmental Risk (5 points)
  const environmentalRisk = scoreEnvironmentalRisk(
    riskAssessment.environmental,
    explanations
  );

  // Component 4: Sinkhole + Radon (5 points)
  const sinkholeRadon = scoreSinkholeRadon(
    riskAssessment.sinkhole,
    riskAssessment.radon,
    riskAssessment.weightsUsed,
    explanations
  );

  // Component 5: Terrain (5 points)
  const terrain = scoreTerrainRisk(riskAssessment.slope, explanations);

  // Calculate total points
  const totalPoints =
    floodRisk.score +
    naturalDisaster.score +
    environmentalRisk.score +
    sinkholeRadon.score +
    terrain.score;

  // Calculate data completeness
  const dataCompleteness = calculateDataCompleteness(riskAssessment);

  // Calculate confidence
  const confidence = Math.round(
    (riskAssessment.confidenceLevel * dataCompleteness) / 100
  );

  // Determine grade
  const grade = calculateGrade(totalPoints, MAX_RISK_POINTS);

  return {
    category: 'risk',
    totalPoints,
    maxPoints: MAX_RISK_POINTS,
    grade,
    confidence,
    components: {
      floodRisk,
      naturalDisaster,
      environmentalRisk,
      sinkholeRadon,
      terrain,
    },
    dataCompleteness,
    missingData,
    explanations,
  };
}

/**
 * Score flood risk component (5 points max)
 */
function scoreFloodRisk(
  flood: RiskAssessment['flood'],
  explanations: ComponentExplanation[]
): ComponentScore {
  let score: number;
  let reason: string;

  switch (flood.riskLevel) {
    case 'minimal':
      score = 5;
      reason = `Zone ${flood.zone}: Minimal flood risk`;
      break;
    case 'moderate':
      score = 3.5;
      reason = `Zone ${flood.zone}: Moderate flood risk, insurance recommended`;
      break;
    case 'high':
      score = 2;
      reason = `Zone ${flood.zone}: High flood risk, insurance required`;
      break;
    case 'very_high':
      score = 0.5;
      reason = `Zone ${flood.zone}: Very high flood risk (coastal wave action)`;
      break;
    default:
      score = 2.5;
      reason = 'Flood zone unknown';
  }

  explanations.push({
    component: 'Flood Risk',
    score,
    reason,
    dataUsed: `FEMA Zone: ${flood.zone}`,
  });

  return {
    name: 'Flood Risk',
    score,
    maxScore: 5,
    rawValue: flood.zone,
    dataSource: 'FEMA NFHL',
    confidence: flood.zone ? 90 : 60,
  };
}

/**
 * Score combined natural disaster risk (5 points max)
 * Weights adjusted based on location-adaptive weights
 */
function scoreNaturalDisaster(
  earthquake: RiskAssessment['earthquake'],
  wildfire: RiskAssessment['wildfire'],
  hurricane: RiskAssessment['hurricane'],
  weights: RiskAssessment['weightsUsed'],
  explanations: ComponentExplanation[]
): ComponentScore {
  // Calculate relative weights for these three risks
  const totalWeight = weights.earthquake + weights.wildfire + weights.hurricane;
  const eqWeight = weights.earthquake / totalWeight;
  const wfWeight = weights.wildfire / totalWeight;
  const hurWeight = weights.hurricane / totalWeight;

  // Score each (0-5 scale, higher = less risk)
  const eqScore = riskLevelToScore(earthquake.riskLevel);
  const wfScore = riskLevelToScore(wildfire.riskLevel);
  const hurScore = riskLevelToScore(hurricane.riskLevel);

  // Weighted average
  const score = Math.round(
    (eqScore * eqWeight + wfScore * wfWeight + hurScore * hurWeight) * 10
  ) / 10;

  const dominantRisk = getDominantRisk(
    { earthquake: eqWeight, wildfire: wfWeight, hurricane: hurWeight },
    { earthquake: eqScore, wildfire: wfScore, hurricane: hurScore }
  );

  explanations.push({
    component: 'Natural Disaster',
    score,
    reason: `Combined EQ/WF/HUR risk. ${dominantRisk.name} is primary concern.`,
    dataUsed: `EQ: ${earthquake.riskLevel}, WF: ${wildfire.riskLevel}, HUR: ${hurricane.riskLevel}`,
  });

  return {
    name: 'Natural Disaster',
    score,
    maxScore: 5,
    rawValue: dominantRisk.name,
    dataSource: 'USGS, USFS, NOAA',
    confidence: 85,
  };
}

/**
 * Score environmental risk component (5 points max)
 */
function scoreEnvironmentalRisk(
  environmental: RiskAssessment['environmental'],
  explanations: ComponentExplanation[]
): ComponentScore {
  const score = riskLevelToScore(environmental.overallRisk);

  explanations.push({
    component: 'Environmental Risk',
    score,
    reason: `${environmental.overallRisk} environmental risk`,
    dataUsed: `Superfund sites nearby: ${environmental.nearbySuperfundSites?.length || 0}`,
  });

  return {
    name: 'Environmental Risk',
    score,
    maxScore: 5,
    rawValue: environmental.overallRisk,
    dataSource: 'EPA Envirofacts',
    confidence: 80,
  };
}

/**
 * Score sinkhole and radon combined (5 points max)
 */
function scoreSinkholeRadon(
  sinkhole: RiskAssessment['sinkhole'],
  radon: RiskAssessment['radon'],
  weights: RiskAssessment['weightsUsed'],
  explanations: ComponentExplanation[]
): ComponentScore {
  // Calculate relative weights
  const totalWeight = weights.sinkhole + weights.radon;
  const shWeight = weights.sinkhole / totalWeight;
  const rnWeight = weights.radon / totalWeight;

  const shScore = riskLevelToScore(sinkhole.riskLevel);
  const rnScore = riskLevelToScore(radon.predictedLevelCategory);

  const score = Math.round((shScore * shWeight + rnScore * rnWeight) * 10) / 10;

  explanations.push({
    component: 'Sinkhole/Radon',
    score,
    reason: `Sinkhole: ${sinkhole.riskLevel}, Radon: ${radon.predictedLevelCategory}`,
    dataUsed: `Karst terrain: ${sinkhole.karstTerrain}, EPA Zone: ${radon.epaZone}`,
  });

  return {
    name: 'Sinkhole/Radon',
    score,
    maxScore: 5,
    rawValue: `SH:${sinkhole.riskLevel}/RN:${radon.epaZone}`,
    dataSource: 'USGS, State Geo, EPA',
    confidence: 75,
  };
}

/**
 * Score terrain risk component (5 points max)
 */
function scoreTerrainRisk(
  slope: RiskAssessment['slope'],
  explanations: ComponentExplanation[]
): ComponentScore {
  let score: number;

  if (slope.landslideRisk === 'low' && slope.averageSlope < 10) {
    score = 5;
  } else if (slope.landslideRisk === 'low') {
    score = 4;
  } else if (slope.landslideRisk === 'moderate') {
    score = 2.5;
  } else {
    score = 1;
  }

  explanations.push({
    component: 'Terrain',
    score,
    reason: `${slope.landslideRisk} landslide risk, ${slope.averageSlope}% avg slope`,
    dataUsed: `Slope: ${slope.averageSlope}%, Max: ${slope.maxSlope}%`,
  });

  return {
    name: 'Terrain',
    score,
    maxScore: 5,
    rawValue: `${slope.averageSlope}%`,
    dataSource: 'Open-Elevation',
    confidence: 80,
  };
}

/**
 * Convert risk level string to score (0-5, higher = better/less risk)
 */
function riskLevelToScore(level: string): number {
  const scores: Record<string, number> = {
    negligible: 5,
    minimal: 5,
    low: 4.5,
    moderate: 3,
    high: 1.5,
    very_high: 0.5,
    extreme: 0,
    severe: 0,
  };
  return scores[level] ?? 2.5;
}

/**
 * Determine which risk is dominant based on weight and score
 */
function getDominantRisk(
  weights: Record<string, number>,
  scores: Record<string, number>
): { name: string; weight: number } {
  // Find the risk with lowest score (highest risk) that has significant weight
  let dominant = { name: 'earthquake', weight: weights.earthquake };

  for (const [name, weight] of Object.entries(weights)) {
    if (scores[name] < scores[dominant.name] && weight > 0.1) {
      dominant = { name, weight };
    }
  }

  return dominant;
}

/**
 * Calculate data completeness percentage
 */
function calculateDataCompleteness(assessment: RiskAssessment): number {
  let complete = 0;
  let total = 8;

  if (assessment.flood.zone) complete++;
  if (assessment.earthquake.seismicZone) complete++;
  if (assessment.wildfire.riskLevel) complete++;
  if (assessment.hurricane.windZone) complete++;
  if (assessment.sinkhole.karstTerrain !== undefined) complete++;
  if (assessment.environmental.overallRisk) complete++;
  if (assessment.radon.epaZone) complete++;
  if (assessment.slope.averageSlope !== undefined) complete++;

  return Math.round((complete / total) * 100);
}

/**
 * Calculate grade based on points
 */
function calculateGrade(
  points: number,
  maxPoints: number
): 'A' | 'B' | 'C' | 'D' | 'F' {
  const percent = (points / maxPoints) * 100;
  if (percent >= 80) return 'A';
  if (percent >= 60) return 'B';
  if (percent >= 40) return 'C';
  if (percent >= 20) return 'D';
  return 'F';
}
```

---

## UI Components for Combined Risk Display

### RiskOverviewCard Component

```tsx
// src/components/analysis/RiskOverviewCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Shield, Info } from 'lucide-react';
import { getRiskLevelColor, getRiskLevelVariant } from '@/lib/analysis/risk/calculateOverallRiskScore';
import type { RiskAssessment } from '@/types/risk-integration';

interface RiskOverviewCardProps {
  assessment: RiskAssessment;
}

export function RiskOverviewCard({ assessment }: RiskOverviewCardProps) {
  const { overallRisk, riskScore, confidenceLevel, warnings, weightExplanations } = assessment;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Overall Risk Assessment
          </span>
          <Badge variant={getRiskLevelVariant(overallRisk)}>
            {overallRisk.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Risk Score Gauge */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Risk Score</span>
            <span className="font-medium">{riskScore}/100</span>
          </div>
          <Progress
            value={riskScore}
            className="h-3"
            indicatorStyle={{
              backgroundColor: getRiskLevelColor(overallRisk),
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Lower is better. Score above 50 indicates elevated risk.
          </p>
        </div>

        {/* Confidence Level */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Confidence Level</span>
            <span className="font-medium">{confidenceLevel}%</span>
          </div>
          <Progress value={confidenceLevel} className="h-2" />
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-4 p-3 bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Warnings</span>
            </div>
            <ul className="text-sm space-y-1">
              {warnings.map((warning, i) => (
                <li key={i} className="text-destructive/90">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weight Explanations */}
        {weightExplanations.length > 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Location-Adaptive Weights</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {weightExplanations.map((exp, i) => (
                <li key={i}>{exp}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### RiskBreakdownChart Component

```tsx
// src/components/analysis/RiskBreakdownChart.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import type { RiskAssessment } from '@/types/risk-integration';

interface RiskBreakdownChartProps {
  assessment: RiskAssessment;
}

const RISK_LEVEL_SCORES: Record<string, number> = {
  negligible: 5,
  minimal: 10,
  low: 20,
  moderate: 50,
  high: 75,
  very_high: 90,
  extreme: 100,
  severe: 100,
};

export function RiskBreakdownChart({ assessment }: RiskBreakdownChartProps) {
  const data = [
    {
      risk: 'Flood',
      score: RISK_LEVEL_SCORES[assessment.flood.riskLevel] || 50,
      weight: Math.round(assessment.weightsUsed.flood * 100),
    },
    {
      risk: 'Earthquake',
      score: RISK_LEVEL_SCORES[assessment.earthquake.riskLevel] || 20,
      weight: Math.round(assessment.weightsUsed.earthquake * 100),
    },
    {
      risk: 'Wildfire',
      score: RISK_LEVEL_SCORES[assessment.wildfire.riskLevel] || 20,
      weight: Math.round(assessment.weightsUsed.wildfire * 100),
    },
    {
      risk: 'Hurricane',
      score: RISK_LEVEL_SCORES[assessment.hurricane.riskLevel] || 20,
      weight: Math.round(assessment.weightsUsed.hurricane * 100),
    },
    {
      risk: 'Sinkhole',
      score: RISK_LEVEL_SCORES[assessment.sinkhole.riskLevel] || 10,
      weight: Math.round(assessment.weightsUsed.sinkhole * 100),
    },
    {
      risk: 'Environmental',
      score: RISK_LEVEL_SCORES[assessment.environmental.overallRisk] || 20,
      weight: Math.round(assessment.weightsUsed.environmental * 100),
    },
    {
      risk: 'Radon',
      score: RISK_LEVEL_SCORES[assessment.radon.predictedLevelCategory] || 20,
      weight: Math.round(assessment.weightsUsed.radon * 100),
    },
    {
      risk: 'Terrain',
      score: assessment.slope.landslideRisk === 'high' ? 75 :
             assessment.slope.landslideRisk === 'moderate' ? 50 : 20,
      weight: Math.round(assessment.weightsUsed.slope * 100),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Breakdown by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="risk"
                tick={{ fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
              />
              <Radar
                name="Risk Score"
                dataKey="score"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.3}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-lg">
                        <p className="font-medium">{data.risk}</p>
                        <p className="text-sm">Score: {data.score}/100</p>
                        <p className="text-sm text-muted-foreground">
                          Weight: {data.weight}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

### RiskMitigationList Component

```tsx
// src/components/analysis/RiskMitigationList.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wrench, DollarSign, Clock, TrendingUp } from 'lucide-react';
import type { RiskMitigation } from '@/types/risk-integration';

interface RiskMitigationListProps {
  mitigations: RiskMitigation[];
  maxItems?: number;
}

export function RiskMitigationList({
  mitigations,
  maxItems = 10,
}: RiskMitigationListProps) {
  const displayItems = mitigations.slice(0, maxItems);

  const priorityColors: Record<string, string> = {
    critical: 'destructive',
    recommended: 'default',
    optional: 'secondary',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Mitigation Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {displayItems.map((mitigation, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{mitigation.riskType}</Badge>
                      <Badge
                        variant={priorityColors[mitigation.priority] as any}
                      >
                        {mitigation.priority}
                      </Badge>
                    </div>
                    <p className="font-medium">{mitigation.action}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>
                      ${mitigation.estimatedCost.min.toLocaleString()} -
                      ${mitigation.estimatedCost.max.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{mitigation.timeframe}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{mitigation.effectiveness}</span>
                  </div>
                </div>

                {mitigation.insuranceImpact && (
                  <p className="text-xs text-muted-foreground">
                    Insurance impact: {mitigation.insuranceImpact}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {mitigations.length > maxItems && (
          <p className="text-sm text-muted-foreground mt-4">
            Showing {maxItems} of {mitigations.length} recommendations
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### InsuranceEstimateCard Component

```tsx
// src/components/analysis/InsuranceEstimateCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck } from 'lucide-react';
import type { InsuranceEstimates } from '@/types/risk';

interface InsuranceEstimateCardProps {
  estimates: InsuranceEstimates;
}

export function InsuranceEstimateCard({ estimates }: InsuranceEstimateCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Insurance Estimates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Standard Homeowners</span>
            <span className="font-medium">
              {formatCurrency(estimates.standardHomeowners)}/yr
            </span>
          </div>

          {estimates.floodInsurance > 0 && (
            <div className="flex justify-between">
              <span>Flood Insurance</span>
              <span className="font-medium">
                {formatCurrency(estimates.floodInsurance)}/yr
              </span>
            </div>
          )}

          {estimates.earthquakeInsurance > 0 && (
            <div className="flex justify-between">
              <span>Earthquake Insurance</span>
              <span className="font-medium">
                {formatCurrency(estimates.earthquakeInsurance)}/yr
              </span>
            </div>
          )}

          {estimates.wildfireInsurance > 0 && (
            <div className="flex justify-between">
              <span>Wildfire Insurance</span>
              <span className="font-medium">
                {formatCurrency(estimates.wildfireInsurance)}/yr
              </span>
            </div>
          )}

          {estimates.windstormInsurance > 0 && (
            <div className="flex justify-between">
              <span>Windstorm Insurance</span>
              <span className="font-medium">
                {formatCurrency(estimates.windstormInsurance)}/yr
              </span>
            </div>
          )}

          {estimates.sinkholeInsurance > 0 && (
            <div className="flex justify-between">
              <span>Sinkhole Insurance</span>
              <span className="font-medium">
                {formatCurrency(estimates.sinkholeInsurance)}/yr
              </span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total Annual Premium</span>
            <span>{formatCurrency(estimates.totalAnnualPremium)}/yr</span>
          </div>

          {estimates.notes.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground font-medium mb-1">
                Notes:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {estimates.notes.map((note, i) => (
                  <li key={i}>- {note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## API Route for Risk Analysis

```typescript
// src/app/api/analysis/risk/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { analyzePropertyRisk } from '@/lib/analysis/risk';
import { calculateRiskCategoryScore } from '@/lib/analysis/scoring/riskScoring';
import { z } from 'zod';

const requestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  state: z.string().length(2),
  propertyValue: z.number().positive(),
  yearBuilt: z.number().min(1800).max(2030),
  sqft: z.number().positive(),
  lotSizeAcres: z.number().positive().optional(),
  distanceToCoast: z.number().min(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = requestSchema.parse(body);

    // Run comprehensive risk analysis
    const riskAssessment = await analyzePropertyRisk(input);

    // Calculate 125-point scoring system integration
    const categoryScore = calculateRiskCategoryScore(riskAssessment);

    return NextResponse.json({
      success: true,
      data: {
        assessment: riskAssessment,
        categoryScore,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Risk analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Verification Steps

1. Test adaptive weight calculation for different states:
   - California (high earthquake/wildfire)
   - Florida (high hurricane/sinkhole)
   - Pennsylvania (high radon)
   - Texas (moderate across multiple)

2. Verify overall risk score calculation:
   - Confirm weighted average is correct
   - Test with various risk level combinations
   - Ensure scores are 0-100 range

3. Test 125-point system integration:
   - Verify 25-point Risk category total is correct
   - Confirm grade calculation matches thresholds
   - Test component breakdown (5 points each)

4. Validate UI components:
   - RiskOverviewCard displays correctly
   - RadarChart shows all 8 risk types
   - Mitigation list sorts by priority
   - Insurance estimates sum correctly

5. Test API route:
   - Valid input returns full assessment
   - Invalid input returns validation errors
   - Edge cases handled gracefully

---

## Dependencies

- Phase 7a: Flood Risk Analysis (floodRisk.ts)
- Phase 7b: Natural Disaster Analysis (earthquakeRisk.ts, wildfireRisk.ts, hurricaneRisk.ts)
- Phase 7c: Environmental Analysis (sinkholeRisk.ts, environmentalRisk.ts, radonRisk.ts, slopeAnalysis.ts)
- Phase 6: Scoring Algorithm (for RiskCategoryScore integration)

---

## Next Phase

After completing Phase 7D, proceed to [Phase 8: Financial Analysis Engine](./phase-8-financial-analysis.md)
