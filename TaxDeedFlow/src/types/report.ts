/**
 * Property Analysis Report System - Report Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the
 * property analysis report UI components.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type {
  ScoreBreakdown,
  GradeWithModifier,
  CategoryScore,
  PropertyData,
  ConfidenceResult,
  PropertyType,
} from './scoring';
import type { TitleReport } from './title';

// Re-export types from scoring for external consumers
export type { PropertyData, PropertyType } from './scoring';

// ============================================
// Grade and Rating Types
// ============================================

/**
 * All valid letter grades with modifiers
 */
export type Grade = GradeWithModifier;

/**
 * Investment rating descriptions
 */
export type InvestmentRating =
  | 'Excellent'
  | 'Good'
  | 'Fair'
  | 'Poor'
  | 'Avoid';

/**
 * Risk level classification
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Maps a grade to an investment rating
 */
export function gradeToRating(grade: Grade): InvestmentRating {
  if (grade.startsWith('A')) return 'Excellent';
  if (grade.startsWith('B')) return 'Good';
  if (grade.startsWith('C')) return 'Fair';
  if (grade.startsWith('D')) return 'Poor';
  return 'Avoid';
}

/**
 * Maps risk level to severity for sorting/display
 */
export function riskLevelToSeverity(level: RiskLevel): number {
  const severityMap: Record<RiskLevel, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return severityMap[level];
}

// ============================================
// Cost Analysis Types
// ============================================

/**
 * Breakdown of acquisition costs
 */
export interface AcquisitionCosts {
  /** Winning bid amount */
  bidAmount: number;
  /** Premium or buyer's fee percentage */
  premiumPercentage: number;
  /** Premium or buyer's fee amount */
  premiumAmount: number;
  /** Title search and insurance costs */
  titleCosts: number;
  /** Recording and filing fees */
  recordingFees: number;
  /** Legal fees for closing */
  legalFees: number;
  /** Other miscellaneous costs */
  otherCosts: number;
  /** Total acquisition cost */
  total: number;
}

/**
 * Estimated rehabilitation costs
 */
export interface RehabCosts {
  /** Estimated minimum rehab cost */
  minimumEstimate: number;
  /** Estimated maximum rehab cost */
  maximumEstimate: number;
  /** Most likely rehab cost */
  expectedEstimate: number;
  /** Property condition assessment */
  conditionAssessment: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  /** Detailed cost breakdown by category */
  breakdown: {
    category: string;
    description: string;
    lowEstimate: number;
    highEstimate: number;
  }[];
}

/**
 * Monthly and annual holding costs
 */
export interface HoldingCosts {
  /** Monthly property taxes */
  monthlyTaxes: number;
  /** Monthly insurance premium */
  monthlyInsurance: number;
  /** Monthly utilities estimate */
  monthlyUtilities: number;
  /** Monthly maintenance estimate */
  monthlyMaintenance: number;
  /** Monthly HOA fees if applicable */
  monthlyHOA: number;
  /** Total monthly holding cost */
  monthlyTotal: number;
  /** Expected holding period in months */
  holdingPeriodMonths: number;
  /** Total holding costs for the period */
  totalHoldingCosts: number;
}

/**
 * Selling costs and fees
 */
export interface SellingCosts {
  /** Agent commission percentage */
  commissionPercentage: number;
  /** Agent commission amount */
  commissionAmount: number;
  /** Closing costs percentage */
  closingCostsPercentage: number;
  /** Closing costs amount */
  closingCostsAmount: number;
  /** Staging costs estimate */
  stagingCosts: number;
  /** Marketing and advertising costs */
  marketingCosts: number;
  /** Total selling costs */
  total: number;
}

/**
 * Complete cost analysis
 */
export interface CostAnalysis {
  acquisition: AcquisitionCosts;
  rehab: RehabCosts;
  holding: HoldingCosts;
  selling: SellingCosts;
  /** Total all-in costs */
  totalCosts: number;
  /** Cost breakdown for pie chart */
  costBreakdown: {
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }[];
}

// ============================================
// ROI Analysis Types
// ============================================

/**
 * Return on investment analysis
 */
export interface ROIAnalysis {
  /** Total investment required */
  totalInvestment: number;
  /** Estimated after-repair value (ARV) */
  afterRepairValue: number;
  /** Estimated profit amount */
  estimatedProfit: number;
  /** ROI percentage */
  roiPercentage: number;
  /** Annualized ROI percentage */
  annualizedROI: number;
  /** Profit margin percentage */
  profitMargin: number;
  /** Cash-on-cash return */
  cashOnCashReturn: number;
  /** Break-even sale price */
  breakEvenPrice: number;
  /** Maximum allowable offer (70% rule) */
  maximumAllowableOffer: number;
  /** Confidence level for estimates */
  confidenceLevel: 'high' | 'medium' | 'low';
  /** Assumptions used in calculations */
  assumptions: {
    key: string;
    value: string;
    source: string;
  }[];
}

// ============================================
// Comparables Analysis Types
// ============================================

/**
 * Individual comparable sale
 */
export interface ComparableSale {
  /** Address of the comparable property */
  address: string;
  /** Sale price */
  salePrice: number;
  /** Sale date */
  saleDate: Date;
  /** Price per square foot */
  pricePerSqFt: number | null;
  /** Square footage */
  squareFeet: number | null;
  /** Number of bedrooms */
  bedrooms: number | null;
  /** Number of bathrooms */
  bathrooms: number | null;
  /** Year built */
  yearBuilt: number | null;
  /** Distance from subject property in miles */
  distanceMiles: number;
  /** Days since sale */
  daysSinceSale: number;
  /** Similarity score (0-100) */
  similarityScore: number;
  /** Adjustments applied */
  adjustments: {
    type: string;
    amount: number;
    reason: string;
  }[];
  /** Adjusted sale price */
  adjustedPrice: number;
}

/**
 * Complete comparables analysis
 */
export interface ComparablesAnalysis {
  /** Subject property details */
  subject: {
    address: string;
    squareFeet: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    yearBuilt: number | null;
    lotSize: number | null;
  };
  /** Array of comparable sales */
  comparables: ComparableSale[];
  /** Estimated market value */
  estimatedValue: number;
  /** Low range of estimated value */
  valueLowRange: number;
  /** High range of estimated value */
  valueHighRange: number;
  /** Average price per square foot */
  averagePricePerSqFt: number | null;
  /** Median price per square foot */
  medianPricePerSqFt: number | null;
  /** Search radius used */
  searchRadiusMiles: number;
  /** Date range of comparables */
  dateRange: {
    start: Date;
    end: Date;
  };
  /** Confidence level */
  confidenceLevel: 'high' | 'medium' | 'low';
  /** Data source */
  dataSource: string;
  /** Notes about the analysis */
  notes: string[];
}

// ============================================
// Risk Analysis Types (for Report Display)
// ============================================

/**
 * Individual risk assessment for display
 */
export interface RiskAssessment {
  /** Risk type identifier */
  type: string;
  /** Display name */
  name: string;
  /** Risk level */
  level: RiskLevel;
  /** Risk score (0-100, higher = more risk) */
  score: number;
  /** Summary description */
  summary: string;
  /** Detailed findings */
  findings: string[];
  /** Mitigation options */
  mitigations: {
    action: string;
    estimatedCost: number | null;
    effectiveness: 'high' | 'medium' | 'low';
  }[];
  /** Insurance recommendation */
  insuranceRecommendation: string | null;
  /** Estimated annual insurance cost */
  estimatedInsuranceCost: number | null;
  /** Data source */
  dataSource: string;
  /** Last updated */
  lastUpdated: Date | null;
}

/**
 * All risk analyses combined
 */
export interface AllRiskAnalyses {
  /** Flood risk assessment */
  flood: RiskAssessment;
  /** Earthquake risk assessment */
  earthquake: RiskAssessment;
  /** Wildfire risk assessment */
  wildfire: RiskAssessment;
  /** Hurricane/wind risk assessment */
  hurricane: RiskAssessment;
  /** Sinkhole risk assessment */
  sinkhole: RiskAssessment;
  /** Environmental contamination risk */
  environmental: RiskAssessment;
  /** Radon risk assessment */
  radon: RiskAssessment;
  /** Slope/landslide risk assessment */
  slope: RiskAssessment;
  /** Overall risk score (0-100) */
  overallRiskScore: number;
  /** Overall risk level */
  overallRiskLevel: RiskLevel;
  /** Total estimated insurance costs */
  totalInsuranceCosts: number;
  /** Priority recommendations */
  recommendations: string[];
  /** Top risk factors identified */
  topRiskFactors: string[];
  /** Positive factors (green flags) */
  positiveFactors: string[];
  /** Warnings requiring attention */
  warnings: string[];
}

// ============================================
// Auction Details Types
// ============================================

/**
 * Auction details for display
 */
export interface AuctionDetails {
  /** Type of sale */
  saleType: string;
  /** Sale date */
  saleDate: Date | null;
  /** Days until sale */
  daysUntilSale: number | null;
  /** Auction platform */
  platform: string | null;
  /** Platform URL */
  platformUrl: string | null;
  /** Starting bid / minimum bid */
  startingBid: number | null;
  /** Deposit required */
  depositRequired: number | null;
  /** Registration deadline */
  registrationDeadline: Date | null;
  /** Registration status */
  registrationStatus: 'open' | 'closed' | 'pending' | 'unknown';
  /** Registration requirements */
  registrationRequirements: string[];
  /** Payment deadline after winning */
  paymentDeadline: string | null;
  /** Accepted payment methods */
  paymentMethods: string[];
  /** Buyer's premium percentage */
  buyersPremiumPercentage: number | null;
  /** Special conditions */
  specialConditions: string[];
  /** County contact information */
  countyContact: {
    name: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  } | null;
}

// ============================================
// Recommendation Types
// ============================================

/**
 * Priority level for recommendations
 */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Individual recommendation
 */
export interface Recommendation {
  /** Unique identifier */
  id: string;
  /** Priority level */
  priority: RecommendationPriority;
  /** Category of recommendation */
  category:
    | 'action'
    | 'due_diligence'
    | 'financing'
    | 'risk_mitigation'
    | 'exit_strategy';
  /** Short title */
  title: string;
  /** Detailed description */
  description: string;
  /** Estimated cost to implement */
  estimatedCost: number | null;
  /** Timeframe for action */
  timeframe: string | null;
  /** Related risk or concern */
  relatedTo: string | null;
}

// ============================================
// Complete Report Data Type
// ============================================

/**
 * Complete property report data structure
 * Contains all data needed to render a full property analysis report
 */
export interface PropertyReportData {
  /** Core property information */
  property: PropertyData;
  /** Complete score breakdown */
  scoreBreakdown: ScoreBreakdown;
  /** All risk analyses */
  riskAnalysis: AllRiskAnalyses;
  /** Comparable sales analysis */
  comparables: ComparablesAnalysis;
  /** ROI and profit analysis */
  roiAnalysis: ROIAnalysis;
  /** Complete cost analysis */
  costAnalysis: CostAnalysis;
  /** Auction details */
  auctionDetails: AuctionDetails;
  /** Title search report (liens, chain of title, issues) */
  titleReport?: TitleReport;
  /** Recommendations */
  recommendations: Recommendation[];
  /** Report metadata */
  metadata: {
    /** When the report was generated */
    generatedAt: Date;
    /** Report version */
    reportVersion: string;
    /** Data sources used */
    dataSources: string[];
    /** Overall data freshness */
    dataFreshness: 'current' | 'recent' | 'stale';
    /** Confidence in the overall analysis */
    overallConfidence: ConfidenceResult;
  };
}

// ============================================
// Chart Data Types
// ============================================

/**
 * Data point for radar chart
 */
export interface RadarChartDataPoint {
  /** Category name */
  category: string;
  /** Category ID */
  categoryId: string;
  /** Score achieved */
  score: number;
  /** Maximum possible score */
  maxScore: number;
  /** Percentage of max */
  percentage: number;
}

/**
 * Data point for pie chart
 */
export interface PieChartDataPoint {
  /** Label for the segment */
  label: string;
  /** Value */
  value: number;
  /** Percentage of total */
  percentage: number;
  /** Color for the segment */
  color: string;
}

/**
 * Data point for gauge chart
 */
export interface GaugeChartData {
  /** Current value */
  value: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Grade thresholds for coloring */
  thresholds: {
    value: number;
    color: string;
    label: string;
  }[];
}

// ============================================
// UI Component Props Types
// ============================================

/**
 * Common size variants for components
 */
export type ComponentSize = 'sm' | 'md' | 'lg';

/**
 * Value format types
 */
export type ValueFormat = 'currency' | 'percentage' | 'number' | 'date' | 'text';

/**
 * Trend direction
 */
export type TrendDirection = 'up' | 'down' | 'neutral' | 'positive' | 'negative';

/**
 * Collapsible section state
 */
export interface CollapsibleState {
  /** Whether the section is expanded */
  isExpanded: boolean;
  /** Toggle function */
  toggle: () => void;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format a value based on type
 */
export function formatValue(
  value: string | number | Date | null | undefined,
  format: ValueFormat
): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  switch (format) {
    case 'currency':
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return 'N/A';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);

    case 'percentage':
      const pct = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(pct)) return 'N/A';
      return `${pct.toFixed(1)}%`;

    case 'number':
      const n = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(n)) return 'N/A';
      return new Intl.NumberFormat('en-US').format(n);

    case 'date':
      const date = value instanceof Date ? value : new Date(String(value));
      if (isNaN(date.getTime())) return 'N/A';
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date);

    case 'text':
    default:
      return String(value);
  }
}

/**
 * Get color for a grade
 */
export function getGradeColor(grade: Grade): string {
  if (grade.startsWith('A')) return 'green';
  if (grade.startsWith('B')) return 'blue';
  if (grade.startsWith('C')) return 'yellow';
  if (grade.startsWith('D')) return 'orange';
  return 'red';
}

/**
 * Get Tailwind color classes for a grade
 */
export function getGradeColorClasses(grade: Grade): {
  bg: string;
  text: string;
  border: string;
} {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    A: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-200',
      border: 'border-green-500',
    },
    B: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-200',
      border: 'border-blue-500',
    },
    C: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-200',
      border: 'border-yellow-500',
    },
    D: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-200',
      border: 'border-orange-500',
    },
    F: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-200',
      border: 'border-red-500',
    },
  };

  const baseGrade = grade.charAt(0) as keyof typeof colorMap;
  return colorMap[baseGrade] || colorMap.F;
}

/**
 * Get Tailwind color classes for a risk level
 */
export function getRiskLevelColorClasses(level: RiskLevel): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  const colorMap: Record<
    RiskLevel,
    { bg: string; text: string; border: string; icon: string }
  > = {
    low: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-200',
      border: 'border-green-500',
      icon: 'text-green-600 dark:text-green-400',
    },
    medium: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-200',
      border: 'border-yellow-500',
      icon: 'text-yellow-600 dark:text-yellow-400',
    },
    high: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-200',
      border: 'border-orange-500',
      icon: 'text-orange-600 dark:text-orange-400',
    },
    critical: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-200',
      border: 'border-red-500',
      icon: 'text-red-600 dark:text-red-400',
    },
  };

  return colorMap[level];
}

/**
 * Get trend icon and color
 */
export function getTrendIndicator(direction: TrendDirection): {
  icon: 'arrow-up' | 'arrow-down' | 'minus';
  color: string;
} {
  switch (direction) {
    case 'up':
    case 'positive':
      return { icon: 'arrow-up', color: 'text-green-600 dark:text-green-400' };
    case 'down':
    case 'negative':
      return { icon: 'arrow-down', color: 'text-red-600 dark:text-red-400' };
    default:
      return { icon: 'minus', color: 'text-gray-500 dark:text-gray-400' };
  }
}
