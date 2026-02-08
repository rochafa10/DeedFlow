const { chromium } = require('playwright');

(async () => {
  console.log('=== DigitalOcean Console v2 - Improved ===\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    slowMo: 30
  });

  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log('[1] Opening DigitalOcean...');
  await page.goto('https://cloud.digitalocean.com/droplets/517414136/access');

  console.log('[2] Waiting for login (check browser, log in with Google)...');

  for (let i = 0; i < 120; i++) {
    const content = await page.content();
    if (content.includes('Launch Droplet Console')) {
      console.log('[2] Logged in!\n');
      break;
    }
    if (i % 20 === 0 && i > 0) console.log('    Waiting... ' + i + 's');
    await page.waitForTimeout(1000);
  }

  await page.waitForTimeout(2000);

  console.log('[3] Clicking Launch Droplet Console...');
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (b.textContent.includes('Launch Droplet Console')) {
        b.click();
        return true;
      }
    }
    return false;
  });

  console.log('[4] Waiting 25 seconds for console to fully initialize...');
  await page.waitForTimeout(25000);

  console.log('[5] Looking for console iframe or terminal...');

  // Check for iframe
  const frames = page.frames();
  console.log('    Found ' + frames.length + ' frames');

  let terminalFrame = null;
  for (const frame of frames) {
    const url = frame.url();
    console.log('    Frame URL: ' + url.substring(0, 80));
    if (url.includes('console') || url.includes('terminal') || url.includes('droplet')) {
      terminalFrame = frame;
    }
  }

  // Try to find the terminal element
  console.log('[6] Attempting to focus terminal...');

  // Click in the center of the page where console usually appears
  await page.mouse.click(700, 450);
  await page.waitForTimeout(500);
  await page.mouse.click(700, 450);
  await page.waitForTimeout(500);

  // Try pressing Enter first to wake up the console
  console.log('[7] Sending initial keystrokes to wake console...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  console.log('[8] Typing commands...\n');

  // Type commands with good delays
  const cmds = [
    'mkdir -p ~/.ssh',
    'echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude" >> ~/.ssh/authorized_keys',
    'chmod 600 ~/.ssh/authorized_keys',
    'cat ~/.ssh/authorized_keys',
    'echo DONE-SSH-KEY-ADDED'
  ];

  for (const cmd of cmds) {
    console.log('    > ' + cmd.substring(0, 60) + (cmd.length > 60 ? '...' : ''));

    // Type slowly
    for (const char of cmd) {
      await page.keyboard.type(char, { delay: 10 });
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
  }

  console.log('\n[9] All commands typed!');
  console.log('\n========================================');
  console.log('Check the browser console for output.');
  console.log('You should see the SSH key and "DONE-SSH-KEY-ADDED"');
  console.log('========================================\n');

  // Keep open
  await new Promise(() => {});
})();
