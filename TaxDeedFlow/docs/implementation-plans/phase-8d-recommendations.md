# Phase 8D: Investment Recommendation Engine

## Overview

This document covers the Investment Recommendation Engine module, which generates actionable buy/hold/pass recommendations based on financial metrics, risk scores, and market conditions. This is extracted from the larger Phase 8 Financial Analysis implementation.

## Dependencies

- Phase 8A: Cost Estimation (for CostBreakdown)
- Phase 8B: ROI Metrics (for InvestmentMetrics)
- Phase 8C: Comparables Analysis (for ARV confidence)
- Phase 7: Risk Analysis (for risk scores)

## Type Definitions

```typescript
// src/lib/analysis/financial/types.ts

export interface InvestmentRecommendation {
  verdict: 'strong_buy' | 'buy' | 'hold' | 'pass' | 'avoid';
  confidence: number;           // 0-100
  maxBid: number;               // Maximum recommended bid
  targetProfit: number;         // Expected profit at max bid
  keyFactors: string[];         // Top reasons for recommendation
  risks: string[];              // Key risks identified
  opportunities: string[];      // Potential upsides
  exitStrategy: 'flip' | 'rental' | 'wholesale' | 'hold';
  timelineMonths: number;       // Estimated time to exit
}

export interface RecommendationInput {
  metrics: InvestmentMetrics;
  costs: CostBreakdown;
  riskScore: number;            // 0-25 from risk analysis
  locationScore: number;        // 0-25 from location analysis
  marketScore: number;          // 0-25 from market analysis
  comparablesConfidence: 'low' | 'medium' | 'high';
  propertyCondition?: 'excellent' | 'good' | 'fair' | 'poor' | 'distressed';
}

export interface DataQualityAssessment {
  overallScore: number;
  components: {
    comparablesQuality: number;
    costEstimateAccuracy: number;
    marketDataFreshness: number;
    propertyDataCompleteness: number;
  };
  missingData: string[];
  assumptions: string[];
}

export interface FinancialAnalysis {
  costs: CostBreakdown;
  revenue: RevenueProjection;
  metrics: InvestmentMetrics;
  comparables: ComparablesAnalysis;
  recommendation: InvestmentRecommendation;
  analysisDate: string;
  confidenceLevel: number;
  dataQuality: DataQualityAssessment;
}
```

## Recommendation Thresholds

```typescript
// src/lib/analysis/financial/recommendationEngine.ts

// Thresholds for recommendation verdicts
const THRESHOLDS = {
  strongBuy: {
    minROI: 30,
    minProfitMargin: 25,
    maxPriceToARV: 0.65,
    minRiskScore: 18,
  },
  buy: {
    minROI: 20,
    minProfitMargin: 15,
    maxPriceToARV: 0.70,
    minRiskScore: 12,
  },
  hold: {
    minROI: 10,
    minProfitMargin: 8,
    maxPriceToARV: 0.75,
    minRiskScore: 8,
  },
  pass: {
    minROI: 5,
    maxPriceToARV: 0.80,
  },
  // Below pass thresholds = avoid
};
```

## Recommendation Generator

```typescript
// src/lib/analysis/financial/recommendationEngine.ts

import {
  FinancialAnalysis,
  InvestmentRecommendation,
  InvestmentMetrics,
  CostBreakdown
} from './types';

export function generateRecommendation(
  input: RecommendationInput
): InvestmentRecommendation {
  const { metrics, costs, riskScore, locationScore, marketScore, comparablesConfidence } = input;

  // Determine verdict
  const verdict = determineVerdict(metrics, riskScore, comparablesConfidence);

  // Calculate max bid
  const maxBid = calculateMaxBid(metrics, costs, verdict);

  // Determine exit strategy
  const exitStrategy = determineExitStrategy(metrics, riskScore, marketScore);

  // Calculate confidence
  const confidence = calculateRecommendationConfidence(
    comparablesConfidence,
    riskScore,
    metrics
  );

  // Identify key factors
  const keyFactors = identifyKeyFactors(metrics, riskScore, locationScore, marketScore);

  // Identify risks
  const risks = identifyRisks(metrics, costs, riskScore);

  // Identify opportunities
  const opportunities = identifyOpportunities(metrics, locationScore, marketScore);

  // Estimate timeline
  const timelineMonths = estimateTimeline(exitStrategy, input.propertyCondition);

  // Target profit
  const targetProfit = metrics.netProfit > 0 ? metrics.netProfit : maxBid * 0.2;

  return {
    verdict,
    confidence,
    maxBid,
    targetProfit,
    keyFactors,
    risks,
    opportunities,
    exitStrategy,
    timelineMonths,
  };
}
```

## Verdict Determination

```typescript
function determineVerdict(
  metrics: InvestmentMetrics,
  riskScore: number,
  comparablesConfidence: string
): InvestmentRecommendation['verdict'] {
  const { roi, profitMargin, priceToARV } = metrics;

  // Strong Buy: Excellent metrics across the board
  if (
    roi >= THRESHOLDS.strongBuy.minROI &&
    profitMargin >= THRESHOLDS.strongBuy.minProfitMargin &&
    priceToARV <= THRESHOLDS.strongBuy.maxPriceToARV &&
    riskScore >= THRESHOLDS.strongBuy.minRiskScore &&
    comparablesConfidence !== 'low'
  ) {
    return 'strong_buy';
  }

  // Buy: Good metrics
  if (
    roi >= THRESHOLDS.buy.minROI &&
    profitMargin >= THRESHOLDS.buy.minProfitMargin &&
    priceToARV <= THRESHOLDS.buy.maxPriceToARV &&
    riskScore >= THRESHOLDS.buy.minRiskScore
  ) {
    return 'buy';
  }

  // Hold: Acceptable metrics
  if (
    roi >= THRESHOLDS.hold.minROI &&
    profitMargin >= THRESHOLDS.hold.minProfitMargin &&
    priceToARV <= THRESHOLDS.hold.maxPriceToARV &&
    riskScore >= THRESHOLDS.hold.minRiskScore
  ) {
    return 'hold';
  }

  // Pass: Marginal metrics
  if (
    roi >= THRESHOLDS.pass.minROI &&
    priceToARV <= THRESHOLDS.pass.maxPriceToARV
  ) {
    return 'pass';
  }

  // Avoid: Poor metrics
  return 'avoid';
}
```

## Max Bid Calculator

```typescript
function calculateMaxBid(
  metrics: InvestmentMetrics,
  costs: CostBreakdown,
  verdict: string
): number {
  // Base: 70% of ARV minus costs (classic 70% rule)
  const arvEstimate = costs.acquisition.purchasePrice / metrics.priceToARV;
  const rehabAndHolding = costs.rehab.estimatedTotal + costs.holding.totalHolding;
  const sellingCosts = arvEstimate * 0.06; // 6% selling costs

  let maxBid = (arvEstimate * 0.70) - rehabAndHolding - sellingCosts;

  // Adjust based on verdict
  switch (verdict) {
    case 'strong_buy':
      // Can bid slightly more for strong deals
      maxBid *= 1.05;
      break;
    case 'buy':
      // Standard max bid
      break;
    case 'hold':
      // Be more conservative
      maxBid *= 0.95;
      break;
    case 'pass':
      // Very conservative
      maxBid *= 0.85;
      break;
    case 'avoid':
      // Minimum bid only
      maxBid *= 0.70;
      break;
  }

  return Math.max(0, Math.round(maxBid));
}
```

## Exit Strategy Determination

```typescript
function determineExitStrategy(
  metrics: InvestmentMetrics,
  riskScore: number,
  marketScore: number
): InvestmentRecommendation['exitStrategy'] {
  // High ROI + good market = flip
  if (metrics.roi > 25 && marketScore > 15) {
    return 'flip';
  }

  // Good cash flow + stable market = rental
  if (metrics.cashOnCash > 8 && riskScore > 15) {
    return 'rental';
  }

  // High margins but uncertain = wholesale
  if (metrics.profitMargin > 30 && marketScore < 12) {
    return 'wholesale';
  }

  // Default to flip
  return 'flip';
}
```

## Confidence Calculation

```typescript
function calculateRecommendationConfidence(
  comparablesConfidence: string,
  riskScore: number,
  metrics: InvestmentMetrics
): number {
  let confidence = 50; // Start at 50%

  // Comparables quality
  switch (comparablesConfidence) {
    case 'high': confidence += 25; break;
    case 'medium': confidence += 15; break;
    case 'low': confidence += 5; break;
  }

  // Risk score contribution
  confidence += (riskScore / 25) * 15; // Up to 15%

  // Metrics clarity (clear profit = higher confidence)
  if (metrics.roi > 30) confidence += 10;
  else if (metrics.roi > 20) confidence += 5;

  return Math.min(95, Math.max(10, confidence));
}
```

## Key Factors Identification

```typescript
function identifyKeyFactors(
  metrics: InvestmentMetrics,
  riskScore: number,
  locationScore: number,
  marketScore: number
): string[] {
  const factors: string[] = [];

  if (metrics.roi > 25) factors.push(`Strong ROI of ${metrics.roi.toFixed(1)}%`);
  if (metrics.priceToARV < 0.65) factors.push('Significant discount to value');
  if (riskScore > 20) factors.push('Low risk profile');
  if (locationScore > 20) factors.push('Excellent location');
  if (marketScore > 20) factors.push('Strong market conditions');
  if (metrics.cashOnCash > 10) factors.push('Good rental income potential');

  return factors.slice(0, 5); // Max 5 factors
}
```

## Risk Identification

```typescript
function identifyRisks(
  metrics: InvestmentMetrics,
  costs: CostBreakdown,
  riskScore: number
): string[] {
  const risks: string[] = [];

  if (riskScore < 10) risks.push('High natural disaster risk');
  if (costs.rehab.confidence === 'low') risks.push('Rehab costs uncertain');
  if (metrics.breakEvenPrice > metrics.grossProfit * 0.9) risks.push('Thin margins');
  if (metrics.totalInvestmentToARV > 0.85) risks.push('High investment relative to value');
  if (costs.holding.projectedMonths > 9) risks.push('Extended holding period');

  return risks;
}
```

## Opportunity Identification

```typescript
function identifyOpportunities(
  metrics: InvestmentMetrics,
  locationScore: number,
  marketScore: number
): string[] {
  const opportunities: string[] = [];

  if (metrics.roi > 30) opportunities.push('Above-average returns possible');
  if (locationScore > 18) opportunities.push('Desirable location may attract buyers');
  if (marketScore > 18) opportunities.push('Active market supports quick sale');
  if (metrics.priceToARV < 0.60) opportunities.push('Room for competitive bidding');

  return opportunities;
}
```

## Timeline Estimation

```typescript
function estimateTimeline(
  exitStrategy: string,
  condition?: string
): number {
  // Base timelines by strategy
  const baseTimelines: Record<string, number> = {
    flip: 6,
    rental: 3,
    wholesale: 1,
    hold: 12,
  };

  let timeline = baseTimelines[exitStrategy] || 6;

  // Adjust for condition
  if (condition === 'distressed') timeline += 3;
  else if (condition === 'poor') timeline += 2;
  else if (condition === 'fair') timeline += 1;

  return timeline;
}
```

## Data Quality Assessment

```typescript
function assessDataQuality(
  comparables: ComparablesAnalysis,
  costs: CostBreakdown,
  regridData?: RegridData,
  property?: PropertyData
): DataQualityAssessment {
  const missingData: string[] = [];
  const assumptions: string[] = [];

  // Check for missing data
  if (!regridData?.building_sqft) {
    missingData.push('Building square footage');
    assumptions.push('Estimated sqft at 1,500');
  }
  if (!regridData?.year_built) {
    missingData.push('Year built');
    assumptions.push('Estimated year built at 1970');
  }
  if (comparables.comparables.length < 3) {
    missingData.push('Sufficient comparable sales');
    assumptions.push('ARV estimate based on limited data');
  }
  if (!property?.annualTaxes) {
    missingData.push('Annual property taxes');
    assumptions.push('Estimated annual taxes at $3,000');
  }

  // Calculate component scores
  const comparablesQuality =
    comparables.confidence === 'high' ? 90 :
    comparables.confidence === 'medium' ? 70 : 40;

  const costEstimateAccuracy =
    costs.rehab.confidence === 'high' ? 85 :
    costs.rehab.confidence === 'medium' ? 65 : 45;

  const marketDataFreshness =
    comparables.comparables.length > 5 ? 85 :
    comparables.comparables.length > 3 ? 70 : 50;

  const propertyDataCompleteness =
    regridData && regridData.building_sqft && regridData.year_built ? 90 :
    regridData ? 70 : 40;

  const overallScore = Math.round(
    (comparablesQuality + costEstimateAccuracy + marketDataFreshness + propertyDataCompleteness) / 4
  );

  return {
    overallScore,
    components: {
      comparablesQuality,
      costEstimateAccuracy,
      marketDataFreshness,
      propertyDataCompleteness,
    },
    missingData,
    assumptions,
  };
}
```

## Complete Analysis Orchestrator

```typescript
// src/lib/analysis/financial/index.ts

import { PropertyData, RegridData } from '@/types';
import { calculateTotalCosts } from './costEstimator';
import { calculateInvestmentMetrics, calculateARV, calculateRentalProjection } from './roiCalculator';
import { analyzeComparables, fetchComparables } from './comparablesAnalysis';
import { generateRecommendation } from './recommendationEngine';
import { FinancialAnalysis, DataQualityAssessment } from './types';

export interface FinancialAnalysisInput {
  property: PropertyData;
  regridData?: RegridData;
  purchasePrice: number;
  riskScore: number;
  locationScore: number;
  marketScore: number;
  options?: {
    rehabScope?: 'cosmetic' | 'moderate' | 'major' | 'gut';
    holdingMonths?: number;
    auctionType?: 'tax_deed' | 'tax_lien' | 'foreclosure' | 'traditional';
    fetchComparables?: boolean;
    existingComparables?: ComparableSale[];
  };
}

export async function analyzePropertyFinancials(
  input: FinancialAnalysisInput
): Promise<FinancialAnalysis> {
  const {
    property,
    regridData,
    purchasePrice,
    riskScore,
    locationScore,
    marketScore,
    options = {},
  } = input;

  const {
    rehabScope = 'moderate',
    holdingMonths = 6,
    auctionType = 'tax_deed',
    fetchComparables: shouldFetch = true,
    existingComparables = [],
  } = options;

  // Step 1: Fetch or use existing comparables
  let rawComparables = existingComparables;
  if (shouldFetch && rawComparables.length === 0 && regridData?.latitude && regridData?.longitude) {
    rawComparables = await fetchComparables(
      property.address,
      regridData.latitude,
      regridData.longitude,
      1, // 1 mile radius
      15  // max 15 comps
    );
  }

  // Step 2: Analyze comparables
  const subjectProperty = {
    address: property.address,
    latitude: regridData?.latitude || 0,
    longitude: regridData?.longitude || 0,
    sqft: regridData?.building_sqft || property.sqft || 1500,
    lotSizeSqft: regridData?.lot_size_sqft || property.lotSizeSqft || 8000,
    bedrooms: regridData?.bedrooms || property.bedrooms || 3,
    bathrooms: regridData?.bathrooms || property.bathrooms || 1.5,
    yearBuilt: regridData?.year_built || property.yearBuilt || 1970,
    propertyType: regridData?.property_type || 'single_family',
  };

  const comparables = analyzeComparables(rawComparables, subjectProperty);

  // Step 3: Calculate ARV
  const arvAnalysis = calculateARV(
    comparables.comparables,
    subjectProperty
  );

  // Step 4: Calculate costs
  const costs = calculateTotalCosts(
    purchasePrice,
    property,
    regridData,
    {
      rehabScope,
      holdingMonths,
      auctionType,
      estimatedARV: arvAnalysis.estimatedARV,
    }
  );

  // Step 5: Calculate rental projection
  const monthlyTaxes = (property.annualTaxes || 3000) / 12;
  const monthlyInsurance = (arvAnalysis.estimatedARV || purchasePrice) * 0.005 / 12;

  const rental = calculateRentalProjection(
    arvAnalysis.estimatedARV || purchasePrice * 1.3,
    monthlyTaxes,
    monthlyInsurance,
    property.state || 'PA'
  );

  // Step 6: Build revenue projection
  const revenue = {
    sale: arvAnalysis,
    rental,
  };

  // Step 7: Calculate investment metrics
  const metrics = calculateInvestmentMetrics(
    costs,
    revenue,
    riskScore,
    holdingMonths
  );

  // Step 8: Generate recommendation
  const recommendation = generateRecommendation({
    metrics,
    costs,
    riskScore,
    locationScore,
    marketScore,
    comparablesConfidence: comparables.confidence,
  });

  // Step 9: Assess data quality
  const dataQuality = assessDataQuality(
    comparables,
    costs,
    regridData,
    property
  );

  return {
    costs,
    revenue,
    metrics,
    comparables,
    recommendation,
    analysisDate: new Date().toISOString(),
    confidenceLevel: recommendation.confidence,
    dataQuality,
  };
}

// Export all modules
export * from './types';
export * from './costEstimator';
export * from './roiCalculator';
export * from './comparablesAnalysis';
export * from './recommendationEngine';
```

## API Route

### Financial Analysis Endpoint

```typescript
// src/app/api/analysis/financial/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzePropertyFinancials } from '@/lib/analysis/financial';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    const {
      propertyId,
      purchasePrice,
      rehabScope = 'moderate',
      holdingMonths = 6,
      auctionType = 'tax_deed',
    } = body;

    if (!propertyId || !purchasePrice) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, purchasePrice' },
        { status: 400 }
      );
    }

    // Fetch property data
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*, counties(*)')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Fetch Regrid data
    const { data: regridData } = await supabase
      .from('regrid_data')
      .select('*')
      .eq('property_id', propertyId)
      .single();

    // Fetch existing scores (if available from a report)
    const { data: existingReport } = await supabase
      .from('property_reports')
      .select('risk_score, location_score, market_score')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const riskScore = existingReport?.risk_score || 15;
    const locationScore = existingReport?.location_score || 15;
    const marketScore = existingReport?.market_score || 15;

    // Fetch existing comparables from database
    const { data: existingComps } = await supabase
      .from('comparable_sales')
      .select('*')
      .eq('report_id', existingReport?.id);

    // Run financial analysis
    const analysis = await analyzePropertyFinancials({
      property: {
        ...property,
        state: property.counties?.state_code,
      },
      regridData,
      purchasePrice,
      riskScore,
      locationScore,
      marketScore,
      options: {
        rehabScope,
        holdingMonths,
        auctionType,
        existingComparables: existingComps || [],
      },
    });

    // Store comparables if new ones were fetched
    if (analysis.comparables.comparables.length > 0 && existingReport?.id) {
      const comparablesToStore = analysis.comparables.comparables.map(comp => ({
        report_id: existingReport.id,
        property_id: null, // External comp
        external_id: comp.id,
        address: comp.address,
        city: comp.city,
        state: comp.state,
        zip: comp.zip,
        sale_price: comp.salePrice,
        sale_date: comp.saleDate,
        sqft: comp.sqft,
        lot_size_sqft: comp.lotSizeSqft,
        bedrooms: comp.bedrooms,
        bathrooms: comp.bathrooms,
        year_built: comp.yearBuilt,
        property_type: comp.propertyType,
        price_per_sqft: comp.pricePerSqft,
        distance_miles: comp.distanceMiles,
        similarity_score: comp.similarityScore,
        raw_data: comp,
        source: comp.source,
      }));

      await supabase
        .from('comparable_sales')
        .upsert(comparablesToStore, {
          onConflict: 'report_id,external_id',
        });
    }

    return NextResponse.json({
      success: true,
      analysis,
    });

  } catch (error) {
    console.error('Financial analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze property financials' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Missing propertyId parameter' },
        { status: 400 }
      );
    }

    // Get latest report with financial data
    const { data: report, error } = await supabase
      .from('property_reports')
      .select(`
        *,
        comparable_sales(*)
      `)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: 'No financial analysis found for this property' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      financialData: report.report_data?.financialAnalysis || null,
      comparables: report.comparable_sales || [],
    });

  } catch (error) {
    console.error('Error fetching financial analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial analysis' },
      { status: 500 }
    );
  }
}
```

## UI Components

### Recommendation Card Component

```typescript
// src/components/reports/sections/RecommendationCard.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Target,
  DollarSign
} from 'lucide-react';
import { InvestmentRecommendation } from '@/lib/analysis/financial/types';
import { formatCurrency } from '@/lib/utils/format';

interface RecommendationCardProps {
  recommendation: InvestmentRecommendation;
}

const verdictConfig = {
  strong_buy: {
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle,
    label: 'Strong Buy',
    description: 'Excellent investment opportunity'
  },
  buy: {
    color: 'bg-green-400',
    textColor: 'text-green-600',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle,
    label: 'Buy',
    description: 'Good investment opportunity'
  },
  hold: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgLight: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle,
    label: 'Hold',
    description: 'Consider carefully before proceeding'
  },
  pass: {
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
    label: 'Pass',
    description: 'Not recommended at current price'
  },
  avoid: {
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgLight: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
    label: 'Avoid',
    description: 'High risk, not recommended'
  },
};

const exitStrategyLabels = {
  flip: 'Fix & Flip',
  rental: 'Buy & Hold Rental',
  wholesale: 'Wholesale Assignment',
  hold: 'Long-term Hold',
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const config = verdictConfig[recommendation.verdict];
  const VerdictIcon = config.icon;

  return (
    <Card className={`${config.bgLight} ${config.borderColor} border-2`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Investment Recommendation
          </div>
          <Badge className={config.color}>
            {recommendation.confidence}% confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Verdict Banner */}
        <div className={`${config.color} text-white p-6 rounded-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <VerdictIcon className="h-10 w-10" />
              <div>
                <div className="text-2xl font-bold">{config.label}</div>
                <div className="text-sm opacity-90">{config.description}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90">Maximum Bid</div>
              <div className="text-3xl font-bold">
                {formatCurrency(recommendation.maxBid)}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <DollarSign className="h-5 w-5 mx-auto text-gray-500 mb-1" />
            <div className="text-sm text-gray-500">Target Profit</div>
            <div className="text-lg font-semibold">
              {formatCurrency(recommendation.targetProfit)}
            </div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <TrendingUp className="h-5 w-5 mx-auto text-gray-500 mb-1" />
            <div className="text-sm text-gray-500">Exit Strategy</div>
            <div className="text-lg font-semibold">
              {exitStrategyLabels[recommendation.exitStrategy]}
            </div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <Clock className="h-5 w-5 mx-auto text-gray-500 mb-1" />
            <div className="text-sm text-gray-500">Timeline</div>
            <div className="text-lg font-semibold">
              {recommendation.timelineMonths} months
            </div>
          </div>
        </div>

        {/* Key Factors */}
        {recommendation.keyFactors.length > 0 && (
          <div>
            <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Key Factors
            </h4>
            <ul className="space-y-1">
              {recommendation.keyFactors.map((factor, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-500 mt-1">+</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Opportunities & Risks Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Opportunities */}
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-semibold text-green-700 mb-2">Opportunities</h4>
            <ul className="space-y-2">
              {recommendation.opportunities.map((opp, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {opp}
                </li>
              ))}
              {recommendation.opportunities.length === 0 && (
                <li className="text-sm text-gray-500">No significant opportunities identified</li>
              )}
            </ul>
          </div>

          {/* Risks */}
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-semibold text-red-700 mb-2">Risks</h4>
            <ul className="space-y-2">
              {recommendation.risks.map((risk, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  {risk}
                </li>
              ))}
              {recommendation.risks.length === 0 && (
                <li className="text-sm text-gray-500">No significant risks identified</li>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Data Quality Indicator Component

```typescript
// src/components/reports/sections/DataQualityIndicator.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Info,
  AlertTriangle,
  CheckCircle,
  Database
} from 'lucide-react';
import { DataQualityAssessment } from '@/lib/analysis/financial/types';

interface DataQualityIndicatorProps {
  quality: DataQualityAssessment;
}

export function DataQualityIndicator({ quality }: DataQualityIndicatorProps) {
  const getQualityLevel = (score: number) => {
    if (score >= 80) return { label: 'High', color: 'bg-green-500' };
    if (score >= 60) return { label: 'Medium', color: 'bg-yellow-500' };
    return { label: 'Low', color: 'bg-red-500' };
  };

  const overallLevel = getQualityLevel(quality.overallScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Quality
          </div>
          <Badge className={overallLevel.color}>
            {overallLevel.label} ({quality.overallScore}%)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score Bar */}
        <div>
          <div className="flex justify-between mb-1 text-sm">
            <span>Overall Score</span>
            <span className="font-medium">{quality.overallScore}%</span>
          </div>
          <Progress value={quality.overallScore} className="h-2" />
        </div>

        {/* Component Scores */}
        <div className="grid grid-cols-2 gap-3">
          <ComponentScore
            label="Comparables"
            score={quality.components.comparablesQuality}
          />
          <ComponentScore
            label="Cost Estimates"
            score={quality.components.costEstimateAccuracy}
          />
          <ComponentScore
            label="Market Data"
            score={quality.components.marketDataFreshness}
          />
          <ComponentScore
            label="Property Data"
            score={quality.components.propertyDataCompleteness}
          />
        </div>

        {/* Missing Data */}
        {quality.missingData.length > 0 && (
          <div className="bg-yellow-50 p-3 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Missing Data
            </h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {quality.missingData.map((item, i) => (
                <li key={i}>- {item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Assumptions Made */}
        {quality.assumptions.length > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Assumptions Made
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {quality.assumptions.map((assumption, i) => (
                <li key={i}>* {assumption}</li>
              ))}
            </ul>
          </div>
        )}

        {/* High Quality Indicator */}
        {quality.overallScore >= 80 && (
          <div className="bg-green-50 p-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-700">
              High-quality data supports reliable analysis
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComponentScore({ label, score }: { label: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-600';
    if (s >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-2 bg-gray-50 rounded">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-semibold ${getColor(score)}`}>
        {score}%
      </div>
    </div>
  );
}
```

## Usage Example

```typescript
// Example usage in a property report page
import { RecommendationCard } from '@/components/reports/sections/RecommendationCard';
import { DataQualityIndicator } from '@/components/reports/sections/DataQualityIndicator';

export function PropertyFinancialSection({ analysis }: { analysis: FinancialAnalysis }) {
  return (
    <div className="space-y-6">
      <RecommendationCard recommendation={analysis.recommendation} />
      <DataQualityIndicator quality={analysis.dataQuality} />
    </div>
  );
}
```

## Integration Notes

### Required Imports
- Phase 8A Cost Estimation: `calculateTotalCosts()`
- Phase 8B ROI Metrics: `calculateInvestmentMetrics()`
- Phase 8C Comparables: `analyzeComparables()`, `fetchComparables()`
- Phase 7 Risk Analysis: Risk scores (0-25)

### Database Tables Used
- `properties` - Property data
- `regrid_data` - Enriched property data
- `property_reports` - Stored analysis results
- `comparable_sales` - Stored comparables

### Environment Variables
```env
# Required for comparables fetching (if external API used)
COMPARABLES_API_KEY=your_api_key
COMPARABLES_API_URL=https://api.example.com
```

## Summary

Phase 8D provides the Investment Recommendation Engine that:
1. Evaluates properties against defined thresholds
2. Generates clear buy/hold/pass verdicts
3. Calculates maximum bid amounts using the 70% rule
4. Recommends exit strategies based on metrics
5. Identifies key factors, risks, and opportunities
6. Assesses data quality and documents assumptions
7. Provides UI components for displaying recommendations
