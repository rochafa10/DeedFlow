# Tax Deed Platform API Documentation

## Overview
This document outlines all API endpoints and webhook integrations between the NextJS frontend, Supabase backend, and n8n workflow automation.

## Base URLs
- **Frontend**: `http://localhost:3000`
- **Supabase**: `https://[your-project].supabase.co`
- **n8n Webhooks**: `http://localhost:5678/webhook`

## Authentication
All Supabase API calls require authentication:
```javascript
headers: {
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
}
```

## API Endpoints

### 1. Property Enrichment
**Endpoint**: `/api/properties/enrich`  
**Method**: `POST`  
**n8n Webhook**: `/webhook/property-enrichment`

**Request Body**:
```json
{
  "identifier": "enrichProperty",
  "data": {
    "propertyId": "uuid",
    "parcelNumber": "25-45-001-000",
    "address": "123 Main St, Miami, FL 33101",
    "county": "Miami-Dade",
    "state": "FL"
  }
}
```

**Response**:
```json
{
  "status": "ok",
  "data": {
    "propertyId": "uuid",
    "marketValue": 250000,
    "zestimate": 245000,
    "rentEstimate": 2100,
    "comparables": [],
    "neighborhood": {
      "walkScore": 72,
      "transitScore": 45,
      "crimeIndex": "Low",
      "schoolRating": 7
    },
    "classification": "A",
    "score": 85,
    "lastUpdated": "2024-02-10T10:00:00Z"
  }
}
```

### 2. Inspection Report Generation
**Endpoint**: `/api/webhook`  
**Method**: `POST`  
**n8n Webhook**: `/webhook/inspection-report`

**Request Body**:
```json
{
  "identifier": "generateInspectionReport",
  "data": {
    "propertyId": "uuid",
    "parcelNumber": "25-45-001-000",
    "address": "123 Main St, Miami, FL 33101",
    "county": "Miami-Dade",
    "state": "FL",
    "coordinates": "-80.2341,26.1224"
  }
}
```

**Response**:
```json
{
  "status": "ok",
  "data": {
    "inspectionId": "uuid",
    "propertyId": "uuid",
    "inspectionDate": "2024-02-10",
    "overallCondition": "fair",
    "estimatedRepairs": 25000,
    "items": [
      {
        "category": "Exterior",
        "items": [
          {
            "name": "Roof Condition",
            "status": "fair",
            "notes": "Shingles need replacement in 5-7 years",
            "estimatedCost": 8000,
            "priority": "medium"
          }
        ]
      }
    ],
    "reportUrl": "https://storage.supabase.co/reports/inspection-uuid.pdf"
  }
}
```

### 3. Financial Analysis
**Endpoint**: `/api/financial-analysis`  
**Method**: `POST`  
**n8n Webhook**: `/webhook/financial-analysis`

**Request Body**:
```json
{
  "propertyId": "uuid",
  "purchasePrice": 50000,
  "rehabBudget": 35000,
  "arv": 150000,
  "monthlyRent": 1500,
  "closingCosts": 2000,
  "holdingMonths": 6
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "fixFlip": {
      "totalInvestment": 90000,
      "expectedProfit": 42000,
      "roi": 46.7,
      "timeline": "6 months"
    },
    "brrrr": {
      "totalInvestment": 87000,
      "cashLeft": 25000,
      "monthlyIncome": 650,
      "cashOnCash": 31.2
    },
    "wholesale": {
      "assignmentFee": 15000,
      "roi": 30.0,
      "timeline": "30 days"
    },
    "buyHold": {
      "totalInvestment": 87000,
      "monthlyIncome": 850,
      "capRate": 11.7
    }
  }
}
```

### 4. Property Details
**Endpoint**: `/api/properties/[id]`  
**Method**: `GET`  
**n8n Webhook**: `/webhook/property-details`

**Response**:
```json
{
  "property": {
    "id": "uuid",
    "parcelNumber": "25-45-001-000",
    "address": "123 Main St",
    "city": "Miami",
    "state": "FL",
    "county": "Miami-Dade"
  },
  "valuation": {
    "assessedValue": 180000,
    "marketValue": 220000,
    "lastSalePrice": 165000,
    "lastSaleDate": "2018-07-22"
  },
  "owner": {
    "ownerName": "John Doe",
    "ownerAddress": "456 Oak Ave",
    "ownerOccupied": false,
    "occupancyStatus": "Tenant Occupied"
  },
  "liens": [
    {
      "type": "Property Tax",
      "amount": 5420,
      "year": 2023
    }
  ],
  "riskAssessment": {
    "floodZone": "X",
    "hurricaneZone": true,
    "codeViolations": 1,
    "overallRiskLevel": "Medium"
  },
  "neighborhood": {
    "medianHomeValue": 285000,
    "medianRent": 2100,
    "walkScore": 72,
    "crimeIndex": "Low"
  }
}
```

### 5. Bulk Property Import
**Endpoint**: `/api/bulk-import`  
**Method**: `POST`  
**n8n Webhook**: `/webhook/bulk-import`

**Request Body** (multipart/form-data):
```
file: [CSV/Excel file]
county: "Miami-Dade"
state: "FL"
```

**Response**:
```json
{
  "status": "success",
  "imported": 125,
  "failed": 3,
  "errors": [
    {
      "row": 45,
      "error": "Invalid parcel number format"
    }
  ]
}
```

## Supabase Tables API

### Properties Table
**Get All Properties**:
```javascript
GET /rest/v1/properties?select=*
```

**Get Property with Relations**:
```javascript
GET /rest/v1/properties?id=eq.{id}&select=*,
  property_valuations(*),
  property_owners(*),
  property_liens(*),
  risk_assessments(*),
  neighborhood_analysis(*)
```

**Filter Properties**:
```javascript
// By County
GET /rest/v1/properties?county_id=eq.{county_id}

// By Classification
GET /rest/v1/properties?classification=eq.A

// By Score Range
GET /rest/v1/properties?score=gte.70&score=lte.100

// Complex Filter
GET /rest/v1/properties?
  county_id=eq.{county_id}&
  classification=in.(A,B)&
  score=gte.60&
  order=score.desc&
  limit=20
```

### Auctions Table
**Get Upcoming Auctions**:
```javascript
GET /rest/v1/auctions?
  auction_date=gte.{today}&
  status=eq.upcoming&
  order=auction_date.asc
```

**Get Auction with Properties**:
```javascript
GET /rest/v1/auctions?id=eq.{id}&select=*,
  auction_properties(*,properties(*))
```

### Financial Analysis
**Save Analysis**:
```javascript
POST /rest/v1/financial_analyses
Body: {
  "property_id": "uuid",
  "strategy": "Fix & Flip",
  "purchase_price": 50000,
  "renovation_budget": 35000,
  "arv": 150000,
  "expected_profit": 42000,
  "roi_percentage": 46.7
}
```

## Real-time Subscriptions

### Subscribe to Property Updates
```javascript
const subscription = supabase
  .channel('property-changes')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'properties',
      filter: 'county_id=eq.{county_id}'
    }, 
    (payload) => {
      console.log('Property changed:', payload)
    }
  )
  .subscribe()
```

### Subscribe to New Auctions
```javascript
const subscription = supabase
  .channel('new-auctions')
  .on('postgres_changes', 
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'auctions'
    }, 
    (payload) => {
      console.log('New auction:', payload.new)
    }
  )
  .subscribe()
```

## Error Handling

All API responses follow this error format:
```json
{
  "status": "error",
  "error": {
    "code": "PROPERTY_NOT_FOUND",
    "message": "Property with ID {id} not found",
    "details": {}
  }
}
```

Common error codes:
- `PROPERTY_NOT_FOUND` - Property doesn't exist
- `INVALID_PARAMS` - Missing or invalid parameters
- `ENRICHMENT_FAILED` - External API failure
- `UNAUTHORIZED` - Authentication required
- `RATE_LIMITED` - Too many requests
- `SERVER_ERROR` - Internal server error

## Rate Limiting
- Property Enrichment: 100 requests per hour
- Inspection Generation: 50 requests per hour
- Financial Analysis: 200 requests per hour
- Bulk Import: 10 requests per hour

## Webhook Security
All n8n webhooks should validate:
1. API Key in headers
2. Request signature (HMAC-SHA256)
3. Timestamp to prevent replay attacks

Example validation:
```javascript
const signature = req.headers['x-webhook-signature'];
const timestamp = req.headers['x-webhook-timestamp'];
const body = JSON.stringify(req.body);

const expectedSignature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(`${timestamp}.${body}`)
  .digest('hex');

if (signature !== expectedSignature) {
  throw new Error('Invalid signature');
}
```

## Testing Endpoints

Use these curl commands to test the endpoints:

```bash
# Property Enrichment
curl -X POST http://localhost:3000/api/properties/enrich \
  -H "Content-Type: application/json" \
  -d '{"identifier":"enrichProperty","data":{"propertyId":"123","parcelNumber":"25-45-001-000"}}'

# Inspection Report
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"identifier":"generateInspectionReport","data":{"propertyId":"123"}}'

# Financial Analysis
curl -X POST http://localhost:3000/api/financial-analysis \
  -H "Content-Type: application/json" \
  -d '{"propertyId":"123","purchasePrice":50000,"rehabBudget":35000,"arv":150000}'
```

## Environment Variables

Required environment variables for the NextJS app:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# n8n Webhooks
N8N_WEBHOOK_URL=http://localhost:5678/webhook
WEBHOOK_SECRET=your-webhook-secret

# External APIs (for enrichment)
GOOGLE_MAPS_API_KEY=your-google-api-key
ZILLOW_API_KEY=your-zillow-api-key
COUNTY_API_KEY=your-county-api-key
```