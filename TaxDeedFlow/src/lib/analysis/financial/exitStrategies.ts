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

/** Selling cost rate for retail sale (agent commission + closing) */
const RETAIL_SELLING_RATE = 0.08;

/** Wholesale fee as percentage of ARV (typical range) */
const WHOLESALE_FEE_RATE = 0.05;

/** Typical property management fee */
const PROPERTY_MANAGEMENT_RATE = 0.10;

/** Typical vacancy rate for rentals */
const DEFAULT_VACANCY_RATE = 0.08;

/** Typical maintenance reserve percentage */
const DEFAULT_MAINTENANCE_RATE = 0.10;

/** Annual appreciation rate assumption */
const DEFAULT_APPRECIATION_RATE = 0.03;

/** Risk-free rate for Sharpe-like calculations */
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

  // Calculate IRR
  const cashFlows = [
    -totalInvestment,
    ...Array(holdingMonths - 1).fill(0),
    inputs.arv - sellingCosts,
  ];
  const monthlyIRR = calculateIRR(cashFlows);
  const irr = annualizeMonthlyIRR(monthlyIRR);

  // Risk assessment
  const riskLevel = calculateFlipRiskLevel(inputs);
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

  // Minimal holding time
  const holdingMonths = Math.ceil(wholesaleParams.daysToFindBuyer / 30);

  // Minimal costs (earnest money + marketing)
  const earnestMoney = Math.min(1000, inputs.acquisitionPrice * 0.01);
  const marketingCosts = 500;
  const totalInvestment = earnestMoney + marketingCosts + inputs.closingCosts * 0.2;

  const grossRevenue = wholesaleParams.assignmentFee;
  const netProfit = grossRevenue - totalInvestment;
  const netROI = calculateNetROI(totalInvestment, netProfit);

  // Calculate IRR (short term, high return)
  const cashFlows = [-totalInvestment, grossRevenue];
  const monthlyIRR = calculateIRR(cashFlows);
  const irr = annualizeMonthlyIRR(monthlyIRR);

  const riskLevel = 3; // Lower risk, lower reward
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

  // Monthly cash flow calculation
  const effectiveRent = rentalParams.monthlyRent * (1 - rentalParams.vacancyRate);
  const monthlyExpenses =
    (inputs.annualTaxes || inputs.currentMarketValue * 0.015) / 12 +
    (inputs.monthlyHoa || 0) +
    rentalParams.monthlyRent * rentalParams.maintenancePercent +
    rentalParams.monthlyRent * rentalParams.managementFeePercent +
    estimateMonthlyInsurance(inputs.currentMarketValue, inputs.state);

  const monthlyCashFlow = effectiveRent - monthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  // Future value after hold period
  const futureValue =
    inputs.arv * Math.pow(1 + rentalParams.appreciationRate, rentalParams.holdYears);
  const sellingCosts = futureValue * RETAIL_SELLING_RATE;

  // Total returns over hold period
  let totalRentalIncome = 0;
  let currentRent = rentalParams.monthlyRent;
  for (let year = 1; year <= rentalParams.holdYears; year++) {
    totalRentalIncome += currentRent * 12 * (1 - rentalParams.vacancyRate);
    currentRent *= 1 + rentalParams.rentIncreaseRate;
  }

  const grossRevenue = futureValue + totalRentalIncome;
  const totalExpenses = monthlyExpenses * 12 * rentalParams.holdYears + sellingCosts;
  const netProfit = grossRevenue - totalExpenses - totalInvestment;
  const netROI = calculateNetROI(totalInvestment, netProfit);

  // Calculate IRR with annual cash flows
  const cashFlows: number[] = [-totalInvestment];
  for (let year = 1; year < rentalParams.holdYears; year++) {
    cashFlows.push(annualCashFlow * Math.pow(1 + rentalParams.rentIncreaseRate, year - 1));
  }
  cashFlows.push(
    futureValue - sellingCosts +
    annualCashFlow * Math.pow(1 + rentalParams.rentIncreaseRate, rentalParams.holdYears - 1)
  );
  const annualIRR = calculateIRR(cashFlows);

  // Cap rate and cash-on-cash
  const capRate = calculateCapRate(annualCashFlow, inputs.arv) * 100;
  const cashOnCash = calculateCashOnCash(annualCashFlow, totalInvestment) * 100;

  const riskLevel = 4; // Moderate risk
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

  // Calculate expected value based on exercise probability
  const exerciseScenario = {
    profit:
      leaseParams.exercisePrice +
      leaseParams.optionFee +
      monthlyCashFlow * leaseParams.leaseTermMonths -
      totalInvestment,
  };

  const noExerciseScenario = {
    profit:
      leaseParams.optionFee +
      monthlyCashFlow * leaseParams.leaseTermMonths +
      inputs.arv -
      inputs.arv * RETAIL_SELLING_RATE -
      totalInvestment,
  };

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

  const riskLevel = 5;
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

  // Calculate monthly payment received
  const loanAmount = financeParams.salePrice - financeParams.downPayment;
  const monthlyRate = financeParams.interestRate / 12;
  const totalPayments = financeParams.termYears * 12;

  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = loanAmount / totalPayments;
  } else {
    const factor = Math.pow(1 + monthlyRate, totalPayments);
    monthlyPayment = (loanAmount * monthlyRate * factor) / (factor - 1);
  }

  // Cash flows
  const effectiveTermMonths = financeParams.balloonYears > 0
    ? financeParams.balloonYears * 12
    : financeParams.termYears * 12;

  // Calculate remaining balance at balloon
  let balance = loanAmount;
  let totalInterest = 0;
  for (let month = 1; month <= effectiveTermMonths; month++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    totalInterest += interest;
    balance -= principal;
  }

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

  const riskLevel = 6; // Default risk
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
 * Calculate flip strategy risk level
 */
function calculateFlipRiskLevel(inputs: ExitStrategyInputs): number {
  let risk = 5; // Base risk

  // Market condition impact
  if (inputs.marketCondition === 'hot') risk -= 1;
  if (inputs.marketCondition === 'slow') risk += 1;
  if (inputs.marketCondition === 'declining') risk += 2;

  // Rehab scope impact
  const rehabPercent = inputs.rehabCost / inputs.arv;
  if (rehabPercent > 0.30) risk += 2;
  if (rehabPercent > 0.20) risk += 1;

  // Property age impact
  const age = inputs.yearBuilt ? new Date().getFullYear() - inputs.yearBuilt : 30;
  if (age > 50) risk += 1;

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
 * Calculate strategy recommendation score
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
  let score = 50; // Base score

  // ROI contribution (max 30 points)
  score += Math.min(30, params.netROI * 50);

  // IRR contribution (max 20 points)
  const irrValue = isNaN(params.irr) ? 0 : params.irr;
  score += Math.min(20, irrValue * 40);

  // Risk penalty (max -20 points)
  score -= params.riskLevel * 2;

  // Time efficiency bonus (shorter = better for flip/wholesale)
  if (params.strategy === 'flip' || params.strategy === 'wholesale') {
    if (params.timeToExit <= 6) score += 5;
    if (params.timeToExit <= 3) score += 5;
  }

  // Cash feasibility (max -20 points penalty)
  if (params.availableCash && params.cashRequired > params.availableCash) {
    score -= Math.min(20, (params.cashRequired / params.availableCash - 1) * 10);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate recommendation confidence
 */
function calculateRecommendationConfidence(
  strategies: ExitStrategyAnalysis[],
  recommendedStrategy: ExitStrategyType
): number {
  const recommended = strategies.find((s) => s.strategy === recommendedStrategy);
  if (!recommended) return 50;

  const scores = strategies.map((s) => s.recommendationScore);
  const topScore = recommended.recommendationScore;
  const secondScore = scores.sort((a, b) => b - a)[1] || 0;

  // Higher confidence if clear winner
  const gap = topScore - secondScore;
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
