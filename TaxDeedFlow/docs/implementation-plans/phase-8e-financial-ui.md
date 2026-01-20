# Phase 8e: Financial Analysis UI Components

## Overview

This phase implements the frontend UI components for the Financial Analysis Engine, providing users with interactive dashboards, investment calculators, charts, visualizations, and comprehensive cost breakdown displays. These components transform the backend financial analysis (Phase 8) into actionable, visual information for property investment decisions.

## Dependencies

- Phase 8: Financial Analysis Engine (types, calculators, recommendation engine)
- shadcn/ui components (Card, Badge, Progress, Table, Button, Tabs, etc.)
- Recharts library for data visualizations
- Utility functions for formatting (currency, percentages, dates)

## Technology Stack

```json
{
  "dependencies": {
    "recharts": "^2.10.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "lucide-react": "^0.294.0"
  }
}
```

---

## File Structure

```
src/components/
├── financial/
│   ├── FinancialDashboard.tsx          # Main dashboard container
│   ├── FinancialSummary.tsx            # Overview card with key metrics
│   ├── InvestmentCalculator.tsx        # Interactive calculator
│   ├── CostBreakdownCard.tsx           # Detailed cost display
│   ├── RehabEstimateCard.tsx           # Rehab cost breakdown
│   ├── ROIMetricsCard.tsx              # Return metrics display
│   ├── ComparablesTable.tsx            # Comparable sales table
│   ├── InvestmentRecommendation.tsx    # Buy/Hold/Pass display
│   └── charts/
│       ├── CostPieChart.tsx            # Cost distribution pie chart
│       ├── ProfitWaterfallChart.tsx    # Profit waterfall visualization
│       ├── ROIComparisonChart.tsx      # ROI comparison bar chart
│       ├── ComparablesScatterPlot.tsx  # Price vs sqft scatter
│       ├── TimelineProjection.tsx      # Holding period timeline
│       └── SensitivityAnalysis.tsx     # What-if scenarios
│
├── reports/sections/
│   ├── FinancialSummary.tsx            # Report section component
│   ├── ComparablesTable.tsx            # Report comparables table
│   ├── CostBreakdown.tsx               # Report cost breakdown
│   └── InvestmentMetrics.tsx           # Report metrics display
```

---

## Component Specifications

### 1. Financial Dashboard (Main Container)

```typescript
// src/components/financial/FinancialDashboard.tsx

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FinancialSummary } from './FinancialSummary';
import { InvestmentCalculator } from './InvestmentCalculator';
import { CostBreakdownCard } from './CostBreakdownCard';
import { ROIMetricsCard } from './ROIMetricsCard';
import { ComparablesTable } from './ComparablesTable';
import { InvestmentRecommendation } from './InvestmentRecommendation';
import { CostPieChart } from './charts/CostPieChart';
import { ProfitWaterfallChart } from './charts/ProfitWaterfallChart';
import { FinancialAnalysis } from '@/lib/analysis/financial/types';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  BarChart3,
  Home,
  Settings2
} from 'lucide-react';

interface FinancialDashboardProps {
  analysis: FinancialAnalysis;
  propertyId: string;
  onRecalculate?: (params: CalculatorParams) => void;
}

interface CalculatorParams {
  purchasePrice: number;
  rehabScope: 'cosmetic' | 'moderate' | 'major' | 'gut';
  holdingMonths: number;
  useFinancing: boolean;
  estimatedARV?: number;
}

export function FinancialDashboard({
  analysis,
  propertyId,
  onRecalculate
}: FinancialDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header with Recommendation Banner */}
      <InvestmentRecommendation
        recommendation={analysis.recommendation}
        dataQuality={analysis.dataQuality}
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Costs</span>
          </TabsTrigger>
          <TabsTrigger value="returns" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Returns</span>
          </TabsTrigger>
          <TabsTrigger value="comparables" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Comps</span>
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Calculator</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FinancialSummary analysis={analysis} />
            <CostPieChart costs={analysis.costs} />
          </div>
          <ProfitWaterfallChart
            costs={analysis.costs}
            revenue={analysis.revenue}
            metrics={analysis.metrics}
          />
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <CostBreakdownCard costs={analysis.costs} />
            <RehabEstimateCard rehab={analysis.costs.rehab} />
          </div>
          <HoldingCostsTimeline holding={analysis.costs.holding} />
        </TabsContent>

        {/* Returns Tab */}
        <TabsContent value="returns" className="space-y-6">
          <ROIMetricsCard metrics={analysis.metrics} />
          <div className="grid gap-6 md:grid-cols-2">
            <ExitStrategyComparison analysis={analysis} />
            <SensitivityAnalysis
              analysis={analysis}
              onScenarioChange={(params) => onRecalculate?.(params)}
            />
          </div>
        </TabsContent>

        {/* Comparables Tab */}
        <TabsContent value="comparables">
          <ComparablesTable comparables={analysis.comparables} />
        </TabsContent>

        {/* Calculator Tab */}
        <TabsContent value="calculator">
          <InvestmentCalculator
            initialValues={{
              purchasePrice: analysis.costs.acquisition.purchasePrice,
              estimatedARV: analysis.revenue.sale.estimatedARV,
            }}
            onCalculate={onRecalculate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### 2. Financial Summary Card

```typescript
// src/components/financial/FinancialSummary.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calculator,
  Percent,
  Clock
} from 'lucide-react';
import { FinancialAnalysis } from '@/lib/analysis/financial/types';
import { formatCurrency, formatPercent } from '@/lib/utils/format';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FinancialSummaryProps {
  analysis: FinancialAnalysis;
}

export function FinancialSummary({ analysis }: FinancialSummaryProps) {
  const { costs, metrics, recommendation, revenue } = analysis;

  const verdictConfig = {
    strong_buy: { color: 'bg-green-500', textColor: 'text-green-500', icon: CheckCircle, label: 'Strong Buy' },
    buy: { color: 'bg-green-400', textColor: 'text-green-400', icon: CheckCircle, label: 'Buy' },
    hold: { color: 'bg-yellow-500', textColor: 'text-yellow-500', icon: AlertTriangle, label: 'Hold' },
    pass: { color: 'bg-orange-500', textColor: 'text-orange-500', icon: AlertTriangle, label: 'Pass' },
    avoid: { color: 'bg-red-500', textColor: 'text-red-500', icon: XCircle, label: 'Avoid' },
  };

  const config = verdictConfig[recommendation.verdict];
  const VerdictIcon = config.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Financial Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recommendation Banner */}
        <div className={`${config.color} text-white p-4 rounded-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <VerdictIcon className="h-6 w-6" />
              <span className="text-xl font-bold">{config.label}</span>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90">Max Bid</div>
              <div className="text-2xl font-bold">
                {formatCurrency(recommendation.maxBid)}
              </div>
            </div>
          </div>
          <div className="mt-2 text-sm opacity-90">
            {recommendation.confidence}% confidence | {recommendation.exitStrategy} strategy
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="ROI"
            value={formatPercent(metrics.roi)}
            icon={TrendingUp}
            positive={metrics.roi > 20}
            tooltip="Return on Investment - Net profit divided by cash invested"
          />
          <MetricCard
            label="Net Profit"
            value={formatCurrency(metrics.netProfit)}
            icon={DollarSign}
            positive={metrics.netProfit > 0}
            tooltip="Total profit after all costs including selling"
          />
          <MetricCard
            label="Profit Margin"
            value={formatPercent(metrics.profitMargin)}
            icon={Percent}
            positive={metrics.profitMargin > 15}
            tooltip="Net profit as percentage of total investment"
          />
          <MetricCard
            label="Price to ARV"
            value={formatPercent(metrics.priceToARV * 100)}
            icon={Calculator}
            positive={metrics.priceToARV < 0.70}
            tooltip="Purchase price divided by After Repair Value (lower is better)"
          />
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Investment</div>
            <div className="text-lg font-semibold">{formatCurrency(costs.totalInvestment)}</div>
          </div>
          <div className="text-center border-x border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Estimated ARV</div>
            <div className="text-lg font-semibold">{formatCurrency(revenue.sale.estimatedARV)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Break-Even</div>
            <div className="text-lg font-semibold">{formatCurrency(metrics.breakEvenPrice)}</div>
          </div>
        </div>

        {/* Data Quality Indicator */}
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Analysis Quality</span>
            <span className="text-sm">{analysis.dataQuality.overallScore}%</span>
          </div>
          <Progress value={analysis.dataQuality.overallScore} className="h-2" />
          {analysis.dataQuality.assumptions.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              * {analysis.dataQuality.assumptions[0]}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  positive: boolean;
  tooltip?: string;
}

function MetricCard({ label, value, icon: Icon, positive, tooltip }: MetricCardProps) {
  const content = (
    <div className={`p-3 rounded-lg border transition-colors ${
      positive
        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
        : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
    }`}>
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className={`text-lg font-bold ${
        positive ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
      }`}>
        {value}
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
```

---

### 3. Investment Calculator

```typescript
// src/components/financial/InvestmentCalculator.tsx

'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calculator, RefreshCw, Download, Share2 } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

interface CalculatorValues {
  purchasePrice: number;
  estimatedARV: number;
  rehabScope: 'cosmetic' | 'moderate' | 'major' | 'gut';
  rehabBudget: number;
  holdingMonths: number;
  useFinancing: boolean;
  downPaymentPercent: number;
  interestRate: number;
  closingCostPercent: number;
  sellingCostPercent: number;
}

interface InvestmentCalculatorProps {
  initialValues?: Partial<CalculatorValues>;
  onCalculate?: (values: CalculatorValues) => void;
}

const DEFAULT_VALUES: CalculatorValues = {
  purchasePrice: 50000,
  estimatedARV: 150000,
  rehabScope: 'moderate',
  rehabBudget: 30000,
  holdingMonths: 6,
  useFinancing: false,
  downPaymentPercent: 25,
  interestRate: 12,
  closingCostPercent: 3,
  sellingCostPercent: 8,
};

export function InvestmentCalculator({
  initialValues,
  onCalculate
}: InvestmentCalculatorProps) {
  const [values, setValues] = useState<CalculatorValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });

  const [results, setResults] = useState<CalculatorResults | null>(null);

  const updateValue = useCallback(<K extends keyof CalculatorValues>(
    key: K,
    value: CalculatorValues[K]
  ) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const calculate = useCallback(() => {
    const calculated = calculateInvestmentReturns(values);
    setResults(calculated);
    onCalculate?.(values);
  }, [values, onCalculate]);

  const resetToDefaults = useCallback(() => {
    setValues({ ...DEFAULT_VALUES, ...initialValues });
    setResults(null);
  }, [initialValues]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Investment Calculator
        </CardTitle>
        <CardDescription>
          Adjust parameters to see how different scenarios affect your returns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Purchase Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
                Purchase Details
              </h3>

              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="purchasePrice"
                    type="number"
                    value={values.purchasePrice}
                    onChange={(e) => updateValue('purchasePrice', Number(e.target.value))}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedARV">Estimated ARV (After Repair Value)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="estimatedARV"
                    type="number"
                    value={values.estimatedARV}
                    onChange={(e) => updateValue('estimatedARV', Number(e.target.value))}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            {/* Rehab Costs */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
                Rehabilitation
              </h3>

              <div className="space-y-2">
                <Label htmlFor="rehabScope">Rehab Scope</Label>
                <Select
                  value={values.rehabScope}
                  onValueChange={(val) => updateValue('rehabScope', val as CalculatorValues['rehabScope'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cosmetic">Cosmetic ($10-25/sqft)</SelectItem>
                    <SelectItem value="moderate">Moderate ($25-60/sqft)</SelectItem>
                    <SelectItem value="major">Major ($50-100/sqft)</SelectItem>
                    <SelectItem value="gut">Gut Rehab ($80-175/sqft)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="rehabBudget">Rehab Budget</Label>
                  <span className="text-sm text-gray-500">{formatCurrency(values.rehabBudget)}</span>
                </div>
                <Slider
                  value={[values.rehabBudget]}
                  onValueChange={([val]) => updateValue('rehabBudget', val)}
                  min={5000}
                  max={200000}
                  step={1000}
                />
              </div>
            </div>

            {/* Holding Period */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
                Timeline
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="holdingMonths">Holding Period</Label>
                  <span className="text-sm text-gray-500">{values.holdingMonths} months</span>
                </div>
                <Slider
                  value={[values.holdingMonths]}
                  onValueChange={([val]) => updateValue('holdingMonths', val)}
                  min={1}
                  max={24}
                  step={1}
                />
              </div>
            </div>

            {/* Financing */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
                Financing
              </h3>

              <div className="flex items-center justify-between">
                <Label htmlFor="useFinancing">Use Financing</Label>
                <Switch
                  id="useFinancing"
                  checked={values.useFinancing}
                  onCheckedChange={(checked) => updateValue('useFinancing', checked)}
                />
              </div>

              {values.useFinancing && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Down Payment</Label>
                      <span className="text-sm text-gray-500">{values.downPaymentPercent}%</span>
                    </div>
                    <Slider
                      value={[values.downPaymentPercent]}
                      onValueChange={([val]) => updateValue('downPaymentPercent', val)}
                      min={10}
                      max={50}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Interest Rate</Label>
                      <span className="text-sm text-gray-500">{values.interestRate}%</span>
                    </div>
                    <Slider
                      value={[values.interestRate]}
                      onValueChange={([val]) => updateValue('interestRate', val)}
                      min={6}
                      max={18}
                      step={0.5}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={calculate} className="flex-1">
                <Calculator className="h-4 w-4 mr-2" />
                Calculate
              </Button>
              <Button variant="outline" onClick={resetToDefaults}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results ? (
              <CalculatorResults results={results} values={values} />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-center text-gray-500">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Adjust values and click Calculate to see results</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CalculatorResults {
  totalInvestment: number;
  cashRequired: number;
  grossProfit: number;
  netProfit: number;
  roi: number;
  annualizedRoi: number;
  cashOnCash: number;
  priceToARV: number;
  profitMargin: number;
  breakEvenPrice: number;
  maxOffer70: number;
}

function CalculatorResults({
  results,
  values
}: {
  results: CalculatorResults;
  values: CalculatorValues;
}) {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <ResultCard
          label="Total Investment"
          value={formatCurrency(results.totalInvestment)}
          variant="neutral"
        />
        <ResultCard
          label="Cash Required"
          value={formatCurrency(results.cashRequired)}
          variant="neutral"
        />
        <ResultCard
          label="Net Profit"
          value={formatCurrency(results.netProfit)}
          variant={results.netProfit > 0 ? 'positive' : 'negative'}
        />
        <ResultCard
          label="ROI"
          value={formatPercent(results.roi)}
          variant={results.roi > 20 ? 'positive' : results.roi > 10 ? 'neutral' : 'negative'}
        />
      </div>

      {/* Detailed Metrics */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold">Investment Metrics</h4>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Annualized ROI</span>
            <span className="font-medium">{formatPercent(results.annualizedRoi)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Profit Margin</span>
            <span className="font-medium">{formatPercent(results.profitMargin)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Price to ARV</span>
            <span className={`font-medium ${results.priceToARV < 0.70 ? 'text-green-600' : 'text-orange-600'}`}>
              {formatPercent(results.priceToARV * 100)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Break-Even Price</span>
            <span className="font-medium">{formatCurrency(results.breakEvenPrice)}</span>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">70% Rule Max Offer</span>
            <span className="text-lg font-bold text-blue-600">{formatCurrency(results.maxOffer70)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ARV x 70% - Rehab Costs = Max Purchase Price
          </p>
        </div>
      </div>

      {/* Verdict */}
      <div className={`p-4 rounded-lg ${
        results.roi >= 25 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
        results.roi >= 15 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
      }`}>
        <div className="font-semibold">
          {results.roi >= 25 ? 'Strong Investment Potential' :
           results.roi >= 15 ? 'Moderate Investment Potential' :
           'Proceed with Caution'}
        </div>
        <p className="text-sm mt-1 opacity-90">
          {results.roi >= 25
            ? `This deal offers ${formatPercent(results.roi)} ROI with ${formatCurrency(results.netProfit)} profit potential.`
            : results.roi >= 15
            ? 'Returns are acceptable but consider negotiating a lower price.'
            : 'The numbers may not support this investment at current prices.'}
        </p>
      </div>

      {/* Export Options */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  variant
}: {
  label: string;
  value: string;
  variant: 'positive' | 'negative' | 'neutral';
}) {
  const variantClasses = {
    positive: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    negative: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    neutral: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
  };

  const textClasses = {
    positive: 'text-green-700 dark:text-green-400',
    negative: 'text-red-700 dark:text-red-400',
    neutral: 'text-gray-900 dark:text-gray-100',
  };

  return (
    <div className={`p-3 rounded-lg border ${variantClasses[variant]}`}>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`text-lg font-bold ${textClasses[variant]}`}>{value}</div>
    </div>
  );
}

// Calculator logic
function calculateInvestmentReturns(values: CalculatorValues): CalculatorResults {
  const {
    purchasePrice,
    estimatedARV,
    rehabBudget,
    holdingMonths,
    useFinancing,
    downPaymentPercent,
    interestRate,
    closingCostPercent,
    sellingCostPercent,
  } = values;

  // Acquisition costs
  const closingCosts = purchasePrice * (closingCostPercent / 100);
  const totalAcquisition = purchasePrice + closingCosts;

  // Financing calculations
  let cashRequired = totalAcquisition + rehabBudget;
  let interestCosts = 0;

  if (useFinancing) {
    const loanAmount = purchasePrice * (1 - downPaymentPercent / 100);
    const monthlyRate = (interestRate / 100) / 12;
    interestCosts = loanAmount * monthlyRate * holdingMonths;
    cashRequired = purchasePrice * (downPaymentPercent / 100) + closingCosts + rehabBudget;
  }

  // Holding costs (simplified)
  const monthlyHolding = (purchasePrice * 0.015 / 12) + 200; // Taxes + insurance + utilities
  const totalHolding = monthlyHolding * holdingMonths + interestCosts;

  // Selling costs
  const sellingCosts = estimatedARV * (sellingCostPercent / 100);

  // Totals
  const totalInvestment = totalAcquisition + rehabBudget + totalHolding + sellingCosts;

  // Profit calculations
  const grossProfit = estimatedARV - purchasePrice - rehabBudget;
  const netProfit = estimatedARV - totalInvestment;

  // ROI calculations
  const roi = (netProfit / cashRequired) * 100;
  const annualizedRoi = ((Math.pow((1 + netProfit / cashRequired), 12 / holdingMonths) - 1) * 100);
  const cashOnCash = useFinancing ? (netProfit / cashRequired) * 100 : roi;

  // Ratios
  const priceToARV = purchasePrice / estimatedARV;
  const profitMargin = (netProfit / totalInvestment) * 100;

  // Break-even
  const breakEvenPrice = totalInvestment;

  // 70% Rule
  const maxOffer70 = estimatedARV * 0.70 - rehabBudget;

  return {
    totalInvestment,
    cashRequired,
    grossProfit,
    netProfit,
    roi,
    annualizedRoi,
    cashOnCash,
    priceToARV,
    profitMargin,
    breakEvenPrice,
    maxOffer70,
  };
}
```

---

### 4. Cost Breakdown Card

```typescript
// src/components/financial/CostBreakdownCard.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { CostBreakdown } from '@/lib/analysis/financial/types';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

interface CostBreakdownCardProps {
  costs: CostBreakdown;
}

export function CostBreakdownCard({ costs }: CostBreakdownCardProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const sections = [
    {
      key: 'acquisition',
      label: 'Acquisition',
      total: costs.acquisition.totalAcquisition,
      percentage: (costs.acquisition.totalAcquisition / costs.totalInvestment) * 100,
      color: 'bg-blue-500',
      items: [
        { label: 'Purchase Price', value: costs.acquisition.purchasePrice },
        { label: 'Closing Costs', value: costs.acquisition.closingCosts },
        { label: 'Transfer Taxes', value: costs.acquisition.transferTaxes },
        { label: 'Auction Fees', value: costs.acquisition.auctionFees },
      ],
    },
    {
      key: 'rehab',
      label: 'Rehabilitation',
      total: costs.rehab.estimatedTotal,
      percentage: (costs.rehab.estimatedTotal / costs.totalInvestment) * 100,
      color: 'bg-orange-500',
      confidence: costs.rehab.confidence,
      items: [
        { label: 'Base Estimate', value: costs.rehab.estimatedTotal - costs.rehab.contingency },
        { label: 'Contingency', value: costs.rehab.contingency },
      ],
    },
    {
      key: 'holding',
      label: 'Holding Costs',
      total: costs.holding.totalHolding,
      percentage: (costs.holding.totalHolding / costs.totalInvestment) * 100,
      color: 'bg-purple-500',
      subtitle: `${costs.holding.projectedMonths} months`,
      items: [
        { label: 'Property Taxes', value: costs.holding.breakdown.propertyTaxes * costs.holding.projectedMonths },
        { label: 'Insurance', value: costs.holding.breakdown.insurance * costs.holding.projectedMonths },
        { label: 'Utilities', value: costs.holding.breakdown.utilities * costs.holding.projectedMonths },
        { label: 'Loan Interest', value: costs.holding.breakdown.loanInterest * costs.holding.projectedMonths },
        { label: 'Maintenance', value: costs.holding.breakdown.maintenance * costs.holding.projectedMonths },
      ],
    },
    {
      key: 'selling',
      label: 'Selling Costs',
      total: costs.selling.totalSelling,
      percentage: (costs.selling.totalSelling / costs.totalInvestment) * 100,
      color: 'bg-green-500',
      items: [
        { label: 'Agent Commission', value: costs.selling.agentCommission },
        { label: 'Closing Costs', value: costs.selling.closingCosts },
        { label: 'Staging/Marketing', value: costs.selling.stagingMarketing },
      ],
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Cost Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Investment */}
        <div className="p-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg">
          <div className="text-sm opacity-80">Total Investment Required</div>
          <div className="text-3xl font-bold">{formatCurrency(costs.totalInvestment)}</div>
        </div>

        {/* Cost Categories */}
        <div className="space-y-2">
          {sections.map((section) => (
            <div key={section.key} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedSection(
                  expandedSection === section.key ? null : section.key
                )}
                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('w-3 h-3 rounded-full', section.color)} />
                  <div className="text-left">
                    <div className="font-medium">{section.label}</div>
                    {section.subtitle && (
                      <div className="text-xs text-gray-500">{section.subtitle}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(section.total)}</div>
                    <div className="text-xs text-gray-500">
                      {section.percentage.toFixed(1)}%
                    </div>
                  </div>
                  {expandedSection === section.key ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedSection === section.key && (
                <div className="px-3 pb-3 pt-0 bg-gray-50 dark:bg-gray-800 border-t">
                  <div className="space-y-2 pt-3">
                    {section.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                        <span>{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                  {section.confidence && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-gray-500">
                        Confidence: <span className="capitalize font-medium">{section.confidence}</span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Visual Progress Bar */}
        <div className="pt-4">
          <div className="text-sm text-gray-500 mb-2">Cost Distribution</div>
          <div className="h-4 rounded-full overflow-hidden flex">
            {sections.map((section) => (
              <div
                key={section.key}
                className={cn(section.color, 'h-full transition-all')}
                style={{ width: `${section.percentage}%` }}
                title={`${section.label}: ${section.percentage.toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-2">
            {sections.map((section) => (
              <div key={section.key} className="flex items-center gap-2 text-xs">
                <div className={cn('w-2 h-2 rounded-full', section.color)} />
                <span className="text-gray-600 dark:text-gray-400">{section.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 5. Charts and Visualizations

#### Cost Pie Chart

```typescript
// src/components/financial/charts/CostPieChart.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChartIcon } from 'lucide-react';
import { CostBreakdown } from '@/lib/analysis/financial/types';
import { formatCurrency } from '@/lib/utils/format';

interface CostPieChartProps {
  costs: CostBreakdown;
}

const COLORS = ['#3B82F6', '#F97316', '#8B5CF6', '#22C55E'];

export function CostPieChart({ costs }: CostPieChartProps) {
  const data = [
    { name: 'Acquisition', value: costs.acquisition.totalAcquisition },
    { name: 'Rehabilitation', value: costs.rehab.estimatedTotal },
    { name: 'Holding', value: costs.holding.totalHolding },
    { name: 'Selling', value: costs.selling.totalSelling },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / costs.totalInvestment) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 border">
          <p className="font-semibold">{data.name}</p>
          <p className="text-gray-600 dark:text-gray-400">{formatCurrency(data.value)}</p>
          <p className="text-sm text-gray-500">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Cost Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {data.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index] }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Profit Waterfall Chart

```typescript
// src/components/financial/charts/ProfitWaterfallChart.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { CostBreakdown, RevenueProjection, InvestmentMetrics } from '@/lib/analysis/financial/types';
import { formatCurrency } from '@/lib/utils/format';

interface ProfitWaterfallChartProps {
  costs: CostBreakdown;
  revenue: RevenueProjection;
  metrics: InvestmentMetrics;
}

export function ProfitWaterfallChart({
  costs,
  revenue,
  metrics
}: ProfitWaterfallChartProps) {
  // Build waterfall data
  const arvValue = revenue.sale.estimatedARV;

  const data = [
    {
      name: 'ARV',
      value: arvValue,
      cumulative: arvValue,
      fill: '#22C55E',
      type: 'start',
    },
    {
      name: 'Purchase',
      value: -costs.acquisition.purchasePrice,
      cumulative: arvValue - costs.acquisition.purchasePrice,
      fill: '#EF4444',
      type: 'expense',
    },
    {
      name: 'Closing',
      value: -costs.acquisition.closingCosts,
      cumulative: arvValue - costs.acquisition.purchasePrice - costs.acquisition.closingCosts,
      fill: '#EF4444',
      type: 'expense',
    },
    {
      name: 'Rehab',
      value: -costs.rehab.estimatedTotal,
      cumulative: arvValue - costs.acquisition.totalAcquisition - costs.rehab.estimatedTotal,
      fill: '#F97316',
      type: 'expense',
    },
    {
      name: 'Holding',
      value: -costs.holding.totalHolding,
      cumulative: arvValue - costs.acquisition.totalAcquisition - costs.rehab.estimatedTotal - costs.holding.totalHolding,
      fill: '#8B5CF6',
      type: 'expense',
    },
    {
      name: 'Selling',
      value: -costs.selling.totalSelling,
      cumulative: metrics.netProfit,
      fill: '#3B82F6',
      type: 'expense',
    },
    {
      name: 'Net Profit',
      value: metrics.netProfit,
      cumulative: metrics.netProfit,
      fill: metrics.netProfit >= 0 ? '#22C55E' : '#EF4444',
      type: 'total',
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 border">
          <p className="font-semibold">{item.name}</p>
          <p className={item.value >= 0 ? 'text-green-600' : 'text-red-600'}>
            {item.value >= 0 ? '+' : ''}{formatCurrency(item.value)}
          </p>
          <p className="text-sm text-gray-500">
            Running total: {formatCurrency(item.cumulative)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Profit Waterfall
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-500">Est. Sale Price</div>
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(arvValue)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Costs</div>
            <div className="text-lg font-semibold text-red-600">
              {formatCurrency(costs.totalInvestment)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Net Profit</div>
            <div className={`text-lg font-semibold ${
              metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(metrics.netProfit)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### ROI Comparison Chart

```typescript
// src/components/financial/charts/ROIComparisonChart.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { InvestmentMetrics } from '@/lib/analysis/financial/types';
import { formatPercent } from '@/lib/utils/format';

interface ROIComparisonChartProps {
  metrics: InvestmentMetrics;
}

export function ROIComparisonChart({ metrics }: ROIComparisonChartProps) {
  const data = [
    {
      name: 'This Deal',
      value: metrics.roi,
      fill: metrics.roi >= 25 ? '#22C55E' : metrics.roi >= 15 ? '#F59E0B' : '#EF4444',
    },
    {
      name: 'Target (25%)',
      value: 25,
      fill: '#3B82F6',
    },
    {
      name: 'S&P 500 Avg',
      value: 10,
      fill: '#94A3B8',
    },
    {
      name: 'Real Estate Avg',
      value: 15,
      fill: '#64748B',
    },
  ];

  const benchmarks = [
    { value: 25, label: 'Target', color: '#22C55E' },
    { value: 15, label: 'Good', color: '#F59E0B' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          ROI Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 'auto']}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => formatPercent(value)}
                labelStyle={{ fontWeight: 'bold' }}
              />
              {benchmarks.map((benchmark, idx) => (
                <ReferenceLine
                  key={idx}
                  x={benchmark.value}
                  stroke={benchmark.color}
                  strokeDasharray="5 5"
                  label={{
                    value: benchmark.label,
                    position: 'top',
                    fill: benchmark.color,
                    fontSize: 10,
                  }}
                />
              ))}
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-500" style={{ width: 20 }} />
            <span className="text-gray-600">25%+ = Strong Buy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-yellow-500" style={{ width: 20 }} />
            <span className="text-gray-600">15-25% = Good</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Import Cell component for individual bar coloring
import { Cell } from 'recharts';
```

#### Comparables Scatter Plot

```typescript
// src/components/financial/charts/ComparablesScatterPlot.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  ReferenceLine,
} from 'recharts';
import { Home } from 'lucide-react';
import { ComparablesAnalysis, ComparableSale } from '@/lib/analysis/financial/types';
import { formatCurrency } from '@/lib/utils/format';

interface ComparablesScatterPlotProps {
  comparables: ComparablesAnalysis;
  subjectProperty?: {
    sqft: number;
    salePrice: number;
  };
}

export function ComparablesScatterPlot({
  comparables,
  subjectProperty
}: ComparablesScatterPlotProps) {
  const data = comparables.comparables.map((comp) => ({
    x: comp.sqft,
    y: comp.salePrice,
    z: comp.similarityScore,
    name: comp.address,
    pricePerSqft: comp.pricePerSqft,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 border max-w-xs">
          <p className="font-semibold truncate">{item.name}</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Size:</span>
              <span>{item.x.toLocaleString()} sqft</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Price:</span>
              <span>{formatCurrency(item.y)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">$/sqft:</span>
              <span>{formatCurrency(item.pricePerSqft)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Match:</span>
              <span>{item.z.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          Price vs. Size Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                type="number"
                dataKey="x"
                name="sqft"
                unit=" sqft"
                tick={{ fontSize: 12 }}
                label={{
                  value: 'Square Footage',
                  position: 'bottom',
                  offset: 20,
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="price"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
                label={{
                  value: 'Sale Price',
                  angle: -90,
                  position: 'insideLeft',
                  offset: -45,
                  fontSize: 12,
                }}
              />
              <ZAxis type="number" dataKey="z" range={[100, 400]} />
              <Tooltip content={<CustomTooltip />} />

              {/* Avg Price per sqft reference line */}
              <ReferenceLine
                stroke="#3B82F6"
                strokeDasharray="5 5"
                segment={[
                  { x: 0, y: 0 },
                  {
                    x: Math.max(...data.map(d => d.x)) * 1.1,
                    y: comparables.summary.avgPricePerSqft * Math.max(...data.map(d => d.x)) * 1.1
                  }
                ]}
              />

              <Scatter
                name="Comparables"
                data={data}
                fill="#3B82F6"
                opacity={0.7}
              />

              {/* Subject property marker */}
              {subjectProperty && (
                <Scatter
                  name="Subject Property"
                  data={[{
                    x: subjectProperty.sqft,
                    y: subjectProperty.salePrice,
                    z: 100,
                    name: 'Subject Property',
                    pricePerSqft: subjectProperty.salePrice / subjectProperty.sqft,
                  }]}
                  fill="#EF4444"
                  shape="star"
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600">Comparables</span>
          </div>
          {subjectProperty && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
              <span className="text-gray-600">Subject Property</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-blue-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #3B82F6 0, #3B82F6 5px, transparent 5px, transparent 10px)' }} />
            <span className="text-gray-600">Avg $/sqft trendline</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 6. ROI Metrics Card

```typescript
// src/components/financial/ROIMetricsCard.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  DollarSign,
  Percent,
  Clock,
  Calculator,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { InvestmentMetrics } from '@/lib/analysis/financial/types';
import { formatCurrency, formatPercent } from '@/lib/utils/format';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ROIMetricsCardProps {
  metrics: InvestmentMetrics;
}

export function ROIMetricsCard({ metrics }: ROIMetricsCardProps) {
  const metricsList = [
    {
      label: 'Return on Investment (ROI)',
      value: metrics.roi,
      format: 'percent',
      icon: TrendingUp,
      description: 'Net profit divided by cash invested',
      threshold: { good: 20, excellent: 30 },
    },
    {
      label: 'Annualized ROI',
      value: metrics.annualizedRoi,
      format: 'percent',
      icon: ArrowUpRight,
      description: 'ROI projected to annual rate using CAGR formula',
      threshold: { good: 30, excellent: 50 },
    },
    {
      label: 'Profit Margin',
      value: metrics.profitMargin,
      format: 'percent',
      icon: Percent,
      description: 'Net profit as percentage of total investment',
      threshold: { good: 15, excellent: 25 },
    },
    {
      label: 'Cash-on-Cash Return',
      value: metrics.cashOnCash,
      format: 'percent',
      icon: DollarSign,
      description: 'Annual cash flow divided by cash invested (for rentals)',
      threshold: { good: 8, excellent: 12 },
    },
    {
      label: 'Net Profit',
      value: metrics.netProfit,
      format: 'currency',
      icon: DollarSign,
      description: 'Total profit after all expenses',
      threshold: { good: 15000, excellent: 30000 },
    },
    {
      label: 'Break-Even Price',
      value: metrics.breakEvenPrice,
      format: 'currency',
      icon: Target,
      description: 'Minimum sale price to recover all costs',
    },
    {
      label: 'Price to ARV Ratio',
      value: metrics.priceToARV * 100,
      format: 'percent',
      icon: Calculator,
      description: 'Purchase price as percentage of ARV (lower is better)',
      threshold: { good: 70, excellent: 65, inverse: true },
    },
    {
      label: 'Total Investment to ARV',
      value: metrics.totalInvestmentToARV * 100,
      format: 'percent',
      icon: Calculator,
      description: 'All-in cost as percentage of ARV',
      threshold: { good: 80, excellent: 75, inverse: true },
    },
  ];

  const getStatus = (
    value: number,
    threshold?: { good: number; excellent: number; inverse?: boolean }
  ): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (!threshold) return 'fair';

    if (threshold.inverse) {
      if (value <= threshold.excellent) return 'excellent';
      if (value <= threshold.good) return 'good';
      if (value <= threshold.good + 10) return 'fair';
      return 'poor';
    }

    if (value >= threshold.excellent) return 'excellent';
    if (value >= threshold.good) return 'good';
    if (value >= threshold.good * 0.5) return 'fair';
    return 'poor';
  };

  const statusColors = {
    excellent: 'text-green-600 dark:text-green-400',
    good: 'text-blue-600 dark:text-blue-400',
    fair: 'text-yellow-600 dark:text-yellow-400',
    poor: 'text-red-600 dark:text-red-400',
  };

  const statusBadges = {
    excellent: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    good: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    poor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Investment Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {metricsList.map((metric) => {
            const status = getStatus(metric.value, metric.threshold);
            const Icon = metric.icon;

            return (
              <TooltipProvider key={metric.label}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-4 rounded-lg border bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-help">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm">{metric.label}</span>
                        </div>
                        {metric.threshold && (
                          <Badge className={statusBadges[status]} variant="secondary">
                            {status}
                          </Badge>
                        )}
                      </div>
                      <div className={`text-2xl font-bold mt-2 ${statusColors[status]}`}>
                        {metric.format === 'currency'
                          ? formatCurrency(metric.value)
                          : formatPercent(metric.value)}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>{metric.description}</p>
                    {metric.threshold && (
                      <p className="mt-1 text-xs text-gray-500">
                        {metric.threshold.inverse ? 'Lower is better. ' : ''}
                        Good: {metric.threshold.inverse ? '<' : '>'}{metric.threshold.good}%,
                        Excellent: {metric.threshold.inverse ? '<' : '>'}{metric.threshold.excellent}%
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* IRR Calculation (if applicable) */}
        {metrics.irr > 0 && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  Internal Rate of Return (IRR)
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Time-weighted return accounting for cash flow timing
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatPercent(metrics.irr)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### 7. Investment Recommendation Banner

```typescript
// src/components/financial/InvestmentRecommendation.tsx

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Clock,
  TrendingUp,
  Home,
  Building,
  Repeat,
  HandCoins,
} from 'lucide-react';
import { InvestmentRecommendation as IRecommendation, DataQualityAssessment } from '@/lib/analysis/financial/types';
import { formatCurrency } from '@/lib/utils/format';

interface InvestmentRecommendationProps {
  recommendation: IRecommendation;
  dataQuality: DataQualityAssessment;
}

export function InvestmentRecommendation({
  recommendation,
  dataQuality
}: InvestmentRecommendationProps) {
  const verdictConfig = {
    strong_buy: {
      color: 'from-green-500 to-green-600',
      bgLight: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      icon: CheckCircle,
      label: 'Strong Buy',
      description: 'Excellent investment opportunity with high confidence',
    },
    buy: {
      color: 'from-green-400 to-green-500',
      bgLight: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      icon: CheckCircle,
      label: 'Buy',
      description: 'Good investment potential with solid returns',
    },
    hold: {
      color: 'from-yellow-400 to-yellow-500',
      bgLight: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      icon: AlertTriangle,
      label: 'Hold',
      description: 'Proceed with caution - marginal returns expected',
    },
    pass: {
      color: 'from-orange-400 to-orange-500',
      bgLight: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      icon: AlertTriangle,
      label: 'Pass',
      description: 'Not recommended at current price point',
    },
    avoid: {
      color: 'from-red-500 to-red-600',
      bgLight: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      icon: XCircle,
      label: 'Avoid',
      description: 'High risk with poor return potential',
    },
  };

  const exitStrategyConfig = {
    flip: { icon: TrendingUp, label: 'Fix & Flip', description: 'Renovate and sell for profit' },
    rental: { icon: Home, label: 'Buy & Hold', description: 'Long-term rental investment' },
    wholesale: { icon: HandCoins, label: 'Wholesale', description: 'Assign contract to another investor' },
    hold: { icon: Clock, label: 'Hold', description: 'Wait for market conditions' },
    brrrr: { icon: Repeat, label: 'BRRRR', description: 'Buy, Rehab, Rent, Refinance, Repeat' },
    owner_finance: { icon: Building, label: 'Owner Finance', description: 'Sell with seller financing' },
  };

  const config = verdictConfig[recommendation.verdict];
  const VerdictIcon = config.icon;
  const exitConfig = exitStrategyConfig[recommendation.exitStrategy];
  const ExitIcon = exitConfig.icon;

  return (
    <Card className={`overflow-hidden border-2 ${config.borderColor}`}>
      <div className={`bg-gradient-to-r ${config.color} p-6 text-white`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Verdict */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full">
              <VerdictIcon className="h-8 w-8" />
            </div>
            <div>
              <div className="text-sm font-medium opacity-90">Investment Recommendation</div>
              <div className="text-3xl font-bold">{config.label}</div>
              <div className="text-sm opacity-80 mt-1">{config.description}</div>
            </div>
          </div>

          {/* Max Bid */}
          <div className="text-right">
            <div className="text-sm opacity-90">Maximum Bid</div>
            <div className="text-4xl font-bold">{formatCurrency(recommendation.maxBid)}</div>
            <div className="text-sm opacity-80 mt-1">
              {recommendation.confidence}% confidence
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Exit Strategy */}
          <div className={`p-4 rounded-lg ${config.bgLight}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <ExitIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Exit Strategy</div>
                <div className="font-semibold">{exitConfig.label}</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {exitConfig.description}
            </p>
          </div>

          {/* Timeline */}
          <div className={`p-4 rounded-lg ${config.bgLight}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <Clock className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Timeline</div>
                <div className="font-semibold">{recommendation.timelineMonths} months</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Estimated time to complete investment cycle
            </p>
          </div>

          {/* Target Profit */}
          <div className={`p-4 rounded-lg ${config.bgLight}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <TrendingUp className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Target Profit</div>
                <div className="font-semibold">{formatCurrency(recommendation.targetProfit)}</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Expected net profit from this investment
            </p>
          </div>
        </div>

        {/* Key Factors & Risks */}
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          {/* Opportunities */}
          <div>
            <h4 className="font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Key Opportunities
            </h4>
            <ul className="space-y-2">
              {recommendation.opportunities.map((opp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{opp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          <div>
            <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Potential Risks
            </h4>
            <ul className="space-y-2">
              {recommendation.risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Key Factors */}
        {recommendation.keyFactors.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold mb-3">Key Factors</h4>
            <div className="flex flex-wrap gap-2">
              {recommendation.keyFactors.map((factor, i) => (
                <Badge key={i} variant="secondary" className="text-sm">
                  {factor}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Data Quality Warning */}
        {dataQuality.overallScore < 70 && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-yellow-800 dark:text-yellow-200">
                  Limited Data Quality ({dataQuality.overallScore}%)
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  This analysis includes assumptions due to missing data. Consider additional
                  due diligence before making investment decisions.
                </p>
                {dataQuality.missingData.length > 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                    Missing: {dataQuality.missingData.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Responsive Design Considerations

### Breakpoints

```css
/* Mobile First Approach */
/* Default: Mobile (< 640px) */
/* sm: >= 640px */
/* md: >= 768px */
/* lg: >= 1024px */
/* xl: >= 1280px */
```

### Key Responsive Patterns

1. **Dashboard Grid**
   - Mobile: Single column stacked layout
   - Tablet (md): 2-column grid
   - Desktop (lg): Full dashboard with sidebar

2. **Metric Cards**
   - Mobile: 2 columns
   - Tablet: 4 columns
   - Desktop: 4 columns with larger spacing

3. **Charts**
   - Mobile: Full width, reduced height (250px)
   - Tablet+: Standard height (350px)
   - Include simplified tooltips on mobile

4. **Tables**
   - Mobile: Horizontal scroll with fixed first column
   - Tablet+: Full table with all columns visible

5. **Calculator**
   - Mobile: Stacked inputs and results
   - Tablet+: Side-by-side layout

---

## Utility Functions

```typescript
// src/lib/utils/format.ts

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return formatCurrency(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatPercentCompact(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
```

---

## Testing Requirements

### Unit Tests
1. Calculator logic functions
2. Format utility functions
3. Status/threshold determination logic

### Component Tests
1. MetricCard renders correct status colors
2. Calculator updates results on input change
3. Charts render with provided data
4. Recommendation banner shows correct verdict

### Integration Tests
1. Full dashboard with mock financial analysis data
2. Calculator end-to-end flow
3. Tab navigation and state persistence

### Visual Regression Tests
1. Dashboard at all breakpoints
2. Chart rendering consistency
3. Color theme (light/dark) consistency

---

## Verification Steps

1. **Component Rendering**
   - [ ] All components render without errors
   - [ ] Dark mode works correctly
   - [ ] Responsive layouts work at all breakpoints

2. **Interactive Features**
   - [ ] Calculator inputs update correctly
   - [ ] Tab navigation works
   - [ ] Expandable sections work
   - [ ] Tooltips display correctly

3. **Charts**
   - [ ] Pie chart shows correct proportions
   - [ ] Bar chart shows correct values
   - [ ] Scatter plot positions points correctly
   - [ ] Tooltips show on hover

4. **Data Display**
   - [ ] Currency formatting is correct
   - [ ] Percentage formatting is correct
   - [ ] Positive/negative values show correct colors

5. **Accessibility**
   - [ ] Color contrast meets WCAG 2.1 AA
   - [ ] Interactive elements are keyboard accessible
   - [ ] Screen readers can navigate content

---

## Next Steps

After implementing Phase 8e:
1. Integrate with property detail pages
2. Add PDF export functionality
3. Implement sharing/collaboration features
4. Add historical analysis comparison
5. Create portfolio-level financial dashboards
