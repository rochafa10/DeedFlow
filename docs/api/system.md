# System Management API

The System Management API provides endpoints for monitoring orchestration sessions, data integrity audits, and external API health checks.

## Table of Contents

- [Overview](#overview)
- [Endpoints](#endpoints)
  - [GET /api/orchestration](#get-apiorchestration)
  - [GET /api/data-integrity](#get-apidata-integrity)
  - [GET /api/health/apis](#get-apihealthapis)
- [Data Models](#data-models)
- [Common Use Cases](#common-use-cases)

---

## Overview

The System Management API provides comprehensive system monitoring and health check capabilities for Tax Deed Flow. It enables tracking of orchestration sessions, agent assignments, data integrity audits, and external API service status.

**Base Paths:**
- `/api/orchestration`
- `/api/data-integrity`
- `/api/health/apis`

**Total Endpoints:** 3

**Authentication:** None required (read-only endpoints)

**Database Tables:**
- `orchestration_sessions` - Master orchestrator sessions
- `agent_assignments` - Work delegated to agents
- `batch_jobs` - Batch processing jobs
- `pipeline_metrics` - Throughput tracking
- `properties` - Property records for integrity checks
- `regrid_data` - Regrid enrichment data
- `property_visual_validation` - Visual validation records
- `counties` - County information

---

## Endpoints

### GET /api/orchestration

Returns orchestration sessions, work queue, agent assignments, pipeline statistics, and session planning recommendations.

**Authentication:** None required

**HTTP Method:** `GET`

**URL:** `/api/orchestration`

**Query Parameters:** None

**Description:**

This endpoint retrieves comprehensive orchestration data including:
- Active and recent orchestration sessions (last 20)
- Agent assignments with progress tracking (last 50)
- Prioritized work queue based on pipeline gaps
- Session plan recommendations (optimized for Max $200 context limits)
- Pipeline bottleneck detection
- Active agent status monitoring
- Real-time pipeline statistics

The orchestration system manages the autonomous delegation of work across 11 specialized agents, optimizing pipeline efficiency and tracking progress through batch processing.

**Request Example:**

```bash
curl -X GET https://your-domain.com/api/orchestration
```

**Response Format:**

```json
{
  "data": {
    "activeSession": {
      "id": "session-uuid-1",
      "startedAt": "2024-09-15T10:00:00Z",
      "type": "full_pipeline",
      "status": "active",
      "propertiesProcessed": 127,
      "propertiesFailed": 3,
      "agentsUsed": ["REGRID_SCRAPER", "VISUAL_VALIDATOR"],
      "notes": "Processing Blair County properties"
    },
    "sessions": [
      {
        "id": "session-uuid-1",
        "startedAt": "2024-09-15T10:00:00Z",
        "endedAt": null,
        "type": "full_pipeline",
        "status": "active",
        "triggerSource": "manual",
        "propertiesProcessed": 127,
        "propertiesFailed": 3,
        "agentsUsed": ["REGRID_SCRAPER", "VISUAL_VALIDATOR"],
        "tokenEstimate": 45000,
        "notes": "Processing Blair County properties",
        "workAssigned": 150,
        "workCompleted": 127
      },
      {
        "id": "session-uuid-2",
        "startedAt": "2024-09-14T08:00:00Z",
        "endedAt": "2024-09-14T10:30:00Z",
        "type": "regrid_enrichment",
        "status": "completed",
        "triggerSource": "n8n",
        "propertiesProcessed": 200,
        "propertiesFailed": 0,
        "agentsUsed": ["REGRID_SCRAPER"],
        "tokenEstimate": 35000,
        "notes": "Completed Centre County enrichment",
        "workAssigned": 200,
        "workCompleted": 200
      }
    ],
    "assignments": [
      {
        "id": "assignment-uuid-1",
        "sessionId": "session-uuid-1",
        "agent": "REGRID_SCRAPER",
        "task": "Regrid Scraping - Blair",
        "taskType": "regrid_scraping",
        "county": "Blair",
        "countyId": "county-uuid-blair",
        "state": "PA",
        "priority": 2,
        "status": "in_progress",
        "progress": 85,
        "itemsTotal": 150,
        "itemsProcessed": 127,
        "itemsFailed": 3,
        "executionMethod": "claude",
        "assignedAt": "2024-09-15T10:05:00Z",
        "startedAt": "2024-09-15T10:10:00Z",
        "completedAt": null,
        "errorMessage": null,
        "notes": "Batch 1 of 3 complete"
      }
    ],
    "workQueue": [
      {
        "priority": 1,
        "type": "regrid_scraping",
        "county": "Centre",
        "state": "PA",
        "countyId": "county-uuid-centre",
        "itemsTotal": 89,
        "reason": "89 properties missing Regrid data",
        "batchSize": 50,
        "estimatedBatches": 2,
        "agent": "REGRID_SCRAPER"
      },
      {
        "priority": 2,
        "type": "visual_validation",
        "county": "Blair",
        "state": "PA",
        "countyId": "county-uuid-blair",
        "itemsTotal": 127,
        "reason": "127 properties with Regrid data ready for validation",
        "batchSize": 100,
        "estimatedBatches": 2,
        "agent": "VISUAL_VALIDATOR"
      }
    ],
    "sessionPlan": {
      "recommended": true,
      "maxProperties": 150,
      "maxAgents": 3,
      "totalWork": 216,
      "selectedWork": [
        {
          "type": "regrid_scraping",
          "county": "Centre",
          "state": "PA",
          "items": 89,
          "batches": 2,
          "priority": 1
        },
        {
          "type": "visual_validation",
          "county": "Blair",
          "state": "PA",
          "items": 61,
          "batches": 1,
          "priority": 2
        }
      ],
      "notes": "Optimized for Max $200 plan (150 properties, 3 agents max)"
    },
    "bottlenecks": [
      {
        "id": "bottleneck-regrid",
        "severity": "high",
        "stage": "Regrid Enrichment",
        "description": "7,358 properties missing Regrid data (41% of total)",
        "affectedCount": 7358,
        "recommendation": "Run Regrid scraping in batches of 50",
        "estimatedWork": "~148 batches",
        "priority": 1
      },
      {
        "id": "bottleneck-validation",
        "severity": "medium",
        "stage": "Visual Validation",
        "description": "1,200 properties with Regrid data awaiting validation",
        "affectedCount": 1200,
        "recommendation": "Run visual validation in batches of 100",
        "estimatedWork": "~12 batches",
        "priority": 2
      }
    ],
    "activeAgents": [
      {
        "agent": "REGRID_SCRAPER",
        "status": "active",
        "currentTask": "regrid_scraping",
        "county": "Blair",
        "progress": 85,
        "itemsProcessed": 127,
        "itemsTotal": 150,
        "startedAt": "2024-09-15T10:10:00Z"
      }
    ],
    "pipelineStats": {
      "totalProperties": 17896,
      "withRegrid": 10538,
      "validated": 8234,
      "approved": 6123,
      "activeProperties": 5421,
      "completionRate": 59,
      "regridRate": 59,
      "validationRate": 46
    }
  },
  "source": "database"
}
```

**Response Structure:**

| Section | Type | Description |
|---------|------|-------------|
| `data.activeSession` | Object\|null | Currently active orchestration session |
| `data.sessions` | Array | Recent orchestration sessions (last 20) |
| `data.assignments` | Array | Agent work assignments with progress (last 50) |
| `data.workQueue` | Array | Prioritized work items needing processing |
| `data.sessionPlan` | Object | Recommended session plan optimized for context limits |
| `data.bottlenecks` | Array | Detected pipeline bottlenecks requiring attention |
| `data.activeAgents` | Array | Currently running agents with real-time status |
| `data.pipelineStats` | Object | Overall pipeline statistics and completion rates |
| `source` | String | Data source (`"database"` or `"mock"`) |

**Session Object:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique session identifier (UUID) |
| `startedAt` | String | Session start timestamp (ISO 8601) |
| `endedAt` | String\|null | Session end timestamp (ISO 8601) |
| `type` | String | Session type (`full_pipeline`, `regrid_enrichment`, `validation_only`, etc.) |
| `status` | String | Session status (`active`, `completed`, `paused`, `failed`) |
| `triggerSource` | String | How session was initiated (`manual`, `n8n`, `scheduled`) |
| `propertiesProcessed` | Number | Total properties successfully processed |
| `propertiesFailed` | Number | Total properties that failed processing |
| `agentsUsed` | Array<String> | List of agents used in this session |
| `tokenEstimate` | Number | Estimated token usage for session |
| `notes` | String | Session notes and context |
| `workAssigned` | Number | Total work items assigned |
| `workCompleted` | Number | Total work items completed |

**Assignment Object:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique assignment identifier (UUID) |
| `sessionId` | String | Parent orchestration session ID |
| `agent` | String | Agent name (e.g., `REGRID_SCRAPER`, `VISUAL_VALIDATOR`) |
| `task` | String | Human-readable task description |
| `taskType` | String | Task type (`regrid_scraping`, `visual_validation`, etc.) |
| `county` | String | County name |
| `countyId` | String | County UUID |
| `state` | String | State code (e.g., `PA`) |
| `priority` | Number | Priority level (1-5, lower is higher priority) |
| `status` | String | Assignment status (`pending`, `in_progress`, `completed`, `failed`) |
| `progress` | Number | Completion percentage (0-100) |
| `itemsTotal` | Number | Total items to process |
| `itemsProcessed` | Number | Items successfully processed |
| `itemsFailed` | Number | Items that failed processing |
| `executionMethod` | String | Execution method (`claude`, `n8n`, `hybrid`) |
| `assignedAt` | String | Assignment timestamp (ISO 8601) |
| `startedAt` | String\|null | Start timestamp (ISO 8601) |
| `completedAt` | String\|null | Completion timestamp (ISO 8601) |
| `errorMessage` | String\|null | Error message if failed |
| `notes` | String | Assignment notes |

**Work Queue Item:**

| Field | Type | Description |
|-------|------|-------------|
| `priority` | Number | Priority ranking (1 is highest) |
| `type` | String | Job type (`regrid_scraping`, `visual_validation`, etc.) |
| `county` | String | County name |
| `state` | String | State code |
| `countyId` | String | County UUID |
| `itemsTotal` | Number | Total items requiring processing |
| `reason` | String | Description of why work is needed |
| `batchSize` | Number | Recommended batch size |
| `estimatedBatches` | Number | Estimated number of batches required |
| `agent` | String | Recommended agent for this work |

**Bottleneck Object:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique bottleneck identifier |
| `severity` | String | Severity level (`low`, `medium`, `high`, `critical`) |
| `stage` | String | Pipeline stage affected |
| `description` | String | Human-readable description |
| `affectedCount` | Number | Number of items affected |
| `recommendation` | String | Recommended action to resolve |
| `estimatedWork` | String | Estimated effort required |
| `priority` | Number | Priority ranking (1 is highest) |

**Error Responses:**

```json
{
  "error": "Database not configured",
  "status": 500
}
```

---

### GET /api/data-integrity

Returns comprehensive data integrity audit results, including missing data, consistency issues, pipeline gaps, and fixable issues.

**Authentication:** None required

**HTTP Method:** `GET`

**URL:** `/api/data-integrity`

**Query Parameters:** None

**Description:**

This endpoint performs a comprehensive data integrity audit across the entire property pipeline. It analyzes:
- Missing Regrid data for properties
- Missing property addresses and tax amounts
- Flag consistency mismatches (has_regrid_data vs actual records)
- Properties awaiting visual validation
- Auction status inconsistencies
- Expired properties still marked active
- Orphaned records (properties without counties, Regrid data without properties)

The audit categorizes issues by severity (critical, warning, info) and provides actionable recommendations for each issue type.

**Request Example:**

```bash
curl -X GET https://your-domain.com/api/data-integrity
```

**Response Format:**

```json
{
  "data": {
    "summary": {
      "totalProperties": 17896,
      "totalIssues": 8,
      "criticalIssues": 0,
      "warningIssues": 3,
      "infoIssues": 5,
      "fixableIssues": 2,
      "healthScore": 85
    },
    "issues": [
      {
        "id": "issue-missing-regrid",
        "severity": "critical",
        "category": "Missing Data",
        "title": "Properties missing Regrid data",
        "description": "Properties that need Regrid enrichment for land data and screenshots",
        "affectedCount": 7358,
        "table": "properties",
        "field": "has_regrid_data",
        "fixable": false,
        "action": "Run Regrid scraping batch job",
        "agent": "REGRID_SCRAPER"
      },
      {
        "id": "issue-missing-address",
        "severity": "warning",
        "category": "Missing Data",
        "title": "Properties missing address",
        "description": "Properties without a valid street address - may need manual review or Regrid enrichment",
        "affectedCount": 6221,
        "table": "properties",
        "field": "property_address",
        "fixable": false,
        "action": "Review source documents or enrich via Regrid",
        "agent": "PARSER_AGENT"
      },
      {
        "id": "issue-missing-amount",
        "severity": "warning",
        "category": "Missing Data",
        "title": "Properties missing amount due",
        "description": "Properties without tax amount information",
        "affectedCount": 3711,
        "table": "properties",
        "field": "total_due",
        "fixable": false,
        "action": "Review source documents",
        "agent": "PARSER_AGENT"
      },
      {
        "id": "issue-regrid-flag-mismatch",
        "severity": "critical",
        "category": "Consistency",
        "title": "Regrid flag mismatch",
        "description": "Properties marked as having Regrid data but no corresponding record exists",
        "affectedCount": 0,
        "table": "properties",
        "field": "has_regrid_data",
        "fixable": true,
        "action": "Run fix_regrid_flags() function",
        "agent": "DATA_INTEGRITY_AGENT"
      },
      {
        "id": "issue-needs-validation",
        "severity": "warning",
        "category": "Pipeline Gap",
        "title": "Properties awaiting visual validation",
        "description": "Properties with Regrid data ready for visual validation",
        "affectedCount": 17,
        "table": "property_visual_validation",
        "field": "validation_status",
        "fixable": false,
        "action": "Run visual validation",
        "agent": "VISUAL_VALIDATOR"
      },
      {
        "id": "issue-unknown-auction-status",
        "severity": "info",
        "category": "Missing Data",
        "title": "Properties with unknown auction status",
        "description": "Properties missing sale_type or sale_date preventing status determination",
        "affectedCount": 89,
        "table": "properties",
        "field": "auction_status",
        "fixable": true,
        "action": "Update property auction status",
        "agent": "DATA_INTEGRITY_AGENT"
      },
      {
        "id": "issue-expired-but-active",
        "severity": "warning",
        "category": "Consistency",
        "title": "Expired properties still marked active",
        "description": "Properties with past sale dates still marked as active (non-repository sales)",
        "affectedCount": 12,
        "table": "properties",
        "field": "auction_status",
        "fixable": true,
        "action": "Update auction_status to 'expired'",
        "agent": "DATA_INTEGRITY_AGENT"
      },
      {
        "id": "issue-orphaned-properties",
        "severity": "critical",
        "category": "Orphaned Records",
        "title": "Properties without valid county",
        "description": "Property records referencing non-existent counties",
        "affectedCount": 0,
        "table": "properties",
        "field": "county_id",
        "fixable": false,
        "action": "Manual cleanup required",
        "agent": "DATA_INTEGRITY_AGENT"
      }
    ],
    "pipelineHealth": {
      "regridCoverage": 59,
      "validationCoverage": 46,
      "addressCompleteness": 65,
      "amountCompleteness": 79,
      "auctionStatusAccuracy": 99,
      "overallHealth": 85
    },
    "recommendations": [
      {
        "priority": 1,
        "action": "Run Regrid scraping for 7,358 properties",
        "impact": "Will improve pipeline coverage by 41%",
        "estimatedWork": "~148 batches of 50 properties"
      },
      {
        "priority": 2,
        "action": "Address missing property addresses (6,221 properties)",
        "impact": "Critical for property identification and reporting",
        "estimatedWork": "Review source documents or enrich via Regrid"
      },
      {
        "priority": 3,
        "action": "Run visual validation for 17 properties",
        "impact": "Complete visual validation pipeline",
        "estimatedWork": "~1 batch of 17 properties"
      }
    ],
    "auditMetadata": {
      "executedAt": "2024-09-15T14:30:00Z",
      "executionTime": 1234,
      "dataVersion": "1.0",
      "tablesAnalyzed": 8
    }
  },
  "source": "database"
}
```

**Response Structure:**

| Section | Type | Description |
|---------|------|-------------|
| `data.summary` | Object | High-level audit summary with health score |
| `data.issues` | Array | Detailed list of data integrity issues found |
| `data.pipelineHealth` | Object | Pipeline coverage and completeness metrics |
| `data.recommendations` | Array | Prioritized action recommendations |
| `data.auditMetadata` | Object | Audit execution metadata |
| `source` | String | Data source (`"database"` or `"mock"`) |

**Summary Object:**

| Field | Type | Description |
|-------|------|-------------|
| `totalProperties` | Number | Total properties in database |
| `totalIssues` | Number | Total issues detected |
| `criticalIssues` | Number | Count of critical severity issues |
| `warningIssues` | Number | Count of warning severity issues |
| `infoIssues` | Number | Count of info severity issues |
| `fixableIssues` | Number | Count of issues with automated fixes available |
| `healthScore` | Number | Overall system health (0-100) |

**Issue Object:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique issue identifier |
| `severity` | String | Issue severity (`critical`, `warning`, `info`) |
| `category` | String | Issue category (`Missing Data`, `Consistency`, `Pipeline Gap`, `Orphaned Records`) |
| `title` | String | Short issue title |
| `description` | String | Detailed issue description |
| `affectedCount` | Number | Number of records affected |
| `table` | String | Database table affected |
| `field` | String | Database field affected |
| `fixable` | Boolean | Whether automated fix is available |
| `action` | String | Recommended action to resolve |
| `agent` | String | Responsible agent for resolution |

**Pipeline Health Object:**

| Field | Type | Description |
|-------|------|-------------|
| `regridCoverage` | Number | Percentage of properties with Regrid data (0-100) |
| `validationCoverage` | Number | Percentage of properties validated (0-100) |
| `addressCompleteness` | Number | Percentage of properties with addresses (0-100) |
| `amountCompleteness` | Number | Percentage of properties with tax amounts (0-100) |
| `auctionStatusAccuracy` | Number | Percentage of properties with accurate status (0-100) |
| `overallHealth` | Number | Combined health score (0-100) |

**Recommendation Object:**

| Field | Type | Description |
|-------|------|-------------|
| `priority` | Number | Priority ranking (1 is highest) |
| `action` | String | Recommended action |
| `impact` | String | Expected impact of taking action |
| `estimatedWork` | String | Estimated effort required |

**Error Responses:**

```json
{
  "error": "Database not configured",
  "status": 500
}
```

---

### GET /api/health/apis

Tests connectivity and response times for all external API services used by the report generation system.

**Authentication:** None required

**HTTP Method:** `GET`

**URL:** `/api/health/apis`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `service` | String | No | Test specific service only (e.g., `fema`, `census`, `bls`) |

**Description:**

This endpoint performs health checks on all external API services integrated with Tax Deed Flow:
- **FEMA Flood** - Flood zone mapping
- **Census** - Demographics and population data
- **USGS Seismic** - Earthquake hazard data
- **NASA FIRMS** - Active wildfire detection
- **EPA** - Environmental site information
- **FBI Crime** - State-level crime statistics
- **BLS Employment** - Employment and unemployment data
- **FCC Broadband** - Internet availability
- **NOAA Weather** - Weather and climate data

Each test measures:
- Service availability (ok/error/skipped)
- Response latency in milliseconds
- Sample data to verify functionality
- Error messages if service is unavailable

**Request Examples:**

```bash
# Test all APIs
curl -X GET https://your-domain.com/api/health/apis

# Test specific service
curl -X GET https://your-domain.com/api/health/apis?service=bls
```

**Response Format (All Services):**

```json
{
  "data": {
    "timestamp": "2024-09-15T14:30:00Z",
    "overall": {
      "status": "healthy",
      "totalServices": 9,
      "healthyServices": 8,
      "unhealthyServices": 1,
      "skippedServices": 0,
      "averageLatency": 456
    },
    "services": [
      {
        "service": "FEMA Flood",
        "status": "ok",
        "latency": 234,
        "data": {
          "zone": "X"
        }
      },
      {
        "service": "Census",
        "status": "ok",
        "latency": 567,
        "data": {
          "population": 127089,
          "medianIncome": 52430
        }
      },
      {
        "service": "USGS Seismic",
        "status": "ok",
        "latency": 312,
        "data": {
          "pga": 0.15,
          "hazardLevel": "low"
        }
      },
      {
        "service": "NASA FIRMS",
        "status": "ok",
        "latency": 678,
        "data": {
          "fireCount": 0
        }
      },
      {
        "service": "EPA",
        "status": "ok",
        "latency": 890,
        "data": {
          "siteCount": 3
        }
      },
      {
        "service": "FBI Crime",
        "status": "ok",
        "latency": 445,
        "data": {
          "hasData": true
        }
      },
      {
        "service": "BLS Employment",
        "status": "ok",
        "latency": 523,
        "data": {
          "unemploymentRate": 4.2,
          "nationalRate": 3.8,
          "trend": "stable",
          "economicHealth": "strong"
        }
      },
      {
        "service": "FCC Broadband",
        "status": "ok",
        "latency": 398,
        "data": {
          "hasBroadband": true,
          "providers": 5
        }
      },
      {
        "service": "NOAA Weather",
        "status": "error",
        "latency": 5002,
        "error": "Request timeout after 5000ms"
      }
    ]
  },
  "source": "external_apis"
}
```

**Response Format (Single Service):**

```json
{
  "data": {
    "timestamp": "2024-09-15T14:30:00Z",
    "service": {
      "service": "BLS Employment",
      "status": "ok",
      "latency": 523,
      "data": {
        "unemploymentRate": 4.2,
        "nationalRate": 3.8,
        "trend": "stable",
        "economicHealth": "strong"
      }
    }
  },
  "source": "external_apis"
}
```

**Response Structure:**

| Section | Type | Description |
|---------|------|-------------|
| `data.timestamp` | String | Health check execution timestamp (ISO 8601) |
| `data.overall` | Object | Aggregate health metrics (all services mode only) |
| `data.services` | Array | Individual service test results (all services mode) |
| `data.service` | Object | Single service test result (single service mode) |
| `source` | String | Data source (`"external_apis"`) |

**Overall Status Object:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | String | Overall health status (`healthy`, `degraded`, `unhealthy`) |
| `totalServices` | Number | Total services tested |
| `healthyServices` | Number | Number of services with `ok` status |
| `unhealthyServices` | Number | Number of services with `error` status |
| `skippedServices` | Number | Number of services skipped |
| `averageLatency` | Number | Average response time in milliseconds |

**Service Result Object:**

| Field | Type | Description |
|-------|------|-------------|
| `service` | String | Service name |
| `status` | String | Service status (`ok`, `error`, `skipped`) |
| `latency` | Number | Response time in milliseconds |
| `data` | Object | Sample response data (if successful) |
| `error` | String | Error message (if failed) |

**Supported Services:**

| Service Name | Parameter Value | Test Location | Purpose |
|--------------|----------------|---------------|---------|
| FEMA Flood | `fema` | Altoona, PA | Flood zone data |
| Census | `census` | Blair County, PA | Demographics |
| USGS Seismic | `usgs` | Altoona, PA | Earthquake hazard |
| NASA FIRMS | `nasa` | 50mi radius Altoona | Active fires |
| EPA | `epa` | 5mi radius Altoona | Environmental sites |
| FBI Crime | `fbi` | Pennsylvania | State crime data |
| BLS Employment | `bls` | Pennsylvania | Employment stats |
| FCC Broadband | `fcc` | Altoona, PA | Internet availability |
| NOAA Weather | `noaa` | Altoona, PA | Weather data |

**Test Coordinates:**
- Location: Altoona, PA (Blair County)
- Latitude: 40.5186
- Longitude: -78.3947
- State: PA
- State FIPS: 42
- County FIPS: 013

**Health Status Determination:**

| Overall Status | Condition |
|----------------|-----------|
| `healthy` | All services responding (100% healthy) |
| `degraded` | 75-99% services responding |
| `unhealthy` | Less than 75% services responding |

**Error Responses:**

```json
{
  "error": "Service 'invalid-service' not found",
  "availableServices": ["fema", "census", "usgs", "nasa", "epa", "fbi", "bls", "fcc", "noaa"]
}
```

---

## Data Models

### Orchestration Session

Complete orchestration session tracking work delegation across agents.

```typescript
interface OrchestrationSession {
  id: string                    // UUID
  startedAt: string             // ISO 8601 timestamp
  endedAt: string | null        // ISO 8601 timestamp
  type: string                  // Session type
  status: 'active' | 'completed' | 'paused' | 'failed'
  triggerSource: 'manual' | 'n8n' | 'scheduled'
  propertiesProcessed: number   // Success count
  propertiesFailed: number      // Failure count
  agentsUsed: string[]          // Agent names
  tokenEstimate: number         // Estimated tokens
  notes: string                 // Session notes
  workAssigned: number          // Total work
  workCompleted: number         // Completed work
}
```

### Agent Assignment

Work item assigned to a specific agent.

```typescript
interface AgentAssignment {
  id: string                    // UUID
  sessionId: string             // Parent session UUID
  agent: string                 // Agent name
  task: string                  // Human-readable task
  taskType: string              // Job type
  county: string                // County name
  countyId: string              // County UUID
  state: string                 // State code
  priority: number              // 1-5 (lower is higher)
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number              // 0-100
  itemsTotal: number            // Total items
  itemsProcessed: number        // Processed count
  itemsFailed: number           // Failed count
  executionMethod: 'claude' | 'n8n' | 'hybrid'
  assignedAt: string            // ISO 8601
  startedAt: string | null      // ISO 8601
  completedAt: string | null    // ISO 8601
  errorMessage: string | null   // Error details
  notes: string                 // Assignment notes
}
```

### Data Integrity Issue

Detected data quality or consistency issue.

```typescript
interface DataIntegrityIssue {
  id: string                    // Unique issue ID
  severity: 'critical' | 'warning' | 'info'
  category: 'Missing Data' | 'Consistency' | 'Pipeline Gap' | 'Orphaned Records'
  title: string                 // Short title
  description: string           // Detailed description
  affectedCount: number         // Records affected
  table: string                 // Database table
  field: string                 // Database field
  fixable: boolean              // Auto-fix available
  action: string                // Recommended action
  agent: string                 // Responsible agent
}
```

### API Service Health

External API service health check result.

```typescript
interface ServiceHealth {
  service: string               // Service name
  status: 'ok' | 'error' | 'skipped'
  latency: number               // Response time (ms)
  data?: Record<string, any>    // Sample response
  error?: string                // Error message
}
```

---

## Common Use Cases

### 1. Monitor Active Orchestration Session

Check current orchestration status and active agents:

```typescript
const response = await fetch('/api/orchestration')
const { data } = await response.json()

if (data.activeSession) {
  console.log(`Session ${data.activeSession.id} is active`)
  console.log(`Processed: ${data.activeSession.propertiesProcessed} properties`)
  console.log(`Active agents: ${data.activeSession.agentsUsed.join(', ')}`)
}

// Check active agents
data.activeAgents.forEach(agent => {
  console.log(`${agent.agent}: ${agent.progress}% complete`)
})
```

### 2. Identify Pipeline Bottlenecks

Find and prioritize pipeline gaps:

```typescript
const response = await fetch('/api/orchestration')
const { data } = await response.json()

// High-priority bottlenecks
const criticalBottlenecks = data.bottlenecks.filter(b =>
  b.severity === 'high' || b.severity === 'critical'
)

criticalBottlenecks.forEach(bottleneck => {
  console.log(`⚠️ ${bottleneck.stage}: ${bottleneck.description}`)
  console.log(`   Action: ${bottleneck.recommendation}`)
})
```

### 3. Plan Optimized Work Session

Get recommended work plan for Max $200 context limits:

```typescript
const response = await fetch('/api/orchestration')
const { data } = await response.json()

if (data.sessionPlan.recommended) {
  console.log(`Recommended session plan (${data.sessionPlan.totalWork} items):`)
  data.sessionPlan.selectedWork.forEach(work => {
    console.log(`- ${work.type}: ${work.county}, ${work.state} (${work.items} items, ${work.batches} batches)`)
  })
}
```

### 4. Run Data Integrity Audit

Check overall system health and identify issues:

```typescript
const response = await fetch('/api/data-integrity')
const { data } = await response.json()

console.log(`System Health Score: ${data.summary.healthScore}/100`)
console.log(`Total Issues: ${data.summary.totalIssues}`)
console.log(`Critical: ${data.summary.criticalIssues}`)

// Show critical issues
const criticalIssues = data.issues.filter(i => i.severity === 'critical')
criticalIssues.forEach(issue => {
  console.log(`🚨 ${issue.title}: ${issue.affectedCount} records`)
  console.log(`   Action: ${issue.action}`)
})
```

### 5. Monitor Data Pipeline Health

Track pipeline coverage and completeness:

```typescript
const response = await fetch('/api/data-integrity')
const { data } = await response.json()

const health = data.pipelineHealth
console.log(`Pipeline Health Metrics:`)
console.log(`- Regrid Coverage: ${health.regridCoverage}%`)
console.log(`- Validation Coverage: ${health.validationCoverage}%`)
console.log(`- Address Completeness: ${health.addressCompleteness}%`)
console.log(`- Amount Completeness: ${health.amountCompleteness}%`)
console.log(`- Auction Status Accuracy: ${health.auctionStatusAccuracy}%`)
```

### 6. Verify External API Health

Test all external APIs before generating reports:

```typescript
const response = await fetch('/api/health/apis')
const { data } = await response.json()

console.log(`Overall Status: ${data.overall.status}`)
console.log(`Healthy Services: ${data.overall.healthyServices}/${data.overall.totalServices}`)
console.log(`Average Latency: ${data.overall.averageLatency}ms`)

// Check for unhealthy services
const unhealthy = data.services.filter(s => s.status === 'error')
if (unhealthy.length > 0) {
  console.warn('⚠️ Unhealthy Services:')
  unhealthy.forEach(service => {
    console.warn(`  - ${service.service}: ${service.error}`)
  })
}
```

### 7. Test Specific API Service

Test a single service for troubleshooting:

```typescript
const response = await fetch('/api/health/apis?service=bls')
const { data } = await response.json()

if (data.service.status === 'ok') {
  console.log(`✅ BLS Service: ${data.service.latency}ms`)
  console.log(`Unemployment Rate: ${data.service.data.unemploymentRate}%`)
} else {
  console.error(`❌ BLS Service Error: ${data.service.error}`)
}
```

### 8. Track Agent Progress

Monitor specific agent progress in real-time:

```typescript
const response = await fetch('/api/orchestration')
const { data } = await response.json()

// Find specific agent
const regridAgent = data.activeAgents.find(a => a.agent === 'REGRID_SCRAPER')

if (regridAgent) {
  console.log(`Regrid Scraper Status:`)
  console.log(`- County: ${regridAgent.county}`)
  console.log(`- Progress: ${regridAgent.progress}%`)
  console.log(`- Processed: ${regridAgent.itemsProcessed}/${regridAgent.itemsTotal}`)

  const remaining = regridAgent.itemsTotal - regridAgent.itemsProcessed
  console.log(`- Remaining: ${remaining} properties`)
}
```

### 9. Get Prioritized Work Queue

Retrieve next work items to process:

```typescript
const response = await fetch('/api/orchestration')
const { data } = await response.json()

console.log('Priority Work Queue:')
data.workQueue.slice(0, 5).forEach((item, index) => {
  console.log(`${index + 1}. [Priority ${item.priority}] ${item.type}`)
  console.log(`   County: ${item.county}, ${item.state}`)
  console.log(`   Items: ${item.itemsTotal} (${item.estimatedBatches} batches)`)
  console.log(`   Reason: ${item.reason}`)
})
```

### 10. Get Actionable Recommendations

Retrieve prioritized actions from data integrity audit:

```typescript
const response = await fetch('/api/data-integrity')
const { data } = await response.json()

console.log('Top Recommendations:')
data.recommendations.slice(0, 3).forEach(rec => {
  console.log(`Priority ${rec.priority}: ${rec.action}`)
  console.log(`  Impact: ${rec.impact}`)
  console.log(`  Effort: ${rec.estimatedWork}`)
})
```

---

## Notes

- All endpoints are **read-only** and require no authentication
- Orchestration endpoint may take 2-3 seconds to aggregate all data
- Data integrity audit may take 3-5 seconds for large property datasets
- API health checks test services sequentially (total time ~5-10 seconds)
- Use the `service` parameter on `/api/health/apis` to test individual services quickly
- Health scores are calculated as percentages (100 = perfect health, 0 = critical issues)
- Bottleneck detection uses configurable thresholds (see `orchestrator_priority_rules` table)
- All timestamps are in ISO 8601 format with UTC timezone
