-- Migration: Add address columns to regrid_data table
-- Created: 2026-01-24
-- Part of Phase 2: Address Extraction from Regrid
--
-- WHY: The Regrid scraper (src/app/api/scrape/regrid/route.ts) extracts address
-- components (address, city, state, zip) from Regrid's parcel data. These columns
-- need to exist in the database for the upsert operation to succeed.
--
-- WHEN TO RUN: Run this migration before using the Regrid scraper API endpoint,
-- or if you see errors like "column 'address' does not exist" in the regrid_data table.
--
-- HOW TO RUN:
--   Option 1: Via Supabase Dashboard - SQL Editor
--   Option 2: Via Supabase CLI: supabase db push
--   Option 3: Via Supabase MCP: execute_sql with this file's contents
--
-- ROLLBACK: See bottom of file for rollback SQL

-- ============================================================================
-- ADD ADDRESS COLUMNS
-- ============================================================================

-- Full street address scraped from Regrid (e.g., "123 Main Street")
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS address TEXT;

-- City name extracted from Regrid address data (e.g., "Pittsburgh")
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS city TEXT;

-- State code - 2-letter abbreviation (e.g., "PA")
-- Note: This may differ from the state in the related property record
-- as Regrid may have more accurate/updated address information
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS state TEXT;

-- ZIP code in standard format (e.g., "15213" or "15213-1234")
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS zip TEXT;

-- ============================================================================
-- ADD COLUMN DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN regrid_data.address IS 'Full street address scraped from Regrid parcel data';
COMMENT ON COLUMN regrid_data.city IS 'City name extracted from Regrid address';
COMMENT ON COLUMN regrid_data.state IS 'State code (2-letter) from Regrid data';
COMMENT ON COLUMN regrid_data.zip IS 'ZIP code (5 or 9 digit format) from Regrid data';

-- ============================================================================
-- CREATE INDEXES FOR SEARCH/FILTERING
-- ============================================================================

-- Index on address for text searches and lookups
CREATE INDEX IF NOT EXISTS idx_regrid_data_address ON regrid_data(address);

-- Index on city for filtering by city
CREATE INDEX IF NOT EXISTS idx_regrid_data_city ON regrid_data(city);

-- Index on state for filtering by state (useful for multi-state deployments)
CREATE INDEX IF NOT EXISTS idx_regrid_data_state ON regrid_data(state);

-- Index on zip for filtering by ZIP code / geographic area
CREATE INDEX IF NOT EXISTS idx_regrid_data_zip ON regrid_data(zip);

-- ============================================================================
-- VERIFICATION QUERY (run after migration to confirm success)
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'regrid_data'
--   AND column_name IN ('address', 'city', 'state', 'zip')
-- ORDER BY column_name;

-- ============================================================================
-- ROLLBACK SQL (if needed to undo this migration)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_regrid_data_address;
-- DROP INDEX IF EXISTS idx_regrid_data_city;
-- DROP INDEX IF EXISTS idx_regrid_data_state;
-- DROP INDEX IF EXISTS idx_regrid_data_zip;
-- ALTER TABLE regrid_data DROP COLUMN IF EXISTS address;
-- ALTER TABLE regrid_data DROP COLUMN IF EXISTS city;
-- ALTER TABLE regrid_data DROP COLUMN IF EXISTS state;
-- ALTER TABLE regrid_data DROP COLUMN IF EXISTS zip;
