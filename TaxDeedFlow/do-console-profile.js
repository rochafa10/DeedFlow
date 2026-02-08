const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  // Use existing Chrome user data to preserve login
  const userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
  
  console.log('[1/6] Launching browser with your Chrome profile...');
  
  const browser = await chromium.launchPersistentContext(
    path.join(os.tmpdir(), 'playwright-do-session'), 
    {
      headless: false,
      channel: 'chrome',  // Use installed Chrome
      slowMo: 50,
      args: ['--disable-blink-features=AutomationControlled']
    }
  );
  
  const page = browser.pages()[0] || await browser.newPage();
  
  console.log('[2/6] Navigating to DigitalOcean droplet page...');
  await page.goto('https://cloud.digitalocean.com/droplets/517414136');
  
  console.log('[2/6] Waiting for page load (please log in if needed)...');
  await page.waitForTimeout(5000);
  
  // Check if logged in by looking for droplet name
  let loggedIn = false;
  for (let i = 0; i < 60; i++) {
    const content = await page.content();
    if (content.includes('n8n-droplet') || content.includes('Access')) {
      loggedIn = true;
      console.log('[3/6] Logged in! Found droplet page.');
      break;
    }
    if (i % 10 === 0) console.log(`[2/6] Waiting for login... (${i}s)`);
    await page.waitForTimeout(1000);
  }
  
  if (!loggedIn) {
    console.log('Could not confirm login. Continuing anyway...');
  }
  
  console.log('[4/6] Clicking Access tab...');
  try {
    await page.click('a:has-text("Access")', { timeout: 5000 });
    await page.waitForTimeout(2000);
  } catch(e) {
    console.log('Access tab click failed, may already be there');
  }
  
  console.log('[5/6] Clicking Launch Droplet Console...');
  try {
    await page.click('button:has-text("Launch Droplet Console")', { timeout: 5000 });
  } catch(e) {
    try {
      await page.click('text=Launch Droplet Console', { timeout: 3000 });
    } catch(e2) {
      console.log('Could not find console button');
    }
  }
  
  console.log('[6/6] Console should be opening. Keeping browser open...');
  console.log('Please complete any remaining steps in the browser.');
  console.log('Press Ctrl+C when done.');
  
  await new Promise(() => {});
})();
