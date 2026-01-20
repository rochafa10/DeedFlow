"use client";

/**
 * Street View Map Component
 *
 * Renders an embedded Google Street View of a property location.
 * Uses the Google Maps embed URL without requiring an API key.
 * Falls back to a placeholder when coordinates are missing or Street View unavailable.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-17
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  MapPin,
  ExternalLink,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

// ============================================
// Type Definitions
// ============================================

export interface StreetViewMapProps {
  /** Latitude coordinate of the property */
  lat?: number;
  /** Longitude coordinate of the property */
  lng?: number;
  /** Property address for display and fallback search */
  address?: string;
  /** Camera heading/direction in degrees (0-360, 0=North, 90=East, etc.) */
  heading?: number;
  /** Camera pitch in degrees (-90 to 90, 0=level, positive=up, negative=down) */
  pitch?: number;
  /** Field of view in degrees (10-100, default 90). Lower values = more zoom. */
  fov?: number;
  /** Optional custom class name for the container */
  className?: string;
  /** Height of the map container (default: 100%) */
  height?: string | number;
  /** Whether to show the "Open in Google Maps" link */
  showExternalLink?: boolean;
  /** Alt text for accessibility */
  altText?: string;
  /** Callback when external link is clicked (for analytics tracking) */
  onLinkClick?: () => void;
}

// ============================================
// Constants
// ============================================

/** Default camera heading (facing East) */
const DEFAULT_HEADING = 90;

/** Default camera pitch (level) */
const DEFAULT_PITCH = 0;

/** Default field of view */
const DEFAULT_FOV = 90;

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
 * Normalizes heading to 0-360 range
 */
function normalizeHeading(heading: number): number {
  let h = heading % 360;
  if (h < 0) h += 360;
  return h;
}

/**
 * Converts FOV to zoom level for cbp parameter
 * FOV 90 (default) = zoom 12 (standard)
 * Lower FOV = higher zoom (more zoomed in)
 * Higher FOV = lower zoom (more zoomed out)
 * cbp zoom typically ranges from 11-13
 */
function fovToZoom(fov: number): number {
  // Clamp FOV to valid range (10-100)
  const clampedFov = Math.max(10, Math.min(100, fov));
  // Map FOV 10-100 to zoom 13-11 (inverse relationship)
  // FOV 10 -> zoom 13 (most zoomed in)
  // FOV 100 -> zoom 11 (most zoomed out)
  // FOV 90 (default) -> zoom ~11.2
  return 13 - ((clampedFov - 10) / 90) * 2;
}

/**
 * Generates the Google Street View embed URL
 * Uses the format that doesn't require an API key
 *
 * cbp parameters format: zoom,heading,,pitch (note: third param is empty)
 * cbll parameters: camera location (lat, lng)
 */
function generateEmbedUrl(
  lat: number,
  lng: number,
  heading: number,
  pitch: number,
  fov: number
): string {
  // Normalize values
  const normalizedHeading = normalizeHeading(heading);
  const normalizedPitch = Math.max(-90, Math.min(90, pitch));

  // Build the URL manually to control parameter encoding
  // The cbp format for Street View is: zoom,heading,,0,pitch
  // The third parameter (tilt) should be empty, not 0
  const cbpValue = `12,${normalizedHeading},,0,${normalizedPitch}`;

  // Use coordinates as the query to help Google locate the street view
  const url = `https://maps.google.com/maps?q=${lat},${lng}&layer=c&cbll=${lat},${lng}&cbp=${cbpValue}&output=embed`;

  return url;
}

/**
 * Generates a direct link to open Street View in Google Maps
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
  const clampedFov = Math.max(10, Math.min(100, fov));
  // Format: @lat,lng,zoom/data for street view
  // The 'y' parameter controls FOV (field of view)
  return `https://www.google.com/maps/@${lat},${lng},3a,${clampedFov}y,${normalizedHeading}h,${90 - normalizedPitch}t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`;
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
        Loading Street View...
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
  const handleClick = () => {
    onLinkClick?.();
  };

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
          onClick={handleClick}
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

/**
 * Fallback when Street View is not available at location
 */
function StreetViewNotAvailable({
  lat,
  lng,
  address,
  onLinkClick,
}: {
  lat: number;
  lng: number;
  address?: string;
  onLinkClick?: () => void;
}) {
  const directLink = address
    ? generateAddressLink(address)
    : `https://www.google.com/maps/@${lat},${lng},19z`;

  const handleClick = () => {
    onLinkClick?.();
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 text-center p-4">
      <EyeOff className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" />
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
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
      >
        <MapPin className="h-4 w-4" />
        View on Map
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function StreetViewMap({
  lat,
  lng,
  address,
  heading = DEFAULT_HEADING,
  pitch = DEFAULT_PITCH,
  fov = DEFAULT_FOV,
  className,
  height = "100%",
  showExternalLink = true,
  altText = "Street view of property location",
  onLinkClick,
}: StreetViewMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Validate coordinates
  const hasValidCoordinates = areCoordinatesValid(lat, lng);

  // Generate URLs
  const embedUrl = hasValidCoordinates
    ? generateEmbedUrl(lat!, lng!, heading, pitch, fov)
    : null;
  const directLink = hasValidCoordinates
    ? generateDirectLink(lat!, lng!, heading, pitch, fov)
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

  // Handle external link click
  const handleLinkClick = useCallback(() => {
    onLinkClick?.();
  }, [onLinkClick]);

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

          {/* Google Street View iframe */}
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
      ) : hasValidCoordinates && hasError ? (
        <StreetViewNotAvailable
          lat={lat!}
          lng={lng!}
          address={address}
          onLinkClick={handleLinkClick}
        />
      ) : (
        <CoordinatesNotAvailable address={address} onLinkClick={handleLinkClick} />
      )}

      {/* External link overlay */}
      {showExternalLink && directLink && (
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

      {/* Camera info display (bottom left) */}
      {hasValidCoordinates && !isLoading && !hasError && (
        <div className="absolute bottom-3 left-3 z-10">
          <div
            className={cn(
              "px-2 py-1 text-xs font-mono",
              "bg-black/60 backdrop-blur-sm",
              "text-white/90 rounded"
            )}
          >
            {normalizeHeading(heading)}° {getCardinalDirection(heading)}
          </div>
        </div>
      )}
    </div>
  );
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

export default StreetViewMap;
