// Complete n8n workflow backup script
// Fetches all 29 workflows from n8n API and saves them as JSON files
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const N8N_HOST = 'n8n.lfb-investments.com';

// All 29 workflow IDs and names
const ALL_WORKFLOWS = [
  { id: '16tHqWBFpARbSmuK', name: '[JJ] Store a Contact' },
  { id: '48zvrtwvoxqrh8v8', name: 'TDF - Tax Auction Research Agent' },
  { id: '4L0GulXueUIHWsM3', name: 'TDF - Batch County Research Agent' },
  { id: '4WZxCU8XkFXgMkDx', name: 'TDF - Deploy pwrunner-server.mjs' },
  { id: '5xZIPh2TIGYKdnZI', name: 'TDF - Data Integrity Check' },
  { id: '6ZwtJnkJ6ESIXFKH', name: 'My workflow' },
  { id: '8slK6HRvwtzjM9xj', name: 'County Tax Auction Link Finder' },
  { id: 'AkRGWIhQOBSf3DmD', name: 'Gmail Manager' },
  { id: 'CObfZojzrMmsTvVV', name: 'TDF - PDF Text Extractor' },
  { id: 'DGXfvxQpgn25n3OO', name: 'TDF - Regrid Scraper v15' },
  { id: 'DSqYc1jqBgJcOlWZ', name: '[JJ] send typing notification' },
  { id: 'DbW6OOuFa777zhwv', name: 'My workflow 4' },
  { id: 'I5LevopKSmC5UYNa', name: '[JJ] Search Memory Tool' },
  { id: 'JV1WZzfbD7pPaEo9', name: '[JJ] Query Image Tool' },
  { id: 'NC6LvdJ5EiozwYHi', name: '[JJ] Store Message' },
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

// Minimum file size to consider a backup valid (skip files that are just placeholders)
const MIN_VALID_SIZE = 500;

function sanitizeName(name) {
  return name.replace(/[\[\]]/g, '').replace(/[^a-zA-Z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function fetchWorkflow(id) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: N8N_HOST,
      path: `/api/v1/workflows/${id}`,
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': process.env.N8N_API_KEY,
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
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function main() {
  const onlyMissing = process.argv.includes('--missing');

  let workflowsToBackup = ALL_WORKFLOWS;

  if (onlyMissing) {
    // Only backup workflows that are missing or have placeholder files
    workflowsToBackup = ALL_WORKFLOWS.filter(wf => {
      const fileName = `${wf.id}_${sanitizeName(wf.name)}.json`;
      const filePath = path.join(__dirname, fileName);
      if (!fs.existsSync(filePath)) return true;
      const size = fs.statSync(filePath).size;
      return size < MIN_VALID_SIZE;
    });
    console.log(`Found ${workflowsToBackup.length} missing/placeholder backups out of ${ALL_WORKFLOWS.length} total\n`);
  } else {
    console.log(`Backing up all ${workflowsToBackup.length} workflows\n`);
  }

  if (workflowsToBackup.length === 0) {
    console.log('All workflows are already backed up!');
    return;
  }

  let success = 0;
  let failed = 0;
  const errors = [];

  for (const wf of workflowsToBackup) {
    const fileName = `${wf.id}_${sanitizeName(wf.name)}.json`;
    const filePath = path.join(__dirname, fileName);

    try {
      process.stdout.write(`  [${success + failed + 1}/${workflowsToBackup.length}] ${wf.name}... `);
      const data = await fetchWorkflow(wf.id);

      // Wrap in success format to match MCP output
      const wrapped = JSON.stringify({ success: true, data: JSON.parse(data) });
      fs.writeFileSync(filePath, wrapped, 'utf8');

      const size = fs.statSync(filePath).size;
      console.log(`OK (${(size / 1024).toFixed(1)} KB)`);
      success++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      errors.push({ id: wf.id, name: wf.name, error: err.message });
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`BACKUP COMPLETE`);
  console.log(`  Success: ${success}/${workflowsToBackup.length}`);
  console.log(`  Failed:  ${failed}/${workflowsToBackup.length}`);

  if (errors.length > 0) {
    console.log(`\nFailed workflows:`);
    errors.forEach(e => console.log(`  - ${e.name} (${e.id}): ${e.error}`));
  }

  // Final verification
  console.log(`\nVerification:`);
  let totalOk = 0;
  let totalBad = 0;
  for (const wf of ALL_WORKFLOWS) {
    const fileName = `${wf.id}_${sanitizeName(wf.name)}.json`;
    const filePath = path.join(__dirname, fileName);
    if (fs.existsSync(filePath) && fs.statSync(filePath).size >= MIN_VALID_SIZE) {
      totalOk++;
    } else {
      totalBad++;
      console.log(`  MISSING/BAD: ${fileName}`);
    }
  }
  console.log(`  ${totalOk}/${ALL_WORKFLOWS.length} workflows backed up successfully`);
  if (totalBad > 0) {
    console.log(`  ${totalBad} workflows need attention`);
  }
  console.log(`${'='.repeat(50)}`);
}

main().catch(console.error);
