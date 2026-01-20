#!/usr/bin/env python3
"""
Fix the Convert Screenshot to Binary node configuration
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

# Find and fix the Convert Screenshot to Binary node
for node in workflow['nodes']:
    if node['id'] == 'convert-screenshot':
        print(f"Found node: {node['name']}")
        print(f"Current params: {json.dumps(node['parameters'], indent=2)}")
        
        # The issue is that sourceProperty might be getting interpreted incorrectly
        # Let's ensure it's a simple string value
        node['parameters'] = {
            "operation": "toBinary",
            "sourceProperty": "screenshot",
            "binaryPropertyName": "data",
            "options": {
                "fileName": "screenshot.jpeg",
                "mimeType": "image/jpeg"
            }
        }
        print(f"Updated params: {json.dumps(node['parameters'], indent=2)}")
        break

# Update workflow
update_data = {
    "name": workflow['name'],
    "nodes": workflow['nodes'],
    "connections": workflow['connections'],
    "settings": workflow.get('settings', {})
}

response = requests.put(f"{N8N_BASE_URL}/workflows/{WORKFLOW_ID}", headers=headers, json=update_data)
if response.status_code == 200:
    print("Workflow updated successfully!")
else:
    print(f"Failed to update workflow: {response.status_code}")
    print(response.text)
