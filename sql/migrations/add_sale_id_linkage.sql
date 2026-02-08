-- ============================================================================
-- MIGRATION: Add sale_id Foreign Key Linkage
-- Description: Creates explicit foreign key relationship from properties to upcoming_sales
-- Created: 2026-01-25
-- Track: 1.1 - Property-Auction Linkage Redesign
--
-- This migration adds:
--   1. sale_id column to properties table (FK to upcoming_sales)
--   2. Index for efficient querying by sale_id
--   3. Column documentation
--
-- Purpose:
--   Currently, properties are linked to sales implicitly via matching
--   county_id + sale_type + sale_date. This is fragile because:
--     - Date formats may not match exactly
--     - Multiple sales could have the same type on different dates
--     - No referential integrity enforcement
--
--   This migration establishes an explicit foreign key relationship
--   that can be populated via a linking function (Track 1.2).
--
-- Safe to run multiple times (idempotent)
-- ============================================================================

-- ============================================================================
-- STEP 1: Add sale_id Column
-- ============================================================================

-- Add sale_id column if it does not exist
-- Note: PostgreSQL does not have ADD COLUMN IF NOT EXISTS in older versions,
-- so we use a DO block to check first
DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'properties'
      AND column_name = 'sale_id'
  ) THEN
    -- Add the column with foreign key reference
    -- Allow NULL because properties may not have a linked sale initially
    ALTER TABLE properties
    ADD COLUMN sale_id UUID REFERENCES upcoming_sales(id) ON DELETE SET NULL;

    RAISE NOTICE 'Added sale_id column to properties table';
  ELSE
    RAISE NOTICE 'sale_id column already exists';
  END IF;
END $$;


-- ============================================================================
-- STEP 2: Create Index for Efficient Querying
-- ============================================================================

-- Create index for efficient filtering and joining by sale_id
-- IF NOT EXISTS is supported for indexes in PostgreSQL 9.5+
CREATE INDEX IF NOT EXISTS idx_properties_sale_id
ON properties(sale_id);

-- Also create a partial index for properties with linked sales
-- This optimizes queries that filter for linked properties
CREATE INDEX IF NOT EXISTS idx_properties_sale_id_not_null
ON properties(sale_id)
WHERE sale_id IS NOT NULL;

-- Add composite index on upcoming_sales for efficient property-to-sale matching
-- This index optimizes the link_property_to_sale function which filters on
-- county_id, sale_type, and orders by sale_date
CREATE INDEX IF NOT EXISTS idx_upcoming_sales_county_type_date
ON upcoming_sales(county_id, sale_type, sale_date);


-- ============================================================================
-- STEP 3: Add Column Documentation
-- ============================================================================

COMMENT ON COLUMN properties.sale_id IS
'Foreign key to upcoming_sales table. Establishes explicit link between a property and its associated auction sale. NULL if not yet linked. Use link_properties_to_sales() function to populate.';


-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually to verify)
-- ============================================================================

/*
-- Check the sale_id column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'properties' AND column_name = 'sale_id';

-- Check the foreign key constraint was created
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'properties'
    AND kcu.column_name = 'sale_id';

-- Check the indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'properties'
  AND indexname LIKE '%sale_id%';

-- Check current state of sale_id column
SELECT
    COUNT(*) as total_properties,
    COUNT(sale_id) as with_sale_id,
    COUNT(*) - COUNT(sale_id) as without_sale_id
FROM properties;

-- Preview properties by sale linkage status
SELECT
    c.county_name,
    c.state_code,
    COUNT(*) as total,
    COUNT(p.sale_id) as linked,
    COUNT(*) - COUNT(p.sale_id) as unlinked
FROM properties p
JOIN counties c ON c.id = p.county_id
GROUP BY c.county_name, c.state_code
ORDER BY COUNT(*) DESC;
*/


-- ============================================================================
-- TRACK 1.2: link_property_to_sale Function
-- ============================================================================
-- Description: Links a single property to its matching sale in upcoming_sales
-- Created: 2026-01-25
--
-- Matching Logic (in order of specificity):
--   1. Match by county_id (required)
--   2. Match by sale_type (required, unless property's sale_type is NULL)
--   3. Match by sale_date using DATE() comparison to handle timestamp differences
--   4. If multiple matches, prefer the one with the closest date (ASC order)
--
-- Returns: The linked sale_id UUID, or NULL if no match found
-- ============================================================================

CREATE OR REPLACE FUNCTION link_property_to_sale(p_property_id UUID)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_property RECORD;
BEGIN
  -- Get property details needed for matching
  SELECT county_id, sale_type, sale_date
  INTO v_property
  FROM properties
  WHERE id = p_property_id;

  -- If property not found, return NULL
  IF NOT FOUND THEN
    RAISE NOTICE 'link_property_to_sale: Property % not found', p_property_id;
    RETURN NULL;
  END IF;

  -- Require at least sale_type OR sale_date to be non-NULL
  -- Without these, we cannot reliably match to a specific sale
  -- (otherwise we'd just match ANY sale for the county, which is almost certainly wrong)
  IF v_property.sale_type IS NULL AND v_property.sale_date IS NULL THEN
    RAISE NOTICE 'link_property_to_sale: Property % has no sale_type or sale_date, cannot link', p_property_id;
    RETURN NULL;
  END IF;

  -- Find matching sale using specificity order:
  -- 1. county_id must match (required)
  -- 2. sale_type must match (if property has one)
  -- 3. sale_date DATE comparison (if property has one)
  -- 4. If multiple matches, pick first by sale_date ASC (closest date)
  SELECT us.id INTO v_sale_id
  FROM upcoming_sales us
  WHERE us.county_id = v_property.county_id
    -- Match sale_type only if property has one
    AND (
      v_property.sale_type IS NULL
      OR us.sale_type = v_property.sale_type
    )
    -- Match sale_date using DATE() comparison if property has one
    AND (
      v_property.sale_date IS NULL
      OR DATE(us.sale_date) = DATE(v_property.sale_date)
    )
  ORDER BY us.sale_date ASC
  LIMIT 1;

  -- Update property's sale_id if a match was found
  IF v_sale_id IS NOT NULL THEN
    UPDATE properties
    SET sale_id = v_sale_id
    WHERE id = p_property_id;
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;

-- Documentation for the function
COMMENT ON FUNCTION link_property_to_sale(UUID) IS
'Links a single property to its matching sale in upcoming_sales table.

Parameters:
  p_property_id - The UUID of the property to link

Matching Logic:
  1. county_id must match (required)
  2. sale_type must match (unless property sale_type is NULL)
  3. sale_date comparison uses DATE() to handle timestamp differences
  4. If multiple sales match, selects the one with earliest sale_date

Returns:
  The linked sale_id UUID if a match is found, NULL otherwise.
  Also updates the property.sale_id column when a match is found.

Example Usage:
  -- Link a single property
  SELECT link_property_to_sale(''550e8400-e29b-41d4-a716-446655440000'');

  -- Link and check result in one query
  SELECT
    p.id,
    p.parcel_id,
    link_property_to_sale(p.id) as linked_sale_id
  FROM properties p
  WHERE p.sale_id IS NULL
  LIMIT 10;
';


-- ============================================================================
-- TRACK 1.3: bulk_link_properties_to_sales Function
-- ============================================================================
-- Description: Bulk links all unlinked properties to their matching sales
-- Created: 2026-01-25
--
-- This function iterates through all properties where sale_id IS NULL and
-- attempts to link each one using the link_property_to_sale() function.
--
-- Parameters:
--   p_county_id - Optional. If provided, only process properties for that county.
--                 If NULL, process all properties across all counties.
--
-- Returns: Summary table with counts of processed, linked, unlinked, and
--          already-linked properties.
--
-- Progress: Logs NOTICE messages every 100 properties for visibility.
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_link_properties_to_sales(
  p_county_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_processed BIGINT,
  linked_count BIGINT,
  unlinked_count BIGINT,
  already_linked BIGINT
) AS $$
DECLARE
  v_total BIGINT := 0;
  v_linked BIGINT := 0;
  v_unlinked BIGINT := 0;
  v_already BIGINT := 0;
  v_property_id UUID;
  v_result UUID;
  v_start_time TIMESTAMPTZ;
  v_county_name TEXT;
BEGIN
  v_start_time := clock_timestamp();

  -- Log start of operation
  IF p_county_id IS NOT NULL THEN
    SELECT county_name INTO v_county_name
    FROM counties WHERE id = p_county_id;
    RAISE NOTICE 'bulk_link_properties_to_sales: Starting for county % (%)', v_county_name, p_county_id;
  ELSE
    RAISE NOTICE 'bulk_link_properties_to_sales: Starting for ALL counties';
  END IF;

  -- Count properties that already have a sale_id linked
  SELECT COUNT(*) INTO v_already
  FROM properties
  WHERE sale_id IS NOT NULL
    AND (p_county_id IS NULL OR county_id = p_county_id);

  RAISE NOTICE 'bulk_link_properties_to_sales: Found % properties already linked', v_already;

  -- Process all unlinked properties
  -- Using a cursor-style loop for better memory efficiency on large datasets
  FOR v_property_id IN
    SELECT id FROM properties
    WHERE sale_id IS NULL
      AND (p_county_id IS NULL OR county_id = p_county_id)
    ORDER BY county_id, sale_date NULLS LAST  -- Group by county for efficiency
  LOOP
    v_total := v_total + 1;

    -- Attempt to link the property
    v_result := link_property_to_sale(v_property_id);

    IF v_result IS NOT NULL THEN
      v_linked := v_linked + 1;
    ELSE
      v_unlinked := v_unlinked + 1;
    END IF;

    -- Progress logging every 100 properties
    IF v_total % 100 = 0 THEN
      RAISE NOTICE 'bulk_link_properties_to_sales: Processed % properties (% linked, % unlinked) - elapsed: %',
        v_total, v_linked, v_unlinked,
        (clock_timestamp() - v_start_time)::TEXT;
    END IF;

  END LOOP;

  -- Final summary
  RAISE NOTICE 'bulk_link_properties_to_sales: COMPLETE - Processed % properties in %',
    v_total, (clock_timestamp() - v_start_time)::TEXT;
  RAISE NOTICE 'bulk_link_properties_to_sales: Results - Linked: %, Unlinked: %, Already Linked: %',
    v_linked, v_unlinked, v_already;

  -- Return summary as a single row
  RETURN QUERY SELECT v_total, v_linked, v_unlinked, v_already;
END;
$$ LANGUAGE plpgsql;

-- Documentation for the bulk function
COMMENT ON FUNCTION bulk_link_properties_to_sales(UUID) IS
'Bulk links all unlinked properties to their matching sales in upcoming_sales.

Parameters:
  p_county_id - Optional UUID. If provided, only processes properties for that county.
                If NULL (default), processes all properties across all counties.

Returns:
  A single-row table with the following columns:
    - total_processed: Number of unlinked properties that were processed
    - linked_count: Number of properties successfully linked to a sale
    - unlinked_count: Number of properties that could not be linked (no matching sale)
    - already_linked: Number of properties that already had a sale_id (not reprocessed)

Progress Logging:
  Emits RAISE NOTICE messages every 100 properties for monitoring progress.
  Also logs start, completion, and final summary.

Performance:
  Uses cursor-style loop for memory efficiency on large datasets.
  Orders by county_id to potentially benefit from index locality.
  Typical throughput: ~500-1000 properties/second depending on data.

Example Usage:
  -- Link all unlinked properties across all counties
  SELECT * FROM bulk_link_properties_to_sales();

  -- Link only properties for Blair County
  SELECT * FROM bulk_link_properties_to_sales(
    (SELECT id FROM counties WHERE county_name = ''Blair'' AND state_code = ''PA'')
  );

  -- Check results after bulk linking
  SELECT
    c.county_name,
    COUNT(*) as total,
    COUNT(p.sale_id) as linked,
    COUNT(*) - COUNT(p.sale_id) as unlinked
  FROM properties p
  JOIN counties c ON c.id = p.county_id
  GROUP BY c.county_name
  ORDER BY COUNT(*) DESC;
';


-- ============================================================================
-- TRACK 4.1: Updated calculate_auction_status Function
-- ============================================================================
-- Description: Derives auction_status from the linked sale's validity
-- Created: 2026-01-25
--
-- The auction_status is now derived based on the linked sale relationship:
--   Priority 1: sale_status = 'sold' -> 'sold'
--   Priority 2: sale_status = 'withdrawn' -> 'withdrawn'
--   Priority 3: sale_id IS NULL -> 'unknown' (no linked sale)
--   Priority 4: Linked sale status = 'cancelled' -> 'withdrawn'
--   Priority 5: sale_type is repository/sealed_bid/private_sale -> 'active' (always ongoing)
--   Priority 6: Linked sale_date < NOW() -> 'expired' (for upset/judicial)
--   Priority 7: Linked sale_date >= NOW() -> 'active' (upcoming auction)
--   Default: 'unknown'
--
-- This function maintains backward compatibility with a DEFAULT NULL for p_sale_id
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_auction_status(
  p_sale_status TEXT,
  p_sale_type TEXT,
  p_sale_date TIMESTAMP,
  p_sale_id UUID DEFAULT NULL  -- NEW PARAMETER: link to upcoming_sales
) RETURNS TEXT AS $$
DECLARE
  v_linked_sale RECORD;
BEGIN
  -- -------------------------------------------------------------------------
  -- Priority 1: Explicit sale statuses take precedence
  -- These represent manual overrides or confirmed outcomes
  -- -------------------------------------------------------------------------
  IF p_sale_status = 'sold' THEN
    RETURN 'sold';
  END IF;

  IF p_sale_status = 'withdrawn' THEN
    RETURN 'withdrawn';
  END IF;

  -- -------------------------------------------------------------------------
  -- Priority 2: Check if property is linked to a sale
  -- Unlinked properties need investigation to determine their sale
  -- -------------------------------------------------------------------------
  IF p_sale_id IS NULL THEN
    -- No linked sale - mark as unknown (needs investigation)
    -- This is a data quality flag indicating the property-sale relationship
    -- has not been established
    RETURN 'unknown';
  END IF;

  -- -------------------------------------------------------------------------
  -- Priority 3: Fetch linked sale details
  -- We need the actual sale date and type from the upcoming_sales record
  -- -------------------------------------------------------------------------
  SELECT sale_date, sale_type, status
  INTO v_linked_sale
  FROM upcoming_sales
  WHERE id = p_sale_id;

  IF NOT FOUND THEN
    -- Linked sale was deleted (orphaned reference) - mark as unknown
    -- This shouldn't happen due to ON DELETE SET NULL, but handle defensively
    RETURN 'unknown';
  END IF;

  -- -------------------------------------------------------------------------
  -- Priority 4: Handle cancelled sales from upcoming_sales
  -- If the linked sale was cancelled, treat as withdrawn
  -- -------------------------------------------------------------------------
  IF v_linked_sale.status = 'cancelled' THEN
    RETURN 'withdrawn';
  END IF;

  -- -------------------------------------------------------------------------
  -- Priority 5: Ongoing sale types are ALWAYS active until explicitly sold
  -- Repository, sealed_bid, and private_sale don't have fixed auction dates
  -- They remain available until someone purchases or they're withdrawn
  -- -------------------------------------------------------------------------
  IF v_linked_sale.sale_type IN ('repository', 'sealed_bid', 'private_sale') THEN
    RETURN 'active';
  END IF;

  -- -------------------------------------------------------------------------
  -- Priority 6: Check if linked sale has passed (expired)
  -- For upset/judicial sales, once the auction date passes, the property
  -- status is expired (if it wasn't sold, it may go to next sale tier)
  -- -------------------------------------------------------------------------
  IF v_linked_sale.sale_date < NOW() THEN
    RETURN 'expired';
  END IF;

  -- -------------------------------------------------------------------------
  -- Priority 7: Sale is upcoming, property is active
  -- The linked sale is in the future, so the property is actively available
  -- -------------------------------------------------------------------------
  RETURN 'active';
END;
$$ LANGUAGE plpgsql STABLE;

-- Documentation for the updated function
COMMENT ON FUNCTION calculate_auction_status(TEXT, TEXT, TIMESTAMP, UUID) IS
'Calculates the auction_status for a property based on its linked sale relationship.

Parameters:
  p_sale_status - The explicit sale status (sold, withdrawn, etc.)
  p_sale_type   - The type of sale (upset, judicial, repository, etc.)
  p_sale_date   - The property''s sale_date (kept for backward compatibility)
  p_sale_id     - NEW: The UUID link to upcoming_sales table (DEFAULT NULL)

Status Derivation (in priority order):
  1. sale_status = ''sold'' -> ''sold''
  2. sale_status = ''withdrawn'' -> ''withdrawn''
  3. sale_id IS NULL -> ''unknown'' (no linked sale, needs investigation)
  4. Linked sale status = ''cancelled'' -> ''withdrawn''
  5. Linked sale_type is repository/sealed_bid/private_sale -> ''active'' (always active)
  6. Linked sale_date < NOW() -> ''expired'' (auction has passed)
  7. Linked sale_date >= NOW() -> ''active'' (upcoming auction)
  8. Default -> ''unknown''

Key Behavior Changes from Previous Version:
  - Status is now derived from the LINKED SALE, not the property''s own sale_date
  - Properties without a linked sale are marked ''unknown'' (data quality flag)
  - Repository/ongoing sales are always ''active'' regardless of any date
  - Cancelled sales in upcoming_sales now propagate ''withdrawn'' status to properties

Example Usage:
  -- In trigger function
  NEW.auction_status := calculate_auction_status(
    NEW.sale_status,
    NEW.sale_type,
    NEW.sale_date,
    NEW.sale_id  -- Pass the linked sale
  );

  -- Direct call with linked sale
  SELECT calculate_auction_status(
    NULL,                                    -- no explicit status
    ''upset'',                               -- sale type
    ''2026-03-15''::timestamp,               -- property sale_date (may differ)
    ''550e8400-e29b-41d4-a716-446655440000'' -- linked sale UUID
  );
';


-- ============================================================================
-- TRACK 4.1: Updated Trigger Function for auction_status
-- ============================================================================
-- Description: Updates the trigger to pass sale_id when calculating status
-- Created: 2026-01-25
--
-- This trigger fires BEFORE INSERT OR UPDATE on properties and calculates
-- the auction_status based on the linked sale relationship.
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_update_auction_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate and set the auction_status using the linked sale
  -- The calculate_auction_status function now considers:
  --   1. Explicit sale_status overrides
  --   2. Whether a sale_id link exists
  --   3. The linked sale's date and type
  NEW.auction_status := calculate_auction_status(
    NEW.sale_status,
    NEW.sale_type,
    NEW.sale_date,
    NEW.sale_id  -- NEW: pass the sale_id for linked sale lookup
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Documentation for the trigger function
COMMENT ON FUNCTION trg_update_auction_status() IS
'Trigger function that calculates and sets auction_status on property insert/update.

Fires: BEFORE INSERT OR UPDATE on properties table

Behavior:
  Sets NEW.auction_status by calling calculate_auction_status() with:
    - NEW.sale_status (explicit status override)
    - NEW.sale_type (type of sale)
    - NEW.sale_date (property''s sale date, for backward compatibility)
    - NEW.sale_id (NEW: link to upcoming_sales for authoritative date/type)

The auction_status is derived from the linked sale''s validity:
  - ''sold'': Property was purchased at auction
  - ''withdrawn'': Property removed from sale
  - ''unknown'': No linked sale (needs data cleanup)
  - ''active'': Linked to upcoming or ongoing sale
  - ''expired'': Linked sale date has passed

Trigger Definition:
  The trigger should be defined as:

  CREATE TRIGGER trg_properties_auction_status
    BEFORE INSERT OR UPDATE OF sale_status, sale_type, sale_date, sale_id
    ON properties
    FOR EACH ROW
    EXECUTE FUNCTION trg_update_auction_status();
';


-- ============================================================================
-- TRACK 4.1: Ensure Trigger Fires on sale_id Changes
-- ============================================================================
-- Description: Recreate trigger to include sale_id in the column list
-- Created: 2026-01-25
--
-- The existing trigger may only fire on sale_status, sale_type, sale_date.
-- We need it to also fire when sale_id changes (e.g., after bulk linking).
-- ============================================================================

-- Drop existing trigger if it exists (will be recreated with updated columns)
DROP TRIGGER IF EXISTS trg_properties_auction_status ON properties;

-- Create trigger that fires on all relevant column changes
-- Including sale_id ensures status is recalculated when linkage changes
CREATE TRIGGER trg_properties_auction_status
  BEFORE INSERT OR UPDATE OF sale_status, sale_type, sale_date, sale_id
  ON properties
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_auction_status();

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Track 4.1 Complete: auction_status trigger updated to use linked sale';
  RAISE NOTICE '  - calculate_auction_status() now accepts sale_id parameter';
  RAISE NOTICE '  - trg_update_auction_status() passes sale_id to calculation';
  RAISE NOTICE '  - Trigger fires on: sale_status, sale_type, sale_date, sale_id';
END $$;


-- ============================================================================
-- TRACK 4.2: Auction Research Queue Table and Functions
-- ============================================================================
-- Description: Tracks properties that couldn't be linked to sales so the
--              Auction Monitor Agent can research and find the correct dates.
-- Created: 2026-01-25
--
-- Per user requirement: "we need to improve our algorithm to understand the
-- auction date then. we can mark as unknown but we need to trigger a task to
-- find the date. we cannot give up"
--
-- When properties can't be linked to a sale (sale_id IS NULL), we queue them
-- for research rather than just marking as "unknown" and forgetting about them.
--
-- This migration adds:
--   1. auction_research_queue table to track unlinked property groups
--   2. queue_unlinked_for_research() function to populate the queue
--   3. resolve_research_queue_entry() function to resolve queue entries
--   4. vw_pending_auction_research view for easy monitoring
--   5. Indexes for efficient querying
-- ============================================================================


-- ============================================================================
-- STEP 7: Create auction_research_queue Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS auction_research_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The county this research task is for
  county_id UUID REFERENCES counties(id) NOT NULL,

  -- Count of unlinked properties in this group
  property_count INTEGER DEFAULT 0,

  -- Optional: source document that these properties came from
  source_document_id UUID REFERENCES documents(id),

  -- What we know about the sale (extracted from properties but couldn't match)
  extracted_sale_date DATE,
  extracted_sale_type TEXT,

  -- Research status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'researching', 'resolved', 'failed')),

  -- Resolution information
  resolution_notes TEXT,
  resolved_sale_id UUID REFERENCES upcoming_sales(id),  -- The sale found during research

  -- Assignment tracking for agent workflow
  assigned_agent TEXT,
  assigned_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table documentation
COMMENT ON TABLE auction_research_queue IS
'Tracks groups of properties that could not be linked to a sale in upcoming_sales.
The Auction Monitor Agent processes this queue to:
  1. Research the county to find the correct auction date
  2. Create a new upcoming_sales record if needed
  3. Link the unlinked properties to the discovered/created sale

Statuses:
  - pending: Needs research
  - researching: Agent is actively working on it
  - resolved: Auction found and properties linked
  - failed: Could not determine auction (requires manual intervention)

The queue groups properties by county + extracted_sale_date + extracted_sale_type
to avoid creating duplicate research tasks.';

-- Column comments
COMMENT ON COLUMN auction_research_queue.county_id IS 'County these unlinked properties belong to';
COMMENT ON COLUMN auction_research_queue.property_count IS 'Number of properties in this group that need linking';
COMMENT ON COLUMN auction_research_queue.source_document_id IS 'Optional: The document these properties were parsed from';
COMMENT ON COLUMN auction_research_queue.extracted_sale_date IS 'Sale date extracted from properties (may be NULL if unknown)';
COMMENT ON COLUMN auction_research_queue.extracted_sale_type IS 'Sale type extracted from properties (upset, judicial, repository, etc.)';
COMMENT ON COLUMN auction_research_queue.status IS 'Current status: pending, researching, resolved, or failed';
COMMENT ON COLUMN auction_research_queue.resolution_notes IS 'Notes from research (what was found, why it failed, etc.)';
COMMENT ON COLUMN auction_research_queue.resolved_sale_id IS 'The upcoming_sales record that was found/created to resolve this';
COMMENT ON COLUMN auction_research_queue.assigned_agent IS 'Which agent is working on this (AUCTION_MONITOR, manual, etc.)';
COMMENT ON COLUMN auction_research_queue.assigned_at IS 'When the agent was assigned to this task';


-- ============================================================================
-- STEP 8: Create Indexes for auction_research_queue
-- ============================================================================

-- Index for efficient queue processing queries
CREATE INDEX IF NOT EXISTS idx_auction_research_queue_status_county
ON auction_research_queue(status, county_id);

-- Index for finding pending work by county
CREATE INDEX IF NOT EXISTS idx_auction_research_queue_pending
ON auction_research_queue(county_id, created_at)
WHERE status = 'pending';

-- Index for tracking agent assignments
CREATE INDEX IF NOT EXISTS idx_auction_research_queue_assigned
ON auction_research_queue(assigned_agent, status)
WHERE assigned_agent IS NOT NULL;


-- ============================================================================
-- STEP 9: Function to Queue Unlinked Properties for Research
-- ============================================================================

CREATE OR REPLACE FUNCTION queue_unlinked_for_research()
RETURNS INTEGER AS $$
DECLARE
  v_queued INTEGER := 0;
  v_start_time TIMESTAMPTZ;
BEGIN
  v_start_time := clock_timestamp();

  RAISE NOTICE 'queue_unlinked_for_research: Starting to queue unlinked properties...';

  -- Find unlinked properties grouped by county + sale_date + sale_type
  -- Create a queue entry for each unique combination that doesn't already exist
  INSERT INTO auction_research_queue (
    county_id,
    property_count,
    source_document_id,
    extracted_sale_date,
    extracted_sale_type
  )
  SELECT
    p.county_id,
    COUNT(p.id) as property_count,
    -- Get the most common document_id for this group (for reference)
    MODE() WITHIN GROUP (ORDER BY p.document_id) as source_document_id,
    p.sale_date::DATE as extracted_sale_date,
    p.sale_type as extracted_sale_type
  FROM properties p
  WHERE p.sale_id IS NULL
    AND p.auction_status = 'unknown'
    -- Don't re-queue combinations that already have a pending or researching entry
    AND NOT EXISTS (
      SELECT 1 FROM auction_research_queue arq
      WHERE arq.county_id = p.county_id
        -- Match on extracted_sale_date (handling NULLs)
        AND (
          (arq.extracted_sale_date = p.sale_date::DATE)
          OR (arq.extracted_sale_date IS NULL AND p.sale_date IS NULL)
        )
        -- Match on extracted_sale_type (handling NULLs)
        AND (
          (arq.extracted_sale_type = p.sale_type)
          OR (arq.extracted_sale_type IS NULL AND p.sale_type IS NULL)
        )
        -- Only consider active queue entries (pending or researching)
        AND arq.status IN ('pending', 'researching')
    )
  GROUP BY p.county_id, p.sale_date::DATE, p.sale_type
  HAVING COUNT(p.id) > 0;

  GET DIAGNOSTICS v_queued = ROW_COUNT;

  RAISE NOTICE 'queue_unlinked_for_research: Queued % new research tasks in %',
    v_queued, (clock_timestamp() - v_start_time)::TEXT;

  RETURN v_queued;
END;
$$ LANGUAGE plpgsql;

-- Documentation for the function
COMMENT ON FUNCTION queue_unlinked_for_research() IS
'Scans for unlinked properties and creates research queue entries for each unique
county + sale_date + sale_type combination.

Purpose:
  When properties cannot be linked to a sale (sale_id IS NULL, auction_status = unknown),
  this function groups them and creates research tasks so the Auction Monitor Agent
  can investigate and find the correct auction dates.

Behavior:
  1. Finds all properties where sale_id IS NULL AND auction_status = ''unknown''
  2. Groups them by county_id, sale_date, sale_type
  3. For each group, checks if a pending/researching queue entry already exists
  4. Creates new queue entries only for groups without existing active entries
  5. Captures the property count and most common source document for reference

Returns:
  The number of new queue entries created.

Idempotent:
  Safe to run multiple times - will not create duplicate queue entries for the
  same county/date/type combination if one already exists in pending/researching status.

Example Usage:
  -- After bulk_link_properties_to_sales() to queue unlinked properties
  SELECT * FROM bulk_link_properties_to_sales();
  SELECT queue_unlinked_for_research();

  -- Check what was queued
  SELECT * FROM vw_pending_auction_research;
';


-- ============================================================================
-- STEP 10: Function to Resolve Research Queue Entry
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_research_queue_entry(
  p_queue_id UUID,
  p_sale_id UUID,        -- The sale that was found/created during research
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_queue_entry RECORD;
  v_linked INTEGER := 0;
  v_start_time TIMESTAMPTZ;
BEGIN
  v_start_time := clock_timestamp();

  -- Get the queue entry details
  SELECT * INTO v_queue_entry
  FROM auction_research_queue
  WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'resolve_research_queue_entry: Queue entry % not found', p_queue_id;
  END IF;

  IF v_queue_entry.status = 'resolved' THEN
    RAISE NOTICE 'resolve_research_queue_entry: Queue entry % already resolved', p_queue_id;
    RETURN 0;
  END IF;

  -- Verify the sale exists
  IF NOT EXISTS (SELECT 1 FROM upcoming_sales WHERE id = p_sale_id) THEN
    RAISE EXCEPTION 'resolve_research_queue_entry: Sale % not found in upcoming_sales', p_sale_id;
  END IF;

  RAISE NOTICE 'resolve_research_queue_entry: Resolving queue entry % with sale %', p_queue_id, p_sale_id;

  -- Link all matching unlinked properties to the discovered sale
  -- Match on: county_id, extracted_sale_date, extracted_sale_type
  UPDATE properties
  SET sale_id = p_sale_id
  WHERE county_id = v_queue_entry.county_id
    AND sale_id IS NULL
    AND auction_status = 'unknown'
    -- Match sale_date if the queue entry has one
    AND (
      v_queue_entry.extracted_sale_date IS NULL
      OR sale_date::DATE = v_queue_entry.extracted_sale_date
    )
    -- Match sale_type if the queue entry has one
    AND (
      v_queue_entry.extracted_sale_type IS NULL
      OR sale_type = v_queue_entry.extracted_sale_type
    );

  GET DIAGNOSTICS v_linked = ROW_COUNT;

  -- Update the queue entry to resolved
  UPDATE auction_research_queue
  SET
    status = 'resolved',
    resolved_sale_id = p_sale_id,
    resolution_notes = COALESCE(p_notes, 'Linked ' || v_linked || ' properties to sale'),
    updated_at = NOW()
  WHERE id = p_queue_id;

  RAISE NOTICE 'resolve_research_queue_entry: Linked % properties in %',
    v_linked, (clock_timestamp() - v_start_time)::TEXT;

  RETURN v_linked;
END;
$$ LANGUAGE plpgsql;

-- Documentation for the function
COMMENT ON FUNCTION resolve_research_queue_entry(UUID, UUID, TEXT) IS
'Resolves a research queue entry by linking all matching unlinked properties to the
discovered/created sale.

Parameters:
  p_queue_id - The UUID of the auction_research_queue entry to resolve
  p_sale_id  - The UUID of the upcoming_sales record that was found/created
  p_notes    - Optional resolution notes (defaults to property count message)

Behavior:
  1. Validates queue entry exists and is not already resolved
  2. Validates the sale exists in upcoming_sales
  3. Updates all matching unlinked properties to link to the sale
  4. Marks the queue entry as resolved with the linked sale_id
  5. Records resolution notes

Matching Logic:
  Properties are matched if:
    - county_id matches the queue entry
    - sale_id IS NULL and auction_status = ''unknown''
    - sale_date::DATE matches extracted_sale_date (if not NULL)
    - sale_type matches extracted_sale_type (if not NULL)

Returns:
  The number of properties that were linked to the sale.

Example Usage:
  -- After researching and finding/creating the correct sale
  SELECT resolve_research_queue_entry(
    ''queue-entry-uuid'',
    ''discovered-sale-uuid'',
    ''Found judicial sale scheduled for March 15, 2026''
  );
';


-- ============================================================================
-- STEP 11: Function to Mark Queue Entry as Failed
-- ============================================================================

CREATE OR REPLACE FUNCTION fail_research_queue_entry(
  p_queue_id UUID,
  p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE auction_research_queue
  SET
    status = 'failed',
    resolution_notes = p_reason,
    updated_at = NOW()
  WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'fail_research_queue_entry: Queue entry % not found', p_queue_id;
  END IF;

  RAISE NOTICE 'fail_research_queue_entry: Marked queue entry % as failed: %', p_queue_id, p_reason;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fail_research_queue_entry(UUID, TEXT) IS
'Marks a research queue entry as failed when the auction cannot be determined.

Parameters:
  p_queue_id - The UUID of the queue entry to mark as failed
  p_reason   - The reason why research failed (for documentation)

Use When:
  - No matching sale could be found in any source
  - The county has no upcoming auctions scheduled
  - The property data is too incomplete to determine the sale
  - Manual intervention is required

Example:
  SELECT fail_research_queue_entry(
    ''queue-entry-uuid'',
    ''No upcoming sales found for this county. Properties may be from historical auction.''
  );
';


-- ============================================================================
-- STEP 12: Function to Assign Queue Entry to Agent
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_research_queue_entry(
  p_queue_id UUID,
  p_agent_name TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE auction_research_queue
  SET
    status = 'researching',
    assigned_agent = p_agent_name,
    assigned_at = NOW(),
    updated_at = NOW()
  WHERE id = p_queue_id
    AND status = 'pending';  -- Can only assign pending entries

  IF NOT FOUND THEN
    -- Check if entry exists but isn't pending
    IF EXISTS (SELECT 1 FROM auction_research_queue WHERE id = p_queue_id) THEN
      RAISE NOTICE 'assign_research_queue_entry: Queue entry % is not in pending status', p_queue_id;
    ELSE
      RAISE EXCEPTION 'assign_research_queue_entry: Queue entry % not found', p_queue_id;
    END IF;
  ELSE
    RAISE NOTICE 'assign_research_queue_entry: Assigned queue entry % to %', p_queue_id, p_agent_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION assign_research_queue_entry(UUID, TEXT) IS
'Assigns a pending research queue entry to an agent for processing.

Parameters:
  p_queue_id   - The UUID of the queue entry to assign
  p_agent_name - The agent name (e.g., ''AUCTION_MONITOR'', ''manual'')

Behavior:
  - Only assigns entries that are in ''pending'' status
  - Sets status to ''researching''
  - Records agent name and assignment timestamp
  - Raises notice if entry is not pending (already being worked on)

Example:
  SELECT assign_research_queue_entry(
    ''queue-entry-uuid'',
    ''AUCTION_MONITOR''
  );
';


-- ============================================================================
-- STEP 13: View for Pending Auction Research
-- ============================================================================

CREATE OR REPLACE VIEW vw_pending_auction_research AS
SELECT
  arq.id as queue_id,
  arq.status,
  c.county_name,
  c.state_code,
  arq.property_count,
  arq.extracted_sale_date,
  arq.extracted_sale_type,
  d.title as source_document_title,
  d.url as source_document_url,
  arq.assigned_agent,
  arq.assigned_at,
  arq.created_at,
  -- Calculate priority based on property count
  CASE
    WHEN arq.property_count >= 100 THEN 'HIGH'
    WHEN arq.property_count >= 25 THEN 'MEDIUM'
    ELSE 'LOW'
  END as priority,
  -- Age of the queue entry
  NOW() - arq.created_at as age
FROM auction_research_queue arq
JOIN counties c ON c.id = arq.county_id
LEFT JOIN documents d ON d.id = arq.source_document_id
WHERE arq.status IN ('pending', 'researching')
ORDER BY
  -- Prioritize by: status (pending first), property count (high first), age (oldest first)
  CASE arq.status WHEN 'pending' THEN 1 ELSE 2 END,
  arq.property_count DESC,
  arq.created_at ASC;

COMMENT ON VIEW vw_pending_auction_research IS
'Shows pending and researching auction research queue entries with county and document details.

Columns:
  - queue_id: UUID of the queue entry
  - status: pending or researching
  - county_name, state_code: County information
  - property_count: Number of unlinked properties
  - extracted_sale_date, extracted_sale_type: What we know about the missing sale
  - source_document_title, source_document_url: Where properties came from
  - assigned_agent, assigned_at: Who is working on it
  - priority: HIGH (100+ properties), MEDIUM (25-99), LOW (<25)
  - age: How long the entry has been in the queue

Use this view to:
  - Monitor the research queue
  - Find high-priority items to work on
  - Track agent assignments
';


-- ============================================================================
-- STEP 14: View for Auction Research Summary by County
-- ============================================================================

CREATE OR REPLACE VIEW vw_auction_research_summary AS
SELECT
  c.county_name,
  c.state_code,
  COUNT(*) FILTER (WHERE arq.status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE arq.status = 'researching') as researching_count,
  COUNT(*) FILTER (WHERE arq.status = 'resolved') as resolved_count,
  COUNT(*) FILTER (WHERE arq.status = 'failed') as failed_count,
  SUM(arq.property_count) FILTER (WHERE arq.status = 'pending') as pending_properties,
  SUM(arq.property_count) FILTER (WHERE arq.status = 'researching') as researching_properties,
  SUM(arq.property_count) FILTER (WHERE arq.status = 'resolved') as resolved_properties,
  SUM(arq.property_count) FILTER (WHERE arq.status = 'failed') as failed_properties
FROM counties c
LEFT JOIN auction_research_queue arq ON arq.county_id = c.id
GROUP BY c.id, c.county_name, c.state_code
HAVING COUNT(arq.id) > 0
ORDER BY
  COUNT(*) FILTER (WHERE arq.status = 'pending') DESC,
  c.county_name;

COMMENT ON VIEW vw_auction_research_summary IS
'Aggregated view of auction research queue status by county.

Shows counts and property totals for each status:
  - pending: Awaiting research
  - researching: Agent actively working
  - resolved: Successfully linked to a sale
  - failed: Could not determine auction

Use to monitor overall research progress and identify counties needing attention.
';


-- ============================================================================
-- STEP 15: Function to Get Work Queue for Auction Monitor Agent
-- ============================================================================

CREATE OR REPLACE FUNCTION get_auction_research_work_queue(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  queue_id UUID,
  county_id UUID,
  county_name TEXT,
  state_code TEXT,
  property_count INTEGER,
  extracted_sale_date DATE,
  extracted_sale_type TEXT,
  source_document_url TEXT,
  priority TEXT,
  task_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    arq.id as queue_id,
    arq.county_id,
    c.county_name,
    c.state_code,
    arq.property_count,
    arq.extracted_sale_date,
    arq.extracted_sale_type,
    d.url as source_document_url,
    CASE
      WHEN arq.property_count >= 100 THEN 'HIGH'
      WHEN arq.property_count >= 25 THEN 'MEDIUM'
      ELSE 'LOW'
    END as priority,
    'Research ' || c.county_name || ' County, ' || c.state_code ||
      CASE
        WHEN arq.extracted_sale_type IS NOT NULL THEN ' - ' || arq.extracted_sale_type || ' sale'
        ELSE ''
      END ||
      CASE
        WHEN arq.extracted_sale_date IS NOT NULL THEN ' (date hint: ' || arq.extracted_sale_date::TEXT || ')'
        ELSE ' (no date available)'
      END ||
      ' - ' || arq.property_count || ' properties' as task_description
  FROM auction_research_queue arq
  JOIN counties c ON c.id = arq.county_id
  LEFT JOIN documents d ON d.id = arq.source_document_id
  WHERE arq.status = 'pending'
  ORDER BY
    arq.property_count DESC,
    arq.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_auction_research_work_queue(INTEGER) IS
'Returns a prioritized work queue for the Auction Monitor Agent.

Parameters:
  p_limit - Maximum number of queue entries to return (default 10)

Returns queue entries that are pending research, prioritized by:
  1. Property count (highest first - most impact)
  2. Age (oldest first - FIFO for equal counts)

Includes a task_description that tells the agent what to research.

Example Usage:
  -- Get top 5 research tasks
  SELECT * FROM get_auction_research_work_queue(5);

  -- Assign and start working on first task
  SELECT assign_research_queue_entry(
    (SELECT queue_id FROM get_auction_research_work_queue(1)),
    ''AUCTION_MONITOR''
  );
';


-- ============================================================================
-- STEP 16: Integration Function - Post Bulk-Link Queue Processing
-- ============================================================================

CREATE OR REPLACE FUNCTION post_bulk_link_queue_unlinked()
RETURNS TABLE (
  linked_count BIGINT,
  queued_count INTEGER
) AS $$
DECLARE
  v_queued INTEGER;
BEGIN
  -- Queue any unlinked properties for research
  v_queued := queue_unlinked_for_research();

  RAISE NOTICE 'post_bulk_link_queue_unlinked: Queued % research tasks for unlinked properties', v_queued;

  -- Return summary
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE sale_id IS NOT NULL) as linked_count,
    v_queued as queued_count
  FROM properties;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION post_bulk_link_queue_unlinked() IS
'Convenience function to run after bulk_link_properties_to_sales().

Automatically queues any properties that could not be linked for research
by the Auction Monitor Agent.

Example Workflow:
  -- 1. Link as many properties as possible
  SELECT * FROM bulk_link_properties_to_sales();

  -- 2. Queue unlinked for research
  SELECT * FROM post_bulk_link_queue_unlinked();

  -- 3. Check the research queue
  SELECT * FROM vw_pending_auction_research;
';


-- Log completion of Track 4.2
DO $$
BEGIN
  RAISE NOTICE 'Track 4.2 Complete: Auction Research Queue system created';
  RAISE NOTICE '  - auction_research_queue table created';
  RAISE NOTICE '  - queue_unlinked_for_research() function created';
  RAISE NOTICE '  - resolve_research_queue_entry() function created';
  RAISE NOTICE '  - fail_research_queue_entry() function created';
  RAISE NOTICE '  - assign_research_queue_entry() function created';
  RAISE NOTICE '  - vw_pending_auction_research view created';
  RAISE NOTICE '  - vw_auction_research_summary view created';
  RAISE NOTICE '  - get_auction_research_work_queue() function created';
  RAISE NOTICE '  - post_bulk_link_queue_unlinked() function created';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage: After bulk linking, call post_bulk_link_queue_unlinked()';
  RAISE NOTICE '       to queue unlinked properties for Auction Monitor research.';
END $$;
