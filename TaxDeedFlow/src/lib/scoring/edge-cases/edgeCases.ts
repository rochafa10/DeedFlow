/**
 * Edge Case Handler - Specialized Handling for Unusual Properties
 *
 * This file provides detection and handling for properties that fall outside
 * normal scoring parameters. Edge cases include:
 * - Very old properties (built before 1920)
 * - Properties without structures
 * - High/low value extremes
 * - Access issues (landlocked, no road)
 * - Title issues (liens, clouds)
 * - Environmental concerns
 * - Market anomalies
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type { PropertyData, ExternalData, PropertyType } from '@/types/scoring';
import type { ExtendedPropertyType } from '../adjustments/property-type';

// ============================================
// Edge Case Type Definitions
// ============================================

/**
 * All possible edge case types detected by the system
 *
 * Categories:
 * - Property Characteristics: very_old_property, no_structure, extremely_low_value, high_value_property
 * - Access Issues: landlocked, no_road_access
 * - Title/Lien Issues: title_cloud, irs_lien, hoa_super_lien
 * - Environmental: environmental_contamination, wetlands
 * - Market: high_competition_area, declining_market
 * - Lot: very_small_lot, sliver_lot
 * - Auto-Reject: cemetery, utility_property
 */
export type EdgeCaseType =
  // Property characteristics
  | 'very_old_property'      // Built before 1920
  | 'no_structure'           // No building on lot
  | 'high_value_property'    // Market value > $500K
  | 'extremely_low_value'    // Total due < $500
  // Access issues
  | 'landlocked'             // No legal access
  | 'no_road_access'         // No road frontage
  // Title/lien issues
  | 'title_cloud'            // Unknown title issues
  | 'irs_lien'               // IRS tax lien exists
  | 'hoa_super_lien'         // HOA super lien priority
  // Environmental
  | 'environmental_contamination' // Known contamination
  | 'wetlands'               // Wetland designation
  // Market
  | 'high_competition_area'  // Many bidders expected
  | 'declining_market'       // YoY price decrease
  // Lot issues
  | 'very_small_lot'         // < 2,500 sqft
  | 'sliver_lot'             // Width < 20ft
  // Auto-reject types
  | 'cemetery'               // Cemetery property
  | 'utility_property';      // Utility easement/property

/**
 * Handling strategy for edge cases
 *
 * - standard: Normal scoring proceeds
 * - manual_review: Flag for human review
 * - specialized_analysis: Requires specialized evaluation
 * - auto_reject: Automatically reject (cemetery, utility)
 * - reject_unbuildable: Reject as unbuildable (sliver lot)
 * - lien_analysis_required: Need lien research
 * - title_research_required: Need title search
 * - environmental_assessment_required: Need environmental study
 * - enhanced_market_analysis: Need detailed market research
 */
export type EdgeCaseHandling =
  | 'standard'
  | 'manual_review'
  | 'specialized_analysis'
  | 'auto_reject'
  | 'reject_unbuildable'
  | 'lien_analysis_required'
  | 'title_research_required'
  | 'environmental_assessment_required'
  | 'enhanced_market_analysis';

/**
 * Severity level for edge cases
 */
export type EdgeCaseSeverity = 'low' | 'medium' | 'high';

/**
 * Result of edge case detection and handling
 */
export interface EdgeCaseResult {
  /** Whether any edge case was detected */
  isEdgeCase: boolean;
  /** Primary edge case type (if single) */
  edgeCaseType?: EdgeCaseType;
  /** All detected edge case types */
  edgeCaseTypes?: EdgeCaseType[];
  /** Recommended handling strategy */
  handling: EdgeCaseHandling;
  /** Warning messages for the user */
  warnings: string[];
  /** Recommendations for proceeding */
  recommendations?: string[];
  /** Combined severity when multiple edge cases */
  combinedSeverity?: EdgeCaseSeverity;
  /** Reason for rejection (if auto_reject or reject_unbuildable) */
  rejectReason?: string;
  /** Title issues found */
  titleIssues?: string[];
  /** Total lien burden amount */
  totalLienBurden?: number;
  /** Buildable acres after wetlands/setbacks */
  buildableAcres?: number;
  /** Lot efficiency percentage */
  lotEfficiency?: number;
  /** Type of environmental contamination */
  contaminationType?: string;
  /** Estimated remediation cost */
  estimatedRemediationCost?: number;
  /** Whether manual review is required */
  requiresManualReview?: boolean;
}

// ============================================
// Edge Case Detection Configuration
// ============================================

/**
 * Configuration for edge case detection thresholds
 */
export interface EdgeCaseConfig {
  /** Year threshold for very old property */
  veryOldPropertyYear: number;
  /** Threshold for high value property */
  highValueThreshold: number;
  /** Threshold for extremely low value */
  extremelyLowValueThreshold: number;
  /** Threshold for very small lot (sqft) */
  verySmallLotSqft: number;
  /** Minimum lot width for sliver detection (ft) */
  sliverLotMinWidth: number;
  /** YoY price change threshold for declining market */
  decliningMarketThreshold: number;
  /** Competition score threshold */
  highCompetitionThreshold: number;
}

/**
 * Default edge case detection thresholds
 */
export const DEFAULT_EDGE_CASE_CONFIG: EdgeCaseConfig = {
  veryOldPropertyYear: 1920,
  highValueThreshold: 500000,
  extremelyLowValueThreshold: 500,
  verySmallLotSqft: 2500,
  sliverLotMinWidth: 20,
  decliningMarketThreshold: -5, // -5% YoY
  highCompetitionThreshold: 75, // 75+ competition score
};

/**
 * Severity and handling for each edge case type
 */
const EDGE_CASE_DEFINITIONS: Record<
  EdgeCaseType,
  {
    severity: EdgeCaseSeverity;
    handling: EdgeCaseHandling;
    warningTemplate: string;
    recommendationTemplate: string;
  }
> = {
  // Property characteristics
  very_old_property: {
    severity: 'medium',
    handling: 'manual_review',
    warningTemplate: 'Property built before {year}, may have structural or code compliance issues.',
    recommendationTemplate: 'Recommend professional inspection before bidding.',
  },
  no_structure: {
    severity: 'low',
    handling: 'specialized_analysis',
    warningTemplate: 'Vacant land with no existing structure.',
    recommendationTemplate: 'Evaluate for development potential and buildability.',
  },
  high_value_property: {
    severity: 'medium',
    handling: 'enhanced_market_analysis',
    warningTemplate: 'High-value property (${value}). Increased bid risk.',
    recommendationTemplate: 'Perform detailed market analysis and comparable sales research.',
  },
  extremely_low_value: {
    severity: 'medium',
    handling: 'manual_review',
    warningTemplate: 'Extremely low tax amount (${value}). Investigate property condition.',
    recommendationTemplate: 'Low value may indicate significant issues or limited land.',
  },

  // Access issues
  landlocked: {
    severity: 'high',
    handling: 'manual_review',
    warningTemplate: 'Property appears landlocked with no legal access.',
    recommendationTemplate: 'Verify access rights. May require easement negotiation.',
  },
  no_road_access: {
    severity: 'high',
    handling: 'manual_review',
    warningTemplate: 'No road frontage detected. Access may be limited.',
    recommendationTemplate: 'Inspect property access. May require road construction or easement.',
  },

  // Title/lien issues
  title_cloud: {
    severity: 'high',
    handling: 'title_research_required',
    warningTemplate: 'Potential title issues detected. Title search required.',
    recommendationTemplate: 'Obtain full title search before bidding.',
  },
  irs_lien: {
    severity: 'high',
    handling: 'lien_analysis_required',
    warningTemplate: 'IRS lien may survive tax sale. Federal redemption rights apply.',
    recommendationTemplate: 'Verify IRS lien status. 120-day federal redemption period applies.',
  },
  hoa_super_lien: {
    severity: 'high',
    handling: 'lien_analysis_required',
    warningTemplate: 'HOA super lien may survive tax sale in this jurisdiction.',
    recommendationTemplate: 'Research HOA lien priority and outstanding assessments.',
  },

  // Environmental
  environmental_contamination: {
    severity: 'high',
    handling: 'environmental_assessment_required',
    warningTemplate: 'Potential environmental contamination: {type}.',
    recommendationTemplate: 'Phase I ESA recommended. Remediation costs may be significant.',
  },
  wetlands: {
    severity: 'medium',
    handling: 'specialized_analysis',
    warningTemplate: 'Property contains wetlands. Buildable area: {acres} acres ({efficiency}%).',
    recommendationTemplate: 'Verify wetland delineation. Development restrictions apply.',
  },

  // Market
  high_competition_area: {
    severity: 'low',
    handling: 'enhanced_market_analysis',
    warningTemplate: 'High competition expected. Multiple bidders likely.',
    recommendationTemplate: 'Set firm maximum bid. Be prepared for competitive auction.',
  },
  declining_market: {
    severity: 'medium',
    handling: 'enhanced_market_analysis',
    warningTemplate: 'Market declining {pct}% YoY. Property may lose value.',
    recommendationTemplate: 'Factor declining market into exit strategy and hold period.',
  },

  // Lot issues
  very_small_lot: {
    severity: 'medium',
    handling: 'manual_review',
    warningTemplate: 'Very small lot ({sqft} sqft). Limited development options.',
    recommendationTemplate: 'Verify zoning allows construction on lot size.',
  },
  sliver_lot: {
    severity: 'high',
    handling: 'reject_unbuildable',
    warningTemplate: 'Sliver lot (width < 20ft). Unbuildable.',
    recommendationTemplate: 'Property is unbuildable. Consider only for land assembly.',
  },

  // Auto-reject types
  cemetery: {
    severity: 'high',
    handling: 'auto_reject',
    warningTemplate: 'Property is a cemetery. Non-investable.',
    recommendationTemplate: 'Skip this property. Cemetery properties have no investment value.',
  },
  utility_property: {
    severity: 'high',
    handling: 'auto_reject',
    warningTemplate: 'Property is a utility easement or utility property.',
    recommendationTemplate: 'Skip this property. Utility properties cannot be developed.',
  },
};

// ============================================
// Edge Case Detection Functions
// ============================================

/**
 * Detect edge cases for a property
 *
 * Analyzes property and external data to identify edge cases that
 * require special handling or should be rejected.
 *
 * @param property - Core property data
 * @param externalData - External data sources (optional)
 * @param config - Detection thresholds (optional)
 * @returns EdgeCaseResult with detected cases and handling strategy
 *
 * @example
 * const result = handleEdgeCases(
 *   { year_built: 1890, lot_size_sqft: 1500, land_use: 'CEMETERY' },
 *   { marketData: { priceChangeYoY: -8 } }
 * );
 * // Returns: { isEdgeCase: true, edgeCaseTypes: ['very_old_property', 'very_small_lot', 'cemetery'], handling: 'auto_reject', ... }
 */
export function handleEdgeCases(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null,
  config: EdgeCaseConfig = DEFAULT_EDGE_CASE_CONFIG
): EdgeCaseResult {
  const detectedCases: EdgeCaseType[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const additionalData: Partial<EdgeCaseResult> = {};

  // ============================================
  // Auto-Reject Detection (Check First)
  // ============================================

  // Cemetery detection
  if (detectCemetery(property)) {
    detectedCases.push('cemetery');
    warnings.push(formatWarning('cemetery', {}));
    recommendations.push(EDGE_CASE_DEFINITIONS.cemetery.recommendationTemplate);
  }

  // Utility property detection
  if (detectUtilityProperty(property)) {
    detectedCases.push('utility_property');
    warnings.push(formatWarning('utility_property', {}));
    recommendations.push(EDGE_CASE_DEFINITIONS.utility_property.recommendationTemplate);
  }

  // If auto-reject detected, return immediately
  const autoRejectTypes = detectedCases.filter(
    (t) => EDGE_CASE_DEFINITIONS[t].handling === 'auto_reject'
  );
  if (autoRejectTypes.length > 0) {
    return {
      isEdgeCase: true,
      edgeCaseType: autoRejectTypes[0],
      edgeCaseTypes: autoRejectTypes,
      handling: 'auto_reject',
      warnings,
      recommendations,
      combinedSeverity: 'high',
      rejectReason: `Property is classified as ${autoRejectTypes.join(', ')}. Non-investable.`,
      requiresManualReview: false,
    };
  }

  // ============================================
  // Property Characteristics Detection
  // ============================================

  // Very old property
  if (property.year_built && property.year_built < config.veryOldPropertyYear) {
    detectedCases.push('very_old_property');
    warnings.push(formatWarning('very_old_property', { year: property.year_built }));
    recommendations.push(EDGE_CASE_DEFINITIONS.very_old_property.recommendationTemplate);
  }

  // No structure
  if (detectNoStructure(property)) {
    detectedCases.push('no_structure');
    warnings.push(formatWarning('no_structure', {}));
    recommendations.push(EDGE_CASE_DEFINITIONS.no_structure.recommendationTemplate);
  }

  // High value property
  if (
    property.market_value &&
    property.market_value > config.highValueThreshold
  ) {
    detectedCases.push('high_value_property');
    warnings.push(
      formatWarning('high_value_property', {
        value: property.market_value.toLocaleString(),
      })
    );
    recommendations.push(EDGE_CASE_DEFINITIONS.high_value_property.recommendationTemplate);
  }

  // Extremely low value
  if (
    property.total_due !== null &&
    property.total_due !== undefined &&
    property.total_due < config.extremelyLowValueThreshold
  ) {
    detectedCases.push('extremely_low_value');
    warnings.push(
      formatWarning('extremely_low_value', {
        value: property.total_due.toLocaleString(),
      })
    );
    recommendations.push(EDGE_CASE_DEFINITIONS.extremely_low_value.recommendationTemplate);
  }

  // ============================================
  // Access Issues Detection
  // ============================================

  // Landlocked detection
  if (detectLandlocked(property, externalData)) {
    detectedCases.push('landlocked');
    warnings.push(formatWarning('landlocked', {}));
    recommendations.push(EDGE_CASE_DEFINITIONS.landlocked.recommendationTemplate);
  }

  // No road access
  if (detectNoRoadAccess(property, externalData)) {
    detectedCases.push('no_road_access');
    warnings.push(formatWarning('no_road_access', {}));
    recommendations.push(EDGE_CASE_DEFINITIONS.no_road_access.recommendationTemplate);
  }

  // ============================================
  // Title/Lien Issues Detection
  // ============================================

  // Title cloud detection
  const titleCloudResult = detectTitleCloud(property, externalData);
  if (titleCloudResult.hasIssues) {
    detectedCases.push('title_cloud');
    warnings.push(formatWarning('title_cloud', {}));
    recommendations.push(EDGE_CASE_DEFINITIONS.title_cloud.recommendationTemplate);
    additionalData.titleIssues = titleCloudResult.issues;
  }

  // IRS lien detection
  const irsLienResult = detectIrsLien(property, externalData);
  if (irsLienResult.hasLien) {
    detectedCases.push('irs_lien');
    warnings.push(formatWarning('irs_lien', {}));
    recommendations.push(EDGE_CASE_DEFINITIONS.irs_lien.recommendationTemplate);
    if (irsLienResult.amount) {
      additionalData.totalLienBurden =
        (additionalData.totalLienBurden || 0) + irsLienResult.amount;
    }
  }

  // HOA super lien detection
  const hoaLienResult = detectHoaSuperLien(property, externalData);
  if (hoaLienResult.hasLien) {
    detectedCases.push('hoa_super_lien');
    warnings.push(formatWarning('hoa_super_lien', {}));
    recommendations.push(EDGE_CASE_DEFINITIONS.hoa_super_lien.recommendationTemplate);
    if (hoaLienResult.amount) {
      additionalData.totalLienBurden =
        (additionalData.totalLienBurden || 0) + hoaLienResult.amount;
    }
  }

  // ============================================
  // Environmental Detection
  // ============================================

  // Environmental contamination
  const contaminationResult = detectEnvironmentalContamination(property, externalData);
  if (contaminationResult.hasContamination) {
    detectedCases.push('environmental_contamination');
    warnings.push(
      formatWarning('environmental_contamination', {
        type: contaminationResult.type || 'Unknown',
      })
    );
    recommendations.push(EDGE_CASE_DEFINITIONS.environmental_contamination.recommendationTemplate);
    additionalData.contaminationType = contaminationResult.type;
    additionalData.estimatedRemediationCost = contaminationResult.estimatedCost;
  }

  // Wetlands detection
  const wetlandsResult = detectWetlands(property, externalData);
  if (wetlandsResult.hasWetlands) {
    detectedCases.push('wetlands');
    warnings.push(
      formatWarning('wetlands', {
        acres: wetlandsResult.buildableAcres?.toFixed(2) || 'Unknown',
        efficiency: wetlandsResult.lotEfficiency?.toFixed(0) || 'Unknown',
      })
    );
    recommendations.push(EDGE_CASE_DEFINITIONS.wetlands.recommendationTemplate);
    additionalData.buildableAcres = wetlandsResult.buildableAcres;
    additionalData.lotEfficiency = wetlandsResult.lotEfficiency;
  }

  // ============================================
  // Market Detection
  // ============================================

  // High competition area
  if (detectHighCompetition(property, externalData, config)) {
    detectedCases.push('high_competition_area');
    warnings.push(formatWarning('high_competition_area', {}));
    recommendations.push(EDGE_CASE_DEFINITIONS.high_competition_area.recommendationTemplate);
  }

  // Declining market
  const decliningResult = detectDecliningMarket(property, externalData, config);
  if (decliningResult.isDeclining) {
    detectedCases.push('declining_market');
    warnings.push(
      formatWarning('declining_market', {
        pct: decliningResult.percentChange?.toFixed(1) || 'Unknown',
      })
    );
    recommendations.push(EDGE_CASE_DEFINITIONS.declining_market.recommendationTemplate);
  }

  // ============================================
  // Lot Issues Detection
  // ============================================

  // Very small lot
  if (
    property.lot_size_sqft &&
    property.lot_size_sqft < config.verySmallLotSqft &&
    property.lot_size_sqft > 0
  ) {
    detectedCases.push('very_small_lot');
    warnings.push(
      formatWarning('very_small_lot', {
        sqft: property.lot_size_sqft.toLocaleString(),
      })
    );
    recommendations.push(EDGE_CASE_DEFINITIONS.very_small_lot.recommendationTemplate);
  }

  // Sliver lot detection
  const sliverResult = detectSliverLot(property, config);
  if (sliverResult.isSliver) {
    detectedCases.push('sliver_lot');
    warnings.push(
      formatWarning('sliver_lot', { width: sliverResult.width?.toFixed(0) || '<20' })
    );
    recommendations.push(EDGE_CASE_DEFINITIONS.sliver_lot.recommendationTemplate);
  }

  // ============================================
  // Determine Overall Handling Strategy
  // ============================================

  if (detectedCases.length === 0) {
    return {
      isEdgeCase: false,
      handling: 'standard',
      warnings: [],
      recommendations: [],
      requiresManualReview: false,
    };
  }

  // Determine combined severity
  const combinedSeverity = calculateCombinedSeverity(detectedCases);

  // Determine handling strategy (highest priority wins)
  const handling = determineHandlingStrategy(detectedCases);

  // Check for reject_unbuildable (sliver lot)
  if (detectedCases.includes('sliver_lot')) {
    return {
      isEdgeCase: true,
      edgeCaseType: 'sliver_lot',
      edgeCaseTypes: detectedCases,
      handling: 'reject_unbuildable',
      warnings,
      recommendations,
      combinedSeverity: 'high',
      rejectReason: 'Property is an unbuildable sliver lot (width < 20ft).',
      requiresManualReview: false,
      ...additionalData,
    };
  }

  return {
    isEdgeCase: true,
    edgeCaseType: detectedCases[0],
    edgeCaseTypes: detectedCases,
    handling,
    warnings,
    recommendations,
    combinedSeverity,
    requiresManualReview: handling === 'manual_review' || combinedSeverity === 'high',
    ...additionalData,
  };
}

// ============================================
// Individual Detection Functions
// ============================================

/**
 * Detect if property is a cemetery
 */
function detectCemetery(property: Partial<PropertyData>): boolean {
  if (!property) return false;

  const landUse = property.land_use?.toLowerCase() || '';
  const zoning = property.zoning?.toLowerCase() || '';
  const propertyType = (property.property_type as string)?.toLowerCase() || '';

  return (
    landUse.includes('cemetery') ||
    landUse.includes('burial') ||
    landUse.includes('graveyard') ||
    zoning.includes('cemetery') ||
    propertyType.includes('cemetery')
  );
}

/**
 * Detect if property is a utility property
 */
function detectUtilityProperty(property: Partial<PropertyData>): boolean {
  if (!property) return false;

  const landUse = property.land_use?.toLowerCase() || '';
  const zoning = property.zoning?.toLowerCase() || '';
  const propertyType = (property.property_type as string)?.toLowerCase() || '';

  return (
    landUse.includes('utility') ||
    landUse.includes('power line') ||
    landUse.includes('easement') ||
    landUse.includes('substation') ||
    landUse.includes('transformer') ||
    zoning.includes('utility') ||
    propertyType.includes('utility')
  );
}

/**
 * Detect if property has no structure
 */
function detectNoStructure(property: Partial<PropertyData>): boolean {
  return (
    property.building_sqft === null ||
    property.building_sqft === undefined ||
    property.building_sqft === 0
  );
}

/**
 * Detect if property is landlocked
 */
function detectLandlocked(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): boolean {
  // Check visual validation status and notes if available
  if (property.validation_status === 'REJECT') {
    // Would need to check rejection reason - simplified for now
    return false;
  }

  // Check for landlocked indicators in land use
  const landUse = property.land_use?.toLowerCase() || '';
  if (landUse.includes('landlocked') || landUse.includes('no access')) {
    return true;
  }

  // Future: Check from Regrid data or visual validation
  return false;
}

/**
 * Detect if property has no road access
 */
function detectNoRoadAccess(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): boolean {
  // Check land use for road access indicators
  const landUse = property.land_use?.toLowerCase() || '';
  if (
    landUse.includes('no road') ||
    landUse.includes('flag lot') ||
    landUse.includes('interior lot')
  ) {
    return true;
  }

  // Future: More sophisticated detection using GIS data
  return false;
}

/**
 * Detect title cloud issues
 */
function detectTitleCloud(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): { hasIssues: boolean; issues?: string[] } {
  // This would typically come from title research
  // For now, flag properties with certain characteristics
  const issues: string[] = [];

  // Check if sale type suggests title complications
  if (property.sale_type === 'judicial') {
    issues.push('Judicial sale - may have complex title history');
  }

  // Future: Integrate with title search API
  return {
    hasIssues: issues.length > 0,
    issues,
  };
}

/**
 * Detect IRS lien
 */
function detectIrsLien(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): { hasLien: boolean; amount?: number } {
  // This would come from lien search
  // IRS liens have 120-day redemption right after tax sale
  // Future: Integrate with lien search service
  return { hasLien: false };
}

/**
 * Detect HOA super lien
 */
function detectHoaSuperLien(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): { hasLien: boolean; amount?: number } {
  // Check if property type suggests HOA
  const propertyType = (property.property_type as string)?.toLowerCase() || '';
  const landUse = property.land_use?.toLowerCase() || '';

  const isHoaProperty =
    propertyType.includes('condo') ||
    propertyType.includes('townhouse') ||
    landUse.includes('condo') ||
    landUse.includes('hoa');

  if (isHoaProperty) {
    // In states like FL, HOA liens can have super-lien priority
    // This needs jurisdiction-specific logic
    // Future: Check state law and HOA records
  }

  return { hasLien: false };
}

/**
 * Detect environmental contamination
 */
function detectEnvironmentalContamination(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): { hasContamination: boolean; type?: string; estimatedCost?: number } {
  // Check external environmental data
  if (externalData?.environmentalHazards) {
    const hazards = externalData.environmentalHazards;

    // Superfund sites are serious contamination
    if (hazards.superfundSites && hazards.superfundSites > 0) {
      return {
        hasContamination: true,
        type: 'Superfund site proximity',
        estimatedCost: 50000, // Placeholder
      };
    }

    // Brownfield sites indicate past industrial use
    if (hazards.brownfieldSites && hazards.brownfieldSites > 0) {
      return {
        hasContamination: true,
        type: 'Brownfield site',
        estimatedCost: 25000, // Placeholder
      };
    }

    // High overall risk score
    if (hazards.riskScore && hazards.riskScore > 70) {
      return {
        hasContamination: true,
        type: 'High environmental risk score',
        estimatedCost: 15000, // Placeholder
      };
    }
  }

  // Check land use for contamination indicators
  const landUse = property.land_use?.toLowerCase() || '';
  if (
    landUse.includes('contaminated') ||
    landUse.includes('brownfield') ||
    landUse.includes('superfund')
  ) {
    return {
      hasContamination: true,
      type: 'Land use indicates contamination',
      estimatedCost: 25000,
    };
  }

  return { hasContamination: false };
}

/**
 * Detect wetlands on property
 */
function detectWetlands(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): {
  hasWetlands: boolean;
  buildableAcres?: number;
  lotEfficiency?: number;
} {
  // Check land use for wetland indicators
  const landUse = property.land_use?.toLowerCase() || '';
  if (
    landUse.includes('wetland') ||
    landUse.includes('marsh') ||
    landUse.includes('swamp') ||
    landUse.includes('flood plain')
  ) {
    // Estimate buildable area (simplified)
    const totalAcres = property.lot_size_acres || 0;
    const buildableAcres = totalAcres * 0.5; // Assume 50% buildable
    const lotEfficiency = totalAcres > 0 ? (buildableAcres / totalAcres) * 100 : 0;

    return {
      hasWetlands: true,
      buildableAcres,
      lotEfficiency,
    };
  }

  // Check flood zone for wetland correlation
  if (externalData?.floodZone?.zone) {
    const zone = externalData.floodZone.zone.toUpperCase();
    // A and AE zones often correlate with wetlands
    if (zone === 'A' || zone === 'AE' || zone === 'VE') {
      const totalAcres = property.lot_size_acres || 0;
      const buildableAcres = totalAcres * 0.6;
      const lotEfficiency = totalAcres > 0 ? (buildableAcres / totalAcres) * 100 : 0;

      return {
        hasWetlands: true,
        buildableAcres,
        lotEfficiency,
      };
    }
  }

  return { hasWetlands: false };
}

/**
 * Detect high competition area
 */
function detectHighCompetition(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null,
  config: EdgeCaseConfig = DEFAULT_EDGE_CASE_CONFIG
): boolean {
  // Check market data for competition indicators
  if (externalData?.marketData) {
    const market = externalData.marketData;

    // Low days on market suggests high demand/competition
    if (market.medianDaysOnMarket !== null && market.medianDaysOnMarket < 15) {
      return true;
    }

    // High absorption rate suggests competitive market
    if (market.absorptionRate !== null && market.absorptionRate > 0.15) {
      return true;
    }
  }

  // Future: Check auction history for bidder counts
  return false;
}

/**
 * Detect declining market
 */
function detectDecliningMarket(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null,
  config: EdgeCaseConfig = DEFAULT_EDGE_CASE_CONFIG
): { isDeclining: boolean; percentChange?: number } {
  if (externalData && externalData.marketData && externalData.marketData.priceChangeYoY !== undefined && externalData.marketData.priceChangeYoY !== null) {
    const change = externalData.marketData.priceChangeYoY;
    if (change < config.decliningMarketThreshold) {
      return {
        isDeclining: true,
        percentChange: change,
      };
    }
  }

  return { isDeclining: false };
}

/**
 * Detect sliver lot (unbuildable narrow lot)
 */
function detectSliverLot(
  property: Partial<PropertyData>,
  config: EdgeCaseConfig = DEFAULT_EDGE_CASE_CONFIG
): { isSliver: boolean; width?: number } {
  // Check lot dimensions if available
  // Lot dimensions would typically be in format like "20x100" or "20' x 100'"
  // This requires parsing lot_dimensions from Regrid data

  // Heuristic: Very long, thin lots based on sqft/acres ratio
  if (property.lot_size_sqft && property.lot_size_sqft < 2000) {
    // Small lots that are also long and thin
    // A 1000 sqft lot that is 10x100 is a sliver
    // Without dimensions, we can flag very small lots for review
    // This is a simplified detection
    return { isSliver: false };
  }

  // Future: Parse lot_dimensions string for actual width
  return { isSliver: false };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format warning message with placeholders
 */
function formatWarning(
  edgeCaseType: EdgeCaseType,
  values: Record<string, string | number>
): string {
  let template = EDGE_CASE_DEFINITIONS[edgeCaseType].warningTemplate;

  for (const [key, value] of Object.entries(values)) {
    template = template.replace(`{${key}}`, String(value));
  }

  return template;
}

/**
 * Calculate combined severity from multiple edge cases
 */
function calculateCombinedSeverity(
  edgeCases: EdgeCaseType[]
): EdgeCaseSeverity {
  let highCount = 0;
  let mediumCount = 0;

  for (const edgeCase of edgeCases) {
    const severity = EDGE_CASE_DEFINITIONS[edgeCase].severity;
    if (severity === 'high') highCount++;
    if (severity === 'medium') mediumCount++;
  }

  // Any high severity = high combined
  if (highCount > 0) return 'high';

  // 2+ medium = high
  if (mediumCount >= 2) return 'high';

  // 1 medium = medium
  if (mediumCount === 1) return 'medium';

  // All low = low
  return 'low';
}

/**
 * Determine the highest priority handling strategy
 */
function determineHandlingStrategy(
  edgeCases: EdgeCaseType[]
): EdgeCaseHandling {
  // Priority order (highest first)
  const priorityOrder: EdgeCaseHandling[] = [
    'auto_reject',
    'reject_unbuildable',
    'environmental_assessment_required',
    'title_research_required',
    'lien_analysis_required',
    'manual_review',
    'specialized_analysis',
    'enhanced_market_analysis',
    'standard',
  ];

  // Get all handling strategies for detected cases
  const strategies = edgeCases.map(
    (ec) => EDGE_CASE_DEFINITIONS[ec].handling
  );

  // Return highest priority
  for (const priority of priorityOrder) {
    if (strategies.includes(priority)) {
      return priority;
    }
  }

  return 'standard';
}

// ============================================
// Export Utility Functions
// ============================================

/**
 * Check if a property should be auto-rejected
 */
export function shouldAutoReject(property: Partial<PropertyData>): boolean {
  return detectCemetery(property) || detectUtilityProperty(property);
}

/**
 * Get all edge case type definitions
 */
export function getEdgeCaseDefinitions(): Record<
  EdgeCaseType,
  { severity: EdgeCaseSeverity; handling: EdgeCaseHandling }
> {
  const result: Record<
    EdgeCaseType,
    { severity: EdgeCaseSeverity; handling: EdgeCaseHandling }
  > = {} as Record<EdgeCaseType, { severity: EdgeCaseSeverity; handling: EdgeCaseHandling }>;

  for (const [key, value] of Object.entries(EDGE_CASE_DEFINITIONS)) {
    result[key as EdgeCaseType] = {
      severity: value.severity,
      handling: value.handling,
    };
  }

  return result;
}

/**
 * Check if edge case requires special handling
 */
export function requiresSpecialHandling(result: EdgeCaseResult): boolean {
  return (
    result.handling !== 'standard' &&
    result.handling !== 'enhanced_market_analysis'
  );
}

/**
 * Get edge cases that block standard scoring
 */
export function getScoringBlockers(result: EdgeCaseResult): EdgeCaseType[] {
  if (!result.edgeCaseTypes) return [];

  const blockingHandlings: EdgeCaseHandling[] = [
    'auto_reject',
    'reject_unbuildable',
    'environmental_assessment_required',
    'title_research_required',
    'lien_analysis_required',
  ];

  return result.edgeCaseTypes.filter((ec) =>
    blockingHandlings.includes(EDGE_CASE_DEFINITIONS[ec].handling)
  );
}
