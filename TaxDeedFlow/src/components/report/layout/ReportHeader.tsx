"use client";

import * as React from "react";
import {
  MapPin,
  Calendar,
  Clock,
  FileText,
  Printer,
  Download,
  Share2,
  ExternalLink,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GradeDisplay, GradeBadge } from "../shared/GradeDisplay";
import { RiskIndicator } from "../shared/RiskIndicator";
import { MetricDisplay, InlineMetric } from "../shared/MetricDisplay";
import type { PropertyReportData, Grade, RiskLevel } from "@/types/report";
import { formatValue, gradeToRating } from "@/types/report";

/**
 * Props for the ReportHeader component
 */
export interface ReportHeaderProps {
  /** Property address */
  address: string;
  /** City */
  city: string | null;
  /** State code */
  state: string;
  /** ZIP code */
  zip: string | null;
  /** County name */
  county: string;
  /** Parcel ID */
  parcelId: string;
  /** Property type */
  propertyType: string;
  /** Overall grade */
  grade: Grade;
  /** Total score (0-125) */
  score: number;
  /** Score percentage */
  percentage: number;
  /** Overall risk level */
  riskLevel: RiskLevel;
  /** Sale date */
  saleDate: Date | null;
  /** Sale type */
  saleType: string | null;
  /** Starting bid / total due */
  startingBid: number | null;
  /** Report generation date */
  generatedAt: Date;
  /** Screenshot URL */
  screenshotUrl?: string | null;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Print handler */
  onPrint?: () => void;
  /** Download handler */
  onDownload?: () => void;
  /** Share handler */
  onShare?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ReportHeader - Main header component for property analysis reports
 *
 * Features:
 * - Property address and identification
 * - Overall grade display (large)
 * - Risk level indicator
 * - Key metrics (sale date, starting bid)
 * - Action buttons (print, download, share)
 * - Property screenshot/thumbnail
 * - Responsive layout
 * - Print-optimized
 *
 * @example
 * ```tsx
 * <ReportHeader
 *   address="123 Main St"
 *   city="Altoona"
 *   state="PA"
 *   zip="16602"
 *   county="Blair"
 *   parcelId="01.01-04..-156.00-000"
 *   propertyType="Single Family"
 *   grade="A-"
 *   score={100}
 *   percentage={80}
 *   riskLevel="medium"
 *   saleDate={new Date("2026-03-15")}
 *   saleType="Repository"
 *   startingBid={15000}
 *   generatedAt={new Date()}
 *   showActions
 * />
 * ```
 */
export function ReportHeader({
  address,
  city,
  state,
  zip,
  county,
  parcelId,
  propertyType,
  grade,
  score,
  percentage,
  riskLevel,
  saleDate,
  saleType,
  startingBid,
  generatedAt,
  screenshotUrl,
  showActions = true,
  onPrint,
  onDownload,
  onShare,
  className,
}: ReportHeaderProps) {
  const rating = gradeToRating(grade);

  // Format full address
  const fullAddress = [
    address,
    city && state ? `${city}, ${state}` : city || state,
    zip,
  ]
    .filter(Boolean)
    .join(" ");

  // Days until sale
  const daysUntilSale = saleDate
    ? Math.ceil(
        (new Date(saleDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <header
      className={cn(
        "rounded-lg border border-slate-200 bg-white shadow-sm",
        "dark:border-slate-700 dark:bg-slate-800",
        "print:shadow-none print:border-slate-300",
        className
      )}
    >
      <div className="p-4 sm:p-6">
        {/* Top row: Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          {/* Left: Property Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              Property Analysis Report
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                Generated {formatValue(generatedAt, "date")}
              </span>
              <span className="hidden sm:inline">|</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {new Date(generatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          </div>

          {/* Right: Action Buttons */}
          {showActions && (
            <div className="flex items-center gap-2 print:hidden">
              {onPrint && (
                <button
                  type="button"
                  onClick={onPrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label="Print report"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Print</span>
                </button>
              )}
              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label="Download report"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              )}
              {onShare && (
                <button
                  type="button"
                  onClick={onShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label="Share report"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Main content: Property details + Grade */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Property thumbnail (if available) */}
          {screenshotUrl && (
            <div className="flex-shrink-0 w-full lg:w-48 h-32 lg:h-36 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
              <img
                src={screenshotUrl}
                alt={`Aerial view of ${address}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Property Info */}
          <div className="flex-1 min-w-0">
            {/* Address */}
            <div className="flex items-start gap-2 mb-3">
              <MapPin
                className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {address || "Address Unavailable"}
                </p>
                {(city || state || zip) && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {[city, state].filter(Boolean).join(", ")}
                    {zip && ` ${zip}`}
                  </p>
                )}
              </div>
            </div>

            {/* Property details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">
                  County
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {county}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">
                  Parcel ID
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100 font-mono text-xs">
                  {parcelId}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">
                  Property Type
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {propertyType || "Unknown"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">
                  Risk Level
                </span>
                <RiskIndicator level={riskLevel} size="sm" />
              </div>
            </div>
          </div>

          {/* Grade Display */}
          <div className="flex-shrink-0 flex flex-col items-center text-center lg:pl-6 lg:border-l lg:border-slate-200 dark:lg:border-slate-700">
            <GradeDisplay
              grade={grade}
              score={score}
              percentage={percentage}
              size="lg"
              showPercentage
              showRating
            />
          </div>
        </div>

        {/* Bottom row: Sale info */}
        {(saleDate || startingBid || saleType) && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-4">
              {saleType && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Sale Type:
                  </span>
                  <span className="px-2 py-0.5 text-sm font-medium rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {saleType}
                  </span>
                </div>
              )}

              {saleDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Sale Date:
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {formatValue(saleDate, "date")}
                  </span>
                  {daysUntilSale !== null && daysUntilSale > 0 && (
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-full",
                        daysUntilSale <= 7
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : daysUntilSale <= 14
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                      )}
                    >
                      {daysUntilSale} days
                    </span>
                  )}
                </div>
              )}

              {startingBid !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Starting Bid:
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {formatValue(startingBid, "currency")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * Compact header for print or summary views
 */
export interface CompactHeaderProps {
  /** Property address */
  address: string;
  /** Grade */
  grade: Grade;
  /** Score */
  score: number;
  /** Generated date */
  generatedAt: Date;
  /** Additional CSS classes */
  className?: string;
}

export function CompactHeader({
  address,
  grade,
  score,
  generatedAt,
  className,
}: CompactHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <GradeBadge grade={grade} />
        <div>
          <h1 className="font-semibold text-slate-900 dark:text-slate-100">
            {address}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Score: {score}/125 | {formatValue(generatedAt, "date")}
          </p>
        </div>
      </div>
    </header>
  );
}

export default ReportHeader;
