#!/usr/bin/env python3
"""
Fix the Code node for converting screenshot to binary in n8n workflow.
The issue is that the Code node needs to properly handle the binary data format that n8n expects.
"""

import json

# Read the current workflow
with open('n8n-workflows/TDF-Regrid-Scraper-V15-WORKFLOW.json', 'r') as f:
    workflow = json.load(f)

# Find and fix the Convert Screenshot to Binary node
for node in workflow['nodes']:
    if node['name'] == 'Convert Screenshot to Binary':
        # The issue is that n8n Code nodes need to return binary data in a specific format
        # The binary data should be returned as a Buffer with proper structure
        node['parameters']['jsCode'] = '''// Get screenshot from Parse Playwright Response node
const parseResponse = $('Parse Playwright Response').first();
const screenshot = parseResponse.json.screenshot;
const parcelId = parseResponse.json.parcel_id;
const propertyId = parseResponse.json.property_id;

if (!screenshot) {
  throw new Error('No screenshot data found in Parse Playwright Response');
}

// Clean the base64 string (remove any data URL prefix if present)
const base64Data = screenshot.replace(/^data:image\\/\\w+;base64,/, '');

// Convert base64 to Buffer
const binaryBuffer = Buffer.from(base64Data, 'base64');

// Generate safe filename
const safeParcelId = parcelId ? parcelId.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown';
const fileName = `${safeParcelId}.jpg`;

// Return in n8n binary format
return [{
  json: {
    property_id: propertyId,
    parcel_id: parcelId,
    fileName: fileName
  },
  binary: {
    data: {
      data: binaryBuffer.toString('base64'),
      mimeType: 'image/jpeg',
      fileName: fileName,
      fileExtension: 'jpg'
    }
  }
}];'''
        print(f"Fixed 'Convert Screenshot to Binary' node")

    # Also fix the connections - ensure proper flow
    # Parse Playwright Response should connect to BOTH Prepare DB Data AND Convert Screenshot to Binary
    # But they should NOT both connect to Update Screenshot URL - that creates issues
    
# Fix connections - make it sequential instead of parallel for better reliability
# Flow: Parse Response -> Prepare DB Data -> Update Database -> Convert Screenshot -> Upload -> Update URL -> Update Progress
workflow['connections'] = {
    "Check for Jobs": {
        "main": [[{"node": "Get Pending Jobs", "type": "main", "index": 0}]]
    },
    "Get Pending Jobs": {
        "main": [[{"node": "Has Jobs?", "type": "main", "index": 0}]]
    },
    "Has Jobs?": {
        "main": [
            [{"node": "Extract Job Data", "type": "main", "index": 0}],
            []
        ]
    },
    "Extract Job Data": {
        "main": [[{"node": "Get Properties to Scrape", "type": "main", "index": 0}]]
    },
    "Get Properties to Scrape": {
        "main": [[{"node": "Split in Batches", "type": "main", "index": 0}]]
    },
    "Split in Batches": {
        "main": [[{"node": "Prepare Regrid URL", "type": "main", "index": 0}]]
    },
    "Prepare Regrid URL": {
        "main": [[{"node": "Run Playwright Screenshot", "type": "main", "index": 0}]]
    },
    "Run Playwright Screenshot": {
        "main": [[{"node": "Parse Playwright Response", "type": "main", "index": 0}]]
    },
    "Parse Playwright Response": {
        "main": [[{"node": "Prepare DB Data", "type": "main", "index": 0}]]
    },
    "Prepare DB Data": {
        "main": [[{"node": "Update Database", "type": "main", "index": 0}]]
    },
    "Update Database": {
        "main": [[{"node": "Convert Screenshot to Binary", "type": "main", "index": 0}]]
    },
    "Convert Screenshot to Binary": {
        "main": [[{"node": "Upload Screenshot to Supabase", "type": "main", "index": 0}]]
    },
    "Upload Screenshot to Supabase": {
        "main": [[{"node": "Update Screenshot URL", "type": "main", "index": 0}]]
    },
    "Update Screenshot URL": {
        "main": [[{"node": "Update Job Progress", "type": "main", "index": 0}]]
    },
    "Update Job Progress": {
        "main": [[{"node": "Split in Batches", "type": "loop", "index": 0}]]
    }
}
print("Fixed connections to be sequential (more reliable)")

# Save the fixed workflow
with open('temp/fixed_workflow_v3.json', 'w') as f:
    json.dump(workflow, f, indent=2)

print(f"\nFixed workflow saved to temp/fixed_workflow_v3.json")
print("\nChanges made:")
print("1. Fixed Code node to properly return binary data in n8n format")
print("2. Changed connections from parallel to sequential for reliability")
print("3. Flow: Parse Response -> DB Update -> Screenshot Upload -> URL Update -> Progress")
