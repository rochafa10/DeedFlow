# API Troubleshooting Guide

## What Is This Guide?

A comprehensive troubleshooting reference for all external API integrations in the Tax Deed Flow system. This guide helps you diagnose and resolve issues when property reports show missing data, scores have low confidence, or API health checks fail.

## System Overview

The Tax Deed Flow system integrates with **18 external APIs** to provide comprehensive property analysis:

### **Core Risk Assessment APIs (9)**
1. **FEMA Flood API** - Flood zone determination and risk assessment
2. **USGS Earthquake API** - Seismic risk and earthquake history
3. **NASA FIRMS** - Wildfire detection and risk data
4. **EPA API** - Environmental hazards (Superfund, brownfield, UST, TRI, RCRA sites)
5. **NOAA Weather API** - Weather forecasts, climate data, and severe weather alerts
6. **FBI Crime API** - Crime statistics and safety scores by state
7. **Elevation API** (Open-Elevation) - Elevation data for flood assessment
8. **Climate API** (OpenWeather) - Long-term climate patterns
9. **FCC Broadband API** - Internet infrastructure and connectivity

### **Property & Economic Data APIs (9)**
10. **Census Bureau API** - Demographics, population, and economic statistics
11. **BLS API** (Bureau of Labor Statistics) - Employment and unemployment data
12. **Zillow API** (RapidAPI) - Market values and Zestimates
13. **Realtor.com API** (RapidAPI) - Property listings and comparables
14. **Geoapify API** - Geocoding, places (POIs), and amenities analysis
15. **Mapbox API** - Geocoding, mapping, and routing services
16. **Google Maps API** - Static maps, satellite imagery, and street view photos
17. **OpenStreetMap/Nominatim API** - Free geocoding and reverse geocoding
18. **OpenAI API** - AI-powered property analysis and report generation

---

## Understanding Graceful Degradation

**The system is designed to continue operating even when APIs fail.**

### What Happens When an API Fails?

```
✅ NORMAL OPERATION (All APIs working):
Property Report Confidence: 95%
All 15+ data points present
Full risk assessment available

⚠️ DEGRADED OPERATION (1-3 APIs failing):
Property Report Confidence: 70-85%
10-14 data points present
Partial risk assessment available
Missing data clearly marked

❌ CRITICAL FAILURE (4+ APIs failing):
Property Report Confidence: <60%
System flags report as incomplete
Manual review recommended
```

### Graceful Degradation Behavior

| Failed API | Impact | System Response |
|------------|--------|-----------------|
| **FEMA** | No flood zone data | Uses historical county data, flags as "Data Unavailable" |
| **USGS** | No seismic risk | Uses regional averages, reduces confidence score |
| **Census** | No demographics | Uses county-level estimates, marks as approximate |
| **Zillow/Realtor** | No market data | Uses tax assessment values, flags for manual review |
| **Google Maps** | No street view | Uses aerial imagery only, notes limitation |
| **Multiple APIs** | Incomplete report | System pauses, retries, then marks report as partial |

**Result:** Reports always generate, but clearly indicate what data is missing and why.

---

## Common Error Scenarios

### 1. Rate Limit Exceeded

**Symptoms:**
```
Error: Rate limit exceeded for [service]
Status Code: 429
Retry after: 60000ms
```

**What This Means:**
You've exceeded the API's request quota (per minute/hour/day).

**Resolution Steps:**

```sql
-- Check current rate limit status
SELECT * FROM api_rate_limits WHERE service_name = 'fema';

-- View which APIs are rate-limited
SELECT service_name, minute_count, hour_count, day_count, minute_reset_at
FROM api_rate_limits
WHERE minute_count > 0
ORDER BY minute_reset_at;

-- Reset rate limits (admin only)
DELETE FROM api_rate_limits WHERE service_name = 'fema';
```

**Prevention:**
- Use batch processing for large property sets
- Enable caching (check `report_api_cache` table)
- Increase API tier if hitting limits frequently

---

### 2. Circuit Breaker Open

**Symptoms:**
```
Error: Circuit breaker open for [service]
Status: Service temporarily unavailable
Next retry: [timestamp]
```

**What This Means:**
The API has failed repeatedly (5+ times), and the system has temporarily blocked requests to prevent cascading failures.

**Resolution Steps:**

```sql
-- Check circuit breaker status
SELECT * FROM api_circuit_breakers WHERE service_name = 'fema';

-- View all open circuits
SELECT service_name, state, failure_count, last_failure_time, next_retry_time
FROM api_circuit_breakers
WHERE state IN ('open', 'half-open')
ORDER BY last_failure_time DESC;

-- Force close circuit (admin only - use with caution)
UPDATE api_circuit_breakers
SET state = 'closed', failure_count = 0, success_count = 0
WHERE service_name = 'fema';
```

**Recovery Process:**
1. Wait for `next_retry_time` (usually 30-60 seconds)
2. Circuit automatically transitions to "half-open"
3. System tries one request
4. If successful → Circuit closes (normal operation)
5. If failed → Circuit reopens (wait longer)

**Prevention:**
- Check API health regularly: `GET /api/health/apis`
- Monitor external API status pages
- Have fallback data sources ready

---

### 3. Network Timeout

**Symptoms:**
```
Error: Request timed out after 30000ms
Network error: Connection timeout
```

**What This Means:**
The API didn't respond within the configured timeout period (usually 30 seconds).

**Resolution Steps:**

**Check API Health:**
```bash
# Health check endpoint (all APIs)
curl https://your-app.com/api/health/apis

# Single service health check (e.g., test FEMA specifically)
curl "https://your-app.com/api/health/apis?service=fema"
```

**Common Causes:**
- API service is down
- Slow network connection
- API is overloaded
- Firewall blocking requests

**Fixes:**
```typescript
// Increase timeout for specific service (in service config)
{
  timeout: 60000  // Increase from 30s to 60s
}
```

---

### 4. Invalid API Response

**Symptoms:**
```
Error: Invalid response from [service]
ValidationError: Missing required fields
Status Code: 422
```

**What This Means:**
The API returned data, but it doesn't match expected format.

**Resolution Steps:**

**Check Cache:**
```sql
-- View recent API responses
SELECT api_name, endpoint, response_data, created_at
FROM report_api_cache
WHERE api_name = 'fema'
ORDER BY created_at DESC
LIMIT 10;

-- Clear stale cache for specific API
DELETE FROM report_api_cache
WHERE api_name = 'fema' AND created_at < NOW() - INTERVAL '1 day';
```

**Common Causes:**
- API changed response format
- API deprecated certain fields
- API returned error in unexpected format

**Fixes:**
- Update service type definitions
- Check API documentation for changes
- Add additional validation/parsing logic

---

### 5. Authentication Failure

**Symptoms:**
```
Error: API authentication failed
Status Code: 401 or 403
Message: Invalid API key
```

**Resolution Steps:**

**Check Environment Variables:**
```bash
# Verify API keys are set
echo $CENSUS_API_KEY
echo $NASA_FIRMS_MAP_KEY
echo $GOOGLE_MAPS_API_KEY
echo $RAPIDAPI_KEY
```

**Test API Keys:**
```bash
# Test FEMA (no key required)
curl "https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query?where=1=1&f=json"

# Test Census (with key)
curl "https://api.census.gov/data/2022/acs/acs5?get=B01003_001E&for=county:*&key=YOUR_KEY"

# Test Google Maps (with key)
curl "https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway&key=YOUR_KEY"
```

**Common Causes:**
- Missing API key in `.env.local`
- Expired API key
- API key not activated
- Wrong API tier/permissions

**Fixes:**
1. Regenerate API key from provider
2. Update `.env.local` with new key
3. Restart application to load new environment variables

---

### 6. Service Unavailable

**Symptoms:**
```
Error: Service unavailable
Status Code: 503
Message: [Service] is currently down
```

**Resolution Steps:**

**Check External Status:**
```
FEMA: https://www.fema.gov/about/openfema/status
USGS: https://earthquake.usgs.gov/
NASA: https://firms.modaps.eosdis.nasa.gov/
Census: https://status.census.gov/
Google Maps: https://status.cloud.google.com/
```

**Check System Health:**
```bash
# Basic health check
curl -I https://your-app.com/api/health/apis

# Detailed health check
curl https://your-app.com/api/health/apis | jq '.'

# Example response:
{
  "timestamp": "2026-01-23T10:30:00Z",
  "testLocation": {
    "latitude": 40.5186,
    "longitude": -78.3947,
    "address": "1234 Main St, Altoona, PA 16601",
    "state": "PA"
  },
  "summary": {
    "total": 17,
    "ok": 14,
    "error": 2,
    "skipped": 1,
    "avgLatency": 1234
  },
  "results": [
    {
      "service": "FEMA Flood",
      "status": "ok",
      "latency": 847,
      "data": { "zone": "X" }
    },
    {
      "service": "USGS Earthquake",
      "status": "error",
      "latency": 8542,
      "error": "Request timed out after 30000ms"
    },
    {
      "service": "Zillow (RapidAPI)",
      "status": "skipped",
      "error": "No RapidAPI key configured"
    }
  ]
}
```

**What to Do:**
- If external service is down: Wait for recovery (check status page)
- If internal service issue: Check logs, restart application
- Use cached data if available
- Generate partial reports with available data

---

## API-Specific Troubleshooting

### FEMA Flood API

**Common Issues:**

**1. No flood zone found for coordinates**
```
Response: { features: [] }
Result: Zone = 'X' (minimal risk)
```
- **Cause:** Property outside FEMA mapped areas
- **Fix:** This is expected for unmapped areas, not an error

**2. Invalid coordinates**
```
Error: Invalid coordinates: lat=NaN, lng=NaN
```
- **Cause:** Missing or malformed lat/lng data
- **Fix:** Verify property has valid coordinates in database

**Health Check:**
```bash
# Test FEMA endpoint
curl "https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query?geometry={\"x\":-74.0060,\"y\":40.7128}&geometryType=esriGeometryPoint&f=json"
```

**Rate Limits:**
- 30 requests/minute
- 500 requests/hour
- Cache duration: 7 days

---

### USGS Earthquake API

**Common Issues:**

**1. No earthquake data for region**
```
Response: { features: [] }
Result: Uses regional average risk
```
- **Cause:** Low seismic activity in area (normal)
- **Fix:** Not an error, system uses default risk level

**2. Historical data incomplete**
```
Warning: Only 3 earthquakes found in 30-year history
```
- **Cause:** Region genuinely has low activity
- **Fix:** System adjusts risk score accordingly

**Health Check:**
```bash
# Test USGS endpoint
curl "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2000-01-01&latitude=34.0522&longitude=-118.2437&maxradiuskm=100"
```

**Rate Limits:**
- 60 requests/minute
- 1000 requests/hour
- Cache duration: 30 days (historical data)

---

### Census Bureau API

**Common Issues:**

**1. API key required**
```
Error: 401 Unauthorized
Message: "A valid API key is required"
```
- **Fix:** Get free API key at https://api.census.gov/data/key_signup.html

**2. Tract not found**
```
Error: Could not determine census tract
```
- **Cause:** Coordinates outside US or in water
- **Fix:** Verify property is on land, within US

**3. Data not available**
```
Response: { "B01003_001E": -666666666 }
```
- **Cause:** Census suppressed data (privacy)
- **Fix:** Use county-level estimates instead

**Health Check:**
```bash
# Test geocoder
curl "https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=-74.0060&y=40.7128&benchmark=Public_AR_Current&vintage=Current_Current&format=json"

# Test data API
curl "https://api.census.gov/data/2022/acs/acs5?get=B01003_001E&for=county:*&key=YOUR_KEY"
```

**Rate Limits:**
- 20 requests/minute
- 500 requests/hour
- 5000 requests/day
- Cache duration: 30 days

---

### Zillow API (RapidAPI)

**Common Issues:**

**1. RapidAPI subscription required**
```
Error: 403 Forbidden
Message: "You are not subscribed to this API"
```
- **Fix:** Subscribe at https://rapidapi.com/apimaker/api/zillow-com1

**2. Property not found**
```
Response: { data: null, error: "Property not found" }
```
- **Cause:** Property not in Zillow database or address mismatch
- **Fix:** Try alternate address formats or use property ID (ZPID)

**3. Rate limit (RapidAPI)**
```
Error: 429 Too Many Requests
Message: "Rate limit exceeded"
```
- **Fix:** Upgrade RapidAPI tier or reduce requests

**4. Invalid Zestimate**
```
Response: { zestimate: null }
```
- **Cause:** Zillow doesn't provide Zestimates for all properties
- **Fix:** Not an error, use alternative valuation methods

**Health Check:**
```bash
# Test Zillow API (via RapidAPI)
curl -X GET "https://zillow-com1.p.rapidapi.com/property?zpid=2080998890" \
  -H "X-RapidAPI-Key: YOUR_KEY" \
  -H "X-RapidAPI-Host: zillow-com1.p.rapidapi.com"
```

**Rate Limits:**
- Depends on RapidAPI subscription tier
- Basic: 100 requests/month
- Pro: 1,000 requests/month
- Cache duration: 7 days

---

### Realtor.com API (RapidAPI)

**Common Issues:**

**1. RapidAPI subscription required**
```
Error: 403 Forbidden
Message: "You are not subscribed to this API"
```
- **Fix:** Subscribe at https://rapidapi.com/apidojo/api/realty-in-us

**2. No sold comparables found**
```
Response: { comparables: [] }
```
- **Cause:** No recent sales in search radius
- **Fix:** Expand radius or date range, or reduce filter constraints

**3. Address geocoding failed**
```
Error: Unable to geocode address
```
- **Cause:** Address not found in Realtor.com database
- **Fix:** Verify address format, try with zip code only

**4. Rate limit (RapidAPI)**
```
Error: 429 Too Many Requests
Message: "Rate limit exceeded"
```
- **Fix:** Upgrade RapidAPI tier or reduce requests

**Health Check:**
```bash
# Test Realtor.com API (via RapidAPI)
curl -X GET "https://realty-in-us.p.rapidapi.com/properties/v3/detail?property_id=M1234567890" \
  -H "X-RapidAPI-Key: YOUR_KEY" \
  -H "X-RapidAPI-Host: realty-in-us.p.rapidapi.com"
```

**Rate Limits:**
- Depends on RapidAPI subscription tier
- Basic: 100 requests/month
- Pro: 1,000 requests/month
- Ultra: 10,000 requests/month
- Cache duration: 7 days

---

### NASA FIRMS (Wildfire)

**Common Issues:**

**1. MAP_KEY required**
```
Error: Invalid MAP_KEY
```
- **Fix:** Get free key at https://firms.modaps.eosdis.nasa.gov/api/area/

**2. No active fires**
```
Response: []
Result: Shows "No active fires detected"
```
- **Cause:** No fires in 50km radius (normal)
- **Fix:** Not an error, system records zero fire events

**Health Check:**
```bash
# Test FIRMS API
curl "https://firms.modaps.eosdis.nasa.gov/api/area/csv/MAP_KEY/VIIRS_SNPP_NRT/world/1/2026-01-23"
```

**Rate Limits:**
- Unlimited requests (free)
- Cache duration: 24 hours (active fires change daily)

---

### Climate API (Open-Meteo)

**Common Issues:**

**1. Invalid coordinates**
```
Error: Coordinates out of range
```
- **Cause:** Latitude/longitude outside valid range
- **Fix:** Validate lat (-90 to 90), lng (-180 to 180)

**2. No historical data available**
```
Warning: Historical climate data limited for this location
```
- **Cause:** Remote location with sparse weather station coverage
- **Fix:** Expected behavior, use available data with lower confidence

**3. API overload (rare)**
```
Error: 503 Service Unavailable
```
- **Cause:** Free public API experiencing high load
- **Fix:** Retry with exponential backoff (automatic in service)

**Health Check:**
```bash
# Test current weather endpoint
curl "https://api.open-meteo.com/v1/forecast?latitude=40.5186&longitude=-78.3947&current_weather=true"

# Test historical climate data
curl "https://archive-api.open-meteo.com/v1/archive?latitude=40.5186&longitude=-78.3947&start_date=2023-01-01&end_date=2023-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum"
```

**Rate Limits:**
- Free public API
- No documented rate limits
- Cache duration: 1 hour (current weather), 7 days (climate normals)

**Data Provided:**
- Current weather conditions
- 7-day forecast
- Historical climate data
- Climate normals (30-year averages)
- Extreme weather risk assessment

---

### Open-Elevation API

**Common Issues:**

**1. Service overloaded**
```
Error: 503 Service Unavailable
```
- **Cause:** Public API has no rate limits, often overloaded
- **Fix:** Retry with exponential backoff (automatic)

**2. Invalid coordinates**
```
Error: Coordinates out of range
```
- **Cause:** lat/lng outside valid range
- **Fix:** Validate coordinates before API call

**Health Check:**
```bash
# Test Open-Elevation
curl "https://api.open-elevation.com/api/v1/lookup?locations=40.7128,-74.0060"
```

**Rate Limits:**
- None (public API)
- Often slow/unreliable
- Cache duration: 90 days (elevation rarely changes)

---

### BLS (Bureau of Labor Statistics) API

**Common Issues:**

**1. Rate limit exceeded (no API key)**
```
Error: 429 Too Many Requests
Message: "Daily limit exceeded"
```
- **Cause:** Free tier limit: 25 requests/day
- **Fix:** Register for free API key (increases to 500 requests/day)
- **Registration:** https://data.bls.gov/registrationEngine/

**2. Invalid state abbreviation**
```
Error: ValidationError - Invalid state abbreviation
```
- **Cause:** Using full state name instead of abbreviation
- **Fix:** Use 2-letter state code (e.g., "PA" not "Pennsylvania")

**3. No data available**
```
Response: { status: "REQUEST_NOT_PROCESSED" }
```
- **Cause:** Invalid series ID or date range
- **Fix:** Verify series ID format and ensure dates are within available range

**Health Check:**
```bash
# Test unemployment rate API (no key required)
curl "https://api.bls.gov/publicAPI/v2/timeseries/data/LNS14000000"
```

**Rate Limits:**
- Without key: 25 requests/day
- With key: 500 requests/day
- Cache duration: 7 days (monthly data updates)

---

### EPA (Environmental Protection Agency) API

**Common Issues:**

**1. No sites found**
```
Response: { superfundSites: [], brownfieldSites: [], ... }
Result: All counts = 0
```
- **Cause:** No environmental hazards within search radius (normal for many areas)
- **Fix:** Not an error - system records zero sites

**2. Invalid coordinates**
```
Error: Invalid latitude/longitude
```
- **Cause:** Coordinates outside valid range or malformed
- **Fix:** Validate lat (-90 to 90), lng (-180 to 180)

**3. API endpoint unavailable**
```
Error: 503 Service Unavailable
```
- **Cause:** EPA Envirofacts API undergoing maintenance
- **Fix:** System returns empty results gracefully, retry later

**Health Check:**
```bash
# Test EPA Envirofacts endpoint
curl "https://data.epa.gov/efservice/CERCLIS/SITE/rows/0:1/JSON"
```

**Rate Limits:**
- Free public API
- No documented rate limits
- Cache duration: 7 days (environmental data changes slowly)

**Data Sources:**
- Superfund (CERCLIS) sites
- Brownfield properties
- Underground Storage Tanks (UST)
- Toxic Release Inventory (TRI)
- RCRA hazardous waste facilities
- Radon zones by county

---

### FBI Crime Data API

**Common Issues:**

**1. Data lag (1-2 years)**
```
Warning: Latest data is from 2022
Current year: 2024
```
- **Cause:** FBI crime data published annually with 1-2 year delay
- **Fix:** Expected behavior, use most recent available year

**2. No county-level data**
```
Error: Only state-level estimates available
```
- **Cause:** FBI primarily publishes state aggregates
- **Fix:** Use state-level data as proxy for county analysis

**3. API key optional**
```
Note: FBI_CRIME_API_KEY not required but recommended
```
- **Cause:** Public API works without key
- **Fix:** Add api_key parameter for better rate limits

**Health Check:**
```bash
# Test state estimates endpoint
curl "https://api.usa.gov/crime/fbi/cde/estimates/states/PA"
```

**Rate Limits:**
- 2 requests/second (conservative)
- No hard limits documented
- Cache duration: 30 days (data updated annually)

---

### FCC Broadband API

**Common Issues:**

**1. Address not found**
```
Response: { providers: [], error: "Address not found" }
```
- **Cause:** Address not in FCC database or formatting issue
- **Fix:** Try with coordinates instead of address

**2. No broadband providers**
```
Response: { summary: { totalProviders: 0, unserved: true } }
```
- **Cause:** Rural/remote area with no service
- **Fix:** Not an error, flag property as "unserved area"

**3. User-Agent required**
```
Error: 403 Forbidden
Message: "User-Agent header required"
```
- **Cause:** FCC API requires User-Agent header
- **Fix:** Automatic in service (already configured)

**Health Check:**
```bash
# Test broadband availability by coordinates
curl -H "User-Agent: PropertyAnalysis/1.0" \
  "https://broadbandmap.fcc.gov/api/public/map/location?lat=40.7128&lon=-74.0060&format=json"
```

**Rate Limits:**
- 2 requests/second recommended
- No hard limits documented
- Cache duration: 30 days (broadband data updated quarterly)

**Service Thresholds:**
- Adequate: 25/3 Mbps (download/upload)
- Underserved: < 25/3 Mbps
- Unserved: < 10/1 Mbps

---

### NOAA Weather API

**Common Issues:**

**1. User-Agent required**
```
Error: 403 Forbidden
Message: "User-Agent header is required"
```
- **Cause:** NOAA requires identification via User-Agent
- **Fix:** Automatic in service (configured as "TaxDeedFlow/1.0")

**2. Grid point not found**
```
Error: 404 Not Found
Path: /points/{lat},{lng}
```
- **Cause:** Coordinates outside US or in water
- **Fix:** NOAA only covers US locations

**3. Forecast office unavailable**
```
Error: 503 Service Unavailable
Message: "Forecast office temporarily unavailable"
```
- **Cause:** Regional NOAA office down for maintenance
- **Fix:** Retry with exponential backoff (automatic)

**Health Check:**
```bash
# Test grid point lookup
curl -H "User-Agent: PropertyAnalysis/1.0" \
  "https://api.weather.gov/points/40.5186,-78.3947"

# Test active alerts
curl -H "User-Agent: PropertyAnalysis/1.0" \
  "https://api.weather.gov/alerts/active?point=40.5186,-78.3947"
```

**Rate Limits:**
- 2 requests/second recommended
- No hard limits, but "reasonable use" policy
- Cache duration: 1 hour (forecasts), 24 hours (climate data)

---

### Geoapify API

**Common Issues:**

**1. API key required**
```
Error: 401 Unauthorized
Message: "API key is missing or invalid"
```
- **Cause:** GEOAPIFY_API_KEY not set in environment
- **Fix:** Get free API key at https://www.geoapify.com/ (3,000 requests/day)

**2. Rate limit exceeded**
```
Error: 429 Too Many Requests
Message: "Daily limit exceeded"
```
- **Cause:** Free tier: 3,000 requests/day
- **Fix:** Upgrade to paid tier or reduce requests

**3. No places found**
```
Response: { features: [] }
```
- **Cause:** No POIs of requested type within radius
- **Fix:** Not an error, expand search radius or try different category

**Health Check:**
```bash
# Test geocoding
curl "https://api.geoapify.com/v1/geocode/search?text=Altoona%20PA&apiKey=YOUR_KEY"

# Test places search
curl "https://api.geoapify.com/v2/places?categories=commercial.supermarket&filter=circle:-78.3947,40.5186,1000&apiKey=YOUR_KEY"
```

**Rate Limits:**
- Free tier: 3,000 requests/day
- Paid tier: Up to 100,000 requests/day
- Cache duration: 24 hours (POIs)

---

### Mapbox API

**Common Issues:**

**1. Access token invalid**
```
Error: 401 Unauthorized
Message: "Not Authorized - Invalid Token"
```
- **Cause:** NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN not set or expired
- **Fix:** Get token at https://account.mapbox.com/

**2. Rate limit exceeded**
```
Error: 429 Too Many Requests
Message: "Rate limit exceeded"
```
- **Cause:** Free tier limits exceeded
- **Fix:** Mapbox has generous limits (50,000-100,000 requests/month)

**3. Geocoding returns no results**
```
Response: { features: [] }
```
- **Cause:** Address too vague or not found
- **Fix:** Add more specificity (city, state, zip)

**Health Check:**
```bash
# Test geocoding
curl "https://api.mapbox.com/geocoding/v5/mapbox.places/Altoona%20PA.json?access_token=YOUR_TOKEN"

# Test static map
curl "https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/-78.3947,40.5186,14/400x300?access_token=YOUR_TOKEN" --output test.png
```

**Rate Limits:**
- Geocoding: 100,000 requests/month (free)
- Static maps: 50,000 requests/month (free)
- Generous burst allowance
- Cache duration: 7 days

---

### OpenAI API

**Common Issues:**

**1. API key required**
```
Error: 401 Unauthorized
Message: "Incorrect API key provided"
```
- **Cause:** OPENAI_API_KEY not set or invalid
- **Fix:** Get API key at https://platform.openai.com/api-keys

**2. Rate limit exceeded**
```
Error: 429 Too Many Requests
Message: "Rate limit reached for requests"
```
- **Cause:** Tier-based rate limits (varies by usage tier)
- **Fix:** Wait and retry, or upgrade tier

**3. Token limit exceeded**
```
Error: 400 Bad Request
Message: "This model's maximum context length is 8192 tokens"
```
- **Cause:** Input + output exceeds model token limit
- **Fix:** Reduce input data or use a larger context model

**4. High cost**
```
Warning: Property analysis costs $0.10-$0.50 per request
```
- **Cause:** Using GPT-4 or large inputs
- **Fix:** Use gpt-4o-mini for lower cost, cache analyses

**Health Check:**
```bash
# Test chat completion
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Test"}],
    "max_tokens": 10
  }'
```

**Rate Limits:**
- Tier 1 (free): 3 requests/min, 200 requests/day
- Tier 2+: Higher limits based on usage
- Cache duration: None (each property unique)

**Cost:**
- gpt-4o-mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Property analysis: ~$0.05-$0.20 per report

---

### Google Maps API

**Common Issues:**

**1. API key required**
```
Error: 401 Unauthorized
Message: "API key not provided or invalid"
```
- **Cause:** NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set in environment
- **Fix:** Get API key at https://console.cloud.google.com/apis/credentials

**2. Billing not enabled**
```
Error: 403 Forbidden
Message: "This API project is not authorized to use this API"
```
- **Cause:** Google Maps Platform billing not enabled in Google Cloud Console
- **Fix:** Enable billing at https://console.cloud.google.com/billing

**3. Rate limit exceeded**
```
Error: 429 Too Many Requests
Message: "You have exceeded your daily request quota"
```
- **Cause:** Free tier limit exceeded (28,000 map loads/month)
- **Fix:** Upgrade billing plan or reduce requests

**4. No street view available**
```
Response: { status: "ZERO_RESULTS" }
```
- **Cause:** No street view imagery available at property location
- **Fix:** Not an error, use aerial imagery instead

**Health Check:**
```bash
# Test Google Maps API
curl "http://localhost:3000/api/health/apis?service=googlemaps"
```

**Rate Limits:**
- Free tier: 28,000 map loads/month
- Static Maps API: $2 per 1,000 requests after free tier
- Street View API: $7 per 1,000 requests after free tier
- Cache duration: N/A (client-side caching recommended)

**API Endpoints Used:**
- **Static Maps API**: Terrain and satellite imagery for property overview
- **Street View API**: Street-level property photos when available
- Both require: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

**Components Using Google Maps:**
- `GoogleMapStatic.tsx` - Static map images
- `GoogleStreetViewStatic.tsx` - Street view images
- `FEMAFloodMap.tsx` - Flood zone overlays

---

### OSM (OpenStreetMap) / Nominatim API

**Note:** ⚠️ OSM/Nominatim is not currently tested in the `/api/health/apis` endpoint. To verify OSM functionality, use the service directly in your application or test manually.

**Common Issues:**

**1. Rate limit exceeded**
```
Error: 429 Too Many Requests
Message: "Rate Limited"
```
- **Cause:** Exceeding 1 request/second limit
- **Fix:** Service queues requests automatically, but reduce load

**2. No results found**
```
Response: []
```
- **Cause:** Address too vague or not in OSM database
- **Fix:** Try with more specific address or coordinates

**3. User-Agent required**
```
Error: 403 Forbidden
Message: "Missing User-Agent header"
```
- **Cause:** Nominatim requires User-Agent identification
- **Fix:** Automatic in service (configured as "TaxDeedFlow/1.0")

**Health Check:**
```bash
# Test geocoding
curl -H "User-Agent: PropertyAnalysis/1.0" \
  "https://nominatim.openstreetmap.org/search?q=Altoona,PA&format=json"

# Test reverse geocoding
curl -H "User-Agent: PropertyAnalysis/1.0" \
  "https://nominatim.openstreetmap.org/reverse?lat=40.5186&lon=-78.3947&format=json"
```

**Rate Limits:**
- STRICT: Maximum 1 request/second
- No bulk geocoding allowed
- No automated queries without permission
- Cache duration: 7 days

**Usage Policy:**
- Must provide valid User-Agent
- Must cache results aggressively
- Free service - be respectful

---

## Using Health Check Endpoints

### Basic Health Check

**Endpoint:** `GET /api/health/apis`

**Usage:**
```bash
curl https://your-app.com/api/health/apis
```

**Response:**
```json
{
  "timestamp": "2026-01-23T10:30:00Z",
  "testLocation": {
    "latitude": 40.5186,
    "longitude": -78.3947,
    "address": "1234 Main St, Altoona, PA 16601",
    "state": "PA"
  },
  "summary": {
    "total": 17,
    "ok": 15,
    "error": 1,
    "skipped": 1,
    "avgLatency": 1456
  },
  "results": [
    {
      "service": "FEMA Flood",
      "status": "ok",
      "latency": 847,
      "data": { "zone": "X" }
    },
    {
      "service": "Census",
      "status": "error",
      "latency": 8542,
      "error": "Request timed out after 30000ms"
    },
    {
      "service": "Zillow (RapidAPI)",
      "status": "skipped",
      "error": "No RapidAPI key configured"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - All tests completed (check `summary` for success/error counts)
- `500 Internal Server Error` - Health check endpoint failed

---

### Single Service Health Check

**Endpoint:** `GET /api/health/apis?service=<service_name>`

**Usage:**
```bash
# Test a specific service (e.g., FEMA)
curl "https://your-app.com/api/health/apis?service=fema"

# Test another service (e.g., Census)
curl "https://your-app.com/api/health/apis?service=census"
```

**What It Does:**
Makes actual API calls to the specified external service (uses test coordinates)

**Response:**
```json
{
  "timestamp": "2026-01-23T10:30:00Z",
  "testLocation": {
    "latitude": 40.5186,
    "longitude": -78.3947,
    "address": "1234 Main St, Altoona, PA 16601",
    "state": "PA"
  },
  "summary": {
    "total": 1,
    "ok": 1,
    "error": 0,
    "skipped": 0,
    "avgLatency": 847
  },
  "results": [
    {
      "service": "FEMA Flood",
      "status": "ok",
      "latency": 847,
      "data": {
        "zone": "X",
        "floodway": false,
        "riskLevel": "Minimal"
      }
    }
  ]
}
```

**When to Use:**
- Test a specific API that's been problematic
- Before processing properties that rely on a specific service
- When investigating performance issues with one service

---

## Resolution Workflows

### Workflow 1: Single API Failure

```
1. Identify which API failed
   → Check error message or logs

2. Check if it's a known issue
   → Review this troubleshooting guide

3. Check external status
   → Visit API provider's status page

4. Check health endpoint
   → GET /api/health/apis

5. Check circuit breaker status
   → Query api_circuit_breakers table

6. If circuit open: Wait for auto-recovery
   → Check next_retry_time

7. If persistent: Check API key/configuration
   → Verify .env.local settings

8. If still failing: Use cached data or skip
   → System will mark report as partial
```

---

### Workflow 2: Multiple API Failures

```
1. Check overall system health
   → GET /api/health/apis

2. Check network connectivity
   → Can you reach external sites?

3. Check rate limits across all services
   → Query api_rate_limits table

4. Check circuit breakers
   → Query api_circuit_breakers table

5. If all circuits open: System-wide issue
   → Check application logs
   → Check hosting provider status
   → Check firewall/security settings

6. If selective failures: API provider issues
   → Check each API's status page
   → Wait for recovery

7. Pause property processing
   → Resume when health returns to "healthy"
```

---

### Workflow 3: Low Confidence Reports

```
Scenario: Report shows 65% confidence

1. Check which data is missing
   → Review report for "Data Unavailable" flags

2. Identify failed APIs
   → Check report metadata or logs

3. Check if APIs recovered
   → GET /api/health/apis

4. If recovered: Re-generate report
   → Delete cached data, trigger new report

5. If still failing: Manual data entry
   → Research property manually
   → Override missing fields

6. Flag for review
   → Mark property for manual verification
```

---

### Workflow 4: Batch Processing Failures

```
Scenario: Processing 100 properties, 23 fail

1. Check how many failed
   → Review batch processing logs

2. Check if same API caused all failures
   → Group errors by API name

3. If single API: Rate limit exceeded
   → Reduce batch size
   → Increase delay between requests

4. If multiple APIs: Circuit breakers triggered
   → Pause processing
   → Wait for circuits to close
   → Resume batch

5. If persistent: Process individually
   → Identify problematic properties
   → Process successful ones
   → Review failures manually
```

---

## Database Queries for Troubleshooting

### Check API Cache Status

```sql
-- View cache hit rates by API
SELECT
  api_name,
  COUNT(*) as cached_requests,
  MAX(created_at) as last_cached,
  MIN(expires_at) as first_expiry
FROM report_api_cache
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY api_name
ORDER BY cached_requests DESC;
```

### Check Rate Limits

```sql
-- View current rate limit usage
SELECT
  service_name,
  minute_count,
  minute_reset_at,
  hour_count,
  hour_reset_at,
  day_count,
  day_reset_at
FROM api_rate_limits
ORDER BY minute_count DESC;
```

### Check Circuit Breakers

```sql
-- View all circuit breaker states
SELECT
  service_name,
  state,
  failure_count,
  success_count,
  last_failure_time,
  last_error_message,
  next_retry_time
FROM api_circuit_breakers
ORDER BY failure_count DESC;
```

### Find Recent Errors

```sql
-- Find properties with incomplete API data
SELECT
  p.id,
  p.parcel_id,
  p.address,
  p.created_at,
  rd.confidence_score,
  rd.missing_data_flags
FROM properties p
JOIN regrid_data rd ON p.id = rd.property_id
WHERE rd.confidence_score < 75
ORDER BY p.created_at DESC
LIMIT 20;
```

### Clean Stale Cache

```sql
-- Remove expired cache entries (run periodically)
DELETE FROM report_api_cache
WHERE expires_at < NOW() - INTERVAL '1 hour';

-- Check how much was deleted
SELECT cleanup_expired_cache();
```

---

## Monitoring Best Practices

### Daily Health Checks

```bash
#!/bin/bash
# Save as: daily-health-check.sh

# Basic health check
echo "=== Basic Health Check ==="
curl -s https://your-app.com/api/health/apis | jq '.summary'

# Check for error services
echo "\n=== Error Services ==="
curl -s https://your-app.com/api/health/apis | jq '.results[] | select(.status == "error")'

# Check latency
echo "\n=== Service Latency ==="
curl -s https://your-app.com/api/health/apis | jq '.results[] | {service: .service, latency: .latency}'

# Test specific service (once per day)
echo "\n=== Test FEMA Service ==="
curl -s "https://your-app.com/api/health/apis?service=fema" | jq '.'
```

### Alert Thresholds

**Set up alerts when:**
- Overall status = "unhealthy" (4+ APIs down)
- Any circuit breaker open for >5 minutes
- Rate limit remaining <10 for any API
- Cache hit rate <50% (indicates cache issues)
- Response time >5000ms for any API

---

## Prevention Strategies

### 1. Enable Aggressive Caching

```typescript
// Increase cache TTL for stable data
cache: {
  enabled: true,
  ttlSeconds: 604800,          // 7 days for FEMA
  staleWhileRevalidate: 86400  // Serve stale for 1 day
}
```

### 2. Batch Processing

```
Instead of:
  - Process 500 properties at once

Do this:
  - Process in batches of 50
  - 10-second delay between batches
  - Check health every 100 properties
```

### 3. Use Fallback Data

```typescript
// Always have a fallback
try {
  return await femaService.getFloodZone(lat, lng);
} catch (error) {
  logger.warn('FEMA failed, using county default');
  return getCountyDefaultFloodZone(countyId);
}
```

### 4. Pre-warm Cache

```sql
-- Pre-fetch data for upcoming properties
SELECT prefetch_api_data_for_properties(
  property_ids := ARRAY(
    SELECT id FROM properties
    WHERE status = 'pending_analysis'
    LIMIT 100
  )
);
```

### 5. Monitor API Provider Status

Subscribe to status updates:
- FEMA: https://www.fema.gov/about/openfema/status
- USGS: https://earthquake.usgs.gov/monitoring/
- Google: https://status.cloud.google.com/
- Census: https://status.census.gov/

---

## Emergency Procedures

### Complete API Outage

**If all external APIs are unavailable:**

1. **Pause new property processing**
2. **Generate reports from cached data only**
3. **Mark all new reports as "preliminary"**
4. **Notify users of degraded service**
5. **Check hosting provider status**
6. **Wait for recovery, monitor health endpoint**

### Database Connection Issues

**If Supabase is unreachable:**

1. **Check Supabase status page**
2. **Verify connection strings in .env.local**
3. **Check connection pool limits**
4. **Restart application to reset connections**
5. **If persistent: Contact Supabase support**

### API Key Compromised

**If API key is exposed:**

1. **Immediately rotate key at provider**
2. **Update .env.local with new key**
3. **Redeploy application**
4. **Clear rate limit counters**
5. **Monitor for unauthorized usage**

---

## Getting Help

### When Self-Troubleshooting Doesn't Work

**Check in this order:**

1. **This troubleshooting guide** (you are here)
2. **System health endpoint** (`/api/health/apis`)
3. **Application logs** (check for ERROR level messages)
4. **API provider documentation** (link in each API section)
5. **API provider status page** (check for outages)
6. **Community forums** (Stack Overflow, GitHub Issues)

### Useful Diagnostic Commands

```bash
# Check all environment variables are set
env | grep -E "CENSUS|NASA|GOOGLE|RAPIDAPI"

# Test database connection
psql $DATABASE_URL -c "SELECT NOW();"

# Test external API directly
curl -v "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1"

# View recent application logs
tail -f /var/log/application.log | grep -i error

# Check disk space (cache can grow large)
df -h

# Check memory usage
free -m
```

---

## Quick Reference Table

| Error Type | Status Code | Severity | Auto-Recovery | Manual Action Required |
|------------|-------------|----------|---------------|------------------------|
| Rate Limit | 429 | Warning | Yes (wait) | Reduce request rate |
| Circuit Breaker | 503 | Warning | Yes (30-60s) | Check API health |
| Timeout | 408 | Warning | Yes (retry) | Check network/API status |
| Auth Failure | 401/403 | Critical | No | Fix API key |
| Network Error | 0 | Critical | Yes (retry) | Check connectivity |
| Validation Error | 422 | Error | No | Update code/schema |
| Service Down | 503 | Critical | No | Wait for API recovery |

---

## Conclusion

**Remember:**
- ✅ Most API failures are temporary and auto-recover
- ✅ The system is designed to handle failures gracefully
- ✅ Partial reports are better than no reports
- ✅ Cache is your friend - use it aggressively
- ✅ Monitor health checks regularly
- ✅ When in doubt, check circuit breakers and rate limits

**The goal:** Provide users with the best data available, clearly indicating confidence levels and missing information.

---

*Last Updated: January 2026*
*Version: 1.0 - Initial Release*
