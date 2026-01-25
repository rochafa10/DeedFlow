/**
 * Type Definitions Index
 *
 * This module exports all type definitions used throughout the
 * Tax Deed Flow application for centralized type management.
 *
 * @module types
 * @author Claude Code Agent
 * @date 2026-01-22
 */

// ============================================
// API Response Types
// ============================================
export type {
  ApiDataSource,
  ApiReportData,
  ApiResponse,
} from './api-report';

// ============================================
// Property Page Types
// ============================================
export type {
  PropertyDatabaseRow,
} from './property-page';

// ============================================
// Report Types
// ============================================
export type {
  Grade,
  RiskLevel,
  ValueFormat,
  TrendDirection,
  ComponentSize,
  InvestmentRating,
} from './report';

export { formatValue, gradeToRating, riskLevelToSeverity } from './report';

// ============================================
// Risk Analysis Types
// ============================================
export type {
  RiskAssessment,
  InsuranceEstimates,
} from './risk-analysis';

// ============================================
// Authentication Types
// ============================================
export type { User } from './auth';

// ============================================
// Dashboard Types
// ============================================
export type { DashboardStats } from './dashboard';

// ============================================
// Property Management Types
// ============================================
export type {
  NoteType,
  PropertyNote,
  CreatePropertyNoteRequest,
  UpdatePropertyNoteRequest,
  NoteTypeConfig,
  ActivityLogEntry,
  ActivityAction,
  PropertyImage,
  PropertyImageDetailed,
  ValidationStatus,
  ValidationStatusConfig,
  EnrichmentSourceStatus,
  ScreenshotEnrichmentStatus,
  ValidationEnrichmentStatus,
  DataEnrichmentStatus,
  PropertyNotesPanelProps,
  PropertyHistoryTimelineProps,
  ImageGalleryProps,
  DataEnrichmentStatusProps,
  PropertyActionBarProps,
} from './property-management';

export {
  NOTE_TYPE_CONFIG,
  VALIDATION_STATUS_CONFIG,
  DEFAULT_ENRICHMENT_STATUS,
} from './property-management';

// NOTE: Removed ShareConfig, SharePermissions, PropertyScore, ScoreWeights
// as they do not exist in their respective source modules
