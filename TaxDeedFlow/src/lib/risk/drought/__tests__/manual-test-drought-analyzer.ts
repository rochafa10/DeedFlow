/**
 * Manual Test Script for Drought Risk Analyzer
 *
 * This script can be run in the browser console or as a standalone test
 * to verify the drought analyzer functionality.
 *
 * USAGE IN BROWSER CONSOLE:
 * 1. Navigate to any page in the Tax Deed Flow app
 * 2. Open browser developer console (F12)
 * 3. Copy and paste this entire script
 * 4. Results will be logged to console with visual formatting
 *
 * TEST COVERAGE:
 * - High-risk state coordinates (CA, AZ, TX)
 * - Low-risk state coordinates (WA)
 * - Drought severity classification
 * - Mitigation recommendations quality
 * - Risk score calculation
 * - Fallback behavior
 *
 * @module lib/risk/drought/__tests__/manual-test-drought-analyzer
 * @author Claude Code Agent
 * @date 2026-01-22
 */

import { analyzeDroughtRisk, getDroughtRiskScore, DROUGHT_SEVERITY_DEFINITIONS } from '../drought-analyzer';
import type { DroughtRiskAnalysis, DroughtCategory } from '@/types/risk-analysis';

// ============================================
// Test Data - High-Risk State Coordinates
// ============================================

const TEST_LOCATIONS = [
  {
    name: 'Los Angeles, California',
    coordinates: { lat: 34.05, lng: -118.24 },
    stateCode: 'CA',
    expectedRisk: 'high',
    description: 'High drought-prone state with chronic water issues'
  },
  {
    name: 'Phoenix, Arizona',
    coordinates: { lat: 33.45, lng: -112.07 },
    stateCode: 'AZ',
    expectedRisk: 'high',
    description: 'Extreme drought-prone state (in drought 85% of last 20 years)'
  },
  {
    name: 'Austin, Texas',
    coordinates: { lat: 30.27, lng: -97.74 },
    stateCode: 'TX',
    expectedRisk: 'moderate-high',
    description: 'High drought-prone state with periodic severe droughts'
  },
  {
    name: 'Seattle, Washington',
    coordinates: { lat: 47.61, lng: -122.33 },
    stateCode: 'WA',
    expectedRisk: 'low',
    description: 'Low drought-prone state - baseline comparison'
  }
];

// ============================================
// Test Helper Functions
// ============================================

/**
 * Format test results for console output
 */
function formatTestResult(passed: boolean, testName: string, details?: string): void {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'color: green' : 'color: red';
  console.log(`%c${icon} ${testName}`, color);
  if (details) {
    console.log(`   ${details}`);
  }
}

/**
 * Validate DroughtRiskAnalysis object structure
 */
function validateAnalysisStructure(analysis: DroughtRiskAnalysis): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!analysis.riskLevel) errors.push('Missing riskLevel');
  if (!analysis.droughtCategory) errors.push('Missing droughtCategory');
  if (!analysis.waterAvailability) errors.push('Missing waterAvailability');
  if (!analysis.cropImpact) errors.push('Missing cropImpact');
  if (!analysis.dataSource) errors.push('Missing dataSource');
  if (typeof analysis.confidence !== 'number') errors.push('Missing or invalid confidence');

  // Arrays should be present (even if empty)
  if (!Array.isArray(analysis.mitigationRecommendations)) {
    errors.push('mitigationRecommendations must be an array');
  }
  if (!Array.isArray(analysis.conservationStrategies)) {
    errors.push('conservationStrategies must be an array');
  }
  if (!Array.isArray(analysis.waterRestrictions)) {
    errors.push('waterRestrictions must be an array');
  }

  // Drought category should be valid
  const validCategories: DroughtCategory[] = ['none', 'D0', 'D1', 'D2', 'D3', 'D4'];
  if (!validCategories.includes(analysis.droughtCategory)) {
    errors.push(`Invalid droughtCategory: ${analysis.droughtCategory}`);
  }

  // Confidence should be 0-100
  if (analysis.confidence < 0 || analysis.confidence > 100) {
    errors.push(`Confidence out of range: ${analysis.confidence}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate mitigation recommendations quality
 */
function validateMitigations(analysis: DroughtRiskAnalysis): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Should have mitigations for any drought condition
  if (analysis.droughtCategory !== 'none') {
    if (analysis.mitigationRecommendations.length === 0) {
      issues.push('No mitigation recommendations for drought condition');
    }
    if (analysis.conservationStrategies.length === 0) {
      issues.push('No conservation strategies for drought condition');
    }

    // Severe drought should have more mitigations
    if (['D2', 'D3', 'D4'].includes(analysis.droughtCategory)) {
      if (analysis.mitigationRecommendations.length < 5) {
        issues.push('Severe drought should have at least 5 mitigation recommendations');
      }
    }

    // Check for key mitigation themes
    const mitigationsText = analysis.mitigationRecommendations.join(' ').toLowerCase();
    const hasWaterEfficiency = mitigationsText.includes('water') || mitigationsText.includes('irrigation');
    const hasLandscaping = mitigationsText.includes('landscap') || mitigationsText.includes('xeriscap');

    if (!hasWaterEfficiency) {
      issues.push('Missing water efficiency recommendations');
    }
    if (!hasLandscaping) {
      issues.push('Missing landscaping recommendations');
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Validate risk score calculation
 */
function validateRiskScore(analysis: DroughtRiskAnalysis): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const score = getDroughtRiskScore(analysis);

  // Score should be 0-5
  if (score < 0 || score > 5) {
    issues.push(`Risk score out of range: ${score}`);
  }

  // Score should correlate with drought category
  const categoryScores: Record<DroughtCategory, number> = {
    'none': 0.5,
    'D0': 1.5,
    'D1': 2.5,
    'D2': 3.5,
    'D3': 4.5,
    'D4': 4.5
  };

  const expectedMinScore = categoryScores[analysis.droughtCategory] - 1.0;
  const expectedMaxScore = categoryScores[analysis.droughtCategory] + 1.5;

  if (score < expectedMinScore || score > expectedMaxScore) {
    issues.push(
      `Risk score ${score} outside expected range ${expectedMinScore}-${expectedMaxScore} for ${analysis.droughtCategory}`
    );
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

// ============================================
// Main Test Functions
// ============================================

/**
 * Test a single location
 */
async function testLocation(location: typeof TEST_LOCATIONS[0]): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log(`Testing: ${location.name} (${location.stateCode})`);
  console.log('='.repeat(60));

  try {
    // Call analyzer
    const analysis = await analyzeDroughtRisk(location.coordinates, location.stateCode);

    console.log('\n📊 Analysis Results:');
    console.log(`   Risk Level: ${analysis.riskLevel}`);
    console.log(`   Drought Category: ${analysis.droughtCategory}`);
    console.log(`   Water Availability: ${analysis.waterAvailability}`);
    console.log(`   Crop Impact: ${analysis.cropImpact}`);
    console.log(`   Confidence: ${analysis.confidence}%`);
    console.log(`   Data Source: ${analysis.dataSource.name}`);
    console.log(`   Mitigations: ${analysis.mitigationRecommendations.length}`);
    console.log(`   Conservation Strategies: ${analysis.conservationStrategies.length}`);

    // Test 1: Structure validation
    const structureTest = validateAnalysisStructure(analysis);
    formatTestResult(
      structureTest.valid,
      'DroughtRiskAnalysis object structure',
      structureTest.errors.join(', ')
    );

    // Test 2: Mitigation quality
    const mitigationTest = validateMitigations(analysis);
    formatTestResult(
      mitigationTest.valid,
      'Mitigation recommendations quality',
      mitigationTest.issues.join(', ')
    );

    // Test 3: Risk score
    const scoreTest = validateRiskScore(analysis);
    const score = getDroughtRiskScore(analysis);
    formatTestResult(
      scoreTest.valid,
      `Risk score calculation (Score: ${score}/5)`,
      scoreTest.issues.join(', ')
    );

    // Test 4: Risk level appropriateness
    const riskLevels = ['minimal', 'low', 'moderate', 'high', 'very_high'];
    const hasValidRiskLevel = riskLevels.includes(analysis.riskLevel);
    formatTestResult(
      hasValidRiskLevel,
      'Risk level is valid',
      hasValidRiskLevel ? `Level: ${analysis.riskLevel}` : `Invalid: ${analysis.riskLevel}`
    );

    // Test 5: Confidence score reasonableness
    const hasReasonableConfidence = analysis.confidence >= 0 && analysis.confidence <= 100;
    formatTestResult(
      hasReasonableConfidence,
      'Confidence score is reasonable',
      `${analysis.confidence}%`
    );

    // Print sample mitigations
    console.log('\n📋 Sample Mitigations (first 3):');
    analysis.mitigationRecommendations.slice(0, 3).forEach((m, i) => {
      console.log(`   ${i + 1}. ${m}`);
    });

    const allTestsPassed =
      structureTest.valid &&
      mitigationTest.valid &&
      scoreTest.valid &&
      hasValidRiskLevel &&
      hasReasonableConfidence;

    return allTestsPassed;

  } catch (error) {
    formatTestResult(false, 'Analyzer execution', `Error: ${error}`);
    return false;
  }
}

/**
 * Test fallback behavior
 */
async function testFallbackBehavior(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('Testing: Fallback Behavior (Invalid State)');
  console.log('='.repeat(60));

  try {
    // Test with a state code that doesn't exist in DROUGHT_PRONE_STATES
    const analysis = await analyzeDroughtRisk(
      { lat: 40.71, lng: -74.01 }, // New York
      'NY' // Not in DROUGHT_PRONE_STATES
    );

    console.log('\n📊 Fallback Analysis Results:');
    console.log(`   Risk Level: ${analysis.riskLevel}`);
    console.log(`   Drought Category: ${analysis.droughtCategory}`);
    console.log(`   Data Source: ${analysis.dataSource.name}`);
    console.log(`   Confidence: ${analysis.confidence}%`);

    // Fallback should return a valid analysis
    const structureTest = validateAnalysisStructure(analysis);
    formatTestResult(
      structureTest.valid,
      'Fallback returns valid structure',
      structureTest.errors.join(', ')
    );

    // Fallback should have lower confidence
    const hasLowConfidence = analysis.confidence < 50;
    formatTestResult(
      hasLowConfidence,
      'Fallback has appropriately low confidence',
      `${analysis.confidence}%`
    );

    // Should indicate estimated data
    const isEstimated =
      analysis.dataSource.type === 'estimated' ||
      analysis.droughtDescription?.includes('Estimated');
    formatTestResult(
      isEstimated,
      'Fallback indicates estimated data',
      `Type: ${analysis.dataSource.type}`
    );

    return structureTest.valid && hasLowConfidence && isEstimated;

  } catch (error) {
    formatTestResult(false, 'Fallback behavior', `Error: ${error}`);
    return false;
  }
}

/**
 * Test drought severity definitions
 */
function testDroughtDefinitions(): boolean {
  console.log('\n' + '='.repeat(60));
  console.log('Testing: Drought Severity Definitions');
  console.log('='.repeat(60));

  let allValid = true;

  // Test all categories are defined
  const requiredCategories: DroughtCategory[] = ['none', 'D0', 'D1', 'D2', 'D3', 'D4'];
  requiredCategories.forEach(category => {
    const def = DROUGHT_SEVERITY_DEFINITIONS[category];
    const hasDefinition = !!def;
    formatTestResult(
      hasDefinition,
      `Category ${category} is defined`,
      hasDefinition ? `${def.riskLevel}: ${def.description.substring(0, 50)}...` : 'Missing'
    );
    if (!hasDefinition) allValid = false;

    // Each definition should have required fields
    if (hasDefinition) {
      const hasFields =
        def.riskLevel &&
        def.description &&
        Array.isArray(def.waterRestrictions) &&
        def.agriculturalImpact &&
        def.landValueImpact &&
        def.cropImpact;

      if (!hasFields) {
        formatTestResult(false, `  Category ${category} missing required fields`);
        allValid = false;
      }
    }
  });

  return allValid;
}

// ============================================
// Main Test Runner
// ============================================

/**
 * Run all tests
 */
export async function runDroughtAnalyzerTests(): Promise<void> {
  console.clear();
  console.log('\n' + '🌵'.repeat(30));
  console.log('%c DROUGHT RISK ANALYZER - MANUAL TEST SUITE', 'font-size: 16px; font-weight: bold; color: #ff6b35');
  console.log('🌵'.repeat(30) + '\n');

  const results: { name: string; passed: boolean }[] = [];

  // Test 1: Drought definitions
  console.log('\n📚 Phase 1: Testing Drought Definitions');
  const definitionsPass = testDroughtDefinitions();
  results.push({ name: 'Drought Definitions', passed: definitionsPass });

  // Test 2: High-risk locations
  console.log('\n\n🌎 Phase 2: Testing High-Risk Locations');
  for (const location of TEST_LOCATIONS) {
    const passed = await testLocation(location);
    results.push({ name: location.name, passed });

    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test 3: Fallback behavior
  console.log('\n\n🔄 Phase 3: Testing Fallback Behavior');
  const fallbackPass = await testFallbackBehavior();
  results.push({ name: 'Fallback Behavior', passed: fallbackPass });

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('%c TEST SUMMARY', 'font-size: 14px; font-weight: bold');
  console.log('='.repeat(60));

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const passRate = ((passedCount / totalCount) * 100).toFixed(1);

  results.forEach(result => {
    formatTestResult(result.passed, result.name);
  });

  console.log('\n' + '-'.repeat(60));
  const summaryColor = passedCount === totalCount ? 'color: green; font-weight: bold' : 'color: orange; font-weight: bold';
  console.log(`%c${passedCount}/${totalCount} tests passed (${passRate}%)`, summaryColor);

  if (passedCount === totalCount) {
    console.log('%c\n✅ ALL TESTS PASSED - Drought Analyzer is working correctly!', 'color: green; font-size: 14px; font-weight: bold');
  } else {
    console.log('%c\n⚠️  SOME TESTS FAILED - Review errors above', 'color: orange; font-size: 14px; font-weight: bold');
  }

  console.log('\n' + '🌵'.repeat(30) + '\n');
}

// ============================================
// Quick Test Function for Browser Console
// ============================================

/**
 * Quick test function - just paste this in browser console
 *
 * USAGE:
 * quickDroughtTest()
 */
export async function quickDroughtTest(): Promise<void> {
  console.log('🌵 Running Quick Drought Test...\n');

  // Test one high-risk location
  const result = await analyzeDroughtRisk({ lat: 34.05, lng: -118.24 }, 'CA');

  console.log('✅ Test Complete!');
  console.log('\nResults:');
  console.log('  Risk Level:', result.riskLevel);
  console.log('  Drought Category:', result.droughtCategory);
  console.log('  Water Availability:', result.waterAvailability);
  console.log('  Confidence:', result.confidence + '%');
  console.log('  Mitigations:', result.mitigationRecommendations.length, 'recommendations');
  console.log('\nFirst 3 mitigations:');
  result.mitigationRecommendations.slice(0, 3).forEach((m, i) => {
    console.log(`  ${i + 1}. ${m}`);
  });
}

// Auto-run if in browser context and window is available
if (typeof window !== 'undefined') {
  console.log('%c💡 TIP: Run runDroughtAnalyzerTests() for full test suite or quickDroughtTest() for quick test', 'color: #4a90e2');
}
