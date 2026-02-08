const { chromium } = require('playwright');

(async () => {
  console.log('=== Typing SSH Key Commands ===\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    slowMo: 20
  });

  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log('[1] Opening console...');
  await page.goto('https://cloud.digitalocean.com/droplets/517414136/terminal/ui/?os_user=root');

  console.log('[2] Waiting for console...');
  await page.waitForTimeout(8000);

  console.log('[3] Clicking to focus...');
  await page.mouse.click(700, 400);
  await page.waitForTimeout(1000);

  // Press Enter to get a fresh prompt
  console.log('[4] Getting fresh prompt...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  console.log('[5] Typing SSH key commands...\n');

  // Command 1: mkdir
  console.log('    > mkdir -p ~/.ssh');
  await page.keyboard.type('mkdir -p ~/.ssh', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  // Command 2: add key
  console.log('    > echo ssh key >> authorized_keys');
  await page.keyboard.type('echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude" >> ~/.ssh/authorized_keys', { delay: 15 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  // Command 3: chmod
  console.log('    > chmod 600');
  await page.keyboard.type('chmod 600 ~/.ssh/authorized_keys', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  // Command 4: verify
  console.log('    > cat to verify');
  await page.keyboard.type('cat ~/.ssh/authorized_keys', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  // Command 5: success message
  console.log('    > echo done');
  await page.keyboard.type('echo "=== SSH KEY SETUP COMPLETE ==="', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  console.log('\n[6] Commands sent!');
  console.log('\n========================================');
  console.log('Check the console - you should see the key');
  console.log('and "=== SSH KEY SETUP COMPLETE ===" message');
  console.log('========================================\n');

  // Keep open
  await new Promise(() => {});
})();
