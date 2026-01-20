import json

# Read the fixed workflow JSON
with open('../n8n-workflows/TDF-Regrid-Scraper_DGXfvxQpgn25n3OO_FIXED_2026-01-12.json', 'r') as f:
    workflow = json.load(f)

# Extract nodes and connections
nodes = workflow['nodes']
connections = workflow['connections']
settings = workflow.get('settings', {})

print(f"Nodes: {len(nodes)}")
print(f"Connections: {len(connections)}")
print(f"Settings: {settings}")

# Print first node as example
print(f"\nFirst node: {nodes[0]['name']} ({nodes[0]['type']})")
