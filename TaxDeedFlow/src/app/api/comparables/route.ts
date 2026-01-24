/**
 * Comparables API Route
 *
 * Fetches comparable properties from Realty in US API.
 * Supports search by coordinates or postal code.
 *
 * Enhanced mode (`?mode=enhanced`) returns:
 * - Sold comparables
 * - Active listings count
 * - Calculated market metrics (list-to-sale ratio, market health, etc.)
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
import { logger } from '@/lib/logger';

// Mark as dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

/**
 * Enhanced market data response type
 */
interface EnhancedMarketData {
  comparables: RealtyComparable[];
  statistics: {
    count: number;
    avg_sold_price: number;
    median_sold_price: number;
    min_sold_price: number;
    max_sold_price: number;
    avg_price_per_sqft: number;
    avg_days_on_market: number;
  };
  activeListingsCount: number | null;
  calculatedMetrics: CalculatedMarketMetrics | null;
  historicalMetrics: MarketHistoryMetrics | null;
  dataSourceType: 'live' | 'partial' | 'sample';
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
    logger.warn('[Comparables API] Failed to fetch active listings count:', error);
    return null;
  }
}

/**
 * GET /api/comparables
 *
 * Query params:
 * - lat: latitude (required if no postal_code)
 * - lng: longitude (required if no postal_code)
 * - postal_code: ZIP code (required if no lat/lng)
 * - radius_miles: search radius (default 1)
 * - limit: max results (default 10, max 50)
 * - status: 'sold' | 'for_sale' (default 'sold')
 * - beds_min, beds_max: bedroom filters
 * - sqft_min, sqft_max: square footage filters
 * - prop_type: 'single_family' | 'condo' | 'townhome' | 'multi_family' | 'land'
 * - mode: 'standard' | 'enhanced' (default 'standard')
 *         Enhanced mode includes active listings count and calculated market metrics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse coordinates
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const postalCode = searchParams.get('postal_code');
    const radiusMiles = parseFloat(searchParams.get('radius_miles') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const status = searchParams.get('status') || 'sold';
    const propType = searchParams.get('prop_type');
    const mode = searchParams.get('mode') || 'standard';

    // Validate input
    if (!postalCode && (!lat || !lng)) {
      return NextResponse.json(
        { error: 'Either postal_code or lat/lng coordinates are required' },
        { status: 400 }
      );
    }

    const realtyService = getRealtyService();

    // Build search options
    const options: ComparableSearchOptions = {
      postal_code: postalCode || undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radius_miles: radiusMiles,
      limit,
      beds_min: searchParams.get('beds_min') ? parseInt(searchParams.get('beds_min')!) : undefined,
      beds_max: searchParams.get('beds_max') ? parseInt(searchParams.get('beds_max')!) : undefined,
      sqft_min: searchParams.get('sqft_min') ? parseInt(searchParams.get('sqft_min')!) : undefined,
      sqft_max: searchParams.get('sqft_max') ? parseInt(searchParams.get('sqft_max')!) : undefined,
      prop_type: propType || undefined,
    };

    const result = await realtyService.getSoldComparables(options);

    // Enhanced mode: include active listings and calculated metrics
    if (mode === 'enhanced') {
      // Fetch active listings count in parallel
      const activeListingsCount = await fetchActiveListingsCount(realtyService, {
        postal_code: postalCode || undefined,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
      });

      // Calculate market metrics
      let calculatedMetrics: CalculatedMarketMetrics | null = null;
      const comparables = result.data?.comparables || [];
      const statistics = result.data?.statistics;

      if (comparables.length >= 3 && statistics) {
        const input: MarketCalculationInput = {
          comparables,
          avgDaysOnMarket: statistics.avg_days_on_market,
          avgPricePerSqft: statistics.avg_price_per_sqft,
          activeListingsCount: activeListingsCount || undefined,
          soldCount: statistics.count,
          monthsOfData: 6, // Default assumption
        };
        calculatedMetrics = calculateAllMarketMetrics(input);
      }

      // Calculate historical metrics (YoY changes) if we have enough data
      let historicalMetrics: MarketHistoryMetrics | null = null;
      if (comparables.length >= 5) {
        // Try to fetch extended historical data for YoY calculations
        try {
          const extendedOptions: ComparableSearchOptions = {
            postal_code: postalCode || undefined,
            lat: lat ? parseFloat(lat) : undefined,
            lng: lng ? parseFloat(lng) : undefined,
            radius_miles: radiusMiles,
            limit: 100, // Get more for historical analysis
            sold_within_days: 365, // 12 months of data
            beds_min: searchParams.get('beds_min') ? parseInt(searchParams.get('beds_min')!) : undefined,
            beds_max: searchParams.get('beds_max') ? parseInt(searchParams.get('beds_max')!) : undefined,
            prop_type: propType || undefined,
          };

          const extendedResult = await realtyService.getSoldComparables(extendedOptions);
          const extendedComps = extendedResult.data?.comparables || [];

          if (extendedComps.length >= 10) {
            historicalMetrics = calculateMarketHistory(extendedComps);
          } else {
            // Use whatever data we have
            historicalMetrics = calculateMarketHistory(comparables);
          }
        } catch (error) {
          logger.warn('[Comparables API] Failed to fetch extended historical data:', error);
          // Fall back to using current comparables
          historicalMetrics = calculateMarketHistory(comparables);
        }
      }

      // Determine data source type
      let dataSourceType: 'live' | 'partial' | 'sample' = 'sample';
      if (comparables.length > 0 && activeListingsCount !== null) {
        dataSourceType = 'live';
      } else if (comparables.length > 0) {
        dataSourceType = 'partial';
      }

      const enhancedData: EnhancedMarketData = {
        comparables,
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
      };

      return NextResponse.json({
        success: true,
        data: enhancedData,
        meta: {
          source: 'realty-in-us',
          mode: 'enhanced',
          cached: result.cached || false,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Standard mode: return basic comparables data
    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        source: 'realty-in-us',
        mode: 'standard',
        cached: result.cached || false,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[Comparables API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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
 *
 * Body:
 * {
 *   lat: number,
 *   lng: number,
 *   radius_miles?: number,
 *   limit?: number,
 *   beds_min?: number,
 *   beds_max?: number,
 *   sqft_min?: number,
 *   sqft_max?: number,
 *   prop_type?: string
 * }
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
        radius_miles: body.radius_miles || 1,
        limit: Math.min(body.limit || 10, 50),
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
        limit: Math.min(body.limit || 10, 50),
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
    logger.error('[Comparables API] POST Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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
