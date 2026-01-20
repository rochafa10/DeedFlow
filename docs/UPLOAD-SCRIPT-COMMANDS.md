# Quick Upload Commands for regrid-screenshot-v15.js

## Option 1: SCP from Local Machine (Recommended)

Open PowerShell on your local machine and run:

```powershell
# Navigate to scripts directory
cd "C:\Users\fs_ro\Documents\TAX DEED FLOW\scripts"

# Upload to VPS
scp regrid-screenshot-v15.js root@192.241.153.13:/tmp/regrid-screenshot-v15.js
```

Then in the DigitalOcean console (which is already open), run:

```bash
# Check Docker containers
docker ps

# Copy script to pwrunner container
docker cp /tmp/regrid-screenshot-v15.js n8n-production-pwrunner-1:/app/scripts/regrid-screenshot-v15.js

# Verify it was copied
docker exec n8n-production-pwrunner-1 ls -la /app/scripts/regrid-screenshot-v15.js

# Make it executable
docker exec n8n-production-pwrunner-1 chmod +x /app/scripts/regrid-screenshot-v15.js
```

## Option 2: Direct Copy/Paste in Console

If SCP doesn't work, you can create the file directly in the console:

1. In the DigitalOcean console, run:
```bash
nano /tmp/regrid-screenshot-v15.js
```

2. Copy the entire contents of `scripts/regrid-screenshot-v15.js` from your local machine

3. Paste into nano (Ctrl+Shift+V)

4. Save: Ctrl+X, then Y, then Enter

5. Then copy to container:
```bash
docker cp /tmp/regrid-screenshot-v15.js n8n-production-pwrunner-1:/app/scripts/regrid-screenshot-v15.js
```
