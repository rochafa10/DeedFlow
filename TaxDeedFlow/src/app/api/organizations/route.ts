/**
 * Organizations API - List and Create Endpoints
 *
 * GET /api/organizations - List organizations for the authenticated user
 * POST /api/organizations - Create a new organization
 *
 * Organizations are the top-level entity for team collaboration.
 * Users can belong to multiple organizations with different roles.
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import type { CreateOrganizationRequest } from "@/types/team"

/**
 * Validate the create organization request body
 */
function validateCreateRequest(body: unknown): {
  valid: boolean
  data?: CreateOrganizationRequest
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // Name is required
  if (!request.name || typeof request.name !== "string") {
    return { valid: false, error: "name is required and must be a string" }
  }

  if (request.name.trim().length < 2) {
    return { valid: false, error: "name must be at least 2 characters" }
  }

  if (request.name.trim().length > 100) {
    return { valid: false, error: "name must be at most 100 characters" }
  }

  // Slug is required
  if (!request.slug || typeof request.slug !== "string") {
    return { valid: false, error: "slug is required and must be a string" }
  }

  // Validate slug format (lowercase alphanumeric with hyphens)
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (!slugRegex.test(request.slug)) {
    return {
      valid: false,
      error: "slug must be lowercase alphanumeric with hyphens (e.g., 'my-company')"
    }
  }

  if (request.slug.length < 2) {
    return { valid: false, error: "slug must be at least 2 characters" }
  }

  if (request.slug.length > 50) {
    return { valid: false, error: "slug must be at most 50 characters" }
  }

  // Validate planType if provided
  if (request.planType !== undefined) {
    const validPlans = ["free", "team", "enterprise"]
    if (!validPlans.includes(request.planType as string)) {
      return {
        valid: false,
        error: "planType must be one of: free, team, enterprise"
      }
    }
  }

  return {
    valid: true,
    data: {
      name: request.name.trim(),
      slug: request.slug.trim().toLowerCase(),
      planType: (request.planType as "free" | "team" | "enterprise") || "free",
    },
  }
}

/**
 * GET /api/organizations
 * List organizations for the authenticated user
 *
 * Query parameters:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - include_deleted: boolean (default: false) - Admin only
 *
 * Response:
 * {
 *   data: Organization[]
 *   total: number
 *   has_more: boolean
 *   source: "database" | "mock"
 * }
 */
export async function GET(request: NextRequest) {
  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock organizations
      return NextResponse.json({
        data: [
          {
            id: crypto.randomUUID(),
            name: "Demo Organization",
            slug: "demo-org",
            plan_type: "free",
            settings: {
              features: {
                shared_watchlists: true,
                deal_pipeline: false,
                audit_log: false,
                advanced_analytics: false,
              },
              limits: {
                max_members: 5,
                max_watchlists: 10,
                max_properties_per_watchlist: 100,
              },
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        total: 1,
        has_more: false,
        source: "mock",
      })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const includeDeleted = searchParams.get("include_deleted") === "true"

    // Only admins can see deleted organizations
    if (includeDeleted && authResult.user?.role !== "admin") {
      return forbiddenResponse("Only admins can view deleted organizations")
    }

    // Get organizations the user is a member of
    // Join with organization_members to only get orgs the user belongs to
    let query = supabase
      .from("organizations")
      .select(`
        *,
        organization_members!inner(
          id,
          role,
          status
        )
      `, { count: "exact" })
      .eq("organization_members.user_id", authResult.user?.id)
      .eq("organization_members.status", "active")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter out deleted organizations unless requested
    if (!includeDeleted) {
      query = query.is("deleted_at", null)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("[API Organizations] Database error listing organizations:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Transform the data to remove the nested organization_members array
    // and add the user's role at the top level
    const organizations = (data || []).map((org: any) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan_type: org.plan_type,
      settings: org.settings,
      created_at: org.created_at,
      updated_at: org.updated_at,
      deleted_at: org.deleted_at,
      user_role: org.organization_members[0]?.role,
      user_status: org.organization_members[0]?.status,
    }))

    return NextResponse.json({
      data: organizations,
      total: count || 0,
      has_more: (count || 0) > offset + limit,
      source: "database",
    })
  } catch (error) {
    console.error("[API Organizations] Server error:", error)
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
 * POST /api/organizations
 * Create a new organization
 *
 * Request body:
 * {
 *   name: string (required) - Organization name (2-100 chars)
 *   slug: string (required) - URL-safe identifier (2-50 chars, lowercase, alphanumeric with hyphens)
 *   planType?: "free" | "team" | "enterprise" (default: "free")
 * }
 *
 * Response:
 * {
 *   data: Organization
 *   message: string
 *   source: "database" | "mock"
 * }
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Organizations] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can create organizations
  // (viewers are typically read-only)
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot create organizations")
  }

  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = validateCreateRequest(body)

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: validation.error,
        },
        { status: 400 }
      )
    }

    const { name, slug, planType } = validation.data

    // Get Supabase client
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock response
      const mockOrg = {
        id: crypto.randomUUID(),
        name,
        slug,
        plan_type: planType,
        settings: {
          features: {
            shared_watchlists: true,
            deal_pipeline: planType !== "free",
            audit_log: planType === "enterprise",
            advanced_analytics: planType === "enterprise",
          },
          limits: {
            max_members: planType === "free" ? 5 : planType === "team" ? 25 : 100,
            max_watchlists: planType === "free" ? 10 : planType === "team" ? 50 : 200,
            max_properties_per_watchlist: planType === "free" ? 100 : planType === "team" ? 500 : 2000,
          },
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      return NextResponse.json({
        data: mockOrg,
        message: "Organization created successfully (demo mode)",
        source: "mock",
      })
    }

    // Check if slug already exists (not deleted)
    const { data: existingOrg, error: checkError } = await supabase
      .from("organizations")
      .select("id, deleted_at")
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle()

    if (checkError) {
      console.error("[API Organizations] Error checking existing slug:", checkError)
      return NextResponse.json(
        {
          error: "Database error",
          message: checkError.message,
        },
        { status: 500 }
      )
    }

    if (existingOrg) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "An organization with this slug already exists",
        },
        { status: 409 }
      )
    }

    // Call the upsert_organization function to create the organization
    const { data: orgId, error: createError } = await supabase
      .rpc("upsert_organization", {
        p_name: name,
        p_slug: slug,
        p_plan_type: planType || "free",
        p_settings: null, // Use default settings from database
      })

    if (createError) {
      console.error("[API Organizations] Database error creating organization:", createError)
      return NextResponse.json(
        {
          error: "Database error",
          message: createError.message,
        },
        { status: 500 }
      )
    }

    // Add the creating user as an admin member
    const { error: memberError } = await supabase
      .rpc("upsert_organization_member", {
        p_organization_id: orgId,
        p_user_id: authResult.user?.id,
        p_role: "admin",
        p_status: "active",
        p_invited_by: null,
      })

    if (memberError) {
      console.error("[API Organizations] Error adding creator as member:", memberError)
      // Don't fail the request, but log the error
      // The organization was created successfully
    }

    // Fetch the created organization
    const { data: organization, error: fetchError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single()

    if (fetchError || !organization) {
      console.error("[API Organizations] Error fetching created organization:", fetchError)
      return NextResponse.json(
        {
          error: "Server error",
          message: "Organization created but failed to retrieve details",
        },
        { status: 500 }
      )
    }

    console.log("[API Organizations] Organization created successfully:", {
      id: organization.id,
      slug: organization.slug,
      created_by: authResult.user?.email,
    })

    return NextResponse.json({
      data: organization,
      message: "Organization created successfully",
      source: "database",
    }, { status: 201 })
  } catch (error) {
    console.error("[API Organizations] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred while creating the organization",
      },
      { status: 500 }
    )
  }
}
