'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { FinancialAnalysis } from '@/lib/types';

export default function FinancialCalculator() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('propertyId');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null);
  const [formData, setFormData] = useState({
    propertyId: propertyId || 'calc-001',
    marketValue: 200000,
    repairCosts: 50000,
    exitStrategy: 'flip' as 'flip' | 'brrrr' | 'wholesale' | 'rental',
    monthlyRent: 1500,
    propertyTaxes: 3000,
    insurance: 1200
  });

  // Load property data if propertyId is provided
  useEffect(() => {
    if (propertyId) {
      // In production, fetch property data from API
      console.log('Loading property data for:', propertyId);
      // For now, just update the propertyId in formData
      setFormData(prev => ({ ...prev, propertyId }));
    }
  }, [propertyId]);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/financial/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (result.status === 'ok') {
        setAnalysis(result.data);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'exitStrategy' ? value : Number(value)
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Financial Analysis Calculator</h1>
              <p className="text-muted-foreground">
                Calculate potential returns for different investment strategies
              </p>
            </div>
            <Link href="/properties">
              <Button variant="outline">
                Back to Properties
              </Button>
            </Link>
          </div>
          {propertyId && (
            <Badge variant="secondary">
              Analyzing Property ID: {propertyId}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
              <CardDescription>
                Enter property information to calculate potential returns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Market Value (ARV)
                </label>
                <input
                  type="number"
                  name="marketValue"
                  value={formData.marketValue}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Estimated Repair Costs
                </label>
                <input
                  type="number"
                  name="repairCosts"
                  value={formData.repairCosts}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Exit Strategy
                </label>
                <select
                  name="exitStrategy"
                  value={formData.exitStrategy}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="flip">Fix & Flip</option>
                  <option value="brrrr">BRRRR</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="rental">Buy & Hold</option>
                </select>
              </div>

              {(formData.exitStrategy === 'brrrr' || formData.exitStrategy === 'rental') && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Expected Monthly Rent
                  </label>
                  <input
                    type="number"
                    name="monthlyRent"
                    value={formData.monthlyRent}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Annual Property Taxes
                  </label>
                  <input
                    type="number"
                    name="propertyTaxes"
                    value={formData.propertyTaxes}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Annual Insurance
                  </label>
                  <input
                    type="number"
                    name="insurance"
                    value={formData.insurance}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <Button 
                onClick={handleAnalyze} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Analyzing...' : 'Calculate Returns'}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {analysis && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Analysis Results</CardTitle>
                    <Badge 
                      variant={analysis.recommendation === 'PROCEED' ? 'success' : 'destructive'}
                    >
                      {analysis.recommendation}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Maximum Bid</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(analysis.maxBid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Minimum Bid</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(analysis.minBid)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Profit</p>
                      <p className="text-xl font-semibold text-green-600">
                        {formatCurrency(analysis.profit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ROI</p>
                      <p className="text-xl font-semibold">
                        {analysis.roi}%
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Deal Quality</p>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          analysis.dealQuality === 'Excellent' ? 'success' :
                          analysis.dealQuality === 'Good' ? 'default' :
                          analysis.dealQuality === 'Fair' ? 'secondary' : 'destructive'
                        }
                      >
                        {analysis.dealQuality}
                      </Badge>
                      {analysis.dealQuality === 'Excellent' && (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      )}
                      {analysis.dealQuality === 'Poor' && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Strategy-Specific Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Strategy Details</CardTitle>
                  <CardDescription>
                    {analysis.exitStrategy.toUpperCase()} specific metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analysis.financialMetrics || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        <span className="font-medium">
                          {typeof value === 'number' 
                            ? value > 1000 
                              ? formatCurrency(value) 
                              : `${value}%`
                            : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sensitivity Analysis */}
              {analysis.sensitivity && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sensitivity Analysis</CardTitle>
                    <CardDescription>
                      How changes affect your ROI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">ARV +10%</span>
                        <Badge variant={analysis.sensitivity.arvPlus10 > 0 ? 'success' : 'destructive'}>
                          {analysis.sensitivity.arvPlus10 > 0 ? '+' : ''}{analysis.sensitivity.arvPlus10}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">ARV -10%</span>
                        <Badge variant={analysis.sensitivity.arvMinus10 > 0 ? 'secondary' : 'destructive'}>
                          {analysis.sensitivity.arvMinus10 > 0 ? '+' : ''}{analysis.sensitivity.arvMinus10}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Repairs +20%</span>
                        <Badge variant={analysis.sensitivity.repairsPlus20 > 0 ? 'secondary' : 'destructive'}>
                          {analysis.sensitivity.repairsPlus20 > 0 ? '+' : ''}{analysis.sensitivity.repairsPlus20}%
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}