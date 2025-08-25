#!/usr/bin/env node

/**
 * Database Setup Script for Tax Deed Platform
 * Uses Supabase Management API to create tables
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupDatabase() {
  console.log(`${colors.cyan}${colors.bright}
╔═══════════════════════════════════════════════╗
║     Tax Deed Platform - Database Setup        ║
╚═══════════════════════════════════════════════╝
${colors.reset}`);

  // Check for required environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error(`${colors.red}❌ Missing required environment variables!${colors.reset}`);
    console.log(`
Please add the following to your .env.local file:
  ${colors.yellow}NEXT_PUBLIC_SUPABASE_URL${colors.reset}=your-supabase-url
  ${colors.yellow}NEXT_PUBLIC_SUPABASE_ANON_KEY${colors.reset}=your-anon-key
  ${colors.yellow}SUPABASE_SERVICE_ROLE_KEY${colors.reset}=your-service-role-key

You can find these in your Supabase project settings:
1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings > API
4. Copy the Project URL and service_role key (secret)
`);
    process.exit(1);
  }

  console.log(`${colors.green}✓${colors.reset} Environment variables loaded`);
  console.log(`${colors.blue}→${colors.reset} Supabase URL: ${SUPABASE_URL}`);
  console.log('');

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log(`${colors.cyan}${colors.bright}
Important: Supabase JavaScript client doesn't support DDL operations directly.
${colors.reset}`);

  console.log(`${colors.yellow}To complete the setup, please follow these steps:${colors.reset}\n`);
  
  console.log(`${colors.bright}Option 1: Use Supabase Dashboard (Recommended)${colors.reset}`);
  console.log(`1. Open your Supabase Dashboard: ${colors.cyan}${SUPABASE_URL.replace('https://', 'https://app.supabase.com/project/').replace('.supabase.co', '')}/sql/new${colors.reset}`);
  console.log(`2. The migration SQL has been copied to your clipboard (if supported)`);
  console.log(`3. Paste the SQL and click "Run"\n`);

  console.log(`${colors.bright}Option 2: Use Supabase CLI${colors.reset}`);
  console.log(`1. Install Supabase CLI: ${colors.cyan}npm install -g supabase${colors.reset}`);
  console.log(`2. Login: ${colors.cyan}supabase login${colors.reset}`);
  console.log(`3. Link project: ${colors.cyan}supabase link --project-ref ${SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]}${colors.reset}`);
  console.log(`4. Run migration: ${colors.cyan}supabase db push${colors.reset}\n`);

  // Try to copy to clipboard
  try {
    const { exec } = require('child_process');
    const platform = process.platform;
    
    let copyCommand;
    if (platform === 'darwin') {
      copyCommand = 'pbcopy';
    } else if (platform === 'win32') {
      copyCommand = 'clip';
    } else {
      copyCommand = 'xclip -selection clipboard';
    }

    const proc = exec(copyCommand, (error) => {
      if (!error) {
        console.log(`${colors.green}✓ Migration SQL copied to clipboard!${colors.reset}`);
      }
    });
    
    proc.stdin.write(migrationSQL);
    proc.stdin.end();
  } catch (e) {
    console.log(`${colors.yellow}Note: Could not copy to clipboard automatically${colors.reset}`);
  }

  // Save SQL to a file for easy access
  const outputPath = path.join(__dirname, '..', 'setup-tables.sql');
  fs.writeFileSync(outputPath, migrationSQL);
  console.log(`\n${colors.green}✓ Migration SQL saved to: ${outputPath}${colors.reset}`);

  // Show the direct link to Supabase SQL editor
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
  if (projectRef) {
    console.log(`\n${colors.cyan}${colors.bright}Direct link to your Supabase SQL Editor:${colors.reset}`);
    console.log(`${colors.cyan}https://app.supabase.com/project/${projectRef}/sql/new${colors.reset}`);
  }

  // Test connection with existing tables
  console.log(`\n${colors.cyan}Testing connection to Supabase...${colors.reset}`);
  
  try {
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (testResponse.ok) {
      console.log(`${colors.green}✓ Successfully connected to Supabase!${colors.reset}`);
      
      // Check if any tables exist
      const tablesResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Accept': 'application/json'
        }
      });

      if (tablesResponse.ok) {
        const data = await tablesResponse.text();
        if (data.includes('properties') || data.includes('auctions')) {
          console.log(`${colors.green}✓ Some tables may already exist${colors.reset}`);
        } else {
          console.log(`${colors.yellow}⚠ No tables found - please run the migration${colors.reset}`);
        }
      }
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠ Could not verify connection${colors.reset}`);
  }

  rl.close();

  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  console.log(`• Migration SQL has been saved to: ${colors.green}setup-tables.sql${colors.reset}`);
  console.log(`• Open the link above to access your Supabase SQL Editor`);
  console.log(`• Paste the SQL content and run it to create all tables`);
  console.log(`• Once complete, your app will be ready to use with the database!`);
}

// Run the setup
setupDatabase().catch(console.error);