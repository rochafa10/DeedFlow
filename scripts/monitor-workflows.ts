#!/usr/bin/env tsx
/**
 * Real-time Monitoring Dashboard for Super-Smart Workflows
 * Track performance, costs, and accuracy metrics
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

dotenv.config({ path: '.env.local' });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function clearScreen() {
  console.clear();
  console.log('\x1Bc');
}

// Configuration
const N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

// Workflow IDs
const WORKFLOWS = {
  'Super-Smart': 'ZXqJ5vY39X9FtUhP',
  'AI Agent': 'ne9LQGojTtvGMlSH',
  'Python-Enhanced': 'pZ1OebVcf4MKwVar'
};

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface WorkflowMetrics {
  name: string;
  id: string;
  active: boolean;
  lastExecution?: Date;
  successRate: number;
  avgExecutionTime: number;
  totalExecutions: number;
  errorCount: number;
  schedule?: string;
}

interface DatabaseMetrics {
  totalAuctions: number;
  todayAuctions: number;
  avgConfidence: number;
  topCounties: { county: string; count: number }[];
  recentErrors: { message: string; time: Date }[];
  learningPatterns: number;
}

interface CostMetrics {
  hourly: number;
  daily: number;
  monthly: number;
  perWorkflow: { [key: string]: number };
}

async function getWorkflowMetrics(): Promise<WorkflowMetrics[]> {
  const metrics: WorkflowMetrics[] = [];
  
  for (const [name, id] of Object.entries(WORKFLOWS)) {
    try {
      // Get workflow info
      const workflowResponse = await fetch(`${N8N_API_URL}/api/v1/workflows/${id}`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      
      if (!workflowResponse.ok) continue;
      const workflow = await workflowResponse.json();
      
      // Get execution history
      const execResponse = await fetch(
        `${N8N_API_URL}/api/v1/executions?workflowId=${id}&limit=100`,
        { headers: { 'X-N8N-API-KEY': N8N_API_KEY } }
      );
      
      let executions = { data: [] };
      if (execResponse.ok) {
        executions = await execResponse.json();
      }
      
      const successful = executions.data.filter((e: any) => e.finished && !e.data?.resultData?.error).length;
      const failed = executions.data.filter((e: any) => e.data?.resultData?.error).length;
      const avgTime = executions.data.reduce((sum: number, e: any) => {
        if (e.startedAt && e.stoppedAt) {
          return sum + (new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime());
        }
        return sum;
      }, 0) / (executions.data.length || 1);
      
      const lastExec = executions.data[0];
      
      // Determine schedule
      let schedule = 'Manual';
      if (name === 'Super-Smart') schedule = 'Every 2 hours';
      else if (name === 'AI Agent') schedule = 'Every 4 hours';
      else if (name === 'Python-Enhanced') schedule = 'Every 3 hours';
      
      metrics.push({
        name,
        id,
        active: workflow.active || false,
        lastExecution: lastExec ? new Date(lastExec.startedAt) : undefined,
        successRate: (successful / (successful + failed || 1)) * 100,
        avgExecutionTime: avgTime / 1000, // Convert to seconds
        totalExecutions: executions.data.length,
        errorCount: failed,
        schedule
      });
    } catch (error) {
      metrics.push({
        name,
        id,
        active: false,
        successRate: 0,
        avgExecutionTime: 0,
        totalExecutions: 0,
        errorCount: 0
      });
    }
  }
  
  return metrics;
}

async function getDatabaseMetrics(): Promise<DatabaseMetrics> {
  try {
    // Total auctions
    const { count: totalAuctions } = await supabase
      .from('auctions')
      .select('*', { count: 'exact', head: true });
    
    // Today's auctions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayAuctions } = await supabase
      .from('auctions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());
    
    // Average confidence
    const { data: confidenceData } = await supabase
      .from('extraction_logs')
      .select('confidence_score')
      .order('created_at', { ascending: false })
      .limit(100);
    
    const avgConfidence = confidenceData?.length 
      ? confidenceData.reduce((sum, d) => sum + (d.confidence_score || 0), 0) / confidenceData.length
      : 0;
    
    // Top counties
    const { data: countyData } = await supabase
      .from('auctions')
      .select('county')
      .not('county', 'is', null);
    
    const countyCounts: { [key: string]: number } = {};
    countyData?.forEach((d: any) => {
      countyCounts[d.county] = (countyCounts[d.county] || 0) + 1;
    });
    
    const topCounties = Object.entries(countyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([county, count]) => ({ county, count }));
    
    // Recent errors
    const { data: errorData } = await supabase
      .from('error_logs')
      .select('error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    const recentErrors = errorData?.map(e => ({
      message: e.error_message.substring(0, 50),
      time: new Date(e.created_at)
    })) || [];
    
    // Learning patterns count
    const { count: learningPatterns } = await supabase
      .from('learning_patterns')
      .select('*', { count: 'exact', head: true });
    
    return {
      totalAuctions: totalAuctions || 0,
      todayAuctions: todayAuctions || 0,
      avgConfidence,
      topCounties,
      recentErrors,
      learningPatterns: learningPatterns || 0
    };
  } catch (error) {
    return {
      totalAuctions: 0,
      todayAuctions: 0,
      avgConfidence: 0,
      topCounties: [],
      recentErrors: [],
      learningPatterns: 0
    };
  }
}

function calculateCosts(workflows: WorkflowMetrics[]): CostMetrics {
  // Cost estimates per execution
  const costPerExecution = {
    'Super-Smart': 0.12,
    'AI Agent': 0.09,
    'Python-Enhanced': 0.10
  };
  
  // Calculate executions per period
  const executionsPerDay = {
    'Super-Smart': 12, // Every 2 hours
    'AI Agent': 6,     // Every 4 hours
    'Python-Enhanced': 8  // Every 3 hours
  };
  
  let dailyCost = 0;
  const perWorkflow: { [key: string]: number } = {};
  
  for (const workflow of workflows) {
    const dailyExecs = executionsPerDay[workflow.name as keyof typeof executionsPerDay] || 0;
    const cost = dailyExecs * (costPerExecution[workflow.name as keyof typeof costPerExecution] || 0);
    perWorkflow[workflow.name] = cost;
    dailyCost += cost;
  }
  
  return {
    hourly: dailyCost / 24,
    daily: dailyCost,
    monthly: dailyCost * 30,
    perWorkflow
  };
}

function renderDashboard(
  workflows: WorkflowMetrics[],
  database: DatabaseMetrics,
  costs: CostMetrics
) {
  clearScreen();
  
  // Header
  log('╔══════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║           🚀 SUPER-SMART WORKFLOW MONITORING DASHBOARD 🚀            ║', 'bright');
  log('╚══════════════════════════════════════════════════════════════════════╝', 'cyan');
  
  const now = new Date();
  log(`  Updated: ${now.toLocaleString()}`, 'dim');
  log('', 'reset');
  
  // Workflow Status Section
  log('📊 WORKFLOW STATUS', 'bright');
  log('─'.repeat(72), 'dim');
  
  for (const workflow of workflows) {
    const statusIcon = workflow.active ? '🟢' : '🔴';
    const statusText = workflow.active ? 'ACTIVE' : 'INACTIVE';
    const statusColor = workflow.active ? 'green' : 'red';
    
    log(`${statusIcon} ${workflow.name.padEnd(20)} ${statusText}`, statusColor);
    
    if (workflow.lastExecution) {
      const timeSince = Math.floor((now.getTime() - workflow.lastExecution.getTime()) / 60000);
      log(`   Last run: ${timeSince} min ago | Schedule: ${workflow.schedule}`, 'dim');
    }
    
    const successColor = workflow.successRate >= 90 ? 'green' : 
                        workflow.successRate >= 70 ? 'yellow' : 'red';
    
    log(`   Success: ${workflow.successRate.toFixed(1)}% | Executions: ${workflow.totalExecutions} | Avg time: ${workflow.avgExecutionTime.toFixed(1)}s`, successColor);
    
    if (workflow.errorCount > 0) {
      log(`   ⚠️  Errors: ${workflow.errorCount}`, 'yellow');
    }
    log('', 'reset');
  }
  
  // Database Metrics Section
  log('💾 DATABASE METRICS', 'bright');
  log('─'.repeat(72), 'dim');
  
  log(`Total Auctions: ${database.totalAuctions.toLocaleString()} | Today: ${database.todayAuctions}`, 'cyan');
  
  const confidenceColor = database.avgConfidence >= 0.8 ? 'green' :
                         database.avgConfidence >= 0.6 ? 'yellow' : 'red';
  log(`Average Confidence: ${(database.avgConfidence * 100).toFixed(1)}%`, confidenceColor);
  
  log(`Learning Patterns: ${database.learningPatterns}`, 'magenta');
  
  if (database.topCounties.length > 0) {
    log('\nTop Counties:', 'cyan');
    database.topCounties.forEach(county => {
      const bar = '█'.repeat(Math.floor(county.count / 10));
      log(`  ${county.county.padEnd(20)} ${bar} ${county.count}`, 'blue');
    });
  }
  
  if (database.recentErrors.length > 0) {
    log('\n⚠️  Recent Errors:', 'yellow');
    database.recentErrors.forEach(error => {
      const timeAgo = Math.floor((now.getTime() - error.time.getTime()) / 60000);
      log(`  ${timeAgo}m ago: ${error.message}...`, 'dim');
    });
  }
  
  log('', 'reset');
  
  // Cost Analysis Section
  log('💰 COST ANALYSIS', 'bright');
  log('─'.repeat(72), 'dim');
  
  log(`Hourly: $${costs.hourly.toFixed(3)} | Daily: $${costs.daily.toFixed(2)} | Monthly: $${costs.monthly.toFixed(2)}`, 'green');
  
  log('\nPer Workflow:', 'cyan');
  Object.entries(costs.perWorkflow).forEach(([name, cost]) => {
    log(`  ${name.padEnd(20)} $${cost.toFixed(2)}/day`, 'blue');
  });
  
  // Performance Indicators
  log('\n', 'reset');
  log('🎯 PERFORMANCE INDICATORS', 'bright');
  log('─'.repeat(72), 'dim');
  
  const overallSuccess = workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length;
  const activeCount = workflows.filter(w => w.active).length;
  
  const healthScore = (overallSuccess * 0.4) + 
                      (database.avgConfidence * 100 * 0.3) + 
                      ((activeCount / workflows.length) * 100 * 0.3);
  
  const healthColor = healthScore >= 80 ? 'green' : 
                      healthScore >= 60 ? 'yellow' : 'red';
  const healthEmoji = healthScore >= 80 ? '🟢' : 
                      healthScore >= 60 ? '🟡' : '🔴';
  
  log(`System Health: ${healthEmoji} ${healthScore.toFixed(1)}%`, healthColor);
  
  // Quick Actions
  log('\n', 'reset');
  log('⚡ QUICK ACTIONS', 'bright');
  log('─'.repeat(72), 'dim');
  log('[R] Refresh | [T] Test Workflows | [L] View Logs | [Q] Quit', 'yellow');
  log('', 'reset');
}

async function watchLogs() {
  log('\n📜 LIVE EXECUTION LOGS', 'bright');
  log('─'.repeat(72), 'dim');
  log('Watching for new executions... (Press Q to return)', 'yellow');
  
  // Set up real-time subscription
  const subscription = supabase
    .channel('execution-logs')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'extraction_logs' },
      (payload) => {
        const time = new Date().toLocaleTimeString();
        log(`[${time}] New extraction: County=${payload.new.county}, Confidence=${payload.new.confidence_score}`, 'green');
      }
    )
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'error_logs' },
      (payload) => {
        const time = new Date().toLocaleTimeString();
        log(`[${time}] ERROR: ${payload.new.error_message}`, 'red');
      }
    )
    .subscribe();
  
  // Wait for user input
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.on('line', (input) => {
      if (input.toLowerCase() === 'q') {
        subscription.unsubscribe();
        rl.close();
        resolve(true);
      }
    });
  });
}

async function testWorkflows() {
  log('\n🧪 TESTING WORKFLOWS', 'bright');
  log('─'.repeat(72), 'dim');
  
  for (const [name, id] of Object.entries(WORKFLOWS)) {
    log(`Testing ${name}...`, 'yellow');
    
    try {
      const response = await fetch(`${N8N_API_URL}/api/v1/workflows/${id}/execute`, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        log(`  ✅ ${name} triggered successfully`, 'green');
      } else {
        log(`  ❌ ${name} failed: ${response.statusText}`, 'red');
      }
    } catch (error: any) {
      log(`  ❌ ${name} error: ${error.message}`, 'red');
    }
  }
  
  log('\nPress any key to continue...', 'dim');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
}

async function main() {
  // Set up keyboard input
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  
  let running = true;
  let autoRefresh = true;
  
  // Main loop
  while (running) {
    try {
      const workflows = await getWorkflowMetrics();
      const database = await getDatabaseMetrics();
      const costs = calculateCosts(workflows);
      
      renderDashboard(workflows, database, costs);
      
      // Handle keyboard input with timeout for auto-refresh
      const inputPromise = new Promise<string>((resolve) => {
        const handler = (str: string, key: any) => {
          process.stdin.removeListener('keypress', handler);
          resolve(key?.name || str);
        };
        process.stdin.on('keypress', handler);
      });
      
      const timeoutPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('timeout'), autoRefresh ? 30000 : 3600000);
      });
      
      const input = await Promise.race([inputPromise, timeoutPromise]);
      
      switch(input?.toLowerCase()) {
        case 'q':
          running = false;
          break;
        case 'r':
          continue;
        case 't':
          await testWorkflows();
          break;
        case 'l':
          await watchLogs();
          break;
        case 'timeout':
          continue;
      }
    } catch (error: any) {
      log(`Error: ${error.message}`, 'red');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Cleanup
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  log('\n👋 Monitoring stopped', 'yellow');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  log('\n👋 Monitoring stopped', 'yellow');
  process.exit(0);
});

main().catch((error) => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});