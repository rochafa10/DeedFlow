-- Migration: 20260122000003_create_default_profiles.sql
-- Description: Create default 'Balanced Strategy' profile for all existing users
-- Author: Claude Code Agent
-- Date: 2026-01-22
-- Dependencies: 20260122000001_create_investment_profiles.sql

BEGIN;

-- ============================================
-- Data Migration: Create default profiles for existing users
-- ============================================

-- Insert default 'Balanced Strategy' profile for each existing user
-- Only creates profiles for users who don't already have one
INSERT INTO investment_profiles (
  user_id,
  name,
  description,
  is_default,
  scoring_weights,
  risk_tolerance,
  created_at,
  updated_at
)
SELECT
  u.id AS user_id,
  'Balanced Strategy' AS name,
  'Equally weighted investment approach balancing all five scoring categories: location quality, risk assessment, financial metrics, market conditions, and profit potential. Suitable for investors seeking a moderate risk-reward profile.' AS description,
  TRUE AS is_default,
  '{"location": 20, "risk": 20, "financial": 20, "market": 20, "profit": 20}'::jsonb AS scoring_weights,
  'moderate' AS risk_tolerance,
  NOW() AS created_at,
  NOW() AS updated_at
FROM auth.users u
WHERE NOT EXISTS (
  -- Only create if user doesn't already have any profiles
  SELECT 1
  FROM investment_profiles ip
  WHERE ip.user_id = u.id
  AND ip.deleted_at IS NULL
);

COMMENT ON COLUMN investment_profiles.scoring_weights IS 'Balanced strategy uses equal 20% allocation across all 5 categories (total: 100%). The investment scorer converts these percentages to a 125-point scale (20% = 25 points).';

COMMIT;
