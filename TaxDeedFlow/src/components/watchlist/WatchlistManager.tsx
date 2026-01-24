"use client"

import { useState, useEffect } from "react"
import {
  Heart,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Hash,
  ChevronDown,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

// Watchlist summary type (from vw_watchlist_summary view)
export interface WatchlistSummary {
  watchlist_id: string
  user_id: string
  name: string
  description: string | null
  color: string
  item_count: number
  urgent_count: number
  high_count: number
  medium_count: number
  low_count: number
  next_auction_date: string | null
  created_at: string
  updated_at: string
}

interface WatchlistManagerProps {
  activeWatchlistId: string | null
  onSelectWatchlist: (watchlistId: string | null) => void
  onCreateWatchlist?: () => void
  onEditWatchlist?: (watchlist: WatchlistSummary) => void
  onDeleteWatchlist?: (watchlistId: string) => void
  className?: string
}

export function WatchlistManager({
  activeWatchlistId,
  onSelectWatchlist,
  onCreateWatchlist,
  onEditWatchlist,
  onDeleteWatchlist,
  className = "",
}: WatchlistManagerProps) {
  const { user } = useAuth()
  const [watchlists, setWatchlists] = useState<WatchlistSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch watchlists from API
  const fetchWatchlists = async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/watchlist", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to fetch watchlists")
      }

      const result = await response.json()
      setWatchlists(result.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load watchlists"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Load watchlists on mount and when user changes
  useEffect(() => {
    fetchWatchlists()
  }, [user?.id])

  // Handle delete watchlist
  const handleDelete = async (watchlistId: string, watchlistName: string) => {
    if (!confirm(`Are you sure you want to delete "${watchlistName}"? This will remove all properties from this watchlist.`)) {
      return
    }

    setDeletingId(watchlistId)

    try {
      const response = await fetch(`/api/watchlist/${watchlistId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete watchlist")
      }

      toast.success(`Watchlist "${watchlistName}" deleted successfully`)

      // Refresh watchlists
      await fetchWatchlists()

      // If deleted watchlist was active, clear selection
      if (activeWatchlistId === watchlistId) {
        onSelectWatchlist(null)
      }

      // Call parent callback if provided
      if (onDeleteWatchlist) {
        onDeleteWatchlist(watchlistId)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete watchlist"
      toast.error(errorMessage)
    } finally {
      setDeletingId(null)
    }
  }

  // Get active watchlist
  const activeWatchlist = watchlists.find(w => w.watchlist_id === activeWatchlistId)

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No upcoming auctions"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-slate-200 p-4 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading watchlists...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-4 ${className}`}>
        <div className="flex items-start gap-2 text-red-600">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Failed to load watchlists</p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
            <button
              onClick={fetchWatchlists}
              className="text-xs text-red-600 underline mt-2 hover:text-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-slate-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-slate-900">Watchlists</h2>
            <span className="text-xs text-slate-500">({watchlists.length})</span>
          </div>
          {onCreateWatchlist && (
            <button
              onClick={onCreateWatchlist}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
          )}
        </div>
      </div>

      {/* Active watchlist selector */}
      {watchlists.length > 0 && (
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:border-slate-400 transition-colors"
            >
              <span className="text-slate-700 truncate">
                {activeWatchlist ? activeWatchlist.name : "All Properties"}
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                <button
                  onClick={() => {
                    onSelectWatchlist(null)
                    setIsDropdownOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                    !activeWatchlistId ? "bg-primary/10 text-primary font-medium" : "text-slate-700"
                  }`}
                >
                  All Properties
                </button>
                {watchlists.map((watchlist) => (
                  <button
                    key={watchlist.watchlist_id}
                    onClick={() => {
                      onSelectWatchlist(watchlist.watchlist_id)
                      setIsDropdownOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                      activeWatchlistId === watchlist.watchlist_id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: watchlist.color }}
                        />
                        <span className="truncate">{watchlist.name}</span>
                      </div>
                      <span className="text-xs text-slate-500 ml-2">
                        {watchlist.item_count}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Watchlist list */}
      <div className="divide-y divide-slate-200">
        {watchlists.length === 0 ? (
          <div className="p-8 text-center">
            <Heart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-1">No watchlists yet</p>
            <p className="text-xs text-slate-500 mb-4">
              Create a watchlist to organize your properties
            </p>
            {onCreateWatchlist && (
              <button
                onClick={onCreateWatchlist}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Create Watchlist
              </button>
            )}
          </div>
        ) : (
          watchlists.map((watchlist) => (
            <div
              key={watchlist.watchlist_id}
              className={`p-4 hover:bg-slate-50 transition-colors ${
                activeWatchlistId === watchlist.watchlist_id ? "bg-primary/5" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => onSelectWatchlist(watchlist.watchlist_id)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: watchlist.color }}
                    />
                    <h3 className="font-medium text-slate-900 truncate">
                      {watchlist.name}
                    </h3>
                  </div>
                  {watchlist.description && (
                    <p className="text-xs text-slate-500 mb-2 line-clamp-2">
                      {watchlist.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      <span>{watchlist.item_count} {watchlist.item_count === 1 ? "property" : "properties"}</span>
                    </div>
                    {watchlist.next_auction_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(watchlist.next_auction_date)}</span>
                      </div>
                    )}
                  </div>
                  {(watchlist.urgent_count > 0 || watchlist.high_count > 0) && (
                    <div className="flex items-center gap-2 mt-2">
                      {watchlist.urgent_count > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          {watchlist.urgent_count} Urgent
                        </span>
                      )}
                      {watchlist.high_count > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          {watchlist.high_count} High
                        </span>
                      )}
                    </div>
                  )}
                </button>

                {/* Action buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {onEditWatchlist && (
                    <button
                      onClick={() => onEditWatchlist(watchlist)}
                      className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      title="Edit watchlist"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                  {onDeleteWatchlist && (
                    <button
                      onClick={() => handleDelete(watchlist.watchlist_id, watchlist.name)}
                      disabled={deletingId === watchlist.watchlist_id}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Delete watchlist"
                    >
                      {deletingId === watchlist.watchlist_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
