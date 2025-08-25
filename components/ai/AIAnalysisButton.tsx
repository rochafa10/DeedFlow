'use client';

import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AIAnalysisButtonProps {
  propertyId: string;
  onAnalysisComplete?: (analysis: any) => void;
  className?: string;
}

export function AIAnalysisButton({ 
  propertyId, 
  onAnalysisComplete,
  className 
}: AIAnalysisButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ propertyId }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      setAnalysis(result.analysis);
      onAnalysisComplete?.(result.analysis);
    } catch (err) {
      setError('Failed to run AI analysis. Please try again.');
      console.error('AI analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'STRONG_BUY':
        return 'bg-green-500';
      case 'BUY':
        return 'bg-blue-500';
      case 'CONDITIONAL_BUY':
        return 'bg-yellow-500';
      case 'ANALYZE_FURTHER':
        return 'bg-orange-500';
      case 'PASS':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getGradeColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 65) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 35) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={className}>
      <Button
        onClick={runAIAnalysis}
        disabled={isAnalyzing}
        className="w-full"
        variant={analysis ? 'outline' : 'default'}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            AI Analyzing Property...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            {analysis ? 'Re-run AI Analysis' : 'Run AI Analysis'}
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {analysis && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>AI Analysis Results</span>
              <Badge className={getRecommendationColor(analysis.recommendation)}>
                {analysis.recommendation?.replace('_', ' ')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Score */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">AI Score</span>
                <span className={`text-2xl font-bold ${getGradeColor(analysis.aiEnhancedScore)}`}>
                  {analysis.aiEnhancedScore}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getRecommendationColor(analysis.recommendation)}`}
                  style={{ width: `${analysis.aiEnhancedScore}%` }}
                />
              </div>
            </div>

            {/* Key Insights */}
            {analysis.keyInsights && (
              <div>
                <h4 className="text-sm font-medium mb-2">Key Insights</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {analysis.keyInsights.map((insight: string, i: number) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Analysis Timestamp */}
            <div className="text-xs text-gray-500 pt-2 border-t">
              Analysis performed: {new Date(analysis.metadata?.analyzedAt || Date.now()).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}