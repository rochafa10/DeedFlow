-- Tax Auction Database - UPSERT Functions for Duplicate Prevention
-- This prevents duplicates when re-researching counties

-- ============================================================================
-- HELPER FUNCTION: Upsert Official Link
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_official_link(
  p_county_id UUID,
  p_link_type TEXT,
  p_url TEXT,
  p_title TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_link_id UUID;
BEGIN
  -- Try to update existing record
  UPDATE official_links
  SET
    title = COALESCE(p_title, title),
    phone = COALESCE(p_phone, phone),
    email = COALESCE(p_email, email),
    updated_at = NOW()
  WHERE county_id = p_county_id
    AND (url = p_url OR (link_type = p_link_type AND title = p_title))
  RETURNING id INTO v_link_id;

  -- If no record was updated, insert new one
  IF v_link_id IS NULL THEN
    INSERT INTO official_links (county_id, link_type, url, title, phone, email)
    VALUES (p_county_id, p_link_type, p_url, p_title, p_phone, p_email)
    RETURNING id INTO v_link_id;
  END IF;

  RETURN v_link_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Upsert Upcoming Sale
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_upcoming_sale(
  p_county_id UUID,
  p_sale_type TEXT,
  p_sale_date TIMESTAMP,
  p_registration_deadline TIMESTAMP DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_deposit_required NUMERIC DEFAULT NULL,
  p_property_count INTEGER DEFAULT NULL,
  p_sale_location TEXT DEFAULT NULL,
  p_bidding_method TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
BEGIN
  -- Try to update existing record (match by county + sale_type + date within 7 days)
  UPDATE upcoming_sales
  SET
    sale_date = p_sale_date,
    registration_deadline = COALESCE(p_registration_deadline, registration_deadline),
    platform = COALESCE(p_platform, platform),
    deposit_required = COALESCE(p_deposit_required, deposit_required),
    property_count = COALESCE(p_property_count, property_count),
    sale_location = COALESCE(p_sale_location, sale_location),
    bidding_method = COALESCE(p_bidding_method, bidding_method),
    updated_at = NOW()
  WHERE county_id = p_county_id
    AND sale_type = p_sale_type
    AND ABS(EXTRACT(EPOCH FROM (sale_date - p_sale_date))) < 604800 -- Within 7 days
  RETURNING id INTO v_sale_id;

  -- If no record was updated, insert new one
  IF v_sale_id IS NULL THEN
    INSERT INTO upcoming_sales (
      county_id, sale_type, sale_date, registration_deadline,
      platform, deposit_required, property_count, sale_location, bidding_method
    )
    VALUES (
      p_county_id, p_sale_type, p_sale_date, p_registration_deadline,
      p_platform, p_deposit_required, p_property_count, p_sale_location, p_bidding_method
    )
    RETURNING id INTO v_sale_id;
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Upsert Document
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_document(
  p_county_id UUID,
  p_document_type TEXT,
  p_title TEXT,
  p_url TEXT,
  p_file_format TEXT DEFAULT 'pdf',
  p_publication_date DATE DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_property_count INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_document_id UUID;
BEGIN
  -- Try to update existing record (match by county + URL or county + title)
  UPDATE documents
  SET
    document_type = p_document_type,
    file_format = p_file_format,
    publication_date = COALESCE(p_publication_date, publication_date),
    year = COALESCE(p_year, year),
    property_count = COALESCE(p_property_count, property_count),
    updated_at = NOW()
  WHERE county_id = p_county_id
    AND (url = p_url OR title = p_title)
  RETURNING id INTO v_document_id;

  -- If no record was updated, insert new one
  IF v_document_id IS NULL THEN
    INSERT INTO documents (
      county_id, document_type, title, url, file_format,
      publication_date, year, property_count
    )
    VALUES (
      p_county_id, p_document_type, p_title, p_url, p_file_format,
      p_publication_date, p_year, p_property_count
    )
    RETURNING id INTO v_document_id;
  END IF;

  RETURN v_document_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Upsert Vendor Portal
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_vendor_portal(
  p_county_id UUID,
  p_vendor_name TEXT,
  p_county_specific_url TEXT DEFAULT NULL,
  p_registration_url TEXT DEFAULT NULL,
  p_is_primary BOOLEAN DEFAULT TRUE
) RETURNS UUID AS $$
DECLARE
  v_vendor_id UUID;
BEGIN
  -- Try to update existing record
  UPDATE vendor_portals
  SET
    county_specific_url = COALESCE(p_county_specific_url, county_specific_url),
    registration_url = COALESCE(p_registration_url, registration_url),
    is_primary = p_is_primary,
    updated_at = NOW()
  WHERE county_id = p_county_id
    AND vendor_name = p_vendor_name
  RETURNING id INTO v_vendor_id;

  -- If no record was updated, insert new one
  IF v_vendor_id IS NULL THEN
    INSERT INTO vendor_portals (
      county_id, vendor_name, county_specific_url, registration_url, is_primary
    )
    VALUES (
      p_county_id, p_vendor_name, p_county_specific_url, p_registration_url, p_is_primary
    )
    RETURNING id INTO v_vendor_id;
  END IF;

  RETURN v_vendor_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Upsert Additional Resource
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_additional_resource(
  p_county_id UUID,
  p_resource_type TEXT,
  p_title TEXT,
  p_url TEXT
) RETURNS UUID AS $$
DECLARE
  v_resource_id UUID;
BEGIN
  -- Try to update existing record
  UPDATE additional_resources
  SET
    title = p_title,
    updated_at = NOW()
  WHERE county_id = p_county_id
    AND (url = p_url OR (resource_type = p_resource_type AND title = p_title))
  RETURNING id INTO v_resource_id;

  -- If no record was updated, insert new one
  IF v_resource_id IS NULL THEN
    INSERT INTO additional_resources (county_id, resource_type, title, url)
    VALUES (p_county_id, p_resource_type, p_title, p_url)
    RETURNING id INTO v_resource_id;
  END IF;

  RETURN v_resource_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Upsert Important Note
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_important_note(
  p_county_id UUID,
  p_note_type TEXT,
  p_note_text TEXT,
  p_priority INTEGER DEFAULT 5
) RETURNS UUID AS $$
DECLARE
  v_note_id UUID;
BEGIN
  -- Try to update existing record (match by county + note_type + similar text)
  UPDATE important_notes
  SET
    note_text = p_note_text,
    priority = p_priority,
    updated_at = NOW()
  WHERE county_id = p_county_id
    AND note_type = p_note_type
    AND similarity(note_text, p_note_text) > 0.7 -- 70% similarity
  RETURNING id INTO v_note_id;

  -- If no record was updated, insert new one
  IF v_note_id IS NULL THEN
    INSERT INTO important_notes (county_id, note_type, note_text, priority)
    VALUES (p_county_id, p_note_type, p_note_text, p_priority)
    RETURNING id INTO v_note_id;
  END IF;

  RETURN v_note_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ENHANCED FUNCTION: Smart County Refresh
-- This deletes old/stale data before inserting new research
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_county_research(
  p_county_id UUID,
  p_keep_documents BOOLEAN DEFAULT TRUE,
  p_keep_notes BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
  -- Always delete old sales (they become historical)
  DELETE FROM upcoming_sales
  WHERE county_id = p_county_id
    AND sale_date < NOW() - INTERVAL '30 days';

  -- Update or delete official links (keep most recent)
  -- This is handled by UPSERT functions

  -- Optionally delete old documents
  IF NOT p_keep_documents THEN
    DELETE FROM documents
    WHERE county_id = p_county_id
      AND updated_at < NOW() - INTERVAL '90 days';
  END IF;

  -- Optionally delete old notes
  IF NOT p_keep_notes THEN
    DELETE FROM important_notes
    WHERE county_id = p_county_id;
  END IF;

  -- Update county timestamp
  UPDATE counties
  SET last_researched_at = NOW()
  WHERE id = p_county_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Clean Duplicate Records (Run Periodically)
-- ============================================================================
CREATE OR REPLACE FUNCTION clean_duplicate_records() RETURNS TABLE(
  table_name TEXT,
  duplicates_removed INTEGER
) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Clean duplicate official_links (keep most recent)
  WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY county_id, url ORDER BY updated_at DESC
    ) as rn
    FROM official_links
  )
  DELETE FROM official_links
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'official_links'::TEXT, v_count;

  -- Clean duplicate documents (keep most recent)
  WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY county_id, url ORDER BY updated_at DESC
    ) as rn
    FROM documents
  )
  DELETE FROM documents
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'documents'::TEXT, v_count;

  -- Clean duplicate vendor_portals (keep most recent)
  WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY county_id, vendor_name ORDER BY updated_at DESC
    ) as rn
    FROM vendor_portals
  )
  DELETE FROM vendor_portals
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'vendor_portals'::TEXT, v_count;

  -- Clean duplicate additional_resources (keep most recent)
  WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY county_id, url ORDER BY updated_at DESC
    ) as rn
    FROM additional_resources
  )
  DELETE FROM additional_resources
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'additional_resources'::TEXT, v_count;

  -- Clean very similar important_notes (keep highest priority)
  WITH duplicates AS (
    SELECT DISTINCT ON (county_id, note_type, LEFT(note_text, 50))
      id,
      ROW_NUMBER() OVER (
        PARTITION BY county_id, note_type, LEFT(note_text, 50)
        ORDER BY priority DESC, updated_at DESC
      ) as rn
    FROM important_notes
  )
  DELETE FROM important_notes
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'important_notes'::TEXT, v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Enable similarity extension for fuzzy matching
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Upsert official link (updates if exists, inserts if new)
/*
SELECT upsert_official_link(
  (SELECT id FROM counties WHERE county_name = 'Blair' AND state_code = 'PA'),
  'tax_claim_bureau',
  'https://blairco.org/tax-claim',
  'Blair County Tax Claim Bureau',
  '814-317-2361',
  'taxclaim@blairco.org'
);
*/

-- Example 2: Upsert upcoming sale
/*
SELECT upsert_upcoming_sale(
  (SELECT id FROM counties WHERE county_name = 'Blair' AND state_code = 'PA'),
  'repository',
  '2026-03-11 10:00:00',
  '2026-02-25 16:00:00',
  'Bid4Assets',
  10000,
  568,
  'Online',
  'online'
);
*/

-- Example 3: Refresh county before new research
/*
SELECT refresh_county_research(
  (SELECT id FROM counties WHERE county_name = 'Blair' AND state_code = 'PA'),
  TRUE,  -- Keep documents
  FALSE  -- Delete old notes (will get new ones)
);
*/

-- Example 4: Clean duplicates across all tables
/*
SELECT * FROM clean_duplicate_records();
*/

-- Example 5: Check for potential duplicates before cleaning
/*
-- Find duplicate documents
SELECT county_id, url, COUNT(*) as count
FROM documents
GROUP BY county_id, url
HAVING COUNT(*) > 1;

-- Find duplicate official links
SELECT county_id, url, COUNT(*) as count
FROM official_links
GROUP BY county_id, url
HAVING COUNT(*) > 1;
*/

-- ============================================================================
-- QUERY FUNCTION: Get Upcoming Deadlines
-- Returns upcoming auction sales and registration deadlines
-- ============================================================================
CREATE OR REPLACE FUNCTION get_upcoming_deadlines(
  p_days_ahead INTEGER DEFAULT 30
) RETURNS TABLE(
  deadline_type TEXT,
  deadline_date TIMESTAMP,
  days_until_deadline INTEGER,
  county_name TEXT,
  state_code TEXT,
  sale_type TEXT,
  sale_date TIMESTAMP,
  platform TEXT,
  deposit_required NUMERIC,
  property_count INTEGER,
  sale_location TEXT,
  county_id UUID,
  sale_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH deadline_data AS (
    -- Registration deadlines
    SELECT
      'registration_deadline'::TEXT as deadline_type,
      us.registration_deadline as deadline_date,
      EXTRACT(DAY FROM (us.registration_deadline - NOW()))::INTEGER as days_until,
      c.county_name,
      c.state_code,
      us.sale_type,
      us.sale_date,
      us.platform,
      us.deposit_required,
      us.property_count,
      us.sale_location,
      us.county_id,
      us.id as sale_id
    FROM upcoming_sales us
    JOIN counties c ON c.id = us.county_id
    WHERE us.registration_deadline IS NOT NULL
      AND us.registration_deadline > NOW()
      AND us.registration_deadline <= NOW() + (p_days_ahead || ' days')::INTERVAL

    UNION ALL

    -- Sale dates
    SELECT
      'sale_date'::TEXT as deadline_type,
      us.sale_date as deadline_date,
      EXTRACT(DAY FROM (us.sale_date - NOW()))::INTEGER as days_until,
      c.county_name,
      c.state_code,
      us.sale_type,
      us.sale_date,
      us.platform,
      us.deposit_required,
      us.property_count,
      us.sale_location,
      us.county_id,
      us.id as sale_id
    FROM upcoming_sales us
    JOIN counties c ON c.id = us.county_id
    WHERE us.sale_date > NOW()
      AND us.sale_date <= NOW() + (p_days_ahead || ' days')::INTERVAL
  )
  SELECT
    dd.deadline_type,
    dd.deadline_date,
    dd.days_until as days_until_deadline,
    dd.county_name,
    dd.state_code,
    dd.sale_type,
    dd.sale_date,
    dd.platform,
    dd.deposit_required,
    dd.property_count,
    dd.sale_location,
    dd.county_id,
    dd.sale_id
  FROM deadline_data dd
  ORDER BY dd.deadline_date ASC, dd.deadline_type DESC;
END;
$$ LANGUAGE plpgsql;
