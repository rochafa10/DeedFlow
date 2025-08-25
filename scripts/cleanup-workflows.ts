#!/usr/bin/env tsx
/**
 * Clean up deprecated workflow files
 * Moves old workflows to archive folder
 */

import * as fs from 'fs';
import * as path from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const WORKFLOW_DIR = path.join(process.cwd(), 'n8n', 'workflows');
const ARCHIVE_DIR = path.join(process.cwd(), 'n8n', 'workflows-archive');

// Files to keep (v2 and active workflows)
const KEEP_FILES = [
  'super-smart-calendar-scraper-v2.json',
  'ai-calendar-scraper-agent-v2.json',
  'python-enhanced-calendar-scraper-v2.json',
  'ai-enhanced-property-analyzer.json',
  'ai-agent-property-researcher.json',
  'ai-document-processor.json',
  'inspection-report-workflow.json',
  'property-enrichment-supabase.json',
  'README.md'
];

// Files to archive (deprecated)
const ARCHIVE_FILES = [
  'super-smart-calendar-scraper.json',
  'ai-calendar-scraper-agent.json',
  'ai-calendar-scraper-python-enhanced.json',
  'auction-scraper-workflow.json',
  'miami-dade-scraper-detailed.json',
  'property-enrichment-workflow.json',
  'tax-deed-platform-workflows.json'
];

async function cleanupWorkflows() {
  log('\n🧹 Workflow Cleanup Tool', 'bright');
  log('=' .repeat(50), 'bright');
  
  // Create archive directory if it doesn't exist
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    log(`\n📁 Created archive directory: ${ARCHIVE_DIR}`, 'green');
  }
  
  // List all files in workflow directory
  const files = fs.readdirSync(WORKFLOW_DIR);
  log(`\n📋 Found ${files.length} files in workflow directory`, 'cyan');
  
  // Archive deprecated files
  log('\n🗄️  Archiving deprecated workflows...', 'yellow');
  let archivedCount = 0;
  
  for (const file of ARCHIVE_FILES) {
    const sourcePath = path.join(WORKFLOW_DIR, file);
    const destPath = path.join(ARCHIVE_DIR, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destPath);
      log(`   ✅ Archived: ${file}`, 'green');
      archivedCount++;
    }
  }
  
  // List remaining active files
  log('\n✨ Active workflows:', 'cyan');
  const remainingFiles = fs.readdirSync(WORKFLOW_DIR);
  for (const file of remainingFiles) {
    if (KEEP_FILES.includes(file)) {
      log(`   ✅ ${file}`, 'green');
    } else if (!file.startsWith('.')) {
      log(`   ⚠️  ${file} (unknown - review manually)`, 'yellow');
    }
  }
  
  // Summary
  log('\n' + '=' .repeat(50), 'bright');
  log('📊 Cleanup Summary', 'bright');
  log('=' .repeat(50), 'bright');
  log(`✅ Archived: ${archivedCount} deprecated workflows`, 'green');
  log(`📁 Archive location: ${ARCHIVE_DIR}`, 'blue');
  log(`✨ Active workflows: ${KEEP_FILES.length - 1} files`, 'cyan');
  
  log('\n💡 Next steps:', 'yellow');
  log('   1. Review archived files in workflows-archive/', 'yellow');
  log('   2. Delete archive folder when confident', 'yellow');
  log('   3. Use npm run n8n:deploy for future deployments', 'yellow');
}

cleanupWorkflows().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});