# Regrid Route Input Validation - Implementation Summary

## Changes Made

### 1. Added Zod Schema Validation
- Imported `zod` library for type-safe input validation
- Created `RegridScraperRequestSchema` with comprehensive validation rules

### 2. Input Validation Rules

#### Property ID
- **Type**: UUID (v4 format)
- **Required**: Yes
- **Validation**: Must be a valid UUID format
- **Error Message**: "property_id must be a valid UUID"

#### Parcel ID
- **Type**: String
- **Required**: Yes
- **Validation**:
  - Minimum 1 character
  - Maximum 100 characters
  - Auto-sanitized to remove dangerous characters
- **Sanitization**: Removes HTML tags, protocols (javascript:, data:, file:, http(s)://)

#### Address
- **Type**: String
- **Required**: No (optional)
- **Validation**: Maximum 500 characters
- **Sanitization**: Same as parcel_id

#### County
- **Type**: String
- **Required**: Yes
- **Validation**:
  - Minimum 1 character
  - Maximum 100 characters
  - Auto-sanitized
- **Sanitization**: Same as parcel_id

#### State
- **Type**: String (2-letter state code)
- **Required**: Yes
- **Validation**:
  - Exactly 2 characters
  - Must match pattern: ^[A-Z]{2}$
  - Auto-converts to uppercase
- **Error Message**: "state must be uppercase 2-letter code (e.g., PA, FL)"

#### Job ID
- **Type**: UUID (v4 format)
- **Required**: No (optional)
- **Validation**: Must be a valid UUID if provided

### 3. SSRF Protection

The `sanitizeString()` function removes:
- HTML tags: `<>` characters
- JavaScript protocol: `javascript:`
- Data URLs: `data:`
- VBScript protocol: `vbscript:`
- File protocol: `file:`
- HTTP/HTTPS URLs: `http://` and `https://`
- Leading/trailing whitespace

### 4. Error Responses

**Validation Failure Response** (400 Bad Request):
```json
{
  "error": "Validation error",
  "details": [
    {
      "code": "...",
      "message": "...",
      "path": ["field_name"]
    }
  ]
}
```

**Valid Request**: Continues normal processing

## Testing

### Test Script
A comprehensive test script is provided: `test-regrid-validation.sh`

### Test Cases Included
1. ✅ Valid input - should succeed
2. ✅ Invalid UUID - should fail with 400
3. ✅ SQL injection in parcel_id - should sanitize
4. ✅ SSRF attempt with URL in address - should sanitize
5. ✅ XSS attempt in county - should sanitize
6. ✅ Invalid state code - should fail with 400
7. ✅ Missing required fields - should fail with 400
8. ✅ javascript: protocol - should sanitize
9. ✅ Lowercase state code - should auto-uppercase
10. ✅ String too long - should fail with 400

### Running Tests

**Prerequisites**: Next.js dev server must be running
```bash
npm run dev
```

**Run tests**:
```bash
./test-regrid-validation.sh
```

### Expected Results

| Test | Expected Behavior | HTTP Status |
|------|-------------------|-------------|
| Valid input | Processes normally | 200 or 422* |
| Invalid UUID | Rejects with validation error | 400 |
| SQL injection | Sanitizes input, continues | 200 or 422* |
| SSRF URL | Removes URL, continues | 200 or 422* |
| XSS attempt | Removes tags, continues | 200 or 422* |
| Invalid state | Rejects with validation error | 400 |
| Missing fields | Rejects with validation error | 400 |
| String too long | Rejects with validation error | 400 |

\* 422 = Scraping failed (expected in test env without real Regrid data)

## Security Improvements

### Before
- Basic null checks only
- No type validation
- No length limits
- No sanitization
- Vulnerable to:
  - SSRF attacks via malicious URLs in inputs
  - SQL injection attempts
  - XSS attacks
  - Protocol injection

### After
- ✅ Strong type validation with Zod
- ✅ UUID format validation
- ✅ String length limits
- ✅ Input sanitization
- ✅ Protocol/URL removal
- ✅ State code format enforcement
- ✅ Detailed error messages
- ✅ Protection against common attack vectors

## Code Quality

- Follows pattern from `TaxDeedFlow/src/app/api/analysis/financial/route.ts`
- Type-safe validation
- Clear error messages
- Maintains backward compatibility
- No breaking changes to API contract
