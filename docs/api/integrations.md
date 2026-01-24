# Integration APIs

The Integration APIs provide endpoints for cross-platform features including auction alerts, property report sharing, and AI-powered auction chat assistance.

## Table of Contents

- [Overview](#overview)
- [Endpoints](#endpoints)
  - [GET /api/alerts](#get-apialerts)
  - [POST /api/alerts](#post-apialerts)
  - [PATCH /api/alerts](#patch-apialerts)
  - [GET /api/shares](#get-apishares)
  - [POST /api/shares](#post-apishares)
  - [GET /api/shares/[token]](#get-apisharestoken)
  - [DELETE /api/shares/[token]](#delete-apisharestoken)
  - [PATCH /api/shares/[token]](#patch-apisharestoken)
  - [POST /api/chat/auction](#post-apichatauction)
- [Data Models](#data-models)
- [Common Use Cases](#common-use-cases)

---

## Overview

The Integration APIs enable advanced features that enhance the tax auction investment workflow:

- **Alerts System:** Real-time notifications for auction deadlines, new sales, and important updates
- **Report Sharing:** Generate secure, shareable links for property reports with configurable expiration and view limits
- **AI Chat Assistant:** Intelligent Q&A about auction rules, requirements, and procedures using OpenAI GPT-4o-mini with document parsing

**Base Paths:**
- `/api/alerts` - Auction alerts
- `/api/shares` - Report sharing
- `/api/chat/auction` - AI chat

**Total Endpoints:** 9

**Authentication:** Mixed (alerts are public, shares require auth, chat is context-based)

**Database Tables:**
- `auction_alerts` - Alert notifications
- `report_shares` - Shared report tokens
- `property_reports` - Reports being shared
- `documents` - PDF documents for chat context

---

## Endpoints

### GET /api/alerts

Retrieve auction alerts with optional filtering by acknowledgment status and severity.

**Authentication:** None required

**HTTP Method:** `GET`

**URL:** `/api/alerts`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `acknowledged` | String | No | Filter by status (`"true"`, `"false"`, or `"all"`) |
| `severity` | String | No | Filter by severity (`"critical"`, `"warning"`, `"info"`, or `"all"`) |
| `limit` | Number | No | Max alerts to return (default: 50) |

**Description:**

Fetches alerts from the `auction_alerts` table joined with county and sale information. Alerts are sorted by creation date (newest first). Each alert includes county details, auction dates, and acknowledgment status.

**Request Example:**

```bash
# Get all unacknowledged critical alerts
curl -X GET "https://your-domain.com/api/alerts?acknowledged=false&severity=critical&limit=10"
```

**Response Format:**

```json
{
  "alerts": [
    {
      "id": "alert-uuid-1",
      "type": "critical",
      "title": "Registration Deadline Approaching",
      "message": "Blair County Upset Sale registration closes in 3 days (Sep 8, 2024)",
      "date": "2024-09-05",
      "auctionId": "sale-uuid-1",
      "county": "Blair",
      "state": "PA",
      "auctionDate": "2024-09-15",
      "acknowledged": false
    },
    {
      "id": "alert-uuid-2",
      "type": "warning",
      "title": "Auction Imminent",
      "message": "Centre County Judicial Sale is in 7 days (Oct 5, 2024)",
      "date": "2024-09-28",
      "auctionId": "sale-uuid-2",
      "county": "Centre",
      "state": "PA",
      "auctionDate": "2024-10-05",
      "acknowledged": false
    }
  ],
  "count": 2,
  "hasData": true,
  "dataSource": "live"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `alerts` | Array | Array of alert objects |
| `count` | Number | Number of alerts returned |
| `hasData` | Boolean | Whether any alerts were found |
| `dataSource` | String | Data source (`"live"` or `"empty"`) |

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 500 | Database error or server error |

---

### POST /api/alerts

Acknowledge or unacknowledge a specific alert.

**Authentication:** None required (but recommended for production)

**HTTP Method:** `POST`

**URL:** `/api/alerts`

**Request Body:**

```json
{
  "alertId": "alert-uuid-1",
  "acknowledge": true
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alertId` | UUID | Yes | Alert identifier |
| `acknowledge` | Boolean | No | Acknowledgment status (default: true) |

**Description:**

Updates the acknowledged status of an alert. Sets `acknowledged_at` timestamp when acknowledging.

**Response Format:**

```json
{
  "success": true,
  "alert": {
    "id": "alert-uuid-1",
    "acknowledged": true,
    "acknowledged_at": "2024-09-05T14:30:00Z"
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Alert ID missing |
| 500 | Database error or server error |

---

### PATCH /api/alerts

Acknowledge all unacknowledged alerts at once.

**Authentication:** None required (but recommended for production)

**HTTP Method:** `PATCH`

**URL:** `/api/alerts`

**Request Body:** None

**Description:**

Bulk operation to mark all unacknowledged alerts as acknowledged. Useful for "clear all notifications" functionality.

**Request Example:**

```bash
curl -X PATCH https://your-domain.com/api/alerts
```

**Response Format:**

```json
{
  "success": true,
  "count": 5
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Operation success status |
| `count` | Number | Number of alerts acknowledged |

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 500 | Database error or server error |

---

### GET /api/shares

List share links for the authenticated user's reports.

**Authentication:** Required (session-based or API token)

**HTTP Method:** `GET`

**URL:** `/api/shares`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `report_id` | UUID | No | Filter by specific report |
| `is_active` | Boolean | No | Filter by active status |
| `limit` | Number | No | Max shares to return (default: 50) |
| `offset` | Number | No | Pagination offset (default: 0) |

**Description:**

Retrieves all share links created by the authenticated user. Admins can see all shares. Supports pagination and filtering.

**Request Example:**

```bash
curl -X GET "https://your-domain.com/api/shares?report_id=report-uuid-1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response Format:**

```json
{
  "data": [
    {
      "id": "share-uuid-1",
      "share_token": "token-uuid-1",
      "report_id": "report-uuid-1",
      "created_by": "user-uuid-1",
      "expires_at": "2024-10-05T00:00:00Z",
      "max_views": 100,
      "view_count": 23,
      "last_viewed_at": "2024-09-10T15:30:00Z",
      "is_active": true,
      "created_at": "2024-09-05T10:00:00Z"
    }
  ],
  "total": 1,
  "has_more": false,
  "source": "database"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array | Array of share objects |
| `total` | Number | Total count (for pagination) |
| `has_more` | Boolean | Whether more results exist |
| `source` | String | Data source (`"database"`) |

**Authorization:**

- **Viewers:** Cannot access (403 Forbidden)
- **Analysts:** Can see their own shares
- **Admins:** Can see all shares

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Authentication required |
| 403 | Forbidden (viewer role) |
| 500 | Database error or server error |

---

### POST /api/shares

Create a new shareable link for a property report.

**Authentication:** Required (analysts and admins only)

**HTTP Method:** `POST`

**URL:** `/api/shares`

**Request Body:**

```json
{
  "report_id": "report-uuid-1",
  "expires_days": 30,
  "max_views": 100,
  "password": "optional-password",
  "require_email": false
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `report_id` | UUID | Yes | Report to share |
| `expires_days` | Number | No | Days until expiration (1-365, default: 30) |
| `max_views` | Number | No | Maximum view limit (null = unlimited) |
| `password` | String | No | Password protection (future feature) |
| `require_email` | Boolean | No | Require email before viewing (future feature) |

**Description:**

Generates a secure share token and creates a shareable URL. The endpoint validates that the report exists and the user has permission to share it. Uses the `create_report_share()` database function for token generation.

**Request Example:**

```bash
curl -X POST https://your-domain.com/api/shares \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "report_id": "report-uuid-1",
    "expires_days": 7,
    "max_views": 50
  }'
```

**Response Format:**

```json
{
  "share_url": "https://your-domain.com/share/token-uuid-1",
  "share_token": "token-uuid-1",
  "expires_at": "2024-09-12T00:00:00Z",
  "share_id": "share-uuid-1",
  "message": "Share link created successfully",
  "source": "database"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `share_url` | String | Complete shareable URL |
| `share_token` | UUID | The generated token |
| `expires_at` | String | ISO 8601 expiration timestamp |
| `share_id` | UUID | ID of the share record |
| `message` | String | Success message |
| `source` | String | Data source (`"database"` or `"mock"`) |

**Authorization:**

- **Viewers:** Cannot create shares (403 Forbidden)
- **Analysts:** Can create shares
- **Admins:** Can create shares

**Validation Rules:**

- `report_id` must be a valid UUID format
- `expires_days` must be between 1 and 365
- `max_views` must be a positive integer or null
- Report must exist in `property_reports` table

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Share created successfully |
| 400 | Validation error (invalid UUID, out of range values) |
| 401 | Authentication required |
| 403 | Forbidden (viewer role) |
| 404 | Report not found |
| 500 | Database error or server error |

---

### GET /api/shares/[token]

Validate a share token and increment view count (PUBLIC endpoint).

**Authentication:** None required (public access)

**HTTP Method:** `GET`

**URL:** `/api/shares/[token]`

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | UUID | Share token to validate |

**Description:**

Validates the share token and returns the associated report_id if valid. This endpoint is PUBLIC and doesn't require authentication since share links are meant to be accessible without login. Automatically increments the view count and updates `last_viewed_at` timestamp.

Validation checks:
- Token exists
- Share is active (`is_active = true`)
- Share hasn't expired
- View count hasn't exceeded `max_views` limit

**Request Example:**

```bash
curl -X GET https://your-domain.com/api/shares/token-uuid-1
```

**Response Format (Valid Token):**

```json
{
  "is_valid": true,
  "report_id": "report-uuid-1",
  "error_message": null,
  "source": "database"
}
```

**Response Format (Invalid Token):**

```json
{
  "is_valid": false,
  "report_id": null,
  "error_message": "Share token not found or expired",
  "source": "database"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `is_valid` | Boolean | Whether token is valid |
| `report_id` | UUID\|null | Report ID if valid, null otherwise |
| `error_message` | String\|null | Error description if invalid |
| `source` | String | Data source (`"database"` or `"mock"`) |

**Error Messages:**

| Message | Reason |
|---------|--------|
| `"Invalid share token format"` | Token is not a valid UUID |
| `"Share token not found or expired"` | Token doesn't exist or expired |
| `"Unable to validate share token"` | Database error |
| `"Maximum views exceeded"` | View limit reached |

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Token is valid |
| 400 | Invalid token format |
| 403 | Token invalid (expired, max views, inactive) |
| 404 | Token not found |
| 500 | Database error or server error |

**Security Notes:**

- IP addresses are logged for analytics (server-side only)
- View counts are incremented atomically using the `validate_and_increment_share_view()` RPC function
- Failed validation attempts do not increment view count

---

### DELETE /api/shares/[token]

Deactivate (soft delete) a share link.

**Authentication:** Required (creator or admin only)

**HTTP Method:** `DELETE`

**URL:** `/api/shares/[token]`

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | UUID | Share token to deactivate |

**Description:**

Soft-deletes a share by setting `is_active = false`. Only the share creator or an admin can deactivate a share. The share token remains in the database but becomes invalid.

**Request Example:**

```bash
curl -X DELETE https://your-domain.com/api/shares/token-uuid-1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response Format:**

```json
{
  "success": true,
  "message": "Share link deactivated successfully",
  "source": "database"
}
```

**Authorization:**

- **Creator:** Can deactivate their own shares
- **Admin:** Can deactivate any share
- **Others:** 403 Forbidden

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Share deactivated successfully |
| 400 | Invalid token format |
| 401 | Authentication required |
| 403 | Forbidden (not creator or admin) |
| 404 | Share not found |
| 409 | Already deactivated |
| 500 | Database error or server error |

---

### PATCH /api/shares/[token]

Update share settings (extend expiration, update view limit, etc.).

**Authentication:** Required (creator or admin only)

**HTTP Method:** `PATCH`

**URL:** `/api/shares/[token]`

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | UUID | Share token to update |

**Request Body:**

```json
{
  "extends_days": 30,
  "max_views": 200,
  "is_active": true
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `extends_days` | Number | No | Extend expiration by N days (1-365) |
| `max_views` | Number\|null | No | Update view limit (null = unlimited) |
| `is_active` | Boolean | No | Reactivate or deactivate share |

**Description:**

Updates share settings. Useful for extending expiration dates, adjusting view limits, or reactivating deactivated shares.

**Request Example:**

```bash
curl -X PATCH https://your-domain.com/api/shares/token-uuid-1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "extends_days": 14,
    "max_views": null
  }'
```

**Response Format:**

```json
{
  "data": {
    "id": "share-uuid-1",
    "share_token": "token-uuid-1",
    "expires_at": "2024-09-19T00:00:00Z",
    "max_views": null,
    "is_active": true,
    "updated_at": "2024-09-05T16:00:00Z"
  },
  "message": "Share link updated successfully",
  "source": "database"
}
```

**Authorization:**

- **Viewers:** Cannot update shares (403 Forbidden)
- **Creator:** Can update their own shares
- **Admin:** Can update any share

**Validation Rules:**

- `extends_days` must be between 1 and 365
- `max_views` must be a positive integer or null
- At least one field must be provided

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Share updated successfully |
| 400 | Validation error or no fields provided |
| 401 | Authentication required |
| 403 | Forbidden (viewer role or not creator/admin) |
| 404 | Share not found |
| 500 | Database error or server error |

---

### POST /api/chat/auction

AI-powered chat endpoint for auction-related questions with PDF document parsing.

**Authentication:** None required (context-based)

**HTTP Method:** `POST`

**URL:** `/api/chat/auction`

**Runtime:** Node.js (required for PDF parsing)

**Request Body:**

```json
{
  "saleId": "sale-uuid-1",
  "message": "What is the registration deadline?",
  "history": [
    {
      "role": "user",
      "content": "What are the payment methods?"
    },
    {
      "role": "assistant",
      "content": "The county accepts certified check, cashier's check, or money order..."
    }
  ],
  "context": {
    "countyName": "Blair",
    "stateName": "Pennsylvania",
    "saleType": "Upset Sale",
    "rules": {
      "registrationRequired": true,
      "registrationDeadlineDays": 7,
      "registrationFormUrl": "https://example.com/form.pdf",
      "depositRefundable": false,
      "depositPaymentMethods": ["certified_check", "money_order"],
      "minimumBidRule": "Total taxes plus costs",
      "minimumBidAmount": 500,
      "bidIncrement": 100,
      "buyersPremiumPct": 10,
      "paymentDeadlineHours": 24,
      "paymentMethods": ["certified_check", "cashiers_check"],
      "financingAllowed": false,
      "deedRecordingTimeline": "30 days",
      "redemptionPeriodDays": 0,
      "possessionTimeline": "After deed recording",
      "asIsSale": true,
      "liensSurvive": ["municipal_liens", "HOA_liens"],
      "titleInsuranceAvailable": false,
      "rawRulesText": "Full text of auction rules..."
    },
    "documents": [
      {
        "title": "2024 Upset Sale Property List",
        "url": "https://example.com/property-list.pdf",
        "type": "property_list",
        "extractedText": "Pre-extracted PDF text content...",
        "year": 2024
      }
    ]
  }
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `saleId` | UUID | Yes | Auction/sale identifier |
| `message` | String | Yes | User's question |
| `history` | Array | No | Previous chat messages (max 10 kept) |
| `context` | Object | Yes | Auction context and rules |
| `context.countyName` | String | Yes | County name |
| `context.stateName` | String | Yes | State name |
| `context.saleType` | String | Yes | Type of sale |
| `context.rules` | Object | No | Structured auction rules |
| `context.documents` | Array | No | Related PDF documents |

**Description:**

AI-powered streaming chat endpoint using OpenAI GPT-4o-mini. The endpoint:
1. Fetches and parses PDF documents from provided URLs
2. Checks for pre-extracted text (from n8n workflows)
3. Falls back to runtime PDF parsing if needed
4. Builds a comprehensive system prompt with auction rules and document contents
5. Streams responses in real-time using Server-Sent Events (SSE)

The AI assistant:
- Answers questions based on provided auction rules and documents
- Warns about outdated documents
- Recommends users verify critical information with the county
- Explains complex tax sale concepts in plain English
- Highlights important deadlines and risks

**PDF Document Processing:**

1. **Pre-extracted text** (preferred): Uses `extractedText` field from database
2. **Cache**: Checks 30-minute in-memory cache
3. **Runtime extraction**: Fetches and parses PDF on-demand
4. **Fallback**: Extracts text from HTML wrapper pages

**Request Example:**

```bash
curl -X POST https://your-domain.com/api/chat/auction \
  -H "Content-Type: application/json" \
  -d '{
    "saleId": "sale-uuid-1",
    "message": "What documents do I need to register?",
    "context": {
      "countyName": "Blair",
      "stateName": "Pennsylvania",
      "saleType": "Upset Sale",
      "rules": {...},
      "documents": [...]
    }
  }'
```

**Response Format (Streaming SSE):**

```
data: {"content": "Based"}

data: {"content": " on"}

data: {"content": " the"}

data: {"content": " auction"}

data: {"content": " rules,"}

data: {"content": " you"}

data: {"content": " need..."}

data: [DONE]
```

**Response Headers:**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**OpenAI Configuration:**

| Setting | Value |
|---------|-------|
| Model | `gpt-4o-mini` |
| Temperature | 0.7 |
| Max Tokens | 1000 |
| Stream | true |

**Cache Behavior:**

- **TTL:** 30 minutes
- **Scope:** Per-instance (in-memory)
- **Key:** Document URL

**Outdated Document Warning:**

If documents are from previous years, the AI automatically warns users:
```
⚠️ CRITICAL WARNING - DOCUMENT CURRENCY:
The documents available are from 2023 but we are now in 2024.
The county has not yet published 2024 auction documents...
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Streaming response started |
| 400 | Message is required |
| 500 | OpenAI API key not configured or server error |

**Error Format (Non-streaming):**

```json
{
  "error": "Failed to process chat request"
}
```

**Environment Requirements:**

- `OPENAI_API_KEY` must be configured
- Node.js runtime required for PDF parsing

---

## Data Models

### AuctionAlert Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Alert identifier |
| `type` | String | Alert type (`"critical"`, `"warning"`, `"info"`) |
| `title` | String | Alert title |
| `message` | String | Alert message |
| `date` | String | Creation date (ISO 8601) |
| `auctionId` | UUID\|null | Associated auction ID |
| `county` | String | County name |
| `state` | String | State code |
| `auctionDate` | String\|null | Auction date (ISO 8601) |
| `acknowledged` | Boolean | Acknowledgment status |

### ReportShare Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Share record identifier |
| `share_token` | UUID | Share token (used in URL) |
| `report_id` | UUID | Associated report ID |
| `created_by` | UUID | User who created the share |
| `expires_at` | String | Expiration timestamp (ISO 8601) |
| `max_views` | Number\|null | Maximum view limit (null = unlimited) |
| `view_count` | Number | Current view count |
| `last_viewed_at` | String\|null | Last viewed timestamp |
| `is_active` | Boolean | Active status |
| `created_at` | String | Creation timestamp |
| `updated_at` | String | Last update timestamp |

### ShareLinkResponse Object

| Field | Type | Description |
|-------|------|-------------|
| `share_url` | String | Complete shareable URL |
| `share_token` | UUID | The generated token |
| `expires_at` | String | Expiration timestamp (ISO 8601) |
| `share_id` | UUID | Share record ID |

### ShareValidationResult Object

| Field | Type | Description |
|-------|------|-------------|
| `is_valid` | Boolean | Validation result |
| `report_id` | UUID\|null | Report ID if valid |
| `error_message` | String\|null | Error description if invalid |

### ChatRequest Context Object

| Field | Type | Description |
|-------|------|-------------|
| `countyName` | String | County name |
| `stateName` | String | State name |
| `saleType` | String | Type of sale |
| `rules` | Object\|null | Structured auction rules |
| `documents` | Array | Related PDF documents |

### AuctionRules Object

| Field | Type | Description |
|-------|------|-------------|
| `registrationRequired` | Boolean | Whether registration is required |
| `registrationDeadlineDays` | Number\|null | Days before sale |
| `registrationFormUrl` | String\|null | Registration form URL |
| `depositRefundable` | Boolean | Deposit refund status |
| `depositPaymentMethods` | String[] | Accepted deposit methods |
| `minimumBidRule` | String | Minimum bid rule description |
| `minimumBidAmount` | Number\|null | Minimum bid amount |
| `bidIncrement` | Number\|null | Bid increment amount |
| `buyersPremiumPct` | Number\|null | Buyer's premium percentage |
| `paymentDeadlineHours` | Number | Payment deadline in hours |
| `paymentMethods` | String[] | Accepted payment methods |
| `financingAllowed` | Boolean | Whether financing is allowed |
| `deedRecordingTimeline` | String\|null | Deed recording timeline |
| `redemptionPeriodDays` | Number\|null | Redemption period in days |
| `possessionTimeline` | String\|null | Possession timeline |
| `asIsSale` | Boolean | Sold as-is status |
| `liensSurvive` | String[] | Liens that survive the sale |
| `titleInsuranceAvailable` | Boolean | Title insurance availability |
| `rawRulesText` | String\|null | Full rules text |

### Document Object (Chat Context)

| Field | Type | Description |
|-------|------|-------------|
| `title` | String | Document title |
| `url` | String | Document URL |
| `type` | String | Document type |
| `extractedText` | String\|null | Pre-extracted text content |
| `year` | Number\|null | Document year |

---

## Common Use Cases

### 1. Display Active Alerts Dashboard

**Scenario:** Show unacknowledged alerts grouped by severity on the dashboard.

```typescript
const response = await fetch('/api/alerts?acknowledged=false&limit=20')
const { alerts, count } = await response.json()

// Group by severity
const critical = alerts.filter(a => a.type === 'critical')
const warnings = alerts.filter(a => a.type === 'warning')
const info = alerts.filter(a => a.type === 'info')

console.log(`${critical.length} critical, ${warnings.length} warnings, ${info.length} info`)
```

### 2. Acknowledge Alert

**Scenario:** User clicks "dismiss" on an alert notification.

```typescript
async function acknowledgeAlert(alertId: string) {
  const response = await fetch('/api/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alertId, acknowledge: true })
  })

  const result = await response.json()
  if (result.success) {
    console.log('Alert acknowledged')
  }
}
```

### 3. Clear All Notifications

**Scenario:** User clicks "Clear All" button to acknowledge all alerts.

```typescript
async function clearAllAlerts() {
  const response = await fetch('/api/alerts', {
    method: 'PATCH'
  })

  const result = await response.json()
  console.log(`${result.count} alerts cleared`)
}
```

### 4. Create Share Link for Report

**Scenario:** Analyst shares a property report with a colleague.

```typescript
async function shareReport(reportId: string, days: number = 30) {
  const response = await fetch('/api/shares', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      report_id: reportId,
      expires_days: days,
      max_views: 100
    })
  })

  const result = await response.json()

  // Copy to clipboard
  navigator.clipboard.writeText(result.share_url)
  console.log('Share link copied:', result.share_url)
  console.log('Expires:', new Date(result.expires_at).toLocaleDateString())
}
```

### 5. Validate Share Token (Public Access)

**Scenario:** External user clicks a share link and needs access to the report.

```typescript
async function validateShareToken(token: string) {
  const response = await fetch(`/api/shares/${token}`)
  const result = await response.json()

  if (result.is_valid) {
    // Redirect to report viewer
    window.location.href = `/reports/${result.report_id}`
  } else {
    // Show error message
    alert(`Invalid link: ${result.error_message}`)
  }
}
```

### 6. Manage Share Links

**Scenario:** User views all their active share links with analytics.

```typescript
async function listMyShares() {
  const response = await fetch('/api/shares?is_active=true&limit=50', {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  const { data, total } = await response.json()

  data.forEach(share => {
    const percentUsed = (share.view_count / share.max_views) * 100
    console.log(`${share.share_token}: ${share.view_count} views (${percentUsed}% used)`)
  })
}
```

### 7. Extend Share Link Expiration

**Scenario:** User wants to extend a share link that's about to expire.

```typescript
async function extendShareLink(token: string, additionalDays: number) {
  const response = await fetch(`/api/shares/${token}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ extends_days: additionalDays })
  })

  const result = await response.json()
  console.log('New expiration:', result.data.expires_at)
}
```

### 8. Deactivate Share Link

**Scenario:** User wants to revoke access to a shared report.

```typescript
async function revokeShareLink(shareToken: string) {
  const response = await fetch(`/api/shares/${shareToken}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })

  const result = await response.json()
  if (result.success) {
    console.log('Share link revoked')
  }
}
```

### 9. AI Chat for Auction Questions

**Scenario:** User asks questions about auction rules with streaming responses.

```typescript
async function askAuctionQuestion(
  saleId: string,
  message: string,
  context: ChatContext,
  onChunk: (text: string) => void
) {
  const response = await fetch('/api/chat/auction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ saleId, message, context })
  })

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) return

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return

        try {
          const json = JSON.parse(data)
          onChunk(json.content)
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

// Usage
let fullResponse = ''
await askAuctionQuestion(
  'sale-uuid-1',
  'What are the payment methods?',
  { countyName: 'Blair', stateName: 'PA', ... },
  (chunk) => {
    fullResponse += chunk
    console.log(chunk) // Display incrementally
  }
)
```

### 10. Chat with Document Context

**Scenario:** Ask questions about specific PDF documents.

```typescript
const context = {
  countyName: 'Blair',
  stateName: 'Pennsylvania',
  saleType: 'Upset Sale',
  rules: {
    registrationRequired: true,
    paymentDeadlineHours: 24,
    // ... other rules
  },
  documents: [
    {
      title: '2024 Upset Sale Property List',
      url: 'https://example.com/properties.pdf',
      type: 'property_list',
      extractedText: null, // Will be fetched
      year: 2024
    },
    {
      title: 'Auction Rules & Procedures',
      url: 'https://example.com/rules.pdf',
      type: 'rules',
      extractedText: 'Pre-extracted text from n8n workflow...',
      year: 2024
    }
  ]
}

await askAuctionQuestion(
  'sale-uuid-1',
  'Are there any environmental liens mentioned in the documents?',
  context,
  (chunk) => console.log(chunk)
)
```

---

## Related APIs

- **[Auctions API](./auctions.md)** - Auction information and calendar
- **[Reports API](./reports.md)** - Property report generation
- **[System API](./system.md)** - Database functions and RPC calls
- **[Dashboard API](./dashboard.md)** - Dashboard metrics and stats

---

## Notes

### Alert System

- Alerts are automatically generated by the Auction Monitor Agent (Agent 10)
- Alert types: `registration_deadline`, `auction_imminent`, `new_auction`, `property_list_available`
- Severity levels map to frontend types: `critical`, `warning`, `info`
- Alerts are sorted by creation date (newest first)

### Share Link Security

- Tokens are UUIDs generated by the database
- Shares are soft-deleted (not hard-deleted from database)
- View counts are incremented atomically to prevent race conditions
- IP addresses are logged server-side for analytics
- CSRF protection enabled on all mutation endpoints (POST, PATCH, DELETE)
- Share validation uses RPC function `validate_and_increment_share_view()`

### Share Link Expiration

- Default expiration: 30 days
- Minimum: 1 day
- Maximum: 365 days
- Expiration can be extended using PATCH endpoint
- Expired shares fail validation automatically

### Share Link View Limits

- `max_views = null` means unlimited views
- View count increments on each successful validation
- When `view_count >= max_views`, share becomes invalid
- View limits can be updated using PATCH endpoint

### AI Chat Features

- **Model:** OpenAI GPT-4o-mini for cost efficiency
- **Temperature:** 0.7 for balanced creativity
- **Max Tokens:** 1000 per response
- **History:** Keeps last 10 messages for context
- **Streaming:** Real-time responses via Server-Sent Events

### PDF Document Processing

1. **Pre-extracted text (preferred):** Uses `extractedText` from database if available
2. **Cache:** 30-minute in-memory cache per document URL
3. **Runtime extraction:** Fetches and parses PDFs on-demand
4. **HTML fallback:** Extracts PDF URLs from HTML wrapper pages
5. **Text cleanup:** Removes PDF artifacts, normalizes whitespace
6. **Truncation:** Limits to 8000 chars per document to fit token limits

### Document Year Warnings

The AI automatically detects outdated documents and warns users:
- Compares document `year` field to current year
- Displays prominent warning in system prompt
- Recommends contacting county for current information
- Clarifies that dates are from previous year

### Chat Best Practices

- Always include `context.rules` for structured auction rules
- Provide `documents` array with URLs for PDF parsing
- Pre-extract PDF text using n8n workflows when possible
- Keep chat history to last 10 messages to manage token usage
- Handle streaming responses incrementally for better UX

### Future Enhancements

**Alerts:**
- Email/SMS notifications for critical alerts
- User-specific alert subscriptions
- Custom alert rules and filters
- Alert snoozing functionality

**Sharing:**
- Password protection for shares
- Email requirement before viewing
- Analytics dashboard for share metrics
- Bulk share management
- Share templates for common scenarios

**AI Chat:**
- Multi-language support
- Voice input/output
- Document comparison across multiple PDFs
- Auction timeline visualization
- Personalized recommendations based on chat history

---

**Need help?** See the [API Overview](./README.md) or [Auctions API](./auctions.md)
