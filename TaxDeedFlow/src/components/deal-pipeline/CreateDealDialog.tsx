"use client"

/**
 * Create Deal Dialog Component
 *
 * Modal dialog for creating a new deal in the pipeline with property details,
 * financial information, dates, and tags. Uses simple useState form management.
 *
 * Calls POST /api/deal-pipeline with auth headers to create a real deal.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-02-07
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import type { PipelineStageWithMetrics, CreateDealRequest } from "@/types/deal-pipeline"

// ============================================
// Helper Functions
// ============================================

/**
 * Build authentication headers for API requests.
 * Reads the stored user token and optional CSRF token from localStorage.
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (typeof window !== "undefined") {
    try {
      const userToken = localStorage.getItem("taxdeedflow_user")
      if (userToken) {
        headers["X-User-Token"] = userToken
      }

      const csrfToken = localStorage.getItem("taxdeedflow_csrf_token")
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken
      }
    } catch {
      // Silent fail - localStorage may not be available
    }
  }

  return headers
}

// ============================================
// Type Definitions
// ============================================

interface CreateDealDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Available pipeline stages to choose from */
  stages: PipelineStageWithMetrics[]
  /** Callback when deal is created successfully */
  onSuccess?: () => void
  /** Optional property ID to link the deal to */
  propertyId?: string
  /** Optional property address for pre-filling the title */
  propertyAddress?: string
  /** Optional auction date for pre-filling */
  propertyAuctionDate?: string
  /** Optional estimated value for pre-filling */
  propertyEstimatedValue?: number
}

// ============================================
// Main Component
// ============================================

export function CreateDealDialog({
  open,
  onOpenChange,
  stages,
  onSuccess,
  propertyId,
  propertyAddress,
  propertyAuctionDate,
  propertyEstimatedValue,
}: CreateDealDialogProps) {
  const { currentOrganization } = useAuth()

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [stageId, setStageId] = useState("")
  const [priority, setPriority] = useState("medium")
  const [targetBid, setTargetBid] = useState("")
  const [estimatedValue, setEstimatedValue] = useState("")
  const [auctionDate, setAuctionDate] = useState("")
  const [registrationDeadline, setRegistrationDeadline] = useState("")
  const [tags, setTags] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens, pre-fill from props when available
  useEffect(() => {
    if (open) {
      setTitle(propertyAddress || "")
      setDescription("")
      setStageId(stages.filter((s) => s.is_active)[0]?.id || "")
      setPriority("medium")
      setTargetBid("")
      setEstimatedValue(
        propertyEstimatedValue != null ? String(propertyEstimatedValue) : ""
      )
      setAuctionDate(propertyAuctionDate || "")
      setRegistrationDeadline("")
      setTags("")
      setErrors({})
    }
  }, [open, stages, propertyAddress, propertyAuctionDate, propertyEstimatedValue])

  // Validate form fields
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!title.trim() || title.trim().length < 2) {
      newErrors.title = "Title is required (min 2 characters)"
    }
    if (!stageId) {
      newErrors.stageId = "Please select a pipeline stage"
    }
    if (targetBid && isNaN(Number(targetBid))) {
      newErrors.targetBid = "Must be a valid number"
    }
    if (estimatedValue && isNaN(Number(estimatedValue))) {
      newErrors.estimatedValue = "Must be a valid number"
    }
    if (!currentOrganization?.id) {
      newErrors.organization = "No organization context. Please log in again."
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission - calls real POST /api/deal-pipeline
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      // Build the request body matching CreateDealRequest
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const body: CreateDealRequest = {
        organization_id: currentOrganization!.id,
        title: title.trim(),
        current_stage_id: stageId,
        priority: priority as CreateDealRequest["priority"],
        ...(propertyId ? { property_id: propertyId } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(targetBid ? { target_bid_amount: Number(targetBid) } : {}),
        ...(estimatedValue ? { estimated_value: Number(estimatedValue) } : {}),
        ...(auctionDate ? { auction_date: auctionDate } : {}),
        ...(registrationDeadline
          ? { registration_deadline: registrationDeadline }
          : {}),
        ...(parsedTags.length > 0 ? { tags: parsedTags } : {}),
      }

      const response = await fetch("/api/deal-pipeline", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || errorData.error || "Failed to create deal"
        )
      }

      toast.success("Deal created successfully")
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create deal"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset all form fields
  const resetForm = () => {
    setTitle("")
    setDescription("")
    setStageId(stages.filter((s) => s.is_active)[0]?.id || "")
    setPriority("medium")
    setTargetBid("")
    setEstimatedValue("")
    setAuctionDate("")
    setRegistrationDeadline("")
    setTags("")
    setErrors({})
  }

  // Handle dialog open/close with form reset
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const activeStages = stages.filter((s) => s.is_active)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Deal</DialogTitle>
            <DialogDescription>
              Add a property to your deal pipeline
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            {/* Title - required */}
            <div className="space-y-1.5">
              <Label htmlFor="deal-title">
                Property Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="deal-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (errors.title) {
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.title
                      return next
                    })
                  }
                }}
                placeholder="123 Main St, Altoona PA"
              />
              {errors.title && (
                <p className="text-xs text-red-500">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="deal-description">Description</Label>
              <textarea
                id="deal-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes about this property..."
                className={cn(
                  "flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm",
                  "placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-slate-950 focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-400",
                  "dark:focus-visible:ring-slate-300 min-h-[80px] resize-none"
                )}
              />
            </div>

            {/* Stage + Priority row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="deal-stage">
                  Pipeline Stage <span className="text-red-500">*</span>
                </Label>
                <select
                  id="deal-stage"
                  value={stageId}
                  onChange={(e) => {
                    setStageId(e.target.value)
                    if (errors.stageId) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.stageId
                        return next
                      })
                    }
                  }}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-slate-300"
                  )}
                >
                  <option value="">Select stage...</option>
                  {activeStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
                {errors.stageId && (
                  <p className="text-xs text-red-500">{errors.stageId}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal-priority">Priority</Label>
                <select
                  id="deal-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-slate-300"
                  )}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Financial row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="deal-target-bid">Target Bid ($)</Label>
                <Input
                  id="deal-target-bid"
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetBid}
                  onChange={(e) => {
                    setTargetBid(e.target.value)
                    if (errors.targetBid) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.targetBid
                        return next
                      })
                    }
                  }}
                  placeholder="45000"
                />
                {errors.targetBid && (
                  <p className="text-xs text-red-500">{errors.targetBid}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal-estimated-value">
                  Estimated Value ($)
                </Label>
                <Input
                  id="deal-estimated-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedValue}
                  onChange={(e) => {
                    setEstimatedValue(e.target.value)
                    if (errors.estimatedValue) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.estimatedValue
                        return next
                      })
                    }
                  }}
                  placeholder="85000"
                />
                {errors.estimatedValue && (
                  <p className="text-xs text-red-500">
                    {errors.estimatedValue}
                  </p>
                )}
              </div>
            </div>

            {/* Dates row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="deal-auction-date">Auction Date</Label>
                <Input
                  id="deal-auction-date"
                  type="date"
                  value={auctionDate}
                  onChange={(e) => setAuctionDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal-reg-deadline">
                  Registration Deadline
                </Label>
                <Input
                  id="deal-reg-deadline"
                  type="date"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                />
              </div>
            </div>

            {/* Organization error */}
            {errors.organization && (
              <p className="text-xs text-red-500">{errors.organization}</p>
            )}

            {/* Tags */}
            <div className="space-y-1.5">
              <Label htmlFor="deal-tags">Tags (comma separated)</Label>
              <Input
                id="deal-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="residential, renovation, good-condition"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Deal"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateDealDialog
