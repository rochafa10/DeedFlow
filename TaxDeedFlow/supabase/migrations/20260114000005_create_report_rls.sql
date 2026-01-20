-- Migration: 20260114000005_create_report_rls.sql
-- Description: Create Row Level Security (RLS) policies for the Property Analysis Report System
-- Author: Claude Code Agent
-- Date: 2026-01-14
-- Dependencies: 20260114000002_create_property_reports.sql

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

-- Users can cancel their own pending items only
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
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM property_reports WHERE id = report_id)
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

-- Service role can manage comparables (used by report generation)
CREATE POLICY "Service role full access on comparables"
  ON comparable_sales FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- report_api_cache RLS
-- ============================================
ALTER TABLE report_api_cache ENABLE ROW LEVEL SECURITY;

-- Cache is shared (read by all authenticated users for efficiency)
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
