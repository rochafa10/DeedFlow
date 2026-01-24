# Auctions API

The Auctions API provides endpoints for accessing upcoming tax auction information, registration deadlines, auction rules, and real-time alerts.

## Table of Contents

- [Overview](#overview)
- [Endpoints](#endpoints)
  - [GET /api/auctions](#get-apiauctions)
  - [GET /api/auctions/[saleId]](#get-apauctionssaleid)
- [Data Models](#data-models)
- [Common Use Cases](#common-use-cases)

---

## Overview

The Auctions API provides comprehensive auction information for tax deed sales across multiple counties. It aggregates data from upcoming sales, auction rules, alerts, and property counts to help investors plan their bidding strategies.

**Base Path:** `/api/auctions`

**Total Endpoints:** 2

**Authentication:** None required (read-only endpoints)

**Database Tables:**
- `upcoming_sales` - Auction dates and details
- `counties` - County information (joined)
- `auction_alerts` - Deadline warnings and notifications
- `auction_rules` - Registration and bidding requirements
- `properties` - Properties included in auctions
- `documents` - Related documents and property lists
- `official_links` - County websites and portals

---

## Endpoints

### GET /api/auctions

Returns a list of all upcoming auctions with county information, property counts, registration deadlines, and active alerts.

**Authentication:** None required

**HTTP Method:** `GET`

**URL:** `/api/auctions`

**Query Parameters:** None

**Description:**

This endpoint retrieves all upcoming tax auctions sorted by sale date. It includes:
- County information for each auction
- Property counts and deposit requirements
- Registration deadlines with days-until countdown
- Active auction alerts (unacknowledged only)
- Monthly statistics

**Request Example:**

```bash
curl -X GET https://your-domain.com/api/auctions
```

**Response Format:**

```json
{
  "data": {
    "auctions": [
      {
        "id": "sale-uuid-1",
        "county": "Blair",
        "state": "PA",
        "countyId": "county-uuid-blair",
        "date": "2024-09-15T10:00:00Z",
        "type": "Upset Sale",
        "platform": "Bid4Assets",
        "location": "Blair County Courthouse, Hollidaysburg, PA",
        "propertyCount": 127,
        "registrationDeadline": "2024-09-08T17:00:00Z",
        "registrationDaysUntil": 5,
        "depositRequired": "$5,000",
        "status": "upcoming",
        "daysUntil": 12
      },
      {
        "id": "sale-uuid-2",
        "county": "Centre",
        "state": "PA",
        "countyId": "county-uuid-centre",
        "date": "2024-10-05T09:00:00Z",
        "type": "Judicial Sale",
        "platform": "In-Person",
        "location": "Centre County Courthouse, Bellefonte, PA",
        "propertyCount": 89,
        "registrationDeadline": "2024-09-28T16:00:00Z",
        "registrationDaysUntil": 21,
        "depositRequired": "$10,000",
        "status": "upcoming",
        "daysUntil": 32
      }
    ],
    "alerts": [
      {
        "id": "alert-uuid-1",
        "type": "warning",
        "title": "Registration Deadline Approaching",
        "message": "Blair County Upset Sale registration closes in 5 days (Sep 8, 2024)",
        "date": "2024-09-03T08:00:00Z",
        "auctionId": "sale-uuid-1",
        "daysUntilEvent": 5
      },
      {
        "id": "alert-uuid-2",
        "type": "critical",
        "title": "Auction Imminent",
        "message": "Centre County Judicial Sale is in 6 days (Oct 5, 2024)",
        "date": "2024-09-29T08:00:00Z",
        "auctionId": "sale-uuid-2",
        "daysUntilEvent": 6
      },
      {
        "id": "alert-uuid-3",
        "type": "info",
        "title": "New Property List Available",
        "message": "Updated property list posted for Blair County Upset Sale",
        "date": "2024-09-01T14:30:00Z",
        "auctionId": "sale-uuid-1",
        "daysUntilEvent": null
      }
    ],
    "stats": {
      "totalUpcoming": 12,
      "thisMonth": 3
    }
  },
  "source": "database"
}
```

**Response Structure:**

| Section | Type | Description |
|---------|------|-------------|
| `data.auctions` | Array | Array of upcoming auction objects |
| `data.alerts` | Array | Array of active alert objects (unacknowledged only, max 10) |
| `data.stats` | Object | Summary statistics |
| `source` | String | Data source (`"database"` or `"mock"`) |

**Auction Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique auction/sale identifier |
| `county` | String | County name |
| `state` | String | Two-letter state code |
| `countyId` | UUID | County reference ID |
| `date` | String | ISO date/time of auction |
| `type` | String | Sale type ("Upset Sale", "Judicial Sale", "Tax Deed", etc.) |
| `platform` | String | Auction platform ("Bid4Assets", "In-Person", "RealAuction", etc.) |
| `location` | String | Physical or online location |
| `propertyCount` | Number | Number of properties in auction |
| `registrationDeadline` | String\|null | ISO date/time of registration deadline (may be null) |
| `registrationDaysUntil` | Number\|null | Days until registration closes (may be null or negative if closed) |
| `depositRequired` | String | Formatted deposit amount or "TBD" |
| `status` | String | Auction status ("upcoming", "active", "completed", "cancelled") |
| `daysUntil` | Number | Days until auction (positive = future, negative = past) |

**Alert Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Alert identifier |
| `type` | String | Alert severity ("info", "warning", "critical") |
| `title` | String | Alert title |
| `message` | String | Alert message/description |
| `date` | String | ISO timestamp when alert was created |
| `auctionId` | UUID\|null | Related auction ID (may be null) |
| `daysUntilEvent` | Number\|null | Days until event (may be null) |

**Stats Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `totalUpcoming` | Number | Total number of upcoming auctions |
| `thisMonth` | Number | Number of auctions this calendar month |

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 500 | Database error or server error |

**Error Response Example:**

```json
{
  "error": "Database error",
  "message": "Failed to fetch upcoming sales"
}
```

**Notes:**

- Only returns auctions with `sale_date >= today`
- Auctions are sorted by `sale_date` ascending (earliest first)
- Alerts are limited to 10 most recent unacknowledged alerts
- `registrationDaysUntil` and `daysUntil` are calculated dynamically based on current date
- Deposit amounts are formatted with commas (e.g., "$5,000")

---

### GET /api/auctions/[saleId]

Returns comprehensive details for a specific auction, including rules, properties, alerts, documents, and registration requirements.

**Authentication:** None required

**HTTP Method:** `GET`

**URL:** `/api/auctions/{saleId}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `saleId` | UUID | Unique auction/sale identifier |

**Description:**

This endpoint provides all data needed to prepare for an auction, including:
- Complete auction details with county information
- Auction rules (registration, deposits, bidding, payment requirements)
- Related alerts for this auction
- Properties included in the auction (limited to 50 most valuable)
- Documents (property lists, legal notices, etc.)
- Official links (county websites, portals)
- Calculated urgency levels and registration status

**Request Example:**

```bash
curl -X GET https://your-domain.com/api/auctions/550e8400-e29b-41d4-a716-446655440000
```

**Response Format:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "county": "Blair",
    "countyId": "county-uuid-blair",
    "state": "PA",
    "stateName": "Pennsylvania",
    "date": "2024-09-15T10:00:00Z",
    "type": "Upset Sale",
    "platform": "Bid4Assets",
    "location": "Blair County Courthouse, Hollidaysburg, PA",
    "propertyCount": 127,
    "registrationDeadline": "2024-09-08T17:00:00Z",
    "registrationDaysUntil": 5,
    "registrationStatus": "soon",
    "depositRequired": "$5,000",
    "depositAmount": 5000,
    "status": "upcoming",
    "daysUntil": 12,
    "urgency": "upcoming",
    "notes": null,

    "rules": {
      "id": "rules-uuid",
      "countyId": "county-uuid-blair",
      "saleType": "Upset Sale",
      "registrationRequired": true,
      "registrationMethod": "Online via Bid4Assets",
      "registrationDeadline": "2024-09-08T17:00:00Z",
      "registrationUrl": "https://bid4assets.com/blair-county",
      "depositRequired": true,
      "depositAmount": 5000,
      "depositType": "Cashier's Check or Wire Transfer",
      "biddingMethod": "Online bidding on Bid4Assets platform",
      "biddingIncrements": "$100 minimum bid increments",
      "paymentDeadline": "10 days after sale",
      "paymentMethods": "Wire transfer or cashier's check",
      "redemptionPeriod": "None (Pennsylvania upset sales are final)",
      "additionalRequirements": "Must be 18+ with valid government ID",
      "notesOrWarnings": "Properties sold as-is with no right of redemption"
    },

    "alerts": [
      {
        "id": "alert-uuid-1",
        "alertType": "registration_deadline",
        "severity": "warning",
        "title": "Registration Deadline Approaching",
        "message": "Blair County Upset Sale registration closes in 5 days",
        "daysUntilEvent": 5,
        "acknowledged": false,
        "createdAt": "2024-09-03T08:00:00Z"
      }
    ],

    "properties": [
      {
        "id": "prop-uuid-1",
        "parcelId": "12-345-6789",
        "address": "123 Main St, Blair, PA 16601",
        "ownerName": "John Doe",
        "totalDue": 5432.18,
        "saleType": "Upset Sale",
        "saleDate": "2024-09-15",
        "hasRegridData": true,
        "visualValidationStatus": "approved",
        "auctionStatus": "active"
      }
    ],

    "propertyStats": {
      "totalProperties": 127,
      "approvedProperties": 89,
      "cautionProperties": 12,
      "totalTaxDue": 567890.45
    },

    "documents": [
      {
        "id": "doc-uuid-1",
        "documentType": "Property List",
        "title": "Blair County Upset Sale - September 2024",
        "url": "https://county-website.com/tax-sale-list.pdf",
        "fileSize": "2.4 MB",
        "createdAt": "2024-08-15T10:00:00Z"
      }
    ],

    "officialLinks": [
      {
        "id": "link-uuid-1",
        "linkType": "Tax Sale Information",
        "url": "https://blairco.org/tax-sale",
        "description": "Official Blair County Tax Sale Information"
      }
    ],

    "countyInfo": {
      "id": "county-uuid-blair",
      "name": "Blair",
      "state": "PA",
      "stateName": "Pennsylvania"
    }
  },
  "source": "database"
}
```

**Response Structure:**

| Section | Type | Description |
|---------|------|-------------|
| **Core Auction Data** | Object | Basic auction information |
| `rules` | Object\|null | Auction rules and requirements (may be null) |
| `alerts` | Array | Related alerts (max 10, most recent first) |
| `properties` | Array | Properties in auction (max 50, highest value first) |
| `propertyStats` | Object | Property statistics |
| `documents` | Array | Related documents (max 20, most recent first) |
| `officialLinks` | Array | County websites and portals |
| `countyInfo` | Object | County details |
| `source` | String | Data source |

**Core Auction Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Auction identifier |
| `county` | String | County name |
| `countyId` | UUID | County reference |
| `state` | String | Two-letter state code |
| `stateName` | String | Full state name |
| `date` | String | ISO auction date/time |
| `type` | String | Sale type |
| `platform` | String | Auction platform |
| `location` | String | Location |
| `propertyCount` | Number | Total properties in auction |
| `registrationDeadline` | String\|null | Registration deadline |
| `registrationDaysUntil` | Number\|null | Days until registration closes |
| `registrationStatus` | String | Status: "unknown", "open", "soon", "urgent", "closed" |
| `depositRequired` | String\|null | Formatted deposit amount |
| `depositAmount` | Number\|null | Raw deposit amount |
| `status` | String | Auction status |
| `daysUntil` | Number | Days until auction |
| `urgency` | String | Urgency level: "scheduled", "upcoming", "warning", "critical" |
| `notes` | String\|null | Additional notes |

**Urgency Levels:**

| Urgency | Days Until Auction |
|---------|-------------------|
| `scheduled` | > 30 days |
| `upcoming` | 15-30 days |
| `warning` | 8-14 days |
| `critical` | ≤ 7 days |

**Registration Status Values:**

| Status | Description |
|--------|-------------|
| `unknown` | No registration deadline set |
| `open` | > 7 days until deadline |
| `soon` | 4-7 days until deadline |
| `urgent` | 1-3 days until deadline |
| `closed` | Deadline has passed |

**Auction Rules Object:**

| Field | Type | Description |
|-------|------|-------------|
| `registrationRequired` | Boolean | Whether registration is required |
| `registrationMethod` | String | How to register |
| `registrationDeadline` | String | Registration deadline |
| `registrationUrl` | String | Registration link |
| `depositRequired` | Boolean | Whether deposit is required |
| `depositAmount` | Number | Deposit amount |
| `depositType` | String | Accepted deposit types |
| `biddingMethod` | String | How bidding works |
| `biddingIncrements` | String | Minimum bid increments |
| `paymentDeadline` | String | Payment deadline after winning |
| `paymentMethods` | String | Accepted payment methods |
| `redemptionPeriod` | String | Redemption period (if any) |
| `additionalRequirements` | String | Other requirements |
| `notesOrWarnings` | String | Important warnings |

**Alert Object:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Alert identifier |
| `alertType` | String | Alert type ("registration_deadline", "auction_imminent", "new_auction", "property_list_available") |
| `severity` | String | Severity ("info", "warning", "critical") |
| `title` | String | Alert title |
| `message` | String | Alert message |
| `daysUntilEvent` | Number\|null | Days until event |
| `acknowledged` | Boolean | Whether acknowledged |
| `createdAt` | String | Creation timestamp |

**Property Object (Simplified):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Property identifier |
| `parcelId` | String | Parcel number |
| `address` | String | Property address |
| `ownerName` | String | Owner name |
| `totalDue` | Number | Amount owed |
| `saleType` | String | Sale type |
| `saleDate` | String | Sale date |
| `hasRegridData` | Boolean | Regrid data available |
| `visualValidationStatus` | String | Validation status |
| `auctionStatus` | String | Current status |

**Property Stats Object:**

| Field | Type | Description |
|-------|------|-------------|
| `totalProperties` | Number | Total properties in auction |
| `approvedProperties` | Number | Properties with validation status = "approved" |
| `cautionProperties` | Number | Properties with validation status = "caution" |
| `totalTaxDue` | Number | Sum of all total_due amounts |

**Document Object:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Document identifier |
| `documentType` | String | Document type |
| `title` | String | Document title |
| `url` | String | Document URL |
| `fileSize` | String | File size (formatted) |
| `createdAt` | String | Creation timestamp |

**Official Link Object:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Link identifier |
| `linkType` | String | Link type |
| `url` | String | URL |
| `description` | String | Link description |

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 404 | Auction not found |
| 500 | Database error or server error |

**Error Response Examples:**

**404 Not Found:**
```json
{
  "error": "Not found",
  "message": "Auction not found"
}
```

**500 Database Error:**
```json
{
  "error": "Database error",
  "message": "Failed to fetch auction details"
}
```

**500 Database Not Configured:**
```json
{
  "error": "Database not configured"
}
```

**Notes:**

- Properties are limited to 50 for performance, sorted by `total_due DESC` (highest value first)
- Alerts are limited to 10, sorted by `created_at DESC` (most recent first)
- Documents are limited to 20, sorted by `created_at DESC`
- Only properties with `auction_status = 'active'` are included
- `registrationStatus` and `urgency` are calculated dynamically
- If no county is found, many related data sections will be empty arrays
- Auction rules may be null if not yet configured for this county/sale type

---

## Data Models

### Upcoming Sales Schema

```typescript
interface UpcomingSale {
  id: string                          // UUID primary key
  county_id: string                   // Foreign key to counties
  sale_type: string | null            // Sale type
  sale_date: string                   // ISO date of auction
  registration_deadline: string | null // ISO date of registration deadline
  platform: string | null             // Auction platform
  deposit_required: number | null     // Deposit amount
  property_count: number | null       // Number of properties
  location: string | null             // Physical or online location
  status: string | null               // Auction status
  created_at: string                  // Creation timestamp
  updated_at: string                  // Last update timestamp
}
```

### Auction Alerts Schema

```typescript
interface AuctionAlert {
  id: string                          // UUID primary key
  county_id: string                   // Foreign key to counties
  sale_id: string | null              // Foreign key to upcoming_sales
  alert_type: string                  // Alert type
  severity: string                    // "info" | "warning" | "critical"
  title: string                       // Alert title
  message: string                     // Alert message
  days_until_event: number | null     // Days until event
  acknowledged: boolean               // Whether acknowledged
  created_at: string                  // Creation timestamp
}
```

### Auction Rules Schema

```typescript
interface AuctionRules {
  id: string                          // UUID primary key
  county_id: string                   // Foreign key to counties
  sale_type: string                   // Sale type
  registration_required: boolean | null
  registration_method: string | null
  registration_deadline: string | null
  registration_url: string | null
  deposit_required: boolean | null
  deposit_amount: number | null
  deposit_type: string | null
  bidding_method: string | null
  bidding_increments: string | null
  payment_deadline: string | null
  payment_methods: string | null
  redemption_period: string | null
  additional_requirements: string | null
  notes_or_warnings: string | null
  created_at: string
  updated_at: string
}
```

---

## Common Use Cases

### 1. Auction Dashboard

**Scenario:** Display all upcoming auctions with alerts on dashboard.

```typescript
const response = await fetch('/api/auctions')
const { data } = await response.json()

// Display auctions
data.auctions.forEach(auction => {
  console.log(`${auction.county}, ${auction.state} - ${auction.date}`)
  console.log(`Properties: ${auction.propertyCount}`)
  console.log(`Days until: ${auction.daysUntil}`)
})

// Display alerts
data.alerts.forEach(alert => {
  console.log(`[${alert.type}] ${alert.title}`)
})

// Display stats
console.log(`Total upcoming: ${data.stats.totalUpcoming}`)
console.log(`This month: ${data.stats.thisMonth}`)
```

### 2. Auction Preparation Workflow

**Scenario:** Prepare for a specific auction - get all requirements and property list.

```bash
# Step 1: Get auction details
GET /api/auctions/550e8400-e29b-41d4-a716-446655440000

# Step 2: Review auction rules
# - Check registration deadline
# - Note deposit requirements
# - Review bidding method

# Step 3: Download property list from documents

# Step 4: Research top properties
for property in response.data.properties:
  GET /api/properties/${property.id}
```

### 3. Registration Deadline Monitoring

**Scenario:** Monitor registration deadlines to avoid missing auctions.

```typescript
const response = await fetch('/api/auctions')
const { data } = await response.json()

// Find auctions with urgent registration deadlines
const urgentRegistrations = data.auctions.filter(auction =>
  auction.registrationDaysUntil !== null &&
  auction.registrationDaysUntil <= 3 &&
  auction.registrationDaysUntil > 0
)

// Alert user
urgentRegistrations.forEach(auction => {
  console.log(`URGENT: ${auction.county} registration closes in ${auction.registrationDaysUntil} days!`)
})
```

### 4. Multi-County Auction Planning

**Scenario:** Plan which auctions to attend based on property counts and dates.

```typescript
const response = await fetch('/api/auctions')
const { data } = await response.json()

// Filter auctions in next 30 days with 50+ properties
const targetAuctions = data.auctions.filter(auction =>
  auction.daysUntil <= 30 &&
  auction.propertyCount >= 50
)

// Sort by property count (most opportunities first)
targetAuctions.sort((a, b) => b.propertyCount - a.propertyCount)

console.log(`Found ${targetAuctions.length} high-opportunity auctions`)
```

### 5. Property Research Pipeline

**Scenario:** Batch research all properties in an upcoming auction.

```bash
# Step 1: Get auction details with properties
GET /api/auctions/550e8400-e29b-41d4-a716-446655440000

# Step 2: Get full details for each property
for property in response.data.properties:
  GET /api/properties/${property.id}

# Step 3: Generate reports for approved properties
for property in approved_properties:
  GET /api/properties/${property.id}/report
```

### 6. Alert Management

**Scenario:** Display and acknowledge auction alerts.

```typescript
const response = await fetch('/api/auctions')
const { data } = await response.json()

// Group alerts by severity
const criticalAlerts = data.alerts.filter(a => a.type === 'critical')
const warningAlerts = data.alerts.filter(a => a.type === 'warning')
const infoAlerts = data.alerts.filter(a => a.type === 'info')

// Display critical alerts first
console.log(`${criticalAlerts.length} critical alerts`)
console.log(`${warningAlerts.length} warning alerts`)
console.log(`${infoAlerts.length} info alerts`)

// Acknowledge alerts (separate API endpoint - future feature)
// POST /api/auctions/alerts/${alertId}/acknowledge
```

### 7. County Comparison

**Scenario:** Compare auction opportunities across different counties.

```typescript
const response = await fetch('/api/auctions')
const { data } = await response.json()

// Group by county
const byCounty = {}
data.auctions.forEach(auction => {
  if (!byCounty[auction.county]) {
    byCounty[auction.county] = []
  }
  byCounty[auction.county].push(auction)
})

// Compare counties
Object.entries(byCounty).forEach(([county, auctions]) => {
  const totalProperties = auctions.reduce((sum, a) => sum + a.propertyCount, 0)
  console.log(`${county}: ${auctions.length} auctions, ${totalProperties} properties`)
})
```

---

## Related APIs

- **[Properties API](./properties.md)** - Property details and enrichment data
- **[Counties API](./counties.md)** - County information and research data
- **[Documents API](./documents.md)** - Property lists and legal documents
- **[Alerts API](./alerts.md)** - Alert management (future)

---

## Notes

### Alert System

- Alerts are automatically generated by the Auction Monitor Agent (Agent 10)
- Only unacknowledged alerts are returned in GET /api/auctions
- Alert types: `registration_deadline`, `auction_imminent`, `new_auction`, `property_list_available`
- Severity levels: `info`, `warning`, `critical`

### Urgency Calculation

Urgency levels help prioritize auction preparation:
- **Critical** (≤7 days): Immediate action required
- **Warning** (8-14 days): Begin preparation
- **Upcoming** (15-30 days): Monitor closely
- **Scheduled** (>30 days): Awareness only

### Registration Status

Registration status helps track registration windows:
- **Urgent** (1-3 days): Register immediately
- **Soon** (4-7 days): Register soon
- **Open** (>7 days): Registration available
- **Closed** (deadline passed): Too late to register
- **Unknown** (no deadline): Check manually

### Property Limits

The detail endpoint limits properties to 50 for performance. To access all properties:
1. Use the property counts in `propertyStats.totalProperties`
2. Query the Properties API with county filter
3. Use the Documents API to download full property lists

### Future Enhancements

- **Alert Acknowledgment:** POST endpoint to acknowledge alerts
- **Auction Subscriptions:** Subscribe to specific counties or platforms
- **Bidding History:** Track past bids and results
- **Calendar Export:** iCal/Google Calendar integration
- **SMS Notifications:** Text alerts for urgent deadlines
- **Comparative Analysis:** Side-by-side auction comparisons

---

**Need help?** See the [API Overview](./README.md) or [Properties API](./properties.md).
