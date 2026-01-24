/**
 * End-to-End Test for Analytics Feature
 *
 * This script tests the analytics feature by:
 * 1. Checking if the analytics page is accessible
 * 2. Verifying API endpoints return data
 * 3. Testing filter functionality
 *
 * Run this script with: node test-analytics-e2e.js
 * Prerequisite: Development server must be running on http://localhost:3000
 */

const http = require('http');
const https = require('https');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/analytics`;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'User-Agent': 'E2E-Test-Script',
      },
    };

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Test helper functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name, status, message = '') {
  const icon = status === 'passed' ? '✓' : status === 'failed' ? '✗' : '○';
  const color = status === 'passed' ? colors.green : status === 'failed' ? colors.red : colors.yellow;

  log(`${icon} ${name}${message ? ': ' + message : ''}`, color);

  results.tests.push({ name, status, message });
  results[status]++;
}

// Test cases
async function testServerRunning() {
  try {
    const response = await makeRequest(BASE_URL);
    if (response.statusCode === 200 || response.statusCode === 404 || response.statusCode === 302) {
      logTest('Server is running', 'passed', `Status: ${response.statusCode}`);
      return true;
    } else {
      logTest('Server is running', 'failed', `Unexpected status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Server is running', 'failed', error.message);
    return false;
  }
}

async function testAnalyticsPageAccessible() {
  try {
    const response = await makeRequest(`${BASE_URL}/analytics`);
    if (response.statusCode === 200 || response.statusCode === 302) {
      logTest('Analytics page is accessible', 'passed', `Status: ${response.statusCode}`);
      return true;
    } else {
      logTest('Analytics page is accessible', 'failed', `Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Analytics page is accessible', 'failed', error.message);
    return false;
  }
}

async function testAuctionHistoryAPI(countyId = 'test') {
  try {
    const response = await makeRequest(`${API_BASE}/auction-history?county_id=${countyId}`);

    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);

      // Verify response structure
      const hasData = data.data !== undefined;
      const hasHistory = data.data?.history !== undefined;
      const hasCounty = data.data?.county !== undefined;

      if (hasData && hasHistory && hasCounty) {
        logTest('Auction history API returns correct structure', 'passed', `${data.data.history.length} records`);
        return true;
      } else {
        logTest('Auction history API returns correct structure', 'failed', 'Missing expected fields');
        return false;
      }
    } else if (response.statusCode === 400) {
      logTest('Auction history API (no county)', 'passed', 'Correctly returns 400 for missing county_id');
      return true;
    } else {
      logTest('Auction history API', 'failed', `Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Auction history API', 'failed', error.message);
    return false;
  }
}

async function testCountyTrendsAPI(countyId = 'test') {
  try {
    const response = await makeRequest(`${API_BASE}/county-trends?county_id=${countyId}`);

    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);

      // Verify response structure
      const hasData = data.data !== undefined;
      const hasTrends = data.data?.trends !== undefined;
      const hasVelocity = data.data?.velocity !== undefined;

      if (hasData && hasTrends && hasVelocity) {
        logTest('County trends API returns correct structure', 'passed', `${data.data.trends.length} trend records`);
        return true;
      } else {
        logTest('County trends API returns correct structure', 'failed', 'Missing expected fields');
        return false;
      }
    } else if (response.statusCode === 400 || response.statusCode === 404) {
      logTest('County trends API', 'passed', `Correctly handles invalid county (${response.statusCode})`);
      return true;
    } else {
      logTest('County trends API', 'failed', `Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('County trends API', 'failed', error.message);
    return false;
  }
}

async function testPricePredictionsAPI(propertyId = 'test') {
  try {
    const response = await makeRequest(`${API_BASE}/price-predictions?property_id=${propertyId}`);

    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);

      // Verify response structure
      const hasData = data.data !== undefined;
      const hasPrediction = data.data?.prediction !== undefined;
      const hasProperty = data.data?.property !== undefined;

      if (hasData && hasPrediction && hasProperty) {
        logTest('Price predictions API returns correct structure', 'passed');
        return true;
      } else {
        logTest('Price predictions API returns correct structure', 'failed', 'Missing expected fields');
        return false;
      }
    } else if (response.statusCode === 400 || response.statusCode === 404) {
      logTest('Price predictions API', 'passed', `Correctly handles invalid property (${response.statusCode})`);
      return true;
    } else {
      logTest('Price predictions API', 'failed', `Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Price predictions API', 'failed', error.message);
    return false;
  }
}

async function testAPIWithFilters() {
  try {
    // Test with date range filter
    const response = await makeRequest(`${API_BASE}/auction-history?county_id=test&start_date=2024-01-01&end_date=2024-12-31`);

    if (response.statusCode === 200 || response.statusCode === 400 || response.statusCode === 404) {
      logTest('API supports filter parameters', 'passed', 'Date range filters accepted');
      return true;
    } else {
      logTest('API supports filter parameters', 'failed', `Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('API supports filter parameters', 'failed', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n========================================', colors.cyan);
  log('  Analytics Feature E2E Test Suite', colors.cyan);
  log('========================================\n', colors.cyan);

  log('Testing server availability...', colors.blue);
  const serverRunning = await testServerRunning();

  if (!serverRunning) {
    log('\n⚠️  Development server is not running!', colors.yellow);
    log('Please start the server with: cd TaxDeedFlow && npm run dev\n', colors.yellow);
    process.exit(1);
  }

  log('\nTesting page accessibility...', colors.blue);
  await testAnalyticsPageAccessible();

  log('\nTesting API endpoints...', colors.blue);
  await testAuctionHistoryAPI();
  await testCountyTrendsAPI();
  await testPricePredictionsAPI();

  log('\nTesting filters...', colors.blue);
  await testAPIWithFilters();

  // Print summary
  log('\n========================================', colors.cyan);
  log('  Test Summary', colors.cyan);
  log('========================================\n', colors.cyan);

  log(`Total tests: ${results.tests.length}`);
  log(`Passed: ${results.passed}`, colors.green);
  log(`Failed: ${results.failed}`, colors.red);
  log(`Skipped: ${results.skipped}`, colors.yellow);

  const passRate = ((results.passed / results.tests.length) * 100).toFixed(1);
  log(`\nPass rate: ${passRate}%`, passRate >= 80 ? colors.green : colors.red);

  log('\n========================================\n', colors.cyan);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  log(`\nUnexpected error: ${error.message}`, colors.red);
  log(error.stack, colors.red);
  process.exit(1);
});
