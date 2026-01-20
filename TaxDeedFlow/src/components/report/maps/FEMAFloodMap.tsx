"use client";

/**
 * FEMA Flood Map Component
 *
 * Renders an embedded FEMA National Flood Hazard Layer (NFHL) map
 * showing flood zones for a property location. Uses FEMA's ArcGIS
 * web app viewer for reliable, authoritative flood data.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-17
 */

import { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Droplets,
  ExternalLink,
  AlertCircle,
  MapPin,
  Info,
} from "lucide-react";

// ============================================
// Type Definitions
// ============================================

export interface FEMAFloodMapProps {
  /** Latitude coordinate of the property */
  lat?: number;
  /** Longitude coordinate of the property */
  lng?: number;
  /** Property address for display and fallback search */
  address?: string;
  /** Zoom level for the map (default 14 for neighborhood context) */
  zoom?: number;
  /** Optional custom class name for the container */
  className?: string;
  /** Height of the map container (default: "400px") */
  height?: string;
  /** Whether to show the "Open in FEMA MSC" link */
  showExternalLink?: boolean;
  /** Whether to show the flood zone legend */
  showLegend?: boolean;
  /** Alt text for accessibility */
  altText?: string;
  /** Callback when external link is clicked (for analytics tracking) */
  onLinkClick?: () => void;
}

// ============================================
// Constants
// ============================================

/** Default zoom level for flood zone viewing (neighborhood context) */
const DEFAULT_ZOOM = 14;

/** Default map height */
const DEFAULT_HEIGHT = "400px";

/** FEMA NFHL Web App ID */
const FEMA_NFHL_APP_ID = "8b0adb51996444d4879338b5529aa9cd";

/** FEMA Map Service Center base URL */
const FEMA_MSC_BASE_URL = "https://msc.fema.gov/portal/search";

/** Minimum valid latitude range */
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;

/** Minimum valid longitude range */
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;

/**
 * Flood zone legend data
 * Based on FEMA's official flood zone designations
 */
const FLOOD_ZONE_LEGEND = [
  {
    zone: "A, AE, AH, AO",
    color: "#1e3a8a",
    description: "High Risk (100-year flood)",
  },
  {
    zone: "V, VE",
    color: "#7c3aed",
    description: "High Risk - Coastal (wave action)",
  },
  {
    zone: "X (shaded)",
    color: "#fbbf24",
    description: "Moderate Risk (500-year flood)",
  },
  {
    zone: "X (unshaded)",
    color: "#22c55e",
    description: "Minimal Risk",
  },
  {
    zone: "D",
    color: "#9ca3af",
    description: "Undetermined Risk",
  },
] as const;

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
 * Calculates the map extent from center coordinates and zoom level
 * Returns extent in Web Mercator (EPSG:3857) coordinates
 *
 * @param lat - Center latitude
 * @param lng - Center longitude
 * @param zoom - Zoom level (affects extent size)
 * @returns Object with xmin, ymin, xmax, ymax in Web Mercator
 */
function calculateExtent(
  lat: number,
  lng: number,
  zoom: number
): { xmin: number; ymin: number; xmax: number; ymax: number } {
  // Calculate approximate extent in degrees based on zoom
  // Higher zoom = smaller extent
  const degreesPerPixel = 360 / Math.pow(2, zoom + 8);
  const viewportWidth = 800; // Approximate viewport width in pixels
  const viewportHeight = 600; // Approximate viewport height in pixels

  const deltaLng = (degreesPerPixel * viewportWidth) / 2;
  const deltaLat = (degreesPerPixel * viewportHeight) / 2;

  // Geographic extent
  const minLng = lng - deltaLng;
  const maxLng = lng + deltaLng;
  const minLat = lat - deltaLat;
  const maxLat = lat + deltaLat;

  // Convert to Web Mercator (EPSG:3857)
  const xmin = minLng * 20037508.34 / 180;
  const xmax = maxLng * 20037508.34 / 180;

  // Mercator Y calculation with latitude clamping
  const clampedMinLat = Math.max(-85, Math.min(85, minLat));
  const clampedMaxLat = Math.max(-85, Math.min(85, maxLat));

  const ymin =
    Math.log(Math.tan(((90 + clampedMinLat) * Math.PI) / 360)) /
    (Math.PI / 180) *
    20037508.34 /
    180;
  const ymax =
    Math.log(Math.tan(((90 + clampedMaxLat) * Math.PI) / 360)) /
    (Math.PI / 180) *
    20037508.34 /
    180;

  return { xmin, ymin, xmax, ymax };
}

/**
 * Generates the FEMA NFHL embed URL
 * Uses the ArcGIS web app viewer with the National Flood Hazard Layer
 */
function generateEmbedUrl(lat: number, lng: number, zoom: number): string {
  const extent = calculateExtent(lat, lng, zoom);

  // Format extent values with appropriate precision
  const extentStr = `${extent.xmin.toFixed(4)},${extent.ymin.toFixed(4)},${extent.xmax.toFixed(4)},${extent.ymax.toFixed(4)}`;

  // FEMA NFHL ArcGIS Web App URL
  return `https://hazards-fema.maps.arcgis.com/apps/webappviewer/index.html?id=${FEMA_NFHL_APP_ID}&extent=${extentStr}`;
}

/**
 * Generates a direct link to FEMA Map Service Center
 * This allows users to search by address and get official flood determinations
 */
function generateFEMAMSCLink(address?: string, lat?: number, lng?: number): string {
  if (address) {
    // Use address search
    return `${FEMA_MSC_BASE_URL}?AddressQuery=${encodeURIComponent(address)}`;
  } else if (lat !== undefined && lng !== undefined) {
    // Use coordinate search
    return `${FEMA_MSC_BASE_URL}?lat=${lat}&lng=${lng}`;
  }
  // Fallback to main search page
  return FEMA_MSC_BASE_URL;
}

/**
 * Generates a direct link to the FEMA NFHL viewer (not embedded)
 */
function generateNFHLDirectLink(lat: number, lng: number, zoom: number): string {
  const extent = calculateExtent(lat, lng, zoom);
  const extentStr = `${extent.xmin.toFixed(4)},${extent.ymin.toFixed(4)},${extent.xmax.toFixed(4)},${extent.ymax.toFixed(4)}`;
  return `https://hazards-fema.maps.arcgis.com/apps/webappviewer/index.html?id=${FEMA_NFHL_APP_ID}&extent=${extentStr}`;
}

// ============================================
// Sub-Components
// ============================================

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
  const handleClick = useCallback(() => {
    onLinkClick?.();
  }, [onLinkClick]);

  const mscLink = generateFEMAMSCLink(address);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 text-center p-4">
      <AlertCircle className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" />
      <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">
        Coordinates Not Available
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Property location data is missing for flood zone lookup
      </p>
      {address ? (
        <a
          href={mscLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          <MapPin className="h-4 w-4" />
          Search FEMA by Address
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <a
          href={FEMA_MSC_BASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          <Droplets className="h-4 w-4" />
          Open FEMA Map Service Center
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

/**
 * Flood zone legend component
 */
function FloodZoneLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute top-3 left-3 z-10",
        "bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm",
        "border border-slate-200 dark:border-slate-700",
        "rounded-lg shadow-sm p-2",
        "max-w-[200px]",
        className
      )}
    >
      <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-slate-200 dark:border-slate-700">
        <Info className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Flood Zones
        </span>
      </div>
      <div className="space-y-1">
        {FLOOD_ZONE_LEGEND.map((item) => (
          <div key={item.zone} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 block truncate">
                {item.zone}
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-500 block truncate">
                {item.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function FEMAFloodMap({
  lat,
  lng,
  address,
  zoom = DEFAULT_ZOOM,
  className,
  height = DEFAULT_HEIGHT,
  showExternalLink = true,
  showLegend = true,
  altText = "FEMA National Flood Hazard Layer map showing flood zones",
  onLinkClick,
}: FEMAFloodMapProps) {
  // Validate coordinates
  const hasValidCoordinates = areCoordinatesValid(lat, lng);

  const directLink = useMemo(() => {
    if (hasValidCoordinates) {
      return generateNFHLDirectLink(lat!, lng!, zoom);
    }
    return generateFEMAMSCLink(address);
  }, [hasValidCoordinates, lat, lng, zoom, address]);

  const mscLink = useMemo(() => {
    return generateFEMAMSCLink(address, lat, lng);
  }, [address, lat, lng]);

  // Handle external link click
  const handleLinkClick = useCallback(() => {
    onLinkClick?.();
  }, [onLinkClick]);

  // Generate static map preview URL using Google Static Maps API (free tier)
  const staticMapUrl = useMemo(() => {
    if (!hasValidCoordinates) return null;
    // Use a simple placeholder/preview - the actual flood data requires the interactive FEMA viewer
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=800x400&maptype=terrain&markers=color:blue%7C${lat},${lng}&key=`;
  }, [hasValidCoordinates, lat, lng, zoom]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800",
        className
      )}
      style={{ height }}
    >
      {hasValidCoordinates ? (
        <>
          {/* Static preview with flood zone legend */}
          <div className="absolute inset-0 flex flex-col">
            {/* Map preview area with gradient overlay */}
            <div className="flex-1 relative bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
              {/* Stylized map preview */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 mb-4">
                    <Droplets className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    FEMA Flood Zone Lookup
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md">
                    Click below to view the official FEMA National Flood Hazard Layer map for this property location.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                      href={directLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleLinkClick}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 px-5 py-2.5",
                        "text-sm font-medium",
                        "bg-blue-600 hover:bg-blue-700",
                        "text-white",
                        "rounded-lg shadow-sm",
                        "transition-colors"
                      )}
                    >
                      <Droplets className="h-4 w-4" />
                      Open FEMA Flood Map
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={mscLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleLinkClick}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 px-5 py-2.5",
                        "text-sm font-medium",
                        "bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600",
                        "text-slate-700 dark:text-slate-200",
                        "border border-slate-300 dark:border-slate-600",
                        "rounded-lg shadow-sm",
                        "transition-colors"
                      )}
                    >
                      <Info className="h-4 w-4" />
                      FEMA Map Service Center
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Flood zone legend */}
          {showLegend && <FloodZoneLegend />}

          {/* Coordinates display */}
          <div className="absolute bottom-3 left-3 z-10">
            <div
              className={cn(
                "px-2 py-1 text-[10px]",
                "bg-black/50 backdrop-blur-sm",
                "text-white/80 rounded"
              )}
            >
              {lat?.toFixed(4)}, {lng?.toFixed(4)}
            </div>
          </div>
        </>
      ) : (
        <CoordinatesNotAvailable address={address} onLinkClick={handleLinkClick} />
      )}
    </div>
  );
}

export default FEMAFloodMap;
