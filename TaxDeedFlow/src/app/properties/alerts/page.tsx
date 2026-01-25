"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  ArrowLeft,
  Search,
  Filter,
  Loader2,
  Database,
  MapPin,
  Home,
  DollarSign,
  Gauge,
  Calendar,
  TrendingUp,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import type { AlertRule } from "@/lib/property-alerts/types"

// Sample alert rules shown when no real rules exist in database
const SAMPLE_RULES: AlertRule[] = [
  {
    id: "sample-1",
    userId: "demo-user",
    name: "High-Value Properties in Blair County",
    enabled: true,
    scoreThreshold: 80,
    countyIds: ["blair-county-pa"],
    propertyTypes: ["Residential", "Vacant Land"],
    maxBid: 50000,
    minAcres: 0.25,
    maxAcres: 5,
    notificationFrequency: "daily",
    lastNotifiedAt: new Date("2026-01-22"),
    matchCount: 12,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-22"),
  },
  {
    id: "sample-2",
    userId: "demo-user",
    name: "Budget-Friendly Residential",
    enabled: true,
    scoreThreshold: 70,
    countyIds: [],
    propertyTypes: ["Residential"],
    maxBid: 25000,
    minAcres: null,
    maxAcres: null,
    notificationFrequency: "instant",
    lastNotifiedAt: new Date("2026-01-23"),
    matchCount: 8,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-23"),
  },
  {
    id: "sample-3",
    userId: "demo-user",
    name: "Premium Investment Opportunities",
    enabled: false,
    scoreThreshold: 90,
    countyIds: ["westmoreland-county-pa", "allegheny-county-pa"],
    propertyTypes: ["Commercial", "Residential"],
    maxBid: 100000,
    minAcres: 1,
    maxAcres: 10,
    notificationFrequency: "weekly",
    lastNotifiedAt: null,
    matchCount: 3,
    createdAt: new Date("2026-01-05"),
    updatedAt: new Date("2026-01-20"),
  },
]

type DataSource = "live" | "sample" | "loading" | "error"

export default function PropertyAlertsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [rules, setRules] = useState<AlertRule[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showEnabledOnly, setShowEnabledOnly] = useState(false)
  const [dataSource, setDataSource] = useState<DataSource>("loading")
  const [isLoading, setIsLoading] = useState(true)

  // Fetch alert rules from API
  const fetchRules = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/property-alerts/rules')

      if (!response.ok) {
        throw new Error('Failed to fetch alert rules')
      }

      const data = await response.json()

      if (data.rules && data.rules.length > 0) {
        setRules(data.rules)
        setDataSource("live")
      } else {
        // No real rules, use sample data
        setRules(SAMPLE_RULES)
        setDataSource("sample")
      }
    } catch (error) {
      console.error('Error fetching alert rules:', error)
      // Fallback to sample data on error
      setRules(SAMPLE_RULES)
      setDataSource("sample")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Toggle rule enabled status
  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/api/property-alerts/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !currentEnabled }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle rule')
      }

      // Update local state
      setRules(rules.map(rule =>
        rule.id === ruleId ? { ...rule, enabled: !currentEnabled } : rule
      ))
    } catch (error) {
      console.error('Error toggling rule:', error)
      alert('Failed to toggle rule. Please try again.')
    }
  }

  // Delete rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this alert rule? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/property-alerts/rules/${ruleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete rule')
      }

      // Update local state
      setRules(rules.filter(rule => rule.id !== ruleId))
    } catch (error) {
      console.error('Error deleting rule:', error)
      alert('Failed to delete rule. Please try again.')
    }
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch rules on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchRules()
    }
  }, [isAuthenticated, fetchRules])

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

  // Filter rules
  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      searchQuery === "" ||
      rule.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesEnabled = !showEnabledOnly || rule.enabled

    return matchesSearch && matchesEnabled
  })

  // Stats
  const totalRules = rules.length
  const enabledRules = rules.filter(r => r.enabled).length
  const totalMatches = rules.reduce((sum, rule) => sum + rule.matchCount, 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">Property Alert Rules</h1>
                {dataSource === "sample" && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    <Database className="h-3 w-3" />
                    Sample Data
                  </div>
                )}
              </div>
              <p className="text-slate-600 mt-2">
                Manage your property alert criteria and get notified when matching properties are found
              </p>
            </div>

            <button
              onClick={() => router.push('/properties/alerts/create')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create New Rule
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Rules</p>
                <p className="text-2xl font-bold text-slate-900">{totalRules}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Power className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active Rules</p>
                <p className="text-2xl font-bold text-slate-900">{enabledRules}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Matches</p>
                <p className="text-2xl font-bold text-slate-900">{totalMatches}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search alert rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEnabledOnly}
                  onChange={(e) => setShowEnabledOnly(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Active Only
              </label>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Rules List */}
        {!isLoading && filteredRules.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchQuery || showEnabledOnly ? 'No Matching Rules' : 'No Alert Rules Yet'}
            </h3>
            <p className="text-slate-600 mb-6">
              {searchQuery || showEnabledOnly
                ? 'Try adjusting your filters to see more results'
                : 'Create your first alert rule to get notified when properties match your investment criteria'}
            </p>
            {!searchQuery && !showEnabledOnly && (
              <button
                onClick={() => router.push('/properties/alerts/create')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Your First Rule
              </button>
            )}
          </div>
        )}

        {!isLoading && filteredRules.length > 0 && (
          <div className="space-y-4">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{rule.name}</h3>
                      {rule.enabled ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                          Disabled
                        </span>
                      )}
                    </div>

                    {/* Criteria Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                      {rule.scoreThreshold !== null && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Gauge className="h-4 w-4 text-slate-400" />
                          <span>Score ≥ {rule.scoreThreshold}</span>
                        </div>
                      )}

                      {rule.countyIds && rule.countyIds.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>{rule.countyIds.length} {rule.countyIds.length === 1 ? 'County' : 'Counties'}</span>
                        </div>
                      )}

                      {rule.propertyTypes && rule.propertyTypes.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Home className="h-4 w-4 text-slate-400" />
                          <span>{rule.propertyTypes.join(', ')}</span>
                        </div>
                      )}

                      {rule.maxBid !== null && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <DollarSign className="h-4 w-4 text-slate-400" />
                          <span>Max ${rule.maxBid.toLocaleString()}</span>
                        </div>
                      )}

                      {(rule.minAcres !== null || rule.maxAcres !== null) && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Filter className="h-4 w-4 text-slate-400" />
                          <span>
                            {rule.minAcres && rule.maxAcres
                              ? `${rule.minAcres}-${rule.maxAcres} acres`
                              : rule.minAcres
                              ? `≥ ${rule.minAcres} acres`
                              : `≤ ${rule.maxAcres} acres`}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="capitalize">{rule.notificationFrequency}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
                      <div className="text-sm">
                        <span className="text-slate-600">Total Matches: </span>
                        <span className="font-semibold text-slate-900">{rule.matchCount}</span>
                      </div>
                      {rule.lastNotifiedAt && (
                        <div className="text-sm text-slate-600">
                          Last notified: {new Date(rule.lastNotifiedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.enabled)}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.enabled
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.enabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                    </button>

                    <button
                      onClick={() => router.push(`/properties/alerts/edit/${rule.id}`)}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Edit rule"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Data Source Notice */}
        {dataSource === "sample" && !isLoading && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Sample Data Mode</h4>
                <p className="text-sm text-blue-700">
                  You&apos;re currently viewing sample alert rules. Create your own rules to start receiving
                  personalized property alerts based on your investment criteria.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
