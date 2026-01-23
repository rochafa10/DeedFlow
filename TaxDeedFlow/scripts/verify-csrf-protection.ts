/**
 * CSRF Protection Manual Verification Script
 *
 * This script tests the following scenarios:
 * 1. POST request with valid CSRF token succeeds
 * 2. POST request with invalid CSRF token (random 16-char string) fails with 403
 * 3. POST request without CSRF token but with valid Origin header succeeds
 * 4. POST request with expired token fails
 * 5. Reusing same token fails (single-use validation)
 *
 * @author Auto-Claude
 * @version 1.0.0
 */

import { NextRequest } from "next/server"
import {
  generateCsrfToken,
  storeCsrfToken,
  validateCsrf,
  validateStoredCsrfToken,
} from "../src/lib/auth/csrf"
import { createServerClient } from "../src/lib/supabase/client"

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
}

// Helper to print colored output
function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Helper to create a mock NextRequest
function createMockRequest(options: {
  method?: string
  headers?: Record<string, string>
  url?: string
}): NextRequest {
  const url = options.url || "http://localhost:3000/api/test"
  const headers = new Headers(options.headers || {})

  return {
    method: options.method || "POST",
    url,
    headers,
  } as NextRequest
}

// Test result tracking
let passedTests = 0
let failedTests = 0
let totalTests = 0

function testResult(testName: string, passed: boolean, details?: string) {
  totalTests++
  if (passed) {
    passedTests++
    log(`✓ ${testName}`, "green")
    if (details) log(`  ${details}`, "cyan")
  } else {
    failedTests++
    log(`✗ ${testName}`, "red")
    if (details) log(`  ${details}`, "yellow")
  }
}

/**
 * Scenario 1: POST request with valid CSRF token succeeds
 */
async function testValidCsrfToken() {
  log("\n=== Scenario 1: Valid CSRF Token ===", "blue")

  try {
    // Generate and store a valid token
    const token = generateCsrfToken()
    log(`Generated token: ${token.substring(0, 16)}...`)

    const storeResult = await storeCsrfToken(token, "test-session-1")
    if (!storeResult.success) {
      testResult(
        "Scenario 1: Valid CSRF token",
        false,
        `Failed to store token: ${storeResult.error}`
      )
      return
    }

    log("Token stored successfully")

    // Create request with valid token
    const request = createMockRequest({
      method: "POST",
      headers: {
        "X-CSRF-Token": token,
      },
    })

    // Validate the token
    const result = await validateCsrf(request)
    const passed = result.valid === true

    testResult(
      "Scenario 1: Valid CSRF token",
      passed,
      passed
        ? "Valid token correctly accepted"
        : `Unexpected error: ${result.error}`
    )
  } catch (error) {
    testResult(
      "Scenario 1: Valid CSRF token",
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Scenario 2: POST request with invalid CSRF token (random 16-char string) fails with 403
 */
async function testInvalidCsrfToken() {
  log("\n=== Scenario 2: Invalid CSRF Token ===", "blue")

  try {
    // Generate a random 16-character string (not stored in DB)
    const invalidToken = "1234567890abcdef"
    log(`Using invalid token: ${invalidToken}`)

    // Create request with invalid token
    const request = createMockRequest({
      method: "POST",
      headers: {
        "X-CSRF-Token": invalidToken,
      },
    })

    // Validate the token
    const result = await validateCsrf(request)
    const passed = result.valid === false && result.error !== undefined

    testResult(
      "Scenario 2: Invalid CSRF token rejected",
      passed,
      passed
        ? `Correctly rejected with error: ${result.error}`
        : "Invalid token was incorrectly accepted"
    )
  } catch (error) {
    testResult(
      "Scenario 2: Invalid CSRF token rejected",
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Scenario 3: POST request without CSRF token but with valid Origin header succeeds
 */
async function testValidOriginHeader() {
  log("\n=== Scenario 3: Valid Origin Header ===", "blue")

  try {
    // Create request with matching Origin header but no CSRF token
    const request = createMockRequest({
      method: "POST",
      headers: {
        Origin: "http://localhost:3000",
      },
      url: "http://localhost:3000/api/test",
    })

    log("Origin: http://localhost:3000")
    log("Request URL: http://localhost:3000/api/test")

    // Validate with Origin header
    const result = await validateCsrf(request)
    const passed = result.valid === true

    testResult(
      "Scenario 3: Valid Origin header accepted",
      passed,
      passed
        ? "Request with matching Origin header correctly accepted"
        : `Unexpected error: ${result.error}`
    )
  } catch (error) {
    testResult(
      "Scenario 3: Valid Origin header accepted",
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Scenario 4: POST request with expired token fails
 */
async function testExpiredCsrfToken() {
  log("\n=== Scenario 4: Expired CSRF Token ===", "blue")

  try {
    // Generate and store a token
    const token = generateCsrfToken()
    log(`Generated token: ${token.substring(0, 16)}...`)

    // Manually insert an expired token into the database
    const serverClient = createServerClient()
    if (!serverClient) {
      testResult(
        "Scenario 4: Expired token rejected",
        false,
        "Supabase not configured - cannot test expired tokens"
      )
      return
    }

    // Import crypto for hashing
    const crypto = await import("crypto")
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex")

    // Insert expired token (expired 1 hour ago)
    const expiredTime = new Date()
    expiredTime.setHours(expiredTime.getHours() - 1)

    const { error: insertError } = await serverClient
      .from("csrf_tokens")
      .insert({
        token_hash: tokenHash,
        user_session_id: "test-session-expired",
        expires_at: expiredTime.toISOString(),
      })

    if (insertError) {
      testResult(
        "Scenario 4: Expired token rejected",
        false,
        `Failed to insert expired token: ${insertError.message}`
      )
      return
    }

    log("Expired token inserted successfully")

    // Try to validate the expired token
    const result = await validateStoredCsrfToken(token)
    const passed = result.valid === false && (result.error?.includes("expired") === true)

    testResult(
      "Scenario 4: Expired token rejected",
      passed,
      passed
        ? `Correctly rejected: ${result.error}`
        : "Expired token was incorrectly accepted"
    )
  } catch (error) {
    testResult(
      "Scenario 4: Expired token rejected",
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Scenario 5: Reusing same token fails (single-use validation)
 */
async function testTokenReuse() {
  log("\n=== Scenario 5: Token Reuse Prevention ===", "blue")

  try {
    // Generate and store a valid token
    const token = generateCsrfToken()
    log(`Generated token: ${token.substring(0, 16)}...`)

    const storeResult = await storeCsrfToken(token, "test-session-reuse")
    if (!storeResult.success) {
      testResult(
        "Scenario 5: Token reuse prevented",
        false,
        `Failed to store token: ${storeResult.error}`
      )
      return
    }

    log("Token stored successfully")

    // First validation - should succeed
    const firstResult = await validateStoredCsrfToken(token)
    if (!firstResult.valid) {
      testResult(
        "Scenario 5: Token reuse prevented",
        false,
        `First validation failed unexpectedly: ${firstResult.error}`
      )
      return
    }

    log("First validation: ✓ Succeeded (token deleted)")

    // Second validation - should fail (token already used)
    const secondResult = await validateStoredCsrfToken(token)
    const passed =
      secondResult.valid === false &&
      ((secondResult.error?.includes("Invalid") === true) ||
        (secondResult.error?.includes("expired") === true))

    testResult(
      "Scenario 5: Token reuse prevented",
      passed,
      passed
        ? `Second validation correctly rejected: ${secondResult.error}`
        : "Token reuse was not prevented (security issue!)"
    )
  } catch (error) {
    testResult(
      "Scenario 5: Token reuse prevented",
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Main test runner
 */
async function runVerificationTests() {
  log("\n" + "=".repeat(60), "cyan")
  log("CSRF PROTECTION VERIFICATION TESTS", "cyan")
  log("=".repeat(60), "cyan")

  // Check if Supabase is configured
  const serverClient = createServerClient()
  if (!serverClient) {
    log(
      "\n⚠️  WARNING: Supabase is not configured. Some tests will be skipped.",
      "yellow"
    )
    log("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to run all tests.\n", "yellow")
  }

  // Run all test scenarios
  await testValidCsrfToken()
  await testInvalidCsrfToken()
  await testValidOriginHeader()
  await testExpiredCsrfToken()
  await testTokenReuse()

  // Print summary
  log("\n" + "=".repeat(60), "cyan")
  log("TEST SUMMARY", "cyan")
  log("=".repeat(60), "cyan")

  log(`\nTotal Tests: ${totalTests}`)
  log(`Passed: ${passedTests}`, "green")
  log(`Failed: ${failedTests}`, failedTests > 0 ? "red" : "green")

  const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0
  log(`\nPass Rate: ${passRate.toFixed(1)}%`, passRate === 100 ? "green" : "yellow")

  if (failedTests === 0) {
    log("\n✅ ALL TESTS PASSED! CSRF protection is working correctly.\n", "green")
    process.exit(0)
  } else {
    log(
      "\n❌ SOME TESTS FAILED! Please review the failures above.\n",
      "red"
    )
    process.exit(1)
  }
}

// Run the tests
runVerificationTests().catch((error) => {
  log("\n❌ Fatal error during test execution:", "red")
  console.error(error)
  process.exit(1)
})
