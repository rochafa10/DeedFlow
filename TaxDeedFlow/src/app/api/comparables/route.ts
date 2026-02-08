/**
 * Comparables API Route
 *
 * Fetches comparable properties from Realty in US API and applies
 * LFB 9-Step professional comp analysis (scoring, adjustments, ARV, MAO).
 *
 * Enhanced mode (`?mode=enhanced`) returns:
 * - Scored & graded comparables (A/B/C/D/F)
 * - ARV calculation
 * - MAO calculation (60-65% for tax deeds)
 * - Active listings count
 * - Calculated market metrics
 *
 * @route GET /api/comparables
 * @route POST /api/comparables
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRealtyService, ComparableSearchOptions, RealtyComparable } from '@/lib/api/services/realty-service';
import {
  calculateAllMarketMetrics,
  type CalculatedMarketMetrics,
  type MarketCalculationInput,
} from '@/lib/utils/market-calculations';
import {
  calculateMarketHistory,
  type MarketHistoryMetrics,
} from '@/lib/utils/market-history-calculations';
import {
  analyzeComparables,
  type SubjectProperty,
  type CompAnalysisResult,
} from '@/lib/utils/comp-analysis';
import { logger } from '@/lib/logger';

// Mark as dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

/**
 * Reverse geocode coordinates to get a postal code using OpenStreetMap Nominatim.
 */
async function reverseGeocodeToZip(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'TaxDeedFlow/1.0' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const postcode = data?.address?.postcode;
    if (postcode && /^\d{5}(-\d{4})?$/.test(postcode)) {
      return postcode.substring(0, 5);
    }
    return null;
  } catch (error) {
    logger.debug('[Comparables API] Reverse geocode failed:', {
      message: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}

/**
 * Helper to fetch active listings count with error handling
 */
async function fetchActiveListingsCount(
  realtyService: ReturnType<typeof getRealtyService>,
  options: { postal_code?: string; city?: string; state_code?: string; lat?: number; lng?: number }
): Promise<number | null> {
  try {
    const result = await realtyService.getActiveListingsCount(options);
    return result.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('[Comparables API] Failed to fetch active listings count:', { message });
    return null;
  }
}

/**
 * Parse subject property details from query params.
 */
function parseSubjectProperty(searchParams: URLSearchParams): SubjectProperty {
  return {
    building_sqft: searchParams.get('subject_sqft') ? parseInt(searchParams.get('subject_sqft')!) : undefined,
    lot_sqft: searchParams.get('subject_lot_sqft') ? parseInt(searchParams.get('subject_lot_sqft')!) : undefined,
    year_built: searchParams.get('subject_year_built') ? parseInt(searchParams.get('subject_year_built')!) : undefined,
    beds: searchParams.get('subject_beds') ? parseInt(searchParams.get('subject_beds')!) : undefined,
    baths: searchParams.get('subject_baths') ? parseFloat(searchParams.get('subject_baths')!) : undefined,
    property_type: searchParams.get('subject_type') || undefined,
    assessed_value: searchParams.get('subject_value') ? parseFloat(searchParams.get('subject_value')!) : undefined,
  };
}

/**
 * LFB-compliant tiered search strategy.
 *
 * Tier 1: 180 days, prop_type filter, sqft range (strict LFB)
 * Tier 2: 365 days, prop_type filter, no sqft filter
 * Tier 3: 730 days, no filters (rural fallback)
 *
 * Returns all raw comps found; scoring happens after via analyzeComparables().
 */
async function tieredSearch(
  realtyService: ReturnType<typeof getRealtyService>,
  resolvedPostalCode: string | undefined,
  parsedLat: number | undefined,
  parsedLng: number | undefined,
  radiusMiles: number,
  limit: number,
  subject: SubjectProperty,
): Promise<{
  comparables: RealtyComparable[];
  statistics: Record<string, number> | null;
  daysUsed: number;
  radiusUsed: number;
  filtersApplied: string[];
  cached: boolean;
}> {
  // Build search tiers per LFB guidelines
  const tiers: {
    days: number;
    propType?: string;
    sqftMin?: number;
    sqftMax?: number;
    label: string;
  }[] = [];

  // Tier 1: 180 days, strict filters
  const tier1: typeof tiers[0] = { days: 180, label: 'LFB strict (180d)' };
  if (subject.property_type) tier1.propType = subject.property_type;
  if (subject.building_sqft && subject.building_sqft > 0) {
    tier1.sqftMin = Math.max(0, subject.building_sqft - 500);
    tier1.sqftMax = subject.building_sqft + 500;
  }
  tiers.push(tier1);

  // Tier 2: 365 days, type filter only
  const tier2: typeof tiers[0] = { days: 365, label: 'LFB relaxed (365d)' };
  if (subject.property_type) tier2.propType = subject.property_type;
  tiers.push(tier2);

  // Tier 3: 730 days, no filters (fallback for rural)
  tiers.push({ days: 730, label: 'Rural fallback (730d)' });

  let bestResult: {
    comparables: RealtyComparable[];
    statistics: Record<string, number> | null;
    cached: boolean;
  } | null = null;
  let daysUsed = 730;
  let radiusUsed = radiusMiles;
  const filtersApplied: string[] = [];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];

    // Rate limit protection between API calls
    if (i > 0 && bestResult) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const options: Partial<ComparableSearchOptions> = {
      limit,
      sold_within_days: tier.days,
      prop_type: tier.propType || undefined,
      sqft_min: tier.sqftMin,
      sqft_max: tier.sqftMax,
    };

    let result;

    // Postal code search first (most reliable)
    if (resolvedPostalCode) {
      result = await realtyService.getSoldComparables({
        ...options,
        postal_code: resolvedPostalCode,
      });
    } else if (parsedLat && parsedLng) {
      result = await realtyService.getSoldComparables({
        ...options,
        lat: parsedLat,
        lng: parsedLng,
        radius_miles: radiusMiles,
      });
    }

    const count = result?.data?.comparables?.length || 0;
    logger.info(`[Comparables API] Tier "${tier.label}": ${count} results`);

    if (count >= 3) {
      daysUsed = tier.days;
      radiusUsed = radiusMiles;
      if (tier.propType) filtersApplied.push(`type:${tier.propType}`);
      if (tier.sqftMin) filtersApplied.push(`sqft:${tier.sqftMin}-${tier.sqftMax}`);
      filtersApplied.push(`days:${tier.days}`);

      return {
        comparables: result!.data?.comparables || [],
        statistics: result!.data?.statistics || null,
        daysUsed,
        radiusUsed,
        filtersApplied,
        cached: result!.cached || false,
      };
    }

    // Keep the best result so far (most comps)
    if (!bestResult || count > (bestResult.comparables?.length || 0)) {
      bestResult = {
        comparables: result?.data?.comparables || [],
        statistics: result?.data?.statistics || null,
        cached: result?.cached || false,
      };
      daysUsed = tier.days;
    }
  }

  // If postal code didn't work well, try coordinate fallback with wider radius
  if (parsedLat && parsedLng && (bestResult?.comparables?.length || 0) < 3) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const wideResult = await realtyService.getSoldComparables({
      lat: parsedLat,
      lng: parsedLng,
      radius_miles: 25,
      limit,
      sold_within_days: 730,
    });
    const wideCount = wideResult.data?.comparables?.length || 0;
    if (wideCount > (bestResult?.comparables?.length || 0)) {
      bestResult = {
        comparables: wideResult.data?.comparables || [],
        statistics: wideResult.data?.statistics || null,
        cached: wideResult.cached || false,
      };
      radiusUsed = 25;
      daysUsed = 730;
    }
  }

  filtersApplied.push(`days:${daysUsed}`, `radius:${radiusUsed}mi`);

  return {
    comparables: bestResult?.comparables || [],
    statistics: bestResult?.statistics || null,
    daysUsed,
    radiusUsed,
    filtersApplied,
    cached: bestResult?.cached || false,
  };
}

/**
 * GET /api/comparables
 *
 * Query params:
 * - lat, lng: coordinates
 * - postal_code: ZIP code
 * - radius_miles: search radius (default 5)
 * - limit: max results (default 25, max 50)
 * - prop_type: property type filter
 * - mode: 'standard' | 'enhanced' (default 'enhanced')
 * - subject_sqft, subject_lot_sqft, subject_beds, subject_baths,
 *   subject_year_built, subject_type, subject_value: subject property details
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const postalCode = searchParams.get('postal_code');
    const radiusMiles = parseFloat(searchParams.get('radius_miles') || '5');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 50);
    const mode = searchParams.get('mode') || 'enhanced';

    if (!postalCode && (!lat || !lng)) {
      return NextResponse.json(
        { error: 'Either postal_code or lat/lng coordinates are required' },
        { status: 400 }
      );
    }

    const realtyService = getRealtyService();
    const subject = parseSubjectProperty(searchParams);

    // Resolve postal code
    let resolvedPostalCode = postalCode || undefined;
    const parsedLat = lat ? parseFloat(lat) : undefined;
    const parsedLng = lng ? parseFloat(lng) : undefined;

    if (!resolvedPostalCode && parsedLat && parsedLng) {
      resolvedPostalCode = await reverseGeocodeToZip(parsedLat, parsedLng) || undefined;
      if (resolvedPostalCode) {
        logger.info(`[Comparables API] Resolved ZIP: ${resolvedPostalCode}`);
      }
    }

    // LFB tiered search
    const searchResult = await tieredSearch(
      realtyService,
      resolvedPostalCode,
      parsedLat,
      parsedLng,
      radiusMiles,
      limit,
      subject,
    );

    // Run LFB 9-step comp analysis
    const analysis = analyzeComparables(subject, searchResult.comparables, {
      daysUsed: searchResult.daysUsed,
      radiusUsed: searchResult.radiusUsed,
      filtersApplied: searchResult.filtersApplied,
    });

    if (mode === 'enhanced') {
      // Fetch active listings count
      const activeListingsCount = await fetchActiveListingsCount(realtyService, {
        postal_code: postalCode || undefined,
        lat: parsedLat,
        lng: parsedLng,
      });

      // Calculate market metrics from all comps
      const allComps = searchResult.comparables;
      const statistics = searchResult.statistics;
      let calculatedMetrics: CalculatedMarketMetrics | null = null;

      if (allComps.length >= 3 && statistics) {
        const input: MarketCalculationInput = {
          comparables: allComps,
          avgDaysOnMarket: (statistics as Record<string, number>).avg_days_on_market || 0,
          avgPricePerSqft: (statistics as Record<string, number>).avg_price_per_sqft || 0,
          activeListingsCount: activeListingsCount || undefined,
          soldCount: (statistics as Record<string, number>).count || allComps.length,
          monthsOfData: Math.ceil(searchResult.daysUsed / 30),
        };
        calculatedMetrics = calculateAllMarketMetrics(input);
      }

      // Historical metrics
      let historicalMetrics: MarketHistoryMetrics | null = null;
      if (allComps.length >= 5) {
        historicalMetrics = calculateMarketHistory(allComps);
      }

      // Data source type
      let dataSourceType: 'live' | 'partial' | 'sample' = 'sample';
      if (allComps.length > 0 && activeListingsCount !== null) {
        dataSourceType = 'live';
      } else if (allComps.length > 0) {
        dataSourceType = 'partial';
      }

      return NextResponse.json({
        success: true,
        data: {
          comparables: searchResult.comparables,
          statistics: statistics || {
            count: 0,
            avg_sold_price: 0,
            median_sold_price: 0,
            min_sold_price: 0,
            max_sold_price: 0,
            avg_price_per_sqft: 0,
            avg_days_on_market: 0,
          },
          activeListingsCount,
          calculatedMetrics,
          historicalMetrics,
          dataSourceType,
          // LFB Analysis
          analysis,
        },
        meta: {
          source: 'realty-in-us',
          mode: 'enhanced',
          cached: searchResult.cached,
          timestamp: new Date().toISOString(),
          search_days_used: searchResult.daysUsed,
          search_radius_used: searchResult.radiusUsed,
          filters_applied: searchResult.filtersApplied,
        },
      });
    }

    // Standard mode
    return NextResponse.json({
      success: true,
      data: {
        ...searchResult,
        analysis,
      },
      meta: {
        source: 'realty-in-us',
        mode: 'standard',
        cached: searchResult.cached,
        timestamp: new Date().toISOString(),
        search_days_used: searchResult.daysUsed,
        search_radius_used: searchResult.radiusUsed,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Comparables API] Error:', { message: errorMessage });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/comparables
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { lat, lng, postal_code } = body;

    if (!postal_code && (typeof lat !== 'number' || typeof lng !== 'number')) {
      return NextResponse.json(
        { error: 'Either postal_code or valid lat/lng coordinates are required' },
        { status: 400 }
      );
    }

    const realtyService = getRealtyService();

    if (lat && lng) {
      const options: ComparableSearchOptions = {
        lat,
        lng,
        radius_miles: body.radius_miles || 5,
        sold_within_days: body.sold_within_days || 730,
        limit: Math.min(body.limit || 25, 50),
        beds_min: body.beds_min,
        beds_max: body.beds_max,
        sqft_min: body.sqft_min,
        sqft_max: body.sqft_max,
        prop_type: body.prop_type,
      };

      const result = await realtyService.getSoldComparables(options);

      return NextResponse.json({
        success: true,
        data: result.data,
        meta: {
          source: 'realty-in-us',
          cached: result.cached || false,
          timestamp: new Date().toISOString(),
        },
      });
    } else if (postal_code) {
      const options: ComparableSearchOptions = {
        postal_code,
        limit: Math.min(body.limit || 25, 50),
        beds_min: body.beds_min,
        beds_max: body.beds_max,
        sqft_min: body.sqft_min,
        sqft_max: body.sqft_max,
        prop_type: body.prop_type,
      };

      const result = await realtyService.getSoldComparables(options);

      return NextResponse.json({
        success: true,
        data: result.data,
        meta: {
          source: 'realty-in-us',
          cached: result.cached || false,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Comparables API] POST Error:', { message: errorMessage });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
