# Regrid Browser MCP Test - Real Data Extraction

## Test Date: 2026-01-12

## ✅ Test Results - SUCCESS!

### Test Parcel
- **Parcel ID**: `01.05-16..-094.00-000`
- **Address**: `1810 12TH AVE`
- **City**: `Altoona, PA 16601`
- **Property ID** (from database): `3b6aa1b0-988f-43cc-a7d2-ea4f7f82c795`

### Workflow Tested
1. ✅ Navigated to `https://app.regrid.com/`
2. ✅ Logged in successfully
3. ✅ Navigated to Blair County, PA map
4. ✅ Searched for parcel `01.05-16..-094.00-000`
5. ✅ Found parcel in search results
6. ✅ Clicked to open Property Details panel
7. ✅ Extracted property data
8. ✅ Captured full-page screenshot

## Extracted Data

### Core Property Information
```json
{
  "parcel_id": "01.05-16..-094.00-000",
  "address": "1810 12TH AVE",
  "city": "Altoona",
  "zip_code": "16601",
  "regrid_uuid": "2daed71f-bd97-4837-9287-f8ce8f0313ca",
  "owner_name": "ACKER ROBERT A"
}
```

### Property Details
- **Lot Size**: `0.07 Acres` (0.069 Deed Acres)
- **Property Type**: `L1`
- **Zoning Type**: `Mixed`
- **Zoning Subtype**: `Mixed Use`
- **Land Use Code**: `100` (Parcel Use Code)
- **Land Use Ownership**: `1100 : Private persons and private joint ownership`

### Location Data
- **Latitude**: `40.512463`
- **Longitude**: `-78.409138`
- **Centroid Coordinates**: `40.512463, -78.409138`
- **Neighborhood Code**: `5024`
- **Census Tract**: `42013100400`
- **Census Block**: `420131004001014`

### Valuation Data
- **Total Parcel Value**: `$3,000.00` (MARKET)
- **Land Value**: `$3,000.00`
- **Improvement Value**: `$0.00`
- **Last Sale Price**: `$4,000.00`
- **Last Sale Date**: `2000-03-10`

### Structure Details
- **Regrid Calculated Building Count**: `0`
- **Regrid Calculated Total Address Count**: `0`
- **Note**: No structures detected

### Additional Information
- **Land Description**: `25 X 120`
- **Terrain**: `Steep`
- **Sewer**: `Unknown`
- **Water**: `None`
- **Road**: `Paved`
- **Gas Availability**: `GWS`
- **FEMA Flood Zone**: `X` (AREA OF MINIMAL FLOOD HAZARD)
- **FEMA Risk Rating**: `Very Low`
- **InSite Score**: `Low`

### Owner Information
- **Owner Name (Assessor)**: `ACKER ROBERT A`
- **Mailing Address**: `423 Allegheny St, Ste 143, Hollidaysburg, PA 16648-2047`

### Legal/Plat Data
- **Book**: `1456`
- **Page**: `159`
- **Lot**: `94`
- **District Number**: `01.`
- **Ward Number**: `05`
- **Map Number**: `16..`
- **Leasehold Number**: `000`

## Screenshot Captured
- **File**: `.playwright-mcp/regrid-property-details-1810-12th-ave.png`
- **Type**: Full page screenshot
- **Contains**: Map view with highlighted parcel + Property Details panel

## Data Mapping to `regrid_data` Table

The extracted data maps to the following `regrid_data` table fields:

| Field | Value | Source |
|-------|-------|--------|
| `regrid_id` | `2daed71f-bd97-4837-9287-f8ce8f0313ca` | Regrid UUID |
| `ll_uuid` | `2daed71f-bd97-4837-9287-f8ce8f0313ca` | Regrid UUID (same) |
| `property_type` | `L1` | Property Type |
| `property_class` | `Mixed` | Zoning Type |
| `land_use` | `100` | Parcel Use Code |
| `zoning` | `Mixed Use` | Zoning Subtype |
| `lot_size_acres` | `0.069` | Deed Acres |
| `lot_size_sqft` | `~3,006` | Calculated (0.069 * 43560) |
| `lot_dimensions` | `25 X 120` | Land Description |
| `building_sqft` | `0` | No structure detected |
| `year_built` | `null` | Not available |
| `bedrooms` | `null` | Not available |
| `bathrooms` | `null` | Not available |
| `assessed_value` | `3000.00` | Total Parcel Value |
| `assessed_land_value` | `3000.00` | Land Value |
| `assessed_improvement_value` | `0.00` | Improvement Value |
| `market_value` | `null` | Not explicitly shown |
| `latitude` | `40.512463` | Latitude |
| `longitude` | `-78.409138` | Longitude |
| `elevation_ft` | `371.4` | Highest Parcel Elevation |
| `water_service` | `None` | Water |
| `sewer_service` | `Unknown` | Sewer |
| `utilities` | `GWS` | Gas Availability |
| `data_quality_score` | `0.875` | Estimated (based on completeness) |

## Browser MCP Capabilities Verified

✅ **Navigation**: Successfully navigated to Regrid and logged in
✅ **Search**: Found parcel by ID in search results
✅ **Interaction**: Clicked to open Property Details panel
✅ **Data Extraction**: Extracted structured property data
✅ **Screenshot**: Captured full-page screenshot with property details

## Next Steps

1. ✅ Browser MCP test successful with real data
2. ⏳ Update `regrid-screenshot-v15.js` script with improved data extraction logic
3. ⏳ Deploy script to VPS pwrunner container
4. ⏳ Test script with real parcel IDs from database
5. ⏳ Update n8n workflow to use scraped data
6. ⏳ Store extracted data in `regrid_data` table

## Notes

- The Property Details panel contains extensive data across multiple tabs
- Some fields require scrolling or expanding sections to access
- The script should handle tab navigation and data extraction from all sections
- Screenshot captures both map view and property details panel
- Data extraction works well with text-based parsing from the panel content
