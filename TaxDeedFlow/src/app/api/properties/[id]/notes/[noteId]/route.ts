/**
 * Property Notes API - Update and Delete Note Endpoints
 *
 * PUT /api/properties/[id]/notes/[noteId] - Update a note
 * DELETE /api/properties/[id]/notes/[noteId] - Delete a note
 *
 * These endpoints allow authenticated users to update and delete their own notes.
 * Users can only modify notes they created (enforced by user_id check).
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

// Valid note types
const VALID_NOTE_TYPES = ["general", "concern", "opportunity", "action"] as const
type NoteType = typeof VALID_NOTE_TYPES[number]

/**
 * Request body structure for PUT
 */
interface UpdateNoteRequest {
  note_type: NoteType
  note_text: string
}

/**
 * Response structure for PUT
 */
interface UpdateNoteResponse {
  id: string
  property_id: string
  user_id: string
  note_type: string
  note_text: string
  created_at: string
  updated_at: string
}

/**
 * Validate the update note request body
 */
function validateUpdateRequest(body: unknown): {
  valid: boolean
  data?: UpdateNoteRequest
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // note_text is required
  if (!request.note_text || typeof request.note_text !== "string") {
    return { valid: false, error: "note_text is required and must be a string" }
  }

  // note_text must not be empty
  const noteText = request.note_text.trim()
  if (noteText.length === 0) {
    return { valid: false, error: "note_text cannot be empty" }
  }

  // note_text must not exceed reasonable length (e.g., 10,000 characters)
  if (noteText.length > 10000) {
    return { valid: false, error: "note_text cannot exceed 10,000 characters" }
  }

  // note_type is required
  if (!request.note_type || typeof request.note_type !== "string") {
    return { valid: false, error: "note_type is required and must be a string" }
  }

  // note_type must be valid
  if (!VALID_NOTE_TYPES.includes(request.note_type as NoteType)) {
    return {
      valid: false,
      error: `note_type must be one of: ${VALID_NOTE_TYPES.join(", ")}`,
    }
  }

  return {
    valid: true,
    data: {
      note_type: request.note_type as NoteType,
      note_text: noteText,
    },
  }
}

/**
 * PUT /api/properties/[id]/notes/[noteId]
 * Update a note for a property
 *
 * Security:
 * - Requires authentication
 * - Requires CSRF validation
 * - Users can only update their own notes
 * - RLS policies provide additional layer of protection
 *
 * Request body:
 * {
 *   note_type: "general" | "concern" | "opportunity" | "action" (required)
 *   note_text: string (required) - The note content
 * }
 *
 * Response (200):
 * {
 *   id: string - UUID of the updated note
 *   property_id: string - UUID of the property
 *   user_id: string - UUID of the user who created the note
 *   note_type: string - Type of note
 *   note_text: string - Note content
 *   created_at: string - ISO 8601 timestamp
 *   updated_at: string - ISO 8601 timestamp
 * }
 *
 * Response (404):
 * {
 *   error: "Note not found"
 *   message: "No note found with this ID or you don't have permission to update it"
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  const propertyId = params.id
  const noteId = params.noteId

  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Property Notes] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error)
  }

  const userId = authResult.user.id

  // Validate property_id format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(propertyId)) {
    return NextResponse.json(
      {
        error: "Invalid property ID",
        message: "property_id must be a valid UUID",
      },
      { status: 400 }
    )
  }

  // Validate note_id format (UUID)
  if (!uuidRegex.test(noteId)) {
    return NextResponse.json(
      {
        error: "Invalid note ID",
        message: "note_id must be a valid UUID",
      },
      { status: 400 }
    )
  }

  try {
    // Parse and validate request body
    const body = await request.json()
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

    const { note_type, note_text } = validation.data

    // Get Supabase client
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock response
      const mockNote: UpdateNoteResponse = {
        id: noteId,
        property_id: propertyId,
        user_id: userId,
        note_type,
        note_text,
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        updated_at: new Date().toISOString(),
      }

      return NextResponse.json(
        {
          ...mockNote,
          message: "Note updated (demo mode)",
          source: "mock",
        },
        { status: 200 }
      )
    }

    // Update the note - IMPORTANT: Include user_id check to ensure users can only update their own notes
    // This is a critical security measure that prevents users from updating other users' notes
    const { data, error: updateError } = await supabase
      .from("property_notes")
      .update({
        note_type,
        note_text,
        updated_at: new Date().toISOString(), // Explicitly set updated_at
      })
      .eq("id", noteId)
      .eq("property_id", propertyId)
      .eq("user_id", userId) // Security: Only update notes belonging to this user
      .select()
      .single()

    if (updateError) {
      console.error("[API Property Notes] Update error:", updateError)
      return NextResponse.json(
        {
          error: "Database error",
          message: updateError.message,
        },
        { status: 500 }
      )
    }

    // Check if any rows were updated
    if (!data) {
      return NextResponse.json(
        {
          error: "Note not found",
          message: "No note found with this ID or you don't have permission to update it",
        },
        { status: 404 }
      )
    }

    // Return the updated note
    const response: UpdateNoteResponse = {
      id: data.id,
      property_id: data.property_id,
      user_id: data.user_id,
      note_type: data.note_type,
      note_text: data.note_text,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error("[API Property Notes] Unexpected error:", error)

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid JSON",
          message: "Request body must be valid JSON",
        },
        { status: 400 }
      )
    }

    // Generic error handler
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/properties/[id]/notes/[noteId]
 * Delete a note for a property
 *
 * Security:
 * - Requires authentication
 * - Users can only delete their own notes
 * - RLS policies provide additional layer of protection
 *
 * Response (200):
 * {
 *   message: "Note deleted successfully"
 *   noteId: string
 * }
 *
 * Response (404):
 * {
 *   error: "Note not found"
 *   message: "No note found with this ID or you don't have permission to delete it"
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  const propertyId = params.id
  const noteId = params.noteId

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error)
  }

  const userId = authResult.user.id

  // Validate property_id format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(propertyId)) {
    return NextResponse.json(
      {
        error: "Invalid property ID",
        message: "property_id must be a valid UUID",
      },
      { status: 400 }
    )
  }

  // Validate note_id format (UUID)
  if (!uuidRegex.test(noteId)) {
    return NextResponse.json(
      {
        error: "Invalid note ID",
        message: "note_id must be a valid UUID",
      },
      { status: 400 }
    )
  }

  try {
    // Get Supabase client
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock response
      return NextResponse.json(
        {
          message: "Note deleted successfully (demo mode)",
          noteId,
          source: "mock",
        },
        { status: 200 }
      )
    }

    // Delete the note - IMPORTANT: Include user_id check to ensure users can only delete their own notes
    // This is a critical security measure that prevents users from deleting other users' notes
    const { data, error: deleteError } = await supabase
      .from("property_notes")
      .delete()
      .eq("id", noteId)
      .eq("property_id", propertyId)
      .eq("user_id", userId) // Security: Only delete notes belonging to this user
      .select()

    if (deleteError) {
      console.error("[API Property Notes] Delete error:", deleteError)
      return NextResponse.json(
        {
          error: "Database error",
          message: deleteError.message,
        },
        { status: 500 }
      )
    }

    // Check if any rows were deleted
    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          error: "Note not found",
          message: "No note found with this ID or you don't have permission to delete it",
        },
        { status: 404 }
      )
    }

    // Return success response
    return NextResponse.json(
      {
        message: "Note deleted successfully",
        noteId,
      },
      { status: 200 }
    )

  } catch (error) {
    console.error("[API Property Notes] Unexpected error:", error)

    // Generic error handler
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}
