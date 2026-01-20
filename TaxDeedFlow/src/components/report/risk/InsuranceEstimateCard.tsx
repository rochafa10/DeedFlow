"use client";

import * as React from "react";
import {
  Shield,
  Droplets,
  Mountain,
  Flame,
  Wind,
  AlertTriangle,
  Info,
  DollarSign,
  Calculator,
  HelpCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { InsuranceEstimates } from "@/types/risk-analysis";
import { SimpleChartWrapper } from "../charts/AccessibleChartWrapper";

/**
 * Props for the InsuranceEstimateCard component
 */
export interface InsuranceEstimateCardProps {
  /** Insurance estimates data */
  estimates: InsuranceEstimates;
  /** Property estimated value (for context) */
  propertyValue?: number;
  /** Whether to show the breakdown chart */
  showChart?: boolean;
  /** Whether to show detailed breakdown */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Insurance type configuration
 */
const INSURANCE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
    typical: string;
  }
> = {
  floodInsurance: {
    label: "Flood Insurance",
    icon: <Droplets className="h-4 w-4" />,
    color: "#3b82f6", // blue-500
    description: "National Flood Insurance Program (NFIP) or private flood insurance",
    typical: "$500 - $3,000/year depending on flood zone",
  },
  earthquakeInsurance: {
    label: "Earthquake Insurance",
    icon: <Mountain className="h-4 w-4" />,
    color: "#8b5cf6", // violet-500
    description: "Coverage for earthquake damage (often a separate policy)",
    typical: "0.5% - 1.5% of home value/year",
  },
  fireInsurance: {
    label: "Fire/Wildfire Insurance",
    icon: <Flame className="h-4 w-4" />,
    color: "#f97316", // orange-500
    description: "Standard homeowner's or specialized wildfire coverage",
    typical: "$500 - $2,500/year for high-risk areas",
  },
  windstormInsurance: {
    label: "Windstorm/Hurricane Insurance",
    icon: <Wind className="h-4 w-4" />,
    color: "#06b6d4", // cyan-500
    description: "Coverage for wind damage (may be separate in coastal areas)",
    typical: "1% - 5% of home value/year for coastal areas",
  },
};

/**
 * Format currency value
 */
function formatCurrency(value: number | null): string {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Custom tooltip for pie chart
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { name: string; value: number; color: string };
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const config = INSURANCE_CONFIG[data.name];

  return (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: data.color }}>{config?.icon}</span>
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {config?.label || data.name}
        </span>
      </div>
      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {formatCurrency(data.value)}
      </p>
    </div>
  );
}

/**
 * InsuranceEstimateCard - Displays estimated insurance costs
 *
 * Features:
 * - Total annual insurance cost prominently displayed
 * - Pie chart breakdown of insurance types
 * - Individual insurance type details
 * - Availability warnings
 * - Percentage of property value context
 * - Helpful tooltips and explanations
 *
 * @example
 * ```tsx
 * <InsuranceEstimateCard
 *   estimates={assessment.insuranceEstimates}
 *   propertyValue={250000}
 *   showChart={true}
 * />
 * ```
 */
export function InsuranceEstimateCard({
  estimates,
  propertyValue,
  showChart = true,
  showDetails = true,
  className,
}: InsuranceEstimateCardProps) {
  const [showTooltips, setShowTooltips] = React.useState<Record<string, boolean>>({});

  // Prepare chart data
  const chartData = [
    { name: "floodInsurance", value: estimates.floodInsurance || 0, color: INSURANCE_CONFIG.floodInsurance.color },
    { name: "earthquakeInsurance", value: estimates.earthquakeInsurance || 0, color: INSURANCE_CONFIG.earthquakeInsurance.color },
    { name: "fireInsurance", value: estimates.fireInsurance || 0, color: INSURANCE_CONFIG.fireInsurance.color },
    { name: "windstormInsurance", value: estimates.windstormInsurance || 0, color: INSURANCE_CONFIG.windstormInsurance.color },
  ].filter((d) => d.value > 0);

  // Calculate percentage of property value
  const percentOfValue = propertyValue
    ? ((estimates.totalAnnualCost / propertyValue) * 100).toFixed(2)
    : null;

  // Check if any insurance is needed
  const hasInsuranceCosts = estimates.totalAnnualCost > 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden",
        className
      )}
      role="region"
      aria-label="Insurance Cost Estimates"
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Insurance Cost Estimates
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Estimated annual premiums based on risk assessment
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Total Annual Cost
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(estimates.totalAnnualCost)}
            </p>
            {percentOfValue && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {percentOfValue}% of property value
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-6">
        {/* No insurance needed */}
        {!hasInsuranceCosts && (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              Minimal Insurance Requirements
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Standard homeowner&apos;s insurance should be sufficient for this property.
            </p>
          </div>
        )}

        {/* Chart and breakdown */}
        {hasInsuranceCosts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie chart */}
            {showChart && chartData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Insurance Cost Breakdown
                </h4>
                <SimpleChartWrapper
                  label={`Insurance breakdown: ${chartData.map(d => `${INSURANCE_CONFIG[d.name]?.label}: ${formatCurrency(d.value)}`).join(', ')}`}
                >
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {chartData.map((entry) => {
                      const config = INSURANCE_CONFIG[entry.name];
                      return (
                        <div key={entry.name} className="flex items-center gap-1 text-xs">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-slate-600 dark:text-slate-400">
                            {config?.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </SimpleChartWrapper>
              </div>
            )}

            {/* Detailed breakdown */}
            {showDetails && (
              <div className="space-y-3">
                {Object.entries(INSURANCE_CONFIG).map(([key, config]) => {
                  const value = estimates[key as keyof InsuranceEstimates] as number | null;
                  const isActive = value !== null && value > 0;

                  return (
                    <div
                      key={key}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        isActive
                          ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "p-1.5 rounded",
                              isActive ? "bg-opacity-20" : "bg-slate-200 dark:bg-slate-700"
                            )}
                            style={isActive ? { backgroundColor: config.color + "30", color: config.color } : undefined}
                          >
                            {config.icon}
                          </span>
                          <div>
                            <span className={cn(
                              "text-sm font-medium",
                              isActive ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
                            )}>
                              {config.label}
                            </span>
                          </div>
                          <button
                            onClick={() => setShowTooltips(prev => ({ ...prev, [key]: !prev[key] }))}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            aria-label={`More info about ${config.label}`}
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span
                          className={cn(
                            "font-semibold",
                            isActive
                              ? "text-slate-900 dark:text-slate-100"
                              : "text-slate-400 dark:text-slate-500"
                          )}
                        >
                          {isActive ? formatCurrency(value) : "Not Required"}
                        </span>
                      </div>

                      {/* Tooltip content */}
                      {showTooltips[key] && (
                        <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded text-xs text-slate-600 dark:text-slate-400">
                          <p>{config.description}</p>
                          <p className="mt-1 text-slate-500 dark:text-slate-500">
                            Typical range: {config.typical}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Availability warnings */}
        {estimates.availabilityWarnings.length > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                  Insurance Availability Concerns
                </p>
                <ul className="space-y-1">
                  {estimates.availabilityWarnings.map((warning, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2"
                    >
                      <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Monthly breakdown */}
        {hasInsuranceCosts && (
          <div className="mt-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Monthly Impact
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Monthly</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(estimates.totalAnnualCost / 12)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Quarterly</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(estimates.totalAnnualCost / 4)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Semi-Annual</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(estimates.totalAnnualCost / 2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Annual</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(estimates.totalAnnualCost)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            These are estimates based on risk assessment data. Actual premiums may vary
            based on property-specific factors, insurance provider, and policy options.
            Contact insurance providers for accurate quotes.
          </p>
        </div>
      </div>
    </div>
  );
}

export default InsuranceEstimateCard;
