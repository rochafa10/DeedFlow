/**
 * Market History Calculations
 *
 * Calculates Year-over-Year (YoY) market changes by comparing
 * recent sales data to historical sales data from comparables.
 *
 * This provides calculated metrics when historical API data is unavailable.
 */

import { RealtyComparable } from '@/lib/api/services/realty-service';

/**
 * Market history metrics calculated from comparables
 */
export interface MarketHistoryMetrics {
  // Year-over-Year changes (as decimal, e.g., 0.05 = 5% increase)
  priceChangeYoY: number | null;
  pricePerSqftChangeYoY: number | null;
  salesVolumeChangeYoY: number | null;
  daysOnMarketChangeYoY: number | null;

  // Current period stats (last 6 months)
  currentPeriod: {
    medianPrice: number;
    avgPricePerSqft: number;
    salesCount: number;
    avgDaysOnMarket: number;
    startDate: string;
    endDate: string;
  };

  // Previous period stats (6-12 months ago)
  previousPeriod: {
    medianPrice: number;
    avgPricePerSqft: number;
    salesCount: number;
    avgDaysOnMarket: number;
    startDate: string;
    endDate: string;
  };

  // Data quality indicators
  dataQuality: {
    currentPeriodSales: number;
    previousPeriodSales: number;
    confidence: 'high' | 'medium' | 'low' | 'insufficient';
    note: string;
  };

  calculatedAt: string;
}

/**
 * Calculate median of an array of numbers
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate average of an array of numbers
 */
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate percentage change between two values
 * Returns null if previous value is 0 or invalid
 */
function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0 || !Number.isFinite(previous) || !Number.isFinite(current)) {
    return null;
  }
  return (current - previous) / previous;
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Filter comparables by date range
 */
function filterByDateRange(
  comparables: RealtyComparable[],
  startDate: Date,
  endDate: Date
): RealtyComparable[] {
  return comparables.filter((comp) => {
    const soldDate = parseDate(comp.sold_date);
    if (!soldDate) return false;
    return soldDate >= startDate && soldDate < endDate;
  });
}

/**
 * Calculate period statistics from comparables
 */
function calculatePeriodStats(comparables: RealtyComparable[]) {
  const prices = comparables
    .map((c) => c.price.sold_price)
    .filter((p): p is number => typeof p === 'number' && p > 0);

  const pricesPerSqft = comparables
    .map((c) => c.price.price_per_sqft)
    .filter((p): p is number => typeof p === 'number' && p > 0);

  const daysOnMarket = comparables
    .map((c) => c.days_on_market)
    .filter((d): d is number => typeof d === 'number' && d >= 0);

  return {
    medianPrice: Math.round(calculateMedian(prices)),
    avgPricePerSqft: Math.round(calculateAverage(pricesPerSqft)),
    salesCount: comparables.length,
    avgDaysOnMarket: Math.round(calculateAverage(daysOnMarket)),
  };
}

/**
 * Determine data quality confidence level
 */
function determineConfidence(
  currentCount: number,
  previousCount: number
): { confidence: 'high' | 'medium' | 'low' | 'insufficient'; note: string } {
  if (currentCount < 3 || previousCount < 3) {
    return {
      confidence: 'insufficient',
      note: 'Not enough sales data to calculate reliable trends. Need at least 3 sales in each period.',
    };
  }

  if (currentCount >= 10 && previousCount >= 10) {
    return {
      confidence: 'high',
      note: 'Sufficient sales data for reliable trend analysis.',
    };
  }

  if (currentCount >= 5 && previousCount >= 5) {
    return {
      confidence: 'medium',
      note: 'Moderate sales data. Trends are indicative but may vary with more data.',
    };
  }

  return {
    confidence: 'low',
    note: 'Limited sales data. Trends should be considered approximate.',
  };
}

/**
 * Calculate market history metrics from comparables
 *
 * Compares sales from the last 6 months to sales from 6-12 months ago
 * to derive YoY approximations.
 *
 * @param comparables - Array of sold comparables (should include 12+ months of data)
 * @param referenceDate - Date to calculate from (defaults to now)
 * @returns Market history metrics with YoY changes
 *
 * @example
 * ```typescript
 * const history = calculateMarketHistory(comparables);
 * console.log(`Price change YoY: ${(history.priceChangeYoY || 0) * 100}%`);
 * ```
 */
export function calculateMarketHistory(
  comparables: RealtyComparable[],
  referenceDate: Date = new Date()
): MarketHistoryMetrics {
  // Define time periods
  const now = referenceDate;
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // Filter comparables into periods
  const currentPeriodComps = filterByDateRange(comparables, sixMonthsAgo, now);
  const previousPeriodComps = filterByDateRange(comparables, twelveMonthsAgo, sixMonthsAgo);

  // Calculate statistics for each period
  const currentStats = calculatePeriodStats(currentPeriodComps);
  const previousStats = calculatePeriodStats(previousPeriodComps);

  // Calculate YoY changes
  const priceChangeYoY = calculatePercentageChange(
    currentStats.medianPrice,
    previousStats.medianPrice
  );

  const pricePerSqftChangeYoY = calculatePercentageChange(
    currentStats.avgPricePerSqft,
    previousStats.avgPricePerSqft
  );

  const salesVolumeChangeYoY = calculatePercentageChange(
    currentStats.salesCount,
    previousStats.salesCount
  );

  // For days on market, decrease is positive (market improving)
  // So we calculate previous - current / previous
  const daysOnMarketChangeYoY =
    previousStats.avgDaysOnMarket > 0
      ? (previousStats.avgDaysOnMarket - currentStats.avgDaysOnMarket) /
        previousStats.avgDaysOnMarket
      : null;

  // Determine data quality
  const { confidence, note } = determineConfidence(
    currentStats.salesCount,
    previousStats.salesCount
  );

  return {
    priceChangeYoY,
    pricePerSqftChangeYoY,
    salesVolumeChangeYoY,
    daysOnMarketChangeYoY,

    currentPeriod: {
      ...currentStats,
      startDate: sixMonthsAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    },

    previousPeriod: {
      ...previousStats,
      startDate: twelveMonthsAgo.toISOString().split('T')[0],
      endDate: sixMonthsAgo.toISOString().split('T')[0],
    },

    dataQuality: {
      currentPeriodSales: currentStats.salesCount,
      previousPeriodSales: previousStats.salesCount,
      confidence,
      note,
    },

    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Format YoY change for display
 *
 * @param change - Change as decimal (e.g., 0.05)
 * @param decimals - Number of decimal places (default 1)
 * @returns Formatted string like "+5.0%" or "-2.3%"
 */
export function formatYoYChange(change: number | null, decimals: number = 1): string {
  if (change === null || !Number.isFinite(change)) {
    return 'N/A';
  }

  const percentage = change * 100;
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(decimals)}%`;
}

/**
 * Get trend direction from YoY change
 *
 * @param change - Change as decimal
 * @param threshold - Threshold for considering it significant (default 0.01 = 1%)
 * @returns 'up' | 'down' | 'stable'
 */
export function getTrendDirection(
  change: number | null,
  threshold: number = 0.01
): 'up' | 'down' | 'stable' | 'unknown' {
  if (change === null || !Number.isFinite(change)) {
    return 'unknown';
  }

  if (change > threshold) return 'up';
  if (change < -threshold) return 'down';
  return 'stable';
}

/**
 * Extended comparables search that fetches 12 months of data
 * for historical analysis.
 *
 * This is a utility that can be used to request extended date range
 * from the Realty API.
 */
export interface ExtendedComparablesRequest {
  postal_code?: string;
  lat?: number;
  lng?: number;
  months_back?: number; // Default 12
  limit?: number; // Default 100
}

/**
 * Generate request parameters for fetching extended historical comparables
 */
export function getExtendedComparablesParams(request: ExtendedComparablesRequest) {
  const monthsBack = request.months_back || 12;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

  return {
    ...request,
    sold_within_days: monthsBack * 30, // Approximate
    limit: request.limit || 100,
    sort: 'sold_date' as const,
  };
}
