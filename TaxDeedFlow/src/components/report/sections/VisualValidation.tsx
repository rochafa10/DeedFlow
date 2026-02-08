"use client";

/**
 * VisualValidation - AI Visual Screening Section for Property Reports
 *
 * Displays the result of GPT-4o investability screening, including status
 * badge, confidence, positive findings, concerns, red flags, and
 * recommendation. Supports three states:
 *   A. Not yet analyzed (empty state with action button)
 *   B. Loading / analyzing (spinner overlay)
 *   C. Results (full breakdown of AI analysis)
 *
 * @module components/report/sections/VisualValidation
 */

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Eye,
  Home,
  Route,
  Leaf,
  RefreshCw,
  Cpu,
  ImageIcon,
  Clock,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ReportSection } from "../shared/ReportSection";

// ============================================
// Types
// ============================================

/** Status returned by the visual validation API */
type ValidationStatus = "APPROVED" | "CAUTION" | "REJECTED";

/**
 * Shape of the data payload from both POST and GET responses.
 * Matches the API response at /api/analysis/visual-validation.
 */
export interface VisualValidationData {
  validationId?: string | null;
  storedInDatabase?: boolean;
  propertyId: string;
  status: ValidationStatus;
  confidence: number;
  summary: string | null;
  positives: string[];
  concerns: string[];
  redFlags: string[];
  recommendation: string | null;
  propertyType: string | null;
  structurePresent: boolean | null;
  roadAccess: boolean | null;
  landUseObserved: string | null;
  lotShape?: string | null;
  aiModel: string | null;
  tokensUsed: number | null;
  imageCount: number | null;
  images?: {
    satellite?: string | null;
    map?: string | null;
    streetView?: string | null;
    regrid?: string | null;
  } | null;
  skipReason?: string | null;
  validatedAt?: string | null;
  cached?: boolean;
}

/** Props accepted by the VisualValidation component */
export interface VisualValidationProps {
  /** UUID of the property being analyzed */
  propertyId: string;
  /** Optional pre-loaded data from the server to avoid an extra GET */
  initialData?: VisualValidationData | null;
}

// ============================================
// Status Configuration
// ============================================

const STATUS_CONFIG: Record<
  ValidationStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    bgClass: string;
    borderClass: string;
    textClass: string;
    badgeBg: string;
    badgeText: string;
    ringClass: string;
  }
> = {
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    bgClass: "bg-green-50 dark:bg-green-900/20",
    borderClass: "border-green-200 dark:border-green-800",
    textClass: "text-green-700 dark:text-green-300",
    badgeBg: "bg-green-100 dark:bg-green-900/40",
    badgeText: "text-green-800 dark:text-green-200",
    ringClass: "ring-green-500/30",
  },
  CAUTION: {
    label: "Caution",
    icon: AlertTriangle,
    bgClass: "bg-amber-50 dark:bg-amber-900/20",
    borderClass: "border-amber-200 dark:border-amber-800",
    textClass: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-100 dark:bg-amber-900/40",
    badgeText: "text-amber-800 dark:text-amber-200",
    ringClass: "ring-amber-500/30",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    bgClass: "bg-red-50 dark:bg-red-900/20",
    borderClass: "border-red-200 dark:border-red-800",
    textClass: "text-red-700 dark:text-red-300",
    badgeBg: "bg-red-100 dark:bg-red-900/40",
    badgeText: "text-red-800 dark:text-red-200",
    ringClass: "ring-red-500/30",
  },
};

// ============================================
// Component
// ============================================

/**
 * VisualValidation renders the AI visual screening results inside a
 * ReportSection wrapper that matches the rest of the report page.
 */
export function VisualValidation({
  propertyId,
  initialData = null,
}: VisualValidationProps) {
  // ---- State ---------------------------------------------------------------
  const [data, setData] = useState<VisualValidationData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  // ---- Check for cached result on mount ------------------------------------
  useEffect(() => {
    if (initialData) return;

    let cancelled = false;

    async function checkCached() {
      try {
        setChecking(true);
        const res = await fetch(
          `/api/analysis/visual-validation?propertyId=${encodeURIComponent(propertyId)}`
        );

        if (cancelled) return;

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setData({ ...json.data, cached: true });
          }
        }
        // 404 means no cached result -- that is fine, stay in "not analyzed" state
      } catch {
        // Network error checking cache is non-critical; stay in empty state
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    checkCached();

    return () => {
      cancelled = true;
    };
  }, [propertyId, initialData]);

  // ---- Run AI analysis (POST) ----------------------------------------------
  const runAnalysis = useCallback(
    async (forceRevalidate = false) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/analysis/visual-validation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId, forceRevalidate }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          const message = json.error || `Analysis failed (HTTP ${res.status})`;
          setError(message);
          toast.error("Visual screening failed", { description: message });
          return;
        }

        setData({ ...json.data, cached: false });
        toast.success("Visual screening complete", {
          description: `Status: ${json.data.status} (${json.data.confidence}% confidence)`,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected error during analysis";
        setError(message);
        toast.error("Visual screening failed", { description: message });
      } finally {
        setLoading(false);
      }
    },
    [propertyId]
  );

  // ---- Determine which state to render -------------------------------------
  const hasData = data !== null;

  return (
    <ReportSection
      id="visual-validation"
      title="AI Visual Screening"
      icon={<Eye className="h-5 w-5" />}
      badge={
        hasData ? (
          <StatusBadge status={data.status} />
        ) : undefined
      }
      headerRight={
        hasData ? (
          <button
            type="button"
            onClick={() => runAnalysis(true)}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md",
              "border border-slate-300 dark:border-slate-600",
              "text-slate-600 dark:text-slate-300",
              "hover:bg-slate-50 dark:hover:bg-slate-700/50",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors"
            )}
            aria-label="Re-run AI visual screening"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              aria-hidden="true"
            />
            Re-analyze
          </button>
        ) : undefined
      }
      description="AI-powered assessment of property investability based on satellite, map, street-level, and Regrid imagery"
    >
      {/* State B: Initial cache check spinner */}
      {checking && !hasData && (
        <div className="flex items-center justify-center py-12">
          <Loader2
            className="h-6 w-6 text-slate-400 animate-spin"
            aria-hidden="true"
          />
          <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">
            Checking for existing analysis...
          </span>
        </div>
      )}

      {/* State A: Not yet analyzed */}
      {!checking && !hasData && !loading && (
        <NotAnalyzedState
          onRun={() => runAnalysis(false)}
          error={error}
        />
      )}

      {/* State B: Loading / Analyzing */}
      {loading && !hasData && (
        <AnalyzingState />
      )}

      {/* Loading overlay when re-analyzing (has data already) */}
      {loading && hasData && (
        <div className="mb-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <Loader2
              className="h-4 w-4 text-blue-500 animate-spin"
              aria-hidden="true"
            />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              Re-analyzing property images...
            </span>
          </div>
        </div>
      )}

      {/* State C: Results */}
      {hasData && <ResultsView data={data} />}
    </ReportSection>
  );
}

// ============================================
// Sub-components
// ============================================

/**
 * Status badge shown in the section header and in the results view.
 */
function StatusBadge({ status }: { status: ValidationStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1",
        config.badgeBg,
        config.badgeText,
        config.ringClass
      )}
      aria-label={`Screening status: ${config.label}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}

/**
 * State A: Property has not been screened yet.
 */
function NotAnalyzedState({
  onRun,
  error,
}: {
  onRun: () => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="mb-4 rounded-full bg-slate-100 dark:bg-slate-700 p-4">
        <Eye className="h-8 w-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Not Yet Screened
      </h3>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-md">
        This property has not been visually screened yet. Run the AI screening
        to analyze satellite, street view, and aerial imagery for investability.
      </p>

      {error && (
        <div
          className="mt-4 w-full max-w-md rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onRun}
        className={cn(
          "mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg",
          "bg-primary text-white shadow-sm",
          "hover:bg-primary/90",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
          "transition-colors"
        )}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Run AI Screening
      </button>
    </div>
  );
}

/**
 * State B: Analysis is in progress.
 */
function AnalyzingState() {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
        <div className="relative rounded-full bg-primary/10 p-4">
          <Loader2
            className="h-8 w-8 text-primary animate-spin"
            aria-hidden="true"
          />
        </div>
      </div>

      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Analyzing Property Images...
      </h3>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        GPT-4o is reviewing satellite, map, street view, and aerial imagery.
        This typically takes 10-20 seconds.
      </p>
    </div>
  );
}

/**
 * State C: Render the full analysis results.
 */
function ResultsView({ data }: { data: VisualValidationData }) {
  const config = STATUS_CONFIG[data.status];
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* ---- Top: Status + Confidence + Meta ---- */}
      <div
        className={cn(
          "rounded-lg border p-4",
          config.bgClass,
          config.borderClass
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: Status */}
          <div className="flex items-center gap-3">
            <StatusIcon
              className={cn("h-6 w-6 flex-shrink-0", config.textClass)}
              aria-hidden="true"
            />
            <div>
              <p className={cn("text-lg font-bold", config.textClass)}>
                {config.label}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {data.confidence}% confidence
              </p>
            </div>
          </div>

          {/* Right: Meta chips */}
          <div className="flex flex-wrap gap-2">
            {data.imageCount != null && (
              <MetaChip icon={ImageIcon} label={`${data.imageCount} images`} />
            )}
            {data.aiModel && (
              <MetaChip icon={Cpu} label={data.aiModel} />
            )}
            {data.validatedAt && (
              <MetaChip
                icon={Clock}
                label={formatRelativeTime(data.validatedAt)}
              />
            )}
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mt-3">
          <div className="h-2 rounded-full bg-white/60 dark:bg-slate-800/60 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                data.status === "APPROVED" && "bg-green-500",
                data.status === "CAUTION" && "bg-amber-500",
                data.status === "REJECTED" && "bg-red-500"
              )}
              style={{ width: `${Math.min(100, Math.max(0, data.confidence))}%` }}
              role="progressbar"
              aria-valuenow={data.confidence}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Confidence: ${data.confidence}%`}
            />
          </div>
        </div>
      </div>

      {/* ---- Summary Quote ---- */}
      {data.summary && (
        <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic text-sm text-slate-600 dark:text-slate-400">
          {data.summary}
        </blockquote>
      )}

      {/* ---- Property Quick Facts ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickFact
          icon={Home}
          label="Property Type"
          value={data.propertyType || "Unknown"}
        />
        <QuickFact
          icon={Shield}
          label="Structure"
          value={
            data.structurePresent === true
              ? "Present"
              : data.structurePresent === false
              ? "Not Found"
              : "Unknown"
          }
        />
        <QuickFact
          icon={Route}
          label="Road Access"
          value={
            data.roadAccess === true
              ? "Yes"
              : data.roadAccess === false
              ? "No"
              : "Unknown"
          }
        />
        <QuickFact
          icon={Leaf}
          label="Land Use"
          value={data.landUseObserved || "Unknown"}
        />
      </div>

      {/* ---- Positives and Concerns (Two Columns) ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Positive Findings */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <CheckCircle2
              className="h-4 w-4 text-green-500"
              aria-hidden="true"
            />
            Positive Findings
          </h4>
          {data.positives.length > 0 ? (
            <ul className="space-y-2" aria-label="Positive findings">
              {data.positives.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2
                    className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">
              No positive findings reported.
            </p>
          )}
        </div>

        {/* Concerns */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <AlertTriangle
              className="h-4 w-4 text-amber-500"
              aria-hidden="true"
            />
            Concerns
          </h4>
          {data.concerns.length > 0 ? (
            <ul className="space-y-2" aria-label="Concerns">
              {data.concerns.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <AlertTriangle
                    className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">
              No concerns identified.
            </p>
          )}
        </div>
      </div>

      {/* ---- Red Flags (only when REJECTED or has flags) ---- */}
      {data.redFlags.length > 0 && (
        <div
          className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4"
          role="alert"
        >
          <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Red Flags
          </h4>
          <ul className="space-y-2" aria-label="Red flags">
            {data.redFlags.map((flag, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <XCircle
                  className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm text-red-700 dark:text-red-300">
                  {flag}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- Recommendation ---- */}
      {data.recommendation && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" aria-hidden="true" />
            Recommendation
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {data.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Utility Sub-components
// ============================================

/** Small metadata chip (image count, AI model, timestamp) */
function MetaChip({
  icon: Icon,
  label,
}: {
  icon: typeof Cpu;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/70 dark:bg-slate-800/70 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

/** Quick-fact grid item */
function QuickFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon
          className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500"
          aria-hidden="true"
        />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
        {value}
      </p>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

/**
 * Format an ISO 8601 timestamp into a human-readable relative time string.
 * Falls back to locale date string for dates older than 7 days.
 */
function formatRelativeTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  } catch {
    return "Unknown";
  }
}

export default VisualValidation;
