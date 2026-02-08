"use client";

/**
 * PropertyReportContainer - Container component for the dynamic property report page
 *
 * This component handles:
 * - Property ID from route params
 * - Data fetching from property API endpoint
 * - State management for various data sources
 * - Data transformation and merging
 * - Passing processed data to ReportPageLayout
 *
 * @module components/report/containers/PropertyReportContainer
 * @author Claude Code Agent
 * @date 2026-01-22
 */

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import property management types
import type { PropertyNote, PropertyImage, ActivityLogEntry } from "@/components/property-management";

// Import utilities
import {
  calculateLocationScores,
  calculateOverallLocationScore,
  type CensusDataForScoring,
} from "@/lib/utils/location-scoring";
import {
  calculateRiskAssessment,
  hasRealRiskData,
  type RiskCalculationInput,
} from "@/lib/utils/risk-assessment-calculator";
import {
  calculateAllMarketMetrics,
  calculatePriceSegmentsFromPrices,
  calculateTotalInvestmentScore,
  calculateOverallGrade,
  type MarketCalculationInput,
  type CalculatedMarketMetrics,
  type PriceSegment,
  type CalculatedCategoryScore,
} from "@/lib/utils/market-calculations";
import {
  calculateInvestmentScores,
  type InvestmentScoreInput,
} from "@/lib/utils/investment-score-calculations";
import {
  calculateFinancialAnalysis,
  type FinancialAnalysisInput,
} from "@/lib/utils/financial-analysis-calculations";
import { exportReportToPDF, generateReportFilename } from "@/lib/pdf-export";

// Import layout component
import { ReportPageLayout } from "../ReportPageLayout";

// Import types
import type { Grade, RiskLevel } from "@/types/report";
import type { CategoryScore } from "../sections/InvestmentScore";
import type { RiskAssessment, InsuranceEstimates } from "@/types/risk-analysis";
import type { FinancialAnalysis } from "@/lib/analysis/financial/types";
import type { ComparableProperty, ComparablesAnalysis } from "../sections/ComparablesSection";
import type { MarketMetrics } from "../sections/MarketAnalysis";
import type { ApiDataSource, ApiReportData, ApiResponse } from "@/types/api-report";
import type { PropertyDatabaseRow } from "@/types/property-page";

// Import fallback data
import {
  sampleCategories,
  sampleRiskAssessment,
  sampleInsuranceEstimates,
  sampleComparables,
  sampleFinancialAnalysis,
} from "@/lib/sample-data/report-fallback-data";

/**
 * Props for PropertyReportContainer
 */
export interface PropertyReportContainerProps {
  /**
   * Property ID from route params
   */
  propertyId: string;
}

/**
 * PropertyReportContainer - Container component for property-specific reports
 */
export function PropertyReportContainer({ propertyId }: PropertyReportContainerProps) {
  const router = useRouter();

  // State for property data from Supabase
  const [property, setProperty] = useState<PropertyDatabaseRow | null>(null);
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);
  const [propertyError, setPropertyError] = useState<string | null>(null);

  // State for PDF export loading
  const [isExporting, setIsExporting] = useState(false);

  // State for API data (legacy endpoint)
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // State for comparables data from Realty API
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
        confidence: "high" | "medium" | "low" | "insufficient";
        currentPeriodSales: number;
        previousPeriodSales: number;
      };
    } | null;
  } | null>(null);
  const [comparablesLoading, setComparablesLoading] = useState(false);
  const [comparablesError, setComparablesError] = useState<string | null>(null);

  // State for financial analysis
  const [financialData, setFinancialData] = useState<FinancialAnalysis | null>(null);
  const [financialLoading, setFinancialLoading] = useState(false);

  // State for risk assessment from API
  const [riskApiData, setRiskApiData] = useState<RiskAssessment | null>(null);
  const [riskApiLoading, setRiskApiLoading] = useState(false);

  // ============================================
  // Property Management State
  // ============================================

  // Edit/Save/Delete state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Watchlist state
  const [isOnWatchlist, setIsOnWatchlist] = useState(false);

  // Notes, images, and activity log
  const [notes, setNotes] = useState<PropertyNote[]>([]);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

  // Enrichment loading states
  const [isRegridLoading, setIsRegridLoading] = useState(false);
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);

  // Fetch property from Supabase
  useEffect(() => {
    async function fetchProperty() {
      if (!propertyId) return;

      setIsLoadingProperty(true);
      setPropertyError(null);

      try {
        const response = await fetch(`/api/properties/${propertyId}`);
        if (!response.ok) {
          throw new Error(`Property not found: ${response.status}`);
        }
        const json = await response.json();
        // Map API response to PropertyDatabaseRow interface
        const apiData = json.data || json;
        const mapped: PropertyDatabaseRow = {
          id: apiData.id,
          parcel_id: apiData.parcelId || apiData.parcel_id,
          property_address: apiData.address || apiData.property_address,
          city: apiData.city || "",
          state: apiData.state || "PA",
          zip: apiData.zipCode || apiData.zip_code || "",
          county_name: apiData.county || apiData.county_name,
          coordinates:
            apiData.latitude && apiData.longitude
              ? { lat: apiData.latitude, lng: apiData.longitude }
              : apiData.coordinates,
          assessed_value: apiData.assessedValue || apiData.assessed_value,
          market_value: apiData.regridData?.marketValue || apiData.market_value,
          total_due: apiData.totalDue || apiData.total_due,
          tax_amount: apiData.taxAmount || apiData.tax_amount,
          lot_size_sqft: apiData.regridData?.lotSizeSqFt || apiData.lot_size_sqft,
          lot_size_acres:
            apiData.regridData?.lotSizeAcres ||
            (typeof apiData.lotSize === "string"
              ? parseFloat(apiData.lotSize.replace(" acres", ""))
              : apiData.lotSize) ||
            apiData.lot_size_acres,
          building_sqft:
            apiData.squareFeet || apiData.regridData?.building_sqft || apiData.building_sqft,
          year_built: apiData.yearBuilt || apiData.regridData?.year_built || apiData.year_built,
          bedrooms: apiData.bedrooms || apiData.regridData?.bedrooms,
          bathrooms: apiData.bathrooms || apiData.regridData?.bathrooms,
          property_type:
            apiData.propertyType ||
            apiData.regridData?.propertyClass ||
            apiData.property_type,
          zoning: apiData.regridData?.zoning || apiData.zoning,
          land_use: apiData.regridData?.land_use || apiData.land_use,
          sale_type: apiData.saleType || apiData.sale_type,
          sale_date: apiData.saleDate || apiData.sale_date,
          auction_status: apiData.status || apiData.auction_status,
          owner_name: apiData.ownerName || apiData.regridData?.ownerName || apiData.owner_name,
          screenshot_url: apiData.regridData?.screenshotUrl || apiData.images?.[0]?.url,
          regrid_scrape_method: apiData.regridData?.scrapeMethod,
          regrid_data_quality: apiData.regridData?.dataQualityScore,
        };
        setProperty(mapped);
      } catch (error) {
        console.error("Failed to fetch property:", error);
        setPropertyError(error instanceof Error ? error.message : "Failed to fetch property");
      } finally {
        setIsLoadingProperty(false);
      }
    }

    fetchProperty();
  }, [propertyId]);

  // Transform property database row to property details format
  const activePropertyDetails = useMemo(() => {
    if (!property) {
      return null;
    }

    return {
      parcelId: property.parcel_id || "Unknown",
      address: property.property_address || "Unknown Address",
      city: property.city || "Unknown",
      state: property.state || "PA",
      zip: property.zip || "",
      county: property.county_name || "Unknown County",
      propertyType: property.property_type || "Residential",
      lotSize: property.lot_size_acres || property.lot_size_sqft || "Not available",
      buildingSqft: property.building_sqft || 0,
      yearBuilt: property.year_built || 0,
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      stories: 2, // Default
      zoning: property.zoning || "Not available",
      assessedValue: property.assessed_value || 0,
      taxAmount: property.total_due || property.tax_amount || 0,
      ownerName: property.owner_name || "Unknown Owner",
      ownerAddress: property.property_address || "Unknown",
      legalDescription: "See county records for legal description",
      imageUrl: property.screenshot_url || "/placeholder-property.jpg",
      coordinates: property.coordinates || { lat: 40.5186, lng: -78.3947 },
      marketValue: property.market_value,
      landUse: property.land_use,
      saleType: property.sale_type || "repository",
      saleDate: property.sale_date,
      minimumBid: property.total_due || property.tax_amount,
      auctionStatus: property.auction_status || "upcoming",
      hasRegridData: !!property.screenshot_url,
    };
  }, [property]);

  // Fetch report data from API
  const fetchReportData = useCallback(async () => {
    if (!property) return;

    setIsLoading(true);
    setApiError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const address = property.property_address
        ? `${property.property_address}, ${property.city || ""}, ${property.state || "PA"} ${property.zip || ""}`
        : "";

      const response = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          propertyId: property.id,
          address,
          coordinates: property.coordinates,
          state: property.state || "PA",
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setApiData(data);
      setLastFetched(new Date());
    } catch (error) {
      console.error("Failed to fetch report data:", error);
      if (error instanceof Error && error.name === "AbortError") {
        setApiError("Report generation timed out after 60 seconds. Try again or check server logs.");
      } else {
        setApiError(error instanceof Error ? error.message : "Failed to fetch report data");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [property]);

  // Auto-fetch on mount
  useEffect(() => {
    if (property) {
      fetchReportData();
    }
  }, [property, fetchReportData]);

  // Calculate investment scores from available data
  const calculatedInvestmentScores = useMemo(() => {
    if (!property && !comparablesData) {
      return null;
    }

    if (!activePropertyDetails) {
      return null;
    }

    const scoreInput: InvestmentScoreInput = {
      property: {
        assessedValue: activePropertyDetails.assessedValue || undefined,
        marketValue: activePropertyDetails.marketValue || undefined,
        buildingSqft: activePropertyDetails.buildingSqft || undefined,
        lotSizeSqft: (() => {
          const acres =
            typeof activePropertyDetails.lotSize === "number"
              ? activePropertyDetails.lotSize
              : parseFloat(String(activePropertyDetails.lotSize)) || 0;
          return acres > 0 ? acres * 43560 : undefined;
        })(),
        yearBuilt: activePropertyDetails.yearBuilt || undefined,
        bedrooms: activePropertyDetails.bedrooms || undefined,
        bathrooms: activePropertyDetails.bathrooms || undefined,
        propertyType: activePropertyDetails.propertyType,
        minimumBid: activePropertyDetails.minimumBid || activePropertyDetails.taxAmount || undefined,
        taxAmount: activePropertyDetails.taxAmount || undefined,
      },
      // Add market data if available
      market: comparablesData
        ? {
            medianSalePrice: comparablesData.analysis.medianSalePrice ?? undefined,
            avgPricePerSqft: comparablesData.analysis.avgPricePerSqft ?? undefined,
            avgDaysOnMarket: comparablesData.analysis.avgDaysOnMarket ?? undefined,
          }
        : undefined,
    };

    return calculateInvestmentScores(scoreInput);
  }, [property, comparablesData, activePropertyDetails]);

  // Calculate overall grade
  const totalScore = useMemo(() => {
    if (calculatedInvestmentScores) {
      return calculatedInvestmentScores.totalScore;
    }
    return sampleCategories.reduce((sum, cat) => sum + cat.score, 0);
  }, [calculatedInvestmentScores]);

  const maxScore = useMemo(() => {
    if (calculatedInvestmentScores) {
      return calculatedInvestmentScores.maxTotalScore;
    }
    return 100; // Default max score
  }, [calculatedInvestmentScores]);

  const overallGrade: Grade = useMemo(() => {
    if (calculatedInvestmentScores) {
      return calculatedInvestmentScores.overallGrade;
    }
    return calculateOverallGrade(totalScore, maxScore);
  }, [calculatedInvestmentScores, totalScore, maxScore]);

  // Get overall risk level from risk assessment
  const overallRiskLevel: RiskLevel = useMemo(() => {
    const riskLevel = riskApiData?.overallRisk || sampleRiskAssessment.overallRisk;
    // Map to RiskLevel type (handles both "medium" and "moderate")
    if (riskLevel === "low") return "low";
    if (riskLevel === "high" || riskLevel === "severe") return "high";
    return "medium"; // Default to medium for "moderate" or any other value
  }, [riskApiData]);

  // Calculate financial analysis
  const calculatedFinancialAnalysis = useMemo((): FinancialAnalysis | null => {
    if (!activePropertyDetails) {
      return null;
    }

    const hasPropertyValue =
      activePropertyDetails.assessedValue ||
      activePropertyDetails.marketValue ||
      activePropertyDetails.minimumBid ||
      activePropertyDetails.taxAmount;

    if (!hasPropertyValue) {
      return null;
    }

    const financialInput: FinancialAnalysisInput = {
      property: {
        assessedValue: activePropertyDetails.assessedValue ?? undefined,
        marketValue: activePropertyDetails.marketValue ?? undefined,
        buildingSqft: activePropertyDetails.buildingSqft ?? undefined,
        lotSizeSqft: (() => {
          const acres =
            typeof activePropertyDetails.lotSize === "number"
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
        saleType: activePropertyDetails.saleType || "repository",
        buyersPremiumPct: 0.1, // 10% buyer's premium typical
      },
    };

    // Add market data if we have comparables
    if (comparablesData?.analysis) {
      financialInput.market = {
        medianSalePrice: comparablesData.analysis.medianSalePrice ?? undefined,
        avgPricePerSqft: comparablesData.analysis.avgPricePerSqft ?? undefined,
      };
    }

    return calculateFinancialAnalysis(financialInput);
  }, [activePropertyDetails, comparablesData]);

  // Prepare data for ReportPageLayout
  const reportData = useMemo(() => {
    if (!activePropertyDetails) {
      return null;
    }

    const fullAddress = `${activePropertyDetails.address}, ${activePropertyDetails.city}, ${activePropertyDetails.state} ${activePropertyDetails.zip}`;

    // Quick stats
    const lotSizeAcres = (() => {
      const acres =
        typeof activePropertyDetails.lotSize === "number"
          ? activePropertyDetails.lotSize
          : parseFloat(String(activePropertyDetails.lotSize)) || 0;
      return acres > 0 ? acres : null;
    })();

    const buildingSqft = activePropertyDetails.buildingSqft || null;
    const discount =
      activePropertyDetails.assessedValue && activePropertyDetails.taxAmount
        ? `${(
            (1 - activePropertyDetails.taxAmount / activePropertyDetails.assessedValue) *
            100
          ).toFixed(0)}%`
        : "N/A";

    // Investment score (cast to CategoryScore[] for type compatibility)
    const investmentScore = {
      totalScore,
      maxScore,
      grade: overallGrade,
      categories: (calculatedInvestmentScores
        ? calculatedInvestmentScores.categories
        : sampleCategories) as CategoryScore[],
      strengths: ["Below market value", "Low acquisition cost"],
      weaknesses: ["Limited market data"],
    };

    // Location details
    const locationDetails = {
      address: activePropertyDetails.address,
      city: activePropertyDetails.city,
      state: activePropertyDetails.state,
      zip: activePropertyDetails.zip || null,
      county: activePropertyDetails.county,
      coordinates: activePropertyDetails.coordinates,
      parcelId: activePropertyDetails.parcelId,
      zoning: activePropertyDetails.zoning || null,
      legalDescription: activePropertyDetails.legalDescription || null,
    };

    // Location analysis (simplified for now - can be enhanced later)
    const locationAnalysis = {
      score: 75,
      maxScore: 100,
      grade: "B+" as Grade,
      neighborhood: `${activePropertyDetails.city}, ${activePropertyDetails.county} County`,
      stats: {
        medianIncome: undefined,
        populationDensity: undefined,
        homeownershipRate: undefined,
        medianAge: undefined,
        vacancyRate: undefined,
        crimeRate: "medium" as const,
        schoolRating: undefined,
        walkScore: undefined,
      },
      amenities: [],
      trends: [],
      factors: ["Established neighborhood", "Accessible location"],
      concerns: [],
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${activePropertyDetails.coordinates.lat},${activePropertyDetails.coordinates.lng}`,
      dataSourceType: "sample" as const,
    };

    // Terrain data (simplified)
    const terrainData = null;

    // Zoning info
    const zoningInfo = {
      code: activePropertyDetails.zoning || "Unknown",
      name: "Residential",
      permittedUses: ["Single Family Residential"],
      minLotSizeSqft: null,
      frontSetbackFt: null,
      sideSetbackFt: null,
      maxHeightFt: null,
    };

    // Risk assessment
    const riskAssessment = riskApiData || sampleRiskAssessment;

    // Financial analysis
    const financialAnalysis = financialData || calculatedFinancialAnalysis || sampleFinancialAnalysis;

    // Comparables
    const comparables = comparablesData
      ? {
          properties: comparablesData.comparables,
          analysis: comparablesData.analysis,
          dataSourceType: "live" as const,
        }
      : null;

    // Market analysis (simplified)
    const marketAnalysis = {
      score: 70,
      maxScore: 100,
      grade: "B" as Grade,
      metrics: {
        medianSalePrice: comparablesData?.analysis.medianSalePrice || 150000,
        pricePerSqft: comparablesData?.analysis.avgPricePerSqft || 100,
        daysOnMarket: comparablesData?.analysis.avgDaysOnMarket || 45,
        activeListings: comparablesData?.activeListingsCount || undefined,
        recentSales: comparablesData?.comparables.length || undefined,
        absorptionRate: undefined,
        listToSaleRatio: undefined,
        priceChangeYoY: comparablesData?.historicalMetrics?.priceChangeYoY || undefined,
        salesVolumeChangeYoY: comparablesData?.historicalMetrics?.salesVolumeChangeYoY || undefined,
        inventoryChangeYoY: undefined,
      },
    };

    // Property details for PropertySummary (matching PropertyDetails interface)
    const propertyDetails = {
      parcelId: activePropertyDetails.parcelId,
      address: activePropertyDetails.address,
      city: activePropertyDetails.city,
      state: activePropertyDetails.state,
      zip: activePropertyDetails.zip,
      county: activePropertyDetails.county,
      propertyType: activePropertyDetails.propertyType,
      propertyClass: null,
      zoning: activePropertyDetails.zoning,
      lotSizeSqft: (() => {
        const acres =
          typeof activePropertyDetails.lotSize === "number"
            ? activePropertyDetails.lotSize
            : parseFloat(String(activePropertyDetails.lotSize)) || 0;
        return acres > 0 ? acres * 43560 : null;
      })(),
      lotSizeAcres: (() => {
        const acres =
          typeof activePropertyDetails.lotSize === "number"
            ? activePropertyDetails.lotSize
            : parseFloat(String(activePropertyDetails.lotSize)) || 0;
        return acres > 0 ? acres : null;
      })(),
      buildingSqft: activePropertyDetails.buildingSqft || null,
      yearBuilt: activePropertyDetails.yearBuilt || null,
      bedrooms: activePropertyDetails.bedrooms || null,
      bathrooms: activePropertyDetails.bathrooms || null,
      ownerName: activePropertyDetails.ownerName,
      assessedValue: activePropertyDetails.assessedValue || null,
      marketValue: activePropertyDetails.marketValue || null,
      lastSaleDate: null,
      lastSalePrice: null,
      screenshotUrl: activePropertyDetails.imageUrl || null,
      regridUrl: null,
      zillowUrl: null,
    };

    return {
      title: "Property Analysis Report",
      reportId: `RPT-${propertyId.slice(0, 8).toUpperCase()}-${new Date().getFullYear()}`,
      fullAddress,
      overallGrade,
      overallRiskLevel,
      propertyDetails,
      quickStats: {
        lotSizeAcres,
        buildingSqft,
        discount,
      },
      investmentScore,
      locationDetails,
      locationAnalysis,
      terrainData,
      zoningInfo,
      riskAssessment,
      financialAnalysis,
      comparables,
      marketAnalysis,
      isShowingRealData: true,
      reportDate: new Date(),
    };
  }, [
    activePropertyDetails,
    propertyId,
    totalScore,
    maxScore,
    overallGrade,
    overallRiskLevel,
    calculatedInvestmentScores,
    riskApiData,
    financialData,
    calculatedFinancialAnalysis,
    comparablesData,
  ]);

  // PDF export handler
  const handleExportPDF = useCallback(async () => {
    if (!reportData) return;

    setIsExporting(true);
    try {
      const filename = generateReportFilename(reportData.fullAddress, reportData.reportId);
      await exportReportToPDF(filename);
    } catch (error) {
      console.error("Failed to export PDF:", error);
    } finally {
      setIsExporting(false);
    }
  }, [reportData]);

  // Share handler
  const handleShare = useCallback(() => {
    if (!reportData) return;
    // TODO: Implement share functionality
    // Future implementation: Share via Web Share API or generate shareable link
  }, [reportData]);

  // ============================================
  // Property Management Callbacks
  // ============================================

  // Edit mode callbacks
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // TODO: Implement save API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Watchlist toggle
  const handleWatchlistToggle = useCallback(async () => {
    try {
      setIsOnWatchlist(prev => !prev);
      // TODO: Implement watchlist API call
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
      setIsOnWatchlist(prev => !prev); // Revert on error
    }
  }, []);

  // Delete handler
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      // TODO: Implement delete API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder
      // Redirect after delete
      window.location.href = '/properties';
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // Notes change handler
  const handleNotesChange = useCallback((newNotes: PropertyNote[]) => {
    setNotes(newNotes);
    // TODO: Implement notes save API call
  }, []);

  // Data enrichment handlers
  const handleFetchRegrid = useCallback(async () => {
    setIsRegridLoading(true);
    try {
      // TODO: Implement Regrid fetch
      await new Promise(resolve => setTimeout(resolve, 2000)); // Placeholder
    } catch (error) {
      console.error('Failed to fetch Regrid:', error);
    } finally {
      setIsRegridLoading(false);
    }
  }, []);

  const handleCaptureScreenshots = useCallback(async () => {
    setIsScreenshotLoading(true);
    try {
      // TODO: Implement screenshot capture
      await new Promise(resolve => setTimeout(resolve, 2000)); // Placeholder
    } catch (error) {
      console.error('Failed to capture screenshots:', error);
    } finally {
      setIsScreenshotLoading(false);
    }
  }, []);

  // Handle back button
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Show loading state
  if (isLoadingProperty) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading Property Report...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (propertyError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md">
          <p className="text-red-600 dark:text-red-400 mb-4">Error loading property: {propertyError}</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Show error if no property data
  if (!property || !activePropertyDetails || !reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md">
          <p className="text-red-600 dark:text-red-400 mb-4">Property not found</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Render the report layout
  return (
    <ReportPageLayout
      {...reportData}
      onExportPDF={handleExportPDF}
      onShare={handleShare}

      // Property management features
      showManagementFeatures={true}
      propertyId={propertyId}
      canEdit={true} // TODO: Get from auth context
      canDelete={true} // TODO: Get from auth context
      isEditing={isEditing}
      isOnWatchlist={isOnWatchlist}
      isSaving={isSaving}
      isDeleting={isDeleting}
      propertyVersion={1} // TODO: Get from property data
      lastModified={new Date().toISOString()} // TODO: Get from property data

      // Edit callbacks
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      onWatchlistToggle={handleWatchlistToggle}
      onDelete={handleDelete}

      // Enrichment status
      enrichmentStatus={{
        regridComplete: !!property?.screenshot_url,
        regridLastFetched: undefined, // TODO: Get from property data
        screenshotComplete: !!property?.screenshot_url,
        screenshotCount: property?.screenshot_url ? 1 : 0,
        validationStatus: "pending", // TODO: Get from property data
      }}
      onFetchRegrid={handleFetchRegrid}
      onCaptureScreenshots={handleCaptureScreenshots}
      isRegridLoading={isRegridLoading}
      isScreenshotLoading={isScreenshotLoading}
      allowRefresh={!isEditing}

      // Notes and activity
      notes={notes}
      onNotesChange={handleNotesChange}
      currentUserName="User" // TODO: Get from auth context
      images={images}
      activityLog={activityLog}

      // Regrid screenshot for map view
      regridScreenshotUrl={property?.screenshot_url}
      isRegridPlaceholder={
        property?.regrid_scrape_method === 'placeholder'
        || (property?.regrid_data_quality != null && property.regrid_data_quality < 0.5)
      }
    />
  );
}
