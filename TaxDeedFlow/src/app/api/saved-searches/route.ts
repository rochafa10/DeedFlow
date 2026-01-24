import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/saved-searches
 * Returns a list of saved searches for the authenticated user
 */
export async function GET(request: NextRequest) {
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

    // Fetch saved searches using the helper function
    const { data, error } = await supabase
      .rpc("get_user_saved_searches", {
        p_user_id: userId,
        p_limit: 50,
      })

    if (error) {
      console.error("[API Saved Searches] Database error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Transform database format to API format (snake_case to camelCase)
    const transformedSearches = (data || []).map((search: {
      id: string
      name: string
      filter_criteria: Record<string, unknown>
      is_default: boolean
      created_at: string
      updated_at: string
    }) => ({
      id: search.id,
      userId: userId,
      name: search.name,
      filterCriteria: search.filter_criteria,
      isDefault: search.is_default,
      createdAt: search.created_at,
      updatedAt: search.updated_at,
    }))

    return NextResponse.json({
      data: transformedSearches,
      count: transformedSearches.length,
      source: "database",
    })
  } catch (error) {
    console.error("[API Saved Searches] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/saved-searches
 * Create a new saved search - requires authentication and CSRF validation
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Saved Searches] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // All authenticated users can create saved searches
  const userId = authResult.user?.id

  if (!userId) {
    return unauthorizedResponse("User ID not found in authentication token")
  }

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "Search name is required and must be a string",
        },
        { status: 400 }
      )
    }

    if (!body.filterCriteria || typeof body.filterCriteria !== "object") {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "Filter criteria is required and must be an object",
        },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with mock ID
      return NextResponse.json({
        data: {
          id: `search-${Date.now()}`,
          userId: userId,
          name: body.name,
          filterCriteria: body.filterCriteria,
          isDefault: body.isDefault || false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        message: "Saved search created (demo mode)",
        source: "mock",
      })
    }

    // Use the upsert helper function to prevent duplicate names
    const { data: searchId, error } = await supabase
      .rpc("upsert_saved_search", {
        p_user_id: userId,
        p_name: body.name,
        p_filter_criteria: body.filterCriteria,
        p_is_default: body.isDefault || false,
      })

    if (error) {
      console.error("[API Saved Searches] Insert error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Fetch the created/updated search
    const { data: savedSearch, error: fetchError } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("id", searchId)
      .single()

    if (fetchError) {
      console.error("[API Saved Searches] Fetch error:", fetchError)
      return NextResponse.json(
        {
          error: "Database error",
          message: fetchError.message,
        },
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
      message: "Saved search created successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Saved Searches] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}
