# n8n Workflow Specification for Regrid Scraper v15

## Overview

This workflow uses `regrid-screenshot-v15.js` script running on the VPS pwrunner container to:
1. Scrape real property data from Regrid
2. Capture screenshots
3. Store data in `regrid_data` table
4. Upload screenshots to Supabase Storage

## Workflow Structure

```
┌─────────────────┐
│ Schedule Trigger │ (Every 1 minute)
│  "Check Jobs"   │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Get Pending     │ (Query batch_jobs table)
│ Jobs            │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Has Jobs?       │ (If condition)
└────────┬─────────┘
         │ YES
         ▼
┌─────────────────┐
│ Extract Job     │ (Extract job_id, county_id, etc.)
│ Data            │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Get Properties  │ (Call get_next_batch RPC)
│ to Scrape       │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Split in        │ (Process each property)
│ Batches         │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Prepare Regrid  │ (Build script parameters)
│ URL             │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Run Playwright  │ (Call v15 script via HTTP)
│ Screenshot      │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Parse Playwright│ (Extract screenshot + regrid_data)
│ Response        │
└────────┬─────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ Prepare DB Data │  │ Convert Screenshot│
│                 │  │ to Binary        │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐  ┌─────────────────┐
│ Update Database │  │ Upload Screenshot│
│ (regrid_data)   │  │ to Supabase      │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────┐
         │ Update Screenshot│ (Update screenshot_url)
         │ URL             │
         └────────┬─────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Update Job      │ (Update batch progress)
         │ Progress        │
         └─────────────────┘
```

## Node-by-Node Configuration

### 1. Schedule Trigger: "Check for Jobs"
```json
{
  "rule": {
    "interval": [{
      "field": "minutes",
      "minutesInterval": 1
    }]
  }
}
```

### 2. Get Pending Jobs
**Type**: HTTP Request  
**Method**: GET  
**URL**: `https://oiiwlzobizftprqspbzt.supabase.co/rest/v1/batch_jobs`  
**Query Parameters**:
- `status`: `in.(pending,in_progress)`
- `job_type`: `eq.regrid_scraping`
- `select`: `id,county_id,batch_size,processed_items,total_items,current_batch`
- `order`: `created_at.asc`
- `limit`: `1`

### 3. Has Jobs? (If Node)
**Condition**: `{{ Object.keys($json).length > 0 }}`

### 4. Extract Job Data (Code Node)
```javascript
const jobs = $input.all();
if (jobs.length > 0 && jobs[0].json) {
  const job = jobs[0].json;
  if (job.id) {
    return [{ 
      json: { 
        job_id: job.id, 
        county_id: job.county_id, 
        batch_size: job.batch_size || 50,
        total_items: job.total_items || 0,
        processed_items: job.processed_items || 0
      } 
    }];
  }
  if (Array.isArray(job) && job.length > 0) {
    const firstJob = job[0];
    return [{ 
      json: { 
        job_id: firstJob.id, 
        county_id: firstJob.county_id, 
        batch_size: firstJob.batch_size || 50,
        total_items: firstJob.total_items || 0,
        processed_items: firstJob.processed_items || 0
      } 
    }];
  }
}
return [{ json: { job_id: null } }];
```

### 5. Get Properties to Scrape
**Type**: HTTP Request  
**Method**: POST  
**URL**: `https://oiiwlzobizftprqspbzt.supabase.co/rest/v1/rpc/get_next_batch`  
**Body**:
```json
{
  "p_job_id": "{{ $json.job_id }}"
}
```

### 6. Split in Batches
**Type**: Split In Batches  
**Batch Size**: `{{ $('Extract Job Data').first().json.batch_size || 50 }}`  
**Options**: Process items sequentially

### 7. Prepare Regrid URL (Code Node)
```javascript
const property = $input.first().json;

const propertyId = property.item_id || property.id;
if (!propertyId) {
  throw new Error('Property ID (item_id) not found');
}

// Get county and state from property or join
const county = property.county_name?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
const state = property.state_code?.toLowerCase() || 'pa';

return [{
  json: {
    property_id: propertyId,
    parcel_id: property.parcel_id,
    county_name: property.county_name || county,
    state_code: property.state_code || state,
    property_address: property.property_address
  }
}];
```

### 8. Run Playwright Screenshot
**Type**: HTTP Request  
**Method**: GET  
**URL**: `http://n8n-production-pwrunner-1:3001/run-regrid`  
**Query Parameters**:
- `parcel`: `={{ $json.parcel_id }}` (e.g., `14.00-22..-043.00-049`)
- `county`: `={{ $json.county_name }}` (e.g., `Blair`)
- `state`: `={{ $json.state_code }}` (e.g., `PA`)
- `property_id`: `={{ $json.property_id }}` (e.g., `00dd92f3-05c5-4042-a522-f5fab5a4a526`)

**Options**:
- `timeout`: `120000` (2 minutes)

**Note**: All 4 parameters are required. The `property_id` is essential for the script to return it in the response.

**Note**: The pwrunner service should execute:
```bash
node /app/scripts/regrid-screenshot-v15.js "$parcel" "$county" "$state" "$property_id"
```

### 9. Parse Playwright Response (Code Node)
```javascript
const input = $input.first().json;

// Handle different response formats
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

// Validate response
if (!response.success) {
  throw new Error('Playwright scraping failed: ' + (response.error || 'Unknown error'));
}

if (!response.screenshot) {
  throw new Error('No screenshot in response');
}

if (!response.regrid_data) {
  throw new Error('No regrid_data in response');
}

// Return parsed data
return {
  json: {
    property_id: response.property_id,
    parcel_id: response.parcel_id,
    screenshot: response.screenshot, // base64 string
    regrid_data: response.regrid_data, // Full regrid_data object
    panel_closed: response.panel_closed || false,
    scraped_at: response.scraped_at,
    success: response.success
  }
};
```

### 10. Prepare DB Data (Code Node)
```javascript
const input = $input.first().json;
const regridData = input.regrid_data || {};

// Map regrid_data to database schema
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
    frontage_ft: regridData.frontage_ft || null,
    building_sqft: regridData.building_sqft || null,
    year_built: regridData.year_built || null,
    stories: regridData.stories || null,
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
    screenshot_url: null // Will be updated after upload
  }
};
```

### 11. Update Database
**Type**: HTTP Request  
**Method**: POST  
**URL**: `https://oiiwlzobizftprqspbzt.supabase.co/rest/v1/regrid_data`  
**Headers**:
- `Prefer`: `resolution=merge-duplicates,return=minimal`
- `Content-Type`: `application/json`

**Body**: `={{ JSON.stringify($json) }}`

**Note**: Uses `on_conflict=property_id` to upsert

### 12. Convert Screenshot to Binary
**Type**: Convert to File  
**Operation**: `toBinary`  
**Source Property**: `screenshot`  
**Binary Property Name**: `data`  
**Options**:
- `fileName`: `={{ $('Parse Playwright Response').first().json.parcel_id.replace(/[^a-zA-Z0-9]/g, '_') }}.png`
- `mimeType`: `image/png`

**Code** (Alternative if Convert to File doesn't work):
```javascript
const screenshot = $('Parse Playwright Response').first().json.screenshot;
const parcelId = $('Parse Playwright Response').first().json.parcel_id;

if (!screenshot) {
  throw new Error('No screenshot data');
}

const buffer = Buffer.from(screenshot, 'base64');

return {
  binary: {
    data: {
      data: buffer,
      mimeType: 'image/png',
      fileName: `${parcelId.replace(/[^a-zA-Z0-9]/g, '_')}.png`
    }
  },
  json: {
    property_id: $('Parse Playwright Response').first().json.property_id,
    parcel_id: parcelId
  }
};
```

### 13. Upload Screenshot to Supabase
**Type**: HTTP Request  
**Method**: POST  
**URL**: `https://oiiwlzobizftprqspbzt.supabase.co/storage/v1/object/screenshots/{{ $('Parse Playwright Response').first().json.parcel_id.replace(/[^a-zA-Z0-9]/g, '_') }}.png`  
**Headers**:
- `Authorization`: `Bearer <supabase-service-key>`
- `Content-Type`: `image/png`
- `x-upsert`: `true`

**Body**: Binary data from previous node

### 14. Update Screenshot URL
**Type**: HTTP Request  
**Method**: PATCH  
**URL**: `https://oiiwlzobizftprqspbzt.supabase.co/rest/v1/regrid_data?property_id=eq.{{ $('Parse Playwright Response').first().json.property_id }}`  
**Body**:
```json
{
  "screenshot_url": "https://oiiwlzobizftprqspbzt.supabase.co/storage/v1/object/public/screenshots/{{ $('Parse Playwright Response').first().json.parcel_id.replace(/[^a-zA-Z0-9]/g, '_') }}.png"
}
```

### 15. Update Job Progress
**Type**: HTTP Request  
**Method**: POST  
**URL**: `https://oiiwlzobizftprqspbzt.supabase.co/rest/v1/rpc/update_batch_progress`  
**Body**:
```json
{
  "p_job_id": "{{ $('Extract Job Data').first().json.job_id }}",
  "p_last_item_id": "{{ $('Parse Playwright Response').first().json.property_id }}",
  "p_items_processed": 1,
  "p_items_failed": 0,
  "p_error_message": null
}
```

## Error Handling

### Add Error Handling Node
**Type**: Code Node (after Parse Playwright Response)  
**Name**: "Handle Errors"

```javascript
const input = $input.first().json;

// Check if scraping failed
if (!input.success) {
  // Update batch progress with error
  return {
    json: {
      error: true,
      error_message: input.error || 'Unknown error',
      property_id: input.property_id,
      parcel_id: input.parcel_id
    }
  };
}

// Success - continue normal flow
return input;
```

### Update Progress on Error
**Type**: HTTP Request  
**Method**: POST  
**URL**: `https://oiiwlzobizftprqspbzt.supabase.co/rest/v1/rpc/update_batch_progress`  
**Body**:
```json
{
  "p_job_id": "{{ $('Extract Job Data').first().json.job_id }}",
  "p_last_item_id": "{{ $json.property_id }}",
  "p_items_processed": 0,
  "p_items_failed": 1,
  "p_error_message": "{{ $json.error_message }}"
}
```

## pwrunner Service Configuration

The pwrunner service at `http://n8n-production-pwrunner-1:3001/run-regrid` should:

1. Accept query parameters: `parcel`, `county`, `state`, `property_id`
2. Execute: `node /app/scripts/regrid-screenshot-v15.js "$parcel" "$county" "$state" "$property_id"`
3. Return the JSON output from the script

### Example pwrunner endpoint handler:
```javascript
app.get('/run-regrid', async (req, res) => {
  const { parcel, county, state, property_id } = req.query;
  
  const { exec } = require('child_process');
  const scriptPath = '/app/scripts/regrid-screenshot-v15.js';
  
  exec(`node ${scriptPath} "${parcel}" "${county}" "${state}" "${property_id}"`, 
    (error, stdout, stderr) => {
      if (error) {
        return res.json({ success: false, error: error.message });
      }
      
      try {
        const result = JSON.parse(stdout);
        res.json(result);
      } catch (e) {
        res.json({ success: false, error: 'Failed to parse script output' });
      }
    }
  );
});
```

## Data Flow Example

### Input (from get_next_batch):
```json
{
  "item_id": "3b6aa1b0-988f-43cc-a7d2-ea4f7f82c795",
  "parcel_id": "01.05-16..-094.00-000",
  "county_name": "Blair",
  "state_code": "PA",
  "property_address": "1810 12TH AVE"
}
```

### Output (from v15 script):
```json
{
  "success": true,
  "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...",
  "property_id": "3b6aa1b0-988f-43cc-a7d2-ea4f7f82c795",
  "parcel_id": "01.05-16..-094.00-000",
  "regrid_data": {
    "regrid_id": "2daed71f-bd97-4837-9287-f8ce8f0313ca",
    "ll_uuid": "2daed71f-bd97-4837-9287-f8ce8f0313ca",
    "property_type": "L1",
    "property_class": "Mixed",
    "land_use": "100",
    "zoning": "Mixed Use",
    "lot_size_acres": 0.069,
    "assessed_value": 3000.00,
    "latitude": 40.512463,
    "longitude": -78.409138,
    "water_service": "None",
    "sewer_service": "Unknown",
    "data_quality_score": 0.875
  },
  "panel_closed": true,
  "scraped_at": "2026-01-12T03:00:00.000Z"
}
```

### Stored in regrid_data table:
```json
{
  "property_id": "3b6aa1b0-988f-43cc-a7d2-ea4f7f82c795",
  "regrid_id": "2daed71f-bd97-4837-9287-f8ce8f0313ca",
  "ll_uuid": "2daed71f-bd97-4837-9287-f8ce8f0313ca",
  "property_type": "L1",
  "property_class": "Mixed",
  "land_use": "100",
  "zoning": "Mixed Use",
  "lot_size_acres": 0.069,
  "assessed_value": 3000.00,
  "assessed_land_value": 3000.00,
  "assessed_improvement_value": 0.00,
  "latitude": 40.512463,
  "longitude": -78.409138,
  "elevation_ft": 371.4,
  "water_service": "None",
  "sewer_service": "Unknown",
  "screenshot_url": "https://oiiwlzobizftprqspbzt.supabase.co/storage/v1/object/public/screenshots/01_05_16___094_00_000.png",
  "data_quality_score": 0.875,
  "scraped_at": "2026-01-12T03:00:00.000Z"
}
```

## Key Differences from Current Workflow

1. **Script Call**: Uses v15 script which returns both screenshot AND regrid_data
2. **Data Extraction**: No need for separate data extraction - script does it all
3. **Response Parsing**: Must handle the new response format with `regrid_data` object
4. **Database Update**: Updates `regrid_data` table with all scraped fields
5. **Error Handling**: Should handle script failures gracefully

## Testing Checklist

- [ ] pwrunner service responds to `/run-regrid` endpoint
- [ ] Script executes correctly with test parameters
- [ ] Response parsing handles all response formats
- [ ] Database update works with all fields
- [ ] Screenshot uploads successfully
- [ ] Screenshot URL updates correctly
- [ ] Batch progress updates correctly
- [ ] Error handling works for failed scrapes
