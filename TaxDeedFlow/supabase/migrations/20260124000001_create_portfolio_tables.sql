-- Migration: 20260124000001_create_portfolio_tables.sql
-- Description: Create tables for Investment Portfolio Dashboard to track property acquisitions, rehab expenses, and sales
-- Author: Claude Code Agent
-- Date: 2026-01-24
-- Dependencies: properties table, auth.users

BEGIN;

-- ============================================
-- Table: portfolio_purchases
-- Tracks property acquisitions with cost details
-- ============================================
CREATE TABLE IF NOT EXISTS portfolio_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Purchase details
  purchase_date DATE NOT NULL,
  purchase_price DECIMAL(12,2) NOT NULL CHECK (purchase_price >= 0),
  closing_costs DECIMAL(12,2) DEFAULT 0 CHECK (closing_costs >= 0),
  total_acquisition_cost DECIMAL(12,2) GENERATED ALWAYS AS (purchase_price + COALESCE(closing_costs, 0)) STORED,

  -- ROI tracking
  predicted_roi DECIMAL(5,2), -- From property report if available

  -- Additional information
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),

  -- Soft delete support
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Single-column indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_purchases_property ON portfolio_purchases(property_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_purchases_user ON portfolio_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_purchases_status ON portfolio_purchases(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_purchases_deleted ON portfolio_purchases(deleted_at) WHERE deleted_at IS NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_portfolio_purchases_user_date ON portfolio_purchases(user_id, purchase_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_portfolio_purchases_user_status ON portfolio_purchases(user_id, status, purchase_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_portfolio_purchases_property_user ON portfolio_purchases(property_id, user_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE portfolio_purchases IS 'Tracks property acquisitions with purchase price, closing costs, and predicted ROI';
COMMENT ON COLUMN portfolio_purchases.total_acquisition_cost IS 'Calculated field: purchase_price + closing_costs';
COMMENT ON COLUMN portfolio_purchases.predicted_roi IS 'ROI prediction from property analysis report at time of purchase';
COMMENT ON COLUMN portfolio_purchases.status IS 'Purchase status: active (owned), sold (completed), cancelled (deal fell through)';

-- ============================================
-- Table: portfolio_rehab_expenses
-- Line items for rehabilitation costs
-- ============================================
CREATE TABLE IF NOT EXISTS portfolio_rehab_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES portfolio_purchases(id) ON DELETE CASCADE,

  -- Expense details
  description TEXT NOT NULL,
  cost DECIMAL(12,2) NOT NULL CHECK (cost >= 0),
  expense_date DATE NOT NULL,
  category VARCHAR(50), -- e.g., 'Electrical', 'Plumbing', 'Roofing', 'Cosmetic', 'Legal', 'Other'

  -- Metadata
  receipt_url TEXT, -- Link to receipt/invoice in storage
  vendor_name TEXT,

  -- Soft delete support
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rehab expenses
CREATE INDEX IF NOT EXISTS idx_portfolio_rehab_purchase ON portfolio_rehab_expenses(purchase_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_rehab_date ON portfolio_rehab_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_rehab_category ON portfolio_rehab_expenses(category);
CREATE INDEX IF NOT EXISTS idx_portfolio_rehab_deleted ON portfolio_rehab_expenses(deleted_at) WHERE deleted_at IS NULL;

-- Composite index for purchase expense summary
CREATE INDEX IF NOT EXISTS idx_portfolio_rehab_purchase_date ON portfolio_rehab_expenses(purchase_id, expense_date DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE portfolio_rehab_expenses IS 'Line items for rehabilitation and improvement costs per property purchase';
COMMENT ON COLUMN portfolio_rehab_expenses.category IS 'Expense category for reporting: Electrical, Plumbing, Roofing, Cosmetic, Legal, Other';
COMMENT ON COLUMN portfolio_rehab_expenses.receipt_url IS 'Optional URL to receipt/invoice stored in Supabase Storage';

-- ============================================
-- Table: portfolio_sales
-- Records property sales and ROI calculations
-- ============================================
CREATE TABLE IF NOT EXISTS portfolio_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL UNIQUE REFERENCES portfolio_purchases(id) ON DELETE CASCADE,

  -- Sale details
  sale_price DECIMAL(12,2) NOT NULL CHECK (sale_price >= 0),
  sale_date DATE NOT NULL,
  closing_costs DECIMAL(12,2) DEFAULT 0 CHECK (closing_costs >= 0),
  net_proceeds DECIMAL(12,2) GENERATED ALWAYS AS (sale_price - COALESCE(closing_costs, 0)) STORED,

  -- ROI calculation (calculated via function/trigger or application)
  actual_roi DECIMAL(5,2), -- Calculated: (net_proceeds - total_invested) / total_invested * 100

  -- Sale metadata
  buyer_name TEXT,
  sale_type VARCHAR(50), -- e.g., 'MLS', 'Cash Buyer', 'Wholesaled', 'Auction', 'Other'
  notes TEXT,

  -- Soft delete support
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sales
CREATE INDEX IF NOT EXISTS idx_portfolio_sales_purchase ON portfolio_sales(purchase_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_sales_date ON portfolio_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_sales_type ON portfolio_sales(sale_type);
CREATE INDEX IF NOT EXISTS idx_portfolio_sales_deleted ON portfolio_sales(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE portfolio_sales IS 'Records property sales with actual ROI calculations vs predicted ROI';
COMMENT ON COLUMN portfolio_sales.net_proceeds IS 'Calculated field: sale_price - closing_costs';
COMMENT ON COLUMN portfolio_sales.actual_roi IS 'Actual return on investment: (net_proceeds - total_invested) / total_invested * 100';
COMMENT ON COLUMN portfolio_sales.sale_type IS 'Method of sale: MLS, Cash Buyer, Wholesaled, Auction, Other';

-- ============================================
-- Trigger: Update updated_at on row modification
-- ============================================
CREATE OR REPLACE FUNCTION update_portfolio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all portfolio tables
CREATE TRIGGER update_portfolio_purchases_updated_at
  BEFORE UPDATE ON portfolio_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_updated_at();

CREATE TRIGGER update_portfolio_rehab_expenses_updated_at
  BEFORE UPDATE ON portfolio_rehab_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_updated_at();

CREATE TRIGGER update_portfolio_sales_updated_at
  BEFORE UPDATE ON portfolio_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_updated_at();

-- ============================================
-- Trigger: Auto-update portfolio_purchases.status when sold
-- ============================================
CREATE OR REPLACE FUNCTION update_purchase_status_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Mark purchase as sold when sale record is created
    UPDATE portfolio_purchases
    SET status = 'sold'
    WHERE id = NEW.purchase_id AND deleted_at IS NULL;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL) THEN
    -- Mark purchase as active if sale record is deleted
    UPDATE portfolio_purchases
    SET status = 'active'
    WHERE id = COALESCE(NEW.purchase_id, OLD.purchase_id) AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_status_on_sale_trigger
  AFTER INSERT OR UPDATE OR DELETE ON portfolio_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_status_on_sale();

COMMENT ON FUNCTION update_purchase_status_on_sale IS 'Automatically updates portfolio_purchases.status to sold when a sale record is created';

COMMIT;
