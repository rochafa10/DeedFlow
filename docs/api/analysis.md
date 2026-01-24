# Analysis API Reference

This document describes the Analysis API endpoints for financial and risk assessment of tax deed properties.

## Table of Contents

- [Financial Analysis API](#financial-analysis-api)
  - [POST /api/analysis/financial](#post-apianalysisfinancial)
  - [GET /api/analysis/financial](#get-apianalysisfinancial)
- [Risk Analysis API](#risk-analysis-api)
  - [POST /api/analysis/risk](#post-apianalysisrisk)
  - [GET /api/analysis/risk](#get-apianalysisrisk)
- [Error Handling](#error-handling)

---

## Financial Analysis API

The Financial Analysis API provides comprehensive financial analysis for tax deed properties, including cost estimates, profit projections, ROI calculations, and investment recommendations.

### POST /api/analysis/financial

Run a financial analysis on a property. Supports both full analysis (using property data from database) and quick analysis (using provided estimates).

#### Request Types

##### Full Property Analysis

Performs comprehensive analysis using property data from the database.

**Request Body:**

```json
{
  "propertyId": "uuid-string",
  "purchasePrice": 50000,
  "riskScore": 15,
  "locationScore": 20,
  "marketScore": 18,
  "options": {
    "rehabScope": "moderate",
    "holdingMonths": 12,
    "auctionType": "tax_deed",
    "fetchComparables": true
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyId` | string (UUID) | Yes | Property ID from database |
| `purchasePrice` | number | Yes | Intended purchase price (positive number) |
| `riskScore` | number | No | Risk score (0-25), defaults to 15 |
| `locationScore` | number | No | Location score (0-25), defaults to 15 |
| `marketScore` | number | No | Market score (0-25), defaults to 15 |
| `options.rehabScope` | enum | No | Rehab scope: `cosmetic`, `light`, `moderate`, `heavy`, `gut` |
| `options.holdingMonths` | number | No | Expected holding period (1-36 months) |
| `options.auctionType` | enum | No | Type: `tax_deed`, `tax_lien`, `foreclosure`, `traditional` |
| `options.fetchComparables` | boolean | No | Fetch comparable sales data |

##### Quick Analysis

Performs analysis using provided estimates without database lookup.

**Request Body:**

```json
{
  "purchasePrice": 50000,
  "estimatedARV": 120000,
  "rehabEstimate": 25000,
  "riskScore": 15,
  "locationScore": 20,
  "marketScore": 18
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `purchasePrice` | number | Yes | Purchase price (positive number) |
| `estimatedARV` | number | Yes | Estimated After Repair Value (positive number) |
| `rehabEstimate` | number | Yes | Estimated rehab costs (non-negative) |
| `riskScore` | number | No | Risk score (0-25) |
| `locationScore` | number | No | Location score (0-25) |
| `marketScore` | number | No | Market score (0-25) |

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "propertyId": "uuid-string",
    "purchasePrice": 50000,
    "analysisDate": "2026-01-23T10:30:00Z",
    "costs": {
      "acquisition": {
        "purchasePrice": 50000,
        "backTaxes": 2500,
        "recordingFees": 250,
        "titleSearch": 350,
        "titleInsurance": 500,
        "transferTax": 500,
        "total": 54100
      },
      "rehab": {
        "scope": "moderate",
        "costPerSqft": 35,
        "totalSqft": 1500,
        "laborMultiplier": 1.2,
        "materialCosts": 37500,
        "laborCosts": 15000,
        "contingency": 5250,
        "total": 57750
      },
      "holding": {
        "monthlyHolding": 800,
        "totalMonths": 12,
        "utilities": 1200,
        "insurance": 1800,
        "propertyTaxes": 3600,
        "maintenance": 1800,
        "total": 9600
      },
      "selling": {
        "estimatedARV": 150000,
        "realtorCommission": 9000,
        "closingCosts": 3000,
        "stagingCosts": 1500,
        "photography": 500,
        "totalSellingCosts": 14000
      },
      "totalAllInCost": 135450
    },
    "profitability": {
      "estimatedARV": 150000,
      "totalCosts": 135450,
      "grossProfit": 14550,
      "netProfit": 12550,
      "roi": 9.27,
      "roiAnnualized": 9.27,
      "profitMargin": 8.37,
      "breakEvenARV": 135450,
      "minimumSalePrice": 140973
    },
    "recommendation": {
      "verdict": "CONSIDER",
      "confidence": 75,
      "maxBid": 48000,
      "targetProfit": 25000,
      "exitStrategy": "fix_and_flip",
      "reasoning": [
        "Moderate ROI of 9.3% - acceptable for fix and flip",
        "Estimated profit of $12,550 meets minimum threshold",
        "Rehab scope is manageable (moderate)",
        "Market conditions are favorable"
      ],
      "risks": [
        "Thin profit margin leaves little room for cost overruns",
        "12-month holding period increases carrying costs",
        "Market value estimate needs validation with recent comps"
      ],
      "alternatives": [
        "Consider reducing purchase price to $45,000 for better margins",
        "Evaluate rental strategy if flip market softens",
        "Look for cosmetic-only properties for quicker turnaround"
      ]
    },
    "dataQuality": {
      "overallScore": 85,
      "hasComparables": true,
      "hasRecentSales": true,
      "hasPropertyDetails": true,
      "hasRiskAssessment": true,
      "dataCompleteness": 90,
      "dataFreshness": 95,
      "warnings": []
    },
    "calculations": {
      "costPerSqft": {
        "acquisition": 36.07,
        "rehab": 38.50,
        "total": 90.30
      },
      "profitPerSqft": 8.37,
      "monthlyBurnRate": 800,
      "daysToBreakeven": 365,
      "cashOnCashReturn": 25.11
    }
  }
}
```

**Quick Analysis Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "costs": {
      "acquisition": {
        "purchasePrice": 50000,
        "estimatedClosing": 3500,
        "total": 53500
      },
      "rehab": {
        "estimate": 25000,
        "contingency": 2500,
        "total": 27500
      },
      "holding": {
        "estimatedMonthly": 800,
        "estimatedMonths": 6,
        "total": 4800
      },
      "selling": {
        "estimatedARV": 120000,
        "commission": 7200,
        "closingCosts": 2400,
        "total": 9600
      },
      "totalAllInCost": 95400
    },
    "profitability": {
      "estimatedARV": 120000,
      "totalCosts": 95400,
      "grossProfit": 24600,
      "netProfit": 22100,
      "roi": 23.17,
      "roiAnnualized": 46.34,
      "profitMargin": 18.42,
      "breakEvenARV": 95400
    },
    "recommendation": {
      "verdict": "BUY",
      "confidence": 60,
      "maxBid": 48000,
      "targetProfit": 25000,
      "exitStrategy": "fix_and_flip",
      "reasoning": [
        "Strong ROI of 23.2% with 6-month hold",
        "Comfortable profit margin of 18.4%",
        "Quick turnaround potential"
      ],
      "risks": [
        "Analysis based on estimates only",
        "ARV needs validation with comparables",
        "Rehab costs should be verified by contractor"
      ]
    },
    "note": "Quick analysis based on provided estimates. For detailed analysis, provide propertyId."
  }
}
```

**Error Responses:**

```json
// 400 Bad Request - Invalid input
{
  "error": "Invalid request",
  "details": [
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "string",
      "path": ["purchasePrice"],
      "message": "Expected number, received string"
    }
  ]
}

// 404 Not Found - Property doesn't exist
{
  "error": "Property not found",
  "details": "No property found with ID: uuid-string"
}

// 500 Internal Server Error
{
  "error": "Analysis failed",
  "message": "Error message details",
  "timestamp": "2026-01-23T10:30:00Z"
}
```

#### Use Cases

**1. Full Property Analysis for Investment Decision**

```javascript
const response = await fetch('/api/analysis/financial', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    propertyId: 'abc-123-def-456',
    purchasePrice: 50000,
    riskScore: 15,
    locationScore: 20,
    marketScore: 18,
    options: {
      rehabScope: 'moderate',
      holdingMonths: 12,
      fetchComparables: true
    }
  })
});

const { data } = await response.json();
console.log(`Recommendation: ${data.recommendation.verdict}`);
console.log(`Expected ROI: ${data.profitability.roi}%`);
console.log(`Max Bid: $${data.recommendation.maxBid}`);
```

**2. Quick Analysis for Multiple Properties**

```javascript
const properties = [
  { purchasePrice: 40000, estimatedARV: 100000, rehabEstimate: 20000 },
  { purchasePrice: 60000, estimatedARV: 140000, rehabEstimate: 30000 },
  { purchasePrice: 35000, estimatedARV: 90000, rehabEstimate: 15000 }
];

const analyses = await Promise.all(
  properties.map(prop =>
    fetch('/api/analysis/financial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prop)
    }).then(r => r.json())
  )
);

// Sort by ROI
analyses.sort((a, b) => b.data.profitability.roi - a.data.profitability.roi);
```

---

### GET /api/analysis/financial

Retrieve cached financial analysis results for a property.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `propertyId` | string (UUID) | Yes | Property ID to fetch analysis for |

#### Request Example

```
GET /api/analysis/financial?propertyId=abc-123-def-456
```

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "analysis-uuid",
    "property_id": "abc-123-def-456",
    "purchase_price": 50000,
    "analysis_data": {
      // Full analysis object (same structure as POST response)
    },
    "recommendation_verdict": "CONSIDER",
    "recommendation_confidence": 75,
    "max_bid": 48000,
    "target_profit": 25000,
    "exit_strategy": "fix_and_flip",
    "data_quality_score": 85,
    "created_at": "2026-01-23T10:30:00Z",
    "updated_at": "2026-01-23T10:30:00Z"
  }
}
```

**Error Responses:**

```json
// 400 Bad Request - Missing parameter
{
  "error": "Missing required parameter: propertyId"
}

// 404 Not Found - No analysis found
{
  "error": "No analysis found for property",
  "propertyId": "abc-123-def-456"
}

// 500 Internal Server Error
{
  "error": "Failed to fetch analysis",
  "message": "Error message details"
}
```

---

## Risk Analysis API

The Risk Analysis API provides comprehensive environmental and natural disaster risk assessment for tax deed properties.

### POST /api/analysis/risk

Perform comprehensive risk analysis including flood, earthquake, wildfire, hurricane, sinkhole, environmental, radon, and slope/landslide risks.

#### Request Body

```json
{
  "propertyId": "uuid-string",
  "state": "FL",
  "county": "Miami-Dade",
  "propertyValue": 150000,
  "buildingSqft": 1500,
  "options": {
    "skip": {
      "flood": false,
      "earthquake": false,
      "wildfire": false,
      "hurricane": false,
      "sinkhole": false,
      "environmental": false,
      "radon": false,
      "slope": false
    },
    "useCache": true,
    "timeout": 10000
  }
}
```

**Alternative: Direct Coordinates**

```json
{
  "coordinates": {
    "lat": 25.7617,
    "lng": -80.1918
  },
  "state": "FL",
  "county": "Miami-Dade",
  "propertyValue": 150000,
  "buildingSqft": 1500
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyId` | string (UUID) | Conditional | Property ID (coordinates fetched from DB) |
| `coordinates` | object | Conditional | Direct coordinates: `{ lat: number, lng: number }` |
| `coordinates.lat` | number | If using coords | Latitude (-90 to 90) |
| `coordinates.lng` | number | If using coords | Longitude (-180 to 180) |
| `state` | string | Yes | Two-letter state code (e.g., "FL", "CA") |
| `county` | string | No | County name |
| `propertyValue` | number | No | Estimated property value (defaults to 150000) |
| `buildingSqft` | number | No | Building square footage (defaults to 1500) |
| `options.skip` | object | No | Skip specific risk assessments |
| `options.useCache` | boolean | No | Use cached data (defaults to true) |
| `options.timeout` | number | No | Timeout in ms (defaults to 10000) |

**Note:** Either `propertyId` or `coordinates` must be provided.

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "overallRiskScore": 62,
    "riskLevel": "MODERATE",
    "assessedAt": "2026-01-23T10:30:00Z",
    "risks": {
      "flood": {
        "score": 75,
        "level": "HIGH",
        "confidence": 90,
        "details": {
          "floodZone": "AE",
          "baseFloodElevation": 12.5,
          "annualFloodProbability": 1.0,
          "insuranceRequired": true,
          "estimatedAnnualPremium": 2400
        },
        "description": "Property is in Special Flood Hazard Area (SFHA) - 1% annual flood chance",
        "recommendations": [
          "Flood insurance required by lenders",
          "Consider elevation certificate for accurate rates",
          "Verify flood mitigation measures in place",
          "Budget $2,400/year for flood insurance"
        ]
      },
      "earthquake": {
        "score": 15,
        "level": "LOW",
        "confidence": 85,
        "details": {
          "seismicZone": "Zone 1",
          "pga": 0.05,
          "nearestFaultDistance": 50,
          "historicalEvents": 2
        },
        "description": "Low seismic activity - minimal earthquake risk",
        "recommendations": [
          "Standard building codes sufficient",
          "Earthquake insurance optional"
        ]
      },
      "wildfire": {
        "score": 45,
        "level": "MODERATE",
        "confidence": 80,
        "details": {
          "wildfireRiskScore": 45,
          "fuelLoad": "moderate",
          "fireHistoryCount": 3,
          "lastFireDate": "2024-08-15",
          "defensibleSpace": "adequate"
        },
        "description": "Moderate wildfire risk - defensible space recommended",
        "recommendations": [
          "Maintain 100-foot defensible space",
          "Use fire-resistant landscaping",
          "Consider fire-resistant roofing materials",
          "Wildfire insurance recommended"
        ]
      },
      "hurricane": {
        "score": 85,
        "level": "HIGH",
        "confidence": 95,
        "details": {
          "windZone": "Zone 3",
          "stormSurgeCategory": 3,
          "distanceToCoast": 2.5,
          "historicalHits": 12,
          "lastMajorHurricane": "2023-09-28"
        },
        "description": "High hurricane risk - coastal property in active hurricane zone",
        "recommendations": [
          "Wind mitigation features required",
          "Hurricane shutters or impact windows mandatory",
          "Roof inspection and certification critical",
          "Windstorm insurance required",
          "Budget $3,500+ annual wind/hurricane premium"
        ]
      },
      "sinkhole": {
        "score": 60,
        "level": "MODERATE",
        "confidence": 70,
        "details": {
          "karstGeology": true,
          "knownSinkholes": 8,
          "nearestSinkhole": 0.8,
          "groundwaterDepth": 45,
          "soilType": "limestone"
        },
        "description": "Karst geology present - moderate sinkhole risk",
        "recommendations": [
          "Consider sinkhole inspection before purchase",
          "Sinkhole insurance coverage recommended",
          "Monitor for warning signs (cracks, settling)",
          "Budget $500-800/year for sinkhole coverage"
        ]
      },
      "environmental": {
        "score": 25,
        "level": "LOW",
        "confidence": 75,
        "details": {
          "superfundSites": 0,
          "nearestSuperfundDistance": null,
          "npdesSites": 1,
          "nearestNpdesDistance": 1.2,
          "hazardousWasteSites": 0,
          "airQualityIndex": 45
        },
        "description": "Low environmental concerns - no major contamination sites nearby",
        "recommendations": [
          "Standard environmental due diligence sufficient",
          "No Phase I ESA required"
        ]
      },
      "radon": {
        "score": 30,
        "level": "LOW",
        "confidence": 80,
        "details": {
          "radonZone": "Zone 3",
          "averageLevel": 2.1,
          "testingRecommended": false
        },
        "description": "Low radon zone - minimal risk",
        "recommendations": [
          "Radon testing optional",
          "If tested and elevated, mitigation costs ~$1,200"
        ]
      },
      "slope": {
        "score": 20,
        "level": "LOW",
        "confidence": 85,
        "details": {
          "averageSlope": 5.2,
          "maxSlope": 8.5,
          "landslideHistory": false,
          "soilStability": "stable"
        },
        "description": "Gentle slope - minimal landslide or erosion risk",
        "recommendations": [
          "Standard drainage and grading sufficient",
          "No additional slope stabilization needed"
        ]
      }
    },
    "insuranceImpact": {
      "estimatedAnnualPremium": 6800,
      "breakdownBy": {
        "flood": 2400,
        "wind": 3500,
        "sinkhole": 650,
        "standard": 250
      },
      "riskSurcharge": 85,
      "availabilityIssues": [
        "Limited carriers in high-risk flood zone",
        "May require Citizens Property Insurance (FL)"
      ]
    },
    "dealImpact": {
      "redFlags": [
        "High hurricane risk increases insurance costs significantly",
        "Flood zone AE requires mandatory flood insurance"
      ],
      "warnings": [
        "Moderate sinkhole risk - inspection recommended",
        "Recent wildfire activity in area"
      ],
      "considerations": [
        "High annual insurance premium ($6,800) impacts cash flow",
        "Limited insurance availability may affect financing",
        "Factor $10,000+ annually for all risk insurance"
      ],
      "recommendedActions": [
        "Get insurance quotes before making offer",
        "Request wind mitigation inspection",
        "Verify flood elevation certificate",
        "Consider sinkhole inspection",
        "Factor insurance costs into ROI calculations"
      ]
    },
    "dataQuality": {
      "overallScore": 88,
      "completedRisks": 8,
      "skippedRisks": 0,
      "failedRisks": 0,
      "confidenceByCategory": {
        "flood": 90,
        "earthquake": 85,
        "wildfire": 80,
        "hurricane": 95,
        "sinkhole": 70,
        "environmental": 75,
        "radon": 80,
        "slope": 85
      }
    }
  },
  "metadata": {
    "coordinates": {
      "lat": 25.7617,
      "lng": -80.1918
    },
    "state": "FL",
    "county": "Miami-Dade",
    "propertyValue": 150000,
    "buildingSqft": 1500,
    "analyzedAt": "2026-01-23T10:30:00Z",
    "options": {
      "skipped": {},
      "timeout": 10000,
      "useCache": true
    }
  }
}
```

**Risk Score Ranges:**

| Score | Level | Description |
|-------|-------|-------------|
| 0-25 | LOW | Minimal risk, standard precautions |
| 26-50 | MODERATE | Some concern, additional due diligence |
| 51-75 | HIGH | Significant risk, impacts deal viability |
| 76-100 | CRITICAL | Severe risk, may be deal breaker |

**Error Responses:**

```json
// 400 Bad Request - Missing required fields
{
  "error": "State code is required"
}

// 400 Bad Request - Invalid coordinates
{
  "error": "Valid coordinates are required (either provide coordinates directly or a valid propertyId)"
}

// 400 Bad Request - Invalid coordinate range
{
  "error": "Latitude must be between -90 and 90"
}

// 404 Not Found - Property not found
{
  "error": "Could not find coordinates for property",
  "details": "No property found with ID: uuid-string"
}

// 400 Bad Request - No coordinates available
{
  "error": "Property does not have coordinates available"
}

// 500 Internal Server Error
{
  "success": false,
  "error": "Risk analysis failed",
  "message": "Error message details",
  "timestamp": "2026-01-23T10:30:00Z"
}
```

#### Use Cases

**1. Comprehensive Risk Assessment**

```javascript
const response = await fetch('/api/analysis/risk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    propertyId: 'abc-123-def-456',
    state: 'FL',
    county: 'Miami-Dade',
    propertyValue: 150000,
    buildingSqft: 1500
  })
});

const { data } = await response.json();

// Check if property is investable
if (data.overallRiskScore > 75) {
  console.log('⚠️ Critical risk level - may not be investable');
}

// Review red flags
if (data.dealImpact.redFlags.length > 0) {
  console.log('Red flags:', data.dealImpact.redFlags);
}

// Calculate true holding costs including insurance
const annualInsurance = data.insuranceImpact.estimatedAnnualPremium;
console.log(`Factor in $${annualInsurance}/year for insurance`);
```

**2. Selective Risk Assessment (Skip Unnecessary Checks)**

```javascript
// Property in Arizona - skip hurricane and sinkhole
const response = await fetch('/api/analysis/risk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    coordinates: { lat: 33.4484, lng: -112.0740 },
    state: 'AZ',
    county: 'Maricopa',
    propertyValue: 200000,
    options: {
      skip: {
        hurricane: true,
        sinkhole: true
      }
    }
  })
});
```

**3. Batch Risk Assessment**

```javascript
const properties = [
  { propertyId: 'prop-1', state: 'FL', propertyValue: 150000 },
  { propertyId: 'prop-2', state: 'CA', propertyValue: 300000 },
  { propertyId: 'prop-3', state: 'TX', propertyValue: 120000 }
];

const riskAssessments = await Promise.all(
  properties.map(prop =>
    fetch('/api/analysis/risk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prop)
    }).then(r => r.json())
  )
);

// Filter out high-risk properties
const investable = riskAssessments.filter(
  a => a.data.overallRiskScore < 60
);

console.log(`${investable.length}/${properties.length} properties are low-moderate risk`);
```

---

### GET /api/analysis/risk

Quick risk lookup using query parameters.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | number | Yes | Latitude (-90 to 90) |
| `lng` | number | Yes | Longitude (-180 to 180) |
| `state` | string | Yes | Two-letter state code |
| `county` | string | No | County name |
| `propertyValue` | number | No | Property value (defaults to 150000) |

#### Request Example

```
GET /api/analysis/risk?lat=25.7617&lng=-80.1918&state=FL&county=Miami-Dade&propertyValue=150000
```

#### Response

Returns the same structure as POST endpoint. See [POST /api/analysis/risk Response](#response-1).

**Error Responses:**

```json
// 400 Bad Request - Missing parameters
{
  "error": "Missing required parameters: lat, lng, state"
}

// 400 Bad Request - Invalid values
{
  "error": "Invalid latitude or longitude",
  "details": "Latitude must be between -90 and 90"
}

// 500 Internal Server Error
{
  "success": false,
  "error": "Risk analysis failed",
  "message": "Error message details",
  "timestamp": "2026-01-23T10:30:00Z"
}
```

---

## Error Handling

### Common Error Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Invalid parameters, missing required fields, validation errors |
| 404 | Not Found | Property doesn't exist, no analysis found |
| 500 | Internal Server Error | Database errors, external API failures, unexpected errors |

### Error Response Format

All error responses follow this structure:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": "Additional context (optional)",
  "timestamp": "2026-01-23T10:30:00Z"
}
```

### Validation Errors

Validation errors return a `400` status with detailed field-level errors:

```json
{
  "error": "Invalid request",
  "details": [
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "string",
      "path": ["purchasePrice"],
      "message": "Expected number, received string"
    },
    {
      "code": "too_small",
      "minimum": 0,
      "received": -5000,
      "path": ["rehabEstimate"],
      "message": "Number must be greater than or equal to 0"
    }
  ]
}
```

### Best Practices

1. **Always validate input** before making API calls
2. **Handle timeouts** - Risk analysis can take 5-10 seconds
3. **Use try-catch blocks** for all API calls
4. **Check `success` flag** in responses
5. **Display meaningful errors** to users
6. **Retry on 500 errors** with exponential backoff
7. **Cache results** - Both endpoints support caching

### Example Error Handling

```javascript
async function analyzeProperty(propertyId, purchasePrice) {
  try {
    const response = await fetch('/api/analysis/financial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, purchasePrice })
    });

    if (!response.ok) {
      const error = await response.json();

      if (response.status === 400) {
        throw new Error(`Validation error: ${error.details?.[0]?.message || error.error}`);
      }

      if (response.status === 404) {
        throw new Error('Property not found');
      }

      throw new Error(`Analysis failed: ${error.message || error.error}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(`Analysis failed: ${result.error}`);
    }

    return result.data;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}
```

---

## Integration Examples

### Complete Property Evaluation

Combine financial and risk analysis for comprehensive property evaluation:

```javascript
async function evaluateProperty(propertyId, purchasePrice) {
  try {
    // Run both analyses in parallel
    const [financial, risk] = await Promise.all([
      fetch('/api/analysis/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          purchasePrice,
          options: { fetchComparables: true }
        })
      }).then(r => r.json()),

      fetch('/api/analysis/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId })
      }).then(r => r.json())
    ]);

    // Combine results
    const evaluation = {
      property: propertyId,
      financial: {
        verdict: financial.data.recommendation.verdict,
        roi: financial.data.profitability.roi,
        netProfit: financial.data.profitability.netProfit,
        maxBid: financial.data.recommendation.maxBid
      },
      risk: {
        overallScore: risk.data.overallRiskScore,
        level: risk.data.riskLevel,
        insuranceCost: risk.data.insuranceImpact.estimatedAnnualPremium,
        redFlags: risk.data.dealImpact.redFlags
      },
      recommendation: determineRecommendation(financial.data, risk.data)
    };

    return evaluation;
  } catch (error) {
    console.error('Evaluation failed:', error);
    throw error;
  }
}

function determineRecommendation(financial, risk) {
  // Don't buy if critical risk or high risk with BUY verdict
  if (risk.overallRiskScore > 75 ||
      (risk.overallRiskScore > 60 && financial.recommendation.verdict === 'PASS')) {
    return {
      action: 'PASS',
      reason: 'Risk level too high for investment'
    };
  }

  // Adjust max bid based on risk-adjusted insurance costs
  const annualInsurance = risk.insuranceImpact.estimatedAnnualPremium;
  const monthlyInsurance = annualInsurance / 12;

  // If insurance adds more than $500/month, reduce max bid
  if (monthlyInsurance > 500) {
    const adjustedMaxBid = financial.recommendation.maxBid - (monthlyInsurance - 500) * 12;
    return {
      action: financial.recommendation.verdict,
      adjustedMaxBid,
      reason: `Reduced max bid by ${(monthlyInsurance - 500) * 12} due to high insurance costs`
    };
  }

  return {
    action: financial.recommendation.verdict,
    maxBid: financial.recommendation.maxBid,
    reason: 'Risk level acceptable for investment'
  };
}
```

---

## Rate Limits & Performance

- **Financial Analysis**: ~1-2 seconds typical, up to 5 seconds with comparables
- **Risk Analysis**: ~5-10 seconds typical (multiple external API calls)
- **Caching**: Results cached for 24 hours
- **Concurrent Requests**: No hard limit, but recommend max 5 concurrent per user
- **Timeout**: Default 10 seconds, configurable up to 30 seconds

---

## Related Documentation

- [Properties API](./properties.md) - Property data endpoints
- [Auctions API](./auctions.md) - Auction and bidding endpoints
- [Counties API](./counties.md) - County research endpoints

---

**Last Updated:** 2026-01-23
**Version:** 1.0.0
**Maintainer:** Claude Code Agent
