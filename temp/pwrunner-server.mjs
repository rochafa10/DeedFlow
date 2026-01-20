import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Playwright runner is running', endpoints: ['/run-regrid'] });
});

// Regrid screenshot endpoint - matches production
app.get('/run-regrid', async (req, res) => {
  const { parcel, county, state, property_id } = req.query;
  
  console.log(`[run-regrid] Request: parcel=${parcel}, county=${county}, state=${state}, property_id=${property_id}`);
  
  if (!parcel) {
    return res.json({ success: false, error: 'Missing parcel parameter' });
  }
  
  const scriptPath = '/app/scripts/regrid-screenshot-v15.js';
  const cmd = `node "${scriptPath}" "${parcel}" "${county || ''}" "${state || ''}" "${property_id || ''}"`;
  
  console.log(`[run-regrid] Executing: ${cmd}`);
  const startTime = Date.now();
  
  try {
    const { stdout, stderr } = await execAsync(cmd, { 
      timeout: 120000,  // 2 minute timeout
      maxBuffer: 50 * 1024 * 1024  // 50MB buffer for screenshots
    });
    
    const duration = Date.now() - startTime;
    console.log(`[run-regrid] Completed in ${duration}ms`);
    console.log(`[run-regrid] Stdout length: ${stdout.length}, Stderr length: ${stderr.length}`);
    
    if (stderr) {
      console.log(`[run-regrid] Stderr: ${stderr.substring(0, 500)}`);
    }
    
    if (!stdout || stdout.trim() === '') {
      return res.json({ 
        success: false, 
        error: 'Empty stdout from script',
        duration,
        stderr: stderr.substring(0, 1000)
      });
    }
    
    try {
      const result = JSON.parse(stdout.trim());
      res.json(result);
    } catch (parseError) {
      console.error(`[run-regrid] JSON parse error: ${parseError.message}`);
      res.json({ 
        success: false, 
        error: `Failed to parse script output: ${parseError.message}`,
        stdout: stdout.substring(0, 1000),
        stderr: stderr.substring(0, 1000)
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[run-regrid] Error after ${duration}ms: ${error.message}`);
    res.json({ 
      success: false, 
      error: error.message,
      duration,
      code: error.code
    });
  }
});

app.listen(port, () => {
  console.log(`Playwright runner listening on port ${port}`);
  console.log('Endpoints: GET /, GET /run-regrid');
});
