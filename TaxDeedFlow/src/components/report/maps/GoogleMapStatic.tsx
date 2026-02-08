"use client";

/**
 * Google Map Static Component
 *
 * Renders a static map image using Google's Maps Static API.
 * Shows road map with marker at the property location.
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
  ZoomIn,
  ZoomOut,
} from "lucide-react";

// ============================================
// Type Definitions
// ============================================

export interface GoogleMapStaticProps {
  /** Latitude coordinate of the property */
  lat: number;
  /** Longitude coordinate of the property */
  lng: number;
  /** Property address for display */
  address?: string;
  /** Zoom level (1-21, default 17) */
  zoom?: number;
  /** Map type: roadmap, satellite, terrain, hybrid */
  mapType?: "roadmap" | "satellite" | "terrain" | "hybrid";
  /** Image width in pixels (max 640 for free tier) */
  width?: number;
  /** Image height in pixels (max 640 for free tier) */
  height?: number;
  /** Optional custom class name */
  className?: string;
  /** Whether to show the "Open in Google Maps" link */
  showExternalLink?: boolean;
  /** Whether to show marker at location */
  showMarker?: boolean;
  /** Alt text for accessibility */
  altText?: string;
  /** Callback when external link is clicked */
  onLinkClick?: () => void;
}

// ============================================
// Constants
// ============================================

const DEFAULT_ZOOM = 17;
const DEFAULT_MAP_TYPE = "roadmap";
const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 400;
const MIN_ZOOM = 1;
const MAX_ZOOM = 21;

// ============================================
// Helper Functions
// ============================================

/**
 * Generate the Maps Static API URL
 */
function generateStaticUrl(
  lat: number,
  lng: number,
  zoom: number,
  mapType: string,
  width: number,
  height: number,
  showMarker: boolean,
  apiKey: string
): string {
  const params = new URLSearchParams({
    size: `${width}x${height}`,
    center: `${lat},${lng}`,
    zoom: String(zoom),
    maptype: mapType,
    key: apiKey,
  });

  // Add marker
  if (showMarker) {
    params.append("markers", `color:red|${lat},${lng}`);
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/**
 * Generate a direct link to Google Maps
 */
function generateDirectLink(lat: number, lng: number, zoom: number): string {
  return `https://www.google.com/maps/@${lat},${lng},${zoom}z`;
}

// ============================================
// Main Component
// ============================================

export function GoogleMapStatic({
  lat,
  lng,
  address,
  zoom = DEFAULT_ZOOM,
  mapType = DEFAULT_MAP_TYPE,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className,
  showExternalLink = true,
  showMarker = true,
  altText,
  onLinkClick,
}: GoogleMapStaticProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(zoom);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  // Generate URLs
  const imageUrl = apiKey
    ? generateStaticUrl(lat, lng, currentZoom, mapType, width, height, showMarker, apiKey)
    : null;
  const directLink = generateDirectLink(lat, lng, currentZoom);

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

  // Zoom in
  const zoomIn = useCallback(() => {
    if (currentZoom < MAX_ZOOM) {
      setIsLoading(true);
      setCurrentZoom((prev) => Math.min(prev + 1, MAX_ZOOM));
    }
  }, [currentZoom]);

  // Zoom out
  const zoomOut = useCallback(() => {
    if (currentZoom > MIN_ZOOM) {
      setIsLoading(true);
      setCurrentZoom((prev) => Math.max(prev - 1, MIN_ZOOM));
    }
  }, [currentZoom]);

  // Generate alt text
  const imageAltText =
    altText || `Map of ${address || `location at ${lat}, ${lng}`}`;

  // No API key configured - use free Google Maps embed iframe
  if (!apiKey) {
    const mapTypeParam = mapType === "satellite" || mapType === "hybrid" ? "k" : "m";
    const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&t=${mapTypeParam}&z=${currentZoom}&output=embed`;
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800",
          className
        )}
        style={{ height }}
      >
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          title={altText || `Map of ${address || `${lat}, ${lng}`}`}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
        {showExternalLink && (
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
              <MapPin className="h-3.5 w-3.5" />
              Open in Maps
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
          </div>
        )}
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
            Loading Map...
          </p>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 text-center p-4 z-10">
          <AlertCircle className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" />
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">
            Map Not Available
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Unable to load map for this location
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

      {/* Map Image */}
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

      {/* Zoom controls */}
      {!hasError && !isLoading && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <button
            onClick={zoomIn}
            disabled={currentZoom >= MAX_ZOOM}
            className={cn(
              "p-2 rounded-t-md",
              "bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm",
              "text-slate-700 dark:text-slate-200",
              "border border-slate-200 dark:border-slate-700",
              "shadow-sm hover:bg-white dark:hover:bg-slate-900",
              "transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={zoomOut}
            disabled={currentZoom <= MIN_ZOOM}
            className={cn(
              "p-2 rounded-b-md",
              "bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm",
              "text-slate-700 dark:text-slate-200",
              "border border-slate-200 dark:border-slate-700 border-t-0",
              "shadow-sm hover:bg-white dark:hover:bg-slate-900",
              "transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
        </div>
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
            <MapPin className="h-3.5 w-3.5" />
            Open in Maps
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        </div>
      )}

      {/* Zoom level indicator */}
      {!isLoading && !hasError && (
        <div className="absolute bottom-3 left-3 z-10">
          <div
            className={cn(
              "px-2 py-1 text-xs font-mono",
              "bg-black/60 backdrop-blur-sm",
              "text-white/90 rounded"
            )}
          >
            Zoom: {currentZoom}
          </div>
        </div>
      )}
    </div>
  );
}

export default GoogleMapStatic;
