-- CSRF Token Storage Schema
-- This schema stores server-side CSRF tokens for secure validation
-- Tokens are hashed (SHA-256) before storage and are single-use with expiration

-- ============================================================================
-- CSRF TOKENS TABLE
-- ============================================================================

-- Table: CSRF Tokens (Server-side token storage for validation)
CREATE TABLE IF NOT EXISTS csrf_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL, -- SHA-256 hash of the actual token
    user_session_id TEXT, -- Optional: track which session this token belongs to
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL, -- Tokens expire after 15-60 minutes

    -- Unique constraint: each token hash should be unique
    UNIQUE(token_hash)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on token_hash for fast validation lookups
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_hash ON csrf_tokens(token_hash);

-- Index on expires_at for efficient cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires ON csrf_tokens(expires_at);

-- Index on created_at for monitoring and analytics
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_created ON csrf_tokens(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on csrf_tokens table
ALTER TABLE csrf_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to manage all tokens (for server-side validation)
CREATE POLICY IF NOT EXISTS "Service role can manage CSRF tokens"
ON csrf_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can only read their own session tokens (if needed for debugging)
CREATE POLICY IF NOT EXISTS "Users can view own session tokens"
ON csrf_tokens
FOR SELECT
TO authenticated
USING (user_session_id = current_setting('request.jwt.claims', true)::json->>'session_id');

-- Policy: Anonymous users have no access (CSRF tokens are server-side only)
CREATE POLICY IF NOT EXISTS "Anonymous users have no access to CSRF tokens"
ON csrf_tokens
FOR ALL
TO anon
USING (false);

-- ============================================================================
-- CLEANUP FUNCTION FOR EXPIRED TOKENS
-- ============================================================================

-- Function: Delete expired CSRF tokens
-- This function removes all tokens where expires_at < NOW()
-- Should be called periodically (e.g., on each validation or via scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_csrf_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM csrf_tokens
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get token statistics (for monitoring)
CREATE OR REPLACE FUNCTION get_csrf_token_stats()
RETURNS TABLE (
    total_tokens BIGINT,
    active_tokens BIGINT,
    expired_tokens BIGINT,
    oldest_token TIMESTAMPTZ,
    newest_token TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_tokens,
        COUNT(*) FILTER (WHERE expires_at > NOW())::BIGINT as active_tokens,
        COUNT(*) FILTER (WHERE expires_at <= NOW())::BIGINT as expired_tokens,
        MIN(created_at) as oldest_token,
        MAX(created_at) as newest_token
    FROM csrf_tokens;
END;
$$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE csrf_tokens IS 'Stores server-side CSRF tokens as SHA-256 hashes for secure validation. Tokens are single-use and expire after a configured time period (typically 15-60 minutes).';
COMMENT ON COLUMN csrf_tokens.token_hash IS 'SHA-256 hash of the actual CSRF token. Never store tokens in plaintext.';
COMMENT ON COLUMN csrf_tokens.user_session_id IS 'Optional session identifier to track which user session this token belongs to.';
COMMENT ON COLUMN csrf_tokens.expires_at IS 'Timestamp when this token expires. Expired tokens are rejected and periodically cleaned up.';
COMMENT ON FUNCTION cleanup_expired_csrf_tokens() IS 'Deletes all expired CSRF tokens. Returns the number of tokens deleted. Should be called periodically to prevent table bloat.';
COMMENT ON FUNCTION get_csrf_token_stats() IS 'Returns statistics about CSRF tokens including total count, active count, and expired count. Useful for monitoring and debugging.';
