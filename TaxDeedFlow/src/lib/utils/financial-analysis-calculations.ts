/**
 * Financial Analysis Calculations
 *
 * Calculates comprehensive financial projections for property investments
 * based on real property data, market data, and auction information.
 */

import { RealtyComparable } from '@/lib/api/services/realty-service';

/**
 * Comparable sale data for the UI
 */
export interface ComparableSale {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  salePrice: number;
  saleDate: string;
  sqft: number;
  lotSizeSqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  propertyType: string;
  pricePerSqft: number;
  distanceMiles: number;
  similarityScore: number;
  daysOnMarket?: number;
  source: string;
  photos?: string[];
}

/**
 * Complete financial analysis result
 */
export interface FinancialAnalysis {
  costs: {
    acquisition: {
      bidAmount: number;
      buyersPremium: number;
      transferTax: number;
      recordingFees: number;
      titleSearch: number;
      titleInsurance: number;
      legalFees: number;
      totalAcquisition: number;
    };
    rehab: {
      exterior: { roof: number; siding: number; windows: number; doors: number; landscaping: number; hardscape: number; total: number };
      interior: { flooring: number; paint: number; kitchen: number; bathrooms: number; electrical: number; plumbing: number; hvac: number; fixtures: number; total: number };
      structural: { foundation: number; framing: number; insulation: number; total: number };
      permits: number;
      laborMultiplier: number;
      materialMultiplier: number;
      totalRehab: number;
    };
    holding: {
      monthlyTaxes: number;
      monthlyInsurance: number;
      monthlyUtilities: number;
      monthlyMaintenance: number;
      monthlyLoanPayment: number;
      monthlyHoa: number;
      totalMonthly: number;
      holdingPeriodMonths: number;
      totalHolding: number;
    };
    selling: {
      agentCommission: number;
      closingCosts: number;
      staging: number;
      marketing: number;
      homeWarranty: number;
      sellerConcessions: number;
      totalSelling: number;
    };
    totalCosts: number;
    contingency: number;
    grandTotal: number;
    confidence: 'high' | 'medium' | 'low';
    dataQuality: number;
    warnings: string[];
  };
  revenue: {
    sale: {
      estimatedARV: number;
      lowEstimate: number;
      highEstimate: number;
      pricePerSqft: number;
      comparablesUsed: number;
      confidence: 'high' | 'medium' | 'low';
    };
    rental: {
      monthlyRent: number;
      annualGrossRent: number;
      vacancyRate: number;
      effectiveGrossIncome: number;
      annualOperatingExpenses: number;
      noi: number;
      monthlyCashFlow: number;
      annualCashFlow: number;
    };
  };
  metrics: {
    roi: number;
    profitMargin: number;
    priceToARV: number;
    totalInvestmentToARV: number;
    cashOnCash: number;
    netProfit: number;
    grossProfit: number;
    breakEvenPrice: number;
    irr: number;
    capRate: number;
  };
  comparables: {
    comparables: ComparableSale[];
    estimatedARV: number;
    arvLowRange: number;
    arvHighRange: number;
    averagePricePerSqft: number;
    medianPricePerSqft: number;
    comparablesCount: number;
    searchRadiusMiles: number;
    confidence: 'high' | 'medium' | 'low';
    dataSource: string;
    notes: string[];
  };
  recommendation: {
    verdict: 'strong_buy' | 'buy' | 'hold' | 'pass' | 'avoid';
    confidence: number;
    maxBid: number;
    targetProfit: number;
    keyFactors: string[];
    risks: string[];
    opportunities: string[];
    exitStrategy: 'flip' | 'rental' | 'wholesale' | 'hold';
    timelineMonths: number;
  };
  analysisDate: string;
  confidenceLevel: number;
  dataQuality: {
    overallScore: number;
    components: {
      comparablesQuality: number;
      costEstimateAccuracy: number;
      marketDataFreshness: number;
      propertyDataCompleteness: number;
    };
    missingData: string[];
    assumptions: string[];
  };
}

/**
 * Input data for financial analysis
 */
export interface FinancialAnalysisInput {
  // Property data
  property: {
    assessedValue?: number;
    marketValue?: number;
    buildingSqft?: number;
    lotSizeSqft?: number;
    yearBuilt?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
    taxAmount?: number;
  };

  // Auction data
  auction: {
    minimumBid?: number;
    saleType?: string;
    buyersPremiumPct?: number; // e.g., 0.10 for 10%
  };

  // Market data (from comparables)
  market?: {
    medianSalePrice?: number;
    avgPricePerSqft?: number;
    comparables?: RealtyComparable[];
  };

  // Tax history (from Zillow)
  taxHistory?: Array<{
    year: number;
    taxPaid: number;
    assessedValue?: number;
  }>;

  // User overrides (optional)
  overrides?: {
    estimatedARV?: number;
    rehabCostEstimate?: number;
    holdingPeriodMonths?: number;
    monthlyRentEstimate?: number;
  };
}

/**
 * Regional cost multipliers
 */
const REGIONAL_MULTIPLIERS: Record<string, { labor: number; materials: number }> = {
  PA: { labor: 0.95, materials: 1.02 },
  FL: { labor: 1.05, materials: 1.00 },
  TX: { labor: 0.92, materials: 0.98 },
  CA: { labor: 1.25, materials: 1.15 },
  NY: { labor: 1.20, materials: 1.10 },
  // Default for other states
  DEFAULT: { labor: 1.00, materials: 1.00 },
};

/**
 * Estimate rehab costs based on property age and type
 */
function estimateRehabCosts(
  property: FinancialAnalysisInput['property'],
  estimatedARV: number,
  stateCode: string = 'PA'
): FinancialAnalysis['costs']['rehab'] {
  const age = property.yearBuilt ? new Date().getFullYear() - property.yearBuilt : 40;
  const sqft = property.buildingSqft || 1500;
  const multipliers = REGIONAL_MULTIPLIERS[stateCode] || REGIONAL_MULTIPLIERS.DEFAULT;

  // Base rehab levels by property age
  let rehabLevel: 'light' | 'moderate' | 'heavy';
  if (age < 20) {
    rehabLevel = 'light';
  } else if (age < 40) {
    rehabLevel = 'moderate';
  } else {
    rehabLevel = 'heavy';
  }

  // Per sqft estimates by level
  const perSqftCosts = {
    light: { interior: 15, exterior: 5 },
    moderate: { interior: 30, exterior: 10 },
    heavy: { interior: 50, exterior: 20 },
  };

  const costs = perSqftCosts[rehabLevel];

  // Calculate component costs
  const exterior = {
    roof: rehabLevel === 'heavy' ? 8000 : 0,
    siding: rehabLevel === 'heavy' ? 5000 : 0,
    windows: rehabLevel !== 'light' ? 2500 : 0,
    doors: 500,
    landscaping: 1000,
    hardscape: 0,
    total: 0,
  };
  exterior.total = exterior.roof + exterior.siding + exterior.windows + exterior.doors + exterior.landscaping;

  const interior = {
    flooring: Math.round(sqft * (rehabLevel === 'light' ? 2 : rehabLevel === 'moderate' ? 4 : 6)),
    paint: Math.round(sqft * 1.5),
    kitchen: rehabLevel === 'light' ? 3000 : rehabLevel === 'moderate' ? 8000 : 15000,
    bathrooms: (property.bathrooms || 1) * (rehabLevel === 'light' ? 1500 : rehabLevel === 'moderate' ? 3500 : 6000),
    electrical: rehabLevel === 'heavy' ? 3000 : rehabLevel === 'moderate' ? 1500 : 500,
    plumbing: rehabLevel === 'heavy' ? 2500 : rehabLevel === 'moderate' ? 1000 : 0,
    hvac: rehabLevel === 'heavy' ? 6000 : 0,
    fixtures: 1500,
    total: 0,
  };
  interior.total = interior.flooring + interior.paint + interior.kitchen + interior.bathrooms +
    interior.electrical + interior.plumbing + interior.hvac + interior.fixtures;

  const structural = {
    foundation: 0,
    framing: 0,
    insulation: rehabLevel === 'heavy' ? 2000 : 0,
    total: 0,
  };
  structural.total = structural.foundation + structural.framing + structural.insulation;

  const permits = rehabLevel === 'light' ? 300 : rehabLevel === 'moderate' ? 500 : 1000;

  const subtotal = exterior.total + interior.total + structural.total + permits;
  const totalRehab = Math.round(subtotal * multipliers.labor * multipliers.materials);

  return {
    exterior,
    interior,
    structural,
    permits,
    laborMultiplier: multipliers.labor,
    materialMultiplier: multipliers.materials,
    totalRehab,
  };
}

/**
 * Calculate holding costs
 */
function calculateHoldingCosts(
  property: FinancialAnalysisInput['property'],
  holdingMonths: number,
  taxHistory?: FinancialAnalysisInput['taxHistory']
): FinancialAnalysis['costs']['holding'] {
  // Monthly property taxes
  let monthlyTaxes = 200; // Default
  if (taxHistory && taxHistory.length > 0) {
    const latestTax = taxHistory[0].taxPaid;
    monthlyTaxes = Math.round(latestTax / 12);
  } else if (property.taxAmount) {
    monthlyTaxes = Math.round(property.taxAmount / 12);
  }

  // Insurance estimate based on property value
  const estimatedValue = property.marketValue || property.assessedValue || 100000;
  const monthlyInsurance = Math.round((estimatedValue * 0.005) / 12); // 0.5% annual rate

  // Utilities
  const sqft = property.buildingSqft || 1500;
  const monthlyUtilities = Math.round(100 + (sqft * 0.05)); // Base + per sqft

  // Maintenance reserve
  const monthlyMaintenance = 100;

  const totalMonthly = monthlyTaxes + monthlyInsurance + monthlyUtilities + monthlyMaintenance;

  return {
    monthlyTaxes,
    monthlyInsurance,
    monthlyUtilities,
    monthlyMaintenance,
    monthlyLoanPayment: 0, // Assume cash purchase for tax sale
    monthlyHoa: 0,
    totalMonthly,
    holdingPeriodMonths: holdingMonths,
    totalHolding: totalMonthly * holdingMonths,
  };
}

/**
 * Calculate selling costs
 */
function calculateSellingCosts(estimatedARV: number): FinancialAnalysis['costs']['selling'] {
  const agentCommission = Math.round(estimatedARV * 0.06); // 6% commission
  const closingCosts = Math.round(estimatedARV * 0.02); // 2% closing
  const staging = estimatedARV > 200000 ? 2000 : 1500;
  const marketing = 500;
  const homeWarranty = 500;
  const sellerConcessions = Math.round(estimatedARV * 0.02); // 2% typical

  return {
    agentCommission,
    closingCosts,
    staging,
    marketing,
    homeWarranty,
    sellerConcessions,
    totalSelling: agentCommission + closingCosts + staging + marketing + homeWarranty + sellerConcessions,
  };
}

/**
 * Calculate acquisition costs
 */
function calculateAcquisitionCosts(
  minimumBid: number,
  buyersPremiumPct: number = 0.10,
  estimatedValue: number
): FinancialAnalysis['costs']['acquisition'] {
  const bidAmount = minimumBid;
  const buyersPremium = Math.round(bidAmount * buyersPremiumPct);
  const transferTax = Math.round(bidAmount * 0.02); // 2% transfer tax estimate
  const recordingFees = 250;
  const titleSearch = 350;
  const titleInsurance = Math.round(estimatedValue * 0.005); // 0.5% of value
  const legalFees = 500;

  return {
    bidAmount,
    buyersPremium,
    transferTax,
    recordingFees,
    titleSearch,
    titleInsurance,
    legalFees,
    totalAcquisition: bidAmount + buyersPremium + transferTax + recordingFees + titleSearch + titleInsurance + legalFees,
  };
}

/**
 * Estimate monthly rent based on property characteristics
 */
function estimateMonthlyRent(
  property: FinancialAnalysisInput['property'],
  market?: FinancialAnalysisInput['market']
): number {
  // Base rent on market price per sqft if available
  if (market?.avgPricePerSqft && property.buildingSqft) {
    // Typical rent is ~0.8-1% of home value per month
    const estimatedValue = market.avgPricePerSqft * property.buildingSqft;
    return Math.round(estimatedValue * 0.008);
  }

  // Fallback: estimate based on bedrooms
  const beds = property.bedrooms || 3;
  const baseRent: Record<number, number> = {
    1: 700,
    2: 900,
    3: 1100,
    4: 1300,
    5: 1500,
  };

  return baseRent[Math.min(beds, 5)] || 1100;
}

/**
 * Transform RealtyComparable to ComparableSale
 */
export function transformComparables(comps: RealtyComparable[]): ComparableSale[] {
  return comps.map((comp, index) => ({
    id: comp.property_id || `comp-${index + 1}`,
    address: comp.address.line,
    city: comp.address.city,
    state: comp.address.state_code,
    zip: comp.address.postal_code,
    salePrice: comp.price.sold_price || comp.price.list_price || 0,
    saleDate: comp.sold_date || '',
    sqft: comp.description.sqft || 0,
    lotSizeSqft: comp.description.lot_sqft || 0,
    bedrooms: comp.description.beds || 0,
    bathrooms: comp.description.baths || 0,
    yearBuilt: comp.description.year_built || 0,
    propertyType: comp.description.type || 'Single Family',
    pricePerSqft: comp.price.price_per_sqft || (comp.price.sold_price && comp.description.sqft
      ? comp.price.sold_price / comp.description.sqft
      : 0),
    distanceMiles: comp.distance_miles || 0,
    similarityScore: calculateSimilarityScore(comp),
    daysOnMarket: comp.days_on_market,
    source: comp.source || 'Realty API',
    photos: comp.photos,
  }));
}

/**
 * Calculate similarity score for a comparable
 */
function calculateSimilarityScore(comp: RealtyComparable): number {
  let score = 100;

  // Penalize for missing key data
  if (!comp.price.sold_price) score -= 20;
  if (!comp.description.sqft) score -= 10;
  if (!comp.description.beds) score -= 5;
  if (!comp.sold_date) score -= 10;

  // Penalize for distance
  if (comp.distance_miles) {
    if (comp.distance_miles > 2) score -= 15;
    else if (comp.distance_miles > 1) score -= 10;
    else if (comp.distance_miles > 0.5) score -= 5;
  }

  // Penalize for old sales
  if (comp.sold_date) {
    const saleDate = new Date(comp.sold_date);
    const monthsAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo > 6) score -= 10;
    if (monthsAgo > 9) score -= 10;
  }

  return Math.max(score, 0);
}

/**
 * Calculate comprehensive financial analysis
 */
export function calculateFinancialAnalysis(input: FinancialAnalysisInput): FinancialAnalysis {
  const {
    property,
    auction,
    market,
    taxHistory,
    overrides,
  } = input;

  // Estimate ARV
  let estimatedARV = overrides?.estimatedARV || 0;
  let arvLow = 0;
  let arvHigh = 0;
  let pricePerSqft = 0;

  if (market?.comparables && market.comparables.length > 0) {
    const validComps = market.comparables.filter(c => c.price.sold_price && c.price.sold_price > 0);
    if (validComps.length > 0) {
      const prices = validComps.map(c => c.price.sold_price!);
      estimatedARV = prices.reduce((a, b) => a + b, 0) / prices.length;
      arvLow = Math.min(...prices);
      arvHigh = Math.max(...prices);

      const sqftPrices = validComps
        .filter(c => c.price.price_per_sqft)
        .map(c => c.price.price_per_sqft!);
      pricePerSqft = sqftPrices.length > 0
        ? sqftPrices.reduce((a, b) => a + b, 0) / sqftPrices.length
        : 0;
    }
  }

  if (!estimatedARV && market?.medianSalePrice) {
    estimatedARV = market.medianSalePrice;
    arvLow = estimatedARV * 0.9;
    arvHigh = estimatedARV * 1.1;
  }

  if (!estimatedARV) {
    estimatedARV = property.marketValue || property.assessedValue || 100000;
    arvLow = estimatedARV * 0.85;
    arvHigh = estimatedARV * 1.15;
  }

  if (!pricePerSqft && property.buildingSqft) {
    pricePerSqft = estimatedARV / property.buildingSqft;
  }

  // Calculate all cost components
  const minimumBid = auction.minimumBid || property.taxAmount || 10000;
  const buyersPremiumPct = auction.buyersPremiumPct || 0.10;
  const holdingMonths = overrides?.holdingPeriodMonths || 6;

  const acquisition = calculateAcquisitionCosts(minimumBid, buyersPremiumPct, estimatedARV);
  const rehab = overrides?.rehabCostEstimate
    ? {
        exterior: { roof: 0, siding: 0, windows: 0, doors: 0, landscaping: 0, hardscape: 0, total: 0 },
        interior: { flooring: 0, paint: 0, kitchen: 0, bathrooms: 0, electrical: 0, plumbing: 0, hvac: 0, fixtures: 0, total: overrides.rehabCostEstimate },
        structural: { foundation: 0, framing: 0, insulation: 0, total: 0 },
        permits: 500,
        laborMultiplier: 1.0,
        materialMultiplier: 1.0,
        totalRehab: overrides.rehabCostEstimate,
      }
    : estimateRehabCosts(property, estimatedARV);
  const holding = calculateHoldingCosts(property, holdingMonths, taxHistory);
  const selling = calculateSellingCosts(estimatedARV);

  const totalCosts = acquisition.totalAcquisition + rehab.totalRehab + holding.totalHolding + selling.totalSelling;
  const contingency = Math.round(totalCosts * 0.10);
  const grandTotal = totalCosts + contingency;

  // Calculate rental metrics
  const monthlyRent = overrides?.monthlyRentEstimate || estimateMonthlyRent(property, market);
  const annualGrossRent = monthlyRent * 12;
  const vacancyRate = 0.08;
  const effectiveGrossIncome = annualGrossRent * (1 - vacancyRate);
  const annualOperatingExpenses = holding.totalMonthly * 12 * 0.4; // 40% expense ratio
  const noi = effectiveGrossIncome - annualOperatingExpenses;

  // Calculate investment metrics
  const totalInvestment = acquisition.totalAcquisition + rehab.totalRehab;
  const grossProfit = estimatedARV - minimumBid;
  const netProfit = estimatedARV - grandTotal;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const profitMargin = estimatedARV > 0 ? (netProfit / estimatedARV) * 100 : 0;
  const priceToARV = estimatedARV > 0 ? minimumBid / estimatedARV : 0;
  const cashOnCash = totalInvestment > 0 ? (noi / totalInvestment) * 100 : 0;
  const capRate = estimatedARV > 0 ? (noi / estimatedARV) * 100 : 0;

  // IRR approximation (simplified)
  const monthlyReturn = netProfit / holdingMonths;
  const irr = totalInvestment > 0 ? ((monthlyReturn / totalInvestment) * 12 * 100) : 0;

  // Build comparables section
  const transformedComps = market?.comparables ? transformComparables(market.comparables) : [];

  // Determine recommendation
  let verdict: 'strong_buy' | 'buy' | 'hold' | 'pass' | 'avoid';
  if (roi > 40 && priceToARV < 0.40) {
    verdict = 'strong_buy';
  } else if (roi > 25 && priceToARV < 0.55) {
    verdict = 'buy';
  } else if (roi > 15 && priceToARV < 0.70) {
    verdict = 'hold';
  } else if (roi > 5) {
    verdict = 'pass';
  } else {
    verdict = 'avoid';
  }

  const keyFactors: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];

  if (roi > 20) keyFactors.push(`${roi.toFixed(1)}% ROI exceeds minimum threshold`);
  if (priceToARV < 0.50) keyFactors.push(`Acquisition at ${(priceToARV * 100).toFixed(0)}% of ARV`);
  if (capRate > 6) keyFactors.push(`Strong rental fallback with ${capRate.toFixed(1)}% cap rate`);
  if (rehab.totalRehab < estimatedARV * 0.15) keyFactors.push('Moderate rehab scope');

  risks.push('Rehab costs may exceed estimate if hidden issues found');
  if (property.yearBuilt && new Date().getFullYear() - property.yearBuilt > 50) {
    risks.push('Older property may have deferred maintenance');
  }

  if (property.bedrooms && property.bedrooms < 4) {
    opportunities.push('Potential to add bedroom for increased value');
  }
  opportunities.push('Strong rental market if flip timeline extends');

  // Determine confidence and data quality
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  let dataQuality = 70;

  if (transformedComps.length >= 5 && market?.avgPricePerSqft) {
    confidence = 'high';
    dataQuality = 85;
  } else if (transformedComps.length >= 3) {
    confidence = 'medium';
    dataQuality = 75;
  } else {
    confidence = 'low';
    dataQuality = 60;
  }

  const analysis: FinancialAnalysis = {
    costs: {
      acquisition,
      rehab,
      holding,
      selling,
      totalCosts,
      contingency,
      grandTotal,
      confidence,
      dataQuality,
      warnings: rehab.totalRehab > estimatedARV * 0.25
        ? ['High rehab estimate - consider detailed inspection']
        : ['Rehab costs estimated based on property age'],
    },
    revenue: {
      sale: {
        estimatedARV: Math.round(estimatedARV),
        lowEstimate: Math.round(arvLow),
        highEstimate: Math.round(arvHigh),
        pricePerSqft: Math.round(pricePerSqft * 100) / 100,
        comparablesUsed: transformedComps.length,
        confidence,
      },
      rental: {
        monthlyRent,
        annualGrossRent,
        vacancyRate,
        effectiveGrossIncome: Math.round(effectiveGrossIncome),
        annualOperatingExpenses: Math.round(annualOperatingExpenses),
        noi: Math.round(noi),
        monthlyCashFlow: Math.round(noi / 12),
        annualCashFlow: Math.round(noi),
      },
    },
    metrics: {
      roi: Math.round(roi * 10) / 10,
      profitMargin: Math.round(profitMargin * 10) / 10,
      priceToARV: Math.round(priceToARV * 100) / 100,
      totalInvestmentToARV: Math.round((grandTotal / estimatedARV) * 100) / 100,
      cashOnCash: Math.round(cashOnCash * 10) / 10,
      netProfit: Math.round(netProfit),
      grossProfit: Math.round(grossProfit),
      breakEvenPrice: Math.round(grandTotal),
      irr: Math.round(irr * 10) / 10,
      capRate: Math.round(capRate * 10) / 10,
    },
    comparables: {
      comparables: transformedComps,
      estimatedARV: Math.round(estimatedARV),
      arvLowRange: Math.round(arvLow),
      arvHighRange: Math.round(arvHigh),
      averagePricePerSqft: Math.round(pricePerSqft * 100) / 100,
      medianPricePerSqft: Math.round(pricePerSqft * 100) / 100,
      comparablesCount: transformedComps.length,
      searchRadiusMiles: 1.0,
      confidence,
      dataSource: transformedComps.length > 0 ? 'Realty API' : 'Estimated',
      notes: transformedComps.length >= 3
        ? ['Comparables selected within 1 mile radius']
        : ['Limited comparable sales data - estimates used'],
    },
    recommendation: {
      verdict,
      confidence: Math.round(dataQuality),
      maxBid: Math.round(estimatedARV * 0.70 - rehab.totalRehab - contingency),
      targetProfit: Math.round(netProfit),
      keyFactors,
      risks,
      opportunities,
      exitStrategy: capRate > 8 ? 'rental' : 'flip',
      timelineMonths: holdingMonths,
    },
    analysisDate: new Date().toISOString(),
    confidenceLevel: Math.round(dataQuality),
    dataQuality: {
      overallScore: dataQuality,
      components: {
        comparablesQuality: transformedComps.length >= 5 ? 90 : transformedComps.length >= 3 ? 75 : 50,
        costEstimateAccuracy: 70,
        marketDataFreshness: market?.avgPricePerSqft ? 85 : 60,
        propertyDataCompleteness: property.buildingSqft && property.yearBuilt ? 80 : 60,
      },
      missingData: [
        ...(!property.buildingSqft ? ['Building square footage'] : []),
        ...(!property.yearBuilt ? ['Year built'] : []),
        ...(transformedComps.length < 3 ? ['Sufficient comparable sales'] : []),
      ],
      assumptions: [
        `Holding period: ${holdingMonths} months`,
        'Cash purchase assumed (no financing)',
        'Standard 6% agent commission',
      ],
    },
  };

  return analysis;
}

/**
 * Estimate insurance costs based on property and location
 */
export function calculateInsuranceEstimates(
  property: {
    assessedValue?: number;
    marketValue?: number;
    buildingSqft?: number;
    yearBuilt?: number;
  },
  climate?: {
    floodRisk?: number | null;
    fireRisk?: number | null;
    windRisk?: number | null;
  }
): {
  homeowners: number;
  flood: number | null;
  title: number;
  total: number;
  warnings: string[];
} {
  const estimatedValue = property.marketValue || property.assessedValue || 100000;
  const sqft = property.buildingSqft || 1500;
  const age = property.yearBuilt ? new Date().getFullYear() - property.yearBuilt : 40;

  // Base homeowners insurance: ~$3.50 per $1000 of coverage
  let homeownersRate = 3.5;
  if (age > 50) homeownersRate += 1.0;
  if (age > 30) homeownersRate += 0.5;

  const homeowners = Math.round((estimatedValue / 1000) * homeownersRate);

  // Flood insurance if needed
  let flood: number | null = null;
  const warnings: string[] = [];

  if (climate?.floodRisk && climate.floodRisk > 3) {
    // Moderate to high flood risk
    const floodRate = climate.floodRisk > 6 ? 12 : climate.floodRisk > 4 ? 8 : 5;
    flood = Math.round((estimatedValue / 1000) * floodRate);
    if (climate.floodRisk > 6) {
      warnings.push('High flood risk - flood insurance required');
    } else {
      warnings.push('Flood insurance recommended');
    }
  }

  // Fire risk warning
  if (climate?.fireRisk && climate.fireRisk > 5) {
    warnings.push('Elevated fire risk - may affect insurance rates');
    // Increase homeowners estimate
    const fireIncrease = Math.round(homeowners * 0.2);
    // Add to homeowners rather than separate
  }

  // Title insurance (one-time, ~0.5% of purchase price)
  const title = Math.round(estimatedValue * 0.005);

  const total = homeowners + (flood || 0);

  return {
    homeowners,
    flood,
    title,
    total,
    warnings,
  };
}
