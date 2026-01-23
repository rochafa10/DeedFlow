"use client";

import * as React from "react";
import {
  Home,
  MapPin,
  Calendar,
  Ruler,
  DollarSign,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection, ReportSubsection } from "../shared/ReportSection";
import { MetricDisplay, MetricGrid } from "../shared/MetricDisplay";
import { DataUnavailable, PartialDataWarning } from "../shared/ErrorState";
import { ScreenReaderOnly } from "../shared/AccessibilityHelpers";
import { DataSourceBadge } from "@/components/ui/data-source-badge";
import type { Grade } from "@/types/report";
import { formatValue } from "@/types/report";

/**
 * Comparable property data
 */
export interface ComparableProperty {
  /** Unique identifier */
  id: string;
  /** Property address */
  address: string;
  /** City */
  city?: string;
  /** Distance from subject property (miles) */
  distance: number;
  /** Sale price */
  salePrice: number;
  /** Sale date */
  saleDate: Date;
  /** Price per square foot */
  pricePerSqft?: number;
  /** Living area square feet */
  sqft?: number;
  /** Lot size in acres */
  lotSizeAcres?: number;
  /** Year built */
  yearBuilt?: number;
  /** Number of bedrooms */
  bedrooms?: number;
  /** Number of bathrooms */
  bathrooms?: number;
  /** Property type */
  propertyType?: string;
  /** Condition */
  condition?: "excellent" | "good" | "fair" | "poor";
  /** Days on market */
  daysOnMarket?: number;
  /** Image URL */
  imageUrl?: string;
  /** Listing URL */
  listingUrl?: string;
  /** Adjustment factors */
  adjustments?: {
    category: string;
    amount: number;
    reason?: string;
  }[];
  /** Adjusted price */
  adjustedPrice?: number;
  /** Latitude for distance calculations */
  latitude?: number;
  /** Longitude for distance calculations */
  longitude?: number;
  /** Similarity score for land comparables (0-100) */
  similarityScore?: number;
}

/**
 * Comparables analysis summary
 */
export interface ComparablesAnalysis {
  /** Number of comps found */
  compCount: number;
  /** Average sale price */
  avgSalePrice: number;
  /** Median sale price */
  medianSalePrice?: number;
  /** Average price per sqft */
  avgPricePerSqft?: number;
  /** Average days on market */
  avgDaysOnMarket?: number;
  /** Suggested ARV (after repair value) */
  suggestedArv: number;
  /** Confidence level */
  confidence: "low" | "medium" | "high";
  /** Search radius in miles */
  searchRadius: number;
  /** Date range description */
  dateRange: string;
}

/**
 * Props for the ComparablesSection component
 */
export interface ComparablesSectionProps {
  /** Comparable properties */
  comparables: ComparableProperty[];
  /** Analysis summary */
  analysis: ComparablesAnalysis;
  /** Subject property details for comparison */
  subjectProperty?: {
    sqft?: number;
    lotSizeAcres?: number;
    yearBuilt?: number;
    bedrooms?: number;
    bathrooms?: number;
  };
  /** Property type label for display (e.g., "land", "residential") */
  propertyTypeLabel?: string;
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Data source type for badge display */
  dataSourceType?: "live" | "sample" | "partial" | "error";
}

/**
 * Condition display config
 */
const CONDITION_CONFIG: Record<string, { label: string; color: string }> = {
  excellent: { label: "Excellent", color: "text-green-600 dark:text-green-400" },
  good: { label: "Good", color: "text-blue-600 dark:text-blue-400" },
  fair: { label: "Fair", color: "text-yellow-600 dark:text-yellow-400" },
  poor: { label: "Poor", color: "text-red-600 dark:text-red-400" },
};

/**
 * Comparison indicator
 */
function CompareValue({
  value,
  subjectValue,
  format = "number",
  higherIsBetter = true,
}: {
  value?: number | null;
  subjectValue?: number | null;
  format?: "number" | "currency" | "year";
  higherIsBetter?: boolean;
}) {
  // Check for null or undefined - both are invalid values
  if (value === undefined || value === null || subjectValue === undefined || subjectValue === null) {
    return <span className="text-slate-400">-</span>;
  }

  const diff = value - subjectValue;
  const isHigher = diff > 0;
  const isGood = higherIsBetter ? isHigher : !isHigher;
  const isNeutral = Math.abs(diff) < (format === "year" ? 3 : 0.05 * subjectValue);

  let formattedValue: string;
  if (format === "currency") {
    formattedValue = formatValue(value, "currency");
  } else if (format === "year") {
    formattedValue = value.toString();
  } else {
    formattedValue = value.toLocaleString();
  }

  return (
    <span className="flex items-center gap-1">
      {formattedValue}
      {!isNeutral && (
        <span
          className={cn(
            "text-xs",
            isGood
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {isHigher ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
        </span>
      )}
    </span>
  );
}

/**
 * ComparablesSection - Section 8: Comparable sales analysis
 *
 * Features:
 * - Comparable properties list with key details
 * - Analysis summary (avg price, ARV suggestion)
 * - Comparison with subject property
 * - Adjustments display
 * - Confidence indicator
 * - Links to listings
 *
 * Performance Optimization Note:
 * This component does NOT require useMemo for calculations because:
 * - All expensive calculations (avgSalePrice, suggestedArv, medianSalePrice, etc.)
 *   are pre-computed and passed via the `analysis` prop
 * - Inline calculations are trivial O(1) operations:
 *   - String formatting: toFixed(), toUpperCase(), string interpolation
 *   - Simple arithmetic in CompareValue: subtraction, comparisons, Math.abs()
 *   - Conditional rendering logic
 * - The .map() operations iterate over props that should trigger re-renders when changed
 * - No reduce operations, complex array transformations, or expensive computations
 *
 * The component may benefit from React.memo() wrapper if parent components frequently
 * update unrelated state, but this is an optional optimization to be added if profiling
 * shows unnecessary re-renders.
 *
 * @example
 * ```tsx
 * <ComparablesSection
 *   comparables={[
 *     { id: "1", address: "123 Oak St", distance: 0.3, salePrice: 125000, saleDate: new Date("2025-11-15"), sqft: 1600 },
 *     { id: "2", address: "456 Maple Ave", distance: 0.5, salePrice: 135000, saleDate: new Date("2025-10-20"), sqft: 1750 },
 *   ]}
 *   analysis={{
 *     compCount: 5,
 *     avgSalePrice: 128000,
 *     suggestedArv: 125000,
 *     confidence: "high",
 *     searchRadius: 1,
 *     dateRange: "Last 6 months",
 *   }}
 * />
 * ```
 */
export function ComparablesSection({
  comparables,
  analysis,
  subjectProperty,
  propertyTypeLabel,
  defaultCollapsed = false,
  className,
  dataSourceType,
}: ComparablesSectionProps) {
  // Check if we have comparables
  if (!comparables || comparables.length === 0) {
    return (
      <ReportSection
        id="comparables"
        title="Comparable Sales"
        icon={<Home className="h-5 w-5" />}
        defaultCollapsed={defaultCollapsed}
        className={className}
      >
        <DataUnavailable
          title="No Comparables Found"
          description="Could not find comparable sales within the search parameters. This may affect the accuracy of value estimates."
        />
      </ReportSection>
    );
  }

  return (
    <ReportSection
      id="comparables"
      title="Comparable Sales"
      icon={<Home className="h-5 w-5" />}
      defaultCollapsed={defaultCollapsed}
      className={className}
      headerRight={
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2 py-0.5 text-xs rounded-full font-medium",
              analysis.confidence === "high"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : analysis.confidence === "medium"
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {analysis.confidence.charAt(0).toUpperCase() + analysis.confidence.slice(1)} Confidence
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {analysis.compCount} comps
          </span>
          {dataSourceType && <DataSourceBadge type={dataSourceType} />}
        </div>
      }
    >
      {/* Analysis Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
        <div className="text-center">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Suggested ARV
          </span>
          <span className="text-xl font-bold text-primary">
            {formatValue(analysis.suggestedArv, "currency")}
          </span>
        </div>
        <div className="text-center">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Avg Sale Price
          </span>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {formatValue(analysis.avgSalePrice, "currency")}
          </span>
        </div>
        {analysis.avgPricePerSqft !== undefined && (
          <div className="text-center">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              Avg $/sqft
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              ${analysis.avgPricePerSqft.toFixed(0)}
            </span>
          </div>
        )}
        {analysis.avgDaysOnMarket !== undefined && (
          <div className="text-center">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              Avg DOM
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {analysis.avgDaysOnMarket} days
            </span>
          </div>
        )}
      </div>

      {/* Search Parameters */}
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Showing {comparables.length} comparable {propertyTypeLabel ? `${propertyTypeLabel} ` : ""}sales within {analysis.searchRadius} mile
        {analysis.searchRadius !== 1 ? "s" : ""} | {analysis.dateRange}
      </p>

      {/* Comparables Grid */}
      <div className="space-y-4">
        {comparables.map((comp, idx) => (
          <div
            key={comp.id}
            className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-colors"
          >
            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
              {/* Image */}
              {comp.imageUrl && (
                <div className="flex-shrink-0 w-full lg:w-32 h-24 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
                  <img
                    src={comp.imageUrl}
                    alt={`${comp.address}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="text-slate-400 text-sm">#{idx + 1}</span>
                      {comp.address}
                      {comp.listingUrl && (
                        <a
                          href={comp.listingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </h4>
                    {comp.city && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {comp.city}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatValue(comp.salePrice, "currency")}
                    </p>
                    {comp.adjustedPrice !== undefined && comp.adjustedPrice !== comp.salePrice && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Adjusted: {formatValue(comp.adjustedPrice, "currency")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-3 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Distance</span>
                    <p className="font-medium">{comp.distance.toFixed(2)} mi</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Sale Date</span>
                    <p className="font-medium">{formatValue(comp.saleDate, "date")}</p>
                  </div>
                  {comp.sqft !== undefined && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Sqft</span>
                      <p className="font-medium">
                        <CompareValue
                          value={comp.sqft}
                          subjectValue={subjectProperty?.sqft}
                          higherIsBetter
                        />
                      </p>
                    </div>
                  )}
                  {comp.pricePerSqft !== undefined && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">$/sqft</span>
                      <p className="font-medium">
                        ${comp.pricePerSqft.toFixed(0)}
                      </p>
                    </div>
                  )}
                  {comp.yearBuilt !== undefined && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Year Built</span>
                      <p className="font-medium">
                        <CompareValue
                          value={comp.yearBuilt}
                          subjectValue={subjectProperty?.yearBuilt}
                          format="year"
                          higherIsBetter
                        />
                      </p>
                    </div>
                  )}
                  {(comp.bedrooms !== undefined || comp.bathrooms !== undefined) && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Bed/Bath</span>
                      <p className="font-medium">
                        {comp.bedrooms ?? "-"} / {comp.bathrooms ?? "-"}
                      </p>
                    </div>
                  )}
                  {comp.condition && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Condition</span>
                      <p className={cn("font-medium", CONDITION_CONFIG[comp.condition]?.color)}>
                        {CONDITION_CONFIG[comp.condition]?.label}
                      </p>
                    </div>
                  )}
                  {comp.daysOnMarket !== undefined && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">DOM</span>
                      <p className="font-medium">{comp.daysOnMarket} days</p>
                    </div>
                  )}
                  {comp.lotSizeAcres !== undefined && comp.lotSizeAcres > 0 && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Lot Size</span>
                      <p className="font-medium">
                        {comp.lotSizeAcres >= 1
                          ? `${comp.lotSizeAcres.toFixed(2)} acres`
                          : `${Math.round(comp.lotSizeAcres * 43560).toLocaleString()} sqft`}
                      </p>
                    </div>
                  )}
                  {comp.similarityScore !== undefined && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Match</span>
                      <p className={cn(
                        "font-medium",
                        comp.similarityScore >= 70 ? "text-green-600 dark:text-green-400" :
                        comp.similarityScore >= 50 ? "text-yellow-600 dark:text-yellow-400" :
                        "text-red-600 dark:text-red-400"
                      )}>
                        {comp.similarityScore}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Adjustments */}
                {comp.adjustments && comp.adjustments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Adjustments:
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {comp.adjustments.map((adj, adjIdx) => (
                        <span
                          key={adjIdx}
                          className={cn(
                            "px-2 py-0.5 text-xs rounded",
                            adj.amount >= 0
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}
                          title={adj.reason}
                        >
                          {adj.category}: {adj.amount >= 0 ? "+" : ""}
                          {formatValue(adj.amount, "currency")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Screen Reader Summary */}
      <ScreenReaderOnly>
        <div>
          <h4>Comparable Sales Summary</h4>
          <p>Number of comparables: {analysis.compCount}</p>
          <p>Suggested ARV: {formatValue(analysis.suggestedArv, "currency")}</p>
          <p>Average sale price: {formatValue(analysis.avgSalePrice, "currency")}</p>
          <table>
            <caption>Comparable Properties</caption>
            <thead>
              <tr>
                <th>Address</th>
                <th>Sale Price</th>
                <th>Sale Date</th>
                <th>Distance</th>
              </tr>
            </thead>
            <tbody>
              {comparables.map((comp) => (
                <tr key={comp.id}>
                  <td>{comp.address}</td>
                  <td>{formatValue(comp.salePrice, "currency")}</td>
                  <td>{formatValue(comp.saleDate, "date")}</td>
                  <td>{comp.distance} miles</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScreenReaderOnly>
    </ReportSection>
  );
}

export default ComparablesSection;
