/**
 * Report Sharing Types
 *
 * TypeScript interfaces for the report sharing feature.
 * These types support token-based shareable links with configurable
 * expiration (default 30 days) and view tracking.
 *
 * @author Claude Code Agent
 * @date 2026-01-17
 */

// ============================================
// Database Record Types
// ============================================

/**
 * Report share record from the report_shares table.
 * Represents a shareable link to a property report.
 */
export interface ReportShare {
  /** Primary key (UUID) */
  id: string;

  /** Reference to the shared report (property_reports.id) */
  report_id: string;

  /** Unique share token for URL generation (UUID) */
  share_token: string;

  /** User who created the share (auth.users.id), null for anonymous */
  created_by: string | null;

  /** When the share link expires (ISO 8601 timestamp) */
  expires_at: string;

  /** Number of times the share link has been accessed */
  view_count: number;

  /** Whether the share link is currently active (null for legacy records created before migration) */
  is_active: boolean | null;

  /** When the share was created (ISO 8601 timestamp) */
  created_at: string;

  /** When the share was last updated (ISO 8601 timestamp) */
  updated_at: string;

  // Extended fields from full schema (optional for backward compatibility)
  /** Maximum allowed views, null for unlimited */
  max_views?: number | null;

  /** When the share was last viewed (ISO 8601 timestamp) */
  last_viewed_at?: string | null;

  /** Hashed password if the share is password protected */
  password_hash?: string | null;

  /** Whether email is required to view the shared report */
  require_email?: boolean;

  /** Soft delete timestamp, null if not deleted */
  deleted_at?: string | null;
}

// ============================================
// API Request Types
// ============================================

/**
 * Request body for creating a new share link.
 */
export interface CreateShareRequest {
  /** ID of the report to share */
  report_id: string;

  /** User creating the share (optional, for attribution) */
  created_by?: string;

  /** Number of days until expiration (default: 30) */
  expires_days?: number;

  /** Maximum number of views allowed (optional, null = unlimited) */
  max_views?: number;

  /** Password to protect the share (optional) */
  password?: string;

  /** Whether to require email before viewing (optional) */
  require_email?: boolean;
}

/**
 * Response from share creation endpoint.
 */
export interface ShareLinkResponse {
  /** Complete shareable URL */
  share_url: string;

  /** Share token (UUID) for URL construction */
  share_token: string;

  /** When the share expires (ISO 8601 timestamp) */
  expires_at: string;

  /** ID of the created share record */
  share_id?: string;
}

// ============================================
// Validation Types
// ============================================

/**
 * Result from validating a share token.
 */
export interface ShareValidationResult {
  /** Whether the share token is valid and accessible */
  is_valid: boolean;

  /** Report ID if valid, null otherwise */
  report_id: string | null;

  /** Error message if invalid, null if valid */
  error_message: string | null;
}

/**
 * Possible share status values.
 */
export type ShareStatus = 'active' | 'expired' | 'deactivated' | 'view_limit_reached' | 'deleted';

/**
 * Extended share information with computed status.
 */
export interface ShareInfo extends ReportShare {
  /** Computed status of the share */
  status: ShareStatus;

  /** Days remaining until expiration (negative if expired) */
  days_remaining: number;

  /** Remaining views if max_views is set, null otherwise */
  views_remaining: number | null;
}

// ============================================
// Share Management Types
// ============================================

/**
 * Request to update a share's settings.
 */
export interface UpdateShareRequest {
  /** Share ID to update */
  share_id: string;

  /** New active status (optional) */
  is_active?: boolean;

  /** New expiration date in days from now (optional) */
  extends_days?: number;

  /** New max views limit (optional, null to remove limit) */
  max_views?: number | null;
}

/**
 * Request to deactivate a share.
 */
export interface DeactivateShareRequest {
  /** Share ID to deactivate */
  share_id: string;
}

/**
 * Statistics about a share link.
 */
export interface ShareStats {
  /** Share ID */
  share_id: string;

  /** Total number of views */
  total_views: number;

  /** When the share was created */
  created_at: string;

  /** When the share expires */
  expires_at: string;

  /** When the share was last viewed, null if never viewed */
  last_viewed_at: string | null;

  /** Whether the share is currently active */
  is_active: boolean;

  /** Current status */
  status: ShareStatus;
}

// ============================================
// List and Filter Types
// ============================================

/**
 * Options for listing shares.
 */
export interface ListSharesOptions {
  /** Filter by report ID */
  report_id?: string;

  /** Filter by creator */
  created_by?: string;

  /** Filter by active status */
  is_active?: boolean;

  /** Include expired shares */
  include_expired?: boolean;

  /** Pagination limit */
  limit?: number;

  /** Pagination offset */
  offset?: number;

  /** Sort field */
  sort_by?: 'created_at' | 'expires_at' | 'view_count';

  /** Sort direction */
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated list of shares.
 */
export interface ShareListResponse {
  /** Array of share records */
  shares: ReportShare[];

  /** Total count of matching shares */
  total: number;

  /** Whether there are more results */
  has_more: boolean;
}

// ============================================
// Utility Types
// ============================================

/**
 * Input type for creating a share (database insert).
 */
export type CreateShareInput = Omit<
  ReportShare,
  'id' | 'share_token' | 'view_count' | 'created_at' | 'updated_at' | 'last_viewed_at'
>;

/**
 * Input type for updating a share (partial update).
 */
export type UpdateShareInput = Partial<
  Pick<ReportShare, 'is_active' | 'expires_at' | 'max_views'>
>;

/**
 * Function signature for share URL generator.
 */
export type ShareUrlGenerator = (share_token: string) => string;

/**
 * Default share URL generator using app base URL.
 * @param baseUrl - Base URL of the application
 * @returns Function that generates share URLs
 */
export const createShareUrlGenerator = (baseUrl: string): ShareUrlGenerator => {
  return (share_token: string) => `${baseUrl}/share/${share_token}`;
};
