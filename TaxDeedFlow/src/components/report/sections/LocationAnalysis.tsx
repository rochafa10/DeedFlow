"use client";

import * as React from "react";
import {
  MapPin,
  Navigation,
  School,
  ShieldCheck,
  TrendingUp,
  Building,
  Car,
  Trees,
  ExternalLink,
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
 * Nearby amenity data
 */
export interface NearbyAmenity {
  /** Amenity name */
  name: string;
  /** Amenity type */
  type: "school" | "hospital" | "shopping" | "transit" | "park" | "restaurant" | "other";
  /** Distance in miles */
  distance: number;
  /** Rating if available (0-5) */
  rating?: number;
}

/**
 * Neighborhood statistics
 */
export interface NeighborhoodStats {
  /** Median household income */
  medianIncome?: number;
  /** Population density (per sq mile) */
  populationDensity?: number;
  /** Homeownership rate (percentage) */
  homeownershipRate?: number;
  /** Median age */
  medianAge?: number;
  /** Vacancy rate (percentage) */
  vacancyRate?: number;
  /** Crime rate (relative: low/medium/high) */
  crimeRate?: "low" | "medium" | "high";
  /** School rating (0-10) */
  schoolRating?: number;
  /** Walk score (0-100) */
  walkScore?: number;
  /** Transit score (0-100) */
  transitScore?: number;
  /** Bike score (0-100) */
  bikeScore?: number;
}

/**
 * Market trend data
 */
export interface MarketTrend {
  /** Metric name */
  metric: string;
  /** Current value */
  current: number | string;
  /** Change percentage */
  changePercent: number;
  /** Time period */
  period: string;
  /** Trend direction */
  trend: "up" | "down" | "stable";
}

/**
 * Props for the LocationAnalysis component
 */
export interface LocationAnalysisProps {
  /** Location score (0-25) */
  score: number;
  /** Maximum score */
  maxScore?: number;
  /** Location grade */
  grade: Grade;
  /** Neighborhood name or description */
  neighborhood?: string;
  /** Neighborhood statistics */
  stats: NeighborhoodStats;
  /** Nearby amenities */
  amenities?: NearbyAmenity[];
  /** Market trends */
  trends?: MarketTrend[];
  /** Key location factors */
  factors?: string[];
  /** Location concerns */
  concerns?: string[];
  /** Google Maps URL */
  googleMapsUrl?: string;
  /** Census data year (for attribution) */
  dataYear?: number;
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Data source type for badge display */
  dataSourceType?: "live" | "sample" | "partial" | "error";
}

/**
 * Amenity type icons
 */
const AMENITY_ICONS: Record<string, React.ReactNode> = {
  school: <School className="h-4 w-4" />,
  hospital: <Building className="h-4 w-4" />,
  shopping: <Building className="h-4 w-4" />,
  transit: <Car className="h-4 w-4" />,
  park: <Trees className="h-4 w-4" />,
  restaurant: <Building className="h-4 w-4" />,
  other: <MapPin className="h-4 w-4" />,
};

/**
 * Score color based on value
 */
function getScoreColor(score: number, max: number = 100): string {
  const percentage = (score / max) * 100;
  if (percentage >= 80) return "text-green-600 dark:text-green-400";
  if (percentage >= 60) return "text-blue-600 dark:text-blue-400";
  if (percentage >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * LocationAnalysis - Section 3: Location and neighborhood analysis
 *
 * Features:
 * - Location score with grade
 * - Neighborhood statistics (income, demographics, crime)
 * - Walk/Transit/Bike scores
 * - Nearby amenities with distances
 * - Market trends
 * - Key factors and concerns
 *
 * @example
 * ```tsx
 * <LocationAnalysis
 *   score={20}
 *   grade="A-"
 *   neighborhood="Downtown Altoona"
 *   stats={{
 *     medianIncome: 45000,
 *     crimeRate: "low",
 *     schoolRating: 7,
 *     walkScore: 65,
 *   }}
 *   amenities={[
 *     { name: "Altoona High School", type: "school", distance: 0.5, rating: 4 },
 *     { name: "UPMC Altoona", type: "hospital", distance: 1.2 },
 *   ]}
 * />
 * ```
 */
export function LocationAnalysis({
  score,
  maxScore = 25,
  grade,
  neighborhood,
  stats,
  amenities = [],
  trends = [],
  factors = [],
  concerns = [],
  googleMapsUrl,
  dataYear,
  defaultCollapsed = false,
  className,
  dataSourceType,
}: LocationAnalysisProps) {
  // Check if we have enough data
  const hasStats =
    stats.medianIncome !== undefined ||
    stats.crimeRate !== undefined ||
    stats.schoolRating !== undefined;

  if (!hasStats && amenities.length === 0) {
    return (
      <ReportSection
        id="location-analysis"
        title="Location Analysis"
        icon={<MapPin className="h-5 w-5" />}
        defaultCollapsed={defaultCollapsed}
        className={className}
      >
        <DataUnavailable
          title="Location Data Unavailable"
          description="Detailed location and neighborhood data could not be retrieved for this property."
        />
      </ReportSection>
    );
  }

  // Calculate percentage
  const percentage = Math.round((score / maxScore) * 100);

  return (
    <ReportSection
      id="location-analysis"
      title="Location Analysis"
      icon={<MapPin className="h-5 w-5" />}
      defaultCollapsed={defaultCollapsed}
      className={className}
      headerRight={
        <div className="flex items-center gap-3">
          <CategoryGrade grade={grade} />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {score}/{maxScore} pts
          </span>
          {dataSourceType && <DataSourceBadge type={dataSourceType} />}
        </div>
      }
    >
      {/* Location Score Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
        <div>
          <h4 className="font-medium text-slate-900 dark:text-slate-100">
            {neighborhood || "Neighborhood"}
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Location Score: {score} of {maxScore} points ({percentage}%)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ScoreBar
            score={score}
            maxScore={maxScore}
            color="#3b82f6"
            showLabel
            width={150}
          />
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Navigation className="h-4 w-4" />
              View Map
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Neighborhood Statistics */}
        <ReportSubsection
          title="Neighborhood Statistics"
          icon={<Building className="h-4 w-4" />}
        >
          <MetricGrid columns={2}>
            {stats.medianIncome !== undefined && (
              <MetricDisplay
                label="Median Household Income"
                value={stats.medianIncome}
                format="currency"
              />
            )}
            {stats.homeownershipRate !== undefined && (
              <MetricDisplay
                label="Homeownership Rate"
                value={stats.homeownershipRate}
                format="percentage"
              />
            )}
            {stats.populationDensity !== undefined && (
              <MetricDisplay
                label="Population Density"
                value={`${stats.populationDensity.toLocaleString()}/sq mi`}
              />
            )}
            {stats.medianAge !== undefined && (
              <MetricDisplay
                label="Median Age"
                value={`${stats.medianAge} years`}
              />
            )}
            {stats.vacancyRate !== undefined && (
              <MetricDisplay
                label="Vacancy Rate"
                value={stats.vacancyRate}
                format="percentage"
                trend={
                  stats.vacancyRate > 10
                    ? "negative"
                    : stats.vacancyRate < 5
                    ? "positive"
                    : "neutral"
                }
              />
            )}
            {stats.crimeRate !== undefined && (
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400 block mb-1">
                  Crime Rate
                </span>
                <RiskIndicator
                  level={
                    stats.crimeRate === "low"
                      ? "low"
                      : stats.crimeRate === "medium"
                      ? "medium"
                      : "high"
                  }
                  size="sm"
                  showLabel
                />
              </div>
            )}
          </MetricGrid>
          {dataYear && (
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
              Source: US Census Bureau ACS 5-Year Estimates ({dataYear})
            </p>
          )}
        </ReportSubsection>

        {/* Scores */}
        <ReportSubsection
          title="Location Scores"
          icon={<TrendingUp className="h-4 w-4" />}
        >
          <div className="space-y-4">
            {stats.schoolRating !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <School className="h-4 w-4" />
                    School Rating
                  </span>
                  <span className={cn("font-semibold", getScoreColor(stats.schoolRating, 10))}>
                    {stats.schoolRating}/10
                  </span>
                </div>
                <ScoreBar
                  score={stats.schoolRating}
                  maxScore={10}
                  color="#10b981"
                  height={6}
                />
              </div>
            )}

            {stats.walkScore !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Walk Score
                  </span>
                  <span className={cn("font-semibold", getScoreColor(stats.walkScore))}>
                    {stats.walkScore}
                  </span>
                </div>
                <ScoreBar
                  score={stats.walkScore}
                  maxScore={100}
                  color="#3b82f6"
                  height={6}
                />
              </div>
            )}

            {stats.transitScore !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Transit Score
                  </span>
                  <span className={cn("font-semibold", getScoreColor(stats.transitScore))}>
                    {stats.transitScore}
                  </span>
                </div>
                <ScoreBar
                  score={stats.transitScore}
                  maxScore={100}
                  color="#8b5cf6"
                  height={6}
                />
              </div>
            )}

            {stats.bikeScore !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Bike Score
                  </span>
                  <span className={cn("font-semibold", getScoreColor(stats.bikeScore))}>
                    {stats.bikeScore}
                  </span>
                </div>
                <ScoreBar
                  score={stats.bikeScore}
                  maxScore={100}
                  color="#f97316"
                  height={6}
                />
              </div>
            )}
          </div>
        </ReportSubsection>
      </div>

      {/* Nearby Amenities */}
      {amenities.length > 0 && (
        <ReportSubsection
          title="Nearby Amenities"
          icon={<Navigation className="h-4 w-4" />}
          className="mt-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {amenities.map((amenity, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  {AMENITY_ICONS[amenity.type] || AMENITY_ICONS.other}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {amenity.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {amenity.distance.toFixed(1)} miles
                    {amenity.rating !== undefined && (
                      <span className="ml-2">
                        {"★".repeat(Math.round(amenity.rating))}
                        {"☆".repeat(5 - Math.round(amenity.rating))}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ReportSubsection>
      )}

      {/* Market Trends */}
      {trends.length > 0 && (
        <ReportSubsection
          title="Market Trends"
          icon={<TrendingUp className="h-4 w-4" />}
          className="mt-6"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {trends.map((trend, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {trend.metric}
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {typeof trend.current === "number"
                    ? trend.current.toLocaleString()
                    : trend.current}
                </p>
                <p
                  className={cn(
                    "text-xs font-medium",
                    trend.trend === "up"
                      ? "text-green-600 dark:text-green-400"
                      : trend.trend === "down"
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {trend.trend === "up" ? "↑" : trend.trend === "down" ? "↓" : "→"}{" "}
                  {Math.abs(trend.changePercent).toFixed(1)}% ({trend.period})
                </p>
              </div>
            ))}
          </div>
        </ReportSubsection>
      )}

      {/* Key Factors and Concerns */}
      {(factors.length > 0 || concerns.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {factors.length > 0 && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Location Strengths
              </h4>
              <ul className="space-y-1">
                {factors.map((factor, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-green-700 dark:text-green-400 flex items-start gap-2"
                  >
                    <span className="text-green-500">•</span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {concerns.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Location Concerns
              </h4>
              <ul className="space-y-1">
                {concerns.map((concern, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2"
                  >
                    <span className="text-amber-500">•</span>
                    {concern}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ReportSection>
  );
}

export default LocationAnalysis;
