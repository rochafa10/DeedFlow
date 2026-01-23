-- Migration: 20260122000002_create_profile_functions.sql
-- Description: Create functions and triggers for investment profile management
-- Author: Claude Code Agent
-- Date: 2026-01-22
-- Dependencies: 20260122000001_create_investment_profiles.sql

BEGIN;

-- ============================================
-- Function: validate_profile_weights
-- Validates that scoring weights sum to 100 (allowing small rounding tolerance)
-- Returns TRUE if valid, FALSE otherwise
-- Weight structure: { "location": 25, "risk": 25, "financial": 25, "market": 25, "profit": 25 }
-- ============================================
CREATE OR REPLACE FUNCTION validate_profile_weights(p_weights JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  v_total NUMERIC;
  v_location NUMERIC;
  v_risk NUMERIC;
  v_financial NUMERIC;
  v_market NUMERIC;
  v_profit NUMERIC;
BEGIN
  -- Extract weight values from JSONB
  v_location := COALESCE((p_weights->>'location')::NUMERIC, 0);
  v_risk := COALESCE((p_weights->>'risk')::NUMERIC, 0);
  v_financial := COALESCE((p_weights->>'financial')::NUMERIC, 0);
  v_market := COALESCE((p_weights->>'market')::NUMERIC, 0);
  v_profit := COALESCE((p_weights->>'profit')::NUMERIC, 0);

  -- Calculate total
  v_total := v_location + v_risk + v_financial + v_market + v_profit;

  -- Check if total is 100 (with 0.01 tolerance for floating point precision)
  -- Also ensure all weights are non-negative and <= 100
  RETURN (
    ABS(v_total - 100) < 0.01
    AND v_location >= 0 AND v_location <= 100
    AND v_risk >= 0 AND v_risk <= 100
    AND v_financial >= 0 AND v_financial <= 100
    AND v_market >= 0 AND v_market <= 100
    AND v_profit >= 0 AND v_profit <= 100
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_profile_weights(JSONB) IS 'Validates that scoring weights sum to 100 with proper ranges (0-100 each)';

-- ============================================
-- Function: get_user_profiles
-- Retrieves all active (non-deleted) profiles for a user
-- Ordered by default status first, then creation date
-- ============================================
CREATE OR REPLACE FUNCTION get_user_profiles(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  description TEXT,
  is_default BOOLEAN,
  scoring_weights JSONB,
  risk_tolerance TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ip.id,
    ip.user_id,
    ip.name,
    ip.description,
    ip.is_default,
    ip.scoring_weights,
    ip.risk_tolerance,
    ip.created_at,
    ip.updated_at
  FROM investment_profiles ip
  WHERE ip.user_id = p_user_id
    AND ip.deleted_at IS NULL
  ORDER BY ip.is_default DESC NULLS LAST, ip.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_profiles(UUID) IS 'Retrieves all active profiles for a user, ordered by default status then creation date';

-- ============================================
-- Function: get_active_profile
-- Retrieves the user's active/default profile
-- Returns NULL if no default profile exists
-- ============================================
CREATE OR REPLACE FUNCTION get_active_profile(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  description TEXT,
  is_default BOOLEAN,
  scoring_weights JSONB,
  risk_tolerance TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ip.id,
    ip.user_id,
    ip.name,
    ip.description,
    ip.is_default,
    ip.scoring_weights,
    ip.risk_tolerance,
    ip.created_at,
    ip.updated_at
  FROM investment_profiles ip
  WHERE ip.user_id = p_user_id
    AND ip.is_default = TRUE
    AND ip.deleted_at IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_profile(UUID) IS 'Retrieves the user''s active/default profile';

-- ============================================
-- Function: set_default_profile
-- Sets a specific profile as the default for a user
-- Automatically unsets all other profiles for that user
-- Returns TRUE if successful, FALSE if profile not found or not owned by user
-- ============================================
CREATE OR REPLACE FUNCTION set_default_profile(p_profile_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_profile_exists BOOLEAN;
BEGIN
  -- Check if profile exists and belongs to user
  SELECT EXISTS(
    SELECT 1 FROM investment_profiles
    WHERE id = p_profile_id
      AND user_id = p_user_id
      AND deleted_at IS NULL
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RETURN FALSE;
  END IF;

  -- Unset all current defaults for this user
  UPDATE investment_profiles
  SET
    is_default = FALSE,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND is_default = TRUE
    AND deleted_at IS NULL
    AND id != p_profile_id;

  -- Set the new default
  UPDATE investment_profiles
  SET
    is_default = TRUE,
    updated_at = NOW()
  WHERE id = p_profile_id
    AND user_id = p_user_id
    AND deleted_at IS NULL;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_default_profile(UUID, UUID) IS 'Sets a specific profile as default for a user, unsetting all others';

-- ============================================
-- Function: create_default_profile
-- Creates a default "Balanced Strategy" profile for a new user
-- Uses balanced weights (20% each category)
-- Returns the created profile ID
-- ============================================
CREATE OR REPLACE FUNCTION create_default_profile(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
  v_default_weights JSONB;
BEGIN
  -- Define balanced weights (20% each category = 20 out of 100)
  v_default_weights := '{
    "location": 20,
    "risk": 20,
    "financial": 20,
    "market": 20,
    "profit": 20
  }'::JSONB;

  -- Create the default profile
  INSERT INTO investment_profiles (
    user_id,
    name,
    description,
    is_default,
    scoring_weights,
    risk_tolerance
  ) VALUES (
    p_user_id,
    'Balanced Strategy',
    'A balanced approach to property investment with equal weight across all scoring categories.',
    TRUE,
    v_default_weights,
    'moderate'
  )
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_default_profile(UUID) IS 'Creates a default "Balanced Strategy" profile for a new user';

-- ============================================
-- Function: update_profile_updated_at
-- Trigger function to auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_profile_updated_at() IS 'Trigger function to auto-update updated_at timestamp on investment_profiles';

-- Create trigger for investment_profiles
DROP TRIGGER IF EXISTS trg_update_profile_updated_at ON investment_profiles;
CREATE TRIGGER trg_update_profile_updated_at
  BEFORE UPDATE ON investment_profiles
  FOR EACH ROW EXECUTE FUNCTION update_profile_updated_at();

-- ============================================
-- Function: validate_profile_weights_trigger
-- Trigger function to validate scoring weights before insert/update
-- Raises exception if weights are invalid
-- ============================================
CREATE OR REPLACE FUNCTION validate_profile_weights_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate weights
  IF NOT validate_profile_weights(NEW.scoring_weights) THEN
    RAISE EXCEPTION 'Invalid scoring weights: weights must sum to 100 and each weight must be between 0 and 100';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_profile_weights_trigger() IS 'Trigger function to validate scoring weights before insert/update';

-- Create trigger for weight validation
DROP TRIGGER IF EXISTS trg_validate_profile_weights ON investment_profiles;
CREATE TRIGGER trg_validate_profile_weights
  BEFORE INSERT OR UPDATE ON investment_profiles
  FOR EACH ROW EXECUTE FUNCTION validate_profile_weights_trigger();

COMMIT;
