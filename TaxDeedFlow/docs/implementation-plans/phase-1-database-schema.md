# Phase 1: Database Schema & Migrations

## Overview
Create the database foundation for the Property Analysis Report System, including all tables, relationships, RLS policies, and utility functions.

## Migration Files Structure

```
supabase/migrations/
  20260114000001_create_report_types.sql      -- Custom types
  20260114000002_create_property_reports.sql  -- Main tables
  20260114000003_create_report_functions.sql  -- Functions and triggers
  20260114000004_create_report_views.sql      -- Views
  20260114000005_create_report_rls.sql        -- RLS policies
```

---

## Custom Types (Create First)

```sql
-- Migration: 20260114000001_create_report_types.sql
-- Create custom types for the Property Report system

BEGIN;

-- Report grade type (A-F letter grades)
DO $$ BEGIN
  CREATE TYPE report_grade AS ENUM ('A', 'B', 'C', 'D', 'F');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Report status type
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('queued', 'generating', 'complete', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Comparable source type
DO $$ BEGIN
  CREATE TYPE comparable_source AS ENUM ('realtor', 'zillow', 'redfin', 'regrid', 'manual', 'mls');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Queue priority type
DO $$ BEGIN
  CREATE TYPE queue_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
```

---

## Tables to Create

### 1. property_reports
Main table storing generated analysis reports.

```sql
-- Migration: 20260114000002_create_property_reports.sql
-- Create Property Reports tables

BEGIN;

CREATE TABLE IF NOT EXISTS property_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Scoring (125-point system)
  total_score INTEGER CHECK (total_score >= 0 AND total_score <= 125),
  grade report_grade,
  location_score INTEGER CHECK (location_score >= 0 AND location_score <= 25),
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 25),
  financial_score INTEGER CHECK (financial_score >= 0 AND financial_score <= 25),
  market_score INTEGER CHECK (market_score >= 0 AND market_score <= 25),
  profit_score INTEGER CHECK (profit_score >= 0 AND profit_score <= 25),

  -- Report content (JSONB for all 16 sections)
  report_data JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  confidence_level DECIMAL(5,2) CHECK (confidence_level >= 0 AND confidence_level <= 100),
  status report_status DEFAULT 'generating',
  error_message TEXT,
  version INTEGER DEFAULT 1,

  -- Soft delete support
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Single-column indexes
CREATE INDEX IF NOT EXISTS idx_property_reports_property ON property_reports(property_id);
CREATE INDEX IF NOT EXISTS idx_property_reports_user ON property_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_property_reports_status ON property_reports(status);
CREATE INDEX IF NOT EXISTS idx_property_reports_grade ON property_reports(grade);
CREATE INDEX IF NOT EXISTS idx_property_reports_score ON property_reports(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_property_reports_deleted ON property_reports(deleted_at) WHERE deleted_at IS NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_property_reports_user_created ON property_reports(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_property_reports_property_status ON property_reports(property_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_property_reports_grade_score ON property_reports(grade, total_score DESC) WHERE deleted_at IS NULL AND status = 'complete';
CREATE INDEX IF NOT EXISTS idx_property_reports_user_status ON property_reports(user_id, status, created_at DESC) WHERE deleted_at IS NULL;
```

### 2. report_generation_queue
Queue for async report generation with status tracking.

```sql
CREATE TABLE IF NOT EXISTS report_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES property_reports(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Queue status
  status report_status DEFAULT 'queued',
  priority queue_priority DEFAULT 'normal',

  -- Processing metadata
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,

  -- Processing timestamps
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  -- Worker tracking
  worker_id TEXT,
  locked_at TIMESTAMPTZ,
  lock_expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queue operations
CREATE INDEX IF NOT EXISTS idx_queue_status_priority ON report_generation_queue(status, priority DESC, queued_at ASC) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_queue_report ON report_generation_queue(report_id);
CREATE INDEX IF NOT EXISTS idx_queue_user ON report_generation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_locked ON report_generation_queue(lock_expires_at) WHERE locked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_queue_retry ON report_generation_queue(next_retry_at) WHERE status = 'failed' AND attempts < max_attempts;
```

### 3. report_shares
Token-based sharing for reports.

```sql
CREATE TABLE IF NOT EXISTS report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES property_reports(id) ON DELETE CASCADE,

  -- Share token (UUID v4)
  share_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

  -- Expiration and tracking
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  view_count INTEGER DEFAULT 0,
  max_views INTEGER, -- NULL = unlimited
  last_viewed_at TIMESTAMPTZ,

  -- Access control
  password_hash TEXT, -- Optional password protection
  require_email BOOLEAN DEFAULT FALSE,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_shares_token ON report_shares(share_token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_shares_report ON report_shares(report_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_shares_expires ON report_shares(expires_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_shares_created_by ON report_shares(created_by, created_at DESC) WHERE deleted_at IS NULL;
```

### 4. comparable_sales
Comparable properties for each report.

```sql
CREATE TABLE IF NOT EXISTS comparable_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES property_reports(id) ON DELETE CASCADE,

  -- Property info (may or may not exist in our properties table)
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  external_id TEXT, -- ID from external API (Realtor.com, Zillow)

  -- Sale details
  address TEXT NOT NULL,
  city TEXT,
  state VARCHAR(2),
  zip VARCHAR(10),
  sale_price DECIMAL(12,2),
  sale_date DATE,

  -- Property characteristics
  sqft INTEGER,
  lot_size_sqft INTEGER,
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  year_built INTEGER,
  property_type TEXT,

  -- Comparison metrics
  price_per_sqft DECIMAL(10,2),
  distance_miles DECIMAL(5,2),
  similarity_score DECIMAL(5,2) CHECK (similarity_score >= 0 AND similarity_score <= 100),

  -- Raw data from API
  raw_data JSONB,
  source comparable_source,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comparable_sales_report ON comparable_sales(report_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comparable_sales_similarity ON comparable_sales(similarity_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comparable_sales_source ON comparable_sales(source) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comparable_sales_report_similarity ON comparable_sales(report_id, similarity_score DESC) WHERE deleted_at IS NULL;
```

### 5. report_api_cache
Cache external API responses to reduce costs and latency.

```sql
CREATE TABLE IF NOT EXISTS report_api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cache key
  api_name TEXT NOT NULL, -- 'fema', 'usgs', 'census', 'nasa_firms', etc.
  request_hash TEXT NOT NULL, -- MD5 hash of request params

  -- Location (for geographic queries)
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),

  -- Cached response
  response_data JSONB NOT NULL,
  response_status INTEGER, -- HTTP status code

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,

  -- Metadata
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(api_name, request_hash)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_cache_lookup ON report_api_cache(api_name, request_hash);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON report_api_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_cache_location ON report_api_cache USING GIST (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMIT;
```

---

## Row Level Security (RLS)

```sql
-- Migration: 20260114000005_create_report_rls.sql
-- Row Level Security policies

BEGIN;

-- ============================================
-- property_reports RLS
-- ============================================
ALTER TABLE property_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports (not deleted)
CREATE POLICY "Users can view own reports"
  ON property_reports FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Users can create reports for themselves
CREATE POLICY "Users can create own reports"
  ON property_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports (not deleted)
CREATE POLICY "Users can update own reports"
  ON property_reports FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Users can soft delete their own reports
CREATE POLICY "Users can delete own reports"
  ON property_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass (for API routes and background jobs)
CREATE POLICY "Service role full access on property_reports"
  ON property_reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- report_generation_queue RLS
-- ============================================
ALTER TABLE report_generation_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own queue items
CREATE POLICY "Users can view own queue items"
  ON report_generation_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create queue items for themselves
CREATE POLICY "Users can create queue items"
  ON report_generation_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own pending items
CREATE POLICY "Users can update own queue items"
  ON report_generation_queue FOR UPDATE
  USING (auth.uid() = user_id AND status = 'queued')
  WITH CHECK (auth.uid() = user_id);

-- Service role for worker processing
CREATE POLICY "Service role full access on queue"
  ON report_generation_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- report_shares RLS
-- ============================================
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can view shares by token (for public shared reports)
-- This is intentionally permissive for share functionality
CREATE POLICY "Anyone can view shares by token"
  ON report_shares FOR SELECT
  USING (deleted_at IS NULL);

-- Only report owner can create shares
CREATE POLICY "Report owner can create shares"
  ON report_shares FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM property_reports WHERE id = report_id)
  );

-- Report owner can update shares (change expiry, etc.)
CREATE POLICY "Report owner can update shares"
  ON report_shares FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM property_reports WHERE id = report_id)
    AND deleted_at IS NULL
  );

-- Report owner can delete shares
CREATE POLICY "Report owner can delete shares"
  ON report_shares FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM property_reports WHERE id = report_id)
  );

-- Service role for cleanup jobs
CREATE POLICY "Service role full access on shares"
  ON report_shares FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- comparable_sales RLS
-- ============================================
ALTER TABLE comparable_sales ENABLE ROW LEVEL SECURITY;

-- Users can view comparables for their reports
CREATE POLICY "Users can view own report comparables"
  ON comparable_sales FOR SELECT
  USING (
    deleted_at IS NULL AND
    report_id IN (SELECT id FROM property_reports WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

-- Service role can manage comparables
CREATE POLICY "Service role full access on comparables"
  ON comparable_sales FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- report_api_cache RLS
-- ============================================
ALTER TABLE report_api_cache ENABLE ROW LEVEL SECURITY;

-- Cache is shared (read by all authenticated users)
CREATE POLICY "Authenticated users can read cache"
  ON report_api_cache FOR SELECT
  TO authenticated
  USING (true);

-- Service role manages cache (insert, update, delete)
CREATE POLICY "Service role manages cache"
  ON report_api_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
```

---

## Utility Functions

```sql
-- Migration: 20260114000003_create_report_functions.sql
-- Functions and triggers for Property Reports

BEGIN;

-- ============================================
-- Calculate Grade from Score
-- ============================================
CREATE OR REPLACE FUNCTION calculate_grade(score INTEGER)
RETURNS report_grade AS $$
BEGIN
  RETURN CASE
    WHEN score >= 100 THEN 'A'::report_grade  -- 80%+ of 125
    WHEN score >= 75 THEN 'B'::report_grade   -- 60-79%
    WHEN score >= 50 THEN 'C'::report_grade   -- 40-59%
    WHEN score >= 25 THEN 'D'::report_grade   -- 20-39%
    ELSE 'F'::report_grade                     -- <20%
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Update Report Totals Trigger Function
-- ============================================
CREATE OR REPLACE FUNCTION update_report_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total score
  NEW.total_score := COALESCE(NEW.location_score, 0)
                   + COALESCE(NEW.risk_score, 0)
                   + COALESCE(NEW.financial_score, 0)
                   + COALESCE(NEW.market_score, 0)
                   + COALESCE(NEW.profit_score, 0);

  -- Calculate grade
  NEW.grade := calculate_grade(NEW.total_score);

  -- Update timestamp (only on UPDATE, not INSERT which already sets it)
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS trg_update_report_totals ON property_reports;
CREATE TRIGGER trg_update_report_totals
  BEFORE INSERT OR UPDATE ON property_reports
  FOR EACH ROW EXECUTE FUNCTION update_report_totals();

-- ============================================
-- Update Timestamps Trigger (generic)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to report_generation_queue
DROP TRIGGER IF EXISTS trg_queue_updated_at ON report_generation_queue;
CREATE TRIGGER trg_queue_updated_at
  BEFORE UPDATE ON report_generation_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Get Report by Share Token
-- ============================================
CREATE OR REPLACE FUNCTION get_report_by_share_token(p_token UUID)
RETURNS TABLE (
  report_id UUID,
  property_id UUID,
  total_score INTEGER,
  grade report_grade,
  report_data JSONB,
  confidence_level DECIMAL,
  generated_at TIMESTAMPTZ,
  is_expired BOOLEAN,
  is_view_limited BOOLEAN
) AS $$
DECLARE
  v_share report_shares%ROWTYPE;
BEGIN
  -- Get share record
  SELECT * INTO v_share
  FROM report_shares
  WHERE share_token = p_token AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check if expired
  IF v_share.expires_at < NOW() THEN
    RETURN QUERY
    SELECT
      NULL::UUID,
      NULL::UUID,
      NULL::INTEGER,
      NULL::report_grade,
      NULL::JSONB,
      NULL::DECIMAL,
      NULL::TIMESTAMPTZ,
      TRUE,
      FALSE;
    RETURN;
  END IF;

  -- Check view limit
  IF v_share.max_views IS NOT NULL AND v_share.view_count >= v_share.max_views THEN
    RETURN QUERY
    SELECT
      NULL::UUID,
      NULL::UUID,
      NULL::INTEGER,
      NULL::report_grade,
      NULL::JSONB,
      NULL::DECIMAL,
      NULL::TIMESTAMPTZ,
      FALSE,
      TRUE;
    RETURN;
  END IF;

  -- Update view count
  UPDATE report_shares
  SET
    view_count = view_count + 1,
    last_viewed_at = NOW()
  WHERE share_token = p_token;

  -- Return report data
  RETURN QUERY
  SELECT
    pr.id as report_id,
    pr.property_id,
    pr.total_score,
    pr.grade,
    pr.report_data,
    pr.confidence_level,
    pr.generated_at,
    FALSE as is_expired,
    FALSE as is_view_limited
  FROM report_shares rs
  JOIN property_reports pr ON pr.id = rs.report_id
  WHERE rs.share_token = p_token
    AND rs.deleted_at IS NULL
    AND pr.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Queue Management Functions
-- ============================================

-- Add report to generation queue
CREATE OR REPLACE FUNCTION queue_report_generation(
  p_report_id UUID,
  p_property_id UUID,
  p_user_id UUID,
  p_priority queue_priority DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
BEGIN
  INSERT INTO report_generation_queue (
    report_id, property_id, user_id, priority, status
  ) VALUES (
    p_report_id, p_property_id, p_user_id, p_priority, 'queued'
  )
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Claim next queue item for processing (worker function)
CREATE OR REPLACE FUNCTION claim_queue_item(p_worker_id TEXT, p_lock_duration INTERVAL DEFAULT '5 minutes')
RETURNS TABLE (
  queue_id UUID,
  report_id UUID,
  property_id UUID,
  user_id UUID,
  priority queue_priority,
  attempts INTEGER
) AS $$
DECLARE
  v_item report_generation_queue%ROWTYPE;
BEGIN
  -- Select and lock the highest priority queued item
  SELECT * INTO v_item
  FROM report_generation_queue
  WHERE status = 'queued'
    AND (locked_at IS NULL OR lock_expires_at < NOW())
  ORDER BY
    CASE priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    queued_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Lock the item
  UPDATE report_generation_queue
  SET
    status = 'generating',
    worker_id = p_worker_id,
    locked_at = NOW(),
    lock_expires_at = NOW() + p_lock_duration,
    started_at = COALESCE(started_at, NOW()),
    attempts = report_generation_queue.attempts + 1,
    updated_at = NOW()
  WHERE id = v_item.id;

  -- Return the claimed item
  RETURN QUERY
  SELECT
    v_item.id,
    v_item.report_id,
    v_item.property_id,
    v_item.user_id,
    v_item.priority,
    v_item.attempts + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete queue item
CREATE OR REPLACE FUNCTION complete_queue_item(p_queue_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE report_generation_queue
  SET
    status = 'complete',
    completed_at = NOW(),
    locked_at = NULL,
    lock_expires_at = NULL,
    updated_at = NOW()
  WHERE id = p_queue_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fail queue item (with retry logic)
CREATE OR REPLACE FUNCTION fail_queue_item(
  p_queue_id UUID,
  p_error TEXT,
  p_retry_delay INTERVAL DEFAULT '5 minutes'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_item report_generation_queue%ROWTYPE;
BEGIN
  SELECT * INTO v_item FROM report_generation_queue WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_item.attempts >= v_item.max_attempts THEN
    -- Max retries reached, mark as permanently failed
    UPDATE report_generation_queue
    SET
      status = 'failed',
      last_error = p_error,
      error_count = error_count + 1,
      locked_at = NULL,
      lock_expires_at = NULL,
      updated_at = NOW()
    WHERE id = p_queue_id;

    -- Also update the report status
    UPDATE property_reports
    SET
      status = 'failed',
      error_message = p_error,
      updated_at = NOW()
    WHERE id = v_item.report_id;
  ELSE
    -- Schedule retry
    UPDATE report_generation_queue
    SET
      status = 'queued',
      last_error = p_error,
      error_count = error_count + 1,
      next_retry_at = NOW() + p_retry_delay,
      locked_at = NULL,
      lock_expires_at = NULL,
      updated_at = NOW()
    WHERE id = p_queue_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Clean Expired Cache
-- ============================================
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM report_api_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Clean Expired Shares
-- ============================================
CREATE OR REPLACE FUNCTION clean_expired_shares()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Soft delete expired shares older than 30 days past expiration
  UPDATE report_shares
  SET deleted_at = NOW()
  WHERE expires_at < NOW() - INTERVAL '30 days'
    AND deleted_at IS NULL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Soft Delete Report (cascades to related)
-- ============================================
CREATE OR REPLACE FUNCTION soft_delete_report(p_report_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify ownership and soft delete
  UPDATE property_reports
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = p_report_id
    AND user_id = p_user_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Soft delete related shares
  UPDATE report_shares
  SET deleted_at = NOW()
  WHERE report_id = p_report_id AND deleted_at IS NULL;

  -- Soft delete related comparables
  UPDATE comparable_sales
  SET deleted_at = NOW()
  WHERE report_id = p_report_id AND deleted_at IS NULL;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup jobs (if pg_cron available)
-- SELECT cron.schedule('clean-api-cache', '0 * * * *', 'SELECT clean_expired_cache()');
-- SELECT cron.schedule('clean-expired-shares', '0 0 * * *', 'SELECT clean_expired_shares()');

COMMIT;
```

---

## Views

```sql
-- Migration: 20260114000004_create_report_views.sql
-- Views for Property Reports

BEGIN;

-- ============================================
-- Report Summary View
-- ============================================
CREATE OR REPLACE VIEW vw_report_summary AS
SELECT
  pr.id,
  pr.property_id,
  pr.user_id,
  p.parcel_id,
  p.property_address,
  c.county_name,
  c.state_code,
  pr.total_score,
  pr.grade,
  pr.location_score,
  pr.risk_score,
  pr.financial_score,
  pr.market_score,
  pr.profit_score,
  pr.confidence_level,
  pr.status,
  pr.version,
  pr.generated_at,
  pr.created_at,
  pr.updated_at,
  (SELECT COUNT(*) FROM report_shares rs WHERE rs.report_id = pr.id AND rs.deleted_at IS NULL) as share_count,
  (SELECT COALESCE(SUM(view_count), 0) FROM report_shares rs WHERE rs.report_id = pr.id AND rs.deleted_at IS NULL) as total_views,
  (SELECT COUNT(*) FROM comparable_sales cs WHERE cs.report_id = pr.id AND cs.deleted_at IS NULL) as comparable_count
FROM property_reports pr
JOIN properties p ON p.id = pr.property_id
JOIN counties c ON c.id = p.county_id
WHERE pr.deleted_at IS NULL;

-- ============================================
-- Active Shares View
-- ============================================
CREATE OR REPLACE VIEW vw_active_shares AS
SELECT
  rs.id,
  rs.report_id,
  rs.share_token,
  rs.expires_at,
  rs.view_count,
  rs.max_views,
  rs.last_viewed_at,
  rs.created_by,
  rs.created_at,
  pr.property_id,
  pr.total_score,
  pr.grade,
  p.property_address,
  c.county_name,
  c.state_code,
  CASE
    WHEN rs.expires_at < NOW() THEN 'expired'
    WHEN rs.max_views IS NOT NULL AND rs.view_count >= rs.max_views THEN 'view_limit_reached'
    ELSE 'active'
  END as share_status
FROM report_shares rs
JOIN property_reports pr ON pr.id = rs.report_id
JOIN properties p ON p.id = pr.property_id
JOIN counties c ON c.id = p.county_id
WHERE rs.deleted_at IS NULL AND pr.deleted_at IS NULL;

-- ============================================
-- Queue Status View
-- ============================================
CREATE OR REPLACE VIEW vw_queue_status AS
SELECT
  q.id,
  q.report_id,
  q.property_id,
  q.user_id,
  q.status,
  q.priority,
  q.attempts,
  q.max_attempts,
  q.last_error,
  q.queued_at,
  q.started_at,
  q.completed_at,
  q.worker_id,
  p.parcel_id,
  p.property_address,
  c.county_name,
  CASE
    WHEN q.status = 'queued' THEN EXTRACT(EPOCH FROM (NOW() - q.queued_at))
    WHEN q.status = 'generating' THEN EXTRACT(EPOCH FROM (NOW() - q.started_at))
    ELSE NULL
  END as wait_time_seconds
FROM report_generation_queue q
JOIN properties p ON p.id = q.property_id
JOIN counties c ON c.id = p.county_id;

-- ============================================
-- User Report Stats View
-- ============================================
CREATE OR REPLACE VIEW vw_user_report_stats AS
SELECT
  user_id,
  COUNT(*) as total_reports,
  COUNT(*) FILTER (WHERE status = 'complete') as completed_reports,
  COUNT(*) FILTER (WHERE status = 'generating') as generating_reports,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_reports,
  AVG(total_score) FILTER (WHERE status = 'complete') as avg_score,
  COUNT(*) FILTER (WHERE grade = 'A') as grade_a_count,
  COUNT(*) FILTER (WHERE grade = 'B') as grade_b_count,
  COUNT(*) FILTER (WHERE grade = 'C') as grade_c_count,
  COUNT(*) FILTER (WHERE grade = 'D') as grade_d_count,
  COUNT(*) FILTER (WHERE grade = 'F') as grade_f_count,
  MIN(created_at) as first_report_at,
  MAX(created_at) as last_report_at
FROM property_reports
WHERE deleted_at IS NULL
GROUP BY user_id;

-- ============================================
-- API Cache Stats View
-- ============================================
CREATE OR REPLACE VIEW vw_api_cache_stats AS
SELECT
  api_name,
  COUNT(*) as cached_items,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_items,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_items,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hits_per_item,
  MIN(created_at) as oldest_cache,
  MAX(created_at) as newest_cache
FROM report_api_cache
GROUP BY api_name;

COMMIT;
```

---

## TypeScript Interfaces

```typescript
// src/types/reports.ts

// ============================================
// Enums matching database types
// ============================================
export type ReportGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type ReportStatus = 'queued' | 'generating' | 'complete' | 'failed' | 'cancelled';
export type ComparableSource = 'realtor' | 'zillow' | 'redfin' | 'regrid' | 'manual' | 'mls';
export type QueuePriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================
// Report Data Structure (JSONB content)
// ============================================
export interface ReportSection {
  title: string;
  score?: number;
  maxScore?: number;
  confidence?: number;
  data: Record<string, unknown>;
  summary?: string;
  warnings?: string[];
  recommendations?: string[];
}

export interface ReportData {
  // Location Analysis (25 pts)
  locationAnalysis?: ReportSection;
  neighborhoodProfile?: ReportSection;
  accessibilityScore?: ReportSection;

  // Risk Assessment (25 pts)
  floodRisk?: ReportSection;
  environmentalRisk?: ReportSection;
  titleRisk?: ReportSection;
  structuralRisk?: ReportSection;

  // Financial Analysis (25 pts)
  taxAnalysis?: ReportSection;
  costEstimates?: ReportSection;
  cashFlowProjection?: ReportSection;

  // Market Analysis (25 pts)
  marketConditions?: ReportSection;
  comparableSalesAnalysis?: ReportSection;
  demandIndicators?: ReportSection;

  // Profit Potential (25 pts)
  arvEstimate?: ReportSection;
  profitProjection?: ReportSection;
  exitStrategies?: ReportSection;

  // Metadata
  generatedAt?: string;
  dataSourcesUsed?: string[];
  apiCallCount?: number;
}

// ============================================
// Main Table Interfaces
// ============================================
export interface PropertyReport {
  id: string;
  property_id: string;
  user_id: string;

  // Scoring
  total_score: number | null;
  grade: ReportGrade | null;
  location_score: number | null;
  risk_score: number | null;
  financial_score: number | null;
  market_score: number | null;
  profit_score: number | null;

  // Content
  report_data: ReportData;

  // Metadata
  confidence_level: number | null;
  status: ReportStatus;
  error_message: string | null;
  version: number;

  // Soft delete
  deleted_at: string | null;

  // Timestamps
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportGenerationQueue {
  id: string;
  report_id: string;
  property_id: string;
  user_id: string;

  // Queue status
  status: ReportStatus;
  priority: QueuePriority;

  // Processing metadata
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  error_count: number;

  // Processing timestamps
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  next_retry_at: string | null;

  // Worker tracking
  worker_id: string | null;
  locked_at: string | null;
  lock_expires_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ReportShare {
  id: string;
  report_id: string;
  share_token: string;

  // Expiration and tracking
  expires_at: string;
  view_count: number;
  max_views: number | null;
  last_viewed_at: string | null;

  // Access control
  password_hash: string | null;
  require_email: boolean;

  // Soft delete
  deleted_at: string | null;

  // Metadata
  created_by: string | null;
  created_at: string;
}

export interface ComparableSale {
  id: string;
  report_id: string;
  property_id: string | null;
  external_id: string | null;

  // Location
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;

  // Sale details
  sale_price: number | null;
  sale_date: string | null;

  // Property characteristics
  sqft: number | null;
  lot_size_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  year_built: number | null;
  property_type: string | null;

  // Comparison metrics
  price_per_sqft: number | null;
  distance_miles: number | null;
  similarity_score: number | null;

  // Source data
  raw_data: Record<string, unknown> | null;
  source: ComparableSource | null;

  // Soft delete
  deleted_at: string | null;

  created_at: string;
}

export interface ReportApiCache {
  id: string;
  api_name: string;
  request_hash: string;
  latitude: number | null;
  longitude: number | null;
  response_data: Record<string, unknown>;
  response_status: number | null;
  expires_at: string;
  hit_count: number;
  last_hit_at: string | null;
  created_at: string;
}

// ============================================
// View Types
// ============================================
export interface ReportSummary extends PropertyReport {
  parcel_id: string;
  property_address: string;
  county_name: string;
  state_code: string;
  share_count: number;
  total_views: number;
  comparable_count: number;
}

export interface ActiveShare extends ReportShare {
  property_id: string;
  total_score: number;
  grade: ReportGrade;
  property_address: string;
  county_name: string;
  state_code: string;
  share_status: 'active' | 'expired' | 'view_limit_reached';
}

export interface QueueStatus extends ReportGenerationQueue {
  parcel_id: string;
  property_address: string;
  county_name: string;
  wait_time_seconds: number | null;
}

export interface UserReportStats {
  user_id: string;
  total_reports: number;
  completed_reports: number;
  generating_reports: number;
  failed_reports: number;
  avg_score: number | null;
  grade_a_count: number;
  grade_b_count: number;
  grade_c_count: number;
  grade_d_count: number;
  grade_f_count: number;
  first_report_at: string | null;
  last_report_at: string | null;
}

export interface ApiCacheStats {
  api_name: string;
  cached_items: number;
  active_items: number;
  expired_items: number;
  total_hits: number;
  avg_hits_per_item: number;
  oldest_cache: string;
  newest_cache: string;
}

// ============================================
// Function Return Types
// ============================================
export interface SharedReportResult {
  report_id: string | null;
  property_id: string | null;
  total_score: number | null;
  grade: ReportGrade | null;
  report_data: ReportData | null;
  confidence_level: number | null;
  generated_at: string | null;
  is_expired: boolean;
  is_view_limited: boolean;
}

export interface ClaimedQueueItem {
  queue_id: string;
  report_id: string;
  property_id: string;
  user_id: string;
  priority: QueuePriority;
  attempts: number;
}

// ============================================
// API Request/Response Types
// ============================================
export interface CreateReportRequest {
  property_id: string;
  priority?: QueuePriority;
}

export interface CreateReportResponse {
  report_id: string;
  queue_id: string;
  status: ReportStatus;
}

export interface ShareReportRequest {
  report_id: string;
  expires_in_days?: number;
  max_views?: number;
  password?: string;
}

export interface ShareReportResponse {
  share_id: string;
  share_token: string;
  share_url: string;
  expires_at: string;
}
```

---

## Verification Steps

1. **Run migrations in order:**
   ```bash
   supabase db push
   ```

2. **Verify types were created:**
   ```sql
   SELECT typname FROM pg_type WHERE typname IN ('report_grade', 'report_status', 'comparable_source', 'queue_priority');
   ```

3. **Verify tables exist:**
   ```sql
   SELECT tablename FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('property_reports', 'report_generation_queue', 'report_shares', 'comparable_sales', 'report_api_cache');
   ```

4. **Test RLS policies with different user contexts:**
   ```sql
   -- Test as authenticated user
   SET request.jwt.claim.sub = 'user-uuid-here';
   SELECT * FROM property_reports;
   ```

5. **Test trigger calculates totals:**
   ```sql
   INSERT INTO property_reports (property_id, user_id, location_score, risk_score)
   VALUES ('prop-uuid', 'user-uuid', 20, 15);

   SELECT total_score, grade FROM property_reports WHERE property_id = 'prop-uuid';
   -- Should return: total_score=35, grade='C'
   ```

6. **Test queue functions:**
   ```sql
   -- Queue a report
   SELECT queue_report_generation('report-uuid', 'property-uuid', 'user-uuid', 'high');

   -- Claim item
   SELECT * FROM claim_queue_item('worker-1');

   -- Complete item
   SELECT complete_queue_item('queue-uuid');
   ```

7. **Test share token function:**
   ```sql
   SELECT * FROM get_report_by_share_token('share-token-uuid');
   ```

8. **Generate TypeScript types:**
   ```bash
   supabase gen types typescript --local > src/types/supabase-generated.ts
   ```

---

## Dependencies

- Existing `properties` table with `id`, `property_address`
- Existing `counties` table with `id`, `county_name`, `state_code`
- Supabase Auth configured
- PostgreSQL earthdistance extension for geographic cache index:
  ```sql
  CREATE EXTENSION IF NOT EXISTS cube;
  CREATE EXTENSION IF NOT EXISTS earthdistance;
  ```

---

## Rollback Migration

If needed, rollback with:

```sql
-- Migration: 20260114000099_rollback_property_reports.sql
BEGIN;

DROP VIEW IF EXISTS vw_api_cache_stats;
DROP VIEW IF EXISTS vw_user_report_stats;
DROP VIEW IF EXISTS vw_queue_status;
DROP VIEW IF EXISTS vw_active_shares;
DROP VIEW IF EXISTS vw_report_summary;

DROP FUNCTION IF EXISTS soft_delete_report(UUID, UUID);
DROP FUNCTION IF EXISTS clean_expired_shares();
DROP FUNCTION IF EXISTS clean_expired_cache();
DROP FUNCTION IF EXISTS fail_queue_item(UUID, TEXT, INTERVAL);
DROP FUNCTION IF EXISTS complete_queue_item(UUID);
DROP FUNCTION IF EXISTS claim_queue_item(TEXT, INTERVAL);
DROP FUNCTION IF EXISTS queue_report_generation(UUID, UUID, UUID, queue_priority);
DROP FUNCTION IF EXISTS get_report_by_share_token(UUID);
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS update_report_totals();
DROP FUNCTION IF EXISTS calculate_grade(INTEGER);

DROP TABLE IF EXISTS report_api_cache;
DROP TABLE IF EXISTS comparable_sales;
DROP TABLE IF EXISTS report_shares;
DROP TABLE IF EXISTS report_generation_queue;
DROP TABLE IF EXISTS property_reports;

DROP TYPE IF EXISTS queue_priority;
DROP TYPE IF EXISTS comparable_source;
DROP TYPE IF EXISTS report_status;
DROP TYPE IF EXISTS report_grade;

COMMIT;
```

---

## Next Phase

After completing Phase 1, proceed to [Phase 2: External API Integration Layer](./phase-2-api-integration.md)
