/**
 * Scoring Categories Index
 *
 * This file exports all category scoring implementations.
 *
 * Categories (5 x 25 points = 125 total):
 * - Location: Neighborhood quality, accessibility, amenities
 * - Risk: Natural hazards, environmental, title concerns
 * - Financial: Tax efficiency, liens, holding costs
 * - Market: Supply/demand dynamics, appreciation trends
 * - Profit: ROI, cash flow, exit strategy viability
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type { CategoryScore, PropertyData, ExternalData } from '@/types/scoring';

// ============================================
// Category Exports
// ============================================

// Location Category (Implemented)
export {
  calculateLocationScore,
  calculateWalkabilityScore,
  calculateCrimeSafetyScore,
  calculateSchoolQualityScore,
  calculateAmenitiesScore,
  calculateTransitAccessScore,
  getLocationComponentIds,
  getLocationComponentConfig,
  hasCompleteLocationData,
  getLocationDataCompleteness,
} from './location';

// Risk Category (Implemented)
export {
  calculateRiskScore,
  calculateFloodZoneScore,
  calculateEnvironmentalHazardsScore,
  calculateStructuralRiskScore,
  calculateTitleIssuesScore,
  calculateZoningComplianceScore,
  getRiskComponentIds,
  getRiskComponentConfig,
  hasCompleteRiskData,
  getRiskDataCompleteness,
} from './risk';

// Financial Category (Placeholder - Phase 6D)
// export { calculateFinancialScore, financialComponents } from './financial';

// Market Category (Placeholder - Phase 6E)
// export { calculateMarketScore, marketComponents } from './market';

// Profit Category (Placeholder - Phase 6F)
// export { calculateProfitScore, profitComponents } from './profit';

// ============================================
// Type Definitions
// ============================================

/**
 * Type definition for category calculator functions
 * Each category will export a function matching this signature
 */
export type CategoryCalculator = (
  property: Partial<PropertyData>,
  externalData: Partial<ExternalData> | null
) => CategoryScore;

/**
 * Placeholder export for categories not yet implemented
 * Remove once all category implementations are added
 */
export const CATEGORY_IMPLEMENTATIONS_PENDING = true;
