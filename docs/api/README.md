# Tax Deed Flow API Reference

## Overview

The Tax Deed Flow API provides comprehensive access to tax auction data, property information, analysis tools, and automation features. The API is built on Next.js 14 App Router with TypeScript and Supabase.

**Base URL:** `https://your-domain.com/api`

**API Version:** 1.0.0

**Total Endpoints:** 29 endpoints across 13 categories

---

## Quick Start

### 1. Authentication

All API endpoints require authentication. Include one of the following in your request headers:

**Bearer Token (Recommended):**
```bash
curl https://your-domain.com/api/properties \
  -H "Authorization: Bearer demo-token"
```

**X-User-Token Header:**
```bash
curl https://your-domain.com/api/properties \
  -H "X-User-Token: {\"id\":\"demo-user-1\",\"email\":\"demo@taxdeedflow.com\",\"name\":\"Demo User\",\"role\":\"admin\"}"
```

### 2. Make Your First Request

**Get all properties:**
```bash
curl -X GET https://your-domain.com/api/properties \
  -H "Authorization: Bearer demo-token"
```

**Response:**
```json
{
  "properties": [
    {
      "id": "property-uuid",
      "parcel_number": "123-456-789",
      "address": "123 Main St",
      "county_name": "Blair",
      "total_due": 5000,
      "status": "pending"
    }
  ]
}
```

---

## Authentication

Tax Deed Flow uses header-based authentication for API requests. See the full [Authentication Guide](./authentication.md) for detailed information.

### Authentication Methods

| Method | Header | Use Case |
|--------|--------|----------|
| **Bearer Token** | `Authorization: Bearer {token}` | Production & external integrations |
| **User Token** | `X-User-Token: {serialized-user}` | Internal app & demo mode |

### Demo Credentials

For testing and demo purposes:

**Bearer Token:**
- Token: `demo-token` or `demo123`
- Role: Admin (full access)

**User Tokens:**
| User ID | Email | Role | Access Level |
|---------|-------|------|--------------|
| `demo-user-1` | demo@taxdeedflow.com | admin | Full access |
| `viewer-user-1` | viewer@taxdeedflow.com | viewer | Read-only |
| `analyst-user-1` | analyst@taxdeedflow.com | analyst | Read + analysis |

**Example X-User-Token:**
```json
{
  "id": "demo-user-1",
  "email": "demo@taxdeedflow.com",
  "name": "Demo User",
  "role": "admin"
}
```

### Response Codes

| Status | Meaning | Description |
|--------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required or invalid |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal server error |

---

## API Categories

### Core Resources

Essential endpoints for managing properties, auctions, and counties.

- **[Properties API](./properties.md)** - 6 endpoints
  - `GET /api/properties` - List all properties
  - `POST /api/properties` - Create property
  - `GET /api/properties/[id]` - Get property by ID
  - `DELETE /api/properties/[id]` - Delete property
  - `GET /api/properties/with-regrid` - Properties with Regrid data
  - `GET /api/properties/[id]/report` - Generate property report

- **[Auctions API](./auctions.md)** - 2 endpoints
  - `GET /api/auctions` - List all auctions with alerts
  - `GET /api/auctions/[saleId]` - Get auction by sale ID

- **[Counties API](./counties.md)** - 2 endpoints
  - `GET /api/counties` - List all counties
  - `GET /api/counties/[id]` - Get county by ID

### Analysis & Reports

Financial analysis, risk assessment, and report generation.

- **[Analysis API](./analysis.md)** - 2 endpoints
  - `POST /api/analysis/financial` - Calculate financial metrics
  - `POST /api/analysis/risk` - Assess investment risk

- **[Reports API](./reports.md)** - 2 endpoints
  - `POST /api/report/generate` - Generate property report
  - `POST /api/report/full-analysis` - Generate full analysis report

### System & Automation

Batch processing, scraping, orchestration, and data integrity.

- **[Batch Jobs API](./batch-jobs.md)** - 4 endpoints
  - `GET /api/batch-jobs` - List all batch jobs
  - `POST /api/batch-jobs` - Create batch job
  - `GET /api/batch-jobs/[id]` - Get batch job status
  - `PATCH /api/batch-jobs/[id]` - Update batch job

- **[Scraping API](./scraping.md)** - 3 endpoints
  - `POST /api/scrape/regrid` - Scrape Regrid data
  - `POST /api/scrape/screenshot` - Capture property screenshots
  - `POST /api/upload-screenshot` - Upload screenshot to storage

- **[System Management API](./system.md)** - 3 endpoints
  - `GET /api/orchestration` - Get orchestration status
  - `GET /api/data-integrity` - Run data integrity checks
  - `GET /api/health/apis` - Check external API health

### Utilities & Integration

Dashboard stats, market data, alerts, sharing, and AI chat.

- **[Dashboard API](./dashboard.md)** - 1 endpoint
  - `GET /api/dashboard/stats` - Get dashboard statistics

- **[Market Data API](./market-data.md)** - 4 endpoints
  - `GET /api/market` - Get market trends
  - `GET /api/crime` - Get crime statistics
  - `GET /api/zoning` - Get zoning information
  - `GET /api/comparables` - Get comparable properties

- **[Integration APIs](./integrations.md)** - 5 endpoints
  - `GET /api/alerts` - Get auction alerts
  - `GET /api/shares` - List property shares
  - `GET /api/shares/[token]` - Get shared property
  - `POST /api/shares` - Create property share
  - `POST /api/chat/auction` - Chat with AI about auctions

---

## Common Request Patterns

### Pagination

Many list endpoints support pagination via query parameters:

```bash
GET /api/properties?page=1&limit=50
```

**Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)

**Response:**
```json
{
  "properties": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 500,
    "pages": 10
  }
}
```

### Filtering

Filter results using query parameters:

```bash
GET /api/properties?county=Blair&status=pending&min_amount=5000
```

### Sorting

Sort results using the `sort` parameter:

```bash
GET /api/properties?sort=total_due&order=desc
```

**Parameters:**
- `sort` - Field to sort by
- `order` - `asc` or `desc` (default: `asc`)

---

## Error Handling

All errors return a consistent JSON format:

```json
{
  "error": "Bad Request",
  "message": "Invalid property ID format",
  "status": 400,
  "details": {
    "field": "id",
    "reason": "Must be a valid UUID"
  }
}
```

**Common Error Types:**

| Error | Status | Cause | Solution |
|-------|--------|-------|----------|
| `Unauthorized` | 401 | Missing or invalid auth token | Provide valid authentication |
| `Forbidden` | 403 | Insufficient permissions | Check user role requirements |
| `Bad Request` | 400 | Invalid parameters | Verify request format |
| `Not Found` | 404 | Resource doesn't exist | Check resource ID |
| `Server Error` | 500 | Internal error | Contact support |

---

## Rate Limiting

**Current Implementation:** No rate limiting (development mode)

**Future Implementation:**
- 1000 requests per hour per user
- 100 requests per minute per IP
- Rate limit headers included in responses

---

## Webhooks (Coming Soon)

Subscribe to events and receive real-time notifications:

**Planned Events:**
- `property.created` - New property added
- `auction.upcoming` - Auction deadline approaching
- `batch_job.completed` - Batch job finished
- `alert.triggered` - New auction alert

---

## SDKs & Libraries (Coming Soon)

Official client libraries:
- JavaScript/TypeScript SDK
- Python SDK
- REST API OpenAPI spec

---

## Best Practices

### ✅ DO
- Always include authentication headers
- Use pagination for large datasets
- Cache responses when appropriate
- Handle errors gracefully
- Validate request parameters before sending

### ❌ DON'T
- Hardcode authentication tokens
- Make requests without error handling
- Ignore rate limits
- Store sensitive data in query parameters
- Poll endpoints unnecessarily (use webhooks when available)

---

## Support & Resources

### Documentation
- [Authentication Guide](./authentication.md) - Complete auth documentation
- [Properties API](./properties.md) - Property endpoints
- [Batch Processing](./batch-jobs.md) - Automation workflows

### Community
- **Issues:** [GitHub Issues](https://github.com/your-org/taxdeedflow/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-org/taxdeedflow/discussions)

### Contact
- **Email:** support@taxdeedflow.com
- **Documentation:** https://docs.taxdeedflow.com

---

## Changelog

### v1.0.0 (Current)
- Initial API release
- 29 endpoints across 13 categories
- Bearer token & X-User-Token authentication
- Full CRUD operations for properties
- Analysis & reporting endpoints
- Batch processing support
- System management & health checks

---

## Next Steps

1. **[Read the Authentication Guide](./authentication.md)** - Understand auth requirements
2. **[Explore Properties API](./properties.md)** - Start working with property data
3. **[Try Batch Jobs API](./batch-jobs.md)** - Automate large-scale operations
4. **[Check System Health](./system.md)** - Monitor API status

**Need help?** Check the individual endpoint documentation linked above for detailed request/response examples.
