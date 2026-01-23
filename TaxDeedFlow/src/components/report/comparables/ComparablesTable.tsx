"use client";

/**
 * Comparables Table Component (Virtualized)
 *
 * Displays a detailed table of comparable sales with similarity scores,
 * price adjustments, and adjusted prices. Supports sorting, filtering,
 * and expandable row details.
 *
 * Uses @tanstack/react-table for table management and @tanstack/react-virtual
 * for row virtualization to efficiently handle large datasets.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { useState, useMemo, useRef } from "react";
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
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ExpandedState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
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

// ============================================
// Column Definitions
// ============================================

const columnHelper = createColumnHelper<AnalyzedComparable>();

const columns: ColumnDef<AnalyzedComparable, any>[] = [
  // Status indicator
  columnHelper.display({
    id: "status",
    header: "",
    cell: ({ row }) => (
      <div className="px-4 py-3">
        {row.original.includedInARV ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-slate-400" />
        )}
      </div>
    ),
    size: 48,
  }),

  // Address
  columnHelper.accessor("address", {
    id: "address",
    header: "Property",
    cell: ({ row }) => (
      <div className="px-4 py-3">
        <div className="flex items-start gap-2">
          <Building2 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
              {row.original.address || "Address unavailable"}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {row.original.distanceMiles?.toFixed(2)} mi
            </p>
          </div>
        </div>
      </div>
    ),
  }),

  // Sale Date
  columnHelper.accessor("saleDate", {
    id: "saleDate",
    header: "Sale Date",
    cell: ({ getValue }) => (
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm text-slate-700">
          <Calendar className="h-4 w-4 text-slate-400" />
          {formatDate(getValue())}
        </div>
      </div>
    ),
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.original.saleDate).getTime();
      const dateB = new Date(rowB.original.saleDate).getTime();
      return dateA - dateB;
    },
  }),

  // Similarity Score
  columnHelper.accessor("similarityScore", {
    id: "similarity",
    header: "Similarity",
    cell: ({ getValue }) => {
      const score = getValue() || 0;
      return (
        <div className="px-4 py-3 text-center">
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium",
              getSimilarityColor(score)
            )}
          >
            {score.toFixed(0)}%
          </span>
        </div>
      );
    },
  }),

  // Sale Price
  columnHelper.accessor("salePrice", {
    id: "salePrice",
    header: "Sale Price",
    cell: ({ getValue }) => (
      <div className="px-4 py-3 text-right">
        <span className="text-sm font-medium text-slate-900">
          {formatCurrency(getValue())}
        </span>
      </div>
    ),
  }),

  // Net Adjustment
  columnHelper.display({
    id: "adjustment",
    header: "Adjustment",
    cell: ({ row }) => {
      const netAdjustmentPercent =
        row.original.adjustmentResult?.totalAdjustmentPercent || 0;
      return (
        <div className="px-4 py-3 text-right">
          <span
            className={cn(
              "text-sm font-medium",
              getAdjustmentColor(netAdjustmentPercent)
            )}
          >
            {formatPercent(netAdjustmentPercent)}
          </span>
        </div>
      );
    },
  }),

  // Adjusted Price
  columnHelper.accessor(
    (row) => row.adjustmentResult?.adjustedPrice || 0,
    {
      id: "adjustedPrice",
      header: "Adjusted",
      cell: ({ getValue }) => (
        <div className="px-4 py-3 text-right">
          <span className="text-sm font-bold text-slate-900">
            {formatCurrency(getValue())}
          </span>
        </div>
      ),
    }
  ),

  // Expand indicator
  columnHelper.display({
    id: "expand",
    header: "",
    cell: ({ row }) => (
      <div className="px-4 py-3 text-right">
        {row.getIsExpanded() ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </div>
    ),
    size: 48,
  }),
];

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
  const [sorting, setSorting] = useState<SortingState>([
    { id: "similarity", desc: true },
  ]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [filterIncluded, setFilterIncluded] = useState<boolean>(false);

  // Filter and limit data
  const filteredData = useMemo(() => {
    let result = [...comparables];

    // Filter
    if (!showExcluded || filterIncluded) {
      result = result.filter((c) => c.includedInARV);
    }

    // Limit rows
    if (maxRows > 0 && result.length > maxRows) {
      result = result.slice(0, maxRows);
    }

    return result;
  }, [comparables, showExcluded, filterIncluded, maxRows]);

  // Table instance
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      expanded,
    },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  // Virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 5,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

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
      <div
        ref={tableContainerRef}
        className="overflow-auto max-h-[600px]"
        style={{ contain: "strict" }}
      >
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDirection = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-4 py-3 text-sm font-semibold text-slate-700",
                        canSort && "cursor-pointer hover:bg-slate-100 transition-colors"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{
                        width: header.column.getSize(),
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            "flex items-center gap-1",
                            header.id === "salePrice" ||
                              header.id === "adjustment" ||
                              header.id === "adjustedPrice"
                              ? "justify-end"
                              : header.id === "similarity"
                                ? "justify-center"
                                : "justify-start"
                          )}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <ArrowUpDown
                              className={cn(
                                "h-4 w-4",
                                sortDirection
                                  ? "text-blue-600"
                                  : "text-slate-400"
                              )}
                            />
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isExpanded = row.getIsExpanded();

              return (
                <>
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={(node) => rowVirtualizer.measureElement(node)}
                    className={cn(
                      "border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer",
                      !row.original.includedInARV && "opacity-60 bg-slate-50"
                    )}
                    onClick={() => row.toggleExpanded()}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Expanded details */}
                  {isExpanded && row.original.adjustmentResult && (
                    <tr key={`${row.id}-expanded`}>
                      <td colSpan={columns.length} className="p-0">
                        <AdjustmentDetails
                          adjustmentResult={row.original.adjustmentResult}
                        />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} />
              </tr>
            )}
          </tbody>
        </table>

        {filteredData.length === 0 && (
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
