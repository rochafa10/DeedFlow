-- Bid Strategy Recommendations Tables
-- AI-powered max bid recommendations based on property analysis and target ROI

-- ============================================================================
-- TABLE: bid_strategy_recommendations
-- Stores calculated bid recommendations for properties
-- ============================================================================
CREATE TABLE IF NOT EXISTS bid_strategy_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Bid Recommendations (Three Risk Levels)
  max_bid_conservative NUMERIC(12,2) NOT NULL, -- Lowest risk, highest margin
  max_bid_moderate NUMERIC(12,2) NOT NULL, -- Balanced risk/reward
  max_bid_aggressive NUMERIC(12,2) NOT NULL, -- Higher risk, thinner margin

  -- Confidence & ROI
  confidence_level NUMERIC(3,2) NOT NULL, -- 0.00 to 1.00 (0% to 100%)
  roi_projection NUMERIC(5,2), -- Expected ROI percentage (e.g., 25.50 = 25.5%)

  -- Risk Analysis
  risk_warnings JSONB, -- Array of warning objects: [{type, severity, message}]
  risk_score NUMERIC(3,2), -- Overall risk score 0.00 to 1.00

  -- Calculation Details
  calculation_basis JSONB NOT NULL, -- Details: {arv, rehab_cost, closing_costs, target_roi, etc.}
  arv_estimate NUMERIC(12,2), -- After Repair Value used
  rehab_cost_estimate NUMERIC(12,2), -- Estimated renovation costs
  closing_costs NUMERIC(12,2), -- Estimated closing costs
  holding_costs NUMERIC(12,2), -- Estimated holding costs

  -- Market Context
  market_value NUMERIC(12,2), -- Current market value
  assessed_value NUMERIC(12,2), -- Tax assessed value
  comparable_properties_count INTEGER, -- Number of comps used

  -- Bid Comparison
  opening_bid NUMERIC(12,2), -- Property's minimum bid (if available)
  exceeds_max_bid BOOLEAN DEFAULT false, -- Warning flag: opening_bid > max_bid_moderate

  -- Recommendation Metadata
  recommendation_version TEXT DEFAULT '1.0', -- Algorithm version for tracking
  calculation_method TEXT, -- e.g., 'arv_based', 'market_value_based', 'assessed_value_based'
  data_quality_score NUMERIC(3,2), -- 0.00 to 1.00 - impacts confidence

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_property_bid_recommendation UNIQUE (property_id),
  CONSTRAINT valid_confidence_level CHECK (confidence_level >= 0 AND confidence_level <= 1),
  CONSTRAINT valid_risk_score CHECK (risk_score >= 0 AND risk_score <= 1),
  CONSTRAINT valid_data_quality CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
  CONSTRAINT valid_bid_order CHECK (max_bid_conservative <= max_bid_moderate AND max_bid_moderate <= max_bid_aggressive)
);

-- Indexes for performance
CREATE INDEX idx_bid_recommendations_property ON bid_strategy_recommendations(property_id);
CREATE INDEX idx_bid_recommendations_confidence ON bid_strategy_recommendations(confidence_level);
CREATE INDEX idx_bid_recommendations_created ON bid_strategy_recommendations(created_at);
CREATE INDEX idx_bid_recommendations_exceeds_max ON bid_strategy_recommendations(exceeds_max_bid);

-- ============================================================================
-- Comments for table documentation
-- ============================================================================
COMMENT ON TABLE bid_strategy_recommendations IS 'AI-powered bid recommendations with conservative/moderate/aggressive ranges and confidence scoring';
COMMENT ON COLUMN bid_strategy_recommendations.max_bid_conservative IS 'Safest bid amount - highest profit margin, lowest risk';
COMMENT ON COLUMN bid_strategy_recommendations.max_bid_moderate IS 'Balanced bid amount - recommended for most investors';
COMMENT ON COLUMN bid_strategy_recommendations.max_bid_aggressive IS 'Maximum bid amount - higher risk, thinner margins';
COMMENT ON COLUMN bid_strategy_recommendations.confidence_level IS 'How confident we are in this recommendation (0.0 to 1.0)';
COMMENT ON COLUMN bid_strategy_recommendations.risk_warnings IS 'JSON array of risk warnings: [{type: string, severity: "low"|"medium"|"high", message: string}]';
COMMENT ON COLUMN bid_strategy_recommendations.calculation_basis IS 'JSON object with all inputs used in calculation for transparency';
COMMENT ON COLUMN bid_strategy_recommendations.exceeds_max_bid IS 'True if opening bid exceeds our recommended max - RED FLAG for investor';

-- ============================================================================
-- UPSERT FUNCTION: Upsert Bid Recommendation
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_bid_recommendation(
  p_property_id UUID,
  p_max_bid_conservative NUMERIC,
  p_max_bid_moderate NUMERIC,
  p_max_bid_aggressive NUMERIC,
  p_confidence_level NUMERIC,
  p_calculation_basis JSONB,
  p_roi_projection NUMERIC DEFAULT NULL,
  p_risk_warnings JSONB DEFAULT NULL,
  p_risk_score NUMERIC DEFAULT NULL,
  p_arv_estimate NUMERIC DEFAULT NULL,
  p_rehab_cost_estimate NUMERIC DEFAULT NULL,
  p_closing_costs NUMERIC DEFAULT NULL,
  p_holding_costs NUMERIC DEFAULT NULL,
  p_market_value NUMERIC DEFAULT NULL,
  p_assessed_value NUMERIC DEFAULT NULL,
  p_comparable_properties_count INTEGER DEFAULT NULL,
  p_opening_bid NUMERIC DEFAULT NULL,
  p_exceeds_max_bid BOOLEAN DEFAULT NULL,
  p_recommendation_version TEXT DEFAULT '1.0',
  p_calculation_method TEXT DEFAULT NULL,
  p_data_quality_score NUMERIC DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_recommendation_id UUID;
BEGIN
  -- Try to update existing record (match by property_id due to unique constraint)
  UPDATE bid_strategy_recommendations
  SET
    max_bid_conservative = p_max_bid_conservative,
    max_bid_moderate = p_max_bid_moderate,
    max_bid_aggressive = p_max_bid_aggressive,
    confidence_level = p_confidence_level,
    calculation_basis = p_calculation_basis,
    roi_projection = COALESCE(p_roi_projection, roi_projection),
    risk_warnings = COALESCE(p_risk_warnings, risk_warnings),
    risk_score = COALESCE(p_risk_score, risk_score),
    arv_estimate = COALESCE(p_arv_estimate, arv_estimate),
    rehab_cost_estimate = COALESCE(p_rehab_cost_estimate, rehab_cost_estimate),
    closing_costs = COALESCE(p_closing_costs, closing_costs),
    holding_costs = COALESCE(p_holding_costs, holding_costs),
    market_value = COALESCE(p_market_value, market_value),
    assessed_value = COALESCE(p_assessed_value, assessed_value),
    comparable_properties_count = COALESCE(p_comparable_properties_count, comparable_properties_count),
    opening_bid = COALESCE(p_opening_bid, opening_bid),
    exceeds_max_bid = COALESCE(p_exceeds_max_bid, exceeds_max_bid),
    recommendation_version = COALESCE(p_recommendation_version, recommendation_version),
    calculation_method = COALESCE(p_calculation_method, calculation_method),
    data_quality_score = COALESCE(p_data_quality_score, data_quality_score),
    updated_at = NOW()
  WHERE property_id = p_property_id
  RETURNING id INTO v_recommendation_id;

  -- If no record was updated, insert new one
  IF v_recommendation_id IS NULL THEN
    INSERT INTO bid_strategy_recommendations (
      property_id,
      max_bid_conservative,
      max_bid_moderate,
      max_bid_aggressive,
      confidence_level,
      calculation_basis,
      roi_projection,
      risk_warnings,
      risk_score,
      arv_estimate,
      rehab_cost_estimate,
      closing_costs,
      holding_costs,
      market_value,
      assessed_value,
      comparable_properties_count,
      opening_bid,
      exceeds_max_bid,
      recommendation_version,
      calculation_method,
      data_quality_score
    )
    VALUES (
      p_property_id,
      p_max_bid_conservative,
      p_max_bid_moderate,
      p_max_bid_aggressive,
      p_confidence_level,
      p_calculation_basis,
      p_roi_projection,
      p_risk_warnings,
      p_risk_score,
      p_arv_estimate,
      p_rehab_cost_estimate,
      p_closing_costs,
      p_holding_costs,
      p_market_value,
      p_assessed_value,
      p_comparable_properties_count,
      p_opening_bid,
      p_exceeds_max_bid,
      p_recommendation_version,
      p_calculation_method,
      p_data_quality_score
    )
    RETURNING id INTO v_recommendation_id;
  END IF;

  RETURN v_recommendation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Complete Property Bid Recommendations
-- Joins properties, counties, regrid_data, and bid_strategy_recommendations
-- ============================================================================
CREATE OR REPLACE VIEW vw_property_bid_recommendations AS
SELECT
  -- Property Identification
  p.id as property_id,
  p.parcel_id,
  p.property_address,
  p.city,
  p.state_code,
  p.zip_code,
  c.county_name,

  -- Owner Information
  p.owner_name,
  p.owner_address,

  -- Property Details
  p.property_type,
  p.property_description,
  p.sale_date,
  p.sale_status,

  -- Tax Information
  p.tax_amount,
  p.penalties,
  p.interest,
  p.total_due,
  p.tax_year,

  -- Sale Information
  p.minimum_bid,
  p.upset_price,
  p.sale_type,

  -- Regrid Enrichment Data
  rd.lot_size_acres,
  rd.lot_size_sqft,
  rd.building_sqft,
  rd.year_built,
  rd.bedrooms,
  rd.bathrooms,
  rd.stories,
  rd.zoning,
  rd.land_use,
  rd.property_type as regrid_property_type,
  rd.property_class,
  rd.assessed_value as regrid_assessed_value,
  rd.assessed_land_value,
  rd.assessed_improvement_value,
  rd.market_value as regrid_market_value,
  rd.water_service,
  rd.sewer_service,
  rd.utilities,
  rd.latitude,
  rd.longitude,
  rd.data_quality_score as regrid_data_quality,
  rs.storage_url as screenshot_url,

  -- Bid Recommendations (Three Risk Levels)
  br.max_bid_conservative,
  br.max_bid_moderate,
  br.max_bid_aggressive,

  -- Confidence & ROI
  br.confidence_level,
  br.roi_projection,

  -- Risk Analysis
  br.risk_warnings,
  br.risk_score,

  -- Calculation Details
  br.calculation_basis,
  br.arv_estimate,
  br.rehab_cost_estimate,
  br.closing_costs,
  br.holding_costs,
  br.market_value as bid_market_value,
  br.assessed_value as bid_assessed_value,
  br.comparable_properties_count,

  -- Bid Comparison & Warnings
  br.opening_bid,
  br.exceeds_max_bid,

  -- Metadata
  br.recommendation_version,
  br.calculation_method,
  br.data_quality_score as recommendation_data_quality,
  br.created_at as recommendation_created_at,
  br.updated_at as recommendation_updated_at

FROM properties p
JOIN counties c ON c.id = p.county_id
LEFT JOIN regrid_data rd ON rd.property_id = p.id
LEFT JOIN bid_strategy_recommendations br ON br.property_id = p.id
LEFT JOIN regrid_screenshots rs ON rs.property_id = p.id AND rs.screenshot_type = 'map'
WHERE br.id IS NOT NULL -- Only show properties with bid recommendations
ORDER BY br.created_at DESC;

COMMENT ON VIEW vw_property_bid_recommendations IS 'Complete view joining properties, regrid data, and bid recommendations for UI display';

-- ============================================================================
-- HELPER FUNCTION: Get Bid Recommendation
-- Returns bid recommendation for a specific property with all related data
-- ============================================================================
CREATE OR REPLACE FUNCTION get_bid_recommendation(
  p_property_id UUID
) RETURNS TABLE (
  -- Property Identification
  property_id UUID,
  parcel_id TEXT,
  property_address TEXT,
  city TEXT,
  state_code TEXT,
  zip_code TEXT,
  county_name TEXT,

  -- Owner Information
  owner_name TEXT,
  owner_address TEXT,

  -- Property Details
  property_type TEXT,
  property_description TEXT,
  sale_date TIMESTAMP,
  sale_status TEXT,

  -- Tax Information
  tax_amount NUMERIC,
  penalties NUMERIC,
  interest NUMERIC,
  total_due NUMERIC,
  tax_year INTEGER,

  -- Sale Information
  minimum_bid NUMERIC,
  upset_price NUMERIC,
  sale_type TEXT,

  -- Regrid Enrichment Data
  lot_size_acres NUMERIC,
  lot_size_sqft NUMERIC,
  building_sqft NUMERIC,
  year_built INTEGER,
  bedrooms INTEGER,
  bathrooms NUMERIC,
  stories INTEGER,
  zoning TEXT,
  land_use TEXT,
  regrid_property_type TEXT,
  property_class TEXT,
  regrid_assessed_value NUMERIC,
  assessed_land_value NUMERIC,
  assessed_improvement_value NUMERIC,
  regrid_market_value NUMERIC,
  water_service TEXT,
  sewer_service TEXT,
  utilities TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  regrid_data_quality NUMERIC,
  screenshot_url TEXT,

  -- Bid Recommendations (Three Risk Levels)
  max_bid_conservative NUMERIC,
  max_bid_moderate NUMERIC,
  max_bid_aggressive NUMERIC,

  -- Confidence & ROI
  confidence_level NUMERIC,
  roi_projection NUMERIC,

  -- Risk Analysis
  risk_warnings JSONB,
  risk_score NUMERIC,

  -- Calculation Details
  calculation_basis JSONB,
  arv_estimate NUMERIC,
  rehab_cost_estimate NUMERIC,
  closing_costs NUMERIC,
  holding_costs NUMERIC,
  bid_market_value NUMERIC,
  bid_assessed_value NUMERIC,
  comparable_properties_count INTEGER,

  -- Bid Comparison & Warnings
  opening_bid NUMERIC,
  exceeds_max_bid BOOLEAN,

  -- Metadata
  recommendation_version TEXT,
  calculation_method TEXT,
  recommendation_data_quality NUMERIC,
  recommendation_created_at TIMESTAMP,
  recommendation_updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vw.property_id,
    vw.parcel_id,
    vw.property_address,
    vw.city,
    vw.state_code,
    vw.zip_code,
    vw.county_name,
    vw.owner_name,
    vw.owner_address,
    vw.property_type,
    vw.property_description,
    vw.sale_date,
    vw.sale_status,
    vw.tax_amount,
    vw.penalties,
    vw.interest,
    vw.total_due,
    vw.tax_year,
    vw.minimum_bid,
    vw.upset_price,
    vw.sale_type,
    vw.lot_size_acres,
    vw.lot_size_sqft,
    vw.building_sqft,
    vw.year_built,
    vw.bedrooms,
    vw.bathrooms,
    vw.stories,
    vw.zoning,
    vw.land_use,
    vw.regrid_property_type,
    vw.property_class,
    vw.regrid_assessed_value,
    vw.assessed_land_value,
    vw.assessed_improvement_value,
    vw.regrid_market_value,
    vw.water_service,
    vw.sewer_service,
    vw.utilities,
    vw.latitude,
    vw.longitude,
    vw.regrid_data_quality,
    vw.screenshot_url,
    vw.max_bid_conservative,
    vw.max_bid_moderate,
    vw.max_bid_aggressive,
    vw.confidence_level,
    vw.roi_projection,
    vw.risk_warnings,
    vw.risk_score,
    vw.calculation_basis,
    vw.arv_estimate,
    vw.rehab_cost_estimate,
    vw.closing_costs,
    vw.holding_costs,
    vw.bid_market_value,
    vw.bid_assessed_value,
    vw.comparable_properties_count,
    vw.opening_bid,
    vw.exceeds_max_bid,
    vw.recommendation_version,
    vw.calculation_method,
    vw.recommendation_data_quality,
    vw.recommendation_created_at,
    vw.recommendation_updated_at
  FROM vw_property_bid_recommendations vw
  WHERE vw.property_id = p_property_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_bid_recommendation IS 'Retrieves complete bid recommendation for a specific property including all related property, regrid, and calculation details';
