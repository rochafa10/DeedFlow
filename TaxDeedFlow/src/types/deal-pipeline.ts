/**
 * Deal Pipeline Types
 *
 * TypeScript interfaces for the deal pipeline management feature.
 * These types support deal tracking through customizable pipeline stages,
 * team assignments, financial tracking, and activity logging.
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

// Re-export base types from team.ts for convenience
export type {
  PipelineStage,
  Deal,
  DealAssignment,
  DealActivity,
  DealComplete,
  PipelineOverview,
} from './team'

export type {
  DealPriority,
  DealStatus,
  DealActivityType,
} from './team'

// ============================================
// API Request Types
// ============================================

/**
 * Request body for creating a new pipeline stage.
 */
export interface CreatePipelineStageRequest {
  /** Organization ID */
  organization_id: string

  /** Stage name (e.g., "Lead", "Analysis", "Bidding") */
  name: string

  /** Stage description */
  description?: string

  /** Stage color (hex code) */
  color?: string

  /** Sort order (lower numbers appear first) */
  sort_order?: number

  /** Whether this is a terminal/final stage */
  is_terminal?: boolean
}

/**
 * Request body for updating a pipeline stage.
 */
export interface UpdatePipelineStageRequest {
  /** Stage ID to update */
  stage_id: string

  /** New stage name */
  name?: string

  /** New description */
  description?: string

  /** New color */
  color?: string

  /** New sort order */
  sort_order?: number

  /** Whether stage is active */
  is_active?: boolean

  /** Whether this is a terminal stage */
  is_terminal?: boolean
}

/**
 * Request body for creating a new deal.
 */
export interface CreateDealRequest {
  /** Organization ID */
  organization_id: string

  /** Property ID (optional, can be unlinked deal) */
  property_id?: string

  /** Deal title */
  title: string

  /** Deal description */
  description?: string

  /** Initial pipeline stage ID */
  current_stage_id: string

  /** Financial details */
  target_bid_amount?: number
  max_bid_amount?: number
  estimated_value?: number
  estimated_profit?: number

  /** Priority level */
  priority?: 'low' | 'medium' | 'high' | 'urgent'

  /** User to assign deal to */
  assigned_to?: string

  /** Important dates */
  auction_date?: string
  registration_deadline?: string

  /** Tags for categorization */
  tags?: string[]

  /** Custom fields for flexible data */
  custom_fields?: Record<string, unknown>
}

/**
 * Request body for updating a deal.
 */
export interface UpdateDealRequest {
  /** Deal ID to update */
  deal_id: string

  /** New title */
  title?: string

  /** New description */
  description?: string

  /** Financial updates */
  target_bid_amount?: number
  max_bid_amount?: number
  actual_bid_amount?: number
  purchase_price?: number
  estimated_value?: number
  estimated_profit?: number

  /** Priority update */
  priority?: 'low' | 'medium' | 'high' | 'urgent'

  /** Status update */
  status?: 'active' | 'won' | 'lost' | 'abandoned'

  /** Assignment update */
  assigned_to?: string

  /** Date updates */
  auction_date?: string
  registration_deadline?: string

  /** Tag updates */
  tags?: string[]

  /** Custom field updates */
  custom_fields?: Record<string, unknown>
}

/**
 * Request body for moving a deal to a different stage.
 */
export interface MoveDealRequest {
  /** Deal ID to move */
  deal_id: string

  /** Target stage ID */
  to_stage_id: string

  /** Optional note about the move */
  note?: string
}

/**
 * Request body for assigning team members to a deal.
 */
export interface AssignDealRequest {
  /** Deal ID */
  deal_id: string

  /** User ID to assign */
  user_id: string

  /** Assignment role (e.g., "lead", "analyst", "reviewer") */
  role?: string
}

/**
 * Request body for removing a team member from a deal.
 */
export interface UnassignDealRequest {
  /** Deal ID */
  deal_id: string

  /** User ID to unassign */
  user_id: string
}

/**
 * Request body for creating a deal activity/note.
 */
export interface CreateDealActivityRequest {
  /** Deal ID */
  deal_id: string

  /** Activity type */
  activity_type: 'note' | 'status_change' | 'stage_change' | 'assignment' | 'bid_update' | 'document_added' | 'email_sent' | 'phone_call' | 'meeting'

  /** Activity title */
  title: string

  /** Activity description */
  description?: string

  /** Stage IDs for stage change activities */
  from_stage_id?: string
  to_stage_id?: string

  /** Additional metadata */
  metadata?: Record<string, unknown>
}

// ============================================
// API Response Types
// ============================================

/**
 * Response from pipeline stage creation/update.
 */
export interface PipelineStageResponse {
  /** Created/updated stage ID */
  stage_id: string

  /** Stage name */
  name: string

  /** Sort order */
  sort_order: number

  /** Success message */
  message?: string
}

/**
 * Response from deal creation/update.
 */
export interface DealResponse {
  /** Created/updated deal ID */
  deal_id: string

  /** Deal title */
  title: string

  /** Current stage ID */
  current_stage_id: string

  /** Success message */
  message?: string
}

/**
 * Response from moving a deal between stages.
 */
export interface MoveDealResponse {
  /** Deal ID */
  deal_id: string

  /** Previous stage ID */
  from_stage_id: string

  /** New stage ID */
  to_stage_id: string

  /** Activity ID created for the move */
  activity_id: string

  /** Success message */
  message?: string
}

// ============================================
// Extended Types with Computed Fields
// ============================================

/**
 * Deal with additional computed fields and status information.
 */
export interface DealWithMetrics {
  /** Base deal fields */
  id: string
  organization_id: string
  property_id?: string
  title: string
  description?: string
  current_stage_id: string
  current_stage_name: string
  current_stage_color?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'active' | 'won' | 'lost' | 'abandoned'
  assigned_to?: string
  created_by: string
  auction_date?: string
  registration_deadline?: string
  won_at?: string
  lost_at?: string
  tags?: string[]
  created_at: string
  updated_at: string

  // Financial metrics
  target_bid_amount?: number
  max_bid_amount?: number
  actual_bid_amount?: number
  purchase_price?: number
  estimated_value?: number
  estimated_profit?: number
  roi_percentage?: number // Computed: (estimated_profit / purchase_price) * 100

  // Computed fields
  days_in_stage: number // Days since stage_entered_at
  days_until_auction?: number // Days until auction_date (negative if passed)
  days_until_registration_deadline?: number
  active_team_members: number
  activity_count: number
  is_overdue: boolean // True if auction_date or registration_deadline passed
}

/**
 * Pipeline stage with deal counts and metrics.
 */
export interface PipelineStageWithMetrics {
  /** Base stage fields */
  id: string
  organization_id: string
  name: string
  description?: string
  color?: string
  sort_order: number
  is_terminal: boolean
  is_active: boolean
  created_at: string
  updated_at: string

  // Metrics
  deal_count: number
  urgent_deals: number
  high_priority_deals: number
  total_estimated_value: number
  total_estimated_profit: number
  avg_estimated_profit: number
  avg_days_in_stage: number
}

/**
 * Deal activity with user and stage details.
 */
export interface DealActivityWithDetails {
  /** Base activity fields */
  id: string
  deal_id: string
  user_id?: string
  activity_type: string
  title: string
  description?: string
  created_at: string

  // Additional details
  from_stage_id?: string
  from_stage_name?: string
  to_stage_id?: string
  to_stage_name?: string
  metadata?: Record<string, unknown>
}

// ============================================
// Filter and Query Types
// ============================================

/**
 * Filters for querying deals.
 */
export interface DealFilters {
  /** Filter by organization */
  organization_id?: string

  /** Filter by current stage */
  stage_id?: string

  /** Filter by status */
  status?: 'active' | 'won' | 'lost' | 'abandoned'

  /** Filter by priority */
  priority?: 'low' | 'medium' | 'high' | 'urgent'

  /** Filter by assigned user */
  assigned_to?: string

  /** Filter by property */
  property_id?: string

  /** Filter by auction date range */
  auction_date_from?: string
  auction_date_to?: string

  /** Filter by tags */
  tags?: string[]

  /** Search in title/description */
  search?: string

  /** Sort field */
  sort_by?: 'created_at' | 'updated_at' | 'auction_date' | 'priority' | 'estimated_value' | 'estimated_profit'

  /** Sort direction */
  sort_direction?: 'asc' | 'desc'

  /** Pagination */
  page?: number
  limit?: number
}

/**
 * Paginated response for deals list.
 */
export interface DealsListResponse {
  /** Deals matching filters */
  deals: DealWithMetrics[]

  /** Total count of deals matching filters */
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
 * Filters for querying deal activities.
 */
export interface DealActivityFilters {
  /** Filter by deal */
  deal_id?: string

  /** Filter by user */
  user_id?: string

  /** Filter by activity type */
  activity_type?: string

  /** Filter by date range */
  date_from?: string
  date_to?: string

  /** Pagination */
  page?: number
  limit?: number
}

// ============================================
// Statistics and Analytics Types
// ============================================

/**
 * Pipeline statistics for an organization.
 */
export interface PipelineStats {
  /** Organization ID */
  organization_id: string

  /** Total active deals */
  total_active_deals: number

  /** Deals by status */
  deals_by_status: {
    active: number
    won: number
    lost: number
    abandoned: number
  }

  /** Deals by priority */
  deals_by_priority: {
    low: number
    medium: number
    high: number
    urgent: number
  }

  /** Financial summary */
  total_estimated_value: number
  total_estimated_profit: number
  total_actual_bids: number
  total_purchase_price: number
  avg_roi_percentage: number

  /** Win/loss metrics */
  win_rate: number // Percentage of won deals
  total_won: number
  total_lost: number

  /** Time metrics */
  avg_time_to_close_days: number // Average days from creation to won/lost
  deals_overdue: number // Deals past auction date or registration deadline
}

/**
 * Deal timeline event for visualization.
 */
export interface DealTimelineEvent {
  /** Event ID (activity ID or generated) */
  id: string

  /** Event type */
  type: 'created' | 'stage_change' | 'assignment' | 'bid_update' | 'note' | 'status_change' | 'won' | 'lost'

  /** Event title */
  title: string

  /** Event description */
  description?: string

  /** Event timestamp */
  timestamp: string

  /** User who triggered the event */
  user_id?: string

  /** Additional event data */
  metadata?: Record<string, unknown>
}

/**
 * Deal timeline (full history).
 */
export interface DealTimeline {
  /** Deal ID */
  deal_id: string

  /** Timeline events in chronological order */
  events: DealTimelineEvent[]

  /** Total number of events */
  total_events: number
}

// ============================================
// Batch Operations Types
// ============================================

/**
 * Request for bulk updating deals.
 */
export interface BulkUpdateDealsRequest {
  /** Deal IDs to update */
  deal_ids: string[]

  /** Updates to apply */
  updates: {
    stage_id?: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    status?: 'active' | 'won' | 'lost' | 'abandoned'
    tags?: string[]
  }
}

/**
 * Response from bulk update operation.
 */
export interface BulkUpdateDealsResponse {
  /** Number of deals successfully updated */
  updated_count: number

  /** Deal IDs that were updated */
  updated_deal_ids: string[]

  /** Deal IDs that failed to update */
  failed_deal_ids: string[]

  /** Error messages for failed updates */
  errors?: Array<{
    deal_id: string
    error: string
  }>
}
