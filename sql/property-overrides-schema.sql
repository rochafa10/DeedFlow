-- Property Overrides Schema - For User-Made Property Modifications
-- This tracks manual corrections and custom data that users add to properties

-- ============================================================================
-- TABLE: property_overrides
-- Stores user-made modifications to property data fields
-- Tracks original values to allow reverting changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS property_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Field Information
  field_name TEXT NOT NULL, -- e.g., 'total_due', 'property_address', 'assessed_value'
  original_value TEXT, -- Original value from data source (stored as text for flexibility)
  override_value TEXT, -- User's custom value (stored as text for flexibility)

  -- Change Context
  override_reason TEXT, -- Optional explanation for why the change was made
  created_by UUID, -- User ID who made the change (can be NULL for system changes)

  -- Status
  is_active BOOLEAN DEFAULT true, -- false = reverted, preserves history

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure only one active override per field per property
  CONSTRAINT unique_active_override UNIQUE (property_id, field_name, is_active)
    WHERE (is_active = true)
);

-- Indexes for performance
CREATE INDEX idx_property_overrides_property ON property_overrides(property_id);
CREATE INDEX idx_property_overrides_field ON property_overrides(field_name);
CREATE INDEX idx_property_overrides_active ON property_overrides(is_active);
CREATE INDEX idx_property_overrides_created_at ON property_overrides(created_at);
CREATE INDEX idx_property_overrides_created_by ON property_overrides(created_by);

-- Composite index for common query pattern: getting all active overrides for a property
CREATE INDEX idx_property_overrides_property_active ON property_overrides(property_id, is_active)
  WHERE (is_active = true);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE property_overrides IS 'Stores user-made modifications to property data with full change history';
COMMENT ON COLUMN property_overrides.field_name IS 'Name of the property field being overridden (e.g., total_due, property_address)';
COMMENT ON COLUMN property_overrides.original_value IS 'Original value from the data source before user modification';
COMMENT ON COLUMN property_overrides.override_value IS 'User-specified custom value';
COMMENT ON COLUMN property_overrides.override_reason IS 'Optional explanation for why the override was made';
COMMENT ON COLUMN property_overrides.is_active IS 'false = reverted override, preserves history for audit trail';
COMMENT ON CONSTRAINT unique_active_override ON property_overrides IS 'Ensures only one active override per field per property';

-- ============================================================================
-- HELPER FUNCTION: Upsert Property Override
-- Creates a new override or updates an existing one
-- Automatically deactivates any existing override for the same field
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_property_override(
  p_property_id UUID,
  p_field_name TEXT,
  p_original_value TEXT,
  p_override_value TEXT,
  p_override_reason TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_override_id UUID;
BEGIN
  -- First, deactivate any existing active override for this field
  UPDATE property_overrides
  SET is_active = false, updated_at = NOW()
  WHERE property_id = p_property_id
    AND field_name = p_field_name
    AND is_active = true;

  -- Insert the new override
  INSERT INTO property_overrides (
    property_id,
    field_name,
    original_value,
    override_value,
    override_reason,
    created_by,
    is_active
  ) VALUES (
    p_property_id,
    p_field_name,
    p_original_value,
    p_override_value,
    p_override_reason,
    p_created_by,
    true
  )
  RETURNING id INTO v_override_id;

  RETURN v_override_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Revert Property Override
-- Marks an override as inactive, restoring the original value
-- ============================================================================
CREATE OR REPLACE FUNCTION revert_property_override(
  p_property_id UUID,
  p_field_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_rows_affected INTEGER;
BEGIN
  UPDATE property_overrides
  SET is_active = false, updated_at = NOW()
  WHERE property_id = p_property_id
    AND field_name = p_field_name
    AND is_active = true;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get Property Overrides
-- Returns all active overrides for a specific property
-- ============================================================================
CREATE OR REPLACE FUNCTION get_property_overrides(
  p_property_id UUID
) RETURNS TABLE (
  override_id UUID,
  field_name TEXT,
  original_value TEXT,
  override_value TEXT,
  override_reason TEXT,
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    property_overrides.field_name,
    property_overrides.original_value,
    property_overrides.override_value,
    property_overrides.override_reason,
    property_overrides.created_by,
    property_overrides.created_at,
    property_overrides.updated_at
  FROM property_overrides
  WHERE property_overrides.property_id = p_property_id
    AND is_active = true
  ORDER BY property_overrides.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get Override History
-- Returns the complete history of changes for a specific field
-- ============================================================================
CREATE OR REPLACE FUNCTION get_override_history(
  p_property_id UUID,
  p_field_name TEXT DEFAULT NULL
) RETURNS TABLE (
  override_id UUID,
  field_name TEXT,
  original_value TEXT,
  override_value TEXT,
  override_reason TEXT,
  created_by UUID,
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    property_overrides.field_name,
    property_overrides.original_value,
    property_overrides.override_value,
    property_overrides.override_reason,
    property_overrides.created_by,
    property_overrides.is_active,
    property_overrides.created_at,
    property_overrides.updated_at
  FROM property_overrides
  WHERE property_overrides.property_id = p_property_id
    AND (p_field_name IS NULL OR property_overrides.field_name = p_field_name)
  ORDER BY property_overrides.field_name, property_overrides.created_at DESC;
END;
$$ LANGUAGE plpgsql;
