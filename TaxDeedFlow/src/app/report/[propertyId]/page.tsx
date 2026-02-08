"use client";

/**
 * Property Analysis Report - Dynamic Route
 *
 * Based on the demo page structure, this fetches real property data from Supabase
 * and generates a complete analysis report using the full-analysis API.
 * Falls back to sample data where real data isn't available.
 *
 * @route /report/[propertyId]
 * @module app/report/[propertyId]/page
 */

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
  ArrowLeft,
  RefreshCw,
  Image,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportReportToPDF, generateReportFilename } from "@/lib/pdf-export";

// Import report components
import { InvestmentScore } from "@/components/report/sections/InvestmentScore";
import { LocationAnalysis } from "@/components/report/sections/LocationAnalysis";
import { MarketAnalysis } from "@/components/report/sections/MarketAnalysis";
import { Disclaimers } from "@/components/report/sections/Disclaimers";
import { ComparablesSection } from "@/components/report/sections/ComparablesSection";
import { PropertySummary } from "@/components/report/sections/PropertySummary";
import { TitleResearch } from "@/components/report/sections/TitleResearch";
import { RiskOverviewCard } from "@/components/report/risk/RiskOverviewCard";
import { InsuranceEstimateCard } from "@/components/report/risk/InsuranceEstimateCard";
import { FinancialDashboard } from "@/components/financial/FinancialDashboard";
import { SatelliteMap } from "@/components/report/maps/SatelliteMap";
import { GoogleStreetViewStatic } from "@/components/report/maps/GoogleStreetViewStatic";
import { GoogleMapStatic } from "@/components/report/maps/GoogleMapStatic";
import { FEMAFloodMap } from "@/components/report/maps/FEMAFloodMap";
import { ShareButton } from "@/components/report/ShareButton";
import { ComparablesCard } from "@/components/report/ComparablesCard";
import { VisualValidation } from "@/components/report/sections/VisualValidation";

// Import types
import type { Grade } from "@/types/report";
import type { CategoryScore } from "@/components/report/sections/InvestmentScore";
import type { RiskAssessment, InsuranceEstimates } from "@/types/risk-analysis";
import type { FinancialAnalysis, ComparableSale } from "@/lib/analysis/financial/types";
import type { ElevationAnalysis } from "@/lib/api/services/elevation-service";
import type { ComparableProperty, ComparablesAnalysis } from "@/components/report/sections/ComparablesSection";
import type { MarketMetrics, MarketTrends, MarketSegment } from "@/components/report/sections/MarketAnalysis";
import type {
  TitleResearchSummary,
  LienRecord,
  OwnershipRecord,
  TitleIssue,
} from "@/components/report/sections/TitleResearch";
import type { RiskLevel } from "@/types/title";

// ============================================
// Property Type Labels (Regrid codes)
// ============================================
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  // PA county assessment codes
  "R": "Residential",
  "R1": "Single Family",
  "R2": "Multi-Family",
  "R3": "Apartment",
  "RA": "Residential Apartment",
  "RO": "Residential Other",
  "RT": "Townhouse",
  "T": "Trailer/MH Lot",
  "C": "Condo",
  "C1": "Commercial",
  "CL": "Commercial Land",
  "CS": "Commercial Service",
  "CG": "Commercial Garage",
  "CH": "Commercial Hotel",
  "CO": "Commercial",
  "I": "Industrial",
  "L1": "Vacant Lot",
  "L2": "Agricultural",
  "L3": "Vacant Land",
  "LO": "Land Other",
  "M": "Mobile Home",
  "V": "Vacant",
  // Full-text labels (from other data sources)
  "Single Family Residential": "Single Family",
  "Single Family": "Single Family",
  "Multi Family": "Multi-Family",
  "Townhouse": "Townhouse",
  "Condo": "Condo",
  "Commercial": "Commercial",
  "Industrial": "Industrial",
  "Vacant Land": "Vacant Land",
  "Agricultural": "Agricultural",
  "Mobile Home": "Mobile Home",
};

function getPropertyTypeLabel(code: string | undefined | null): string | null {
  if (!code) return null;
  return PROPERTY_TYPE_LABELS[code] || code;
}

// ============================================
// Types
// ============================================

interface PropertyData {
  id: string;
  parcel_id: string;
  property_address: string;
  city?: string;
  state?: string;
  zip?: string;
  county_name?: string;
  coordinates?: { lat: number; lng: number };
  assessed_value?: number;
  market_value?: number;
  total_due?: number;
  tax_amount?: number;
  lot_size_sqft?: number;
  lot_size_acres?: number;
  building_sqft?: number;
  year_built?: number;
  bedrooms?: number;
  bathrooms?: number;
  property_type?: string;
  zoning?: string;
  land_use?: string;
  sale_type?: string;
  sale_date?: string;
  auction_status?: string;
  owner_name?: string;
  screenshot_url?: string;
  is_vacant_lot?: boolean;
  is_likely_mobile_home?: boolean;
  assessed_improvement_value?: number | null;
  regrid_scrape_method?: string;
  regrid_data_quality?: number;
}

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
    hospitals: number;
    schools: number;
    parks: number;
    restaurants: number;
    groceryStores: number;
    publicTransit: number;
    total: number;
    walkabilityScore: number;
    walkScore?: number;
    transitScore?: number;
    bikeScore?: number;
    schoolRating?: number;
    nearest?: Array<{ name: string; type: string; distance: number }>;
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
      stateFips: string;
      countyFips: string;
      fips: string;
      tract: string;
      blockGroup: string;
      block: string;
      stateName: string;
      countyName: string;
      congressionalDistrict?: string;
      schoolDistrict?: string;
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
  titleReport?: {
    summary: {
      searchCompleted: boolean;
      searchDate?: string;
      searchProvider?: string;
      totalLiens: number;
      totalLienAmount: number;
      survivingLiensCount: number;
      survivingLiensAmount: number;
      issuesFound: number;
      overallRisk: RiskLevel;
      titleInsuranceAvailable: boolean;
      titleInsuranceCost?: number;
      estimatedClearingCost?: number;
    };
    liens?: Array<{
      id: string;
      type: string;
      holder: string;
      originalAmount: number;
      currentBalance?: number;
      recordingDate: string;
      recordingRef?: string;
      position?: number;
      survivesSale: boolean;
      status: 'active' | 'satisfied' | 'released' | 'unknown';
      notes?: string;
    }>;
    ownershipHistory?: Array<{
      ownerName: string;
      acquiredDate: string;
      salePrice?: number;
      documentRef?: string;
      deedType?: string;
    }>;
    issues?: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      estimatedCost?: number;
      resolution?: string;
      blocksPurchase: boolean;
    }>;
    recommendations?: string[];
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
// Sample Data Definitions (Fallbacks)
// ============================================

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
    dataSource: { name: "FEMA NFHL", type: "api", reliability: "high" },
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
    dataSource: { name: "USGS", type: "api", reliability: "high" },
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
    dataSource: { name: "NASA FIRMS", type: "api", reliability: "high" },
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
    dataSource: { name: "NOAA", type: "api", reliability: "high" },
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
    dataSource: { name: "State Geological Survey", type: "database", reliability: "medium" },
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
    dataSource: { name: "EPA Envirofacts", type: "api", reliability: "high" },
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
    dataSource: { name: "EPA", type: "database", reliability: "high" },
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
    dataSource: { name: "USGS", type: "calculated", reliability: "medium" },
    confidence: 70,
  },
  drought: null,
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
    drought: 0.0,
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

export default function PropertyReportPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.propertyId as string;

  // State for property data from Supabase
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);
  const [propertyError, setPropertyError] = useState<string | null>(null);

  // State for PDF export loading
  const [isExporting, setIsExporting] = useState(false);

  // State for API data
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // State for Regrid enrichment action
  const [isEnriching, setIsEnriching] = useState(false);

  // State for real comparables from Realty API
  const [realComparables, setRealComparables] = useState<ComparableSale[] | null>(null);
  const [comparablesStats, setComparablesStats] = useState<{
    count: number;
    avg_sold_price: number;
    median_sold_price: number;
    avg_price_per_sqft: number;
  } | null>(null);

  // LFB comp analysis ARV (from ComparablesCard callback)
  const [lfbArv, setLfbArv] = useState<number | null>(null);

  // Combined market data from /api/market (Realty + Zillow APIs)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [combinedMarketData, setCombinedMarketData] = useState<any>(null);

  const handleLfbAnalysisComplete = useCallback((data: {
    arv: number | null;
    maoConservative: number | null;
    maoAggressive: number | null;
    confidenceLevel: string;
    qualifiedCount: number;
    extendedCount: number;
    market?: Record<string, unknown>;
  }) => {
    if (data.arv && data.arv > 0) {
      setLfbArv(data.arv);
    }
  }, []);

  // Fetch property from Supabase (extracted as useCallback so handleEnrichProperty can re-invoke)
  const fetchProperty = useCallback(async () => {
    if (!propertyId) return;

    setIsLoadingProperty(true);
    setPropertyError(null);

    try {
      const response = await fetch(`/api/properties/${propertyId}`);
      if (!response.ok) {
        throw new Error(`Property not found: ${response.status}`);
      }
      const json = await response.json();
      // Map API response to PropertyData interface
      // The API returns { data: { ... }, source: "database" }
      const apiData = json.data || json;
      const mapped: PropertyData = {
        id: apiData.id,
        parcel_id: apiData.parcelId || apiData.parcel_id,
        property_address: apiData.address || apiData.property_address,
        city: apiData.city || '',
        state: apiData.state || 'PA',
        zip: apiData.zipCode || apiData.zip_code || '',
        county_name: apiData.county || apiData.county_name,
        coordinates: apiData.latitude && apiData.longitude
          ? { lat: apiData.latitude, lng: apiData.longitude }
          : apiData.coordinates,
        assessed_value: apiData.assessedValue || apiData.assessed_value,
        market_value: apiData.regridData?.marketValue || apiData.market_value,
        total_due: apiData.totalDue || apiData.total_due,
        tax_amount: apiData.taxAmount || apiData.tax_amount,
        lot_size_sqft: apiData.regridData?.lotSizeSqFt || apiData.lot_size_sqft,
        lot_size_acres: apiData.regridData?.lotSizeAcres || (typeof apiData.lotSize === 'string' ? parseFloat(apiData.lotSize.replace(' acres', '')) : apiData.lotSize) || apiData.lot_size_acres,
        building_sqft: apiData.squareFeet || apiData.regridData?.building_sqft || apiData.building_sqft,
        year_built: apiData.yearBuilt || apiData.regridData?.year_built || apiData.year_built,
        bedrooms: apiData.bedrooms || apiData.regridData?.bedrooms,
        bathrooms: apiData.bathrooms || apiData.regridData?.bathrooms,
        property_type: apiData.propertyType || apiData.regridData?.propertyClass || apiData.property_type,
        zoning: apiData.regridData?.zoning || apiData.zoning,
        land_use: apiData.regridData?.land_use || apiData.land_use,
        sale_type: apiData.saleType || apiData.sale_type,
        sale_date: apiData.saleDate || apiData.sale_date,
        auction_status: apiData.status || apiData.auction_status,
        owner_name: apiData.ownerName || apiData.regridData?.ownerName || apiData.owner_name,
        screenshot_url: apiData.regridData?.screenshotUrl || apiData.images?.[0]?.url,
        is_vacant_lot: apiData.isVacantLot || false,
        is_likely_mobile_home: apiData.isLikelyMobileHome || false,
        assessed_improvement_value: apiData.regridData?.assessedImprovementValue ?? null,
      };
      setProperty(mapped);
    } catch (error) {
      console.error('Failed to fetch property:', error);
      setPropertyError(error instanceof Error ? error.message : 'Failed to fetch property');
    } finally {
      setIsLoadingProperty(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  /**
   * Triggers the n8n Regrid scraper webhook to enrich this property with
   * coordinates, lot size, year built, and other Regrid data fields.
   * On success, re-fetches the property which cascades to refresh report,
   * comparables, and market data via the existing useEffect chain.
   */
  const handleEnrichProperty = useCallback(async () => {
    if (!property || isEnriching) return;

    setIsEnriching(true);
    toast.info("Starting Regrid enrichment...", {
      description: "This may take 30-60 seconds (browser automation on VPS).",
      duration: 10000,
    });

    try {
      const countySlug = property.county_name?.toLowerCase().replace(/\s+/g, '-') || '';
      const stateSlug = property.state?.toLowerCase() || 'pa';

      const response = await fetch("/api/scrape/regrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: property.id,
          parcel_id: property.parcel_id,
          county: countySlug,
          state: stateSlug,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const extractedFields = data.regrid_data
          ? Object.keys(data.regrid_data).filter((k: string) => data.regrid_data[k] !== null).length
          : 0;

        toast.success("Property enriched successfully!", {
          description: `Extracted ${extractedFields} fields from Regrid. Refreshing report...`,
          duration: 4000,
        });

        // Re-fetch property -- triggers cascade: report, comparables, market re-fetch
        await fetchProperty();
      } else {
        toast.error("Enrichment failed", {
          description: data.error || "The Regrid scraper could not extract data for this property.",
          duration: 6000,
        });
      }
    } catch (error) {
      console.error("Error enriching property:", error);
      toast.error("Enrichment failed", {
        description: "Network error. Please try again.",
        duration: 6000,
      });
    } finally {
      setIsEnriching(false);
    }
  }, [property, isEnriching, fetchProperty]);

  // Fetch report data from API
  const fetchReportData = useCallback(async () => {
    if (!property) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const address = property.property_address
        ? `${property.property_address}, ${property.city || ''}, ${property.state || 'PA'} ${property.zip || ''}`
        : '';

      const response = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          address,
          coordinates: property.coordinates,
          state: property.state || 'PA',
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
  }, [property]);

  // Auto-fetch report data when property loads
  useEffect(() => {
    if (property) {
      fetchReportData();
    }
  }, [property, fetchReportData]);

  // Fetch real comparables from Realty API
  useEffect(() => {
    async function fetchComparables() {
      if (!property?.zip && !property?.coordinates) return;

      try {
        const params = new URLSearchParams();
        if (property.zip) {
          params.set('postal_code', property.zip);
        } else if (property.coordinates) {
          params.set('lat', property.coordinates.lat.toString());
          params.set('lng', property.coordinates.lng.toString());
        }
        params.set('limit', '10');

        const response = await fetch(`/api/comparables?${params.toString()}`);
        if (!response.ok) return;

        const json = await response.json();
        if (json.success && json.data?.comparables) {
          // Transform API comparables to ComparableSale format
          const transformed: ComparableSale[] = json.data.comparables.map((comp: {
            property_id: string;
            address: { line: string; city: string; state_code: string; postal_code: string };
            price: { sold_price?: number; list_price?: number; price_per_sqft?: number };
            description: { beds?: number; baths?: number; sqft?: number; lot_sqft?: number; year_built?: number; type?: string };
            sold_date?: string;
            distance_miles?: number;
          }, index: number) => ({
            id: comp.property_id || `comp-${index}`,
            address: comp.address?.line || 'Unknown Address',
            city: comp.address?.city || '',
            state: comp.address?.state_code || 'PA',
            zip: comp.address?.postal_code || '',
            salePrice: comp.price?.sold_price || comp.price?.list_price || 0,
            saleDate: comp.sold_date || new Date().toISOString(),
            sqft: comp.description?.sqft || 0,
            lotSizeSqft: comp.description?.lot_sqft || 0,
            bedrooms: comp.description?.beds || 0,
            bathrooms: comp.description?.baths || 0,
            yearBuilt: comp.description?.year_built || 0,
            propertyType: comp.description?.type || 'Single Family',
            pricePerSqft: comp.price?.price_per_sqft || (comp.description?.sqft && comp.price?.sold_price ? Math.round(comp.price.sold_price / comp.description.sqft) : 0),
            distanceMiles: comp.distance_miles || 0,
            similarityScore: 80 + Math.floor(Math.random() * 15), // Placeholder - real similarity would need more logic
            source: 'Realty API',
          }));

          setRealComparables(transformed);

          // Store stats
          if (json.data.statistics) {
            setComparablesStats({
              count: json.data.statistics.count,
              avg_sold_price: json.data.statistics.avg_sold_price,
              median_sold_price: json.data.statistics.median_sold_price,
              avg_price_per_sqft: json.data.statistics.avg_price_per_sqft,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch comparables:', error);
        // Keep using sample data on error
      }
    }

    if (property) {
      fetchComparables();
    }
  }, [property]);

  // Fetch combined market data from /api/market (uses BOTH Realty + Zillow APIs)
  useEffect(() => {
    async function fetchMarketData() {
      if (!property?.zip && !property?.coordinates) return;

      try {
        const params = new URLSearchParams({ mode: 'area' });
        if (property.coordinates) {
          params.set('lat', property.coordinates.lat.toString());
          params.set('lng', property.coordinates.lng.toString());
        }
        if (property.zip) {
          params.set('location', property.zip);
        }
        params.set('radius_miles', '5');
        params.set('limit', '20');

        const response = await fetch(`/api/market?${params.toString()}`);
        if (!response.ok) return;

        const json = await response.json();
        if (json.success) {
          setCombinedMarketData(json.data);
        }
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      }
    }

    if (property) {
      fetchMarketData();
    }
  }, [property]);

  // Property details (from Supabase or fallback)
  const propertyDetails = property ? {
    parcelId: property.parcel_id || "Unknown",
    address: property.property_address || "Unknown Address",
    city: property.city || "Unknown",
    state: property.state || "PA",
    zip: property.zip || "",
    county: property.county_name || "Unknown",
    propertyType: property.is_vacant_lot
      ? "Vacant Lot"
      : property.is_likely_mobile_home
        ? "Mobile Home"
        : (getPropertyTypeLabel(property.property_type) || "Unknown"),
    lotSize: property.lot_size_acres
      ? `${property.lot_size_acres} acres${property.lot_size_sqft ? ` (${property.lot_size_sqft.toLocaleString()} sqft)` : ''}`
      : "Unknown",
    buildingSqft: property.building_sqft || 0,
    yearBuilt: property.year_built || 0,
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    stories: 0,
    zoning: property.zoning || "",
    assessedValue: property.assessed_value || 0,
    taxAmount: property.tax_amount || 0,
    ownerName: property.owner_name || "Unknown",
    ownerAddress: property.property_address || "",
    legalDescription: "",
    imageUrl: property.screenshot_url || "/placeholder-property.jpg",
    coordinates: property.coordinates || { lat: 0, lng: 0 },
  } : {
    parcelId: "Loading...",
    address: "Loading...",
    city: "",
    state: "PA",
    zip: "",
    county: "",
    propertyType: "Unknown",
    lotSize: "",
    buildingSqft: 0,
    yearBuilt: 0,
    bedrooms: 0,
    bathrooms: 0,
    stories: 0,
    zoning: "",
    assessedValue: 0,
    taxAmount: 0,
    ownerName: "",
    ownerAddress: "",
    legalDescription: "",
    imageUrl: "/placeholder-property.jpg",
    coordinates: { lat: 0, lng: 0 },
  };

  // Score calculation is done in computedCategories/computedTotalScore below

  // Detect placeholder Regrid data (scraper timed out, data is low quality)
  const isPlaceholderRegrid = property?.regrid_scrape_method === 'placeholder'
    || (property?.regrid_data_quality != null && property.regrid_data_quality < 0.5);

  // Property address for filename generation
  const fullAddress = `${propertyDetails.address}, ${propertyDetails.city}, ${propertyDetails.state} ${propertyDetails.zip}`;
  const reportId = `RPT-${propertyId?.substring(0, 8) || 'UNKNOWN'}`;

  // Merge API data with sample data where available
  const elevationData = apiData?.data?.elevation as ElevationAnalysis | undefined;
  const climateData = apiData?.data?.climate;
  const seismicData = apiData?.data?.seismicHazard;
  const wildfireData = apiData?.data?.wildfireData;
  const environmentalData = apiData?.data?.environmentalSites;
  const amenitiesData = apiData?.data?.amenities;
  const broadbandData = apiData?.data?.broadband;
  const censusData = apiData?.data?.census;
  const aiSummary = apiData?.data?.aiSummary;
  const weatherAlerts = apiData?.data?.weatherAlerts;

  /**
   * Computed risk assessment using real API data with fallbacks to sample data
   */
  const computedRiskAssessment: RiskAssessment = useMemo(() => {
    // Helper to determine risk level from seismic data
    const getSeismicRiskLevel = (pga: number | undefined): "very_low" | "low" | "moderate" | "high" | "very_high" => {
      if (!pga) return "very_low";
      if (pga < 0.1) return "very_low";
      if (pga < 0.2) return "low";
      if (pga < 0.4) return "moderate";
      if (pga < 0.6) return "high";
      return "very_high";
    };

    // Helper to determine wildfire risk level from fire data
    const getWildfireRiskLevel = (fireCount: number | undefined, nearestMiles: number | null | undefined): "low" | "moderate" | "high" => {
      if (!fireCount || fireCount === 0) return "low";
      if (nearestMiles && nearestMiles < 10) return "high";
      if (nearestMiles && nearestMiles < 25) return "moderate";
      if (fireCount > 5) return "moderate";
      return "low";
    };

    // Helper to determine environmental risk level
    const getEnvironmentalRiskLevel = (data: typeof environmentalData): "low" | "moderate" | "high" => {
      if (!data || !data.counts) return "low";
      const { superfund, brownfield, ust, total } = data.counts;
      if (superfund > 0) return "high";
      if (total > 10) return "moderate";
      if (brownfield > 2 || ust > 5) return "moderate";
      if (total > 0) return "low";
      return "low";
    };

    // Ensure we have a valid base earthquake object
    const baseEarthquake = {
      hazardLevel: "very_low" as const,
      pga: 0.05,
      spectralAcceleration02: 0.08,
      spectralAcceleration10: 0.03,
      distanceToFault: null,
      nearestFaultName: null,
      historicalQuakeCount: 0,
      maxHistoricalMagnitude: 0,
      seismicDesignCategory: "A",
      mitigationRecommendations: [],
      dataSource: { name: "USGS", type: "api" as const, reliability: "high" as const },
      confidence: 70,
    };

    // Calculate earthquake data from API
    const earthquakeData = seismicData ? {
      ...baseEarthquake,
      hazardLevel: getSeismicRiskLevel(seismicData.pga),
      pga: seismicData.pga || baseEarthquake.pga,
      dataSource: { name: "USGS", type: "api" as const, reliability: "high" as const },
      confidence: 90,
    } : baseEarthquake;

    // Base wildfire object for null safety
    const baseWildfire = {
      riskLevel: "low" as const,
      fireHistoryYears5: 0,
      fireHistoryYears10: 0,
      vegetationType: "deciduous",
      defensibleSpaceRating: "adequate",
      nearestFireStation: { distanceMiles: 3, responseTimeMinutes: 8 },
      activeFiresNearby: 0,
      distanceToNearestFire: null,
      fireSeasonRisk: "low",
      evacuationZone: null,
      mitigationRecommendations: [],
      dataSource: { name: "NASA FIRMS", type: "api" as const, reliability: "high" as const },
      confidence: 70,
    };

    // Calculate wildfire data from API
    const wildfireRisk = wildfireData ? {
      ...baseWildfire,
      riskLevel: getWildfireRiskLevel(wildfireData.fireCount, wildfireData.nearestFireMiles),
      activeFiresNearby: wildfireData.fireCount || 0,
      distanceToNearestFire: wildfireData.nearestFireMiles,
      dataSource: { name: "NASA FIRMS", type: "api" as const, reliability: "high" as const },
      confidence: 85,
    } : baseWildfire;

    // Base environmental object for null safety
    const baseEnvironmental = {
      riskLevel: "low" as const,
      superfundSitesNearby: 0,
      brownfieldSitesNearby: 0,
      ustSitesNearby: 0,
      triSitesNearby: 0,
      nearestSite: null,
      soilContamination: false,
      groundwaterContamination: false,
      airQualityIndex: 45,
      noiseLevel: "moderate",
      phaseIRecommended: false,
      mitigationRecommendations: [],
      dataSource: { name: "EPA Envirofacts", type: "api" as const, reliability: "medium" as const },
      confidence: 70,
    };

    // Calculate environmental data from API
    const environmentalRisk = environmentalData ? {
      ...baseEnvironmental,
      riskLevel: getEnvironmentalRiskLevel(environmentalData),
      superfundSitesNearby: environmentalData.counts?.superfund || 0,
      brownfieldSitesNearby: environmentalData.counts?.brownfield || 0,
      ustSitesNearby: environmentalData.counts?.ust || 0,
      triSitesNearby: environmentalData.counts?.tri || 0,
      nearestSite: environmentalData.nearestSite ? {
        name: environmentalData.nearestSite.name,
        epaId: `EPA-${environmentalData.nearestSite.type.toUpperCase()}`,
        type: environmentalData.nearestSite.type as "superfund" | "brownfield" | "ust" | "tri",
        status: "under_review" as const,
        distanceMiles: environmentalData.nearestSite.distanceMiles,
        direction: "N" as const,
        contaminants: [],
        groundwaterImpact: false,
      } : baseEnvironmental.nearestSite,
      phaseIRecommended: (environmentalData.counts?.superfund || 0) > 0,
      dataSource: { name: "EPA Envirofacts", type: "api" as const, reliability: "high" as const },
      confidence: 80,
    } : baseEnvironmental;

    // Base slope object for null safety
    const baseSlope = {
      slopeDegrees: 5,
      slopePercent: 8.7,
      aspect: "SW",
      stabilityRating: "stable" as const,
      erosionRisk: "low" as const,
      drainagePattern: "good",
      foundationConsiderations: [],
      dataSource: { name: "Open-Meteo", type: "api" as const, reliability: "medium" as const },
      confidence: 70,
    };

    // Update slope data from elevation API
    const slopeData = elevationData ? {
      ...baseSlope,
      // We have elevation data but not slope calculation - use sample slope with real elevation
      dataSource: { name: "Open-Meteo", type: "api" as const, reliability: "medium" as const },
      confidence: 70,
    } : baseSlope;

    // Base flood object for null safety
    const baseFlood = {
      zone: "X" as const,
      zoneDescription: "Area of Minimal Flood Hazard",
      riskLevel: "minimal" as const,
      insuranceRequired: false,
      annualPremiumEstimate: null,
      baseFloodElevation: null,
      propertyElevation: null,
      elevationDifference: null,
      floodwayStatus: "outside" as const,
      historicalFlooding: null,
      mitigationRecommendations: [],
      dataSource: { name: "FEMA NFHL", type: "api" as const, reliability: "high" as const },
      confidence: 75,
    };

    // Base radon object for null safety
    const baseRadon = {
      zoneClassification: 2 as const,
      avgIndoorLevel: 2.5,
      testingRecommended: true,
      mitigationRecommended: false,
      estimatedMitigationCost: null,
      stateRequirements: "disclosure_required",
      mitigationRecommendations: ["Test radon levels before purchase"],
      dataSource: { name: "EPA RadonZone", type: "database" as const, reliability: "medium" as const },
      confidence: 70,
    };

    // Base hurricane object for null safety
    const baseHurricane = {
      riskLevel: "minimal" as const,
      historicalLandfalls5yr: 0,
      historicalLandfalls25yr: 0,
      maxCategoryExperienced: null,
      stormSurgeZone: null,
      windZone: null,
      evacuationZone: null,
      shutterRequirement: false,
      buildingCodeYear: null,
      mitigationRecommendations: [],
      dataSource: { name: "NOAA", type: "api" as const, reliability: "high" as const },
      confidence: 70,
    };

    // Base sinkhole object for null safety
    const baseSinkhole = {
      riskLevel: "low" as const,
      geologyType: "other",
      knownSinkholesNearby: 0,
      distanceToNearest: null,
      groundwaterWithdrawal: "none",
      insuranceAvailable: true,
      mitigationRecommendations: [],
      dataSource: { name: "USGS", type: "database" as const, reliability: "medium" as const },
      confidence: 65,
    };

    // Calculate category scores from real data
    const calculateCategoryScore = (riskLevel: string): number => {
      switch (riskLevel) {
        case "minimal": return 5;
        case "very_low": return 8;
        case "low": return 15;
        case "moderate": return 45;
        case "high": return 70;
        case "very_high": return 90;
        default: return 30;
      }
    };

    const floodScore = 5; // Default low risk (no flood API yet)
    const sinkholeScore = 10; // Default low risk (no sinkhole API yet)
    const radonScore = 30; // Default moderate (PA is Zone 1-2 for radon)
    const slopeScore = elevationData ? 10 : 10; // Default low risk

    const categoryScores = [
      { category: "flood" as const, rawScore: floodScore, weight: 0.2, weightedScore: floodScore * 0.2, riskLevel: "minimal" as const, dataAvailability: "partial" as const },
      { category: "earthquake" as const, rawScore: calculateCategoryScore(earthquakeData.hazardLevel), weight: 0.1, weightedScore: calculateCategoryScore(earthquakeData.hazardLevel) * 0.1, riskLevel: earthquakeData.hazardLevel as "minimal" | "low" | "moderate" | "high", dataAvailability: seismicData ? "full" as const : "partial" as const },
      { category: "wildfire" as const, rawScore: calculateCategoryScore(wildfireRisk.riskLevel), weight: 0.15, weightedScore: calculateCategoryScore(wildfireRisk.riskLevel) * 0.15, riskLevel: wildfireRisk.riskLevel as "minimal" | "low" | "moderate" | "high", dataAvailability: wildfireData ? "full" as const : "partial" as const },
      { category: "hurricane" as const, rawScore: 0, weight: 0.15, weightedScore: 0, riskLevel: "minimal" as const, dataAvailability: "full" as const },
      { category: "sinkhole" as const, rawScore: sinkholeScore, weight: 0.1, weightedScore: sinkholeScore * 0.1, riskLevel: "low" as const, dataAvailability: "partial" as const },
      { category: "environmental" as const, rawScore: calculateCategoryScore(environmentalRisk.riskLevel), weight: 0.15, weightedScore: calculateCategoryScore(environmentalRisk.riskLevel) * 0.15, riskLevel: environmentalRisk.riskLevel as "minimal" | "low" | "moderate" | "high", dataAvailability: environmentalData ? "full" as const : "partial" as const },
      { category: "radon" as const, rawScore: radonScore, weight: 0.1, weightedScore: radonScore * 0.1, riskLevel: "moderate" as const, dataAvailability: "partial" as const },
      { category: "slope" as const, rawScore: slopeScore, weight: 0.05, weightedScore: slopeScore * 0.05, riskLevel: "low" as const, dataAvailability: elevationData ? "partial" as const : "partial" as const },
    ];

    // Calculate overall risk score from weighted category scores
    const totalWeightedScore = categoryScores.reduce((sum, cat) => sum + cat.weightedScore, 0);
    const overallRisk: "low" | "moderate" | "high" | "severe" =
      totalWeightedScore < 15 ? "low" :
      totalWeightedScore < 35 ? "moderate" :
      totalWeightedScore < 60 ? "high" : "severe";

    // Build recommendations from real data
    const recommendations: string[] = [];
    const warnings: string[] = [];
    const topRiskFactors: string[] = [];
    const positiveFactors: string[] = [];

    // Add recommendations based on real data
    if (earthquakeData.hazardLevel === "moderate" || earthquakeData.hazardLevel === "high") {
      recommendations.push("Consider earthquake insurance given seismic risk level");
      topRiskFactors.push(`Seismic risk: ${earthquakeData.hazardLevel} (PGA: ${earthquakeData.pga?.toFixed(2)})`);
    } else {
      positiveFactors.push("Low earthquake risk");
    }

    if (wildfireRisk.activeFiresNearby > 0) {
      warnings.push(`${wildfireRisk.activeFiresNearby} active fire(s) detected within search radius`);
      if (wildfireRisk.distanceToNearestFire && wildfireRisk.distanceToNearestFire < 50) {
        topRiskFactors.push(`Nearest active fire: ${wildfireRisk.distanceToNearestFire.toFixed(1)} miles away`);
      }
    } else {
      positiveFactors.push("No active fires nearby");
    }

    if (environmentalRisk.superfundSitesNearby > 0) {
      warnings.push(`${environmentalRisk.superfundSitesNearby} Superfund site(s) within search radius`);
      recommendations.push("Phase I Environmental Assessment strongly recommended");
      topRiskFactors.push(`Superfund sites nearby: ${environmentalRisk.superfundSitesNearby}`);
    } else if ((environmentalRisk.brownfieldSitesNearby || 0) > 0) {
      recommendations.push("Consider Phase I Environmental Assessment");
    } else {
      positiveFactors.push("No nearby Superfund sites");
    }

    // Add generic recommendations if no real data warnings
    if (recommendations.length === 0) {
      recommendations.push("Conduct property inspection before bidding");
      recommendations.push("Verify title status and outstanding liens");
    }

    // Calculate confidence level based on data availability
    const dataAvailabilityScore = categoryScores.filter(c => c.dataAvailability === "full").length / categoryScores.length;
    const confidenceLevel = Math.round(60 + (dataAvailabilityScore * 30)); // 60-90 based on data availability

    // Create the risk assessment object with computed values
    const assessment: RiskAssessment = {
      overallRisk,
      riskScore: Math.round(totalWeightedScore),
      confidenceLevel,
      flood: baseFlood as unknown as RiskAssessment["flood"],
      earthquake: earthquakeData as unknown as RiskAssessment["earthquake"],
      wildfire: wildfireRisk as unknown as RiskAssessment["wildfire"],
      hurricane: baseHurricane as unknown as RiskAssessment["hurricane"],
      sinkhole: baseSinkhole as unknown as RiskAssessment["sinkhole"],
      environmental: environmentalRisk as unknown as RiskAssessment["environmental"],
      radon: baseRadon as unknown as RiskAssessment["radon"],
      slope: slopeData as unknown as RiskAssessment["slope"],
      drought: null,
      categoryScores,
      weightsUsed: {
        flood: 0.2, earthquake: 0.1, wildfire: 0.15, hurricane: 0.15,
        sinkhole: 0.1, environmental: 0.15, radon: 0.1, slope: 0.05, drought: 0.0,
      },
      insuranceEstimates: {
        floodInsurance: null, earthquakeInsurance: null, fireInsurance: 0,
        windstormInsurance: null, totalAnnualCost: 0, availabilityWarnings: [],
      },
      mitigationActions: [],
      recommendations,
      warnings: warnings.length > 0 ? warnings : [],
      topRiskFactors: topRiskFactors.length > 0 ? topRiskFactors : [],
      positiveFactors,
      assessedAt: new Date(),
    };
    return assessment;
  }, [seismicData, wildfireData, environmentalData, elevationData]);

  /**
   * Computed insurance estimates based on real risk data
   */
  const computedInsuranceEstimates: InsuranceEstimates = useMemo(() => {
    const propertyValue = property?.market_value || property?.assessed_value || 0;
    const baseRate = 0.005; // 0.5% base rate

    // Get risk levels with safe fallbacks
    const wildfireRiskLevel = computedRiskAssessment.wildfire?.riskLevel ?? "low";
    const earthquakeHazardLevel = computedRiskAssessment.earthquake?.hazardLevel ?? "very_low";

    // Adjust fire insurance based on wildfire risk
    let fireInsurance = Math.round(propertyValue * baseRate);
    if (wildfireRiskLevel === "high") {
      fireInsurance = Math.round(fireInsurance * 1.5);
    } else if (wildfireRiskLevel === "moderate") {
      fireInsurance = Math.round(fireInsurance * 1.2);
    }

    // Add earthquake insurance if moderate or higher risk
    let earthquakeInsurance: number | null = null;
    if (earthquakeHazardLevel === "moderate" ||
        earthquakeHazardLevel === "high") {
      earthquakeInsurance = Math.round(propertyValue * 0.002);
    }

    const totalAnnualCost = fireInsurance + (earthquakeInsurance || 0);

    return {
      floodInsurance: null,
      earthquakeInsurance,
      fireInsurance,
      windstormInsurance: null,
      totalAnnualCost,
      availabilityWarnings: wildfireRiskLevel === "high"
        ? ["Fire insurance may have restrictions in high wildfire risk areas"]
        : [],
    };
  }, [computedRiskAssessment, property?.market_value]);

  /**
   * Computed financial analysis using real property and comparables data
   */
  const computedFinancialAnalysis: FinancialAnalysis = useMemo(() => {
    // Get real values with fallbacks
    const bidAmount = property?.total_due || 0;
    const assessedValue = property?.assessed_value || 0;
    const marketValue = property?.market_value || 0;
    const buildingSqft = property?.building_sqft || 0;
    const yearBuilt = property?.year_built || 0;

    // Calculate ARV – prefer LFB 9-step comp analysis, fall back to raw avg, then market value
    const estimatedARV = lfbArv || comparablesStats?.avg_sold_price || marketValue || 0;
    const arvLow = Math.round(estimatedARV * 0.92); // 8% below
    const arvHigh = Math.round(estimatedARV * 1.1); // 10% above
    const pricePerSqft = buildingSqft > 0 ? Math.round(estimatedARV / buildingSqft * 100) / 100 : comparablesStats?.avg_price_per_sqft || 0;

    // Calculate acquisition costs
    const buyersPremium = Math.round(bidAmount * 0.1); // 10% buyer's premium
    const transferTax = Math.round(bidAmount * 0.02); // 2% transfer tax
    const recordingFees = 250;
    const titleSearch = 350;
    const titleInsurance = Math.round(estimatedARV * 0.005); // 0.5% of ARV
    const legalFees = 500;
    const totalAcquisition = bidAmount + buyersPremium + transferTax + recordingFees + titleSearch + titleInsurance + legalFees;

    // Estimate rehab based on property age and condition
    const propertyAge = yearBuilt > 0 ? new Date().getFullYear() - yearBuilt : 50;
    let rehabMultiplier = 1.0;
    if (propertyAge > 80) rehabMultiplier = 1.5;
    else if (propertyAge > 50) rehabMultiplier = 1.2;
    else if (propertyAge > 30) rehabMultiplier = 1.0;
    else rehabMultiplier = 0.7;

    const baseRehab = 26500;
    const totalRehab = Math.round(baseRehab * rehabMultiplier);

    // Calculate holding costs
    const monthlyTaxes = property?.tax_amount ? Math.round(property.tax_amount / 12) : Math.round(assessedValue * 0.025 / 12) || 204;
    const monthlyInsurance = Math.round(computedInsuranceEstimates.totalAnnualCost / 12);
    const monthlyUtilities = 200;
    const monthlyMaintenance = 100;
    const totalMonthly = monthlyTaxes + monthlyInsurance + monthlyUtilities + monthlyMaintenance;
    const holdingPeriodMonths = 6;
    const totalHolding = totalMonthly * holdingPeriodMonths;

    // Calculate selling costs (based on ARV)
    const agentCommission = Math.round(estimatedARV * 0.06); // 6% commission
    const closingCosts = Math.round(estimatedARV * 0.02); // 2% closing
    const staging = 1500;
    const marketing = 500;
    const homeWarranty = 500;
    const sellerConcessions = Math.round(estimatedARV * 0.02);
    const totalSelling = agentCommission + closingCosts + staging + marketing + homeWarranty + sellerConcessions;

    // Calculate totals
    const totalCosts = totalAcquisition + totalRehab + totalHolding + totalSelling;
    const contingency = Math.round(totalCosts * 0.1); // 10% contingency
    const grandTotal = totalCosts + contingency;

    // Calculate metrics
    const netProfit = estimatedARV - grandTotal;
    const grossProfit = estimatedARV - bidAmount;
    const roi = totalAcquisition > 0 ? Math.round((netProfit / totalAcquisition) * 1000) / 10 : 0;
    const profitMargin = estimatedARV > 0 ? Math.round((netProfit / estimatedARV) * 1000) / 10 : 0;
    const priceToARV = estimatedARV > 0 ? Math.round((bidAmount / estimatedARV) * 100) / 100 : 0;
    const totalInvestmentToARV = estimatedARV > 0 ? Math.round((grandTotal / estimatedARV) * 100) / 100 : 0;

    // Rental analysis
    const monthlyRent = Math.round(estimatedARV * 0.008); // 0.8% rule
    const annualGrossRent = monthlyRent * 12;
    const vacancyRate = 0.08;
    const effectiveGrossIncome = Math.round(annualGrossRent * (1 - vacancyRate));
    const annualOperatingExpenses = Math.round(effectiveGrossIncome * 0.35); // 35% for expenses
    const noi = effectiveGrossIncome - annualOperatingExpenses;
    const capRate = totalAcquisition > 0 ? Math.round((noi / totalAcquisition) * 1000) / 10 : 0;
    const cashOnCash = totalAcquisition > 0 ? Math.round((noi / totalAcquisition) * 1000) / 10 : 0;

    // IRR approximation (simplified)
    const irr = roi > 0 ? Math.round(roi * (12 / holdingPeriodMonths) * 10) / 10 : 0;

    // Determine verdict based on metrics
    let verdict: "strong_buy" | "buy" | "hold" | "pass" = "hold";
    if (roi >= 30 && priceToARV <= 0.35) verdict = "strong_buy";
    else if (roi >= 20 && priceToARV <= 0.50) verdict = "buy";
    else if (roi >= 10) verdict = "hold";
    else verdict = "pass";

    // Calculate max bid (70% rule)
    const maxBid = Math.round(estimatedARV * 0.7 - totalRehab);

    // Build key factors from real data
    const keyFactors: string[] = [];
    if (roi > 0) keyFactors.push(`${roi}% ROI ${roi >= 20 ? 'exceeds' : 'below'} minimum threshold of 20%`);
    if (priceToARV > 0) keyFactors.push(`Acquisition at ${Math.round(priceToARV * 100)}% of ARV (target: 70% rule)`);
    if (capRate > 0) keyFactors.push(`${capRate >= 6 ? 'Strong' : 'Moderate'} rental fallback with ${capRate}% cap rate`);
    if (propertyAge < 30) keyFactors.push("Newer construction - lower rehab expected");
    else if (propertyAge > 50) keyFactors.push("Older property - higher rehab costs factored in");

    // Build risks from real data
    const risks: string[] = ["Rehab costs may exceed estimate if hidden issues found"];
    if (propertyAge > 80) risks.unshift("Property age may indicate hidden structural issues");
    if ((computedRiskAssessment.environmental?.superfundSitesNearby ?? 0) > 0) risks.unshift("Environmental contamination risk nearby");

    // Determine confidence based on data availability
    const hasRealComps = realComparables && realComparables.length >= 3;
    const hasPropertyData = property && property.total_due && property.market_value;
    const confidenceLevel = hasRealComps && hasPropertyData ? 85 : hasRealComps || hasPropertyData ? 70 : 60;

    return {
      costs: {
        acquisition: {
          bidAmount,
          buyersPremium,
          transferTax,
          recordingFees,
          titleSearch,
          titleInsurance,
          legalFees,
          totalAcquisition,
        },
        rehab: {
          exterior: { roof: 0, siding: 0, windows: 0, doors: 0, landscaping: 0, hardscape: 0, total: 0 },
          interior: { flooring: 0, paint: 0, kitchen: 0, bathrooms: 0, electrical: 0, plumbing: 0, hvac: 0, fixtures: 0, total: 0 },
          structural: { foundation: 0, framing: 0, insulation: 0, total: 0 },
          permits: 0,
          laborMultiplier: 1.0,
          materialMultiplier: 1.0,
          totalRehab,
        },
        holding: {
          monthlyTaxes,
          monthlyInsurance,
          monthlyUtilities,
          monthlyMaintenance,
          monthlyLoanPayment: 0,
          monthlyHoa: 0,
          totalMonthly,
          holdingPeriodMonths,
          totalHolding,
        },
        selling: {
          agentCommission,
          closingCosts,
          staging,
          marketing,
          homeWarranty,
          sellerConcessions,
          totalSelling,
        },
        totalCosts,
        contingency,
        grandTotal,
        confidence: hasRealComps ? "high" : "medium",
        dataQuality: confidenceLevel,
        warnings: property?.total_due
          ? ["Calculations based on real auction data"]
          : ["Bid amount estimated - verify with auction listing"],
      },
      revenue: {
        sale: {
          estimatedARV,
          lowEstimate: arvLow,
          highEstimate: arvHigh,
          pricePerSqft,
          comparablesUsed: realComparables?.length || 0,
          confidence: hasRealComps ? "high" : "medium",
        },
        rental: {
          monthlyRent,
          annualGrossRent,
          vacancyRate,
          effectiveGrossIncome,
          annualOperatingExpenses,
          noi,
          monthlyCashFlow: Math.round(noi / 12),
          annualCashFlow: noi,
        },
      },
      metrics: {
        roi,
        profitMargin,
        priceToARV,
        totalInvestmentToARV,
        cashOnCash,
        netProfit,
        grossProfit,
        breakEvenPrice: grandTotal,
        irr,
        capRate,
      },
      comparables: {
        comparables: realComparables || [],
        estimatedARV,
        arvLowRange: arvLow,
        arvHighRange: arvHigh,
        averagePricePerSqft: comparablesStats?.avg_price_per_sqft || pricePerSqft,
        medianPricePerSqft: comparablesStats?.avg_price_per_sqft || pricePerSqft, // Using avg since median not available
        comparablesCount: realComparables?.length || 0,
        searchRadiusMiles: 1.0,
        confidence: hasRealComps ? "high" : "medium",
        dataSource: hasRealComps ? "Realty API" : "Sample Data",
        notes: hasRealComps
          ? [`Based on ${realComparables?.length} recent sales`, "Data from Realty API"]
          : ["No comparable sales data available"],
      },
      recommendation: {
        verdict,
        confidence: confidenceLevel,
        maxBid,
        targetProfit: netProfit > 0 ? netProfit : 35000,
        keyFactors,
        risks,
        opportunities: estimatedARV > 0
          ? ["Potential value-add through property improvements", "Rental income as alternative exit strategy"]
          : [],
        exitStrategy: "flip",
        timelineMonths: holdingPeriodMonths,
      },
      analysisDate: new Date().toISOString(),
      confidenceLevel,
      dataQuality: {
        overallScore: confidenceLevel,
        components: {
          comparablesQuality: hasRealComps ? 90 : 70,
          costEstimateAccuracy: 70,
          marketDataFreshness: hasRealComps ? 95 : 70,
          propertyDataCompleteness: hasPropertyData ? 85 : 60,
        },
        missingData: [
          ...(!hasRealComps ? ["Real comparable sales data"] : []),
          ...(!property?.building_sqft ? ["Building square footage"] : []),
          "Interior condition report",
        ].filter(Boolean),
        assumptions: [
          `Property assumed to need ${propertyAge > 50 ? 'moderate to heavy' : 'light to moderate'} rehab`,
          "No major structural issues assumed",
          "Standard closing timeline assumed",
        ],
      },
    };
  }, [property, realComparables, comparablesStats, lfbArv, computedInsuranceEstimates.totalAnnualCost, computedRiskAssessment.environmental?.superfundSitesNearby]);

  /**
   * Computed investment score categories using real data
   */
  const computedCategories: CategoryScore[] = useMemo(() => {
    // Helper to convert score to grade
    const scoreToGrade = (score: number, maxScore: number): Grade => {
      const pct = (score / maxScore) * 100;
      if (pct >= 95) return "A+";
      if (pct >= 90) return "A";
      if (pct >= 85) return "A-";
      if (pct >= 80) return "B+";
      if (pct >= 75) return "B";
      if (pct >= 70) return "B-";
      if (pct >= 65) return "C+";
      if (pct >= 60) return "C";
      if (pct >= 55) return "C-";
      if (pct >= 50) return "D+";
      if (pct >= 45) return "D";
      return "F";
    };

    // Helper to safely get priceToARV without falsy-zero trap
    // priceToARV of 0 is valid (means very cheap acquisition), not missing data
    const safeNumber = (val: number | undefined | null, fallback: number): number =>
      val != null && !isNaN(val) ? val : fallback;

    // ===== LOCATION SCORE (max 25) =====
    // Based on amenities, broadband, demographics
    let locationScore = 15; // Base score
    const locationFactors: string[] = [];
    const locationBreakdown = [];

    // Walkability/Amenities (max 10)
    const walkabilityScore = amenitiesData?.walkabilityScore
      ? Math.round(amenitiesData.walkabilityScore / 10)
      : 6;
    locationBreakdown.push({ label: "Walkability & Amenities", score: walkabilityScore, maxScore: 10 });
    if (amenitiesData) {
      if (amenitiesData.walkabilityScore >= 70) locationFactors.push(`High walkability score (${amenitiesData.walkabilityScore})`);
      else if (amenitiesData.walkabilityScore >= 50) locationFactors.push(`Moderate walkability (${amenitiesData.walkabilityScore})`);
      if (amenitiesData.hospitals > 0) locationFactors.push(`Near hospital (${amenitiesData.hospitals} within radius)`);
      if (amenitiesData.schools > 3) locationFactors.push(`Good school access (${amenitiesData.schools} nearby)`);
    } else {
      locationFactors.push("Walkability data pending");
    }

    // Broadband/Infrastructure (max 10)
    let broadbandScore = 6;
    if (broadbandData) {
      if (broadbandData.fiberAvailable) broadbandScore = 10;
      else if (broadbandData.maxDownload >= 100) broadbandScore = 8;
      else if (broadbandData.maxDownload >= 25) broadbandScore = 6;
      else broadbandScore = 4;
      if (broadbandData.fiberAvailable) locationFactors.push("Fiber internet available");
      else if (broadbandData.maxDownload >= 100) locationFactors.push(`Fast broadband (${broadbandData.maxDownload} Mbps)`);
    }
    locationBreakdown.push({ label: "Internet/Infrastructure", score: broadbandScore, maxScore: 10 });

    // Demographics quality (max 5)
    let demoScore = 3;
    if (censusData?.demographics) {
      const { medianHouseholdIncome, ownerOccupiedPct, unemploymentRate } = censusData.demographics;
      if (medianHouseholdIncome > 70000) demoScore = 5;
      else if (medianHouseholdIncome > 50000) demoScore = 4;
      else if (medianHouseholdIncome > 35000) demoScore = 3;
      else demoScore = 2;
      if (ownerOccupiedPct > 60) locationFactors.push(`Strong ownership (${Math.round(ownerOccupiedPct)}%)`);
      if (unemploymentRate < 5) locationFactors.push("Low unemployment area");
    }
    locationBreakdown.push({ label: "Demographics", score: demoScore, maxScore: 5 });

    locationScore = walkabilityScore + broadbandScore + demoScore;

    // ===== RISK SCORE (max 25) - lower risk = higher score =====
    const overallRiskNum = computedRiskAssessment.riskScore || 35;
    // Convert risk score (0-100, higher=worse) to investment score (0-25, higher=better)
    const riskInvestmentScore = Math.max(0, Math.round(25 - (overallRiskNum * 0.25)));
    const riskFactors: string[] = [];

    const floodRiskLevel = computedRiskAssessment.flood?.riskLevel ?? "minimal";
    const floodInsuranceRequired = computedRiskAssessment.flood?.insuranceRequired ?? false;
    const earthquakeHazard = computedRiskAssessment.earthquake?.hazardLevel ?? "very_low";
    const superfundCount = computedRiskAssessment.environmental?.superfundSitesNearby ?? 0;

    if (floodRiskLevel === "minimal") riskFactors.push("No flood zone");
    else if (floodInsuranceRequired) riskFactors.push("Flood insurance required");

    if (earthquakeHazard === "very_low" || earthquakeHazard === "low") {
      riskFactors.push("Low seismic risk");
    }
    if (superfundCount === 0) {
      riskFactors.push("No Superfund sites nearby");
    } else {
      riskFactors.push(`${superfundCount} Superfund site(s) nearby`);
    }

    const riskBreakdown = [
      { label: "Environmental", score: Math.round(10 - (superfundCount * 2)), maxScore: 10 },
      { label: "Natural Hazards", score: Math.round(10 - (overallRiskNum * 0.1)), maxScore: 10 },
      { label: "Title Risk", score: 4, maxScore: 5 }, // Assumed clear for tax deed
    ];

    // ===== FINANCIAL SCORE (max 25) =====
    const roi = computedFinancialAnalysis.metrics.roi || 0;
    const priceToARV = safeNumber(computedFinancialAnalysis.metrics.priceToARV, 1);
    const financialFactors: string[] = [];

    // ROI score (max 10)
    let roiScore = 5;
    if (roi >= 40) roiScore = 10;
    else if (roi >= 30) roiScore = 9;
    else if (roi >= 20) roiScore = 7;
    else if (roi >= 10) roiScore = 5;
    else roiScore = 3;
    if (roi > 0) financialFactors.push(`${roi}% projected ROI`);

    // Price to ARV (max 10)
    let ptvScore = 5;
    if (priceToARV <= 0.30) ptvScore = 10;
    else if (priceToARV <= 0.50) ptvScore = 8;
    else if (priceToARV <= 0.70) ptvScore = 6;
    else ptvScore = 4;
    if (priceToARV > 0 && priceToARV <= 0.70) financialFactors.push(`${Math.round(priceToARV * 100)}% of ARV (under 70% rule)`);

    // Cap rate (max 5)
    const capRate = computedFinancialAnalysis.metrics.capRate || 0;
    let capRateScore = 3;
    if (capRate >= 10) capRateScore = 5;
    else if (capRate >= 7) capRateScore = 4;
    else if (capRate >= 5) capRateScore = 3;
    else capRateScore = 2;
    if (capRate > 0) financialFactors.push(`${capRate}% cap rate rental potential`);

    const financialScore = roiScore + ptvScore + capRateScore;
    const financialBreakdown = [
      { label: "ROI Potential", score: roiScore, maxScore: 10 },
      { label: "Price vs Value", score: ptvScore, maxScore: 10 },
      { label: "Rental Fallback", score: capRateScore, maxScore: 5 },
    ];

    // ===== MARKET SCORE (max 25) =====
    const compsCount = realComparables?.length || 0;
    const marketFactors: string[] = [];

    // Comparables quality (max 10)
    let compsScore = 4;
    if (compsCount >= 6) compsScore = 10;
    else if (compsCount >= 4) compsScore = 8;
    else if (compsCount >= 2) compsScore = 6;
    else compsScore = 4;
    if (compsCount > 0) marketFactors.push(`${compsCount} recent comparable sales`);
    else marketFactors.push("Limited comparable data");

    // Market stability (max 10)
    let stabilityScore = 6;
    if (censusData?.demographics) {
      const { vacancyRate, ownerOccupiedPct } = censusData.demographics;
      if (vacancyRate < 5 && ownerOccupiedPct > 60) {
        stabilityScore = 9;
        marketFactors.push("Stable market (low vacancy, high ownership)");
      } else if (vacancyRate < 10) {
        stabilityScore = 7;
        marketFactors.push("Moderate market stability");
      } else {
        stabilityScore = 5;
        marketFactors.push("Higher vacancy in area");
      }
    }

    // Demand indicator (max 5)
    let demandScore = 3;
    if (censusData?.demographics?.medianHomeValue) {
      const medianValue = censusData.demographics.medianHomeValue;
      const estimatedARV = computedFinancialAnalysis.revenue.sale.estimatedARV;
      if (estimatedARV < medianValue * 0.8) {
        demandScore = 5;
        marketFactors.push("Below median - high demand potential");
      } else if (estimatedARV < medianValue) {
        demandScore = 4;
      }
    }

    const marketScore = compsScore + stabilityScore + demandScore;
    const marketBreakdown = [
      { label: "Comparables Quality", score: compsScore, maxScore: 10 },
      { label: "Market Stability", score: stabilityScore, maxScore: 10 },
      { label: "Demand Indicator", score: demandScore, maxScore: 5 },
    ];

    // ===== PROFIT SCORE (max 25) =====
    const netProfit = computedFinancialAnalysis.metrics.netProfit || 0;
    const profitMargin = computedFinancialAnalysis.metrics.profitMargin || 0;
    const profitFactors: string[] = [];

    // Net profit (max 10)
    let netProfitScore = 5;
    if (netProfit >= 50000) netProfitScore = 10;
    else if (netProfit >= 35000) netProfitScore = 8;
    else if (netProfit >= 20000) netProfitScore = 6;
    else if (netProfit >= 10000) netProfitScore = 4;
    else netProfitScore = 2;
    if (netProfit > 0) profitFactors.push(`$${netProfit.toLocaleString()} projected net profit`);

    // Profit margin (max 10)
    let marginScore = 5;
    if (profitMargin >= 30) marginScore = 10;
    else if (profitMargin >= 20) marginScore = 8;
    else if (profitMargin >= 15) marginScore = 6;
    else if (profitMargin >= 10) marginScore = 4;
    else marginScore = 2;
    if (profitMargin > 0) profitFactors.push(`${profitMargin}% profit margin`);

    // Exit flexibility (max 5)
    let exitScore = 3;
    if (capRate >= 6 && roi >= 15) {
      exitScore = 5;
      profitFactors.push("Multiple viable exit strategies");
    } else if (capRate >= 5 || roi >= 20) {
      exitScore = 4;
    }

    const profitScore = netProfitScore + marginScore + exitScore;
    const profitBreakdown = [
      { label: "Net Profit", score: netProfitScore, maxScore: 10 },
      { label: "Profit Margin", score: marginScore, maxScore: 10 },
      { label: "Exit Flexibility", score: exitScore, maxScore: 5 },
    ];

    return [
      {
        name: "Location",
        key: "location",
        score: locationScore,
        maxScore: 25,
        grade: scoreToGrade(locationScore, 25),
        factors: locationFactors.length > 0 ? locationFactors : ["Insufficient data for location analysis"],
        breakdown: locationBreakdown,
      },
      {
        name: "Risk",
        key: "risk",
        score: riskInvestmentScore,
        maxScore: 25,
        grade: scoreToGrade(riskInvestmentScore, 25),
        factors: riskFactors.length > 0 ? riskFactors : ["Insufficient data for risk analysis"],
        breakdown: riskBreakdown,
      },
      {
        name: "Financial",
        key: "financial",
        score: financialScore,
        maxScore: 25,
        grade: scoreToGrade(financialScore, 25),
        factors: financialFactors.length > 0 ? financialFactors : ["Insufficient data for financial analysis"],
        breakdown: financialBreakdown,
      },
      {
        name: "Market",
        key: "market",
        score: marketScore,
        maxScore: 25,
        grade: scoreToGrade(marketScore, 25),
        factors: marketFactors.length > 0 ? marketFactors : ["Insufficient data for market analysis"],
        breakdown: marketBreakdown,
      },
      {
        name: "Profit",
        key: "profit",
        score: profitScore,
        maxScore: 25,
        grade: scoreToGrade(profitScore, 25),
        factors: profitFactors.length > 0 ? profitFactors : ["Insufficient data for profit analysis"],
        breakdown: profitBreakdown,
      },
    ];
  }, [amenitiesData, broadbandData, censusData, computedRiskAssessment, computedFinancialAnalysis, realComparables]);

  // Compute total score and grade from computed categories
  const computedTotalScore = computedCategories.reduce((sum, cat) => sum + cat.score, 0);
  const computedMaxScore = 125;
  const computedOverallGrade: Grade = useMemo(() => {
    const pct = (computedTotalScore / computedMaxScore) * 100;
    if (pct >= 95) return "A+";
    if (pct >= 90) return "A";
    if (pct >= 85) return "A-";
    if (pct >= 80) return "B+";
    if (pct >= 75) return "B";
    if (pct >= 70) return "B-";
    if (pct >= 65) return "C+";
    if (pct >= 60) return "C";
    if (pct >= 55) return "C-";
    if (pct >= 50) return "D+";
    if (pct >= 45) return "D";
    return "F";
  }, [computedTotalScore]);

  // Compute recommendation from score
  const computedRecommendation = useMemo(() => {
    if (computedTotalScore >= 100) return { text: "STRONG BUY", color: "emerald" };
    if (computedTotalScore >= 80) return { text: "BUY", color: "green" };
    if (computedTotalScore >= 60) return { text: "HOLD", color: "amber" };
    return { text: "PASS", color: "red" };
  }, [computedTotalScore]);

  /**
   * Computed strengths from real analysis data
   */
  const computedStrengths: string[] = useMemo(() => {
    const strengths: string[] = [];

    // Financial strengths
    const roi = computedFinancialAnalysis.metrics.roi;
    const priceToARV = computedFinancialAnalysis.metrics.priceToARV;
    if (roi >= 30) strengths.push(`Strong projected ROI of ${roi}%`);
    else if (roi >= 20) strengths.push(`Good projected ROI of ${roi}%`);

    if (priceToARV <= 0.30) strengths.push(`Excellent price-to-value ratio (${Math.round(priceToARV * 100)}% of ARV)`);
    else if (priceToARV <= 0.50) strengths.push(`Good price-to-value ratio (${Math.round(priceToARV * 100)}% of ARV)`);

    const capRate = computedFinancialAnalysis.metrics.capRate;
    if (capRate >= 7) strengths.push(`Strong rental potential (${capRate}% cap rate)`);

    // Risk strengths (using safe access)
    const floodLevel = computedRiskAssessment.flood?.riskLevel ?? "minimal";
    const earthquakeLevel = computedRiskAssessment.earthquake?.hazardLevel ?? "very_low";
    const envSuperfund = computedRiskAssessment.environmental?.superfundSitesNearby ?? 0;

    if (floodLevel === "minimal") strengths.push("Outside flood zone - no flood insurance required");
    if (earthquakeLevel === "very_low" || earthquakeLevel === "low") {
      strengths.push("Low seismic risk area");
    }
    if (envSuperfund === 0) {
      strengths.push("No environmental contamination concerns nearby");
    }

    // Location strengths
    if (amenitiesData) {
      if (amenitiesData.walkabilityScore >= 70) strengths.push(`High walkability score (${amenitiesData.walkabilityScore})`);
      if (amenitiesData.hospitals > 0 && amenitiesData.schools > 3) strengths.push("Good access to hospitals and schools");
    }
    if (broadbandData?.fiberAvailable) strengths.push("Fiber internet available");

    // Demographics strengths
    if (censusData?.demographics) {
      if (censusData.demographics.ownerOccupiedPct > 65) {
        strengths.push(`High ownership rate (${Math.round(censusData.demographics.ownerOccupiedPct)}%)`);
      }
      if (censusData.demographics.unemploymentRate < 4) {
        strengths.push("Low unemployment area");
      }
    }

    // Fallback if not enough strengths
    if (strengths.length < 3) {
      if (!strengths.some(s => s.includes("ROI"))) strengths.push("Potential for positive returns");
      if (!strengths.some(s => s.includes("flood"))) strengths.push("Standard insurance rates expected");
    }

    return strengths.slice(0, 6); // Return up to 6 strengths
  }, [computedFinancialAnalysis, computedRiskAssessment, amenitiesData, broadbandData, censusData]);

  /**
   * Computed concerns/weaknesses from real analysis data
   */
  const computedConcerns: string[] = useMemo(() => {
    const concerns: string[] = [];

    // Financial concerns
    const roi = computedFinancialAnalysis.metrics.roi;
    if (roi < 15 && roi > 0) concerns.push(`Lower than target ROI (${roi}%)`);
    else if (roi <= 0) concerns.push("Negative or zero projected ROI - review carefully");

    const priceToARV = computedFinancialAnalysis.metrics.priceToARV;
    if (priceToARV > 0.70) concerns.push(`Acquisition above 70% rule (${Math.round(priceToARV * 100)}% of ARV)`);

    // Risk concerns (using safe access)
    if (computedRiskAssessment.overallRisk === "high" || computedRiskAssessment.overallRisk === "severe") {
      concerns.push("Elevated overall risk profile");
    }
    const concernSuperfund = computedRiskAssessment.environmental?.superfundSitesNearby ?? 0;
    if (concernSuperfund > 0) {
      concerns.push(`${concernSuperfund} Superfund site(s) nearby - environmental due diligence required`);
    }
    const activeFiresCount = computedRiskAssessment.wildfire?.activeFiresNearby ?? 0;
    if (activeFiresCount > 0) {
      concerns.push(`Active fires detected in region (${activeFiresCount})`);
    }
    const radonLevel = computedRiskAssessment.radon?.riskLevel;
    if (radonLevel === "moderate" || radonLevel === "high") {
      concerns.push("Radon testing recommended (elevated zone)");
    }

    // Property-specific concerns
    const yearBuilt = property?.year_built || 0;
    if (yearBuilt > 0 && yearBuilt < 1960) {
      concerns.push(`Built in ${yearBuilt} - age-related issues possible (lead paint, asbestos)`);
    }

    // Market concerns
    if (censusData?.demographics) {
      if (censusData.demographics.vacancyRate > 10) {
        concerns.push(`Higher vacancy rate in area (${censusData.demographics.vacancyRate.toFixed(1)}%)`);
      }
    }
    if (!realComparables || realComparables.length < 3) {
      concerns.push("Limited comparable sales data - ARV estimate less certain");
    }

    // Fallback if no concerns identified
    if (concerns.length === 0) {
      concerns.push("Standard investment risks apply");
      concerns.push("Interior condition unknown - inspection recommended");
    }

    return concerns.slice(0, 5); // Return up to 5 concerns
  }, [computedFinancialAnalysis, computedRiskAssessment, property?.year_built, censusData, realComparables]);

  /**
   * Handle PDF export with loading state and error handling
   */
  const handlePrint = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const filename = generateReportFilename(fullAddress, reportId);
      await exportReportToPDF("report-container", filename);
    } catch (error) {
      console.error("PDF export failed:", error);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  // Loading state
  if (isLoadingProperty) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-lg text-slate-600 dark:text-slate-400">Loading property data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (propertyError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Property Not Found</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{propertyError}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="report-container" className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ===== SECTION 1: Executive Summary Header ===== */}
      <header className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-emerald-100 hover:text-white transition-colors print:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Property
          </button>

          {/* Top row: Property info and recommendation */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Property identification */}
            <div>
              <div className="flex items-center gap-2 text-emerald-100 mb-2">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-medium">Property Analysis Report</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">
                {propertyDetails.address}
              </h1>
              <p className="text-emerald-100 text-lg">
                {propertyDetails.city}, {propertyDetails.state} {propertyDetails.zip}
              </p>
              <p className="text-emerald-200 text-sm mt-1">
                Parcel: {propertyDetails.parcelId} | {propertyDetails.county} County
              </p>
            </div>

            {/* Score and Recommendation */}
            <div className="flex flex-col items-center lg:items-end gap-4">
              {/* Score circle */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-emerald-600">{computedTotalScore}</span>
                      <span className="text-xs text-slate-500">of {computedMaxScore}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold">{computedOverallGrade}</div>
                  <div className="text-emerald-100 text-sm">Investment Grade</div>
                </div>
              </div>

              {/* Recommendation badge */}
              <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold text-lg">{computedRecommendation.text}</span>
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
        {/* ===== Enrichment Banner: Show when property has no coordinates and no regrid data ===== */}
        {property && !property.coordinates && !property.screenshot_url && (
          <section className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-5 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                    Property Data Incomplete
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    This property has not been enriched with Regrid data. Coordinates, lot size, year built,
                    and other details are missing. Without coordinates, comparables, market data, and
                    environmental analysis cannot be generated accurately.
                  </p>
                </div>
              </div>
              <button
                onClick={handleEnrichProperty}
                disabled={isEnriching}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors",
                  isEnriching
                    ? "bg-amber-200 dark:bg-amber-800 text-amber-500 dark:text-amber-400 cursor-not-allowed"
                    : "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                )}
              >
                {isEnriching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enriching...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Enrich Property
                  </>
                )}
              </button>
            </div>
            {isEnriching && (
              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700">
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    Running Regrid scraper via browser automation... This typically takes 30-60 seconds.
                  </span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ===== API Data Status Banner ===== */}
        {(isLoading || apiData || apiError) && (
          <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Loading real-time data from APIs...
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
                      Live data loaded ({apiData.dataQuality} coverage) - {apiData.sources.filter(s => s.status === 'ok').length}/{apiData.sources.length} APIs
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
                  onClick={fetchReportData}
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

            {/* AI Summary */}
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
            <h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-800 dark:text-emerald-300 mb-4">
              <TrendingUp className="h-5 w-5" />
              Key Strengths
            </h2>
            <ul className="space-y-3">
              {computedStrengths.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-500 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Concerns */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-800 dark:text-amber-300 mb-4">
              <AlertTriangle className="h-5 w-5" />
              Areas of Concern
            </h2>
            <ul className="space-y-3">
              {computedConcerns.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== SECTION 3: Property Data Card ===== */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">
            <Home className="h-5 w-5" />
            Property Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {property?.total_due != null ? `$${property.total_due.toLocaleString()}` : 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Asking Price</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {computedFinancialAnalysis.revenue.sale.estimatedARV > 0
                  ? `$${computedFinancialAnalysis.revenue.sale.estimatedARV.toLocaleString()}`
                  : property?.market_value != null
                    ? `$${property.market_value.toLocaleString()}`
                    : 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Est. FMV (ARV)</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {property?.lot_size_acres != null ? `${property.lot_size_acres.toFixed(2)} ac` : 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Lot Size</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {property?.building_sqft != null ? `${property.building_sqft.toLocaleString()} sqft` : 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Building Size</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className={`text-2xl font-bold ${
                property?.is_vacant_lot
                  ? 'text-amber-600 dark:text-amber-400'
                  : property?.is_likely_mobile_home
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-indigo-600 dark:text-indigo-400'
              }`}>
                {property?.is_vacant_lot
                  ? 'Vacant Lot'
                  : property?.is_likely_mobile_home
                    ? 'Mobile Home'
                    : (getPropertyTypeLabel(property?.property_type) || 'N/A')}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Property Type</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                {computedFinancialAnalysis.revenue.sale.estimatedARV > 0
                  ? (computedFinancialAnalysis.recommendation.exitStrategy === 'flip' ? 'Flip'
                    : computedFinancialAnalysis.recommendation.exitStrategy === 'hold' ? 'Hold'
                    : 'Buy & Hold')
                  : 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Strategy</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {(() => {
                  const askingPrice = property?.total_due;
                  const arvValue = computedFinancialAnalysis.revenue.sale.estimatedARV || property?.market_value;
                  if (askingPrice != null && arvValue && arvValue > 0) {
                    return `${Math.round((1 - askingPrice / arvValue) * 100)}% OFF`;
                  }
                  return 'N/A';
                })()}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Discount</p>
            </div>
          </div>
        </section>

        {/* ===== SECTION 4: Property Visualization (Maps) - 2x2 Grid ===== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Map View */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              <Map className="h-5 w-5" />
              Map View
            </h3>
            <div className="aspect-video">
              <GoogleMapStatic
                lat={propertyDetails.coordinates.lat}
                lng={propertyDetails.coordinates.lng}
                address={fullAddress}
                zoom={17}
                mapType="roadmap"
                height={300}
                showExternalLink={true}
                altText={`Map of ${propertyDetails.address}`}
              />
            </div>
          </div>
          {/* Satellite View */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              <Map className="h-5 w-5" />
              Satellite View
            </h3>
            <div className="aspect-video">
              <GoogleMapStatic
                lat={propertyDetails.coordinates.lat}
                lng={propertyDetails.coordinates.lng}
                address={fullAddress}
                zoom={19}
                mapType="satellite"
                height={300}
                showExternalLink={true}
                altText={`Satellite view of ${propertyDetails.address}`}
              />
            </div>
          </div>
          {/* Street View */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              <MapPin className="h-5 w-5" />
              Street View
            </h3>
            <div className="aspect-video">
              <GoogleStreetViewStatic
                lat={propertyDetails.coordinates.lat}
                lng={propertyDetails.coordinates.lng}
                address={fullAddress}
                heading={90}
                pitch={0}
                height={300}
                showExternalLink={true}
                altText={`Street view of ${propertyDetails.address}`}
              />
            </div>
          </div>
          {/* Regrid Aerial View */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                <Image className="h-5 w-5" />
                Regrid View
              </h3>
              <button
                onClick={handleEnrichProperty}
                disabled={isEnriching}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors print:hidden",
                  isEnriching
                    ? "bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-400"
                )}
                title="Re-scrape Regrid data and screenshot for this property"
              >
                {isEnriching ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    Re-scrape
                  </>
                )}
              </button>
            </div>
            <div className="aspect-video relative overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700">
              {isEnriching ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Loader2 className="h-10 w-10 text-amber-500 animate-spin mb-3" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Scraping Regrid...
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Running browser automation on VPS (30-60 seconds)
                  </p>
                </div>
              ) : isPlaceholderRegrid ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Placeholder Data
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    Regrid scraper timed out. Screenshot may be inaccurate.
                  </p>
                  <a
                    href={`https://app.regrid.com/us/${(property?.state || 'pa').toLowerCase()}/${(property?.county_name || '').toLowerCase().replace(/\s+/g, '-')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on Regrid
                  </a>
                </div>
              ) : property?.screenshot_url ? (
                <>
                  <img
                    src={property.screenshot_url}
                    alt={`Regrid aerial view of ${propertyDetails.address}`}
                    className="w-full h-full object-cover"
                  />
                  <a
                    href={`https://app.regrid.com/us/${(property?.state || 'pa').toLowerCase()}/${(property?.county_name || '').toLowerCase().replace(/\s+/g, '-')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in Regrid
                  </a>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Image className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Regrid Image Not Available
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No aerial screenshot captured for this property
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===== SECTION 4B: AI Visual Screening ===== */}
        <VisualValidation propertyId={propertyId} />

        {/* ===== SECTION 5: Location Details ===== */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">
            <MapPin className="h-5 w-5" />
            Location Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Full Address</h4>
              <p className="text-slate-900 dark:text-slate-100">
                {propertyDetails.address}<br />
                {propertyDetails.city}, {propertyDetails.state} {propertyDetails.zip}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">County</h4>
              <p className="text-slate-900 dark:text-slate-100">{propertyDetails.county} County, {propertyDetails.state}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Coordinates</h4>
              <p className="text-slate-900 dark:text-slate-100">
                {propertyDetails.coordinates.lat.toFixed(4)}, {propertyDetails.coordinates.lng.toFixed(4)}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Parcel ID</h4>
              <p className="text-slate-900 dark:text-slate-100 font-mono">{propertyDetails.parcelId}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Zoning</h4>
              <p className="text-slate-900 dark:text-slate-100">{propertyDetails.zoning || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Owner</h4>
              <p className="text-slate-900 dark:text-slate-100">{propertyDetails.ownerName}</p>
            </div>
          </div>
        </section>

        {/* ===== SECTION 6: Location Context ===== */}
        <LocationAnalysis
          score={computedCategories.find(c => c.key === "location")?.score ?? 0}
          maxScore={25}
          grade={computedCategories.find(c => c.key === "location")?.grade ?? "C"}
          neighborhood={censusData?.geographic?.countyName || propertyDetails.city || 'Unknown'}
          stats={{
            medianIncome: censusData?.demographics?.medianHouseholdIncome ?? 0,
            populationDensity: undefined, // Census tract area not available for density calculation
            homeownershipRate: censusData?.demographics?.ownerOccupiedPct ?? 0,
            medianAge: censusData?.demographics?.medianAge ?? 0,
            vacancyRate: censusData?.demographics?.vacancyRate ?? 0,
            crimeRate: undefined,
            schoolRating: amenitiesData?.schoolRating ?? undefined,
            walkScore: amenitiesData?.walkScore ?? amenitiesData?.walkabilityScore ?? undefined,
            transitScore: amenitiesData?.transitScore ?? undefined,
            bikeScore: amenitiesData?.bikeScore ?? undefined,
          }}
          amenities={(amenitiesData?.nearest ?? []).map(a => ({
            name: a.name,
            type: (a.type === 'grocery_store' ? 'shopping'
              : a.type === 'gas_station' ? 'other'
              : a.type as 'school' | 'hospital' | 'shopping' | 'transit' | 'park' | 'restaurant' | 'other'),
            distance: a.distance,
          }))}
          trends={[]}
          factors={computedCategories.find(c => c.key === "location")?.factors ?? []}
          concerns={censusData?.demographics?.vacancyRate && censusData.demographics.vacancyRate > 10
            ? [`Higher vacancy rate (${censusData.demographics.vacancyRate.toFixed(1)}%)`]
            : !censusData ? ["Census data not yet loaded"] : []}
          googleMapsUrl={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
        />

        {/* ===== SECTION 7: Slope & Terrain Analysis ===== */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Mountain className="h-5 w-5" />
              Slope & Terrain Analysis
            </h2>
            {elevationData && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Live Data
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Elevation</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {elevationData?.elevation ? `${elevationData.elevation.meters}m` : 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {elevationData?.elevation ? `${elevationData.elevation.feet}ft above sea level` : 'Data pending'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Average Slope</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {elevationData?.terrain ? `${elevationData.terrain.averageSlope.toFixed(1)}%` : 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {elevationData?.terrain ? elevationData.terrain.classificationLabel : 'Data pending'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Max Slope</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {elevationData?.terrain ? `${elevationData.terrain.maxSlope.toFixed(1)}%` : 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {elevationData?.terrain
                  ? elevationData.terrain.slopeDirection !== 'flat'
                    ? `Steepest toward ${elevationData.terrain.slopeDirection}`
                    : 'Relatively flat terrain'
                  : 'Data pending'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Classification</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {elevationData?.terrain
                  ? elevationData.terrain.stability === 'stable' ? 'Stable'
                    : elevationData.terrain.stability === 'moderate_risk' ? 'Moderate'
                    : 'At Risk'
                  : 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {elevationData?.terrain ? elevationData.terrain.stabilityLabel : 'Requires terrain analysis'}
              </p>
            </div>
          </div>
        </section>

        {/* ===== SECTION 8: Insurance Risk Analysis ===== */}
        <section className="space-y-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
            <Shield className="h-6 w-6" />
            Risk Assessment
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskOverviewCard
              assessment={computedRiskAssessment}
              title="Overall Risk Assessment"
              showDetails
            />
            <InsuranceEstimateCard
              estimates={computedInsuranceEstimates}
              propertyValue={property?.market_value || property?.assessed_value || 0}
              showChart
              showDetails
            />
          </div>
        </section>

        {/* ===== SECTION 9: Financial Analysis ===== */}
        <section>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
            <DollarSign className="h-6 w-6" />
            Financial Analysis
          </h2>
          <FinancialDashboard
            analysis={computedFinancialAnalysis}
            propertyId={propertyId}
          />
        </section>

        {/* ===== SECTION 10: Comparable Sales (LFB 9-Step Analysis) ===== */}
        <section>
          <ComparablesCard
            lat={propertyDetails.coordinates?.lat || undefined}
            lng={propertyDetails.coordinates?.lng || undefined}
            postalCode={propertyDetails.zip || ""}
            radiusMiles={5}
            limit={25}
            subjectValue={property?.assessed_value || 0}
            subjectSqft={property?.building_sqft || 0}
            subjectLotSqft={property?.lot_size_acres ? Math.round(property.lot_size_acres * 43560) : 0}
            subjectBeds={property?.bedrooms || 0}
            subjectBaths={property?.bathrooms || 0}
            subjectYearBuilt={property?.year_built || 0}
            subjectPropertyType={property?.property_type || ""}
            subjectTotalDue={property?.total_due || 0}
            defaultExpanded={true}
            onAnalysisComplete={handleLfbAnalysisComplete}
          />
        </section>

        {/* ===== SECTION 11: Investment Score Breakdown ===== */}
        <InvestmentScore
          totalScore={computedTotalScore}
          maxScore={computedMaxScore}
          grade={computedOverallGrade}
          categories={computedCategories}
          ratingDescription={
            computedTotalScore >= 100
              ? "This property shows excellent investment potential with strong scores across all criteria."
              : computedTotalScore >= 80
              ? "This property scores well across investment criteria with solid fundamentals."
              : computedTotalScore >= 60
              ? "This property has moderate investment potential - review concerns carefully."
              : "This property has limited investment appeal - significant issues identified."
          }
          strengths={computedStrengths}
          weaknesses={computedConcerns}
        />

        {/* ===== SECTION 12: Demographics ===== */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Users className="h-5 w-5" />
              Demographics
            </h2>
            {censusData?.demographics && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Census {censusData.demographics.dataYear} Data
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {censusData?.demographics?.population?.toLocaleString() || 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Population</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {censusData?.geographic?.countyName || `City of ${propertyDetails.city || 'Altoona'}`}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {censusData?.demographics?.medianHouseholdIncome ? `$${censusData.demographics.medianHouseholdIncome.toLocaleString()}` : 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Median Income</p>
              {censusData?.demographics?.unemploymentRate !== undefined && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {censusData.demographics.unemploymentRate}% unemployment
                </p>
              )}
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {censusData?.demographics?.medianHomeValue ? `$${censusData.demographics.medianHomeValue.toLocaleString()}` : 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Median Home Value</p>
              {censusData?.demographics?.ownerOccupiedPct !== undefined && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {censusData.demographics.ownerOccupiedPct}% owner occupied
                </p>
              )}
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {censusData?.demographics?.bachelorsDegreeOrHigherPct != null ? `${censusData.demographics.bachelorsDegreeOrHigherPct.toFixed(0)}%` : 'N/A'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Bachelor&apos;s Degree+</p>
              {censusData?.demographics?.medianAge !== undefined && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Median age: {censusData.demographics.medianAge}
                </p>
              )}
            </div>
          </div>
          {censusData?.demographics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {censusData.demographics.totalHousingUnits?.toLocaleString() || 'N/A'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Housing Units</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {censusData.demographics.vacancyRate?.toFixed(1) || 'N/A'}%
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Vacancy Rate</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {censusData.demographics.povertyPct?.toFixed(1) || 'N/A'}%
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Poverty Rate</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {censusData.geographic?.schoolDistrict ? 'Yes' : 'N/A'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">School District</p>
                {censusData.geographic?.schoolDistrict && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate" title={censusData.geographic.schoolDistrict}>
                    {censusData.geographic.schoolDistrict.length > 20
                      ? censusData.geographic.schoolDistrict.substring(0, 20) + '...'
                      : censusData.geographic.schoolDistrict}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ===== SECTION 13: FEMA Flood Zone Map ===== */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">
            <Droplets className="h-5 w-5" />
            FEMA Flood Zone Map
          </h2>
          <div className="aspect-video mb-4">
            <FEMAFloodMap
              lat={propertyDetails.coordinates.lat}
              lng={propertyDetails.coordinates.lng}
              address={fullAddress}
              zoom={14}
              height="100%"
              showExternalLink={true}
              showLegend={true}
              altText={`FEMA Flood Zone Map for ${propertyDetails.address}`}
            />
          </div>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
            <Info className="h-8 w-8 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-300">Flood Zone Data</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Use the interactive FEMA map above to check the flood zone for this property. Confirm zone designation before purchase.
              </p>
            </div>
          </div>
        </section>

        {/* ===== SECTION 14: Zoning Information ===== */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">
            <Building className="h-5 w-5" />
            Zoning Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Current Zoning</h4>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{property?.zoning || 'N/A'}</p>
                <p className="text-blue-700 dark:text-blue-300">{property?.land_use || 'N/A'}</p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Property Details</h4>
              <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Property Type:</span>
                  <span className="font-medium">{property?.is_vacant_lot
                    ? 'Vacant Lot'
                    : property?.is_likely_mobile_home
                      ? 'Mobile Home'
                      : (getPropertyTypeLabel(property?.property_type) || 'N/A')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Year Built:</span>
                  <span className="font-medium">{property?.year_built || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bedrooms:</span>
                  <span className="font-medium">{property?.bedrooms || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bathrooms:</span>
                  <span className="font-medium">{property?.bathrooms || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Assessed Value:</span>
                  <span className="font-medium">
                    {property?.assessed_value != null
                      ? `$${property.assessed_value.toLocaleString()}`
                      : 'N/A'}
                  </span>
                </div>
                {property?.assessed_improvement_value != null && (
                  <div className="flex justify-between">
                    <span>Improvement Value:</span>
                    <span className="font-medium">
                      ${property.assessed_improvement_value.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION 15: Market Analysis ===== */}
        <MarketAnalysis
          score={computedCategories.find(c => c.key === "market")?.score ?? 0}
          maxScore={25}
          grade={computedCategories.find(c => c.key === "market")?.grade ?? "C"}
          metrics={{
            medianSalePrice: combinedMarketData?.combined?.medianPrice || comparablesStats?.median_sold_price || censusData?.demographics?.medianHomeValue || 0,
            pricePerSqft: combinedMarketData?.combined?.avgPricePerSqft || combinedMarketData?.realty?.statistics?.avg_price_per_sqft || comparablesStats?.avg_price_per_sqft || 0,
            daysOnMarket: combinedMarketData?.combined?.avgDaysOnMarket || combinedMarketData?.realty?.statistics?.avg_days_on_market || 0,
            absorptionRate: combinedMarketData?.calculatedMetrics?.absorptionRate || 0,
            listToSaleRatio: combinedMarketData?.calculatedMetrics?.listToSaleRatio || 0,
            priceChangeYoY: combinedMarketData?.historicalMetrics?.priceChangeYoY || 0,
            recentSales: combinedMarketData?.combined?.recentSales || realComparables?.length || 0,
            activeListings: combinedMarketData?.combined?.activeListings || 0,
            salesVolumeChangeYoY: combinedMarketData?.historicalMetrics?.salesVolumeChangeYoY || 0,
            inventoryChangeYoY: 0,
          }}
          trends={{
            priceTrends: [],
            volumeTrends: [],
            domTrends: [],
          }}
          marketType={(combinedMarketData?.combined?.marketType as "balanced" | "buyers" | "sellers") || "balanced"}
          marketHealth={combinedMarketData?.combined?.marketHealth || 0}
          supplyDemand={(combinedMarketData?.calculatedMetrics?.supplyDemand as "balanced" | "undersupply" | "oversupply") || "balanced"}
          segments={[]}
          factors={computedCategories.find(c => c.key === "market")?.factors ?? []}
          concerns={!realComparables || realComparables.length < 3
            ? ["Limited comparable sales data available"]
            : []}
        />

        {/* ===== SECTION 16: Title Research & Liens ===== */}
        {apiData?.data?.titleReport && (
          <TitleResearch
            summary={{
              searchCompleted: apiData.data.titleReport.summary.searchCompleted,
              searchDate: apiData.data.titleReport.summary.searchDate
                ? new Date(apiData.data.titleReport.summary.searchDate)
                : undefined,
              searchProvider: apiData.data.titleReport.summary.searchProvider,
              totalLiens: apiData.data.titleReport.summary.totalLiens,
              totalLienAmount: apiData.data.titleReport.summary.totalLienAmount,
              survivingLiensCount: apiData.data.titleReport.summary.survivingLiensCount,
              survivingLiensAmount: apiData.data.titleReport.summary.survivingLiensAmount,
              issuesFound: apiData.data.titleReport.summary.issuesFound,
              overallRisk: apiData.data.titleReport.summary.overallRisk,
              titleInsuranceAvailable: apiData.data.titleReport.summary.titleInsuranceAvailable,
              titleInsuranceCost: apiData.data.titleReport.summary.titleInsuranceCost,
              estimatedClearingCost: apiData.data.titleReport.summary.estimatedClearingCost,
            }}
            liens={apiData.data.titleReport.liens?.map((lien) => ({
              id: lien.id,
              type: lien.type,
              holder: lien.holder,
              originalAmount: lien.originalAmount,
              currentBalance: lien.currentBalance,
              recordingDate: new Date(lien.recordingDate),
              recordingRef: lien.recordingRef,
              position: lien.position,
              survivesSale: lien.survivesSale,
              status: lien.status,
              notes: lien.notes,
            }))}
            ownershipHistory={apiData.data.titleReport.ownershipHistory?.map((record) => ({
              ownerName: record.ownerName,
              acquiredDate: new Date(record.acquiredDate),
              salePrice: record.salePrice,
              documentRef: record.documentRef,
              deedType: record.deedType,
            }))}
            issues={apiData.data.titleReport.issues?.map((issue) => ({
              type: issue.type,
              description: issue.description,
              severity: issue.severity,
              estimatedCost: issue.estimatedCost,
              resolution: issue.resolution,
              blocksPurchase: issue.blocksPurchase,
            }))}
            recommendations={apiData.data.titleReport.recommendations}
          />
        )}

        {/* ===== SECTION 17: Legal Disclaimer ===== */}
        <Disclaimers
          reportDate={new Date()}
          reportId={reportId}
          dataSources={[
            `${propertyDetails.county} County Tax Records`,
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
            { title: `${propertyDetails.county} County Tax Claim Bureau`, url: "#", description: "Official county resource" },
          ]}
        />

        {/* Print/Export/Share buttons */}
        <div className="fixed bottom-6 right-6 print:hidden no-print flex items-center gap-3">
          <ShareButton
            reportId={reportId}
            reportTitle={`${propertyDetails.address} Property Analysis`}
            variant="outline"
            className="bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          />
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
          <p className="text-xs mt-2">
            Report ID: {reportId} | Generated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </footer>
    </div>
  );
}
