-- Migration: 20260114000003_create_report_functions.sql
-- Description: Create functions and triggers for the Property Analysis Report System
-- Author: Claude Code Agent
-- Date: 2026-01-14
-- Dependencies: 20260114000001_create_report_types.sql, 20260114000002_create_property_reports.sql

BEGIN;

-- ============================================
-- Function: calculate_grade
-- Converts a numeric score (0-125) to a letter grade (A-F)
-- Grade scale:
--   A: 100-125 (80%+)
--   B: 75-99  (60-79%)
--   C: 50-74  (40-59%)
--   D: 25-49  (20-39%)
--   F: 0-24   (<20%)
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

COMMENT ON FUNCTION calculate_grade(INTEGER) IS 'Converts numeric score (0-125) to letter grade (A-F)';

-- ============================================
-- Function: update_report_totals
-- Trigger function to auto-calculate total_score and grade
-- Called on INSERT or UPDATE of property_reports
-- ============================================
CREATE OR REPLACE FUNCTION update_report_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total score as sum of all 5 category scores
  NEW.total_score := COALESCE(NEW.location_score, 0)
                   + COALESCE(NEW.risk_score, 0)
                   + COALESCE(NEW.financial_score, 0)
                   + COALESCE(NEW.market_score, 0)
                   + COALESCE(NEW.profit_score, 0);

  -- Calculate grade from total score
  NEW.grade := calculate_grade(NEW.total_score);

  -- Update timestamp on UPDATE (INSERT already sets it via DEFAULT)
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_report_totals() IS 'Trigger function to auto-calculate total_score and grade on property_reports';

-- Create trigger for property_reports
DROP TRIGGER IF EXISTS trg_update_report_totals ON property_reports;
CREATE TRIGGER trg_update_report_totals
  BEFORE INSERT OR UPDATE ON property_reports
  FOR EACH ROW EXECUTE FUNCTION update_report_totals();

-- ============================================
-- Function: update_updated_at
-- Generic trigger function to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at() IS 'Generic trigger function to update updated_at timestamp';

-- Apply to report_generation_queue
DROP TRIGGER IF EXISTS trg_queue_updated_at ON report_generation_queue;
CREATE TRIGGER trg_queue_updated_at
  BEFORE UPDATE ON report_generation_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Function: get_report_by_share_token
-- Retrieves a report by its share token, handling expiration and view limits
-- Also increments view count on successful access
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
    -- Token not found, return empty
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

COMMENT ON FUNCTION get_report_by_share_token(UUID) IS 'Retrieves a report by share token, handling expiration/view limits and incrementing view count';

-- ============================================
-- Function: queue_report_generation
-- Adds a report to the generation queue
-- ============================================
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

COMMENT ON FUNCTION queue_report_generation(UUID, UUID, UUID, queue_priority) IS 'Adds a report to the generation queue with specified priority';

-- ============================================
-- Function: claim_queue_item
-- Worker function to claim the next queue item for processing
-- Uses FOR UPDATE SKIP LOCKED for safe concurrent access
-- ============================================
CREATE OR REPLACE FUNCTION claim_queue_item(
  p_worker_id TEXT,
  p_lock_duration INTERVAL DEFAULT '5 minutes'
)
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
  -- FOR UPDATE SKIP LOCKED ensures workers don't block each other
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
    -- No items available, return empty
    RETURN;
  END IF;

  -- Lock the item for this worker
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

COMMENT ON FUNCTION claim_queue_item(TEXT, INTERVAL) IS 'Claims the next queue item for processing with worker locking';

-- ============================================
-- Function: complete_queue_item
-- Marks a queue item as successfully completed
-- ============================================
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

COMMENT ON FUNCTION complete_queue_item(UUID) IS 'Marks a queue item as successfully completed';

-- ============================================
-- Function: fail_queue_item
-- Handles queue item failure with retry logic
-- If max_attempts reached, marks as permanently failed
-- Otherwise, schedules a retry
-- ============================================
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

    -- Also update the report status to failed
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

COMMENT ON FUNCTION fail_queue_item(UUID, TEXT, INTERVAL) IS 'Handles queue item failure with retry logic';

-- ============================================
-- Function: clean_expired_cache
-- Removes expired entries from the API cache
-- Returns the number of deleted entries
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

COMMENT ON FUNCTION clean_expired_cache() IS 'Removes expired entries from the API cache';

-- ============================================
-- Function: clean_expired_shares
-- Soft deletes shares that have been expired for over 30 days
-- Returns the number of soft-deleted entries
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

COMMENT ON FUNCTION clean_expired_shares() IS 'Soft deletes shares expired more than 30 days ago';

-- ============================================
-- Function: soft_delete_report
-- Soft deletes a report and cascades to related shares and comparables
-- Verifies ownership before deletion
-- ============================================
CREATE OR REPLACE FUNCTION soft_delete_report(p_report_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify ownership and soft delete the report
  UPDATE property_reports
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = p_report_id
    AND user_id = p_user_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Cascade soft delete to related shares
  UPDATE report_shares
  SET deleted_at = NOW()
  WHERE report_id = p_report_id AND deleted_at IS NULL;

  -- Cascade soft delete to related comparables
  UPDATE comparable_sales
  SET deleted_at = NOW()
  WHERE report_id = p_report_id AND deleted_at IS NULL;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION soft_delete_report(UUID, UUID) IS 'Soft deletes a report and cascades to related shares and comparables';

-- ============================================
-- Schedule cleanup jobs (if pg_cron is available)
-- Uncomment these lines if pg_cron extension is installed
-- ============================================
-- SELECT cron.schedule('clean-api-cache', '0 * * * *', 'SELECT clean_expired_cache()');
-- SELECT cron.schedule('clean-expired-shares', '0 0 * * *', 'SELECT clean_expired_shares()');

COMMIT;
