import { NextRequest, NextResponse } from 'next/server';
import { FinancialAnalysis, WebhookResponse } from '@/lib/types';
import { supabase } from '@/lib/supabase';

const N8N_FINANCIAL_WEBHOOK = process.env.N8N_FINANCIAL_WEBHOOK || 'http://localhost:5678/webhook/Nr9nnMIQpMqOPiNL/financial-analysis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, exitStrategy, marketValue, repairCosts, financialMetrics } = body;
    
    // Ensure property exists
    if (!propertyId) {
      return NextResponse.json(
        { status: 'error', error: 'Property ID required' },
        { status: 400 }
      );
    }
    
    // Try n8n webhook first
    try {
      const response = await fetch(N8N_FINANCIAL_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          run_id: crypto.randomUUID(),
        }),
      });

      if (response.ok) {
        const data: WebhookResponse<FinancialAnalysis> = await response.json();
        
        // Save to database
        if (data.data) {
          await saveFinancialAnalysis(propertyId, data.data);
        }
        
        return NextResponse.json(data);
      }
    } catch (webhookError) {
      console.log('n8n webhook not available, calculating locally');
    }
    
    // Calculate analysis locally if n8n not available
    const analysis = calculateFinancialAnalysis(body);
    
    // Save to database
    await saveFinancialAnalysis(propertyId, analysis);
    
    return NextResponse.json({
      status: 'ok',
      data: analysis,
      message: 'Analysis calculated locally'
    });
    
  } catch (error) {
    console.error('Financial analysis error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Analysis failed',
        run_id: crypto.randomUUID(),
      },
      { status: 500 }
    );
  }
}

function calculateFinancialAnalysis(data: {
  propertyId: string;
  exitStrategy?: string;
  marketValue?: number;
  repairCosts?: number;
  purchasePrice: number;
  holdingTime: number;
  loanAmount: number;
  interestRate: number;
}): FinancialAnalysis {
  const {
    propertyId,
    exitStrategy = 'flip',
    marketValue = 100000,
    repairCosts = 30000,
    purchasePrice = 50000,
    holdingTime = 6,
    loanAmount = 0,
    interestRate = 0.08
  } = data;
  
  // Calculate ARV (After Repair Value)
  const arv = marketValue * 1.1; // Assume 10% appreciation after repairs
  
  // Calculate costs
  const closingCosts = purchasePrice * 0.03;
  const holdingCosts = (purchasePrice * 0.02) * (holdingTime / 12); // Property tax, insurance, utilities
  const loanCosts = loanAmount > 0 ? (loanAmount * interestRate * (holdingTime / 12)) : 0;
  const sellingCosts = arv * 0.08; // Agent fees, closing costs
  
  const totalCosts = purchasePrice + repairCosts + closingCosts + holdingCosts + loanCosts + sellingCosts;
  const profit = arv - totalCosts;
  const roi = ((profit / (purchasePrice + repairCosts)) * 100);
  
  // Calculate recommended bid
  const maxBid = (arv * 0.7) - repairCosts; // 70% rule
  const minBid = purchasePrice * 0.8;
  
  // Determine deal quality
  let dealQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Fair';
  if (roi > 30) dealQuality = 'Excellent';
  else if (roi > 20) dealQuality = 'Good';
  else if (roi < 10) dealQuality = 'Poor';
  
  return {
    propertyId,
    exitStrategy: exitStrategy as 'flip' | 'brrrr' | 'wholesale' | 'rental',
    marketValue,
    repairCosts,
    arv,
    minBid,
    maxBid,
    profit,
    roi,
    totalCosts,
    dealQuality,
    recommendation: roi > 15 ? 'PROCEED' : 'PASS',
    financialMetrics: {
      closingCosts,
      holdingCosts,
      loanCosts,
      sellingCosts,
      cashOnCashReturn: ((profit / (purchasePrice - loanAmount)) * 100),
      capRate: exitStrategy === 'rental' ? ((12000 / purchasePrice) * 100) : 0,
      monthlyRent: exitStrategy === 'rental' ? (purchasePrice * 0.01) : 0
    },
    sensitivity: {
      arvPlus10: (arv * 1.1) - totalCosts,
      arvMinus10: (arv * 0.9) - totalCosts,
      repairsPlus20: arv - (totalCosts + (repairCosts * 0.2))
    },
    analysisDate: new Date().toISOString()
  };
}

async function saveFinancialAnalysis(propertyId: string, analysis: FinancialAnalysis) {
  try {
    // Check if analysis exists
    const { data: existing } = await supabase
      .from('financial_analyses')
      .select('id')
      .eq('property_id', propertyId)
      .eq('exit_strategy', analysis.exitStrategy)
      .single();
    
    if (existing) {
      // Update existing
      await supabase
        .from('financial_analyses')
        .update({
          market_value: analysis.marketValue,
          repair_costs: analysis.repairCosts,
          arv: analysis.arv,
          min_bid: analysis.minBid,
          max_bid: analysis.maxBid,
          profit: analysis.profit,
          roi: analysis.roi,
          total_costs: analysis.totalCosts,
          deal_quality: analysis.dealQuality,
          recommendation: analysis.recommendation,
          financial_metrics: analysis.financialMetrics,
          sensitivity_analysis: analysis.sensitivity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Create new
      await supabase
        .from('financial_analyses')
        .insert({
          property_id: propertyId,
          exit_strategy: analysis.exitStrategy,
          market_value: analysis.marketValue,
          repair_costs: analysis.repairCosts,
          arv: analysis.arv,
          min_bid: analysis.minBid,
          max_bid: analysis.maxBid,
          profit: analysis.profit,
          roi: analysis.roi,
          total_costs: analysis.totalCosts,
          deal_quality: analysis.dealQuality,
          recommendation: analysis.recommendation,
          financial_metrics: analysis.financialMetrics,
          sensitivity_analysis: analysis.sensitivity
        });
    }
    
    // Also update property valuation
    await supabase
      .from('property_valuations')
      .upsert({
        property_id: propertyId,
        arv_estimate: analysis.arv,
        rehab_estimate: analysis.repairCosts,
        profit_potential: analysis.profit,
        updated_at: new Date().toISOString()
      }, { onConflict: 'property_id' });
      
  } catch (error) {
    console.error('Error saving financial analysis:', error);
    throw error;
  }
}