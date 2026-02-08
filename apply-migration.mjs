// Quick script to apply migration via Supabase
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://oiiwlzobizftprqspbzt.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA0NzgzNSwiZXhwIjoyMDcwNjIzODM1fQ.zpH8VqfW5FC9swJhokpOpc5qw44EnW7m04NNKG9QXU4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('Applying auction_status migration...\n');

  // Read the migration file
  const sql = readFileSync('./sql/migrations/add_auction_status.sql', 'utf8');

  // Execute via RPC (if available) or fall back to individual statements
  // Note: Supabase JS client doesn't directly support raw SQL execution
  // We'll use the REST API directly

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ sql_query: sql }),
    });

    if (!response.ok) {
      console.log('Direct SQL execution not available, trying alternative...\n');
      // The REST API doesn't support raw SQL by default
      // We need to use the Supabase Management API or Dashboard
      console.log('Please apply the migration manually via Supabase Dashboard SQL Editor:');
      console.log('1. Go to: https://supabase.com/dashboard/project/oiiwlzobizftprqspbzt/sql');
      console.log('2. Paste the contents of: sql/migrations/add_auction_status.sql');
      console.log('3. Click "Run"');
      return;
    }

    const data = await response.json();
    console.log('Migration applied successfully!');
    console.log(data);
  } catch (error) {
    console.error('Error applying migration:', error.message);
    console.log('\nPlease apply the migration manually via Supabase Dashboard SQL Editor:');
    console.log('1. Go to: https://supabase.com/dashboard/project/oiiwlzobizftprqspbzt/sql');
    console.log('2. Paste the contents of: sql/migrations/add_auction_status.sql');
    console.log('3. Click "Run"');
  }
}

// Alternative: Check if we can verify the column exists
async function verifyMigration() {
  console.log('\nVerifying migration status...');

  const { data, error } = await supabase
    .from('properties')
    .select('id, auction_status')
    .limit(1);

  if (error) {
    if (error.message.includes('auction_status')) {
      console.log('❌ Column does not exist yet - migration needed');
    } else {
      console.log('Error checking:', error.message);
    }
  } else {
    console.log('✅ auction_status column exists!');
    console.log('Sample data:', data);

    // Try to get summary
    const { data: summary, error: sumError } = await supabase
      .rpc('get_auction_status_summary');

    if (!sumError && summary) {
      console.log('\nStatus Summary:');
      console.table(summary);
    }
  }
}

// Run verification first
verifyMigration();
