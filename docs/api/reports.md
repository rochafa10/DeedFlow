# Reports API Reference

This document describes the Report Generation API endpoints for comprehensive property analysis reports combining data from multiple external APIs and analysis engines.

## Table of Contents

- [Report Generation API](#report-generation-api)
  - [POST /api/report/generate](#post-apireportgenerate)
- [Full Property Analysis API](#full-property-analysis-api)
  - [POST /api/report/full-analysis](#post-apireportfull-analysis)
  - [GET /api/report/full-analysis](#get-apireportfull-analysis)
- [Data Sources](#data-sources)
- [Scoring System](#scoring-system)
- [Error Handling](#error-handling)

---

## Report Generation API

The Report Generation API fetches data from multiple external APIs in parallel and combines them into a comprehensive property analysis report. This endpoint is ideal for gathering raw data from various sources.

### POST /api/report/generate

Generate a comprehensive property analysis report by fetching data from multiple external APIs.

**Endpoint:** `POST /api/report/generate`

**Data Sources Integrated:**
- Elevation & terrain data (including slope analysis)
- Climate data
- NOAA weather alerts
- USGS seismic hazard data
- NASA FIRMS fire data
- EPA environmental sites
- Geoapify amenities
- FCC broadband availability
- Census geographic and demographic data
- OpenAI-generated investment summary

#### Request Body

```json
{
  "address": "123 Main St, Altoona, PA 16602",
  "parcelId": "12-345-678",
  "state": "PA",
  "coordinates": {
    "lat": 40.5186,
    "lng": -78.3947
  }
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | Full property address |
| `parcelId` | string | No | Property parcel ID |
| `state` | string | No | Two-letter state code (defaults to PA) |
| `coordinates` | object | No | Property coordinates |
| `coordinates.lat` | number | No | Latitude (-90 to 90) |
| `coordinates.lng` | number | No | Longitude (-180 to 180) |

**Note:** If coordinates are not provided, defaults to test coordinates for Altoona, PA (40.5186, -78.3947).

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "timestamp": "2024-01-23T08:30:00.000Z",
  "dataQuality": "complete",
  "sources": [
    {
      "name": "elevation",
      "status": "ok",
      "latency": 245
    },
    {
      "name": "climate",
      "status": "ok",
      "latency": 312
    },
    {
      "name": "noaa",
      "status": "ok",
      "latency": 189
    },
    {
      "name": "usgs",
      "status": "ok",
      "latency": 456
    },
    {
      "name": "nasa_firms",
      "status": "ok",
      "latency": 523
    },
    {
      "name": "epa",
      "status": "ok",
      "latency": 678
    },
    {
      "name": "geoapify",
      "status": "ok",
      "latency": 334
    },
    {
      "name": "fcc",
      "status": "ok",
      "latency": 289
    },
    {
      "name": "census",
      "status": "ok",
      "latency": 412
    },
    {
      "name": "openai",
      "status": "ok",
      "latency": 1234
    }
  ],
  "data": {
    "property": {
      "address": "123 Main St, Altoona, PA 16602",
      "parcelId": "12-345-678",
      "coordinates": {
        "lat": 40.5186,
        "lng": -78.3947
      },
      "state": "PA"
    },
    "elevation": {
      "elevation": 1184,
      "unit": "feet",
      "slope": 2.3,
      "terrain": "gentle slope",
      "developability": "good"
    },
    "climate": {
      "temperature": {
        "avg": 48.5,
        "min": 32.1,
        "max": 64.9
      },
      "precipitation": 42.5,
      "snowfall": 45.2,
      "growingDays": 160
    },
    "weatherAlerts": {
      "activeAlerts": 0,
      "alerts": []
    },
    "seismicHazard": {
      "pga": 0.04,
      "riskLevel": "very low",
      "description": "Minimal earthquake risk"
    },
    "wildfireData": {
      "activeFires": 0,
      "nearestFireDistance": null,
      "riskLevel": "low"
    },
    "environmentalSites": {
      "totalSites": 0,
      "nearestSiteDistance": null,
      "sites": []
    },
    "amenities": {
      "schools": 12,
      "hospitals": 3,
      "shopping": 45,
      "restaurants": 89,
      "parks": 15,
      "walkability": 65
    },
    "broadband": {
      "available": true,
      "providers": 5,
      "maxDownload": 1000,
      "maxUpload": 50,
      "fiberAvailable": true
    },
    "census": {
      "geographic": {
        "fips": "42013",
        "county": "Blair County",
        "state": "Pennsylvania",
        "tract": "0001.00",
        "blockGroup": "1"
      },
      "demographics": {
        "population": 122822,
        "medianAge": 43.2,
        "medianIncome": 48567,
        "povertyRate": 13.2,
        "employmentRate": 94.1,
        "educationBachelors": 21.4
      }
    },
    "aiSummary": "This property in Altoona, PA presents a moderate investment opportunity. The location benefits from low seismic and wildfire risks, good broadband infrastructure with fiber availability, and no nearby environmental contamination sites. The area has adequate amenities with a walkability score of 65. However, the median income of $48,567 and poverty rate of 13.2% suggest a working-class market with limited upside potential."
  }
}
```

#### Data Quality Indicators

The `dataQuality` field indicates the completeness of the report:

| Value | Description |
|-------|-------------|
| `complete` | All data sources returned successfully |
| `partial` | More than 50% of data sources returned successfully |
| `minimal` | 50% or fewer data sources returned successfully |

#### Source Status

Each source in the `sources` array has a status field:

| Status | Description |
|--------|-------------|
| `ok` | Data fetched successfully |
| `error` | Data fetch failed (check `error` field) |
| `skipped` | Data source was skipped |

#### Error Response

**Bad Request (400):**

```json
{
  "error": "Address is required"
}
```

**Server Error (500):**

```json
{
  "error": "Failed to generate report"
}
```

---

## Full Property Analysis API

The Full Property Analysis API generates comprehensive property analysis reports using all analysis engines including risk aggregation, financial analysis, and investment scoring. This is the most complete analysis endpoint available.

### POST /api/report/full-analysis

Generate a complete property analysis report with risk assessment, financial projections, and investment scoring.

**Endpoint:** `POST /api/report/full-analysis`

**Analysis Engines:**
- Risk Aggregation (FEMA, USGS, EPA, NASA FIRMS, NOAA, Elevation)
- Financial Analysis (costs, revenue, profit projections)
- Investment Scoring (125-point system across 5 categories)
- Market Comparables (via Realty in US API)

#### Request Body

```json
{
  "propertyId": "123e4567-e89b-12d3-a456-426614174000",
  "address": "123 Main St, Altoona, PA 16602",
  "coordinates": {
    "lat": 40.5186,
    "lng": -78.3947
  },
  "options": {
    "rehabScope": "moderate",
    "holdingMonths": 6,
    "purchasePrice": 45000,
    "skipRiskAnalysis": false,
    "skipFinancialAnalysis": false,
    "skipScoring": false,
    "includeLocationData": true
  }
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyId` | string (UUID) | No* | Property ID from Supabase properties table |
| `address` | string | No* | Full property address for lookup |
| `coordinates` | object | No* | Property coordinates |
| `coordinates.lat` | number | Conditional | Latitude (-90 to 90) |
| `coordinates.lng` | number | Conditional | Longitude (-180 to 180) |
| `options` | object | No | Analysis options |
| `options.rehabScope` | enum | No | Rehab scope: `cosmetic`, `light`, `moderate`, `heavy`, `gut` (default: `moderate`) |
| `options.holdingMonths` | number | No | Holding period in months (1-60, default: 6) |
| `options.purchasePrice` | number | No | Override purchase price (defaults to total_due from database) |
| `options.skipRiskAnalysis` | boolean | No | Skip risk analysis (default: false) |
| `options.skipFinancialAnalysis` | boolean | No | Skip financial analysis (default: false) |
| `options.skipScoring` | boolean | No | Skip investment scoring (default: false) |
| `options.includeLocationData` | boolean | No | Include location data (default: true) |

**Note:** Must provide at least one of: `propertyId`, `address`, or `coordinates`.

#### Rehab Scope Options

| Scope | Description | Typical Cost Range |
|-------|-------------|-------------------|
| `cosmetic` | Paint, fixtures, minor repairs | $5,000 - $15,000 |
| `light` | Cosmetic + flooring, appliances | $15,000 - $30,000 |
| `moderate` | Light + kitchen/bath updates | $30,000 - $60,000 |
| `heavy` | Moderate + structural, HVAC, roof | $60,000 - $100,000 |
| `gut` | Complete renovation | $100,000+ |

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "reportId": "rpt_7f8d9a2b4c1e3f5g6h7i8j9k",
  "report": {
    "property": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "address": "123 Main St, Altoona, PA 16602",
      "parcelId": "12-345-678",
      "coordinates": {
        "lat": 40.5186,
        "lng": -78.3947
      },
      "county": "Blair County",
      "state": "PA",
      "propertyType": "single_family",
      "totalDue": 42500
    },
    "riskAnalysis": {
      "overallRisk": "moderate",
      "riskScore": 18,
      "maxRiskScore": 25,
      "riskFactors": [
        {
          "category": "flood",
          "risk": "low",
          "score": 22,
          "details": {
            "floodZone": "X",
            "floodZoneDescription": "Minimal flood risk",
            "inFloodway": false
          }
        },
        {
          "category": "earthquake",
          "risk": "very low",
          "score": 24,
          "details": {
            "pga": 0.04,
            "description": "Minimal seismic activity expected"
          }
        },
        {
          "category": "wildfire",
          "risk": "low",
          "score": 23,
          "details": {
            "activeFires": 0,
            "nearestFireDistance": null
          }
        },
        {
          "category": "environmental",
          "risk": "low",
          "score": 24,
          "details": {
            "superfundSites": 0,
            "hazardousSites": 0,
            "nearestSiteDistance": null
          }
        },
        {
          "category": "climate",
          "risk": "low",
          "score": 21,
          "details": {
            "weatherAlerts": 0,
            "severeWeatherRisk": "low"
          }
        },
        {
          "category": "terrain",
          "risk": "low",
          "score": 23,
          "details": {
            "elevation": 1184,
            "slope": 2.3,
            "developability": "good"
          }
        }
      ]
    },
    "financialAnalysis": {
      "purchasePrice": 45000,
      "estimatedARV": 125000,
      "costs": {
        "acquisition": {
          "purchasePrice": 45000,
          "closingCosts": 2250,
          "total": 47250
        },
        "rehab": {
          "scope": "moderate",
          "estimate": 35000,
          "contingency": 3500,
          "total": 38500
        },
        "holding": {
          "months": 6,
          "utilities": 900,
          "insurance": 1200,
          "propertyTax": 1800,
          "maintenance": 600,
          "total": 4500
        },
        "selling": {
          "commission": 7500,
          "closingCosts": 1250,
          "total": 8750
        },
        "totalCosts": 99000
      },
      "revenue": {
        "estimatedARV": 125000,
        "salePrice": 125000
      },
      "profit": {
        "grossProfit": 26000,
        "netProfit": 26000,
        "roi": 26.26,
        "profitMargin": 20.8,
        "cashOnCash": 57.78
      },
      "comparables": {
        "count": 8,
        "avgSalePrice": 122500,
        "avgPricePerSqft": 98.5,
        "avgDaysOnMarket": 42,
        "priceRange": {
          "min": 105000,
          "max": 145000
        }
      }
    },
    "investmentScore": {
      "totalScore": 92,
      "maxScore": 125,
      "grade": "A-",
      "recommendation": "Strong Buy",
      "categories": {
        "location": {
          "score": 19,
          "maxScore": 25,
          "factors": {
            "demographics": 5,
            "amenities": 5,
            "walkability": 4,
            "broadband": 5
          }
        },
        "risk": {
          "score": 18,
          "maxScore": 25,
          "factors": {
            "flood": 5,
            "earthquake": 5,
            "wildfire": 4,
            "environmental": 4
          }
        },
        "financial": {
          "score": 20,
          "maxScore": 25,
          "factors": {
            "priceToARV": 5,
            "acquisitionCost": 5,
            "marketValue": 5,
            "profitMargin": 5
          }
        },
        "market": {
          "score": 17,
          "maxScore": 25,
          "factors": {
            "daysOnMarket": 4,
            "priceTrends": 5,
            "comparables": 4,
            "demand": 4
          }
        },
        "profit": {
          "score": 18,
          "maxScore": 25,
          "factors": {
            "roi": 5,
            "profitMargin": 4,
            "capRate": 4,
            "cashFlow": 5
          }
        }
      }
    },
    "locationData": {
      "amenities": {
        "schools": 12,
        "hospitals": 3,
        "shopping": 45,
        "restaurants": 89,
        "parks": 15,
        "walkability": 65
      },
      "broadband": {
        "available": true,
        "providers": 5,
        "maxDownload": 1000,
        "maxUpload": 50,
        "fiberAvailable": true
      },
      "demographics": {
        "population": 122822,
        "medianAge": 43.2,
        "medianIncome": 48567,
        "povertyRate": 13.2,
        "employmentRate": 94.1,
        "educationBachelors": 21.4
      }
    }
  },
  "metadata": {
    "generatedAt": "2024-01-23T08:30:00.000Z",
    "durationMs": 3456,
    "sources": [
      "supabase",
      "realty-api",
      "fema",
      "usgs",
      "nasa-firms",
      "epa",
      "noaa",
      "elevation",
      "geoapify",
      "fcc",
      "census"
    ],
    "sourcesUsed": [
      "supabase",
      "realty-api",
      "fema",
      "usgs",
      "nasa-firms",
      "epa",
      "noaa",
      "elevation",
      "geoapify",
      "fcc",
      "census"
    ],
    "sourcesFailed": [],
    "confidenceLevel": 95
  }
}
```

**Partial Success Response (422 Unprocessable Entity):**

When some analysis engines fail but others succeed:

```json
{
  "success": false,
  "reportId": "rpt_7f8d9a2b4c1e3f5g6h7i8j9k",
  "error": "Some analysis engines failed",
  "report": {
    "property": { ... },
    "riskAnalysis": { ... },
    "financialAnalysis": null,
    "investmentScore": null,
    "locationData": { ... }
  },
  "metadata": {
    "generatedAt": "2024-01-23T08:30:00.000Z",
    "durationMs": 2345,
    "sources": [
      "supabase",
      "fema",
      "usgs",
      "nasa-firms",
      "epa"
    ],
    "sourcesUsed": [
      "supabase",
      "fema",
      "usgs",
      "nasa-firms",
      "epa"
    ],
    "sourcesFailed": [
      "realty-api",
      "census"
    ],
    "confidenceLevel": 65
  }
}
```

#### Error Responses

**Bad Request (400):**

```json
{
  "success": false,
  "error": "Invalid JSON in request body"
}
```

```json
{
  "success": false,
  "error": "Must provide at least one of: propertyId, address, or coordinates"
}
```

```json
{
  "success": false,
  "error": "propertyId must be a valid UUID"
}
```

```json
{
  "success": false,
  "error": "coordinates.lat must be between -90 and 90"
}
```

```json
{
  "success": false,
  "error": "options.rehabScope must be one of: cosmetic, light, moderate, heavy, gut"
}
```

```json
{
  "success": false,
  "error": "options.holdingMonths must be a number between 1 and 60"
}
```

**Server Error (500):**

```json
{
  "success": false,
  "reportId": "",
  "error": "Internal server error",
  "metadata": {
    "generatedAt": "2024-01-23T08:30:00.000Z",
    "durationMs": 0,
    "sources": [],
    "sourcesUsed": [],
    "sourcesFailed": [],
    "confidenceLevel": 0
  }
}
```

### GET /api/report/full-analysis

Returns API documentation and metadata.

**Endpoint:** `GET /api/report/full-analysis`

#### Response

**Success Response (200 OK):**

```json
{
  "name": "Full Property Analysis API",
  "version": "2.0.0",
  "description": "Generate comprehensive property analysis reports with risk assessment, financial projections, and investment scoring.",
  "endpoints": {
    "POST /api/report/full-analysis": {
      "description": "Generate a full property analysis report",
      "request": {
        "body": {
          "propertyId": {
            "type": "string (UUID)",
            "required": false,
            "description": "Property ID from Supabase properties table"
          },
          "address": {
            "type": "string",
            "required": false,
            "description": "Full property address for lookup"
          },
          "coordinates": {
            "type": "{ lat: number, lng: number }",
            "required": false,
            "description": "Property coordinates"
          },
          "options": {
            "type": "object",
            "required": false,
            "properties": {
              "rehabScope": {
                "type": "string",
                "enum": ["cosmetic", "light", "moderate", "heavy", "gut"],
                "default": "moderate"
              },
              "holdingMonths": {
                "type": "number",
                "default": 6,
                "min": 1,
                "max": 60
              },
              "purchasePrice": {
                "type": "number",
                "description": "Override purchase price (defaults to total_due)"
              },
              "skipRiskAnalysis": { "type": "boolean", "default": false },
              "skipFinancialAnalysis": { "type": "boolean", "default": false },
              "skipScoring": { "type": "boolean", "default": false },
              "includeLocationData": { "type": "boolean", "default": true }
            }
          }
        },
        "note": "Must provide at least one of: propertyId, address, or coordinates"
      },
      "response": {
        "success": "boolean",
        "reportId": "string",
        "report": "PropertyReportData (when success=true)",
        "error": "string (when success=false)",
        "metadata": {
          "generatedAt": "ISO timestamp",
          "durationMs": "number",
          "sources": "string[]",
          "sourcesUsed": "string[]",
          "sourcesFailed": "string[]",
          "confidenceLevel": "number (0-100)"
        }
      }
    }
  },
  "dataSourcesIntegrated": [
    "Supabase (property data, regrid data)",
    "Realty in US API (comparables)",
    "FEMA NFHL (flood zones)",
    "USGS (seismic hazard)",
    "NASA FIRMS (wildfire)",
    "EPA Envirofacts (environmental sites)",
    "NOAA (climate risk)",
    "Open-Elevation (slope/elevation)",
    "Geoapify (amenities)",
    "FCC (broadband)",
    "Census (demographics)"
  ],
  "scoringSystem": {
    "maxPoints": 125,
    "categories": [
      {
        "name": "Location",
        "maxPoints": 25,
        "factors": ["demographics", "amenities", "walkability", "broadband"]
      },
      {
        "name": "Risk",
        "maxPoints": 25,
        "factors": ["flood", "earthquake", "wildfire", "environmental"]
      },
      {
        "name": "Financial",
        "maxPoints": 25,
        "factors": ["price-to-ARV", "acquisition cost", "market value"]
      },
      {
        "name": "Market",
        "maxPoints": 25,
        "factors": ["days on market", "price trends", "comparables"]
      },
      {
        "name": "Profit",
        "maxPoints": 25,
        "factors": ["ROI", "profit margin", "cap rate", "cash flow"]
      }
    ],
    "grades": ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"]
  },
  "exampleRequest": {
    "propertyId": "123e4567-e89b-12d3-a456-426614174000",
    "options": {
      "rehabScope": "moderate",
      "holdingMonths": 6,
      "includeLocationData": true
    }
  }
}
```

---

## Data Sources

### Report Generation API Data Sources

| Source | Description | Data Provided |
|--------|-------------|---------------|
| **Open-Elevation** | Elevation and terrain analysis | Elevation, slope, terrain classification, developability |
| **Climate Service** | Historical climate data | Temperature, precipitation, snowfall, growing days |
| **NOAA** | Weather alerts and forecasts | Active weather alerts, severe weather warnings |
| **USGS** | Seismic hazard data | Peak ground acceleration (PGA), earthquake risk level |
| **NASA FIRMS** | Active fire data | Wildfire locations, distances, risk levels |
| **EPA Envirofacts** | Environmental sites | Superfund sites, hazardous waste sites, distances |
| **Geoapify** | Points of interest | Schools, hospitals, shopping, restaurants, parks, walkability |
| **FCC** | Broadband availability | Internet providers, speeds, fiber availability |
| **Census Bureau** | Demographics | Population, income, employment, education |
| **OpenAI** | AI-generated summary | Executive investment summary |

### Full Analysis API Data Sources

All sources from Report Generation API, plus:

| Source | Description | Data Provided |
|--------|-------------|---------------|
| **Supabase** | Property database | Property details, parcel IDs, coordinates, auction data |
| **Realty in US API** | Real estate comparables | Comparable sales, market trends, price per sqft |
| **FEMA NFHL** | Flood zone data | Flood zones, floodway status, flood risk |

---

## Scoring System

The Full Property Analysis API uses a 125-point investment scoring system across 5 categories:

### Score Breakdown

| Category | Points | Factors |
|----------|--------|---------|
| **Location** | 25 | Demographics (5), Amenities (10), Walkability (5), Broadband (5) |
| **Risk** | 25 | Flood (7), Earthquake (6), Wildfire (6), Environmental (6) |
| **Financial** | 25 | Price-to-ARV (10), Acquisition Cost (5), Market Value (5), Profit Margin (5) |
| **Market** | 25 | Days on Market (7), Price Trends (8), Comparables (5), Demand (5) |
| **Profit** | 25 | ROI (8), Profit Margin (7), Cap Rate (5), Cash Flow (5) |

### Investment Grades

| Grade | Score Range | Recommendation |
|-------|-------------|----------------|
| **A+** | 115-125 | Exceptional Buy |
| **A** | 105-114 | Strong Buy |
| **A-** | 95-104 | Buy |
| **B+** | 90-94 | Consider Buy |
| **B** | 85-89 | Moderate Interest |
| **B-** | 80-84 | Weak Interest |
| **C+** | 75-79 | Pass |
| **C** | 70-74 | Avoid |
| **C-** | 60-69 | Strong Avoid |
| **D+** | 50-59 | Do Not Buy |
| **D** | 40-49 | High Risk |
| **D-** | 30-39 | Very High Risk |
| **F** | 0-29 | Unacceptable |

---

## Error Handling

### Common Error Scenarios

#### Missing Required Fields

**Request:**
```json
{
  "parcelId": "12-345-678"
}
```

**Response (400):**
```json
{
  "error": "Address is required"
}
```

#### Invalid UUID Format

**Request:**
```json
{
  "propertyId": "invalid-uuid"
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "propertyId must be a valid UUID"
}
```

#### Invalid Coordinates

**Request:**
```json
{
  "address": "123 Main St",
  "coordinates": {
    "lat": 95.0,
    "lng": -78.3947
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "coordinates.lat must be between -90 and 90"
}
```

#### Invalid Options

**Request:**
```json
{
  "propertyId": "123e4567-e89b-12d3-a456-426614174000",
  "options": {
    "rehabScope": "extreme",
    "holdingMonths": 72
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "options.rehabScope must be one of: cosmetic, light, moderate, heavy, gut"
}
```

#### Partial Data Failures

When some data sources fail but the report can still be generated:

**Response (200 with partial data):**
```json
{
  "success": true,
  "timestamp": "2024-01-23T08:30:00.000Z",
  "dataQuality": "partial",
  "sources": [
    {
      "name": "elevation",
      "status": "ok",
      "latency": 245
    },
    {
      "name": "census",
      "status": "error",
      "error": "API rate limit exceeded"
    }
  ],
  "data": {
    "elevation": { ... },
    "census": null
  }
}
```

#### Complete Failure

When critical errors occur:

**Response (500):**
```json
{
  "error": "Failed to generate report"
}
```

Or for full-analysis endpoint:

```json
{
  "success": false,
  "reportId": "",
  "error": "Internal server error",
  "metadata": {
    "generatedAt": "2024-01-23T08:30:00.000Z",
    "durationMs": 0,
    "sources": [],
    "sourcesUsed": [],
    "sourcesFailed": [],
    "confidenceLevel": 0
  }
}
```

### Best Practices

1. **Always check the `success` field** in full-analysis responses
2. **Monitor `dataQuality`** in report-generate responses to assess completeness
3. **Review `sourcesFailed`** array to understand which data sources had issues
4. **Check `confidenceLevel`** (0-100) to gauge report reliability
5. **Handle partial failures gracefully** - reports may still have valuable data even with some source failures
6. **Implement retry logic** for transient errors (rate limits, timeouts)
7. **Cache responses** when appropriate to reduce API calls and costs

### HTTP Status Codes

| Status Code | Meaning | Action |
|-------------|---------|--------|
| **200** | Success | Process report data |
| **400** | Bad Request | Fix request parameters |
| **422** | Unprocessable Entity | Partial success - check which sources failed |
| **500** | Internal Server Error | Retry or contact support |

---

## Usage Examples

### Example 1: Generate Basic Report

```javascript
// Generate report for a property address
const response = await fetch('/api/report/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    address: '123 Main St, Altoona, PA 16602',
  }),
});

const report = await response.json();
console.log('Data quality:', report.dataQuality);
console.log('AI Summary:', report.data.aiSummary);
```

### Example 2: Generate Full Analysis with Options

```javascript
// Generate comprehensive analysis with custom options
const response = await fetch('/api/report/full-analysis', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    propertyId: '123e4567-e89b-12d3-a456-426614174000',
    options: {
      rehabScope: 'heavy',
      holdingMonths: 12,
      purchasePrice: 50000,
      includeLocationData: true,
    },
  }),
});

const result = await response.json();

if (result.success) {
  console.log('Investment Grade:', result.report.investmentScore.grade);
  console.log('Total Score:', result.report.investmentScore.totalScore);
  console.log('ROI:', result.report.financialAnalysis.profit.roi + '%');
} else {
  console.error('Analysis failed:', result.error);
  console.log('Confidence level:', result.metadata.confidenceLevel);
}
```

### Example 3: Error Handling

```javascript
async function generateReport(propertyId) {
  try {
    const response = await fetch('/api/report/full-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ propertyId }),
    });

    const result = await response.json();

    // Check for partial success
    if (!result.success) {
      console.warn('Some analysis engines failed');
      console.log('Failed sources:', result.metadata.sourcesFailed);

      // Still use available data
      if (result.report) {
        console.log('Available data:', Object.keys(result.report).filter(k => result.report[k] !== null));
      }

      return result;
    }

    // Full success
    return result;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

### Example 4: Monitor API Performance

```javascript
// Track source performance
const response = await fetch('/api/report/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    address: '123 Main St, Altoona, PA 16602',
  }),
});

const report = await response.json();

// Analyze source performance
report.sources.forEach(source => {
  console.log(`${source.name}: ${source.status} (${source.latency}ms)`);
  if (source.status === 'error') {
    console.error(`  Error: ${source.error}`);
  }
});

// Find slowest sources
const slowSources = report.sources
  .filter(s => s.status === 'ok')
  .sort((a, b) => b.latency - a.latency)
  .slice(0, 3);

console.log('Slowest sources:', slowSources.map(s => s.name));
```

---

## Related Documentation

- [Financial Analysis API](./analysis.md#financial-analysis-api)
- [Risk Analysis API](./analysis.md#risk-analysis-api)
- [Properties API](./properties.md)
- [Counties API](./counties.md)
