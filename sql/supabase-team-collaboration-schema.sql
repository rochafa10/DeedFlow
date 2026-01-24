-- Team & Firm Collaboration Schema
-- Multi-user accounts for investment firms with role-based permissions,
-- shared watchlists, deal flow pipelines, and activity audit logs

-- ============================================================================
-- ORGANIZATIONS & MEMBERS
-- ============================================================================

-- Table: Organizations (Company/Firm accounts)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
    plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'team', 'enterprise')),

    -- Organization settings
    settings JSONB DEFAULT '{
        "features": {
            "shared_watchlists": true,
            "deal_pipeline": true,
            "audit_log": true,
            "advanced_analytics": false
        },
        "limits": {
            "max_members": 5,
            "max_watchlists": 10,
            "max_properties_per_watchlist": 100
        }
    }'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Soft delete support
    deleted_at TIMESTAMPTZ,

    CONSTRAINT organizations_name_length CHECK (length(name) >= 2 AND length(name) <= 100),
    CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Table: Organization Members (Team members with roles)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Role-based access control
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'analyst', 'viewer')),

    -- Invitation tracking
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invitation_accepted_at TIMESTAMPTZ,

    -- Member status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'removed')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,

    -- Unique constraint: one membership per user per organization
    UNIQUE(organization_id, user_id)
);

-- ============================================================================
-- DEAL PIPELINE
-- ============================================================================

-- Table: Pipeline Stages (Customizable stages for deal flow)
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Stage details
    name TEXT NOT NULL, -- e.g., 'Lead', 'Qualified', 'Analysis', 'Due Diligence', 'Bidding', 'Won', 'Lost'
    description TEXT,
    color TEXT, -- Hex color for UI display

    -- Stage ordering and behavior
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_terminal BOOLEAN DEFAULT false, -- Is this a final stage (Won/Lost)?
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: stage names must be unique per organization
    UNIQUE(organization_id, name)
);

-- Table: Deals (Properties/opportunities in the pipeline)
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Property reference
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL, -- Link to main properties table

    -- Deal details
    title TEXT NOT NULL,
    description TEXT,

    -- Pipeline tracking
    current_stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
    previous_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
    stage_entered_at TIMESTAMPTZ DEFAULT NOW(),

    -- Financial tracking
    target_bid_amount NUMERIC,
    max_bid_amount NUMERIC,
    actual_bid_amount NUMERIC,
    purchase_price NUMERIC,
    estimated_value NUMERIC,
    estimated_profit NUMERIC,

    -- Priority and status
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'abandoned')),

    -- Assignment
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Important dates
    auction_date TIMESTAMPTZ,
    registration_deadline TIMESTAMPTZ,
    won_at TIMESTAMPTZ,
    lost_at TIMESTAMPTZ,

    -- Metadata
    tags TEXT[], -- Array of tags for filtering
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Deal Assignments (Team members working on deals)
CREATE TABLE IF NOT EXISTS deal_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Assignment details
    role TEXT, -- e.g., 'lead', 'analyst', 'reviewer'
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT true,
    removed_at TIMESTAMPTZ,

    -- Unique constraint: one assignment per user per deal
    UNIQUE(deal_id, user_id)
);

-- Table: Deal Activities (Notes, status changes, updates)
CREATE TABLE IF NOT EXISTS deal_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Activity details
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'note', 'status_change', 'stage_change', 'assignment',
        'bid_update', 'document_added', 'email_sent', 'phone_call', 'meeting'
    )),

    title TEXT NOT NULL,
    description TEXT,

    -- Stage change tracking
    from_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
    to_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional activity-specific data

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_plan_type ON organizations(plan_type);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_organization_members_org ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user ON organization_members(user_id);
CREATE INDEX idx_organization_members_role ON organization_members(role);
CREATE INDEX idx_organization_members_status ON organization_members(status);

-- Deal Pipeline indexes
CREATE INDEX idx_pipeline_stages_org ON pipeline_stages(organization_id);
CREATE INDEX idx_pipeline_stages_sort_order ON pipeline_stages(sort_order);
CREATE INDEX idx_pipeline_stages_is_active ON pipeline_stages(is_active);

CREATE INDEX idx_deals_org ON deals(organization_id);
CREATE INDEX idx_deals_property ON deals(property_id);
CREATE INDEX idx_deals_current_stage ON deals(current_stage_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_priority ON deals(priority);
CREATE INDEX idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX idx_deals_created_by ON deals(created_by);
CREATE INDEX idx_deals_auction_date ON deals(auction_date);

CREATE INDEX idx_deal_assignments_deal ON deal_assignments(deal_id);
CREATE INDEX idx_deal_assignments_user ON deal_assignments(user_id);
CREATE INDEX idx_deal_assignments_is_active ON deal_assignments(is_active);

CREATE INDEX idx_deal_activities_deal ON deal_activities(deal_id);
CREATE INDEX idx_deal_activities_user ON deal_activities(user_id);
CREATE INDEX idx_deal_activities_type ON deal_activities(activity_type);
CREATE INDEX idx_deal_activities_created_at ON deal_activities(created_at);

-- ============================================================================
-- VIEWS FOR EASY QUERYING
-- ============================================================================

-- View: Active organizations with member counts
CREATE OR REPLACE VIEW vw_organizations_with_stats AS
SELECT
    o.id,
    o.name,
    o.slug,
    o.plan_type,
    o.settings,
    o.created_at,

    -- Member counts
    COUNT(om.id) FILTER (WHERE om.status = 'active') as active_member_count,
    COUNT(om.id) FILTER (WHERE om.status = 'pending') as pending_member_count,

    -- Admin list
    array_agg(om.user_id) FILTER (WHERE om.role = 'admin' AND om.status = 'active') as admin_user_ids

FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
WHERE o.deleted_at IS NULL
GROUP BY o.id;

-- View: Organization members with user details
CREATE OR REPLACE VIEW vw_organization_members_detailed AS
SELECT
    om.id,
    om.organization_id,
    o.name as organization_name,
    om.user_id,
    om.role,
    om.status,
    om.joined_at,
    om.created_at,

    -- Invitation details
    om.invited_by,
    om.invitation_accepted_at,

    -- Organization info
    o.plan_type as organization_plan_type

FROM organization_members om
JOIN organizations o ON om.organization_id = o.id
WHERE o.deleted_at IS NULL;

-- View: Deals with full details
CREATE OR REPLACE VIEW vw_deals_complete AS
SELECT
    d.id,
    d.organization_id,
    o.name as organization_name,

    -- Property details
    d.property_id,
    d.title,
    d.description,

    -- Pipeline tracking
    d.current_stage_id,
    ps.name as current_stage_name,
    ps.color as current_stage_color,
    d.stage_entered_at,

    -- Financial
    d.target_bid_amount,
    d.max_bid_amount,
    d.actual_bid_amount,
    d.purchase_price,
    d.estimated_value,
    d.estimated_profit,

    -- Status and priority
    d.priority,
    d.status,

    -- Assignment
    d.assigned_to,
    d.created_by,

    -- Dates
    d.auction_date,
    d.registration_deadline,
    d.won_at,
    d.lost_at,

    -- Metadata
    d.tags,
    d.custom_fields,
    d.created_at,
    d.updated_at,

    -- Team member counts
    (SELECT COUNT(*) FROM deal_assignments WHERE deal_id = d.id AND is_active = true) as active_team_members,

    -- Activity counts
    (SELECT COUNT(*) FROM deal_activities WHERE deal_id = d.id) as activity_count

FROM deals d
JOIN organizations o ON d.organization_id = o.id
JOIN pipeline_stages ps ON d.current_stage_id = ps.id
WHERE o.deleted_at IS NULL;

-- View: Pipeline overview by organization
CREATE OR REPLACE VIEW vw_pipeline_overview AS
SELECT
    o.id as organization_id,
    o.name as organization_name,
    ps.id as stage_id,
    ps.name as stage_name,
    ps.color as stage_color,
    ps.sort_order,

    -- Deal counts
    COUNT(d.id) as deal_count,
    COUNT(d.id) FILTER (WHERE d.priority = 'urgent') as urgent_count,
    COUNT(d.id) FILTER (WHERE d.priority = 'high') as high_priority_count,

    -- Financial summary
    SUM(d.estimated_value) as total_estimated_value,
    SUM(d.estimated_profit) as total_estimated_profit,
    AVG(d.estimated_profit) as avg_estimated_profit

FROM organizations o
LEFT JOIN pipeline_stages ps ON o.id = ps.organization_id AND ps.is_active = true
LEFT JOIN deals d ON ps.id = d.current_stage_id AND d.status = 'active'
WHERE o.deleted_at IS NULL
GROUP BY o.id, o.name, ps.id, ps.name, ps.color, ps.sort_order
ORDER BY o.name, ps.sort_order;

-- View: Active deals with assignments
CREATE OR REPLACE VIEW vw_active_deals_with_team AS
SELECT
    d.id as deal_id,
    d.organization_id,
    d.title,
    d.current_stage_id,
    ps.name as stage_name,
    d.priority,
    d.auction_date,
    d.registration_deadline,
    d.assigned_to as primary_assignee,

    -- Team members
    array_agg(DISTINCT da.user_id) FILTER (WHERE da.is_active = true) as team_member_ids,
    COUNT(DISTINCT da.user_id) FILTER (WHERE da.is_active = true) as team_size

FROM deals d
JOIN pipeline_stages ps ON d.current_stage_id = ps.id
LEFT JOIN deal_assignments da ON d.id = da.deal_id
WHERE d.status = 'active'
GROUP BY d.id, d.organization_id, d.title, d.current_stage_id, ps.name, d.priority, d.auction_date, d.registration_deadline, d.assigned_to;

-- View: Recent deal activities
CREATE OR REPLACE VIEW vw_recent_deal_activities AS
SELECT
    da.id,
    da.deal_id,
    d.title as deal_title,
    d.organization_id,
    da.user_id,
    da.activity_type,
    da.title as activity_title,
    da.description,
    da.from_stage_id,
    ps_from.name as from_stage_name,
    da.to_stage_id,
    ps_to.name as to_stage_name,
    da.metadata,
    da.created_at

FROM deal_activities da
JOIN deals d ON da.deal_id = d.id
LEFT JOIN pipeline_stages ps_from ON da.from_stage_id = ps_from.id
LEFT JOIN pipeline_stages ps_to ON da.to_stage_id = ps_to.id
ORDER BY da.created_at DESC;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID)
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    organization_slug TEXT,
    member_role TEXT,
    member_status TEXT,
    joined_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.slug,
        om.role,
        om.status,
        om.joined_at
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = p_user_id
      AND o.deleted_at IS NULL
      AND om.status = 'active'
    ORDER BY om.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has organization access
CREATE OR REPLACE FUNCTION user_has_org_access(p_user_id UUID, p_organization_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM organization_members om
        JOIN organizations o ON om.organization_id = o.id
        WHERE om.user_id = p_user_id
          AND om.organization_id = p_organization_id
          AND om.status = 'active'
          AND o.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has specific role in organization
CREATE OR REPLACE FUNCTION user_has_org_role(
    p_user_id UUID,
    p_organization_id UUID,
    p_required_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
    v_role_hierarchy JSONB := '{
        "admin": 3,
        "analyst": 2,
        "viewer": 1
    }'::jsonb;
BEGIN
    -- Get user's role
    SELECT role INTO v_user_role
    FROM organization_members om
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = p_user_id
      AND om.organization_id = p_organization_id
      AND om.status = 'active'
      AND o.deleted_at IS NULL;

    -- If no role found, return false
    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user's role meets or exceeds required role
    RETURN (v_role_hierarchy->>v_user_role)::int >= (v_role_hierarchy->>p_required_role)::int;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create organization with initial admin
CREATE OR REPLACE FUNCTION create_organization_with_admin(
    p_name TEXT,
    p_slug TEXT,
    p_plan_type TEXT,
    p_admin_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Create organization
    INSERT INTO organizations (name, slug, plan_type)
    VALUES (p_name, p_slug, p_plan_type)
    RETURNING id INTO v_org_id;

    -- Add creator as admin
    INSERT INTO organization_members (
        organization_id,
        user_id,
        role,
        status,
        joined_at
    ) VALUES (
        v_org_id,
        p_admin_user_id,
        'admin',
        'active',
        NOW()
    );

    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Invite user to organization
CREATE OR REPLACE FUNCTION invite_user_to_organization(
    p_organization_id UUID,
    p_user_id UUID,
    p_role TEXT,
    p_invited_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_member_id UUID;
BEGIN
    -- Check if inviter has admin access
    IF NOT user_has_org_role(p_invited_by, p_organization_id, 'admin') THEN
        RAISE EXCEPTION 'Only admins can invite users';
    END IF;

    -- Create pending membership
    INSERT INTO organization_members (
        organization_id,
        user_id,
        role,
        status,
        invited_by
    ) VALUES (
        p_organization_id,
        p_user_id,
        p_role,
        'pending',
        p_invited_by
    )
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET
        role = EXCLUDED.role,
        status = 'pending',
        invited_by = EXCLUDED.invited_by,
        updated_at = NOW()
    RETURNING id INTO v_member_id;

    RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Accept organization invitation
CREATE OR REPLACE FUNCTION accept_organization_invitation(
    p_member_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_member_user_id UUID;
BEGIN
    -- Verify this invitation belongs to the user
    SELECT user_id INTO v_member_user_id
    FROM organization_members
    WHERE id = p_member_id AND status = 'pending';

    IF v_member_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or already accepted invitation';
    END IF;

    IF v_member_user_id != p_user_id THEN
        RAISE EXCEPTION 'This invitation is not for you';
    END IF;

    -- Accept invitation
    UPDATE organization_members
    SET
        status = 'active',
        joined_at = NOW(),
        invitation_accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_member_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Remove member from organization
CREATE OR REPLACE FUNCTION remove_organization_member(
    p_member_id UUID,
    p_removed_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_target_user_id UUID;
    v_target_role TEXT;
BEGIN
    -- Get member details
    SELECT organization_id, user_id, role
    INTO v_org_id, v_target_user_id, v_target_role
    FROM organization_members
    WHERE id = p_member_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Member not found';
    END IF;

    -- Check if remover has admin access
    IF NOT user_has_org_role(p_removed_by, v_org_id, 'admin') THEN
        RAISE EXCEPTION 'Only admins can remove members';
    END IF;

    -- Prevent removing the last admin
    IF v_target_role = 'admin' THEN
        IF (SELECT COUNT(*) FROM organization_members
            WHERE organization_id = v_org_id
            AND role = 'admin'
            AND status = 'active') <= 1 THEN
            RAISE EXCEPTION 'Cannot remove the last admin';
        END IF;
    END IF;

    -- Remove member
    UPDATE organization_members
    SET
        status = 'removed',
        updated_at = NOW()
    WHERE id = p_member_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Move deal to different stage
CREATE OR REPLACE FUNCTION move_deal_to_stage(
    p_deal_id UUID,
    p_new_stage_id UUID,
    p_user_id UUID,
    p_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_stage_id UUID;
    v_old_stage_name TEXT;
    v_new_stage_name TEXT;
BEGIN
    -- Get current stage
    SELECT current_stage_id INTO v_old_stage_id
    FROM deals
    WHERE id = p_deal_id;

    IF v_old_stage_id IS NULL THEN
        RAISE EXCEPTION 'Deal not found';
    END IF;

    -- Get stage names
    SELECT name INTO v_old_stage_name FROM pipeline_stages WHERE id = v_old_stage_id;
    SELECT name INTO v_new_stage_name FROM pipeline_stages WHERE id = p_new_stage_id;

    -- Update deal
    UPDATE deals
    SET
        previous_stage_id = v_old_stage_id,
        current_stage_id = p_new_stage_id,
        stage_entered_at = NOW(),
        updated_at = NOW()
    WHERE id = p_deal_id;

    -- Log activity
    INSERT INTO deal_activities (
        deal_id,
        user_id,
        activity_type,
        title,
        description,
        from_stage_id,
        to_stage_id
    ) VALUES (
        p_deal_id,
        p_user_id,
        'stage_change',
        'Moved from ' || v_old_stage_name || ' to ' || v_new_stage_name,
        p_note,
        v_old_stage_id,
        p_new_stage_id
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Assign user to deal
CREATE OR REPLACE FUNCTION assign_user_to_deal(
    p_deal_id UUID,
    p_user_id UUID,
    p_role TEXT DEFAULT NULL,
    p_assigned_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_assignment_id UUID;
BEGIN
    -- Insert or update assignment
    INSERT INTO deal_assignments (
        deal_id,
        user_id,
        role,
        assigned_by,
        is_active
    ) VALUES (
        p_deal_id,
        p_user_id,
        p_role,
        p_assigned_by,
        true
    )
    ON CONFLICT (deal_id, user_id)
    DO UPDATE SET
        is_active = true,
        removed_at = NULL,
        assigned_at = NOW()
    RETURNING id INTO v_assignment_id;

    -- Log activity
    INSERT INTO deal_activities (
        deal_id,
        user_id,
        activity_type,
        title
    ) VALUES (
        p_deal_id,
        p_assigned_by,
        'assignment',
        'Assigned user to deal'
    );

    RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get deals for user
CREATE OR REPLACE FUNCTION get_user_deals(
    p_user_id UUID,
    p_organization_id UUID,
    p_status TEXT DEFAULT 'active'
)
RETURNS TABLE (
    deal_id UUID,
    title TEXT,
    stage_name TEXT,
    priority TEXT,
    auction_date TIMESTAMPTZ,
    assigned_role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        ps.name,
        d.priority,
        d.auction_date,
        da.role
    FROM deals d
    JOIN pipeline_stages ps ON d.current_stage_id = ps.id
    LEFT JOIN deal_assignments da ON d.id = da.deal_id AND da.user_id = p_user_id AND da.is_active = true
    WHERE d.organization_id = p_organization_id
      AND d.status = p_status
      AND (d.assigned_to = p_user_id OR da.user_id = p_user_id)
    ORDER BY d.priority DESC, d.auction_date ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Add deal activity/note
CREATE OR REPLACE FUNCTION add_deal_activity(
    p_deal_id UUID,
    p_user_id UUID,
    p_activity_type TEXT,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO deal_activities (
        deal_id,
        user_id,
        activity_type,
        title,
        description,
        metadata
    ) VALUES (
        p_deal_id,
        p_user_id,
        p_activity_type,
        p_title,
        p_description,
        p_metadata
    )
    RETURNING id INTO v_activity_id;

    -- Update deal timestamp
    UPDATE deals
    SET updated_at = NOW()
    WHERE id = p_deal_id;

    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Initialize default pipeline stages for organization
CREATE OR REPLACE FUNCTION initialize_default_pipeline_stages(p_organization_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO pipeline_stages (organization_id, name, description, color, sort_order, is_terminal)
    VALUES
        (p_organization_id, 'Lead', 'Initial property identification', '#9CA3AF', 1, false),
        (p_organization_id, 'Qualified', 'Property meets basic criteria', '#3B82F6', 2, false),
        (p_organization_id, 'Analysis', 'Detailed research and analysis', '#8B5CF6', 3, false),
        (p_organization_id, 'Due Diligence', 'Title search and inspections', '#F59E0B', 4, false),
        (p_organization_id, 'Bidding', 'Registered and ready to bid', '#EF4444', 5, false),
        (p_organization_id, 'Won', 'Successfully acquired property', '#10B981', 6, true),
        (p_organization_id, 'Lost', 'Did not win or abandoned', '#6B7280', 7, true)
    ON CONFLICT (organization_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Trigger function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_stages_updated_at
    BEFORE UPDATE ON pipeline_stages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE organizations IS 'Company/firm accounts for multi-user collaboration';
COMMENT ON TABLE organization_members IS 'Team members with role-based access control';
COMMENT ON TABLE pipeline_stages IS 'Customizable deal pipeline stages per organization';
COMMENT ON TABLE deals IS 'Properties/opportunities being tracked through the pipeline';
COMMENT ON TABLE deal_assignments IS 'Team member assignments to specific deals';
COMMENT ON TABLE deal_activities IS 'Activity log and notes for deals';

COMMENT ON COLUMN organizations.slug IS 'URL-friendly unique identifier for organization';
COMMENT ON COLUMN organizations.plan_type IS 'Subscription plan: free, team, or enterprise';
COMMENT ON COLUMN organizations.settings IS 'JSON configuration for features and limits';

COMMENT ON COLUMN pipeline_stages.is_terminal IS 'Final stages like Won/Lost that end the pipeline';
COMMENT ON COLUMN deals.status IS 'Overall deal status: active, won, lost, or abandoned';
COMMENT ON COLUMN deals.custom_fields IS 'Organization-specific custom data fields';
COMMENT ON COLUMN deal_activities.activity_type IS 'Type of activity: note, status_change, stage_change, etc.';

COMMENT ON COLUMN organization_members.role IS 'User role: admin (full access), analyst (read/write), viewer (read-only)';
COMMENT ON COLUMN organization_members.status IS 'Membership status: pending (invited), active, suspended, removed';

-- ============================================================================
-- WATCHLISTS & SAVED PROPERTIES
-- ============================================================================

-- Table: Watchlists (Saved property collections)
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,

    -- Ownership
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Sharing settings
    is_shared BOOLEAN DEFAULT false, -- Shared with entire organization
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),

    -- Metadata
    color TEXT, -- For UI categorization (e.g., '#FF5733')
    icon TEXT, -- Icon identifier for UI
    sort_order INTEGER DEFAULT 0, -- For custom ordering

    -- Settings
    settings JSONB DEFAULT '{
        "notifications": {
            "price_changes": false,
            "status_updates": false,
            "auction_reminders": false
        },
        "auto_filters": {
            "min_value": null,
            "max_value": null,
            "property_types": []
        }
    }'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Soft delete support
    deleted_at TIMESTAMPTZ,

    CONSTRAINT watchlists_name_length CHECK (length(name) >= 1 AND length(name) <= 100)
);

-- Table: Watchlist Properties (Many-to-many relationship)
CREATE TABLE IF NOT EXISTS watchlist_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

    -- User notes and flags
    notes TEXT,
    priority INTEGER DEFAULT 0, -- Higher number = more important
    is_favorite BOOLEAN DEFAULT false,

    -- Custom fields
    tags TEXT[], -- User-defined tags
    custom_data JSONB DEFAULT '{}'::jsonb, -- Flexible storage for custom fields

    -- Tracking
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    last_viewed_at TIMESTAMPTZ,
    view_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one property per watchlist
    UNIQUE(watchlist_id, property_id)
);

-- Table: Watchlist Collaborators (Fine-grained access control)
CREATE TABLE IF NOT EXISTS watchlist_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Permission level
    permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'admin')),

    -- Invitation tracking
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one collaborator per watchlist per user
    UNIQUE(watchlist_id, user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_watchlists_organization ON watchlists(organization_id);
CREATE INDEX idx_watchlists_created_by ON watchlists(created_by);
CREATE INDEX idx_watchlists_visibility ON watchlists(visibility);
CREATE INDEX idx_watchlists_deleted_at ON watchlists(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_watchlist_properties_watchlist ON watchlist_properties(watchlist_id);
CREATE INDEX idx_watchlist_properties_property ON watchlist_properties(property_id);
CREATE INDEX idx_watchlist_properties_added_by ON watchlist_properties(added_by);
CREATE INDEX idx_watchlist_properties_priority ON watchlist_properties(priority);
CREATE INDEX idx_watchlist_properties_favorite ON watchlist_properties(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_watchlist_properties_tags ON watchlist_properties USING GIN(tags);

CREATE INDEX idx_watchlist_collaborators_watchlist ON watchlist_collaborators(watchlist_id);
CREATE INDEX idx_watchlist_collaborators_user ON watchlist_collaborators(user_id);
CREATE INDEX idx_watchlist_collaborators_permission ON watchlist_collaborators(permission);

-- ============================================================================
-- VIEWS FOR EASY QUERYING
-- ============================================================================

-- View: Watchlists with property counts and metadata
CREATE OR REPLACE VIEW vw_watchlists_with_stats AS
SELECT
    w.id,
    w.name,
    w.description,
    w.organization_id,
    w.created_by,
    w.is_shared,
    w.visibility,
    w.color,
    w.icon,
    w.sort_order,
    w.settings,
    w.created_at,
    w.updated_at,

    -- Property counts
    COUNT(wp.id) as property_count,
    COUNT(wp.id) FILTER (WHERE wp.is_favorite = true) as favorite_count,

    -- Latest activity
    MAX(wp.added_at) as last_property_added_at,

    -- Collaborator count
    (SELECT COUNT(*) FROM watchlist_collaborators WHERE watchlist_id = w.id) as collaborator_count

FROM watchlists w
LEFT JOIN watchlist_properties wp ON w.id = wp.watchlist_id
WHERE w.deleted_at IS NULL
GROUP BY w.id;

-- View: Watchlist properties with complete details
CREATE OR REPLACE VIEW vw_watchlist_properties_detailed AS
SELECT
    wp.id,
    wp.watchlist_id,
    w.name as watchlist_name,
    wp.property_id,
    wp.notes,
    wp.priority,
    wp.is_favorite,
    wp.tags,
    wp.added_by,
    wp.added_at,
    wp.last_viewed_at,
    wp.view_count,

    -- Watchlist details
    w.organization_id,
    w.visibility as watchlist_visibility,

    -- Property details (will join with properties table)
    p.parcel_number,
    p.property_address,
    p.city,
    p.state,
    p.zip_code,
    p.total_due,

    -- County details
    c.county_name,
    c.state_code

FROM watchlist_properties wp
JOIN watchlists w ON wp.watchlist_id = w.id
JOIN properties p ON wp.property_id = p.id
LEFT JOIN counties c ON p.county_id = c.id
WHERE w.deleted_at IS NULL;

-- View: User's accessible watchlists
CREATE OR REPLACE VIEW vw_user_watchlists AS
SELECT DISTINCT
    w.id,
    w.name,
    w.description,
    w.organization_id,
    w.created_by,
    w.visibility,
    w.color,
    w.icon,

    -- Access type
    CASE
        WHEN w.created_by = auth.uid() THEN 'owner'
        WHEN wc.permission IS NOT NULL THEN wc.permission
        WHEN w.is_shared AND om.organization_id IS NOT NULL THEN 'view'
        ELSE NULL
    END as user_permission,

    -- Property count
    (SELECT COUNT(*) FROM watchlist_properties WHERE watchlist_id = w.id) as property_count

FROM watchlists w
LEFT JOIN watchlist_collaborators wc ON w.id = wc.watchlist_id AND wc.user_id = auth.uid()
LEFT JOIN organization_members om ON w.organization_id = om.organization_id AND om.user_id = auth.uid() AND om.status = 'active'
WHERE w.deleted_at IS NULL
  AND (
    w.created_by = auth.uid() -- Owner
    OR wc.user_id = auth.uid() -- Explicit collaborator
    OR (w.is_shared AND om.organization_id IS NOT NULL) -- Shared with org
    OR w.visibility = 'public' -- Public watchlist
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get user's watchlists
CREATE OR REPLACE FUNCTION get_user_watchlists(p_user_id UUID)
RETURNS TABLE (
    watchlist_id UUID,
    watchlist_name TEXT,
    watchlist_description TEXT,
    organization_id UUID,
    property_count BIGINT,
    user_permission TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.name,
        w.description,
        w.organization_id,
        COUNT(wp.id) as property_count,
        CASE
            WHEN w.created_by = p_user_id THEN 'owner'
            WHEN wc.permission IS NOT NULL THEN wc.permission
            WHEN w.is_shared THEN 'view'
            ELSE NULL
        END as user_permission,
        w.created_at
    FROM watchlists w
    LEFT JOIN watchlist_properties wp ON w.id = wp.watchlist_id
    LEFT JOIN watchlist_collaborators wc ON w.id = wc.watchlist_id AND wc.user_id = p_user_id
    LEFT JOIN organization_members om ON w.organization_id = om.organization_id AND om.user_id = p_user_id
    WHERE w.deleted_at IS NULL
      AND (
        w.created_by = p_user_id
        OR wc.user_id = p_user_id
        OR (w.is_shared AND om.organization_id IS NOT NULL AND om.status = 'active')
      )
    GROUP BY w.id, wc.permission
    ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Add property to watchlist
CREATE OR REPLACE FUNCTION add_property_to_watchlist(
    p_watchlist_id UUID,
    p_property_id UUID,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_priority INTEGER DEFAULT 0,
    p_tags TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID AS $$
DECLARE
    v_watchlist_property_id UUID;
    v_org_id UUID;
    v_max_properties INTEGER;
    v_current_count INTEGER;
BEGIN
    -- Get watchlist organization
    SELECT organization_id INTO v_org_id
    FROM watchlists
    WHERE id = p_watchlist_id AND deleted_at IS NULL;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Watchlist not found';
    END IF;

    -- Check organization limits
    SELECT (settings->'limits'->>'max_properties_per_watchlist')::integer
    INTO v_max_properties
    FROM organizations
    WHERE id = v_org_id;

    SELECT COUNT(*) INTO v_current_count
    FROM watchlist_properties
    WHERE watchlist_id = p_watchlist_id;

    IF v_max_properties IS NOT NULL AND v_current_count >= v_max_properties THEN
        RAISE EXCEPTION 'Watchlist has reached maximum property limit of %', v_max_properties;
    END IF;

    -- Add property to watchlist (or update if exists)
    INSERT INTO watchlist_properties (
        watchlist_id,
        property_id,
        notes,
        priority,
        tags,
        added_by,
        added_at
    ) VALUES (
        p_watchlist_id,
        p_property_id,
        p_notes,
        p_priority,
        p_tags,
        p_user_id,
        NOW()
    )
    ON CONFLICT (watchlist_id, property_id)
    DO UPDATE SET
        notes = COALESCE(EXCLUDED.notes, watchlist_properties.notes),
        priority = EXCLUDED.priority,
        tags = EXCLUDED.tags,
        updated_at = NOW()
    RETURNING id INTO v_watchlist_property_id;

    RETURN v_watchlist_property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Remove property from watchlist
CREATE OR REPLACE FUNCTION remove_property_from_watchlist(
    p_watchlist_id UUID,
    p_property_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_watchlist_owner UUID;
BEGIN
    -- Check if user owns the watchlist or has edit permission
    SELECT created_by INTO v_watchlist_owner
    FROM watchlists
    WHERE id = p_watchlist_id AND deleted_at IS NULL;

    IF v_watchlist_owner IS NULL THEN
        RAISE EXCEPTION 'Watchlist not found';
    END IF;

    IF v_watchlist_owner != p_user_id THEN
        IF NOT EXISTS (
            SELECT 1 FROM watchlist_collaborators
            WHERE watchlist_id = p_watchlist_id
              AND user_id = p_user_id
              AND permission IN ('edit', 'admin')
        ) THEN
            RAISE EXCEPTION 'You do not have permission to remove properties from this watchlist';
        END IF;
    END IF;

    -- Remove property
    DELETE FROM watchlist_properties
    WHERE watchlist_id = p_watchlist_id
      AND property_id = p_property_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Share watchlist with user
CREATE OR REPLACE FUNCTION share_watchlist_with_user(
    p_watchlist_id UUID,
    p_user_id UUID,
    p_permission TEXT,
    p_shared_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_collaborator_id UUID;
    v_watchlist_owner UUID;
BEGIN
    -- Verify watchlist exists and get owner
    SELECT created_by INTO v_watchlist_owner
    FROM watchlists
    WHERE id = p_watchlist_id AND deleted_at IS NULL;

    IF v_watchlist_owner IS NULL THEN
        RAISE EXCEPTION 'Watchlist not found';
    END IF;

    -- Check if sharer has permission
    IF v_watchlist_owner != p_shared_by THEN
        IF NOT EXISTS (
            SELECT 1 FROM watchlist_collaborators
            WHERE watchlist_id = p_watchlist_id
              AND user_id = p_shared_by
              AND permission = 'admin'
        ) THEN
            RAISE EXCEPTION 'Only watchlist owner or admins can share';
        END IF;
    END IF;

    -- Add collaborator
    INSERT INTO watchlist_collaborators (
        watchlist_id,
        user_id,
        permission,
        invited_by,
        invited_at
    ) VALUES (
        p_watchlist_id,
        p_user_id,
        p_permission,
        p_shared_by,
        NOW()
    )
    ON CONFLICT (watchlist_id, user_id)
    DO UPDATE SET
        permission = EXCLUDED.permission,
        invited_by = EXCLUDED.invited_by,
        updated_at = NOW()
    RETURNING id INTO v_collaborator_id;

    RETURN v_collaborator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get watchlist property count
CREATE OR REPLACE FUNCTION get_watchlist_property_count(p_watchlist_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM watchlist_properties
    WHERE watchlist_id = p_watchlist_id;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

CREATE TRIGGER update_watchlists_updated_at
    BEFORE UPDATE ON watchlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlist_properties_updated_at
    BEFORE UPDATE ON watchlist_properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlist_collaborators_updated_at
    BEFORE UPDATE ON watchlist_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE watchlists IS 'Saved property collections for users and organizations';
COMMENT ON TABLE watchlist_properties IS 'Many-to-many relationship between watchlists and properties';
COMMENT ON TABLE watchlist_collaborators IS 'Fine-grained access control for shared watchlists';

COMMENT ON COLUMN watchlists.visibility IS 'Visibility level: private (owner only), shared (organization), public (everyone)';
COMMENT ON COLUMN watchlists.is_shared IS 'Quick flag for organization-wide sharing';
COMMENT ON COLUMN watchlists.settings IS 'JSON configuration for notifications and auto-filters';

COMMENT ON COLUMN watchlist_properties.priority IS 'User-defined priority (higher = more important)';
COMMENT ON COLUMN watchlist_properties.tags IS 'User-defined tags for categorization';
COMMENT ON COLUMN watchlist_properties.custom_data IS 'Flexible JSON storage for custom user fields';

COMMENT ON COLUMN watchlist_collaborators.permission IS 'Permission level: view (read-only), edit (add/remove properties), admin (manage collaborators)';

-- ============================================================================
-- PROPERTY ASSIGNMENTS
-- ============================================================================

-- Table: Property Assignments (Direct property assignments to team members)
CREATE TABLE IF NOT EXISTS property_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

    -- Assignment details
    assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Assignment purpose and status
    assignment_type TEXT NOT NULL DEFAULT 'research' CHECK (assignment_type IN (
        'research', 'analysis', 'due_diligence', 'inspection', 'bidding', 'closing', 'general'
    )),
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN (
        'assigned', 'in_progress', 'completed', 'cancelled', 'blocked'
    )),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

    -- Scheduling
    due_date TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    -- Notes and context
    assignment_notes TEXT,
    completion_notes TEXT,
    blocked_reason TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: prevent duplicate active assignments
    UNIQUE(property_id, assigned_to, status) WHERE status IN ('assigned', 'in_progress')
);

-- ============================================================================
-- AUDIT LOG (Compliance and Activity Tracking)
-- ============================================================================

-- Table: Audit Log (Comprehensive activity tracking for compliance)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who and when
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- What happened
    action TEXT NOT NULL, -- e.g., 'property.viewed', 'deal.created', 'watchlist.shared', 'user.invited'
    entity_type TEXT NOT NULL, -- e.g., 'property', 'deal', 'watchlist', 'organization', 'user'
    entity_id UUID, -- ID of the affected entity

    -- Context
    description TEXT NOT NULL, -- Human-readable description
    severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),

    -- Change tracking
    old_values JSONB, -- Before state (for updates)
    new_values JSONB, -- After state (for updates/creates)

    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    request_id TEXT, -- For correlating related actions

    -- Additional context
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Tags for filtering
    tags TEXT[] -- e.g., ['security', 'compliance', 'financial']
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Property Assignments indexes
CREATE INDEX idx_property_assignments_org ON property_assignments(organization_id);
CREATE INDEX idx_property_assignments_property ON property_assignments(property_id);
CREATE INDEX idx_property_assignments_assigned_to ON property_assignments(assigned_to);
CREATE INDEX idx_property_assignments_assigned_by ON property_assignments(assigned_by);
CREATE INDEX idx_property_assignments_status ON property_assignments(status);
CREATE INDEX idx_property_assignments_type ON property_assignments(assignment_type);
CREATE INDEX idx_property_assignments_priority ON property_assignments(priority);
CREATE INDEX idx_property_assignments_due_date ON property_assignments(due_date) WHERE due_date IS NOT NULL;

-- Audit Log indexes
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_org ON audit_log(organization_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_entity_id ON audit_log(entity_id);
CREATE INDEX idx_audit_log_severity ON audit_log(severity);
CREATE INDEX idx_audit_log_tags ON audit_log USING GIN(tags);
CREATE INDEX idx_audit_log_request_id ON audit_log(request_id) WHERE request_id IS NOT NULL;

-- ============================================================================
-- VIEWS FOR EASY QUERYING
-- ============================================================================

-- View: Property assignments with full details
CREATE OR REPLACE VIEW vw_property_assignments_detailed AS
SELECT
    pa.id,
    pa.organization_id,
    o.name as organization_name,

    -- Property details
    pa.property_id,
    p.parcel_number,
    p.property_address,
    p.city,
    p.state,
    p.zip_code,
    p.total_due,
    c.county_name,
    c.state_code,

    -- Assignment details
    pa.assigned_to,
    pa.assigned_by,
    pa.assignment_type,
    pa.status,
    pa.priority,

    -- Scheduling
    pa.due_date,
    pa.started_at,
    pa.completed_at,
    pa.cancelled_at,

    -- Notes
    pa.assignment_notes,
    pa.completion_notes,
    pa.blocked_reason,

    -- Metadata
    pa.metadata,
    pa.created_at,
    pa.updated_at,

    -- Computed fields
    CASE
        WHEN pa.due_date IS NOT NULL AND pa.due_date < NOW() AND pa.status IN ('assigned', 'in_progress') THEN true
        ELSE false
    END as is_overdue,

    CASE
        WHEN pa.started_at IS NOT NULL AND pa.completed_at IS NOT NULL
        THEN EXTRACT(epoch FROM (pa.completed_at - pa.started_at))/3600
        ELSE NULL
    END as hours_to_complete

FROM property_assignments pa
JOIN organizations o ON pa.organization_id = o.id
JOIN properties p ON pa.property_id = p.id
LEFT JOIN counties c ON p.county_id = c.id
WHERE o.deleted_at IS NULL;

-- View: Active assignments by user
CREATE OR REPLACE VIEW vw_active_assignments_by_user AS
SELECT
    pa.assigned_to as user_id,
    pa.organization_id,

    -- Status counts
    COUNT(*) FILTER (WHERE pa.status = 'assigned') as assigned_count,
    COUNT(*) FILTER (WHERE pa.status = 'in_progress') as in_progress_count,
    COUNT(*) as total_active_count,

    -- Priority breakdown
    COUNT(*) FILTER (WHERE pa.priority = 'urgent') as urgent_count,
    COUNT(*) FILTER (WHERE pa.priority = 'high') as high_priority_count,

    -- Overdue count
    COUNT(*) FILTER (WHERE pa.due_date < NOW() AND pa.status IN ('assigned', 'in_progress')) as overdue_count,

    -- Due soon (next 48 hours)
    COUNT(*) FILTER (WHERE pa.due_date BETWEEN NOW() AND NOW() + INTERVAL '48 hours' AND pa.status IN ('assigned', 'in_progress')) as due_soon_count

FROM property_assignments pa
WHERE pa.status IN ('assigned', 'in_progress')
GROUP BY pa.assigned_to, pa.organization_id;

-- View: Assignment workload by type
CREATE OR REPLACE VIEW vw_assignment_workload_by_type AS
SELECT
    pa.organization_id,
    o.name as organization_name,
    pa.assignment_type,
    pa.status,

    COUNT(*) as assignment_count,
    COUNT(DISTINCT pa.assigned_to) as unique_assignees,
    COUNT(DISTINCT pa.property_id) as unique_properties,

    -- Time metrics
    AVG(EXTRACT(epoch FROM (pa.completed_at - pa.started_at))/3600) FILTER (WHERE pa.completed_at IS NOT NULL) as avg_hours_to_complete,
    MIN(pa.due_date) FILTER (WHERE pa.status IN ('assigned', 'in_progress')) as earliest_due_date,
    MAX(pa.due_date) FILTER (WHERE pa.status IN ('assigned', 'in_progress')) as latest_due_date

FROM property_assignments pa
JOIN organizations o ON pa.organization_id = o.id
WHERE o.deleted_at IS NULL
GROUP BY pa.organization_id, o.name, pa.assignment_type, pa.status;

-- View: Recent audit log with user details
CREATE OR REPLACE VIEW vw_audit_log_detailed AS
SELECT
    al.id,
    al.user_id,
    al.organization_id,
    al.created_at,

    -- Action details
    al.action,
    al.entity_type,
    al.entity_id,
    al.description,
    al.severity,

    -- Change tracking
    al.old_values,
    al.new_values,

    -- Request metadata
    al.ip_address,
    al.user_agent,
    al.request_id,
    al.metadata,
    al.tags,

    -- Organization name
    o.name as organization_name

FROM audit_log al
LEFT JOIN organizations o ON al.organization_id = o.id
ORDER BY al.created_at DESC;

-- View: Audit log summary by action type
CREATE OR REPLACE VIEW vw_audit_log_summary AS
SELECT
    al.organization_id,
    o.name as organization_name,
    al.action,
    al.entity_type,
    al.severity,

    COUNT(*) as event_count,
    COUNT(DISTINCT al.user_id) as unique_users,
    MIN(al.created_at) as first_occurrence,
    MAX(al.created_at) as last_occurrence,

    -- Time-based aggregations
    COUNT(*) FILTER (WHERE al.created_at > NOW() - INTERVAL '24 hours') as events_last_24h,
    COUNT(*) FILTER (WHERE al.created_at > NOW() - INTERVAL '7 days') as events_last_7d,
    COUNT(*) FILTER (WHERE al.created_at > NOW() - INTERVAL '30 days') as events_last_30d

FROM audit_log al
LEFT JOIN organizations o ON al.organization_id = o.id
GROUP BY al.organization_id, o.name, al.action, al.entity_type, al.severity
ORDER BY event_count DESC;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- ============================================================================
-- UPSERT FUNCTIONS (Duplicate Prevention)
-- ============================================================================

-- Function: Upsert Organization
CREATE OR REPLACE FUNCTION upsert_organization(
    p_name TEXT,
    p_slug TEXT,
    p_plan_type TEXT DEFAULT 'free',
    p_settings JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Try to update existing record by slug
    UPDATE organizations
    SET
        name = p_name,
        plan_type = COALESCE(p_plan_type, plan_type),
        settings = COALESCE(p_settings, settings),
        updated_at = NOW(),
        deleted_at = NULL -- Restore if soft-deleted
    WHERE slug = p_slug
      AND deleted_at IS NULL
    RETURNING id INTO v_org_id;

    -- If no record was updated, insert new one
    IF v_org_id IS NULL THEN
        INSERT INTO organizations (name, slug, plan_type, settings)
        VALUES (p_name, p_slug, p_plan_type, COALESCE(p_settings, '{
            "features": {
                "shared_watchlists": true,
                "deal_pipeline": true,
                "audit_log": true,
                "advanced_analytics": false
            },
            "limits": {
                "max_members": 5,
                "max_watchlists": 10,
                "max_properties_per_watchlist": 100
            }
        }'::jsonb))
        RETURNING id INTO v_org_id;
    END IF;

    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Upsert Organization Member
CREATE OR REPLACE FUNCTION upsert_organization_member(
    p_organization_id UUID,
    p_user_id UUID,
    p_role TEXT DEFAULT 'viewer',
    p_invited_by UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'pending'
) RETURNS UUID AS $$
DECLARE
    v_member_id UUID;
BEGIN
    -- Try to update existing record
    UPDATE organization_members
    SET
        role = COALESCE(p_role, role),
        status = COALESCE(p_status, status),
        invited_by = COALESCE(p_invited_by, invited_by),
        invitation_accepted_at = CASE
            WHEN p_status = 'active' AND invitation_accepted_at IS NULL THEN NOW()
            ELSE invitation_accepted_at
        END,
        joined_at = CASE
            WHEN p_status = 'active' AND joined_at IS NULL THEN NOW()
            ELSE joined_at
        END,
        updated_at = NOW()
    WHERE organization_id = p_organization_id
      AND user_id = p_user_id
    RETURNING id INTO v_member_id;

    -- If no record was updated, insert new one
    IF v_member_id IS NULL THEN
        INSERT INTO organization_members (
            organization_id, user_id, role, invited_by, status,
            invitation_accepted_at, joined_at
        )
        VALUES (
            p_organization_id, p_user_id, p_role, p_invited_by, p_status,
            CASE WHEN p_status = 'active' THEN NOW() ELSE NULL END,
            CASE WHEN p_status = 'active' THEN NOW() ELSE NULL END
        )
        RETURNING id INTO v_member_id;
    END IF;

    RETURN v_member_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Upsert Pipeline Stage
CREATE OR REPLACE FUNCTION upsert_pipeline_stage(
    p_organization_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_color TEXT DEFAULT NULL,
    p_sort_order INTEGER DEFAULT 0,
    p_is_terminal BOOLEAN DEFAULT false,
    p_is_active BOOLEAN DEFAULT true
) RETURNS UUID AS $$
DECLARE
    v_stage_id UUID;
BEGIN
    -- Try to update existing record
    UPDATE pipeline_stages
    SET
        description = COALESCE(p_description, description),
        color = COALESCE(p_color, color),
        sort_order = COALESCE(p_sort_order, sort_order),
        is_terminal = COALESCE(p_is_terminal, is_terminal),
        is_active = COALESCE(p_is_active, is_active),
        updated_at = NOW()
    WHERE organization_id = p_organization_id
      AND name = p_name
    RETURNING id INTO v_stage_id;

    -- If no record was updated, insert new one
    IF v_stage_id IS NULL THEN
        INSERT INTO pipeline_stages (
            organization_id, name, description, color,
            sort_order, is_terminal, is_active
        )
        VALUES (
            p_organization_id, p_name, p_description, p_color,
            p_sort_order, p_is_terminal, p_is_active
        )
        RETURNING id INTO v_stage_id;
    END IF;

    RETURN v_stage_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Upsert Deal
CREATE OR REPLACE FUNCTION upsert_deal(
    p_organization_id UUID,
    p_title TEXT,
    p_property_id UUID DEFAULT NULL,
    p_current_stage_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_target_bid_amount NUMERIC DEFAULT NULL,
    p_max_bid_amount NUMERIC DEFAULT NULL,
    p_priority TEXT DEFAULT 'medium',
    p_assigned_to UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_auction_date TIMESTAMPTZ DEFAULT NULL,
    p_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    p_custom_fields JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_deal_id UUID;
BEGIN
    -- Try to update existing record (match by organization + property_id if provided, or organization + title)
    UPDATE deals
    SET
        title = p_title,
        description = COALESCE(p_description, description),
        current_stage_id = COALESCE(p_current_stage_id, current_stage_id),
        target_bid_amount = COALESCE(p_target_bid_amount, target_bid_amount),
        max_bid_amount = COALESCE(p_max_bid_amount, max_bid_amount),
        priority = COALESCE(p_priority, priority),
        assigned_to = COALESCE(p_assigned_to, assigned_to),
        auction_date = COALESCE(p_auction_date, auction_date),
        tags = COALESCE(p_tags, tags),
        custom_fields = COALESCE(p_custom_fields, custom_fields),
        updated_at = NOW()
    WHERE organization_id = p_organization_id
      AND (
          (p_property_id IS NOT NULL AND property_id = p_property_id)
          OR (p_property_id IS NULL AND title = p_title)
      )
    RETURNING id INTO v_deal_id;

    -- If no record was updated, insert new one
    IF v_deal_id IS NULL THEN
        INSERT INTO deals (
            organization_id, property_id, title, description,
            current_stage_id, target_bid_amount, max_bid_amount,
            priority, assigned_to, created_by, auction_date,
            tags, custom_fields
        )
        VALUES (
            p_organization_id, p_property_id, p_title, p_description,
            p_current_stage_id, p_target_bid_amount, p_max_bid_amount,
            p_priority, p_assigned_to, p_created_by, p_auction_date,
            p_tags, p_custom_fields
        )
        RETURNING id INTO v_deal_id;
    END IF;

    RETURN v_deal_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Upsert Deal Assignment
CREATE OR REPLACE FUNCTION upsert_deal_assignment(
    p_deal_id UUID,
    p_user_id UUID,
    p_role TEXT DEFAULT NULL,
    p_assigned_by UUID DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT true
) RETURNS UUID AS $$
DECLARE
    v_assignment_id UUID;
BEGIN
    -- Try to update existing record
    UPDATE deal_assignments
    SET
        role = COALESCE(p_role, role),
        is_active = p_is_active,
        removed_at = CASE WHEN p_is_active = false THEN NOW() ELSE removed_at END
    WHERE deal_id = p_deal_id
      AND user_id = p_user_id
    RETURNING id INTO v_assignment_id;

    -- If no record was updated, insert new one
    IF v_assignment_id IS NULL THEN
        INSERT INTO deal_assignments (
            deal_id, user_id, role, assigned_by, is_active
        )
        VALUES (
            p_deal_id, p_user_id, p_role, p_assigned_by, p_is_active
        )
        RETURNING id INTO v_assignment_id;
    END IF;

    RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Create Deal Activity (always insert, never update)
CREATE OR REPLACE FUNCTION create_deal_activity(
    p_deal_id UUID,
    p_user_id UUID,
    p_activity_type TEXT,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_from_stage_id UUID DEFAULT NULL,
    p_to_stage_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    -- Always insert new activity (no updates)
    INSERT INTO deal_activities (
        deal_id, user_id, activity_type, title, description,
        from_stage_id, to_stage_id, metadata
    )
    VALUES (
        p_deal_id, p_user_id, p_activity_type, p_title, p_description,
        p_from_stage_id, p_to_stage_id, p_metadata
    )
    RETURNING id INTO v_activity_id;

    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- ============================================================================

-- Function: Log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_organization_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_description TEXT,
    p_severity TEXT DEFAULT 'info',
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_tags TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO audit_log (
        user_id,
        organization_id,
        action,
        entity_type,
        entity_id,
        description,
        severity,
        old_values,
        new_values,
        ip_address,
        user_agent,
        request_id,
        metadata,
        tags
    ) VALUES (
        p_user_id,
        p_organization_id,
        p_action,
        p_entity_type,
        p_entity_id,
        p_description,
        p_severity,
        p_old_values,
        p_new_values,
        p_ip_address,
        p_user_agent,
        p_request_id,
        p_metadata,
        p_tags
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Assign property to user
CREATE OR REPLACE FUNCTION assign_property_to_user(
    p_organization_id UUID,
    p_property_id UUID,
    p_assigned_to UUID,
    p_assigned_by UUID,
    p_assignment_type TEXT DEFAULT 'research',
    p_priority TEXT DEFAULT 'medium',
    p_due_date TIMESTAMPTZ DEFAULT NULL,
    p_assignment_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_assignment_id UUID;
    v_property_address TEXT;
BEGIN
    -- Verify user has org access
    IF NOT user_has_org_access(p_assigned_to, p_organization_id) THEN
        RAISE EXCEPTION 'Assigned user is not a member of this organization';
    END IF;

    IF NOT user_has_org_role(p_assigned_by, p_organization_id, 'analyst') THEN
        RAISE EXCEPTION 'Only analysts and admins can assign properties';
    END IF;

    -- Get property address for audit log
    SELECT property_address INTO v_property_address
    FROM properties
    WHERE id = p_property_id;

    -- Create assignment
    INSERT INTO property_assignments (
        organization_id,
        property_id,
        assigned_to,
        assigned_by,
        assignment_type,
        priority,
        due_date,
        assignment_notes,
        status
    ) VALUES (
        p_organization_id,
        p_property_id,
        p_assigned_to,
        p_assigned_by,
        p_assignment_type,
        p_priority,
        p_due_date,
        p_assignment_notes,
        'assigned'
    )
    RETURNING id INTO v_assignment_id;

    -- Log audit event
    PERFORM log_audit_event(
        p_assigned_by,
        p_organization_id,
        'property.assigned',
        'property_assignment',
        v_assignment_id,
        'Assigned property ' || COALESCE(v_property_address, 'N/A') || ' for ' || p_assignment_type,
        'info',
        NULL,
        jsonb_build_object(
            'assignment_id', v_assignment_id,
            'property_id', p_property_id,
            'assigned_to', p_assigned_to,
            'assignment_type', p_assignment_type,
            'priority', p_priority
        ),
        NULL,
        NULL,
        NULL,
        '{}'::jsonb,
        ARRAY['assignment', 'property']
    );

    RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update assignment status
CREATE OR REPLACE FUNCTION update_assignment_status(
    p_assignment_id UUID,
    p_user_id UUID,
    p_new_status TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_status TEXT;
    v_assigned_to UUID;
    v_org_id UUID;
BEGIN
    -- Get current assignment details
    SELECT status, assigned_to, organization_id
    INTO v_old_status, v_assigned_to, v_org_id
    FROM property_assignments
    WHERE id = p_assignment_id;

    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    -- Verify user can update (must be assigned user or org admin)
    IF v_assigned_to != p_user_id THEN
        IF NOT user_has_org_role(p_user_id, v_org_id, 'admin') THEN
            RAISE EXCEPTION 'Only the assigned user or admins can update assignment status';
        END IF;
    END IF;

    -- Update assignment
    UPDATE property_assignments
    SET
        status = p_new_status,
        started_at = CASE WHEN p_new_status = 'in_progress' AND started_at IS NULL THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
        cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
        completion_notes = CASE WHEN p_new_status IN ('completed', 'cancelled') THEN p_notes ELSE completion_notes END,
        blocked_reason = CASE WHEN p_new_status = 'blocked' THEN p_notes ELSE blocked_reason END,
        updated_at = NOW()
    WHERE id = p_assignment_id;

    -- Log audit event
    PERFORM log_audit_event(
        p_user_id,
        v_org_id,
        'assignment.status_changed',
        'property_assignment',
        p_assignment_id,
        'Assignment status changed from ' || v_old_status || ' to ' || p_new_status,
        'info',
        jsonb_build_object('status', v_old_status),
        jsonb_build_object('status', p_new_status, 'notes', p_notes),
        NULL,
        NULL,
        NULL,
        '{}'::jsonb,
        ARRAY['assignment', 'status_change']
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's assignments
CREATE OR REPLACE FUNCTION get_user_assignments(
    p_user_id UUID,
    p_organization_id UUID,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    assignment_id UUID,
    property_id UUID,
    property_address TEXT,
    county_name TEXT,
    assignment_type TEXT,
    status TEXT,
    priority TEXT,
    due_date TIMESTAMPTZ,
    is_overdue BOOLEAN,
    assignment_notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pa.id,
        pa.property_id,
        p.property_address,
        c.county_name,
        pa.assignment_type,
        pa.status,
        pa.priority,
        pa.due_date,
        (pa.due_date IS NOT NULL AND pa.due_date < NOW() AND pa.status IN ('assigned', 'in_progress'))::BOOLEAN,
        pa.assignment_notes
    FROM property_assignments pa
    JOIN properties p ON pa.property_id = p.id
    LEFT JOIN counties c ON p.county_id = c.id
    WHERE pa.assigned_to = p_user_id
      AND pa.organization_id = p_organization_id
      AND (p_status IS NULL OR pa.status = p_status)
    ORDER BY
        CASE pa.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END,
        pa.due_date ASC NULLS LAST,
        pa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get audit log for entity
CREATE OR REPLACE FUNCTION get_entity_audit_log(
    p_entity_type TEXT,
    p_entity_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    created_at TIMESTAMPTZ,
    action TEXT,
    description TEXT,
    severity TEXT,
    old_values JSONB,
    new_values JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.id,
        al.user_id,
        al.created_at,
        al.action,
        al.description,
        al.severity,
        al.old_values,
        al.new_values
    FROM audit_log al
    WHERE al.entity_type = p_entity_type
      AND al.entity_id = p_entity_id
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

CREATE TRIGGER update_property_assignments_updated_at
    BEFORE UPDATE ON property_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE property_assignments IS 'Direct property assignments to team members for research and analysis';
COMMENT ON TABLE audit_log IS 'Comprehensive activity tracking for compliance and security auditing';

COMMENT ON COLUMN property_assignments.assignment_type IS 'Purpose of assignment: research, analysis, due_diligence, inspection, bidding, closing, general';
COMMENT ON COLUMN property_assignments.status IS 'Assignment status: assigned, in_progress, completed, cancelled, blocked';
COMMENT ON COLUMN property_assignments.priority IS 'Assignment priority: low, medium, high, urgent';
COMMENT ON COLUMN property_assignments.metadata IS 'Additional assignment-specific data in JSON format';

COMMENT ON COLUMN audit_log.action IS 'Action identifier (e.g., property.viewed, deal.created, watchlist.shared)';
COMMENT ON COLUMN audit_log.entity_type IS 'Type of entity affected (e.g., property, deal, watchlist, organization)';
COMMENT ON COLUMN audit_log.severity IS 'Event severity: debug, info, warning, error, critical';
COMMENT ON COLUMN audit_log.old_values IS 'JSON snapshot of entity state before change';
COMMENT ON COLUMN audit_log.new_values IS 'JSON snapshot of entity state after change';
COMMENT ON COLUMN audit_log.tags IS 'Categorical tags for filtering (e.g., security, compliance, financial)';
