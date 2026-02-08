const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('[1/8] Navigating to DigitalOcean login...');
  await page.goto('https://cloud.digitalocean.com/login');
  await page.waitForTimeout(3000);
  
  // Check if we need to log in
  const googleBtn = await page.locator('text=Sign in with Google').first();
  if (await googleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('[2/8] Clicking Sign in with Google...');
    await googleBtn.click();
    console.log('[2/8] Please complete Google login in the browser...');
    // Wait for redirect back to DigitalOcean
    await page.waitForURL('**/droplets**', { timeout: 120000 });
  }
  
  console.log('[3/8] Navigating to droplet...');
  await page.goto('https://cloud.digitalocean.com/droplets/517414136');
  await page.waitForTimeout(3000);
  
  console.log('[4/8] Looking for Access tab...');
  // Try to click Access tab
  try {
    await page.locator('a:has-text("Access")').first().click({ timeout: 5000 });
    await page.waitForTimeout(2000);
  } catch(e) {
    console.log('Access tab not found or already on it');
  }
  
  console.log('[5/8] Looking for Launch Droplet Console...');
  // Find and click the Launch Droplet Console button
  const consoleBtn = page.locator('button:has-text("Launch Droplet Console"), a:has-text("Launch Droplet Console")').first();
  await consoleBtn.click({ timeout: 10000 });
  
  console.log('[6/8] Waiting for console to load...');
  await page.waitForTimeout(8000);
  
  // The console opens in an iframe or new element
  // Try to find the terminal area
  const terminalFrame = page.frameLocator('iframe').first();
  
  console.log('[7/8] Typing SSH key command...');
  // Type the command to add SSH key
  const sshCommand = 'mkdir -p ~/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude-code-deploy" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo "SSH key added!"';
  
  // Try typing in the main page first (console might be embedded)
  await page.keyboard.type(sshCommand, { delay: 10 });
  await page.keyboard.press('Enter');
  
  console.log('[8/8] Command sent! Waiting 5 seconds...');
  await page.waitForTimeout(5000);
  
  console.log('Done! SSH key should be added. Keeping browser open...');
  console.log('Press Ctrl+C to close when ready.');
  
  // Keep browser open
  await new Promise(() => {});
})();
