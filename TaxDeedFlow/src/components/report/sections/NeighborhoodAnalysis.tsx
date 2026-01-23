"use client";

import * as React from "react";
import {
  Home,
  Users,
  ShieldAlert,
  School,
  ShoppingCart,
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection, ReportSubsection } from "../shared/ReportSection";
import { MetricDisplay, MetricGrid, StatWithIcon } from "../shared/MetricDisplay";
import { GradeBadge, CategoryGrade } from "../shared/GradeDisplay";
import { RiskIndicator } from "../shared/RiskIndicator";
import { ScoreBar } from "../charts/ScoreGauge";
import { DataUnavailable, PartialDataWarning } from "../shared/ErrorState";
import { DataSourceBadge } from "@/components/ui/data-source-badge";
import type { Grade, RiskLevel } from "@/types/report";

/**
 * Crime statistics data
 */
export interface CrimeData {
  /** Crime risk level */
  riskLevel?: "low" | "medium" | "high" | "severe";
  /** Violent crime rate per 100,000 */
  violentCrimeRate?: number;
  /** Property crime rate per 100,000 */
  propertyCrimeRate?: number;
  /** Crime trend */
  trend?: "increasing" | "decreasing" | "stable";
  /** Data source */
  source?: string;
}

/**
 * Demographics data
 */
export interface DemographicsData {
  /** Median household income */
  medianIncome?: number;
  /** Total population */
  population?: number;
  /** Median age */
  medianAge?: number;
  /** Education level */
  educationLevel?: string;
  /** Unemployment rate (percentage) */
  unemploymentRate?: number;
  /** Data source */
  source?: string;
}

/**
 * Road access data
 */
export interface AccessData {
  /** Whether property is landlocked */
  isLandlocked?: boolean;
  /** Road access type */
  roadAccess?: string;
  /** Access notes */
  accessNotes?: string[] | null;
}

/**
 * School ratings data
 */
export interface SchoolData {
  /** Elementary school name */
  elementarySchool?: string;
  /** Elementary school rating (0-10) */
  elementaryRating?: number;
  /** Middle school name */
  middleSchool?: string;
  /** Middle school rating (0-10) */
  middleRating?: number;
  /** High school name */
  highSchool?: string;
  /** High school rating (0-10) */
  highRating?: number;
  /** District rating (0-10) */
  districtRating?: number;
  /** Data source */
  source?: string;
}

/**
 * Amenities data
 */
export interface AmenitiesData {
  /** List of nearby amenities */
  nearbyAmenities?: Array<{
    name: string;
    type: string;
    distance: number;
  }>;
  /** Distance to grocery store (miles) */
  groceryStoreDistance?: number;
  /** Distance to hospital (miles) */
  hospitalDistance?: number;
  /** Distance to shopping (miles) */
  shoppingDistance?: number;
  /** Public transport access description */
  publicTransportAccess?: string;
}

/**
 * Props for the NeighborhoodAnalysis component
 */
export interface NeighborhoodAnalysisProps {
  /** Crime statistics */
  crime: CrimeData;
  /** Demographics data */
  demographics: DemographicsData;
  /** Road access data */
  access: AccessData;
  /** School ratings */
  schools: SchoolData;
  /** Amenities data */
  amenities?: AmenitiesData;
  /** Overall neighborhood score (0-100) */
  neighborhoodScore?: number;
  /** Data completeness score (0-1) */
  completenessScore?: number;
  /** Analysis date */
  analysisDate?: string;
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Data source type for badge display */
  dataSourceType?: "live" | "sample" | "partial" | "error";
}

/**
 * Get crime risk color
 */
function getCrimeRiskColor(riskLevel?: string): string {
  switch (riskLevel) {
    case "low":
      return "text-green-600 dark:text-green-400";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400";
    case "high":
      return "text-orange-600 dark:text-orange-400";
    case "severe":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-slate-500 dark:text-slate-400";
  }
}

/**
 * Get school rating color
 */
function getSchoolRatingColor(rating?: number): string {
  if (!rating) return "text-slate-500 dark:text-slate-400";
  if (rating >= 8) return "text-green-600 dark:text-green-400";
  if (rating >= 6) return "text-blue-600 dark:text-blue-400";
  if (rating >= 4) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Get crime trend icon
 */
function getCrimeTrendIcon(trend?: string) {
  switch (trend) {
    case "increasing":
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    case "decreasing":
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    case "stable":
      return <Minus className="h-4 w-4 text-slate-500" />;
    default:
      return null;
  }
}

/**
 * NeighborhoodAnalysis - Comprehensive neighborhood and access analysis
 *
 * Features:
 * - Crime statistics with risk level
 * - Demographics summary
 * - Landlocked status warning
 * - Road access type
 * - School ratings
 * - Distance to key amenities
 * - Overall neighborhood score
 *
 * @example
 * ```tsx
 * <NeighborhoodAnalysis
 *   crime={{
 *     riskLevel: "low",
 *     violentCrimeRate: 120,
 *     propertyCrimeRate: 850,
 *     trend: "decreasing",
 *   }}
 *   demographics={{
 *     medianIncome: 45000,
 *     population: 12500,
 *     medianAge: 38,
 *   }}
 *   access={{
 *     isLandlocked: false,
 *     roadAccess: "public_residential",
 *   }}
 *   schools={{
 *     districtRating: 7,
 *   }}
 * />
 * ```
 */
export function NeighborhoodAnalysis({
  crime,
  demographics,
  access,
  schools,
  amenities,
  neighborhoodScore,
  completenessScore,
  analysisDate,
  defaultCollapsed = false,
  className,
  dataSourceType = "live",
}: NeighborhoodAnalysisProps) {
  // Check if we have enough data to display
  const hasCrimeData = crime.riskLevel !== undefined;
  const hasDemographicsData = demographics.medianIncome !== undefined;
  const hasAccessData = access.roadAccess !== undefined;
  const hasSchoolData =
    schools.districtRating !== undefined ||
    schools.elementaryRating !== undefined ||
    schools.middleRating !== undefined ||
    schools.highRating !== undefined;

  const hasAnyData = hasCrimeData || hasDemographicsData || hasAccessData || hasSchoolData;

  if (!hasAnyData) {
    return (
      <ReportSection
        id="neighborhood-analysis"
        title="Neighborhood Analysis"
        icon={<Home className="h-5 w-5" />}
        defaultCollapsed={defaultCollapsed}
        className={className}
      >
        <DataUnavailable
          title="Neighborhood data not available"
          reason="Analysis data has not been collected for this property yet."
        />
      </ReportSection>
    );
  }

  // Show partial data warning if completeness is low
  const showPartialWarning = completenessScore !== undefined && completenessScore < 0.7;

  return (
    <ReportSection
      id="neighborhood-analysis"
      title="Neighborhood Analysis"
      icon={<Home className="h-5 w-5" />}
      defaultCollapsed={defaultCollapsed}
      className={className}
      badge={<DataSourceBadge type={dataSourceType} />}
    >
      {/* Partial data warning */}
      {showPartialWarning && (
        <PartialDataWarning
          missingFields={["Some neighborhood data"]}
          impact={`Only ${Math.round((completenessScore || 0) * 100)}% of neighborhood data is available. Some sections may be incomplete.`}
          className="mb-6"
        />
      )}

      {/* Overall Neighborhood Score */}
      {neighborhoodScore !== undefined && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Overall Neighborhood Score
            </h3>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {neighborhoodScore}/100
            </span>
          </div>
          <ScoreBar score={neighborhoodScore} maxScore={100} />
        </div>
      )}

      {/* Landlocked Warning (Critical Alert) */}
      {access.isLandlocked && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 dark:text-red-300 mb-1">
                ⚠️ LANDLOCKED PROPERTY WARNING
              </h4>
              <p className="text-sm text-red-800 dark:text-red-400 mb-2">
                This property has NO legal road access. It cannot be accessed without crossing
                other private property.
              </p>
              {access.accessNotes && access.accessNotes.length > 0 && (
                <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                  {access.accessNotes.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-red-600 dark:text-red-500 mt-2 font-medium">
                Investment Risk: SEVERE - Property may be difficult or impossible to develop/sell
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Road Access Status */}
      {!access.isLandlocked && hasAccessData && (
        <div
          className={cn(
            "mb-6 p-4 rounded-lg border",
            access.roadAccess?.includes("public")
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
          )}
        >
          <div className="flex items-start gap-3">
            <Navigation
              className={cn(
                "h-5 w-5 flex-shrink-0 mt-0.5",
                access.roadAccess?.includes("public")
                  ? "text-green-600 dark:text-green-400"
                  : "text-yellow-600 dark:text-yellow-400"
              )}
            />
            <div>
              <h4
                className={cn(
                  "font-medium mb-1",
                  access.roadAccess?.includes("public")
                    ? "text-green-900 dark:text-green-300"
                    : "text-yellow-900 dark:text-yellow-300"
                )}
              >
                Road Access: {access.roadAccess?.replace(/_/g, " ").toUpperCase() || "Unknown"}
              </h4>
              <p
                className={cn(
                  "text-sm",
                  access.roadAccess?.includes("public")
                    ? "text-green-700 dark:text-green-400"
                    : "text-yellow-700 dark:text-yellow-400"
                )}
              >
                {access.roadAccess?.includes("public")
                  ? "Property has legal access via public road"
                  : "Property may have limited access - verify easements and access rights"}
              </p>
              {access.accessNotes && access.accessNotes.length > 0 && (
                <ul
                  className={cn(
                    "text-sm mt-2 space-y-1",
                    access.roadAccess?.includes("public")
                      ? "text-green-700 dark:text-green-400"
                      : "text-yellow-700 dark:text-yellow-400"
                  )}
                >
                  {access.accessNotes.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span>•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Crime Statistics */}
      {hasCrimeData && (
        <ReportSubsection title="Crime & Safety" icon={<ShieldAlert className="h-4 w-4" />}>
          <MetricGrid columns={3}>
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">Safety Rating</p>
              <div className="flex items-center gap-2">
                <span className={cn("text-xl font-bold", getCrimeRiskColor(crime.riskLevel))}>
                  {crime.riskLevel?.toUpperCase() || "N/A"}
                </span>
                {crime.trend && getCrimeTrendIcon(crime.trend)}
              </div>
            </div>

            {crime.violentCrimeRate !== undefined && (
              <StatWithIcon
                label="Violent Crime"
                value={`${crime.violentCrimeRate.toFixed(1)} per 100k`}
                icon={<ShieldAlert className="h-4 w-4" />}
              />
            )}

            {crime.propertyCrimeRate !== undefined && (
              <StatWithIcon
                label="Property Crime"
                value={`${crime.propertyCrimeRate.toFixed(1)} per 100k`}
                icon={<Home className="h-4 w-4" />}
              />
            )}
          </MetricGrid>

          {crime.trend && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Crime trend: <span className="font-medium">{crime.trend}</span>
            </p>
          )}

          {crime.source && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Source: {crime.source}
            </p>
          )}
        </ReportSubsection>
      )}

      {/* Demographics */}
      {hasDemographicsData && (
        <ReportSubsection title="Demographics" icon={<Users className="h-4 w-4" />} className="mt-6">
          <MetricGrid columns={3}>
            {demographics.medianIncome !== undefined && (
              <StatWithIcon
                label="Median Income"
                value={`$${(demographics.medianIncome / 1000).toFixed(0)}k`}
                icon={<Activity className="h-4 w-4" />}
              />
            )}

            {demographics.population !== undefined && (
              <StatWithIcon
                label="Population"
                value={demographics.population.toLocaleString()}
                icon={<Users className="h-4 w-4" />}
              />
            )}

            {demographics.medianAge !== undefined && (
              <StatWithIcon
                label="Median Age"
                value={`${demographics.medianAge} years`}
                icon={<Users className="h-4 w-4" />}
              />
            )}

            {demographics.unemploymentRate !== undefined && (
              <StatWithIcon
                label="Unemployment"
                value={`${demographics.unemploymentRate.toFixed(1)}%`}
                icon={<Activity className="h-4 w-4" />}
              />
            )}

            {demographics.educationLevel && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">Education Level</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {demographics.educationLevel}
                </p>
              </div>
            )}
          </MetricGrid>

          {demographics.source && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Source: {demographics.source}
            </p>
          )}
        </ReportSubsection>
      )}

      {/* School Ratings */}
      {hasSchoolData && (
        <ReportSubsection title="School Ratings" icon={<School className="h-4 w-4" />} className="mt-6">
          <div className="space-y-4">
            {/* District Rating */}
            {schools.districtRating !== undefined && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    School District Rating
                  </span>
                  <span className={cn("text-2xl font-bold", getSchoolRatingColor(schools.districtRating))}>
                    {schools.districtRating}/10
                  </span>
                </div>
              </div>
            )}

            {/* Individual Schools */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Elementary */}
              {(schools.elementarySchool || schools.elementaryRating !== undefined) && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Elementary</p>
                  {schools.elementarySchool && (
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                      {schools.elementarySchool}
                    </p>
                  )}
                  {schools.elementaryRating !== undefined && (
                    <p className={cn("text-lg font-bold", getSchoolRatingColor(schools.elementaryRating))}>
                      {schools.elementaryRating}/10
                    </p>
                  )}
                </div>
              )}

              {/* Middle */}
              {(schools.middleSchool || schools.middleRating !== undefined) && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Middle School</p>
                  {schools.middleSchool && (
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                      {schools.middleSchool}
                    </p>
                  )}
                  {schools.middleRating !== undefined && (
                    <p className={cn("text-lg font-bold", getSchoolRatingColor(schools.middleRating))}>
                      {schools.middleRating}/10
                    </p>
                  )}
                </div>
              )}

              {/* High */}
              {(schools.highSchool || schools.highRating !== undefined) && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">High School</p>
                  {schools.highSchool && (
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                      {schools.highSchool}
                    </p>
                  )}
                  {schools.highRating !== undefined && (
                    <p className={cn("text-lg font-bold", getSchoolRatingColor(schools.highRating))}>
                      {schools.highRating}/10
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {schools.source && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Source: {schools.source}</p>
          )}
        </ReportSubsection>
      )}

      {/* Amenities & Distances */}
      {amenities && (
        <ReportSubsection
          title="Nearby Amenities"
          icon={<ShoppingCart className="h-4 w-4" />}
          className="mt-6"
        >
          <MetricGrid columns={3}>
            {amenities.groceryStoreDistance !== undefined && (
              <StatWithIcon
                label="Grocery Store"
                value={`${amenities.groceryStoreDistance.toFixed(1)} miles`}
                icon={<ShoppingCart className="h-4 w-4" />}
              />
            )}

            {amenities.hospitalDistance !== undefined && (
              <StatWithIcon
                label="Hospital"
                value={`${amenities.hospitalDistance.toFixed(1)} miles`}
                icon={<Activity className="h-4 w-4" />}
              />
            )}

            {amenities.shoppingDistance !== undefined && (
              <StatWithIcon
                label="Shopping Center"
                value={`${amenities.shoppingDistance.toFixed(1)} miles`}
                icon={<ShoppingCart className="h-4 w-4" />}
              />
            )}
          </MetricGrid>

          {amenities.publicTransportAccess && (
            <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Public Transport</p>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {amenities.publicTransportAccess}
              </p>
            </div>
          )}

          {amenities.nearbyAmenities && amenities.nearbyAmenities.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Other Nearby Places</p>
              <div className="space-y-2">
                {amenities.nearbyAmenities.slice(0, 5).map((amenity, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-300">{amenity.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({amenity.type})
                      </span>
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      {amenity.distance.toFixed(1)} mi
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ReportSubsection>
      )}

      {/* Analysis Date */}
      {analysisDate && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 text-right">
          Analysis Date: {new Date(analysisDate).toLocaleDateString()}
        </p>
      )}
    </ReportSection>
  );
}

export default NeighborhoodAnalysis;
