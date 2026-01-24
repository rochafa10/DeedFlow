/**
 * Audit Logging Utility
 *
 * Provides helper functions for creating audit log entries for critical operations.
 * Audit logs track user actions for compliance, security monitoring, and debugging.
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import type { CreateAuditLogRequest } from "@/types/audit-log"

/**
 * Extract IP address from the request
 */
function getIpAddress(request: NextRequest): string | undefined {
  // Try various headers where IP might be stored
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim()
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  // In development, might not have these headers
  return undefined
}

/**
 * Extract user agent from the request
 */
function getUserAgent(request: NextRequest): string | undefined {
  return request.headers.get("user-agent") || undefined
}

/**
 * Generate a request ID for correlating related audit log entries
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create an audit log entry
 *
 * @param params - Audit log parameters
 * @returns Promise that resolves when the log is created
 */
export async function createAuditLog(
  params: CreateAuditLogRequest
): Promise<void> {
  try {
    const supabase = createServerClient()

    if (!supabase) {
      // In demo mode without database, just log to console
      console.info("[AUDIT LOG]", {
        action: params.action,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        user_id: params.user_id,
        description: params.description,
        severity: params.severity || "info",
      })
      return
    }

    // Insert audit log entry
    const { error } = await supabase.from("audit_logs").insert({
      user_id: params.user_id || null,
      organization_id: params.organization_id || null,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id || null,
      description: params.description,
      severity: params.severity || "info",
      old_values: params.old_values || null,
      new_values: params.new_values || null,
      ip_address: params.ip_address || null,
      user_agent: params.user_agent || null,
      request_id: params.request_id || null,
      metadata: params.metadata || null,
      tags: params.tags || null,
    })

    if (error) {
      // Log error but don't throw - audit logging should not break the main flow
      console.error("[AUDIT LOG] Failed to create audit log entry:", error)
    }
  } catch (err) {
    // Catch any unexpected errors
    console.error("[AUDIT LOG] Unexpected error creating audit log:", err)
  }
}

/**
 * Create an audit log entry with request context automatically extracted
 *
 * @param request - NextRequest object
 * @param params - Audit log parameters (IP, user agent, request ID will be auto-filled)
 * @returns Promise that resolves when the log is created
 */
export async function createAuditLogFromRequest(
  request: NextRequest,
  params: Omit<CreateAuditLogRequest, "ip_address" | "user_agent" | "request_id">
): Promise<void> {
  return createAuditLog({
    ...params,
    ip_address: getIpAddress(request),
    user_agent: getUserAgent(request),
    request_id: generateRequestId(),
  })
}

/**
 * Helper function for logging member-related audit events
 */
export async function logMemberAudit(
  request: NextRequest,
  action: "user.invited" | "user.removed" | "user.role_changed",
  params: {
    user_id: string
    organization_id: string
    target_user_id: string
    description: string
    old_values?: Record<string, unknown>
    new_values?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  return createAuditLogFromRequest(request, {
    user_id: params.user_id,
    organization_id: params.organization_id,
    action,
    entity_type: "organization_member",
    entity_id: params.target_user_id,
    description: params.description,
    severity: "info",
    old_values: params.old_values,
    new_values: params.new_values,
    metadata: params.metadata,
    tags: ["organization", "member", "team_management"],
  })
}

/**
 * Helper function for logging watchlist-related audit events
 */
export async function logWatchlistAudit(
  request: NextRequest,
  action: "watchlist.created" | "watchlist.updated" | "watchlist.deleted" | "watchlist.shared",
  params: {
    user_id: string
    organization_id?: string
    watchlist_id: string
    description: string
    old_values?: Record<string, unknown>
    new_values?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  return createAuditLogFromRequest(request, {
    user_id: params.user_id,
    organization_id: params.organization_id,
    action,
    entity_type: "watchlist",
    entity_id: params.watchlist_id,
    description: params.description,
    severity: "info",
    old_values: params.old_values,
    new_values: params.new_values,
    metadata: params.metadata,
    tags: ["watchlist", "collaboration"],
  })
}
