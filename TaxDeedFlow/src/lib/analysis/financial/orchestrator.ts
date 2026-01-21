/**
 * Financial Analysis Orchestrator - Phase 8D
 *
 * Main orchestrator function that coordinates all financial analysis modules
 * to produce a complete property financial analysis.
 *
 * @module lib/analysis/financial/orchestrator
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type {
  FinancialAnalysis,
  FinancialAnalysisInput,
  InvestmentMetrics,
  RevenueProjection,
  ARVAnalysis,
  RentalProjection,
  ComparablesAnalysis,
  ComparableSale,
  RecommendationInput,
} from './types';

// Re-export types for external consumers
export type { FinancialAnalysis, FinancialAnalysisInput } from './types';
import type {
  CostBreakdown,
  RehabScope,
  ExteriorCosts,
  InteriorCosts,
  StructuralCosts,
} from '@/types/costs';

import { generateRecommendation } from './recommendationEngine';
import { assessDataQuality } from './dataQuality';
import { calculateInvestmentMetrics, calculateROIAnalysis } from './roiCalculator';
import { calculateHoldingCosts } from './holdingCosts';
import { compareExitStrategies } from './exitStrategies';
import { getRealtyService, type RealtyComparable } from '@/lib/api/services/realty-service';

// ============================================
// Default Configuration
// ============================================

/**
 * Default analysis configuration values
 */
const DEFAULT_CONFIG = {
  holdingMonths: 6,
  vacancyRate: 0.08, // 8% vacancy for rentals
  operatingExpenseRatio: 0.40, // 40% of gross rent for expenses
  appreciationRate: 0.03, // 3% annual appreciation
  rentToValueRatio: 0.008, // 0.8% monthly rent / value ratio
  sellingCostPercent: 0.08, // 8% selling costs
  defaultRehabScope: 'moderate' as RehabScope,
};

// ============================================
// Main Orchestrator Function
// ============================================

/**
 * Analyze property financials comprehensively
 *
 * This is the main entry point for financial analysis. It orchestrates
 * all analysis modules and returns a complete FinancialAnalysis object.
 *
 * @param input - Financial analysis input data
 * @returns Complete financial analysis with recommendation
 *
 * @example
 * ```typescript
 * const analysis = await analyzePropertyFinancials({
 *   property: propertyData,
 *   regridData: regridEnrichment,
 *   purchasePrice: 25000,
 *   riskScore: 18,
 *   locationScore: 20,
 *   marketScore: 15,
 *   options: {
 *     rehabScope: 'moderate',
 *     holdingMonths: 6,
 *     fetchComparables: true,
 *   },
 * });
 * console.log(analysis.recommendation.verdict); // 'buy'
 * ```
 */
export async function analyzePropertyFinancials(
  input: FinancialAnalysisInput
): Promise<FinancialAnalysis> {
  const {
    property,
    regridData,
    purchasePrice,
    riskScore,
    locationScore,
    marketScore,
    options = {},
  } = input;

  // Extract options with defaults
  const rehabScope = options.rehabScope ?? DEFAULT_CONFIG.defaultRehabScope;
  const holdingMonths = options.holdingMonths ?? DEFAULT_CONFIG.holdingMonths;
  const auctionType = options.auctionType ?? 'tax_deed';

  // Step 1: Get or calculate comparables
  const comparables = await getComparablesAnalysis(
    property,
    regridData,
    options.existingComparables,
    options.fetchComparables ?? false
  );

  // Step 2: Calculate ARV and revenue projections
  const revenue = calculateRevenueProjection(property, regridData, comparables);

  // Step 3: Calculate costs
  const costs = calculateCostBreakdown(
    purchasePrice,
    property,
    regridData,
    rehabScope,
    holdingMonths,
    auctionType,
    revenue.sale.estimatedARV
  );

  // Step 4: Calculate investment metrics
  const metrics = calculateMetrics(
    costs,
    revenue,
    holdingMonths
  );

  // Step 5: Determine property condition from context
  const propertyCondition = determinePropertyCondition(property, regridData, rehabScope);

  // Step 6: Generate recommendation
  const recommendationInput: RecommendationInput = {
    metrics,
    costs,
    riskScore,
    locationScore,
    marketScore,
    comparablesConfidence: comparables.confidence,
    propertyCondition,
  };

  const recommendation = generateRecommendation(recommendationInput);

  // Step 7: Assess data quality
  const dataQuality = assessDataQuality(
    comparables,
    costs,
    property,
    regridData
  );

  // Step 8: Calculate overall confidence level
  const confidenceLevel = calculateOverallConfidence(
    recommendation.confidence,
    dataQuality.overallScore
  );

  // Assemble complete analysis
  const analysis: FinancialAnalysis = {
    costs,
    revenue,
    metrics,
    comparables,
    recommendation,
    analysisDate: new Date().toISOString(),
    confidenceLevel,
    dataQuality,
  };

  return analysis;
}

// ============================================
// Component Calculation Functions
// ============================================

/**
 * Get or calculate comparables analysis
 */
async function getComparablesAnalysis(
  property: FinancialAnalysisInput['property'],
  regridData: FinancialAnalysisInput['regridData'],
  existingComparables?: ComparableSale[],
  fetchComparables: boolean = false
): Promise<ComparablesAnalysis> {
  // If existing comparables provided, use them
  if (existingComparables && existingComparables.length > 0) {
    return buildComparablesAnalysisFromSales(existingComparables, property);
  }

  // If fetching is enabled, try to fetch from Realty API
  if (fetchComparables) {
    try {
      const realtyComps = await fetchRealtyComparables(property, regridData);
      if (realtyComps && realtyComps.length > 0) {
        return buildComparablesAnalysisFromSales(realtyComps, property);
      }
    } catch (error) {
      console.warn('[Financial Orchestrator] Failed to fetch comparables from Realty API:', error);
      // Fall through to fallback methods
    }
  }

  // Fallback: estimate from assessed value
  if (regridData?.assessed_value && regridData.assessed_value > 0) {
    return estimateComparablesFromAssessedValue(regridData.assessed_value, property);
  }

  return createEmptyComparablesAnalysis();
}

/**
 * Fetch comparables from Realty in US API
 */
async function fetchRealtyComparables(
  property: FinancialAnalysisInput['property'],
  regridData: FinancialAnalysisInput['regridData']
): Promise<ComparableSale[]> {
  const realtyService = getRealtyService();

  // Determine search parameters - postal_code works best
  const postalCode = property.address?.match(/\b\d{5}\b/)?.[0]; // Extract ZIP from address
  const lat = regridData?.latitude;
  const lng = regridData?.longitude;

  // Build search options - prefer postal_code for better results
  const searchOptions: Record<string, unknown> = {
    limit: 10,
  };

  // Add property filters if available
  if (regridData?.bedrooms) {
    searchOptions.beds_min = Math.max(1, regridData.bedrooms - 1);
    searchOptions.beds_max = regridData.bedrooms + 1;
  }

  if (regridData?.building_sqft && regridData.building_sqft > 0) {
    searchOptions.sqft_min = Math.round(regridData.building_sqft * 0.7);
    searchOptions.sqft_max = Math.round(regridData.building_sqft * 1.3);
  }

  // Try postal code first (most reliable)
  if (postalCode) {
    try {
      const result = await realtyService.getSoldComparables({
        postal_code: postalCode,
        ...searchOptions,
      });

      if (result.data?.comparables && result.data.comparables.length > 0) {
        return convertRealtyComparables(result.data.comparables, lat, lng);
      }
    } catch (error) {
      console.warn('[Financial Orchestrator] Postal code search failed:', error);
    }
  }

  // Try coordinates if postal code didn't work
  if (lat !== undefined && lng !== undefined) {
    try {
      const result = await realtyService.getSoldComparables({
        lat,
        lng,
        radius_miles: 2,
        ...searchOptions,
      });

      if (result.data?.comparables && result.data.comparables.length > 0) {
        return convertRealtyComparables(result.data.comparables, lat, lng);
      }
    } catch (error) {
      console.warn('[Financial Orchestrator] Coordinate search failed:', error);
    }
  }

  // Try city/state if we can extract it
  const state = property.state || regridData?.latitude ? guessStateFromCoords(lat!, lng!) : null;
  if (property.address && state) {
    const cityMatch = property.address.match(/([A-Za-z\s]+),\s*[A-Z]{2}/);
    if (cityMatch) {
      try {
        const result = await realtyService.getSoldComparables({
          city: cityMatch[1].trim(),
          state_code: state,
          ...searchOptions,
        });

        if (result.data?.comparables && result.data.comparables.length > 0) {
          return convertRealtyComparables(result.data.comparables, lat, lng);
        }
      } catch (error) {
        console.warn('[Financial Orchestrator] City/state search failed:', error);
      }
    }
  }

  return [];
}

/**
 * Convert Realty API comparables to ComparableSale format
 */
function convertRealtyComparables(
  realtyComps: RealtyComparable[],
  subjectLat?: number,
  subjectLng?: number
): ComparableSale[] {
  return realtyComps
    .filter(comp => comp.price.sold_price && comp.price.sold_price > 0)
    .map((comp, index) => {
      // Calculate distance if we have coordinates
      let distanceMiles: number | undefined;
      if (subjectLat && subjectLng && comp.address.lat && comp.address.lon) {
        distanceMiles = calculateDistance(
          subjectLat,
          subjectLng,
          comp.address.lat,
          comp.address.lon
        );
      }

      return {
        id: comp.property_id || `realty-${index}`,
        address: comp.address.line || '',
        city: comp.address.city,
        state: comp.address.state_code,
        zip: comp.address.postal_code,
        salePrice: comp.price.sold_price || 0,
        saleDate: comp.sold_date || new Date().toISOString(),
        sqft: comp.description.sqft,
        lotSizeSqft: comp.description.lot_sqft,
        bedrooms: comp.description.beds,
        bathrooms: comp.description.baths,
        yearBuilt: comp.description.year_built,
        propertyType: comp.description.type,
        pricePerSqft: comp.price.price_per_sqft,
        distanceMiles,
        source: 'realty-in-us',
      };
    });
}

/**
 * Calculate distance between two coordinates in miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Guess state code from coordinates (simplified US coverage)
 */
function guessStateFromCoords(lat: number, lng: number): string | null {
  // Pennsylvania approximate bounds
  if (lat >= 39.7 && lat <= 42.3 && lng >= -80.5 && lng <= -74.7) return 'PA';
  // Florida approximate bounds
  if (lat >= 24.5 && lat <= 31.0 && lng >= -87.6 && lng <= -80.0) return 'FL';
  // Texas approximate bounds
  if (lat >= 25.8 && lat <= 36.5 && lng >= -106.6 && lng <= -93.5) return 'TX';
  // California approximate bounds
  if (lat >= 32.5 && lat <= 42.0 && lng >= -124.4 && lng <= -114.1) return 'CA';
  // New York approximate bounds
  if (lat >= 40.5 && lat <= 45.0 && lng >= -79.8 && lng <= -71.8) return 'NY';
  // Default: unable to determine
  return null;
}

/**
 * Build comparables analysis from provided sales
 */
function buildComparablesAnalysisFromSales(
  sales: ComparableSale[],
  property: FinancialAnalysisInput['property']
): ComparablesAnalysis {
  if (sales.length === 0) {
    return createEmptyComparablesAnalysis();
  }

  // Calculate statistics
  const prices = sales.map(s => s.salePrice);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];

  // Calculate price per sqft
  const validPpSqft = sales
    .filter(s => s.pricePerSqft && s.pricePerSqft > 0)
    .map(s => s.pricePerSqft!);
  const avgPpSqft = validPpSqft.length > 0
    ? validPpSqft.reduce((a, b) => a + b, 0) / validPpSqft.length
    : 0;
  const medianPpSqft = validPpSqft.length > 0
    ? [...validPpSqft].sort((a, b) => a - b)[Math.floor(validPpSqft.length / 2)]
    : 0;

  // Calculate ARV (use median for robustness)
  const estimatedARV = medianPrice;
  const stdDev = Math.sqrt(
    prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length
  );

  // Determine confidence based on sample size and consistency
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  const coefficientOfVariation = stdDev / avgPrice;

  if (sales.length >= 5 && coefficientOfVariation <= 0.15) {
    confidence = 'high';
  } else if (sales.length >= 3 && coefficientOfVariation <= 0.25) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Calculate ARV range
  const arvLowRange = estimatedARV - stdDev;
  const arvHighRange = estimatedARV + stdDev;

  // Determine search radius from comparable distances
  const distances = sales
    .filter(s => s.distanceMiles !== undefined)
    .map(s => s.distanceMiles!);
  const searchRadiusMiles = distances.length > 0
    ? Math.max(...distances)
    : 2; // Default 2 miles

  return {
    comparables: sales,
    estimatedARV: Math.round(estimatedARV),
    arvLowRange: Math.round(Math.max(0, arvLowRange)),
    arvHighRange: Math.round(arvHighRange),
    averagePricePerSqft: Math.round(avgPpSqft * 100) / 100,
    medianPricePerSqft: Math.round(medianPpSqft * 100) / 100,
    comparablesCount: sales.length,
    searchRadiusMiles,
    confidence,
    dataSource: 'provided',
    notes: [`Analysis based on ${sales.length} comparable sales`],
  };
}

/**
 * Estimate comparables from assessed value when no sales data available
 */
function estimateComparablesFromAssessedValue(
  assessedValue: number,
  property: FinancialAnalysisInput['property']
): ComparablesAnalysis {
  // Typical assessment ratios vary by state, use 80% as default
  const assessmentRatio = 0.80;
  const estimatedMarketValue = assessedValue / assessmentRatio;

  // Apply a margin of error
  const margin = 0.20; // 20% margin

  return {
    comparables: [],
    estimatedARV: Math.round(estimatedMarketValue),
    arvLowRange: Math.round(estimatedMarketValue * (1 - margin)),
    arvHighRange: Math.round(estimatedMarketValue * (1 + margin)),
    averagePricePerSqft: 0,
    medianPricePerSqft: 0,
    comparablesCount: 0,
    searchRadiusMiles: 0,
    confidence: 'low',
    dataSource: 'assessed_value_estimate',
    notes: [
      'ARV estimated from assessed value (no comparable sales available)',
      `Assumed ${(assessmentRatio * 100).toFixed(0)}% assessment ratio`,
    ],
  };
}

/**
 * Create empty comparables analysis when no data available
 */
function createEmptyComparablesAnalysis(): ComparablesAnalysis {
  return {
    comparables: [],
    estimatedARV: 0,
    arvLowRange: 0,
    arvHighRange: 0,
    averagePricePerSqft: 0,
    medianPricePerSqft: 0,
    comparablesCount: 0,
    searchRadiusMiles: 0,
    confidence: 'low',
    dataSource: 'none',
    notes: ['No comparable sales data available - ARV could not be estimated'],
  };
}

/**
 * Calculate revenue projections for sale and rental
 */
function calculateRevenueProjection(
  property: FinancialAnalysisInput['property'],
  regridData: FinancialAnalysisInput['regridData'],
  comparables: ComparablesAnalysis
): RevenueProjection {
  // Sale revenue (ARV)
  const sale: ARVAnalysis = {
    estimatedARV: comparables.estimatedARV,
    lowEstimate: comparables.arvLowRange,
    highEstimate: comparables.arvHighRange,
    pricePerSqft: comparables.averagePricePerSqft,
    comparablesUsed: comparables.comparablesCount,
    confidence: comparables.confidence,
  };

  // Rental income projection
  const sqft = regridData?.building_sqft ?? property.sqft ?? 1500;
  const monthlyRentEstimate = comparables.estimatedARV * DEFAULT_CONFIG.rentToValueRatio;
  const annualGrossRent = monthlyRentEstimate * 12;
  const effectiveGrossIncome = annualGrossRent * (1 - DEFAULT_CONFIG.vacancyRate);
  const annualOperatingExpenses = effectiveGrossIncome * DEFAULT_CONFIG.operatingExpenseRatio;
  const noi = effectiveGrossIncome - annualOperatingExpenses;

  const rental: RentalProjection = {
    monthlyRent: Math.round(monthlyRentEstimate),
    annualGrossRent: Math.round(annualGrossRent),
    vacancyRate: DEFAULT_CONFIG.vacancyRate,
    effectiveGrossIncome: Math.round(effectiveGrossIncome),
    annualOperatingExpenses: Math.round(annualOperatingExpenses),
    noi: Math.round(noi),
    monthlyCashFlow: Math.round(noi / 12),
    annualCashFlow: Math.round(noi),
  };

  return { sale, rental };
}

/**
 * Calculate complete cost breakdown
 */
/**
 * Check if property is vacant land (no building)
 */
function isVacantLand(
  property: FinancialAnalysisInput['property'],
  regridData: FinancialAnalysisInput['regridData']
): boolean {
  // Check building square footage - if 0 or undefined, it's vacant land
  const buildingSqft = regridData?.building_sqft ?? property.sqft;
  if (!buildingSqft || buildingSqft === 0) {
    return true;
  }

  // Check property type for land indicators
  const propertyType = (regridData?.property_type ?? property.propertyType ?? '').toLowerCase();
  const landIndicators = ['vacant', 'lot', 'land', 'acreage', 'parcel'];
  if (landIndicators.some(indicator => propertyType.includes(indicator))) {
    return true;
  }

  return false;
}

/**
 * Get zero rehab costs for vacant land
 */
function getZeroRehabCosts(): CostBreakdown['rehab'] {
  return {
    exterior: {
      roof: 0,
      siding: 0,
      windows: 0,
      doors: 0,
      landscaping: 0,
      hardscape: 0,
      total: 0,
    },
    interior: {
      flooring: 0,
      paint: 0,
      kitchen: 0,
      bathrooms: 0,
      electrical: 0,
      plumbing: 0,
      hvac: 0,
      fixtures: 0,
      total: 0,
    },
    structural: {
      foundation: 0,
      framing: 0,
      insulation: 0,
      total: 0,
    },
    permits: 0,
    laborMultiplier: 1.0,
    materialMultiplier: 1.0,
    totalRehab: 0,
  };
}

function calculateCostBreakdown(
  purchasePrice: number,
  property: FinancialAnalysisInput['property'],
  regridData: FinancialAnalysisInput['regridData'],
  rehabScope: RehabScope,
  holdingMonths: number,
  auctionType: string,
  estimatedARV: number
): CostBreakdown {
  const state = property.state ?? 'PA';
  const sqft = regridData?.building_sqft ?? property.sqft ?? 1500;

  // Detect if this is vacant land (no building to rehab)
  const vacantLand = isVacantLand(property, regridData);

  // Calculate acquisition costs
  const auctionPremium = auctionType === 'tax_deed' ? purchasePrice * 0.05 : 0;
  const titleSearch = 500;
  const recordingFees = 150;
  const transferTax = purchasePrice * 0.01;
  const legalFees = 750;
  const deedPreparation = 200;

  const acquisitionTotal = purchasePrice + auctionPremium + titleSearch +
    recordingFees + transferTax + legalFees + deedPreparation;

  // Calculate rehab costs - $0 for vacant land (no building to rehab)
  const rehabCosts = vacantLand ? getZeroRehabCosts() : calculateRehabCosts(sqft, rehabScope);

  // Calculate holding costs
  const holdingCostResult = calculateHoldingCosts({
    propertyValue: purchasePrice,
    state,
    annualTaxes: property.annualTaxes,
    holdingMonths,
    sqft: vacantLand ? 0 : sqft,
    isVacant: true,
    monthlyHoa: 0,
  });

  // Calculate selling costs - no staging for vacant land
  const agentCommission = estimatedARV * 0.06;
  const sellingClosingCosts = estimatedARV * 0.015;
  const staging = vacantLand ? 0 : (sqft > 2000 ? 2500 : 1500);
  const marketing = 500;
  const sellingTotal = agentCommission + sellingClosingCosts + staging + marketing;

  // Determine confidence
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  if (property.sqft && property.annualTaxes) {
    confidence = 'high';
  } else if (!property.sqft && !property.annualTaxes) {
    confidence = 'low';
  }

  const totalCosts = acquisitionTotal + rehabCosts.totalRehab +
    holdingCostResult.totalHolding + sellingTotal;
  const contingency = totalCosts * 0.10;
  const grandTotal = totalCosts + contingency;

  return {
    acquisition: {
      bidAmount: purchasePrice,
      buyersPremium: auctionPremium,
      titleSearch,
      titleInsurance: 0, // Often not available for tax deeds
      recordingFees,
      transferTax,
      legalFees,
      totalAcquisition: acquisitionTotal,
    },
    rehab: rehabCosts,
    holding: {
      monthlyTaxes: holdingCostResult.monthlyPropertyTax,
      monthlyInsurance: holdingCostResult.monthlyInsurance,
      monthlyUtilities: holdingCostResult.monthlyUtilities,
      monthlyMaintenance: holdingCostResult.monthlyMaintenance,
      monthlyLoanPayment: 0,
      monthlyHoa: 0,
      totalMonthly: holdingCostResult.totalMonthly,
      holdingPeriodMonths: holdingMonths,
      totalHolding: holdingCostResult.totalHolding,
    },
    selling: {
      agentCommission,
      closingCosts: sellingClosingCosts,
      staging,
      marketing,
      homeWarranty: 0,
      sellerConcessions: 0,
      totalSelling: sellingTotal,
    },
    totalCosts,
    contingency,
    grandTotal,
    confidence,
    dataQuality: confidence === 'high' ? 85 : confidence === 'medium' ? 65 : 45,
    warnings: [],
  };
}

/**
 * Calculate rehab costs based on scope and square footage
 */
function calculateRehabCosts(
  sqft: number,
  scope: RehabScope
): CostBreakdown['rehab'] {
  // Cost per sqft by scope
  const costPerSqft: Record<RehabScope, number> = {
    cosmetic: 8,
    light: 15,
    moderate: 30,
    heavy: 50,
    gut: 80,
  };

  const basePerSqft = costPerSqft[scope];
  const baseCost = sqft * basePerSqft;

  // Breakdown by category (typical percentages)
  const interiorTotal = baseCost * 0.45;
  const exteriorTotal = baseCost * 0.20;
  const structuralTotal = scope === 'gut' || scope === 'heavy' ? baseCost * 0.10 : baseCost * 0.02;
  const permits = baseCost * 0.02;

  const totalRehab = interiorTotal + exteriorTotal + structuralTotal + permits;

  // Build nested cost structures
  const exterior: ExteriorCosts = {
    roof: Math.round(exteriorTotal * 0.30),
    siding: Math.round(exteriorTotal * 0.20),
    windows: Math.round(exteriorTotal * 0.20),
    doors: Math.round(exteriorTotal * 0.10),
    landscaping: Math.round(exteriorTotal * 0.10),
    hardscape: Math.round(exteriorTotal * 0.10),
    total: Math.round(exteriorTotal),
  };

  const interior: InteriorCosts = {
    flooring: Math.round(interiorTotal * 0.20),
    paint: Math.round(interiorTotal * 0.10),
    kitchen: Math.round(interiorTotal * 0.25),
    bathrooms: Math.round(interiorTotal * 0.20),
    electrical: Math.round(interiorTotal * 0.08),
    plumbing: Math.round(interiorTotal * 0.08),
    hvac: Math.round(interiorTotal * 0.07),
    fixtures: Math.round(interiorTotal * 0.02),
    total: Math.round(interiorTotal),
  };

  const structural: StructuralCosts = {
    foundation: Math.round(structuralTotal * 0.50),
    framing: Math.round(structuralTotal * 0.30),
    insulation: Math.round(structuralTotal * 0.20),
    total: Math.round(structuralTotal),
  };

  return {
    exterior,
    interior,
    structural,
    permits: Math.round(permits),
    laborMultiplier: 1.0,
    materialMultiplier: 1.0,
    totalRehab: Math.round(totalRehab),
  };
}

/**
 * Calculate investment metrics from costs and revenue
 */
function calculateMetrics(
  costs: CostBreakdown,
  revenue: RevenueProjection,
  holdingMonths: number
): InvestmentMetrics {
  const { estimatedARV } = revenue.sale;
  const totalCosts = costs.grandTotal;
  const purchasePrice = costs.acquisition.bidAmount;

  // Basic profit calculations
  const grossProfit = estimatedARV - purchasePrice;
  const netProfit = estimatedARV - totalCosts;

  // ROI calculation
  const totalInvestment = costs.acquisition.totalAcquisition + costs.rehab.totalRehab + costs.holding.totalHolding;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

  // Profit margin (as percentage of ARV)
  const profitMargin = estimatedARV > 0 ? (netProfit / estimatedARV) * 100 : 0;

  // Price to ARV ratio
  const priceToARV = estimatedARV > 0 ? purchasePrice / estimatedARV : 1;

  // Total investment to ARV ratio
  const totalInvestmentToARV = estimatedARV > 0 ? totalInvestment / estimatedARV : 1;

  // Cash on cash (assuming cash purchase)
  const cashOnCash = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

  // Break-even price
  const breakEvenPrice = totalCosts;

  // Annualized IRR (simplified calculation)
  const yearsToSell = holdingMonths / 12;
  const irr = yearsToSell > 0
    ? (Math.pow((estimatedARV - costs.selling.totalSelling) / totalInvestment, 1 / yearsToSell) - 1) * 100
    : 0;

  // Cap rate (for rental analysis)
  const capRate = totalInvestment > 0 ? (revenue.rental.noi / totalInvestment) * 100 : 0;

  return {
    roi: Math.round(roi * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    priceToARV: Math.round(priceToARV * 1000) / 1000,
    totalInvestmentToARV: Math.round(totalInvestmentToARV * 1000) / 1000,
    cashOnCash: Math.round(cashOnCash * 100) / 100,
    netProfit: Math.round(netProfit),
    grossProfit: Math.round(grossProfit),
    breakEvenPrice: Math.round(breakEvenPrice),
    irr: Math.round(irr * 100) / 100,
    capRate: Math.round(capRate * 100) / 100,
  };
}

/**
 * Determine property condition based on available data
 */
function determinePropertyCondition(
  property: FinancialAnalysisInput['property'],
  regridData: FinancialAnalysisInput['regridData'],
  rehabScope: RehabScope
): 'excellent' | 'good' | 'fair' | 'poor' | 'distressed' {
  // Map rehab scope to condition (inverse relationship)
  const scopeToCondition: Record<RehabScope, 'excellent' | 'good' | 'fair' | 'poor' | 'distressed'> = {
    cosmetic: 'good',
    light: 'fair',
    moderate: 'fair',
    heavy: 'poor',
    gut: 'distressed',
  };

  // Use rehab scope as primary indicator
  let condition = scopeToCondition[rehabScope];

  // Adjust based on year built if available
  const yearBuilt = regridData?.year_built ?? property.yearBuilt;
  if (yearBuilt) {
    const age = new Date().getFullYear() - yearBuilt;
    if (age < 10) {
      // Newer properties in better condition
      if (condition === 'fair') condition = 'good';
      if (condition === 'poor') condition = 'fair';
    } else if (age > 50 && condition === 'fair') {
      // Older properties may be worse
      condition = 'poor';
    }
  }

  return condition;
}

/**
 * Calculate overall confidence from recommendation and data quality
 */
function calculateOverallConfidence(
  recommendationConfidence: number,
  dataQualityScore: number
): number {
  // Weight: 60% recommendation confidence, 40% data quality
  const weightedConfidence = recommendationConfidence * 0.6 + dataQualityScore * 0.4;
  return Math.round(weightedConfidence);
}

// ============================================
// Export Helper Functions
// ============================================

/**
 * Quick analysis with minimal inputs
 * Useful for batch processing or initial screening
 */
export async function quickAnalysis(
  purchasePrice: number,
  estimatedARV: number,
  rehabEstimate: number,
  riskScore: number = 15,
  locationScore: number = 15,
  marketScore: number = 15
): Promise<{
  verdict: string;
  roi: number;
  maxBid: number;
  confidence: number;
}> {
  // Simplified metrics calculation
  const totalInvestment = purchasePrice + rehabEstimate + (purchasePrice * 0.1); // 10% holding/closing
  const sellingCosts = estimatedARV * 0.08;
  const netProfit = estimatedARV - totalInvestment - sellingCosts;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const profitMargin = estimatedARV > 0 ? (netProfit / estimatedARV) * 100 : 0;
  const priceToARV = estimatedARV > 0 ? purchasePrice / estimatedARV : 1;

  // Quick verdict
  let verdict: string;
  if (roi >= 30 && priceToARV <= 0.65 && riskScore >= 18) {
    verdict = 'strong_buy';
  } else if (roi >= 20 && priceToARV <= 0.70 && riskScore >= 12) {
    verdict = 'buy';
  } else if (roi >= 10 && priceToARV <= 0.75) {
    verdict = 'hold';
  } else if (roi >= 5 && priceToARV <= 0.80) {
    verdict = 'pass';
  } else {
    verdict = 'avoid';
  }

  // Quick max bid (70% rule)
  const maxBid = Math.max(0, estimatedARV * 0.70 - rehabEstimate - sellingCosts);

  // Basic confidence
  const confidence = Math.round((riskScore + locationScore + marketScore) / 75 * 100);

  return {
    verdict,
    roi: Math.round(roi * 100) / 100,
    maxBid: Math.round(maxBid / 100) * 100,
    confidence: Math.min(100, confidence),
  };
}
