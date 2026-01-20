-- Migration: 20260117000001_add_report_shares_active_flag.sql
-- Description: Add is_active flag and updated_at to report_shares table for simplified share management
-- Author: Claude Code Agent
-- Date: 2026-01-17
-- Dependencies: 20260114000002_create_property_reports.sql
--
-- This migration adds an is_active boolean flag as an alternative to soft deletes
-- for simpler share management workflows, and adds updated_at for audit tracking.

BEGIN;

-- ============================================
-- Add is_active flag to report_shares
-- ============================================

-- Add is_active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_shares'
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE report_shares
    ADD COLUMN is_active BOOLEAN DEFAULT true;

    COMMENT ON COLUMN report_shares.is_active IS 'Whether the share link is currently active. Set to false to disable without deleting.';
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_shares'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE report_shares
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

    COMMENT ON COLUMN report_shares.updated_at IS 'Timestamp of last update to the share record.';
  END IF;
END $$;

-- ============================================
-- Create index for active shares lookup
-- ============================================
CREATE INDEX IF NOT EXISTS idx_report_shares_active
  ON report_shares(is_active)
  WHERE is_active = true;

-- ============================================
-- Create trigger to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_report_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_report_shares_updated_at ON report_shares;
CREATE TRIGGER trg_report_shares_updated_at
  BEFORE UPDATE ON report_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_report_shares_updated_at();

-- ============================================
-- Additional RLS policy for active shares
-- ============================================

-- Drop the conflicting base policy first (from base migration)
-- This old policy was too permissive - allowed access to ANY share by token
DROP POLICY IF EXISTS "Anyone can view shares by token" ON report_shares;

-- Drop existing policy if it exists and recreate with is_active check
DROP POLICY IF EXISTS "Allow public read of active shares" ON report_shares;

CREATE POLICY "Allow public read of active shares"
  ON report_shares
  FOR SELECT
  USING (
    is_active = true
    AND deleted_at IS NULL
    AND expires_at > NOW()
  );

-- ============================================
-- Helper function to validate and increment view count
-- ============================================
CREATE OR REPLACE FUNCTION validate_and_increment_share_view(
  p_share_token UUID
)
RETURNS TABLE (
  is_valid BOOLEAN,
  report_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_share RECORD;
BEGIN
  -- Get the share record
  SELECT
    rs.report_id,
    rs.is_active,
    rs.deleted_at,
    rs.expires_at,
    rs.view_count,
    rs.max_views
  INTO v_share
  FROM report_shares rs
  WHERE rs.share_token = p_share_token;

  -- Check if share exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Share link not found'::TEXT;
    RETURN;
  END IF;

  -- Check if share is active
  IF v_share.is_active IS DISTINCT FROM true THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Share link has been deactivated'::TEXT;
    RETURN;
  END IF;

  -- Check if share is soft deleted
  IF v_share.deleted_at IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Share link has been deleted'::TEXT;
    RETURN;
  END IF;

  -- Check if share has expired
  IF v_share.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Share link has expired'::TEXT;
    RETURN;
  END IF;

  -- Check view limit
  IF v_share.max_views IS NOT NULL AND v_share.view_count >= v_share.max_views THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Share link has reached maximum views'::TEXT;
    RETURN;
  END IF;

  -- Increment view count and update last_viewed_at
  UPDATE report_shares
  SET
    view_count = view_count + 1,
    last_viewed_at = NOW()
  WHERE share_token = p_share_token;

  -- Return success
  RETURN QUERY SELECT true, v_share.report_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION validate_and_increment_share_view IS 'Validates a share token and increments view count atomically. Returns report_id if valid.';

-- ============================================
-- Function to create a new share link
-- ============================================
CREATE OR REPLACE FUNCTION create_report_share(
  p_report_id UUID,
  p_created_by UUID DEFAULT NULL,
  p_expires_days INTEGER DEFAULT 30,
  p_max_views INTEGER DEFAULT NULL,
  p_password_hash TEXT DEFAULT NULL,
  p_require_email BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  share_id UUID,
  share_token UUID,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_share_id UUID;
  v_share_token UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate new UUID for share token
  v_share_token := gen_random_uuid();
  v_expires_at := NOW() + (p_expires_days || ' days')::INTERVAL;

  -- Insert new share record
  INSERT INTO report_shares (
    report_id,
    share_token,
    expires_at,
    max_views,
    password_hash,
    require_email,
    created_by,
    is_active
  ) VALUES (
    p_report_id,
    v_share_token,
    v_expires_at,
    p_max_views,
    p_password_hash,
    p_require_email,
    p_created_by,
    true
  )
  RETURNING id INTO v_share_id;

  RETURN QUERY SELECT v_share_id, v_share_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION create_report_share IS 'Creates a new share link for a report with configurable expiration and view limits.';

-- ============================================
-- Function to deactivate a share link
-- ============================================
CREATE OR REPLACE FUNCTION deactivate_share(
  p_share_id UUID,
  p_user_id TEXT DEFAULT NULL  -- Optional user ID for authorization check
)
RETURNS BOOLEAN AS $$
BEGIN
  -- If user_id provided, verify ownership before deactivating
  IF p_user_id IS NOT NULL THEN
    UPDATE report_shares
    SET is_active = false
    WHERE id = p_share_id
      AND created_by::TEXT = p_user_id;
  ELSE
    -- Allow deactivation without user check (for admin/system use)
    UPDATE report_shares
    SET is_active = false
    WHERE id = p_share_id;
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION deactivate_share IS 'Deactivates a share link without deleting it. If user_id provided, only deactivates if user owns the share.';

COMMIT;
