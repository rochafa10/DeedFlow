import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      propertyId,
      address,
      parcelNumber,
      county,
      state,
      minimumBid 
    } = body;

    if (!parcelNumber && !propertyId) {
      return NextResponse.json(
        { error: 'Property ID or Parcel Number is required' },
        { status: 400 }
      );
    }

    // If propertyId provided, fetch property details
    let propertyData = body;
    if (propertyId && !address) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();
      
      if (data) {
        propertyData = {
          ...data,
          propertyId: data.id,
        };
      }
    }

    // Trigger AI research agent workflow
    const response = await fetch(`${N8N_WEBHOOK_URL}/ai-research-property`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(propertyData),
    });

    if (!response.ok) {
      throw new Error(`Research workflow failed: ${response.statusText}`);
    }

    const researchResult = await response.json();

    // Store research report
    const supabase = createClient();
    const { data: reportData, error: reportError } = await supabase
      .from('ai_research_reports')
      .insert({
        property_id: propertyId || null,
        parcel_number: parcelNumber,
        research_type: 'comprehensive',
        report_data: researchResult,
        confidence_score: researchResult.recommendations?.confidence || 0.8,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (reportError) {
      console.error('Failed to store research report:', reportError);
    }

    return NextResponse.json({
      success: true,
      research: researchResult,
      reportId: reportData?.id,
      marketAnalysis: researchResult.marketAnalysis,
      recommendations: researchResult.recommendations,
      riskAssessment: researchResult.riskAssessment,
    });
  } catch (error) {
    console.error('AI research error:', error);
    return NextResponse.json(
      { error: 'Failed to research property' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('propertyId');
  const parcelNumber = searchParams.get('parcelNumber');

  if (!propertyId && !parcelNumber) {
    return NextResponse.json(
      { error: 'Property ID or Parcel Number is required' },
      { status: 400 }
    );
  }

  const supabase = createClient();
  
  let query = supabase
    .from('ai_research_reports')
    .select('*');

  if (propertyId) {
    query = query.eq('property_id', propertyId);
  } else if (parcelNumber) {
    query = query.eq('parcel_number', parcelNumber);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Research report not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}