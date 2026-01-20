"use client";

/**
 * ROI Calculator Card Component
 *
 * Displays comprehensive ROI analysis including IRR, gross/net ROI,
 * cash flow projections, and equity analysis for tax deed property investments.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  PiggyBank,
  Home,
  Percent,
} from "lucide-react";
import {
  calculateROIAnalysis,
  calculateInvestmentMetrics,
  compareStrategies,
  formatROIPercent,
  formatCurrency,
  validateROIInputs,
  type ROIInputs,
  type ROIAnalysis,
  type InvestmentMetrics,
} from "@/lib/analysis/financial/roiCalculator";

// ============================================
// Type Definitions
// ============================================

interface ROICalculatorCardProps {
  /** ROI calculation inputs */
  inputs: ROIInputs;
  /** Optional custom class name */
  className?: string;
  /** Whether to show detailed breakdown */
  showDetails?: boolean;
  /** Whether to show strategy comparison */
  showComparison?: boolean;
  /** Callback when inputs change */
  onInputsChange?: (inputs: ROIInputs) => void;
}

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
  tooltip?: string;
}

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  color?: "green" | "yellow" | "red" | "blue";
  showPercentage?: boolean;
}

// ============================================
// Helper Components
// ============================================

/**
 * Single metric display card
 */
function MetricCard({
  label,
  value,
  subValue,
  icon,
  trend,
  className,
  tooltip,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow",
        className
      )}
      title={tooltip}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {subValue && (
            <p className="text-sm text-slate-500 mt-1">{subValue}</p>
          )}
        </div>
        <div
          className={cn(
            "p-2 rounded-lg",
            trend === "up" && "bg-green-100 text-green-600",
            trend === "down" && "bg-red-100 text-red-600",
            trend === "neutral" && "bg-slate-100 text-slate-600",
            !trend && "bg-blue-100 text-blue-600"
          )}
        >
          {icon}
        </div>
      </div>
      {trend && (
        <div className="flex items-center mt-2">
          {trend === "up" && (
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
          )}
          {trend === "down" && (
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              trend === "up" && "text-green-600",
              trend === "down" && "text-red-600"
            )}
          >
            {trend === "up" ? "Positive return" : "Negative return"}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Progress bar for visual representation
 */
function ProgressBar({
  value,
  max,
  label,
  color = "blue",
  showPercentage = true,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const colorClasses = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        {showPercentage && (
          <span className="text-slate-900 font-medium">
            {percentage.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Expandable section component
 */
function ExpandableSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="font-medium text-slate-900">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-slate-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-500" />
        )}
      </button>
      {isOpen && <div className="p-4 border-t border-slate-200">{children}</div>}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ROICalculatorCard({
  inputs,
  className,
  showDetails = true,
  showComparison = true,
  onInputsChange,
}: ROICalculatorCardProps) {
  // Validate inputs
  const validationErrors = useMemo(() => validateROIInputs(inputs), [inputs]);
  const hasErrors = validationErrors.some(
    (err) => !err.startsWith("Warning:")
  );

  // Calculate ROI analysis
  const roiAnalysis = useMemo(() => {
    if (hasErrors) return null;
    return calculateROIAnalysis(inputs);
  }, [inputs, hasErrors]);

  // Calculate investment metrics
  const metrics = useMemo(() => {
    if (hasErrors) return null;
    return calculateInvestmentMetrics(inputs);
  }, [inputs, hasErrors]);

  // Compare strategies
  const strategyComparison = useMemo(() => {
    if (hasErrors || !showComparison) return null;
    return compareStrategies(inputs, 5);
  }, [inputs, hasErrors, showComparison]);

  // Determine overall health of investment
  const investmentHealth = useMemo(() => {
    if (!roiAnalysis) return "unknown";
    if (roiAnalysis.netROI > 0.25) return "excellent";
    if (roiAnalysis.netROI > 0.15) return "good";
    if (roiAnalysis.netROI > 0.05) return "fair";
    if (roiAnalysis.netROI > 0) return "marginal";
    return "poor";
  }, [roiAnalysis]);

  // If there are validation errors, show error state
  if (hasErrors) {
    return (
      <div className={cn("bg-white rounded-xl border border-red-200 p-6", className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            ROI Calculator - Invalid Inputs
          </h3>
        </div>
        <ul className="space-y-2">
          {validationErrors.map((error, index) => (
            <li
              key={index}
              className={cn(
                "flex items-start gap-2 text-sm",
                error.startsWith("Warning:")
                  ? "text-yellow-700"
                  : "text-red-700"
              )}
            >
              {error.startsWith("Warning:") ? (
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <span>{error}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!roiAnalysis || !metrics) {
    return (
      <div className={cn("bg-white rounded-xl border border-slate-200 p-6", className)}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-lg",
                investmentHealth === "excellent" && "bg-green-100",
                investmentHealth === "good" && "bg-emerald-100",
                investmentHealth === "fair" && "bg-yellow-100",
                investmentHealth === "marginal" && "bg-orange-100",
                investmentHealth === "poor" && "bg-red-100"
              )}
            >
              <Calculator
                className={cn(
                  "h-6 w-6",
                  investmentHealth === "excellent" && "text-green-600",
                  investmentHealth === "good" && "text-emerald-600",
                  investmentHealth === "fair" && "text-yellow-600",
                  investmentHealth === "marginal" && "text-orange-600",
                  investmentHealth === "poor" && "text-red-600"
                )}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                ROI Analysis
              </h3>
              <p className="text-sm text-slate-500">
                Investment return projections
              </p>
            </div>
          </div>
          <div
            className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              investmentHealth === "excellent" && "bg-green-100 text-green-700",
              investmentHealth === "good" && "bg-emerald-100 text-emerald-700",
              investmentHealth === "fair" && "bg-yellow-100 text-yellow-700",
              investmentHealth === "marginal" && "bg-orange-100 text-orange-700",
              investmentHealth === "poor" && "bg-red-100 text-red-700"
            )}
          >
            {investmentHealth.charAt(0).toUpperCase() + investmentHealth.slice(1)}{" "}
            Investment
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Net ROI"
          value={formatROIPercent(roiAnalysis.netROI)}
          subValue={`${inputs.holdingMonths} month hold`}
          icon={<Percent className="h-5 w-5" />}
          trend={roiAnalysis.netROI > 0 ? "up" : "down"}
          tooltip="Net return on investment after all costs"
        />
        <MetricCard
          label="Annualized IRR"
          value={formatROIPercent(roiAnalysis.irr)}
          subValue="Internal rate of return"
          icon={<TrendingUp className="h-5 w-5" />}
          trend={roiAnalysis.irr > 0.1 ? "up" : roiAnalysis.irr > 0 ? "neutral" : "down"}
          tooltip="Annualized internal rate of return"
        />
        <MetricCard
          label="Expected Profit"
          value={formatCurrency(metrics.expectedNetProfit)}
          subValue={`${formatCurrency(metrics.profitPerMonth)}/mo`}
          icon={<DollarSign className="h-5 w-5" />}
          trend={metrics.expectedNetProfit > 0 ? "up" : "down"}
          tooltip="Net profit after all costs and selling expenses"
        />
        <MetricCard
          label="Cash Required"
          value={formatCurrency(metrics.totalCashRequired)}
          subValue="Total investment"
          icon={<PiggyBank className="h-5 w-5" />}
          tooltip="Total cash needed to execute this investment"
        />
      </div>

      {/* Equity Analysis */}
      <div className="px-6 pb-6">
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
            <Home className="h-4 w-4" />
            Instant Equity Analysis
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Instant Equity</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(roiAnalysis.instantEquity)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Equity Percentage</p>
              <p className="text-xl font-bold text-green-600">
                {formatROIPercent(roiAnalysis.instantEquityPercent)}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar
              value={roiAnalysis.instantEquityPercent * 100}
              max={100}
              label="Equity Position"
              color={roiAnalysis.instantEquityPercent > 0.2 ? "green" : "yellow"}
            />
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      {showDetails && (
        <div className="px-6 pb-6 space-y-4">
          <ExpandableSection title="Investment Breakdown" defaultOpen>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Acquisition Cost</span>
                <span className="font-medium">
                  {formatCurrency(roiAnalysis.acquisitionCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Closing Costs</span>
                <span className="font-medium">
                  {formatCurrency(roiAnalysis.estimatedClosingCosts)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Rehab Costs</span>
                <span className="font-medium">
                  {formatCurrency(roiAnalysis.estimatedRehabCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  Holding Costs ({inputs.holdingMonths} mo)
                </span>
                <span className="font-medium">
                  {formatCurrency(inputs.monthlyHoldingCosts * inputs.holdingMonths)}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between text-sm font-medium">
                <span className="text-slate-900">Total Investment</span>
                <span className="text-slate-900">
                  {formatCurrency(metrics.totalCashRequired)}
                </span>
              </div>
            </div>
          </ExpandableSection>

          <ExpandableSection title="Return Metrics">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Gross ROI</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {metrics.grossROIPercent.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Net ROI</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {metrics.netROIPercent.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Annualized Return</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {metrics.annualizedReturn.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Break-even Price</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrency(metrics.breakEvenPrice)}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h5 className="text-sm font-medium text-slate-900 mb-2">
                  Confidence Range
                </h5>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500">
                    Low: {formatROIPercent(roiAnalysis.confidenceRange.min)}
                  </span>
                  <div className="flex-1 h-2 bg-slate-200 rounded-full relative">
                    <div
                      className="absolute h-full bg-blue-500 rounded-full"
                      style={{
                        left: `${Math.max(0, roiAnalysis.confidenceRange.min * 100 / 2 + 50)}%`,
                        right: `${100 - Math.min(100, roiAnalysis.confidenceRange.max * 100 / 2 + 50)}%`,
                      }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full border-2 border-white"
                      style={{
                        left: `${Math.max(0, Math.min(100, roiAnalysis.netROI * 100 / 2 + 50))}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-slate-500">
                    High: {formatROIPercent(roiAnalysis.confidenceRange.max)}
                  </span>
                </div>
              </div>
            </div>
          </ExpandableSection>

          {/* Rental Analysis (if applicable) */}
          {inputs.monthlyRent && inputs.monthlyRent > 0 && (
            <ExpandableSection title="Rental Analysis">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Monthly Rent</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(roiAnalysis.monthlyRentEstimate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Monthly Cash Flow</p>
                    <p
                      className={cn(
                        "text-lg font-semibold",
                        roiAnalysis.monthlyCashFlow > 0
                          ? "text-green-600"
                          : "text-red-600"
                      )}
                    >
                      {formatCurrency(roiAnalysis.monthlyCashFlow)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Cap Rate</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatROIPercent(roiAnalysis.capRate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Cash-on-Cash</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatROIPercent(roiAnalysis.cashOnCashReturn)}
                    </p>
                  </div>
                </div>
              </div>
            </ExpandableSection>
          )}

          {/* Strategy Comparison */}
          {showComparison && strategyComparison && (
            <ExpandableSection title="Flip vs. Hold Comparison">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h5 className="font-medium text-slate-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Flip Strategy
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">IRR</span>
                      <span className="font-medium">
                        {formatROIPercent(strategyComparison.flip.irr)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Net ROI</span>
                      <span className="font-medium">
                        {formatROIPercent(strategyComparison.flip.netROI)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Profit</span>
                      <span className="font-medium">
                        {formatCurrency(strategyComparison.flip.totalProfit)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h5 className="font-medium text-slate-900 flex items-center gap-2">
                    <Home className="h-4 w-4 text-green-500" />
                    Hold Strategy (5yr)
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">IRR</span>
                      <span className="font-medium">
                        {formatROIPercent(strategyComparison.hold.irr)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Net ROI</span>
                      <span className="font-medium">
                        {formatROIPercent(strategyComparison.hold.netROI)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Monthly Cash Flow</span>
                      <span className="font-medium">
                        {formatCurrency(strategyComparison.hold.monthlyCashFlow)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Recommendation:</strong>{" "}
                  {strategyComparison.flip.irr > strategyComparison.hold.irr
                    ? "Flip strategy offers higher annualized returns for this property."
                    : "Hold strategy may provide better long-term value with rental income."}
                </p>
              </div>
            </ExpandableSection>
          )}
        </div>
      )}

      {/* Warnings */}
      {validationErrors.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-yellow-800 flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" />
              Warnings
            </h5>
            <ul className="space-y-1">
              {validationErrors
                .filter((err) => err.startsWith("Warning:"))
                .map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700">
                    {warning.replace("Warning: ", "")}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default ROICalculatorCard;
