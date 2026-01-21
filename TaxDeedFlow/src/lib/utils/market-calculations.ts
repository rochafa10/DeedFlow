/**
 * Market Calculations Utility
 *
 * Calculates derived market metrics from raw comparables data.
 * Used to replace hardcoded mock values with calculated real data.
 */

import type { RealtyComparable } from '../api/services/realty-service';
import type { Grade } from '@/types/report';

/**
 * Market type based on months of inventory
 */
export type MarketType = 'buyers' | 'sellers' | 'balanced';

/**
 * Supply/demand indicator based on days on market
 */
export type SupplyDemand = 'undersupply' | 'balanced' | 'oversupply';

/**
 * Calculated market metrics
 */
export interface CalculatedMarketMetrics {
  listToSaleRatio: number | null;
  marketHealth: number;
  marketType: MarketType;
  supplyDemand: SupplyDemand;
  absorptionRate: number | null;
  dataQuality: 'excellent' | 'good' | 'fair' | 'limited';
}

/**
 * Input metrics for market calculations
 */
export interface MarketCalculationInput {
  comparables: RealtyComparable[];
  avgDaysOnMarket: number;
  avgPricePerSqft: number;
  activeListingsCount?: number;
  soldCount: number;
  monthsOfData?: number; // Default 6 months
}

/**
 * Calculate list-to-sale ratio from comparables
 *
 * The ratio of sold price to list price, indicating how close
 * properties sell to their asking price.
 *
 * - Ratio > 1.0 = Sellers getting above asking (hot market)
 * - Ratio = 0.95-1.0 = Normal market
 * - Ratio < 0.95 = Buyers getting discounts (soft market)
 *
 * @param comparables - Array of comparable properties with prices
 * @returns List-to-sale ratio (0.0-1.5+) or null if insufficient data
 */
export function calculateListToSaleRatio(comparables: RealtyComparable[]): number | null {
  const withBothPrices = comparables.filter(
    c => c.price.list_price && c.price.sold_price &&
         c.price.list_price > 0 && c.price.sold_price > 0
  );

  // Need at least 3 comparables for meaningful ratio
  if (withBothPrices.length < 3) return null;

  const ratios = withBothPrices.map(
    c => c.price.sold_price! / c.price.list_price!
  );

  // Return average ratio, capped at reasonable bounds
  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return Math.min(Math.max(avgRatio, 0.5), 1.5); // Cap between 0.5 and 1.5
}

/**
 * Determine market type based on months of inventory
 *
 * Industry standard thresholds:
 * - < 4 months = Seller's market (low inventory, high demand)
 * - 4-6 months = Balanced market
 * - > 6 months = Buyer's market (high inventory, lower demand)
 *
 * @param monthsOfInventory - Calculated months of inventory
 * @returns Market type classification
 */
export function determineMarketType(monthsOfInventory: number | null): MarketType {
  if (monthsOfInventory === null) return 'balanced'; // Default when unknown

  if (monthsOfInventory < 4) return 'sellers';
  if (monthsOfInventory > 6) return 'buyers';
  return 'balanced';
}

/**
 * Determine supply/demand balance from days on market
 *
 * Days on market indicates how quickly properties sell:
 * - < 30 days = Undersupply (properties selling fast)
 * - 30-60 days = Balanced
 * - > 60 days = Oversupply (properties sitting)
 *
 * @param avgDaysOnMarket - Average days on market for sold comparables
 * @returns Supply/demand classification
 */
export function determineSupplyDemand(avgDaysOnMarket: number): SupplyDemand {
  if (avgDaysOnMarket < 30) return 'undersupply';
  if (avgDaysOnMarket > 60) return 'oversupply';
  return 'balanced';
}

/**
 * Calculate market health score (0-100)
 *
 * Composite score based on multiple factors:
 * - Days on market (weight: 30%)
 * - Price per sqft relative to area (weight: 25%)
 * - Sales volume/activity (weight: 25%)
 * - List-to-sale ratio (weight: 20%)
 *
 * @param input - Market calculation inputs
 * @returns Market health score 0-100
 */
export function calculateMarketHealth(input: MarketCalculationInput): number {
  const { avgDaysOnMarket, avgPricePerSqft, soldCount, comparables } = input;

  let score = 50; // Start neutral

  // Days on Market factor (-25 to +25 points)
  // Lower is better (faster sales = healthier market)
  if (avgDaysOnMarket > 0) {
    if (avgDaysOnMarket < 21) score += 25;
    else if (avgDaysOnMarket < 30) score += 20;
    else if (avgDaysOnMarket < 45) score += 10;
    else if (avgDaysOnMarket < 60) score += 0;
    else if (avgDaysOnMarket < 90) score -= 10;
    else score -= 20;
  }

  // Sales volume/activity factor (-15 to +15 points)
  // More sales = more active/healthy market
  if (soldCount >= 15) score += 15;
  else if (soldCount >= 10) score += 10;
  else if (soldCount >= 5) score += 5;
  else if (soldCount >= 3) score += 0;
  else score -= 10;

  // Price per sqft factor (-10 to +10 points)
  // Higher price/sqft suggests stronger market (area dependent)
  if (avgPricePerSqft > 0) {
    if (avgPricePerSqft >= 150) score += 10;
    else if (avgPricePerSqft >= 100) score += 5;
    else if (avgPricePerSqft >= 75) score += 0;
    else if (avgPricePerSqft >= 50) score -= 5;
    else score -= 10;
  }

  // List-to-sale ratio factor (-10 to +10 points)
  const listToSaleRatio = calculateListToSaleRatio(comparables);
  if (listToSaleRatio !== null) {
    if (listToSaleRatio >= 1.0) score += 10;      // Getting at or above asking
    else if (listToSaleRatio >= 0.97) score += 5; // Very close to asking
    else if (listToSaleRatio >= 0.95) score += 0; // Normal negotiations
    else if (listToSaleRatio >= 0.90) score -= 5; // Moderate discounts
    else score -= 10;                              // Heavy discounting
  }

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate absorption rate (months of inventory)
 *
 * Formula: Active Listings / (Sold per Month)
 *
 * If we have 100 active listings and sell 25/month,
 * absorption rate = 100 / 25 = 4 months of inventory
 *
 * @param activeListings - Current number of active listings
 * @param soldCount - Number of properties sold in the period
 * @param monthsOfData - Number of months the sold data covers (default 6)
 * @returns Months of inventory, or null if insufficient data
 */
export function calculateAbsorptionRate(
  activeListings: number | undefined,
  soldCount: number,
  monthsOfData: number = 6
): number | null {
  if (!activeListings || activeListings <= 0) return null;
  if (soldCount <= 0) return null;

  const soldPerMonth = soldCount / monthsOfData;
  if (soldPerMonth <= 0) return null;

  const monthsOfInventory = activeListings / soldPerMonth;

  // Cap at reasonable bounds (0.5 to 24 months)
  return Math.min(Math.max(monthsOfInventory, 0.5), 24);
}

/**
 * Determine data quality based on available comparables
 *
 * @param comparables - Array of comparable properties
 * @returns Data quality classification
 */
export function determineDataQuality(comparables: RealtyComparable[]): CalculatedMarketMetrics['dataQuality'] {
  const count = comparables.length;
  const withPrices = comparables.filter(c => c.price.sold_price && c.price.sold_price > 0).length;
  const withListPrices = comparables.filter(c => c.price.list_price && c.price.list_price > 0).length;

  if (count >= 10 && withPrices >= 8 && withListPrices >= 5) return 'excellent';
  if (count >= 5 && withPrices >= 4) return 'good';
  if (count >= 3 && withPrices >= 2) return 'fair';
  return 'limited';
}

/**
 * Calculate all derived market metrics from comparables data
 *
 * This is the main function to call from the report page.
 * It combines all calculation functions into a single output.
 *
 * @param input - Market calculation inputs
 * @returns All calculated market metrics
 *
 * @example
 * ```typescript
 * const metrics = calculateAllMarketMetrics({
 *   comparables: comparablesData.comparables,
 *   avgDaysOnMarket: comparablesData.statistics.avg_days_on_market,
 *   avgPricePerSqft: comparablesData.statistics.avg_price_per_sqft,
 *   activeListingsCount: 156, // From active listings API
 *   soldCount: comparablesData.statistics.count,
 * });
 *
 * // Use in MarketAnalysis component:
 * <MarketAnalysis
 *   marketType={metrics.marketType}
 *   marketHealth={metrics.marketHealth}
 *   // ...
 * />
 * ```
 */
export function calculateAllMarketMetrics(input: MarketCalculationInput): CalculatedMarketMetrics {
  const { comparables, avgDaysOnMarket, avgPricePerSqft, activeListingsCount, soldCount, monthsOfData = 6 } = input;

  const listToSaleRatio = calculateListToSaleRatio(comparables);
  const absorptionRate = calculateAbsorptionRate(activeListingsCount, soldCount, monthsOfData);
  const marketHealth = calculateMarketHealth(input);
  const marketType = determineMarketType(absorptionRate);
  const supplyDemand = determineSupplyDemand(avgDaysOnMarket);
  const dataQuality = determineDataQuality(comparables);

  return {
    listToSaleRatio,
    marketHealth,
    marketType,
    supplyDemand,
    absorptionRate,
    dataQuality,
  };
}

/**
 * Format list-to-sale ratio as percentage string
 *
 * @param ratio - Raw ratio (e.g., 0.97)
 * @returns Formatted string (e.g., "97%")
 */
export function formatListToSaleRatio(ratio: number | null): string {
  if (ratio === null) return 'N/A';
  return `${Math.round(ratio * 100)}%`;
}

/**
 * Format absorption rate as months string
 *
 * @param months - Raw months value
 * @returns Formatted string (e.g., "3.2 months")
 */
export function formatAbsorptionRate(months: number | null): string {
  if (months === null) return 'N/A';
  return `${months.toFixed(1)} months`;
}

/**
 * Get market type display label
 *
 * @param type - Market type
 * @returns Human-readable label
 */
export function getMarketTypeLabel(type: MarketType): string {
  switch (type) {
    case 'sellers': return "Seller's Market";
    case 'buyers': return "Buyer's Market";
    case 'balanced': return 'Balanced Market';
  }
}

/**
 * Get supply/demand display label
 *
 * @param supplyDemand - Supply/demand type
 * @returns Human-readable label
 */
export function getSupplyDemandLabel(supplyDemand: SupplyDemand): string {
  switch (supplyDemand) {
    case 'undersupply': return 'Low Supply';
    case 'oversupply': return 'High Supply';
    case 'balanced': return 'Balanced';
  }
}

/**
 * Price segment for market distribution
 */
export interface PriceSegment {
  name: string;
  value: number;
  format: 'percentage';
  comparison: 'below' | 'similar' | 'above';
}

/**
 * Calculate price segments from comparables data or price array
 *
 * Dynamically determines price brackets based on the actual data range
 * and calculates what percentage of sales fall into each bracket.
 *
 * @param input - Array of RealtyComparable objects OR array of prices (numbers)
 * @param subjectPrice - Optional subject property price/value for comparison
 * @returns Array of price segments with percentages
 *
 * @example
 * ```typescript
 * // With RealtyComparable objects:
 * const segments = calculatePriceSegments(comparables, 125000);
 *
 * // With simple price array:
 * const segments = calculatePriceSegmentsFromPrices([80000, 120000, 150000], 125000);
 * ```
 */
export function calculatePriceSegments(
  comparables: RealtyComparable[],
  subjectPrice?: number
): PriceSegment[] {
  // Get all valid sale prices
  const prices = comparables
    .map(c => c.price.sold_price || c.price.list_price || 0)
    .filter(p => p > 0)
    .sort((a, b) => a - b);

  return calculatePriceSegmentsFromPrices(prices, subjectPrice);
}

/**
 * Calculate price segments from an array of prices
 *
 * This is a more flexible version that accepts a simple array of prices.
 * Useful when you don't have full RealtyComparable objects.
 *
 * @param salePrices - Array of sale prices (numbers)
 * @param subjectPrice - Optional subject property price/value for comparison
 * @returns Array of price segments with percentages
 */
export function calculatePriceSegmentsFromPrices(
  salePrices: number[],
  subjectPrice?: number
): PriceSegment[] {
  // Get all valid sale prices
  const prices = salePrices
    .filter(p => p > 0)
    .sort((a, b) => a - b);

  if (prices.length < 3) {
    // Not enough data, return default segments
    return [
      { name: 'Under $100K', value: 25, format: 'percentage', comparison: 'below' },
      { name: '$100K-$150K', value: 25, format: 'percentage', comparison: 'similar' },
      { name: '$150K-$200K', value: 25, format: 'percentage', comparison: 'above' },
      { name: '$200K+', value: 25, format: 'percentage', comparison: 'above' },
    ];
  }

  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];
  const medianPrice = prices[Math.floor(prices.length / 2)];

  // Determine price brackets dynamically based on data range
  const brackets = determinePriceBrackets(minPrice, maxPrice, medianPrice);

  // Count properties in each bracket
  const segments: PriceSegment[] = brackets.map((bracket, index) => {
    const count = prices.filter(p => p >= bracket.min && p < bracket.max).length;
    const percentage = Math.round((count / prices.length) * 100);

    // Determine comparison to subject property
    let comparison: 'below' | 'similar' | 'above' = 'similar';
    if (subjectPrice) {
      const bracketMid = (bracket.min + bracket.max) / 2;
      if (bracketMid < subjectPrice * 0.85) comparison = 'below';
      else if (bracketMid > subjectPrice * 1.15) comparison = 'above';
    } else {
      // Without subject price, use position relative to median
      const bracketMid = (bracket.min + bracket.max) / 2;
      if (bracketMid < medianPrice * 0.75) comparison = 'below';
      else if (bracketMid > medianPrice * 1.25) comparison = 'above';
    }

    return {
      name: bracket.label,
      value: percentage,
      format: 'percentage' as const,
      comparison,
    };
  });

  // Ensure percentages add up to 100 (handle rounding)
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total !== 100 && segments.length > 0) {
    const diff = 100 - total;
    // Add/subtract difference from largest segment
    const largestIndex = segments.reduce((maxIdx, s, idx, arr) =>
      s.value > arr[maxIdx].value ? idx : maxIdx, 0);
    segments[largestIndex].value += diff;
  }

  return segments;
}

/**
 * Determine price brackets based on data range
 */
function determinePriceBrackets(min: number, max: number, median: number): Array<{ min: number; max: number; label: string }> {
  // Round to nice numbers
  const roundToNice = (n: number): number => {
    if (n >= 1000000) return Math.round(n / 100000) * 100000;
    if (n >= 100000) return Math.round(n / 10000) * 10000;
    if (n >= 10000) return Math.round(n / 5000) * 5000;
    return Math.round(n / 1000) * 1000;
  };

  const formatPrice = (n: number): string => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${Math.round(n / 1000)}K`;
    return `$${n}`;
  };

  // Determine bracket size based on range
  const range = max - min;
  let bracketSize: number;

  if (range > 500000) bracketSize = 100000;
  else if (range > 200000) bracketSize = 50000;
  else if (range > 100000) bracketSize = 25000;
  else if (range > 50000) bracketSize = 10000;
  else bracketSize = Math.max(5000, Math.ceil(range / 4));

  // Create 4 brackets
  const bracketStart = roundToNice(Math.max(0, min - bracketSize / 2));
  const brackets: Array<{ min: number; max: number; label: string }> = [];

  // First bracket: Under X
  const firstMax = bracketStart + bracketSize;
  brackets.push({
    min: 0,
    max: firstMax,
    label: `Under ${formatPrice(firstMax)}`,
  });

  // Middle brackets
  brackets.push({
    min: firstMax,
    max: firstMax + bracketSize,
    label: `${formatPrice(firstMax)}-${formatPrice(firstMax + bracketSize)}`,
  });

  brackets.push({
    min: firstMax + bracketSize,
    max: firstMax + bracketSize * 2,
    label: `${formatPrice(firstMax + bracketSize)}-${formatPrice(firstMax + bracketSize * 2)}`,
  });

  // Last bracket: X+
  brackets.push({
    min: firstMax + bracketSize * 2,
    max: Infinity,
    label: `${formatPrice(firstMax + bracketSize * 2)}+`,
  });

  return brackets;
}

// =====================================================
// INVESTMENT SCORE CALCULATOR
// =====================================================

/**
 * Category score breakdown item
 */
export interface ScoreBreakdownItem {
  label: string;
  score: number;
  maxScore: number;
}

/**
 * Calculated category score for investment analysis
 */
export interface CalculatedCategoryScore {
  name: string;
  key: 'location' | 'risk' | 'financial' | 'market' | 'profit';
  score: number;
  maxScore: number;
  grade: Grade;
  factors: string[];
  breakdown: ScoreBreakdownItem[];
}

/**
 * Input data for investment score calculation
 */
export interface InvestmentScoreInput {
  // Location data
  location?: {
    walkScore?: number | null;       // 0-100
    transitScore?: number | null;    // 0-100
    bikeScore?: number | null;       // 0-100
    schoolRating?: number | null;    // 0-10
    overallScore?: number | null;    // 0-100 (pre-calculated)
    crimeRiskLevel?: 'low' | 'moderate' | 'high' | null;
    neighborhoodQuality?: number | null; // 0-100
  };

  // Risk data
  risk?: {
    overallRiskScore?: number | null;  // 0-100 (lower is better)
    floodRisk?: 'minimal' | 'low' | 'moderate' | 'high' | null;
    environmentalIssues?: number | null; // count of issues
    titleClarity?: 'clear' | 'minor_issues' | 'major_issues' | null;
  };

  // Financial data
  financial?: {
    acquisitionCost?: number | null;   // Total cost to acquire
    estimatedValue?: number | null;    // ARV or current value
    totalDue?: number | null;          // Tax amount owed
    rehabCostEstimate?: number | null; // Estimated rehab costs
    priceToValueRatio?: number | null; // 0-1+ (lower is better)
  };

  // Market data
  market?: {
    marketHealth?: number | null;      // 0-100
    listToSaleRatio?: number | null;   // 0-1.5
    avgDaysOnMarket?: number | null;
    supplyDemand?: SupplyDemand | null;
    comparablesCount?: number | null;
  };

  // Profit data
  profit?: {
    projectedROI?: number | null;      // Percentage (e.g., 42 for 42%)
    netProfit?: number | null;         // Dollar amount
    cashFlowPotential?: number | null; // Monthly cash flow if renting
    exitStrategies?: number | null;    // Number of viable exit strategies
  };
}

/**
 * Calculate grade from percentage
 */
function calculateGradeFromPercentage(percentage: number): Grade {
  if (percentage >= 95) return 'A+';
  if (percentage >= 90) return 'A';
  if (percentage >= 85) return 'A-';
  if (percentage >= 80) return 'B+';
  if (percentage >= 75) return 'B';
  if (percentage >= 70) return 'B-';
  if (percentage >= 65) return 'C+';
  if (percentage >= 60) return 'C';
  if (percentage >= 55) return 'C-';
  if (percentage >= 50) return 'D+';
  if (percentage >= 45) return 'D';
  return 'F';
}

/**
 * Calculate Location Score (0-25 points)
 *
 * Based on:
 * - Walk/Transit/Bike scores from location APIs
 * - School ratings
 * - Crime levels
 * - Overall neighborhood quality
 */
export function calculateLocationScore(input: InvestmentScoreInput['location']): CalculatedCategoryScore {
  const maxScore = 25;
  let totalPoints = 0;
  const breakdown: ScoreBreakdownItem[] = [];
  const factors: string[] = [];

  // Neighborhood Quality (max 10 points)
  let neighborhoodScore = 5; // Default
  if (input?.overallScore != null && input.overallScore > 0) {
    neighborhoodScore = Math.round((input.overallScore / 100) * 10);
  } else if (input?.walkScore != null || input?.neighborhoodQuality != null) {
    const walkPart = input.walkScore ? input.walkScore / 100 : 0.5;
    const qualityPart = input.neighborhoodQuality ? input.neighborhoodQuality / 100 : 0.5;
    neighborhoodScore = Math.round(((walkPart + qualityPart) / 2) * 10);
  }
  breakdown.push({ label: 'Neighborhood Quality', score: neighborhoodScore, maxScore: 10 });
  totalPoints += neighborhoodScore;

  if (neighborhoodScore >= 8) factors.push('Strong neighborhood metrics');
  else if (neighborhoodScore >= 6) factors.push('Average neighborhood quality');
  else factors.push('Below average neighborhood');

  // School Rating (max 10 points)
  let schoolScore = 5; // Default
  if (input?.schoolRating != null && input.schoolRating > 0) {
    schoolScore = Math.round(input.schoolRating);
    factors.push(`School rating: ${input.schoolRating}/10`);
  }
  breakdown.push({ label: 'School Rating', score: schoolScore, maxScore: 10 });
  totalPoints += schoolScore;

  // Accessibility (max 5 points) - based on transit and bike scores
  let accessibilityScore = 3; // Default
  if (input?.transitScore != null || input?.bikeScore != null) {
    const transitPart = input.transitScore ? input.transitScore / 100 : 0;
    const bikePart = input.bikeScore ? input.bikeScore / 100 : 0;
    accessibilityScore = Math.round(Math.max(transitPart, bikePart) * 5);
    if (accessibilityScore >= 4) factors.push('Good accessibility');
    else if (accessibilityScore >= 2) factors.push('Moderate accessibility');
  }
  breakdown.push({ label: 'Accessibility', score: accessibilityScore, maxScore: 5 });
  totalPoints += accessibilityScore;

  // Adjust for crime if available
  if (input?.crimeRiskLevel === 'low') {
    factors.push('Low crime area');
    totalPoints = Math.min(maxScore, totalPoints + 1);
  } else if (input?.crimeRiskLevel === 'high') {
    factors.push('Higher crime area');
    totalPoints = Math.max(0, totalPoints - 2);
  }

  const finalScore = Math.min(maxScore, Math.max(0, totalPoints));
  const percentage = (finalScore / maxScore) * 100;

  return {
    name: 'Location',
    key: 'location',
    score: finalScore,
    maxScore,
    grade: calculateGradeFromPercentage(percentage),
    factors: factors.length > 0 ? factors : ['Location data available'],
    breakdown,
  };
}

/**
 * Calculate Risk Score (0-25 points)
 *
 * Note: Lower risk = Higher score (inverted from raw risk score)
 */
export function calculateRiskScore(input: InvestmentScoreInput['risk']): CalculatedCategoryScore {
  const maxScore = 25;
  let totalPoints = 0;
  const breakdown: ScoreBreakdownItem[] = [];
  const factors: string[] = [];

  // Title Risk (max 10 points)
  let titleScore = 7; // Default - assume generally clear
  if (input?.titleClarity === 'clear') {
    titleScore = 9;
    factors.push('Clear title expected');
  } else if (input?.titleClarity === 'minor_issues') {
    titleScore = 6;
    factors.push('Minor title concerns');
  } else if (input?.titleClarity === 'major_issues') {
    titleScore = 3;
    factors.push('Title issues present');
  }
  breakdown.push({ label: 'Title Risk', score: titleScore, maxScore: 10 });
  totalPoints += titleScore;

  // Environmental (max 10 points)
  let envScore = 7; // Default
  if (input?.overallRiskScore != null) {
    // Invert: low risk score = high env score
    envScore = Math.round((1 - input.overallRiskScore / 100) * 10);
  }
  if (input?.floodRisk === 'minimal') {
    envScore = Math.min(10, envScore + 1);
    factors.push('No flood zone');
  } else if (input?.floodRisk === 'high') {
    envScore = Math.max(0, envScore - 3);
    factors.push('Flood zone property');
  }
  if (input?.environmentalIssues != null && input.environmentalIssues > 0) {
    envScore = Math.max(0, envScore - input.environmentalIssues);
    factors.push(`${input.environmentalIssues} environmental concern(s)`);
  } else if (input?.environmentalIssues === 0) {
    factors.push('No environmental concerns');
  }
  breakdown.push({ label: 'Environmental', score: envScore, maxScore: 10 });
  totalPoints += envScore;

  // Property Condition estimate (max 5 points)
  let conditionScore = 4; // Default - assume generally OK
  breakdown.push({ label: 'Property Condition', score: conditionScore, maxScore: 5 });
  totalPoints += conditionScore;

  const finalScore = Math.min(maxScore, Math.max(0, totalPoints));
  const percentage = (finalScore / maxScore) * 100;

  return {
    name: 'Risk',
    key: 'risk',
    score: finalScore,
    maxScore,
    grade: calculateGradeFromPercentage(percentage),
    factors: factors.length > 0 ? factors : ['Risk assessment available'],
    breakdown,
  };
}

/**
 * Calculate Financial Score (0-25 points)
 *
 * Based on acquisition cost relative to value
 */
export function calculateFinancialScore(input: InvestmentScoreInput['financial']): CalculatedCategoryScore {
  const maxScore = 25;
  let totalPoints = 0;
  const breakdown: ScoreBreakdownItem[] = [];
  const factors: string[] = [];

  // Price vs Value (max 10 points)
  let priceValueScore = 5; // Default
  if (input?.priceToValueRatio != null && input.priceToValueRatio > 0) {
    // Ratio < 0.5 = excellent (below market), Ratio > 1.0 = poor
    if (input.priceToValueRatio <= 0.3) {
      priceValueScore = 10;
      factors.push('Significantly below market value');
    } else if (input.priceToValueRatio <= 0.5) {
      priceValueScore = 9;
      factors.push('Below market value');
    } else if (input.priceToValueRatio <= 0.7) {
      priceValueScore = 7;
      factors.push('Good price-to-value ratio');
    } else if (input.priceToValueRatio <= 0.85) {
      priceValueScore = 5;
      factors.push('Fair market value');
    } else if (input.priceToValueRatio <= 1.0) {
      priceValueScore = 3;
      factors.push('At or near market value');
    } else {
      priceValueScore = 1;
      factors.push('Above market value');
    }
  } else if (input?.acquisitionCost != null && input?.estimatedValue != null && input.estimatedValue > 0) {
    const ratio = input.acquisitionCost / input.estimatedValue;
    priceValueScore = Math.max(1, Math.min(10, Math.round((1 - ratio) * 12)));
    if (ratio < 0.5) factors.push('Below market value');
    else if (ratio < 0.8) factors.push('Moderate acquisition cost');
    else factors.push('Higher acquisition cost');
  }
  breakdown.push({ label: 'Price vs Value', score: priceValueScore, maxScore: 10 });
  totalPoints += priceValueScore;

  // Cost Analysis (max 10 points)
  let costScore = 5; // Default
  if (input?.totalDue != null && input?.estimatedValue != null && input.estimatedValue > 0) {
    const taxRatio = input.totalDue / input.estimatedValue;
    if (taxRatio < 0.05) {
      costScore = 9;
      factors.push('Low acquisition cost');
    } else if (taxRatio < 0.1) {
      costScore = 7;
    } else if (taxRatio < 0.2) {
      costScore = 5;
    } else {
      costScore = 3;
      factors.push('Higher tax burden');
    }
  }
  breakdown.push({ label: 'Cost Analysis', score: costScore, maxScore: 10 });
  totalPoints += costScore;

  // Financing potential (max 5 points)
  let financingScore = 4; // Default - assume moderate potential
  if (input?.rehabCostEstimate != null && input?.estimatedValue != null && input.estimatedValue > 0) {
    const rehabRatio = input.rehabCostEstimate / input.estimatedValue;
    if (rehabRatio < 0.1) {
      financingScore = 5;
      factors.push('Favorable financing potential');
    } else if (rehabRatio > 0.3) {
      financingScore = 2;
      factors.push('Significant rehab needed');
    }
  }
  breakdown.push({ label: 'Financing', score: financingScore, maxScore: 5 });
  totalPoints += financingScore;

  const finalScore = Math.min(maxScore, Math.max(0, totalPoints));
  const percentage = (finalScore / maxScore) * 100;

  return {
    name: 'Financial',
    key: 'financial',
    score: finalScore,
    maxScore,
    grade: calculateGradeFromPercentage(percentage),
    factors: factors.length > 0 ? factors : ['Financial data available'],
    breakdown,
  };
}

/**
 * Calculate Market Score (0-25 points)
 *
 * Based on market health, DOM, and comparables data
 */
export function calculateMarketScore(input: InvestmentScoreInput['market']): CalculatedCategoryScore {
  const maxScore = 25;
  let totalPoints = 0;
  const breakdown: ScoreBreakdownItem[] = [];
  const factors: string[] = [];

  // Market Trends (max 10 points)
  let trendScore = 5; // Default
  if (input?.marketHealth != null) {
    trendScore = Math.round((input.marketHealth / 100) * 10);
    if (input.marketHealth >= 70) factors.push('Strong market conditions');
    else if (input.marketHealth >= 50) factors.push('Stable market conditions');
    else factors.push('Weak market conditions');
  }
  breakdown.push({ label: 'Market Trends', score: trendScore, maxScore: 10 });
  totalPoints += trendScore;

  // Demand/Supply (max 10 points)
  let demandScore = 5; // Default
  if (input?.avgDaysOnMarket != null) {
    if (input.avgDaysOnMarket < 21) {
      demandScore = 9;
      factors.push('Low days on market');
    } else if (input.avgDaysOnMarket < 45) {
      demandScore = 7;
      factors.push('Average days on market');
    } else if (input.avgDaysOnMarket < 90) {
      demandScore = 4;
      factors.push('Higher days on market');
    } else {
      demandScore = 2;
      factors.push('Extended days on market');
    }
  }
  if (input?.supplyDemand === 'undersupply') {
    demandScore = Math.min(10, demandScore + 1);
  } else if (input?.supplyDemand === 'oversupply') {
    demandScore = Math.max(1, demandScore - 1);
  }
  breakdown.push({ label: 'Demand/Supply', score: demandScore, maxScore: 10 });
  totalPoints += demandScore;

  // Comparables quality (max 5 points)
  let compsScore = 3; // Default
  if (input?.comparablesCount != null) {
    if (input.comparablesCount >= 10) {
      compsScore = 5;
      factors.push('Strong comparables data');
    } else if (input.comparablesCount >= 5) {
      compsScore = 4;
    } else if (input.comparablesCount >= 3) {
      compsScore = 3;
    } else {
      compsScore = 2;
      factors.push('Limited comparables');
    }
  }
  breakdown.push({ label: 'Comparables', score: compsScore, maxScore: 5 });
  totalPoints += compsScore;

  const finalScore = Math.min(maxScore, Math.max(0, totalPoints));
  const percentage = (finalScore / maxScore) * 100;

  return {
    name: 'Market',
    key: 'market',
    score: finalScore,
    maxScore,
    grade: calculateGradeFromPercentage(percentage),
    factors: factors.length > 0 ? factors : ['Market data available'],
    breakdown,
  };
}

/**
 * Calculate Profit Score (0-25 points)
 *
 * Based on ROI, profit margins, and exit options
 */
export function calculateProfitScore(input: InvestmentScoreInput['profit']): CalculatedCategoryScore {
  const maxScore = 25;
  let totalPoints = 0;
  const breakdown: ScoreBreakdownItem[] = [];
  const factors: string[] = [];

  // ROI Potential (max 10 points)
  let roiScore = 5; // Default
  if (input?.projectedROI != null) {
    if (input.projectedROI >= 100) {
      roiScore = 10;
      factors.push(`Excellent ROI potential (${input.projectedROI.toFixed(0)}%)`);
    } else if (input.projectedROI >= 50) {
      roiScore = 8;
      factors.push(`Strong ROI potential (${input.projectedROI.toFixed(0)}%)`);
    } else if (input.projectedROI >= 25) {
      roiScore = 6;
      factors.push(`Good ROI potential (${input.projectedROI.toFixed(0)}%)`);
    } else if (input.projectedROI >= 10) {
      roiScore = 4;
      factors.push(`Moderate ROI potential (${input.projectedROI.toFixed(0)}%)`);
    } else {
      roiScore = 2;
      factors.push('Limited ROI potential');
    }
  }
  breakdown.push({ label: 'ROI Potential', score: roiScore, maxScore: 10 });
  totalPoints += roiScore;

  // Cash Flow (max 10 points)
  let cashFlowScore = 5; // Default
  if (input?.cashFlowPotential != null) {
    if (input.cashFlowPotential >= 500) {
      cashFlowScore = 9;
      factors.push('Strong cash flow potential');
    } else if (input.cashFlowPotential >= 200) {
      cashFlowScore = 7;
      factors.push('Positive cash flow potential');
    } else if (input.cashFlowPotential >= 0) {
      cashFlowScore = 5;
      factors.push('Break-even cash flow');
    } else {
      cashFlowScore = 3;
      factors.push('Negative cash flow expected');
    }
  } else if (input?.netProfit != null && input.netProfit > 0) {
    cashFlowScore = Math.min(9, Math.round(Math.log10(input.netProfit) * 1.5));
    factors.push(`Net profit: $${input.netProfit.toLocaleString()}`);
  }
  breakdown.push({ label: 'Cash Flow', score: cashFlowScore, maxScore: 10 });
  totalPoints += cashFlowScore;

  // Exit Options (max 5 points)
  let exitScore = 3; // Default - assume flip and hold are viable
  if (input?.exitStrategies != null) {
    exitScore = Math.min(5, input.exitStrategies + 1);
    if (input.exitStrategies >= 3) factors.push('Multiple exit strategies');
    else if (input.exitStrategies >= 2) factors.push('Good exit options');
    else factors.push('Limited exit options');
  }
  breakdown.push({ label: 'Exit Options', score: exitScore, maxScore: 5 });
  totalPoints += exitScore;

  const finalScore = Math.min(maxScore, Math.max(0, totalPoints));
  const percentage = (finalScore / maxScore) * 100;

  return {
    name: 'Profit',
    key: 'profit',
    score: finalScore,
    maxScore,
    grade: calculateGradeFromPercentage(percentage),
    factors: factors.length > 0 ? factors : ['Profit analysis available'],
    breakdown,
  };
}

/**
 * Calculate all investment scores from available data
 *
 * This is the main function to call from the report page.
 *
 * @param input - All available data for score calculation
 * @returns Array of 5 category scores
 *
 * @example
 * ```typescript
 * const categories = calculateInvestmentScores({
 *   location: {
 *     walkScore: 65,
 *     schoolRating: 7,
 *     crimeRiskLevel: 'low',
 *   },
 *   market: {
 *     marketHealth: 72,
 *     avgDaysOnMarket: 35,
 *   },
 *   profit: {
 *     projectedROI: 42,
 *   },
 * });
 * ```
 */
export function calculateInvestmentScores(input: InvestmentScoreInput): CalculatedCategoryScore[] {
  return [
    calculateLocationScore(input.location),
    calculateRiskScore(input.risk),
    calculateFinancialScore(input.financial),
    calculateMarketScore(input.market),
    calculateProfitScore(input.profit),
  ];
}

/**
 * Calculate total investment score from categories
 */
export function calculateTotalInvestmentScore(categories: CalculatedCategoryScore[]): number {
  return categories.reduce((sum, cat) => sum + cat.score, 0);
}

/**
 * Calculate overall grade from total score
 */
export function calculateOverallGrade(totalScore: number, maxScore: number = 125): Grade {
  const percentage = (totalScore / maxScore) * 100;
  return calculateGradeFromPercentage(percentage);
}
