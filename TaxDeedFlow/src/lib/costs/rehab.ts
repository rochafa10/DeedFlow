/**
 * Cost Estimation Engine - Rehab Cost Calculator
 *
 * Calculates renovation/rehabilitation costs based on property characteristics,
 * condition assessment, and regional labor/material cost multipliers.
 *
 * Methodology:
 * 1. Determine base cost per sqft based on rehab scope
 * 2. Apply condition multiplier (better condition = lower costs)
 * 3. Apply age multiplier (older = higher costs)
 * 4. Apply regional labor/material multipliers
 * 5. Calculate itemized breakdown by category
 * 6. Add contingency (10-20% based on scope)
 *
 * @module lib/costs/rehab
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type {
  RehabBreakdown,
  ExteriorCosts,
  InteriorCosts,
  StructuralCosts,
  PropertyCondition,
  RehabScope,
  PropertyCostData,
  RegridCostData,
  CostConfidence,
} from '@/types/costs';

import {
  getRegionalMultiplier,
  getRehabCostPerSqft,
  getConditionMultiplier,
  getAgeMultiplier,
} from './constants';

// ============================================
// Rehab Scope Allocation Percentages
// ============================================

/**
 * Allocation percentages for distributing total rehab costs
 * by category based on rehab scope
 *
 * These percentages represent typical distribution of costs
 * for each renovation scope level
 */
const REHAB_ALLOCATIONS: Record<RehabScope, {
  exterior: number;
  interior: number;
  structural: number;
  permits: number;
}> = {
  cosmetic: {
    exterior: 0.10,    // Minor touch-ups
    interior: 0.85,    // Paint, carpet, fixtures
    structural: 0.00,  // No structural work
    permits: 0.05,     // Minimal permits
  },
  light: {
    exterior: 0.15,    // Some exterior repairs
    interior: 0.75,    // Paint, flooring, minor updates
    structural: 0.02,  // Minor repairs
    permits: 0.08,     // Basic permits
  },
  moderate: {
    exterior: 0.20,    // Significant exterior work
    interior: 0.60,    // Kitchen/bath updates
    structural: 0.08,  // Some structural repairs
    permits: 0.12,     // Multiple permits
  },
  heavy: {
    exterior: 0.25,    // Major exterior renovation
    interior: 0.48,    // Full kitchen/bath remodel
    structural: 0.15,  // Systems updates
    permits: 0.12,     // Comprehensive permits
  },
  gut: {
    exterior: 0.22,    // Complete exterior renovation
    interior: 0.40,    // Complete interior renovation
    structural: 0.25,  // Major structural work
    permits: 0.13,     // Full permit package
  },
};

/**
 * Interior category breakdown within interior allocation
 */
const INTERIOR_BREAKDOWN: Record<RehabScope, {
  flooring: number;
  paint: number;
  kitchen: number;
  bathrooms: number;
  electrical: number;
  plumbing: number;
  hvac: number;
  fixtures: number;
}> = {
  cosmetic: {
    flooring: 0.35,
    paint: 0.40,
    kitchen: 0.05,
    bathrooms: 0.05,
    electrical: 0.02,
    plumbing: 0.02,
    hvac: 0.01,
    fixtures: 0.10,
  },
  light: {
    flooring: 0.30,
    paint: 0.25,
    kitchen: 0.12,
    bathrooms: 0.10,
    electrical: 0.05,
    plumbing: 0.05,
    hvac: 0.03,
    fixtures: 0.10,
  },
  moderate: {
    flooring: 0.20,
    paint: 0.15,
    kitchen: 0.25,
    bathrooms: 0.18,
    electrical: 0.08,
    plumbing: 0.07,
    hvac: 0.02,
    fixtures: 0.05,
  },
  heavy: {
    flooring: 0.15,
    paint: 0.10,
    kitchen: 0.22,
    bathrooms: 0.18,
    electrical: 0.15,
    plumbing: 0.10,
    hvac: 0.05,
    fixtures: 0.05,
  },
  gut: {
    flooring: 0.12,
    paint: 0.08,
    kitchen: 0.20,
    bathrooms: 0.15,
    electrical: 0.18,
    plumbing: 0.12,
    hvac: 0.10,
    fixtures: 0.05,
  },
};

/**
 * Exterior category breakdown within exterior allocation
 */
const EXTERIOR_BREAKDOWN: Record<RehabScope, {
  roof: number;
  siding: number;
  windows: number;
  doors: number;
  landscaping: number;
  hardscape: number;
}> = {
  cosmetic: {
    roof: 0.00,
    siding: 0.10,
    windows: 0.00,
    doors: 0.10,
    landscaping: 0.70,
    hardscape: 0.10,
  },
  light: {
    roof: 0.05,
    siding: 0.20,
    windows: 0.10,
    doors: 0.15,
    landscaping: 0.35,
    hardscape: 0.15,
  },
  moderate: {
    roof: 0.25,
    siding: 0.25,
    windows: 0.20,
    doors: 0.10,
    landscaping: 0.12,
    hardscape: 0.08,
  },
  heavy: {
    roof: 0.35,
    siding: 0.25,
    windows: 0.20,
    doors: 0.08,
    landscaping: 0.07,
    hardscape: 0.05,
  },
  gut: {
    roof: 0.35,
    siding: 0.28,
    windows: 0.22,
    doors: 0.08,
    landscaping: 0.04,
    hardscape: 0.03,
  },
};

// ============================================
// Exterior Cost Calculator
// ============================================

/**
 * Calculate exterior renovation cost breakdown
 *
 * @param totalExterior - Total exterior budget
 * @param scope - Rehab scope level
 * @returns Itemized exterior costs
 */
export function estimateExteriorCosts(
  totalExterior: number,
  scope: RehabScope
): ExteriorCosts {
  const breakdown = EXTERIOR_BREAKDOWN[scope];

  const roof = Math.round(totalExterior * breakdown.roof);
  const siding = Math.round(totalExterior * breakdown.siding);
  const windows = Math.round(totalExterior * breakdown.windows);
  const doors = Math.round(totalExterior * breakdown.doors);
  const landscaping = Math.round(totalExterior * breakdown.landscaping);
  const hardscape = Math.round(totalExterior * breakdown.hardscape);

  return {
    roof,
    siding,
    windows,
    doors,
    landscaping,
    hardscape,
    total: roof + siding + windows + doors + landscaping + hardscape,
  };
}

// ============================================
// Interior Cost Calculator
// ============================================

/**
 * Calculate interior renovation cost breakdown
 *
 * @param totalInterior - Total interior budget
 * @param scope - Rehab scope level
 * @param sqft - Property square footage (for reference)
 * @returns Itemized interior costs
 */
export function estimateInteriorCosts(
  totalInterior: number,
  scope: RehabScope,
  sqft?: number
): InteriorCosts {
  const breakdown = INTERIOR_BREAKDOWN[scope];

  const flooring = Math.round(totalInterior * breakdown.flooring);
  const paint = Math.round(totalInterior * breakdown.paint);
  const kitchen = Math.round(totalInterior * breakdown.kitchen);
  const bathrooms = Math.round(totalInterior * breakdown.bathrooms);
  const electrical = Math.round(totalInterior * breakdown.electrical);
  const plumbing = Math.round(totalInterior * breakdown.plumbing);
  const hvac = Math.round(totalInterior * breakdown.hvac);
  const fixtures = Math.round(totalInterior * breakdown.fixtures);

  return {
    flooring,
    paint,
    kitchen,
    bathrooms,
    electrical,
    plumbing,
    hvac,
    fixtures,
    total: flooring + paint + kitchen + bathrooms + electrical + plumbing + hvac + fixtures,
  };
}

// ============================================
// Structural Cost Calculator
// ============================================

/**
 * Calculate structural repair cost breakdown
 *
 * @param totalStructural - Total structural budget
 * @param scope - Rehab scope level
 * @returns Itemized structural costs
 */
export function estimateStructuralCosts(
  totalStructural: number,
  scope: RehabScope
): StructuralCosts {
  // Structural breakdown varies less by scope
  const breakdowns: Record<RehabScope, { foundation: number; framing: number; insulation: number }> = {
    cosmetic: { foundation: 0, framing: 0, insulation: 0 },
    light: { foundation: 0.30, framing: 0.40, insulation: 0.30 },
    moderate: { foundation: 0.35, framing: 0.35, insulation: 0.30 },
    heavy: { foundation: 0.40, framing: 0.35, insulation: 0.25 },
    gut: { foundation: 0.45, framing: 0.35, insulation: 0.20 },
  };

  const breakdown = breakdowns[scope];

  const foundation = Math.round(totalStructural * breakdown.foundation);
  const framing = Math.round(totalStructural * breakdown.framing);
  const insulation = Math.round(totalStructural * breakdown.insulation);

  return {
    foundation,
    framing,
    insulation,
    total: foundation + framing + insulation,
  };
}

// ============================================
// Regional Multiplier Application
// ============================================

/**
 * Apply regional multipliers to rehab costs
 *
 * @param baseCosts - Base rehab breakdown before regional adjustment
 * @param state - Two-letter state code
 * @param metro - Optional metro area name
 * @returns Adjusted rehab breakdown with multipliers applied
 */
export function applyRegionalMultipliers(
  baseCosts: Omit<RehabBreakdown, 'laborMultiplier' | 'materialMultiplier'>,
  state: string,
  metro?: string
): RehabBreakdown {
  const multipliers = getRegionalMultiplier(state, metro);

  // Labor is ~60% of rehab costs, materials ~40%
  // Combined multiplier = 0.6 * labor + 0.4 * materials
  const combinedMultiplier = (0.6 * multipliers.labor) + (0.4 * multipliers.materials);

  // Apply combined multiplier to all cost categories
  const adjustedExterior: ExteriorCosts = {
    roof: Math.round(baseCosts.exterior.roof * combinedMultiplier),
    siding: Math.round(baseCosts.exterior.siding * combinedMultiplier),
    windows: Math.round(baseCosts.exterior.windows * combinedMultiplier),
    doors: Math.round(baseCosts.exterior.doors * combinedMultiplier),
    landscaping: Math.round(baseCosts.exterior.landscaping * combinedMultiplier),
    hardscape: Math.round(baseCosts.exterior.hardscape * combinedMultiplier),
    total: 0, // Will calculate below
  };
  adjustedExterior.total = adjustedExterior.roof + adjustedExterior.siding +
    adjustedExterior.windows + adjustedExterior.doors +
    adjustedExterior.landscaping + adjustedExterior.hardscape;

  const adjustedInterior: InteriorCosts = {
    flooring: Math.round(baseCosts.interior.flooring * combinedMultiplier),
    paint: Math.round(baseCosts.interior.paint * combinedMultiplier),
    kitchen: Math.round(baseCosts.interior.kitchen * combinedMultiplier),
    bathrooms: Math.round(baseCosts.interior.bathrooms * combinedMultiplier),
    electrical: Math.round(baseCosts.interior.electrical * combinedMultiplier),
    plumbing: Math.round(baseCosts.interior.plumbing * combinedMultiplier),
    hvac: Math.round(baseCosts.interior.hvac * combinedMultiplier),
    fixtures: Math.round(baseCosts.interior.fixtures * combinedMultiplier),
    total: 0,
  };
  adjustedInterior.total = adjustedInterior.flooring + adjustedInterior.paint +
    adjustedInterior.kitchen + adjustedInterior.bathrooms +
    adjustedInterior.electrical + adjustedInterior.plumbing +
    adjustedInterior.hvac + adjustedInterior.fixtures;

  const adjustedStructural: StructuralCosts = {
    foundation: Math.round(baseCosts.structural.foundation * combinedMultiplier),
    framing: Math.round(baseCosts.structural.framing * combinedMultiplier),
    insulation: Math.round(baseCosts.structural.insulation * combinedMultiplier),
    total: 0,
  };
  adjustedStructural.total = adjustedStructural.foundation +
    adjustedStructural.framing + adjustedStructural.insulation;

  const adjustedPermits = Math.round(baseCosts.permits * multipliers.labor);

  const totalRehab = adjustedExterior.total + adjustedInterior.total +
    adjustedStructural.total + adjustedPermits;

  return {
    exterior: adjustedExterior,
    interior: adjustedInterior,
    structural: adjustedStructural,
    permits: adjustedPermits,
    laborMultiplier: multipliers.labor,
    materialMultiplier: multipliers.materials,
    totalRehab,
  };
}

// ============================================
// Confidence Calculation
// ============================================

/**
 * Determine confidence level based on available data
 *
 * @param property - Property data available
 * @param regridData - Optional Regrid data
 * @param condition - Condition assessment source
 * @returns Confidence level (low/medium/high)
 */
export function calculateRehabConfidence(
  property: PropertyCostData,
  regridData?: RegridCostData,
  condition?: PropertyCondition
): CostConfidence {
  let score = 0;

  // Square footage known (+30 points)
  if (property.sqft || regridData?.building_sqft) {
    score += 30;
  }

  // Year built known (+20 points)
  if (property.yearBuilt || regridData?.year_built) {
    score += 20;
  }

  // State known (+15 points)
  if (property.state) {
    score += 15;
  }

  // City/metro known (+10 points)
  if (property.city) {
    score += 10;
  }

  // Condition assessment provided (+25 points)
  if (condition) {
    score += 25;
  }

  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

// ============================================
// Main Rehab Cost Calculator
// ============================================

/**
 * Input parameters for rehab cost calculation
 */
export interface RehabCostInput {
  /** Property data */
  property: PropertyCostData;
  /** Optional Regrid-sourced data */
  regridData?: RegridCostData;
  /** Property condition assessment */
  condition?: PropertyCondition;
  /** Rehab scope level */
  scope?: RehabScope;
  /** Two-letter state code (overrides property.state) */
  state?: string;
  /** Metro area name (for regional adjustments) */
  metro?: string;
  /** Cost estimate tier ('low', 'mid', 'high') */
  estimate?: 'low' | 'mid' | 'high';
}

/**
 * Calculate complete rehab cost breakdown
 *
 * This function estimates rehabilitation costs based on property
 * characteristics, condition, and regional cost factors.
 *
 * @param input - Rehab cost calculation inputs
 * @returns Complete rehab cost breakdown with itemized categories
 *
 * @formula
 *   baseTotal = sqft * costPerSqft
 *   adjustedTotal = baseTotal * conditionMultiplier * ageMultiplier
 *   finalTotal = adjustedTotal * regionalMultiplier
 *
 * @example
 * const costs = calculateRehabCosts({
 *   property: { sqft: 1500, yearBuilt: 1970, state: 'PA', city: 'Pittsburgh' },
 *   condition: 'fair',
 *   scope: 'moderate',
 * });
 *
 * // Returns RehabBreakdown with all itemized costs
 */
export function calculateRehabCosts(input: RehabCostInput): RehabBreakdown {
  const {
    property,
    regridData,
    condition = 'fair',
    scope = 'moderate',
    state,
    metro,
    estimate = 'mid',
  } = input;

  // Determine property characteristics
  const sqft = regridData?.building_sqft || property.sqft || 1500;
  const yearBuilt = regridData?.year_built || property.yearBuilt || 1970;
  const propertyState = state || property.state || 'PA';
  const propertyMetro = metro || property.city;

  // Calculate property age
  const currentYear = new Date().getFullYear();
  const age = currentYear - yearBuilt;

  // Get base cost per sqft and multipliers
  const baseCostPerSqft = getRehabCostPerSqft(scope, estimate);
  const conditionMultiplier = getConditionMultiplier(condition);
  const ageMultiplier = getAgeMultiplier(age);

  // Calculate base total before regional adjustment
  const baseTotal = sqft * baseCostPerSqft * conditionMultiplier * ageMultiplier;

  // Get allocation percentages for this scope
  const allocations = REHAB_ALLOCATIONS[scope];

  // Calculate category totals (before regional adjustment)
  const exteriorTotal = baseTotal * allocations.exterior;
  const interiorTotal = baseTotal * allocations.interior;
  const structuralTotal = baseTotal * allocations.structural;
  const permitsTotal = baseTotal * allocations.permits;

  // Calculate itemized breakdowns
  const exterior = estimateExteriorCosts(exteriorTotal, scope);
  const interior = estimateInteriorCosts(interiorTotal, scope, sqft);
  const structural = estimateStructuralCosts(structuralTotal, scope);

  // Apply regional multipliers
  const baseCosts = {
    exterior,
    interior,
    structural,
    permits: permitsTotal,
    totalRehab: exterior.total + interior.total + structural.total + permitsTotal,
  };

  return applyRegionalMultipliers(baseCosts, propertyState, propertyMetro);
}

/**
 * Quick rehab cost estimate with minimal inputs
 *
 * @param sqft - Property square footage
 * @param scope - Rehab scope level
 * @param state - Two-letter state code
 * @returns Estimated total rehab cost
 *
 * @example
 * estimateRehabTotal(1500, 'moderate', 'PA'); // ~67500
 */
export function estimateRehabTotal(
  sqft: number,
  scope: RehabScope,
  state: string
): number {
  const costs = calculateRehabCosts({
    property: { sqft, state },
    scope,
    state,
  });

  return costs.totalRehab;
}

/**
 * Get rehab cost range (low to high) for a property
 *
 * @param sqft - Property square footage
 * @param scope - Rehab scope level
 * @param state - Two-letter state code
 * @returns Object with low, mid, and high estimates
 *
 * @example
 * getRehabCostRange(1500, 'moderate', 'PA');
 * // { low: 52500, mid: 67500, high: 87000 }
 */
export function getRehabCostRange(
  sqft: number,
  scope: RehabScope,
  state: string
): { low: number; mid: number; high: number } {
  return {
    low: calculateRehabCosts({
      property: { sqft, state },
      scope,
      estimate: 'low',
    }).totalRehab,
    mid: calculateRehabCosts({
      property: { sqft, state },
      scope,
      estimate: 'mid',
    }).totalRehab,
    high: calculateRehabCosts({
      property: { sqft, state },
      scope,
      estimate: 'high',
    }).totalRehab,
  };
}

/**
 * Calculate rehab cost per square foot with all adjustments
 *
 * @param scope - Rehab scope level
 * @param condition - Property condition
 * @param yearBuilt - Year property was built
 * @param state - Two-letter state code
 * @param metro - Optional metro area
 * @returns Adjusted cost per square foot
 */
export function getAdjustedCostPerSqft(
  scope: RehabScope,
  condition: PropertyCondition,
  yearBuilt: number,
  state: string,
  metro?: string
): number {
  const baseCost = getRehabCostPerSqft(scope, 'mid');
  const conditionMult = getConditionMultiplier(condition);
  const ageMult = getAgeMultiplier(new Date().getFullYear() - yearBuilt);
  const regional = getRegionalMultiplier(state, metro);
  const combinedRegional = (0.6 * regional.labor) + (0.4 * regional.materials);

  return Math.round(baseCost * conditionMult * ageMult * combinedRegional * 100) / 100;
}
