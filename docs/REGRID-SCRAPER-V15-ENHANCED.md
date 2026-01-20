# Regrid Scraper v15 - Enhanced with Data Extraction

## Overview

The enhanced `regrid-screenshot-v15.js` script now:
1. ✅ **Opens Regrid app** and logs in
2. ✅ **Searches for parcel** by ID
3. ✅ **Opens Property Details panel**
4. ✅ **Scrapes property data** from the panel (NEW!)
5. ✅ **Closes the panel**
6. ✅ **Takes screenshot**
7. ✅ **Returns both data and screenshot**

## What Data is Scraped

The script extracts the following fields from the Property Details panel:

- **Identifiers**: `regrid_id`, `ll_uuid`
- **Property Info**: `property_type`, `property_class`, `land_use`, `zoning`
- **Lot Info**: `lot_size_sqft`, `lot_size_acres`, `lot_dimensions`
- **Building Info**: `building_sqft`, `year_built`, `bedrooms`, `bathrooms`
- **Valuation**: `assessed_value`, `market_value`
- **Location**: `latitude`, `longitude`
- **Utilities**: `water_service`, `sewer_service`
- **Metadata**: `data_quality_score` (0.0-1.0), `raw_html` (for debugging)

## Usage

```bash
node regrid-screenshot-v15.js <parcel_id> <county> <state> <property_id>
```

### Example

```bash
node regrid-screenshot-v15.js "12345" "blair" "pa" "property-uuid-123"
```

## Output Format

```json
{
  "success": true,
  "screenshot": "base64-encoded-png-image",
  "property_id": "property-uuid-123",
  "parcel_id": "12345",
  "regrid_data": {
    "regrid_id": "parcel-id-from-url",
    "property_type": "Residential",
    "land_use": "Single Family",
    "zoning": "R-1",
    "lot_size_acres": 0.25,
    "lot_size_sqft": 10890,
    "building_sqft": 1500,
    "year_built": 1985,
    "bedrooms": 3,
    "bathrooms": 2.5,
    "assessed_value": 125000,
    "market_value": 150000,
    "latitude": 40.1234567,
    "longitude": -78.1234567,
    "water_service": "Public",
    "sewer_service": "Public",
    "data_quality_score": 0.875,
    "raw_html": "..."
  },
  "panel_closed": true,
  "scraped_at": "2026-01-12T03:00:00.000Z"
}
```

## Testing on VPS

The script should be deployed to the VPS `pwrunner` container:

```bash
# On VPS (via DigitalOcean console)
docker exec -it n8n-production-pwrunner-1 /bin/sh

# Inside container
cd /app/scripts
node regrid-screenshot-v15.js "12345" "blair" "pa" "test-id"
```

## Integration with n8n Workflow

The n8n workflow calls this script via HTTP POST to:
```
http://n8n-production-pwrunner-1:3001/run-regrid
```

The pwrunner service should:
1. Execute the script with provided parameters
2. Return the JSON response (with both screenshot and regrid_data)
3. The workflow then:
   - Stores `regrid_data` in the database
   - Converts screenshot to binary
   - Uploads to Supabase Storage
   - Updates progress

## Data Quality Score

The script calculates a quality score (0.0 to 1.0) based on how many fields were successfully extracted:

- Each of 8 key fields = 0.125 points
- Fields: `property_type`, `land_use`, `lot_size_acres`, `building_sqft`, 
  `year_built`, `assessed_value`, `latitude`, `longitude`
- Maximum score: 1.0 (all fields found)

## Error Handling

If scraping fails:
```json
{
  "success": false,
  "error": "Error message",
  "property_id": "property-uuid-123",
  "parcel_id": "12345"
}
```

## Next Steps

1. ✅ Script enhanced to scrape data
2. ⏳ Deploy to VPS pwrunner container
3. ⏳ Update pwrunner service to use v15 script
4. ⏳ Test end-to-end with n8n workflow
5. ⏳ Verify data is stored correctly in database
