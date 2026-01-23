/**
 * Property Imagery Analysis API Route - Phase 3 (Virtual Property Tours)
 *
 * Provides endpoints for running AI-powered imagery analysis on properties
 * using satellite and street view imagery with GPT-4o vision.
 *
 * POST /api/analysis/property-imagery - Run new imagery analysis
 * GET /api/analysis/property-imagery?propertyId=xxx - Get cached analysis
 *
 * @module app/api/analysis/property-imagery
 * @author Claude Code Agent
 * @date 2026-01-22
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import {
  getOpenAIService,
  type PropertyImageryAnalysisRequest,
  type PropertyImageryAnalysisResponse,
  type PropertyImageryAnalysisType,
} from '@/lib/api/services/openai-service';

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
  imageUrls: z.array(z.string().url()).min(1, 'At least one image URL is required'),
  analysisType: z.enum(['satellite', 'street_view', 'combined']),
  options: z
    .object({
      includePropertyContext: z.boolean().optional().default(true),
      satelliteImageUrl: z.string().url().optional(),
      streetViewImageUrl: z.string().url().optional(),
    })
    .optional(),
});

// ============================================
// POST Handler - Run Imagery Analysis
// ============================================

/**
 * Run AI-powered imagery analysis on a property
 *
 * @param request - Next.js request object
 * @returns JSON response with analysis results
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate request
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

    const { propertyId, imageUrls, analysisType, options } = validationResult.data;

    // Fetch property data for context
    let propertyContext = undefined;
    if (options?.includePropertyContext !== false) {
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select(
          `
          id,
          parcel_id,
          property_address,
          property_type,
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

      // Fetch regrid data for additional context
      const { data: regridData } = await supabase
        .from('regrid_data')
        .select(
          `
          year_built,
          property_type
        `
        )
        .eq('property_id', propertyId)
        .single();

      propertyContext = {
        address: property.property_address || undefined,
        parcelId: property.parcel_id || undefined,
        propertyType: regridData?.property_type || property.property_type || undefined,
        yearBuilt: regridData?.year_built || undefined,
      };
    }

    // Build analysis request
    const analysisRequest: PropertyImageryAnalysisRequest = {
      propertyId,
      imageUrls,
      analysisType: analysisType as PropertyImageryAnalysisType,
      propertyContext,
    };

    // Run analysis using OpenAI service
    const openaiService = getOpenAIService();
    const analysisResponse = await openaiService.analyzePropertyImages(analysisRequest);

    // Check if analysis succeeded (ApiResponse returns data or throws error)
    if (!analysisResponse.data) {
      return NextResponse.json(
        {
          error: 'Analysis failed',
          details: 'No analysis data returned',
        },
        { status: 500 }
      );
    }

    const analysis = analysisResponse.data;

    // Extract structured data for database storage
    const conditionFlags = analysis.conditionFlags || [];
    const visibleIssuesText = analysis.visibleIssues
      .map((issue) => `${issue.category}: ${issue.description} (${issue.severity})`)
      .join('; ');

    // Determine roof condition from findings
    const roofCondition = analysis.findings.roofCondition || 'not_visible';

    // Check for structural damage flags
    const hasStructuralDamage = conditionFlags.some((flag) =>
      ['structural_damage', 'fire_damage', 'water_damage'].includes(flag)
    );

    // Check for vegetation overgrowth
    const hasVegetationOvergrowth = conditionFlags.includes('overgrowth') ||
      analysis.findings.landscapingCondition === 'overgrown';

    // Check for abandonment indicators
    const hasAbandonmentIndicators = conditionFlags.some((flag) =>
      ['debris', 'vandalism', 'poor_condition'].includes(flag)
    );

    // Store analysis in database using upsert function
    const { data: storedAnalysis, error: upsertError } = await supabase.rpc(
      'upsert_imagery_analysis',
      {
        p_property_id: propertyId,
        p_analysis_type: analysisType,
        p_ai_model: analysis.aiModel,
        p_findings_json: analysis.findings as unknown as Record<string, unknown>,
        p_condition_flags: conditionFlags,
        p_visible_issues: visibleIssuesText || 'No significant issues detected',
        p_recommendation: analysis.recommendation,
        p_confidence_score: analysis.confidenceScore,
        p_satellite_image_url: options?.satelliteImageUrl || null,
        p_street_view_image_url: options?.streetViewImageUrl || null,
        p_roof_condition: roofCondition,
        p_vegetation_overgrowth: hasVegetationOvergrowth,
        p_structural_damage: hasStructuralDamage,
        p_abandonment_indicators: hasAbandonmentIndicators,
      }
    );

    if (upsertError) {
      console.error('[Property Imagery API] Failed to store analysis:', upsertError);
      // Don't fail the request, but log the error
    }

    // Return analysis results
    return NextResponse.json(
      {
        success: true,
        data: {
          ...analysis,
          analysisId: storedAnalysis,
          storedInDatabase: !upsertError,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Property Imagery API] Unhandled error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET Handler - Retrieve Cached Analysis
// ============================================

/**
 * Retrieve cached property imagery analysis
 *
 * @param request - Next.js request object
 * @returns JSON response with cached analysis or 404
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const analysisType = searchParams.get('analysisType');

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Missing required parameter: propertyId' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      return NextResponse.json(
        { error: 'Invalid propertyId format (must be UUID)' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('property_imagery_analysis')
      .select('*')
      .eq('property_id', propertyId)
      .order('analyzed_at', { ascending: false });

    // Filter by analysis type if provided
    if (analysisType) {
      if (!['satellite', 'street_view', 'combined'].includes(analysisType)) {
        return NextResponse.json(
          { error: 'Invalid analysisType (must be satellite, street_view, or combined)' },
          { status: 400 }
        );
      }
      query = query.eq('analysis_type', analysisType);
    }

    // Get the most recent analysis
    const { data: analysis, error: fetchError } = await query.limit(1).single();

    if (fetchError || !analysis) {
      return NextResponse.json(
        {
          success: false,
          error: 'No analysis found for this property',
          details: fetchError?.message,
        },
        { status: 404 }
      );
    }

    // Return cached analysis
    return NextResponse.json(
      {
        success: true,
        data: {
          id: analysis.id,
          propertyId: analysis.property_id,
          analysisType: analysis.analysis_type,
          aiModel: analysis.ai_model,
          findings: analysis.findings_json,
          conditionFlags: analysis.condition_flags,
          visibleIssues: analysis.visible_issues,
          recommendation: analysis.recommendation,
          confidenceScore: analysis.confidence_score,
          satelliteImageUrl: analysis.satellite_image_url,
          streetViewImageUrl: analysis.street_view_image_url,
          roofCondition: analysis.roof_condition,
          vegetationOvergrowth: analysis.vegetation_overgrowth,
          structuralDamage: analysis.structural_damage,
          abandonmentIndicators: analysis.abandonment_indicators,
          changesDetected: analysis.changes_detected,
          changeSummary: analysis.change_summary,
          changeSeverity: analysis.change_severity,
          analyzedAt: analysis.analyzed_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Property Imagery API] GET error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
