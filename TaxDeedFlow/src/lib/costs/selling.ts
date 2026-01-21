/**
 * Cost Estimation Engine - Selling Cost Calculator
 *
 * Calculates all costs associated with selling/disposing of a property,
 * including agent commissions, closing costs, staging, marketing,
 * and seller concessions.
 *
 * @module lib/costs/selling
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type { SellingCosts, SaleStrategy } from '@/types/costs';
import { DEFAULT_COSTS, getTransferTaxRate } from './constants';

// ============================================
// Agent Commission Calculator
// ============================================

/**
 * Calculate real estate agent commission
 *
 * Standard commission is 5-6% of sale price, split between
 * listing agent and buyer's agent. FSBO (For Sale By Owner)
 * may still pay buyer's agent commission.
 *
 * @param salePrice - Expected sale price
 * @param commissionRate - Total commission rate (decimal, default 0.06)
 * @param includesBuyerAgent - Whether to include buyer's agent commission
 * @returns Total agent commission in dollars
 *
 * @formula commission = salePrice * commissionRate
 *
 * @example
 * // Full commission at 6%
 * calculateAgentCommission(200000); // 12000
 *
 * // Reduced commission at 5%
 * calculateAgentCommission(200000, 0.05); // 10000
 *
 * // FSBO paying only buyer's agent (3%)
 * calculateAgentCommission(200000, 0.03, true); // 6000
 */
export function calculateAgentCommission(
  salePrice: number,
  commissionRate: number = DEFAULT_COSTS.selling.agentCommissionRate,
  includesBuyerAgent: boolean = true
): number {
  const rate = includesBuyerAgent ? commissionRate : commissionRate / 2;
  return Math.round(salePrice * rate * 100) / 100;
}

// ============================================
// Seller Closing Costs Calculator
// ============================================

/**
 * Calculate seller closing costs
 *
 * Seller closing costs typically include:
 * - Title insurance (owner's policy for buyer)
 * - Escrow fees
 * - Transfer taxes (in some states, seller pays)
 * - Recording fees
 * - Prorated taxes/HOA
 * - Attorney fees (in some states)
 *
 * @param salePrice - Expected sale price
 * @param state - Two-letter state code
 * @param includesTransferTax - Whether seller pays transfer tax
 * @returns Total seller closing costs in dollars
 *
 * @formula
 *   baseCosts = salePrice * 1.5%
 *   transferTax = salePrice * stateRate (if seller pays)
 *   total = baseCosts + transferTax
 *
 * @example
 * // Pennsylvania (seller typically pays transfer tax)
 * calculateClosingCosts(200000, 'PA', true); // ~7000 (1.5% + 2%)
 *
 * // Texas (no transfer tax)
 * calculateClosingCosts(200000, 'TX', false); // ~3000 (1.5% only)
 */
export function calculateClosingCosts(
  salePrice: number,
  state: string,
  includesTransferTax: boolean = true
): number {
  // Base closing costs (title, escrow, recording, prorations)
  const baseCosts = salePrice * DEFAULT_COSTS.selling.closingCostRate;

  // State-specific adjustments
  const stateAdjustments: Record<string, number> = {
    // Higher cost states (attorney required, complex closings)
    NY: 1.5,
    NJ: 1.4,
    CT: 1.3,
    MA: 1.3,
    FL: 1.2,
    // Lower cost states (escrow closings, simpler process)
    TX: 0.9,
    AZ: 0.9,
    NV: 0.95,
    CA: 1.0,
    PA: 1.0,
  };

  const stateMultiplier = stateAdjustments[state.toUpperCase()] ?? 1.0;
  let totalClosing = baseCosts * stateMultiplier;

  // Add transfer tax if seller pays
  if (includesTransferTax) {
    const transferRate = getTransferTaxRate(state);
    totalClosing += salePrice * transferRate;
  }

  return Math.round(totalClosing * 100) / 100;
}

// ============================================
// Staging Cost Calculator
// ============================================

/**
 * Calculate professional staging costs
 *
 * Staging helps present the property in its best light.
 * Costs vary by property size and staging approach.
 *
 * @param sqft - Property square footage
 * @param level - Staging level ('none', 'partial', 'full')
 * @param monthsStaged - Number of months property will be staged
 * @returns Total staging costs in dollars
 *
 * @formula
 *   fullStaging = $2-4 per sqft initial + $500-1000/month rental
 *   partialStaging = 50% of full
 *
 * @example
 * calculateStagingCosts(1500, 'full', 2); // ~4500
 * calculateStagingCosts(1500, 'partial', 2); // ~2250
 * calculateStagingCosts(1500, 'none', 2); // 0
 */
export function calculateStagingCosts(
  sqft: number,
  level: 'none' | 'partial' | 'full' = 'partial',
  monthsStaged: number = 1
): number {
  if (level === 'none') return 0;

  // Base costs: $2.50/sqft initial setup + $600/month rental
  const initialCostPerSqft = 2.50;
  const monthlyRental = 600;

  const fullInitial = sqft * initialCostPerSqft;
  const fullMonthly = monthlyRental * monthsStaged;
  const fullTotal = fullInitial + fullMonthly;

  if (level === 'full') {
    return Math.round(fullTotal);
  }

  // Partial staging is roughly 50% of full
  return Math.round(fullTotal * 0.5);
}

// ============================================
// Marketing Cost Calculator
// ============================================

/**
 * Calculate marketing and advertising costs
 *
 * Marketing costs include photography, video, online
 * advertising, signage, and promotional materials.
 *
 * @param salePrice - Expected sale price (affects marketing budget)
 * @param level - Marketing level ('basic', 'standard', 'premium')
 * @returns Total marketing costs in dollars
 *
 * @example
 * calculateMarketingCosts(200000, 'standard'); // ~1000
 * calculateMarketingCosts(500000, 'premium'); // ~3500
 */
export function calculateMarketingCosts(
  salePrice: number,
  level: 'basic' | 'standard' | 'premium' = 'standard'
): number {
  // Base costs by level
  const baseCosts: Record<string, { base: number; rateAbove200k: number }> = {
    basic: { base: 500, rateAbove200k: 0.001 },      // MLS, basic photos
    standard: { base: 1000, rateAbove200k: 0.002 },  // Pro photos, video, online ads
    premium: { base: 2500, rateAbove200k: 0.003 },   // Drone, 3D tour, print ads
  };

  const { base, rateAbove200k } = baseCosts[level] ?? baseCosts.standard;

  // Add percentage of value above $200k
  const additionalMarketing = salePrice > 200000
    ? (salePrice - 200000) * rateAbove200k
    : 0;

  return Math.round(base + additionalMarketing);
}

// ============================================
// Home Warranty Calculator
// ============================================

/**
 * Calculate home warranty cost for buyer
 *
 * Offering a home warranty can help close deals faster
 * and provide buyer confidence in older properties.
 *
 * @param includeWarranty - Whether to include warranty
 * @param coverage - Coverage level ('basic', 'standard', 'premium')
 * @returns Home warranty cost in dollars
 *
 * @example
 * calculateHomeWarrantyCost(true, 'standard'); // 500
 * calculateHomeWarrantyCost(true, 'premium'); // 700
 */
export function calculateHomeWarrantyCost(
  includeWarranty: boolean = true,
  coverage: 'basic' | 'standard' | 'premium' = 'standard'
): number {
  if (!includeWarranty) return 0;

  const costs: Record<string, number> = {
    basic: 350,     // Basic systems coverage
    standard: 500,  // Systems + appliances
    premium: 700,   // Comprehensive with options
  };

  return costs[coverage] ?? DEFAULT_COSTS.selling.homeWarranty;
}

// ============================================
// Seller Concessions Calculator
// ============================================

/**
 * Calculate typical seller concessions
 *
 * Seller concessions (credits to buyer) are common in
 * slower markets or when selling below-average properties.
 *
 * @param salePrice - Expected sale price
 * @param marketCondition - Market condition ('hot', 'normal', 'slow')
 * @param propertyCondition - Property condition ('excellent', 'good', 'fair', 'poor')
 * @returns Estimated seller concessions in dollars
 *
 * @example
 * // Hot market, good property - minimal concessions
 * calculateSellerConcessions(200000, 'hot', 'good'); // 0
 *
 * // Slow market, fair property - expect concessions
 * calculateSellerConcessions(200000, 'slow', 'fair'); // 4000 (2%)
 */
export function calculateSellerConcessions(
  salePrice: number,
  marketCondition: 'hot' | 'normal' | 'slow' = 'normal',
  propertyCondition: 'excellent' | 'good' | 'fair' | 'poor' = 'fair'
): number {
  // Concession rates by market condition
  const marketRates: Record<string, number> = {
    hot: 0,        // No concessions in hot market
    normal: 0.01,  // 1% typical
    slow: 0.02,    // 2% in slow market
  };

  // Adjustment for property condition
  const conditionAdjust: Record<string, number> = {
    excellent: -0.01,  // Reduce concessions
    good: 0,
    fair: 0.005,       // Add 0.5%
    poor: 0.01,        // Add 1%
  };

  const baseRate = marketRates[marketCondition] ?? 0.01;
  const adjustment = conditionAdjust[propertyCondition] ?? 0;
  const finalRate = Math.max(0, baseRate + adjustment);

  return Math.round(salePrice * finalRate);
}

// ============================================
// Main Selling Cost Calculator
// ============================================

/**
 * Input parameters for selling cost calculation
 */
export interface SellingCostInput {
  /** Expected sale price (ARV) */
  salePrice: number;
  /** Two-letter state code */
  state: string;
  /** Sale strategy */
  strategy?: SaleStrategy;
  /** Property square footage (for staging) */
  sqft?: number;
  /** Whether to include staging costs */
  includeStaging?: boolean;
  /** Staging level if included */
  stagingLevel?: 'none' | 'partial' | 'full';
  /** Marketing level */
  marketingLevel?: 'basic' | 'standard' | 'premium';
  /** Whether to include home warranty */
  includeWarranty?: boolean;
  /** Expected seller concessions (override) */
  concessionsOverride?: number;
  /** Market condition for concession estimate */
  marketCondition?: 'hot' | 'normal' | 'slow';
}

/**
 * Calculate complete selling cost breakdown
 *
 * This function calculates all costs associated with selling
 * a property, adjusted for sale strategy and market conditions.
 *
 * @param input - Selling cost calculation inputs
 * @returns Complete selling cost breakdown
 *
 * @formula
 *   totalSelling = commission + closingCosts + staging + marketing +
 *                  homeWarranty + sellerConcessions
 *
 * @example
 * const costs = calculateSellingCosts({
 *   salePrice: 200000,
 *   state: 'PA',
 *   strategy: 'retail_agent',
 *   sqft: 1500,
 *   includeStaging: true,
 * });
 *
 * // Returns:
 * // {
 * //   agentCommission: 12000,
 * //   closingCosts: 7000,
 * //   staging: 2250,
 * //   marketing: 1000,
 * //   homeWarranty: 500,
 * //   sellerConcessions: 2000,
 * //   totalSelling: 24750
 * // }
 */
export function calculateSellingCosts(input: SellingCostInput): SellingCosts {
  const {
    salePrice,
    state,
    strategy = 'retail_agent',
    sqft = 1500,
    includeStaging = true,
    stagingLevel = 'partial',
    marketingLevel = 'standard',
    includeWarranty = true,
    concessionsOverride,
    marketCondition = 'normal',
  } = input;

  // Determine commission rate based on strategy
  let commissionRate: number;
  let useAgent: boolean;
  let sellerPaysTransferTax: boolean;

  switch (strategy) {
    case 'retail_agent':
      commissionRate = 0.06;
      useAgent = true;
      sellerPaysTransferTax = true;
      break;
    case 'retail_fsbo':
      commissionRate = 0.03; // Pay buyer's agent only
      useAgent = false;
      sellerPaysTransferTax = true;
      break;
    case 'wholesale':
      commissionRate = 0;    // No agents in wholesale
      useAgent = false;
      sellerPaysTransferTax = false; // Often buyer responsibility
      break;
    case 'auction':
      commissionRate = 0.02; // Auction fees
      useAgent = false;
      sellerPaysTransferTax = true;
      break;
    default:
      commissionRate = 0.06;
      useAgent = true;
      sellerPaysTransferTax = true;
  }

  // Calculate individual cost components
  const agentCommission = calculateAgentCommission(salePrice, commissionRate);
  const closingCosts = calculateClosingCosts(salePrice, state, sellerPaysTransferTax);

  // Staging only makes sense for retail strategies
  const staging = (strategy === 'retail_agent' || strategy === 'retail_fsbo') && includeStaging
    ? calculateStagingCosts(sqft, stagingLevel, 2)
    : 0;

  // Marketing varies by strategy
  const marketing = useAgent
    ? calculateMarketingCosts(salePrice, marketingLevel)
    : (strategy === 'retail_fsbo' ? calculateMarketingCosts(salePrice, 'standard') : 0);

  // Home warranty for retail sales only
  const homeWarranty = (strategy === 'retail_agent' || strategy === 'retail_fsbo') && includeWarranty
    ? calculateHomeWarrantyCost(true, 'standard')
    : 0;

  // Seller concessions
  const sellerConcessions = concessionsOverride ?? (
    strategy === 'wholesale' ? 0 : calculateSellerConcessions(salePrice, marketCondition, 'fair')
  );

  // Sum all costs
  const totalSelling =
    agentCommission +
    closingCosts +
    staging +
    marketing +
    homeWarranty +
    sellerConcessions;

  return {
    agentCommission,
    closingCosts,
    staging,
    marketing,
    homeWarranty,
    sellerConcessions,
    totalSelling: Math.round(totalSelling * 100) / 100,
  };
}

/**
 * Quick estimate of selling costs as percentage of sale price
 *
 * @param salePrice - Expected sale price
 * @param state - Two-letter state code
 * @param strategy - Sale strategy
 * @returns Estimated total selling costs
 *
 * @example
 * estimateSellingTotal(200000, 'PA', 'retail_agent'); // ~24000 (~12%)
 * estimateSellingTotal(200000, 'PA', 'wholesale'); // ~3000 (~1.5%)
 */
export function estimateSellingTotal(
  salePrice: number,
  state: string,
  strategy: SaleStrategy = 'retail_agent'
): number {
  const costs = calculateSellingCosts({
    salePrice,
    state,
    strategy,
    includeStaging: strategy !== 'wholesale',
    includeWarranty: strategy !== 'wholesale',
  });

  return costs.totalSelling;
}

/**
 * Get selling cost percentage for a strategy
 *
 * @param strategy - Sale strategy
 * @param state - Two-letter state code
 * @returns Approximate selling cost as percentage of sale price
 *
 * @example
 * getSellingCostPercentage('retail_agent', 'PA'); // ~0.12 (12%)
 * getSellingCostPercentage('wholesale', 'PA'); // ~0.015 (1.5%)
 */
export function getSellingCostPercentage(
  strategy: SaleStrategy,
  state: string
): number {
  // Calculate for a standard $200,000 sale
  const costs = calculateSellingCosts({
    salePrice: 200000,
    state,
    strategy,
    sqft: 1500,
    includeStaging: true,
    includeWarranty: true,
  });

  return Math.round((costs.totalSelling / 200000) * 1000) / 1000;
}
