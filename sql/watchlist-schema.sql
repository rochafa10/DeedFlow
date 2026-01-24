-- Property Watchlist Tables - User-Managed Property Lists
-- Allows investors to organize and track properties across multiple counties

-- ============================================================================
-- TABLE: watchlists
-- Stores named watchlists (e.g., 'High Priority', 'Research Needed', 'Ready to Bid')
-- ============================================================================
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Watchlist Details
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6', -- Optional color coding for UI

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_watchlist_per_user UNIQUE (user_id, name)
);

-- Indexes for performance
CREATE INDEX idx_watchlists_user ON watchlists(user_id);
CREATE INDEX idx_watchlists_created ON watchlists(created_at DESC);

-- ============================================================================
-- TABLE: watchlist_items
-- Tracks properties added to watchlists with user notes and bidding limits
-- ============================================================================
CREATE TABLE IF NOT EXISTS watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Investor Tracking
  max_bid NUMERIC(12,2), -- Maximum bid investor is willing to place
  notes TEXT, -- Research notes, concerns, investment thesis
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent

  -- Status Tracking
  last_status TEXT, -- Track last known sale_status to detect changes
  status_changed_at TIMESTAMP,

  -- Metadata
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_property_per_watchlist UNIQUE (watchlist_id, property_id)
);

-- Indexes for performance
CREATE INDEX idx_watchlist_items_watchlist ON watchlist_items(watchlist_id);
CREATE INDEX idx_watchlist_items_property ON watchlist_items(property_id);
CREATE INDEX idx_watchlist_items_priority ON watchlist_items(priority);
CREATE INDEX idx_watchlist_items_added ON watchlist_items(added_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access their own watchlists
-- ============================================================================

-- Enable RLS on watchlists table
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own watchlists
CREATE POLICY watchlists_select_policy ON watchlists
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert only their own watchlists
CREATE POLICY watchlists_insert_policy ON watchlists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own watchlists
CREATE POLICY watchlists_update_policy ON watchlists
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete only their own watchlists
CREATE POLICY watchlists_delete_policy ON watchlists
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on watchlist_items table
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view items only from their own watchlists
CREATE POLICY watchlist_items_select_policy ON watchlist_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_items.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  );

-- Policy: Users can insert items only to their own watchlists
CREATE POLICY watchlist_items_insert_policy ON watchlist_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_items.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  );

-- Policy: Users can update items only in their own watchlists
CREATE POLICY watchlist_items_update_policy ON watchlist_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_items.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  );

-- Policy: Users can delete items only from their own watchlists
CREATE POLICY watchlist_items_delete_policy ON watchlist_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_items.watchlist_id
      AND watchlists.user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Create Watchlist
-- ============================================================================
CREATE OR REPLACE FUNCTION create_watchlist(
  p_user_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_color TEXT DEFAULT '#3b82f6'
) RETURNS UUID AS $$
DECLARE
  v_watchlist_id UUID;
BEGIN
  INSERT INTO watchlists (user_id, name, description, color)
  VALUES (p_user_id, p_name, p_description, p_color)
  RETURNING id INTO v_watchlist_id;

  RETURN v_watchlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Add Property to Watchlist
-- ============================================================================
CREATE OR REPLACE FUNCTION add_to_watchlist(
  p_watchlist_id UUID,
  p_property_id UUID,
  p_max_bid NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium'
) RETURNS UUID AS $$
DECLARE
  v_item_id UUID;
  v_current_status TEXT;
BEGIN
  -- Get current property status
  SELECT sale_status INTO v_current_status
  FROM properties
  WHERE id = p_property_id;

  -- Insert or update watchlist item
  INSERT INTO watchlist_items (
    watchlist_id, property_id, max_bid, notes, priority,
    last_status, status_changed_at
  )
  VALUES (
    p_watchlist_id, p_property_id, p_max_bid, p_notes, p_priority,
    v_current_status, NOW()
  )
  ON CONFLICT (watchlist_id, property_id)
  DO UPDATE SET
    max_bid = COALESCE(EXCLUDED.max_bid, watchlist_items.max_bid),
    notes = COALESCE(EXCLUDED.notes, watchlist_items.notes),
    priority = COALESCE(EXCLUDED.priority, watchlist_items.priority),
    updated_at = NOW()
  RETURNING id INTO v_item_id;

  RETURN v_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Remove Property from Watchlist
-- ============================================================================
CREATE OR REPLACE FUNCTION remove_from_watchlist(
  p_watchlist_id UUID,
  p_property_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM watchlist_items
  WHERE watchlist_id = p_watchlist_id
    AND property_id = p_property_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Update Watchlist Item
-- ============================================================================
CREATE OR REPLACE FUNCTION update_watchlist_item(
  p_item_id UUID,
  p_max_bid NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE watchlist_items
  SET
    max_bid = COALESCE(p_max_bid, max_bid),
    notes = COALESCE(p_notes, notes),
    priority = COALESCE(p_priority, priority),
    updated_at = NOW()
  WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Detect Status Changes for Watched Properties
-- ============================================================================
CREATE OR REPLACE FUNCTION detect_watchlist_status_changes()
RETURNS TABLE (
  item_id UUID,
  user_id UUID,
  watchlist_name TEXT,
  property_address TEXT,
  old_status TEXT,
  new_status TEXT,
  changed_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wi.id,
    w.user_id,
    w.name,
    p.property_address,
    wi.last_status,
    p.sale_status,
    NOW()
  FROM watchlist_items wi
  JOIN watchlists w ON w.id = wi.watchlist_id
  JOIN properties p ON p.id = wi.property_id
  WHERE wi.last_status IS DISTINCT FROM p.sale_status
    AND p.sale_status IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Update Status for Watched Properties
-- ============================================================================
CREATE OR REPLACE FUNCTION update_watchlist_statuses()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  WITH status_changes AS (
    SELECT wi.id, p.sale_status
    FROM watchlist_items wi
    JOIN properties p ON p.id = wi.property_id
    WHERE wi.last_status IS DISTINCT FROM p.sale_status
      AND p.sale_status IS NOT NULL
  )
  UPDATE watchlist_items
  SET
    last_status = status_changes.sale_status,
    status_changed_at = NOW(),
    updated_at = NOW()
  FROM status_changes
  WHERE watchlist_items.id = status_changes.id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Watchlist Items with Full Property Details
-- ============================================================================
CREATE OR REPLACE VIEW vw_watchlist_items_complete AS
SELECT
  wi.id as item_id,
  wi.watchlist_id,
  wi.max_bid,
  wi.notes,
  wi.priority,
  wi.last_status,
  wi.status_changed_at,
  wi.added_at,
  wi.updated_at,
  w.user_id,
  w.name as watchlist_name,
  w.description as watchlist_description,
  w.color as watchlist_color,
  p.id as property_id,
  p.parcel_id,
  p.property_address,
  p.city,
  p.state_code,
  p.zip_code,
  p.owner_name,
  p.total_due,
  p.assessed_value,
  p.sale_type,
  p.sale_date,
  p.sale_status,
  c.county_name,
  c.state_code as county_state
FROM watchlist_items wi
JOIN watchlists w ON w.id = wi.watchlist_id
JOIN properties p ON p.id = wi.property_id
JOIN counties c ON c.id = p.county_id;

-- ============================================================================
-- VIEW: Watchlist Summary
-- ============================================================================
CREATE OR REPLACE VIEW vw_watchlist_summary AS
SELECT
  w.id as watchlist_id,
  w.user_id,
  w.name,
  w.description,
  w.color,
  w.created_at,
  w.updated_at,
  COUNT(wi.id) as item_count,
  SUM(CASE WHEN wi.priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count,
  SUM(CASE WHEN wi.priority = 'high' THEN 1 ELSE 0 END) as high_count,
  SUM(CASE WHEN wi.priority = 'medium' THEN 1 ELSE 0 END) as medium_count,
  SUM(CASE WHEN wi.priority = 'low' THEN 1 ELSE 0 END) as low_count,
  MIN(p.sale_date) as next_auction_date
FROM watchlists w
LEFT JOIN watchlist_items wi ON wi.watchlist_id = w.id
LEFT JOIN properties p ON p.id = wi.property_id
GROUP BY w.id, w.user_id, w.name, w.description, w.color, w.created_at, w.updated_at;

-- ============================================================================
-- VIEW: Properties with Status Changes
-- ============================================================================
CREATE OR REPLACE VIEW vw_watchlist_status_changes AS
SELECT
  wi.id as item_id,
  w.user_id,
  w.name as watchlist_name,
  p.property_address,
  p.city,
  c.county_name,
  c.state_code,
  wi.last_status as old_status,
  p.sale_status as current_status,
  wi.status_changed_at,
  p.sale_date
FROM watchlist_items wi
JOIN watchlists w ON w.id = wi.watchlist_id
JOIN properties p ON p.id = wi.property_id
JOIN counties c ON c.id = p.county_id
WHERE wi.last_status IS DISTINCT FROM p.sale_status
  AND p.sale_status IS NOT NULL
ORDER BY wi.status_changed_at DESC;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Create a watchlist
/*
SELECT create_watchlist(
  auth.uid(),
  'High Priority Properties',
  'Properties with highest ROI potential',
  '#22c55e'
);
*/

-- Example 2: Add property to watchlist
/*
SELECT add_to_watchlist(
  'watchlist-uuid-here',
  'property-uuid-here',
  25000.00,  -- max bid
  'Great location, needs roof repair',
  'high'
);
*/

-- Example 3: Update watchlist item
/*
SELECT update_watchlist_item(
  'item-uuid-here',
  30000.00,  -- new max bid
  'Updated after inspection',
  'urgent'
);
*/

-- Example 4: Remove property from watchlist
/*
SELECT remove_from_watchlist(
  'watchlist-uuid-here',
  'property-uuid-here'
);
*/

-- Example 5: View all items in a watchlist with full property details
/*
SELECT * FROM vw_watchlist_items_complete
WHERE watchlist_id = 'watchlist-uuid-here'
ORDER BY priority DESC, sale_date ASC;
*/

-- Example 6: Get watchlist summary for a user
/*
SELECT * FROM vw_watchlist_summary
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
*/

-- Example 7: Detect status changes for watched properties
/*
SELECT * FROM detect_watchlist_status_changes();
*/

-- Example 8: Update all watchlist statuses
/*
SELECT update_watchlist_statuses();
*/

-- Example 9: View recent status changes
/*
SELECT * FROM vw_watchlist_status_changes
WHERE user_id = auth.uid()
ORDER BY status_changed_at DESC
LIMIT 20;
*/

-- Example 10: Get high priority properties with upcoming auctions
/*
SELECT * FROM vw_watchlist_items_complete
WHERE user_id = auth.uid()
  AND priority IN ('high', 'urgent')
  AND sale_date > NOW()
  AND sale_date < NOW() + INTERVAL '30 days'
ORDER BY sale_date ASC;
*/
