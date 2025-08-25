import { NextRequest, NextResponse } from 'next/server';
import { WebhookResponse } from '@/lib/types';

const N8N_COUNTY_ENRICHMENT_WEBHOOK = process.env.N8N_COUNTY_ENRICHMENT_WEBHOOK || 'http://localhost:5678/webhook/county-enrichment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const { stateCode, forceUpdate } = body;
    
    if (stateCode && !/^[A-Z]{2}$/.test(stateCode)) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Invalid state code format. Use 2-letter state code (e.g., "FL", "TX")',
          run_id: crypto.randomUUID(),
        },
        { status: 400 }
      );
    }

    // Prepare webhook payload
    const webhookPayload = {
      ...body,
      run_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source: 'tax-deed-platform-api',
      options: {
        stateCode: stateCode || 'all',
        forceUpdate: forceUpdate || false,
        updateThreshold: 30 // days
      }
    };

    console.log('Triggering county enrichment for:', webhookPayload);

    // Call n8n webhook
    const response = await fetch(N8N_COUNTY_ENRICHMENT_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      throw new Error(`County enrichment failed: ${response.statusText}`);
    }

    const data: WebhookResponse = await response.json();
    
    return NextResponse.json({
      status: 'success',
      message: 'County enrichment workflow triggered successfully',
      run_id: webhookPayload.run_id,
      data: data,
      timestamp: webhookPayload.timestamp
    });

  } catch (error) {
    console.error('County enrichment error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'County enrichment failed',
        run_id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stateCode = searchParams.get('state');
    
    // Return information about the county enrichment process
    return NextResponse.json({
      status: 'success',
      message: 'County Business Patterns Enrichment API',
      description: 'Enriches counties table with business and economic data from Census Bureau',
      data_source: 'Census Bureau County Business Patterns 2023',
      api_endpoint: 'https://api.census.gov/data/2023/cbp',
      webhook_url: N8N_COUNTY_ENRICHMENT_WEBHOOK,
      usage: {
        method: 'POST',
        body: {
          stateCode: 'optional - 2-letter state code (e.g., "FL")',
          forceUpdate: 'optional - boolean to force update regardless of last update time'
        },
        example: {
          stateCode: 'FL',
          forceUpdate: false
        }
      },
      fields_added: [
        'business_establishments',
        'business_employees', 
        'business_payroll',
        'top_industries',
        'economic_health_score',
        'business_data_updated_at'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('County enrichment info error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to get API information',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
