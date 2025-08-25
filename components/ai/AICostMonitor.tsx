'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface TokenUsage {
  model: string;
  tokens: number;
  cost: number;
  timestamp: string;
}

interface CostMetrics {
  dailyCost: number;
  monthlyCost: number;
  monthlyProjected: number;
  tokenUsage: {
    gpt4: number;
    gpt35: number;
    claude: number;
    embeddings: number;
  };
  apiCalls: number;
  averageCostPerCall: number;
}

export function AICostMonitor() {
  const [metrics, setMetrics] = useState<CostMetrics>({
    dailyCost: 0,
    monthlyCost: 0,
    monthlyProjected: 0,
    tokenUsage: {
      gpt4: 0,
      gpt35: 0,
      claude: 0,
      embeddings: 0,
    },
    apiCalls: 0,
    averageCostPerCall: 0,
  });

  const [recentUsage, setRecentUsage] = useState<TokenUsage[]>([]);
  const monthlyBudget = parseFloat(process.env.NEXT_PUBLIC_AI_MONTHLY_BUDGET || '200');
  const alertThreshold = parseFloat(process.env.NEXT_PUBLIC_AI_ALERT_THRESHOLD || '150');

  useEffect(() => {
    // Fetch cost metrics from API
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/ai/metrics');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data.metrics);
          setRecentUsage(data.recentUsage);
        }
      } catch (error) {
        console.error('Failed to fetch AI metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const budgetUsedPercentage = (metrics.monthlyCost / monthlyBudget) * 100;
  const isOverBudget = metrics.monthlyCost > monthlyBudget;
  const isNearLimit = metrics.monthlyCost > alertThreshold;

  const getModelColor = (model: string) => {
    if (model.includes('gpt-4')) return 'text-purple-600';
    if (model.includes('gpt-3.5')) return 'text-blue-600';
    if (model.includes('claude')) return 'text-orange-600';
    return 'text-gray-600';
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cost);
  };

  return (
    <div className="space-y-4">
      {/* Budget Alert */}
      {isOverBudget && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Monthly AI budget exceeded! Consider using GPT-3.5 for non-critical tasks.
          </AlertDescription>
        </Alert>
      )}
      {!isOverBudget && isNearLimit && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Approaching monthly AI budget limit ({formatCost(alertThreshold)})
          </AlertDescription>
        </Alert>
      )}

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Today&apos;s Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(metrics.dailyCost)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.apiCalls} API calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Month to Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(metrics.monthlyCost)}</div>
            <Progress 
              value={budgetUsedPercentage} 
              className="mt-2 h-2"
                          // @ts-expect-error - Progress component color prop
            indicatorClassName={isOverBudget ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Projected Monthly
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(metrics.monthlyProjected)}</div>
            <p className="text-xs text-gray-500 mt-1">
              Based on current usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Token Usage by Model</span>
            <Badge variant="outline">
              Avg cost: {formatCost(metrics.averageCostPerCall)}/call
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-purple-600">GPT-4</span>
                <span>{metrics.tokenUsage.gpt4.toLocaleString()} tokens</span>
              </div>
              <Progress value={(metrics.tokenUsage.gpt4 / 100000) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-blue-600">GPT-3.5</span>
                <span>{metrics.tokenUsage.gpt35.toLocaleString()} tokens</span>
              </div>
              <Progress value={(metrics.tokenUsage.gpt35 / 500000) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-orange-600">Claude</span>
                <span>{metrics.tokenUsage.claude.toLocaleString()} tokens</span>
              </div>
              <Progress value={(metrics.tokenUsage.claude / 200000) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-600">Embeddings</span>
                <span>{metrics.tokenUsage.embeddings.toLocaleString()} tokens</span>
              </div>
              <Progress value={(metrics.tokenUsage.embeddings / 1000000) * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Usage Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Recent AI Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentUsage.slice(0, 5).map((usage, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <span className={`font-medium ${getModelColor(usage.model)}`}>
                    {usage.model}
                  </span>
                  <p className="text-xs text-gray-500">
                    {new Date(usage.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCost(usage.cost)}</p>
                  <p className="text-xs text-gray-500">{usage.tokens} tokens</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Optimization Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Cost Optimization Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start">
              <span className="mr-2">💡</span>
              <span>Use GPT-3.5 for simple tasks (10x cheaper than GPT-4)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">💡</span>
              <span>Batch similar requests together to reduce API calls</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">💡</span>
              <span>Cache AI responses for frequently accessed properties</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">💡</span>
              <span>Use embeddings for semantic search instead of repeated AI calls</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">💡</span>
              <span>Set max token limits in workflow configurations</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}