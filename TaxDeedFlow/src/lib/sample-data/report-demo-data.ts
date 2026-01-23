/**
 * Sample Data for Report Demo Page
 *
 * Contains all sample/mock data used in the property analysis report demo page.
 * This data is used for demonstration purposes and as fallback when real data
 * is unavailable.
 *
 * @module lib/sample-data/report-demo-data
 * @author Claude Code Agent
 * @date 2026-01-22
 */

// Import types
import type { Grade } from "@/types/report";
import type { CategoryScore } from "@/components/report/sections/InvestmentScore";
import type { RiskAssessment, InsuranceEstimates } from "@/types/risk-analysis";
import type { FinancialAnalysis, ComparableSale } from "@/lib/analysis/financial/types";

// ============================================
// Sample Property Details
// ============================================

/** Sample property details */
export const samplePropertyDetails = {
  parcelId: "01.01-04..-156.00-000",
  address: "456 Oak Street",
  city: "Altoona",
  state: "PA",
  zip: "16602",
  county: "Blair",
  propertyType: "Single Family Residential",
  lotSize: "0.18 acres (7,840 sqft)",
  buildingSqft: 1450,
  yearBuilt: 1952,
  bedrooms: 3,
  bathrooms: 1.5,
  stories: 2,
  zoning: "R-1 Residential",
  assessedValue: 85000,
  taxAmount: 2450,
  ownerName: "ESTATE OF JOHN DOE",
  ownerAddress: "456 Oak Street, Altoona, PA 16602",
  legalDescription: "LOT 156 PLAN BOOK 12 PAGE 45 ALTOONA CITY",
  imageUrl: "/placeholder-property.jpg",
  coordinates: {
    lat: 40.5186,
    lng: -78.3947,
  },
  // Additional fields for API compatibility
  marketValue: 125000,
  landUse: "Residential",
  saleType: "repository" as const,
  saleDate: "2026-03-11",
  minimumBid: 2450,
  auctionStatus: "active" as const,
  hasRegridData: false,
};

// ============================================
// Sample Investment Score Categories
// ============================================

/** Sample investment score categories */
export const sampleCategories: CategoryScore[] = [
  {
    name: "Location",
    key: "location",
    score: 21,
    maxScore: 25,
    grade: "A-" as Grade,
    factors: ["Good school district (7/10)", "Low crime area", "Near downtown amenities"],
    breakdown: [
      { label: "Neighborhood Quality", score: 8, maxScore: 10 },
      { label: "School Rating", score: 7, maxScore: 10 },
      { label: "Accessibility", score: 6, maxScore: 5 },
    ],
  },
  {
    name: "Risk",
    key: "risk",
    score: 19,
    maxScore: 25,
    grade: "B+" as Grade,
    factors: ["Clear title expected", "No flood zone", "Minor environmental concerns"],
    breakdown: [
      { label: "Title Risk", score: 8, maxScore: 10 },
      { label: "Environmental", score: 6, maxScore: 10 },
      { label: "Property Condition", score: 5, maxScore: 5 },
    ],
  },
  {
    name: "Financial",
    key: "financial",
    score: 22,
    maxScore: 25,
    grade: "A" as Grade,
    factors: ["Below market value", "Low acquisition cost", "Favorable financing potential"],
    breakdown: [
      { label: "Price vs Value", score: 9, maxScore: 10 },
      { label: "Cost Analysis", score: 8, maxScore: 10 },
      { label: "Financing", score: 5, maxScore: 5 },
    ],
  },
  {
    name: "Market",
    key: "market",
    score: 18,
    maxScore: 25,
    grade: "B" as Grade,
    factors: ["Stable market conditions", "Moderate demand", "Average days on market"],
    breakdown: [
      { label: "Market Trends", score: 7, maxScore: 10 },
      { label: "Demand/Supply", score: 6, maxScore: 10 },
      { label: "Comparables", score: 5, maxScore: 5 },
    ],
  },
  {
    name: "Profit",
    key: "profit",
    score: 17,
    maxScore: 25,
    grade: "B" as Grade,
    factors: ["Strong ROI potential (42%)", "Multiple exit strategies", "Good cash flow potential"],
    breakdown: [
      { label: "ROI Potential", score: 7, maxScore: 10 },
      { label: "Cash Flow", score: 5, maxScore: 10 },
      { label: "Exit Options", score: 5, maxScore: 5 },
    ],
  },
];

// ============================================
// Sample Risk Assessment
// ============================================

/** Sample risk assessment data */
export const sampleRiskAssessment: RiskAssessment = {
  overallRisk: "moderate",
  riskScore: 35,
  confidenceLevel: 78,
  flood: {
    zone: "X",
    zoneDescription: "Area of minimal flood hazard",
    riskLevel: "minimal",
    insuranceRequired: false,
    annualPremiumEstimate: null,
    baseFloodElevation: null,
    propertyElevation: 1250,
    elevationDifference: null,
    floodwayStatus: "outside",
    historicalFlooding: null,
    mitigationRecommendations: [],
    dataSource: {
      name: "FEMA NFHL",
      type: "api",
      reliability: "high",
    },
    confidence: 95,
  },
  earthquake: {
    hazardLevel: "very_low",
    pga: 0.05,
    spectralAcceleration02: 0.08,
    spectralAcceleration10: 0.03,
    distanceToFault: null,
    nearestFaultName: null,
    historicalQuakeCount: 2,
    maxHistoricalMagnitude: 2.5,
    seismicDesignCategory: "A",
    mitigationRecommendations: [],
    dataSource: {
      name: "USGS",
      type: "api",
      reliability: "high",
    },
    confidence: 90,
  },
  wildfire: {
    riskLevel: "low",
    whpScore: 2,
    inWUI: false,
    wuiType: null,
    activeFiresNearby: 0,
    distanceToNearestFire: null,
    historicalFireCount: 0,
    recentAcresBurned: null,
    fuelLoad: "light",
    defensibleSpaceRequired: false,
    buildingRequirements: [],
    insuranceConsiderations: [],
    evacuationAccessibility: "good",
    mitigationRecommendations: [],
    dataSource: {
      name: "NASA FIRMS",
      type: "api",
      reliability: "high",
    },
    confidence: 85,
  },
  hurricane: {
    windZone: null,
    windZoneDescription: null,
    maxWindSpeed: null,
    stormSurgeZone: null,
    stormSurgeDescription: null,
    evacuationZone: null,
    historicalStorms: null,
    buildingCodeRequirements: [],
    insuranceConsiderations: [],
    dataSource: {
      name: "NOAA",
      type: "api",
      reliability: "high",
    },
    confidence: 95,
  },
  sinkhole: {
    riskLevel: "low",
    inKarstArea: false,
    karstType: null,
    distanceToNearestSinkhole: null,
    sinkholesWithinOneMile: 0,
    sinkholesWithinFiveMiles: 1,
    subsidenceHistory: false,
    stateRequiresDisclosure: false,
    insuranceConsiderations: [],
    mitigationRecommendations: [],
    dataSource: {
      name: "State Geological Survey",
      type: "database",
      reliability: "medium",
    },
    confidence: 70,
  },
  environmental: {
    riskLevel: "low",
    superfundSitesNearby: 0,
    brownfieldSitesNearby: 1,
    ustSitesNearby: 2,
    triSitesNearby: 0,
    nearestSite: {
      name: "Former Gas Station",
      epaId: "PAD123456789",
      type: "ust",
      status: "remediated",
      distanceMiles: 0.8,
      direction: "NE",
      contaminants: ["Petroleum"],
      groundwaterImpact: false,
    },
    nearbySites: [],
    phaseIRecommended: false,
    groundwaterConcerns: [],
    airQualityConcerns: [],
    historicalIndustrialUse: false,
    mitigationRecommendations: [],
    dataSource: {
      name: "EPA Envirofacts",
      type: "api",
      reliability: "high",
    },
    confidence: 80,
  },
  radon: {
    radonZone: 1,
    riskLevel: "moderate",
    predictedLevel: 4.5,
    testingRecommended: true,
    stateAverageLevel: 8.6,
    countyAverageLevel: 5.2,
    percentAboveActionLevel: 42,
    mitigationTypicallyNeeded: true,
    estimatedMitigationCost: { min: 800, max: 1500 },
    stateDisclosureRequired: true,
    mitigationRecommendations: ["Radon test recommended before purchase", "Budget $800-1500 for mitigation if needed"],
    dataSource: {
      name: "EPA",
      type: "database",
      reliability: "high",
    },
    confidence: 75,
  },
  slope: {
    stabilityLevel: "stable",
    slopePercentage: 8,
    maxSlopePercentage: 15,
    slopeAspect: "S",
    landslideSusceptibility: "very_low",
    inLandslideZone: false,
    historicalLandslides: 0,
    soilType: "Sandy Loam",
    drainageConsiderations: ["Good natural drainage"],
    mitigationRecommendations: [],
    dataSource: {
      name: "USGS",
      type: "calculated",
      reliability: "medium",
    },
    confidence: 70,
  },
  categoryScores: [
    { category: "flood", rawScore: 5, weight: 0.2, weightedScore: 1, riskLevel: "minimal", dataAvailability: "full" },
    { category: "earthquake", rawScore: 5, weight: 0.1, weightedScore: 0.5, riskLevel: "minimal", dataAvailability: "full" },
    { category: "wildfire", rawScore: 15, weight: 0.15, weightedScore: 2.25, riskLevel: "low", dataAvailability: "full" },
    { category: "hurricane", rawScore: 0, weight: 0.15, weightedScore: 0, riskLevel: "minimal", dataAvailability: "full" },
    { category: "sinkhole", rawScore: 10, weight: 0.1, weightedScore: 1, riskLevel: "low", dataAvailability: "partial" },
    { category: "environmental", rawScore: 20, weight: 0.15, weightedScore: 3, riskLevel: "low", dataAvailability: "full" },
    { category: "radon", rawScore: 45, weight: 0.1, weightedScore: 4.5, riskLevel: "moderate", dataAvailability: "full" },
    { category: "slope", rawScore: 10, weight: 0.05, weightedScore: 0.5, riskLevel: "low", dataAvailability: "partial" },
  ],
  weightsUsed: {
    flood: 0.2,
    earthquake: 0.1,
    wildfire: 0.15,
    hurricane: 0.15,
    sinkhole: 0.1,
    environmental: 0.15,
    radon: 0.1,
    slope: 0.05,
  },
  insuranceEstimates: {
    floodInsurance: null,
    earthquakeInsurance: null,
    fireInsurance: 850,
    windstormInsurance: null,
    totalAnnualCost: 850,
    availabilityWarnings: [],
  },
  recommendations: [
    "Conduct radon test before purchase",
    "Budget for potential radon mitigation system",
    "Standard homeowner's insurance should be sufficient",
  ],
  mitigationActions: [
    {
      riskType: "radon",
      action: "Install radon mitigation system",
      priority: 1,
      estimatedCost: { min: 800, max: 1500 },
      effectiveness: "high",
      timeframe: "1-2 days",
      insuranceImpact: null,
      roiExplanation: "Eliminates health risk, required for resale disclosure",
    },
  ],
  warnings: ["Pennsylvania is in EPA Radon Zone 1 - testing strongly recommended"],
  topRiskFactors: ["Elevated radon potential (Zone 1)"],
  positiveFactors: [
    "Outside flood zone",
    "No hurricane exposure",
    "Low earthquake risk",
    "No nearby Superfund sites",
    "Stable slope conditions",
  ],
  assessedAt: new Date(),
};

// ============================================
// Sample Insurance Estimates
// ============================================

/** Sample insurance estimates */
export const sampleInsuranceEstimates: InsuranceEstimates = {
  floodInsurance: null,
  earthquakeInsurance: null,
  fireInsurance: 850,
  windstormInsurance: null,
  totalAnnualCost: 850,
  availabilityWarnings: [],
};

// ============================================
// Sample Comparable Sales
// ============================================

/** Sample comparable sales */
export const sampleComparables: ComparableSale[] = [
  {
    id: "comp-1",
    address: "412 Oak Street",
    city: "Altoona",
    state: "PA",
    zip: "16602",
    salePrice: 142000,
    saleDate: "2025-11-15",
    sqft: 1380,
    lotSizeSqft: 7200,
    bedrooms: 3,
    bathrooms: 1,
    yearBuilt: 1948,
    propertyType: "Single Family",
    pricePerSqft: 102.90,
    distanceMiles: 0.2,
    similarityScore: 92,
    source: "MLS",
  },
  {
    id: "comp-2",
    address: "523 Maple Avenue",
    city: "Altoona",
    state: "PA",
    zip: "16602",
    salePrice: 155000,
    saleDate: "2025-10-22",
    sqft: 1520,
    lotSizeSqft: 8500,
    bedrooms: 3,
    bathrooms: 2,
    yearBuilt: 1955,
    propertyType: "Single Family",
    pricePerSqft: 101.97,
    distanceMiles: 0.4,
    similarityScore: 88,
    source: "MLS",
  },
  {
    id: "comp-3",
    address: "789 Elm Street",
    city: "Altoona",
    state: "PA",
    zip: "16601",
    salePrice: 138000,
    saleDate: "2025-09-30",
    sqft: 1350,
    lotSizeSqft: 6800,
    bedrooms: 3,
    bathrooms: 1.5,
    yearBuilt: 1950,
    propertyType: "Single Family",
    pricePerSqft: 102.22,
    distanceMiles: 0.6,
    similarityScore: 85,
    source: "Public Records",
  },
  {
    id: "comp-4",
    address: "234 Pine Road",
    city: "Altoona",
    state: "PA",
    zip: "16602",
    salePrice: 165000,
    saleDate: "2025-08-15",
    sqft: 1600,
    lotSizeSqft: 9000,
    bedrooms: 4,
    bathrooms: 2,
    yearBuilt: 1960,
    propertyType: "Single Family",
    pricePerSqft: 103.13,
    distanceMiles: 0.8,
    similarityScore: 78,
    source: "MLS",
  },
];

// ============================================
// Sample Financial Analysis
// ============================================

/** Sample financial analysis */
export const sampleFinancialAnalysis: FinancialAnalysis = {
  costs: {
    acquisition: {
      bidAmount: 45000,
      buyersPremium: 4500,
      transferTax: 900,
      recordingFees: 250,
      titleSearch: 350,
      titleInsurance: 800,
      legalFees: 500,
      totalAcquisition: 52300,
    },
    rehab: {
      exterior: { roof: 0, siding: 0, windows: 2500, doors: 500, landscaping: 1000, hardscape: 0, total: 4000 },
      interior: { flooring: 4500, paint: 2000, kitchen: 8000, bathrooms: 3500, electrical: 1500, plumbing: 1000, hvac: 0, fixtures: 1500, total: 22000 },
      structural: { foundation: 0, framing: 0, insulation: 0, total: 0 },
      permits: 500,
      laborMultiplier: 0.95,
      materialMultiplier: 1.02,
      totalRehab: 26500,
    },
    holding: {
      monthlyTaxes: 204,
      monthlyInsurance: 125,
      monthlyUtilities: 200,
      monthlyMaintenance: 100,
      monthlyLoanPayment: 0,
      monthlyHoa: 0,
      totalMonthly: 629,
      holdingPeriodMonths: 6,
      totalHolding: 3774,
    },
    selling: {
      agentCommission: 9000,
      closingCosts: 3000,
      staging: 1500,
      marketing: 500,
      homeWarranty: 500,
      sellerConcessions: 3000,
      totalSelling: 17500,
    },
    totalCosts: 100074,
    contingency: 10007,
    grandTotal: 110081,
    confidence: "medium",
    dataQuality: 75,
    warnings: ["Rehab costs estimated based on property age and typical condition"],
  },
  revenue: {
    sale: {
      estimatedARV: 150000,
      lowEstimate: 138000,
      highEstimate: 165000,
      pricePerSqft: 103.45,
      comparablesUsed: 4,
      confidence: "medium",
    },
    rental: {
      monthlyRent: 1200,
      annualGrossRent: 14400,
      vacancyRate: 0.08,
      effectiveGrossIncome: 13248,
      annualOperatingExpenses: 4800,
      noi: 8448,
      monthlyCashFlow: 704,
      annualCashFlow: 8448,
    },
  },
  metrics: {
    roi: 36.3,
    profitMargin: 26.6,
    priceToARV: 0.30,
    totalInvestmentToARV: 0.73,
    cashOnCash: 15.2,
    netProfit: 39919,
    grossProfit: 105000,
    breakEvenPrice: 110081,
    irr: 72.6,
    capRate: 7.7,
  },
  comparables: {
    comparables: sampleComparables,
    estimatedARV: 150000,
    arvLowRange: 138000,
    arvHighRange: 165000,
    averagePricePerSqft: 102.56,
    medianPricePerSqft: 102.22,
    comparablesCount: 4,
    searchRadiusMiles: 1.0,
    confidence: "medium",
    dataSource: "MLS + Public Records",
    notes: ["Comparables selected within 1 mile radius", "Adjusted for bedroom/bathroom count differences"],
  },
  recommendation: {
    verdict: "strong_buy",
    confidence: 82,
    maxBid: 55000,
    targetProfit: 35000,
    keyFactors: [
      "36.3% ROI exceeds minimum threshold of 20%",
      "Acquisition at 30% of ARV (target: 70% rule)",
      "Strong rental fallback with 7.7% cap rate",
      "Moderate rehab scope - cosmetic updates only",
    ],
    risks: [
      "Rehab costs may exceed estimate if hidden issues found",
      "Pennsylvania radon Zone 1 - mitigation may be needed",
      "Market appreciation is moderate in this area",
    ],
    opportunities: [
      "Potential to add bathroom for increased value",
      "Basement could be finished for additional sqft",
      "Strong rental market if flip doesn't meet timeline",
    ],
    exitStrategy: "flip",
    timelineMonths: 6,
  },
  analysisDate: new Date().toISOString(),
  confidenceLevel: 78,
  dataQuality: {
    overallScore: 75,
    components: {
      comparablesQuality: 82,
      costEstimateAccuracy: 70,
      marketDataFreshness: 85,
      propertyDataCompleteness: 68,
    },
    missingData: ["Interior photos", "Detailed condition report"],
    assumptions: [
      "Property assumed to need moderate cosmetic rehab",
      "No major structural issues assumed",
      "Standard closing timeline assumed",
    ],
  },
};
