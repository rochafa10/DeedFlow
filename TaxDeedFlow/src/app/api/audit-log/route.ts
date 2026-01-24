/**
 * Audit Log API Endpoint
 *
 * GET /api/audit-log - Query audit log entries with filters
 * POST /api/audit-log - Create an audit log entry (typically for system use)
 *
 * This endpoint provides comprehensive audit logging capabilities for compliance,
 * security monitoring, and user action tracking. Supports filtering by organization,
 * user, entity, action type, severity level, and date range.
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import type {
  CreateAuditLogRequest,
  AuditLogFilters,
  AuditLogsListResponse,
  AuditLogWithDetails,
  AuditLogSeverity
} from "@/types/audit-log"

// Default pagination limits
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 500

// Severity levels in order for filtering
const SEVERITY_LEVELS: Record<AuditLogSeverity, number> = {
  debug: 1,
  info: 2,
  warning: 3,
  error: 4,
  critical: 5,
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate severity level
 */
function isValidSeverity(severity: string): severity is AuditLogSeverity {
  return ['debug', 'info', 'warning', 'error', 'critical'].includes(severity)
}

/**
 * Parse filters from query parameters
 */
function parseFilters(searchParams: URLSearchParams): AuditLogFilters {
  const filters: AuditLogFilters = {}

  // Organization filter
  const organizationId = searchParams.get('organization_id')
  if (organizationId) {
    filters.organization_id = organizationId
  }

  // User filter
  const userId = searchParams.get('user_id')
  if (userId) {
    filters.user_id = userId
  }

  // Action filter (supports wildcards)
  const action = searchParams.get('action')
  if (action) {
    filters.action = action
  }

  // Entity type filter
  const entityType = searchParams.get('entity_type')
  if (entityType) {
    filters.entity_type = entityType
  }

  // Entity ID filter
  const entityId = searchParams.get('entity_id')
  if (entityId) {
    filters.entity_id = entityId
  }

  // Severity filter
  const severity = searchParams.get('severity')
  if (severity && isValidSeverity(severity)) {
    filters.severity = severity
  }

  // Minimum severity filter
  const severityMin = searchParams.get('severity_min')
  if (severityMin && isValidSeverity(severityMin)) {
    filters.severity_min = severityMin
  }

  // Date range filters
  const dateFrom = searchParams.get('date_from')
  if (dateFrom) {
    filters.date_from = dateFrom
  }

  const dateTo = searchParams.get('date_to')
  if (dateTo) {
    filters.date_to = dateTo
  }

  // Search in description
  const search = searchParams.get('search')
  if (search) {
    filters.search = search
  }

  // IP address filter
  const ipAddress = searchParams.get('ip_address')
  if (ipAddress) {
    filters.ip_address = ipAddress
  }

  // Request ID filter (for correlating related actions)
  const requestId = searchParams.get('request_id')
  if (requestId) {
    filters.request_id = requestId
  }

  // Tags filter (comma-separated)
  const tagsParam = searchParams.get('tags')
  if (tagsParam) {
    filters.tags = tagsParam.split(',').map(t => t.trim())
  }

  // Sort options
  const sortBy = searchParams.get('sort_by')
  if (sortBy && ['created_at', 'severity', 'action', 'entity_type'].includes(sortBy)) {
    filters.sort_by = sortBy as 'created_at' | 'severity' | 'action' | 'entity_type'
  }

  const sortDirection = searchParams.get('sort_direction')
  if (sortDirection && ['asc', 'desc'].includes(sortDirection)) {
    filters.sort_direction = sortDirection as 'asc' | 'desc'
  }

  // Pagination
  const page = parseInt(searchParams.get('page') || '1', 10)
  filters.page = Math.max(1, page)

  const limit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)
  filters.limit = Math.min(Math.max(1, limit), MAX_LIMIT)

  return filters
}

/**
 * GET /api/audit-log
 * Query audit log entries with comprehensive filtering
 *
 * Query Parameters:
 * - organization_id: Filter by organization (admins can query any org)
 * - user_id: Filter by user
 * - action: Filter by action pattern (supports wildcards)
 * - entity_type: Filter by entity type
 * - entity_id: Filter by specific entity
 * - severity: Filter by exact severity level
 * - severity_min: Filter by minimum severity level
 * - date_from: Filter by start date (ISO 8601)
 * - date_to: Filter by end date (ISO 8601)
 * - search: Search in description
 * - ip_address: Filter by IP address
 * - request_id: Filter by request correlation ID
 * - tags: Comma-separated list of tags
 * - sort_by: Sort field (created_at, severity, action, entity_type)
 * - sort_direction: Sort direction (asc, desc)
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 50, max: 500)
 *
 * Response:
 * {
 *   logs: AuditLogWithDetails[],
 *   total: number,
 *   page: number,
 *   limit: number,
 *   total_pages: number,
 *   has_more: boolean
 * }
 */
export async function GET(request: NextRequest) {
  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    // Parse filters from query parameters
    const filters = parseFilters(request.nextUrl.searchParams)

    // Get Supabase client
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock data
      const mockLogs: AuditLogWithDetails[] = [
        {
          id: crypto.randomUUID(),
          user_id: authResult.user!.id,
          organization_id: filters.organization_id || crypto.randomUUID(),
          action: 'property.viewed',
          entity_type: 'property',
          entity_id: crypto.randomUUID(),
          description: 'Viewed property details',
          severity: 'info',
          ip_address: '192.168.1.1',
          created_at: new Date().toISOString(),
          organization_name: 'Demo Organization',
        },
        {
          id: crypto.randomUUID(),
          user_id: authResult.user!.id,
          organization_id: filters.organization_id || crypto.randomUUID(),
          action: 'deal.created',
          entity_type: 'deal',
          entity_id: crypto.randomUUID(),
          description: 'Created new deal',
          severity: 'info',
          ip_address: '192.168.1.1',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          organization_name: 'Demo Organization',
        },
      ]

      const response: AuditLogsListResponse = {
        logs: mockLogs,
        total: mockLogs.length,
        page: filters.page || 1,
        limit: filters.limit || DEFAULT_LIMIT,
        total_pages: 1,
        has_more: false,
      }

      return NextResponse.json({
        ...response,
        message: "Audit logs retrieved (demo mode)",
        source: "mock",
      })
    }

    // Build query using the vw_audit_log_detailed view
    let query = supabase
      .from('vw_audit_log_detailed')
      .select('*', { count: 'exact' })

    // Apply filters
    if (filters.organization_id) {
      query = query.eq('organization_id', filters.organization_id)
    }

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters.action) {
      // Support wildcard matching with LIKE
      if (filters.action.includes('*') || filters.action.includes('%')) {
        const pattern = filters.action.replace(/\*/g, '%')
        query = query.like('action', pattern)
      } else {
        query = query.eq('action', filters.action)
      }
    }

    if (filters.entity_type) {
      query = query.eq('entity_type', filters.entity_type)
    }

    if (filters.entity_id) {
      query = query.eq('entity_id', filters.entity_id)
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity)
    }

    if (filters.severity_min) {
      // Filter by minimum severity level
      const minLevel = SEVERITY_LEVELS[filters.severity_min]
      const allowedSeverities = Object.keys(SEVERITY_LEVELS).filter(
        s => SEVERITY_LEVELS[s as AuditLogSeverity] >= minLevel
      )
      query = query.in('severity', allowedSeverities)
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    if (filters.search) {
      query = query.ilike('description', `%${filters.search}%`)
    }

    if (filters.ip_address) {
      query = query.eq('ip_address', filters.ip_address)
    }

    if (filters.request_id) {
      query = query.eq('request_id', filters.request_id)
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

    // Apply sorting
    const sortBy = filters.sort_by || 'created_at'
    const sortDirection = filters.sort_direction || 'desc'
    query = query.order(sortBy, { ascending: sortDirection === 'asc' })

    // Apply pagination
    const page = filters.page || 1
    const limit = filters.limit || DEFAULT_LIMIT
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data: logs, error, count } = await query

    if (error) {
      console.error('[API Audit Log] Query error:', error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Calculate pagination metadata
    const total = count || 0
    const totalPages = Math.ceil(total / limit)
    const hasMore = page < totalPages

    const response: AuditLogsListResponse = {
      logs: logs || [],
      total,
      page,
      limit,
      total_pages: totalPages,
      has_more: hasMore,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[API Audit Log] Unexpected error:', error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/audit-log
 * Create a new audit log entry
 *
 * Request body:
 * {
 *   user_id?: string - User who performed the action (null for system actions)
 *   organization_id?: string - Organization context
 *   action: string - Action identifier (e.g., 'property.viewed', 'deal.created')
 *   entity_type: string - Entity type (e.g., 'property', 'deal', 'watchlist')
 *   entity_id?: string - Entity ID (if applicable)
 *   description: string - Human-readable description
 *   severity?: string - Severity level (debug, info, warning, error, critical)
 *   old_values?: object - State before the action
 *   new_values?: object - State after the action
 *   ip_address?: string - Request IP address
 *   user_agent?: string - User agent string
 *   request_id?: string - Request correlation ID
 *   metadata?: object - Additional context
 *   tags?: string[] - Tags for categorization
 * }
 *
 * Response:
 * {
 *   id: string - Created audit log entry ID
 *   created_at: string - Creation timestamp
 * }
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Audit Log] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admins can manually create audit log entries
  // (In practice, audit logs are typically created automatically via triggers or database functions)
  if (authResult.user?.role !== "admin") {
    return forbiddenResponse("Only administrators can manually create audit log entries.")
  }

  try {
    // Parse request body
    const body = await request.json() as CreateAuditLogRequest

    // Validate required fields
    if (!body.action) {
      return NextResponse.json(
        { error: "Validation error", message: "action is required" },
        { status: 400 }
      )
    }

    if (!body.entity_type) {
      return NextResponse.json(
        { error: "Validation error", message: "entity_type is required" },
        { status: 400 }
      )
    }

    if (!body.description) {
      return NextResponse.json(
        { error: "Validation error", message: "description is required" },
        { status: 400 }
      )
    }

    // Validate UUIDs if provided
    if (body.user_id && !isValidUUID(body.user_id)) {
      return NextResponse.json(
        { error: "Validation error", message: "user_id must be a valid UUID" },
        { status: 400 }
      )
    }

    if (body.organization_id && !isValidUUID(body.organization_id)) {
      return NextResponse.json(
        { error: "Validation error", message: "organization_id must be a valid UUID" },
        { status: 400 }
      )
    }

    if (body.entity_id && !isValidUUID(body.entity_id)) {
      return NextResponse.json(
        { error: "Validation error", message: "entity_id must be a valid UUID" },
        { status: 400 }
      )
    }

    // Validate severity
    const severity = body.severity || 'info'
    if (!isValidSeverity(severity)) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "severity must be one of: debug, info, warning, error, critical",
        },
        { status: 400 }
      )
    }

    // Get IP address from request headers if not provided
    const ipAddress = body.ip_address ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined

    // Get user agent if not provided
    const userAgent = body.user_agent || request.headers.get('user-agent') || undefined

    // Get Supabase client
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock response
      const mockId = crypto.randomUUID()
      return NextResponse.json({
        id: mockId,
        created_at: new Date().toISOString(),
        message: "Audit log entry created (demo mode)",
        source: "mock",
      })
    }

    // Call the log_audit_event database function
    const { data, error } = await supabase.rpc('log_audit_event', {
      p_user_id: body.user_id || null,
      p_organization_id: body.organization_id || null,
      p_action: body.action,
      p_entity_type: body.entity_type,
      p_entity_id: body.entity_id || null,
      p_description: body.description,
      p_severity: severity,
      p_old_values: body.old_values || null,
      p_new_values: body.new_values || null,
      p_ip_address: ipAddress || null,
      p_user_agent: userAgent || null,
      p_request_id: body.request_id || null,
      p_metadata: body.metadata || null,
      p_tags: body.tags || null,
    })

    if (error) {
      console.error('[API Audit Log] Create error:', error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Fetch the created entry to get the full details
    const { data: createdLog, error: fetchError } = await supabase
      .from('audit_log')
      .select('id, created_at')
      .eq('id', data)
      .single()

    if (fetchError) {
      console.error('[API Audit Log] Fetch error:', fetchError)
      // Return the ID even if we can't fetch the full record
      return NextResponse.json({
        id: data,
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      id: createdLog.id,
      created_at: createdLog.created_at,
    })

  } catch (error) {
    console.error('[API Audit Log] Unexpected error:', error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
