"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  TrendingUp,
  Clock,
  Zap,
  AlertCircle,
  RefreshCw,
  BarChart3,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { authFetch } from "@/lib/api/authFetch"
import type { ApiUsageStats, RateLimitTier } from "@/types/api"

// Rate limit tier colors
const TIER_CONFIG: Record<RateLimitTier, {
  label: string
  color: string
  bgColor: string
  limit: number
}> = {
  free: {
    label: "Free",
    color: "text-slate-700",
    bgColor: "bg-slate-100",
    limit: 1000,
  },
  pro: {
    label: "Pro",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    limit: 10000,
  },
  enterprise: {
    label: "Enterprise",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    limit: 100000,
  },
  unlimited: {
    label: "Unlimited",
    color: "text-green-700",
    bgColor: "bg-green-100",
    limit: Infinity,
  },
}

export default function UsageDashboardPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // API data state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usageStats, setUsageStats] = useState<ApiUsageStats | null>(null)

  // Fetch usage data from API
  const fetchUsageStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await authFetch("/api/developer/usage")
      if (!response.ok) {
        throw new Error("Failed to fetch usage statistics")
      }

      const result = await response.json()
      setUsageStats(result.data)
    } catch (err) {
      console.error("Error fetching usage statistics:", err)
      setError(err instanceof Error ? err.message : "Failed to load usage data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch data on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchUsageStats()
    }
  }, [isAuthenticated, fetchUsageStats])

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

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-3 text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading usage statistics...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Error Loading Usage Data
              </h2>
              <p className="text-slate-600 mb-4">{error}</p>
              <button
                onClick={fetchUsageStats}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const rateLimitPct = usageStats?.rate_limit_status
    ? ((usageStats.rate_limit_status.limit - usageStats.rate_limit_status.remaining) /
        usageStats.rate_limit_status.limit) *
      100
    : 0

  const tierConfig = usageStats?.rate_limit_status
    ? TIER_CONFIG[usageStats.rate_limit_status.tier]
    : TIER_CONFIG.free

  // Calculate reset time
  const resetTime = usageStats?.rate_limit_status
    ? new Date(usageStats.rate_limit_status.reset * 1000)
    : null

  const resetMinutes = resetTime
    ? Math.max(0, Math.ceil((resetTime.getTime() - Date.now()) / 60000))
    : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">API Usage Dashboard</h1>
              <p className="mt-2 text-slate-600">
                Monitor your API usage and rate limit status
              </p>
            </div>
            <button
              onClick={fetchUsageStats}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* No API Keys State */}
        {usageStats && usageStats.total_requests === 0 && usageStats.recent_activity.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">No API Usage Yet</h3>
                <p className="text-blue-700 mb-3">
                  You haven't made any API requests yet. Create an API key and start making
                  requests to see your usage statistics here.
                </p>
                <button
                  onClick={() => router.push("/developer/keys")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create API Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Requests */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-700">Total Requests</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {usageStats?.total_requests.toLocaleString() || 0}
            </p>
            <p className="text-sm text-slate-500 mt-1">All time</p>
          </div>

          {/* Requests Today */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-700">Requests Today</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {usageStats?.requests_today.toLocaleString() || 0}
            </p>
            <p className="text-sm text-slate-500 mt-1">Since midnight</p>
          </div>

          {/* Requests This Hour */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-700">This Hour</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {usageStats?.requests_this_hour.toLocaleString() || 0}
            </p>
            <p className="text-sm text-slate-500 mt-1">Current hour</p>
          </div>

          {/* Rate Limit Status */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="font-semibold text-slate-700">Rate Limit</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {usageStats?.rate_limit_status.remaining.toLocaleString() || 0}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              of {usageStats?.rate_limit_status.limit.toLocaleString() || 0} remaining
            </p>
          </div>
        </div>

        {/* Rate Limit Details */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Rate Limit Status</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierConfig.bgColor} ${tierConfig.color}`}>
              {tierConfig.label} Tier
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">
                {usageStats?.rate_limit_status
                  ? (usageStats.rate_limit_status.limit - usageStats.rate_limit_status.remaining).toLocaleString()
                  : 0}{" "}
                / {usageStats?.rate_limit_status.limit.toLocaleString() || 0} requests used
              </span>
              <span className="text-sm font-medium text-slate-900">
                {rateLimitPct.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  rateLimitPct >= 90
                    ? "bg-red-500"
                    : rateLimitPct >= 75
                      ? "bg-amber-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${Math.min(rateLimitPct, 100)}%` }}
              />
            </div>
          </div>

          {/* Reset Info */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="h-4 w-4" />
            <span>
              Resets in {resetMinutes} minute{resetMinutes !== 1 ? "s" : ""}{" "}
              {resetTime && `(${resetTime.toLocaleTimeString()})`}
            </span>
          </div>

          {/* Warning if approaching limit */}
          {rateLimitPct >= 75 && (
            <div className={`mt-4 p-4 rounded-lg ${rateLimitPct >= 90 ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${rateLimitPct >= 90 ? "text-red-600" : "text-amber-600"}`} />
                <div>
                  <h4 className={`font-semibold mb-1 ${rateLimitPct >= 90 ? "text-red-900" : "text-amber-900"}`}>
                    {rateLimitPct >= 90 ? "Rate Limit Nearly Exceeded" : "Approaching Rate Limit"}
                  </h4>
                  <p className={`text-sm ${rateLimitPct >= 90 ? "text-red-700" : "text-amber-700"}`}>
                    You've used {rateLimitPct.toFixed(1)}% of your hourly rate limit. Consider upgrading
                    your tier or waiting for the limit to reset.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Endpoints */}
        {usageStats && usageStats.top_endpoints.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Top Endpoints</h2>
            <div className="space-y-3">
              {usageStats.top_endpoints.map((endpoint, index) => (
                <div
                  key={endpoint.endpoint}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-medium flex items-center justify-center">
                      {index + 1}
                    </span>
                    <code className="text-sm font-mono text-slate-900 truncate">
                      {endpoint.endpoint}
                    </code>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">
                        {endpoint.count.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500">requests</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {endpoint.success_rate >= 95 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : endpoint.success_rate >= 80 ? (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium text-slate-700">
                        {endpoint.success_rate}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {usageStats && usageStats.recent_activity.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Activity</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Timestamp
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Method
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Endpoint
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Requests
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usageStats.recent_activity.map((activity) => (
                    <tr
                      key={activity.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(activity.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          activity.method === "GET"
                            ? "bg-blue-100 text-blue-700"
                            : activity.method === "POST"
                              ? "bg-green-100 text-green-700"
                              : activity.method === "PUT" || activity.method === "PATCH"
                                ? "bg-amber-100 text-amber-700"
                                : activity.method === "DELETE"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-slate-100 text-slate-700"
                        }`}>
                          {activity.method}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-sm font-mono text-slate-900">
                          {activity.endpoint}
                        </code>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                        {activity.request_count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
