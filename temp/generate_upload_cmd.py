import base64
import sys

# Read the script file
import os
script_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'regrid-screenshot-v15.js')
script_path = os.path.abspath(script_path)
with open(script_path, 'rb') as f:
    content = f.read()

# Encode to base64
encoded = base64.b64encode(content).decode('utf-8')

# Generate the command
print("python3 -c \"import base64; open('/tmp/regrid-screenshot-v15.js', 'wb').write(base64.b64decode('" + encoded + "'))\"")
print("\n# Then run:")
print("docker cp /tmp/regrid-screenshot-v15.js n8n-production-pwrunner-1:/app/scripts/regrid-screenshot-v15.js")
print("docker exec n8n-production-pwrunner-1 chmod +x /app/scripts/regrid-screenshot-v15.js")
print("docker exec n8n-production-pwrunner-1 ls -la /app/scripts/regrid-screenshot-v15.js")
