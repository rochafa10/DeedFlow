-- ============================================================================
-- MIGRATION: Populate February 2026 PA Auctions
-- Description: Inserts missing February 2026 PA tax sale auctions
-- Created: 2026-01-25
-- Track: 2.1 - Property-Auction Linkage Redesign
-- ============================================================================
--
-- Source: Tax Sale Resources - PA February 2026 Auctions
--
-- Auctions Added:
--   1. Allegheny County    - Feb 1, 2026  - Deed (judicial)
--   2. Monroe County       - Feb 10, 2026 - Deed (judicial)
--   3. Philadelphia City   - Feb 17, 2026 - Redeemable Deed (upset)
--   4. Wayne County        - Feb 19, 2026 - Deed (judicial)
--   5. Philadelphia City   - Feb 23, 2026 - Redeemable Deed (upset)
--   6. Philadelphia City   - Feb 27, 2026 - Redeemable Deed (upset)
--
-- Sale Type Mapping:
--   - "Deed" -> 'judicial' (PA deed sales clear liens)
--   - "Redeemable Deed" -> 'upset' (can be redeemed by owner)
--
-- Note: Uses UPSERT pattern via upsert_upcoming_sale() to prevent duplicates
-- ============================================================================

DO $$
DECLARE
  v_county_id UUID;
  v_sale_id UUID;
BEGIN
  RAISE NOTICE '=== Starting February 2026 PA Auctions Population ===';
  RAISE NOTICE 'Timestamp: %', NOW();

  -- -------------------------------------------------------------------------
  -- 1. Allegheny County - February 1, 2026 - Deed Sale (Judicial)
  -- -------------------------------------------------------------------------
  SELECT get_or_create_county('Allegheny', 'PA') INTO v_county_id;

  SELECT upsert_upcoming_sale(
    v_county_id,                          -- county_id
    'judicial',                           -- sale_type (Deed = judicial, clears liens)
    '2026-02-01 10:00:00'::TIMESTAMPTZ,   -- sale_date
    NULL,                                 -- registration_deadline (unknown)
    'county',                             -- platform
    NULL,                                 -- deposit_required (unknown)
    NULL,                                 -- property_count (unknown)
    NULL,                                 -- sale_location
    'online'                              -- bidding_method
  ) INTO v_sale_id;

  RAISE NOTICE 'Added/updated Allegheny County Feb 1, 2026 judicial sale (ID: %)', v_sale_id;

  -- -------------------------------------------------------------------------
  -- 2. Monroe County - February 10, 2026 - Deed Sale (Judicial)
  -- -------------------------------------------------------------------------
  SELECT get_or_create_county('Monroe', 'PA') INTO v_county_id;

  SELECT upsert_upcoming_sale(
    v_county_id,                          -- county_id
    'judicial',                           -- sale_type (Deed = judicial, clears liens)
    '2026-02-10 10:00:00'::TIMESTAMPTZ,   -- sale_date
    NULL,                                 -- registration_deadline (unknown)
    'county',                             -- platform
    NULL,                                 -- deposit_required (unknown)
    NULL,                                 -- property_count (unknown)
    NULL,                                 -- sale_location
    'online'                              -- bidding_method
  ) INTO v_sale_id;

  RAISE NOTICE 'Added/updated Monroe County Feb 10, 2026 judicial sale (ID: %)', v_sale_id;

  -- -------------------------------------------------------------------------
  -- 3. Philadelphia City - February 17, 2026 - Redeemable Deed (Upset)
  -- -------------------------------------------------------------------------
  SELECT get_or_create_county('Philadelphia', 'PA') INTO v_county_id;

  SELECT upsert_upcoming_sale(
    v_county_id,                          -- county_id
    'upset',                              -- sale_type (Redeemable Deed = upset)
    '2026-02-17 10:00:00'::TIMESTAMPTZ,   -- sale_date
    NULL,                                 -- registration_deadline (unknown)
    'county',                             -- platform
    NULL,                                 -- deposit_required (unknown)
    NULL,                                 -- property_count (unknown)
    NULL,                                 -- sale_location
    'online'                              -- bidding_method
  ) INTO v_sale_id;

  RAISE NOTICE 'Added/updated Philadelphia Feb 17, 2026 upset sale (ID: %)', v_sale_id;

  -- -------------------------------------------------------------------------
  -- 4. Wayne County - February 19, 2026 - Deed Sale (Judicial)
  -- -------------------------------------------------------------------------
  SELECT get_or_create_county('Wayne', 'PA') INTO v_county_id;

  SELECT upsert_upcoming_sale(
    v_county_id,                          -- county_id
    'judicial',                           -- sale_type (Deed = judicial, clears liens)
    '2026-02-19 10:00:00'::TIMESTAMPTZ,   -- sale_date
    NULL,                                 -- registration_deadline (unknown)
    'county',                             -- platform
    NULL,                                 -- deposit_required (unknown)
    NULL,                                 -- property_count (unknown)
    NULL,                                 -- sale_location
    'online'                              -- bidding_method
  ) INTO v_sale_id;

  RAISE NOTICE 'Added/updated Wayne County Feb 19, 2026 judicial sale (ID: %)', v_sale_id;

  -- -------------------------------------------------------------------------
  -- 5. Philadelphia City - February 23, 2026 - Redeemable Deed (Upset)
  -- -------------------------------------------------------------------------
  SELECT get_or_create_county('Philadelphia', 'PA') INTO v_county_id;

  SELECT upsert_upcoming_sale(
    v_county_id,                          -- county_id
    'upset',                              -- sale_type (Redeemable Deed = upset)
    '2026-02-23 10:00:00'::TIMESTAMPTZ,   -- sale_date
    NULL,                                 -- registration_deadline (unknown)
    'county',                             -- platform
    NULL,                                 -- deposit_required (unknown)
    NULL,                                 -- property_count (unknown)
    NULL,                                 -- sale_location
    'online'                              -- bidding_method
  ) INTO v_sale_id;

  RAISE NOTICE 'Added/updated Philadelphia Feb 23, 2026 upset sale (ID: %)', v_sale_id;

  -- -------------------------------------------------------------------------
  -- 6. Philadelphia City - February 27, 2026 - Redeemable Deed (Upset)
  -- -------------------------------------------------------------------------
  SELECT get_or_create_county('Philadelphia', 'PA') INTO v_county_id;

  SELECT upsert_upcoming_sale(
    v_county_id,                          -- county_id
    'upset',                              -- sale_type (Redeemable Deed = upset)
    '2026-02-27 10:00:00'::TIMESTAMPTZ,   -- sale_date
    NULL,                                 -- registration_deadline (unknown)
    'county',                             -- platform
    NULL,                                 -- deposit_required (unknown)
    NULL,                                 -- property_count (unknown)
    NULL,                                 -- sale_location
    'online'                              -- bidding_method
  ) INTO v_sale_id;

  RAISE NOTICE 'Added/updated Philadelphia Feb 27, 2026 upset sale (ID: %)', v_sale_id;

  -- -------------------------------------------------------------------------
  -- Summary
  -- -------------------------------------------------------------------------
  RAISE NOTICE '=== February 2026 PA Auctions Population Complete ===';
  RAISE NOTICE 'Added/Updated 6 auctions:';
  RAISE NOTICE '  - Allegheny County: Feb 1 (judicial)';
  RAISE NOTICE '  - Monroe County: Feb 10 (judicial)';
  RAISE NOTICE '  - Philadelphia: Feb 17 (upset)';
  RAISE NOTICE '  - Wayne County: Feb 19 (judicial)';
  RAISE NOTICE '  - Philadelphia: Feb 23 (upset)';
  RAISE NOTICE '  - Philadelphia: Feb 27 (upset)';

END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- Run this after migration to verify the auctions were added correctly
-- ============================================================================
--
-- SELECT
--   c.county_name,
--   c.state_code,
--   us.sale_type,
--   us.sale_date,
--   us.platform,
--   us.bidding_method,
--   us.created_at,
--   us.updated_at
-- FROM upcoming_sales us
-- JOIN counties c ON us.county_id = c.id
-- WHERE c.state_code = 'PA'
--   AND us.sale_date >= '2026-02-01'
--   AND us.sale_date < '2026-03-01'
-- ORDER BY us.sale_date;
--
-- ============================================================================
