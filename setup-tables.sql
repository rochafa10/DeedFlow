-- Tax Deed Platform Database Schema
-- Version: 1.0.0
-- Description: Complete database schema for Tax Deed Platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- Property Classification
CREATE TYPE property_classification AS ENUM ('A', 'B', 'C', 'D', 'F');

-- Auction Types
CREATE TYPE auction_type AS ENUM ('Tax Deed', 'Tax Lien');

-- Property Types
CREATE TYPE property_type AS ENUM (
  'Single Family Residential',
  'Multi Family Residential',
  'Condominium',
  'Townhouse',
  'Vacant Land',
  'Commercial',
  'Industrial',
  'Agricultural',
  'Mixed Use'
);

-- Occupancy Status
CREATE TYPE occupancy_status AS ENUM ('Vacant', 'Owner Occupied', 'Tenant Occupied', 'Unknown');

-- Inspection Item Status
CREATE TYPE inspection_status AS ENUM ('good', 'fair', 'poor', 'not_applicable');

-- Lien Types
CREATE TYPE lien_type AS ENUM (
  'Property Tax',
  'Water/Sewer',
  'Code Violation',
  'HOA',
  'Mortgage',
  'IRS',
  'Other'
);

-- Risk Level
CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High');

-- =====================================================
-- TABLES
-- =====================================================

-- States Table
CREATE TABLE states (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code VARCHAR(2) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  auction_type auction_type NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Counties Table
CREATE TABLE counties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  state_id UUID REFERENCES states(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  state_code VARCHAR(2) NOT NULL,
  tax_collector_url TEXT,
  auction_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(state_id, name)
);

-- Properties Table (Main)
CREATE TABLE properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parcel_number VARCHAR(50) NOT NULL,
  alternate_key VARCHAR(50),
  county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
  
  -- Address Information
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Property Characteristics
  property_type property_type,
  year_built INTEGER,
  living_area INTEGER,
  lot_size INTEGER,
  acres DECIMAL(10, 4),
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),
  garage_spaces INTEGER,
  pool BOOLEAN DEFAULT false,
  stories INTEGER,
  
  -- Structural Details
  roof_type VARCHAR(50),
  roof_age INTEGER,
  hvac_type VARCHAR(50),
  hvac_age INTEGER,
  
  -- Classification & Scoring
  classification property_classification,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  
  -- Tax Sale Information
  certificate_number VARCHAR(50),
  amount_due DECIMAL(12, 2),
  minimum_bid DECIMAL(12, 2),
  deposit_amount DECIMAL(12, 2),
  estimated_taxes DECIMAL(12, 2),
  additional_fees DECIMAL(12, 2),
  
  -- Dates
  sale_date DATE,
  redemption_deadline DATE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE(parcel_number, county_id)
);

-- Property Valuation Table
CREATE TABLE property_valuations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Values
  assessed_value DECIMAL(12, 2),
  market_value DECIMAL(12, 2),
  land_value DECIMAL(12, 2),
  building_value DECIMAL(12, 2),
  
  -- Previous Sale
  last_sale_price DECIMAL(12, 2),
  last_sale_date DATE,
  
  -- Rental Estimates
  estimated_rent_min DECIMAL(10, 2),
  estimated_rent_max DECIMAL(10, 2),
  median_area_rent DECIMAL(10, 2),
  
  -- Investment Metrics
  cap_rate DECIMAL(5, 4),
  gross_yield DECIMAL(5, 4),
  cash_on_cash DECIMAL(5, 4),
  arv_estimate DECIMAL(12, 2),
  rehab_estimate DECIMAL(12, 2),
  holding_costs DECIMAL(12, 2),
  profit_potential DECIMAL(12, 2),
  
  valuation_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Owner Information Table
CREATE TABLE property_owners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  owner_name VARCHAR(200),
  owner_address TEXT,
  owner_city VARCHAR(100),
  owner_state VARCHAR(2),
  owner_zip VARCHAR(10),
  owner_occupied BOOLEAN DEFAULT false,
  occupancy_status occupancy_status,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Legal Description Table
CREATE TABLE property_legal (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE UNIQUE,
  legal_description TEXT,
  subdivision VARCHAR(200),
  plat_book VARCHAR(20),
  plat_page VARCHAR(20),
  section VARCHAR(10),
  township VARCHAR(10),
  range VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Liens Table
CREATE TABLE property_liens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  lien_type lien_type NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  lien_date DATE,
  lien_holder VARCHAR(200),
  description TEXT,
  is_satisfied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Neighborhood Analysis Table
CREATE TABLE neighborhood_analysis (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  median_home_value DECIMAL(12, 2),
  median_rent DECIMAL(10, 2),
  walk_score INTEGER CHECK (walk_score >= 0 AND walk_score <= 100),
  transit_score INTEGER CHECK (transit_score >= 0 AND transit_score <= 100),
  crime_index VARCHAR(20),
  school_rating DECIMAL(3, 1) CHECK (school_rating >= 0 AND school_rating <= 10),
  population_density VARCHAR(20),
  employment_rate DECIMAL(5, 2),
  median_income DECIMAL(12, 2),
  analysis_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Risk Assessment Table
CREATE TABLE risk_assessments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  flood_zone VARCHAR(10),
  hurricane_zone BOOLEAN DEFAULT false,
  earthquake_zone BOOLEAN DEFAULT false,
  fire_zone BOOLEAN DEFAULT false,
  environmental_issues BOOLEAN DEFAULT false,
  environmental_notes TEXT,
  code_violations INTEGER DEFAULT 0,
  code_violation_details TEXT,
  open_permits INTEGER DEFAULT 0,
  permit_details TEXT,
  crime_rate VARCHAR(20),
  overall_risk_level risk_level,
  risk_notes TEXT,
  assessment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Auctions Table
CREATE TABLE auctions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
  auction_date DATE NOT NULL,
  auction_time TIME,
  auction_type auction_type NOT NULL,
  location TEXT,
  is_online BOOLEAN DEFAULT false,
  registration_deadline DATE,
  deposit_required DECIMAL(12, 2),
  minimum_bid_increment DECIMAL(10, 2),
  total_properties INTEGER,
  status VARCHAR(20) DEFAULT 'upcoming',
  auction_url TEXT,
  rules_url TEXT,
  property_list_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Auction Properties Junction Table
CREATE TABLE auction_properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  lot_number VARCHAR(20),
  opening_bid DECIMAL(12, 2),
  status VARCHAR(20) DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(auction_id, property_id)
);

-- Auction Documents Table
CREATE TABLE auction_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  document_name VARCHAR(200) NOT NULL,
  document_type VARCHAR(50),
  document_url TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inspections Table
CREATE TABLE inspections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  inspection_date DATE DEFAULT CURRENT_DATE,
  inspector_name VARCHAR(200),
  overall_condition VARCHAR(20),
  estimated_repairs DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inspection Items Table
CREATE TABLE inspection_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  status inspection_status NOT NULL,
  notes TEXT,
  estimated_cost DECIMAL(10, 2),
  priority VARCHAR(20),
  photo_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Financial Analysis Table
CREATE TABLE financial_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  strategy VARCHAR(50) NOT NULL, -- 'Fix & Flip', 'BRRRR', 'Wholesale', 'Buy & Hold'
  
  -- Purchase Costs
  purchase_price DECIMAL(12, 2),
  closing_costs DECIMAL(10, 2),
  
  -- Renovation
  renovation_budget DECIMAL(12, 2),
  renovation_timeline INTEGER, -- days
  
  -- Holding Costs
  monthly_holding_costs DECIMAL(10, 2),
  total_holding_costs DECIMAL(12, 2),
  
  -- Exit Strategy
  arv DECIMAL(12, 2),
  selling_costs DECIMAL(10, 2),
  
  -- Returns
  total_investment DECIMAL(12, 2),
  expected_profit DECIMAL(12, 2),
  roi_percentage DECIMAL(5, 2),
  cash_flow_monthly DECIMAL(10, 2),
  
  analysis_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Saved Properties Table
CREATE TABLE user_saved_properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL, -- Will reference auth.users when auth is set up
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  list_name VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, property_id)
);

-- Property Photos Table
CREATE TABLE property_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type VARCHAR(50), -- 'exterior', 'interior', 'street', 'aerial'
  caption TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Property Enrichment Log Table
CREATE TABLE enrichment_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  source VARCHAR(100), -- 'county', 'zillow', 'redfin', 'google', etc.
  status VARCHAR(20), -- 'pending', 'success', 'failed'
  data_retrieved JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Properties indexes
CREATE INDEX idx_properties_county ON properties(county_id);
CREATE INDEX idx_properties_classification ON properties(classification);
CREATE INDEX idx_properties_score ON properties(score);
CREATE INDEX idx_properties_sale_date ON properties(sale_date);
CREATE INDEX idx_properties_parcel ON properties(parcel_number);
CREATE INDEX idx_properties_latitude ON properties(latitude);
CREATE INDEX idx_properties_longitude ON properties(longitude);

-- Auctions indexes
CREATE INDEX idx_auctions_date ON auctions(auction_date);
CREATE INDEX idx_auctions_county ON auctions(county_id);
CREATE INDEX idx_auctions_status ON auctions(status);

-- Liens indexes
CREATE INDEX idx_liens_property ON property_liens(property_id);
CREATE INDEX idx_liens_type ON property_liens(lien_type);

-- Financial analyses indexes
CREATE INDEX idx_financial_property ON financial_analyses(property_id);
CREATE INDEX idx_financial_strategy ON financial_analyses(strategy);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate property score
CREATE OR REPLACE FUNCTION calculate_property_score(property_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 50; -- Base score
  prop RECORD;
  val RECORD;
  risk RECORD;
  neighborhood RECORD;
BEGIN
  -- Get property details
  SELECT * INTO prop FROM properties WHERE id = property_id;
  SELECT * INTO val FROM property_valuations WHERE property_id = property_id ORDER BY created_at DESC LIMIT 1;
  SELECT * INTO risk FROM risk_assessments WHERE property_id = property_id ORDER BY created_at DESC LIMIT 1;
  SELECT * INTO neighborhood FROM neighborhood_analysis WHERE property_id = property_id ORDER BY created_at DESC LIMIT 1;
  
  -- Adjust score based on various factors
  IF val.profit_potential > 50000 THEN score := score + 20;
  ELSIF val.profit_potential > 25000 THEN score := score + 10;
  END IF;
  
  IF risk.overall_risk_level = 'Low' THEN score := score + 15;
  ELSIF risk.overall_risk_level = 'High' THEN score := score - 15;
  END IF;
  
  IF neighborhood.school_rating > 7 THEN score := score + 10;
  END IF;
  
  IF prop.bedrooms >= 3 AND prop.bathrooms >= 2 THEN score := score + 10;
  END IF;
  
  -- Ensure score is within bounds
  IF score > 100 THEN score := 100;
  ELSIF score < 0 THEN score := 0;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total liens
CREATE OR REPLACE FUNCTION calculate_total_liens(property_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total
  FROM property_liens
  WHERE property_id = property_id AND is_satisfied = false;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update triggers for updated_at
CREATE TRIGGER update_states_updated_at BEFORE UPDATE ON states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_counties_updated_at BEFORE UPDATE ON counties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_valuations_updated_at BEFORE UPDATE ON property_valuations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON property_owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON auctions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_updated_at BEFORE UPDATE ON financial_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert states
INSERT INTO states (code, name, auction_type, is_active) VALUES
  ('FL', 'Florida', 'Tax Deed', true),
  ('TX', 'Texas', 'Tax Deed', true),
  ('GA', 'Georgia', 'Tax Deed', true),
  ('CA', 'California', 'Tax Deed', true),
  ('NY', 'New York', 'Tax Deed', true),
  ('AZ', 'Arizona', 'Tax Lien', true),
  ('CO', 'Colorado', 'Tax Lien', true),
  ('IL', 'Illinois', 'Tax Lien', true),
  ('MD', 'Maryland', 'Tax Lien', true),
  ('NJ', 'New Jersey', 'Tax Lien', true);

-- Insert sample counties for Florida
INSERT INTO counties (state_id, name, state_code) 
SELECT id, 'Miami-Dade', 'FL' FROM states WHERE code = 'FL'
UNION ALL
SELECT id, 'Broward', 'FL' FROM states WHERE code = 'FL'
UNION ALL
SELECT id, 'Palm Beach', 'FL' FROM states WHERE code = 'FL'
UNION ALL
SELECT id, 'Orange', 'FL' FROM states WHERE code = 'FL';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on sensitive tables (when auth is implemented)
-- ALTER TABLE user_saved_properties ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE enrichment_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE properties IS 'Main table storing all tax deed/lien properties';
COMMENT ON TABLE property_valuations IS 'Stores valuation and investment metrics for properties';
COMMENT ON TABLE property_liens IS 'Tracks all liens and encumbrances on properties';
COMMENT ON TABLE auctions IS 'Upcoming and past tax deed/lien auctions';
COMMENT ON TABLE inspections IS 'Property inspection reports and findings';
COMMENT ON TABLE financial_analyses IS 'Detailed financial analysis for different investment strategies';