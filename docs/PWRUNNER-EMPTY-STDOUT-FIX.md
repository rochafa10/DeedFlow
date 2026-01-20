# pwrunner Empty Stdout Fix

## Problem
The n8n workflow is failing with "Empty stdout from script" error. The `pwrunner` service completes in ~40ms instead of waiting for the async Playwright script to finish (which should take 30-60 seconds).

## Root Cause
The `pwrunner` service is using `child_process.exec()` which should wait for the process to exit, but there may be an issue with:
1. **Script execution**: The service might not be calling the correct script
2. **Timeout**: The service might have a very short timeout
3. **Process handling**: The service might not be properly waiting for async operations

## Diagnosis Steps

### 1. Check which script the service is calling
```bash
docker exec n8n-production-pwrunner-1 cat /app/index.js | grep -A 20 "run-regrid"
```

### 2. Verify the script exists and is correct
```bash
docker exec n8n-production-pwrunner-1 ls -la /app/scripts/regrid-screenshot*.js
docker exec n8n-production-pwrunner-1 head -20 /app/scripts/regrid-screenshot-v15.js
```

### 3. Test the script manually
```bash
docker exec n8n-production-pwrunner-1 node /app/scripts/regrid-screenshot-v15.js "01.05-16..-094.00-000" "Blair" "PA" "test-id"
```

### 4. Check service logs
```bash
docker logs n8n-production-pwrunner-1 --tail 100
```

## Solutions

### Solution 1: Verify Service Code
The `pwrunner` service should use this pattern:
```javascript
app.get('/run-regrid', async (req, res) => {
  const { parcel, county, state, property_id } = req.query;
  
  const { exec } = require('child_process');
  const scriptPath = '/app/scripts/regrid-screenshot-v15.js';
  
  exec(`node ${scriptPath} "${parcel}" "${county}" "${state}" "${property_id}"`, 
    {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large screenshots
      timeout: 180000 // 3 minutes timeout
    },
    (error, stdout, stderr) => {
      if (error) {
        console.error('Script execution error:', error);
        return res.json({ success: false, error: error.message, stderr });
      }
      
      if (!stdout || stdout.trim() === '') {
        console.error('Empty stdout. Stderr:', stderr);
        return res.json({ success: false, error: 'Empty stdout from script', stderr });
      }
      
      try {
        const result = JSON.parse(stdout);
        res.json(result);
      } catch (e) {
        console.error('Failed to parse stdout:', stdout);
        res.json({ success: false, error: 'Failed to parse script output', stdout, stderr });
      }
    }
  );
});
```

### Solution 2: Use spawn instead of exec
`spawn` provides better control over the process:
```javascript
const { spawn } = require('child_process');

app.get('/run-regrid', async (req, res) => {
  const { parcel, county, state, property_id } = req.query;
  
  const scriptPath = '/app/scripts/regrid-screenshot-v15.js';
  const child = spawn('node', [scriptPath, parcel, county, state, property_id], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let stdout = '';
  let stderr = '';
  
  child.stdout.on('data', (data) => {
    stdout += data.toString();
  });
  
  child.stderr.on('data', (data) => {
    stderr += data.toString();
  });
  
  child.on('close', (code) => {
    if (code !== 0) {
      return res.json({ success: false, error: `Script exited with code ${code}`, stderr });
    }
    
    if (!stdout || stdout.trim() === '') {
      return res.json({ success: false, error: 'Empty stdout from script', stderr });
    }
    
    try {
      const result = JSON.parse(stdout);
      res.json(result);
    } catch (e) {
      res.json({ success: false, error: 'Failed to parse script output', stdout, stderr });
    }
  });
  
  // Set timeout
  setTimeout(() => {
    child.kill();
    res.json({ success: false, error: 'Script execution timeout' });
  }, 180000); // 3 minutes
});
```

### Solution 3: Check Script Permissions
```bash
docker exec n8n-production-pwrunner-1 chmod +x /app/scripts/regrid-screenshot-v15.js
```

### Solution 4: Verify Node.js Version
```bash
docker exec n8n-production-pwrunner-1 node --version
```

## Current Status
- ✅ Script uploaded to VPS: `/tmp/regrid-screenshot-v15.js`
- ✅ Script copied to container: `/app/scripts/regrid-screenshot-v15.js`
- ✅ Symlink created: `regrid-screenshot.js -> regrid-screenshot-v15.js`
- ✅ Script enhanced with explicit process.exit() calls
- ❌ Service still returning empty stdout

## Next Steps
1. Check the actual `pwrunner` service code in `/app/index.js`
2. Verify the service is calling the correct script path
3. Check if the service has a timeout that's too short
4. Consider updating the service to use `spawn` instead of `exec`
