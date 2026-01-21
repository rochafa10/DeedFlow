/**
 * Price Adjustments Module - Comparables Analysis
 *
 * This module calculates price adjustments to normalize comparable sales
 * to the subject property. It includes 17+ adjustment factors covering
 * physical characteristics, location, condition, and time-based adjustments.
 *
 * @module lib/analysis/comparables/priceAdjustments
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type { SubjectProperty, ComparableProperty } from './similarityScoring';

// ============================================
// Type Definitions
// ============================================

/**
 * Individual price adjustment entry
 */
export interface PriceAdjustment {
  /** Adjustment category */
  category: AdjustmentCategory;
  /** Specific adjustment factor */
  factor: string;
  /** Description of the adjustment */
  description: string;
  /** Subject property value */
  subjectValue: string | number | boolean | undefined;
  /** Comparable property value */
  comparableValue: string | number | boolean | undefined;
  /** Adjustment amount in dollars (positive = add to comp, negative = subtract) */
  adjustmentAmount: number;
  /** Adjustment as percentage of sale price */
  adjustmentPercent: number;
  /** Whether this adjustment was capped */
  wasCapped: boolean;
  /** Confidence in this adjustment (0-100) */
  confidence: number;
}

/**
 * Complete price adjustment result for a comparable
 */
export interface AdjustmentResult {
  /** Original sale price */
  originalPrice: number;
  /** Total gross adjustment amount */
  grossAdjustment: number;
  /** Total net adjustment amount */
  netAdjustment: number;
  /** Adjusted price */
  adjustedPrice: number;
  /** Individual adjustments */
  adjustments: PriceAdjustment[];
  /** Total adjustment as percent of sale price */
  totalAdjustmentPercent: number;
  /** Gross adjustment as percent of sale price */
  grossAdjustmentPercent: number;
  /** Whether the comparable should be flagged (>25% adjustment) */
  shouldFlag: boolean;
  /** Warning messages */
  warnings: string[];
  /** Overall confidence in adjusted price */
  confidence: number;
}

/**
 * Adjustment category types
 */
export type AdjustmentCategory =
  | 'physical'     // Size, rooms, features
  | 'location'     // Distance, view, location quality
  | 'condition'    // Property condition
  | 'time'         // Sale date/market appreciation
  | 'features'     // Amenities and upgrades
  | 'financing';   // Financing concessions

/**
 * Condition rating scale
 */
export type ConditionRating =
  | 'excellent'
  | 'good'
  | 'average'
  | 'fair'
  | 'poor';

/**
 * Location quality rating
 */
export type LocationQuality =
  | 'superior'
  | 'similar'
  | 'inferior';

/**
 * Basement type
 */
export type BasementType =
  | 'finished'
  | 'unfinished'
  | 'partial'
  | 'none';

/**
 * Extended property data for adjustments
 */
export interface ExtendedPropertyData extends SubjectProperty {
  /** Property condition rating */
  condition?: ConditionRating;
  /** Location quality relative to area */
  locationQuality?: LocationQuality;
  /** Basement type */
  basementType?: BasementType;
  /** Basement square footage */
  basementSqft?: number;
  /** Garage car capacity */
  garageCarCapacity?: number;
  /** Has central AC */
  hasCentralAC?: boolean;
  /** Has fireplace */
  hasFireplace?: boolean;
  /** Number of fireplaces */
  fireplaceCount?: number;
  /** Has hardwood floors */
  hasHardwoodFloors?: boolean;
  /** Kitchen updated */
  kitchenUpdated?: boolean;
  /** Bathrooms updated */
  bathroomsUpdated?: boolean;
  /** Deck/patio square footage */
  deckPatioSqft?: number;
  /** Waterfront property */
  isWaterfront?: boolean;
  /** Has view (mountain, water, city) */
  hasView?: boolean;
  /** View type */
  viewType?: string;
  /** Corner lot */
  isCornerLot?: boolean;
  /** Cul-de-sac location */
  isCulDeSac?: boolean;
  /** Distance to amenities (schools, shopping) */
  proximityScore?: number;
  /** Sale date for time adjustment */
  saleDate?: string;
}

// ============================================
// Adjustment Value Configuration
// ============================================

/**
 * Adjustment values configuration
 * These values represent typical market adjustments and can be customized
 */
export const ADJUSTMENT_VALUES = {
  // Physical Characteristics
  sqftDifference: {
    perSqft: 50,           // $50 per sqft difference
    maxAdjustment: 0.15,   // Max 15% of sale price
  },
  lotSizeDifference: {
    perAcre: 5000,         // $5,000 per acre difference
    maxAdjustment: 0.10,   // Max 10% of sale price
  },
  bedroomDifference: {
    perBedroom: 5000,      // $5,000 per bedroom
    maxAdjustment: 0.08,   // Max 8% of sale price
  },
  bathroomDifference: {
    perBathroom: 7500,     // $7,500 per full bathroom
    perHalfBath: 3500,     // $3,500 per half bathroom
    maxAdjustment: 0.06,   // Max 6% of sale price
  },
  ageDifference: {
    perYear: 500,          // $500 per year of age difference
    maxAdjustment: 0.10,   // Max 10% of sale price
  },

  // Condition Adjustments (as % of sale price)
  conditionAdjustment: {
    excellent: 0.10,       // +10% if subject is excellent
    good: 0.05,            // +5% if subject is good
    average: 0,            // No adjustment for average
    fair: -0.05,           // -5% if subject is fair
    poor: -0.15,           // -15% if subject is poor
  },

  // Location Quality
  locationQuality: {
    superior: 0.10,        // +10% if comp location is superior
    similar: 0,            // No adjustment if similar
    inferior: -0.10,       // -10% if comp location is inferior
  },

  // Garage/Parking
  garageAdjustment: {
    perCar: 5000,          // $5,000 per garage space
    maxAdjustment: 0.05,   // Max 5% of sale price
  },

  // Pool
  poolAdjustment: {
    hasPool: 15000,        // $15,000 for pool
    maxAdjustment: 0.05,   // Max 5% of sale price
  },

  // Basement
  basementAdjustment: {
    finished: 10000,       // $10,000 for finished basement
    unfinished: 5000,      // $5,000 for unfinished basement
    partial: 7500,         // $7,500 for partial
    none: 0,
    perSqft: 20,           // $20 per sqft of basement
    maxAdjustment: 0.08,   // Max 8% of sale price
  },

  // Time/Market Appreciation
  saleRecency: {
    monthlyAppreciation: 0.003, // 0.3% per month (3.6% annual)
    maxMonths: 12,         // Max 12 months adjustment
    maxAdjustment: 0.036,  // Max 3.6% total
  },

  // Additional Features
  additionalFeatures: {
    centralAC: 3000,       // $3,000 for central AC
    fireplace: 2500,       // $2,500 per fireplace
    hardwoodFloors: 4000,  // $4,000 for hardwood floors
    updatedKitchen: 10000, // $10,000 for updated kitchen
    updatedBathrooms: 7500,// $7,500 for updated bathrooms
    deck: 15,              // $15 per sqft of deck/patio
    maxAdjustment: 0.10,   // Max 10% for all features combined
  },

  // Premium Features
  premiumFeatures: {
    waterfront: 50000,     // $50,000 for waterfront
    viewPremium: 15000,    // $15,000 for view
    cornerLot: 5000,       // $5,000 for corner lot
    culDeSac: 3000,        // $3,000 for cul-de-sac
    maxAdjustment: 0.15,   // Max 15% for premium features
  },

  // Maximum total adjustment percentage
  maxTotalAdjustment: 0.25, // Flag comparables with >25% total adjustment
};

// ============================================
// Individual Adjustment Functions
// ============================================

/**
 * Calculate square footage adjustment
 */
export function calculateSqftAdjustment(
  subjectSqft: number | undefined,
  compSqft: number | undefined,
  salePrice: number
): PriceAdjustment | null {
  if (!subjectSqft || !compSqft) return null;

  const diff = subjectSqft - compSqft; // Positive if subject is larger
  let adjustment = diff * ADJUSTMENT_VALUES.sqftDifference.perSqft;

  // Apply cap
  const maxAdj = salePrice * ADJUSTMENT_VALUES.sqftDifference.maxAdjustment;
  const wasCapped = Math.abs(adjustment) > maxAdj;
  adjustment = Math.max(-maxAdj, Math.min(maxAdj, adjustment));

  return {
    category: 'physical',
    factor: 'Square Footage',
    description: `${diff > 0 ? 'Subject larger' : 'Comparable larger'} by ${Math.abs(diff)} sqft`,
    subjectValue: subjectSqft,
    comparableValue: compSqft,
    adjustmentAmount: adjustment,
    adjustmentPercent: (adjustment / salePrice) * 100,
    wasCapped,
    confidence: 90,
  };
}

/**
 * Calculate lot size adjustment
 */
export function calculateLotSizeAdjustment(
  subjectLot: number | undefined,
  compLot: number | undefined,
  salePrice: number
): PriceAdjustment | null {
  if (!subjectLot || !compLot) return null;

  const diffAcres = (subjectLot - compLot) / 43560; // Convert sqft to acres
  let adjustment = diffAcres * ADJUSTMENT_VALUES.lotSizeDifference.perAcre;

  const maxAdj = salePrice * ADJUSTMENT_VALUES.lotSizeDifference.maxAdjustment;
  const wasCapped = Math.abs(adjustment) > maxAdj;
  adjustment = Math.max(-maxAdj, Math.min(maxAdj, adjustment));

  return {
    category: 'physical',
    factor: 'Lot Size',
    description: `Lot size difference of ${Math.abs(diffAcres).toFixed(2)} acres`,
    subjectValue: subjectLot,
    comparableValue: compLot,
    adjustmentAmount: adjustment,
    adjustmentPercent: (adjustment / salePrice) * 100,
    wasCapped,
    confidence: 80,
  };
}

/**
 * Calculate bedroom count adjustment
 */
export function calculateBedroomAdjustment(
  subjectBeds: number | undefined,
  compBeds: number | undefined,
  salePrice: number
): PriceAdjustment | null {
  if (!subjectBeds || !compBeds) return null;
  if (subjectBeds === compBeds) return null;

  const diff = subjectBeds - compBeds;
  let adjustment = diff * ADJUSTMENT_VALUES.bedroomDifference.perBedroom;

  const maxAdj = salePrice * ADJUSTMENT_VALUES.bedroomDifference.maxAdjustment;
  const wasCapped = Math.abs(adjustment) > maxAdj;
  adjustment = Math.max(-maxAdj, Math.min(maxAdj, adjustment));

  return {
    category: 'physical',
    factor: 'Bedrooms',
    description: `${Math.abs(diff)} bedroom ${diff > 0 ? 'more' : 'fewer'} in subject`,
    subjectValue: subjectBeds,
    comparableValue: compBeds,
    adjustmentAmount: adjustment,
    adjustmentPercent: (adjustment / salePrice) * 100,
    wasCapped,
    confidence: 85,
  };
}

/**
 * Calculate bathroom count adjustment
 */
export function calculateBathroomAdjustment(
  subjectBaths: number | undefined,
  compBaths: number | undefined,
  salePrice: number
): PriceAdjustment | null {
  if (!subjectBaths || !compBaths) return null;
  if (subjectBaths === compBaths) return null;

  const diff = subjectBaths - compBaths;
  // Assume .5 represents a half bath
  const fullDiff = Math.floor(Math.abs(diff));
  const halfDiff = (Math.abs(diff) % 1) >= 0.5 ? 1 : 0;

  let adjustment =
    (diff > 0 ? 1 : -1) *
    (fullDiff * ADJUSTMENT_VALUES.bathroomDifference.perBathroom +
      halfDiff * ADJUSTMENT_VALUES.bathroomDifference.perHalfBath);

  const maxAdj = salePrice * ADJUSTMENT_VALUES.bathroomDifference.maxAdjustment;
  const wasCapped = Math.abs(adjustment) > maxAdj;
  adjustment = Math.max(-maxAdj, Math.min(maxAdj, adjustment));

  return {
    category: 'physical',
    factor: 'Bathrooms',
    description: `${Math.abs(diff).toFixed(1)} bathroom ${diff > 0 ? 'more' : 'fewer'} in subject`,
    subjectValue: subjectBaths,
    comparableValue: compBaths,
    adjustmentAmount: adjustment,
    adjustmentPercent: (adjustment / salePrice) * 100,
    wasCapped,
    confidence: 85,
  };
}

/**
 * Calculate age/year built adjustment
 */
export function calculateAgeAdjustment(
  subjectYear: number | undefined,
  compYear: number | undefined,
  salePrice: number
): PriceAdjustment | null {
  if (!subjectYear || !compYear) return null;
  if (subjectYear === compYear) return null;

  const diff = subjectYear - compYear; // Positive if subject is newer
  let adjustment = diff * ADJUSTMENT_VALUES.ageDifference.perYear;

  const maxAdj = salePrice * ADJUSTMENT_VALUES.ageDifference.maxAdjustment;
  const wasCapped = Math.abs(adjustment) > maxAdj;
  adjustment = Math.max(-maxAdj, Math.min(maxAdj, adjustment));

  return {
    category: 'physical',
    factor: 'Age',
    description: `Subject is ${Math.abs(diff)} years ${diff > 0 ? 'newer' : 'older'}`,
    subjectValue: subjectYear,
    comparableValue: compYear,
    adjustmentAmount: adjustment,
    adjustmentPercent: (adjustment / salePrice) * 100,
    wasCapped,
    confidence: 80,
  };
}

/**
 * Calculate condition adjustment
 */
export function calculateConditionAdjustment(
  subjectCondition: ConditionRating | undefined,
  compCondition: ConditionRating | undefined,
  salePrice: number
): PriceAdjustment | null {
  if (!subjectCondition || !compCondition) return null;
  if (subjectCondition === compCondition) return null;

  const conditionOrder: ConditionRating[] = ['poor', 'fair', 'average', 'good', 'excellent'];
  const subjectIndex = conditionOrder.indexOf(subjectCondition);
  const compIndex = conditionOrder.indexOf(compCondition);

  // If comparable is in better condition, we need to adjust up
  // If comparable is in worse condition, we need to adjust down
  const stepDiff = compIndex - subjectIndex;

  // Use the adjustment percentages
  const subjectPct = ADJUSTMENT_VALUES.conditionAdjustment[subjectCondition];
  const compPct = ADJUSTMENT_VALUES.conditionAdjustment[compCondition];
  const adjustmentPct = compPct - subjectPct;

  const adjustment = salePrice * adjustmentPct;

  return {
    category: 'condition',
    factor: 'Condition',
    description: `Subject: ${subjectCondition}, Comparable: ${compCondition}`,
    subjectValue: subjectCondition,
    comparableValue: compCondition,
    adjustmentAmount: adjustment,
    adjustmentPercent: adjustmentPct * 100,
    wasCapped: false,
    confidence: 70, // Condition is subjective
  };
}

/**
 * Calculate location quality adjustment
 */
export function calculateLocationAdjustment(
  subjectLocation: LocationQuality | undefined,
  compLocation: LocationQuality | undefined,
  salePrice: number
): PriceAdjustment | null {
  if (!compLocation || compLocation === 'similar') return null;

  const adjustmentPct = ADJUSTMENT_VALUES.locationQuality[compLocation];
  const adjustment = salePrice * adjustmentPct;

  return {
    category: 'location',
    factor: 'Location Quality',
    description: `Comparable location is ${compLocation} to subject`,
    subjectValue: 'reference',
    comparableValue: compLocation,
    adjustmentAmount: adjustment,
    adjustmentPercent: adjustmentPct * 100,
    wasCapped: false,
    confidence: 75,
  };
}

/**
 * Calculate garage adjustment
 */
export function calculateGarageAdjustment(
  subjectGarage: number | undefined,
  compGarage: number | undefined,
  salePrice: number
): PriceAdjustment | null {
  const subjectSpaces = subjectGarage || 0;
  const compSpaces = compGarage || 0;
  if (subjectSpaces === compSpaces) return null;

  const diff = subjectSpaces - compSpaces;
  let adjustment = diff * ADJUSTMENT_VALUES.garageAdjustment.perCar;

  const maxAdj = salePrice * ADJUSTMENT_VALUES.garageAdjustment.maxAdjustment;
  const wasCapped = Math.abs(adjustment) > maxAdj;
  adjustment = Math.max(-maxAdj, Math.min(maxAdj, adjustment));

  return {
    category: 'features',
    factor: 'Garage',
    description: `${Math.abs(diff)} garage space${Math.abs(diff) > 1 ? 's' : ''} ${diff > 0 ? 'more' : 'fewer'}`,
    subjectValue: subjectSpaces,
    comparableValue: compSpaces,
    adjustmentAmount: adjustment,
    adjustmentPercent: (adjustment / salePrice) * 100,
    wasCapped,
    confidence: 85,
  };
}

/**
 * Calculate pool adjustment
 */
export function calculatePoolAdjustment(
  subjectPool: boolean | undefined,
  compPool: boolean | undefined,
  salePrice: number
): PriceAdjustment | null {
  if (subjectPool === compPool) return null;
  if (subjectPool === undefined || compPool === undefined) return null;

  let adjustment = subjectPool
    ? ADJUSTMENT_VALUES.poolAdjustment.hasPool  // Subject has pool, comp doesn't
    : -ADJUSTMENT_VALUES.poolAdjustment.hasPool; // Comp has pool, subject doesn't

  const maxAdj = salePrice * ADJUSTMENT_VALUES.poolAdjustment.maxAdjustment;
  const wasCapped = Math.abs(adjustment) > maxAdj;
  adjustment = Math.max(-maxAdj, Math.min(maxAdj, adjustment));

  return {
    category: 'features',
    factor: 'Pool',
    description: subjectPool ? 'Subject has pool, comparable does not' : 'Comparable has pool, subject does not',
    subjectValue: subjectPool,
    comparableValue: compPool,
    adjustmentAmount: adjustment,
    adjustmentPercent: (adjustment / salePrice) * 100,
    wasCapped,
    confidence: 80,
  };
}

/**
 * Calculate basement adjustment
 */
export function calculateBasementAdjustment(
  subjectBasement: BasementType | undefined,
  compBasement: BasementType | undefined,
  subjectBasementSqft: number | undefined,
  compBasementSqft: number | undefined,
  salePrice: number
): PriceAdjustment | null {
  if (!subjectBasement && !compBasement) return null;

  const subjectType = subjectBasement || 'none';
  const compType = compBasement || 'none';

  if (subjectType === compType && subjectBasementSqft === compBasementSqft) return null;

  // Type adjustment
  const subjectTypeValue = ADJUSTMENT_VALUES.basementAdjustment[subjectType];
  const compTypeValue = ADJUSTMENT_VALUES.basementAdjustment[compType];
  let adjustment = subjectTypeValue - compTypeValue;

  // Size adjustment
  const sqftDiff = (subjectBasementSqft || 0) - (compBasementSqft || 0);
  adjustment += sqftDiff * ADJUSTMENT_VALUES.basementAdjustment.perSqft;

  const maxAdj = salePrice * ADJUSTMENT_VALUES.basementAdjustment.maxAdjustment;
  const wasCapped = Math.abs(adjustment) > maxAdj;
  adjustment = Math.max(-maxAdj, Math.min(maxAdj, adjustment));

  return {
    category: 'features',
    factor: 'Basement',
    description: `Subject: ${subjectType}, Comparable: ${compType}`,
    subjectValue: `${subjectType} (${subjectBasementSqft || 0} sqft)`,
    comparableValue: `${compType} (${compBasementSqft || 0} sqft)`,
    adjustmentAmount: adjustment,
    adjustmentPercent: (adjustment / salePrice) * 100,
    wasCapped,
    confidence: 80,
  };
}

/**
 * Calculate time/market adjustment based on sale date
 */
export function calculateTimeAdjustment(
  saleDate: string,
  salePrice: number
): PriceAdjustment | null {
  const sale = new Date(saleDate);
  const now = new Date();
  const monthsDiff = (now.getTime() - sale.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsDiff <= 0) return null;

  const effectiveMonths = Math.min(monthsDiff, ADJUSTMENT_VALUES.saleRecency.maxMonths);
  let adjustment = salePrice * ADJUSTMENT_VALUES.saleRecency.monthlyAppreciation * effectiveMonths;

  const maxAdj = salePrice * ADJUSTMENT_VALUES.saleRecency.maxAdjustment;
  const wasCapped = adjustment > maxAdj;
  adjustment = Math.min(maxAdj, adjustment);

  return {
    category: 'time',
    factor: 'Market Conditions',
    description: `Sale was ${Math.round(monthsDiff)} months ago`,
    subjectValue: 'Current',
    comparableValue: saleDate,
    adjustmentAmount: adjustment,
    adjustmentPercent: (adjustment / salePrice) * 100,
    wasCapped,
    confidence: 75,
  };
}

/**
 * Calculate additional features adjustment (AC, fireplace, hardwood, kitchen, bathrooms)
 */
export function calculateFeaturesAdjustment(
  subject: ExtendedPropertyData,
  comp: ExtendedPropertyData,
  salePrice: number
): PriceAdjustment | null {
  let totalAdjustment = 0;
  const differences: string[] = [];

  // Central AC
  if (subject.hasCentralAC !== undefined && comp.hasCentralAC !== undefined) {
    if (subject.hasCentralAC && !comp.hasCentralAC) {
      totalAdjustment += ADJUSTMENT_VALUES.additionalFeatures.centralAC;
      differences.push('Central AC');
    } else if (!subject.hasCentralAC && comp.hasCentralAC) {
      totalAdjustment -= ADJUSTMENT_VALUES.additionalFeatures.centralAC;
      differences.push('No Central AC');
    }
  }

  // Fireplace
  const subjectFP = subject.fireplaceCount || (subject.hasFireplace ? 1 : 0);
  const compFP = comp.fireplaceCount || (comp.hasFireplace ? 1 : 0);
  if (subjectFP !== compFP) {
    totalAdjustment += (subjectFP - compFP) * ADJUSTMENT_VALUES.additionalFeatures.fireplace;
    differences.push(`Fireplace (${subjectFP} vs ${compFP})`);
  }

  // Hardwood floors
  if (subject.hasHardwoodFloors !== undefined && comp.hasHardwoodFloors !== undefined) {
    if (subject.hasHardwoodFloors && !comp.hasHardwoodFloors) {
      totalAdjustment += ADJUSTMENT_VALUES.additionalFeatures.hardwoodFloors;
      differences.push('Hardwood floors');
    } else if (!subject.hasHardwoodFloors && comp.hasHardwoodFloors) {
      totalAdjustment -= ADJUSTMENT_VALUES.additionalFeatures.hardwoodFloors;
      differences.push('No hardwood floors');
    }
  }

  // Updated kitchen
  if (subject.kitchenUpdated !== undefined && comp.kitchenUpdated !== undefined) {
    if (subject.kitchenUpdated && !comp.kitchenUpdated) {
      totalAdjustment += ADJUSTMENT_VALUES.additionalFeatures.updatedKitchen;
      differences.push('Updated kitchen');
    } else if (!subject.kitchenUpdated && comp.kitchenUpdated) {
      totalAdjustment -= ADJUSTMENT_VALUES.additionalFeatures.updatedKitchen;
      differences.push('Kitchen not updated');
    }
  }

  // Updated bathrooms
  if (subject.bathroomsUpdated !== undefined && comp.bathroomsUpdated !== undefined) {
    if (subject.bathroomsUpdated && !comp.bathroomsUpdated) {
      totalAdjustment += ADJUSTMENT_VALUES.additionalFeatures.updatedBathrooms;
      differences.push('Updated bathrooms');
    } else if (!subject.bathroomsUpdated && comp.bathroomsUpdated) {
      totalAdjustment -= ADJUSTMENT_VALUES.additionalFeatures.updatedBathrooms;
      differences.push('Bathrooms not updated');
    }
  }

  // Deck/patio
  const deckDiff = (subject.deckPatioSqft || 0) - (comp.deckPatioSqft || 0);
  if (deckDiff !== 0) {
    totalAdjustment += deckDiff * ADJUSTMENT_VALUES.additionalFeatures.deck;
    differences.push(`Deck/patio (${deckDiff > 0 ? '+' : ''}${deckDiff} sqft)`);
  }

  if (differences.length === 0) return null;

  const maxAdj = salePrice * ADJUSTMENT_VALUES.additionalFeatures.maxAdjustment;
  const wasCapped = Math.abs(totalAdjustment) > maxAdj;
  totalAdjustment = Math.max(-maxAdj, Math.min(maxAdj, totalAdjustment));

  return {
    category: 'features',
    factor: 'Additional Features',
    description: differences.join(', '),
    subjectValue: 'Various',
    comparableValue: 'Various',
    adjustmentAmount: totalAdjustment,
    adjustmentPercent: (totalAdjustment / salePrice) * 100,
    wasCapped,
    confidence: 70,
  };
}

/**
 * Calculate premium features adjustment (waterfront, view, lot type)
 */
export function calculatePremiumFeaturesAdjustment(
  subject: ExtendedPropertyData,
  comp: ExtendedPropertyData,
  salePrice: number
): PriceAdjustment | null {
  let totalAdjustment = 0;
  const differences: string[] = [];

  // Waterfront
  if (subject.isWaterfront !== undefined && comp.isWaterfront !== undefined) {
    if (subject.isWaterfront && !comp.isWaterfront) {
      totalAdjustment += ADJUSTMENT_VALUES.premiumFeatures.waterfront;
      differences.push('Waterfront');
    } else if (!subject.isWaterfront && comp.isWaterfront) {
      totalAdjustment -= ADJUSTMENT_VALUES.premiumFeatures.waterfront;
      differences.push('Not waterfront');
    }
  }

  // View
  if (subject.hasView !== undefined && comp.hasView !== undefined) {
    if (subject.hasView && !comp.hasView) {
      totalAdjustment += ADJUSTMENT_VALUES.premiumFeatures.viewPremium;
      differences.push('Has view');
    } else if (!subject.hasView && comp.hasView) {
      totalAdjustment -= ADJUSTMENT_VALUES.premiumFeatures.viewPremium;
      differences.push('No view');
    }
  }

  // Corner lot
  if (subject.isCornerLot !== undefined && comp.isCornerLot !== undefined) {
    if (subject.isCornerLot && !comp.isCornerLot) {
      totalAdjustment += ADJUSTMENT_VALUES.premiumFeatures.cornerLot;
      differences.push('Corner lot');
    } else if (!subject.isCornerLot && comp.isCornerLot) {
      totalAdjustment -= ADJUSTMENT_VALUES.premiumFeatures.cornerLot;
      differences.push('Not corner lot');
    }
  }

  // Cul-de-sac
  if (subject.isCulDeSac !== undefined && comp.isCulDeSac !== undefined) {
    if (subject.isCulDeSac && !comp.isCulDeSac) {
      totalAdjustment += ADJUSTMENT_VALUES.premiumFeatures.culDeSac;
      differences.push('Cul-de-sac');
    } else if (!subject.isCulDeSac && comp.isCulDeSac) {
      totalAdjustment -= ADJUSTMENT_VALUES.premiumFeatures.culDeSac;
      differences.push('Not cul-de-sac');
    }
  }

  if (differences.length === 0) return null;

  const maxAdj = salePrice * ADJUSTMENT_VALUES.premiumFeatures.maxAdjustment;
  const wasCapped = Math.abs(totalAdjustment) > maxAdj;
  totalAdjustment = Math.max(-maxAdj, Math.min(maxAdj, totalAdjustment));

  return {
    category: 'location',
    factor: 'Premium Features',
    description: differences.join(', '),
    subjectValue: 'Various',
    comparableValue: 'Various',
    adjustmentAmount: totalAdjustment,
    adjustmentPercent: (totalAdjustment / salePrice) * 100,
    wasCapped,
    confidence: 75,
  };
}

// ============================================
// Main Adjustment Calculation
// ============================================

/**
 * Calculate all price adjustments for a comparable
 *
 * @param subject Subject property
 * @param comparable Comparable property
 * @returns Complete adjustment result
 */
export function calculateAllAdjustments(
  subject: ExtendedPropertyData,
  comparable: ExtendedPropertyData & { salePrice: number; saleDate: string }
): AdjustmentResult {
  const adjustments: PriceAdjustment[] = [];
  const warnings: string[] = [];
  const salePrice = comparable.salePrice;

  // Calculate individual adjustments
  const sqftAdj = calculateSqftAdjustment(subject.sqft, comparable.sqft, salePrice);
  if (sqftAdj) adjustments.push(sqftAdj);

  const lotAdj = calculateLotSizeAdjustment(subject.lotSizeSqft, comparable.lotSizeSqft, salePrice);
  if (lotAdj) adjustments.push(lotAdj);

  const bedsAdj = calculateBedroomAdjustment(subject.bedrooms, comparable.bedrooms, salePrice);
  if (bedsAdj) adjustments.push(bedsAdj);

  const bathsAdj = calculateBathroomAdjustment(subject.bathrooms, comparable.bathrooms, salePrice);
  if (bathsAdj) adjustments.push(bathsAdj);

  const ageAdj = calculateAgeAdjustment(subject.yearBuilt, comparable.yearBuilt, salePrice);
  if (ageAdj) adjustments.push(ageAdj);

  const condAdj = calculateConditionAdjustment(subject.condition, comparable.condition, salePrice);
  if (condAdj) adjustments.push(condAdj);

  const locAdj = calculateLocationAdjustment(subject.locationQuality, comparable.locationQuality, salePrice);
  if (locAdj) adjustments.push(locAdj);

  const garageAdj = calculateGarageAdjustment(
    subject.garageCarCapacity || (subject.garageSpaces),
    comparable.garageCarCapacity || (comparable.garageSpaces),
    salePrice
  );
  if (garageAdj) adjustments.push(garageAdj);

  const poolAdj = calculatePoolAdjustment(subject.hasPool, comparable.hasPool, salePrice);
  if (poolAdj) adjustments.push(poolAdj);

  const basementAdj = calculateBasementAdjustment(
    subject.basementType,
    comparable.basementType,
    subject.basementSqft,
    comparable.basementSqft,
    salePrice
  );
  if (basementAdj) adjustments.push(basementAdj);

  const timeAdj = calculateTimeAdjustment(comparable.saleDate, salePrice);
  if (timeAdj) adjustments.push(timeAdj);

  const featuresAdj = calculateFeaturesAdjustment(subject, comparable, salePrice);
  if (featuresAdj) adjustments.push(featuresAdj);

  const premiumAdj = calculatePremiumFeaturesAdjustment(subject, comparable, salePrice);
  if (premiumAdj) adjustments.push(premiumAdj);

  // Calculate totals
  const netAdjustment = adjustments.reduce((sum, adj) => sum + adj.adjustmentAmount, 0);
  const grossAdjustment = adjustments.reduce((sum, adj) => sum + Math.abs(adj.adjustmentAmount), 0);
  const adjustedPrice = salePrice + netAdjustment;

  const totalAdjustmentPercent = (netAdjustment / salePrice) * 100;
  const grossAdjustmentPercent = (grossAdjustment / salePrice) * 100;

  // Check if should flag
  const shouldFlag = grossAdjustmentPercent > ADJUSTMENT_VALUES.maxTotalAdjustment * 100;
  if (shouldFlag) {
    warnings.push(`High adjustment (${grossAdjustmentPercent.toFixed(1)}%) - comparable may not be reliable`);
  }

  // Check for capped adjustments
  const cappedAdjustments = adjustments.filter((a) => a.wasCapped);
  if (cappedAdjustments.length > 0) {
    warnings.push(`${cappedAdjustments.length} adjustment(s) were capped at maximum values`);
  }

  // Calculate overall confidence
  const avgConfidence =
    adjustments.length > 0
      ? adjustments.reduce((sum, adj) => sum + adj.confidence, 0) / adjustments.length
      : 50;
  const confidence = Math.round(avgConfidence * (1 - grossAdjustmentPercent / 100));

  return {
    originalPrice: salePrice,
    grossAdjustment,
    netAdjustment,
    adjustedPrice,
    adjustments,
    totalAdjustmentPercent,
    grossAdjustmentPercent,
    shouldFlag,
    warnings,
    confidence: Math.max(0, Math.min(100, confidence)),
  };
}

/**
 * Get adjustment summary for display
 */
export function getAdjustmentSummary(result: AdjustmentResult): string {
  const direction = result.netAdjustment >= 0 ? '+' : '';
  return `$${result.originalPrice.toLocaleString()} ${direction}$${result.netAdjustment.toLocaleString()} = $${result.adjustedPrice.toLocaleString()}`;
}
