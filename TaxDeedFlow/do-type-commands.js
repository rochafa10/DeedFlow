const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  console.log('Connecting to existing browser session...');
  
  const browser = await chromium.launchPersistentContext(
    path.join(os.tmpdir(), 'playwright-do-session'), 
    {
      headless: false,
      channel: 'chrome',
      slowMo: 50
    }
  );
  
  const pages = browser.pages();
  let page = pages.find(p => p.url().includes('digitalocean')) || pages[0];
  
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://cloud.digitalocean.com/droplets/517414136');
  }
  
  console.log('Current URL:', page.url());
  
  // Click Access tab
  console.log('Clicking Access tab...');
  try {
    await page.click('a:has-text("Access")', { timeout: 5000 });
    await page.waitForTimeout(2000);
  } catch(e) {
    console.log('Access tab not found or already there');
  }
  
  // Click Launch Droplet Console
  console.log('Clicking Launch Droplet Console...');
  try {
    await page.click('button:has-text("Launch Droplet Console")', { timeout: 5000 });
    await page.waitForTimeout(5000);
  } catch(e) {
    try {
      await page.click('text=Launch Droplet Console', { timeout: 3000 });
      await page.waitForTimeout(5000);
    } catch(e2) {
      console.log('Console button not found, may already be open');
    }
  }
  
  // Wait for console to initialize
  console.log('Waiting for console to initialize...');
  await page.waitForTimeout(5000);
  
  // The console is typically in an iframe or a terminal element
  // Type the SSH key command
  const sshKeyCmd = 'mkdir -p ~/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude-code-deploy" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo "SSH key added successfully!"';
  
  console.log('Typing SSH key command into console...');
  
  // Try to focus and type - the terminal usually captures keyboard input
  await page.keyboard.type(sshKeyCmd, { delay: 5 });
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  
  console.log('Command sent! Waiting for execution...');
  await page.waitForTimeout(3000);
  
  console.log('Done! Check the console for "SSH key added successfully!"');
  console.log('Browser staying open...');
  
  await new Promise(() => {});
})();
