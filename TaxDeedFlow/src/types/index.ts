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

// NOTE: Removed ShareConfig, SharePermissions, PropertyScore, ScoreWeights
// as they do not exist in their respective source modules
