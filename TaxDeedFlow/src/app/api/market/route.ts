/**
 * Combined Market Data API Route
 *
 * Fetches and combines market data from multiple sources:
 * - Realty in US API: Sold comparables, active listings
 * - Zillow API (US Housing Market Data): Price history, tax history, Zestimates
 *
 * This provides comprehensive market analysis by leveraging both APIs.
 *
 * @route GET /api/market
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRealtyService, RealtyComparable } from '@/lib/api/services/realty-service';
import { logger } from '@/lib/logger';

const apiLogger = logger.withContext('Market API');
import { getZillowService, ZillowProperty, PriceTrendAnalysis, TaxTrendAnalysis } from '@/lib/api/services/zillow-service';
import {
  calculateAllMarketMetrics,
  type CalculatedMarketMetrics,
  type MarketCalculationInput,
} from '@/lib/utils/market-calculations';
import {
  calculateMarketHistory,
  type MarketHistoryMetrics,
} from '@/lib/utils/market-history-calculations';

// Mark as dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

/**
 * Combined market data response
 */
interface CombinedMarketData {
  // From Realty API
  realty: {
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
  };

  // From Zillow API (area search)
  zillow: {
    recentlySold: Array<{
      zpid: string;
      address: string;
      price: number;
      zestimate: number | null;
      bedrooms: number;
      bathrooms: number;
      livingArea: number;
      daysOnZillow: number;
    }>;
    forSale: Array<{
      zpid: string;
      address: string;
      price: number;
      zestimate: number | null;
      bedrooms: number;
      bathrooms: number;
      livingArea: number;
      daysOnZillow: number;
    }>;
    medianZestimate: number | null;
    avgZestimate: number | null;
  };

  // Calculated metrics (from real data)
  calculatedMetrics: CalculatedMarketMetrics | null;
  historicalMetrics: MarketHistoryMetrics | null;

  // Combined analysis
  combined: {
    medianPrice: number | null;
    avgPricePerSqft: number | null;
    avgDaysOnMarket: number | null;
    activeListings: number;
    recentSales: number;
    zestimateVsSoldDiff: number | null; // Percentage difference between Zestimate and actual sold price
    marketType: 'buyers' | 'sellers' | 'balanced';
    marketHealth: number; // 0-100 score
    dataConfidence: 'high' | 'medium' | 'low';
  };

  // Data source metadata
  sources: {
    realty: boolean;
    zillow: boolean;
    timestamp: string;
  };
}

/**
 * Property-specific market data response
 */
interface PropertyMarketData {
  // Property details from Zillow
  property: ZillowProperty | null;

  // Price trends
  priceTrends: PriceTrendAnalysis | null;

  // Tax trends
  taxTrends: TaxTrendAnalysis | null;

  // Nearby comparables from both APIs
  nearbyComparables: RealtyComparable[];

  // Climate risk
  climateRisk: {
    flood: number | null;
    fire: number | null;
    wind: number | null;
    heat: number | null;
  } | null;

  // Schools
  schools: Array<{
    name: string;
    rating: number | null;
    level: string;
    distance: number;
  }>;

  // Data sources
  sources: {
    zillow: boolean;
    realty: boolean;
    timestamp: string;
  };
}

/**
 * GET /api/market
 *
 * Query params:
 * - location: City, State or ZIP code (required for area search)
 * - address: Full property address (for property-specific data)
 * - zpid: Zillow Property ID (alternative to address)
 * - lat: Latitude (for coordinate-based search)
 * - lng: Longitude (for coordinate-based search)
 * - radius_miles: Search radius (default 1)
 * - limit: Max results (default 20)
 * - mode: 'area' | 'property' (default 'area')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('mode') || 'area';
    const location = searchParams.get('location');
    const address = searchParams.get('address');
    const zpid = searchParams.get('zpid');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radiusMiles = parseFloat(searchParams.get('radius_miles') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // Property-specific mode
    if (mode === 'property') {
      if (!address && !zpid) {
        return NextResponse.json(
          { error: 'Either address or zpid is required for property mode' },
          { status: 400 }
        );
      }

      const result = await getPropertyMarketData(address, zpid, lat, lng, radiusMiles, limit);
      return NextResponse.json({
        success: true,
        data: result,
        meta: {
          mode: 'property',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Area mode (default)
    if (!location && (!lat || !lng)) {
      return NextResponse.json(
        { error: 'Either location or lat/lng coordinates are required' },
        { status: 400 }
      );
    }

    const result = await getAreaMarketData(
      location || '',
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
      radiusMiles,
      limit
    );

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        mode: 'area',
        location: location || `${lat},${lng}`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    apiLogger.error('Error', { error: error instanceof Error ? error.message : String(error) });

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
 * Get area-wide market data combining both APIs
 */
async function getAreaMarketData(
  location: string,
  lat?: number,
  lng?: number,
  radiusMiles: number = 1,
  limit: number = 20
): Promise<CombinedMarketData> {
  const realtyService = getRealtyService();
  const zillowService = getZillowService();

  // Determine search parameters
  const postalCode = location.match(/^\d{5}$/) ? location : undefined;
  const cityState = !postalCode ? location : undefined;

  // Fetch data from both APIs in parallel
  const [realtyResult, zillowSoldResult, zillowForSaleResult] = await Promise.allSettled([
    // Realty API - Sold comparables
    realtyService.getSoldComparables({
      postal_code: postalCode,
      lat,
      lng,
      radius_miles: radiusMiles,
      limit,
      sold_within_days: 180,
    }),
    // Zillow API - Recently sold
    zillowService.searchProperties({
      location: cityState || postalCode || '',
      status_type: 'RecentlySold',
    }),
    // Zillow API - For sale
    zillowService.searchProperties({
      location: cityState || postalCode || '',
      status_type: 'ForSale',
    }),
  ]);

  // Process Realty results
  let realtyComparables: RealtyComparable[] = [];
  let realtyStatistics = {
    count: 0,
    avg_sold_price: 0,
    median_sold_price: 0,
    min_sold_price: 0,
    max_sold_price: 0,
    avg_price_per_sqft: 0,
    avg_days_on_market: 0,
  };
  let activeListingsCount: number | null = null;

  if (realtyResult.status === 'fulfilled' && realtyResult.value.data) {
    realtyComparables = realtyResult.value.data.comparables || [];
    realtyStatistics = realtyResult.value.data.statistics || realtyStatistics;

    // Try to get active listings count
    try {
      const activeResult = await realtyService.getActiveListingsCount({
        postal_code: postalCode,
        lat,
        lng,
      });
      activeListingsCount = activeResult.data;
    } catch (e) {
      apiLogger.warn('Failed to get active listings count', { error: e instanceof Error ? e.message : String(e) });
    }
  }

  // Process Zillow sold results
  interface ZillowSearchResultItem {
    zpid: string;
    address: string;
    price?: number;
    zestimate?: number;
    bedrooms?: number;
    bathrooms?: number;
    livingArea?: number;
    daysOnZillow?: number;
  }

  let zillowSold: ZillowSearchResultItem[] = [];
  if (zillowSoldResult.status === 'fulfilled' && zillowSoldResult.value.data) {
    zillowSold = zillowSoldResult.value.data;
  }

  // Process Zillow for sale results
  let zillowForSale: ZillowSearchResultItem[] = [];
  if (zillowForSaleResult.status === 'fulfilled' && zillowForSaleResult.value.data) {
    zillowForSale = zillowForSaleResult.value.data;
  }

  // Calculate Zestimate statistics
  const zestimates = [...zillowSold, ...zillowForSale]
    .map((p) => p.zestimate)
    .filter((z): z is number => typeof z === 'number' && z > 0);

  const medianZestimate = zestimates.length > 0
    ? calculateMedian(zestimates)
    : null;

  const avgZestimate = zestimates.length > 0
    ? Math.round(zestimates.reduce((a, b) => a + b, 0) / zestimates.length)
    : null;

  // Calculate market metrics from Realty data
  let calculatedMetrics: CalculatedMarketMetrics | null = null;
  if (realtyComparables.length >= 3) {
    const input: MarketCalculationInput = {
      comparables: realtyComparables,
      avgDaysOnMarket: realtyStatistics.avg_days_on_market,
      avgPricePerSqft: realtyStatistics.avg_price_per_sqft,
      activeListingsCount: activeListingsCount || zillowForSale.length || undefined,
      soldCount: realtyStatistics.count || realtyComparables.length,
      monthsOfData: 6,
    };
    calculatedMetrics = calculateAllMarketMetrics(input);
  }

  // Calculate historical metrics
  let historicalMetrics: MarketHistoryMetrics | null = null;
  if (realtyComparables.length >= 5) {
    historicalMetrics = calculateMarketHistory(realtyComparables);
  }

  // Combine data for analysis
  const totalActiveListings = activeListingsCount || zillowForSale.length || 0;
  const totalRecentSales = realtyComparables.length || zillowSold.length || 0;

  // Calculate Zestimate vs Sold price difference
  let zestimateVsSoldDiff: number | null = null;
  if (medianZestimate && realtyStatistics.median_sold_price > 0) {
    zestimateVsSoldDiff = (medianZestimate - realtyStatistics.median_sold_price) / realtyStatistics.median_sold_price;
  }

  // Determine data confidence
  let dataConfidence: 'high' | 'medium' | 'low' = 'low';
  if (realtyComparables.length >= 10 && zillowSold.length >= 5) {
    dataConfidence = 'high';
  } else if (realtyComparables.length >= 5 || zillowSold.length >= 3) {
    dataConfidence = 'medium';
  }

  return {
    realty: {
      comparables: realtyComparables,
      statistics: realtyStatistics,
      activeListingsCount,
    },
    zillow: {
      recentlySold: zillowSold.slice(0, 10).map((p) => ({
        zpid: p.zpid,
        address: p.address,
        price: p.price || 0,
        zestimate: p.zestimate || null,
        bedrooms: p.bedrooms || 0,
        bathrooms: p.bathrooms || 0,
        livingArea: p.livingArea || 0,
        daysOnZillow: p.daysOnZillow || 0,
      })),
      forSale: zillowForSale.slice(0, 10).map((p) => ({
        zpid: p.zpid,
        address: p.address,
        price: p.price || 0,
        zestimate: p.zestimate || null,
        bedrooms: p.bedrooms || 0,
        bathrooms: p.bathrooms || 0,
        livingArea: p.livingArea || 0,
        daysOnZillow: p.daysOnZillow || 0,
      })),
      medianZestimate,
      avgZestimate,
    },
    calculatedMetrics,
    historicalMetrics,
    combined: {
      medianPrice: realtyStatistics.median_sold_price || medianZestimate,
      avgPricePerSqft: realtyStatistics.avg_price_per_sqft || null,
      avgDaysOnMarket: realtyStatistics.avg_days_on_market || null,
      activeListings: totalActiveListings,
      recentSales: totalRecentSales,
      zestimateVsSoldDiff,
      marketType: calculatedMetrics?.marketType || 'balanced',
      marketHealth: calculatedMetrics?.marketHealth || 50,
      dataConfidence,
    },
    sources: {
      realty: realtyResult.status === 'fulfilled',
      zillow: zillowSoldResult.status === 'fulfilled' || zillowForSaleResult.status === 'fulfilled',
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Get property-specific market data
 */
async function getPropertyMarketData(
  address: string | null,
  zpid: string | null,
  lat?: string | null,
  lng?: string | null,
  radiusMiles: number = 1,
  limit: number = 10
): Promise<PropertyMarketData> {
  const realtyService = getRealtyService();
  const zillowService = getZillowService();

  // Get property details from Zillow
  let property: ZillowProperty | null = null;
  let priceTrends: PriceTrendAnalysis | null = null;
  let taxTrends: TaxTrendAnalysis | null = null;

  try {
    if (zpid) {
      const result = await zillowService.getPropertyByZpid(zpid);
      property = result.data;
    } else if (address) {
      const result = await zillowService.getPropertyByAddress(address);
      property = result.data;
    }

    if (property) {
      // Calculate trends
      priceTrends = zillowService.calculatePriceTrends(property.priceHistory);
      taxTrends = zillowService.calculateTaxTrends(property.taxHistory);
    }
  } catch (error) {
    apiLogger.warn('Failed to get Zillow property', { error: error instanceof Error ? error.message : String(error) });
  }

  // Get nearby comparables from Realty API
  let nearbyComparables: RealtyComparable[] = [];

  // Use property coordinates or provided coordinates
  const searchLat = property?.address?.latitude || (lat ? parseFloat(lat) : undefined);
  const searchLng = property?.address?.longitude || (lng ? parseFloat(lng) : undefined);
  const searchZip = property?.address?.zipcode;

  if (searchLat && searchLng) {
    try {
      const result = await realtyService.getSoldComparables({
        lat: searchLat,
        lng: searchLng,
        radius_miles: radiusMiles,
        limit,
        sold_within_days: 180,
      });
      nearbyComparables = result.data?.comparables || [];
    } catch (error) {
      apiLogger.warn('Failed to get Realty comparables', { error: error instanceof Error ? error.message : String(error) });
    }
  } else if (searchZip) {
    try {
      const result = await realtyService.getSoldComparables({
        postal_code: searchZip,
        radius_miles: radiusMiles,
        limit,
        sold_within_days: 180,
      });
      nearbyComparables = result.data?.comparables || [];
    } catch (error) {
      apiLogger.warn('Failed to get Realty comparables', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Extract climate risk from property (if available)
  let climateRisk: PropertyMarketData['climateRisk'] = null;
  if (property?.raw) {
    const raw = property.raw as Record<string, unknown>;
    // Climate data structure: { floodSources: { primary: { riskScore: { value: number } } } }
    // Using type assertion for deeply nested Zillow API response
    const climate = raw.climate as {
      floodSources?: { primary?: { riskScore?: { value?: number | null } } };
      fireSources?: { primary?: { riskScore?: { value?: number | null } } };
      windSources?: { primary?: { riskScore?: { value?: number | null } } };
      heatSources?: { primary?: { riskScore?: { value?: number | null } } };
    };

    if (climate) {
      climateRisk = {
        flood: climate?.floodSources?.primary?.riskScore?.value ?? null,
        fire: climate?.fireSources?.primary?.riskScore?.value ?? null,
        wind: climate?.windSources?.primary?.riskScore?.value ?? null,
        heat: climate?.heatSources?.primary?.riskScore?.value ?? null,
      };
    }
  }

  // Extract schools
  const schools = (property?.schools || []).map((s) => ({
    name: s.name,
    rating: s.rating,
    level: s.type,
    distance: s.distance,
  }));

  return {
    property,
    priceTrends,
    taxTrends,
    nearbyComparables,
    climateRisk,
    schools,
    sources: {
      zillow: property !== null,
      realty: nearbyComparables.length > 0,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Calculate median of array
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
