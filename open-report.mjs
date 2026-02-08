import { chromium } from 'playwright';

const URL = 'http://localhost:3000/report/fba1484e-1af2-4236-8e7c-55cc179e8f0d';

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Page open - browse freely. Press Ctrl+C to close.');

  // Keep alive indefinitely
  await new Promise(() => {});
}

main().catch(console.error);
