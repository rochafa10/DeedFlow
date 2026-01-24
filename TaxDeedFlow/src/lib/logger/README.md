# Sanitized Logger

A logging utility that automatically redacts PII (Personally Identifiable Information) and sensitive data from application logs to comply with data protection regulations (GDPR, CCPA).

## Table of Contents

- [Quick Start](#quick-start)
- [Why Use This Logger?](#why-use-this-logger)
- [Usage Examples](#usage-examples)
- [Automatic Sanitization](#automatic-sanitization)
- [Log Levels](#log-levels)
- [Configuration](#configuration)
- [Adding Custom Redaction Rules](#adding-custom-redaction-rules)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)
- [API Reference](#api-reference)

## Quick Start

```typescript
// Import the logger
import { logger } from "@/lib/logger"

// Use it just like console.log, but with automatic PII sanitization
logger.info("User logged in", { email: "user@example.com" })
// Output: User logged in { email: '[REDACTED]' }

logger.error("Failed to process property", {
  property_address: "123 Main St",
  parcel_id: "ABC123456789"
})
// Output: Failed to process property { property_address: '[REDACTED]', parcel_id: 'ABC...[REDACTED]' }
```

## Why Use This Logger?

**Problem:** Direct `console.log` usage exposes sensitive data in logs:
- Property owner names and addresses
- User email addresses
- Geographic coordinates
- IP addresses
- Parcel IDs

**Solution:** This logger automatically detects and redacts sensitive fields based on field names, protecting your users' privacy and ensuring compliance.

## Usage Examples

### Basic Logging

```typescript
import { logger } from "@/lib/logger"

// Different log levels
logger.debug("Verbose debugging info")
logger.log("General information")
logger.info("Important information")
logger.warn("Warning message")
logger.error("Error occurred")
```

### Logging Objects with Sensitive Data

```typescript
// Automatically redacts sensitive fields
logger.info("Processing property", {
  property_address: "123 Main St",  // Will be redacted
  owner_name: "John Doe",           // Will be redacted
  parcel_id: "ABC123456789",        // Partial redaction: "ABC...[REDACTED]"
  tax_amount: 5000,                 // Not sensitive, logged as-is
  latitude: 40.7128,                // Will be redacted
  longitude: -74.0060               // Will be redacted
})
```

### Logging Errors

```typescript
try {
  await processProperty(propertyData)
} catch (error) {
  // Preserves stack traces while sanitizing error properties
  logger.error("Property processing failed", error, {
    property_id: propertyId,
    user_email: userEmail  // Will be redacted
  })
}
```

### Logging Arrays

```typescript
const properties = [
  { parcel_id: "ABC123", owner_name: "John Doe", value: 50000 },
  { parcel_id: "XYZ789", owner_name: "Jane Smith", value: 75000 }
]

// Sanitizes all objects in the array
logger.info("Loaded properties", properties)
// Output: Loaded properties [
//   { parcel_id: 'ABC...[REDACTED]', owner_name: '[REDACTED]', value: 50000 },
//   { parcel_id: 'XYZ...[REDACTED]', owner_name: '[REDACTED]', value: 75000 }
// ]
```

## Automatic Sanitization

### What Gets Redacted?

The logger automatically redacts fields based on their **field names**. Here are the default patterns:

#### Email Addresses (Full Redaction)
- `email`, `user_email`, `created_by_email`, etc.
- Pattern: `/^.*_email$/i`

#### Property Addresses (Full Redaction)
- `property_address`, `address`, `street_address`, `mailing_address`
- Pattern: `/^.*address$/i`

#### Owner Names (Full Redaction)
- `owner_name`, `property_owner`, `owner`
- Pattern: `/^owner.*$/i`

#### Geographic Coordinates (Full Redaction)
- `latitude`, `lat`, `longitude`, `lon`, `lng`, `coordinates`, `coords`

#### Parcel IDs (Partial Redaction - Shows First 3 Characters)
- `parcel_id`, `parcel_number`, `parcel`
- Example: `ABC123456789` → `ABC...[REDACTED]`

#### IP Addresses (Full Redaction)
- `ip`, `ip_address`, `client_ip`

#### Phone Numbers (Partial Redaction - Shows First 3 Characters)
- `phone`, `phone_number`, `contact_phone`

#### Social Security Numbers (Full Redaction)
- `ssn`, `social_security`

#### Credit Card Numbers (Partial Redaction - Shows Last 4 Digits)
- `credit_card`, `card_number`

### Redaction Styles

**Full Redaction:** Entire value is replaced with `[REDACTED]`
```typescript
{ email: "user@example.com" } → { email: "[REDACTED]" }
```

**Partial Redaction:** Preserves a few characters for debugging
```typescript
{ parcel_id: "ABC123456789" } → { parcel_id: "ABC...[REDACTED]" }
{ phone: "555-1234" } → { phone: "555...[REDACTED]" }
```

## Log Levels

The logger supports five log levels in order of increasing severity:

| Level | When to Use | Example |
|-------|-------------|---------|
| `debug` | Detailed debugging information during development | `logger.debug("Cache hit for key:", key)` |
| `log` | General application flow information | `logger.log("Processing batch of", count, "items")` |
| `info` | Important business events | `logger.info("User registration completed")` |
| `warn` | Warning conditions that should be reviewed | `logger.warn("API rate limit approaching")` |
| `error` | Error conditions requiring attention | `logger.error("Database connection failed", error)` |

### Log Level Filtering

Set the `LOG_LEVEL` environment variable to filter output:

```bash
# Show only warnings and errors
LOG_LEVEL=warn npm run dev

# Show only errors
LOG_LEVEL=error npm run dev

# Show everything (including debug)
LOG_LEVEL=debug npm run dev

# Disable all logging
LOG_LEVEL=none npm run dev
```

**Default:** `info` (shows info, warn, and error)

## Configuration

### Environment Variables

```bash
# .env or .env.local
LOG_LEVEL=info    # Options: debug, log, info, warn, error, none
```

### Runtime Configuration

```typescript
import { logger } from "@/lib/logger"

// Update configuration at runtime
logger.configure({
  logLevel: "debug",
  preserveStackTraces: true,
  redactionText: "[HIDDEN]"
})
```

### Creating Custom Logger Instances

```typescript
import { createLogger } from "@/lib/logger"

// Create a logger with custom configuration
const customLogger = createLogger({
  logLevel: "warn",
  preserveStackTraces: false,
  redactionText: "***REDACTED***"
})

customLogger.warn("This uses custom configuration")
```

## Adding Custom Redaction Rules

You can add custom sanitization rules for additional sensitive fields:

```typescript
import { logger } from "@/lib/logger"

// Add custom redaction rules
logger.configure({
  sanitizationRules: [
    {
      pattern: /^api_key$/i,
      type: "api_key" as any,  // Custom type
      redactionStyle: "full"
    },
    {
      pattern: /^customer_id$/i,
      type: "customer_id" as any,
      redactionStyle: "partial",
      preserveChars: 4
    },
    {
      pattern: /^.*_token$/i,  // Matches: auth_token, refresh_token, etc.
      type: "token" as any,
      redactionStyle: "full"
    }
  ]
})

// Now these fields will be automatically redacted
logger.info("API call", {
  api_key: "sk_live_123456789",      // [REDACTED]
  customer_id: "cust_ABC123XYZ",     // cust...[REDACTED]
  auth_token: "eyJhbGciOiJIUzI1NiIs..." // [REDACTED]
})
```

### Rule Definition

```typescript
interface SanitizationRule {
  // Field name pattern (string or regex)
  pattern: string | RegExp

  // Type identifier for this rule
  type: string

  // How to redact the value
  redactionStyle: "full" | "partial"

  // For partial redaction, how many characters to preserve
  preserveChars?: number
}
```

**Pattern Matching:**
- **String patterns:** Exact match (case-insensitive)
- **RegExp patterns:** Flexible matching (e.g., `/^.*_token$/i` matches any field ending with `_token`)

**Redaction Styles:**
- **`full`**: Replace entire value with `[REDACTED]`
- **`partial`**: Show first N characters, hide the rest

## Best Practices

### ✅ DO

```typescript
// Use appropriate log levels
logger.info("User registered successfully")
logger.warn("Cache miss, fetching from database")
logger.error("Payment processing failed", error)

// Log structured data
logger.info("Property created", {
  property_id: propertyId,
  county: countyName,
  status: "pending"
})

// Log errors with context
try {
  await riskyOperation()
} catch (error) {
  logger.error("Operation failed", error, {
    operation: "riskyOperation",
    user_id: userId
  })
}

// Use debug for verbose information
logger.debug("Query params:", { page, limit, sort })
```

### ❌ DON'T

```typescript
// Don't use console.log directly in API routes or lib utilities
console.log("User data:", userData)  // ❌ Not sanitized

// Don't log entire request/response objects (may contain headers with tokens)
logger.info("Request:", req)  // ❌ Too much data

// Don't rely on the logger to sanitize values by content
// It only matches field names, not field values
logger.info("Email is: user@example.com")  // ❌ Still logged as-is
// Instead, use an object:
logger.info("User details", { email: "user@example.com" })  // ✅ Redacted
```

### When to Use Each Log Level

| Situation | Level | Example |
|-----------|-------|---------|
| Function entry/exit | `debug` | `logger.debug("Entering calculateScore")` |
| Business logic flow | `log` | `logger.log("Processing", count, "items")` |
| Successful operations | `info` | `logger.info("Invoice generated", { invoice_id })` |
| Recoverable issues | `warn` | `logger.warn("Retrying failed request")` |
| Failures requiring attention | `error` | `logger.error("Database query failed", error)` |

## Migration Guide

### Replacing console.log

**Before:**
```typescript
console.log("User logged in:", { email: user.email })
console.error("Failed to process:", error)
console.warn("Rate limit approaching")
```

**After:**
```typescript
import { logger } from "@/lib/logger"

logger.log("User logged in:", { email: user.email })
logger.error("Failed to process:", error)
logger.warn("Rate limit approaching")
```

### Migration Checklist

1. **Import the logger**
   ```typescript
   import { logger } from "@/lib/logger"
   ```

2. **Replace console methods**
   - `console.log(...)` → `logger.log(...)`
   - `console.info(...)` → `logger.info(...)`
   - `console.warn(...)` → `logger.warn(...)`
   - `console.error(...)` → `logger.error(...)`
   - `console.debug(...)` → `logger.debug(...)`

3. **Test your logs**
   - Verify sensitive fields show `[REDACTED]`
   - Check that non-sensitive data is still visible
   - Confirm error stack traces are preserved

4. **Configure ESLint** (if not already done)
   ```json
   {
     "rules": {
       "no-console": "error"
     }
   }
   ```

## API Reference

### Logger Methods

```typescript
logger.log(...args: unknown[]): void
logger.info(...args: unknown[]): void
logger.warn(...args: unknown[]): void
logger.error(...args: unknown[]): void
logger.debug(...args: unknown[]): void
```

All methods accept any number of arguments of any type and sanitize them before logging.

### Configuration Methods

```typescript
// Update logger configuration
logger.configure(config: Partial<LoggerConfig>): void

// Get current configuration
logger.getConfig(): LoggerConfig
```

### Utility Functions

```typescript
// Sanitize a single value
import { sanitize } from "@/lib/logger"
const clean = sanitize(dirtyData, config)

// Sanitize multiple values
import { sanitizeAll } from "@/lib/logger"
const cleanArgs = sanitizeAll([arg1, arg2, arg3], config)

// Check if a value contains sensitive data
import { containsSensitiveData } from "@/lib/logger"
if (containsSensitiveData(userData)) {
  // Handle sensitive data
}
```

### Creating Custom Loggers

```typescript
import { createLogger, createLoggerConfig } from "@/lib/logger"

// Create custom configuration
const config = createLoggerConfig({
  logLevel: "debug",
  preserveStackTraces: true,
  sanitizationRules: [
    // Custom rules...
  ]
})

// Create logger with custom config
const customLogger = createLogger(config)
```

### Types

```typescript
import type {
  Logger,           // Logger interface
  LoggerConfig,     // Configuration object
  LogLevel,         // "debug" | "log" | "info" | "warn" | "error"
  SanitizationRule, // Rule definition
  LogValue          // Types that can be logged
} from "@/lib/logger"
```

---

## Need Help?

- **Not seeing redactions?** Check that your field names match the default patterns (see [Automatic Sanitization](#automatic-sanitization))
- **Too much/too little logging?** Adjust the `LOG_LEVEL` environment variable
- **Need to redact custom fields?** Add custom sanitization rules (see [Adding Custom Redaction Rules](#adding-custom-redaction-rules))
- **Logger errors?** The logger fails silently to avoid breaking application flow, but logs errors to `console.error`

## Compliance Notes

This logger helps comply with:
- **GDPR Article 5:** Data protection principles (minimize data exposure in logs)
- **CCPA:** California Consumer Privacy Act (protect personal information)
- **PCI DSS:** Never log full credit card numbers
- **HIPAA:** Avoid logging PHI in healthcare applications

**Remember:** The logger only sanitizes based on field names. Ensure sensitive data is structured properly (in objects with appropriate field names) for automatic redaction.
