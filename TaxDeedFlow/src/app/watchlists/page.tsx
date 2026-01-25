"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Bookmark,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Heart,
  Star,
  Folder,
  Calendar,
  MapPin,
  Building2,
  Loader2,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { formatDate } from "@/lib/utils"

// Watchlist type
interface Watchlist {
  id: string
  userId: string
  name: string
  description: string
  color: string
  icon: string
  propertyCount: number
  totalValue: number
  createdAt: string
  updatedAt: string
  isDefault?: boolean
}

// Get user-specific watchlists key
const getWatchlistsKey = (userId: string): string => {
  return `watchlists_${userId}`
}

// Get watchlists from localStorage for a specific user
const getWatchlists = (userId: string | undefined): Watchlist[] => {
  if (typeof window === "undefined" || !userId) return []
  const key = getWatchlistsKey(userId)
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : []
}

// Save watchlists to localStorage for a specific user
const saveWatchlists = (userId: string, watchlists: Watchlist[]) => {
  const key = getWatchlistsKey(userId)
  localStorage.setItem(key, JSON.stringify(watchlists))
}

// Color options
const COLORS = [
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "red", label: "Red", class: "bg-red-500" },
]

// Icon options
const ICONS = [
  { value: "heart", label: "Heart", icon: Heart },
  { value: "star", label: "Star", icon: Star },
  { value: "bookmark", label: "Bookmark", icon: Bookmark },
  { value: "folder", label: "Folder", icon: Folder },
  { value: "building", label: "Building", icon: Building2 },
  { value: "map", label: "Map", icon: MapPin },
]

export default function WatchlistsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newWatchlist, setNewWatchlist] = useState({
    name: "",
    description: "",
    color: "blue",
    icon: "bookmark",
  })

  // Load watchlists from localStorage for current user
  useEffect(() => {
    if (user?.id) {
      const userWatchlists = getWatchlists(user.id)

      // Create default watchlist if none exist
      if (userWatchlists.length === 0) {
        const defaultWatchlist: Watchlist = {
          id: crypto.randomUUID(),
          userId: user.id,
          name: "My Watchlist",
          description: "Default watchlist for tracking properties",
          color: "blue",
          icon: "bookmark",
          propertyCount: 0,
          totalValue: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDefault: true,
        }
        const initialWatchlists = [defaultWatchlist]
        saveWatchlists(user.id, initialWatchlists)
        setWatchlists(initialWatchlists)
      } else {
        setWatchlists(userWatchlists)
      }
    }
  }, [user?.id])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Filter watchlists
  const filteredWatchlists = watchlists.filter((w) =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle create watchlist
  const handleCreateWatchlist = () => {
    if (!user?.id || !newWatchlist.name.trim()) return

    const watchlist: Watchlist = {
      id: crypto.randomUUID(),
      userId: user.id,
      name: newWatchlist.name.trim(),
      description: newWatchlist.description.trim(),
      color: newWatchlist.color,
      icon: newWatchlist.icon,
      propertyCount: 0,
      totalValue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const updated = [...watchlists, watchlist]
    setWatchlists(updated)
    saveWatchlists(user.id, updated)

    // Reset form
    setNewWatchlist({
      name: "",
      description: "",
      color: "blue",
      icon: "bookmark",
    })
    setShowCreateModal(false)
  }

  // Handle delete watchlist
  const handleDeleteWatchlist = (id: string) => {
    if (!user?.id) return

    const watchlist = watchlists.find(w => w.id === id)
    if (watchlist?.isDefault) {
      alert("Cannot delete default watchlist")
      return
    }

    if (!confirm("Are you sure you want to delete this watchlist?")) return

    const updated = watchlists.filter((w) => w.id !== id)
    setWatchlists(updated)
    saveWatchlists(user.id, updated)
  }

  // Handle update watchlist
  const handleUpdateWatchlist = (id: string, updates: Partial<Watchlist>) => {
    if (!user?.id) return

    const updated = watchlists.map((w) =>
      w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
    )
    setWatchlists(updated)
    saveWatchlists(user.id, updated)
    setEditingId(null)
  }

  // Get icon component
  const getIconComponent = (iconValue: string) => {
    const iconConfig = ICONS.find((i) => i.value === iconValue)
    return iconConfig ? iconConfig.icon : Bookmark
  }

  // Get color class
  const getColorClass = (colorValue: string) => {
    const colorConfig = COLORS.find((c) => c.value === colorValue)
    return colorConfig ? colorConfig.class : "bg-blue-500"
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Watchlists</h1>
              <p className="text-blue-100">Organize your property interests</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              <Plus className="h-5 w-5" />
              New Watchlist
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search watchlists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Watchlist cards */}
        {filteredWatchlists.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <Bookmark className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">
              {searchTerm ? "No watchlists found" : "No watchlists yet"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first watchlist
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWatchlists.map((watchlist) => {
              const IconComponent = getIconComponent(watchlist.icon)
              const colorClass = getColorClass(watchlist.color)

              return (
                <div
                  key={watchlist.id}
                  className="bg-white rounded-lg border border-slate-200 hover:shadow-lg transition-shadow overflow-hidden group"
                >
                  {/* Card header with color bar */}
                  <div className={`h-2 ${colorClass}`} />

                  {/* Card content */}
                  <div className="p-6">
                    {/* Icon and actions */}
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
                        <IconComponent className={`h-6 w-6 ${colorClass.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingId(watchlist.id)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {!watchlist.isDefault && (
                          <button
                            onClick={() => handleDeleteWatchlist(watchlist.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Watchlist info */}
                    <div
                      className="cursor-pointer"
                      onClick={() => router.push(`/watchlists/${watchlist.id}`)}
                    >
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        {watchlist.name}
                        {watchlist.isDefault && (
                          <span className="ml-2 text-xs font-normal text-slate-500">(Default)</span>
                        )}
                      </h3>
                      <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                        {watchlist.description || "No description"}
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div>
                          <div className="text-2xl font-bold text-slate-900">
                            {watchlist.propertyCount}
                          </div>
                          <div className="text-xs text-slate-500">Properties</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-slate-900">
                            ${(watchlist.totalValue / 1000).toFixed(0)}K
                          </div>
                          <div className="text-xs text-slate-500">Total Value</div>
                        </div>
                      </div>

                      {/* Created date */}
                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="h-3 w-3" />
                        Created {formatDate(watchlist.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create watchlist modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Create Watchlist</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newWatchlist.name}
                  onChange={(e) =>
                    setNewWatchlist({ ...newWatchlist, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="High Priority Properties"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newWatchlist.description}
                  onChange={(e) =>
                    setNewWatchlist({ ...newWatchlist, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Properties I'm seriously considering..."
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() =>
                        setNewWatchlist({ ...newWatchlist, color: color.value })
                      }
                      className={`w-10 h-10 rounded-lg ${color.class} ${
                        newWatchlist.color === color.value
                          ? "ring-2 ring-offset-2 ring-slate-900"
                          : ""
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Icon
                </label>
                <div className="flex gap-2">
                  {ICONS.map((icon) => {
                    const IconComp = icon.icon
                    return (
                      <button
                        key={icon.value}
                        onClick={() =>
                          setNewWatchlist({ ...newWatchlist, icon: icon.value })
                        }
                        className={`p-3 rounded-lg border ${
                          newWatchlist.icon === icon.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <IconComp className="h-5 w-5" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWatchlist}
                disabled={!newWatchlist.name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
