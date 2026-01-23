/**
 * Database Type Definitions
 *
 * Comprehensive type definitions for all Supabase database tables
 * in the TaxDeedFlow property analysis system.
 *
 * @module types/database
 */

// ============================================================
// CORE PROPERTY TABLES
// ============================================================

/**
 * County Record
 */
export interface County {
  id: string;
  county_name: string;
  state_code: string;
  state_name?: string;
  research_status?: 'pending' | 'in_progress' | 'complete' | 'failed';
  quality_score?: number;
  last_researched_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Property Record
 */
export interface Property {
  id: string;
  county_id: string;
  parcel_number?: string;
  property_address?: string;
  property_city?: string;
  property_state?: string;
  property_zip?: string;
  owner_name?: string;
  total_due?: number;
  opening_bid?: number;
  assessed_value?: number;
  latitude?: number;
  longitude?: number;
  legal_description?: string;
  case_number?: string;
  document_id?: string;
  has_regrid_data: boolean;
  has_screenshot: boolean;
  is_investable?: boolean;
  validation_status?: 'pending' | 'approved' | 'rejected' | 'caution';
  created_at: string;
  updated_at: string;
}

/**
 * Regrid Property Data
 */
export interface RegridData {
  id: string;
  property_id: string;
  county_id: string;

  // Land characteristics
  ll_gisacre?: number;
  ll_bldg_footprint_sqft?: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Property details
  zoning?: string;
  land_use?: string;
  property_type?: string;
  year_built?: number;
  beds?: number;
  baths?: number;

  // Valuation
  assessed_value?: number;
  market_value?: number;

  // Images
  path_to_img_front?: string;
  path_to_img_rear?: string;
  path_to_img_left?: string;
  path_to_img_right?: string;

  // Flags
  is_parcel_cemetery: boolean;
  is_parcel_landuse_cemetery: boolean;
  is_parcel_water: boolean;
  is_parcel_railroad: boolean;
  is_parcel_airport: boolean;
  is_parcel_park: boolean;
  is_parcel_landuse_park: boolean;
  is_parcel_utility: boolean;
  is_parcel_subdivision_landuse_cemetery: boolean;

  // Metadata
  data_source?: string;
  raw_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Property Screenshot
 */
export interface Screenshot {
  id: string;
  property_id: string;
  screenshot_url: string;
  screenshot_type?: 'aerial' | 'street' | 'map' | 'regrid';
  source?: 'regrid' | 'google_maps' | 'zillow' | 'manual';
  created_at: string;
}

/**
 * Property Visual Validation
 */
export interface PropertyVisualValidation {
  id: string;
  property_id: string;

  // Validation results
  validation_status: 'approved' | 'rejected' | 'caution' | 'pending';
  rejection_reason?: string;
  caution_flags?: string[];

  // AI analysis
  ai_notes?: string;
  confidence_score?: number;

  // Inspector details
  validated_by?: string;
  validated_at?: string;

  // Images analyzed
  images_analyzed?: string[];

  created_at: string;
  updated_at: string;
}

// ============================================================
// RESEARCH AGENT TABLES
// ============================================================

/**
 * Official Link
 */
export interface OfficialLink {
  id: string;
  county_id: string;
  link_type: 'main_website' | 'tax_sale_page' | 'treasurer_office' | 'recorder_office' | 'gis_portal' | 'other';
  url: string;
  title?: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Upcoming Sale
 */
export interface UpcomingSale {
  id: string;
  county_id: string;
  sale_type: 'upset' | 'judicial' | 'repository' | 'online' | 'other';
  sale_date: string;
  registration_deadline?: string;
  deposit_amount?: number;
  deposit_required: boolean;
  platform?: string;
  location?: string;
  property_count?: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'postponed';
  sale_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Document
 */
export interface Document {
  id: string;
  county_id: string;
  document_type: 'property_list' | 'registration_form' | 'bidder_packet' | 'legal_notice' | 'sale_terms' | 'other';
  file_url?: string;
  title: string;
  description?: string;
  file_size?: number;
  file_format?: string;
  parsing_status?: 'pending' | 'in_progress' | 'complete' | 'failed';
  properties_extracted?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Vendor Portal
 */
export interface VendorPortal {
  id: string;
  county_id: string;
  vendor_name: string;
  vendor_url: string;
  account_required: boolean;
  registration_fee?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Additional Resource
 */
export interface AdditionalResource {
  id: string;
  county_id: string;
  resource_type: 'gis_portal' | 'assessment_office' | 'recorder_office' | 'court_records' | 'zoning_maps' | 'other';
  resource_name: string;
  url: string;
  description?: string;
  access_notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Important Note
 */
export interface ImportantNote {
  id: string;
  county_id: string;
  note_type: 'requirement' | 'tip' | 'warning' | 'deadline' | 'contact' | 'other';
  title: string;
  content: string;
  priority?: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

/**
 * Research Log
 */
export interface ResearchLog {
  id: string;
  county_id: string;
  research_type: 'initial' | 'refresh' | 'update' | 'verification';
  status: 'success' | 'partial' | 'failed';
  records_created: number;
  quality_score?: number;
  sources_used?: string[];
  notes?: string;
  error_message?: string;
  created_at: string;
}

// ============================================================
// PARSER AGENT TABLES
// ============================================================

/**
 * Parsing Job
 */
export interface ParsingJob {
  id: string;
  document_id: string;
  county_id: string;
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
  parsing_method?: 'universal' | 'playwright' | 'custom_python' | 'manual';
  properties_extracted: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Parsing Error
 */
export interface ParsingError {
  id: string;
  job_id: string;
  document_id: string;
  error_type: string;
  error_message: string;
  page_number?: number;
  raw_text?: string;
  created_at: string;
}

// ============================================================
// BATCH PROCESSING TABLES
// ============================================================

/**
 * Batch Job
 */
export interface BatchJob {
  id: string;
  job_type: 'regrid_scraping' | 'visual_validation' | 'property_condition' | 'environmental_research' | 'title_research' | 'bid_strategy' | 'pdf_parsing' | 'county_research';
  county_id?: string;
  status: 'pending' | 'in_progress' | 'paused' | 'complete' | 'failed';
  total_items: number;
  completed_items: number;
  failed_items: number;
  batch_size: number;
  current_batch?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  paused_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// ORCHESTRATION TABLES
// ============================================================

/**
 * Orchestration Session
 */
export interface OrchestrationSession {
  id: string;
  session_type: 'full_pipeline' | 'agent_specific' | 'bottleneck_resolution' | 'manual';
  trigger_type: 'manual' | 'scheduled' | 'n8n_webhook' | 'api';
  status: 'active' | 'completed' | 'failed' | 'paused';
  target_property_count?: number;
  max_concurrent_agents?: number;
  priority_rules?: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Agent Assignment
 */
export interface AgentAssignment {
  id: string;
  session_id: string;
  agent_name: string;
  work_type: string;
  county_id?: string;
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
  priority: number;
  items_assigned: number;
  items_completed: number;
  execution_method: 'n8n' | 'direct' | 'manual';
  n8n_workflow_id?: string;
  n8n_execution_id?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Pipeline Metrics
 */
export interface PipelineMetrics {
  id: string;
  metric_date: string;
  pipeline_stage: string;
  county_id?: string;
  items_processed: number;
  success_count: number;
  failure_count: number;
  avg_processing_time_seconds?: number;
  throughput_per_hour?: number;
  created_at: string;
}

/**
 * Orchestrator Priority Rule
 */
export interface OrchestratorPriorityRule {
  id: string;
  rule_name: string;
  rule_type: 'county_priority' | 'auction_urgency' | 'data_gaps' | 'custom';
  priority_score: number;
  conditions: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// AUCTION MONITORING TABLES
// ============================================================

/**
 * Auction Rules
 */
export interface AuctionRules {
  id: string;
  county_id: string;
  sale_id?: string;

  // Registration requirements
  registration_required: boolean;
  registration_deadline_days?: number;
  registration_fee?: number;
  registration_url?: string;

  // Deposit requirements
  deposit_required: boolean;
  deposit_amount?: number;
  deposit_percentage?: number;
  deposit_type?: 'cash' | 'cashiers_check' | 'wire' | 'credit_card' | 'other';

  // Bidding rules
  bid_increment?: number;
  minimum_bid?: number;
  online_bidding_available: boolean;
  bidding_platform?: string;

  // Payment requirements
  payment_deadline_days?: number;
  payment_methods?: string[];

  // Additional rules
  redemption_period_days?: number;
  buyer_premium_percentage?: number;

  // Source
  source_url?: string;
  rules_document_url?: string;

  created_at: string;
  updated_at: string;
}

/**
 * Auction Alert
 */
export interface AuctionAlert {
  id: string;
  county_id?: string;
  sale_id?: string;
  alert_type: 'auction_imminent' | 'registration_deadline' | 'new_auction' | 'property_list_available' | 'sale_postponed' | 'sale_cancelled';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  action_required?: boolean;
  days_until_event?: number;
  acknowledged: boolean;
  acknowledged_at?: string;
  created_at: string;
}

// ============================================================
// PROPERTY REPORT TABLES
// ============================================================

/**
 * Report Grade Enum
 */
export type ReportGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Report Status Enum
 */
export type ReportStatus = 'queued' | 'generating' | 'complete' | 'failed' | 'cancelled';

/**
 * Comparable Source Enum
 */
export type ComparableSource = 'realtor' | 'zillow' | 'redfin' | 'regrid' | 'manual' | 'mls';

/**
 * Queue Priority Enum
 */
export type QueuePriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Property Report
 */
export interface PropertyReport {
  id: string;
  property_id: string;
  user_id: string;

  // Scoring (125-point system)
  total_score?: number;
  grade?: ReportGrade;
  location_score?: number;
  risk_score?: number;
  financial_score?: number;
  market_score?: number;
  profit_score?: number;

  // Report content
  report_data: Record<string, unknown>;

  // Metadata
  confidence_level?: number;
  status: ReportStatus;
  error_message?: string;
  version: number;

  // Soft delete
  deleted_at?: string;

  // Timestamps
  generated_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Report Generation Queue
 */
export interface ReportGenerationQueue {
  id: string;
  report_id: string;
  property_id: string;
  user_id: string;

  // Queue status
  status: ReportStatus;
  priority: QueuePriority;

  // Processing metadata
  attempts: number;
  max_attempts: number;
  last_error?: string;
  error_count: number;

  // Processing timestamps
  queued_at: string;
  started_at?: string;
  completed_at?: string;
  next_retry_at?: string;

  // Worker tracking
  worker_id?: string;
  locked_at?: string;
  lock_expires_at?: string;

  created_at: string;
  updated_at: string;
}

/**
 * Report Share
 */
export interface ReportShare {
  id: string;
  report_id: string;
  share_token: string;

  // Expiration and tracking
  expires_at?: string;
  view_count: number;
  max_views?: number;
  last_viewed_at?: string;

  // Access control
  password_hash?: string;
  require_email: boolean;

  // Soft delete
  deleted_at?: string;

  // Metadata
  created_by?: string;
  created_at: string;
}

/**
 * Comparable Sale
 */
export interface ComparableSale {
  id: string;
  report_id: string;
  property_id?: string;
  external_id?: string;

  // Location
  address: string;
  city?: string;
  state?: string;
  zip?: string;

  // Sale details
  sale_price?: number;
  sale_date?: string;

  // Property characteristics
  sqft?: number;
  lot_size_sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  year_built?: number;
  property_type?: string;

  // Comparison metrics
  price_per_sqft?: number;
  distance_miles?: number;
  similarity_score?: number;

  // Raw data
  raw_data?: Record<string, unknown>;
  source?: ComparableSource;

  // Soft delete
  deleted_at?: string;

  created_at: string;
}

/**
 * Report API Cache
 */
export interface ReportApiCache {
  id: string;
  api_name: string;
  request_hash: string;
  latitude?: number;
  longitude?: number;
  response_data: Record<string, unknown>;
  response_status?: number;
  expires_at: string;
  hit_count: number;
  last_hit_at?: string;
  created_at: string;
}

// ============================================================
// FINANCIAL ANALYSIS TABLES
// ============================================================

/**
 * Property Financial Analysis
 */
export interface PropertyFinancialAnalysis {
  id: string;
  property_id: string;
  report_id?: string;

  // Valuation
  estimated_arv?: number;
  purchase_price?: number;

  // Costs
  acquisition_costs?: number;
  rehab_costs_min?: number;
  rehab_costs_max?: number;
  rehab_costs_expected?: number;
  holding_costs_monthly?: number;
  selling_costs?: number;
  total_costs?: number;

  // Returns
  estimated_profit?: number;
  roi_percentage?: number;
  profit_margin?: number;

  // Analysis details
  analysis_data?: Record<string, unknown>;
  confidence_level?: number;

  created_at: string;
  updated_at: string;
}

// ============================================================
// ZONING TABLES
// ============================================================

/**
 * Zoning Rule
 */
export interface ZoningRule {
  id: string;
  state_code: string;
  county_name?: string;
  zoning_code: string;
  zoning_name?: string;
  zoning_category?: 'residential' | 'commercial' | 'industrial' | 'mixed' | 'agricultural';

  // Permitted uses
  permitted_uses?: string[];
  conditional_uses?: string[];
  prohibited_uses?: string[];

  // Lot requirements
  min_lot_size_sqft?: number;
  min_lot_width_ft?: number;
  max_lot_coverage_pct?: number;

  // Setbacks
  front_setback_ft?: number;
  side_setback_ft?: number;
  rear_setback_ft?: number;
  corner_setback_ft?: number;

  // Height restrictions
  max_height_ft?: number;
  max_stories?: number;

  // Density
  max_units_per_acre?: number;
  min_lot_per_unit_sqft?: number;

  // Parking
  min_parking_spaces?: number;
  parking_notes?: string;

  // Source
  source_url?: string;
  source_document?: string;
  effective_date?: string;
  last_verified_at?: string;

  // Metadata
  notes?: string;
  is_default: boolean;

  created_at: string;
  updated_at: string;
}

// ============================================================
// UTILITY TYPES
// ============================================================

/**
 * Database Row Types (for Supabase)
 */
export interface Database {
  public: {
    Tables: {
      counties: { Row: County };
      properties: { Row: Property };
      regrid_data: { Row: RegridData };
      screenshots: { Row: Screenshot };
      property_visual_validation: { Row: PropertyVisualValidation };
      official_links: { Row: OfficialLink };
      upcoming_sales: { Row: UpcomingSale };
      documents: { Row: Document };
      vendor_portals: { Row: VendorPortal };
      additional_resources: { Row: AdditionalResource };
      important_notes: { Row: ImportantNote };
      research_log: { Row: ResearchLog };
      parsing_jobs: { Row: ParsingJob };
      parsing_errors: { Row: ParsingError };
      batch_jobs: { Row: BatchJob };
      orchestration_sessions: { Row: OrchestrationSession };
      agent_assignments: { Row: AgentAssignment };
      pipeline_metrics: { Row: PipelineMetrics };
      orchestrator_priority_rules: { Row: OrchestratorPriorityRule };
      auction_rules: { Row: AuctionRules };
      auction_alerts: { Row: AuctionAlert };
      property_reports: { Row: PropertyReport };
      report_generation_queue: { Row: ReportGenerationQueue };
      report_shares: { Row: ReportShare };
      comparable_sales: { Row: ComparableSale };
      report_api_cache: { Row: ReportApiCache };
      property_financial_analysis: { Row: PropertyFinancialAnalysis };
      zoning_rules: { Row: ZoningRule };
    };
  };
}

/**
 * Database Insert Types (for creating new records)
 */
export type DatabaseInsert<T extends keyof Database['public']['Tables']> =
  Omit<Database['public']['Tables'][T]['Row'], 'id' | 'created_at' | 'updated_at'>;

/**
 * Database Update Types (for updating records)
 */
export type DatabaseUpdate<T extends keyof Database['public']['Tables']> =
  Partial<DatabaseInsert<T>>;
