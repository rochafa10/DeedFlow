/**
 * RecommendationCard Component - Phase 8D
 *
 * Displays investment recommendation with verdict, confidence,
 * max bid, key factors, risks, and opportunities.
 *
 * @module components/report/sections/RecommendationCard
 * @author Claude Code Agent
 * @date 2026-01-16
 */

'use client';

import React from 'react';
import {
  TrendingUp,
  ThumbsUp,
  Pause,
  MinusCircle,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  DollarSign,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
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

import type {
  InvestmentRecommendation,
  RecommendationVerdict,
  ExitStrategy,
} from '@/lib/analysis/financial/types';
import { formatValue } from '@/types/report';

// ============================================
// Types
// ============================================

interface RecommendationCardProps {
  recommendation: InvestmentRecommendation;
  className?: string;
  showDetails?: boolean;
  onMaxBidClick?: () => void;
}

// ============================================
// Verdict Configuration
// ============================================

const VERDICT_CONFIG: Record<
  RecommendationVerdict,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClasses: string;
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  strong_buy: {
    label: 'Strong Buy',
    description: 'Excellent opportunity with strong metrics',
    icon: TrendingUp,
    colorClasses: 'bg-green-100 text-green-800 border-green-300',
    badgeVariant: 'default',
  },
  buy: {
    label: 'Buy',
    description: 'Good investment opportunity',
    icon: ThumbsUp,
    colorClasses: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    badgeVariant: 'default',
  },
  hold: {
    label: 'Hold',
    description: 'Acceptable deal, proceed with caution',
    icon: Pause,
    colorClasses: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    badgeVariant: 'secondary',
  },
  pass: {
    label: 'Pass',
    description: 'Marginal deal, better opportunities exist',
    icon: MinusCircle,
    colorClasses: 'bg-orange-100 text-orange-800 border-orange-300',
    badgeVariant: 'secondary',
  },
  avoid: {
    label: 'Avoid',
    description: 'Not recommended for investment',
    icon: XCircle,
    colorClasses: 'bg-red-100 text-red-800 border-red-300',
    badgeVariant: 'destructive',
  },
};

const EXIT_STRATEGY_CONFIG: Record<
  ExitStrategy,
  { label: string; description: string }
> = {
  flip: {
    label: 'Fix & Flip',
    description: 'Renovate and sell for profit',
  },
  rental: {
    label: 'Buy & Hold',
    description: 'Rent for ongoing income',
  },
  wholesale: {
    label: 'Wholesale',
    description: 'Assign contract to another investor',
  },
  hold: {
    label: 'Hold',
    description: 'Hold for appreciation',
  },
};

// ============================================
// Main Component
// ============================================

export function RecommendationCard({
  recommendation,
  className = '',
  showDetails = true,
  onMaxBidClick,
}: RecommendationCardProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const verdictConfig = VERDICT_CONFIG[recommendation.verdict];
  const exitConfig = EXIT_STRATEGY_CONFIG[recommendation.exitStrategy];
  const VerdictIcon = verdictConfig.icon;

  return (
    <Card className={`${className} overflow-hidden`}>
      {/* Header with Verdict */}
      <CardHeader
        className={`${verdictConfig.colorClasses} border-b`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/50 rounded-lg">
              <VerdictIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">
                {verdictConfig.label}
              </CardTitle>
              <CardDescription className="text-current opacity-80">
                {verdictConfig.description}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={verdictConfig.badgeVariant}
            className="text-sm px-3 py-1"
          >
            {recommendation.confidence}% Confidence
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Max Bid */}
          <MetricBox
            icon={DollarSign}
            label="Max Bid"
            value={formatValue(recommendation.maxBid, 'currency')}
            highlight={recommendation.verdict === 'strong_buy' || recommendation.verdict === 'buy'}
            onClick={onMaxBidClick}
          />

          {/* Target Profit */}
          <MetricBox
            icon={Target}
            label="Target Profit"
            value={formatValue(recommendation.targetProfit, 'currency')}
            subtext={recommendation.targetProfit > 0 ? 'at max bid' : 'negative'}
            highlight={recommendation.targetProfit >= 25000}
          />

          {/* Exit Strategy */}
          <MetricBox
            icon={TrendingUp}
            label="Exit Strategy"
            value={exitConfig.label}
            subtext={exitConfig.description}
          />

          {/* Timeline */}
          <MetricBox
            icon={Clock}
            label="Timeline"
            value={`${recommendation.timelineMonths} mo`}
            subtext="estimated"
          />
        </div>

        {/* Confidence Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Recommendation Confidence</span>
            <span className="font-medium">{recommendation.confidence}%</span>
          </div>
          <Progress
            value={recommendation.confidence}
            className="h-2"
          />
        </div>

        <Separator className="my-4" />

        {showDetails && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-2"
              >
                <span className="text-sm font-medium">
                  View Analysis Details
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-4 space-y-4">
              {/* Key Factors */}
              {recommendation.keyFactors.length > 0 && (
                <FactorSection
                  title="Key Factors"
                  icon={CheckCircle}
                  iconColor="text-green-500"
                  items={recommendation.keyFactors}
                />
              )}

              {/* Risks */}
              {recommendation.risks.length > 0 && (
                <FactorSection
                  title="Risks"
                  icon={AlertTriangle}
                  iconColor="text-amber-500"
                  items={recommendation.risks}
                />
              )}

              {/* Opportunities */}
              {recommendation.opportunities.length > 0 && (
                <FactorSection
                  title="Opportunities"
                  icon={Lightbulb}
                  iconColor="text-blue-500"
                  items={recommendation.opportunities}
                />
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Sub-components
// ============================================

interface MetricBoxProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
  onClick?: () => void;
}

function MetricBox({
  icon: Icon,
  label,
  value,
  subtext,
  highlight = false,
  onClick,
}: MetricBoxProps): React.ReactElement {
  const baseClasses = 'p-4 rounded-lg border transition-colors';
  const highlightClasses = highlight
    ? 'bg-primary/5 border-primary/20'
    : 'bg-muted/50';
  const clickableClasses = onClick ? 'cursor-pointer hover:bg-primary/10' : '';

  return (
    <div
      className={`${baseClasses} ${highlightClasses} ${clickableClasses}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
      {subtext && (
        <div className="text-xs text-muted-foreground mt-1">{subtext}</div>
      )}
    </div>
  );
}

interface FactorSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  items: string[];
}

function FactorSection({
  title,
  icon: Icon,
  iconColor,
  items,
}: FactorSectionProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <h4 className="font-medium flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        {title}
      </h4>
      <ul className="space-y-1.5 ml-6">
        {items.map((item, index) => (
          <li
            key={index}
            className="text-sm text-muted-foreground flex items-start gap-2"
          >
            <span className="text-muted-foreground/50 mt-1.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// Compact Variant
// ============================================

interface RecommendationBadgeProps {
  verdict: RecommendationVerdict;
  confidence: number;
  className?: string;
}

export function RecommendationBadge({
  verdict,
  confidence,
  className = '',
}: RecommendationBadgeProps): React.ReactElement {
  const config = VERDICT_CONFIG[verdict];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.colorClasses} ${className}`}
    >
      <Icon className="h-4 w-4" />
      <span className="font-medium">{config.label}</span>
      <span className="text-xs opacity-75">({confidence}%)</span>
    </div>
  );
}

// ============================================
// Summary Card Variant
// ============================================

interface RecommendationSummaryProps {
  recommendation: InvestmentRecommendation;
  className?: string;
}

export function RecommendationSummary({
  recommendation,
  className = '',
}: RecommendationSummaryProps): React.ReactElement {
  const config = VERDICT_CONFIG[recommendation.verdict];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border ${config.colorClasses} ${className}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <div>
          <div className="font-semibold">{config.label}</div>
          <div className="text-sm opacity-80">
            Max Bid: {formatValue(recommendation.maxBid, 'currency')}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">{recommendation.confidence}%</div>
        <div className="text-xs opacity-75">confidence</div>
      </div>
    </div>
  );
}

export default RecommendationCard;
