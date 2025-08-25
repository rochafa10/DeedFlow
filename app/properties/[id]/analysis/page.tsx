'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Download,
  Package,
  Repeat,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { formatCurrency, formatDate, getClassificationColor, getScoreColor } from '@/lib/utils';
import type { Property, FinancialAnalysis, PropertyEnrichment } from '@/lib/types';

// Mock data - in production, fetch from API
const MOCK_PROPERTY: Property = {
  id: '1',
  parcelNumber: '25-45-001-000',
  address: '123 Main St, Miami, FL 33101',
  county: 'Miami-Dade',
  state: 'FL',
  amountDue: 5420,
  squareFeet: 1200,
  acres: 0.25,
  classification: 'A',
  score: 85,
  updatedAt: '2024-02-10'
};

const MOCK_ENRICHMENT: PropertyEnrichment = {
  propertyId: '1',
  gisData: {
    parcelGeometry: 'POLYGON(...)',
    landUse: 'Residential',
    zoning: 'R-1',
    acres: 0.25,
    yearBuilt: 1995
  },
  imagery: {
    thumbnail: 'https://via.placeholder.com/200',
    fullSize: 'https://via.placeholder.com/800'
  },
  floodData: {
    floodZone: 'X',
    percentInFlood: 0,
    riskLevel: 'LOW'
  },
  slopeAnalysis: {
    medianSlope: 2.5,
    percentAbove15: 0,
    buildable: true
  },
  buildingFootprints: {
    count: 1,
    totalArea: 1200
  },
  roadAccess: {
    touchesRoad: true,
    nearestRoadFt: 0
  },
  utilities: {
    electric: true,
    water: true,
    sewer: true,
    gas: false
  },
  score: 85,
  flags: ['has_structures', 'good_access', 'low_flood_risk'],
  classification: 'A',
  enrichmentDate: '2024-02-10'
};

export default function PropertyAnalysisPage() {
  const params = useParams();
  const propertyId = params.id as string;
  
  const [property] = useState<Property>(MOCK_PROPERTY);
  const [enrichment] = useState<PropertyEnrichment>(MOCK_ENRICHMENT);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null);
  const [activeStrategy, setActiveStrategy] = useState<'flip' | 'brrrr' | 'wholesale' | 'rental'>('flip');
  
  const [formData, setFormData] = useState({
    propertyId: propertyId,
    marketValue: 200000,
    repairCosts: 50000,
    exitStrategy: 'flip' as 'flip' | 'brrrr' | 'wholesale' | 'rental',
    monthlyRent: 1500,
    propertyTaxes: 3000,
    insurance: 1200
  });

  useEffect(() => {
    // In production, fetch property data from API
    console.log('Loading property:', propertyId);
    // Mock data is already set
  }, [propertyId]);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/financial/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, exitStrategy: activeStrategy })
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  const exitStrategies = [
    { key: 'flip', name: 'Fix & Flip', icon: Home, color: 'text-blue-600' },
    { key: 'brrrr', name: 'BRRRR', icon: Repeat, color: 'text-green-600' },
    { key: 'wholesale', name: 'Wholesale', icon: Package, color: 'text-purple-600' },
    { key: 'rental', name: 'Buy & Hold', icon: Building, color: 'text-orange-600' }
  ];

  const getPropertyFlags = () => {
    const flags = [];
    if (enrichment.floodData.riskLevel === 'LOW') flags.push({ text: 'Low Flood Risk', type: 'success' });
    if (enrichment.floodData.riskLevel === 'HIGH') flags.push({ text: 'High Flood Risk', type: 'danger' });
    if (enrichment.roadAccess.touchesRoad) flags.push({ text: 'Road Access', type: 'success' });
    if (enrichment.buildingFootprints.count > 0) flags.push({ text: 'Has Structures', type: 'info' });
    if (enrichment.utilities.water && enrichment.utilities.sewer) flags.push({ text: 'Full Utilities', type: 'success' });
    return flags;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/properties">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Properties
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Property Analysis</h1>
                <p className="text-muted-foreground">
                  Comprehensive analysis for {property.parcelNumber}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Create Inspection
              </Button>
            </div>
          </div>
        </div>

        {/* Property Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{property.address}</CardTitle>
                  <CardDescription className="flex items-center mt-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.county}, {property.state} • Parcel: {property.parcelNumber}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={getClassificationColor(property.classification)}>
                    Class {property.classification}
                  </Badge>
                  <span className={`text-2xl font-bold ${getScoreColor(property.score)}`}>
                    {property.score}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Amount Due</p>
                  <p className="text-xl font-semibold">{formatCurrency(property.amountDue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Size</p>
                  <p className="text-xl font-semibold">{property.acres} acres</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sq Ft</p>
                  <p className="text-xl font-semibold">{property.squareFeet?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year Built</p>
                  <p className="text-xl font-semibold">{enrichment.gisData.yearBuilt || 'N/A'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {getPropertyFlags().map((flag, i) => (
                  <Badge
                    key={i}
                    variant={
                      flag.type === 'success' ? 'success' :
                      flag.type === 'danger' ? 'destructive' :
                      flag.type === 'info' ? 'secondary' : 'outline'
                    }
                  >
                    {flag.type === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {flag.type === 'danger' && <XCircle className="h-3 w-3 mr-1" />}
                    {flag.text}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Property Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-muted-foreground">Flood Zone</span>
                  <Badge variant={enrichment.floodData.riskLevel === 'LOW' ? 'success' : 'destructive'}>
                    {enrichment.floodData.floodZone}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-muted-foreground">Median Slope</span>
                  <span className="font-medium">{enrichment.slopeAnalysis.medianSlope}°</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-muted-foreground">Structures</span>
                  <span className="font-medium">{enrichment.buildingFootprints.count}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-muted-foreground">Land Use</span>
                  <span className="font-medium">{enrichment.gisData.landUse}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-muted-foreground">Zoning</span>
                  <span className="font-medium">{enrichment.gisData.zoning}</span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Last Updated: {formatDate(property.updatedAt || new Date())}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Analysis Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Financial Analysis</CardTitle>
            <CardDescription>
              Calculate potential returns for different investment strategies
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Strategy Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {exitStrategies.map((strategy) => {
                const Icon = strategy.icon;
                return (
                  <Button
                    key={strategy.key}
                    variant={activeStrategy === strategy.key ? 'default' : 'outline'}
                    onClick={() => {
                      setActiveStrategy(strategy.key as typeof activeStrategy);
                      setFormData(prev => ({ ...prev, exitStrategy: strategy.key as typeof activeStrategy }));
                    }}
                    className="min-w-fit"
                  >
                    <Icon className={`h-4 w-4 mr-2 ${strategy.color}`} />
                    {strategy.name}
                  </Button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Parameters */}
              <div className="space-y-4">
                <h3 className="font-semibold mb-3">Investment Parameters</h3>
                
                <div className="grid grid-cols-2 gap-4">
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
                      Repair Costs
                    </label>
                    <input
                      type="number"
                      name="repairCosts"
                      value={formData.repairCosts}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                {(activeStrategy === 'brrrr' || activeStrategy === 'rental') && (
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
                      Property Taxes/Year
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
                      Insurance/Year
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
                  {loading ? 'Calculating...' : 'Calculate Returns'}
                </Button>
              </div>

              {/* Results */}
              <div>
                {analysis ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold mb-3">Analysis Results</h3>
                    
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Maximum Bid</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(analysis.maxBid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Profit</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(analysis.profit)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="text-sm font-medium">ROI</span>
                        <Badge variant={analysis.roi > 15 ? 'success' : 'secondary'}>
                          {analysis.roi}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="text-sm font-medium">Total Investment</span>
                        <span className="font-semibold">{formatCurrency(analysis.totalCosts)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="text-sm font-medium">Minimum Bid</span>
                        <span className="font-semibold">{formatCurrency(analysis.minBid)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="text-sm font-medium">Deal Quality</span>
                        <Badge 
                          variant={
                            analysis.dealQuality === 'Excellent' ? 'success' :
                            analysis.dealQuality === 'Good' ? 'default' :
                            analysis.dealQuality === 'Fair' ? 'secondary' : 'destructive'
                          }
                        >
                          {analysis.dealQuality}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="text-sm font-medium">Recommendation</span>
                        <Badge 
                          variant={analysis.recommendation === 'PROCEED' ? 'success' : 'destructive'}
                        >
                          {analysis.recommendation}
                        </Badge>
                      </div>
                    </div>

                    {/* Strategy-Specific Metrics */}
                    {analysis.financialMetrics && Object.keys(analysis.financialMetrics).length > 0 && (
                      <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                        <h4 className="text-sm font-semibold mb-2">Strategy Metrics</h4>
                        <div className="space-y-2">
                          {Object.entries(analysis.financialMetrics).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
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
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-8">
                    <div>
                      <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Enter investment parameters and click &quot;Calculate Returns&quot; to see analysis
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Property Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Utilities & Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(enrichment.utilities || {}).map(([utility, available]) => (
                  <div key={utility} className="flex items-center justify-between">
                    <span className="capitalize">{utility}</span>
                    {available ? (
                      <Badge variant="success">Available</Badge>
                    ) : (
                      <Badge variant="secondary">Not Available</Badge>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span>Road Access</span>
                  {enrichment.roadAccess.touchesRoad ? (
                    <Badge variant="success">Direct Access</Badge>
                  ) : (
                    <Badge variant="destructive">{enrichment.roadAccess.nearestRoadFt}ft away</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Land Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Buildable</span>
                  <Badge variant={enrichment.slopeAnalysis.buildable ? 'success' : 'destructive'}>
                    {enrichment.slopeAnalysis.buildable ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Flood Risk</span>
                  <Badge 
                    variant={
                      enrichment.floodData.riskLevel === 'LOW' ? 'success' :
                      enrichment.floodData.riskLevel === 'MEDIUM' ? 'secondary' : 'destructive'
                    }
                  >
                    {enrichment.floodData.riskLevel}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">% in Flood Zone</span>
                  <span className="font-medium">{enrichment.floodData.percentInFlood}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">% Slope &gt; 15°</span>
                  <span className="font-medium">{enrichment.slopeAnalysis.percentAbove15}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}