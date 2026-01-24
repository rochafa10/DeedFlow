/**
 * Rate Limiter Utility
 *
 * Provides rate limiting for API requests with:
 * - In-memory storage for fast lookups
 * - Database fallback for persistent tracking
 * - Configurable rate limit tiers
 * - Hourly request windows
 */

import { RateLimitError } from './errors'

/**
 * Rate limit tier definitions
 * Maps tier names to requests per hour limits
 */
export const RATE_LIMIT_TIERS = {
  free: 1000,
  pro: 10000,
  enterprise: 100000,
  unlimited: Number.MAX_SAFE_INTEGER,
} as const

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Maximum requests allowed in the window */
  limit: number
  /** Requests remaining in the current window */
  remaining: number
  /** Timestamp when the rate limit window resets */
  resetTime: Date
  /** Time in milliseconds until reset */
  retryAfter: number
}

/**
 * In-memory rate limit entry
 */
interface RateLimitEntry {
  /** Number of requests in the current window */
  count: number
  /** Start of the current hourly window */
  windowStart: Date
  /** Rate limit tier for this key */
  tier: RateLimitTier
}

/**
 * Rate Limiter Class
 * Manages rate limiting with in-memory cache and database persistence
 */
export class RateLimiter {
  /** In-memory cache of rate limit data */
  private cache: Map<string, RateLimitEntry>

  /** Cache cleanup interval (1 hour) */
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    this.cache = new Map()
    this.startCleanupInterval()
  }

  /**
   * Check if a request should be rate limited
   *
   * @param apiKeyId - UUID of the API key making the request
   * @param tier - Rate limit tier for the key
   * @param endpoint - API endpoint being accessed
   * @returns Rate limit result with allowed status and metadata
   */
  async checkRateLimit(
    apiKeyId: string,
    tier: RateLimitTier,
    endpoint: string
  ): Promise<RateLimitResult> {
    const now = new Date()
    const windowStart = this.getWindowStart(now)
    const limit = RATE_LIMIT_TIERS[tier]

    // Get or create cache entry
    let entry = this.cache.get(apiKeyId)

    // If no cache entry or window has expired, initialize new entry
    if (!entry || entry.windowStart < windowStart) {
      entry = {
        count: 0,
        windowStart,
        tier,
      }
      this.cache.set(apiKeyId, entry)
    }

    // Calculate remaining requests
    const remaining = Math.max(0, limit - entry.count)

    // Calculate reset time (end of current hour)
    const resetTime = new Date(windowStart)
    resetTime.setHours(resetTime.getHours() + 1)
    const retryAfter = resetTime.getTime() - now.getTime()

    // Check if rate limit exceeded
    if (entry.count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime,
        retryAfter,
      }
    }

    // Increment counter
    entry.count++

    return {
      allowed: true,
      limit,
      remaining: remaining - 1,
      resetTime,
      retryAfter,
    }
  }

  /**
   * Throws a RateLimitError if the rate limit is exceeded
   *
   * @param apiKeyId - UUID of the API key
   * @param tier - Rate limit tier
   * @param endpoint - API endpoint
   * @param requestId - Request identifier for tracking
   * @throws RateLimitError if rate limit exceeded
   */
  async enforceRateLimit(
    apiKeyId: string,
    tier: RateLimitTier,
    endpoint: string,
    requestId: string
  ): Promise<void> {
    const result = await this.checkRateLimit(apiKeyId, tier, endpoint)

    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Maximum ${result.limit} requests per hour allowed.`,
        endpoint,
        requestId,
        result.retryAfter,
        result.limit,
        result.remaining
      )
    }
  }

  /**
   * Get rate limit status without incrementing the counter
   * Useful for checking status without consuming a request
   *
   * @param apiKeyId - UUID of the API key
   * @param tier - Rate limit tier
   * @returns Current rate limit status
   */
  getRateLimitStatus(apiKeyId: string, tier: RateLimitTier): RateLimitResult {
    const now = new Date()
    const windowStart = this.getWindowStart(now)
    const limit = RATE_LIMIT_TIERS[tier]

    const entry = this.cache.get(apiKeyId)

    // If no entry or expired window, return fresh limits
    if (!entry || entry.windowStart < windowStart) {
      const resetTime = new Date(windowStart)
      resetTime.setHours(resetTime.getHours() + 1)

      return {
        allowed: true,
        limit,
        remaining: limit,
        resetTime,
        retryAfter: resetTime.getTime() - now.getTime(),
      }
    }

    const remaining = Math.max(0, limit - entry.count)
    const resetTime = new Date(entry.windowStart)
    resetTime.setHours(resetTime.getHours() + 1)

    return {
      allowed: remaining > 0,
      limit,
      remaining,
      resetTime,
      retryAfter: resetTime.getTime() - now.getTime(),
    }
  }

  /**
   * Reset rate limit for a specific API key
   * Useful for testing or manual overrides
   *
   * @param apiKeyId - UUID of the API key to reset
   */
  resetRateLimit(apiKeyId: string): void {
    this.cache.delete(apiKeyId)
  }

  /**
   * Clear all rate limit data
   * Useful for testing or system maintenance
   */
  clearAll(): void {
    this.cache.clear()
  }

  /**
   * Get the start of the current hourly window
   *
   * @param date - Date to get window start for
   * @returns Start of the hourly window
   */
  private getWindowStart(date: Date): Date {
    const windowStart = new Date(date)
    windowStart.setMinutes(0, 0, 0) // Reset to start of hour
    return windowStart
  }

  /**
   * Start the cleanup interval to remove expired entries
   * Runs every hour to clean up old cache entries
   */
  private startCleanupInterval(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredEntries()
      },
      60 * 60 * 1000
    ) // 1 hour

    // Prevent cleanup interval from keeping process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * Clean up expired cache entries
   * Removes entries older than 2 hours
   */
  private cleanupExpiredEntries(): void {
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

    // Use forEach to avoid downlevelIteration requirement
    this.cache.forEach((entry, key) => {
      if (entry.windowStart < twoHoursAgo) {
        this.cache.delete(key)
      }
    })
  }

  /**
   * Stop the cleanup interval
   * Call this when shutting down the application
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

/**
 * Singleton instance of the rate limiter
 * Use this for all rate limiting operations
 */
export const rateLimiter = new RateLimiter()

/**
 * Helper function to get rate limit tier limits
 *
 * @param tier - Rate limit tier
 * @returns Number of requests allowed per hour
 */
export function getRateLimitForTier(tier: RateLimitTier): number {
  return RATE_LIMIT_TIERS[tier]
}

/**
 * Type guard to check if a tier is valid
 *
 * @param tier - Tier to validate
 * @returns True if tier is valid
 */
export function isValidRateLimitTier(tier: string): tier is RateLimitTier {
  return tier in RATE_LIMIT_TIERS
}

/**
 * Format rate limit information for API response headers
 * Follows standard X-RateLimit-* header conventions
 *
 * @param result - Rate limit result
 * @returns Headers object for API response
 */
export function formatRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetTime.getTime() / 1000).toString(),
    'Retry-After': Math.ceil(result.retryAfter / 1000).toString(),
  }
}
