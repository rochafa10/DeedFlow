"use client"

import { useParams, useRouter, usePathname } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  BarChart3,
  History,
  ExternalLink,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Gavel,
  Home,
  Ruler,
  Edit3,
  Save,
  X,
  RefreshCw,
  Heart,
  Map,
  StickyNote,
  Trash2,
} from "lucide-react"
import { WatchlistItem } from "@/app/watchlist/page"
import { toast } from "sonner"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { Breadcrumbs } from "@/components/shared/Breadcrumbs"
import { PropertyMap } from "@/components/map/PropertyMap"
import { mockDataStore } from "@/lib/mockDataStore"

// Simulated "other user's" property IDs for testing access control
// In production, this would be determined by the API based on user ownership/permissions
const RESTRICTED_PROPERTY_IDS = new Set(["100", "101", "102", "999", "private-1", "other-user-prop"])

// Mock property data - in production this would come from API
// Properties 1-4 belong to the current user, 5+ are "other users' properties" for testing access control
// Simulated server-side data store (shared across "users" for demo)
let mockPropertyStore: Record<string, PropertyDetail> = {
  "1": {
    id: "1",
    parcelId: "10-01-001-0001",
    address: "123 Main St",
    city: "Greensburg",
    county: "Westmoreland",
    state: "PA",
    zipCode: "15601",
    totalDue: 5234.56,
    status: "parsed",
    propertyType: "Residential",
    lotSize: "0.25 acres",
    saleType: "Tax Deed",
    validation: null,
    yearBuilt: 1985,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1800,
    assessedValue: 125000,
    taxYear: 2024,
    saleDate: "Jan 16, 2026",
    minimumBid: 5234.56,
    latitude: 40.3015,
    longitude: -79.5389,
    notes: "Good starter property. Check with county about any outstanding liens before bidding. Neighbor mentioned roof was replaced in 2020.",
    version: 1,
    lastModifiedAt: "2026-01-08T10:30:00Z",
    lastModifiedBy: "Demo User",
  },
  "2": {
    id: "2",
    parcelId: "10-01-001-0002",
    address: "456 Oak Ave",
    city: "Greensburg",
    county: "Westmoreland",
    state: "PA",
    zipCode: "15601",
    totalDue: 12450.0,
    status: "enriched",
    propertyType: "Commercial",
    lotSize: "1.5 acres",
    saleType: "Tax Deed",
    validation: null,
    yearBuilt: 1970,
    bedrooms: null,
    bathrooms: null,
    squareFeet: 5000,
    assessedValue: 350000,
    taxYear: 2024,
    saleDate: "Jan 16, 2026",
    minimumBid: 12450.0,
    latitude: 40.3045,
    longitude: -79.5412,
    images: [
      {
        url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
        caption: "Front view of commercial building",
        source: "Regrid Aerial",
      },
      {
        url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
        caption: "Building entrance and parking lot",
        source: "Google Street View",
      },
      {
        url: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop",
        caption: "Aerial view showing lot boundaries",
        source: "Regrid Aerial",
      },
    ],
    version: 1,
    lastModifiedAt: "2026-01-07T15:45:00Z",
    lastModifiedBy: "Demo User",
    regridData: {
      lotSizeAcres: 1.5,
      lotSizeSqFt: 65340,
      propertyClass: "Commercial",
      zoning: "C-2 Commercial",
      assessedLandValue: 150000,
      assessedImprovementValue: 200000,
      marketValue: 425000,
      lastSaleDate: "2015-06-15",
      lastSalePrice: 380000,
      ownerName: "ABC Holdings LLC",
      ownerAddress: "123 Business Park Dr, Pittsburgh, PA 15222",
    },
  },
  "3": {
    id: "3",
    parcelId: "10-01-002-0001",
    address: "789 Pine Rd",
    city: "Latrobe",
    county: "Westmoreland",
    state: "PA",
    zipCode: "15650",
    totalDue: 3200.0,
    status: "validated",
    propertyType: "Residential",
    lotSize: "0.5 acres",
    saleType: "Tax Deed",
    validation: "approved",
    yearBuilt: 1995,
    bedrooms: 4,
    bathrooms: 2.5,
    squareFeet: 2400,
    assessedValue: 185000,
    taxYear: 2024,
    saleDate: "Jan 16, 2026",
    minimumBid: 3200.0,
    latitude: 40.3121,
    longitude: -79.3796,
    version: 2,
    lastModifiedAt: "2026-01-08T14:30:00Z",
    lastModifiedBy: "Visual Validator Agent",
    validationData: {
      status: "approved",
      confidenceScore: 92,
      validatedAt: "2026-01-08T14:30:00Z",
      validatedBy: "Visual Validator Agent",
      findings: [
        { type: "positive", message: "Property appears to be a well-maintained single-family home" },
        { type: "positive", message: "Lot size is consistent with county records" },
        { type: "positive", message: "No visible structural damage detected" },
        { type: "info", message: "Aerial imagery shows recent landscaping updates" },
      ],
      imagesAnalyzed: 4,
      recommendation: "Property is suitable for investment consideration",
    },
    propertyNotes: [
      {
        id: "note-1",
        type: "opportunity",
        text: "Great location near schools and shopping. Could be a good rental property.",
        createdAt: "2026-01-05T10:00:00Z",
        createdBy: "Demo User",
      },
      {
        id: "note-2",
        type: "concern",
        text: "Neighbors mentioned occasional flooding in the backyard during heavy rain.",
        createdAt: "2026-01-06T14:30:00Z",
        createdBy: "Demo User",
      },
      {
        id: "note-3",
        type: "action",
        text: "Need to verify property survey before bidding. Contact county assessor.",
        createdAt: "2026-01-07T09:15:00Z",
        createdBy: "Demo User",
      },
      {
        id: "note-4",
        type: "general",
        text: "Drove by property on 1/8 - looks well maintained with recent landscaping updates.",
        createdAt: "2026-01-08T16:00:00Z",
        createdBy: "Demo User",
      },
    ],
    activityLog: [
      {
        id: "activity-1",
        action: "Property Created",
        details: "Property parsed from Blair County tax sale list PDF",
        timestamp: "2026-01-02T08:30:00Z",
        user: "Parser Agent",
      },
      {
        id: "activity-2",
        action: "Regrid Data Added",
        details: "Property enriched with Regrid parcel data and aerial imagery",
        timestamp: "2026-01-03T10:15:00Z",
        user: "Regrid Scraper Agent",
      },
      {
        id: "activity-3",
        action: "Note Added",
        details: "Added opportunity note about rental potential",
        timestamp: "2026-01-05T10:00:00Z",
        user: "Demo User",
      },
      {
        id: "activity-4",
        action: "Note Added",
        details: "Added concern note about flooding",
        timestamp: "2026-01-06T14:30:00Z",
        user: "Demo User",
      },
      {
        id: "activity-5",
        action: "Validation Completed",
        details: "Visual validation passed with 92% confidence score",
        timestamp: "2026-01-08T14:30:00Z",
        user: "Visual Validator Agent",
      },
      {
        id: "activity-6",
        action: "Added to Watchlist",
        details: "Property added to watchlist for upcoming auction",
        timestamp: "2026-01-08T15:45:00Z",
        user: "Demo User",
      },
    ],
  },
  "4": {
    id: "4",
    parcelId: "07-02-001-0015",
    address: "321 Elm St",
    city: "Hollidaysburg",
    county: "Blair",
    state: "PA",
    zipCode: "16648",
    totalDue: 8750.25,
    status: "approved",
    propertyType: "Residential",
    lotSize: "0.33 acres",
    saleType: "Tax Lien",
    validation: "approved",
    yearBuilt: 2000,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 2100,
    assessedValue: 210000,
    taxYear: 2024,
    saleDate: "Mar 11, 2026",
    minimumBid: 8750.25,
    latitude: 40.4273,
    longitude: -78.3897,
    version: 1,
    lastModifiedAt: "2026-01-06T09:15:00Z",
    lastModifiedBy: "Demo User",
  },
  "5": {
    id: "5",
    parcelId: "07-02-003-0022",
    address: "555 Industrial Blvd",
    city: "Altoona",
    county: "Blair",
    state: "PA",
    zipCode: "16601",
    totalDue: 15890.75,
    status: "validated",
    propertyType: "Industrial",
    lotSize: "2.1 acres",
    saleType: "Tax Deed",
    validation: "caution",
    yearBuilt: 1955,
    bedrooms: null,
    bathrooms: null,
    squareFeet: 12000,
    assessedValue: 275000,
    taxYear: 2024,
    saleDate: "Mar 11, 2026",
    minimumBid: 15890.75,
    latitude: 40.5187,
    longitude: -78.3947,
    version: 1,
    lastModifiedAt: "2026-01-09T11:00:00Z",
    lastModifiedBy: "Visual Validator Agent",
    validationData: {
      status: "caution",
      confidenceScore: 58,
      validatedAt: "2026-01-09T11:00:00Z",
      validatedBy: "Visual Validator Agent",
      findings: [
        { type: "warning", message: "Former industrial site - potential environmental contamination concerns" },
        { type: "negative", message: "Visible roof damage detected in aerial imagery" },
        { type: "warning", message: "Adjacent to active railroad - noise and access concerns" },
        { type: "negative", message: "Building appears vacant for extended period - possible vandalism or deterioration" },
        { type: "info", message: "Zoning allows for commercial redevelopment" },
        { type: "positive", message: "Large lot size provides flexibility for future use" },
      ],
      imagesAnalyzed: 6,
      recommendation: "Proceed with caution. Environmental assessment and structural inspection strongly recommended before bidding.",
    },
  },
}

// Alias for backward compatibility (read-only access)
const MOCK_PROPERTIES = mockPropertyStore

interface RegridData {
  lotSizeAcres: number
  lotSizeSqFt: number
  propertyClass: string
  zoning: string
  assessedLandValue: number
  assessedImprovementValue: number
  marketValue: number
  lastSaleDate: string | null
  lastSalePrice: number | null
  ownerName: string
  ownerAddress: string
}

interface ValidationFinding {
  type: "positive" | "negative" | "warning" | "info"
  message: string
}

interface ValidationData {
  status: "approved" | "caution" | "rejected"
  confidenceScore: number
  validatedAt: string
  validatedBy: string
  findings: ValidationFinding[]
  imagesAnalyzed: number
  recommendation: string
}

interface PropertyDetail {
  id: string
  parcelId: string
  address: string
  city: string
  county: string
  state: string
  zipCode: string
  totalDue: number
  status: string
  propertyType: string
  lotSize: string
  saleType: string
  validation: string | null
  yearBuilt: number | null
  bedrooms: number | null
  bathrooms: number | null
  squareFeet: number | null
  assessedValue: number | null
  taxYear: number
  saleDate: string
  minimumBid: number
  regridData?: RegridData
  validationData?: ValidationData
  // Location coordinates
  latitude?: number
  longitude?: number
  // Property images
  images?: {
    url: string
    caption: string
    source: string
  }[]
  // User notes (legacy single note for backward compatibility)
  notes?: string
  // User notes with types
  propertyNotes?: {
    id: string
    type: "general" | "concern" | "opportunity" | "action"
    text: string
    createdAt: string
    createdBy: string
  }[]
  // Activity log
  activityLog?: {
    id: string
    action: string
    details: string
    timestamp: string
    user: string
  }[]
  // Concurrency control fields
  version: number
  lastModifiedAt: string
  lastModifiedBy: string
}

type PropertyStatus = "parsed" | "enriched" | "validated" | "approved"

const STATUS_CONFIG: Record<
  PropertyStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  parsed: {
    label: "Parsed",
    color: "bg-slate-100 text-slate-700",
    icon: <Clock className="h-4 w-4" />,
  },
  enriched: {
    label: "Enriched",
    color: "bg-blue-100 text-blue-700",
    icon: <Building2 className="h-4 w-4" />,
  },
  validated: {
    label: "Validated",
    color: "bg-amber-100 text-amber-700",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
}

type ValidationStatus = "approved" | "caution" | "rejected"

const VALIDATION_CONFIG: Record<
  ValidationStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  caution: {
    label: "Caution",
    color: "bg-amber-100 text-amber-700",
    icon: <ShieldAlert className="h-4 w-4" />,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-700",
    icon: <ShieldX className="h-4 w-4" />,
  },
}

type TabType = "overview" | "location" | "regrid" | "validation" | "images" | "notes" | "analysis" | "history"

type NoteType = "general" | "concern" | "opportunity" | "action"

const NOTE_TYPE_CONFIG: Record<NoteType, { label: string; color: string; bgColor: string }> = {
  general: { label: "General", color: "text-slate-700", bgColor: "bg-slate-100" },
  concern: { label: "Concern", color: "text-red-700", bgColor: "bg-red-100" },
  opportunity: { label: "Opportunity", color: "text-green-700", bgColor: "bg-green-100" },
  action: { label: "Action", color: "text-blue-700", bgColor: "bg-blue-100" },
}

// Conflict dialog state interface
interface ConflictState {
  show: boolean
  serverVersion: PropertyDetail | null
  localChanges: Partial<PropertyDetail>
}

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  // Check if user can edit properties (admin and analyst can, viewer cannot)
  const canEdit = user?.role === 'admin' || user?.role === 'analyst'
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<PropertyDetail>>({})
  const [originalVersion, setOriginalVersion] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState<ConflictState>({
    show: false,
    serverVersion: null,
    localChanges: {},
  })
  const [recordDeleted, setRecordDeleted] = useState(false)

  // Watchlist state
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; caption: string } | null>(null)

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [noteTypeFilter, setNoteTypeFilter] = useState<"all" | "general" | "concern" | "opportunity" | "action">("all")
  const [newNoteType, setNewNoteType] = useState<"general" | "concern" | "opportunity" | "action">("general")
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

  // Property delete state
  const [showPropertyDeleteConfirm, setShowPropertyDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const propertyId = params.id as string

  // Handle property deletion
  const handleDeleteProperty = () => {
    setIsDeleting(true)
    // Delete from mock data store
    const success = mockDataStore.deleteProperty(propertyId)
    if (success) {
      toast.success("Property deleted", {
        description: "The property has been removed from the database.",
      })
      // Navigate back to properties list
      router.push("/properties")
    } else {
      toast.error("Delete failed", {
        description: "Could not delete the property. Please try again.",
      })
      setIsDeleting(false)
      setShowPropertyDeleteConfirm(false)
    }
  }

  // Check if property is in watchlist
  useEffect(() => {
    if (typeof window !== "undefined") {
      const watchlist = JSON.parse(localStorage.getItem("watchlist") || "[]") as WatchlistItem[]
      setIsInWatchlist(watchlist.some((item) => item.propertyId === propertyId))
    }
  }, [propertyId])

  // Add to watchlist
  const addToWatchlist = () => {
    if (!property) return
    const watchlist = JSON.parse(localStorage.getItem("watchlist") || "[]") as WatchlistItem[]

    // Check if already in watchlist
    if (watchlist.some((item) => item.propertyId === propertyId)) {
      toast.info("Already in watchlist", {
        description: "This property is already in your watchlist.",
      })
      return
    }

    const newItem: WatchlistItem = {
      id: `watchlist-${Date.now()}`,
      propertyId: propertyId,
      parcelId: property.parcelId,
      address: property.address,
      city: property.city,
      county: property.county,
      state: property.state,
      totalDue: property.totalDue,
      saleDate: property.saleDate,
      maxBid: null,
      notes: "",
      addedAt: new Date().toISOString(),
    }

    watchlist.push(newItem)
    localStorage.setItem("watchlist", JSON.stringify(watchlist))
    setIsInWatchlist(true)
    toast.success("Added to watchlist", {
      description: `${property.parcelId} has been added to your watchlist.`,
    })
  }

  // Remove from watchlist
  const removeFromWatchlist = () => {
    const watchlist = JSON.parse(localStorage.getItem("watchlist") || "[]") as WatchlistItem[]
    const filtered = watchlist.filter((item) => item.propertyId !== propertyId)
    localStorage.setItem("watchlist", JSON.stringify(filtered))
    setIsInWatchlist(false)
    toast.success("Removed from watchlist", {
      description: "Property has been removed from your watchlist.",
    })
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [isAuthenticated, authLoading, router, pathname])

  // Load property data with access control
  useEffect(() => {
    // Simulate API call with access control
    const loadProperty = () => {
      setLoading(true)
      setAccessDenied(false)

      // Check if this property ID is restricted (belongs to another user)
      // In production, this check would happen server-side via API
      if (RESTRICTED_PROPERTY_IDS.has(propertyId)) {
        setAccessDenied(true)
        setProperty(null)
        setLoading(false)
        return
      }

      // In production, fetch from API which would also verify ownership
      const found = MOCK_PROPERTIES[propertyId]
      setProperty(found || null)
      setLoading(false)
    }

    if (propertyId) {
      loadProperty()
    }
  }, [propertyId])

  // Start editing - capture the current version
  const startEditing = useCallback(() => {
    if (property) {
      setEditFormData({
        address: property.address,
        city: property.city,
        totalDue: property.totalDue,
        assessedValue: property.assessedValue,
        propertyType: property.propertyType,
        status: property.status,
      })
      setOriginalVersion(property.version)
      setIsEditing(true)
    }
  }, [property])

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setIsEditing(false)
    setEditFormData({})
    setOriginalVersion(0)
  }, [])

  // Simulate another user editing the same record
  const simulateOtherUserEdit = useCallback(() => {
    if (property) {
      // Simulate "User B" making changes in the background
      mockPropertyStore[property.id] = {
        ...mockPropertyStore[property.id],
        version: mockPropertyStore[property.id].version + 1,
        lastModifiedAt: new Date().toISOString(),
        lastModifiedBy: "Other User (User B)",
        address: mockPropertyStore[property.id].address + " (edited by User B)",
      }
    }
  }, [property])

  // Simulate another user deleting the record
  const simulateOtherUserDelete = useCallback(() => {
    if (property) {
      // Simulate "User B" deleting the record from the server
      delete mockPropertyStore[property.id]
    }
  }, [property])

  // Save changes with optimistic concurrency check
  const saveChanges = useCallback(async () => {
    if (!property) return

    setSaving(true)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Check if record still exists (was deleted by another user)
    const currentServerProperty = mockPropertyStore[property.id]

    if (!currentServerProperty) {
      // Record was deleted by another user!
      setRecordDeleted(true)
      setSaving(false)
      return
    }

    if (currentServerProperty.version !== originalVersion) {
      // Version conflict detected!
      setConflict({
        show: true,
        serverVersion: { ...currentServerProperty },
        localChanges: { ...editFormData },
      })
      setSaving(false)
      return
    }

    // No conflict - save changes
    const updatedProperty: PropertyDetail = {
      ...currentServerProperty,
      ...editFormData,
      version: currentServerProperty.version + 1,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: "Demo User (You)",
    }

    // Update the mock store
    mockPropertyStore[property.id] = updatedProperty

    // Update local state
    setProperty(updatedProperty)
    setIsEditing(false)
    setEditFormData({})
    setSaving(false)
  }, [property, originalVersion, editFormData])

  // Force save (overwrite server changes)
  const forceSave = useCallback(async () => {
    if (!property || !conflict.serverVersion) return

    const updatedProperty: PropertyDetail = {
      ...conflict.serverVersion,
      ...conflict.localChanges,
      version: conflict.serverVersion.version + 1,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: "Demo User (You - force saved)",
    }

    mockPropertyStore[property.id] = updatedProperty
    setProperty(updatedProperty)
    setIsEditing(false)
    setEditFormData({})
    setConflict({ show: false, serverVersion: null, localChanges: {} })
  }, [property, conflict])

  // Discard local changes and use server version
  const useServerVersion = useCallback(() => {
    if (conflict.serverVersion) {
      setProperty({ ...conflict.serverVersion })
    }
    setIsEditing(false)
    setEditFormData({})
    setConflict({ show: false, serverVersion: null, localChanges: {} })
  }, [conflict])

  // Update form field
  const updateField = useCallback((field: keyof PropertyDetail, value: string | number | null) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Show access denied
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push("/properties")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Properties
          </button>
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
              You don't have permission to view this property. This resource belongs to another user.
            </p>
            <p className="text-sm text-slate-500">
              If you believe this is an error, please contact support.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Show not found
  if (!property) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push("/properties")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Properties
          </button>
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Property Not Found
            </h2>
            <p className="text-slate-600">
              The property you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </main>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[property.status as PropertyStatus]
  const validationConfig = property.validation
    ? VALIDATION_CONFIG[property.validation as ValidationStatus]
    : null

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: <FileText className="h-4 w-4" /> },
    { id: "location" as const, label: "Location", icon: <Map className="h-4 w-4" /> },
    { id: "regrid" as const, label: "Regrid Data", icon: <Building2 className="h-4 w-4" /> },
    { id: "validation" as const, label: "Validation", icon: <Shield className="h-4 w-4" /> },
    { id: "images" as const, label: "Images", icon: <ImageIcon className="h-4 w-4" /> },
    { id: "notes" as const, label: "Notes", icon: <StickyNote className="h-4 w-4" /> },
    { id: "analysis" as const, label: "Analysis", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "history" as const, label: "History", icon: <History className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Properties", href: "/properties" },
            { label: property.parcelId },
          ]}
        />

        {/* Property Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6 mb-6">
          {/* Version Info Banner */}
          <div className="flex flex-col gap-3 mb-4 pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-500">
              <span>Version: {property.version}</span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span>Last modified: {new Date(property.lastModifiedAt).toLocaleString()}</span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span>By: {property.lastModifiedBy}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && !isEditing && (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
              )}
              {canEdit && isEditing && (
                <>
                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              )}
              {/* Watchlist button */}
              <button
                onClick={isInWatchlist ? removeFromWatchlist : addToWatchlist}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  isInWatchlist
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
              >
                <Heart className={`h-4 w-4 ${isInWatchlist ? "fill-current" : ""}`} />
                <span className="hidden sm:inline">{isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}</span>
                <span className="sm:hidden">{isInWatchlist ? "Remove" : "Watchlist"}</span>
              </button>
              {/* Demo button to simulate concurrent edit - only visible to editors */}
              {canEdit && (
                <button
                  onClick={simulateOtherUserEdit}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                  title="Simulates another user editing this record (increments version)"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Simulate User B Edit</span>
                  <span className="sm:hidden">Sim Edit</span>
                </button>
              )}
              {/* Demo button to simulate delete by another user - only visible to editors */}
              {canEdit && (
                <button
                  onClick={simulateOtherUserDelete}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  title="Simulates another user deleting this record"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Simulate User B Delete</span>
                  <span className="sm:hidden">Sim Del</span>
                </button>
              )}
              {/* Delete property button */}
              {canEdit && (
                <button
                  onClick={() => setShowPropertyDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  title="Delete this property"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete Property</span>
                  <span className="sm:hidden">Delete</span>
                </button>
              )}
            </div>
          </div>

          {isEditing ? (
            /* Edit Form */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editFormData.address || ""}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editFormData.city || ""}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Due ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.totalDue || ""}
                    onChange={(e) => updateField("totalDue", parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Assessed Value ($)
                  </label>
                  <input
                    type="number"
                    value={editFormData.assessedValue || ""}
                    onChange={(e) => updateField("assessedValue", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Property Type
                  </label>
                  <select
                    value={editFormData.propertyType || ""}
                    onChange={(e) => updateField("propertyType", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Land">Land</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Pipeline Stage
                  </label>
                  <select
                    value={editFormData.status || property.status || ""}
                    onChange={(e) => updateField("status", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="parsed">Parsed</option>
                    <option value="enriched">Enriched</option>
                    <option value="validated">Validated</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>
              <div className="text-sm text-slate-500">
                You are editing version {originalVersion}. If another user saves changes before you, you will see a conflict warning.
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {property.address}
                  </h1>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
                      statusConfig.color
                    )}
                  >
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                  {validationConfig && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
                        validationConfig.color
                      )}
                    >
                      {validationConfig.icon}
                      {validationConfig.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {property.city}, {property.state} {property.zipCode}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>{property.county} County</span>
                </div>
                <div className="mt-2 font-mono text-sm text-slate-500">
                  Parcel ID: {property.parcelId}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-sm text-slate-500">Total Due</div>
                  <div className="text-2xl font-bold text-slate-900 flex items-center gap-1">
                    <DollarSign className="h-5 w-5" />
                    {property.totalDue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <Gavel className="h-4 w-4" />
                  {property.saleType}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Home className="h-4 w-4" />
              Property Type
            </div>
            <div className="font-semibold text-slate-900">
              {property.propertyType}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Ruler className="h-4 w-4" />
              Lot Size
            </div>
            <div className="font-semibold text-slate-900">{property.lotSize}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Calendar className="h-4 w-4" />
              Sale Date
            </div>
            <div className="font-semibold text-slate-900">{property.saleDate}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              Assessed Value
            </div>
            <div className="font-semibold text-slate-900">
              ${property.assessedValue?.toLocaleString() || "N/A"}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Tax Information */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Tax Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-slate-500">Tax Year</div>
                      <div className="font-medium text-slate-900">
                        {property.taxYear}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Total Due</div>
                      <div className="font-medium text-slate-900">
                        ${property.totalDue.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Minimum Bid</div>
                      <div className="font-medium text-slate-900">
                        ${property.minimumBid.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Property Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {property.yearBuilt && (
                      <div>
                        <div className="text-sm text-slate-500">Year Built</div>
                        <div className="font-medium text-slate-900">
                          {property.yearBuilt}
                        </div>
                      </div>
                    )}
                    {property.squareFeet && (
                      <div>
                        <div className="text-sm text-slate-500">Square Feet</div>
                        <div className="font-medium text-slate-900">
                          {property.squareFeet.toLocaleString()} sq ft
                        </div>
                      </div>
                    )}
                    {property.bedrooms && (
                      <div>
                        <div className="text-sm text-slate-500">Bedrooms</div>
                        <div className="font-medium text-slate-900">
                          {property.bedrooms}
                        </div>
                      </div>
                    )}
                    {property.bathrooms && (
                      <div>
                        <div className="text-sm text-slate-500">Bathrooms</div>
                        <div className="font-medium text-slate-900">
                          {property.bathrooms}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "location" && (
              property.latitude && property.longitude ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Property Location
                    </h3>
                    <PropertyMap
                      latitude={property.latitude}
                      longitude={property.longitude}
                      address={`${property.address}, ${property.city}, ${property.state} ${property.zipCode}`}
                      parcelId={property.parcelId}
                      totalDue={property.totalDue}
                      className="h-[400px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-500">Latitude</div>
                      <div className="font-medium text-slate-900 font-mono">
                        {property.latitude.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Longitude</div>
                      <div className="font-medium text-slate-900 font-mono">
                        {property.longitude.toFixed(6)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in Google Maps
                    </a>
                    <a
                      href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${property.latitude},${property.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Street View
                    </a>
                    <a
                      href={`https://www.zillow.com/homes/${encodeURIComponent(property.address + ' ' + property.city + ' ' + property.state + ' ' + property.zipCode)}_rb/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Zillow
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Map className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No location data available for this property yet.</p>
                  <p className="text-sm mt-2">
                    Coordinates will be available after Regrid enrichment.
                  </p>
                </div>
              )
            )}

            {activeTab === "regrid" && (
              property.regridData ? (
                <div className="space-y-6">
                  {/* Lot Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Lot Information
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-slate-500">Lot Size (Acres)</div>
                        <div className="font-medium text-slate-900">
                          {property.regridData.lotSizeAcres} acres
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Lot Size (Sq Ft)</div>
                        <div className="font-medium text-slate-900">
                          {property.regridData.lotSizeSqFt.toLocaleString()} sq ft
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Property Class</div>
                        <div className="font-medium text-slate-900">
                          {property.regridData.propertyClass}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Zoning</div>
                        <div className="font-medium text-slate-900">
                          {property.regridData.zoning}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Valuation */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Valuation
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-slate-500">Assessed Land Value</div>
                        <div className="font-medium text-slate-900">
                          ${property.regridData.assessedLandValue.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Assessed Improvement Value</div>
                        <div className="font-medium text-slate-900">
                          ${property.regridData.assessedImprovementValue.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Market Value</div>
                        <div className="font-medium text-slate-900 text-lg">
                          ${property.regridData.marketValue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sale History */}
                  {property.regridData.lastSaleDate && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        Last Sale
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-slate-500">Sale Date</div>
                          <div className="font-medium text-slate-900">
                            {property.regridData.lastSaleDate}
                          </div>
                        </div>
                        {property.regridData.lastSalePrice && (
                          <div>
                            <div className="text-sm text-slate-500">Sale Price</div>
                            <div className="font-medium text-slate-900">
                              ${property.regridData.lastSalePrice.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Owner Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Owner Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-slate-500">Owner Name</div>
                        <div className="font-medium text-slate-900">
                          {property.regridData.ownerName}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Mailing Address</div>
                        <div className="font-medium text-slate-900">
                          {property.regridData.ownerAddress}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* View on Regrid Link */}
                  <div className="pt-4 border-t border-slate-200">
                    <a
                      href={`https://app.regrid.com/search?q=${encodeURIComponent(property.parcelId)}&state=${property.state}&county=${encodeURIComponent(property.county)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Regrid
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No Regrid data available for this property yet.</p>
                  <p className="text-sm mt-2">
                    Regrid data will be available after enrichment.
                  </p>
                </div>
              )
            )}

            {activeTab === "validation" && (
              property.validationData ? (
                <div className="space-y-6">
                  {/* Validation Status Banner */}
                  <div className={cn(
                    "p-4 rounded-lg border",
                    property.validationData.status === "approved" && "bg-green-50 border-green-200",
                    property.validationData.status === "caution" && "bg-amber-50 border-amber-200",
                    property.validationData.status === "rejected" && "bg-red-50 border-red-200",
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {property.validationData.status === "approved" && (
                          <ShieldCheck className="h-8 w-8 text-green-600" />
                        )}
                        {property.validationData.status === "caution" && (
                          <ShieldAlert className="h-8 w-8 text-amber-600" />
                        )}
                        {property.validationData.status === "rejected" && (
                          <ShieldX className="h-8 w-8 text-red-600" />
                        )}
                        <div>
                          <div className={cn(
                            "text-lg font-semibold",
                            property.validationData.status === "approved" && "text-green-800",
                            property.validationData.status === "caution" && "text-amber-800",
                            property.validationData.status === "rejected" && "text-red-800",
                          )}>
                            Validation Status: {property.validationData.status.charAt(0).toUpperCase() + property.validationData.status.slice(1)}
                          </div>
                          <div className="text-sm text-slate-600">
                            Validated by {property.validationData.validatedBy} on{" "}
                            {new Date(property.validationData.validatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-500">Confidence Score</div>
                        <div className={cn(
                          "text-2xl font-bold",
                          property.validationData.confidenceScore >= 80 && "text-green-600",
                          property.validationData.confidenceScore >= 60 && property.validationData.confidenceScore < 80 && "text-amber-600",
                          property.validationData.confidenceScore < 60 && "text-red-600",
                        )}>
                          {property.validationData.confidenceScore}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Recommendation
                    </h3>
                    <p className="text-slate-700">
                      {property.validationData.recommendation}
                    </p>
                  </div>

                  {/* Findings */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Findings
                    </h3>
                    <div className="space-y-2">
                      {property.validationData.findings.map((finding, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg",
                            finding.type === "positive" && "bg-green-50",
                            finding.type === "negative" && "bg-red-50",
                            finding.type === "warning" && "bg-amber-50",
                            finding.type === "info" && "bg-blue-50",
                          )}
                        >
                          <div className={cn(
                            "mt-0.5",
                            finding.type === "positive" && "text-green-600",
                            finding.type === "negative" && "text-red-600",
                            finding.type === "warning" && "text-amber-600",
                            finding.type === "info" && "text-blue-600",
                          )}>
                            {finding.type === "positive" && <CheckCircle2 className="h-5 w-5" />}
                            {finding.type === "negative" && <ShieldX className="h-5 w-5" />}
                            {finding.type === "warning" && <AlertTriangle className="h-5 w-5" />}
                            {finding.type === "info" && <FileText className="h-5 w-5" />}
                          </div>
                          <span className="text-slate-700">{finding.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Images Analyzed */}
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <ImageIcon className="h-4 w-4" />
                    <span>{property.validationData.imagesAnalyzed} images analyzed</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No validation results available yet.</p>
                  <p className="text-sm mt-2">
                    Visual validation will be performed after enrichment.
                  </p>
                </div>
              )
            )}

            {activeTab === "images" && (
              property.images && property.images.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Property Images ({property.images.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {property.images.map((image, index) => (
                      <div
                        key={index}
                        className="relative group cursor-pointer rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                        onClick={() => setEnlargedImage({ url: image.url, caption: image.caption })}
                      >
                        <img
                          src={image.url}
                          alt={image.caption}
                          className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white/90 rounded-full p-2">
                              <ExternalLink className="h-5 w-5 text-slate-700" />
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-white">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {image.caption}
                          </p>
                          <p className="text-xs text-slate-500">
                            Source: {image.source}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No images available for this property yet.</p>
                  <p className="text-sm mt-2">
                    Images will be loaded from Regrid after enrichment.
                  </p>
                </div>
              )
            )}

            {activeTab === "notes" && (
              <div className="space-y-4">
                {/* Header with Add Note button */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Property Notes
                    {property.propertyNotes && property.propertyNotes.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-slate-500">
                        ({property.propertyNotes.length} notes)
                      </span>
                    )}
                  </h3>
                  {canEdit && !isEditingNotes && (
                    <button
                      onClick={() => {
                        setNotesValue("")
                        setNewNoteType("general")
                        setIsEditingNotes(true)
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                      Add Note
                    </button>
                  )}
                </div>

                {/* Type Filter (only show if there are notes) */}
                {property.propertyNotes && property.propertyNotes.length > 0 && !isEditingNotes && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-500">Filter by type:</span>
                    <button
                      onClick={() => setNoteTypeFilter("all")}
                      className={cn(
                        "px-3 py-1 text-sm rounded-full transition-colors",
                        noteTypeFilter === "all"
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      All
                    </button>
                    {(["general", "concern", "opportunity", "action"] as const).map((type) => {
                      const config = NOTE_TYPE_CONFIG[type]
                      const count = property.propertyNotes?.filter((n) => n.type === type).length || 0
                      if (count === 0) return null
                      return (
                        <button
                          key={type}
                          onClick={() => setNoteTypeFilter(type)}
                          className={cn(
                            "px-3 py-1 text-sm rounded-full transition-colors",
                            noteTypeFilter === type
                              ? `${config.bgColor} ${config.color} ring-2 ring-offset-1`
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {config.label} ({count})
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Add/Edit Note Form */}
                {isEditingNotes && (
                  <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-slate-700">Note Type:</label>
                      <select
                        value={newNoteType}
                        onChange={(e) => setNewNoteType(e.target.value as NoteType)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {(["general", "concern", "opportunity", "action"] as const).map((type) => (
                          <option key={type} value={type}>
                            {NOTE_TYPE_CONFIG[type].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add your note about this property..."
                      className="w-full h-32 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setIsEditingNotes(false)
                          setNotesValue("")
                        }}
                        className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!notesValue.trim()) {
                            toast.error("Note cannot be empty")
                            return
                          }
                          // Add new note to property
                          const newNote = {
                            id: `note-${Date.now()}`,
                            type: newNoteType,
                            text: notesValue.trim(),
                            createdAt: new Date().toISOString(),
                            createdBy: "Demo User",
                          }
                          const existingNotes = mockPropertyStore[property.id].propertyNotes || []
                          mockPropertyStore[property.id] = {
                            ...mockPropertyStore[property.id],
                            propertyNotes: [...existingNotes, newNote],
                            version: mockPropertyStore[property.id].version + 1,
                            lastModifiedAt: new Date().toISOString(),
                            lastModifiedBy: "Demo User",
                          }
                          setProperty({ ...mockPropertyStore[property.id] })
                          setIsEditingNotes(false)
                          setNotesValue("")
                          toast.success("Note added", {
                            description: `${NOTE_TYPE_CONFIG[newNoteType].label} note has been added.`,
                          })
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Save className="h-4 w-4" />
                        Save Note
                      </button>
                    </div>
                  </div>
                )}

                {/* Notes List */}
                {!isEditingNotes && property.propertyNotes && property.propertyNotes.length > 0 ? (
                  <div className="space-y-3">
                    {property.propertyNotes
                      .filter((note) => noteTypeFilter === "all" || note.type === noteTypeFilter)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((note) => {
                        const config = NOTE_TYPE_CONFIG[note.type]
                        return (
                          <div
                            key={note.id}
                            className={cn(
                              "rounded-lg border p-4",
                              config.bgColor,
                              "border-slate-200"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 text-xs font-medium rounded-full",
                                      config.bgColor,
                                      config.color
                                    )}
                                  >
                                    {config.label}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {new Date(note.createdAt).toLocaleDateString()} at{" "}
                                    {new Date(note.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                                <p className="text-slate-700">{note.text}</p>
                              </div>
                              {canEdit && (
                                <button
                                  onClick={() => {
                                    setNoteToDelete(note.id)
                                    setShowDeleteConfirm(true)
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete note"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    {/* Show message if filter returns no results */}
                    {property.propertyNotes.filter((note) => noteTypeFilter === "all" || note.type === noteTypeFilter).length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <p>No {noteTypeFilter} notes found.</p>
                      </div>
                    )}
                  </div>
                ) : !isEditingNotes ? (
                  <div className="text-center py-12 text-slate-500">
                    <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No notes for this property yet.</p>
                    <p className="text-sm mt-2">
                      Click "Add Note" to add your observations and reminders.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === "analysis" && (
              <div className="text-center py-12 text-slate-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analysis not yet available.</p>
                <p className="text-sm mt-2">
                  Property analysis will be available after validation.
                </p>
              </div>
            )}

            {activeTab === "history" && (
              property.activityLog && property.activityLog.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Activity Log
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      ({property.activityLog.length} activities)
                    </span>
                  </h3>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

                    {/* Activity items */}
                    <div className="space-y-4">
                      {property.activityLog
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((activity) => (
                          <div key={activity.id} className="relative pl-10">
                            {/* Timeline dot */}
                            <div className="absolute left-2.5 w-3 h-3 bg-primary rounded-full border-2 border-white" />

                            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="font-medium text-slate-900">
                                    {activity.action}
                                  </div>
                                  <p className="text-sm text-slate-600 mt-1">
                                    {activity.details}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(activity.timestamp).toLocaleDateString()} at{" "}
                                  {new Date(activity.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span>by {activity.user}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No activity history available yet.</p>
                  <p className="text-sm mt-2">
                    Pipeline activity will be tracked here.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </main>

      {/* Conflict Resolution Modal */}
      {conflict.show && conflict.serverVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <h2 className="text-lg font-semibold text-red-800">
                  Conflict Detected
                </h2>
                <p className="text-sm text-red-600">
                  Another user has modified this record while you were editing.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
              {/* Server Version */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Server Version (User B's changes)
                </h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Version:</strong> {conflict.serverVersion.version}</p>
                  <p><strong>Last Modified:</strong> {new Date(conflict.serverVersion.lastModifiedAt).toLocaleString()}</p>
                  <p><strong>Modified By:</strong> {conflict.serverVersion.lastModifiedBy}</p>
                  <p><strong>Address:</strong> {conflict.serverVersion.address}</p>
                  <p><strong>Total Due:</strong> ${conflict.serverVersion.totalDue?.toLocaleString()}</p>
                </div>
              </div>

              {/* Your Changes */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Your Unsaved Changes (User A)
                </h3>
                <div className="text-sm text-amber-700 space-y-1">
                  {conflict.localChanges.address && (
                    <p><strong>Address:</strong> {conflict.localChanges.address}</p>
                  )}
                  {conflict.localChanges.city && (
                    <p><strong>City:</strong> {conflict.localChanges.city}</p>
                  )}
                  {conflict.localChanges.totalDue !== undefined && (
                    <p><strong>Total Due:</strong> ${conflict.localChanges.totalDue?.toLocaleString()}</p>
                  )}
                  {conflict.localChanges.assessedValue !== undefined && (
                    <p><strong>Assessed Value:</strong> ${conflict.localChanges.assessedValue?.toLocaleString()}</p>
                  )}
                  {conflict.localChanges.propertyType && (
                    <p><strong>Property Type:</strong> {conflict.localChanges.propertyType}</p>
                  )}
                </div>
              </div>

              <div className="text-sm text-slate-600 bg-slate-100 p-3 rounded-lg">
                <strong>What would you like to do?</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li><strong>Force Save:</strong> Overwrite User B's changes with your changes</li>
                  <li><strong>Use Server Version:</strong> Discard your changes and use User B's version</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
              <button
                onClick={useServerVersion}
                className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Use Server Version
              </button>
              <button
                onClick={forceSave}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Force Save My Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Deleted Modal */}
      {recordDeleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-lg">
              <ShieldX className="h-6 w-6 text-red-600" />
              <div>
                <h2 className="text-lg font-semibold text-red-800">
                  Record Deleted
                </h2>
                <p className="text-sm text-red-600">
                  This record has been deleted by another user.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  The property you were editing has been deleted by another user (User B) while you were making changes.
                </p>
                <p className="text-sm text-red-700 mt-2">
                  Your unsaved changes cannot be saved because the record no longer exists.
                </p>
              </div>

              <div className="text-sm text-slate-600 bg-slate-100 p-3 rounded-lg">
                <strong>What happened to your changes?</strong>
                <p className="mt-1">
                  Your edits were not saved. You will be redirected to the Properties list.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
              <button
                onClick={() => router.push("/properties")}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Go to Properties List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-slate-300 transition-colors"
              aria-label="Close image"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={enlargedImage.url}
              alt={enlargedImage.caption}
              className="w-full rounded-lg shadow-2xl"
            />
            <p className="text-white text-center mt-4 text-lg">
              {enlargedImage.caption}
            </p>
          </div>
        </div>
      )}

      {/* Delete Note Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Delete Note
                </h2>
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete this note?
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600">
                This action cannot be undone. The note will be permanently removed from this property.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (noteToDelete) {
                    // Delete specific note from propertyNotes array
                    const existingNotes = mockPropertyStore[property.id].propertyNotes || []
                    mockPropertyStore[property.id] = {
                      ...mockPropertyStore[property.id],
                      propertyNotes: existingNotes.filter((n) => n.id !== noteToDelete),
                      version: mockPropertyStore[property.id].version + 1,
                      lastModifiedAt: new Date().toISOString(),
                      lastModifiedBy: "Demo User",
                    }
                  } else {
                    // Delete legacy single note
                    mockPropertyStore[property.id] = {
                      ...mockPropertyStore[property.id],
                      notes: undefined,
                      version: mockPropertyStore[property.id].version + 1,
                      lastModifiedAt: new Date().toISOString(),
                      lastModifiedBy: "Demo User",
                    }
                  }
                  setProperty({ ...mockPropertyStore[property.id] })
                  setShowDeleteConfirm(false)
                  setNoteToDelete(null)
                  toast.success("Note deleted", {
                    description: "The note has been removed from this property.",
                  })
                }}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Property Confirmation Modal */}
      {showPropertyDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isDeleting && setShowPropertyDeleteConfirm(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Delete Property
                </h2>
                <p className="text-sm text-slate-600">
                  This action cannot be undone
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-slate-600 mb-4">
                Are you sure you want to delete this property? It will be permanently removed from the database.
              </p>
              {property && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-medium text-slate-900">{property.address}</div>
                  <div className="text-sm text-slate-500">{property.parcelId}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowPropertyDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProperty}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete Property"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
