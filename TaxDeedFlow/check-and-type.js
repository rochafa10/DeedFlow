const { chromium } = require('playwright');

(async () => {
  console.log('=== Connecting to Chrome ===');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];

  console.log('Found', context.pages().length, 'pages');

  // Find the DO page
  let page = null;
  for (const p of context.pages()) {
    const url = p.url();
    console.log('  Page:', url.substring(0, 80));
    if (url.includes('digitalocean') && url.includes('terminal')) {
      page = p;
    }
  }

  if (!page) {
    console.log('');
    console.log('DO console page not found. Looking for any DO page...');
    for (const p of context.pages()) {
      if (p.url().includes('digitalocean')) {
        page = p;
        break;
      }
    }
  }

  if (!page) {
    console.log('No DigitalOcean page found!');
    process.exit(1);
  }

  console.log('');
  console.log('Using page:', page.url());

  // Check authentication
  const content = await page.evaluate(() => document.body.innerText.substring(0, 300));
  console.log('');
  console.log('Page content preview:');
  console.log(content.substring(0, 200));
  console.log('');

  if (content.includes('Unauthorized') || content.includes('Unable to authenticate')) {
    console.log('[!] NOT AUTHENTICATED - need to log in');
    process.exit(1);
  }

  // If on login page, wait
  if (page.url().includes('login')) {
    console.log('[!] On login page - please log in');
    process.exit(1);
  }

  console.log('[OK] Authenticated! Proceeding with SSH key setup...');
  console.log('');

  // Wait for console to fully load
  console.log('[1] Waiting for console to load...');
  await page.waitForTimeout(5000);

  // Click to focus terminal
  console.log('[2] Clicking terminal area...');
  await page.mouse.click(600, 400);
  await page.waitForTimeout(500);
  await page.mouse.click(600, 400);
  await page.waitForTimeout(1000);

  // Send Enter for fresh prompt
  console.log('[3] Getting fresh prompt...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  // Type SSH key commands
  console.log('[4] Typing SSH key commands...');
  console.log('');

  const commands = [
    'mkdir -p ~/.ssh',
    'echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude" >> ~/.ssh/authorized_keys',
    'chmod 600 ~/.ssh/authorized_keys',
    'cat ~/.ssh/authorized_keys',
    'echo "=== SSH KEY SETUP COMPLETE ==="'
  ];

  for (const cmd of commands) {
    const display = cmd.length > 60 ? cmd.substring(0, 57) + '...' : cmd;
    console.log('    > ' + display);
    await page.keyboard.type(cmd, { delay: 20 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
  }

  console.log('');
  console.log('[5] All commands sent!');
  console.log('');
  console.log('=====================================');
  console.log('Check the browser for:');
  console.log('  - SSH key displayed');
  console.log('  - "=== SSH KEY SETUP COMPLETE ===" message');
  console.log('=====================================');

})().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
