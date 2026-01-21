/**
 * Financial Analysis Types - Phase 8D Investment Recommendation Engine
 *
 * This file contains all TypeScript interfaces and types for the
 * investment recommendation engine and financial analysis system.
 *
 * @module lib/analysis/financial/types
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type { CostBreakdown, CostConfidence, RehabScope } from '@/types/costs';

// ============================================
// Investment Metrics Types
// ============================================

/**
 * Core investment metrics calculated from costs and revenue
 */
export interface InvestmentMetrics {
  /** Return on Investment percentage */
  roi: number;
  /** Profit margin as percentage of ARV */
  profitMargin: number;
  /** Price to ARV ratio (lower is better) */
  priceToARV: number;
  /** Total investment to ARV ratio */
  totalInvestmentToARV: number;
  /** Cash-on-cash return percentage */
  cashOnCash: number;
  /** Net profit amount */
  netProfit: number;
  /** Gross profit (ARV - purchase price) */
  grossProfit: number;
  /** Break-even sale price to recover investment */
  breakEvenPrice: number;
  /** Internal Rate of Return (annualized) */
  irr: number;
  /** Cap rate for rental analysis */
  capRate: number;
}

// ============================================
// Revenue Projection Types
// ============================================

/**
 * After Repair Value (ARV) analysis result
 */
export interface ARVAnalysis {
  /** Estimated ARV based on comparables */
  estimatedARV: number;
  /** Low range estimate */
  lowEstimate: number;
  /** High range estimate */
  highEstimate: number;
  /** Price per square foot */
  pricePerSqft: number;
  /** Number of comparables used */
  comparablesUsed: number;
  /** Confidence level in the estimate */
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Rental income projection
 */
export interface RentalProjection {
  /** Estimated monthly rent */
  monthlyRent: number;
  /** Annual gross rental income */
  annualGrossRent: number;
  /** Expected vacancy rate */
  vacancyRate: number;
  /** Effective gross income after vacancy */
  effectiveGrossIncome: number;
  /** Annual operating expenses */
  annualOperatingExpenses: number;
  /** Net Operating Income (NOI) */
  noi: number;
  /** Monthly cash flow after all expenses */
  monthlyCashFlow: number;
  /** Annual cash flow */
  annualCashFlow: number;
}

/**
 * Combined revenue projection (sale and rental)
 */
export interface RevenueProjection {
  /** Sale revenue analysis */
  sale: ARVAnalysis;
  /** Rental income projection */
  rental: RentalProjection;
}

// ============================================
// Recommendation Types
// ============================================

/**
 * Investment recommendation verdict
 */
export type RecommendationVerdict =
  | 'strong_buy'
  | 'buy'
  | 'hold'
  | 'pass'
  | 'avoid';

/**
 * Exit strategy recommendation
 */
export type ExitStrategy =
  | 'flip'
  | 'rental'
  | 'wholesale'
  | 'hold';

/**
 * Complete investment recommendation with all analysis
 */
export interface InvestmentRecommendation {
  /** Investment verdict: strong_buy, buy, hold, pass, avoid */
  verdict: RecommendationVerdict;
  /** Confidence in recommendation (0-100) */
  confidence: number;
  /** Maximum recommended bid amount */
  maxBid: number;
  /** Expected profit at max bid */
  targetProfit: number;
  /** Top reasons supporting the recommendation */
  keyFactors: string[];
  /** Key risks identified */
  risks: string[];
  /** Potential upside opportunities */
  opportunities: string[];
  /** Recommended exit strategy */
  exitStrategy: ExitStrategy;
  /** Estimated time to exit in months */
  timelineMonths: number;
}

/**
 * Input parameters for generating a recommendation
 */
export interface RecommendationInput {
  /** Calculated investment metrics */
  metrics: InvestmentMetrics;
  /** Complete cost breakdown */
  costs: CostBreakdown;
  /** Risk score from risk analysis (0-25, higher is better/safer) */
  riskScore: number;
  /** Location score from location analysis (0-25) */
  locationScore: number;
  /** Market score from market analysis (0-25) */
  marketScore: number;
  /** Confidence level in comparables data */
  comparablesConfidence: 'low' | 'medium' | 'high';
  /** Property condition assessment */
  propertyCondition?: 'excellent' | 'good' | 'fair' | 'poor' | 'distressed';
}

// ============================================
// Data Quality Types
// ============================================

/**
 * Component-level quality scores
 */
export interface DataQualityComponents {
  /** Quality of comparable sales data (0-100) */
  comparablesQuality: number;
  /** Accuracy of cost estimates (0-100) */
  costEstimateAccuracy: number;
  /** Freshness of market data (0-100) */
  marketDataFreshness: number;
  /** Completeness of property data (0-100) */
  propertyDataCompleteness: number;
}

/**
 * Complete data quality assessment
 */
export interface DataQualityAssessment {
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Individual component scores */
  components: DataQualityComponents;
  /** List of missing data fields */
  missingData: string[];
  /** Assumptions made due to missing data */
  assumptions: string[];
}

// ============================================
// Comparables Types
// ============================================

/**
 * Individual comparable sale record
 */
export interface ComparableSale {
  /** Unique identifier */
  id: string;
  /** Property address */
  address: string;
  /** City */
  city?: string;
  /** State */
  state?: string;
  /** ZIP code */
  zip?: string;
  /** Sale price */
  salePrice: number;
  /** Date of sale */
  saleDate: string;
  /** Building square footage */
  sqft?: number;
  /** Lot size in square feet */
  lotSizeSqft?: number;
  /** Number of bedrooms */
  bedrooms?: number;
  /** Number of bathrooms */
  bathrooms?: number;
  /** Year built */
  yearBuilt?: number;
  /** Property type */
  propertyType?: string;
  /** Calculated price per square foot */
  pricePerSqft?: number;
  /** Distance from subject property in miles */
  distanceMiles?: number;
  /** Similarity score to subject (0-100) */
  similarityScore?: number;
  /** Adjustments applied */
  adjustments?: ComparableAdjustment[];
  /** Adjusted sale price after adjustments */
  adjustedPrice?: number;
  /** Data source */
  source?: string;
}

/**
 * Adjustment applied to a comparable
 */
export interface ComparableAdjustment {
  /** Type of adjustment */
  type: string;
  /** Adjustment amount (positive or negative) */
  amount: number;
  /** Reason for adjustment */
  reason: string;
}

/**
 * Complete comparables analysis result
 */
export interface ComparablesAnalysis {
  /** Array of comparable sales */
  comparables: ComparableSale[];
  /** Estimated ARV from comparables */
  estimatedARV: number;
  /** Low estimate */
  arvLowRange: number;
  /** High estimate */
  arvHighRange: number;
  /** Average price per square foot */
  averagePricePerSqft: number;
  /** Median price per square foot */
  medianPricePerSqft: number;
  /** Number of comparables found */
  comparablesCount: number;
  /** Search radius used in miles */
  searchRadiusMiles: number;
  /** Confidence level based on comp quality */
  confidence: 'low' | 'medium' | 'high';
  /** Data source */
  dataSource: string;
  /** Analysis notes */
  notes: string[];
}

// ============================================
// Complete Financial Analysis Type
// ============================================

/**
 * Complete financial analysis output
 * Aggregates all cost, revenue, metric, and recommendation data
 */
export interface FinancialAnalysis {
  /** Complete cost breakdown */
  costs: CostBreakdown;
  /** Revenue projections (sale and rental) */
  revenue: RevenueProjection;
  /** Calculated investment metrics */
  metrics: InvestmentMetrics;
  /** Comparables analysis */
  comparables: ComparablesAnalysis;
  /** Investment recommendation */
  recommendation: InvestmentRecommendation;
  /** Analysis timestamp */
  analysisDate: string;
  /** Overall confidence level (0-100) */
  confidenceLevel: number;
  /** Data quality assessment */
  dataQuality: DataQualityAssessment;
}

// ============================================
// Input Types for Analysis
// ============================================

/**
 * Property data needed for financial analysis
 */
export interface PropertyFinancialData {
  /** Property ID */
  id: string;
  /** Property address */
  address: string;
  /** State code */
  state?: string;
  /** County name */
  county?: string;
  /** Building square footage */
  sqft?: number;
  /** Lot size in square feet */
  lotSizeSqft?: number;
  /** Number of bedrooms */
  bedrooms?: number;
  /** Number of bathrooms */
  bathrooms?: number;
  /** Year built */
  yearBuilt?: number;
  /** Property type */
  propertyType?: string;
  /** Annual property taxes */
  annualTaxes?: number;
  /** Total amount due (auction starting price) */
  totalDue?: number;
}

/**
 * Regrid data used for financial analysis
 */
export interface RegridFinancialData {
  /** Building square footage */
  building_sqft?: number;
  /** Year built */
  year_built?: number;
  /** Lot size in square feet */
  lot_size_sqft?: number;
  /** Number of bedrooms */
  bedrooms?: number;
  /** Number of bathrooms */
  bathrooms?: number;
  /** Property type/class */
  property_type?: string;
  /** Assessed value */
  assessed_value?: number;
  /** Latitude for location */
  latitude?: number;
  /** Longitude for location */
  longitude?: number;
}

/**
 * Options for financial analysis
 */
export interface FinancialAnalysisOptions {
  /** Rehab scope: cosmetic, moderate, major, gut */
  rehabScope?: RehabScope;
  /** Expected holding period in months */
  holdingMonths?: number;
  /** Auction type for premium calculation */
  auctionType?: 'tax_deed' | 'tax_lien' | 'foreclosure' | 'traditional';
  /** Whether to fetch comparables from external API */
  fetchComparables?: boolean;
  /** Existing comparables to use (skip fetch if provided) */
  existingComparables?: ComparableSale[];
}

/**
 * Complete input for financial analysis
 */
export interface FinancialAnalysisInput {
  /** Property data */
  property: PropertyFinancialData;
  /** Regrid enrichment data */
  regridData?: RegridFinancialData;
  /** Purchase/bid price */
  purchasePrice: number;
  /** Risk score from Phase 7 (0-25) */
  riskScore: number;
  /** Location score (0-25) */
  locationScore: number;
  /** Market score (0-25) */
  marketScore: number;
  /** Additional options */
  options?: FinancialAnalysisOptions;
}

// ============================================
// Threshold Configuration Types
// ============================================

/**
 * Thresholds for a single verdict level
 */
export interface VerdictThreshold {
  /** Minimum ROI percentage */
  minROI: number;
  /** Minimum profit margin percentage */
  minProfitMargin?: number;
  /** Maximum price-to-ARV ratio */
  maxPriceToARV: number;
  /** Minimum risk score (higher = safer) */
  minRiskScore?: number;
}

/**
 * All verdict thresholds configuration
 */
export interface RecommendationThresholds {
  strongBuy: VerdictThreshold;
  buy: VerdictThreshold;
  hold: VerdictThreshold;
  pass: VerdictThreshold;
  // Below pass thresholds = avoid
}
