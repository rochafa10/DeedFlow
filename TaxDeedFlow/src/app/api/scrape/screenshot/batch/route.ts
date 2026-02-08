import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maximum number of properties that can be processed in a single batch request */
const MAX_BATCH_SIZE = 50

/** Default number of properties per batch when not specified by the caller */
const DEFAULT_BATCH_SIZE = 20

/** Delay in milliseconds between processing individual properties to avoid rate limiting */
const INTER_PROPERTY_DELAY_MS = 1500

/** Maximum time in milliseconds to wait for a single page navigation to complete */
const PAGE_NAVIGATION_TIMEOUT_MS = 30_000

/** Maximum time in milliseconds to wait for search autocomplete results to appear */
const SEARCH_AUTOCOMPLETE_WAIT_MS = 2500

/** Maximum time in milliseconds for the entire batch request before timeout */
const BATCH_REQUEST_TIMEOUT_MS = 600_000 // 10 minutes

/** Regrid credentials from environment variables with sensible fallbacks */
const REGRID_EMAIL = process.env.REGRID_EMAIL || "lulu.lopes.sousa@gmail.com"
const REGRID_PASSWORD = process.env.REGRID_PASSWORD || "Bia@2020"

// Create a context-specific logger for the batch endpoint
const log = logger.withContext("Batch Screenshot")

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Describes the shape of the incoming POST request body */
interface BatchRequestBody {
  /** Optional county UUID to filter properties by county */
  countyId?: string
  /** Maximum number of properties to process (1-50, default 20) */
  limit?: number
  /** When true, search Regrid by address instead of parcel_id */
  searchByAddress?: boolean
}

/** A single property row fetched from the database for processing */
interface PropertyRow {
  id: string
  parcel_id: string | null
  property_address: string | null
  county_id: string
  county_name: string
  state_code: string
}

/** Describes the outcome of processing a single property */
interface PropertyResult {
  property_id: string
  parcel_id: string | null
  status: "success" | "failed" | "skipped"
  screenshot_url?: string
  data_extracted?: boolean
  has_coordinates?: boolean
  error?: string
}

/** Data extracted from the Regrid Property Details panel via page.evaluate() */
interface ExtractedRegridData {
  property_address: string | null
  owner_name: string | null
  property_type: string | null
  property_class: string | null
  land_use: string | null
  zoning: string | null
  lot_size_sqft: number | null
  lot_size_acres: number | null
  building_sqft: number | null
  year_built: number | null
  bedrooms: number | null
  bathrooms: number | null
  assessed_value: number | null
  assessed_land_value: number | null
  assessed_improvement_value: number | null
  market_value: number | null
  latitude: number | null
  longitude: number | null
}

// ---------------------------------------------------------------------------
// Authentication helper (shared pattern with existing single-property route)
// ---------------------------------------------------------------------------

/**
 * Validates that the incoming request is authorized.
 * Accepts either:
 *   1. A valid x-api-key header matching INTERNAL_API_KEY env var
 *   2. Requests originating from known internal domains (n8n, localhost, etc.)
 *   3. Direct API calls with no origin header (e.g. curl / scripts)
 *
 * @returns true if the request is authorized, false otherwise
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("x-api-key")
  const expectedKey = process.env.INTERNAL_API_KEY || "tdf-internal-scraper-key"

  if (authHeader === expectedKey) {
    return true
  }

  const origin = request.headers.get("origin") || ""
  const referer = request.headers.get("referer") || ""

  const isInternal =
    origin.includes("n8n.lfb-investments.com") ||
    referer.includes("n8n.lfb-investments.com") ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    origin.includes("taxdeedflow") ||
    !origin // Direct API call (no browser origin)

  return isInternal
}

// ---------------------------------------------------------------------------
// Regrid login (identical logic to the single-property route)
// ---------------------------------------------------------------------------

/**
 * Logs into Regrid.com using the signin modal.
 *
 * The function handles several edge cases:
 *   - Already-logged-in detection (skips login)
 *   - Modal opening via both direct click and Bootstrap/jQuery API
 *   - Form field filling via both Playwright locators and JS fallback
 *   - Submit button detection via multiple selectors
 *
 * @param page - The Playwright Page instance (already navigated or about to be)
 * @returns true when login succeeds (or was already logged in), false otherwise
 */
async function loginToRegrid(page: any): Promise<boolean> {
  try {
    log.info("Attempting Regrid login...")

    // Navigate to Regrid main app page
    await page.goto("https://app.regrid.com/us", {
      waitUntil: "networkidle",
      timeout: PAGE_NAVIGATION_TIMEOUT_MS,
    })
    await page.waitForTimeout(2000)

    // Check if already logged in by looking for user menu or absence of sign-in link
    const isLoggedIn = await page.evaluate(() => {
      const signInLink = document.querySelector('a[href="#signinModal"]')
      const userMenu = document.querySelector(
        '[data-testid="user-menu"], .user-avatar, .user-name'
      )
      return !signInLink || !!userMenu
    })

    if (isLoggedIn) {
      log.info("Already logged in to Regrid")
      return true
    }

    log.info("Not logged in, opening sign-in modal...")

    // Try to open the modal via JS click on the anchor
    const modalOpened = await page.evaluate(() => {
      const signInLink = document.querySelector(
        'a[href="#signinModal"]'
      ) as HTMLElement
      if (signInLink) {
        signInLink.click()
        return true
      }
      return false
    })

    if (!modalOpened) {
      log.error("Could not find sign-in link to click")
      return false
    }

    await page.waitForTimeout(2000)

    // Ensure modal is visible, with Bootstrap/jQuery fallback
    const modalVisible = await page.evaluate(() => {
      const modal = document.querySelector("#signinModal")
      if (modal) {
        const style = window.getComputedStyle(modal)
        return style.display !== "none" && style.visibility !== "hidden"
      }
      return false
    })

    if (!modalVisible) {
      log.info("Modal not visible, trying Bootstrap/jQuery fallback...")
      await page.evaluate(() => {
        const modal = document.querySelector("#signinModal")
        if (modal && (window as any).bootstrap?.Modal) {
          const bsModal = new (window as any).bootstrap.Modal(modal)
          bsModal.show()
        } else if (modal && (window as any).$) {
          ;(window as any).$("#signinModal").modal("show")
        }
      })
      await page.waitForTimeout(1500)
    }

    // ----- Fill email field -----
    const emailSelectors = [
      '#signinModal input[type="email"]',
      '#signinModal input[placeholder*="Email"]',
      '#signinModal input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="Email"]',
      'input[name="email"]',
      "#email",
    ]

    let emailFieldFound = false
    for (const selector of emailSelectors) {
      const isVisible = await page
        .locator(selector)
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false)
      if (isVisible) {
        await page.locator(selector).first().fill(REGRID_EMAIL)
        emailFieldFound = true
        break
      }
    }

    if (!emailFieldFound) {
      // JS fallback for email
      const emailFilled = await page.evaluate((email: string) => {
        const inputs = Array.from(
          document.querySelectorAll(
            'input[type="email"], input[placeholder*="Email"], input[name="email"]'
          )
        )
        for (const input of inputs) {
          if (input instanceof HTMLInputElement) {
            input.value = email
            input.dispatchEvent(new Event("input", { bubbles: true }))
            input.dispatchEvent(new Event("change", { bubbles: true }))
            return true
          }
        }
        return false
      }, REGRID_EMAIL)

      if (!emailFilled) {
        log.error("Email field not found in modal")
        return false
      }
    }

    // ----- Fill password field -----
    const passwordSelectors = [
      '#signinModal input[type="password"]',
      'input[type="password"]',
    ]

    let passwordFieldFound = false
    for (const selector of passwordSelectors) {
      const isVisible = await page
        .locator(selector)
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false)
      if (isVisible) {
        await page.locator(selector).first().fill(REGRID_PASSWORD)
        passwordFieldFound = true
        break
      }
    }

    if (!passwordFieldFound) {
      // JS fallback for password
      const passwordFilled = await page.evaluate((password: string) => {
        const inputs = Array.from(
          document.querySelectorAll('input[type="password"]')
        )
        for (const input of inputs) {
          if (input instanceof HTMLInputElement) {
            input.value = password
            input.dispatchEvent(new Event("input", { bubbles: true }))
            input.dispatchEvent(new Event("change", { bubbles: true }))
            return true
          }
        }
        return false
      }, REGRID_PASSWORD)

      if (!passwordFilled) {
        log.error("Password field not found in modal")
        return false
      }
    }

    // ----- Submit the form -----
    const buttonSelectors = [
      '#signinModal button[type="submit"]',
      '#signinModal button:has-text("Sign in")',
      '#signinModal button:has-text("Log in")',
      'button[type="submit"]',
      'button:has-text("Sign in")',
    ]

    let buttonClicked = false
    for (const selector of buttonSelectors) {
      const isVisible = await page
        .locator(selector)
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false)
      if (isVisible) {
        await page.locator(selector).first().click()
        buttonClicked = true
        break
      }
    }

    if (!buttonClicked) {
      // JS fallback for submit
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(
          document.querySelectorAll(
            '#signinModal button[type="submit"], #signinModal button'
          )
        )
        for (const btn of buttons) {
          if (
            btn instanceof HTMLButtonElement &&
            (btn.type === "submit" ||
              btn.textContent?.toLowerCase().includes("sign"))
          ) {
            btn.click()
            return true
          }
        }
        const form = document.querySelector("#signinModal form")
        if (form instanceof HTMLFormElement) {
          form.submit()
          return true
        }
        return false
      })

      if (!clicked) {
        log.error("Submit button not found")
        return false
      }
    }

    // Wait for login to complete
    log.info("Waiting for login response...")
    await page.waitForTimeout(5000)

    // Verify login succeeded
    const loginSuccessful = await page.evaluate(() => {
      const signInLink = document.querySelector('a[href="#signinModal"]')
      if (!signInLink) return true
      const style = window.getComputedStyle(signInLink)
      if (style.display === "none" || style.visibility === "hidden") return true
      const userElements = document.querySelectorAll(
        '[data-testid="user-menu"], .user-avatar, .account-name'
      )
      return userElements.length > 0
    })

    if (loginSuccessful) {
      log.info("Regrid login successful")
      return true
    } else {
      log.error("Login may have failed - sign-in link still present")
      return false
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    log.error("Regrid login error", { message })
    return false
  }
}

// ---------------------------------------------------------------------------
// Property data extraction (runs inside page.evaluate)
// ---------------------------------------------------------------------------

/**
 * Extracts property data from the Regrid Property Details panel.
 * This function is serialised and executed inside the browser context via
 * page.evaluate(), so it must not reference any Node/server-side variables.
 *
 * It uses regex patterns against the full document body text to pull out
 * property details that Regrid displays in its side panel.
 */
function extractPropertyDataScript(): ExtractedRegridData {
  const result: Record<string, any> = {
    property_address: null,
    owner_name: null,
    property_type: null,
    property_class: null,
    land_use: null,
    zoning: null,
    lot_size_sqft: null,
    lot_size_acres: null,
    building_sqft: null,
    year_built: null,
    bedrooms: null,
    bathrooms: null,
    assessed_value: null,
    assessed_land_value: null,
    assessed_improvement_value: null,
    market_value: null,
    latitude: null,
    longitude: null,
  }

  const bodyText = document.body.innerText

  // Extract address from panel header - look for text after "Property Details"
  const addressMatch = bodyText.match(
    /Property Details\s*\n([^\n]+(?:Ave|St|Rd|Dr|Ln|Ct|Blvd|Way|Pl|Cir|Ter)[^\n]*)/i
  )
  if (addressMatch) result.property_address = addressMatch[1].trim()

  // Extract owner name
  const ownerMatch = bodyText.match(/Owner\s+Name[:\s]+([^\n]+)/i)
  if (ownerMatch) result.owner_name = ownerMatch[1].trim()

  // Regex patterns for each field, matching what Regrid displays
  const patterns: Record<string, RegExp> = {
    property_type: /Property\s+Type[:\s]+([^\n]+)/i,
    property_class: /Zoning\s+Type[:\s]+([^\n]+)/i,
    land_use: /Parcel\s+Use\s+Code[:\s]+"?([^"\n]+)"?/i,
    zoning: /Zoning\s+Subtype[:\s]+([^\n]+)/i,
    lot_size_acres:
      /(?:Deed\s+Acres|Calculated\s+Parcel\s+Area)[:\s]+"?([\d.]+)"?/i,
    lot_size_sqft: /Lot\s+Size[:\s]+([\d,]+)\s*(?:sq\s*ft|SF)/i,
    building_sqft: /Building\s+Area[:\s]+([\d,]+)\s*(?:sq\s*ft|SF)/i,
    year_built: /Year\s+Built[:\s]+(\d{4})/i,
    bedrooms: /Bedrooms?[:\s]+(\d+)/i,
    bathrooms: /Bathrooms?[:\s]+([\d.]+)/i,
    assessed_value: /Total\s+Parcel\s+Value[:\s]+\$?([\d,]+\.?\d*)/i,
    assessed_land_value: /Land\s+Value[:\s]+\$?([\d,]+\.?\d*)/i,
    assessed_improvement_value:
      /Improvement\s+Value[:\s]+\$?([\d,]+\.?\d*)/i,
    market_value: /Market\s+Value[:\s]+\$?([\d,]+)/i,
  }

  // Numeric fields that should be parsed as floats
  const floatFields = [
    "lot_size_sqft",
    "lot_size_acres",
    "building_sqft",
    "assessed_value",
    "assessed_land_value",
    "assessed_improvement_value",
    "market_value",
    "bathrooms",
  ]
  // Numeric fields that should be parsed as integers
  const intFields = ["year_built", "bedrooms"]

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = bodyText.match(pattern)
    if (match && match[1]) {
      const value = match[1].trim().replace(/"/g, "")
      if (floatFields.includes(key)) {
        result[key] = parseFloat(value.replace(/,/g, "")) || null
      } else if (intFields.includes(key)) {
        result[key] = parseInt(value, 10) || null
      } else {
        result[key] = value
      }
    }
  }

  // Extract coordinates
  const latMatch = bodyText.match(/Latitude[:\s]+"?([-\d.]+)"?/i)
  const lonMatch = bodyText.match(/Longitude[:\s]+"?([-\d.]+)"?/i)
  if (latMatch) result.latitude = parseFloat(latMatch[1]) || null
  if (lonMatch) result.longitude = parseFloat(lonMatch[1]) || null

  return result as ExtractedRegridData
}

// ---------------------------------------------------------------------------
// Single-property processing within an existing browser session
// ---------------------------------------------------------------------------

/**
 * Processes a single property within an already-open Playwright page.
 *
 * Steps:
 *  1. Navigate to the county page if the county has changed since the last property
 *  2. Search for the property by parcel_id (or address if searchByAddress is set)
 *  3. Wait for the Property Details panel to load
 *  4. Extract structured data from the panel
 *  5. Close the panel to reveal the highlighted parcel on the map
 *  6. Capture a screenshot
 *  7. Upload screenshot to Supabase Storage
 *  8. Upsert regrid_data and update the properties table flags
 *
 * @param page - Playwright Page instance (already logged into Regrid)
 * @param property - The property row from the database
 * @param supabase - Authenticated Supabase client
 * @param currentCountySlug - The county slug the browser is currently at
 * @param searchByAddress - When true, search by address instead of parcel_id
 * @returns An object containing the result and the county slug the browser ended on
 */
async function processProperty(
  page: any,
  property: PropertyRow,
  supabase: any,
  currentCountySlug: string,
  searchByAddress: boolean
): Promise<{ result: PropertyResult; countySlug: string }> {
  const { id: propertyId, parcel_id, property_address, county_name, state_code } = property

  // Determine what to search for
  const searchQuery = searchByAddress
    ? property_address
    : parcel_id

  if (!searchQuery) {
    return {
      result: {
        property_id: propertyId,
        parcel_id,
        status: "skipped",
        error: searchByAddress
          ? "No address available for search"
          : "No parcel_id available for search",
      },
      countySlug: currentCountySlug,
    }
  }

  try {
    // Step 1: Navigate to the county page if we changed counties
    const stateSlug = state_code.toLowerCase()
    const countySlug = county_name.toLowerCase().replace(/\s+/g, "-")
    const targetSlug = `${stateSlug}/${countySlug}`

    if (targetSlug !== currentCountySlug) {
      const countyUrl = `https://app.regrid.com/us/${targetSlug}`
      log.info(`Navigating to county: ${countyUrl}`)
      await page.goto(countyUrl, {
        waitUntil: "networkidle",
        timeout: PAGE_NAVIGATION_TIMEOUT_MS,
      })
      await page.waitForTimeout(2000)
    }

    // Step 2: Search for the property using the search box + keyboard navigation
    log.info(`Searching for: ${searchQuery} (property ${propertyId})`)

    const searchSelectors = [
      'input[placeholder*="Search"]',
      'input[placeholder*="search"]',
      '[role="searchbox"]',
      'input[type="search"]',
      "#search-input",
      ".search-input",
      'input[aria-label*="Search"]',
    ]

    let searchBox = null
    for (const selector of searchSelectors) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        searchBox = element
        break
      }
    }

    if (!searchBox) {
      // Keyboard shortcut fallback: pressing "/" opens the search on Regrid
      log.warn("Search box not found, trying '/' keyboard shortcut")
      await page.keyboard.press("/")
      await page.waitForTimeout(500)

      // Try locating the search box again after the shortcut
      for (const selector of searchSelectors) {
        const element = page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
          searchBox = element
          break
        }
      }
    }

    if (!searchBox) {
      return {
        result: {
          property_id: propertyId,
          parcel_id,
          status: "failed",
          error: "Search box not found on page",
        },
        countySlug: targetSlug,
      }
    }

    // Clear any previous search text, then type the new query
    await searchBox.click()
    await page.waitForTimeout(300)
    await searchBox.fill("")
    await page.waitForTimeout(200)
    await searchBox.fill(searchQuery)

    // Wait for autocomplete dropdown
    await page.waitForTimeout(SEARCH_AUTOCOMPLETE_WAIT_MS)

    // ArrowDown to select the first autocomplete result, then Enter
    await page.keyboard.press("ArrowDown")
    await page.waitForTimeout(500)
    await page.keyboard.press("Enter")

    // Wait for the parcel page / Property Details panel to load
    await page.waitForTimeout(4000)

    // Verify that a property was actually selected
    const parcelLoaded = await page.evaluate(() => {
      const bodyText = document.body.innerText
      const hasPropertyDetails = bodyText.includes("Property Details")
      const urlHasParcel =
        window.location.href.includes("#t=property") ||
        window.location.href.includes("/parcel/")
      const noZoomMessage = !bodyText.includes("Zoom in to see parcels")
      return {
        hasPropertyDetails,
        urlHasParcel,
        noZoomMessage,
        success: (hasPropertyDetails || urlHasParcel) && noZoomMessage,
      }
    })

    if (!parcelLoaded.success) {
      log.warn(`Property panel did not load for ${searchQuery}`, {
        details: JSON.stringify(parcelLoaded),
      })
      return {
        result: {
          property_id: propertyId,
          parcel_id,
          status: "failed",
          error: "Search result not found or property panel did not load",
        },
        countySlug: targetSlug,
      }
    }

    // Wait a bit for panel content to settle
    await page.waitForTimeout(1500)

    // Step 3: Extract property data from the Property Details panel
    const extractedData: ExtractedRegridData = await page.evaluate(
      extractPropertyDataScript
    )
    log.debug("Extracted data", {
      address: extractedData.property_address || "N/A",
      coords: `${extractedData.latitude}, ${extractedData.longitude}`,
    })

    // Step 4: Close the Property Details panel to reveal the highlighted parcel
    try {
      const propertyPanelClose = page.locator("#property > .close")
      if (
        await propertyPanelClose
          .isVisible({ timeout: 1000 })
          .catch(() => false)
      ) {
        await propertyPanelClose.click()
        await page.waitForTimeout(1000)
      }
    } catch {
      // Not fatal -- we can still screenshot with the panel open
      log.debug("Could not close Property Details panel (non-fatal)")
    }

    // Step 5: Capture screenshot
    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: false,
    })
    const screenshot = Buffer.from(screenshotBuffer)

    // Step 6: Upload screenshot to Supabase Storage
    const fileName = parcel_id
      ? parcel_id.replace(/\./g, "_").replace(/-/g, "_") + ".jpg"
      : `${propertyId}.jpg`

    const { error: uploadError } = await supabase.storage
      .from("screenshots")
      .upload(fileName, screenshot, {
        contentType: "image/jpeg",
        upsert: true,
      })

    if (uploadError) {
      log.warn(`Storage upload failed for ${parcel_id}`, {
        error: uploadError.message,
      })
      return {
        result: {
          property_id: propertyId,
          parcel_id,
          status: "failed",
          error: `Screenshot upload failed: ${uploadError.message}`,
        },
        countySlug: targetSlug,
      }
    }

    const { data: urlData } = supabase.storage
      .from("screenshots")
      .getPublicUrl(fileName)
    const screenshotUrl: string = urlData.publicUrl

    // Step 7: Upsert regrid_data with extracted fields and screenshot URL
    const regridDataToUpsert: Record<string, any> = {
      property_id: propertyId,
      screenshot_url: screenshotUrl,
      scraped_at: new Date().toISOString(),
    }

    // Map extracted fields into the upsert payload (only when non-null)
    if (extractedData.property_type) regridDataToUpsert.property_type = extractedData.property_type
    if (extractedData.property_class) regridDataToUpsert.property_class = extractedData.property_class
    if (extractedData.land_use) regridDataToUpsert.land_use = extractedData.land_use
    if (extractedData.zoning) regridDataToUpsert.zoning = extractedData.zoning
    if (extractedData.lot_size_sqft) regridDataToUpsert.lot_size_sqft = extractedData.lot_size_sqft
    if (extractedData.lot_size_acres) regridDataToUpsert.lot_size_acres = extractedData.lot_size_acres
    if (extractedData.building_sqft) regridDataToUpsert.building_sqft = extractedData.building_sqft
    if (extractedData.year_built) regridDataToUpsert.year_built = extractedData.year_built
    if (extractedData.bedrooms) regridDataToUpsert.bedrooms = extractedData.bedrooms
    if (extractedData.bathrooms) regridDataToUpsert.bathrooms = extractedData.bathrooms
    if (extractedData.assessed_value) regridDataToUpsert.assessed_value = extractedData.assessed_value
    if (extractedData.assessed_land_value) regridDataToUpsert.assessed_land_value = extractedData.assessed_land_value
    if (extractedData.assessed_improvement_value) regridDataToUpsert.assessed_improvement_value = extractedData.assessed_improvement_value
    if (extractedData.market_value) regridDataToUpsert.market_value = extractedData.market_value
    if (extractedData.latitude) regridDataToUpsert.latitude = extractedData.latitude
    if (extractedData.longitude) regridDataToUpsert.longitude = extractedData.longitude

    const { error: upsertError } = await supabase
      .from("regrid_data")
      .upsert(regridDataToUpsert, { onConflict: "property_id" })

    if (upsertError) {
      log.warn(`regrid_data upsert failed for ${propertyId}`, {
        error: upsertError.message,
      })
      // Non-fatal: screenshot was captured, we just failed to save metadata
    }

    // Step 8: Update property flags and optionally backfill the address
    const propertyUpdates: Record<string, any> = {
      has_screenshot: true,
      has_regrid_data: true,
    }
    if (extractedData.property_address) {
      propertyUpdates.property_address = extractedData.property_address
    }

    await supabase
      .from("properties")
      .update(propertyUpdates)
      .eq("id", propertyId)

    return {
      result: {
        property_id: propertyId,
        parcel_id,
        status: "success",
        screenshot_url: screenshotUrl,
        data_extracted: !!(
          extractedData.property_type ||
          extractedData.assessed_value ||
          extractedData.lot_size_acres
        ),
        has_coordinates: !!(extractedData.latitude && extractedData.longitude),
      },
      countySlug: targetSlug,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    log.error(`Failed to process property ${propertyId}`, { message })
    return {
      result: {
        property_id: propertyId,
        parcel_id,
        status: "failed",
        error: message,
      },
      countySlug: currentCountySlug,
    }
  }
}

// ---------------------------------------------------------------------------
// POST /api/scrape/screenshot/batch
// ---------------------------------------------------------------------------

/**
 * POST /api/scrape/screenshot/batch
 *
 * Batch-processes multiple properties through Regrid using a SINGLE browser
 * session for efficiency. Instead of launching a new browser + Regrid login
 * per property (~15-30s overhead each), this endpoint:
 *
 *   1. Queries the DB for properties that still need Regrid data
 *   2. Launches ONE Playwright browser and logs into Regrid once
 *   3. Iterates through each property:
 *      a. Navigates to county page (only when county changes)
 *      b. Searches for the parcel / address
 *      c. Extracts data from the Property Details panel
 *      d. Captures a screenshot of the highlighted parcel
 *      e. Uploads screenshot and upserts regrid_data
 *   4. Returns a summary of all results
 *
 * Request body:
 * {
 *   countyId?: string,        // optional county UUID filter
 *   limit?: number,           // 1-50, default 20
 *   searchByAddress?: boolean // use address instead of parcel_id
 * }
 */
export async function POST(request: NextRequest) {
  // --- Auth check ---
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid API key" },
      { status: 401 }
    )
  }

  const startTime = Date.now()

  // --- Parse & validate request body ---
  let body: BatchRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const {
    countyId,
    limit: rawLimit,
    searchByAddress = false,
  } = body

  // Clamp limit to valid range
  const limit = Math.max(1, Math.min(MAX_BATCH_SIZE, rawLimit || DEFAULT_BATCH_SIZE))

  log.info(`Batch request received`, {
    countyId: countyId || "all",
    limit: String(limit),
    searchByAddress: String(searchByAddress),
  })

  // --- Database setup ---
  const supabase = createServerClient()
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    )
  }

  // --- Fetch properties that need Regrid data ---
  let query = supabase
    .from("properties")
    .select(`
      id,
      parcel_id,
      property_address,
      county_id,
      counties!inner(county_name, state_code)
    `)
    .eq("has_regrid_data", false)
    .order("created_at", { ascending: true })
    .limit(limit)

  if (countyId) {
    query = query.eq("county_id", countyId)
  }

  const { data: properties, error: queryError } = await query

  if (queryError) {
    log.error("Failed to query properties", { error: queryError.message })
    return NextResponse.json(
      { error: "Database query failed", message: queryError.message },
      { status: 500 }
    )
  }

  if (!properties || properties.length === 0) {
    return NextResponse.json({
      success: true,
      summary: { total: 0, processed: 0, failed: 0, skipped: 0 },
      results: [],
      timing: {
        total_seconds: (Date.now() - startTime) / 1000,
        avg_per_property: 0,
      },
      message: "No properties found that need Regrid data",
    })
  }

  // Map rows into a clean shape
  const propertyRows: PropertyRow[] = properties.map((p: any) => ({
    id: p.id,
    parcel_id: p.parcel_id,
    property_address: p.property_address,
    county_id: p.county_id,
    county_name: (p.counties as any)?.county_name || "",
    state_code: (p.counties as any)?.state_code || "",
  }))

  log.info(`Found ${propertyRows.length} properties to process`)

  // --- Launch browser, login, process properties ---
  const results: PropertyResult[] = []
  let browser: any = null

  try {
    const { chromium } = await import("playwright")

    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    })

    const page = await context.newPage()

    // Login to Regrid once for the entire batch
    const loginSuccess = await loginToRegrid(page)
    if (!loginSuccess) {
      log.warn("Regrid login failed - continuing without login (limited to 5/day)")
    }

    // Track which county the browser is currently viewing to avoid redundant navigation
    let currentCountySlug = ""

    // Process each property sequentially within the single session
    for (let i = 0; i < propertyRows.length; i++) {
      const property = propertyRows[i]

      // Check if we have exceeded the overall timeout
      if (Date.now() - startTime > BATCH_REQUEST_TIMEOUT_MS) {
        log.warn("Batch timeout reached, stopping early", {
          processed: String(i),
          total: String(propertyRows.length),
        })
        // Mark remaining properties as skipped
        for (let j = i; j < propertyRows.length; j++) {
          results.push({
            property_id: propertyRows[j].id,
            parcel_id: propertyRows[j].parcel_id,
            status: "skipped",
            error: "Batch timeout reached",
          })
        }
        break
      }

      log.info(
        `Processing property ${i + 1}/${propertyRows.length}: ${property.parcel_id || property.property_address || property.id}`
      )

      const { result, countySlug } = await processProperty(
        page,
        property,
        supabase,
        currentCountySlug,
        searchByAddress
      )

      currentCountySlug = countySlug
      results.push(result)

      // Small delay between properties to be a good citizen
      if (i < propertyRows.length - 1) {
        await page.waitForTimeout(INTER_PROPERTY_DELAY_MS)
      }
    }

    // Clean up browser resources
    await context.close()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    log.error("Browser session error", { message })

    // If we crashed mid-batch, mark any unprocessed properties
    const processedIds = new Set(results.map((r) => r.property_id))
    for (const prop of propertyRows) {
      if (!processedIds.has(prop.id)) {
        results.push({
          property_id: prop.id,
          parcel_id: prop.parcel_id,
          status: "failed",
          error: `Browser session crashed: ${message}`,
        })
      }
    }
  } finally {
    // Always close the browser, even if we hit an error
    if (browser) {
      try {
        await browser.close()
      } catch {
        log.warn("Failed to close browser (may already be closed)")
      }
    }
  }

  // --- Build response summary ---
  const totalSeconds = (Date.now() - startTime) / 1000
  const processed = results.filter((r) => r.status === "success").length
  const failed = results.filter((r) => r.status === "failed").length
  const skipped = results.filter((r) => r.status === "skipped").length

  log.info("Batch complete", {
    total: String(results.length),
    processed: String(processed),
    failed: String(failed),
    skipped: String(skipped),
    seconds: String(totalSeconds.toFixed(1)),
  })

  return NextResponse.json({
    success: true,
    summary: {
      total: results.length,
      processed,
      failed,
      skipped,
    },
    results,
    timing: {
      total_seconds: Math.round(totalSeconds * 10) / 10,
      avg_per_property:
        processed > 0
          ? Math.round((totalSeconds / processed) * 10) / 10
          : 0,
    },
  })
}

// ---------------------------------------------------------------------------
// GET /api/scrape/screenshot/batch
// ---------------------------------------------------------------------------

/**
 * GET /api/scrape/screenshot/batch
 *
 * Returns pending property counts per county -- how many properties in each
 * county still need Regrid scraping (has_regrid_data = false).
 *
 * This is useful for:
 *   - Dashboard display showing remaining work
 *   - Deciding which countyId to pass to the POST endpoint
 *   - Monitoring overall pipeline progress
 */
export async function GET(request: NextRequest) {
  // Auth check (same pattern)
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid API key" },
      { status: 401 }
    )
  }

  const supabase = createServerClient()
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    )
  }

  // Use a raw SQL query via RPC to get grouped counts efficiently.
  // Supabase JS client does not natively support GROUP BY, so we use
  // the sql function or a simpler approach: query all, then aggregate.
  //
  // For better performance we attempt the RPC approach first. If the
  // function does not exist, we fall back to a client-side aggregation.
  try {
    const { data, error } = await supabase.rpc("get_pending_scrape_counts")

    if (!error && data) {
      return NextResponse.json({
        success: true,
        pending_by_county: data,
        total_pending: data.reduce(
          (sum: number, row: any) => sum + (row.pending || 0),
          0
        ),
      })
    }
  } catch {
    // RPC function may not exist; fall back below
  }

  // Fallback: fetch properties without regrid data and aggregate in JS
  const { data: properties, error: queryError } = await supabase
    .from("properties")
    .select("county_id, counties!inner(county_name, state_code)")
    .eq("has_regrid_data", false)

  if (queryError) {
    return NextResponse.json(
      { error: "Database query failed", message: queryError.message },
      { status: 500 }
    )
  }

  // Aggregate counts by county
  const countyMap = new Map<
    string,
    { county_name: string; state_code: string; county_id: string; pending: number }
  >()

  for (const p of properties || []) {
    const countyId = p.county_id
    const existing = countyMap.get(countyId)
    if (existing) {
      existing.pending++
    } else {
      countyMap.set(countyId, {
        county_id: countyId,
        county_name: (p.counties as any)?.county_name || "Unknown",
        state_code: (p.counties as any)?.state_code || "??",
        pending: 1,
      })
    }
  }

  const pendingByCounty = Array.from(countyMap.values()).sort(
    (a, b) => b.pending - a.pending
  )

  return NextResponse.json({
    success: true,
    pending_by_county: pendingByCounty,
    total_pending: pendingByCounty.reduce((sum, row) => sum + row.pending, 0),
  })
}
