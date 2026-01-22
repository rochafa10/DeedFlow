import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import { validateInternalApiAuth } from "@/lib/auth/internal-api-auth"

/**
 * POST /api/scrape/screenshot
 * Captures a screenshot of a Regrid property page and uploads to Supabase Storage
 *
 * Called by n8n workflow "TDF - Regrid Scraper" via HTTP Request node
 *
 * Request body:
 * {
 *   property_id: string,
 *   regrid_url: string,
 *   parcel_id?: string,
 *   property_address?: string  // Used for search-based navigation
 * }
 *
 * Returns:
 * {
 *   success: boolean,
 *   screenshot_url?: string,
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
  // Validate internal API authentication
  const authResult = await validateInternalApiAuth(request)

  if (!authResult.valid) {
    return NextResponse.json(
      { error: "Unauthorized", message: authResult.error || "Authentication required" },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { property_id, regrid_url, parcel_id, property_address: providedAddress } = body

    if (!property_id || !regrid_url) {
      return NextResponse.json(
        { error: "Validation error", message: "property_id and regrid_url are required" },
        { status: 400 }
      )
    }

    console.log(`[Screenshot API] Capturing screenshot for property ${property_id}`)
    console.log(`[Screenshot API] URL: ${regrid_url}`)

    // Get property details for search-based navigation
    let propertyAddress = providedAddress
    let parcelIdForSearch = parcel_id
    let county = ""
    let state = ""
    let latitude: number | null = null
    let longitude: number | null = null

    // Try to get more details from database
    const supabase = createServerClient()
    if (supabase) {
      const { data: property } = await supabase
        .from("properties")
        .select(`
          property_address,
          parcel_id,
          county_id,
          counties!inner(county_name, state_code)
        `)
        .eq("id", property_id)
        .single()

      if (property) {
        propertyAddress = propertyAddress || property.property_address
        parcelIdForSearch = parcelIdForSearch || property.parcel_id
        county = (property.counties as any)?.county_name || ""
        state = (property.counties as any)?.state_code || ""
      }

      // Also try to get coordinates from regrid_data
      const { data: regridData } = await supabase
        .from("regrid_data")
        .select("latitude, longitude")
        .eq("property_id", property_id)
        .single()

      if (regridData) {
        latitude = regridData.latitude
        longitude = regridData.longitude
      }
    }

    console.log(`[Screenshot API] Search params:`)
    console.log(`  - Parcel ID: ${parcelIdForSearch}`)
    console.log(`  - Address: ${propertyAddress || "N/A"}`)
    console.log(`  - County: ${county}, State: ${state}`)
    console.log(`  - Coordinates: ${latitude}, ${longitude}`)

    // Capture screenshot AND extract data using Playwright
    const result = await captureScreenshot(regrid_url, {
      parcelId: parcelIdForSearch,
      address: propertyAddress,
      county,
      state,
      latitude,
      longitude,
    })

    if (!result) {
      console.error(`[Screenshot API] Failed to capture screenshot for ${property_id}`)
      return NextResponse.json({
        success: false,
        error: "Failed to capture screenshot",
        property_id,
      }, { status: 422 })
    }

    const { screenshot: screenshotBuffer, extractedData } = result

    // Upload to Supabase Storage
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Use same filename format as n8n workflow: parcel_id with . and - replaced by _
    const fileName = parcelIdForSearch
      ? parcelIdForSearch.replace(/\./g, "_").replace(/-/g, "_") + ".jpg"
      : `${property_id}.jpg`

    // Upload screenshot to storage (same bucket as n8n workflow)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("screenshots")
      .upload(fileName, screenshotBuffer, {
        contentType: "image/jpeg",
        upsert: true, // Overwrite if exists
      })

    if (uploadError) {
      console.error("[Screenshot API] Storage upload error:", uploadError)
      return NextResponse.json({
        success: false,
        error: uploadError.message,
        property_id,
      }, { status: 500 })
    }

    // Get public URL (same format as n8n workflow)
    const { data: urlData } = supabase.storage
      .from("screenshots")
      .getPublicUrl(fileName)

    const screenshot_url = urlData.publicUrl

    // Upsert regrid_data with screenshot_url AND extracted property data
    // Only include columns that exist in the regrid_data table schema
    const regridDataToUpsert: Record<string, any> = {
      property_id,
      screenshot_url,
      scraped_at: new Date().toISOString(),
    }

    // Add extracted data if available (only valid columns from regrid_data table)
    if (extractedData) {
      // Property details
      if (extractedData.property_type) regridDataToUpsert.property_type = extractedData.property_type
      if (extractedData.property_class) regridDataToUpsert.property_class = extractedData.property_class
      if (extractedData.land_use) regridDataToUpsert.land_use = extractedData.land_use
      if (extractedData.zoning) regridDataToUpsert.zoning = extractedData.zoning
      // Lot information
      if (extractedData.lot_size_sqft) regridDataToUpsert.lot_size_sqft = extractedData.lot_size_sqft
      if (extractedData.lot_size_acres) regridDataToUpsert.lot_size_acres = extractedData.lot_size_acres
      // Building information
      if (extractedData.building_sqft) regridDataToUpsert.building_sqft = extractedData.building_sqft
      if (extractedData.year_built) regridDataToUpsert.year_built = extractedData.year_built
      if (extractedData.bedrooms) regridDataToUpsert.bedrooms = extractedData.bedrooms
      if (extractedData.bathrooms) regridDataToUpsert.bathrooms = extractedData.bathrooms
      // Valuation
      if (extractedData.assessed_value) regridDataToUpsert.assessed_value = extractedData.assessed_value
      if (extractedData.assessed_land_value) regridDataToUpsert.assessed_land_value = extractedData.assessed_land_value
      if (extractedData.assessed_improvement_value) regridDataToUpsert.assessed_improvement_value = extractedData.assessed_improvement_value
      if (extractedData.market_value) regridDataToUpsert.market_value = extractedData.market_value
      // Geographic
      if (extractedData.latitude) regridDataToUpsert.latitude = extractedData.latitude
      if (extractedData.longitude) regridDataToUpsert.longitude = extractedData.longitude
    }

    const { error: upsertError } = await supabase
      .from("regrid_data")
      .upsert(regridDataToUpsert, {
        onConflict: "property_id",
      })

    if (upsertError) {
      console.warn("[Screenshot API] Failed to upsert regrid_data:", upsertError)
      // Don't fail the request, screenshot was still captured
    } else {
      console.log("[Screenshot API] regrid_data upserted successfully with extracted data")
    }

    // Update property with address if extracted and not already set
    const propertyUpdates: Record<string, any> = { 
      has_screenshot: true,
      has_regrid_data: true
    }
    if (extractedData?.property_address) {
      propertyUpdates.property_address = extractedData.property_address
    }

    await supabase
      .from("properties")
      .update(propertyUpdates)
      .eq("id", property_id)

    console.log(`[Screenshot API] Successfully captured screenshot for ${property_id}`)
    console.log(`[Screenshot API] URL: ${screenshot_url}`)

    return NextResponse.json({
      success: true,
      property_id,
      screenshot_url,
      parcel_id,
      extracted_data: extractedData,
    })

  } catch (error) {
    console.error("[Screenshot API] Server error:", error)
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

// Regrid credentials from environment or defaults
const REGRID_EMAIL = process.env.REGRID_EMAIL || "lulu.lopes.sousa@gmail.com"
const REGRID_PASSWORD = process.env.REGRID_PASSWORD || "Bia@2020"

/**
 * Logs into Regrid.com using Playwright
 * Uses JavaScript to trigger the login modal directly (works even with collapsed sidebar)
 * Returns true if login successful, false otherwise
 */
async function loginToRegrid(page: any): Promise<boolean> {
  try {
    console.log("[Screenshot API] Attempting Regrid login...")

    // Navigate to Regrid main app page
    await page.goto("https://app.regrid.com/us", {
      waitUntil: "networkidle",
      timeout: 30000,
    })

    // Wait for page to load
    await page.waitForTimeout(2000)

    // Check if already logged in by looking for user menu or absence of sign-in link
    const isLoggedIn = await page.evaluate(() => {
      // If we find a sign-in link, we're NOT logged in
      const signInLink = document.querySelector('a[href="#signinModal"]')
      // Also check for user-specific elements that only appear when logged in
      const userMenu = document.querySelector('[data-testid="user-menu"], .user-avatar, .user-name')
      return !signInLink || !!userMenu
    })

    if (isLoggedIn) {
      console.log("[Screenshot API] Already logged in")
      return true
    }

    console.log("[Screenshot API] Not logged in, attempting to open login modal...")

    // Method 1: Try to trigger modal directly via JavaScript click on the anchor
    // This works even if the sidebar is collapsed because we click via JS, not visually
    const modalOpened = await page.evaluate(() => {
      const signInLink = document.querySelector('a[href="#signinModal"]') as HTMLElement
      if (signInLink) {
        signInLink.click()
        return true
      }
      return false
    })

    if (!modalOpened) {
      console.error("[Screenshot API] Could not find sign-in link to click")
      return false
    }

    console.log("[Screenshot API] Triggered login modal via JavaScript")

    // Wait for modal to appear
    await page.waitForTimeout(2000)

    // Check if modal appeared
    const modalVisible = await page.evaluate(() => {
      const modal = document.querySelector('#signinModal')
      if (modal) {
        // Check if modal is visible (has display block or similar)
        const style = window.getComputedStyle(modal)
        return style.display !== 'none' && style.visibility !== 'hidden'
      }
      return false
    })

    if (!modalVisible) {
      console.log("[Screenshot API] Modal not visible, trying to show it via Bootstrap...")
      // Try to show modal using Bootstrap API
      await page.evaluate(() => {
        const modal = document.querySelector('#signinModal')
        if (modal && (window as any).bootstrap?.Modal) {
          const bsModal = new (window as any).bootstrap.Modal(modal)
          bsModal.show()
        } else if (modal && (window as any).$) {
          // Try jQuery method
          (window as any).$('#signinModal').modal('show')
        }
      })
      await page.waitForTimeout(1500)
    }

    // Look for the email field - try multiple selectors
    const emailSelectors = [
      '#signinModal input[type="email"]',
      '#signinModal input[placeholder*="Email"]',
      '#signinModal input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="Email"]',
      'input[name="email"]',
      '#email',
    ]

    let emailFieldFound = false
    for (const selector of emailSelectors) {
      const isVisible = await page.locator(selector).first().isVisible({ timeout: 1000 }).catch(() => false)
      if (isVisible) {
        await page.locator(selector).first().fill(REGRID_EMAIL)
        console.log(`[Screenshot API] Entered email using selector: ${selector}`)
        emailFieldFound = true
        break
      }
    }

    if (!emailFieldFound) {
      // Try filling via JavaScript as fallback
      const emailFilled = await page.evaluate((email: string) => {
        const inputs = Array.from(document.querySelectorAll('input[type="email"], input[placeholder*="Email"], input[name="email"]'))
        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i]
          if (input instanceof HTMLInputElement) {
            input.value = email
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
            return true
          }
        }
        return false
      }, REGRID_EMAIL)

      if (!emailFilled) {
        console.error("[Screenshot API] Email field not found")
        await page.screenshot({ path: '/tmp/regrid-login-debug.png' }).catch(() => {})
        return false
      }
      console.log("[Screenshot API] Entered email via JavaScript")
    }

    // Find and fill password field
    const passwordSelectors = [
      '#signinModal input[type="password"]',
      'input[type="password"]',
    ]

    let passwordFieldFound = false
    for (const selector of passwordSelectors) {
      const isVisible = await page.locator(selector).first().isVisible({ timeout: 1000 }).catch(() => false)
      if (isVisible) {
        await page.locator(selector).first().fill(REGRID_PASSWORD)
        console.log(`[Screenshot API] Entered password using selector: ${selector}`)
        passwordFieldFound = true
        break
      }
    }

    if (!passwordFieldFound) {
      // Try filling via JavaScript as fallback
      const passwordFilled = await page.evaluate((password: string) => {
        const inputs = Array.from(document.querySelectorAll('input[type="password"]'))
        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i]
          if (input instanceof HTMLInputElement) {
            input.value = password
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
            return true
          }
        }
        return false
      }, REGRID_PASSWORD)

      if (!passwordFilled) {
        console.error("[Screenshot API] Password field not found")
        return false
      }
      console.log("[Screenshot API] Entered password via JavaScript")
    }

    // Click Sign in button
    const buttonSelectors = [
      '#signinModal button[type="submit"]',
      '#signinModal button:has-text("Sign in")',
      '#signinModal button:has-text("Log in")',
      'button[type="submit"]',
      'button:has-text("Sign in")',
    ]

    let buttonClicked = false
    for (const selector of buttonSelectors) {
      const isVisible = await page.locator(selector).first().isVisible({ timeout: 1000 }).catch(() => false)
      if (isVisible) {
        await page.locator(selector).first().click()
        console.log(`[Screenshot API] Clicked submit button using selector: ${selector}`)
        buttonClicked = true
        break
      }
    }

    if (!buttonClicked) {
      // Try clicking via JavaScript
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('#signinModal button[type="submit"], #signinModal button'))
        for (let i = 0; i < buttons.length; i++) {
          const btn = buttons[i]
          if (btn instanceof HTMLButtonElement && (btn.type === 'submit' || btn.textContent?.toLowerCase().includes('sign'))) {
            btn.click()
            return true
          }
        }
        // Try submitting the form directly
        const form = document.querySelector('#signinModal form')
        if (form instanceof HTMLFormElement) {
          form.submit()
          return true
        }
        return false
      })

      if (!clicked) {
        console.error("[Screenshot API] Submit button not found")
        return false
      }
      console.log("[Screenshot API] Clicked submit via JavaScript")
    }

    // Wait for login to complete
    console.log("[Screenshot API] Waiting for login to complete...")
    await page.waitForTimeout(5000)

    // Check if login was successful
    const loginSuccessful = await page.evaluate(() => {
      // If sign-in link is gone or hidden, login was successful
      const signInLink = document.querySelector('a[href="#signinModal"]')
      if (!signInLink) return true

      // Check if the element is visible
      const style = window.getComputedStyle(signInLink)
      if (style.display === 'none' || style.visibility === 'hidden') return true

      // Check for error messages
      const errorMsg = document.querySelector('.error-message, .alert-danger, [class*="error"]')
      if (errorMsg && errorMsg.textContent?.toLowerCase().includes('invalid')) {
        return false
      }

      // Check for user-specific elements
      const userElements = document.querySelectorAll('[data-testid="user-menu"], .user-avatar, .account-name')
      return userElements.length > 0
    })

    if (loginSuccessful) {
      console.log("[Screenshot API] Regrid login successful!")
      return true
    } else {
      console.error("[Screenshot API] Login may have failed")
      await page.screenshot({ path: '/tmp/regrid-login-failed.png' }).catch(() => {})
      return false
    }

  } catch (error) {
    console.error("[Screenshot API] Regrid login error:", error)
    return false
  }
}

interface ScreenshotResult {
  screenshot: Buffer;
  extractedData: Record<string, unknown>;
}

interface SearchParams {
  parcelId?: string
  address?: string
  county?: string
  state?: string
  latitude?: number | null
  longitude?: number | null
}

/**
 * Captures a screenshot of the given property using Playwright
 * Uses parcel ID search with keyboard navigation (ArrowDown + Enter) for accuracy
 * Logs into Regrid first to avoid free tier limitations
 * Returns the screenshot as a Buffer
 */
async function captureScreenshot(url: string, params: SearchParams): Promise<ScreenshotResult | null> {
  // Dynamic import of Playwright to avoid issues in serverless
  try {
    const { chromium } = await import("playwright")

    // Launch browser
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    try {
      const context = await browser.newContext({
        // Use larger viewport to ensure sidebar is visible/expanded
        viewport: { width: 1920, height: 1080 },
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      })

      const page = await context.newPage()

      // Login to Regrid first to get unlimited access
      const loginSuccess = await loginToRegrid(page)
      if (!loginSuccess) {
        console.warn("[Screenshot API] Regrid login failed, continuing without login (limited to 5/day)")
      }

      // Determine the best search query - use just parcel ID (adding county/state confuses Regrid search)
      let searchQuery = ""
      if (params.parcelId) {
        // Use just parcel ID - Regrid search works better with exact parcel format
        searchQuery = params.parcelId
        console.log("[Screenshot API] Using parcel ID search:", searchQuery)
      } else if (params.address) {
        searchQuery = params.address
        console.log("[Screenshot API] Using address search:", searchQuery)
      }

      // Step 1: Navigate to county page to establish geographic context
      if (params.state && params.county) {
        const stateSlug = params.state.toLowerCase()
        const countySlug = params.county.toLowerCase().replace(/\s+/g, '-')
        const countyUrl = `https://app.regrid.com/us/${stateSlug}/${countySlug}`
        console.log(`[Screenshot API] Navigating to county page: ${countyUrl}`)
        await page.goto(countyUrl, { waitUntil: "networkidle", timeout: 30000 })
        await page.waitForTimeout(2000)
      } else {
        // Fallback to US level
        console.log("[Screenshot API] No county/state, navigating to app.regrid.com/us")
        await page.goto("https://app.regrid.com/us", { waitUntil: "networkidle", timeout: 30000 })
        await page.waitForTimeout(2000)
      }

      // Step 2: Search for the parcel using keyboard navigation
      // This is the approach that works reliably on Regrid:
      // 1. Type in search box
      // 2. Wait for autocomplete dropdown
      // 3. Press ArrowDown to select first result
      // 4. Press Enter to navigate to parcel
      if (searchQuery) {
        console.log("[Screenshot API] Searching for:", searchQuery)

        // Find the search box
        const searchSelectors = [
          'input[placeholder*="Search"]',
          'input[placeholder*="search"]',
          '[role="searchbox"]',
          'input[type="search"]',
          '#search-input',
          '.search-input',
          'input[aria-label*="Search"]',
        ]

        let searchBox = null
        for (const selector of searchSelectors) {
          const element = page.locator(selector).first()
          if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
            searchBox = element
            console.log(`[Screenshot API] Found search box with selector: ${selector}`)
            break
          }
        }

        if (searchBox) {
          // Click to focus and fill the search box
          await searchBox.click()
          await page.waitForTimeout(500)
          await searchBox.fill(searchQuery)
          console.log("[Screenshot API] Entered search query:", searchQuery)

          // Wait for autocomplete dropdown to appear
          await page.waitForTimeout(2500)

          // Use keyboard navigation: ArrowDown to select first result, Enter to navigate
          console.log("[Screenshot API] Pressing ArrowDown to select first result...")
          await page.keyboard.press("ArrowDown")
          await page.waitForTimeout(500)

          console.log("[Screenshot API] Pressing Enter to navigate to parcel...")
          await page.keyboard.press("Enter")

          // Wait for parcel page to load - check for scale change or property details
          console.log("[Screenshot API] Waiting for parcel to load...")
          await page.waitForTimeout(4000)

          // Verify we landed on a parcel page
          const parcelLoaded = await page.evaluate(() => {
            // Check 1: Look for small map scale (100 ft, 200 ft, etc.) indicating zoom
            const scaleText = document.body.innerText
            const smallScale = /\d+\s*(ft|m)\b/i.test(scaleText) && !scaleText.includes('5 mi') && !scaleText.includes('10 mi')

            // Check 2: Look for "Property Details" panel
            const hasPropertyDetails = document.body.innerText.includes('Property Details')

            // Check 3: Check URL for parcel indicator
            const urlHasParcel = window.location.href.includes('#t=property') ||
                                 window.location.href.includes('/parcel/')

            // Check 4: "Zoom in to see parcels" message is gone
            const noZoomMessage = !document.body.innerText.includes('Zoom in to see parcels')

            return {
              smallScale,
              hasPropertyDetails,
              urlHasParcel,
              noZoomMessage,
              success: (hasPropertyDetails || urlHasParcel) && noZoomMessage
            }
          })

          console.log("[Screenshot API] Parcel load check:", JSON.stringify(parcelLoaded))

          if (!parcelLoaded.success) {
            console.warn("[Screenshot API] Parcel may not have loaded correctly, but continuing with screenshot")
          }

        } else {
          // Fallback: Use keyboard shortcut to open search
          console.warn("[Screenshot API] Search box not found, trying keyboard shortcut...")
          await page.keyboard.press('/')
          await page.waitForTimeout(500)
          await page.keyboard.type(searchQuery)
          await page.waitForTimeout(2000)
          await page.keyboard.press("ArrowDown")
          await page.waitForTimeout(500)
          await page.keyboard.press("Enter")
          await page.waitForTimeout(4000)
        }
      } else {
        // No search parameters - navigate to provided URL
        console.log("[Screenshot API] No search params, navigating to URL:", url)
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 })
        await page.waitForTimeout(3000)
      }

      // Final wait for map to fully render
      await page.waitForTimeout(2000)

      // Try to close any popups/modals that might appear
      try {
        const closeSelectors = [
          '[aria-label="Close"]',
          '.close-button',
          '.modal-close',
          '[data-dismiss="modal"]',
          'button:has-text("Close")',
          'button:has-text("Accept")',
          'button:has-text("Got it")',
          'button:has-text("Dismiss")',
        ]

        for (const selector of closeSelectors) {
          const closeBtn = page.locator(selector).first()
          if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await closeBtn.click().catch(() => {})
            await page.waitForTimeout(500)
          }
        }
      } catch {
        // Ignore popup closing errors
      }

      // Wait a moment for property details panel to settle
      await page.waitForTimeout(1500)

      // EXTRACT PROPERTY DATA from the panel BEFORE closing it
      console.log("[Screenshot API] Extracting property data from panel...")
      const extractedData = await page.evaluate(() => {
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

        // Extract address from panel header
        const addressMatch = bodyText.match(/Property Details\s*\n([^\n]+(?:Ave|St|Rd|Dr|Ln|Ct|Blvd|Way|Pl|Cir|Ter)[^\n]*)/i)
        if (addressMatch) result.property_address = addressMatch[1].trim()

        // Extract owner name
        const ownerMatch = bodyText.match(/Owner\s+Name[:\s]+([^\n]+)/i)
        if (ownerMatch) result.owner_name = ownerMatch[1].trim()

        // Extract property data using regex patterns
        const patterns: Record<string, RegExp> = {
          property_type: /Property\s+Type[:\s]+([^\n]+)/i,
          property_class: /Zoning\s+Type[:\s]+([^\n]+)/i,
          land_use: /Parcel\s+Use\s+Code[:\s]+"?([^"\n]+)"?/i,
          zoning: /Zoning\s+Subtype[:\s]+([^\n]+)/i,
          lot_size_acres: /(?:Deed\s+Acres|Calculated\s+Parcel\s+Area)[:\s]+"?([\d.]+)"?/i,
          lot_size_sqft: /Lot\s+Size[:\s]+([\d,]+)\s*(?:sq\s*ft|SF)/i,
          building_sqft: /Building\s+Area[:\s]+([\d,]+)\s*(?:sq\s*ft|SF)/i,
          year_built: /Year\s+Built[:\s]+(\d{4})/i,
          bedrooms: /Bedrooms?[:\s]+(\d+)/i,
          bathrooms: /Bathrooms?[:\s]+([\d.]+)/i,
          assessed_value: /Total\s+Parcel\s+Value[:\s]+\$?([\d,]+\.?\d*)/i,
          assessed_land_value: /Land\s+Value[:\s]+\$?([\d,]+\.?\d*)/i,
          assessed_improvement_value: /Improvement\s+Value[:\s]+\$?([\d,]+\.?\d*)/i,
          market_value: /Market\s+Value[:\s]+\$?([\d,]+)/i,
        }

        for (const [key, pattern] of Object.entries(patterns)) {
          const match = bodyText.match(pattern)
          if (match && match[1]) {
            let value = match[1].trim().replace(/"/g, '')
            if (['lot_size_sqft', 'lot_size_acres', 'building_sqft', 'assessed_value', 'assessed_land_value', 'assessed_improvement_value', 'market_value'].includes(key)) {
              result[key] = parseFloat(value.replace(/,/g, '')) || null
            } else if (['year_built', 'bedrooms'].includes(key)) {
              result[key] = parseInt(value) || null
            } else if (key === 'bathrooms') {
              result[key] = parseFloat(value) || null
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

        return result
      })

      console.log("[Screenshot API] Extracted data:", JSON.stringify(extractedData, null, 2))

      // Close the Property Details panel to show just the map with highlighted parcel
      try {
        const propertyPanelClose = page.locator('#property > .close')
        if (await propertyPanelClose.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log("[Screenshot API] Closing Property Details panel...")
          await propertyPanelClose.click()
          await page.waitForTimeout(1000) // Wait for panel to close
          console.log("[Screenshot API] Property Details panel closed")
        }
      } catch (e) {
        console.log("[Screenshot API] Could not close Property Details panel:", e)
      }

      // Log final URL for debugging
      const finalUrl = page.url()
      console.log("[Screenshot API] Final URL before screenshot:", finalUrl)

      // Capture screenshot
      const screenshot = await page.screenshot({
        type: "png",
        fullPage: false,
      })

      await context.close()
      return { screenshot: Buffer.from(screenshot), extractedData }

    } finally {
      await browser.close()
    }

  } catch (error) {
    console.error("[Screenshot API] Playwright error:", error)
    return null
  }
}

/**
 * GET /api/scrape/screenshot
 * Health check and status endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Screenshot Capture API",
    version: "1.0.0",
    endpoints: {
      "POST /api/scrape/screenshot": {
        description: "Capture screenshot of a Regrid property page",
        required_fields: ["property_id", "regrid_url"],
        optional_fields: ["parcel_id"],
        returns: ["success", "screenshot_url", "error"],
      }
    },
    note: "Uses Playwright to capture real screenshots and uploads to Supabase Storage.",
  })
}
