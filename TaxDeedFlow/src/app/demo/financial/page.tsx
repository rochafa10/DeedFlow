'use client';

/**
 * Financial Analysis Demo Page
 *
 * Showcases Phase 8D-8E financial analysis components with realistic sample data.
 * Demonstrates FinancialDashboard, RecommendationCard, and DataQualityIndicator.
 *
 * @module app/demo/financial/page
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { FinancialDashboard } from '@/components/financial/FinancialDashboard';
import { RecommendationCard } from '@/components/report/sections/RecommendationCard';
import { DataQualityIndicator } from '@/components/report/sections/DataQualityIndicator';
import {
  BarChart3,
  Calculator,
  Home,
  TrendingUp,
  CheckCircle,
  DollarSign,
  Target,
  Clock,
  AlertTriangle,
  Shield,
  ArrowRight,
  Percent,
  Building2,
  MapPin,
  Calendar,
  Ruler,
  BedDouble,
  Bath,
} from 'lucide-react';

import type { FinancialAnalysis, ComparableSale, InvestmentRecommendation, DataQualityAssessment } from '@/lib/analysis/financial/types';

// ============================================
// Sample Data
// ============================================

/**
 * Sample property information for the demo
 */
const sampleProperty = {
  id: 'demo-property-1',
  parcelId: '01-234-567-890',
  address: '123 Main Street, Altoona, PA 16601',
  county: 'Blair',
  state: 'PA',
  saleType: 'judicial',
  totalDue: 15000,
  assessedValue: 85000,
  lotSize: 0.25,
  yearBuilt: 1985,
  squareFeet: 1800,
  bedrooms: 3,
  bathrooms: 2,
};

/**
 * Sample comparable sales data
 */
const sampleComparables: ComparableSale[] = [
  {
    id: 'comp-1',
    address: '456 Oak Avenue',
    city: 'Altoona',
    state: 'PA',
    zip: '16601',
    salePrice: 118000,
    saleDate: '2025-11-15',
    sqft: 1750,
    bedrooms: 3,
    bathrooms: 2,
    yearBuilt: 1982,
    pricePerSqft: 67.43,
    distanceMiles: 0.3,
    similarityScore: 92,
    source: 'MLS',
  },
  {
    id: 'comp-2',
    address: '789 Elm Street',
    city: 'Altoona',
    state: 'PA',
    zip: '16602',
    salePrice: 132000,
    saleDate: '2025-10-22',
    sqft: 1900,
    bedrooms: 3,
    bathrooms: 2.5,
    yearBuilt: 1988,
    pricePerSqft: 69.47,
    distanceMiles: 0.5,
    similarityScore: 88,
    source: 'MLS',
  },
  {
    id: 'comp-3',
    address: '321 Pine Road',
    city: 'Altoona',
    state: 'PA',
    zip: '16601',
    salePrice: 121000,
    saleDate: '2025-09-30',
    sqft: 1820,
    bedrooms: 3,
    bathrooms: 2,
    yearBuilt: 1980,
    pricePerSqft: 66.48,
    distanceMiles: 0.7,
    similarityScore: 85,
    source: 'MLS',
  },
  {
    id: 'comp-4',
    address: '654 Maple Drive',
    city: 'Altoona',
    state: 'PA',
    zip: '16602',
    salePrice: 128000,
    saleDate: '2025-12-05',
    sqft: 1850,
    bedrooms: 4,
    bathrooms: 2,
    yearBuilt: 1986,
    pricePerSqft: 69.19,
    distanceMiles: 0.4,
    similarityScore: 90,
    source: 'MLS',
  },
];

/**
 * Sample recommendation data
 */
const sampleRecommendation: InvestmentRecommendation = {
  verdict: 'strong_buy',
  confidence: 85,
  maxBid: 52500,
  targetProfit: 76875,
  exitStrategy: 'flip',
  timelineMonths: 6,
  keyFactors: [
    'Strong ROI of 159.7% exceeds 30% threshold',
    'Property priced at 12% of ARV (target: <70%)',
    'Moderate rehab costs with clear scope',
    'Growing market with 5% annual appreciation',
  ],
  risks: [
    'Judicial sale - title may have issues',
    'Property vacant for 2+ years',
    'Roof age unknown - budget for inspection',
  ],
  opportunities: [
    'Below-market acquisition price',
    'Strong rental demand in area ($1,400/mo potential)',
    'Recent comparable sales support ARV estimate',
  ],
};

/**
 * Sample data quality assessment
 */
const sampleDataQuality: DataQualityAssessment = {
  overallScore: 78,
  components: {
    comparablesQuality: 85,
    costEstimateAccuracy: 72,
    marketDataFreshness: 80,
    propertyDataCompleteness: 75,
  },
  missingData: ['Interior photos', 'Utility history', 'Detailed inspection report'],
  assumptions: [
    'Standard rehab scope assumed based on property age',
    'Market conditions assumed stable for 6-month holding period',
    'No major structural issues assumed without inspection',
  ],
};

/**
 * Complete financial analysis data for the dashboard
 */
const sampleFinancialAnalysis: FinancialAnalysis = {
  costs: {
    acquisition: {
      bidAmount: 15000,
      buyersPremium: 750,
      transferTax: 150,
      recordingFees: 75,
      titleSearch: 350,
      titleInsurance: 500,
      legalFees: 400,
      totalAcquisition: 17225,
    },
    rehab: {
      exterior: {
        roof: 0,
        siding: 1500,
        windows: 0,
        doors: 300,
        landscaping: 800,
        hardscape: 400,
        total: 3000,
      },
      interior: {
        flooring: 2500,
        paint: 1800,
        kitchen: 2500,
        bathrooms: 1200,
        electrical: 0,
        plumbing: 0,
        hvac: 0,
        fixtures: 0,
        total: 8000,
      },
      structural: {
        foundation: 0,
        framing: 0,
        insulation: 0,
        total: 0,
      },
      permits: 500,
      laborMultiplier: 0.95,
      materialMultiplier: 0.98,
      totalRehab: 11500,
    },
    holding: {
      monthlyTaxes: 150,
      monthlyInsurance: 100,
      monthlyUtilities: 150,
      monthlyMaintenance: 100,
      monthlyLoanPayment: 0,
      monthlyHoa: 0,
      totalMonthly: 500,
      holdingPeriodMonths: 6,
      totalHolding: 3000,
    },
    selling: {
      agentCommission: 7500,
      closingCosts: 2000,
      staging: 500,
      marketing: 300,
      homeWarranty: 400,
      sellerConcessions: 0,
      totalSelling: 10700,
    },
    totalCosts: 42425,
    contingency: 4243,
    grandTotal: 46668,
    confidence: 'medium',
    dataQuality: 78,
    warnings: [
      'Rehab estimate based on exterior condition only',
      'No interior inspection performed',
    ],
  },
  revenue: {
    sale: {
      estimatedARV: 125000,
      lowEstimate: 115000,
      highEstimate: 135000,
      pricePerSqft: 69.44,
      comparablesUsed: 4,
      confidence: 'high',
    },
    rental: {
      monthlyRent: 1400,
      annualGrossRent: 16800,
      vacancyRate: 0.08,
      effectiveGrossIncome: 15456,
      annualOperatingExpenses: 4800,
      noi: 10656,
      monthlyCashFlow: 888,
      annualCashFlow: 10656,
    },
  },
  metrics: {
    roi: 159.7,
    profitMargin: 61.5,
    priceToARV: 0.12,
    totalInvestmentToARV: 0.37,
    cashOnCash: 44.9,
    netProfit: 78332,
    grossProfit: 110000,
    breakEvenPrice: 46668,
    irr: 319.4,
    capRate: 8.5,
  },
  comparables: {
    comparables: sampleComparables,
    estimatedARV: 125000,
    arvLowRange: 115000,
    arvHighRange: 135000,
    averagePricePerSqft: 68.14,
    medianPricePerSqft: 68.31,
    comparablesCount: 4,
    searchRadiusMiles: 1.0,
    confidence: 'high',
    dataSource: 'MLS',
    notes: [
      'All comparables within 1 mile radius',
      'Sales within last 6 months',
      'Similar bed/bath counts',
    ],
  },
  recommendation: sampleRecommendation,
  analysisDate: new Date().toISOString(),
  confidenceLevel: 85,
  dataQuality: sampleDataQuality,
};

// ============================================
// Helper Components
// ============================================

/**
 * Section header with colored accent
 */
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  accentColor = 'blue',
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  accentColor?: 'blue' | 'green' | 'orange' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  };

  return (
    <div className="flex items-start gap-4 mb-6">
      <div className={`p-3 rounded-xl border ${colorClasses[accentColor]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {subtitle && (
          <p className="text-slate-600 dark:text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Feature card for component features section
 */
function FeatureCard({
  title,
  features,
  accentColor = 'blue',
}: {
  title: string;
  features: string[];
  accentColor?: 'blue' | 'green' | 'purple';
}) {
  const borderColorClass = {
    blue: 'border-l-blue-500',
    green: 'border-l-emerald-500',
    purple: 'border-l-purple-500',
  };

  return (
    <Card className={`border-l-4 ${borderColorClass[accentColor]} shadow-sm hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
            <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <span>{feature}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================
// Demo Page Component
// ============================================

export default function FinancialDemoPage() {
  // Calculate score display
  const scoreValue = 97;
  const scoreMax = 125;
  const scorePercent = Math.round((scoreValue / scoreMax) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero Header with Score */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500" />

        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative container mx-auto px-4 py-12 md:py-16">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Left side - Score and verdict */}
            <div className="flex items-center gap-6 md:gap-8">
              {/* Score circle */}
              <div className="relative">
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/40">
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white">
                      {scoreValue}
                    </div>
                    <div className="text-sm md:text-base text-white/80 font-medium">
                      / {scoreMax}
                    </div>
                  </div>
                </div>
                {/* Circular progress indicator */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="white"
                    strokeWidth="4"
                    strokeOpacity="0.3"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${scorePercent * 2.89} 289`}
                  />
                </svg>
              </div>

              {/* Verdict text */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-6 w-6 md:h-7 md:w-7 text-white" />
                  <span className="text-2xl md:text-3xl font-bold text-white">
                    STRONG BUY
                  </span>
                </div>
                <p className="text-white/90 text-sm md:text-base max-w-md">
                  Excellent investment opportunity with high confidence.
                  This property meets all criteria for a profitable flip.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    159.7% ROI
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                    <Clock className="h-3 w-3 mr-1" />
                    6 Month Flip
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                    <Shield className="h-3 w-3 mr-1" />
                    85% Confidence
                  </Badge>
                </div>
              </div>
            </div>

            {/* Right side - Property info and key metrics */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 md:p-6 border border-white/20">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white">
                    {sampleProperty.address}
                  </h1>
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>{sampleProperty.county} County, {sampleProperty.state}</span>
                    <span className="mx-1">|</span>
                    <span className="font-mono text-xs">{sampleProperty.parcelId}</span>
                  </div>
                </div>
              </div>

              {/* Key metrics row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white">
                    $52,500
                  </div>
                  <div className="text-xs text-white/70 uppercase tracking-wide">
                    Max Bid
                  </div>
                </div>
                <div className="text-center border-x border-white/20">
                  <div className="text-2xl md:text-3xl font-bold text-white">
                    $125K
                  </div>
                  <div className="text-xs text-white/70 uppercase tracking-wide">
                    Est. ARV
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white">
                    $78,332
                  </div>
                  <div className="text-xs text-white/70 uppercase tracking-wide">
                    Net Profit
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Property Quick Stats Bar */}
      <div className="border-b bg-white dark:bg-slate-900 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4 overflow-x-auto gap-6">
            <div className="flex items-center gap-2 text-sm whitespace-nowrap">
              <Ruler className="h-4 w-4 text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">{sampleProperty.squareFeet}</span>
              <span className="text-slate-500">Sq Ft</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 text-sm whitespace-nowrap">
              <BedDouble className="h-4 w-4 text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">{sampleProperty.bedrooms}</span>
              <span className="text-slate-500">Beds</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 text-sm whitespace-nowrap">
              <Bath className="h-4 w-4 text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">{sampleProperty.bathrooms}</span>
              <span className="text-slate-500">Baths</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 text-sm whitespace-nowrap">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">{sampleProperty.yearBuilt}</span>
              <span className="text-slate-500">Built</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 text-sm whitespace-nowrap">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">{sampleProperty.lotSize}</span>
              <span className="text-slate-500">Acres</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 text-sm whitespace-nowrap">
              <DollarSign className="h-4 w-4 text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">${(sampleProperty.assessedValue / 1000).toFixed(0)}K</span>
              <span className="text-slate-500">Assessed</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <Badge variant="secondary" className="capitalize whitespace-nowrap bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800">
              {sampleProperty.saleType} Sale
            </Badge>
            <div className="flex items-center gap-2 text-sm whitespace-nowrap">
              <span className="text-slate-500">Taxes Due:</span>
              <span className="font-bold text-lg text-red-600 dark:text-red-400">
                ${sampleProperty.totalDue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-10 space-y-12">
        {/* Financial Dashboard Section */}
        <section>
          <SectionHeader
            icon={BarChart3}
            title="Financial Dashboard"
            subtitle="Complete 5-tab dashboard with Overview, Costs, Returns, Comparables, and Calculator sections. Interactive interface aggregating all financial analysis."
            accentColor="blue"
          />
          <FinancialDashboard
            analysis={sampleFinancialAnalysis}
            propertyId={sampleProperty.id}
            onRecalculate={(params) => {
              console.log('Recalculate requested with:', params);
            }}
          />
        </section>

        {/* Section Divider */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white dark:bg-slate-900 px-4 text-sm text-slate-500 dark:text-slate-400">
              Individual Components
            </span>
          </div>
        </div>

        {/* Recommendation Card Section */}
        <section>
          <SectionHeader
            icon={Target}
            title="Investment Recommendation Card"
            subtitle="Standalone recommendation component showing verdict, confidence score, max bid, key factors, risks, and opportunities."
            accentColor="green"
          />
          <div className="max-w-3xl">
            <RecommendationCard
              recommendation={sampleRecommendation}
              showDetails={true}
            />
          </div>
        </section>

        {/* Section Divider */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white dark:bg-slate-900 px-4 text-sm text-slate-500 dark:text-slate-400">
              Data Quality Assessment
            </span>
          </div>
        </div>

        {/* Data Quality Indicator Section */}
        <section>
          <SectionHeader
            icon={Shield}
            title="Data Quality Indicator"
            subtitle="Overall data quality score with component breakdown including comparables quality, cost estimate accuracy, market data freshness, and property data completeness."
            accentColor="purple"
          />
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                Full Variant
              </h3>
              <DataQualityIndicator
                quality={sampleDataQuality}
                variant="full"
                showDetails={true}
              />
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Compact Variant
                </h3>
                <DataQualityIndicator
                  quality={sampleDataQuality}
                  variant="compact"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Badge Variant
                </h3>
                <DataQualityIndicator
                  quality={sampleDataQuality}
                  variant="badge"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white dark:bg-slate-900 px-4 text-sm text-slate-500 dark:text-slate-400">
              Component Overview
            </span>
          </div>
        </div>

        {/* Component Features Summary */}
        <section>
          <SectionHeader
            icon={Calculator}
            title="Component Features"
            subtitle="Summary of capabilities provided by each component in the financial analysis system."
            accentColor="orange"
          />
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              title="Financial Dashboard"
              accentColor="blue"
              features={[
                '5-tab navigation (Overview, Costs, Returns, Comps, Calculator)',
                'Interactive cost pie chart with breakdown',
                'Profit waterfall visualization',
                'ROI comparison charts',
                'Comparables scatter plot',
                'Investment calculator with live updates',
              ]}
            />
            <FeatureCard
              title="Recommendation Card"
              accentColor="green"
              features={[
                '5 verdict levels (Strong Buy to Avoid)',
                'Color-coded header by verdict',
                'Confidence score with progress bar',
                'Max bid and target profit display',
                'Exit strategy recommendation',
                'Collapsible detailed analysis',
              ]}
            />
            <FeatureCard
              title="Data Quality Indicator"
              accentColor="purple"
              features={[
                '4 quality levels (Excellent to Poor)',
                'Component-level score breakdown',
                'Missing data field badges',
                'Assumptions documentation',
                '3 display variants (full, compact, badge)',
                'Tooltips with detailed explanations',
              ]}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 pb-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-400 mb-4">
              <Calculator className="h-4 w-4" />
              Tax Deed Flow - Phase 8D-8E Financial Analysis
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Investment Recommendation Engine with Cost Breakdown, ROI Analysis, and Data Quality Assessment
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
