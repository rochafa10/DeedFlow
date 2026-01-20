-- Migration: 20260114000001_create_report_types.sql
-- Description: Create custom ENUM types for the Property Analysis Report System
-- Author: Claude Code Agent
-- Date: 2026-01-14

BEGIN;

-- ============================================
-- Report Grade Type (A-F letter grades)
-- Used for overall report scoring classification
-- ============================================
DO $$ BEGIN
  CREATE TYPE report_grade AS ENUM ('A', 'B', 'C', 'D', 'F');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE report_grade IS 'Letter grades A-F for property report scoring (125-point scale)';

-- ============================================
-- Report Status Type
-- Tracks the lifecycle of report generation
-- ============================================
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('queued', 'generating', 'complete', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE report_status IS 'Status tracking for report generation lifecycle';

-- ============================================
-- Comparable Source Type
-- Identifies the source of comparable sales data
-- ============================================
DO $$ BEGIN
  CREATE TYPE comparable_source AS ENUM ('realtor', 'zillow', 'redfin', 'regrid', 'manual', 'mls');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE comparable_source IS 'Data source for comparable property sales';

-- ============================================
-- Queue Priority Type
-- Defines priority levels for report generation queue
-- ============================================
DO $$ BEGIN
  CREATE TYPE queue_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE queue_priority IS 'Priority levels for the report generation queue';

COMMIT;
