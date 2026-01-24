/**
 * Manual verification test for Risk calculator
 * Tests calculateRiskScore() with sample data
 */

import { calculateRiskScore } from './src/lib/scoring/categories/risk/riskScore';
import type { PropertyData, ExternalData, CategoryScore } from './src/types/scoring';

// Test colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60) + '\n');
}

function assert(condition: boolean, message: string): boolean {
  if (condition) {
    log(`✓ PASS: ${message}`, 'green');
    return true;
  } else {
    log(`✗ FAIL: ${message}`, 'red');
    return false;
  }
}

// ============================================
// Test Cases
// ============================================

logSection('Risk Calculator Manual Verification Test');

// Test 1: Complete data with good risk scores
logSection('Test 1: Property with Complete Risk Data (Low Risk)');

const property1: Partial<PropertyData> = {
  id: 'prop-123',
  address: '123 Safe Street',
  city: 'Pittsburgh',
  state: 'PA',
  zoning: 'R-1'
};

const externalData1: Partial<ExternalData> = {
  floodZone: {
    zone: 'X',
    riskLevel: 'minimal',
    insuranceRequired: false,
    baseFloodElevation: null
  },
  environmentalHazards: {
    riskScore: 10,
    superfundSites: 0,
    brownfieldSites: 0,
    airQualityIndex: 45
  }
};

const result1 = calculateRiskScore(property1, externalData1);

console.log('Result:', JSON.stringify(result1, null, 2));

let allPassed = true;

// Verify structure
allPassed = assert(result1.id === 'risk', 'Category ID is "risk"') && allPassed;
allPassed = assert(result1.name === 'Risk Assessment', 'Category name is "Risk Assessment"') && allPassed;
allPassed = assert(typeof result1.score === 'number', 'Score is a number') && allPassed;
allPassed = assert(result1.maxScore === 25, 'Max score is 25') && allPassed;
allPassed = assert(result1.score >= 0 && result1.score <= 25, `Score ${result1.score} is between 0-25`) && allPassed;
allPassed = assert(typeof result1.confidence === 'number', 'Confidence is a number') && allPassed;
allPassed = assert(result1.confidence >= 0 && result1.confidence <= 100, `Confidence ${result1.confidence} is between 0-100`) && allPassed;
allPassed = assert(typeof result1.dataCompleteness === 'number', 'Data completeness is a number') && allPassed;
allPassed = assert(result1.dataCompleteness >= 0 && result1.dataCompleteness <= 100, `Data completeness ${result1.dataCompleteness} is between 0-100`) && allPassed;
allPassed = assert(Array.isArray(result1.components), 'Components is an array') && allPassed;
allPassed = assert(result1.components.length === 5, `Has 5 components (got ${result1.components.length})`) && allPassed;
allPassed = assert(Array.isArray(result1.notes), 'Notes is an array') && allPassed;
allPassed = assert(Array.isArray(result1.adjustments), 'Adjustments is an array') && allPassed;

// Verify components
const expectedComponentIds = ['flood_zone', 'environmental_hazards', 'structural_risk', 'title_issues', 'zoning_compliance'];
const componentIds = result1.components.map(c => c.id);

allPassed = assert(
  expectedComponentIds.every(id => componentIds.includes(id as any)),
  `Has all expected component IDs: ${expectedComponentIds.join(', ')}`
) && allPassed;

// Verify each component structure
result1.components.forEach((component, idx) => {
  log(`\nComponent ${idx + 1}: ${component.name} (${component.id})`, 'yellow');
  allPassed = assert(typeof component.score === 'number', `  Score is a number`) && allPassed;
  allPassed = assert(component.score >= 0 && component.score <= 5, `  Score ${component.score} is between 0-5`) && allPassed;
  allPassed = assert(component.maxScore === 5, `  Max score is 5`) && allPassed;
  allPassed = assert(typeof component.normalizedValue === 'number', `  Normalized value is a number`) && allPassed;
  allPassed = assert(typeof component.confidence === 'number', `  Confidence is a number`) && allPassed;
  allPassed = assert(typeof component.description === 'string', `  Description is a string`) && allPassed;
  allPassed = assert(typeof component.dataSource === 'object', `  Data source is an object`) && allPassed;
  allPassed = assert(typeof component.dataSource.name === 'string', `  Data source name is "${component.dataSource.name}"`) && allPassed;
  allPassed = assert(['api', 'database', 'calculated', 'estimated', 'default'].includes(component.dataSource.type), `  Data source type is valid: "${component.dataSource.type}"`) && allPassed;
  allPassed = assert(['high', 'medium', 'low'].includes(component.dataSource.reliability), `  Data source reliability is valid: "${component.dataSource.reliability}"`) && allPassed;
  allPassed = assert(typeof component.missingDataStrategy === 'string', `  Missing data strategy is "${component.missingDataStrategy}"`) && allPassed;
});

// Verify score calculation (sum of component scores)
const componentSum = result1.components.reduce((sum, c) => sum + c.score, 0);
const scoreMatches = Math.abs(componentSum - result1.score) < 0.01;
allPassed = assert(scoreMatches, `Total score ${result1.score} matches sum of components ${componentSum.toFixed(2)}`) && allPassed;

// Test 2: Property with high risk scores
logSection('Test 2: Property with High Risk (Poor Data)');

const property2: Partial<PropertyData> = {
  id: 'prop-456',
  address: '456 Risky Road',
  city: 'Miami',
  state: 'FL',
  zoning: undefined
};

const externalData2: Partial<ExternalData> = {
  floodZone: {
    zone: 'AE',
    riskLevel: 'high',
    insuranceRequired: true,
    baseFloodElevation: 100
  },
  environmentalHazards: {
    riskScore: 85,
    superfundSites: 2,
    brownfieldSites: 1,
    airQualityIndex: 180
  }
};

const result2 = calculateRiskScore(property2, externalData2);

console.log('Result:', JSON.stringify(result2, null, 2));

allPassed = assert(result2.score >= 0 && result2.score <= 25, `Score ${result2.score} is between 0-25`) && allPassed;
allPassed = assert(result2.score < result1.score, `High risk property (${result2.score}) scored lower than low risk (${result1.score})`) && allPassed;
allPassed = assert(result2.components.length === 5, `Has 5 components`) && allPassed;

// Test 3: Property with missing data
logSection('Test 3: Property with Missing Data');

const property3: Partial<PropertyData> = {
  id: 'prop-789',
  address: '789 Unknown Ave',
  city: 'Denver',
  state: 'CO'
};

const externalData3 = null;

const result3 = calculateRiskScore(property3, externalData3);

console.log('Result:', JSON.stringify(result3, null, 2));

allPassed = assert(result3.score >= 0 && result3.score <= 25, `Score ${result3.score} is between 0-25`) && allPassed;
allPassed = assert(result3.dataCompleteness < 50, `Data completeness ${result3.dataCompleteness}% is low (< 50%)`) && allPassed;
allPassed = assert(result3.confidence < 60, `Confidence ${result3.confidence}% is low (< 60%)`) && allPassed;
allPassed = assert(result3.notes.length > 0, `Has notes explaining missing data (${result3.notes.length} notes)`) && allPassed;
allPassed = assert(result3.components.length === 5, `Has 5 components`) && allPassed;

// Test 4: Property with partial data
logSection('Test 4: Property with Partial Data');

const property4: Partial<PropertyData> = {
  id: 'prop-abc',
  address: '999 Partial Lane',
  city: 'Austin',
  state: 'TX',
  zoning: 'C-2'
};

const externalData4: Partial<ExternalData> = {
  floodZone: {
    zone: 'X',
    riskLevel: 'low',
    insuranceRequired: false,
    baseFloodElevation: null
  }
};

const result4 = calculateRiskScore(property4, externalData4);

console.log('Result:', JSON.stringify(result4, null, 2));

allPassed = assert(result4.score >= 0 && result4.score <= 25, `Score ${result4.score} is between 0-25`) && allPassed;
allPassed = assert(result4.dataCompleteness > result3.dataCompleteness, `Data completeness ${result4.dataCompleteness}% is higher than test 3 (${result3.dataCompleteness}%)`) && allPassed;
allPassed = assert(result4.components.length === 5, `Has 5 components`) && allPassed;

// Check that some components have real data and some don't
const componentsWithRealData = result4.components.filter(c => c.dataSource.type !== 'default').length;
const componentsWithDefaults = result4.components.filter(c => c.dataSource.type === 'default').length;

allPassed = assert(componentsWithRealData > 0, `Some components (${componentsWithRealData}) have real data`) && allPassed;
allPassed = assert(componentsWithDefaults > 0, `Some components (${componentsWithDefaults}) use defaults`) && allPassed;

// Final summary
logSection('Test Summary');

if (allPassed) {
  log('✓ ALL TESTS PASSED - Risk calculator is working correctly!', 'green');
  log('\nVerification complete:', 'blue');
  log('  • CategoryScore structure matches interface', 'green');
  log('  • Score range validation (0-25) passes', 'green');
  log('  • Component score validation (0-5) passes', 'green');
  log('  • Confidence and data completeness calculated', 'green');
  log('  • 5 components present in all cases', 'green');
  log('  • High risk properties score lower than low risk', 'green');
  log('  • Missing data handling works correctly', 'green');
  log('  • Partial data handling works correctly', 'green');
  process.exit(0);
} else {
  log('✗ SOME TESTS FAILED - Review errors above', 'red');
  process.exit(1);
}
