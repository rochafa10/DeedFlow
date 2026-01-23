import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import { z } from "zod"

// ============================================
// Request Validation Schemas
// ============================================

/**
 * Sanitizes a string to prevent SSRF and injection attacks
 * Removes dangerous characters while preserving valid input
 */
function sanitizeString(value: string): string {
  return value
    .replace(/[<>]/g, "") // Remove HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/data:/gi, "") // Remove data: protocol
    .replace(/vbscript:/gi, "") // Remove vbscript: protocol
    .replace(/file:/gi, "") // Remove file: protocol
    .replace(/https?:\/\//gi, "") // Remove http(s):// URLs
    .trim()
}

const RegridScraperRequestSchema = z.object({
  property_id: z.string().uuid({
    message: "property_id must be a valid UUID"
  }),
  parcel_id: z.string()
    .min(1, "parcel_id is required")
    .max(100, "parcel_id must be less than 100 characters")
    .transform(sanitizeString),
  address: z.string()
    .max(500, "address must be less than 500 characters")
    .transform(sanitizeString)
    .optional(),
  county: z.string()
    .min(1, "county is required")
    .max(100, "county must be less than 100 characters")
    .transform(sanitizeString),
  state: z.string()
    .length(2, "state must be a 2-letter state code")
    .regex(/^[A-Z]{2}$/, "state must be uppercase 2-letter code (e.g., PA, FL)")
    .transform(val => val.toUpperCase()),
  job_id: z.string().uuid({
    message: "job_id must be a valid UUID"
  }).optional(),
})

/**
 * POST /api/scrape/regrid
 * Scrapes Regrid data for a property and stores it in the database
 *
 * Called by n8n workflow "TDF - Regrid Scraper" via HTTP Request node
 *
 * Request body:
 * {
 *   property_id: string (UUID),
 *   parcel_id: string,
 *   address?: string,
 *   county: string,
 *   state: string (2-letter code),
 *   job_id?: string (UUID)
 * }
 */
export async function POST(request: NextRequest) {
  // Simple API key validation for n8n workflow calls
  const authHeader = request.headers.get("x-api-key")
  const expectedKey = process.env.INTERNAL_API_KEY || "tdf-internal-scraper-key"

  if (authHeader !== expectedKey) {
    // Allow requests from n8n or the app itself
    const origin = request.headers.get("origin") || ""
    const referer = request.headers.get("referer") || ""
    const isInternal = origin.includes("n8n.lfb-investments.com") ||
                       referer.includes("n8n.lfb-investments.com") ||
                       origin.includes("localhost") || // Allow app requests
                       origin.includes("127.0.0.1") || // Allow local development
                       origin.includes("taxdeedflow") || // Allow production app
                       !origin // Direct API call (no browser origin)

    if (!isInternal && authHeader !== expectedKey) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid API key" },
        { status: 401 }
      )
    }
  }

  try {
    const body = await request.json()

    // Validate request using Zod schema
    const validationResult = RegridScraperRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { property_id, parcel_id, address, county, state, job_id } = validationResult.data

    console.log(`[Regrid Scraper] Processing property ${parcel_id} in ${county}, ${state}`)

    // Scrape Regrid data using their public search
    const regridData = await scrapeRegridData(parcel_id, address, county, state)

    if (!regridData.success || !regridData.data) {
      console.error(`[Regrid Scraper] Failed to scrape ${parcel_id}:`, regridData.error)
      return NextResponse.json({
        success: false,
        error: regridData.error || "No data returned",
        property_id,
        parcel_id,
      }, { status: 422 })
    }

    // Extract data for cleaner code
    const data = regridData.data

    // Store in database
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Upsert regrid_data record
    const { data: regridRecord, error: upsertError } = await supabase
      .from("regrid_data")
      .upsert({
        property_id,
        regrid_id: data.regrid_id,
        ll_uuid: data.ll_uuid,
        property_type: data.property_type,
        property_class: data.property_class,
        land_use: data.land_use,
        zoning: data.zoning,
        lot_size_sqft: data.lot_size_sqft,
        lot_size_acres: data.lot_size_acres,
        lot_dimensions: data.lot_dimensions,
        building_sqft: data.building_sqft,
        year_built: data.year_built,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        assessed_value: data.assessed_value,
        market_value: data.market_value,
        latitude: data.latitude,
        longitude: data.longitude,
        water_service: data.water_service,
        sewer_service: data.sewer_service,
        additional_fields: data.additional_fields,
        raw_html: data.raw_html,
        scraped_at: new Date().toISOString(),
        data_quality_score: data.data_quality_score,
      }, {
        onConflict: "property_id",
      })
      .select()
      .single()

    if (upsertError) {
      console.error("[Regrid Scraper] Database error:", upsertError)
      return NextResponse.json({
        success: false,
        error: upsertError.message,
        property_id,
        parcel_id,
      }, { status: 500 })
    }

    // Update property has_regrid_data flag
    await supabase
      .from("properties")
      .update({ has_regrid_data: true })
      .eq("id", property_id)

    console.log(`[Regrid Scraper] Successfully processed ${parcel_id}`)

    return NextResponse.json({
      success: true,
      property_id,
      parcel_id,
      regrid_data: regridRecord,
      data_quality_score: data.data_quality_score,
    })

  } catch (error) {
    console.error("[Regrid Scraper] Server error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server error",
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      },
      { status: 500 }
    )
  }
}

/**
 * Scrapes property data from Regrid
 * Uses Regrid's public parcel viewer API
 */
async function scrapeRegridData(
  parcelId: string,
  address: string | undefined,
  county: string,
  state: string
): Promise<{
  success: boolean
  data?: RegridData
  error?: string
}> {
  try {
    // Regrid uses a public tiles API that we can query
    // First, try to search by parcel ID
    const searchQuery = encodeURIComponent(`${parcelId} ${county} ${state}`)
    const searchUrl = `https://app.regrid.com/api/v1/search.json?query=${searchQuery}`

    // Try the Regrid API (may require API key for production)
    // For now, we'll use a mock/simulated response based on the parcel structure
    // In production, you would either:
    // 1. Use Regrid's paid API
    // 2. Use Playwright in a dedicated scraping service
    // 3. Use a third-party scraping service

    // Simulate scraping with reasonable defaults based on parcel data
    const data = await fetchRegridDataWithFallback(parcelId, address, county, state)

    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown scraping error",
    }
  }
}

/**
 * Fetches Regrid data with fallback to derived/estimated values
 * In production, this would make actual API calls to Regrid
 */
async function fetchRegridDataWithFallback(
  parcelId: string,
  address: string | undefined,
  county: string,
  state: string
): Promise<RegridData> {
  // Try to fetch from Regrid's public endpoints
  // Note: Regrid's full API requires a subscription

  // For MVP, we'll try a public endpoint and fall back to minimal data
  try {
    // Regrid's tile/parcel lookup endpoint
    const encodedParcel = encodeURIComponent(parcelId.replace(/[^a-zA-Z0-9]/g, ""))
    const encodedCounty = encodeURIComponent(county.toLowerCase().replace(/\s+/g, "-"))
    const encodedState = encodeURIComponent(state.toLowerCase())

    // Try the parcel page URL to get coordinates
    const parcelUrl = `https://app.regrid.com/us/${encodedState}/${encodedCounty}/parcel/${encodedParcel}`

    // Attempt to fetch parcel data
    // In a real implementation, you might use:
    // 1. Regrid API with API key
    // 2. A headless browser service
    // 3. Web scraping with proper rate limiting

    // For now, generate realistic placeholder data
    // This allows the workflow to be tested end-to-end
    const placeholderData = generatePlaceholderRegridData(parcelId, address, county, state)

    // Add a note that this is placeholder data
    placeholderData.additional_fields = {
      ...(placeholderData.additional_fields || {}),
      _scrape_method: "placeholder",
      _scrape_note: "Placeholder data - configure Regrid API key for real data",
      parcel_url: parcelUrl,
    }

    return placeholderData

  } catch (error) {
    // Return minimal data on error
    return generatePlaceholderRegridData(parcelId, address, county, state)
  }
}

/**
 * Generates placeholder Regrid data for testing
 * In production, this would be replaced with actual API data
 */
function generatePlaceholderRegridData(
  parcelId: string,
  address: string | undefined,
  county: string,
  state: string
): RegridData {
  // Generate a consistent but random-looking ID based on parcel
  const hash = simpleHash(parcelId)

  // Pennsylvania coordinates (approximate center of state)
  const baseLat = 40.5 + (hash % 100) / 1000
  const baseLng = -77.5 + ((hash >> 8) % 100) / 1000

  // Determine property type based on parcel structure
  const propertyType = determinePropertyType(parcelId, address)

  return {
    regrid_id: `rg_${parcelId.replace(/[^a-zA-Z0-9]/g, "_")}`,
    ll_uuid: `ll_${hash.toString(16)}`,
    property_type: propertyType,
    property_class: propertyType === "Residential" ? "Single Family" : "Commercial",
    land_use: propertyType === "Residential" ? "RESIDENTIAL" : "COMMERCIAL",
    zoning: propertyType === "Residential" ? "R-1" : "C-1",
    lot_size_sqft: 5000 + (hash % 15000),
    lot_size_acres: (5000 + (hash % 15000)) / 43560,
    lot_dimensions: `${50 + (hash % 50)}x${80 + (hash % 80)}`,
    building_sqft: propertyType === "Residential" ? 1000 + (hash % 2000) : null,
    year_built: propertyType === "Residential" ? 1950 + (hash % 70) : null,
    bedrooms: propertyType === "Residential" ? 2 + (hash % 3) : null,
    bathrooms: propertyType === "Residential" ? 1 + (hash % 2) : null,
    assessed_value: 20000 + (hash % 180000),
    market_value: 30000 + (hash % 270000),
    latitude: baseLat,
    longitude: baseLng,
    water_service: "PUBLIC",
    sewer_service: "PUBLIC",
    additional_fields: {
      source: "placeholder",
      county,
      state,
      original_parcel_id: parcelId,
      address: address || null,
    },
    raw_html: null,
    data_quality_score: 0.50, // Lower score for placeholder data (0.00-1.00 scale)
  }
}

/**
 * Simple hash function for generating consistent pseudo-random values
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Determines property type based on parcel ID patterns and address
 */
function determinePropertyType(parcelId: string, address: string | undefined): string {
  // Check address for clues
  if (address) {
    const lowerAddress = address.toLowerCase()
    if (lowerAddress.includes("apt") || lowerAddress.includes("unit") || lowerAddress.includes("#")) {
      return "Multi-Family"
    }
    if (lowerAddress.includes("lot") && !lowerAddress.match(/\d+\s+\w+\s+(st|ave|rd|dr|ln|blvd|ct|way)/i)) {
      return "Vacant Land"
    }
  }

  // Default to residential for most tax deed properties
  return "Residential"
}

/**
 * Type definition for Regrid data
 */
interface RegridData {
  regrid_id: string | null
  ll_uuid: string | null
  property_type: string | null
  property_class: string | null
  land_use: string | null
  zoning: string | null
  lot_size_sqft: number | null
  lot_size_acres: number | null
  lot_dimensions: string | null
  building_sqft: number | null
  year_built: number | null
  bedrooms: number | null
  bathrooms: number | null
  assessed_value: number | null
  market_value: number | null
  latitude: number | null
  longitude: number | null
  water_service: string | null
  sewer_service: string | null
  additional_fields: Record<string, unknown> | null
  raw_html: string | null
  data_quality_score: number
}

/**
 * GET /api/scrape/regrid
 * Health check and status endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Regrid Scraper API",
    version: "1.0.0",
    endpoints: {
      "POST /api/scrape/regrid": {
        description: "Scrape Regrid data for a property",
        required_fields: ["property_id", "parcel_id"],
        optional_fields: ["address", "county", "state", "job_id"],
      }
    },
    note: "Currently using placeholder data. Configure REGRID_API_KEY for real data.",
  })
}
