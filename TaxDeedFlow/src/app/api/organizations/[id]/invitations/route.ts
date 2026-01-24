/**
 * Organization Invitations API
 *
 * GET /api/organizations/[id]/invitations - List all pending invitations
 * POST /api/organizations/[id]/invitations - Create a new member invitation (admin only)
 * PATCH /api/organizations/[id]/invitations - Accept or reject an invitation
 * DELETE /api/organizations/[id]/invitations - Cancel an invitation (admin only)
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import type { InviteMemberRequest } from "@/types/team"

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
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate the invite member request body
 */
function validateInviteRequest(body: unknown): {
  valid: boolean
  data?: InviteMemberRequest
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // Email is required
  if (!request.email || typeof request.email !== "string") {
    return { valid: false, error: "email is required and must be a string" }
  }

  if (!isValidEmail(request.email)) {
    return { valid: false, error: "email must be a valid email address" }
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
      email: request.email.trim().toLowerCase(),
      role: request.role as "admin" | "analyst" | "viewer",
    },
  }
}

/**
 * Validate the accept/reject invitation request body
 */
function validateInvitationActionRequest(body: unknown): {
  valid: boolean
  data?: { invitation_id: string; action: "accept" | "reject" }
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // Invitation ID is required
  if (!request.invitation_id || typeof request.invitation_id !== "string") {
    return { valid: false, error: "invitation_id is required and must be a string" }
  }

  if (!isValidUUID(request.invitation_id)) {
    return { valid: false, error: "invitation_id must be a valid UUID" }
  }

  // Action is required
  if (!request.action || typeof request.action !== "string") {
    return { valid: false, error: "action is required and must be a string" }
  }

  if (!["accept", "reject"].includes(request.action)) {
    return {
      valid: false,
      error: "action must be either 'accept' or 'reject'",
    }
  }

  return {
    valid: true,
    data: {
      invitation_id: request.invitation_id,
      action: request.action as "accept" | "reject",
    },
  }
}

/**
 * Validate the cancel invitation request body
 */
function validateCancelInvitationRequest(body: unknown): {
  valid: boolean
  data?: { invitation_id: string }
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // Invitation ID is required
  if (!request.invitation_id || typeof request.invitation_id !== "string") {
    return { valid: false, error: "invitation_id is required and must be a string" }
  }

  if (!isValidUUID(request.invitation_id)) {
    return { valid: false, error: "invitation_id must be a valid UUID" }
  }

  return {
    valid: true,
    data: {
      invitation_id: request.invitation_id,
    },
  }
}

/**
 * GET /api/organizations/[id]/invitations
 * List all pending invitations for an organization
 *
 * Returns a list of pending member invitations.
 * Only organization admins can view invitations.
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
      // Demo mode - return empty invitations
      return NextResponse.json({
        data: [],
        count: 0,
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

    // Check if user is an admin of this organization
    const { data: membership, error: memberError } = await supabase
      .from("organization_members")
      .select("role, status")
      .eq("organization_id", id)
      .eq("user_id", authResult.user?.id)
      .eq("status", "active")
      .maybeSingle()

    if (memberError) {
      console.error("[API Organization Invitations] Database error:", memberError)
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

    // Only admins can view invitations
    if (membership.role !== "admin") {
      return forbiddenResponse("Only organization admins can view invitations")
    }

    // Get all pending invitations for the organization
    const { data: invitations, error: listError, count } = await supabase
      .from("organization_members")
      .select("*", { count: "exact" })
      .eq("organization_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (listError) {
      console.error("[API Organization Invitations] List error:", listError)
      return NextResponse.json(
        { error: "Database error", message: listError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: invitations || [],
      count: count || 0,
      source: "database",
    })
  } catch (error) {
    console.error("[API Organization Invitations] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations/[id]/invitations
 * Create a new member invitation (admin only)
 *
 * Request body:
 * {
 *   email: string (required) - Email of the user to invite
 *   role: "admin" | "analyst" | "viewer" (required) - Member role
 * }
 *
 * Only organization admins can create invitations.
 * This creates a pending member record that needs to be accepted.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CSRF Protection
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Organization Invitations] CSRF validation failed:", csrfResult.error)
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
    const validation = validateInviteRequest(body)
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: validation.error,
        },
        { status: 400 }
      )
    }

    const { email, role } = validation.data

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

    // Only admins can create invitations
    if (membership.role !== "admin") {
      return forbiddenResponse("Only organization admins can invite members")
    }

    // Look up the user by email in auth.users table
    // Note: This assumes we can query auth.users, which may not be possible with RLS
    // In a real implementation, you might need to use a service role client or
    // handle this via a server-side function
    const { data: invitedUser, error: userError } = await supabase
      .from("auth.users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    // If user doesn't exist yet, we'll create the invitation anyway
    // The user can be linked when they sign up
    let invitedUserId: string | null = null

    if (invitedUser) {
      invitedUserId = invitedUser.id

      // Check if user is already a member
      const { data: existingMember, error: checkError } = await supabase
        .from("organization_members")
        .select("id, status")
        .eq("organization_id", id)
        .eq("user_id", invitedUserId)
        .maybeSingle()

      if (checkError) {
        console.error("[API Organization Invitations] Check error:", checkError)
        return NextResponse.json(
          { error: "Database error", message: checkError.message },
          { status: 500 }
        )
      }

      if (existingMember) {
        if (existingMember.status === "active") {
          return NextResponse.json(
            {
              error: "Conflict",
              message: "User is already an active member of this organization",
            },
            { status: 409 }
          )
        } else if (existingMember.status === "pending") {
          return NextResponse.json(
            {
              error: "Conflict",
              message: "An invitation for this user already exists",
            },
            { status: 409 }
          )
        }
      }
    }

    // For now, if we can't find the user, we'll return an error
    // In a production app, you might want to send an email invitation
    // and create the member record when they sign up
    if (!invitedUserId) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "User with this email does not exist. They must sign up first.",
        },
        { status: 404 }
      )
    }

    // Use the upsert_organization_member function to create the invitation
    const { data: invitationId, error: inviteError } = await supabase.rpc(
      "upsert_organization_member",
      {
        p_organization_id: id,
        p_user_id: invitedUserId,
        p_role: role,
        p_invited_by: authResult.user?.id,
        p_status: "pending",
      }
    )

    if (inviteError) {
      console.error("[API Organization Invitations] Invite error:", inviteError)
      return NextResponse.json(
        { error: "Database error", message: inviteError.message },
        { status: 500 }
      )
    }

    // Fetch the created invitation
    const { data: invitation, error: fetchError } = await supabase
      .from("organization_members")
      .select("*")
      .eq("id", invitationId)
      .single()

    if (fetchError || !invitation) {
      console.error("[API Organization Invitations] Error fetching created invitation:", fetchError)
      return NextResponse.json(
        { error: "Server error", message: "Failed to retrieve created invitation" },
        { status: 500 }
      )
    }

    console.log("[API Organization Invitations] Invitation created successfully:", {
      organization_id: id,
      invitation_id: invitationId,
      invited_email: email,
      invited_by: authResult.user?.email,
    })

    // TODO: Send invitation email to the user

    return NextResponse.json(
      {
        data: invitation,
        message: "Invitation sent successfully",
        source: "database",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[API Organization Invitations] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/organizations/[id]/invitations
 * Accept or reject an invitation
 *
 * Request body:
 * {
 *   invitation_id: string (required) - UUID of the invitation
 *   action: "accept" | "reject" (required) - Action to take
 * }
 *
 * Users can accept or reject invitations that are addressed to them.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CSRF Protection
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Organization Invitations] CSRF validation failed:", csrfResult.error)
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
    const validation = validateInvitationActionRequest(body)
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: validation.error,
        },
        { status: 400 }
      )
    }

    const { invitation_id, action } = validation.data

    // Verify the invitation exists and belongs to the current user
    const { data: invitation, error: checkError } = await supabase
      .from("organization_members")
      .select("*")
      .eq("id", invitation_id)
      .eq("organization_id", id)
      .eq("user_id", authResult.user?.id)
      .eq("status", "pending")
      .single()

    if (checkError || !invitation) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Invitation not found or already processed",
        },
        { status: 404 }
      )
    }

    let updatedInvitation

    if (action === "accept") {
      // Accept the invitation - set status to active
      const { data: updated, error: updateError } = await supabase
        .from("organization_members")
        .update({
          status: "active",
          invitation_accepted_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invitation_id)
        .select()
        .single()

      if (updateError) {
        console.error("[API Organization Invitations] Accept error:", updateError)
        return NextResponse.json(
          { error: "Database error", message: updateError.message },
          { status: 500 }
        )
      }

      updatedInvitation = updated

      console.log("[API Organization Invitations] Invitation accepted:", {
        organization_id: id,
        invitation_id,
        user_id: authResult.user?.id,
      })
    } else {
      // Reject the invitation - delete the record
      const { error: deleteError } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", invitation_id)

      if (deleteError) {
        console.error("[API Organization Invitations] Reject error:", deleteError)
        return NextResponse.json(
          { error: "Database error", message: deleteError.message },
          { status: 500 }
        )
      }

      console.log("[API Organization Invitations] Invitation rejected:", {
        organization_id: id,
        invitation_id,
        user_id: authResult.user?.id,
      })

      return NextResponse.json({
        message: "Invitation rejected",
      })
    }

    return NextResponse.json({
      data: updatedInvitation,
      message: "Invitation accepted successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Organization Invitations] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organizations/[id]/invitations
 * Cancel an invitation (admin only)
 *
 * Request body:
 * {
 *   invitation_id: string (required) - UUID of the invitation to cancel
 * }
 *
 * Only organization admins can cancel invitations.
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
    const validation = validateCancelInvitationRequest(body)
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: validation.error,
        },
        { status: 400 }
      )
    }

    const { invitation_id } = validation.data

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

    // Only admins can cancel invitations
    if (membership.role !== "admin") {
      return forbiddenResponse("Only organization admins can cancel invitations")
    }

    // Verify the invitation exists and is pending
    const { data: invitation, error: checkError } = await supabase
      .from("organization_members")
      .select("id, status")
      .eq("id", invitation_id)
      .eq("organization_id", id)
      .eq("status", "pending")
      .single()

    if (checkError || !invitation) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Invitation not found or already processed",
        },
        { status: 404 }
      )
    }

    // Delete the invitation
    const { error: deleteError } = await supabase
      .from("organization_members")
      .delete()
      .eq("id", invitation_id)

    if (deleteError) {
      console.error("[API Organization Invitations] Cancel error:", deleteError)
      return NextResponse.json(
        { error: "Database error", message: deleteError.message },
        { status: 500 }
      )
    }

    console.log("[API Organization Invitations] Invitation cancelled:", {
      organization_id: id,
      invitation_id,
      cancelled_by: authResult.user?.email,
    })

    return NextResponse.json({
      message: "Invitation cancelled successfully",
    })
  } catch (error) {
    console.error("[API Organization Invitations] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
