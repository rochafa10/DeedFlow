/**
 * Zoning Rules API Route
 *
 * Fetches zoning regulations by state, county, and zoning code.
 * Falls back to state-wide defaults when county-specific rules don't exist.
 *
 * @route GET /api/zoning
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mark as dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Zoning rules response type
 */
interface ZoningRulesResponse {
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

/**
 * GET /api/zoning
 *
 * Query params:
 * - code: Zoning code (required, e.g., 'R-1', 'C-2')
 * - state: State code (required, e.g., 'PA')
 * - county: County name (optional, e.g., 'Blair')
 *
 * Returns zoning rules with fallback to state defaults.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const zoningCode = searchParams.get('code');
    const stateCode = searchParams.get('state');
    const countyName = searchParams.get('county');

    // Validate required params
    if (!zoningCode) {
      return NextResponse.json(
        { error: 'Zoning code is required (use ?code=R-1)' },
        { status: 400 }
      );
    }

    if (!stateCode) {
      return NextResponse.json(
        { error: 'State code is required (use ?state=PA)' },
        { status: 400 }
      );
    }

    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Zoning API] Supabase not configured, returning defaults');
      return NextResponse.json({
        success: true,
        data: getIntelligentDefaults(zoningCode, stateCode),
        meta: {
          source: 'intelligent_defaults',
          dataSourceType: 'sample',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to get zoning rules using the database function
    const { data, error } = await supabase.rpc('get_zoning_rules', {
      p_state_code: stateCode.toUpperCase(),
      p_county_name: countyName || null,
      p_zoning_code: zoningCode.toUpperCase(),
    });

    if (error) {
      console.error('[Zoning API] Database error:', error);
      // Fall back to intelligent defaults
      return NextResponse.json({
        success: true,
        data: getIntelligentDefaults(zoningCode, stateCode),
        meta: {
          source: 'intelligent_defaults',
          dataSourceType: 'sample',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if we got data from the database
    if (data && data.length > 0) {
      const rule = data[0];
      return NextResponse.json({
        success: true,
        data: {
          zoning_code: rule.zoning_code,
          zoning_name: rule.zoning_name,
          zoning_category: rule.zoning_category,
          permitted_uses: rule.permitted_uses || [],
          conditional_uses: rule.conditional_uses || [],
          prohibited_uses: rule.prohibited_uses || [],
          min_lot_size_sqft: rule.min_lot_size_sqft,
          front_setback_ft: rule.front_setback_ft,
          side_setback_ft: rule.side_setback_ft,
          rear_setback_ft: rule.rear_setback_ft,
          max_height_ft: rule.max_height_ft,
          max_stories: rule.max_stories,
          source_url: rule.source_url,
          is_default: rule.is_default,
          notes: rule.notes,
        } as ZoningRulesResponse,
        meta: {
          source: rule.is_default ? 'state_default' : 'county_specific',
          dataSourceType: rule.is_default ? 'partial' : 'live',
          county: countyName || null,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // No data found, return intelligent defaults
    return NextResponse.json({
      success: true,
      data: getIntelligentDefaults(zoningCode, stateCode),
      meta: {
        source: 'intelligent_defaults',
        dataSourceType: 'sample',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Zoning API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Generate intelligent default zoning rules based on code pattern
 */
function getIntelligentDefaults(zoningCode: string, stateCode: string): ZoningRulesResponse {
  const code = zoningCode.toUpperCase();

  // Determine category and defaults based on zoning code prefix
  let category: string;
  let name: string;
  let permittedUses: string[];
  let minLotSize: number;
  let frontSetback: number;
  let sideSetback: number;
  let rearSetback: number;
  let maxHeight: number;
  let maxStories: number;

  if (code.startsWith('R-1') || code.startsWith('RS') || code.startsWith('SFR')) {
    // Single Family Residential (Low Density)
    category = 'residential';
    name = 'Single Family Residential';
    permittedUses = ['Single-family dwelling', 'Home occupation', 'Accessory structures'];
    minLotSize = 10000;
    frontSetback = 30;
    sideSetback = 10;
    rearSetback = 30;
    maxHeight = 35;
    maxStories = 2;
  } else if (code.startsWith('R-2') || code.startsWith('RM') || code.startsWith('MFR')) {
    // Multi-Family Residential
    category = 'residential';
    name = 'Medium Density Residential';
    permittedUses = ['Single-family dwelling', 'Two-family dwelling', 'Home occupation'];
    minLotSize = 7500;
    frontSetback = 25;
    sideSetback = 8;
    rearSetback = 25;
    maxHeight = 35;
    maxStories = 2;
  } else if (code.startsWith('R-3') || code.startsWith('R-4') || code.startsWith('RH')) {
    // High Density Residential
    category = 'residential';
    name = 'High Density Residential';
    permittedUses = ['Multi-family dwelling', 'Apartments', 'Townhouses'];
    minLotSize = 5000;
    frontSetback = 20;
    sideSetback = 6;
    rearSetback = 20;
    maxHeight = 45;
    maxStories = 3;
  } else if (code.startsWith('C-1') || code.startsWith('NC') || code.startsWith('CN')) {
    // Neighborhood Commercial
    category = 'commercial';
    name = 'Neighborhood Commercial';
    permittedUses = ['Retail stores', 'Professional offices', 'Personal services'];
    minLotSize = 5000;
    frontSetback = 15;
    sideSetback = 10;
    rearSetback = 20;
    maxHeight = 35;
    maxStories = 2;
  } else if (code.startsWith('C-2') || code.startsWith('C-3') || code.startsWith('GC') || code.startsWith('CG')) {
    // General Commercial
    category = 'commercial';
    name = 'General Commercial';
    permittedUses = ['Retail', 'Offices', 'Restaurants', 'Services'];
    minLotSize = 10000;
    frontSetback = 20;
    sideSetback = 15;
    rearSetback = 25;
    maxHeight = 45;
    maxStories = 3;
  } else if (code.startsWith('I-1') || code.startsWith('LI') || code.startsWith('M-1')) {
    // Light Industrial
    category = 'industrial';
    name = 'Light Industrial';
    permittedUses = ['Light manufacturing', 'Warehousing', 'Distribution'];
    minLotSize = 20000;
    frontSetback = 30;
    sideSetback = 20;
    rearSetback = 30;
    maxHeight = 50;
    maxStories = 3;
  } else if (code.startsWith('I-2') || code.startsWith('HI') || code.startsWith('M-2')) {
    // Heavy Industrial
    category = 'industrial';
    name = 'Heavy Industrial';
    permittedUses = ['Manufacturing', 'Processing', 'Heavy equipment'];
    minLotSize = 40000;
    frontSetback = 40;
    sideSetback = 25;
    rearSetback = 40;
    maxHeight = 60;
    maxStories = 4;
  } else if (code.startsWith('A') || code.startsWith('AG')) {
    // Agricultural
    category = 'agricultural';
    name = 'Agricultural';
    permittedUses = ['Farming', 'Single-family dwelling', 'Agricultural buildings'];
    minLotSize = 43560; // 1 acre
    frontSetback = 50;
    sideSetback = 25;
    rearSetback = 50;
    maxHeight = 35;
    maxStories = 2;
  } else if (code.startsWith('MX') || code.startsWith('MU')) {
    // Mixed Use
    category = 'mixed';
    name = 'Mixed Use';
    permittedUses = ['Residential', 'Retail', 'Office', 'Services'];
    minLotSize = 5000;
    frontSetback = 10;
    sideSetback = 5;
    rearSetback = 15;
    maxHeight = 50;
    maxStories = 4;
  } else {
    // Generic residential default
    category = 'residential';
    name = 'Residential';
    permittedUses = ['Single-family dwelling', 'Home occupation'];
    minLotSize = 7500;
    frontSetback = 25;
    sideSetback = 10;
    rearSetback = 25;
    maxHeight = 35;
    maxStories = 2;
  }

  return {
    zoning_code: zoningCode,
    zoning_name: name,
    zoning_category: category,
    permitted_uses: permittedUses,
    conditional_uses: [],
    prohibited_uses: [],
    min_lot_size_sqft: minLotSize,
    front_setback_ft: frontSetback,
    side_setback_ft: sideSetback,
    rear_setback_ft: rearSetback,
    max_height_ft: maxHeight,
    max_stories: maxStories,
    source_url: null,
    is_default: true,
    notes: `Intelligent defaults for ${stateCode} ${zoningCode}. Verify with local municipality for accurate regulations.`,
  };
}
