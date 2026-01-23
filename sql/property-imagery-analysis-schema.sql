-- Property Imagery Analysis Tables - For AI-Powered Virtual Property Tours
-- Stores satellite imagery, street view, and AI analysis results

-- ============================================================================
-- TABLE: property_imagery_analysis
-- Stores AI analysis results from satellite imagery and street view
-- ============================================================================
CREATE TABLE IF NOT EXISTS property_imagery_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Analysis Type
  analysis_type TEXT NOT NULL, -- satellite, street_view, combined
  ai_model TEXT NOT NULL, -- gpt-4-vision, claude-3-opus, etc.

  -- Analysis Results
  findings_json JSONB, -- Structured findings from AI analysis
  condition_flags TEXT[], -- Array of flags: roof_damage, overgrowth, structural_issues, etc.
  visible_issues TEXT, -- Human-readable summary of issues found
  recommendation TEXT, -- invest, avoid, inspect_further, etc.
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00

  -- Image References
  satellite_image_url TEXT,
  street_view_image_url TEXT,
  historical_image_urls TEXT[], -- Array of historical comparison URLs

  -- Change Detection (for historical comparison)
  changes_detected BOOLEAN DEFAULT FALSE,
  change_summary TEXT,
  change_severity TEXT, -- minor, moderate, significant

  -- Property Condition Indicators
  roof_condition TEXT, -- good, fair, poor, damaged
  vegetation_overgrowth BOOLEAN DEFAULT FALSE,
  structural_damage BOOLEAN DEFAULT FALSE,
  abandonment_indicators BOOLEAN DEFAULT FALSE,
  visible_repairs_needed TEXT[],

  -- Metadata
  analyzed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_property_analysis UNIQUE (property_id, analysis_type, analyzed_at)
);

-- Indexes for performance
CREATE INDEX idx_imagery_analysis_property ON property_imagery_analysis(property_id);
CREATE INDEX idx_imagery_analysis_type ON property_imagery_analysis(analysis_type);
CREATE INDEX idx_imagery_analysis_recommendation ON property_imagery_analysis(recommendation);
CREATE INDEX idx_imagery_analysis_confidence ON property_imagery_analysis(confidence_score);
CREATE INDEX idx_imagery_analysis_flags ON property_imagery_analysis USING gin(condition_flags);

-- ============================================================================
-- TABLE: imagery_analysis_jobs
-- Tracks AI imagery analysis progress
-- ============================================================================
CREATE TABLE IF NOT EXISTS imagery_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID REFERENCES counties(id) ON DELETE CASCADE,

  -- Job Configuration
  analysis_type TEXT DEFAULT 'combined', -- satellite, street_view, combined
  ai_model TEXT DEFAULT 'gpt-4-vision',

  -- Job Status
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Progress
  total_properties INTEGER DEFAULT 0,
  properties_analyzed INTEGER DEFAULT 0,
  properties_failed INTEGER DEFAULT 0,
  properties_flagged INTEGER DEFAULT 0, -- Properties with visible issues

  -- Error Details
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_imagery_jobs_county ON imagery_analysis_jobs(county_id);
CREATE INDEX idx_imagery_jobs_status ON imagery_analysis_jobs(status);

-- ============================================================================
-- TABLE: imagery_analysis_errors
-- Logs imagery analysis errors
-- ============================================================================
CREATE TABLE IF NOT EXISTS imagery_analysis_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_job_id UUID REFERENCES imagery_analysis_jobs(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,

  -- Error Details
  error_type TEXT, -- image_not_found, ai_api_failed, rate_limit, etc.
  error_message TEXT,

  -- Context
  parcel_id TEXT,
  property_address TEXT,
  analysis_type TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_imagery_errors_job ON imagery_analysis_errors(analysis_job_id);

-- ============================================================================
-- VIEW: vw_properties_with_imagery_analysis
-- Combines property data with latest imagery analysis
-- ============================================================================
CREATE OR REPLACE VIEW vw_properties_with_imagery_analysis AS
SELECT
  p.id AS property_id,
  p.parcel_id,
  p.property_address,
  p.city,
  p.state_code,
  c.county_name,
  p.total_due,
  p.assessed_value,
  pia.id AS analysis_id,
  pia.analysis_type,
  pia.ai_model,
  pia.recommendation,
  pia.confidence_score,
  pia.condition_flags,
  pia.visible_issues,
  pia.roof_condition,
  pia.vegetation_overgrowth,
  pia.structural_damage,
  pia.abandonment_indicators,
  pia.changes_detected,
  pia.change_severity,
  pia.analyzed_at
FROM properties p
JOIN counties c ON c.id = p.county_id
LEFT JOIN LATERAL (
  SELECT *
  FROM property_imagery_analysis
  WHERE property_id = p.id
  ORDER BY analyzed_at DESC
  LIMIT 1
) pia ON TRUE;

-- ============================================================================
-- VIEW: vw_flagged_properties
-- Properties with visible issues detected by AI
-- ============================================================================
CREATE OR REPLACE VIEW vw_flagged_properties AS
SELECT
  p.id AS property_id,
  p.parcel_id,
  p.property_address,
  p.city,
  p.state_code,
  c.county_name,
  p.total_due,
  p.assessed_value,
  pia.analysis_type,
  pia.recommendation,
  pia.confidence_score,
  pia.condition_flags,
  pia.visible_issues,
  pia.roof_condition,
  pia.structural_damage,
  pia.vegetation_overgrowth,
  pia.abandonment_indicators,
  pia.analyzed_at
FROM properties p
JOIN counties c ON c.id = p.county_id
JOIN property_imagery_analysis pia ON pia.property_id = p.id
WHERE
  pia.recommendation IN ('avoid', 'inspect_further')
  OR pia.structural_damage = TRUE
  OR pia.roof_condition IN ('poor', 'damaged')
  OR array_length(pia.condition_flags, 1) > 0
ORDER BY pia.confidence_score DESC, p.total_due DESC;

-- ============================================================================
-- VIEW: vw_investable_properties_imagery
-- Properties recommended for investment based on imagery analysis
-- ============================================================================
CREATE OR REPLACE VIEW vw_investable_properties_imagery AS
SELECT
  p.id AS property_id,
  p.parcel_id,
  p.property_address,
  p.city,
  p.state_code,
  c.county_name,
  p.total_due,
  p.assessed_value,
  pia.analysis_type,
  pia.recommendation,
  pia.confidence_score,
  pia.visible_issues,
  pia.roof_condition,
  pia.analyzed_at
FROM properties p
JOIN counties c ON c.id = p.county_id
JOIN property_imagery_analysis pia ON pia.property_id = p.id
WHERE
  pia.recommendation = 'invest'
  AND pia.confidence_score >= 0.70
  AND pia.structural_damage = FALSE
ORDER BY pia.confidence_score DESC, p.total_due ASC;

-- ============================================================================
-- HELPER FUNCTION: Get Properties Needing Imagery Analysis
-- ============================================================================
CREATE OR REPLACE FUNCTION get_properties_needing_imagery_analysis(
  p_county_id UUID DEFAULT NULL,
  p_analysis_type TEXT DEFAULT 'combined',
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  property_id UUID,
  parcel_id TEXT,
  property_address TEXT,
  county_name TEXT,
  state_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.parcel_id,
    p.property_address,
    c.county_name,
    c.state_code,
    p.latitude,
    p.longitude
  FROM properties p
  JOIN counties c ON c.id = p.county_id
  LEFT JOIN property_imagery_analysis pia
    ON pia.property_id = p.id
    AND pia.analysis_type = p_analysis_type
  WHERE
    (p_county_id IS NULL OR p.county_id = p_county_id)
    AND pia.id IS NULL -- Not yet analyzed
    AND p.latitude IS NOT NULL -- Must have coordinates for imagery
    AND p.longitude IS NOT NULL
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Create Imagery Analysis Job
-- ============================================================================
CREATE OR REPLACE FUNCTION create_imagery_analysis_job(
  p_county_id UUID,
  p_analysis_type TEXT DEFAULT 'combined',
  p_ai_model TEXT DEFAULT 'gpt-4-vision',
  p_total_properties INTEGER DEFAULT 0
) RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO imagery_analysis_jobs (
    county_id,
    analysis_type,
    ai_model,
    status,
    started_at,
    total_properties
  )
  VALUES (
    p_county_id,
    p_analysis_type,
    p_ai_model,
    'processing',
    NOW(),
    p_total_properties
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Store/Update Imagery Analysis
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_imagery_analysis(
  p_property_id UUID,
  p_analysis_type TEXT,
  p_ai_model TEXT,
  p_findings_json JSONB,
  p_condition_flags TEXT[],
  p_visible_issues TEXT,
  p_recommendation TEXT,
  p_confidence_score NUMERIC,
  p_satellite_image_url TEXT DEFAULT NULL,
  p_street_view_image_url TEXT DEFAULT NULL,
  p_roof_condition TEXT DEFAULT NULL,
  p_vegetation_overgrowth BOOLEAN DEFAULT FALSE,
  p_structural_damage BOOLEAN DEFAULT FALSE,
  p_abandonment_indicators BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  v_analysis_id UUID;
BEGIN
  INSERT INTO property_imagery_analysis (
    property_id,
    analysis_type,
    ai_model,
    findings_json,
    condition_flags,
    visible_issues,
    recommendation,
    confidence_score,
    satellite_image_url,
    street_view_image_url,
    roof_condition,
    vegetation_overgrowth,
    structural_damage,
    abandonment_indicators,
    analyzed_at
  )
  VALUES (
    p_property_id,
    p_analysis_type,
    p_ai_model,
    p_findings_json,
    p_condition_flags,
    p_visible_issues,
    p_recommendation,
    p_confidence_score,
    p_satellite_image_url,
    p_street_view_image_url,
    p_roof_condition,
    p_vegetation_overgrowth,
    p_structural_damage,
    p_abandonment_indicators,
    NOW()
  )
  ON CONFLICT (property_id, analysis_type, analyzed_at)
  DO UPDATE SET
    ai_model = EXCLUDED.ai_model,
    findings_json = EXCLUDED.findings_json,
    condition_flags = EXCLUDED.condition_flags,
    visible_issues = EXCLUDED.visible_issues,
    recommendation = EXCLUDED.recommendation,
    confidence_score = EXCLUDED.confidence_score,
    satellite_image_url = EXCLUDED.satellite_image_url,
    street_view_image_url = EXCLUDED.street_view_image_url,
    roof_condition = EXCLUDED.roof_condition,
    vegetation_overgrowth = EXCLUDED.vegetation_overgrowth,
    structural_damage = EXCLUDED.structural_damage,
    abandonment_indicators = EXCLUDED.abandonment_indicators,
    updated_at = NOW()
  RETURNING id INTO v_analysis_id;

  RETURN v_analysis_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Complete Imagery Analysis Job
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_imagery_analysis_job(
  p_job_id UUID,
  p_properties_analyzed INTEGER,
  p_properties_failed INTEGER DEFAULT 0,
  p_properties_flagged INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  UPDATE imagery_analysis_jobs
  SET
    status = 'completed',
    completed_at = NOW(),
    properties_analyzed = p_properties_analyzed,
    properties_failed = p_properties_failed,
    properties_flagged = p_properties_flagged,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Fail Imagery Analysis Job
-- ============================================================================
CREATE OR REPLACE FUNCTION fail_imagery_analysis_job(
  p_job_id UUID,
  p_error_message TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE imagery_analysis_jobs
  SET
    status = 'failed',
    completed_at = NOW(),
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Log Imagery Analysis Error
-- ============================================================================
CREATE OR REPLACE FUNCTION log_imagery_analysis_error(
  p_job_id UUID,
  p_property_id UUID,
  p_error_type TEXT,
  p_error_message TEXT,
  p_parcel_id TEXT DEFAULT NULL,
  p_property_address TEXT DEFAULT NULL,
  p_analysis_type TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_error_id UUID;
BEGIN
  INSERT INTO imagery_analysis_errors (
    analysis_job_id,
    property_id,
    error_type,
    error_message,
    parcel_id,
    property_address,
    analysis_type
  )
  VALUES (
    p_job_id,
    p_property_id,
    p_error_type,
    p_error_message,
    p_parcel_id,
    p_property_address,
    p_analysis_type
  )
  RETURNING id INTO v_error_id;

  RETURN v_error_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get Imagery Analysis Summary
-- ============================================================================
CREATE OR REPLACE FUNCTION get_imagery_analysis_summary(
  p_county_id UUID DEFAULT NULL
) RETURNS TABLE (
  county_name TEXT,
  total_properties BIGINT,
  analyzed_properties BIGINT,
  pending_analysis BIGINT,
  properties_flagged BIGINT,
  invest_recommended BIGINT,
  avoid_recommended BIGINT,
  avg_confidence_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.county_name,
    COUNT(DISTINCT p.id) AS total_properties,
    COUNT(DISTINCT pia.property_id) AS analyzed_properties,
    COUNT(DISTINCT p.id) - COUNT(DISTINCT pia.property_id) AS pending_analysis,
    COUNT(DISTINCT CASE
      WHEN pia.recommendation IN ('avoid', 'inspect_further')
        OR pia.structural_damage = TRUE
      THEN pia.property_id
    END) AS properties_flagged,
    COUNT(DISTINCT CASE WHEN pia.recommendation = 'invest' THEN pia.property_id END) AS invest_recommended,
    COUNT(DISTINCT CASE WHEN pia.recommendation = 'avoid' THEN pia.property_id END) AS avoid_recommended,
    ROUND(AVG(pia.confidence_score), 2) AS avg_confidence_score
  FROM counties c
  LEFT JOIN properties p ON p.county_id = c.id
  LEFT JOIN LATERAL (
    SELECT DISTINCT ON (property_id) *
    FROM property_imagery_analysis
    WHERE property_id = p.id
    ORDER BY property_id, analyzed_at DESC
  ) pia ON TRUE
  WHERE (p_county_id IS NULL OR c.id = p_county_id)
  GROUP BY c.county_name
  ORDER BY total_properties DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- End of Property Imagery Analysis Schema
-- ============================================================================
