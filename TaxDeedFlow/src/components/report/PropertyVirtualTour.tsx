"use client";

/**
 * Property Virtual Tour Component
 *
 * Displays satellite imagery and street views in an interactive gallery.
 * Integrates with AI-powered visual analysis for property condition assessment.
 * Supports multiple image sources: satellite, street view, and aerial photography.
 *
 * @component
 */

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Satellite,
  Camera,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  TrendingUp,
  Home,
  Sparkles,
  SlidersHorizontal,
  Calendar,
  GripVertical,
} from "lucide-react";
import type {
  PropertyImageryAnalysisResponse,
  VisibleIssue,
  ConditionFlag,
} from "@/lib/api/services/openai-service";

// ============================================
// Type Definitions
// ============================================

export interface PropertyImage {
  /** Unique identifier for the image */
  id: string;
  /** URL of the image */
  url: string;
  /** Type of imagery: satellite, street_view, aerial, or other */
  type: "satellite" | "street_view" | "aerial" | "other";
  /** Optional caption/description */
  caption?: string;
  /** Optional timestamp when image was captured */
  capturedAt?: string;
  /** Optional external link to source */
  sourceUrl?: string;
}

export interface PropertyVirtualTourProps {
  /** Array of property images to display */
  images: PropertyImage[];
  /** Property ID for API calls */
  propertyId?: string;
  /** Property address for display */
  address?: string;
  /** Property coordinates for fallback */
  lat?: number;
  lng?: number;
  /** Optional AI analysis results */
  aiAnalysis?: PropertyImageryAnalysisResponse;
  /** Optional custom class name */
  className?: string;
  /** Height of the gallery (default: 500px) */
  height?: number;
  /** Whether to show image captions */
  showCaptions?: boolean;
  /** Whether to show external links */
  showExternalLinks?: boolean;
  /** Whether to show analyze button */
  showAnalyzeButton?: boolean;
  /** Callback when an image is clicked */
  onImageClick?: (image: PropertyImage) => void;
  /** Callback when external link is clicked */
  onLinkClick?: (url: string) => void;
  /** Callback when analysis completes */
  onAnalysisComplete?: (analysis: PropertyImageryAnalysisResponse) => void;
}

// ============================================
// Constants
// ============================================

const DEFAULT_HEIGHT = 500;
const THUMBNAIL_SIZE = 80;

// Image type icons and labels
const IMAGE_TYPE_CONFIG = {
  satellite: {
    icon: Satellite,
    label: "Satellite",
    color: "text-blue-600 dark:text-blue-400",
  },
  street_view: {
    icon: Camera,
    label: "Street View",
    color: "text-green-600 dark:text-green-400",
  },
  aerial: {
    icon: ImageIcon,
    label: "Aerial",
    color: "text-purple-600 dark:text-purple-400",
  },
  other: {
    icon: ImageIcon,
    label: "Photo",
    color: "text-slate-600 dark:text-slate-400",
  },
} as const;

// Issue severity configuration
const SEVERITY_CONFIG = {
  low: {
    icon: Info,
    label: "Low",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
    borderColor: "border-blue-200 dark:border-blue-700",
  },
  medium: {
    icon: AlertCircle,
    label: "Medium",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
    borderColor: "border-amber-200 dark:border-amber-700",
  },
  high: {
    icon: AlertTriangle,
    label: "High",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/30",
    borderColor: "border-orange-200 dark:border-orange-700",
  },
  critical: {
    icon: XCircle,
    label: "Critical",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-700",
  },
} as const;

// Overall condition configuration
const CONDITION_CONFIG = {
  excellent: {
    icon: CheckCircle2,
    label: "Excellent",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/30",
  },
  good: {
    icon: CheckCircle2,
    label: "Good",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
  },
  fair: {
    icon: AlertCircle,
    label: "Fair",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
  },
  poor: {
    icon: AlertTriangle,
    label: "Poor",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/30",
  },
  unknown: {
    icon: AlertCircle,
    label: "Unknown",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-800",
  },
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Format captured date for display
 */
function formatCapturedDate(dateString?: string): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

/**
 * Generate Google Maps satellite link as fallback
 */
function generateFallbackMapLink(lat?: number, lng?: number): string | null {
  if (!lat || !lng) return null;
  return `https://www.google.com/maps/@${lat},${lng},19z/data=!3m1!1e3`;
}

/**
 * Format confidence score as percentage
 */
function formatConfidenceScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Get confidence level description
 */
function getConfidenceLevel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 0.9) {
    return {
      label: "Very High",
      color: "text-green-600 dark:text-green-400",
    };
  }
  if (score >= 0.75) {
    return {
      label: "High",
      color: "text-blue-600 dark:text-blue-400",
    };
  }
  if (score >= 0.6) {
    return {
      label: "Moderate",
      color: "text-amber-600 dark:text-amber-400",
    };
  }
  return {
    label: "Low",
    color: "text-red-600 dark:text-red-400",
  };
}

/**
 * Check if images have historical data (multiple dates available)
 */
function hasHistoricalData(images: PropertyImage[]): boolean {
  const datesWithData = images.filter((img) => img.capturedAt).length;
  return datesWithData >= 2;
}

/**
 * Get unique dates from images sorted chronologically
 */
function getUniqueDates(images: PropertyImage[]): string[] {
  const dates = images
    .filter((img) => img.capturedAt)
    .map((img) => img.capturedAt!)
    .sort();
  return Array.from(new Set(dates));
}

/**
 * Find image by date and type
 */
function findImageByDateAndType(
  images: PropertyImage[],
  date: string,
  preferredType?: PropertyImage["type"]
): PropertyImage | null {
  // Try to find image with matching date and preferred type
  if (preferredType) {
    const match = images.find(
      (img) => img.capturedAt === date && img.type === preferredType
    );
    if (match) return match;
  }

  // Fall back to any image with matching date
  return images.find((img) => img.capturedAt === date) || null;
}

// ============================================
// Sub-Components
// ============================================

/**
 * Empty state when no images are available
 */
function EmptyState({
  address,
  lat,
  lng,
  onLinkClick,
}: {
  address?: string;
  lat?: number;
  lng?: number;
  onLinkClick?: (url: string) => void;
}) {
  const mapLink = generateFallbackMapLink(lat, lng);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-center p-6">
      <ImageIcon className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-3" />
      <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">
        No Images Available
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Virtual tour imagery for this property is not yet available
      </p>
      {mapLink && (
        <a
          href={mapLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onLinkClick?.(mapLink)}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2",
            "text-sm font-medium",
            "text-blue-600 dark:text-blue-400",
            "bg-blue-50 dark:bg-blue-900/30",
            "rounded-lg",
            "hover:bg-blue-100 dark:hover:bg-blue-900/50",
            "transition-colors"
          )}
        >
          <Satellite className="h-4 w-4" />
          View Satellite on Google Maps
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

/**
 * Image type badge
 */
function ImageTypeBadge({ type }: { type: PropertyImage["type"] }) {
  const config = IMAGE_TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1",
        "text-xs font-medium",
        "bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm",
        "border border-slate-200 dark:border-slate-700",
        "rounded-md",
        config.color
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </div>
  );
}

/**
 * Fullscreen modal for expanded image view
 */
function FullscreenModal({
  image,
  onClose,
}: {
  image: PropertyImage;
  onClose: () => void;
}) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className={cn(
          "absolute top-4 right-4 z-10",
          "p-2 rounded-lg",
          "bg-white/10 hover:bg-white/20",
          "text-white",
          "transition-colors"
        )}
        aria-label="Close fullscreen"
      >
        <X className="h-6 w-6" />
      </button>
      <div
        className="relative max-w-7xl max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={image.url}
          alt={image.caption || "Property image"}
          width={1920}
          height={1080}
          className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
          unoptimized
        />
        {image.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white p-4">
            <p className="text-sm">{image.caption}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Before/After Comparison Slider - displays two images side-by-side with draggable divider
 */
function BeforeAfterSlider({
  beforeImage,
  afterImage,
  height,
  onClose,
}: {
  beforeImage: PropertyImage;
  afterImage: PropertyImage;
  height: number;
  onClose: () => void;
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      // Store ref for mouse move calculations
      (window as any).__sliderContainer = node;
    }
  }, []);

  // Handle mouse/touch drag
  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const container = (window as any).__sliderContainer;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      setSliderPosition(Math.max(0, Math.min(100, percentage)));
    },
    [isDragging]
  );

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove as any);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove as any);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const beforeDate = formatCapturedDate(beforeImage.capturedAt);
  const afterDate = formatCapturedDate(afterImage.capturedAt);

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Close button */}
      <button
        onClick={onClose}
        className={cn(
          "absolute top-3 right-3 z-30",
          "p-2 rounded-lg",
          "bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm",
          "text-slate-700 dark:text-slate-200",
          "border border-slate-200 dark:border-slate-700",
          "hover:bg-white dark:hover:bg-slate-900",
          "transition-colors"
        )}
        aria-label="Exit comparison mode"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Comparison container */}
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden rounded-lg cursor-col-resize select-none"
      >
        {/* After image (background) */}
        <div className="absolute inset-0">
          <Image
            src={afterImage.url}
            alt={`After: ${afterDate || "Recent"}`}
            fill
            className="object-contain"
            unoptimized
            priority
          />
          {/* After label */}
          <div className="absolute top-3 right-3 z-10">
            <div
              className={cn(
                "px-3 py-1.5",
                "bg-green-600 dark:bg-green-500",
                "text-white text-xs font-semibold",
                "rounded-md shadow-lg"
              )}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {afterDate || "Recent"}
              </div>
            </div>
          </div>
        </div>

        {/* Before image (clipped overlay) */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          }}
        >
          <Image
            src={beforeImage.url}
            alt={`Before: ${beforeDate || "Historical"}`}
            fill
            className="object-contain"
            unoptimized
            priority
          />
          {/* Before label */}
          <div className="absolute top-3 left-3 z-10">
            <div
              className={cn(
                "px-3 py-1.5",
                "bg-blue-600 dark:bg-blue-500",
                "text-white text-xs font-semibold",
                "rounded-md shadow-lg"
              )}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {beforeDate || "Historical"}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className="absolute top-0 bottom-0 z-20"
          style={{
            left: `${sliderPosition}%`,
            transform: "translateX(-50%)",
            width: "4px",
          }}
        >
          {/* Divider line */}
          <div className="absolute inset-0 bg-white shadow-lg" />

          {/* Draggable handle */}
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "w-10 h-10 rounded-full",
              "bg-white dark:bg-slate-100",
              "border-4 border-slate-300 dark:border-slate-600",
              "shadow-xl",
              "flex items-center justify-center",
              "cursor-col-resize",
              isDragging
                ? "scale-110 border-blue-500 dark:border-blue-400"
                : "hover:scale-105"
            )}
            onMouseDown={handleMouseDown}
            role="slider"
            aria-label="Comparison slider"
            aria-valuenow={sliderPosition}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <GripVertical
              className={cn(
                "h-5 w-5",
                isDragging
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-700"
              )}
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
        <div
          className={cn(
            "px-4 py-2",
            "bg-black/60 backdrop-blur-sm",
            "text-white text-xs font-medium",
            "rounded-full"
          )}
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Drag slider to compare images
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AI Analysis Panel - displays AI insights and issue flags
 */
function AIAnalysisPanel({
  analysis,
}: {
  analysis: PropertyImageryAnalysisResponse;
}) {
  const conditionConfig = CONDITION_CONFIG[analysis.findings.overallCondition];
  const ConditionIcon = conditionConfig.icon;
  const confidenceLevel = getConfidenceLevel(analysis.confidenceScore);

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            AI Vision Analysis
          </h3>
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
            {analysis.aiModel}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Overall Condition */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Overall Condition:
            </span>
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1",
              "text-sm font-semibold rounded-full",
              conditionConfig.bgColor,
              conditionConfig.color
            )}
          >
            <ConditionIcon className="h-4 w-4" />
            {conditionConfig.label}
          </div>
        </div>

        {/* Confidence Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Confidence Score
            </span>
            <span className={cn("font-semibold", confidenceLevel.color)}>
              {formatConfidenceScore(analysis.confidenceScore)} (
              {confidenceLevel.label})
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                analysis.confidenceScore >= 0.75
                  ? "bg-green-500 dark:bg-green-400"
                  : analysis.confidenceScore >= 0.6
                  ? "bg-amber-500 dark:bg-amber-400"
                  : "bg-red-500 dark:bg-red-400"
              )}
              style={{ width: `${analysis.confidenceScore * 100}%` }}
            />
          </div>
        </div>

        {/* Visible Issues */}
        {analysis.visibleIssues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Visible Issues ({analysis.visibleIssues.length})
            </h4>
            <div className="space-y-2">
              {analysis.visibleIssues.map((issue, index) => {
                const severityConfig = SEVERITY_CONFIG[issue.severity];
                const SeverityIcon = severityConfig.icon;

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      severityConfig.bgColor,
                      severityConfig.borderColor
                    )}
                  >
                    <SeverityIcon
                      className={cn("h-5 w-5 flex-shrink-0 mt-0.5", severityConfig.color)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "text-xs font-semibold uppercase",
                            severityConfig.color
                          )}
                        >
                          {severityConfig.label}
                        </span>
                        {issue.location && (
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            • {issue.location}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                          {formatConfidenceScore(issue.confidence)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {issue.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Positive Features */}
        {analysis.findings.positiveFeatures &&
          analysis.findings.positiveFeatures.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                Positive Features
              </h4>
              <ul className="space-y-1">
                {analysis.findings.positiveFeatures.map((feature, index) => (
                  <li
                    key={index}
                    className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Concerns */}
        {analysis.findings.concerns && analysis.findings.concerns.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Concerns
            </h4>
            <ul className="space-y-1">
              {analysis.findings.concerns.map((concern, index) => (
                <li
                  key={index}
                  className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendation */}
        {analysis.recommendation && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Recommendation
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {analysis.recommendation}
            </p>
          </div>
        )}

        {/* Analysis Timestamp */}
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Analyzed: {new Date(analysis.analyzedAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function PropertyVirtualTour({
  images,
  propertyId,
  address,
  lat,
  lng,
  aiAnalysis,
  className,
  height = DEFAULT_HEIGHT,
  showCaptions = true,
  showExternalLinks = true,
  showAnalyzeButton = true,
  onImageClick,
  onLinkClick,
  onAnalysisComplete,
}: PropertyVirtualTourProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [beforeDate, setBeforeDate] = useState<string | null>(null);
  const [afterDate, setAfterDate] = useState<string | null>(null);

  // AI Analysis state
  const [localAnalysis, setLocalAnalysis] = useState<PropertyImageryAnalysisResponse | undefined>(aiAnalysis);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Reset to first image when images array changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsLoading(true);
    setHasError(false);
  }, [images]);

  // Sync aiAnalysis prop with local state
  useEffect(() => {
    if (aiAnalysis) {
      setLocalAnalysis(aiAnalysis);
    }
  }, [aiAnalysis]);

  // Current image
  const currentImage = images[currentIndex];
  const hasImages = images.length > 0;
  const hasMultipleImages = images.length > 1;

  // Historical comparison support
  const hasHistorical = hasHistoricalData(images);
  const availableDates = getUniqueDates(images);

  // Initialize comparison dates when entering comparison mode
  useEffect(() => {
    if (isComparisonMode && availableDates.length >= 2) {
      if (!beforeDate) setBeforeDate(availableDates[0]);
      if (!afterDate) setAfterDate(availableDates[availableDates.length - 1]);
    }
  }, [isComparisonMode, availableDates, beforeDate, afterDate]);

  // Get comparison images
  const beforeImage =
    beforeDate && isComparisonMode
      ? findImageByDateAndType(images, beforeDate, currentImage?.type)
      : null;
  const afterImage =
    afterDate && isComparisonMode
      ? findImageByDateAndType(images, afterDate, currentImage?.type)
      : null;
  const canCompare = beforeImage && afterImage && beforeImage.id !== afterImage.id;

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setIsLoading(true);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setIsLoading(true);
  }, [images.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsLoading(true);
  }, []);

  // Image event handlers
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleImageClick = useCallback(() => {
    if (currentImage) {
      onImageClick?.(currentImage);
      setIsFullscreen(true);
    }
  }, [currentImage, onImageClick]);

  const handleExternalLinkClick = useCallback(
    (url: string) => {
      onLinkClick?.(url);
    },
    [onLinkClick]
  );

  /**
   * Trigger AI analysis on property imagery
   */
  const handleRunAnalysis = useCallback(async () => {
    if (!propertyId || images.length === 0 || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Determine analysis type based on available images
      const hasSatellite = images.some((img) => img.type === "satellite");
      const hasStreetView = images.some((img) => img.type === "street_view");
      const analysisType = hasSatellite && hasStreetView ? "combined" : hasSatellite ? "satellite" : "street_view";

      // Build request payload
      const requestBody = {
        propertyId,
        imageUrls: images.map((img) => img.url),
        analysisType,
        options: {
          includePropertyContext: true,
          satelliteImageUrl: images.find((img) => img.type === "satellite")?.url,
          streetViewImageUrl: images.find((img) => img.type === "street_view")?.url,
        },
      };

      // Call API
      const response = await fetch("/api/analysis/property-imagery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Analysis failed");
      }

      // Update local state with analysis results
      setLocalAnalysis(result.data);
      setAnalysisError(null);

      // Notify parent component
      onAnalysisComplete?.(result.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze property imagery";
      setAnalysisError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [propertyId, images, isAnalyzing, onAnalysisComplete]);

  // Format caption
  const captionText = currentImage?.caption || address;
  const capturedDate = formatCapturedDate(currentImage?.capturedAt);

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Virtual Tour Gallery */}
      <div
        className="relative w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"
        style={{ height }}
      >
      {!hasImages ? (
        <EmptyState
          address={address}
          lat={lat}
          lng={lng}
          onLinkClick={handleExternalLinkClick}
        />
      ) : isComparisonMode && canCompare ? (
        <>
          {/* Historical Comparison Mode */}
          <BeforeAfterSlider
            beforeImage={beforeImage!}
            afterImage={afterImage!}
            height={height}
            onClose={() => setIsComparisonMode(false)}
          />

          {/* Date selectors */}
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
            {/* Before date selector */}
            <div
              className={cn(
                "px-3 py-2",
                "bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm",
                "border border-slate-200 dark:border-slate-700",
                "rounded-lg shadow-sm"
              )}
            >
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Before
              </label>
              <select
                value={beforeDate || ""}
                onChange={(e) => setBeforeDate(e.target.value)}
                className={cn(
                  "text-xs font-medium",
                  "bg-transparent",
                  "text-slate-900 dark:text-slate-100",
                  "border-none outline-none",
                  "cursor-pointer"
                )}
              >
                {availableDates.map((date) => (
                  <option key={`before-${date}`} value={date}>
                    {formatCapturedDate(date) || date}
                  </option>
                ))}
              </select>
            </div>

            {/* After date selector */}
            <div
              className={cn(
                "px-3 py-2",
                "bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm",
                "border border-slate-200 dark:border-slate-700",
                "rounded-lg shadow-sm"
              )}
            >
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                After
              </label>
              <select
                value={afterDate || ""}
                onChange={(e) => setAfterDate(e.target.value)}
                className={cn(
                  "text-xs font-medium",
                  "bg-transparent",
                  "text-slate-900 dark:text-slate-100",
                  "border-none outline-none",
                  "cursor-pointer"
                )}
              >
                {availableDates.map((date) => (
                  <option key={`after-${date}`} value={date}>
                    {formatCapturedDate(date) || date}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Main image display */}
          <div className="relative w-full h-full">
            {/* Loading state */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-10">
                <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
              </div>
            )}

            {/* Error state */}
            {hasError && !isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 z-10">
                <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  Failed to Load Image
                </p>
              </div>
            )}

            {/* Image */}
            <div
              className={cn(
                "relative w-full h-full cursor-pointer",
                isLoading || hasError ? "opacity-0" : "opacity-100",
                "transition-opacity duration-300"
              )}
              onClick={handleImageClick}
            >
              <Image
                src={currentImage.url}
                alt={captionText || "Property image"}
                fill
                className="object-contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
                unoptimized
                priority={currentIndex === 0}
              />
            </div>

            {/* Image type badge (top-left) */}
            {!isLoading && !hasError && (
              <div className="absolute top-3 left-3 z-20">
                <ImageTypeBadge type={currentImage.type} />
              </div>
            )}

            {/* Top-right controls */}
            {!isLoading && !hasError && (
              <div className="absolute top-3 right-3 z-20 flex gap-2">
                {/* Comparison mode toggle (only show if historical data available) */}
                {hasHistorical && !isComparisonMode && (
                  <button
                    onClick={() => setIsComparisonMode(true)}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2",
                      "bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm",
                      "text-slate-700 dark:text-slate-200",
                      "border border-slate-200 dark:border-slate-700",
                      "rounded-lg shadow-sm",
                      "hover:bg-white dark:hover:bg-slate-900",
                      "transition-colors",
                      "text-xs font-medium"
                    )}
                    title="Compare historical images"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Compare
                  </button>
                )}

                {/* Fullscreen button */}
                <button
                  onClick={handleImageClick}
                  className={cn(
                    "p-2 rounded-lg",
                    "bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm",
                    "text-slate-700 dark:text-slate-200",
                    "border border-slate-200 dark:border-slate-700",
                    "hover:bg-white dark:hover:bg-slate-900",
                    "transition-colors"
                  )}
                  title="View fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* External link (bottom-right) */}
            {showExternalLinks &&
              currentImage?.sourceUrl &&
              !isLoading &&
              !hasError && (
                <div className="absolute bottom-3 right-3 z-20">
                  <a
                    href={currentImage.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleExternalLinkClick(currentImage.sourceUrl!)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5",
                      "text-xs font-medium",
                      "bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm",
                      "text-slate-700 dark:text-slate-200",
                      "border border-slate-200 dark:border-slate-700",
                      "rounded-md shadow-sm",
                      "hover:bg-white dark:hover:bg-slate-900",
                      "transition-colors"
                    )}
                    title="View source"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Source
                  </a>
                </div>
              )}

            {/* Caption (bottom-left) */}
            {showCaptions && captionText && !isLoading && !hasError && (
              <div className="absolute bottom-3 left-3 right-20 z-20">
                <div
                  className={cn(
                    "px-3 py-2",
                    "bg-black/60 backdrop-blur-sm",
                    "text-white text-sm",
                    "rounded-md"
                  )}
                >
                  <p className="font-medium truncate">{captionText}</p>
                  {capturedDate && (
                    <p className="text-xs text-white/70 mt-0.5">
                      Captured: {capturedDate}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Navigation arrows */}
            {hasMultipleImages && !isLoading && !hasError && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 z-20",
                    "p-2 rounded-full",
                    "bg-black/40 hover:bg-black/60",
                    "text-white",
                    "transition-colors"
                  )}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 z-20",
                    "p-2 rounded-full",
                    "bg-black/40 hover:bg-black/60",
                    "text-white",
                    "transition-colors"
                  )}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Image counter */}
            {hasMultipleImages && !isLoading && !hasError && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
                <div
                  className={cn(
                    "px-3 py-1",
                    "bg-black/60 backdrop-blur-sm",
                    "text-white text-xs font-medium",
                    "rounded-full"
                  )}
                >
                  {currentIndex + 1} / {images.length}
                </div>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {hasMultipleImages && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm p-3 z-30">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => {
                  const typeConfig = IMAGE_TYPE_CONFIG[image.type];
                  const Icon = typeConfig.icon;
                  const isActive = index === currentIndex;

                  return (
                    <button
                      key={image.id}
                      onClick={() => goToIndex(index)}
                      className={cn(
                        "relative flex-shrink-0 rounded-md overflow-hidden",
                        "border-2 transition-all",
                        isActive
                          ? "border-white scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                      )}
                      style={{
                        width: THUMBNAIL_SIZE,
                        height: THUMBNAIL_SIZE,
                      }}
                      aria-label={`View image ${index + 1}`}
                    >
                      <Image
                        src={image.url}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute top-1 left-1">
                        <Icon className="h-3 w-3 text-white drop-shadow" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Fullscreen modal */}
      {isFullscreen && currentImage && (
        <FullscreenModal
          image={currentImage}
          onClose={() => setIsFullscreen(false)}
        />
      )}
      </div>

      {/* Analysis Trigger Section */}
      {showAnalyzeButton && hasImages && propertyId && !localAnalysis && (
        <div className="w-full">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    AI Vision Analysis
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Run automated condition assessment using GPT-4o vision
                  </p>
                </div>
              </div>
              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2",
                  "text-sm font-medium",
                  "rounded-lg",
                  "transition-all",
                  isAnalyzing
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm hover:shadow-md"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze Property
                  </>
                )}
              </button>
            </div>
            {analysisError && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {analysisError}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Analysis Panel */}
      {localAnalysis && <AIAnalysisPanel analysis={localAnalysis} />}
    </div>
  );
}

export default PropertyVirtualTour;
