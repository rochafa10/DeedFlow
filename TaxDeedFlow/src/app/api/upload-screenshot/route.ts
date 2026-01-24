import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/upload-screenshot
 * Uploads a base64 screenshot to Supabase Storage and updates the database
 *
 * Request body:
 * {
 *   property_id: string,
 *   parcel_id: string,
 *   screenshot_base64: string  // Base64 encoded JPEG image
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { property_id, parcel_id, screenshot_base64 } = body

    if (!property_id || !screenshot_base64) {
      return NextResponse.json(
        { success: false, error: "property_id and screenshot_base64 are required" },
        { status: 400 }
      )
    }

    // Get environment variables inside handler
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Upload Screenshot] Missing Supabase credentials")
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      )
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(screenshot_base64, "base64")

    // Generate filename from parcel_id (same format as n8n workflow)
    const fileName = parcel_id
      ? parcel_id.replace(/\./g, "_").replace(/-/g, "_").replace(/___/g, "___") + ".jpg"
      : `${property_id}.jpg`

    console.log(`[Upload Screenshot] Uploading ${fileName} for property ${property_id}`)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("screenshots")
      .upload(fileName, imageBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      })

    if (uploadError) {
      console.error("[Upload Screenshot] Storage error:", uploadError)
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("screenshots")
      .getPublicUrl(fileName)

    const screenshot_url = urlData.publicUrl

    console.log(`[Upload Screenshot] Uploaded to: ${screenshot_url}`)

    // Update regrid_data with screenshot_url
    const { error: updateError } = await supabase
      .from("regrid_data")
      .update({ screenshot_url })
      .eq("property_id", property_id)

    if (updateError) {
      console.warn("[Upload Screenshot] Failed to update regrid_data:", updateError)
      // Try to insert if update fails (no existing regrid_data record)
      const { error: insertError } = await supabase
        .from("regrid_data")
        .insert({
          property_id,
          screenshot_url,
          scraped_at: new Date().toISOString(),
        })
      
      if (insertError) {
        console.warn("[Upload Screenshot] Failed to insert regrid_data:", insertError)
      }
    }

    // Update property has_screenshot flag
    await supabase
      .from("properties")
      .update({ has_screenshot: true })
      .eq("id", property_id)

    return NextResponse.json({
      success: true,
      property_id,
      screenshot_url,
      fileName,
    })

  } catch (error) {
    console.error("[Upload Screenshot] Server error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    )
  }
}
