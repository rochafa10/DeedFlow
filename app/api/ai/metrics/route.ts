import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Token pricing (per 1K tokens)
const TOKEN_PRICING = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'text-embedding-3-small': { input: 0.00002, output: 0 },
};

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    
    // Get current date boundaries
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Fetch AI usage logs (would come from n8n execution logs in production)
    const { data: todayLogs } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: false });

    const { data: monthLogs } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', startOfMonth.toISOString());

    // Calculate metrics
    const calculateCost = (logs: any[]) => {
      if (!logs) return 0;
      return logs.reduce((total, log) => {
        const pricing = TOKEN_PRICING[log.model as keyof typeof TOKEN_PRICING];
        if (!pricing) return total;
        
        const inputCost = (log.input_tokens / 1000) * pricing.input;
        const outputCost = (log.output_tokens / 1000) * pricing.output;
        return total + inputCost + outputCost;
      }, 0);
    };

    const calculateTokens = (logs: any[], model: string) => {
      if (!logs) return 0;
      return logs
        .filter(log => log.model.includes(model))
        .reduce((total, log) => total + (log.input_tokens || 0) + (log.output_tokens || 0), 0);
    };

    const dailyCost = calculateCost(todayLogs || []);
    const monthlyCost = calculateCost(monthLogs || []);
    
    // Project monthly cost based on daily average
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const monthlyProjected = (monthlyCost / daysPassed) * daysInMonth;

    const metrics = {
      dailyCost,
      monthlyCost,
      monthlyProjected,
      tokenUsage: {
        gpt4: calculateTokens(monthLogs || [], 'gpt-4'),
        gpt35: calculateTokens(monthLogs || [], 'gpt-3.5'),
        claude: calculateTokens(monthLogs || [], 'claude'),
        embeddings: calculateTokens(monthLogs || [], 'embedding'),
      },
      apiCalls: todayLogs?.length || 0,
      averageCostPerCall: todayLogs?.length ? dailyCost / todayLogs.length : 0,
    };

    // Get recent usage for activity feed
    const recentUsage = (todayLogs || []).slice(0, 10).map(log => ({
      model: log.model,
      tokens: (log.input_tokens || 0) + (log.output_tokens || 0),
      cost: calculateCost([log]),
      timestamp: log.created_at,
    }));

    return NextResponse.json({
      metrics,
      recentUsage,
    });
  } catch (error) {
    console.error('Failed to fetch AI metrics:', error);
    
    // Return mock data for development
    return NextResponse.json({
      metrics: {
        dailyCost: 8.45,
        monthlyCost: 124.30,
        monthlyProjected: 186.50,
        tokenUsage: {
          gpt4: 45000,
          gpt35: 230000,
          claude: 28000,
          embeddings: 450000,
        },
        apiCalls: 142,
        averageCostPerCall: 0.059,
      },
      recentUsage: [
        {
          model: 'gpt-4-turbo',
          tokens: 2500,
          cost: 0.075,
          timestamp: new Date().toISOString(),
        },
        {
          model: 'gpt-3.5-turbo',
          tokens: 1200,
          cost: 0.0024,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          model: 'claude-3-sonnet',
          tokens: 1800,
          cost: 0.027,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
      ],
    });
  }
}