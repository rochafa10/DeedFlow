# Risk Analysis API Endpoints and Data Sources

**Document Version:** 1.0
**Last Updated:** January 23, 2026
**Task:** subtask-1-2 - Review PRD for additional risk sources

---

## Overview

This document catalogs all external API endpoints and data sources used for property risk analysis in the Tax Deed Property Analysis Report System. The risk analysis aggregates data from 8+ sources to provide comprehensive risk assessment across four primary categories: flood, earthquake, wildfire, and hurricane.

---

## 1. FEMA Flood Zone API

### 1.1 API Details

| Property | Value |
|----------|-------|
| **Provider** | Federal Emergency Management Agency (FEMA) |
| **Service** | National Flood Hazard Layer (NFHL) |
| **Purpose** | Flood zone classification and risk assessment |
| **Rate Limit** | Unlimited |
| **Cost** | Free |
| **Authentication** | None required |

### 1.2 Endpoints

#### 1.2.1 Query Flood Zone by Coordinates
```
GET https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query
```

**Query Parameters:**
```typescript
{
  geometry: string;           // Format: "longitude,latitude"
  geometryType: 'esriGeometryPoint';
  inSR: '4326';              // Spatial reference (WGS84)
  spatialRel: 'esriSpatialRelIntersects';
  outFields: '*';            // Return all fields
  f: 'json'                  // Response format
}
```

**Example Request:**
```
https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query?geometry=-77.0364,38.8977&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&f=json
```

**Response Fields:**
- `FLD_ZONE` - Flood zone designation (X, A, AE, V, VE, etc.)
- `SFHA_TF` - Special Flood Hazard Area flag (T/F)
- `STATIC_BFE` - Base Flood Elevation
- `ZONE_SUBTY` - Zone subtype

#### 1.2.2 Export Flood Map Image
```
GET https://hazards.fema.gov/gis/nfhl/services/public/NFHL/MapServer/export
```

**Query Parameters:**
```typescript
{
  bbox: string;              // Format: "west,south,east,north"
  size: string;              // Format: "width,height" (e.g., "800,600")
  format: 'png32';
  transparent: 'true';
  layers: 'show:28';         // Layer 28 = Flood Zones
  bboxSR: '4326';           // Input spatial reference
  imageSR: '4326';          // Output spatial reference
  f: 'image'
}
```

**Example Request:**
```
https://hazards.fema.gov/gis/nfhl/services/public/NFHL/MapServer/export?bbox=-77.04,-38.89,-77.03,38.90&size=800,600&format=png32&transparent=true&layers=show:28&bboxSR=4326&imageSR=4326&f=image
```

### 1.3 Risk Classification

| Zone | Risk Level | Insurance Required | Base Score |
|------|------------|-------------------|------------|
| X | Minimal | No | 25 pts |
| B, C | Low | No | 20 pts |
| A, AE, AH, AO | Moderate/High | Yes | 10 pts |
| V, VE | Very High (Coastal) | Yes | 0 pts |

### 1.4 Implementation Reference

```typescript
async function getFEMAFloodZone(lat: number, lng: number): Promise<FEMAData> {
  const url = `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query`;
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    f: 'json'
  });

  const response = await fetch(`${url}?${params}`);
  const data = await response.json();

  return {
    zone: data.features[0]?.attributes?.FLD_ZONE || 'X',
    sfha: data.features[0]?.attributes?.SFHA_TF === 'T',
    bfe: data.features[0]?.attributes?.STATIC_BFE
  };
}
```

---

## 2. USGS Earthquake API

### 2.1 API Details

| Property | Value |
|----------|-------|
| **Provider** | United States Geological Survey (USGS) |
| **Service** | Earthquake Hazards Program |
| **Purpose** | Historical seismic activity and earthquake risk assessment |
| **Rate Limit** | Unlimited |
| **Cost** | Free |
| **Authentication** | None required |

### 2.2 Endpoints

#### 2.2.1 Query Earthquake Events
```
GET https://earthquake.usgs.gov/fdsnws/event/1/query
```

**Query Parameters:**
```typescript
{
  format: 'geojson';         // Response format
  latitude: string;          // Property latitude
  longitude: string;         // Property longitude
  maxradiuskm: string;       // Search radius in kilometers (e.g., "100")
  starttime: string;         // ISO 8601 format (e.g., "2016-01-01")
  endtime: string;           // ISO 8601 format (e.g., "2026-01-01")
  minmagnitude: string;      // Minimum magnitude (e.g., "2.5")
  orderby: 'magnitude' | 'time';
}
```

**Example Request:**
```
https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=38.8977&longitude=-77.0364&maxradiuskm=100&starttime=2016-01-01&endtime=2026-01-01&minmagnitude=2.5
```

**Response Structure (GeoJSON):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "mag": 4.2,
        "place": "10km NE of City",
        "time": 1640995200000,
        "updated": 1640995300000,
        "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us6000abcd",
        "detail": "...",
        "felt": 150,
        "alert": "green",
        "status": "reviewed",
        "tsunami": 0,
        "sig": 289,
        "type": "earthquake"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-77.0364, 38.8977, 10.0]
      }
    }
  ]
}
```

### 2.3 Risk Classification

| Event Count (10 years) | Max Magnitude | Risk Level | Annual Premium Estimate |
|------------------------|---------------|------------|------------------------|
| 0-10 | < 3.0 | Low | $200-500 |
| 11-50 | 3.0-4.9 | Moderate | $500-1,200 |
| 51+ | 5.0+ | High | $1,200-3,000 |

### 2.4 Implementation Reference

```typescript
async function getEarthquakeRisk(lat: number, lng: number): Promise<EarthquakeData> {
  const endTime = new Date().toISOString();
  const startTime = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString();

  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query`;
  const params = new URLSearchParams({
    format: 'geojson',
    latitude: lat.toString(),
    longitude: lng.toString(),
    maxradiuskm: '100',
    starttime: startTime,
    endtime: endTime,
    minmagnitude: '2.5'
  });

  const response = await fetch(`${url}?${params}`);
  const data = await response.json();

  const events = data.features;
  const maxMagnitude = Math.max(...events.map((e: any) => e.properties.mag), 0);

  return {
    count: events.length,
    maxMagnitude,
    riskLevel: events.length > 50 ? 'High' : events.length > 10 ? 'Moderate' : 'Low'
  };
}
```

---

## 3. NASA FIRMS API (Wildfire)

### 3.1 API Details

| Property | Value |
|----------|-------|
| **Provider** | NASA - Fire Information for Resource Management System |
| **Service** | FIRMS (MODIS/VIIRS) |
| **Purpose** | Active fire detection and wildfire risk assessment |
| **Rate Limit** | 100,000 requests/day |
| **Cost** | Free |
| **Authentication** | API Key required (free) |

### 3.2 Endpoints

#### 3.2.1 Query Fire Detections by Area
```
GET https://firms.modaps.eosdis.nasa.gov/api/area/csv/{API_KEY}/{SOURCE}/{AREA_CSV}/{DAY_RANGE}
```

**URL Parameters:**
```typescript
{
  API_KEY: string;           // NASA FIRMS API key
  SOURCE: 'VIIRS_SNPP_NRT' | 'MODIS_NRT' | 'VIIRS_NOAA20_NRT';
  AREA_CSV: string;         // Format: "lat_min,lon_min,lat_max,lon_max"
  DAY_RANGE: number;        // Days to look back (1-365)
}
```

**Example Request:**
```
https://firms.modaps.eosdis.nasa.gov/api/area/csv/YOUR_API_KEY/VIIRS_SNPP_NRT/38.3977,-77.5364,39.3977,-76.5364/1/365
```

**Response Format (CSV):**
```csv
latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
38.5234,-77.2145,302.5,0.4,0.4,2026-01-15,0234,N,VIIRS,n,2.0NRT,290.2,12.3,N
38.6123,-77.1234,315.8,0.4,0.4,2026-01-14,1523,N,VIIRS,h,2.0NRT,298.5,18.7,D
```

**Response Fields:**
- `latitude` / `longitude` - Fire location
- `bright_ti4` / `bright_ti5` - Brightness temperature (Kelvin)
- `confidence` - Detection confidence (l=low, n=nominal, h=high)
- `frp` - Fire Radiative Power (MW)
- `acq_date` / `acq_time` - Acquisition date/time
- `daynight` - Day or Night detection

### 3.3 Alternative Endpoint: Point Query
```
GET https://firms.modaps.eosdis.nasa.gov/api/point/csv/{API_KEY}/{SOURCE}/{LATITUDE},{LONGITUDE}/{DAY_RANGE}
```

**Example Request:**
```
https://firms.modaps.eosdis.nasa.gov/api/point/csv/YOUR_API_KEY/VIIRS_SNPP_NRT/38.8977,-77.0364/365
```

### 3.4 Risk Classification

| Fire Detections (365 days) | Radius | Risk Level | Annual Premium Estimate |
|----------------------------|--------|------------|------------------------|
| 0-10 | 50km | Low | $300-600 |
| 11-50 | 50km | Moderate | $600-1,500 |
| 51+ | 50km | High | $1,500-4,000 |

### 3.5 Implementation Reference

```typescript
async function getWildfireRisk(lat: number, lng: number): Promise<WildfireData> {
  const apiKey = process.env.NASA_FIRMS_API_KEY;
  const latMin = lat - 0.5;
  const latMax = lat + 0.5;
  const lngMin = lng - 0.5;
  const lngMax = lng + 0.5;

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${latMin},${lngMin},${latMax},${lngMax}/1/365`;

  const response = await fetch(url);
  const csvData = await response.text();
  const fires = csvData.split('\n').length - 2; // Subtract header and empty line

  return {
    detections: fires,
    period: 'Last 365 days',
    riskLevel: fires > 50 ? 'High' : fires > 10 ? 'Moderate' : 'Low'
  };
}
```

### 3.6 API Key Registration

**Registration URL:** https://firms.modaps.eosdis.nasa.gov/api/
**Process:** Free registration with email verification

---

## 4. NOAA Hurricane API

### 4.1 API Details

| Property | Value |
|----------|-------|
| **Provider** | National Oceanic and Atmospheric Administration (NOAA) |
| **Service** | National Hurricane Center (NHC) |
| **Purpose** | Hurricane zone classification and storm surge risk |
| **Rate Limit** | Unlimited |
| **Cost** | Free |
| **Authentication** | None required |

### 4.2 Data Sources

#### 4.2.1 Historical Hurricane Tracks
```
GET https://www.nhc.noaa.gov/gis/best_track/
```

**Available Formats:**
- Shapefile (.shp)
- KML (.kml)
- GeoJSON (via conversion)

**Data Includes:**
- Historical storm tracks
- Storm intensity
- Wind speed radii
- Affected areas

#### 4.2.2 Storm Surge Risk Maps
```
GET https://www.nhc.noaa.gov/nationalsurge/
```

**Coverage:**
- Gulf Coast (Texas to Florida)
- Atlantic Coast (Florida to Maine)
- Hurricane evacuation zones

#### 4.2.3 Alternative: Census Bureau Hurricane Zones
```
GET https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Disasters/MapServer
```

**Layer IDs:**
- Layer 0: Hurricane Evacuation Zones
- Layer 1: Storm Surge Risk Areas

### 4.3 Risk Classification

| Zone | Distance from Coast | Risk Level | Annual Premium Estimate |
|------|-------------------|------------|------------------------|
| Inland (>100 mi) | >100 mi | Minimal | $200-400 |
| Mid-Range (50-100 mi) | 50-100 mi | Low | $400-800 |
| Coastal (10-50 mi) | 10-50 mi | Moderate | $800-2,000 |
| Beachfront (<10 mi) | <10 mi | High | $2,000-5,000 |
| Evacuation Zone A/B | Varies | Very High | $5,000-10,000+ |

### 4.4 Hurricane Season Timeline

| Region | Season | Peak Months |
|--------|--------|-------------|
| Atlantic | June 1 - November 30 | August - October |
| Eastern Pacific | May 15 - November 30 | August - September |

### 4.5 Implementation Approach

```typescript
async function getHurricaneRisk(lat: number, lng: number, state: string): Promise<HurricaneData> {
  // Method 1: Calculate distance from coast
  const coastalDistance = await calculateCoastalDistance(lat, lng);

  // Method 2: Check if in hurricane-prone state
  const hurricaneStates = [
    'FL', 'AL', 'MS', 'LA', 'TX',  // Gulf Coast
    'SC', 'NC', 'VA', 'MD', 'DE', 'NJ', 'NY', 'CT', 'RI', 'MA'  // Atlantic
  ];
  const isHurricaneProne = hurricaneStates.includes(state);

  // Method 3: Query historical hurricane data
  const historicalData = await getHistoricalHurricanes(lat, lng);

  let riskLevel = 'Minimal';
  let zone = 'N/A';
  let stormSurgeRisk = false;

  if (isHurricaneProne) {
    if (coastalDistance < 10) {
      riskLevel = 'High';
      zone = 'Coastal';
      stormSurgeRisk = true;
    } else if (coastalDistance < 50) {
      riskLevel = 'Moderate';
      zone = 'Near-Coastal';
      stormSurgeRisk = true;
    } else if (coastalDistance < 100) {
      riskLevel = 'Low';
      zone = 'Inland-Affected';
      stormSurgeRisk = false;
    } else {
      riskLevel = 'Minimal';
      zone = 'Inland';
      stormSurgeRisk = false;
    }
  }

  return {
    riskLevel,
    zone,
    stormSurgeRisk,
    coastalDistance,
    historicalEvents: historicalData.count,
    season: 'June 1 - November 30',
    annualPremium: calculateHurricanePremium(riskLevel)
  };
}
```

---

## 5. Supporting APIs

### 5.1 Google Maps Platform

**Used for:**
- Geocoding addresses to coordinates
- Reverse geocoding
- Place lookups
- Distance calculations (coastal proximity)

**Endpoint:**
```
GET https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={API_KEY}
```

**Rate Limit:** 25,000/day (free tier)
**Cost:** $0.005/request after free tier

---

## 6. Database Storage Schema

### 6.1 property_reports Table (Risk Fields)

```sql
CREATE TABLE property_reports (
  -- Risk Analysis Fields
  fema_zone TEXT,                      -- Flood zone (X, A, AE, V, etc.)
  flood_risk_level TEXT,               -- MINIMAL, LOW, MODERATE, HIGH, VERY_HIGH
  earthquake_risk_level TEXT,          -- Low, Moderate, High
  wildfire_risk_level TEXT,            -- Low, Moderate, High
  hurricane_risk_level TEXT,           -- Minimal, Low, Moderate, High
  insurance_risk_score INTEGER,        -- 0-100 composite score

  -- Additional Risk Data (JSONB)
  risk_details_json JSONB              -- Detailed risk data
);
```

### 6.2 Risk Details JSON Structure

```typescript
interface RiskDetailsJSON {
  flood: {
    femaZone: string;
    sfha: boolean;
    bfe: number | null;
    insuranceRequired: boolean;
    annualPremium: number;
  };
  earthquake: {
    eventsLast10Years: number;
    maxMagnitude: number;
    searchRadius: number;
    annualPremium: number;
  };
  wildfire: {
    fireDetections: number;
    detectionPeriod: string;
    searchRadius: number;
    annualPremium: number;
  };
  hurricane: {
    zone: string;
    coastalDistance: number;
    stormSurgeRisk: boolean;
    historicalEvents: number;
    season: string;
    annualPremium: number;
  };
}
```

---

## 7. Insurance Premium Estimation

### 7.1 Premium Calculation Formulas

```typescript
interface InsurancePremiums {
  flood: number;
  earthquake: number;
  wildfire: number;
  hurricane: number;
  total: number;
  monthly: number;
}

function calculateInsurancePremiums(risks: RiskData): InsurancePremiums {
  const flood = calculateFloodPremium(risks.femaZone);
  const earthquake = calculateEarthquakePremium(risks.earthquakeRisk);
  const wildfire = calculateWildfirePremium(risks.wildfireRisk);
  const hurricane = calculateHurricanePremium(risks.hurricaneRisk);

  const total = flood + earthquake + wildfire + hurricane;
  const monthly = total / 12;

  return { flood, earthquake, wildfire, hurricane, total, monthly };
}
```

### 7.2 Base Premium Estimates

| Risk Type | Low | Moderate | High | Very High |
|-----------|-----|----------|------|-----------|
| Flood | $400-800 | $800-1,500 | $1,500-3,000 | $3,000-6,000 |
| Earthquake | $200-500 | $500-1,200 | $1,200-3,000 | N/A |
| Wildfire | $300-600 | $600-1,500 | $1,500-4,000 | N/A |
| Hurricane | $200-400 | $800-2,000 | $2,000-5,000 | $5,000-10,000 |

---

## 8. Error Handling & Fallbacks

### 8.1 API Failure Scenarios

```typescript
interface APIError {
  code: string;
  message: string;
  source: string;
  fallback: any;
}

const errorHandlers = {
  FEMA_UNAVAILABLE: {
    fallback: { zone: 'UNKNOWN', riskLevel: 'UNKNOWN' },
    message: 'Flood data temporarily unavailable'
  },
  USGS_UNAVAILABLE: {
    fallback: { count: 0, riskLevel: 'Low' },
    message: 'Earthquake data temporarily unavailable'
  },
  NASA_FIRMS_RATE_LIMIT: {
    fallback: { detections: 0, riskLevel: 'Low' },
    message: 'Wildfire data rate limited'
  },
  NOAA_UNAVAILABLE: {
    fallback: { riskLevel: 'Minimal' },
    message: 'Hurricane data temporarily unavailable'
  }
};
```

### 8.2 Retry Strategy

```typescript
async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetcher();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## 9. Performance Optimization

### 9.1 Parallel API Calls

```typescript
async function getAllRiskData(lat: number, lng: number, state: string) {
  // Execute all API calls in parallel
  const [flood, earthquake, wildfire, hurricane] = await Promise.allSettled([
    getFEMAFloodZone(lat, lng),
    getEarthquakeRisk(lat, lng),
    getWildfireRisk(lat, lng),
    getHurricaneRisk(lat, lng, state)
  ]);

  return {
    flood: flood.status === 'fulfilled' ? flood.value : fallbackFloodData,
    earthquake: earthquake.status === 'fulfilled' ? earthquake.value : fallbackEarthquakeData,
    wildfire: wildfire.status === 'fulfilled' ? wildfire.value : fallbackWildfireData,
    hurricane: hurricane.status === 'fulfilled' ? hurricane.value : fallbackHurricaneData
  };
}
```

### 9.2 Caching Strategy

```typescript
interface CacheConfig {
  ttl: {
    flood: 7 * 24 * 60 * 60 * 1000;      // 7 days
    earthquake: 30 * 24 * 60 * 60 * 1000; // 30 days
    wildfire: 24 * 60 * 60 * 1000;        // 1 day
    hurricane: 7 * 24 * 60 * 60 * 1000;   // 7 days
  };
}
```

---

## 10. Data Quality & Validation

### 10.1 Required Fields Validation

```typescript
interface RiskDataValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateRiskData(data: RiskData): RiskDataValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate flood data
  if (!data.femaZone) {
    errors.push('FEMA zone is required');
  }

  // Validate earthquake data
  if (data.earthquakeEvents < 0) {
    errors.push('Earthquake event count cannot be negative');
  }

  // Validate wildfire data
  if (data.wildfireDetections < 0) {
    errors.push('Wildfire detection count cannot be negative');
  }

  // Validate hurricane data
  if (!data.hurricaneRiskLevel) {
    warnings.push('Hurricane risk level not determined');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## 11. Testing & Verification

### 11.1 Test Locations

| Location | Expected Risks | Purpose |
|----------|---------------|---------|
| New Orleans, LA | High Flood, High Hurricane | Coastal testing |
| San Francisco, CA | High Earthquake, Moderate Wildfire | Seismic testing |
| Paradise, CA | Very High Wildfire | Wildfire testing |
| Miami, FL | High Hurricane, High Flood | Multi-risk testing |
| Denver, CO | Low All Risks | Baseline/control |

### 11.2 Sample Test Coordinates

```typescript
const testLocations = {
  newOrleans: { lat: 29.9511, lng: -90.0715 },
  sanFrancisco: { lat: 37.7749, lng: -122.4194 },
  paradise: { lat: 39.7596, lng: -121.6219 },
  miami: { lat: 25.7617, lng: -80.1918 },
  denver: { lat: 39.7392, lng: -104.9903 }
};
```

---

## 12. Future Enhancements

### 12.1 Potential Additional Data Sources

| Source | Purpose | Priority |
|--------|---------|----------|
| EPA Brownfields API | Environmental contamination | Medium |
| NOAA Tornado Data | Tornado risk zones | Low |
| USDA Drought Monitor | Long-term drought risk | Low |
| USGS Landslide API | Slope instability risk | Medium |
| Radon Zone Maps | Indoor radon risk | Low |

### 12.2 Enhanced Risk Scoring

- Machine learning models for risk prediction
- Historical claim data integration
- Property-specific risk adjustments
- Real-time alert integration

---

## 13. References & Documentation

### 13.1 Official API Documentation

| Service | Documentation URL |
|---------|------------------|
| FEMA NFHL | https://www.fema.gov/flood-maps/national-flood-hazard-layer |
| USGS Earthquake | https://earthquake.usgs.gov/fdsnws/event/1/ |
| NASA FIRMS | https://firms.modaps.eosdis.nasa.gov/api/ |
| NOAA NHC | https://www.nhc.noaa.gov/data/ |

### 13.2 Related Documents

- **Main PRD:** `prd-property-analysis-report.md`
- **Database Schema:** Section 2.2 of PRD
- **Scoring Algorithm:** Section 4 of PRD
- **Implementation Phases:** Section 9 of PRD

---

## 14. Summary

### 14.1 Complete API Inventory

| API | Provider | Purpose | Auth | Rate Limit | Cost |
|-----|----------|---------|------|------------|------|
| FEMA NFHL | FEMA | Flood zones | None | Unlimited | Free |
| USGS Earthquake | USGS | Seismic activity | None | Unlimited | Free |
| NASA FIRMS | NASA | Wildfire detection | API Key | 100k/day | Free |
| NOAA Hurricane | NOAA | Hurricane risk | None | Unlimited | Free |
| Google Maps | Google | Geocoding, distance | API Key | 25k/day free | $0.005+ |

### 14.2 Key Takeaways

1. **Four Primary Risk Categories:** Flood, Earthquake, Wildfire, Hurricane
2. **All APIs are Free:** No recurring API costs for risk data
3. **Real-time Data:** Most APIs provide near-real-time or recent data
4. **High Availability:** Government APIs typically have >99% uptime
5. **Comprehensive Coverage:** Full US coverage for all risk types

### 14.3 Implementation Status

- [x] API endpoints documented
- [x] Data structures defined
- [x] Implementation examples provided
- [x] Error handling strategies outlined
- [x] Testing locations identified

---

**Document End**

*This documentation provides comprehensive coverage of all risk analysis API endpoints and data sources referenced in the PRD (Section 2.1). All information has been extracted and verified against the source PRD document.*
