/**
 * Property Management Types
 *
 * Type definitions for property management components including notes,
 * activity logs, images, and data enrichment status tracking.
 *
 * @module types/property-management
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-24
 */

// ============================================
// Note Types
// ============================================

/**
 * Valid note type categories for property notes.
 * - general: Standard notes with no specific category
 * - concern: Issues or problems to be aware of
 * - opportunity: Potential benefits or advantages
 * - action: Tasks or actions to take
 */
export type NoteType = 'general' | 'concern' | 'opportunity' | 'action';

/**
 * A note attached to a property with categorization and metadata.
 * Notes help users track observations, concerns, and action items.
 */
export interface PropertyNote {
  /** Unique identifier for the note (UUID) */
  id: string;

  /** Category of the note for visual differentiation */
  type: NoteType;

  /** The note content/text */
  text: string;

  /** When the note was created (ISO 8601 timestamp) */
  createdAt: string;

  /** User who created the note (user ID or display name) */
  createdBy: string;
}

/**
 * Request payload for creating a new property note.
 */
export interface CreatePropertyNoteRequest {
  /** Category of the note */
  type: NoteType;

  /** The note content/text */
  text: string;
}

/**
 * Request payload for updating an existing property note.
 */
export interface UpdatePropertyNoteRequest {
  /** Updated category of the note (optional) */
  type?: NoteType;

  /** Updated note content/text (optional) */
  text?: string;
}

// ============================================
// Activity Log Types
// ============================================

/**
 * An entry in the property activity log tracking changes and actions.
 * Activity logs provide an audit trail of all property-related events.
 */
export interface ActivityLogEntry {
  /** Unique identifier for the log entry (UUID) */
  id: string;

  /** The action that was performed (e.g., "Created note", "Updated status") */
  action: string;

  /** Additional details about the action */
  details: string;

  /** When the action occurred (ISO 8601 timestamp) */
  timestamp: string;

  /** User who performed the action (user ID or display name) */
  user: string;
}

/**
 * Common activity action types for property management.
 */
export type ActivityAction =
  | 'property_viewed'
  | 'property_updated'
  | 'note_created'
  | 'note_updated'
  | 'note_deleted'
  | 'status_changed'
  | 'validation_updated'
  | 'added_to_watchlist'
  | 'removed_from_watchlist'
  | 'report_generated'
  | 'data_enriched';

// ============================================
// Property Image Types
// ============================================

/**
 * Image associated with a property including metadata.
 * Images can come from various sources like Regrid, Google Maps, or user uploads.
 */
export interface PropertyImage {
  /** URL to the image resource */
  url: string;

  /** Descriptive caption for the image */
  caption: string;

  /** Source of the image (e.g., "regrid", "google_maps", "street_view", "user_upload") */
  source: string;
}

/**
 * Extended property image with additional metadata.
 */
export interface PropertyImageDetailed extends PropertyImage {
  /** Unique identifier for the image (UUID) */
  id: string;

  /** When the image was added (ISO 8601 timestamp) */
  addedAt: string;

  /** User who added the image (optional for automated sources) */
  addedBy?: string;

  /** Order for display purposes (lower = first) */
  sortOrder: number;

  /** Whether this is the primary/featured image */
  isPrimary: boolean;
}

// ============================================
// Validation Status Types
// ============================================

/**
 * Visual validation status for a property.
 * Indicates whether the property has been reviewed and approved for investment.
 */
export type ValidationStatus = 'pending' | 'approved' | 'caution' | 'rejected';

/**
 * Configuration for validation status display.
 */
export interface ValidationStatusConfig {
  /** Display label for the status */
  label: string;

  /** CSS color classes for styling */
  color: string;

  /** Description of what the status means */
  description: string;
}

/**
 * Mapping of validation statuses to their display configurations.
 */
export const VALIDATION_STATUS_CONFIG: Record<ValidationStatus, ValidationStatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'bg-slate-100 text-slate-700',
    description: 'Awaiting visual validation review',
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-700',
    description: 'Property passed visual validation',
  },
  caution: {
    label: 'Caution',
    color: 'bg-amber-100 text-amber-700',
    description: 'Property has potential issues requiring review',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-700',
    description: 'Property failed visual validation',
  },
};

// ============================================
// Data Enrichment Status Types
// ============================================

/**
 * Loading state for a single data enrichment source.
 */
export interface EnrichmentSourceStatus {
  /** Whether data exists for this source */
  hasData: boolean;

  /** Whether data is currently being loaded */
  isLoading: boolean;

  /** Error message if loading failed (optional) */
  error?: string;

  /** When the data was last updated (ISO 8601 timestamp, optional) */
  lastUpdated?: string;
}

/**
 * Screenshot enrichment status with count information.
 */
export interface ScreenshotEnrichmentStatus extends EnrichmentSourceStatus {
  /** Number of screenshots available */
  count: number;
}

/**
 * Validation enrichment status with validation state.
 */
export interface ValidationEnrichmentStatus extends EnrichmentSourceStatus {
  /** Current validation status */
  status: ValidationStatus | null;
}

/**
 * Complete data enrichment status for a property.
 * Tracks the availability and loading state of various data sources.
 */
export interface DataEnrichmentStatus {
  /** Regrid land data enrichment status */
  regrid: EnrichmentSourceStatus;

  /** Screenshot/image enrichment status */
  screenshot: ScreenshotEnrichmentStatus;

  /** Visual validation enrichment status */
  validation: ValidationEnrichmentStatus;
}

/**
 * Initial/default data enrichment status.
 */
export const DEFAULT_ENRICHMENT_STATUS: DataEnrichmentStatus = {
  regrid: {
    hasData: false,
    isLoading: false,
  },
  screenshot: {
    hasData: false,
    isLoading: false,
    count: 0,
  },
  validation: {
    hasData: false,
    isLoading: false,
    status: null,
  },
};

// ============================================
// Note Type Configuration
// ============================================

/**
 * Configuration for note type display.
 */
export interface NoteTypeConfig {
  /** Display label for the note type */
  label: string;

  /** CSS color classes for styling */
  color: string;

  /** Icon name or identifier */
  icon: string;

  /** Description of the note type */
  description: string;
}

/**
 * Mapping of note types to their display configurations.
 */
export const NOTE_TYPE_CONFIG: Record<NoteType, NoteTypeConfig> = {
  general: {
    label: 'General',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'StickyNote',
    description: 'General observations and information',
  },
  concern: {
    label: 'Concern',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: 'AlertTriangle',
    description: 'Issues or problems to be aware of',
  },
  opportunity: {
    label: 'Opportunity',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: 'TrendingUp',
    description: 'Potential benefits or advantages',
  },
  action: {
    label: 'Action',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: 'CheckSquare',
    description: 'Tasks or actions to take',
  },
};

// ============================================
// Component Props Types
// ============================================

/**
 * Props for the PropertyNotesPanel component.
 */
export interface PropertyNotesPanelProps {
  /** Array of notes to display */
  notes: PropertyNote[];

  /** Callback when notes are updated (add/delete) */
  onNotesChange: (notes: PropertyNote[]) => void;

  /** Whether the user can add/edit/delete notes */
  canEdit: boolean;

  /** Optional additional CSS classes */
  className?: string;

  /** Optional current user name for attribution */
  currentUserName?: string;
}

/**
 * Props for the PropertyHistoryTimeline component.
 */
export interface PropertyHistoryTimelineProps {
  /** Property ID for fetching activity log */
  propertyId: string;

  /** Initial activity log entries (optional) */
  initialEntries?: ActivityLogEntry[];

  /** Maximum number of entries to display (optional) */
  maxEntries?: number;

  /** Whether to show relative timestamps */
  showRelativeTime?: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the ImageGallery component.
 */
export interface ImageGalleryProps {
  /** Images to display */
  images: PropertyImage[];

  /** Whether to show image source badges */
  showSource?: boolean;

  /** Whether to allow fullscreen viewing */
  allowFullscreen?: boolean;

  /** Callback when an image is clicked */
  onImageClick?: (image: PropertyImage, index: number) => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the DataEnrichmentStatus component.
 */
export interface DataEnrichmentStatusProps {
  /** Current enrichment status */
  status: DataEnrichmentStatus;

  /** Callback to trigger data refresh */
  onRefresh?: (source: 'regrid' | 'screenshot' | 'validation') => void;

  /** Whether refresh actions are available */
  allowRefresh?: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the PropertyActionBar component.
 * Provides edit/save/cancel buttons, watchlist toggle, and delete functionality.
 */
export interface PropertyActionBarProps {
  /** Whether the property is in edit mode */
  isEditing: boolean;

  /** Whether the property is on the user's watchlist */
  isOnWatchlist: boolean;

  /** Whether the user can edit this property */
  canEdit: boolean;

  /** Whether the user can delete this property */
  canDelete: boolean;

  /** Whether a save operation is in progress */
  isSaving: boolean;

  /** Whether a delete operation is in progress */
  isDeleting: boolean;

  /** Current version number of the property data */
  version?: number;

  /** Last modified timestamp (ISO 8601) */
  lastModified?: string;

  /** Callback when edit button is clicked */
  onEdit: () => void;

  /** Callback when save button is clicked */
  onSave: () => void;

  /** Callback when cancel button is clicked */
  onCancel: () => void;

  /** Callback when watchlist toggle is clicked */
  onWatchlistToggle: () => void;

  /** Callback when delete is confirmed */
  onDelete: () => void;

  /** Optional additional CSS classes */
  className?: string;
}
