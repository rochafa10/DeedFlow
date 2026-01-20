#!/usr/bin/env python3
"""
Upload regrid-screenshot-v15.js to DigitalOcean VPS
This script reads the file, encodes it to base64, and outputs commands
to paste into the DigitalOcean console.
"""

import base64
import os

script_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'regrid-screenshot-v15.js')
script_path = os.path.abspath(script_path)

with open(script_path, 'rb') as f:
    content = f.read()

b64 = base64.b64encode(content).decode('utf-8')

# Split into chunks for easier pasting
chunk_size = 5000
chunks = [b64[i:i+chunk_size] for i in range(0, len(b64), chunk_size)]

print("=" * 80)
print("STEP 1: Create the base64 file on VPS")
print("=" * 80)
print("\n# Run this command on the VPS:")
print("cat > /tmp/script_b64.txt << 'B64EOF'")
print("\n# Then paste the base64 string below (it's split into chunks):")
for i, chunk in enumerate(chunks):
    print(f"\n# Chunk {i+1}/{len(chunks)}:")
    print(chunk)
print("\nB64EOF")
print("\n" + "=" * 80)
print("STEP 2: Decode the base64 file")
print("=" * 80)
print("\npython3 /tmp/decode_script.py /tmp/script_b64.txt")
print("\n" + "=" * 80)
print("STEP 3: Copy to container")
print("=" * 80)
print("\ndocker cp /tmp/regrid-screenshot-v15.js n8n-production-pwrunner-1:/app/scripts/regrid-screenshot-v15.js")
print("docker exec n8n-production-pwrunner-1 chmod +x /app/scripts/regrid-screenshot-v15.js")
print("docker exec n8n-production-pwrunner-1 ls -la /app/scripts/regrid-screenshot-v15.js")
print("\n" + "=" * 80)
print("STEP 4: Update symlink")
print("=" * 80)
print("\ndocker exec n8n-production-pwrunner-1 rm -f /app/scripts/regrid-screenshot.js")
print("docker exec n8n-production-pwrunner-1 ln -s /app/scripts/regrid-screenshot-v15.js /app/scripts/regrid-screenshot.js")
print("docker exec n8n-production-pwrunner-1 ls -la /app/scripts/regrid-screenshot*.js")
