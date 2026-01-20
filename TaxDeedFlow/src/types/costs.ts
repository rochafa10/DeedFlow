/**
 * Cost Estimation Engine - Type Definitions
 *
 * This file contains all TypeScript interfaces for the cost estimation system
 * including acquisition, rehab, holding, and selling cost calculations with
 * regional multiplier support.
 *
 * @module types/costs
 * @author Claude Code Agent
 * @date 2026-01-16
 */

// ============================================
// Regional Multiplier Types
// ============================================

/**
 * Regional cost multipliers for a specific state
 * Labor and materials multipliers adjust base costs by region
 * Tax rate is the effective property tax rate (annual taxes / assessed value)
 */
export interface RegionalMultiplier {
  /** Labor cost multiplier relative to national average (1.0 = average) */
  labor: number;
  /** Material cost multiplier relative to national average (1.0 = average) */
  materials: number;
  /** Effective property tax rate as decimal (e.g., 0.0153 = 1.53%) */
  taxRate: number;
}

/**
 * Metro-level cost multiplier override
 * Provides more granular pricing for major metropolitan areas
 */
export interface MetroMultiplier {
  /** Labor cost multiplier for this metro area */
  labor: number;
  /** Material cost multiplier for this metro area */
  materials: number;
  /** Optional metro-specific tax rate override */
  taxRate?: number;
}

// ============================================
// Acquisition Cost Types
// ============================================

/**
 * Complete breakdown of property acquisition costs
 * Includes all costs to purchase and transfer ownership
 */
export interface AcquisitionCosts {
  /** Expected bid/purchase price at auction */
  bidAmount: number;
  /** Buyer's premium charged by auction platform (typically 5-10%) */
  buyersPremium: number;
  /** State/local transfer taxes on property sale */
  transferTax: number;
  /** County recording fees for deed transfer */
  recordingFees: number;
  /** Title search costs */
  titleSearch: number;
  /** Title insurance premium */
  titleInsurance: number;
  /** Attorney/legal fees for closing */
  legalFees: number;
  /** Sum of all acquisition costs */
  totalAcquisition: number;
}

/**
 * Auction platform types with different fee structures
 */
export type AuctionPlatform =
  | 'bid4assets'
  | 'govease'
  | 'realauction'
  | 'grant_street'
  | 'county_direct'
  | 'in_person'
  | 'other';

// ============================================
// Rehab Cost Types
// ============================================

/**
 * Exterior renovation cost breakdown
 */
export interface ExteriorCosts {
  /** Roof repair/replacement */
  roof: number;
  /** Siding repair/replacement */
  siding: number;
  /** Window replacement */
  windows: number;
  /** Door replacement (entry, garage) */
  doors: number;
  /** Landscaping, grading, drainage */
  landscaping: number;
  /** Driveway, walkways, exterior structures */
  hardscape: number;
  /** Sum of exterior costs */
  total: number;
}

/**
 * Interior renovation cost breakdown
 */
export interface InteriorCosts {
  /** Flooring (carpet, hardwood, tile, vinyl) */
  flooring: number;
  /** Interior paint and wall repairs */
  paint: number;
  /** Kitchen renovation (cabinets, counters, appliances) */
  kitchen: number;
  /** Bathroom renovation (fixtures, tile, vanities) */
  bathrooms: number;
  /** Electrical system updates/repairs */
  electrical: number;
  /** Plumbing system updates/repairs */
  plumbing: number;
  /** HVAC system repair/replacement */
  hvac: number;
  /** Interior doors, trim, hardware */
  fixtures: number;
  /** Sum of interior costs */
  total: number;
}

/**
 * Structural repair cost breakdown
 */
export interface StructuralCosts {
  /** Foundation repair/waterproofing */
  foundation: number;
  /** Framing repairs/modifications */
  framing: number;
  /** Insulation improvements */
  insulation: number;
  /** Sum of structural costs */
  total: number;
}

/**
 * Complete rehabilitation cost breakdown
 * Provides itemized costs for all renovation categories
 */
export interface RehabBreakdown {
  /** Exterior renovation costs */
  exterior: ExteriorCosts;
  /** Interior renovation costs */
  interior: InteriorCosts;
  /** Structural repair costs */
  structural: StructuralCosts;
  /** Building permits and inspections */
  permits: number;
  /** Regional labor cost multiplier applied */
  laborMultiplier: number;
  /** Regional material cost multiplier applied */
  materialMultiplier: number;
  /** Sum of all rehab costs before contingency */
  totalRehab: number;
}

/**
 * Property condition assessment levels
 * Determines rehab scope and cost estimates
 */
export type PropertyCondition =
  | 'excellent'    // Move-in ready, minimal work needed
  | 'good'         // Minor cosmetic updates only
  | 'fair'         // Moderate updates, some systems need attention
  | 'poor'         // Significant work needed, deferred maintenance
  | 'distressed';  // Major renovation or gut rehab required

/**
 * Rehab scope levels for cost estimation
 */
export type RehabScope =
  | 'cosmetic'     // Paint, carpet, fixtures only ($15-25/sqft)
  | 'light'        // Cosmetic + minor repairs ($25-35/sqft)
  | 'moderate'     // Light + kitchen/bath updates ($35-50/sqft)
  | 'heavy'        // Moderate + systems updates ($50-75/sqft)
  | 'gut';         // Complete renovation down to studs ($75-125/sqft)

// ============================================
// Holding Cost Types
// ============================================

/**
 * Monthly holding cost breakdown
 * Recurring costs during renovation and marketing period
 */
export interface HoldingBreakdown {
  /** Monthly property tax payment */
  monthlyTaxes: number;
  /** Monthly property insurance premium */
  monthlyInsurance: number;
  /** Monthly utilities (electric, gas, water, sewer) */
  monthlyUtilities: number;
  /** Monthly maintenance/lawn care/snow removal */
  monthlyMaintenance: number;
  /** Monthly loan payment (if financing) */
  monthlyLoanPayment: number;
  /** Monthly HOA dues (if applicable) */
  monthlyHoa: number;
  /** Sum of all monthly costs */
  totalMonthly: number;
  /** Estimated holding period in months */
  holdingPeriodMonths: number;
  /** Total holding costs (monthly * months) */
  totalHolding: number;
}

/**
 * Financing parameters for holding cost calculation
 */
export interface FinancingParams {
  /** Whether property is financed (vs. cash purchase) */
  isFinanced: boolean;
  /** Loan amount (typically 70-80% of purchase) */
  loanAmount: number;
  /** Annual interest rate as decimal (e.g., 0.08 = 8%) */
  interestRate: number;
  /** Loan term in months */
  termMonths: number;
  /** Whether loan is interest-only during holding */
  interestOnly: boolean;
}

// ============================================
// Selling Cost Types
// ============================================

/**
 * Complete breakdown of property selling costs
 * All costs associated with disposing of the property
 */
export interface SellingCosts {
  /** Real estate agent commission (typically 5-6% of sale price) */
  agentCommission: number;
  /** Seller closing costs (title, escrow, prorations) */
  closingCosts: number;
  /** Professional staging costs */
  staging: number;
  /** Marketing, photography, advertising */
  marketing: number;
  /** Home warranty for buyer (optional) */
  homeWarranty: number;
  /** Seller concessions/credits to buyer */
  sellerConcessions: number;
  /** Sum of all selling costs */
  totalSelling: number;
}

/**
 * Sale strategy options affecting cost calculations
 */
export type SaleStrategy =
  | 'retail_agent'     // Full retail with agent (highest price, highest cost)
  | 'retail_fsbo'      // For sale by owner (lower cost, more effort)
  | 'wholesale'        // Wholesale to investor (lower price, fastest)
  | 'auction';         // Sell at auction (variable price, moderate cost)

// ============================================
// Complete Cost Breakdown Types
// ============================================

/**
 * Complete cost breakdown for a property investment
 * Aggregates all cost categories with contingency
 */
export interface CostBreakdown {
  /** Acquisition/purchase costs */
  acquisition: AcquisitionCosts;
  /** Rehabilitation/renovation costs */
  rehab: RehabBreakdown;
  /** Holding costs during renovation/marketing */
  holding: HoldingBreakdown;
  /** Selling/disposition costs */
  selling: SellingCosts;
  /** Sum of all costs before contingency */
  totalCosts: number;
  /** Contingency reserve (typically 10%) */
  contingency: number;
  /** Grand total including contingency */
  grandTotal: number;
  /** Confidence level in the estimate (low/medium/high) */
  confidence: CostConfidence;
  /** Data quality score (0-100) */
  dataQuality: number;
  /** Warnings or flags about the estimate */
  warnings: string[];
}

/**
 * Confidence level in cost estimates
 */
export type CostConfidence = 'low' | 'medium' | 'high';

// ============================================
// Input Types
// ============================================

/**
 * Inputs required for complete cost calculation
 */
export interface CostInputs {
  /** Expected bid/purchase price */
  bidAmount: number;
  /** Estimated property value (for insurance, etc.) */
  propertyValue: number;
  /** Current assessed value for tax calculations */
  assessedValue?: number;
  /** Rehab scope/level */
  rehabLevel: RehabScope;
  /** Property condition assessment */
  condition?: PropertyCondition;
  /** Estimated holding period in months */
  holdingMonths: number;
  /** Expected sale price (ARV) */
  salePrice: number;
  /** Two-letter state code */
  state: string;
  /** County name for regional adjustments */
  county?: string;
  /** City/metro area for metro-level adjustments */
  metro?: string;
  /** Property square footage (for rehab cost/sqft) */
  sqft?: number;
  /** Year property was built */
  yearBuilt?: number;
  /** Annual property taxes (if known) */
  annualTaxes?: number;
  /** Financing parameters (optional) */
  financing?: FinancingParams;
  /** Auction platform for premium calculation */
  auctionPlatform?: AuctionPlatform;
  /** Sale strategy for selling cost calculation */
  saleStrategy?: SaleStrategy;
  /** Monthly HOA dues (if applicable) */
  monthlyHoa?: number;
}

/**
 * Property data subset needed for cost calculations
 */
export interface PropertyCostData {
  /** Property square footage */
  sqft?: number;
  /** Year property was built */
  yearBuilt?: number;
  /** Two-letter state code */
  state?: string;
  /** City name */
  city?: string;
  /** County name */
  county?: string;
  /** Annual property taxes */
  annualTaxes?: number;
  /** Current assessed value */
  assessedValue?: number;
  /** Property type (SFR, condo, etc.) */
  propertyType?: string;
}

/**
 * Regrid data subset used for cost calculations
 */
export interface RegridCostData {
  /** Building square footage from Regrid */
  building_sqft?: number;
  /** Year built from Regrid */
  year_built?: number;
  /** Property class/type from Regrid */
  property_class?: string;
  /** Assessed value from Regrid */
  assessed_value?: number;
}

// ============================================
// Result Types
// ============================================

/**
 * Cost calculation result with metadata
 */
export interface CostCalculationResult {
  /** Complete cost breakdown */
  costs: CostBreakdown;
  /** Inputs used for calculation */
  inputs: CostInputs;
  /** Regional multipliers applied */
  multipliers: {
    labor: number;
    materials: number;
    region: string;
  };
  /** Calculation timestamp */
  calculatedAt: string;
  /** Version of cost engine */
  engineVersion: string;
}

/**
 * Cost estimate summary for display
 */
export interface CostSummary {
  /** Grand total investment required */
  totalInvestment: number;
  /** Acquisition costs subtotal */
  acquisitionTotal: number;
  /** Rehab costs subtotal */
  rehabTotal: number;
  /** Holding costs subtotal */
  holdingTotal: number;
  /** Selling costs subtotal */
  sellingTotal: number;
  /** Contingency amount */
  contingency: number;
  /** Confidence level */
  confidence: CostConfidence;
  /** Primary warnings */
  topWarnings: string[];
}
