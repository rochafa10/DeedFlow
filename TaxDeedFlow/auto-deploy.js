const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== Auto Deploy Script ===');
  console.log('');
  console.log('[1] Connecting to Chrome...');

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];

  console.log('[1] Connected. URL:', page.url());

  // Wait for login
  console.log('[2] Waiting for you to log in...');
  for (let i = 0; i < 180; i++) { // Wait up to 3 minutes
    const url = page.url();
    if (!url.includes('login') && url.includes('cloud.digitalocean.com')) {
      console.log('[2] Logged in!');
      break;
    }
    if (i % 10 === 0 && i > 0) {
      console.log('    Still waiting... (' + i + 's) - Please log in with Google');
    }
    await page.waitForTimeout(1000);
  }

  // Navigate to console
  console.log('[3] Going to droplet console...');
  await page.goto('https://cloud.digitalocean.com/droplets/517414136/terminal/ui/?os_user=root');

  console.log('[4] Waiting 10 seconds for console to load...');
  await page.waitForTimeout(10000);

  // Check if authenticated
  const content = await page.evaluate(() => document.body.innerText);
  if (content.includes('Unauthorized') || content.includes('Unable to authenticate')) {
    console.log('[ERROR] Not authenticated. Please log in to DigitalOcean first.');
    process.exit(1);
  }

  console.log('[5] Clicking terminal area...');
  await page.mouse.click(600, 400);
  await page.waitForTimeout(500);
  await page.mouse.click(600, 400);
  await page.waitForTimeout(1000);

  console.log('[6] Pressing Enter for fresh prompt...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  console.log('[7] Adding SSH key...');
  console.log('');

  // SSH key commands
  const sshCommands = [
    'mkdir -p ~/.ssh',
    'echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude" >> ~/.ssh/authorized_keys',
    'chmod 600 ~/.ssh/authorized_keys',
    'cat ~/.ssh/authorized_keys',
    'echo "=== SSH KEY ADDED ==="'
  ];

  for (const cmd of sshCommands) {
    console.log('    > ' + cmd.substring(0, 60) + (cmd.length > 60 ? '...' : ''));
    await page.keyboard.type(cmd, { delay: 20 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
  }

  console.log('');
  console.log('[8] SSH key should be added!');
  console.log('');

  // Now deploy the script
  console.log('[9] Reading v17 script from local...');
  const scriptPath = path.join(__dirname, '..', 'scripts', 'regrid-screenshot-v17.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  console.log('[9] Script size:', scriptContent.length, 'bytes');

  // Create script on server
  console.log('[10] Creating script on server...');

  // Use base64 to safely transfer the script
  const base64Script = Buffer.from(scriptContent).toString('base64');

  await page.keyboard.type('echo "' + base64Script.substring(0, 1000) + '" > /tmp/script_part1.txt', { delay: 5 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // Script is too long for typing, use a different approach
  console.log('[10] Script too long for direct typing.');
  console.log('[10] Will use docker cp after SSH connection works.');

  console.log('');
  console.log('========================================');
  console.log('SSH key commands sent!');
  console.log('Check the browser console for output.');
  console.log('');
  console.log('Next: Test SSH connection and deploy.');
  console.log('========================================');

  // Keep browser open
})().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
