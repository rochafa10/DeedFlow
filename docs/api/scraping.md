# Scraping API

The Scraping API provides endpoints for automated property data enrichment, including Regrid data scraping, aerial screenshot capture, and image uploads.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [POST /api/scrape/regrid](#post-apiscraperregrid)
  - [POST /api/scrape/screenshot](#post-apiscrapescreenshot)
  - [POST /api/upload-screenshot](#post-apiupload-screenshot)
- [Common Use Cases](#common-use-cases)
- [Error Handling](#error-handling)
- [Integration with n8n](#integration-with-n8n)

---

## Overview

The Scraping API automates the process of enriching property records with land data and aerial imagery. These endpoints are primarily called by n8n workflows but can also be used directly by the application.

**Base Paths:**
- `/api/scrape/regrid` - Regrid data scraping
- `/api/scrape/screenshot` - Screenshot capture
- `/api/upload-screenshot` - Direct screenshot upload

**Total Endpoints:** 3

**Authentication:** API key or internal origin validation

**Database Tables:**
- `properties` - Core property data (flags updated)
- `regrid_data` - Land data and screenshots
- `screenshots` (Storage Bucket) - Screenshot images

**Related n8n Workflows:**
- **TDF - Regrid Scraper** - Automated property data enrichment

---

## Authentication

All scraping endpoints use a dual authentication strategy to allow both n8n workflow calls and internal application requests.

### Method 1: API Key (Recommended for n8n)

Send an `x-api-key` header with the internal API key:

```http
POST /api/scrape/regrid HTTP/1.1
x-api-key: tdf-internal-scraper-key
Content-Type: application/json
```

**Configuration:**

The API key is stored in the `INTERNAL_API_KEY` environment variable. If not set, the default value is `tdf-internal-scraper-key`.

### Method 2: Internal Origin (Application Requests)

Requests from the following origins are automatically allowed:

- `localhost` (any port) - Local development
- `127.0.0.1` (any port) - Local development
- `n8n.lfb-investments.com` - n8n workflows
- `taxdeedflow` (any subdomain) - Production app
- Direct API calls (no browser origin) - Server-to-server

**No API key required** if the request comes from an allowed origin.

### Authentication Error Response

```json
{
  "error": "Unauthorized",
  "message": "Invalid API key",
  "status": 401
}
```

---

## Endpoints

### POST /api/scrape/regrid

Scrapes property data from Regrid's public parcel viewer and stores it in the database. Enriches properties with land use, zoning, lot size, building details, assessed values, and coordinates.

**Authentication:** API key or internal origin

**HTTP Method:** `POST`

**URL:** `/api/scrape/regrid`

**Headers:**

```
x-api-key: tdf-internal-scraper-key
Content-Type: application/json
```

**Request Body:**

```json
{
  "property_id": "550e8400-e29b-41d4-a716-446655440000",
  "parcel_id": "12-345-6789",
  "address": "123 Main St, Blair, PA",
  "county": "Blair",
  "state": "PA",
  "job_id": "batch-job-uuid"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `property_id` | UUID | **Yes** | Property record ID |
| `parcel_id` | String | **Yes** | County parcel number |
| `address` | String | No | Property address (helps with search) |
| `county` | String | No | County name |
| `state` | String | No | Two-letter state code |
| `job_id` | UUID | No | Batch job ID for progress tracking |

**Response Format (Success):**

```json
{
  "success": true,
  "property_id": "550e8400-e29b-41d4-a716-446655440000",
  "parcel_id": "12-345-6789",
  "regrid_data": {
    "id": "regrid-uuid",
    "property_id": "550e8400-e29b-41d4-a716-446655440000",
    "regrid_id": "us/pa/blair/12-345-6789",
    "ll_uuid": "ll-uuid-from-regrid",
    "property_type": "Residential",
    "property_class": "Single Family",
    "land_use": "Residential",
    "zoning": "R1",
    "lot_size_sqft": 8750,
    "lot_size_acres": 0.20,
    "lot_dimensions": "70x125",
    "building_sqft": 1850,
    "year_built": 1985,
    "bedrooms": 3,
    "bathrooms": 2,
    "assessed_value": 125000,
    "assessed_land_value": 25000,
    "assessed_improvement_value": 100000,
    "market_value": 145000,
    "latitude": 40.4862,
    "longitude": -78.3947,
    "water_service": "Public",
    "sewer_service": "Public",
    "additional_fields": {
      "tax_district": "Blair Township",
      "school_district": "Hollidaysburg Area SD"
    },
    "scraped_at": "2024-01-23T10:30:00Z",
    "data_quality_score": 85
  },
  "data_quality_score": 85
}
```

**Response Format (Failure):**

```json
{
  "success": false,
  "error": "No data returned",
  "property_id": "550e8400-e29b-41d4-a716-446655440000",
  "parcel_id": "12-345-6789"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Whether scraping succeeded |
| `property_id` | UUID | Property record ID |
| `parcel_id` | String | Parcel number |
| `regrid_data` | Object | Complete Regrid data record (if success) |
| `data_quality_score` | Number | Quality score (0-100, higher is better) |
| `error` | String | Error message (if failure) |

**Regrid Data Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `regrid_id` | String | Regrid's unique parcel identifier |
| `ll_uuid` | String | LandLens UUID from Regrid |
| `property_type` | String | Property classification |
| `property_class` | String | Detailed property class |
| `land_use` | String | Current land use |
| `zoning` | String | Zoning designation |
| `lot_size_sqft` | Number | Lot size in square feet |
| `lot_size_acres` | Number | Lot size in acres |
| `lot_dimensions` | String | Lot dimensions (e.g., "70x125") |
| `building_sqft` | Number | Building square footage |
| `year_built` | Number | Year constructed |
| `bedrooms` | Number | Number of bedrooms |
| `bathrooms` | Number | Number of bathrooms |
| `assessed_value` | Number | Total assessed value |
| `assessed_land_value` | Number | Land value only |
| `assessed_improvement_value` | Number | Building/improvement value |
| `market_value` | Number | Estimated market value |
| `latitude` | Number | Geographic latitude |
| `longitude` | Number | Geographic longitude |
| `water_service` | String | Water service type |
| `sewer_service` | String | Sewer service type |
| `additional_fields` | Object | Additional metadata |
| `scraped_at` | String | ISO timestamp of scrape |
| `data_quality_score` | Number | Quality score (0-100) |

**Side Effects:**

1. Upserts record in `regrid_data` table (keyed by `property_id`)
2. Sets `properties.has_regrid_data = true`
3. Updates batch job progress if `job_id` provided

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success - Data scraped and stored |
| 400 | Validation error - Missing required fields |
| 401 | Unauthorized - Invalid API key |
| 422 | Scraping failed - No data returned |
| 500 | Server error or database error |

**Request Example (cURL):**

```bash
curl -X POST https://your-domain.com/api/scrape/regrid \
  -H "x-api-key: tdf-internal-scraper-key" \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "550e8400-e29b-41d4-a716-446655440000",
    "parcel_id": "12-345-6789",
    "address": "123 Main St, Blair, PA",
    "county": "Blair",
    "state": "PA"
  }'
```

**Request Example (JavaScript):**

```javascript
const response = await fetch('/api/scrape/regrid', {
  method: 'POST',
  headers: {
    'x-api-key': 'tdf-internal-scraper-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    property_id: '550e8400-e29b-41d4-a716-446655440000',
    parcel_id: '12-345-6789',
    address: '123 Main St, Blair, PA',
    county: 'Blair',
    state: 'PA'
  })
})

const result = await response.json()

if (result.success) {
  console.log('Regrid data scraped:', result.regrid_data)
} else {
  console.error('Scraping failed:', result.error)
}
```

**Request Example (n8n HTTP Request Node):**

```json
{
  "method": "POST",
  "url": "https://your-domain.com/api/scrape/regrid",
  "headers": {
    "x-api-key": "={{$env.INTERNAL_API_KEY}}",
    "Content-Type": "application/json"
  },
  "body": {
    "property_id": "={{$json.property_id}}",
    "parcel_id": "={{$json.parcel_id}}",
    "address": "={{$json.property_address}}",
    "county": "={{$json.county}}",
    "state": "={{$json.state}}",
    "job_id": "={{$json.job_id}}"
  }
}
```

---

### POST /api/scrape/screenshot

Captures an aerial screenshot of a Regrid property page using Playwright and uploads it to Supabase Storage. Also extracts property data visible on the Regrid page and updates the database.

**Authentication:** API key or internal origin

**HTTP Method:** `POST`

**URL:** `/api/scrape/screenshot`

**Headers:**

```
x-api-key: tdf-internal-scraper-key
Content-Type: application/json
```

**Request Body:**

```json
{
  "property_id": "550e8400-e29b-41d4-a716-446655440000",
  "regrid_url": "https://app.regrid.com/us/pa/blair/12-345-6789",
  "parcel_id": "12-345-6789",
  "property_address": "123 Main St, Blair, PA"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `property_id` | UUID | **Yes** | Property record ID |
| `regrid_url` | String | **Yes** | Regrid parcel viewer URL |
| `parcel_id` | String | No | Parcel number (used for filename) |
| `property_address` | String | No | Property address (helps with navigation) |

**Response Format (Success):**

```json
{
  "success": true,
  "property_id": "550e8400-e29b-41d4-a716-446655440000",
  "screenshot_url": "https://your-supabase-url.supabase.co/storage/v1/object/public/screenshots/12_345_6789.jpg",
  "fileName": "12_345_6789.jpg",
  "extracted_data": {
    "property_type": "Residential",
    "lot_size_sqft": 8750,
    "lot_size_acres": 0.20,
    "building_sqft": 1850,
    "year_built": 1985,
    "assessed_value": 125000,
    "latitude": 40.4862,
    "longitude": -78.3947
  }
}
```

**Response Format (Failure):**

```json
{
  "success": false,
  "error": "Failed to capture screenshot",
  "property_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Whether screenshot capture succeeded |
| `property_id` | UUID | Property record ID |
| `screenshot_url` | String | Public URL of uploaded screenshot (if success) |
| `fileName` | String | Storage filename (if success) |
| `extracted_data` | Object | Property data extracted from Regrid page (if available) |
| `error` | String | Error message (if failure) |

**Screenshot Filename Format:**

Parcel IDs are sanitized for storage:
- `.` (period) → `_` (underscore)
- `-` (hyphen) → `_` (underscore)
- Extension: `.jpg`

**Examples:**
- `12-345-6789` → `12_345_6789.jpg`
- `45.23-1-12.5` → `45_23_1_12_5.jpg`

**Side Effects:**

1. Captures screenshot using Playwright (headless browser)
2. Uploads JPEG image to `screenshots` storage bucket (upsert)
3. Upserts `regrid_data` record with `screenshot_url`
4. Optionally upserts extracted property data (if available)
5. Sets `properties.has_screenshot = true`

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success - Screenshot captured and uploaded |
| 400 | Validation error - Missing required fields |
| 401 | Unauthorized - Invalid API key |
| 422 | Screenshot capture failed |
| 500 | Server error, database error, or storage error |

**Request Example (cURL):**

```bash
curl -X POST https://your-domain.com/api/scrape/screenshot \
  -H "x-api-key: tdf-internal-scraper-key" \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "550e8400-e29b-41d4-a716-446655440000",
    "regrid_url": "https://app.regrid.com/us/pa/blair/12-345-6789",
    "parcel_id": "12-345-6789",
    "property_address": "123 Main St, Blair, PA"
  }'
```

**Request Example (JavaScript):**

```javascript
const response = await fetch('/api/scrape/screenshot', {
  method: 'POST',
  headers: {
    'x-api-key': 'tdf-internal-scraper-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    property_id: '550e8400-e29b-41d4-a716-446655440000',
    regrid_url: 'https://app.regrid.com/us/pa/blair/12-345-6789',
    parcel_id: '12-345-6789',
    property_address: '123 Main St, Blair, PA'
  })
})

const result = await response.json()

if (result.success) {
  console.log('Screenshot URL:', result.screenshot_url)
  if (result.extracted_data) {
    console.log('Extracted data:', result.extracted_data)
  }
} else {
  console.error('Screenshot failed:', result.error)
}
```

**Request Example (n8n HTTP Request Node):**

```json
{
  "method": "POST",
  "url": "https://your-domain.com/api/scrape/screenshot",
  "headers": {
    "x-api-key": "={{$env.INTERNAL_API_KEY}}",
    "Content-Type": "application/json"
  },
  "body": {
    "property_id": "={{$json.property_id}}",
    "regrid_url": "={{$json.regrid_url}}",
    "parcel_id": "={{$json.parcel_id}}",
    "property_address": "={{$json.property_address}}"
  }
}
```

**Implementation Details:**

This endpoint uses **Playwright** to:
1. Navigate to the Regrid parcel viewer URL
2. Wait for the map and property details to load
3. Extract visible property data from the page
4. Capture a screenshot of the aerial imagery
5. Return both the screenshot and extracted data

If navigation fails, the endpoint attempts search-based navigation using the property address and coordinates.

---

### POST /api/upload-screenshot

Uploads a base64-encoded JPEG screenshot directly to Supabase Storage and updates the database. Used when screenshots are captured externally (e.g., by n8n pwrunner container).

**Authentication:** None required (internal endpoint)

**HTTP Method:** `POST`

**URL:** `/api/upload-screenshot`

**Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "property_id": "550e8400-e29b-41d4-a716-446655440000",
  "parcel_id": "12-345-6789",
  "screenshot_base64": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U..."
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `property_id` | UUID | **Yes** | Property record ID |
| `parcel_id` | String | No | Parcel number (used for filename) |
| `screenshot_base64` | String | **Yes** | Base64-encoded JPEG image |

**Response Format (Success):**

```json
{
  "success": true,
  "property_id": "550e8400-e29b-41d4-a716-446655440000",
  "screenshot_url": "https://your-supabase-url.supabase.co/storage/v1/object/public/screenshots/12_345_6789.jpg",
  "fileName": "12_345_6789.jpg"
}
```

**Response Format (Failure):**

```json
{
  "success": false,
  "error": "Storage error: Bucket not found"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Whether upload succeeded |
| `property_id` | UUID | Property record ID |
| `screenshot_url` | String | Public URL of uploaded screenshot (if success) |
| `fileName` | String | Storage filename (if success) |
| `error` | String | Error message (if failure) |

**Screenshot Filename Format:**

Same as `/api/scrape/screenshot`:
- `.` (period) → `_` (underscore)
- `-` (hyphen) → `_` (underscore)
- Extension: `.jpg`

**Side Effects:**

1. Decodes base64 image to buffer
2. Uploads JPEG to `screenshots` storage bucket (upsert)
3. Updates `regrid_data.screenshot_url` (or inserts if no record exists)
4. Sets `properties.has_screenshot = true`

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success - Screenshot uploaded |
| 400 | Validation error - Missing required fields |
| 500 | Server error, database error, or storage error |

**Request Example (cURL):**

```bash
# First, base64 encode your image
IMAGE_BASE64=$(base64 -w 0 screenshot.jpg)

curl -X POST https://your-domain.com/api/upload-screenshot \
  -H "Content-Type: application/json" \
  -d "{
    \"property_id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"parcel_id\": \"12-345-6789\",
    \"screenshot_base64\": \"$IMAGE_BASE64\"
  }"
```

**Request Example (JavaScript):**

```javascript
// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const base64 = reader.result.split(',')[1] // Remove data:image/jpeg;base64, prefix
      resolve(base64)
    }
    reader.onerror = reject
  })
}

// Upload screenshot
const file = document.querySelector('input[type="file"]').files[0]
const base64 = await fileToBase64(file)

const response = await fetch('/api/upload-screenshot', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    property_id: '550e8400-e29b-41d4-a716-446655440000',
    parcel_id: '12-345-6789',
    screenshot_base64: base64
  })
})

const result = await response.json()

if (result.success) {
  console.log('Screenshot uploaded:', result.screenshot_url)
} else {
  console.error('Upload failed:', result.error)
}
```

**Request Example (n8n HTTP Request Node):**

```json
{
  "method": "POST",
  "url": "https://your-domain.com/api/upload-screenshot",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "property_id": "={{$json.property_id}}",
    "parcel_id": "={{$json.parcel_id}}",
    "screenshot_base64": "={{$binary.data.data}}"
  }
}
```

**Request Example (Python):**

```python
import base64
import requests

# Read and encode image
with open('screenshot.jpg', 'rb') as f:
    image_data = base64.b64encode(f.read()).decode('utf-8')

# Upload to API
response = requests.post(
    'https://your-domain.com/api/upload-screenshot',
    json={
        'property_id': '550e8400-e29b-41d4-a716-446655440000',
        'parcel_id': '12-345-6789',
        'screenshot_base64': image_data
    }
)

result = response.json()
if result['success']:
    print(f"Screenshot uploaded: {result['screenshot_url']}")
else:
    print(f"Upload failed: {result['error']}")
```

---

## Common Use Cases

### Use Case 1: Enrich Single Property

Scrape Regrid data and capture a screenshot for a single property:

```javascript
// Step 1: Scrape Regrid data
const regridResponse = await fetch('/api/scrape/regrid', {
  method: 'POST',
  headers: {
    'x-api-key': 'tdf-internal-scraper-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    property_id: propertyId,
    parcel_id: parcelId,
    address: address,
    county: county,
    state: state
  })
})

const regridResult = await regridResponse.json()

if (regridResult.success) {
  // Step 2: Capture screenshot
  const screenshotResponse = await fetch('/api/scrape/screenshot', {
    method: 'POST',
    headers: {
      'x-api-key': 'tdf-internal-scraper-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      property_id: propertyId,
      regrid_url: `https://app.regrid.com/us/${state.toLowerCase()}/${county.toLowerCase()}/${parcelId}`,
      parcel_id: parcelId,
      property_address: address
    })
  })

  const screenshotResult = await screenshotResponse.json()

  if (screenshotResult.success) {
    console.log('Property fully enriched!')
    console.log('Regrid data:', regridResult.regrid_data)
    console.log('Screenshot:', screenshotResult.screenshot_url)
  }
}
```

### Use Case 2: Batch Enrichment with n8n

Process multiple properties in parallel using n8n workflow:

**n8n Workflow Nodes:**

1. **Trigger:** Schedule (hourly) or Manual
2. **Supabase Node:** Get properties needing enrichment
   ```sql
   SELECT id, parcel_id, property_address, county_id
   FROM properties
   WHERE has_regrid_data = false
   LIMIT 50
   ```
3. **Split Into Batches:** Process 10 at a time
4. **HTTP Request (Regrid):** Call `/api/scrape/regrid` for each property
5. **HTTP Request (Screenshot):** Call `/api/scrape/screenshot` for each property
6. **Set Node:** Track success/failure
7. **Supabase Node:** Update batch job status

### Use Case 3: External Screenshot Upload

Capture screenshots using external service (pwrunner container) and upload:

**Step 1: Capture with pwrunner (n8n workflow)**
```javascript
// Execute Command node in n8n
const command = `docker exec n8n-production-pwrunner-1 node /app/scripts/regrid-screenshot.js "${parcelId}" "${regridUrl}"`
// Returns base64 screenshot
```

**Step 2: Upload to API**
```javascript
// HTTP Request node in n8n
{
  "method": "POST",
  "url": "https://your-domain.com/api/upload-screenshot",
  "body": {
    "property_id": "={{$json.property_id}}",
    "parcel_id": "={{$json.parcel_id}}",
    "screenshot_base64": "={{$json.screenshot_base64}}"
  }
}
```

### Use Case 4: Check Enrichment Status

Query database to check which properties have been enriched:

```sql
-- Properties with Regrid data
SELECT * FROM properties
WHERE has_regrid_data = true;

-- Properties with screenshots
SELECT * FROM properties
WHERE has_screenshot = true;

-- Properties fully enriched
SELECT * FROM properties
WHERE has_regrid_data = true
  AND has_screenshot = true;

-- Properties needing enrichment
SELECT * FROM properties
WHERE has_regrid_data = false
   OR has_screenshot = false;
```

---

## Error Handling

### Common Errors

#### 401 Unauthorized

**Cause:** Invalid or missing API key

**Response:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key",
  "status": 401
}
```

**Solution:**
- Include `x-api-key` header with correct value
- OR ensure request originates from allowed domain

#### 400 Validation Error

**Cause:** Missing required fields

**Response:**
```json
{
  "error": "Validation error",
  "message": "property_id and parcel_id are required"
}
```

**Solution:** Include all required fields in request body

#### 422 Processing Failed

**Cause:** Scraping or screenshot capture failed

**Response:**
```json
{
  "success": false,
  "error": "No data returned",
  "property_id": "550e8400-e29b-41d4-a716-446655440000",
  "parcel_id": "12-345-6789"
}
```

**Possible Reasons:**
- Parcel not found on Regrid
- Network timeout
- Playwright navigation failed
- Invalid Regrid URL

**Solution:**
- Verify parcel ID is correct
- Check Regrid URL manually
- Retry with correct parameters

#### 500 Server Error

**Cause:** Database error, storage error, or unexpected exception

**Response:**
```json
{
  "success": false,
  "error": "Server error",
  "message": "Database connection failed"
}
```

**Solution:**
- Check server logs for details
- Verify Supabase connection
- Verify storage bucket exists

### Error Handling Best Practices

```javascript
async function enrichProperty(propertyId, parcelId, address, county, state) {
  try {
    // Scrape Regrid data
    const response = await fetch('/api/scrape/regrid', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.INTERNAL_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        property_id: propertyId,
        parcel_id: parcelId,
        address,
        county,
        state
      })
    })

    if (!response.ok) {
      const error = await response.json()

      if (response.status === 401) {
        throw new Error('Authentication failed. Check API key.')
      } else if (response.status === 422) {
        console.warn(`Scraping failed for ${parcelId}: ${error.error}`)
        return { success: false, error: error.error }
      } else {
        throw new Error(`API error: ${error.message}`)
      }
    }

    const result = await response.json()

    if (!result.success) {
      console.warn(`Scraping failed for ${parcelId}:`, result.error)
      return result
    }

    console.log(`Successfully enriched property ${parcelId}`)
    console.log(`Data quality score: ${result.data_quality_score}`)

    return result

  } catch (error) {
    console.error('Enrichment error:', error)
    throw error
  }
}
```

---

## Integration with n8n

The Scraping API is designed to integrate seamlessly with n8n workflows for automated property enrichment.

### n8n Workflow: TDF - Regrid Scraper

**Purpose:** Automatically enrich properties with Regrid data and screenshots

**Trigger:** Schedule (hourly) or Manual

**Workflow Steps:**

1. **Get Properties**
   - Query Supabase for properties needing enrichment
   - Limit to 50 properties per run

2. **Scrape Regrid Data**
   - HTTP Request to `/api/scrape/regrid`
   - Store results in database

3. **Capture Screenshots**
   - HTTP Request to `/api/scrape/screenshot`
   - OR use pwrunner container for better performance

4. **Update Batch Status**
   - Track success/failure rates
   - Log errors for review

5. **Notify on Completion**
   - Send summary email or Slack message

### n8n Node Configuration

**HTTP Request Node (Regrid Scraping):**

```json
{
  "method": "POST",
  "url": "https://your-domain.com/api/scrape/regrid",
  "authentication": "headerAuth",
  "headerAuth": {
    "name": "x-api-key",
    "value": "={{$env.INTERNAL_API_KEY}}"
  },
  "sendBody": true,
  "bodyParameters": {
    "parameters": [
      {
        "name": "property_id",
        "value": "={{$json.id}}"
      },
      {
        "name": "parcel_id",
        "value": "={{$json.parcel_id}}"
      },
      {
        "name": "address",
        "value": "={{$json.property_address}}"
      },
      {
        "name": "county",
        "value": "={{$json.counties.county_name}}"
      },
      {
        "name": "state",
        "value": "={{$json.counties.state_code}}"
      }
    ]
  },
  "options": {
    "timeout": 30000,
    "retry": {
      "enabled": true,
      "maxAttempts": 3,
      "waitBetween": 5000
    }
  }
}
```

**HTTP Request Node (Screenshot Capture):**

```json
{
  "method": "POST",
  "url": "https://your-domain.com/api/scrape/screenshot",
  "authentication": "headerAuth",
  "headerAuth": {
    "name": "x-api-key",
    "value": "={{$env.INTERNAL_API_KEY}}"
  },
  "sendBody": true,
  "bodyParameters": {
    "parameters": [
      {
        "name": "property_id",
        "value": "={{$json.id}}"
      },
      {
        "name": "regrid_url",
        "value": "https://app.regrid.com/us/={{$json.counties.state_code.toLowerCase()}}/={{$json.counties.county_name.toLowerCase()}}/={{$json.parcel_id}}"
      },
      {
        "name": "parcel_id",
        "value": "={{$json.parcel_id}}"
      },
      {
        "name": "property_address",
        "value": "={{$json.property_address}}"
      }
    ]
  },
  "options": {
    "timeout": 60000,
    "retry": {
      "enabled": true,
      "maxAttempts": 2,
      "waitBetween": 10000
    }
  }
}
```

### Environment Variables

Set these environment variables in your n8n instance:

```bash
# API authentication
INTERNAL_API_KEY=tdf-internal-scraper-key

# Application URL
APP_URL=https://your-domain.com

# Supabase (for direct queries)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Performance Recommendations

1. **Batch Size:** Process 10-50 properties per workflow execution
2. **Timeouts:** Set 30s for Regrid scraping, 60s for screenshots
3. **Retries:** Enable retries with exponential backoff
4. **Rate Limiting:** Add 1-2 second delay between requests
5. **Parallel Processing:** Use n8n's SplitInBatches node for parallel execution
6. **Error Handling:** Always catch and log errors for manual review

---

## Related Documentation

- [Properties API](./properties.md) - Property management endpoints
- [Authentication](./authentication.md) - API authentication guide
- [Batch Jobs API](./batch-jobs.md) - Batch processing endpoints
- [Counties API](./counties.md) - County data management

---

## Quick Reference

### API Endpoints Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/scrape/regrid` | POST | Scrape Regrid property data | Yes (API key) |
| `/api/scrape/screenshot` | POST | Capture aerial screenshot | Yes (API key) |
| `/api/upload-screenshot` | POST | Upload base64 screenshot | No |

### Required Headers

```http
x-api-key: tdf-internal-scraper-key
Content-Type: application/json
```

### Environment Variables

```bash
INTERNAL_API_KEY=tdf-internal-scraper-key           # API authentication key
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co   # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key    # Service role key for storage
```

### Storage Configuration

**Bucket Name:** `screenshots`

**Bucket Settings:**
- Public: Yes (for direct image access)
- File size limit: 10MB
- Allowed MIME types: `image/jpeg`, `image/jpg`

**Public URL Format:**
```
https://your-supabase-url.supabase.co/storage/v1/object/public/screenshots/{filename}
```
