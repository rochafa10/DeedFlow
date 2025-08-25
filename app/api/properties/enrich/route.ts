import { NextRequest, NextResponse } from 'next/server';
import { PropertyEnrichment, WebhookResponse } from '@/lib/types';
import { PropertyService } from '@/lib/services/property.service';
import { supabase } from '@/lib/supabase';

const N8N_ENRICHMENT_WEBHOOK = process.env.N8N_ENRICHMENT_WEBHOOK || 'http://localhost:5678/webhook/FeFSVjsO91L2hEkL/property-enrichment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, parcelNumber, county, state, address } = body;
    
    // First, check if property exists in database
    let dbPropertyId = propertyId;
    
    if (!dbPropertyId) {
      // Create property in database if it doesn't exist
      const { data: existingProperty } = await supabase
        .from('properties')
        .select('id')
        .eq('parcel_number', parcelNumber)
        .single();
      
      if (existingProperty) {
        dbPropertyId = existingProperty.id;
      } else {
        // Create new property
        const { data: newProperty, error: createError } = await PropertyService.createProperty({
          parcel_number: parcelNumber,
          address: address || `${parcelNumber}, ${county}, ${state}`,
          city: county,
          state: state,
          amount_due: body.amountDue || 0,
        });
        
        if (createError) {
          console.error('Failed to create property:', createError);
        } else if (newProperty) {
          dbPropertyId = newProperty.id;
        }
      }
    }
    
    // Try to call n8n webhook for enrichment
    try {
      const response = await fetch(N8N_ENRICHMENT_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          propertyId: dbPropertyId,
          run_id: crypto.randomUUID(),
        }),
      });

      if (response.ok) {
        const data: WebhookResponse<PropertyEnrichment> = await response.json();
        
        // Save enrichment data to database
        if (data.data && dbPropertyId) {
          await PropertyService.enrichProperty(dbPropertyId, data.data);
        }
        
        return NextResponse.json({
          ...data,
          propertyId: dbPropertyId,
        });
      }
    } catch (webhookError) {
      console.log('n8n webhook not available, using demo data');
    }
    
    // If n8n fails, generate demo enrichment data
    const demoEnrichmentData = {
      propertyId: dbPropertyId,
      yearBuilt: 2024 - Math.floor(Math.random() * 50),
      livingArea: Math.floor(Math.random() * 2000) + 1000,
      bedrooms: Math.floor(Math.random() * 4) + 1,
      bathrooms: Math.floor(Math.random() * 3) + 1,
      score: Math.floor(Math.random() * 40) + 60,
      classification: ['A', 'B', 'C'][Math.floor(Math.random() * 3)] as 'A' | 'B' | 'C',
      valuation: {
        market_value: (body.amountDue || 10000) * (Math.random() * 3 + 5),
        arv_estimate: (body.amountDue || 10000) * (Math.random() * 4 + 6),
        estimated_rent_min: Math.floor(Math.random() * 1000) + 1000,
        estimated_rent_max: Math.floor(Math.random() * 1000) + 1500,
      },
      run_id: crypto.randomUUID(),
    };
    
    // Save demo data to database
    if (dbPropertyId) {
      await PropertyService.enrichProperty(dbPropertyId, demoEnrichmentData);
    }
    
    return NextResponse.json({
      status: 'ok',
      data: demoEnrichmentData,
      propertyId: dbPropertyId,
      message: 'Property enriched with demo data',
    });
    
  } catch (error) {
    console.error('Enrichment error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Enrichment failed',
        run_id: crypto.randomUUID(),
      },
      { status: 500 }
    );
  }
}