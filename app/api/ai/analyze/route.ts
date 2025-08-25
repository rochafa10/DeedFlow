import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

export async function POST(request: Request) {
  try {
    const { propertyId } = await request.json();
    
    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    // Trigger AI analysis workflow in n8n
    const response = await fetch(`${N8N_WEBHOOK_URL}/ai-property-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ propertyId }),
    });

    if (!response.ok) {
      throw new Error(`n8n workflow failed: ${response.statusText}`);
    }

    const analysisResult = await response.json();

    // Store the analysis result in database
    const supabase = createClient();
    const { data, error } = await supabase
      .from('ai_analyses')
      .insert({
        property_id: propertyId,
        ai_score: analysisResult.aiEnhancedScore,
        recommendation: analysisResult.recommendation,
        investment_analysis: analysisResult.investmentAnalysis,
        repair_estimate: analysisResult.repairEstimate,
        market_analysis: analysisResult.marketAnalysis,
        risk_assessment: analysisResult.riskAssessment,
        key_insights: analysisResult.keyInsights,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to store analysis:', error);
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      stored: !!data,
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze property' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('propertyId');

  if (!propertyId) {
    return NextResponse.json(
      { error: 'Property ID is required' },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Analysis not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}