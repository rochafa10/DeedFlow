/**
 * Crime Data API Endpoint
 *
 * Fetches crime statistics and risk level for a given state
 * using the FBI Crime Data Explorer API.
 *
 * GET /api/crime?state=PA
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFBICrimeService } from '@/lib/api/services/fbi-crime-service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const state = searchParams.get('state');

  if (!state) {
    return NextResponse.json(
      { error: 'State parameter is required (e.g., ?state=PA)' },
      { status: 400 }
    );
  }

  try {
    const fbiService = getFBICrimeService();
    const summary = await fbiService.getCrimeSummary(state);

    // Map risk level to our scoring format
    const riskLevelMap: Record<string, string> = {
      'low': 'low',
      'moderate': 'moderate',
      'high': 'high',
    };

    return NextResponse.json({
      success: true,
      data: {
        state: summary.data.state,
        stateAbbr: summary.data.stateAbbr,
        year: summary.data.latestYear,
        riskLevel: riskLevelMap[summary.data.riskLevel] || 'moderate',
        violentCrimeRate: summary.data.violentCrimeRate,
        propertyCrimeRate: summary.data.propertyCrimeRate,
        nationalComparison: summary.data.nationalComparison,
        trend: summary.data.trend,
        topOffenses: summary.data.topOffenses,
      },
      cached: summary.cached,
      source: 'FBI Crime Data Explorer',
    });
  } catch (error) {
    logger.error('[Crime API] Error fetching crime data:', error);

    // Return a fallback response with moderate risk if API fails
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch crime data',
      data: {
        state: state.toUpperCase(),
        stateAbbr: state.toUpperCase(),
        riskLevel: 'moderate', // Default to moderate if we can't fetch
        source: 'fallback',
      },
    });
  }
}
