-- ============================================================================
-- Migration: Add Regrid Sync Columns to Properties Table
-- Date: 2026-01-27
-- Purpose: Add columns to properties table to store synced data from regrid_data
--          This enables direct access to key property attributes without joins,
--          improving query performance for property listings and reports.
-- ============================================================================

-- Year the building was constructed (from regrid_data.year_built)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS year_built INTEGER;
COMMENT ON COLUMN properties.year_built IS 'Year the building was constructed, synced from Regrid data';

-- Number of bedrooms (from regrid_data.bedrooms)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bedrooms INTEGER;
COMMENT ON COLUMN properties.bedrooms IS 'Number of bedrooms, synced from Regrid data';

-- Number of bathrooms, allows half baths (from regrid_data.bathrooms)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bathrooms NUMERIC(3,1);
COMMENT ON COLUMN properties.bathrooms IS 'Number of bathrooms (supports half baths like 2.5), synced from Regrid data';

-- Building square footage (from regrid_data.building_sqft)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_sqft NUMERIC(10,2);
COMMENT ON COLUMN properties.building_sqft IS 'Total building square footage, synced from Regrid data';

-- Lot size in square feet (from regrid_data.lot_size_sqft)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lot_size_sqft NUMERIC(12,2);
COMMENT ON COLUMN properties.lot_size_sqft IS 'Lot size in square feet, synced from Regrid data';

-- Lot size in acres (from regrid_data.lot_size_acres)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lot_size_acres NUMERIC(10,4);
COMMENT ON COLUMN properties.lot_size_acres IS 'Lot size in acres, synced from Regrid data';

-- Estimated market value (from regrid_data.market_value)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS market_value NUMERIC(12,2);
COMMENT ON COLUMN properties.market_value IS 'Estimated market value from Regrid, useful for ROI calculations';

-- Zoning classification (from regrid_data.zoning)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS zoning TEXT;
COMMENT ON COLUMN properties.zoning IS 'Zoning classification (e.g., R-1, C-2), synced from Regrid data';

-- Land use category (from regrid_data.land_use)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS land_use TEXT;
COMMENT ON COLUMN properties.land_use IS 'Land use classification (e.g., RESIDENTIAL, COMMERCIAL), synced from Regrid data';

-- Property type from Regrid (from regrid_data.property_type)
-- Note: properties table already has property_type, this is the Regrid-specific classification
ALTER TABLE properties ADD COLUMN IF NOT EXISTS regrid_property_type TEXT;
COMMENT ON COLUMN properties.regrid_property_type IS 'Property type classification from Regrid (may differ from parsed property_type)';

-- Screenshot URL for quick access (from regrid_screenshots.storage_url)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
COMMENT ON COLUMN properties.screenshot_url IS 'URL to property screenshot stored in Supabase storage, synced from regrid_screenshots';

-- Timestamp of last Regrid data sync
ALTER TABLE properties ADD COLUMN IF NOT EXISTS regrid_synced_at TIMESTAMPTZ;
COMMENT ON COLUMN properties.regrid_synced_at IS 'Timestamp when Regrid data was last synced to this record';

-- ============================================================================
-- Add indexes for commonly queried columns
-- ============================================================================

-- Index for filtering by year built (common search criteria)
CREATE INDEX IF NOT EXISTS idx_properties_year_built ON properties(year_built);

-- Index for filtering by bedrooms (common search criteria)
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties(bedrooms);

-- Index for filtering by building size (range queries)
CREATE INDEX IF NOT EXISTS idx_properties_building_sqft ON properties(building_sqft);

-- Index for filtering by lot size (range queries)
CREATE INDEX IF NOT EXISTS idx_properties_lot_size_acres ON properties(lot_size_acres);

-- Index for filtering by zoning (categorical queries)
CREATE INDEX IF NOT EXISTS idx_properties_zoning ON properties(zoning);

-- Index for filtering by land use (categorical queries)
CREATE INDEX IF NOT EXISTS idx_properties_land_use ON properties(land_use);

-- Index for finding properties that need Regrid sync
CREATE INDEX IF NOT EXISTS idx_properties_regrid_synced_at ON properties(regrid_synced_at);

-- ============================================================================
-- End of migration
-- ============================================================================
