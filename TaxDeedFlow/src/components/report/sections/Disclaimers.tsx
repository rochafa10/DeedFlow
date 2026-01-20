"use client";

import * as React from "react";
import {
  AlertTriangle,
  FileText,
  Scale,
  Shield,
  Clock,
  Info,
  ExternalLink,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection } from "../shared/ReportSection";
import { ScreenReaderOnly } from "../shared/AccessibilityHelpers";

/**
 * Disclaimer item with title and content
 */
export interface DisclaimerItem {
  /** Unique identifier */
  id: string;
  /** Disclaimer title */
  title: string;
  /** Disclaimer content */
  content: string;
  /** Icon type */
  icon?: "warning" | "legal" | "info" | "time" | "shield";
  /** Whether this is a critical disclaimer */
  critical?: boolean;
}

/**
 * Legal reference with link
 */
export interface LegalReference {
  /** Reference title */
  title: string;
  /** Reference URL */
  url?: string;
  /** Description */
  description?: string;
}

/**
 * Props for the Disclaimers component
 */
export interface DisclaimersProps {
  /** Report generation date */
  reportDate: Date;
  /** Report version/ID */
  reportId?: string;
  /** Data sources used */
  dataSources?: string[];
  /** Data freshness date */
  dataAsOfDate?: Date;
  /** Custom disclaimers */
  disclaimers?: DisclaimerItem[];
  /** Legal references */
  legalReferences?: LegalReference[];
  /** Company/platform name */
  companyName?: string;
  /** Contact email for questions */
  contactEmail?: string;
  /** Include investment disclaimer */
  includeInvestmentDisclaimer?: boolean;
  /** Include accuracy disclaimer */
  includeAccuracyDisclaimer?: boolean;
  /** Include legal disclaimer */
  includeLegalDisclaimer?: boolean;
  /** Print callback */
  onPrint?: () => void;
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Default disclaimers that should be included in every report
 */
const DEFAULT_DISCLAIMERS: DisclaimerItem[] = [
  {
    id: "investment",
    title: "Investment Disclaimer",
    icon: "warning",
    critical: true,
    content: `This report is provided for informational purposes only and does not constitute
    investment advice, financial advice, legal advice, or a recommendation to purchase any property.
    Tax deed investing involves significant risks including but not limited to loss of capital,
    title defects, redemption rights, environmental liabilities, and property condition issues.
    Past performance is not indicative of future results. You should conduct your own due diligence
    and consult with qualified professionals (attorney, CPA, real estate professional) before making
    any investment decisions.`,
  },
  {
    id: "accuracy",
    title: "Data Accuracy Disclaimer",
    icon: "info",
    critical: false,
    content: `While we strive to provide accurate and up-to-date information, data in this report
    is compiled from multiple third-party sources and may contain errors, omissions, or outdated
    information. Property values, tax amounts, lien information, and other financial data are
    estimates based on available information and may not reflect actual current values. We make
    no representations or warranties about the accuracy, completeness, or reliability of any
    information contained in this report.`,
  },
  {
    id: "legal",
    title: "Legal Disclaimer",
    icon: "legal",
    critical: false,
    content: `This report does not constitute a title search, title insurance, or legal opinion
    on property ownership. Liens, encumbrances, and title defects may exist that are not reflected
    in this report. Tax sale procedures, redemption periods, and applicable laws vary by jurisdiction
    and are subject to change. Consult with a licensed attorney in the applicable jurisdiction
    for legal advice regarding any property purchase.`,
  },
  {
    id: "no-guarantee",
    title: "No Guarantees",
    icon: "shield",
    critical: false,
    content: `Investment scores, grades, recommendations, and projections in this report are
    based on our proprietary analysis methodology and do not guarantee any particular outcome.
    Actual results may differ materially from projections due to market conditions, property
    condition, legal issues, or other factors. We disclaim any liability for losses incurred
    as a result of reliance on this report.`,
  },
  {
    id: "timeliness",
    title: "Timeliness of Information",
    icon: "time",
    critical: false,
    content: `Information in this report is current as of the date indicated and may become
    outdated. Market conditions, property values, tax amounts, and other data can change
    rapidly. Always verify current information before making any decisions. This report
    should not be relied upon if significant time has passed since the report date.`,
  },
];

/**
 * Icon mapping for disclaimer types
 */
const ICON_MAP: Record<string, React.ReactNode> = {
  warning: <AlertTriangle className="h-5 w-5" />,
  legal: <Scale className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  time: <Clock className="h-5 w-5" />,
  shield: <Shield className="h-5 w-5" />,
};

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

/**
 * Format date short
 */
function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Individual disclaimer card component
 */
function DisclaimerCard({ disclaimer }: { disclaimer: DisclaimerItem }) {
  const icon = disclaimer.icon ? ICON_MAP[disclaimer.icon] : <Info className="h-5 w-5" />;

  return (
    <div
      className={cn(
        "p-4 rounded-lg border",
        disclaimer.critical
          ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
          : "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex-shrink-0 p-2 rounded-lg",
            disclaimer.critical
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              "font-semibold mb-2",
              disclaimer.critical
                ? "text-amber-800 dark:text-amber-300"
                : "text-slate-800 dark:text-slate-200"
            )}
          >
            {disclaimer.title}
            {disclaimer.critical && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200 rounded">
                Important
              </span>
            )}
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
            {disclaimer.content}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Disclaimers - Section 12: Legal disclaimers and report metadata
 *
 * Features:
 * - Standard investment/legal/accuracy disclaimers
 * - Custom disclaimers support
 * - Report metadata (date, version, data sources)
 * - Legal references with links
 * - Print button integration
 *
 * @example
 * ```tsx
 * <Disclaimers
 *   reportDate={new Date()}
 *   reportId="RPT-2026-001234"
 *   dataSources={["County Tax Records", "Regrid", "Zillow"]}
 *   companyName="TaxDeedFlow"
 *   contactEmail="support@taxdeedflow.com"
 * />
 * ```
 */
export function Disclaimers({
  reportDate,
  reportId,
  dataSources = [],
  dataAsOfDate,
  disclaimers = [],
  legalReferences = [],
  companyName = "TaxDeedFlow",
  contactEmail,
  includeInvestmentDisclaimer = true,
  includeAccuracyDisclaimer = true,
  includeLegalDisclaimer = true,
  onPrint,
  defaultCollapsed = false,
  className,
}: DisclaimersProps) {
  // Build disclaimer list
  const allDisclaimers = React.useMemo(() => {
    const result: DisclaimerItem[] = [];

    // Add default disclaimers based on flags
    DEFAULT_DISCLAIMERS.forEach((d) => {
      if (d.id === "investment" && includeInvestmentDisclaimer) result.push(d);
      if (d.id === "accuracy" && includeAccuracyDisclaimer) result.push(d);
      if (d.id === "legal" && includeLegalDisclaimer) result.push(d);
      if (d.id === "no-guarantee") result.push(d);
      if (d.id === "timeliness") result.push(d);
    });

    // Add custom disclaimers
    result.push(...disclaimers);

    return result;
  }, [disclaimers, includeInvestmentDisclaimer, includeAccuracyDisclaimer, includeLegalDisclaimer]);

  return (
    <ReportSection
      id="disclaimers"
      title="Disclaimers & Legal"
      icon={<Scale className="h-5 w-5" />}
      defaultCollapsed={defaultCollapsed}
      className={className}
    >
      {/* Report Metadata */}
      <div className="mb-6 p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <div>
              <h4 className="font-medium text-slate-900 dark:text-slate-100">
                Report Information
              </h4>
              {reportId && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Report ID: {reportId}
                </p>
              )}
            </div>
          </div>
          {onPrint && (
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors print:hidden"
              aria-label="Print report"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Generated:</span>
            <span className="ml-2 text-slate-700 dark:text-slate-300">
              {formatDate(reportDate)}
            </span>
          </div>
          {dataAsOfDate && (
            <div>
              <span className="text-slate-500 dark:text-slate-400">Data as of:</span>
              <span className="ml-2 text-slate-700 dark:text-slate-300">
                {formatDateShort(dataAsOfDate)}
              </span>
            </div>
          )}
          {companyName && (
            <div>
              <span className="text-slate-500 dark:text-slate-400">Generated by:</span>
              <span className="ml-2 text-slate-700 dark:text-slate-300">
                {companyName}
              </span>
            </div>
          )}
        </div>

        {/* Data Sources */}
        {dataSources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-500 dark:text-slate-400">Data Sources:</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {dataSources.map((source, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-600 dark:text-slate-400"
                >
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Disclaimers */}
      <div className="space-y-4">
        {allDisclaimers.map((disclaimer) => (
          <DisclaimerCard key={disclaimer.id} disclaimer={disclaimer} />
        ))}
      </div>

      {/* Legal References */}
      {legalReferences.length > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Scale className="h-4 w-4 text-slate-500" />
            Legal References
          </h4>
          <ul className="space-y-2">
            {legalReferences.map((ref, idx) => (
              <li key={idx} className="text-sm">
                {ref.url ? (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {ref.title}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-slate-700 dark:text-slate-300">{ref.title}</span>
                )}
                {ref.description && (
                  <span className="ml-2 text-slate-500 dark:text-slate-400">
                    - {ref.description}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contact Information */}
      {contactEmail && (
        <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Questions about this report? Contact us at{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="text-primary hover:underline font-medium"
            >
              {contactEmail}
            </a>
          </p>
        </div>
      )}

      {/* Copyright Notice */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          This report and its contents are confidential and intended solely for the recipient.
          Unauthorized distribution or reproduction is prohibited.
        </p>
      </div>

      {/* Screen Reader Summary */}
      <ScreenReaderOnly>
        <div>
          <h4>Disclaimers Summary</h4>
          <p>Report generated on {formatDate(reportDate)}</p>
          {reportId && <p>Report ID: {reportId}</p>}
          <p>This report contains {allDisclaimers.length} disclaimers covering investment risks, data accuracy, and legal limitations.</p>
          <p>Key disclaimer: This report is for informational purposes only and does not constitute investment advice.</p>
        </div>
      </ScreenReaderOnly>
    </ReportSection>
  );
}

export default Disclaimers;
