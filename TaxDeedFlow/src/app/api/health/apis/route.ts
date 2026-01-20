/**
 * API Health Check Endpoint
 *
 * Tests connectivity to all external API services used by the report system.
 *
 * GET /api/health/apis - Test all APIs
 * GET /api/health/apis?service=bls - Test specific service
 *
 * @module app/api/health/apis
 */

import { NextRequest, NextResponse } from 'next/server';

// Test coordinates (Altoona, PA - Blair County)
const TEST_COORDS = { latitude: 40.5186, longitude: -78.3947 };
const TEST_ADDRESS = '1234 Main St, Altoona, PA 16601';
const TEST_STATE = 'PA';
const TEST_STATE_FIPS = '42';
const TEST_COUNTY_FIPS = '013';

interface ServiceResult {
  service: string;
  status: 'ok' | 'error' | 'skipped';
  latency?: number;
  error?: string;
  data?: unknown;
}

async function testFEMA(): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const { FEMAService } = await import('@/lib/api/services/fema-service');
    const fema = new FEMAService();
    const result = await fema.getFloodZone(TEST_COORDS.latitude, TEST_COORDS.longitude);
    return {
      service: 'FEMA Flood',
      status: 'ok',
      latency: Date.now() - start,
      data: { zone: result?.data?.floodZone || 'No data' }
    };
  } catch (error) {
    return {
      service: 'FEMA Flood',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testCensus(): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const { CensusService } = await import('@/lib/api/services/census-service');
    const census = new CensusService();
    const result = await census.getDemographics(`${TEST_STATE_FIPS}${TEST_COUNTY_FIPS}`);
    return {
      service: 'Census',
      status: 'ok',
      latency: Date.now() - start,
      data: { population: result.data?.population, medianIncome: result.data?.medianHouseholdIncome }
    };
  } catch (error) {
    return {
      service: 'Census',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testUSGS(): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const { USGSService } = await import('@/lib/api/services/usgs-service');
    const usgs = new USGSService();
    const result = await usgs.getSeismicHazard(TEST_COORDS.latitude, TEST_COORDS.longitude);
    return {
      service: 'USGS Seismic',
      status: 'ok',
      latency: Date.now() - start,
      data: result
    };
  } catch (error) {
    return {
      service: 'USGS Seismic',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testNASA(): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const { NASAFIRMSService } = await import('@/lib/api/services/nasa-firms-service');
    const nasa = new NASAFIRMSService();
    const result = await nasa.getActiveFiresNearby(TEST_COORDS.latitude, TEST_COORDS.longitude, 50);
    return {
      service: 'NASA FIRMS',
      status: 'ok',
      latency: Date.now() - start,
      data: { fireCount: result.data?.count || 0 }
    };
  } catch (error) {
    return {
      service: 'NASA FIRMS',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testEPA(): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const { EPAService } = await import('@/lib/api/services/epa-service');
    const epa = new EPAService();
    const result = await epa.getEnvironmentalSitesNearby(TEST_COORDS.latitude, TEST_COORDS.longitude, 5);
    return {
      service: 'EPA',
      status: 'ok',
      latency: Date.now() - start,
      data: { siteCount: result.data?.counts?.total || 0 }
    };
  } catch (error) {
    return {
      service: 'EPA',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testFBI(): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const { FBICrimeService } = await import('@/lib/api/services/fbi-crime-service');
    const fbi = new FBICrimeService();
    const result = await fbi.getStateCrimeData(TEST_STATE);
    return {
      service: 'FBI Crime',
      status: 'ok',
      latency: Date.now() - start,
      data: { hasData: !!result }
    };
  } catch (error) {
    return {
      service: 'FBI Crime',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testBLS(): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const { BLSService } = await import('@/lib/api/services/bls-service');
    const bls = new BLSService();
    const result = await bls.getEmploymentSummary(TEST_STATE); // Uses 'PA' not FIPS
    return {
      service: 'BLS Employment',
      status: 'ok',
      latency: Date.now() - start,
      data: {
        unemploymentRate: result.data.unemploymentRate,
        nationalRate: result.data.nationalUnemploymentRate,
        trend: result.data.trend,
        economicHealth: result.data.economicHealth
      }
    };
  } catch (error) {
    return {
      service: 'BLS Employment',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testFCC(): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const { FCCService } = await import('@/lib/api/services/fcc-service');
    const fcc = new FCCService();
    const result = await fcc.getBroadbandAvailability(TEST_COORDS.latitude, TEST_COORDS.longitude);
    return {
      service: 'FCC Broadband',
      status: 'ok',
      latency: Date.now() - start,
      data: result
    };
  } catch (error) {
    return {
      service: 'FCC Broadband',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testNOAA(): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const { NOAAService } = await import('@/lib/api/services/noaa-service');
    const noaa = new NOAAService();
    const result = await noaa.getActiveAlerts(TEST_COORDS.latitude, TEST_COORDS.longitude);
    return {
      service: 'NOAA Weather',
      status: 'ok',
      latency: Date.now() - start,
      data: { alertCount: result?.data?.length || 0 }
    };
  } catch (error) {
    return {
      service: 'NOAA Weather',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testElevation(): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const { ElevationService } = await import('@/lib/api/services/elevation-service');
    const elev = new ElevationService();
    const result = await elev.getElevation(TEST_COORDS.latitude, TEST_COORDS.longitude);
    return {
      service: 'Open-Elevation',
      status: 'ok',
      latency: Date.now() - start,
      data: { elevation: result }
    };
  } catch (error) {
    return {
      service: 'Open-Elevation',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testClimate(): Promise<ServiceResult> {
  const start = Date.now();
  try {
    const { ClimateService } = await import('@/lib/api/services/climate-service');
    const climate = new ClimateService();
    const result = await climate.getClimateSummary(TEST_COORDS.latitude, TEST_COORDS.longitude);
    return {
      service: 'Open-Meteo Climate',
      status: 'ok',
      latency: Date.now() - start,
      data: { avgTemp: result.data.climateProfile?.averageAnnualTemperature, humidity: result.data.current?.humidity }
    };
  } catch (error) {
    return {
      service: 'Open-Meteo Climate',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testMapbox(): Promise<ServiceResult> {
  const start = Date.now();
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return { service: 'Mapbox', status: 'skipped', error: 'No API key configured' };
  }
  try {
    const { MapboxService } = await import('@/lib/api/services/mapbox-service');
    const mapbox = new MapboxService();
    const result = await mapbox.geocode(TEST_ADDRESS);
    return {
      service: 'Mapbox',
      status: 'ok',
      latency: Date.now() - start,
      data: { found: !!result }
    };
  } catch (error) {
    return {
      service: 'Mapbox',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testGeoapify(): Promise<ServiceResult> {
  const start = Date.now();
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) {
    return { service: 'Geoapify', status: 'skipped', error: 'No API key configured' };
  }
  try {
    const { GeoapifyService } = await import('@/lib/api/services/geoapify-service');
    const geo = new GeoapifyService();
    const result = await geo.getAmenitiesSummary(TEST_COORDS.latitude, TEST_COORDS.longitude);
    return {
      service: 'Geoapify',
      status: 'ok',
      latency: Date.now() - start,
      data: { score: result.data.score }
    };
  } catch (error) {
    return {
      service: 'Geoapify',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testZillow(): Promise<ServiceResult> {
  const start = Date.now();
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    return { service: 'Zillow', status: 'skipped', error: 'No RapidAPI key configured' };
  }
  try {
    const { ZillowService } = await import('@/lib/api/services/zillow-service');
    const zillow = new ZillowService();
    const result = await zillow.searchProperties({ location: 'Altoona, PA', status_type: 'ForSale' });
    return {
      service: 'Zillow (RapidAPI)',
      status: 'ok',
      latency: Date.now() - start,
      data: { resultCount: result.data?.length || 0 }
    };
  } catch (error) {
    return {
      service: 'Zillow (RapidAPI)',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testRealty(): Promise<ServiceResult> {
  const start = Date.now();
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    return { service: 'Realty in US', status: 'skipped', error: 'No RapidAPI key configured' };
  }
  try {
    const { RealtyService } = await import('@/lib/api/services/realty-service');
    const realty = new RealtyService();
    const result = await realty.getSoldComparables({
      lat: TEST_COORDS.latitude,
      lng: TEST_COORDS.longitude,
      radius_miles: 1
    });
    return {
      service: 'Realty in US (RapidAPI)',
      status: 'ok',
      latency: Date.now() - start,
      data: { compCount: result.data?.comparables?.length || 0 }
    };
  } catch (error) {
    return {
      service: 'Realty in US (RapidAPI)',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testOpenAI(): Promise<ServiceResult> {
  const start = Date.now();
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { service: 'OpenAI', status: 'skipped', error: 'No API key configured' };
  }
  try {
    const { OpenAIService } = await import('@/lib/api/services/openai-service');
    const openai = new OpenAIService();
    // Just test with a minimal request to verify connectivity
    const result = await openai.createChatCompletion([
      { role: 'user', content: 'Reply with OK' }
    ], { maxTokens: 5 });
    return {
      service: 'OpenAI',
      status: 'ok',
      latency: Date.now() - start,
      data: { connected: true, response: result.data.content.substring(0, 50) }
    };
  } catch (error) {
    return {
      service: 'OpenAI',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testGoogleMaps(): Promise<ServiceResult> {
  const start = Date.now();
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return { service: 'Google Maps', status: 'skipped', error: 'No API key configured' };
  }
  try {
    // Test Street View Static API
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${TEST_COORDS.latitude},${TEST_COORDS.longitude}&key=${key}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      return {
        service: 'Google Maps',
        status: 'ok',
        latency: Date.now() - start,
        data: {
          streetViewAvailable: data.status === 'OK',
          panoId: data.pano_id || null
        }
      };
    } else {
      return {
        service: 'Google Maps',
        status: 'error',
        latency: Date.now() - start,
        error: data.error_message || `API returned status: ${data.status}`
      };
    }
  } catch (error) {
    return {
      service: 'Google Maps',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service');

  const results: ServiceResult[] = [];

  // Service test map
  const tests: Record<string, () => Promise<ServiceResult>> = {
    fema: testFEMA,
    census: testCensus,
    usgs: testUSGS,
    nasa: testNASA,
    epa: testEPA,
    fbi: testFBI,
    bls: testBLS,
    fcc: testFCC,
    noaa: testNOAA,
    elevation: testElevation,
    climate: testClimate,
    mapbox: testMapbox,
    geoapify: testGeoapify,
    zillow: testZillow,
    realty: testRealty,
    openai: testOpenAI,
    googlemaps: testGoogleMaps,
  };

  if (service) {
    // Test specific service
    const testFn = tests[service.toLowerCase()];
    if (!testFn) {
      return NextResponse.json({ error: `Unknown service: ${service}` }, { status: 400 });
    }
    const result = await testFn();
    return NextResponse.json(result);
  }

  // Test all services in parallel (with grouping to avoid rate limits)
  const freeApis = [
    testFEMA(),
    testCensus(),
    testUSGS(),
    testNASA(),
    testEPA(),
    testFBI(),
    testBLS(),
    testFCC(),
    testNOAA(),
    testElevation(),
    testClimate(),
  ];

  const paidApis = [
    testMapbox(),
    testGeoapify(),
    testZillow(),
    testRealty(),
    testOpenAI(),
    testGoogleMaps(),
  ];

  // Run free APIs first (no rate limit concerns)
  const freeResults = await Promise.all(freeApis);
  results.push(...freeResults);

  // Run paid APIs (may have rate limits)
  const paidResults = await Promise.all(paidApis);
  results.push(...paidResults);

  // Calculate summary
  const summary = {
    total: results.length,
    ok: results.filter(r => r.status === 'ok').length,
    error: results.filter(r => r.status === 'error').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    avgLatency: Math.round(
      results.filter(r => r.latency).reduce((sum, r) => sum + (r.latency || 0), 0) /
      results.filter(r => r.latency).length
    ),
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    testLocation: { ...TEST_COORDS, address: TEST_ADDRESS, state: TEST_STATE },
    summary,
    results,
  });
}
