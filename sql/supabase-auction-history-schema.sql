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

-- ============================================================================
-- VIEWS FOR ANALYTICS AND REPORTING
-- ============================================================================

-- View: County Auction Analytics
-- Comprehensive analytics per county with key metrics
CREATE OR REPLACE VIEW vw_auction_analytics AS
SELECT
    c.id as county_id,
    c.county_name,
    c.state_code,
    c.state_name,

    -- Count metrics
    COUNT(ar.id) as total_auctions,
    COUNT(*) FILTER (WHERE ar.sale_status = 'sold') as total_sold,
    COUNT(*) FILTER (WHERE ar.sale_status = 'unsold') as total_unsold,

    -- Sale rate
    ROUND(
        (COUNT(*) FILTER (WHERE ar.sale_status = 'sold')::NUMERIC /
         NULLIF(COUNT(ar.id), 0) * 100), 2
    ) as sale_rate_pct,

    -- Price metrics (sold properties only)
    ROUND(AVG(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_sale_price,
    ROUND(MIN(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as min_sale_price,
    ROUND(MAX(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as max_sale_price,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ar.final_sale_price)
          FILTER (WHERE ar.sale_status = 'sold'), 2) as median_sale_price,

    -- Bid ratio metrics
    ROUND(AVG(ar.bid_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_bid_ratio,
    ROUND(MIN(ar.bid_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as min_bid_ratio,
    ROUND(MAX(ar.bid_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as max_bid_ratio,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ar.bid_ratio)
          FILTER (WHERE ar.sale_status = 'sold'), 4) as median_bid_ratio,

    -- Recovery ratio (vs tax debt)
    ROUND(AVG(ar.recovery_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_recovery_ratio,

    -- Market ratio (vs assessed value)
    ROUND(AVG(ar.market_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_market_ratio,

    -- Total volume
    ROUND(SUM(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as total_sales_volume,

    -- Competition metrics
    ROUND(AVG(ar.number_of_bids) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_bids_per_property,
    ROUND(AVG(ar.number_of_bidders) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_bidders_per_property,

    -- Date range
    MIN(ar.sale_date) as earliest_sale,
    MAX(ar.sale_date) as latest_sale,

    -- Most common property type
    (
        SELECT ar2.property_type
        FROM auction_results ar2
        WHERE ar2.county_id = c.id AND ar2.property_type IS NOT NULL
        GROUP BY ar2.property_type
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ) as most_common_property_type,

    -- Most common platform
    (
        SELECT ar2.platform
        FROM auction_results ar2
        WHERE ar2.county_id = c.id AND ar2.platform IS NOT NULL
        GROUP BY ar2.platform
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ) as most_common_platform

FROM counties c
LEFT JOIN auction_results ar ON c.id = ar.county_id
GROUP BY c.id, c.county_name, c.state_code, c.state_name
HAVING COUNT(ar.id) > 0;

-- View: County Auction Trends (Monthly)
-- Track auction performance trends over time
CREATE OR REPLACE VIEW vw_county_auction_trends AS
SELECT
    c.county_name,
    c.state_code,
    DATE_TRUNC('month', ar.sale_date) as sale_month,

    -- Count metrics
    COUNT(*) as auctions_count,
    COUNT(*) FILTER (WHERE ar.sale_status = 'sold') as sold_count,
    COUNT(*) FILTER (WHERE ar.sale_status = 'unsold') as unsold_count,

    -- Sale rate
    ROUND(
        (COUNT(*) FILTER (WHERE ar.sale_status = 'sold')::NUMERIC /
         NULLIF(COUNT(*), 0) * 100), 2
    ) as sale_rate_pct,

    -- Price metrics
    ROUND(AVG(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_sale_price,
    ROUND(SUM(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as total_volume,

    -- Bid metrics
    ROUND(AVG(ar.bid_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_bid_ratio,
    ROUND(AVG(ar.recovery_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_recovery_ratio,
    ROUND(AVG(ar.market_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_market_ratio,

    -- Competition
    ROUND(AVG(ar.number_of_bids) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_bids,
    ROUND(AVG(ar.number_of_bidders) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_bidders

FROM counties c
JOIN auction_results ar ON c.id = ar.county_id
GROUP BY c.county_name, c.state_code, DATE_TRUNC('month', ar.sale_date)
ORDER BY c.county_name, sale_month DESC;

-- View: Bid Ratio Analysis
-- Detailed bid ratio analysis by various dimensions
CREATE OR REPLACE VIEW vw_bid_ratio_analysis AS
SELECT
    c.county_name,
    c.state_code,
    ar.sale_type,
    ar.property_type,
    ar.platform,

    -- Count
    COUNT(*) as sales_count,

    -- Bid ratio statistics
    ROUND(AVG(ar.bid_ratio), 4) as avg_bid_ratio,
    ROUND(MIN(ar.bid_ratio), 4) as min_bid_ratio,
    ROUND(MAX(ar.bid_ratio), 4) as max_bid_ratio,
    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ar.bid_ratio), 4) as p25_bid_ratio,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ar.bid_ratio), 4) as median_bid_ratio,
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ar.bid_ratio), 4) as p75_bid_ratio,
    ROUND(STDDEV(ar.bid_ratio), 4) as stddev_bid_ratio,

    -- Price context
    ROUND(AVG(ar.opening_bid), 2) as avg_opening_bid,
    ROUND(AVG(ar.final_sale_price), 2) as avg_final_price,

    -- Competition
    ROUND(AVG(ar.number_of_bids), 2) as avg_bids,
    ROUND(AVG(ar.number_of_bidders), 2) as avg_bidders,

    -- Date range
    MIN(ar.sale_date) as earliest_sale,
    MAX(ar.sale_date) as latest_sale

FROM counties c
JOIN auction_results ar ON c.id = ar.county_id
WHERE ar.sale_status = 'sold'
  AND ar.bid_ratio IS NOT NULL
GROUP BY c.county_name, c.state_code, ar.sale_type, ar.property_type, ar.platform
HAVING COUNT(*) >= 3  -- Only include groups with at least 3 sales
ORDER BY c.county_name, sales_count DESC;

-- View: Property Type Performance
-- Analytics by property type across all counties
CREATE OR REPLACE VIEW vw_property_type_performance AS
SELECT
    ar.property_type,
    ar.land_use,

    -- Geographic coverage
    COUNT(DISTINCT ar.county_id) as counties_count,
    COUNT(DISTINCT c.state_code) as states_count,

    -- Sales metrics
    COUNT(*) as total_sales,
    COUNT(*) FILTER (WHERE ar.sale_status = 'sold') as sold_count,
    ROUND(
        (COUNT(*) FILTER (WHERE ar.sale_status = 'sold')::NUMERIC /
         NULLIF(COUNT(*), 0) * 100), 2
    ) as sale_rate_pct,

    -- Price metrics
    ROUND(AVG(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_sale_price,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ar.final_sale_price)
          FILTER (WHERE ar.sale_status = 'sold'), 2) as median_sale_price,
    ROUND(SUM(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as total_volume,

    -- Ratio metrics
    ROUND(AVG(ar.bid_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_bid_ratio,
    ROUND(AVG(ar.recovery_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_recovery_ratio,
    ROUND(AVG(ar.market_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_market_ratio,

    -- Competition
    ROUND(AVG(ar.number_of_bids) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_bids,
    ROUND(AVG(ar.number_of_bidders) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_bidders,

    -- Property characteristics
    ROUND(AVG(ar.lot_size_sqft), 0) as avg_lot_size_sqft,
    ROUND(AVG(ar.building_sqft), 0) as avg_building_sqft,
    ROUND(AVG(ar.year_built), 0) as avg_year_built

FROM auction_results ar
JOIN counties c ON ar.county_id = c.id
WHERE ar.property_type IS NOT NULL
GROUP BY ar.property_type, ar.land_use
HAVING COUNT(*) >= 5  -- At least 5 properties
ORDER BY total_sales DESC;

-- View: Platform Performance Analysis
-- Compare auction platforms across counties
CREATE OR REPLACE VIEW vw_platform_performance AS
SELECT
    ar.platform,

    -- Geographic coverage
    COUNT(DISTINCT ar.county_id) as counties_served,
    COUNT(DISTINCT c.state_code) as states_served,

    -- Sales metrics
    COUNT(*) as total_auctions,
    COUNT(*) FILTER (WHERE ar.sale_status = 'sold') as sold_count,
    COUNT(*) FILTER (WHERE ar.sale_status = 'unsold') as unsold_count,
    ROUND(
        (COUNT(*) FILTER (WHERE ar.sale_status = 'sold')::NUMERIC /
         NULLIF(COUNT(*), 0) * 100), 2
    ) as sale_rate_pct,

    -- Price metrics
    ROUND(AVG(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_sale_price,
    ROUND(SUM(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as total_volume,

    -- Ratio metrics
    ROUND(AVG(ar.bid_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_bid_ratio,
    ROUND(AVG(ar.recovery_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_recovery_ratio,
    ROUND(AVG(ar.market_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_market_ratio,

    -- Competition metrics
    ROUND(AVG(ar.number_of_bids) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_bids,
    ROUND(AVG(ar.number_of_bidders) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_bidders,

    -- Date range
    MIN(ar.sale_date) as earliest_sale,
    MAX(ar.sale_date) as latest_sale,

    -- Top performing county
    (
        SELECT c2.county_name || ', ' || c2.state_code
        FROM auction_results ar2
        JOIN counties c2 ON ar2.county_id = c2.id
        WHERE ar2.platform = ar.platform AND ar2.sale_status = 'sold'
        GROUP BY c2.county_name, c2.state_code
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ) as top_county

FROM auction_results ar
JOIN counties c ON ar.county_id = c.id
WHERE ar.platform IS NOT NULL
GROUP BY ar.platform
HAVING COUNT(*) >= 5  -- At least 5 auctions
ORDER BY total_auctions DESC;

-- View: Sale Type Comparison
-- Compare different sale types (upset, judicial, repository, etc.)
CREATE OR REPLACE VIEW vw_sale_type_comparison AS
SELECT
    c.state_code,
    ar.sale_type,

    -- Count metrics
    COUNT(DISTINCT ar.county_id) as counties_count,
    COUNT(*) as total_auctions,
    COUNT(*) FILTER (WHERE ar.sale_status = 'sold') as sold_count,
    ROUND(
        (COUNT(*) FILTER (WHERE ar.sale_status = 'sold')::NUMERIC /
         NULLIF(COUNT(*), 0) * 100), 2
    ) as sale_rate_pct,

    -- Price metrics
    ROUND(AVG(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_sale_price,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ar.final_sale_price)
          FILTER (WHERE ar.sale_status = 'sold'), 2) as median_sale_price,

    -- Ratio metrics
    ROUND(AVG(ar.bid_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_bid_ratio,
    ROUND(AVG(ar.recovery_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_recovery_ratio,

    -- Competition
    ROUND(AVG(ar.number_of_bids) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_bids,
    ROUND(AVG(ar.number_of_bidders) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_bidders,

    -- Volume
    ROUND(SUM(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as total_volume

FROM auction_results ar
JOIN counties c ON ar.county_id = c.id
GROUP BY c.state_code, ar.sale_type
HAVING COUNT(*) >= 3
ORDER BY c.state_code, total_auctions DESC;

-- View: Recent Auction Activity (Last 90 Days)
-- Quick view of recent auction results
CREATE OR REPLACE VIEW vw_recent_auction_activity AS
SELECT
    c.county_name,
    c.state_code,
    ar.sale_date,
    ar.sale_type,
    ar.sale_status,
    ar.platform,
    ar.parcel_id,
    ar.property_address,
    ar.property_type,
    ar.opening_bid,
    ar.final_sale_price,
    ar.bid_ratio,
    ar.number_of_bids,
    ar.number_of_bidders,
    ar.source
FROM auction_results ar
JOIN counties c ON ar.county_id = c.id
WHERE ar.sale_date >= NOW() - INTERVAL '90 days'
ORDER BY ar.sale_date DESC, c.county_name;

-- ============================================================================
-- ADVANCED ANALYTICS: PRICE PREDICTIONS
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Get Price Prediction
-- Predicts likely sale price for a property based on historical data
-- ============================================================================
CREATE OR REPLACE FUNCTION get_price_prediction(
  p_county_id UUID,
  p_property_type TEXT,
  p_opening_bid NUMERIC,
  p_assessed_value NUMERIC DEFAULT NULL,
  p_lot_size_sqft INTEGER DEFAULT NULL,
  p_building_sqft INTEGER DEFAULT NULL,
  p_months_back INTEGER DEFAULT 12
) RETURNS TABLE (
  predicted_price NUMERIC,
  prediction_low NUMERIC,
  prediction_high NUMERIC,
  confidence_score NUMERIC,
  comparable_sales_count INTEGER,
  avg_bid_ratio NUMERIC,
  median_bid_ratio NUMERIC,
  stddev_bid_ratio NUMERIC
) AS $$
DECLARE
  v_avg_ratio NUMERIC;
  v_median_ratio NUMERIC;
  v_stddev_ratio NUMERIC;
  v_count INTEGER;
  v_predicted NUMERIC;
  v_confidence NUMERIC;
BEGIN
  -- Get bid ratio statistics from comparable sales
  SELECT
    AVG(ar.bid_ratio),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ar.bid_ratio),
    STDDEV(ar.bid_ratio),
    COUNT(*)
  INTO v_avg_ratio, v_median_ratio, v_stddev_ratio, v_count
  FROM auction_results ar
  WHERE
    ar.county_id = p_county_id
    AND ar.sale_status = 'sold'
    AND ar.property_type = p_property_type
    AND ar.sale_date >= NOW() - (p_months_back || ' months')::INTERVAL
    AND ar.bid_ratio IS NOT NULL
    AND ar.final_sale_price IS NOT NULL;

  -- Default to 1.0 if no data
  v_avg_ratio := COALESCE(v_avg_ratio, 1.0);
  v_median_ratio := COALESCE(v_median_ratio, 1.0);
  v_stddev_ratio := COALESCE(v_stddev_ratio, 0.2);
  v_count := COALESCE(v_count, 0);

  -- Calculate predicted price (use median for robustness)
  v_predicted := p_opening_bid * v_median_ratio;

  -- Calculate confidence score (0.0 to 1.0)
  -- Based on: sample size, data consistency (low stddev = high confidence)
  v_confidence := CASE
    WHEN v_count >= 20 AND v_stddev_ratio < 0.3 THEN 0.95
    WHEN v_count >= 15 AND v_stddev_ratio < 0.4 THEN 0.85
    WHEN v_count >= 10 AND v_stddev_ratio < 0.5 THEN 0.75
    WHEN v_count >= 5 AND v_stddev_ratio < 0.6 THEN 0.65
    WHEN v_count >= 3 THEN 0.50
    ELSE 0.30
  END;

  -- Return prediction range (using 1 standard deviation)
  RETURN QUERY
  SELECT
    ROUND(v_predicted, 2) as pred_price,
    ROUND(p_opening_bid * GREATEST(v_median_ratio - v_stddev_ratio, 0.5), 2) as pred_low,
    ROUND(p_opening_bid * (v_median_ratio + v_stddev_ratio), 2) as pred_high,
    ROUND(v_confidence, 2) as conf_score,
    v_count as comp_count,
    ROUND(v_avg_ratio, 4) as avg_ratio,
    ROUND(v_median_ratio, 4) as med_ratio,
    ROUND(v_stddev_ratio, 4) as std_ratio;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Calculate Prediction Confidence
-- Determines confidence level for price predictions
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_prediction_confidence(
  p_county_id UUID,
  p_property_type TEXT,
  p_months_back INTEGER DEFAULT 12
) RETURNS TABLE (
  comparable_count INTEGER,
  data_quality_avg NUMERIC,
  bid_ratio_stddev NUMERIC,
  confidence_score NUMERIC,
  confidence_level TEXT
) AS $$
DECLARE
  v_count INTEGER;
  v_quality NUMERIC;
  v_stddev NUMERIC;
  v_confidence NUMERIC;
  v_level TEXT;
BEGIN
  -- Gather statistics
  SELECT
    COUNT(*),
    AVG(ar.data_quality),
    STDDEV(ar.bid_ratio)
  INTO v_count, v_quality, v_stddev
  FROM auction_results ar
  WHERE
    ar.county_id = p_county_id
    AND ar.sale_status = 'sold'
    AND ar.property_type = p_property_type
    AND ar.sale_date >= NOW() - (p_months_back || ' months')::INTERVAL
    AND ar.bid_ratio IS NOT NULL;

  v_count := COALESCE(v_count, 0);
  v_quality := COALESCE(v_quality, 0.5);
  v_stddev := COALESCE(v_stddev, 0.5);

  -- Calculate confidence score
  -- Factors: sample size (40%), data quality (30%), consistency (30%)
  v_confidence := (
    (LEAST(v_count::NUMERIC / 20.0, 1.0) * 0.4) +  -- Sample size factor
    (v_quality * 0.3) +                             -- Data quality factor
    ((1.0 - LEAST(v_stddev / 1.0, 1.0)) * 0.3)     -- Consistency factor
  );

  -- Determine confidence level
  v_level := CASE
    WHEN v_confidence >= 0.85 THEN 'very_high'
    WHEN v_confidence >= 0.70 THEN 'high'
    WHEN v_confidence >= 0.55 THEN 'medium'
    WHEN v_confidence >= 0.40 THEN 'low'
    ELSE 'very_low'
  END;

  RETURN QUERY
  SELECT
    v_count,
    ROUND(v_quality, 2),
    ROUND(v_stddev, 4),
    ROUND(v_confidence, 2),
    v_level;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ADVANCED ANALYTICS: TREND ANALYSIS
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Get County Trends
-- Calculates month-over-month trends and growth rates
-- ============================================================================
CREATE OR REPLACE FUNCTION get_county_trends(
  p_county_id UUID,
  p_months_back INTEGER DEFAULT 12
) RETURNS TABLE (
  month_date DATE,
  auctions_count INTEGER,
  sold_count INTEGER,
  sale_rate_pct NUMERIC,
  avg_sale_price NUMERIC,
  total_volume NUMERIC,
  avg_bid_ratio NUMERIC,
  month_over_month_price_change_pct NUMERIC,
  month_over_month_volume_change_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT
      DATE_TRUNC('month', ar.sale_date)::DATE as month,
      COUNT(*) as auction_count,
      COUNT(*) FILTER (WHERE ar.sale_status = 'sold') as sold,
      ROUND(
        (COUNT(*) FILTER (WHERE ar.sale_status = 'sold')::NUMERIC /
         NULLIF(COUNT(*), 0) * 100), 2
      ) as sale_rate,
      ROUND(AVG(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_price,
      ROUND(SUM(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as volume,
      ROUND(AVG(ar.bid_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as bid_ratio
    FROM auction_results ar
    WHERE
      ar.county_id = p_county_id
      AND ar.sale_date >= NOW() - (p_months_back || ' months')::INTERVAL
    GROUP BY DATE_TRUNC('month', ar.sale_date)
  ),
  trends AS (
    SELECT
      month,
      auction_count::INTEGER,
      sold::INTEGER,
      sale_rate,
      avg_price,
      volume,
      bid_ratio,
      LAG(avg_price) OVER (ORDER BY month) as prev_avg_price,
      LAG(volume) OVER (ORDER BY month) as prev_volume
    FROM monthly_data
  )
  SELECT
    trends.month,
    trends.auction_count,
    trends.sold,
    trends.sale_rate,
    trends.avg_price,
    trends.volume,
    trends.bid_ratio,
    CASE
      WHEN trends.prev_avg_price IS NOT NULL AND trends.prev_avg_price > 0
      THEN ROUND(((trends.avg_price - trends.prev_avg_price) / trends.prev_avg_price * 100), 2)
      ELSE NULL
    END as price_change,
    CASE
      WHEN trends.prev_volume IS NOT NULL AND trends.prev_volume > 0
      THEN ROUND(((trends.volume - trends.prev_volume) / trends.prev_volume * 100), 2)
      ELSE NULL
    END as volume_change
  FROM trends
  ORDER BY trends.month DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get Seasonal Patterns
-- Identifies seasonal trends in auction performance
-- ============================================================================
CREATE OR REPLACE FUNCTION get_seasonal_patterns(
  p_county_id UUID DEFAULT NULL,
  p_state_code TEXT DEFAULT NULL,
  p_years_back INTEGER DEFAULT 3
) RETURNS TABLE (
  month_number INTEGER,
  month_name TEXT,
  avg_auctions_count NUMERIC,
  avg_sold_count NUMERIC,
  avg_sale_rate_pct NUMERIC,
  avg_sale_price NUMERIC,
  avg_bid_ratio NUMERIC,
  total_data_points INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(MONTH FROM ar.sale_date)::INTEGER as month_num,
    TO_CHAR(ar.sale_date, 'Month') as month,
    ROUND(AVG(auction_count), 1) as avg_auctions,
    ROUND(AVG(sold_count), 1) as avg_sold,
    ROUND(AVG(sale_rate), 2) as avg_rate,
    ROUND(AVG(avg_price), 2) as avg_price_seasonal,
    ROUND(AVG(bid_ratio), 4) as avg_ratio_seasonal,
    SUM(auction_count)::INTEGER as data_points
  FROM (
    SELECT
      DATE_TRUNC('month', ar2.sale_date) as sale_date,
      COUNT(*) as auction_count,
      COUNT(*) FILTER (WHERE ar2.sale_status = 'sold') as sold_count,
      (COUNT(*) FILTER (WHERE ar2.sale_status = 'sold')::NUMERIC /
       NULLIF(COUNT(*), 0) * 100) as sale_rate,
      AVG(ar2.final_sale_price) FILTER (WHERE ar2.sale_status = 'sold') as avg_price,
      AVG(ar2.bid_ratio) FILTER (WHERE ar2.sale_status = 'sold') as bid_ratio
    FROM auction_results ar2
    JOIN counties c ON ar2.county_id = c.id
    WHERE
      ar2.sale_date >= NOW() - (p_years_back || ' years')::INTERVAL
      AND (p_county_id IS NULL OR ar2.county_id = p_county_id)
      AND (p_state_code IS NULL OR c.state_code = p_state_code)
    GROUP BY DATE_TRUNC('month', ar2.sale_date)
  ) ar
  GROUP BY EXTRACT(MONTH FROM ar.sale_date), TO_CHAR(ar.sale_date, 'Month')
  ORDER BY month_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get Market Velocity
-- Calculates how quickly properties sell (time on market proxy)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_market_velocity(
  p_county_id UUID,
  p_property_type TEXT DEFAULT NULL,
  p_months_back INTEGER DEFAULT 6
) RETURNS TABLE (
  avg_days_to_sell NUMERIC,
  sale_through_rate NUMERIC,
  avg_bidders_per_property NUMERIC,
  competition_level TEXT,
  market_heat_score NUMERIC
) AS $$
DECLARE
  v_sale_rate NUMERIC;
  v_avg_bidders NUMERIC;
  v_comp_level TEXT;
  v_heat_score NUMERIC;
BEGIN
  -- Calculate sale metrics
  SELECT
    (COUNT(*) FILTER (WHERE ar.sale_status = 'sold')::NUMERIC /
     NULLIF(COUNT(*), 0)),
    AVG(ar.number_of_bidders) FILTER (WHERE ar.sale_status = 'sold')
  INTO v_sale_rate, v_avg_bidders
  FROM auction_results ar
  WHERE
    ar.county_id = p_county_id
    AND ar.sale_date >= NOW() - (p_months_back || ' months')::INTERVAL
    AND (p_property_type IS NULL OR ar.property_type = p_property_type);

  v_sale_rate := COALESCE(v_sale_rate, 0);
  v_avg_bidders := COALESCE(v_avg_bidders, 0);

  -- Determine competition level
  v_comp_level := CASE
    WHEN v_avg_bidders >= 10 THEN 'very_high'
    WHEN v_avg_bidders >= 7 THEN 'high'
    WHEN v_avg_bidders >= 4 THEN 'medium'
    WHEN v_avg_bidders >= 2 THEN 'low'
    ELSE 'very_low'
  END;

  -- Calculate market heat score (0-100)
  -- Based on: sale rate (50%), avg bidders (30%), bid ratio trend (20%)
  v_heat_score := (
    (v_sale_rate * 50) +
    (LEAST(v_avg_bidders / 15.0, 1.0) * 30) +
    20  -- Base score
  );

  RETURN QUERY
  SELECT
    NULL::NUMERIC as days_to_sell,  -- Not tracked in current schema
    ROUND(v_sale_rate * 100, 2) as sale_through,
    ROUND(v_avg_bidders, 1) as avg_bidders,
    v_comp_level as comp_level,
    ROUND(v_heat_score, 0) as heat_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get ROI Potential
-- Estimates return on investment potential for a property type/area
-- ============================================================================
CREATE OR REPLACE FUNCTION get_roi_potential(
  p_county_id UUID,
  p_property_type TEXT,
  p_months_back INTEGER DEFAULT 12
) RETURNS TABLE (
  avg_acquisition_cost NUMERIC,
  avg_market_value NUMERIC,
  avg_immediate_equity_pct NUMERIC,
  avg_roi_vs_assessment NUMERIC,
  risk_level TEXT,
  investment_score NUMERIC
) AS $$
DECLARE
  v_avg_cost NUMERIC;
  v_avg_value NUMERIC;
  v_equity_pct NUMERIC;
  v_roi NUMERIC;
  v_risk TEXT;
  v_score NUMERIC;
  v_stddev_ratio NUMERIC;
BEGIN
  -- Calculate averages
  SELECT
    AVG(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'),
    AVG(ar.assessed_value) FILTER (WHERE ar.sale_status = 'sold'),
    AVG(ar.market_ratio) FILTER (WHERE ar.sale_status = 'sold'),
    STDDEV(ar.market_ratio) FILTER (WHERE ar.sale_status = 'sold')
  INTO v_avg_cost, v_avg_value, v_equity_pct, v_stddev_ratio
  FROM auction_results ar
  WHERE
    ar.county_id = p_county_id
    AND ar.property_type = p_property_type
    AND ar.sale_date >= NOW() - (p_months_back || ' months')::INTERVAL;

  v_avg_cost := COALESCE(v_avg_cost, 0);
  v_avg_value := COALESCE(v_avg_value, 0);
  v_equity_pct := COALESCE(v_equity_pct, 0);
  v_stddev_ratio := COALESCE(v_stddev_ratio, 0.3);

  -- Calculate ROI (if buying at avg price vs assessed value)
  IF v_avg_cost > 0 THEN
    v_roi := ((v_avg_value - v_avg_cost) / v_avg_cost) * 100;
  ELSE
    v_roi := 0;
  END IF;

  -- Immediate equity percentage (buying below market)
  v_equity_pct := (1.0 - v_equity_pct) * 100;

  -- Assess risk level based on volatility
  v_risk := CASE
    WHEN v_stddev_ratio > 0.5 THEN 'high'
    WHEN v_stddev_ratio > 0.3 THEN 'medium'
    ELSE 'low'
  END;

  -- Investment score (0-100)
  v_score := LEAST(
    (GREATEST(v_equity_pct, 0) * 0.6) +  -- Immediate equity weight
    (LEAST(v_roi / 2.0, 50) * 0.4),       -- ROI potential weight
    100
  );

  RETURN QUERY
  SELECT
    ROUND(v_avg_cost, 2),
    ROUND(v_avg_value, 2),
    ROUND(GREATEST(v_equity_pct, 0), 2),
    ROUND(v_roi, 2),
    v_risk,
    ROUND(v_score, 0);
END;
$$ LANGUAGE plpgsql;
