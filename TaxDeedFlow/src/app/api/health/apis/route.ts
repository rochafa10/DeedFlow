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
import { checkAllServicesHealth, getHealthStatusCode } from '@/lib/api/health';
import {
  getFEMAService,
  getCensusService,
  getUSGSService,
  getNASAFIRMSService,
  getEPAService,
  getFBICrimeService,
  getBLSService,
  getFCCService,
  getNOAAService,
  getElevationService,
  getClimateService,
  getMapboxService,
  getGeoapifyService,
  getZillowService,
  getRealtyService,
  getOpenAIService,
  getOSMService,
} from '@/lib/api/services';
import type { BaseApiService } from '@/lib/api/base-service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const serviceFilter = searchParams.get('service');

  // Create service map using singleton instances
  const allServices: Record<string, BaseApiService> = {
    fema: getFEMAService(),
    census: getCensusService(),
    usgs: getUSGSService(),
    nasa: getNASAFIRMSService(),
    epa: getEPAService(),
    fbi: getFBICrimeService(),
    bls: getBLSService(),
    fcc: getFCCService(),
    noaa: getNOAAService(),
    elevation: getElevationService(),
    climate: getClimateService(),
    mapbox: getMapboxService(),
    geoapify: getGeoapifyService(),
    zillow: getZillowService(),
    realty: getRealtyService(),
    openai: getOpenAIService(),
    osm: getOSMService(),
  };

  // Filter to specific service if requested
  let services = allServices;
  if (serviceFilter) {
    const serviceName = serviceFilter.toLowerCase();
    if (!allServices[serviceName]) {
      return NextResponse.json(
        { error: `Unknown service: ${serviceFilter}` },
        { status: 400 }
      );
    }
    services = { [serviceName]: allServices[serviceName] };
  }

  // Perform centralized health check
  const health = await checkAllServicesHealth(services);

  // Determine appropriate HTTP status code
  const statusCode = getHealthStatusCode(health);

  return NextResponse.json(health, { status: statusCode });
}
