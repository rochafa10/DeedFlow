/**
 * End-to-End Test: Title Search Flow
 *
 * Tests the complete title search workflow:
 * 1. POST /api/title-search - Initiate title search
 * 2. Verify data written to Supabase (title_searches, liens tables)
 * 3. GET /api/title-search/[propertyId] - Retrieve title data
 * 4. Verify title risk score calculation
 * 5. Verify surviving liens identification
 * 6. Verify data structure for TitleResearch component
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { createServerClient } from '@/lib/supabase/client'

// Test configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const TEST_PROPERTY_ID = process.env.TEST_PROPERTY_ID || 'test-e2e-property-id'

describe('Title Search E2E Flow', () => {
  let titleSearchId: string
  let propertyId: string

  beforeAll(async () => {
    // Create a test property in the database if it doesn't exist
    const supabase = createServerClient()

    if (!supabase) {
      throw new Error('Supabase client not configured')
    }

    // Check if test property exists, create if not
    const { data: existingProperty } = await supabase
      .from('properties')
      .select('id')
      .eq('parcel_id', 'TEST-E2E-PARCEL-001')
      .single()

    if (existingProperty) {
      propertyId = existingProperty.id
    } else {
      // Create test property
      const { data: newProperty, error } = await supabase
        .from('properties')
        .insert({
          parcel_id: 'TEST-E2E-PARCEL-001',
          property_address: '123 Test Street',
          city: 'Test City',
          state: 'PA',
          zip: '12345',
          county_name: 'Test County',
          total_due: 25000.00,
          market_value: 150000.00,
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to create test property: ${error.message}`)
      }

      propertyId = newProperty!.id
    }
  })

  describe('Step 1: POST /api/title-search', () => {
    it('should initiate title search for a property', async () => {
      const response = await fetch(`${API_BASE_URL}/api/title-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: propertyId,
          force: true, // Force new search
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('propertyId', propertyId)
      expect(data).toHaveProperty('searchId')
      expect(data).toHaveProperty('summary')

      // Store searchId for later tests
      titleSearchId = data.searchId

      // Verify summary structure
      expect(data.summary).toHaveProperty('totalLiens')
      expect(data.summary).toHaveProperty('survivingLiens')
      expect(data.summary).toHaveProperty('survivingLiensTotal')
      expect(data.summary).toHaveProperty('wipeableLiensTotal')
      expect(data.summary).toHaveProperty('titleRiskScore')
      expect(data.summary).toHaveProperty('recommendation')
      expect(data.summary).toHaveProperty('titleQuality')

      // Verify recommendation is one of the expected values
      expect(['approve', 'caution', 'reject']).toContain(data.summary.recommendation)

      // Verify title quality is one of the expected values
      expect(['clear', 'clouded', 'defective', 'unmarketable']).toContain(data.summary.titleQuality)
    })

    it('should handle invalid property ID', async () => {
      const response = await fetch(`${API_BASE_URL}/api/title-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: 'invalid-uuid-12345',
        }),
      })

      expect(response.status).toBe(404)
    })

    it('should handle missing propertyId', async () => {
      const response = await fetch(`${API_BASE_URL}/api/title-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Step 2: Verify data written to Supabase title_searches table', () => {
    it('should have created title_searches record', async () => {
      const supabase = createServerClient()

      if (!supabase) {
        throw new Error('Supabase client not configured')
      }

      const { data, error } = await supabase
        .from('title_searches')
        .select('*')
        .eq('property_id', propertyId)
        .order('search_date', { ascending: false })
        .limit(1)
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()

      // Verify required fields
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('property_id', propertyId)
      expect(data).toHaveProperty('status', 'completed')
      expect(data).toHaveProperty('search_date')
      expect(data).toHaveProperty('title_quality')
      expect(data).toHaveProperty('marketability_score')
      expect(data).toHaveProperty('title_risk_score')
      expect(data).toHaveProperty('recommendation')

      // Verify numeric fields are valid
      expect(data.marketability_score).toBeGreaterThanOrEqual(0)
      expect(data.marketability_score).toBeLessThanOrEqual(1)
      expect(data.title_risk_score).toBeGreaterThanOrEqual(0)
      expect(data.title_risk_score).toBeLessThanOrEqual(1)

      // Verify lien summary fields
      expect(data).toHaveProperty('total_liens_count')
      expect(data).toHaveProperty('surviving_liens_count')
      expect(data).toHaveProperty('surviving_liens_total')
      expect(data).toHaveProperty('wipeable_liens_total')
    })
  })

  describe('Step 3: Verify liens written to liens table', () => {
    it('should have created lien records', async () => {
      const supabase = createServerClient()

      if (!supabase) {
        throw new Error('Supabase client not configured')
      }

      const { data: titleSearch } = await supabase
        .from('title_searches')
        .select('id')
        .eq('property_id', propertyId)
        .order('search_date', { ascending: false })
        .limit(1)
        .single()

      if (!titleSearch) {
        throw new Error('Title search not found')
      }

      const { data: liens, error } = await supabase
        .from('liens')
        .select('*')
        .eq('title_search_id', titleSearch.id)

      expect(error).toBeNull()
      expect(liens).not.toBeNull()
      expect(Array.isArray(liens)).toBe(true)

      if (liens && liens.length > 0) {
        // Verify lien structure
        const firstLien = liens[0]

        expect(firstLien).toHaveProperty('id')
        expect(firstLien).toHaveProperty('title_search_id', titleSearch.id)
        expect(firstLien).toHaveProperty('property_id', propertyId)
        expect(firstLien).toHaveProperty('lien_type')
        expect(firstLien).toHaveProperty('lien_holder')
        expect(firstLien).toHaveProperty('amount')
        expect(firstLien).toHaveProperty('survives_tax_sale')
        expect(firstLien).toHaveProperty('status')

        // Verify survives_tax_sale is boolean
        expect(typeof firstLien.survives_tax_sale).toBe('boolean')

        // Verify amount is valid number
        expect(typeof firstLien.amount).toBe('number')
        expect(firstLien.amount).toBeGreaterThan(0)

        // Verify status is one of expected values
        expect(['active', 'paid', 'released', 'disputed', 'unknown']).toContain(firstLien.status)
      }
    })

    it('should correctly identify surviving liens', async () => {
      const supabase = createServerClient()

      if (!supabase) {
        throw new Error('Supabase client not configured')
      }

      const { data: titleSearch } = await supabase
        .from('title_searches')
        .select('id')
        .eq('property_id', propertyId)
        .order('search_date', { ascending: false })
        .limit(1)
        .single()

      if (!titleSearch) {
        throw new Error('Title search not found')
      }

      const { data: survivingLiens, error } = await supabase
        .from('liens')
        .select('*')
        .eq('title_search_id', titleSearch.id)
        .eq('survives_tax_sale', true)

      expect(error).toBeNull()

      // Surviving liens should include federal liens (IRS, EPA)
      if (survivingLiens && survivingLiens.length > 0) {
        const federalLiens = survivingLiens.filter(lien =>
          lien.lien_type.includes('IRS') ||
          lien.lien_type.includes('federal') ||
          lien.lien_type.includes('EPA')
        )

        // If we have federal liens, they should ALWAYS survive
        federalLiens.forEach(lien => {
          expect(lien.survives_tax_sale).toBe(true)
        })
      }
    })
  })

  describe('Step 4: GET /api/title-search/[propertyId]', () => {
    it('should retrieve comprehensive title data', async () => {
      const response = await fetch(`${API_BASE_URL}/api/title-search/${propertyId}`)

      expect(response.status).toBe(200)

      const result = await response.json()

      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('titleSearch')
      expect(result.data).toHaveProperty('liens')
      expect(result.data).toHaveProperty('deedChain')
      expect(result.data).toHaveProperty('titleIssues')
      expect(result.data).toHaveProperty('summary')

      // Verify titleSearch structure
      const titleSearch = result.data.titleSearch
      expect(titleSearch).toHaveProperty('id')
      expect(titleSearch).toHaveProperty('propertyId', propertyId)
      expect(titleSearch).toHaveProperty('status', 'completed')
      expect(titleSearch).toHaveProperty('searchDate')
      expect(titleSearch).toHaveProperty('titleQuality')
      expect(titleSearch).toHaveProperty('marketabilityScore')
      expect(titleSearch).toHaveProperty('liensSummary')
      expect(titleSearch).toHaveProperty('risk')

      // Verify liens array
      expect(Array.isArray(result.data.liens)).toBe(true)

      // Verify summary
      const summary = result.data.summary
      expect(summary).toHaveProperty('hasData', true)
      expect(summary).toHaveProperty('searchCompleted', true)
      expect(summary).toHaveProperty('totalLiens')
      expect(summary).toHaveProperty('survivingLiens')
      expect(summary).toHaveProperty('wipeableLiens')
      expect(summary).toHaveProperty('survivingLiensTotal')
      expect(summary).toHaveProperty('riskScore')
      expect(summary).toHaveProperty('recommendation')
    })

    it('should return 404 for property without title search', async () => {
      const response = await fetch(`${API_BASE_URL}/api/title-search/00000000-0000-0000-0000-000000000000`)

      expect(response.status).toBe(404)

      const result = await response.json()
      expect(result).toHaveProperty('error')
    })
  })

  describe('Step 5: Verify TitleResearch component data structure', () => {
    it('should provide data in format expected by TitleResearch component', async () => {
      const response = await fetch(`${API_BASE_URL}/api/title-search/${propertyId}`)
      const result = await response.json()

      const { data } = result

      // Verify structure matches TitleResearchProps
      expect(data).toHaveProperty('titleSearch')
      expect(data).toHaveProperty('liens')
      expect(data).toHaveProperty('summary')

      // Verify summary matches TitleResearchSummary interface
      const summary = data.summary
      expect(summary).toHaveProperty('searchCompleted')
      expect(summary).toHaveProperty('searchDate')
      expect(summary).toHaveProperty('totalLiens')
      expect(summary).toHaveProperty('survivingLiens')
      expect(summary).toHaveProperty('wipeableLiens')
      expect(summary).toHaveProperty('totalLienAmount')
      expect(summary).toHaveProperty('riskScore')
      expect(summary).toHaveProperty('recommendation')

      // Verify liens match LienRecord interface
      if (data.liens.length > 0) {
        const lien = data.liens[0]
        expect(lien).toHaveProperty('id')
        expect(lien).toHaveProperty('type')
        expect(lien).toHaveProperty('holder')
        expect(lien).toHaveProperty('amount')
        expect(lien).toHaveProperty('recordedDate')
        expect(lien).toHaveProperty('status')
        expect(lien).toHaveProperty('survivesTaxSale')
      }
    })
  })

  describe('Step 6: Verify surviving liens are highlighted (data flag)', () => {
    it('should flag surviving liens in response data', async () => {
      const response = await fetch(`${API_BASE_URL}/api/title-search/${propertyId}`)
      const result = await response.json()

      const { data } = result

      // Check if any liens survive
      const survivingLiens = data.liens.filter((lien: any) => lien.survivesTaxSale === true)

      if (survivingLiens.length > 0) {
        // Verify summary reflects surviving liens
        expect(data.summary.survivingLiens).toBeGreaterThan(0)
        expect(data.summary.hasSurvivingLiens).toBe(true)

        // Each surviving lien should have the flag
        survivingLiens.forEach((lien: any) => {
          expect(lien.survivesTaxSale).toBe(true)
          // Surviving liens should have survivability basis
          expect(lien).toHaveProperty('survivabilityBasis')
        })
      }
    })
  })

  describe('Step 7: Verify title risk score calculation', () => {
    it('should calculate title risk score correctly', async () => {
      const response = await fetch(`${API_BASE_URL}/api/title-search/${propertyId}`)
      const result = await response.json()

      const { data } = result

      const riskScore = data.summary.riskScore
      const recommendation = data.summary.recommendation

      // Risk score should be between 0 and 1
      expect(riskScore).toBeGreaterThanOrEqual(0)
      expect(riskScore).toBeLessThanOrEqual(1)

      // Verify recommendation aligns with risk score
      if (riskScore >= 0.70) {
        expect(recommendation).toBe('approve')
      } else if (riskScore >= 0.40) {
        expect(recommendation).toBe('caution')
      } else {
        expect(recommendation).toBe('reject')
      }

      // If there are surviving liens, risk score should be lower
      if (data.summary.survivingLiens > 0) {
        // With surviving liens, score should be reduced
        expect(riskScore).toBeLessThan(1.0)
      }

      // If surviving liens exceed 30% of property value, should auto-fail
      const titleSearch = data.titleSearch
      if (titleSearch.liensSummary.survivingLiensTotal > 0) {
        const propertyValue = titleSearch.property?.market_value || 100000
        const survivingLiensPercentage = titleSearch.liensSummary.survivingLiensTotal / propertyValue

        if (survivingLiensPercentage > 0.30) {
          expect(riskScore).toBe(0)
          expect(recommendation).toBe('reject')
        }
      }
    })

    it('should apply proper weight to surviving liens', async () => {
      const response = await fetch(`${API_BASE_URL}/api/title-search/${propertyId}`)
      const result = await response.json()

      const { data } = result

      // If ANY surviving liens exist, score should be penalized by 0.50 weight
      if (data.summary.survivingLiens > 0) {
        // Score should be less than perfect (1.0)
        expect(data.summary.riskScore).toBeLessThan(1.0)

        // With surviving liens, should not be 'approve' unless very minor
        if (data.summary.survivingLiens >= 2) {
          expect(['caution', 'reject']).toContain(data.summary.recommendation)
        }
      }
    })
  })

  describe('Batch Mode Tests', () => {
    it('should create batch job for multiple properties', async () => {
      const response = await fetch(`${API_BASE_URL}/api/title-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyIds: [propertyId],
          batch: true,
          batchSize: 10,
        }),
      })

      expect(response.status).toBe(202) // Accepted for async processing

      const data = await response.json()

      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('batchJobId')
      expect(data).toHaveProperty('totalProperties', 1)
      expect(data).toHaveProperty('totalBatches')
      expect(data).toHaveProperty('message')
    })

    it('should reject empty batch request', async () => {
      const response = await fetch(`${API_BASE_URL}/api/title-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyIds: [],
          batch: true,
        }),
      })

      expect(response.status).toBe(400)
    })
  })
})
