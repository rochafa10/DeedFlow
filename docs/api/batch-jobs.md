# Batch Jobs API

The Batch Jobs API provides endpoints for managing large-scale automated processing tasks, including creating, monitoring, and controlling batch operations like Regrid scraping, visual validation, PDF parsing, and other multi-agent workflows.

## Table of Contents

- [Overview](#overview)
- [Endpoints](#endpoints)
  - [GET /api/batch-jobs](#get-apibatch-jobs)
  - [POST /api/batch-jobs](#post-apibatch-jobs)
  - [GET /api/batch-jobs/[id]](#get-apibatch-jobsid)
  - [PATCH /api/batch-jobs/[id]](#patch-apibatch-jobsid)
  - [DELETE /api/batch-jobs/[id]](#delete-apibatch-jobsid)
- [Data Models](#data-models)
- [Job Types](#job-types)
- [Status Workflow](#status-workflow)
- [Common Use Cases](#common-use-cases)

---

## Overview

The Batch Jobs API enables automation of large-scale processing tasks that would be inefficient to run individually. Batch jobs process items in configurable batches, track progress, handle errors gracefully, and can be paused/resumed.

**Base Path:** `/api/batch-jobs`

**Total Endpoints:** 5

**Authentication:**
- GET endpoints: No authentication required
- POST/PATCH/DELETE endpoints: Requires authentication + CSRF validation
- Role Requirements:
  - **Viewers:** Cannot create, modify, or delete batch jobs
  - **Analysts:** Can create and modify batch jobs
  - **Admins:** Full access including deletion

**Database Tables:**
- `batch_jobs` - Job metadata, status, and progress
- `counties` - County information (joined for context)

**Integration:**
- Triggers n8n workflows when jobs start (e.g., Regrid scraping)
- Supports 8 different job types across the processing pipeline

---

## Endpoints

### GET /api/batch-jobs

Returns a list of batch jobs with county information, progress statistics, and computed metrics. Results are split into active jobs and job history.

**Authentication:** None required

**HTTP Method:** `GET`

**URL:** `/api/batch-jobs`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | (all) | Filter by status: `active`, `completed`, `failed`, or omit for all jobs |
| `limit` | integer | No | 100 | Maximum number of jobs to return |

**Status Filter Values:**
- `active` - Returns jobs with status: `pending`, `in_progress`, or `paused`
- `completed` - Returns only completed jobs
- `failed` - Returns only failed jobs
- (none) - Returns all jobs

**Request Example:**

```bash
# Get all batch jobs
curl -X GET https://your-domain.com/api/batch-jobs

# Get only active jobs
curl -X GET https://your-domain.com/api/batch-jobs?status=active

# Get completed jobs with limit
curl -X GET https://your-domain.com/api/batch-jobs?status=completed&limit=50
```

**Response Format:**

```json
{
  "data": {
    "activeJobs": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Regrid Scraping - Blair",
        "type": "regrid_scraping",
        "county": "Blair",
        "countyId": "county-uuid",
        "state": "PA",
        "status": "running",
        "progress": 45,
        "totalItems": 845,
        "processedItems": 380,
        "failedItems": 5,
        "startedAt": "2024-01-15T10:30:00Z",
        "pausedAt": null,
        "completedAt": null,
        "createdAt": "2024-01-15T10:00:00Z",
        "batchSize": 50,
        "currentBatch": 8,
        "totalBatches": 17,
        "duration": "2h 15m",
        "successRate": 98,
        "errorLog": null,
        "errorCount": 5,
        "estimatedCompletion": null
      }
    ],
    "jobHistory": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Visual Validation - Blair",
        "type": "visual_validation",
        "county": "Blair",
        "countyId": "county-uuid",
        "state": "PA",
        "status": "completed",
        "progress": 100,
        "totalItems": 750,
        "processedItems": 745,
        "failedItems": 5,
        "startedAt": "2024-01-14T08:00:00Z",
        "pausedAt": null,
        "completedAt": "2024-01-14T12:30:00Z",
        "createdAt": "2024-01-14T07:45:00Z",
        "batchSize": 100,
        "currentBatch": 8,
        "totalBatches": 8,
        "duration": "4h 30m",
        "successRate": 99,
        "errorLog": null,
        "errorCount": 5,
        "estimatedCompletion": null
      }
    ],
    "stats": {
      "running": 2,
      "paused": 1,
      "completedToday": 5,
      "successRate": 97
    }
  },
  "source": "database"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `activeJobs` | array | Jobs with status: running, paused, or pending |
| `jobHistory` | array | Jobs with status: completed or failed |
| `stats.running` | integer | Number of currently running jobs |
| `stats.paused` | integer | Number of paused jobs |
| `stats.completedToday` | integer | Number of jobs completed today |
| `stats.successRate` | integer | Average success rate across all completed jobs (percentage) |

**Job Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique job identifier (UUID) |
| `name` | string | Human-readable job name (formatted as "Type - County") |
| `type` | string | Job type identifier (see [Job Types](#job-types)) |
| `county` | string | County name |
| `countyId` | string | County UUID |
| `state` | string | State code (e.g., "PA") |
| `status` | string | Current status: `pending`, `running`, `paused`, `completed`, `failed` |
| `progress` | integer | Completion percentage (0-100) |
| `totalItems` | integer | Total number of items to process |
| `processedItems` | integer | Number of successfully processed items |
| `failedItems` | integer | Number of failed items |
| `startedAt` | string\|null | ISO 8601 timestamp when job started |
| `pausedAt` | string\|null | ISO 8601 timestamp when job was paused |
| `completedAt` | string\|null | ISO 8601 timestamp when job completed |
| `createdAt` | string | ISO 8601 timestamp when job was created |
| `batchSize` | integer | Number of items processed per batch |
| `currentBatch` | integer | Current batch number |
| `totalBatches` | integer | Total number of batches |
| `duration` | string\|null | Human-readable duration (e.g., "2h 15m", "45m") |
| `successRate` | integer | Percentage of successfully processed items |
| `errorLog` | string\|null | Last error message (if any) |
| `errorCount` | integer | Total number of errors encountered |
| `estimatedCompletion` | string\|null | Reserved for future use |

**Error Responses:**

```json
// 500 - Database not configured
{
  "error": "Database not configured"
}

// 500 - Database error
{
  "error": "Database error",
  "message": "Connection timeout"
}
```

---

### POST /api/batch-jobs

Creates a new batch job for automated processing. The API automatically calculates the total number of items to process based on job type and county.

**Authentication:** Required (admin or analyst role)

**CSRF Protection:** Required

**HTTP Method:** `POST`

**URL:** `/api/batch-jobs`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: application/json
X-CSRF-Token: {csrf-token}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `job_type` | string | Yes | Type of job to create (see [Job Types](#job-types)) |
| `county_id` | string | Yes | UUID of the county to process |
| `batch_size` | integer | No | Number of items per batch (default: 50) |
| `total_items` | integer | No | Total items to process (auto-calculated if omitted) |

**Request Example:**

```bash
curl -X POST https://your-domain.com/api/batch-jobs \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: your-csrf-token" \
  -d '{
    "job_type": "regrid_scraping",
    "county_id": "550e8400-e29b-41d4-a716-446655440000",
    "batch_size": 50
  }'
```

**Request Body Example:**

```json
{
  "job_type": "regrid_scraping",
  "county_id": "550e8400-e29b-41d4-a716-446655440000",
  "batch_size": 50
}
```

**Response Format:**

```json
{
  "data": {
    "id": "batch-550e8400-e29b-41d4-a716-446655440000",
    "job_type": "regrid_scraping",
    "county_id": "550e8400-e29b-41d4-a716-446655440000",
    "batch_size": 50,
    "status": "pending",
    "total_items": 845,
    "processed_items": 0,
    "failed_items": 0,
    "current_batch": 0,
    "total_batches": 17,
    "error_count": 0,
    "started_at": null,
    "paused_at": null,
    "completed_at": null,
    "created_at": "2024-01-15T10:00:00Z",
    "last_error": null
  },
  "message": "Batch job created successfully",
  "source": "database"
}
```

**Auto-Calculation of total_items:**

The API automatically calculates the number of items to process based on job type:

| Job Type | Calculation Logic |
|----------|-------------------|
| `regrid_scraping` | Count properties without Regrid data and `auction_status='active'` |
| `visual_validation` | Count properties with Regrid data but no visual validation and `auction_status='active'` |
| `pdf_parsing` | Count documents with `document_type='property_list'` and `parsing_status` in ('pending', 'failed') |
| `title_research`, `property_condition`, `environmental_research`, `bid_strategy` | Count properties with `visual_validation_status='APPROVED'` and `auction_status='active'` |
| Other types | Count all active properties in county |

**Error Responses:**

```json
// 401 - Unauthorized
{
  "error": "Unauthorized",
  "message": "Authentication required"
}

// 403 - Forbidden (viewer role)
{
  "error": "Forbidden",
  "message": "Viewers do not have permission to create batch jobs. Only admins and analysts can create batch jobs."
}

// 400 - Validation error
{
  "error": "Validation error",
  "message": "job_type and county_id are required fields"
}

// 500 - Database error
{
  "error": "Database error",
  "message": "Insert failed: foreign key constraint violation"
}
```

---

### GET /api/batch-jobs/[id]

Retrieves detailed information about a specific batch job by ID.

**Authentication:** None required

**HTTP Method:** `GET`

**URL:** `/api/batch-jobs/{id}`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | UUID of the batch job |

**Request Example:**

```bash
curl -X GET https://your-domain.com/api/batch-jobs/550e8400-e29b-41d4-a716-446655440000
```

**Response Format:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "job_type": "regrid_scraping",
    "county_id": "county-uuid",
    "status": "in_progress",
    "batch_size": 50,
    "total_items": 845,
    "processed_items": 380,
    "failed_items": 5,
    "current_batch": 8,
    "total_batches": 17,
    "last_error": null,
    "error_count": 5,
    "started_at": "2024-01-15T10:30:00Z",
    "paused_at": null,
    "completed_at": null,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T12:45:00Z",
    "counties": {
      "id": "county-uuid",
      "county_name": "Blair",
      "state_code": "PA"
    }
  },
  "source": "database"
}
```

**Response Fields:**

All database fields are returned, including the nested `counties` object with county details.

**Error Responses:**

```json
// 404 - Not found
{
  "error": "Not found",
  "message": "Batch job not found"
}

// 500 - Database error
{
  "error": "Database error",
  "message": "Connection failed"
}
```

---

### PATCH /api/batch-jobs/[id]

Updates a batch job's status, progress, or error information. Commonly used to start, pause, resume, or complete jobs, as well as track processing progress.

**Authentication:** Required (admin or analyst role)

**CSRF Protection:** Required

**HTTP Method:** `PATCH`

**URL:** `/api/batch-jobs/{id}`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: application/json
X-CSRF-Token: {csrf-token}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | UUID of the batch job |

**Request Body:**

All fields are optional - only include fields you want to update:

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | New status: `pending`, `in_progress`, `running`, `paused`, `completed`, `failed` |
| `processed_items` | integer | Number of items processed so far |
| `failed_items` | integer | Number of items that failed processing |
| `current_batch` | integer | Current batch number being processed |
| `last_error` | string | Last error message encountered |
| `error_count` | integer | Total number of errors |

**Status Change Behavior:**

| Status | Auto-set Fields |
|--------|-----------------|
| `in_progress` or `running` | Sets `started_at` to current time (if not already set), clears `paused_at` |
| `paused` | Sets `paused_at` to current time |
| `completed` | Sets `completed_at` to current time |

**Request Examples:**

```bash
# Start a job
curl -X PATCH https://your-domain.com/api/batch-jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: your-csrf-token" \
  -d '{
    "status": "in_progress"
  }'

# Update progress
curl -X PATCH https://your-domain.com/api/batch-jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: your-csrf-token" \
  -d '{
    "processed_items": 450,
    "failed_items": 7,
    "current_batch": 9
  }'

# Pause a job
curl -X PATCH https://your-domain.com/api/batch-jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: your-csrf-token" \
  -d '{
    "status": "paused"
  }'

# Mark job as completed
curl -X PATCH https://your-domain.com/api/batch-jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: your-csrf-token" \
  -d '{
    "status": "completed"
  }'

# Report an error
curl -X PATCH https://your-domain.com/api/batch-jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: your-csrf-token" \
  -d '{
    "last_error": "Regrid API rate limit exceeded",
    "error_count": 15
  }'
```

**Request Body Examples:**

```json
// Start a job
{
  "status": "in_progress"
}

// Update progress during processing
{
  "processed_items": 450,
  "failed_items": 7,
  "current_batch": 9
}

// Pause a job
{
  "status": "paused"
}

// Complete a job
{
  "status": "completed"
}
```

**Response Format:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "job_type": "regrid_scraping",
    "county_id": "county-uuid",
    "status": "in_progress",
    "batch_size": 50,
    "total_items": 845,
    "processed_items": 450,
    "failed_items": 7,
    "current_batch": 9,
    "total_batches": 17,
    "last_error": null,
    "error_count": 7,
    "started_at": "2024-01-15T10:30:00Z",
    "paused_at": null,
    "completed_at": null,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T13:22:00Z",
    "counties": {
      "id": "county-uuid",
      "county_name": "Blair",
      "state_code": "PA"
    }
  },
  "message": "Batch job updated successfully",
  "source": "database",
  "n8n_triggered": true,
  "n8n_error": null
}
```

**n8n Integration:**

When a job with `job_type='regrid_scraping'` is started (status changed to `in_progress`), the API automatically triggers the n8n Regrid scraper webhook:

- **Webhook URL:** `https://n8n.lfb-investments.com/webhook/regrid-scraper`
- **Method:** POST
- **Payload:** `{ "job_id": "{id}", "action": "start" }`
- **Response Fields:**
  - `n8n_triggered`: `true` if webhook was successfully triggered, `false` otherwise
  - `n8n_error`: Error message if webhook failed, `null` if successful

**Error Responses:**

```json
// 401 - Unauthorized
{
  "error": "Unauthorized",
  "message": "Authentication required"
}

// 403 - Forbidden (viewer role)
{
  "error": "Forbidden",
  "message": "Viewers cannot modify batch jobs"
}

// 400 - No fields to update
{
  "error": "Validation error",
  "message": "No valid fields to update"
}

// 404 - Not found
{
  "error": "Not found",
  "message": "Batch job not found"
}

// 500 - Database error
{
  "error": "Database error",
  "message": "Update failed"
}
```

---

### DELETE /api/batch-jobs/[id]

Deletes a batch job. This operation is restricted to admin users only.

**Authentication:** Required (admin role only)

**CSRF Protection:** Required

**HTTP Method:** `DELETE`

**URL:** `/api/batch-jobs/{id}`

**Headers:**

```
Authorization: Bearer {token}
X-CSRF-Token: {csrf-token}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | UUID of the batch job to delete |

**Request Example:**

```bash
curl -X DELETE https://your-domain.com/api/batch-jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer demo-token" \
  -H "X-CSRF-Token: your-csrf-token"
```

**Response Format:**

```json
{
  "message": "Batch job deleted successfully"
}
```

**Error Responses:**

```json
// 401 - Unauthorized
{
  "error": "Unauthorized",
  "message": "Authentication required"
}

// 403 - Forbidden (non-admin)
{
  "error": "Forbidden",
  "message": "Only admins can delete batch jobs"
}

// 500 - Database error
{
  "error": "Database error",
  "message": "Delete failed"
}
```

---

## Data Models

### BatchJob

The core batch job data model:

```typescript
interface BatchJob {
  id: string                    // UUID
  job_type: string              // Type of batch job (see Job Types)
  county_id: string             // UUID of county being processed
  status: JobStatus             // Current job status
  batch_size: number            // Items per batch
  total_items: number           // Total items to process
  processed_items: number       // Successfully processed items
  failed_items: number          // Failed items
  current_batch: number         // Current batch number (1-based)
  total_batches: number         // Total number of batches
  last_error: string | null     // Last error message
  error_count: number           // Total errors encountered
  started_at: string | null     // ISO 8601 timestamp
  paused_at: string | null      // ISO 8601 timestamp
  completed_at: string | null   // ISO 8601 timestamp
  created_at: string            // ISO 8601 timestamp
  updated_at: string            // ISO 8601 timestamp
  counties?: {                  // Joined county data
    id: string
    county_name: string
    state_code: string
  }
}
```

### JobStatus

Valid job status values:

```typescript
type JobStatus =
  | 'pending'      // Job created but not started
  | 'in_progress'  // Job currently processing
  | 'running'      // Alias for in_progress (frontend display)
  | 'paused'       // Job paused by user
  | 'completed'    // Job finished successfully
  | 'failed'       // Job failed with errors
```

---

## Job Types

The system supports 8 different batch job types across the property processing pipeline:

| Job Type | Description | Typical Batch Size | Items Processed |
|----------|-------------|-------------------|-----------------|
| `regrid_scraping` | Scrape land data and screenshots from Regrid | 50 | Properties without Regrid data |
| `visual_validation` | Validate property images to filter non-investable properties | 100 | Properties with Regrid data but no validation |
| `pdf_parsing` | Extract property data from county PDF documents | 5 | Property list PDFs needing parsing |
| `county_research` | Research county auction information | 10 | Counties needing research |
| `title_research` | Research property title and lien information | 20 | Approved properties needing title research |
| `property_condition` | Assess physical property condition | 25 | Approved properties needing condition assessment |
| `environmental_research` | Research environmental risks and hazards | 25 | Approved properties needing environmental assessment |
| `bid_strategy` | Calculate optimal bid amounts | 50 | Approved properties needing bid strategy |

**Formatted Names:**

The API automatically formats job types for display:
- `regrid_scraping` → "Regrid Scraping"
- `visual_validation` → "Visual Validation"
- `pdf_parsing` → "PDF Parsing"
- etc.

---

## Status Workflow

Typical batch job lifecycle:

```
┌──────────┐
│ pending  │ ← Job created
└────┬─────┘
     │
     ↓ User starts job
┌──────────────┐
│ in_progress  │ ← Processing items in batches
└──────┬───────┘
       │
       ├──→ User pauses ──→ ┌─────────┐
       │                    │ paused  │
       │                    └────┬────┘
       │                         │
       │                         ↓ User resumes
       │                    ┌──────────────┐
       │                    │ in_progress  │
       │                    └──────┬───────┘
       │                           │
       ↓ All items processed      ↓
┌──────────────┐           ┌──────────┐
│  completed   │           │  failed  │ ← Too many errors
└──────────────┘           └──────────┘
```

**Status Transitions:**

- `pending` → `in_progress`: User starts the job
- `in_progress` → `paused`: User pauses the job
- `paused` → `in_progress`: User resumes the job
- `in_progress` → `completed`: All items processed successfully
- `in_progress` → `failed`: Job encounters critical errors

---

## Common Use Cases

### 1. Create and Monitor a Regrid Scraping Job

**Step 1: Create the job**

```bash
curl -X POST https://your-domain.com/api/batch-jobs \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -d '{
    "job_type": "regrid_scraping",
    "county_id": "550e8400-e29b-41d4-a716-446655440000",
    "batch_size": 50
  }'
```

**Response:**
```json
{
  "data": {
    "id": "job-123",
    "status": "pending",
    "total_items": 845,
    "total_batches": 17
  }
}
```

**Step 2: Start the job**

```bash
curl -X PATCH https://your-domain.com/api/batch-jobs/job-123 \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

**Step 3: Monitor progress**

```bash
curl -X GET https://your-domain.com/api/batch-jobs/job-123
```

**Response:**
```json
{
  "data": {
    "id": "job-123",
    "status": "in_progress",
    "progress": 45,
    "processed_items": 380,
    "current_batch": 8,
    "total_batches": 17
  }
}
```

---

### 2. Track All Active Jobs

```bash
curl -X GET https://your-domain.com/api/batch-jobs?status=active
```

**Response:**
```json
{
  "data": {
    "activeJobs": [
      {
        "id": "job-123",
        "name": "Regrid Scraping - Blair",
        "status": "running",
        "progress": 45
      },
      {
        "id": "job-456",
        "name": "Visual Validation - Centre",
        "status": "paused",
        "progress": 67
      }
    ],
    "stats": {
      "running": 1,
      "paused": 1
    }
  }
}
```

---

### 3. Pause and Resume a Job

**Pause:**

```bash
curl -X PATCH https://your-domain.com/api/batch-jobs/job-123 \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -d '{"status": "paused"}'
```

**Resume:**

```bash
curl -X PATCH https://your-domain.com/api/batch-jobs/job-123 \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

---

### 4. Handle Errors During Processing

**Report error and continue:**

```bash
curl -X PATCH https://your-domain.com/api/batch-jobs/job-123 \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -d '{
    "processed_items": 450,
    "failed_items": 12,
    "last_error": "Regrid API rate limit exceeded at item 462",
    "error_count": 12
  }'
```

---

### 5. Complete a Job

**Mark as completed:**

```bash
curl -X PATCH https://your-domain.com/api/batch-jobs/job-123 \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "processed_items": 845,
    "failed_items": 15
  }'
```

**Response:**
```json
{
  "data": {
    "id": "job-123",
    "status": "completed",
    "progress": 100,
    "processed_items": 845,
    "failed_items": 15,
    "successRate": 98,
    "duration": "4h 23m",
    "completed_at": "2024-01-15T15:30:00Z"
  },
  "message": "Batch job updated successfully"
}
```

---

### 6. View Job History and Performance

```bash
curl -X GET https://your-domain.com/api/batch-jobs?status=completed&limit=20
```

**Response:**
```json
{
  "data": {
    "jobHistory": [
      {
        "id": "job-123",
        "name": "Regrid Scraping - Blair",
        "status": "completed",
        "duration": "4h 23m",
        "successRate": 98,
        "completedAt": "2024-01-15T15:30:00Z"
      }
    ],
    "stats": {
      "completedToday": 5,
      "successRate": 97
    }
  }
}
```

---

## Best Practices

### ✅ DO

- **Set appropriate batch sizes** based on job type:
  - PDF parsing: 5-10 (resource intensive)
  - Regrid scraping: 50 (API rate limits)
  - Visual validation: 100 (fast processing)
- **Monitor error rates** and pause jobs if errors exceed acceptable thresholds
- **Use status tracking** to resume jobs after interruptions
- **Update progress regularly** so users can monitor jobs in real-time
- **Let the API auto-calculate total_items** unless you have a specific reason to override

### ❌ DON'T

- Don't create jobs with batch sizes larger than the total items
- Don't start multiple jobs for the same county and job type simultaneously
- Don't delete jobs that are currently running - pause them first
- Don't ignore error counts - investigate and fix underlying issues
- Don't hardcode total_items - let the API calculate based on current data

---

## Integration Notes

### n8n Workflow Integration

When Regrid scraping jobs are started, the API automatically triggers the n8n workflow:

```javascript
// Automatic webhook trigger on job start
POST https://n8n.lfb-investments.com/webhook/regrid-scraper
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "start"
}
```

**Check webhook status in response:**

```json
{
  "n8n_triggered": true,
  "n8n_error": null
}
```

If `n8n_triggered` is `false`, check `n8n_error` for the failure reason.

### Database Views

Use these database views for advanced batch job queries:

- `vw_active_batch_jobs` - All active jobs with enriched data
- `vw_batch_job_summary` - Statistical summary by job type
- `get_pending_work_summary()` - See what work is pending across all job types

### Master Orchestrator Integration

The Batch Jobs API is integrated with the Master Orchestrator Agent for autonomous work delegation. See the [Orchestration API](./system.md#orchestration) for more details.

---

## Related APIs

- **[System Management API](./system.md)** - Orchestration status and data integrity checks
- **[Scraping API](./scraping.md)** - Individual Regrid scraping and screenshot operations
- **[Properties API](./properties.md)** - View properties being processed by batch jobs
- **[Counties API](./counties.md)** - Manage counties used in batch jobs

---

## Need Help?

- **View active jobs:** Use the dashboard at `/dashboard` to monitor all batch jobs
- **Debug errors:** Check the `last_error` and `error_count` fields for failure details
- **Performance issues:** Adjust batch sizes based on job type and system capacity
- **Integration questions:** See the n8n workflow documentation for webhook details
