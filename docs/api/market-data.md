# Market Data API

The Market Data API provides comprehensive market intelligence endpoints for property investment analysis, including market trends, crime statistics, zoning regulations, and comparable property data.

## Table of Contents

- [Overview](#overview)
- [Endpoints](#endpoints)
  - [GET /api/market](#get-apimarket)
  - [GET /api/crime](#get-apicrime)
  - [GET /api/zoning](#get-apizoning)
  - [GET /api/comparables](#get-apicomparables)
  - [POST /api/comparables](#post-apicomparables)
- [Data Models](#data-models)
- [Common Use Cases](#common-use-cases)

---

## Overview

The Market Data API aggregates data from multiple sources to provide real-time market intelligence for tax auction property analysis. It combines Zillow, Realty in US, FBI Crime Data, and local zoning databases.

**Base Paths:**
- `/api/market` - Combined market data
- `/api/crime` - Crime statistics
- `/api/zoning` - Zoning regulations
- `/api/comparables` - Comparable properties

**Total Endpoints:** 5

**Authentication:** None required (public endpoints)

**External Data Sources:**
- **Zillow API:** Property details, price history, tax history, Zestimates
- **Realty in US API:** Sold comparables, active listings
- **FBI Crime Data Explorer:** State-level crime statistics
- **Supabase:** Zoning regulations database

---

## Endpoints

### GET /api/market

Returns comprehensive market data combining Zillow and Realty in US APIs. Supports both area-wide searches and property-specific lookups.

**HTTP Method:** `GET`

**URL:** `/api/market`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | String | No | `'area'` (default) or `'property'` |
| `location` | String | Yes* | City, State or ZIP code (for area mode) |
| `address` | String | Yes* | Full property address (for property mode) |
| `zpid` | String | No | Zillow Property ID (alternative to address) |
| `lat` | Number | No | Latitude (alternative to location/address) |
| `lng` | Number | Longitude (alternative to location/address) |
| `radius_miles` | Number | No | Search radius (default 1) |
| `limit` | Number | No | Max results (default 20, max 50) |

*Required: Either `location` OR `lat`/`lng` for area mode; either `address` OR `zpid` for property mode.

**Mode: Area (Default)**

Returns market overview for a geographic area.

**Request Example:**

```bash
# By ZIP code
curl -X GET "https://your-domain.com/api/market?location=16601&radius_miles=5&limit=20"

# By city/state
curl -X GET "https://your-domain.com/api/market?location=Altoona,PA&radius_miles=3"

# By coordinates
curl -X GET "https://your-domain.com/api/market?lat=40.5187&lng=-78.3947&radius_miles=2"
```

**Response Format (Area Mode):**

```json
{
  "success": true,
  "data": {
    "realty": {
      "comparables": [
        {
          "property_id": "12345",
          "address": "123 Main St",
          "city": "Altoona",
          "state": "PA",
          "zip_code": "16601",
          "sold_price": 125000,
          "sold_date": "2024-01-15",
          "bedrooms": 3,
          "bathrooms": 2,
          "sqft": 1500,
          "lot_size": 0.25,
          "year_built": 1985,
          "price_per_sqft": 83.33,
          "days_on_market": 45,
          "property_type": "single_family"
        }
      ],
      "statistics": {
        "count": 18,
        "avg_sold_price": 132500,
        "median_sold_price": 128000,
        "min_sold_price": 85000,
        "max_sold_price": 225000,
        "avg_price_per_sqft": 87.50,
        "avg_days_on_market": 52
      },
      "activeListingsCount": 24
    },
    "zillow": {
      "recentlySold": [
        {
          "zpid": "12345678",
          "address": "456 Oak Ave, Altoona, PA 16601",
          "price": 135000,
          "zestimate": 138500,
          "bedrooms": 3,
          "bathrooms": 2,
          "livingArea": 1600,
          "daysOnZillow": 38
        }
      ],
      "forSale": [
        {
          "zpid": "87654321",
          "address": "789 Pine St, Altoona, PA 16601",
          "price": 149900,
          "zestimate": 145000,
          "bedrooms": 4,
          "bathrooms": 2.5,
          "livingArea": 1850,
          "daysOnZillow": 12
        }
      ],
      "medianZestimate": 142000,
      "avgZestimate": 143250
    },
    "calculatedMetrics": {
      "listToSaleRatio": 0.98,
      "absorptionRate": 0.75,
      "inventoryMonths": 4.2,
      "marketType": "balanced",
      "marketHealth": 72,
      "pricePerSqftTrend": 1.05,
      "velocityScore": 68
    },
    "historicalMetrics": {
      "priceChangeYoY": 0.08,
      "volumeChangeYoY": 0.12,
      "daysOnMarketChangeYoY": -0.05,
      "priceVolatility": 0.15
    },
    "combined": {
      "medianPrice": 135000,
      "avgPricePerSqft": 87.50,
      "avgDaysOnMarket": 48,
      "activeListings": 24,
      "recentSales": 18,
      "zestimateVsSoldDiff": 0.025,
      "marketType": "balanced",
      "marketHealth": 72,
      "dataConfidence": "high"
    },
    "sources": {
      "realty": true,
      "zillow": true,
      "timestamp": "2024-01-23T10:30:00Z"
    }
  },
  "meta": {
    "mode": "area",
    "location": "16601",
    "timestamp": "2024-01-23T10:30:00Z"
  }
}
```

**Mode: Property**

Returns detailed data for a specific property.

**Request Example:**

```bash
# By address
curl -X GET "https://your-domain.com/api/market?mode=property&address=123%20Main%20St,%20Altoona,%20PA%2016601"

# By Zillow Property ID
curl -X GET "https://your-domain.com/api/market?mode=property&zpid=12345678"
```

**Response Format (Property Mode):**

```json
{
  "success": true,
  "data": {
    "property": {
      "zpid": "12345678",
      "address": {
        "streetAddress": "123 Main St",
        "city": "Altoona",
        "state": "PA",
        "zipcode": "16601",
        "latitude": 40.5187,
        "longitude": -78.3947
      },
      "bedrooms": 3,
      "bathrooms": 2,
      "livingArea": 1500,
      "lotAreaValue": 10890,
      "lotAreaUnit": "sqft",
      "yearBuilt": 1985,
      "propertyType": "SINGLE_FAMILY",
      "price": 125000,
      "zestimate": 128500,
      "rentZestimate": 1250,
      "taxAssessedValue": 95000,
      "priceHistory": [
        {
          "date": "2024-01-15",
          "event": "Sold",
          "price": 125000,
          "pricePerSquareFoot": 83.33
        }
      ],
      "taxHistory": [
        {
          "time": 2023,
          "taxPaid": 2850,
          "taxIncreaseRate": 0.03
        }
      ]
    },
    "priceTrends": {
      "priceChangeYoY": 0.08,
      "avgAnnualChange": 0.065,
      "totalAppreciation": 0.32,
      "yearsOfData": 5,
      "trend": "increasing"
    },
    "taxTrends": {
      "taxChangeYoY": 0.03,
      "avgAnnualTaxChange": 0.04,
      "totalTaxIncrease": 0.18,
      "yearsOfData": 5,
      "trend": "increasing"
    },
    "nearbyComparables": [
      {
        "property_id": "98765",
        "address": "456 Oak Ave",
        "sold_price": 130000,
        "sold_date": "2023-12-10",
        "sqft": 1550,
        "price_per_sqft": 83.87
      }
    ],
    "climateRisk": {
      "flood": 2,
      "fire": 1,
      "wind": 3,
      "heat": 2
    },
    "schools": [
      {
        "name": "Altoona Elementary School",
        "rating": 7,
        "level": "Elementary",
        "distance": 0.8
      },
      {
        "name": "Altoona High School",
        "rating": 6,
        "level": "High",
        "distance": 2.1
      }
    ],
    "sources": {
      "zillow": true,
      "realty": true,
      "timestamp": "2024-01-23T10:30:00Z"
    }
  },
  "meta": {
    "mode": "property",
    "timestamp": "2024-01-23T10:30:00Z"
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Missing required parameters |
| 500 | External API error or server error |

**Error Response Example:**

```json
{
  "success": false,
  "error": "Either location or lat/lng coordinates are required",
  "timestamp": "2024-01-23T10:30:00Z"
}
```

---

### GET /api/crime

Returns crime statistics and risk assessment for a given state using FBI Crime Data Explorer.

**HTTP Method:** `GET`

**URL:** `/api/crime`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `state` | String | Yes | Two-letter state code (e.g., "PA", "FL", "TX") |

**Request Example:**

```bash
curl -X GET "https://your-domain.com/api/crime?state=PA"
```

**Response Format:**

```json
{
  "success": true,
  "data": {
    "state": "Pennsylvania",
    "stateAbbr": "PA",
    "year": 2023,
    "riskLevel": "moderate",
    "violentCrimeRate": 389.4,
    "propertyCrimeRate": 1678.2,
    "nationalComparison": {
      "violent": "below_national_avg",
      "property": "below_national_avg"
    },
    "trend": {
      "direction": "decreasing",
      "percentage": -3.2
    },
    "topOffenses": [
      {
        "offense": "Larceny-Theft",
        "count": 125430,
        "rate": 980.5
      },
      {
        "offense": "Burglary",
        "count": 28765,
        "rate": 224.8
      },
      {
        "offense": "Aggravated Assault",
        "count": 35210,
        "rate": 275.2
      }
    ]
  },
  "cached": true,
  "source": "FBI Crime Data Explorer"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `state` | String | Full state name |
| `stateAbbr` | String | Two-letter state code |
| `year` | Number | Latest year of available data |
| `riskLevel` | String | Overall risk: `"low"`, `"moderate"`, or `"high"` |
| `violentCrimeRate` | Number | Violent crimes per 100,000 residents |
| `propertyCrimeRate` | Number | Property crimes per 100,000 residents |
| `nationalComparison` | Object | Comparison to national averages |
| `trend` | Object | Crime trend direction and percentage change |
| `topOffenses` | Array | Top 3 offenses by count |

**Fallback Behavior:**

If the FBI API is unavailable, the endpoint returns a fallback response with `riskLevel: "moderate"` and `success: false`.

```json
{
  "success": false,
  "error": "Failed to fetch crime data",
  "data": {
    "state": "PENNSYLVANIA",
    "stateAbbr": "PA",
    "riskLevel": "moderate",
    "source": "fallback"
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success (includes both successful data fetch and fallback) |
| 400 | Missing state parameter |

---

### GET /api/zoning

Returns zoning regulations by state, county, and zoning code. Falls back to intelligent defaults when specific rules are not found.

**HTTP Method:** `GET`

**URL:** `/api/zoning`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | String | Yes | Zoning code (e.g., "R-1", "C-2", "I-1") |
| `state` | String | Yes | Two-letter state code (e.g., "PA") |
| `county` | String | No | County name (e.g., "Blair") |

**Request Example:**

```bash
# County-specific lookup
curl -X GET "https://your-domain.com/api/zoning?code=R-1&state=PA&county=Blair"

# State-wide lookup
curl -X GET "https://your-domain.com/api/zoning?code=R-1&state=PA"
```

**Response Format:**

```json
{
  "success": true,
  "data": {
    "zoning_code": "R-1",
    "zoning_name": "Single Family Residential",
    "zoning_category": "residential",
    "permitted_uses": [
      "Single-family dwelling",
      "Home occupation",
      "Accessory structures"
    ],
    "conditional_uses": [
      "Home-based business",
      "Accessory dwelling unit"
    ],
    "prohibited_uses": [
      "Multi-family dwelling",
      "Commercial activities",
      "Industrial uses"
    ],
    "min_lot_size_sqft": 10000,
    "front_setback_ft": 30,
    "side_setback_ft": 10,
    "rear_setback_ft": 30,
    "max_height_ft": 35,
    "max_stories": 2,
    "source_url": "https://www.blairco.org/zoning",
    "is_default": false,
    "notes": "County-specific regulations for Blair County, PA"
  },
  "meta": {
    "source": "county_specific",
    "dataSourceType": "live",
    "county": "Blair",
    "timestamp": "2024-01-23T10:30:00Z"
  }
}
```

**Intelligent Defaults:**

When county-specific data is unavailable, the API returns intelligent defaults based on common zoning patterns:

| Zoning Code Prefix | Category | Example Defaults |
|-------------------|----------|------------------|
| R-1, RS, SFR | Residential (Low Density) | 10,000 sqft min lot, 35 ft max height |
| R-2, RM, MFR | Residential (Medium Density) | 7,500 sqft min lot, 35 ft max height |
| R-3, R-4, RH | Residential (High Density) | 5,000 sqft min lot, 45 ft max height |
| C-1, NC, CN | Commercial (Neighborhood) | 5,000 sqft min lot, 35 ft max height |
| C-2, C-3, GC, CG | Commercial (General) | 10,000 sqft min lot, 45 ft max height |
| I-1, LI, M-1 | Industrial (Light) | 20,000 sqft min lot, 50 ft max height |
| I-2, HI, M-2 | Industrial (Heavy) | 40,000 sqft min lot, 60 ft max height |
| A, AG | Agricultural | 43,560 sqft min lot (1 acre), 35 ft max height |
| MX, MU | Mixed Use | 5,000 sqft min lot, 50 ft max height |

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `zoning_code` | String | Zoning designation |
| `zoning_name` | String | Human-readable name |
| `zoning_category` | String | Category: residential, commercial, industrial, agricultural, mixed |
| `permitted_uses` | Array | Allowed uses by right |
| `conditional_uses` | Array | Uses allowed with special permit |
| `prohibited_uses` | Array | Explicitly prohibited uses |
| `min_lot_size_sqft` | Number | Minimum lot size in square feet |
| `front_setback_ft` | Number | Front yard setback in feet |
| `side_setback_ft` | Number | Side yard setback in feet |
| `rear_setback_ft` | Number | Rear yard setback in feet |
| `max_height_ft` | Number | Maximum building height in feet |
| `max_stories` | Number | Maximum number of stories |
| `source_url` | String | Link to official zoning ordinance (if available) |
| `is_default` | Boolean | Whether this is default data or county-specific |
| `notes` | String | Additional notes or warnings |

**Data Source Types:**

| Type | Description |
|------|-------------|
| `live` | Real data from county-specific database |
| `partial` | State-wide defaults from database |
| `sample` | Intelligent defaults generated on-the-fly |

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success (includes database results and intelligent defaults) |
| 400 | Missing required parameters (code or state) |
| 500 | Server error (fallback to intelligent defaults) |

---

### GET /api/comparables

Returns comparable properties from Realty in US API. Supports coordinate-based or postal code search.

**HTTP Method:** `GET`

**URL:** `/api/comparables`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | Number | Yes* | Latitude |
| `lng` | Number | Yes* | Longitude |
| `postal_code` | String | Yes* | ZIP code |
| `radius_miles` | Number | No | Search radius (default 1) |
| `limit` | Number | No | Max results (default 10, max 50) |
| `status` | String | No | `'sold'` (default) or `'for_sale'` |
| `beds_min` | Number | No | Minimum bedrooms |
| `beds_max` | Number | No | Maximum bedrooms |
| `sqft_min` | Number | No | Minimum square footage |
| `sqft_max` | Number | No | Maximum square footage |
| `prop_type` | String | No | `'single_family'`, `'condo'`, `'townhome'`, `'multi_family'`, `'land'` |
| `mode` | String | No | `'standard'` (default) or `'enhanced'` |

*Required: Either `postal_code` OR `lat`/`lng` coordinates.

**Standard Mode Request Example:**

```bash
# By coordinates
curl -X GET "https://your-domain.com/api/comparables?lat=40.5187&lng=-78.3947&radius_miles=1&limit=10"

# By ZIP code with filters
curl -X GET "https://your-domain.com/api/comparables?postal_code=16601&radius_miles=2&beds_min=3&beds_max=4&prop_type=single_family"
```

**Standard Mode Response:**

```json
{
  "success": true,
  "data": {
    "comparables": [
      {
        "property_id": "12345",
        "address": "123 Main St",
        "city": "Altoona",
        "state": "PA",
        "zip_code": "16601",
        "sold_price": 125000,
        "sold_date": "2024-01-15",
        "bedrooms": 3,
        "bathrooms": 2,
        "sqft": 1500,
        "lot_size": 0.25,
        "year_built": 1985,
        "price_per_sqft": 83.33,
        "days_on_market": 45,
        "property_type": "single_family",
        "distance_miles": 0.3
      }
    ],
    "statistics": {
      "count": 10,
      "avg_sold_price": 132500,
      "median_sold_price": 128000,
      "min_sold_price": 85000,
      "max_sold_price": 225000,
      "avg_price_per_sqft": 87.50,
      "avg_days_on_market": 52
    }
  },
  "meta": {
    "source": "realty-in-us",
    "mode": "standard",
    "cached": false,
    "timestamp": "2024-01-23T10:30:00Z"
  }
}
```

**Enhanced Mode:**

Enhanced mode (`?mode=enhanced`) includes additional market metrics and historical analysis.

**Enhanced Mode Request Example:**

```bash
curl -X GET "https://your-domain.com/api/comparables?postal_code=16601&mode=enhanced&limit=20"
```

**Enhanced Mode Response:**

```json
{
  "success": true,
  "data": {
    "comparables": [...],
    "statistics": {...},
    "activeListingsCount": 24,
    "calculatedMetrics": {
      "listToSaleRatio": 0.98,
      "absorptionRate": 0.75,
      "inventoryMonths": 4.2,
      "marketType": "balanced",
      "marketHealth": 72,
      "pricePerSqftTrend": 1.05,
      "velocityScore": 68,
      "competitionLevel": "moderate",
      "demandIndicator": 0.78
    },
    "historicalMetrics": {
      "priceChangeYoY": 0.08,
      "volumeChangeYoY": 0.12,
      "daysOnMarketChangeYoY": -0.05,
      "priceVolatility": 0.15,
      "seasonalAdjustment": 1.03
    },
    "dataSourceType": "live"
  },
  "meta": {
    "source": "realty-in-us",
    "mode": "enhanced",
    "cached": false,
    "timestamp": "2024-01-23T10:30:00Z"
  }
}
```

**Calculated Metrics Explanation:**

| Metric | Range | Description |
|--------|-------|-------------|
| `listToSaleRatio` | 0-1+ | Ratio of sale price to list price (>1 = seller's market) |
| `absorptionRate` | 0-1 | Rate at which inventory is being absorbed |
| `inventoryMonths` | 0-12+ | Months of inventory at current sales pace |
| `marketType` | - | `"buyers"`, `"sellers"`, or `"balanced"` |
| `marketHealth` | 0-100 | Overall market health score |
| `pricePerSqftTrend` | 0-2 | Price per sqft trend (1 = stable, >1 = increasing) |
| `velocityScore` | 0-100 | How quickly properties are selling |
| `competitionLevel` | - | `"low"`, `"moderate"`, or `"high"` |
| `demandIndicator` | 0-1 | Buyer demand indicator |

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Missing required parameters |
| 500 | External API error or server error |

---

### POST /api/comparables

Alternative method to fetch comparables using a JSON body instead of query parameters.

**HTTP Method:** `POST`

**URL:** `/api/comparables`

**Request Body:**

```json
{
  "lat": 40.5187,
  "lng": -78.3947,
  "radius_miles": 1,
  "limit": 10,
  "beds_min": 3,
  "beds_max": 4,
  "sqft_min": 1200,
  "sqft_max": 2000,
  "prop_type": "single_family"
}
```

**Request Body (Postal Code):**

```json
{
  "postal_code": "16601",
  "radius_miles": 2,
  "limit": 20,
  "prop_type": "single_family"
}
```

**Response Format:**

Same as GET endpoint (standard mode only).

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Invalid request body or missing required fields |
| 500 | External API error or server error |

---

## Data Models

### Combined Market Data

```typescript
interface CombinedMarketData {
  realty: {
    comparables: RealtyComparable[];
    statistics: MarketStatistics;
    activeListingsCount: number | null;
  };
  zillow: {
    recentlySold: ZillowSearchResult[];
    forSale: ZillowSearchResult[];
    medianZestimate: number | null;
    avgZestimate: number | null;
  };
  calculatedMetrics: CalculatedMarketMetrics | null;
  historicalMetrics: MarketHistoryMetrics | null;
  combined: {
    medianPrice: number | null;
    avgPricePerSqft: number | null;
    avgDaysOnMarket: number | null;
    activeListings: number;
    recentSales: number;
    zestimateVsSoldDiff: number | null;
    marketType: 'buyers' | 'sellers' | 'balanced';
    marketHealth: number;
    dataConfidence: 'high' | 'medium' | 'low';
  };
  sources: {
    realty: boolean;
    zillow: boolean;
    timestamp: string;
  };
}
```

### Property Market Data

```typescript
interface PropertyMarketData {
  property: ZillowProperty | null;
  priceTrends: PriceTrendAnalysis | null;
  taxTrends: TaxTrendAnalysis | null;
  nearbyComparables: RealtyComparable[];
  climateRisk: {
    flood: number | null;
    fire: number | null;
    wind: number | null;
    heat: number | null;
  } | null;
  schools: Array<{
    name: string;
    rating: number | null;
    level: string;
    distance: number;
  }>;
  sources: {
    zillow: boolean;
    realty: boolean;
    timestamp: string;
  };
}
```

### Realty Comparable

```typescript
interface RealtyComparable {
  property_id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  sold_price: number;
  sold_date: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lot_size: number;
  year_built: number;
  price_per_sqft: number;
  days_on_market: number;
  property_type: string;
  distance_miles?: number;
}
```

### Zoning Rules

```typescript
interface ZoningRules {
  zoning_code: string;
  zoning_name: string | null;
  zoning_category: string | null;
  permitted_uses: string[];
  conditional_uses: string[];
  prohibited_uses: string[];
  min_lot_size_sqft: number | null;
  front_setback_ft: number | null;
  side_setback_ft: number | null;
  rear_setback_ft: number | null;
  max_height_ft: number | null;
  max_stories: number | null;
  source_url: string | null;
  is_default: boolean;
  notes: string | null;
}
```

### Crime Data

```typescript
interface CrimeData {
  state: string;
  stateAbbr: string;
  year: number;
  riskLevel: 'low' | 'moderate' | 'high';
  violentCrimeRate: number;
  propertyCrimeRate: number;
  nationalComparison: {
    violent: string;
    property: string;
  };
  trend: {
    direction: string;
    percentage: number;
  };
  topOffenses: Array<{
    offense: string;
    count: number;
    rate: number;
  }>;
}
```

---

## Common Use Cases

### 1. Property Investment Analysis

**Scenario:** Analyze a specific property for investment potential.

```bash
# Step 1: Get property-specific market data
curl -X GET "https://your-domain.com/api/market?mode=property&address=123%20Main%20St,%20Altoona,%20PA%2016601"

# Step 2: Get zoning regulations
curl -X GET "https://your-domain.com/api/zoning?code=R-1&state=PA&county=Blair"

# Step 3: Get crime statistics
curl -X GET "https://your-domain.com/api/crime?state=PA"

# Step 4: Get nearby comparables with enhanced metrics
curl -X GET "https://your-domain.com/api/comparables?lat=40.5187&lng=-78.3947&mode=enhanced&radius_miles=1"
```

**What you get:**
- Property price history and trends
- Tax history and trends
- Nearby comparables
- Climate risk scores
- School ratings
- Zoning restrictions and permitted uses
- State crime statistics
- Market health indicators

### 2. Market Research for Area

**Scenario:** Research a ZIP code or city for potential investment opportunities.

```bash
# Get comprehensive area market data
curl -X GET "https://your-domain.com/api/market?location=16601&radius_miles=5&limit=50"
```

**What you get:**
- 50 recent sold comparables
- Current active listings count
- Median and average prices
- Price per square foot trends
- Average days on market
- Zillow Zestimates for area
- Market type (buyer's/seller's/balanced)
- Market health score
- Data confidence level

### 3. Filtering Comparables

**Scenario:** Find comparable properties matching specific criteria.

```bash
# 3-4 bedroom single-family homes, 1200-2000 sqft, within 2 miles
curl -X GET "https://your-domain.com/api/comparables?postal_code=16601&radius_miles=2&beds_min=3&beds_max=4&sqft_min=1200&sqft_max=2000&prop_type=single_family&limit=20"
```

**What you get:**
- Filtered list of 20 comparable properties
- Statistics for filtered subset
- Accurate price per sqft for property type
- More relevant market comparisons

### 4. Zoning Due Diligence

**Scenario:** Verify if a property can be used for intended purpose.

```bash
# Check if R-1 zoning allows home-based business
curl -X GET "https://your-domain.com/api/zoning?code=R-1&state=PA&county=Blair"
```

**What you get:**
- Permitted uses by right
- Conditional uses (may require permit)
- Prohibited uses
- Setback requirements
- Lot size minimums
- Height and story restrictions
- Link to official ordinance

### 5. Risk Assessment

**Scenario:** Assess investment risk for a property.

```bash
# Get property data including climate risk
curl -X GET "https://your-domain.com/api/market?mode=property&zpid=12345678"

# Get state crime statistics
curl -X GET "https://your-domain.com/api/crime?state=PA"
```

**What you get:**
- Climate risk scores (flood, fire, wind, heat)
- State crime rates and trends
- Property price volatility
- Market health indicators
- Zestimate accuracy

### 6. Batch Analysis with POST

**Scenario:** Analyze multiple locations programmatically.

```javascript
// Example: Analyze 5 different coordinates
const locations = [
  { lat: 40.5187, lng: -78.3947 },
  { lat: 40.5234, lng: -78.4021 },
  { lat: 40.5156, lng: -78.3889 },
  { lat: 40.5298, lng: -78.4112 },
  { lat: 40.5101, lng: -78.3798 }
];

const results = await Promise.all(
  locations.map(loc =>
    fetch('https://your-domain.com/api/comparables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: loc.lat,
        lng: loc.lng,
        radius_miles: 1,
        limit: 10
      })
    }).then(r => r.json())
  )
);
```

### 7. Enhanced Market Analysis

**Scenario:** Get comprehensive market metrics for investment decision.

```bash
# Enhanced mode with all calculated metrics
curl -X GET "https://your-domain.com/api/comparables?postal_code=16601&mode=enhanced&limit=50"
```

**What you get:**
- List-to-sale ratio
- Absorption rate
- Inventory months
- Market type classification
- Market health score (0-100)
- Price per sqft trend
- Velocity score
- Competition level
- Demand indicator
- Year-over-year changes
- Price volatility

---

## Notes

**Data Freshness:**
- Zillow data: Real-time via API
- Realty in US data: Updated daily, cached for performance
- FBI Crime data: Annual updates, cached for 24 hours
- Zoning data: Varies by county, intelligent defaults provided when unavailable

**Rate Limits:**
- No rate limits on public endpoints
- External API limits may apply (handled gracefully with fallbacks)

**Caching:**
- Crime data: 24 hours
- Comparables: 15 minutes
- Zoning rules: 7 days
- Market data: Real-time (no cache)

**Data Confidence Levels:**
- **High:** Multiple data sources, 10+ comparables, active listings available
- **Medium:** Single data source or 5-9 comparables
- **Low:** Limited data, fallback to intelligent defaults

**Intelligent Defaults:**
- Zoning: Generated based on common patterns when county-specific data unavailable
- Crime: Falls back to "moderate" risk if FBI API fails
- Market: Uses available data sources, clearly indicates data confidence

---

**Related Documentation:**
- [Properties API](./properties.md)
- [Counties API](./counties.md)
- [Analysis API](./analysis.md)
