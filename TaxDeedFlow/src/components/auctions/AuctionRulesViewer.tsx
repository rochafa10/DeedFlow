"use client"

import { useState } from "react"
import {
  Users,
  Gavel,
  CreditCard,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react"
import { RulesSection } from "./RulesSection"

interface AuctionRules {
  registrationRequired: boolean
  registrationDeadlineDays: number | null
  registrationFormUrl: string | null
  depositRefundable: boolean
  depositPaymentMethods: string[]
  minimumBidRule: string
  minimumBidAmount: number | null
  bidIncrement: number | null
  buyersPremiumPct: number | null
  paymentDeadlineHours: number
  paymentMethods: string[]
  financingAllowed: boolean
  deedRecordingTimeline: string | null
  redemptionPeriodDays: number | null
  possessionTimeline: string | null
  asIsSale: boolean
  liensSurvive: string[]
  titleInsuranceAvailable: boolean
  rulesSourceUrl: string | null
  lastVerifiedAt: string | null
  rawRulesText: string | null
}

interface AuctionRulesViewerProps {
  rules: AuctionRules | null
  depositAmount: number | null
  countyName: string
  saleType: string
  onAskQuestion?: () => void
}

/**
 * Comprehensive auction rules viewer with expandable sections
 */
export function AuctionRulesViewer({
  rules,
  depositAmount,
  countyName,
  saleType,
  onAskQuestion,
}: AuctionRulesViewerProps) {
  const [showFullText, setShowFullText] = useState(false)

  if (!rules) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          No Rules Available
        </h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Auction rules for {countyName} County have not been extracted yet.
          Please check the county&apos;s official website for the most current information.
        </p>
        {onAskQuestion && (
          <button
            onClick={onAskQuestion}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Ask AI About This Auction
          </button>
        )}
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not available"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-4">
      {/* Quick Reference Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Quick Reference - {countyName} {saleType}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-600 dark:text-blue-400 block">Deposit</span>
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {depositAmount ? `$${depositAmount.toLocaleString()}` : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-blue-600 dark:text-blue-400 block">Registration</span>
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {rules.registrationRequired ? "Required" : "Not Required"}
            </span>
          </div>
          <div>
            <span className="text-blue-600 dark:text-blue-400 block">Buyer&apos;s Premium</span>
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {rules.buyersPremiumPct ? `${rules.buyersPremiumPct}%` : "None"}
            </span>
          </div>
          <div>
            <span className="text-blue-600 dark:text-blue-400 block">Payment Due</span>
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {rules.paymentDeadlineHours ? `${rules.paymentDeadlineHours}h` : "See rules"}
            </span>
          </div>
        </div>
      </div>

      {/* Ask AI Button */}
      {onAskQuestion && (
        <button
          onClick={onAskQuestion}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600"
        >
          <MessageSquare className="h-5 w-5" />
          <span>Have questions? Ask our AI assistant about this auction</span>
        </button>
      )}

      {/* Registration Section */}
      <RulesSection
        title="Registration Requirements"
        icon={<Users className="h-5 w-5" />}
        defaultOpen={true}
        badge={rules.registrationRequired ? "Required" : "Optional"}
        badgeColor={rules.registrationRequired ? "amber" : "green"}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Registration Status</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {rules.registrationRequired ? "Pre-registration is required" : "No pre-registration required"}
              </p>
            </div>
            {rules.registrationDeadlineDays && (
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400">Deadline</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {rules.registrationDeadlineDays} days before auction
                </p>
              </div>
            )}
          </div>

          {depositAmount && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded p-3 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    Deposit: ${depositAmount.toLocaleString()}
                  </span>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {rules.depositRefundable ? "Refundable if not winning bidder" : "Non-refundable"}
                    {rules.depositPaymentMethods?.length > 0 && (
                      <> • Accepted methods: {rules.depositPaymentMethods.join(", ")}</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {rules.registrationFormUrl && (
            <a
              href={rules.registrationFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <FileText className="h-4 w-4" />
              Download Registration Form
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </RulesSection>

      {/* Bidding Rules Section */}
      <RulesSection
        title="Bidding Rules"
        icon={<Gavel className="h-5 w-5" />}
        defaultOpen={true}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Minimum Bid</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {rules.minimumBidRule === "taxes_owed"
                  ? "Total taxes owed"
                  : rules.minimumBidAmount
                  ? `$${rules.minimumBidAmount.toLocaleString()}`
                  : rules.minimumBidRule || "See auction terms"}
              </p>
            </div>
            {rules.bidIncrement && (
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400">Bid Increment</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  ${rules.bidIncrement.toLocaleString()}
                </p>
              </div>
            )}
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Buyer&apos;s Premium</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {rules.buyersPremiumPct ? `${rules.buyersPremiumPct}%` : "No premium"}
              </p>
            </div>
          </div>

          {rules.buyersPremiumPct && rules.buyersPremiumPct > 0 && (
            <div className="bg-slate-100 dark:bg-slate-700 rounded p-3 text-sm text-slate-600 dark:text-slate-400">
              <strong>Note:</strong> A {rules.buyersPremiumPct}% buyer&apos;s premium will be added to your winning bid.
              For example, a $10,000 winning bid would result in a total payment of ${(10000 * (1 + rules.buyersPremiumPct / 100)).toLocaleString()}.
            </div>
          )}
        </div>
      </RulesSection>

      {/* Payment Section */}
      <RulesSection
        title="Payment Requirements"
        icon={<CreditCard className="h-5 w-5" />}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Payment Deadline</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {rules.paymentDeadlineHours
                  ? `Within ${rules.paymentDeadlineHours} hours after winning`
                  : "See auction terms"}
              </p>
            </div>
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Financing</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {rules.financingAllowed ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Allowed
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Not allowed (cash/certified funds only)
                  </span>
                )}
              </p>
            </div>
          </div>

          {rules.paymentMethods?.length > 0 && (
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400 block mb-2">Accepted Payment Methods</span>
              <div className="flex flex-wrap gap-2">
                {rules.paymentMethods.map((method, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </RulesSection>

      {/* Post-Sale Section */}
      <RulesSection
        title="Post-Sale Procedures"
        icon={<Clock className="h-5 w-5" />}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.deedRecordingTimeline && (
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400">Deed Recording</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {rules.deedRecordingTimeline}
                </p>
              </div>
            )}
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Redemption Period</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {rules.redemptionPeriodDays
                  ? `${rules.redemptionPeriodDays} days`
                  : "No redemption period"}
              </p>
            </div>
            {rules.possessionTimeline && (
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400">Possession</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {rules.possessionTimeline}
                </p>
              </div>
            )}
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Title Insurance</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {rules.titleInsuranceAvailable ? "Available" : "Not typically available at sale"}
              </p>
            </div>
          </div>
        </div>
      </RulesSection>

      {/* Disclaimers Section */}
      <RulesSection
        title="Important Disclaimers"
        icon={<AlertTriangle className="h-5 w-5" />}
        badge={rules.asIsSale ? "AS-IS Sale" : undefined}
        badgeColor="red"
      >
        <div className="space-y-3">
          {rules.asIsSale && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded p-3 border border-red-200 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200 font-medium">
                Properties are sold AS-IS, WHERE-IS, with all faults.
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                The county makes no warranties regarding property condition, title, or habitability.
                Buyers are responsible for all due diligence.
              </p>
            </div>
          )}

          {rules.liensSurvive?.length > 0 && (
            <div>
              <span className="text-sm text-slate-500 dark:text-slate-400 block mb-2">
                Liens That May Survive Sale
              </span>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1">
                {rules.liensSurvive.map((lien, index) => (
                  <li key={index}>{lien}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </RulesSection>

      {/* Raw Rules Text Section */}
      {rules.rawRulesText && (
        <RulesSection
          title="Full Rules Text"
          icon={<FileText className="h-5 w-5" />}
        >
          <div className="space-y-3">
            <div className="relative">
              <div
                className={`font-mono text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 rounded p-4 border border-slate-200 dark:border-slate-700 overflow-auto ${
                  showFullText ? "max-h-none" : "max-h-64"
                }`}
              >
                {rules.rawRulesText}
              </div>
              {!showFullText && rules.rawRulesText.length > 500 && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent pointer-events-none" />
              )}
            </div>
            {rules.rawRulesText.length > 500 && (
              <button
                onClick={() => setShowFullText(!showFullText)}
                className="flex items-center gap-1 text-primary hover:underline text-sm"
              >
                {showFullText ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show Full Text ({Math.round(rules.rawRulesText.length / 1000)}k characters)
                  </>
                )}
              </button>
            )}
          </div>
        </RulesSection>
      )}

      {/* Source Attribution */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
        <div>
          {rules.lastVerifiedAt && (
            <span>Last verified: {formatDate(rules.lastVerifiedAt)}</span>
          )}
        </div>
        {rules.rulesSourceUrl && (
          <a
            href={rules.rulesSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            View Source
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}
