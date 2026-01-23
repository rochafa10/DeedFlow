/**
 * Report Data Transformation Utilities
 *
 * Transforms raw API responses into structured data for report components.
 * Handles conversions between different comparable formats, API response mapping,
 * and data normalization for consistent rendering across report sections.
 *
 * @module lib/utils/report-data-transformation
 */

import type { RealtyComparable } from '../api/services/realty-service';
import type { ComparableProperty } from '@/components/report/sections/ComparablesSection';
import type { LandSubject, LandComparable } from '../analysis/comparables/landComparablesFilter';

/**
 * Raw API comparable structure (from Realty API)
 */
export interface RawApiComparable {
  property_id: string;
  address: {
    line: string;
    city: string;
    state_code: string;
    postal_code?: string;
    lat?: number;
    lon?: number;
  };
  price: {
    sold_price?: number;
    list_price?: number;
    price_per_sqft?: number;
  };
  description: {
    beds?: number;
    baths?: number;
    sqft?: number;
    lot_sqft?: number;
    year_built?: number;
    type?: string;
  };
  sold_date?: string;
  days_on_market?: number;
  distance_miles?: number;
  photos?: string[];
}

/**
 * Land filter statistics for reporting
 */
export interface LandFilterStats {
  medianPricePerSqft?: number;
  outlierCount?: number;
  minLotAcres?: number;
  maxLotAcres?: number;
  filterLabel?: string;
}

/**
 * Result of land comparable filtering
 */
export interface LandComparableFilterResult {
  comparables: ComparableProperty[];
  stats: LandFilterStats;
}

/**
 * Transform raw API comparable to ComparableProperty format
 *
 * Converts the raw Realty API response format into the standardized
 * ComparableProperty interface used throughout the application.
 *
 * @param comp - Raw API comparable data
 * @param index - Index for generating fallback IDs
 * @returns Transformed comparable property
 *
 * @example
 * ```typescript
 * const rawComps = await fetchComparables(coordinates);
 * const transformed = rawComps.map((comp, i) =>
 *   transformRawApiComparable(comp, i)
 * );
 * ```
 */
export function transformRawApiComparable(
  comp: RawApiComparable,
  index: number
): ComparableProperty {
  // Parse sale date safely
  let saleDate: Date;
  try {
    saleDate = comp.sold_date ? new Date(comp.sold_date) : new Date();
    if (isNaN(saleDate.getTime())) {
      saleDate = new Date();
    }
  } catch {
    saleDate = new Date();
  }

  // Calculate price per sqft if not provided
  let pricePerSqft = comp.price.price_per_sqft;
  if (!pricePerSqft && comp.price.sold_price && comp.description.sqft && comp.description.sqft > 0) {
    pricePerSqft = comp.price.sold_price / comp.description.sqft;
  }

  // Convert lot sqft to acres (1 acre = 43560 sqft)
  const lotSizeAcres = comp.description.lot_sqft
    ? comp.description.lot_sqft / 43560
    : undefined;

  return {
    id: comp.property_id || `comp-${index}`,
    address: comp.address.line || 'Unknown Address',
    city: comp.address.city,
    latitude: comp.address.lat,
    longitude: comp.address.lon,
    salePrice: comp.price.sold_price || comp.price.list_price || 0,
    saleDate,
    sqft: comp.description.sqft,
    lotSizeAcres,
    bedrooms: comp.description.beds,
    bathrooms: comp.description.baths,
    yearBuilt: comp.description.year_built,
    propertyType: comp.description.type,
    pricePerSqft,
    distance: comp.distance_miles || 0,
    similarityScore: calculateComparableSimilarity(comp),
    daysOnMarket: comp.days_on_market,
  };
}

/**
 * Transform multiple raw API comparables
 *
 * Batch transformation of raw API comparables to ComparableProperty format.
 *
 * @param comparables - Array of raw API comparables
 * @returns Array of transformed comparables
 */
export function transformRawApiComparables(
  comparables: RawApiComparable[]
): ComparableProperty[] {
  return comparables.map((comp, index) => transformRawApiComparable(comp, index));
}

/**
 * Calculate similarity score for a raw API comparable
 *
 * Assigns a score (0-100) based on data completeness and recency.
 * Higher scores indicate more reliable comparables.
 *
 * Scoring factors:
 * - Data completeness (sold price, sqft, beds, sale date)
 * - Distance from subject property
 * - Recency of sale
 *
 * @param comp - Raw API comparable
 * @returns Similarity score (0-100)
 */
function calculateComparableSimilarity(comp: RawApiComparable): number {
  let score = 100;

  // Penalize for missing critical data
  if (!comp.price.sold_price && !comp.price.list_price) score -= 30;
  if (!comp.description.sqft) score -= 15;
  if (!comp.description.beds) score -= 10;
  if (!comp.sold_date) score -= 15;

  // Penalize for distance (if available)
  if (comp.distance_miles !== undefined) {
    if (comp.distance_miles > 2) score -= 15;
    else if (comp.distance_miles > 1) score -= 10;
    else if (comp.distance_miles > 0.5) score -= 5;
  }

  // Penalize for old sales
  if (comp.sold_date) {
    try {
      const saleDate = new Date(comp.sold_date);
      const monthsAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo > 12) score -= 15;
      else if (monthsAgo > 9) score -= 10;
      else if (monthsAgo > 6) score -= 5;
    } catch {
      // Invalid date, already penalized above
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Convert ComparableProperty to LandComparable format
 *
 * Transforms a standard comparable property into the specialized
 * LandComparable format used for vacant land analysis.
 *
 * @param comp - Comparable property to convert
 * @returns Land comparable or null if missing required data
 *
 * @example
 * ```typescript
 * const landComps = standardComps
 *   .map(convertToLandComparable)
 *   .filter((c): c is LandComparable => c !== null);
 * ```
 */
export function convertToLandComparable(
  comp: ComparableProperty
): LandComparable | null {
  // Require valid coordinates and sale price
  if (
    comp.latitude === undefined ||
    comp.longitude === undefined ||
    !comp.salePrice ||
    comp.salePrice <= 0
  ) {
    return null;
  }

  // Convert acres to sqft if needed
  const lotSizeSqft = comp.lotSizeAcres
    ? comp.lotSizeAcres * 43560
    : undefined;

  // Convert Date to ISO string
  const saleDate = comp.saleDate instanceof Date
    ? comp.saleDate.toISOString()
    : String(comp.saleDate);

  return {
    latitude: comp.latitude,
    longitude: comp.longitude,
    salePrice: comp.salePrice,
    saleDate,
    address: comp.address,
    lotSizeSqft,
    sqft: comp.sqft,
    propertyType: comp.propertyType,
    bedrooms: comp.bedrooms,
    bathrooms: comp.bathrooms,
    distanceMiles: comp.distance,
  };
}

/**
 * Convert LandComparable back to ComparableProperty format
 *
 * Reverse transformation from LandComparable to ComparableProperty,
 * preserving similarity scores from filtering.
 *
 * @param landComp - Land comparable to convert
 * @param originalComp - Optional original comparable for additional data
 * @param index - Index for generating fallback IDs
 * @returns Comparable property
 */
export function convertLandComparableToProperty(
  landComp: LandComparable,
  originalComp?: ComparableProperty,
  index: number = 0
): ComparableProperty {
  // Parse sale date safely
  let saleDate: Date;
  try {
    saleDate = landComp.saleDate ? new Date(landComp.saleDate) : new Date();
    if (isNaN(saleDate.getTime())) saleDate = new Date();
  } catch {
    saleDate = new Date();
  }

  // Convert lot sqft to acres
  const lotSizeAcres = landComp.lotSizeSqft
    ? landComp.lotSizeSqft / 43560
    : undefined;

  // Calculate price per sqft if we have lot size
  const pricePerSqft = landComp.lotSizeSqft && landComp.lotSizeSqft > 0
    ? landComp.salePrice / landComp.lotSizeSqft
    : 0;

  return {
    // Use original comp data if available, otherwise construct from land comp
    ...(originalComp || {}),
    id: landComp.address || `land-comp-${index}`,
    address: landComp.address || 'Unknown',
    latitude: landComp.latitude,
    longitude: landComp.longitude,
    salePrice: landComp.salePrice,
    saleDate,
    sqft: landComp.sqft || 0,
    lotSizeAcres,
    bedrooms: landComp.bedrooms || 0,
    bathrooms: landComp.bathrooms || 0,
    propertyType: landComp.propertyType || 'Land',
    pricePerSqft,
    distance: landComp.distanceMiles || 0,
    similarityScore: originalComp?.similarityScore || 75, // Default if not from original
  };
}

/**
 * Create land subject property from property details
 *
 * Constructs a LandSubject object from various property data sources.
 *
 * @param coordinates - Property coordinates
 * @param lotSizeAcres - Lot size in acres
 * @param propertyType - Property type/classification
 * @returns Land subject for comparison
 */
export function createLandSubject(
  coordinates: { lat: number; lng: number } | null | undefined,
  lotSizeAcres: number | string | undefined,
  propertyType?: string
): LandSubject {
  // Parse lot size
  let lotAcres = 0;
  if (typeof lotSizeAcres === 'number') {
    lotAcres = lotSizeAcres;
  } else if (typeof lotSizeAcres === 'string') {
    const parsed = parseFloat(lotSizeAcres.replace(/[^\d.]/g, ''));
    lotAcres = isNaN(parsed) ? 0 : parsed;
  }

  const lotSizeSqft = lotAcres > 0 ? lotAcres * 43560 : 5000; // Default to ~0.11 acres

  return {
    latitude: coordinates?.lat || 0,
    longitude: coordinates?.lng || 0,
    lotSizeSqft,
    propertyType: propertyType || 'land',
  };
}

/**
 * Filter land comparables with progressive widening
 *
 * Applies filtering criteria for land comparables with automatic
 * criteria widening if insufficient comparables are found.
 *
 * Filter levels:
 * 1. ±50% lot size, last 2 years
 * 2. ±75-100% lot size, last 2 years (if < 2 comps)
 * 3. ±90-200% lot size, last 2 years (if < 2 comps)
 *
 * @param comparables - Array of comparable properties
 * @param subjectLotSizeSqft - Subject property lot size in sqft
 * @returns Filtered comparables with statistics
 */
export function filterLandComparables(
  comparables: ComparableProperty[],
  subjectLotSizeSqft: number
): LandComparableFilterResult {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  let minLotSize = subjectLotSizeSqft * 0.5; // -50%
  let maxLotSize = subjectLotSizeSqft * 1.5; // +50%
  let filterLabel = '±50%';

  // Convert to land comparables and apply initial filter
  let landComps: LandComparable[] = comparables
    .map(convertToLandComparable)
    .filter((c): c is LandComparable => c !== null)
    .filter(comp => {
      const compLotSqft = comp.lotSizeSqft || 0;
      if (compLotSqft === 0) return false;
      if (compLotSqft < minLotSize || compLotSqft > maxLotSize) return false;

      // Check recency
      if (comp.saleDate) {
        try {
          const saleDate = new Date(comp.saleDate);
          if (saleDate < twoYearsAgo) return false;
        } catch {
          // Invalid date, skip this comp
          return false;
        }
      }

      return true;
    });

  // Widen criteria if we have < 2 comps
  if (landComps.length < 2) {
    minLotSize = subjectLotSizeSqft * 0.25; // -75%
    maxLotSize = subjectLotSizeSqft * 2.0;  // +100%
    filterLabel = '±75-100%';

    landComps = comparables
      .map(convertToLandComparable)
      .filter((c): c is LandComparable => c !== null)
      .filter(comp => {
        const compLotSqft = comp.lotSizeSqft || 0;
        if (compLotSqft === 0) return false;
        if (compLotSqft < minLotSize || compLotSqft > maxLotSize) return false;

        if (comp.saleDate) {
          try {
            const saleDate = new Date(comp.saleDate);
            if (saleDate < twoYearsAgo) return false;
          } catch {
            return false;
          }
        }

        return true;
      });
  }

  // Last resort: widen to ±200%
  if (landComps.length < 2) {
    minLotSize = subjectLotSizeSqft * 0.1;  // -90%
    maxLotSize = subjectLotSizeSqft * 3.0;  // +200%
    filterLabel = '±90-200%';

    landComps = comparables
      .map(convertToLandComparable)
      .filter((c): c is LandComparable => c !== null)
      .filter(comp => {
        const compLotSqft = comp.lotSizeSqft || 0;
        if (compLotSqft === 0) return false;
        if (compLotSqft < minLotSize || compLotSqft > maxLotSize) return false;

        if (comp.saleDate) {
          try {
            const saleDate = new Date(comp.saleDate);
            if (saleDate < twoYearsAgo) return false;
          } catch {
            return false;
          }
        }

        return true;
      });
  }

  // Calculate statistics
  const pricesPerSqft = landComps
    .map(c => c.lotSizeSqft && c.lotSizeSqft > 0 ? c.salePrice / c.lotSizeSqft : 0)
    .filter(p => p > 0)
    .sort((a, b) => a - b);

  const medianPricePerSqft = pricesPerSqft.length > 0
    ? pricesPerSqft[Math.floor(pricesPerSqft.length / 2)]
    : undefined;

  const lotAcres = landComps
    .map(c => c.lotSizeSqft ? c.lotSizeSqft / 43560 : 0)
    .filter(a => a > 0);

  const minLotAcres = lotAcres.length > 0 ? Math.min(...lotAcres) : undefined;
  const maxLotAcres = lotAcres.length > 0 ? Math.max(...lotAcres) : undefined;

  // Convert back to ComparableProperty format
  const filteredComparables = landComps.map((landComp, idx) => {
    // Find original comparable by address match
    const originalComp = comparables.find(c => c.address === landComp.address);
    return convertLandComparableToProperty(landComp, originalComp, idx);
  });

  const stats: LandFilterStats = {
    medianPricePerSqft,
    outlierCount: comparables.length - filteredComparables.length,
    minLotAcres,
    maxLotAcres,
    filterLabel,
  };

  return {
    comparables: filteredComparables,
    stats,
  };
}

/**
 * Determine if property is vacant land
 *
 * Checks property characteristics to determine if it should be
 * treated as vacant land for comparison purposes.
 *
 * @param propertyType - Property type/classification
 * @param buildingSqft - Building square footage
 * @returns True if property should be treated as vacant land
 */
export function isVacantLand(
  propertyType?: string,
  buildingSqft?: number
): boolean {
  if (!propertyType) return false;

  const type = propertyType.toLowerCase();
  const isLandType =
    type.includes('land') ||
    type.includes('vacant') ||
    type.includes('lot');

  const hasNoBuilding = !buildingSqft || buildingSqft === 0;

  return isLandType || hasNoBuilding;
}

/**
 * Convert ComparableProperty to RealtyComparable format
 *
 * Transforms UI-friendly ComparableProperty back to the API format
 * needed for calculations that expect RealtyComparable input.
 *
 * @param comp - Comparable property to convert
 * @returns Realty comparable format
 */
export function convertToRealtyComparable(
  comp: ComparableProperty
): RealtyComparable {
  return {
    property_id: comp.id,
    address: {
      line: comp.address,
      city: comp.city || '',
      state_code: '', // Not available in ComparableProperty
      postal_code: '', // Not available in ComparableProperty
      lat: comp.latitude,
      lon: comp.longitude,
    },
    price: {
      sold_price: comp.salePrice || undefined,
      list_price: comp.salePrice || undefined,
      price_per_sqft: comp.pricePerSqft || undefined,
    },
    description: {
      beds: comp.bedrooms || undefined,
      baths: comp.bathrooms || undefined,
      sqft: comp.sqft || undefined,
      lot_sqft: comp.lotSizeAcres ? comp.lotSizeAcres * 43560 : undefined,
      year_built: comp.yearBuilt || undefined,
      type: comp.propertyType || undefined,
    },
    sold_date: comp.saleDate instanceof Date
      ? comp.saleDate.toISOString()
      : String(comp.saleDate),
    distance_miles: comp.distance || undefined,
    days_on_market: comp.daysOnMarket,
    source: 'transformed',
  };
}

/**
 * Parse lot size from various formats
 *
 * Handles lot size input in multiple formats:
 * - Number (acres)
 * - String with units ("1.5 acres", "0.5ac", etc.)
 * - String number ("1.5")
 *
 * @param lotSize - Lot size in various formats
 * @returns Lot size in acres, or 0 if unparseable
 */
export function parseLotSizeAcres(
  lotSize: number | string | undefined
): number {
  if (typeof lotSize === 'number') {
    return lotSize;
  }

  if (typeof lotSize === 'string') {
    // Remove common units and non-numeric characters except decimal point
    const cleaned = lotSize.toLowerCase().replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

/**
 * Format lot size for display
 *
 * Formats lot size with appropriate precision and units.
 *
 * @param acres - Lot size in acres
 * @param includeUnits - Whether to include " acres" suffix
 * @returns Formatted lot size string
 */
export function formatLotSize(
  acres: number | undefined,
  includeUnits: boolean = true
): string {
  if (acres === undefined || acres === 0) {
    return includeUnits ? '0 acres' : '0';
  }

  // Use 2 decimal places for small lots, 1 for larger
  const formatted = acres < 1
    ? acres.toFixed(2)
    : acres.toFixed(1);

  return includeUnits ? `${formatted} acres` : formatted;
}

/**
 * Calculate median value from array
 *
 * @param values - Array of numbers
 * @returns Median value, or 0 if empty array
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

/**
 * Calculate average value from array
 *
 * @param values - Array of numbers
 * @returns Average value, or 0 if empty array
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}
