-- ============================================================================
-- MIGRATION: Update Work Queue Functions and Views for Auction Status
-- Description: Updates all work queue views and functions to filter by
--              auction_status = 'active' only, preventing agents from
--              processing expired auction properties.
-- Created: 2026-01-25
--
-- This migration:
--   1. Updates get_properties_needing_scraping() to filter active only
--   2. Creates vw_work_queue_regrid view with active filter
--   3. Creates vw_work_queue_visual_validation view with active filter
--   4. Creates vw_work_queue_screenshots view with active filter
--   5. Creates vw_work_queue_property_analysis view with active filter
--   6. Creates get_agent_work_queue() function with active filter
--   7. Creates get_agent_work_report() function with active filter
--
-- Dependencies: add_auction_status.sql must be run first
-- Safe to run multiple times (idempotent)
-- ============================================================================


-- ============================================================================
-- SECTION 1: Update Existing Function - get_properties_needing_scraping
-- ============================================================================

/**
 * get_properties_needing_scraping()
 *
 * Returns properties that need Regrid data scraping.
 * Updated to only return properties with auction_status = 'active'.
 *
 * Usage:
 *   SELECT * FROM get_properties_needing_scraping(county_uuid, 50);
 */
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
    AND p.auction_status = 'active'  -- Only active properties
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_properties_needing_scraping(UUID, INTEGER) IS
'Returns properties needing Regrid scraping. Only includes active properties (auction_status = ''active'').';


-- ============================================================================
-- SECTION 2: Create Work Queue Views
-- ============================================================================

/**
 * vw_work_queue_regrid
 *
 * View showing properties that need Regrid data scraping.
 * Only includes properties with auction_status = 'active'.
 * Assigned to: REGRID_SCRAPER agent
 */
CREATE OR REPLACE VIEW vw_work_queue_regrid AS
SELECT
  p.id AS property_id,
  p.parcel_id,
  p.property_address,
  p.county_id,
  c.county_name,
  c.state_code,
  p.sale_type,
  p.sale_date,
  p.auction_status,
  'Scrape Regrid data for property' AS task_description,
  'REGRID_SCRAPER' AS assigned_agent
FROM properties p
JOIN counties c ON c.id = p.county_id
LEFT JOIN regrid_data rd ON rd.property_id = p.id
WHERE rd.id IS NULL  -- No regrid data yet
  AND p.auction_status = 'active'  -- Only active properties
ORDER BY
  -- Prioritize properties with upcoming sale dates
  CASE WHEN p.sale_date IS NOT NULL THEN p.sale_date ELSE '9999-12-31'::TIMESTAMP END ASC,
  p.created_at DESC;

COMMENT ON VIEW vw_work_queue_regrid IS
'Properties needing Regrid scraping. Only active properties (excludes expired auctions). Assigned to REGRID_SCRAPER.';


/**
 * vw_work_queue_visual_validation
 *
 * View showing properties that have Regrid data but need visual validation.
 * Only includes properties with auction_status = 'active'.
 * Assigned to: VISUAL_VALIDATOR agent
 */
CREATE OR REPLACE VIEW vw_work_queue_visual_validation AS
SELECT
  p.id AS property_id,
  p.parcel_id,
  p.property_address,
  p.county_id,
  c.county_name,
  c.state_code,
  p.sale_type,
  p.sale_date,
  p.auction_status,
  rd.lot_size_acres,
  rd.land_use,
  'Validate property images and investability' AS task_description,
  'VISUAL_VALIDATOR' AS assigned_agent
FROM properties p
JOIN counties c ON c.id = p.county_id
JOIN regrid_data rd ON rd.property_id = p.id
LEFT JOIN property_visual_validation pvv ON pvv.property_id = p.id
WHERE pvv.id IS NULL  -- No visual validation yet
  AND p.auction_status = 'active'  -- Only active properties
ORDER BY
  -- Prioritize properties with upcoming sale dates
  CASE WHEN p.sale_date IS NOT NULL THEN p.sale_date ELSE '9999-12-31'::TIMESTAMP END ASC,
  p.created_at DESC;

COMMENT ON VIEW vw_work_queue_visual_validation IS
'Properties needing visual validation. Has Regrid data but no validation. Only active properties. Assigned to VISUAL_VALIDATOR.';


/**
 * vw_work_queue_screenshots
 *
 * View showing properties that have Regrid data but no screenshot.
 * Only includes properties with auction_status = 'active'.
 * Assigned to: REGRID_SCRAPER agent
 */
CREATE OR REPLACE VIEW vw_work_queue_screenshots AS
SELECT
  p.id AS property_id,
  p.parcel_id,
  p.property_address,
  p.county_id,
  c.county_name,
  c.state_code,
  p.sale_type,
  p.sale_date,
  p.auction_status,
  rd.id AS regrid_data_id,
  'Capture screenshot for property' AS task_description,
  'REGRID_SCRAPER' AS assigned_agent
FROM properties p
JOIN counties c ON c.id = p.county_id
JOIN regrid_data rd ON rd.property_id = p.id
LEFT JOIN regrid_screenshots rs ON rs.property_id = p.id
WHERE rs.id IS NULL  -- No screenshot yet
  AND p.auction_status = 'active'  -- Only active properties
ORDER BY
  -- Prioritize properties with upcoming sale dates
  CASE WHEN p.sale_date IS NOT NULL THEN p.sale_date ELSE '9999-12-31'::TIMESTAMP END ASC,
  p.created_at DESC;

COMMENT ON VIEW vw_work_queue_screenshots IS
'Properties needing screenshots. Has Regrid data but no screenshot. Only active properties. Assigned to REGRID_SCRAPER.';


/**
 * vw_work_queue_property_analysis
 *
 * View showing properties that have been visually validated as APPROVED
 * and are ready for property condition analysis.
 * Only includes properties with auction_status = 'active'.
 * Assigned to: PROPERTY_CONDITION_AGENT (Agent 6)
 */
CREATE OR REPLACE VIEW vw_work_queue_property_analysis AS
SELECT
  p.id AS property_id,
  p.parcel_id,
  p.property_address,
  p.county_id,
  c.county_name,
  c.state_code,
  p.sale_type,
  p.sale_date,
  p.total_due,
  p.auction_status,
  pvv.validation_status,
  pvv.confidence_score,
  rd.lot_size_acres,
  rd.building_sqft,
  rd.year_built,
  'Analyze property condition' AS task_description,
  'PROPERTY_CONDITION_AGENT' AS assigned_agent
FROM properties p
JOIN counties c ON c.id = p.county_id
JOIN regrid_data rd ON rd.property_id = p.id
JOIN property_visual_validation pvv ON pvv.property_id = p.id
WHERE pvv.validation_status = 'APPROVED'  -- Only approved properties
  AND p.auction_status = 'active'  -- Only active properties
  -- Add condition here to exclude properties already analyzed
  -- (when property_condition table exists, add: AND pc.id IS NULL)
ORDER BY
  -- Prioritize properties with upcoming sale dates
  CASE WHEN p.sale_date IS NOT NULL THEN p.sale_date ELSE '9999-12-31'::TIMESTAMP END ASC,
  pvv.confidence_score DESC,
  p.created_at DESC;

COMMENT ON VIEW vw_work_queue_property_analysis IS
'APPROVED properties ready for condition analysis. Only active properties. Assigned to PROPERTY_CONDITION_AGENT.';


-- ============================================================================
-- SECTION 3: Create get_agent_work_queue Function
-- ============================================================================

/**
 * get_agent_work_queue()
 *
 * Returns the work queue for a specific agent.
 * Only returns properties with auction_status = 'active'.
 *
 * Supported agents:
 *   - REGRID_SCRAPER: Properties needing Regrid data
 *   - VISUAL_VALIDATOR: Properties needing visual validation
 *   - PROPERTY_CONDITION_AGENT: Approved properties needing condition analysis
 *
 * Usage:
 *   SELECT * FROM get_agent_work_queue('REGRID_SCRAPER', 50);
 *   SELECT * FROM get_agent_work_queue('VISUAL_VALIDATOR', 100);
 */
CREATE OR REPLACE FUNCTION get_agent_work_queue(
  p_agent_name TEXT,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  property_id UUID,
  parcel_id TEXT,
  property_address TEXT,
  county_name TEXT,
  state_code TEXT,
  sale_type TEXT,
  sale_date TIMESTAMP,
  auction_status TEXT,
  task_description TEXT
) AS $$
BEGIN
  CASE p_agent_name
    -- Regrid Scraper: Properties needing Regrid data
    WHEN 'REGRID_SCRAPER' THEN
      RETURN QUERY
      SELECT
        p.id,
        p.parcel_id,
        p.property_address,
        c.county_name,
        c.state_code,
        p.sale_type,
        p.sale_date,
        p.auction_status,
        'Scrape Regrid data for property'::TEXT
      FROM properties p
      JOIN counties c ON c.id = p.county_id
      LEFT JOIN regrid_data rd ON rd.property_id = p.id
      WHERE rd.id IS NULL
        AND p.auction_status = 'active'
      ORDER BY
        CASE WHEN p.sale_date IS NOT NULL THEN p.sale_date ELSE '9999-12-31'::TIMESTAMP END ASC,
        p.created_at DESC
      LIMIT p_limit;

    -- Visual Validator: Properties with Regrid data but no validation
    WHEN 'VISUAL_VALIDATOR' THEN
      RETURN QUERY
      SELECT
        p.id,
        p.parcel_id,
        p.property_address,
        c.county_name,
        c.state_code,
        p.sale_type,
        p.sale_date,
        p.auction_status,
        'Validate property images and investability'::TEXT
      FROM properties p
      JOIN counties c ON c.id = p.county_id
      JOIN regrid_data rd ON rd.property_id = p.id
      LEFT JOIN property_visual_validation pvv ON pvv.property_id = p.id
      WHERE pvv.id IS NULL
        AND p.auction_status = 'active'
      ORDER BY
        CASE WHEN p.sale_date IS NOT NULL THEN p.sale_date ELSE '9999-12-31'::TIMESTAMP END ASC,
        p.created_at DESC
      LIMIT p_limit;

    -- Property Condition Agent: Approved properties needing analysis
    WHEN 'PROPERTY_CONDITION_AGENT' THEN
      RETURN QUERY
      SELECT
        p.id,
        p.parcel_id,
        p.property_address,
        c.county_name,
        c.state_code,
        p.sale_type,
        p.sale_date,
        p.auction_status,
        'Analyze property condition'::TEXT
      FROM properties p
      JOIN counties c ON c.id = p.county_id
      JOIN regrid_data rd ON rd.property_id = p.id
      JOIN property_visual_validation pvv ON pvv.property_id = p.id
      WHERE pvv.validation_status = 'APPROVED'
        AND p.auction_status = 'active'
      ORDER BY
        CASE WHEN p.sale_date IS NOT NULL THEN p.sale_date ELSE '9999-12-31'::TIMESTAMP END ASC,
        p.created_at DESC
      LIMIT p_limit;

    -- Unknown agent
    ELSE
      RAISE EXCEPTION 'Unknown agent: %. Supported: REGRID_SCRAPER, VISUAL_VALIDATOR, PROPERTY_CONDITION_AGENT', p_agent_name;
  END CASE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_agent_work_queue(TEXT, INTEGER) IS
'Returns work queue for a specific agent. Only includes active properties (auction_status = ''active''). Supported agents: REGRID_SCRAPER, VISUAL_VALIDATOR, PROPERTY_CONDITION_AGENT.';


-- ============================================================================
-- SECTION 4: Create get_agent_work_report Function
-- ============================================================================

/**
 * get_agent_work_report()
 *
 * Returns a summary of pending work for each agent.
 * Only counts properties with auction_status = 'active'.
 *
 * Usage:
 *   SELECT * FROM get_agent_work_report();
 */
CREATE OR REPLACE FUNCTION get_agent_work_report()
RETURNS TABLE (
  agent_name TEXT,
  task_type TEXT,
  pending_count BIGINT,
  priority TEXT,
  next_action TEXT
) AS $$
DECLARE
  v_regrid_count BIGINT;
  v_validation_count BIGINT;
  v_screenshot_count BIGINT;
  v_analysis_count BIGINT;
BEGIN
  -- Count properties needing Regrid scraping (active only)
  SELECT COUNT(*) INTO v_regrid_count
  FROM properties p
  LEFT JOIN regrid_data rd ON rd.property_id = p.id
  WHERE rd.id IS NULL
    AND p.auction_status = 'active';

  -- Count properties needing visual validation (active only)
  SELECT COUNT(*) INTO v_validation_count
  FROM properties p
  JOIN regrid_data rd ON rd.property_id = p.id
  LEFT JOIN property_visual_validation pvv ON pvv.property_id = p.id
  WHERE pvv.id IS NULL
    AND p.auction_status = 'active';

  -- Count properties needing screenshots (active only)
  SELECT COUNT(*) INTO v_screenshot_count
  FROM properties p
  JOIN regrid_data rd ON rd.property_id = p.id
  LEFT JOIN regrid_screenshots rs ON rs.property_id = p.id
  WHERE rs.id IS NULL
    AND p.auction_status = 'active';

  -- Count approved properties needing analysis (active only)
  SELECT COUNT(*) INTO v_analysis_count
  FROM properties p
  JOIN regrid_data rd ON rd.property_id = p.id
  JOIN property_visual_validation pvv ON pvv.property_id = p.id
  WHERE pvv.validation_status = 'APPROVED'
    AND p.auction_status = 'active';

  -- Return results
  RETURN QUERY
  SELECT
    'REGRID_SCRAPER'::TEXT,
    'Scrape Regrid Data'::TEXT,
    v_regrid_count,
    CASE
      WHEN v_regrid_count > 1000 THEN 'HIGH'
      WHEN v_regrid_count > 100 THEN 'MEDIUM'
      ELSE 'LOW'
    END::TEXT,
    ('Process ' || v_regrid_count || ' properties needing Regrid data')::TEXT

  UNION ALL

  SELECT
    'VISUAL_VALIDATOR'::TEXT,
    'Validate Property Images'::TEXT,
    v_validation_count,
    CASE
      WHEN v_validation_count > 500 THEN 'HIGH'
      WHEN v_validation_count > 50 THEN 'MEDIUM'
      ELSE 'LOW'
    END::TEXT,
    ('Validate ' || v_validation_count || ' properties with Regrid data')::TEXT

  UNION ALL

  SELECT
    'REGRID_SCRAPER'::TEXT,
    'Capture Screenshots'::TEXT,
    v_screenshot_count,
    'MEDIUM'::TEXT,
    ('Capture screenshots for ' || v_screenshot_count || ' properties')::TEXT

  UNION ALL

  SELECT
    'PROPERTY_CONDITION_AGENT'::TEXT,
    'Analyze Approved Properties'::TEXT,
    v_analysis_count,
    CASE
      WHEN v_analysis_count > 100 THEN 'MEDIUM'
      ELSE 'LOW'
    END::TEXT,
    ('Analyze ' || v_analysis_count || ' approved properties')::TEXT

  ORDER BY
    CASE
      WHEN pending_count > 1000 THEN 1
      WHEN pending_count > 100 THEN 2
      WHEN pending_count > 0 THEN 3
      ELSE 4
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_agent_work_report() IS
'Returns summary of pending work for all agents. Only counts active properties (auction_status = ''active'').';


-- ============================================================================
-- SECTION 5: Create Helper Views for Filtered Property Lists
-- ============================================================================

/**
 * vw_investable_properties
 *
 * View showing all properties that have passed visual validation (APPROVED)
 * and are still active (not expired).
 */
CREATE OR REPLACE VIEW vw_investable_properties AS
SELECT
  p.*,
  c.county_name,
  c.state_code,
  pvv.validation_status,
  pvv.confidence_score,
  pvv.structure_present,
  pvv.road_access,
  pvv.red_flags,
  rd.lot_size_acres,
  rd.building_sqft,
  rd.year_built,
  rd.assessed_value AS regrid_assessed_value
FROM properties p
JOIN counties c ON c.id = p.county_id
JOIN property_visual_validation pvv ON pvv.property_id = p.id
LEFT JOIN regrid_data rd ON rd.property_id = p.id
WHERE pvv.validation_status = 'APPROVED'
  AND p.auction_status = 'active';

COMMENT ON VIEW vw_investable_properties IS
'APPROVED and ACTIVE properties - ready for investment analysis.';


/**
 * vw_rejected_properties
 *
 * View showing properties that were rejected during visual validation.
 * Includes both active and expired for audit purposes.
 */
CREATE OR REPLACE VIEW vw_rejected_properties AS
SELECT
  p.id,
  p.parcel_id,
  p.property_address,
  c.county_name,
  c.state_code,
  p.auction_status,
  pvv.validation_status,
  pvv.skip_reason,
  pvv.red_flags,
  pvv.validated_at
FROM properties p
JOIN counties c ON c.id = p.county_id
JOIN property_visual_validation pvv ON pvv.property_id = p.id
WHERE pvv.validation_status = 'REJECT';

COMMENT ON VIEW vw_rejected_properties IS
'Properties rejected during visual validation. For audit purposes.';


/**
 * vw_caution_properties
 *
 * View showing properties flagged for manual review.
 * Only includes active properties.
 */
CREATE OR REPLACE VIEW vw_caution_properties AS
SELECT
  p.*,
  c.county_name,
  c.state_code,
  pvv.validation_status,
  pvv.confidence_score,
  pvv.red_flags,
  pvv.notes AS validation_notes
FROM properties p
JOIN counties c ON c.id = p.county_id
JOIN property_visual_validation pvv ON pvv.property_id = p.id
WHERE pvv.validation_status = 'CAUTION'
  AND p.auction_status = 'active';

COMMENT ON VIEW vw_caution_properties IS
'Properties needing manual review (CAUTION status). Only active properties.';


-- ============================================================================
-- SECTION 6: Create get_properties_needing_visual_validation Function
-- ============================================================================

/**
 * get_properties_needing_visual_validation()
 *
 * Returns properties that have Regrid data but need visual validation.
 * Only returns active properties.
 *
 * Usage:
 *   SELECT * FROM get_properties_needing_visual_validation(county_uuid, 50);
 */
CREATE OR REPLACE FUNCTION get_properties_needing_visual_validation(
  p_county_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  property_id UUID,
  parcel_id TEXT,
  property_address TEXT,
  county_name TEXT,
  state_code TEXT,
  lot_size_acres NUMERIC,
  land_use TEXT,
  regrid_screenshot_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.parcel_id,
    p.property_address,
    c.county_name,
    c.state_code,
    rd.lot_size_acres,
    rd.land_use,
    rs.storage_url
  FROM properties p
  JOIN counties c ON c.id = p.county_id
  JOIN regrid_data rd ON rd.property_id = p.id
  LEFT JOIN regrid_screenshots rs ON rs.property_id = p.id AND rs.screenshot_type = 'map'
  LEFT JOIN property_visual_validation pvv ON pvv.property_id = p.id
  WHERE
    (p_county_id IS NULL OR p.county_id = p_county_id)
    AND pvv.id IS NULL  -- Not yet validated
    AND p.auction_status = 'active'  -- Only active properties
  ORDER BY
    CASE WHEN p.sale_date IS NOT NULL THEN p.sale_date ELSE '9999-12-31'::TIMESTAMP END ASC,
    p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_properties_needing_visual_validation(UUID, INTEGER) IS
'Returns properties needing visual validation. Only includes active properties (auction_status = ''active'').';


-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually to verify)
-- ============================================================================

/*
-- Test the updated function
SELECT COUNT(*) as total_needing_scraping
FROM get_properties_needing_scraping(NULL, 1000);

-- Test the work queue views
SELECT COUNT(*) FROM vw_work_queue_regrid;
SELECT COUNT(*) FROM vw_work_queue_visual_validation;
SELECT COUNT(*) FROM vw_work_queue_screenshots;
SELECT COUNT(*) FROM vw_work_queue_property_analysis;

-- Test the agent work queue function
SELECT * FROM get_agent_work_queue('REGRID_SCRAPER', 5);
SELECT * FROM get_agent_work_queue('VISUAL_VALIDATOR', 5);
SELECT * FROM get_agent_work_queue('PROPERTY_CONDITION_AGENT', 5);

-- Test the agent work report
SELECT * FROM get_agent_work_report();

-- Verify active filter is working by comparing counts
SELECT
  (SELECT COUNT(*) FROM properties WHERE auction_status = 'active') as active_properties,
  (SELECT COUNT(*) FROM vw_work_queue_regrid) +
  (SELECT COUNT(*) FROM properties p JOIN regrid_data rd ON rd.property_id = p.id WHERE p.auction_status = 'active') as regrid_total;
*/


-- ============================================================================
-- GRANT PERMISSIONS (if using RLS)
-- Adjust these based on your security model
-- ============================================================================

-- Uncomment and adjust roles as needed:
-- GRANT SELECT ON vw_work_queue_regrid TO authenticated;
-- GRANT SELECT ON vw_work_queue_visual_validation TO authenticated;
-- GRANT SELECT ON vw_work_queue_screenshots TO authenticated;
-- GRANT SELECT ON vw_work_queue_property_analysis TO authenticated;
-- GRANT SELECT ON vw_investable_properties TO authenticated;
-- GRANT SELECT ON vw_rejected_properties TO authenticated;
-- GRANT SELECT ON vw_caution_properties TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_agent_work_queue(TEXT, INTEGER) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_agent_work_report() TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_properties_needing_visual_validation(UUID, INTEGER) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_properties_needing_scraping(UUID, INTEGER) TO authenticated;
