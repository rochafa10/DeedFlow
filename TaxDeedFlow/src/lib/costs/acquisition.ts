/**
 * Cost Estimation Engine - Acquisition Cost Calculator
 *
 * Calculates all costs associated with acquiring a property at auction,
 * including purchase price, buyer's premium, transfer taxes, closing costs,
 * and legal fees.
 *
 * @module lib/costs/acquisition
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type { AcquisitionCosts, AuctionPlatform } from '@/types/costs';
import {
  DEFAULT_COSTS,
  getTransferTaxRate,
  getBuyersPremiumRate,
} from './constants';

// ============================================
// Buyer's Premium Calculator
// ============================================

/**
 * Calculate buyer's premium based on auction platform
 *
 * Buyer's premium is an additional fee charged by the auction platform,
 * typically 2-10% of the winning bid. This is paid on top of the bid amount.
 *
 * @param bidAmount - Winning bid amount in dollars
 * @param platform - Auction platform identifier
 * @returns Buyer's premium in dollars
 *
 * @formula premium = bidAmount * premiumRate
 *
 * @example
 * // Bid4Assets charges 5% buyer's premium
 * calculateBuyersPremium(50000, 'bid4assets'); // 2500
 *
 * // In-person auctions typically have lower premiums
 * calculateBuyersPremium(50000, 'in_person'); // 1000
 */
export function calculateBuyersPremium(
  bidAmount: number,
  platform: AuctionPlatform = 'other'
): number {
  const premiumRate = getBuyersPremiumRate(platform);
  return Math.round(bidAmount * premiumRate * 100) / 100;
}

// ============================================
// Transfer Tax Calculator
// ============================================

/**
 * Calculate transfer tax for property deed transfer
 *
 * Transfer taxes (also called documentary stamp tax or recording tax)
 * are state/local taxes on the transfer of real property. Rates vary
 * significantly by state, from 0% to over 4%.
 *
 * @param amount - Sale/transfer amount in dollars
 * @param state - Two-letter state code
 * @param county - Optional county name for local tax adjustments
 * @returns Transfer tax amount in dollars
 *
 * @formula transferTax = amount * stateRate [+ localTax]
 *
 * @example
 * // Pennsylvania has 2% transfer tax (1% state + 1% local)
 * calculateTransferTax(50000, 'PA'); // 1000
 *
 * // Texas has no transfer tax
 * calculateTransferTax(50000, 'TX'); // 0
 */
export function calculateTransferTax(
  amount: number,
  state: string,
  county?: string
): number {
  const baseRate = getTransferTaxRate(state);
  let totalRate = baseRate;

  // Some counties have additional local transfer taxes
  // Note: This is a simplified implementation. Full implementation would
  // require a database of county-level tax rates.
  if (county) {
    // Major cities with significant local transfer taxes
    const localTaxes: Record<string, number> = {
      // Pennsylvania - Philadelphia has additional 3.278%
      'PA_Philadelphia': 0.03278,
      // New York City has additional 1% on sales over $500k
      'NY_NewYork': amount >= 500000 ? 0.01 : 0,
      'NY_Manhattan': amount >= 500000 ? 0.01 : 0,
      // San Francisco has tiered rates
      'CA_SanFrancisco': 0.0068,
      // Seattle has additional real estate excise tax
      'WA_Seattle': 0.0036,
    };

    const countyKey = `${state.toUpperCase()}_${county.replace(/[^a-zA-Z]/g, '')}`;
    const localRate = localTaxes[countyKey];
    if (localRate) {
      totalRate += localRate;
    }
  }

  return Math.round(amount * totalRate * 100) / 100;
}

// ============================================
// Title Cost Calculator
// ============================================

/**
 * Title search and insurance cost result
 */
export interface TitleCosts {
  /** Cost for title search/examination */
  search: number;
  /** Cost for owner's title insurance policy */
  insurance: number;
  /** Total title-related costs */
  total: number;
}

/**
 * Calculate title search and insurance costs
 *
 * Title search involves examining public records to verify ownership
 * and identify any liens or encumbrances. Title insurance protects
 * the buyer against title defects not discovered in the search.
 *
 * @param propertyValue - Property value for insurance calculation
 * @param state - Two-letter state code (affects pricing)
 * @returns Title search and insurance costs
 *
 * @formula
 *   titleSearch = baseRate (typically $300-500)
 *   titleInsurance = max(minPremium, propertyValue * rate)
 *
 * @example
 * calculateTitleCosts(100000, 'PA');
 * // { search: 350, insurance: 500, total: 850 }
 */
export function calculateTitleCosts(
  propertyValue: number,
  state?: string
): TitleCosts {
  const { titleSearch, titleInsuranceMin, titleInsuranceRate } = DEFAULT_COSTS.acquisition;

  // State-specific adjustments for title costs
  const stateMultipliers: Record<string, number> = {
    // Higher cost states (attorney states, complex title systems)
    NY: 1.3,
    NJ: 1.25,
    CT: 1.2,
    MA: 1.2,
    FL: 1.1,
    // Lower cost states (escrow states, simpler systems)
    AZ: 0.9,
    NV: 0.9,
    TX: 0.95,
    CA: 1.0,
  };

  const multiplier = state ? (stateMultipliers[state.toUpperCase()] ?? 1.0) : 1.0;

  const search = Math.round(titleSearch * multiplier);
  const insurance = Math.max(
    titleInsuranceMin,
    Math.round(propertyValue * titleInsuranceRate * multiplier * 100) / 100
  );

  return {
    search,
    insurance,
    total: search + insurance,
  };
}

// ============================================
// Recording Fees Calculator
// ============================================

/**
 * Calculate county recording fees for deed transfer
 *
 * Recording fees are charged by the county to record the new deed
 * in public records. Fees vary by county but are typically $25-200.
 *
 * @param state - Two-letter state code
 * @param county - Optional county name
 * @returns Recording fees in dollars
 *
 * @example
 * calculateRecordingFees('PA', 'Blair'); // 150
 */
export function calculateRecordingFees(
  state: string,
  county?: string
): number {
  // Base recording fee varies by state
  const baseByState: Record<string, number> = {
    CA: 200,
    NY: 175,
    FL: 100,
    TX: 100,
    PA: 150,
    IL: 125,
    OH: 100,
    MI: 100,
    GA: 75,
    NC: 75,
  };

  return baseByState[state.toUpperCase()] ?? DEFAULT_COSTS.acquisition.recordingFees;
}

// ============================================
// Legal Fees Calculator
// ============================================

/**
 * Calculate legal/attorney fees for closing
 *
 * Some states require attorney involvement in real estate closings.
 * Even in escrow states, legal review may be advisable for tax deed
 * purchases due to title complexity.
 *
 * @param state - Two-letter state code
 * @param isAttorneyState - Whether state requires attorney for closing
 * @returns Legal fees in dollars
 *
 * @example
 * calculateLegalFees('NY', true); // 1500 (attorney required)
 * calculateLegalFees('CA', false); // 500 (optional review)
 */
export function calculateLegalFees(
  state: string,
  isAttorneyState?: boolean
): number {
  // States that require attorney involvement in real estate closings
  const attorneyStates = [
    'CT', 'DE', 'GA', 'MA', 'NC', 'NY', 'SC', 'VT', 'WV',
  ];

  const requiresAttorney = isAttorneyState ?? attorneyStates.includes(state.toUpperCase());

  if (requiresAttorney) {
    // Attorney fees for full closing representation
    const attorneyFees: Record<string, number> = {
      NY: 1500,
      CT: 1200,
      MA: 1200,
      GA: 800,
      SC: 700,
      NC: 700,
    };
    return attorneyFees[state.toUpperCase()] ?? 1000;
  }

  // Optional legal review for non-attorney states
  return DEFAULT_COSTS.acquisition.legalFees;
}

// ============================================
// Main Acquisition Cost Calculator
// ============================================

/**
 * Input parameters for acquisition cost calculation
 */
export interface AcquisitionCostInput {
  /** Winning bid/purchase price */
  bidAmount: number;
  /** Two-letter state code */
  state: string;
  /** Optional county name for local tax adjustments */
  county?: string;
  /** Auction platform (affects buyer's premium) */
  platform?: AuctionPlatform;
  /** Property value (if different from bid for title insurance) */
  propertyValue?: number;
  /** Override default legal fees */
  legalFeesOverride?: number;
}

/**
 * Calculate complete acquisition costs for a property purchase
 *
 * This function aggregates all costs associated with acquiring a property
 * at a tax deed auction, including the bid amount, closing costs, transfer
 * taxes, and platform fees.
 *
 * @param input - Acquisition cost calculation inputs
 * @returns Complete acquisition cost breakdown
 *
 * @formula
 *   totalAcquisition = bidAmount + buyersPremium + transferTax +
 *                      recordingFees + titleSearch + titleInsurance + legalFees
 *
 * @example
 * const costs = calculateAcquisitionCosts({
 *   bidAmount: 50000,
 *   state: 'PA',
 *   county: 'Blair',
 *   platform: 'bid4assets',
 * });
 *
 * // Returns:
 * // {
 * //   bidAmount: 50000,
 * //   buyersPremium: 2500,
 * //   transferTax: 1000,
 * //   recordingFees: 150,
 * //   titleSearch: 350,
 * //   titleInsurance: 500,
 * //   legalFees: 750,
 * //   totalAcquisition: 55250
 * // }
 */
export function calculateAcquisitionCosts(input: AcquisitionCostInput): AcquisitionCosts {
  const {
    bidAmount,
    state,
    county,
    platform = 'other',
    propertyValue,
    legalFeesOverride,
  } = input;

  // Use property value for title insurance if provided, otherwise use bid amount
  const valueForInsurance = propertyValue ?? bidAmount;

  // Calculate individual cost components
  const buyersPremium = calculateBuyersPremium(bidAmount, platform);
  const transferTax = calculateTransferTax(bidAmount, state, county);
  const recordingFees = calculateRecordingFees(state, county);
  const titleCosts = calculateTitleCosts(valueForInsurance, state);
  const legalFees = legalFeesOverride ?? calculateLegalFees(state);

  // Sum all costs
  const totalAcquisition =
    bidAmount +
    buyersPremium +
    transferTax +
    recordingFees +
    titleCosts.search +
    titleCosts.insurance +
    legalFees;

  return {
    bidAmount,
    buyersPremium,
    transferTax,
    recordingFees,
    titleSearch: titleCosts.search,
    titleInsurance: titleCosts.insurance,
    legalFees,
    totalAcquisition: Math.round(totalAcquisition * 100) / 100,
  };
}

/**
 * Simplified acquisition cost calculator with minimal inputs
 *
 * @param bidAmount - Winning bid amount
 * @param state - Two-letter state code
 * @param platform - Optional auction platform
 * @returns Complete acquisition cost breakdown
 *
 * @example
 * const costs = calculateSimpleAcquisitionCosts(50000, 'PA');
 */
export function calculateSimpleAcquisitionCosts(
  bidAmount: number,
  state: string,
  platform: AuctionPlatform = 'other'
): AcquisitionCosts {
  return calculateAcquisitionCosts({
    bidAmount,
    state,
    platform,
  });
}

/**
 * Calculate total acquisition cost as a quick estimate
 *
 * Uses rule-of-thumb: total = bidAmount * (1 + 12-15%)
 * - 5% buyer's premium
 * - 2% transfer tax (average)
 * - 5-8% other costs
 *
 * @param bidAmount - Winning bid amount
 * @returns Estimated total acquisition cost
 *
 * @example
 * estimateAcquisitionTotal(50000); // ~57500 (15% above bid)
 */
export function estimateAcquisitionTotal(bidAmount: number): number {
  // Quick estimate: bid + 15% for all costs
  return Math.round(bidAmount * 1.15);
}
