-- Property Data Tables - For Parsed PDF Information
-- This extends the tax auction database with actual property listings

-- ============================================================================
-- TABLE: properties
-- Stores individual properties from parsed property lists
-- ============================================================================
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Property Identification
  parcel_id TEXT NOT NULL,
  property_address TEXT,
  city TEXT,
  state_code TEXT,
  zip_code TEXT,

  -- Owner Information
  owner_name TEXT,
  owner_address TEXT,

  -- Tax Information
  tax_amount NUMERIC(12,2),
  penalties NUMERIC(12,2),
  interest NUMERIC(12,2),
  total_due NUMERIC(12,2),
  tax_year INTEGER,

  -- Property Details
  property_type TEXT, -- residential, commercial, vacant_land, etc.
  property_description TEXT,
  assessed_value NUMERIC(12,2),

  -- Sale Information
  minimum_bid NUMERIC(12,2),
  upset_price NUMERIC(12,2),
  sale_type TEXT, -- upset, judicial, repository
  sale_date TIMESTAMP,
  sale_status TEXT DEFAULT 'upcoming', -- upcoming, sold, unsold, withdrawn

  -- Coordinates (if available)
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),

  -- Metadata
  raw_text TEXT, -- Original text from PDF for reference
  parsing_confidence NUMERIC(3,2), -- 0.00 to 1.00
  parsed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_property_per_county UNIQUE (county_id, parcel_id, tax_year)
);

-- Indexes for performance
CREATE INDEX idx_properties_county ON properties(county_id);
CREATE INDEX idx_properties_document ON properties(document_id);
CREATE INDEX idx_properties_parcel ON properties(parcel_id);
CREATE INDEX idx_properties_sale_date ON properties(sale_date);
CREATE INDEX idx_properties_sale_status ON properties(sale_status);
CREATE INDEX idx_properties_address ON properties(property_address);

-- ============================================================================
-- TABLE: parsing_jobs
-- Tracks PDF parsing progress and status
-- ============================================================================
CREATE TABLE IF NOT EXISTS parsing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Job Status
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Results
  properties_extracted INTEGER DEFAULT 0,
  properties_failed INTEGER DEFAULT 0,
  error_message TEXT,

  -- Parsing Details
  parser_used TEXT, -- pdf_plumber, camelot, tabula, ocr
  parsing_method TEXT, -- table_extraction, text_parsing, ocr
  confidence_avg NUMERIC(3,2),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_parsing_jobs_document ON parsing_jobs(document_id);
CREATE INDEX idx_parsing_jobs_status ON parsing_jobs(status);

-- ============================================================================
-- TABLE: parsing_errors
-- Logs parsing errors for troubleshooting
-- ============================================================================
CREATE TABLE IF NOT EXISTS parsing_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parsing_job_id UUID NOT NULL REFERENCES parsing_jobs(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Error Details
  error_type TEXT, -- download_failed, parse_failed, data_invalid, etc.
  error_message TEXT,
  page_number INTEGER,

  -- Context
  raw_data TEXT, -- Problematic data that caused error

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_parsing_errors_job ON parsing_errors(parsing_job_id);
CREATE INDEX idx_parsing_errors_document ON parsing_errors(document_id);

-- ============================================================================
-- HELPER FUNCTION: Get Unparsed Documents
-- ============================================================================
CREATE OR REPLACE FUNCTION get_unparsed_documents(
  p_county_id UUID DEFAULT NULL,
  p_document_type TEXT DEFAULT 'property_list',
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  document_id UUID,
  county_name TEXT,
  state_code TEXT,
  document_title TEXT,
  document_url TEXT,
  file_format TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    c.county_name,
    c.state_code,
    d.title,
    d.url,
    d.file_format
  FROM documents d
  JOIN counties c ON c.id = d.county_id
  LEFT JOIN parsing_jobs pj ON pj.document_id = d.id AND pj.status = 'completed'
  WHERE
    (p_county_id IS NULL OR d.county_id = p_county_id)
    AND d.document_type = p_document_type
    AND pj.id IS NULL -- Not yet parsed
  ORDER BY d.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Create Parsing Job
-- ============================================================================
CREATE OR REPLACE FUNCTION create_parsing_job(
  p_document_id UUID
) RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO parsing_jobs (document_id, status, started_at)
  VALUES (p_document_id, 'processing', NOW())
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Complete Parsing Job
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_parsing_job(
  p_job_id UUID,
  p_properties_extracted INTEGER,
  p_properties_failed INTEGER DEFAULT 0,
  p_parser_used TEXT DEFAULT 'pdf_plumber',
  p_confidence_avg NUMERIC DEFAULT 0.85
) RETURNS VOID AS $$
BEGIN
  UPDATE parsing_jobs
  SET
    status = 'completed',
    completed_at = NOW(),
    properties_extracted = p_properties_extracted,
    properties_failed = p_properties_failed,
    parser_used = p_parser_used,
    confidence_avg = p_confidence_avg,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Fail Parsing Job
-- ============================================================================
CREATE OR REPLACE FUNCTION fail_parsing_job(
  p_job_id UUID,
  p_error_message TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE parsing_jobs
  SET
    status = 'failed',
    completed_at = NOW(),
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Upsert Property
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_property(
  p_county_id UUID,
  p_document_id UUID,
  p_parcel_id TEXT,
  p_property_address TEXT,
  p_owner_name TEXT DEFAULT NULL,
  p_tax_amount NUMERIC DEFAULT NULL,
  p_total_due NUMERIC DEFAULT NULL,
  p_tax_year INTEGER DEFAULT NULL,
  p_sale_type TEXT DEFAULT NULL,
  p_sale_date TIMESTAMP DEFAULT NULL,
  p_raw_text TEXT DEFAULT NULL,
  p_confidence NUMERIC DEFAULT 0.85
) RETURNS UUID AS $$
DECLARE
  v_property_id UUID;
BEGIN
  -- Try to update existing record
  UPDATE properties
  SET
    property_address = COALESCE(p_property_address, property_address),
    owner_name = COALESCE(p_owner_name, owner_name),
    tax_amount = COALESCE(p_tax_amount, tax_amount),
    total_due = COALESCE(p_total_due, total_due),
    sale_type = COALESCE(p_sale_type, sale_type),
    sale_date = COALESCE(p_sale_date, sale_date),
    raw_text = COALESCE(p_raw_text, raw_text),
    parsing_confidence = p_confidence,
    updated_at = NOW()
  WHERE county_id = p_county_id
    AND parcel_id = p_parcel_id
    AND (tax_year = p_tax_year OR tax_year IS NULL)
  RETURNING id INTO v_property_id;

  -- If no record was updated, insert new one
  IF v_property_id IS NULL THEN
    INSERT INTO properties (
      county_id, document_id, parcel_id, property_address,
      owner_name, tax_amount, total_due, tax_year,
      sale_type, sale_date, raw_text, parsing_confidence
    )
    VALUES (
      p_county_id, p_document_id, p_parcel_id, p_property_address,
      p_owner_name, p_tax_amount, p_total_due, p_tax_year,
      p_sale_type, p_sale_date, p_raw_text, p_confidence
    )
    RETURNING id INTO v_property_id;
  END IF;

  RETURN v_property_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Properties with County Info
-- ============================================================================
CREATE OR REPLACE VIEW vw_properties_complete AS
SELECT
  p.*,
  c.county_name,
  c.state_code,
  d.title as source_document,
  d.url as source_url
FROM properties p
JOIN counties c ON c.id = p.county_id
LEFT JOIN documents d ON d.id = p.document_id;

-- ============================================================================
-- VIEW: Parsing Job Summary
-- ============================================================================
CREATE OR REPLACE VIEW vw_parsing_summary AS
SELECT
  c.county_name,
  c.state_code,
  d.title as document_title,
  pj.status,
  pj.properties_extracted,
  pj.properties_failed,
  pj.parser_used,
  pj.confidence_avg,
  pj.started_at,
  pj.completed_at,
  pj.error_message
FROM parsing_jobs pj
JOIN documents d ON d.id = pj.document_id
JOIN counties c ON c.id = d.county_id
ORDER BY pj.created_at DESC;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Get unparsed documents for Blair County
/*
SELECT * FROM get_unparsed_documents(
  (SELECT id FROM counties WHERE county_name = 'Blair' AND state_code = 'PA'),
  'property_list',
  5
);
*/

-- Example 2: Create parsing job
/*
DO $$
DECLARE
  v_job_id UUID;
  v_document_id UUID;
BEGIN
  -- Get first unparsed document
  SELECT document_id INTO v_document_id
  FROM get_unparsed_documents(NULL, 'property_list', 1)
  LIMIT 1;

  -- Create parsing job
  SELECT create_parsing_job(v_document_id) INTO v_job_id;

  RAISE NOTICE 'Created job: %', v_job_id;
END $$;
*/

-- Example 3: Insert property from parsed PDF
/*
SELECT upsert_property(
  (SELECT id FROM counties WHERE county_name = 'Blair' AND state_code = 'PA'),
  (SELECT id FROM documents WHERE title LIKE '%Repository%' LIMIT 1),
  '123-456-789',
  '123 Main St, Altoona, PA 16601',
  'John Doe',
  1250.50,
  1575.75,
  2025,
  'repository',
  '2026-03-11 10:00:00',
  'Raw text from PDF line...',
  0.92
);
*/

-- Example 4: Complete parsing job
/*
SELECT complete_parsing_job(
  'job-uuid-here',
  568,  -- properties extracted
  5,    -- properties failed
  'pdf_plumber',
  0.89  -- average confidence
);
*/

-- Example 5: Query all properties for a county
/*
SELECT * FROM vw_properties_complete
WHERE county_name = 'Blair' AND state_code = 'PA'
ORDER BY total_due DESC;
*/
