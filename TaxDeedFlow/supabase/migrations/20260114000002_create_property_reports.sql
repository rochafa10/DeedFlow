-- Migration: 20260114000002_create_property_reports.sql
-- Description: Create main tables for the Property Analysis Report System
-- Author: Claude Code Agent
-- Date: 2026-01-14
-- Dependencies: 20260114000001_create_report_types.sql

BEGIN;

-- ============================================
-- Enable required extensions for geographic cache queries
-- ============================================
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- ============================================
-- Table: property_reports
-- Main table storing generated analysis reports
-- ============================================
CREATE TABLE IF NOT EXISTS property_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Scoring (125-point system: 5 categories x 25 points each)
  total_score INTEGER CHECK (total_score >= 0 AND total_score <= 125),
  grade report_grade,
  location_score INTEGER CHECK (location_score >= 0 AND location_score <= 25),
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 25),
  financial_score INTEGER CHECK (financial_score >= 0 AND financial_score <= 25),
  market_score INTEGER CHECK (market_score >= 0 AND market_score <= 25),
  profit_score INTEGER CHECK (profit_score >= 0 AND profit_score <= 25),

  -- Report content (JSONB for all 16 sections)
  report_data JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  confidence_level DECIMAL(5,2) CHECK (confidence_level >= 0 AND confidence_level <= 100),
  status report_status DEFAULT 'generating',
  error_message TEXT,
  version INTEGER DEFAULT 1,

  -- Soft delete support
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Single-column indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_property_reports_property ON property_reports(property_id);
CREATE INDEX IF NOT EXISTS idx_property_reports_user ON property_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_property_reports_status ON property_reports(status);
CREATE INDEX IF NOT EXISTS idx_property_reports_grade ON property_reports(grade);
CREATE INDEX IF NOT EXISTS idx_property_reports_score ON property_reports(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_property_reports_deleted ON property_reports(deleted_at) WHERE deleted_at IS NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_property_reports_user_created ON property_reports(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_property_reports_property_status ON property_reports(property_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_property_reports_grade_score ON property_reports(grade, total_score DESC) WHERE deleted_at IS NULL AND status = 'complete';
CREATE INDEX IF NOT EXISTS idx_property_reports_user_status ON property_reports(user_id, status, created_at DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE property_reports IS 'Main table storing property analysis reports with 125-point scoring system';
COMMENT ON COLUMN property_reports.total_score IS 'Sum of all 5 category scores (0-125)';
COMMENT ON COLUMN property_reports.grade IS 'Letter grade calculated from total_score';
COMMENT ON COLUMN property_reports.report_data IS 'JSONB containing all 16 report sections';

-- ============================================
-- Table: report_generation_queue
-- Queue for async report generation with worker locking
-- ============================================
CREATE TABLE IF NOT EXISTS report_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES property_reports(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Queue status
  status report_status DEFAULT 'queued',
  priority queue_priority DEFAULT 'normal',

  -- Processing metadata
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,

  -- Processing timestamps
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  -- Worker tracking (for distributed processing)
  worker_id TEXT,
  locked_at TIMESTAMPTZ,
  lock_expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queue operations
CREATE INDEX IF NOT EXISTS idx_queue_status_priority ON report_generation_queue(status, priority DESC, queued_at ASC) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_queue_report ON report_generation_queue(report_id);
CREATE INDEX IF NOT EXISTS idx_queue_user ON report_generation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_locked ON report_generation_queue(lock_expires_at) WHERE locked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_queue_retry ON report_generation_queue(next_retry_at) WHERE status = 'failed' AND attempts < max_attempts;

COMMENT ON TABLE report_generation_queue IS 'Async queue for report generation with worker locking support';
COMMENT ON COLUMN report_generation_queue.worker_id IS 'Identifier of the worker processing this item';
COMMENT ON COLUMN report_generation_queue.lock_expires_at IS 'Expiration time for worker lock to prevent stale locks';

-- ============================================
-- Table: report_shares
-- Token-based sharing for reports with expiration
-- ============================================
CREATE TABLE IF NOT EXISTS report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES property_reports(id) ON DELETE CASCADE,

  -- Share token (UUID v4 for secure, unguessable URLs)
  share_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

  -- Expiration and tracking
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  view_count INTEGER DEFAULT 0,
  max_views INTEGER, -- NULL = unlimited views
  last_viewed_at TIMESTAMPTZ,

  -- Access control
  password_hash TEXT, -- Optional password protection
  require_email BOOLEAN DEFAULT FALSE,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for share operations
CREATE INDEX IF NOT EXISTS idx_report_shares_token ON report_shares(share_token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_shares_report ON report_shares(report_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_shares_expires ON report_shares(expires_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_shares_created_by ON report_shares(created_by, created_at DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE report_shares IS 'Token-based sharing mechanism for property reports';
COMMENT ON COLUMN report_shares.share_token IS 'UUID token for public share URL';
COMMENT ON COLUMN report_shares.max_views IS 'Maximum allowed views, NULL for unlimited';

-- ============================================
-- Table: comparable_sales
-- Comparable properties for each report
-- ============================================
CREATE TABLE IF NOT EXISTS comparable_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES property_reports(id) ON DELETE CASCADE,

  -- Property reference (may or may not exist in our properties table)
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  external_id TEXT, -- ID from external API (Realtor.com, Zillow, etc.)

  -- Location
  address TEXT NOT NULL,
  city TEXT,
  state VARCHAR(2),
  zip VARCHAR(10),

  -- Sale details
  sale_price DECIMAL(12,2),
  sale_date DATE,

  -- Property characteristics
  sqft INTEGER,
  lot_size_sqft INTEGER,
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  year_built INTEGER,
  property_type TEXT,

  -- Comparison metrics
  price_per_sqft DECIMAL(10,2),
  distance_miles DECIMAL(5,2),
  similarity_score DECIMAL(5,2) CHECK (similarity_score >= 0 AND similarity_score <= 100),

  -- Raw data from API
  raw_data JSONB,
  source comparable_source,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for comparable queries
CREATE INDEX IF NOT EXISTS idx_comparable_sales_report ON comparable_sales(report_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comparable_sales_similarity ON comparable_sales(similarity_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comparable_sales_source ON comparable_sales(source) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comparable_sales_report_similarity ON comparable_sales(report_id, similarity_score DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE comparable_sales IS 'Comparable property sales used for market analysis in reports';
COMMENT ON COLUMN comparable_sales.similarity_score IS 'Score 0-100 indicating how similar this property is to the subject property';

-- ============================================
-- Table: report_api_cache
-- Cache external API responses to reduce costs and latency
-- ============================================
CREATE TABLE IF NOT EXISTS report_api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cache key (unique identifier for the request)
  api_name TEXT NOT NULL, -- 'fema', 'usgs', 'census', 'nasa_firms', 'realtor', etc.
  request_hash TEXT NOT NULL, -- MD5 hash of request parameters

  -- Location (for geographic proximity queries)
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),

  -- Cached response
  response_data JSONB NOT NULL,
  response_status INTEGER, -- HTTP status code

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,

  -- Usage tracking
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for cache lookup
  UNIQUE(api_name, request_hash)
);

-- Indexes for cache operations
CREATE INDEX IF NOT EXISTS idx_api_cache_lookup ON report_api_cache(api_name, request_hash);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON report_api_cache(expires_at);
-- Geographic index using earthdistance extension for proximity-based cache hits
CREATE INDEX IF NOT EXISTS idx_api_cache_location ON report_api_cache USING GIST (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON TABLE report_api_cache IS 'Cache for external API responses to reduce costs and improve latency';
COMMENT ON COLUMN report_api_cache.request_hash IS 'MD5 hash of request parameters for exact-match lookups';
COMMENT ON COLUMN report_api_cache.hit_count IS 'Number of times this cached response has been used';

COMMIT;
