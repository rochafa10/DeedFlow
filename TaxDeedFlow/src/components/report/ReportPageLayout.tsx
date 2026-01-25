"use client";

import * as React from "react";
import { Printer, Share2, FileText, CheckCircle, Map, Mountain, Building, ArrowLeft, Home, ChevronRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataSourceBadge } from "@/components/ui/data-source-badge";

// Import report section components
import { PropertySummary, type PropertyDetails } from "./sections/PropertySummary";
import { InvestmentScore, type CategoryScore } from "./sections/InvestmentScore";
import { LocationAnalysis, type NeighborhoodStats, type NearbyAmenity, type MarketTrend } from "./sections/LocationAnalysis";
import { MarketAnalysis, type MarketMetrics } from "./sections/MarketAnalysis";
import { ComparablesSection, type ComparableProperty, type ComparablesAnalysis } from "./sections/ComparablesSection";
import { Disclaimers } from "./sections/Disclaimers";
import { PropertyManagementSection } from "./sections/PropertyManagementSection";
import { RiskOverviewCard } from "./risk/RiskOverviewCard";
import { InsuranceEstimateCard } from "./risk/InsuranceEstimateCard";
import { FinancialDashboard } from "../financial/FinancialDashboard";
import { GoogleMapStatic } from "./maps/GoogleMapStatic";
import { GoogleStreetViewStatic } from "./maps/GoogleStreetViewStatic";

// Import property management components
import {
  PropertyActionBar,
  type PropertyNote,
  type PropertyImage,
  type ActivityLogEntry,
} from "@/components/property-management";

// Import types
import type { Grade, RiskLevel } from "@/types/report";
import type { RiskAssessment, InsuranceEstimates } from "@/types/risk-analysis";
import type { FinancialAnalysis } from "@/lib/analysis/financial/types";

/**
 * Coordinates for map display
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Zoning information
 */
export interface ZoningInfo {
  code: string;
  name: string;
  permittedUses: string[];
  minLotSizeSqft: number | null;
  frontSetbackFt: number | null;
  sideSetbackFt: number | null;
  maxHeightFt: number | null;
}

/**
 * Terrain analysis data
 */
export interface TerrainData {
  elevation: number;
  elevationFeet: number;
  averageSlope: number | null;
  maxSlope: number | null;
  slopeDirection: string | null;
  classification: string;
  classificationLabel: string;
  stability: "stable" | "moderate_risk" | "high_risk";
  stabilityLabel: string;
  assessment: string;
}

/**
 * Quick stats displayed in header
 */
export interface QuickStats {
  lotSizeAcres: number | null;
  buildingSqft: number | null;
  discount: string;
}

/**
 * Location details section data
 */
export interface LocationDetails {
  address: string;
  city: string | null;
  state: string;
  zip: string | null;
  county: string;
  coordinates: Coordinates;
  parcelId: string;
  zoning: string | null;
  legalDescription: string | null;
}

/**
 * Props for the ReportPageLayout component
 */
export interface ReportPageLayoutProps {
  /** Report title/header */
  title: string;
  /** Report ID for display */
  reportId: string;
  /** Property address for file naming */
  fullAddress: string;

  /** Overall grade */
  overallGrade: Grade;
  /** Overall risk level */
  overallRiskLevel: RiskLevel;

  /** Property summary data */
  propertyDetails: PropertyDetails;

  /** Quick stats for header */
  quickStats: QuickStats;

  /** Investment score data */
  investmentScore: {
    totalScore: number;
    maxScore: number;
    grade: Grade;
    categories: CategoryScore[];
    strengths?: string[];
    weaknesses?: string[];
  };

  /** Location details */
  locationDetails: LocationDetails;

  /** Location analysis data */
  locationAnalysis: {
    score: number;
    maxScore: number;
    grade: Grade;
    neighborhood: string;
    stats: NeighborhoodStats;
    amenities: NearbyAmenity[];
    trends: MarketTrend[];
    factors: string[];
    concerns: string[];
    googleMapsUrl: string;
    dataYear?: number;
    dataSourceType?: "live" | "sample" | "partial" | "error";
  };

  /** Terrain/slope data */
  terrainData: TerrainData | null;

  /** Zoning information */
  zoningInfo: ZoningInfo;
  zoningDataSourceType?: "live" | "sample" | "partial" | "error";

  /** Risk assessment data */
  riskAssessment: RiskAssessment;

  /** Financial analysis data */
  financialAnalysis: FinancialAnalysis;

  /** Comparables data */
  comparables: {
    properties: ComparableProperty[];
    analysis: ComparablesAnalysis;
    dataSourceType?: "live" | "sample" | "partial" | "error";
  } | null;

  /** Market analysis data */
  marketAnalysis: {
    score: number;
    maxScore: number;
    grade: Grade;
    metrics: MarketMetrics;
  };

  /** Whether showing real or sample data */
  isShowingRealData: boolean;

  /** Report generation date */
  reportDate: Date;

  /** PDF export handler */
  onExportPDF?: () => void;

  /** Share button handler */
  onShare?: () => void;

  /** Additional CSS classes */
  className?: string;

  // ============================================
  // Property Management Props (all optional for backwards compatibility)
  // ============================================

  /** Property ID for management features */
  propertyId?: string;

  /** Whether user can edit this property */
  canEdit?: boolean;
  /** Whether user can delete this property */
  canDelete?: boolean;
  /** Whether property is in edit mode */
  isEditing?: boolean;
  /** Whether property is on watchlist */
  isOnWatchlist?: boolean;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Whether delete is in progress */
  isDeleting?: boolean;
  /** Property version for edit mode */
  propertyVersion?: number;
  /** Last modified timestamp */
  lastModified?: string;

  /** Edit callbacks */
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onWatchlistToggle?: () => void;
  onDelete?: () => void;

  /** Data enrichment status */
  enrichmentStatus?: {
    regridComplete: boolean;
    regridLastFetched?: string;
    screenshotComplete: boolean;
    screenshotCount: number;
    validationStatus: "pending" | "approved" | "caution" | "rejected";
  };
  /** Enrichment callbacks */
  onFetchRegrid?: () => void;
  onCaptureScreenshots?: () => void;
  isRegridLoading?: boolean;
  isScreenshotLoading?: boolean;
  allowRefresh?: boolean;

  /** Property notes */
  notes?: PropertyNote[];
  onNotesChange?: (notes: PropertyNote[]) => void;
  currentUserName?: string;

  /** Property images */
  images?: PropertyImage[];

  /** Activity log */
  activityLog?: ActivityLogEntry[];

  /** Regrid aerial screenshot URL */
  regridScreenshotUrl?: string;

  /** Whether to show management features */
  showManagementFeatures?: boolean;
}

/**
 * ReportPageLayout - Main presentation component for property analysis reports
 *
 * This is a pure presentation component that receives all processed data as props
 * and renders the complete report layout. It does not contain any data fetching
 * or transformation logic.
 *
 * Features:
 * - Report header with title, ID, and action buttons
 * - Quick stats summary
 * - 16+ report sections organized logically
 * - Responsive grid layouts
 * - Dark mode support
 * - Accessibility features
 * - Optional property management features (breadcrumbs, action bar, management section)
 *
 * @example
 * ```tsx
 * <ReportPageLayout
 *   title="Property Analysis Report"
 *   reportId="RPT-2026-001"
 *   fullAddress="123 Main St, Altoona, PA 16602"
 *   overallGrade="B+"
 *   overallRiskLevel="medium"
 *   propertyDetails={propertyDetails}
 *   investmentScore={scoreData}
 *   locationAnalysis={locationData}
 *   // ... other props
 *   showManagementFeatures={true}
 *   propertyId="abc123"
 *   canEdit={true}
 *   onEdit={handleEdit}
 * />
 * ```
 */
export function ReportPageLayout({
  title,
  reportId,
  fullAddress,
  overallGrade,
  overallRiskLevel,
  propertyDetails,
  quickStats,
  investmentScore,
  locationDetails,
  locationAnalysis,
  terrainData,
  zoningInfo,
  zoningDataSourceType = "sample",
  riskAssessment,
  financialAnalysis,
  comparables,
  marketAnalysis,
  isShowingRealData,
  reportDate,
  onExportPDF,
  onShare,
  className,
  // Property management props with defaults
  propertyId,
  canEdit = false,
  canDelete = false,
  isEditing = false,
  isOnWatchlist = false,
  isSaving = false,
  isDeleting = false,
  propertyVersion,
  lastModified,
  onEdit,
  onSave,
  onCancel,
  onWatchlistToggle,
  onDelete,
  enrichmentStatus,
  onFetchRegrid,
  onCaptureScreenshots,
  isRegridLoading = false,
  isScreenshotLoading = false,
  allowRefresh = true,
  notes,
  onNotesChange,
  currentUserName = "User",
  images,
  activityLog,
  regridScreenshotUrl,
  showManagementFeatures = false,
}: ReportPageLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-slate-50 dark:bg-slate-900 py-8", className)}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* ===== BREADCRUMBS (when management features enabled) ===== */}
        {showManagementFeatures && (
          <nav
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <Link
              href="/properties"
              className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Properties
            </Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="text-slate-900 dark:text-slate-100 font-medium">
              Analysis Report
            </span>
          </nav>
        )}

        {/* ===== HEADER SECTION ===== */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {title}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {fullAddress}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                Report ID: {reportId}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {onExportPDF && (
                <Button
                  onClick={onExportPDF}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Export PDF
                </Button>
              )}
              {onShare && (
                <Button
                  onClick={onShare}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              )}
              <DataSourceBadge type={isShowingRealData ? "live" : "sample"} />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {quickStats.lotSizeAcres !== null
                  ? `${quickStats.lotSizeAcres.toFixed(2)} ac`
                  : "N/A"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Lot Size</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {quickStats.buildingSqft !== null
                  ? `${quickStats.buildingSqft.toLocaleString()} sqft`
                  : "N/A"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Building Size</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {quickStats.discount}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Discount</p>
            </div>
          </div>
        </div>

        {/* ===== PROPERTY ACTION BAR (when management features enabled) ===== */}
        {showManagementFeatures && (
          <PropertyActionBar
            isEditing={isEditing}
            isOnWatchlist={isOnWatchlist}
            canEdit={canEdit}
            canDelete={canDelete}
            isSaving={isSaving}
            isDeleting={isDeleting}
            version={propertyVersion}
            lastModified={lastModified}
            onEdit={onEdit ?? (() => {})}
            onSave={onSave ?? (() => {})}
            onCancel={onCancel ?? (() => {})}
            onWatchlistToggle={onWatchlistToggle ?? (() => {})}
            onDelete={onDelete ?? (() => {})}
            className="mb-6"
          />
        )}

        {/* ===== MAIN CONTENT SECTIONS ===== */}
        <div className="space-y-6">
          {/* Section 1: Property Summary */}
          <PropertySummary
            property={propertyDetails}
            grade={overallGrade}
            riskLevel={overallRiskLevel}
          />

          {/* Section 2: Investment Score */}
          <InvestmentScore
            totalScore={investmentScore.totalScore}
            maxScore={investmentScore.maxScore}
            grade={investmentScore.grade}
            categories={investmentScore.categories}
            strengths={investmentScore.strengths}
            weaknesses={investmentScore.weaknesses}
            dataSourceType={isShowingRealData ? "live" : "sample"}
          />

          {/* Section 3: Comparables */}
          {comparables && (
            <ComparablesSection
              comparables={comparables.properties}
              analysis={comparables.analysis}
              subjectProperty={{
                sqft: propertyDetails.buildingSqft || 0,
                lotSizeAcres: propertyDetails.lotSizeAcres || 0,
                yearBuilt: propertyDetails.yearBuilt || 0,
                bedrooms: propertyDetails.bedrooms || 0,
                bathrooms: propertyDetails.bathrooms || 0,
              }}
              dataSourceType={comparables.dataSourceType}
            />
          )}

          {/* Section 4: Property Visualization (Maps) - 2x2 Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Map View */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                <Map className="h-5 w-5" />
                Map View
              </h3>
              <div className="aspect-video">
                <GoogleMapStatic
                  lat={locationDetails.coordinates.lat}
                  lng={locationDetails.coordinates.lng}
                  address={fullAddress}
                  zoom={17}
                  mapType="roadmap"
                  height={300}
                  showExternalLink={true}
                  altText={`Map of ${locationDetails.address}`}
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
                  lat={locationDetails.coordinates.lat}
                  lng={locationDetails.coordinates.lng}
                  address={fullAddress}
                  zoom={19}
                  mapType="satellite"
                  height={300}
                  showExternalLink={true}
                  altText={`Satellite view of ${locationDetails.address}`}
                />
              </div>
            </div>

            {/* Street View */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                <Map className="h-5 w-5" />
                Street View
              </h3>
              <div className="aspect-video">
                <GoogleStreetViewStatic
                  lat={locationDetails.coordinates.lat}
                  lng={locationDetails.coordinates.lng}
                  address={fullAddress}
                  heading={90}
                  pitch={0}
                  height={300}
                  showExternalLink={true}
                  altText={`Street view of ${locationDetails.address}`}
                />
              </div>
            </div>

            {/* Regrid Aerial View */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                <Map className="h-5 w-5" />
                Regrid View
              </h3>
              <div className="aspect-video relative overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                {regridScreenshotUrl ? (
                  <img
                    src={regridScreenshotUrl}
                    alt={`Regrid aerial view of ${locationDetails.address}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                    <AlertCircle className="h-8 w-8 mb-2 text-amber-500" />
                    <p className="font-medium">No Regrid Image</p>
                    <p className="text-sm">Screenshot not yet captured</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 5: Location Details */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                <Map className="h-5 w-5" />
                Location Details
              </h2>
              <DataSourceBadge type={isShowingRealData ? "live" : "sample"} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Full Address
                </h4>
                <p className="text-slate-900 dark:text-slate-100">
                  {locationDetails.address}
                  <br />
                  {locationDetails.city}, {locationDetails.state} {locationDetails.zip}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                  County
                </h4>
                <p className="text-slate-900 dark:text-slate-100">
                  {locationDetails.county} County
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Coordinates
                </h4>
                <p className="text-slate-900 dark:text-slate-100">
                  {locationDetails.coordinates.lat.toFixed(4)},{" "}
                  {locationDetails.coordinates.lng.toFixed(4)}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Parcel ID
                </h4>
                <p className="text-slate-900 dark:text-slate-100 font-mono">
                  {locationDetails.parcelId}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Zoning
                </h4>
                <p className="text-slate-900 dark:text-slate-100">
                  {locationDetails.zoning || "Not available"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Legal Description
                </h4>
                <p className="text-slate-900 dark:text-slate-100 text-sm">
                  {locationDetails.legalDescription || "Not available"}
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Location Analysis */}
          <LocationAnalysis
            score={locationAnalysis.score}
            maxScore={locationAnalysis.maxScore}
            grade={locationAnalysis.grade}
            neighborhood={locationAnalysis.neighborhood}
            stats={locationAnalysis.stats}
            amenities={locationAnalysis.amenities}
            trends={locationAnalysis.trends}
            factors={locationAnalysis.factors}
            concerns={locationAnalysis.concerns}
            googleMapsUrl={locationAnalysis.googleMapsUrl}
            dataYear={locationAnalysis.dataYear}
            dataSourceType={locationAnalysis.dataSourceType}
          />

          {/* Section 7: Slope & Terrain Analysis */}
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
                  {terrainData ? `${terrainData.elevation}m` : "—"}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {terrainData ? `${terrainData.elevationFeet}ft` : ""} above sea level
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">Average Slope</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {terrainData && terrainData.averageSlope !== null
                    ? `${terrainData.averageSlope}%`
                    : "—"}
                </p>
                <p
                  className={cn(
                    "text-sm",
                    terrainData && (terrainData.classification === "flat" ||
                      terrainData.classification === "gentle")
                      ? "text-emerald-600 dark:text-emerald-400"
                      : terrainData && terrainData.classification === "moderate"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {terrainData && terrainData.classificationLabel ? terrainData.classificationLabel : "Calculating..."}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">Max Slope</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {terrainData && terrainData.maxSlope !== null
                    ? `${terrainData.maxSlope}%`
                    : "—"}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {terrainData && terrainData.slopeDirection && terrainData.slopeDirection !== "flat"
                    ? `Steepest toward ${terrainData.slopeDirection}`
                    : "Relatively flat terrain"}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">Classification</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    terrainData && terrainData.stability === "stable"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : terrainData && terrainData.stability === "moderate_risk"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {terrainData && terrainData.stability === "stable"
                    ? "Stable"
                    : terrainData && terrainData.stability === "moderate_risk"
                    ? "Moderate"
                    : terrainData && terrainData.stability === "high_risk"
                    ? "At Risk"
                    : "—"}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {terrainData && terrainData.stabilityLabel ? terrainData.stabilityLabel : "Calculating..."}
                </p>
              </div>
            </div>
            {terrainData && (
              <div
                className={cn(
                  "mt-6 p-4 rounded-lg border",
                  terrainData.stability === "stable"
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                    : terrainData.stability === "moderate_risk"
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                )}
              >
                <p
                  className={cn(
                    "text-sm",
                    terrainData.stability === "stable"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : terrainData.stability === "moderate_risk"
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-red-700 dark:text-red-300"
                  )}
                >
                  <strong>Assessment:</strong> {terrainData.assessment}
                </p>
              </div>
            )}
          </section>

          {/* Section 8: Insurance Risk Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskOverviewCard assessment={riskAssessment} />
            <InsuranceEstimateCard estimates={riskAssessment.insuranceEstimates} />
          </div>

          {/* Section 9: Financial Dashboard */}
          <FinancialDashboard
            analysis={financialAnalysis}
            propertyId={reportId}
          />

          {/* Section 10: Zoning Information */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                <Building className="h-5 w-5" />
                Zoning Information
              </h2>
              <DataSourceBadge
                type={zoningDataSourceType}
                label={
                  zoningDataSourceType === "live"
                    ? "County Rules"
                    : zoningDataSourceType === "partial"
                    ? "State Defaults"
                    : "Sample Data"
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                  Current Zoning
                </h4>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {zoningInfo.code}
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">{zoningInfo.name}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                  Permitted Uses
                </h4>
                <ul className="space-y-2">
                  {zoningInfo.permittedUses.slice(0, 4).map((use, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
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
                  {zoningInfo.minLotSizeSqft
                    ? `${zoningInfo.minLotSizeSqft.toLocaleString()} sqft`
                    : "—"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">Front Setback</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {zoningInfo.frontSetbackFt ? `${zoningInfo.frontSetbackFt} ft` : "—"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">Side Setback</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {zoningInfo.sideSetbackFt ? `${zoningInfo.sideSetbackFt} ft` : "—"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">Max Height</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {zoningInfo.maxHeightFt ? `${zoningInfo.maxHeightFt} ft` : "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Section 11: Market Analysis */}
          <MarketAnalysis
            score={marketAnalysis.score}
            maxScore={marketAnalysis.maxScore}
            grade={marketAnalysis.grade}
            metrics={marketAnalysis.metrics}
          />

          {/* Section 12: Disclaimers */}
          <Disclaimers reportDate={reportDate} />

          {/* Section 13: Property Management (when management features enabled) */}
          {showManagementFeatures && propertyId && (
            <PropertyManagementSection
              propertyId={propertyId}
              notes={notes ?? []}
              onNotesChange={onNotesChange ?? (() => {})}
              canEditNotes={canEdit}
              currentUserName={currentUserName}
              images={images ?? []}
              activityLog={activityLog ?? []}
              enrichmentStatus={enrichmentStatus ?? {
                regridComplete: false,
                screenshotComplete: false,
                screenshotCount: 0,
                validationStatus: "pending",
              }}
              onFetchRegrid={onFetchRegrid}
              onCaptureScreenshots={onCaptureScreenshots}
              isRegridLoading={isRegridLoading}
              isScreenshotLoading={isScreenshotLoading}
              allowRefresh={allowRefresh}
              defaultExpanded={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
