/**
 * Test Script for Property Comparison Utility
 *
 * This script creates two sample properties with different characteristics,
 * runs the comparison, and validates the results.
 */

import { compareProperties } from './src/lib/utils/property-comparison';
import type { PropertyData, ExternalData } from './src/types/scoring';

// ============================================
// Sample Property 1: High-Quality Residential
// ============================================

const property1: Partial<PropertyData> = {
  id: 'prop-test-001',
  parcel_id: 'TEST-001-A',
  address: '123 Main Street',
  city: 'Pittsburgh',
  state: 'PA',
  zip: '15201',
  county_id: 'county-test-001',
  county_name: 'Allegheny',
  owner_name: 'John Smith',
  total_due: 8500,
  tax_amount: 7200,
  tax_year: 2023,
  sale_type: 'upset',
  sale_date: new Date('2026-03-15'),
  coordinates: {
    latitude: 40.4406,
    longitude: -79.9959,
  },
  lot_size_sqft: 5000,
  lot_size_acres: 0.11,
  building_sqft: 1800,
  year_built: 2005,
  bedrooms: 3,
  bathrooms: 2,
  assessed_value: 185000,
  market_value: 225000,
  property_type: 'single_family_residential',
  zoning: 'R1',
  land_use: 'Residential',
  validation_status: 'APPROVED',
  pipeline_stage: 'scoring',
  has_regrid_data: true,
  has_screenshot: true,
  screenshot_url: 'https://example.com/screenshot1.jpg',
};

const externalData1: Partial<ExternalData> = {
  walkScore: 85,
  transitScore: 72,
  bikeScore: 68,
  crimeData: {
    crimeIndex: 25, // Lower is better
    violentCrimeRate: 2.1,
    propertyCrimeRate: 12.5,
    source: 'FBI UCR',
    asOf: new Date('2025-12-01'),
  },
  schoolRating: {
    overallRating: 8,
    elementaryRating: 8,
    middleRating: 7,
    highRating: 9,
    source: 'GreatSchools',
  },
};

// ============================================
// Sample Property 2: Lower-Quality Residential
// ============================================

const property2: Partial<PropertyData> = {
  id: 'prop-test-002',
  parcel_id: 'TEST-002-B',
  address: '456 Oak Avenue',
  city: 'Pittsburgh',
  state: 'PA',
  zip: '15210',
  county_id: 'county-test-001',
  county_name: 'Allegheny',
  owner_name: 'Jane Doe',
  total_due: 12500, // Higher debt
  tax_amount: 10200,
  tax_year: 2022, // Older debt
  sale_type: 'repository',
  sale_date: new Date('2026-03-15'),
  coordinates: {
    latitude: 40.4150,
    longitude: -79.9842,
  },
  lot_size_sqft: 4200,
  lot_size_acres: 0.10,
  building_sqft: 1400, // Smaller
  year_built: 1985, // Older
  bedrooms: 2,
  bathrooms: 1,
  assessed_value: 95000, // Lower value
  market_value: 115000,
  property_type: 'single_family_residential',
  zoning: 'R2',
  land_use: 'Residential',
  validation_status: 'CAUTION',
  pipeline_stage: 'scoring',
  has_regrid_data: true,
  has_screenshot: true,
  screenshot_url: 'https://example.com/screenshot2.jpg',
};

const externalData2: Partial<ExternalData> = {
  walkScore: 62, // Lower
  transitScore: 45,
  bikeScore: 38,
  crimeData: {
    crimeIndex: 58, // Higher crime
    violentCrimeRate: 5.8,
    propertyCrimeRate: 28.3,
    source: 'FBI UCR',
    asOf: new Date('2025-12-01'),
  },
  schoolRating: {
    overallRating: 5, // Lower ratings
    elementaryRating: 5,
    middleRating: 4,
    highRating: 6,
    source: 'GreatSchools',
  },
};

// ============================================
// Run Comparison Test
// ============================================

console.log('\n========================================');
console.log('PROPERTY COMPARISON UTILITY TEST');
console.log('========================================\n');

console.log('Property 1: 123 Main Street (High Quality)');
console.log('  - Building: 1,800 sqft, 3bd/2ba, Built 2005');
console.log('  - Value: $225,000 market / $185,000 assessed');
console.log('  - Debt: $8,500');
console.log('  - Walk Score: 85, Crime Index: 25, Schools: 8/10');
console.log('');

console.log('Property 2: 456 Oak Avenue (Lower Quality)');
console.log('  - Building: 1,400 sqft, 2bd/1ba, Built 1985');
console.log('  - Value: $115,000 market / $95,000 assessed');
console.log('  - Debt: $12,500');
console.log('  - Walk Score: 62, Crime Index: 58, Schools: 5/10');
console.log('\n========================================\n');

try {
  const result = compareProperties(
    property1,
    property2,
    externalData1,
    externalData2
  );

  console.log('✅ Comparison completed successfully!\n');

  // ============================================
  // Validate Results
  // ============================================

  console.log('OVERALL RESULTS:');
  console.log('================\n');
  console.log(`Winner: ${result.overallWinner === 'property1' ? 'Property 1 (123 Main St)' : result.overallWinner === 'property2' ? 'Property 2 (456 Oak Ave)' : 'TIE'}`);
  console.log(`Property 1 Score: ${result.property1Scores.totalScore.toFixed(2)}`);
  console.log(`Property 2 Score: ${result.property2Scores.totalScore.toFixed(2)}`);
  console.log(`Score Differential: ${result.totalScoreDifferential.toFixed(2)} points (${result.percentageDifferential.toFixed(1)}%)`);
  console.log(`Magnitude: ${result.overallMagnitude}`);
  console.log(`Grade: ${result.property1Scores.gradeResult.gradeWithModifier} vs ${result.property2Scores.gradeResult.gradeWithModifier}`);
  console.log('');

  console.log('CATEGORY BREAKDOWN:');
  console.log('===================\n');

  const categories = [
    { name: 'Location', comp: result.locationComparison },
    { name: 'Risk', comp: result.riskComparison },
    { name: 'Financial', comp: result.financialComparison },
    { name: 'Market', comp: result.marketComparison },
    { name: 'Profit', comp: result.profitComparison },
  ];

  categories.forEach(({ name, comp }) => {
    const winnerIcon =
      comp.winner === 'property1' ? '🏆 Prop 1' :
      comp.winner === 'property2' ? '🏆 Prop 2' :
      '🤝 TIE';

    console.log(`${name}:`);
    console.log(`  Winner: ${winnerIcon}`);
    console.log(`  Prop 1: ${comp.property1Score.score.toFixed(2)} | Prop 2: ${comp.property2Score.score.toFixed(2)}`);
    console.log(`  Differential: ${comp.scoreDifferential.toFixed(2)} pts (${comp.percentageDifferential.toFixed(1)}%)`);
    console.log(`  Magnitude: ${comp.magnitude}`);
    console.log(`  Summary: ${comp.summary}`);
    if (comp.insights.length > 0) {
      console.log(`  Insights:`);
      comp.insights.forEach(insight => console.log(`    - ${insight}`));
    }
    console.log('');
  });

  console.log('CATEGORY WINS SUMMARY:');
  console.log('======================\n');
  console.log(`Property 1 Wins: ${result.categorySummary.property1Wins}`);
  console.log(`Property 2 Wins: ${result.categorySummary.property2Wins}`);
  console.log(`Ties: ${result.categorySummary.ties}`);
  console.log('');

  console.log('RECOMMENDATION:');
  console.log('===============\n');
  console.log(`Type: ${result.recommendation}`);
  console.log(`Strength: ${result.recommendationStrength}`);
  console.log(`Summary: ${result.recommendationSummary}`);
  console.log('');
  console.log('Reasons:');
  result.recommendationReasons.forEach(reason => {
    console.log(`  - ${reason}`);
  });
  console.log('');

  if (result.tradeoffs.property1Advantages.length > 0 || result.tradeoffs.property2Advantages.length > 0) {
    console.log('TRADE-OFFS:');
    console.log('===========\n');
    if (result.tradeoffs.property1Advantages.length > 0) {
      console.log('Property 1 Advantages:');
      result.tradeoffs.property1Advantages.forEach(adv => {
        console.log(`  ✓ ${adv}`);
      });
      console.log('');
    }
    if (result.tradeoffs.property2Advantages.length > 0) {
      console.log('Property 2 Advantages:');
      result.tradeoffs.property2Advantages.forEach(adv => {
        console.log(`  ✓ ${adv}`);
      });
      console.log('');
    }
  }

  if (result.warnings.length > 0) {
    console.log('WARNINGS:');
    console.log('=========\n');
    result.warnings.forEach(warning => {
      console.log(`  ⚠️  ${warning}`);
    });
    console.log('');
  }

  // ============================================
  // Validation Checks
  // ============================================

  console.log('VALIDATION CHECKS:');
  console.log('==================\n');

  const checks: { name: string; passed: boolean; message: string }[] = [];

  // Check 1: Winner determined correctly
  checks.push({
    name: 'Winner Determination',
    passed: result.overallWinner !== 'tie',
    message: result.overallWinner !== 'tie'
      ? '✅ Winner correctly identified (Property 1 expected to win)'
      : '❌ Expected Property 1 to win, but got tie',
  });

  // Check 2: Category winners make sense
  const locationWinnerCorrect = result.locationComparison.winner === 'property1';
  checks.push({
    name: 'Location Category',
    passed: locationWinnerCorrect,
    message: locationWinnerCorrect
      ? '✅ Property 1 correctly wins Location (better walk score, lower crime, better schools)'
      : '❌ Expected Property 1 to win Location category',
  });

  // Check 3: Score differential is accurate
  const calculatedDiff = Math.abs(result.property1Scores.totalScore - result.property2Scores.totalScore);
  const diffCorrect = Math.abs(calculatedDiff - result.totalScoreDifferential) < 0.01;
  checks.push({
    name: 'Score Differential Accuracy',
    passed: diffCorrect,
    message: diffCorrect
      ? `✅ Score differential is accurate (${result.totalScoreDifferential.toFixed(2)} points)`
      : `❌ Score differential mismatch: calculated ${calculatedDiff.toFixed(2)}, reported ${result.totalScoreDifferential.toFixed(2)}`,
  });

  // Check 4: Recommendation makes sense
  const recommendationCorrect = result.recommendation.includes('property1');
  checks.push({
    name: 'Recommendation Logic',
    passed: recommendationCorrect,
    message: recommendationCorrect
      ? `✅ Recommendation correctly favors Property 1 (${result.recommendation})`
      : `❌ Expected recommendation to favor Property 1, got ${result.recommendation}`,
  });

  // Check 5: Confidence levels are populated
  const confidenceValid = result.comparisonConfidence > 0 && result.comparisonConfidence <= 100;
  checks.push({
    name: 'Confidence Calculation',
    passed: confidenceValid,
    message: confidenceValid
      ? `✅ Comparison confidence is valid (${result.comparisonConfidence}%)`
      : `❌ Invalid comparison confidence: ${result.comparisonConfidence}%`,
  });

  // Print validation results
  checks.forEach(check => {
    console.log(check.message);
  });

  const allPassed = checks.every(check => check.passed);
  console.log('');
  console.log('========================================');
  if (allPassed) {
    console.log('✅ ALL VALIDATION CHECKS PASSED!');
  } else {
    console.log('❌ SOME VALIDATION CHECKS FAILED');
    const failedCount = checks.filter(c => !c.passed).length;
    console.log(`   ${failedCount} out of ${checks.length} checks failed`);
  }
  console.log('========================================\n');

  process.exit(allPassed ? 0 : 1);

} catch (error) {
  console.error('\n❌ COMPARISON FAILED:\n');
  console.error(error);
  console.error('\n========================================\n');
  process.exit(1);
}
