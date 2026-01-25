"use client";

/**
 * PropertyActionBar Component
 *
 * A horizontal action bar for property management providing:
 * - Edit/Save/Cancel buttons (role-gated via canEdit prop)
 * - Watchlist toggle with heart icon
 * - Delete button with confirmation modal
 * - Version info display in edit mode
 *
 * Features:
 * - Full ARIA accessibility support
 * - Keyboard navigation (Escape to close modal, Enter to confirm)
 * - Loading states with spinners for async operations
 * - Disabled states during operations
 * - Responsive layout
 *
 * @module components/property-management/PropertyActionBar
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-24
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Pencil,
  Save,
  X,
  Trash2,
  Heart,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropertyActionBarProps } from "@/types/property-management";

/**
 * PropertyActionBar provides property management actions in a horizontal bar layout.
 *
 * Left side: Edit/Save/Cancel buttons, Version info (when editing)
 * Right side: Watchlist toggle, Delete button
 *
 * @param isEditing - Whether the property is currently in edit mode
 * @param isOnWatchlist - Whether the property is on the user's watchlist
 * @param canEdit - Whether the user has permission to edit
 * @param canDelete - Whether the user has permission to delete
 * @param isSaving - Whether a save operation is in progress
 * @param isDeleting - Whether a delete operation is in progress
 * @param version - Current version number of the property data
 * @param lastModified - Last modified timestamp (ISO 8601)
 * @param onEdit - Callback when edit button is clicked
 * @param onSave - Callback when save button is clicked
 * @param onCancel - Callback when cancel button is clicked
 * @param onWatchlistToggle - Callback when watchlist toggle is clicked
 * @param onDelete - Callback when delete is confirmed
 * @param className - Additional CSS classes
 *
 * @example
 * ```tsx
 * <PropertyActionBar
 *   isEditing={false}
 *   isOnWatchlist={true}
 *   canEdit={true}
 *   canDelete={false}
 *   isSaving={false}
 *   isDeleting={false}
 *   version={3}
 *   lastModified="2026-01-24T10:30:00Z"
 *   onEdit={() => setIsEditing(true)}
 *   onSave={handleSave}
 *   onCancel={() => setIsEditing(false)}
 *   onWatchlistToggle={toggleWatchlist}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export function PropertyActionBar({
  isEditing,
  isOnWatchlist,
  canEdit,
  canDelete,
  isSaving,
  isDeleting,
  version,
  lastModified,
  onEdit,
  onSave,
  onCancel,
  onWatchlistToggle,
  onDelete,
  className,
}: PropertyActionBarProps) {
  // State for delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Refs for focus management
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Determine if any operation is in progress
  const isOperationInProgress = isSaving || isDeleting;

  /**
   * Format the last modified date for display
   */
  const formatLastModified = useCallback((timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch {
      return "Unknown";
    }
  }, []);

  /**
   * Handle delete button click - show confirmation modal
   */
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  /**
   * Handle delete confirmation
   */
  const handleConfirmDelete = useCallback(() => {
    onDelete();
    // Note: Don't close modal here - parent will handle cleanup after delete completes
  }, [onDelete]);

  /**
   * Handle cancel delete and restore focus
   */
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    // Restore focus to delete button
    setTimeout(() => {
      deleteButtonRef.current?.focus();
    }, 0);
  }, []);

  /**
   * Handle keyboard events for modal and focus management
   */
  useEffect(() => {
    if (!showDeleteConfirm) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowDeleteConfirm(false);
        // Restore focus to delete button
        setTimeout(() => {
          deleteButtonRef.current?.focus();
        }, 0);
      }
    };

    // Focus the cancel button when modal opens
    setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [showDeleteConfirm]);

  // Close modal when delete completes (isDeleting goes from true to false)
  useEffect(() => {
    if (!isDeleting && showDeleteConfirm) {
      // Small delay to ensure the delete completed successfully
      const timer = setTimeout(() => {
        setShowDeleteConfirm(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isDeleting, showDeleteConfirm]);

  return (
    <>
      {/* Action Bar */}
      <div
        className={cn(
          "flex items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm",
          className
        )}
        role="toolbar"
        aria-label="Property actions"
      >
        {/* Left Side: Edit/Save/Cancel + Version Info */}
        <div className="flex items-center gap-3">
          {/* Edit Mode Controls */}
          {isEditing ? (
            <>
              {/* Save Button */}
              <button
                onClick={onSave}
                disabled={isSaving || isDeleting}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  "bg-green-600 text-white hover:bg-green-700",
                  "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
                )}
                aria-label={isSaving ? "Saving changes..." : "Save changes"}
                aria-busy={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{isSaving ? "Saving..." : "Save"}</span>
              </button>

              {/* Cancel Button */}
              <button
                onClick={onCancel}
                disabled={isSaving}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  "bg-slate-100 text-slate-700 hover:bg-slate-200",
                  "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-label="Cancel editing"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span>Cancel</span>
              </button>

              {/* Version Info (only in edit mode) */}
              {(version !== undefined || lastModified) && (
                <div
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-500"
                  aria-label="Version information"
                >
                  {version !== undefined && (
                    <span className="font-medium">v{version}</span>
                  )}
                  {version !== undefined && lastModified && (
                    <span className="text-slate-300" aria-hidden="true">|</span>
                  )}
                  {lastModified && (
                    <span title={new Date(lastModified).toLocaleString()}>
                      Modified {formatLastModified(lastModified)}
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            /* View Mode: Edit Button */
            canEdit && (
              <button
                onClick={onEdit}
                disabled={isOperationInProgress}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  "bg-primary text-white hover:bg-primary/90",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-label="Edit property"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span>Edit</span>
              </button>
            )
          )}
        </div>

        {/* Right Side: Watchlist + Delete */}
        <div className="flex items-center gap-2">
          {/* Watchlist Toggle */}
          <button
            onClick={onWatchlistToggle}
            disabled={isOperationInProgress}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all",
              isOnWatchlist
                ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              isOnWatchlist ? "focus:ring-red-400" : "focus:ring-slate-400",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            aria-label={isOnWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            aria-pressed={isOnWatchlist}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-all",
                isOnWatchlist && "fill-current"
              )}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">
              {isOnWatchlist ? "Watching" : "Watch"}
            </span>
          </button>

          {/* Delete Button */}
          {canDelete && (
            <button
              ref={deleteButtonRef}
              onClick={handleDeleteClick}
              disabled={isOperationInProgress || isEditing}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                "bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200",
                "border border-slate-200",
                "focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-50 disabled:hover:text-slate-600 disabled:hover:border-slate-200"
              )}
              aria-label="Delete property"
              title={isEditing ? "Save or cancel edits before deleting" : "Delete property"}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          aria-describedby="delete-modal-description"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={handleCancelDelete}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-200">
              <div className="flex-shrink-0 p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="delete-modal-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Delete Property
                </h2>
                <p className="text-sm text-slate-500">
                  This action cannot be undone
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <p id="delete-modal-description" className="text-sm text-slate-600">
                Are you sure you want to permanently delete this property? All
                associated data, notes, and images will be removed. This action
                cannot be reversed.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
              <button
                ref={cancelButtonRef}
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
                  "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  "bg-red-600 text-white hover:bg-red-700",
                  "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-busy={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span>Delete Property</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PropertyActionBar;
