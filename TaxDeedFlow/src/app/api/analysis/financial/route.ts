/**
 * Financial Analysis API Route - Phase 8D
 *
 * Provides endpoints for running financial analysis on properties
 * and retrieving cached analysis results.
 *
 * POST /api/analysis/financial - Run new analysis
 * GET /api/analysis/financial?propertyId=xxx - Get cached analysis
 *
 * @module app/api/analysis/financial
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import {
  analyzePropertyFinancials,
  quickAnalysis,
  type FinancialAnalysisInput,
  type FinancialAnalysis,
} from '@/lib/analysis/financial';
import type { RehabScope } from '@/types/costs';

// ============================================
// Supabase Client
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// Request Validation Schemas
// ============================================

const AnalysisRequestSchema = z.object({
  propertyId: z.string().uuid(),
  purchasePrice: z.number().positive(),
  riskScore: z.number().min(0).max(25).optional().default(15),
  locationScore: z.number().min(0).max(25).optional().default(15),
  marketScore: z.number().min(0).max(25).optional().default(15),
  options: z
    .object({
      rehabScope: z
        .enum(['cosmetic', 'light', 'moderate', 'heavy', 'gut'])
        .optional(),
      holdingMonths: z.number().min(1).max(36).optional(),
      auctionType: z
        .enum(['tax_deed', 'tax_lien', 'foreclosure', 'traditional'])
        .optional(),
      fetchComparables: z.boolean().optional(),
    })
    .optional(),
});

const QuickAnalysisRequestSchema = z.object({
  purchasePrice: z.number().positive(),
  estimatedARV: z.number().positive(),
  rehabEstimate: z.number().min(0),
  riskScore: z.number().min(0).max(25).optional(),
  locationScore: z.number().min(0).max(25).optional(),
  marketScore: z.number().min(0).max(25).optional(),
});

// ============================================
// POST Handler - Run Analysis
// ============================================

/**
 * Run financial analysis on a property
 *
 * @param request - Next.js request object
 * @returns JSON response with analysis results
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Check if this is a quick analysis request
    if (body.estimatedARV !== undefined) {
      return handleQuickAnalysis(body);
    }

    // Validate full analysis request
    const validationResult = AnalysisRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { propertyId, purchasePrice, riskScore, locationScore, marketScore, options } =
      validationResult.data;

    // Fetch property data from Supabase
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select(
        `
        id,
        parcel_id,
        property_address,
        state_code,
        total_due,
        county:counties(county_name)
      `
      )
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found', details: propertyError?.message },
        { status: 404 }
      );
    }

    // Fetch regrid data if available
    const { data: regridData } = await supabase
      .from('regrid_data')
      .select(
        `
        building_sqft,
        year_built,
        lot_size_sqft,
        bedrooms,
        bathrooms,
        property_type,
        assessed_value,
        latitude,
        longitude
      `
      )
      .eq('property_id', propertyId)
      .single();

    // Build analysis input
    const analysisInput: FinancialAnalysisInput = {
      property: {
        id: property.id,
        address: property.property_address || '',
        state: property.state_code,
        county: (property.county as unknown as { county_name: string } | null)?.county_name ?? '',
        sqft: regridData?.building_sqft,
        lotSizeSqft: regridData?.lot_size_sqft,
        bedrooms: regridData?.bedrooms,
        bathrooms: regridData?.bathrooms,
        yearBuilt: regridData?.year_built,
        propertyType: regridData?.property_type,
        annualTaxes: undefined, // Could be fetched separately
        totalDue: property.total_due,
      },
      regridData: regridData
        ? {
            building_sqft: regridData.building_sqft,
            year_built: regridData.year_built,
            lot_size_sqft: regridData.lot_size_sqft,
            bedrooms: regridData.bedrooms,
            bathrooms: regridData.bathrooms,
            property_type: regridData.property_type,
            assessed_value: regridData.assessed_value,
            latitude: regridData.latitude,
            longitude: regridData.longitude,
          }
        : undefined,
      purchasePrice,
      riskScore,
      locationScore,
      marketScore,
      options: {
        rehabScope: options?.rehabScope as RehabScope,
        holdingMonths: options?.holdingMonths,
        auctionType: options?.auctionType,
        fetchComparables: options?.fetchComparables,
      },
    };

    // Run analysis
    const analysis = await analyzePropertyFinancials(analysisInput);

    // Store analysis result in database
    const { error: upsertError } = await supabase.from('property_financial_analysis').upsert(
      {
        property_id: propertyId,
        purchase_price: purchasePrice,
        analysis_data: analysis,
        recommendation_verdict: analysis.recommendation.verdict,
        recommendation_confidence: analysis.recommendation.confidence,
        max_bid: analysis.recommendation.maxBid,
        target_profit: analysis.recommendation.targetProfit,
        exit_strategy: analysis.recommendation.exitStrategy,
        data_quality_score: analysis.dataQuality.overallScore,
        risk_score_input: riskScore,
        location_score_input: locationScore,
        market_score_input: marketScore,
        rehab_scope: options?.rehabScope || 'moderate',
        holding_months: options?.holdingMonths || 6,
        analyzed_at: new Date().toISOString(),
      },
      {
        onConflict: 'property_id',
      }
    );

    if (upsertError) {
      console.error('Error storing analysis:', upsertError);
      // Continue - don't fail the request if storage fails
    }

    return NextResponse.json({
      success: true,
      propertyId,
      analysis,
    });
  } catch (error) {
    console.error('Financial analysis error:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle quick analysis requests (no property ID required)
 * Returns a full FinancialAnalysis object for use with FinancialDashboard
 */
async function handleQuickAnalysis(body: unknown): Promise<NextResponse> {
  const validationResult = QuickAnalysisRequestSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: 'Invalid quick analysis request',
        details: validationResult.error.errors,
      },
      { status: 400 }
    );
  }

  const { purchasePrice, estimatedARV, rehabEstimate, riskScore = 15, locationScore = 15, marketScore = 15 } =
    validationResult.data;

  // Detect vacant land - no building means no rehab costs
  const isVacantLand = rehabEstimate === 0;

  try {
    const quickResult = await quickAnalysis(
      purchasePrice,
      estimatedARV,
      rehabEstimate,
      riskScore,
      locationScore,
      marketScore
    );

    // Build a full FinancialAnalysis object from quick analysis results
    const holdingMonths = 6;
    const sellingCostsPct = 0.08;
    // For vacant land, no staging costs (nothing to stage)
    const stagingCost = isVacantLand ? 0 : 1500;
    const sellingCosts = estimatedARV * 0.06 + estimatedARV * 0.02 + stagingCost + 500; // commission + closing + staging + marketing
    const holdingCosts = isVacantLand ? purchasePrice * 0.05 : purchasePrice * 0.10; // Lower holding for vacant land
    const totalInvestment = purchasePrice + rehabEstimate + holdingCosts;
    const netProfit = estimatedARV - totalInvestment - sellingCosts;

    const fullAnalysis: FinancialAnalysis = {
      costs: {
        acquisition: {
          bidAmount: purchasePrice,
          buyersPremium: purchasePrice * 0.05,
          transferTax: purchasePrice * 0.01,
          recordingFees: 250,
          titleSearch: 500,
          titleInsurance: 0,
          legalFees: 750,
          totalAcquisition: purchasePrice * 1.06 + 1500,
        },
        rehab: {
          exterior: { roof: 0, siding: 0, windows: rehabEstimate * 0.1, doors: 0, landscaping: rehabEstimate * 0.05, hardscape: 0, total: rehabEstimate * 0.15 },
          interior: {
            flooring: rehabEstimate * 0.2,
            paint: rehabEstimate * 0.1,
            kitchen: rehabEstimate * 0.25,
            bathrooms: rehabEstimate * 0.15,
            electrical: rehabEstimate * 0.05,
            plumbing: rehabEstimate * 0.05,
            hvac: rehabEstimate * 0.03,
            fixtures: rehabEstimate * 0.02,
            total: rehabEstimate * 0.85,
          },
          structural: { foundation: 0, framing: 0, insulation: 0, total: 0 },
          permits: rehabEstimate * 0.02,
          laborMultiplier: 1.0,
          materialMultiplier: 1.0,
          totalRehab: rehabEstimate,
        },
        holding: {
          monthlyTaxes: purchasePrice * 0.02 / 12,
          monthlyInsurance: 150,
          monthlyUtilities: 200,
          monthlyMaintenance: 100,
          monthlyLoanPayment: 0,
          monthlyHoa: 0,
          totalMonthly: (purchasePrice * 0.02 / 12) + 450,
          holdingPeriodMonths: holdingMonths,
          totalHolding: holdingCosts,
        },
        selling: {
          agentCommission: estimatedARV * 0.06,
          closingCosts: estimatedARV * 0.02,
          staging: stagingCost, // $0 for vacant land
          marketing: 500,
          homeWarranty: 0,
          sellerConcessions: 0,
          totalSelling: sellingCosts,
        },
        totalCosts: totalInvestment + sellingCosts,
        contingency: (totalInvestment + sellingCosts) * 0.10,
        grandTotal: (totalInvestment + sellingCosts) * 1.10,
        confidence: 'medium' as const,
        dataQuality: 70,
        warnings: ['Estimates based on quick analysis with limited data'],
      },
      revenue: {
        sale: {
          estimatedARV,
          lowEstimate: estimatedARV * 0.90,
          highEstimate: estimatedARV * 1.10,
          pricePerSqft: 100, // Default estimate
          comparablesUsed: 0,
          confidence: 'medium' as const,
        },
        rental: {
          monthlyRent: Math.round(estimatedARV * 0.008),
          annualGrossRent: Math.round(estimatedARV * 0.008 * 12),
          vacancyRate: 0.08,
          effectiveGrossIncome: Math.round(estimatedARV * 0.008 * 12 * 0.92),
          annualOperatingExpenses: Math.round(estimatedARV * 0.008 * 12 * 0.92 * 0.40),
          noi: Math.round(estimatedARV * 0.008 * 12 * 0.92 * 0.60),
          monthlyCashFlow: Math.round(estimatedARV * 0.008 * 12 * 0.92 * 0.60 / 12),
          annualCashFlow: Math.round(estimatedARV * 0.008 * 12 * 0.92 * 0.60),
        },
      },
      metrics: {
        roi: quickResult.roi,
        profitMargin: (netProfit / estimatedARV) * 100,
        priceToARV: purchasePrice / estimatedARV,
        totalInvestmentToARV: totalInvestment / estimatedARV,
        cashOnCash: (netProfit / totalInvestment) * 100,
        netProfit,
        grossProfit: estimatedARV - purchasePrice,
        breakEvenPrice: totalInvestment + sellingCosts,
        irr: quickResult.roi * 2, // Annualized estimate
        capRate: (estimatedARV * 0.008 * 12 * 0.92 * 0.60) / totalInvestment * 100,
      },
      comparables: {
        comparables: [],
        estimatedARV,
        arvLowRange: estimatedARV * 0.90,
        arvHighRange: estimatedARV * 1.10,
        averagePricePerSqft: 100,
        medianPricePerSqft: 100,
        comparablesCount: 0,
        searchRadiusMiles: 1,
        confidence: 'low' as const,
        dataSource: 'user_input',
        notes: ['ARV provided by user - no comparable sales analyzed'],
      },
      recommendation: {
        verdict: quickResult.verdict as 'strong_buy' | 'buy' | 'hold' | 'pass' | 'avoid',
        confidence: quickResult.confidence,
        maxBid: quickResult.maxBid,
        targetProfit: netProfit * 0.8, // Conservative target
        keyFactors: [
          `${quickResult.roi.toFixed(1)}% ROI ${quickResult.roi >= 20 ? 'exceeds' : 'below'} 20% threshold`,
          `Purchase at ${((purchasePrice / estimatedARV) * 100).toFixed(0)}% of ARV`,
        ],
        risks: [
          'Estimates based on limited data',
          'Actual rehab costs may vary',
        ],
        opportunities: [
          'Strong rental fallback if market shifts',
        ],
        exitStrategy: 'flip' as const,
        timelineMonths: holdingMonths,
      },
      analysisDate: new Date().toISOString(),
      confidenceLevel: quickResult.confidence,
      dataQuality: {
        overallScore: 60,
        components: {
          comparablesQuality: 20,
          costEstimateAccuracy: 70,
          marketDataFreshness: 80,
          propertyDataCompleteness: 50,
        },
        missingData: ['Comparable sales', 'Property details', 'Actual condition'],
        assumptions: [
          'Moderate rehab scope assumed',
          'Standard holding costs estimated',
        ],
      },
    };

    return NextResponse.json({
      success: true,
      quick: true,
      analysis: fullAnalysis,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Quick analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET Handler - Retrieve Cached Analysis
// ============================================

/**
 * Get cached financial analysis for a property
 *
 * @param request - Next.js request object
 * @returns JSON response with cached analysis
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return NextResponse.json(
        { error: 'propertyId query parameter is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return NextResponse.json({ error: 'Invalid propertyId format' }, { status: 400 });
    }

    // Fetch cached analysis
    const { data: cachedAnalysis, error } = await supabase
      .from('property_financial_analysis')
      .select('*')
      .eq('property_id', propertyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return NextResponse.json(
          {
            error: 'No analysis found for this property',
            propertyId,
          },
          { status: 404 }
        );
      }
      throw error;
    }

    // Check if analysis is stale (older than 7 days)
    const analyzedAt = new Date(cachedAnalysis.analyzed_at);
    const daysSinceAnalysis = (Date.now() - analyzedAt.getTime()) / (1000 * 60 * 60 * 24);
    const isStale = daysSinceAnalysis > 7;

    return NextResponse.json({
      success: true,
      propertyId,
      isStale,
      daysSinceAnalysis: Math.floor(daysSinceAnalysis),
      analysis: cachedAnalysis.analysis_data as FinancialAnalysis,
      summary: {
        verdict: cachedAnalysis.recommendation_verdict,
        confidence: cachedAnalysis.recommendation_confidence,
        maxBid: cachedAnalysis.max_bid,
        targetProfit: cachedAnalysis.target_profit,
        exitStrategy: cachedAnalysis.exit_strategy,
        dataQuality: cachedAnalysis.data_quality_score,
      },
      analyzedAt: cachedAnalysis.analyzed_at,
    });
  } catch (error) {
    console.error('Error retrieving analysis:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
