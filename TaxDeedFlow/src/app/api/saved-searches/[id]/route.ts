import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/saved-searches/[id]
 * Returns a single saved search by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const searchId = params.id

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  const userId = authResult.user?.id

  if (!userId) {
    return unauthorizedResponse("User ID not found in authentication token")
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Fetch saved search - RLS policies ensure user can only access their own searches
    const { data: savedSearch, error } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("id", searchId)
      .eq("user_id", userId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Saved search not found" },
          { status: 404 }
        )
      }
      console.error("[API Saved Search] Database error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    // Transform to API format
    const transformedSearch = {
      id: savedSearch.id,
      userId: savedSearch.user_id,
      name: savedSearch.name,
      filterCriteria: savedSearch.filter_criteria,
      isDefault: savedSearch.is_default,
      createdAt: savedSearch.created_at,
      updatedAt: savedSearch.updated_at,
    }

    return NextResponse.json({
      data: transformedSearch,
      source: "database",
    })
  } catch (error) {
    console.error("[API Saved Search] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/saved-searches/[id]
 * Update a saved search - requires authentication and CSRF validation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const searchId = params.id

  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Saved Search] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  const userId = authResult.user?.id

  if (!userId) {
    return unauthorizedResponse("User ID not found in authentication token")
  }

  try {
    const body = await request.json()

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode
      return NextResponse.json({
        data: {
          id: searchId,
          userId: userId,
          ...body,
          updatedAt: new Date().toISOString(),
        },
        message: "Saved search updated (demo mode)",
        source: "mock",
      })
    }

    // Build update object (only update provided fields)
    const updateData: {
      name?: string
      filter_criteria?: Record<string, unknown>
      is_default?: boolean
      updated_at: string
    } = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) {
      updateData.name = body.name
    }

    if (body.filterCriteria !== undefined) {
      updateData.filter_criteria = body.filterCriteria
    }

    if (body.isDefault !== undefined) {
      updateData.is_default = body.isDefault
    }

    // If setting this as default, clear other defaults first
    if (body.isDefault === true) {
      await supabase
        .rpc("set_default_search", {
          p_search_id: searchId,
          p_user_id: userId,
        })
    }

    // Update the search - RLS ensures user can only update their own searches
    const { data: updatedSearch, error } = await supabase
      .from("saved_searches")
      .update(updateData)
      .eq("id", searchId)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Saved search not found" },
          { status: 404 }
        )
      }
      console.error("[API Saved Search] Update error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    // Transform to API format
    const transformedSearch = {
      id: updatedSearch.id,
      userId: updatedSearch.user_id,
      name: updatedSearch.name,
      filterCriteria: updatedSearch.filter_criteria,
      isDefault: updatedSearch.is_default,
      createdAt: updatedSearch.created_at,
      updatedAt: updatedSearch.updated_at,
    }

    return NextResponse.json({
      data: transformedSearch,
      message: "Saved search updated successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Saved Search] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/saved-searches/[id]
 * Delete a saved search - requires authentication and CSRF validation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const searchId = params.id

  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Saved Search] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  const userId = authResult.user?.id

  if (!userId) {
    return unauthorizedResponse("User ID not found in authentication token")
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode
      return NextResponse.json({
        message: "Saved search deleted (demo mode)",
        source: "mock",
      })
    }

    // Delete the search - RLS ensures user can only delete their own searches
    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", searchId)
      .eq("user_id", userId)

    if (error) {
      console.error("[API Saved Search] Delete error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Saved search deleted successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Saved Search] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
