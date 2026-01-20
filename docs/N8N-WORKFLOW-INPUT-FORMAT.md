# n8n Workflow Input Format for Regrid Scraper v15

## Input Data Structure

The workflow receives input from the **"Prepare Regrid URL"** node in the following format:

```json
{
  "property_id": "00dd92f3-05c5-4042-a522-f5fab5a4a526",
  "parcel_id": "14.00-22..-043.00-049",
  "county_name": "Blair",
  "state_code": "PA",
  "property_address": "521 TARA LN",
  "regrid_url": "https://app.regrid.com/us/pa/blair/parcel/14002204300049"
}
```

## Data Flow

### 1. Input Source: "Prepare Regrid URL" Node

This node receives data from `get_next_batch` RPC function, which returns properties with:
- `item_id` → mapped to `property_id`
- `parcel_id` → passed through
- `county_name` → passed through
- `state_code` → passed through
- `property_address` → passed through

### 2. "Run Playwright Screenshot" Node

**HTTP Request Configuration:**
- **Method**: GET
- **URL**: `http://n8n-production-pwrunner-1:3001/run-regrid`
- **Query Parameters** (all required):
  - `parcel`: `={{ $json.parcel_id }}` → `14.00-22..-043.00-049`
  - `county`: `={{ $json.county_name }}` → `Blair`
  - `state`: `={{ $json.state_code }}` → `PA`
  - `property_id`: `={{ $json.property_id }}` → `00dd92f3-05c5-4042-a522-f5fab5a4a526`

**Full URL Example:**
```
http://n8n-production-pwrunner-1:3001/run-regrid?parcel=14.00-22..-043.00-049&county=Blair&state=PA&property_id=00dd92f3-05c5-4042-a522-f5fab5a4a526
```

### 3. Expected Response from v15 Script

The pwrunner service executes:
```bash
node /app/scripts/regrid-screenshot-v15.js "14.00-22..-043.00-049" "Blair" "PA" "00dd92f3-05c5-4042-a522-f5fab5a4a526"
```

And returns JSON:
```json
{
  "success": true,
  "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...",
  "property_id": "00dd92f3-05c5-4042-a522-f5fab5a4a526",
  "parcel_id": "14.00-22..-043.00-049",
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

### 4. "Parse Playwright Response" Node

Extracts and validates:
- `property_id` - Must match input property_id
- `parcel_id` - Must match input parcel_id
- `screenshot` - Base64 encoded PNG image
- `regrid_data` - Complete property data object
- `success` - Boolean indicating success/failure

### 5. Downstream Processing

**Path A: Database Update**
- "Prepare DB Data" → Maps `regrid_data` to database schema
- "Update Database" → Upserts to `regrid_data` table

**Path B: Screenshot Upload**
- "Convert Screenshot to Binary" → Converts base64 to binary
- "Upload Screenshot to Supabase" → Uploads to storage bucket
- "Update Screenshot URL" → Updates `screenshot_url` in database

**Path C: Progress Update**
- "Update Job Progress" → Updates batch job progress

## Important Notes

1. **property_id is Critical**: Must be passed to script and returned in response for proper data linking
2. **All 4 Query Parameters Required**: parcel, county, state, property_id
3. **Response Validation**: "Parse Playwright Response" validates all required fields
4. **Error Handling**: If script fails, `success: false` is returned with `error` message

## Field Mapping

| Input Field | Query Parameter | Script Argument | Response Field | Database Field |
|------------|----------------|----------------|----------------|----------------|
| `property_id` | `property_id` | 4th arg | `property_id` | `property_id` |
| `parcel_id` | `parcel` | 1st arg | `parcel_id` | - |
| `county_name` | `county` | 2nd arg | - | - |
| `state_code` | `state` | 3rd arg | - | - |
| `property_address` | - | - | - | - |
| `regrid_url` | - | - | - | - |

## Example Workflow Execution

```
Input:
{
  "property_id": "00dd92f3-05c5-4042-a522-f5fab5a4a526",
  "parcel_id": "14.00-22..-043.00-049",
  "county_name": "Blair",
  "state_code": "PA",
  "property_address": "521 TARA LN"
}

↓ "Run Playwright Screenshot"

HTTP GET: http://n8n-production-pwrunner-1:3001/run-regrid?parcel=14.00-22..-043.00-049&county=Blair&state=PA&property_id=00dd92f3-05c5-4042-a522-f5fab5a4a526

↓ Script Execution

Response:
{
  "success": true,
  "screenshot": "...",
  "property_id": "00dd92f3-05c5-4042-a522-f5fab5a4a526",
  "parcel_id": "14.00-22..-043.00-049",
  "regrid_data": {...}
}

↓ "Parse Playwright Response"

Validated Data:
{
  "property_id": "00dd92f3-05c5-4042-a522-f5fab5a4a526",
  "parcel_id": "14.00-22..-043.00-049",
  "screenshot": "...",
  "regrid_data": {...}
}
```
