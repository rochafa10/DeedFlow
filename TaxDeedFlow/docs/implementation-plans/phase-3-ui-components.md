# Phase 3: Report UI Components

## Overview
Build all 16 report sections as reusable React components with charts, maps, and responsive layouts using shadcn/ui and Tailwind CSS. This phase includes comprehensive accessibility support, loading/error states, print optimization, and dark mode theming.

## Component Architecture

```
src/components/reports/
├── sections/
│   ├── ExecutiveSummary.tsx
│   ├── PropertyStrengths.tsx
│   ├── PropertyConcerns.tsx
│   ├── PropertyData.tsx
│   ├── SatelliteMap.tsx
│   ├── StreetMap.tsx
│   ├── LocationContext.tsx
│   ├── SlopeAnalysis.tsx
│   ├── InsuranceRisk.tsx
│   ├── FinancialAnalysis.tsx
│   ├── ComparableSales.tsx
│   ├── ScoreBreakdown.tsx
│   ├── Demographics.tsx
│   ├── FEMAFloodMap.tsx
│   ├── ZoningInfo.tsx
│   ├── MarketAnalysis.tsx
│   └── Disclaimer.tsx
├── charts/
│   ├── ScoreGauge.tsx
│   ├── InvestmentBarChart.tsx
│   ├── CostBreakdownPie.tsx
│   ├── ScoreBreakdownRadar.tsx
│   ├── TrendLineChart.tsx
│   └── AccessibleDataTable.tsx    # Screen reader alternative
├── maps/
│   ├── ReportSatelliteMap.tsx
│   ├── ReportStreetMap.tsx
│   └── FEMAFloodMapImage.tsx
├── shared/
│   ├── ReportCard.tsx
│   ├── ReportSection.tsx
│   ├── ReportBadge.tsx
│   ├── MetricDisplay.tsx
│   ├── RiskIndicator.tsx
│   ├── ConfidenceBar.tsx
│   ├── GradeDisplay.tsx
│   ├── LoadingState.tsx
│   ├── ErrorState.tsx
│   ├── EmptyState.tsx
│   └── SkipLink.tsx
├── utils/
│   ├── animations.ts
│   └── print-styles.css
├── types/
│   └── report-types.ts
└── PropertyReport.tsx              # Main report container
```

---

## TypeScript Types

```tsx
// src/components/reports/types/report-types.ts

// Base types
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type InvestmentRating = 'Strong Buy' | 'Buy' | 'Hold' | 'Caution' | 'Avoid';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme';
export type TrendDirection = 'up' | 'down' | 'neutral';
export type ComponentSize = 'sm' | 'md' | 'lg' | 'xl';

// Score types
export interface ScoreFactor {
  name: string;
  score: number;
  max: number;
  description?: string;
}

export interface ScoreCategory {
  score: number;
  factors: ScoreFactor[];
  weight?: number;
}

export interface ScoreBreakdownData {
  location: ScoreCategory;
  risk: ScoreCategory;
  financial: ScoreCategory;
  market: ScoreCategory;
  profit: ScoreCategory;
}

// Executive Summary types
export interface ExecutiveSummaryData {
  grade: Grade;
  totalScore: number;
  maxScore: number;
  verdict: string;
  investmentRating: InvestmentRating;
  keyHighlights: string[];
  criticalRisks: string[];
  estimatedROI: number;
  confidenceLevel: number;
}

// Risk types
export interface FloodRisk {
  risk: RiskLevel;
  zone: string;
  insuranceRequired: boolean;
  annualProbability?: number;
}

export interface EarthquakeRisk {
  risk: RiskLevel;
  recentActivity: number;
  magnitude?: number;
}

export interface WildfireRisk {
  risk: RiskLevel;
  nearestFireMiles?: number;
  vegetationType?: string;
}

export interface HurricaneRisk {
  risk: RiskLevel;
  category?: number;
  historicalLandfalls?: number;
}

export interface InsuranceRiskData {
  overallRisk: RiskLevel;
  estimatedAnnualPremium: number;
  flood: FloodRisk;
  earthquake: EarthquakeRisk;
  wildfire: WildfireRisk;
  hurricane: HurricaneRisk;
}

// Property types
export interface PropertyCoordinates {
  latitude: number;
  longitude: number;
}

export interface PropertyDataDetails {
  address: string;
  city: string;
  state: string;
  zip: string;
  parcelId: string;
  lotSize: number;
  lotSizeUnit: 'sqft' | 'acres';
  yearBuilt?: number;
  buildingSqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  zoning?: string;
  coordinates: PropertyCoordinates;
}

// Financial types
export interface CostItem {
  name: string;
  value: number;
  color: string;
  description?: string;
}

export interface FinancialProjection {
  year: number;
  value: number;
  equity?: number;
  cashFlow?: number;
}

export interface FinancialAnalysisData {
  purchasePrice: number;
  estimatedMarketValue: number;
  estimatedRehab: number;
  closingCosts: number;
  holdingCosts: number;
  totalInvestment: number;
  projectedProfit: number;
  roi: number;
  capRate?: number;
  cashOnCash?: number;
  costBreakdown: CostItem[];
  projections: FinancialProjection[];
}

// Comparable sales types
export interface ComparableSale {
  id: string;
  address: string;
  salePrice: number;
  saleDate: string;
  sqft: number;
  pricePerSqft: number;
  distance: number;
  similarity: number;
  bedrooms?: number;
  bathrooms?: number;
}

export interface ComparableSalesData {
  comparables: ComparableSale[];
  medianPrice: number;
  medianPricePerSqft: number;
  adjustedValue: number;
}

// Chart data types
export interface RadarDataPoint {
  category: string;
  score: number;
  maxScore: number;
  fullMark?: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

// Component state types
export interface LoadingStateProps {
  message?: string;
  size?: ComponentSize;
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Report section props
export interface ReportSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  id?: string;
  'aria-label'?: string;
}

// Full report type
export interface PropertyReportData {
  executiveSummary: ExecutiveSummaryData;
  propertyData: PropertyDataDetails;
  propertyStrengths: string[];
  propertyConcerns: string[];
  locationContext: Record<string, unknown>;
  slopeAnalysis: Record<string, unknown>;
  insuranceRisk: InsuranceRiskData;
  financialAnalysis: FinancialAnalysisData;
  comparables: ComparableSalesData;
  scoreBreakdown: ScoreBreakdownData;
  demographics: Record<string, unknown>;
  femaFloodData: Record<string, unknown>;
  zoningInfo: Record<string, unknown>;
  marketAnalysis: Record<string, unknown>;
  disclaimer: string;
}

export interface PropertyReport {
  id: string;
  property_id: string;
  report_data: PropertyReportData;
  generated_at: string;
  confidence_level: number;
  version: string;
}
```

---

## Animation & Transition Utilities

```tsx
// src/components/reports/utils/animations.ts
import { cn } from '@/lib/utils';

// Animation class utilities
export const animations = {
  // Fade animations
  fadeIn: 'animate-in fade-in duration-300',
  fadeOut: 'animate-out fade-out duration-300',
  fadeInUp: 'animate-in fade-in slide-in-from-bottom-4 duration-300',
  fadeInDown: 'animate-in fade-in slide-in-from-top-4 duration-300',

  // Scale animations
  scaleIn: 'animate-in zoom-in-95 duration-200',
  scaleOut: 'animate-out zoom-out-95 duration-200',

  // Slide animations
  slideInLeft: 'animate-in slide-in-from-left duration-300',
  slideInRight: 'animate-in slide-in-from-right duration-300',
  slideInUp: 'animate-in slide-in-from-bottom duration-300',
  slideInDown: 'animate-in slide-in-from-top duration-300',

  // Collapse/Expand
  collapseDown: 'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',

  // Skeleton loading pulse
  pulse: 'animate-pulse',

  // Spin for loading
  spin: 'animate-spin',
} as const;

// Transition utilities
export const transitions = {
  default: 'transition-all duration-200 ease-in-out',
  fast: 'transition-all duration-150 ease-in-out',
  slow: 'transition-all duration-500 ease-in-out',
  colors: 'transition-colors duration-200 ease-in-out',
  transform: 'transition-transform duration-200 ease-in-out',
  opacity: 'transition-opacity duration-200 ease-in-out',
} as const;

// Motion-reduced alternatives
export const motionSafe = (className: string) =>
  cn('motion-reduce:transition-none motion-reduce:animate-none', className);

// Staggered animation helper
export const staggerDelay = (index: number, baseDelay = 50) => ({
  style: { animationDelay: `${index * baseDelay}ms` }
});

// Animation on scroll intersection observer hook
export function useAnimateOnScroll(threshold = 0.1) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
```

---

## Print Styles

```css
/* src/components/reports/utils/print-styles.css */

@media print {
  /* Hide non-printable elements */
  .print\\:hidden,
  button,
  .no-print {
    display: none !important;
  }

  /* Show print-only elements */
  .print\\:block {
    display: block !important;
  }

  /* Reset backgrounds for better printing */
  body {
    background: white !important;
    color: black !important;
    font-size: 12pt !important;
    line-height: 1.4 !important;
  }

  /* Page setup */
  @page {
    size: letter portrait;
    margin: 0.75in 0.5in;
  }

  /* First page */
  @page :first {
    margin-top: 0.5in;
  }

  /* Prevent breaks inside sections */
  .print\\:break-inside-avoid {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Force page break before */
  .print\\:break-before {
    break-before: page;
    page-break-before: always;
  }

  /* Force page break after */
  .print\\:break-after {
    break-after: page;
    page-break-after: always;
  }

  /* Keep headers with content */
  h1, h2, h3, h4, h5, h6 {
    break-after: avoid;
    page-break-after: avoid;
  }

  /* Avoid orphans and widows */
  p, li {
    orphans: 3;
    widows: 3;
  }

  /* Tables */
  table {
    border-collapse: collapse !important;
  }

  thead {
    display: table-header-group;
  }

  tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Links - show URL after link text */
  a[href^="http"]:after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
    color: #666;
  }

  /* Charts - ensure visibility */
  .recharts-wrapper {
    overflow: visible !important;
  }

  /* Maps - ensure static display */
  .leaflet-container {
    height: 300px !important;
  }

  /* Cards */
  .card {
    border: 1px solid #ddd !important;
    box-shadow: none !important;
    margin-bottom: 1rem !important;
  }

  /* Badges - ensure readability */
  .badge {
    border: 1px solid currentColor !important;
    background: transparent !important;
  }

  /* Grade display */
  .grade-display {
    border: 3px solid currentColor !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Risk indicators - preserve colors */
  .risk-low { color: #16a34a !important; }
  .risk-moderate { color: #ca8a04 !important; }
  .risk-high { color: #ea580c !important; }
  .risk-extreme { color: #dc2626 !important; }

  /* Footer */
  .print-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 10pt;
    color: #666;
    padding: 0.25in 0;
    border-top: 1px solid #ddd;
  }
}

/* High contrast mode for accessibility */
@media (forced-colors: active) {
  .grade-display,
  .risk-indicator,
  .badge {
    forced-color-adjust: none;
  }
}
```

---

## Loading, Error, and Empty State Components

```tsx
// src/components/reports/shared/LoadingState.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations } from '../utils/animations';
import type { LoadingStateProps, ComponentSize } from '../types/report-types';

const sizeClasses: Record<ComponentSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const containerSizes: Record<ComponentSize, string> = {
  sm: 'p-4',
  md: 'p-8',
  lg: 'p-12',
  xl: 'p-16',
};

export function LoadingState({
  message = 'Loading...',
  size = 'md'
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        containerSizes[size],
        animations.fadeIn
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className={cn(sizeClasses[size], animations.spin, 'text-primary')}
        aria-hidden="true"
      />
      <span className="mt-4 text-muted-foreground">{message}</span>
      <span className="sr-only">Loading content, please wait</span>
    </div>
  );
}

// Skeleton variants for different content types
export function LoadingSkeleton({
  variant = 'text',
  lines = 3,
  className
}: {
  variant?: 'text' | 'card' | 'chart' | 'table';
  lines?: number;
  className?: string;
}) {
  const skeletonBase = cn('bg-muted rounded', animations.pulse);

  switch (variant) {
    case 'card':
      return (
        <div className={cn('space-y-4 p-6 border rounded-lg', className)}>
          <div className={cn(skeletonBase, 'h-6 w-1/3')} />
          <div className={cn(skeletonBase, 'h-24 w-full')} />
          <div className="flex gap-4">
            <div className={cn(skeletonBase, 'h-10 w-20')} />
            <div className={cn(skeletonBase, 'h-10 w-20')} />
          </div>
        </div>
      );

    case 'chart':
      return (
        <div className={cn('p-6 border rounded-lg', className)}>
          <div className={cn(skeletonBase, 'h-6 w-1/4 mb-4')} />
          <div className={cn(skeletonBase, 'h-[200px] w-full')} />
        </div>
      );

    case 'table':
      return (
        <div className={cn('space-y-2', className)}>
          <div className={cn(skeletonBase, 'h-10 w-full')} />
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className={cn(skeletonBase, 'h-12 w-full')} />
          ))}
        </div>
      );

    default: // text
      return (
        <div className={cn('space-y-2', className)}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                skeletonBase,
                'h-4',
                i === lines - 1 ? 'w-2/3' : 'w-full'
              )}
            />
          ))}
        </div>
      );
  }
}
```

```tsx
// src/components/reports/shared/ErrorState.tsx
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { animations } from '../utils/animations';
import type { ErrorStateProps } from '../types/report-types';

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again'
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        animations.fadeIn
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle
          className="h-8 w-8 text-destructive"
          aria-hidden="true"
        />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
```

```tsx
// src/components/reports/shared/EmptyState.tsx
import React from 'react';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { animations } from '../utils/animations';
import type { EmptyStateProps } from '../types/report-types';

export function EmptyState({
  title,
  description,
  icon,
  action
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        animations.fadeIn
      )}
      role="status"
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        {icon || <FileQuestion className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground mb-4 max-w-md">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

---

## Skip Link for Accessibility

```tsx
// src/components/reports/shared/SkipLink.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only',
        'focus:absolute focus:top-4 focus:left-4 focus:z-50',
        'focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground',
        'focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring'
      )}
    >
      {children}
    </a>
  );
}
```

---

## Shared Components

### ReportSection (Enhanced with Accessibility)
```tsx
// src/components/reports/shared/ReportSection.tsx
import React, { useState, useId } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations, transitions } from '../utils/animations';
import type { ReportSectionProps } from '../types/report-types';

export function ReportSection({
  title,
  icon,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  id,
  'aria-label': ariaLabel
}: ReportSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const generatedId = useId();
  const sectionId = id || generatedId;
  const contentId = `${sectionId}-content`;
  const headerId = `${sectionId}-header`;

  const handleToggle = () => {
    if (collapsible) {
      setIsOpen(!isOpen);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <Card
      className={cn('print:break-inside-avoid', animations.fadeInUp, className)}
      id={sectionId}
    >
      <CardHeader
        id={headerId}
        className={cn(
          'flex flex-row items-center gap-2',
          transitions.colors,
          collapsible && 'cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50'
        )}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
        aria-controls={collapsible ? contentId : undefined}
        aria-label={ariaLabel || title}
      >
        {icon && <span aria-hidden="true">{icon}</span>}
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {collapsible && (
          <ChevronDown
            className={cn(
              'ml-auto h-4 w-4',
              transitions.transform,
              !isOpen && '-rotate-90'
            )}
            aria-hidden="true"
          />
        )}
      </CardHeader>
      <div
        id={contentId}
        role="region"
        aria-labelledby={headerId}
        hidden={collapsible && !isOpen}
      >
        {(isOpen || !collapsible) && (
          <CardContent className={animations.fadeIn}>
            {children}
          </CardContent>
        )}
      </div>
    </Card>
  );
}
```

### GradeDisplay (Enhanced with Accessibility and Dark Mode)
```tsx
// src/components/reports/shared/GradeDisplay.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { animations } from '../utils/animations';
import type { Grade, ComponentSize } from '../types/report-types';

interface GradeDisplayProps {
  grade: Grade;
  score: number;
  maxScore?: number;
  size?: Exclude<ComponentSize, 'xl'>;
  showLabel?: boolean;
}

// Color tokens that work in both light and dark modes
const gradeColors: Record<Grade, { bg: string; text: string; border: string }> = {
  A: {
    bg: 'bg-green-500 dark:bg-green-600',
    text: 'text-white',
    border: 'border-green-600 dark:border-green-500'
  },
  B: {
    bg: 'bg-lime-500 dark:bg-lime-600',
    text: 'text-white',
    border: 'border-lime-600 dark:border-lime-500'
  },
  C: {
    bg: 'bg-yellow-500 dark:bg-yellow-600',
    text: 'text-black dark:text-white',
    border: 'border-yellow-600 dark:border-yellow-500'
  },
  D: {
    bg: 'bg-orange-500 dark:bg-orange-600',
    text: 'text-white',
    border: 'border-orange-600 dark:border-orange-500'
  },
  F: {
    bg: 'bg-red-500 dark:bg-red-600',
    text: 'text-white',
    border: 'border-red-600 dark:border-red-500'
  }
};

const gradeLabels: Record<Grade, string> = {
  A: 'Excellent',
  B: 'Good',
  C: 'Average',
  D: 'Below Average',
  F: 'Poor'
};

const sizes: Record<Exclude<ComponentSize, 'xl'>, string> = {
  sm: 'h-12 w-12 text-xl',
  md: 'h-20 w-20 text-3xl',
  lg: 'h-32 w-32 text-5xl'
};

export function GradeDisplay({
  grade,
  score,
  maxScore = 125,
  size = 'md',
  showLabel = true
}: GradeDisplayProps) {
  const colors = gradeColors[grade];
  const percentage = Math.round((score / maxScore) * 100);

  return (
    <div
      className={cn('flex flex-col items-center gap-2', animations.scaleIn)}
      role="img"
      aria-label={`Grade ${grade}: ${gradeLabels[grade]}. Score ${score} out of ${maxScore} points (${percentage}%)`}
    >
      <div
        className={cn(
          'grade-display rounded-full flex items-center justify-center font-bold',
          'border-4 print:border-2',
          colors.bg,
          colors.text,
          colors.border,
          sizes[size]
        )}
        aria-hidden="true"
      >
        {grade}
      </div>
      {showLabel && (
        <>
          <div className="text-sm font-medium" aria-hidden="true">
            {gradeLabels[grade]}
          </div>
          <div className="text-sm text-muted-foreground" aria-hidden="true">
            {score} / {maxScore} points
          </div>
        </>
      )}
    </div>
  );
}
```

### RiskIndicator (Enhanced with Accessibility)
```tsx
// src/components/reports/shared/RiskIndicator.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { animations } from '../utils/animations';
import type { RiskLevel } from '../types/report-types';

interface RiskIndicatorProps {
  level: RiskLevel;
  label: string;
  description?: string;
  showIcon?: boolean;
}

const riskConfig: Record<RiskLevel, {
  icon: typeof CheckCircle;
  color: string;
  bg: string;
  darkBg: string;
  label: string;
  printClass: string;
}> = {
  low: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    darkBg: 'dark:bg-green-950',
    label: 'Low Risk',
    printClass: 'risk-low'
  },
  moderate: {
    icon: AlertCircle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    darkBg: 'dark:bg-yellow-950',
    label: 'Moderate Risk',
    printClass: 'risk-moderate'
  },
  high: {
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    darkBg: 'dark:bg-orange-950',
    label: 'High Risk',
    printClass: 'risk-high'
  },
  extreme: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    darkBg: 'dark:bg-red-950',
    label: 'Extreme Risk',
    printClass: 'risk-extreme'
  }
};

export function RiskIndicator({
  level,
  label,
  description,
  showIcon = true
}: RiskIndicatorProps) {
  const config = riskConfig[level];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'risk-indicator flex items-start gap-3 p-3 rounded-lg',
        config.bg,
        config.printClass,
        animations.fadeIn
      )}
      role="status"
      aria-label={`${label}: ${config.label}${description ? `. ${description}` : ''}`}
    >
      {showIcon && (
        <Icon
          className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.color)}
          aria-hidden="true"
        />
      )}
      <div>
        <div className="font-medium flex items-center gap-2">
          {label}
          <span className={cn('text-xs font-normal', config.color)}>
            ({config.label})
          </span>
        </div>
        {description && (
          <div className="text-sm text-muted-foreground mt-1">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
```

### MetricDisplay (Enhanced with Accessibility)
```tsx
// src/components/reports/shared/MetricDisplay.tsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations } from '../utils/animations';
import type { TrendDirection } from '../types/report-types';

interface MetricDisplayProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: TrendDirection;
  trendValue?: string;
  icon?: React.ReactNode;
  format?: 'currency' | 'percent' | 'number' | 'text';
}

const trendConfig: Record<TrendDirection, {
  icon: typeof TrendingUp;
  color: string;
  label: string;
}> = {
  up: {
    icon: TrendingUp,
    color: 'text-green-500 dark:text-green-400',
    label: 'Increasing'
  },
  down: {
    icon: TrendingDown,
    color: 'text-red-500 dark:text-red-400',
    label: 'Decreasing'
  },
  neutral: {
    icon: Minus,
    color: 'text-muted-foreground',
    label: 'Stable'
  }
};

export function MetricDisplay({
  label,
  value,
  subValue,
  trend,
  trendValue,
  icon,
  format = 'text'
}: MetricDisplayProps) {
  const TrendIcon = trend ? trendConfig[trend].icon : null;
  const trendColor = trend ? trendConfig[trend].color : '';
  const trendLabel = trend ? trendConfig[trend].label : '';

  const formattedValue = React.useMemo(() => {
    if (typeof value === 'string') return value;
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percent':
        return `${value}%`;
      case 'number':
        return new Intl.NumberFormat('en-US').format(value);
      default:
        return String(value);
    }
  }, [value, format]);

  return (
    <div
      className={cn('flex flex-col', animations.fadeIn)}
      role="group"
      aria-label={`${label}: ${formattedValue}${trend ? `, ${trendLabel}` : ''}`}
    >
      <div className="text-sm text-muted-foreground flex items-center gap-1">
        {icon && <span aria-hidden="true">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold flex items-center gap-2">
        <span>{formattedValue}</span>
        {TrendIcon && (
          <span className={cn('flex items-center gap-1', trendColor)}>
            <TrendIcon className="h-4 w-4" aria-hidden="true" />
            {trendValue && <span className="text-sm">{trendValue}</span>}
            <span className="sr-only">{trendLabel}</span>
          </span>
        )}
      </div>
      {subValue && (
        <div className="text-xs text-muted-foreground">{subValue}</div>
      )}
    </div>
  );
}
```

---

## Accessible Chart Wrapper with Data Table Alternative

```tsx
// src/components/reports/charts/AccessibleChartWrapper.tsx
import React, { useState, useId } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart3, Table as TableIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { transitions } from '../utils/animations';
import type { ChartDataPoint } from '../types/report-types';

interface AccessibleChartWrapperProps {
  title: string;
  description?: string;
  data: ChartDataPoint[];
  valueLabel?: string;
  valueFormat?: (value: number) => string;
  children: React.ReactNode; // The actual chart component
  className?: string;
}

export function AccessibleChartWrapper({
  title,
  description,
  data,
  valueLabel = 'Value',
  valueFormat = (v) => v.toLocaleString(),
  children,
  className
}: AccessibleChartWrapperProps) {
  const [showTable, setShowTable] = useState(false);
  const chartId = useId();
  const tableId = `${chartId}-table`;
  const descId = `${chartId}-desc`;

  return (
    <div className={cn('relative', className)}>
      {/* Toggle button for screen reader users */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-semibold" id={chartId}>{title}</h4>
          {description && (
            <p className="text-sm text-muted-foreground" id={descId}>
              {description}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTable(!showTable)}
          className={cn('gap-2', transitions.colors)}
          aria-pressed={showTable}
          aria-label={showTable ? 'Show chart view' : 'Show data table view'}
        >
          {showTable ? (
            <>
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Chart</span>
            </>
          ) : (
            <>
              <TableIcon className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Table</span>
            </>
          )}
        </Button>
      </div>

      {/* Chart view (hidden from screen readers when table is shown) */}
      <div
        className={cn(showTable && 'hidden')}
        role="img"
        aria-labelledby={chartId}
        aria-describedby={descId}
      >
        {children}
        {/* Hidden table for screen readers */}
        <div className="sr-only">
          <table>
            <caption>{title}</caption>
            <thead>
              <tr>
                <th>Category</th>
                <th>{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td>{valueFormat(item.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visible data table alternative */}
      {showTable && (
        <div id={tableId} role="region" aria-labelledby={chartId}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">{valueLabel}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">
                    {valueFormat(item.value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
```

---

## Section Components

### Executive Summary (Enhanced)
```tsx
// src/components/reports/sections/ExecutiveSummary.tsx
import React from 'react';
import { ReportSection } from '../shared/ReportSection';
import { GradeDisplay } from '../shared/GradeDisplay';
import { MetricDisplay } from '../shared/MetricDisplay';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations, staggerDelay } from '../utils/animations';
import type { ExecutiveSummaryData, InvestmentRating } from '../types/report-types';

interface ExecutiveSummaryProps {
  data: ExecutiveSummaryData;
  isLoading?: boolean;
}

const ratingColors: Record<InvestmentRating, string> = {
  'Strong Buy': 'bg-green-500 dark:bg-green-600 text-white',
  'Buy': 'bg-lime-500 dark:bg-lime-600 text-white',
  'Hold': 'bg-yellow-500 dark:bg-yellow-600 text-black dark:text-white',
  'Caution': 'bg-orange-500 dark:bg-orange-600 text-white',
  'Avoid': 'bg-red-500 dark:bg-red-600 text-white'
};

const ratingDescriptions: Record<InvestmentRating, string> = {
  'Strong Buy': 'Highly recommended investment opportunity',
  'Buy': 'Good investment opportunity',
  'Hold': 'Consider carefully before investing',
  'Caution': 'Significant risks present',
  'Avoid': 'Not recommended for investment'
};

export function ExecutiveSummary({ data, isLoading }: ExecutiveSummaryProps) {
  if (isLoading) {
    return (
      <ReportSection title="Executive Summary" icon={<FileText className="h-5 w-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex justify-center">
            <div className={cn('h-32 w-32 rounded-full', animations.pulse, 'bg-muted')} />
          </div>
          <div className="space-y-4">
            <div className={cn('h-20 w-full rounded', animations.pulse, 'bg-muted')} />
            <div className={cn('h-20 w-full rounded', animations.pulse, 'bg-muted')} />
          </div>
          <div className={cn('h-32 w-full rounded', animations.pulse, 'bg-muted')} />
        </div>
      </ReportSection>
    );
  }

  return (
    <ReportSection
      title="Executive Summary"
      icon={<FileText className="h-5 w-5" aria-hidden="true" />}
      id="executive-summary"
      aria-label="Executive Summary Section"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Grade and Rating */}
        <div className="flex flex-col items-center gap-4">
          <GradeDisplay
            grade={data.grade}
            score={data.totalScore}
            maxScore={data.maxScore}
            size="lg"
          />
          <Badge
            className={cn(ratingColors[data.investmentRating], 'text-sm px-4 py-1')}
            aria-label={`Investment Rating: ${data.investmentRating}. ${ratingDescriptions[data.investmentRating]}`}
          >
            {data.investmentRating}
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="space-y-4">
          <MetricDisplay
            label="Estimated ROI"
            value={data.estimatedROI}
            format="percent"
            trend={data.estimatedROI > 20 ? 'up' : data.estimatedROI < 10 ? 'down' : 'neutral'}
            icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          />
          <MetricDisplay
            label="Confidence Level"
            value={data.confidenceLevel}
            format="percent"
            subValue="Based on data availability"
          />
        </div>

        {/* Verdict */}
        <div>
          <h4 className="font-semibold mb-2">Investment Verdict</h4>
          <p className="text-sm text-muted-foreground">{data.verdict}</p>
        </div>
      </div>

      {/* Highlights and Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div role="region" aria-labelledby="highlights-heading">
          <h4
            id="highlights-heading"
            className="font-semibold mb-3 flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4 text-green-500" aria-hidden="true" />
            Key Highlights
          </h4>
          <ul className="space-y-2" aria-label="List of key highlights">
            {data.keyHighlights.map((highlight, i) => (
              <li
                key={i}
                className={cn('text-sm flex items-start gap-2', animations.fadeIn)}
                {...staggerDelay(i)}
              >
                <span className="text-green-500 font-bold" aria-hidden="true">+</span>
                {highlight}
              </li>
            ))}
          </ul>
        </div>

        <div role="region" aria-labelledby="risks-heading">
          <h4
            id="risks-heading"
            className="font-semibold mb-3 flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />
            Critical Risks
          </h4>
          <ul className="space-y-2" aria-label="List of critical risks">
            {data.criticalRisks.length > 0 ? (
              data.criticalRisks.map((risk, i) => (
                <li
                  key={i}
                  className={cn('text-sm flex items-start gap-2', animations.fadeIn)}
                  {...staggerDelay(i)}
                >
                  <span className="text-red-500 font-bold" aria-hidden="true">!</span>
                  {risk}
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">
                No critical risks identified
              </li>
            )}
          </ul>
        </div>
      </div>
    </ReportSection>
  );
}
```

### Score Breakdown (With Accessible Chart)
```tsx
// src/components/reports/sections/ScoreBreakdown.tsx
import React from 'react';
import { ReportSection } from '../shared/ReportSection';
import { ScoreBreakdownRadar } from '../charts/ScoreBreakdownRadar';
import { AccessibleChartWrapper } from '../charts/AccessibleChartWrapper';
import { Progress } from '@/components/ui/progress';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations, staggerDelay } from '../utils/animations';
import type { ScoreBreakdownData } from '../types/report-types';

interface ScoreBreakdownProps {
  data: ScoreBreakdownData;
}

const categoryConfig = [
  { key: 'location', name: 'Location', color: 'bg-blue-500', darkColor: 'dark:bg-blue-600' },
  { key: 'risk', name: 'Risk', color: 'bg-purple-500', darkColor: 'dark:bg-purple-600' },
  { key: 'financial', name: 'Financial', color: 'bg-green-500', darkColor: 'dark:bg-green-600' },
  { key: 'market', name: 'Market', color: 'bg-orange-500', darkColor: 'dark:bg-orange-600' },
  { key: 'profit', name: 'Profit', color: 'bg-red-500', darkColor: 'dark:bg-red-600' }
] as const;

export function ScoreBreakdown({ data }: ScoreBreakdownProps) {
  const categories = categoryConfig.map(config => ({
    ...config,
    ...data[config.key]
  }));

  const chartData = categories.map(c => ({
    name: c.name,
    value: c.score,
    color: c.color
  }));

  return (
    <ReportSection
      title="Score Breakdown"
      icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
      id="score-breakdown"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart with Accessible Alternative */}
        <AccessibleChartWrapper
          title="Score Distribution"
          description="Breakdown of investment scores across 5 categories"
          data={chartData}
          valueLabel="Score (out of 25)"
          valueFormat={(v) => `${v} / 25`}
        >
          <div className="h-[300px]">
            <ScoreBreakdownRadar
              data={categories.map(c => ({
                category: c.name,
                score: c.score,
                maxScore: 25
              }))}
            />
          </div>
        </AccessibleChartWrapper>

        {/* Category Details */}
        <div
          className="space-y-4"
          role="list"
          aria-label="Score categories breakdown"
        >
          {categories.map((category, index) => (
            <div
              key={category.key}
              role="listitem"
              className={animations.fadeIn}
              {...staggerDelay(index, 100)}
            >
              <div className="flex justify-between mb-1">
                <span className="font-medium">{category.name}</span>
                <span
                  className="text-sm text-muted-foreground"
                  aria-label={`${category.score} out of 25 points`}
                >
                  {category.score} / 25
                </span>
              </div>
              <Progress
                value={(category.score / 25) * 100}
                className="h-2"
                aria-label={`${category.name} score: ${Math.round((category.score / 25) * 100)}%`}
              />
              <div className="mt-1 text-xs text-muted-foreground">
                {category.factors.slice(0, 2).map(f => f.name).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ReportSection>
  );
}
```

### Insurance Risk Section (Enhanced)
```tsx
// src/components/reports/sections/InsuranceRisk.tsx
import React from 'react';
import { ReportSection } from '../shared/ReportSection';
import { RiskIndicator } from '../shared/RiskIndicator';
import { MetricDisplay } from '../shared/MetricDisplay';
import { Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations } from '../utils/animations';
import type { InsuranceRiskData, RiskLevel } from '../types/report-types';

interface InsuranceRiskProps {
  data: InsuranceRiskData;
}

export function InsuranceRisk({ data }: InsuranceRiskProps) {
  return (
    <ReportSection
      title="Insurance & Risk Assessment"
      icon={<Shield className="h-5 w-5" aria-hidden="true" />}
      id="insurance-risk"
    >
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        role="list"
        aria-label="Risk categories"
      >
        <div role="listitem">
          <RiskIndicator
            level={data.flood.risk as RiskLevel}
            label="Flood Risk"
            description={`FEMA Zone ${data.flood.zone}`}
          />
        </div>
        <div role="listitem">
          <RiskIndicator
            level={data.earthquake.risk as RiskLevel}
            label="Earthquake Risk"
            description={`${data.earthquake.recentActivity} events/year nearby`}
          />
        </div>
        <div role="listitem">
          <RiskIndicator
            level={data.wildfire.risk as RiskLevel}
            label="Wildfire Risk"
            description={data.wildfire.nearestFireMiles
              ? `${data.wildfire.nearestFireMiles} miles to nearest historical fire`
              : 'No recent fires nearby'}
          />
        </div>
        <div role="listitem">
          <RiskIndicator
            level={data.hurricane.risk as RiskLevel}
            label="Hurricane Risk"
            description={data.hurricane.category
              ? `Category ${data.hurricane.category} zone`
              : 'Low hurricane activity area'}
          />
        </div>
      </div>

      <div
        className={cn(
          'flex flex-col sm:flex-row items-start sm:items-center justify-between',
          'p-4 bg-muted dark:bg-muted/50 rounded-lg gap-4',
          animations.fadeIn
        )}
        role="region"
        aria-label="Estimated insurance premium"
      >
        <div>
          <div className="font-semibold">Estimated Annual Insurance Premium</div>
          <div className="text-sm text-muted-foreground">
            Based on property characteristics and location risk factors
          </div>
        </div>
        <div
          className="text-2xl font-bold text-primary"
          aria-label={`${data.estimatedAnnualPremium.toLocaleString()} dollars per year`}
        >
          ${data.estimatedAnnualPremium.toLocaleString()}/yr
        </div>
      </div>

      {data.flood.insuranceRequired && (
        <div
          className={cn(
            'mt-4 p-3 rounded-lg text-sm flex items-start gap-2',
            'bg-yellow-50 dark:bg-yellow-900/20',
            'border border-yellow-200 dark:border-yellow-800',
            animations.fadeIn
          )}
          role="alert"
        >
          <AlertTriangle
            className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <strong>Flood Insurance Required:</strong> This property is in FEMA Zone{' '}
            {data.flood.zone}, which requires flood insurance for federally-backed mortgages.
          </div>
        </div>
      )}
    </ReportSection>
  );
}
```

---

## Chart Components

### Score Gauge (Enhanced)
```tsx
// src/components/reports/charts/ScoreGauge.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface ScoreGaugeProps {
  score: number;
  maxScore: number;
  label: string;
  color?: string;
  darkColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { container: 'h-[120px] w-[120px]', text: 'text-xl', label: 'text-xs' },
  md: { container: 'h-[200px] w-[200px]', text: 'text-3xl', label: 'text-sm' },
  lg: { container: 'h-[280px] w-[280px]', text: 'text-5xl', label: 'text-base' },
};

export function ScoreGauge({
  score,
  maxScore,
  label,
  color = '#3b82f6',
  darkColor = '#60a5fa',
  size = 'md'
}: ScoreGaugeProps) {
  const { resolvedTheme } = useTheme();
  const percentage = (score / maxScore) * 100;
  const activeColor = resolvedTheme === 'dark' ? darkColor : color;
  const inactiveColor = resolvedTheme === 'dark' ? '#374151' : '#e5e7eb';

  const data = [
    { value: percentage },
    { value: 100 - percentage }
  ];

  const sizeConfig = sizes[size];

  return (
    <div
      className={cn('relative', sizeConfig.container)}
      role="img"
      aria-label={`${label}: ${score} out of ${maxScore} (${Math.round(percentage)}%)`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={0}
            innerRadius="70%"
            outerRadius="90%"
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={activeColor} />
            <Cell fill={inactiveColor} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        aria-hidden="true"
      >
        <div className={cn('font-bold', sizeConfig.text)}>{score}</div>
        <div className={cn('text-muted-foreground', sizeConfig.label)}>{label}</div>
      </div>
    </div>
  );
}
```

### Score Breakdown Radar (Enhanced)
```tsx
// src/components/reports/charts/ScoreBreakdownRadar.tsx
import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { useTheme } from 'next-themes';
import type { RadarDataPoint } from '../types/report-types';

interface ScoreBreakdownRadarProps {
  data: RadarDataPoint[];
}

export function ScoreBreakdownRadar({ data }: ScoreBreakdownRadarProps) {
  const { resolvedTheme } = useTheme();

  const chartData = data.map(d => ({
    ...d,
    percentage: (d.score / d.maxScore) * 100,
    fullMark: 100
  }));

  const colors = {
    stroke: resolvedTheme === 'dark' ? '#60a5fa' : '#3b82f6',
    fill: resolvedTheme === 'dark' ? '#60a5fa' : '#3b82f6',
    grid: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb',
    text: resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280',
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={chartData}>
        <PolarGrid stroke={colors.grid} />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: colors.text, fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: colors.text, fontSize: 10 }}
          tickFormatter={(value) => `${value}%`}
        />
        <Radar
          name="Score"
          dataKey="percentage"
          stroke={colors.stroke}
          fill={colors.fill}
          fillOpacity={0.5}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(value: number) => [`${Math.round(value)}%`, 'Score']}
          contentStyle={{
            backgroundColor: resolvedTheme === 'dark' ? '#1f2937' : '#ffffff',
            borderColor: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb',
            borderRadius: '0.5rem',
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
```

### Cost Breakdown Pie (Enhanced)
```tsx
// src/components/reports/charts/CostBreakdownPie.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useTheme } from 'next-themes';
import type { CostItem } from '../types/report-types';

interface CostBreakdownPieProps {
  data: CostItem[];
  total: number;
}

export function CostBreakdownPie({ data, total }: CostBreakdownPieProps) {
  const { resolvedTheme } = useTheme();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke={resolvedTheme === 'dark' ? '#1f2937' : '#ffffff'}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: resolvedTheme === 'dark' ? '#1f2937' : '#ffffff',
              borderColor: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb',
              borderRadius: '0.5rem',
            }}
          />
          <Legend
            wrapperStyle={{
              color: resolvedTheme === 'dark' ? '#e5e7eb' : '#374151'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center mt-2">
        <div className="text-sm text-muted-foreground">Total Estimated Costs</div>
        <div className="text-xl font-bold">{formatCurrency(total)}</div>
      </div>
    </div>
  );
}
```

---

## Map Components

### Report Satellite Map (Enhanced)
```tsx
// src/components/reports/maps/ReportSatelliteMap.tsx
'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { cn } from '@/lib/utils';
import type { PropertyCoordinates } from '../types/report-types';
import 'leaflet/dist/leaflet.css';

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

interface ReportSatelliteMapProps {
  coordinates: PropertyCoordinates;
  address: string;
  lotSize?: number; // acres
  zoom?: number;
  className?: string;
}

export function ReportSatelliteMap({
  coordinates,
  address,
  lotSize,
  zoom = 18,
  className
}: ReportSatelliteMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Calculate approximate lot radius (assuming square lot)
  const lotRadiusMeters = lotSize
    ? Math.sqrt(lotSize * 4046.86) / 2 // acres to sqm, then radius
    : 30;

  if (!isClient) {
    return <LoadingState message="Loading map..." />;
  }

  if (hasError) {
    return (
      <ErrorState
        message="Unable to load the map. Please try again."
        onRetry={() => setHasError(false)}
      />
    );
  }

  return (
    <div
      className={cn('h-[400px] rounded-lg overflow-hidden', className)}
      role="img"
      aria-label={`Satellite map showing property at ${address}`}
    >
      <MapContainer
        center={[coordinates.latitude, coordinates.longitude]}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom={false}
        keyboard={true}
        aria-label={`Interactive satellite map of ${address}`}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Esri, Maxar, Earthstar Geographics"
        />
        <Marker position={[coordinates.latitude, coordinates.longitude]}>
          <Popup>
            <div className="font-medium">{address}</div>
            {lotSize && (
              <div className="text-sm text-muted-foreground">
                {lotSize.toFixed(2)} acres
              </div>
            )}
          </Popup>
        </Marker>
        <Circle
          center={[coordinates.latitude, coordinates.longitude]}
          radius={lotRadiusMeters}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            weight: 2
          }}
        />
      </MapContainer>

      {/* Print fallback */}
      <div className="hidden print:block text-center p-4 border">
        <p className="font-medium">Property Location</p>
        <p className="text-sm">{address}</p>
        <p className="text-xs text-muted-foreground">
          Coordinates: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
        </p>
      </div>
    </div>
  );
}
```

---

## Main Report Container (Enhanced)

```tsx
// src/components/reports/PropertyReport.tsx
'use client';

import React, { Suspense } from 'react';
import { ExecutiveSummary } from './sections/ExecutiveSummary';
import { PropertyStrengths } from './sections/PropertyStrengths';
import { PropertyConcerns } from './sections/PropertyConcerns';
import { PropertyData } from './sections/PropertyData';
import { SatelliteMap } from './sections/SatelliteMap';
import { StreetMap } from './sections/StreetMap';
import { LocationContext } from './sections/LocationContext';
import { SlopeAnalysis } from './sections/SlopeAnalysis';
import { InsuranceRisk } from './sections/InsuranceRisk';
import { FinancialAnalysis } from './sections/FinancialAnalysis';
import { ComparableSales } from './sections/ComparableSales';
import { ScoreBreakdown } from './sections/ScoreBreakdown';
import { Demographics } from './sections/Demographics';
import { FEMAFloodMap } from './sections/FEMAFloodMap';
import { ZoningInfo } from './sections/ZoningInfo';
import { MarketAnalysis } from './sections/MarketAnalysis';
import { Disclaimer } from './sections/Disclaimer';
import { SkipLink } from './shared/SkipLink';
import { LoadingState, LoadingSkeleton } from './shared/LoadingState';
import { ErrorState } from './shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Share2, Download, Printer, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations, transitions } from './utils/animations';
import type { PropertyReport as ReportType } from './types/report-types';

// Import print styles
import './utils/print-styles.css';

interface PropertyReportProps {
  report: ReportType | null;
  isLoading?: boolean;
  error?: string;
  onShare?: () => void;
  onExportPDF?: () => void;
  onRetry?: () => void;
}

export function PropertyReport({
  report,
  isLoading,
  error,
  onShare,
  onExportPDF,
  onRetry
}: PropertyReportProps) {
  const [showBackToTop, setShowBackToTop] = React.useState(false);

  // Handle scroll for back-to-top button
  React.useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Error state
  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <ErrorState
          title="Unable to Load Report"
          message={error}
          onRetry={onRetry}
        />
      </div>
    );
  }

  // Loading state
  if (isLoading || !report) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 p-6">
        <LoadingSkeleton variant="card" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>
        <LoadingSkeleton variant="chart" />
        <LoadingSkeleton variant="table" lines={5} />
      </div>
    );
  }

  const { report_data: data } = report;

  return (
    <>
      {/* Skip Links for Accessibility */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#executive-summary">Skip to executive summary</SkipLink>
      <SkipLink href="#financial-analysis">Skip to financial analysis</SkipLink>

      <main
        id="main-content"
        className={cn(
          'max-w-5xl mx-auto space-y-6 p-6 print:p-0',
          animations.fadeIn
        )}
        role="main"
        aria-label="Property Analysis Report"
      >
        {/* Header with Actions */}
        <header className="flex flex-col sm:flex-row justify-between items-start gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold">{data.propertyData.address}</h1>
            <p className="text-muted-foreground">
              {data.propertyData.city}, {data.propertyData.state} {data.propertyData.zip}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Report actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              aria-label="Print this report"
            >
              <Printer className="h-4 w-4 mr-2" aria-hidden="true" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportPDF}
              aria-label="Download report as PDF"
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              PDF
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onShare}
              aria-label="Share this report"
            >
              <Share2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Share
            </Button>
          </div>
        </header>

        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">{data.propertyData.address}</h1>
          <p className="text-muted-foreground">
            {data.propertyData.city}, {data.propertyData.state} {data.propertyData.zip}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Report Generated: {new Date(report.generated_at).toLocaleDateString()}
          </p>
        </div>

        {/* Report Sections */}
        <Suspense fallback={<LoadingSkeleton variant="card" />}>
          <ExecutiveSummary data={data.executiveSummary} />
        </Suspense>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Suspense fallback={<LoadingSkeleton variant="card" />}>
            <PropertyStrengths data={data.propertyStrengths} />
          </Suspense>
          <Suspense fallback={<LoadingSkeleton variant="card" />}>
            <PropertyConcerns data={data.propertyConcerns} />
          </Suspense>
        </div>

        <Suspense fallback={<LoadingSkeleton variant="card" />}>
          <PropertyData data={data.propertyData} />
        </Suspense>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:break-before">
          <Suspense fallback={<LoadingSkeleton variant="chart" />}>
            <SatelliteMap data={data.propertyData} />
          </Suspense>
          <Suspense fallback={<LoadingSkeleton variant="chart" />}>
            <StreetMap data={data.propertyData} />
          </Suspense>
        </div>

        <Suspense fallback={<LoadingSkeleton variant="card" />}>
          <LocationContext data={data.locationContext} />
        </Suspense>

        <Suspense fallback={<LoadingSkeleton variant="card" />}>
          <SlopeAnalysis data={data.slopeAnalysis} />
        </Suspense>

        <Suspense fallback={<LoadingSkeleton variant="card" />}>
          <InsuranceRisk data={data.insuranceRisk} />
        </Suspense>

        <Suspense fallback={<LoadingSkeleton variant="chart" />}>
          <FinancialAnalysis data={data.financialAnalysis} />
        </Suspense>

        <Suspense fallback={<LoadingSkeleton variant="table" lines={5} />}>
          <ComparableSales data={data.comparables} />
        </Suspense>

        <Suspense fallback={<LoadingSkeleton variant="chart" />}>
          <ScoreBreakdown data={data.scoreBreakdown} />
        </Suspense>

        <Suspense fallback={<LoadingSkeleton variant="card" />}>
          <Demographics data={data.demographics} />
        </Suspense>

        <Suspense fallback={<LoadingSkeleton variant="chart" />}>
          <FEMAFloodMap data={data.femaFloodData} />
        </Suspense>

        <Suspense fallback={<LoadingSkeleton variant="card" />}>
          <ZoningInfo data={data.zoningInfo} />
        </Suspense>

        <Suspense fallback={<LoadingSkeleton variant="card" />}>
          <MarketAnalysis data={data.marketAnalysis} />
        </Suspense>

        <Disclaimer data={data.disclaimer} />

        {/* Confidence Footer */}
        <footer
          className="text-center text-sm text-muted-foreground border-t pt-4"
          role="contentinfo"
        >
          <p>
            Report generated on{' '}
            <time dateTime={report.generated_at}>
              {new Date(report.generated_at).toLocaleDateString()}
            </time>
            {' | '}Confidence Level: {report.confidence_level}%
            {' | '}Version: {report.version}
          </p>
        </footer>

        {/* Print Footer */}
        <div className="print-footer hidden print:block">
          Tax Deed Flow Property Analysis Report | Generated {new Date(report.generated_at).toLocaleDateString()}
        </div>
      </main>

      {/* Back to Top Button */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          'fixed bottom-6 right-6 z-50 rounded-full shadow-lg print:hidden',
          transitions.opacity,
          showBackToTop ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={scrollToTop}
        aria-label="Scroll back to top"
      >
        <ChevronUp className="h-5 w-5" aria-hidden="true" />
      </Button>
    </>
  );
}
```

---

## Dark Mode Color Tokens

Add to your Tailwind config or globals.css:

```css
/* src/app/globals.css - Add these CSS variables */

@layer base {
  :root {
    /* Chart colors - light mode */
    --chart-primary: 221 83% 53%;      /* #3b82f6 */
    --chart-success: 142 71% 45%;      /* #22c55e */
    --chart-warning: 38 92% 50%;       /* #f59e0b */
    --chart-danger: 0 84% 60%;         /* #ef4444 */
    --chart-info: 199 89% 48%;         /* #0ea5e9 */
    --chart-muted: 215 16% 47%;        /* #6b7280 */

    /* Grade colors */
    --grade-a: 142 71% 45%;
    --grade-b: 84 81% 44%;
    --grade-c: 45 93% 47%;
    --grade-d: 24 95% 53%;
    --grade-f: 0 84% 60%;

    /* Risk colors */
    --risk-low: 142 76% 36%;
    --risk-moderate: 45 93% 47%;
    --risk-high: 24 95% 53%;
    --risk-extreme: 0 84% 60%;
  }

  .dark {
    /* Chart colors - dark mode */
    --chart-primary: 217 91% 60%;      /* #60a5fa */
    --chart-success: 142 71% 60%;      /* #4ade80 */
    --chart-warning: 43 96% 56%;       /* #fbbf24 */
    --chart-danger: 0 91% 71%;         /* #f87171 */
    --chart-info: 199 89% 60%;         /* #38bdf8 */
    --chart-muted: 218 11% 65%;        /* #9ca3af */

    /* Grade colors - slightly brighter for dark mode */
    --grade-a: 142 71% 55%;
    --grade-b: 84 81% 54%;
    --grade-c: 45 93% 57%;
    --grade-d: 24 95% 63%;
    --grade-f: 0 84% 70%;

    /* Risk colors - brighter for dark mode */
    --risk-low: 142 76% 46%;
    --risk-moderate: 45 93% 57%;
    --risk-high: 24 95% 63%;
    --risk-extreme: 0 84% 70%;
  }
}

/* Utility classes for chart colors */
.chart-primary { color: hsl(var(--chart-primary)); }
.chart-success { color: hsl(var(--chart-success)); }
.chart-warning { color: hsl(var(--chart-warning)); }
.chart-danger { color: hsl(var(--chart-danger)); }
.chart-info { color: hsl(var(--chart-info)); }
.chart-muted { color: hsl(var(--chart-muted)); }

.bg-chart-primary { background-color: hsl(var(--chart-primary)); }
.bg-chart-success { background-color: hsl(var(--chart-success)); }
.bg-chart-warning { background-color: hsl(var(--chart-warning)); }
.bg-chart-danger { background-color: hsl(var(--chart-danger)); }
.bg-chart-info { background-color: hsl(var(--chart-info)); }
.bg-chart-muted { background-color: hsl(var(--chart-muted)); }
```

---

## Verification Steps

1. **TypeScript**: Run `tsc --noEmit` to verify all types
2. **Accessibility**: Test with screen reader (NVDA, VoiceOver)
3. **Keyboard Navigation**: Tab through all interactive elements
4. **Print Preview**: Test print layout in browser
5. **Dark Mode**: Toggle theme and verify all components
6. **Responsive**: Test on mobile, tablet, and desktop
7. **Loading States**: Verify skeletons display correctly
8. **Error States**: Test error recovery flow
9. **Charts**: Verify accessible data table alternatives
10. **Animations**: Test with `prefers-reduced-motion`

---

## Dependencies

```bash
npm install recharts react-leaflet leaflet @types/leaflet next-themes
```

---

## Accessibility Checklist

- [x] Skip links for main content sections
- [x] ARIA labels on all interactive elements
- [x] Keyboard navigation support
- [x] Screen reader-friendly chart alternatives (data tables)
- [x] Focus indicators on all focusable elements
- [x] Color contrast meets WCAG 2.1 AA
- [x] Motion-safe animations with `prefers-reduced-motion`
- [x] Semantic HTML structure
- [x] Alt text for images and maps
- [x] Proper heading hierarchy

---

## Next Phase

After completing Phase 3, proceed to [Phase 4: Report Generation Flow](./phase-4-report-generation.md)
