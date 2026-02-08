/**
 * LFB 9-Step Comparable Analysis Engine
 *
 * Implements professional appraisal-standard comp selection and valuation
 * based on the LFB Comps Guidelines 2025 (Jamil Damji methodology).
 *
 * 9 Steps: Comp Age, Location, Sqft, Year Built, Property Type,
 *          Lot Size, Bed/Bath, Garage/Pool, Market Conditions
 */

import type { RealtyComparable } from '@/lib/api/services/realty-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubjectProperty {
  building_sqft?: number;
  lot_sqft?: number;
  year_built?: number;
  beds?: number;
  baths?: number;
  property_type?: string;
  has_garage?: boolean;
  has_pool?: boolean;
  assessed_value?: number;
}

export interface CompAdjustment {
  type: string;
  description: string;
  amount: number;
}

export interface MatchDetails {
  sqftDiff: number | null;
  lotSqftDiff: number | null;
  yearBuiltDiff: number | null;
  bedDiff: number | null;
  bathDiff: number | null;
  typeMatch: boolean;
  daysAgo: number;
}

export interface ScoredComparable extends RealtyComparable {
  compScore: number;
  compGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  adjustedPrice: number;
  adjustments: CompAdjustment[];
  matchDetails: MatchDetails;
}

export interface RepairEstimate {
  cosmeticPerSqft: number;
  fullRehabPerSqft: number;
  cosmeticTotal: number;
  fullRehabTotal: number;
  sellingCosts: number;
}

export interface CompAnalysisResult {
  qualifiedComps: ScoredComparable[];
  extendedComps: ScoredComparable[];
  rejectedCount: number;
  arv: number | null;
  arvPerSqft: number | null;
  mao: number | null;
  maoConservative: number | null;
  maoAggressive: number | null;
  repairEstimate: RepairEstimate | null;
  confidenceLevel: 'high' | 'medium' | 'low';
  searchCriteria: {
    daysUsed: number;
    radiusUsed: number;
    filtersApplied: string[];
  };
}

// ---------------------------------------------------------------------------
// Constants (LFB Guidelines)
// ---------------------------------------------------------------------------

/** LFB Step 7 – mid-range adjustments for PA/MD/DE markets */
const ADJ_PER_BEDROOM = 15_000;
const ADJ_PER_FULL_BATH = 15_000;
const ADJ_PER_HALF_BATH = 7_500;

/** LFB Step 8 – moderate-climate garage/pool (PA) */
const ADJ_GARAGE = 10_000;
const ADJ_POOL = 10_000;

/** Repair cost estimates (LFB quick reference) */
const COSMETIC_REHAB_PER_SQFT = 35;
const FULL_REHAB_PER_SQFT = 55;
const SELLING_COST_PCT = 0.10;

/** Normalised property-type buckets */
const TYPE_GROUPS: Record<string, string> = {
  single_family: 'sfr',
  house: 'sfr',
  detached: 'sfr',
  mobile: 'mobile',
  manufactured: 'mobile',
  mobile_home: 'mobile',
  condo: 'condo',
  condominium: 'condo',
  townhome: 'townhome',
  townhouse: 'townhome',
  multi_family: 'multi',
  duplex: 'multi',
  triplex: 'multi',
  land: 'land',
  lot: 'land',
  vacant_land: 'land',
};

function normalizeType(raw?: string): string {
  if (!raw) return 'unknown';
  const key = raw.toLowerCase().replace(/[-\s]+/g, '_');
  return TYPE_GROUPS[key] ?? 'unknown';
}

// ---------------------------------------------------------------------------
// Scoring (100-point scale)
// ---------------------------------------------------------------------------

/**
 * Score a single comparable against the subject property.
 *
 * Points breakdown:
 *   Property Type  25
 *   Building Sqft  20
 *   Comp Age       15
 *   Lot Size       10
 *   Year Built     10
 *   Bedrooms        5
 *   Bathrooms       5
 *   (bonus)        10  – extra for being very close on multiple metrics
 */
export function scoreComparable(
  subject: SubjectProperty,
  comp: RealtyComparable,
): { score: number; grade: ScoredComparable['compGrade']; matchDetails: MatchDetails } {
  let score = 0;

  // --- Days since sale --------------------------------------------------
  const daysAgo = comp.sold_date
    ? Math.max(0, Math.floor((Date.now() - new Date(comp.sold_date).getTime()) / 86_400_000))
    : 9999;

  if (daysAgo <= 180) score += 15;
  else if (daysAgo <= 365) score += 10;
  else if (daysAgo <= 730) score += 5;

  // --- Property type ----------------------------------------------------
  const subjectType = normalizeType(subject.property_type);
  const compType = normalizeType(comp.description?.type);
  const typeMatch = subjectType !== 'unknown' && compType !== 'unknown' && subjectType === compType;

  if (typeMatch) {
    score += 25;
  } else if (subjectType === 'unknown' || compType === 'unknown') {
    score += 12; // unknown – give partial credit
  }

  // --- Building sqft ----------------------------------------------------
  const sqftDiff =
    subject.building_sqft && comp.description?.sqft
      ? comp.description.sqft - subject.building_sqft
      : null;

  if (sqftDiff !== null) {
    const absDiff = Math.abs(sqftDiff);
    if (absDiff <= 100) score += 20;
    else if (absDiff <= 250) score += 15;
    else if (absDiff <= 500) score += 10;
    else if (absDiff <= 1000) score += 5;
  } else {
    score += 8; // no data – partial
  }

  // --- Lot size ---------------------------------------------------------
  const lotSqftDiff =
    subject.lot_sqft && comp.description?.lot_sqft
      ? comp.description.lot_sqft - subject.lot_sqft
      : null;

  if (lotSqftDiff !== null) {
    const absDiff = Math.abs(lotSqftDiff);
    if (absDiff <= 2500) score += 10;
    else if (absDiff <= 5000) score += 7;
    else if (absDiff <= 10_000) score += 3;
  } else {
    score += 4; // partial
  }

  // --- Year built -------------------------------------------------------
  const yearBuiltDiff =
    subject.year_built && comp.description?.year_built
      ? comp.description.year_built - subject.year_built
      : null;

  if (yearBuiltDiff !== null) {
    const absDiff = Math.abs(yearBuiltDiff);
    if (absDiff <= 10) score += 10;
    else if (absDiff <= 20) score += 5;
    else if (absDiff <= 30) score += 2;
  } else {
    score += 4;
  }

  // --- Bedrooms ---------------------------------------------------------
  const bedDiff =
    subject.beds != null && comp.description?.beds != null
      ? comp.description.beds - subject.beds
      : null;

  if (bedDiff !== null) {
    const absDiff = Math.abs(bedDiff);
    if (absDiff === 0) score += 5;
    else if (absDiff === 1) score += 3;
    else if (absDiff === 2) score += 1;
  } else {
    score += 2;
  }

  // --- Bathrooms --------------------------------------------------------
  const bathDiff =
    subject.baths != null && comp.description?.baths != null
      ? comp.description.baths - subject.baths
      : null;

  if (bathDiff !== null) {
    const absDiff = Math.abs(bathDiff);
    if (absDiff === 0) score += 5;
    else if (absDiff <= 1) score += 3;
    else if (absDiff <= 2) score += 1;
  } else {
    score += 2;
  }

  // --- Bonus for very close match on multiple axes ----------------------
  const closeCount = [
    sqftDiff !== null && Math.abs(sqftDiff) <= 250,
    lotSqftDiff !== null && Math.abs(lotSqftDiff) <= 2500,
    yearBuiltDiff !== null && Math.abs(yearBuiltDiff) <= 10,
    bedDiff !== null && bedDiff === 0,
    bathDiff !== null && Math.abs(bathDiff) === 0,
  ].filter(Boolean).length;

  if (closeCount >= 4) score += 10;
  else if (closeCount >= 3) score += 5;

  // Clamp
  score = Math.min(100, Math.max(0, score));

  // Grade
  let grade: ScoredComparable['compGrade'];
  if (score >= 80) grade = 'A';
  else if (score >= 60) grade = 'B';
  else if (score >= 40) grade = 'C';
  else if (score >= 20) grade = 'D';
  else grade = 'F';

  return {
    score,
    grade,
    matchDetails: {
      sqftDiff,
      lotSqftDiff,
      yearBuiltDiff,
      bedDiff,
      bathDiff,
      typeMatch,
      daysAgo,
    },
  };
}

// ---------------------------------------------------------------------------
// Adjustments (LFB Steps 7-9)
// ---------------------------------------------------------------------------

export function calculateAdjustments(
  subject: SubjectProperty,
  comp: RealtyComparable,
): CompAdjustment[] {
  const adjustments: CompAdjustment[] = [];

  // Bedroom adjustment (Step 7)
  if (subject.beds != null && comp.description?.beds != null) {
    const diff = subject.beds - comp.description.beds;
    if (diff !== 0) {
      adjustments.push({
        type: 'bedroom',
        description: `${Math.abs(diff)} bedroom${Math.abs(diff) > 1 ? 's' : ''} ${diff > 0 ? '(subject has more)' : '(comp has more)'}`,
        amount: diff * ADJ_PER_BEDROOM,
      });
    }
  }

  // Bathroom adjustment (Step 7)
  if (subject.baths != null && comp.description?.baths != null) {
    const diff = subject.baths - comp.description.baths;
    if (Math.abs(diff) >= 1) {
      const fullBathDiff = Math.floor(diff);
      const halfBathDiff = diff - fullBathDiff; // fractional baths (0.5)
      let amount = fullBathDiff * ADJ_PER_FULL_BATH;
      if (Math.abs(halfBathDiff) >= 0.4) {
        amount += (halfBathDiff > 0 ? 1 : -1) * ADJ_PER_HALF_BATH;
      }
      if (amount !== 0) {
        adjustments.push({
          type: 'bathroom',
          description: `${Math.abs(diff)} bath${Math.abs(diff) > 1 ? 's' : ''} ${diff > 0 ? '(subject has more)' : '(comp has more)'}`,
          amount,
        });
      }
    }
  }

  // Square footage adjustment (price/sqft method)
  if (
    subject.building_sqft &&
    comp.description?.sqft &&
    comp.price?.sold_price
  ) {
    const diff = subject.building_sqft - comp.description.sqft;
    if (Math.abs(diff) > 50) {
      const pricePerSqft = comp.description.sqft > 0
        ? comp.price.sold_price / comp.description.sqft
        : 0;
      if (pricePerSqft > 0) {
        adjustments.push({
          type: 'sqft',
          description: `${Math.abs(diff)} sqft ${diff > 0 ? 'larger' : 'smaller'} @ $${Math.round(pricePerSqft)}/sqft`,
          amount: Math.round(diff * pricePerSqft),
        });
      }
    }
  }

  // Garage adjustment (Step 8 – PA moderate climate)
  if (subject.has_garage && comp.description?.garage === 0) {
    adjustments.push({
      type: 'garage',
      description: 'Subject has garage, comp does not',
      amount: ADJ_GARAGE,
    });
  } else if (!subject.has_garage && comp.description?.garage && comp.description.garage > 0) {
    adjustments.push({
      type: 'garage',
      description: 'Comp has garage, subject does not',
      amount: -ADJ_GARAGE,
    });
  }

  // Pool adjustment (Step 8)
  if (subject.has_pool && !comp.description?.sub_type?.toLowerCase().includes('pool')) {
    adjustments.push({
      type: 'pool',
      description: 'Subject has pool, comp does not',
      amount: ADJ_POOL,
    });
  }

  return adjustments;
}

/**
 * Apply adjustments to a comp's sold price to derive an adjusted price
 * relative to the subject property.
 */
function applyAdjustments(soldPrice: number, adjustments: CompAdjustment[]): number {
  const total = adjustments.reduce((sum, a) => sum + a.amount, 0);
  return Math.max(0, Math.round(soldPrice + total));
}

// ---------------------------------------------------------------------------
// ARV & MAO Calculations
// ---------------------------------------------------------------------------

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

export function calculateARV(
  qualifiedComps: ScoredComparable[],
  subject: SubjectProperty,
): { arv: number | null; arvPerSqft: number | null } {
  if (qualifiedComps.length === 0) return { arv: null, arvPerSqft: null };

  // Try price-per-sqft method first (LFB formula)
  const compsWithSqft = qualifiedComps.filter(
    (c) => c.description?.sqft && c.description.sqft > 0 && c.adjustedPrice > 0,
  );

  if (compsWithSqft.length >= 2 && subject.building_sqft && subject.building_sqft > 0) {
    const pricesPerSqft = compsWithSqft.map(
      (c) => c.adjustedPrice / c.description.sqft!,
    );
    const avgPricePerSqft = average(pricesPerSqft);
    const arv = Math.round(avgPricePerSqft * subject.building_sqft);
    return { arv, arvPerSqft: avgPricePerSqft };
  }

  // Fallback: median adjusted sold price
  const adjustedPrices = qualifiedComps
    .map((c) => c.adjustedPrice)
    .filter((p) => p > 0);

  if (adjustedPrices.length > 0) {
    const arv = median(adjustedPrices);
    return { arv, arvPerSqft: null };
  }

  return { arv: null, arvPerSqft: null };
}

export function calculateRepairEstimate(
  arv: number,
  subjectSqft?: number,
): RepairEstimate {
  const sqft = subjectSqft || 1200; // fallback estimate
  return {
    cosmeticPerSqft: COSMETIC_REHAB_PER_SQFT,
    fullRehabPerSqft: FULL_REHAB_PER_SQFT,
    cosmeticTotal: Math.round(sqft * COSMETIC_REHAB_PER_SQFT),
    fullRehabTotal: Math.round(sqft * FULL_REHAB_PER_SQFT),
    sellingCosts: Math.round(arv * SELLING_COST_PCT),
  };
}

export function calculateMAO(
  arv: number,
  repairs: RepairEstimate,
): { maoConservative: number; maoAggressive: number; mao: number } {
  // LFB: For tax deeds use 60-65% of ARV
  const maoConservative = Math.round(arv * 0.60 - repairs.cosmeticTotal - repairs.sellingCosts);
  const maoAggressive = Math.round(arv * 0.65 - repairs.cosmeticTotal - repairs.sellingCosts);
  const mao = Math.round((maoConservative + maoAggressive) / 2);
  return { maoConservative: Math.max(0, maoConservative), maoAggressive: Math.max(0, maoAggressive), mao: Math.max(0, mao) };
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export function analyzeComparables(
  subject: SubjectProperty,
  rawComps: RealtyComparable[],
  searchCriteria: { daysUsed: number; radiusUsed: number; filtersApplied: string[] },
): CompAnalysisResult {
  // Score & grade every comp
  const scored: ScoredComparable[] = rawComps
    .filter((c) => c.price?.sold_price && c.price.sold_price > 0)
    .map((comp) => {
      const { score, grade, matchDetails } = scoreComparable(subject, comp);
      const adjustments = calculateAdjustments(subject, comp);
      const adjustedPrice = applyAdjustments(comp.price.sold_price!, adjustments);

      return {
        ...comp,
        compScore: score,
        compGrade: grade,
        adjustedPrice,
        adjustments,
        matchDetails,
      };
    })
    .sort((a, b) => b.compScore - a.compScore);

  const qualifiedComps = scored.filter((c) => c.compGrade === 'A' || c.compGrade === 'B');
  const extendedComps = scored.filter((c) => c.compGrade === 'C');
  const rejectedCount = scored.filter(
    (c) => c.compGrade === 'D' || c.compGrade === 'F',
  ).length;

  // If no A/B comps, promote top C comps (rural markets)
  const compsForARV = qualifiedComps.length >= 2
    ? qualifiedComps
    : [...qualifiedComps, ...extendedComps].slice(0, 5);

  const { arv, arvPerSqft } = calculateARV(compsForARV, subject);

  let repairEstimate: RepairEstimate | null = null;
  let maoResult: { maoConservative: number; maoAggressive: number; mao: number } | null = null;

  if (arv && arv > 0) {
    repairEstimate = calculateRepairEstimate(arv, subject.building_sqft);
    maoResult = calculateMAO(arv, repairEstimate);
  }

  // Confidence level
  let confidenceLevel: CompAnalysisResult['confidenceLevel'] = 'low';
  if (qualifiedComps.length >= 5) confidenceLevel = 'high';
  else if (qualifiedComps.length >= 3) confidenceLevel = 'medium';
  else if (compsForARV.length >= 3) confidenceLevel = 'medium';

  return {
    qualifiedComps,
    extendedComps,
    rejectedCount,
    arv,
    arvPerSqft,
    mao: maoResult?.mao ?? null,
    maoConservative: maoResult?.maoConservative ?? null,
    maoAggressive: maoResult?.maoAggressive ?? null,
    repairEstimate,
    confidenceLevel,
    searchCriteria,
  };
}
