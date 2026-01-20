"use client";

import * as React from "react";
import {
  Gavel,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  ExternalLink,
  FileText,
  AlertTriangle,
  CheckCircle,
  Users,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection, ReportSubsection } from "../shared/ReportSection";
import { MetricDisplay, MetricGrid } from "../shared/MetricDisplay";
import { DataUnavailable } from "../shared/ErrorState";
import { ScreenReaderOnly } from "../shared/AccessibilityHelpers";
import { formatValue } from "@/types/report";

/**
 * Auction requirement item
 */
export interface AuctionRequirement {
  /** Requirement type */
  type: "registration" | "deposit" | "payment" | "identification" | "other";
  /** Description */
  description: string;
  /** Amount (if applicable) */
  amount?: number;
  /** Deadline (if applicable) */
  deadline?: Date;
  /** Is this requirement met? */
  isMet?: boolean;
  /** Notes */
  notes?: string;
}

/**
 * Auction details data
 */
export interface AuctionData {
  /** Sale type */
  saleType: string;
  /** Sale date */
  saleDate: Date;
  /** Sale time */
  saleTime?: string;
  /** Platform name */
  platform?: string;
  /** Platform URL */
  platformUrl?: string;
  /** Location (if in-person) */
  location?: string;
  /** Starting bid */
  startingBid: number;
  /** Deposit required */
  depositRequired?: number;
  /** Deposit refundable */
  depositRefundable?: boolean;
  /** Buyer's premium percentage */
  buyersPremiumPct?: number;
  /** Registration deadline */
  registrationDeadline?: Date;
  /** Registration URL */
  registrationUrl?: string;
  /** Payment deadline (hours after auction) */
  paymentDeadlineHours?: number;
  /** Accepted payment methods */
  paymentMethods?: string[];
  /** Property list URL */
  propertyListUrl?: string;
  /** Terms and conditions URL */
  termsUrl?: string;
  /** Is online auction */
  isOnline: boolean;
  /** Requirements */
  requirements?: AuctionRequirement[];
  /** Important notes */
  importantNotes?: string[];
  /** Redemption period (days) */
  redemptionPeriodDays?: number;
  /** Deed type */
  deedType?: string;
}

/**
 * Props for the AuctionDetails component
 */
export interface AuctionDetailsProps {
  /** Auction data */
  auction: AuctionData;
  /** Days until auction */
  daysUntilAuction?: number;
  /** Suggested max bid */
  suggestedMaxBid?: number;
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Requirement type icons
 */
const REQUIREMENT_ICONS: Record<string, React.ReactNode> = {
  registration: <Users className="h-4 w-4" />,
  deposit: <DollarSign className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
  identification: <FileText className="h-4 w-4" />,
  other: <AlertTriangle className="h-4 w-4" />,
};

/**
 * Urgency indicator based on days until auction
 */
function UrgencyIndicator({ daysUntil }: { daysUntil: number }) {
  if (daysUntil < 0) {
    return (
      <span className="px-3 py-1 text-sm font-medium rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
        Auction Passed
      </span>
    );
  }

  if (daysUntil <= 3) {
    return (
      <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 animate-pulse">
        {daysUntil === 0 ? "TODAY!" : daysUntil === 1 ? "Tomorrow!" : `${daysUntil} days!`}
      </span>
    );
  }

  if (daysUntil <= 7) {
    return (
      <span className="px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
        {daysUntil} days
      </span>
    );
  }

  if (daysUntil <= 14) {
    return (
      <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
        {daysUntil} days
      </span>
    );
  }

  return (
    <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
      {daysUntil} days
    </span>
  );
}

/**
 * AuctionDetails - Section 10: Auction information and requirements
 *
 * Features:
 * - Auction date and time with countdown
 * - Platform information
 * - Starting bid and deposit
 * - Registration requirements
 * - Payment methods
 * - Important deadlines
 * - Suggested max bid
 *
 * @example
 * ```tsx
 * <AuctionDetails
 *   auction={{
 *     saleType: "Repository",
 *     saleDate: new Date("2026-03-15"),
 *     saleTime: "10:00 AM",
 *     platform: "Bid4Assets",
 *     platformUrl: "https://bid4assets.com/blair-county-pa",
 *     startingBid: 15000,
 *     depositRequired: 10000,
 *     isOnline: true,
 *   }}
 *   daysUntilAuction={12}
 *   suggestedMaxBid={45000}
 * />
 * ```
 */
export function AuctionDetails({
  auction,
  daysUntilAuction,
  suggestedMaxBid,
  defaultCollapsed = false,
  className,
}: AuctionDetailsProps) {
  // Calculate days until if not provided
  const daysUntil =
    daysUntilAuction !== undefined
      ? daysUntilAuction
      : Math.ceil((new Date(auction.saleDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Check for registration deadline
  const registrationDaysLeft = auction.registrationDeadline
    ? Math.ceil(
        (new Date(auction.registrationDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <ReportSection
      id="auction-details"
      title="Auction Details"
      icon={<Gavel className="h-5 w-5" />}
      defaultCollapsed={defaultCollapsed}
      className={className}
      headerRight={<UrgencyIndicator daysUntil={daysUntil} />}
    >
      {/* Main Auction Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Date and Location */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500 dark:text-slate-400">Sale Date & Time</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatValue(auction.saleDate, "date")}
              </p>
              {auction.saleTime && (
                <p className="text-lg text-primary font-medium">{auction.saleTime}</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {auction.isOnline ? (
              <>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Online Auction
                </span>
                {auction.platform && (
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    via {auction.platform}
                  </span>
                )}
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {auction.location || "Location TBD"}
                </span>
              </>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-primary/10">
            <span className="text-sm text-slate-500 dark:text-slate-400">Sale Type</span>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {auction.saleType}
            </p>
            {auction.deedType && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deed Type: {auction.deedType}
              </p>
            )}
          </div>
        </div>

        {/* Right: Financial Details */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <MetricGrid columns={2}>
            <MetricDisplay
              label="Starting Bid"
              value={auction.startingBid}
              format="currency"
              highlight
              icon={<DollarSign className="h-4 w-4" />}
            />
            {auction.depositRequired !== undefined && (
              <MetricDisplay
                label="Deposit Required"
                value={auction.depositRequired}
                format="currency"
                secondaryValue={
                  auction.depositRefundable !== undefined
                    ? auction.depositRefundable
                      ? "Refundable"
                      : "Non-refundable"
                    : undefined
                }
              />
            )}
            {auction.buyersPremiumPct !== undefined && (
              <MetricDisplay
                label="Buyer's Premium"
                value={`${auction.buyersPremiumPct}%`}
              />
            )}
            {suggestedMaxBid !== undefined && (
              <MetricDisplay
                label="Suggested Max Bid"
                value={suggestedMaxBid}
                format="currency"
                highlight
              />
            )}
          </MetricGrid>

          {auction.paymentDeadlineHours !== undefined && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Payment due within{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {auction.paymentDeadlineHours} hours
                </span>{" "}
                of winning bid
              </p>
            </div>
          )}

          {auction.paymentMethods && auction.paymentMethods.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-500 dark:text-slate-400">Accepted Payment:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {auction.paymentMethods.map((method, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-xs rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Registration Deadline Alert */}
      {auction.registrationDeadline && registrationDaysLeft !== null && registrationDaysLeft > 0 && (
        <div
          className={cn(
            "p-4 rounded-lg border mb-6",
            registrationDaysLeft <= 3
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              : registrationDaysLeft <= 7
              ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
              : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          )}
        >
          <div className="flex items-center gap-3">
            <Clock
              className={cn(
                "h-5 w-5",
                registrationDaysLeft <= 3
                  ? "text-red-600 dark:text-red-400"
                  : registrationDaysLeft <= 7
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-blue-600 dark:text-blue-400"
              )}
            />
            <div>
              <p
                className={cn(
                  "font-medium",
                  registrationDaysLeft <= 3
                    ? "text-red-700 dark:text-red-300"
                    : registrationDaysLeft <= 7
                    ? "text-yellow-700 dark:text-yellow-300"
                    : "text-blue-700 dark:text-blue-300"
                )}
              >
                Registration Deadline: {formatValue(auction.registrationDeadline, "date")}
              </p>
              <p
                className={cn(
                  "text-sm",
                  registrationDaysLeft <= 3
                    ? "text-red-600 dark:text-red-400"
                    : registrationDaysLeft <= 7
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-blue-600 dark:text-blue-400"
                )}
              >
                {registrationDaysLeft === 1
                  ? "Tomorrow!"
                  : `${registrationDaysLeft} days remaining`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Requirements Checklist */}
      {auction.requirements && auction.requirements.length > 0 && (
        <ReportSubsection
          title="Requirements Checklist"
          icon={<FileText className="h-4 w-4" />}
        >
          <div className="space-y-2">
            {auction.requirements.map((req, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg",
                  req.isMet
                    ? "bg-green-50 dark:bg-green-900/20"
                    : "bg-slate-50 dark:bg-slate-800/50"
                )}
              >
                <div
                  className={cn(
                    "flex-shrink-0 p-1.5 rounded",
                    req.isMet
                      ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                  )}
                >
                  {req.isMet ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    REQUIREMENT_ICONS[req.type] || REQUIREMENT_ICONS.other
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {req.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {req.amount !== undefined && (
                      <span>{formatValue(req.amount, "currency")}</span>
                    )}
                    {req.deadline && <span>Due: {formatValue(req.deadline, "date")}</span>}
                  </div>
                  {req.notes && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{req.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ReportSubsection>
      )}

      {/* Important Notes */}
      {auction.importantNotes && auction.importantNotes.length > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Important Notes
          </h4>
          <ul className="space-y-1">
            {auction.importantNotes.map((note, idx) => (
              <li
                key={idx}
                className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2"
              >
                <span className="text-amber-500">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Redemption Period */}
      {auction.redemptionPeriodDays !== undefined && auction.redemptionPeriodDays > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-blue-700 dark:text-blue-300">
            <strong>Redemption Period:</strong> {auction.redemptionPeriodDays} days
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            The original owner may redeem the property during this period.
          </p>
        </div>
      )}

      {/* Links */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {auction.platformUrl && (
          <a
            href={auction.platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Go to Auction Platform
          </a>
        )}
        {auction.registrationUrl && (
          <a
            href={auction.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors"
          >
            <Users className="h-4 w-4" />
            Register Now
          </a>
        )}
        {auction.propertyListUrl && (
          <a
            href={auction.propertyListUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <FileText className="h-4 w-4" />
            View Property List
          </a>
        )}
        {auction.termsUrl && (
          <a
            href={auction.termsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <FileText className="h-4 w-4" />
            Terms & Conditions
          </a>
        )}
      </div>

      {/* Screen Reader Summary */}
      <ScreenReaderOnly>
        <div>
          <h4>Auction Details Summary</h4>
          <p>Sale Type: {auction.saleType}</p>
          <p>Sale Date: {formatValue(auction.saleDate, "date")}</p>
          {auction.saleTime && <p>Sale Time: {auction.saleTime}</p>}
          <p>Starting Bid: {formatValue(auction.startingBid, "currency")}</p>
          <p>Days until auction: {daysUntil}</p>
        </div>
      </ScreenReaderOnly>
    </ReportSection>
  );
}

export default AuctionDetails;
