# Deploy regrid-screenshot-v15.js to VPS

## Step 1: Access DigitalOcean Console

1. **Sign in to DigitalOcean** (you're currently on the Google sign-in page)
2. Once logged in, navigate to **Droplets**
3. Find your droplet (likely named `n8n-production` or similar)
4. Click on the droplet to open its details
5. Click **"Access"** or **"Console"** button to open the web-based terminal

## Step 2: Upload Script to VPS

### Option A: Using SCP (from your local machine)

From your local Windows machine, open PowerShell and run:

```powershell
# Navigate to the scripts directory
cd "C:\Users\fs_ro\Documents\TAX DEED FLOW\scripts"

# Upload the script to VPS (replace with your VPS IP and username)
scp regrid-screenshot-v15.js root@192.241.153.13:/tmp/regrid-screenshot-v15.js
```

### Option B: Using DigitalOcean Console (Copy/Paste)

1. **Open the script file** on your local machine:
   - File: `C:\Users\fs_ro\Documents\TAX DEED FLOW\scripts\regrid-screenshot-v15.js`

2. **Copy the entire contents** of the file

3. **In DigitalOcean Console**, run:
   ```bash
   # Create the file
   nano /tmp/regrid-screenshot-v15.js
   ```

4. **Paste the contents** (Ctrl+Shift+V in the console)

5. **Save and exit**: Ctrl+X, then Y, then Enter

## Step 3: Copy Script to pwrunner Container

Once the script is on the VPS at `/tmp/regrid-screenshot-v15.js`, copy it to the container:

```bash
# Copy script to pwrunner container
docker cp /tmp/regrid-screenshot-v15.js n8n-production-pwrunner-1:/app/scripts/regrid-screenshot-v15.js

# Verify the file was copied
docker exec n8n-production-pwrunner-1 ls -la /app/scripts/regrid-screenshot-v15.js

# Make it executable (if needed)
docker exec n8n-production-pwrunner-1 chmod +x /app/scripts/regrid-screenshot-v15.js
```

## Step 4: Verify Installation

Test that the script works:

```bash
# Test the script (this will fail without proper args, but confirms it's accessible)
docker exec n8n-production-pwrunner-1 node /app/scripts/regrid-screenshot-v15.js

# Should show: "Missing parcel_id argument"
```

## Step 5: Update pwrunner Service (if needed)

If your pwrunner service needs to be updated to use v15, check the service code:

```bash
# View the current service
docker exec n8n-production-pwrunner-1 cat /app/index.js | grep -A 10 "run-regrid"
```

The service should execute:
```javascript
node /app/scripts/regrid-screenshot-v15.js "$parcel" "$county" "$state" "$property_id"
```

## Quick Command Summary

```bash
# 1. Upload script (from local machine via SCP)
scp "C:\Users\fs_ro\Documents\TAX DEED FLOW\scripts\regrid-screenshot-v15.js" root@192.241.153.13:/tmp/

# 2. Copy to container (from VPS console)
docker cp /tmp/regrid-screenshot-v15.js n8n-production-pwrunner-1:/app/scripts/regrid-screenshot-v15.js

# 3. Verify (from VPS console)
docker exec n8n-production-pwrunner-1 ls -la /app/scripts/regrid-screenshot-v15.js
```

## Troubleshooting

### If container name is different:
```bash
# List all containers
docker ps

# Find the pwrunner container name
docker ps | grep pwrunner

# Use the correct container name
docker cp /tmp/regrid-screenshot-v15.js <container-name>:/app/scripts/regrid-screenshot-v15.js
```

### If scripts directory doesn't exist:
```bash
# Create the directory
docker exec n8n-production-pwrunner-1 mkdir -p /app/scripts

# Then copy the file
docker cp /tmp/regrid-screenshot-v15.js n8n-production-pwrunner-1:/app/scripts/regrid-screenshot-v15.js
```

### Test the script manually:
```bash
# Run with test parameters
docker exec n8n-production-pwrunner-1 node /app/scripts/regrid-screenshot-v15.js "12345" "blair" "pa" "test-property-id"
```
