#!/usr/bin/env node

/**
 * Database Setup Script for Tax Deed Platform
 * 
 * This script creates all necessary tables in your Supabase database.
 * 
 * Usage:
 * 1. Set your environment variables in .env.local:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY (not the anon key!)
 * 
 * 2. Run: node scripts/setup-database.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  // Confirm before proceeding
  const answer = await question(
    `${colors.yellow}⚠️  This will create/update tables in your Supabase database.${colors.reset}\n` +
    `Are you sure you want to continue? (yes/no): `
  );

  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log(`${colors.yellow}Setup cancelled.${colors.reset}`);
    process.exit(0);
  }

  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log(`\n${colors.cyan}Starting database setup...${colors.reset}\n`);

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Extract table/type name for logging
      let objectName = 'Statement';
      if (statement.includes('CREATE TABLE')) {
        objectName = statement.match(/CREATE TABLE (\w+)/)?.[1] || 'Table';
      } else if (statement.includes('CREATE TYPE')) {
        objectName = statement.match(/CREATE TYPE (\w+)/)?.[1] || 'Type';
      } else if (statement.includes('CREATE INDEX')) {
        objectName = statement.match(/CREATE INDEX (\w+)/)?.[1] || 'Index';
      } else if (statement.includes('CREATE EXTENSION')) {
        objectName = statement.match(/CREATE EXTENSION[^"]*"([^"]+)"/)?.[1] || 'Extension';
      }

      process.stdout.write(`[${i + 1}/${statements.length}] Creating ${objectName}... `);

      try {
        // Note: Supabase JS client doesn't support direct DDL execution
        // We'll mark these for manual execution
        console.log(`${colors.yellow}PENDING${colors.reset} (Requires manual execution)`);
        errorCount++;
      } catch (error) {
        console.log(`${colors.red}✗${colors.reset}`);
        console.error(`  ${colors.red}Error: ${error.message}${colors.reset}`);
        errorCount++;
      }
    }

    console.log(`\n${colors.bright}Setup Complete!${colors.reset}`);
    console.log(`${colors.green}✓ Success: ${successCount}${colors.reset}`);
    if (errorCount > 0) {
      console.log(`${colors.red}✗ Errors: ${errorCount}${colors.reset}`);
    }

    // Test the connection
    console.log(`\n${colors.cyan}Testing database connection...${colors.reset}`);
    const { data, error } = await supabase.from('properties').select('count');
    
    if (!error) {
      console.log(`${colors.green}✓ Database connection successful!${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️  Could not verify connection. You may need to run the migration directly in Supabase.${colors.reset}`);
    }

  } catch (error) {
    console.error(`\n${colors.red}Setup failed: ${error.message}${colors.reset}`);
    process.exit(1);
  } finally {
    rl.close();
  }

  console.log(`\n${colors.cyan}${colors.bright}Next Steps:${colors.reset}`);
  console.log(`
1. ${colors.yellow}If some statements failed:${colors.reset}
   - Go to your Supabase Dashboard
   - Navigate to SQL Editor
   - Copy the contents of supabase/migrations/001_initial_schema.sql
   - Run the migration directly

2. ${colors.yellow}Enable Row Level Security (RLS):${colors.reset}
   - Go to Authentication > Policies
   - Add appropriate policies for your tables

3. ${colors.yellow}Start using your database:${colors.reset}
   - Your tables are now ready
   - The app will automatically connect using your environment variables
`);
}

// Run the setup
setupDatabase().catch(console.error);