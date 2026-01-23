-- Migration: 20260122000001_create_investment_profiles.sql
-- Description: Create investment_profiles table for custom investment criteria
-- Author: Claude Code Agent
-- Date: 2026-01-22
-- Dependencies: None

BEGIN;

-- ============================================
-- Table: investment_profiles
-- Stores user-defined investment criteria profiles with custom scoring weights
-- ============================================
CREATE TABLE IF NOT EXISTS investment_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profile metadata
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,

  -- Scoring configuration
  -- JSONB structure: { "location": 25, "risk": 25, "financial": 25, "market": 25, "profit": 25 }
  -- Allows custom weight distribution across the 5 scoring categories
  scoring_weights JSONB NOT NULL DEFAULT '{"location": 25, "risk": 25, "financial": 25, "market": 25, "profit": 25}',

  -- Risk tolerance level
  risk_tolerance TEXT CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),

  -- Soft delete support
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Single-column indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_investment_profiles_user ON investment_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_profiles_deleted ON investment_profiles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_investment_profiles_default ON investment_profiles(is_default) WHERE is_default = TRUE AND deleted_at IS NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_investment_profiles_user_created ON investment_profiles(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_investment_profiles_user_default ON investment_profiles(user_id, is_default) WHERE deleted_at IS NULL;

-- Ensure only one default profile per user
CREATE UNIQUE INDEX unique_user_default_profile
ON investment_profiles(user_id)
WHERE is_default = TRUE AND deleted_at IS NULL;

COMMENT ON INDEX unique_user_default_profile IS 'Ensures each user can only have one default profile at a time';

COMMENT ON TABLE investment_profiles IS 'User-defined investment criteria profiles with custom scoring weights';
COMMENT ON COLUMN investment_profiles.scoring_weights IS 'JSONB containing custom weight distribution for the 5 scoring categories (location, risk, financial, market, profit)';
COMMENT ON COLUMN investment_profiles.risk_tolerance IS 'Risk tolerance level: conservative, moderate, or aggressive';
COMMENT ON COLUMN investment_profiles.is_default IS 'Whether this is the user''s default profile for new property analysis';

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
ALTER TABLE investment_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profiles (not deleted)
CREATE POLICY "Users can view own profiles"
  ON investment_profiles FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Users can create profiles for themselves
CREATE POLICY "Users can create own profiles"
  ON investment_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profiles (not deleted)
CREATE POLICY "Users can update own profiles"
  ON investment_profiles FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Users can soft delete their own profiles
CREATE POLICY "Users can delete own profiles"
  ON investment_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass (for API routes and background jobs)
CREATE POLICY "Service role full access on investment_profiles"
  ON investment_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
