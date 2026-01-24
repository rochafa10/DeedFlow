/**
 * API Types
 *
 * Type definitions for Developer API requests and responses
 */

// ============================================
// Rate Limiting
// ============================================

export type RateLimitTier = 'free' | 'pro' | 'enterprise' | 'unlimited'

export interface RateLimitStatus {
  limit: number
  remaining: number
  reset: number // Unix timestamp
  tier: RateLimitTier
}

// ============================================
// API Keys
// ============================================

export interface ApiKey {
  id: string
  user_id: string
  name: string
  permissions: string[]
  rate_limit_tier: RateLimitTier
  last_used_at: string | null
  request_count: number
  revoked_at: string | null
  revoked_reason?: string | null
  created_at: string
  updated_at: string
}

export interface ApiKeyWithSecret extends ApiKey {
  /** The plaintext API key - only shown once on creation */
  api_key: string
}

export interface CreateApiKeyRequest {
  name: string
  permissions: string[]
  rate_limit_tier?: RateLimitTier
}

export interface CreateApiKeyResponse {
  data: ApiKeyWithSecret
  message: string
}

export interface ListApiKeysResponse {
  data: ApiKey[]
  count: number
}

export interface RevokeApiKeyRequest {
  reason?: string
}

export interface RevokeApiKeyResponse {
  success: boolean
  message: string
}

// ============================================
// API Usage
// ============================================

export interface ApiUsageRecord {
  id: string
  api_key_id: string
  endpoint: string
  method: string
  request_count: number
  avg_response_time_ms: number | null
  error_count: number
  success_count: number
  timestamp: string
  hour_bucket: string
}

export interface ApiUsageStats {
  total_requests: number
  requests_today: number
  requests_this_hour: number
  rate_limit_status: RateLimitStatus
  top_endpoints: Array<{
    endpoint: string
    count: number
    success_rate: number
  }>
  recent_activity: ApiUsageRecord[]
}

export interface GetUsageStatsResponse {
  data: ApiUsageStats
}

export interface GetUsageHistoryParams {
  api_key_id?: string
  start_date?: string
  end_date?: string
  endpoint?: string
  limit?: number
  offset?: number
}

export interface GetUsageHistoryResponse {
  data: ApiUsageRecord[]
  count: number
  pagination: {
    limit: number
    offset: number
    has_more: boolean
  }
}

// ============================================
// Webhooks
// ============================================

export type WebhookEvent =
  | 'property.created'
  | 'property.updated'
  | 'property.deleted'
  | 'county.created'
  | 'county.updated'
  | 'auction.created'
  | 'auction.updated'
  | 'risk_score.calculated'

export interface WebhookSubscription {
  id: string
  api_key_id: string
  url: string
  events: WebhookEvent[]
  secret: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface CreateWebhookRequest {
  url: string
  events: WebhookEvent[]
}

export interface CreateWebhookResponse {
  data: WebhookSubscription
  message: string
}

export interface ListWebhooksResponse {
  data: WebhookSubscription[]
  count: number
}

export interface UpdateWebhookRequest {
  url?: string
  events?: WebhookEvent[]
  active?: boolean
}

export interface UpdateWebhookResponse {
  data: WebhookSubscription
  message: string
}

export interface DeleteWebhookResponse {
  success: boolean
  message: string
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  event: WebhookEvent
  payload: unknown
  status_code: number | null
  response_body: string | null
  error_message: string | null
  delivered_at: string | null
  created_at: string
}

// ============================================
// Public API - Properties
// ============================================

export interface PropertyFilters {
  county_id?: string
  state_code?: string
  min_total_due?: number
  max_total_due?: number
  min_investability_score?: number
  property_type?: string
  has_regrid_data?: boolean
  visual_validation_status?: 'approved' | 'rejected' | 'caution' | 'pending'
}

export interface GetPropertiesParams extends PropertyFilters {
  limit?: number
  offset?: number
  sort_by?: 'total_due' | 'investability_score' | 'created_at' | 'updated_at'
  sort_order?: 'asc' | 'desc'
}

export interface Property {
  id: string
  county_id: string
  parcel_id: string | null
  address: string | null
  total_due: number | null
  sale_date: string | null
  investability_score: number | null
  has_regrid_data: boolean
  has_screenshot: boolean
  visual_validation_status: string | null
  created_at: string
  updated_at: string
}

export interface PropertyWithDetails extends Property {
  county?: {
    county_name: string
    state_code: string
  }
  regrid_data?: unknown
  visual_validation?: unknown
}

export interface GetPropertiesResponse {
  data: PropertyWithDetails[]
  count: number
  pagination: {
    limit: number
    offset: number
    has_more: boolean
  }
}

export interface GetPropertyResponse {
  data: PropertyWithDetails
}

// ============================================
// Public API - Counties
// ============================================

export interface GetCountiesParams {
  state_code?: string
  has_upcoming_sale?: boolean
  limit?: number
  offset?: number
}

export interface County {
  id: string
  county_name: string
  state_code: string
  state_name: string
  research_status: string | null
  last_researched_at: string | null
  created_at: string
  updated_at: string
}

export interface CountyWithDetails extends County {
  property_count?: number
  upcoming_sale?: {
    sale_date: string
    sale_type: string
    registration_deadline: string | null
  } | null
}

export interface GetCountiesResponse {
  data: CountyWithDetails[]
  count: number
  pagination: {
    limit: number
    offset: number
    has_more: boolean
  }
}

export interface GetCountyResponse {
  data: CountyWithDetails
}

// ============================================
// Public API - Risk Analysis
// ============================================

export interface RiskAnalysisRequest {
  property_id: string
}

export interface RiskAnalysisResponse {
  data: {
    property_id: string
    risk_score: number
    risk_level: 'low' | 'medium' | 'high'
    factors: Array<{
      category: string
      score: number
      weight: number
      description: string
    }>
    recommendations: string[]
    calculated_at: string
  }
}

// ============================================
// Standard API Responses
// ============================================

export interface ApiSuccessResponse<T = unknown> {
  data: T
  message?: string
  source?: 'database' | 'cache' | 'mock'
}

export interface ApiErrorResponse {
  error: string
  message: string
  details?: unknown
}

export interface ApiPaginationMeta {
  limit: number
  offset: number
  total: number
  has_more: boolean
}

// ============================================
// API Error Types
// ============================================

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limit_exceeded'
  | 'invalid_request'
  | 'server_error'
  | 'bad_request'

export interface ApiError {
  code: ApiErrorCode
  message: string
  details?: unknown
}
