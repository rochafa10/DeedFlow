import { NextRequest, NextResponse } from "next/server"
import { validateSupabaseAuth } from "./supabase-auth"

// API authentication using Supabase Auth
// All requests must include a valid Supabase JWT token in the Authorization header

export interface AuthResult {
  authenticated: boolean
  user?: {
    id: string
    email: string
    name: string
    role: string
  }
  error?: string
}

/**
 * Validate authentication for API requests using Supabase Auth
 *
 * Validates JWT tokens from the Authorization header using Supabase's getUser() method.
 * Returns user information including role from Supabase user metadata.
 *
 * Legacy X-User-Token headers are rejected with a clear error message.
 */
export async function validateApiAuth(request: NextRequest): Promise<AuthResult> {
  // Validate using Supabase Auth
  const supabaseResult = await validateSupabaseAuth(request)

  // If Supabase Auth succeeds, return immediately
  if (supabaseResult.authenticated) {
    return supabaseResult
  }

  // If Supabase Auth fails, check for invalid auth attempts
  // to provide clear error messages
  const authHeader = request.headers.get("Authorization")
  const userToken = request.headers.get("X-User-Token")

  if (!authHeader && !userToken) {
    return {
      authenticated: false,
      error: "Authentication required. Please provide valid credentials.",
    }
  }

  // If using Bearer token
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "")

    // Invalid token (already tried Supabase Auth)
    return {
      authenticated: false,
      error: "Invalid or expired token.",
    }
  }

  // Reject legacy X-User-Token authentication (no longer supported)
  if (userToken) {
    try {
      const user = JSON.parse(userToken)

      // Demo token support has been removed
      // All X-User-Token requests are now rejected
      return {
        authenticated: false,
        error: "Demo authentication is no longer supported. Please use Supabase authentication.",
      }
    } catch {
      return {
        authenticated: false,
        error: "Invalid user token format.",
      }
    }
  }

  return {
    authenticated: false,
    error: "Authentication required.",
  }
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorizedResponse(message?: string): NextResponse {
  return NextResponse.json(
    {
      error: "Unauthorized",
      message: message || "Authentication required. Please log in to access this resource.",
      status: 401,
    },
    { status: 401 }
  )
}

/**
 * Create a 403 Forbidden response
 */
export function forbiddenResponse(message?: string): NextResponse {
  return NextResponse.json(
    {
      error: "Forbidden",
      message: message || "You do not have permission to access this resource.",
      status: 403,
    },
    { status: 403 }
  )
}
