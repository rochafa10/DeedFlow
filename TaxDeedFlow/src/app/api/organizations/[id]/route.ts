/**
 * Organizations API - Single Organization Endpoints
 *
 * GET /api/organizations/[id] - Get a single organization by ID
 * PATCH /api/organizations/[id] - Update an organization
 * DELETE /api/organizations/[id] - Soft delete an organization (admin only)
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import type { UpdateOrganizationRequest, OrganizationSettings } from "@/types/team"

/**
 * Validate the update organization request body
 */
function validateUpdateRequest(body: unknown): {
  valid: boolean
  data?: UpdateOrganizationRequest
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>
  const updateData: UpdateOrganizationRequest = {}

  // Validate name if provided
  if (request.name !== undefined) {
    if (typeof request.name !== "string") {
      return { valid: false, error: "name must be a string" }
    }
    if (request.name.trim().length < 2) {
      return { valid: false, error: "name must be at least 2 characters" }
    }
    if (request.name.trim().length > 100) {
      return { valid: false, error: "name must be at most 100 characters" }
    }
    updateData.name = request.name.trim()
  }

  // Validate slug if provided
  if (request.slug !== undefined) {
    if (typeof request.slug !== "string") {
      return { valid: false, error: "slug must be a string" }
    }
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!slugRegex.test(request.slug)) {
      return {
        valid: false,
        error: "slug must be lowercase alphanumeric with hyphens"
      }
    }
    if (request.slug.length < 2) {
      return { valid: false, error: "slug must be at least 2 characters" }
    }
    if (request.slug.length > 50) {
      return { valid: false, error: "slug must be at most 50 characters" }
    }
    updateData.slug = request.slug.trim().toLowerCase()
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
    updateData.planType = request.planType as "free" | "team" | "enterprise"
  }

  // Validate settings if provided (partial update allowed)
  if (request.settings !== undefined) {
    if (typeof request.settings !== "object" || request.settings === null) {
      return { valid: false, error: "settings must be an object" }
    }
    updateData.settings = request.settings as Partial<OrganizationSettings>
  }

  // Must have at least one field to update
  if (Object.keys(updateData).length === 0) {
    return { valid: false, error: "At least one field must be provided to update" }
  }

  return {
    valid: true,
    data: updateData,
  }
}

/**
 * GET /api/organizations/[id]
 * Get a single organization by ID
 *
 * Returns the organization details along with member count and user's role.
 * Users can only access organizations they are members of.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    const supabase = createServerClient()
    const { id } = params

    if (!supabase) {
      // Demo mode - return mock organization
      return NextResponse.json({
        data: {
          id,
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
          member_count: 1,
          user_role: "admin",
        },
        source: "mock",
      })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Validation error", message: "Invalid organization ID format" },
        { status: 400 }
      )
    }

    // Get organization with member count
    // RLS policies ensure user can only see orgs they're a member of
    const { data: organization, error } = await supabase
      .from("organizations")
      .select(`
        *,
        organization_members!inner(
          id,
          role,
          status
        )
      `)
      .eq("id", id)
      .eq("organization_members.user_id", authResult.user?.id)
      .eq("organization_members.status", "active")
      .is("deleted_at", null)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            error: "Not found",
            message: "Organization not found or you do not have access"
          },
          { status: 404 }
        )
      }
      console.error("[API Organizations] Database error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    // Get member count
    const { count: memberCount, error: countError } = await supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", id)
      .eq("status", "active")

    if (countError) {
      console.error("[API Organizations] Error counting members:", countError)
    }

    // Transform response
    const response = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan_type: organization.plan_type,
      settings: organization.settings,
      created_at: organization.created_at,
      updated_at: organization.updated_at,
      deleted_at: organization.deleted_at,
      member_count: memberCount || 0,
      user_role: organization.organization_members[0]?.role,
      user_status: organization.organization_members[0]?.status,
    }

    return NextResponse.json({
      data: response,
      source: "database",
    })
  } catch (error) {
    console.error("[API Organizations] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/organizations/[id]
 * Update an organization
 *
 * Request body (all fields optional):
 * {
 *   name?: string
 *   slug?: string
 *   planType?: "free" | "team" | "enterprise"
 *   settings?: Partial<OrganizationSettings>
 * }
 *
 * Only organization admins can update organizations.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CSRF Protection
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

  try {
    const supabase = createServerClient()
    const { id } = params
    const body = await request.json()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Validation error", message: "Invalid organization ID format" },
        { status: 400 }
      )
    }

    // Validate request body
    const validation = validateUpdateRequest(body)
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: validation.error,
        },
        { status: 400 }
      )
    }

    const updateData = validation.data

    // Check if user is an admin of this organization
    const { data: membership, error: memberError } = await supabase
      .from("organization_members")
      .select("role, status")
      .eq("organization_id", id)
      .eq("user_id", authResult.user?.id)
      .eq("status", "active")
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You do not have access to this organization"
        },
        { status: 403 }
      )
    }

    // Only admins can update organizations
    if (membership.role !== "admin") {
      return forbiddenResponse("Only organization admins can update organization settings")
    }

    // If slug is being updated, check for conflicts
    if (updateData.slug) {
      const { data: existingOrg, error: checkError } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", updateData.slug)
        .neq("id", id)
        .is("deleted_at", null)
        .maybeSingle()

      if (checkError) {
        console.error("[API Organizations] Error checking slug:", checkError)
        return NextResponse.json(
          { error: "Database error", message: checkError.message },
          { status: 500 }
        )
      }

      if (existingOrg) {
        return NextResponse.json(
          {
            error: "Validation error",
            message: "An organization with this slug already exists"
          },
          { status: 409 }
        )
      }
    }

    // Use the upsert_organization function to update
    const { data: updatedId, error: updateError } = await supabase
      .rpc("upsert_organization", {
        p_slug: updateData.slug || null,
        p_name: updateData.name || null,
        p_plan_type: updateData.planType || null,
        p_settings: updateData.settings ? JSON.stringify(updateData.settings) : null,
      })

    if (updateError) {
      console.error("[API Organizations] Update error:", updateError)
      return NextResponse.json(
        { error: "Database error", message: updateError.message },
        { status: 500 }
      )
    }

    // Fetch the updated organization
    const { data: organization, error: fetchError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", updatedId || id)
      .single()

    if (fetchError || !organization) {
      console.error("[API Organizations] Error fetching updated organization:", fetchError)
      return NextResponse.json(
        { error: "Server error", message: "Failed to retrieve updated organization" },
        { status: 500 }
      )
    }

    console.log("[API Organizations] Organization updated successfully:", {
      id: organization.id,
      updated_by: authResult.user?.email,
      fields: Object.keys(updateData),
    })

    return NextResponse.json({
      data: organization,
      message: "Organization updated successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Organizations] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organizations/[id]
 * Soft delete an organization (admin only)
 *
 * Sets the deleted_at timestamp. Only organization admins can delete.
 * This is a soft delete - data is retained but the organization is hidden.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CSRF Protection
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    const supabase = createServerClient()
    const { id } = params

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Validation error", message: "Invalid organization ID format" },
        { status: 400 }
      )
    }

    // Check if user is an admin of this organization
    const { data: membership, error: memberError } = await supabase
      .from("organization_members")
      .select("role, status")
      .eq("organization_id", id)
      .eq("user_id", authResult.user?.id)
      .eq("status", "active")
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You do not have access to this organization"
        },
        { status: 403 }
      )
    }

    // Only admins can delete organizations
    if (membership.role !== "admin") {
      return forbiddenResponse("Only organization admins can delete organizations")
    }

    // Soft delete the organization by setting deleted_at
    const { error: deleteError } = await supabase
      .from("organizations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null)

    if (deleteError) {
      console.error("[API Organizations] Delete error:", deleteError)
      return NextResponse.json(
        { error: "Database error", message: deleteError.message },
        { status: 500 }
      )
    }

    console.log("[API Organizations] Organization deleted successfully:", {
      id,
      deleted_by: authResult.user?.email,
    })

    return NextResponse.json({
      message: "Organization deleted successfully",
    })
  } catch (error) {
    console.error("[API Organizations] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
