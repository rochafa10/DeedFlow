-- Team Collaboration - Row Level Security (RLS) Policies
-- Enforces multi-tenancy and organization isolation
-- Implements role-based access control (admin, analyst, viewer)

-- ============================================================================
-- ENABLE RLS ON ALL TEAM COLLABORATION TABLES
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS - Users can only see organizations they belong to
-- ============================================================================

-- Policy: Users can view organizations they are members of
CREATE POLICY "Users can view their organizations"
    ON organizations
    FOR SELECT
    USING (
        id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
              AND status = 'active'
        )
    );

-- Policy: Users can insert organizations (when creating new org)
CREATE POLICY "Users can create organizations"
    ON organizations
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only admins can update organizations
CREATE POLICY "Admins can update their organizations"
    ON organizations
    FOR UPDATE
    USING (
        user_has_org_role(auth.uid(), id, 'admin')
    );

-- Policy: Only admins can soft-delete organizations
CREATE POLICY "Admins can delete their organizations"
    ON organizations
    FOR UPDATE
    USING (
        user_has_org_role(auth.uid(), id, 'admin')
        AND deleted_at IS NULL
    )
    WITH CHECK (
        user_has_org_role(auth.uid(), id, 'admin')
    );

-- ============================================================================
-- ORGANIZATION MEMBERS - Access based on organization membership
-- ============================================================================

-- Policy: Users can view members of their organizations
CREATE POLICY "Users can view organization members"
    ON organization_members
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
              AND status = 'active'
        )
    );

-- Policy: Admins can invite members
CREATE POLICY "Admins can invite members"
    ON organization_members
    FOR INSERT
    WITH CHECK (
        user_has_org_role(auth.uid(), organization_id, 'admin')
    );

-- Policy: Admins can update member roles and status
CREATE POLICY "Admins can update members"
    ON organization_members
    FOR UPDATE
    USING (
        user_has_org_role(auth.uid(), organization_id, 'admin')
    );

-- Policy: Users can accept their own invitations
CREATE POLICY "Users can accept own invitations"
    ON organization_members
    FOR UPDATE
    USING (
        user_id = auth.uid()
        AND status = 'pending'
    )
    WITH CHECK (
        user_id = auth.uid()
    );

-- Policy: Admins can remove members
CREATE POLICY "Admins can remove members"
    ON organization_members
    FOR DELETE
    USING (
        user_has_org_role(auth.uid(), organization_id, 'admin')
    );

-- ============================================================================
-- PIPELINE STAGES - Organization-scoped access
-- ============================================================================

-- Policy: Users can view stages in their organizations
CREATE POLICY "Users can view pipeline stages"
    ON pipeline_stages
    FOR SELECT
    USING (
        user_has_org_access(auth.uid(), organization_id)
    );

-- Policy: Admins can create stages
CREATE POLICY "Admins can create pipeline stages"
    ON pipeline_stages
    FOR INSERT
    WITH CHECK (
        user_has_org_role(auth.uid(), organization_id, 'admin')
    );

-- Policy: Admins can update stages
CREATE POLICY "Admins can update pipeline stages"
    ON pipeline_stages
    FOR UPDATE
    USING (
        user_has_org_role(auth.uid(), organization_id, 'admin')
    );

-- Policy: Admins can delete stages
CREATE POLICY "Admins can delete pipeline stages"
    ON pipeline_stages
    FOR DELETE
    USING (
        user_has_org_role(auth.uid(), organization_id, 'admin')
    );

-- ============================================================================
-- DEALS - Organization-scoped with role-based write access
-- ============================================================================

-- Policy: Users can view deals in their organizations
CREATE POLICY "Users can view organization deals"
    ON deals
    FOR SELECT
    USING (
        user_has_org_access(auth.uid(), organization_id)
    );

-- Policy: Analysts and admins can create deals
CREATE POLICY "Analysts can create deals"
    ON deals
    FOR INSERT
    WITH CHECK (
        user_has_org_role(auth.uid(), organization_id, 'analyst')
    );

-- Policy: Analysts can update deals in their organizations
CREATE POLICY "Analysts can update deals"
    ON deals
    FOR UPDATE
    USING (
        user_has_org_role(auth.uid(), organization_id, 'analyst')
    );

-- Policy: Admins can delete deals
CREATE POLICY "Admins can delete deals"
    ON deals
    FOR DELETE
    USING (
        user_has_org_role(auth.uid(), organization_id, 'admin')
    );

-- ============================================================================
-- DEAL ASSIGNMENTS - Organization-scoped access
-- ============================================================================

-- Policy: Users can view assignments in their organizations
CREATE POLICY "Users can view deal assignments"
    ON deal_assignments
    FOR SELECT
    USING (
        deal_id IN (
            SELECT id FROM deals
            WHERE user_has_org_access(auth.uid(), organization_id)
        )
    );

-- Policy: Analysts can create assignments
CREATE POLICY "Analysts can create deal assignments"
    ON deal_assignments
    FOR INSERT
    WITH CHECK (
        deal_id IN (
            SELECT id FROM deals
            WHERE user_has_org_role(auth.uid(), organization_id, 'analyst')
        )
    );

-- Policy: Analysts can update assignments
CREATE POLICY "Analysts can update deal assignments"
    ON deal_assignments
    FOR UPDATE
    USING (
        deal_id IN (
            SELECT id FROM deals
            WHERE user_has_org_role(auth.uid(), organization_id, 'analyst')
        )
    );

-- Policy: Analysts can remove assignments
CREATE POLICY "Analysts can remove deal assignments"
    ON deal_assignments
    FOR DELETE
    USING (
        deal_id IN (
            SELECT id FROM deals
            WHERE user_has_org_role(auth.uid(), organization_id, 'analyst')
        )
    );

-- ============================================================================
-- DEAL ACTIVITIES - Organization-scoped with write access for team members
-- ============================================================================

-- Policy: Users can view activities for deals in their organizations
CREATE POLICY "Users can view deal activities"
    ON deal_activities
    FOR SELECT
    USING (
        deal_id IN (
            SELECT id FROM deals
            WHERE user_has_org_access(auth.uid(), organization_id)
        )
    );

-- Policy: Users can add activities to deals in their organizations
CREATE POLICY "Users can add deal activities"
    ON deal_activities
    FOR INSERT
    WITH CHECK (
        deal_id IN (
            SELECT id FROM deals
            WHERE user_has_org_access(auth.uid(), organization_id)
        )
        AND user_id = auth.uid()
    );

-- Policy: Users can update their own activities
CREATE POLICY "Users can update own deal activities"
    ON deal_activities
    FOR UPDATE
    USING (
        user_id = auth.uid()
    );

-- Policy: Admins can delete activities
CREATE POLICY "Admins can delete deal activities"
    ON deal_activities
    FOR DELETE
    USING (
        deal_id IN (
            SELECT id FROM deals
            WHERE user_has_org_role(auth.uid(), organization_id, 'admin')
        )
    );

-- ============================================================================
-- WATCHLISTS - Complex access based on ownership and sharing settings
-- ============================================================================

-- Policy: Users can view watchlists they have access to
CREATE POLICY "Users can view accessible watchlists"
    ON watchlists
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            -- User is the creator
            created_by = auth.uid()

            -- Watchlist is shared with user's organization
            OR (
                is_shared = true
                AND organization_id IN (
                    SELECT organization_id
                    FROM organization_members
                    WHERE user_id = auth.uid()
                      AND status = 'active'
                )
            )

            -- User is an explicit collaborator
            OR id IN (
                SELECT watchlist_id
                FROM watchlist_collaborators
                WHERE user_id = auth.uid()
            )

            -- Public watchlist
            OR visibility = 'public'
        )
    );

-- Policy: Users can create watchlists in their organizations
CREATE POLICY "Users can create watchlists"
    ON watchlists
    FOR INSERT
    WITH CHECK (
        created_by = auth.uid()
        AND (
            organization_id IS NULL
            OR user_has_org_access(auth.uid(), organization_id)
        )
    );

-- Policy: Users can update their own watchlists or those they have admin access to
CREATE POLICY "Users can update their watchlists"
    ON watchlists
    FOR UPDATE
    USING (
        deleted_at IS NULL
        AND (
            created_by = auth.uid()
            OR id IN (
                SELECT watchlist_id
                FROM watchlist_collaborators
                WHERE user_id = auth.uid()
                  AND permission = 'admin'
            )
        )
    );

-- Policy: Users can soft-delete their own watchlists
CREATE POLICY "Users can delete their watchlists"
    ON watchlists
    FOR UPDATE
    USING (
        created_by = auth.uid()
        AND deleted_at IS NULL
    )
    WITH CHECK (
        created_by = auth.uid()
    );

-- ============================================================================
-- WATCHLIST PROPERTIES - Access based on watchlist access
-- ============================================================================

-- Policy: Users can view properties in accessible watchlists
CREATE POLICY "Users can view watchlist properties"
    ON watchlist_properties
    FOR SELECT
    USING (
        watchlist_id IN (
            SELECT id FROM watchlists
            WHERE deleted_at IS NULL
              AND (
                created_by = auth.uid()
                OR (is_shared AND organization_id IN (
                    SELECT organization_id
                    FROM organization_members
                    WHERE user_id = auth.uid() AND status = 'active'
                ))
                OR id IN (
                    SELECT watchlist_id
                    FROM watchlist_collaborators
                    WHERE user_id = auth.uid()
                )
                OR visibility = 'public'
              )
        )
    );

-- Policy: Users can add properties to watchlists they have edit access to
CREATE POLICY "Users can add watchlist properties"
    ON watchlist_properties
    FOR INSERT
    WITH CHECK (
        watchlist_id IN (
            SELECT id FROM watchlists
            WHERE deleted_at IS NULL
              AND (
                created_by = auth.uid()
                OR id IN (
                    SELECT watchlist_id
                    FROM watchlist_collaborators
                    WHERE user_id = auth.uid()
                      AND permission IN ('edit', 'admin')
                )
              )
        )
        AND added_by = auth.uid()
    );

-- Policy: Users can update properties in watchlists they have edit access to
CREATE POLICY "Users can update watchlist properties"
    ON watchlist_properties
    FOR UPDATE
    USING (
        watchlist_id IN (
            SELECT id FROM watchlists
            WHERE deleted_at IS NULL
              AND (
                created_by = auth.uid()
                OR id IN (
                    SELECT watchlist_id
                    FROM watchlist_collaborators
                    WHERE user_id = auth.uid()
                      AND permission IN ('edit', 'admin')
                )
              )
        )
    );

-- Policy: Users can remove properties from watchlists they have edit access to
CREATE POLICY "Users can remove watchlist properties"
    ON watchlist_properties
    FOR DELETE
    USING (
        watchlist_id IN (
            SELECT id FROM watchlists
            WHERE deleted_at IS NULL
              AND (
                created_by = auth.uid()
                OR id IN (
                    SELECT watchlist_id
                    FROM watchlist_collaborators
                    WHERE user_id = auth.uid()
                      AND permission IN ('edit', 'admin')
                )
              )
        )
    );

-- ============================================================================
-- WATCHLIST COLLABORATORS - Owner and admin access
-- ============================================================================

-- Policy: Users can view collaborators of watchlists they have access to
CREATE POLICY "Users can view watchlist collaborators"
    ON watchlist_collaborators
    FOR SELECT
    USING (
        watchlist_id IN (
            SELECT id FROM watchlists
            WHERE deleted_at IS NULL
              AND (
                created_by = auth.uid()
                OR id IN (
                    SELECT watchlist_id
                    FROM watchlist_collaborators
                    WHERE user_id = auth.uid()
                )
              )
        )
    );

-- Policy: Watchlist owners and admins can add collaborators
CREATE POLICY "Owners can add collaborators"
    ON watchlist_collaborators
    FOR INSERT
    WITH CHECK (
        watchlist_id IN (
            SELECT id FROM watchlists
            WHERE deleted_at IS NULL
              AND (
                created_by = auth.uid()
                OR id IN (
                    SELECT watchlist_id
                    FROM watchlist_collaborators
                    WHERE user_id = auth.uid()
                      AND permission = 'admin'
                )
              )
        )
    );

-- Policy: Owners and admins can update collaborator permissions
CREATE POLICY "Owners can update collaborators"
    ON watchlist_collaborators
    FOR UPDATE
    USING (
        watchlist_id IN (
            SELECT id FROM watchlists
            WHERE deleted_at IS NULL
              AND (
                created_by = auth.uid()
                OR id IN (
                    SELECT watchlist_id
                    FROM watchlist_collaborators
                    WHERE user_id = auth.uid()
                      AND permission = 'admin'
                )
              )
        )
    );

-- Policy: Owners and admins can remove collaborators
CREATE POLICY "Owners can remove collaborators"
    ON watchlist_collaborators
    FOR DELETE
    USING (
        watchlist_id IN (
            SELECT id FROM watchlists
            WHERE deleted_at IS NULL
              AND (
                created_by = auth.uid()
                OR id IN (
                    SELECT watchlist_id
                    FROM watchlist_collaborators
                    WHERE user_id = auth.uid()
                      AND permission = 'admin'
                )
              )
        )
    );

-- ============================================================================
-- PROPERTY ASSIGNMENTS - Organization-scoped with role-based access
-- ============================================================================

-- Policy: Users can view assignments in their organizations
CREATE POLICY "Users can view property assignments"
    ON property_assignments
    FOR SELECT
    USING (
        user_has_org_access(auth.uid(), organization_id)
    );

-- Policy: Analysts can create assignments
CREATE POLICY "Analysts can create property assignments"
    ON property_assignments
    FOR INSERT
    WITH CHECK (
        user_has_org_role(auth.uid(), organization_id, 'analyst')
    );

-- Policy: Assigned users and admins can update assignments
CREATE POLICY "Assigned users can update property assignments"
    ON property_assignments
    FOR UPDATE
    USING (
        assigned_to = auth.uid()
        OR user_has_org_role(auth.uid(), organization_id, 'admin')
    );

-- Policy: Admins can delete assignments
CREATE POLICY "Admins can delete property assignments"
    ON property_assignments
    FOR DELETE
    USING (
        user_has_org_role(auth.uid(), organization_id, 'admin')
    );

-- ============================================================================
-- AUDIT LOG - Restricted read access, system write access
-- ============================================================================

-- Policy: Users can view audit logs for their organizations
CREATE POLICY "Users can view organization audit logs"
    ON audit_log
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
              AND status = 'active'
        )
    );

-- Policy: System can insert audit logs (using service role)
-- Note: INSERT policies are typically handled by service role or SECURITY DEFINER functions
-- This ensures audit logs cannot be tampered with by regular users

-- Policy: Admins can view all audit logs in their organizations
CREATE POLICY "Admins can view all audit logs"
    ON audit_log
    FOR SELECT
    USING (
        user_has_org_role(auth.uid(), organization_id, 'admin')
    );

-- Note: No UPDATE or DELETE policies - audit logs should be immutable
-- If needed, use soft deletes or archiving through SECURITY DEFINER functions

-- ============================================================================
-- HELPER POLICY FUNCTIONS (if not already defined)
-- ============================================================================

-- These functions are already defined in the main schema file:
-- - user_has_org_access(user_id, org_id) -> boolean
-- - user_has_org_role(user_id, org_id, required_role) -> boolean
--
-- If they don't exist, they need to be created for these policies to work.

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Users can view their organizations" ON organizations IS
    'Users can only see organizations where they are active members';

COMMENT ON POLICY "Admins can update their organizations" ON organizations IS
    'Only organization admins can modify organization settings';

COMMENT ON POLICY "Users can view accessible watchlists" ON watchlists IS
    'Complex access control: owners, org members (if shared), collaborators, or public';

COMMENT ON POLICY "Users can view organization audit logs" ON audit_log IS
    'Users can only view audit logs for organizations they belong to';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Use these queries to verify RLS policies are working correctly:

-- Query 1: Check if RLS is enabled on all tables
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'organizations', 'organization_members', 'pipeline_stages', 'deals',
--     'deal_assignments', 'deal_activities', 'watchlists', 'watchlist_properties',
--     'watchlist_collaborators', 'property_assignments', 'audit_log'
--   );

-- Query 2: List all policies for team collaboration tables
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN (
--     'organizations', 'organization_members', 'pipeline_stages', 'deals',
--     'deal_assignments', 'deal_activities', 'watchlists', 'watchlist_properties',
--     'watchlist_collaborators', 'property_assignments', 'audit_log'
-- )
-- ORDER BY tablename, policyname;

-- Query 3: Test organization isolation (as a specific user)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = 'user-uuid-here';
-- SELECT * FROM organizations; -- Should only see user's organizations
-- SELECT * FROM deals; -- Should only see deals from user's organizations

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- 1. Organization Isolation: All policies enforce organization-level isolation
--    Users can only access data within organizations they are members of.
--
-- 2. Role Hierarchy: admin > analyst > viewer
--    - Admins: Full access to organization settings and data
--    - Analysts: Can create/modify deals, assignments, and watchlists
--    - Viewers: Read-only access to organization data
--
-- 3. Watchlist Sharing: Multiple access levels supported
--    - Private: Only creator can access
--    - Shared: All org members can view
--    - Public: Anyone can view
--    - Collaborators: Explicit user permissions (view/edit/admin)
--
-- 4. Audit Log Immutability: No update or delete policies
--    Audit logs should only be inserted (via SECURITY DEFINER functions)
--    and never modified or deleted by users.
--
-- 5. Assignment Access: Assigned users can update their own assignments
--    Admins and analysts can manage all assignments in their organizations.
--
-- 6. Deal Activities: All org members can add activities/notes
--    Only admins can delete activities for compliance.
--
-- 7. Service Role Bypass: Service role can bypass RLS for system operations
--    Use service role for batch operations, migrations, and system tasks.

-- ============================================================================
-- TESTING CHECKLIST
-- ============================================================================

-- [ ] User A in Org 1 cannot see Org 2 data
-- [ ] Viewer cannot create/modify deals
-- [ ] Analyst can create deals and assignments
-- [ ] Admin can manage organization settings
-- [ ] Shared watchlists visible to all org members
-- [ ] Private watchlists only visible to owner
-- [ ] Collaborators have appropriate watchlist access
-- [ ] Assigned users can update their assignment status
-- [ ] Users cannot modify audit logs
-- [ ] Users can only see audit logs for their organizations
