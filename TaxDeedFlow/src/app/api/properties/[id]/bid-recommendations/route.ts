/**
 * Bid Recommendations API Route - Phase 3
 *
 * Provides endpoints for generating and retrieving bid recommendations
 * for properties based on financial analysis, ARV estimates, and risk scores.
 *
 * GET /api/properties/[id]/bid-recommendations - Get or generate bid recommendation
 *
 * @module app/api/properties/[id]/bid-recommendations
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import {
  calculateBidRecommendation,
  validateBidRecommendationInput,
} from '@/lib/analysis/bidding/bidRecommendations';
import type {
  BidRecommendationInput,
  BidRecommendation,
} from '@/lib/analysis/bidding/types';

// ============================================
// GET Handler - Retrieve or Generate Bid Recommendation
// ============================================

/**
 * Get bid recommendation for a property
 *
 * Process:
 * 1. Check if recommendation already exists in database
 * 2. If exists, return cached recommendation
 * 3. If not exists, calculate new recommendation from financial analysis
 * 4. Store new recommendation in database
 * 5. Return recommendation
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing property ID
 * @returns JSON response with bid recommendation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const propertyId = params.id;

  try {
    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Step 1: Check for existing bid recommendation
    const { data: existingRecommendation, error: recommendationError } =
      await supabase
        .from('bid_strategy_recommendations')
        .select('*')
        .eq('property_id', propertyId)
        .single();

    // Handle database errors for existing recommendation lookup
    if (recommendationError && recommendationError.code !== 'PGRST116') {
      console.error('[API Bid Recommendations] Error fetching existing recommendation:', recommendationError);
      return NextResponse.json(
        { error: 'Database error', message: recommendationError.message },
        { status: 500 }
      );
    }

    // If recommendation exists, return it
    if (existingRecommendation && !recommendationError) {
      try {
        return NextResponse.json({
          success: true,
          data: transformDatabaseRecommendation(existingRecommendation),
          cached: true,
        });
      } catch (transformError) {
        console.error('[API Bid Recommendations] Error transforming cached recommendation:', transformError);
        // Continue to regenerate if cached data is corrupted
      }
    }

    // Step 2: Fetch property data
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select(
        `
        id,
        parcel_id,
        property_address,
        state_code,
        total_due,
        sale_date,
        county:counties(county_name)
      `
      )
      .eq('id', propertyId)
      .single();

    if (propertyError) {
      if (propertyError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        );
      }
      console.error('[API Bid Recommendations] Database error fetching property:', propertyError);
      return NextResponse.json(
        { error: 'Database error', message: propertyError.message },
        { status: 500 }
      );
    }

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Step 3: Fetch financial analysis (needed for ARV and costs)
    const { data: financialAnalysis, error: analysisError } = await supabase
      .from('property_financial_analysis')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (analysisError) {
      if (analysisError.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'Financial analysis required',
            message:
              'This property needs a financial analysis before bid recommendations can be generated. Please run financial analysis first.',
          },
          { status: 400 }
        );
      }
      console.error('[API Bid Recommendations] Database error fetching financial analysis:', analysisError);
      return NextResponse.json(
        { error: 'Database error', message: analysisError.message },
        { status: 500 }
      );
    }

    if (!financialAnalysis) {
      return NextResponse.json(
        {
          error: 'Financial analysis required',
          message:
            'This property needs a financial analysis before bid recommendations can be generated. Please run financial analysis first.',
        },
        { status: 400 }
      );
    }

    // Step 4: Fetch regrid data for additional context
    const { data: regridData, error: regridError } = await supabase
      .from('regrid_data')
      .select('assessed_value, market_value')
      .eq('property_id', propertyId)
      .single();

    // Log regrid errors but don't fail (regrid data is optional)
    if (regridError && regridError.code !== 'PGRST116') {
      console.error('[API Bid Recommendations] Warning: Error fetching regrid data:', regridError);
    }

    // Step 5: Extract data from financial analysis
    // Validate analysis_data exists and is properly structured
    if (!financialAnalysis.analysis_data || typeof financialAnalysis.analysis_data !== 'object') {
      console.error('[API Bid Recommendations] Invalid financial analysis data structure');
      return NextResponse.json(
        {
          error: 'Invalid financial analysis',
          message: 'Financial analysis data is corrupted or incomplete. Please regenerate the financial analysis.',
        },
        { status: 400 }
      );
    }

    const analysisData = financialAnalysis.analysis_data as any;
    const arv = analysisData?.revenue?.arv?.estimatedARV;
    const arvConfidence = analysisData?.revenue?.arv?.confidence || 'medium';
    const rehabCost = analysisData?.costs?.renovation?.totalCost || 0;
    const closingCosts = analysisData?.costs?.closing || 0;
    const holdingCosts = analysisData?.costs?.holding?.totalCost || 0;
    const dataQualityScore = analysisData?.dataQuality?.overallScore || 0.7;
    const riskScore = analysisData?.recommendation?.riskScore;
    const comparablesCount =
      analysisData?.revenue?.arv?.comparables?.length || 0;

    // Validate we have minimum required data
    if (!arv || arv <= 0) {
      return NextResponse.json(
        {
          error: 'Insufficient data',
          message:
            'Unable to calculate bid recommendation. ARV estimate is required but was not found in the financial analysis.',
        },
        { status: 400 }
      );
    }

    // Validate numeric values are actually numbers
    if (typeof arv !== 'number' || isNaN(arv)) {
      console.error('[API Bid Recommendations] Invalid ARV value:', arv);
      return NextResponse.json(
        {
          error: 'Invalid data',
          message: 'ARV estimate must be a valid number.',
        },
        { status: 400 }
      );
    }

    if (typeof rehabCost !== 'number' || isNaN(rehabCost) || rehabCost < 0) {
      console.error('[API Bid Recommendations] Invalid rehab cost:', rehabCost);
      return NextResponse.json(
        {
          error: 'Invalid data',
          message: 'Rehab cost must be a valid non-negative number.',
        },
        { status: 400 }
      );
    }

    // Validate opening bid (total_due) exists
    const openingBid = property.total_due;
    if (!openingBid || typeof openingBid !== 'number' || isNaN(openingBid) || openingBid <= 0) {
      console.error('[API Bid Recommendations] Invalid opening bid (total_due):', openingBid);
      return NextResponse.json(
        {
          error: 'Invalid property data',
          message: 'Property must have a valid opening bid amount (total_due).',
        },
        { status: 400 }
      );
    }

    // Step 6: Build bid recommendation input
    const recommendationInput: BidRecommendationInput = {
      propertyId,
      arv,
      arvConfidence,
      rehabCost,
      closingCosts,
      holdingCosts,
      targetROI: 25, // Default 25% ROI target
      openingBid,
      marketValue: regridData?.market_value,
      assessedValue: regridData?.assessed_value,
      comparablesCount,
      dataQualityScore,
      riskScore,
    };

    // Step 7: Validate input
    const validationErrors = validateBidRecommendationInput(recommendationInput);
    if (validationErrors.length > 0) {
      console.error('[API Bid Recommendations] Input validation failed:', validationErrors);
      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    // Step 8: Calculate bid recommendation
    let recommendation;
    try {
      recommendation = calculateBidRecommendation(recommendationInput);
    } catch (calcError) {
      console.error('[API Bid Recommendations] Calculation error:', calcError);
      return NextResponse.json(
        {
          error: 'Calculation failed',
          message: calcError instanceof Error ? calcError.message : 'Unable to calculate bid recommendation',
        },
        { status: 500 }
      );
    }

    // Validate calculation result
    if (!recommendation || !recommendation.bidRange) {
      console.error('[API Bid Recommendations] Invalid calculation result');
      return NextResponse.json(
        {
          error: 'Calculation failed',
          message: 'Bid recommendation calculation produced invalid results',
        },
        { status: 500 }
      );
    }

    // Step 9: Store recommendation in database
    let storedRecommendation = null;
    try {
      // Prepare database record following snake_case convention
      const dbRecord = {
        property_id: propertyId,
        max_bid_conservative: recommendation.bidRange.conservative,
        max_bid_moderate: recommendation.bidRange.moderate,
        max_bid_aggressive: recommendation.bidRange.aggressive,
        confidence_level: recommendation.confidenceLevel,
        roi_projection: recommendation.roiProjection || null,
        risk_warnings: recommendation.riskWarnings
          ? JSON.stringify(recommendation.riskWarnings)
          : null,
        calculation_basis: JSON.stringify(recommendation.calculationBasis),
        arv_estimate: recommendation.arvEstimate || null,
        rehab_cost_estimate: recommendation.rehabCostEstimate || null,
        closing_costs: recommendation.closingCosts || null,
        holding_costs: recommendation.holdingCosts || null,
        market_value: recommendation.marketValue || null,
        assessed_value: recommendation.assessedValue || null,
        comparable_properties_count: recommendation.comparablePropertiesCount || null,
        opening_bid: recommendation.openingBid || null,
        exceeds_max_bid: recommendation.exceedsMaxBid,
        recommendation_version: recommendation.recommendationVersion,
        calculation_method: recommendation.calculationMethod || null,
        data_quality_score: recommendation.dataQualityScore || null,
        risk_score: recommendation.riskScore || null,
      };

      // Use upsert to handle both insert and update cases
      // This will insert if property_id doesn't exist, update if it does
      const { data, error: storeError } = await supabase
        .from('bid_strategy_recommendations')
        .upsert(dbRecord, {
          onConflict: 'property_id',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (storeError) {
        console.error(
          '[API Bid Recommendations] Failed to store recommendation:',
          storeError
        );
        // Continue anyway - return the calculated recommendation
      } else {
        storedRecommendation = data;
      }
    } catch (storeException) {
      console.error(
        '[API Bid Recommendations] Exception storing recommendation:',
        storeException
      );
      // Continue anyway - return the calculated recommendation
    }

    // Step 10: Return recommendation
    const responseData: BidRecommendation = {
      id: storedRecommendation?.id || 'temp-' + Date.now(),
      propertyId: recommendation.propertyId,
      bidRange: recommendation.bidRange,
      confidenceLevel: recommendation.confidenceLevel,
      roiProjection: recommendation.roiProjection,
      riskWarnings: recommendation.riskWarnings || [],
      riskScore: recommendation.riskScore,
      calculationBasis: recommendation.calculationBasis,
      arvEstimate: recommendation.arvEstimate,
      rehabCostEstimate: recommendation.rehabCostEstimate,
      closingCosts: recommendation.closingCosts,
      holdingCosts: recommendation.holdingCosts,
      marketValue: recommendation.marketValue,
      assessedValue: recommendation.assessedValue,
      comparablePropertiesCount: recommendation.comparablePropertiesCount,
      openingBid: recommendation.openingBid,
      exceedsMaxBid: recommendation.exceedsMaxBid,
      recommendationVersion: recommendation.recommendationVersion,
      calculationMethod: recommendation.calculationMethod,
      dataQualityScore: recommendation.dataQualityScore,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
    });
  } catch (error) {
    console.error('[API Bid Recommendations] Server error:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        message:
          error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Transform database recommendation to API response format
 *
 * @param dbRecord - Database record from bid_strategy_recommendations table
 * @returns Transformed bid recommendation
 * @throws Error if transformation fails
 */
function transformDatabaseRecommendation(dbRecord: any): BidRecommendation {
  // Validate required fields
  if (!dbRecord) {
    throw new Error('Database record is null or undefined');
  }

  if (!dbRecord.id || !dbRecord.property_id) {
    throw new Error('Database record missing required fields (id, property_id)');
  }

  if (!dbRecord.max_bid_conservative || !dbRecord.max_bid_moderate || !dbRecord.max_bid_aggressive) {
    throw new Error('Database record missing required bid range values');
  }

  // Parse JSON fields safely
  let riskWarnings = [];
  if (dbRecord.risk_warnings) {
    try {
      riskWarnings = typeof dbRecord.risk_warnings === 'string'
        ? JSON.parse(dbRecord.risk_warnings)
        : dbRecord.risk_warnings;
    } catch (parseError) {
      console.error('[API Bid Recommendations] Failed to parse risk_warnings JSON:', parseError);
      riskWarnings = [];
    }
  }

  // Parse calculation_basis (required field)
  if (!dbRecord.calculation_basis) {
    throw new Error('Database record missing required calculation_basis field');
  }

  let calculationBasis;
  try {
    calculationBasis = typeof dbRecord.calculation_basis === 'string'
      ? JSON.parse(dbRecord.calculation_basis)
      : dbRecord.calculation_basis;
  } catch (parseError) {
    console.error('[API Bid Recommendations] Failed to parse calculation_basis JSON:', parseError);
    throw new Error('Invalid calculation_basis data in database');
  }

  return {
    id: dbRecord.id,
    propertyId: dbRecord.property_id,
    bidRange: {
      conservative: dbRecord.max_bid_conservative,
      moderate: dbRecord.max_bid_moderate,
      aggressive: dbRecord.max_bid_aggressive,
    },
    confidenceLevel: dbRecord.confidence_level,
    roiProjection: dbRecord.roi_projection,
    riskWarnings,
    riskScore: dbRecord.risk_score,
    calculationBasis,
    arvEstimate: dbRecord.arv_estimate,
    rehabCostEstimate: dbRecord.rehab_cost_estimate,
    closingCosts: dbRecord.closing_costs,
    holdingCosts: dbRecord.holding_costs,
    marketValue: dbRecord.market_value,
    assessedValue: dbRecord.assessed_value,
    comparablePropertiesCount: dbRecord.comparable_properties_count,
    openingBid: dbRecord.opening_bid,
    exceedsMaxBid: dbRecord.exceeds_max_bid,
    recommendationVersion: dbRecord.recommendation_version,
    calculationMethod: dbRecord.calculation_method,
    dataQualityScore: dbRecord.data_quality_score,
    createdAt: new Date(dbRecord.created_at),
    updatedAt: new Date(dbRecord.updated_at),
  };
}
