const { chromium } = require('playwright');

(async () => {
  console.log('=== Setting New Password & Adding SSH Key ===\n');

  // Connect to existing browser or launch new one
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    slowMo: 30
  });

  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log('[1] Opening console page...');
  await page.goto('https://cloud.digitalocean.com/droplets/517414136/terminal/ui/?os_user=root');

  console.log('[2] Waiting for console to load...');
  await page.waitForTimeout(10000);

  // Click to focus the terminal
  console.log('[3] Focusing terminal...');
  await page.mouse.click(700, 400);
  await page.waitForTimeout(1000);

  // Set new password
  const newPassword = 'TaxDeedFlow2026!';

  console.log('[4] Typing new password...');
  await page.keyboard.type(newPassword, { delay: 50 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  console.log('[5] Confirming new password...');
  await page.keyboard.type(newPassword, { delay: 50 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  console.log('[6] Password should be set. Now adding SSH key...');

  // Wait for shell prompt
  await page.waitForTimeout(2000);

  // Add SSH key commands
  console.log('[7] Creating .ssh directory...');
  await page.keyboard.type('mkdir -p ~/.ssh', { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  console.log('[8] Adding SSH key...');
  await page.keyboard.type('echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude" >> ~/.ssh/authorized_keys', { delay: 20 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  console.log('[9] Setting permissions...');
  await page.keyboard.type('chmod 600 ~/.ssh/authorized_keys', { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  console.log('[10] Verifying...');
  await page.keyboard.type('cat ~/.ssh/authorized_keys && echo "=== SSH KEY ADDED ==="', { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  console.log('\n========================================');
  console.log('Password set to: ' + newPassword);
  console.log('SSH key should be added.');
  console.log('Check the console for verification.');
  console.log('========================================\n');

  await new Promise(() => {});
})();
