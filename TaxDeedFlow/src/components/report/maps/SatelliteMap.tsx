"use client";

/**
 * Satellite Map Component
 *
 * Renders an embedded Google Maps satellite view of a property location.
 * Uses the Google Maps embed URL without requiring an API key.
 * Falls back to a placeholder when coordinates are missing.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-17
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Map,
  MapPin,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ============================================
// Type Definitions
// ============================================

export interface SatelliteMapProps {
  /** Latitude coordinate of the property */
  lat?: number;
  /** Longitude coordinate of the property */
  lng?: number;
  /** Property address for display and fallback search */
  address?: string;
  /** Zoom level for the map (1-21, default 19 for property viewing) */
  zoom?: number;
  /** Optional custom class name for the container */
  className?: string;
  /** Height of the map container (default: 100%) */
  height?: string | number;
  /** Whether to show the "Open in Google Maps" link */
  showExternalLink?: boolean;
  /** Alt text for accessibility */
  altText?: string;
}

// ============================================
// Constants
// ============================================

/** Default zoom level optimized for property viewing */
const DEFAULT_ZOOM = 19;

/** Minimum valid latitude range */
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;

/** Minimum valid longitude range */
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;

// ============================================
// Helper Functions
// ============================================

/**
 * Validates that coordinates are within valid ranges
 */
function areCoordinatesValid(lat?: number, lng?: number): boolean {
  if (lat === undefined || lng === undefined) return false;
  if (lat === 0 && lng === 0) return false; // Null island check
  if (lat < MIN_LATITUDE || lat > MAX_LATITUDE) return false;
  if (lng < MIN_LONGITUDE || lng > MAX_LONGITUDE) return false;
  return true;
}

/**
 * Generates the Google Maps embed URL for satellite view
 * Uses the simpler embed format that doesn't require an API key
 */
function generateEmbedUrl(lat: number, lng: number, zoom: number): string {
  // Using the iframe embed format that works without API key
  // t=k means satellite/aerial view, z=zoom level, output=embed for iframe
  const params = new URLSearchParams({
    q: `${lat},${lng}`,
    t: "k", // Satellite view (k = satellite, m = roadmap, p = terrain, h = hybrid)
    z: zoom.toString(),
    output: "embed",
  });
  return `https://maps.google.com/maps?${params.toString()}`;
}

/**
 * Generates a direct link to open in Google Maps app/website
 */
function generateDirectLink(lat: number, lng: number, zoom: number): string {
  return `https://www.google.com/maps/@${lat},${lng},${zoom}z/data=!3m1!1e3`;
}

/**
 * Generates a search-based link when only address is available
 */
function generateAddressLink(address: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
}

// ============================================
// Sub-Components
// ============================================

/**
 * Loading state placeholder
 */
function LoadingPlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800">
      <Loader2 className="h-8 w-8 text-slate-400 animate-spin mb-2" />
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Loading satellite view...
      </p>
    </div>
  );
}

/**
 * Fallback placeholder when coordinates are missing
 */
function CoordinatesNotAvailable({
  address,
  onLinkClick,
}: {
  address?: string;
  onLinkClick?: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 text-center p-4">
      <AlertCircle className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" />
      <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">
        Coordinates Not Available
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Property location data is missing
      </p>
      {address && (
        <a
          href={generateAddressLink(address)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onLinkClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          <MapPin className="h-4 w-4" />
          Search by Address
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function SatelliteMap({
  lat,
  lng,
  address,
  zoom = DEFAULT_ZOOM,
  className,
  height = "100%",
  showExternalLink = true,
  altText = "Satellite view of property location",
}: SatelliteMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Validate coordinates
  const hasValidCoordinates = areCoordinatesValid(lat, lng);

  // Generate URLs
  const embedUrl = hasValidCoordinates
    ? generateEmbedUrl(lat!, lng!, zoom)
    : null;
  const directLink = hasValidCoordinates
    ? generateDirectLink(lat!, lng!, zoom)
    : address
    ? generateAddressLink(address)
    : null;

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  // Handle iframe error
  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Determine container height style
  const heightStyle =
    typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800",
        className
      )}
      style={{ height: heightStyle }}
    >
      {/* Map iframe or fallback */}
      {hasValidCoordinates && embedUrl && !hasError ? (
        <>
          {/* Loading state */}
          {isLoading && <LoadingPlaceholder />}

          {/* Google Maps iframe */}
          <iframe
            src={embedUrl}
            title={altText}
            className={cn(
              "w-full h-full border-0",
              isLoading ? "opacity-0" : "opacity-100",
              "transition-opacity duration-300"
            )}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            allowFullScreen={false}
            aria-label={altText}
          />
        </>
      ) : (
        <CoordinatesNotAvailable address={address} />
      )}

      {/* External link overlay */}
      {showExternalLink && directLink && (
        <div className="absolute bottom-3 right-3 z-10">
          <a
            href={directLink}
            target="_blank"
            rel="noopener noreferrer"
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
            <Map className="h-3.5 w-3.5" />
            Open in Maps
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        </div>
      )}

      {/* Coordinate display (bottom left) */}
      {hasValidCoordinates && (
        <div className="absolute bottom-3 left-3 z-10">
          <div
            className={cn(
              "px-2 py-1 text-xs font-mono",
              "bg-black/60 backdrop-blur-sm",
              "text-white/90 rounded"
            )}
          >
            {lat!.toFixed(5)}, {lng!.toFixed(5)}
          </div>
        </div>
      )}
    </div>
  );
}

export default SatelliteMap;
