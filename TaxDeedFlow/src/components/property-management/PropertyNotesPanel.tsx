"use client"

/**
 * PropertyNotesPanel Component
 *
 * A reusable panel for managing property notes with type filtering,
 * add/delete functionality, and category-based color coding.
 *
 * @module components/property-management/PropertyNotesPanel
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-24
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import {
  StickyNote,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  Plus,
  Trash2,
  X,
  Save,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  PropertyNote,
  NoteType,
  NOTE_TYPE_CONFIG,
} from "@/types/property-management"

// ============================================
// Types
// ============================================

/**
 * Props for the PropertyNotesPanel component
 */
export interface PropertyNotesPanelProps {
  /** Array of notes to display */
  notes: PropertyNote[]
  /** Callback when notes are updated (add/delete) */
  onNotesChange: (notes: PropertyNote[]) => void
  /** Whether the user can add/edit/delete notes */
  canEdit: boolean
  /** Optional additional CSS classes */
  className?: string
  /** Optional current user name for attribution */
  currentUserName?: string
}

type NoteFilterType = "all" | NoteType

// Icon mapping for note types
const NOTE_TYPE_ICONS: Record<NoteType, React.ReactNode> = {
  general: <StickyNote className="h-4 w-4" />,
  concern: <AlertTriangle className="h-4 w-4" />,
  opportunity: <Lightbulb className="h-4 w-4" />,
  action: <CheckCircle className="h-4 w-4" />,
}

// ============================================
// Component
// ============================================

export function PropertyNotesPanel({
  notes,
  onNotesChange,
  canEdit,
  className,
  currentUserName = "User",
}: PropertyNotesPanelProps) {
  // Local state for the add note form
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNoteText, setNewNoteText] = useState("")
  const [newNoteType, setNewNoteType] = useState<NoteType>("general")

  // Filter state
  const [activeFilter, setActiveFilter] = useState<NoteFilterType>("all")

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

  // Refs for focus management
  const deleteButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const addNoteButtonRef = useRef<HTMLButtonElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Status message for screen readers (aria-live)
  const [statusMessage, setStatusMessage] = useState<string>("")

  // Compute filtered and sorted notes
  const filteredNotes = useMemo(() => {
    const filtered =
      activeFilter === "all"
        ? notes
        : notes.filter((note) => note.type === activeFilter)

    // Sort by createdAt descending (newest first)
    return [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [notes, activeFilter])

  // Compute counts for each note type
  const noteCounts = useMemo(() => {
    const counts: Record<NoteType, number> = {
      general: 0,
      concern: 0,
      opportunity: 0,
      action: 0,
    }
    notes.forEach((note) => {
      if (counts[note.type] !== undefined) {
        counts[note.type]++
      }
    })
    return counts
  }, [notes])

  // Handle adding a new note
  const handleAddNote = useCallback(() => {
    if (!newNoteText.trim()) {
      toast.error("Note cannot be empty")
      return
    }

    const newNote: PropertyNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type: newNoteType,
      text: newNoteText.trim(),
      createdAt: new Date().toISOString(),
      createdBy: currentUserName,
    }

    onNotesChange([...notes, newNote])
    setNewNoteText("")
    setNewNoteType("general")
    setIsAddingNote(false)

    // Announce to screen readers
    setStatusMessage(`${NOTE_TYPE_CONFIG[newNoteType].label} note added successfully`)

    // Restore focus to Add Note button
    setTimeout(() => {
      addNoteButtonRef.current?.focus()
    }, 0)

    toast.success("Note added", {
      description: `${NOTE_TYPE_CONFIG[newNoteType].label} note has been added.`,
    })
  }, [newNoteText, newNoteType, currentUserName, notes, onNotesChange])

  // Handle deleting a note
  const handleDeleteNote = useCallback(() => {
    if (!noteToDelete) return

    const updatedNotes = notes.filter((note) => note.id !== noteToDelete)
    onNotesChange(updatedNotes)
    setShowDeleteConfirm(false)

    // Announce to screen readers
    setStatusMessage("Note deleted successfully")

    // Find next focusable element (next delete button or add button)
    setTimeout(() => {
      // Find remaining delete buttons
      const remainingButtons = Array.from(deleteButtonRefs.current.values()).filter(
        (btn) => btn && document.contains(btn)
      )
      if (remainingButtons.length > 0) {
        remainingButtons[0]?.focus()
      } else {
        addNoteButtonRef.current?.focus()
      }
    }, 0)

    setNoteToDelete(null)

    toast.success("Note deleted", {
      description: "The note has been removed.",
    })
  }, [noteToDelete, notes, onNotesChange])

  // Handle cancel adding note
  const handleCancelAdd = useCallback(() => {
    setIsAddingNote(false)
    setNewNoteText("")
    setNewNoteType("general")

    // Restore focus to Add Note button
    setTimeout(() => {
      addNoteButtonRef.current?.focus()
    }, 0)
  }, [])

  // Handle Escape key to close modal and focus management
  useEffect(() => {
    if (!showDeleteConfirm) return

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowDeleteConfirm(false)
        // Restore focus to the delete button that triggered the modal
        if (noteToDelete) {
          setTimeout(() => {
            deleteButtonRefs.current.get(noteToDelete)?.focus()
          }, 0)
        }
        setNoteToDelete(null)
      }
    }

    // Focus the cancel button when modal opens
    setTimeout(() => {
      cancelButtonRef.current?.focus()
    }, 0)

    document.addEventListener("keydown", handleEscapeKey)
    return () => document.removeEventListener("keydown", handleEscapeKey)
  }, [showDeleteConfirm, noteToDelete])

  // Focus textarea when add note form opens
  useEffect(() => {
    if (isAddingNote) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    }
  }, [isAddingNote])

  // Format date for display
  const formatNoteDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {statusMessage}
      </div>

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-slate-600" aria-hidden="true" />
          Notes
          {notes.length > 0 && (
            <span className="text-sm font-normal text-slate-500">
              ({notes.length})
            </span>
          )}
        </h3>
        {canEdit && !isAddingNote && (
          <button
            ref={addNoteButtonRef}
            onClick={() => setIsAddingNote(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Add a new note"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Note
          </button>
        )}
      </div>

      {/* Type Filter (only show if there are notes and not adding) */}
      {notes.length > 0 && !isAddingNote && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">Filter by type:</span>
          <button
            onClick={() => setActiveFilter("all")}
            className={cn(
              "px-3 py-1 text-sm rounded-full transition-colors",
              activeFilter === "all"
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            All
          </button>
          {(["general", "concern", "opportunity", "action"] as const).map(
            (type) => {
              const config = NOTE_TYPE_CONFIG[type]
              const count = noteCounts[type]
              if (count === 0) return null
              return (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={cn(
                    "px-3 py-1 text-sm rounded-full transition-colors",
                    activeFilter === type
                      ? `${config.color} ring-2 ring-offset-1`
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {config.label} ({count})
                </button>
              )
            }
          )}
        </div>
      )}

      {/* Add Note Form */}
      {isAddingNote && (
        <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="note-type-select"
              className="text-sm font-medium text-slate-700"
            >
              Note Type:
            </label>
            <select
              id="note-type-select"
              value={newNoteType}
              onChange={(e) => setNewNoteType(e.target.value as NoteType)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {(["general", "concern", "opportunity", "action"] as const).map(
                (type) => (
                  <option key={type} value={type}>
                    {NOTE_TYPE_CONFIG[type].label}
                  </option>
                )
              )}
            </select>
          </div>
          <div className="space-y-1">
            <label
              htmlFor="note-text-input"
              className="sr-only"
            >
              Note content
            </label>
            <textarea
              ref={textareaRef}
              id="note-text-input"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Add your note about this property..."
              className="w-full h-32 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              aria-label="Note content"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleCancelAdd}
              className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {!isAddingNote && notes.length > 0 ? (
        <div className="space-y-3">
          {filteredNotes.map((note) => {
            const config = NOTE_TYPE_CONFIG[note.type]
            return (
              <div
                key={note.id}
                className={cn(
                  "rounded-lg border p-4",
                  config.color,
                  "border-slate-200"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full",
                          config.color
                        )}
                      >
                        {NOTE_TYPE_ICONS[note.type]}
                        {config.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatNoteDate(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-700">{note.text}</p>
                    {note.createdBy && (
                      <p className="text-xs text-slate-400 mt-2">
                        By {note.createdBy}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      ref={(el) => {
                        if (el) {
                          deleteButtonRefs.current.set(note.id, el)
                        } else {
                          deleteButtonRefs.current.delete(note.id)
                        }
                      }}
                      onClick={() => {
                        setNoteToDelete(note.id)
                        setShowDeleteConfirm(true)
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                      aria-label={`Delete ${NOTE_TYPE_CONFIG[note.type].label} note`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Show message if filter returns no results */}
          {filteredNotes.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>No {activeFilter} notes found.</p>
            </div>
          )}
        </div>
      ) : !isAddingNote ? (
        /* Empty state when no notes */
        <div className="text-center py-12 text-slate-500">
          <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No notes for this property yet.</p>
          {canEdit && (
            <p className="text-sm mt-2">
              Click &quot;Add Note&quot; to add your observations and reminders.
            </p>
          )}
        </div>
      ) : null}

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
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowDeleteConfirm(false)
              setNoteToDelete(null)
            }}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="h-5 w-5 text-red-600" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="delete-modal-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Delete Note
                </h2>
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete this note?
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <p id="delete-modal-description" className="text-sm text-slate-600">
                This action cannot be undone. The note will be permanently
                removed from this property.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
              <button
                ref={cancelButtonRef}
                onClick={() => {
                  setShowDeleteConfirm(false)
                  // Restore focus to the delete button that triggered the modal
                  if (noteToDelete) {
                    setTimeout(() => {
                      deleteButtonRefs.current.get(noteToDelete)?.focus()
                    }, 0)
                  }
                  setNoteToDelete(null)
                }}
                className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteNote}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
