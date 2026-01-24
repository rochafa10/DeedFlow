"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Heart,
  Trash2,
  DollarSign,
  MapPin,
  Building2,
  ExternalLink,
  Search,
  Edit2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  FileText,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { WatchlistManager, WatchlistSummary } from "@/components/watchlist/WatchlistManager"
import { CreateListModal } from "@/components/watchlist/CreateListModal"
import { toast } from "sonner"
import { runMigrationWithFeedback } from "@/lib/watchlist/migrate-localStorage"

// Watchlist item type from API
interface WatchlistItem {
  id: string
  watchlist_id: string
  property_id: string
  max_bid: number | null
  notes: string | null
  created_at: string
  updated_at: string
  properties: {
    id: string
    parcel_id: string
    property_address: string
    total_due: number
    county_id: string
    sale_date: string | null
    auction_status: string | null
  }
  watchlists: {
    id: string
    name: string
    user_id: string
  }
}

export default function WatchlistPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()

  // Watchlist management state
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWatchlist, setEditingWatchlist] = useState<WatchlistSummary | null>(null)
  const [watchlistsKey, setWatchlistsKey] = useState(0) // For refreshing WatchlistManager

  // Watchlist items state
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)

  // UI state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("addedAt-desc")
  const [editingMaxBid, setEditingMaxBid] = useState<string | null>(null)
  const [tempMaxBid, setTempMaxBid] = useState("")
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Run localStorage migration on first mount
  useEffect(() => {
    if (user?.id) {
      runMigrationWithFeedback()
    }
  }, [user?.id])

  // Fetch watchlist items when active watchlist changes
  useEffect(() => {
    if (user?.id) {
      fetchWatchlistItems()
    }
  }, [activeWatchlistId, user?.id])

  // Fetch watchlist items from API
  const fetchWatchlistItems = async () => {
    if (!user?.id) {
      setWatchlistItems([])
      return
    }

    setIsLoadingItems(true)
    setItemsError(null)

    try {
      // If no active watchlist, show all items
      const url = activeWatchlistId
        ? `/api/watchlist/items?watchlist_id=${activeWatchlistId}`
        : "/api/watchlist/items"

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to fetch watchlist items")
      }

      const result = await response.json()
      setWatchlistItems(result.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load watchlist items"
      setItemsError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoadingItems(false)
    }
  }

  // Handle create watchlist
  const handleCreateWatchlist = () => {
    setEditingWatchlist(null)
    setIsModalOpen(true)
  }

  // Handle edit watchlist
  const handleEditWatchlist = (watchlist: WatchlistSummary) => {
    setEditingWatchlist(watchlist)
    setIsModalOpen(true)
  }

  // Handle watchlist modal success
  const handleModalSuccess = () => {
    // Refresh watchlists
    setWatchlistsKey(prev => prev + 1)
    // Refresh items if we edited the active watchlist
    if (editingWatchlist && editingWatchlist.watchlist_id === activeWatchlistId) {
      fetchWatchlistItems()
    }
  }

  // Handle delete watchlist
  const handleDeleteWatchlist = (watchlistId: string) => {
    // Refresh watchlists after delete
    setWatchlistsKey(prev => prev + 1)
    // If deleted watchlist was active, items will be refreshed by useEffect
  }

  // Remove item from watchlist
  const removeFromWatchlist = async (itemId: string) => {
    if (!user?.id) return

    if (!confirm("Are you sure you want to remove this property from the watchlist?")) {
      return
    }

    setDeletingItemId(itemId)

    try {
      const response = await fetch(`/api/watchlist/items/${itemId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to remove property")
      }

      toast.success("Property removed from watchlist")

      // Refresh items and watchlists (to update counts)
      await fetchWatchlistItems()
      setWatchlistsKey(prev => prev + 1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to remove property"
      toast.error(errorMessage)
    } finally {
      setDeletingItemId(null)
    }
  }

  // Update max bid
  const updateMaxBid = async (itemId: string) => {
    if (!user?.id) return

    const bid = tempMaxBid ? parseFloat(tempMaxBid) : null

    setUpdatingItemId(itemId)

    try {
      const response = await fetch(`/api/watchlist/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          max_bid: bid,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update max bid")
      }

      toast.success("Max bid updated successfully")

      // Update local state
      setWatchlistItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, max_bid: bid } : item
        )
      )

      setEditingMaxBid(null)
      setTempMaxBid("")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update max bid"
      toast.error(errorMessage)
    } finally {
      setUpdatingItemId(null)
    }
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Filter watchlist items by search term
  const filteredItems = watchlistItems.filter(
    (item) =>
      item.properties.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.properties.parcel_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort filtered items
  const sortedAndFilteredItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case "totalDue-desc":
        return (b.properties.total_due || 0) - (a.properties.total_due || 0)
      case "totalDue-asc":
        return (a.properties.total_due || 0) - (b.properties.total_due || 0)
      case "saleDate-asc":
        if (!a.properties.sale_date) return 1
        if (!b.properties.sale_date) return -1
        return new Date(a.properties.sale_date).getTime() - new Date(b.properties.sale_date).getTime()
      case "addedAt-desc":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  // Calculate total potential investment
  const totalPotentialInvestment = watchlistItems.reduce(
    (sum, item) => sum + (item.max_bid || 0),
    0
  )

  // Calculate total minimum due
  const totalMinimumDue = watchlistItems.reduce(
    (sum, item) => sum + (item.properties.total_due || 0),
    0
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar - Watchlist Manager */}
          <aside className="lg:col-span-1">
            <WatchlistManager
              key={watchlistsKey}
              activeWatchlistId={activeWatchlistId}
              onSelectWatchlist={setActiveWatchlistId}
              onCreateWatchlist={handleCreateWatchlist}
              onEditWatchlist={handleEditWatchlist}
              onDeleteWatchlist={handleDeleteWatchlist}
            />

            {/* Summary stats */}
            {watchlistItems.length > 0 && (
              <div className="mt-6 bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Summary</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Total Properties</div>
                    <div className="text-lg font-semibold text-slate-900">
                      {watchlistItems.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Total Due</div>
                    <div className="text-lg font-semibold text-slate-900">
                      ${totalMinimumDue.toLocaleString()}
                    </div>
                  </div>
                  {totalPotentialInvestment > 0 && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Max Bid Total</div>
                      <div className="text-lg font-semibold text-primary">
                        ${totalPotentialInvestment.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Main content area */}
          <div className="lg:col-span-3">
            {/* Header */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      {activeWatchlistId
                        ? "Watchlist Properties"
                        : "All Watched Properties"}
                    </h1>
                    <p className="text-sm text-slate-600">
                      {sortedAndFilteredItems.length} {sortedAndFilteredItems.length === 1 ? "property" : "properties"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by address or parcel ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="addedAt-desc">Recently Added</option>
                  <option value="totalDue-desc">Amount Due (High to Low)</option>
                  <option value="totalDue-asc">Amount Due (Low to High)</option>
                  <option value="saleDate-asc">Sale Date (Soonest First)</option>
                </select>
              </div>
            </div>

            {/* Loading state */}
            {isLoadingItems && (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-slate-600">Loading properties...</p>
              </div>
            )}

            {/* Error state */}
            {itemsError && (
              <div className="bg-white rounded-lg border border-red-200 p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-900 mb-1">
                      Failed to load properties
                    </h3>
                    <p className="text-sm text-red-600 mb-3">{itemsError}</p>
                    <button
                      onClick={fetchWatchlistItems}
                      className="text-sm text-red-600 underline hover:text-red-700"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!isLoadingItems && !itemsError && sortedAndFilteredItems.length === 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <Heart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {searchTerm ? "No matching properties" : "No properties in watchlist"}
                </h3>
                <p className="text-slate-600 mb-6">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Start adding properties to your watchlist from the properties page"}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => router.push("/properties")}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    <Building2 className="h-5 w-5" />
                    Browse Properties
                  </button>
                )}
              </div>
            )}

            {/* Property list */}
            {!isLoadingItems && !itemsError && sortedAndFilteredItems.length > 0 && (
              <div className="space-y-4">
                {sortedAndFilteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Property info */}
                      <div className="flex-1 min-w-0">
                        {/* Address and parcel */}
                        <div className="mb-3">
                          <h3 className="text-lg font-semibold text-slate-900 mb-1">
                            {item.properties.property_address || "Address not available"}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>{item.properties.parcel_id}</span>
                            </div>
                            {item.properties.sale_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {new Date(item.properties.sale_date).toLocaleDateString(
                                    "en-US",
                                    { month: "short", day: "numeric", year: "numeric" }
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Financial info */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                          <div>
                            <div className="text-xs text-slate-500 mb-1">Amount Due</div>
                            <div className="text-lg font-semibold text-slate-900">
                              ${item.properties.total_due?.toLocaleString() || "0"}
                            </div>
                          </div>

                          {/* Max Bid */}
                          <div>
                            <div className="text-xs text-slate-500 mb-1">Max Bid</div>
                            {editingMaxBid === item.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={tempMaxBid}
                                  onChange={(e) => setTempMaxBid(e.target.value)}
                                  placeholder="0"
                                  className="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                                  disabled={updatingItemId === item.id}
                                />
                                <button
                                  onClick={() => updateMaxBid(item.id)}
                                  disabled={updatingItemId === item.id}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                  title="Save"
                                >
                                  {updatingItemId === item.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingMaxBid(null)
                                    setTempMaxBid("")
                                  }}
                                  disabled={updatingItemId === item.id}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold text-primary">
                                  {item.max_bid ? `$${item.max_bid.toLocaleString()}` : "Not set"}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingMaxBid(item.id)
                                    setTempMaxBid(item.max_bid?.toString() || "")
                                  }}
                                  className="p-1 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                  title="Edit max bid"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Status */}
                          <div>
                            <div className="text-xs text-slate-500 mb-1">Status</div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {item.properties.auction_status || "Upcoming"}
                            </span>
                          </div>
                        </div>

                        {/* Notes */}
                        {item.notes && (
                          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                            <div className="text-xs text-slate-500 mb-1">Notes</div>
                            <p className="text-sm text-slate-700">{item.notes}</p>
                          </div>
                        )}

                        {/* Watchlist badge (only show when viewing all properties) */}
                        {!activeWatchlistId && (
                          <div className="text-xs text-slate-500">
                            In: <span className="font-medium">{item.watchlists.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <a
                          href={`/properties/${item.property_id}`}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View
                        </a>
                        <button
                          onClick={() => removeFromWatchlist(item.id)}
                          disabled={deletingItemId === item.id}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deletingItemId === item.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Removing...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create/Edit Watchlist Modal */}
      <CreateListModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        editingWatchlist={editingWatchlist}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
