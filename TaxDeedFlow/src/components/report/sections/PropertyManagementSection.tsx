"use client";

import * as React from "react";
import { Settings, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Import Track 1 property management components
import {
  PropertyNotesPanel,
  PropertyHistoryTimeline,
  ImageGallery,
  DataEnrichmentStatusPanel,
  type PropertyNote,
  type ActivityLogEntry,
  type PropertyImage,
} from "@/components/property-management";

/**
 * Props for the PropertyManagementSection component
 */
export interface PropertyManagementSectionProps {
  /** Property ID for timeline and data fetching */
  propertyId: string;

  /** Property notes */
  notes: PropertyNote[];
  /** Callback when notes change */
  onNotesChange: (notes: PropertyNote[]) => void;
  /** Whether user can edit notes */
  canEditNotes: boolean;
  /** Current user name for note attribution */
  currentUserName: string;

  /** Property images */
  images: PropertyImage[];

  /** Activity log entries */
  activityLog: ActivityLogEntry[];
  /** Whether to show relative timestamps */
  showRelativeTime?: boolean;

  /** Data enrichment status */
  enrichmentStatus: {
    regridComplete: boolean;
    regridLastFetched?: string;
    screenshotComplete: boolean;
    screenshotCount: number;
    validationStatus: "pending" | "approved" | "caution" | "rejected";
  };
  /** Callback when fetch Regrid is clicked */
  onFetchRegrid?: () => void;
  /** Callback when capture screenshots is clicked */
  onCaptureScreenshots?: () => void;
  /** Whether Regrid fetch is in progress */
  isRegridLoading?: boolean;
  /** Whether screenshot capture is in progress */
  isScreenshotLoading?: boolean;
  /** Whether to allow refresh actions */
  allowRefresh?: boolean;

  /** Whether section is initially expanded */
  defaultExpanded?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PropertyManagementSection - A collapsible section containing property management features
 *
 * This section is excluded from PDF printing and contains:
 * - Notes panel for adding/editing property notes
 * - Image gallery for viewing property images
 * - Activity history timeline
 * - Data enrichment status indicators
 *
 * Features:
 * - Collapsible with smooth height transition
 * - 2x2 grid layout on large screens
 * - Full accessibility with ARIA attributes
 * - Keyboard navigation support
 * - Print exclusion (hidden when printing)
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <PropertyManagementSection
 *   propertyId="abc123-def456"
 *   notes={propertyNotes}
 *   onNotesChange={handleNotesChange}
 *   canEditNotes={true}
 *   currentUserName="John Doe"
 *   images={propertyImages}
 *   activityLog={activityEntries}
 *   enrichmentStatus={{
 *     regridComplete: true,
 *     regridLastFetched: "2026-01-20T10:30:00Z",
 *     screenshotComplete: true,
 *     screenshotCount: 3,
 *     validationStatus: "approved"
 *   }}
 *   defaultExpanded={false}
 * />
 * ```
 */
export function PropertyManagementSection({
  propertyId,
  notes,
  onNotesChange,
  canEditNotes,
  currentUserName,
  images,
  activityLog,
  showRelativeTime = true,
  enrichmentStatus,
  onFetchRegrid,
  onCaptureScreenshots,
  isRegridLoading = false,
  isScreenshotLoading = false,
  allowRefresh = true,
  defaultExpanded = false,
  className,
}: PropertyManagementSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  // Generate unique IDs for ARIA using React.useId
  const uniqueId = React.useId();
  const sectionId = `property-management-section${uniqueId}`;
  const contentId = `property-management-content${uniqueId}`;
  const headingId = `property-management-header${uniqueId}`;

  /**
   * Toggle section expanded state
   */
  const handleToggle = React.useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  return (
    <section
      id={sectionId}
      aria-labelledby={headingId}
      className={cn(
        // Base styles matching other report sections
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        // Dark mode
        "dark:border-slate-700 dark:bg-slate-800",
        // Print exclusion - hide when printing
        "print:hidden",
        className
      )}
    >
      {/* Section Header with Toggle */}
      <div
        id={headingId}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          // Base styles
          "flex items-center justify-between px-6 py-4",
          // Interactive styles
          "cursor-pointer select-none",
          "hover:bg-slate-50 dark:hover:bg-slate-700/50",
          // Rounded corners
          "rounded-t-xl",
          // Border bottom when expanded
          isExpanded && "border-b border-slate-200 dark:border-slate-700",
          // Focus styles for accessibility
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          "dark:focus-visible:ring-offset-slate-800"
        )}
      >
        {/* Left side: Icon and Title */}
        <div className="flex items-center gap-3">
          {/* Collapse/Expand chevron */}
          <span
            className="flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200"
            aria-hidden="true"
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </span>

          {/* Section icon */}
          <span
            className="flex-shrink-0 text-slate-600 dark:text-slate-400"
            aria-hidden="true"
          >
            <Settings className="h-5 w-5" />
          </span>

          {/* Title */}
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Property Management
          </h2>
        </div>

        {/* Right side: Toggle text */}
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {isExpanded ? "Collapse" : "Expand"}
        </span>
      </div>

      {/* Collapsible Content */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={headingId}
        className={cn(
          // Transition for smooth expand/collapse
          "transition-all duration-300 ease-in-out",
          // Overflow handling
          "overflow-hidden",
          // Hide when collapsed
          !isExpanded && "max-h-0",
          isExpanded && "max-h-[5000px]" // Large enough for content
        )}
      >
        <div className="p-6">
          {/* 2x2 Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subsection 1: Notes Panel */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Notes
                </h3>
              </div>
              <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                <PropertyNotesPanel
                  notes={notes}
                  onNotesChange={onNotesChange}
                  canEdit={canEditNotes}
                  currentUserName={currentUserName}
                />
              </div>
            </div>

            {/* Subsection 2: Images Gallery */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Property Images
                </h3>
              </div>
              <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                <ImageGallery images={images} />
              </div>
            </div>

            {/* Subsection 3: Activity History */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Activity History
                </h3>
              </div>
              <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                <PropertyHistoryTimeline
                  propertyId={propertyId}
                  initialEntries={activityLog}
                  showRelativeTime={showRelativeTime}
                />
              </div>
            </div>

            {/* Subsection 4: Data Enrichment Status */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Data Enrichment Status
                </h3>
              </div>
              <div className="p-4 min-h-[200px]">
                <DataEnrichmentStatusPanel
                  status={{
                    regrid: {
                      hasData: enrichmentStatus.regridComplete,
                      isLoading: isRegridLoading,
                      lastUpdated: enrichmentStatus.regridLastFetched,
                    },
                    screenshot: {
                      hasData: enrichmentStatus.screenshotComplete,
                      isLoading: isScreenshotLoading,
                      count: enrichmentStatus.screenshotCount,
                    },
                    validation: {
                      hasData: true,
                      isLoading: false,
                      status: enrichmentStatus.validationStatus,
                    },
                  }}
                  onRefresh={(source) => {
                    if (source === "regrid") onFetchRegrid?.();
                    if (source === "screenshot") onCaptureScreenshots?.();
                  }}
                  allowRefresh={allowRefresh}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Reader Summary */}
      <span className="sr-only">
        Property management section containing notes, images, activity history,
        and data enrichment status. This section is{" "}
        {isExpanded ? "expanded" : "collapsed"}. Press Enter or Space to toggle.
      </span>
    </section>
  );
}

export default PropertyManagementSection;
