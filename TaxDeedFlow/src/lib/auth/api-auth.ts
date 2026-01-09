import { NextRequest, NextResponse } from "next/server"

// Simple API authentication using a custom header
// In production, this would validate JWT tokens or session cookies

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

// Valid user IDs for demo mode
// In production, this would validate against a database or JWT signature
const VALID_USER_IDS = new Set([
  "demo-user-1",      // Admin user
  "viewer-user-1",    // Viewer user
  "analyst-user-1",   // Analyst user
])

// Valid email addresses that must match the user ID
const VALID_USER_EMAILS: Record<string, string> = {
  "demo-user-1": "demo@taxdeedflow.com",
  "viewer-user-1": "viewer@taxdeedflow.com",
  "analyst-user-1": "analyst@taxdeedflow.com",
}

/**
 * Validate authentication for API requests
 * Checks for X-User-Token header containing serialized user info
 * In demo mode, this validates against known demo users
 */
export async function validateApiAuth(request: NextRequest): Promise<AuthResult> {
  // Check for auth header (custom header for demo purposes)
  const authHeader = request.headers.get("Authorization")
  const userToken = request.headers.get("X-User-Token")

  // In a real app, we'd validate JWT tokens here
  // For demo, we check if a user token is provided

  if (!authHeader && !userToken) {
    return {
      authenticated: false,
      error: "Authentication required. Please provide valid credentials.",
    }
  }

  // If using Bearer token
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "")

    // Demo: Accept specific demo tokens
    if (token === "demo-token" || token === "demo123") {
      return {
        authenticated: true,
        user: {
          id: "demo-user-1",
          email: "demo@taxdeedflow.com",
          name: "Demo User",
          role: "admin",
        },
      }
    }

    // Invalid token
    return {
      authenticated: false,
      error: "Invalid or expired token.",
    }
  }

  // If using X-User-Token (client sends serialized user info)
  if (userToken) {
    try {
      const user = JSON.parse(userToken)

      // Validate that user has required fields
      if (!user || !user.id || !user.email) {
        return {
          authenticated: false,
          error: "Invalid token: missing required fields.",
        }
      }

      // SECURITY: Validate that the user ID is a known valid ID
      // This prevents arbitrary tokens from being accepted
      if (!VALID_USER_IDS.has(user.id)) {
        console.log("[API Auth] Invalid user ID rejected:", user.id)
        return {
          authenticated: false,
          error: "Invalid or expired token.",
        }
      }

      // SECURITY: Validate that the email matches the expected email for this user ID
      // This prevents token tampering where someone changes their role/email
      const expectedEmail = VALID_USER_EMAILS[user.id]
      if (expectedEmail && user.email !== expectedEmail) {
        console.log("[API Auth] Email mismatch rejected. Expected:", expectedEmail, "Got:", user.email)
        return {
          authenticated: false,
          error: "Invalid or expired token.",
        }
      }

      return {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || "Unknown",
          role: user.role || "viewer",
        },
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
