/**
 * Visual Validation API Route - Property Investability Screening
 *
 * Uses GPT-4o vision to analyse satellite, map, street-level, and Regrid
 * imagery of a property to determine whether it is suitable for tax deed
 * investment (APPROVED / CAUTION / REJECTED).
 *
 * POST /api/analysis/visual-validation  - Run new AI screening
 * GET  /api/analysis/visual-validation  - Retrieve cached validation
 *
 * @module app/api/analysis/visual-validation
 * @author Claude Code Agent
 * @date 2026-01-31
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import {
  getOpenAIService,
  type VisualValidationImage,
  type VisualValidationPropertyContext,
  type VisualValidationResult,
} from '@/lib/api/services/openai-service';

// ============================================
// Constants
// ============================================

/** Google Maps Static API base URL */
const GOOGLE_STATIC_MAP_BASE = 'https://maps.googleapis.com/maps/api/staticmap';
/** Google Street View Static API base URL */
const GOOGLE_STREETVIEW_BASE = 'https://maps.googleapis.com/maps/api/streetview';
/** Image dimensions for all Google Maps requests */
const IMAGE_SIZE = '640x400';
/** AI model used for investability screening */
const AI_MODEL = 'gpt-4o';

// ============================================
// Supabase Client (Lazy Initialization)
// ============================================

/**
 * Create a Supabase client with the service role key for server-side
 * operations. Returns null when env vars are missing so the caller can
 * respond with a configuration error.
 */
function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================
// Request Validation Schemas
// ============================================

/** Schema for the POST request body */
const PostRequestSchema = z.object({
  propertyId: z.string().uuid('propertyId must be a valid UUID'),
  forceRevalidate: z.boolean().optional().default(false),
});

/** Regex for a standard UUID (used in GET validation) */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================
// Helper: Build Google Maps Image URLs
// ============================================

/**
 * Build the four image URLs needed for investability analysis.
 *
 * @param lat - Latitude of the property
 * @param lng - Longitude of the property
 * @param googleApiKey - Google Maps Static API key
 * @param regridScreenshotUrl - Regrid aerial screenshot URL (required)
 * @returns Array of VisualValidationImage objects (always 4 entries)
 */
function buildImageArray(
  lat: number,
  lng: number,
  googleApiKey: string,
  regridScreenshotUrl: string
): VisualValidationImage[] {
  const satelliteUrl = `${GOOGLE_STATIC_MAP_BASE}?center=${lat},${lng}&zoom=19&size=${IMAGE_SIZE}&maptype=satellite&key=${googleApiKey}`;
  const mapUrl = `${GOOGLE_STATIC_MAP_BASE}?center=${lat},${lng}&zoom=17&size=${IMAGE_SIZE}&maptype=roadmap&key=${googleApiKey}`;
  const streetViewUrl = `${GOOGLE_STREETVIEW_BASE}?size=${IMAGE_SIZE}&location=${lat},${lng}&heading=90&key=${googleApiKey}`;

  // All 4 images are required for complete investability analysis.
  // The caller must verify regridScreenshotUrl is present before calling.
  const images: VisualValidationImage[] = [
    { url: satelliteUrl, type: 'satellite', detail: 'high' },
    { url: mapUrl, type: 'map', detail: 'low' },
    { url: streetViewUrl, type: 'street_view', detail: 'high' },
    { url: regridScreenshotUrl, type: 'regrid', detail: 'high' },
  ];

  return images;
}

// ============================================
// Helper: Map VisualValidationResult -> lot_shape
// ============================================

/**
 * Derive a lot_shape string from the AI result. The AI does not return a
 * dedicated lot shape field; we infer it from red flags and concerns.
 */
function deriveLotShape(result: VisualValidationResult): string {
  const allFlags = [...result.redFlags, ...result.concerns].map((f) => f.toLowerCase());

  if (allFlags.some((f) => f.includes('sliver') || f.includes('narrow strip'))) {
    return 'sliver';
  }
  if (allFlags.some((f) => f.includes('irregular') || f.includes('flag-shaped') || f.includes('flag lot'))) {
    return 'irregular';
  }
  // Default assumption when no shape concerns are flagged
  return 'regular';
}

// ============================================
// POST Handler - Run Visual Validation
// ============================================

/**
 * Run AI-powered investability screening on a property.
 *
 * Flow:
 * 1. Validate request body (propertyId, forceRevalidate)
 * 2. Return cached result when available (unless forceRevalidate)
 * 3. Fetch property + regrid data for coordinates
 * 4. Reject if Regrid screenshot is missing (all 4 images required)
 * 5. Build 4 image URLs from lat/lng
 * 5. Call analyzePropertyInvestability() via OpenAI service
 * 6. Persist result via upsert_visual_validation RPC
 * 7. Return structured JSON response
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ---- Supabase client --------------------------------------------------
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database configuration error. Missing Supabase credentials.' },
        { status: 500 }
      );
    }

    // ---- Parse and validate request body ----------------------------------
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = PostRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { propertyId, forceRevalidate } = validation.data;

    // ---- Check cache (skip when forceRevalidate is true) ------------------
    if (!forceRevalidate) {
      const { data: cached, error: cacheErr } = await supabase
        .from('property_visual_validation')
        .select('*')
        .eq('property_id', propertyId)
        .order('validated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cacheErr && cached) {
        return NextResponse.json(
          {
            success: true,
            cached: true,
            data: mapDbRowToResponse(cached),
          },
          { status: 200 }
        );
      }
    }

    // ---- Fetch property and regrid data -----------------------------------
    const { data: property, error: propErr } = await supabase
      .from('properties')
      .select('id, parcel_id, property_address, property_type, latitude, longitude')
      .eq('id', propertyId)
      .single();

    if (propErr || !property) {
      return NextResponse.json(
        {
          success: false,
          error: 'Property not found',
          details: propErr?.message,
        },
        { status: 404 }
      );
    }

    // Fetch regrid data for enriched context and possible coordinates fallback
    const { data: regridData } = await supabase
      .from('regrid_data')
      .select('latitude, longitude, screenshot_url, property_type, zoning, lot_size_acres')
      .eq('property_id', propertyId)
      .maybeSingle();

    // Resolve lat/lng: prefer regrid, fall back to properties table
    const lat = regridData?.latitude ?? property.latitude;
    const lng = regridData?.longitude ?? property.longitude;

    if (lat == null || lng == null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Property lacks coordinates. Regrid data required.',
          details:
            'Neither the properties table nor regrid_data contains latitude/longitude for this property. ' +
            'Run the Regrid scraper first to obtain coordinates.',
        },
        { status: 400 }
      );
    }

    // ---- Validate Google Maps API key is present --------------------------
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.',
        },
        { status: 500 }
      );
    }

    // ---- Require Regrid screenshot for complete analysis -------------------
    const regridScreenshotUrl: string | null = regridData?.screenshot_url ?? null;

    if (!regridScreenshotUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Regrid screenshot required. All 4 images (satellite, map, street view, regrid) are needed for complete analysis.',
          missingImages: ['regrid'],
        },
        { status: 400 }
      );
    }

    // ---- Build image URLs (all 4 guaranteed present) --------------------
    const images = buildImageArray(
      Number(lat),
      Number(lng),
      googleApiKey,
      regridScreenshotUrl
    );

    // ---- Build property context for the AI model --------------------------
    // Lot size: prefer regrid lot_size_acres, fall back to ll_gisacre
    const lotSizeAcres = regridData?.lot_size_acres;
    const lotSizeStr = lotSizeAcres != null ? `${lotSizeAcres} acres` : undefined;

    const propertyContext: VisualValidationPropertyContext = {
      address: property.property_address ?? undefined,
      parcelId: property.parcel_id ?? undefined,
      lotSize: lotSizeStr,
      propertyType: regridData?.property_type ?? property.property_type ?? undefined,
      zoning: regridData?.zoning ?? undefined,
    };

    // ---- Call the OpenAI investability analysis ---------------------------
    const openaiService = getOpenAIService();
    let result: VisualValidationResult;
    let tokensUsed: number;

    try {
      const analysis = await openaiService.analyzePropertyInvestability(images, propertyContext);
      result = analysis.result;
      tokensUsed = analysis.tokensUsed;
    } catch (aiError) {
      console.error('[Visual Validation API] OpenAI analysis failed:', aiError);
      return NextResponse.json(
        {
          success: false,
          error: 'AI analysis failed',
          details: aiError instanceof Error ? aiError.message : 'Unknown OpenAI error',
        },
        { status: 500 }
      );
    }

    // ---- Construct the individual image URLs for storage ------------------
    const satelliteImageUrl = images.find((i) => i.type === 'satellite')?.url ?? null;
    const mapImageUrl = images.find((i) => i.type === 'map')?.url ?? null;
    const streetViewUrl = images.find((i) => i.type === 'street_view')?.url ?? null;
    const googleMapsUrl = `https://www.google.com/maps/@${lat},${lng},19z`;

    // ---- Persist via Supabase RPC -----------------------------------------
    // DB constraint uses 'REJECT' but AI may return 'REJECTED' - normalize
    const dbStatus = result.status === 'REJECTED' ? 'REJECT' : result.status;

    const { data: validationId, error: rpcError } = await supabase.rpc(
      'upsert_visual_validation',
      {
        p_property_id: propertyId,
        p_validation_status: dbStatus,
        p_confidence_score: result.confidence,
        p_structure_present: result.structurePresent,
        p_road_access: result.roadAccess,
        p_land_use_observed: result.landUseObserved,
        p_lot_shape: deriveLotShape(result),
        p_red_flags: result.redFlags,
        p_skip_reason: dbStatus === 'REJECT' ? result.redFlags.join('; ') : null,
        p_images_analyzed: {
          satellite: !!satelliteImageUrl,
          map: !!mapImageUrl,
          street_view: !!streetViewUrl,
          regrid: !!regridScreenshotUrl,
          total: images.length,
        },
        p_regrid_screenshot_url: regridScreenshotUrl,
        p_google_maps_url: googleMapsUrl,
        p_street_view_url: streetViewUrl,
        p_zillow_url: null,
        p_findings: {
          status: result.status,
          confidence: result.confidence,
          summary: result.summary,
          positives: result.positives,
          concerns: result.concerns,
          redFlags: result.redFlags,
          recommendation: result.recommendation,
          propertyType: result.propertyType,
          structurePresent: result.structurePresent,
          roadAccess: result.roadAccess,
          landUseObserved: result.landUseObserved,
        },
        p_notes: result.summary,
        p_ai_model: AI_MODEL,
        p_ai_tokens_used: tokensUsed,
        p_image_count: images.length,
        p_satellite_image_url: satelliteImageUrl,
        p_map_image_url: mapImageUrl,
      }
    );

    if (rpcError) {
      console.error('[Visual Validation API] Failed to persist result:', rpcError);
      // Do not fail the request -- the AI result is still useful
    }

    // ---- Return response --------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        cached: false,
        data: {
          validationId: validationId ?? null,
          storedInDatabase: !rpcError,
          propertyId,
          status: result.status,
          confidence: result.confidence,
          summary: result.summary,
          positives: result.positives,
          concerns: result.concerns,
          redFlags: result.redFlags,
          recommendation: result.recommendation,
          propertyType: result.propertyType,
          structurePresent: result.structurePresent,
          roadAccess: result.roadAccess,
          landUseObserved: result.landUseObserved,
          lotShape: deriveLotShape(result),
          aiModel: AI_MODEL,
          tokensUsed,
          imageCount: images.length,
          images: {
            satellite: satelliteImageUrl,
            map: mapImageUrl,
            streetView: streetViewUrl,
            regrid: regridScreenshotUrl,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Visual Validation API] Unhandled error:', error);
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
// GET Handler - Retrieve Cached Validation
// ============================================

/**
 * Retrieve an existing visual validation result for a property.
 *
 * Query parameters:
 *   - propertyId (required, UUID)
 *
 * Returns the most recent validation or 404 if none exists.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database configuration error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    // ---- Validate propertyId ----------------------------------------------
    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: propertyId' },
        { status: 400 }
      );
    }

    if (!UUID_REGEX.test(propertyId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid propertyId format (must be UUID)' },
        { status: 400 }
      );
    }

    // ---- Fetch the most recent validation ---------------------------------
    const { data: row, error: fetchErr } = await supabase
      .from('property_visual_validation')
      .select('*')
      .eq('property_id', propertyId)
      .order('validated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      console.error('[Visual Validation API] GET fetch error:', fetchErr);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to retrieve validation',
          details: fetchErr.message,
        },
        { status: 500 }
      );
    }

    if (!row) {
      return NextResponse.json(
        {
          success: false,
          error: 'No visual validation found for this property',
        },
        { status: 404 }
      );
    }

    // ---- Return cached result ---------------------------------------------
    return NextResponse.json(
      {
        success: true,
        cached: true,
        data: mapDbRowToResponse(row),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Visual Validation API] GET unhandled error:', error);
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
// Helpers: DB Row -> API Response Mapping
// ============================================

/**
 * Map a raw database row from property_visual_validation into the
 * consistent API response shape shared by both GET and POST (cached).
 *
 * This keeps the response contract identical regardless of whether the
 * caller hits the cache or triggers a fresh analysis.
 */
function mapDbRowToResponse(row: Record<string, unknown>) {
  // Extract findings JSON -- may contain the full AI result
  const findings = (row.findings as Record<string, unknown>) ?? {};

  return {
    validationId: row.id,
    storedInDatabase: true,
    propertyId: row.property_id,
    status: row.validation_status,
    confidence: row.confidence_score,
    summary: (findings.summary as string) ?? row.notes ?? null,
    positives: (findings.positives as string[]) ?? [],
    concerns: (findings.concerns as string[]) ?? [],
    redFlags: row.red_flags ?? [],
    recommendation: (findings.recommendation as string) ?? null,
    propertyType: (findings.propertyType as string) ?? null,
    structurePresent: row.structure_present ?? null,
    roadAccess: row.road_access ?? null,
    landUseObserved: row.land_use_observed ?? null,
    lotShape: row.lot_shape ?? null,
    aiModel: row.ai_model ?? null,
    tokensUsed: row.ai_tokens_used ?? null,
    imageCount: row.image_count ?? null,
    images: {
      satellite: row.satellite_image_url ?? null,
      map: row.map_image_url ?? null,
      streetView: row.street_view_url ?? null,
      regrid: row.regrid_screenshot_url ?? null,
    },
    skipReason: row.skip_reason ?? null,
    validatedAt: row.validated_at ?? null,
  };
}
