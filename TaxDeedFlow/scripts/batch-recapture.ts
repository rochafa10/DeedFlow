#!/usr/bin/env npx ts-node
/**
 * Batch Re-capture Script
 * 
 * Re-captures screenshots and extracts Regrid data for all properties
 * that have screenshots but are missing data fields.
 * 
 * Usage:
 *   cd TaxDeedFlow
 *   npx ts-node scripts/batch-recapture.ts
 * 
 * Or with npm:
 *   npm run batch-recapture
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://oiiwlzobizftprqspbzt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg'
const LOCAL_API_URL = 'http://localhost:3000/api/scrape/screenshot'

// Delay between requests to avoid overwhelming the server
const DELAY_MS = 5000

interface Property {
  id: string
  parcel_id: string
  address: string | null
  county_name: string | null
  state_code: string | null
}

interface RegridData {
  property_id: string
  screenshot_url: string | null
  lot_size_acres: number | null
  assessed_value: number | null
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getPropertiesNeedingData(): Promise<Property[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // Get properties that have screenshots but missing key data fields
  const { data, error } = await supabase
    .from('properties')
    .select(`
      id,
      parcel_id,
      address,
      county:counties(name),
      state
    `)
    .eq('has_screenshot', true)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching properties:', error)
    return []
  }
  
  // Get regrid_data for these properties
  const propertyIds = data?.map(p => p.id) || []
  const { data: regridData, error: regridError } = await supabase
    .from('regrid_data')
    .select('property_id, screenshot_url, lot_size_acres, assessed_value')
    .in('property_id', propertyIds)
  
  if (regridError) {
    console.error('Error fetching regrid_data:', regridError)
    return []
  }
  
  // Create a map of regrid_data by property_id
  const regridMap = new Map<string, RegridData>()
  regridData?.forEach(rd => regridMap.set(rd.property_id, rd))
  
  // Filter to properties missing data
  const propertiesNeedingData = data?.filter(p => {
    const rd = regridMap.get(p.id)
    // Need re-capture if no regrid_data or missing key fields
    return !rd || (rd.lot_size_acres === null && rd.assessed_value === null)
  }) || []
  
  return propertiesNeedingData.map(p => ({
    id: p.id,
    parcel_id: p.parcel_id,
    address: p.address,
    county_name: (p.county as any)?.name || null,
    state_code: p.state || 'PA'
  }))
}

async function recaptureProperty(property: Property): Promise<boolean> {
  try {
    console.log(`\n📸 Capturing: ${property.parcel_id}`)
    console.log(`   Address: ${property.address || 'N/A'}`)
    console.log(`   County: ${property.county_name || 'Unknown'}, ${property.state_code}`)
    
    const response = await fetch(LOCAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        property_id: property.id,
        regrid_url: 'https://app.regrid.com',
        parcel_id: property.parcel_id,
        property_address: property.address,
        county: property.county_name,
        state: property.state_code,
      }),
    })
    
    const result = await response.json()
    
    if (result.success || result.screenshot_url) {
      console.log(`   ✅ Success! Screenshot: ${result.screenshot_url}`)
      return true
    } else {
      console.log(`   ❌ Failed: ${result.error || 'Unknown error'}`)
      return false
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return false
  }
}

async function main() {
  console.log('🔍 Finding properties that need data extraction...\n')
  
  const properties = await getPropertiesNeedingData()
  
  if (properties.length === 0) {
    console.log('✨ All properties have complete data!')
    return
  }
  
  console.log(`Found ${properties.length} properties needing re-capture:\n`)
  properties.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.parcel_id} - ${p.address || 'No address'}`)
  })
  
  console.log('\n' + '='.repeat(60))
  console.log('Starting batch re-capture...')
  console.log('='.repeat(60))
  
  let successful = 0
  let failed = 0
  
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i]
    console.log(`\n[${i + 1}/${properties.length}]`)
    
    const success = await recaptureProperty(property)
    if (success) {
      successful++
    } else {
      failed++
    }
    
    // Wait between requests
    if (i < properties.length - 1) {
      console.log(`   ⏳ Waiting ${DELAY_MS / 1000}s before next capture...`)
      await sleep(DELAY_MS)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('Batch re-capture complete!')
  console.log('='.repeat(60))
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📊 Total: ${properties.length}`)
}

main().catch(console.error)
