/**
 * Exit Strategies Analysis - Financial Analysis Module
 *
 * This module provides comprehensive analysis of different exit strategies
 * for tax deed property investments including flip, rental hold, wholesale,
 * lease-option, and owner financing scenarios.
 *
 * @module lib/analysis/financial/exitStrategies
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import {
  calculateIRR,
  annualizeMonthlyIRR,
  calculateNetROI,
  calculateCapRate,
  calculateCashOnCash,
  type ROIInputs,
} from './roiCalculator';
import {
  calculateHoldingCosts,
  estimateHoldingPeriod,
  type HoldingCostInputs,
} from './holdingCosts';

// ============================================
// Type Definitions
// ============================================

/**
 * Exit strategy type enumeration
 */
export type ExitStrategyType =
  | 'flip'           // Fix and flip - renovate and sell retail
  | 'wholesale'      // Wholesale - quick assignment/sale to investor
  | 'rental_hold'    // Buy and hold for rental income
  | 'lease_option'   // Lease with option to purchase
  | 'owner_finance'  // Sell with owner financing
  | 'brrrr';         // Buy, Rehab, Rent, Refinance, Repeat

/**
 * Market condition assessment
 */
export type MarketCondition = 'hot' | 'normal' | 'slow' | 'declining';

/**
 * Complete exit strategy analysis for a single strategy
 */
export interface ExitStrategyAnalysis {
  /** Strategy type */
  strategy: ExitStrategyType;
  /** Human-readable strategy name */
  strategyName: string;
  /** Brief description of the strategy */
  description: string;

  // Financial Projections
  /** Total investment required */
  totalInvestment: number;
  /** Expected gross revenue */
  grossRevenue: number;
  /** Expected net profit */
  netProfit: number;
  /** Net ROI percentage */
  netROI: number;
  /** Annualized IRR */
  irr: number;

  // Timing
  /** Estimated time to exit in months */
  timeToExitMonths: number;
  /** Monthly cash flow (for hold strategies) */
  monthlyCashFlow: number;

  // Risk Assessment
  /** Risk level (1-10, higher = riskier) */
  riskLevel: number;
  /** Key risks for this strategy */
  risks: string[];
  /** Risk-adjusted return */
  riskAdjustedReturn: number;

  // Requirements
  /** Initial cash required */
  cashRequired: number;
  /** Financing available/required */
  financingRequired: boolean;
  /** Skill level required (beginner, intermediate, advanced) */
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  /** Key requirements to execute */
  requirements: string[];

  // Pros and Cons
  pros: string[];
  cons: string[];

  // Recommendation
  /** Recommendation score (0-100) */
  recommendationScore: number;
  /** Recommendation reasoning */
  recommendationNotes: string;
}

/**
 * Input parameters for exit strategy analysis
 */
export interface ExitStrategyInputs {
  /** Acquisition/bid price */
  acquisitionPrice: number;
  /** Current as-is market value */
  currentMarketValue: number;
  /** After-repair value */
  arv: number;
  /** Estimated rehab costs */
  rehabCost: number;
  /** Closing costs at acquisition */
  closingCosts: number;
  /** State for tax/cost calculations */
  state: string;
  /** Property square footage */
  sqft?: number;
  /** Year property was built */
  yearBuilt?: number;
  /** Number of bedrooms */
  bedrooms?: number;
  /** Number of bathrooms */
  bathrooms?: number;
  /** Property type */
  propertyType?: string;
  /** Current market condition */
  marketCondition: MarketCondition;
  /** Estimated monthly market rent */
  monthlyRent?: number;
  /** Annual property taxes */
  annualTaxes?: number;
  /** Monthly HOA (if applicable) */
  monthlyHoa?: number;
  /** Available cash for investment */
  availableCash?: number;
  /** Investor experience level */
  investorExperience?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Wholesale-specific parameters
 */
export interface WholesaleParams {
  /** Assignment fee target */
  assignmentFee: number;
  /** Time to find buyer (days) */
  daysToFindBuyer: number;
  /** Buyer's list size */
  buyersListSize?: number;
}

/**
 * Rental-specific parameters
 */
export interface RentalParams {
  /** Monthly gross rent */
  monthlyRent: number;
  /** Annual vacancy rate */
  vacancyRate: number;
  /** Annual maintenance as % of rent */
  maintenancePercent: number;
  /** Property management fee as % of rent */
  managementFeePercent: number;
  /** Hold period in years */
  holdYears: number;
  /** Annual appreciation rate */
  appreciationRate: number;
  /** Annual rent increase rate */
  rentIncreaseRate: number;
}

/**
 * Lease-option-specific parameters
 */
export interface LeaseOptionParams {
  /** Monthly rent */
  monthlyRent: number;
  /** Monthly rent credit towards purchase */
  rentCredit: number;
  /** Option consideration (upfront) */
  optionFee: number;
  /** Option exercise price */
  exercisePrice: number;
  /** Lease term in months */
  leaseTermMonths: number;
  /** Probability buyer exercises option */
  exerciseProbability: number;
}

/**
 * Owner financing parameters
 */
export interface OwnerFinanceParams {
  /** Sale price */
  salePrice: number;
  /** Down payment amount */
  downPayment: number;
  /** Interest rate offered */
  interestRate: number;
  /** Loan term in years */
  termYears: number;
  /** Balloon payment after X years (0 = none) */
  balloonYears: number;
}

/**
 * Complete exit strategy comparison result
 */
export interface ExitStrategyComparison {
  /** Property inputs used */
  inputs: ExitStrategyInputs;
  /** All analyzed strategies */
  strategies: ExitStrategyAnalysis[];
  /** Recommended strategy */
  recommendedStrategy: ExitStrategyType;
  /** Recommendation confidence (0-100) */
  recommendationConfidence: number;
  /** Ranking of strategies by score */
  ranking: Array<{ strategy: ExitStrategyType; score: number; rank: number }>;
  /** Analysis timestamp */
  analyzedAt: string;
}

// ============================================
// Constants
// ============================================

/**
 * Selling cost rate for retail sale (agent commission + closing)
 *
 * SOURCE: National Association of Realtors (NAR) 2025 data
 * - Typical agent commission: 5-6% (split between buyer/seller agents)
 * - Closing costs (title, escrow, transfer taxes): 1-2%
 * - Total average: 8% of sale price
 *
 * This is applied to ARV when calculating net proceeds from retail sales
 */
const RETAIL_SELLING_RATE = 0.08;

/**
 * Wholesale fee as percentage of ARV (typical range)
 *
 * SOURCE: Industry standard from BiggerPockets Real Estate Investing Forum
 * - Typical wholesale assignment fee: $5,000 - $15,000
 * - As percentage of ARV: 3-7% depending on deal quality
 * - Conservative estimate: 5% used here
 *
 * Applied when calculating wholesale strategy profitability
 */
const WHOLESALE_FEE_RATE = 0.05;

/**
 * Typical property management fee
 *
 * SOURCE: 2025 Property Management Fee Study (NARPM)
 * - Industry standard: 8-12% of monthly rent
 * - Mid-range: 10% used for conservative estimates
 * - Does not include tenant placement fees (typically 50-100% of one month's rent)
 *
 * Applied to monthly rent for rental hold strategies
 */
const PROPERTY_MANAGEMENT_RATE = 0.10;

/**
 * Typical vacancy rate for rentals
 *
 * SOURCE: U.S. Census Bureau Rental Vacancy Rate (Q4 2025)
 * - National average: 6-8% annually
 * - Conservative estimate: 8% accounts for:
 *   * Tenant turnover (average 2-3 years)
 *   * Marketing time between tenants (2-4 weeks)
 *   * Occasional evictions or breaks in occupancy
 *
 * Applied to gross rent to calculate effective rental income
 */
const DEFAULT_VACANCY_RATE = 0.08;

/**
 * Typical maintenance reserve percentage
 *
 * SOURCE: 1% Rule (real estate industry standard) + inflation adjustment
 * - Traditional rule: 1% of property value annually
 * - Expressed as monthly rent percentage: ~10% of monthly rent
 * - Covers: routine repairs, HVAC, plumbing, appliances, exterior
 * - Does NOT cover capital improvements (roof, foundation)
 *
 * Applied to monthly rent as maintenance expense reserve
 */
const DEFAULT_MAINTENANCE_RATE = 0.10;

/**
 * Annual appreciation rate assumption
 *
 * SOURCE: Federal Housing Finance Agency (FHFA) House Price Index
 * - Long-term historical average (1991-2025): 3.5% annually
 * - Conservative estimate: 3% accounts for market cycles
 * - Note: Actual appreciation varies significantly by:
 *   * Geographic location (coastal vs. inland)
 *   * Property type (SFH vs. multi-family)
 *   * Local economic conditions
 *
 * Applied to property value for future value projections in rental hold
 */
const DEFAULT_APPRECIATION_RATE = 0.03;

/**
 * Risk-free rate for Sharpe-like calculations
 *
 * SOURCE: U.S. Treasury 10-Year Bond Yield (January 2026)
 * - Current 10-year Treasury: ~4.0%
 * - Used as baseline for risk-adjusted return calculations
 * - Formula: Risk-Adjusted Return = Net ROI - (Risk Level / 20)
 *
 * This provides a conservative benchmark for "safe" investment returns
 */
const RISK_FREE_RATE = 0.04;

// ============================================
// Individual Strategy Analyzers
// ============================================

/**
 * Map MarketCondition to the holding period market conditions
 * ('declining' maps to 'slow' for holding period estimation)
 */
function mapMarketConditionToHolding(
  condition: MarketCondition
): 'hot' | 'normal' | 'slow' {
  if (condition === 'declining') return 'slow';
  return condition;
}

/**
 * Analyze flip/fix-and-flip strategy
 */
export function analyzeFlipStrategy(
  inputs: ExitStrategyInputs
): ExitStrategyAnalysis {
  // Calculate holding period based on rehab scope
  const rehabScope = categorizeRehabScope(inputs.rehabCost, inputs.arv);
  const holdingMonths = estimateHoldingPeriod(
    rehabScope,
    mapMarketConditionToHolding(inputs.marketCondition)
  );

  // Calculate holding costs
  const holdingCostInputs: HoldingCostInputs = {
    propertyValue: inputs.currentMarketValue,
    state: inputs.state,
    sqft: inputs.sqft,
    yearBuilt: inputs.yearBuilt,
    annualTaxes: inputs.annualTaxes,
    monthlyHoa: inputs.monthlyHoa,
    holdingMonths,
    isVacant: true,
    activeRehab: true,
  };
  const holdingCosts = calculateHoldingCosts(holdingCostInputs);

  // Calculate investment and returns
  const totalInvestment =
    inputs.acquisitionPrice +
    inputs.closingCosts +
    inputs.rehabCost +
    holdingCosts.totalHolding;

  const sellingCosts = inputs.arv * RETAIL_SELLING_RATE;
  const grossRevenue = inputs.arv;
  const netProfit = grossRevenue - sellingCosts - totalInvestment;
  const netROI = calculateNetROI(totalInvestment, netProfit);

  // ==========================================
  // IRR CALCULATION (Internal Rate of Return)
  // ==========================================
  // IRR is the discount rate that makes NPV = 0
  // Formula: NPV = Σ(Cash Flow_t / (1 + IRR)^t) = 0
  //
  // For flip strategy, cash flows are:
  // Month 0: -$150,000 (initial investment)
  // Months 1-5: $0 (no income during rehab)
  // Month 6: $220,000 (ARV) - $17,600 (selling costs) = $202,400
  //
  // IRR captures the time-adjusted return - critical for comparing
  // short-term flips vs. long-term holds
  const cashFlows = [
    -totalInvestment,                    // Month 0: Initial investment (negative)
    ...Array(holdingMonths - 1).fill(0), // Months 1 to (n-1): No cash flow during rehab
    inputs.arv - sellingCosts,           // Month n: Sale proceeds (net of costs)
  ];
  const monthlyIRR = calculateIRR(cashFlows);  // Calculate monthly IRR
  const irr = annualizeMonthlyIRR(monthlyIRR); // Convert to annual percentage

  // Risk assessment
  // Calculate flip-specific risk (1-10 scale) based on market, rehab scope, and property age
  const riskLevel = calculateFlipRiskLevel(inputs);

  // Risk-Adjusted Return Formula:
  // riskAdjustedReturn = netROI × (1 - riskLevel / 20)
  //
  // This applies a penalty proportional to risk level:
  // - Risk Level 2 → 10% penalty (×0.90)
  // - Risk Level 5 → 25% penalty (×0.75)
  // - Risk Level 10 → 50% penalty (×0.50)
  //
  // Example: 30% ROI with Risk Level 6
  // → 0.30 × (1 - 6/20) = 0.30 × 0.70 = 21% risk-adjusted return
  const riskAdjustedReturn = netROI * (1 - riskLevel / 20);

  // Calculate recommendation score
  const recommendationScore = calculateStrategyScore({
    netROI,
    irr,
    riskLevel,
    timeToExit: holdingMonths,
    cashRequired: totalInvestment,
    availableCash: inputs.availableCash,
    investorExperience: inputs.investorExperience,
    strategy: 'flip',
  });

  return {
    strategy: 'flip',
    strategyName: 'Fix and Flip',
    description: 'Renovate the property and sell at retail price for maximum profit',
    totalInvestment,
    grossRevenue,
    netProfit,
    netROI: netROI * 100,
    irr: (isNaN(irr) ? 0 : irr) * 100,
    timeToExitMonths: holdingMonths,
    monthlyCashFlow: 0,
    riskLevel,
    risks: getFlipRisks(inputs),
    riskAdjustedReturn: riskAdjustedReturn * 100,
    cashRequired: totalInvestment,
    financingRequired: totalInvestment > (inputs.availableCash || 0),
    skillLevel: rehabScope === 'gut' || rehabScope === 'heavy' ? 'advanced' : 'intermediate',
    requirements: [
      'Rehab management capability',
      'Contractor relationships',
      'Market timing knowledge',
      `Cash/financing for $${Math.round(totalInvestment).toLocaleString()}`,
    ],
    pros: [
      'Highest potential profit',
      'Quick return on investment',
      'Builds equity through sweat equity',
      'Clear exit timeline',
    ],
    cons: [
      'Higher risk if market changes',
      'Requires active management',
      'Rehab costs can exceed estimates',
      'Holding costs during renovation',
    ],
    recommendationScore,
    recommendationNotes: generateFlipRecommendation(inputs, netROI, holdingMonths),
  };
}

/**
 * Analyze wholesale strategy
 */
export function analyzeWholesaleStrategy(
  inputs: ExitStrategyInputs,
  params?: Partial<WholesaleParams>
): ExitStrategyAnalysis {
  // Default wholesale parameters
  const wholesaleParams: WholesaleParams = {
    assignmentFee: params?.assignmentFee || Math.max(5000, inputs.arv * WHOLESALE_FEE_RATE),
    daysToFindBuyer: params?.daysToFindBuyer || 30,
    buyersListSize: params?.buyersListSize,
  };

  // ==========================================
  // WHOLESALE INVESTMENT CALCULATION
  // ==========================================
  // Wholesale requires minimal capital - just enough to control the deal

  // Holding time = Time to find qualified investor buyer
  // Typically 15-45 days, converted to months for consistency
  const holdingMonths = Math.ceil(wholesaleParams.daysToFindBuyer / 30);

  // TOTAL INVESTMENT COMPONENTS:
  // 1. Earnest Money Deposit: Typically $500-$1,000 or 1% of acquisition (whichever less)
  //    - Shows seller you're serious
  //    - Refundable if deal falls through (in most cases)
  const earnestMoney = Math.min(1000, inputs.acquisitionPrice * 0.01);

  // 2. Marketing Costs: ~$500 for advertising deal to buyers
  //    - Email campaigns, social media, investor meetups
  //    - Relatively small expense for wholesale
  const marketingCosts = 500;

  // 3. Partial Closing Costs: Only 20% of normal closing costs
  //    - May avoid full closing if assignment happens before close
  //    - Assignment fee structure reduces typical closing expenses
  const totalInvestment = earnestMoney + marketingCosts + inputs.closingCosts * 0.2;

  // REVENUE AND PROFITABILITY
  // Revenue = Assignment fee (typically $5K-$15K or 3-7% of ARV)
  const grossRevenue = wholesaleParams.assignmentFee;
  const netProfit = grossRevenue - totalInvestment;
  const netROI = calculateNetROI(totalInvestment, netProfit);

  // ==========================================
  // WHOLESALE IRR CALCULATION
  // ==========================================
  // Very short-term investment (30-60 days) → extremely high IRR
  // Cash flows: [-investment at day 0, +assignment fee at day 30]
  //
  // Example: Invest $1,500, receive $8,000 in 30 days
  // Monthly IRR: 433% → Annualized: 5,200%+ (power of velocity!)
  const cashFlows = [-totalInvestment, grossRevenue];
  const monthlyIRR = calculateIRR(cashFlows);
  const irr = annualizeMonthlyIRR(monthlyIRR);

  // RISK ASSESSMENT
  // Risk Level 3 (LOW-MODERATE) because:
  // - Minimal capital at risk ($1,500 vs. $150K for flip)
  // - No rehab risk (sell as-is)
  // - Quick exit (30-45 days)
  // - But: depends on finding qualified buyer quickly
  const riskLevel = 3;
  const riskAdjustedReturn = netROI * (1 - riskLevel / 20);

  const recommendationScore = calculateStrategyScore({
    netROI,
    irr,
    riskLevel,
    timeToExit: holdingMonths,
    cashRequired: totalInvestment,
    availableCash: inputs.availableCash,
    investorExperience: inputs.investorExperience,
    strategy: 'wholesale',
  });

  return {
    strategy: 'wholesale',
    strategyName: 'Wholesale',
    description: 'Assign the contract to another investor for a quick fee',
    totalInvestment,
    grossRevenue,
    netProfit,
    netROI: netROI * 100,
    irr: (isNaN(irr) ? 0 : irr) * 100,
    timeToExitMonths: holdingMonths,
    monthlyCashFlow: 0,
    riskLevel,
    risks: [
      'Must find qualified buyer quickly',
      'Assignment may not be allowed',
      'Deal may fall through',
      'Smaller profit potential',
    ],
    riskAdjustedReturn: riskAdjustedReturn * 100,
    cashRequired: totalInvestment,
    financingRequired: false,
    skillLevel: 'beginner',
    requirements: [
      'Buyers list or investor network',
      'Marketing/communication skills',
      'Contract knowledge',
      `Minimal earnest money (~$${Math.round(earnestMoney).toLocaleString()})`,
    ],
    pros: [
      'Minimal capital required',
      'No rehab needed',
      'Quick turnaround',
      'Lower risk exposure',
    ],
    cons: [
      'Limited profit potential',
      'Requires strong buyer network',
      'Not all sellers allow assignment',
      'Competitive market',
    ],
    recommendationScore,
    recommendationNotes: `Wholesale offers quick ${formatCurrency(netProfit)} profit with minimal risk. Best for building capital or when lacking rehab resources.`,
  };
}

/**
 * Analyze rental hold strategy
 */
export function analyzeRentalStrategy(
  inputs: ExitStrategyInputs,
  params?: Partial<RentalParams>
): ExitStrategyAnalysis {
  // Default rental parameters
  const rentalParams: RentalParams = {
    monthlyRent: params?.monthlyRent || inputs.monthlyRent || estimateRent(inputs),
    vacancyRate: params?.vacancyRate || DEFAULT_VACANCY_RATE,
    maintenancePercent: params?.maintenancePercent || DEFAULT_MAINTENANCE_RATE,
    managementFeePercent: params?.managementFeePercent || PROPERTY_MANAGEMENT_RATE,
    holdYears: params?.holdYears || 5,
    appreciationRate: params?.appreciationRate || DEFAULT_APPRECIATION_RATE,
    rentIncreaseRate: params?.rentIncreaseRate || 0.03,
  };

  // Initial investment (acquisition + light rehab for rental)
  const rentalRehabCost = Math.min(inputs.rehabCost, inputs.currentMarketValue * 0.1);
  const totalInvestment =
    inputs.acquisitionPrice + inputs.closingCosts + rentalRehabCost;

  // ==========================================
  // MONTHLY CASH FLOW CALCULATION
  // ==========================================
  // Formula: Net Cash Flow = Effective Rent - Total Expenses

  // EFFECTIVE RENT = Gross Rent × (1 - Vacancy Rate)
  // Accounts for periods when property is vacant
  // Example: $1,500/mo × (1 - 0.08) = $1,500 × 0.92 = $1,380/mo effective
  const effectiveRent = rentalParams.monthlyRent * (1 - rentalParams.vacancyRate);

  // MONTHLY EXPENSES = Property Taxes + HOA + Maintenance + Management + Insurance
  const monthlyExpenses =
    (inputs.annualTaxes || inputs.currentMarketValue * 0.015) / 12 +  // Property taxes (÷12 for monthly)
    (inputs.monthlyHoa || 0) +                                         // HOA dues
    rentalParams.monthlyRent * rentalParams.maintenancePercent +      // Maintenance reserve (10% of rent)
    rentalParams.monthlyRent * rentalParams.managementFeePercent +    // Property management (10% of rent)
    estimateMonthlyInsurance(inputs.currentMarketValue, inputs.state); // Insurance (~0.4% annually)

  // NET CASH FLOW = What investor receives monthly after all expenses
  // Example: $1,380 effective - $850 expenses = $530/mo net cash flow
  const monthlyCashFlow = effectiveRent - monthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  // ==========================================
  // PROPERTY APPRECIATION CALCULATION
  // ==========================================
  // Formula: Future Value = Current Value × (1 + appreciation rate)^years
  //
  // Compound appreciation over hold period
  // Example: $200K × (1.03)^5 = $200K × 1.159 = $231,855 after 5 years
  const futureValue =
    inputs.arv * Math.pow(1 + rentalParams.appreciationRate, rentalParams.holdYears);

  // Selling costs when eventually sold (8% commission + closing)
  const sellingCosts = futureValue * RETAIL_SELLING_RATE;

  // ==========================================
  // TOTAL RENTAL INCOME WITH RENT INCREASES
  // ==========================================
  // Rent increases compound annually - calculate year-by-year
  // Formula: Rent_year_n = Initial Rent × (1 + increase rate)^(n-1)
  //
  // Example with $1,500/mo starting rent, 3% annual increase, 5-year hold:
  // Year 1: $1,500 × 12 × 0.92 = $16,560
  // Year 2: $1,545 × 12 × 0.92 = $17,057
  // Year 3: $1,591 × 12 × 0.92 = $17,569
  // Year 4: $1,639 × 12 × 0.92 = $18,096
  // Year 5: $1,688 × 12 × 0.92 = $18,639
  // Total: $87,921 over 5 years
  let totalRentalIncome = 0;
  let currentRent = rentalParams.monthlyRent;
  for (let year = 1; year <= rentalParams.holdYears; year++) {
    // Add this year's effective rental income (gross rent × 12 months × occupancy)
    totalRentalIncome += currentRent * 12 * (1 - rentalParams.vacancyRate);
    // Increase rent for next year
    currentRent *= 1 + rentalParams.rentIncreaseRate;
  }

  const grossRevenue = futureValue + totalRentalIncome;
  const totalExpenses = monthlyExpenses * 12 * rentalParams.holdYears + sellingCosts;
  const netProfit = grossRevenue - totalExpenses - totalInvestment;
  const netROI = calculateNetROI(totalInvestment, netProfit);

  // ==========================================
  // RENTAL HOLD IRR CALCULATION
  // ==========================================
  // Calculate IRR with annual cash flows (rental income + appreciation)
  //
  // Cash Flow Structure:
  // Year 0: -$150,000 (initial investment)
  // Year 1: +$6,360 (annual cash flow)
  // Year 2: +$6,551 (cash flow with 3% rent increase)
  // Year 3: +$6,747
  // Year 4: +$6,950
  // Year 5: +$7,158 + $231,855 (final cash flow + sale proceeds)
  //
  // This captures both:
  // 1. Operating income (annual rent minus expenses)
  // 2. Capital appreciation (property value growth)

  const cashFlows: number[] = [-totalInvestment];

  // Add annual operating cash flows (years 1 to n-1)
  // Each year's rent is compounded by rent increase rate
  for (let year = 1; year < rentalParams.holdYears; year++) {
    cashFlows.push(annualCashFlow * Math.pow(1 + rentalParams.rentIncreaseRate, year - 1));
  }

  // Final year: Operating cash flow + sale proceeds (net of selling costs)
  // Example Year 5: $7,158 operating + $213,513 net sale = $220,671 total
  cashFlows.push(
    futureValue - sellingCosts +  // Property sale proceeds (net)
    annualCashFlow * Math.pow(1 + rentalParams.rentIncreaseRate, rentalParams.holdYears - 1)  // Final year cash flow
  );

  // Calculate annual IRR directly (no need to annualize - already annual cash flows)
  const annualIRR = calculateIRR(cashFlows);

  // Cap rate and cash-on-cash
  const capRate = calculateCapRate(annualCashFlow, inputs.arv) * 100;
  const cashOnCash = calculateCashOnCash(annualCashFlow, totalInvestment) * 100;

  // RISK ASSESSMENT
  // Risk Level 4 (MODERATE) because:
  // - Tenant/vacancy risk
  // - Long-term capital commitment
  // - Property management burden
  // - But: lower than flip due to diversified income (monthly rent + appreciation)
  const riskLevel = 4;

  // Risk-Adjusted Return: Adjust ROI downward based on risk
  // Formula: Adjusted = ROI × (1 - Risk/20)
  // Example: 50% ROI with Risk 4 → 0.50 × (1 - 0.20) = 40% adjusted
  const riskAdjustedReturn = netROI * (1 - riskLevel / 20);

  const recommendationScore = calculateStrategyScore({
    netROI,
    irr: annualIRR,
    riskLevel,
    timeToExit: rentalParams.holdYears * 12,
    cashRequired: totalInvestment,
    availableCash: inputs.availableCash,
    investorExperience: inputs.investorExperience,
    strategy: 'rental_hold',
  });

  return {
    strategy: 'rental_hold',
    strategyName: 'Buy and Hold Rental',
    description: 'Hold the property long-term for rental income and appreciation',
    totalInvestment,
    grossRevenue,
    netProfit,
    netROI: netROI * 100,
    irr: (isNaN(annualIRR) ? 0 : annualIRR) * 100,
    timeToExitMonths: rentalParams.holdYears * 12,
    monthlyCashFlow,
    riskLevel,
    risks: [
      'Tenant issues and vacancies',
      'Property management burden',
      'Market depreciation risk',
      'Unexpected repairs',
    ],
    riskAdjustedReturn: riskAdjustedReturn * 100,
    cashRequired: totalInvestment,
    financingRequired: totalInvestment > (inputs.availableCash || 0),
    skillLevel: 'intermediate',
    requirements: [
      'Long-term capital commitment',
      'Property management capability',
      'Reserve funds for repairs',
      'Landlord knowledge',
    ],
    pros: [
      'Passive monthly income',
      'Long-term appreciation',
      'Tax benefits (depreciation)',
      'Building equity over time',
      `${capRate.toFixed(1)}% Cap Rate`,
      `${cashOnCash.toFixed(1)}% Cash-on-Cash`,
    ],
    cons: [
      'Capital tied up long-term',
      'Management responsibility',
      'Vacancy and maintenance costs',
      'Less liquid investment',
    ],
    recommendationScore,
    recommendationNotes: `Rental offers ${formatCurrency(monthlyCashFlow)}/mo cash flow with ${rentalParams.holdYears}-year ${formatPercent(netROI)} total return.`,
  };
}

/**
 * Analyze lease-option strategy
 */
export function analyzeLeaseOptionStrategy(
  inputs: ExitStrategyInputs,
  params?: Partial<LeaseOptionParams>
): ExitStrategyAnalysis {
  // Default lease-option parameters
  const leaseParams: LeaseOptionParams = {
    monthlyRent: params?.monthlyRent || inputs.monthlyRent || estimateRent(inputs),
    rentCredit: params?.rentCredit || (inputs.monthlyRent || estimateRent(inputs)) * 0.25,
    optionFee: params?.optionFee || inputs.arv * 0.03,
    exercisePrice: params?.exercisePrice || inputs.arv * 1.05,
    leaseTermMonths: params?.leaseTermMonths || 24,
    exerciseProbability: params?.exerciseProbability || 0.6,
  };

  // Light rehab for rent-ready condition
  const rehabCost = Math.min(inputs.rehabCost * 0.5, inputs.currentMarketValue * 0.05);
  const totalInvestment = inputs.acquisitionPrice + inputs.closingCosts + rehabCost;

  // Monthly income during lease
  const monthlyExpenses = estimateMonthlyOperatingExpenses(inputs);
  const monthlyCashFlow = leaseParams.monthlyRent - monthlyExpenses;

  // ==========================================
  // EXPECTED VALUE CALCULATION
  // ==========================================
  // Lease-option has TWO possible outcomes - we calculate the expected value
  // using probability-weighted scenarios.
  //
  // FORMULA: E[Profit] = P(exercise) × Profit_exercise + P(no_exercise) × Profit_no_exercise

  // SCENARIO 1: Tenant Exercises Option (Buys the Property)
  // Profit Components:
  // 1. Exercise price received from tenant
  // 2. Upfront option fee (non-refundable)
  // 3. Net cash flow during lease term
  // 4. Less: Total investment
  //
  // Example: $200K exercise + $6K option fee + $12K net cash flow - $150K investment = $68K
  const exerciseScenario = {
    profit:
      leaseParams.exercisePrice +       // Sale price if option exercised
      leaseParams.optionFee +            // Upfront non-refundable fee
      monthlyCashFlow * leaseParams.leaseTermMonths -  // Cumulative cash flow
      totalInvestment,                   // Initial capital invested
  };

  // SCENARIO 2: Tenant Does NOT Exercise Option (We Sell on Market)
  // Profit Components:
  // 1. Option fee kept (non-refundable)
  // 2. Net cash flow during lease term
  // 3. Property sold at ARV after lease ends
  // 4. Less: Selling costs (8% commission + closing)
  // 5. Less: Total investment
  //
  // Example: $6K option fee + $12K cash flow + $180K ARV - $14.4K costs - $150K = $33.6K
  const noExerciseScenario = {
    profit:
      leaseParams.optionFee +            // Keep non-refundable option fee
      monthlyCashFlow * leaseParams.leaseTermMonths +  // Cumulative cash flow
      inputs.arv -                       // Sell property at ARV
      inputs.arv * RETAIL_SELLING_RATE - // Deduct selling costs (8%)
      totalInvestment,                   // Initial capital invested
  };

  // EXPECTED VALUE = Weighted Average of Both Scenarios
  // Formula: E[Profit] = P₁ × Profit₁ + P₂ × Profit₂
  //
  // Example with 60% exercise probability:
  // E[Profit] = 0.60 × $68K + 0.40 × $33.6K = $40.8K + $13.44K = $54.24K
  //
  // Rationale: Accounts for uncertainty in tenant's decision
  // Higher exercise probability → outcome closer to exercise scenario
  const expectedProfit =
    exerciseScenario.profit * leaseParams.exerciseProbability +
    noExerciseScenario.profit * (1 - leaseParams.exerciseProbability);

  const grossRevenue = totalInvestment + expectedProfit;
  const netROI = calculateNetROI(totalInvestment, expectedProfit);

  // Simplified IRR calculation
  const cashFlows = [
    -totalInvestment + leaseParams.optionFee,
    ...Array(leaseParams.leaseTermMonths - 1).fill(monthlyCashFlow),
    monthlyCashFlow + leaseParams.exercisePrice * leaseParams.exerciseProbability +
    (inputs.arv - inputs.arv * RETAIL_SELLING_RATE) * (1 - leaseParams.exerciseProbability),
  ];
  const monthlyIRR = calculateIRR(cashFlows);
  const irr = annualizeMonthlyIRR(monthlyIRR);

  // RISK ASSESSMENT
  // Risk Level 5 (MODERATE-HIGH) because:
  // - Tenant may not exercise option (60% probability typical)
  // - Legal complexity of lease-option contracts
  // - Property damage during lease period
  // - Market may change during lease term
  const riskLevel = 5;

  // Risk-Adjusted Return: Penalize for uncertainty in outcome
  // Formula: Adjusted = ROI × (1 - Risk/20)
  // Example: 35% ROI with Risk 5 → 0.35 × (1 - 0.25) = 26.25% adjusted
  const riskAdjustedReturn = netROI * (1 - riskLevel / 20);

  const recommendationScore = calculateStrategyScore({
    netROI,
    irr,
    riskLevel,
    timeToExit: leaseParams.leaseTermMonths,
    cashRequired: totalInvestment,
    availableCash: inputs.availableCash,
    investorExperience: inputs.investorExperience,
    strategy: 'lease_option',
  });

  return {
    strategy: 'lease_option',
    strategyName: 'Lease Option',
    description: 'Lease to tenant with option to purchase, collecting rent and option fee',
    totalInvestment,
    grossRevenue,
    netProfit: expectedProfit,
    netROI: netROI * 100,
    irr: (isNaN(irr) ? 0 : irr) * 100,
    timeToExitMonths: leaseParams.leaseTermMonths,
    monthlyCashFlow,
    riskLevel,
    risks: [
      'Tenant may not exercise option',
      'Property damage during lease',
      'Legal complexity',
      'Market changes during term',
    ],
    riskAdjustedReturn: riskAdjustedReturn * 100,
    cashRequired: totalInvestment,
    financingRequired: totalInvestment > (inputs.availableCash || 0),
    skillLevel: 'intermediate',
    requirements: [
      'Strong lease-option contract',
      'Tenant screening ability',
      'Legal knowledge',
      'Property management skills',
    ],
    pros: [
      'Upfront option fee income',
      'Higher rent than market',
      'Tenant maintains property',
      'Multiple exit scenarios',
    ],
    cons: [
      'Legal complexity',
      'Option may not be exercised',
      'Less control during lease',
      'Potential tenant disputes',
    ],
    recommendationScore,
    recommendationNotes: `Lease-option provides ${formatCurrency(leaseParams.optionFee)} upfront plus ${formatCurrency(monthlyCashFlow)}/mo with ${Math.round(leaseParams.exerciseProbability * 100)}% exercise probability.`,
  };
}

/**
 * Analyze owner financing strategy
 */
export function analyzeOwnerFinanceStrategy(
  inputs: ExitStrategyInputs,
  params?: Partial<OwnerFinanceParams>
): ExitStrategyAnalysis {
  // Default owner finance parameters
  const financeParams: OwnerFinanceParams = {
    salePrice: params?.salePrice || inputs.arv,
    downPayment: params?.downPayment || inputs.arv * 0.10,
    interestRate: params?.interestRate || 0.08,
    termYears: params?.termYears || 30,
    balloonYears: params?.balloonYears || 5,
  };

  // Light rehab for sale-ready condition
  const rehabCost = Math.min(inputs.rehabCost * 0.3, inputs.currentMarketValue * 0.05);
  const holdingMonths = 3; // Time to find buyer
  const holdingCosts = estimateMonthlyHoldingCosts(inputs) * holdingMonths;
  const totalInvestment =
    inputs.acquisitionPrice + inputs.closingCosts + rehabCost + holdingCosts;

  // ==========================================
  // AMORTIZATION CALCULATION (Loan Payment Formula)
  // ==========================================
  // Calculate monthly payment buyer will pay to seller

  // Loan amount = Sale price minus down payment
  // Example: $200K sale - $20K down = $180K financed
  const loanAmount = financeParams.salePrice - financeParams.downPayment;
  const monthlyRate = financeParams.interestRate / 12;  // Annual rate ÷ 12
  const totalPayments = financeParams.termYears * 12;   // 30 years × 12 = 360 payments

  // MONTHLY PAYMENT FORMULA:
  // For interest-bearing loan: M = P × [r(1+r)^n] / [(1+r)^n - 1]
  // Where: M = monthly payment, P = principal, r = monthly rate, n = total payments
  //
  // For 0% interest: M = P / n (simple division)
  let monthlyPayment: number;
  if (monthlyRate === 0) {
    // Zero-interest loan: equal principal payments
    monthlyPayment = loanAmount / totalPayments;
  } else {
    // Standard amortizing loan formula
    // Example: $180K @ 8% for 30 years = $1,321/mo
    const factor = Math.pow(1 + monthlyRate, totalPayments);
    monthlyPayment = (loanAmount * monthlyRate * factor) / (factor - 1);
  }

  // ==========================================
  // BALLOON PAYMENT CALCULATION
  // ==========================================
  // If balloon payment specified, loan comes due early (typically 3-5 years)
  // Payments are amortized over 30 years but balance due in 5 years
  //
  // Example: 30-year amortization, 5-year balloon
  // - Monthly payment: $1,321 (based on 30 years)
  // - After 60 payments: Remaining balance ~$172K due as balloon

  // Effective term = When loan actually ends (balloon or full term)
  const effectiveTermMonths = financeParams.balloonYears > 0
    ? financeParams.balloonYears * 12  // Balloon: loan due early
    : financeParams.termYears * 12;    // Full term: standard amortization

  // AMORTIZATION SCHEDULE CALCULATION
  // Calculate remaining balance after effective term
  // Each payment = interest on balance + principal reduction
  //
  // Formula per month:
  // Interest = Balance × Monthly Rate
  // Principal = Payment - Interest
  // New Balance = Old Balance - Principal
  let balance = loanAmount;
  let totalInterest = 0;
  for (let month = 1; month <= effectiveTermMonths; month++) {
    const interest = balance * monthlyRate;        // Interest portion
    const principal = monthlyPayment - interest;   // Principal portion
    totalInterest += interest;                     // Accumulate interest income
    balance -= principal;                          // Reduce loan balance
  }

  // Final balloon payment = Remaining balance after term
  // Example: After 5 years of $1,321 payments on $180K loan → $172K balloon due

  const totalPaymentsReceived = monthlyPayment * effectiveTermMonths + balance;
  const grossRevenue = financeParams.downPayment + totalPaymentsReceived;
  const netProfit = grossRevenue - totalInvestment;
  const netROI = calculateNetROI(totalInvestment, netProfit);

  // IRR calculation
  const cashFlows: number[] = [-totalInvestment + financeParams.downPayment];
  for (let month = 1; month < effectiveTermMonths; month++) {
    cashFlows.push(monthlyPayment);
  }
  cashFlows.push(monthlyPayment + balance); // Final payment + balloon

  const monthlyIRR = calculateIRR(cashFlows);
  const irr = annualizeMonthlyIRR(monthlyIRR);

  // RISK ASSESSMENT
  // Risk Level 6 (MODERATE-HIGH) because:
  // - Buyer default risk (foreclosure costs ~$5K-$10K)
  // - Capital tied up long-term (3-5 years minimum)
  // - Note servicing complexity
  // - Legal/compliance requirements (state-specific)
  // - Higher than rental due to concentrated credit risk on single buyer
  const riskLevel = 6;

  // Risk-Adjusted Return: Significant penalty for default risk
  // Formula: Adjusted = ROI × (1 - Risk/20)
  // Example: 40% ROI with Risk 6 → 0.40 × (1 - 0.30) = 28% adjusted
  const riskAdjustedReturn = netROI * (1 - riskLevel / 20);

  const recommendationScore = calculateStrategyScore({
    netROI,
    irr,
    riskLevel,
    timeToExit: effectiveTermMonths,
    cashRequired: totalInvestment,
    availableCash: inputs.availableCash,
    investorExperience: inputs.investorExperience,
    strategy: 'owner_finance',
  });

  return {
    strategy: 'owner_finance',
    strategyName: 'Owner Financing',
    description: 'Sell with seller financing, collecting payments over time with interest',
    totalInvestment,
    grossRevenue,
    netProfit,
    netROI: netROI * 100,
    irr: (isNaN(irr) ? 0 : irr) * 100,
    timeToExitMonths: effectiveTermMonths,
    monthlyCashFlow: monthlyPayment,
    riskLevel,
    risks: [
      'Buyer default risk',
      'Foreclosure costs if default',
      'Capital tied up long-term',
      'Interest rate risk',
    ],
    riskAdjustedReturn: riskAdjustedReturn * 100,
    cashRequired: totalInvestment,
    financingRequired: totalInvestment > (inputs.availableCash || 0),
    skillLevel: 'advanced',
    requirements: [
      'Note servicing capability',
      'Legal/contract expertise',
      'Default/foreclosure knowledge',
      'Long-term capital availability',
    ],
    pros: [
      'Higher sale price possible',
      'Monthly passive income',
      'Interest income over time',
      'Tax advantages (installment sale)',
    ],
    cons: [
      'Default risk',
      'Capital tied up long-term',
      'Servicing complexity',
      'Potential foreclosure costs',
    ],
    recommendationScore,
    recommendationNotes: `Owner financing yields ${formatCurrency(monthlyPayment)}/mo over ${financeParams.balloonYears || financeParams.termYears} years with ${formatPercent(financeParams.interestRate)} interest.`,
  };
}

// ============================================
// Comparison Functions
// ============================================

/**
 * Compare all exit strategies for a property
 *
 * @param inputs Exit strategy inputs
 * @returns Complete comparison of all strategies
 */
export function compareExitStrategies(
  inputs: ExitStrategyInputs
): ExitStrategyComparison {
  // Analyze all strategies
  const strategies: ExitStrategyAnalysis[] = [
    analyzeFlipStrategy(inputs),
    analyzeWholesaleStrategy(inputs),
    analyzeRentalStrategy(inputs),
    analyzeLeaseOptionStrategy(inputs),
    analyzeOwnerFinanceStrategy(inputs),
  ];

  // Sort by recommendation score
  const ranking = strategies
    .map((s) => ({
      strategy: s.strategy,
      score: s.recommendationScore,
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  // Determine recommended strategy
  const recommended = ranking[0];
  const confidence = calculateRecommendationConfidence(strategies, recommended.strategy);

  return {
    inputs,
    strategies,
    recommendedStrategy: recommended.strategy,
    recommendationConfidence: confidence,
    ranking,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Get best strategy for specific investor profile
 *
 * @param comparison Full comparison result
 * @param profile Investor profile constraints
 * @returns Best matching strategy
 */
export function getBestStrategyForProfile(
  comparison: ExitStrategyComparison,
  profile: {
    maxCash?: number;
    preferPassive?: boolean;
    riskTolerance?: 'low' | 'medium' | 'high';
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
    targetHoldTime?: 'short' | 'medium' | 'long';
  }
): ExitStrategyAnalysis | null {
  let candidates = [...comparison.strategies];

  // Filter by cash requirement
  if (profile.maxCash) {
    candidates = candidates.filter((s) => s.cashRequired <= profile.maxCash!);
  }

  // Filter by risk tolerance
  if (profile.riskTolerance === 'low') {
    candidates = candidates.filter((s) => s.riskLevel <= 4);
  } else if (profile.riskTolerance === 'high') {
    candidates = candidates.filter((s) => s.riskLevel >= 5);
  }

  // Filter by experience level
  if (profile.experienceLevel === 'beginner') {
    candidates = candidates.filter((s) => s.skillLevel === 'beginner');
  }

  // Filter by hold time preference
  if (profile.targetHoldTime === 'short') {
    candidates = candidates.filter((s) => s.timeToExitMonths <= 6);
  } else if (profile.targetHoldTime === 'long') {
    candidates = candidates.filter((s) => s.timeToExitMonths >= 24);
  }

  // Sort by preference (passive income vs. total return)
  if (profile.preferPassive) {
    candidates.sort((a, b) => b.monthlyCashFlow - a.monthlyCashFlow);
  } else {
    candidates.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  return candidates[0] || null;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Categorize rehab scope based on costs
 */
function categorizeRehabScope(
  rehabCost: number,
  arv: number
): 'cosmetic' | 'light' | 'moderate' | 'heavy' | 'gut' {
  const rehabPercent = rehabCost / arv;
  if (rehabPercent < 0.05) return 'cosmetic';
  if (rehabPercent < 0.10) return 'light';
  if (rehabPercent < 0.20) return 'moderate';
  if (rehabPercent < 0.35) return 'heavy';
  return 'gut';
}

/**
 * Estimate monthly rent for a property
 */
function estimateRent(inputs: ExitStrategyInputs): number {
  // Rule of thumb: 0.8-1.0% of property value per month
  // Adjust for bedrooms and market condition
  const baseRent = inputs.currentMarketValue * 0.009;
  const bedroomFactor = inputs.bedrooms ? 1 + (inputs.bedrooms - 3) * 0.05 : 1;
  const marketFactor =
    inputs.marketCondition === 'hot' ? 1.1 :
    inputs.marketCondition === 'slow' ? 0.9 :
    inputs.marketCondition === 'declining' ? 0.85 : 1.0;

  return Math.round(baseRent * bedroomFactor * marketFactor);
}

/**
 * Estimate monthly insurance cost
 */
function estimateMonthlyInsurance(propertyValue: number, state: string): number {
  const annualRate = 0.004; // ~0.4% of property value
  return (propertyValue * annualRate) / 12;
}

/**
 * Estimate monthly operating expenses
 */
function estimateMonthlyOperatingExpenses(inputs: ExitStrategyInputs): number {
  const taxes = (inputs.annualTaxes || inputs.currentMarketValue * 0.015) / 12;
  const insurance = estimateMonthlyInsurance(inputs.currentMarketValue, inputs.state);
  const hoa = inputs.monthlyHoa || 0;
  const maintenance = (inputs.monthlyRent || estimateRent(inputs)) * 0.10;

  return taxes + insurance + hoa + maintenance;
}

/**
 * Estimate monthly holding costs
 */
function estimateMonthlyHoldingCosts(inputs: ExitStrategyInputs): number {
  const taxes = (inputs.annualTaxes || inputs.currentMarketValue * 0.015) / 12;
  const insurance = estimateMonthlyInsurance(inputs.currentMarketValue, inputs.state) * 1.5;
  const utilities = 150;

  return taxes + insurance + utilities;
}

/**
 * Calculate flip strategy risk level (1-10 scale)
 *
 * RISK ASSESSMENT FORMULA:
 * Base Risk = 5 (moderate baseline)
 * + Market Condition Adjustment (-1 to +2)
 * + Rehab Scope Adjustment (0 to +2)
 * + Property Age Adjustment (0 to +1)
 * = Final Risk (capped at 1-10)
 *
 * @param inputs Exit strategy inputs
 * @returns Risk level from 1 (lowest) to 10 (highest)
 */
function calculateFlipRiskLevel(inputs: ExitStrategyInputs): number {
  // Start with moderate baseline risk
  let risk = 5;

  // MARKET CONDITION IMPACT (-1 to +2 points)
  // Hot market: Reduces risk due to faster sales and price appreciation
  if (inputs.marketCondition === 'hot') risk -= 1;

  // Slow market: Increases risk due to longer holding times
  if (inputs.marketCondition === 'slow') risk += 1;

  // Declining market: Significant risk increase - property may lose value during rehab
  if (inputs.marketCondition === 'declining') risk += 2;

  // REHAB SCOPE IMPACT (0 to +2 points)
  // Higher rehab costs = higher risk of budget overruns and timeline delays
  const rehabPercent = inputs.rehabCost / inputs.arv;

  // Heavy rehab (>30% of ARV): Major structural work, high budget risk
  if (rehabPercent > 0.30) risk += 2;
  // Moderate rehab (>20% of ARV): Significant scope, moderate budget risk
  else if (rehabPercent > 0.20) risk += 1;
  // Light/cosmetic (<20%): Lower risk of overruns

  // PROPERTY AGE IMPACT (0 to +1 points)
  // Older properties have higher risk of hidden issues (foundation, electrical, plumbing)
  const age = inputs.yearBuilt ? new Date().getFullYear() - inputs.yearBuilt : 30;

  // Properties over 50 years old: Increased risk of code compliance issues
  if (age > 50) risk += 1;

  // Clamp final risk between 1 (minimum) and 10 (maximum)
  return Math.min(10, Math.max(1, risk));
}

/**
 * Get flip strategy risks
 */
function getFlipRisks(inputs: ExitStrategyInputs): string[] {
  const risks: string[] = [];

  if (inputs.marketCondition === 'declining') {
    risks.push('Declining market may reduce ARV');
  }
  if (inputs.rehabCost / inputs.arv > 0.25) {
    risks.push('High rehab costs increase budget risk');
  }
  if (inputs.yearBuilt && new Date().getFullYear() - inputs.yearBuilt > 50) {
    risks.push('Older property may have hidden issues');
  }
  if (!inputs.sqft || inputs.sqft < 1000) {
    risks.push('Smaller homes may have limited buyer pool');
  }

  risks.push('Market timing risk');
  risks.push('Contractor reliability');

  return risks;
}

/**
 * Calculate strategy recommendation score (0-100)
 *
 * SCORING FORMULA:
 * Base Score = 50 points
 * + ROI Contribution (max +30 points)
 * + IRR Contribution (max +20 points)
 * - Risk Penalty (max -20 points)
 * + Time Efficiency Bonus (max +10 points, flip/wholesale only)
 * - Cash Feasibility Penalty (max -20 points)
 * = Final Score (0-100, clamped)
 *
 * This multi-factor scoring balances profitability, risk, and feasibility
 * to recommend the most suitable strategy for the investor.
 *
 * @param params Strategy parameters for scoring
 * @returns Recommendation score from 0-100 (higher = better)
 */
function calculateStrategyScore(params: {
  netROI: number;
  irr: number;
  riskLevel: number;
  timeToExit: number;
  cashRequired: number;
  availableCash?: number;
  investorExperience?: 'beginner' | 'intermediate' | 'advanced';
  strategy: ExitStrategyType;
}): number {
  // Start with neutral baseline score
  let score = 50;

  // ==========================================
  // ROI CONTRIBUTION (max +30 points)
  // ==========================================
  // Formula: ROI × 50, capped at 30
  //
  // Examples:
  // - 20% ROI → +10 points
  // - 40% ROI → +20 points
  // - 60% ROI → +30 points (capped)
  //
  // Rationale: Higher returns are better, but diminishing returns above 60%
  score += Math.min(30, params.netROI * 50);

  // ==========================================
  // IRR CONTRIBUTION (max +20 points)
  // ==========================================
  // Formula: IRR × 40, capped at 20
  //
  // Examples:
  // - 15% IRR → +6 points
  // - 30% IRR → +12 points
  // - 50% IRR → +20 points (capped)
  //
  // Rationale: IRR captures time value of money - critical for comparing
  // short-term (flip) vs. long-term (rental) strategies
  const irrValue = isNaN(params.irr) ? 0 : params.irr;
  score += Math.min(20, irrValue * 40);

  // ==========================================
  // RISK PENALTY (max -20 points)
  // ==========================================
  // Formula: Risk Level × 2
  //
  // Examples:
  // - Risk Level 3 → -6 points
  // - Risk Level 5 → -10 points
  // - Risk Level 8 → -16 points
  //
  // Rationale: Higher risk requires proportional score reduction
  // Risk Level 10 reduces score by 20 points (significant penalty)
  score -= params.riskLevel * 2;

  // ==========================================
  // TIME EFFICIENCY BONUS (max +10 points, flip/wholesale only)
  // ==========================================
  // Short-term strategies benefit from quick exits:
  // - ≤6 months: +5 points (good velocity)
  // - ≤3 months: +10 points total (excellent velocity)
  //
  // Rationale: Quick turnaround allows capital recycling and compounds returns
  // Only applies to flip/wholesale (not rental/hold strategies)
  if (params.strategy === 'flip' || params.strategy === 'wholesale') {
    if (params.timeToExit <= 6) score += 5;
    if (params.timeToExit <= 3) score += 5; // Cumulative
  }

  // ==========================================
  // CASH FEASIBILITY PENALTY (max -20 points)
  // ==========================================
  // Formula: ((Required / Available) - 1) × 10, capped at 20
  //
  // Examples:
  // - Need $100K, have $100K → 0 penalty (feasible)
  // - Need $150K, have $100K → -5 points (50% shortfall)
  // - Need $200K, have $100K → -10 points (100% shortfall)
  // - Need $300K, have $100K → -20 points (capped)
  //
  // Rationale: Strategy must be financially achievable for investor
  // Large shortfalls significantly reduce recommendation score
  if (params.availableCash && params.cashRequired > params.availableCash) {
    score -= Math.min(20, (params.cashRequired / params.availableCash - 1) * 10);
  }

  // Clamp final score between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate recommendation confidence (0-100)
 *
 * CONFIDENCE FORMULA:
 * Base Confidence = 50 (neutral)
 * + Score Gap (difference between #1 and #2 strategies)
 * = Final Confidence (capped at 95)
 *
 * This measures how definitive the recommendation is:
 * - Large gap → High confidence (clear winner)
 * - Small gap → Low confidence (close call)
 *
 * Examples:
 * - Flip: 85, Rental: 45 → Gap: 40 → Confidence: 90% (very confident)
 * - Flip: 75, Rental: 70 → Gap: 5 → Confidence: 55% (not confident)
 * - Flip: 80, Rental: 50 → Gap: 30 → Confidence: 80% (confident)
 *
 * @param strategies All analyzed strategies
 * @param recommendedStrategy The top-ranked strategy
 * @returns Confidence score (0-100)
 */
function calculateRecommendationConfidence(
  strategies: ExitStrategyAnalysis[],
  recommendedStrategy: ExitStrategyType
): number {
  // Find the recommended strategy in the list
  const recommended = strategies.find((s) => s.strategy === recommendedStrategy);
  if (!recommended) return 50; // Default if not found

  // Get all scores and sort descending
  const scores = strategies.map((s) => s.recommendationScore);
  const topScore = recommended.recommendationScore;    // #1 strategy score
  const secondScore = scores.sort((a, b) => b - a)[1] || 0;  // #2 strategy score

  // Calculate gap between top two strategies
  // Larger gap = more confident in recommendation
  // Example: 85 - 45 = 40 point gap → Very confident
  const gap = topScore - secondScore;

  // Base confidence: 50 (neutral)
  // Add gap: Directly increases confidence
  // Cap at 95: Never 100% confident (always some uncertainty)
  return Math.min(95, 50 + gap);
}

/**
 * Generate flip recommendation text
 */
function generateFlipRecommendation(
  inputs: ExitStrategyInputs,
  netROI: number,
  holdingMonths: number
): string {
  if (netROI > 0.3) {
    return `Excellent flip opportunity with ${formatPercent(netROI)} ROI in ${holdingMonths} months. Strong profit potential.`;
  } else if (netROI > 0.15) {
    return `Good flip opportunity with ${formatPercent(netROI)} ROI. Consider market timing carefully.`;
  } else if (netROI > 0) {
    return `Marginal flip opportunity with ${formatPercent(netROI)} ROI. Consider alternative strategies.`;
  }
  return `Flip not recommended - projected ${formatPercent(netROI)} ROI is too low.`;
}

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage value
 */
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
