# Phase 6D: Edge Cases & Calibration

## Overview

Phase 6D implements edge case detection, handling strategies, and a calibration framework for tuning scoring weights based on historical outcomes. This ensures the scoring system handles unusual properties appropriately and improves over time.

---

## Edge Case Detection

### Edge Case Types

```typescript
// src/lib/analysis/scoring/edgeCases.ts

/**
 * Edge case detection and handling
 */
export interface EdgeCaseResult {
  isEdgeCase: boolean;
  edgeCaseType?: EdgeCaseType;
  handling: EdgeCaseHandling;
  warnings: ScoringWarning[];
  scoreAdjustments: ScoreAdjustment[];
}

export type EdgeCaseType =
  | 'extremely_low_value'      // < $5,000 tax due
  | 'extremely_high_value'     // > $100,000 tax due
  | 'very_old_property'        // > 100 years old
  | 'new_construction'         // < 2 years old
  | 'very_large_lot'           // > 10 acres
  | 'tiny_lot'                 // < 1,000 sqft
  | 'no_structure'             // Building sqft = 0
  | 'extreme_appreciation'     // > 20% yearly
  | 'negative_appreciation'    // < -5% yearly
  | 'coastal_property'         // < 1 mile from coast
  | 'mountain_property'        // > 5,000 ft elevation
  | 'historic_property'        // Designated historic
  | 'hoa_property'             // Has HOA restrictions
  | 'subdivision_lot'          // Part of active subdivision
  | 'foreclosure_history'      // Previous foreclosure
  // Tax deed-specific edge cases
  | 'landlocked'               // No road access
  | 'no_road_access'           // Road access confirmed false
  | 'title_cloud'              // Title issues identified
  | 'irs_lien'                 // Federal tax lien present
  | 'hoa_super_lien'           // HOA lien with super-priority
  | 'environmental_contamination' // EPA site or contamination
  | 'wetlands';                // Wetlands on property

export type EdgeCaseHandling =
  | 'proceed_with_caution'
  | 'manual_review_required'
  | 'specialized_analysis'
  | 'skip_standard_scoring';
```

### Edge Case Thresholds

| Edge Case | Threshold | Severity | Adjustment |
|-----------|-----------|----------|------------|
| Extremely Low Value | < $5,000 tax due | Warning | Manual review |
| Extremely High Value | > $100,000 tax due | Info | -5% profit score |
| Very Old Property | > 100 years | Warning | -20% rehab score |
| New Construction | < 2 years | Info | Check builder liens |
| Very Large Lot | > 10 acres | Info | Consider subdivision |
| Tiny Lot | < 1,000 sqft | Warning | -15% market score |
| No Structure | 0 building sqft | Info | Specialized analysis |
| Extreme Appreciation | > 20% yearly | Warning | -20% appreciation |
| Negative Appreciation | < -5% yearly | Critical | Manual review |
| Coastal Property | < 1 mile | Warning | -15% risk score |

### Tax Deed-Specific Edge Cases

| Edge Case | Detection Method | Multiplier | Severity |
|-----------|------------------|------------|----------|
| Landlocked | No road access in visual validation | 0.3 | Critical |
| No Road Access | road_access === false | 0.4 | Critical |
| Title Cloud | Title issues identified in research | 0.5 | Warning |
| IRS Lien | Federal tax lien present | 0.6 | Warning |
| HOA Super Lien | HOA lien with super-priority status | 0.7 | Warning |
| Environmental Contamination | EPA site nearby or contamination noted | 0.3 | Critical |
| Wetlands | Wetlands identified on property | 0.5 | Warning |

### Edge Case Definitions

```typescript
/**
 * Tax deed-specific edge case definitions with detection criteria and score multipliers
 */
export const EDGE_CASE_DEFINITIONS: Record<string, EdgeCaseDefinition> = {
  // Existing edge cases
  extremely_low_value: {
    detection: 'totalDue < 5000',
    multiplier: 0.8,
    severity: 'warning',
    handling: 'manual_review_required',
  },
  extremely_high_value: {
    detection: 'totalDue > 100000',
    multiplier: 0.95,
    severity: 'info',
    handling: 'proceed_with_caution',
  },
  very_old_property: {
    detection: 'age > 100 years',
    multiplier: 0.8,
    severity: 'warning',
    handling: 'proceed_with_caution',
  },
  tiny_lot: {
    detection: 'lotSizeSqft < 1000',
    multiplier: 0.85,
    severity: 'warning',
    handling: 'manual_review_required',
  },

  // Tax deed-specific edge cases
  landlocked: {
    detection: 'no road access in visual validation',
    multiplier: 0.3,
    severity: 'critical',
    handling: 'manual_review_required',
    recommendation: 'Property has no legal road access - verify easement rights or skip',
  },
  no_road_access: {
    detection: 'road_access === false',
    multiplier: 0.4,
    severity: 'critical',
    handling: 'manual_review_required',
    recommendation: 'Road access confirmed false - major accessibility issue',
  },
  title_cloud: {
    detection: 'title issues identified',
    multiplier: 0.5,
    severity: 'warning',
    handling: 'specialized_analysis',
    recommendation: 'Title issues present - budget for quiet title action ($3,000-$10,000)',
  },
  irs_lien: {
    detection: 'federal tax lien present',
    multiplier: 0.6,
    severity: 'warning',
    handling: 'specialized_analysis',
    recommendation: 'IRS liens may survive tax sale - verify redemption period (120 days)',
  },
  hoa_super_lien: {
    detection: 'HOA lien with super-priority',
    multiplier: 0.7,
    severity: 'warning',
    handling: 'proceed_with_caution',
    recommendation: 'HOA super lien may survive - add to acquisition cost estimate',
  },
  environmental_contamination: {
    detection: 'EPA site nearby or contamination noted',
    multiplier: 0.3,
    severity: 'critical',
    handling: 'skip_standard_scoring',
    recommendation: 'Environmental contamination - likely REJECT unless remediation budgeted',
  },
  wetlands: {
    detection: 'wetlands on property',
    multiplier: 0.5,
    severity: 'warning',
    handling: 'specialized_analysis',
    recommendation: 'Wetlands present - verify buildable area and permit requirements',
  },
};

interface EdgeCaseDefinition {
  detection: string;
  multiplier: number;
  severity: 'info' | 'warning' | 'critical';
  handling: EdgeCaseHandling;
  recommendation?: string;
}
```

---

## Edge Case Handler Implementation

```typescript
/**
 * Detect and handle edge cases
 */
export function handleEdgeCases(
  property: PropertyData,
  externalData: ExternalData
): EdgeCaseResult {
  const warnings: ScoringWarning[] = [];
  const adjustments: ScoreAdjustment[] = [];
  const detectedCases: EdgeCaseType[] = [];

  // Extremely low value
  const totalDue = property.totalDue || property.taxAmount || 0;
  if (totalDue < 5000 && totalDue > 0) {
    detectedCases.push('extremely_low_value');
    warnings.push({
      severity: 'warning',
      category: 'financial',
      message: `Very low acquisition cost ($${totalDue.toLocaleString()})`,
      recommendation: 'Verify property is not a sliver lot, easement, or has severe issues',
    });
  }

  // Extremely high value
  if (totalDue > 100000) {
    detectedCases.push('extremely_high_value');
    warnings.push({
      severity: 'info',
      category: 'financial',
      message: `High acquisition cost ($${totalDue.toLocaleString()})`,
      recommendation: 'Ensure sufficient capital and consider risk exposure',
    });
    // Reduce profit score slightly for high-value properties (more risk)
    adjustments.push({
      type: 'market_condition',
      factor: 0.95,
      reason: 'High-value property risk adjustment',
      appliedTo: 'profit',
    });
  }

  // Very old property
  const yearBuilt = property.yearBuilt || 1970;
  const age = new Date().getFullYear() - yearBuilt;
  if (age > 100) {
    detectedCases.push('very_old_property');
    warnings.push({
      severity: 'warning',
      category: 'financial',
      message: `Very old property (${age} years)`,
      recommendation: 'Budget for significant structural assessment and potential issues',
    });
    adjustments.push({
      type: 'property_type',
      factor: 0.8,
      reason: 'Age-related risk for 100+ year old property',
      appliedTo: 'rehab_costs',
    });
  }

  // New construction
  if (age < 2) {
    detectedCases.push('new_construction');
    warnings.push({
      severity: 'info',
      category: 'financial',
      message: 'New construction - investigate why in tax sale',
      recommendation: 'Verify no builder liens or construction defects',
    });
  }

  // No structure (vacant land)
  if (!property.buildingSqft || property.buildingSqft === 0) {
    detectedCases.push('no_structure');
    warnings.push({
      severity: 'info',
      category: 'profit',
      message: 'Vacant land - different valuation model needed',
      recommendation: 'Research development potential and zoning restrictions',
    });
  }

  // Very large lot
  const lotAcres = property.lotSizeAcres || (property.lotSizeSqft || 0) / 43560;
  if (lotAcres > 10) {
    detectedCases.push('very_large_lot');
    warnings.push({
      severity: 'info',
      category: 'market',
      message: `Large lot (${lotAcres.toFixed(1)} acres)`,
      recommendation: 'Consider subdivision potential and carrying costs',
    });
  }

  // Tiny lot
  if (property.lotSizeSqft && property.lotSizeSqft < 1000) {
    detectedCases.push('tiny_lot');
    warnings.push({
      severity: 'warning',
      category: 'market',
      message: `Very small lot (${property.lotSizeSqft} sqft)`,
      recommendation: 'Verify buildability and market demand for small lots',
    });
    adjustments.push({
      type: 'property_type',
      factor: 0.85,
      reason: 'Limited market for very small lots',
      appliedTo: 'market',
    });
  }

  // Extreme appreciation
  const appreciation = externalData.marketData?.yearlyAppreciation || 0;
  if (appreciation > 20) {
    detectedCases.push('extreme_appreciation');
    warnings.push({
      severity: 'warning',
      category: 'market',
      message: `Extreme appreciation rate (${appreciation}%)`,
      recommendation: 'Verify sustainability - may be market anomaly',
    });
    // Don't give full credit for unsustainable appreciation
    adjustments.push({
      type: 'market_condition',
      factor: 0.8,
      reason: 'Unsustainable appreciation rate adjustment',
      appliedTo: 'appreciation_rate',
    });
  }

  // Negative appreciation
  if (appreciation < -5) {
    detectedCases.push('negative_appreciation');
    warnings.push({
      severity: 'critical',
      category: 'market',
      message: `Declining market (${appreciation}% yearly)`,
      recommendation: 'CAUTION: Property value may continue declining',
    });
  }

  // Coastal property
  if (property.distanceToCoast && property.distanceToCoast < 1) {
    detectedCases.push('coastal_property');
    warnings.push({
      severity: 'warning',
      category: 'risk',
      message: 'Coastal property - elevated flood/storm risk',
      recommendation: 'Budget for flood insurance and storm preparations',
    });
    adjustments.push({
      type: 'regional',
      factor: 0.85,
      reason: 'Coastal property risk premium',
      appliedTo: 'risk',
    });
  }

  // ============================================
  // TAX DEED-SPECIFIC EDGE CASES
  // ============================================

  // Landlocked property (from visual validation)
  if (property.visualValidation?.roadAccess === false ||
      property.visualValidation?.findings?.landlocked) {
    detectedCases.push('landlocked');
    warnings.push({
      severity: 'critical',
      category: 'risk',
      message: 'LANDLOCKED - No legal road access detected',
      recommendation: 'Property has no road access - verify easement rights or SKIP',
    });
    adjustments.push({
      type: 'tax_deed_specific',
      factor: 0.3,
      reason: 'Landlocked property - severely limited marketability',
      appliedTo: 'total_score',
    });
  }

  // No road access (explicit flag)
  if (property.roadAccess === false && !detectedCases.includes('landlocked')) {
    detectedCases.push('no_road_access');
    warnings.push({
      severity: 'critical',
      category: 'risk',
      message: 'No road access confirmed',
      recommendation: 'Verify if legal access exists through easement or other means',
    });
    adjustments.push({
      type: 'tax_deed_specific',
      factor: 0.4,
      reason: 'No road access - major accessibility issue',
      appliedTo: 'total_score',
    });
  }

  // Title cloud (from title research)
  if (property.titleIssues && property.titleIssues.length > 0) {
    detectedCases.push('title_cloud');
    warnings.push({
      severity: 'warning',
      category: 'financial',
      message: `Title issues identified: ${property.titleIssues.join(', ')}`,
      recommendation: 'Budget $3,000-$10,000 for quiet title action',
    });
    adjustments.push({
      type: 'tax_deed_specific',
      factor: 0.5,
      reason: 'Title cloud - additional legal costs required',
      appliedTo: 'financial',
    });
  }

  // IRS lien
  if (property.liens?.some(lien => lien.type === 'federal' || lien.type === 'irs')) {
    detectedCases.push('irs_lien');
    warnings.push({
      severity: 'warning',
      category: 'financial',
      message: 'Federal/IRS tax lien present',
      recommendation: 'IRS has 120-day redemption period - lien may survive tax sale',
    });
    adjustments.push({
      type: 'tax_deed_specific',
      factor: 0.6,
      reason: 'IRS lien - federal redemption rights apply',
      appliedTo: 'financial',
    });
  }

  // HOA super lien
  if (property.liens?.some(lien => lien.type === 'hoa' && lien.superPriority)) {
    detectedCases.push('hoa_super_lien');
    warnings.push({
      severity: 'warning',
      category: 'financial',
      message: 'HOA super lien present - may survive tax sale',
      recommendation: 'Research total HOA arrears and add to acquisition cost',
    });
    adjustments.push({
      type: 'tax_deed_specific',
      factor: 0.7,
      reason: 'HOA super lien - additional costs likely',
      appliedTo: 'financial',
    });
  }

  // Environmental contamination
  if (property.environmentalIssues?.contamination ||
      property.environmentalIssues?.epaSite ||
      externalData.environmentalData?.brownfieldSite) {
    detectedCases.push('environmental_contamination');
    warnings.push({
      severity: 'critical',
      category: 'risk',
      message: 'ENVIRONMENTAL CONTAMINATION detected',
      recommendation: 'REJECT - Potential Superfund liability exceeds any profit',
    });
    adjustments.push({
      type: 'tax_deed_specific',
      factor: 0.3,
      reason: 'Environmental contamination - severe liability risk',
      appliedTo: 'total_score',
    });
  }

  // Wetlands
  if (property.environmentalIssues?.wetlands ||
      externalData.environmentalData?.wetlandsPresent) {
    detectedCases.push('wetlands');
    warnings.push({
      severity: 'warning',
      category: 'risk',
      message: 'Wetlands identified on property',
      recommendation: 'Verify buildable area and research permit requirements',
    });
    adjustments.push({
      type: 'tax_deed_specific',
      factor: 0.5,
      reason: 'Wetlands present - development restrictions likely',
      appliedTo: 'market',
    });
  }

  // Determine handling strategy
  let handling: EdgeCaseHandling = 'proceed_with_caution';

  if (detectedCases.includes('no_structure')) {
    handling = 'specialized_analysis';
  }

  if (detectedCases.length >= 3 ||
      detectedCases.includes('negative_appreciation') ||
      detectedCases.includes('extremely_low_value')) {
    handling = 'manual_review_required';
  }

  return {
    isEdgeCase: detectedCases.length > 0,
    edgeCaseType: detectedCases[0],
    handling,
    warnings,
    scoreAdjustments: adjustments,
  };
}
```

---

## Compound Edge Case Detection

Compound edge cases occur when multiple edge cases combine to create a distinct investment scenario that requires specialized handling beyond individual edge case adjustments.

### Compound Edge Case Definitions

```typescript
/**
 * Compound edge cases - combinations that indicate specific scenarios
 */
export interface CompoundEdgeCase {
  name: string;
  requiredCases: EdgeCaseType[];
  optionalCases?: EdgeCaseType[];
  combinedMultiplier: number;
  interpretation: string;
  recommendation: string;
  handling: EdgeCaseHandling;
}

export const COMPOUND_EDGE_CASES: CompoundEdgeCase[] = [
  {
    name: 'likely_tear_down',
    requiredCases: ['extremely_low_value', 'very_old_property'],
    optionalCases: ['no_structure'],
    combinedMultiplier: 0.4,
    interpretation: 'Property likely requires demolition - value is in land only',
    recommendation: 'Calculate land value minus demolition costs ($10,000-$30,000)',
    handling: 'specialized_analysis',
  },
  {
    name: 'inaccessible_land',
    requiredCases: ['landlocked', 'no_road_access'],
    combinedMultiplier: 0.2,
    interpretation: 'Property has severe access issues - likely unmarketable',
    recommendation: 'SKIP unless you can secure easement rights',
    handling: 'skip_standard_scoring',
  },
  {
    name: 'legal_nightmare',
    requiredCases: ['title_cloud', 'irs_lien'],
    optionalCases: ['hoa_super_lien'],
    combinedMultiplier: 0.3,
    interpretation: 'Multiple lien/title issues - complex legal situation',
    recommendation: 'Budget $15,000+ for legal resolution or SKIP',
    handling: 'manual_review_required',
  },
  {
    name: 'environmental_hazard',
    requiredCases: ['environmental_contamination'],
    optionalCases: ['extremely_low_value', 'no_structure'],
    combinedMultiplier: 0.1,
    interpretation: 'Environmental contamination - potential Superfund liability',
    recommendation: 'REJECT - liability exceeds any potential profit',
    handling: 'skip_standard_scoring',
  },
  {
    name: 'unbuildable_lot',
    requiredCases: ['tiny_lot', 'wetlands'],
    combinedMultiplier: 0.15,
    interpretation: 'Lot too small and/or has wetlands - cannot be developed',
    recommendation: 'Only value as adjoining lot to neighbors',
    handling: 'specialized_analysis',
  },
  {
    name: 'speculative_land',
    requiredCases: ['very_large_lot', 'no_structure'],
    optionalCases: ['extreme_appreciation'],
    combinedMultiplier: 0.7,
    interpretation: 'Large vacant land - speculative investment',
    recommendation: 'Research subdivision potential and zoning before bidding',
    handling: 'specialized_analysis',
  },
  {
    name: 'declining_area',
    requiredCases: ['negative_appreciation', 'extremely_low_value'],
    combinedMultiplier: 0.35,
    interpretation: 'Property in declining market with minimal value',
    recommendation: 'Only proceed if rental income covers holding costs',
    handling: 'manual_review_required',
  },
  {
    name: 'hoa_risk',
    requiredCases: ['hoa_property', 'hoa_super_lien'],
    combinedMultiplier: 0.6,
    interpretation: 'HOA property with super lien - additional costs likely',
    recommendation: 'Research total HOA arrears before bidding',
    handling: 'proceed_with_caution',
  },
];

/**
 * Detect compound edge cases from individual edge cases
 */
export function detectCompoundEdgeCases(
  edgeCases: EdgeCaseType[]
): CompoundEdgeCase[] {
  const detectedCompounds: CompoundEdgeCase[] = [];

  for (const compound of COMPOUND_EDGE_CASES) {
    // Check if all required cases are present
    const hasAllRequired = compound.requiredCases.every(
      required => edgeCases.includes(required)
    );

    if (hasAllRequired) {
      // Check how many optional cases are present (for severity adjustment)
      const optionalMatches = compound.optionalCases?.filter(
        optional => edgeCases.includes(optional)
      ).length || 0;

      detectedCompounds.push({
        ...compound,
        // Reduce multiplier further if optional cases are also present
        combinedMultiplier: compound.combinedMultiplier * (1 - optionalMatches * 0.1),
      });
    }
  }

  return detectedCompounds;
}

/**
 * Apply compound edge case adjustments to score
 */
export function applyCompoundEdgeCaseAdjustments(
  baseScore: number,
  compoundCases: CompoundEdgeCase[]
): { adjustedScore: number; adjustments: ScoreAdjustment[] } {
  if (compoundCases.length === 0) {
    return { adjustedScore: baseScore, adjustments: [] };
  }

  const adjustments: ScoreAdjustment[] = [];
  let adjustedScore = baseScore;

  // Apply the most severe compound case (lowest multiplier)
  const mostSevere = compoundCases.reduce(
    (min, current) => current.combinedMultiplier < min.combinedMultiplier ? current : min,
    compoundCases[0]
  );

  adjustedScore = baseScore * mostSevere.combinedMultiplier;

  adjustments.push({
    type: 'compound_edge_case',
    factor: mostSevere.combinedMultiplier,
    reason: `Compound edge case: ${mostSevere.name} - ${mostSevere.interpretation}`,
    appliedTo: 'total_score',
  });

  // Add warnings for other compound cases
  for (const compound of compoundCases) {
    if (compound.name !== mostSevere.name) {
      adjustments.push({
        type: 'compound_edge_case',
        factor: 1.0, // No additional adjustment, just warning
        reason: `Additional compound case detected: ${compound.name}`,
        appliedTo: 'warning_only',
      });
    }
  }

  return { adjustedScore, adjustments };
}
```

### Compound Edge Case Detection in Scoring Pipeline

```typescript
/**
 * Enhanced edge case handling with compound detection
 */
export function handleEdgeCasesWithCompounds(
  property: PropertyData,
  externalData: ExternalData
): EnhancedEdgeCaseResult {
  // First, detect individual edge cases
  const individualResult = handleEdgeCases(property, externalData);
  const detectedTypes = individualResult.warnings
    .filter(w => w.category !== 'general')
    .map(w => extractEdgeCaseType(w));

  // Then detect compound cases
  const compoundCases = detectCompoundEdgeCases(detectedTypes as EdgeCaseType[]);

  // Determine most restrictive handling
  let finalHandling = individualResult.handling;
  for (const compound of compoundCases) {
    if (getHandlingSeverity(compound.handling) > getHandlingSeverity(finalHandling)) {
      finalHandling = compound.handling;
    }
  }

  return {
    ...individualResult,
    compoundCases,
    hasCompoundCases: compoundCases.length > 0,
    handling: finalHandling,
    warnings: [
      ...individualResult.warnings,
      ...compoundCases.map(c => ({
        severity: 'critical' as const,
        category: 'compound',
        message: `COMPOUND CASE: ${c.name}`,
        recommendation: c.recommendation,
      })),
    ],
  };
}

interface EnhancedEdgeCaseResult extends EdgeCaseResult {
  compoundCases: CompoundEdgeCase[];
  hasCompoundCases: boolean;
}

function getHandlingSeverity(handling: EdgeCaseHandling): number {
  const severityMap: Record<EdgeCaseHandling, number> = {
    'proceed_with_caution': 1,
    'specialized_analysis': 2,
    'manual_review_required': 3,
    'skip_standard_scoring': 4,
  };
  return severityMap[handling] || 0;
}
```

---

## Confidence Integration with Edge Cases

Edge case detection directly impacts the confidence score of property analysis. More edge cases mean less certainty about the scoring accuracy.

### Confidence Adjustment Rules

```typescript
/**
 * Adjust confidence score based on edge case presence
 */
export function adjustConfidenceForEdgeCases(
  baseConfidence: number,
  edgeCaseResult: EnhancedEdgeCaseResult
): { confidence: number; reasons: string[] } {
  let confidence = baseConfidence;
  const reasons: string[] = [];

  // Reduce confidence for each edge case detected
  const edgeCaseCount = edgeCaseResult.warnings.filter(
    w => w.severity === 'warning' || w.severity === 'critical'
  ).length;

  if (edgeCaseCount > 0) {
    const reduction = Math.min(0.3, edgeCaseCount * 0.05);
    confidence -= reduction;
    reasons.push(`${edgeCaseCount} edge case(s) detected: -${(reduction * 100).toFixed(0)}%`);
  }

  // Additional reduction for compound cases
  if (edgeCaseResult.hasCompoundCases) {
    const compoundReduction = Math.min(0.2, edgeCaseResult.compoundCases.length * 0.1);
    confidence -= compoundReduction;
    reasons.push(`${edgeCaseResult.compoundCases.length} compound case(s): -${(compoundReduction * 100).toFixed(0)}%`);
  }

  // Severe reduction for critical handling requirements
  if (edgeCaseResult.handling === 'skip_standard_scoring') {
    confidence = Math.min(confidence, 0.3);
    reasons.push('Skip standard scoring required: capped at 30%');
  } else if (edgeCaseResult.handling === 'manual_review_required') {
    confidence = Math.min(confidence, 0.5);
    reasons.push('Manual review required: capped at 50%');
  }

  // Tax deed-specific confidence adjustments
  const taxDeedCases = ['landlocked', 'title_cloud', 'irs_lien', 'environmental_contamination'];
  const hasTaxDeedIssues = edgeCaseResult.warnings.some(
    w => taxDeedCases.some(tc => w.message.toLowerCase().includes(tc.replace('_', ' ')))
  );

  if (hasTaxDeedIssues) {
    confidence -= 0.15;
    reasons.push('Tax deed-specific issues present: -15%');
  }

  // Ensure confidence stays in valid range
  confidence = Math.max(0.1, Math.min(1.0, confidence));

  return { confidence, reasons };
}

/**
 * Confidence level interpretation with edge case context
 */
export function interpretConfidenceWithEdgeCases(
  confidence: number,
  edgeCaseResult: EnhancedEdgeCaseResult
): ConfidenceInterpretation {
  const baseInterpretation = getBaseConfidenceInterpretation(confidence);

  // Modify interpretation based on edge cases
  if (edgeCaseResult.hasCompoundCases) {
    return {
      ...baseInterpretation,
      level: Math.min(baseInterpretation.level - 1, 1) as 1 | 2 | 3 | 4 | 5,
      description: `${baseInterpretation.description} (compound issues detected)`,
      actionRequired: true,
      manualReviewRecommended: true,
    };
  }

  if (edgeCaseResult.handling === 'manual_review_required') {
    return {
      ...baseInterpretation,
      actionRequired: true,
      manualReviewRecommended: true,
    };
  }

  return baseInterpretation;
}

interface ConfidenceInterpretation {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  description: string;
  actionRequired: boolean;
  manualReviewRecommended: boolean;
}

function getBaseConfidenceInterpretation(confidence: number): ConfidenceInterpretation {
  if (confidence >= 0.9) {
    return {
      level: 5,
      label: 'Very High',
      description: 'Scoring highly reliable - all data sources available',
      actionRequired: false,
      manualReviewRecommended: false,
    };
  }
  if (confidence >= 0.7) {
    return {
      level: 4,
      label: 'High',
      description: 'Scoring reliable - minor data gaps',
      actionRequired: false,
      manualReviewRecommended: false,
    };
  }
  if (confidence >= 0.5) {
    return {
      level: 3,
      label: 'Medium',
      description: 'Scoring moderately reliable - some assumptions made',
      actionRequired: true,
      manualReviewRecommended: false,
    };
  }
  if (confidence >= 0.3) {
    return {
      level: 2,
      label: 'Low',
      description: 'Scoring uncertain - significant data gaps or edge cases',
      actionRequired: true,
      manualReviewRecommended: true,
    };
  }
  return {
    level: 1,
    label: 'Very Low',
    description: 'Scoring unreliable - manual analysis required',
    actionRequired: true,
    manualReviewRecommended: true,
  };
}
```

### Confidence Display with Edge Case Context

```tsx
/**
 * Component to display confidence with edge case context
 */
export function ConfidenceWithEdgeCases({
  confidence,
  edgeCaseResult,
  confidenceReasons,
}: {
  confidence: number;
  edgeCaseResult: EnhancedEdgeCaseResult;
  confidenceReasons: string[];
}) {
  const interpretation = interpretConfidenceWithEdgeCases(confidence, edgeCaseResult);

  return (
    <div className="space-y-3">
      {/* Confidence Score Display */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Confidence Level</span>
        <Badge variant={getConfidenceBadgeVariant(interpretation.level)}>
          {interpretation.label} ({(confidence * 100).toFixed(0)}%)
        </Badge>
      </div>

      {/* Confidence Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${getConfidenceBarColor(interpretation.level)}`}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>

      {/* Interpretation */}
      <p className="text-sm text-muted-foreground">{interpretation.description}</p>

      {/* Edge Case Impact */}
      {confidenceReasons.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Confidence Adjustments:
          </span>
          <ul className="text-xs space-y-0.5">
            {confidenceReasons.map((reason, i) => (
              <li key={i} className="text-amber-600">• {reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Required */}
      {interpretation.manualReviewRecommended && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Manual review recommended before making investment decision
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

---

## Edge Case Handling Strategies

### Strategy 1: Proceed with Caution

For minor edge cases that don't significantly impact scoring:

```typescript
export function handleProceedWithCaution(
  result: EdgeCaseResult,
  baseScore: ScoringResult
): ScoringResult {
  // Apply minor adjustments and add warnings
  const adjustedScore = applyScoreAdjustments(baseScore, result.scoreAdjustments);

  return {
    ...adjustedScore,
    warnings: [...adjustedScore.warnings, ...result.warnings],
    metadata: {
      ...adjustedScore.metadata,
      edgeCaseDetected: true,
      edgeCaseType: result.edgeCaseType,
      handling: 'proceed_with_caution',
    },
  };
}
```

### Strategy 2: Manual Review Required

For properties with multiple issues or critical concerns:

```typescript
export function handleManualReviewRequired(
  result: EdgeCaseResult,
  baseScore: ScoringResult
): ScoringResult {
  // Cap the grade at C until manual review
  const cappedGrade = baseScore.grade === 'A' || baseScore.grade === 'B'
    ? 'C'
    : baseScore.grade;

  return {
    ...baseScore,
    grade: cappedGrade,
    confidenceLevel: Math.min(baseScore.confidenceLevel, 0.5),
    warnings: [
      ...baseScore.warnings,
      ...result.warnings,
      {
        severity: 'critical',
        category: 'general',
        message: 'MANUAL REVIEW REQUIRED before proceeding',
        recommendation: 'Review all edge case warnings before making investment decision',
      },
    ],
    metadata: {
      ...baseScore.metadata,
      edgeCaseDetected: true,
      edgeCaseType: result.edgeCaseType,
      handling: 'manual_review_required',
      requiresManualReview: true,
    },
  };
}
```

### Strategy 3: Specialized Analysis

For vacant land and unique property types:

```typescript
export function handleSpecializedAnalysis(
  property: PropertyData,
  externalData: ExternalData
): ScoringResult {
  // Use different scoring model for vacant land
  if (!property.buildingSqft || property.buildingSqft === 0) {
    return scoreVacantLand(property, externalData);
  }

  // Other specialized cases
  return scoreStandardProperty(property, externalData);
}

function scoreVacantLand(
  property: PropertyData,
  externalData: ExternalData
): ScoringResult {
  // Vacant land scoring focuses on:
  // - Development potential
  // - Zoning and restrictions
  // - Access and utilities
  // - Market demand for lots

  const developmentScore = scoreDevelopmentPotential(property, externalData);
  const accessScore = scoreAccessAndUtilities(property);
  const marketScore = scoreLotMarketDemand(property, externalData);

  const totalScore = (
    developmentScore * 0.4 +
    accessScore * 0.3 +
    marketScore * 0.3
  );

  return {
    totalScore,
    grade: getGradeFromScore(totalScore),
    confidenceLevel: 0.6, // Lower confidence for vacant land
    categoryScores: {
      location: { score: marketScore, weight: 0.3, components: [] },
      risk: { score: accessScore, weight: 0.3, components: [] },
      financial: { score: developmentScore, weight: 0.2, components: [] },
      market: { score: marketScore, weight: 0.1, components: [] },
      profit: { score: developmentScore, weight: 0.1, components: [] },
    },
    warnings: [{
      severity: 'info',
      category: 'general',
      message: 'Scored using vacant land model',
      recommendation: 'Verify development potential and zoning before proceeding',
    }],
    adjustments: [],
    metadata: {
      scoringModel: 'vacant_land',
      specializedAnalysis: true,
    },
  };
}
```

---

## Calibration Framework

### Outcome Tracking

```typescript
// src/lib/analysis/scoring/calibration.ts

/**
 * Calibration framework for tuning scoring weights based on outcomes
 */

/**
 * Outcome tracking for calibration
 */
export interface ScoringOutcome {
  propertyId: string;
  scoredAt: Date;

  // Original score
  totalScore: number;
  grade: string;
  confidenceLevel: number;
  categoryScores: {
    location: number;
    risk: number;
    financial: number;
    market: number;
    profit: number;
  };

  // Actual outcome
  wasAcquired: boolean;
  acquisitionPrice?: number;
  actualROI?: number;
  holdingPeriodMonths?: number;
  exitStrategy?: 'flip' | 'rental' | 'hold' | 'other';

  // Outcome assessment
  outcomeScore: 'excellent' | 'good' | 'neutral' | 'poor' | 'failed';
  notes?: string;
}
```

### Default Calibration Configuration

```typescript
/**
 * Current calibration weights (defaults)
 */
export const DEFAULT_CALIBRATION: CalibrationConfig = {
  version: '1.0.0',
  lastUpdated: new Date('2025-01-01'),

  // Category weights (should sum to 1.0)
  categoryWeights: {
    location: 0.20,
    risk: 0.20,
    financial: 0.20,
    market: 0.20,
    profit: 0.20,
  },

  // Component weights within categories (should sum to 1.0 per category)
  componentWeights: {
    location: {
      walkability: 0.15,
      crime_safety: 0.25,
      school_quality: 0.20,
      amenities: 0.20,
      transit: 0.20,
    },
    risk: {
      flood_risk: 0.30,
      earthquake_risk: 0.15,
      wildfire_risk: 0.20,
      hurricane_risk: 0.20,
      terrain_slope: 0.15,
    },
    financial: {
      tax_to_value_ratio: 0.25,
      value_accuracy: 0.20,
      rehab_costs: 0.25,
      lien_exposure: 0.15,
      title_clarity: 0.15,
    },
    market: {
      appreciation_rate: 0.25,
      days_on_market: 0.20,
      inventory_level: 0.20,
      competition: 0.15,
      demand: 0.20,
    },
    profit: {
      roi_potential: 0.25,
      profit_margin: 0.20,
      cash_flow: 0.20,
      resale_value: 0.20,
      rent_potential: 0.15,
    },
  },

  // Threshold adjustments for scoring brackets
  thresholdAdjustments: {
    // These can be tuned based on observed outcomes
    // Format: component -> { threshold: adjustment }
  },
};

export interface CalibrationConfig {
  version: string;
  lastUpdated: Date;
  categoryWeights: Record<string, number>;
  componentWeights: Record<string, Record<string, number>>;
  thresholdAdjustments: Record<string, Record<string, number>>;
}

/**
 * Weight bounds to prevent calibration from producing extreme values
 * These bounds ensure stability and prevent overfitting to limited data
 */
export const WEIGHT_BOUNDS = {
  min: 0.5,           // No weight can go below 50% of default
  max: 2.0,           // No weight can go above 200% of default
  adjustmentStep: 0.05, // Maximum adjustment per calibration cycle

  // Validation function
  validateWeight: (currentWeight: number, defaultWeight: number): number => {
    const minBound = defaultWeight * WEIGHT_BOUNDS.min;
    const maxBound = defaultWeight * WEIGHT_BOUNDS.max;
    return Math.max(minBound, Math.min(maxBound, currentWeight));
  },

  // Apply bounded adjustment
  applyBoundedAdjustment: (
    currentWeight: number,
    suggestedWeight: number,
    defaultWeight: number
  ): number => {
    const maxChange = defaultWeight * WEIGHT_BOUNDS.adjustmentStep;
    const change = suggestedWeight - currentWeight;
    const boundedChange = Math.max(-maxChange, Math.min(maxChange, change));
    const newWeight = currentWeight + boundedChange;
    return WEIGHT_BOUNDS.validateWeight(newWeight, defaultWeight);
  },
};

/**
 * Apply weight bounds during calibration updates
 */
export function applyWeightBounds(
  newWeights: Record<string, number>,
  defaultWeights: Record<string, number>
): Record<string, number> {
  const boundedWeights: Record<string, number> = {};

  for (const [key, value] of Object.entries(newWeights)) {
    const defaultValue = defaultWeights[key] || 0.2;
    boundedWeights[key] = WEIGHT_BOUNDS.validateWeight(value, defaultValue);
  }

  // Normalize to sum to 1.0
  const total = Object.values(boundedWeights).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(boundedWeights)) {
    boundedWeights[key] /= total;
  }

  return boundedWeights;
}
```

---

## Correlation Analysis

### Analyze Calibration Data

```typescript
/**
 * Analyze outcomes to suggest calibration adjustments
 */
export function analyzeCalibrationData(
  outcomes: ScoringOutcome[]
): CalibrationAnalysis {
  if (outcomes.length < 20) {
    return {
      sampleSize: outcomes.length,
      sufficient: false,
      message: 'Insufficient data for calibration (need 20+ outcomes)',
      recommendations: [],
    };
  }

  const recommendations: CalibrationRecommendation[] = [];

  // Analyze correlation between scores and outcomes
  const scoreOutcomeCorrelation = calculateScoreOutcomeCorrelation(outcomes);

  // Check if grades are predictive
  const gradeAccuracy = calculateGradeAccuracy(outcomes);

  // Identify underperforming categories
  for (const [category, correlation] of Object.entries(scoreOutcomeCorrelation.byCategory)) {
    if (correlation < 0.3) {
      recommendations.push({
        type: 'weight_reduction',
        target: category,
        currentWeight: DEFAULT_CALIBRATION.categoryWeights[category],
        suggestedWeight: DEFAULT_CALIBRATION.categoryWeights[category] * 0.8,
        reason: `Low correlation (${(correlation * 100).toFixed(0)}%) between ${category} score and outcomes`,
        confidence: 0.7,
      });
    } else if (correlation > 0.6) {
      recommendations.push({
        type: 'weight_increase',
        target: category,
        currentWeight: DEFAULT_CALIBRATION.categoryWeights[category],
        suggestedWeight: Math.min(0.30, DEFAULT_CALIBRATION.categoryWeights[category] * 1.2),
        reason: `High correlation (${(correlation * 100).toFixed(0)}%) between ${category} score and outcomes`,
        confidence: 0.8,
      });
    }
  }

  // Check grade thresholds
  if (gradeAccuracy.gradeAPrecision < 0.7) {
    recommendations.push({
      type: 'threshold_adjustment',
      target: 'grade_A',
      currentWeight: 80,
      suggestedWeight: 85,
      reason: `Grade A precision is ${(gradeAccuracy.gradeAPrecision * 100).toFixed(0)}% - consider raising threshold`,
      confidence: 0.6,
    });
  }

  return {
    sampleSize: outcomes.length,
    sufficient: true,
    message: `Analysis based on ${outcomes.length} outcomes`,
    scoreCorrelation: scoreOutcomeCorrelation.overall,
    gradeAccuracy,
    recommendations,
  };
}

interface CalibrationAnalysis {
  sampleSize: number;
  sufficient: boolean;
  message: string;
  scoreCorrelation?: number;
  gradeAccuracy?: GradeAccuracy;
  recommendations: CalibrationRecommendation[];
}

interface CalibrationRecommendation {
  type: 'weight_increase' | 'weight_reduction' | 'threshold_adjustment';
  target: string;
  currentWeight: number;
  suggestedWeight: number;
  reason: string;
  confidence: number;
}

interface GradeAccuracy {
  gradeAPrecision: number;  // % of A grades that had good outcomes
  gradeFRecall: number;     // % of bad outcomes that were graded F
  overallAccuracy: number;
}
```

### Score-Outcome Correlation Calculator

```typescript
function calculateScoreOutcomeCorrelation(
  outcomes: ScoringOutcome[]
): { overall: number; byCategory: Record<string, number> } {
  // Simplified correlation calculation
  // In production, use proper statistical correlation

  const outcomeScoreMap: Record<string, number> = {
    excellent: 5,
    good: 4,
    neutral: 3,
    poor: 2,
    failed: 1,
  };

  const overallScores = outcomes.map(o => o.totalScore);
  const outcomeValues = outcomes.map(o => outcomeScoreMap[o.outcomeScore]);

  const overall = pearsonCorrelation(overallScores, outcomeValues);

  const byCategory: Record<string, number> = {};
  for (const category of ['location', 'risk', 'financial', 'market', 'profit']) {
    const categoryScores = outcomes.map(o => o.categoryScores[category as keyof typeof o.categoryScores]);
    byCategory[category] = pearsonCorrelation(categoryScores, outcomeValues);
  }

  return { overall, byCategory };
}
```

### Grade Accuracy Calculator

```typescript
function calculateGradeAccuracy(outcomes: ScoringOutcome[]): GradeAccuracy {
  const gradeAOutcomes = outcomes.filter(o => o.grade === 'A');
  const gradeAGood = gradeAOutcomes.filter(o =>
    o.outcomeScore === 'excellent' || o.outcomeScore === 'good'
  );

  const badOutcomes = outcomes.filter(o =>
    o.outcomeScore === 'poor' || o.outcomeScore === 'failed'
  );
  const badOutcomesGradedF = badOutcomes.filter(o => o.grade === 'F');

  const correctGrades = outcomes.filter(o => {
    if (o.grade === 'A' || o.grade === 'B') {
      return o.outcomeScore === 'excellent' || o.outcomeScore === 'good';
    }
    if (o.grade === 'D' || o.grade === 'F') {
      return o.outcomeScore === 'poor' || o.outcomeScore === 'failed';
    }
    return o.outcomeScore === 'neutral';
  });

  return {
    gradeAPrecision: gradeAOutcomes.length > 0
      ? gradeAGood.length / gradeAOutcomes.length
      : 0,
    gradeFRecall: badOutcomes.length > 0
      ? badOutcomesGradedF.length / badOutcomes.length
      : 0,
    overallAccuracy: outcomes.length > 0
      ? correctGrades.length / outcomes.length
      : 0,
  };
}
```

### Pearson Correlation Implementation

```typescript
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  return denominator === 0 ? 0 : numerator / denominator;
}
```

---

## Score Adjustment Based on Historical Outcomes

### Apply Calibration to Scoring

```typescript
/**
 * Apply calibration config to scoring
 */
export function applyCalibration(
  config: CalibrationConfig,
  categoryScores: Record<string, CategoryScore>
): number {
  let totalScore = 0;

  for (const [category, categoryScore] of Object.entries(categoryScores)) {
    const weight = config.categoryWeights[category] || 0.2;
    totalScore += categoryScore.score * (weight / 0.2); // Normalize to base weight
  }

  return Math.round(totalScore * 10) / 10;
}
```

### Update Calibration from Outcomes

```typescript
/**
 * Update calibration weights based on outcome analysis
 */
export function updateCalibrationFromOutcomes(
  currentConfig: CalibrationConfig,
  analysis: CalibrationAnalysis,
  autoApply: boolean = false
): CalibrationConfig {
  if (!analysis.sufficient || analysis.recommendations.length === 0) {
    return currentConfig;
  }

  const newConfig = { ...currentConfig };
  const appliedChanges: string[] = [];

  for (const rec of analysis.recommendations) {
    // Only apply high-confidence recommendations automatically
    if (autoApply && rec.confidence >= 0.7) {
      if (rec.type === 'weight_increase' || rec.type === 'weight_reduction') {
        newConfig.categoryWeights[rec.target] = rec.suggestedWeight;
        appliedChanges.push(`${rec.target}: ${rec.currentWeight} -> ${rec.suggestedWeight}`);
      }
    }
  }

  // Normalize weights to sum to 1.0
  const totalWeight = Object.values(newConfig.categoryWeights).reduce((a, b) => a + b, 0);
  for (const category of Object.keys(newConfig.categoryWeights)) {
    newConfig.categoryWeights[category] /= totalWeight;
  }

  newConfig.version = incrementVersion(currentConfig.version);
  newConfig.lastUpdated = new Date();

  return newConfig;
}

function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number);
  parts[2]++; // Increment patch version
  return parts.join('.');
}
```

---

## Database Schema for Calibration

```sql
-- Calibration outcomes tracking
CREATE TABLE IF NOT EXISTS scoring_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),

  -- Original scoring
  scored_at TIMESTAMPTZ NOT NULL,
  total_score DECIMAL(5,2) NOT NULL,
  grade VARCHAR(2) NOT NULL,
  confidence_level DECIMAL(3,2) NOT NULL,
  category_scores JSONB NOT NULL,

  -- Actual outcome
  was_acquired BOOLEAN NOT NULL DEFAULT FALSE,
  acquisition_price DECIMAL(12,2),
  actual_roi DECIMAL(8,4),
  holding_period_months INTEGER,
  exit_strategy VARCHAR(20),

  -- Outcome assessment
  outcome_score VARCHAR(20) NOT NULL,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calibration configuration history
CREATE TABLE IF NOT EXISTS calibration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL UNIQUE,
  category_weights JSONB NOT NULL,
  component_weights JSONB NOT NULL,
  threshold_adjustments JSONB,
  is_active BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Calibration analysis results
CREATE TABLE IF NOT EXISTS calibration_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_size INTEGER NOT NULL,
  score_correlation DECIMAL(4,3),
  grade_accuracy JSONB,
  recommendations JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  applied_to_config_version VARCHAR(20)
);

-- Indexes
CREATE INDEX idx_scoring_outcomes_property ON scoring_outcomes(property_id);
CREATE INDEX idx_scoring_outcomes_grade ON scoring_outcomes(grade);
CREATE INDEX idx_scoring_outcomes_outcome ON scoring_outcomes(outcome_score);
CREATE INDEX idx_calibration_configs_active ON calibration_configs(is_active) WHERE is_active = true;
```

---

## API Endpoints for Calibration

### Record Outcome

```typescript
// POST /api/calibration/outcomes
export async function POST(request: Request) {
  const body = await request.json();

  const outcome: ScoringOutcome = {
    propertyId: body.propertyId,
    scoredAt: new Date(body.scoredAt),
    totalScore: body.totalScore,
    grade: body.grade,
    confidenceLevel: body.confidenceLevel,
    categoryScores: body.categoryScores,
    wasAcquired: body.wasAcquired,
    acquisitionPrice: body.acquisitionPrice,
    actualROI: body.actualROI,
    holdingPeriodMonths: body.holdingPeriodMonths,
    exitStrategy: body.exitStrategy,
    outcomeScore: body.outcomeScore,
    notes: body.notes,
  };

  // Store in database
  const { data, error } = await supabase
    .from('scoring_outcomes')
    .insert(outcome);

  if (error) throw error;

  return Response.json({ success: true, data });
}
```

### Run Calibration Analysis

```typescript
// POST /api/calibration/analyze
export async function POST(request: Request) {
  // Fetch all outcomes
  const { data: outcomes, error } = await supabase
    .from('scoring_outcomes')
    .select('*')
    .order('scored_at', { ascending: false });

  if (error) throw error;

  // Run analysis
  const analysis = analyzeCalibrationData(outcomes);

  // Store analysis
  await supabase.from('calibration_analyses').insert({
    sample_size: analysis.sampleSize,
    score_correlation: analysis.scoreCorrelation,
    grade_accuracy: analysis.gradeAccuracy,
    recommendations: analysis.recommendations,
  });

  return Response.json(analysis);
}
```

### Get Current Calibration

```typescript
// GET /api/calibration/config
export async function GET() {
  const { data, error } = await supabase
    .from('calibration_configs')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error || !data) {
    // Return default config
    return Response.json(DEFAULT_CALIBRATION);
  }

  return Response.json(data);
}
```

---

## UI Components

### Edge Case Warning Display

```tsx
// components/scoring/EdgeCaseWarnings.tsx
interface EdgeCaseWarningsProps {
  result: EdgeCaseResult;
}

export function EdgeCaseWarnings({ result }: EdgeCaseWarningsProps) {
  if (!result.isEdgeCase) return null;

  const severityColors = {
    critical: 'bg-red-100 border-red-500 text-red-700',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
    info: 'bg-blue-100 border-blue-500 text-blue-700',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4" />
        Edge Case Detected: {result.handling.replace(/_/g, ' ')}
      </div>

      {result.warnings.map((warning, i) => (
        <div
          key={i}
          className={`p-3 rounded border-l-4 ${severityColors[warning.severity]}`}
        >
          <div className="font-medium">{warning.message}</div>
          <div className="text-sm mt-1">{warning.recommendation}</div>
        </div>
      ))}
    </div>
  );
}
```

### Calibration Dashboard

```tsx
// components/scoring/CalibrationDashboard.tsx
export function CalibrationDashboard() {
  const { data: analysis } = useQuery({
    queryKey: ['calibration-analysis'],
    queryFn: fetchCalibrationAnalysis,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scoring Calibration</CardTitle>
          <CardDescription>
            Tune scoring weights based on historical outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysis?.sufficient ? (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <MetricCard
                  label="Sample Size"
                  value={analysis.sampleSize}
                />
                <MetricCard
                  label="Score Correlation"
                  value={`${(analysis.scoreCorrelation * 100).toFixed(0)}%`}
                />
                <MetricCard
                  label="Grade Accuracy"
                  value={`${(analysis.gradeAccuracy.overallAccuracy * 100).toFixed(0)}%`}
                />
              </div>

              <RecommendationsList recommendations={analysis.recommendations} />
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {analysis?.message || 'Loading calibration data...'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Testing

### Edge Case Detection Tests

```typescript
describe('Edge Case Detection', () => {
  it('detects extremely low value properties', () => {
    const property = { totalDue: 1000 };
    const result = handleEdgeCases(property, {});

    expect(result.isEdgeCase).toBe(true);
    expect(result.edgeCaseType).toBe('extremely_low_value');
    expect(result.handling).toBe('manual_review_required');
  });

  it('detects vacant land', () => {
    const property = { buildingSqft: 0, lotSizeSqft: 10000 };
    const result = handleEdgeCases(property, {});

    expect(result.isEdgeCase).toBe(true);
    expect(result.edgeCaseType).toBe('no_structure');
    expect(result.handling).toBe('specialized_analysis');
  });

  it('handles multiple edge cases', () => {
    const property = {
      totalDue: 2000,
      yearBuilt: 1900,
      lotSizeSqft: 500,
    };
    const result = handleEdgeCases(property, {});

    expect(result.warnings.length).toBeGreaterThan(2);
    expect(result.handling).toBe('manual_review_required');
  });
});
```

### Calibration Tests

```typescript
describe('Calibration Analysis', () => {
  it('requires minimum sample size', () => {
    const outcomes = generateOutcomes(10);
    const analysis = analyzeCalibrationData(outcomes);

    expect(analysis.sufficient).toBe(false);
  });

  it('calculates correlations correctly', () => {
    const outcomes = generateOutcomes(50);
    const analysis = analyzeCalibrationData(outcomes);

    expect(analysis.scoreCorrelation).toBeDefined();
    expect(analysis.scoreCorrelation).toBeGreaterThanOrEqual(-1);
    expect(analysis.scoreCorrelation).toBeLessThanOrEqual(1);
  });

  it('generates weight recommendations', () => {
    const outcomes = generateSkewedOutcomes(50, 'location');
    const analysis = analyzeCalibrationData(outcomes);

    expect(analysis.recommendations.length).toBeGreaterThan(0);
  });
});
```

---

## Implementation Checklist

### Core Edge Case Detection
- [ ] Implement edge case detection function
- [ ] Create edge case handling strategies
- [ ] Build specialized vacant land scoring

### Tax Deed-Specific Edge Cases
- [ ] Implement landlocked property detection
- [ ] Implement no_road_access detection from visual validation
- [ ] Implement title_cloud detection from title research
- [ ] Implement irs_lien detection
- [ ] Implement hoa_super_lien detection
- [ ] Implement environmental_contamination detection
- [ ] Implement wetlands detection
- [ ] Create EDGE_CASE_DEFINITIONS constant with all multipliers

### Compound Edge Case Detection
- [ ] Implement detectCompoundEdgeCases() function
- [ ] Define all compound edge case combinations (likely_tear_down, inaccessible_land, etc.)
- [ ] Implement applyCompoundEdgeCaseAdjustments()
- [ ] Implement handleEdgeCasesWithCompounds() enhanced handler
- [ ] Add handling severity comparison logic

### Confidence Integration
- [ ] Implement adjustConfidenceForEdgeCases()
- [ ] Implement interpretConfidenceWithEdgeCases()
- [ ] Create ConfidenceWithEdgeCases UI component
- [ ] Add tax deed-specific confidence penalties

### Calibration Framework
- [ ] Implement WEIGHT_BOUNDS constant
- [ ] Implement applyWeightBounds() function
- [ ] Implement outcome tracking database schema
- [ ] Create calibration analysis functions
- [ ] Build Pearson correlation calculator
- [ ] Implement grade accuracy metrics
- [ ] Create calibration config management
- [ ] Build API endpoints for calibration

### UI Components
- [ ] Create EdgeCaseWarnings UI component
- [ ] Build CalibrationDashboard component
- [ ] Create compound edge case warning display

### Testing
- [ ] Write unit tests for edge cases
- [ ] Write tests for tax deed-specific edge cases
- [ ] Write tests for compound edge case detection
- [ ] Write tests for confidence adjustments
- [ ] Write tests for weight bounds validation
- [ ] Write tests for calibration analysis

### Documentation
- [ ] Document calibration procedures
- [ ] Document tax deed-specific edge cases
- [ ] Document compound edge case combinations
- [ ] Set up outcome recording workflow

---

## Next Steps

After completing Phase 6D:
1. **Phase 6E**: Implement UI components for score display
2. **Phase 6F**: Create reporting and export functionality
3. **Phase 6G**: Build batch scoring capabilities
4. **Phase 6H**: Implement score comparison features
