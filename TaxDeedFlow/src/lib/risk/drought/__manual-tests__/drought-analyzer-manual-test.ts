/**
 * Manual Test Script for Drought Risk Analyzer
 *
 * This script provides manual testing for the drought risk analyzer.
 * Can be run in browser console or as a standalone test file.
 *
 * @module lib/risk/drought/__manual-tests__/drought-analyzer-manual-test
 * @author Claude Code Agent
 * @date 2026-01-22
 *
 * USAGE INSTRUCTIONS:
 * ===================
 * 1. Browser Console Method:
 *    - Open DevTools in your browser
 *    - Copy and paste the test functions into the console
 *    - Run: await testDroughtAnalyzer()
 *
 * 2. Import Method (in a React component or page):
 *    import { testDroughtAnalyzer } from '@/lib/risk/drought/__manual-tests__/drought-analyzer-manual-test';
 *    // Then call testDroughtAnalyzer() in useEffect or onClick handler
 */

import {
  analyzeDroughtRisk,
  getDroughtRiskScore,
  DROUGHT_SEVERITY_DEFINITIONS,
  DROUGHT_PRONE_STATES,
  createDefaultDroughtRisk,
} from '../drought-analyzer';
import type { DroughtRiskAnalysis, DroughtCategory } from '@/types/risk-analysis';

// ============================================
// Test Data - High-Risk State Coordinates
// ============================================

interface TestLocation {
  name: string;
  state: string;
  coordinates: { lat: number; lng: number };
  expectedRisk: 'minimal' | 'low' | 'moderate' | 'high' | 'very_high';
  description: string;
}

const TEST_LOCATIONS: TestLocation[] = [
  {
    name: 'Los Angeles, CA',
    state: 'CA',
    coordinates: { lat: 34.0522, lng: -118.2437 },
    expectedRisk: 'moderate', // CA has chronic drought issues
    description: 'Southern California - chronic drought area',
  },
  {
    name: 'Phoenix, AZ',
    state: 'AZ',
    coordinates: { lat: 33.4484, lng: -112.0740 },
    expectedRisk: 'high', // AZ is in drought 85% of the time
    description: 'Arizona - most drought-prone state',
  },
  {
    name: 'Austin, TX',
    state: 'TX',
    coordinates: { lat: 30.2672, lng: -97.7431 },
    expectedRisk: 'moderate', // TX has periodic severe droughts
    description: 'Central Texas - periodic severe drought',
  },
  {
    name: 'Albuquerque, NM',
    state: 'NM',
    coordinates: { lat: 35.0844, lng: -106.6504 },
    expectedRisk: 'high', // NM has severe drought 45% of the time
    description: 'New Mexico - high drought frequency',
  },
  {
    name: 'Las Vegas, NV',
    state: 'NV',
    coordinates: { lat: 36.1699, lng: -115.1398 },
    expectedRisk: 'very_high', // Most arid state
    description: 'Nevada - chronic drought, most arid state',
  },
  {
    name: 'Denver, CO',
    state: 'CO',
    coordinates: { lat: 39.7392, lng: -104.9903 },
    expectedRisk: 'moderate', // CO has severe drought 35% of the time
    description: 'Colorado - snowpack-dependent',
  },
  {
    name: 'Seattle, WA',
    state: 'WA',
    coordinates: { lat: 47.6062, lng: -122.3321 },
    expectedRisk: 'minimal', // Pacific Northwest is wet
    description: 'Washington - low drought risk (control test)',
  },
];

// ============================================
// Validation Helpers
// ============================================

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: unknown;
}

/**
 * Validate that a DroughtRiskAnalysis object has all required fields
 */
function validateAnalysisStructure(analysis: DroughtRiskAnalysis): ValidationResult {
  const requiredFields = [
    'riskLevel',
    'droughtCategory',
    'droughtDescription',
    'waterAvailability',
    'cropImpact',
    'mitigationRecommendations',
    'conservationStrategies',
    'dataSource',
    'confidence',
  ];

  const missingFields = requiredFields.filter(
    (field) => !(field in analysis) || analysis[field as keyof DroughtRiskAnalysis] === undefined
  );

  if (missingFields.length > 0) {
    return {
      passed: false,
      message: `Missing required fields: ${missingFields.join(', ')}`,
      details: { analysis, missingFields },
    };
  }

  return {
    passed: true,
    message: 'All required fields present',
  };
}

/**
 * Validate that risk level is appropriate for the location
 */
function validateRiskLevel(
  analysis: DroughtRiskAnalysis,
  expectedRisk: string
): ValidationResult {
  const riskLevels = ['minimal', 'low', 'moderate', 'high', 'very_high'];
  const actualIndex = riskLevels.indexOf(analysis.riskLevel);
  const expectedIndex = riskLevels.indexOf(expectedRisk);

  // Allow +/- 1 level variation due to current conditions
  const isReasonable = Math.abs(actualIndex - expectedIndex) <= 1;

  return {
    passed: isReasonable,
    message: isReasonable
      ? `Risk level ${analysis.riskLevel} is appropriate (expected ~${expectedRisk})`
      : `Risk level ${analysis.riskLevel} seems off (expected ~${expectedRisk})`,
    details: { actual: analysis.riskLevel, expected: expectedRisk },
  };
}

/**
 * Validate that mitigations are populated and relevant
 */
function validateMitigations(analysis: DroughtRiskAnalysis): ValidationResult {
  const { mitigationRecommendations, droughtCategory } = analysis;

  if (!Array.isArray(mitigationRecommendations)) {
    return {
      passed: false,
      message: 'mitigationRecommendations is not an array',
      details: { mitigationRecommendations },
    };
  }

  // No drought = minimal mitigations okay, drought = should have several
  const minExpected = droughtCategory === 'none' ? 0 : 3;
  const hasEnough = mitigationRecommendations.length >= minExpected;

  if (!hasEnough) {
    return {
      passed: false,
      message: `Only ${mitigationRecommendations.length} mitigations for ${droughtCategory} (expected >=${minExpected})`,
      details: { count: mitigationRecommendations.length, mitigationRecommendations },
    };
  }

  // Check that mitigations are non-empty strings
  const allValid = mitigationRecommendations.every(
    (m) => typeof m === 'string' && m.length > 10
  );

  return {
    passed: allValid && hasEnough,
    message: `${mitigationRecommendations.length} relevant mitigations provided`,
    details: { count: mitigationRecommendations.length },
  };
}

/**
 * Validate confidence score is reasonable (0-100)
 */
function validateConfidence(analysis: DroughtRiskAnalysis): ValidationResult {
  const { confidence } = analysis;

  if (typeof confidence !== 'number') {
    return {
      passed: false,
      message: 'Confidence is not a number',
      details: { confidence },
    };
  }

  if (confidence < 0 || confidence > 100) {
    return {
      passed: false,
      message: `Confidence ${confidence} is out of range (should be 0-100)`,
      details: { confidence },
    };
  }

  // API data should have higher confidence than fallback
  const isReasonable =
    (analysis.dataSource.type === 'api' && confidence >= 60) ||
    (analysis.dataSource.type === 'estimated' && confidence <= 50);

  return {
    passed: true,
    message: `Confidence score ${confidence}% is ${isReasonable ? 'reasonable' : 'questionable'} for ${analysis.dataSource.type}`,
    details: { confidence, dataSourceType: analysis.dataSource.type },
  };
}

/**
 * Validate drought category is valid
 */
function validateDroughtCategory(analysis: DroughtRiskAnalysis): ValidationResult {
  const validCategories: DroughtCategory[] = ['none', 'D0', 'D1', 'D2', 'D3', 'D4'];
  const isValid = validCategories.includes(analysis.droughtCategory);

  return {
    passed: isValid,
    message: isValid
      ? `Valid drought category: ${analysis.droughtCategory}`
      : `Invalid drought category: ${analysis.droughtCategory}`,
    details: { category: analysis.droughtCategory },
  };
}

// ============================================
// Test Functions
// ============================================

/**
 * Test a single location
 */
async function testLocation(location: TestLocation): Promise<{
  location: string;
  passed: boolean;
  results: ValidationResult[];
  analysis?: DroughtRiskAnalysis;
  error?: string;
}> {
  try {
    const analysis = await analyzeDroughtRisk(
      location.coordinates,
      location.state
    );

    const validations = [
      validateAnalysisStructure(analysis),
      validateDroughtCategory(analysis),
      validateRiskLevel(analysis, location.expectedRisk),
      validateMitigations(analysis),
      validateConfidence(analysis),
    ];

    const allPassed = validations.every((v) => v.passed);

    return {
      location: location.name,
      passed: allPassed,
      results: validations,
      analysis,
    };
  } catch (error) {
    return {
      location: location.name,
      passed: false,
      results: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test fallback behavior when service is unavailable
 */
function testFallbackBehavior(): {
  passed: boolean;
  results: ValidationResult[];
  analysis: DroughtRiskAnalysis;
} {
  // Test high-risk state fallback
  const caFallback = createDefaultDroughtRisk(
    { lat: 34.05, lng: -118.24 },
    'CA',
    'Service unavailable - testing fallback'
  );

  // Test low-risk state fallback (non-listed state)
  const waFallback = createDefaultDroughtRisk(
    { lat: 47.6, lng: -122.3 },
    'WA',
    'Service unavailable - testing fallback'
  );

  const validations: ValidationResult[] = [
    validateAnalysisStructure(caFallback),
    validateDroughtCategory(caFallback),
    {
      passed: caFallback.dataSource.type === 'estimated',
      message: `CA fallback data source is ${caFallback.dataSource.type} (should be estimated)`,
      details: { dataSource: caFallback.dataSource },
    },
    {
      passed: caFallback.droughtCategory === 'D0',
      message: `CA fallback category is ${caFallback.droughtCategory} (high-risk state should default to D0)`,
      details: { category: caFallback.droughtCategory },
    },
    {
      passed: waFallback.droughtCategory === 'none',
      message: `WA fallback category is ${waFallback.droughtCategory} (low-risk state should default to none)`,
      details: { category: waFallback.droughtCategory },
    },
    {
      passed: caFallback.confidence <= 50,
      message: `CA fallback confidence is ${caFallback.confidence}% (should be <=50 for estimated)`,
      details: { confidence: caFallback.confidence },
    },
  ];

  return {
    passed: validations.every((v) => v.passed),
    results: validations,
    analysis: caFallback,
  };
}

/**
 * Test risk score calculation
 */
function testRiskScore(): {
  passed: boolean;
  results: ValidationResult[];
} {
  // Create test analyses with different severity levels
  const testCases: Array<{ category: DroughtCategory; expectedScoreRange: [number, number] }> = [
    { category: 'none', expectedScoreRange: [0, 1] },
    { category: 'D0', expectedScoreRange: [0.5, 2] },
    { category: 'D1', expectedScoreRange: [1.5, 3] },
    { category: 'D2', expectedScoreRange: [2, 4] },
    { category: 'D3', expectedScoreRange: [3, 5] },
    { category: 'D4', expectedScoreRange: [3.5, 5] },
  ];

  const validations = testCases.map(({ category, expectedScoreRange }) => {
    const mockAnalysis = createDefaultDroughtRisk({ lat: 34, lng: -118 }, 'CA');
    mockAnalysis.droughtCategory = category;

    const score = getDroughtRiskScore(mockAnalysis);
    const [min, max] = expectedScoreRange;
    const inRange = score >= min && score <= max;

    return {
      passed: inRange,
      message: inRange
        ? `${category} score ${score} is in expected range [${min}, ${max}]`
        : `${category} score ${score} is outside expected range [${min}, ${max}]`,
      details: { category, score, expectedRange: expectedScoreRange },
    };
  });

  // Test null handling
  const nullScore = getDroughtRiskScore(null);
  validations.push({
    passed: nullScore === 0,
    message: `Null analysis returns score ${nullScore} (should be 0)`,
    details: { category: 'none' as DroughtCategory, score: nullScore, expectedRange: [0, 0] as [number, number] },
  });

  return {
    passed: validations.every((v) => v.passed),
    results: validations,
  };
}

// ============================================
// Main Test Runner
// ============================================

/**
 * Run all manual tests for drought analyzer
 *
 * @returns Test results summary
 */
export async function testDroughtAnalyzer(): Promise<{
  summary: {
    total: number;
    passed: number;
    failed: number;
    successRate: string;
  };
  locationTests: Awaited<ReturnType<typeof testLocation>>[];
  fallbackTest: ReturnType<typeof testFallbackBehavior>;
  scoreTest: ReturnType<typeof testRiskScore>;
}> {
  console.group('🌵 Drought Risk Analyzer - Manual Tests');
  console.log('Starting comprehensive manual testing...\n');

  // Test all locations
  console.group('📍 Location Tests');
  const locationTests = await Promise.all(
    TEST_LOCATIONS.map(async (location) => {
      const result = await testLocation(location);
      console.group(`${result.passed ? '✅' : '❌'} ${location.name} (${location.state})`);
      console.log(`Description: ${location.description}`);
      if (result.error) {
        console.error(`Error: ${result.error}`);
      } else if (result.analysis) {
        console.log(`Risk Level: ${result.analysis.riskLevel}`);
        console.log(`Drought Category: ${result.analysis.droughtCategory}`);
        console.log(`Water Availability: ${result.analysis.waterAvailability}`);
        console.log(`Confidence: ${result.analysis.confidence}%`);
        console.log(`Mitigations: ${result.analysis.mitigationRecommendations.length}`);
        console.log(`Data Source: ${result.analysis.dataSource.type}`);
      }
      result.results.forEach((v) => {
        console.log(`  ${v.passed ? '✓' : '✗'} ${v.message}`);
      });
      console.groupEnd();
      return result;
    })
  );
  console.groupEnd();

  // Test fallback behavior
  console.group('🔄 Fallback Behavior Test');
  const fallbackTest = testFallbackBehavior();
  console.log(`${fallbackTest.passed ? '✅' : '❌'} Fallback Test`);
  fallbackTest.results.forEach((v) => {
    console.log(`  ${v.passed ? '✓' : '✗'} ${v.message}`);
  });
  console.groupEnd();

  // Test risk scoring
  console.group('📊 Risk Score Calculation Test');
  const scoreTest = testRiskScore();
  console.log(`${scoreTest.passed ? '✅' : '❌'} Score Calculation Test`);
  scoreTest.results.forEach((v) => {
    console.log(`  ${v.passed ? '✓' : '✗'} ${v.message}`);
  });
  console.groupEnd();

  // Calculate summary
  const totalTests =
    locationTests.length + 1 + 1; // locations + fallback + score
  const passedTests =
    locationTests.filter((t) => t.passed).length +
    (fallbackTest.passed ? 1 : 0) +
    (scoreTest.passed ? 1 : 0);

  const summary = {
    total: totalTests,
    passed: passedTests,
    failed: totalTests - passedTests,
    successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
  };

  console.log('\n📈 Summary:');
  console.log(`Total Tests: ${summary.total}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Success Rate: ${summary.successRate}`);

  if (summary.failed === 0) {
    console.log('\n✅ All tests passed! Drought analyzer is working correctly.');
  } else {
    console.warn(`\n⚠️ ${summary.failed} test(s) failed. Review results above.`);
  }

  console.groupEnd();

  return {
    summary,
    locationTests,
    fallbackTest,
    scoreTest,
  };
}

// ============================================
// Quick Test Helpers
// ============================================

/**
 * Quick test for a single state
 * Usage: await quickTest('CA', 34.05, -118.24)
 */
export async function quickTest(
  stateCode: string,
  lat: number,
  lng: number
): Promise<DroughtRiskAnalysis> {
  console.log(`Testing ${stateCode} at (${lat}, ${lng})...`);
  const result = await analyzeDroughtRisk({ lat, lng }, stateCode);
  console.log('Result:', result);
  return result;
}

/**
 * Export constants for manual testing
 */
export const testConstants = {
  DROUGHT_SEVERITY_DEFINITIONS,
  DROUGHT_PRONE_STATES,
  TEST_LOCATIONS,
};

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as unknown as { testDroughtAnalyzer?: typeof testDroughtAnalyzer }).testDroughtAnalyzer = testDroughtAnalyzer;
  (window as unknown as { quickTest?: typeof quickTest }).quickTest = quickTest;
}
