"use client";

/**
 * DemoReportContainer - Container component for the demo report page
 *
 * This component handles:
 * - URL parameter parsing (propertyId)
 * - Data fetching from multiple API endpoints
 * - State management for various data sources
 * - Data transformation and merging
 * - Passing processed data to ReportPageLayout
 *
 * @module components/report/containers/DemoReportContainer
 * @author Claude Code Agent
 * @date 2026-01-22
 */

import * as React from "react";
import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

// Import hooks
import { usePropertyReport, usePropertiesWithRegrid } from "@/hooks/usePropertyReport";

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

// Import sample data
import {
  samplePropertyDetails,
  sampleCategories,
  sampleRiskAssessment,
  sampleInsuranceEstimates,
  sampleComparables,
  sampleFinancialAnalysis,
} from "@/lib/sample-data/report-demo-data";

/**
 * DemoReportContainerContent - Internal component with search params access
 */
function DemoReportContainerContent() {
  // URL Search Params for property selection
  const searchParams = useSearchParams();
  const propertyIdFromUrl = searchParams.get("propertyId");

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

  // Merge property report data with sample defaults for display
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

  // Fetch full analysis data from unified orchestrator
  const fetchFullAnalysis = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const [fullAnalysisResponse, legacyReportResponse] = await Promise.all([
        fetch("/api/report/full-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            address: `${activePropertyDetails.address}, ${activePropertyDetails.city}, ${activePropertyDetails.state} ${activePropertyDetails.zip}`,
            coordinates: activePropertyDetails.coordinates,
            options: {
              rehabScope: "moderate",
              holdingMonths: 6,
              includeLocationData: true,
            },
          }),
        }),
        fetch("/api/report/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      setLastFetched(new Date());

      // Parse legacy report for amenities data
      let legacyData: ApiResponse | null = null;
      if (legacyReportResponse.ok) {
        legacyData = await legacyReportResponse.json();
      }

      // Populate API data with amenities from legacy endpoint
      if (data.success && data.metadata) {
        setApiData({
          success: true,
          timestamp: data.metadata.generatedAt,
          dataQuality:
            data.metadata.confidenceLevel > 70
              ? "complete"
              : data.metadata.confidenceLevel > 40
              ? "partial"
              : "minimal",
          sources: data.metadata.sourcesUsed
            .map((name: string) => ({
              name,
              status: "ok" as const,
            }))
            .concat(
              data.metadata.sourcesFailed.map((name: string) => ({
                name,
                status: "error" as const,
              }))
            ),
          data: {
            property: {
              address: activePropertyDetails.address,
              coordinates: activePropertyDetails.coordinates,
              state: activePropertyDetails.state,
            },
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
      console.error("Failed to fetch full analysis:", error);
      if (error instanceof Error && error.name === "AbortError") {
        setApiError("Analysis request timed out after 60 seconds. Try again or check server logs.");
      } else {
        setApiError(error instanceof Error ? error.message : "Failed to fetch full analysis");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [activePropertyDetails]);

  // Auto-fetch on mount
  useEffect(() => {
    if (useRealData) {
      fetchFullAnalysis();
    }
  }, [fetchFullAnalysis, useRealData]);

  // Calculate investment scores from available data
  const calculatedInvestmentScores = useMemo(() => {
    if (!propertyReport && !comparablesData) {
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
  }, [propertyReport, comparablesData, activePropertyDetails]);

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
        // Skip comparables array as it requires RealtyComparable[] type which we don't have here
      };
    }

    return calculateFinancialAnalysis(financialInput);
  }, [activePropertyDetails, comparablesData]);

  // Prepare data for ReportPageLayout
  const reportData = useMemo(() => {
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
      propertyClass: null, // Not available in current data
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
      lastSaleDate: null, // Not available in current data
      lastSalePrice: null, // Not available in current data
      screenshotUrl: activePropertyDetails.imageUrl || null,
      regridUrl: null, // Could be generated if needed
      zillowUrl: null, // Could be generated if needed
    };

    return {
      title: "Property Analysis Report - Demo",
      reportId: `RPT-DEMO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(6, "0")}`,
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
      isShowingRealData: !!propertyReport,
      reportDate: new Date(),
      regridScreenshotUrl: activePropertyDetails.imageUrl || undefined,
    };
  }, [
    activePropertyDetails,
    totalScore,
    maxScore,
    overallGrade,
    overallRiskLevel,
    calculatedInvestmentScores,
    riskApiData,
    financialData,
    calculatedFinancialAnalysis,
    comparablesData,
    propertyReport,
  ]);

  // PDF export handler
  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      const filename = generateReportFilename(reportData.fullAddress, reportData.reportId);
      await exportReportToPDF(filename);
    } catch (error) {
      console.error("Failed to export PDF:", error);
    } finally {
      setIsExporting(false);
    }
  }, [reportData.fullAddress, reportData.reportId]);

  // Share handler
  const handleShare = useCallback(() => {
    // TODO: Implement share functionality
    // Future implementation: Share via Web Share API or generate shareable link
  }, [reportData.reportId]);

  // Show loading state
  if (isLoadingReport && propertyIdFromUrl) {
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
  if (reportError && propertyIdFromUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error loading report: {reportError}</p>
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
    />
  );
}

/**
 * DemoReportContainer - Main export with Suspense wrapper
 */
export function DemoReportContainer() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Loading Property Report...</p>
          </div>
        </div>
      }
    >
      <DemoReportContainerContent />
    </Suspense>
  );
}
