#!/usr/bin/env python3
"""
Fix the Convert Screenshot to Binary node - the issue is that sourceProperty
is being evaluated incorrectly. The node needs to receive the proper data structure.
"""
import json
import requests

# n8n API configuration
N8N_BASE_URL = "https://n8n.lfb-investments.com/api/v1"
N8N_API_KEY = "n8n_api_a0ea2fb7c6e1e63b0da7a8d7eb35e9ab3d0d4a1c78cd0f2c0e0a3f8a8c5c5d5e"
WORKFLOW_ID = "DGXfvxQpgn25n3OO"

headers = {
    "X-N8N-API-KEY": N8N_API_KEY,
    "Content-Type": "application/json"
}

# Get current workflow
response = requests.get(f"{N8N_BASE_URL}/workflows/{WORKFLOW_ID}", headers=headers)
if response.status_code != 200:
    print(f"Failed to get workflow: {response.status_code}")
    print(response.text)
    exit(1)

workflow = response.json()
print(f"Got workflow: {workflow.get('name')}")

# The issue: Convert Screenshot to Binary receives data from Parse Playwright Response
# But it's trying to use the screenshot value AS the field name
# 
# Solution: We need to ensure the sourceProperty is "screenshot" (the field name)
# and that the node receives the full JSON object with the screenshot field

# Find and fix the Convert Screenshot to Binary node
for node in workflow['nodes']:
    if node['id'] == 'convert-screenshot':
        print(f"Found node: {node['name']}")
        print(f"Current params: {json.dumps(node['parameters'], indent=2)}")
        
        # The convertToFile node with toBinary operation expects:
        # - sourceProperty: the NAME of the field containing base64 data (NOT an expression that returns the data)
        # - The input should be a JSON object with a field named by sourceProperty
        
        # Current config looks correct, but let's ensure it's exactly right
        node['parameters'] = {
            "operation": "toBinary",
            "sourceProperty": "screenshot",  # Field name, not the data!
            "binaryPropertyName": "data",
            "options": {
                "fileName": "screenshot.jpeg",
                "mimeType": "image/jpeg"
            }
        }
        print(f"Updated params: {json.dumps(node['parameters'], indent=2)}")
        break

# Also check the Parse Playwright Response node to ensure it outputs correctly
for node in workflow['nodes']:
    if node['id'] == 'parse-playwright-response':
        print(f"\nChecking Parse Playwright Response node...")
        print(f"Current code:\n{node['parameters'].get('jsCode', 'N/A')[:500]}...")
        break

# Check connections to ensure Convert Screenshot receives from Parse Playwright Response
print(f"\nConnections from Parse Playwright Response:")
parse_connections = workflow['connections'].get('Parse Playwright Response', {})
print(json.dumps(parse_connections, indent=2))

# Update workflow
update_data = {
    "name": workflow['name'],
    "nodes": workflow['nodes'],
    "connections": workflow['connections'],
    "settings": workflow.get('settings', {})
}

response = requests.put(f"{N8N_BASE_URL}/workflows/{WORKFLOW_ID}", headers=headers, json=update_data)
if response.status_code == 200:
    print("\nWorkflow updated successfully!")
else:
    print(f"\nFailed to update workflow: {response.status_code}")
    print(response.text)
