/**
 * Manual Test Script for Combined Risk Service Integration with Drought
 *
 * This script validates that the drought analyzer is properly integrated into
 * the combined risk assessment system.
 *
 * USAGE IN BROWSER CONSOLE:
 * 1. Navigate to any page in the Tax Deed Flow app
 * 2. Open browser developer console (F12)
 * 3. Copy and paste this entire script
 * 4. Run: testCombinedRiskIntegration()
 * 5. Results will be logged to console with visual formatting
 *
 * TEST COVERAGE:
 * - Drought appears in categoryScores
 * - Weights sum to 1.0
 * - Drought contributes to overall risk score
 * - Drought mitigations appear when risk is moderate/high
 * - Regional weights work correctly (MOUNTAIN_WEST has higher drought weight)
 *
 * @module lib/risk/combined/__tests__/manual-test-combined-risk-integration
 * @author Claude Code Agent
 * @date 2026-01-22
 */

import { calculateRiskAssessment, getWeightsForState, RISK_REGIONS } from '../combined-risk-service';
import { analyzeDroughtRisk } from '../../drought/drought-analyzer';
import type { RiskInput, RiskAssessment, RiskWeights } from '@/types/risk-analysis';

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
 * Check if a number is approximately equal (within 0.01)
 */
function approxEqual(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) < tolerance;
}

// ============================================
// Test 1: Drought Appears in Category Scores
// ============================================

async function testDroughtInCategoryScores(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('Test 1: Drought Appears in Category Scores');
  console.log('='.repeat(60));

  try {
    // Create test RiskInput with drought analysis
    const droughtAnalysis = await analyzeDroughtRisk({ lat: 34.05, lng: -118.24 }, 'CA');

    const riskInput: RiskInput = {
      flood: null,
      earthquake: null,
      wildfire: null,
      hurricane: null,
      sinkhole: null,
      environmental: null,
      radon: null,
      slope: null,
      drought: droughtAnalysis,
    };

    const assessment = calculateRiskAssessment(riskInput, 'CA');

    // Check if drought appears in categoryScores
    const droughtScore = assessment.categoryScores.find(s => s.category === 'drought');
    const hasDrought = !!droughtScore;

    formatTestResult(
      hasDrought,
      'Drought appears in categoryScores',
      hasDrought ? `Found at index ${assessment.categoryScores.indexOf(droughtScore!)}` : 'Missing from categoryScores'
    );

    if (hasDrought) {
      console.log('\n📊 Drought Category Score Details:');
      console.log(`   Category: ${droughtScore!.category}`);
      console.log(`   Raw Score: ${droughtScore!.rawScore}/100`);
      console.log(`   Weight: ${droughtScore!.weight.toFixed(4)}`);
      console.log(`   Weighted Score: ${droughtScore!.weightedScore.toFixed(2)}`);
      console.log(`   Risk Level: ${droughtScore!.riskLevel}`);
      console.log(`   Data Availability: ${droughtScore!.dataAvailability}`);
    }

    return hasDrought;

  } catch (error) {
    formatTestResult(false, 'Test execution', `Error: ${error}`);
    return false;
  }
}

// ============================================
// Test 2: Weights Sum to 1.0
// ============================================

function testWeightsSumToOne(): boolean {
  console.log('\n' + '='.repeat(60));
  console.log('Test 2: Weights Sum to 1.0');
  console.log('='.repeat(60));

  let allRegionsPass = true;

  // Test all risk regions
  Object.entries(RISK_REGIONS).forEach(([regionName, weights]) => {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    const sumIsOne = approxEqual(sum, 1.0, 0.01);

    formatTestResult(
      sumIsOne,
      `${regionName} weights sum to 1.0`,
      `Sum: ${sum.toFixed(6)} (${sumIsOne ? 'PASS' : 'FAIL'})`
    );

    if (!sumIsOne) {
      console.log(`   ⚠️  Expected: 1.0, Got: ${sum}`);
      allRegionsPass = false;
    }
  });

  // Test individual region weight breakdown
  console.log('\n📊 Sample Region Weight Breakdown (MOUNTAIN_WEST):');
  const mwWeights = RISK_REGIONS.MOUNTAIN_WEST;
  Object.entries(mwWeights).forEach(([category, weight]) => {
    console.log(`   ${category.padEnd(15)}: ${weight.toFixed(4)} (${(weight * 100).toFixed(2)}%)`);
  });

  const mwSum = Object.values(mwWeights).reduce((a, b) => a + b, 0);
  console.log(`   ${'Total'.padEnd(15)}: ${mwSum.toFixed(4)}`);

  return allRegionsPass;
}

// ============================================
// Test 3: Drought Contributes to Overall Risk Score
// ============================================

async function testDroughtContributesToScore(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('Test 3: Drought Contributes to Overall Risk Score');
  console.log('='.repeat(60));

  try {
    // Get drought analysis for high-risk area
    const droughtAnalysis = await analyzeDroughtRisk({ lat: 33.45, lng: -112.07 }, 'AZ'); // Phoenix, AZ

    // Test 1: Assessment WITH drought
    const withDrought: RiskInput = {
      flood: null,
      earthquake: null,
      wildfire: null,
      hurricane: null,
      sinkhole: null,
      environmental: null,
      radon: null,
      slope: null,
      drought: droughtAnalysis,
    };
    const assessmentWithDrought = calculateRiskAssessment(withDrought, 'AZ');

    // Test 2: Assessment WITHOUT drought
    const withoutDrought: RiskInput = {
      flood: null,
      earthquake: null,
      wildfire: null,
      hurricane: null,
      sinkhole: null,
      environmental: null,
      radon: null,
      slope: null,
      drought: null,
    };
    const assessmentWithoutDrought = calculateRiskAssessment(withoutDrought, 'AZ');

    const scoreDifference = assessmentWithDrought.riskScore - assessmentWithoutDrought.riskScore;
    const droughtContributes = scoreDifference !== 0;

    formatTestResult(
      droughtContributes,
      'Drought contributes to overall risk score',
      droughtContributes
        ? `Score difference: ${scoreDifference.toFixed(2)} points`
        : 'No contribution detected'
    );

    console.log('\n📊 Score Comparison:');
    console.log(`   With Drought:    ${assessmentWithDrought.riskScore}/100`);
    console.log(`   Without Drought: ${assessmentWithoutDrought.riskScore}/100`);
    console.log(`   Difference:      ${scoreDifference > 0 ? '+' : ''}${scoreDifference.toFixed(2)}`);
    console.log(`   Drought Weight (AZ): ${assessmentWithDrought.weightsUsed.drought.toFixed(4)}`);

    // Find drought in category scores
    const droughtScore = assessmentWithDrought.categoryScores.find(s => s.category === 'drought');
    if (droughtScore) {
      console.log(`   Drought Weighted Score: ${droughtScore.weightedScore.toFixed(2)}`);
    }

    return droughtContributes;

  } catch (error) {
    formatTestResult(false, 'Test execution', `Error: ${error}`);
    return false;
  }
}

// ============================================
// Test 4: Drought Mitigations Appear for Moderate/High Risk
// ============================================

async function testDroughtMitigationsAppear(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('Test 4: Drought Mitigations Appear for Moderate/High Risk');
  console.log('='.repeat(60));

  try {
    // Test with high drought risk location
    const droughtAnalysis = await analyzeDroughtRisk({ lat: 33.45, lng: -112.07 }, 'AZ'); // Phoenix - high risk

    const riskInput: RiskInput = {
      flood: null,
      earthquake: null,
      wildfire: null,
      hurricane: null,
      sinkhole: null,
      environmental: null,
      radon: null,
      slope: null,
      drought: droughtAnalysis,
    };

    const assessment = calculateRiskAssessment(riskInput, 'AZ');

    // Check if drought mitigations appear
    const droughtMitigations = assessment.mitigationActions.filter(m => m.riskType === 'drought');
    const hasMitigations = droughtMitigations.length > 0;

    // Get drought score
    const droughtScore = assessment.categoryScores.find(s => s.category === 'drought');
    const droughtRawScore = droughtScore?.rawScore || 0;

    formatTestResult(
      hasMitigations,
      'Drought mitigations appear in mitigationActions',
      hasMitigations
        ? `Found ${droughtMitigations.length} drought mitigation(s)`
        : `No mitigations (drought score: ${droughtRawScore.toFixed(0)}/100)`
    );

    if (hasMitigations) {
      console.log('\n📋 Drought Mitigation Actions:');
      droughtMitigations.forEach((mitigation, i) => {
        console.log(`   ${i + 1}. ${mitigation.action}`);
        console.log(`      Priority: ${mitigation.priority}`);
        console.log(`      Cost: $${mitigation.estimatedCost.min.toLocaleString()} - $${mitigation.estimatedCost.max.toLocaleString()}`);
        console.log(`      Effectiveness: ${mitigation.effectiveness}`);
        console.log(`      Timeframe: ${mitigation.timeframe}`);
      });
    }

    // Check recommendations too
    const droughtRecommendations = assessment.recommendations.filter(r =>
      r.toLowerCase().includes('drought') ||
      r.toLowerCase().includes('water')
    );

    if (droughtRecommendations.length > 0) {
      console.log('\n📝 Drought-Related Recommendations:');
      droughtRecommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    return hasMitigations;

  } catch (error) {
    formatTestResult(false, 'Test execution', `Error: ${error}`);
    return false;
  }
}

// ============================================
// Test 5: Regional Weights Work Correctly
// ============================================

function testRegionalWeights(): boolean {
  console.log('\n' + '='.repeat(60));
  console.log('Test 5: Regional Weights Work Correctly');
  console.log('='.repeat(60));

  let allTestsPass = true;

  // Test 1: MOUNTAIN_WEST should have higher drought weight
  const mountainWestWeight = RISK_REGIONS.MOUNTAIN_WEST.drought;
  const defaultWeight = RISK_REGIONS.DEFAULT.drought;
  const mountainWestHigher = mountainWestWeight > defaultWeight;

  formatTestResult(
    mountainWestHigher,
    'MOUNTAIN_WEST has higher drought weight than DEFAULT',
    `MOUNTAIN_WEST: ${mountainWestWeight.toFixed(4)}, DEFAULT: ${defaultWeight.toFixed(4)}`
  );

  if (!mountainWestHigher) allTestsPass = false;

  // Test 2: Compare drought weights across all regions
  console.log('\n📊 Drought Weight by Region (sorted high to low):');
  const regionDroughtWeights = Object.entries(RISK_REGIONS)
    .map(([region, weights]) => ({ region, weight: weights.drought }))
    .sort((a, b) => b.weight - a.weight);

  regionDroughtWeights.forEach(({ region, weight }, i) => {
    const indicator = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    console.log(`   ${indicator} ${region.padEnd(20)}: ${weight.toFixed(4)} (${(weight * 100).toFixed(2)}%)`);
  });

  // Verify MOUNTAIN_WEST is in top 3
  const mountainWestRank = regionDroughtWeights.findIndex(r => r.region === 'MOUNTAIN_WEST') + 1;
  const mountainWestInTop3 = mountainWestRank <= 3;

  formatTestResult(
    mountainWestInTop3,
    'MOUNTAIN_WEST is in top 3 for drought weight',
    `Rank: #${mountainWestRank}`
  );

  if (!mountainWestInTop3) allTestsPass = false;

  // Test 3: State-specific weight retrieval
  const testStates = [
    { code: 'CO', expectedRegion: 'MOUNTAIN_WEST' },
    { code: 'CA', expectedRegion: 'WEST_COAST' },
    { code: 'FL', expectedRegion: 'GULF_COAST' },
    { code: 'PA', expectedRegion: 'NORTHEAST' },
  ];

  console.log('\n📊 State Weight Retrieval Test:');
  testStates.forEach(({ code, expectedRegion }) => {
    const weights = getWeightsForState(code);
    const actualRegion = Object.keys(RISK_REGIONS).find(
      region => JSON.stringify(RISK_REGIONS[region]) === JSON.stringify(weights)
    );
    const correct = actualRegion === expectedRegion;

    formatTestResult(
      correct,
      `${code} maps to ${expectedRegion}`,
      `Drought weight: ${weights.drought.toFixed(4)}`
    );

    if (!correct) allTestsPass = false;
  });

  return allTestsPass;
}

// ============================================
// Test 6: Full Integration Test
// ============================================

async function testFullIntegration(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('Test 6: Full Integration Test (All Components)');
  console.log('='.repeat(60));

  try {
    // Test with MOUNTAIN_WEST state (high drought weight)
    const droughtAnalysis = await analyzeDroughtRisk({ lat: 39.74, lng: -104.99 }, 'CO'); // Denver, CO

    const riskInput: RiskInput = {
      flood: null,
      earthquake: null,
      wildfire: null,
      hurricane: null,
      sinkhole: null,
      environmental: null,
      radon: null,
      slope: null,
      drought: droughtAnalysis,
    };

    const assessment = calculateRiskAssessment(riskInput, 'CO');

    // Validation 1: Drought in category scores
    const droughtInScores = assessment.categoryScores.some(s => s.category === 'drought');

    // Validation 2: Weights sum to 1.0
    const weightsSum = Object.values(assessment.weightsUsed).reduce((a, b) => a + b, 0);
    const weightsSumToOne = approxEqual(weightsSum, 1.0, 0.01);

    // Validation 3: Drought weight is correct for MOUNTAIN_WEST
    const droughtWeight = assessment.weightsUsed.drought;
    const expectedWeight = RISK_REGIONS.MOUNTAIN_WEST.drought;
    const correctWeight = approxEqual(droughtWeight, expectedWeight, 0.001);

    // Validation 4: Drought score exists and is reasonable
    const droughtScore = assessment.categoryScores.find(s => s.category === 'drought');
    const hasReasonableScore = !!(droughtScore && droughtScore.rawScore >= 0 && droughtScore.rawScore <= 100);

    // Validation 5: Assessment has drought field populated
    const hasDroughtField = assessment.drought !== null && assessment.drought !== undefined;

    console.log('\n📊 Full Integration Results:');
    console.log(`   State: CO (MOUNTAIN_WEST region)`);
    console.log(`   Overall Risk Score: ${assessment.riskScore}/100`);
    console.log(`   Overall Risk Level: ${assessment.overallRisk}`);
    console.log(`   Confidence: ${assessment.confidenceLevel}%`);
    console.log(`   Drought Weight: ${droughtWeight.toFixed(4)} (${(droughtWeight * 100).toFixed(2)}%)`);

    if (droughtScore) {
      console.log(`   Drought Raw Score: ${droughtScore.rawScore.toFixed(2)}/100`);
      console.log(`   Drought Weighted Score: ${droughtScore.weightedScore.toFixed(2)}`);
      console.log(`   Drought Risk Level: ${droughtScore.riskLevel}`);
    }

    console.log('\n✅ Integration Validations:');
    formatTestResult(droughtInScores, '  Drought in categoryScores');
    formatTestResult(weightsSumToOne, '  Weights sum to 1.0', `Sum: ${weightsSum.toFixed(6)}`);
    formatTestResult(correctWeight, '  Correct drought weight for region', `${droughtWeight.toFixed(4)}`);
    formatTestResult(hasReasonableScore, '  Drought score is reasonable', droughtScore ? `${droughtScore.rawScore.toFixed(2)}/100` : 'N/A');
    formatTestResult(hasDroughtField, '  Assessment.drought field populated');

    const allPass = droughtInScores && weightsSumToOne && correctWeight && hasReasonableScore && hasDroughtField;

    return allPass;

  } catch (error) {
    formatTestResult(false, 'Test execution', `Error: ${error}`);
    return false;
  }
}

// ============================================
// Main Test Runner
// ============================================

/**
 * Run all combined risk integration tests
 */
export async function testCombinedRiskIntegration(): Promise<void> {
  console.clear();
  console.log('\n' + '💧'.repeat(30));
  console.log('%c COMBINED RISK SERVICE INTEGRATION TEST - DROUGHT', 'font-size: 16px; font-weight: bold; color: #4a90e2');
  console.log('💧'.repeat(30) + '\n');

  const results: { name: string; passed: boolean }[] = [];

  // Run all tests
  console.log('Starting integration tests...\n');

  // Test 1: Drought in category scores
  const test1 = await testDroughtInCategoryScores();
  results.push({ name: 'Drought in Category Scores', passed: test1 });
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 2: Weights sum to 1.0
  const test2 = testWeightsSumToOne();
  results.push({ name: 'Weights Sum to 1.0', passed: test2 });

  // Test 3: Drought contributes to score
  const test3 = await testDroughtContributesToScore();
  results.push({ name: 'Drought Contributes to Score', passed: test3 });
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 4: Drought mitigations appear
  const test4 = await testDroughtMitigationsAppear();
  results.push({ name: 'Drought Mitigations Appear', passed: test4 });
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 5: Regional weights
  const test5 = testRegionalWeights();
  results.push({ name: 'Regional Weights Correct', passed: test5 });

  // Test 6: Full integration
  const test6 = await testFullIntegration();
  results.push({ name: 'Full Integration', passed: test6 });

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
    console.log('%c\n✅ ALL TESTS PASSED - Combined Risk Integration is working correctly!', 'color: green; font-size: 14px; font-weight: bold');
    console.log('%c   Drought is fully integrated into the combined risk assessment system.', 'color: green');
  } else {
    console.log('%c\n⚠️  SOME TESTS FAILED - Review errors above', 'color: orange; font-size: 14px; font-weight: bold');
  }

  console.log('\n' + '💧'.repeat(30) + '\n');
}

// ============================================
// Quick Test Function
// ============================================

/**
 * Quick test - just checks basic integration
 */
export async function quickIntegrationTest(): Promise<void> {
  console.log('💧 Running Quick Integration Test...\n');

  const droughtAnalysis = await analyzeDroughtRisk({ lat: 33.45, lng: -112.07 }, 'AZ');
  const riskInput: RiskInput = {
    flood: null,
    earthquake: null,
    wildfire: null,
    hurricane: null,
    sinkhole: null,
    environmental: null,
    radon: null,
    slope: null,
    drought: droughtAnalysis,
  };

  const assessment = calculateRiskAssessment(riskInput, 'AZ');

  console.log('✅ Quick Test Complete!\n');
  console.log('Results:');
  console.log('  Overall Risk Score:', assessment.riskScore + '/100');
  console.log('  Drought in categoryScores:', assessment.categoryScores.some(s => s.category === 'drought') ? 'YES ✅' : 'NO ❌');
  console.log('  Weights sum to 1.0:', approxEqual(Object.values(assessment.weightsUsed).reduce((a, b) => a + b, 0), 1.0) ? 'YES ✅' : 'NO ❌');
  console.log('  Drought mitigations:', assessment.mitigationActions.filter(m => m.riskType === 'drought').length);

  const droughtScore = assessment.categoryScores.find(s => s.category === 'drought');
  if (droughtScore) {
    console.log('  Drought Score:', droughtScore.rawScore.toFixed(2) + '/100');
    console.log('  Drought Weight:', assessment.weightsUsed.drought.toFixed(4));
  }
}

// Auto-run tip if in browser
if (typeof window !== 'undefined') {
  console.log('%c💡 TIP: Run testCombinedRiskIntegration() for full test suite or quickIntegrationTest() for quick check', 'color: #4a90e2');
}
