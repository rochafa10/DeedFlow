"use client"

import { useState, useEffect, useRef } from "react"
import { Heart, Check, Loader2, Plus, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

interface Watchlist {
  watchlist_id: string
  name: string
  color: string
  item_count: number
}

interface AddToWatchlistButtonProps {
  propertyId: string
  variant?: "default" | "icon"
  size?: "sm" | "md" | "lg"
  className?: string
  onAdded?: (watchlistId: string, watchlistName: string) => void
}

export function AddToWatchlistButton({
  propertyId,
  variant = "default",
  size = "md",
  className = "",
  onAdded,
}: AddToWatchlistButtonProps) {
  const { user, isAuthenticated } = useAuth()
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingWatchlists, setIsFetchingWatchlists] = useState(false)
  const [addingToWatchlist, setAddingToWatchlist] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch watchlists when dropdown opens
  const fetchWatchlists = async () => {
    if (!isAuthenticated || !user?.id) {
      toast.error("Please log in to use watchlists")
      return
    }

    setIsFetchingWatchlists(true)
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

      if (result.data?.length === 0) {
        setError("No watchlists available. Create one first!")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load watchlists"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsFetchingWatchlists(false)
    }
  }

  // Toggle dropdown
  const toggleDropdown = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to use watchlists")
      return
    }

    if (!isDropdownOpen) {
      await fetchWatchlists()
    }
    setIsDropdownOpen(!isDropdownOpen)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isDropdownOpen])

  // Add property to watchlist
  const addToWatchlist = async (watchlistId: string, watchlistName: string) => {
    setAddingToWatchlist(watchlistId)

    try {
      const response = await fetch("/api/watchlist/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          watchlist_id: watchlistId,
          property_id: propertyId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Handle 409 conflict (property already in watchlist)
        if (response.status === 409) {
          toast.info(`Property is already in "${watchlistName}"`)
          setIsDropdownOpen(false)
          return
        }

        throw new Error(errorData.message || "Failed to add property to watchlist")
      }

      toast.success(`Added to "${watchlistName}"`)
      setIsDropdownOpen(false)

      // Call parent callback if provided
      if (onAdded) {
        onAdded(watchlistId, watchlistName)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add property"
      toast.error(errorMessage)
    } finally {
      setAddingToWatchlist(null)
    }
  }

  // Size classes
  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
  }

  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  // Button content
  const renderButton = () => {
    if (variant === "icon") {
      return (
        <button
          onClick={toggleDropdown}
          disabled={isLoading}
          className={`inline-flex items-center justify-center ${sizeClasses[size]} text-slate-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          title="Add to watchlist"
        >
          {isLoading ? (
            <Loader2 className={`${iconSizeClasses[size]} animate-spin`} />
          ) : (
            <Heart className={iconSizeClasses[size]} />
          )}
        </button>
      )
    }

    return (
      <button
        onClick={toggleDropdown}
        disabled={isLoading}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            <Heart className="h-4 w-4" />
            <span>Add to Watchlist</span>
          </>
        )}
      </button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {renderButton()}

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <div className="absolute z-50 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden right-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-900">Add to Watchlist</h3>
          </div>

          {/* Loading state */}
          {isFetchingWatchlists && (
            <div className="px-4 py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-slate-600">Loading watchlists...</p>
            </div>
          )}

          {/* Error state */}
          {!isFetchingWatchlists && error && (
            <div className="px-4 py-8 text-center">
              <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-slate-600 mb-3">{error}</p>
              {watchlists.length === 0 && (
                <button
                  onClick={() => {
                    setIsDropdownOpen(false)
                    // Navigate to watchlist page to create one
                    window.location.href = "/watchlist"
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Watchlist
                </button>
              )}
            </div>
          )}

          {/* Watchlist list */}
          {!isFetchingWatchlists && !error && watchlists.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              {watchlists.map((watchlist) => (
                <button
                  key={watchlist.watchlist_id}
                  onClick={() => addToWatchlist(watchlist.watchlist_id, watchlist.name)}
                  disabled={addingToWatchlist === watchlist.watchlist_id}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: watchlist.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {watchlist.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {watchlist.item_count} {watchlist.item_count === 1 ? "property" : "properties"}
                        </p>
                      </div>
                    </div>
                    {addingToWatchlist === watchlist.watchlist_id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                    ) : (
                      <Check className="h-4 w-4 text-slate-400 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isFetchingWatchlists && !error && watchlists.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Heart className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-600 mb-3">No watchlists yet</p>
              <button
                onClick={() => {
                  setIsDropdownOpen(false)
                  window.location.href = "/watchlist"
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Watchlist
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
