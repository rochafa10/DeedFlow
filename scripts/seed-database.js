#!/usr/bin/env node

/**
 * Seed Database Script
 * Adds initial data to the Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Seed States
    console.log('Adding states...');
    const states = [
      { code: 'FL', name: 'Florida', auction_type: 'Tax Deed', is_active: true },
      { code: 'TX', name: 'Texas', auction_type: 'Tax Deed', is_active: true },
      { code: 'GA', name: 'Georgia', auction_type: 'Tax Deed', is_active: true },
      { code: 'CA', name: 'California', auction_type: 'Tax Deed', is_active: true },
      { code: 'AZ', name: 'Arizona', auction_type: 'Tax Lien', is_active: true },
      { code: 'CO', name: 'Colorado', auction_type: 'Tax Lien', is_active: true },
    ];

    for (const state of states) {
      const { error } = await supabase
        .from('states')
        .upsert(state, { onConflict: 'code' });
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`Error adding state ${state.code}:`, error.message);
      }
    }
    console.log('✓ States added');

    // 2. Seed Counties
    console.log('Adding counties...');
    const { data: floridaState } = await supabase
      .from('states')
      .select('id')
      .eq('code', 'FL')
      .single();

    if (floridaState) {
      const counties = [
        { state_id: floridaState.id, name: 'Miami-Dade', state_code: 'FL', is_active: true },
        { state_id: floridaState.id, name: 'Broward', state_code: 'FL', is_active: true },
        { state_id: floridaState.id, name: 'Palm Beach', state_code: 'FL', is_active: true },
        { state_id: floridaState.id, name: 'Orange', state_code: 'FL', is_active: true },
      ];

      for (const county of counties) {
        const { error } = await supabase
          .from('counties')
          .upsert(county, { onConflict: 'state_id,name' });
        
        if (error && !error.message.includes('duplicate')) {
          console.error(`Error adding county ${county.name}:`, error.message);
        }
      }
    }
    console.log('✓ Counties added');

    // 3. Seed Sample Properties
    console.log('Adding sample properties...');
    
    const { data: miamidadeCounty } = await supabase
      .from('counties')
      .select('id')
      .eq('name', 'Miami-Dade')
      .eq('state_code', 'FL')
      .single();

    if (miamidadeCounty) {
      const properties = [
        {
          parcel_number: '25-45-001-000',
          county_id: miamidadeCounty.id,
          address: '123 Main St, Miami, FL 33101',
          city: 'Miami',
          state: 'FL',
          zip_code: '33101',
          property_type: 'Single Family Residential',
          year_built: 1985,
          living_area: 1200,
          acres: 0.25,
          bedrooms: 3,
          bathrooms: 2,
          amount_due: 5420,
          minimum_bid: 100,
          classification: 'A',
          score: 85,
          sale_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        {
          parcel_number: '25-45-002-000',
          county_id: miamidadeCounty.id,
          address: '456 Oak Ave, Miami, FL 33102',
          city: 'Miami',
          state: 'FL',
          zip_code: '33102',
          property_type: 'Single Family Residential',
          year_built: 1992,
          living_area: 1800,
          acres: 0.35,
          bedrooms: 4,
          bathrooms: 2.5,
          amount_due: 8750,
          minimum_bid: 100,
          classification: 'B',
          score: 65,
          sale_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        {
          parcel_number: '25-45-003-000',
          county_id: miamidadeCounty.id,
          address: '789 Pine St, Miami, FL 33103',
          city: 'Miami',
          state: 'FL',
          zip_code: '33103',
          property_type: 'Vacant Land',
          acres: 0.5,
          amount_due: 12500,
          minimum_bid: 100,
          classification: 'A',
          score: 92,
          sale_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ];

      for (const property of properties) {
        const { data, error } = await supabase
          .from('properties')
          .upsert(property, { onConflict: 'parcel_number,county_id' })
          .select()
          .single();
        
        if (error && !error.message.includes('duplicate')) {
          console.error(`Error adding property ${property.parcel_number}:`, error.message);
        } else if (data) {
          // Add valuation for the property
          await supabase
            .from('property_valuations')
            .upsert({
              property_id: data.id,
              market_value: property.amount_due * 8,
              arv_estimate: property.amount_due * 10,
              estimated_rent_min: 1500,
              estimated_rent_max: 2500,
            }, { onConflict: 'property_id' });
        }
      }
    }
    console.log('✓ Sample properties added');

    // 4. Seed Sample Auction
    console.log('Adding sample auction...');
    if (miamidadeCounty) {
      const auction = {
        county_id: miamidadeCounty.id,
        auction_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        auction_time: '10:00:00',
        auction_type: 'Tax Deed',
        location: 'Miami-Dade County Courthouse',
        is_online: false,
        registration_deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        deposit_required: 5000,
        minimum_bid_increment: 100,
        total_properties: 125,
        status: 'upcoming',
      };

      const { error } = await supabase
        .from('auctions')
        .insert(auction);
      
      if (error && !error.message.includes('duplicate')) {
        console.error('Error adding auction:', error.message);
      }
    }
    console.log('✓ Sample auction added');

    console.log('\n✅ Database seeded successfully!');
    console.log('You can now use the application with sample data.');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run the seed
seedDatabase();