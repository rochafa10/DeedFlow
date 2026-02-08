import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import { URL } from 'url';

const execAsync = promisify(exec);
const port = process.env.PORT || 3001;
const startTime = Date.now();

// Concurrency control - only 1 Chromium instance at a time to prevent OOM
let activeJobs = 0;
const MAX_CONCURRENT = 1;
const queue = [];

function processQueue() {
  while (queue.length > 0 && activeJobs < MAX_CONCURRENT) {
    const next = queue.shift();
    next();
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const path = url.pathname;

  res.setHeader('Content-Type', 'application/json');

  // Health endpoint
  if (path === '/health') {
    const mem = process.memoryUsage();
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - startTime) / 1000,
      activeJobs,
      queueLength: queue.length,
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
      }
    }));
    return;
  }

  // Regrid screenshot endpoint
  if (path === '/run-regrid') {
    const parcel = url.searchParams.get('parcel');
    const county = url.searchParams.get('county') || '';
    const state = url.searchParams.get('state') || '';
    const property_id = url.searchParams.get('property_id') || '';
    const address = url.searchParams.get('address') || '';

    console.log(`Received regrid request for parcel: ${parcel}, address: ${address || '(none)'} (active: ${activeJobs}, queued: ${queue.length})`);

    if (!parcel) {
      res.end(JSON.stringify({ ok: false, success: false, error: 'Missing parcel parameter' }));
      return;
    }

    // Reject if queue is too long (prevent unbounded growth)
    if (queue.length >= 5) {
      console.log(`Rejecting request for ${parcel} - queue full (${queue.length})`);
      res.end(JSON.stringify({
        ok: false, success: false,
        error: `Server busy: ${activeJobs} active, ${queue.length} queued. Try again later.`
      }));
      return;
    }

    // Queue the work
    const runJob = () => {
      activeJobs++;
      const scriptPath = '/app/scripts/regrid-screenshot-v18.js';
      const cmd = `node "${scriptPath}" "${parcel}" "${county}" "${state}" "${property_id}" "${address}"`;

      console.log(`Starting regrid screenshot for parcel: ${parcel} (active: ${activeJobs})`);
      const reqStart = Date.now();

      execAsync(cmd, {
        timeout: 150000,
        maxBuffer: 50 * 1024 * 1024
      }).then(({ stdout, stderr }) => {
        const duration = Date.now() - reqStart;
        console.log(`Regrid screenshot completed in ${duration}ms`);

        if (stderr) {
          console.error(stderr.substring(0, 500));
        }

        if (!stdout || stdout.trim() === '') {
          res.end(JSON.stringify({
            ok: false, success: false,
            error: 'Empty stdout from script',
            took_ms: duration
          }));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          console.log(`Successfully parsed JSON result with keys: ${Object.keys(result).join(', ')}`);
          result.ok = true;
          result.took_ms = duration;
          res.end(JSON.stringify(result));
        } catch (parseError) {
          console.error(`JSON parse error: ${parseError.message}`);
          res.end(JSON.stringify({
            ok: false, success: false,
            error: `Parse error: ${parseError.message}`,
            stdout: stdout.substring(0, 1000)
          }));
        }
      }).catch((error) => {
        const duration = Date.now() - reqStart;
        console.error(`Error after ${duration}ms: ${error.message}`);
        res.end(JSON.stringify({
          ok: false, success: false,
          error: error.message,
          took_ms: duration
        }));
      }).finally(() => {
        activeJobs--;
        processQueue();
      });
    };

    if (activeJobs < MAX_CONCURRENT) {
      runJob();
    } else {
      console.log(`Queuing request for ${parcel} (position: ${queue.length + 1})`);
      queue.push(runJob);
    }
    return;
  }

  // 404 for everything else
  res.statusCode = 404;
  res.end('Not Found');
});

// Memory logging
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`Memory: RSS=${Math.round(mem.rss/1024/1024)}MB, Heap=${Math.round(mem.heapUsed/1024/1024)}MB | Jobs: active=${activeJobs}, queued=${queue.length}`);
}, 30000);

server.listen(port, () => {
  console.log(`Playwright runner API on :${port} (max concurrent: ${MAX_CONCURRENT})`);
});
