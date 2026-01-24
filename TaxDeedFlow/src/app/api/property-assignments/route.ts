/**
 * Property Assignments API Endpoint
 *
 * GET /api/property-assignments - List property assignments with filters
 * POST /api/property-assignments - Create a new property assignment
 * PATCH /api/property-assignments - Update assignment status
 * DELETE /api/property-assignments - Cancel an assignment
 *
 * This endpoint manages property assignments for team collaboration.
 * Team leads can assign properties to analysts for research, due diligence,
 * bidding preparation, or other tasks.
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import type {
  PropertyAssignment,
  PropertyAssignmentDetailed,
  PropertyAssignmentType,
  AssignmentStatus,
  DealPriority,
} from "@/types/team"

// Default pagination limits
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 500

// Valid assignment types
const VALID_ASSIGNMENT_TYPES: PropertyAssignmentType[] = [
  'research',
  'analysis',
  'due_diligence',
  'inspection',
  'bidding',
  'closing',
  'general',
]

// Valid assignment statuses
const VALID_ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
  'blocked',
]

// Valid priority levels
const VALID_PRIORITIES: DealPriority[] = ['low', 'medium', 'high', 'urgent']

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate assignment type
 */
function isValidAssignmentType(type: string): type is PropertyAssignmentType {
  return VALID_ASSIGNMENT_TYPES.includes(type as PropertyAssignmentType)
}

/**
 * Validate assignment status
 */
function isValidAssignmentStatus(status: string): status is AssignmentStatus {
  return VALID_ASSIGNMENT_STATUSES.includes(status as AssignmentStatus)
}

/**
 * Validate priority level
 */
function isValidPriority(priority: string): priority is DealPriority {
  return VALID_PRIORITIES.includes(priority as DealPriority)
}

/**
 * GET /api/property-assignments
 * List property assignments with filtering
 *
 * Query Parameters:
 * - organization_id: Filter by organization (required for non-admins)
 * - assigned_to: Filter by assigned user
 * - assigned_by: Filter by user who created the assignment
 * - property_id: Filter by property
 * - assignment_type: Filter by assignment type
 * - status: Filter by assignment status
 * - priority: Filter by priority level
 * - overdue: Filter overdue assignments (true/false)
 * - due_soon: Filter assignments due within N days
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 50, max: 500)
 * - sort_by: Sort field (created_at, due_date, priority, status)
 * - sort_direction: Sort direction (asc, desc)
 *
 * Response:
 * {
 *   assignments: PropertyAssignmentDetailed[],
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
    const { searchParams } = request.nextUrl

    // Parse filters
    const organizationId = searchParams.get('organization_id')
    const assignedTo = searchParams.get('assigned_to')
    const assignedBy = searchParams.get('assigned_by')
    const propertyId = searchParams.get('property_id')
    const assignmentType = searchParams.get('assignment_type')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const overdueParam = searchParams.get('overdue')
    const dueSoonDays = searchParams.get('due_soon')

    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)),
      MAX_LIMIT
    )
    const offset = (page - 1) * limit

    // Parse sorting
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortDirection = searchParams.get('sort_direction') || 'desc'

    // Validate UUIDs
    if (organizationId && !isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: "Validation error", message: "organization_id must be a valid UUID" },
        { status: 400 }
      )
    }

    if (assignedTo && !isValidUUID(assignedTo)) {
      return NextResponse.json(
        { error: "Validation error", message: "assigned_to must be a valid UUID" },
        { status: 400 }
      )
    }

    if (propertyId && !isValidUUID(propertyId)) {
      return NextResponse.json(
        { error: "Validation error", message: "property_id must be a valid UUID" },
        { status: 400 }
      )
    }

    // Validate enums
    if (assignmentType && !isValidAssignmentType(assignmentType)) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `assignment_type must be one of: ${VALID_ASSIGNMENT_TYPES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (status && !isValidAssignmentStatus(status)) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `status must be one of: ${VALID_ASSIGNMENT_STATUSES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (priority && !isValidPriority(priority)) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Get Supabase client
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock data
      const mockAssignments: PropertyAssignmentDetailed[] = [
        {
          id: crypto.randomUUID(),
          organizationId: organizationId || crypto.randomUUID(),
          propertyId: crypto.randomUUID(),
          assignedTo: assignedTo || authResult.user!.id,
          assignedBy: authResult.user!.id,
          assignmentType: 'research',
          status: 'in_progress',
          priority: 'medium',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          assignmentNotes: 'Research property market value and comparable sales',
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationName: 'Demo Organization',
          parcelNumber: '123-456-789',
          propertyAddress: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
        },
      ]

      return NextResponse.json({
        assignments: mockAssignments,
        total: mockAssignments.length,
        page,
        limit,
        total_pages: 1,
        has_more: false,
        message: "Property assignments retrieved (demo mode)",
        source: "mock",
      })
    }

    // Build query using the vw_property_assignments_detailed view
    let query = supabase
      .from('vw_property_assignments_detailed')
      .select('*', { count: 'exact' })

    // Apply filters
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    if (assignedBy) {
      query = query.eq('assigned_by', assignedBy)
    }

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    if (assignmentType) {
      query = query.eq('assignment_type', assignmentType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    // Overdue filter: due_date < now AND status not in (completed, cancelled)
    if (overdueParam === 'true') {
      const now = new Date().toISOString()
      query = query
        .lt('due_date', now)
        .not('status', 'in', '(completed,cancelled)')
    }

    // Due soon filter: due_date within N days
    if (dueSoonDays) {
      const days = parseInt(dueSoonDays, 10)
      if (!isNaN(days) && days > 0) {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + days)
        query = query
          .lte('due_date', futureDate.toISOString())
          .not('status', 'in', '(completed,cancelled)')
      }
    }

    // Apply sorting
    if (['created_at', 'due_date', 'priority', 'status', 'updated_at'].includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortDirection === 'asc' })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data: assignments, error, count } = await query

    if (error) {
      console.error('[API Property Assignments] Query error:', error)
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

    return NextResponse.json({
      assignments: assignments || [],
      total,
      page,
      limit,
      total_pages: totalPages,
      has_more: hasMore,
    })

  } catch (error) {
    console.error('[API Property Assignments] Unexpected error:', error)
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
 * POST /api/property-assignments
 * Create a new property assignment
 *
 * Request body:
 * {
 *   organization_id: string - Organization ID (required)
 *   property_id: string - Property ID (required)
 *   assigned_to: string - User ID to assign to (required)
 *   assignment_type: string - Type of assignment (required)
 *   priority?: string - Priority level (default: 'medium')
 *   due_date?: string - Due date (ISO 8601)
 *   assignment_notes?: string - Assignment instructions
 *   metadata?: object - Additional context
 * }
 *
 * Response:
 * {
 *   id: string - Created assignment ID
 *   ...assignment details
 * }
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Property Assignments] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can create assignments
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot create property assignments.")
  }

  try {
    // Parse request body
    const body = await request.json()

    // Validate required fields
    if (!body.organization_id) {
      return NextResponse.json(
        { error: "Validation error", message: "organization_id is required" },
        { status: 400 }
      )
    }

    if (!body.property_id) {
      return NextResponse.json(
        { error: "Validation error", message: "property_id is required" },
        { status: 400 }
      )
    }

    if (!body.assigned_to) {
      return NextResponse.json(
        { error: "Validation error", message: "assigned_to is required" },
        { status: 400 }
      )
    }

    if (!body.assignment_type) {
      return NextResponse.json(
        { error: "Validation error", message: "assignment_type is required" },
        { status: 400 }
      )
    }

    // Validate UUIDs
    if (!isValidUUID(body.organization_id)) {
      return NextResponse.json(
        { error: "Validation error", message: "organization_id must be a valid UUID" },
        { status: 400 }
      )
    }

    if (!isValidUUID(body.property_id)) {
      return NextResponse.json(
        { error: "Validation error", message: "property_id must be a valid UUID" },
        { status: 400 }
      )
    }

    if (!isValidUUID(body.assigned_to)) {
      return NextResponse.json(
        { error: "Validation error", message: "assigned_to must be a valid UUID" },
        { status: 400 }
      )
    }

    // Validate assignment type
    if (!isValidAssignmentType(body.assignment_type)) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `assignment_type must be one of: ${VALID_ASSIGNMENT_TYPES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Validate priority if provided
    const priority = body.priority || 'medium'
    if (!isValidPriority(priority)) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Validate due date if provided
    if (body.due_date) {
      const dueDate = new Date(body.due_date)
      if (isNaN(dueDate.getTime())) {
        return NextResponse.json(
          { error: "Validation error", message: "due_date must be a valid ISO 8601 date" },
          { status: 400 }
        )
      }
    }

    // Get Supabase client
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock response
      const mockId = crypto.randomUUID()
      return NextResponse.json({
        id: mockId,
        organization_id: body.organization_id,
        property_id: body.property_id,
        assigned_to: body.assigned_to,
        assigned_by: authResult.user!.id,
        assignment_type: body.assignment_type,
        status: 'assigned',
        priority,
        due_date: body.due_date || null,
        assignment_notes: body.assignment_notes || null,
        metadata: body.metadata || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message: "Property assignment created (demo mode)",
        source: "mock",
      })
    }

    // Call the assign_property_to_user database function
    const { data: assignmentId, error } = await supabase.rpc('assign_property_to_user', {
      p_organization_id: body.organization_id,
      p_property_id: body.property_id,
      p_assigned_to: body.assigned_to,
      p_assigned_by: authResult.user!.id,
      p_assignment_type: body.assignment_type,
      p_priority: priority,
      p_due_date: body.due_date || null,
      p_assignment_notes: body.assignment_notes || null,
    })

    if (error) {
      console.error('[API Property Assignments] Create error:', error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Fetch the created assignment with full details
    const { data: assignment, error: fetchError } = await supabase
      .from('vw_property_assignments_detailed')
      .select('*')
      .eq('id', assignmentId)
      .single()

    if (fetchError) {
      console.error('[API Property Assignments] Fetch error:', fetchError)
      // Return minimal data if we can't fetch the full record
      return NextResponse.json({
        id: assignmentId,
        organization_id: body.organization_id,
        property_id: body.property_id,
        assigned_to: body.assigned_to,
        assignment_type: body.assignment_type,
        status: 'assigned',
      })
    }

    return NextResponse.json(assignment)

  } catch (error) {
    console.error('[API Property Assignments] Unexpected error:', error)
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
 * PATCH /api/property-assignments
 * Update assignment status
 *
 * Request body:
 * {
 *   assignment_id: string - Assignment ID (required)
 *   status: string - New status (required)
 *   notes?: string - Status update notes
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   assignment: PropertyAssignmentDetailed
 * }
 */
export async function PATCH(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Property Assignments] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    // Parse request body
    const body = await request.json()

    // Validate required fields
    if (!body.assignment_id) {
      return NextResponse.json(
        { error: "Validation error", message: "assignment_id is required" },
        { status: 400 }
      )
    }

    if (!body.status) {
      return NextResponse.json(
        { error: "Validation error", message: "status is required" },
        { status: 400 }
      )
    }

    // Validate UUID
    if (!isValidUUID(body.assignment_id)) {
      return NextResponse.json(
        { error: "Validation error", message: "assignment_id must be a valid UUID" },
        { status: 400 }
      )
    }

    // Validate status
    if (!isValidAssignmentStatus(body.status)) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `status must be one of: ${VALID_ASSIGNMENT_STATUSES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Get Supabase client
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock response
      return NextResponse.json({
        success: true,
        assignment: {
          id: body.assignment_id,
          status: body.status,
          updated_at: new Date().toISOString(),
        },
        message: "Assignment status updated (demo mode)",
        source: "mock",
      })
    }

    // Call the update_assignment_status database function
    const { data: success, error } = await supabase.rpc('update_assignment_status', {
      p_assignment_id: body.assignment_id,
      p_user_id: authResult.user!.id,
      p_new_status: body.status,
      p_notes: body.notes || null,
    })

    if (error) {
      console.error('[API Property Assignments] Update error:', error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    if (!success) {
      return NextResponse.json(
        {
          error: "Update failed",
          message: "Assignment not found or you don't have permission to update it",
        },
        { status: 404 }
      )
    }

    // Fetch the updated assignment
    const { data: assignment, error: fetchError } = await supabase
      .from('vw_property_assignments_detailed')
      .select('*')
      .eq('id', body.assignment_id)
      .single()

    if (fetchError) {
      console.error('[API Property Assignments] Fetch error:', fetchError)
      return NextResponse.json({
        success: true,
        assignment: {
          id: body.assignment_id,
          status: body.status,
        },
      })
    }

    return NextResponse.json({
      success: true,
      assignment,
    })

  } catch (error) {
    console.error('[API Property Assignments] Unexpected error:', error)
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
 * DELETE /api/property-assignments
 * Cancel an assignment
 *
 * Query Parameters:
 * - id: Assignment ID (required)
 *
 * Response:
 * {
 *   success: boolean
 *   message: string
 * }
 */
export async function DELETE(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Property Assignments] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can delete assignments
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot delete property assignments.")
  }

  try {
    const { searchParams } = request.nextUrl
    const assignmentId = searchParams.get('id')

    // Validate assignment ID
    if (!assignmentId) {
      return NextResponse.json(
        { error: "Validation error", message: "Assignment ID is required" },
        { status: 400 }
      )
    }

    if (!isValidUUID(assignmentId)) {
      return NextResponse.json(
        { error: "Validation error", message: "Assignment ID must be a valid UUID" },
        { status: 400 }
      )
    }

    // Get Supabase client
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock response
      return NextResponse.json({
        success: true,
        message: "Assignment cancelled (demo mode)",
        source: "mock",
      })
    }

    // Cancel the assignment by setting status to 'cancelled'
    const { data: success, error } = await supabase.rpc('update_assignment_status', {
      p_assignment_id: assignmentId,
      p_user_id: authResult.user!.id,
      p_new_status: 'cancelled',
      p_notes: 'Assignment cancelled',
    })

    if (error) {
      console.error('[API Property Assignments] Delete error:', error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    if (!success) {
      return NextResponse.json(
        {
          error: "Delete failed",
          message: "Assignment not found or you don't have permission to cancel it",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Assignment cancelled successfully",
    })

  } catch (error) {
    console.error('[API Property Assignments] Unexpected error:', error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
