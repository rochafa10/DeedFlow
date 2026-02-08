"use client";

/**
 * Google Street View Static Component
 *
 * Renders a static Street View image using Google's Street View Static API.
 * More reliable than the embed iframe approach.
 *
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.
 *
 * @component
 */

import { useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  MapPin,
  ExternalLink,
  Loader2,
  AlertCircle,
  Eye,
  RotateCw,
} from "lucide-react";

// ============================================
// Type Definitions
// ============================================

export interface GoogleStreetViewStaticProps {
  /** Latitude coordinate of the property */
  lat: number;
  /** Longitude coordinate of the property */
  lng: number;
  /** Property address for display */
  address?: string;
  /** Camera heading/direction in degrees (0-360, 0=North, 90=East) */
  heading?: number;
  /** Camera pitch in degrees (-90 to 90, 0=level) */
  pitch?: number;
  /** Field of view in degrees (10-120, default 90) */
  fov?: number;
  /** Image width in pixels (max 640 for free tier) */
  width?: number;
  /** Image height in pixels (max 640 for free tier) */
  height?: number;
  /** Optional custom class name */
  className?: string;
  /** Whether to show the "Open in Google Maps" link */
  showExternalLink?: boolean;
  /** Alt text for accessibility */
  altText?: string;
  /** Callback when external link is clicked */
  onLinkClick?: () => void;
}

// ============================================
// Constants
// ============================================

const DEFAULT_HEADING = 0;
const DEFAULT_PITCH = 0;
const DEFAULT_FOV = 90;
const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 400;

// ============================================
// Helper Functions
// ============================================

/**
 * Normalizes heading to 0-360 range
 */
function normalizeHeading(heading: number): number {
  let h = heading % 360;
  if (h < 0) h += 360;
  return h;
}

/**
 * Generate the Street View Static API URL
 */
function generateStaticUrl(
  lat: number,
  lng: number,
  heading: number,
  pitch: number,
  fov: number,
  width: number,
  height: number,
  apiKey: string
): string {
  const params = new URLSearchParams({
    size: `${width}x${height}`,
    location: `${lat},${lng}`,
    heading: String(normalizeHeading(heading)),
    pitch: String(Math.max(-90, Math.min(90, pitch))),
    fov: String(Math.max(10, Math.min(120, fov))),
    key: apiKey,
  });

  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}

/**
 * Generate a direct link to Google Street View
 */
function generateDirectLink(
  lat: number,
  lng: number,
  heading: number,
  pitch: number,
  fov: number
): string {
  const normalizedHeading = normalizeHeading(heading);
  const normalizedPitch = Math.max(-90, Math.min(90, pitch));
  const clampedFov = Math.max(10, Math.min(120, fov));

  return `https://www.google.com/maps/@${lat},${lng},3a,${clampedFov}y,${normalizedHeading}h,${90 - normalizedPitch}t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`;
}

/**
 * Convert heading degrees to cardinal direction
 */
function getCardinalDirection(heading: number): string {
  const h = normalizeHeading(heading);
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(h / 45) % 8;
  return directions[index];
}

// ============================================
// Main Component
// ============================================

export function GoogleStreetViewStatic({
  lat,
  lng,
  address,
  heading = DEFAULT_HEADING,
  pitch = DEFAULT_PITCH,
  fov = DEFAULT_FOV,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className,
  showExternalLink = true,
  altText,
  onLinkClick,
}: GoogleStreetViewStaticProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentHeading, setCurrentHeading] = useState(heading);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  // Generate URLs
  const imageUrl = apiKey
    ? generateStaticUrl(lat, lng, currentHeading, pitch, fov, width, height, apiKey)
    : null;
  const directLink = generateDirectLink(lat, lng, currentHeading, pitch, fov);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  // Handle image error
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Handle external link click
  const handleLinkClick = useCallback(() => {
    onLinkClick?.();
  }, [onLinkClick]);

  // Rotate view by 90 degrees
  const rotateView = useCallback(() => {
    setIsLoading(true);
    setCurrentHeading((prev) => (prev + 90) % 360);
  }, []);

  // Generate alt text
  const imageAltText =
    altText ||
    `Street view of ${address || `location at ${lat}, ${lng}`} facing ${getCardinalDirection(currentHeading)}`;

  // No API key configured - show placeholder with direct Street View link
  if (!apiKey) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-800/50",
          className
        )}
        style={{ height }}
      >
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-4">
            <Eye className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-slate-700 dark:text-slate-200 font-semibold mb-1">
            Street View
          </p>
          {address && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 max-w-[250px] truncate">
              {address}
            </p>
          )}
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            See the property from street level on Google Maps
          </p>
          <a
            href={directLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-lg shadow-sm transition-colors"
          >
            <Eye className="h-4 w-4" />
            Open Street View
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800",
        className
      )}
      style={{ height }}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 z-10">
          <Loader2 className="h-8 w-8 text-slate-400 animate-spin mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading Street View...
          </p>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 text-center p-4 z-10">
          <AlertCircle className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" />
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">
            Street View Not Available
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            No street-level imagery at this location
          </p>
          <a
            href={directLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <MapPin className="h-4 w-4" />
            View on Google Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Street View Image */}
      {imageUrl && !hasError && (
        <Image
          src={imageUrl}
          alt={imageAltText}
          fill
          className={cn(
            "object-cover",
            isLoading ? "opacity-0" : "opacity-100",
            "transition-opacity duration-300"
          )}
          onLoad={handleLoad}
          onError={handleError}
          unoptimized // Required for external URLs
          priority={false}
        />
      )}

      {/* Rotate button */}
      {!hasError && !isLoading && (
        <button
          onClick={rotateView}
          className={cn(
            "absolute top-3 right-3 z-10",
            "p-2 rounded-full",
            "bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm",
            "text-slate-700 dark:text-slate-200",
            "border border-slate-200 dark:border-slate-700",
            "shadow-sm hover:bg-white dark:hover:bg-slate-900",
            "transition-colors"
          )}
          title="Rotate view 90°"
          aria-label="Rotate street view"
        >
          <RotateCw className="h-4 w-4" />
        </button>
      )}

      {/* External link overlay */}
      {showExternalLink && !hasError && (
        <div className="absolute bottom-3 right-3 z-10">
          <a
            href={directLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
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
            title="Open in Google Maps"
          >
            <Eye className="h-3.5 w-3.5" />
            Open Street View
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        </div>
      )}

      {/* Heading indicator */}
      {!isLoading && !hasError && (
        <div className="absolute bottom-3 left-3 z-10">
          <div
            className={cn(
              "px-2 py-1 text-xs font-mono",
              "bg-black/60 backdrop-blur-sm",
              "text-white/90 rounded"
            )}
          >
            {normalizeHeading(currentHeading)}° {getCardinalDirection(currentHeading)}
          </div>
        </div>
      )}
    </div>
  );
}

export default GoogleStreetViewStatic;
