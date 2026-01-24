-- Migration: 20260123000001_create_developer_api_tables.sql
-- Description: Create tables for Developer API system (API keys, usage tracking, webhooks)
-- Author: Claude Code Agent
-- Date: 2026-01-23

BEGIN;

-- ============================================
-- Rate Limit Tier Type
-- Defines API rate limit tiers for different subscription levels
-- ============================================
DO $$ BEGIN
  CREATE TYPE rate_limit_tier AS ENUM ('free', 'pro', 'enterprise', 'unlimited');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE rate_limit_tier IS 'API rate limit tiers: free (1000/hr), pro (10000/hr), enterprise (100000/hr), unlimited';

-- ============================================
-- Table: api_keys
-- Stores API keys for developer authentication
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- API key details
  key_hash TEXT NOT NULL UNIQUE, -- bcrypt hash of the actual API key
  name TEXT NOT NULL, -- User-friendly name for the key (e.g., "Production Server")

  -- Permissions and limits
  permissions TEXT[] NOT NULL DEFAULT '{}', -- e.g., ['read:properties', 'write:webhooks']
  rate_limit_tier rate_limit_tier DEFAULT 'free',

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  request_count INTEGER DEFAULT 0,

  -- Revocation
  revoked_at TIMESTAMPTZ, -- NULL = active, timestamp = revoked
  revoked_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_tier ON api_keys(rate_limit_tier) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_user_created ON api_keys(user_id, created_at DESC) WHERE revoked_at IS NULL;

COMMENT ON TABLE api_keys IS 'API keys for developer authentication and authorization';
COMMENT ON COLUMN api_keys.key_hash IS 'bcrypt hash of the API key for secure storage';
COMMENT ON COLUMN api_keys.permissions IS 'Array of permission scopes (e.g., read:properties, write:webhooks)';
COMMENT ON COLUMN api_keys.rate_limit_tier IS 'Rate limit tier determining requests per hour';
COMMENT ON COLUMN api_keys.revoked_at IS 'Timestamp when key was revoked, NULL if active';

-- ============================================
-- Table: api_usage
-- Tracks API usage per key for analytics and billing
-- ============================================
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Request details
  endpoint TEXT NOT NULL, -- e.g., '/api/v1/properties'
  method TEXT NOT NULL, -- 'GET', 'POST', 'DELETE', etc.
  request_count INTEGER NOT NULL DEFAULT 1,

  -- Response metrics
  avg_response_time_ms INTEGER, -- Average response time in milliseconds
  error_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,

  -- Time bucket (hourly aggregation)
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hour_bucket TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', NOW()),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per key per endpoint per hour
  UNIQUE(api_key_id, endpoint, method, hour_bucket)
);

-- Indexes for api_usage
CREATE INDEX IF NOT EXISTS idx_api_usage_key ON api_usage(api_key_id, hour_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint, hour_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_bucket ON api_usage(hour_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_key_endpoint ON api_usage(api_key_id, endpoint, hour_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp DESC);

COMMENT ON TABLE api_usage IS 'Hourly aggregated API usage statistics per key and endpoint';
COMMENT ON COLUMN api_usage.hour_bucket IS 'Hour bucket for aggregated metrics (YYYY-MM-DD HH:00:00)';
COMMENT ON COLUMN api_usage.request_count IS 'Total requests in this hour bucket';
COMMENT ON COLUMN api_usage.avg_response_time_ms IS 'Average response time in milliseconds';

-- ============================================
-- Table: webhook_subscriptions
-- Stores webhook subscriptions for real-time event notifications
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Webhook details
  url TEXT NOT NULL, -- Webhook endpoint URL
  events TEXT[] NOT NULL, -- e.g., ['property.created', 'auction.updated']
  secret TEXT NOT NULL, -- HMAC secret for webhook signature verification

  -- Status
  active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,

  -- Delivery tracking
  total_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_failure_reason TEXT,

  -- Retry configuration
  max_retries INTEGER DEFAULT 3,
  retry_backoff_seconds INTEGER DEFAULT 60,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook_subscriptions
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_key ON webhook_subscriptions(api_key_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON webhook_subscriptions(active, last_triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_events ON webhook_subscriptions USING GIN(events);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_failures ON webhook_subscriptions(failed_deliveries DESC) WHERE active = TRUE;

COMMENT ON TABLE webhook_subscriptions IS 'Webhook subscriptions for real-time event notifications';
COMMENT ON COLUMN webhook_subscriptions.events IS 'Array of event types to subscribe to (e.g., property.created, auction.updated)';
COMMENT ON COLUMN webhook_subscriptions.secret IS 'HMAC secret for webhook payload signature verification';
COMMENT ON COLUMN webhook_subscriptions.active IS 'Whether the webhook subscription is active';

-- ============================================
-- Table: webhook_delivery_log
-- Logs individual webhook delivery attempts for debugging
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,

  -- Delivery details
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status_code INTEGER,
  response_body TEXT,
  success BOOLEAN NOT NULL,

  -- Error tracking
  error_message TEXT,

  -- Timing
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  response_time_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook_delivery_log
CREATE INDEX IF NOT EXISTS idx_webhook_log_subscription ON webhook_delivery_log(webhook_subscription_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_log_event ON webhook_delivery_log(event_type, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_log_success ON webhook_delivery_log(success, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_log_delivered ON webhook_delivery_log(delivered_at DESC);

COMMENT ON TABLE webhook_delivery_log IS 'Log of individual webhook delivery attempts for debugging and auditing';
COMMENT ON COLUMN webhook_delivery_log.attempt_number IS 'Retry attempt number (1 = first attempt, 2+ = retries)';
COMMENT ON COLUMN webhook_delivery_log.event_data IS 'Full event payload sent to webhook endpoint';

-- ============================================
-- API KEY MANAGEMENT FUNCTIONS
-- ============================================

-- ============================================================================
-- FUNCTION: create_api_key
-- Creates a new API key for a user and returns the record with the plaintext key
-- NOTE: The plaintext key is ONLY returned once - it must be saved by the caller
-- ============================================================================
CREATE OR REPLACE FUNCTION create_api_key(
  p_user_id UUID,
  p_name TEXT,
  p_permissions TEXT[] DEFAULT '{}',
  p_rate_limit_tier rate_limit_tier DEFAULT 'free'
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  api_key TEXT, -- Plaintext key (ONLY returned once!)
  key_hash TEXT,
  permissions TEXT[],
  rate_limit_tier rate_limit_tier,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_api_key_id UUID;
  v_plaintext_key TEXT;
  v_key_hash TEXT;
BEGIN
  -- Generate a secure random API key (32 bytes = 64 hex characters)
  -- Format: tdf_live_[64 random hex characters]
  v_plaintext_key := 'tdf_live_' || encode(gen_random_bytes(32), 'hex');

  -- Hash the key using crypt (bcrypt) for secure storage
  v_key_hash := crypt(v_plaintext_key, gen_salt('bf'));

  -- Insert the new API key
  INSERT INTO api_keys (user_id, name, key_hash, permissions, rate_limit_tier)
  VALUES (p_user_id, p_name, v_key_hash, p_permissions, p_rate_limit_tier)
  RETURNING api_keys.id INTO v_api_key_id;

  -- Return the API key record with the plaintext key
  RETURN QUERY
  SELECT
    ak.id,
    ak.user_id,
    ak.name,
    v_plaintext_key AS api_key,
    ak.key_hash,
    ak.permissions,
    ak.rate_limit_tier,
    ak.created_at
  FROM api_keys ak
  WHERE ak.id = v_api_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_api_key IS 'Creates a new API key and returns it with the plaintext key (only shown once)';

-- ============================================================================
-- FUNCTION: revoke_api_key
-- Revokes an API key by setting the revoked_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION revoke_api_key(
  p_key_id UUID,
  p_revoked_reason TEXT DEFAULT 'Manually revoked'
) RETURNS BOOLEAN AS $$
DECLARE
  v_rows_affected INTEGER;
BEGIN
  -- Update the API key to mark it as revoked
  UPDATE api_keys
  SET
    revoked_at = NOW(),
    revoked_reason = p_revoked_reason,
    updated_at = NOW()
  WHERE id = p_key_id
    AND revoked_at IS NULL; -- Only revoke if not already revoked

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- Return TRUE if a row was updated, FALSE otherwise
  RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revoke_api_key IS 'Revokes an API key by setting revoked_at timestamp. Returns TRUE if successful, FALSE if key not found or already revoked.';

-- ============================================================================
-- FUNCTION: validate_api_key
-- Validates an API key and returns the key record if valid
-- Updates last_used_at timestamp and increments request_count
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_api_key(
  p_plaintext_key TEXT
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  key_hash TEXT,
  permissions TEXT[],
  rate_limit_tier rate_limit_tier,
  last_used_at TIMESTAMPTZ,
  request_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_api_key_record RECORD;
BEGIN
  -- Find the API key by comparing the hash
  -- NOTE: We use crypt() to hash the input and compare with stored hash
  SELECT ak.*
  INTO v_api_key_record
  FROM api_keys ak
  WHERE ak.key_hash = crypt(p_plaintext_key, ak.key_hash)
    AND ak.revoked_at IS NULL; -- Key must not be revoked

  -- If no valid key found, return empty result
  IF v_api_key_record IS NULL THEN
    RETURN;
  END IF;

  -- Update last_used_at and increment request_count
  UPDATE api_keys
  SET
    last_used_at = NOW(),
    request_count = request_count + 1,
    updated_at = NOW()
  WHERE api_keys.id = v_api_key_record.id;

  -- Return the API key record
  RETURN QUERY
  SELECT
    v_api_key_record.id,
    v_api_key_record.user_id,
    v_api_key_record.name,
    v_api_key_record.key_hash,
    v_api_key_record.permissions,
    v_api_key_record.rate_limit_tier,
    NOW() AS last_used_at, -- Return updated timestamp
    v_api_key_record.request_count + 1 AS request_count, -- Return incremented count
    v_api_key_record.created_at,
    NOW() AS updated_at
  FROM api_keys
  WHERE api_keys.id = v_api_key_record.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_api_key IS 'Validates an API key and returns the key record if valid. Updates last_used_at and request_count. Returns NULL if key is invalid or revoked.';

COMMIT;
