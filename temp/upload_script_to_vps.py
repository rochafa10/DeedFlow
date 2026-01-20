#!/usr/bin/env python3
"""
Helper script to upload regrid-screenshot-v15.js to VPS
Reads the script, base64 encodes it, and provides commands to run in console
"""

import base64
import os

script_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'regrid-screenshot-v15.js')

with open(script_path, 'rb') as f:
    script_content = f.read()
    base64_encoded = base64.b64encode(script_content).decode('utf-8')

print("=" * 80)
print("Copy and paste this command into the DigitalOcean console:")
print("=" * 80)
print()
print(f"python3 -c \"import base64; open('/tmp/regrid-screenshot-v15.js', 'wb').write(base64.b64decode('{base64_encoded}'))\"")
print()
print("=" * 80)
print("Then run:")
print("=" * 80)
print()
print("docker cp /tmp/regrid-screenshot-v15.js n8n-production-pwrunner-1:/app/scripts/regrid-screenshot-v15.js")
print("docker exec n8n-production-pwrunner-1 chmod +x /app/scripts/regrid-screenshot-v15.js")
print("docker exec n8n-production-pwrunner-1 ls -la /app/scripts/regrid-screenshot-v15.js")
