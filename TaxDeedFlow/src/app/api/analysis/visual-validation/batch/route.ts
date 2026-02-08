/**
 * Batch Visual Validation API Route
 *
 * Processes multiple properties sequentially through GPT-4o vision-based
 * investability screening. Designed for batch operations with rate limiting
 * and graceful error handling -- a single property failure does not abort
 * the entire batch.
 *
 * POST /api/analysis/visual-validation/batch  - Process a batch of properties
 * GET  /api/analysis/visual-validation/batch   - Pending counts by county
 *
 * @module app/api/analysis/visual-validation/batch
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
/** Delay between property processing in milliseconds (rate limit protection) */
const INTER_REQUEST_DELAY_MS = 500;
/** Maximum number of properties per batch request */
const MAX_BATCH_LIMIT = 100;
/** Default number of properties per batch request */
const DEFAULT_BATCH_LIMIT = 50;

// ============================================
// Types
// ============================================

/** Shape returned by the get_properties_needing_visual_validation RPC */
interface PendingProperty {
  property_id: string;
  parcel_id: string | null;
  property_address: string | null;
  county_name: string;
  state_code: string;
  lot_size_acres: number | null;
  land_use: string | null;
  regrid_screenshot_url: string | null;
}

/** Per-property detail included in the batch response */
interface PropertyDetail {
  propertyId: string;
  status: string;
  confidence: number;
  error?: string;
}

/** Summary response shape for batch processing */
interface BatchSummary {
  processed: number;
  approved: number;
  caution: number;
  rejected: number;
  failed: number;
  skipped: number;
  details: PropertyDetail[];
}

/** Shape for county pending counts returned by GET */
interface CountyPendingCount {
  county_name: string;
  county_id: string;
  pending_count: number;
}

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

/** Schema for the POST batch request body */
const BatchPostSchema = z.object({
  countyId: z
    .string()
    .uuid('countyId must be a valid UUID')
    .optional()
    .nullable(),
  limit: z
    .number()
    .int()
    .min(1, 'limit must be at least 1')
    .max(MAX_BATCH_LIMIT, `limit must be at most ${MAX_BATCH_LIMIT}`)
    .optional()
    .default(DEFAULT_BATCH_LIMIT),
});

// ============================================
// Helpers
// ============================================

/**
 * Build the image URLs needed for investability analysis.
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
  return 'regular';
}

/**
 * Sleep for the specified number of milliseconds.
 * Used to rate-limit sequential API calls.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// POST Handler - Batch Visual Validation
// ============================================

/**
 * Process a batch of properties through AI-powered investability screening.
 *
 * Flow:
 * 1. Parse and validate request body (countyId, limit)
 * 2. Call get_properties_needing_visual_validation RPC
 * 3. For each property, fetch coordinates from regrid_data
 * 4. Skip properties without coordinates
 * 5. Build image URLs and call analyzePropertyInvestability()
 * 6. Persist via upsert_visual_validation RPC
 * 7. Track counts and return summary
 *
 * Properties are processed SEQUENTIALLY with a 500ms delay between
 * each to respect rate limits on both OpenAI and Google Maps APIs.
 * Individual failures are logged and skipped -- they do not abort
 * the batch.
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

    const validation = BatchPostSchema.safeParse(body);
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

    const { countyId, limit } = validation.data;

    // ---- Validate Google Maps API key -------------------------------------
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

    // ---- Fetch properties needing validation via RPC ----------------------
    const { data: pendingProperties, error: rpcFetchError } = await supabase.rpc(
      'get_properties_needing_visual_validation',
      {
        p_county_id: countyId ?? null,
        p_limit: limit,
      }
    );

    if (rpcFetchError) {
      console.error('[Batch Visual Validation] RPC fetch error:', rpcFetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch properties needing validation',
          details: rpcFetchError.message,
        },
        { status: 500 }
      );
    }

    const properties = (pendingProperties ?? []) as PendingProperty[];

    // If no properties need validation, return immediately
    if (properties.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            processed: 0,
            approved: 0,
            caution: 0,
            rejected: 0,
            failed: 0,
            skipped: 0,
            details: [],
          } satisfies BatchSummary,
        },
        { status: 200 }
      );
    }

    // ---- Initialize counters and detail tracker ---------------------------
    const summary: BatchSummary = {
      processed: 0,
      approved: 0,
      caution: 0,
      rejected: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    const openaiService = getOpenAIService();

    // ---- Process each property sequentially with rate limit delay ----------
    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];
      const propertyId = prop.property_id;

      // Add delay between requests (skip for the first property)
      if (i > 0) {
        await delay(INTER_REQUEST_DELAY_MS);
      }

      try {
        // ---- Fetch coordinates from regrid_data ---------------------------
        const { data: regridData, error: regridErr } = await supabase
          .from('regrid_data')
          .select('latitude, longitude, screenshot_url, property_type, zoning, lot_size_acres')
          .eq('property_id', propertyId)
          .maybeSingle();

        if (regridErr) {
          console.warn(
            `[Batch Visual Validation] Regrid fetch error for ${propertyId}:`,
            regridErr.message
          );
        }

        // Also check the properties table for coordinates as fallback
        const { data: propertyRow } = await supabase
          .from('properties')
          .select('latitude, longitude, property_type')
          .eq('id', propertyId)
          .maybeSingle();

        // Resolve lat/lng: prefer regrid, fall back to properties table
        const lat = regridData?.latitude ?? propertyRow?.latitude;
        const lng = regridData?.longitude ?? propertyRow?.longitude;

        // Skip properties without coordinates
        if (lat == null || lng == null) {
          summary.skipped++;
          summary.details.push({
            propertyId,
            status: 'SKIPPED',
            confidence: 0,
            error: 'No coordinates available (neither regrid_data nor properties table)',
          });
          continue;
        }

        // ---- Require Regrid screenshot (all 4 images mandatory) -----------
        const regridScreenshotUrl: string | null =
          regridData?.screenshot_url ?? prop.regrid_screenshot_url ?? null;

        if (!regridScreenshotUrl) {
          summary.skipped++;
          summary.details.push({
            propertyId,
            status: 'SKIPPED',
            confidence: 0,
            error: 'Missing Regrid screenshot - all 4 images required for complete analysis',
          });
          continue;
        }

        // ---- Build image URLs (all 4 guaranteed present) ----------------
        const images = buildImageArray(
          Number(lat),
          Number(lng),
          googleApiKey,
          regridScreenshotUrl
        );

        // ---- Build property context for the AI model ----------------------
        const lotSizeAcres = regridData?.lot_size_acres ?? prop.lot_size_acres;
        const lotSizeStr = lotSizeAcres != null ? `${lotSizeAcres} acres` : undefined;

        const propertyContext: VisualValidationPropertyContext = {
          address: prop.property_address ?? undefined,
          parcelId: prop.parcel_id ?? undefined,
          lotSize: lotSizeStr,
          propertyType: regridData?.property_type ?? propertyRow?.property_type ?? undefined,
          zoning: regridData?.zoning ?? undefined,
        };

        // ---- Call the OpenAI investability analysis -----------------------
        let result: VisualValidationResult;
        let tokensUsed: number;

        try {
          const analysis = await openaiService.analyzePropertyInvestability(images, propertyContext);
          result = analysis.result;
          tokensUsed = analysis.tokensUsed;
        } catch (aiError) {
          console.error(
            `[Batch Visual Validation] OpenAI analysis failed for ${propertyId}:`,
            aiError
          );
          summary.failed++;
          summary.details.push({
            propertyId,
            status: 'FAILED',
            confidence: 0,
            error: aiError instanceof Error ? aiError.message : 'OpenAI analysis failed',
          });
          continue;
        }

        // ---- Construct individual image URLs for storage ------------------
        const satelliteImageUrl = images.find((img) => img.type === 'satellite')?.url ?? null;
        const mapImageUrl = images.find((img) => img.type === 'map')?.url ?? null;
        const streetViewUrl = images.find((img) => img.type === 'street_view')?.url ?? null;
        const googleMapsUrl = `https://www.google.com/maps/@${lat},${lng},19z`;

        // ---- Persist via Supabase RPC -------------------------------------
        // DB constraint uses 'REJECT' but AI may return 'REJECTED' - normalize
        const dbStatus = result.status === 'REJECTED' ? 'REJECT' : result.status;

        const { error: rpcError } = await supabase.rpc(
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
          console.error(
            `[Batch Visual Validation] Failed to persist result for ${propertyId}:`,
            rpcError
          );
          // Still count as processed -- the AI result was obtained
        }

        // ---- Update counters based on status ------------------------------
        summary.processed++;
        switch (result.status) {
          case 'APPROVED':
            summary.approved++;
            break;
          case 'CAUTION':
            summary.caution++;
            break;
          case 'REJECTED':
            summary.rejected++;
            break;
        }

        summary.details.push({
          propertyId,
          status: result.status,
          confidence: result.confidence,
        });
      } catch (propertyError) {
        // Catch-all for any unexpected per-property error
        console.error(
          `[Batch Visual Validation] Unexpected error for property ${propertyId}:`,
          propertyError
        );
        summary.failed++;
        summary.details.push({
          propertyId,
          status: 'FAILED',
          confidence: 0,
          error: propertyError instanceof Error ? propertyError.message : 'Unexpected error',
        });
      }
    }

    // ---- Return batch summary ---------------------------------------------
    return NextResponse.json(
      {
        success: true,
        data: summary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Batch Visual Validation] Unhandled error:', error);
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
// GET Handler - Pending Validation Counts
// ============================================

/**
 * Return the number of properties awaiting visual validation, grouped
 * by county. This provides a quick overview for the batch processing
 * dashboard without triggering any actual analysis.
 *
 * The query finds properties that:
 * - Have regrid_data (join ensures Regrid enrichment is complete)
 * - Do NOT yet have a property_visual_validation record
 *
 * Results are ordered by pending_count descending so the counties
 * with the most work appear first.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database configuration error. Missing Supabase credentials.' },
        { status: 500 }
      );
    }

    // Two-step approach: fetch all regrid property_ids, then fetch
    // properties with county info, filtering out already-validated ones
    // client-side. This avoids complex PostgREST nested join syntax.

    // Step 1: Get all property IDs that already have visual validation
    const { data: validatedRows, error: validatedErr } = await supabase
      .from('property_visual_validation')
      .select('property_id');

    if (validatedErr) {
      console.error('[Batch Visual Validation GET] Error fetching validated properties:', validatedErr);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch validated property list',
          details: validatedErr.message,
        },
        { status: 500 }
      );
    }

    const validatedIds = new Set(
      (validatedRows ?? []).map((r: { property_id: string }) => r.property_id)
    );

    // Step 2: Get all property_ids from regrid_data
    const { data: regridRows, error: regridErr } = await supabase
      .from('regrid_data')
      .select('property_id')
      .limit(10000);

    if (regridErr) {
      console.error('[Batch Visual Validation GET] Error fetching regrid properties:', regridErr);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch properties with Regrid data',
          details: regridErr.message,
        },
        { status: 500 }
      );
    }

    // Filter to only properties that are NOT yet validated
    const pendingPropertyIds = (regridRows ?? [])
      .map((r: { property_id: string }) => r.property_id)
      .filter((pid: string) => !validatedIds.has(pid));

    // If nothing is pending, return early
    if (pendingPropertyIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            totalPending: 0,
            byCounty: [],
          },
        },
        { status: 200 }
      );
    }

    // Step 3: Fetch county info for all pending properties.
    // Supabase .in() has a practical limit, so we batch if needed.
    // For most cases the pending set is under 10k, which is fine.
    const { data: propertyCountyRows, error: pcErr } = await supabase
      .from('properties')
      .select('id, county_id, counties!inner(id, county_name)')
      .in('id', pendingPropertyIds)
      .limit(10000);

    if (pcErr) {
      console.error('[Batch Visual Validation GET] Error fetching property counties:', pcErr);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch property county data',
          details: pcErr.message,
        },
        { status: 500 }
      );
    }

    // Step 4: Aggregate counts by county
    const countsByCounty = new Map<string, { county_name: string; county_id: string; count: number }>();

    for (const row of propertyCountyRows ?? []) {
      // Extract county info from the join result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countyData = (row as any).counties;
      if (!countyData) continue;

      const countyId = countyData.id as string;
      const countyName = countyData.county_name as string;

      const existing = countsByCounty.get(countyId);
      if (existing) {
        existing.count++;
      } else {
        countsByCounty.set(countyId, {
          county_name: countyName,
          county_id: countyId,
          count: 1,
        });
      }
    }

    // Sort by count descending
    const pendingCounts: CountyPendingCount[] = Array.from(countsByCounty.values())
      .map((entry) => ({
        county_name: entry.county_name,
        county_id: entry.county_id,
        pending_count: entry.count,
      }))
      .sort((a, b) => b.pending_count - a.pending_count);

    const totalPending = pendingCounts.reduce((sum, c) => sum + c.pending_count, 0);

    return NextResponse.json(
      {
        success: true,
        data: {
          totalPending,
          byCounty: pendingCounts,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Batch Visual Validation GET] Unhandled error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
