/**
 * Investment Score Calculations
 *
 * Calculates investment scores from real property and market data.
 * Produces InvestmentCategoryScore[] compatible with InvestmentScore component.
 */

import { Grade } from '@/types/report';

/**
 * Investment category score for InvestmentScore component
 */
export interface InvestmentCategoryScore {
  name: string;
  key: string;
  score: number;
  maxScore: number;
  grade: Grade;
  factors: string[];
  breakdown: { label: string; score: number; maxScore: number }[];
  color?: string;
}

/**
 * Input data for investment score calculation
 */
export interface InvestmentScoreInput {
  // Property data
  property: {
    assessedValue?: number;
    marketValue?: number;
    minimumBid?: number;
    taxAmount?: number;
    buildingSqft?: number;
    lotSizeSqft?: number;
    yearBuilt?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
  };

  // Market data (from comparables/Realty API)
  market?: {
    medianSalePrice?: number;
    avgPricePerSqft?: number;
    avgDaysOnMarket?: number;
    listToSaleRatio?: number;
    activeListings?: number;
    recentSales?: number;
    priceChangeYoY?: number; // decimal, e.g., 0.03 = 3%
    marketHealth?: number; // 0-100
  };

  // Climate/Environmental (from Zillow)
  climate?: {
    floodRisk?: number | null; // 1-10
    fireRisk?: number | null;
    windRisk?: number | null;
    heatRisk?: number | null;
  };

  // Location data
  location?: {
    schoolRating?: number; // 1-10
    crimeRate?: string; // 'low', 'medium', 'high'
    walkScore?: number; // 0-100
    nearDowntown?: boolean;
    nearHighway?: boolean;
  };

  // Financial projections
  financial?: {
    estimatedARV?: number;
    estimatedRehabCost?: number;
    monthlyRentEstimate?: number;
    holdingCostMonthly?: number;
  };
}

/**
 * Convert score to letter grade
 */
function scoreToGrade(score: number, maxScore: number): Grade {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 93) return 'A+';
  if (percentage >= 90) return 'A';
  if (percentage >= 87) return 'A-';
  if (percentage >= 83) return 'B+';
  if (percentage >= 80) return 'B';
  if (percentage >= 77) return 'B-';
  if (percentage >= 73) return 'C+';
  if (percentage >= 70) return 'C';
  if (percentage >= 67) return 'C-';
  if (percentage >= 60) return 'D';
  return 'F';
}

/**
 * Calculate Location Score (max 25 points)
 */
function calculateLocationScore(input: InvestmentScoreInput): InvestmentCategoryScore {
  const { location, property } = input;
  let score = 0;
  const factors: string[] = [];
  const breakdown: { label: string; score: number; maxScore: number }[] = [];

  // Neighborhood Quality (max 10)
  let neighborhoodScore = 5; // Default moderate
  if (location?.crimeRate === 'low') {
    neighborhoodScore = 8;
    factors.push('Low crime area');
  } else if (location?.crimeRate === 'medium') {
    neighborhoodScore = 5;
  } else if (location?.crimeRate === 'high') {
    neighborhoodScore = 2;
    factors.push('Higher crime area - verify safety');
  }

  if (location?.walkScore && location.walkScore > 70) {
    neighborhoodScore = Math.min(10, neighborhoodScore + 2);
    factors.push(`Walk Score: ${location.walkScore}/100`);
  }
  breakdown.push({ label: 'Neighborhood Quality', score: neighborhoodScore, maxScore: 10 });
  score += neighborhoodScore;

  // School Rating (max 10)
  let schoolScore = 5; // Default moderate
  if (location?.schoolRating) {
    schoolScore = location.schoolRating;
    factors.push(`School rating: ${location.schoolRating}/10`);
  }
  breakdown.push({ label: 'School Rating', score: schoolScore, maxScore: 10 });
  score += schoolScore;

  // Accessibility (max 5)
  let accessScore = 3;
  if (location?.nearDowntown) {
    accessScore += 1;
    factors.push('Near downtown amenities');
  }
  if (location?.nearHighway) {
    accessScore += 1;
    factors.push('Easy highway access');
  }
  breakdown.push({ label: 'Accessibility', score: accessScore, maxScore: 5 });
  score += accessScore;

  // Property type bonus
  if (property.propertyType?.toLowerCase().includes('single family')) {
    factors.push('Single family - highest demand');
  }

  return {
    name: 'Location',
    key: 'location',
    score,
    maxScore: 25,
    grade: scoreToGrade(score, 25),
    factors: factors.length > 0 ? factors : ['Location data not available - using estimates'],
    breakdown,
  };
}

/**
 * Calculate Risk Score (max 25 points)
 * Higher score = LOWER risk (better)
 */
function calculateRiskScore(input: InvestmentScoreInput): InvestmentCategoryScore {
  const { climate, property } = input;
  let score = 15; // Start at moderate
  const factors: string[] = [];
  const breakdown: { label: string; score: number; maxScore: number }[] = [];

  // Title Risk (max 10) - estimate based on sale type
  let titleScore = 7; // Default moderate risk
  factors.push('Title search recommended');
  breakdown.push({ label: 'Title Risk', score: titleScore, maxScore: 10 });
  score = titleScore;

  // Environmental/Climate Risk (max 10)
  let envScore = 7;
  if (climate) {
    const maxRisk = Math.max(
      climate.floodRisk || 0,
      climate.fireRisk || 0,
      climate.windRisk || 0,
      climate.heatRisk || 0
    );

    if (maxRisk === 0) {
      envScore = 8;
      factors.push('Climate risk data unavailable');
    } else if (maxRisk <= 3) {
      envScore = 9;
      factors.push('Low climate risk area');
    } else if (maxRisk <= 5) {
      envScore = 7;
      factors.push('Moderate climate risk');
    } else if (maxRisk <= 7) {
      envScore = 5;
      factors.push('Elevated climate risk - verify insurance');
    } else {
      envScore = 3;
      factors.push(`High climate risk (score: ${maxRisk}/10)`);
    }

    // Add specific risks
    if (climate.floodRisk && climate.floodRisk > 5) {
      factors.push(`Flood risk: ${climate.floodRisk}/10`);
    }
    if (climate.fireRisk && climate.fireRisk > 5) {
      factors.push(`Fire risk: ${climate.fireRisk}/10`);
    }
  } else {
    factors.push('Climate data not available');
  }
  breakdown.push({ label: 'Environmental', score: envScore, maxScore: 10 });
  score += envScore;

  // Property Condition (max 5) - estimate based on age
  let conditionScore = 3;
  if (property.yearBuilt) {
    const age = new Date().getFullYear() - property.yearBuilt;
    if (age < 10) {
      conditionScore = 5;
      factors.push('Newer construction (<10 years)');
    } else if (age < 30) {
      conditionScore = 4;
    } else if (age < 50) {
      conditionScore = 3;
      factors.push('Older home - inspection recommended');
    } else {
      conditionScore = 2;
      factors.push('Property 50+ years old - thorough inspection needed');
    }
  }
  breakdown.push({ label: 'Property Condition', score: conditionScore, maxScore: 5 });
  score += conditionScore;

  return {
    name: 'Risk',
    key: 'risk',
    score,
    maxScore: 25,
    grade: scoreToGrade(score, 25),
    factors,
    breakdown,
  };
}

/**
 * Calculate Financial Score (max 25 points)
 */
function calculateFinancialScore(input: InvestmentScoreInput): InvestmentCategoryScore {
  const { property, market, financial } = input;
  let score = 0;
  const factors: string[] = [];
  const breakdown: { label: string; score: number; maxScore: number }[] = [];

  // Price vs Value (max 10)
  let priceValueScore = 5;
  const estimatedValue = financial?.estimatedARV || market?.medianSalePrice || property.marketValue || property.assessedValue;
  const acquisitionCost = property.minimumBid || property.taxAmount || 0;

  if (estimatedValue && acquisitionCost) {
    const priceToValue = acquisitionCost / estimatedValue;
    if (priceToValue <= 0.30) {
      priceValueScore = 10;
      factors.push(`Acquisition at ${(priceToValue * 100).toFixed(0)}% of value - Excellent`);
    } else if (priceToValue <= 0.50) {
      priceValueScore = 8;
      factors.push(`Acquisition at ${(priceToValue * 100).toFixed(0)}% of value - Good`);
    } else if (priceToValue <= 0.70) {
      priceValueScore = 6;
      factors.push(`Acquisition at ${(priceToValue * 100).toFixed(0)}% of value`);
    } else if (priceToValue <= 0.85) {
      priceValueScore = 4;
      factors.push(`Acquisition at ${(priceToValue * 100).toFixed(0)}% - thin margins`);
    } else {
      priceValueScore = 2;
      factors.push(`Acquisition at ${(priceToValue * 100).toFixed(0)}% - below market acquisition unlikely`);
    }
  }
  breakdown.push({ label: 'Price vs Value', score: priceValueScore, maxScore: 10 });
  score += priceValueScore;

  // Cost Analysis (max 10)
  let costScore = 5;
  if (financial?.estimatedRehabCost !== undefined && estimatedValue) {
    const rehabToValue = financial.estimatedRehabCost / estimatedValue;
    if (rehabToValue <= 0.10) {
      costScore = 9;
      factors.push('Low rehab costs expected');
    } else if (rehabToValue <= 0.20) {
      costScore = 7;
      factors.push('Moderate rehab costs');
    } else if (rehabToValue <= 0.30) {
      costScore = 5;
      factors.push('Significant rehab may be needed');
    } else {
      costScore = 3;
      factors.push('High rehab costs expected - verify scope');
    }
  } else {
    factors.push('Rehab costs to be determined');
  }
  breakdown.push({ label: 'Cost Analysis', score: costScore, maxScore: 10 });
  score += costScore;

  // Financing/Cash Position (max 5)
  let financeScore = 3;
  if (acquisitionCost && acquisitionCost < 50000) {
    financeScore = 5;
    factors.push('Low acquisition cost - cash purchase feasible');
  } else if (acquisitionCost && acquisitionCost < 100000) {
    financeScore = 4;
  } else {
    financeScore = 3;
  }
  breakdown.push({ label: 'Financing', score: financeScore, maxScore: 5 });
  score += financeScore;

  return {
    name: 'Financial',
    key: 'financial',
    score,
    maxScore: 25,
    grade: scoreToGrade(score, 25),
    factors,
    breakdown,
  };
}

/**
 * Calculate Market Score (max 25 points)
 */
function calculateMarketScore(input: InvestmentScoreInput): InvestmentCategoryScore {
  const { market } = input;
  let score = 0;
  const factors: string[] = [];
  const breakdown: { label: string; score: number; maxScore: number }[] = [];

  // Market Trends (max 10)
  let trendsScore = 5;
  if (market?.priceChangeYoY !== undefined) {
    if (market.priceChangeYoY > 0.05) {
      trendsScore = 9;
      factors.push(`Strong appreciation: ${(market.priceChangeYoY * 100).toFixed(1)}% YoY`);
    } else if (market.priceChangeYoY > 0.02) {
      trendsScore = 7;
      factors.push(`Positive appreciation: ${(market.priceChangeYoY * 100).toFixed(1)}% YoY`);
    } else if (market.priceChangeYoY >= 0) {
      trendsScore = 5;
      factors.push('Stable market prices');
    } else if (market.priceChangeYoY > -0.03) {
      trendsScore = 4;
      factors.push(`Slight price decline: ${(market.priceChangeYoY * 100).toFixed(1)}% YoY`);
    } else {
      trendsScore = 2;
      factors.push(`Declining market: ${(market.priceChangeYoY * 100).toFixed(1)}% YoY`);
    }
  } else if (market?.marketHealth !== undefined) {
    trendsScore = Math.round((market.marketHealth / 100) * 10);
    factors.push(`Market health: ${market.marketHealth}/100`);
  }
  breakdown.push({ label: 'Market Trends', score: trendsScore, maxScore: 10 });
  score += trendsScore;

  // Demand/Supply (max 10)
  let demandScore = 5;
  if (market?.avgDaysOnMarket !== undefined) {
    if (market.avgDaysOnMarket < 30) {
      demandScore = 9;
      factors.push(`Hot market: ${market.avgDaysOnMarket} avg days on market`);
    } else if (market.avgDaysOnMarket < 60) {
      demandScore = 7;
      factors.push(`Active market: ${market.avgDaysOnMarket} avg DOM`);
    } else if (market.avgDaysOnMarket < 90) {
      demandScore = 5;
      factors.push(`Balanced market: ${market.avgDaysOnMarket} avg DOM`);
    } else {
      demandScore = 3;
      factors.push(`Slow market: ${market.avgDaysOnMarket} avg DOM`);
    }
  }

  if (market?.listToSaleRatio !== undefined) {
    if (market.listToSaleRatio > 0.98) {
      demandScore = Math.min(10, demandScore + 1);
      factors.push(`Strong list-to-sale: ${(market.listToSaleRatio * 100).toFixed(0)}%`);
    } else if (market.listToSaleRatio < 0.92) {
      demandScore = Math.max(1, demandScore - 1);
    }
  }
  breakdown.push({ label: 'Demand/Supply', score: demandScore, maxScore: 10 });
  score += demandScore;

  // Comparables Quality (max 5)
  let compsScore = 3;
  if (market?.recentSales !== undefined) {
    if (market.recentSales >= 10) {
      compsScore = 5;
      factors.push(`Good comp data: ${market.recentSales} recent sales`);
    } else if (market.recentSales >= 5) {
      compsScore = 4;
    } else if (market.recentSales >= 3) {
      compsScore = 3;
      factors.push('Limited comparable sales data');
    } else {
      compsScore = 2;
      factors.push('Few comparables - valuation uncertain');
    }
  }
  breakdown.push({ label: 'Comparables', score: compsScore, maxScore: 5 });
  score += compsScore;

  return {
    name: 'Market',
    key: 'market',
    score,
    maxScore: 25,
    grade: scoreToGrade(score, 25),
    factors: factors.length > 0 ? factors : ['Market data not fully available'],
    breakdown,
  };
}

/**
 * Calculate Profit Potential Score (max 25 points)
 */
function calculateProfitScore(input: InvestmentScoreInput): InvestmentCategoryScore {
  const { property, market, financial } = input;
  let score = 0;
  const factors: string[] = [];
  const breakdown: { label: string; score: number; maxScore: number }[] = [];

  const estimatedValue = financial?.estimatedARV || market?.medianSalePrice || property.marketValue || 0;
  const acquisitionCost = property.minimumBid || property.taxAmount || 0;
  const rehabCost = financial?.estimatedRehabCost || estimatedValue * 0.15; // Default 15%
  const totalInvestment = acquisitionCost + rehabCost;

  // ROI Potential (max 10)
  let roiScore = 5;
  if (estimatedValue > 0 && totalInvestment > 0) {
    const potentialProfit = estimatedValue * 0.90 - totalInvestment; // Assume 10% selling costs
    const roi = (potentialProfit / totalInvestment) * 100;

    if (roi > 50) {
      roiScore = 10;
      factors.push(`Excellent ROI potential: ${roi.toFixed(0)}%`);
    } else if (roi > 30) {
      roiScore = 8;
      factors.push(`Strong ROI potential: ${roi.toFixed(0)}%`);
    } else if (roi > 20) {
      roiScore = 6;
      factors.push(`Good ROI potential: ${roi.toFixed(0)}%`);
    } else if (roi > 10) {
      roiScore = 4;
      factors.push(`Moderate ROI: ${roi.toFixed(0)}%`);
    } else {
      roiScore = 2;
      factors.push(`Low ROI potential: ${roi.toFixed(0)}%`);
    }
  }
  breakdown.push({ label: 'ROI Potential', score: roiScore, maxScore: 10 });
  score += roiScore;

  // Cash Flow / Rental (max 10)
  let cashFlowScore = 5;
  if (financial?.monthlyRentEstimate && totalInvestment > 0) {
    const annualRent = financial.monthlyRentEstimate * 12;
    const grossYield = (annualRent / totalInvestment) * 100;

    if (grossYield > 15) {
      cashFlowScore = 10;
      factors.push(`Strong rental yield: ${grossYield.toFixed(1)}%`);
    } else if (grossYield > 10) {
      cashFlowScore = 8;
      factors.push(`Good rental yield: ${grossYield.toFixed(1)}%`);
    } else if (grossYield > 7) {
      cashFlowScore = 6;
      factors.push(`Decent rental yield: ${grossYield.toFixed(1)}%`);
    } else {
      cashFlowScore = 4;
      factors.push('Rental yield may be limited');
    }
  } else if (market?.avgPricePerSqft && property.buildingSqft) {
    // Estimate rent at 0.8% of value monthly (rough rule)
    const estimatedMonthlyRent = (estimatedValue * 0.008);
    factors.push(`Estimated rent: $${estimatedMonthlyRent.toFixed(0)}/mo`);
  }
  breakdown.push({ label: 'Cash Flow', score: cashFlowScore, maxScore: 10 });
  score += cashFlowScore;

  // Exit Options (max 5)
  let exitScore = 3;
  if (property.propertyType?.toLowerCase().includes('single family')) {
    exitScore = 5;
    factors.push('Multiple exit strategies: flip, rent, or wholesale');
  } else if (property.propertyType?.toLowerCase().includes('multi')) {
    exitScore = 4;
    factors.push('Good for rental income strategy');
  }
  breakdown.push({ label: 'Exit Options', score: exitScore, maxScore: 5 });
  score += exitScore;

  return {
    name: 'Profit',
    key: 'profit',
    score,
    maxScore: 25,
    grade: scoreToGrade(score, 25),
    factors,
    breakdown,
  };
}

/**
 * Calculate all investment scores from input data
 */
export function calculateInvestmentScores(input: InvestmentScoreInput): {
  categories: InvestmentCategoryScore[];
  totalScore: number;
  maxTotalScore: number;
  overallGrade: Grade;
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'caution' | 'avoid';
  dataQuality: 'high' | 'medium' | 'low';
} {
  const categories: InvestmentCategoryScore[] = [
    calculateLocationScore(input),
    calculateRiskScore(input),
    calculateFinancialScore(input),
    calculateMarketScore(input),
    calculateProfitScore(input),
  ];

  const totalScore = categories.reduce((sum, cat) => sum + cat.score, 0);
  const maxTotalScore = categories.reduce((sum, cat) => sum + cat.maxScore, 0);
  const percentage = (totalScore / maxTotalScore) * 100;

  // Determine overall grade
  const overallGrade = scoreToGrade(totalScore, maxTotalScore);

  // Determine recommendation
  let recommendation: 'strong_buy' | 'buy' | 'hold' | 'caution' | 'avoid';
  if (percentage >= 80) {
    recommendation = 'strong_buy';
  } else if (percentage >= 70) {
    recommendation = 'buy';
  } else if (percentage >= 60) {
    recommendation = 'hold';
  } else if (percentage >= 50) {
    recommendation = 'caution';
  } else {
    recommendation = 'avoid';
  }

  // Assess data quality based on what's available
  let dataPoints = 0;
  if (input.property.assessedValue || input.property.marketValue) dataPoints++;
  if (input.property.minimumBid) dataPoints++;
  if (input.market?.medianSalePrice) dataPoints++;
  if (input.market?.avgDaysOnMarket) dataPoints++;
  if (input.climate?.floodRisk !== undefined) dataPoints++;
  if (input.financial?.estimatedARV) dataPoints++;

  const dataQuality = dataPoints >= 5 ? 'high' : dataPoints >= 3 ? 'medium' : 'low';

  return {
    categories,
    totalScore,
    maxTotalScore,
    overallGrade,
    recommendation,
    dataQuality,
  };
}
