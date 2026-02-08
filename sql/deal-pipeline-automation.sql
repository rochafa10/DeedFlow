-- Deal Pipeline Automation Schema
-- Creates functions, tables, and triggers for automatic deal management
-- Apply this to Supabase via SQL Editor (Dashboard > SQL Editor > New Query)
--
-- Date: 2026-02-07
-- Author: Claude Code Agent
--
-- Prerequisites:
--   - deals, pipeline_stages, properties, regrid_data, counties tables must exist
--   - move_deal_to_stage() function must exist
--   - Pipeline stages "Lead", "Research", "Analysis" etc must exist

-- ============================================================================
-- TASK 1: Clean up test deals
-- ============================================================================

DELETE FROM deal_activities;
DELETE FROM deal_assignments;
DELETE FROM deals;

-- ============================================================================
-- TASK 2: Create create_deal_from_property() function
-- ============================================================================

-- Fetches property details and creates a deal automatically.
-- If an active deal already exists for this property+org, returns the existing deal_id.
CREATE OR REPLACE FUNCTION create_deal_from_property(
    p_property_id UUID,
    p_organization_id TEXT,
    p_stage_id UUID,
    p_created_by UUID,
    p_priority TEXT DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
    v_existing_deal_id UUID;
    v_deal_id UUID;
    v_property_address TEXT;
    v_parcel_id TEXT;
    v_total_due NUMERIC;
    v_sale_date TIMESTAMP;
    v_sale_type TEXT;
    v_county_name TEXT;
    v_state_code TEXT;
    v_assessed_value NUMERIC;
    v_market_value NUMERIC;
    v_title TEXT;
    v_description TEXT;
BEGIN
    -- Check if an active deal already exists for this property+org
    SELECT id INTO v_existing_deal_id
    FROM deals
    WHERE property_id = p_property_id
      AND organization_id = p_organization_id
      AND status = 'active'
    LIMIT 1;

    IF v_existing_deal_id IS NOT NULL THEN
        RETURN v_existing_deal_id;
    END IF;

    -- Fetch property details
    SELECT
        p.property_address,
        p.parcel_id,
        p.total_due,
        p.sale_date,
        p.sale_type,
        c.county_name,
        c.state_code
    INTO
        v_property_address,
        v_parcel_id,
        v_total_due,
        v_sale_date,
        v_sale_type,
        v_county_name,
        v_state_code
    FROM properties p
    LEFT JOIN counties c ON p.county_id = c.id
    WHERE p.id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Property not found: %', p_property_id;
    END IF;

    -- Fetch assessed_value from regrid_data (use market_value as fallback)
    SELECT
        COALESCE(rd.assessed_value, rd.market_value)
    INTO v_assessed_value
    FROM regrid_data rd
    WHERE rd.property_id = p_property_id
    LIMIT 1;

    -- Build title: use property_address or fall back to parcel_id
    v_title := COALESCE(
        NULLIF(TRIM(v_property_address), ''),
        'Parcel ' || COALESCE(v_parcel_id, 'Unknown')
    );

    -- Build auto-generated description
    v_description := 'Auto-created deal for ' || v_title;
    IF v_county_name IS NOT NULL THEN
        v_description := v_description || ' in ' || v_county_name || ', ' || COALESCE(v_state_code, '');
    END IF;
    IF v_sale_type IS NOT NULL THEN
        v_description := v_description || '. Sale type: ' || v_sale_type;
    END IF;
    IF v_total_due IS NOT NULL THEN
        v_description := v_description || '. Total due: $' || ROUND(v_total_due, 2)::TEXT;
    END IF;

    -- Create the deal
    INSERT INTO deals (
        organization_id,
        property_id,
        title,
        description,
        current_stage_id,
        target_bid_amount,
        estimated_value,
        auction_date,
        priority,
        status,
        created_by,
        stage_entered_at,
        tags
    ) VALUES (
        p_organization_id,
        p_property_id,
        v_title,
        v_description,
        p_stage_id,
        v_total_due,
        v_assessed_value,
        v_sale_date,
        p_priority,
        'active',
        p_created_by,
        NOW(),
        ARRAY[COALESCE(v_sale_type, 'unknown'), COALESCE(v_state_code, 'unknown')]
    )
    RETURNING id INTO v_deal_id;

    -- Log deal creation activity
    INSERT INTO deal_activities (
        deal_id,
        user_id,
        activity_type,
        title,
        description,
        metadata
    ) VALUES (
        v_deal_id,
        p_created_by,
        'note',
        'Deal auto-created from property',
        'Automatically created from property ' || COALESCE(v_parcel_id, 'N/A') || ' (' || v_title || ')',
        jsonb_build_object(
            'source', 'create_deal_from_property',
            'property_id', p_property_id,
            'parcel_id', v_parcel_id,
            'county', v_county_name,
            'state', v_state_code,
            'sale_type', v_sale_type,
            'total_due', v_total_due,
            'assessed_value', v_assessed_value
        )
    );

    RETURN v_deal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_deal_from_property IS 'Creates a deal from a property, auto-populating title, description, financial data, and auction date from properties/regrid_data/counties tables. Returns existing deal_id if one already exists.';


-- ============================================================================
-- TASK 3: Create pipeline_auto_advance_rules table
-- ============================================================================

CREATE TABLE IF NOT EXISTS pipeline_auto_advance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT,
    from_stage_name TEXT NOT NULL,
    to_stage_name TEXT NOT NULL,
    trigger_condition TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pipeline_auto_advance_rules IS 'Rules for automatically advancing deals between pipeline stages based on property data changes';
COMMENT ON COLUMN pipeline_auto_advance_rules.trigger_condition IS 'The condition that triggers auto-advance (e.g., has_regrid_data, visual_validation_status=approved)';
COMMENT ON COLUMN pipeline_auto_advance_rules.from_stage_name IS 'The pipeline stage name the deal must be in for this rule to apply';
COMMENT ON COLUMN pipeline_auto_advance_rules.to_stage_name IS 'The pipeline stage name to advance the deal to';

-- Insert default rules (idempotent: only insert if not exists)
INSERT INTO pipeline_auto_advance_rules (organization_id, from_stage_name, to_stage_name, trigger_condition, is_enabled)
SELECT 'default', 'Lead', 'Research', 'has_regrid_data = true', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_auto_advance_rules
    WHERE from_stage_name = 'Lead' AND to_stage_name = 'Research' AND trigger_condition = 'has_regrid_data = true'
);

INSERT INTO pipeline_auto_advance_rules (organization_id, from_stage_name, to_stage_name, trigger_condition, is_enabled)
SELECT 'default', 'Research', 'Analysis', 'visual_validation_status = approved', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_auto_advance_rules
    WHERE from_stage_name = 'Research' AND to_stage_name = 'Analysis' AND trigger_condition = 'visual_validation_status = approved'
);

INSERT INTO pipeline_auto_advance_rules (organization_id, from_stage_name, to_stage_name, trigger_condition, is_enabled)
SELECT 'default', 'Analysis', 'Due Diligence', 'title_search_complete', FALSE
WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_auto_advance_rules
    WHERE from_stage_name = 'Analysis' AND to_stage_name = 'Due Diligence' AND trigger_condition = 'title_search_complete'
);

INSERT INTO pipeline_auto_advance_rules (organization_id, from_stage_name, to_stage_name, trigger_condition, is_enabled)
SELECT 'default', 'Due Diligence', 'Bidding', 'auction_registered', FALSE
WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_auto_advance_rules
    WHERE from_stage_name = 'Due Diligence' AND to_stage_name = 'Bidding' AND trigger_condition = 'auction_registered'
);


-- ============================================================================
-- TASK 4: Create auto-advance trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION check_deal_auto_advance()
RETURNS TRIGGER AS $$
DECLARE
    v_deal RECORD;
    v_rule RECORD;
    v_from_stage_id UUID;
    v_to_stage_id UUID;
    v_current_stage_name TEXT;
    v_actor_id UUID;
BEGIN
    -- Loop through all active deals linked to this property
    FOR v_deal IN
        SELECT d.id AS deal_id, d.current_stage_id, d.organization_id, d.created_by,
               ps.name AS current_stage_name
        FROM deals d
        JOIN pipeline_stages ps ON d.current_stage_id = ps.id
        WHERE d.property_id = NEW.id
          AND d.status = 'active'
    LOOP
        v_actor_id := v_deal.created_by;

        -- Check Rule: has_regrid_data changed to true
        IF TG_OP = 'UPDATE'
           AND NEW.has_regrid_data = TRUE
           AND (OLD.has_regrid_data IS NULL OR OLD.has_regrid_data = FALSE)
        THEN
            SELECT * INTO v_rule
            FROM pipeline_auto_advance_rules
            WHERE from_stage_name = v_deal.current_stage_name
              AND trigger_condition = 'has_regrid_data = true'
              AND is_enabled = TRUE
              AND (organization_id IS NULL OR organization_id = v_deal.organization_id)
            LIMIT 1;

            IF v_rule IS NOT NULL THEN
                SELECT id INTO v_to_stage_id
                FROM pipeline_stages
                WHERE name = v_rule.to_stage_name
                  AND organization_id = v_deal.organization_id
                  AND is_active = TRUE
                LIMIT 1;

                IF v_to_stage_id IS NOT NULL AND v_to_stage_id != v_deal.current_stage_id THEN
                    PERFORM move_deal_to_stage(
                        v_deal.deal_id,
                        v_to_stage_id,
                        v_actor_id,
                        'Auto-advanced: Regrid data synced for property'
                    );
                END IF;
            END IF;
        END IF;

        -- Check Rule: visual_validation_status changed to 'approved'
        IF TG_OP = 'UPDATE'
           AND NEW.visual_validation_status = 'approved'
           AND (OLD.visual_validation_status IS NULL OR OLD.visual_validation_status != 'approved')
        THEN
            -- Re-fetch deal stage name (may have been advanced above)
            SELECT ps.name INTO v_current_stage_name
            FROM deals d
            JOIN pipeline_stages ps ON d.current_stage_id = ps.id
            WHERE d.id = v_deal.deal_id;

            SELECT * INTO v_rule
            FROM pipeline_auto_advance_rules
            WHERE from_stage_name = v_current_stage_name
              AND trigger_condition = 'visual_validation_status = approved'
              AND is_enabled = TRUE
              AND (organization_id IS NULL OR organization_id = v_deal.organization_id)
            LIMIT 1;

            IF v_rule IS NOT NULL THEN
                SELECT id INTO v_to_stage_id
                FROM pipeline_stages
                WHERE name = v_rule.to_stage_name
                  AND organization_id = v_deal.organization_id
                  AND is_active = TRUE
                LIMIT 1;

                IF v_to_stage_id IS NOT NULL THEN
                    SELECT current_stage_id INTO v_from_stage_id
                    FROM deals WHERE id = v_deal.deal_id;

                    IF v_to_stage_id != v_from_stage_id THEN
                        PERFORM move_deal_to_stage(
                            v_deal.deal_id,
                            v_to_stage_id,
                            v_actor_id,
                            'Auto-advanced: Visual validation approved'
                        );
                    END IF;
                END IF;
            END IF;
        END IF;

    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_deal_auto_advance IS 'Trigger function that auto-advances deals through pipeline stages when property data changes (has_regrid_data, visual_validation_status)';

DROP TRIGGER IF EXISTS trg_deal_auto_advance ON properties;

CREATE TRIGGER trg_deal_auto_advance
    AFTER UPDATE OF has_regrid_data, visual_validation_status ON properties
    FOR EACH ROW
    EXECUTE FUNCTION check_deal_auto_advance();


-- ============================================================================
-- TASK 5: Create auto-deal-creation trigger on visual validation approval
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_deal_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id TEXT := 'default';
    v_lead_stage_id UUID;
    v_created_by UUID;
    v_existing_deal_id UUID;
BEGIN
    -- Only fire when visual_validation_status changes to 'approved'
    IF TG_OP = 'UPDATE'
       AND NEW.visual_validation_status = 'approved'
       AND (OLD.visual_validation_status IS NULL OR OLD.visual_validation_status != 'approved')
    THEN
        -- Check if property already has an active deal
        SELECT id INTO v_existing_deal_id
        FROM deals
        WHERE property_id = NEW.id
          AND status = 'active'
        LIMIT 1;

        IF v_existing_deal_id IS NOT NULL THEN
            RETURN NEW;
        END IF;

        -- Find the "Lead" stage for the default organization
        SELECT id INTO v_lead_stage_id
        FROM pipeline_stages
        WHERE name = 'Lead'
          AND organization_id = v_organization_id
          AND is_active = TRUE
        LIMIT 1;

        IF v_lead_stage_id IS NULL THEN
            RETURN NEW;
        END IF;

        -- Find a user to be the creator (admin from org, or any auth user)
        SELECT om.user_id INTO v_created_by
        FROM organization_members om
        WHERE om.organization_id::TEXT = v_organization_id
          AND om.role = 'admin'
          AND om.status = 'active'
        LIMIT 1;

        IF v_created_by IS NULL THEN
            SELECT id INTO v_created_by
            FROM auth.users
            LIMIT 1;
        END IF;

        IF v_created_by IS NULL THEN
            RETURN NEW;
        END IF;

        -- Create the deal
        PERFORM create_deal_from_property(
            NEW.id,
            v_organization_id,
            v_lead_stage_id,
            v_created_by,
            'medium'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_create_deal_on_approval IS 'Automatically creates a deal in the Lead stage when a property visual validation status changes to approved, if no active deal exists for that property';

DROP TRIGGER IF EXISTS trg_auto_create_deal_on_approval ON properties;

CREATE TRIGGER trg_auto_create_deal_on_approval
    AFTER UPDATE OF visual_validation_status ON properties
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_deal_on_approval();
