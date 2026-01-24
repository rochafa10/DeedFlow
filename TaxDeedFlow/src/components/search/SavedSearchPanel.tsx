"use client"

import { useState, useEffect } from "react"
import { authGet, authPost, authPut, authDelete } from "@/lib/api/authFetch"
import { SavedSearch, SavedSearchInput, SavedSearchesResponse, FilterCriteria } from "@/types/search"
import {
  Star,
  Trash2,
  Loader2,
  BookmarkPlus,
  AlertTriangle,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/utils"

interface SavedSearchPanelProps {
  /** Current filter criteria to save */
  currentFilters: FilterCriteria
  /** Callback when a saved search is loaded */
  onLoadSearch: (search: SavedSearch) => void
  /** Optional class name for styling */
  className?: string
}

/**
 * SavedSearchPanel Component
 *
 * Displays a list of user's saved searches with the ability to:
 * - Load a saved search
 * - Save current filters as a new search
 * - Mark a search as default
 * - Delete saved searches
 *
 * @component
 */
export function SavedSearchPanel({
  currentFilters,
  onLoadSearch,
  className = "",
}: SavedSearchPanelProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [newSearchName, setNewSearchName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch saved searches on mount
  useEffect(() => {
    fetchSavedSearches()
  }, [])

  /**
   * Fetch saved searches from API
   */
  const fetchSavedSearches = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await authGet("/api/saved-searches")

      if (!response.ok) {
        throw new Error("Failed to fetch saved searches")
      }

      const result: SavedSearchesResponse = await response.json()
      // Transform date strings to Date objects
      const transformedSearches = result.searches.map((search) => ({
        ...search,
        createdAt: new Date(search.createdAt),
        updatedAt: new Date(search.updatedAt),
      }))
      setSavedSearches(transformedSearches)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved searches")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Save current filters as a new search
   */
  const handleSaveSearch = async () => {
    if (!newSearchName.trim()) {
      return
    }

    try {
      setIsSaving(true)
      const input: SavedSearchInput = {
        name: newSearchName.trim(),
        filterCriteria: currentFilters,
        isDefault: false,
      }

      const response = await authPost("/api/saved-searches", input)

      if (!response.ok) {
        throw new Error("Failed to save search")
      }

      // Refresh the list
      await fetchSavedSearches()

      // Close dialog and reset form
      setShowSaveDialog(false)
      setNewSearchName("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save search")
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Set a search as the default
   */
  const handleSetDefault = async (searchId: string) => {
    try {
      const response = await authPut(`/api/saved-searches/${searchId}`, {
        isDefault: true,
      })

      if (!response.ok) {
        throw new Error("Failed to set default search")
      }

      // Refresh the list
      await fetchSavedSearches()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set default search")
    }
  }

  /**
   * Delete a saved search
   */
  const handleDeleteSearch = async (searchId: string) => {
    try {
      setIsDeleting(true)
      const response = await authDelete(`/api/saved-searches/${searchId}`)

      if (!response.ok) {
        throw new Error("Failed to delete search")
      }

      // Refresh the list
      await fetchSavedSearches()
      setDeleteConfirmId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete search")
    } finally {
      setIsDeleting(false)
    }
  }

  /**
   * Load a saved search
   */
  const handleLoadSearch = (search: SavedSearch) => {
    onLoadSearch(search)
  }

  return (
    <div className={className}>
      {/* Header with Save Button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Saved Searches</h3>
        <Button
          onClick={() => setShowSaveDialog(true)}
          size="sm"
          variant="outline"
        >
          <BookmarkPlus className="h-4 w-4 mr-2" />
          Save Current
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-3 mb-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">{error}</div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && savedSearches.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-slate-500 text-sm mb-3">No saved searches yet</p>
          <p className="text-slate-400 text-xs">
            Save your current filters for quick access later
          </p>
        </Card>
      )}

      {/* Saved Searches List */}
      {!isLoading && savedSearches.length > 0 && (
        <div className="space-y-2">
          {savedSearches.map((search) => (
            <Card
              key={search.id}
              className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                deleteConfirmId === search.id ? "border-red-300 bg-red-50" : ""
              }`}
            >
              {deleteConfirmId === search.id ? (
                // Delete Confirmation
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">
                      Delete this search?
                    </p>
                    <p className="text-xs text-red-700">This cannot be undone</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDeleteSearch(search.id)}
                      disabled={isDeleting}
                      size="sm"
                      variant="destructive"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Delete"
                      )}
                    </Button>
                    <Button
                      onClick={() => setDeleteConfirmId(null)}
                      disabled={isDeleting}
                      size="sm"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // Normal Display
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleSetDefault(search.id)}
                    className="mt-0.5 flex-shrink-0"
                    title={search.isDefault ? "Default search" : "Set as default"}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        search.isDefault
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300 hover:text-amber-400"
                      }`}
                    />
                  </button>

                  <div
                    onClick={() => handleLoadSearch(search)}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {search.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Saved {formatDate(search.createdAt.toISOString())}
                    </p>

                    {/* Filter Summary */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {search.filterCriteria.scoreMin !== undefined && (
                        <span className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          Score: {search.filterCriteria.scoreMin}
                          {search.filterCriteria.scoreMax !== undefined &&
                            `-${search.filterCriteria.scoreMax}`}
                        </span>
                      )}
                      {search.filterCriteria.counties &&
                        search.filterCriteria.counties.length > 0 && (
                          <span className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {search.filterCriteria.counties.length} counties
                          </span>
                        )}
                      {search.filterCriteria.riskFactors && (
                        <span className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          Risk filters
                        </span>
                      )}
                      {search.filterCriteria.polygonCoords && (
                        <span className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          Map area
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirmId(search.id)
                    }}
                    className="flex-shrink-0 text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete search"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Search</DialogTitle>
            <DialogDescription>
              Give your search a name so you can quickly access it later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                placeholder="e.g., High Score Properties"
                value={newSearchName}
                onChange={(e) => setNewSearchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSearchName.trim()) {
                    handleSaveSearch()
                  }
                }}
              />
            </div>

            {/* Filter Preview */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs font-medium text-slate-700 mb-2">
                Current Filters:
              </p>
              <div className="flex flex-wrap gap-1">
                {currentFilters.scoreMin !== undefined && (
                  <span className="text-xs bg-white text-slate-700 px-2 py-1 rounded border">
                    Score: {currentFilters.scoreMin}
                    {currentFilters.scoreMax !== undefined &&
                      `-${currentFilters.scoreMax}`}
                  </span>
                )}
                {currentFilters.counties && currentFilters.counties.length > 0 && (
                  <span className="text-xs bg-white text-slate-700 px-2 py-1 rounded border">
                    Counties: {currentFilters.counties.join(", ")}
                  </span>
                )}
                {currentFilters.riskFactors && (
                  <span className="text-xs bg-white text-slate-700 px-2 py-1 rounded border">
                    Risk Filters: Active
                  </span>
                )}
                {currentFilters.polygonCoords && (
                  <span className="text-xs bg-white text-slate-700 px-2 py-1 rounded border">
                    Map Area: Selected
                  </span>
                )}
                {!currentFilters.scoreMin &&
                  !currentFilters.counties?.length &&
                  !currentFilters.riskFactors &&
                  !currentFilters.polygonCoords && (
                    <span className="text-xs text-slate-500 italic">
                      No filters applied
                    </span>
                  )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowSaveDialog(false)}
              variant="outline"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSearch}
              disabled={!newSearchName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Search"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
