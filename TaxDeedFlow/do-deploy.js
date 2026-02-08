const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to DigitalOcean...');
  await page.goto('https://cloud.digitalocean.com/droplets/517414136');
  
  // Wait for user to log in if needed
  console.log('Please log in if prompted. Waiting for droplet page...');
  await page.waitForSelector('text=n8n-droplet', { timeout: 120000 });
  
  console.log('Droplet page loaded. Looking for Console button...');
  
  // Click on Access tab or Console
  const accessTab = await page.locator('text=Access').first();
  if (await accessTab.isVisible()) {
    await accessTab.click();
    await page.waitForTimeout(2000);
  }
  
  // Look for Launch Droplet Console button
  const consoleBtn = await page.locator('text=Launch Droplet Console').first();
  if (await consoleBtn.isVisible()) {
    console.log('Clicking Launch Droplet Console...');
    await consoleBtn.click();
  }
  
  // Keep browser open
  console.log('Browser will stay open. Press Ctrl+C to close.');
  await new Promise(() => {});
})();
