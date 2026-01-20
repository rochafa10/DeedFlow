/**
 * Risk Analysis Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the Property Risk
 * Analysis system, covering water risks (flood and hurricane), geological risks,
 * fire risks, and environmental risks.
 *
 * @module types/risk-analysis
 * @author Claude Code Agent
 * @date 2026-01-16
 */

// ============================================
// Common Types
// ============================================

/**
 * Risk level classification used across all risk types
 */
export type RiskLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'very_high';

/**
 * Data source information for tracking where risk data came from
 */
export interface DataSource {
  /** Name of the data source (e.g., 'FEMA NFHL', 'NOAA') */
  name: string;
  /** Type of data source */
  type: 'api' | 'database' | 'calculated' | 'estimated' | 'default';
  /** URL of the data source if applicable */
  url?: string;
  /** When the data was last updated */
  lastUpdated?: Date;
  /** Reliability assessment of the source */
  reliability: 'high' | 'medium' | 'low';
}

/**
 * Mitigation option for addressing a risk
 */
export interface MitigationOption {
  /** Type of risk this mitigation addresses */
  riskType: string;
  /** Description of the mitigation action */
  action: string;
  /** Estimated cost range for the mitigation */
  estimatedCost: {
    min: number;
    max: number;
  };
  /** Effectiveness rating of the mitigation */
  effectiveness: 'low' | 'moderate' | 'high' | 'very_high';
  /** Estimated timeframe to implement */
  timeframe: string;
  /** Impact on insurance premiums if applicable */
  insuranceImpact?: string;
  /** Priority level for this mitigation */
  priority: 'optional' | 'recommended' | 'critical';
}

// ============================================
// Flood Risk Types
// ============================================

/**
 * FEMA Flood Zone codes and their characteristics
 */
export type FEMAFloodZone =
  // Minimal Risk Zones
  | 'X'      // Area of minimal flood hazard
  | 'C'      // Area of minimal flood hazard (older designation)
  // Moderate Risk Zones
  | 'X500'   // 500-year floodplain (shaded X)
  | 'B'      // Moderate flood hazard (older designation)
  // High Risk Zones (SFHA - Special Flood Hazard Areas)
  | 'A'      // High-risk, no BFE determined
  | 'AE'     // High-risk with BFE determined
  | 'AH'     // High-risk, shallow flooding (1-3 feet)
  | 'AO'     // High-risk, sheet flow (1-3 feet)
  | 'AR'     // High-risk during levee restoration
  | 'A99'    // High-risk, protected by levee under construction
  // Very High Risk Zones (Coastal)
  | 'V'      // Coastal high-hazard with wave action
  | 'VE'     // Coastal high-hazard with BFE determined
  // Unknown
  | 'D'      // Undetermined flood hazard
  | string;  // Allow other zone codes for future compatibility

/**
 * Flood-specific mitigation option
 */
export interface FloodMitigation extends MitigationOption {
  riskType: 'flood';
  /** Elevation gain above BFE if applicable */
  bfeElevationGain?: number;
}

/**
 * Comprehensive flood risk analysis result
 */
export interface FloodRiskAnalysis {
  // Zone Information
  /** FEMA flood zone code (A, AE, X, V, VE, etc.) */
  zone: FEMAFloodZone;
  /** Brief description of the flood zone */
  zoneDescription: string;
  /** Risk level classification */
  riskLevel: RiskLevel;

  // Flood Hazard Details
  /** Whether flood insurance is required for federally-backed mortgages */
  insuranceRequired: boolean;
  /** Estimated annual flood insurance premium (null if not applicable) */
  annualPremiumEstimate: number | null;
  /** FEMA Base Flood Elevation in feet (null if not determined) */
  baseFloodElevation: number | null;
  /** Property elevation in feet (null if not available) */
  propertyElevation: number | null;
  /** Difference between property and BFE (positive = above BFE) */
  elevationDifference: number | null;

  // Floodway Status
  /** Property's position relative to the regulatory floodway */
  floodwayStatus: 'in_floodway' | 'in_fringe' | 'outside' | null;

  // Historical Data
  /** Historical flooding information for the area */
  historicalFlooding: {
    /** Number of flood events in the area */
    count: number;
    /** Date of most recent flood (null if none) */
    lastDate: Date | null;
    /** Average damage amount from historical floods */
    avgDamage: number | null;
  } | null;

  // Recommendations
  /** List of mitigation recommendations */
  mitigationRecommendations: string[];

  // Metadata
  /** Source of the flood data */
  dataSource: DataSource;
  /** Confidence level in the analysis (0-100) */
  confidence: number;
}

// ============================================
// Hurricane Risk Types
// ============================================

/**
 * Wind zone classification based on ASCE 7 / Florida Building Code
 */
export type WindZone = 'zone_1' | 'zone_2' | 'zone_3' | 'zone_4' | null;

/**
 * Storm surge evacuation zone (A is highest risk)
 */
export type StormSurgeZone = 'A' | 'B' | 'C' | 'D' | 'E' | null;

/**
 * Hurricane-specific mitigation option
 */
export interface HurricaneMitigation extends MitigationOption {
  riskType: 'hurricane';
  /** Wind rating improvement achieved */
  windRatingImprovement?: string;
}

/**
 * Comprehensive hurricane risk analysis result
 */
export interface HurricaneRiskAnalysis {
  // Wind Zone Information
  /** Wind zone classification (zone_1 through zone_4, or null if not in hurricane zone) */
  windZone: WindZone;
  /** Description of the wind zone requirements */
  windZoneDescription: string | null;
  /** Design wind speed in mph for this zone (null if not applicable) */
  maxWindSpeed: number | null;

  // Storm Surge Information
  /** Storm surge evacuation zone (A through E, or null if not in surge zone) */
  stormSurgeZone: StormSurgeZone;
  /** Description of the storm surge risk level */
  stormSurgeDescription: string | null;
  /** Evacuation zone designation if applicable */
  evacuationZone: string | null;

  // Historical Data
  /** Historical hurricane activity in the area */
  historicalStorms: {
    /** Number of hurricanes within 50 miles in last 30 years */
    count: number;
    /** Names of significant storms that affected the area */
    significantStorms: string[];
  } | null;

  // Building Requirements
  /** Building code requirements for this wind zone */
  buildingCodeRequirements: string[];
  /** Insurance considerations for hurricane coverage */
  insuranceConsiderations: string[];

  // Metadata
  /** Source of the hurricane data */
  dataSource: DataSource;
  /** Confidence level in the analysis (0-100) */
  confidence: number;
}

// ============================================
// Combined Water Risk Types
// ============================================

/**
 * Combined water risk severity level
 */
export type CombinedWaterRisk = 'low' | 'moderate' | 'high' | 'severe';

/**
 * Primary water risk concern for the property
 */
export type PrimaryWaterConcern = 'flood' | 'hurricane' | 'both' | 'none';

/**
 * Combined water risk analysis result including both flood and hurricane risks
 */
export interface WaterRiskResult {
  // Individual Risk Analyses
  /** Detailed flood risk analysis */
  flood: FloodRiskAnalysis;
  /** Detailed hurricane risk analysis */
  hurricane: HurricaneRiskAnalysis;

  // Combined Assessment
  /** Overall combined water risk level */
  combinedRiskLevel: CombinedWaterRisk;
  /** Primary concern between flood and hurricane risks */
  primaryConcern: PrimaryWaterConcern;

  // Financial Impact
  /** Total estimated water-related insurance cost per year */
  totalInsuranceCost: number;
  /** Breakdown of insurance costs */
  insuranceBreakdown: {
    /** Flood insurance portion */
    flood: number;
    /** Windstorm/hurricane insurance portion */
    windstorm: number;
  };

  // Warnings and Recommendations
  /** Critical warnings about water risks */
  criticalWarnings: string[];
  /** Combined mitigation recommendations */
  recommendations: string[];

  // Scoring
  /** Flood risk score (0-5 scale, 5 = minimal risk) */
  floodRiskScore: number;
  /** Hurricane risk score (0-5 scale, 5 = minimal risk) */
  hurricaneRiskScore: number;
  /** Combined water risk score (0-5 scale, 5 = minimal risk) */
  combinedWaterRiskScore: number;

  // Metadata
  /** When the analysis was performed */
  analyzedAt: Date;
  /** Overall confidence in the combined analysis (0-100) */
  confidence: number;
}

// ============================================
// Scoring System Integration
// ============================================

/**
 * Water risk scoring result for integration with the 125-point scoring system
 *
 * The water risk component contributes up to 5 points to the Risk category (25 points max).
 * Scoring scale:
 * - 5/5: Minimal risk (Zone X, no hurricane exposure)
 * - 4/5: Low risk (Zone X500/B, minor hurricane exposure)
 * - 3/5: Moderate risk (Zone D or moderate flood/hurricane zones)
 * - 2/5: High risk (Zones A, AE without coastal exposure)
 * - 1/5: Very high risk (Zones V, VE or high hurricane + flood)
 * - 0/5: Severe risk (Multiple extreme risk factors)
 */
export interface WaterRiskScoring {
  /** Score from flood zone analysis (0-5) */
  floodScore: number;
  /** Score from hurricane risk analysis (0-5) */
  hurricaneScore: number;
  /** Combined weighted score (0-5) */
  combinedScore: number;
  /** Weight applied to flood vs hurricane based on location */
  weights: {
    flood: number;
    hurricane: number;
  };
  /** Explanation of the score */
  explanation: string;
  /** Factors that positively affected the score */
  positiveFactors: string[];
  /** Factors that negatively affected the score */
  negativeFactors: string[];
}

// ============================================
// Geological Risk Types (Phase 7B)
// ============================================

/**
 * Earthquake risk severity classification
 */
export type SeismicHazardLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

/**
 * Sinkhole risk severity classification
 */
export type SinkholeRiskLevel = 'negligible' | 'low' | 'moderate' | 'high' | 'very_high';

/**
 * Slope stability classification
 */
export type SlopeStabilityLevel = 'stable' | 'marginally_stable' | 'unstable' | 'highly_unstable';

/**
 * Geological-specific mitigation option
 */
export interface GeologicalMitigation extends MitigationOption {
  riskType: 'earthquake' | 'sinkhole' | 'slope';
}

/**
 * Earthquake risk analysis result
 *
 * Uses USGS seismic hazard data including PGA (Peak Ground Acceleration)
 * and spectral acceleration values.
 */
export interface EarthquakeRiskAnalysis {
  /** Seismic hazard classification */
  hazardLevel: SeismicHazardLevel;
  /** Peak Ground Acceleration (% g) for 2% probability in 50 years */
  pga: number;
  /** Spectral acceleration at 0.2 seconds (% g) */
  spectralAcceleration02: number | null;
  /** Spectral acceleration at 1.0 second (% g) */
  spectralAcceleration10: number | null;
  /** Distance to nearest known fault in miles */
  distanceToFault: number | null;
  /** Name of nearest fault if known */
  nearestFaultName: string | null;
  /** Historical earthquake count within 50 miles (last 100 years) */
  historicalQuakeCount: number;
  /** Maximum historical magnitude within 50 miles */
  maxHistoricalMagnitude: number | null;
  /** Building code seismic design category (A-F) */
  seismicDesignCategory: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | null;
  /** Mitigation recommendations */
  mitigationRecommendations: string[];
  /** Data source information */
  dataSource: DataSource;
  /** Confidence level (0-100) */
  confidence: number;
}

/**
 * Sinkhole risk analysis result
 *
 * Assesses karst geology and historical sinkhole activity.
 */
export interface SinkholeRiskAnalysis {
  /** Sinkhole risk classification */
  riskLevel: SinkholeRiskLevel;
  /** Whether property is in a karst geology area */
  inKarstArea: boolean;
  /** Type of karst geology if applicable */
  karstType: 'limestone' | 'dolomite' | 'gypsum' | 'salt' | 'other' | null;
  /** Distance to nearest known sinkhole in miles */
  distanceToNearestSinkhole: number | null;
  /** Number of documented sinkholes within 1 mile */
  sinkholesWithinOneMile: number;
  /** Number of documented sinkholes within 5 miles */
  sinkholesWithinFiveMiles: number;
  /** Historical subsidence events in area */
  subsidenceHistory: boolean;
  /** Whether state requires sinkhole insurance disclosure */
  stateRequiresDisclosure: boolean;
  /** Insurance availability and considerations */
  insuranceConsiderations: string[];
  /** Mitigation recommendations */
  mitigationRecommendations: string[];
  /** Data source information */
  dataSource: DataSource;
  /** Confidence level (0-100) */
  confidence: number;
}

/**
 * Slope/landslide risk analysis result
 *
 * Assesses terrain stability and landslide susceptibility.
 */
export interface SlopeRiskAnalysis {
  /** Slope stability classification */
  stabilityLevel: SlopeStabilityLevel;
  /** Average slope percentage at property */
  slopePercentage: number | null;
  /** Maximum slope percentage on property */
  maxSlopePercentage: number | null;
  /** Slope aspect (direction slope faces) */
  slopeAspect: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'flat' | null;
  /** Landslide susceptibility category */
  landslideSusceptibility: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' | null;
  /** Whether property is in a mapped landslide zone */
  inLandslideZone: boolean;
  /** Historical landslide events nearby */
  historicalLandslides: number;
  /** Soil type affecting stability */
  soilType: string | null;
  /** Drainage considerations */
  drainageConsiderations: string[];
  /** Mitigation recommendations */
  mitigationRecommendations: string[];
  /** Data source information */
  dataSource: DataSource;
  /** Confidence level (0-100) */
  confidence: number;
}

/**
 * Combined geological risk analysis result
 */
export interface GeologicalRiskResult {
  /** Earthquake risk analysis */
  earthquake: EarthquakeRiskAnalysis;
  /** Sinkhole risk analysis */
  sinkhole: SinkholeRiskAnalysis;
  /** Slope/landslide risk analysis */
  slope: SlopeRiskAnalysis;
  /** Overall geological risk level */
  overallRiskLevel: RiskLevel;
  /** Combined geological risk score (0-100, higher = more risk) */
  combinedRiskScore: number;
  /** Primary geological concern */
  primaryConcern: 'earthquake' | 'sinkhole' | 'slope' | 'none';
  /** Critical warnings */
  criticalWarnings: string[];
  /** Combined mitigation recommendations */
  recommendations: string[];
  /** When analysis was performed */
  analyzedAt: Date;
  /** Overall confidence (0-100) */
  confidence: number;
}

// ============================================
// Fire Risk Types (Phase 7C)
// ============================================

/**
 * Wildfire risk severity classification
 */
export type WildfireRiskLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';

/**
 * Fire-specific mitigation option
 */
export interface FireMitigation extends MitigationOption {
  riskType: 'wildfire';
  /** Defensible space improvement */
  defensibleSpaceGain?: string;
}

/**
 * Wildfire risk analysis result
 *
 * Uses NASA FIRMS active fire data and state wildfire risk maps.
 */
export interface WildfireRiskAnalysis {
  /** Wildfire risk classification */
  riskLevel: WildfireRiskLevel;
  /** Wildfire Hazard Potential (WHP) score (1-5) */
  whpScore: number | null;
  /** Whether property is in a Wildland-Urban Interface (WUI) zone */
  inWUI: boolean;
  /** WUI classification if applicable */
  wuiType: 'interface' | 'intermix' | 'influence' | null;
  /** Number of active fires within 25 miles (last 7 days) */
  activeFiresNearby: number;
  /** Distance to nearest active fire in miles */
  distanceToNearestFire: number | null;
  /** Historical fire count within 5 miles (last 10 years) */
  historicalFireCount: number;
  /** Acres burned nearby in last major fire season */
  recentAcresBurned: number | null;
  /** Fuel load/vegetation assessment */
  fuelLoad: 'light' | 'moderate' | 'heavy' | 'extreme' | null;
  /** Defensible space recommendations */
  defensibleSpaceRequired: boolean;
  /** Fire-resistant building requirements */
  buildingRequirements: string[];
  /** Insurance considerations */
  insuranceConsiderations: string[];
  /** Evacuation route accessibility */
  evacuationAccessibility: 'good' | 'limited' | 'poor' | null;
  /** Mitigation recommendations */
  mitigationRecommendations: string[];
  /** Data source information */
  dataSource: DataSource;
  /** Confidence level (0-100) */
  confidence: number;
}

// ============================================
// Environmental Risk Types (Phase 7C)
// ============================================

/**
 * Environmental contamination risk level
 */
export type ContaminationRiskLevel = 'none_known' | 'low' | 'moderate' | 'high' | 'severe';

/**
 * EPA Radon Zone classification
 * Zone 1: Highest potential (>4 pCi/L predicted average)
 * Zone 2: Moderate potential (2-4 pCi/L)
 * Zone 3: Low potential (<2 pCi/L)
 */
export type RadonZone = 1 | 2 | 3;

/**
 * Environmental-specific mitigation option
 */
export interface EnvironmentalMitigation extends MitigationOption {
  riskType: 'contamination' | 'radon';
}

/**
 * Nearby contamination site information
 */
export interface ContaminationSite {
  /** Site name */
  name: string;
  /** EPA site ID (if applicable) */
  epaId: string | null;
  /** Type of site */
  type: 'superfund' | 'brownfield' | 'ust' | 'tri' | 'rcra' | 'other';
  /** Current status */
  status: 'active' | 'cleanup_in_progress' | 'remediated' | 'monitored' | 'unknown';
  /** Distance from property in miles */
  distanceMiles: number;
  /** Direction from property */
  direction: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  /** Contaminants of concern */
  contaminants: string[];
  /** Potential groundwater impact */
  groundwaterImpact: boolean;
}

/**
 * Environmental contamination analysis result
 *
 * Uses EPA Envirofacts data including Superfund, brownfields, UST, and TRI.
 */
export interface EnvironmentalContaminationAnalysis {
  /** Contamination risk classification */
  riskLevel: ContaminationRiskLevel;
  /** Number of Superfund sites within 1 mile */
  superfundSitesNearby: number;
  /** Number of brownfield sites within 1 mile */
  brownfieldSitesNearby: number;
  /** Number of underground storage tank sites within 0.5 miles */
  ustSitesNearby: number;
  /** Number of TRI (Toxic Release Inventory) facilities within 1 mile */
  triSitesNearby: number;
  /** Nearest contamination site details */
  nearestSite: ContaminationSite | null;
  /** All nearby sites of concern */
  nearbySites: ContaminationSite[];
  /** Whether Phase I ESA is recommended */
  phaseIRecommended: boolean;
  /** Groundwater contamination concerns */
  groundwaterConcerns: string[];
  /** Air quality concerns from nearby facilities */
  airQualityConcerns: string[];
  /** Historical industrial use indicators */
  historicalIndustrialUse: boolean;
  /** Mitigation recommendations */
  mitigationRecommendations: string[];
  /** Data source information */
  dataSource: DataSource;
  /** Confidence level (0-100) */
  confidence: number;
}

/**
 * Radon risk analysis result
 *
 * Uses EPA radon zone data and state-specific information.
 */
export interface RadonRiskAnalysis {
  /** EPA Radon Zone (1 = highest risk, 3 = lowest) */
  radonZone: RadonZone;
  /** Risk level classification */
  riskLevel: RiskLevel;
  /** Predicted average indoor radon level (pCi/L) */
  predictedLevel: number | null;
  /** Whether testing is strongly recommended */
  testingRecommended: boolean;
  /** State average radon level for reference (pCi/L) */
  stateAverageLevel: number | null;
  /** County average radon level for reference (pCi/L) */
  countyAverageLevel: number | null;
  /** Percentage of homes in area above EPA action level (4 pCi/L) */
  percentAboveActionLevel: number | null;
  /** Mitigation system typically needed */
  mitigationTypicallyNeeded: boolean;
  /** Estimated mitigation cost range */
  estimatedMitigationCost: { min: number; max: number } | null;
  /** State radon disclosure requirements */
  stateDisclosureRequired: boolean;
  /** Mitigation recommendations */
  mitigationRecommendations: string[];
  /** Data source information */
  dataSource: DataSource;
  /** Confidence level (0-100) */
  confidence: number;
}

/**
 * Combined environmental risk analysis result
 */
export interface EnvironmentalRiskResult {
  /** Environmental contamination analysis */
  contamination: EnvironmentalContaminationAnalysis;
  /** Radon risk analysis */
  radon: RadonRiskAnalysis;
  /** Overall environmental risk level */
  overallRiskLevel: RiskLevel;
  /** Combined environmental risk score (0-100, higher = more risk) */
  combinedRiskScore: number;
  /** Primary environmental concern */
  primaryConcern: 'contamination' | 'radon' | 'both' | 'none';
  /** Critical warnings */
  criticalWarnings: string[];
  /** Combined recommendations */
  recommendations: string[];
  /** When analysis was performed */
  analyzedAt: Date;
  /** Overall confidence (0-100) */
  confidence: number;
}

// ============================================
// Combined Risk Integration Types (Phase 7D)
// ============================================

/**
 * Risk weights for adaptive weighting based on location
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
 * Risk input for combined risk calculation
 */
export interface RiskInput {
  flood: FloodRiskAnalysis | null;
  earthquake: EarthquakeRiskAnalysis | null;
  wildfire: WildfireRiskAnalysis | null;
  hurricane: HurricaneRiskAnalysis | null;
  sinkhole: SinkholeRiskAnalysis | null;
  environmental: EnvironmentalContaminationAnalysis | null;
  radon: RadonRiskAnalysis | null;
  slope: SlopeRiskAnalysis | null;
}

/**
 * Individual risk category score
 */
export interface RiskCategoryScore {
  /** Name of the risk category */
  category: keyof RiskWeights;
  /** Raw risk score (0-100, higher = more risk) */
  rawScore: number;
  /** Weight applied to this category */
  weight: number;
  /** Weighted contribution to overall score */
  weightedScore: number;
  /** Risk level classification */
  riskLevel: RiskLevel;
  /** Data availability (full, partial, none) */
  dataAvailability: 'full' | 'partial' | 'none';
}

/**
 * Insurance estimates based on risk assessment
 */
export interface InsuranceEstimates {
  /** Estimated flood insurance premium */
  floodInsurance: number | null;
  /** Estimated earthquake insurance premium */
  earthquakeInsurance: number | null;
  /** Estimated wildfire/fire insurance premium */
  fireInsurance: number | null;
  /** Estimated windstorm/hurricane insurance premium */
  windstormInsurance: number | null;
  /** Total estimated annual insurance cost */
  totalAnnualCost: number;
  /** Insurance availability warnings */
  availabilityWarnings: string[];
}

/**
 * Risk mitigation action with prioritization
 */
export interface RiskMitigation {
  /** Type of risk being mitigated */
  riskType: string;
  /** Mitigation action description */
  action: string;
  /** Priority level (1 = highest) */
  priority: number;
  /** Estimated cost range */
  estimatedCost: { min: number; max: number };
  /** Effectiveness rating */
  effectiveness: 'low' | 'moderate' | 'high' | 'very_high';
  /** Implementation timeframe */
  timeframe: string;
  /** Potential insurance premium reduction */
  insuranceImpact: string | null;
  /** ROI explanation */
  roiExplanation: string | null;
}

/**
 * Overall risk classification for the property
 */
export type OverallRiskLevel = 'low' | 'moderate' | 'high' | 'severe';

/**
 * Comprehensive risk assessment combining all risk factors
 */
export interface RiskAssessment {
  /** Overall risk classification */
  overallRisk: OverallRiskLevel;
  /** Overall risk score (0-100, lower = less risk) */
  riskScore: number;
  /** Confidence level in the assessment (0-100) */
  confidenceLevel: number;

  /** Individual risk analyses */
  flood: FloodRiskAnalysis | null;
  earthquake: EarthquakeRiskAnalysis | null;
  wildfire: WildfireRiskAnalysis | null;
  hurricane: HurricaneRiskAnalysis | null;
  sinkhole: SinkholeRiskAnalysis | null;
  environmental: EnvironmentalContaminationAnalysis | null;
  radon: RadonRiskAnalysis | null;
  slope: SlopeRiskAnalysis | null;

  /** Individual category scores */
  categoryScores: RiskCategoryScore[];

  /** Weights used for this assessment */
  weightsUsed: RiskWeights;

  /** Insurance cost estimates */
  insuranceEstimates: InsuranceEstimates;

  /** Prioritized recommendations */
  recommendations: string[];

  /** Prioritized mitigation actions */
  mitigationActions: RiskMitigation[];

  /** Critical warnings requiring attention */
  warnings: string[];

  /** Top risk factors */
  topRiskFactors: string[];

  /** Positive factors reducing risk */
  positiveFactors: string[];

  /** When assessment was generated */
  assessedAt: Date;
}

/**
 * Risk category score for the 125-point scoring system
 *
 * The Risk category contributes up to 25 points.
 * Risk score 0-100 (higher = more risk) converts to 0-25 points (higher = less risk = better).
 * Formula: categoryScore = 25 * (1 - riskScore / 100)
 */
export interface RiskCategoryScoring {
  /** Category score (0-25) for the 125-point system */
  categoryScore: number;
  /** Individual sub-scores contributing to the category */
  subScores: {
    flood: number;
    hurricane: number;
    earthquake: number;
    wildfire: number;
    sinkhole: number;
    environmental: number;
    radon: number;
    slope: number;
  };
  /** Explanation of the score */
  explanation: string;
  /** Key factors affecting the score */
  keyFactors: string[];
}
