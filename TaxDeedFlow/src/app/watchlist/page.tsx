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
  Filter,
  Edit2,
  Check,
  X,
  ShieldX,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"

// Watchlist item type
export interface WatchlistItem {
  id: string
  userId: string  // Track which user owns this item
  propertyId: string
  parcelId: string
  address: string
  city: string
  county: string
  state: string
  totalDue: number
  saleDate: string
  maxBid: number | null
  notes: string
  addedAt: string
}

// Get user-specific watchlist key
const getWatchlistKey = (userId: string): string => {
  return `watchlist_${userId}`
}

// Get watchlist from localStorage for a specific user
const getWatchlist = (userId: string | undefined): WatchlistItem[] => {
  if (typeof window === "undefined" || !userId) return []
  const key = getWatchlistKey(userId)
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : []
}

// Save watchlist to localStorage for a specific user
const saveWatchlist = (userId: string, items: WatchlistItem[]) => {
  const key = getWatchlistKey(userId)
  localStorage.setItem(key, JSON.stringify(items))
}

// Validate user owns the watchlist item
const validateOwnership = (item: WatchlistItem, userId: string): boolean => {
  return item.userId === userId
}

export default function WatchlistPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [editingMaxBid, setEditingMaxBid] = useState<string | null>(null)
  const [tempMaxBid, setTempMaxBid] = useState("")
  const [accessDenied, setAccessDenied] = useState(false)

  // Load watchlist from localStorage for current user
  useEffect(() => {
    if (user?.id) {
      const userWatchlist = getWatchlist(user.id)
      setWatchlist(userWatchlist)
    }
  }, [user?.id])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Check for URL parameter access attempt (e.g., /watchlist?itemId=xxx)
  useEffect(() => {
    if (!user?.id) return

    const params = new URLSearchParams(window.location.search)
    const itemId = params.get("itemId")

    if (itemId) {
      // Check if this item exists and belongs to current user
      const allItems = getWatchlist(user.id)
      const item = allItems.find((i) => i.id === itemId)

      if (!item) {
        // Item not found in user's watchlist - could be trying to access another user's item
        setAccessDenied(true)
        console.log("[Security] Access denied: Attempted to access watchlist item that doesn't belong to user")
      }
    }
  }, [user?.id])

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

  // Show access denied if trying to access another user's data
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <ShieldX className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Access Denied
            </h2>
            <p className="text-slate-600 mb-4">
              You don't have permission to access this watchlist item. You can only view items in your own watchlist.
            </p>
            <button
              onClick={() => {
                setAccessDenied(false)
                router.push("/watchlist")
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Heart className="h-4 w-4" />
              View My Watchlist
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Filter watchlist by search term
  const filteredWatchlist = watchlist.filter(
    (item) =>
      item.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.parcelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.county.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.city.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Remove item from watchlist (only if owned by current user)
  const removeFromWatchlist = (id: string) => {
    if (!user?.id) return

    const itemToRemove = watchlist.find((item) => item.id === id)
    if (!itemToRemove || !validateOwnership(itemToRemove, user.id)) {
      console.log("[Security] Attempted to remove item not owned by user")
      return
    }

    const updated = watchlist.filter((item) => item.id !== id)
    setWatchlist(updated)
    saveWatchlist(user.id, updated)
  }

  // Update max bid (only if owned by current user)
  const updateMaxBid = (id: string) => {
    if (!user?.id) return

    const itemToUpdate = watchlist.find((item) => item.id === id)
    if (!itemToUpdate || !validateOwnership(itemToUpdate, user.id)) {
      console.log("[Security] Attempted to update item not owned by user")
      return
    }

    const bid = tempMaxBid ? parseFloat(tempMaxBid) : null
    const updated = watchlist.map((item) =>
      item.id === id ? { ...item, maxBid: bid } : item
    )
    setWatchlist(updated)
    saveWatchlist(user.id, updated)
    setEditingMaxBid(null)
    setTempMaxBid("")
  }

  // Calculate total potential investment
  const totalPotentialInvestment = watchlist.reduce(
    (sum, item) => sum + (item.maxBid || item.totalDue),
    0
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Heart className="h-6 w-6 text-red-500" />
            Watchlist
          </h1>
          <p className="text-slate-600 mt-1">
            Properties you're tracking for upcoming auctions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Properties</span>
              <Heart className="h-5 w-5 text-red-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {watchlist.length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Potential Investment</span>
              <DollarSign className="h-5 w-5 text-green-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              ${totalPotentialInvestment.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">With Max Bid Set</span>
              <Building2 className="h-5 w-5 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {watchlist.filter((item) => item.maxBid !== null).length}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by address, parcel ID, or county..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Watchlist Table */}
        {filteredWatchlist.length > 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      County
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Total Due
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Max Bid
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Sale Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWatchlist.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-slate-900 truncate max-w-xs">
                            {item.parcelId}
                          </div>
                          <div className="text-sm text-slate-500 truncate max-w-xs">
                            {item.address}
                          </div>
                          <div className="text-xs text-slate-400">
                            {item.city}, {item.state}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{item.county}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">
                            {item.totalDue.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {editingMaxBid === item.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">$</span>
                            <input
                              type="number"
                              value={tempMaxBid}
                              onChange={(e) => setTempMaxBid(e.target.value)}
                              className="w-24 px-2 py-1 border border-slate-200 rounded text-sm"
                              placeholder="0.00"
                              autoFocus
                            />
                            <button
                              onClick={() => updateMaxBid(item.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingMaxBid(null)
                                setTempMaxBid("")
                              }}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {item.maxBid !== null ? (
                              <span className="text-sm font-medium text-green-600">
                                ${item.maxBid.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400">Not set</span>
                            )}
                            <button
                              onClick={() => {
                                setEditingMaxBid(item.id)
                                setTempMaxBid(item.maxBid?.toString() || "")
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                              title="Edit max bid"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-700">{item.saleDate}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/properties/${item.propertyId}`}
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded"
                            title="View property"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => removeFromWatchlist(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Remove from watchlist"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Heart className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {searchTerm ? "No matching properties" : "Your watchlist is empty"}
            </h3>
            <p className="text-slate-500 mb-4">
              {searchTerm
                ? "Try a different search term"
                : "Add properties to your watchlist from the property detail page"}
            </p>
            {!searchTerm && (
              <a
                href="/properties"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Building2 className="h-4 w-4" />
                Browse Properties
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
