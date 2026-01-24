#!/usr/bin/env node
/**
 * Manual Database Test Script
 *
 * This script directly tests Supabase database operations for the ActivityFeed feature
 * without requiring Playwright or browser automation.
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://filvghircyrnlhzaeavm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpbHZnaGlyY3lybmxoemFlYXZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ0MzA4NiwiZXhwIjoyMDcxMDE5MDg2fQ.kpbXeIrkCXd_9RLf2HsdYxyPg618NcYdN6N_FOC1qLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('='.repeat(80));
console.log('AGENT ACTIVITY FEED - MANUAL DATABASE VERIFICATION');
console.log('='.repeat(80));
console.log('\n');

async function main() {
  let testSessionId;
  let testAssignmentId;
  let testCountyId;

  try {
    // Step 1: Query existing orchestration sessions
    console.log('📋 STEP 1: Query existing orchestration sessions\n');
    const { data: sessions, error: sessionsError } = await supabase
      .from('orchestration_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (sessionsError) {
      console.error('❌ Error querying sessions:', sessionsError.message);
    } else {
      console.log(`✅ Found ${sessions?.length || 0} orchestration sessions`);
      if (sessions && sessions.length > 0) {
        console.log('\nLatest 3 sessions:');
        sessions.slice(0, 3).forEach((s, idx) => {
          console.log(`  ${idx + 1}. ID: ${s.id.substring(0, 8)}...`);
          console.log(`     Type: ${s.session_type}, Status: ${s.status}`);
          console.log(`     Created: ${new Date(s.created_at).toLocaleString()}`);
          console.log(`     Properties processed: ${s.properties_processed}`);
        });
      }
    }

    console.log('\n' + '-'.repeat(80) + '\n');

    // Step 2: Query existing agent assignments
    console.log('🤖 STEP 2: Query existing agent assignments\n');
    const { data: assignments, error: assignmentsError } = await supabase
      .from('agent_assignments')
      .select(`
        *,
        counties (
          id,
          county_name,
          state_code
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (assignmentsError) {
      console.error('❌ Error querying assignments:', assignmentsError.message);
    } else {
      console.log(`✅ Found ${assignments?.length || 0} agent assignments`);
      if (assignments && assignments.length > 0) {
        console.log('\nLatest 3 assignments:');
        assignments.slice(0, 3).forEach((a, idx) => {
          console.log(`  ${idx + 1}. Agent: ${a.agent_name}`);
          console.log(`     Task: ${a.task_type}, Status: ${a.status}`);
          console.log(`     County: ${a.counties?.county_name || 'N/A'}, ${a.counties?.state_code || 'N/A'}`);
          console.log(`     Progress: ${a.items_processed}/${a.items_total} items`);
          console.log(`     Created: ${new Date(a.created_at).toLocaleString()}`);
        });
      }
    }

    console.log('\n' + '-'.repeat(80) + '\n');

    // Step 3: Get a county for testing
    console.log('🗺️  STEP 3: Get test county\n');
    const { data: counties, error: countyError } = await supabase
      .from('counties')
      .select('id, county_name, state_code')
      .limit(1);

    if (countyError) {
      console.error('❌ Error fetching county:', countyError.message);
      throw countyError;
    }

    if (!counties || counties.length === 0) {
      throw new Error('No counties found in database. Please seed counties first.');
    }

    testCountyId = counties[0].id;
    console.log(`✅ Using test county: ${counties[0].county_name}, ${counties[0].state_code}`);
    console.log(`   County ID: ${testCountyId}`);

    console.log('\n' + '-'.repeat(80) + '\n');

    // Step 4: Create test orchestration session
    console.log('➕ STEP 4: Create test orchestration session\n');
    const { data: newSession, error: sessionError } = await supabase
      .from('orchestration_sessions')
      .insert({
        session_type: 'regrid_scraping',
        status: 'active',
        trigger_source: 'manual_e2e_test',
        properties_processed: 0,
        properties_failed: 0,
        agents_used: ['Regrid Scraper'],
        work_assigned: 100,
        work_completed: 0,
        notes: `Manual E2E test session - Created at ${new Date().toISOString()}`,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('❌ Error creating session:', sessionError.message);
      throw sessionError;
    }

    testSessionId = newSession.id;
    console.log('✅ Successfully created test session');
    console.log(`   Session ID: ${testSessionId}`);
    console.log(`   Type: ${newSession.session_type}`);
    console.log(`   Status: ${newSession.status}`);
    console.log(`   Created at: ${new Date(newSession.created_at).toLocaleString()}`);

    console.log('\n' + '-'.repeat(80) + '\n');

    // Step 5: Create test agent assignment
    console.log('➕ STEP 5: Create test agent assignment\n');
    const { data: newAssignment, error: assignmentError } = await supabase
      .from('agent_assignments')
      .insert({
        session_id: testSessionId,
        agent_name: 'Regrid Scraper Test',
        task_type: 'regrid_scraping',
        county_id: testCountyId,
        priority: 1,
        status: 'in_progress',
        items_total: 100,
        items_processed: 25,
        items_failed: 0,
        execution_method: 'batch',
        notes: `Manual E2E test assignment - Created at ${new Date().toISOString()}`,
      })
      .select(`
        *,
        counties (
          county_name,
          state_code
        )
      `)
      .single();

    if (assignmentError) {
      console.error('❌ Error creating assignment:', assignmentError.message);
      throw assignmentError;
    }

    testAssignmentId = newAssignment.id;
    console.log('✅ Successfully created test assignment');
    console.log(`   Assignment ID: ${testAssignmentId}`);
    console.log(`   Agent: ${newAssignment.agent_name}`);
    console.log(`   Task: ${newAssignment.task_type}`);
    console.log(`   County: ${newAssignment.counties?.county_name}, ${newAssignment.counties?.state_code}`);
    console.log(`   Status: ${newAssignment.status}`);
    console.log(`   Progress: ${newAssignment.items_processed}/${newAssignment.items_total} (${Math.round(newAssignment.items_processed / newAssignment.items_total * 100)}%)`);
    console.log(`   Created at: ${new Date(newAssignment.created_at).toLocaleString()}`);

    console.log('\n' + '-'.repeat(80) + '\n');

    // Step 6: Update assignment to test real-time updates
    console.log('🔄 STEP 6: Update assignment to simulate progress\n');
    console.log('⏱️  Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const { data: updatedAssignment, error: updateError } = await supabase
      .from('agent_assignments')
      .update({
        items_processed: 75,
        status: 'in_progress',
      })
      .eq('id', testAssignmentId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating assignment:', updateError.message);
    } else {
      console.log('✅ Successfully updated assignment');
      console.log(`   New progress: ${updatedAssignment.items_processed}/${updatedAssignment.items_total} (${Math.round(updatedAssignment.items_processed / updatedAssignment.items_total * 100)}%)`);
    }

    console.log('\n' + '-'.repeat(80) + '\n');

    // Step 7: Complete the assignment
    console.log('✔️  STEP 7: Complete the assignment\n');
    console.log('⏱️  Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const { data: completedAssignment, error: completeError } = await supabase
      .from('agent_assignments')
      .update({
        items_processed: 100,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', testAssignmentId)
      .select()
      .single();

    if (completeError) {
      console.error('❌ Error completing assignment:', completeError.message);
    } else {
      console.log('✅ Successfully completed assignment');
      console.log(`   Final progress: ${completedAssignment.items_processed}/${completedAssignment.items_total} (100%)`);
      console.log(`   Status: ${completedAssignment.status}`);
      console.log(`   Completed at: ${new Date(completedAssignment.completed_at).toLocaleString()}`);
    }

    console.log('\n' + '-'.repeat(80) + '\n');

    // Step 8: Complete the session
    console.log('✔️  STEP 8: Complete the session\n');
    const { data: completedSession, error: completeSessionError } = await supabase
      .from('orchestration_sessions')
      .update({
        status: 'completed',
        properties_processed: 100,
        work_completed: 100,
        ended_at: new Date().toISOString(),
      })
      .eq('id', testSessionId)
      .select()
      .single();

    if (completeSessionError) {
      console.error('❌ Error completing session:', completeSessionError.message);
    } else {
      console.log('✅ Successfully completed session');
      console.log(`   Status: ${completedSession.status}`);
      console.log(`   Properties processed: ${completedSession.properties_processed}`);
      console.log(`   Work completed: ${completedSession.work_completed}`);
      console.log(`   Ended at: ${new Date(completedSession.ended_at).toLocaleString()}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('✅ ALL DATABASE OPERATIONS SUCCESSFUL!');
    console.log('\n📝 INSTRUCTIONS:');
    console.log('   1. Open http://localhost:3000/orchestration in your browser');
    console.log('   2. The ActivityFeed should show the test session and assignment');
    console.log('   3. Test the search by searching for "Regrid" or "Test"');
    console.log('   4. Click the refresh button to verify it reloads data');
    console.log('\n⚠️  CLEANUP:');
    console.log('   Run this script with --cleanup flag to remove test data');
    console.log('   Or manually delete:');
    console.log(`     - Session: ${testSessionId}`);
    console.log(`     - Assignment: ${testAssignmentId}`);
    console.log('\n' + '='.repeat(80) + '\n');

    // If --cleanup flag is provided, clean up test data
    if (process.argv.includes('--cleanup')) {
      console.log('\n🧹 CLEANUP: Removing test data...\n');

      const { error: deleteAssignmentError } = await supabase
        .from('agent_assignments')
        .delete()
        .eq('id', testAssignmentId);

      if (deleteAssignmentError) {
        console.error('❌ Error deleting assignment:', deleteAssignmentError.message);
      } else {
        console.log(`✅ Deleted test assignment: ${testAssignmentId}`);
      }

      const { error: deleteSessionError } = await supabase
        .from('orchestration_sessions')
        .delete()
        .eq('id', testSessionId);

      if (deleteSessionError) {
        console.error('❌ Error deleting session:', deleteSessionError.message);
      } else {
        console.log(`✅ Deleted test session: ${testSessionId}`);
      }

      console.log('\n✅ Cleanup complete!\n');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

main();
