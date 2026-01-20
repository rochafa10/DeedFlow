/**
 * Property Analysis Report System - TypeScript Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the Property Analysis
 * Report System, matching the database schema defined in the supabase migrations.
 *
 * @author Claude Code Agent
 * @date 2026-01-14
 */

// ============================================
// Enums matching database types
// ============================================

/**
 * Letter grades for property report scoring (125-point scale)
 * - A: 100-125 points (80%+)
 * - B: 75-99 points (60-79%)
 * - C: 50-74 points (40-59%)
 * - D: 25-49 points (20-39%)
 * - F: 0-24 points (<20%)
 */
export type ReportGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Status tracking for report generation lifecycle
 */
export type ReportStatus = 'queued' | 'generating' | 'complete' | 'failed' | 'cancelled';

/**
 * Data source for comparable property sales
 */
export type ComparableSource = 'realtor' | 'zillow' | 'redfin' | 'regrid' | 'manual' | 'mls';

/**
 * Priority levels for the report generation queue
 */
export type QueuePriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================
// Report Data Structure (JSONB content)
// ============================================

/**
 * Base structure for a single section within a report
 */
export interface ReportSection {
  /** Display title for the section */
  title: string;
  /** Score achieved for this section (if scored) */
  score?: number;
  /** Maximum possible score for this section */
  maxScore?: number;
  /** Confidence level in the data (0-100) */
  confidence?: number;
  /** Section-specific data payload */
  data: Record<string, unknown>;
  /** Human-readable summary of findings */
  summary?: string;
  /** Warning messages for investor attention */
  warnings?: string[];
  /** Actionable recommendations */
  recommendations?: string[];
}

/**
 * Complete report data structure containing all 16 sections
 * Stored as JSONB in the property_reports.report_data column
 */
export interface ReportData {
  // ----------------------
  // Location Analysis (25 pts)
  // ----------------------
  /** Overall location quality and characteristics */
  locationAnalysis?: ReportSection;
  /** Neighborhood demographics, crime, schools, amenities */
  neighborhoodProfile?: ReportSection;
  /** Road access, utilities, public transport proximity */
  accessibilityScore?: ReportSection;

  // ----------------------
  // Risk Assessment (25 pts)
  // ----------------------
  /** FEMA flood zone analysis and history */
  floodRisk?: ReportSection;
  /** EPA, brownfields, contamination risks */
  environmentalRisk?: ReportSection;
  /** Liens, title defects, ownership history */
  titleRisk?: ReportSection;
  /** Building condition, age, maintenance indicators */
  structuralRisk?: ReportSection;

  // ----------------------
  // Financial Analysis (25 pts)
  // ----------------------
  /** Tax history, delinquency patterns, projected taxes */
  taxAnalysis?: ReportSection;
  /** Acquisition costs, rehab estimates, holding costs */
  costEstimates?: ReportSection;
  /** Rental income potential, operating expenses, NOI */
  cashFlowProjection?: ReportSection;

  // ----------------------
  // Market Analysis (25 pts)
  // ----------------------
  /** Local market trends, appreciation, inventory levels */
  marketConditions?: ReportSection;
  /** Analysis of comparable recent sales */
  comparableSalesAnalysis?: ReportSection;
  /** Buyer/renter demand indicators */
  demandIndicators?: ReportSection;

  // ----------------------
  // Profit Potential (25 pts)
  // ----------------------
  /** After-repair value calculation */
  arvEstimate?: ReportSection;
  /** Expected profit and ROI analysis */
  profitProjection?: ReportSection;
  /** Flip, hold, wholesale strategy options */
  exitStrategies?: ReportSection;

  // ----------------------
  // Metadata
  // ----------------------
  /** ISO timestamp when report was generated */
  generatedAt?: string;
  /** List of data sources consulted */
  dataSourcesUsed?: string[];
  /** Number of external API calls made */
  apiCallCount?: number;
}

// ============================================
// Main Table Interfaces
// ============================================

/**
 * Property report record from the property_reports table
 */
export interface PropertyReport {
  /** Primary key (UUID) */
  id: string;
  /** Reference to the analyzed property */
  property_id: string;
  /** Owner of this report */
  user_id: string;

  // Scoring (125-point system)
  /** Sum of all 5 category scores (0-125) */
  total_score: number | null;
  /** Letter grade calculated from total_score */
  grade: ReportGrade | null;
  /** Location analysis score (0-25) */
  location_score: number | null;
  /** Risk assessment score (0-25) */
  risk_score: number | null;
  /** Financial analysis score (0-25) */
  financial_score: number | null;
  /** Market analysis score (0-25) */
  market_score: number | null;
  /** Profit potential score (0-25) */
  profit_score: number | null;

  // Content
  /** JSONB containing all 16 report sections */
  report_data: ReportData;

  // Metadata
  /** Overall confidence level (0-100) */
  confidence_level: number | null;
  /** Current generation status */
  status: ReportStatus;
  /** Error message if generation failed */
  error_message: string | null;
  /** Version number for report updates */
  version: number;

  // Soft delete
  /** Timestamp when soft deleted, null if active */
  deleted_at: string | null;

  // Timestamps
  /** When report generation completed */
  generated_at: string | null;
  /** When record was created */
  created_at: string;
  /** When record was last updated */
  updated_at: string;
}

/**
 * Queue item for asynchronous report generation
 */
export interface ReportGenerationQueue {
  /** Primary key (UUID) */
  id: string;
  /** Reference to the report being generated */
  report_id: string;
  /** Reference to the property being analyzed */
  property_id: string;
  /** User who requested the report */
  user_id: string;

  // Queue status
  /** Current processing status */
  status: ReportStatus;
  /** Queue priority level */
  priority: QueuePriority;

  // Processing metadata
  /** Number of processing attempts */
  attempts: number;
  /** Maximum allowed attempts */
  max_attempts: number;
  /** Error message from last failure */
  last_error: string | null;
  /** Total error count */
  error_count: number;

  // Processing timestamps
  /** When added to queue */
  queued_at: string;
  /** When processing started */
  started_at: string | null;
  /** When processing completed */
  completed_at: string | null;
  /** When to retry after failure */
  next_retry_at: string | null;

  // Worker tracking
  /** ID of worker processing this item */
  worker_id: string | null;
  /** When worker acquired lock */
  locked_at: string | null;
  /** When worker lock expires */
  lock_expires_at: string | null;

  // Timestamps
  /** When record was created */
  created_at: string;
  /** When record was last updated */
  updated_at: string;
}

/**
 * Share configuration for a report
 */
export interface ReportShare {
  /** Primary key (UUID) */
  id: string;
  /** Reference to the shared report */
  report_id: string;
  /** Public share token (UUID) */
  share_token: string;

  // Expiration and tracking
  /** When the share expires */
  expires_at: string;
  /** Number of times viewed */
  view_count: number;
  /** Maximum allowed views (null = unlimited) */
  max_views: number | null;
  /** When last viewed */
  last_viewed_at: string | null;

  // Access control
  /** Hashed password if protected */
  password_hash: string | null;
  /** Whether email is required to view */
  require_email: boolean;

  // Soft delete
  /** Timestamp when soft deleted, null if active */
  deleted_at: string | null;

  // Metadata
  /** User who created the share */
  created_by: string | null;
  /** When share was created */
  created_at: string;
}

/**
 * Comparable sale property used in market analysis
 */
export interface ComparableSale {
  /** Primary key (UUID) */
  id: string;
  /** Reference to the parent report */
  report_id: string;
  /** Reference to internal property (if exists) */
  property_id: string | null;
  /** ID from external data source */
  external_id: string | null;

  // Location
  /** Property street address */
  address: string;
  /** City name */
  city: string | null;
  /** Two-letter state code */
  state: string | null;
  /** ZIP code */
  zip: string | null;

  // Sale details
  /** Sale price in dollars */
  sale_price: number | null;
  /** Date of sale (YYYY-MM-DD) */
  sale_date: string | null;

  // Property characteristics
  /** Living area in square feet */
  sqft: number | null;
  /** Lot size in square feet */
  lot_size_sqft: number | null;
  /** Number of bedrooms */
  bedrooms: number | null;
  /** Number of bathrooms (supports half baths) */
  bathrooms: number | null;
  /** Year property was built */
  year_built: number | null;
  /** Type of property (SFR, Condo, etc.) */
  property_type: string | null;

  // Comparison metrics
  /** Sale price divided by sqft */
  price_per_sqft: number | null;
  /** Distance from subject property in miles */
  distance_miles: number | null;
  /** Similarity score (0-100) */
  similarity_score: number | null;

  // Source data
  /** Raw API response data */
  raw_data: Record<string, unknown> | null;
  /** Data source identifier */
  source: ComparableSource | null;

  // Soft delete
  /** Timestamp when soft deleted, null if active */
  deleted_at: string | null;

  /** When record was created */
  created_at: string;
}

/**
 * Cached API response for cost reduction and latency improvement
 */
export interface ReportApiCache {
  /** Primary key (UUID) */
  id: string;
  /** Name of the API (fema, usgs, census, etc.) */
  api_name: string;
  /** MD5 hash of request parameters */
  request_hash: string;
  /** Latitude for geographic queries */
  latitude: number | null;
  /** Longitude for geographic queries */
  longitude: number | null;
  /** Cached response data */
  response_data: Record<string, unknown>;
  /** HTTP status code of original response */
  response_status: number | null;
  /** When cache entry expires */
  expires_at: string;
  /** Number of cache hits */
  hit_count: number;
  /** When cache was last accessed */
  last_hit_at: string | null;
  /** When cache entry was created */
  created_at: string;
}

// ============================================
// View Types
// ============================================

/**
 * Report summary with property and county information
 * Corresponds to vw_report_summary view
 */
export interface ReportSummary extends PropertyReport {
  /** Property parcel ID */
  parcel_id: string;
  /** Property street address */
  property_address: string;
  /** County name */
  county_name: string;
  /** Two-letter state code */
  state_code: string;
  /** Number of active shares */
  share_count: number;
  /** Total views across all shares */
  total_views: number;
  /** Number of comparable sales attached */
  comparable_count: number;
}

/**
 * Active share with status information
 * Corresponds to vw_active_shares view
 */
export interface ActiveShare extends ReportShare {
  /** Reference to the property */
  property_id: string;
  /** Report total score (null if report still generating) */
  total_score: number | null;
  /** Report grade (null if report still generating) */
  grade: ReportGrade | null;
  /** Property street address */
  property_address: string;
  /** County name */
  county_name: string;
  /** Two-letter state code */
  state_code: string;
  /** Calculated share status */
  share_status: 'active' | 'expired' | 'view_limit_reached';
}

/**
 * Queue status with wait time calculations
 * Corresponds to vw_queue_status view
 */
export interface QueueStatus extends ReportGenerationQueue {
  /** Property parcel ID */
  parcel_id: string;
  /** Property street address */
  property_address: string;
  /** County name */
  county_name: string;
  /** Calculated wait time in seconds */
  wait_time_seconds: number | null;
}

/**
 * Aggregated report statistics per user
 * Corresponds to vw_user_report_stats view
 */
export interface UserReportStats {
  /** User ID */
  user_id: string;
  /** Total number of reports */
  total_reports: number;
  /** Number of completed reports */
  completed_reports: number;
  /** Number of reports currently generating */
  generating_reports: number;
  /** Number of failed reports */
  failed_reports: number;
  /** Average score across completed reports */
  avg_score: number | null;
  /** Count of A-grade reports */
  grade_a_count: number;
  /** Count of B-grade reports */
  grade_b_count: number;
  /** Count of C-grade reports */
  grade_c_count: number;
  /** Count of D-grade reports */
  grade_d_count: number;
  /** Count of F-grade reports */
  grade_f_count: number;
  /** Timestamp of first report */
  first_report_at: string | null;
  /** Timestamp of most recent report */
  last_report_at: string | null;
}

/**
 * Cache statistics per API endpoint
 * Corresponds to vw_api_cache_stats view
 */
export interface ApiCacheStats {
  /** API name */
  api_name: string;
  /** Total cached items */
  cached_items: number;
  /** Non-expired items */
  active_items: number;
  /** Expired items awaiting cleanup */
  expired_items: number;
  /** Total cache hits */
  total_hits: number;
  /** Average hits per cached item */
  avg_hits_per_item: number;
  /** Oldest cache entry timestamp */
  oldest_cache: string;
  /** Newest cache entry timestamp */
  newest_cache: string;
}

// ============================================
// Function Return Types
// ============================================

/**
 * Result from get_report_by_share_token function
 */
export interface SharedReportResult {
  /** Report ID (null if access denied) */
  report_id: string | null;
  /** Property ID (null if access denied) */
  property_id: string | null;
  /** Total score (null if access denied) */
  total_score: number | null;
  /** Grade (null if access denied) */
  grade: ReportGrade | null;
  /** Report data (null if access denied) */
  report_data: ReportData | null;
  /** Confidence level (null if access denied) */
  confidence_level: number | null;
  /** Generation timestamp (null if access denied) */
  generated_at: string | null;
  /** Whether the share has expired */
  is_expired: boolean;
  /** Whether the view limit has been reached */
  is_view_limited: boolean;
}

/**
 * Result from claim_queue_item function
 */
export interface ClaimedQueueItem {
  /** Queue item ID */
  queue_id: string;
  /** Report ID to generate */
  report_id: string;
  /** Property ID to analyze */
  property_id: string;
  /** User who requested the report */
  user_id: string;
  /** Priority of the item */
  priority: QueuePriority;
  /** Current attempt number */
  attempts: number;
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Request body for creating a new report
 */
export interface CreateReportRequest {
  /** Property ID to generate report for */
  property_id: string;
  /** Optional priority level (defaults to 'normal') */
  priority?: QueuePriority;
}

/**
 * Response from report creation endpoint
 */
export interface CreateReportResponse {
  /** ID of created report */
  report_id: string;
  /** ID of queue item for tracking */
  queue_id: string;
  /** Initial status (typically 'queued') */
  status: ReportStatus;
}

/**
 * Request body for creating a share link
 */
export interface ShareReportRequest {
  /** Report ID to share */
  report_id: string;
  /** Days until expiration (default: 30) */
  expires_in_days?: number;
  /** Maximum allowed views (optional) */
  max_views?: number;
  /** Optional password protection */
  password?: string;
}

/**
 * Response from share creation endpoint
 */
export interface ShareReportResponse {
  /** ID of created share */
  share_id: string;
  /** Share token for URL */
  share_token: string;
  /** Complete shareable URL */
  share_url: string;
  /** Expiration timestamp */
  expires_at: string;
}

// ============================================
// Utility Types
// ============================================

/**
 * Input type for creating a new report (omits auto-generated fields)
 */
export type CreatePropertyReportInput = Omit<
  PropertyReport,
  'id' | 'total_score' | 'grade' | 'created_at' | 'updated_at' | 'deleted_at'
>;

/**
 * Input type for updating a report
 */
export type UpdatePropertyReportInput = Partial<
  Omit<PropertyReport, 'id' | 'property_id' | 'user_id' | 'created_at' | 'updated_at'>
>;

/**
 * Filter options for querying reports
 */
export interface ReportFilterOptions {
  /** Filter by user ID */
  user_id?: string;
  /** Filter by property ID */
  property_id?: string;
  /** Filter by status */
  status?: ReportStatus;
  /** Filter by grade */
  grade?: ReportGrade;
  /** Minimum total score */
  min_score?: number;
  /** Maximum total score */
  max_score?: number;
  /** Include soft-deleted reports */
  include_deleted?: boolean;
}

/**
 * Pagination options for list queries
 */
export interface PaginationOptions {
  /** Number of items per page */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Field to sort by */
  sort_by?: keyof PropertyReport;
  /** Sort direction */
  sort_order?: 'asc' | 'desc';
}
