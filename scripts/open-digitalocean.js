// Playwright script to open DigitalOcean login page
// Run with: npx playwright test scripts/open-digitalocean.js --headed

const { chromium } = require('playwright');

async function openDigitalOceanLogin() {
  console.log('Launching browser...');

  // Launch browser in headed mode so you can see and interact with it
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500  // Slow down actions so you can see them
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to DigitalOcean login page...');
  await page.goto('https://cloud.digitalocean.com/login');

  console.log('Page loaded. Current URL:', page.url());
  console.log('');
  console.log('Please log in with your Google account.');
  console.log('The browser will stay open for you to complete login.');
  console.log('');
  console.log('Press Ctrl+C in this terminal when done.');

  // Keep the browser open indefinitely
  await new Promise(() => {});
}

openDigitalOceanLogin().catch(console.error);
