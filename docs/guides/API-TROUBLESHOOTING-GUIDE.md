# API Troubleshooting Guide

## What Is This Guide?

A comprehensive troubleshooting reference for all external API integrations in the Tax Deed Flow system. This guide helps you diagnose and resolve issues when property reports show missing data, scores have low confidence, or API health checks fail.

## System Overview

The Tax Deed Flow system integrates with **17 external APIs** to provide comprehensive property analysis:

### **Core APIs (9)**
1. **FEMA Flood API** - Flood zone determination
2. **USGS Earthquake API** - Seismic risk assessment
3. **NASA FIRMS** - Wildfire risk data
4. **Census Bureau** - Demographics and statistics
5. **Open-Elevation** - Elevation data
6. **OpenWeather** - Climate and weather patterns
7. **Realtor.com API** (RapidAPI) - Property listings and comparables
8. **Zillow API** (RapidAPI) - Market values and Zestimates
9. **Google Maps/Places** - Location data and imagery

### **Supporting APIs (8)**
10. **Supabase** - Database and storage
11. **Perplexity AI** - Enhanced research and citations
12. **Brave Search** - Free web search
13. **Browserless** - Scalable browser automation
14. **Firecrawl** - Web scraping
15. **PACER** - Federal court records (IRS liens)
16. **Regrid** - Property data enrichment
17. **Playwright** - Browser automation

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
- Check API health regularly: `GET /api/health`
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
# Health check endpoint
curl https://your-app.com/api/health

# Deep health check (tests actual API calls)
curl https://your-app.com/api/health?deep=true
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
curl -I https://your-app.com/api/health

# Detailed health check
curl https://your-app.com/api/health | jq '.'

# Example response:
{
  "overall": "degraded",
  "timestamp": "2026-01-23T10:30:00Z",
  "services": [
    {
      "service": "fema",
      "status": "healthy",
      "circuitBreaker": "closed",
      "rateLimitRemaining": 45
    },
    {
      "service": "usgs",
      "status": "unhealthy",
      "circuitBreaker": "open",
      "rateLimitRemaining": 0,
      "lastError": "Last failure: 2026-01-23T10:25:00Z"
    }
  ],
  "summary": {
    "total": 9,
    "healthy": 7,
    "degraded": 1,
    "unhealthy": 1
  }
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

### Google Maps API

**Common Issues:**

**1. Over query limit**
```
Error: OVER_QUERY_LIMIT
Status: 429
```
- **Cause:** Exceeded daily quota (free tier: 25,000 requests/day)
- **Fix:** Upgrade to paid tier or reduce requests

**2. Invalid API key**
```
Error: REQUEST_DENIED
Message: "The provided API key is invalid"
```
- **Fix:** Enable Maps JavaScript API in Google Cloud Console

**3. Zero results**
```
Response: { results: [], status: "ZERO_RESULTS" }
```
- **Cause:** Address not found or too vague
- **Fix:** Try with lat/lng coordinates instead

**Health Check:**
```bash
# Test Geocoding API
curl "https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway&key=YOUR_KEY"

# Test Static Map API
curl "https://maps.googleapis.com/maps/api/staticmap?center=40.7128,-74.0060&zoom=18&size=600x400&key=YOUR_KEY" --output test.png
```

**Rate Limits:**
- Geocoding: 50 requests/second
- Static Maps: $7 per 1,000 images
- Cache duration: 30 days

---

### Zillow/Realtor.com (RapidAPI)

**Common Issues:**

**1. RapidAPI subscription required**
```
Error: 403 Forbidden
Message: "You are not subscribed to this API"
```
- **Fix:** Subscribe at https://rapidapi.com/ ($99/month)

**2. Property not found**
```
Response: { data: null, error: "Property not found" }
```
- **Cause:** Property not listed or address mismatch
- **Fix:** Try alternate address formats or skip market data

**3. Rate limit (RapidAPI)**
```
Error: 429 Too Many Requests
Message: "Rate limit exceeded"
```
- **Fix:** Upgrade RapidAPI tier or reduce requests

**Health Check:**
```bash
# Test Realtor.com API (via RapidAPI)
curl -X GET "https://realtor-com4.p.rapidapi.com/properties/detail?property_id=1234567" \
  -H "X-RapidAPI-Key: YOUR_KEY" \
  -H "X-RapidAPI-Host: realtor-com4.p.rapidapi.com"
```

**Rate Limits:**
- Depends on RapidAPI subscription tier
- Typical: 100-1000 requests/month
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

### Supabase (Database)

**Common Issues:**

**1. Connection pool exhausted**
```
Error: remaining connection slots reserved for non-replication superuser
```
- **Cause:** Too many concurrent connections
- **Fix:** Use connection pooling, close idle connections

**2. Rate limit (free tier)**
```
Error: Rate limit exceeded
```
- **Cause:** Free tier limit: 100 requests/second
- **Fix:** Upgrade to paid tier or optimize queries

**3. Row-level security (RLS) blocking query**
```
Error: new row violates row-level security policy
```
- **Cause:** RLS policy preventing insert/update
- **Fix:** Use service role key for admin operations

**Health Check:**
```bash
# Test Supabase connection
curl "https://your-project.supabase.co/rest/v1/counties?limit=1" \
  -H "apikey: YOUR_ANON_KEY"
```

---

## Using Health Check Endpoints

### Basic Health Check

**Endpoint:** `GET /api/health`

**Usage:**
```bash
curl https://your-app.com/api/health
```

**Response:**
```json
{
  "overall": "healthy",
  "timestamp": "2026-01-23T10:30:00Z",
  "services": [
    {
      "service": "fema",
      "status": "healthy",
      "circuitBreaker": "closed",
      "rateLimitRemaining": 45
    },
    {
      "service": "census",
      "status": "degraded",
      "circuitBreaker": "half-open",
      "rateLimitRemaining": 12,
      "lastError": "Last failure: 2026-01-23T10:25:00Z"
    }
  ],
  "summary": {
    "total": 9,
    "healthy": 8,
    "degraded": 1,
    "unhealthy": 0
  }
}
```

**Status Codes:**
- `200 OK` - System healthy or degraded
- `503 Service Unavailable` - System unhealthy (4+ APIs down)

---

### Deep Health Check

**Endpoint:** `GET /api/health?deep=true`

**Usage:**
```bash
curl "https://your-app.com/api/health?deep=true"
```

**What It Does:**
Makes actual API calls to external services (uses test coordinates: NYC)

**Response:**
```json
{
  "overall": "healthy",
  "services": [
    {
      "service": "fema",
      "status": "healthy",
      "responseTimeMs": 847
    },
    {
      "service": "usgs",
      "status": "healthy",
      "responseTimeMs": 1203
    },
    {
      "service": "census",
      "status": "degraded",
      "responseTimeMs": 8542,
      "error": "Timeout warning"
    }
  ]
}
```

**When to Use:**
- Before processing large batches
- After deploying changes
- When investigating performance issues

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
   → GET /api/health

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
   → GET /api/health

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
   → GET /api/health

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
curl -s https://your-app.com/api/health | jq '.overall, .summary'

# Check for unhealthy services
echo "\n=== Unhealthy Services ==="
curl -s https://your-app.com/api/health | jq '.services[] | select(.status == "unhealthy")'

# Check rate limits
echo "\n=== Rate Limits ==="
curl -s https://your-app.com/api/health | jq '.services[] | {service: .service, remaining: .rateLimitRemaining}'

# Deep health check (once per day)
echo "\n=== Deep Health Check ==="
curl -s "https://your-app.com/api/health?deep=true" | jq '.overall, .services[].responseTimeMs'
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
2. **System health endpoint** (`/api/health`)
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
