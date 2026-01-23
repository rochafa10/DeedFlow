/**
 * Authenticated fetch utility
 * Automatically adds Supabase session token to API requests for authentication
 */

import { supabase } from "../supabase/client"

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

/**
 * Fetch wrapper that automatically includes authentication headers
 * @param url - The URL to fetch
 * @param options - Fetch options, with optional skipAuth flag
 * @returns The fetch response
 */
export async function authFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuth, ...fetchOptions } = options

  // Build headers
  const headers = new Headers(fetchOptions.headers || {})

  // Add auth header if Supabase is configured and auth is not skipped
  if (!skipAuth && supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`)
    }
  }

  // Ensure Content-Type is set for JSON requests
  if (!headers.has("Content-Type") && fetchOptions.body && typeof fetchOptions.body === "string") {
    headers.set("Content-Type", "application/json")
  }

  return fetch(url, {
    ...fetchOptions,
    headers,
  })
}

/**
 * GET request with authentication
 */
export async function authGet(url: string, options: FetchOptions = {}): Promise<Response> {
  return authFetch(url, { ...options, method: "GET" })
}

/**
 * POST request with authentication
 */
export async function authPost(url: string, body?: unknown, options: FetchOptions = {}): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * PUT request with authentication
 */
export async function authPut(url: string, body?: unknown, options: FetchOptions = {}): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * PATCH request with authentication
 */
export async function authPatch(url: string, body?: unknown, options: FetchOptions = {}): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * DELETE request with authentication
 */
export async function authDelete(url: string, options: FetchOptions = {}): Promise<Response> {
  return authFetch(url, { ...options, method: "DELETE" })
}
