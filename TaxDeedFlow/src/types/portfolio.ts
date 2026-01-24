// Portfolio type definitions matching database schema

/**
 * Portfolio purchase status
 * - active: Currently owned property
 * - sold: Property has been sold
 * - cancelled: Purchase/deal fell through
 */
export type PurchaseStatus = 'active' | 'sold' | 'cancelled';

/**
 * Expense category for rehab costs
 */
export type RehabCategory = 'Electrical' | 'Plumbing' | 'Roofing' | 'Cosmetic' | 'Legal' | 'Other';

/**
 * Sale type/method
 */
export type SaleType = 'MLS' | 'Cash Buyer' | 'Wholesaled' | 'Auction' | 'Other';

/**
 * Portfolio purchase record tracking property acquisition
 */
export interface PortfolioPurchase {
  id: string;
  property_id: string;
  user_id: string;

  // Purchase details
  purchase_date: string; // ISO date string
  purchase_price: number;
  closing_costs: number;
  total_acquisition_cost: number; // Calculated: purchase_price + closing_costs

  // ROI tracking
  predicted_roi: number | null;

  // Additional information
  notes: string | null;
  status: PurchaseStatus;

  // Soft delete
  deleted_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Rehab expense line item for a purchase
 */
export interface PortfolioRehabExpense {
  id: string;
  purchase_id: string;

  // Expense details
  description: string;
  cost: number;
  expense_date: string; // ISO date string
  category: RehabCategory | null;

  // Metadata
  receipt_url: string | null;
  vendor_name: string | null;

  // Soft delete
  deleted_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Sale record with actual ROI calculation
 */
export interface PortfolioSale {
  id: string;
  purchase_id: string;

  // Sale details
  sale_price: number;
  sale_date: string; // ISO date string
  closing_costs: number;
  net_proceeds: number; // Calculated: sale_price - closing_costs

  // ROI calculation
  actual_roi: number | null;

  // Sale metadata
  buyer_name: string | null;
  sale_type: SaleType | null;
  notes: string | null;

  // Soft delete
  deleted_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Aggregate portfolio statistics for dashboard
 */
export interface PortfolioStats {
  // Property counts
  totalProperties: number;
  activeProperties: number;
  soldProperties: number;

  // Financial aggregates
  totalInvested: number; // Sum of all acquisition costs + rehab expenses
  totalReturns: number; // Sum of all net proceeds from sales
  totalProfit: number; // totalReturns - totalInvested
  averageROI: number | null; // Average actual ROI across sold properties

  // Performance metrics
  averagePurchasePrice: number | null;
  averageRehabCost: number | null;
  averageSalePrice: number | null;
  averageHoldingDays: number | null; // Average days from purchase to sale

  // Prediction accuracy
  avgPredictedROI: number | null; // Average predicted ROI
  avgActualROI: number | null; // Average actual ROI
  roiVariance: number | null; // Difference between predicted and actual
}

/**
 * Complete portfolio item with related data for display
 */
export interface PortfolioSummary {
  // Purchase information
  purchase: PortfolioPurchase;

  // Related property details
  property: {
    id: string;
    parcel_id: string | null;
    address: string | null;
    county_name: string | null;
    state: string | null;
  } | null;

  // Rehab expenses
  rehabExpenses: PortfolioRehabExpense[];
  totalRehabCost: number;

  // Sale information (if sold)
  sale: PortfolioSale | null;

  // Calculated totals
  totalInvested: number; // acquisition + rehab
  grossProfit: number | null; // net_proceeds - totalInvested (if sold)
  actualROI: number | null; // (grossProfit / totalInvested) * 100 (if sold)
  roiVariance: number | null; // actualROI - predicted_roi (if sold)
}

/**
 * Portfolio list item for table display
 */
export interface PortfolioListItem {
  id: string;
  propertyAddress: string;
  parcelId: string;
  countyState: string;
  purchaseDate: string;
  purchasePrice: number;
  totalInvested: number;
  status: PurchaseStatus;
  salePrice: number | null;
  actualROI: number | null;
  predictedROI: number | null;
  roiVariance: number | null;
}

/**
 * Form data for creating/updating a purchase
 */
export interface PortfolioPurchaseFormData {
  property_id: string;
  purchase_date: string;
  purchase_price: number;
  closing_costs: number;
  predicted_roi: number | null;
  notes: string;
}

/**
 * Form data for creating/updating a rehab expense
 */
export interface PortfolioRehabExpenseFormData {
  description: string;
  cost: number;
  expense_date: string;
  category: RehabCategory | null;
  receipt_url: string;
  vendor_name: string;
}

/**
 * Form data for recording a sale
 */
export interface PortfolioSaleFormData {
  sale_price: number;
  sale_date: string;
  closing_costs: number;
  buyer_name: string;
  sale_type: SaleType | null;
  notes: string;
}
