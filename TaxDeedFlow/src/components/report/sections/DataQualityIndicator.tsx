/**
 * DataQualityIndicator Component - Phase 8D
 *
 * Displays data quality assessment with overall score,
 * component breakdown, missing data, and assumptions.
 *
 * @module components/report/sections/DataQualityIndicator
 * @author Claude Code Agent
 * @date 2026-01-16
 */

'use client';

import React from 'react';
import {
  Database,
  AlertCircle,
  CheckCircle2,
  Info,
  BarChart3,
  FileQuestion,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  Home,
  TrendingUp,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type { DataQualityAssessment, DataQualityComponents } from '@/lib/analysis/financial/types';

// ============================================
// Types
// ============================================

interface DataQualityIndicatorProps {
  quality: DataQualityAssessment;
  className?: string;
  variant?: 'full' | 'compact' | 'badge';
  showDetails?: boolean;
}

// ============================================
// Quality Level Configuration
// ============================================

type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor';

const QUALITY_LEVELS: Record<
  QualityLevel,
  {
    label: string;
    description: string;
    colorClasses: string;
    progressColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  excellent: {
    label: 'Excellent',
    description: 'High confidence in analysis',
    colorClasses: 'bg-green-100 text-green-800 border-green-300',
    progressColor: 'bg-green-500',
    icon: CheckCircle2,
  },
  good: {
    label: 'Good',
    description: 'Reliable analysis with minor gaps',
    colorClasses: 'bg-blue-100 text-blue-800 border-blue-300',
    progressColor: 'bg-blue-500',
    icon: Shield,
  },
  fair: {
    label: 'Fair',
    description: 'Some assumptions made',
    colorClasses: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    progressColor: 'bg-yellow-500',
    icon: Info,
  },
  poor: {
    label: 'Poor',
    description: 'Significant data gaps',
    colorClasses: 'bg-red-100 text-red-800 border-red-300',
    progressColor: 'bg-red-500',
    icon: AlertCircle,
  },
};

const COMPONENT_CONFIG: Record<
  keyof DataQualityComponents,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  comparablesQuality: {
    label: 'Comparables',
    description: 'Quality of comparable sales data',
    icon: TrendingUp,
  },
  costEstimateAccuracy: {
    label: 'Cost Estimates',
    description: 'Accuracy of cost projections',
    icon: BarChart3,
  },
  marketDataFreshness: {
    label: 'Market Data',
    description: 'Freshness of market information',
    icon: Clock,
  },
  propertyDataCompleteness: {
    label: 'Property Data',
    description: 'Completeness of property information',
    icon: Home,
  },
};

// ============================================
// Helper Functions
// ============================================

function getQualityLevel(score: number): QualityLevel {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

function getScoreColor(score: number): string {
  const level = getQualityLevel(score);
  return QUALITY_LEVELS[level].progressColor;
}

// ============================================
// Main Component
// ============================================

export function DataQualityIndicator({
  quality,
  className = '',
  variant = 'full',
  showDetails = true,
}: DataQualityIndicatorProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (variant === 'badge') {
    return <DataQualityBadge score={quality.overallScore} className={className} />;
  }

  if (variant === 'compact') {
    return <DataQualityCompact quality={quality} className={className} />;
  }

  const level = getQualityLevel(quality.overallScore);
  const levelConfig = QUALITY_LEVELS[level];
  const LevelIcon = levelConfig.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${levelConfig.colorClasses}`}>
              <Database className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Data Quality</CardTitle>
              <CardDescription>{levelConfig.description}</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <LevelIcon className={`h-5 w-5 ${levelConfig.colorClasses.split(' ')[1]}`} />
              <Badge className={levelConfig.colorClasses}>
                {levelConfig.label}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Overall Score</span>
            <span className="text-2xl font-bold">{quality.overallScore}%</span>
          </div>
          <Progress
            value={quality.overallScore}
            className="h-3"
          />
        </div>

        {/* Component Scores */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Component Scores
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(quality.components) as Array<keyof DataQualityComponents>).map(
              (key) => (
                <ComponentScore
                  key={key}
                  componentKey={key}
                  score={quality.components[key]}
                />
              )
            )}
          </div>
        </div>

        {showDetails && (quality.missingData.length > 0 || quality.assumptions.length > 0) && (
          <>
            <Separator />

            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-between p-2"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <FileQuestion className="h-4 w-4" />
                    Data Gaps & Assumptions
                    {quality.missingData.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {quality.missingData.length}
                      </Badge>
                    )}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4 space-y-4">
                {/* Missing Data */}
                {quality.missingData.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      Missing Data
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {quality.missingData.map((field, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200"
                        >
                          {formatFieldName(field)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assumptions */}
                {quality.assumptions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2 text-blue-600">
                      <Lightbulb className="h-4 w-4" />
                      Assumptions Made
                    </h4>
                    <ul className="space-y-1.5">
                      {quality.assumptions.map((assumption, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-blue-400 mt-1.5">•</span>
                          <span>{assumption}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Sub-components
// ============================================

interface ComponentScoreProps {
  componentKey: keyof DataQualityComponents;
  score: number;
}

function ComponentScore({ componentKey, score }: ComponentScoreProps): React.ReactElement {
  const config = COMPONENT_CONFIG[componentKey];
  const Icon = config.icon;
  const level = getQualityLevel(score);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-3 rounded-lg bg-muted/50 space-y-2 cursor-help">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{config.label}</span>
              </div>
              <span className="text-sm font-semibold">{score}%</span>
            </div>
            <Progress value={score} className="h-1.5" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Quality: {QUALITY_LEVELS[level].label}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Compact Variant
// ============================================

interface DataQualityCompactProps {
  quality: DataQualityAssessment;
  className?: string;
}

function DataQualityCompact({
  quality,
  className = '',
}: DataQualityCompactProps): React.ReactElement {
  const level = getQualityLevel(quality.overallScore);
  const config = QUALITY_LEVELS[level];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${config.colorClasses} ${className}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">Data Quality</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold">{quality.overallScore}%</span>
        <Badge variant="outline" className="text-xs">
          {config.label}
        </Badge>
      </div>
    </div>
  );
}

// ============================================
// Badge Variant
// ============================================

interface DataQualityBadgeProps {
  score: number;
  className?: string;
}

export function DataQualityBadge({
  score,
  className = '',
}: DataQualityBadgeProps): React.ReactElement {
  const level = getQualityLevel(score);
  const config = QUALITY_LEVELS[level];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${config.colorClasses} ${className}`}>
            <Database className="h-3 w-3 mr-1" />
            {score}% Quality
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Data Quality: {config.label}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Inline Variant (for tables/lists)
// ============================================

interface DataQualityInlineProps {
  score: number;
  className?: string;
}

export function DataQualityInline({
  score,
  className = '',
}: DataQualityInlineProps): React.ReactElement {
  const level = getQualityLevel(score);
  const config = QUALITY_LEVELS[level];
  const Icon = config.icon;

  const colorClass =
    level === 'excellent'
      ? 'text-green-600'
      : level === 'good'
      ? 'text-blue-600'
      : level === 'fair'
      ? 'text-yellow-600'
      : 'text-red-600';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <Icon className={`h-4 w-4 ${colorClass}`} />
      <span className={`text-sm font-medium ${colorClass}`}>{score}%</span>
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format a snake_case field name to Title Case
 */
function formatFieldName(field: string): string {
  return field
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default DataQualityIndicator;
