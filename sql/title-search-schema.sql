-- Title Search & Lien Research Tables - Agent 5
-- Stores title search results, liens, deed chains, and title issues
-- Integrated with property pipeline for pre-bid due diligence

-- ============================================================================
-- TABLE: title_searches
-- Stores comprehensive title search results for properties
-- ============================================================================
CREATE TABLE IF NOT EXISTS title_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Search Status
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed
  search_date TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  searched_by TEXT, -- Agent, manual, API provider

  -- Search Sources
  county_recorder_searched BOOLEAN DEFAULT FALSE,
  pacer_searched BOOLEAN DEFAULT FALSE,
  state_courts_searched BOOLEAN DEFAULT FALSE,
  title_company_used TEXT, -- AttomData, DataTrace, Stewart, etc.

  -- Title Quality Assessment
  title_quality TEXT, -- clear, clouded, defective, unmarketable
  marketability_score NUMERIC(3,2), -- 0.00 to 1.00
  insurable BOOLEAN DEFAULT TRUE,

  -- Lien Summary
  total_liens_found INTEGER DEFAULT 0,
  surviving_liens_count INTEGER DEFAULT 0,
  surviving_liens_total NUMERIC(12,2) DEFAULT 0,
  wiped_liens_total NUMERIC(12,2) DEFAULT 0,

  -- Deed Chain
  chain_complete BOOLEAN DEFAULT FALSE,
  chain_years_back INTEGER, -- How far back we traced
  chain_issues_found INTEGER DEFAULT 0,

  -- Title Risk
  title_risk_score NUMERIC(3,2), -- 0.00 (high risk) to 1.00 (clear title)
  title_recommendation TEXT, -- PROCEED, CAUTION, DO_NOT_BID

  -- Cost Estimates
  title_cure_cost NUMERIC(12,2), -- Estimated cost to clear title
  title_insurance_cost NUMERIC(12,2),
  quiet_title_needed BOOLEAN DEFAULT FALSE,
  quiet_title_cost NUMERIC(12,2),

  -- Notes
  search_notes TEXT,
  attorney_review_needed BOOLEAN DEFAULT FALSE,

  -- Metadata
  raw_search_data JSONB, -- Store raw API responses
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_title_search_per_property UNIQUE (property_id)
);

-- Indexes for performance
CREATE INDEX idx_title_searches_property ON title_searches(property_id);
CREATE INDEX idx_title_searches_status ON title_searches(status);
CREATE INDEX idx_title_searches_recommendation ON title_searches(title_recommendation);
CREATE INDEX idx_title_searches_date ON title_searches(search_date);
CREATE INDEX idx_title_searches_risk_score ON title_searches(title_risk_score);

-- ============================================================================
-- TABLE: liens
-- Stores individual liens found during title search
-- ============================================================================
CREATE TABLE IF NOT EXISTS liens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_search_id UUID NOT NULL REFERENCES title_searches(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Lien Details
  lien_type TEXT NOT NULL, -- IRS_tax, state_tax, mortgage, judgment, mechanic, HOA, municipal, EPA
  lien_holder TEXT NOT NULL,
  lien_amount NUMERIC(12,2),

  -- Recording Information
  filing_date DATE,
  recording_date DATE,
  recording_reference TEXT, -- Book/Page or Document Number
  recording_office TEXT, -- County Recorder, PACER, State Court

  -- Lien Priority
  lien_priority INTEGER, -- 1st, 2nd, 3rd position
  senior_to_tax_lien BOOLEAN DEFAULT FALSE,

  -- Survivability (CRITICAL!)
  survives_tax_sale BOOLEAN NOT NULL,
  survivability_basis TEXT, -- state_law, federal_supremacy, priority, special_statute
  survivability_confidence TEXT DEFAULT 'certain', -- certain, probable, uncertain

  -- Status
  lien_status TEXT DEFAULT 'active', -- active, released, expired, paid
  release_date DATE,
  release_document TEXT,

  -- Payoff Information
  current_balance NUMERIC(12,2),
  accrued_interest NUMERIC(12,2),
  payoff_amount NUMERIC(12,2), -- Total to clear lien
  payoff_quote_date DATE,

  -- Legal Details
  case_number TEXT,
  court_jurisdiction TEXT,
  judgment_date DATE,

  -- Notes
  lien_notes TEXT,
  action_required TEXT, -- pay_before_bid, negotiate_release, attorney_review

  -- Metadata
  raw_lien_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_liens_title_search ON liens(title_search_id);
CREATE INDEX idx_liens_property ON liens(property_id);
CREATE INDEX idx_liens_type ON liens(lien_type);
CREATE INDEX idx_liens_survives ON liens(survives_tax_sale);
CREATE INDEX idx_liens_status ON liens(lien_status);
CREATE INDEX idx_liens_holder ON liens(lien_holder);

-- ============================================================================
-- TABLE: deed_chain
-- Stores deed transfer history for chain of title analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS deed_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_search_id UUID NOT NULL REFERENCES title_searches(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Transfer Details
  transfer_date DATE NOT NULL,
  grantor TEXT NOT NULL, -- Seller/Prior owner
  grantee TEXT NOT NULL, -- Buyer/New owner

  -- Deed Information
  deed_type TEXT, -- warranty, quitclaim, executor, trustee, sheriff, tax_deed
  deed_instrument_number TEXT,
  recording_reference TEXT, -- Book/Page or Document Number
  recording_date DATE,

  -- Financial Details
  consideration NUMERIC(12,2), -- Sale price
  transfer_tax_paid NUMERIC(10,2),

  -- Legal Status
  deed_valid BOOLEAN DEFAULT TRUE,
  validation_notes TEXT,

  -- Chain Position
  chain_position INTEGER, -- 1 = current owner, 2 = previous, etc.
  is_current_owner BOOLEAN DEFAULT FALSE,
  years_owned NUMERIC(5,2),

  -- Red Flags
  has_issues BOOLEAN DEFAULT FALSE,
  issue_description TEXT,
  issue_severity TEXT, -- minor, moderate, severe, critical

  -- Metadata
  raw_deed_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_deed_chain_title_search ON deed_chain(title_search_id);
CREATE INDEX idx_deed_chain_property ON deed_chain(property_id);
CREATE INDEX idx_deed_chain_position ON deed_chain(chain_position);
CREATE INDEX idx_deed_chain_current_owner ON deed_chain(is_current_owner);
CREATE INDEX idx_deed_chain_date ON deed_chain(transfer_date);

-- ============================================================================
-- TABLE: title_issues
-- Stores identified title defects, clouds, and concerns
-- ============================================================================
CREATE TABLE IF NOT EXISTS title_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_search_id UUID NOT NULL REFERENCES title_searches(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Issue Classification
  issue_type TEXT NOT NULL, -- easement, encroachment, boundary_dispute, chain_gap, forged_deed, missing_probate, tax_sale_defect, adverse_possession, cloud_on_title
  issue_category TEXT, -- encumbrance, defect, cloud, pending_litigation

  -- Description
  issue_description TEXT NOT NULL,
  issue_discovered_date DATE DEFAULT CURRENT_DATE,
  issue_source TEXT, -- deed_search, survey, court_records, title_exam

  -- Severity Assessment
  severity TEXT NOT NULL, -- minor, moderate, severe, critical
  affects_marketability BOOLEAN DEFAULT TRUE,
  prevents_sale BOOLEAN DEFAULT FALSE,
  prevents_financing BOOLEAN DEFAULT FALSE,

  -- Resolution
  resolution_required BOOLEAN DEFAULT TRUE,
  resolution_method TEXT, -- quiet_title, boundary_agreement, release, correction_deed, probate
  resolution_cost NUMERIC(12,2),
  resolution_time TEXT, -- days, weeks, months, years
  resolution_probability TEXT DEFAULT 'uncertain', -- certain, probable, uncertain, unlikely

  -- Legal Action
  attorney_required BOOLEAN DEFAULT FALSE,
  litigation_risk TEXT DEFAULT 'low', -- low, medium, high

  -- Status
  issue_status TEXT DEFAULT 'unresolved', -- unresolved, in_progress, resolved, waived
  resolution_date DATE,
  resolution_notes TEXT,

  -- Impact on Investment
  impact_on_value NUMERIC(12,2), -- Estimated value reduction
  deal_breaker BOOLEAN DEFAULT FALSE,

  -- Metadata
  raw_issue_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_title_issues_title_search ON title_issues(title_search_id);
CREATE INDEX idx_title_issues_property ON title_issues(property_id);
CREATE INDEX idx_title_issues_type ON title_issues(issue_type);
CREATE INDEX idx_title_issues_severity ON title_issues(severity);
CREATE INDEX idx_title_issues_status ON title_issues(issue_status);
CREATE INDEX idx_title_issues_deal_breaker ON title_issues(deal_breaker);

-- ============================================================================
-- HELPER FUNCTION: Get Properties Needing Title Search
-- Returns properties that are ready for title research
-- ============================================================================
CREATE OR REPLACE FUNCTION get_properties_needing_title_search(
  p_county_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  property_id UUID,
  county_name TEXT,
  state_code TEXT,
  parcel_id TEXT,
  property_address TEXT,
  total_due NUMERIC,
  sale_date TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    c.county_name,
    c.state_code,
    p.parcel_id,
    p.property_address,
    p.total_due,
    p.sale_date
  FROM properties p
  JOIN counties c ON c.id = p.county_id
  LEFT JOIN title_searches ts ON ts.property_id = p.id AND ts.status = 'completed'
  WHERE
    (p_county_id IS NULL OR p.county_id = p_county_id)
    AND ts.id IS NULL -- No completed title search yet
    AND p.sale_status = 'upcoming'
  ORDER BY p.sale_date ASC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Upsert Title Search
-- Insert or update title search record
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_title_search(
  p_property_id UUID,
  p_status TEXT DEFAULT 'pending',
  p_title_quality TEXT DEFAULT NULL,
  p_marketability_score NUMERIC DEFAULT NULL,
  p_insurable BOOLEAN DEFAULT TRUE,
  p_surviving_liens_total NUMERIC DEFAULT 0,
  p_title_risk_score NUMERIC DEFAULT NULL,
  p_title_recommendation TEXT DEFAULT NULL,
  p_search_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_title_search_id UUID;
BEGIN
  -- Try to update existing record
  UPDATE title_searches
  SET
    status = p_status,
    title_quality = COALESCE(p_title_quality, title_quality),
    marketability_score = COALESCE(p_marketability_score, marketability_score),
    insurable = p_insurable,
    surviving_liens_total = p_surviving_liens_total,
    title_risk_score = COALESCE(p_title_risk_score, title_risk_score),
    title_recommendation = COALESCE(p_title_recommendation, title_recommendation),
    search_notes = COALESCE(p_search_notes, search_notes),
    updated_at = NOW(),
    completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE completed_at END
  WHERE property_id = p_property_id
  RETURNING id INTO v_title_search_id;

  -- If no record existed, insert new one
  IF v_title_search_id IS NULL THEN
    INSERT INTO title_searches (
      property_id,
      status,
      title_quality,
      marketability_score,
      insurable,
      surviving_liens_total,
      title_risk_score,
      title_recommendation,
      search_notes
    ) VALUES (
      p_property_id,
      p_status,
      p_title_quality,
      p_marketability_score,
      p_insurable,
      p_surviving_liens_total,
      p_title_risk_score,
      p_title_recommendation,
      p_search_notes
    )
    RETURNING id INTO v_title_search_id;
  END IF;

  RETURN v_title_search_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Upsert Lien
-- Insert or update lien record
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_lien(
  p_title_search_id UUID,
  p_property_id UUID,
  p_lien_type TEXT,
  p_lien_holder TEXT,
  p_lien_amount NUMERIC,
  p_survives_tax_sale BOOLEAN,
  p_filing_date DATE DEFAULT NULL,
  p_recording_reference TEXT DEFAULT NULL,
  p_lien_status TEXT DEFAULT 'active',
  p_survivability_basis TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_lien_id UUID;
BEGIN
  -- Try to find existing lien by recording reference or unique combination
  SELECT id INTO v_lien_id
  FROM liens
  WHERE title_search_id = p_title_search_id
    AND (
      (p_recording_reference IS NOT NULL AND recording_reference = p_recording_reference)
      OR (lien_holder = p_lien_holder AND lien_type = p_lien_type AND filing_date = p_filing_date)
    )
  LIMIT 1;

  IF v_lien_id IS NOT NULL THEN
    -- Update existing lien
    UPDATE liens
    SET
      lien_amount = p_lien_amount,
      survives_tax_sale = p_survives_tax_sale,
      lien_status = p_lien_status,
      survivability_basis = COALESCE(p_survivability_basis, survivability_basis),
      updated_at = NOW()
    WHERE id = v_lien_id;
  ELSE
    -- Insert new lien
    INSERT INTO liens (
      title_search_id,
      property_id,
      lien_type,
      lien_holder,
      lien_amount,
      survives_tax_sale,
      filing_date,
      recording_reference,
      lien_status,
      survivability_basis
    ) VALUES (
      p_title_search_id,
      p_property_id,
      p_lien_type,
      p_lien_holder,
      p_lien_amount,
      p_survives_tax_sale,
      p_filing_date,
      p_recording_reference,
      p_lien_status,
      p_survivability_basis
    )
    RETURNING id INTO v_lien_id;
  END IF;

  RETURN v_lien_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Calculate Title Risk Score
-- Automated title risk scoring algorithm
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_title_risk_score(
  p_title_search_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_score NUMERIC := 1.0; -- Start with perfect score
  v_surviving_liens_total NUMERIC;
  v_surviving_liens_count INTEGER;
  v_critical_issues INTEGER;
  v_severe_issues INTEGER;
  v_chain_issues INTEGER;
BEGIN
  -- Get title search data
  SELECT
    surviving_liens_total,
    surviving_liens_count,
    chain_issues_found
  INTO
    v_surviving_liens_total,
    v_surviving_liens_count,
    v_chain_issues
  FROM title_searches
  WHERE id = p_title_search_id;

  -- Count critical and severe issues
  SELECT
    COUNT(*) FILTER (WHERE severity = 'critical'),
    COUNT(*) FILTER (WHERE severity = 'severe')
  INTO
    v_critical_issues,
    v_severe_issues
  FROM title_issues
  WHERE title_search_id = p_title_search_id;

  -- Apply scoring penalties

  -- Surviving liens (weight: 0.50)
  IF v_surviving_liens_total > 0 THEN
    v_score := v_score - 0.50;
  END IF;

  -- Critical issues (weight: 0.20 each)
  IF v_critical_issues > 0 THEN
    v_score := v_score - (0.20 * v_critical_issues);
  END IF;

  -- Severe issues (weight: 0.10 each)
  IF v_severe_issues > 0 THEN
    v_score := v_score - (0.10 * v_severe_issues);
  END IF;

  -- Chain issues (weight: 0.15)
  IF v_chain_issues > 0 THEN
    v_score := v_score - 0.15;
  END IF;

  -- Ensure score stays within bounds
  IF v_score < 0 THEN
    v_score := 0;
  END IF;

  -- Update the title search record
  UPDATE title_searches
  SET
    title_risk_score = v_score,
    updated_at = NOW()
  WHERE id = p_title_search_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Complete Title Search
-- Mark title search as complete and calculate final scores
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_title_search(
  p_title_search_id UUID,
  p_title_recommendation TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_surviving_total NUMERIC;
  v_surviving_count INTEGER;
  v_total_liens INTEGER;
BEGIN
  -- Calculate surviving liens summary
  SELECT
    COALESCE(SUM(lien_amount) FILTER (WHERE survives_tax_sale = TRUE), 0),
    COUNT(*) FILTER (WHERE survives_tax_sale = TRUE),
    COUNT(*)
  INTO
    v_surviving_total,
    v_surviving_count,
    v_total_liens
  FROM liens
  WHERE title_search_id = p_title_search_id;

  -- Update title search record
  UPDATE title_searches
  SET
    status = 'completed',
    completed_at = NOW(),
    total_liens_found = v_total_liens,
    surviving_liens_count = v_surviving_count,
    surviving_liens_total = v_surviving_total,
    title_recommendation = COALESCE(p_title_recommendation, title_recommendation),
    updated_at = NOW()
  WHERE id = p_title_search_id;

  -- Calculate risk score
  PERFORM calculate_title_risk_score(p_title_search_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Title Search Summary
-- Comprehensive overview of all title searches
-- ============================================================================
CREATE OR REPLACE VIEW vw_title_search_summary AS
SELECT
  ts.id AS title_search_id,
  ts.property_id,
  p.parcel_id,
  p.property_address,
  c.county_name,
  c.state_code,
  ts.status,
  ts.search_date,
  ts.title_quality,
  ts.marketability_score,
  ts.insurable,
  ts.total_liens_found,
  ts.surviving_liens_count,
  ts.surviving_liens_total,
  ts.title_risk_score,
  ts.title_recommendation,
  ts.title_cure_cost,
  ts.attorney_review_needed,
  COUNT(ti.id) AS total_issues,
  COUNT(ti.id) FILTER (WHERE ti.severity IN ('critical', 'severe')) AS serious_issues,
  p.total_due,
  p.sale_date
FROM title_searches ts
JOIN properties p ON p.id = ts.property_id
JOIN counties c ON c.id = p.county_id
LEFT JOIN title_issues ti ON ti.title_search_id = ts.id
GROUP BY
  ts.id, ts.property_id, p.parcel_id, p.property_address,
  c.county_name, c.state_code, p.total_due, p.sale_date
ORDER BY ts.search_date DESC;

-- ============================================================================
-- VIEW: Properties with Title Data
-- Properties with completed title searches
-- ============================================================================
CREATE OR REPLACE VIEW vw_properties_with_title_data AS
SELECT
  p.id AS property_id,
  p.parcel_id,
  p.property_address,
  p.city,
  p.state_code,
  c.county_name,
  p.total_due,
  p.sale_date,
  ts.title_quality,
  ts.marketability_score,
  ts.surviving_liens_total,
  ts.title_risk_score,
  ts.title_recommendation,
  ts.insurable,
  CASE
    WHEN ts.surviving_liens_total > 0 THEN TRUE
    ELSE FALSE
  END AS has_surviving_liens,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM title_issues ti
      WHERE ti.property_id = p.id
      AND ti.severity IN ('critical', 'severe')
    ) THEN TRUE
    ELSE FALSE
  END AS has_serious_issues
FROM properties p
JOIN counties c ON c.id = p.county_id
LEFT JOIN title_searches ts ON ts.property_id = p.id AND ts.status = 'completed'
WHERE ts.id IS NOT NULL;

-- ============================================================================
-- VIEW: Surviving Liens Report
-- All liens that survive tax sale (CRITICAL for bidding decisions)
-- ============================================================================
CREATE OR REPLACE VIEW vw_surviving_liens AS
SELECT
  l.id AS lien_id,
  l.property_id,
  p.parcel_id,
  p.property_address,
  c.county_name,
  c.state_code,
  l.lien_type,
  l.lien_holder,
  l.lien_amount,
  l.filing_date,
  l.lien_status,
  l.survives_tax_sale,
  l.survivability_basis,
  l.survivability_confidence,
  l.payoff_amount,
  l.action_required,
  ts.title_recommendation,
  p.total_due,
  p.sale_date
FROM liens l
JOIN properties p ON p.id = l.property_id
JOIN counties c ON c.id = p.county_id
JOIN title_searches ts ON ts.id = l.title_search_id
WHERE l.survives_tax_sale = TRUE
  AND l.lien_status = 'active'
ORDER BY l.lien_amount DESC;

-- ============================================================================
-- VIEW: Title Issues Report
-- All title defects and concerns
-- ============================================================================
CREATE OR REPLACE VIEW vw_title_issues_report AS
SELECT
  ti.id AS issue_id,
  ti.property_id,
  p.parcel_id,
  p.property_address,
  c.county_name,
  c.state_code,
  ti.issue_type,
  ti.issue_description,
  ti.severity,
  ti.affects_marketability,
  ti.prevents_sale,
  ti.resolution_required,
  ti.resolution_cost,
  ti.resolution_time,
  ti.attorney_required,
  ti.deal_breaker,
  ti.issue_status,
  ts.title_recommendation,
  p.total_due,
  p.sale_date
FROM title_issues ti
JOIN properties p ON p.id = ti.property_id
JOIN counties c ON c.id = p.county_id
JOIN title_searches ts ON ts.id = ti.title_search_id
WHERE ti.issue_status = 'unresolved'
ORDER BY
  CASE ti.severity
    WHEN 'critical' THEN 1
    WHEN 'severe' THEN 2
    WHEN 'moderate' THEN 3
    ELSE 4
  END,
  ti.created_at DESC;
