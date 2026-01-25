/**
 * Property Management Components
 *
 * Barrel export file for property management UI components.
 * Components will be added as they are implemented.
 *
 * @module components/property-management
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-24
 */

// ============================================
// Component Exports
// ============================================

// PropertyNotesPanel - Reusable notes management with type filtering
export { PropertyNotesPanel } from './PropertyNotesPanel';

// ImageGallery - Property images grid with lightbox functionality
export { ImageGallery } from './ImageGallery';

// PropertyHistoryTimeline - Vertical timeline of property activity log
export { PropertyHistoryTimeline } from './PropertyHistoryTimeline';

// DataEnrichmentStatusPanel - Status panel for data enrichment sources
// Note: Named differently from the type DataEnrichmentStatus to avoid conflicts
export { DataEnrichmentStatus as DataEnrichmentStatusPanel } from './DataEnrichmentStatus';

// PropertyActionBar - Action bar with edit/save/cancel, watchlist, and delete
export { PropertyActionBar } from './PropertyActionBar';

// ============================================
// Type Re-exports for Convenience
// ============================================

export type {
  // Note types
  NoteType,
  PropertyNote,
  CreatePropertyNoteRequest,
  UpdatePropertyNoteRequest,
  NoteTypeConfig,

  // Activity log types
  ActivityLogEntry,
  ActivityAction,

  // Image types
  PropertyImage,
  PropertyImageDetailed,

  // Validation types
  ValidationStatus,
  ValidationStatusConfig,

  // Enrichment status types
  EnrichmentSourceStatus,
  ScreenshotEnrichmentStatus,
  ValidationEnrichmentStatus,
  DataEnrichmentStatus,

  // Component props types
  PropertyNotesPanelProps,
  PropertyHistoryTimelineProps,
  ImageGalleryProps,
  DataEnrichmentStatusProps,
  PropertyActionBarProps,
} from '@/types/property-management';

// Re-export constants
export {
  NOTE_TYPE_CONFIG,
  VALIDATION_STATUS_CONFIG,
  DEFAULT_ENRICHMENT_STATUS,
} from '@/types/property-management';
