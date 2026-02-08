"use client";

/**
 * Comparables Card Component
 *
 * Displays LFB 9-Step comparable analysis with scored comps,
 * ARV calculation, and MAO for tax deed investing.
 */

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { CompAnalysisResult, ScoredComparable, CompAdjustment } from "@/lib/utils/comp-analysis";

const cardLogger = logger.withContext("Comparables Card");
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
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Shield,
  Target,
  BarChart3,
  Info,
} from "lucide-react";

// ============================================
// Types
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

export interface ComparablesCardProps {
  lat?: number;
  lng?: number;
  postalCode?: string;
  radiusMiles?: number;
  limit?: number;
  subjectValue?: number;
  subjectSqft?: number;
  className?: string;
  defaultExpanded?: boolean;
  // LFB subject property details
  subjectLotSqft?: number;
  subjectBeds?: number;
  subjectBaths?: number;
  subjectYearBuilt?: number;
  subjectPropertyType?: string;
  subjectTotalDue?: number;
  /** Callback when LFB analysis completes – exposes ARV/MAO and market data to parent */
  onAnalysisComplete?: (data: {
    arv: number | null;
    maoConservative: number | null;
    maoAggressive: number | null;
    confidenceLevel: string;
    qualifiedCount: number;
    extendedCount: number;
    // Market metrics from enhanced mode
    market?: {
      activeListingsCount: number | null;
      avgDaysOnMarket: number;
      avgPricePerSqft: number;
      listToSaleRatio: number | null;
      marketHealth: number;
      marketType: string;
      supplyDemand: string;
      absorptionRate: number | null;
      priceChangeYoY: number | null;
      salesVolumeChangeYoY: number | null;
      medianSalePrice: number;
      recentSalesCount: number;
      monthsOfInventory: number | null;
    };
  }) => void;
}

// ============================================
// Helpers
// ============================================

function formatCurrency(value: number | undefined | null): string {
  if (value == null || value === 0) return "N/A";
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

function formatNumber(value: number | undefined | null): string {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("en-US").format(value);
}

function getPropertyTypeLabel(type: string | undefined): string {
  if (!type) return "Property";
  const labels: Record<string, string> = {
    single_family: "Single Family",
    mobile: "Mobile Home",
    manufactured: "Mobile Home",
    condo: "Condo",
    townhome: "Townhome",
    multi_family: "Multi-Family",
    land: "Land",
    apartment: "Apartment",
  };
  return labels[type] || type.replace(/_/g, " ");
}

const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-700" },
  B: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300 dark:border-blue-700" },
  C: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300 dark:border-amber-700" },
  D: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", border: "border-orange-300 dark:border-orange-700" },
  F: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", border: "border-red-300 dark:border-red-700" },
};

const confidenceColors: Record<string, string> = {
  high: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-red-600 dark:text-red-400",
};

// ============================================
// Sub-Components
// ============================================

function GradeBadge({ grade, score }: { grade: string; score: number }) {
  const colors = gradeColors[grade] || gradeColors.F;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border", colors.bg, colors.text, colors.border)}>
      {grade}
      <span className="font-normal opacity-70">{score}</span>
    </span>
  );
}

function ARVSection({
  analysis,
  subjectTotalDue,
}: {
  analysis: CompAnalysisResult;
  subjectTotalDue?: number;
}) {
  if (!analysis.arv) return null;

  const dealSpread = subjectTotalDue && analysis.mao
    ? analysis.mao - subjectTotalDue
    : null;

  return (
    <div className="space-y-3">
      {/* ARV & MAO Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">ARV</span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatCurrency(analysis.arv)}</p>
          {analysis.arvPerSqft && (
            <p className="text-xs text-slate-500">${analysis.arvPerSqft}/sqft</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">MAO (60-65%)</span>
          </div>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(analysis.mao)}</p>
          <p className="text-xs text-slate-500">
            {formatCurrency(analysis.maoConservative)} – {formatCurrency(analysis.maoAggressive)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Confidence</span>
          </div>
          <p className={cn("text-lg font-bold capitalize", confidenceColors[analysis.confidenceLevel])}>
            {analysis.confidenceLevel}
          </p>
          <p className="text-xs text-slate-500">
            {analysis.qualifiedComps.length} qualified comp{analysis.qualifiedComps.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Deal Spread */}
      {dealSpread !== null && subjectTotalDue && (
        <div className={cn(
          "p-3 rounded-lg border",
          dealSpread > 0
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {dealSpread > 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              <span className={cn("font-medium", dealSpread > 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
                {dealSpread > 0 ? "Potential Deal" : "Negative Spread"}
              </span>
            </div>
            <span className={cn("text-lg font-bold", dealSpread > 0 ? "text-green-600" : "text-red-600")}>
              {dealSpread > 0 ? "+" : ""}{formatCurrency(dealSpread)}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            MAO {formatCurrency(analysis.mao)} − Taxes Owed {formatCurrency(subjectTotalDue)} = Spread {formatCurrency(dealSpread)}
          </p>
        </div>
      )}

      {/* Repair Estimates */}
      {analysis.repairEstimate && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">Estimated Costs</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-slate-500">Cosmetic Rehab</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(analysis.repairEstimate.cosmeticTotal)}</p>
              <p className="text-slate-400">${analysis.repairEstimate.cosmeticPerSqft}/sqft</p>
            </div>
            <div>
              <p className="text-slate-500">Full Rehab</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(analysis.repairEstimate.fullRehabTotal)}</p>
              <p className="text-slate-400">${analysis.repairEstimate.fullRehabPerSqft}/sqft</p>
            </div>
            <div>
              <p className="text-slate-500">Selling Costs</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(analysis.repairEstimate.sellingCosts)}</p>
              <p className="text-slate-400">~10% of ARV</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoredCompItem({ comp }: { comp: ScoredComparable }) {
  const [showDetails, setShowDetails] = useState(false);
  const price = comp.price?.sold_price || comp.price?.list_price;
  const photoUrl = comp.photos?.[0];

  return (
    <div className={cn(
      "bg-white dark:bg-slate-800 rounded-lg border overflow-hidden transition-shadow",
      gradeColors[comp.compGrade]?.border || "border-slate-200 dark:border-slate-700",
    )}>
      <div className="flex">
        {/* Photo */}
        <div className="relative w-24 h-24 flex-shrink-0 bg-slate-100 dark:bg-slate-700">
          {photoUrl ? (
            <Image src={photoUrl} alt={comp.address?.line || ""} fill className="object-cover" unoptimized />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Home className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            </div>
          )}
          {/* Grade overlay */}
          <div className="absolute top-1 left-1">
            <GradeBadge grade={comp.compGrade} score={comp.compScore} />
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-slate-900 dark:text-slate-100 truncate text-sm">
                {comp.address?.line}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {comp.address?.city}, {comp.address?.state_code} {comp.address?.postal_code}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {formatCurrency(price)}
              </p>
              {comp.adjustedPrice !== price && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Adj: {formatCurrency(comp.adjustedPrice)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 dark:text-slate-400">
            {comp.description?.beds != null && comp.description.beds > 0 && (
              <span className="flex items-center gap-0.5">
                <Bed className="h-3 w-3" /> {comp.description.beds}
              </span>
            )}
            {comp.description?.baths != null && comp.description.baths > 0 && (
              <span className="flex items-center gap-0.5">
                <Bath className="h-3 w-3" /> {comp.description.baths}
              </span>
            )}
            {comp.description?.sqft != null && comp.description.sqft > 0 && (
              <span className="flex items-center gap-0.5">
                <Ruler className="h-3 w-3" /> {formatNumber(comp.description.sqft)}
              </span>
            )}
            {comp.sold_date && (
              <span className="flex items-center gap-0.5">
                <Calendar className="h-3 w-3" /> {formatDate(comp.sold_date)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">
              {getPropertyTypeLabel(comp.description?.type)}
            </span>
            {comp.adjustments.length > 0 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <Info className="h-3 w-3" />
                {comp.adjustments.length} adj.
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Adjustments detail */}
      {showDetails && comp.adjustments.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-2 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-500 mb-1">Adjustments</p>
          <div className="space-y-0.5">
            {comp.adjustments.map((adj, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">{adj.description}</span>
                <span className={cn("font-medium", adj.amount >= 0 ? "text-green-600" : "text-red-600")}>
                  {adj.amount >= 0 ? "+" : ""}{formatCurrency(adj.amount)}
                </span>
              </div>
            ))}
          </div>
          {/* Match details */}
          {comp.matchDetails && (
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 text-xs text-slate-500">
              {comp.matchDetails.sqftDiff !== null && (
                <span>Sqft: {comp.matchDetails.sqftDiff > 0 ? "+" : ""}{formatNumber(comp.matchDetails.sqftDiff)}</span>
              )}
              {comp.matchDetails.lotSqftDiff !== null && (
                <span>Lot: {comp.matchDetails.lotSqftDiff > 0 ? "+" : ""}{formatNumber(comp.matchDetails.lotSqftDiff)}</span>
              )}
              {comp.matchDetails.yearBuiltDiff !== null && (
                <span>Year: {comp.matchDetails.yearBuiltDiff > 0 ? "+" : ""}{comp.matchDetails.yearBuiltDiff}yr</span>
              )}
              <span>{comp.matchDetails.daysAgo}d ago</span>
              <span>{comp.matchDetails.typeMatch ? "Type match" : "Type mismatch"}</span>
            </div>
          )}
        </div>
      )}
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
  radiusMiles = 5,
  limit = 25,
  subjectValue,
  subjectSqft,
  className,
  defaultExpanded = true,
  subjectLotSqft,
  subjectBeds,
  subjectBaths,
  subjectYearBuilt,
  subjectPropertyType,
  subjectTotalDue,
  onAnalysisComplete,
}: ComparablesCardProps) {
  const [analysis, setAnalysis] = useState<CompAnalysisResult | null>(null);
  const [statistics, setStatistics] = useState<ComparablesStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);

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
      }
      if (postalCode) {
        params.set("postal_code", postalCode);
      }
      params.set("limit", String(limit));
      params.set("mode", "enhanced");

      // Subject property details for LFB analysis
      if (subjectSqft && subjectSqft > 0) params.set("subject_sqft", String(subjectSqft));
      if (subjectLotSqft && subjectLotSqft > 0) params.set("subject_lot_sqft", String(subjectLotSqft));
      if (subjectBeds && subjectBeds > 0) params.set("subject_beds", String(subjectBeds));
      if (subjectBaths && subjectBaths > 0) params.set("subject_baths", String(subjectBaths));
      if (subjectYearBuilt && subjectYearBuilt > 0) params.set("subject_year_built", String(subjectYearBuilt));
      if (subjectPropertyType) params.set("subject_type", subjectPropertyType);
      if (subjectValue && subjectValue > 0) params.set("subject_value", String(subjectValue));

      const response = await fetch(`/api/comparables?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch comparables");
      }

      const analysisData = result.data?.analysis || null;
      setAnalysis(analysisData);
      setStatistics(result.data?.statistics || null);
      setMeta(result.meta || null);

      // Notify parent of LFB analysis results (ARV, MAO, market metrics)
      if (onAnalysisComplete && analysisData) {
        const stats = result.data?.statistics;
        const calcMetrics = result.data?.calculatedMetrics;
        const histMetrics = result.data?.historicalMetrics;
        const activeCount = result.data?.activeListingsCount ?? null;
        const soldCount = stats?.count || 0;
        const monthsOfData = Math.max(1, Math.ceil((analysisData.searchCriteria?.daysUsed || 180) / 30));
        const monthsOfInventory = activeCount != null && soldCount > 0
          ? Math.round((activeCount / (soldCount / monthsOfData)) * 10) / 10
          : null;

        onAnalysisComplete({
          arv: analysisData.arv,
          maoConservative: analysisData.maoConservative,
          maoAggressive: analysisData.maoAggressive,
          confidenceLevel: analysisData.confidenceLevel,
          qualifiedCount: analysisData.qualifiedComps?.length || 0,
          extendedCount: analysisData.extendedComps?.length || 0,
          market: {
            activeListingsCount: activeCount,
            avgDaysOnMarket: stats?.avg_days_on_market || histMetrics?.currentPeriod?.avgDaysOnMarket || 0,
            avgPricePerSqft: stats?.avg_price_per_sqft || histMetrics?.currentPeriod?.avgPricePerSqft || 0,
            listToSaleRatio: calcMetrics?.listToSaleRatio ?? null,
            marketHealth: calcMetrics?.marketHealth ?? 0,
            marketType: calcMetrics?.marketType || 'balanced',
            supplyDemand: calcMetrics?.supplyDemand || 'balanced',
            absorptionRate: calcMetrics?.absorptionRate ?? null,
            priceChangeYoY: histMetrics?.priceChangeYoY ?? null,
            salesVolumeChangeYoY: histMetrics?.salesVolumeChangeYoY ?? null,
            medianSalePrice: stats?.median_sold_price || 0,
            recentSalesCount: soldCount,
            monthsOfInventory,
          },
        });
      }
    } catch (err) {
      cardLogger.error("Error loading comparables", {
        error: err instanceof Error ? err.message : String(err),
      });
      setError(err instanceof Error ? err.message : "Failed to load comparables");
    } finally {
      setIsLoading(false);
    }
  }, [lat, lng, postalCode, radiusMiles, limit, subjectSqft, subjectLotSqft, subjectBeds, subjectBaths, subjectYearBuilt, subjectPropertyType, subjectValue, onAnalysisComplete]);

  useEffect(() => {
    fetchComparables();
  }, [fetchComparables]);

  const allComps = [
    ...(analysis?.qualifiedComps || []),
    ...(analysis?.extendedComps || []),
  ];

  const headerText = analysis
    ? `${analysis.qualifiedComps.length} qualified, ${analysis.extendedComps.length} extended${analysis.rejectedCount ? `, ${analysis.rejectedCount} rejected` : ""}`
    : "Loading...";

  return (
    <div className={cn(
      "bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden",
      className,
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Comparable Sales Analysis
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {headerText}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis?.arv && (
            <div className="text-right">
              <p className="text-xs text-slate-500">ARV</p>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(analysis.arv)}
              </span>
            </div>
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
          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Running LFB comp analysis...
              </p>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">{error}</p>
              <button
                onClick={fetchComparables}
                className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          )}

          {/* Data */}
          {analysis && !isLoading && !error && (
            <div className="p-4 space-y-4">
              {/* ARV & MAO Section */}
              <ARVSection analysis={analysis} subjectTotalDue={subjectTotalDue} />

              {/* Market Statistics */}
              {statistics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 uppercase">Median Price</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatCurrency(statistics.median_sold_price)}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 uppercase">Avg $/Sqft</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {statistics.avg_price_per_sqft ? `$${statistics.avg_price_per_sqft}` : "N/A"}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 uppercase">Price Range</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(statistics.min_sold_price)} – {formatCurrency(statistics.max_sold_price)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 uppercase">Total Found</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{statistics.count}</p>
                  </div>
                </div>
              )}

              {/* Qualified Comps */}
              {analysis.qualifiedComps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-emerald-500" />
                    Qualified Comps (Grade A-B)
                  </h4>
                  {analysis.qualifiedComps.map((comp) => (
                    <ScoredCompItem key={comp.property_id} comp={comp} />
                  ))}
                </div>
              )}

              {/* Extended Comps */}
              {analysis.extendedComps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-amber-500" />
                    Extended Comps (Grade C) – For Reference
                  </h4>
                  {analysis.extendedComps.slice(0, 3).map((comp) => (
                    <ScoredCompItem key={comp.property_id} comp={comp} />
                  ))}
                  {analysis.extendedComps.length > 3 && (
                    <p className="text-center text-xs text-slate-500">
                      +{analysis.extendedComps.length - 3} more extended comps
                    </p>
                  )}
                </div>
              )}

              {/* No qualified comps warning */}
              {analysis.qualifiedComps.length === 0 && analysis.extendedComps.length === 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                  <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                  <p className="font-medium text-amber-700 dark:text-amber-300">
                    No qualifying comps found
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    No properties in this area closely match the subject property characteristics.
                    Manual comp research recommended.
                  </p>
                </div>
              )}

              {/* Search Criteria Footer */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>
                  {`LFB 9-Step Analysis | ${meta?.search_days_used ?? "?"}d window | ${meta?.search_radius_used ?? "?"}mi`}
                </span>
                <span>
                  {meta?.timestamp ? new Date(meta.timestamp as string).toLocaleString() : ""}
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
