"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  Shield,
  FileWarning,
  Droplets,
  Building,
  Scale,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection, ReportSubsection } from "../shared/ReportSection";
import { MetricDisplay, MetricGrid } from "../shared/MetricDisplay";
import { RiskIndicator, RiskMeter, RiskSummary } from "../shared/RiskIndicator";
import { CategoryGrade } from "../shared/GradeDisplay";
import { ScoreBar } from "../charts/ScoreGauge";
import { DataUnavailable } from "../shared/ErrorState";
import { ScreenReaderOnly } from "../shared/AccessibilityHelpers";
import type { Grade, RiskLevel } from "@/types/report";

/**
 * Individual risk item
 */
export interface RiskItem {
  /** Risk category */
  category: string;
  /** Risk description */
  description: string;
  /** Risk level */
  level: RiskLevel;
  /** Impact if risk materializes */
  impact?: string;
  /** Mitigation strategy */
  mitigation?: string;
  /** Estimated cost to resolve */
  estimatedCost?: number;
  /** Source of risk information */
  source?: string;
}

/**
 * Title/Lien risk data
 */
export interface TitleRisk {
  /** Whether title search was completed */
  searchCompleted: boolean;
  /** Number of liens found */
  lienCount: number;
  /** Total lien amount */
  totalLienAmount: number;
  /** Types of liens */
  lienTypes: string[];
  /** Liens that survive the sale */
  survivingLiens?: string[];
  /** Title insurance available */
  titleInsuranceAvailable?: boolean;
  /** Estimated title clearing cost */
  clearingCost?: number;
}

/**
 * Environmental risk data
 */
export interface EnvironmentalRisk {
  /** Flood zone designation */
  floodZone?: string;
  /** Whether in flood zone */
  inFloodZone: boolean;
  /** Environmental contamination risk */
  contaminationRisk: RiskLevel;
  /** Nearby environmental hazards */
  nearbyHazards?: string[];
  /** Phase I assessment needed */
  phaseOneNeeded?: boolean;
  /** Estimated remediation cost */
  remediationCost?: number;
}

/**
 * Property condition risk data
 */
export interface ConditionRisk {
  /** Overall condition rating */
  overallCondition: "excellent" | "good" | "fair" | "poor" | "unknown";
  /** Structural issues */
  structuralIssues?: string[];
  /** Code violations */
  codeViolations?: string[];
  /** Estimated repair cost */
  estimatedRepairCost?: number;
  /** Inspection recommended */
  inspectionRecommended: boolean;
}

/**
 * Props for the RiskAssessment component
 */
export interface RiskAssessmentProps {
  /** Risk score (0-25, inverse - lower is riskier) */
  score: number;
  /** Maximum score */
  maxScore?: number;
  /** Risk grade */
  grade: Grade;
  /** Overall risk level */
  overallRisk: RiskLevel;
  /** Individual risk items */
  risks: RiskItem[];
  /** Title risk data */
  titleRisk?: TitleRisk;
  /** Environmental risk data */
  environmentalRisk?: EnvironmentalRisk;
  /** Condition risk data */
  conditionRisk?: ConditionRisk;
  /** Risk summary text */
  summary?: string;
  /** Recommended actions */
  recommendations?: string[];
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Risk level to color mapping
 */
const RISK_COLORS: Record<RiskLevel, string> = {
  low: "text-green-600 dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  high: "text-orange-600 dark:text-orange-400",
  critical: "text-red-600 dark:text-red-400",
};

const RISK_BG_COLORS: Record<RiskLevel, string> = {
  low: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  medium: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  high: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  critical: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
};

/**
 * Condition to display mapping
 */
const CONDITION_DISPLAY: Record<string, { label: string; color: string }> = {
  excellent: { label: "Excellent", color: "text-green-600 dark:text-green-400" },
  good: { label: "Good", color: "text-blue-600 dark:text-blue-400" },
  fair: { label: "Fair", color: "text-yellow-600 dark:text-yellow-400" },
  poor: { label: "Poor", color: "text-red-600 dark:text-red-400" },
  unknown: { label: "Unknown", color: "text-slate-500 dark:text-slate-400" },
};

/**
 * RiskAssessment - Section 4: Comprehensive risk analysis
 *
 * Features:
 * - Overall risk level with meter visualization
 * - Risk score and grade
 * - Title/Lien risks
 * - Environmental risks (flood zone, contamination)
 * - Property condition risks
 * - Individual risk items with mitigation strategies
 * - Recommended actions
 *
 * @example
 * ```tsx
 * <RiskAssessment
 *   score={18}
 *   grade="B"
 *   overallRisk="medium"
 *   risks={[
 *     { category: "Title", description: "Minor liens found", level: "medium", mitigation: "Title insurance available" },
 *     { category: "Environmental", description: "Not in flood zone", level: "low" },
 *   ]}
 *   titleRisk={{ searchCompleted: true, lienCount: 2, totalLienAmount: 1500, lienTypes: ["municipal"] }}
 * />
 * ```
 */
export function RiskAssessment({
  score,
  maxScore = 25,
  grade,
  overallRisk,
  risks,
  titleRisk,
  environmentalRisk,
  conditionRisk,
  summary,
  recommendations = [],
  defaultCollapsed = false,
  className,
}: RiskAssessmentProps) {
  // Calculate percentage
  const percentage = useMemo(
    () => Math.round((score / maxScore) * 100),
    [score, maxScore]
  );

  // Count risks by level
  const riskCounts = useMemo(
    () =>
      risks.reduce(
        (acc, risk) => {
          acc[risk.level] = (acc[risk.level] || 0) + 1;
          return acc;
        },
        {} as Record<RiskLevel, number>
      ),
    [risks]
  );

  // Total estimated cost to mitigate all risks
  const totalMitigationCost = useMemo(
    () =>
      risks.reduce((sum, risk) => sum + (risk.estimatedCost || 0), 0) +
      (titleRisk?.clearingCost || 0) +
      (environmentalRisk?.remediationCost || 0) +
      (conditionRisk?.estimatedRepairCost || 0),
    [risks, titleRisk, environmentalRisk, conditionRisk]
  );

  return (
    <ReportSection
      id="risk-assessment"
      title="Risk Assessment"
      icon={<Shield className="h-5 w-5" />}
      defaultCollapsed={defaultCollapsed}
      className={className}
      headerRight={
        <div className="flex items-center gap-3">
          <RiskIndicator level={overallRisk} size="sm" showLabel />
          <CategoryGrade grade={grade} />
        </div>
      }
    >
      {/* Risk Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Risk Meter */}
        <div className="flex flex-col items-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <RiskMeter level={overallRisk} size="lg" />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Overall Risk Level
          </p>
        </div>

        {/* Risk Summary */}
        <div className="lg:col-span-2">
          <RiskSummary
            level={overallRisk}
            title="Risk Summary"
            description={summary || `This property has a ${overallRisk} overall risk level based on ${risks.length} identified risk factors.`}
            riskCounts={riskCounts}
          />
          <div className="mt-3 flex items-center gap-4">
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Risk Score</span>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {score}/{maxScore} pts ({percentage}%)
              </p>
            </div>
            {totalMitigationCost > 0 && (
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400">Est. Mitigation Cost</span>
                <p className="font-semibold text-orange-600 dark:text-orange-400">
                  ${totalMitigationCost.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title/Lien Risks */}
      {titleRisk && (
        <ReportSubsection
          title="Title & Lien Analysis"
          icon={<Scale className="h-4 w-4" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {titleRisk.searchCompleted ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Title Search: {titleRisk.searchCompleted ? "Completed" : "Pending"}
                </span>
              </div>

              <MetricGrid columns={2}>
                <MetricDisplay
                  label="Liens Found"
                  value={titleRisk.lienCount}
                  trend={titleRisk.lienCount > 0 ? "negative" : "positive"}
                />
                <MetricDisplay
                  label="Total Lien Amount"
                  value={titleRisk.totalLienAmount}
                  format="currency"
                />
              </MetricGrid>

              {titleRisk.lienTypes.length > 0 && (
                <div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Lien Types:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {titleRisk.lienTypes.map((type, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-xs rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {titleRisk.survivingLiens && titleRisk.survivingLiens.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Surviving Liens
                  </p>
                  <ul className="mt-1 space-y-1">
                    {titleRisk.survivingLiens.map((lien, idx) => (
                      <li key={idx} className="text-sm text-amber-700 dark:text-amber-400">
                        {lien}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {titleRisk.titleInsuranceAvailable && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Title insurance available
                </div>
              )}

              {titleRisk.clearingCost !== undefined && titleRisk.clearingCost > 0 && (
                <MetricDisplay
                  label="Est. Title Clearing Cost"
                  value={titleRisk.clearingCost}
                  format="currency"
                />
              )}
            </div>
          </div>
        </ReportSubsection>
      )}

      {/* Environmental Risks */}
      {environmentalRisk && (
        <ReportSubsection
          title="Environmental Analysis"
          icon={<Droplets className="h-4 w-4" />}
          className="mt-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {environmentalRisk.inFloodZone ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Flood Zone: {environmentalRisk.inFloodZone ? "Yes" : "No"}
                  {environmentalRisk.floodZone && ` (${environmentalRisk.floodZone})`}
                </span>
              </div>

              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400">Contamination Risk:</span>
                <div className="mt-1">
                  <RiskIndicator level={environmentalRisk.contaminationRisk} size="sm" showLabel />
                </div>
              </div>

              {environmentalRisk.phaseOneNeeded && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Phase I Environmental Assessment recommended
                </div>
              )}
            </div>

            <div className="space-y-3">
              {environmentalRisk.nearbyHazards && environmentalRisk.nearbyHazards.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Nearby Hazards
                  </p>
                  <ul className="mt-1 space-y-1">
                    {environmentalRisk.nearbyHazards.map((hazard, idx) => (
                      <li key={idx} className="text-sm text-amber-700 dark:text-amber-400">
                        {hazard}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {environmentalRisk.remediationCost !== undefined && environmentalRisk.remediationCost > 0 && (
                <MetricDisplay
                  label="Est. Remediation Cost"
                  value={environmentalRisk.remediationCost}
                  format="currency"
                />
              )}
            </div>
          </div>
        </ReportSubsection>
      )}

      {/* Property Condition Risks */}
      {conditionRisk && (
        <ReportSubsection
          title="Property Condition"
          icon={<Building className="h-4 w-4" />}
          className="mt-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400">Overall Condition:</span>
                <p className={cn("font-semibold", CONDITION_DISPLAY[conditionRisk.overallCondition]?.color)}>
                  {CONDITION_DISPLAY[conditionRisk.overallCondition]?.label}
                </p>
              </div>

              {conditionRisk.inspectionRecommended && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Professional inspection recommended
                </div>
              )}

              {conditionRisk.estimatedRepairCost !== undefined && (
                <MetricDisplay
                  label="Est. Repair Cost"
                  value={conditionRisk.estimatedRepairCost}
                  format="currency"
                />
              )}
            </div>

            <div className="space-y-3">
              {conditionRisk.structuralIssues && conditionRisk.structuralIssues.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Structural Issues
                  </p>
                  <ul className="mt-1 space-y-1">
                    {conditionRisk.structuralIssues.map((issue, idx) => (
                      <li key={idx} className="text-sm text-red-700 dark:text-red-400">
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {conditionRisk.codeViolations && conditionRisk.codeViolations.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Code Violations
                  </p>
                  <ul className="mt-1 space-y-1">
                    {conditionRisk.codeViolations.map((violation, idx) => (
                      <li key={idx} className="text-sm text-amber-700 dark:text-amber-400">
                        {violation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </ReportSubsection>
      )}

      {/* Individual Risk Items */}
      {risks.length > 0 && (
        <ReportSubsection
          title="Risk Details"
          icon={<FileWarning className="h-4 w-4" />}
          className="mt-6"
        >
          <div className="space-y-3">
            {risks.map((risk, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-4 rounded-lg border",
                  RISK_BG_COLORS[risk.level]
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {risk.category}
                      </span>
                      <RiskIndicator level={risk.level} size="sm" />
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {risk.description}
                    </p>
                    {risk.impact && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        <strong>Impact:</strong> {risk.impact}
                      </p>
                    )}
                    {risk.mitigation && (
                      <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                        <strong>Mitigation:</strong> {risk.mitigation}
                      </p>
                    )}
                  </div>
                  {risk.estimatedCost !== undefined && risk.estimatedCost > 0 && (
                    <div className="text-right">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Est. Cost</span>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        ${risk.estimatedCost.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ReportSubsection>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Recommended Actions
          </h4>
          <ol className="space-y-2 list-decimal list-inside">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-blue-700 dark:text-blue-400">
                {rec}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Screen Reader Summary */}
      <ScreenReaderOnly>
        <div>
          <h4>Risk Assessment Summary</h4>
          <p>Overall Risk Level: {overallRisk}</p>
          <p>Risk Score: {score} out of {maxScore}</p>
          <p>Total risks identified: {risks.length}</p>
          <table>
            <caption>Risk Details</caption>
            <thead>
              <tr>
                <th>Category</th>
                <th>Level</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((risk, idx) => (
                <tr key={idx}>
                  <td>{risk.category}</td>
                  <td>{risk.level}</td>
                  <td>{risk.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScreenReaderOnly>
    </ReportSection>
  );
}

export default RiskAssessment;
