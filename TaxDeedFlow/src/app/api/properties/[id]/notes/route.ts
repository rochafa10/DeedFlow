/**
 * Property Notes API - Create Note Endpoint
 *
 * POST /api/properties/[id]/notes - Create a new note for a property
 *
 * This endpoint allows authenticated users to add personal notes to properties.
 * Notes are private to each user and persist across sessions.
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

// Valid note types
const VALID_NOTE_TYPES = ["general", "concern", "opportunity", "action"] as const
type NoteType = typeof VALID_NOTE_TYPES[number]

/**
 * Request body structure
 */
interface CreateNoteRequest {
  note_type: NoteType
  note_text: string
}

/**
 * Response structure
 */
interface CreateNoteResponse {
  id: string
  property_id: string
  user_id: string
  note_type: string
  note_text: string
  created_at: string
  updated_at: string
}

/**
 * Validate the create note request body
 */
function validateCreateRequest(body: unknown): {
  valid: boolean
  data?: CreateNoteRequest
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
 * POST /api/properties/[id]/notes
 * Create a new note for a property
 *
 * Request body:
 * {
 *   note_type: "general" | "concern" | "opportunity" | "action" (required)
 *   note_text: string (required) - The note content
 * }
 *
 * Response (201):
 * {
 *   id: string - UUID of the created note
 *   property_id: string - UUID of the property
 *   user_id: string - UUID of the user who created the note
 *   note_type: string - Type of note
 *   note_text: string - Note content
 *   created_at: string - ISO 8601 timestamp
 *   updated_at: string - ISO 8601 timestamp
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const propertyId = params.id

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

    const { note_type, note_text } = validation.data

    // Get Supabase client
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock response
      const mockNote: CreateNoteResponse = {
        id: crypto.randomUUID(),
        property_id: propertyId,
        user_id: userId,
        note_type,
        note_text,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      return NextResponse.json(
        {
          ...mockNote,
          message: "Note created (demo mode)",
          source: "mock",
        },
        { status: 201 }
      )
    }

    // First, verify the property exists
    const { data: propertyExists, error: propertyError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .single()

    if (propertyError || !propertyExists) {
      console.error("[API Property Notes] Property not found:", propertyId)
      return NextResponse.json(
        {
          error: "Property not found",
          message: `No property found with ID: ${propertyId}`,
        },
        { status: 404 }
      )
    }

    // Insert the note
    const { data: note, error: insertError } = await supabase
      .from("property_notes")
      .insert({
        property_id: propertyId,
        user_id: userId,
        note_type,
        note_text,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[API Property Notes] Insert error:", insertError)
      return NextResponse.json(
        {
          error: "Database error",
          message: insertError.message,
        },
        { status: 500 }
      )
    }

    // Return the created note
    const response: CreateNoteResponse = {
      id: note.id,
      property_id: note.property_id,
      user_id: note.user_id,
      note_type: note.note_type,
      note_text: note.note_text,
      created_at: note.created_at,
      updated_at: note.updated_at,
    }

    return NextResponse.json(response, { status: 201 })

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
