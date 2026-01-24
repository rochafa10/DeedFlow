-- ============================================================================
-- Recently Viewed Properties Tracking
-- Tracks which properties users have viewed for quick access
-- ============================================================================

-- ============================================================================
-- TABLE: recently_viewed_properties
-- Stores user's recently viewed properties with timestamps
-- ============================================================================
CREATE TABLE IF NOT EXISTS recently_viewed_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Tracking Information
  viewed_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure unique combination per user/property, but allow updating viewed_at
  CONSTRAINT unique_user_property UNIQUE (user_id, property_id)
);

-- ============================================================================
-- INDEXES: Performance optimization for queries
-- ============================================================================

-- Index on user_id for quick lookup of user's viewed properties
CREATE INDEX idx_recently_viewed_user ON recently_viewed_properties(user_id);

-- Index on viewed_at for sorting by most recent
CREATE INDEX idx_recently_viewed_viewed_at ON recently_viewed_properties(viewed_at DESC);

-- Composite index for user + viewed_at for efficient user-specific queries
CREATE INDEX idx_recently_viewed_user_viewed_at ON recently_viewed_properties(user_id, viewed_at DESC);

-- Index on property_id for reverse lookups
CREATE INDEX idx_recently_viewed_property ON recently_viewed_properties(property_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access their own viewed properties
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE recently_viewed_properties ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own recently viewed properties
CREATE POLICY "Users can view their own recently viewed properties"
  ON recently_viewed_properties
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own recently viewed properties
CREATE POLICY "Users can insert their own recently viewed properties"
  ON recently_viewed_properties
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own recently viewed properties
CREATE POLICY "Users can update their own recently viewed properties"
  ON recently_viewed_properties
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own recently viewed properties
CREATE POLICY "Users can delete their own recently viewed properties"
  ON recently_viewed_properties
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTION: Upsert Recently Viewed Property
-- Updates viewed_at if property already viewed, otherwise inserts new record
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_recently_viewed_property(
  p_user_id UUID,
  p_property_id UUID
) RETURNS UUID AS $$
DECLARE
  v_record_id UUID;
BEGIN
  INSERT INTO recently_viewed_properties (user_id, property_id, viewed_at)
  VALUES (p_user_id, p_property_id, NOW())
  ON CONFLICT (user_id, property_id)
  DO UPDATE SET
    viewed_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get User's Recently Viewed Properties
-- Returns list of recently viewed properties with details
-- ============================================================================
CREATE OR REPLACE FUNCTION get_recently_viewed_properties(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  viewed_property_id UUID,
  property_id UUID,
  parcel_id TEXT,
  property_address TEXT,
  city TEXT,
  state_code TEXT,
  total_due NUMERIC,
  sale_date TIMESTAMP,
  viewed_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rv.id,
    p.id,
    p.parcel_id,
    p.property_address,
    p.city,
    p.state_code,
    p.total_due,
    p.sale_date,
    rv.viewed_at
  FROM recently_viewed_properties rv
  JOIN properties p ON p.id = rv.property_id
  WHERE rv.user_id = p_user_id
  ORDER BY rv.viewed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Clean Old Viewed Properties
-- Removes viewed properties older than specified days to prevent table bloat
-- ============================================================================
CREATE OR REPLACE FUNCTION clean_old_viewed_properties(
  p_days_old INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM recently_viewed_properties
  WHERE viewed_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_recently_viewed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recently_viewed_updated_at
  BEFORE UPDATE ON recently_viewed_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_recently_viewed_updated_at();

-- ============================================================================
-- COMMENTS: Documentation for the schema
-- ============================================================================
COMMENT ON TABLE recently_viewed_properties IS 'Tracks properties viewed by users for quick access and history';
COMMENT ON COLUMN recently_viewed_properties.user_id IS 'Reference to the user who viewed the property';
COMMENT ON COLUMN recently_viewed_properties.property_id IS 'Reference to the property that was viewed';
COMMENT ON COLUMN recently_viewed_properties.viewed_at IS 'Timestamp when the property was last viewed';
COMMENT ON FUNCTION upsert_recently_viewed_property IS 'Inserts or updates a recently viewed property record';
COMMENT ON FUNCTION get_recently_viewed_properties IS 'Returns a user''s recently viewed properties with property details';
COMMENT ON FUNCTION clean_old_viewed_properties IS 'Removes viewed property records older than specified days';
