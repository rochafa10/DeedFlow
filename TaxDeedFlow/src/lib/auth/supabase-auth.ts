import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

// Authentication result interface - matches api-auth.ts
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
 * Validate Supabase JWT token from Authorization header
 * Uses Supabase Auth to validate the JWT token server-side
 *
 * @param request - Next.js request object
 * @returns AuthResult with authentication status and user info
 */
export async function validateSupabaseAuth(request: NextRequest): Promise<AuthResult> {
  // Create server-side Supabase client
  const supabase = createServerClient()

  if (!supabase) {
    return {
      authenticated: false,
      error: "Supabase authentication not configured.",
    }
  }

  // Extract JWT token from Authorization header
  const authHeader = request.headers.get("Authorization")

  if (!authHeader) {
    return {
      authenticated: false,
      error: "Authentication required. Please provide valid credentials.",
    }
  }

  // Extract Bearer token
  const token = authHeader.replace("Bearer ", "").trim()

  if (!token || token === authHeader) {
    return {
      authenticated: false,
      error: "Invalid authorization header format. Expected: Bearer <token>",
    }
  }

  try {
    // Validate JWT token using Supabase Auth
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      return {
        authenticated: false,
        error: error?.message || "Invalid or expired token.",
      }
    }

    // Extract user metadata
    const userMetadata = data.user.user_metadata || {}
    const email = data.user.email || "unknown@example.com"

    return {
      authenticated: true,
      user: {
        id: data.user.id,
        email: email,
        name: userMetadata.full_name || userMetadata.name || email.split("@")[0],
        role: userMetadata.role || "viewer",
      },
    }
  } catch (err) {
    return {
      authenticated: false,
      error: "Failed to validate authentication token.",
    }
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
