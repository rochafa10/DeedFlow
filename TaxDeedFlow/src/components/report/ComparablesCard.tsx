"use client";

/**
 * Comparables Card Component
 *
 * Displays comparable property sales data from Realty in US API.
 * Shows statistics and individual comparable properties.
 *
 * @component
 */

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Home,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Ruler,
  Bed,
  Bath,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

// ============================================
// Type Definitions
// ============================================

interface ComparableProperty {
  property_id: string;
  listing_id?: string;
  address: {
    line: string;
    city: string;
    state_code: string;
    postal_code: string;
    lat?: number;
    lon?: number;
  };
  price: {
    sold_price?: number;
    list_price?: number;
    price_per_sqft?: number;
  };
  description: {
    beds?: number;
    baths?: number;
    sqft?: number;
    lot_sqft?: number;
    year_built?: number;
    type?: string;
  };
  sold_date?: string;
  list_date?: string;
  photos?: string[];
  distance_miles?: number;
}

interface ComparablesStatistics {
  count: number;
  avg_sold_price: number;
  median_sold_price: number;
  min_sold_price: number;
  max_sold_price: number;
  avg_price_per_sqft: number;
  avg_days_on_market: number;
}

interface ComparablesData {
  comparables: ComparableProperty[];
  statistics: ComparablesStatistics;
  search_criteria: {
    lat?: number;
    lng?: number;
    postal_code?: string;
    radius_miles?: number;
    limit?: number;
  };
  retrieved_at: string;
}

export interface ComparablesCardProps {
  /** Latitude for search */
  lat?: number;
  /** Longitude for search */
  lng?: number;
  /** Postal code for search (alternative to lat/lng) */
  postalCode?: string;
  /** Search radius in miles */
  radiusMiles?: number;
  /** Maximum number of comparables to fetch */
  limit?: number;
  /** Subject property value for comparison */
  subjectValue?: number;
  /** Subject property sqft for comparison */
  subjectSqft?: number;
  /** Optional class name */
  className?: string;
  /** Initial expanded state */
  defaultExpanded?: boolean;
}

// ============================================
// Helper Functions
// ============================================

function formatCurrency(value: number | undefined): string {
  if (!value) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(value: number | undefined): string {
  if (!value) return "N/A";
  return new Intl.NumberFormat("en-US").format(value);
}

function getPropertyTypeLabel(type: string | undefined): string {
  if (!type) return "Property";
  const labels: Record<string, string> = {
    single_family: "Single Family",
    condo: "Condo",
    townhome: "Townhome",
    multi_family: "Multi-Family",
    land: "Land",
    condos: "Condo",
    apartment: "Apartment",
  };
  return labels[type] || type.replace(/_/g, " ");
}

// ============================================
// Sub-Components
// ============================================

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {value}
        </span>
        {trend && trend !== "neutral" && (
          <span
            className={cn(
              "flex items-center text-xs font-medium",
              trend === "up" ? "text-green-600" : "text-red-600"
            )}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3 mr-0.5" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-0.5" />
            )}
          </span>
        )}
      </div>
      {subValue && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {subValue}
        </p>
      )}
    </div>
  );
}

function ComparableItem({ comp }: { comp: ComparableProperty }) {
  const price = comp.price.sold_price || comp.price.list_price;
  const photoUrl = comp.photos?.[0];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        {/* Photo */}
        <div className="relative w-24 h-24 flex-shrink-0 bg-slate-100 dark:bg-slate-700">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={comp.address.line}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Home className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {comp.address.line}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {comp.address.city}, {comp.address.state_code}{" "}
                {comp.address.postal_code}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(price)}
              </p>
              {comp.price.price_per_sqft && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ${comp.price.price_per_sqft}/sqft
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-400">
            {comp.description.beds && (
              <span className="flex items-center gap-1">
                <Bed className="h-3 w-3" />
                {comp.description.beds}
              </span>
            )}
            {comp.description.baths && (
              <span className="flex items-center gap-1">
                <Bath className="h-3 w-3" />
                {comp.description.baths}
              </span>
            )}
            {comp.description.sqft && (
              <span className="flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                {formatNumber(comp.description.sqft)} sqft
              </span>
            )}
            {comp.sold_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(comp.sold_date)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">
              {getPropertyTypeLabel(comp.description.type)}
            </span>
            {comp.distance_miles && (
              <span className="text-xs text-slate-500">
                {comp.distance_miles.toFixed(1)} mi away
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ComparablesCard({
  lat,
  lng,
  postalCode,
  radiusMiles = 1,
  limit = 10,
  subjectValue,
  subjectSqft,
  className,
  defaultExpanded = true,
}: ComparablesCardProps) {
  const [data, setData] = useState<ComparablesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const fetchComparables = useCallback(async () => {
    if (!lat && !lng && !postalCode) {
      setError("Location required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (lat && lng) {
        params.set("lat", String(lat));
        params.set("lng", String(lng));
        params.set("radius_miles", String(radiusMiles));
      } else if (postalCode) {
        params.set("postal_code", postalCode);
      }
      params.set("limit", String(limit));
      params.set("status", "sold");

      const response = await fetch(`/api/comparables?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch comparables");
      }

      setData(result.data);
    } catch (err) {
      console.error("[ComparablesCard] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load comparables");
    } finally {
      setIsLoading(false);
    }
  }, [lat, lng, postalCode, radiusMiles, limit]);

  useEffect(() => {
    fetchComparables();
  }, [fetchComparables]);

  // Calculate comparison to subject
  const arvComparison =
    subjectValue && data?.statistics.median_sold_price
      ? ((data.statistics.median_sold_price - subjectValue) / subjectValue) *
        100
      : null;

  return (
    <div
      className={cn(
        "bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Comparable Sales
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {data
                ? `${data.statistics.count} properties found`
                : "Loading..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(data.statistics.median_sold_price)}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Fetching comparable sales...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                {error}
              </p>
              <button
                onClick={fetchComparables}
                className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          )}

          {/* Data Display */}
          {data && !isLoading && !error && (
            <div className="p-4 space-y-4">
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={DollarSign}
                  label="Median Price"
                  value={formatCurrency(data.statistics.median_sold_price)}
                  subValue={`Avg: ${formatCurrency(data.statistics.avg_sold_price)}`}
                />
                <StatCard
                  icon={Ruler}
                  label="Avg $/Sqft"
                  value={`$${data.statistics.avg_price_per_sqft || "N/A"}`}
                  subValue={
                    subjectSqft
                      ? `Subject: ${formatNumber(subjectSqft)} sqft`
                      : undefined
                  }
                />
                <StatCard
                  icon={TrendingDown}
                  label="Price Range"
                  value={formatCurrency(data.statistics.min_sold_price)}
                  subValue={`to ${formatCurrency(data.statistics.max_sold_price)}`}
                />
                <StatCard
                  icon={Home}
                  label="Comparables"
                  value={String(data.statistics.count)}
                  subValue={`within ${radiusMiles} mile${radiusMiles !== 1 ? "s" : ""}`}
                />
              </div>

              {/* ARV Comparison */}
              {arvComparison !== null && (
                <div
                  className={cn(
                    "p-3 rounded-lg border",
                    arvComparison >= 0
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {arvComparison >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    )}
                    <span
                      className={cn(
                        "font-medium",
                        arvComparison >= 0
                          ? "text-green-700 dark:text-green-300"
                          : "text-amber-700 dark:text-amber-300"
                      )}
                    >
                      {arvComparison >= 0 ? "+" : ""}
                      {arvComparison.toFixed(1)}% vs Subject Value
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Market median: {formatCurrency(data.statistics.median_sold_price)}{" "}
                    | Subject: {formatCurrency(subjectValue)}
                  </p>
                </div>
              )}

              {/* Comparables List */}
              <div className="space-y-3">
                <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Recent Sales
                </h4>
                <div className="space-y-2">
                  {data.comparables.slice(0, 5).map((comp) => (
                    <ComparableItem key={comp.property_id} comp={comp} />
                  ))}
                </div>
                {data.comparables.length > 5 && (
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                    Showing 5 of {data.comparables.length} comparables
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Data from Realty in US API</span>
                <span>
                  Updated {new Date(data.retrieved_at).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ComparablesCard;
