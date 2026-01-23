-- Historical Auction Results Schema
-- Stores completed auction data for analytics, trends, and price predictions
-- This extends the tax auction database with historical sale outcomes

-- ============================================================================
-- TABLE: auction_results
-- Stores historical auction outcomes for completed sales
-- ============================================================================
CREATE TABLE IF NOT EXISTS auction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  -- Property Identification (denormalized for historical records)
  parcel_id TEXT NOT NULL,
  property_address TEXT,
  city TEXT,
  state_code TEXT,
  zip_code TEXT,

  -- Sale Information
  sale_date TIMESTAMPTZ NOT NULL,
  sale_type TEXT NOT NULL, -- upset, judicial, repository, lien, deed
  sale_status TEXT NOT NULL, -- sold, unsold, withdrawn, postponed

  -- Auction Platform
  platform TEXT, -- Bid4Assets, RealAuction, In-Person, Online, etc.
  auction_id TEXT, -- External auction/lot ID from platform

  -- Financial Details
  opening_bid NUMERIC(12,2),
  minimum_bid NUMERIC(12,2),
  final_sale_price NUMERIC(12,2),
  total_due NUMERIC(12,2), -- Original tax debt
  assessed_value NUMERIC(12,2), -- Property assessment at time of sale

  -- Bidding Analytics
  number_of_bids INTEGER,
  number_of_bidders INTEGER,
  bid_increment NUMERIC(12,2),

  -- Calculated Ratios (for analytics)
  bid_ratio NUMERIC(5,4), -- final_sale_price / opening_bid
  recovery_ratio NUMERIC(5,4), -- final_sale_price / total_due
  market_ratio NUMERIC(5,4), -- final_sale_price / assessed_value

  -- Winner Information (anonymized)
  winner_type TEXT, -- individual, investor, institution, government
  winner_location TEXT, -- city/state for local vs out-of-state analysis

  -- Property Details (snapshot at time of sale)
  property_type TEXT, -- residential, commercial, vacant_land, industrial
  land_use TEXT, -- single_family, multi_family, retail, office, agricultural
  lot_size_sqft INTEGER,
  building_sqft INTEGER,
  year_built INTEGER,

  -- Additional Context
  tax_year INTEGER, -- Year of unpaid taxes
  redemption_period_months INTEGER, -- If applicable
  liens_paid BOOLEAN DEFAULT false, -- Whether existing liens were paid
  notes TEXT, -- Additional context about the sale

  -- Data Source
  source TEXT, -- Where this data came from (scraped, manual, api, etc.)
  source_url TEXT, -- Link to original auction listing or results
  data_quality NUMERIC(3,2) DEFAULT 0.85, -- Confidence score (0.00 to 1.00)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_auction_result UNIQUE (county_id, parcel_id, sale_date)
);

-- Indexes for performance
CREATE INDEX idx_auction_results_county ON auction_results(county_id);
CREATE INDEX idx_auction_results_property ON auction_results(property_id);
CREATE INDEX idx_auction_results_parcel ON auction_results(parcel_id);
CREATE INDEX idx_auction_results_sale_date ON auction_results(sale_date);
CREATE INDEX idx_auction_results_sale_status ON auction_results(sale_status);
CREATE INDEX idx_auction_results_sale_type ON auction_results(sale_type);
CREATE INDEX idx_auction_results_city ON auction_results(city);
CREATE INDEX idx_auction_results_state ON auction_results(state_code);
CREATE INDEX idx_auction_results_property_type ON auction_results(property_type);

-- Composite indexes for common queries
CREATE INDEX idx_auction_results_county_date ON auction_results(county_id, sale_date DESC);
CREATE INDEX idx_auction_results_county_status ON auction_results(county_id, sale_status);
CREATE INDEX idx_auction_results_date_status ON auction_results(sale_date DESC, sale_status);

-- ============================================================================
-- HELPER FUNCTION: Upsert Auction Result
-- Prevents duplicates and updates existing records
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_auction_result(
  p_county_id UUID,
  p_property_id UUID,
  p_parcel_id TEXT,
  p_property_address TEXT,
  p_city TEXT,
  p_state_code TEXT,
  p_zip_code TEXT,
  p_sale_date TIMESTAMPTZ,
  p_sale_type TEXT,
  p_sale_status TEXT,
  p_platform TEXT DEFAULT NULL,
  p_auction_id TEXT DEFAULT NULL,
  p_opening_bid NUMERIC DEFAULT NULL,
  p_minimum_bid NUMERIC DEFAULT NULL,
  p_final_sale_price NUMERIC DEFAULT NULL,
  p_total_due NUMERIC DEFAULT NULL,
  p_assessed_value NUMERIC DEFAULT NULL,
  p_number_of_bids INTEGER DEFAULT NULL,
  p_number_of_bidders INTEGER DEFAULT NULL,
  p_bid_increment NUMERIC DEFAULT NULL,
  p_winner_type TEXT DEFAULT NULL,
  p_winner_location TEXT DEFAULT NULL,
  p_property_type TEXT DEFAULT NULL,
  p_land_use TEXT DEFAULT NULL,
  p_lot_size_sqft INTEGER DEFAULT NULL,
  p_building_sqft INTEGER DEFAULT NULL,
  p_year_built INTEGER DEFAULT NULL,
  p_tax_year INTEGER DEFAULT NULL,
  p_redemption_period_months INTEGER DEFAULT NULL,
  p_liens_paid BOOLEAN DEFAULT false,
  p_notes TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'manual',
  p_source_url TEXT DEFAULT NULL,
  p_data_quality NUMERIC DEFAULT 0.85
) RETURNS UUID AS $$
DECLARE
  v_result_id UUID;
  v_bid_ratio NUMERIC;
  v_recovery_ratio NUMERIC;
  v_market_ratio NUMERIC;
BEGIN
  -- Calculate ratios
  IF p_final_sale_price IS NOT NULL THEN
    IF p_opening_bid IS NOT NULL AND p_opening_bid > 0 THEN
      v_bid_ratio := p_final_sale_price / p_opening_bid;
    END IF;

    IF p_total_due IS NOT NULL AND p_total_due > 0 THEN
      v_recovery_ratio := p_final_sale_price / p_total_due;
    END IF;

    IF p_assessed_value IS NOT NULL AND p_assessed_value > 0 THEN
      v_market_ratio := p_final_sale_price / p_assessed_value;
    END IF;
  END IF;

  -- Upsert the record
  INSERT INTO auction_results (
    county_id, property_id, parcel_id, property_address, city, state_code, zip_code,
    sale_date, sale_type, sale_status, platform, auction_id,
    opening_bid, minimum_bid, final_sale_price, total_due, assessed_value,
    number_of_bids, number_of_bidders, bid_increment,
    bid_ratio, recovery_ratio, market_ratio,
    winner_type, winner_location,
    property_type, land_use, lot_size_sqft, building_sqft, year_built,
    tax_year, redemption_period_months, liens_paid, notes,
    source, source_url, data_quality,
    created_at, updated_at
  ) VALUES (
    p_county_id, p_property_id, p_parcel_id, p_property_address, p_city, p_state_code, p_zip_code,
    p_sale_date, p_sale_type, p_sale_status, p_platform, p_auction_id,
    p_opening_bid, p_minimum_bid, p_final_sale_price, p_total_due, p_assessed_value,
    p_number_of_bids, p_number_of_bidders, p_bid_increment,
    v_bid_ratio, v_recovery_ratio, v_market_ratio,
    p_winner_type, p_winner_location,
    p_property_type, p_land_use, p_lot_size_sqft, p_building_sqft, p_year_built,
    p_tax_year, p_redemption_period_months, p_liens_paid, p_notes,
    p_source, p_source_url, p_data_quality,
    NOW(), NOW()
  )
  ON CONFLICT (county_id, parcel_id, sale_date)
  DO UPDATE SET
    property_id = COALESCE(EXCLUDED.property_id, auction_results.property_id),
    property_address = COALESCE(EXCLUDED.property_address, auction_results.property_address),
    city = COALESCE(EXCLUDED.city, auction_results.city),
    state_code = COALESCE(EXCLUDED.state_code, auction_results.state_code),
    zip_code = COALESCE(EXCLUDED.zip_code, auction_results.zip_code),
    sale_type = EXCLUDED.sale_type,
    sale_status = EXCLUDED.sale_status,
    platform = COALESCE(EXCLUDED.platform, auction_results.platform),
    auction_id = COALESCE(EXCLUDED.auction_id, auction_results.auction_id),
    opening_bid = COALESCE(EXCLUDED.opening_bid, auction_results.opening_bid),
    minimum_bid = COALESCE(EXCLUDED.minimum_bid, auction_results.minimum_bid),
    final_sale_price = COALESCE(EXCLUDED.final_sale_price, auction_results.final_sale_price),
    total_due = COALESCE(EXCLUDED.total_due, auction_results.total_due),
    assessed_value = COALESCE(EXCLUDED.assessed_value, auction_results.assessed_value),
    number_of_bids = COALESCE(EXCLUDED.number_of_bids, auction_results.number_of_bids),
    number_of_bidders = COALESCE(EXCLUDED.number_of_bidders, auction_results.number_of_bidders),
    bid_increment = COALESCE(EXCLUDED.bid_increment, auction_results.bid_increment),
    bid_ratio = COALESCE(EXCLUDED.bid_ratio, auction_results.bid_ratio),
    recovery_ratio = COALESCE(EXCLUDED.recovery_ratio, auction_results.recovery_ratio),
    market_ratio = COALESCE(EXCLUDED.market_ratio, auction_results.market_ratio),
    winner_type = COALESCE(EXCLUDED.winner_type, auction_results.winner_type),
    winner_location = COALESCE(EXCLUDED.winner_location, auction_results.winner_location),
    property_type = COALESCE(EXCLUDED.property_type, auction_results.property_type),
    land_use = COALESCE(EXCLUDED.land_use, auction_results.land_use),
    lot_size_sqft = COALESCE(EXCLUDED.lot_size_sqft, auction_results.lot_size_sqft),
    building_sqft = COALESCE(EXCLUDED.building_sqft, auction_results.building_sqft),
    year_built = COALESCE(EXCLUDED.year_built, auction_results.year_built),
    tax_year = COALESCE(EXCLUDED.tax_year, auction_results.tax_year),
    redemption_period_months = COALESCE(EXCLUDED.redemption_period_months, auction_results.redemption_period_months),
    liens_paid = COALESCE(EXCLUDED.liens_paid, auction_results.liens_paid),
    notes = COALESCE(EXCLUDED.notes, auction_results.notes),
    source = COALESCE(EXCLUDED.source, auction_results.source),
    source_url = COALESCE(EXCLUDED.source_url, auction_results.source_url),
    data_quality = COALESCE(EXCLUDED.data_quality, auction_results.data_quality),
    updated_at = NOW()
  RETURNING id INTO v_result_id;

  RETURN v_result_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get Historical Results by County
-- ============================================================================
CREATE OR REPLACE FUNCTION get_auction_history_by_county(
  p_county_id UUID,
  p_sale_status TEXT DEFAULT 'sold',
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  result_id UUID,
  parcel_id TEXT,
  property_address TEXT,
  sale_date TIMESTAMPTZ,
  sale_type TEXT,
  opening_bid NUMERIC,
  final_sale_price NUMERIC,
  bid_ratio NUMERIC,
  property_type TEXT,
  number_of_bids INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id,
    ar.parcel_id,
    ar.property_address,
    ar.sale_date,
    ar.sale_type,
    ar.opening_bid,
    ar.final_sale_price,
    ar.bid_ratio,
    ar.property_type,
    ar.number_of_bids
  FROM auction_results ar
  WHERE
    ar.county_id = p_county_id
    AND ar.sale_status = p_sale_status
    AND (p_start_date IS NULL OR ar.sale_date >= p_start_date)
    AND (p_end_date IS NULL OR ar.sale_date <= p_end_date)
  ORDER BY ar.sale_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get Comparable Sales
-- Find similar properties that sold recently
-- ============================================================================
CREATE OR REPLACE FUNCTION get_comparable_sales(
  p_county_id UUID,
  p_property_type TEXT,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_months_back INTEGER DEFAULT 12,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  result_id UUID,
  parcel_id TEXT,
  property_address TEXT,
  sale_date TIMESTAMPTZ,
  final_sale_price NUMERIC,
  opening_bid NUMERIC,
  bid_ratio NUMERIC,
  assessed_value NUMERIC,
  market_ratio NUMERIC,
  lot_size_sqft INTEGER,
  building_sqft INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id,
    ar.parcel_id,
    ar.property_address,
    ar.sale_date,
    ar.final_sale_price,
    ar.opening_bid,
    ar.bid_ratio,
    ar.assessed_value,
    ar.market_ratio,
    ar.lot_size_sqft,
    ar.building_sqft
  FROM auction_results ar
  WHERE
    ar.county_id = p_county_id
    AND ar.sale_status = 'sold'
    AND ar.property_type = p_property_type
    AND ar.sale_date >= NOW() - (p_months_back || ' months')::INTERVAL
    AND (p_min_price IS NULL OR ar.final_sale_price >= p_min_price)
    AND (p_max_price IS NULL OR ar.final_sale_price <= p_max_price)
    AND ar.final_sale_price IS NOT NULL
  ORDER BY ar.sale_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Calculate Average Bid Ratio
-- Get average bid ratio for a county/property type
-- ============================================================================
CREATE OR REPLACE FUNCTION get_avg_bid_ratio(
  p_county_id UUID,
  p_property_type TEXT DEFAULT NULL,
  p_sale_type TEXT DEFAULT NULL,
  p_months_back INTEGER DEFAULT 12
) RETURNS NUMERIC AS $$
DECLARE
  v_avg_ratio NUMERIC;
BEGIN
  SELECT AVG(bid_ratio)
  INTO v_avg_ratio
  FROM auction_results
  WHERE
    county_id = p_county_id
    AND sale_status = 'sold'
    AND bid_ratio IS NOT NULL
    AND sale_date >= NOW() - (p_months_back || ' months')::INTERVAL
    AND (p_property_type IS NULL OR property_type = p_property_type)
    AND (p_sale_type IS NULL OR sale_type = p_sale_type);

  RETURN COALESCE(v_avg_ratio, 1.0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get County Statistics
-- Summary statistics for a county's auction history
-- ============================================================================
CREATE OR REPLACE FUNCTION get_county_auction_stats(
  p_county_id UUID,
  p_months_back INTEGER DEFAULT 12
) RETURNS TABLE (
  total_auctions BIGINT,
  total_sold BIGINT,
  total_unsold BIGINT,
  avg_final_price NUMERIC,
  median_final_price NUMERIC,
  avg_bid_ratio NUMERIC,
  avg_recovery_ratio NUMERIC,
  avg_market_ratio NUMERIC,
  total_volume NUMERIC,
  most_common_property_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE sale_status = 'sold') as sold_count,
      COUNT(*) FILTER (WHERE sale_status = 'unsold') as unsold_count,
      AVG(final_sale_price) FILTER (WHERE sale_status = 'sold') as avg_price,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_sale_price) FILTER (WHERE sale_status = 'sold') as med_price,
      AVG(bid_ratio) FILTER (WHERE sale_status = 'sold') as avg_bid,
      AVG(recovery_ratio) FILTER (WHERE sale_status = 'sold') as avg_recovery,
      AVG(market_ratio) FILTER (WHERE sale_status = 'sold') as avg_market,
      SUM(final_sale_price) FILTER (WHERE sale_status = 'sold') as total_vol
    FROM auction_results
    WHERE
      county_id = p_county_id
      AND sale_date >= NOW() - (p_months_back || ' months')::INTERVAL
  ),
  prop_type AS (
    SELECT property_type
    FROM auction_results
    WHERE
      county_id = p_county_id
      AND sale_date >= NOW() - (p_months_back || ' months')::INTERVAL
      AND property_type IS NOT NULL
    GROUP BY property_type
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT
    stats.total_count,
    stats.sold_count,
    stats.unsold_count,
    stats.avg_price,
    stats.med_price,
    stats.avg_bid,
    stats.avg_recovery,
    stats.avg_market,
    stats.total_vol,
    prop_type.property_type
  FROM stats, prop_type;
END;
$$ LANGUAGE plpgsql;
