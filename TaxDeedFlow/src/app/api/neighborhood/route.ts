/**
 * Neighborhood Analysis API Endpoint
 *
 * Fetches neighborhood analysis data for a given property
 * including crime, demographics, landlocked status, school ratings, and amenities.
 *
 * GET /api/neighborhood?propertyId=<uuid>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const propertyId = searchParams.get('propertyId');

  if (!propertyId) {
    return NextResponse.json(
      { error: 'propertyId parameter is required (e.g., ?propertyId=<uuid>)' },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Fetch neighborhood analysis data for the property
    const { data: analysis, error: analysisError } = await supabase
      .from('neighborhood_analysis')
      .select('*')
      .eq('property_id', propertyId)
      .single();

    if (analysisError) {
      if (analysisError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Neighborhood analysis not found for this property' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Database error', message: analysisError.message },
        { status: 500 }
      );
    }

    // Transform to frontend-friendly format
    return NextResponse.json({
      success: true,
      data: {
        propertyId: analysis.property_id,
        crime: {
          riskLevel: analysis.crime_risk_level,
          violentCrimeRate: analysis.violent_crime_rate,
          propertyCrimeRate: analysis.property_crime_rate,
          trend: analysis.crime_trend,
          source: analysis.crime_data_source,
        },
        demographics: {
          medianIncome: analysis.median_income,
          population: analysis.population,
          medianAge: analysis.median_age,
          educationLevel: analysis.education_level,
          unemploymentRate: analysis.unemployment_rate,
          source: analysis.demographics_source,
        },
        access: {
          isLandlocked: analysis.is_landlocked,
          roadAccess: analysis.road_access_type,
          accessNotes: analysis.access_notes,
        },
        schools: {
          elementarySchool: analysis.elementary_school_name,
          elementaryRating: analysis.elementary_school_rating,
          middleSchool: analysis.middle_school_name,
          middleRating: analysis.middle_school_rating,
          highSchool: analysis.high_school_name,
          highRating: analysis.high_school_rating,
          districtRating: analysis.district_rating,
          source: analysis.school_data_source,
        },
        amenities: {
          nearbyAmenities: analysis.nearby_amenities || [],
          groceryStoreDistance: analysis.grocery_store_distance,
          hospitalDistance: analysis.hospital_distance,
          shoppingDistance: analysis.shopping_distance,
          publicTransportAccess: analysis.public_transport_access,
        },
        analysisDate: analysis.analysis_date,
        dataQuality: {
          completenessScore: analysis.data_completeness_score,
          lastUpdated: analysis.updated_at,
        },
      },
      cached: true,
      source: 'database',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch neighborhood analysis',
      data: null,
    }, { status: 500 });
  }
}
