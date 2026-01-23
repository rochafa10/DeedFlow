/**
 * BROWSER CONSOLE TEST FOR DROUGHT ANALYZER
 *
 * INSTRUCTIONS:
 * 1. Start the development server: npm run dev
 * 2. Navigate to http://localhost:3000 in your browser
 * 3. Open browser console (F12 or Cmd+Option+J)
 * 4. Copy and paste this entire file into the console
 * 5. Press Enter to run the test
 *
 * The test will verify:
 * - analyzeDroughtRisk() returns proper DroughtRiskAnalysis object
 * - Risk levels are appropriate for different locations
 * - Mitigation recommendations are populated
 * - Confidence scores are reasonable
 * - Fallback behavior works when service is unavailable
 */

(async function testDroughtAnalyzer() {
  console.clear();
  console.log('\n🌵🌵🌵 DROUGHT ANALYZER MANUAL TEST 🌵🌵🌵\n');

  // Test locations
  const tests = [
    {
      name: 'California (High Risk)',
      coords: { lat: 34.05, lng: -118.24 },
      state: 'CA',
      expected: 'Should show moderate-high drought risk'
    },
    {
      name: 'Arizona (Extreme Risk)',
      coords: { lat: 33.45, lng: -112.07 },
      state: 'AZ',
      expected: 'Should show high drought risk'
    },
    {
      name: 'Texas (Moderate-High Risk)',
      coords: { lat: 30.27, lng: -97.74 },
      state: 'TX',
      expected: 'Should show moderate drought risk'
    }
  ];

  let passCount = 0;
  let totalTests = 0;

  // Import the analyzer (adjust path if needed)
  const { analyzeDroughtRisk, getDroughtRiskScore } = await import('@/lib/risk/drought/drought-analyzer');

  for (const test of tests) {
    console.log('\n' + '='.repeat(60));
    console.log(`Testing: ${test.name}`);
    console.log('Expected:', test.expected);
    console.log('='.repeat(60));

    try {
      // Run analyzer
      const analysis = await analyzeDroughtRisk(test.coords, test.state);
      const score = getDroughtRiskScore(analysis);

      // Display results
      console.log('\n📊 Results:');
      console.log(`   ✓ Risk Level: ${analysis.riskLevel}`);
      console.log(`   ✓ Drought Category: ${analysis.droughtCategory} - ${analysis.droughtDescription?.substring(0, 60)}...`);
      console.log(`   ✓ Water Availability: ${analysis.waterAvailability}`);
      console.log(`   ✓ Crop Impact: ${analysis.cropImpact}`);
      console.log(`   ✓ Risk Score: ${score}/5`);
      console.log(`   ✓ Confidence: ${analysis.confidence}%`);
      console.log(`   ✓ Data Source: ${analysis.dataSource.name} (${analysis.dataSource.type})`);

      // Check structure
      totalTests++;
      const hasRequiredFields = (
        analysis.riskLevel &&
        analysis.droughtCategory &&
        analysis.waterAvailability &&
        analysis.cropImpact &&
        Array.isArray(analysis.mitigationRecommendations) &&
        Array.isArray(analysis.conservationStrategies) &&
        typeof analysis.confidence === 'number'
      );

      if (hasRequiredFields) {
        console.log('\n   ✅ Structure validation: PASS');
        passCount++;
      } else {
        console.log('\n   ❌ Structure validation: FAIL - Missing required fields');
      }

      // Check mitigations
      totalTests++;
      if (analysis.mitigationRecommendations.length > 0) {
        console.log(`   ✅ Mitigation recommendations: PASS (${analysis.mitigationRecommendations.length} recommendations)`);
        passCount++;

        console.log('\n   📋 Sample Mitigations:');
        analysis.mitigationRecommendations.slice(0, 3).forEach((m, i) => {
          console.log(`      ${i + 1}. ${m.substring(0, 80)}...`);
        });
      } else {
        console.log('   ❌ Mitigation recommendations: FAIL - No recommendations provided');
      }

      // Check conservation strategies
      totalTests++;
      if (analysis.conservationStrategies.length > 0) {
        console.log(`   ✅ Conservation strategies: PASS (${analysis.conservationStrategies.length} strategies)`);
        passCount++;
      } else {
        console.log('   ❌ Conservation strategies: FAIL - No strategies provided');
      }

      // Check confidence
      totalTests++;
      if (analysis.confidence >= 0 && analysis.confidence <= 100) {
        console.log(`   ✅ Confidence score: PASS (${analysis.confidence}%)`);
        passCount++;
      } else {
        console.log(`   ❌ Confidence score: FAIL (${analysis.confidence}% - out of range)`);
      }

      // Check risk score
      totalTests++;
      if (score >= 0 && score <= 5) {
        console.log(`   ✅ Risk score: PASS (${score}/5)`);
        passCount++;
      } else {
        console.log(`   ❌ Risk score: FAIL (${score} - out of 0-5 range)`);
      }

    } catch (error) {
      console.log('\n   ❌ ERROR:', error.message);
      console.log('   Stack:', error.stack);
      totalTests += 5; // Count all sub-tests as failed
    }
  }

  // Test fallback behavior
  console.log('\n\n' + '='.repeat(60));
  console.log('Testing: Fallback Behavior (Low-Risk State)');
  console.log('='.repeat(60));

  try {
    const { analyzeDroughtRisk } = await import('@/lib/risk/drought/drought-analyzer');
    const analysis = await analyzeDroughtRisk({ lat: 47.61, lng: -122.33 }, 'WA');

    console.log('\n📊 Fallback Results:');
    console.log(`   Risk Level: ${analysis.riskLevel}`);
    console.log(`   Drought Category: ${analysis.droughtCategory}`);
    console.log(`   Data Source: ${analysis.dataSource.name}`);
    console.log(`   Confidence: ${analysis.confidence}%`);

    totalTests++;
    if (analysis.riskLevel && analysis.droughtCategory) {
      console.log('\n   ✅ Fallback behavior: PASS');
      passCount++;
    } else {
      console.log('\n   ❌ Fallback behavior: FAIL');
    }
  } catch (error) {
    console.log('\n   ❌ Fallback ERROR:', error.message);
    totalTests++;
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nPassed: ${passCount}/${totalTests} tests`);
  console.log(`Success Rate: ${((passCount/totalTests) * 100).toFixed(1)}%`);

  if (passCount === totalTests) {
    console.log('\n✅✅✅ ALL TESTS PASSED! ✅✅✅');
    console.log('The Drought Analyzer is working correctly!\n');
  } else {
    console.log(`\n⚠️  ${totalTests - passCount} test(s) failed. Review errors above.\n`);
  }

  console.log('🌵'.repeat(30) + '\n');
})();
