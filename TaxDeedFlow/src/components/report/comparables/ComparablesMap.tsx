"use client";

/**
 * Comparables Map Component
 *
 * Displays a map visualization of the subject property and comparable sales,
 * with distance circles and color-coded markers based on similarity scores.
 * Uses SVG for rendering to avoid external map dependencies.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Home,
  Target,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Info,
} from "lucide-react";
import type {
  SubjectProperty,
  AnalyzedComparable,
} from "@/lib/analysis/comparables";

// ============================================
// Type Definitions
// ============================================

interface ComparablesMapProps {
  /** Subject property location */
  subject: SubjectProperty;
  /** Array of comparable properties */
  comparables: AnalyzedComparable[];
  /** Optional custom class name */
  className?: string;
  /** Map height in pixels */
  height?: number;
  /** Whether to show distance rings */
  showDistanceRings?: boolean;
  /** Distance ring intervals in miles */
  distanceIntervals?: number[];
  /** Callback when comparable is clicked */
  onComparableClick?: (comparable: AnalyzedComparable) => void;
  /** Whether to show legend */
  showLegend?: boolean;
}

interface MapPoint {
  x: number;
  y: number;
  comparable?: AnalyzedComparable;
  isSubject?: boolean;
}

// ============================================
// Constants
// ============================================

// SVG viewBox dimensions
const VIEW_SIZE = 500;
const PADDING = 50;
const EFFECTIVE_SIZE = VIEW_SIZE - PADDING * 2;

// Default distance rings (in miles)
const DEFAULT_DISTANCE_INTERVALS = [0.5, 1.0, 2.0, 3.0];

// ============================================
// Helper Functions
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getSimilarityColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green-500
  if (score >= 65) return "#10b981"; // emerald-500
  if (score >= 50) return "#eab308"; // yellow-500
  return "#ef4444"; // red-500
}

function getSimilarityColorClass(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 65) return "bg-emerald-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

/**
 * Convert lat/lng coordinates to SVG x/y coordinates
 * Uses simple equirectangular projection (good for small areas)
 */
function projectToSvg(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  scale: number
): { x: number; y: number } {
  // Adjust for latitude distortion
  const cosLat = Math.cos((centerLat * Math.PI) / 180);

  const x = (lng - centerLng) * cosLat * scale + VIEW_SIZE / 2;
  const y = (centerLat - lat) * scale + VIEW_SIZE / 2; // Inverted because SVG y increases downward

  return { x, y };
}

/**
 * Calculate scale to fit all points in view
 */
function calculateScale(
  points: Array<{ lat: number; lng: number }>,
  centerLat: number,
  centerLng: number
): number {
  if (points.length === 0) return 1;

  const cosLat = Math.cos((centerLat * Math.PI) / 180);
  let maxDist = 0;

  points.forEach((point) => {
    const dx = Math.abs(point.lng - centerLng) * cosLat;
    const dy = Math.abs(point.lat - centerLat);
    const dist = Math.max(dx, dy);
    maxDist = Math.max(maxDist, dist);
  });

  // Add some padding
  maxDist = Math.max(maxDist * 1.3, 0.01); // Minimum zoom

  return EFFECTIVE_SIZE / 2 / maxDist;
}

/**
 * Convert miles to SVG units at given scale and latitude
 */
function milesToSvgUnits(
  miles: number,
  scale: number,
  latitude: number
): number {
  // 1 degree latitude = ~69 miles
  const degreesPerMile = 1 / 69;
  return miles * degreesPerMile * scale;
}

// ============================================
// Sub-Components
// ============================================

/**
 * Map marker for a property
 */
function MapMarker({
  x,
  y,
  isSubject,
  comparable,
  isSelected,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  x: number;
  y: number;
  isSubject: boolean;
  comparable?: AnalyzedComparable;
  isSelected: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  const size = isSubject ? 16 : 12;
  const color = isSubject
    ? "#3b82f6" // blue-500
    : getSimilarityColor(comparable?.similarityScore || 0);

  return (
    <g
      className="cursor-pointer transition-transform hover:scale-110"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {/* Shadow */}
      <circle cx={x} cy={y + 2} r={size / 2 + 2} fill="rgba(0,0,0,0.2)" />

      {/* Marker */}
      {isSubject ? (
        // Subject marker (house shape)
        <>
          <circle
            cx={x}
            cy={y}
            r={size / 2 + 4}
            fill="white"
            stroke={color}
            strokeWidth={3}
          />
          <circle cx={x} cy={y} r={size / 2} fill={color} />
          <path
            d={`M ${x - 4} ${y} L ${x} ${y - 5} L ${x + 4} ${y} L ${x + 3} ${y + 4} L ${x - 3} ${y + 4} Z`}
            fill="white"
          />
        </>
      ) : (
        // Comparable marker
        <>
          <circle
            cx={x}
            cy={y}
            r={size / 2 + (isSelected ? 4 : 2)}
            fill="white"
            stroke={color}
            strokeWidth={isSelected ? 3 : 2}
          />
          <circle cx={x} cy={y} r={size / 2 - 1} fill={color} />
        </>
      )}

      {/* Excluded indicator */}
      {comparable && !comparable.includedInARV && (
        <line
          x1={x - 6}
          y1={y - 6}
          x2={x + 6}
          y2={y + 6}
          stroke="#94a3b8"
          strokeWidth={2}
        />
      )}
    </g>
  );
}

/**
 * Distance ring circle
 */
function DistanceRing({
  x,
  y,
  radius,
  miles,
}: {
  x: number;
  y: number;
  radius: number;
  miles: number;
}) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={1}
        strokeDasharray="4,4"
        opacity={0.5}
      />
      <text
        x={x + radius + 5}
        y={y}
        className="text-xs fill-slate-400"
        dominantBaseline="middle"
      >
        {miles} mi
      </text>
    </g>
  );
}

/**
 * Tooltip for hovered property
 */
function MapTooltip({
  x,
  y,
  comparable,
  isSubject,
}: {
  x: number;
  y: number;
  comparable?: AnalyzedComparable;
  isSubject: boolean;
}) {
  // Position tooltip above marker
  const tooltipX = Math.min(Math.max(x, 80), VIEW_SIZE - 80);
  const tooltipY = y - 20;

  if (isSubject) {
    return (
      <g className="pointer-events-none">
        <rect
          x={tooltipX - 50}
          y={tooltipY - 25}
          width={100}
          height={22}
          rx={4}
          fill="white"
          stroke="#e2e8f0"
          strokeWidth={1}
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
        />
        <text
          x={tooltipX}
          y={tooltipY - 11}
          textAnchor="middle"
          className="text-xs font-semibold fill-blue-600"
        >
          Subject Property
        </text>
      </g>
    );
  }

  if (!comparable) return null;

  const lines = [
    comparable.address || "Address N/A",
    formatCurrency(comparable.adjustmentResult?.adjustedPrice || comparable.salePrice),
    `${(comparable.similarityScore || 0).toFixed(0)}% match | ${(comparable.distanceMiles || 0).toFixed(2)} mi`,
  ];

  const maxWidth = 160;

  return (
    <g className="pointer-events-none">
      <rect
        x={tooltipX - maxWidth / 2}
        y={tooltipY - 60}
        width={maxWidth}
        height={55}
        rx={4}
        fill="white"
        stroke="#e2e8f0"
        strokeWidth={1}
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={tooltipX}
          y={tooltipY - 48 + i * 16}
          textAnchor="middle"
          className={cn(
            "text-xs",
            i === 0 ? "font-medium fill-slate-900" : "fill-slate-600"
          )}
        >
          {line.length > 25 ? line.substring(0, 25) + "..." : line}
        </text>
      ))}
    </g>
  );
}

// ============================================
// Main Component
// ============================================

export function ComparablesMap({
  subject,
  comparables,
  className,
  height = 400,
  showDistanceRings = true,
  distanceIntervals = DEFAULT_DISTANCE_INTERVALS,
  onComparableClick,
  showLegend = true,
}: ComparablesMapProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Calculate map projection
  const { mapPoints, scale, centerLat, centerLng } = useMemo(() => {
    const centerLat = subject.latitude;
    const centerLng = subject.longitude;

    // Get all points for scale calculation
    const allPoints = [
      { lat: subject.latitude, lng: subject.longitude },
      ...comparables.map((c) => ({ lat: c.latitude, lng: c.longitude })),
    ];

    const baseScale = calculateScale(allPoints, centerLat, centerLng);
    const scale = baseScale * zoomLevel;

    // Project all points
    const mapPoints: MapPoint[] = [];

    // Subject point
    const subjectPoint = projectToSvg(
      subject.latitude,
      subject.longitude,
      centerLat,
      centerLng,
      scale
    );
    mapPoints.push({ ...subjectPoint, isSubject: true });

    // Comparable points
    comparables.forEach((comp) => {
      const point = projectToSvg(
        comp.latitude,
        comp.longitude,
        centerLat,
        centerLng,
        scale
      );
      mapPoints.push({ ...point, comparable: comp });
    });

    return { mapPoints, scale, centerLat, centerLng };
  }, [subject, comparables, zoomLevel]);

  // Subject point is always first
  const subjectPoint = mapPoints[0];

  // Handle marker click
  const handleMarkerClick = (index: number) => {
    if (index === 0) {
      // Subject property clicked
      setSelectedIndex(null);
    } else {
      setSelectedIndex(selectedIndex === index ? null : index);
      const comparable = mapPoints[index].comparable;
      if (comparable && onComparableClick) {
        onComparableClick(comparable);
      }
    }
  };

  // Count included vs excluded
  const includedCount = comparables.filter((c) => c.includedInARV).length;
  const excludedCount = comparables.length - includedCount;

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200", className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100">
              <MapPin className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Comparable Locations
              </h3>
              <p className="text-sm text-slate-500">
                {includedCount} included, {excludedCount} excluded
              </p>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4 text-slate-600" />
            </button>
            <span className="text-sm text-slate-500 w-16 text-center">
              {(zoomLevel * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4 text-slate-600" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Reset zoom"
            >
              <Maximize2 className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Map SVG */}
      <div className="p-4">
        <svg
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          style={{ height, width: "100%" }}
          className="bg-slate-50 rounded-lg"
        >
          {/* Distance rings */}
          {showDistanceRings &&
            distanceIntervals.map((miles) => (
              <DistanceRing
                key={miles}
                x={subjectPoint.x}
                y={subjectPoint.y}
                radius={milesToSvgUnits(miles, scale, centerLat)}
                miles={miles}
              />
            ))}

          {/* Connection lines (optional - shows relationship) */}
          {mapPoints.slice(1).map((point, i) => (
            <line
              key={`line-${i}`}
              x1={subjectPoint.x}
              y1={subjectPoint.y}
              x2={point.x}
              y2={point.y}
              stroke={
                point.comparable?.includedInARV
                  ? getSimilarityColor(point.comparable?.similarityScore || 0)
                  : "#cbd5e1"
              }
              strokeWidth={1}
              opacity={0.3}
              strokeDasharray={point.comparable?.includedInARV ? "none" : "4,4"}
            />
          ))}

          {/* Comparable markers (render first so subject is on top) */}
          {mapPoints.slice(1).map((point, i) => (
            <MapMarker
              key={`marker-${i}`}
              x={point.x}
              y={point.y}
              isSubject={false}
              comparable={point.comparable}
              isSelected={selectedIndex === i + 1}
              onMouseEnter={() => setHoveredIndex(i + 1)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => handleMarkerClick(i + 1)}
            />
          ))}

          {/* Subject marker (always on top) */}
          <MapMarker
            x={subjectPoint.x}
            y={subjectPoint.y}
            isSubject={true}
            isSelected={false}
            onMouseEnter={() => setHoveredIndex(0)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => handleMarkerClick(0)}
          />

          {/* Tooltip for hovered point */}
          {hoveredIndex !== null && mapPoints[hoveredIndex] && (
            <MapTooltip
              x={mapPoints[hoveredIndex].x}
              y={mapPoints[hoveredIndex].y}
              comparable={mapPoints[hoveredIndex].comparable}
              isSubject={mapPoints[hoveredIndex].isSubject || false}
            />
          )}
        </svg>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
              <span>Subject Property</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>80%+ Match</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>65-79% Match</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>50-64% Match</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>&lt;50% Match</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-300 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-0.5 bg-slate-500 transform rotate-45" />
                </div>
              </div>
              <span>Excluded</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComparablesMap;
