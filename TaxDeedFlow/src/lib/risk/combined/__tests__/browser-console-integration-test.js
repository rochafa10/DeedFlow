/**
 * Browser Console Test for Combined Risk Integration
 *
 * USAGE:
 * 1. Start dev server: npm run dev
 * 2. Open http://localhost:3000 in browser
 * 3. Open browser console (F12)
 * 4. Copy and paste this entire file
 * 5. Test will run automatically
 *
 * This is a simplified JavaScript version for easy browser testing.
 */

(async function runCombinedRiskIntegrationTest() {
  console.clear();
  console.log('\n' + '💧'.repeat(30));
  console.log('%c COMBINED RISK INTEGRATION TEST - DROUGHT ', 'font-size: 16px; font-weight: bold; color: #4a90e2');
  console.log('💧'.repeat(30) + '\n');

  const results = [];

  // Import necessary functions (assuming they're available in the app)
  try {
    // Try to import from the global scope if available
    const { calculateRiskAssessment, getWeightsForState, RISK_REGIONS } = await import('/src/lib/risk/combined/combined-risk-service.ts');
    const { analyzeDroughtRisk } = await import('/src/lib/risk/drought/drought-analyzer.ts');

    // ============================================
    // Test 1: Drought in Category Scores
    // ============================================
    console.log('\n📋 Test 1: Drought in Category Scores');
    console.log('-'.repeat(40));

    const droughtAnalysis1 = await analyzeDroughtRisk({ lat: 34.05, lng: -118.24 }, 'CA');
    const assessment1 = calculateRiskAssessment(
      { flood: null, earthquake: null, wildfire: null, hurricane: null, sinkhole: null, environmental: null, radon: null, slope: null, drought: droughtAnalysis1 },
      'CA'
    );

    const hasDrought = assessment1.categoryScores.some(s => s.category === 'drought');
    console.log(hasDrought ? '✅ PASS: Drought appears in categoryScores' : '❌ FAIL: Drought missing from categoryScores');
    if (hasDrought) {
      const droughtScore = assessment1.categoryScores.find(s => s.category === 'drought');
      console.log(`   Drought Raw Score: ${droughtScore.rawScore.toFixed(2)}/100`);
      console.log(`   Drought Weight: ${droughtScore.weight.toFixed(4)}`);
    }
    results.push({ name: 'Drought in Category Scores', passed: hasDrought });

    // ============================================
    // Test 2: Weights Sum to 1.0
    // ============================================
    console.log('\n📋 Test 2: Weights Sum to 1.0');
    console.log('-'.repeat(40));

    let allRegionsPass = true;
    Object.entries(RISK_REGIONS).forEach(([regionName, weights]) => {
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      const sumIsOne = Math.abs(sum - 1.0) < 0.01;
      console.log(`   ${regionName.padEnd(20)}: ${sum.toFixed(6)} ${sumIsOne ? '✅' : '❌'}`);
      if (!sumIsOne) allRegionsPass = false;
    });

    console.log(allRegionsPass ? '✅ PASS: All region weights sum to 1.0' : '❌ FAIL: Some regions have incorrect weight sums');
    results.push({ name: 'Weights Sum to 1.0', passed: allRegionsPass });

    // ============================================
    // Test 3: Drought Contributes to Overall Score
    // ============================================
    console.log('\n📋 Test 3: Drought Contributes to Overall Score');
    console.log('-'.repeat(40));

    const droughtAnalysis2 = await analyzeDroughtRisk({ lat: 33.45, lng: -112.07 }, 'AZ');
    const withDrought = calculateRiskAssessment(
      { flood: null, earthquake: null, wildfire: null, hurricane: null, sinkhole: null, environmental: null, radon: null, slope: null, drought: droughtAnalysis2 },
      'AZ'
    );
    const withoutDrought = calculateRiskAssessment(
      { flood: null, earthquake: null, wildfire: null, hurricane: null, sinkhole: null, environmental: null, radon: null, slope: null, drought: null },
      'AZ'
    );

    const scoreDiff = withDrought.riskScore - withoutDrought.riskScore;
    const contributes = scoreDiff !== 0;

    console.log(`   With Drought:    ${withDrought.riskScore}/100`);
    console.log(`   Without Drought: ${withoutDrought.riskScore}/100`);
    console.log(`   Difference:      ${scoreDiff > 0 ? '+' : ''}${scoreDiff.toFixed(2)}`);
    console.log(contributes ? '✅ PASS: Drought contributes to overall score' : '❌ FAIL: Drought does not contribute');
    results.push({ name: 'Drought Contributes to Score', passed: contributes });

    // ============================================
    // Test 4: Drought Mitigations Appear
    // ============================================
    console.log('\n📋 Test 4: Drought Mitigations Appear (Moderate/High Risk)');
    console.log('-'.repeat(40));

    const droughtAnalysis3 = await analyzeDroughtRisk({ lat: 33.45, lng: -112.07 }, 'AZ');
    const assessment3 = calculateRiskAssessment(
      { flood: null, earthquake: null, wildfire: null, hurricane: null, sinkhole: null, environmental: null, radon: null, slope: null, drought: droughtAnalysis3 },
      'AZ'
    );

    const droughtMitigations = assessment3.mitigationActions.filter(m => m.riskType === 'drought');
    const hasMitigations = droughtMitigations.length > 0;

    console.log(`   Found ${droughtMitigations.length} drought mitigation(s)`);
    if (hasMitigations) {
      droughtMitigations.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.action}`);
      });
    }
    console.log(hasMitigations ? '✅ PASS: Drought mitigations appear' : '⚠️  Note: No drought mitigations (may be expected for low risk)');
    results.push({ name: 'Drought Mitigations Appear', passed: hasMitigations });

    // ============================================
    // Test 5: Regional Weights (MOUNTAIN_WEST)
    // ============================================
    console.log('\n📋 Test 5: Regional Weights - MOUNTAIN_WEST Has Higher Drought Weight');
    console.log('-'.repeat(40));

    const mountainWestWeight = RISK_REGIONS.MOUNTAIN_WEST.drought;
    const defaultWeight = RISK_REGIONS.DEFAULT.drought;
    const mwHigher = mountainWestWeight > defaultWeight;

    console.log(`   MOUNTAIN_WEST drought weight: ${mountainWestWeight.toFixed(4)} (${(mountainWestWeight * 100).toFixed(2)}%)`);
    console.log(`   DEFAULT drought weight:       ${defaultWeight.toFixed(4)} (${(defaultWeight * 100).toFixed(2)}%)`);
    console.log(mwHigher ? '✅ PASS: MOUNTAIN_WEST has higher drought weight' : '❌ FAIL: MOUNTAIN_WEST does not have higher drought weight');
    results.push({ name: 'Regional Weights Correct', passed: mwHigher });

    // ============================================
    // Test Summary
    // ============================================
    console.log('\n\n' + '='.repeat(60));
    console.log('%c TEST SUMMARY ', 'font-size: 14px; font-weight: bold');
    console.log('='.repeat(60));

    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
    });

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const passRate = ((passedCount / totalCount) * 100).toFixed(1);

    console.log('\n' + '-'.repeat(60));
    if (passedCount === totalCount) {
      console.log(`%c✅ ALL TESTS PASSED (${passedCount}/${totalCount} - ${passRate}%)`, 'color: green; font-weight: bold; font-size: 14px');
      console.log('%cCombined Risk Integration is working correctly!', 'color: green');
    } else {
      console.log(`%c⚠️  ${passedCount}/${totalCount} TESTS PASSED (${passRate}%)`, 'color: orange; font-weight: bold; font-size: 14px');
      console.log('%cSome tests failed - review above', 'color: orange');
    }

    console.log('\n' + '💧'.repeat(30) + '\n');

  } catch (error) {
    console.error('❌ Test setup failed:', error);
    console.log('\n⚠️  Make sure you are running this in the Tax Deed Flow app with dev server running.');
    console.log('   Try: npm run dev, then open http://localhost:3000');
  }
})();
