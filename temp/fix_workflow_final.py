import json

# Read the current workflow from n8n (the one that's actually deployed)
# We'll create a corrected version based on the current state

workflow = {
    "nodes": [
        {
            "parameters": {
                "rule": {
                    "interval": [{"field": "minutes", "minutesInterval": 1}]
                }
            },
            "id": "schedule-trigger",
            "name": "Check for Jobs",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [112, 400]
        },
        {
            "parameters": {
                "url": "https://oiiwlzobizftprqspbzt.supabase.co/rest/v1/batch_jobs",
                "sendQuery": True,
                "queryParameters": {
                    "parameters": [
                        {"name": "status", "value": "in.(pending,in_progress)"},
                        {"name": "job_type", "value": "eq.regrid_scraping"},
                        {"name": "select", "value": "id,county_id,batch_size,processed_items,total_items,current_batch"},
                        {"name": "order", "value": "created_at.asc"},
                        {"name": "limit", "value": "1"}
                    ]
                },
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"},
                        {"name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"}
                    ]
                }
            },
            "id": "get-pending-jobs",
            "name": "Get Pending Jobs",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [304, 400]
        },
        {
            "parameters": {
                "conditions": {
                    "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                    "conditions": [
                        {
                            "id": "check-job-exists",
                            "leftValue": "={{ Object.keys($json).length }}",
                            "rightValue": 0,
                            "operator": {"type": "number", "operation": "gt"}
                        }
                    ],
                    "combinator": "and"
                }
            },
            "id": "check-jobs",
            "name": "Has Jobs?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [512, 400]
        },
        {
            "parameters": {
                "jsCode": """const jobs = $input.all();
if (jobs.length > 0 && jobs[0].json) {
  const job = jobs[0].json;
  if (job.id) {
    return [{ json: { job_id: job.id, county_id: job.county_id, batch_size: job.batch_size || 50, total_items: job.total_items || 0, processed_items: job.processed_items || 0 } }];
  }
  if (Array.isArray(job) && job.length > 0) {
    const firstJob = job[0];
    return [{ json: { job_id: firstJob.id, county_id: firstJob.county_id, batch_size: firstJob.batch_size || 50, total_items: firstJob.total_items || 0, processed_items: firstJob.processed_items || 0 } }];
  }
}
return [{ json: { job_id: null } }];"""
            },
            "id": "extract-job",
            "name": "Extract Job Data",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [720, 384]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "https://oiiwlzobizftprqspbzt.supabase.co/rest/v1/rpc/get_next_batch",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"},
                        {"name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"},
                        {"name": "Content-Type", "value": "application/json"}
                    ]
                },
                "sendBody": True,
                "contentType": "json",
                "specifyBody": "json",
                "jsonBody": '={"p_job_id": "{{ $json.job_id }}"}',
                "options": {}
            },
            "id": "get-properties",
            "name": "Get Properties to Scrape",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [960, 384]
        },
        {
            "parameters": {
                "batchSize": 1,  # Process ONE property at a time
                "options": {}
            },
            "id": "split-batches",
            "name": "Split in Batches",
            "type": "n8n-nodes-base.splitInBatches",
            "typeVersion": 3,
            "position": [1200, 384]
        },
        {
            "parameters": {
                "jsCode": """const property = $input.first().json;
const propertyId = property.item_id || property.id;
if (!propertyId) {
  throw new Error('Property ID (item_id) not found');
}
const county = property.county_name?.toLowerCase().replace(/\\s+/g, '-') || 'unknown';
const state = property.state_code?.toLowerCase() || 'pa';
return [{
  json: {
    property_id: propertyId,
    parcel_id: property.parcel_id,
    county_name: property.county_name || county,
    state_code: property.state_code || state,
    property_address: property.property_address
  }
}];"""
            },
            "id": "prepare-regrid-url",
            "name": "Prepare Regrid URL",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1440, 384]
        },
        {
            "parameters": {
                "url": "http://n8n-production-pwrunner-1:3001/run-regrid",
                "sendQuery": True,
                "queryParameters": {
                    "parameters": [
                        {"name": "parcel", "value": "={{ $json.parcel_id }}"},
                        {"name": "county", "value": "={{ $json.county_name }}"},
                        {"name": "state", "value": "={{ $json.state_code }}"},
                        {"name": "property_id", "value": "={{ $json.property_id }}"}
                    ]
                },
                "options": {"timeout": 120000}
            },
            "id": "run-playwright-screenshot",
            "name": "Run Playwright Screenshot",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1680, 384]
        },
        {
            "parameters": {
                "jsCode": """const input = $input.first().json;
let response;
if (typeof input.data === 'string') {
  try {
    response = JSON.parse(input.data);
  } catch (e) {
    throw new Error('Failed to parse Playwright response: ' + e.message);
  }
} else if (input.success !== undefined) {
  response = input;
} else if (typeof input === 'string') {
  response = JSON.parse(input);
} else {
  response = input;
}
if (!response.success) {
  throw new Error('Playwright scraping failed: ' + (response.error || 'Unknown error'));
}
if (!response.screenshot) {
  throw new Error('No screenshot in response');
}
if (!response.regrid_data) {
  throw new Error('No regrid_data in response');
}
return {
  json: {
    property_id: response.property_id,
    parcel_id: response.parcel_id,
    screenshot: response.screenshot,
    regrid_data: response.regrid_data,
    panel_closed: response.panel_closed || false,
    scraped_at: response.scraped_at,
    success: response.success
  }
};"""
            },
            "id": "parse-playwright-response",
            "name": "Parse Playwright Response",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1920, 384]
        },
        {
            "parameters": {
                "jsCode": """const input = $input.first().json;
const regridData = input.regrid_data || {};
return {
  json: {
    property_id: input.property_id,
    regrid_id: regridData.regrid_id || null,
    ll_uuid: regridData.ll_uuid || null,
    property_type: regridData.property_type || null,
    property_class: regridData.property_class || null,
    land_use: regridData.land_use || null,
    zoning: regridData.zoning || null,
    lot_size_sqft: regridData.lot_size_sqft || null,
    lot_size_acres: regridData.lot_size_acres || null,
    lot_dimensions: regridData.lot_dimensions || null,
    building_sqft: regridData.building_sqft || null,
    year_built: regridData.year_built || null,
    bedrooms: regridData.bedrooms || null,
    bathrooms: regridData.bathrooms || null,
    assessed_value: regridData.assessed_value || null,
    assessed_land_value: regridData.assessed_land_value || null,
    assessed_improvement_value: regridData.assessed_improvement_value || null,
    market_value: regridData.market_value || null,
    latitude: regridData.latitude || null,
    longitude: regridData.longitude || null,
    elevation_ft: regridData.elevation_ft || null,
    water_service: regridData.water_service || null,
    sewer_service: regridData.sewer_service || null,
    utilities: regridData.utilities || null,
    additional_fields: regridData.additional_fields || {},
    data_quality_score: regridData.data_quality_score || 0.0,
    scraped_at: regridData.scraped_at || new Date().toISOString(),
    screenshot_url: null
  }
};"""
            },
            "id": "prepare-db-data",
            "name": "Prepare DB Data",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [2160, 384]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "https://oiiwlzobizftprqspbzt.supabase.co/rest/v1/regrid_data",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"},
                        {"name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"},
                        {"name": "Content-Type", "value": "application/json"},
                        {"name": "Prefer", "value": "resolution=merge-duplicates,return=minimal"}
                    ]
                },
                "sendQuery": True,
                "queryParameters": {
                    "parameters": [{"name": "on_conflict", "value": "property_id"}]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify($json) }}",
                "options": {}
            },
            "id": "update-database",
            "name": "Update Database",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [2400, 384]
        },
        {
            "parameters": {
                "jsCode": """// Get screenshot from Parse Playwright Response node
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
}];"""
            },
            "id": "convert-screenshot",
            "name": "Convert Screenshot to Binary",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [2640, 384]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "=https://oiiwlzobizftprqspbzt.supabase.co/storage/v1/object/screenshots/{{ $json.fileName }}",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA0NzgzNSwiZXhwIjoyMDcwNjIzODM1fQ.YourServiceKeyHere"},
                        {"name": "Content-Type", "value": "image/jpeg"},
                        {"name": "x-upsert", "value": "true"}
                    ]
                },
                "sendBody": True,
                "specifyBody": "binary",
                "options": {}
            },
            "id": "upload-screenshot",
            "name": "Upload Screenshot to Supabase",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [2880, 384]
        },
        {
            "parameters": {
                "method": "PATCH",
                "url": "=https://oiiwlzobizftprqspbzt.supabase.co/rest/v1/regrid_data?property_id=eq.{{ $('Parse Playwright Response').first().json.property_id }}",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"},
                        {"name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"},
                        {"name": "Content-Type", "value": "application/json"}
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": '={"screenshot_url": "https://oiiwlzobizftprqspbzt.supabase.co/storage/v1/object/public/screenshots/{{ $json.fileName }}"}',
                "options": {}
            },
            "id": "update-screenshot-url",
            "name": "Update Screenshot URL",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [3120, 384]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "https://oiiwlzobizftprqspbzt.supabase.co/rest/v1/rpc/update_batch_progress",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"},
                        {"name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"},
                        {"name": "Content-Type", "value": "application/json"}
                    ]
                },
                "sendBody": True,
                "contentType": "json",
                "specifyBody": "json",
                "jsonBody": '={"p_job_id": "{{ $(\'Extract Job Data\').first().json.job_id }}", "p_last_item_id": "{{ $(\'Parse Playwright Response\').first().json.property_id }}", "p_items_processed": 1, "p_items_failed": 0, "p_error_message": null}',
                "options": {}
            },
            "id": "update-progress",
            "name": "Update Job Progress",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [3360, 384]
        }
    ],
    "connections": {
        "Check for Jobs": {"main": [[{"node": "Get Pending Jobs", "type": "main", "index": 0}]]},
        "Get Pending Jobs": {"main": [[{"node": "Has Jobs?", "type": "main", "index": 0}]]},
        "Has Jobs?": {"main": [[{"node": "Extract Job Data", "type": "main", "index": 0}], []]},
        "Extract Job Data": {"main": [[{"node": "Get Properties to Scrape", "type": "main", "index": 0}]]},
        "Get Properties to Scrape": {"main": [[{"node": "Split in Batches", "type": "main", "index": 0}]]},
        "Split in Batches": {"main": [[{"node": "Prepare Regrid URL", "type": "main", "index": 0}]]},
        "Prepare Regrid URL": {"main": [[{"node": "Run Playwright Screenshot", "type": "main", "index": 0}]]},
        "Run Playwright Screenshot": {"main": [[{"node": "Parse Playwright Response", "type": "main", "index": 0}]]},
        # SEQUENTIAL FLOW: Parse -> DB Data -> DB Update -> Convert Screenshot -> Upload -> Update URL -> Progress
        "Parse Playwright Response": {"main": [[{"node": "Prepare DB Data", "type": "main", "index": 0}]]},
        "Prepare DB Data": {"main": [[{"node": "Update Database", "type": "main", "index": 0}]]},
        "Update Database": {"main": [[{"node": "Convert Screenshot to Binary", "type": "main", "index": 0}]]},
        "Convert Screenshot to Binary": {"main": [[{"node": "Upload Screenshot to Supabase", "type": "main", "index": 0}]]},
        "Upload Screenshot to Supabase": {"main": [[{"node": "Update Screenshot URL", "type": "main", "index": 0}]]},
        "Update Screenshot URL": {"main": [[{"node": "Update Job Progress", "type": "main", "index": 0}]]},
        "Update Job Progress": {"main": [[{"node": "Split in Batches", "type": "loop", "index": 0}]]}
    },
    "settings": {"executionOrder": "v1"}
}

# Save the corrected workflow
with open("temp/workflow_final_corrected.json", "w") as f:
    json.dump(workflow, f, indent=2)

print("Corrected workflow saved to temp/workflow_final_corrected.json")
print("\nKey fixes:")
print("1. Split in Batches: batchSize = 1 (process ONE property at a time)")
print("2. Sequential flow: Parse -> DB Data -> DB Update -> Convert -> Upload -> Update URL -> Progress")
print("3. Loop back to Split in Batches after Update Job Progress")
