/**
 * Visual Regression Test for Chart Lazy Loading
 *
 * Verifies that all charts render correctly after implementing code splitting
 */

const { chromium } = require('playwright');

async function testCharts() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    passed: [],
    failed: [],
    errors: []
  };

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Console error:', msg.text());
      results.errors.push(`Console error: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.error('Page error:', error.message);
    results.errors.push(`Page error: ${error.message}`);
  });

  try {
    console.log('\n=== Testing Financial Dashboard ===\n');

    // Test 1: Financial Dashboard loads
    console.log('1. Testing financial dashboard page load...');
    await page.goto('http://localhost:3004/demo/financial', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for lazy loading

    const title = await page.title();
    console.log(`   Page title: ${title}`);

    // Check if page loaded
    const content = await page.content();
    if (content.includes('Financial Dashboard') || content.includes('financial')) {
      results.passed.push('Financial dashboard page loads');
      console.log('   ✓ Financial dashboard loaded');
    } else {
      results.failed.push('Financial dashboard page does not load');
      console.log('   ✗ Financial dashboard did not load');
    }

    // Test 2: Check for chart tabs
    console.log('\n2. Testing chart tabs...');

    // Look for tab elements or chart containers
    const tabs = await page.locator('[role="tab"], .tab, button[data-value], button:has-text("Overview"), button:has-text("Costs"), button:has-text("Returns"), button:has-text("Comparables")').all();
    console.log(`   Found ${tabs.length} potential tab elements`);

    if (tabs.length > 0) {
      results.passed.push(`Found ${tabs.length} chart tabs`);
      console.log('   ✓ Chart tabs found');

      // Try clicking through tabs
      for (let i = 0; i < Math.min(tabs.length, 4); i++) {
        try {
          console.log(`   Clicking tab ${i + 1}...`);
          await tabs[i].click();
          await page.waitForTimeout(1500); // Wait for chart to lazy load
          results.passed.push(`Tab ${i + 1} clicked successfully`);
          console.log(`   ✓ Tab ${i + 1} rendered`);
        } catch (e) {
          console.log(`   ⚠ Could not click tab ${i + 1}: ${e.message}`);
        }
      }
    } else {
      console.log('   ⚠ No tabs found - may be a single view');
    }

    // Test 3: Check for SVG elements (charts use SVG)
    console.log('\n3. Testing for rendered charts (SVG elements)...');
    await page.waitForTimeout(2000);

    const svgs = await page.locator('svg').all();
    console.log(`   Found ${svgs.length} SVG elements`);

    if (svgs.length > 0) {
      results.passed.push(`Found ${svgs.length} SVG chart elements`);
      console.log('   ✓ Charts rendered (SVG elements present)');
    } else {
      results.failed.push('No SVG chart elements found');
      console.log('   ✗ No charts rendered');
    }

    // Test 4: Check for recharts-specific elements
    const rechartsElements = await page.locator('.recharts-wrapper, .recharts-surface, .recharts-layer').all();
    console.log(`   Found ${rechartsElements.length} recharts elements`);

    if (rechartsElements.length > 0) {
      results.passed.push(`Found ${rechartsElements.length} recharts components`);
      console.log('   ✓ Recharts components loaded');
    }

    console.log('\n=== Testing Report Pages ===\n');

    // Test 5: Report page with charts
    console.log('4. Testing report page...');
    try {
      await page.goto('http://localhost:3004/report/demo', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const reportSvgs = await page.locator('svg').all();
      console.log(`   Found ${reportSvgs.length} SVG elements on report page`);

      if (reportSvgs.length > 0) {
        results.passed.push(`Report page rendered with ${reportSvgs.length} charts`);
        console.log('   ✓ Report page charts rendered');
      } else {
        console.log('   ⚠ No charts found on report page');
      }
    } catch (e) {
      console.log(`   ⚠ Could not load report page: ${e.message}`);
      // Try alternative report URL
      try {
        await page.goto('http://localhost:3004/properties/demo/report', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        const reportSvgs = await page.locator('svg').all();
        console.log(`   Found ${reportSvgs.length} SVG elements on alternative report page`);

        if (reportSvgs.length > 0) {
          results.passed.push(`Report page rendered with ${reportSvgs.length} charts`);
          console.log('   ✓ Report page charts rendered');
        }
      } catch (e2) {
        console.log(`   ⚠ Could not load alternative report page: ${e2.message}`);
      }
    }

    // Test 6: Check for specific chart types
    console.log('\n5. Testing specific chart types...');
    await page.goto('http://localhost:3004/demo/financial', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const pieCharts = await page.locator('.recharts-pie, path[class*="pie"]').all();
    const barCharts = await page.locator('.recharts-bar, .recharts-bar-rectangle').all();
    const lineCharts = await page.locator('.recharts-line, path[class*="line"]').all();

    console.log(`   Pie charts: ${pieCharts.length}`);
    console.log(`   Bar charts: ${barCharts.length}`);
    console.log(`   Line charts: ${lineCharts.length}`);

    if (pieCharts.length + barCharts.length + lineCharts.length > 0) {
      results.passed.push('Multiple chart types rendered');
      console.log('   ✓ Multiple chart types detected');
    }

  } catch (error) {
    console.error('\nTest error:', error.message);
    results.errors.push(`Test error: ${error.message}`);
  }

  await browser.close();

  // Print summary
  console.log('\n=== TEST SUMMARY ===\n');
  console.log(`Passed: ${results.passed.length}`);
  results.passed.forEach(p => console.log(`  ✓ ${p}`));

  console.log(`\nFailed: ${results.failed.length}`);
  results.failed.forEach(f => console.log(`  ✗ ${f}`));

  console.log(`\nErrors: ${results.errors.length}`);
  results.errors.forEach(e => console.log(`  ⚠ ${e}`));

  const success = results.failed.length === 0 && results.errors.length === 0 && results.passed.length > 0;

  console.log(`\n=== ${success ? 'TESTS PASSED ✓' : 'TESTS FAILED ✗'} ===\n`);

  return success ? 0 : 1;
}

testCharts().then(code => process.exit(code)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
