/**
 * Property Analysis Report Components
 *
 * This module exports all report-related UI components for the
 * Tax Deed Flow property analysis system.
 *
 * @module components/report
 * @author Claude Code Agent
 * @date 2026-01-16
 */

// ============================================
// Layout Components
// ============================================
export * from './layout';

// ============================================
// Shared Components
// ============================================
export * from './shared';

// ============================================
// Chart Components
// ============================================
export * from './charts';

// ============================================
// Risk Analysis Components
// ============================================
export * from './risk';

// ============================================
// Comparables Components
// ============================================
export * from './comparables';

// ============================================
// Section Components (Main Report Sections)
// ============================================
export * from './sections';

// ============================================
// Financial Components
// ============================================
export { ROICalculatorCard } from './financial/ROICalculatorCard';

// ============================================
// Types Re-export
// ============================================
export type {
  Grade,
  RiskLevel,
  ValueFormat,
  TrendDirection,
  ComponentSize,
  InvestmentRating,
} from '@/types/report';

export { formatValue, gradeToRating, riskLevelToSeverity } from '@/types/report';
