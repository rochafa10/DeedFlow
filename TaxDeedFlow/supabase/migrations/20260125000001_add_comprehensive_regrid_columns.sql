-- Migration: Add comprehensive Regrid data columns to regrid_data table
-- Created: 2026-01-25
-- Purpose: Capture all available free-tier fields from Regrid property details
--
-- This migration adds fields identified by scraping a live Regrid property page.
-- Fields are organized by section as they appear in Regrid's Property Details panel.
--
-- HOW TO RUN:
--   Option 1: Via Supabase Dashboard - SQL Editor
--   Option 2: Via Supabase CLI: supabase db push
--   Option 3: Via Supabase MCP: execute_sql with this file's contents

-- ============================================================================
-- SECTION 1: ADDRESS FIELDS (Parcel Highlights)
-- ============================================================================

-- Full street address scraped from Regrid (e.g., "94 Madison Rd")
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS address TEXT;

-- City name extracted from Regrid address data (e.g., "Martinsburg")
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS city TEXT;

-- State code - 2-letter abbreviation (e.g., "PA")
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS state TEXT;

-- ZIP code in standard format (e.g., "16662")
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS zip TEXT;

-- ============================================================================
-- SECTION 2: OWNER INFORMATION
-- ============================================================================

-- Owner name as shown on assessor records (e.g., "DETWILER GLENN")
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- Owner mailing address (may differ from property address for absentee owners)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS mailing_address TEXT;

-- Owner mailing city
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS mailing_city TEXT;

-- Owner mailing state
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS mailing_state TEXT;

-- Owner mailing ZIP code
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS mailing_zip TEXT;

-- ============================================================================
-- SECTION 3: PROPERTY SALES & VALUE
-- ============================================================================

-- Last recorded sale price (may be $0 for transfers)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS last_sale_price DECIMAL(12,2);

-- Last sale date
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS last_sale_date DATE;

-- Total assessed parcel value (land + improvements)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS total_parcel_value DECIMAL(12,2);

-- Improvement/building value portion
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS improvement_value DECIMAL(12,2);

-- Land-only value portion
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS land_value DECIMAL(12,2);

-- ============================================================================
-- SECTION 4: STRUCTURE DETAILS
-- ============================================================================

-- Number of stories (e.g., 1, 2, 1.5)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS number_of_stories DECIMAL(3,1);

-- Building count on parcel
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS building_count INTEGER;

-- Building footprint in square feet
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS building_footprint_sqft INTEGER;

-- ============================================================================
-- SECTION 5: LOT & LAND DETAILS
-- ============================================================================

-- Deed acres (legal lot size from deed)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS deed_acres DECIMAL(10,4);

-- Lot type (Interior, Corner, Cul-de-sac, etc.)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS lot_type TEXT;

-- Terrain description (Level, Rollng, Steep, etc.)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS terrain TEXT;

-- Road type/surface (Paved, Gravel, Dirt, None)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS road_type TEXT;

-- Legal land description (e.g., "LOT 34")
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS land_description TEXT;

-- Parcel use code (county-specific code)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS parcel_use_code TEXT;

-- ============================================================================
-- SECTION 6: UTILITIES (Enhanced)
-- ============================================================================

-- Gas availability (WS = Western Supply, etc.)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS gas_availability TEXT;

-- Electric service available
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS electric_service TEXT;

-- ============================================================================
-- SECTION 7: GEOGRAPHIC & CENSUS DATA
-- ============================================================================

-- Federal Qualified Opportunity Zone (Yes/No)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS opportunity_zone BOOLEAN;

-- Census 2020 Tract (e.g., "42013011300")
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS census_tract TEXT;

-- Census 2020 Block
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS census_block TEXT;

-- Census 2020 Block Group
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS census_blockgroup TEXT;

-- Neighborhood code
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS neighborhood_code TEXT;

-- ============================================================================
-- SECTION 8: SCHOOL & DISTRICT INFO
-- ============================================================================

-- School district name (e.g., "Spring Cove School District")
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS school_district TEXT;

-- School district code
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS school_district_code TEXT;

-- District number
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS district_number TEXT;

-- Ward number
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS ward_number TEXT;

-- Map number
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS map_number TEXT;

-- ============================================================================
-- SECTION 9: IDENTIFIERS
-- ============================================================================

-- Regrid UUID (unique identifier in Regrid system)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS regrid_uuid TEXT;

-- Alternative parcel ID (if county uses multiple formats)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS alt_parcel_id TEXT;

-- Control number (county-specific)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS control_number TEXT;

-- ============================================================================
-- SECTION 10: CLEAN & GREEN PROGRAM (PA-specific)
-- ============================================================================

-- Clean & Green land value (PA preferential assessment program)
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS clean_green_land_value DECIMAL(12,2);

-- Clean & Green building value
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS clean_green_building_value DECIMAL(12,2);

-- Clean & Green total value
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS clean_green_total_value DECIMAL(12,2);

-- ============================================================================
-- ADD COLUMN DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN regrid_data.address IS 'Full street address from Regrid';
COMMENT ON COLUMN regrid_data.city IS 'City name from Regrid';
COMMENT ON COLUMN regrid_data.state IS 'State code (2-letter) from Regrid';
COMMENT ON COLUMN regrid_data.zip IS 'ZIP code from Regrid';

COMMENT ON COLUMN regrid_data.owner_name IS 'Property owner name from assessor records';
COMMENT ON COLUMN regrid_data.mailing_address IS 'Owner mailing address (for absentee owner detection)';
COMMENT ON COLUMN regrid_data.mailing_city IS 'Owner mailing city';
COMMENT ON COLUMN regrid_data.mailing_state IS 'Owner mailing state';
COMMENT ON COLUMN regrid_data.mailing_zip IS 'Owner mailing ZIP';

COMMENT ON COLUMN regrid_data.last_sale_price IS 'Last recorded sale price';
COMMENT ON COLUMN regrid_data.last_sale_date IS 'Date of last sale';
COMMENT ON COLUMN regrid_data.total_parcel_value IS 'Total assessed value (land + improvements)';
COMMENT ON COLUMN regrid_data.improvement_value IS 'Improvement/building value portion';
COMMENT ON COLUMN regrid_data.land_value IS 'Land-only value portion';

COMMENT ON COLUMN regrid_data.number_of_stories IS 'Number of stories in structure';
COMMENT ON COLUMN regrid_data.building_count IS 'Number of buildings on parcel';
COMMENT ON COLUMN regrid_data.building_footprint_sqft IS 'Building footprint area';

COMMENT ON COLUMN regrid_data.deed_acres IS 'Legal lot size from deed';
COMMENT ON COLUMN regrid_data.lot_type IS 'Lot type (Interior, Corner, etc.)';
COMMENT ON COLUMN regrid_data.terrain IS 'Terrain description';
COMMENT ON COLUMN regrid_data.road_type IS 'Road surface type';
COMMENT ON COLUMN regrid_data.land_description IS 'Legal land description';
COMMENT ON COLUMN regrid_data.parcel_use_code IS 'County parcel use code';

COMMENT ON COLUMN regrid_data.gas_availability IS 'Gas service availability';
COMMENT ON COLUMN regrid_data.electric_service IS 'Electric service type';

COMMENT ON COLUMN regrid_data.opportunity_zone IS 'Federal Qualified Opportunity Zone';
COMMENT ON COLUMN regrid_data.census_tract IS 'Census 2020 tract';
COMMENT ON COLUMN regrid_data.census_block IS 'Census 2020 block';
COMMENT ON COLUMN regrid_data.census_blockgroup IS 'Census 2020 block group';
COMMENT ON COLUMN regrid_data.neighborhood_code IS 'Neighborhood code';

COMMENT ON COLUMN regrid_data.school_district IS 'School district name';
COMMENT ON COLUMN regrid_data.school_district_code IS 'School district code';
COMMENT ON COLUMN regrid_data.district_number IS 'District number';
COMMENT ON COLUMN regrid_data.ward_number IS 'Ward number';
COMMENT ON COLUMN regrid_data.map_number IS 'Map number';

COMMENT ON COLUMN regrid_data.regrid_uuid IS 'Regrid unique identifier';
COMMENT ON COLUMN regrid_data.alt_parcel_id IS 'Alternative parcel ID';
COMMENT ON COLUMN regrid_data.control_number IS 'County control number';

COMMENT ON COLUMN regrid_data.clean_green_land_value IS 'PA Clean & Green land value';
COMMENT ON COLUMN regrid_data.clean_green_building_value IS 'PA Clean & Green building value';
COMMENT ON COLUMN regrid_data.clean_green_total_value IS 'PA Clean & Green total value';

-- ============================================================================
-- CREATE INDEXES FOR SEARCH/FILTERING
-- ============================================================================

-- Address indexes
CREATE INDEX IF NOT EXISTS idx_regrid_data_address ON regrid_data(address);
CREATE INDEX IF NOT EXISTS idx_regrid_data_city ON regrid_data(city);
CREATE INDEX IF NOT EXISTS idx_regrid_data_state ON regrid_data(state);
CREATE INDEX IF NOT EXISTS idx_regrid_data_zip ON regrid_data(zip);

-- Owner indexes (for absentee owner searches)
CREATE INDEX IF NOT EXISTS idx_regrid_data_owner_name ON regrid_data(owner_name);
CREATE INDEX IF NOT EXISTS idx_regrid_data_mailing_zip ON regrid_data(mailing_zip);

-- Value indexes (for filtering by price ranges)
CREATE INDEX IF NOT EXISTS idx_regrid_data_last_sale_price ON regrid_data(last_sale_price);
CREATE INDEX IF NOT EXISTS idx_regrid_data_total_value ON regrid_data(total_parcel_value);

-- Location indexes
CREATE INDEX IF NOT EXISTS idx_regrid_data_school_district ON regrid_data(school_district);
CREATE INDEX IF NOT EXISTS idx_regrid_data_census_tract ON regrid_data(census_tract);
CREATE INDEX IF NOT EXISTS idx_regrid_data_opportunity_zone ON regrid_data(opportunity_zone);

-- Identifier indexes
CREATE INDEX IF NOT EXISTS idx_regrid_data_regrid_uuid ON regrid_data(regrid_uuid);
CREATE INDEX IF NOT EXISTS idx_regrid_data_alt_parcel_id ON regrid_data(alt_parcel_id);

-- ============================================================================
-- VERIFICATION QUERY (run after migration to confirm success)
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'regrid_data'
-- ORDER BY ordinal_position;

-- ============================================================================
-- ROLLBACK SQL (if needed to undo this migration)
-- ============================================================================
/*
-- Address
ALTER TABLE regrid_data DROP COLUMN IF EXISTS address;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS city;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS state;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS zip;

-- Owner
ALTER TABLE regrid_data DROP COLUMN IF EXISTS owner_name;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS mailing_address;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS mailing_city;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS mailing_state;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS mailing_zip;

-- Sales & Value
ALTER TABLE regrid_data DROP COLUMN IF EXISTS last_sale_price;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS last_sale_date;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS total_parcel_value;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS improvement_value;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS land_value;

-- Structure
ALTER TABLE regrid_data DROP COLUMN IF EXISTS number_of_stories;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS building_count;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS building_footprint_sqft;

-- Lot & Land
ALTER TABLE regrid_data DROP COLUMN IF EXISTS deed_acres;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS lot_type;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS terrain;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS road_type;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS land_description;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS parcel_use_code;

-- Utilities
ALTER TABLE regrid_data DROP COLUMN IF EXISTS gas_availability;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS electric_service;

-- Geographic
ALTER TABLE regrid_data DROP COLUMN IF EXISTS opportunity_zone;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS census_tract;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS census_block;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS census_blockgroup;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS neighborhood_code;

-- School & District
ALTER TABLE regrid_data DROP COLUMN IF EXISTS school_district;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS school_district_code;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS district_number;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS ward_number;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS map_number;

-- Identifiers
ALTER TABLE regrid_data DROP COLUMN IF EXISTS regrid_uuid;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS alt_parcel_id;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS control_number;

-- Clean & Green
ALTER TABLE regrid_data DROP COLUMN IF EXISTS clean_green_land_value;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS clean_green_building_value;
ALTER TABLE regrid_data DROP COLUMN IF EXISTS clean_green_total_value;

-- Drop indexes
DROP INDEX IF EXISTS idx_regrid_data_address;
DROP INDEX IF EXISTS idx_regrid_data_city;
DROP INDEX IF EXISTS idx_regrid_data_state;
DROP INDEX IF EXISTS idx_regrid_data_zip;
DROP INDEX IF EXISTS idx_regrid_data_owner_name;
DROP INDEX IF EXISTS idx_regrid_data_mailing_zip;
DROP INDEX IF EXISTS idx_regrid_data_last_sale_price;
DROP INDEX IF EXISTS idx_regrid_data_total_value;
DROP INDEX IF EXISTS idx_regrid_data_school_district;
DROP INDEX IF EXISTS idx_regrid_data_census_tract;
DROP INDEX IF EXISTS idx_regrid_data_opportunity_zone;
DROP INDEX IF EXISTS idx_regrid_data_regrid_uuid;
DROP INDEX IF EXISTS idx_regrid_data_alt_parcel_id;
*/
