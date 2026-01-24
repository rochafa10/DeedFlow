-- Saved Searches Table - For Advanced Property Search & Filters
-- Stores user-defined search criteria for quick access and reuse

-- ============================================================================
-- TABLE: saved_searches
-- Stores saved search filters with complex criteria
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Search Metadata
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,

  -- Filter Criteria (JSONB for flexible structure)
  -- Structure: {
  --   scoreMin: number (0-125),
  --   scoreMax: number (0-125),
  --   counties: string[] (county names),
  --   riskFactors: {
  --     flood: 'low' | 'medium' | 'high' | null,
  --     fire: 'low' | 'medium' | 'high' | null,
  --     earthquake: 'low' | 'medium' | 'high' | null,
  --     environmental: 'low' | 'medium' | 'high' | null
  --   },
  --   polygonCoords: [[lat, lng], ...] (map polygon coordinates)
  -- }
  filter_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_search_name UNIQUE (user_id, name)
);

-- Indexes for performance
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_default ON saved_searches(user_id, is_default) WHERE is_default = TRUE;
CREATE INDEX idx_saved_searches_created ON saved_searches(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensure users can only access their own saved searches
-- ============================================================================

-- Enable RLS
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own saved searches
CREATE POLICY "Users can view own saved searches"
  ON saved_searches
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own saved searches
CREATE POLICY "Users can create own saved searches"
  ON saved_searches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own saved searches
CREATE POLICY "Users can update own saved searches"
  ON saved_searches
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own saved searches
CREATE POLICY "Users can delete own saved searches"
  ON saved_searches
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTION: Get User's Saved Searches
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_saved_searches(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  id UUID,
  name TEXT,
  filter_criteria JSONB,
  is_default BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.filter_criteria,
    s.is_default,
    s.created_at,
    s.updated_at
  FROM saved_searches s
  WHERE s.user_id = p_user_id
  ORDER BY s.is_default DESC, s.updated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Set Default Search
-- Ensures only one search is marked as default per user
-- ============================================================================
CREATE OR REPLACE FUNCTION set_default_search(
  p_search_id UUID,
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Remove default flag from all user's searches
  UPDATE saved_searches
  SET is_default = FALSE, updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Set new default
  UPDATE saved_searches
  SET is_default = TRUE, updated_at = NOW()
  WHERE id = p_search_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Upsert Saved Search
-- Create or update search by name (prevents duplicates)
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_saved_search(
  p_user_id UUID,
  p_name TEXT,
  p_filter_criteria JSONB,
  p_is_default BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  v_search_id UUID;
BEGIN
  INSERT INTO saved_searches (user_id, name, filter_criteria, is_default, updated_at)
  VALUES (p_user_id, p_name, p_filter_criteria, p_is_default, NOW())
  ON CONFLICT (user_id, name)
  DO UPDATE SET
    filter_criteria = EXCLUDED.filter_criteria,
    is_default = EXCLUDED.is_default,
    updated_at = NOW()
  RETURNING id INTO v_search_id;

  -- If this is set as default, ensure no other searches are default
  IF p_is_default THEN
    PERFORM set_default_search(v_search_id, p_user_id);
  END IF;

  RETURN v_search_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_saved_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_searches_updated_at();
