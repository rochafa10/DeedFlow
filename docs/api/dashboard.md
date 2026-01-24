# Dashboard API

The Dashboard API provides endpoints for retrieving system-wide statistics, pipeline metrics, upcoming auctions, bottlenecks, and county progress data for the Tax Deed Flow application.

## Table of Contents

- [Overview](#overview)
- [Endpoints](#endpoints)
  - [GET /api/dashboard/stats](#get-apidashboardstats)
- [Data Models](#data-models)
- [Common Use Cases](#common-use-cases)

---

## Overview

The Dashboard API aggregates data from multiple tables to provide a comprehensive view of the tax auction property pipeline. It tracks property progression through research, enrichment, validation, and approval stages.

**Base Path:** `/api/dashboard`

**Total Endpoints:** 1

**Authentication:** Required for all endpoints

**Database Tables:**
- `counties` - County counts
- `properties` - Property counts and pipeline stats
- `regrid_data` - Enrichment completion
- `property_visual_validation` - Validation and approval status
- `upcoming_sales` - Auction dates and counts
- `orchestration_sessions` - Recent activity (planned)

**Database Functions:**
- `get_county_progress_for_dashboard()` - RPC function for county-level metrics

---

## Endpoints

### GET /api/dashboard/stats

Returns comprehensive dashboard statistics including property counts, pipeline funnel metrics, upcoming auctions, bottlenecks, and county-level progress.

**Authentication:** None required for GET (planned for future releases)

**HTTP Method:** `GET`

**URL:** `/api/dashboard/stats`

**Query Parameters:** None

**Request Example:**

```bash
curl -X GET https://your-domain.com/api/dashboard/stats
```

**Response Format:**

```json
{
  "data": {
    "stats": {
      "counties": {
        "total": 12,
        "trend": "12 researched"
      },
      "properties": {
        "total": 7375,
        "trend": "In pipeline"
      },
      "approved": {
        "total": 156,
        "percentage": "2.1%"
      },
      "pending": {
        "total": 7219,
        "percentage": "97.9%"
      },
      "auctions": {
        "total": 3,
        "urgency": "urgent"
      }
    },
    "funnel": {
      "parsed": 7375,
      "enriched": 17,
      "validated": 17,
      "approved": 156
    },
    "upcomingAuctions": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "county": "Westmoreland",
        "state": "PA",
        "date": "Jan 16, 2026",
        "daysUntil": 7,
        "propertyCount": 172
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "county": "Blair",
        "state": "PA",
        "date": "Mar 11, 2026",
        "daysUntil": 62,
        "propertyCount": 252
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "county": "Somerset",
        "state": "PA",
        "date": "Sep 08, 2026",
        "daysUntil": 242,
        "propertyCount": 2663
      }
    ],
    "bottlenecks": [
      {
        "title": "Regrid Enrichment",
        "count": 7358,
        "severity": "critical",
        "message": "Properties waiting for Regrid data"
      },
      {
        "title": "Visual Validation",
        "count": 17,
        "severity": "warning",
        "message": "Properties ready for validation"
      }
    ],
    "recentActivity": [],
    "countyProgress": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "county": "Westmoreland",
        "state": "PA",
        "total": 172,
        "regridCount": 0,
        "regridPercentage": 0,
        "validated": 0,
        "approved": 0,
        "daysUntilAuction": 7
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "county": "Blair",
        "state": "PA",
        "total": 845,
        "regridCount": 17,
        "regridPercentage": 2,
        "validated": 17,
        "approved": 0,
        "daysUntilAuction": 62
      }
    ]
  },
  "source": "database"
}
```

**Response Fields:**

#### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `data` | `DashboardData` | Complete dashboard data object |
| `source` | `string` | Data source: `"database"` or `"mock"` |
| `error` | `string` (optional) | Error message if database query failed |

#### DashboardData Object

| Field | Type | Description |
|-------|------|-------------|
| `stats` | `DashboardStats` | High-level statistics for dashboard cards |
| `funnel` | `PipelineFunnel` | Property counts at each pipeline stage |
| `upcomingAuctions` | `UpcomingAuction[]` | Next 5 upcoming auctions sorted by date |
| `bottlenecks` | `Bottleneck[]` | Pipeline bottlenecks requiring attention |
| `recentActivity` | `ActivityItem[]` | Recent system activity (planned) |
| `countyProgress` | `CountyProgress[]` | Per-county pipeline progress |

#### DashboardStats Object

| Field | Type | Description |
|-------|------|-------------|
| `counties` | `object` | County statistics |
| `counties.total` | `number` | Total number of counties researched |
| `counties.trend` | `string` | County trend description (e.g., "12 researched") |
| `properties` | `object` | Property statistics |
| `properties.total` | `number` | Total number of properties in pipeline |
| `properties.trend` | `string` | Property trend description (e.g., "In pipeline") |
| `approved` | `object` | Approved property statistics |
| `approved.total` | `number` | Number of approved properties |
| `approved.percentage` | `string` | Percentage of total properties (e.g., "2.1%") |
| `pending` | `object` | Pending property statistics |
| `pending.total` | `number` | Number of properties not yet approved |
| `pending.percentage` | `string` | Percentage of total properties (e.g., "97.9%") |
| `auctions` | `object` | Auction statistics |
| `auctions.total` | `number` | Number of upcoming auctions (urgent if within 7 days) |
| `auctions.urgency` | `"urgent" \| "normal"` | Urgency level based on upcoming auction dates |

#### PipelineFunnel Object

| Field | Type | Description |
|-------|------|-------------|
| `parsed` | `number` | Properties extracted from PDFs |
| `enriched` | `number` | Properties enriched with Regrid data |
| `validated` | `number` | Properties that have been visually validated |
| `approved` | `number` | Properties approved as investable |

#### UpcomingAuction Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique auction ID (UUID) |
| `county` | `string` | County name |
| `state` | `string` | State code (e.g., "PA") |
| `date` | `string` | Formatted sale date (e.g., "Jan 16, 2026") |
| `daysUntil` | `number` | Days until auction from current date |
| `propertyCount` | `number` | Number of properties in this auction |

#### Bottleneck Object

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Bottleneck name (e.g., "Regrid Enrichment") |
| `count` | `number` | Number of properties affected |
| `severity` | `"critical" \| "warning" \| "info"` | Severity level |
| `message` | `string` | Descriptive message |

**Bottleneck Severity Rules:**
- **Regrid Enrichment:** `critical` if >1000 properties, otherwise `warning`
- **Visual Validation:** `critical` if >100 properties, otherwise `warning`

#### ActivityItem Object (Planned)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique activity ID |
| `action` | `string` | Action type (e.g., "Session completed") |
| `details` | `string` | Activity details |
| `time` | `string` | Formatted time (e.g., "10:32 AM") |
| `timestamp` | `Date` | ISO timestamp |

*Note: `recentActivity` currently returns empty array. Implementation planned from `orchestration_sessions` table.*

#### CountyProgress Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | County ID (UUID) |
| `county` | `string` | County name |
| `state` | `string` | State code |
| `total` | `number` | Total properties for this county |
| `regridCount` | `number` | Properties with Regrid data |
| `regridPercentage` | `number` | Percentage enriched (0-100) |
| `validated` | `number` | Properties visually validated |
| `approved` | `number` | Properties approved as investable |
| `daysUntilAuction` | `number \| null` | Days until next auction, or null if none scheduled |

**Response Status Codes:**

| Status Code | Description |
|-------------|-------------|
| `200` | Success - Returns dashboard data |
| `500` | Server Error - Returns mock data with error message |

**Error Handling:**

The endpoint is designed to never fail completely. If database queries fail:
- Returns HTTP 200 status
- Includes `source: "mock"` field
- Includes `error` field with error description
- Returns mock data for development/testing

**Mock Data Response Example:**

```json
{
  "data": {
    "stats": {
      "counties": { "total": 12, "trend": "+2 this week" },
      "properties": { "total": 7375, "trend": "+842 new" },
      "approved": { "total": 156, "percentage": "2.1%" },
      "pending": { "total": 7219, "percentage": "97.9%" },
      "auctions": { "total": 3, "urgency": "urgent" }
    },
    "funnel": {
      "parsed": 7375,
      "enriched": 17,
      "validated": 0,
      "approved": 0
    },
    "upcomingAuctions": [...],
    "bottlenecks": [...],
    "recentActivity": [...],
    "countyProgress": [...]
  },
  "source": "mock",
  "error": "Failed to fetch from database"
}
```

---

## Data Models

### DashboardData

The complete dashboard data structure combining all metrics and statistics.

```typescript
interface DashboardData {
  stats: DashboardStats
  funnel: PipelineFunnel
  upcomingAuctions: UpcomingAuction[]
  bottlenecks: Bottleneck[]
  recentActivity: ActivityItem[]
  countyProgress: CountyProgress[]
}
```

### DashboardStats

High-level statistics for dashboard summary cards.

```typescript
interface DashboardStats {
  counties: {
    total: number
    trend: string
  }
  properties: {
    total: number
    trend: string
  }
  approved: {
    total: number
    percentage: string
  }
  pending: {
    total: number
    percentage: string
  }
  auctions: {
    total: number
    urgency: "urgent" | "normal"
  }
}
```

### PipelineFunnel

Property counts at each stage of the pipeline.

```typescript
interface PipelineFunnel {
  parsed: number      // Properties extracted from PDFs
  enriched: number    // Properties with Regrid data
  validated: number   // Properties visually validated
  approved: number    // Properties approved for investment
}
```

### UpcomingAuction

Information about upcoming tax auctions.

```typescript
interface UpcomingAuction {
  id: string
  county: string
  state: string
  date: string          // Formatted: "MMM DD, YYYY"
  daysUntil: number
  propertyCount: number
}
```

### Bottleneck

Pipeline bottleneck requiring attention.

```typescript
interface Bottleneck {
  title: string
  count: number
  severity: "critical" | "warning" | "info"
  message: string
}
```

### ActivityItem

Recent system activity (planned feature).

```typescript
interface ActivityItem {
  id: string
  action: string
  details: string
  time: string          // Formatted: "HH:MM AM/PM"
  timestamp: Date
}
```

### CountyProgress

Per-county pipeline progress metrics.

```typescript
interface CountyProgress {
  id: string
  county: string
  state: string
  total: number
  regridCount: number
  regridPercentage: number      // 0-100
  validated: number
  validated: number
  approved: number
  daysUntilAuction: number | null
}
```

---

## Common Use Cases

### 1. Dashboard Overview Display

Display system-wide statistics on the main dashboard.

```typescript
// Fetch dashboard data
const response = await fetch('/api/dashboard/stats')
const { data, source } = await response.json()

// Display stats cards
console.log(`Counties: ${data.stats.counties.total}`)
console.log(`Properties: ${data.stats.properties.total}`)
console.log(`Approved: ${data.stats.approved.total} (${data.stats.approved.percentage})`)
console.log(`Pending: ${data.stats.pending.total} (${data.stats.pending.percentage})`)
console.log(`Auctions: ${data.stats.auctions.total} (${data.stats.auctions.urgency})`)

// Check data source
if (source === 'mock') {
  console.warn('Using mock data - database connection may be unavailable')
}
```

**Expected Output:**
```
Counties: 12
Properties: 7375
Approved: 156 (2.1%)
Pending: 7219 (97.9%)
Auctions: 3 (urgent)
```

### 2. Pipeline Funnel Visualization

Display property progression through the pipeline.

```typescript
const response = await fetch('/api/dashboard/stats')
const { data } = await response.json()

const funnel = data.funnel
console.log('Pipeline Funnel:')
console.log(`  Parsed: ${funnel.parsed}`)
console.log(`  Enriched: ${funnel.enriched} (${((funnel.enriched/funnel.parsed)*100).toFixed(1)}%)`)
console.log(`  Validated: ${funnel.validated} (${((funnel.validated/funnel.parsed)*100).toFixed(1)}%)`)
console.log(`  Approved: ${funnel.approved} (${((funnel.approved/funnel.parsed)*100).toFixed(1)}%)`)
```

**Expected Output:**
```
Pipeline Funnel:
  Parsed: 7375
  Enriched: 17 (0.2%)
  Validated: 17 (0.2%)
  Approved: 156 (2.1%)
```

### 3. Upcoming Auctions List

Display next 5 upcoming auctions with urgency indicators.

```typescript
const response = await fetch('/api/dashboard/stats')
const { data } = await response.json()

console.log('Upcoming Auctions:')
data.upcomingAuctions.forEach(auction => {
  const urgent = auction.daysUntil <= 7 ? '🔴 URGENT' : ''
  console.log(`  ${auction.county}, ${auction.state} - ${auction.date} (${auction.daysUntil} days) - ${auction.propertyCount} properties ${urgent}`)
})
```

**Expected Output:**
```
Upcoming Auctions:
  Westmoreland, PA - Jan 16, 2026 (7 days) - 172 properties 🔴 URGENT
  Blair, PA - Mar 11, 2026 (62 days) - 252 properties
  Somerset, PA - Sep 08, 2026 (242 days) - 2663 properties
```

### 4. Bottleneck Identification

Identify and prioritize pipeline bottlenecks.

```typescript
const response = await fetch('/api/dashboard/stats')
const { data } = await response.json()

console.log('Pipeline Bottlenecks:')
data.bottlenecks
  .sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
  .forEach(bottleneck => {
    const icon = bottleneck.severity === 'critical' ? '🔴' :
                 bottleneck.severity === 'warning' ? '🟡' : 'ℹ️'
    console.log(`  ${icon} ${bottleneck.title}: ${bottleneck.count} - ${bottleneck.message}`)
  })
```

**Expected Output:**
```
Pipeline Bottlenecks:
  🔴 Regrid Enrichment: 7358 - Properties waiting for Regrid data
  🟡 Visual Validation: 17 - Properties ready for validation
```

### 5. County Progress Tracking

Track per-county progress with auction deadlines.

```typescript
const response = await fetch('/api/dashboard/stats')
const { data } = await response.json()

// Sort by days until auction (most urgent first)
const sortedCounties = data.countyProgress
  .filter(c => c.daysUntilAuction !== null)
  .sort((a, b) => a.daysUntilAuction - b.daysUntilAuction)

console.log('County Progress (by urgency):')
sortedCounties.forEach(county => {
  console.log(`  ${county.county}, ${county.state}:`)
  console.log(`    Total: ${county.total} properties`)
  console.log(`    Enriched: ${county.regridCount} (${county.regridPercentage}%)`)
  console.log(`    Validated: ${county.validated}`)
  console.log(`    Approved: ${county.approved}`)
  console.log(`    Auction in: ${county.daysUntilAuction} days`)
})
```

**Expected Output:**
```
County Progress (by urgency):
  Westmoreland, PA:
    Total: 172 properties
    Enriched: 0 (0%)
    Validated: 0
    Approved: 0
    Auction in: 7 days
  Blair, PA:
    Total: 845 properties
    Enriched: 17 (2%)
    Validated: 17
    Approved: 0
    Auction in: 62 days
```

### 6. Dashboard Refresh

Implement automatic dashboard refresh with error handling.

```typescript
async function fetchDashboard() {
  try {
    const response = await fetch('/api/dashboard/stats')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const { data, source, error } = await response.json()

    if (source === 'mock') {
      console.warn('⚠️ Using mock data:', error || 'Database unavailable')
    }

    return data
  } catch (err) {
    console.error('Failed to fetch dashboard:', err)
    return null
  }
}

// Refresh every 30 seconds
setInterval(async () => {
  const data = await fetchDashboard()
  if (data) {
    // Update UI with new data
    updateDashboard(data)
  }
}, 30000)
```

### 7. Auction Urgency Alert

Alert users about upcoming urgent auctions.

```typescript
const response = await fetch('/api/dashboard/stats')
const { data } = await response.json()

if (data.stats.auctions.urgency === 'urgent') {
  const urgentAuctions = data.upcomingAuctions.filter(a => a.daysUntil <= 7)

  console.log('⚠️ URGENT AUCTIONS WITHIN 7 DAYS:')
  urgentAuctions.forEach(auction => {
    console.log(`  📍 ${auction.county}, ${auction.state}`)
    console.log(`     Date: ${auction.date} (${auction.daysUntil} days)`)
    console.log(`     Properties: ${auction.propertyCount}`)
  })
}
```

**Expected Output:**
```
⚠️ URGENT AUCTIONS WITHIN 7 DAYS:
  📍 Westmoreland, PA
     Date: Jan 16, 2026 (7 days)
     Properties: 172
```

---

## Implementation Notes

### Data Aggregation

The endpoint performs multiple parallel Supabase queries using `Promise.all()` for optimal performance:

1. **Counties Count:** Total researched counties
2. **Properties Count:** Total properties in pipeline
3. **Approved Count:** Properties with `validation_status = 'approved'`
4. **Upcoming Auctions:** Next 90 days from `upcoming_sales` table
5. **Regrid Count:** Properties with enrichment data
6. **Validated Count:** Properties with validation records
7. **County Progress:** RPC function `get_county_progress_for_dashboard()`

### Fallback Strategy

The endpoint implements a graceful degradation strategy:

1. **Primary:** Fetch real data from Supabase
2. **Fallback 1:** Return mock data if Supabase is not configured
3. **Fallback 2:** Return mock data if queries fail (with error message)
4. **Always:** Return HTTP 200 status

This ensures the frontend never encounters a complete failure.

### Performance Considerations

- All database queries run in parallel
- County progress uses optimized RPC function
- Response limited to top 5 upcoming auctions
- Mock data available for development without database

### Future Enhancements

- **Recent Activity:** Implement from `orchestration_sessions` table
- **Pagination:** Add pagination for county progress
- **Caching:** Consider caching for frequently accessed data
- **Authentication:** Add auth requirements for production
- **Filtering:** Add query parameters for date ranges and county filters
