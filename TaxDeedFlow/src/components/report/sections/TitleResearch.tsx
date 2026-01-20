"use client";

import * as React from "react";
import {
  FileText,
  Scale,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Building,
  User,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection, ReportSubsection } from "../shared/ReportSection";
import { MetricDisplay, MetricGrid } from "../shared/MetricDisplay";
import { RiskIndicator } from "../shared/RiskIndicator";
import { DataUnavailable } from "../shared/ErrorState";
import { ScreenReaderOnly } from "../shared/AccessibilityHelpers";
import type { RiskLevel } from "@/types/report";
import { formatValue } from "@/types/report";

/**
 * Lien or encumbrance record
 */
export interface LienRecord {
  /** Unique identifier */
  id: string;
  /** Type of lien */
  type: string;
  /** Lien holder name */
  holder: string;
  /** Original amount */
  originalAmount: number;
  /** Current balance (if known) */
  currentBalance?: number;
  /** Recording date */
  recordingDate: Date;
  /** Recording reference number */
  recordingRef?: string;
  /** Priority position */
  position?: number;
  /** Whether this lien survives the tax sale */
  survivesSale: boolean;
  /** Status */
  status: "active" | "satisfied" | "released" | "unknown";
  /** Notes */
  notes?: string;
}

/**
 * Ownership history record
 */
export interface OwnershipRecord {
  /** Owner name */
  ownerName: string;
  /** Acquisition date */
  acquiredDate: Date;
  /** Sale price (if recorded) */
  salePrice?: number;
  /** Document reference */
  documentRef?: string;
  /** Deed type */
  deedType?: string;
}

/**
 * Title issue item
 */
export interface TitleIssue {
  /** Issue type */
  type: string;
  /** Description */
  description: string;
  /** Severity */
  severity: "low" | "medium" | "high" | "critical";
  /** Estimated cost to resolve */
  estimatedCost?: number;
  /** Resolution steps */
  resolution?: string;
  /** Whether this blocks purchase */
  blocksPurchase: boolean;
}

/**
 * Title research summary
 */
export interface TitleResearchSummary {
  /** Search completed */
  searchCompleted: boolean;
  /** Search date */
  searchDate?: Date;
  /** Search provider */
  searchProvider?: string;
  /** Total liens found */
  totalLiens: number;
  /** Total lien amount */
  totalLienAmount: number;
  /** Surviving liens count */
  survivingLiensCount: number;
  /** Surviving liens amount */
  survivingLiensAmount: number;
  /** Title issues found */
  issuesFound: number;
  /** Overall title risk */
  overallRisk: RiskLevel;
  /** Title insurance available */
  titleInsuranceAvailable: boolean;
  /** Estimated title insurance cost */
  titleInsuranceCost?: number;
  /** Estimated clearing cost */
  estimatedClearingCost?: number;
}

/**
 * Props for the TitleResearch component
 */
export interface TitleResearchProps {
  /** Title research summary */
  summary: TitleResearchSummary;
  /** Lien records */
  liens?: LienRecord[];
  /** Ownership history */
  ownershipHistory?: OwnershipRecord[];
  /** Title issues */
  issues?: TitleIssue[];
  /** Recorder's office URL */
  recorderUrl?: string;
  /** Recommendations */
  recommendations?: string[];
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Lien type configuration
 */
const LIEN_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  mortgage: {
    icon: <Building className="h-4 w-4" />,
    color: "text-blue-600 dark:text-blue-400",
  },
  tax: {
    icon: <DollarSign className="h-4 w-4" />,
    color: "text-red-600 dark:text-red-400",
  },
  municipal: {
    icon: <Building className="h-4 w-4" />,
    color: "text-orange-600 dark:text-orange-400",
  },
  judgment: {
    icon: <Scale className="h-4 w-4" />,
    color: "text-purple-600 dark:text-purple-400",
  },
  mechanic: {
    icon: <FileText className="h-4 w-4" />,
    color: "text-yellow-600 dark:text-yellow-400",
  },
  hoa: {
    icon: <Building className="h-4 w-4" />,
    color: "text-pink-600 dark:text-pink-400",
  },
  irs: {
    icon: <Scale className="h-4 w-4" />,
    color: "text-red-700 dark:text-red-300",
  },
  other: {
    icon: <FileText className="h-4 w-4" />,
    color: "text-slate-600 dark:text-slate-400",
  },
};

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: LienRecord["status"] }) {
  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: "Active",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    satisfied: {
      label: "Satisfied",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    released: {
      label: "Released",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    unknown: {
      label: "Unknown",
      className: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    },
  };

  const { label, className } = config[status] || config.unknown;

  return (
    <span className={cn("px-2 py-0.5 text-xs rounded-full font-medium", className)}>
      {label}
    </span>
  );
}

/**
 * TitleResearch - Section 9: Title and lien analysis
 *
 * Features:
 * - Title search summary
 * - Lien records with details
 * - Surviving liens highlight
 * - Ownership history
 * - Title issues
 * - Title insurance availability
 * - Recommendations
 *
 * @example
 * ```tsx
 * <TitleResearch
 *   summary={{
 *     searchCompleted: true,
 *     totalLiens: 3,
 *     totalLienAmount: 15000,
 *     survivingLiensCount: 1,
 *     survivingLiensAmount: 2500,
 *     issuesFound: 1,
 *     overallRisk: "medium",
 *     titleInsuranceAvailable: true,
 *   }}
 *   liens={[
 *     { id: "1", type: "municipal", holder: "City of Altoona", originalAmount: 2500, survivesSale: true, status: "active", recordingDate: new Date() },
 *   ]}
 * />
 * ```
 */
export function TitleResearch({
  summary,
  liens = [],
  ownershipHistory = [],
  issues = [],
  recorderUrl,
  recommendations = [],
  defaultCollapsed = false,
  className,
}: TitleResearchProps) {
  // Check if search was completed
  if (!summary.searchCompleted) {
    return (
      <ReportSection
        id="title-research"
        title="Title Research"
        icon={<FileText className="h-5 w-5" />}
        defaultCollapsed={defaultCollapsed}
        className={className}
      >
        <DataUnavailable
          title="Title Search Pending"
          description="Title search has not been completed for this property. This information is critical for understanding liens and encumbrances."
          actionLabel="Request Title Search"
        />
      </ReportSection>
    );
  }

  // Separate surviving and non-surviving liens
  const survivingLiens = liens.filter((l) => l.survivesSale && l.status === "active");
  const otherLiens = liens.filter((l) => !l.survivesSale || l.status !== "active");

  return (
    <ReportSection
      id="title-research"
      title="Title Research"
      icon={<FileText className="h-5 w-5" />}
      defaultCollapsed={defaultCollapsed}
      className={className}
      headerRight={
        <div className="flex items-center gap-2">
          <RiskIndicator level={summary.overallRisk} size="sm" showLabel />
        </div>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Total Liens
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {summary.totalLiens}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatValue(summary.totalLienAmount, "currency")}
          </span>
        </div>

        <div
          className={cn(
            "p-3 rounded-lg text-center",
            summary.survivingLiensCount > 0
              ? "bg-red-50 dark:bg-red-900/20"
              : "bg-green-50 dark:bg-green-900/20"
          )}
        >
          <span
            className={cn(
              "text-xs block",
              summary.survivingLiensCount > 0
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            )}
          >
            Surviving Liens
          </span>
          <span
            className={cn(
              "text-2xl font-bold",
              summary.survivingLiensCount > 0
                ? "text-red-700 dark:text-red-300"
                : "text-green-700 dark:text-green-300"
            )}
          >
            {summary.survivingLiensCount}
          </span>
          {summary.survivingLiensAmount > 0 && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {formatValue(summary.survivingLiensAmount, "currency")}
            </span>
          )}
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Issues Found
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {summary.issuesFound}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Est. Clearing Cost
          </span>
          <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {summary.estimatedClearingCost
              ? formatValue(summary.estimatedClearingCost, "currency")
              : "-"}
          </span>
        </div>
      </div>

      {/* Title Insurance */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 mb-6">
        {summary.titleInsuranceAvailable ? (
          <>
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">
                Title Insurance Available
              </p>
              {summary.titleInsuranceCost && (
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Estimated cost: {formatValue(summary.titleInsuranceCost, "currency")}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Title Insurance May Not Be Available
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Additional title work may be required
              </p>
            </div>
          </>
        )}
      </div>

      {/* Surviving Liens (Critical) */}
      {survivingLiens.length > 0 && (
        <ReportSubsection
          title="Surviving Liens"
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          className="bg-red-50/50 dark:bg-red-900/10 rounded-lg"
        >
          <div className="p-2 mb-3 rounded bg-red-100 dark:bg-red-900/30 text-sm text-red-700 dark:text-red-300">
            <strong>Warning:</strong> These liens will NOT be extinguished by the tax sale
            and will transfer with the property.
          </div>
          <div className="space-y-3">
            {survivingLiens.map((lien) => {
              const typeConfig = LIEN_TYPE_CONFIG[lien.type.toLowerCase()] || LIEN_TYPE_CONFIG.other;
              return (
                <div
                  key={lien.id}
                  className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg bg-red-100 dark:bg-red-900/30", typeConfig.color)}>
                        {typeConfig.icon}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {lien.type}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {lien.holder}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Recorded: {formatValue(lien.recordingDate, "date")}
                          {lien.recordingRef && ` | Ref: ${lien.recordingRef}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {formatValue(lien.currentBalance || lien.originalAmount, "currency")}
                      </p>
                      <StatusBadge status={lien.status} />
                    </div>
                  </div>
                  {lien.notes && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 italic">
                      {lien.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ReportSubsection>
      )}

      {/* Other Liens */}
      {otherLiens.length > 0 && (
        <ReportSubsection
          title="Other Liens & Encumbrances"
          icon={<Scale className="h-4 w-4" />}
          className="mt-6"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            These liens are expected to be extinguished by the tax sale.
          </p>
          <div className="space-y-3">
            {otherLiens.map((lien) => {
              const typeConfig = LIEN_TYPE_CONFIG[lien.type.toLowerCase()] || LIEN_TYPE_CONFIG.other;
              return (
                <div
                  key={lien.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg bg-slate-100 dark:bg-slate-700", typeConfig.color)}>
                        {typeConfig.icon}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {lien.type}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {lien.holder}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatValue(lien.currentBalance || lien.originalAmount, "currency")}
                      </p>
                      <StatusBadge status={lien.status} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ReportSubsection>
      )}

      {/* Title Issues */}
      {issues.length > 0 && (
        <ReportSubsection
          title="Title Issues"
          icon={<AlertTriangle className="h-4 w-4" />}
          className="mt-6"
        >
          <div className="space-y-3">
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-lg border",
                  issue.severity === "critical"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                    : issue.severity === "high"
                    ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                    : issue.severity === "medium"
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {issue.type}
                      </span>
                      <RiskIndicator
                        level={issue.severity === "critical" ? "critical" : issue.severity}
                        size="sm"
                      />
                      {issue.blocksPurchase && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Blocks Purchase
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {issue.description}
                    </p>
                    {issue.resolution && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        <strong>Resolution:</strong> {issue.resolution}
                      </p>
                    )}
                  </div>
                  {issue.estimatedCost !== undefined && (
                    <div className="text-right">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Est. Cost</span>
                      <p className="font-semibold text-orange-600 dark:text-orange-400">
                        {formatValue(issue.estimatedCost, "currency")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ReportSubsection>
      )}

      {/* Ownership History */}
      {ownershipHistory.length > 0 && (
        <ReportSubsection
          title="Ownership History"
          icon={<User className="h-4 w-4" />}
          className="mt-6"
        >
          <div className="space-y-2">
            {ownershipHistory.map((record, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {record.ownerName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatValue(record.acquiredDate, "date")}
                      {record.deedType && ` | ${record.deedType}`}
                    </p>
                  </div>
                </div>
                {record.salePrice && (
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatValue(record.salePrice, "currency")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </ReportSubsection>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
            Title Recommendations
          </h4>
          <ol className="space-y-1 list-decimal list-inside">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-blue-700 dark:text-blue-400">
                {rec}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Recorder Link */}
      {recorderUrl && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <a
            href={recorderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            View County Recorder Records
          </a>
        </div>
      )}

      {/* Search Info */}
      {summary.searchDate && (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Title search performed: {formatValue(summary.searchDate, "date")}
          {summary.searchProvider && ` by ${summary.searchProvider}`}
        </p>
      )}

      {/* Screen Reader Summary */}
      <ScreenReaderOnly>
        <div>
          <h4>Title Research Summary</h4>
          <p>Total Liens: {summary.totalLiens}</p>
          <p>Total Lien Amount: {formatValue(summary.totalLienAmount, "currency")}</p>
          <p>Surviving Liens: {summary.survivingLiensCount}</p>
          <p>Overall Risk: {summary.overallRisk}</p>
        </div>
      </ScreenReaderOnly>
    </ReportSection>
  );
}

export default TitleResearch;
