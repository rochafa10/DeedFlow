"use client";

/**
 * Comparables Table Component
 *
 * Displays a detailed table of comparable sales with similarity scores,
 * price adjustments, and adjusted prices. Supports sorting, filtering,
 * and expandable row details.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Home,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  Building2,
} from "lucide-react";
import type {
  AnalyzedComparable,
  PriceAdjustment,
  AdjustmentResult,
} from "@/lib/analysis/comparables";

// ============================================
// Type Definitions
// ============================================

interface ComparablesTableProps {
  /** Array of analyzed comparables */
  comparables: AnalyzedComparable[];
  /** Optional custom class name */
  className?: string;
  /** Whether to show excluded comparables */
  showExcluded?: boolean;
  /** Callback when comparable is selected */
  onSelectComparable?: (comparable: AnalyzedComparable) => void;
  /** Maximum rows to display (0 = all) */
  maxRows?: number;
}

type SortField =
  | "similarity"
  | "distance"
  | "salePrice"
  | "adjustedPrice"
  | "saleDate";
type SortDirection = "asc" | "desc";

// ============================================
// Helper Functions
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function getSimilarityColor(score: number): string {
  if (score >= 80) return "text-green-600 bg-green-100";
  if (score >= 65) return "text-emerald-600 bg-emerald-100";
  if (score >= 50) return "text-yellow-600 bg-yellow-100";
  return "text-red-600 bg-red-100";
}

function getAdjustmentColor(percent: number): string {
  const abs = Math.abs(percent);
  if (abs <= 10) return "text-green-600";
  if (abs <= 20) return "text-yellow-600";
  return "text-red-600";
}

// ============================================
// Sub-Components
// ============================================

/**
 * Table header cell with sorting capability
 */
function SortableHeader({
  label,
  field,
  currentSort,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  align?: "left" | "right" | "center";
}) {
  const isActive = currentSort === field;
  const alignClass =
    align === "right"
      ? "justify-end"
      : align === "center"
        ? "justify-center"
        : "justify-start";

  return (
    <th
      className="px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className={cn("flex items-center gap-1", alignClass)}>
        <span>{label}</span>
        <ArrowUpDown
          className={cn(
            "h-4 w-4",
            isActive ? "text-blue-600" : "text-slate-400"
          )}
        />
        {isActive && (
          <span className="sr-only">
            Sorted {direction === "asc" ? "ascending" : "descending"}
          </span>
        )}
      </div>
    </th>
  );
}

/**
 * Expandable adjustment details panel
 */
function AdjustmentDetails({
  adjustmentResult,
}: {
  adjustmentResult: AdjustmentResult;
}) {
  const groupedAdjustments = useMemo(() => {
    const groups: Record<string, PriceAdjustment[]> = {
      physical: [],
      condition: [],
      location: [],
      features: [],
      time: [],
      financing: [],
    };

    adjustmentResult.adjustments.forEach((adj) => {
      if (groups[adj.category]) {
        groups[adj.category].push(adj);
      }
    });

    return groups;
  }, [adjustmentResult]);

  return (
    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">
        Price Adjustments
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Adjustment categories */}
        {Object.entries(groupedAdjustments).map(([category, adjustments]) => {
          if (adjustments.length === 0) return null;

          return (
            <div key={category} className="space-y-2">
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {category}
              </h5>
              {adjustments.map((adj, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-slate-600 truncate flex-1 mr-2">
                    {adj.factor}
                    {adj.wasCapped && (
                      <span
                        className="ml-1 text-amber-500"
                        title="Adjustment was capped"
                      >
                        *
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "font-medium whitespace-nowrap",
                      adj.adjustmentAmount >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {adj.adjustmentAmount >= 0 ? "+" : ""}
                    {formatCurrency(adj.adjustmentAmount)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-slate-200">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-slate-500">Gross Adjustment:</span>{" "}
            <span
              className={cn(
                "font-medium",
                getAdjustmentColor(adjustmentResult.grossAdjustmentPercent)
              )}
            >
              {formatCurrency(adjustmentResult.grossAdjustment)} (
              {adjustmentResult.grossAdjustmentPercent.toFixed(1)}%)
            </span>
          </div>
          <div>
            <span className="text-slate-500">Net Adjustment:</span>{" "}
            <span
              className={cn(
                "font-medium",
                adjustmentResult.netAdjustment >= 0
                  ? "text-green-600"
                  : "text-red-600"
              )}
            >
              {adjustmentResult.netAdjustment >= 0 ? "+" : ""}
              {formatCurrency(adjustmentResult.netAdjustment)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Confidence:</span>{" "}
            <span className="font-medium text-slate-700">
              {adjustmentResult.confidence}%
            </span>
          </div>
        </div>

        {adjustmentResult.warnings.length > 0 && (
          <div className="mt-2 text-xs text-amber-600 flex items-start gap-1">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>{adjustmentResult.warnings.join(" | ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Single comparable row
 */
function ComparableRow({
  comparable,
  isExpanded,
  onToggle,
  onSelect,
}: {
  comparable: AnalyzedComparable;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect?: () => void;
}) {
  const similarityScore = comparable.similarityScore || 0;
  const netAdjustmentPercent =
    comparable.adjustmentResult?.totalAdjustmentPercent || 0;

  return (
    <>
      <tr
        className={cn(
          "border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer",
          !comparable.includedInARV && "opacity-60 bg-slate-50"
        )}
        onClick={onToggle}
      >
        {/* Status indicator */}
        <td className="px-4 py-3">
          {comparable.includedInARV ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-slate-400" />
          )}
        </td>

        {/* Address */}
        <td className="px-4 py-3">
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                {comparable.address || "Address unavailable"}
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {comparable.distanceMiles?.toFixed(2)} mi
              </p>
            </div>
          </div>
        </td>

        {/* Sale Date */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-700">
            <Calendar className="h-4 w-4 text-slate-400" />
            {formatDate(comparable.saleDate)}
          </div>
        </td>

        {/* Similarity Score */}
        <td className="px-4 py-3 text-center">
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium",
              getSimilarityColor(similarityScore)
            )}
          >
            {similarityScore.toFixed(0)}%
          </span>
        </td>

        {/* Sale Price */}
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-medium text-slate-900">
            {formatCurrency(comparable.salePrice)}
          </span>
        </td>

        {/* Net Adjustment */}
        <td className="px-4 py-3 text-right">
          <span
            className={cn(
              "text-sm font-medium",
              getAdjustmentColor(netAdjustmentPercent)
            )}
          >
            {formatPercent(netAdjustmentPercent)}
          </span>
        </td>

        {/* Adjusted Price */}
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-bold text-slate-900">
            {formatCurrency(comparable.adjustmentResult?.adjustedPrice || 0)}
          </span>
        </td>

        {/* Expand indicator */}
        <td className="px-4 py-3 text-right">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </td>
      </tr>

      {/* Expanded details */}
      {isExpanded && comparable.adjustmentResult && (
        <tr>
          <td colSpan={8} className="p-0">
            <AdjustmentDetails adjustmentResult={comparable.adjustmentResult} />
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================
// Main Component
// ============================================

export function ComparablesTable({
  comparables,
  className,
  showExcluded = true,
  onSelectComparable,
  maxRows = 0,
}: ComparablesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField>("similarity");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterIncluded, setFilterIncluded] = useState<boolean>(false);

  // Toggle row expansion
  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Process and sort comparables
  const processedComparables = useMemo(() => {
    let result = [...comparables];

    // Filter
    if (!showExcluded || filterIncluded) {
      result = result.filter((c) => c.includedInARV);
    }

    // Sort
    result.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case "similarity":
          aValue = a.similarityScore || 0;
          bValue = b.similarityScore || 0;
          break;
        case "distance":
          aValue = a.distanceMiles || 999;
          bValue = b.distanceMiles || 999;
          break;
        case "salePrice":
          aValue = a.salePrice;
          bValue = b.salePrice;
          break;
        case "adjustedPrice":
          aValue = a.adjustmentResult?.adjustedPrice || 0;
          bValue = b.adjustmentResult?.adjustedPrice || 0;
          break;
        case "saleDate":
          aValue = new Date(a.saleDate).getTime();
          bValue = new Date(b.saleDate).getTime();
          break;
        default:
          return 0;
      }

      if (sortDirection === "asc") {
        return aValue - bValue;
      }
      return bValue - aValue;
    });

    // Limit rows
    if (maxRows > 0 && result.length > maxRows) {
      result = result.slice(0, maxRows);
    }

    return result;
  }, [comparables, showExcluded, filterIncluded, sortField, sortDirection, maxRows]);

  // Count included vs excluded
  const includedCount = comparables.filter((c) => c.includedInARV).length;
  const excludedCount = comparables.length - includedCount;

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200", className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Home className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Comparable Sales
              </h3>
              <p className="text-sm text-slate-500">
                {includedCount} used in ARV
                {excludedCount > 0 && `, ${excludedCount} excluded`}
              </p>
            </div>
          </div>

          {/* Filter toggle */}
          {showExcluded && excludedCount > 0 && (
            <button
              onClick={() => setFilterIncluded(!filterIncluded)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filterIncluded
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Filter className="h-4 w-4" />
              {filterIncluded ? "Show All" : "Show Included Only"}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-12 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Property
              </th>
              <SortableHeader
                label="Sale Date"
                field="saleDate"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Similarity"
                field="similarity"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}
                align="center"
              />
              <SortableHeader
                label="Sale Price"
                field="salePrice"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                Adjustment
              </th>
              <SortableHeader
                label="Adjusted"
                field="adjustedPrice"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {processedComparables.map((comparable, index) => (
              <ComparableRow
                key={index}
                comparable={comparable}
                isExpanded={expandedRows.has(index)}
                onToggle={() => toggleRow(index)}
                onSelect={
                  onSelectComparable
                    ? () => onSelectComparable(comparable)
                    : undefined
                }
              />
            ))}
          </tbody>
        </table>

        {processedComparables.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Home className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No comparables available</p>
          </div>
        )}
      </div>

      {/* Footer with legend */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Included in ARV</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-slate-400" />
            <span>Excluded from ARV</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-500">*</span>
            <span>Adjustment capped</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComparablesTable;
