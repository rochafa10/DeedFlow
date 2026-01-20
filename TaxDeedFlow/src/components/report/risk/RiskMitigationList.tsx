"use client";

import * as React from "react";
import {
  CheckCircle,
  Clock,
  DollarSign,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Zap,
  Target,
  Wrench,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskMitigation } from "@/types/risk-analysis";

/**
 * Props for the RiskMitigationList component
 */
export interface RiskMitigationListProps {
  /** List of mitigation actions */
  mitigations: RiskMitigation[];
  /** Maximum number of items to show initially */
  initialShowCount?: number;
  /** Whether to group by risk type */
  groupByRiskType?: boolean;
  /** Whether to show estimated costs */
  showCosts?: boolean;
  /** Whether to show effectiveness ratings */
  showEffectiveness?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Effectiveness configuration
 */
const EFFECTIVENESS_CONFIG: Record<
  RiskMitigation["effectiveness"],
  {
    label: string;
    color: string;
    icon: React.ReactNode;
  }
> = {
  low: {
    label: "Low",
    color: "text-slate-500 bg-slate-100 dark:bg-slate-800",
    icon: <Target className="h-3 w-3" />,
  },
  moderate: {
    label: "Moderate",
    color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
    icon: <Target className="h-3 w-3" />,
  },
  high: {
    label: "High",
    color: "text-green-600 bg-green-100 dark:bg-green-900/30",
    icon: <Zap className="h-3 w-3" />,
  },
  very_high: {
    label: "Very High",
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
    icon: <Zap className="h-3 w-3" />,
  },
};

/**
 * Priority badge colors
 */
const PRIORITY_COLORS: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-yellow-500",
  4: "bg-blue-500",
  5: "bg-slate-400",
};

/**
 * Risk type icons
 */
const RISK_TYPE_ICONS: Record<string, React.ReactNode> = {
  flood: <Shield className="h-4 w-4 text-blue-500" />,
  earthquake: <Shield className="h-4 w-4 text-purple-500" />,
  wildfire: <Shield className="h-4 w-4 text-orange-500" />,
  hurricane: <Shield className="h-4 w-4 text-cyan-500" />,
  sinkhole: <Shield className="h-4 w-4 text-violet-500" />,
  environmental: <Shield className="h-4 w-4 text-green-500" />,
  radon: <Shield className="h-4 w-4 text-yellow-500" />,
  slope: <Shield className="h-4 w-4 text-stone-500" />,
};

/**
 * Individual mitigation item component
 */
function MitigationItem({
  mitigation,
  showCosts,
  showEffectiveness,
  isExpanded,
  onToggle,
}: {
  mitigation: RiskMitigation;
  showCosts: boolean;
  showEffectiveness: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const effectivenessConfig = EFFECTIVENESS_CONFIG[mitigation.effectiveness];
  const hasDetails =
    mitigation.insuranceImpact || mitigation.roiExplanation || mitigation.timeframe;

  return (
    <div
      className={cn(
        "border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden",
        "hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
      )}
    >
      {/* Main content */}
      <div
        className={cn(
          "p-4 cursor-pointer",
          hasDetails && "hover:bg-slate-50 dark:hover:bg-slate-800/50"
        )}
        onClick={hasDetails ? onToggle : undefined}
        role={hasDetails ? "button" : undefined}
        aria-expanded={hasDetails ? isExpanded : undefined}
      >
        <div className="flex items-start gap-3">
          {/* Priority badge */}
          <div
            className={cn(
              "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold",
              PRIORITY_COLORS[mitigation.priority] || PRIORITY_COLORS[5]
            )}
            title={`Priority ${mitigation.priority}`}
          >
            {mitigation.priority}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {RISK_TYPE_ICONS[mitigation.riskType] || (
                <Shield className="h-4 w-4 text-slate-400" />
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                {mitigation.riskType}
              </span>
            </div>

            <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">
              {mitigation.action}
            </p>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Effectiveness */}
              {showEffectiveness && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                    effectivenessConfig.color
                  )}
                >
                  {effectivenessConfig.icon}
                  {effectivenessConfig.label}
                </span>
              )}

              {/* Timeframe */}
              {mitigation.timeframe && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <Clock className="h-3 w-3" />
                  {mitigation.timeframe}
                </span>
              )}

              {/* Cost range */}
              {showCosts && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  <DollarSign className="h-3 w-3" />
                  ${mitigation.estimatedCost.min.toLocaleString()} - $
                  {mitigation.estimatedCost.max.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Expand/collapse indicator */}
          {hasDetails && (
            <div className="flex-shrink-0 text-slate-400">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {hasDetails && isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
          <div className="pt-3 space-y-2">
            {mitigation.insuranceImpact && (
              <div className="flex items-start gap-2 text-sm">
                <Shield className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Insurance Impact:{" "}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {mitigation.insuranceImpact}
                  </span>
                </div>
              </div>
            )}

            {mitigation.roiExplanation && (
              <div className="flex items-start gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    ROI:{" "}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {mitigation.roiExplanation}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * RiskMitigationList - Displays prioritized mitigation recommendations
 *
 * Features:
 * - Priority-based ordering with visual badges
 * - Cost estimates and effectiveness ratings
 * - Insurance impact and ROI information
 * - Grouping by risk type (optional)
 * - Expandable details
 * - Accessible with proper ARIA attributes
 *
 * @example
 * ```tsx
 * <RiskMitigationList
 *   mitigations={assessment.mitigationActions}
 *   showCosts={true}
 *   showEffectiveness={true}
 * />
 * ```
 */
export function RiskMitigationList({
  mitigations,
  initialShowCount = 5,
  groupByRiskType = false,
  showCosts = true,
  showEffectiveness = true,
  className,
}: RiskMitigationListProps) {
  const [showAll, setShowAll] = React.useState(false);
  const [expandedItems, setExpandedItems] = React.useState<Set<number>>(new Set());

  // Sort mitigations by priority
  const sortedMitigations = [...mitigations].sort((a, b) => a.priority - b.priority);

  // Determine which items to show
  const visibleMitigations = showAll
    ? sortedMitigations
    : sortedMitigations.slice(0, initialShowCount);

  // Group by risk type if requested
  const groupedMitigations = groupByRiskType
    ? visibleMitigations.reduce(
        (acc, mitigation) => {
          const type = mitigation.riskType;
          if (!acc[type]) acc[type] = [];
          acc[type].push(mitigation);
          return acc;
        },
        {} as Record<string, RiskMitigation[]>
      )
    : null;

  // Toggle item expansion
  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Calculate total estimated cost
  const totalCostRange = sortedMitigations.reduce(
    (acc, m) => ({
      min: acc.min + m.estimatedCost.min,
      max: acc.max + m.estimatedCost.max,
    }),
    { min: 0, max: 0 }
  );

  if (mitigations.length === 0) {
    return (
      <div
        className={cn(
          "p-6 rounded-lg border border-slate-200 dark:border-slate-700 text-center",
          className
        )}
      >
        <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
        <p className="text-slate-700 dark:text-slate-300 font-medium">
          No Mitigation Actions Required
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          This property has minimal risk factors that require mitigation.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary header */}
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Wrench className="h-5 w-5 text-slate-500" />
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {mitigations.length} Recommended Actions
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sorted by priority (1 = highest)
            </p>
          </div>
        </div>

        {showCosts && totalCostRange.max > 0 && (
          <div className="text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Est. Total Cost
            </p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              ${totalCostRange.min.toLocaleString()} - $
              {totalCostRange.max.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Priority legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-500 dark:text-slate-400">Priority:</span>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">
            1
          </span>
          <span className="text-slate-600 dark:text-slate-400">Critical</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">
            2
          </span>
          <span className="text-slate-600 dark:text-slate-400">High</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-white text-[10px] font-bold">
            3
          </span>
          <span className="text-slate-600 dark:text-slate-400">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">
            4+
          </span>
          <span className="text-slate-600 dark:text-slate-400">Low</span>
        </div>
      </div>

      {/* Mitigation items */}
      {groupByRiskType && groupedMitigations ? (
        // Grouped view
        Object.entries(groupedMitigations).map(([riskType, items]) => (
          <div key={riskType} className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
              {RISK_TYPE_ICONS[riskType] || <Shield className="h-4 w-4" />}
              {riskType} Mitigations
            </h4>
            <div className="space-y-2 pl-6">
              {items.map((mitigation, idx) => {
                const globalIdx = sortedMitigations.indexOf(mitigation);
                return (
                  <MitigationItem
                    key={globalIdx}
                    mitigation={mitigation}
                    showCosts={showCosts}
                    showEffectiveness={showEffectiveness}
                    isExpanded={expandedItems.has(globalIdx)}
                    onToggle={() => toggleExpanded(globalIdx)}
                  />
                );
              })}
            </div>
          </div>
        ))
      ) : (
        // Flat list view
        <div className="space-y-2">
          {visibleMitigations.map((mitigation, idx) => (
            <MitigationItem
              key={idx}
              mitigation={mitigation}
              showCosts={showCosts}
              showEffectiveness={showEffectiveness}
              isExpanded={expandedItems.has(idx)}
              onToggle={() => toggleExpanded(idx)}
            />
          ))}
        </div>
      )}

      {/* Show more/less button */}
      {mitigations.length > initialShowCount && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 px-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          {showAll
            ? `Show Less`
            : `Show ${mitigations.length - initialShowCount} More Actions`}
        </button>
      )}

      {/* Warning for high priority items */}
      {sortedMitigations.some((m) => m.priority === 1) && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Critical Actions Required
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This property has priority 1 mitigation actions that should be
                addressed before acquisition or immediately after.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RiskMitigationList;
