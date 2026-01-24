"use client"

import { useState, useEffect } from "react"
import { Loader2, Heart, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { WatchlistSummary } from "./WatchlistManager"

interface CreateListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (watchlist: any) => void
  editingWatchlist?: WatchlistSummary | null
}

export function CreateListModal({
  open,
  onOpenChange,
  onSuccess,
  editingWatchlist = null,
}: CreateListModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#3b82f6")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const isEditing = editingWatchlist !== null

  // Populate form when editing
  useEffect(() => {
    if (editingWatchlist) {
      setName(editingWatchlist.name)
      setDescription(editingWatchlist.description || "")
      setColor(editingWatchlist.color || "#3b82f6")
    } else {
      // Reset form when creating new watchlist
      setName("")
      setDescription("")
      setColor("#3b82f6")
    }
    setValidationError(null)
  }, [editingWatchlist, open])

  // Validate name
  const validateName = (value: string): string | null => {
    if (!value.trim()) {
      return "Watchlist name is required"
    }
    if (value.trim().length > 100) {
      return "Name must be 100 characters or less"
    }
    return null
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate name
    const nameError = validateName(name)
    if (nameError) {
      setValidationError(nameError)
      return
    }

    setIsSubmitting(true)
    setValidationError(null)

    try {
      const url = isEditing
        ? `/api/watchlist/${editingWatchlist.watchlist_id}`
        : "/api/watchlist"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          setValidationError("A watchlist with this name already exists")
          return
        }
        throw new Error(result.message || `Failed to ${isEditing ? "update" : "create"} watchlist`)
      }

      // Show success message
      toast.success(
        isEditing
          ? "Watchlist updated successfully"
          : "Watchlist created successfully"
      )

      // Call success callback
      if (onSuccess) {
        onSuccess(result.data)
      }

      // Close modal
      onOpenChange(false)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to ${isEditing ? "update" : "create"} watchlist`
      setValidationError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null)
    }
  }

  // Handle close
  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" onClose={handleClose}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <DialogTitle>
              {isEditing ? "Edit Watchlist" : "Create New Watchlist"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? "Update the name and description of your watchlist"
              : "Create a new watchlist to organize your properties"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Name input */}
            <div className="space-y-2">
              <Label htmlFor="watchlist-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="watchlist-name"
                type="text"
                placeholder="e.g., High Priority, Research Needed"
                value={name}
                onChange={handleNameChange}
                disabled={isSubmitting}
                autoFocus
                required
                maxLength={100}
              />
            </div>

            {/* Description textarea */}
            <div className="space-y-2">
              <Label htmlFor="watchlist-description">
                Description <span className="text-xs text-slate-500">(optional)</span>
              </Label>
              <textarea
                id="watchlist-description"
                placeholder="Add notes about this watchlist..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                maxLength={500}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
              <p className="text-xs text-slate-500">
                {description.length}/500 characters
              </p>
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label htmlFor="watchlist-color">Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="watchlist-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={isSubmitting}
                  className="h-10 w-20 rounded border border-slate-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="text-sm text-slate-600">
                  Choose a color to identify this watchlist
                </span>
              </div>
            </div>

            {/* Validation error */}
            {validationError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{validationError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>{isEditing ? "Update Watchlist" : "Create Watchlist"}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
