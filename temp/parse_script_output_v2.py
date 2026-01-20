import json
import sys
import subprocess

# Run the script in the container with larger buffer
result = subprocess.run(
    ['docker', 'exec', 'pwrunner-test', 'node', '/app/scripts/regrid-screenshot-v15.js', 
     '01.05-16..-094.00-000', 'Blair', 'PA', 'test-id'],
    capture_output=True,
    text=False  # Get bytes to handle large output
)

# Parse stdout (the JSON output)
stdout = result.stdout.decode('utf-8', errors='replace').strip()
stderr = result.stderr.decode('utf-8', errors='replace').strip()

print("=== STDERR (debug info) ===")
print(stderr[:1000] if stderr else "(empty)")
print()

print(f"=== STDOUT INFO ===")
print(f"Total stdout length: {len(stdout)} bytes")
print()

print("=== PARSING JSON OUTPUT ===")
try:
    data = json.loads(stdout)
    
    print(f"success: {data.get('success')}")
    print(f"property_id: {data.get('property_id')}")
    print(f"parcel_id: {data.get('parcel_id')}")
    print(f"data_quality_score: {data.get('data_quality_score')}")
    
    screenshot = data.get('screenshot', '')
    print(f"screenshot length: {len(screenshot)} chars")
    
    regrid_data = data.get('regrid_data', {})
    if regrid_data:
        print()
        print("=== REGRID DATA ===")
        for key, value in regrid_data.items():
            if value is not None:
                print(f"  {key}: {value}")
    else:
        print("(no regrid_data)")
        
    print()
    print("=== TEST PASSED! ===")
        
except json.JSONDecodeError as e:
    print(f"JSON parse error: {e}")
    print(f"First 200 chars: {stdout[:200]}")
    print(f"Last 200 chars: {stdout[-200:]}")
