-- ============================================================================
-- MIGRATION: Add Auction Status System
-- Description: Implements complete auction status tracking for properties
-- Created: 2026-01-25
--
-- This migration adds:
--   1. auction_status column to properties table
--   2. Index for efficient filtering by auction status
--   3. Check constraint for valid status values
--   4. Function to bulk update auction status based on sale dates
--   5. Trigger to auto-set auction status on insert/update
--   6. Helper views for filtering by status
--   7. Summary function for status counts and percentages
--
-- Safe to run multiple times (idempotent)
-- ============================================================================

-- ============================================================================
-- TRACK 1.1: Add Column, Index, and Check Constraint
-- ============================================================================

-- Add auction_status column if it does not exist
-- Note: PostgreSQL does not have ADD COLUMN IF NOT EXISTS in older versions,
-- so we use a DO block to check first
DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'properties'
      AND column_name = 'auction_status'
  ) THEN
    -- Add the column with default value 'unknown'
    ALTER TABLE properties
    ADD COLUMN auction_status TEXT DEFAULT 'unknown';

    RAISE NOTICE 'Added auction_status column to properties table';
  ELSE
    RAISE NOTICE 'auction_status column already exists';
  END IF;
END $$;

-- Create index for efficient filtering (IF NOT EXISTS is supported for indexes)
CREATE INDEX IF NOT EXISTS idx_properties_auction_status
ON properties(auction_status);

-- Add check constraint for valid values
-- First drop if exists (for idempotency), then create
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'properties'
      AND constraint_name = 'chk_auction_status_valid'
  ) THEN
    ALTER TABLE properties DROP CONSTRAINT chk_auction_status_valid;
  END IF;

  -- Add the check constraint
  ALTER TABLE properties
  ADD CONSTRAINT chk_auction_status_valid
  CHECK (auction_status IN ('active', 'expired', 'sold', 'withdrawn', 'unknown'));

  RAISE NOTICE 'Added check constraint chk_auction_status_valid';
END $$;


-- ============================================================================
-- TRACK 1.2: Create Bulk Update Function
-- ============================================================================

/**
 * update_property_auction_status()
 *
 * Bulk updates auction_status for all properties based on:
 *   - EXPIRED: past sale_date AND sale_type IN ('upset', 'judicial')
 *   - ACTIVE: future sale_date OR sale_type IN ('repository', 'sealed_bid', 'private_sale')
 *   - UNKNOWN: missing sale_date OR sale_type
 *
 * Returns a table with counts of updated properties by status.
 *
 * Usage:
 *   SELECT * FROM update_property_auction_status();
 */
CREATE OR REPLACE FUNCTION update_property_auction_status()
RETURNS TABLE (
  status TEXT,
  count_updated BIGINT,
  description TEXT
) AS $$
DECLARE
  v_expired_count BIGINT;
  v_active_count BIGINT;
  v_unknown_count BIGINT;
  v_sold_count BIGINT;
  v_withdrawn_count BIGINT;
BEGIN
  -- First, handle properties that are explicitly sold or withdrawn
  -- These take precedence regardless of dates
  UPDATE properties
  SET auction_status = 'sold',
      updated_at = NOW()
  WHERE sale_status = 'sold'
    AND (auction_status IS DISTINCT FROM 'sold');
  GET DIAGNOSTICS v_sold_count = ROW_COUNT;

  UPDATE properties
  SET auction_status = 'withdrawn',
      updated_at = NOW()
  WHERE sale_status = 'withdrawn'
    AND (auction_status IS DISTINCT FROM 'withdrawn');
  GET DIAGNOSTICS v_withdrawn_count = ROW_COUNT;

  -- Mark as EXPIRED: past sale_date AND sale_type is upset or judicial
  -- Repository/sealed_bid/private_sale types stay active until explicitly sold
  UPDATE properties
  SET auction_status = 'expired',
      updated_at = NOW()
  WHERE sale_date < NOW()
    AND sale_type IN ('upset', 'judicial')
    AND sale_status NOT IN ('sold', 'withdrawn')
    AND (auction_status IS DISTINCT FROM 'expired');
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  -- Mark as ACTIVE: future sale_date OR ongoing sale types (repository, sealed_bid, private_sale)
  -- These property types remain active indefinitely until sold
  UPDATE properties
  SET auction_status = 'active',
      updated_at = NOW()
  WHERE (
    -- Future dated auctions
    (sale_date >= NOW() AND sale_type IN ('upset', 'judicial'))
    OR
    -- Ongoing sale types (always active until sold)
    (sale_type IN ('repository', 'sealed_bid', 'private_sale'))
  )
  AND sale_status NOT IN ('sold', 'withdrawn')
  AND (auction_status IS DISTINCT FROM 'active');
  GET DIAGNOSTICS v_active_count = ROW_COUNT;

  -- Mark as UNKNOWN: missing critical information
  -- These need investigation before processing
  UPDATE properties
  SET auction_status = 'unknown',
      updated_at = NOW()
  WHERE (sale_date IS NULL OR sale_type IS NULL)
    AND sale_status NOT IN ('sold', 'withdrawn')
    AND (auction_status IS DISTINCT FROM 'unknown');
  GET DIAGNOSTICS v_unknown_count = ROW_COUNT;

  -- Return summary of updates
  RETURN QUERY
  SELECT 'expired'::TEXT, v_expired_count, 'Past auction date (upset/judicial)'::TEXT
  UNION ALL
  SELECT 'active'::TEXT, v_active_count, 'Future auction or ongoing sale type'::TEXT
  UNION ALL
  SELECT 'unknown'::TEXT, v_unknown_count, 'Missing sale_date or sale_type'::TEXT
  UNION ALL
  SELECT 'sold'::TEXT, v_sold_count, 'Property was sold'::TEXT
  UNION ALL
  SELECT 'withdrawn'::TEXT, v_withdrawn_count, 'Property was withdrawn from sale'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_property_auction_status() IS
'Bulk updates auction_status for all properties based on sale_date, sale_type, and sale_status. Run this periodically to keep statuses current.';


-- ============================================================================
-- TRACK 1.3: Create Auto-Update Trigger
-- ============================================================================

/**
 * calculate_auction_status()
 *
 * Pure function that determines what the auction_status should be
 * based on the property's sale_status, sale_type, and sale_date.
 *
 * Logic (in priority order):
 *   1. If sale_status = 'sold' -> 'sold'
 *   2. If sale_status = 'withdrawn' -> 'withdrawn'
 *   3. If sale_type is repository/sealed_bid/private_sale -> 'active' (always until sold)
 *   4. If sale_date IS NULL or sale_type IS NULL -> 'unknown'
 *   5. If sale_date < NOW() AND sale_type is upset/judicial -> 'expired'
 *   6. Otherwise -> 'active'
 */
CREATE OR REPLACE FUNCTION calculate_auction_status(
  p_sale_status TEXT,
  p_sale_type TEXT,
  p_sale_date TIMESTAMP
) RETURNS TEXT AS $$
BEGIN
  -- Priority 1: Explicit sale statuses take precedence
  IF p_sale_status = 'sold' THEN
    RETURN 'sold';
  END IF;

  IF p_sale_status = 'withdrawn' THEN
    RETURN 'withdrawn';
  END IF;

  -- Priority 2: Ongoing sale types are always active until sold
  IF p_sale_type IN ('repository', 'sealed_bid', 'private_sale') THEN
    RETURN 'active';
  END IF;

  -- Priority 3: Missing critical data means unknown
  IF p_sale_date IS NULL OR p_sale_type IS NULL THEN
    RETURN 'unknown';
  END IF;

  -- Priority 4: Check if expired (past date for upset/judicial)
  IF p_sale_date < NOW() AND p_sale_type IN ('upset', 'judicial') THEN
    RETURN 'expired';
  END IF;

  -- Default: Property is active (future date for upset/judicial)
  RETURN 'active';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_auction_status(TEXT, TEXT, TIMESTAMP) IS
'Calculates the appropriate auction_status based on sale_status, sale_type, and sale_date. Used by the trigger and can be called directly for testing.';


/**
 * trg_update_auction_status()
 *
 * Trigger function that automatically sets auction_status
 * when a property is inserted or when sale_date, sale_type, or sale_status changes.
 */
CREATE OR REPLACE FUNCTION trg_update_auction_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate and set the auction_status
  NEW.auction_status := calculate_auction_status(
    NEW.sale_status,
    NEW.sale_type,
    NEW.sale_date
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trg_update_auction_status() IS
'Trigger function that auto-sets auction_status based on sale_date, sale_type, and sale_status.';


-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trg_properties_auction_status ON properties;

-- Create the trigger
CREATE TRIGGER trg_properties_auction_status
  BEFORE INSERT OR UPDATE OF sale_date, sale_type, sale_status
  ON properties
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_auction_status();

COMMENT ON TRIGGER trg_properties_auction_status ON properties IS
'Automatically updates auction_status when sale_date, sale_type, or sale_status changes.';


-- ============================================================================
-- TRACK 1.4: Create Helper Views and Summary Function
-- ============================================================================

/**
 * vw_active_properties
 *
 * View that shows only properties with auction_status = 'active'.
 * Use this view when you need to process only investable properties.
 */
CREATE OR REPLACE VIEW vw_active_properties AS
SELECT
  p.*,
  c.county_name,
  c.state_code
FROM properties p
JOIN counties c ON c.id = p.county_id
WHERE p.auction_status = 'active';

COMMENT ON VIEW vw_active_properties IS
'Shows only properties with auction_status = ''active''. These are properties eligible for processing by agents.';


/**
 * vw_expired_properties
 *
 * View that shows only properties with auction_status = 'expired'.
 * Use this view for auditing past auctions or cleanup.
 */
CREATE OR REPLACE VIEW vw_expired_properties AS
SELECT
  p.*,
  c.county_name,
  c.state_code
FROM properties p
JOIN counties c ON c.id = p.county_id
WHERE p.auction_status = 'expired';

COMMENT ON VIEW vw_expired_properties IS
'Shows only properties with auction_status = ''expired''. These are from past auctions and excluded from processing.';


/**
 * get_auction_status_summary()
 *
 * Returns counts and percentages for each auction_status value.
 * Useful for monitoring and reporting.
 *
 * Usage:
 *   SELECT * FROM get_auction_status_summary();
 *   SELECT * FROM get_auction_status_summary('county-uuid');
 */
CREATE OR REPLACE FUNCTION get_auction_status_summary(
  p_county_id UUID DEFAULT NULL
)
RETURNS TABLE (
  auction_status TEXT,
  property_count BIGINT,
  percentage NUMERIC(5,2),
  description TEXT
) AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- Get total count (for the specified county or all)
  IF p_county_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total FROM properties WHERE county_id = p_county_id;
  ELSE
    SELECT COUNT(*) INTO v_total FROM properties;
  END IF;

  -- Return breakdown by status
  RETURN QUERY
  SELECT
    COALESCE(p.auction_status, 'null')::TEXT as auction_status,
    COUNT(*)::BIGINT as property_count,
    CASE
      WHEN v_total > 0 THEN ROUND((COUNT(*)::NUMERIC / v_total * 100), 2)
      ELSE 0
    END as percentage,
    CASE p.auction_status
      WHEN 'active' THEN 'Eligible for processing - upcoming auction or ongoing sale'
      WHEN 'expired' THEN 'Past auction date - excluded from processing'
      WHEN 'sold' THEN 'Property has been sold'
      WHEN 'withdrawn' THEN 'Property withdrawn from sale'
      WHEN 'unknown' THEN 'Missing sale_date or sale_type - needs review'
      ELSE 'Status not set'
    END::TEXT as description
  FROM properties p
  WHERE (p_county_id IS NULL OR p.county_id = p_county_id)
  GROUP BY p.auction_status
  ORDER BY
    CASE p.auction_status
      WHEN 'active' THEN 1
      WHEN 'expired' THEN 2
      WHEN 'sold' THEN 3
      WHEN 'withdrawn' THEN 4
      WHEN 'unknown' THEN 5
      ELSE 6
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_auction_status_summary(UUID) IS
'Returns counts and percentages of properties by auction_status. Optionally filter by county_id.';


/**
 * get_active_property_counts()
 *
 * Returns active vs expired counts per county.
 * Useful for understanding workload distribution.
 */
CREATE OR REPLACE FUNCTION get_active_property_counts()
RETURNS TABLE (
  county_id UUID,
  county_name TEXT,
  state_code TEXT,
  total_properties BIGINT,
  active_count BIGINT,
  expired_count BIGINT,
  sold_count BIGINT,
  withdrawn_count BIGINT,
  unknown_count BIGINT,
  active_percentage NUMERIC(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as county_id,
    c.county_name,
    c.state_code,
    COUNT(p.id)::BIGINT as total_properties,
    COUNT(p.id) FILTER (WHERE p.auction_status = 'active')::BIGINT as active_count,
    COUNT(p.id) FILTER (WHERE p.auction_status = 'expired')::BIGINT as expired_count,
    COUNT(p.id) FILTER (WHERE p.auction_status = 'sold')::BIGINT as sold_count,
    COUNT(p.id) FILTER (WHERE p.auction_status = 'withdrawn')::BIGINT as withdrawn_count,
    COUNT(p.id) FILTER (WHERE p.auction_status = 'unknown')::BIGINT as unknown_count,
    CASE
      WHEN COUNT(p.id) > 0
      THEN ROUND((COUNT(p.id) FILTER (WHERE p.auction_status = 'active')::NUMERIC / COUNT(p.id) * 100), 2)
      ELSE 0
    END as active_percentage
  FROM counties c
  LEFT JOIN properties p ON p.county_id = c.id
  GROUP BY c.id, c.county_name, c.state_code
  HAVING COUNT(p.id) > 0
  ORDER BY COUNT(p.id) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_property_counts() IS
'Returns active vs expired property counts per county. Use to understand workload and filter expired properties.';


-- ============================================================================
-- INITIAL STATUS UPDATE
-- Run the bulk update to set initial status for existing properties
-- ============================================================================

DO $$
DECLARE
  v_result RECORD;
BEGIN
  RAISE NOTICE 'Running initial auction status update for existing properties...';

  FOR v_result IN SELECT * FROM update_property_auction_status() LOOP
    RAISE NOTICE '  %: % properties updated (%)', v_result.status, v_result.count_updated, v_result.description;
  END LOOP;

  RAISE NOTICE 'Initial auction status update complete.';
END $$;


-- ============================================================================
-- GRANT PERMISSIONS (if using RLS)
-- Adjust these based on your security model
-- ============================================================================

-- Grant execute permissions on functions (adjust roles as needed)
-- GRANT EXECUTE ON FUNCTION update_property_auction_status() TO authenticated;
-- GRANT EXECUTE ON FUNCTION calculate_auction_status(TEXT, TEXT, TIMESTAMP) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_auction_status_summary(UUID) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_active_property_counts() TO authenticated;

-- Grant select on views (adjust roles as needed)
-- GRANT SELECT ON vw_active_properties TO authenticated;
-- GRANT SELECT ON vw_expired_properties TO authenticated;


-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually to verify)
-- ============================================================================

/*
-- Check the auction_status column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'properties' AND column_name = 'auction_status';

-- Check the index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'properties' AND indexname = 'idx_properties_auction_status';

-- Check the constraint was added
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'chk_auction_status_valid';

-- Check the trigger was created
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trg_properties_auction_status';

-- Test the status calculation function
SELECT
  calculate_auction_status('upcoming', 'judicial', NOW() + INTERVAL '30 days') as future_judicial,
  calculate_auction_status('upcoming', 'judicial', NOW() - INTERVAL '30 days') as past_judicial,
  calculate_auction_status('upcoming', 'repository', NOW() - INTERVAL '30 days') as past_repository,
  calculate_auction_status('sold', 'judicial', NOW() + INTERVAL '30 days') as sold_property,
  calculate_auction_status('upcoming', NULL, NOW() + INTERVAL '30 days') as missing_type;

-- View status summary
SELECT * FROM get_auction_status_summary();

-- View county breakdown
SELECT * FROM get_active_property_counts();
*/
