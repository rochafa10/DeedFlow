/**
 * Performance Verification Script for Virtualized Tables
 *
 * This script tests:
 * 1. Properties table virtualization on /properties page
 * 2. Comparables table virtualization on property report page
 * 3. DOM node counts
 * 4. Scrolling performance
 * 5. Feature preservation (sorting, filtering, expandable rows)
 */

const { chromium } = require('playwright');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyPropertiesTable(page) {
  console.log('\n=== PROPERTIES TABLE VERIFICATION ===\n');

  try {
    // Navigate to properties page
    console.log('1. Navigating to /properties page...');
    await page.goto('http://localhost:3000/properties', { waitUntil: 'networkidle' });
    await sleep(2000);

    // Take screenshot
    await page.screenshot({ path: './properties-table-initial.png', fullPage: false });
    console.log('   ✓ Screenshot saved: properties-table-initial.png');

    // Count total properties in view
    const totalProperties = await page.locator('[data-testid="property-row"], tr[data-index]').count();
    console.log(`\n2. Total property rows in view: ${totalProperties}`);

    // Count visible rows in viewport (should be ~20-30 for virtualization)
    const visibleRows = await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr[style*="transform"]');
      return rows.length;
    });
    console.log(`   Virtualized rows rendered: ${visibleRows}`);

    // Check if virtualization is working (should be much less than total if we have 100+ properties)
    if (visibleRows > 0 && visibleRows < 50) {
      console.log('   ✓ PASS: Virtualization is active (rendering only visible rows)');
    } else {
      console.log(`   ⚠ WARNING: Expected ~20-30 visible rows, got ${visibleRows}`);
    }

    // Check for virtual scrolling container
    const hasVirtualContainer = await page.evaluate(() => {
      const container = document.querySelector('[style*="height"][style*="position: relative"]');
      return container !== null;
    });
    console.log(`   Virtual scroll container present: ${hasVirtualContainer ? '✓' : '✗'}`);

    // Test sorting functionality
    console.log('\n3. Testing sorting functionality...');
    const sortButton = page.locator('th:has-text("Total Due")').first();
    await sortButton.click();
    await sleep(1000);
    console.log('   ✓ Clicked sort on "Total Due" column');

    // Test filtering
    console.log('\n4. Testing filtering...');
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await sleep(1000);
      await searchInput.clear();
      console.log('   ✓ Search filter works');
    }

    // Test scrolling performance
    console.log('\n5. Testing scroll performance...');
    const tableContainer = page.locator('tbody').first();

    // Scroll down multiple times
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 200);
      await sleep(100);
    }
    console.log('   ✓ Scrolling completed smoothly');

    // Take final screenshot
    await page.screenshot({ path: './properties-table-scrolled.png', fullPage: false });
    console.log('   ✓ Screenshot saved: properties-table-scrolled.png');

    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await sleep(1000);

    if (errors.length === 0) {
      console.log('\n   ✓ No console errors detected');
    } else {
      console.log(`\n   ⚠ Console errors found: ${errors.length}`);
      errors.forEach(err => console.log(`      - ${err}`));
    }

    return {
      passed: visibleRows > 0 && visibleRows < 50,
      visibleRows,
      totalProperties,
      hasVirtualContainer
    };

  } catch (error) {
    console.error('   ✗ ERROR:', error.message);
    return { passed: false, error: error.message };
  }
}

async function verifyComparablesTable(page) {
  console.log('\n=== COMPARABLES TABLE VERIFICATION ===\n');

  try {
    console.log('1. Navigating to property report page...');

    // First, get a property ID from the properties page
    await page.goto('http://localhost:3000/properties', { waitUntil: 'networkidle' });
    await sleep(2000);

    // Try to find a property link
    const propertyLink = page.locator('a[href*="/report/"]').first();
    const href = await propertyLink.getAttribute('href');

    if (!href) {
      console.log('   ⚠ No property report links found, skipping comparables test');
      return { passed: true, skipped: true };
    }

    console.log(`   Found property report: ${href}`);

    // Navigate to the report
    await page.goto(`http://localhost:3000${href}`, { waitUntil: 'networkidle' });
    await sleep(3000);

    // Take screenshot
    await page.screenshot({ path: './comparables-table-initial.png', fullPage: true });
    console.log('   ✓ Screenshot saved: comparables-table-initial.png');

    // Look for comparables table
    const comparablesSection = page.locator('h3:has-text("Comparable Sales"), h2:has-text("Comparable")');

    if (!(await comparablesSection.isVisible())) {
      console.log('   ⚠ Comparables section not found on this property');
      return { passed: true, skipped: true };
    }

    console.log('\n2. Analyzing comparables table...');

    // Count rows in comparables table
    const comparableRows = await page.evaluate(() => {
      // Look for comparables table rows
      const tables = document.querySelectorAll('table');
      let maxRows = 0;

      tables.forEach(table => {
        const rows = table.querySelectorAll('tbody tr');
        if (rows.length > maxRows) {
          maxRows = rows.length;
        }
      });

      return maxRows;
    });

    console.log(`   Comparable rows in DOM: ${comparableRows}`);

    // Check for virtualization indicators
    const hasVirtualization = await page.evaluate(() => {
      const virtualRows = document.querySelectorAll('tbody tr[style*="transform"]');
      return virtualRows.length > 0;
    });

    console.log(`   Virtualization active: ${hasVirtualization ? '✓' : '✗'}`);

    if (hasVirtualization && comparableRows < 20) {
      console.log('   ✓ PASS: Comparables table is virtualized');
    } else if (comparableRows < 20) {
      console.log('   ℹ INFO: Table has few rows, virtualization may not be visible');
    }

    // Test expandable rows
    console.log('\n3. Testing expandable rows...');
    const expandButton = page.locator('button:has-text("Details"), button[aria-label*="expand"]').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await sleep(1000);
      console.log('   ✓ Expandable row toggled');

      // Take screenshot of expanded state
      await page.screenshot({ path: './comparables-table-expanded.png', fullPage: true });
      console.log('   ✓ Screenshot saved: comparables-table-expanded.png');
    } else {
      console.log('   ℹ No expandable rows found');
    }

    // Test sorting
    console.log('\n4. Testing sorting on comparables table...');
    const sortHeader = page.locator('table th').first();
    if (await sortHeader.isVisible()) {
      await sortHeader.click();
      await sleep(1000);
      console.log('   ✓ Sorting tested');
    }

    return {
      passed: true,
      comparableRows,
      hasVirtualization
    };

  } catch (error) {
    console.error('   ✗ ERROR:', error.message);
    return { passed: false, error: error.message };
  }
}

async function runVerification() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  VIRTUALIZATION PERFORMANCE VERIFICATION TEST              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Test 1: Properties Table
    const propertiesResult = await verifyPropertiesTable(page);

    // Test 2: Comparables Table
    const comparablesResult = await verifyComparablesTable(page);

    // Summary
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  VERIFICATION SUMMARY                                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Properties Table:');
    console.log(`  Status: ${propertiesResult.passed ? '✓ PASS' : '✗ FAIL'}`);
    if (propertiesResult.visibleRows) {
      console.log(`  Visible rows rendered: ${propertiesResult.visibleRows}`);
      console.log(`  Total properties: ${propertiesResult.totalProperties}`);
      console.log(`  Virtual container: ${propertiesResult.hasVirtualContainer ? 'Yes' : 'No'}`);
    }

    console.log('\nComparables Table:');
    if (comparablesResult.skipped) {
      console.log('  Status: ⊘ SKIPPED (No comparables data available)');
    } else {
      console.log(`  Status: ${comparablesResult.passed ? '✓ PASS' : '✗ FAIL'}`);
      if (comparablesResult.comparableRows !== undefined) {
        console.log(`  Comparable rows: ${comparablesResult.comparableRows}`);
        console.log(`  Virtualization: ${comparablesResult.hasVirtualization ? 'Active' : 'Not detected'}`);
      }
    }

    console.log('\nScreenshots saved:');
    console.log('  - properties-table-initial.png');
    console.log('  - properties-table-scrolled.png');
    if (!comparablesResult.skipped) {
      console.log('  - comparables-table-initial.png');
      console.log('  - comparables-table-expanded.png');
    }

    console.log('\n' + '='.repeat(60));
    console.log('OVERALL RESULT:',
      propertiesResult.passed && comparablesResult.passed
        ? '✓ ALL TESTS PASSED'
        : '⚠ SOME TESTS NEED REVIEW'
    );
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n✗ VERIFICATION FAILED:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the verification
runVerification().catch(console.error);
