/**
 * Validation Schema Tests
 *
 * Comprehensive tests for scraper input validation schemas including:
 * - Valid input acceptance
 * - Path traversal detection and blocking
 * - Special character handling
 * - SQL injection pattern detection
 * - XSS pattern detection
 * - URL encoding validation
 * - Edge cases (null, undefined, empty, extremely long)
 *
 * @module validation/__tests__/scraper-validation
 */

import { describe, it, expect } from 'vitest'
import {
  parcelIdSchema,
  countyNameSchema,
  stateCodeSchema,
  propertyAddressSchema,
  propertyIdSchema,
  regridUrlSchema,
  screenshotRequestSchema,
  regridRequestSchema,
  safeValidate,
} from '../scraper-validation'

// ============================================
// Parcel ID Validation Tests
// ============================================

describe('parcelIdSchema', () => {
  describe('valid inputs', () => {
    it('should accept alphanumeric parcel ID', () => {
      const result = parcelIdSchema.safeParse('123-456-789')
      expect(result.success).toBe(true)
    })

    it('should accept parcel ID with hyphens', () => {
      const result = parcelIdSchema.safeParse('ABC-123-DEF')
      expect(result.success).toBe(true)
    })

    it('should accept parcel ID with underscores', () => {
      const result = parcelIdSchema.safeParse('ABC_123_DEF')
      expect(result.success).toBe(true)
    })

    it('should accept parcel ID with spaces', () => {
      const result = parcelIdSchema.safeParse('ABC 123 DEF')
      expect(result.success).toBe(true)
    })

    it('should accept parcel ID with periods', () => {
      const result = parcelIdSchema.safeParse('123.456.789')
      expect(result.success).toBe(true)
    })

    it('should trim whitespace', () => {
      const result = parcelIdSchema.safeParse('  123-456-789  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('123-456-789')
      }
    })
  })

  describe('path traversal attempts', () => {
    it('should reject ../ path traversal', () => {
      const result = parcelIdSchema.safeParse('../../../etc/passwd')
      expect(result.success).toBe(false)
    })

    it('should reject ./ path traversal', () => {
      const result = parcelIdSchema.safeParse('./local/file')
      expect(result.success).toBe(false)
    })

    it('should reject URL-encoded path traversal (..%2F)', () => {
      const result = parcelIdSchema.safeParse('..%2F..%2Fetc%2Fpasswd')
      expect(result.success).toBe(false)
    })

    it('should reject URL-encoded dots (%2E%2E)', () => {
      const result = parcelIdSchema.safeParse('%2E%2E%2Fetc%2Fpasswd')
      expect(result.success).toBe(false)
    })
  })

  describe('special characters', () => {
    it('should reject < character', () => {
      const result = parcelIdSchema.safeParse('123<456')
      expect(result.success).toBe(false)
    })

    it('should reject > character', () => {
      const result = parcelIdSchema.safeParse('123>456')
      expect(result.success).toBe(false)
    })

    it('should reject { character', () => {
      const result = parcelIdSchema.safeParse('123{456')
      expect(result.success).toBe(false)
    })

    it('should reject pipe character', () => {
      const result = parcelIdSchema.safeParse('123|456')
      expect(result.success).toBe(false)
    })
  })

  describe('SQL injection patterns', () => {
    it('should reject single quote', () => {
      const result = parcelIdSchema.safeParse("123' OR '1'='1")
      expect(result.success).toBe(false)
    })

    it('should reject SQL comment (--)', () => {
      const result = parcelIdSchema.safeParse('123-- DROP TABLE')
      expect(result.success).toBe(false)
    })

    it('should reject UNION keyword', () => {
      const result = parcelIdSchema.safeParse('123 UNION SELECT')
      expect(result.success).toBe(false)
    })

    it('should reject DROP keyword', () => {
      const result = parcelIdSchema.safeParse('123 DROP TABLE')
      expect(result.success).toBe(false)
    })
  })

  describe('XSS patterns', () => {
    it('should reject <script> tag', () => {
      const result = parcelIdSchema.safeParse('<script>alert(1)</script>')
      expect(result.success).toBe(false)
    })

    it('should reject javascript: protocol', () => {
      const result = parcelIdSchema.safeParse('javascript:alert(1)')
      expect(result.success).toBe(false)
    })

    it('should reject onclick event handler', () => {
      const result = parcelIdSchema.safeParse('onclick=alert(1)')
      expect(result.success).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should reject empty string', () => {
      const result = parcelIdSchema.safeParse('')
      expect(result.success).toBe(false)
    })

    it('should reject whitespace-only string', () => {
      const result = parcelIdSchema.safeParse('   ')
      expect(result.success).toBe(false)
    })

    it('should reject extremely long input (>100 chars)', () => {
      const longString = 'A'.repeat(101)
      const result = parcelIdSchema.safeParse(longString)
      expect(result.success).toBe(false)
    })

    it('should accept maximum length (100 chars)', () => {
      const maxString = 'A'.repeat(100)
      const result = parcelIdSchema.safeParse(maxString)
      expect(result.success).toBe(true)
    })
  })
})

// ============================================
// County Name Validation Tests
// ============================================

describe('countyNameSchema', () => {
  describe('valid inputs', () => {
    it('should accept simple county name', () => {
      const result = countyNameSchema.safeParse('Blair County')
      expect(result.success).toBe(true)
    })

    it('should accept county name with hyphen', () => {
      const result = countyNameSchema.safeParse('Winston-Salem')
      expect(result.success).toBe(true)
    })

    it('should accept county name with period (St.)', () => {
      const result = countyNameSchema.safeParse('St. Louis County')
      expect(result.success).toBe(true)
    })

    it('should accept county name with multiple spaces', () => {
      const result = countyNameSchema.safeParse('Los Angeles County')
      expect(result.success).toBe(true)
    })

    it('should trim whitespace', () => {
      const result = countyNameSchema.safeParse('  Blair County  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Blair County')
      }
    })
  })

  describe('path traversal attempts', () => {
    it('should reject ../ path traversal', () => {
      const result = countyNameSchema.safeParse('../../../etc/passwd')
      expect(result.success).toBe(false)
    })

    it('should reject ./ current directory', () => {
      const result = countyNameSchema.safeParse('./local')
      expect(result.success).toBe(false)
    })
  })

  describe('invalid characters', () => {
    it('should reject numbers', () => {
      const result = countyNameSchema.safeParse('County 123')
      expect(result.success).toBe(false)
    })

    it('should reject special characters', () => {
      const result = countyNameSchema.safeParse('County@Name')
      expect(result.success).toBe(false)
    })
  })

  describe('SQL injection patterns', () => {
    it('should reject SQL with quotes', () => {
      const result = countyNameSchema.safeParse("County' OR '1'='1")
      expect(result.success).toBe(false)
    })

    it('should reject SQL keywords', () => {
      const result = countyNameSchema.safeParse('County; DROP TABLE')
      expect(result.success).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should reject empty string', () => {
      const result = countyNameSchema.safeParse('')
      expect(result.success).toBe(false)
    })

    it('should reject whitespace-only', () => {
      const result = countyNameSchema.safeParse('   ')
      expect(result.success).toBe(false)
    })

    it('should reject extremely long input (>100 chars)', () => {
      const longString = 'A'.repeat(101)
      const result = countyNameSchema.safeParse(longString)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================
// State Code Validation Tests
// ============================================

describe('stateCodeSchema', () => {
  describe('valid state codes', () => {
    it('should accept PA (Pennsylvania)', () => {
      const result = stateCodeSchema.safeParse('PA')
      expect(result.success).toBe(true)
    })

    it('should accept CA (California)', () => {
      const result = stateCodeSchema.safeParse('CA')
      expect(result.success).toBe(true)
    })

    it('should accept lowercase and convert to uppercase', () => {
      const result = stateCodeSchema.safeParse('pa')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('PA')
      }
    })

    it('should accept DC (District of Columbia)', () => {
      const result = stateCodeSchema.safeParse('DC')
      expect(result.success).toBe(true)
    })

    it('should accept PR (Puerto Rico)', () => {
      const result = stateCodeSchema.safeParse('PR')
      expect(result.success).toBe(true)
    })

    it('should trim and convert whitespace-padded codes', () => {
      const result = stateCodeSchema.safeParse('  pa  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('PA')
      }
    })
  })

  describe('invalid state codes', () => {
    it('should reject invalid two-letter code', () => {
      const result = stateCodeSchema.safeParse('XX')
      expect(result.success).toBe(false)
    })

    it('should reject single character', () => {
      const result = stateCodeSchema.safeParse('P')
      expect(result.success).toBe(false)
    })

    it('should reject three characters', () => {
      const result = stateCodeSchema.safeParse('PAA')
      expect(result.success).toBe(false)
    })

    it('should reject numbers', () => {
      const result = stateCodeSchema.safeParse('12')
      expect(result.success).toBe(false)
    })

    it('should reject empty string', () => {
      const result = stateCodeSchema.safeParse('')
      expect(result.success).toBe(false)
    })
  })
})

// ============================================
// Property Address Validation Tests
// ============================================

describe('propertyAddressSchema', () => {
  describe('valid addresses', () => {
    it('should accept standard street address', () => {
      const result = propertyAddressSchema.safeParse('123 Main Street')
      expect(result.success).toBe(true)
    })

    it('should accept address with apartment number', () => {
      const result = propertyAddressSchema.safeParse('123 Main St #456')
      expect(result.success).toBe(true)
    })

    it('should accept address with periods and commas', () => {
      const result = propertyAddressSchema.safeParse('123 Main St., Apt. 4, Floor 2')
      expect(result.success).toBe(true)
    })

    it('should accept address with hyphens', () => {
      const result = propertyAddressSchema.safeParse('123-125 Main Street')
      expect(result.success).toBe(true)
    })

    it('should accept address with multiple word types', () => {
      const result = propertyAddressSchema.safeParse('123 North Main Street West')
      expect(result.success).toBe(true)
    })
  })

  describe('path traversal attempts', () => {
    it('should reject ../ path traversal', () => {
      const result = propertyAddressSchema.safeParse('../../../etc/passwd')
      expect(result.success).toBe(false)
    })
  })

  describe('SQL injection patterns', () => {
    it('should reject SQL with quotes', () => {
      const result = propertyAddressSchema.safeParse("123 Main' OR '1'='1")
      expect(result.success).toBe(false)
    })
  })

  describe('XSS patterns', () => {
    it('should reject <script> tag', () => {
      const result = propertyAddressSchema.safeParse('123 Main <script>alert(1)</script>')
      expect(result.success).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should reject empty string', () => {
      const result = propertyAddressSchema.safeParse('')
      expect(result.success).toBe(false)
    })

    it('should reject extremely long address (>200 chars)', () => {
      const longString = 'A'.repeat(201)
      const result = propertyAddressSchema.safeParse(longString)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================
// Property ID Validation Tests
// ============================================

describe('propertyIdSchema', () => {
  describe('valid UUIDs', () => {
    it('should accept valid UUID v4', () => {
      const result = propertyIdSchema.safeParse('123e4567-e89b-12d3-a456-426614174000')
      expect(result.success).toBe(true)
    })

    it('should accept another valid UUID', () => {
      const result = propertyIdSchema.safeParse('550e8400-e29b-41d4-a716-446655440000')
      expect(result.success).toBe(true)
    })
  })

  describe('invalid UUIDs', () => {
    it('should reject non-UUID string', () => {
      const result = propertyIdSchema.safeParse('not-a-uuid')
      expect(result.success).toBe(false)
    })

    it('should reject UUID with wrong format', () => {
      const result = propertyIdSchema.safeParse('123e4567-e89b-12d3-a456')
      expect(result.success).toBe(false)
    })

    it('should reject empty string', () => {
      const result = propertyIdSchema.safeParse('')
      expect(result.success).toBe(false)
    })

    it('should reject path traversal attempt', () => {
      const result = propertyIdSchema.safeParse('../../../etc/passwd')
      expect(result.success).toBe(false)
    })
  })
})

// ============================================
// Regrid URL Validation Tests
// ============================================

describe('regridUrlSchema', () => {
  describe('valid URLs', () => {
    it('should accept valid regrid.com URL', () => {
      const result = regridUrlSchema.safeParse('https://app.regrid.com/property/123')
      expect(result.success).toBe(true)
    })

    it('should accept regrid.com with subdomain', () => {
      const result = regridUrlSchema.safeParse('https://app.regrid.com/us/pa/blair/123')
      expect(result.success).toBe(true)
    })

    it('should accept base regrid.com domain', () => {
      const result = regridUrlSchema.safeParse('https://regrid.com')
      expect(result.success).toBe(true)
    })
  })

  describe('invalid URLs', () => {
    it('should reject non-HTTPS URL', () => {
      const result = regridUrlSchema.safeParse('http://app.regrid.com/property/123')
      expect(result.success).toBe(false)
    })

    it('should reject non-regrid.com domain', () => {
      const result = regridUrlSchema.safeParse('https://evil.com/property/123')
      expect(result.success).toBe(false)
    })

    it('should reject invalid URL format', () => {
      const result = regridUrlSchema.safeParse('not-a-url')
      expect(result.success).toBe(false)
    })

    it('should reject path traversal in URL', () => {
      const result = regridUrlSchema.safeParse('https://app.regrid.com/../../../etc/passwd')
      expect(result.success).toBe(false)
    })

    it('should reject empty string', () => {
      const result = regridUrlSchema.safeParse('')
      expect(result.success).toBe(false)
    })
  })
})

// ============================================
// Screenshot Request Schema Tests
// ============================================

describe('screenshotRequestSchema', () => {
  describe('valid requests', () => {
    it('should accept valid screenshot request with all fields', () => {
      const result = screenshotRequestSchema.safeParse({
        property_id: '123e4567-e89b-12d3-a456-426614174000',
        regrid_url: 'https://app.regrid.com/property/123',
        parcel_id: '123-456-789',
        property_address: '123 Main Street',
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid screenshot request with required fields only', () => {
      const result = screenshotRequestSchema.safeParse({
        property_id: '123e4567-e89b-12d3-a456-426614174000',
        regrid_url: 'https://app.regrid.com/property/123',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('invalid requests', () => {
    it('should reject missing property_id', () => {
      const result = screenshotRequestSchema.safeParse({
        regrid_url: 'https://app.regrid.com/property/123',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing regrid_url', () => {
      const result = screenshotRequestSchema.safeParse({
        property_id: '123e4567-e89b-12d3-a456-426614174000',
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid property_id', () => {
      const result = screenshotRequestSchema.safeParse({
        property_id: 'not-a-uuid',
        regrid_url: 'https://app.regrid.com/property/123',
      })
      expect(result.success).toBe(false)
    })

    it('should reject path traversal in parcel_id', () => {
      const result = screenshotRequestSchema.safeParse({
        property_id: '123e4567-e89b-12d3-a456-426614174000',
        regrid_url: 'https://app.regrid.com/property/123',
        parcel_id: '../../../etc/passwd',
      })
      expect(result.success).toBe(false)
    })
  })
})

// ============================================
// Regrid Request Schema Tests
// ============================================

describe('regridRequestSchema', () => {
  describe('valid requests', () => {
    it('should accept valid regrid request with all fields', () => {
      const result = regridRequestSchema.safeParse({
        property_id: '123e4567-e89b-12d3-a456-426614174000',
        parcel_id: '123-456-789',
        county: 'Blair County',
        state: 'PA',
        address: '123 Main Street',
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid regrid request without optional address', () => {
      const result = regridRequestSchema.safeParse({
        property_id: '123e4567-e89b-12d3-a456-426614174000',
        parcel_id: '123-456-789',
        county: 'Blair County',
        state: 'PA',
      })
      expect(result.success).toBe(true)
    })

    it('should convert state to uppercase', () => {
      const result = regridRequestSchema.safeParse({
        property_id: '123e4567-e89b-12d3-a456-426614174000',
        parcel_id: '123-456-789',
        county: 'Blair County',
        state: 'pa',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.state).toBe('PA')
      }
    })
  })

  describe('invalid requests', () => {
    it('should reject missing required fields', () => {
      const result = regridRequestSchema.safeParse({
        property_id: '123e4567-e89b-12d3-a456-426614174000',
      })
      expect(result.success).toBe(false)
    })

    it('should reject path traversal in parcel_id', () => {
      const result = regridRequestSchema.safeParse({
        property_id: '123e4567-e89b-12d3-a456-426614174000',
        parcel_id: '../../../etc/passwd',
        county: 'Blair County',
        state: 'PA',
      })
      expect(result.success).toBe(false)
    })

    it('should reject path traversal in county', () => {
      const result = regridRequestSchema.safeParse({
        property_id: '123e4567-e89b-12d3-a456-426614174000',
        parcel_id: '123-456-789',
        county: '../../../etc/passwd',
        state: 'PA',
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid state code', () => {
      const result = regridRequestSchema.safeParse({
        property_id: '123e4567-e89b-12d3-a456-426614174000',
        parcel_id: '123-456-789',
        county: 'Blair County',
        state: 'XX',
      })
      expect(result.success).toBe(false)
    })

    it('should reject SQL injection in county', () => {
      const result = regridRequestSchema.safeParse({
        property_id: '123e4567-e89b-12d3-a456-426614174000',
        parcel_id: '123-456-789',
        county: "Blair' OR '1'='1",
        state: 'PA',
      })
      expect(result.success).toBe(false)
    })
  })
})

// ============================================
// Safe Validate Helper Tests
// ============================================

describe('safeValidate', () => {
  describe('successful validation', () => {
    it('should return success with parsed data', () => {
      const result = safeValidate(parcelIdSchema, '123-456-789')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('123-456-789')
      }
    })

    it('should handle state code transformation', () => {
      const result = safeValidate(stateCodeSchema, 'pa')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('PA')
      }
    })
  })

  describe('validation failure', () => {
    it('should return error with message', () => {
      const result = safeValidate(parcelIdSchema, '')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(result.error.length).toBeGreaterThan(0)
        expect(result.details).toBeDefined()
      }
    })

    it('should provide detailed error for path traversal', () => {
      const result = safeValidate(parcelIdSchema, '../../../etc/passwd')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('path traversal')
      }
    })

    it('should provide detailed error for invalid UUID', () => {
      const result = safeValidate(propertyIdSchema, 'not-a-uuid')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('UUID')
      }
    })
  })

  describe('complex schema validation', () => {
    it('should validate complex object and return formatted errors', () => {
      const result = safeValidate(regridRequestSchema, {
        property_id: 'invalid-uuid',
        parcel_id: '../../../etc',
        county: 123,
        state: 'INVALID',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(result.details.errors.length).toBeGreaterThan(0)
      }
    })
  })
})

// ============================================
// Security Regression Tests
// ============================================

describe('security regression tests', () => {
  describe('common attack vectors', () => {
    const attackVectors = [
      { name: 'basic path traversal', value: '../../../etc/passwd' },
      { name: 'encoded path traversal', value: '..%2F..%2Fetc%2Fpasswd' },
      { name: 'double encoded', value: '%252e%252e%252fetc%252fpasswd' },
      { name: 'null byte injection', value: 'test\x00.txt' },
      { name: 'SQL injection with quotes', value: "1' OR '1'='1" },
      { name: 'SQL injection with comment', value: '1-- DROP TABLE' },
      { name: 'XSS script tag', value: '<script>alert(1)</script>' },
      { name: 'XSS javascript protocol', value: 'javascript:alert(1)' },
      { name: 'XSS event handler', value: 'test" onclick="alert(1)"' },
    ]

    attackVectors.forEach(({ name, value }) => {
      it(`should block ${name}`, () => {
        const result = parcelIdSchema.safeParse(value)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('URL-specific attacks', () => {
    it('should block open redirect attempt', () => {
      const result = regridUrlSchema.safeParse('https://app.regrid.com@evil.com')
      expect(result.success).toBe(false)
    })

    it('should block protocol confusion', () => {
      const result = regridUrlSchema.safeParse('javascript://app.regrid.com/%0Aalert(1)')
      expect(result.success).toBe(false)
    })
  })
})
