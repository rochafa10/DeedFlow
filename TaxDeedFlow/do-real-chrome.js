const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('=== Launching YOUR Chrome with your Google account ===\n');
  
  // Path to actual Chrome user data
  const userDataDir = 'C:\Users\fs_ro\AppData\Local\Google\Chrome\User Data';
  
  console.log('[1] Launching Chrome with your profile...');
  console.log('    (This has your Google account logged in)\n');
  
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    executablePath: 'C:\Program Files\Google\Chrome\Application\chrome.exe',
    args: [
      '--profile-directory=Default',
      '--no-first-run',
      '--disable-blink-features=AutomationControlled'
    ],
    slowMo: 100
  });
  
  const page = browser.pages()[0] || await browser.newPage();
  
  console.log('[2] Navigating to DigitalOcean droplet page...');
  await page.goto('https://cloud.digitalocean.com/droplets/517414136');
  await page.waitForTimeout(3000);
  
  console.log('[3] Checking if logged in...');
  const content = await page.content();
  
  if (content.includes('n8n-droplet') || content.includes('Access')) {
    console.log('[3] ✓ Already logged in!\n');
  } else {
    console.log('[3] Waiting for page to load...');
    await page.waitForTimeout(5000);
  }
  
  console.log('[4] Clicking Access tab...');
  try {
    await page.click('a:has-text("Access")', { timeout: 5000 });
    await page.waitForTimeout(2000);
    console.log('[4] ✓ Clicked Access\n');
  } catch(e) {
    console.log('[4] Access not found, continuing...\n');
  }
  
  console.log('[5] Clicking Launch Droplet Console...');
  try {
    await page.click('button:has-text("Launch Droplet Console")', { timeout: 5000 });
    console.log('[5] ✓ Console launching...\n');
  } catch(e) {
    try {
      await page.click('text=Launch Droplet Console');
      console.log('[5] ✓ Console launching...\n');
    } catch(e2) {
      console.log('[5] Console button not found\n');
    }
  }
  
  console.log('[6] Waiting 10 seconds for console to fully load...');
  await page.waitForTimeout(10000);
  
  console.log('[7] Typing SSH key command into console...\n');
  const cmd = 'mkdir -p ~/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude-code-deploy" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo "=== SSH KEY ADDED ==="';
  
  await page.keyboard.type(cmd, { delay: 5 });
  await page.keyboard.press('Enter');
  
  console.log('[7] ✓ Command sent!\n');
  console.log('[8] Waiting for execution...');
  await page.waitForTimeout(3000);
  
  console.log('\n========================================');
  console.log('Look for "=== SSH KEY ADDED ===" in console');
  console.log('Browser will stay open.');
  console.log('Press Ctrl+C when done.');
  console.log('========================================\n');
  
  await new Promise(() => {});
})();
