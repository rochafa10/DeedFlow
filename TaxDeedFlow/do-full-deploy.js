const { chromium } = require('playwright');

(async () => {
  console.log('=== DigitalOcean Console Deployment ===\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome',
    slowMo: 100
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('[Step 1] Opening DigitalOcean...');
  await page.goto('https://cloud.digitalocean.com/droplets/517414136');
  
  console.log('[Step 2] Please log in with Google if prompted...');
  console.log('         Waiting up to 2 minutes for login...\n');
  
  // Wait for the user to log in - look for the droplet page indicators
  let loggedIn = false;
  for (let i = 0; i < 120; i++) {
    try {
      const url = page.url();
      const content = await page.content();
      if ((url.includes('/droplets/') && content.includes('n8n-droplet')) || 
          content.includes('Launch Droplet Console') ||
          content.includes('Access')) {
        loggedIn = true;
        console.log('[Step 2] ✓ Logged in successfully!\n');
        break;
      }
    } catch(e) {}
    
    if (i > 0 && i % 15 === 0) {
      console.log(`         Still waiting for login... (${i}s)`);
    }
    await page.waitForTimeout(1000);
  }
  
  if (!loggedIn) {
    console.log('[Step 2] Login timeout - continuing anyway...\n');
  }
  
  await page.waitForTimeout(2000);
  
  console.log('[Step 3] Clicking Access tab...');
  try {
    await page.click('a:has-text("Access")', { timeout: 8000 });
    console.log('[Step 3] ✓ Clicked Access tab\n');
    await page.waitForTimeout(2000);
  } catch(e) {
    console.log('[Step 3] Access tab not found (may already be there)\n');
  }
  
  console.log('[Step 4] Clicking Launch Droplet Console...');
  try {
    // Try multiple selectors
    const clicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a');
      for (const btn of buttons) {
        if (btn.textContent.includes('Launch Droplet Console') || 
            btn.textContent.includes('Launch Console')) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    
    if (clicked) {
      console.log('[Step 4] ✓ Clicked console button\n');
    } else {
      // Try direct click
      await page.click('text=Launch Droplet Console', { timeout: 5000 });
      console.log('[Step 4] ✓ Clicked console button\n');
    }
  } catch(e) {
    console.log('[Step 4] Could not click console button: ' + e.message + '\n');
  }
  
  console.log('[Step 5] Waiting 8 seconds for console to load...');
  await page.waitForTimeout(8000);
  console.log('[Step 5] ✓ Console should be ready\n');
  
  console.log('[Step 6] Typing SSH key command...');
  const sshCmd = 'mkdir -p ~/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude-code-deploy" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo "KEY_ADDED_OK"';
  
  // Focus on the page and type
  await page.keyboard.type(sshCmd, { delay: 3 });
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  console.log('[Step 6] ✓ Command sent!\n');
  
  console.log('[Step 7] Waiting for command execution...');
  await page.waitForTimeout(3000);
  console.log('[Step 7] ✓ Done!\n');
  
  console.log('===========================================');
  console.log('Check the console for "KEY_ADDED_OK" output');
  console.log('If successful, SSH access is now enabled.');
  console.log('Press Ctrl+C to close browser when ready.');
  console.log('===========================================\n');
  
  // Keep alive
  await new Promise(() => {});
})();
