// Script to backup remaining n8n workflows
// Uses the n8n API directly
import https from 'https';
import fs from 'fs';
import path from 'path';

const N8N_HOST = 'n8n.lfb-investments.com';
const BACKUP_DIR = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');

// Read API key from environment or use the one from n8n config
const API_KEY = process.env.N8N_API_KEY;

if (!API_KEY) {
  console.error('ERROR: Set N8N_API_KEY environment variable first');
  console.error('Example: set N8N_API_KEY=your_api_key_here');
  process.exit(1);
}

const workflows = [
  { id: 'P8uYC8znWT5h4xq2', name: 'TDF - Batch Job Orchestrator' },
  { id: 'SGUwY3pSYRUChIqK', name: '[JJ] Telegram send message' },
  { id: 'SjHHldADMU7vhteX', name: 'YNAB' },
  { id: 'YKwt3tZMgk0Gt2bd', name: 'My workflow 2' },
  { id: 'bm1bcZY4dhH7dExd', name: 'My workflow 3' },
  { id: 'cowlU6kpyKlzrjBB', name: '[JJ] CRUD Notes' },
  { id: 'dNwrDxSeiaUdLipY', name: '[JJ] Image Tool' },
  { id: 'iGHGkhJfZFbyDK5v', name: '[JJ] Manage Scheduled Tasks' },
  { id: 'l1RWUMPJ1x6logZP', name: '[JJ] Telegram input' },
  { id: 'pHmJgmtMCbRyTtne', name: 'TDF - Daily Pipeline Review' },
  { id: 'tRK9m36SlySmiyV4', name: 'TDF - Property Status Update' },
  { id: 'uZRa62UcSjIpppAW', name: 'TDF - Single Property Scraper (Webhook)' },
  { id: 'wgpRU5QeHNN46A98', name: '[JJ] Manage Tags' },
  { id: 'zsjSo1F87zV1KBu1', name: 'Instagram Fix and Flip Content Generator' },
];

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9\-]/g, '-').replace(/-+/g, '-');
}

function fetchWorkflow(id) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: N8N_HOST,
      path: `/api/v1/workflows/${id}`,
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log(`Backing up ${workflows.length} workflows to ${BACKUP_DIR}\n`);

  let success = 0;
  let failed = 0;
  const errors = [];

  for (const wf of workflows) {
    const fileName = `${wf.id}_${sanitizeName(wf.name)}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);

    try {
      process.stdout.write(`  Fetching: ${wf.name} (${wf.id})... `);
      const data = await fetchWorkflow(wf.id);
      fs.writeFileSync(filePath, data, 'utf8');
      const size = fs.statSync(filePath).size;
      console.log(`OK (${(size / 1024).toFixed(1)} KB)`);
      success++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      errors.push({ id: wf.id, name: wf.name, error: err.message });
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n========================================`);
  console.log(`BACKUP COMPLETE`);
  console.log(`  Success: ${success}/${workflows.length}`);
  console.log(`  Failed:  ${failed}/${workflows.length}`);
  if (errors.length > 0) {
    console.log(`\nFailed workflows:`);
    errors.forEach(e => console.log(`  - ${e.name} (${e.id}): ${e.error}`));
  }
  console.log(`========================================`);
}

main().catch(console.error);
