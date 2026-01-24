# Counties API

The Counties API provides endpoints for accessing county information, property counts, pipeline progress, and upcoming auction dates.

## Table of Contents

- [Overview](#overview)
- [Endpoints](#endpoints)
  - [GET /api/counties](#get-apicounties)
  - [GET /api/counties/[id]](#get-apicountiesid)
- [Data Models](#data-models)
- [Common Use Cases](#common-use-cases)

---

## Overview

The Counties API serves as the organizational hub for all tax auction data. Counties are the primary grouping mechanism for properties, auctions, documents, and research activities.

**Base Path:** `/api/counties`

**Total Endpoints:** 2

**Authentication:** None required for GET endpoints

**Database Tables:**
- `counties` - Core county information
- `properties` - Property data (joined for counts)
- `upcoming_sales` - Auction dates (joined)
- `documents` - Source documents (joined)
- `regrid_data` - Land enrichment data (joined)
- `property_visual_validation` - Validation results (joined)

---

## Endpoints

### GET /api/counties

Returns all counties with property counts, progress, and next auction dates. This endpoint aggregates data from multiple tables to provide a comprehensive county overview.

**Authentication:** None required

**HTTP Method:** `GET`

**URL:** `/api/counties`

**Query Parameters:** None

**Request Example:**

```bash
curl -X GET https://your-domain.com/api/counties
```

**Response Format:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Blair",
      "state": "PA",
      "stateName": "Pennsylvania",
      "status": "active",
      "propertyCount": 845,
      "progress": 78,
      "nextAuctionDate": "Sep 15, 2024",
      "daysUntilAuction": 45,
      "documentsCount": 12,
      "researchedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Centre",
      "state": "PA",
      "stateName": "Pennsylvania",
      "status": "active",
      "propertyCount": 234,
      "progress": 92,
      "nextAuctionDate": "Oct 20, 2024",
      "daysUntilAuction": 80,
      "documentsCount": 8,
      "researchedAt": "2024-01-10T14:22:00Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Bedford",
      "state": "PA",
      "stateName": "Pennsylvania",
      "status": "pending",
      "propertyCount": 0,
      "progress": 0,
      "nextAuctionDate": null,
      "daysUntilAuction": null,
      "documentsCount": 0,
      "researchedAt": null
    }
  ],
  "total": 3,
  "source": "database"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array of county objects |
| `total` | Number | Total number of counties |
| `source` | String | Data source (`"database"` or `"mock"`) |

**County Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique county identifier |
| `name` | String | County name (without "County" suffix) |
| `state` | String | Two-letter state code (e.g., "PA") |
| `stateName` | String | Full state name (e.g., "Pennsylvania") |
| `status` | String | County status: `"active"` (has properties or research), `"pending"` (not yet researched), `"archived"` (inactive) |
| `propertyCount` | Number | Total number of properties in this county |
| `progress` | Number | Pipeline progress percentage (0-100) based on Regrid enrichment completion |
| `nextAuctionDate` | String \| null | Formatted date of next upcoming auction (e.g., "Sep 15, 2024") or null if none scheduled |
| `daysUntilAuction` | Number \| null | Days until next auction (positive number) or null if none scheduled |
| `documentsCount` | Number | Number of documents (PDFs, property lists) available for this county |
| `researchedAt` | String \| null | ISO timestamp of last research session or null if never researched |

**Progress Calculation:**

The `progress` field represents the percentage of properties that have been enriched with Regrid data:

```
progress = (properties with has_regrid_data = true) / (total properties) * 100
```

- 0% = No properties have Regrid data
- 50% = Half of properties enriched
- 100% = All properties have Regrid data

**Status Determination:**

| Status | Condition |
|--------|-----------|
| `active` | County has properties OR has been researched (last_researched_at is not null) |
| `pending` | County has no properties AND has never been researched |
| `archived` | Future feature for inactive counties |

**Sorting:**

Counties are sorted alphabetically by `county_name` in ascending order.

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 500 | Database error or server error |

**Error Response Examples:**

**500 Database Not Configured:**
```json
{
  "error": "Database not configured"
}
```

**500 Database Error:**
```json
{
  "error": "Database error",
  "message": "Failed to fetch counties"
}
```

**Use Cases:**

- County selection dropdown in property filters
- Dashboard overview of all counties
- Pipeline status monitoring across all counties
- Auction calendar generation
- Research prioritization (show counties needing updates)

---

### GET /api/counties/[id]

Returns comprehensive details for a single county, including all properties, documents, auction schedules, contacts, vendor portals, resources, notes, batch jobs, and research history.

**Authentication:** None required

**HTTP Method:** `GET`

**URL:** `/api/counties/{id}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | County unique identifier |

**Request Example:**

```bash
curl -X GET https://your-domain.com/api/counties/550e8400-e29b-41d4-a716-446655440000
```

**Response Format:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Blair",
    "state": "PA",
    "stateName": "Pennsylvania",
    "status": "active",
    "lastResearchedAt": "2024-01-15T10:30:00Z",
    "createdAt": "2023-12-01T08:00:00Z",

    "propertyCount": 845,
    "activePropertyCount": 823,
    "progress": 78,
    "nextAuctionDate": "2024-09-15",
    "daysUntilAuction": 45,
    "documentsCount": 12,

    "pipelineStats": {
      "total": 845,
      "parsed": 845,
      "withRegrid": 659,
      "validated": 542,
      "approved": 487,
      "caution": 43,
      "rejected": 12,
      "regridPct": 78,
      "validationPct": 82
    },

    "documents": [
      {
        "id": "doc-uuid-1",
        "type": "property_list",
        "title": "2024 Upset Sale - Property List",
        "description": "Official list of properties for September 2024 upset sale",
        "url": "https://example.com/blair-upset-sale-2024.pdf",
        "uploadedAt": "2024-01-15T10:30:00Z",
        "fileSize": 2048576,
        "status": "parsed"
      }
    ],

    "upcomingSales": [
      {
        "id": "sale-uuid-1",
        "saleType": "Upset Sale",
        "saleDate": "2024-09-15",
        "registrationDeadline": "2024-09-08",
        "propertyCount": 845,
        "depositRequired": 10000,
        "depositType": "percentage",
        "location": "Blair County Courthouse, 423 Allegheny St, Hollidaysburg, PA 16648",
        "notes": "Registration required 7 days prior to sale"
      }
    ],

    "officialLinks": [
      {
        "id": "link-uuid-1",
        "linkType": "county_website",
        "title": "Blair County Official Website",
        "url": "https://www.blairco.org",
        "description": "Main county government website",
        "contactName": "Tax Claim Bureau",
        "contactEmail": "taxclaim@blairco.org",
        "contactPhone": "(814) 555-1234"
      }
    ],

    "vendorPortals": [
      {
        "id": "vendor-uuid-1",
        "vendorName": "Bid4Assets",
        "portalUrl": "https://www.bid4assets.com/blair-county-pa",
        "description": "Online bidding platform for Blair County tax sales",
        "requiresRegistration": true,
        "registrationUrl": "https://www.bid4assets.com/register",
        "notes": "Credit card required for deposit"
      }
    ],

    "additionalResources": [
      {
        "id": "resource-uuid-1",
        "resourceType": "gis_portal",
        "title": "Blair County GIS",
        "url": "https://gis.blairco.org",
        "description": "Property maps and parcel data"
      },
      {
        "id": "resource-uuid-2",
        "resourceType": "assessment_office",
        "title": "Blair County Assessment Office",
        "url": "https://www.blairco.org/assessment",
        "description": "Property assessment records and tax information"
      }
    ],

    "importantNotes": [
      {
        "id": "note-uuid-1",
        "noteType": "requirement",
        "title": "Registration Deadline",
        "content": "All bidders must register 7 days before the sale date",
        "priority": 1,
        "isUrgent": true
      },
      {
        "id": "note-uuid-2",
        "noteType": "tip",
        "title": "Property Inspections",
        "content": "Properties available for inspection two weeks before sale",
        "priority": 2,
        "isUrgent": false
      }
    ],

    "batchJobs": [
      {
        "id": "job-uuid-1",
        "jobType": "regrid_scraping",
        "status": "completed",
        "totalItems": 845,
        "completedItems": 845,
        "batchSize": 50,
        "createdAt": "2024-01-16T09:00:00Z",
        "completedAt": "2024-01-16T14:30:00Z"
      }
    ],

    "researchLog": [
      {
        "id": "log-uuid-1",
        "researchType": "county_research",
        "summary": "Researched Blair County, PA - Found 12 documents and 1 upcoming sale",
        "toolsUsed": ["Perplexity", "Google Custom Search"],
        "citations": "https://www.blairco.org/tax-sales, https://www.bid4assets.com/blair-county-pa",
        "qualityScore": 10,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "source": "database"
}
```

**Response Structure:**

| Section | Description |
|---------|-------------|
| **Core Fields** | Basic county info (name, state, status, timestamps) |
| **Stats** | Property counts, progress, auction dates |
| **pipelineStats** | Detailed pipeline progress breakdown |
| **documents** | Property lists, tax sale notices, legal documents |
| **upcomingSales** | Scheduled auctions with dates and requirements |
| **officialLinks** | Government websites, tax offices, contact info |
| **vendorPortals** | Online bidding platforms (Bid4Assets, etc.) |
| **additionalResources** | GIS portals, assessment offices, research tools |
| **importantNotes** | Registration requirements, deadlines, tips |
| **batchJobs** | Recent pipeline processing jobs (last 10) |
| **researchLog** | Research history and quality tracking (last 10) |

**Core County Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | County identifier |
| `name` | String | County name |
| `state` | String | State code |
| `stateName` | String | Full state name |
| `status` | String | `"active"`, `"pending"`, or `"archived"` |
| `lastResearchedAt` | String \| null | Last research timestamp |
| `createdAt` | String | County creation timestamp |

**Stats Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `propertyCount` | Number | Total properties |
| `activePropertyCount` | Number | Properties with `auction_status = "active"` |
| `progress` | Number | Pipeline progress percentage (0-100) |
| `nextAuctionDate` | String \| null | ISO date of next auction |
| `daysUntilAuction` | Number \| null | Days until next auction |
| `documentsCount` | Number | Number of documents available |

**Pipeline Stats Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `total` | Number | Total properties in county |
| `parsed` | Number | Properties extracted from PDFs (always equals total in current implementation) |
| `withRegrid` | Number | Properties with Regrid data |
| `validated` | Number | Properties with visual validation results |
| `approved` | Number | Properties approved for investment |
| `caution` | Number | Properties flagged for manual review |
| `rejected` | Number | Properties rejected (cemetery, water, utility, etc.) |
| `regridPct` | Number | Percentage with Regrid data (0-100) |
| `validationPct` | Number | Percentage validated among properties with Regrid (0-100) |

**Document Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Document identifier |
| `type` | String | Document type: `"property_list"`, `"tax_sale_notice"`, `"registration_form"`, etc. |
| `title` | String | Document title |
| `description` | String \| null | Document description |
| `url` | String | PDF or document URL |
| `uploadedAt` | String | Upload timestamp |
| `fileSize` | Number \| null | File size in bytes |
| `status` | String | Parsing status: `"parsed"`, `"pending"`, `"failed"` |

**Upcoming Sale Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Sale identifier |
| `saleType` | String | Sale type: `"Upset Sale"`, `"Judicial Sale"`, etc. |
| `saleDate` | String | ISO date of auction |
| `registrationDeadline` | String \| null | Registration deadline date |
| `propertyCount` | Number \| null | Number of properties in this sale |
| `depositRequired` | Number \| null | Deposit amount or percentage |
| `depositType` | String \| null | `"percentage"`, `"flat"`, or `"per_property"` |
| `location` | String \| null | Auction location address |
| `notes` | String \| null | Additional sale information |

**Official Link Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Link identifier |
| `linkType` | String | Link type: `"county_website"`, `"tax_office"`, `"treasurer"`, etc. |
| `title` | String | Link title |
| `url` | String | Website URL |
| `description` | String \| null | Link description |
| `contactName` | String \| null | Contact person or department |
| `contactEmail` | String \| null | Contact email |
| `contactPhone` | String \| null | Contact phone number |

**Vendor Portal Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Portal identifier |
| `vendorName` | String | Vendor name: `"Bid4Assets"`, `"RealAuction"`, etc. |
| `portalUrl` | String | Portal URL |
| `description` | String \| null | Portal description |
| `requiresRegistration` | Boolean \| null | Whether registration is required |
| `registrationUrl` | String \| null | Registration URL |
| `notes` | String \| null | Additional portal information |

**Additional Resource Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Resource identifier |
| `resourceType` | String | Resource type: `"gis_portal"`, `"assessment_office"`, `"legal_notices"`, etc. |
| `title` | String | Resource title |
| `url` | String | Resource URL |
| `description` | String \| null | Resource description |

**Important Note Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Note identifier |
| `noteType` | String | Note type: `"requirement"`, `"tip"`, `"warning"`, `"deadline"` |
| `title` | String | Note title |
| `content` | String | Note content |
| `priority` | Number | Priority level (1 = highest) |
| `isUrgent` | Boolean \| null | Whether note is urgent |

**Batch Job Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Job identifier |
| `jobType` | String | Job type: `"regrid_scraping"`, `"visual_validation"`, `"pdf_parsing"`, etc. |
| `status` | String | Job status: `"completed"`, `"in_progress"`, `"paused"`, `"failed"` |
| `totalItems` | Number | Total items to process |
| `completedItems` | Number | Items completed |
| `batchSize` | Number | Items per batch |
| `createdAt` | String | Job creation timestamp |
| `completedAt` | String \| null | Job completion timestamp |

**Research Log Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Log identifier |
| `researchType` | String | Research type: `"county_research"`, `"property_refresh"`, etc. |
| `summary` | String | Research summary |
| `toolsUsed` | Array | Tools used: `["Perplexity", "Google Custom Search"]` |
| `citations` | String \| null | Source URLs (comma-separated) |
| `qualityScore` | Number \| null | Research quality score (1-10) |
| `createdAt` | String | Research timestamp |

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 404 | County not found |
| 500 | Database error or server error |

**Error Response Examples:**

**404 Not Found:**
```json
{
  "error": "Not found",
  "message": "County not found"
}
```

**500 Database Not Configured:**
```json
{
  "error": "Database not configured"
}
```

**500 Database Error:**
```json
{
  "error": "Database error",
  "message": "Failed to fetch county details"
}
```

**Use Cases:**

- County detail pages showing complete information
- Pipeline monitoring for specific counties
- Auction preparation (dates, deadlines, requirements)
- Research quality tracking and audit trails
- Document library access for county records
- Contact information for county tax offices
- Vendor portal links for online bidding

---

## Data Models

### County Database Schema

```typescript
interface County {
  id: string                          // UUID primary key
  county_name: string                 // County name (e.g., "Blair")
  state_code: string                  // Two-letter state code (e.g., "PA")
  state_name: string                  // Full state name (e.g., "Pennsylvania")
  last_researched_at: string | null   // Last research timestamp
  created_at: string                  // Creation timestamp
}
```

### Aggregated County Response (GET /api/counties)

```typescript
interface CountyListItem {
  id: string                          // County ID
  name: string                        // County name
  state: string                       // State code
  stateName: string                   // Full state name
  status: "active" | "pending" | "archived"  // County status
  propertyCount: number               // Total properties
  progress: number                    // Pipeline progress (0-100)
  nextAuctionDate: string | null      // Next auction date (formatted)
  daysUntilAuction: number | null     // Days until auction
  documentsCount: number              // Number of documents
  researchedAt: string | null         // Last research timestamp
}
```

### Detailed County Response (GET /api/counties/[id])

```typescript
interface CountyDetail {
  // Core fields
  id: string
  name: string
  state: string
  stateName: string
  status: "active" | "pending" | "archived"
  lastResearchedAt: string | null
  createdAt: string

  // Stats
  propertyCount: number
  activePropertyCount: number
  progress: number
  nextAuctionDate: string | null
  daysUntilAuction: number | null
  documentsCount: number

  // Pipeline breakdown
  pipelineStats: {
    total: number
    parsed: number
    withRegrid: number
    validated: number
    approved: number
    caution: number
    rejected: number
    regridPct: number
    validationPct: number
  }

  // Related data
  documents: Document[]
  upcomingSales: UpcomingSale[]
  officialLinks: OfficialLink[]
  vendorPortals: VendorPortal[]
  additionalResources: AdditionalResource[]
  importantNotes: ImportantNote[]
  batchJobs: BatchJob[]              // Last 10
  researchLog: ResearchLogEntry[]    // Last 10
}
```

---

## Common Use Cases

### 1. County Selection Dropdown

**Scenario:** Populate a county selector for filtering properties.

```bash
GET /api/counties
```

**Client Implementation:**

```typescript
const { data: counties } = await fetch('/api/counties')
  .then(r => r.json())

// Filter to active counties only
const activeCounties = counties.filter(c => c.status === 'active')

// Populate dropdown
<select>
  {activeCounties.map(county => (
    <option value={county.id}>
      {county.name}, {county.state} ({county.propertyCount} properties)
    </option>
  ))}
</select>
```

### 2. Dashboard Overview

**Scenario:** Display county cards showing progress and upcoming auctions.

```bash
GET /api/counties
```

**Display Logic:**

```typescript
counties.data.forEach(county => {
  // Show progress bar
  const progressBar = `${county.progress}%`

  // Show auction countdown
  if (county.daysUntilAuction) {
    const urgency = county.daysUntilAuction <= 7 ? 'urgent' : 'normal'
    const message = `${county.daysUntilAuction} days until auction`
  }

  // Show research status
  const needsResearch = !county.researchedAt ||
    isOlderThan(county.researchedAt, 30) // 30 days
})
```

### 3. County Detail Page

**Scenario:** Display comprehensive county information with all related data.

```bash
GET /api/counties/550e8400-e29b-41d4-a716-446655440000
```

**Page Sections:**

- **Overview Card:** Property count, progress, next auction
- **Pipeline Status:** Progress breakdown (parsed → Regrid → validated)
- **Upcoming Auctions:** Table of sales with dates and deadlines
- **Documents:** Download links for property lists and notices
- **Contacts:** Tax office, county website, phone numbers
- **Vendor Portals:** Links to online bidding platforms
- **Resources:** GIS portals, assessment offices
- **Important Notes:** Registration requirements, tips, warnings
- **Recent Activity:** Batch jobs and research log

### 4. Auction Calendar

**Scenario:** Generate a calendar view of all upcoming auctions across counties.

```bash
GET /api/counties
```

**Calendar Generation:**

```typescript
const { data: counties } = await fetch('/api/counties').then(r => r.json())

// Filter counties with upcoming auctions
const upcomingAuctions = counties
  .filter(c => c.nextAuctionDate && c.daysUntilAuction > 0)
  .sort((a, b) => a.daysUntilAuction - b.daysUntilAuction)

// Generate calendar events
upcomingAuctions.forEach(county => {
  addCalendarEvent({
    title: `${county.name}, ${county.state} Tax Sale`,
    date: county.nextAuctionDate,
    propertyCount: county.propertyCount
  })
})
```

### 5. Research Queue Management

**Scenario:** Identify counties needing research updates (>30 days old).

```bash
GET /api/counties
```

**Priority Queue:**

```typescript
const { data: counties } = await fetch('/api/counties').then(r => r.json())

// Find counties needing research
const needsResearch = counties.filter(county => {
  if (!county.researchedAt) return true // Never researched

  const daysSinceResearch = daysBetween(county.researchedAt, new Date())
  return daysSinceResearch > 30 // More than 30 days old
})

// Sort by priority (upcoming auctions first)
needsResearch.sort((a, b) => {
  if (a.daysUntilAuction && b.daysUntilAuction) {
    return a.daysUntilAuction - b.daysUntilAuction
  }
  if (a.daysUntilAuction) return -1
  if (b.daysUntilAuction) return 1
  return 0
})
```

### 6. Pipeline Monitoring

**Scenario:** Monitor pipeline health and identify bottlenecks.

```bash
# Get all counties
GET /api/counties

# Get detailed stats for counties with issues
GET /api/counties/{id}
```

**Bottleneck Detection:**

```typescript
const { data: counties } = await fetch('/api/counties').then(r => r.json())

// Find counties with stalled pipelines
const stalledCounties = counties.filter(county => {
  return county.propertyCount > 0 && county.progress < 50
})

// Get detailed breakdown
for (const county of stalledCounties) {
  const detail = await fetch(`/api/counties/${county.id}`).then(r => r.json())

  console.log(`${county.name}: ${detail.data.pipelineStats.withRegrid} / ${detail.data.pipelineStats.total} have Regrid data`)
  console.log(`${county.name}: ${detail.data.pipelineStats.validated} / ${detail.data.pipelineStats.withRegrid} validated`)
}
```

### 7. Contact Information Lookup

**Scenario:** Get tax office contact information for a county.

```bash
GET /api/counties/550e8400-e29b-41d4-a716-446655440000
```

**Extract Contacts:**

```typescript
const { data: county } = await fetch(`/api/counties/${countyId}`)
  .then(r => r.json())

// Find tax office contact
const taxOffice = county.officialLinks.find(link =>
  link.linkType === 'tax_office' ||
  link.title.includes('Tax Claim')
)

if (taxOffice) {
  console.log(`Email: ${taxOffice.contactEmail}`)
  console.log(`Phone: ${taxOffice.contactPhone}`)
  console.log(`Website: ${taxOffice.url}`)
}

// Find vendor portal
const vendor = county.vendorPortals[0]
if (vendor) {
  console.log(`Online bidding: ${vendor.portalUrl}`)
  console.log(`Registration required: ${vendor.requiresRegistration}`)
}
```

---

## Related APIs

- **[Properties API](./properties.md)** - Property data and enrichment
- **[Auctions API](./auctions.md)** - Auction schedules and alerts
- **[Documents API](./documents.md)** - Property lists and tax sale notices
- **[Batch Jobs API](./batch-jobs.md)** - Pipeline processing workflows
- **[Research API](./research.md)** - County research and quality tracking

---

## Notes

### Database Configuration

- If Supabase is not configured, endpoints return 500 errors
- All GET endpoints are public and do not require authentication
- Future releases may add POST/PATCH/DELETE endpoints for county management (admin only)

### Status Values

| Status | Condition |
|--------|-----------|
| `active` | County has properties OR has been researched (last_researched_at is not null) |
| `pending` | County has no properties AND has never been researched |
| `archived` | Future feature for inactive counties |

### Progress Calculation

Progress is calculated as:

```
progress = (properties with has_regrid_data = true) / (total properties) * 100
```

This provides a quick indicator of how far through the enrichment pipeline a county has progressed.

### Data Aggregation

Both endpoints perform significant data aggregation:

- **GET /api/counties** - Joins 6 tables and calculates counts in memory
- **GET /api/counties/[id]** - Performs 9 parallel queries to fetch related data

For optimal performance, consider implementing:
- Database views for pre-calculated aggregates
- Caching layer for frequently accessed counties
- Pagination for large county lists

### Future Enhancements

- **County Management:** POST/PATCH/DELETE endpoints for admin users
- **County Notes:** User notes and comments on counties
- **Research Scheduling:** Automated research refresh based on age
- **Alert Subscriptions:** Email/SMS alerts for auction deadlines
- **Export:** CSV/Excel export of county lists with stats
- **Filtering:** Query parameters for state, status, property count ranges

---

**Need help?** See the [API Overview](./README.md) or [Properties API](./properties.md).
