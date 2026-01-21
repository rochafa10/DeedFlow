/**
 * Unified Report Orchestrator
 *
 * Central coordinator that generates complete property analysis reports
 * by integrating all analysis engines:
 * - Risk Aggregation Engine (FEMA, USGS, EPA, NASA FIRMS, etc.)
 * - Financial Orchestrator (costs, revenue, comparables)
 * - Investment Scoring Engine (125-point scoring system)
 *
 * This orchestrator fetches property data from Supabase and external APIs,
 * runs all analyses in parallel where possible, and returns a complete
 * PropertyReportData structure ready for display.
 *
 * @module lib/api/services/unified-report-orchestrator
 */

import { createServerClient } from '@/lib/supabase/client';
import { aggregateRiskData, type RiskAggregationInput } from '@/lib/analysis/risk';
import type { RiskAssessment as RiskAssessmentFull } from '@/types/risk-analysis';
import { analyzePropertyFinancials, type FinancialAnalysisInput } from '@/lib/analysis/financial/orchestrator';
import {
  calculateInvestmentScore,
  type InvestmentScoreInput,
  type MarketData,
  type LocationData,
} from '@/lib/analysis/scoring';
import type {
  PropertyReportData,
  PropertyData,
  AuctionDetails,
  Recommendation,
  ComparablesAnalysis,
  ComparableSale,
  AllRiskAnalyses,
  ROIAnalysis,
  CostAnalysis,
  RiskAssessment,
  RiskLevel,
} from '@/types/report';
import type { ScoreBreakdown, PropertyType, ConfidenceResult, ConfidenceLabel, ConfidenceFactor } from '@/types/scoring';
import { getGeoapifyService } from './geoapify-service';
import { getFCCService } from './fcc-service';
import { getCensusService } from './census-service';

// =============================================================================
// Types
// =============================================================================

/**
 * Input for generating a full property report
 */
export interface UnifiedReportInput {
  /** Property ID from Supabase properties table */
  propertyId?: string;
  /** Full property address for lookup */
  address?: string;
  /** Coordinates for direct lookup */
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Options for report generation
 */
export interface UnifiedReportOptions {
  /** Rehab scope for financial calculations */
  rehabScope?: 'cosmetic' | 'light' | 'moderate' | 'heavy' | 'gut';
  /** Expected holding period in months */
  holdingMonths?: number;
  /** Override purchase price (defaults to total_due from property) */
  purchasePrice?: number;
  /** Skip certain analyses */
  skipRiskAnalysis?: boolean;
  skipFinancialAnalysis?: boolean;
  skipScoring?: boolean;
  /** Include location enrichment (amenities, broadband, demographics) */
  includeLocationData?: boolean;
}

/**
 * Result from the unified report orchestrator
 */
export interface UnifiedReportResult {
  success: boolean;
  reportId: string;
  report?: PropertyReportData;
  error?: string;
  metadata: {
    generatedAt: string;
    durationMs: number;
    sources: string[];
    sourcesUsed: string[];
    sourcesFailed: string[];
    confidenceLevel: number;
  };
}

/**
 * Raw property data from Supabase
 */
interface SupabasePropertyData {
  id: string;
  parcel_id: string;
  property_address: string | null;
  owner_name: string | null;
  total_due: number | null;
  tax_amount: number | null;
  tax_year: number | null;
  sale_type: string | null;
  sale_date: string | null;
  auction_status: string | null;
  county_id: string;
  document_id: string | null;
  created_at: string;
  updated_at: string;
  // Pipeline/validation fields
  visual_validation_status: string | null;
  pipeline_stage: string | null;
  has_regrid_data: boolean;
  has_screenshot: boolean;
  // Joined county data
  county?: {
    id: string;
    county_name: string;
    state_code: string;
  };
  // Joined regrid data
  regrid_data?: {
    id: string;
    latitude: number | null;
    longitude: number | null;
    assessed_value: number | null;
    market_value: number | null;
    lot_size_sqft: number | null;
    lot_size_acres: number | null;
    building_sqft: number | null;
    year_built: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    property_type: string | null;
    zoning: string | null;
    land_use: string | null;
    screenshot_url: string | null;
  } | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique report ID
 */
function generateReportId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `rpt_${timestamp}_${random}`;
}

/**
 * Convert Supabase property data to PropertyData format
 */
function convertToPropertyData(
  raw: SupabasePropertyData,
  coordinates?: { lat: number; lng: number }
): PropertyData {
  const regrid = raw.regrid_data;

  return {
    id: raw.id,
    parcel_id: raw.parcel_id,
    address: raw.property_address || 'Unknown Address',
    city: null, // Would need to parse from address
    state: raw.county?.state_code || '',
    zip: null, // Would need to parse from address
    county_id: raw.county_id || '',
    county_name: raw.county?.county_name || '',
    coordinates: coordinates
      ? { latitude: coordinates.lat, longitude: coordinates.lng }
      : (regrid?.latitude && regrid?.longitude
        ? { latitude: regrid.latitude, longitude: regrid.longitude }
        : null),
    // Financial
    assessed_value: regrid?.assessed_value ?? null,
    market_value: regrid?.market_value ?? null,
    total_due: raw.total_due ?? null,
    tax_amount: raw.tax_amount ?? null,
    tax_year: raw.tax_year ?? null,
    // Property characteristics
    lot_size_sqft: regrid?.lot_size_sqft ?? null,
    lot_size_acres: regrid?.lot_size_acres ?? null,
    building_sqft: regrid?.building_sqft ?? null,
    year_built: regrid?.year_built ?? null,
    bedrooms: regrid?.bedrooms ?? null,
    bathrooms: regrid?.bathrooms ?? null,
    property_type: (regrid?.property_type as PropertyType) || 'unknown',
    zoning: regrid?.zoning ?? null,
    land_use: regrid?.land_use ?? null,
    // Auction
    sale_type: raw.sale_type ?? null,
    sale_date: raw.sale_date ? new Date(raw.sale_date) : null,
    // Owner
    owner_name: raw.owner_name ?? null,
    // Pipeline/Validation status
    validation_status: (raw.visual_validation_status as 'APPROVED' | 'CAUTION' | 'REJECT') ?? null,
    pipeline_stage: raw.pipeline_stage ?? null,
    has_regrid_data: raw.has_regrid_data ?? false,
    has_screenshot: raw.has_screenshot ?? false,
    // Images
    screenshot_url: regrid?.screenshot_url ?? null,
  };
}

/**
 * Extract city, state, and zip from an address string
 */
function parseAddress(address: string): { city: string; state: string; zip: string } {
  // Pattern: "123 Main St, City, ST 12345" or "123 Main St, City, State 12345"
  const match = address.match(/,\s*([^,]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?/i);
  if (match) {
    return {
      city: match[1].trim(),
      state: match[2].toUpperCase(),
      zip: match[3] || '',
    };
  }
  return { city: '', state: '', zip: '' };
}

/**
 * Build auction details from property data
 */
function buildAuctionDetails(property: PropertyData): AuctionDetails {
  const saleDate = property.sale_date ?? null;
  const daysUntilSale = saleDate
    ? Math.ceil((saleDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    saleType: property.sale_type || 'unknown',
    saleDate,
    daysUntilSale,
    platform: null, // Would need to fetch from upcoming_sales
    platformUrl: null,
    startingBid: property.total_due ?? null,
    depositRequired: null, // Would need to fetch from auction_rules
    registrationDeadline: null, // Would need to fetch from upcoming_sales
    registrationStatus: 'unknown',
    registrationRequirements: [],
    paymentDeadline: null,
    paymentMethods: [],
    buyersPremiumPercentage: null,
    specialConditions: [],
    countyContact: null,
  };
}

/**
 * Convert risk-analysis.ts RiskLevel to report.ts RiskLevel
 * risk-analysis.ts: 'minimal' | 'low' | 'moderate' | 'high' | 'very_high'
 * report.ts: 'low' | 'medium' | 'high' | 'critical'
 */
function mapToReportRiskLevel(level: string | undefined | null): RiskLevel {
  if (!level) return 'low';
  switch (level.toLowerCase()) {
    case 'minimal':
    case 'low':
    case 'negligible':
    case 'none_known':
      return 'low';
    case 'moderate':
      return 'medium';
    case 'high':
      return 'high';
    case 'very_high':
    case 'extreme':
    case 'severe':
      return 'critical';
    default:
      return 'low';
  }
}

/**
 * Convert risk assessment to AllRiskAnalyses format
 */
function convertRiskToAnalyses(riskData: Awaited<ReturnType<typeof aggregateRiskData>>): AllRiskAnalyses {
  // Helper to find category score by name
  const findCategoryScore = (category: string) =>
    riskData.categoryScores.find((c) =>
      c.category.toLowerCase() === category.toLowerCase()
    );

  // Helper to build a RiskAssessment object (report.ts version) from risk data
  const buildRiskAssessment = (
    type: string,
    name: string,
    riskLevel: RiskLevel,
    score: number,
    summary: string,
    dataSource: string,
    insuranceCost: number | null = null
  ): RiskAssessment => ({
    type,
    name,
    level: riskLevel,
    score,
    summary,
    findings: [],
    mitigations: [],
    insuranceRecommendation: insuranceCost ? `Annual premium estimate: $${insuranceCost.toLocaleString()}` : null,
    estimatedInsuranceCost: insuranceCost,
    dataSource,
    lastUpdated: new Date(),
  });

  // Get insurance estimates
  const insurance = riskData.insuranceEstimates;

  // Build earthquake summary from available data
  const earthquakeSummary = riskData.earthquake
    ? `Seismic hazard: ${riskData.earthquake.hazardLevel}. PGA: ${(riskData.earthquake.pga * 100).toFixed(1)}%g`
    : 'No earthquake data available';

  // Build hurricane summary from available data
  const hurricaneSummary = riskData.hurricane
    ? `Wind Zone: ${riskData.hurricane.windZone}. ${riskData.hurricane.windZoneDescription || ''}`
    : 'No hurricane data available';

  // Build slope summary from available data
  const slopeSummary = riskData.slope
    ? `Stability: ${riskData.slope.stabilityLevel}. Slope: ${riskData.slope.slopePercentage?.toFixed(1) || 'N/A'}%`
    : 'No slope data available';

  // Build wildfire summary from available data
  const wildfireSummary = riskData.wildfire
    ? `Risk level: ${riskData.wildfire.riskLevel}. ${riskData.wildfire.inWUI ? 'In WUI zone' : 'Not in WUI zone'}`
    : 'No wildfire data available';

  // Build sinkhole summary from available data
  const sinkholeSummary = riskData.sinkhole
    ? `Risk level: ${riskData.sinkhole.riskLevel}. ${riskData.sinkhole.inKarstArea ? 'In karst area' : 'Not in karst area'}`
    : 'No sinkhole data available';

  // Build environmental summary from available data
  const environmentalSummary = riskData.environmental
    ? `Risk level: ${riskData.environmental.riskLevel}. ${riskData.environmental.superfundSitesNearby} Superfund sites nearby`
    : 'No environmental data available';

  // Build radon summary from available data
  const radonSummary = riskData.radon
    ? `Zone ${riskData.radon.radonZone}: ${riskData.radon.riskLevel} risk. ${riskData.radon.testingRecommended ? 'Testing recommended' : ''}`
    : 'No radon data available';

  return {
    flood: buildRiskAssessment(
      'flood',
      'Flood Risk',
      mapToReportRiskLevel(riskData.flood?.riskLevel),
      findCategoryScore('flood')?.rawScore || 0,
      riskData.flood ? `Zone ${riskData.flood.zone}: ${riskData.flood.zoneDescription}` : 'No flood data available',
      'FEMA NFHL',
      insurance.floodInsurance
    ),
    earthquake: buildRiskAssessment(
      'earthquake',
      'Earthquake Risk',
      mapToReportRiskLevel(riskData.earthquake?.hazardLevel),
      findCategoryScore('earthquake')?.rawScore || 0,
      earthquakeSummary,
      'USGS',
      insurance.earthquakeInsurance
    ),
    wildfire: buildRiskAssessment(
      'wildfire',
      'Wildfire Risk',
      mapToReportRiskLevel(riskData.wildfire?.riskLevel),
      findCategoryScore('wildfire')?.rawScore || 0,
      wildfireSummary,
      'NASA FIRMS',
      insurance.fireInsurance
    ),
    hurricane: buildRiskAssessment(
      'hurricane',
      'Hurricane Risk',
      mapToReportRiskLevel(riskData.hurricane?.windZone === null ? 'minimal' : riskData.hurricane?.windZone),
      findCategoryScore('hurricane')?.rawScore || 0,
      hurricaneSummary,
      'NOAA',
      insurance.windstormInsurance
    ),
    sinkhole: buildRiskAssessment(
      'sinkhole',
      'Sinkhole Risk',
      mapToReportRiskLevel(riskData.sinkhole?.riskLevel),
      findCategoryScore('sinkhole')?.rawScore || 0,
      sinkholeSummary,
      'State Geological Survey'
    ),
    environmental: buildRiskAssessment(
      'environmental',
      'Environmental Contamination',
      mapToReportRiskLevel(riskData.environmental?.riskLevel),
      findCategoryScore('environmental')?.rawScore || 0,
      environmentalSummary,
      'EPA Envirofacts'
    ),
    radon: buildRiskAssessment(
      'radon',
      'Radon Risk',
      mapToReportRiskLevel(riskData.radon?.riskLevel),
      findCategoryScore('radon')?.rawScore || 0,
      radonSummary,
      'EPA Radon Zones'
    ),
    slope: buildRiskAssessment(
      'slope',
      'Slope/Landslide Risk',
      mapToReportRiskLevel(riskData.slope?.stabilityLevel),
      findCategoryScore('slope')?.rawScore || 0,
      slopeSummary,
      'Elevation Service'
    ),
    overallRiskScore: riskData.riskScore,
    overallRiskLevel: mapToReportRiskLevel(riskData.overallRisk),
    totalInsuranceCosts: insurance.totalAnnualCost,
    recommendations: riskData.recommendations,
    topRiskFactors: riskData.topRiskFactors,
    positiveFactors: riskData.positiveFactors,
    warnings: riskData.warnings,
  };
}

/**
 * Convert financial analysis to ROIAnalysis format
 */
function convertToROIAnalysis(
  financial: Awaited<ReturnType<typeof analyzePropertyFinancials>>
): ROIAnalysis {
  const metrics = financial.metrics;
  const costs = financial.costs;
  const revenue = financial.revenue;

  // Get values from correct locations
  const totalInvestment = costs.grandTotal || 0;
  const estimatedARV = revenue.sale.estimatedARV || 0;
  const expectedProfit = metrics.netProfit || 0;

  // Calculate profit margin from metrics or compute
  const profitMargin = metrics.profitMargin || (estimatedARV > 0 ? (expectedProfit / estimatedARV) * 100 : 0);

  // Calculate 70% rule max allowable offer
  const estimatedRehabCost = costs.rehab?.totalRehab || 0;
  const maximumAllowableOffer = (estimatedARV * 0.7) - estimatedRehabCost;

  // Determine confidence level based on data completeness
  let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
  if (estimatedARV > 0 && totalInvestment > 0 && estimatedRehabCost > 0) {
    confidenceLevel = 'high';
  } else if (estimatedARV > 0 || totalInvestment > 0) {
    confidenceLevel = 'medium';
  }

  return {
    totalInvestment,
    afterRepairValue: estimatedARV,
    estimatedProfit: expectedProfit,
    roiPercentage: metrics.roi || 0,
    annualizedROI: metrics.irr || 0,
    profitMargin,
    cashOnCashReturn: metrics.cashOnCash || 0,
    breakEvenPrice: metrics.breakEvenPrice || 0,
    maximumAllowableOffer: Math.max(0, maximumAllowableOffer),
    confidenceLevel,
    assumptions: [
      { key: 'Holding Period', value: '6 months', source: 'Default' },
      { key: 'Rehab Cost', value: `$${estimatedRehabCost.toLocaleString()}`, source: 'Estimated' },
      { key: 'Selling Costs', value: '8% of ARV', source: 'Default' },
    ],
  };
}

/**
 * Convert financial analysis to CostAnalysis format
 */
function convertToCostAnalysis(
  financial: Awaited<ReturnType<typeof analyzePropertyFinancials>>
): CostAnalysis {
  const costs = financial.costs;
  const revenue = financial.revenue;

  // Calculate totals for percentage breakdown
  const acquisitionTotal = costs.acquisition?.totalAcquisition || 0;
  const rehabTotal = costs.rehab?.totalRehab || 0;
  const holdingTotal = costs.holding?.totalHolding || 0;
  const sellingTotal = costs.selling?.totalSelling || 0;
  const grandTotal = acquisitionTotal + rehabTotal + holdingTotal + sellingTotal;

  // Map acquisition costs from costs.ts to report.ts format
  const acquisition = {
    bidAmount: costs.acquisition?.bidAmount || 0,
    premiumPercentage: costs.acquisition?.bidAmount ? ((costs.acquisition?.buyersPremium || 0) / costs.acquisition.bidAmount) * 100 : 5,
    premiumAmount: costs.acquisition?.buyersPremium || 0,
    titleCosts: (costs.acquisition?.titleSearch || 0) + (costs.acquisition?.titleInsurance || 0),
    recordingFees: costs.acquisition?.recordingFees || 0,
    legalFees: costs.acquisition?.legalFees || 0,
    otherCosts: costs.acquisition?.transferTax || 0,
    total: acquisitionTotal,
  };

  // Map rehab costs
  const rehab = {
    minimumEstimate: rehabTotal * 0.8,
    maximumEstimate: rehabTotal * 1.2,
    expectedEstimate: rehabTotal,
    conditionAssessment: 'unknown' as const,
    breakdown: [
      { category: 'Exterior', description: 'Exterior repairs and improvements', lowEstimate: (costs.rehab?.exterior?.total || 0) * 0.8, highEstimate: (costs.rehab?.exterior?.total || 0) * 1.2 },
      { category: 'Interior', description: 'Interior repairs and improvements', lowEstimate: (costs.rehab?.interior?.total || 0) * 0.8, highEstimate: (costs.rehab?.interior?.total || 0) * 1.2 },
      { category: 'Structural', description: 'Structural repairs', lowEstimate: (costs.rehab?.structural?.total || 0) * 0.8, highEstimate: (costs.rehab?.structural?.total || 0) * 1.2 },
      { category: 'Permits', description: 'Permits and inspections', lowEstimate: (costs.rehab?.permits || 0), highEstimate: (costs.rehab?.permits || 0) },
    ],
  };

  // Map holding costs
  const holding = {
    monthlyTaxes: costs.holding?.monthlyTaxes || 0,
    monthlyInsurance: costs.holding?.monthlyInsurance || 0,
    monthlyUtilities: costs.holding?.monthlyUtilities || 0,
    monthlyMaintenance: costs.holding?.monthlyMaintenance || 0,
    monthlyHOA: costs.holding?.monthlyHoa || 0,
    monthlyTotal: costs.holding?.totalMonthly || 0,
    holdingPeriodMonths: costs.holding?.holdingPeriodMonths || 6,
    totalHoldingCosts: holdingTotal,
  };

  // Map selling costs
  const estimatedSalePrice = revenue.sale.estimatedARV || 100000;
  const selling = {
    commissionPercentage: estimatedSalePrice > 0 ? ((costs.selling?.agentCommission || 0) / estimatedSalePrice) * 100 : 6,
    commissionAmount: costs.selling?.agentCommission || 0,
    closingCostsPercentage: estimatedSalePrice > 0 ? ((costs.selling?.closingCosts || 0) / estimatedSalePrice) * 100 : 2,
    closingCostsAmount: costs.selling?.closingCosts || 0,
    stagingCosts: costs.selling?.staging || 0,
    marketingCosts: costs.selling?.marketing || 0,
    total: sellingTotal,
  };

  // Calculate percentage breakdown
  const calculatePercentage = (amount: number) => grandTotal > 0 ? (amount / grandTotal) * 100 : 0;

  return {
    acquisition,
    rehab,
    holding,
    selling,
    totalCosts: grandTotal,
    costBreakdown: [
      { category: 'Acquisition', amount: acquisitionTotal, percentage: calculatePercentage(acquisitionTotal), color: '#3B82F6' },
      { category: 'Rehab', amount: rehabTotal, percentage: calculatePercentage(rehabTotal), color: '#10B981' },
      { category: 'Holding', amount: holdingTotal, percentage: calculatePercentage(holdingTotal), color: '#F59E0B' },
      { category: 'Selling', amount: sellingTotal, percentage: calculatePercentage(sellingTotal), color: '#EF4444' },
    ],
  };
}

/**
 * Convert financial comparables to ComparablesAnalysis format
 */
function convertToComparablesAnalysis(
  comparables: Awaited<ReturnType<typeof analyzePropertyFinancials>>['comparables'],
  property?: PropertyData
): ComparablesAnalysis {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Build subject from property data
  const subject = {
    address: property?.address || 'Unknown',
    squareFeet: property?.building_sqft || null,
    bedrooms: property?.bedrooms || null,
    bathrooms: property?.bathrooms || null,
    yearBuilt: property?.year_built || null,
    lotSize: property?.lot_size_sqft || null,
  };

  // Map confidence level
  const mapConfidence = (conf: string | undefined): 'high' | 'medium' | 'low' => {
    if (!conf) return 'low';
    if (conf === 'high') return 'high';
    if (conf === 'medium') return 'medium';
    return 'low';
  };

  // Map input ComparableSale to output ComparableSale format
  const mapComparable = (comp: {
    address: string;
    salePrice: number;
    saleDate: string;
    sqft?: number;
    pricePerSqft?: number;
    bedrooms?: number;
    bathrooms?: number;
    yearBuilt?: number;
    distanceMiles?: number;
    similarityScore?: number;
    adjustments?: { type: string; amount: number; reason: string }[];
    adjustedPrice?: number;
  }): ComparableSale => {
    const saleDate = new Date(comp.saleDate);
    const daysSinceSale = Math.floor((now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
    const squareFeet = comp.sqft || null;
    const pricePerSqFt = comp.pricePerSqft || (squareFeet && comp.salePrice ? comp.salePrice / squareFeet : null);

    return {
      address: comp.address,
      salePrice: comp.salePrice,
      saleDate,
      pricePerSqFt,
      squareFeet,
      bedrooms: comp.bedrooms ?? null,
      bathrooms: comp.bathrooms ?? null,
      yearBuilt: comp.yearBuilt ?? null,
      distanceMiles: comp.distanceMiles ?? 0,
      daysSinceSale: Math.max(0, daysSinceSale),
      similarityScore: comp.similarityScore ?? 80,
      adjustments: comp.adjustments ?? [],
      adjustedPrice: comp.adjustedPrice ?? comp.salePrice,
    };
  };

  if (!comparables || comparables.comparablesCount === 0) {
    return {
      subject,
      comparables: [],
      estimatedValue: 0,
      valueLowRange: 0,
      valueHighRange: 0,
      averagePricePerSqFt: null,
      medianPricePerSqFt: null,
      searchRadiusMiles: 1,
      dateRange: { start: sixMonthsAgo, end: now },
      confidenceLevel: 'low',
      dataSource: 'No data available',
      notes: [],
    };
  }

  // Map each comparable to the output format
  const mappedComparables = (comparables.comparables || []).map(mapComparable);

  return {
    subject,
    comparables: mappedComparables,
    estimatedValue: comparables.estimatedARV || 0,
    valueLowRange: comparables.arvLowRange || 0,
    valueHighRange: comparables.arvHighRange || 0,
    averagePricePerSqFt: comparables.averagePricePerSqft || null,
    medianPricePerSqFt: comparables.medianPricePerSqft || null,
    searchRadiusMiles: comparables.searchRadiusMiles || 1,
    dateRange: { start: sixMonthsAgo, end: now },
    confidenceLevel: mapConfidence(comparables.confidence),
    dataSource: comparables.dataSource || 'Realty in US API',
    notes: comparables.notes || [],
  };
}

/**
 * Convert investment score result to ScoreBreakdown format
 * The breakdown is already included in the InvestmentScoreResult
 */
function convertToScoreBreakdown(
  scoreResult: ReturnType<typeof calculateInvestmentScore>
): ScoreBreakdown {
  // The scoreResult.breakdown already contains the full ScoreBreakdown
  return scoreResult.breakdown;
}

/**
 * Create a default ScoreBreakdown for when scoring isn't performed
 */
function createDefaultScoreBreakdown(propertyId: string): ScoreBreakdown {
  const createDefaultCategoryScore = (id: ScoreBreakdown['location']['id'], name: string): ScoreBreakdown['location'] => ({
    id,
    name,
    score: 0,
    maxScore: 25,
    confidence: 0,
    dataCompleteness: 0,
    components: [],
    notes: ['No data available'],
    adjustments: [],
  });

  return {
    id: `default-${propertyId}`,
    propertyId,
    totalScore: 0,
    gradeResult: {
      grade: 'F',
      gradeWithModifier: 'F',
      percentage: 0,
      thresholdMet: 0,
      description: 'No scoring performed',
    },
    confidenceLevel: {
      overall: 0,
      label: 'Very Low',
      factors: [],
      recommendations: ['Insufficient data for reliable scoring'],
    },
    location: createDefaultCategoryScore('location', 'Location'),
    risk: createDefaultCategoryScore('risk', 'Risk'),
    financial: createDefaultCategoryScore('financial', 'Financial'),
    market: createDefaultCategoryScore('market', 'Market'),
    profit: createDefaultCategoryScore('profit', 'Profit'),
    scoringVersion: '1.0.0',
    calculatedAt: new Date(),
    propertyType: 'single_family_residential',
    regionalAdjustments: [],
    warnings: [{
      severity: 'info',
      category: 'overall',
      message: 'Scoring was not performed for this property',
      recommendation: 'Ensure property data is available to enable scoring',
    }],
  };
}

/**
 * Generate recommendations based on all analyses
 */
function generateRecommendations(
  property: PropertyData,
  riskAnalysis: AllRiskAnalyses,
  financial: Awaited<ReturnType<typeof analyzePropertyFinancials>>,
  scoreBreakdown: ScoreBreakdown
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Investment recommendation based on score
  if (scoreBreakdown.totalScore >= 100) {
    recommendations.push({
      id: `rec-investment-${Date.now()}`,
      category: 'action',
      priority: 'high',
      title: 'Strong Investment Opportunity',
      description: `This property scores ${scoreBreakdown.totalScore}/125 (${scoreBreakdown.gradeResult.grade}), indicating excellent investment potential. Consider proceeding with due diligence and preparing bid strategy.`,
      estimatedCost: null,
      timeframe: 'Immediate',
      relatedTo: 'investment-score',
    });
  } else if (scoreBreakdown.totalScore >= 75) {
    recommendations.push({
      id: `rec-investment-${Date.now()}`,
      category: 'action',
      priority: 'medium',
      title: 'Moderate Investment Opportunity',
      description: `This property scores ${scoreBreakdown.totalScore}/125 (${scoreBreakdown.gradeResult.grade}). There are factors that warrant careful consideration. Review the lower-scoring categories before making a decision.`,
      estimatedCost: null,
      timeframe: null,
      relatedTo: 'investment-score',
    });
  } else {
    recommendations.push({
      id: `rec-investment-${Date.now()}`,
      category: 'action',
      priority: 'low',
      title: 'Proceed with Caution',
      description: `This property scores ${scoreBreakdown.totalScore}/125 (${scoreBreakdown.gradeResult.grade}). Multiple areas of concern exist. Carefully evaluate all risk factors before proceeding.`,
      estimatedCost: null,
      timeframe: null,
      relatedTo: 'investment-score',
    });
  }

  // Risk-based recommendations
  if (riskAnalysis.overallRiskLevel === 'high' || riskAnalysis.overallRiskLevel === 'critical') {
    recommendations.push({
      id: `rec-risk-${Date.now()}`,
      category: 'risk_mitigation',
      priority: 'high',
      title: 'High Risk Factors Identified',
      description: `Overall risk level is ${riskAnalysis.overallRiskLevel}. Insurance costs estimated at $${riskAnalysis.totalInsuranceCosts?.toLocaleString()}/year. Factor additional insurance costs into ROI calculations.`,
      estimatedCost: riskAnalysis.totalInsuranceCosts ?? null,
      timeframe: 'Before bidding',
      relatedTo: 'risk-analysis',
    });
  }

  // Flood risk specific
  if (riskAnalysis.flood.level === 'high' || riskAnalysis.flood.estimatedInsuranceCost) {
    recommendations.push({
      id: `rec-flood-${Date.now()}`,
      category: 'risk_mitigation',
      priority: 'high',
      title: 'Flood Insurance Required',
      description: `${riskAnalysis.flood.summary}. Flood insurance is ${riskAnalysis.flood.level === 'high' ? 'required' : 'recommended'}. Obtain flood insurance quotes before finalizing bid amount.`,
      estimatedCost: riskAnalysis.flood.estimatedInsuranceCost ?? null,
      timeframe: 'Before bidding',
      relatedTo: 'flood-risk',
    });
  }

  // Financial recommendations
  if (financial.recommendation) {
    const verdict = financial.recommendation.verdict || '';
    const isStrongRecommendation = verdict === 'strong_buy' || verdict.includes('strong');
    recommendations.push({
      id: `rec-financial-${Date.now()}`,
      category: 'financing',
      priority: isStrongRecommendation ? 'high' : 'medium',
      title: 'Financial Analysis',
      description: `Investment recommendation: ${verdict.replace('_', ' ')}. ${financial.recommendation.keyFactors?.join('. ') || ''} Review detailed financial projections in the report.`,
      estimatedCost: null,
      timeframe: null,
      relatedTo: 'financial-analysis',
    });
  }

  // Title recommendation (always)
  recommendations.push({
    id: `rec-title-${Date.now()}`,
    category: 'due_diligence',
    priority: 'medium',
    title: 'Title Search Recommended',
    description: 'A professional title search has not been performed for this property. Order a title search to identify any liens or encumbrances before bidding.',
    estimatedCost: 250, // Typical title search cost
    timeframe: 'Before bidding',
    relatedTo: 'title-status',
  });

  return recommendations;
}

// =============================================================================
// Main Orchestrator Function
// =============================================================================

/**
 * Generate a complete property analysis report
 *
 * This function orchestrates all analysis engines to produce a comprehensive
 * PropertyReportData structure suitable for display in the frontend.
 *
 * @param input - Property identifier (ID, address, or coordinates)
 * @param options - Report generation options
 * @returns Complete report or error details
 */
export async function generateFullReport(
  input: UnifiedReportInput,
  options: UnifiedReportOptions = {}
): Promise<UnifiedReportResult> {
  const startTime = Date.now();
  const reportId = generateReportId();
  const sourcesUsed: string[] = [];
  const sourcesFailed: string[] = [];

  // Validate input
  if (!input.propertyId && !input.address && !input.coordinates) {
    return {
      success: false,
      reportId,
      error: 'Must provide propertyId, address, or coordinates',
      metadata: {
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        sources: [],
        sourcesUsed: [],
        sourcesFailed: [],
        confidenceLevel: 0,
      },
    };
  }

  try {
    // Step 1: Fetch property data from Supabase
    const supabase = createServerClient();
    if (!supabase) {
      return {
        success: false,
        reportId,
        error: 'Database connection not available',
        metadata: {
          generatedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          sources: ['supabase'],
          sourcesUsed: [],
          sourcesFailed: ['supabase'],
          confidenceLevel: 0,
        },
      };
    }

    let propertyData: SupabasePropertyData | null = null;

    if (input.propertyId) {
      // Fetch by ID with joins
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          county:counties(id, county_name, state_code),
          regrid_data(*)
        `)
        .eq('id', input.propertyId)
        .single();

      if (error) {
        sourcesFailed.push('supabase-property');
        console.error('Failed to fetch property:', error);
      } else {
        propertyData = data as unknown as SupabasePropertyData;
        sourcesUsed.push('supabase-property');
      }
    } else if (input.address) {
      // Search by address
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          county:counties(id, county_name, state_code),
          regrid_data(*)
        `)
        .ilike('property_address', `%${input.address}%`)
        .limit(1)
        .single();

      if (error) {
        sourcesFailed.push('supabase-property');
        console.error('Failed to fetch property by address:', error);
      } else {
        propertyData = data as unknown as SupabasePropertyData;
        sourcesUsed.push('supabase-property');
      }
    }

    // If no property found and no coordinates, we can't proceed
    if (!propertyData && !input.coordinates) {
      return {
        success: false,
        reportId,
        error: 'Property not found in database',
        metadata: {
          generatedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          sources: ['supabase'],
          sourcesUsed,
          sourcesFailed,
          confidenceLevel: 0,
        },
      };
    }

    // Convert to PropertyData format
    const property: PropertyData = propertyData
      ? convertToPropertyData(propertyData, input.coordinates)
      : {
          id: 'temp-' + Date.now(),
          parcel_id: 'unknown',
          address: input.address || 'Unknown',
          city: null,
          state: '',
          zip: null,
          county_id: '',
          county_name: '',
          owner_name: null,
          total_due: null,
          tax_amount: null,
          tax_year: null,
          sale_type: null,
          sale_date: null,
          coordinates: input.coordinates
            ? { latitude: input.coordinates.lat, longitude: input.coordinates.lng }
            : null,
          lot_size_sqft: null,
          lot_size_acres: null,
          building_sqft: null,
          year_built: null,
          bedrooms: null,
          bathrooms: null,
          assessed_value: null,
          market_value: null,
          property_type: 'single_family_residential',
          zoning: null,
          land_use: null,
          validation_status: null,
          pipeline_stage: null,
          has_regrid_data: false,
          has_screenshot: false,
          screenshot_url: null,
        };

    // Parse address for city/state/zip if needed
    if (property.address && (!property.city || !property.state)) {
      const parsed = parseAddress(property.address);
      property.city = property.city || parsed.city;
      property.state = property.state || parsed.state;
      property.zip = property.zip || parsed.zip;
    }

    // Determine coordinates for API calls (normalize to lat/lng format)
    const coordinates: { lat: number; lng: number } | undefined = property.coordinates
      ? { lat: property.coordinates.latitude, lng: property.coordinates.longitude }
      : input.coordinates;

    if (!coordinates) {
      return {
        success: false,
        reportId,
        error: 'No coordinates available for property analysis',
        metadata: {
          generatedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          sources: ['supabase'],
          sourcesUsed,
          sourcesFailed,
          confidenceLevel: 0,
        },
      };
    }

    // Step 2: Run analyses in parallel
    const analysisPromises: Promise<void>[] = [];
    let riskAnalysis: AllRiskAnalyses | undefined;
    let riskAssessmentForScoring: RiskAssessmentFull | undefined; // Keep original for scorer
    let financialAnalysis: Awaited<ReturnType<typeof analyzePropertyFinancials>> | undefined;
    let scoreResult: ReturnType<typeof calculateInvestmentScore> | undefined;
    let locationData: LocationData | undefined;
    let marketData: MarketData | undefined;

    // Risk Analysis
    if (!options.skipRiskAnalysis) {
      analysisPromises.push(
        (async () => {
          try {
            const riskInput: RiskAggregationInput = {
              coordinates,
              state: property.state || '',
              county: property.county_name,
              propertyValue: property.market_value ?? property.assessed_value ?? undefined,
              buildingSqft: property.building_sqft ?? undefined,
            };
            const riskResult = await aggregateRiskData(riskInput);
            riskAssessmentForScoring = riskResult; // Keep original for scorer
            riskAnalysis = convertRiskToAnalyses(riskResult);
            sourcesUsed.push('risk-aggregator');
          } catch (error) {
            console.error('Risk analysis failed:', error);
            sourcesFailed.push('risk-aggregator');
          }
        })()
      );
    }

    // Financial Analysis
    if (!options.skipFinancialAnalysis) {
      analysisPromises.push(
        (async () => {
          try {
            const financialInput: FinancialAnalysisInput = {
              property: {
                id: property.id,
                address: property.address || 'Unknown',
                state: property.state || undefined,
                county: property.county_name || undefined,
                sqft: property.building_sqft ?? undefined,
                lotSizeSqft: property.lot_size_sqft ?? undefined,
                bedrooms: property.bedrooms ?? undefined,
                bathrooms: property.bathrooms ?? undefined,
                yearBuilt: property.year_built ?? undefined,
                propertyType: property.property_type || undefined,
                totalDue: property.total_due ?? undefined,
              },
              purchasePrice: options.purchasePrice || property.total_due || 0,
              riskScore: 15, // Default mid-range until calculated
              locationScore: 15,
              marketScore: 15,
              options: {
                rehabScope: options.rehabScope || 'moderate',
                holdingMonths: options.holdingMonths || 6,
              },
            };
            financialAnalysis = await analyzePropertyFinancials(financialInput);
            sourcesUsed.push('financial-orchestrator');

            // Extract market data for scoring
            if (financialAnalysis.comparables && financialAnalysis.comparables.comparablesCount > 0) {
              marketData = {
                medianDaysOnMarket: undefined, // Not available in ComparablesAnalysis
                priceChangeYoY: undefined, // Would need historical data
                inventoryCount: undefined, // Would need MLS data
                absorptionRate: undefined, // Would need additional data
                medianSalePrice: undefined, // Only medianPricePerSqft available
                pricePerSqFt: financialAnalysis.comparables.averagePricePerSqft,
                competitionLevel: undefined, // Would need additional market data
              };
            }
          } catch (error) {
            console.error('Financial analysis failed:', error);
            sourcesFailed.push('financial-orchestrator');
          }
        })()
      );
    }

    // Location Data (amenities, broadband, demographics)
    if (options.includeLocationData !== false) {
      analysisPromises.push(
        (async () => {
          try {
            const geoapify = getGeoapifyService();
            const amenitiesResult = await geoapify.getAmenitiesSummary(
              coordinates.lat,
              coordinates.lng,
              5000 // 5km radius
            );
            sourcesUsed.push('geoapify-amenities');

            // Calculate total amenity count from all categories
            const counts = amenitiesResult.data.counts as Record<string, number>;
            const totalAmenities = Object.values(counts).reduce((sum, count) => sum + (count || 0), 0);

            locationData = {
              walkScore: amenitiesResult.data.score,
              amenityCount: totalAmenities,
              // Transit score approximated from bus station count
              transitScore: Math.min((counts.bus_station || 0) * 10, 100),
            };
          } catch (error) {
            console.error('Amenities fetch failed:', error);
            sourcesFailed.push('geoapify-amenities');
          }

          // Broadband
          try {
            const fcc = getFCCService();
            const broadbandResult = await fcc.getBroadbandAvailability(
              coordinates.lat,
              coordinates.lng
            );
            sourcesUsed.push('fcc-broadband');
            if (locationData) {
              // High speed = not underserved (>= 25/3 Mbps)
              locationData.broadbandAvailable = !broadbandResult.data.summary.underserved;
              locationData.broadbandScore = broadbandResult.data.connectivityScore;
            }
          } catch (error) {
            console.error('Broadband fetch failed:', error);
            sourcesFailed.push('fcc-broadband');
          }

          // Demographics - First get FIPS from coordinates, then fetch demographics
          try {
            const census = getCensusService();
            // Get geographic data (FIPS codes) from coordinates first
            const geoResult = await census.getGeographicData(
              coordinates.lat,
              coordinates.lng
            );

            if (geoResult.data?.fips) {
              const demoResult = await census.getDemographics(geoResult.data.fips);
              sourcesUsed.push('census-demographics');
              if (locationData && demoResult.data) {
                // Set both field names for compatibility
                locationData.medianIncome = demoResult.data.medianHouseholdIncome;
                locationData.medianHouseholdIncome = demoResult.data.medianHouseholdIncome;
                // Add additional demographics from Census ACS
                if (demoResult.data.medianAge) {
                  locationData.medianAge = demoResult.data.medianAge;
                }
                if (demoResult.data.ownerOccupiedPct) {
                  locationData.homeownershipRate = demoResult.data.ownerOccupiedPct;
                }
                if (demoResult.data.vacancyRate) {
                  locationData.vacancyRate = demoResult.data.vacancyRate;
                }
              }
            } else {
              console.warn('No FIPS code returned from census geocoding');
              sourcesFailed.push('census-demographics');
            }
          } catch (error) {
            console.error('Demographics fetch failed:', error);
            sourcesFailed.push('census-demographics');
          }
        })()
      );
    }

    // Wait for all parallel analyses
    await Promise.allSettled(analysisPromises);

    // Step 3: Calculate Investment Score
    if (!options.skipScoring) {
      try {
        const scoreInput: InvestmentScoreInput = {
          property,
          riskAssessment: riskAssessmentForScoring, // Use original RiskAssessment directly
          financialAnalysis, // Pass the full FinancialAnalysis directly
          marketData,
          locationData,
          purchasePrice: options.purchasePrice ?? property.total_due ?? undefined,
        };

        scoreResult = calculateInvestmentScore(scoreInput);
        sourcesUsed.push('investment-scorer');
      } catch (error) {
        console.error('Scoring failed:', error);
        sourcesFailed.push('investment-scorer');
      }
    }

    // Step 4: Build the complete report
    const scoreBreakdown: ScoreBreakdown = scoreResult
      ? convertToScoreBreakdown(scoreResult)
      : createDefaultScoreBreakdown(property.id);

    // Create default risk assessment for each category
    const createDefaultRiskAssessment = (type: string, name: string): RiskAssessment => ({
      type,
      name,
      level: 'low',
      score: 0,
      summary: 'Risk assessment not performed',
      findings: [],
      mitigations: [],
      insuranceRecommendation: null,
      estimatedInsuranceCost: null,
      dataSource: '',
      lastUpdated: null,
    });

    const defaultRiskAnalysis: AllRiskAnalyses = riskAnalysis || {
      flood: createDefaultRiskAssessment('flood', 'Flood Risk'),
      earthquake: createDefaultRiskAssessment('earthquake', 'Earthquake Risk'),
      wildfire: createDefaultRiskAssessment('wildfire', 'Wildfire Risk'),
      hurricane: createDefaultRiskAssessment('hurricane', 'Hurricane Risk'),
      sinkhole: createDefaultRiskAssessment('sinkhole', 'Sinkhole Risk'),
      environmental: createDefaultRiskAssessment('environmental', 'Environmental Risk'),
      radon: createDefaultRiskAssessment('radon', 'Radon Risk'),
      slope: createDefaultRiskAssessment('slope', 'Slope/Landslide Risk'),
      overallRiskScore: 0,
      overallRiskLevel: 'low',
      totalInsuranceCosts: 0,
      recommendations: [],
      topRiskFactors: [],
      positiveFactors: [],
      warnings: [],
    };

    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const comparablesAnalysis: ComparablesAnalysis = financialAnalysis
      ? convertToComparablesAnalysis(financialAnalysis.comparables, property)
      : {
          subject: {
            address: property.address || 'Unknown',
            squareFeet: property.building_sqft || null,
            bedrooms: property.bedrooms || null,
            bathrooms: property.bathrooms || null,
            yearBuilt: property.year_built || null,
            lotSize: property.lot_size_sqft || null,
          },
          comparables: [],
          estimatedValue: 0,
          valueLowRange: 0,
          valueHighRange: 0,
          averagePricePerSqFt: null,
          medianPricePerSqFt: null,
          searchRadiusMiles: 1,
          dateRange: { start: sixMonthsAgo, end: now },
          confidenceLevel: 'low',
          dataSource: '',
          notes: [],
        };

    const roiAnalysis: ROIAnalysis = financialAnalysis
      ? convertToROIAnalysis(financialAnalysis)
      : {
          totalInvestment: 0,
          afterRepairValue: 0,
          estimatedProfit: 0,
          roiPercentage: 0,
          annualizedROI: 0,
          profitMargin: 0,
          cashOnCashReturn: 0,
          breakEvenPrice: 0,
          maximumAllowableOffer: 0,
          confidenceLevel: 'low',
          assumptions: [],
        };

    const costAnalysis: CostAnalysis = financialAnalysis
      ? convertToCostAnalysis(financialAnalysis)
      : {
          acquisition: {
            bidAmount: 0,
            premiumPercentage: 5,
            premiumAmount: 0,
            titleCosts: 0,
            recordingFees: 0,
            legalFees: 0,
            otherCosts: 0,
            total: 0,
          },
          rehab: {
            minimumEstimate: 0,
            maximumEstimate: 0,
            expectedEstimate: 0,
            conditionAssessment: 'unknown',
            breakdown: [],
          },
          holding: {
            monthlyTaxes: 0,
            monthlyInsurance: 0,
            monthlyUtilities: 0,
            monthlyMaintenance: 0,
            monthlyHOA: 0,
            monthlyTotal: 0,
            holdingPeriodMonths: 6,
            totalHoldingCosts: 0,
          },
          selling: {
            commissionPercentage: 6,
            commissionAmount: 0,
            closingCostsPercentage: 2,
            closingCostsAmount: 0,
            stagingCosts: 0,
            marketingCosts: 0,
            total: 0,
          },
          totalCosts: 0,
          costBreakdown: [],
        };

    const auctionDetails = buildAuctionDetails(property);

    const recommendations = financialAnalysis
      ? generateRecommendations(property, defaultRiskAnalysis, financialAnalysis, scoreBreakdown)
      : [];

    // Calculate overall confidence
    const confidenceLevel = Math.round(
      (sourcesUsed.length / (sourcesUsed.length + sourcesFailed.length)) * 100
    ) || 0;

    // Build confidence factors based on data sources
    const confidenceFactors: ConfidenceFactor[] = [];

    if (sourcesUsed.includes('regrid')) {
      confidenceFactors.push({
        name: 'Regrid Property Data',
        impact: 15,
        weight: 0.2,
        status: 'positive',
        description: 'Property details from Regrid parcel data',
      });
    }

    if (sourcesUsed.includes('realty_api')) {
      confidenceFactors.push({
        name: 'Comparable Sales Data',
        impact: 20,
        weight: 0.25,
        status: 'positive',
        description: 'Recent comparable sales from Realty API',
      });
    }

    if (sourcesUsed.includes('fema') || sourcesUsed.includes('usgs')) {
      confidenceFactors.push({
        name: 'Risk Assessment Data',
        impact: 15,
        weight: 0.2,
        status: 'positive',
        description: 'Environmental and hazard risk data from federal sources',
      });
    }

    if (sourcesFailed.length > 0) {
      confidenceFactors.push({
        name: 'Missing Data Sources',
        impact: -10 * sourcesFailed.length,
        weight: 0.15,
        status: 'negative',
        description: `${sourcesFailed.length} data source(s) unavailable: ${sourcesFailed.join(', ')}`,
      });
    }

    // Determine confidence label based on level
    let confidenceLabel: ConfidenceLabel;
    if (confidenceLevel >= 90) {
      confidenceLabel = 'Very High';
    } else if (confidenceLevel >= 75) {
      confidenceLabel = 'High';
    } else if (confidenceLevel >= 50) {
      confidenceLabel = 'Moderate';
    } else if (confidenceLevel >= 25) {
      confidenceLabel = 'Low';
    } else {
      confidenceLabel = 'Very Low';
    }

    // Generate recommendations based on missing data
    const confidenceRecommendations: string[] = [];
    if (sourcesFailed.includes('realty_api')) {
      confidenceRecommendations.push('Obtain comparable sales data for more accurate valuation');
    }
    if (sourcesFailed.includes('regrid')) {
      confidenceRecommendations.push('Verify property details from county records');
    }
    if (!sourcesUsed.includes('fema')) {
      confidenceRecommendations.push('Check FEMA flood maps for flood zone information');
    }

    const overallConfidence: ConfidenceResult = {
      overall: confidenceLevel,
      label: confidenceLabel,
      factors: confidenceFactors,
      recommendations: confidenceRecommendations,
    };

    const report: PropertyReportData = {
      property,
      scoreBreakdown,
      riskAnalysis: defaultRiskAnalysis,
      comparables: comparablesAnalysis,
      roiAnalysis,
      costAnalysis,
      auctionDetails,
      recommendations,
      metadata: {
        generatedAt: new Date(),
        reportVersion: '2.0.0',
        dataSources: sourcesUsed,
        dataFreshness: 'current', // All data fetched live
        overallConfidence,
      },
    };

    return {
      success: true,
      reportId,
      report,
      metadata: {
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        sources: Array.from(new Set([...sourcesUsed, ...sourcesFailed])),
        sourcesUsed,
        sourcesFailed,
        confidenceLevel,
      },
    };
  } catch (error) {
    console.error('Report generation failed:', error);
    return {
      success: false,
      reportId,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      metadata: {
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        sources: Array.from(new Set([...sourcesUsed, ...sourcesFailed])),
        sourcesUsed,
        sourcesFailed,
        confidenceLevel: 0,
      },
    };
  }
}

/**
 * Generate a report with mock data for demo/testing purposes
 */
export async function generateMockReport(
  propertyAddress: string = '456 Oak Street, Altoona, PA 16602'
): Promise<UnifiedReportResult> {
  // This would return a pre-built mock report
  // For now, we'll try to generate a real report and fall back gracefully
  return generateFullReport(
    { address: propertyAddress },
    { includeLocationData: true }
  );
}

// Export for use in API routes
export default generateFullReport;
