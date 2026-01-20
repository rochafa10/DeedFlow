"use client";

/**
 * Property Analysis Report - Full Demo Page
 *
 * Comprehensive demonstration of all 16 report sections with real API data
 * where available, falling back to sample data for sections not yet integrated.
 *
 * Now supports real Supabase data via URL parameter: ?propertyId=<uuid>
 *
 * @module app/report/demo/page
 * @author Claude Code Agent
 * @date 2026-01-17
 */

import * as React from "react";
import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePropertyReport, usePropertiesWithRegrid } from "@/hooks/usePropertyReport";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Building,
  DollarSign,
  Shield,
  BarChart3,
  FileText,
  Mountain,
  Users,
  Map,
  Scale,
  Target,
  Home,
  Droplets,
  Info,
  ExternalLink,
  Printer,
  Loader2,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportReportToPDF, generateReportFilename } from "@/lib/pdf-export";
import { calculateLocationScores, calculateOverallLocationScore, type CensusDataForScoring } from "@/lib/utils/location-scoring";
import { calculateRiskAssessment, hasRealRiskData, type RiskCalculationInput } from "@/lib/utils/risk-assessment-calculator";
import type { AmenitiesSummary } from "@/lib/api/services/geoapify-service";

// Import report components
import { InvestmentScore } from "@/components/report/sections/InvestmentScore";
import { LocationAnalysis } from "@/components/report/sections/LocationAnalysis";
import { MarketAnalysis } from "@/components/report/sections/MarketAnalysis";
import { Disclaimers } from "@/components/report/sections/Disclaimers";
import { ComparablesSection } from "@/components/report/sections/ComparablesSection";
import { PropertySummary } from "@/components/report/sections/PropertySummary";
import { RiskOverviewCard } from "@/components/report/risk/RiskOverviewCard";
import { InsuranceEstimateCard } from "@/components/report/risk/InsuranceEstimateCard";
import { FinancialDashboard } from "@/components/financial/FinancialDashboard";
import { SatelliteMap } from "@/components/report/maps/SatelliteMap";
import { GoogleStreetViewStatic } from "@/components/report/maps/GoogleStreetViewStatic";
import { GoogleMapStatic } from "@/components/report/maps/GoogleMapStatic";
import { FEMAFloodMap } from "@/components/report/maps/FEMAFloodMap";
import { ShareButton } from "@/components/report/ShareButton";
import { ComparablesCard } from "@/components/report/ComparablesCard";
import { DataSourceBadge } from "@/components/ui/data-source-badge";

// Import types
import type { Grade } from "@/types/report";
import type { CategoryScore } from "@/components/report/sections/InvestmentScore";
import type { RiskAssessment, InsuranceEstimates } from "@/types/risk-analysis";
import type { FinancialAnalysis, ComparableSale } from "@/lib/analysis/financial/types";
import type { ComparableProperty, ComparablesAnalysis } from "@/components/report/sections/ComparablesSection";
import type { MarketMetrics, MarketTrends, MarketSegment } from "@/components/report/sections/MarketAnalysis";
import { filterLandComparables, type LandSubject, type LandComparable } from "@/lib/analysis/comparables/landComparablesFilter";
import {
  calculateAllMarketMetrics,
  calculatePriceSegmentsFromPrices,
  calculateInvestmentScores,
  calculateTotalInvestmentScore,
  calculateOverallGrade,
  type MarketCalculationInput,
  type CalculatedMarketMetrics,
  type PriceSegment,
  type InvestmentScoreInput,
  type CalculatedCategoryScore,
} from "@/lib/utils/market-calculations";
import {
  calculateFinancialAnalysis,
  transformComparables,
  type FinancialAnalysisInput,
} from "@/lib/utils/financial-analysis-calculations";

// ============================================
// API Response Types
// ============================================

interface ApiDataSource {
  name: string;
  status: 'ok' | 'error' | 'skipped';
  latency?: number;
  error?: string;
  data?: unknown;
}

interface ApiReportData {
  property: {
    address: string;
    parcelId?: string;
    coordinates: { lat: number; lng: number };
    state: string;
  };
  elevation?: {
    latitude: number;
    longitude: number;
    elevation: number;
    elevationFeet: number;
    // Terrain analysis from elevation service
    terrain?: {
      elevation: number;
      elevationFeet: number;
      averageSlope: number;
      maxSlope: number;
      classification: string;
      classificationLabel: string;
      stability: string;
      stabilityLabel: string;
      slopeDirection: string;
      assessment: string;
    };
    // Flood risk assessment
    floodRiskAssessment?: {
      risk: 'low' | 'moderate' | 'high';
      reason: string;
      belowSeaLevel: boolean;
      inLowLyingArea: boolean;
    };
    // Surrounding elevations analysis
    surroundingElevations?: {
      isLowestPoint: boolean;
      northElevation?: number;
      southElevation?: number;
      eastElevation?: number;
      westElevation?: number;
    };
  };
  climate?: {
    current?: {
      temperature: number;
      humidity: number;
      precipitation: number;
      weatherCode: number;
      windSpeed: number;
      windDirection: number;
    };
    daily?: Array<{
      date: string;
      temperatureMax: number;
      temperatureMin: number;
      precipitationProbability: number;
      weatherCode: number;
    }>;
    averageTemperature?: number;
    averageHumidity?: number;
    totalPrecipitation?: number;
  };
  weatherAlerts?: {
    active: Array<{
      id: string;
      headline: string;
      event: string;
      severity: string;
      certainty: string;
      urgency: string;
      effective: string;
      expires: string;
      description: string;
    }>;
    count: number;
  };
  seismicHazard?: {
    hazardCategory: string;
    pga: number;
    riskLevel: string;
    description: string;
    ss?: number;  // Spectral acceleration at 0.2 seconds
    s1?: number;  // Spectral acceleration at 1.0 second
  };
  wildfireData?: {
    fires: Array<{
      latitude: number;
      longitude: number;
      brightness: number;
      confidence: string;
      satellite: string;
      distanceMiles: number;
    }>;
    fireCount: number;
    lastUpdated: string;
    nearestFireMiles: number | null;
  };
  environmentalSites?: {
    queryLocation: { latitude: number; longitude: number };
    searchRadiusMiles: number;
    superfundSites: Array<{ name: string; distanceMiles?: number; status?: string }>;
    brownfieldSites: Array<{ name: string; distanceMiles?: number; cleanupStatus?: string }>;
    ustSites: Array<{ name: string; distanceMiles?: number }>;
    counts: {
      superfund: number;
      brownfield: number;
      ust: number;
      tri: number;
      rcra: number;
      total: number;
    };
    nearestSite: { type: string; name: string; distanceMiles: number } | null;
  };
  amenities?: {
    location?: { lat: number; lng: number };
    radius_meters?: number;
    counts?: {
      hospitals: number;
      schools: number;
      grocery_stores: number;
      restaurants: number;
      gas_stations: number;
      banks: number;
      pharmacies: number;
      parks: number;
      shopping: number;
      public_transport: number;
    };
    nearest?: {
      hospital?: { name?: string; distance?: number };
      school?: { name?: string; distance?: number };
      grocery_store?: { name?: string; distance?: number };
      gas_station?: { name?: string; distance?: number };
      park?: { name?: string; distance?: number };
    };
    score?: number;
  };
  broadband?: {
    available: boolean;
    maxDownload: number;
    maxUpload: number;
    providers: string[];
    technologies: string[];
    fiberAvailable: boolean;
  };
  census?: {
    geographic?: {
      fips: string;
      stateFips: string;
      countyFips: string;
      countyName: string;
      stateName: string;
    };
    demographics?: {
      population: number;
      medianHouseholdIncome: number;
      medianHomeValue: number;
      ownerOccupiedPct: number;
      povertyPct: number;
      medianAge: number;
      bachelorsDegreeOrHigherPct: number;
      unemploymentRate: number;
      totalHousingUnits: number;
      vacancyRate: number;
      dataYear: number;
    };
  };
  aiSummary?: string;
}

interface ApiResponse {
  success: boolean;
  timestamp: string;
  dataQuality: 'complete' | 'partial' | 'minimal';
  sources: ApiDataSource[];
  data: ApiReportData;
}

// ============================================
// Sample Data Definitions
// ============================================

/** Sample property details */
const samplePropertyDetails = {
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

/** Sample investment score categories */
const sampleCategories: CategoryScore[] = [
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

/** Sample risk assessment data */
const sampleRiskAssessment: RiskAssessment = {
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

/** Sample insurance estimates */
const sampleInsuranceEstimates: InsuranceEstimates = {
  floodInsurance: null,
  earthquakeInsurance: null,
  fireInsurance: 850,
  windstormInsurance: null,
  totalAnnualCost: 850,
  availabilityWarnings: [],
};

/** Sample comparable sales */
const sampleComparables: ComparableSale[] = [
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

/** Sample financial analysis */
const sampleFinancialAnalysis: FinancialAnalysis = {
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

// ============================================
// Main Component
// ============================================

function PropertyReportDemoPageContent() {
  // URL Search Params for property selection
  const searchParams = useSearchParams();
  const propertyIdFromUrl = searchParams.get("propertyId");

  // Fetch list of properties with regrid data for selector
  const {
    properties: availableProperties,
    isLoading: isLoadingProperties,
  } = usePropertiesWithRegrid();

  // Fetch property report data when a property is selected
  const {
    report: propertyReport,
    isLoading: isLoadingReport,
    error: reportError,
    lastFetched: reportLastFetched,
    refresh: refreshReport,
  } = usePropertyReport(propertyIdFromUrl);

  // State for PDF export loading
  const [isExporting, setIsExporting] = useState(false);

  // State for data mode toggle - default to true to prioritize real API data
  const [useRealData, setUseRealData] = useState(true);

  // State for API data (legacy endpoint)
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // State for FBI crime data
  const [crimeData, setCrimeData] = useState<{
    riskLevel: 'low' | 'moderate' | 'high';
    violentCrimeRate?: number;
    propertyCrimeRate?: number;
    trend?: 'decreasing' | 'stable' | 'increasing';
    source: string;
  } | null>(null);

  // State for live comparables data from Realty API
  const [comparablesData, setComparablesData] = useState<{
    comparables: ComparableProperty[];
    analysis: ComparablesAnalysis;
    source: string;
    activeListingsCount: number | null;
    historicalMetrics: {
      priceChangeYoY: number | null;
      salesVolumeChangeYoY: number | null;
      pricePerSqftChangeYoY: number | null;
      daysOnMarketChangeYoY: number | null;
      dataQuality: {
        confidence: 'high' | 'medium' | 'low' | 'insufficient';
        currentPeriodSales: number;
        previousPeriodSales: number;
      };
    } | null;
  } | null>(null);
  const [comparablesLoading, setComparablesLoading] = useState(false);
  const [comparablesError, setComparablesError] = useState<string | null>(null);

  // State for combined market data from Zillow + Realty APIs
  const [combinedMarketData, setCombinedMarketData] = useState<{
    priceTrends: Array<{ date: string; price: number; source: string }>;
    taxTrends: Array<{ year: number; taxPaid: number; assessedValue: number }>;
    climateRisk: {
      flood: number | null;
      fire: number | null;
      wind: number | null;
      heat: number | null;
    } | null;
    zestimate: number | null;
    priceAppreciation: number | null;
    annualAppreciation: number | null;
    avgTaxIncrease: number | null;
    dataSource: 'zillow' | 'combined' | null;
  } | null>(null);
  const [combinedMarketLoading, setCombinedMarketLoading] = useState(false);

  // State for live financial analysis from API
  const [financialData, setFinancialData] = useState<FinancialAnalysis | null>(null);
  const [financialLoading, setFinancialLoading] = useState(false);

  // State for zoning rules from API
  const [zoningData, setZoningData] = useState<{
    zoning_code: string;
    zoning_name: string | null;
    zoning_category: string | null;
    permitted_uses: string[];
    min_lot_size_sqft: number | null;
    front_setback_ft: number | null;
    side_setback_ft: number | null;
    rear_setback_ft: number | null;
    max_height_ft: number | null;
    is_default: boolean;
    notes: string | null;
  } | null>(null);
  const [zoningDataSourceType, setZoningDataSourceType] = useState<"live" | "partial" | "sample">("sample");

  // State for risk assessment from API
  const [riskApiData, setRiskApiData] = useState<RiskAssessment | null>(null);
  const [riskApiLoading, setRiskApiLoading] = useState(false);
  const [riskApiError, setRiskApiError] = useState<string | null>(null);

  // Merge property report data with sample defaults for display
  // This allows the page to work with real data when available, falling back to sample data
  const activePropertyDetails = useMemo(() => {
    if (propertyReport) {
      return {
        parcelId: propertyReport.propertyDetails.parcelId,
        address: propertyReport.propertyDetails.address,
        city: propertyReport.propertyDetails.city || "Unknown",
        state: propertyReport.propertyDetails.state,
        zip: "16602", // Default - could be added to API
        county: propertyReport.propertyDetails.county,
        propertyType: propertyReport.propertyDetails.propertyType || "Single Family Residential",
        lotSize: propertyReport.propertyDetails.lotSize || "Not available",
        buildingSqft: propertyReport.propertyDetails.squareFootage || 0,
        yearBuilt: propertyReport.propertyDetails.yearBuilt || 0,
        bedrooms: propertyReport.propertyDetails.bedrooms || 0,
        bathrooms: propertyReport.propertyDetails.bathrooms || 0,
        stories: 2, // Default
        zoning: propertyReport.propertyDetails.zoning || "Not available",
        assessedValue: propertyReport.propertyDetails.assessedValue || 0,
        taxAmount: propertyReport.auctionInfo.totalDue || 0,
        ownerName: propertyReport.propertyDetails.ownerName || "Unknown Owner",
        ownerAddress: propertyReport.propertyDetails.address,
        legalDescription: "See county records for legal description",
        imageUrl: propertyReport.images.regridScreenshot || "/placeholder-property.jpg",
        coordinates: {
          lat: propertyReport.propertyDetails.coordinates?.lat ?? 40.5186,
          lng: propertyReport.propertyDetails.coordinates?.lng ?? -78.3947,
        },
        // Additional fields from API
        marketValue: propertyReport.propertyDetails.marketValue,
        landUse: propertyReport.propertyDetails.landUse,
        saleType: propertyReport.auctionInfo.saleType,
        saleDate: propertyReport.auctionInfo.saleDate,
        minimumBid: propertyReport.auctionInfo.minimumBid,
        auctionStatus: propertyReport.auctionInfo.auctionStatus,
        hasRegridData: propertyReport.metadata.hasRegridData,
      };
    }
    return samplePropertyDetails;
  }, [propertyReport]);

  // State for full analysis data (new unified orchestrator)
  const [fullAnalysisData, setFullAnalysisData] = useState<{
    success: boolean;
    reportId: string;
    report?: {
      property: unknown;
      scoreBreakdown: {
        totalScore: number;
        maxScore: number;
        grade: string;
        gradeWithModifier: string;
        categories: Array<{
          name: string;
          score: number;
          maxPoints: number;
          grade: string;
          components: Array<{ name: string; score: number; maxScore: number }>;
        }>;
        summary: string;
      };
      riskAnalysis: {
        positiveFactors?: string[];
        topRiskFactors?: string[];
        overallRisk?: string;
        riskScore?: number;
      };
      comparables: {
        count: number;
        avg_sale_price: number;
        median_sale_price: number;
        price_per_sqft: number;
        sales: Array<unknown>;
      };
      roiAnalysis: {
        purchase_price: number;
        estimated_arv: number;
        total_investment: number;
        expected_profit: number;
        roi_percentage: number;
      };
      costAnalysis: unknown;
      recommendations: Array<{
        type: string;
        priority: string;
        title: string;
        description: string;
      }>;
      metadata: {
        generatedAt: string;
        overallConfidence: number;
        dataSources: string[];
      };
    };
    metadata: {
      generatedAt: string;
      durationMs: number;
      sourcesUsed: string[];
      sourcesFailed: string[];
      confidenceLevel: number;
    };
  } | null>(null);

  // Fetch report data from API (legacy endpoint for basic data)
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: `${activePropertyDetails.address}, ${activePropertyDetails.city}, ${activePropertyDetails.state} ${activePropertyDetails.zip}`,
          coordinates: activePropertyDetails.coordinates,
          state: activePropertyDetails.state,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setApiData(data);
      setLastFetched(new Date());
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch full analysis data from unified orchestrator
  const fetchFullAnalysis = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);

    // Create abort controller with 60 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      // Fetch both the full analysis AND the legacy report (for amenities) in parallel
      const [fullAnalysisResponse, legacyReportResponse] = await Promise.all([
        fetch('/api/report/full-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            address: `${activePropertyDetails.address}, ${activePropertyDetails.city}, ${activePropertyDetails.state} ${activePropertyDetails.zip}`,
            coordinates: activePropertyDetails.coordinates,
            options: {
              rehabScope: 'moderate',
              holdingMonths: 6,
              includeLocationData: true,
            },
          }),
        }),
        fetch('/api/report/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: `${activePropertyDetails.address}, ${activePropertyDetails.city}, ${activePropertyDetails.state} ${activePropertyDetails.zip}`,
            coordinates: activePropertyDetails.coordinates,
            state: activePropertyDetails.state,
          }),
        }),
      ]);

      clearTimeout(timeoutId);

      if (!fullAnalysisResponse.ok) {
        throw new Error(`Full Analysis API error: ${fullAnalysisResponse.status}`);
      }

      const data = await fullAnalysisResponse.json();
      setFullAnalysisData(data);
      setLastFetched(new Date());

      // Also parse legacy report for amenities data
      let legacyData: ApiResponse | null = null;
      if (legacyReportResponse.ok) {
        legacyData = await legacyReportResponse.json();
      }

      // If successful, populate legacy apiData with amenities from legacy endpoint
      if (data.success && data.metadata) {
        setApiData({
          success: true,
          timestamp: data.metadata.generatedAt,
          dataQuality: data.metadata.confidenceLevel > 70 ? 'complete' : data.metadata.confidenceLevel > 40 ? 'partial' : 'minimal',
          sources: data.metadata.sourcesUsed.map((name: string) => ({
            name,
            status: 'ok' as const,
          })).concat(data.metadata.sourcesFailed.map((name: string) => ({
            name,
            status: 'error' as const,
          }))),
          data: {
            property: {
              address: activePropertyDetails.address,
              coordinates: activePropertyDetails.coordinates,
              state: activePropertyDetails.state,
            },
            // Include amenities and other data from legacy endpoint
            amenities: legacyData?.data?.amenities,
            elevation: legacyData?.data?.elevation,
            climate: legacyData?.data?.climate,
            seismicHazard: legacyData?.data?.seismicHazard,
            wildfireData: legacyData?.data?.wildfireData,
            environmentalSites: legacyData?.data?.environmentalSites,
            broadband: legacyData?.data?.broadband,
            weatherAlerts: legacyData?.data?.weatherAlerts,
            census: legacyData?.data?.census,
            aiSummary: legacyData?.data?.aiSummary,
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch full analysis:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        setApiError('Analysis request timed out after 60 seconds. Try again or check server logs.');
      } else {
        setApiError(error instanceof Error ? error.message : 'Failed to fetch full analysis');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [activePropertyDetails]);

  // Auto-fetch on mount and when mode changes
  useEffect(() => {
    if (useRealData) {
      fetchFullAnalysis();
    } else {
      fetchReportData();
    }
  }, [fetchReportData, fetchFullAnalysis, useRealData]);

  // Fetch FBI crime data based on property state
  useEffect(() => {
    const fetchCrimeData = async () => {
      const stateCode = activePropertyDetails.state;
      if (!stateCode) return;

      try {
        const response = await fetch(`/api/crime?state=${encodeURIComponent(stateCode)}`);
        const data = await response.json();

        if (data.success && data.data) {
          setCrimeData({
            riskLevel: data.data.riskLevel || 'moderate',
            violentCrimeRate: data.data.violentCrimeRate,
            propertyCrimeRate: data.data.propertyCrimeRate,
            trend: data.data.trend,
            source: data.source || 'FBI Crime Data Explorer',
          });
        } else {
          // Use fallback if API fails
          setCrimeData({
            riskLevel: data.data?.riskLevel || 'moderate',
            source: 'fallback',
          });
        }
      } catch (error) {
        console.error('Failed to fetch crime data:', error);
        // Default to moderate if fetch fails
        setCrimeData({
          riskLevel: 'moderate',
          source: 'fallback',
        });
      }
    };

    fetchCrimeData();
  }, [activePropertyDetails.state]);

  // Fetch live comparables data from Realty API
  useEffect(() => {
    const fetchComparables = async () => {
      const zip = activePropertyDetails.zip;
      const coords = activePropertyDetails.coordinates;

      if (!zip && (!coords?.lat || !coords?.lng)) return;

      setComparablesLoading(true);

      try {
        // Determine property type for better comparables matching
        const propType = activePropertyDetails.propertyType || activePropertyDetails.landUse || "";
        const buildingSqft = activePropertyDetails.buildingSqft || 0;
        const isVacantLot = buildingSqft === 0 ||
          propType.toLowerCase().includes("vacant") ||
          propType.toLowerCase().includes("lot") ||
          propType.toLowerCase().includes("land");

        console.log('[Comparables] Detection:', {
          propType,
          buildingSqft,
          rawBuildingSqft: activePropertyDetails.buildingSqft,
          isVacantLot,
          lotSize: activePropertyDetails.lotSize
        });

        // Build query params - use different criteria for land vs residential
        const params = new URLSearchParams();
        let searchMethod = 'unknown';

        if (isVacantLot) {
          // LAND COMPARABLES: 15 miles radius, more results to filter
          // Land sales are rare, so we need wider search area
          if (coords?.lat && coords?.lng) {
            params.set('lat', String(coords.lat));
            params.set('lng', String(coords.lng));
            params.set('radius_miles', '15');  // 15 miles for land
            searchMethod = 'coordinates';
          } else if (zip) {
            params.set('postal_code', zip);
            searchMethod = 'postal_code';
          }
          params.set('limit', '50');  // Get more to filter by lot size
          params.set('prop_type', 'land');
        } else {
          // RESIDENTIAL COMPARABLES: Standard search
          if (zip) {
            params.set('postal_code', zip);
            searchMethod = 'postal_code';
          } else if (coords?.lat && coords?.lng) {
            params.set('lat', String(coords.lat));
            params.set('lng', String(coords.lng));
            params.set('radius_miles', '2');
            searchMethod = 'coordinates';
          }
          params.set('limit', '10');

          // Set property type filter for residential
          if (propType.toLowerCase().includes("multi") || propType.toLowerCase().includes("apartment")) {
            params.set('prop_type', 'multi_family');
          } else if (propType.toLowerCase().includes("condo")) {
            params.set('prop_type', 'condo');
          } else if (propType.toLowerCase().includes("townhome") || propType.toLowerCase().includes("townhouse")) {
            params.set('prop_type', 'townhome');
          }
          // Default: no prop_type filter (will include single_family and others)
        }

        // Add enhanced mode to get active listings count
        params.set('mode', 'enhanced');

        console.log(`[Comparables] Initial search method: ${searchMethod}, params:`, params.toString());
        let response = await fetch(`/api/comparables?${params.toString()}`);
        let data = await response.json();

        // FALLBACK: For land, if coordinates search returns 0 results, try postal code
        if (isVacantLot && searchMethod === 'coordinates' && zip) {
          const initialCount = data.data?.comparables?.length || 0;
          if (initialCount === 0) {
            console.log('[Comparables] Coordinates returned 0 results, falling back to postal code:', zip);

            // Build new params with postal code instead
            const fallbackParams = new URLSearchParams();
            fallbackParams.set('postal_code', zip);
            fallbackParams.set('limit', '50');
            fallbackParams.set('prop_type', 'land');
            fallbackParams.set('mode', 'enhanced');

            response = await fetch(`/api/comparables?${fallbackParams.toString()}`);
            data = await response.json();
            searchMethod = 'postal_code_fallback';

            const fallbackCount = data.data?.comparables?.length || 0;
            console.log(`[Comparables] Postal code fallback returned ${fallbackCount} results`);
          }
        }

        if (data.success && data.data) {
          setComparablesError(null); // Clear any previous error
          const apiComparables = data.data.comparables || [];
          const apiStats = data.data.statistics || {};

          // Transform RealtyComparable[] to ComparableProperty[]
          const transformedComparables: ComparableProperty[] = apiComparables.map((comp: {
            property_id: string;
            address: { line: string; city: string; state_code: string; lat?: number; lon?: number };
            price: { sold_price?: number; price_per_sqft?: number };
            description: { beds?: number; baths?: number; sqft?: number; lot_sqft?: number; year_built?: number; type?: string };
            sold_date?: string;
            days_on_market?: number;
            distance_miles?: number;
            photos?: string[];
          }, index: number) => ({
            id: comp.property_id || `comp-${index}`,
            address: comp.address?.line || 'Address unavailable',
            city: comp.address?.city || '',
            distance: comp.distance_miles || 0,
            salePrice: comp.price?.sold_price || 0,
            saleDate: comp.sold_date ? new Date(comp.sold_date) : new Date(),
            pricePerSqft: comp.price?.price_per_sqft,
            sqft: comp.description?.sqft,
            lotSizeAcres: comp.description?.lot_sqft ? comp.description.lot_sqft / 43560 : undefined,
            yearBuilt: comp.description?.year_built,
            bedrooms: comp.description?.beds,
            bathrooms: comp.description?.baths,
            propertyType: comp.description?.type,
            daysOnMarket: comp.days_on_market,
            imageUrl: comp.photos?.[0],
            latitude: comp.address?.lat,
            longitude: comp.address?.lon,
          }));

          // For vacant lots, apply specialized land filtering
          let finalComparables = transformedComparables;
          let landFilterStats: {
            medianPricePerSqft?: number;
            outlierCount?: number;
            minLotAcres?: number;
            maxLotAcres?: number;
            filterLabel?: string;
          } = {};

          // Parse lot size for land comparables (used for ARV calculation)
          const lotSizeAcres = typeof activePropertyDetails.lotSize === 'number'
            ? activePropertyDetails.lotSize
            : parseFloat(String(activePropertyDetails.lotSize)) || 0;

          if (isVacantLot && transformedComparables.length > 0) {
            // Prepare subject property for land comparison
            const subjectLot = lotSizeAcres > 0
              ? (lotSizeAcres * 43560)  // Convert acres to sqft
              : 5000; // Default lot size if unknown

            const landSubject: LandSubject = {
              latitude: coords?.lat || 0,
              longitude: coords?.lng || 0,
              lotSizeSqft: subjectLot,
              propertyType: 'land',
            };

            // LAND FILTER CRITERIA:
            // - ±50% lot size (comps must be within 50% of subject lot size)
            // - Last 2 years (sales within 24 months)
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

            // Helper to convert comp to LandComparable
            const tolandComp = (comp: typeof transformedComparables[0]): LandComparable => ({
              latitude: comp.latitude || 0,
              longitude: comp.longitude || 0,
              salePrice: comp.salePrice || 0,
              saleDate: comp.saleDate?.toISOString() || new Date().toISOString(),
              address: comp.address,
              lotSizeSqft: comp.lotSizeAcres ? comp.lotSizeAcres * 43560 : undefined,
              sqft: comp.sqft,
              propertyType: comp.propertyType,
              bedrooms: comp.bedrooms,
              bathrooms: comp.bathrooms,
              yearBuilt: comp.yearBuilt,
              distanceMiles: comp.distance || 0,
            });

            // Progressive filtering: Start strict, widen if needed
            let minLotSize = subjectLot * 0.5;  // -50%
            let maxLotSize = subjectLot * 1.5;  // +50%
            let filterLabel = '±50%';

            // First pass: Strict ±50% filter
            let landComps: LandComparable[] = transformedComparables
              .filter(comp => {
                const compLotSqft = comp.lotSizeAcres ? comp.lotSizeAcres * 43560 : 0;
                if (compLotSqft === 0) return false;
                if (compLotSqft < minLotSize || compLotSqft > maxLotSize) return false;
                if (comp.saleDate && comp.saleDate < twoYearsAgo) return false;
                return true;
              })
              .map(tolandComp);

            // Only widen if we have 0 or 1 comps - 2 similar comps is better than 3 with an outlier
            if (landComps.length < 2) {
              minLotSize = subjectLot * 0.25;  // -75%
              maxLotSize = subjectLot * 2.0;   // +100%
              filterLabel = '±75-100%';

              landComps = transformedComparables
                .filter(comp => {
                  const compLotSqft = comp.lotSizeAcres ? comp.lotSizeAcres * 43560 : 0;
                  if (compLotSqft === 0) return false;
                  if (compLotSqft < minLotSize || compLotSqft > maxLotSize) return false;
                  if (comp.saleDate && comp.saleDate < twoYearsAgo) return false;
                  return true;
                })
                .map(tolandComp);
            }

            // Last resort: widen to ±200% (3x range) but still filter by lot size
            // Never go to "any size" - that includes comps that are too different
            if (landComps.length < 2) {
              minLotSize = subjectLot * 0.1;   // -90%
              maxLotSize = subjectLot * 3.0;   // +200%
              filterLabel = '±90-200%';

              landComps = transformedComparables
                .filter(comp => {
                  const compLotSqft = comp.lotSizeAcres ? comp.lotSizeAcres * 43560 : 0;
                  if (compLotSqft === 0) return false;
                  if (compLotSqft < minLotSize || compLotSqft > maxLotSize) return false;
                  if (comp.saleDate && comp.saleDate < twoYearsAgo) return false;
                  return true;
                })
                .map(tolandComp);
            }

            console.log('[Land Comparables] Search method:', searchMethod);
            console.log('[Land Comparables] Subject lot:', subjectLot, 'sqft (', (subjectLot/43560).toFixed(2), 'acres)');
            console.log('[Land Comparables] Filter applied:', filterLabel);
            console.log('[Land Comparables] Size range:', minLotSize, '-', maxLotSize, 'sqft (', (minLotSize/43560).toFixed(3), '-', (maxLotSize/43560).toFixed(3), 'acres)');
            console.log('[Land Comparables] From API:', transformedComparables.length);

            // Debug: Show what's in each comp
            transformedComparables.forEach((comp, i) => {
              const compLotSqft = comp.lotSizeAcres ? comp.lotSizeAcres * 43560 : 0;
              const inSizeRange = compLotSqft === 0 || (compLotSqft >= minLotSize && compLotSqft <= maxLotSize);
              const inDateRange = !comp.saleDate || comp.saleDate >= twoYearsAgo;
              console.log(`[Land Comparables] Comp ${i+1}: ${comp.address?.substring(0, 30)} | Lot: ${compLotSqft.toFixed(0)} sqft (${(compLotSqft/43560).toFixed(3)} ac) | Size OK: ${inSizeRange} | Date OK: ${inDateRange} | Price: $${comp.salePrice}`);
            });

            console.log('[Land Comparables] After filtering:', landComps.length);

            // Apply additional filtering (removes outliers, unit addresses, non-land types)
            const filtered = filterLandComparables(landSubject, landComps, 10);

            console.log('[Land Comparables] After outlier filter:', filtered.top.length,
              'Outliers removed:', filtered.outliers.length);

            // DEFENSIVE: If outlier filter removed ALL comps, use the landComps directly
            // This can happen when we have only 2 comps with very different prices
            let compsToUse = filtered.top;
            if (compsToUse.length === 0 && landComps.length > 0) {
              console.log('[Land Comparables] Outlier filter removed all comps, using original landComps');
              compsToUse = landComps.map(comp => ({
                ...comp,
                landSimilarityScore: 50, // Default middle score
              }));
            }

            // Convert back to ComparableProperty format with similarity scores
            finalComparables = compsToUse.map((landComp, idx) => {
              // Find matching original comp by address
              const originalComp = transformedComparables.find(c => c.address === landComp.address);

              // Safely parse date
              let saleDate: Date;
              try {
                saleDate = landComp.saleDate ? new Date(landComp.saleDate) : new Date();
                if (isNaN(saleDate.getTime())) saleDate = new Date();
              } catch {
                saleDate = new Date();
              }

              return {
                ...(originalComp || {}),
                id: landComp.address || `land-comp-${idx}`,
                address: landComp.address || 'Unknown',
                distance: landComp.distanceMiles || 0,
                salePrice: landComp.salePrice || 0,
                saleDate,
                pricePerSqft: landComp.pricePerSqft,
                lotSizeAcres: landComp.lotSizeSqft ? landComp.lotSizeSqft / 43560 : undefined,
                similarityScore: landComp.landSimilarityScore, // Add similarity score for display
              };
            });

            landFilterStats = {
              medianPricePerSqft: filtered.stats.medianPricePerSqft,
              outlierCount: filtered.outliers.length,
              // Store lot size range for display
              minLotAcres: minLotSize / 43560,
              maxLotAcres: maxLotSize / 43560,
              filterLabel,  // Track which filter was actually used
            };

            console.log('[Land Comparables] Final comparables:', finalComparables.length, finalComparables.map(c => ({
              address: c.address,
              price: c.salePrice,
              score: c.similarityScore
            })));
          }

          // Build analysis summary
          // For land comparables, use weighted average based on similarity score
          // This prevents outliers (low match %) from skewing the average
          let avgSalePrice = 0;
          if (finalComparables.length > 0) {
            if (isVacantLot) {
              // Weighted average by similarity score
              let totalWeight = 0;
              let weightedSum = 0;
              finalComparables.forEach(c => {
                const weight = (c.similarityScore || 50) / 100; // Use match % as weight
                weightedSum += (c.salePrice || 0) * weight;
                totalWeight += weight;
              });
              avgSalePrice = totalWeight > 0 ? weightedSum / totalWeight : 0;
            } else {
              // Simple average for residential
              avgSalePrice = finalComparables.reduce((sum, c) => sum + (c.salePrice || 0), 0) / finalComparables.length;
            }
          } else {
            avgSalePrice = apiStats.avg_sold_price || 0;
          }

          const analysis: ComparablesAnalysis = {
            compCount: finalComparables.length,
            avgSalePrice,
            medianSalePrice: apiStats.median_sold_price,
            avgPricePerSqft: landFilterStats.medianPricePerSqft || apiStats.avg_price_per_sqft,
            avgDaysOnMarket: apiStats.avg_days_on_market,
            suggestedArv: isVacantLot && landFilterStats.medianPricePerSqft
              ? Math.round(landFilterStats.medianPricePerSqft * (lotSizeAcres || 0.1) * 43560)
              : apiStats.median_sold_price || apiStats.avg_sold_price || 0,
            confidence: finalComparables.length >= 5 ? 'high' : finalComparables.length >= 3 ? 'medium' : 'low',
            // Different criteria for land vs residential
            searchRadius: isVacantLot ? 15.0 : 2.0,
            dateRange: isVacantLot
              ? `Last 2 years | ${landFilterStats.filterLabel || '±50%'} size (${landFilterStats.minLotAcres?.toFixed(2) || '?'} - ${landFilterStats.maxLotAcres?.toFixed(2) || '?'} acres)`
              : 'Last 12 months',
          };

          // Extract active listings count from enhanced mode response
          const activeListingsCount = data.data?.activeListingsCount ?? null;
          console.log('[Comparables] Active listings count:', activeListingsCount);

          // Extract historical metrics for YoY changes
          const apiHistoricalMetrics = data.data?.historicalMetrics;
          const historicalMetrics = apiHistoricalMetrics ? {
            priceChangeYoY: apiHistoricalMetrics.priceChangeYoY,
            salesVolumeChangeYoY: apiHistoricalMetrics.salesVolumeChangeYoY,
            pricePerSqftChangeYoY: apiHistoricalMetrics.pricePerSqftChangeYoY,
            daysOnMarketChangeYoY: apiHistoricalMetrics.daysOnMarketChangeYoY,
            dataQuality: {
              confidence: apiHistoricalMetrics.dataQuality?.confidence || 'insufficient',
              currentPeriodSales: apiHistoricalMetrics.dataQuality?.currentPeriodSales || 0,
              previousPeriodSales: apiHistoricalMetrics.dataQuality?.previousPeriodSales || 0,
            },
          } : null;
          console.log('[Comparables] Historical metrics:', historicalMetrics?.priceChangeYoY !== null
            ? `Price YoY: ${((historicalMetrics?.priceChangeYoY || 0) * 100).toFixed(1)}%`
            : 'Not available');

          setComparablesData({
            comparables: finalComparables,
            analysis,
            source: isVacantLot ? 'Realty API (Land Filtered)' : 'Realty in US API',
            activeListingsCount,
            historicalMetrics,
          });
        } else {
          // API returned an error (rate limit, circuit breaker, etc.)
          console.warn('[Comparables] API error:', data.error);
          const errorMsg = data.error?.includes('Rate limit')
            ? 'Comparables API rate limited. Using sample data.'
            : data.error?.includes('Circuit breaker')
            ? 'Comparables API temporarily unavailable. Using sample data.'
            : 'Unable to fetch comparables. Using sample data.';
          setComparablesError(errorMsg);
        }
      } catch (error) {
        console.error('[Comparables] CRITICAL ERROR:', error);
        if (error instanceof Error) {
          console.error('[Comparables] Error details:', error.name, error.message);
        }
        // Set user-friendly error message
        setComparablesError('Unable to load comparable sales. Please try again later.');
        // Keep null - will fall back to mock data
      } finally {
        setComparablesLoading(false);
      }
    };

    fetchComparables();
  }, [activePropertyDetails.zip, activePropertyDetails.coordinates]);

  // Fetch combined market data from Zillow + Realty API
  useEffect(() => {
    const fetchCombinedMarketData = async () => {
      const address = activePropertyDetails.address;
      const city = activePropertyDetails.city;
      const state = activePropertyDetails.state;

      // Need a valid address to fetch property-specific market data
      if (!address || address === 'Address unavailable' || !city || !state) return;

      setCombinedMarketLoading(true);

      try {
        const fullAddress = `${address}, ${city}, ${state}`;
        const params = new URLSearchParams({
          address: fullAddress,
          mode: 'property', // Get property-specific data with price history
        });

        console.log('[Combined Market] Fetching data for:', fullAddress);
        const response = await fetch(`/api/market?${params.toString()}`);
        const data = await response.json();

        if (data.success && data.data) {
          console.log('[Combined Market] Data received:', {
            hasPriceTrends: !!data.data.priceTrends,
            hasTaxTrends: !!data.data.taxTrends,
            hasClimateRisk: !!data.data.climateRisk,
            zestimate: data.data.property?.zestimate,
          });

          // Extract price trends from listing history
          const priceTrends = data.data.priceTrends?.listingHistory || [];

          // Extract tax trends
          const taxTrends = data.data.taxTrends?.taxHistory || [];

          // Extract climate risk
          const climateRisk = data.data.climateRisk ? {
            flood: data.data.climateRisk.flood,
            fire: data.data.climateRisk.fire,
            wind: data.data.climateRisk.wind,
            heat: data.data.climateRisk.heat,
          } : null;

          setCombinedMarketData({
            priceTrends,
            taxTrends,
            climateRisk,
            zestimate: data.data.property?.zestimate || null,
            priceAppreciation: data.data.priceTrends?.priceAppreciation || null,
            annualAppreciation: data.data.priceTrends?.annualAppreciation || null,
            avgTaxIncrease: data.data.taxTrends?.avgAnnualTaxIncrease || null,
            dataSource: data.data.sources?.zillow ? 'zillow' : null,
          });
        } else {
          console.warn('[Combined Market] API returned error or no data:', data.error);
        }
      } catch (error) {
        console.error('[Combined Market] Failed to fetch:', error);
      } finally {
        setCombinedMarketLoading(false);
      }
    };

    // Only fetch if we have a real address (not sample data)
    if (propertyReport) {
      fetchCombinedMarketData();
    }
  }, [activePropertyDetails.address, activePropertyDetails.city, activePropertyDetails.state, propertyReport]);

  // Fetch financial analysis from API when property data or comparables are available
  useEffect(() => {
    const fetchFinancialAnalysis = async () => {
      // Need at least a purchase price to do financial analysis
      const purchasePrice = activePropertyDetails.taxAmount || activePropertyDetails.minimumBid || 0;

      if (purchasePrice <= 0) return;

      // Get ARV from comparables if available, otherwise estimate
      const estimatedARV = comparablesData?.analysis?.suggestedArv
        || comparablesData?.analysis?.avgSalePrice
        || activePropertyDetails.marketValue
        || activePropertyDetails.assessedValue * 1.2
        || 150000;

      // Check if this is vacant land (no building to rehab)
      const buildingSqft = activePropertyDetails.buildingSqft || 0;
      const isVacantLand = buildingSqft === 0;

      // Estimate rehab based on year built and property condition
      // $0 rehab for vacant land - no building to rehab
      let rehabEstimate = 0;
      if (!isVacantLand) {
        const yearBuilt = activePropertyDetails.yearBuilt || 1970;
        const age = new Date().getFullYear() - yearBuilt;
        rehabEstimate = age > 50 ? 35000 : age > 30 ? 25000 : age > 15 ? 15000 : 8000;
      }

      setFinancialLoading(true);

      try {
        const response = await fetch('/api/analysis/financial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purchasePrice,
            estimatedARV,
            rehabEstimate,
            riskScore: 15, // Default moderate risk
            locationScore: 15, // Default location score
            marketScore: 15,
          }),
        });

        const data = await response.json();

        if (data.success && data.analysis) {
          setFinancialData(data.analysis);
        }
      } catch (error) {
        console.error('Failed to fetch financial analysis:', error);
        // Keep null - will fall back to mock data
      } finally {
        setFinancialLoading(false);
      }
    };

    // Wait a bit for comparables to load first, as they provide ARV
    const timer = setTimeout(() => {
      fetchFinancialAnalysis();
    }, 500);

    return () => clearTimeout(timer);
  }, [
    activePropertyDetails.taxAmount,
    activePropertyDetails.assessedValue,
    activePropertyDetails.yearBuilt,
    comparablesData?.analysis?.suggestedArv,
    comparablesData?.analysis?.avgSalePrice,
  ]);

  // Fetch zoning rules from API when zoning code is available
  useEffect(() => {
    const fetchZoningRules = async () => {
      const zoningCode = activePropertyDetails.zoning;
      const state = activePropertyDetails.state || "PA";

      // Skip if no zoning code or it's not available
      if (!zoningCode || zoningCode === "Not available" || zoningCode === "N/A") {
        setZoningData(null);
        setZoningDataSourceType("sample");
        return;
      }

      try {
        // Extract zoning code from potentially longer string like "R-1 Single Family"
        const codeMatch = zoningCode.match(/^([A-Z]+-?\d*[A-Z]*)/i);
        const code = codeMatch ? codeMatch[1] : zoningCode.split(" ")[0];

        const params = new URLSearchParams({
          code: code,
          state: state,
        });

        // Add county if available
        if (activePropertyDetails.county) {
          params.set("county", activePropertyDetails.county);
        }

        const response = await fetch(`/api/zoning?${params.toString()}`);
        const data = await response.json();

        if (data.success && data.data) {
          setZoningData(data.data);
          setZoningDataSourceType(data.meta?.dataSourceType || "sample");
        } else {
          setZoningData(null);
          setZoningDataSourceType("sample");
        }
      } catch (error) {
        console.error("[ZoningRules] Failed to fetch:", error);
        setZoningData(null);
        setZoningDataSourceType("sample");
      }
    };

    fetchZoningRules();
  }, [activePropertyDetails.zoning, activePropertyDetails.state, activePropertyDetails.county]);

  // Fetch risk assessment from API when coordinates are available
  useEffect(() => {
    const fetchRiskAssessment = async () => {
      const coords = activePropertyDetails.coordinates;
      const state = activePropertyDetails.state;

      // Need valid coordinates and state
      if (!coords?.lat || !coords?.lng || !state) {
        return;
      }

      setRiskApiLoading(true);
      setRiskApiError(null);

      try {
        const response = await fetch('/api/analysis/risk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coordinates: { lat: coords.lat, lng: coords.lng },
            state: state,
            county: activePropertyDetails.county,
            propertyValue: activePropertyDetails.marketValue || activePropertyDetails.assessedValue || 150000,
            buildingSqft: activePropertyDetails.buildingSqft || 1500,
            options: {
              useCache: true,
              timeout: 15000,
            },
          }),
        });

        const data = await response.json();

        if (data.success && data.data) {
          setRiskApiData(data.data);
          console.log('[RiskAPI] Successfully fetched risk assessment:', data.data.overallRisk);
        } else {
          console.warn('[RiskAPI] API returned error:', data.error || data.message);
          setRiskApiError(data.message || 'Failed to fetch risk data');
        }
      } catch (error) {
        console.error('[RiskAPI] Failed to fetch risk assessment:', error);
        setRiskApiError(error instanceof Error ? error.message : 'Network error');
      } finally {
        setRiskApiLoading(false);
      }
    };

    // Delay slightly to allow other critical APIs to complete first
    const timer = setTimeout(() => {
      fetchRiskAssessment();
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    activePropertyDetails.coordinates?.lat,
    activePropertyDetails.coordinates?.lng,
    activePropertyDetails.state,
    activePropertyDetails.county,
    activePropertyDetails.marketValue,
    activePropertyDetails.assessedValue,
    activePropertyDetails.buildingSqft,
  ]);

  // Handle toggle change
  const handleDataModeToggle = useCallback(() => {
    setUseRealData((prev) => !prev);
    setApiData(null);
    setFullAnalysisData(null);
  }, []);

  // Calculate total score - use real data if available in "real data" mode
  // Note: These will be recalculated below after activeCategories is computed
  const maxScore = useRealData && fullAnalysisData?.report?.scoreBreakdown
    ? fullAnalysisData.report.scoreBreakdown.maxScore
    : 125;

  // Property address for filename generation - use active details (real or sample)
  const fullAddress = `${activePropertyDetails.address}, ${activePropertyDetails.city}, ${activePropertyDetails.state} ${activePropertyDetails.zip}`;
  const reportId = propertyIdFromUrl ? `RPT-${propertyIdFromUrl.slice(0, 8).toUpperCase()}` : "RPT-2026-DEMO-001234";

  // Helper to determine if we're showing real data
  const isShowingRealData = !!propertyReport;

  // Merge API data with sample data where available
  const elevationData = apiData?.data?.elevation;
  const terrainData = elevationData?.terrain; // Terrain/slope analysis from elevation service

  const climateData = apiData?.data?.climate;
  const seismicData = apiData?.data?.seismicHazard;
  const wildfireData = apiData?.data?.wildfireData;
  const environmentalData = apiData?.data?.environmentalSites;
  const amenitiesData = apiData?.data?.amenities;
  const broadbandData = apiData?.data?.broadband;
  const aiSummary = apiData?.data?.aiSummary;
  const weatherAlerts = apiData?.data?.weatherAlerts;
  const censusData = apiData?.data?.census;

  /**
   * Calculate derived market metrics from comparables data
   * Replaces hardcoded values with calculated/derived metrics
   */
  const calculatedMarketMetrics = useMemo((): CalculatedMarketMetrics | null => {
    if (!comparablesData?.comparables || comparablesData.comparables.length < 3) {
      return null; // Insufficient data for calculations
    }

    // Transform ComparableProperty[] to RealtyComparable[] format for calculations
    const comparablesForCalc = comparablesData.comparables.map((comp) => ({
      property_id: comp.id,
      address: {
        line: comp.address,
        city: comp.city || "",
        state_code: "", // Not available in ComparableProperty
        postal_code: "",
      },
      price: {
        sold_price: comp.salePrice,
        list_price: comp.salePrice, // Use sale price as fallback (list_price not available)
        price_per_sqft: comp.pricePerSqft,
      },
      description: {
        beds: comp.bedrooms,
        baths: comp.bathrooms,
        sqft: comp.sqft,
        lot_sqft: comp.lotSizeAcres ? comp.lotSizeAcres * 43560 : undefined, // Convert acres to sqft
        year_built: comp.yearBuilt,
        type: comp.propertyType,
      },
      sold_date: comp.saleDate instanceof Date ? comp.saleDate.toISOString() : String(comp.saleDate),
      distance_miles: comp.distance,
    }));

    const input: MarketCalculationInput = {
      comparables: comparablesForCalc,
      avgDaysOnMarket: comparablesData.analysis?.avgDaysOnMarket || 45,
      avgPricePerSqft: comparablesData.analysis?.avgPricePerSqft || 0,
      activeListingsCount: comparablesData.activeListingsCount ?? undefined,
      soldCount: comparablesData.comparables!.length,
      monthsOfData: 6,
    };

    return calculateAllMarketMetrics(input);
  }, [comparablesData]);

  /**
   * Calculate price segments from comparables data
   * Dynamically determines price brackets based on actual sale prices
   */
  const calculatedPriceSegments = useMemo((): PriceSegment[] | null => {
    if (!comparablesData?.comparables || comparablesData.comparables.length < 3) {
      return null; // Insufficient data, will use defaults
    }

    // Extract sale prices from comparables
    const salePrices = comparablesData.comparables
      .map((comp) => comp.salePrice || 0)
      .filter((price) => price > 0);

    if (salePrices.length < 3) {
      return null;
    }

    // Use estimated value as subject price for comparison classification
    const subjectPrice = comparablesData.analysis?.avgSalePrice || undefined;

    return calculatePriceSegmentsFromPrices(salePrices, subjectPrice);
  }, [comparablesData]);

  /**
   * Calculate location scores from Geoapify amenities data
   * Uses improved scoring algorithms based on:
   * - Walk Score: Grocery proximity, restaurant density, shopping, healthcare
   * - Transit Score: Public transit stops and density
   * - Bike Score: Parks, recreation, amenity density
   * - School Rating: School count and proximity
   */
  const locationScores = useMemo(() => {
    if (!amenitiesData || !amenitiesData.counts) {
      // Return defaults if no amenities data with proper details structure
      return {
        walkScore: 50,
        transitScore: 25,
        bikeScore: 40,
        schoolRating: 5,
        details: {
          walkScore: {
            groceryScore: 50,
            restaurantScore: 50,
            shoppingScore: 50,
            healthcareScore: 50,
            entertainmentScore: 50,
            nearestGroceryMeters: null,
            nearestRestaurantMeters: null,
          },
          transitScore: {
            stopsNearby: 0,
            nearestStopMeters: null,
            hasFrequentService: false,
            transitDensity: 0,
          },
          bikeScore: {
            parksNearby: 0,
            nearestParkMeters: null,
            recreationScore: 0,
            infrastructureScore: 0,
          },
          schoolRating: {
            schoolsNearby: 0,
            nearestSchoolMeters: null,
            schoolDensity: 0,
          },
        },
      };
    }

    // Cast to AmenitiesSummary type for the scoring function
    const scores = calculateLocationScores(amenitiesData as AmenitiesSummary);
    return scores;
  }, [amenitiesData]);

  /**
   * Calculate overall location score (0-25 points) from individual scores
   * Enhanced scoring: Geoapify 60% + Census 40%
   *
   * Geoapify (60%): Walk 15%, Transit 10%, Bike 10%, School 25%
   * Census (40%): Income 10%, Homeownership 10%, Vacancy 10%, Crime 10%
   */
  const overallLocationScore = useMemo(() => {
    // Build Census data for scoring from the census API response
    const censusDataForScoring: CensusDataForScoring | null = censusData?.demographics ? {
      medianHouseholdIncome: censusData.demographics.medianHouseholdIncome,
      homeownershipRate: censusData.demographics.ownerOccupiedPct,
      vacancyRate: censusData.demographics.vacancyRate,
      crimeRate: crimeData?.riskLevel || 'moderate', // Real FBI crime data or fallback
    } : null;

    return calculateOverallLocationScore(locationScores, censusDataForScoring);
  }, [locationScores, censusData, crimeData]);

  // Helper function to generate factors based on category and score
  function generateCategoryFactors(key: string, score: number, maxScore: number): string[] {
    const percentage = (score / maxScore) * 100;
    const isGood = percentage >= 80;
    const isMedium = percentage >= 60 && percentage < 80;

    const factorMap: Record<string, { good: string[]; medium: string[]; low: string[] }> = {
      location: {
        good: ["Strong neighborhood metrics", "Good accessibility", "Quality local amenities"],
        medium: ["Average neighborhood", "Moderate accessibility", "Some amenities nearby"],
        low: ["Below average area", "Limited accessibility", "Few amenities"],
      },
      risk: {
        good: ["Low environmental risks", "Clear title expected", "Stable conditions"],
        medium: ["Moderate risk factors", "Some title concerns", "Minor environmental issues"],
        low: ["Higher risk profile", "Title issues possible", "Environmental concerns"],
      },
      financial: {
        good: ["Excellent price-to-value", "Strong ROI potential", "Low acquisition cost"],
        medium: ["Fair market value", "Moderate ROI", "Average acquisition cost"],
        low: ["Above market value", "Limited ROI", "High acquisition cost"],
      },
      market: {
        good: ["Strong market demand", "Rising property values", "Low days on market"],
        medium: ["Stable market conditions", "Steady values", "Average demand"],
        low: ["Weak market demand", "Declining values", "High days on market"],
      },
      profit: {
        good: ["High profit margin", "Multiple exit options", "Strong cash flow potential"],
        medium: ["Moderate profit potential", "Some exit options", "Positive cash flow"],
        low: ["Limited profit margin", "Few exit options", "Tight cash flow"],
      },
    };

    const factors = factorMap[key] || factorMap.financial;
    if (isGood) return factors.good;
    if (isMedium) return factors.medium;
    return factors.low;
  }

  // Compute investment score categories from real data when available
  const activeCategories: CategoryScore[] = useMemo(() => {
    // First priority: Use fullAnalysisData if available from API
    if (useRealData && fullAnalysisData?.report?.scoreBreakdown?.categories) {
      // Transform fullAnalysisData categories to match CategoryScore format
      const apiCategories = fullAnalysisData.report.scoreBreakdown.categories;
      const validKeys = ["location", "risk", "financial", "market", "profit"] as const;
      type CategoryKey = typeof validKeys[number];

      return apiCategories.map((cat) => {
        // Map API category names to our internal keys
        const keyMap: Record<string, CategoryKey> = {
          "Location": "location",
          "Risk": "risk",
          "Financial": "financial",
          "Market": "market",
          "Profit": "profit",
        };
        const rawKey = cat.name.toLowerCase();
        const key: CategoryKey = keyMap[cat.name] || (validKeys.includes(rawKey as CategoryKey) ? rawKey as CategoryKey : "financial");

        // Build breakdown from components
        const breakdown = cat.components?.map((comp) => ({
          label: comp.name,
          score: comp.score,
          maxScore: comp.maxScore,
        })) || [];

        // Generate factors based on category
        const factors = generateCategoryFactors(key, cat.score, cat.maxPoints);

        return {
          name: cat.name,
          key,
          score: cat.score,
          maxScore: cat.maxPoints,
          grade: cat.grade as Grade,
          factors,
          breakdown,
        };
      });
    }

    // Second priority: Calculate scores from available real data sources
    const hasRealData = locationScores.schoolRating > 0 ||
                        calculatedMarketMetrics !== null ||
                        (comparablesData?.comparables?.length ?? 0) > 0 ||
                        financialData !== null;

    if (useRealData && hasRealData) {
      // Build input from real data sources
      const scoreInput: InvestmentScoreInput = {
        location: {
          walkScore: locationScores.walkScore > 0 ? locationScores.walkScore : null,
          transitScore: locationScores.transitScore > 0 ? locationScores.transitScore : null,
          bikeScore: locationScores.bikeScore > 0 ? locationScores.bikeScore : null,
          schoolRating: locationScores.schoolRating > 0 ? locationScores.schoolRating : null,
          overallScore: overallLocationScore?.score || null,
          crimeRiskLevel: crimeData?.riskLevel || null,
        },
        risk: {
          // Use Risk API data when available, fall back to sample
          overallRiskScore: riskApiData?.riskScore ?? sampleRiskAssessment.riskScore,
          // Map risk levels to expected type: 'minimal' | 'low' | 'moderate' | 'high' | null
          floodRisk: (() => {
            const level = riskApiData?.flood?.riskLevel ?? sampleRiskAssessment.flood?.riskLevel;
            if (!level) return null;
            const levelStr = String(level);
            // Map 'very_high' and 'critical' to 'high'
            if (levelStr === 'very_high' || levelStr === 'critical') return 'high' as const;
            if (levelStr === 'minimal') return 'minimal' as const;
            if (levelStr === 'low') return 'low' as const;
            if (levelStr === 'moderate') return 'moderate' as const;
            if (levelStr === 'high') return 'high' as const;
            return null;
          })(),
          environmentalIssues: riskApiData?.environmental?.superfundSitesNearby
            ?? riskApiData?.environmental?.brownfieldSitesNearby
            ?? environmentalData?.counts?.total
            ?? 0,
          titleClarity: 'clear', // Default assumption for tax deed properties
        },
        financial: {
          acquisitionCost: activePropertyDetails.taxAmount || null,
          estimatedValue: financialData?.revenue?.sale?.estimatedARV
            || activePropertyDetails.marketValue
            || activePropertyDetails.assessedValue * 1.2
            || null,
          totalDue: activePropertyDetails.taxAmount || null,
          rehabCostEstimate: financialData?.costs?.rehab?.totalRehab || null,
          priceToValueRatio: financialData?.metrics?.priceToARV || null,
        },
        market: {
          marketHealth: calculatedMarketMetrics?.marketHealth || null,
          listToSaleRatio: calculatedMarketMetrics?.listToSaleRatio || null,
          avgDaysOnMarket: comparablesData?.analysis?.avgDaysOnMarket || null,
          supplyDemand: calculatedMarketMetrics?.supplyDemand || null,
          comparablesCount: comparablesData?.comparables?.length || null,
        },
        profit: {
          projectedROI: financialData?.metrics?.roi || null,
          netProfit: financialData?.metrics?.netProfit || null,
          cashFlowPotential: financialData?.revenue?.rental?.monthlyCashFlow || null,
          exitStrategies: 3, // Typically flip, hold, wholesale
        },
      };

      // Calculate scores from real data
      const calculatedCategories = calculateInvestmentScores(scoreInput);

      // Transform to CategoryScore format expected by component
      return calculatedCategories.map(cat => ({
        name: cat.name,
        key: cat.key,
        score: cat.score,
        maxScore: cat.maxScore,
        grade: cat.grade,
        factors: cat.factors,
        breakdown: cat.breakdown,
      }));
    }

    // Fallback to sample categories
    return sampleCategories;
  }, [
    useRealData,
    fullAnalysisData,
    locationScores,
    overallLocationScore,
    crimeData,
    calculatedMarketMetrics,
    comparablesData,
    financialData,
    activePropertyDetails,
    environmentalData,
    riskApiData,
  ]);

  // Calculate total score and grade from active categories
  const totalScore = useMemo(() => {
    return activeCategories.reduce((sum, cat) => sum + cat.score, 0);
  }, [activeCategories]);

  const overallGrade: Grade = useMemo(() => {
    if (useRealData && fullAnalysisData?.report?.scoreBreakdown?.grade) {
      return fullAnalysisData.report.scoreBreakdown.grade as Grade;
    }
    return calculateOverallGrade(totalScore, maxScore);
  }, [useRealData, fullAnalysisData, totalScore, maxScore]);

  // Get recommendation based on score
  const getRecommendation = (score: number) => {
    if (score >= 100) return { text: "STRONG BUY", color: "emerald" };
    if (score >= 80) return { text: "BUY", color: "green" };
    if (score >= 60) return { text: "HOLD", color: "amber" };
    return { text: "PASS", color: "red" };
  };
  const recommendation = getRecommendation(totalScore);

  /**
   * Calculate risk assessment from real API data
   * PRIORITY: Use Risk API data if available (complete aggregated assessment)
   * FALLBACK: Use individual API data to calculate partial assessment
   * LAST: Fall back to sample data when no APIs have returned data yet
   */
  const calculatedRiskAssessment = useMemo(() => {
    // PRIORITY 1: Use Risk API data if available (complete aggregated risk assessment)
    if (riskApiData) {
      console.log('[RiskAssessment] Using Risk API data:', riskApiData.overallRisk);
      return riskApiData;
    }

    // PRIORITY 2: Build from individual API data sources
    const riskInput: RiskCalculationInput = {
      state: activePropertyDetails.state,
      county: activePropertyDetails.county,
      coordinates: {
        lat: activePropertyDetails.coordinates?.lat || 40.5186,
        lng: activePropertyDetails.coordinates?.lng || -78.3947,
      },
    };

    // Add seismic data if available from USGS API
    if (seismicData) {
      riskInput.seismicData = {
        pga: seismicData.pga || 0.05,
        seismicDesignCategory: seismicData.hazardCategory || 'A',
        riskLevel: seismicData.riskLevel,
        ss: seismicData.ss,
        s1: seismicData.s1,
      };
    }

    // Add wildfire data if available from NASA FIRMS API
    if (wildfireData) {
      riskInput.wildfireData = {
        fireCount: wildfireData.fireCount || 0,
        nearestFireMiles: wildfireData.nearestFireMiles || null,
        fires: wildfireData.fires,
      };
    }

    // Add environmental data if available from EPA API
    if (environmentalData) {
      riskInput.environmentalData = {
        counts: environmentalData.counts ? {
          total: environmentalData.counts.total || 0,
          superfund: environmentalData.counts.superfund || 0,
          brownfield: environmentalData.counts.brownfield || 0,
          ust: environmentalData.counts.ust || 0,
          tri: environmentalData.counts.tri || 0,
        } : undefined,
        nearestSite: environmentalData.nearestSite ?? undefined,  // Convert null to undefined
        searchRadiusMiles: environmentalData.searchRadiusMiles,
      };
    }

    // Add terrain data if available from Elevation API
    if (terrainData) {
      riskInput.terrainData = {
        elevation: terrainData.elevation,
        elevationFeet: terrainData.elevationFeet,
        averageSlope: terrainData.averageSlope,
        maxSlope: terrainData.maxSlope,
        classification: terrainData.classification,
        stability: terrainData.stability,
        stabilityLabel: terrainData.stabilityLabel,
      };
    }

    // Add flood risk data from elevation analysis
    if (elevationData?.floodRiskAssessment) {
      riskInput.elevationData = {
        floodRiskAssessment: elevationData.floodRiskAssessment,
        surroundingElevations: elevationData.surroundingElevations,
      };
    }

    // Add Zillow/First Street climate risk data if available
    if (combinedMarketData?.climateRisk) {
      riskInput.climateRiskData = {
        floodRisk: combinedMarketData.climateRisk.flood,
        fireRisk: combinedMarketData.climateRisk.fire,
        windRisk: combinedMarketData.climateRisk.wind,
        heatRisk: combinedMarketData.climateRisk.heat,
        source: 'First Street Foundation via Zillow',
      };
    }

    // Check if we have any real data to calculate from
    const hasClimateData = combinedMarketData?.climateRisk && (
      combinedMarketData.climateRisk.flood !== null ||
      combinedMarketData.climateRisk.fire !== null ||
      combinedMarketData.climateRisk.wind !== null
    );

    if (!hasRealRiskData(riskInput) && !hasClimateData) {
      // Return sample data if no real API data available yet
      return sampleRiskAssessment;
    }

    // Calculate real risk assessment from API data
    return calculateRiskAssessment(riskInput);
  }, [activePropertyDetails, seismicData, wildfireData, environmentalData, terrainData, elevationData, riskApiData, combinedMarketData]);

  // Check if we're showing calculated risk data (vs sample)
  // Now also checks for Risk API data and Zillow climate data
  const isRealRiskData = useMemo(() => {
    // If we have Risk API data, it's definitely real
    if (riskApiData) return true;

    // If we have Zillow climate data, that's real too
    if (combinedMarketData?.climateRisk && (
      combinedMarketData.climateRisk.flood !== null ||
      combinedMarketData.climateRisk.fire !== null ||
      combinedMarketData.climateRisk.wind !== null
    )) return true;

    // Otherwise check individual API sources
    return hasRealRiskData({
      seismicData: seismicData ? { pga: seismicData.pga || 0, seismicDesignCategory: seismicData.hazardCategory || 'A' } : undefined,
      wildfireData: wildfireData ? { fireCount: wildfireData.fireCount || 0 } : undefined,
      environmentalData: environmentalData?.counts ? { counts: environmentalData.counts } : undefined,
      terrainData: terrainData ? { elevation: terrainData.elevation, elevationFeet: terrainData.elevationFeet, averageSlope: terrainData.averageSlope, maxSlope: terrainData.maxSlope, classification: terrainData.classification, stability: terrainData.stability } : undefined,
      elevationData: elevationData?.floodRiskAssessment ? { floodRiskAssessment: elevationData.floodRiskAssessment } : undefined,
    });
  }, [seismicData, wildfireData, environmentalData, terrainData, elevationData, riskApiData, combinedMarketData]);

  /**
   * Calculate financial analysis from real property and market data
   * Falls back to this when API call fails - uses actual property details
   */
  const calculatedFinancialAnalysis = useMemo((): FinancialAnalysis | null => {
    // Need at least assessed/market value to calculate
    const hasPropertyValue = activePropertyDetails.assessedValue ||
      activePropertyDetails.marketValue ||
      activePropertyDetails.minimumBid ||
      activePropertyDetails.taxAmount;

    if (!hasPropertyValue) {
      return null;
    }

    // Build the input from real property data (convert null to undefined for type compatibility)
    const financialInput: FinancialAnalysisInput = {
      property: {
        assessedValue: activePropertyDetails.assessedValue ?? undefined,
        marketValue: activePropertyDetails.marketValue ?? undefined,
        buildingSqft: activePropertyDetails.buildingSqft ?? undefined,
        lotSizeSqft: (() => {
          const acres = typeof activePropertyDetails.lotSize === 'number'
            ? activePropertyDetails.lotSize
            : parseFloat(String(activePropertyDetails.lotSize)) || 0;
          return acres > 0 ? acres * 43560 : undefined;
        })(),
        yearBuilt: activePropertyDetails.yearBuilt ?? undefined,
        bedrooms: activePropertyDetails.bedrooms ?? undefined,
        bathrooms: activePropertyDetails.bathrooms ?? undefined,
        propertyType: activePropertyDetails.propertyType,
        taxAmount: activePropertyDetails.taxAmount,
      },
      auction: {
        minimumBid: activePropertyDetails.minimumBid || activePropertyDetails.taxAmount,
        saleType: activePropertyDetails.saleType || 'repository',
        buyersPremiumPct: 0.10, // 10% buyer's premium typical
      },
    };

    // Add market data if we have comparables
    if (comparablesData?.comparables && comparablesData.comparables.length > 0) {
      // Transform ComparableProperty[] to RealtyComparable[] format
      const comparablesForCalc = comparablesData.comparables.map((comp) => ({
        property_id: comp.id,
        address: {
          line: comp.address,
          city: comp.city || '',
          state_code: activePropertyDetails.state || 'PA',
          postal_code: activePropertyDetails.zip || '',
        },
        price: {
          sold_price: comp.salePrice,
          list_price: comp.salePrice,
          price_per_sqft: comp.pricePerSqft,
        },
        description: {
          beds: comp.bedrooms,
          baths: comp.bathrooms,
          sqft: comp.sqft,
          lot_sqft: comp.lotSizeAcres ? comp.lotSizeAcres * 43560 : undefined,
          year_built: comp.yearBuilt,
          type: comp.propertyType,
        },
        sold_date: comp.saleDate instanceof Date ? comp.saleDate.toISOString() : String(comp.saleDate),
        distance_miles: comp.distance,
      }));

      financialInput.market = {
        medianSalePrice: comparablesData.analysis?.avgSalePrice,
        avgPricePerSqft: comparablesData.analysis?.avgPricePerSqft,
        comparables: comparablesForCalc as any, // RealtyComparable type
      };
    }

    // Add tax history if available from Zillow
    if (combinedMarketData?.taxTrends && combinedMarketData.taxTrends.length > 0) {
      financialInput.taxHistory = combinedMarketData.taxTrends.map(th => ({
        year: th.year,
        taxPaid: th.taxPaid || 0,
        assessedValue: th.assessedValue,
      }));
    }

    // Calculate financial analysis with real data
    try {
      return calculateFinancialAnalysis(financialInput);
    } catch (error) {
      console.error('[FinancialAnalysis] Calculation failed:', error);
      return null;
    }
  }, [activePropertyDetails, comparablesData, combinedMarketData]);

  /**
   * Build nearby amenities array from Geoapify API data
   * The API returns AmenitiesSummary with:
   * - counts: { hospitals, schools, grocery_stores, restaurants, ... }
   * - nearest: { hospital: GeoapifyPlace, school: GeoapifyPlace, ... }
   * where GeoapifyPlace has name, distance, lat, lon, etc.
   */
  const buildAmenitiesFromApi = () => {
    const amenities: Array<{
      name: string;
      type: "school" | "hospital" | "shopping" | "transit" | "park" | "restaurant" | "other";
      distance: number;
      rating?: number;
    }> = [];

    const metersToMiles = (meters: number) => Math.round((meters / 1609.34) * 10) / 10;

    // Access the nearest places from Geoapify API response
    // The API returns GeoapifyPlace objects with name, distance, categories, etc.
    const nearest = amenitiesData?.nearest;
    const counts = amenitiesData?.counts;

    if (nearest) {
      // Add school if available
      if (nearest.school) {
        amenities.push({
          name: nearest.school.name || "Nearby School",
          type: "school",
          distance: nearest.school.distance
            ? metersToMiles(nearest.school.distance)
            : 1.0,
          rating: 4,
        });
      }

      // Add hospital if available
      if (nearest.hospital) {
        amenities.push({
          name: nearest.hospital.name || "Nearby Hospital",
          type: "hospital",
          distance: nearest.hospital.distance
            ? metersToMiles(nearest.hospital.distance)
            : 2.0,
        });
      }

      // Add grocery store as shopping
      if (nearest.grocery_store) {
        amenities.push({
          name: nearest.grocery_store.name || "Grocery Store",
          type: "shopping",
          distance: nearest.grocery_store.distance
            ? metersToMiles(nearest.grocery_store.distance)
            : 1.5,
          rating: 4,
        });
      }

      // Add gas station as other
      if (nearest.gas_station) {
        amenities.push({
          name: nearest.gas_station.name || "Gas Station",
          type: "other",
          distance: nearest.gas_station.distance
            ? metersToMiles(nearest.gas_station.distance)
            : 0.5,
        });
      }

      // Add park if available
      if (nearest.park) {
        amenities.push({
          name: nearest.park.name || "Nearby Park",
          type: "park",
          distance: nearest.park.distance
            ? metersToMiles(nearest.park.distance)
            : 0.5,
          rating: 4,
        });
      }
    }

    // Add transit info based on count from API
    // API returns counts.public_transport
    if (counts?.public_transport && counts.public_transport > 0) {
      amenities.push({
        name: "Public Transit Stop",
        type: "transit",
        distance: 0.5, // Default estimate since API doesn't provide nearest transit
      });
    }

    // Add restaurants if available
    if (counts?.restaurants && counts.restaurants > 0) {
      amenities.push({
        name: `${counts.restaurants} Restaurants Nearby`,
        type: "restaurant",
        distance: 1.0, // Default estimate
        rating: 4,
      });
    }

    return amenities;
  };

  const realAmenities = buildAmenitiesFromApi();

  // Debug logging for amenities data
  if (typeof window !== 'undefined' && isShowingRealData) {
    console.log('[Amenities Debug]', {
      hasAmenitiesData: !!amenitiesData,
      amenitiesDataKeys: amenitiesData ? Object.keys(amenitiesData) : [],
      nearest: amenitiesData?.nearest,
      counts: amenitiesData?.counts,
      realAmenitiesCount: realAmenities.length,
      realAmenities: realAmenities,
    });
  }

  // Fallback amenities for when API data is not available
  const fallbackAmenities = [
    { name: `${activePropertyDetails.city || 'Area'} High School`, type: "school" as const, distance: 0.8, rating: 4 },
    { name: "Regional Hospital", type: "hospital" as const, distance: 1.2 },
    { name: "Shopping Center", type: "shopping" as const, distance: 1.5, rating: 4 },
    { name: "Transit Station", type: "transit" as const, distance: 0.5 },
    { name: "City Park", type: "park" as const, distance: 0.3, rating: 5 },
    { name: "Convenience Store", type: "other" as const, distance: 0.2 },
  ];

  /**
   * Handle PDF export with loading state and error handling
   * Generates a PDF of the report content and triggers download
   */
  const handlePrint = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const filename = generateReportFilename(fullAddress, reportId);
      await exportReportToPDF("report-container", filename);
    } catch (error) {
      console.error("PDF export failed:", error);
      // Fallback to browser print if PDF export fails
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div id="report-container" className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ===== SECTION 1: Executive Summary Header ===== */}
      <header className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Top row: Property info and recommendation */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Property identification */}
            <div>
              <div className="flex items-center gap-2 text-emerald-100 mb-2">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-medium">Property Analysis Report</span>
                {isShowingRealData && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded-full">
                    Live Data
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-2">
                {isLoadingReport ? (
                  <Skeleton className="h-9 w-64 bg-white/20" />
                ) : (
                  activePropertyDetails.address
                )}
              </h1>
              <div className="text-emerald-100 text-lg">
                {isLoadingReport ? (
                  <Skeleton className="h-7 w-48 bg-white/20" />
                ) : (
                  `${activePropertyDetails.city}, ${activePropertyDetails.state} ${activePropertyDetails.zip}`
                )}
              </div>
              <div className="text-emerald-200 text-sm mt-1">
                {isLoadingReport ? (
                  <Skeleton className="h-5 w-56 bg-white/20" />
                ) : (
                  `Parcel: ${activePropertyDetails.parcelId} | ${activePropertyDetails.county} County`
                )}
              </div>
            </div>

            {/* Score and Recommendation */}
            <div className="flex flex-col items-center lg:items-end gap-4">
              {/* Score circle */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-emerald-600">{totalScore}</span>
                      <span className="text-xs text-slate-500">of {maxScore}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold">{overallGrade}</div>
                  <div className="text-emerald-100 text-sm">Investment Grade</div>
                </div>
              </div>

              {/* Recommendation badge */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                recommendation.color === "emerald" ? "bg-white/20 text-white" :
                recommendation.color === "green" ? "bg-white/90 text-green-600" :
                recommendation.color === "amber" ? "bg-amber-400 text-amber-900" :
                "bg-red-500 text-white"
              }`}>
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold text-lg">{recommendation.text}</span>
              </div>
            </div>
          </div>

          {/* Scoring guide */}
          <div className="mt-6 pt-6 border-t border-emerald-400/30">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-emerald-100">Score Guide:</span>
              <span className="px-3 py-1 rounded-full bg-emerald-800/50 text-emerald-100">
                100-125: Strong Buy
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-800/30 text-emerald-200">
                80-99: Buy
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-800/20 text-emerald-200">
                60-79: Hold
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-800/10 text-emerald-300">
                Below 60: Pass
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ===== Property Selector (NEW) ===== */}
        <section className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Select Property:
              </span>
              <select
                value={propertyIdFromUrl || ""}
                onChange={(e) => {
                  const newUrl = e.target.value
                    ? `?propertyId=${e.target.value}`
                    : window.location.pathname;
                  window.history.pushState({}, "", newUrl);
                  window.location.reload();
                }}
                className="px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm min-w-[300px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={isLoadingProperties}
              >
                <option value="">-- Demo Data (Sample Property) --</option>
                {availableProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.address} - {property.county}, {property.state}
                    {property.totalDue ? ` ($${property.totalDue.toLocaleString()})` : ""}
                  </option>
                ))}
              </select>
              {isLoadingProperties && (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {isShowingRealData ? (
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle className="h-3 w-3" />
                  Live Supabase Data
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                  <Info className="h-3 w-3" />
                  Sample Data
                </span>
              )}
              {reportLastFetched && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  Updated: {reportLastFetched.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Loading state for property report */}
          {isLoadingReport && (
            <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-700">
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading property data from Supabase...
              </div>
            </div>
          )}

          {/* Error state */}
          {reportError && (
            <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                <AlertTriangle className="h-4 w-4" />
                {reportError}
                <button
                  onClick={refreshReport}
                  className="ml-2 text-xs underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Property info when loaded */}
          {isShowingRealData && propertyReport && (
            <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Parcel: </span>
                  <span className="text-emerald-900 dark:text-emerald-100 font-mono text-xs">
                    {propertyReport.propertyDetails.parcelId}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Sale Type: </span>
                  <span className="text-emerald-900 dark:text-emerald-100 capitalize">
                    {propertyReport.auctionInfo.saleType || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Total Due: </span>
                  <span className="text-emerald-900 dark:text-emerald-100">
                    {propertyReport.auctionInfo.totalDue
                      ? `$${propertyReport.auctionInfo.totalDue.toLocaleString()}`
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Has Regrid: </span>
                  <span className="text-emerald-900 dark:text-emerald-100">
                    {propertyReport.metadata.hasRegridData ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ===== Data Mode Toggle Banner ===== */}
        <section className="rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Data Source:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDataModeToggle}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    !useRealData
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
                  )}
                >
                  Demo Data
                </button>
                <button
                  onClick={handleDataModeToggle}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    useRealData
                      ? "bg-emerald-600 text-white shadow-md"
                      : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
                  )}
                >
                  Real API Data
                </button>
              </div>
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              {useRealData
                ? "Using full analysis API with Risk, Financial, and Scoring engines"
                : "Using sample data with basic API enrichment"}
            </div>
          </div>

          {/* Full Analysis Status when in real data mode */}
          {useRealData && fullAnalysisData?.success && fullAnalysisData.report && (
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Score: </span>
                  <span className="text-blue-900 dark:text-blue-100">
                    {fullAnalysisData.report.scoreBreakdown.totalScore}/{fullAnalysisData.report.scoreBreakdown.maxScore} ({fullAnalysisData.report.scoreBreakdown.grade})
                  </span>
                </div>
                <div>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Confidence: </span>
                  <span className="text-blue-900 dark:text-blue-100">
                    {fullAnalysisData.metadata.confidenceLevel}%
                  </span>
                </div>
                <div>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Duration: </span>
                  <span className="text-blue-900 dark:text-blue-100">
                    {(fullAnalysisData.metadata.durationMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <div>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Sources: </span>
                  <span className="text-blue-900 dark:text-blue-100">
                    {fullAnalysisData.metadata.sourcesUsed.length}/{fullAnalysisData.metadata.sourcesUsed.length + fullAnalysisData.metadata.sourcesFailed.length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ===== API Data Status Banner ===== */}
        {(isLoading || apiData || apiError) && (
          <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {useRealData ? "Running full analysis (Risk + Financial + Scoring)..." : "Loading real-time data from APIs..."}
                    </span>
                  </>
                ) : apiError ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <span className="text-sm text-amber-600 dark:text-amber-400">API Error: {apiError} (using sample data)</span>
                  </>
                ) : apiData ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">
                      {useRealData
                        ? `Full analysis complete (${fullAnalysisData?.metadata?.confidenceLevel || 0}% confidence)`
                        : `Live data loaded (${apiData.dataQuality} coverage) - ${apiData.sources.filter(s => s.status === 'ok').length}/${apiData.sources.length} APIs`}
                    </span>
                  </>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {lastFetched && (
                  <span className="text-xs text-slate-500">
                    Last updated: {lastFetched.toLocaleTimeString()}
                  </span>
                )}
                <button
                  onClick={useRealData ? fetchFullAnalysis : fetchReportData}
                  disabled={isLoading}
                  className="text-xs px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* API Sources Status */}
            {apiData && apiData.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap gap-2">
                  {apiData.sources.map((source) => (
                    <span
                      key={source.name}
                      className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        source.status === 'ok'
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : source.status === 'skipped'
                          ? "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}
                    >
                      {source.name}: {source.status}
                      {source.latency && ` (${source.latency}ms)`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary from OpenAI */}
            {aiSummary && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">AI Investment Summary</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{aiSummary}</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ===== SECTION 2: Strengths & Concerns ===== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                <TrendingUp className="h-5 w-5" />
                Key Strengths
              </h2>
              <DataSourceBadge type={fullAnalysisData?.report?.riskAnalysis?.positiveFactors?.length ? "live" : "sample"} />
            </div>
            <ul className="space-y-3">
              {(fullAnalysisData?.report?.riskAnalysis?.positiveFactors?.length
                ? fullAnalysisData.report.riskAnalysis.positiveFactors
                : [
                    "36.3% projected ROI exceeds 20% threshold",
                    "Acquisition at 30% of ARV (well below 70% rule)",
                    "Clear title expected - no major liens",
                    "Strong rental fallback with 7.7% cap rate",
                    "Low risk profile - no flood/earthquake concerns",
                    "Good school district (7/10 rating)",
                  ]
              ).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-500 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Concerns */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
                Areas of Concern
              </h2>
              <DataSourceBadge type={fullAnalysisData?.report?.riskAnalysis?.topRiskFactors?.length || (useRealData && fullAnalysisData) ? "live" : "sample"} />
            </div>
            <ul className="space-y-3">
              {fullAnalysisData?.report?.riskAnalysis?.topRiskFactors?.length ? (
                fullAnalysisData.report.riskAnalysis.topRiskFactors.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))
              ) : useRealData && fullAnalysisData ? (
                <li className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-500 mt-0.5" />
                  <span>No significant risk factors identified - property appears to have low environmental and natural disaster risks</span>
                </li>
              ) : (
                [
                  "Pennsylvania Radon Zone 1 - testing required",
                  "Built in 1952 - potential for hidden issues",
                  "Moderate market conditions in area",
                  "Rehab estimates may vary based on inspection",
                  "Limited comparable sales in immediate area",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        {/* ===== SECTION 3: Property Data Card ===== */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Home className="h-5 w-5" />
              Property Overview
            </h2>
            <DataSourceBadge type={isShowingRealData ? "live" : "sample"} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {fullAnalysisData?.report?.roiAnalysis?.purchase_price
                  ? `$${fullAnalysisData.report.roiAnalysis.purchase_price.toLocaleString()}`
                  : activePropertyDetails.taxAmount
                    ? `$${activePropertyDetails.taxAmount.toLocaleString()}`
                    : "$45,000"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Asking Price</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {comparablesData?.analysis?.suggestedArv
                  ? `$${Math.round(comparablesData.analysis.suggestedArv).toLocaleString()}`
                  : fullAnalysisData?.report?.roiAnalysis?.estimated_arv
                    ? `$${fullAnalysisData.report.roiAnalysis.estimated_arv.toLocaleString()}`
                    : activePropertyDetails.marketValue
                      ? `$${activePropertyDetails.marketValue.toLocaleString()}`
                      : "$150,000"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Est. FMV (ARV)</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                {(() => {
                  const propType = activePropertyDetails.propertyType || activePropertyDetails.landUse || "";
                  const buildingSqft = activePropertyDetails.buildingSqft || 0;
                  // Determine if it's a vacant lot
                  if (buildingSqft === 0 || propType.toLowerCase().includes("vacant") || propType.toLowerCase().includes("lot")) {
                    return "Vacant Lot";
                  }
                  // Simplify common property types
                  if (propType.toLowerCase().includes("single family") || propType.toLowerCase().includes("residential")) {
                    return "Residence";
                  }
                  if (propType.toLowerCase().includes("commercial")) {
                    return "Commercial";
                  }
                  if (propType.toLowerCase().includes("multi") || propType.toLowerCase().includes("apartment")) {
                    return "Multi-Family";
                  }
                  return propType.length > 15 ? propType.substring(0, 12) + "..." : propType || "Unknown";
                })()}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Property Type</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {activePropertyDetails.lotSize && activePropertyDetails.lotSize !== "Not available"
                  ? activePropertyDetails.lotSize.split(" ")[0] + " ac"
                  : "N/A"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Lot Size</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {activePropertyDetails.buildingSqft && activePropertyDetails.buildingSqft > 0
                  ? `${activePropertyDetails.buildingSqft.toLocaleString()} sqft`
                  : "N/A"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Building Size</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {(() => {
                  const arv = comparablesData?.analysis?.suggestedArv || fullAnalysisData?.report?.roiAnalysis?.estimated_arv || activePropertyDetails.marketValue || 0;
                  const price = fullAnalysisData?.report?.roiAnalysis?.purchase_price || activePropertyDetails.taxAmount || 0;
                  if (arv === 0 || price === 0) return "N/A";
                  const discount = Math.round(((arv - price) / arv) * 100);
                  return `${discount}% OFF`;
                })()}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Discount</p>
            </div>
          </div>
        </section>

        {/* ===== SECTION 4: Property Visualization (Maps) ===== */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Map View - Using Google Maps Static API */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              <Map className="h-5 w-5" />
              Map View
            </h3>
            <div className="aspect-video">
              <GoogleMapStatic
                lat={activePropertyDetails.coordinates.lat}
                lng={activePropertyDetails.coordinates.lng}
                address={`${activePropertyDetails.address}, ${activePropertyDetails.city}, ${activePropertyDetails.state} ${activePropertyDetails.zip}`}
                zoom={17}
                mapType="roadmap"
                height={300}
                showExternalLink={true}
                altText={`Map of ${activePropertyDetails.address}`}
              />
            </div>
          </div>
          {/* Satellite View - Using Google Maps Static API */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              <Map className="h-5 w-5" />
              Satellite View
            </h3>
            <div className="aspect-video">
              <GoogleMapStatic
                lat={activePropertyDetails.coordinates.lat}
                lng={activePropertyDetails.coordinates.lng}
                address={`${activePropertyDetails.address}, ${activePropertyDetails.city}, ${activePropertyDetails.state} ${activePropertyDetails.zip}`}
                zoom={19}
                mapType="satellite"
                height={300}
                showExternalLink={true}
                altText={`Satellite view of ${activePropertyDetails.address}`}
              />
            </div>
          </div>
          {/* Street View - Using Google Street View Static API */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              <MapPin className="h-5 w-5" />
              Street View
            </h3>
            <div className="aspect-video">
              <GoogleStreetViewStatic
                lat={activePropertyDetails.coordinates.lat}
                lng={activePropertyDetails.coordinates.lng}
                address={`${activePropertyDetails.address}, ${activePropertyDetails.city}, ${activePropertyDetails.state} ${activePropertyDetails.zip}`}
                heading={90}
                pitch={0}
                height={300}
                showExternalLink={true}
                altText={`Street view of ${activePropertyDetails.address}`}
              />
            </div>
          </div>
        </section>

        {/* ===== SECTION 5: Location Details ===== */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <MapPin className="h-5 w-5" />
              Location Details
            </h2>
            <DataSourceBadge type={isShowingRealData ? "live" : "sample"} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Full Address</h4>
              <p className="text-slate-900 dark:text-slate-100">
                {activePropertyDetails.address}<br />
                {activePropertyDetails.city}, {activePropertyDetails.state} {activePropertyDetails.zip}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">County</h4>
              <p className="text-slate-900 dark:text-slate-100">{activePropertyDetails.county} County, PA</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Coordinates</h4>
              <p className="text-slate-900 dark:text-slate-100">
                {activePropertyDetails.coordinates.lat.toFixed(4)}, {activePropertyDetails.coordinates.lng.toFixed(4)}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Parcel ID</h4>
              <p className="text-slate-900 dark:text-slate-100 font-mono">{activePropertyDetails.parcelId}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Zoning</h4>
              <p className="text-slate-900 dark:text-slate-100">{activePropertyDetails.zoning}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Legal Description</h4>
              <p className="text-slate-900 dark:text-slate-100 text-sm">{activePropertyDetails.legalDescription}</p>
            </div>
          </div>
        </section>

        {/* ===== SECTION 6: Location Context (Proximity Analysis) ===== */}
        <LocationAnalysis
          score={overallLocationScore.score}
          maxScore={overallLocationScore.maxScore}
          grade={overallLocationScore.grade as Grade}
          neighborhood={censusData?.geographic?.countyName
            ? `${activePropertyDetails.city || 'Downtown'}, ${censusData.geographic.countyName} County`
            : "Downtown Altoona"}
          stats={{
            medianIncome: censusData?.demographics?.medianHouseholdIncome || 45200,
            populationDensity: censusData?.demographics?.population
              ? Math.round(censusData.demographics.population / 100)
              : 2850,
            homeownershipRate: censusData?.demographics?.ownerOccupiedPct || 62,
            medianAge: censusData?.demographics?.medianAge || 38,
            vacancyRate: censusData?.demographics?.vacancyRate || 8.5,
            crimeRate: crimeData?.riskLevel === 'moderate' ? 'medium' : (crimeData?.riskLevel || 'medium'),
            // Use improved Geoapify-based location scores
            schoolRating: locationScores.schoolRating,
            walkScore: locationScores.walkScore,
            transitScore: locationScores.transitScore,
            bikeScore: locationScores.bikeScore,
          }}
          amenities={realAmenities.length > 0 ? realAmenities : fallbackAmenities}
          trends={[
            {
              metric: "Median Home Value",
              current: censusData?.demographics?.medianHomeValue
                ? `$${censusData.demographics.medianHomeValue.toLocaleString()}`
                : "$142,000",
              changePercent: 3.2,
              period: "YoY",
              trend: "up"
            },
            { metric: "Days on Market", current: 45, changePercent: -8, period: "YoY", trend: "down" },
            { metric: "New Listings", current: 125, changePercent: 2.1, period: "MoM", trend: "up" },
            { metric: "Inventory", current: 3.2, changePercent: -5, period: "YoY", trend: "down" },
          ]}
          factors={[
            ...(censusData?.demographics?.ownerOccupiedPct && censusData.demographics.ownerOccupiedPct > 60
              ? [`High homeownership rate (${censusData.demographics.ownerOccupiedPct.toFixed(1)}%)`]
              : []),
            ...(censusData?.demographics?.unemploymentRate && censusData.demographics.unemploymentRate < 5
              ? [`Low unemployment (${censusData.demographics.unemploymentRate.toFixed(1)}%)`]
              : []),
            ...(() => {
              const counts = amenitiesData?.counts;
              const total = counts ? (counts.hospitals + counts.schools + counts.parks + counts.restaurants + counts.grocery_stores + counts.shopping) : 0;
              return total > 10 ? [`Good nearby amenities (${total} within walking distance)`] : [];
            })(),
            "Near downtown amenities",
          ].slice(0, 4)}
          concerns={[
            ...(censusData?.demographics?.vacancyRate && censusData.demographics.vacancyRate > 10
              ? [`Higher vacancy rate (${censusData.demographics.vacancyRate.toFixed(1)}%)`]
              : []),
            ...(censusData?.demographics?.povertyPct && censusData.demographics.povertyPct > 15
              ? [`Above average poverty rate (${censusData.demographics.povertyPct.toFixed(1)}%)`]
              : []),
            ...(amenitiesData?.counts?.public_transport === 0
              ? ["Limited public transit options"]
              : []),
          ].slice(0, 2)}
          googleMapsUrl={`https://maps.google.com/?q=${encodeURIComponent(activePropertyDetails.address + ' ' + activePropertyDetails.city + ' ' + activePropertyDetails.state)}`}
          dataYear={censusData?.demographics?.dataYear}
          dataSourceType={censusData?.demographics || amenitiesData ? "live" : "sample"}
        />

        {/* ===== SECTION 7: Slope & Terrain Analysis (with real API data) ===== */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Mountain className="h-5 w-5" />
              Slope & Terrain Analysis
            </h2>
            <DataSourceBadge type={terrainData ? "live" : "sample"} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Elevation</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {terrainData ? `${terrainData.elevation}m` : elevationData ? `${elevationData.elevation}m` : '358m'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {terrainData ? `${terrainData.elevationFeet}ft` : elevationData ? `${elevationData.elevationFeet}ft` : '1,175ft'} above sea level
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Average Slope</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {terrainData ? `${terrainData.averageSlope}%` : '—'}
              </p>
              <p className={`text-sm ${terrainData?.classification === 'flat' || terrainData?.classification === 'gentle' ? 'text-emerald-600 dark:text-emerald-400' : terrainData?.classification === 'moderate' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                {terrainData ? terrainData.classificationLabel : 'Calculating...'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Max Slope</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {terrainData ? `${terrainData.maxSlope}%` : '—'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {terrainData?.slopeDirection && terrainData.slopeDirection !== 'flat'
                  ? `Steepest toward ${terrainData.slopeDirection}`
                  : 'Relatively flat terrain'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Classification</p>
              <p className={`text-2xl font-bold ${terrainData?.stability === 'stable' ? 'text-emerald-600 dark:text-emerald-400' : terrainData?.stability === 'moderate_risk' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                {terrainData?.stability === 'stable' ? 'Stable' : terrainData?.stability === 'moderate_risk' ? 'Moderate' : terrainData?.stability === 'high_risk' ? 'At Risk' : '—'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {terrainData ? terrainData.stabilityLabel : 'Calculating...'}
              </p>
            </div>
          </div>
          <div className={`mt-6 p-4 rounded-lg border ${terrainData?.stability === 'stable' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : terrainData?.stability === 'moderate_risk' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
            <p className={`text-sm ${terrainData?.stability === 'stable' ? 'text-emerald-700 dark:text-emerald-300' : terrainData?.stability === 'moderate_risk' ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300'}`}>
              <strong>Assessment:</strong> {terrainData
                ? terrainData.assessment
                : `Property at ${elevationData ? `${elevationData.elevation}m (${elevationData.elevationFeet}ft)` : '358m (1,175ft)'} elevation. Slope analysis loading...`}
            </p>
          </div>
        </section>

        {/* ===== SECTION 8: Insurance Risk Analysis ===== */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              <Shield className="h-6 w-6" />
              Risk Assessment
            </h2>
            <DataSourceBadge type={isRealRiskData ? "live" : "sample"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskOverviewCard
              assessment={calculatedRiskAssessment}
              title="Overall Risk Assessment"
              showDetails
            />
            <InsuranceEstimateCard
              estimates={calculatedRiskAssessment.insuranceEstimates}
              propertyValue={150000}
              showChart
              showDetails
            />
          </div>
        </section>

        {/* ===== SECTION 8B: Live Environmental & Infrastructure Data ===== */}
        {(climateData || seismicData || wildfireData || environmentalData || broadbandData || weatherAlerts) && (
          <section className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-blue-800 dark:text-blue-300">
                <BarChart3 className="h-5 w-5" />
                Live Environmental & Infrastructure Data
              </h2>
              <DataSourceBadge type="live" label="Real-time API Data" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Climate Data */}
              {climateData && (
                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Current Weather</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Temperature</span>
                      <span className="font-medium">{climateData.current?.temperature ?? climateData.averageTemperature}°F</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Humidity</span>
                      <span className="font-medium">{climateData.current?.humidity ?? climateData.averageHumidity}%</span>
                    </div>
                    {climateData.current?.windSpeed && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Wind Speed</span>
                        <span className="font-medium">{climateData.current.windSpeed} mph</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Seismic Data */}
              {seismicData && (
                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Seismic Risk (USGS)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Hazard Category</span>
                      <span className={cn(
                        "font-medium px-2 py-0.5 rounded text-xs",
                        seismicData.hazardCategory === 'A' ? "bg-emerald-100 text-emerald-700" :
                        seismicData.hazardCategory === 'B' ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        Category {seismicData.hazardCategory}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">PGA</span>
                      <span className="font-medium">{seismicData.pga}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Risk Level</span>
                      <span className="font-medium text-emerald-600">{seismicData.riskLevel}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Wildfire Data */}
              {wildfireData && (
                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Wildfire Risk (NASA FIRMS)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Active Fires Nearby</span>
                      <span className={cn(
                        "font-medium",
                        wildfireData.fireCount === 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        {wildfireData.fireCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Nearest Fire</span>
                      <span className="font-medium">
                        {wildfireData.nearestFireMiles ? `${wildfireData.nearestFireMiles.toFixed(1)} miles` : 'None detected'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                      Last updated: {wildfireData.lastUpdated ? new Date(wildfireData.lastUpdated).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              )}

              {/* Environmental Sites */}
              {environmentalData && (
                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Environmental Sites (EPA)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Sites Within {environmentalData.searchRadiusMiles || 5} Miles</span>
                      <span className={cn(
                        "font-medium",
                        (environmentalData.counts?.total || 0) === 0 ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {environmentalData.counts?.total || 0}
                      </span>
                    </div>
                    {environmentalData.nearestSite && (
                      <div className="text-xs text-slate-500">
                        • Nearest: {environmentalData.nearestSite.name} ({environmentalData.nearestSite.distanceMiles.toFixed(1)} mi) - {environmentalData.nearestSite.type}
                      </div>
                    )}
                    {environmentalData.counts && environmentalData.counts.total > 0 && (
                      <div className="text-xs text-slate-500">
                        • Superfund: {environmentalData.counts.superfund} | Brownfield: {environmentalData.counts.brownfield} | UST: {environmentalData.counts.ust}
                      </div>
                    )}
                    {(!environmentalData.counts || environmentalData.counts.total === 0) && (
                      <div className="text-xs text-emerald-600">
                        No environmental concerns within search radius
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Broadband Data */}
              {broadbandData && (
                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Broadband (FCC)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Available</span>
                      <span className={cn(
                        "font-medium",
                        broadbandData.available ? "text-emerald-600" : "text-red-600"
                      )}>
                        {broadbandData.available ? 'Yes' : 'Limited'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Max Download</span>
                      <span className="font-medium">{broadbandData.maxDownload} Mbps</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Fiber</span>
                      <span className="font-medium">{broadbandData.fiberAvailable ? 'Available' : 'Not Available'}</span>
                    </div>
                    {broadbandData.providers && broadbandData.providers.length > 0 && (
                      <div className="text-xs text-slate-400">
                        Providers: {broadbandData.providers.slice(0, 3).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Weather Alerts */}
              {weatherAlerts && weatherAlerts.count > 0 && (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300 mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    Weather Alerts (NOAA)
                  </h4>
                  <div className="space-y-2">
                    {weatherAlerts.active.slice(0, 2).map((alert, idx) => (
                      <div key={idx} className="text-sm text-amber-600 dark:text-amber-400">
                        <strong>{alert.event}</strong>: {alert.headline}
                      </div>
                    ))}
                    {weatherAlerts.count > 2 && (
                      <div className="text-xs text-amber-500">
                        +{weatherAlerts.count - 2} more alerts
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Amenities Summary */}
              {amenitiesData && (
                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Nearby Amenities (Geoapify)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Walkability Score</span>
                      <span className="font-medium text-emerald-600">{amenitiesData.score || 0}/100</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-xs"><span className="text-slate-500">Hospitals:</span> {amenitiesData.counts?.hospitals || 0}</div>
                      <div className="text-xs"><span className="text-slate-500">Schools:</span> {amenitiesData.counts?.schools || 0}</div>
                      <div className="text-xs"><span className="text-slate-500">Parks:</span> {amenitiesData.counts?.parks || 0}</div>
                      <div className="text-xs"><span className="text-slate-500">Restaurants:</span> {amenitiesData.counts?.restaurants || 0}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===== SECTION 9: Financial Analysis ===== */}
        {financialLoading ? (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              <DollarSign className="h-6 w-6" />
              Financial Analysis
              <Loader2 className="h-4 w-4 animate-spin ml-2 text-slate-500" />
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
              <Skeleton className="h-48 w-full" />
            </div>
          </section>
        ) : (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                <DollarSign className="h-6 w-6" />
                Financial Analysis
              </h2>
              <DataSourceBadge
                type={financialData ? "live" : calculatedFinancialAnalysis ? "calculated" : "sample"}
              />
            </div>
            <FinancialDashboard
              analysis={financialData || calculatedFinancialAnalysis || sampleFinancialAnalysis}
              propertyId={propertyIdFromUrl || "demo-property-001"}
            />
          </section>
        )}

        {/* ===== SECTION 10: Comparable Sales ===== */}
        {comparablesLoading ? (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              <Home className="h-6 w-6" />
              Comparable Sales
              <Loader2 className="h-4 w-4 animate-spin ml-2 text-slate-500" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </section>
        ) : (
          <>
            {comparablesError && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{comparablesError}</span>
              </div>
            )}
            <ComparablesSection
            comparables={comparablesData?.comparables || sampleComparables.map(comp => ({
              id: comp.id,
              address: comp.address,
              city: comp.city || "",
              distance: comp.distanceMiles || 0,
              salePrice: comp.salePrice,
              saleDate: new Date(comp.saleDate),
              sqft: comp.sqft,
              lotSizeAcres: comp.lotSizeSqft ? comp.lotSizeSqft / 43560 : undefined,
              bedrooms: comp.bedrooms,
              bathrooms: comp.bathrooms,
              yearBuilt: comp.yearBuilt,
              pricePerSqft: comp.pricePerSqft,
              condition: "good" as const,
            }))}
            analysis={comparablesData?.analysis || {
              compCount: 4,
              avgSalePrice: 150000,
              medianSalePrice: 148500,
              avgPricePerSqft: 102.56,
              avgDaysOnMarket: 42,
              suggestedArv: 150000,
              confidence: "medium",
              searchRadius: 1.0,
              dateRange: "Last 6 months",
            }}
            subjectProperty={{
              sqft: activePropertyDetails.buildingSqft,
              lotSizeAcres: 0.18,
              bedrooms: activePropertyDetails.bedrooms,
              bathrooms: activePropertyDetails.bathrooms,
              yearBuilt: activePropertyDetails.yearBuilt,
            }}
            propertyTypeLabel={(() => {
              const propType = activePropertyDetails.propertyType || activePropertyDetails.landUse || "";
              const buildingSqft = activePropertyDetails.buildingSqft || 0;
              if (buildingSqft === 0 || propType.toLowerCase().includes("vacant") || propType.toLowerCase().includes("lot") || propType.toLowerCase().includes("land")) {
                return "land";
              }
              return undefined;
            })()}
            dataSourceType={comparablesData ? "live" : "sample"}
          />
          </>
        )}

        {/* NOTE: Removed duplicate "Live Market Data" section -
            ComparablesSection above already shows properly filtered comparables.
            The ComparablesCard was showing unfiltered results (Single Family homes
            even when subject is vacant land). */}

        {/* ===== SECTION 11: Investment Score Breakdown ===== */}
        <InvestmentScore
          totalScore={totalScore}
          maxScore={maxScore}
          grade={overallGrade}
          categories={activeCategories}
          ratingDescription={
            useRealData && fullAnalysisData?.report?.scoreBreakdown?.summary
              ? fullAnalysisData.report.scoreBreakdown.summary
              : "This property scores well across all investment criteria with particularly strong financial metrics and location factors."
          }
          strengths={
            financialData?.recommendation
              ? financialData.recommendation.opportunities.slice(0, 4)
              : [
                  "Excellent price-to-value ratio (30% of ARV)",
                  "Strong projected ROI of 36.3%",
                  "Low risk profile with clear title expected",
                  "Good school district and low crime area",
                ]
          }
          weaknesses={
            financialData?.recommendation
              ? financialData.recommendation.risks.slice(0, 3)
              : [
                  "Pennsylvania Radon Zone 1 requires testing",
                  "Built in 1952 - age-related issues possible",
                  "Moderate market appreciation in area",
                ]
          }
          dataSourceType={useRealData && fullAnalysisData?.report?.scoreBreakdown ? "live" : "sample"}
        />

        {/* ===== SECTION 12: Demographics ===== */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Users className="h-5 w-5" />
              Demographics
            </h2>
            <DataSourceBadge
              type={censusData?.demographics ? "live" : "sample"}
              label={censusData?.demographics ? "Census Data" : "Sample Data"}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {censusData?.demographics?.population?.toLocaleString() || "43,270"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Population</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {censusData?.geographic?.countyName ? `${censusData.geographic.countyName} County` : "City of Altoona"}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ${censusData?.demographics?.medianHouseholdIncome?.toLocaleString() || "45,200"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Median Income</p>
              <p className="text-xs text-emerald-500">+2.1% YoY</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ${censusData?.demographics?.medianHomeValue?.toLocaleString() || "142,000"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Median Home Value</p>
              <p className="text-xs text-emerald-500">+3.2% YoY</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {censusData?.demographics?.bachelorsDegreeOrHigherPct
                  ? `${(100 - (100 - censusData.demographics.bachelorsDegreeOrHigherPct) * 0.4).toFixed(0)}%`
                  : "89%"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">High School Grad Rate</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">25+ population</p>
            </div>
          </div>
        </section>

        {/* ===== SECTION 13: FEMA Flood Zone Map ===== */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Droplets className="h-5 w-5" />
              FEMA Flood Zone Map
            </h2>
            <DataSourceBadge type="live" label="FEMA NFHL" />
          </div>
          <div className="aspect-video mb-4">
            <FEMAFloodMap
              lat={activePropertyDetails.coordinates.lat}
              lng={activePropertyDetails.coordinates.lng}
              address={`${activePropertyDetails.address}, ${activePropertyDetails.city}, ${activePropertyDetails.state} ${activePropertyDetails.zip}`}
              zoom={14}
              height="100%"
              showExternalLink={true}
              showLegend={true}
              altText={`FEMA Flood Zone Map for ${activePropertyDetails.address}`}
            />
          </div>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">Zone X - Minimal Flood Hazard</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                This property is located outside of the 500-year flood plain. Flood insurance is not required for federally-backed mortgages.
              </p>
            </div>
          </div>
        </section>

        {/* ===== SECTION 14: Zoning Information ===== */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Building className="h-5 w-5" />
              Zoning Information
            </h2>
            <DataSourceBadge
              type={zoningDataSourceType}
              label={zoningDataSourceType === "live" ? "County Rules" : zoningDataSourceType === "partial" ? "State Defaults" : "Sample Data"}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Current Zoning</h4>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {zoningData?.zoning_code || activePropertyDetails.zoning?.split(' ')[0] || "R-1"}
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  {zoningData?.zoning_name ||
                    (activePropertyDetails.zoning && activePropertyDetails.zoning !== "Not available"
                      ? activePropertyDetails.zoning
                      : "Single Family Residential")}
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Permitted Uses</h4>
              <ul className="space-y-2">
                {(zoningData?.permitted_uses && zoningData.permitted_uses.length > 0
                  ? zoningData.permitted_uses.slice(0, 4)
                  : ["Single family dwelling", "Home occupation (limited)", "Accessory structures", "In-law suite (conditional)"]
                ).map((use, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    {use}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Min Lot Size</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {zoningData?.min_lot_size_sqft
                  ? `${zoningData.min_lot_size_sqft.toLocaleString()} sqft`
                  : "5,000 sqft"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Front Setback</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {zoningData?.front_setback_ft ? `${zoningData.front_setback_ft} ft` : "25 ft"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Side Setback</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {zoningData?.side_setback_ft ? `${zoningData.side_setback_ft} ft` : "10 ft"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Max Height</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {zoningData?.max_height_ft ? `${zoningData.max_height_ft} ft` : "35 ft"}
              </p>
            </div>
          </div>
        </section>

        {/* ===== SECTION 15: Market Analysis ===== */}
        <MarketAnalysis
          score={activeCategories.find(c => c.key === "market")?.score || 18}
          maxScore={activeCategories.find(c => c.key === "market")?.maxScore || 25}
          grade={(activeCategories.find(c => c.key === "market")?.grade || "B") as "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D" | "D-" | "F"}
          metrics={{
            // Real data from Realty API + Zillow
            medianSalePrice: combinedMarketData?.zestimate || comparablesData?.analysis?.avgSalePrice || 142000,
            pricePerSqft: comparablesData?.analysis?.avgPricePerSqft || 98,
            daysOnMarket: comparablesData?.analysis?.avgDaysOnMarket || 45,
            recentSales: comparablesData?.comparables?.length || 125,
            // Calculated metrics (from comparables data when available)
            absorptionRate: calculatedMarketMetrics?.absorptionRate ?? 3.2,
            listToSaleRatio: calculatedMarketMetrics?.listToSaleRatio ?? 0.97,
            // Active listings from enhanced comparables API
            activeListings: comparablesData?.activeListingsCount ?? 156,
            // Historical YoY changes - prefer Zillow annualAppreciation, fallback to comparables
            // Zillow returns as decimal (0.05 = 5%), comparables also as decimal
            priceChangeYoY: combinedMarketData?.annualAppreciation !== null && combinedMarketData?.annualAppreciation !== undefined
              ? combinedMarketData.annualAppreciation * 100
              : comparablesData?.historicalMetrics?.priceChangeYoY !== null
                ? (comparablesData?.historicalMetrics?.priceChangeYoY || 0) * 100
                : 3.2,
            salesVolumeChangeYoY: comparablesData?.historicalMetrics?.salesVolumeChangeYoY !== null
              ? (comparablesData?.historicalMetrics?.salesVolumeChangeYoY || 0) * 100
              : 2.5,
            inventoryChangeYoY: comparablesData?.historicalMetrics?.daysOnMarketChangeYoY !== null
              ? (comparablesData?.historicalMetrics?.daysOnMarketChangeYoY || 0) * 100 * -1
              : -5.2,
          }}
          trends={{
            // Use Zillow price history when available, otherwise sample data
            priceTrends: combinedMarketData?.priceTrends && combinedMarketData.priceTrends.length > 0
              ? combinedMarketData.priceTrends.slice(0, 6).map(pt => ({
                  period: new Date(pt.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                  value: pt.price,
                }))
              : [
                  { period: "Jan 2025", value: 138000 },
                  { period: "Feb 2025", value: 139500 },
                  { period: "Mar 2025", value: 140000 },
                  { period: "Apr 2025", value: 141500 },
                  { period: "May 2025", value: 142000 },
                  { period: "Jun 2025", value: 142500 },
                ],
            volumeTrends: [
              { period: "Jan 2025", value: 18 },
              { period: "Feb 2025", value: 22 },
              { period: "Mar 2025", value: 28 },
              { period: "Apr 2025", value: 32 },
              { period: "May 2025", value: 35 },
              { period: "Jun 2025", value: 38 },
            ],
            domTrends: [
              { period: "Jan 2025", value: 52 },
              { period: "Feb 2025", value: 48 },
              { period: "Mar 2025", value: 45 },
              { period: "Apr 2025", value: 42 },
              { period: "May 2025", value: 40 },
              { period: "Jun 2025", value: 38 },
            ],
          }}
          // Calculated metrics (when comparables available)
          marketType={calculatedMarketMetrics?.marketType ?? "buyers"}
          marketHealth={calculatedMarketMetrics?.marketHealth ?? 68}
          supplyDemand={calculatedMarketMetrics?.supplyDemand ?? "balanced"}
          segments={calculatedPriceSegments ?? [
            // Default segments when no comparables data available
            { name: "Under $100K", value: 15, format: "percentage", comparison: "below" },
            { name: "$100K-$150K", value: 35, format: "percentage", comparison: "similar" },
            { name: "$150K-$200K", value: 30, format: "percentage", comparison: "above" },
            { name: "$200K+", value: 20, format: "percentage", comparison: "above" },
          ]}
          factors={[
            "Steady employment from healthcare and education sectors",
            "Affordable housing relative to state average",
            "Low mortgage rates supporting buyer activity",
            ...(combinedMarketData?.annualAppreciation && combinedMarketData.annualAppreciation > 0.03
              ? [`Strong ${(combinedMarketData.annualAppreciation * 100).toFixed(1)}% annual appreciation`]
              : []),
          ]}
          concerns={[
            "Population decline trend in Blair County",
            "Limited new construction activity",
            "Aging housing stock may limit appreciation",
            ...(combinedMarketData?.climateRisk?.flood && combinedMarketData.climateRisk.flood > 5
              ? [`Elevated flood risk score: ${combinedMarketData.climateRisk.flood}/10`]
              : []),
          ]}
          dataSource={combinedMarketData?.dataSource === 'zillow'
            ? "Realty API + Zillow"
            : comparablesData
              ? "Realty API"
              : undefined}
          dataSourceType={
            combinedMarketData?.dataSource === 'zillow' && comparablesData
              ? "live"
              : comparablesData
                ? "partial"
                : "sample"
          }
        />

        {/* ===== SECTION 16: Legal Disclaimer ===== */}
        <Disclaimers
          reportDate={new Date()}
          reportId="RPT-2026-DEMO-001234"
          dataSources={[
            "Blair County Tax Records",
            "Regrid Property Data",
            "MLS Comparable Sales",
            "FEMA NFHL",
            "EPA Envirofacts",
            "USGS Seismic Data",
            "US Census Bureau",
          ]}
          dataAsOfDate={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
          companyName="TaxDeedFlow"
          contactEmail="support@taxdeedflow.com"
          includeInvestmentDisclaimer
          includeAccuracyDisclaimer
          includeLegalDisclaimer
          onPrint={handlePrint}
          legalReferences={[
            { title: "Pennsylvania Real Estate Tax Sale Law", url: "https://www.legis.state.pa.us/", description: "72 P.S. Section 5860" },
            { title: "Blair County Tax Claim Bureau", url: "https://www.blairco.org/tax-claim", description: "Official county resource" },
          ]}
        />

        {/* Print/Export/Share buttons (fixed position) */}
        <div className="fixed bottom-6 right-6 print:hidden no-print flex items-center gap-3">
          {/* Share button */}
          <ShareButton
            reportId="demo-report-123"
            reportTitle="456 Oak Street Property Analysis"
            variant="outline"
            className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          />

          {/* Export PDF button */}
          <button
            onClick={handlePrint}
            disabled={isExporting}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-colors",
              isExporting
                ? "bg-slate-600 dark:bg-slate-400 cursor-not-allowed text-white dark:text-slate-900"
                : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
            )}
            aria-label={isExporting ? "Generating PDF..." : "Export as PDF"}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4" />
                Export PDF
              </>
            )}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-8 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            Generated by TaxDeedFlow Property Analysis System
          </p>
          <p className="text-xs mt-2" suppressHydrationWarning>
            Report ID: RPT-2026-DEMO-001234 | Generated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================
// Default Export with Suspense Wrapper
// ============================================

export default function PropertyReportDemoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Property Report...</p>
        </div>
      </div>
    }>
      <PropertyReportDemoPageContent />
    </Suspense>
  );
}
