/**
 * Organization Members API
 *
 * GET /api/organizations/[id]/members - List all active members of an organization
 * POST /api/organizations/[id]/members - Add a new member directly (admin only)
 * PATCH /api/organizations/[id]/members - Update a member's role (admin only)
 * DELETE /api/organizations/[id]/members - Remove a member (admin only)
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import { logMemberAudit } from "@/lib/auth/audit-log"
import type { UpdateMemberRoleRequest } from "@/types/team"

/**
 * Validate member role value
 */
function isValidMemberRole(role: string): role is "admin" | "analyst" | "viewer" {
  return ["admin", "analyst", "viewer"].includes(role)
}

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Validate the update member role request body
 */
function validateUpdateRoleRequest(body: unknown): {
  valid: boolean
  data?: { member_id: string; role: "admin" | "analyst" | "viewer" }
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // Member ID is required
  if (!request.member_id || typeof request.member_id !== "string") {
    return { valid: false, error: "member_id is required and must be a string" }
  }

  if (!isValidUUID(request.member_id)) {
    return { valid: false, error: "member_id must be a valid UUID" }
  }

  // Role is required
  if (!request.role || typeof request.role !== "string") {
    return { valid: false, error: "role is required and must be a string" }
  }

  if (!isValidMemberRole(request.role)) {
    return {
      valid: false,
      error: "role must be one of: admin, analyst, viewer",
    }
  }

  return {
    valid: true,
    data: {
      member_id: request.member_id,
      role: request.role as "admin" | "analyst" | "viewer",
    },
  }
}

/**
 * Validate the add member request body
 */
function validateAddMemberRequest(body: unknown): {
  valid: boolean
  data?: { user_id: string; role: "admin" | "analyst" | "viewer" }
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // User ID is required
  if (!request.user_id || typeof request.user_id !== "string") {
    return { valid: false, error: "user_id is required and must be a string" }
  }

  if (!isValidUUID(request.user_id)) {
    return { valid: false, error: "user_id must be a valid UUID" }
  }

  // Role is optional, defaults to 'viewer'
  const role = request.role || "viewer"
  if (typeof role !== "string" || !isValidMemberRole(role)) {
    return {
      valid: false,
      error: "role must be one of: admin, analyst, viewer",
    }
  }

  return {
    valid: true,
    data: {
      user_id: request.user_id,
      role: role as "admin" | "analyst" | "viewer",
    },
  }
}

/**
 * Validate the remove member request body
 */
function validateRemoveMemberRequest(body: unknown): {
  valid: boolean
  data?: { member_id: string }
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // Member ID is required
  if (!request.member_id || typeof request.member_id !== "string") {
    return { valid: false, error: "member_id is required and must be a string" }
  }

  if (!isValidUUID(request.member_id)) {
    return { valid: false, error: "member_id must be a valid UUID" }
  }

  return {
    valid: true,
    data: {
      member_id: request.member_id,
    },
  }
}

/**
 * GET /api/organizations/[id]/members
 * List all active members of an organization
 *
 * Returns a list of organization members with their details.
 * Only organization members can view the member list.
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
      // Demo mode - return mock members
      return NextResponse.json({
        data: [
          {
            id: crypto.randomUUID(),
            organization_id: id,
            user_id: authResult.user?.id,
            role: "admin",
            status: "active",
            invited_by: null,
            invitation_accepted_at: new Date().toISOString(),
            joined_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        count: 1,
        source: "mock",
      })
    }

    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: "Validation error", message: "Invalid organization ID format" },
        { status: 400 }
      )
    }

    // Check if user is a member of this organization
    const { data: membership, error: memberError } = await supabase
      .from("organization_members")
      .select("role, status")
      .eq("organization_id", id)
      .eq("user_id", authResult.user?.id)
      .eq("status", "active")
      .maybeSingle()

    if (memberError) {
      console.error("[API Organization Members] Database error:", memberError)
      return NextResponse.json(
        { error: "Database error", message: memberError.message },
        { status: 500 }
      )
    }

    if (!membership) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You are not a member of this organization",
        },
        { status: 403 }
      )
    }

    // Get all active members of the organization
    const { data: members, error: listError, count } = await supabase
      .from("organization_members")
      .select("*", { count: "exact" })
      .eq("organization_id", id)
      .eq("status", "active")
      .order("created_at", { ascending: true })

    if (listError) {
      console.error("[API Organization Members] List error:", listError)
      return NextResponse.json(
        { error: "Database error", message: listError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: members || [],
      count: count || 0,
      source: "database",
    })
  } catch (error) {
    console.error("[API Organization Members] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations/[id]/members
 * Add a new member directly to an organization (admin only)
 *
 * Request body:
 * {
 *   user_id: string (required) - UUID of the user to add
 *   role?: "admin" | "analyst" | "viewer" - Member role (default: viewer)
 * }
 *
 * Only organization admins can add members directly.
 * This creates an active member immediately (no invitation flow).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CSRF Protection
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Organization Members] CSRF validation failed:", csrfResult.error)
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
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: "Validation error", message: "Invalid organization ID format" },
        { status: 400 }
      )
    }

    // Validate request body
    const validation = validateAddMemberRequest(body)
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: validation.error,
        },
        { status: 400 }
      )
    }

    const { user_id, role } = validation.data

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
          message: "You are not a member of this organization",
        },
        { status: 403 }
      )
    }

    // Only admins can add members
    if (membership.role !== "admin") {
      return forbiddenResponse("Only organization admins can add members")
    }

    // Check if the user is already a member
    const { data: existingMember, error: checkError } = await supabase
      .from("organization_members")
      .select("id, status")
      .eq("organization_id", id)
      .eq("user_id", user_id)
      .maybeSingle()

    if (checkError) {
      console.error("[API Organization Members] Check error:", checkError)
      return NextResponse.json(
        { error: "Database error", message: checkError.message },
        { status: 500 }
      )
    }

    if (existingMember && existingMember.status === "active") {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "User is already an active member of this organization",
        },
        { status: 409 }
      )
    }

    // Use the upsert_organization_member function to add the member
    const { data: memberId, error: addError } = await supabase.rpc("upsert_organization_member", {
      p_organization_id: id,
      p_user_id: user_id,
      p_role: role,
      p_invited_by: authResult.user?.id,
      p_status: "active",
    })

    if (addError) {
      console.error("[API Organization Members] Add error:", addError)
      return NextResponse.json(
        { error: "Database error", message: addError.message },
        { status: 500 }
      )
    }

    // Fetch the created member
    const { data: member, error: fetchError } = await supabase
      .from("organization_members")
      .select("*")
      .eq("id", memberId)
      .single()

    if (fetchError || !member) {
      console.error("[API Organization Members] Error fetching created member:", fetchError)
      return NextResponse.json(
        { error: "Server error", message: "Failed to retrieve created member" },
        { status: 500 }
      )
    }

    console.log("[API Organization Members] Member added successfully:", {
      organization_id: id,
      member_id: memberId,
      added_by: authResult.user?.email,
    })

    // Create audit log entry
    await logMemberAudit(request, "user.invited", {
      user_id: authResult.user?.id || "",
      organization_id: id,
      target_user_id: user_id,
      description: `Added user ${user_id} to organization with role ${role}`,
      new_values: {
        user_id,
        role,
        status: "active",
        invited_by: authResult.user?.id,
      },
      metadata: {
        member_id: memberId,
      },
    })

    return NextResponse.json(
      {
        data: member,
        message: "Member added successfully",
        source: "database",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[API Organization Members] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/organizations/[id]/members
 * Update a member's role (admin only)
 *
 * Request body:
 * {
 *   member_id: string (required) - UUID of the member to update
 *   role: "admin" | "analyst" | "viewer" (required) - New role
 * }
 *
 * Only organization admins can update member roles.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CSRF Protection
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Organization Members] CSRF validation failed:", csrfResult.error)
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
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: "Validation error", message: "Invalid organization ID format" },
        { status: 400 }
      )
    }

    // Validate request body
    const validation = validateUpdateRoleRequest(body)
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: validation.error,
        },
        { status: 400 }
      )
    }

    const { member_id, role } = validation.data

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
          message: "You are not a member of this organization",
        },
        { status: 403 }
      )
    }

    // Only admins can update member roles
    if (membership.role !== "admin") {
      return forbiddenResponse("Only organization admins can update member roles")
    }

    // Verify the member belongs to this organization
    const { data: targetMember, error: checkError } = await supabase
      .from("organization_members")
      .select("id, user_id, role, status")
      .eq("id", member_id)
      .eq("organization_id", id)
      .single()

    if (checkError || !targetMember) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Member not found in this organization",
        },
        { status: 404 }
      )
    }

    // Prevent admins from changing their own role if they're the only admin
    if (targetMember.user_id === authResult.user?.id && targetMember.role === "admin") {
      // Check if there are other admins
      const { count: adminCount, error: countError } = await supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", id)
        .eq("role", "admin")
        .eq("status", "active")

      if (countError) {
        console.error("[API Organization Members] Error counting admins:", countError)
        return NextResponse.json(
          { error: "Database error", message: countError.message },
          { status: 500 }
        )
      }

      if (adminCount === 1 && role !== "admin") {
        return NextResponse.json(
          {
            error: "Validation error",
            message: "Cannot change your role - organization must have at least one admin",
          },
          { status: 400 }
        )
      }
    }

    // Update the member's role
    const { data: updatedMember, error: updateError } = await supabase
      .from("organization_members")
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", member_id)
      .select()
      .single()

    if (updateError) {
      console.error("[API Organization Members] Update error:", updateError)
      return NextResponse.json(
        { error: "Database error", message: updateError.message },
        { status: 500 }
      )
    }

    console.log("[API Organization Members] Member role updated successfully:", {
      organization_id: id,
      member_id,
      new_role: role,
      updated_by: authResult.user?.email,
    })

    // Create audit log entry
    await logMemberAudit(request, "user.role_changed", {
      user_id: authResult.user?.id || "",
      organization_id: id,
      target_user_id: targetMember.user_id,
      description: `Changed role from ${targetMember.role} to ${role} for user ${targetMember.user_id}`,
      old_values: {
        role: targetMember.role,
      },
      new_values: {
        role,
      },
      metadata: {
        member_id,
      },
    })

    return NextResponse.json({
      data: updatedMember,
      message: "Member role updated successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Organization Members] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organizations/[id]/members
 * Remove a member from an organization (admin only)
 *
 * Request body:
 * {
 *   member_id: string (required) - UUID of the member to remove
 * }
 *
 * Only organization admins can remove members.
 * Sets the member status to 'removed'.
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
    const body = await request.json()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: "Validation error", message: "Invalid organization ID format" },
        { status: 400 }
      )
    }

    // Validate request body
    const validation = validateRemoveMemberRequest(body)
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: validation.error,
        },
        { status: 400 }
      )
    }

    const { member_id } = validation.data

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
          message: "You are not a member of this organization",
        },
        { status: 403 }
      )
    }

    // Only admins can remove members
    if (membership.role !== "admin") {
      return forbiddenResponse("Only organization admins can remove members")
    }

    // Verify the member belongs to this organization
    const { data: targetMember, error: checkError } = await supabase
      .from("organization_members")
      .select("id, user_id, role, status")
      .eq("id", member_id)
      .eq("organization_id", id)
      .single()

    if (checkError || !targetMember) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Member not found in this organization",
        },
        { status: 404 }
      )
    }

    // Prevent admins from removing themselves if they're the only admin
    if (targetMember.user_id === authResult.user?.id && targetMember.role === "admin") {
      // Check if there are other admins
      const { count: adminCount, error: countError } = await supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", id)
        .eq("role", "admin")
        .eq("status", "active")

      if (countError) {
        console.error("[API Organization Members] Error counting admins:", countError)
        return NextResponse.json(
          { error: "Database error", message: countError.message },
          { status: 500 }
        )
      }

      if (adminCount === 1) {
        return NextResponse.json(
          {
            error: "Validation error",
            message: "Cannot remove yourself - organization must have at least one admin",
          },
          { status: 400 }
        )
      }
    }

    // Update the member status to 'removed'
    const { error: removeError } = await supabase
      .from("organization_members")
      .update({
        status: "removed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", member_id)

    if (removeError) {
      console.error("[API Organization Members] Remove error:", removeError)
      return NextResponse.json(
        { error: "Database error", message: removeError.message },
        { status: 500 }
      )
    }

    console.log("[API Organization Members] Member removed successfully:", {
      organization_id: id,
      member_id,
      removed_by: authResult.user?.email,
    })

    // Create audit log entry
    await logMemberAudit(request, "user.removed", {
      user_id: authResult.user?.id || "",
      organization_id: id,
      target_user_id: targetMember.user_id,
      description: `Removed user ${targetMember.user_id} with role ${targetMember.role} from organization`,
      old_values: {
        status: targetMember.status,
        role: targetMember.role,
      },
      new_values: {
        status: "removed",
      },
      metadata: {
        member_id,
      },
    })

    return NextResponse.json({
      message: "Member removed successfully",
    })
  } catch (error) {
    console.error("[API Organization Members] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
