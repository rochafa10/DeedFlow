-- Migration: 20260123000001_create_property_overrides.sql
-- Description: Create property_overrides table for persisting user-made property modifications
-- Author: Claude Code Agent
-- Date: 2026-01-23
-- Dependencies: properties table must exist

BEGIN;

-- ============================================
-- Table: property_overrides
-- Stores user-made modifications to property data fields
-- Tracks original values to allow reverting changes
-- ============================================
CREATE TABLE IF NOT EXISTS property_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Field Information
  field_name TEXT NOT NULL, -- e.g., 'total_due', 'property_address', 'assessed_value'
  original_value TEXT, -- Original value from data source (stored as text for flexibility)
  override_value TEXT, -- User's custom value (stored as text for flexibility)

  -- Change Context
  override_reason TEXT, -- Optional explanation for why the change was made
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User ID who made the change

  -- Status
  is_active BOOLEAN DEFAULT true, -- false = reverted, preserves history

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for common query patterns
-- ============================================

-- Single-column indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_property_overrides_property ON property_overrides(property_id);
CREATE INDEX IF NOT EXISTS idx_property_overrides_field ON property_overrides(field_name);
CREATE INDEX IF NOT EXISTS idx_property_overrides_active ON property_overrides(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_property_overrides_created_at ON property_overrides(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_overrides_created_by ON property_overrides(created_by);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_property_overrides_property_active ON property_overrides(property_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_property_overrides_property_created ON property_overrides(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_overrides_user_created ON property_overrides(created_by, created_at DESC) WHERE created_by IS NOT NULL;

-- Partial unique index to ensure only one active override per field per property
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_overrides_unique_active ON property_overrides(property_id, field_name) WHERE is_active = true;

-- ============================================
-- Table comments and documentation
-- ============================================
COMMENT ON TABLE property_overrides IS 'Stores user-made modifications to property data with full change history';
COMMENT ON COLUMN property_overrides.field_name IS 'Name of the property field being overridden (e.g., total_due, property_address)';
COMMENT ON COLUMN property_overrides.original_value IS 'Original value from the data source before user modification';
COMMENT ON COLUMN property_overrides.override_value IS 'User-specified custom value';
COMMENT ON COLUMN property_overrides.override_reason IS 'Optional explanation for why the override was made';
COMMENT ON COLUMN property_overrides.is_active IS 'false = reverted override, preserves history for audit trail';
COMMENT ON COLUMN property_overrides.created_by IS 'User who created this override, NULL for system-generated changes';

COMMIT;
