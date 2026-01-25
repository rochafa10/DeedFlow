"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Heart,
  Star,
  Bookmark,
  Folder,
  MapPin,
  Building2,
  DollarSign,
  Calendar,
  ExternalLink,
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
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

// Property type
interface WatchlistProperty {
  id: string
  watchlistId: string
  propertyId: string
  parcelId: string
  address: string
  city: string
  county: string
  state: string
  totalDue: number
  saleDate: string
  status: string
  validation: string | null
  maxBid: number | null
  notes: string
  addedAt: string
}

// Get user-specific watchlists key
const getWatchlistsKey = (userId: string): string => {
  return `watchlists_${userId}`
}

// Get watchlist properties key
const getWatchlistPropertiesKey = (userId: string, watchlistId: string): string => {
  return `watchlist_properties_${userId}_${watchlistId}`
}

// Get watchlists from localStorage
const getWatchlists = (userId: string | undefined): Watchlist[] => {
  if (typeof window === "undefined" || !userId) return []
  const key = getWatchlistsKey(userId)
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : []
}

// Save watchlists to localStorage
const saveWatchlists = (userId: string, watchlists: Watchlist[]) => {
  const key = getWatchlistsKey(userId)
  localStorage.setItem(key, JSON.stringify(watchlists))
}

// Get watchlist properties from localStorage
const getWatchlistProperties = (userId: string | undefined, watchlistId: string): WatchlistProperty[] => {
  if (typeof window === "undefined" || !userId) return []
  const key = getWatchlistPropertiesKey(userId, watchlistId)
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : []
}

// Save watchlist properties to localStorage
const saveWatchlistProperties = (userId: string, watchlistId: string, properties: WatchlistProperty[]) => {
  const key = getWatchlistPropertiesKey(userId, watchlistId)
  localStorage.setItem(key, JSON.stringify(properties))
}

// Icon components
const ICONS = {
  heart: Heart,
  star: Star,
  bookmark: Bookmark,
  folder: Folder,
  building: Building2,
  map: MapPin,
}

// Color classes
const COLOR_CLASSES = {
  blue: { bg: "bg-blue-500", text: "text-blue-600", bgLight: "bg-blue-50" },
  green: { bg: "bg-green-500", text: "text-green-600", bgLight: "bg-green-50" },
  purple: { bg: "bg-purple-500", text: "text-purple-600", bgLight: "bg-purple-50" },
  orange: { bg: "bg-orange-500", text: "text-orange-600", bgLight: "bg-orange-50" },
  pink: { bg: "bg-pink-500", text: "text-pink-600", bgLight: "bg-pink-50" },
  red: { bg: "bg-red-500", text: "text-red-600", bgLight: "bg-red-50" },
}

// Validation config
const VALIDATION_CONFIG = {
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  caution: {
    label: "Caution",
    color: "bg-amber-100 text-amber-700",
    icon: <ShieldAlert className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-700",
    icon: <ShieldX className="h-3 w-3" />,
  },
}

export default function WatchlistDetailPage() {
  const router = useRouter()
  const params = useParams()
  const watchlistId = params.id as string
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()

  const [watchlist, setWatchlist] = useState<Watchlist | null>(null)
  const [properties, setProperties] = useState<WatchlistProperty[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState("")
  const [editedDescription, setEditedDescription] = useState("")

  // Load watchlist and properties
  useEffect(() => {
    if (user?.id && watchlistId) {
      const watchlists = getWatchlists(user.id)
      const foundWatchlist = watchlists.find((w) => w.id === watchlistId)

      if (foundWatchlist) {
        setWatchlist(foundWatchlist)
        setEditedName(foundWatchlist.name)
        setEditedDescription(foundWatchlist.description)

        const watchlistProperties = getWatchlistProperties(user.id, watchlistId)
        setProperties(watchlistProperties)
      }
    }
  }, [user?.id, watchlistId])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Filter properties
  const filteredProperties = properties.filter((p) =>
    p.parcelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.county.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle save watchlist details
  const handleSaveDetails = () => {
    if (!user?.id || !watchlist) return

    const watchlists = getWatchlists(user.id)
    const updated = watchlists.map((w) =>
      w.id === watchlist.id
        ? {
            ...w,
            name: editedName.trim() || w.name,
            description: editedDescription.trim(),
            updatedAt: new Date().toISOString(),
          }
        : w
    )

    saveWatchlists(user.id, updated)
    setWatchlist(updated.find((w) => w.id === watchlist.id) || watchlist)
    setIsEditing(false)
  }

  // Handle remove property
  const handleRemoveProperty = (propertyId: string) => {
    if (!user?.id || !watchlist) return

    if (!confirm("Remove this property from the watchlist?")) return

    const updated = properties.filter((p) => p.id !== propertyId)
    setProperties(updated)
    saveWatchlistProperties(user.id, watchlist.id, updated)

    // Update watchlist stats
    const watchlists = getWatchlists(user.id)
    const updatedWatchlists = watchlists.map((w) =>
      w.id === watchlist.id
        ? {
            ...w,
            propertyCount: updated.length,
            totalValue: updated.reduce((sum, p) => sum + p.totalDue, 0),
            updatedAt: new Date().toISOString(),
          }
        : w
    )
    saveWatchlists(user.id, updatedWatchlists)
    setWatchlist(updatedWatchlists.find((w) => w.id === watchlist.id) || watchlist)
  }

  // Get icon component
  const getIconComponent = (iconValue: string) => {
    return ICONS[iconValue as keyof typeof ICONS] || Bookmark
  }

  // Get color classes
  const getColorClasses = (colorValue: string) => {
    return COLOR_CLASSES[colorValue as keyof typeof COLOR_CLASSES] || COLOR_CLASSES.blue
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

  if (!watchlist) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-slate-500 mb-4">Watchlist not found</p>
            <button
              onClick={() => router.push("/watchlists")}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to Watchlists
            </button>
          </div>
        </div>
      </div>
    )
  }

  const IconComponent = getIconComponent(watchlist.icon)
  const colorClasses = getColorClasses(watchlist.color)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero section */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <button
            onClick={() => router.push("/watchlists")}
            className="flex items-center gap-2 text-slate-300 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Watchlists
          </button>

          {/* Watchlist header */}
          <div className="flex items-start gap-6">
            {/* Icon */}
            <div className={`p-4 rounded-xl ${colorClasses.bg} bg-opacity-20 backdrop-blur-sm`}>
              <IconComponent className="h-8 w-8 text-white" />
            </div>

            {/* Info */}
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full max-w-lg px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full max-w-lg px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveDetails}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditedName(watchlist.name)
                        setEditedDescription(watchlist.description)
                        setIsEditing(false)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold">{watchlist.name}</h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-slate-300 mb-6">
                    {watchlist.description || "No description"}
                  </p>

                  {/* Stats */}
                  <div className="flex gap-8">
                    <div>
                      <div className="text-3xl font-bold">{watchlist.propertyCount}</div>
                      <div className="text-sm text-slate-400">Properties</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">
                        ${(watchlist.totalValue / 1000).toFixed(1)}K
                      </div>
                      <div className="text-sm text-slate-400">Total Value</div>
                    </div>
                  </div>
                </>
              )}
            </div>
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
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Properties list */}
        {filteredProperties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">
              {searchTerm ? "No properties found" : "No properties in this watchlist"}
            </p>
            <button
              onClick={() => router.push("/properties")}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="h-4 w-4" />
              Browse Properties
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProperties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    {/* Property info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {property.parcelId}
                        </h3>
                        {property.validation && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              VALIDATION_CONFIG[property.validation as keyof typeof VALIDATION_CONFIG]?.color
                            }`}
                          >
                            {VALIDATION_CONFIG[property.validation as keyof typeof VALIDATION_CONFIG]?.icon}
                            {VALIDATION_CONFIG[property.validation as keyof typeof VALIDATION_CONFIG]?.label}
                          </span>
                        )}
                      </div>

                      {/* Address */}
                      <div className="flex items-center gap-2 text-slate-600 mb-3">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {property.address}, {property.city}, {property.county}, {property.state}
                        </span>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Total Due</div>
                          <div className="font-semibold text-slate-900">
                            ${property.totalDue.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Sale Date</div>
                          <div className="font-semibold text-slate-900">
                            {formatDate(property.saleDate)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Max Bid</div>
                          <div className="font-semibold text-slate-900">
                            {property.maxBid ? `$${property.maxBid.toLocaleString()}` : "Not set"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Status</div>
                          <div className="font-semibold text-slate-900 capitalize">
                            {property.status}
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {property.notes && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <div className="text-xs text-slate-500 mb-1">Notes</div>
                          <p className="text-sm text-slate-600">{property.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => router.push(`/properties/${property.propertyId}`)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveProperty(property.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Added date */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="h-3 w-3" />
                    Added {formatDate(property.addedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
