import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"

/**
 * POST /api/scrape/regrid
 * Scrapes Regrid data for a property and stores it in the database
 *
 * Called by n8n workflow "TDF - Regrid Scraper" via HTTP Request node
 *
 * Request body:
 * {
 *   property_id: string,
 *   parcel_id: string,
 *   address?: string,
 *   county: string,
 *   state: string,
 *   job_id?: string  // batch job ID for progress tracking
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
    const { property_id, parcel_id, address, county, state, job_id } = body

    if (!property_id || !parcel_id) {
      return NextResponse.json(
        { error: "Validation error", message: "property_id and parcel_id are required" },
        { status: 400 }
      )
    }

    logger.log(`[Regrid Scraper] Processing property ${parcel_id} in ${county}, ${state}`)

    // Scrape Regrid data — tries n8n (real Playwright scraper) first, placeholder fallback
    const regridData = await scrapeRegridData(parcel_id, address, county, state, property_id)

    if (!regridData.success || !regridData.data) {
      logger.error(`[Regrid Scraper] Failed to scrape ${parcel_id}:`, { error: regridData.error || 'No data returned' })
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

    // Upsert regrid_data record with ALL comprehensive fields
    const { data: regridRecord, error: upsertError } = await supabase
      .from("regrid_data")
      .upsert({
        property_id,
        regrid_id: data.regrid_id,
        ll_uuid: data.ll_uuid,

        // ===== ADDRESS FIELDS =====
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,

        // ===== OWNER INFORMATION =====
        owner_name: data.owner_name,
        mailing_address: data.mailing_address,
        mailing_city: data.mailing_city,
        mailing_state: data.mailing_state,
        mailing_zip: data.mailing_zip,

        // ===== PROPERTY CLASSIFICATION =====
        property_type: data.property_type,
        property_class: data.property_class,
        land_use: data.land_use,
        zoning: data.zoning,
        parcel_use_code: data.parcel_use_code,

        // ===== LOT INFORMATION =====
        lot_size_sqft: data.lot_size_sqft,
        lot_size_acres: data.lot_size_acres,
        lot_dimensions: data.lot_dimensions,
        deed_acres: data.deed_acres,
        lot_type: data.lot_type,
        terrain: data.terrain,
        land_description: data.land_description,

        // ===== BUILDING INFORMATION =====
        building_sqft: data.building_sqft,
        year_built: data.year_built,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        number_of_stories: data.number_of_stories,
        building_count: data.building_count,
        building_footprint_sqft: data.building_footprint_sqft,

        // ===== VALUATION =====
        assessed_value: data.assessed_value,
        market_value: data.market_value,
        total_parcel_value: data.total_parcel_value,
        improvement_value: data.improvement_value,
        land_value: data.land_value,
        last_sale_price: data.last_sale_price,
        last_sale_date: data.last_sale_date,

        // ===== LOCATION =====
        latitude: data.latitude,
        longitude: data.longitude,

        // ===== UTILITIES =====
        water_service: data.water_service,
        sewer_service: data.sewer_service,
        gas_availability: data.gas_availability,
        electric_service: data.electric_service,
        road_type: data.road_type,

        // ===== GEOGRAPHIC & CENSUS =====
        opportunity_zone: data.opportunity_zone,
        census_tract: data.census_tract,
        census_block: data.census_block,
        census_blockgroup: data.census_blockgroup,
        neighborhood_code: data.neighborhood_code,

        // ===== SCHOOL & DISTRICT =====
        school_district: data.school_district,
        school_district_code: data.school_district_code,
        district_number: data.district_number,
        ward_number: data.ward_number,
        map_number: data.map_number,

        // ===== IDENTIFIERS =====
        regrid_uuid: data.regrid_uuid,
        alt_parcel_id: data.alt_parcel_id,
        control_number: data.control_number,

        // ===== CLEAN & GREEN (PA) =====
        clean_green_land_value: data.clean_green_land_value,
        clean_green_building_value: data.clean_green_building_value,
        clean_green_total_value: data.clean_green_total_value,

        // ===== METADATA =====
        additional_fields: data.additional_fields,
        raw_html: data.raw_html,
        scraped_at: new Date().toISOString(),
        data_quality_score: data.data_quality_score,
        // Clear stale screenshot when using placeholder fallback
        ...(data.additional_fields?._scrape_method === 'placeholder'
          ? { screenshot_url: null }
          : {}),
      }, {
        onConflict: "property_id",
      })
      .select()
      .single()

    if (upsertError) {
      logger.error("[Regrid Scraper] Database error:", { error: upsertError.message, code: upsertError.code })
      return NextResponse.json({
        success: false,
        error: upsertError.message,
        property_id,
        parcel_id,
      }, { status: 500 })
    }

    // Update property flags — clear screenshot flag if placeholder
    const isPlaceholder = data.additional_fields?._scrape_method === 'placeholder'
    await supabase
      .from("properties")
      .update({
        has_regrid_data: true,
        ...(isPlaceholder ? { has_screenshot: false } : {}),
      })
      .eq("id", property_id)

    logger.log(`[Regrid Scraper] Successfully processed ${parcel_id}`)

    return NextResponse.json({
      success: true,
      property_id,
      parcel_id,
      regrid_data: regridRecord,
      data_quality_score: data.data_quality_score,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
    logger.error("[Regrid Scraper] Server error:", { message: errorMessage })
    return NextResponse.json(
      {
        success: false,
        error: "Server error",
        message: errorMessage
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
  state: string,
  propertyId?: string
): Promise<{
  success: boolean
  data?: RegridData
  error?: string
}> {
  // Try the real n8n Regrid scraper first (Playwright on VPS).
  // This runs server-side so there are no CORS issues.
  const n8nResult = await tryN8nRegridScraper(parcelId, address, county, state, propertyId)
  if (n8nResult.success && n8nResult.data) {
    return n8nResult
  }

  logger.log(`[Regrid Scraper] n8n scraper unavailable (${n8nResult.error}), falling back to placeholder`)

  // Fallback to placeholder data if n8n is unreachable
  try {
    const data = generatePlaceholderRegridData(parcelId, address, county, state)
    data.additional_fields = {
      ...(data.additional_fields || {}),
      _scrape_method: "placeholder",
      _scrape_note: "n8n scraper unavailable - placeholder data generated",
      _n8n_error: n8nResult.error,
    }
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown scraping error",
    }
  }
}

/**
 * Proxies the scrape request to the n8n webhook which runs the real
 * Playwright-based Regrid scraper on the VPS (pwrunner container).
 * Called server-side to avoid browser CORS restrictions.
 */
async function tryN8nRegridScraper(
  parcelId: string,
  address: string | undefined,
  county: string,
  state: string,
  propertyId?: string
): Promise<{
  success: boolean
  data?: RegridData
  error?: string
}> {
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "https://n8n.lfb-investments.com/webhook/scrape-property"

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 180_000) // 180s timeout to match n8n workflow

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_id: propertyId,
        parcel_id: parcelId,
        address,
        county,
        state,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return { success: false, error: `n8n returned ${response.status}` }
    }

    const result = await response.json()

    if (result.success && result.regrid_data) {
      // n8n returned real scraped data — map it to our RegridData shape
      const rd = result.regrid_data
      return {
        success: true,
        data: {
          ...rd,
          additional_fields: {
            ...(rd.additional_fields || {}),
            _scrape_method: "n8n_playwright",
          },
          data_quality_score: rd.data_quality_score ?? 0.85,
        },
      }
    }

    return { success: false, error: result.error || "n8n returned no data" }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    if (msg.includes("abort")) {
      return { success: false, error: "n8n request timed out (180s)" }
    }
    return { success: false, error: msg }
  }
}

/**
 * Generates placeholder Regrid data for testing
 * In production, this would be replaced with actual scraped/API data
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
  const isResidential = propertyType === "Residential"

  return {
    regrid_id: `rg_${parcelId.replace(/[^a-zA-Z0-9]/g, "_")}`,
    ll_uuid: `ll_${hash.toString(16)}`,

    // ===== ADDRESS FIELDS =====
    address: address || null,
    city: null,              // Will be populated by real Regrid scraper
    state: state || null,
    zip: null,               // Will be populated by real Regrid scraper

    // ===== OWNER INFORMATION =====
    owner_name: null,        // Will be populated by real scraper
    mailing_address: null,
    mailing_city: null,
    mailing_state: null,
    mailing_zip: null,

    // ===== PROPERTY CLASSIFICATION =====
    property_type: propertyType,
    property_class: isResidential ? "Single Family" : "Commercial",
    land_use: isResidential ? "RESIDENTIAL" : "COMMERCIAL",
    zoning: isResidential ? "R-1" : "C-1",
    parcel_use_code: isResidential ? "100" : "400",

    // ===== LOT INFORMATION =====
    lot_size_sqft: 5000 + (hash % 15000),
    lot_size_acres: (5000 + (hash % 15000)) / 43560,
    lot_dimensions: `${50 + (hash % 50)}x${80 + (hash % 80)}`,
    deed_acres: (5000 + (hash % 15000)) / 43560,
    lot_type: "Interior",
    terrain: "Level",
    land_description: null,

    // ===== BUILDING INFORMATION =====
    building_sqft: isResidential ? 1000 + (hash % 2000) : null,
    year_built: isResidential ? 1950 + (hash % 70) : null,
    bedrooms: isResidential ? 2 + (hash % 3) : null,
    bathrooms: isResidential ? 1 + (hash % 2) : null,
    number_of_stories: isResidential ? 1 + (hash % 2) : null,
    building_count: isResidential ? 1 : 0,
    building_footprint_sqft: isResidential ? 800 + (hash % 1200) : null,

    // ===== VALUATION =====
    assessed_value: 20000 + (hash % 180000),
    market_value: 30000 + (hash % 270000),
    total_parcel_value: 25000 + (hash % 200000),
    improvement_value: isResidential ? 15000 + (hash % 150000) : 0,
    land_value: 5000 + (hash % 50000),
    last_sale_price: null,   // Will be populated by real scraper
    last_sale_date: null,

    // ===== LOCATION =====
    latitude: baseLat,
    longitude: baseLng,

    // ===== UTILITIES =====
    water_service: "Public",
    sewer_service: "Public",
    gas_availability: null,
    electric_service: null,
    road_type: "Paved",

    // ===== GEOGRAPHIC & CENSUS =====
    opportunity_zone: false,
    census_tract: null,
    census_block: null,
    census_blockgroup: null,
    neighborhood_code: null,

    // ===== SCHOOL & DISTRICT =====
    school_district: null,
    school_district_code: null,
    district_number: null,
    ward_number: null,
    map_number: null,

    // ===== IDENTIFIERS =====
    regrid_uuid: `${hash.toString(16)}-${(hash >> 16).toString(16)}-${Date.now().toString(16)}`,
    alt_parcel_id: null,
    control_number: null,

    // ===== CLEAN & GREEN (PA) =====
    clean_green_land_value: null,
    clean_green_building_value: null,
    clean_green_total_value: null,

    // ===== METADATA =====
    additional_fields: {
      source: "placeholder",
      county,
      state,
      original_parcel_id: parcelId,
    },
    raw_html: null,
    data_quality_score: 0.30, // Lower score for placeholder data (0.00-1.00 scale)
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
 * Comprehensive type definition for Regrid data
 * Includes ALL fields extracted from Regrid Property Details panel
 *
 * Fields are organized by section as they appear in Regrid:
 * - Parcel Highlights
 * - Owner Information
 * - Property Sales & Value
 * - Structure Details
 * - Lot & Land Details
 * - Utilities
 * - Geographic & Census
 * - School & District
 * - Additional Items (county-specific)
 */
interface RegridData {
  // Identifiers
  regrid_id: string | null
  ll_uuid: string | null
  regrid_uuid: string | null
  alt_parcel_id: string | null
  control_number: string | null

  // Address fields
  address: string | null
  city: string | null
  state: string | null
  zip: string | null

  // Owner information
  owner_name: string | null
  mailing_address: string | null
  mailing_city: string | null
  mailing_state: string | null
  mailing_zip: string | null

  // Property classification
  property_type: string | null
  property_class: string | null
  land_use: string | null
  zoning: string | null
  parcel_use_code: string | null

  // Lot information
  lot_size_sqft: number | null
  lot_size_acres: number | null
  lot_dimensions: string | null
  deed_acres: number | null
  lot_type: string | null
  terrain: string | null
  land_description: string | null

  // Building information
  building_sqft: number | null
  year_built: number | null
  bedrooms: number | null
  bathrooms: number | null
  number_of_stories: number | null
  building_count: number | null
  building_footprint_sqft: number | null

  // Valuation
  assessed_value: number | null
  market_value: number | null
  total_parcel_value: number | null
  improvement_value: number | null
  land_value: number | null
  last_sale_price: number | null
  last_sale_date: string | null

  // Location
  latitude: number | null
  longitude: number | null

  // Utilities
  water_service: string | null
  sewer_service: string | null
  gas_availability: string | null
  electric_service: string | null
  road_type: string | null

  // Geographic & Census
  opportunity_zone: boolean | null
  census_tract: string | null
  census_block: string | null
  census_blockgroup: string | null
  neighborhood_code: string | null

  // School & District
  school_district: string | null
  school_district_code: string | null
  district_number: string | null
  ward_number: string | null
  map_number: string | null

  // Clean & Green (PA-specific)
  clean_green_land_value: number | null
  clean_green_building_value: number | null
  clean_green_total_value: number | null

  // Additional data
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
    version: "2.0.0",
    endpoints: {
      "POST /api/scrape/regrid": {
        description: "Scrape Regrid data for a property",
        required_fields: ["property_id", "parcel_id"],
        optional_fields: ["address", "county", "state", "job_id"],
      }
    },
    fields_captured: {
      address: ["address", "city", "state", "zip"],
      owner: ["owner_name", "mailing_address", "mailing_city", "mailing_state", "mailing_zip"],
      classification: ["property_type", "property_class", "land_use", "zoning", "parcel_use_code"],
      lot: ["lot_size_sqft", "lot_size_acres", "lot_dimensions", "deed_acres", "lot_type", "terrain", "land_description"],
      building: ["building_sqft", "year_built", "bedrooms", "bathrooms", "number_of_stories", "building_count", "building_footprint_sqft"],
      valuation: ["assessed_value", "market_value", "total_parcel_value", "improvement_value", "land_value", "last_sale_price", "last_sale_date"],
      location: ["latitude", "longitude"],
      utilities: ["water_service", "sewer_service", "gas_availability", "electric_service", "road_type"],
      geographic: ["opportunity_zone", "census_tract", "census_block", "census_blockgroup", "neighborhood_code"],
      school: ["school_district", "school_district_code", "district_number", "ward_number", "map_number"],
      identifiers: ["regrid_id", "ll_uuid", "regrid_uuid", "alt_parcel_id", "control_number"],
      pa_specific: ["clean_green_land_value", "clean_green_building_value", "clean_green_total_value"],
    },
    note: "Currently using placeholder data. Configure REGRID_API_KEY for real data.",
  })
}
