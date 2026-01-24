# Properties API

The Properties API provides endpoints for managing tax auction properties, including CRUD operations, filtering, enrichment data access, and report generation.

## Table of Contents

- [Overview](#overview)
- [Endpoints](#endpoints)
  - [GET /api/properties](#get-apiproperties)
  - [POST /api/properties](#post-apiproperties)
  - [GET /api/properties/[id]](#get-apipropertiesid)
  - [DELETE /api/properties/[id]](#delete-apipropertiesid)
  - [GET /api/properties/with-regrid](#get-apipropertieswith-regrid)
  - [GET /api/properties/[id]/report](#get-apipropertiesidreport)
- [Data Models](#data-models)
- [Common Use Cases](#common-use-cases)

---

## Overview

The Properties API is the core resource for accessing tax auction property data. Properties are automatically extracted from county tax sale documents and enriched with land data from Regrid.

**Base Path:** `/api/properties`

**Total Endpoints:** 6

**Authentication:** Required for all endpoints

**Database Tables:**
- `properties` - Core property data
- `counties` - County information (joined)
- `regrid_data` - Land data and screenshots
- `property_visual_validation` - Visual validation results
- `documents` - Source documents

---

## Endpoints

### GET /api/properties

Returns a paginated list of all properties with county information.

**Authentication:** None required for GET

**HTTP Method:** `GET`

**URL:** `/api/properties`

**Query Parameters:**

*Note: The current implementation returns all properties (limit 100) without pagination support. Pagination is planned for future releases.*

**Request Example:**

```bash
curl -X GET https://your-domain.com/api/properties
```

**Response Format:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "county_id": "county-uuid",
      "parcel_id": "12-345-6789",
      "property_address": "123 Main St, Blair, PA 16601",
      "city": "Blair",
      "state_code": "PA",
      "zip_code": "16601",
      "owner_name": "John Doe",
      "property_type": "Residential",
      "assessed_value": 75000,
      "total_due": 5432.18,
      "minimum_bid": 5432.18,
      "sale_type": "Upset Sale",
      "sale_date": "2024-09-15",
      "auction_status": "scheduled",
      "tax_year": 2023,
      "has_regrid_data": true,
      "has_screenshot": true,
      "visual_validation_status": "approved",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:22:00Z",
      "counties": {
        "county_name": "Blair",
        "state_code": "PA"
      }
    }
  ],
  "count": 845,
  "source": "database"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array of property objects |
| `count` | Number | Total number of properties (exact count from database) |
| `source` | String | Data source (`"database"` or `"mock"`) |

**Property Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique property identifier |
| `county_id` | UUID | County reference |
| `parcel_id` | String | County parcel number |
| `property_address` | String | Full property address |
| `city` | String | City name |
| `state_code` | String | Two-letter state code (e.g., "PA") |
| `zip_code` | String | ZIP code |
| `owner_name` | String | Property owner name |
| `property_type` | String | Property classification |
| `assessed_value` | Number | County assessed value |
| `total_due` | Number | Total amount owed (taxes + fees) |
| `minimum_bid` | Number | Minimum auction bid |
| `sale_type` | String | Sale type ("Upset Sale", "Judicial Sale", etc.) |
| `sale_date` | String | ISO date of auction |
| `auction_status` | String | Current status ("scheduled", "sold", "cancelled") |
| `tax_year` | Number | Tax year in arrears |
| `has_regrid_data` | Boolean | Whether Regrid data is available |
| `has_screenshot` | Boolean | Whether aerial screenshot exists |
| `visual_validation_status` | String | Validation status ("approved", "rejected", "caution", null) |
| `counties` | Object | Joined county information |

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 500 | Database error or server error |

**Error Response Example:**

```json
{
  "error": "Database error",
  "message": "Failed to connect to database"
}
```

---

### POST /api/properties

Creates a new property record. Requires authentication and CSRF validation.

**Authentication:** Required (Bearer token or X-User-Token)

**Authorization:** Admin or Analyst roles only (Viewers cannot create properties)

**CSRF Protection:** Required

**HTTP Method:** `POST`

**URL:** `/api/properties`

**Headers Required:**

```
Authorization: Bearer demo-token
```
OR
```
X-User-Token: {"id":"demo-user-1","email":"demo@taxdeedflow.com","role":"admin"}
```

**Request Body:**

```json
{
  "county_id": "county-uuid",
  "parcel_id": "12-345-6789",
  "property_address": "456 Oak Avenue, Centre County, PA 16801",
  "city": "State College",
  "state_code": "PA",
  "zip_code": "16801",
  "owner_name": "Jane Smith",
  "total_due": 3250.75,
  "sale_type": "Upset Sale",
  "sale_date": "2024-10-15",
  "tax_year": 2023
}
```

**Required Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `county_id` | UUID | Valid county reference |
| `parcel_id` | String | Unique parcel number |
| `total_due` | Number | Amount owed |

**Optional Fields:**

| Field | Type | Default |
|-------|------|---------|
| `property_address` | String | null |
| `city` | String | null |
| `state_code` | String | null |
| `zip_code` | String | null |
| `owner_name` | String | null |
| `sale_type` | String | "Tax Deed" |
| `sale_date` | String | null |
| `tax_year` | Number | Current year |

**Request Example:**

```bash
curl -X POST https://your-domain.com/api/properties \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -d '{
    "county_id": "county-uuid",
    "parcel_id": "12-345-6789",
    "property_address": "456 Oak Avenue",
    "total_due": 3250.75,
    "sale_type": "Upset Sale"
  }'
```

**Success Response (200):**

```json
{
  "data": {
    "id": "new-property-uuid",
    "county_id": "county-uuid",
    "parcel_id": "12-345-6789",
    "property_address": "456 Oak Avenue",
    "total_due": 3250.75,
    "sale_type": "Upset Sale",
    "created_at": "2024-01-23T10:30:00Z",
    "updated_at": "2024-01-23T10:30:00Z"
  },
  "message": "Property created successfully",
  "source": "database"
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Property created successfully |
| 400 | CSRF validation failed or invalid origin |
| 401 | Authentication required |
| 403 | Insufficient permissions (viewer role) |
| 500 | Database error or server error |

**Error Response Examples:**

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**403 Forbidden (Viewer Role):**
```json
{
  "error": "Forbidden",
  "message": "Viewers cannot create properties."
}
```

**400 CSRF Error:**
```json
{
  "error": "CSRF validation failed",
  "message": "Invalid request origin"
}
```

---

### GET /api/properties/[id]

Returns comprehensive data for a single property, including county info, documents, Regrid data, and visual validation results.

**Authentication:** None required

**HTTP Method:** `GET`

**URL:** `/api/properties/{id}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Property unique identifier |

**Request Example:**

```bash
curl -X GET https://your-domain.com/api/properties/550e8400-e29b-41d4-a716-446655440000
```

**Response Format:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "parcelId": "12-345-6789",
    "address": "123 Main St, Blair, PA 16601",
    "city": "",
    "county": "Blair",
    "state": "PA",
    "zipCode": "",
    "totalDue": 5432.18,
    "status": "approved",
    "propertyType": "Residential",
    "lotSize": "0.25 acres",
    "saleType": "Upset Sale",
    "validation": "approved",
    "yearBuilt": 1985,
    "bedrooms": 3,
    "bathrooms": 2,
    "squareFeet": 1450,
    "assessedValue": 75000,
    "taxYear": 2023,
    "saleDate": "Sep 15, 2024",
    "minimumBid": 5432.18,
    "latitude": 40.4862,
    "longitude": -78.3947,
    "ownerName": "John Doe",

    "regridData": {
      "lotSizeAcres": 0.25,
      "lotSizeSqFt": 10890,
      "propertyClass": "Residential",
      "zoning": "R-1",
      "assessedLandValue": 75000,
      "assessedImprovementValue": null,
      "marketValue": 125000,
      "lastSaleDate": null,
      "lastSalePrice": null,
      "ownerName": "John Doe",
      "ownerAddress": null,
      "screenshotUrl": "https://storage.supabase.co/..."
    },

    "validationData": {
      "status": "approved",
      "confidenceScore": 0.92,
      "validatedAt": "2024-01-20T14:22:00Z",
      "validatedBy": "Visual Validator Agent",
      "findings": [
        "Single-family residential structure visible",
        "Clear road access from Main Street",
        "Well-maintained neighborhood"
      ],
      "imagesAnalyzed": 3,
      "recommendation": "Approved for investment - standard residential property",
      "redFlags": [],
      "structurePresent": true,
      "roadAccess": true,
      "landUseObserved": "Residential",
      "lotShape": "Regular"
    },

    "images": [
      {
        "url": "https://storage.supabase.co/...",
        "caption": "Regrid Aerial View",
        "source": "Regrid"
      }
    ],

    "propertyNotes": [],
    "isInWatchlist": false,
    "watchlistData": null,

    "version": 1,
    "lastModifiedAt": "2024-01-20T14:22:00Z",
    "lastModifiedBy": "System",

    "_raw": {
      "property": { /* full database record */ },
      "regridData": { /* full regrid record */ },
      "validationData": { /* full validation record */ }
    }
  },
  "source": "database"
}
```

**Response Object Structure:**

| Section | Description |
|---------|-------------|
| **Core Fields** | Basic property info (address, parcel, amounts) |
| **regridData** | Land data from Regrid (lot size, zoning, market value) |
| **validationData** | Visual validation results (status, findings, red flags) |
| **images** | Property images (aerial screenshots) |
| **propertyNotes** | User notes (future feature) |
| **watchlistData** | Watchlist status (future feature) |
| **_raw** | Complete database records for debugging |

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 404 | Property not found |
| 500 | Database error or server error |

**Error Response Examples:**

**404 Not Found:**
```json
{
  "error": "Property not found"
}
```

**500 Database Error:**
```json
{
  "error": "Database error",
  "message": "Failed to fetch property data"
}
```

---

### DELETE /api/properties/[id]

Deletes a property record. Requires admin role.

**Authentication:** Required (Bearer token or X-User-Token)

**Authorization:** Admin role only

**HTTP Method:** `DELETE`

**URL:** `/api/properties/{id}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Property unique identifier |

**Headers Required:**

```
Authorization: Bearer demo-token
```
OR
```
X-User-Token: {"id":"demo-user-1","email":"demo@taxdeedflow.com","role":"admin"}
```

**Request Example:**

```bash
curl -X DELETE https://your-domain.com/api/properties/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer demo-token"
```

**Success Response (200):**

```json
{
  "message": "Property deleted successfully",
  "source": "database"
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Property deleted successfully |
| 401 | Authentication required |
| 403 | Insufficient permissions (not admin) |
| 404 | Property not found |
| 500 | Database error or server error |

**Error Response Examples:**

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**403 Forbidden (Non-Admin):**
```json
{
  "error": "Forbidden",
  "message": "Only admins can delete properties."
}
```

**404 Not Found:**
```json
{
  "error": "Property not found",
  "message": "No property exists with the specified ID"
}
```

---

### GET /api/properties/with-regrid

Returns a filtered list of properties that have Regrid data available. Used for property selectors in demo and report pages.

**Authentication:** None required

**HTTP Method:** `GET`

**URL:** `/api/properties/with-regrid`

**Query Parameters:** None

**Description:**

This endpoint filters properties where `has_regrid_data = true`, returning only properties that have been enriched with land data and aerial screenshots from Regrid. Results are limited to 100 properties and sorted alphabetically by address.

**Request Example:**

```bash
curl -X GET https://your-domain.com/api/properties/with-regrid
```

**Response Format:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "parcelId": "12-345-6789",
      "address": "123 Main St, Blair, PA 16601",
      "county": "Blair",
      "state": "PA",
      "totalDue": 5432.18,
      "saleType": "Upset Sale"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "parcelId": "45-678-9012",
      "address": "456 Oak Avenue, Centre County, PA 16801",
      "county": "Centre",
      "state": "PA",
      "totalDue": 3250.75,
      "saleType": "Judicial Sale"
    }
  ],
  "count": 42,
  "source": "database"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array of simplified property objects |
| `count` | Number | Number of properties with Regrid data |
| `source` | String | Data source (`"database"` or `"mock"`) |

**Simplified Property Object:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Property identifier |
| `parcelId` | String | Parcel number |
| `address` | String | Full address (or "Address not available") |
| `county` | String | County name |
| `state` | String | State code |
| `totalDue` | Number | Total amount owed (may be null) |
| `saleType` | String | Sale type |

**Use Cases:**

- Property selector dropdowns in UI
- Finding properties ready for report generation
- Identifying properties with complete enrichment data
- Demo page property selection

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 500 | Database error or server error |

**Error Response Example:**

```json
{
  "error": "Database error",
  "message": "Failed to fetch properties with Regrid data"
}
```

---

### GET /api/properties/[id]/report

Generates a comprehensive property report with all data needed for investment analysis.

**Authentication:** None required

**HTTP Method:** `GET`

**URL:** `/api/properties/{id}/report`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Property unique identifier (must be valid UUID format) |

**Validation:**

The endpoint validates that the property ID is a valid UUID format. Invalid formats return a 400 error.

**Request Example:**

```bash
curl -X GET https://your-domain.com/api/properties/550e8400-e29b-41d4-a716-446655440000/report
```

**Response Format:**

```json
{
  "propertyDetails": {
    "parcelId": "12-345-6789",
    "address": "123 Main St",
    "city": "Blair",
    "county": "Blair",
    "state": "PA",
    "ownerName": "John Doe",
    "propertyType": "Residential",
    "lotSize": "0.25 acres",
    "yearBuilt": 1985,
    "bedrooms": 3,
    "bathrooms": 2,
    "squareFootage": 1450,
    "zoning": "R-1",
    "landUse": "Residential",
    "assessedValue": 75000,
    "marketValue": 125000,
    "coordinates": {
      "lat": 40.4862,
      "lng": -78.3947
    }
  },
  "auctionInfo": {
    "saleType": "Upset Sale",
    "saleDate": "2024-09-15",
    "totalDue": 5432.18,
    "minimumBid": 5432.18,
    "auctionStatus": "scheduled",
    "taxYear": 2023
  },
  "images": {
    "regridScreenshot": "https://storage.supabase.co/..."
  },
  "metadata": {
    "propertyId": "550e8400-e29b-41d4-a716-446655440000",
    "countyId": "county-uuid",
    "hasRegridData": true,
    "dataQualityScore": 0.95,
    "lastUpdated": "2024-01-20T14:22:00Z"
  }
}
```

**Response Structure:**

| Section | Description |
|---------|-------------|
| **propertyDetails** | Complete property information including land data |
| **auctionInfo** | Tax sale details and auction status |
| **images** | Property imagery (aerial screenshots) |
| **metadata** | Data quality and freshness indicators |

**propertyDetails Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `parcelId` | String | County parcel number |
| `address` | String | Street address |
| `city` | String | City name (may be null) |
| `county` | String | County name |
| `state` | String | State code |
| `ownerName` | String | Property owner (may be null) |
| `propertyType` | String | Property classification (may be null) |
| `lotSize` | String | Formatted lot size (acres or sqft) |
| `yearBuilt` | Number | Year built (may be null) |
| `bedrooms` | Number | Number of bedrooms (may be null) |
| `bathrooms` | Number | Number of bathrooms (may be null) |
| `squareFootage` | Number | Building square footage (may be null) |
| `zoning` | String | Zoning classification (may be null) |
| `landUse` | String | Current land use (may be null) |
| `assessedValue` | Number | County assessed value (may be null) |
| `marketValue` | Number | Regrid market value (may be null) |
| `coordinates` | Object | GPS coordinates (may have null lat/lng) |

**auctionInfo Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `saleType` | String | Type of sale (may be null) |
| `saleDate` | String | ISO date of auction (may be null) |
| `totalDue` | Number | Total amount owed (may be null) |
| `minimumBid` | Number | Minimum bid amount (may be null) |
| `auctionStatus` | String | Current status (may be null) |
| `taxYear` | Number | Tax year in arrears (may be null) |

**images Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `regridScreenshot` | String | URL to aerial screenshot (may be null) |

**metadata Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `propertyId` | UUID | Property identifier |
| `countyId` | UUID | County identifier |
| `hasRegridData` | Boolean | Whether Regrid data exists |
| `dataQualityScore` | Number | Quality score 0-1 (may be null) |
| `lastUpdated` | String | Last update timestamp (may be null) |

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Report generated successfully |
| 400 | Invalid property ID format (not a valid UUID) |
| 404 | Property not found |
| 500 | Database not configured or server error |

**Error Response Examples:**

**400 Bad Request (Invalid UUID):**
```json
{
  "error": "Invalid property ID",
  "message": "Property ID must be a valid UUID"
}
```

**404 Not Found:**
```json
{
  "error": "Property not found",
  "message": "No property exists with ID: 550e8400-e29b-41d4-a716-446655440000"
}
```

**500 Database Not Configured:**
```json
{
  "error": "Database not configured",
  "message": "Supabase connection is not available"
}
```

**Use Cases:**

- Generate investment analysis reports
- Pre-populate report generation forms
- Export property data for external analysis
- Display comprehensive property summaries

---

## Data Models

### Property Database Schema

```typescript
interface Property {
  id: string                          // UUID primary key
  county_id: string                   // Foreign key to counties
  parcel_id: string                   // County parcel number (unique per county)
  property_address: string | null     // Full address
  city: string | null                 // City name
  state_code: string | null           // Two-letter state code
  zip_code: string | null             // ZIP code
  owner_name: string | null           // Property owner
  property_type: string | null        // Property classification
  assessed_value: number | null       // County assessed value
  total_due: number                   // Total owed (taxes + fees)
  minimum_bid: number | null          // Minimum auction bid
  sale_type: string | null            // Sale type
  sale_date: string | null            // Auction date (ISO format)
  auction_status: string | null       // Current status
  tax_year: number | null             // Tax year in arrears
  has_regrid_data: boolean            // Regrid enrichment flag
  has_screenshot: boolean             // Screenshot availability flag
  visual_validation_status: string | null  // Validation status
  created_at: string                  // Creation timestamp
  updated_at: string                  // Last update timestamp
}
```

### Regrid Data Schema

```typescript
interface RegridData {
  id: string                          // UUID primary key
  property_id: string                 // Foreign key to properties
  property_type: string | null        // Property type from Regrid
  property_class: string | null       // Property classification
  land_use: string | null             // Land use category
  zoning: string | null               // Zoning classification
  lot_size_sqft: number | null        // Lot size in square feet
  lot_size_acres: number | null       // Lot size in acres
  building_sqft: number | null        // Building square footage
  year_built: number | null           // Year built
  bedrooms: number | null             // Number of bedrooms
  bathrooms: number | null            // Number of bathrooms
  assessed_value: number | null       // Assessed value
  market_value: number | null         // Market value estimate
  screenshot_url: string | null       // Aerial screenshot URL
  data_quality_score: number | null   // Quality score 0-1
  latitude: number | null             // GPS latitude
  longitude: number | null            // GPS longitude
  scraped_at: string                  // Scraping timestamp
  updated_at: string                  // Last update timestamp
}
```

### Visual Validation Schema

```typescript
interface PropertyVisualValidation {
  id: string                          // UUID primary key
  property_id: string                 // Foreign key to properties
  validation_status: string           // "approved" | "rejected" | "caution"
  confidence_score: number | null     // Confidence 0-1
  findings: string[]                  // Array of findings
  red_flags: string[]                 // Array of issues found
  structure_present: boolean | null   // Building visible
  road_access: boolean | null         // Road access available
  land_use_observed: string | null    // Observed land use
  lot_shape: string | null            // Lot shape description
  images_analyzed: string[]           // Array of analyzed image URLs
  notes: string | null                // Validation notes
  validated_by: string | null         // Validator identifier
  validated_at: string                // Validation timestamp
}
```

---

## Common Use Cases

### 1. Property Discovery Dashboard

**Scenario:** Display all properties in a county with their auction status.

```bash
# Get all properties
GET /api/properties

# Filter client-side by county
const blairProperties = response.data.filter(p =>
  p.counties?.county_name === 'Blair'
)
```

### 2. Investment Analysis Workflow

**Scenario:** Analyze a specific property for investment potential.

```bash
# Step 1: Get full property details
GET /api/properties/550e8400-e29b-41d4-a716-446655440000

# Step 2: Generate comprehensive report
GET /api/properties/550e8400-e29b-41d4-a716-446655440000/report

# Step 3: Run financial analysis (separate API)
POST /api/analysis/financial
{
  "propertyId": "550e8400-e29b-41d4-a716-446655440000",
  "purchasePrice": 5432.18
}
```

### 3. Property Selector for Reports

**Scenario:** Build a dropdown of properties ready for analysis.

```bash
# Get only properties with complete enrichment data
GET /api/properties/with-regrid
```

**Client Implementation:**

```typescript
const { data: properties } = await fetch('/api/properties/with-regrid')
  .then(r => r.json())

// Populate dropdown
<select>
  {properties.map(p => (
    <option value={p.id}>
      {p.address} - ${p.totalDue?.toFixed(2)}
    </option>
  ))}
</select>
```

### 4. Bulk Property Import

**Scenario:** Import properties from a county tax sale list (admin only).

```bash
# Create properties one at a time
for property in tax_sale_list:
  POST /api/properties
  Authorization: Bearer demo-token
  {
    "county_id": "county-uuid",
    "parcel_id": property.parcel,
    "property_address": property.address,
    "total_due": property.amount
  }
```

### 5. Property Cleanup

**Scenario:** Remove duplicate or invalid properties (admin only).

```bash
# Delete property
DELETE /api/properties/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer demo-token
```

### 6. Pre-Auction Research

**Scenario:** Research properties before an upcoming auction.

```bash
# Step 1: Get all properties
GET /api/properties

# Step 2: Filter by sale date (client-side)
const upcomingSales = properties.data.filter(p => {
  const saleDate = new Date(p.sale_date)
  const thirtyDaysOut = new Date()
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)
  return saleDate <= thirtyDaysOut
})

# Step 3: Get detailed data for each
for (const property of upcomingSales) {
  GET /api/properties/${property.id}
}
```

### 7. Data Quality Monitoring

**Scenario:** Identify properties missing enrichment data.

```bash
# Get all properties
GET /api/properties

# Filter for properties missing Regrid data
const needsEnrichment = properties.data.filter(p =>
  !p.has_regrid_data || !p.has_screenshot
)

# Trigger scraping for missing data (separate API)
POST /api/scrape/regrid
{
  "property_id": property.id
}
```

---

## Related APIs

- **[Auctions API](./auctions.md)** - Auction schedules and registration deadlines
- **[Counties API](./counties.md)** - County information and property counts
- **[Analysis API](./analysis.md)** - Financial and risk analysis
- **[Reports API](./reports.md)** - Report generation
- **[Scraping API](./scraping.md)** - Regrid data enrichment
- **[Batch Jobs API](./batch-jobs.md)** - Bulk processing workflows

---

## Notes

### Database Configuration

- If Supabase is not configured, POST operations return mock responses with demo data
- GET operations require database connectivity and return 500 errors if unavailable
- Demo mode is automatically detected based on environment configuration

### Pagination & Filtering

- Current implementation limits GET /api/properties to 100 records
- Results are sorted by `updated_at DESC` to show recently modified properties first
- Future releases will add query parameter support for:
  - Pagination (`page`, `limit`)
  - Filtering (`county`, `status`, `min_amount`, `max_amount`)
  - Sorting (`sort`, `order`)
  - Search (`search` - full-text search on address, parcel, owner)

### Visual Validation Status Values

| Status | Description |
|--------|-------------|
| `approved` | Property approved for investment |
| `rejected` | Property rejected (cemetery, water, utility, etc.) |
| `caution` | Requires manual review (irregular lot, etc.) |
| `null` | Not yet validated |

### Future Enhancements

- **Property Notes:** User notes and comments on properties
- **Watchlist:** Save properties to watchlist for monitoring
- **Document Attachments:** Link to source PDFs and legal documents
- **Historical Data:** Track property value changes over time
- **Batch Updates:** PATCH endpoint for updating multiple properties
- **Export:** CSV/Excel export of property lists

---

**Need help?** See the [Authentication Guide](./authentication.md) or [API Overview](./README.md).
