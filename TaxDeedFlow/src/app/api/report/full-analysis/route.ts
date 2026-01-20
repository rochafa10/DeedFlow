/**
 * Full Property Analysis API Endpoint
 *
 * Generates a comprehensive property analysis report using all analysis engines:
 * - Risk Aggregation (FEMA, USGS, EPA, NASA FIRMS, NOAA, Elevation)
 * - Financial Analysis (costs, revenue, comparables via Realty API)
 * - Investment Scoring (125-point system across 5 categories)
 *
 * POST /api/report/full-analysis
 * Body: {
 *   propertyId?: string,    // UUID from properties table
 *   address?: string,       // Full property address for lookup
 *   coordinates?: { lat: number, lng: number },
 *   options?: {
 *     rehabScope?: 'cosmetic' | 'light' | 'moderate' | 'heavy' | 'gut',
 *     holdingMonths?: number,
 *     purchasePrice?: number,
 *     skipRiskAnalysis?: boolean,
 *     skipFinancialAnalysis?: boolean,
 *     skipScoring?: boolean,
 *     includeLocationData?: boolean
 *   }
 * }
 *
 * Response: UnifiedReportResult with complete PropertyReportData
 *
 * @module app/api/report/full-analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateFullReport,
  type UnifiedReportInput,
  type UnifiedReportOptions,
} from '@/lib/api/services/unified-report-orchestrator';

/**
 * Request body type
 */
interface FullAnalysisRequest {
  propertyId?: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  options?: UnifiedReportOptions;
}

/**
 * Validate request body
 */
function validateRequest(body: unknown): { valid: boolean; error?: string; data?: FullAnalysisRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const req = body as FullAnalysisRequest;

  // Must have at least one identifier
  if (!req.propertyId && !req.address && !req.coordinates) {
    return {
      valid: false,
      error: 'Must provide at least one of: propertyId, address, or coordinates',
    };
  }

  // Validate propertyId format (UUID)
  if (req.propertyId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.propertyId)) {
    return { valid: false, error: 'propertyId must be a valid UUID' };
  }

  // Validate coordinates if provided
  if (req.coordinates) {
    const { lat, lng } = req.coordinates;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return { valid: false, error: 'coordinates.lat and coordinates.lng must be numbers' };
    }
    if (lat < -90 || lat > 90) {
      return { valid: false, error: 'coordinates.lat must be between -90 and 90' };
    }
    if (lng < -180 || lng > 180) {
      return { valid: false, error: 'coordinates.lng must be between -180 and 180' };
    }
  }

  // Validate options if provided
  if (req.options) {
    const { rehabScope, holdingMonths, purchasePrice } = req.options;

    if (rehabScope && !['cosmetic', 'light', 'moderate', 'heavy', 'gut'].includes(rehabScope)) {
      return {
        valid: false,
        error: 'options.rehabScope must be one of: cosmetic, light, moderate, heavy, gut',
      };
    }

    if (holdingMonths !== undefined && (typeof holdingMonths !== 'number' || holdingMonths < 1 || holdingMonths > 60)) {
      return { valid: false, error: 'options.holdingMonths must be a number between 1 and 60' };
    }

    if (purchasePrice !== undefined && (typeof purchasePrice !== 'number' || purchasePrice < 0)) {
      return { valid: false, error: 'options.purchasePrice must be a non-negative number' };
    }
  }

  return { valid: true, data: req };
}

/**
 * POST /api/report/full-analysis
 *
 * Generate a complete property analysis report
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { propertyId, address, coordinates, options } = validation.data;

    // Build input for orchestrator
    const input: UnifiedReportInput = {};
    if (propertyId) input.propertyId = propertyId;
    if (address) input.address = address;
    if (coordinates) input.coordinates = coordinates;

    // Generate the full report
    const result = await generateFullReport(input, options || {});

    // Return appropriate response based on success
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 422 });
    }
  } catch (error) {
    console.error('[Full Analysis API] Unhandled error:', error);

    return NextResponse.json(
      {
        success: false,
        reportId: '',
        error: error instanceof Error ? error.message : 'Internal server error',
        metadata: {
          generatedAt: new Date().toISOString(),
          durationMs: 0,
          sources: [],
          sourcesUsed: [],
          sourcesFailed: [],
          confidenceLevel: 0,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/report/full-analysis
 *
 * Returns API documentation
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    name: 'Full Property Analysis API',
    version: '2.0.0',
    description: 'Generate comprehensive property analysis reports with risk assessment, financial projections, and investment scoring.',
    endpoints: {
      'POST /api/report/full-analysis': {
        description: 'Generate a full property analysis report',
        request: {
          body: {
            propertyId: {
              type: 'string (UUID)',
              required: false,
              description: 'Property ID from Supabase properties table',
            },
            address: {
              type: 'string',
              required: false,
              description: 'Full property address for lookup',
            },
            coordinates: {
              type: '{ lat: number, lng: number }',
              required: false,
              description: 'Property coordinates',
            },
            options: {
              type: 'object',
              required: false,
              properties: {
                rehabScope: {
                  type: 'string',
                  enum: ['cosmetic', 'light', 'moderate', 'heavy', 'gut'],
                  default: 'moderate',
                },
                holdingMonths: {
                  type: 'number',
                  default: 6,
                  min: 1,
                  max: 60,
                },
                purchasePrice: {
                  type: 'number',
                  description: 'Override purchase price (defaults to total_due)',
                },
                skipRiskAnalysis: { type: 'boolean', default: false },
                skipFinancialAnalysis: { type: 'boolean', default: false },
                skipScoring: { type: 'boolean', default: false },
                includeLocationData: { type: 'boolean', default: true },
              },
            },
          },
          note: 'Must provide at least one of: propertyId, address, or coordinates',
        },
        response: {
          success: 'boolean',
          reportId: 'string',
          report: 'PropertyReportData (when success=true)',
          error: 'string (when success=false)',
          metadata: {
            generatedAt: 'ISO timestamp',
            durationMs: 'number',
            sources: 'string[]',
            sourcesUsed: 'string[]',
            sourcesFailed: 'string[]',
            confidenceLevel: 'number (0-100)',
          },
        },
      },
    },
    dataSourcesIntegrated: [
      'Supabase (property data, regrid data)',
      'Realty in US API (comparables)',
      'FEMA NFHL (flood zones)',
      'USGS (seismic hazard)',
      'NASA FIRMS (wildfire)',
      'EPA Envirofacts (environmental sites)',
      'NOAA (climate risk)',
      'Open-Elevation (slope/elevation)',
      'Geoapify (amenities)',
      'FCC (broadband)',
      'Census (demographics)',
    ],
    scoringSystem: {
      maxPoints: 125,
      categories: [
        { name: 'Location', maxPoints: 25, factors: ['demographics', 'amenities', 'walkability', 'broadband'] },
        { name: 'Risk', maxPoints: 25, factors: ['flood', 'earthquake', 'wildfire', 'environmental'] },
        { name: 'Financial', maxPoints: 25, factors: ['price-to-ARV', 'acquisition cost', 'market value'] },
        { name: 'Market', maxPoints: 25, factors: ['days on market', 'price trends', 'comparables'] },
        { name: 'Profit', maxPoints: 25, factors: ['ROI', 'profit margin', 'cap rate', 'cash flow'] },
      ],
      grades: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'],
    },
    exampleRequest: {
      propertyId: '123e4567-e89b-12d3-a456-426614174000',
      options: {
        rehabScope: 'moderate',
        holdingMonths: 6,
        includeLocationData: true,
      },
    },
  });
}
