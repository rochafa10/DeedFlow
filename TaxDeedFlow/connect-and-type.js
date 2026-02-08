const { chromium } = require('playwright');

(async () => {
  console.log('=== Connecting to Existing Chrome ===\n');

  console.log('[1] Connecting to Chrome on port 9222...');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

  const contexts = browser.contexts();
  console.log('[1] Found', contexts.length, 'contexts');

  const pages = contexts[0].pages();
  console.log('[1] Found', pages.length, 'pages');

  // Find the DO console page
  let page = null;
  for (const p of pages) {
    const url = p.url();
    console.log('    Page:', url.substring(0, 60));
    if (url.includes('digitalocean') || url.includes('terminal')) {
      page = p;
      break;
    }
  }

  if (!page) {
    page = pages[0];
    console.log('[1] Using first page');
  }

  console.log('[2] Focusing on page...');
  await page.bringToFront();
  await page.waitForTimeout(1000);

  console.log('[3] Clicking terminal area...');
  await page.mouse.click(700, 400);
  await page.waitForTimeout(500);

  console.log('[4] Typing SSH key commands...\n');

  // Type commands
  console.log('    > mkdir -p ~/.ssh');
  await page.keyboard.type('mkdir -p ~/.ssh', { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  console.log('    > Adding SSH key...');
  await page.keyboard.type('echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude" >> ~/.ssh/authorized_keys', { delay: 20 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  console.log('    > chmod 600');
  await page.keyboard.type('chmod 600 ~/.ssh/authorized_keys', { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  console.log('    > Verifying...');
  await page.keyboard.type('cat ~/.ssh/authorized_keys && echo "KEY_ADDED_OK"', { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  console.log('\n[5] Done! Check the console.');
  console.log('\n========================================');
  console.log('SSH key commands have been typed!');
  console.log('You should see the key and "KEY_ADDED_OK"');
  console.log('========================================\n');

  // Disconnect (don't close the browser)
  browser.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
