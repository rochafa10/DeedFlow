-- =====================================================
-- Migration: Create zoning_rules table
-- Purpose: Store zoning regulations by state/county/code
-- for the Zoning Information card on property reports
-- =====================================================

-- Create zoning_rules table
CREATE TABLE IF NOT EXISTS zoning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location identifiers
  state_code TEXT NOT NULL,
  county_name TEXT, -- NULL means state-wide default
  zoning_code TEXT NOT NULL,

  -- Zoning information
  zoning_name TEXT, -- e.g., "Single Family Residential"
  zoning_category TEXT, -- 'residential', 'commercial', 'industrial', 'mixed', 'agricultural'

  -- Permitted uses (array of strings)
  permitted_uses TEXT[] DEFAULT ARRAY[]::TEXT[],
  conditional_uses TEXT[] DEFAULT ARRAY[]::TEXT[],
  prohibited_uses TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Lot requirements
  min_lot_size_sqft INTEGER,
  min_lot_width_ft DECIMAL(10,2),
  max_lot_coverage_pct DECIMAL(5,2), -- e.g., 40.00 for 40%

  -- Setbacks (in feet)
  front_setback_ft DECIMAL(10,2),
  side_setback_ft DECIMAL(10,2),
  rear_setback_ft DECIMAL(10,2),
  corner_setback_ft DECIMAL(10,2),

  -- Height restrictions
  max_height_ft DECIMAL(10,2),
  max_stories INTEGER,

  -- Density
  max_units_per_acre DECIMAL(10,2),
  min_lot_per_unit_sqft INTEGER,

  -- Parking
  min_parking_spaces INTEGER,
  parking_notes TEXT,

  -- Source information
  source_url TEXT,
  source_document TEXT,
  effective_date DATE,
  last_verified_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  is_default BOOLEAN DEFAULT FALSE, -- True for state-wide defaults

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one rule per state/county/code combination
  CONSTRAINT zoning_rules_location_code_unique UNIQUE (state_code, county_name, zoning_code)
);

-- Create indexes
CREATE INDEX idx_zoning_rules_state ON zoning_rules(state_code);
CREATE INDEX idx_zoning_rules_county ON zoning_rules(county_name);
CREATE INDEX idx_zoning_rules_code ON zoning_rules(zoning_code);
CREATE INDEX idx_zoning_rules_state_code ON zoning_rules(state_code, zoning_code);
CREATE INDEX idx_zoning_rules_category ON zoning_rules(zoning_category);

-- Enable RLS
ALTER TABLE zoning_rules ENABLE ROW LEVEL SECURITY;

-- Allow public read access (zoning rules are public information)
CREATE POLICY "Allow public read access to zoning rules"
  ON zoning_rules FOR SELECT
  USING (true);

-- =====================================================
-- Seed data: Common PA residential zoning codes
-- =====================================================

-- PA State-wide defaults (is_default = true, county_name = NULL)
INSERT INTO zoning_rules (
  state_code, county_name, zoning_code, zoning_name, zoning_category,
  permitted_uses, min_lot_size_sqft, front_setback_ft, side_setback_ft,
  rear_setback_ft, max_height_ft, max_stories, is_default, notes
) VALUES
-- R-1: Single Family Residential (Low Density)
('PA', NULL, 'R-1', 'Single Family Residential (Low Density)', 'residential',
 ARRAY['Single-family dwelling', 'Home occupation', 'Accessory structures'],
 10000, 30.00, 10.00, 30.00, 35.00, 2, true,
 'PA default for R-1 zones. Actual requirements vary by municipality.'),

-- R-2: Single Family Residential (Medium Density)
('PA', NULL, 'R-2', 'Single Family Residential (Medium Density)', 'residential',
 ARRAY['Single-family dwelling', 'Two-family dwelling', 'Home occupation', 'Accessory structures'],
 7500, 25.00, 8.00, 25.00, 35.00, 2, true,
 'PA default for R-2 zones. Actual requirements vary by municipality.'),

-- R-3: Multi-Family Residential
('PA', NULL, 'R-3', 'Multi-Family Residential', 'residential',
 ARRAY['Single-family dwelling', 'Two-family dwelling', 'Multi-family dwelling', 'Townhouses', 'Accessory structures'],
 5000, 20.00, 6.00, 20.00, 40.00, 3, true,
 'PA default for R-3 zones. Actual requirements vary by municipality.'),

-- R-4: High Density Residential
('PA', NULL, 'R-4', 'High Density Residential', 'residential',
 ARRAY['Multi-family dwelling', 'Apartments', 'Condominiums', 'Senior housing'],
 3000, 15.00, 5.00, 15.00, 45.00, 4, true,
 'PA default for R-4 zones. Actual requirements vary by municipality.'),

-- C-1: Neighborhood Commercial
('PA', NULL, 'C-1', 'Neighborhood Commercial', 'commercial',
 ARRAY['Retail stores', 'Professional offices', 'Personal services', 'Restaurants'],
 5000, 15.00, 10.00, 20.00, 35.00, 2, true,
 'PA default for C-1 zones. Actual requirements vary by municipality.'),

-- C-2: General Commercial
('PA', NULL, 'C-2', 'General Commercial', 'commercial',
 ARRAY['Retail stores', 'Offices', 'Restaurants', 'Hotels', 'Entertainment venues', 'Auto sales'],
 10000, 20.00, 15.00, 25.00, 45.00, 3, true,
 'PA default for C-2 zones. Actual requirements vary by municipality.'),

-- I-1: Light Industrial
('PA', NULL, 'I-1', 'Light Industrial', 'industrial',
 ARRAY['Light manufacturing', 'Warehousing', 'Distribution', 'Research facilities'],
 20000, 30.00, 20.00, 30.00, 50.00, 3, true,
 'PA default for I-1 zones. Actual requirements vary by municipality.'),

-- A-1: Agricultural
('PA', NULL, 'A-1', 'Agricultural', 'agricultural',
 ARRAY['Farming', 'Single-family dwelling', 'Agricultural buildings', 'Farm stands'],
 43560, 50.00, 25.00, 50.00, 35.00, 2, true,
 'PA default for A-1 zones (1 acre minimum). Actual requirements vary by municipality.');

-- =====================================================
-- Function: Get zoning rules with fallback to defaults
-- =====================================================

CREATE OR REPLACE FUNCTION get_zoning_rules(
  p_state_code TEXT,
  p_county_name TEXT DEFAULT NULL,
  p_zoning_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  state_code TEXT,
  county_name TEXT,
  zoning_code TEXT,
  zoning_name TEXT,
  zoning_category TEXT,
  permitted_uses TEXT[],
  conditional_uses TEXT[],
  prohibited_uses TEXT[],
  min_lot_size_sqft INTEGER,
  front_setback_ft DECIMAL,
  side_setback_ft DECIMAL,
  rear_setback_ft DECIMAL,
  max_height_ft DECIMAL,
  max_stories INTEGER,
  source_url TEXT,
  is_default BOOLEAN,
  notes TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- First try to find county-specific rules
  IF p_county_name IS NOT NULL AND p_zoning_code IS NOT NULL THEN
    RETURN QUERY
    SELECT
      zr.id, zr.state_code, zr.county_name, zr.zoning_code,
      zr.zoning_name, zr.zoning_category, zr.permitted_uses,
      zr.conditional_uses, zr.prohibited_uses, zr.min_lot_size_sqft,
      zr.front_setback_ft, zr.side_setback_ft, zr.rear_setback_ft,
      zr.max_height_ft, zr.max_stories, zr.source_url, zr.is_default, zr.notes
    FROM zoning_rules zr
    WHERE zr.state_code = p_state_code
      AND zr.county_name = p_county_name
      AND zr.zoning_code = p_zoning_code
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Fall back to state-wide default for this zoning code
  IF p_zoning_code IS NOT NULL THEN
    RETURN QUERY
    SELECT
      zr.id, zr.state_code, zr.county_name, zr.zoning_code,
      zr.zoning_name, zr.zoning_category, zr.permitted_uses,
      zr.conditional_uses, zr.prohibited_uses, zr.min_lot_size_sqft,
      zr.front_setback_ft, zr.side_setback_ft, zr.rear_setback_ft,
      zr.max_height_ft, zr.max_stories, zr.source_url, zr.is_default, zr.notes
    FROM zoning_rules zr
    WHERE zr.state_code = p_state_code
      AND zr.county_name IS NULL
      AND zr.zoning_code = p_zoning_code
      AND zr.is_default = true
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;

    -- Try to match zoning code prefix (e.g., R-1A matches R-1)
    RETURN QUERY
    SELECT
      zr.id, zr.state_code, zr.county_name, zr.zoning_code,
      zr.zoning_name, zr.zoning_category, zr.permitted_uses,
      zr.conditional_uses, zr.prohibited_uses, zr.min_lot_size_sqft,
      zr.front_setback_ft, zr.side_setback_ft, zr.rear_setback_ft,
      zr.max_height_ft, zr.max_stories, zr.source_url, zr.is_default, zr.notes
    FROM zoning_rules zr
    WHERE zr.state_code = p_state_code
      AND zr.county_name IS NULL
      AND p_zoning_code LIKE zr.zoning_code || '%'
      AND zr.is_default = true
    ORDER BY LENGTH(zr.zoning_code) DESC
    LIMIT 1;
  END IF;
END;
$$;

-- =====================================================
-- Function: Upsert zoning rules
-- =====================================================

CREATE OR REPLACE FUNCTION upsert_zoning_rule(
  p_state_code TEXT,
  p_county_name TEXT,
  p_zoning_code TEXT,
  p_zoning_name TEXT DEFAULT NULL,
  p_zoning_category TEXT DEFAULT NULL,
  p_permitted_uses TEXT[] DEFAULT NULL,
  p_min_lot_size_sqft INTEGER DEFAULT NULL,
  p_front_setback_ft DECIMAL DEFAULT NULL,
  p_side_setback_ft DECIMAL DEFAULT NULL,
  p_rear_setback_ft DECIMAL DEFAULT NULL,
  p_max_height_ft DECIMAL DEFAULT NULL,
  p_max_stories INTEGER DEFAULT NULL,
  p_source_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO zoning_rules (
    state_code, county_name, zoning_code, zoning_name, zoning_category,
    permitted_uses, min_lot_size_sqft, front_setback_ft, side_setback_ft,
    rear_setback_ft, max_height_ft, max_stories, source_url, notes,
    last_verified_at
  ) VALUES (
    p_state_code, p_county_name, p_zoning_code, p_zoning_name, p_zoning_category,
    COALESCE(p_permitted_uses, ARRAY[]::TEXT[]), p_min_lot_size_sqft,
    p_front_setback_ft, p_side_setback_ft, p_rear_setback_ft,
    p_max_height_ft, p_max_stories, p_source_url, p_notes, NOW()
  )
  ON CONFLICT (state_code, county_name, zoning_code)
  DO UPDATE SET
    zoning_name = COALESCE(EXCLUDED.zoning_name, zoning_rules.zoning_name),
    zoning_category = COALESCE(EXCLUDED.zoning_category, zoning_rules.zoning_category),
    permitted_uses = CASE
      WHEN EXCLUDED.permitted_uses IS NOT NULL AND array_length(EXCLUDED.permitted_uses, 1) > 0
      THEN EXCLUDED.permitted_uses
      ELSE zoning_rules.permitted_uses
    END,
    min_lot_size_sqft = COALESCE(EXCLUDED.min_lot_size_sqft, zoning_rules.min_lot_size_sqft),
    front_setback_ft = COALESCE(EXCLUDED.front_setback_ft, zoning_rules.front_setback_ft),
    side_setback_ft = COALESCE(EXCLUDED.side_setback_ft, zoning_rules.side_setback_ft),
    rear_setback_ft = COALESCE(EXCLUDED.rear_setback_ft, zoning_rules.rear_setback_ft),
    max_height_ft = COALESCE(EXCLUDED.max_height_ft, zoning_rules.max_height_ft),
    max_stories = COALESCE(EXCLUDED.max_stories, zoning_rules.max_stories),
    source_url = COALESCE(EXCLUDED.source_url, zoning_rules.source_url),
    notes = COALESCE(EXCLUDED.notes, zoning_rules.notes),
    last_verified_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_zoning_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_zoning_rules_updated_at
  BEFORE UPDATE ON zoning_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_zoning_rules_updated_at();

-- Grant permissions
GRANT SELECT ON zoning_rules TO anon, authenticated;
GRANT INSERT, UPDATE ON zoning_rules TO authenticated;
GRANT EXECUTE ON FUNCTION get_zoning_rules TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_zoning_rule TO authenticated;
