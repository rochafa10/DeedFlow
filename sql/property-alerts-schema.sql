-- ==========================================
-- PROPERTY ALERT SYSTEM - DATABASE SCHEMA
-- Smart Deal Alerts Feature
-- ==========================================
-- Description: Schema for proactive property alert notifications
--              Allows users to define investment criteria and receive
--              automatic notifications when matching properties are found
-- Author: Claude Code Agent
-- Date: 2026-01-23
-- Feature: Smart Deal Alerts (Task 021)

BEGIN;

-- ============================================
-- ENUM Types
-- ============================================

-- Notification Frequency Type
-- Controls how often users receive alert notifications
DO $$ BEGIN
  CREATE TYPE notification_frequency AS ENUM ('instant', 'daily', 'weekly');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE notification_frequency IS 'User preference for alert notification frequency';

-- ============================================
-- Table: alert_rules
-- User-defined criteria for property alerts
-- ============================================
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rule identification
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,

  -- Alert criteria
  score_threshold INTEGER CHECK (score_threshold >= 0 AND score_threshold <= 125),
  county_ids UUID[] DEFAULT '{}', -- Array of county UUIDs to filter by (empty = all counties)
  property_types TEXT[] DEFAULT '{}', -- Array of property types to filter by (empty = all types)
  max_bid DECIMAL(12,2), -- Maximum acceptable bid/purchase price (NULL = no limit)
  min_acres DECIMAL(10,2), -- Minimum property acreage (NULL = no limit)
  max_acres DECIMAL(10,2), -- Maximum property acreage (NULL = no limit)

  -- Notification settings
  notification_frequency notification_frequency DEFAULT 'daily',
  last_notified_at TIMESTAMPTZ,

  -- Metadata
  match_count INTEGER DEFAULT 0, -- Total number of properties that have matched this rule
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_alert_rules_user ON alert_rules(user_id) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_rules_user_enabled ON alert_rules(user_id, enabled, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_rules_notification_frequency ON alert_rules(notification_frequency, last_notified_at) WHERE enabled = TRUE;

-- GIN index for array columns (county_ids, property_types) to support containment queries
CREATE INDEX IF NOT EXISTS idx_alert_rules_county_ids ON alert_rules USING GIN(county_ids);
CREATE INDEX IF NOT EXISTS idx_alert_rules_property_types ON alert_rules USING GIN(property_types);

COMMENT ON TABLE alert_rules IS 'User-defined criteria for automated property alerts';
COMMENT ON COLUMN alert_rules.score_threshold IS 'Minimum total score (0-125) required to trigger alert';
COMMENT ON COLUMN alert_rules.county_ids IS 'Array of county UUIDs to filter by, empty array = all counties';
COMMENT ON COLUMN alert_rules.property_types IS 'Array of property types to filter by, empty array = all types';
COMMENT ON COLUMN alert_rules.max_bid IS 'Maximum acceptable bid amount, NULL = no limit';
COMMENT ON COLUMN alert_rules.match_count IS 'Running count of all properties that have matched this rule';
COMMENT ON COLUMN alert_rules.last_notified_at IS 'Last time user was notified about matches for this rule';

-- ============================================
-- Table: property_alerts
-- Generated alerts when properties match rules
-- ============================================
CREATE TABLE IF NOT EXISTS property_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Match details
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 125),
  match_reasons JSONB NOT NULL DEFAULT '{}', -- Structured data explaining why property matched

  -- Alert status
  read BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate alerts for same property + rule combination
  UNIQUE(alert_rule_id, property_id)
);

-- Indexes for alert queries
CREATE INDEX IF NOT EXISTS idx_property_alerts_rule ON property_alerts(alert_rule_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_alerts_property ON property_alerts(property_id);
CREATE INDEX IF NOT EXISTS idx_property_alerts_unread ON property_alerts(alert_rule_id, read, created_at DESC) WHERE read = FALSE AND archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_property_alerts_user_unread ON property_alerts(alert_rule_id, read) WHERE read = FALSE AND archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_property_alerts_archived ON property_alerts(archived, created_at DESC) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_property_alerts_match_score ON property_alerts(match_score DESC, created_at DESC) WHERE read = FALSE AND archived = FALSE;

-- Composite index for inbox queries (unread alerts for a user's rules)
CREATE INDEX IF NOT EXISTS idx_property_alerts_inbox ON property_alerts(alert_rule_id, read, archived, created_at DESC);

-- GIN index for match_reasons JSONB column to support queries on match criteria
CREATE INDEX IF NOT EXISTS idx_property_alerts_match_reasons ON property_alerts USING GIN(match_reasons);

COMMENT ON TABLE property_alerts IS 'Generated alerts when properties match user-defined alert rules';
COMMENT ON COLUMN property_alerts.match_score IS 'Property total score that triggered this alert (0-125)';
COMMENT ON COLUMN property_alerts.match_reasons IS 'JSONB object with detailed reasons why property matched (e.g., {score: 85, county_match: true, price_within_budget: true})';
COMMENT ON COLUMN property_alerts.read IS 'Whether user has viewed this alert';
COMMENT ON COLUMN property_alerts.archived IS 'Whether user has archived this alert';

-- ============================================
-- Updated At Trigger Function
-- Auto-update updated_at timestamp on alert_rules
-- ============================================
CREATE OR REPLACE FUNCTION update_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to alert_rules table
DROP TRIGGER IF EXISTS trigger_alert_rules_updated_at ON alert_rules;
CREATE TRIGGER trigger_alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_rules_updated_at();

COMMENT ON FUNCTION update_alert_rules_updated_at() IS 'Automatically updates updated_at timestamp when alert_rules are modified';

COMMIT;
