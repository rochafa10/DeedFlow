-- ==========================================
-- PROPERTY ALERT SYSTEM - DATABASE FUNCTIONS
-- Smart Deal Alerts Feature
-- ==========================================
-- Description: Functions for managing alert rules and property alerts
-- Author: Claude Code Agent
-- Date: 2026-01-23
-- Feature: Smart Deal Alerts (Task 021)

BEGIN;

-- ============================================================================
-- HELPER FUNCTION: Upsert Alert Rule
-- ============================================================================
-- Creates or updates an alert rule for a user
-- If a rule with the same ID exists, it updates it
-- If no ID provided or ID doesn't exist, creates new rule
CREATE OR REPLACE FUNCTION upsert_alert_rule(
  p_user_id UUID,
  p_name TEXT,
  p_enabled BOOLEAN DEFAULT TRUE,
  p_score_threshold INTEGER DEFAULT NULL,
  p_county_ids UUID[] DEFAULT '{}',
  p_property_types TEXT[] DEFAULT '{}',
  p_max_bid DECIMAL(12,2) DEFAULT NULL,
  p_min_acres DECIMAL(10,2) DEFAULT NULL,
  p_max_acres DECIMAL(10,2) DEFAULT NULL,
  p_notification_frequency notification_frequency DEFAULT 'daily',
  p_rule_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_rule_id UUID;
BEGIN
  -- Validate score threshold if provided
  IF p_score_threshold IS NOT NULL AND (p_score_threshold < 0 OR p_score_threshold > 125) THEN
    RAISE EXCEPTION 'score_threshold must be between 0 and 125';
  END IF;

  -- Validate acres range if both provided
  IF p_min_acres IS NOT NULL AND p_max_acres IS NOT NULL AND p_min_acres > p_max_acres THEN
    RAISE EXCEPTION 'min_acres cannot be greater than max_acres';
  END IF;

  -- Try to update existing rule
  IF p_rule_id IS NOT NULL THEN
    UPDATE alert_rules
    SET
      name = p_name,
      enabled = p_enabled,
      score_threshold = p_score_threshold,
      county_ids = p_county_ids,
      property_types = p_property_types,
      max_bid = p_max_bid,
      min_acres = p_min_acres,
      max_acres = p_max_acres,
      notification_frequency = p_notification_frequency,
      updated_at = NOW()
    WHERE id = p_rule_id
      AND user_id = p_user_id  -- Ensure user owns this rule
    RETURNING id INTO v_rule_id;
  END IF;

  -- If no record was updated, insert new one
  IF v_rule_id IS NULL THEN
    INSERT INTO alert_rules (
      user_id, name, enabled, score_threshold, county_ids, property_types,
      max_bid, min_acres, max_acres, notification_frequency
    )
    VALUES (
      p_user_id, p_name, p_enabled, p_score_threshold, p_county_ids, p_property_types,
      p_max_bid, p_min_acres, p_max_acres, p_notification_frequency
    )
    RETURNING id INTO v_rule_id;
  END IF;

  RETURN v_rule_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION upsert_alert_rule IS 'Creates or updates an alert rule for a user';

-- ============================================================================
-- QUERY FUNCTION: Get User Alert Rules
-- ============================================================================
-- Retrieves all alert rules for a user, optionally filtered by enabled status
CREATE OR REPLACE FUNCTION get_user_alert_rules(
  p_user_id UUID,
  p_enabled_only BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  id UUID,
  name TEXT,
  enabled BOOLEAN,
  score_threshold INTEGER,
  county_ids UUID[],
  property_types TEXT[],
  max_bid DECIMAL(12,2),
  min_acres DECIMAL(10,2),
  max_acres DECIMAL(10,2),
  notification_frequency notification_frequency,
  last_notified_at TIMESTAMPTZ,
  match_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id,
    ar.name,
    ar.enabled,
    ar.score_threshold,
    ar.county_ids,
    ar.property_types,
    ar.max_bid,
    ar.min_acres,
    ar.max_acres,
    ar.notification_frequency,
    ar.last_notified_at,
    ar.match_count,
    ar.created_at,
    ar.updated_at
  FROM alert_rules ar
  WHERE ar.user_id = p_user_id
    AND (NOT p_enabled_only OR ar.enabled = TRUE)
  ORDER BY ar.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_alert_rules IS 'Returns all alert rules for a user, optionally filtered by enabled status';

-- ============================================================================
-- MATCHING FUNCTION: Scan Properties for Alerts
-- ============================================================================
-- Scans properties against active alert rules and creates alerts for matches
-- Returns number of new alerts created
CREATE OR REPLACE FUNCTION scan_properties_for_alerts(
  p_property_ids UUID[] DEFAULT NULL,  -- NULL = scan all properties, or provide specific property IDs
  p_rule_ids UUID[] DEFAULT NULL       -- NULL = use all enabled rules, or provide specific rule IDs
) RETURNS TABLE (
  alerts_created INTEGER,
  rules_checked INTEGER,
  properties_scanned INTEGER
) AS $$
DECLARE
  v_alerts_created INTEGER := 0;
  v_rules_checked INTEGER := 0;
  v_properties_scanned INTEGER := 0;
  v_rule RECORD;
  v_property RECORD;
  v_match_reasons JSONB;
  v_property_query TEXT;
BEGIN
  -- Get active rules to check
  FOR v_rule IN
    SELECT ar.*
    FROM alert_rules ar
    WHERE ar.enabled = TRUE
      AND (p_rule_ids IS NULL OR ar.id = ANY(p_rule_ids))
  LOOP
    v_rules_checked := v_rules_checked + 1;

    -- Build dynamic query based on rule criteria
    v_property_query := '
      SELECT p.id, p.county_id, p.property_type, p.total_due, p.acres
      FROM properties p
      WHERE 1=1
    ';

    -- Filter by property IDs if specified
    IF p_property_ids IS NOT NULL THEN
      v_property_query := v_property_query || ' AND p.id = ANY($1)';
    END IF;

    -- Filter by score threshold
    IF v_rule.score_threshold IS NOT NULL THEN
      v_property_query := v_property_query || ' AND p.total_score >= ' || v_rule.score_threshold;
    END IF;

    -- Filter by counties
    IF v_rule.county_ids IS NOT NULL AND array_length(v_rule.county_ids, 1) > 0 THEN
      v_property_query := v_property_query || ' AND p.county_id = ANY(ARRAY[';
      v_property_query := v_property_query || array_to_string(
        ARRAY(SELECT '''' || unnest(v_rule.county_ids)::TEXT || '''::UUID'), ','
      );
      v_property_query := v_property_query || '])';
    END IF;

    -- Filter by property types
    IF v_rule.property_types IS NOT NULL AND array_length(v_rule.property_types, 1) > 0 THEN
      v_property_query := v_property_query || ' AND p.property_type = ANY(ARRAY[';
      v_property_query := v_property_query || array_to_string(
        ARRAY(SELECT '''' || unnest(v_rule.property_types) || ''''), ','
      );
      v_property_query := v_property_query || '])';
    END IF;

    -- Filter by max bid
    IF v_rule.max_bid IS NOT NULL THEN
      v_property_query := v_property_query || ' AND p.total_due <= ' || v_rule.max_bid;
    END IF;

    -- Filter by acres range
    IF v_rule.min_acres IS NOT NULL THEN
      v_property_query := v_property_query || ' AND p.acres >= ' || v_rule.min_acres;
    END IF;
    IF v_rule.max_acres IS NOT NULL THEN
      v_property_query := v_property_query || ' AND p.acres <= ' || v_rule.max_acres;
    END IF;

    -- Execute query and process matches
    FOR v_property IN EXECUTE v_property_query USING p_property_ids
    LOOP
      v_properties_scanned := v_properties_scanned + 1;

      -- Build match reasons
      v_match_reasons := jsonb_build_object(
        'score', COALESCE(v_property.total_score, 0),
        'county_match', (v_rule.county_ids IS NULL OR array_length(v_rule.county_ids, 1) = 0 OR v_property.county_id = ANY(v_rule.county_ids)),
        'type_match', (v_rule.property_types IS NULL OR array_length(v_rule.property_types, 1) = 0 OR v_property.property_type = ANY(v_rule.property_types)),
        'price_within_budget', (v_rule.max_bid IS NULL OR v_property.total_due <= v_rule.max_bid),
        'acres_within_range', (
          (v_rule.min_acres IS NULL OR v_property.acres >= v_rule.min_acres) AND
          (v_rule.max_acres IS NULL OR v_property.acres <= v_rule.max_acres)
        )
      );

      -- Create alert (ON CONFLICT DO NOTHING prevents duplicates)
      INSERT INTO property_alerts (
        alert_rule_id,
        property_id,
        match_score,
        match_reasons
      )
      VALUES (
        v_rule.id,
        v_property.id,
        COALESCE(v_property.total_score, 0),
        v_match_reasons
      )
      ON CONFLICT (alert_rule_id, property_id) DO NOTHING;

      -- Check if insert was successful (not a duplicate)
      IF FOUND THEN
        v_alerts_created := v_alerts_created + 1;

        -- Increment match count on the rule
        UPDATE alert_rules
        SET match_count = match_count + 1
        WHERE id = v_rule.id;
      END IF;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_alerts_created, v_rules_checked, v_properties_scanned;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION scan_properties_for_alerts IS 'Scans properties against active alert rules and creates alerts for matches';

-- ============================================================================
-- UPDATE FUNCTION: Mark Alerts as Read
-- ============================================================================
-- Marks one or more alerts as read for a user
-- Returns number of alerts marked as read
CREATE OR REPLACE FUNCTION mark_alerts_read(
  p_alert_ids UUID[],
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Update alerts that belong to the user's rules
  UPDATE property_alerts pa
  SET
    read = TRUE,
    read_at = NOW()
  FROM alert_rules ar
  WHERE pa.alert_rule_id = ar.id
    AND ar.user_id = p_user_id
    AND pa.id = ANY(p_alert_ids)
    AND pa.read = FALSE;  -- Only update if not already read

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_alerts_read IS 'Marks specified alerts as read for a user, returns count of updated alerts';

-- ============================================================================
-- UPDATE FUNCTION: Mark All Alerts as Read
-- ============================================================================
-- Marks all unread alerts as read for a user
-- Returns number of alerts marked as read
CREATE OR REPLACE FUNCTION mark_all_alerts_read(
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Update all unread alerts for user's rules
  UPDATE property_alerts pa
  SET
    read = TRUE,
    read_at = NOW()
  FROM alert_rules ar
  WHERE pa.alert_rule_id = ar.id
    AND ar.user_id = p_user_id
    AND pa.read = FALSE
    AND pa.archived = FALSE;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_all_alerts_read IS 'Marks all unread alerts as read for a user, returns count of updated alerts';

-- ============================================================================
-- QUERY FUNCTION: Get Unread Alert Count
-- ============================================================================
-- Returns count of unread alerts for a user
CREATE OR REPLACE FUNCTION get_unread_alert_count(
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM property_alerts pa
  INNER JOIN alert_rules ar ON pa.alert_rule_id = ar.id
  WHERE ar.user_id = p_user_id
    AND pa.read = FALSE
    AND pa.archived = FALSE;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_unread_alert_count IS 'Returns count of unread, non-archived alerts for a user';

-- ============================================================================
-- UPDATE FUNCTION: Archive Alert
-- ============================================================================
-- Archives one or more alerts for a user
-- Returns number of alerts archived
CREATE OR REPLACE FUNCTION archive_alerts(
  p_alert_ids UUID[],
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Archive alerts that belong to the user's rules
  UPDATE property_alerts pa
  SET
    archived = TRUE,
    archived_at = NOW(),
    read = TRUE,  -- Archiving also marks as read
    read_at = COALESCE(read_at, NOW())
  FROM alert_rules ar
  WHERE pa.alert_rule_id = ar.id
    AND ar.user_id = p_user_id
    AND pa.id = ANY(p_alert_ids)
    AND pa.archived = FALSE;  -- Only update if not already archived

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_alerts IS 'Archives specified alerts for a user, returns count of updated alerts';

-- ============================================================================
-- DELETE FUNCTION: Delete Alert Rule
-- ============================================================================
-- Deletes an alert rule (cascade will delete associated property alerts)
-- Returns TRUE if rule was deleted, FALSE if not found or not owned by user
CREATE OR REPLACE FUNCTION delete_alert_rule(
  p_rule_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM alert_rules
  WHERE id = p_rule_id
    AND user_id = p_user_id;

  v_deleted := FOUND;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_alert_rule IS 'Deletes an alert rule if owned by user, cascade deletes associated alerts';

-- ============================================================================
-- QUERY FUNCTION: Get User Property Alerts
-- ============================================================================
-- Retrieves property alerts for a user with optional filtering
CREATE OR REPLACE FUNCTION get_user_property_alerts(
  p_user_id UUID,
  p_read_status BOOLEAN DEFAULT NULL,  -- NULL = all, TRUE = read only, FALSE = unread only
  p_archived BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  alert_rule_id UUID,
  alert_rule_name TEXT,
  property_id UUID,
  match_score INTEGER,
  match_reasons JSONB,
  read BOOLEAN,
  archived BOOLEAN,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pa.id,
    pa.alert_rule_id,
    ar.name AS alert_rule_name,
    pa.property_id,
    pa.match_score,
    pa.match_reasons,
    pa.read,
    pa.archived,
    pa.read_at,
    pa.archived_at,
    pa.created_at
  FROM property_alerts pa
  INNER JOIN alert_rules ar ON pa.alert_rule_id = ar.id
  WHERE ar.user_id = p_user_id
    AND (p_read_status IS NULL OR pa.read = p_read_status)
    AND pa.archived = p_archived
  ORDER BY pa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_property_alerts IS 'Returns property alerts for a user with filtering and pagination';

-- ============================================================================
-- UPDATE FUNCTION: Update Last Notified Timestamp
-- ============================================================================
-- Updates the last_notified_at timestamp for an alert rule
-- Called after sending email notifications
CREATE OR REPLACE FUNCTION update_rule_last_notified(
  p_rule_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE alert_rules
  SET last_notified_at = NOW()
  WHERE id = p_rule_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_rule_last_notified IS 'Updates last_notified_at timestamp for an alert rule after sending notifications';

-- ============================================================================
-- HELPER FUNCTION: Toggle Alert Rule
-- ============================================================================
-- Enables or disables an alert rule
-- Returns the new enabled status
CREATE OR REPLACE FUNCTION toggle_alert_rule(
  p_rule_id UUID,
  p_user_id UUID,
  p_enabled BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  v_new_status BOOLEAN;
BEGIN
  UPDATE alert_rules
  SET
    enabled = p_enabled,
    updated_at = NOW()
  WHERE id = p_rule_id
    AND user_id = p_user_id
  RETURNING enabled INTO v_new_status;

  RETURN v_new_status;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION toggle_alert_rule IS 'Enables or disables an alert rule, returns new enabled status';

COMMIT;
