/**
 * Report Generation API Endpoint
 *
 * Generates a comprehensive property analysis report by fetching
 * data from multiple external APIs and combining them.
 *
 * POST /api/report/generate
 * Body: { address: string, parcelId?: string, state?: string, coordinates?: { lat, lng } }
 *
 * @module app/api/report/generate
 */

import { NextRequest, NextResponse } from 'next/server';

// Service imports
import { getGeoapifyService } from '@/lib/api/services/geoapify-service';
import { getFCCService } from '@/lib/api/services/fcc-service';
import { getElevationService } from '@/lib/api/services/elevation-service';
import { getClimateService } from '@/lib/api/services/climate-service';
import { getNOAAService } from '@/lib/api/services/noaa-service';
import { getUSGSService } from '@/lib/api/services/usgs-service';
import { getNASAFIRMSService } from '@/lib/api/services/nasa-firms-service';
import { getEPAService } from '@/lib/api/services/epa-service';
import { getOpenAIService } from '@/lib/api/services/openai-service';
import { getCensusService } from '@/lib/api/services/census-service';

interface ReportRequest {
  address: string;
  parcelId?: string;
  state?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface DataSource {
  name: string;
  status: 'ok' | 'error' | 'skipped';
  latency?: number;
  error?: string;
  data?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ReportRequest = await request.json();

    if (!body.address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    // Use provided coordinates or default test coordinates for Altoona, PA
    const coordinates = body.coordinates || { lat: 40.5186, lng: -78.3947 };
    const state = body.state || 'PA';

    const sources: DataSource[] = [];
    const reportData: Record<string, unknown> = {
      property: {
        address: body.address,
        parcelId: body.parcelId,
        coordinates,
        state,
      },
    };

    // Parallel API calls to working services
    const apiCalls = [
      // Elevation & terrain data (includes slope analysis)
      fetchWithTracking('elevation', async () => {
        const service = getElevationService();
        return await service.getElevationAnalysis(coordinates.lat, coordinates.lng, true);
      }),

      // Climate data
      fetchWithTracking('climate', async () => {
        const service = getClimateService();
        return await service.getClimateSummary(coordinates.lat, coordinates.lng);
      }),

      // NOAA weather alerts
      fetchWithTracking('noaa', async () => {
        const service = getNOAAService();
        return await service.getActiveAlerts(coordinates.lat, coordinates.lng);
      }),

      // USGS seismic hazard
      fetchWithTracking('usgs', async () => {
        const service = getUSGSService();
        return await service.getSeismicHazard(coordinates.lat, coordinates.lng);
      }),

      // NASA FIRMS fire data
      fetchWithTracking('nasa_firms', async () => {
        const service = getNASAFIRMSService();
        return await service.getActiveFiresNearby(coordinates.lat, coordinates.lng, 50);
      }),

      // EPA environmental sites
      fetchWithTracking('epa', async () => {
        const service = getEPAService();
        return await service.getEnvironmentalSitesNearby(coordinates.lat, coordinates.lng, 5);
      }),

      // Geoapify amenities
      fetchWithTracking('geoapify', async () => {
        const service = getGeoapifyService();
        return await service.getAmenitiesSummary(coordinates.lat, coordinates.lng);
      }),

      // FCC broadband
      fetchWithTracking('fcc', async () => {
        const service = getFCCService();
        return await service.getBroadbandAvailability(coordinates.lat, coordinates.lng);
      }),

      // Census geographic and demographics data
      fetchWithTracking('census', async () => {
        const service = getCensusService({ apiKey: process.env.CENSUS_API_KEY });
        // First get geographic data (FIPS codes)
        const geoData = await service.getGeographicData(coordinates.lat, coordinates.lng);
        // Then get demographics using the FIPS code
        if (geoData.data?.fips) {
          const demoData = await service.getDemographics(geoData.data.fips);
          return {
            data: {
              geographic: geoData.data,
              demographics: demoData.data,
            },
          };
        }
        return { data: { geographic: geoData.data, demographics: null } };
      }),
    ];

    // Execute all API calls in parallel
    const results = await Promise.allSettled(apiCalls);

    // Process results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { name, data, latency } = result.value;
        sources.push({ name, status: 'ok', latency, data });

        // Extract data from ApiResponse wrapper (services return { data: ... })
        const responseData = (data as { data?: unknown })?.data;

        // Map data to report sections
        switch (name) {
          case 'elevation':
            reportData.elevation = responseData;
            break;
          case 'climate':
            reportData.climate = responseData;
            break;
          case 'noaa':
            reportData.weatherAlerts = responseData;
            break;
          case 'usgs':
            reportData.seismicHazard = responseData;
            break;
          case 'nasa_firms':
            reportData.wildfireData = responseData;
            break;
          case 'epa':
            reportData.environmentalSites = responseData;
            break;
          case 'geoapify':
            reportData.amenities = responseData;
            break;
          case 'fcc':
            reportData.broadband = responseData;
            break;
          case 'census':
            reportData.census = responseData;
            break;
        }
      } else {
        const name = ['elevation', 'climate', 'noaa', 'usgs', 'nasa_firms', 'epa', 'geoapify', 'fcc', 'census'][index];
        sources.push({
          name,
          status: 'error',
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    // Generate AI summary if OpenAI is available
    try {
      const openai = getOpenAIService();
      const start = Date.now();
      const aiResult = await openai.createChatCompletion([
        {
          role: 'system',
          content: 'You are a real estate investment analyst. Provide a brief 2-3 sentence executive summary of the property investment potential based on the data provided.',
        },
        {
          role: 'user',
          content: `Analyze this property at ${body.address}:
            - Elevation: ${JSON.stringify(reportData.elevation)}
            - Seismic Risk: ${JSON.stringify(reportData.seismicHazard)}
            - Environmental Sites: ${JSON.stringify(reportData.environmentalSites)}
            - Weather Alerts: ${JSON.stringify(reportData.weatherAlerts)}
            - Broadband: ${JSON.stringify(reportData.broadband)}

            Provide a brief investment summary.`,
        },
      ], { maxTokens: 200 });

      reportData.aiSummary = aiResult.data.content;
      sources.push({ name: 'openai', status: 'ok', latency: Date.now() - start });
    } catch (error) {
      sources.push({
        name: 'openai',
        status: 'error',
        error: error instanceof Error ? error.message : 'OpenAI unavailable',
      });
    }

    // Calculate overall data quality
    const okCount = sources.filter(s => s.status === 'ok').length;
    const totalCount = sources.length;
    const dataQuality = okCount === totalCount ? 'complete' : okCount > totalCount / 2 ? 'partial' : 'minimal';

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dataQuality,
      sources,
      data: reportData,
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// Helper function to track API call timing
async function fetchWithTracking(
  name: string,
  fetchFn: () => Promise<unknown>
): Promise<{ name: string; data: unknown; latency: number }> {
  const start = Date.now();
  const data = await fetchFn();
  return { name, data, latency: Date.now() - start };
}
