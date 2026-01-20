-- Migration: 20260114000004_create_report_views.sql
-- Description: Create views for the Property Analysis Report System
-- Author: Claude Code Agent
-- Date: 2026-01-14
-- Dependencies: 20260114000002_create_property_reports.sql

BEGIN;

-- ============================================
-- View: vw_report_summary
-- Comprehensive view of reports with property and county info
-- Includes share counts and comparable counts
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
  -- Aggregated share statistics
  (
    SELECT COUNT(*)
    FROM report_shares rs
    WHERE rs.report_id = pr.id AND rs.deleted_at IS NULL
  ) as share_count,
  (
    SELECT COALESCE(SUM(view_count), 0)
    FROM report_shares rs
    WHERE rs.report_id = pr.id AND rs.deleted_at IS NULL
  ) as total_views,
  -- Count of comparable properties
  (
    SELECT COUNT(*)
    FROM comparable_sales cs
    WHERE cs.report_id = pr.id AND cs.deleted_at IS NULL
  ) as comparable_count
FROM property_reports pr
JOIN properties p ON p.id = pr.property_id
JOIN counties c ON c.id = p.county_id
WHERE pr.deleted_at IS NULL;

COMMENT ON VIEW vw_report_summary IS 'Comprehensive report summary with property info, share stats, and comparable counts';

-- ============================================
-- View: vw_active_shares
-- Active shares with status information
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
  -- Calculated share status
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

COMMENT ON VIEW vw_active_shares IS 'Active shares with calculated status (active, expired, view_limit_reached)';

-- ============================================
-- View: vw_queue_status
-- Queue items with wait time calculations
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
  -- Calculate wait time based on status
  CASE
    WHEN q.status = 'queued' THEN EXTRACT(EPOCH FROM (NOW() - q.queued_at))
    WHEN q.status = 'generating' THEN EXTRACT(EPOCH FROM (NOW() - q.started_at))
    ELSE NULL
  END as wait_time_seconds
FROM report_generation_queue q
JOIN properties p ON p.id = q.property_id
JOIN counties c ON c.id = p.county_id;

COMMENT ON VIEW vw_queue_status IS 'Queue items with calculated wait times for monitoring';

-- ============================================
-- View: vw_user_report_stats
-- Aggregated report statistics per user
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

COMMENT ON VIEW vw_user_report_stats IS 'Aggregated report statistics per user';

-- ============================================
-- View: vw_api_cache_stats
-- Cache statistics per API endpoint
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

COMMENT ON VIEW vw_api_cache_stats IS 'Cache statistics per API endpoint for monitoring and optimization';

COMMIT;
