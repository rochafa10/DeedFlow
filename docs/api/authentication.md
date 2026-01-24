# Authentication & Authorization

This guide covers authentication and authorization for Tax Deed Flow API endpoints.

## Table of Contents

- [Overview](#overview)
- [Authentication Methods](#authentication-methods)
- [Making Authenticated Requests](#making-authenticated-requests)
- [CSRF Protection](#csrf-protection)
- [Authorization Roles](#authorization-roles)
- [Error Handling](#error-handling)
- [API Route Implementation](#api-route-implementation)
- [Security Considerations](#security-considerations)

## Overview

Tax Deed Flow uses a dual authentication system:
- **Bearer Token Authentication** - Simple token-based auth for demo/development
- **X-User-Token Authentication** - Serialized user info with validation (recommended)

All state-changing operations (POST, PUT, DELETE, PATCH) are protected by CSRF validation.

## Authentication Methods

### Method 1: Bearer Token (Demo Mode)

Send an `Authorization` header with a Bearer token:

```http
GET /api/properties HTTP/1.1
Authorization: Bearer demo-token
```

**Valid Demo Tokens:**
- `demo-token` - Maps to admin user (demo-user-1)
- `demo123` - Maps to admin user (demo-user-1)

**Response on Success:**
```typescript
{
  authenticated: true,
  user: {
    id: "demo-user-1",
    email: "demo@taxdeedflow.com",
    name: "Demo User",
    role: "admin"
  }
}
```

### Method 2: X-User-Token (Recommended)

Send an `X-User-Token` header with serialized user JSON:

```http
GET /api/properties HTTP/1.1
X-User-Token: {"id":"demo-user-1","email":"demo@taxdeedflow.com","name":"Demo User","role":"admin"}
```

**Valid User IDs:**
- `demo-user-1` - Admin user (demo@taxdeedflow.com)
- `viewer-user-1` - Viewer user (viewer@taxdeedflow.com)
- `analyst-user-1` - Analyst user (analyst@taxdeedflow.com)

**Token Validation:**
1. User ID must be in the valid users list
2. Email must match the expected email for that user ID
3. Required fields: `id`, `email`
4. Optional fields: `name`, `role` (defaults to "viewer")

## Making Authenticated Requests

### Client-Side (Fetch API)

```typescript
// Using Bearer Token
const response = await fetch('/api/properties', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer demo-token',
    'Content-Type': 'application/json'
  }
})

// Using X-User-Token
const user = {
  id: 'demo-user-1',
  email: 'demo@taxdeedflow.com',
  name: 'Demo User',
  role: 'admin'
}

const response = await fetch('/api/properties', {
  method: 'GET',
  headers: {
    'X-User-Token': JSON.stringify(user),
    'Content-Type': 'application/json'
  }
})
```

### Client-Side with CSRF (State-Changing Operations)

```typescript
// Generate and store CSRF token (done once on app load)
import { generateCsrfToken, getCsrfStorageKey, getCsrfHeaderName } from '@/lib/auth/csrf'

const csrfToken = generateCsrfToken()
localStorage.setItem(getCsrfStorageKey(), csrfToken)

// Use CSRF token in requests
const csrfToken = localStorage.getItem(getCsrfStorageKey())

const response = await fetch('/api/properties', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer demo-token',
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    parcel_id: '123-456-789',
    address: '123 Main St'
  })
})
```

### Server-Side (Next.js API Route)

```typescript
import { NextRequest } from 'next/server'
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/api-auth'
import { validateCsrf, csrfErrorResponse } from '@/lib/auth/csrf'

export async function POST(request: NextRequest) {
  // 1. Validate CSRF for state-changing operations
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    return csrfErrorResponse(csrfResult.error)
  }

  // 2. Validate authentication
  const authResult = await validateApiAuth(request)
  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // 3. Check authorization (role-based)
  if (authResult.user?.role !== 'admin') {
    return forbiddenResponse('Admin access required.')
  }

  // 4. Process authenticated request
  const user = authResult.user
  // ... your business logic here
}
```

## CSRF Protection

CSRF (Cross-Site Request Forgery) protection is automatically enforced for all state-changing operations.

### Protected Methods

- `POST`
- `PUT`
- `DELETE`
- `PATCH`

### Validation Strategy

The system validates CSRF protection in order of preference:

1. **Origin Header** (most reliable)
   - Must match the expected origin (`${protocol}://${host}`)
   - Present in modern browsers for cross-origin requests

2. **Referer Header** (fallback)
   - Must match the expected origin
   - Used if Origin header is not present

3. **X-CSRF-Token Header** (last resort)
   - Must be at least 16 characters
   - Can be generated using `generateCsrfToken()`

### CSRF Token Generation

```typescript
import { generateCsrfToken } from '@/lib/auth/csrf'

// Generate a cryptographically secure token
const token = generateCsrfToken()
// Example: "a3f5b8c1d9e2f7a4b6c8d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1"
```

### CSRF Constants

```typescript
import { getCsrfStorageKey, getCsrfHeaderName } from '@/lib/auth/csrf'

const storageKey = getCsrfStorageKey()    // "taxdeedflow_csrf_token"
const headerName = getCsrfHeaderName()     // "X-CSRF-Token"
```

## Authorization Roles

The system supports role-based access control (RBAC):

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | Full system access | All operations (read, write, delete) |
| `analyst` | Data analysis and research | Read, create reports, modify properties |
| `viewer` | Read-only access | View data only |

### Role Checking Example

```typescript
export async function DELETE(request: NextRequest) {
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse()
  }

  // Only admins can delete
  if (authResult.user?.role !== 'admin') {
    return forbiddenResponse('Admin access required for delete operations.')
  }

  // Proceed with delete...
}
```

### Role-Based Rendering (Client-Side)

```typescript
'use client'

import { useAuth } from '@/contexts/auth-context'

export function AdminPanel() {
  const { user } = useAuth()

  if (user?.role !== 'admin') {
    return <div>Access denied. Admin access required.</div>
  }

  return (
    <div>
      {/* Admin-only content */}
    </div>
  )
}
```

## Error Handling

### Error Response Format

All authentication and authorization errors follow a consistent format:

```typescript
{
  error: "Unauthorized" | "Forbidden",
  message: "Descriptive error message",
  status: 401 | 403
}
```

### HTTP Status Codes

| Status | Error Type | When It Occurs |
|--------|------------|----------------|
| `401 Unauthorized` | Authentication failed | Missing or invalid credentials |
| `403 Forbidden` | Authorization failed | Valid credentials but insufficient permissions |
| `403 Forbidden` | CSRF validation failed | Invalid origin, referer, or CSRF token |

### Error Examples

**401 Unauthorized - Missing Authentication:**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required. Please provide valid credentials.",
  "status": 401
}
```

**401 Unauthorized - Invalid Token:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token.",
  "status": 401
}
```

**403 Forbidden - Insufficient Permissions:**
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource.",
  "status": 403
}
```

**403 Forbidden - CSRF Failure:**
```json
{
  "error": "Forbidden",
  "message": "Cross-origin request blocked. Invalid origin.",
  "status": 403
}
```

### Client-Side Error Handling

```typescript
try {
  const response = await fetch('/api/properties', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer demo-token',
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()

    if (error.status === 401) {
      // Redirect to login or refresh token
      window.location.href = '/login'
    } else if (error.status === 403) {
      // Show permission denied message
      alert(error.message)
    }

    throw new Error(error.message)
  }

  const data = await response.json()
  // Process successful response
} catch (error) {
  console.error('Request failed:', error)
}
```

## API Route Implementation

### Complete Example: Protected API Route

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/api-auth'
import { validateCsrf, csrfErrorResponse } from '@/lib/auth/csrf'

// GET - Read operation (authentication only)
export async function GET(request: NextRequest) {
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // All authenticated users can read
  const properties = await getProperties()

  return NextResponse.json({
    data: properties,
    user: authResult.user
  })
}

// POST - Write operation (authentication + CSRF + authorization)
export async function POST(request: NextRequest) {
  // 1. Validate CSRF
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    return csrfErrorResponse(csrfResult.error)
  }

  // 2. Validate authentication
  const authResult = await validateApiAuth(request)
  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // 3. Check authorization (only admin and analyst can create)
  const allowedRoles = ['admin', 'analyst']
  if (!allowedRoles.includes(authResult.user?.role || '')) {
    return forbiddenResponse('You do not have permission to create properties.')
  }

  // 4. Process request
  const body = await request.json()
  const property = await createProperty(body, authResult.user)

  return NextResponse.json({
    data: property,
    message: 'Property created successfully'
  }, { status: 201 })
}

// DELETE - Destructive operation (admin only)
export async function DELETE(request: NextRequest) {
  // 1. Validate CSRF
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    return csrfErrorResponse(csrfResult.error)
  }

  // 2. Validate authentication
  const authResult = await validateApiAuth(request)
  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // 3. Check authorization (admin only for deletes)
  if (authResult.user?.role !== 'admin') {
    return forbiddenResponse('Admin access required for delete operations.')
  }

  // 4. Process delete
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  await deleteProperty(id)

  return NextResponse.json({
    message: 'Property deleted successfully'
  })
}
```

### Middleware Pattern

You can also create reusable middleware functions:

```typescript
// lib/auth/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from './api-auth'
import { validateCsrf, csrfErrorResponse } from './csrf'

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  return handler(request, authResult.user)
}

export async function withAuthAndCsrf(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    return csrfErrorResponse(csrfResult.error)
  }

  return withAuth(request, handler)
}

export async function withRole(
  request: NextRequest,
  allowedRoles: string[],
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  if (!allowedRoles.includes(authResult.user?.role || '')) {
    return forbiddenResponse('Insufficient permissions.')
  }

  return handler(request, authResult.user)
}

// Usage in API route
export async function POST(request: NextRequest) {
  return withAuthAndCsrf(request, async (req, user) => {
    if (user.role !== 'admin') {
      return forbiddenResponse('Admin access required.')
    }

    const body = await req.json()
    const result = await createProperty(body, user)

    return NextResponse.json({ data: result })
  })
}
```

## Security Considerations

### Demo vs Production

⚠️ **Important**: The current implementation is designed for demo/development purposes. For production use:

1. **Replace Bearer Token Auth** with proper JWT validation
2. **Validate JWTs** against a secure signing key
3. **Store user sessions** in a secure session store (Redis, database)
4. **Use HTTPS** for all API communication
5. **Implement rate limiting** to prevent brute force attacks
6. **Add audit logging** for all authentication attempts
7. **Rotate CSRF tokens** periodically
8. **Implement token expiration** and refresh mechanisms

### Current Security Features

✅ **Token Validation**: User IDs and emails are validated against a whitelist
✅ **CSRF Protection**: All state-changing operations are protected
✅ **Origin Validation**: Cross-origin requests are blocked
✅ **Secure Token Generation**: Uses crypto API for random tokens
✅ **Role-Based Access**: Authorization checks prevent privilege escalation

### Best Practices

1. **Always validate authentication** before processing requests
2. **Check CSRF** for all POST, PUT, DELETE, PATCH operations
3. **Verify authorization** (role checks) after authentication
4. **Return generic error messages** to avoid leaking security info
5. **Log authentication failures** for security monitoring
6. **Never expose** sensitive user data in error responses
7. **Use HTTPS** in production to prevent token interception
8. **Store CSRF tokens** securely (localStorage or sessionStorage)

### Common Security Pitfalls

❌ **Don't** include sensitive data in JWT payloads
❌ **Don't** skip CSRF validation for AJAX requests
❌ **Don't** trust client-provided role/permission data without validation
❌ **Don't** use weak or predictable tokens
❌ **Don't** expose detailed error messages in production

### Audit Logging Example

```typescript
import { validateApiAuth } from '@/lib/auth/api-auth'

export async function POST(request: NextRequest) {
  const authResult = await validateApiAuth(request)

  // Log authentication attempt
  if (!authResult.authenticated) {
    console.log('[Security] Failed authentication attempt:', {
      ip: request.ip,
      path: request.url,
      error: authResult.error,
      timestamp: new Date().toISOString()
    })
    return unauthorizedResponse(authResult.error)
  }

  // Log successful access
  console.log('[Security] Authenticated request:', {
    userId: authResult.user?.id,
    role: authResult.user?.role,
    path: request.url,
    method: request.method,
    timestamp: new Date().toISOString()
  })

  // Process request...
}
```

## Related Documentation

- [API Overview](./overview.md) - General API documentation
- [Error Handling](./errors.md) - Complete error handling guide
- [Rate Limiting](./rate-limiting.md) - API rate limits and quotas

## Quick Reference

### Import Statements

```typescript
// Authentication
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/api-auth'

// CSRF Protection
import { validateCsrf, csrfErrorResponse, generateCsrfToken, getCsrfStorageKey, getCsrfHeaderName } from '@/lib/auth/csrf'
```

### Common Patterns

```typescript
// Read-only endpoint (GET)
const authResult = await validateApiAuth(request)
if (!authResult.authenticated) {
  return unauthorizedResponse(authResult.error)
}

// Write endpoint (POST/PUT/DELETE/PATCH)
const csrfResult = await validateCsrf(request)
if (!csrfResult.valid) {
  return csrfErrorResponse(csrfResult.error)
}
const authResult = await validateApiAuth(request)
if (!authResult.authenticated) {
  return unauthorizedResponse(authResult.error)
}

// Admin-only endpoint
if (authResult.user?.role !== 'admin') {
  return forbiddenResponse('Admin access required.')
}

// Role-based endpoint
const allowedRoles = ['admin', 'analyst']
if (!allowedRoles.includes(authResult.user?.role || '')) {
  return forbiddenResponse('Insufficient permissions.')
}
```
