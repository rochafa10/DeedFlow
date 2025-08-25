'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator,
  TrendingUp,
  BarChart3,
  PieChart,
  FileText,
  Target,
  Zap,
  Building,
  Home,
  Package,
  Repeat
} from 'lucide-react';

const ANALYSIS_TOOLS = [
  {
    id: 'calculator',
    title: 'Financial Calculator',
    description: 'Calculate ROI for different exit strategies',
    icon: Calculator,
    href: '/analysis/calculator',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    features: ['Fix & Flip', 'BRRRR', 'Wholesale', 'Buy & Hold']
  },
  {
    id: 'comparables',
    title: 'Comparable Sales',
    description: 'Find and analyze comparable property sales',
    icon: BarChart3,
    href: '/analysis/comparables',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    features: ['Recent Sales', 'Price Trends', 'Market Analysis'],
    comingSoon: true
  },
  {
    id: 'market',
    title: 'Market Analysis',
    description: 'Analyze local real estate market trends',
    icon: TrendingUp,
    href: '/analysis/market',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    features: ['Price Trends', 'Inventory Levels', 'Days on Market'],
    comingSoon: true
  },
  {
    id: 'portfolio',
    title: 'Portfolio Analyzer',
    description: 'Analyze multiple properties as a portfolio',
    icon: PieChart,
    href: '/analysis/portfolio',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    features: ['Bulk Analysis', 'Risk Assessment', 'Diversification'],
    comingSoon: true
  }
];

const EXIT_STRATEGIES = [
  {
    name: 'Fix & Flip',
    icon: Home,
    description: 'Buy, renovate, and sell for profit',
    avgROI: '20-30%',
    timeframe: '3-6 months',
    riskLevel: 'Medium'
  },
  {
    name: 'BRRRR',
    icon: Repeat,
    description: 'Buy, Rehab, Rent, Refinance, Repeat',
    avgROI: '15-25%',
    timeframe: '6-12 months',
    riskLevel: 'Low-Medium'
  },
  {
    name: 'Wholesale',
    icon: Package,
    description: 'Contract and assign to another investor',
    avgROI: '5-10%',
    timeframe: '30-45 days',
    riskLevel: 'Low'
  },
  {
    name: 'Buy & Hold',
    icon: Building,
    description: 'Long-term rental income strategy',
    avgROI: '8-12%',
    timeframe: 'Long-term',
    riskLevel: 'Low'
  }
];

export default function AnalysisPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analysis Tools</h1>
          <p className="text-muted-foreground">
            Comprehensive tools for analyzing tax deed investment opportunities
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. ROI</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18.5%</div>
              <p className="text-xs text-muted-foreground">Last 30 analyses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties Analyzed</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">256</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">72%</div>
              <p className="text-xs text-muted-foreground">Profitable deals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saved Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">48</div>
              <p className="text-xs text-muted-foreground">Analysis reports</p>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Tools Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Analysis Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ANALYSIS_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card 
                  key={tool.id} 
                  className={`hover:shadow-lg transition-shadow ${tool.comingSoon ? 'opacity-75' : 'cursor-pointer'}`}
                >
                  <Link href={tool.comingSoon ? '#' : tool.href}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${tool.bgColor}`}>
                            <Icon className={`h-6 w-6 ${tool.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{tool.title}</CardTitle>
                            {tool.comingSoon && (
                              <Badge variant="secondary" className="mt-1">Coming Soon</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-3">
                        {tool.description}
                      </CardDescription>
                      <div className="flex flex-wrap gap-2">
                        {tool.features.map((feature, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                      {!tool.comingSoon && (
                        <Button className="w-full mt-4">
                          Open Tool
                        </Button>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Exit Strategies */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Exit Strategy Comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {EXIT_STRATEGIES.map((strategy) => {
              const Icon = strategy.icon;
              return (
                <Card key={strategy.name}>
                  <CardHeader>
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{strategy.name}</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {strategy.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg ROI</span>
                      <span className="font-medium">{strategy.avgROI}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Timeframe</span>
                      <span className="font-medium">{strategy.timeframe}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Risk</span>
                      <Badge 
                        variant={
                          strategy.riskLevel === 'Low' ? 'success' :
                          strategy.riskLevel === 'Medium' ? 'secondary' : 'destructive'
                        }
                        className="text-xs"
                      >
                        {strategy.riskLevel}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Analyses */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Analyses</CardTitle>
            <CardDescription>
              Your recently analyzed properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { parcel: '25-45-001', county: 'Miami-Dade', roi: 22.5, strategy: 'Fix & Flip', date: '2024-02-10' },
                { parcel: '26-46-002', county: 'Broward', roi: 18.3, strategy: 'BRRRR', date: '2024-02-09' },
                { parcel: '25-45-003', county: 'Miami-Dade', roi: 8.7, strategy: 'Wholesale', date: '2024-02-08' },
                { parcel: '27-47-001', county: 'Palm Beach', roi: 15.2, strategy: 'Buy & Hold', date: '2024-02-07' },
              ].map((analysis, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium">{analysis.parcel}</p>
                      <p className="text-sm text-muted-foreground">{analysis.county}, FL</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">{analysis.strategy}</Badge>
                    <div className="text-right">
                      <p className="font-medium">{analysis.roi}% ROI</p>
                      <p className="text-xs text-muted-foreground">{analysis.date}</p>
                    </div>
                    <Button size="sm" variant="ghost">
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}