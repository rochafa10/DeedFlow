-- Regrid Data Tables - For Enriched Property Information
-- Stores screenshots and scraped data from Regrid

-- ============================================================================
-- TABLE: regrid_screenshots
-- Stores property screenshots from Regrid
-- ============================================================================
CREATE TABLE IF NOT EXISTS regrid_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Screenshot Storage
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  storage_url TEXT, -- Public URL if available
  file_size_bytes INTEGER,

  -- Screenshot Details
  screenshot_type TEXT DEFAULT 'map', -- map, street_view, satellite
  captured_at TIMESTAMP DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_property_screenshot UNIQUE (property_id, screenshot_type)
);

CREATE INDEX idx_regrid_screenshots_property ON regrid_screenshots(property_id);

-- ============================================================================
-- TABLE: regrid_data
-- Stores all scraped data from Regrid
-- ============================================================================
CREATE TABLE IF NOT EXISTS regrid_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Regrid Identifiers
  regrid_id TEXT,
  ll_uuid TEXT,

  -- Property Details (from Regrid)
  property_type TEXT,
  property_class TEXT,
  land_use TEXT,
  zoning TEXT,

  -- Lot Information
  lot_size_sqft NUMERIC(12,2),
  lot_size_acres NUMERIC(10,4),
  lot_dimensions TEXT,
  frontage_ft NUMERIC(8,2),

  -- Building Information
  building_sqft NUMERIC(10,2),
  year_built INTEGER,
  stories NUMERIC(3,1),
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),

  -- Valuation
  assessed_value NUMERIC(12,2),
  assessed_land_value NUMERIC(12,2),
  assessed_improvement_value NUMERIC(12,2),
  market_value NUMERIC(12,2),

  -- Geographic
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  elevation_ft NUMERIC(8,2),

  -- Utilities
  water_service TEXT,
  sewer_service TEXT,
  utilities TEXT,

  -- Additional Fields (JSON for flexibility)
  additional_fields JSONB,

  -- Raw HTML (for debugging)
  raw_html TEXT,

  -- Metadata
  scraped_at TIMESTAMP DEFAULT NOW(),
  data_quality_score NUMERIC(3,2), -- 0.00 to 1.00
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_property_regrid UNIQUE (property_id)
);

CREATE INDEX idx_regrid_data_property ON regrid_data(property_id);
CREATE INDEX idx_regrid_data_regrid_id ON regrid_data(regrid_id);

-- ============================================================================
-- TABLE: scraping_jobs
-- Tracks Regrid scraping progress
-- ============================================================================
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID REFERENCES counties(id) ON DELETE CASCADE,

  -- Job Status
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Progress
  total_properties INTEGER DEFAULT 0,
  properties_scraped INTEGER DEFAULT 0,
  properties_failed INTEGER DEFAULT 0,
  screenshots_saved INTEGER DEFAULT 0,

  -- Error Details
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scraping_jobs_county ON scraping_jobs(county_id);
CREATE INDEX idx_scraping_jobs_status ON scraping_jobs(status);

-- ============================================================================
-- TABLE: scraping_errors
-- Logs scraping errors
-- ============================================================================
CREATE TABLE IF NOT EXISTS scraping_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraping_job_id UUID REFERENCES scraping_jobs(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,

  -- Error Details
  error_type TEXT, -- login_failed, property_not_found, screenshot_failed, etc.
  error_message TEXT,

  -- Context
  parcel_id TEXT,
  property_address TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scraping_errors_job ON scraping_errors(scraping_job_id);

-- ============================================================================
-- HELPER FUNCTION: Get Properties Needing Regrid Data
-- ============================================================================
CREATE OR REPLACE FUNCTION get_properties_needing_scraping(
  p_county_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  property_id UUID,
  parcel_id TEXT,
  property_address TEXT,
  county_name TEXT,
  state_code TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.parcel_id,
    p.property_address,
    c.county_name,
    c.state_code
  FROM properties p
  JOIN counties c ON c.id = p.county_id
  LEFT JOIN regrid_data rd ON rd.property_id = p.id
  WHERE
    (p_county_id IS NULL OR p.county_id = p_county_id)
    AND rd.id IS NULL -- Not yet scraped
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Create Scraping Job
-- ============================================================================
CREATE OR REPLACE FUNCTION create_scraping_job(
  p_county_id UUID,
  p_total_properties INTEGER
) RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO scraping_jobs (county_id, status, started_at, total_properties)
  VALUES (p_county_id, 'processing', NOW(), p_total_properties)
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Store Regrid Data
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_regrid_data(
  p_property_id UUID,
  p_fields JSONB,
  p_raw_html TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_data_id UUID;
  v_lot_size TEXT;
  v_building_size TEXT;
BEGIN
  -- Extract common fields from JSON
  v_lot_size := p_fields->>'Lot Size';
  v_building_size := p_fields->>'Building Area';

  -- Upsert regrid_data
  INSERT INTO regrid_data (
    property_id,
    property_type,
    land_use,
    zoning,
    lot_size_acres,
    building_sqft,
    year_built,
    assessed_value,
    additional_fields,
    raw_html,
    scraped_at,
    data_quality_score
  ) VALUES (
    p_property_id,
    p_fields->>'Property Type',
    p_fields->>'Land Use',
    p_fields->>'Zoning',
    -- Parse lot size (e.g., "0.07 Acres" -> 0.07)
    CASE
      WHEN v_lot_size ~ '[\d.]+' THEN
        (regexp_match(v_lot_size, '([\d.]+)'))[1]::NUMERIC
      ELSE NULL
    END,
    -- Parse building size
    CASE
      WHEN v_building_size ~ '[\d,]+' THEN
        REPLACE(regexp_match(v_building_size, '([\d,]+)')[1], ',', '')::NUMERIC
      ELSE NULL
    END,
    (p_fields->>'Year Built')::INTEGER,
    -- Parse assessed value
    CASE
      WHEN p_fields->>'Assessed Value' ~ '[\d,]+' THEN
        REPLACE(regexp_match(p_fields->>'Assessed Value', '([\d,]+)')[1], ',', '')::NUMERIC
      ELSE NULL
    END,
    p_fields,
    p_raw_html,
    NOW(),
    0.85
  )
  ON CONFLICT (property_id)
  DO UPDATE SET
    property_type = EXCLUDED.property_type,
    land_use = EXCLUDED.land_use,
    zoning = EXCLUDED.zoning,
    lot_size_acres = EXCLUDED.lot_size_acres,
    building_sqft = EXCLUDED.building_sqft,
    year_built = EXCLUDED.year_built,
    assessed_value = EXCLUDED.assessed_value,
    additional_fields = EXCLUDED.additional_fields,
    raw_html = EXCLUDED.raw_html,
    scraped_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_data_id;

  RETURN v_data_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Store Screenshot
-- ============================================================================
CREATE OR REPLACE FUNCTION store_screenshot(
  p_property_id UUID,
  p_storage_path TEXT,
  p_storage_url TEXT DEFAULT NULL,
  p_file_size INTEGER DEFAULT NULL,
  p_screenshot_type TEXT DEFAULT 'map'
) RETURNS UUID AS $$
DECLARE
  v_screenshot_id UUID;
BEGIN
  INSERT INTO regrid_screenshots (
    property_id,
    storage_path,
    storage_url,
    file_size_bytes,
    screenshot_type,
    captured_at
  ) VALUES (
    p_property_id,
    p_storage_path,
    p_storage_url,
    p_file_size,
    p_screenshot_type,
    NOW()
  )
  ON CONFLICT (property_id, screenshot_type)
  DO UPDATE SET
    storage_path = EXCLUDED.storage_path,
    storage_url = EXCLUDED.storage_url,
    file_size_bytes = EXCLUDED.file_size_bytes,
    captured_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_screenshot_id;

  RETURN v_screenshot_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Complete Property Data with Regrid
-- ============================================================================
CREATE OR REPLACE VIEW vw_properties_enriched AS
SELECT
  p.*,
  c.county_name,
  c.state_code,
  rd.lot_size_acres,
  rd.building_sqft,
  rd.year_built,
  rd.assessed_value,
  rd.property_type as regrid_property_type,
  rd.land_use,
  rd.zoning,
  rs.storage_url as screenshot_url,
  rd.scraped_at as regrid_scraped_at
FROM properties p
JOIN counties c ON c.id = p.county_id
LEFT JOIN regrid_data rd ON rd.property_id = p.id
LEFT JOIN regrid_screenshots rs ON rs.property_id = p.id AND rs.screenshot_type = 'map';

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Get properties needing scraping
/*
SELECT * FROM get_properties_needing_scraping(
  (SELECT id FROM counties WHERE county_name = 'Blair' AND state_code = 'PA'),
  10
);
*/

-- Example 2: Create scraping job
/*
SELECT create_scraping_job(
  (SELECT id FROM counties WHERE county_name = 'Blair'),
  100
);
*/

-- Example 3: Store regrid data
/*
SELECT upsert_regrid_data(
  'property-uuid',
  '{
    "Property Type": "Residential",
    "Lot Size": "0.07 Acres",
    "Building Area": "1,200 sqft",
    "Year Built": "1950",
    "Assessed Value": "$45,000"
  }'::JSONB,
  '<html>...</html>'
);
*/

-- Example 4: Store screenshot
/*
SELECT store_screenshot(
  'property-uuid',
  'screenshots/blair-pa/12-345-678.png',
  'https://supabase.co/storage/screenshots/blair-pa/12-345-678.png',
  125000,
  'map'
);
*/
