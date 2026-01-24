/**
 * Audit Log Types
 *
 * TypeScript interfaces for the audit logging feature.
 * These types support comprehensive activity tracking for compliance,
 * security monitoring, and user action auditing.
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

// Re-export base types from team.ts for convenience
export type {
  AuditLog,
} from './team'

export type {
  AuditLogSeverity,
} from './team'

// ============================================
// API Request Types
// ============================================

/**
 * Request body for creating an audit log entry.
 * Typically called internally by the API, not directly by users.
 */
export interface CreateAuditLogRequest {
  /** User who performed the action (null for system actions) */
  user_id?: string

  /** Organization context (null for system-wide actions) */
  organization_id?: string

  /** Action identifier (e.g., 'property.viewed', 'deal.created') */
  action: string

  /** Entity type (e.g., 'property', 'deal', 'watchlist', 'user') */
  entity_type: string

  /** Entity ID (if applicable) */
  entity_id?: string

  /** Human-readable description of the action */
  description: string

  /** Severity level */
  severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical'

  /** State before the action (for updates/deletes) */
  old_values?: Record<string, unknown>

  /** State after the action (for creates/updates) */
  new_values?: Record<string, unknown>

  /** Request IP address */
  ip_address?: string

  /** User agent string */
  user_agent?: string

  /** Request correlation ID */
  request_id?: string

  /** Additional context */
  metadata?: Record<string, unknown>

  /** Tags for categorization */
  tags?: string[]
}

// ============================================
// Query and Filter Types
// ============================================

/**
 * Filters for querying audit logs.
 */
export interface AuditLogFilters {
  /** Filter by organization */
  organization_id?: string

  /** Filter by user */
  user_id?: string

  /** Filter by action pattern (supports wildcards) */
  action?: string

  /** Filter by entity type */
  entity_type?: string

  /** Filter by entity ID */
  entity_id?: string

  /** Filter by severity */
  severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical'

  /** Filter by severity (minimum level) */
  severity_min?: 'debug' | 'info' | 'warning' | 'error' | 'critical'

  /** Filter by tags */
  tags?: string[]

  /** Filter by date range */
  date_from?: string
  date_to?: string

  /** Search in description */
  search?: string

  /** Filter by IP address */
  ip_address?: string

  /** Filter by request ID (for correlating related actions) */
  request_id?: string

  /** Sort field */
  sort_by?: 'created_at' | 'severity' | 'action' | 'entity_type'

  /** Sort direction */
  sort_direction?: 'asc' | 'desc'

  /** Pagination */
  page?: number
  limit?: number
}

/**
 * Paginated response for audit logs list.
 */
export interface AuditLogsListResponse {
  /** Audit logs matching filters */
  logs: AuditLogWithDetails[]

  /** Total count of logs matching filters */
  total: number

  /** Current page number */
  page: number

  /** Number of results per page */
  limit: number

  /** Total number of pages */
  total_pages: number

  /** Whether there are more pages */
  has_more: boolean
}

/**
 * Audit log entry with additional details.
 */
export interface AuditLogWithDetails {
  /** Base audit log fields */
  id: string
  user_id?: string
  organization_id?: string
  action: string
  entity_type: string
  entity_id?: string
  description: string
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical'
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  request_id?: string
  metadata?: Record<string, unknown>
  tags?: string[]
  created_at: string

  // Additional details (from joins or computed)
  organization_name?: string
}

// ============================================
// Statistics and Analytics Types
// ============================================

/**
 * Audit log statistics for an organization.
 */
export interface AuditLogStats {
  /** Organization ID */
  organization_id: string

  /** Total audit log entries */
  total_entries: number

  /** Entries by severity */
  by_severity: {
    debug: number
    info: number
    warning: number
    error: number
    critical: number
  }

  /** Entries by entity type */
  by_entity_type: Record<string, number>

  /** Most active users (top 10) */
  top_users: Array<{
    user_id: string
    action_count: number
  }>

  /** Most common actions (top 10) */
  top_actions: Array<{
    action: string
    count: number
  }>

  /** Time range covered */
  date_from: string
  date_to: string
}

/**
 * User activity summary from audit logs.
 */
export interface UserActivitySummary {
  /** User ID */
  user_id: string

  /** Organization ID */
  organization_id?: string

  /** Total actions performed */
  total_actions: number

  /** Actions by type */
  actions_by_type: Record<string, number>

  /** First recorded action */
  first_action_at: string

  /** Last recorded action */
  last_action_at: string

  /** Recent actions (last 10) */
  recent_actions: Array<{
    action: string
    entity_type: string
    entity_id?: string
    description: string
    created_at: string
  }>
}

/**
 * Entity audit trail (full history for a specific entity).
 */
export interface EntityAuditTrail {
  /** Entity type */
  entity_type: string

  /** Entity ID */
  entity_id: string

  /** Total audit entries for this entity */
  total_entries: number

  /** Full audit history in chronological order */
  history: AuditLogWithDetails[]

  /** First recorded action */
  first_action_at: string

  /** Last recorded action */
  last_action_at: string

  /** Users who have interacted with this entity */
  interacted_users: string[]
}

// ============================================
// Compliance and Security Types
// ============================================

/**
 * Security alert based on audit log patterns.
 */
export interface SecurityAlert {
  /** Alert ID */
  id: string

  /** Alert type */
  type: 'suspicious_activity' | 'failed_auth' | 'permission_violation' | 'data_breach_attempt' | 'anomaly'

  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical'

  /** Alert title */
  title: string

  /** Alert description */
  description: string

  /** Affected user (if applicable) */
  user_id?: string

  /** Affected organization (if applicable) */
  organization_id?: string

  /** Related audit log entries */
  related_log_ids: string[]

  /** Alert metadata */
  metadata?: Record<string, unknown>

  /** When the alert was detected */
  detected_at: string

  /** Whether the alert has been reviewed */
  is_reviewed: boolean

  /** Review notes */
  review_notes?: string

  /** Reviewed by (user ID) */
  reviewed_by?: string

  /** When the alert was reviewed */
  reviewed_at?: string
}

/**
 * Compliance report configuration.
 */
export interface ComplianceReportConfig {
  /** Report type */
  report_type: 'user_activity' | 'data_access' | 'modifications' | 'security_events' | 'full_audit'

  /** Organization to report on */
  organization_id: string

  /** Date range */
  date_from: string
  date_to: string

  /** Filters to apply */
  filters?: {
    user_ids?: string[]
    entity_types?: string[]
    actions?: string[]
    severity_min?: 'debug' | 'info' | 'warning' | 'error' | 'critical'
  }

  /** Include detailed change history */
  include_change_details?: boolean

  /** Include IP addresses */
  include_ip_addresses?: boolean

  /** Include user agent strings */
  include_user_agents?: boolean

  /** Group by field */
  group_by?: 'user' | 'entity_type' | 'action' | 'date'
}

/**
 * Compliance report result.
 */
export interface ComplianceReport {
  /** Report configuration */
  config: ComplianceReportConfig

  /** Report generation timestamp */
  generated_at: string

  /** Generated by (user ID) */
  generated_by: string

  /** Summary statistics */
  summary: {
    total_entries: number
    unique_users: number
    unique_entities: number
    date_range: {
      from: string
      to: string
    }
  }

  /** Report data (structure varies by report type) */
  data: Record<string, unknown>

  /** Report download URL (if generated as file) */
  download_url?: string
}

// ============================================
// Action-Specific Types
// ============================================

/**
 * Standard action prefixes for categorization.
 */
export type AuditActionPrefix =
  | 'auth'          // Authentication actions (login, logout, etc.)
  | 'user'          // User management (invite, remove, role change)
  | 'organization'  // Organization management (create, update, delete)
  | 'property'      // Property actions (view, edit, delete)
  | 'deal'          // Deal actions (create, move, assign)
  | 'watchlist'     // Watchlist actions (create, share, add property)
  | 'assignment'    // Assignment actions (create, complete, cancel)
  | 'report'        // Report actions (generate, share, view)
  | 'settings'      // Settings changes (update preferences, etc.)
  | 'system'        // System actions (automated processes)

/**
 * Common audit actions (examples).
 */
export type CommonAuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed_login'
  | 'user.invited'
  | 'user.removed'
  | 'user.role_changed'
  | 'organization.created'
  | 'organization.updated'
  | 'organization.deleted'
  | 'property.viewed'
  | 'property.created'
  | 'property.updated'
  | 'property.deleted'
  | 'deal.created'
  | 'deal.updated'
  | 'deal.moved'
  | 'deal.assigned'
  | 'deal.won'
  | 'deal.lost'
  | 'watchlist.created'
  | 'watchlist.shared'
  | 'watchlist.property_added'
  | 'watchlist.property_removed'
  | 'assignment.created'
  | 'assignment.completed'
  | 'assignment.cancelled'
  | 'report.generated'
  | 'report.shared'
  | 'report.viewed'
  | 'settings.updated'

// ============================================
// Helper Functions Types
// ============================================

/**
 * Helper function type for logging audit events.
 */
export type LogAuditEvent = (params: CreateAuditLogRequest) => Promise<void>

/**
 * Change detection helper result.
 */
export interface ChangeDetection {
  /** Whether changes were detected */
  has_changes: boolean

  /** Fields that changed */
  changed_fields: string[]

  /** Old values for changed fields */
  old_values: Record<string, unknown>

  /** New values for changed fields */
  new_values: Record<string, unknown>
}
