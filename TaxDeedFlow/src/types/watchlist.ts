/**
 * Watchlist Types
 *
 * TypeScript interfaces for the watchlist feature.
 * These types support shared property collections with organization-level
 * access control, fine-grained collaborator permissions, and custom settings.
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

// ============================================
// Database Record Types
// ============================================

/**
 * Watchlist record from the watchlists table.
 * Represents a saved collection of properties with sharing settings.
 */
export interface Watchlist {
  /** Primary key (UUID) */
  id: string;

  /** Name of the watchlist */
  name: string;

  /** Optional description */
  description: string | null;

  /** Organization this watchlist belongs to (null for personal watchlists) */
  organization_id: string | null;

  /** User who created the watchlist (auth.users.id) */
  created_by: string;

  /** Whether the watchlist is shared with the entire organization */
  is_shared: boolean;

  /** Visibility level of the watchlist */
  visibility: WatchlistVisibility;

  /** UI color for categorization (hex format) */
  color: string | null;

  /** Icon identifier for UI display */
  icon: string | null;

  /** Custom ordering (lower = higher in list) */
  sort_order: number;

  /** Watchlist settings (notifications, filters) */
  settings: WatchlistSettings;

  /** When the watchlist was created (ISO 8601 timestamp) */
  created_at: string;

  /** When the watchlist was last updated (ISO 8601 timestamp) */
  updated_at: string;

  /** Soft delete timestamp, null if not deleted */
  deleted_at: string | null;
}

/**
 * Watchlist property record from the watchlist_properties table.
 * Represents a property added to a watchlist with user notes and tracking.
 */
export interface WatchlistProperty {
  /** Primary key (UUID) */
  id: string;

  /** Reference to the watchlist (watchlists.id) */
  watchlist_id: string;

  /** Reference to the property (properties.id) */
  property_id: string;

  /** User notes about this property */
  notes: string | null;

  /** Priority within watchlist (higher = more important) */
  priority: number;

  /** Whether this property is marked as favorite */
  is_favorite: boolean;

  /** User-defined tags for categorization */
  tags: string[] | null;

  /** Flexible storage for custom fields */
  custom_data: Record<string, unknown>;

  /** User who added this property (auth.users.id) */
  added_by: string;

  /** When the property was added (ISO 8601 timestamp) */
  added_at: string;

  /** When the property was last viewed (ISO 8601 timestamp) */
  last_viewed_at: string | null;

  /** Number of times the property has been viewed */
  view_count: number;

  /** When the record was created (ISO 8601 timestamp) */
  created_at: string;

  /** When the record was last updated (ISO 8601 timestamp) */
  updated_at: string;
}

/**
 * Watchlist collaborator record from the watchlist_collaborators table.
 * Represents a user with explicit access to a watchlist.
 */
export interface WatchlistCollaborator {
  /** Primary key (UUID) */
  id: string;

  /** Reference to the watchlist (watchlists.id) */
  watchlist_id: string;

  /** Reference to the user (auth.users.id) */
  user_id: string;

  /** Permission level for this collaborator */
  permission: WatchlistPermission;

  /** User who invited this collaborator (auth.users.id) */
  invited_by: string | null;

  /** When the invitation was sent (ISO 8601 timestamp) */
  invited_at: string;

  /** When the record was created (ISO 8601 timestamp) */
  created_at: string;

  /** When the record was last updated (ISO 8601 timestamp) */
  updated_at: string;
}

// ============================================
// Type Aliases
// ============================================

/**
 * Watchlist visibility levels.
 */
export type WatchlistVisibility = 'private' | 'shared' | 'public';

/**
 * Collaborator permission levels.
 * - view: Can view watchlist and properties
 * - edit: Can add/remove properties and update settings
 * - admin: Full control including collaborator management
 */
export type WatchlistPermission = 'view' | 'edit' | 'admin';

/**
 * Watchlist settings structure.
 */
export interface WatchlistSettings {
  /** Notification preferences */
  notifications: {
    /** Notify on property price changes */
    price_changes: boolean;
    /** Notify on property status updates */
    status_updates: boolean;
    /** Send auction reminders */
    auction_reminders: boolean;
  };
  /** Automatic filtering criteria */
  auto_filters: {
    /** Minimum property value (optional) */
    min_value: number | null;
    /** Maximum property value (optional) */
    max_value: number | null;
    /** Allowed property types */
    property_types: string[];
  };
}

// ============================================
// API Request Types
// ============================================

/**
 * Request body for creating a new watchlist.
 */
export interface CreateWatchlistRequest {
  /** Name of the watchlist */
  name: string;

  /** Optional description */
  description?: string;

  /** Organization ID (optional, null for personal watchlists) */
  organization_id?: string;

  /** Whether to share with entire organization (default: false) */
  is_shared?: boolean;

  /** Visibility level (default: 'private') */
  visibility?: WatchlistVisibility;

  /** UI color (hex format) */
  color?: string;

  /** Icon identifier */
  icon?: string;

  /** Custom settings (optional) */
  settings?: Partial<WatchlistSettings>;
}

/**
 * Request body for updating a watchlist.
 */
export interface UpdateWatchlistRequest {
  /** New name (optional) */
  name?: string;

  /** New description (optional) */
  description?: string;

  /** Update shared status (optional) */
  is_shared?: boolean;

  /** Update visibility (optional) */
  visibility?: WatchlistVisibility;

  /** Update color (optional) */
  color?: string;

  /** Update icon (optional) */
  icon?: string;

  /** Update sort order (optional) */
  sort_order?: number;

  /** Update settings (optional, merged with existing) */
  settings?: Partial<WatchlistSettings>;
}

/**
 * Request body for adding a property to a watchlist.
 */
export interface AddToWatchlistRequest {
  /** Property ID to add */
  property_id: string;

  /** Optional notes about the property */
  notes?: string;

  /** Priority level (default: 0) */
  priority?: number;

  /** Mark as favorite (default: false) */
  is_favorite?: boolean;

  /** Custom tags */
  tags?: string[];

  /** Custom data fields */
  custom_data?: Record<string, unknown>;
}

/**
 * Request body for updating a property within a watchlist.
 */
export interface UpdateWatchlistPropertyRequest {
  /** Update notes (optional) */
  notes?: string;

  /** Update priority (optional) */
  priority?: number;

  /** Update favorite status (optional) */
  is_favorite?: boolean;

  /** Update tags (optional) */
  tags?: string[];

  /** Update custom data (optional, merged with existing) */
  custom_data?: Record<string, unknown>;
}

/**
 * Request body for adding a collaborator to a watchlist.
 */
export interface AddCollaboratorRequest {
  /** User ID to add as collaborator */
  user_id: string;

  /** Permission level to grant */
  permission: WatchlistPermission;
}

/**
 * Request body for updating a collaborator's permissions.
 */
export interface UpdateCollaboratorRequest {
  /** New permission level */
  permission: WatchlistPermission;
}

// ============================================
// Response Types
// ============================================

/**
 * Response from watchlist creation endpoint.
 */
export interface CreateWatchlistResponse {
  /** Created watchlist ID */
  watchlist_id: string;

  /** Complete watchlist object */
  watchlist: Watchlist;
}

/**
 * Response from add to watchlist endpoint.
 */
export interface AddToWatchlistResponse {
  /** Created watchlist property ID */
  watchlist_property_id: string;

  /** Whether the property was already in the watchlist (duplicate) */
  already_exists: boolean;
}

// ============================================
// Extended Types with Computed Fields
// ============================================

/**
 * Extended watchlist information with property count and access details.
 */
export interface WatchlistWithStats extends Watchlist {
  /** Number of properties in this watchlist */
  property_count: number;

  /** Number of favorite properties */
  favorite_count: number;

  /** Number of collaborators (excluding owner) */
  collaborator_count: number;

  /** User's permission level for this watchlist */
  user_permission: WatchlistPermission | 'owner';

  /** Whether the current user owns this watchlist */
  is_owner: boolean;

  /** Most recent property added (ISO 8601 timestamp) */
  last_property_added_at: string | null;
}

/**
 * Watchlist property with full property details.
 */
export interface WatchlistPropertyDetailed extends WatchlistProperty {
  /** Property details */
  property: {
    /** Parcel number */
    parcel_number: string | null;
    /** Full address */
    address: string | null;
    /** City */
    city: string | null;
    /** State */
    state: string | null;
    /** ZIP code */
    zip_code: string | null;
    /** Total amount due */
    total_due: number | null;
    /** Assessed value */
    assessed_value: number | null;
    /** Property status */
    status: string | null;
  };

  /** Watchlist name for context */
  watchlist_name: string;
}

/**
 * Collaborator with user details.
 */
export interface WatchlistCollaboratorDetailed extends WatchlistCollaborator {
  /** User details */
  user: {
    /** User email */
    email: string;
    /** User full name */
    full_name: string | null;
  };

  /** Inviter details */
  invited_by_user: {
    /** Inviter email */
    email: string;
    /** Inviter full name */
    full_name: string | null;
  } | null;

  /** Watchlist name for context */
  watchlist_name: string;
}

// ============================================
// Filter and Query Types
// ============================================

/**
 * Filters for querying watchlists.
 */
export interface WatchlistFilters {
  /** Filter by organization ID */
  organization_id?: string;

  /** Filter by visibility level */
  visibility?: WatchlistVisibility;

  /** Filter by shared status */
  is_shared?: boolean;

  /** Filter watchlists where user is owner */
  owned_by_user?: boolean;

  /** Filter watchlists where user is collaborator */
  user_is_collaborator?: boolean;

  /** Include deleted watchlists */
  include_deleted?: boolean;
}

/**
 * Filters for querying watchlist properties.
 */
export interface WatchlistPropertyFilters {
  /** Filter by watchlist ID */
  watchlist_id?: string;

  /** Filter favorites only */
  favorites_only?: boolean;

  /** Filter by minimum priority */
  min_priority?: number;

  /** Filter by tags (any match) */
  tags?: string[];

  /** Filter by property status */
  property_status?: string;

  /** Sort field */
  sort_by?: 'priority' | 'added_at' | 'last_viewed_at' | 'view_count';

  /** Sort direction */
  sort_order?: 'asc' | 'desc';
}

// ============================================
// Statistics and Analytics Types
// ============================================

/**
 * Watchlist usage statistics.
 */
export interface WatchlistStats {
  /** Watchlist ID */
  watchlist_id: string;

  /** Total properties in watchlist */
  total_properties: number;

  /** Number of favorites */
  favorite_count: number;

  /** Average priority across all properties */
  avg_priority: number;

  /** Total views across all properties */
  total_views: number;

  /** Most viewed property ID */
  most_viewed_property_id: string | null;

  /** Number of properties viewed in last 7 days */
  recently_viewed_count: number;

  /** Number of properties added in last 30 days */
  recently_added_count: number;

  /** Total estimated value of all properties */
  total_estimated_value: number | null;

  /** Average property value */
  avg_property_value: number | null;
}

/**
 * Organization watchlist overview.
 */
export interface OrganizationWatchlistOverview {
  /** Organization ID */
  organization_id: string;

  /** Total watchlists in organization */
  total_watchlists: number;

  /** Number of shared watchlists */
  shared_watchlists: number;

  /** Number of private watchlists */
  private_watchlists: number;

  /** Total unique properties across all watchlists */
  total_unique_properties: number;

  /** Total properties (including duplicates across watchlists) */
  total_property_entries: number;

  /** Most active watchlist ID (by property count) */
  most_active_watchlist_id: string | null;

  /** Most active watchlist name */
  most_active_watchlist_name: string | null;
}

/**
 * User watchlist activity summary.
 */
export interface UserWatchlistActivity {
  /** User ID */
  user_id: string;

  /** Number of watchlists owned */
  owned_watchlists: number;

  /** Number of watchlists where user is collaborator */
  collaborator_on_watchlists: number;

  /** Total properties added by user across all watchlists */
  properties_added: number;

  /** Total watchlist views by user */
  total_views: number;

  /** Last activity timestamp (ISO 8601) */
  last_activity_at: string | null;
}

// ============================================
// Validation Types
// ============================================

/**
 * Result from validating user access to a watchlist.
 */
export interface WatchlistAccessValidation {
  /** Whether the user has access */
  has_access: boolean;

  /** User's permission level */
  permission: WatchlistPermission | 'owner' | null;

  /** Error message if access denied */
  error_message: string | null;

  /** Whether the watchlist exists */
  watchlist_exists: boolean;

  /** Whether the watchlist is deleted */
  is_deleted: boolean;
}

/**
 * Result from validating organization limits.
 */
export interface WatchlistLimitValidation {
  /** Whether the action is allowed */
  is_allowed: boolean;

  /** Current count */
  current_count: number;

  /** Maximum allowed */
  max_allowed: number;

  /** Error message if limit exceeded */
  error_message: string | null;
}
