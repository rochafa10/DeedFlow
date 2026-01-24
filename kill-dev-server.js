#!/usr/bin/env node
/**
 * Kill all Next.js dev servers
 */
const { execSync } = require('child_process');
const os = require('os');

try {
  if (os.platform() === 'win32') {
    // Windows: Find and kill node.exe processes running Next.js
    console.log('Finding Next.js dev servers on Windows...');
    try {
      const tasks = execSync('tasklist', { encoding: 'utf-8' });
      const lines = tasks.split('\n');
      const nodeProcesses = lines.filter(line => line.includes('node.exe'));

      if (nodeProcesses.length > 0) {
        console.log(`Found ${nodeProcesses.length} node.exe processes`);
        // Kill all node.exe processes (nuclear option but necessary)
        execSync('taskkill /F /IM node.exe', { stdio: 'inherit' });
        console.log('✓ Killed all node.exe processes');
      } else {
        console.log('No node.exe processes found');
      }
    } catch (err) {
      console.log('No processes to kill or error:', err.message);
    }
  } else {
    // Unix-like: Use pkill or killall
    console.log('Finding Next.js dev servers on Unix...');
    try {
      execSync('pkill -f "next dev"', { stdio: 'inherit' });
      console.log('✓ Killed Next.js dev servers');
    } catch (err) {
      console.log('No processes to kill or error:', err.message);
    }
  }

  console.log('\n✓ Dev server cleanup complete');
  process.exit(0);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
