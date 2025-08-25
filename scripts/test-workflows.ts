#!/usr/bin/env tsx
/**
 * Test Super-Smart Workflows
 * Verify functionality and data flow
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Configuration
const N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

// Workflow IDs from deployment
const WORKFLOWS = {
  'super-smart': 'ZXqJ5vY39X9FtUhP',
  'ai-agent': 'ne9LQGojTtvGMlSH',
  'python-enhanced': 'pZ1OebVcf4MKwVar'
};

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface TestResult {
  workflow: string;
  status: 'success' | 'failed' | 'warning';
  executionTime?: number;
  recordsCreated?: number;
  confidenceScore?: number;
  errors?: string[];
}

async function checkWorkflowStatus(workflowId: string): Promise<any> {
  try {
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows/${workflowId}`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    log(`   ❌ Failed to check workflow: ${error.message}`, 'red');
    return null;
  }
}

async function triggerWorkflow(workflowId: string, name: string): Promise<TestResult> {
  const result: TestResult = {
    workflow: name,
    status: 'failed',
    errors: []
  };
  
  try {
    log(`\n🔄 Testing: ${name}`, 'cyan');
    log(`   Workflow ID: ${workflowId}`, 'yellow');
    
    // Check if workflow exists and is active
    const workflowInfo = await checkWorkflowStatus(workflowId);
    if (!workflowInfo) {
      result.errors?.push('Workflow not found');
      return result;
    }
    
    if (!workflowInfo.active) {
      log(`   ⚠️  Workflow is not active. Please activate it first.`, 'yellow');
      result.status = 'warning';
      result.errors?.push('Workflow not active');
      return result;
    }
    
    // Get initial auction count
    const { count: initialCount } = await supabase
      .from('auctions')
      .select('*', { count: 'exact', head: true });
    
    // Trigger workflow execution
    log(`   🚀 Triggering execution...`, 'blue');
    const startTime = Date.now();
    
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Execution failed: ${errorText}`);
    }
    
    const execution = await response.json();
    result.executionTime = Date.now() - startTime;
    
    log(`   ⏱️  Execution time: ${(result.executionTime / 1000).toFixed(2)}s`, 'green');
    
    // Wait for data to propagate
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check results in Supabase
    const { count: finalCount } = await supabase
      .from('auctions')
      .select('*', { count: 'exact', head: true });
    
    result.recordsCreated = (finalCount || 0) - (initialCount || 0);
    
    // Get latest extraction logs for confidence
    const { data: logs } = await supabase
      .from('extraction_logs')
      .select('confidence_score')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (logs && logs.length > 0) {
      const avgConfidence = logs.reduce((sum, log) => sum + (log.confidence_score || 0), 0) / logs.length;
      result.confidenceScore = avgConfidence;
    }
    
    result.status = 'success';
    log(`   ✅ Success! Created ${result.recordsCreated} records`, 'green');
    
    if (result.confidenceScore) {
      log(`   📊 Avg confidence: ${(result.confidenceScore * 100).toFixed(1)}%`, 'cyan');
    }
    
  } catch (error: any) {
    result.errors?.push(error.message);
    log(`   ❌ Error: ${error.message}`, 'red');
  }
  
  return result;
}

async function testSupabaseConnection(): Promise<boolean> {
  try {
    log('\n🔌 Testing Supabase connection...', 'cyan');
    
    const { error } = await supabase
      .from('auctions')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      log(`   ❌ Supabase connection failed: ${error.message}`, 'red');
      return false;
    }
    
    log('   ✅ Supabase connected successfully', 'green');
    
    // Check tables exist
    const tables = ['auctions', 'properties', 'extraction_logs', 'learning_patterns', 'error_logs'];
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        log(`   ⚠️  Table '${table}' not accessible: ${error.message}`, 'yellow');
      } else {
        log(`   ✅ Table '${table}' exists`, 'green');
      }
    }
    
    return true;
  } catch (error: any) {
    log(`   ❌ Connection test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testN8nConnection(): Promise<boolean> {
  try {
    log('\n🔌 Testing n8n API connection...', 'cyan');
    
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });
    
    if (!response.ok) {
      log(`   ❌ n8n API connection failed: HTTP ${response.status}`, 'red');
      return false;
    }
    
    const data = await response.json();
    log(`   ✅ n8n API connected (${data.data?.length || 0} workflows found)`, 'green');
    
    return true;
  } catch (error: any) {
    log(`   ❌ n8n connection failed: ${error.message}`, 'red');
    log('   💡 Make sure n8n is running at http://localhost:5678', 'yellow');
    return false;
  }
}

async function generateReport(results: TestResult[]) {
  log('\n' + '='.repeat(60), 'bright');
  log('📊 Test Report', 'bright');
  log('='.repeat(60), 'bright');
  
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  
  log(`\n✅ Successful: ${successful}`, 'green');
  log(`❌ Failed: ${failed}`, 'red');
  log(`⚠️  Warnings: ${warnings}`, 'yellow');
  
  log('\n📈 Performance Metrics:', 'cyan');
  
  for (const result of results) {
    log(`\n${result.workflow}:`, 'bright');
    
    if (result.status === 'success') {
      log(`   Status: ✅ Success`, 'green');
      if (result.executionTime) {
        log(`   Execution Time: ${(result.executionTime / 1000).toFixed(2)}s`, 'blue');
      }
      if (result.recordsCreated !== undefined) {
        log(`   Records Created: ${result.recordsCreated}`, 'blue');
      }
      if (result.confidenceScore) {
        const score = result.confidenceScore * 100;
        const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
        log(`   Confidence Score: ${score.toFixed(1)}%`, color);
      }
    } else if (result.status === 'warning') {
      log(`   Status: ⚠️  Warning`, 'yellow');
      result.errors?.forEach(err => log(`   - ${err}`, 'yellow'));
    } else {
      log(`   Status: ❌ Failed`, 'red');
      result.errors?.forEach(err => log(`   - ${err}`, 'red'));
    }
  }
  
  // Recommendations
  log('\n💡 Recommendations:', 'magenta');
  
  if (failed > 0) {
    log('   1. Check that all workflows are activated in n8n UI', 'yellow');
    log('   2. Verify credentials are configured correctly', 'yellow');
    log('   3. Ensure Python packages are installed', 'yellow');
  }
  
  if (warnings > 0) {
    log('   1. Activate workflows in n8n UI (toggle switch)', 'yellow');
    log('   2. Configure required credentials', 'yellow');
  }
  
  const avgConfidence = results
    .filter(r => r.confidenceScore)
    .reduce((sum, r) => sum + (r.confidenceScore || 0), 0) / results.length;
  
  if (avgConfidence > 0 && avgConfidence < 0.8) {
    log('   • Low confidence scores detected. Let workflows learn for 24-48 hours', 'yellow');
  }
  
  if (successful === results.length) {
    log('   🎉 All workflows are functioning perfectly!', 'green');
  }
}

async function runInteractiveTest() {
  log('\n🧪 Interactive Workflow Test', 'bright');
  log('Select workflow to test:', 'cyan');
  log('  1. Python-Enhanced (simplest)', 'yellow');
  log('  2. AI Agent (medium complexity)', 'yellow');
  log('  3. Super-Smart (most complex)', 'yellow');
  log('  4. Test all workflows', 'yellow');
  log('  5. Just check connections', 'yellow');
  
  // For non-interactive mode, test all
  return 4;
}

async function main() {
  log('\n🚀 Super-Smart Workflow Testing Suite', 'bright');
  log('=====================================\n', 'bright');
  
  // Check connections first
  const n8nOk = await testN8nConnection();
  const supabaseOk = await testSupabaseConnection();
  
  if (!n8nOk || !supabaseOk) {
    log('\n❌ Connection issues detected. Please fix before testing workflows.', 'red');
    
    if (!n8nOk) {
      log('\n📌 n8n Setup:', 'yellow');
      log('   1. Make sure n8n is running: npm run start:n8n', 'cyan');
      log('   2. Check API key in .env.local', 'cyan');
    }
    
    if (!supabaseOk) {
      log('\n📌 Supabase Setup:', 'yellow');
      log('   1. Check SUPABASE_URL in .env.local', 'cyan');
      log('   2. Check SUPABASE_SERVICE_KEY in .env.local', 'cyan');
      log('   3. Ensure tables are created', 'cyan');
    }
    
    process.exit(1);
  }
  
  const choice = await runInteractiveTest();
  const results: TestResult[] = [];
  
  // Run tests based on choice (defaulting to all)
  if (choice === 4) {
    log('\n🔄 Testing all workflows...', 'bright');
    
    // Test in order of complexity
    results.push(await triggerWorkflow(WORKFLOWS['python-enhanced'], 'Python-Enhanced'));
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    results.push(await triggerWorkflow(WORKFLOWS['ai-agent'], 'AI Agent'));
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    results.push(await triggerWorkflow(WORKFLOWS['super-smart'], 'Super-Smart'));
  }
  
  // Generate report
  if (results.length > 0) {
    await generateReport(results);
  }
  
  // Final checks
  log('\n📝 Next Steps:', 'cyan');
  log('   1. Configure credentials in n8n UI if not done', 'yellow');
  log('   2. Activate workflows (toggle switch)', 'yellow');
  log('   3. Monitor Supabase tables for incoming data', 'yellow');
  log('   4. Check n8n execution logs for details', 'yellow');
  
  log('\n✨ Testing complete!', 'green');
}

main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});