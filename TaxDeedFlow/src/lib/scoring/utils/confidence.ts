/**
 * Confidence Calculation Utilities
 *
 * This file contains functions for calculating confidence levels
 * in scoring results. Confidence reflects how reliable the score
 * is based on data quality, source reliability, and completeness.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type {
  ConfidenceResult,
  ConfidenceFactor,
  ConfidenceLabel,
  DataAvailability,
  DataSource,
  ComponentScore,
  CategoryScore,
} from '@/types/scoring';
import { CONFIDENCE_THRESHOLDS } from '../constants';

/**
 * Calculate overall confidence from multiple factors
 *
 * @param factors - Array of confidence factors
 * @returns ConfidenceResult with overall score and label
 *
 * @example
 * calculateConfidence([
 *   { name: 'Data Completeness', impact: 20, weight: 0.4, status: 'positive', description: '80% complete' },
 *   { name: 'Source Reliability', impact: 15, weight: 0.3, status: 'positive', description: 'High reliability' },
 *   { name: 'Data Freshness', impact: -5, weight: 0.3, status: 'neutral', description: '6 months old' },
 * ]);
 */
export function calculateConfidence(
  factors: ConfidenceFactor[]
): ConfidenceResult {
  // Start with base confidence of 50%
  let baseConfidence = 50;

  // Calculate weighted impact from all factors
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);

  if (totalWeight > 0) {
    const weightedImpact = factors.reduce(
      (sum, f) => sum + (f.impact * f.weight) / totalWeight,
      0
    );
    baseConfidence += weightedImpact;
  }

  // Clamp to 0-100 range
  const overall = Math.max(0, Math.min(100, Math.round(baseConfidence)));

  // Determine confidence label
  const label = getConfidenceLabel(overall);

  // Generate recommendations for low confidence
  const recommendations = generateConfidenceRecommendations(factors);

  return {
    overall,
    label,
    factors,
    recommendations,
  };
}

/**
 * Get human-readable confidence label from numeric score
 *
 * @param confidence - Confidence percentage (0-100)
 * @returns Confidence label
 */
export function getConfidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= CONFIDENCE_THRESHOLDS.VERY_HIGH.min) {
    return CONFIDENCE_THRESHOLDS.VERY_HIGH.label;
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH.min) {
    return CONFIDENCE_THRESHOLDS.HIGH.label;
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.MODERATE.min) {
    return CONFIDENCE_THRESHOLDS.MODERATE.label;
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.LOW.min) {
    return CONFIDENCE_THRESHOLDS.LOW.label;
  }
  return CONFIDENCE_THRESHOLDS.VERY_LOW.label;
}

/**
 * Create a confidence factor from data availability
 *
 * @param availability - Data availability information
 * @returns ConfidenceFactor reflecting data completeness
 */
export function createDataCompletenessFactor(
  availability: DataAvailability
): ConfidenceFactor {
  const completeness = availability.completenessScore;

  // Calculate impact: 100% completeness = +30 impact, 0% = -20 impact
  // Linear scale from -20 to +30
  const impact = (completeness / 100) * 50 - 20;

  // Determine status based on completeness
  let status: 'positive' | 'neutral' | 'negative';
  if (completeness >= 75) {
    status = 'positive';
  } else if (completeness >= 50) {
    status = 'neutral';
  } else {
    status = 'negative';
  }

  // Create description
  let description: string;
  if (completeness >= 90) {
    description = `Excellent data completeness (${completeness}%)`;
  } else if (completeness >= 75) {
    description = `Good data completeness (${completeness}%)`;
  } else if (completeness >= 50) {
    description = `Moderate data completeness (${completeness}%)`;
  } else if (completeness >= 25) {
    description = `Limited data available (${completeness}%)`;
  } else {
    description = `Very limited data (${completeness}%)`;
  }

  // Note critical missing fields
  if (availability.missingCriticalFields.length > 0) {
    description += `. Missing critical: ${availability.missingCriticalFields.join(', ')}`;
  }

  return {
    name: 'Data Completeness',
    impact,
    weight: 0.4, // 40% of confidence calculation
    status,
    description,
  };
}

/**
 * Create a confidence factor from data source reliability
 *
 * @param sources - Array of data sources used in scoring
 * @returns ConfidenceFactor reflecting source quality
 */
export function createSourceReliabilityFactor(
  sources: DataSource[]
): ConfidenceFactor {
  if (sources.length === 0) {
    return {
      name: 'Source Reliability',
      impact: -20,
      weight: 0.3,
      status: 'negative',
      description: 'No data sources available',
    };
  }

  // Count reliability levels
  const counts = { high: 0, medium: 0, low: 0 };
  sources.forEach((s) => {
    counts[s.reliability]++;
  });

  // Calculate reliability score (0-100)
  const totalSources = sources.length;
  const reliabilityScore =
    ((counts.high * 100 + counts.medium * 60 + counts.low * 20) / totalSources);

  // Convert to impact (-15 to +25)
  const impact = (reliabilityScore / 100) * 40 - 15;

  // Determine status
  let status: 'positive' | 'neutral' | 'negative';
  if (reliabilityScore >= 75) {
    status = 'positive';
  } else if (reliabilityScore >= 50) {
    status = 'neutral';
  } else {
    status = 'negative';
  }

  // Create description
  const description = `${counts.high} high, ${counts.medium} medium, ${counts.low} low reliability sources`;

  return {
    name: 'Source Reliability',
    impact,
    weight: 0.3, // 30% of confidence calculation
    status,
    description,
  };
}

/**
 * Create a confidence factor from data freshness
 *
 * @param sources - Array of data sources with timestamps
 * @returns ConfidenceFactor reflecting data recency
 */
export function createDataFreshnessFactor(
  sources: DataSource[]
): ConfidenceFactor {
  const now = new Date();
  const sourcesWithDates = sources.filter((s) => s.lastUpdated);

  if (sourcesWithDates.length === 0) {
    return {
      name: 'Data Freshness',
      impact: -10,
      weight: 0.15,
      status: 'neutral',
      description: 'Data freshness unknown',
    };
  }

  // Calculate average age in days
  const totalDays = sourcesWithDates.reduce((sum, s) => {
    const ageMs = now.getTime() - (s.lastUpdated?.getTime() || 0);
    return sum + ageMs / (1000 * 60 * 60 * 24);
  }, 0);
  const avgAgeDays = totalDays / sourcesWithDates.length;

  // Calculate impact based on age
  // < 30 days: +15
  // 30-90 days: +5
  // 90-180 days: 0
  // 180-365 days: -5
  // > 365 days: -15
  let impact: number;
  let description: string;
  let status: 'positive' | 'neutral' | 'negative';

  if (avgAgeDays < 30) {
    impact = 15;
    status = 'positive';
    description = `Very recent data (avg ${Math.round(avgAgeDays)} days old)`;
  } else if (avgAgeDays < 90) {
    impact = 5;
    status = 'positive';
    description = `Recent data (avg ${Math.round(avgAgeDays)} days old)`;
  } else if (avgAgeDays < 180) {
    impact = 0;
    status = 'neutral';
    description = `Moderately recent data (avg ${Math.round(avgAgeDays)} days old)`;
  } else if (avgAgeDays < 365) {
    impact = -5;
    status = 'neutral';
    description = `Older data (avg ${Math.round(avgAgeDays)} days old)`;
  } else {
    impact = -15;
    status = 'negative';
    description = `Stale data (avg ${Math.round(avgAgeDays / 30)} months old)`;
  }

  return {
    name: 'Data Freshness',
    impact,
    weight: 0.15, // 15% of confidence calculation
    status,
    description,
  };
}

/**
 * Create a confidence factor from scoring consistency
 *
 * @param categoryScores - Array of category scores
 * @returns ConfidenceFactor reflecting score consistency
 */
export function createConsistencyFactor(
  categoryScores: CategoryScore[]
): ConfidenceFactor {
  if (categoryScores.length === 0) {
    return {
      name: 'Score Consistency',
      impact: 0,
      weight: 0.15,
      status: 'neutral',
      description: 'No scores to evaluate',
    };
  }

  // Calculate standard deviation of category confidences
  const confidences = categoryScores.map((c) => c.confidence);
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

  const variance =
    confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) /
    confidences.length;
  const stdDev = Math.sqrt(variance);

  // Lower standard deviation = more consistent = higher confidence
  // stdDev < 10: +10 impact
  // stdDev 10-20: +5 impact
  // stdDev 20-30: 0 impact
  // stdDev > 30: -10 impact
  let impact: number;
  let status: 'positive' | 'neutral' | 'negative';
  let description: string;

  if (stdDev < 10) {
    impact = 10;
    status = 'positive';
    description = 'Very consistent scoring across categories';
  } else if (stdDev < 20) {
    impact = 5;
    status = 'positive';
    description = 'Consistent scoring across categories';
  } else if (stdDev < 30) {
    impact = 0;
    status = 'neutral';
    description = 'Moderate variation in category confidence';
  } else {
    impact = -10;
    status = 'negative';
    description = 'High variation in category confidence - some categories have limited data';
  }

  return {
    name: 'Score Consistency',
    impact,
    weight: 0.15, // 15% of confidence calculation
    status,
    description,
  };
}

/**
 * Calculate confidence for a single category
 *
 * @param category - Category score with components
 * @returns Confidence percentage for the category (0-100)
 */
export function calculateCategoryConfidence(category: CategoryScore): number {
  if (category.components.length === 0) {
    return 0;
  }

  // Average the component confidences, weighted by score contribution
  let weightedConfidence = 0;
  let totalWeight = 0;

  for (const component of category.components) {
    // Weight by the actual score (higher scores contribute more)
    const weight = component.score / 5;
    weightedConfidence += component.confidence * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    // All components have 0 score - use simple average
    return (
      category.components.reduce((sum, c) => sum + c.confidence, 0) /
      category.components.length
    );
  }

  // Apply data completeness modifier
  const completenessModifier = category.dataCompleteness / 100;
  const baseConfidence = weightedConfidence / totalWeight;

  return Math.round(baseConfidence * (0.7 + 0.3 * completenessModifier));
}

/**
 * Generate recommendations to improve confidence
 *
 * @param factors - Array of confidence factors
 * @returns Array of actionable recommendations
 */
export function generateConfidenceRecommendations(
  factors: ConfidenceFactor[]
): string[] {
  const recommendations: string[] = [];

  for (const factor of factors) {
    if (factor.status === 'negative') {
      // Generate recommendation based on factor type
      switch (factor.name) {
        case 'Data Completeness':
          recommendations.push(
            'Add more property data to improve scoring accuracy'
          );
          break;
        case 'Source Reliability':
          recommendations.push(
            'Verify data with more reliable sources (official records, FEMA, EPA)'
          );
          break;
        case 'Data Freshness':
          recommendations.push('Update property data - some information may be outdated');
          break;
        case 'Score Consistency':
          recommendations.push(
            'Review categories with low confidence - data gaps may affect accuracy'
          );
          break;
        default:
          recommendations.push(`Address ${factor.name} to improve confidence`);
      }
    }
  }

  // Add general recommendation if overall confidence is low
  const overallImpact = factors.reduce((sum, f) => sum + f.impact * f.weight, 0);
  if (overallImpact < 0) {
    recommendations.push(
      'Consider gathering additional data before making investment decisions'
    );
  }

  return recommendations;
}

/**
 * Check if confidence meets minimum threshold for decision-making
 *
 * @param confidence - Confidence percentage (0-100)
 * @param threshold - Minimum required confidence (default: 50)
 * @returns Boolean indicating if confidence is sufficient
 */
export function meetsConfidenceThreshold(
  confidence: number,
  threshold: number = 50
): boolean {
  return confidence >= threshold;
}

/**
 * Get confidence color for UI display
 *
 * @param confidence - Confidence percentage (0-100)
 * @returns Tailwind color class suffix
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return 'emerald';
  if (confidence >= 75) return 'green';
  if (confidence >= 50) return 'yellow';
  if (confidence >= 25) return 'orange';
  return 'red';
}
