import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import { getRateLimitStatus } from "@/lib/api/api-key-auth"
import type { GetUsageStatsResponse, ApiUsageStats, RateLimitStatus } from "@/types/api"

/**
 * GET /api/developer/usage
 * Returns usage statistics for the authenticated user's API keys
 *
 * Returns:
 * {
 *   data: {
 *     total_requests: number,
 *     requests_today: number,
 *     requests_this_hour: number,
 *     rate_limit_status: {
 *       limit: number,
 *       remaining: number,
 *       reset: number,
 *       tier: string
 *     },
 *     top_endpoints: Array<{
 *       endpoint: string,
 *       count: number,
 *       success_rate: number
 *     }>,
 *     recent_activity: Array<{
 *       id: string,
 *       api_key_id: string,
 *       endpoint: string,
 *       method: string,
 *       request_count: number,
 *       timestamp: string,
 *       hour_bucket: string
 *     }>
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        {
          error: "Service Unavailable",
          message: "Database not configured",
        },
        { status: 503 }
      )
    }

    // Get authenticated user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "You must be logged in to view usage statistics",
        },
        { status: 401 }
      )
    }

    // Get all API keys for the user
    const { data: apiKeys, error: keysError } = await supabase
      .from("developer_api_keys")
      .select("id, rate_limit_tier")
      .eq("user_id", user.id)
      .is("revoked_at", null) // Only active keys

    if (keysError) {
      console.error("[API] Error fetching API keys:", keysError)
      return NextResponse.json(
        {
          error: "Server Error",
          message: "Failed to fetch API keys",
          details: keysError.message,
        },
        { status: 500 }
      )
    }

    const apiKeyIds = apiKeys?.map((key) => key.id) || []

    // If no API keys, return empty stats
    if (apiKeyIds.length === 0) {
      const emptyStats: ApiUsageStats = {
        total_requests: 0,
        requests_today: 0,
        requests_this_hour: 0,
        rate_limit_status: {
          limit: 1000, // Default to free tier
          remaining: 1000,
          reset: Date.now() + 3600000, // 1 hour from now
          tier: "free",
        },
        top_endpoints: [],
        recent_activity: [],
      }

      return NextResponse.json({
        data: emptyStats,
      })
    }

    // Calculate date boundaries
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const hourStart = new Date(now)
    hourStart.setMinutes(0, 0, 0)

    // Get total requests across all API keys
    const { data: totalData, error: totalError } = await supabase
      .from("api_usage")
      .select("request_count")
      .in("api_key_id", apiKeyIds)

    const totalRequests = totalData?.reduce(
      (sum, record) => sum + (record.request_count || 0),
      0
    ) || 0

    // Get requests today
    const { data: todayData, error: todayError } = await supabase
      .from("api_usage")
      .select("request_count")
      .in("api_key_id", apiKeyIds)
      .gte("timestamp", todayStart.toISOString())

    const requestsToday = todayData?.reduce(
      (sum, record) => sum + (record.request_count || 0),
      0
    ) || 0

    // Get requests this hour
    const { data: hourData, error: hourError } = await supabase
      .from("api_usage")
      .select("request_count")
      .in("api_key_id", apiKeyIds)
      .gte("timestamp", hourStart.toISOString())

    const requestsThisHour = hourData?.reduce(
      (sum, record) => sum + (record.request_count || 0),
      0
    ) || 0

    // Get top endpoints (aggregate by endpoint)
    const { data: endpointData, error: endpointError } = await supabase
      .from("api_usage")
      .select("endpoint, request_count, error_count, success_count")
      .in("api_key_id", apiKeyIds)

    // Aggregate endpoints
    const endpointMap = new Map<string, { count: number; successCount: number; totalCount: number }>()

    endpointData?.forEach((record) => {
      const existing = endpointMap.get(record.endpoint) || {
        count: 0,
        successCount: 0,
        totalCount: 0
      }
      endpointMap.set(record.endpoint, {
        count: existing.count + (record.request_count || 0),
        successCount: existing.successCount + (record.success_count || 0),
        totalCount: existing.totalCount + (record.request_count || 0),
      })
    })

    const topEndpoints = Array.from(endpointMap.entries())
      .map(([endpoint, data]) => ({
        endpoint,
        count: data.count,
        success_rate: data.totalCount > 0
          ? Math.round((data.successCount / data.totalCount) * 100)
          : 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 endpoints

    // Get recent activity (last 20 records)
    const { data: recentData, error: recentError } = await supabase
      .from("api_usage")
      .select("id, api_key_id, endpoint, method, request_count, timestamp, hour_bucket")
      .in("api_key_id", apiKeyIds)
      .order("timestamp", { ascending: false })
      .limit(20)

    // Get rate limit status for the first (most recently used) API key
    const firstKey = apiKeys[0]
    const rateLimitResult = getRateLimitStatus(firstKey.id, firstKey.rate_limit_tier)

    const rateLimitStatus: RateLimitStatus = {
      limit: rateLimitResult.limit,
      remaining: rateLimitResult.remaining,
      reset: Math.floor(rateLimitResult.resetTime.getTime() / 1000), // Unix timestamp
      tier: firstKey.rate_limit_tier,
    }

    const stats: ApiUsageStats = {
      total_requests: totalRequests,
      requests_today: requestsToday,
      requests_this_hour: requestsThisHour,
      rate_limit_status: rateLimitStatus,
      top_endpoints: topEndpoints,
      recent_activity: recentData?.map((record) => ({
        id: record.id,
        api_key_id: record.api_key_id,
        endpoint: record.endpoint,
        method: record.method,
        request_count: record.request_count,
        avg_response_time_ms: null,
        error_count: 0,
        success_count: 0,
        timestamp: record.timestamp,
        hour_bucket: record.hour_bucket,
      })) || [],
    }

    const response: GetUsageStatsResponse = {
      data: stats,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("[API] Unexpected error fetching usage statistics:", error)
    return NextResponse.json(
      {
        error: "Server Error",
        message: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
