const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  console.log('=== DigitalOcean Console - Direct Typing ===\n');

  console.log('[1] Launching Chrome...');
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    slowMo: 50,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  console.log('[2] Opening DigitalOcean droplet page...');
  await page.goto('https://cloud.digitalocean.com/droplets/517414136/access');

  console.log('[3] Waiting for you to log in (90 seconds)...');
  console.log('    Please log in with Google when the page loads.\n');

  let ready = false;
  for (let i = 0; i < 90; i++) {
    try {
      const content = await page.content();
      if (content.includes('Launch Droplet Console') || content.includes('Recovery Console')) {
        ready = true;
        console.log('[3] Logged in! Found console options.\n');
        break;
      }
    } catch(e) {}
    if (i > 0 && i % 15 === 0) console.log('    Still waiting... (' + i + 's)');
    await page.waitForTimeout(1000);
  }

  if (!ready) {
    console.log('[3] Timeout waiting for login. Continuing anyway...\n');
  }

  await page.waitForTimeout(2000);

  console.log('[4] Clicking "Launch Droplet Console"...');
  try {
    await page.click('button:has-text("Launch Droplet Console")');
    console.log('[4] Clicked console button!\n');
  } catch(e) {
    try {
      await page.click('text=Launch Droplet Console');
      console.log('[4] Clicked console button!\n');
    } catch(e2) {
      console.log('[4] Trying to find button another way...');
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text && text.includes('Launch')) {
          await btn.click();
          console.log('[4] Clicked a Launch button!\n');
          break;
        }
      }
    }
  }

  console.log('[5] Waiting 20 seconds for console to fully load...');
  await page.waitForTimeout(20000);

  console.log('[6] Focusing on terminal...');

  // Click anywhere on the page to ensure focus, then try terminal
  await page.mouse.click(700, 500);
  await page.waitForTimeout(500);

  // Try to find and click the terminal/canvas
  try {
    const canvas = await page.$('canvas');
    if (canvas) {
      await canvas.click();
      console.log('[6] Clicked on canvas terminal');
    }
  } catch(e) {}

  await page.waitForTimeout(2000);

  console.log('[7] Typing SSH key setup commands...\n');

  // Type each command
  console.log('    > mkdir -p ~/.ssh');
  await page.keyboard.type('mkdir -p ~/.ssh', { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  console.log('    > Adding SSH key...');
  await page.keyboard.type('echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude" >> ~/.ssh/authorized_keys', { delay: 15 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  console.log('    > chmod 600 ~/.ssh/authorized_keys');
  await page.keyboard.type('chmod 600 ~/.ssh/authorized_keys', { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  console.log('    > Verification message...');
  await page.keyboard.type('echo "=== SSH KEY ADDED OK ==="', { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  console.log('\n[8] Commands sent!');
  console.log('\n========================================');
  console.log('Look for "=== SSH KEY ADDED OK ===" in the console');
  console.log('Browser will stay open.');
  console.log('Press Ctrl+C in terminal when done.');
  console.log('========================================\n');

  await new Promise(() => {});
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
