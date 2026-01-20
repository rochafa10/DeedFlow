"use client";

/**
 * Cost Breakdown Card Component
 *
 * Displays detailed cost breakdown with expandable sections for
 * acquisition, rehab, holding, and selling costs.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign,
  ChevronDown,
  ChevronUp,
  Home,
  Hammer,
  Clock,
  Tag,
  Info,
  AlertTriangle,
} from "lucide-react";
import type { CostBreakdown } from "@/types/costs";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ============================================
// Type Definitions
// ============================================

interface CostBreakdownCardProps {
  /** Cost breakdown data */
  costs?: CostBreakdown;
  /** Optional additional class names */
  className?: string;
}

interface CostSectionProps {
  /** Section title */
  title: string;
  /** Total for this section */
  total: number;
  /** Percentage of grand total */
  percentage: number;
  /** Icon component */
  icon: React.ElementType;
  /** Color for the section */
  color: string;
  /** Background color class */
  bgColor: string;
  /** Line items to display */
  items: { label: string; value: number; note?: string }[];
  /** Confidence level (for rehab) */
  confidence?: "high" | "medium" | "low";
  /** Whether section is expanded by default */
  defaultExpanded?: boolean;
}

// ============================================
// Cost Category Colors
// ============================================

const costColors = {
  acquisition: {
    color: "#3B82F6",
    bgColor: "bg-blue-500",
    lightBg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-600 dark:text-blue-400",
  },
  rehab: {
    color: "#F97316",
    bgColor: "bg-orange-500",
    lightBg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-600 dark:text-orange-400",
  },
  holding: {
    color: "#8B5CF6",
    bgColor: "bg-purple-500",
    lightBg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-600 dark:text-purple-400",
  },
  selling: {
    color: "#22C55E",
    bgColor: "bg-green-500",
    lightBg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-600 dark:text-green-400",
  },
};

// ============================================
// Sub-components
// ============================================

/**
 * Expandable cost section with line items
 */
function CostSection({
  title,
  total,
  percentage,
  icon: Icon,
  color,
  bgColor,
  items,
  confidence,
  defaultExpanded = false,
}: CostSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Filter out zero-value items
  const visibleItems = items.filter((item) => item.value > 0);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-3 transition-colors",
          "hover:bg-slate-50 dark:hover:bg-slate-800",
          isExpanded && "bg-slate-50 dark:bg-slate-800"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", bgColor)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium">{title}</span>
              {confidence && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        <Badge
                          variant={
                            confidence === "high"
                              ? "success"
                              : confidence === "medium"
                                ? "warning"
                                : "destructive"
                          }
                          className="text-xs"
                        >
                          {confidence} confidence
                        </Badge>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Estimate confidence based on available data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {percentage.toFixed(1)}% of total
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold">{formatCurrency(total)}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Progress Bar */}
      <div className="px-3">
        <Progress
          value={percentage}
          className="h-1"
          indicatorClassName={bgColor}
        />
      </div>

      {/* Expanded Content */}
      {isExpanded && visibleItems.length > 0 && (
        <div className="p-3 pt-2 space-y-2 border-t bg-slate-50/50 dark:bg-slate-800/50">
          {visibleItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400">
                  {item.label}
                </span>
                {item.note && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.note}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <span className="font-medium">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function CostBreakdownCard({ costs, className }: CostBreakdownCardProps) {
  // Calculate totals - using interface-defined property names
  const acquisition = costs?.acquisition?.totalAcquisition || 0;
  const rehab = costs?.rehab?.totalRehab || 0;
  const holding = costs?.holding?.totalHolding || 0;
  const selling = costs?.selling?.totalSelling || 0;
  const grandTotal = costs?.grandTotal || costs?.totalCosts || acquisition + rehab + holding + selling;

  // Calculate percentages
  const getPercentage = (value: number) =>
    grandTotal > 0 ? (value / grandTotal) * 100 : 0;

  // Build acquisition items - matches AcquisitionCosts interface
  const acquisitionItems = [
    {
      label: "Purchase/Bid Amount",
      value: costs?.acquisition?.bidAmount || 0,
    },
    {
      label: "Buyer's Premium",
      value: costs?.acquisition?.buyersPremium || 0,
      note: "Auction platform fee",
    },
    { label: "Transfer Tax", value: costs?.acquisition?.transferTax || 0 },
    { label: "Recording Fees", value: costs?.acquisition?.recordingFees || 0 },
    { label: "Title Insurance", value: costs?.acquisition?.titleInsurance || 0 },
    { label: "Title Search", value: costs?.acquisition?.titleSearch || 0 },
    { label: "Legal Fees", value: costs?.acquisition?.legalFees || 0 },
  ];

  // Build rehab items - matches RehabBreakdown interface with nested structures
  const rehabItems = [
    {
      label: "Exterior (Roof, Siding, Windows)",
      value: costs?.rehab?.exterior?.total || 0,
    },
    {
      label: "Interior (Flooring, Paint, Fixtures)",
      value: costs?.rehab?.interior?.total || 0,
    },
    {
      label: "Kitchen",
      value: costs?.rehab?.interior?.kitchen || 0,
    },
    {
      label: "Bathrooms",
      value: costs?.rehab?.interior?.bathrooms || 0,
    },
    {
      label: "Systems (HVAC/Electrical/Plumbing)",
      value:
        (costs?.rehab?.interior?.hvac || 0) +
        (costs?.rehab?.interior?.electrical || 0) +
        (costs?.rehab?.interior?.plumbing || 0),
    },
    {
      label: "Structural",
      value: costs?.rehab?.structural?.total || 0,
    },
    {
      label: "Permits",
      value: costs?.rehab?.permits || 0,
      note: "Building permits and inspections",
    },
  ];

  // Build holding items - matches HoldingBreakdown interface (monthly values * months)
  const holdingMonths = costs?.holding?.holdingPeriodMonths || 0;
  const holdingItems = [
    {
      label: "Property Taxes",
      value: (costs?.holding?.monthlyTaxes || 0) * holdingMonths,
      note: `${holdingMonths} months @ ${formatCurrency(costs?.holding?.monthlyTaxes || 0)}/mo`,
    },
    {
      label: "Insurance",
      value: (costs?.holding?.monthlyInsurance || 0) * holdingMonths,
      note: `${holdingMonths} months @ ${formatCurrency(costs?.holding?.monthlyInsurance || 0)}/mo`,
    },
    {
      label: "Utilities",
      value: (costs?.holding?.monthlyUtilities || 0) * holdingMonths,
      note: `${holdingMonths} months @ ${formatCurrency(costs?.holding?.monthlyUtilities || 0)}/mo`,
    },
    {
      label: "Maintenance",
      value: (costs?.holding?.monthlyMaintenance || 0) * holdingMonths,
    },
    {
      label: "Loan Payments",
      value: (costs?.holding?.monthlyLoanPayment || 0) * holdingMonths,
      note: "Monthly loan payments during hold",
    },
    {
      label: "HOA Fees",
      value: (costs?.holding?.monthlyHoa || 0) * holdingMonths,
    },
  ];

  // Build selling items - matches SellingCosts interface
  const sellingItems = [
    {
      label: "Agent Commission",
      value: costs?.selling?.agentCommission || 0,
      note: "Typically 5-6% of sale price",
    },
    { label: "Closing Costs", value: costs?.selling?.closingCosts || 0 },
    { label: "Staging", value: costs?.selling?.staging || 0 },
    { label: "Marketing", value: costs?.selling?.marketing || 0 },
    { label: "Home Warranty", value: costs?.selling?.homeWarranty || 0 },
    {
      label: "Seller Concessions",
      value: costs?.selling?.sellerConcessions || 0,
      note: "Credits to buyer",
    },
  ];

  // Determine rehab confidence - uses CostBreakdown.confidence field
  const rehabConfidence = costs?.confidence || "medium";

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Breakdown
          </div>
          <div className="text-2xl font-bold">{formatCurrency(grandTotal)}</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning if missing data */}
        {(!costs || grandTotal === 0) && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              Cost data is incomplete. Estimates may not be accurate.
            </span>
          </div>
        )}

        {/* Cost Sections */}
        <CostSection
          title="Acquisition"
          total={acquisition}
          percentage={getPercentage(acquisition)}
          icon={Home}
          color={costColors.acquisition.color}
          bgColor={costColors.acquisition.bgColor}
          items={acquisitionItems}
          defaultExpanded={true}
        />

        <CostSection
          title="Rehab"
          total={rehab}
          percentage={getPercentage(rehab)}
          icon={Hammer}
          color={costColors.rehab.color}
          bgColor={costColors.rehab.bgColor}
          items={rehabItems}
          confidence={rehabConfidence as "high" | "medium" | "low"}
        />

        <CostSection
          title="Holding"
          total={holding}
          percentage={getPercentage(holding)}
          icon={Clock}
          color={costColors.holding.color}
          bgColor={costColors.holding.bgColor}
          items={holdingItems}
        />

        <CostSection
          title="Selling"
          total={selling}
          percentage={getPercentage(selling)}
          icon={Tag}
          color={costColors.selling.color}
          bgColor={costColors.selling.bgColor}
          items={sellingItems}
        />

        {/* Summary Footer */}
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Investment</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-center">
            <div className={cn("p-2 rounded", costColors.acquisition.lightBg)}>
              <div className={costColors.acquisition.text}>
                {getPercentage(acquisition).toFixed(0)}%
              </div>
              <div className="text-slate-500">Acq.</div>
            </div>
            <div className={cn("p-2 rounded", costColors.rehab.lightBg)}>
              <div className={costColors.rehab.text}>
                {getPercentage(rehab).toFixed(0)}%
              </div>
              <div className="text-slate-500">Rehab</div>
            </div>
            <div className={cn("p-2 rounded", costColors.holding.lightBg)}>
              <div className={costColors.holding.text}>
                {getPercentage(holding).toFixed(0)}%
              </div>
              <div className="text-slate-500">Hold</div>
            </div>
            <div className={cn("p-2 rounded", costColors.selling.lightBg)}>
              <div className={costColors.selling.text}>
                {getPercentage(selling).toFixed(0)}%
              </div>
              <div className="text-slate-500">Sell</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CostBreakdownCard;
