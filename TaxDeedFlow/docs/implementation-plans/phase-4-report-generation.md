# Phase 4: Report Generation Flow

## Overview
Implement the complete report generation workflow including API routes, progress tracking, error handling, and the report generation wizard UI.

## Architecture

```
Report Generation Flow:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Select     │───>│  Collect    │───>│  Generate   │───>│   View      │
│  Property   │    │  Data       │    │  Report     │    │   Report    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                         │
                         ▼
                   ┌─────────────┐
                   │  External   │
                   │  API Calls  │
                   └─────────────┘
```

## Zod Validation Schemas

```typescript
// src/lib/validations/report.ts
import { z } from 'zod';

// Generate report request schema
export const generateReportSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID format'),
});

// List reports query schema
export const listReportsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['generating', 'complete', 'failed']).optional(),
  sortBy: z.enum(['created_at', 'total_score', 'grade']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Report ID param schema
export const reportIdSchema = z.object({
  id: z.string().uuid('Invalid report ID format'),
});

// Property search schema
export const propertySearchSchema = z.object({
  search: z.string().max(255).optional(),
  countyId: z.string().uuid().optional(),
  validation: z.enum(['APPROVED', 'CAUTION', 'REJECT']).optional(),
  minTaxDue: z.coerce.number().nonnegative().optional(),
  maxTaxDue: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  error: z.ZodError;
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// Format Zod errors for API response
export function formatZodError(error: z.ZodError): {
  message: string;
  errors: Array<{ field: string; message: string }>;
} {
  return {
    message: 'Validation failed',
    errors: error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  };
}
```

## Rate Limiting with Redis

```typescript
// src/lib/rate-limit.ts
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis client (use Upstash for serverless)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create different rate limiters for different endpoints
export const rateLimiters = {
  // Report generation: 10 per minute per user
  generateReport: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'ratelimit:report:generate',
    analytics: true,
  }),

  // Report fetching: 100 per minute per user
  fetchReport: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'ratelimit:report:fetch',
    analytics: true,
  }),

  // Property search: 50 per minute per user
  propertySearch: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 m'),
    prefix: 'ratelimit:property:search',
    analytics: true,
  }),
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<RateLimitResult> {
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export function getRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  return headers;
}
```

## CSRF Protection

```typescript
// src/lib/csrf.ts
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';

const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_COOKIE = 'csrf-token';

// Generate a CSRF token
export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

// Validate CSRF token for mutations
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  const headerToken = request.headers.get(CSRF_HEADER);
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;

  if (!headerToken || !cookieToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(headerToken, cookieToken);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Middleware helper to check CSRF for mutations
export async function requireCSRF(request: NextRequest): Promise<Response | null> {
  const method = request.method.toUpperCase();
  const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (mutationMethods.includes(method)) {
    const isValid = await validateCSRFToken(request);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid CSRF token' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  return null;
}
```

## Background Job Queue

```typescript
// src/lib/jobs/report-queue.ts
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Job status type
export type JobStatus = 'queued' | 'processing' | 'complete' | 'failed';

// Job step type
export type ReportGenerationStep =
  | 'queued'
  | 'fetching_property'
  | 'fetching_flood_data'
  | 'fetching_earthquake_data'
  | 'fetching_wildfire_data'
  | 'fetching_demographics'
  | 'fetching_comparables'
  | 'calculating_scores'
  | 'generating_report'
  | 'complete'
  | 'failed';

// Job data structure
export interface ReportJob {
  id: string;
  reportId: string;
  propertyId: string;
  userId: string;
  status: JobStatus;
  currentStep: ReportGenerationStep;
  progress: number; // 0-100
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  createdAt: string;
}

// Step configuration with progress percentages
const STEP_PROGRESS: Record<ReportGenerationStep, number> = {
  queued: 0,
  fetching_property: 5,
  fetching_flood_data: 15,
  fetching_earthquake_data: 25,
  fetching_wildfire_data: 35,
  fetching_demographics: 50,
  fetching_comparables: 65,
  calculating_scores: 80,
  generating_report: 90,
  complete: 100,
  failed: -1,
};

// Create a new job
export async function createReportJob(
  reportId: string,
  propertyId: string,
  userId: string
): Promise<ReportJob> {
  const job: ReportJob = {
    id: uuidv4(),
    reportId,
    propertyId,
    userId,
    status: 'queued',
    currentStep: 'queued',
    progress: 0,
    startedAt: null,
    completedAt: null,
    error: null,
    createdAt: new Date().toISOString(),
  };

  // Store job data
  await redis.set(`job:${job.id}`, JSON.stringify(job), { ex: 3600 }); // 1 hour TTL

  // Add to processing queue
  await redis.lpush('report-jobs:pending', job.id);

  return job;
}

// Get job by ID
export async function getReportJob(jobId: string): Promise<ReportJob | null> {
  const data = await redis.get<string>(`job:${jobId}`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

// Get job by report ID
export async function getJobByReportId(reportId: string): Promise<ReportJob | null> {
  const jobId = await redis.get<string>(`report:${reportId}:job`);
  if (!jobId) return null;
  return getReportJob(jobId);
}

// Update job progress
export async function updateJobProgress(
  jobId: string,
  step: ReportGenerationStep,
  error?: string
): Promise<void> {
  const job = await getReportJob(jobId);
  if (!job) return;

  const isComplete = step === 'complete';
  const isFailed = step === 'failed';

  const updatedJob: ReportJob = {
    ...job,
    currentStep: step,
    progress: STEP_PROGRESS[step],
    status: isFailed ? 'failed' : isComplete ? 'complete' : 'processing',
    startedAt: job.startedAt || new Date().toISOString(),
    completedAt: isComplete || isFailed ? new Date().toISOString() : null,
    error: error || null,
  };

  await redis.set(`job:${jobId}`, JSON.stringify(updatedJob), { ex: 3600 });

  // Also update the report-to-job mapping
  await redis.set(`report:${job.reportId}:job`, jobId, { ex: 3600 });
}

// Process next job from queue (called by worker)
export async function processNextJob(): Promise<ReportJob | null> {
  const jobId = await redis.rpop<string>('report-jobs:pending');
  if (!jobId) return null;

  const job = await getReportJob(jobId);
  if (!job) return null;

  await updateJobProgress(jobId, 'fetching_property');
  return job;
}

// Get step label for UI
export function getStepLabel(step: ReportGenerationStep): string {
  const labels: Record<ReportGenerationStep, string> = {
    queued: 'Waiting in queue...',
    fetching_property: 'Fetching property data',
    fetching_flood_data: 'Analyzing flood risk (FEMA)',
    fetching_earthquake_data: 'Checking earthquake activity (USGS)',
    fetching_wildfire_data: 'Evaluating wildfire risk (NASA)',
    fetching_demographics: 'Gathering demographics (Census)',
    fetching_comparables: 'Finding comparable sales',
    calculating_scores: 'Calculating investment scores',
    generating_report: 'Generating final report',
    complete: 'Report complete!',
    failed: 'Generation failed',
  };
  return labels[step];
}
```

## API Routes

### Generate Report API
```typescript
// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateReportSchema,
  listReportsQuerySchema,
  validateRequest,
  formatZodError
} from '@/lib/validations/report';
import { rateLimiters, checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { requireCSRF } from '@/lib/csrf';
import { createReportJob } from '@/lib/jobs/report-queue';

// POST /api/reports - Generate new report
export async function POST(request: NextRequest) {
  try {
    // CSRF validation
    const csrfError = await requireCSRF(request);
    if (csrfError) return csrfError;

    const supabase = createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(rateLimiters.generateReport, user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Validate request body
    const body = await request.json().catch(() => ({}));
    const validation = validateRequest(generateReportSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        formatZodError(validation.error),
        { status: 400 }
      );
    }

    const { propertyId } = validation.data;

    // Check if property exists and user has access
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*, counties(*), regrid_data(*)')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Check for existing generating report (prevent duplicates)
    const { data: existingReport } = await supabase
      .from('property_reports')
      .select('id, status')
      .eq('property_id', propertyId)
      .eq('user_id', user.id)
      .eq('status', 'generating')
      .single();

    if (existingReport) {
      return NextResponse.json({
        reportId: existingReport.id,
        status: 'generating',
        message: 'Report generation already in progress'
      });
    }

    // Create report record with 'generating' status
    const { data: report, error: createError } = await supabase
      .from('property_reports')
      .insert({
        property_id: propertyId,
        user_id: user.id,
        status: 'generating',
        report_data: {}
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create report:', createError);
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      );
    }

    // Create background job
    const job = await createReportJob(report.id, propertyId, user.id);

    // Trigger the background worker (via webhook or queue processor)
    // In production, this would be handled by a separate worker process
    triggerReportGeneration(job.id).catch(console.error);

    return NextResponse.json(
      {
        reportId: report.id,
        jobId: job.id,
        status: 'generating',
        message: 'Report generation started'
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    );

  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/reports - List user's reports
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(rateLimiters.fetchReport, user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = validateRequest(listReportsQuerySchema, queryParams);

    if (!validation.success) {
      return NextResponse.json(
        formatZodError(validation.error),
        { status: 400 }
      );
    }

    const { page, limit, status, sortBy, sortOrder } = validation.data;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('property_reports')
      .select(`
        id,
        total_score,
        grade,
        status,
        confidence_level,
        generated_at,
        created_at,
        properties (
          id,
          parcel_id,
          property_address,
          counties (county_name, state_code)
        )
      `, { count: 'exact' })
      .eq('user_id', user.id);

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: reports, error, count } = await query;

    if (error) {
      console.error('Failed to fetch reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        reports,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil((count || 0) / limit)
        }
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    );

  } catch (error) {
    console.error('Fetch reports error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper to trigger background generation
async function triggerReportGeneration(jobId: string): Promise<void> {
  // In production, send to a background worker via:
  // 1. Webhook to serverless function
  // 2. Message queue (SQS, RabbitMQ)
  // 3. n8n workflow trigger

  const webhookUrl = process.env.REPORT_WORKER_WEBHOOK;
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    });
  }
}
```

### Single Report API
```typescript
// src/app/api/reports/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reportIdSchema, validateRequest, formatZodError } from '@/lib/validations/report';
import { rateLimiters, checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { requireCSRF } from '@/lib/csrf';

// GET /api/reports/[id] - Get single report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate params
    const validation = validateRequest(reportIdSchema, { id });
    if (!validation.success) {
      return NextResponse.json(
        formatZodError(validation.error),
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(rateLimiters.fetchReport, user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const { data: report, error } = await supabase
      .from('property_reports')
      .select(`
        *,
        properties (
          *,
          counties (*),
          regrid_data (*)
        ),
        comparable_sales (*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(report, { headers: getRateLimitHeaders(rateLimitResult) });

  } catch (error) {
    console.error('Fetch report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/[id] - Delete report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF validation
    const csrfError = await requireCSRF(request);
    if (csrfError) return csrfError;

    const { id } = await params;

    // Validate params
    const validation = validateRequest(reportIdSchema, { id });
    if (!validation.success) {
      return NextResponse.json(
        formatZodError(validation.error),
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('property_reports')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete report:', error);
      return NextResponse.json(
        { error: 'Failed to delete report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Report Status API with Real Progress
```typescript
// src/app/api/reports/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reportIdSchema, validateRequest, formatZodError } from '@/lib/validations/report';
import { getJobByReportId, getStepLabel, type ReportGenerationStep } from '@/lib/jobs/report-queue';

// GET /api/reports/[id]/status - Check report generation status with real progress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate params
    const validation = validateRequest(reportIdSchema, { id });
    if (!validation.success) {
      return NextResponse.json(
        formatZodError(validation.error),
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get report from database
    const { data: report, error } = await supabase
      .from('property_reports')
      .select('id, status, error_message, generated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Get real-time job progress from Redis
    const job = await getJobByReportId(id);

    // Build response with actual progress data
    const response: {
      id: string;
      status: string;
      error_message: string | null;
      generated_at: string | null;
      progress: number;
      currentStep: ReportGenerationStep;
      stepLabel: string;
    } = {
      id: report.id,
      status: report.status,
      error_message: report.error_message,
      generated_at: report.generated_at,
      progress: job?.progress ?? (report.status === 'complete' ? 100 : 0),
      currentStep: job?.currentStep ?? (report.status === 'complete' ? 'complete' : 'queued'),
      stepLabel: getStepLabel(job?.currentStep ?? (report.status === 'complete' ? 'complete' : 'queued')),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Check status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Background Report Generator

```typescript
// src/lib/analysis/report-generator.ts
import { createClient } from '@supabase/supabase-js';
import { updateJobProgress, type ReportGenerationStep } from '@/lib/jobs/report-queue';
import {
  getFEMAService,
  getUSGSService,
  getNASAFIRMSService,
  getCensusService,
  getOpenElevationService,
  getRealtorService,
  getGoogleMapsService
} from '@/lib/api-services';
import { calculateTotalScore } from './scoring';
import { analyzeRisks } from './risk';
import { analyzeFinancials } from './financial';

interface Property {
  id: string;
  property_address: string;
  parcel_id: string;
  total_due: number;
  regrid_data?: {
    latitude: number;
    longitude: number;
    lot_size_acres: number;
    building_sqft: number;
    year_built: number;
    assessed_value: number;
    market_value: number;
    zoning: string;
    property_type: string;
  };
  counties: {
    county_name: string;
    state_code: string;
  };
}

interface GenerationContext {
  jobId: string;
  reportId: string;
  property: Property;
  userId: string;
}

// Main generation function with real progress tracking
export async function generateReportWithProgress(context: GenerationContext): Promise<void> {
  const { jobId, reportId, property, userId } = context;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Step 1: Validate property data
    await updateJobProgress(jobId, 'fetching_property');

    const latitude = property.regrid_data?.latitude;
    const longitude = property.regrid_data?.longitude;

    if (!latitude || !longitude) {
      throw new Error('Property coordinates not available');
    }

    // Step 2: Fetch flood data
    await updateJobProgress(jobId, 'fetching_flood_data');
    const floodData = await safeApiCall(
      () => getFEMAService().getFloodZone(latitude, longitude),
      getDefaultFloodData()
    );

    // Step 3: Fetch earthquake data
    await updateJobProgress(jobId, 'fetching_earthquake_data');
    const earthquakeData = await safeApiCall(
      () => getUSGSService().getEarthquakeRisk(latitude, longitude),
      getDefaultEarthquakeData()
    );

    // Step 4: Fetch wildfire data
    await updateJobProgress(jobId, 'fetching_wildfire_data');
    const wildfireData = await safeApiCall(
      () => getNASAFIRMSService().getWildfireRisk(latitude, longitude),
      getDefaultWildfireData()
    );

    // Step 5: Fetch demographics
    await updateJobProgress(jobId, 'fetching_demographics');
    const [elevationData, demographicsData, locationContext] = await Promise.all([
      safeApiCall(
        () => getOpenElevationService().getElevation(latitude, longitude),
        getDefaultElevationData()
      ),
      safeApiCall(
        () => getCensusService().getDemographics(latitude, longitude),
        getDefaultDemographicsData()
      ),
      safeApiCall(
        () => getGoogleMapsService().getLocationContext(latitude, longitude),
        getDefaultLocationData()
      ),
    ]);

    // Step 6: Fetch comparables and market data
    await updateJobProgress(jobId, 'fetching_comparables');
    const [marketData, comparables] = await Promise.all([
      safeApiCall(
        () => getRealtorService().getMarketData(property.counties.state_code),
        getDefaultMarketData()
      ),
      safeApiCall(
        () => getRealtorService().getComparables(latitude, longitude, 2, 10),
        []
      ),
    ]);

    // Step 7: Calculate scores
    await updateJobProgress(jobId, 'calculating_scores');

    const riskAnalysis = analyzeRisks({
      flood: floodData,
      earthquake: earthquakeData,
      wildfire: wildfireData,
      elevation: elevationData,
      hurricaneZone: getHurricaneZone(property.counties.state_code, latitude)
    });

    const financialAnalysis = analyzeFinancials({
      taxDue: property.total_due,
      assessedValue: property.regrid_data?.assessed_value || 0,
      marketValue: property.regrid_data?.market_value || 0,
      buildingSqft: property.regrid_data?.building_sqft || 0,
      lotAcres: property.regrid_data?.lot_size_acres || 0,
      comparables,
      marketData,
      yearBuilt: property.regrid_data?.year_built
    });

    const scores = calculateTotalScore({
      location: locationContext,
      demographics: demographicsData,
      riskAnalysis,
      financialAnalysis,
      marketData,
      property
    });

    // Step 8: Generate final report
    await updateJobProgress(jobId, 'generating_report');

    const reportData = buildReportData({
      property,
      scores,
      flood: floodData,
      earthquake: earthquakeData,
      wildfire: wildfireData,
      elevation: elevationData,
      demographics: demographicsData,
      location: locationContext,
      market: marketData,
      comps: comparables,
      riskAnalysis,
      financialAnalysis
    });

    // Calculate confidence based on successful API calls
    const confidenceLevel = calculateConfidence({
      floodData,
      earthquakeData,
      wildfireData,
      elevationData,
      demographicsData,
      locationContext,
      marketData,
      comparables
    });

    // Save completed report
    await supabase
      .from('property_reports')
      .update({
        total_score: scores.total,
        grade: scores.grade,
        location_score: scores.location,
        risk_score: scores.risk,
        financial_score: scores.financial,
        market_score: scores.market,
        profit_score: scores.profit,
        report_data: reportData,
        confidence_level: confidenceLevel,
        status: 'complete',
        generated_at: new Date().toISOString()
      })
      .eq('id', reportId);

    // Save comparables if any
    if (comparables.length > 0) {
      await supabase
        .from('comparable_sales')
        .insert(comparables.map(comp => ({
          report_id: reportId,
          address: comp.address,
          sale_price: comp.price,
          sale_date: comp.soldDate,
          sqft: comp.sqft,
          price_per_sqft: comp.pricePerSqft,
          distance_miles: comp.distance,
          similarity_score: calculateSimilarity(property, comp),
          source: 'realtor'
        })));
    }

    // Mark job complete
    await updateJobProgress(jobId, 'complete');

  } catch (error) {
    console.error('Report generation failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update report status
    await supabase
      .from('property_reports')
      .update({
        status: 'failed',
        error_message: errorMessage
      })
      .eq('id', reportId);

    // Mark job failed
    await updateJobProgress(jobId, 'failed', errorMessage);
  }
}

// Safe API call wrapper with fallback
async function safeApiCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn('API call failed, using fallback:', error);
    return fallback;
  }
}

// Calculate confidence based on successful data fetches
function calculateConfidence(data: Record<string, any>): number {
  const checks = [
    data.floodData !== null,
    data.earthquakeData !== null,
    data.wildfireData !== null,
    data.elevationData !== null,
    data.demographicsData !== null,
    data.locationContext !== null,
    data.marketData !== null,
    Array.isArray(data.comparables) && data.comparables.length > 0,
  ];

  const successful = checks.filter(Boolean).length;
  return Math.round((successful / checks.length) * 100);
}

// Default data functions
function getDefaultFloodData() {
  return { zone: 'X', risk: 'MINIMAL', panel: null };
}

function getDefaultEarthquakeData() {
  return { risk: 'LOW', recentEvents: [] };
}

function getDefaultWildfireData() {
  return { risk: 'LOW', recentFires: 0 };
}

function getDefaultElevationData() {
  return { elevation: null, slope: null };
}

function getDefaultDemographicsData() {
  return { population: null, income: null, growth: null };
}

function getDefaultLocationData() {
  return { nearbyPlaces: [], walkScore: null };
}

function getDefaultMarketData() {
  return { medianPrice: null, priceGrowth: null, inventory: null };
}

function getHurricaneZone(state: string, lat: number): string | null {
  const hurricaneStates = ['FL', 'TX', 'LA', 'NC', 'SC', 'GA', 'AL', 'MS'];
  if (hurricaneStates.includes(state)) {
    return lat < 30 ? 'HIGH' : 'MODERATE';
  }
  return null;
}

function calculateSimilarity(property: Property, comp: any): number {
  let score = 100;

  const propSqft = property.regrid_data?.building_sqft || 0;
  const compSqft = comp.sqft || 0;

  if (propSqft && compSqft) {
    const sqftDiff = Math.abs(propSqft - compSqft) / propSqft;
    score -= Math.min(sqftDiff * 50, 30);
  }

  if (comp.distance > 1) {
    score -= Math.min(comp.distance * 5, 20);
  }

  return Math.max(score, 0);
}

function buildReportData(data: any): any {
  return {
    executiveSummary: buildExecutiveSummary(data),
    propertyStrengths: identifyStrengths(data),
    propertyConcerns: identifyConcerns(data),
    propertyData: buildPropertyData(data.property),
    locationContext: data.location,
    slopeAnalysis: buildSlopeAnalysis(data.elevation),
    insuranceRisk: buildInsuranceRisk(data),
    financialAnalysis: data.financialAnalysis,
    comparables: data.comps,
    scoreBreakdown: buildScoreBreakdown(data.scores),
    demographics: data.demographics,
    femaFloodData: data.flood,
    zoningInfo: buildZoningInfo(data.property),
    marketAnalysis: buildMarketAnalysis(data.market),
    disclaimer: buildDisclaimer()
  };
}

// Helper functions (implement based on your business logic)
function buildExecutiveSummary(data: any): string {
  return `Property analysis for ${data.property.property_address}`;
}

function identifyStrengths(data: any): string[] {
  const strengths: string[] = [];
  if (data.scores.total >= 80) strengths.push('High overall investment score');
  if (data.flood?.risk === 'MINIMAL') strengths.push('Minimal flood risk');
  return strengths;
}

function identifyConcerns(data: any): string[] {
  const concerns: string[] = [];
  if (data.flood?.risk === 'HIGH') concerns.push('High flood risk area');
  if (data.wildfire?.risk === 'HIGH') concerns.push('Elevated wildfire risk');
  return concerns;
}

function buildPropertyData(property: Property): any {
  return {
    address: property.property_address,
    parcelId: property.parcel_id,
    taxDue: property.total_due,
    ...property.regrid_data
  };
}

function buildSlopeAnalysis(elevation: any): any {
  return { elevation: elevation?.elevation, slope: elevation?.slope };
}

function buildInsuranceRisk(data: any): any {
  return {
    floodInsurance: data.flood?.risk !== 'MINIMAL',
    earthquakeInsurance: data.earthquake?.risk !== 'LOW',
    wildfireInsurance: data.wildfire?.risk !== 'LOW'
  };
}

function buildScoreBreakdown(scores: any): any {
  return scores;
}

function buildZoningInfo(property: Property): any {
  return { zoning: property.regrid_data?.zoning };
}

function buildMarketAnalysis(market: any): any {
  return market;
}

function buildDisclaimer(): string {
  return 'This report is for informational purposes only and should not be considered financial advice.';
}
```

## Report Generation UI

### Generate Report Page
```tsx
// src/app/reports/generate/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertySelector } from '@/components/reports/PropertySelector';
import { GenerationProgress } from '@/components/reports/GenerationProgress';
import { useGenerateReport, useReportStatus } from '@/hooks/use-reports';
import { FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function GenerateReportPage() {
  const router = useRouter();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);

  // Start report generation
  const generateMutation = useGenerateReport({
    onSuccess: (data) => {
      setGeneratingReportId(data.reportId);
    },
  });

  // Poll for report status with real progress
  const { data: status, isLoading: statusLoading } = useReportStatus(generatingReportId);

  // Redirect when complete
  useEffect(() => {
    if (status?.status === 'complete' && generatingReportId) {
      const timer = setTimeout(() => {
        router.push(`/reports/${generatingReportId}`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status?.status, generatingReportId, router]);

  if (generatingReportId) {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status?.status === 'complete' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : status?.status === 'failed' ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
              Generating Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GenerationProgress
              status={status?.status || 'generating'}
              progress={status?.progress || 0}
              currentStep={status?.currentStep || 'queued'}
              stepLabel={status?.stepLabel || 'Starting...'}
            />

            {status?.status === 'failed' && (
              <div className="mt-4 p-4 bg-red-50 text-red-800 rounded-lg dark:bg-red-900/20 dark:text-red-200">
                <p className="font-medium">Generation Failed</p>
                <p className="text-sm mt-1">{status.error_message || 'An unknown error occurred'}</p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setGeneratingReportId(null);
                    if (selectedPropertyId) {
                      generateMutation.mutate(selectedPropertyId);
                    }
                  }}
                >
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Generate Property Report</h1>
        <p className="text-muted-foreground mt-2">
          Select a property to generate a comprehensive investment analysis report.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Property</CardTitle>
        </CardHeader>
        <CardContent>
          <PropertySelector
            selectedId={selectedPropertyId}
            onSelect={setSelectedPropertyId}
          />

          <div className="mt-6 flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedPropertyId && generateMutation.mutate(selectedPropertyId)}
              disabled={!selectedPropertyId || generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>

          {generateMutation.isError && (
            <div className="mt-4 p-4 bg-red-50 text-red-800 rounded-lg dark:bg-red-900/20 dark:text-red-200">
              <p className="text-sm">
                {generateMutation.error instanceof Error
                  ? generateMutation.error.message
                  : 'Failed to start report generation'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 p-4 bg-muted rounded-lg text-sm">
        <h3 className="font-medium mb-2">What's Included:</h3>
        <ul className="grid grid-cols-2 gap-2 text-muted-foreground">
          <li>+ 125-point investment scoring</li>
          <li>+ Risk analysis (flood, fire, quake)</li>
          <li>+ Financial projections & ROI</li>
          <li>+ Comparable sales analysis</li>
          <li>+ Neighborhood demographics</li>
          <li>+ Market trend analysis</li>
          <li>+ Insurance cost estimates</li>
          <li>+ Shareable report link</li>
        </ul>
      </div>
    </div>
  );
}
```

### Generation Progress Component with Real Steps
```tsx
// src/components/reports/GenerationProgress.tsx
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { type ReportGenerationStep } from '@/lib/jobs/report-queue';

interface GenerationProgressProps {
  status: 'generating' | 'complete' | 'failed';
  progress: number;
  currentStep: ReportGenerationStep;
  stepLabel: string;
}

const ORDERED_STEPS: { id: ReportGenerationStep; label: string }[] = [
  { id: 'fetching_property', label: 'Fetching property data' },
  { id: 'fetching_flood_data', label: 'Analyzing flood risk (FEMA)' },
  { id: 'fetching_earthquake_data', label: 'Checking earthquake activity (USGS)' },
  { id: 'fetching_wildfire_data', label: 'Evaluating wildfire risk (NASA)' },
  { id: 'fetching_demographics', label: 'Gathering demographics (Census)' },
  { id: 'fetching_comparables', label: 'Finding comparable sales' },
  { id: 'calculating_scores', label: 'Calculating investment scores' },
  { id: 'generating_report', label: 'Generating report' },
];

const STEP_ORDER: Record<ReportGenerationStep, number> = {
  queued: 0,
  fetching_property: 1,
  fetching_flood_data: 2,
  fetching_earthquake_data: 3,
  fetching_wildfire_data: 4,
  fetching_demographics: 5,
  fetching_comparables: 6,
  calculating_scores: 7,
  generating_report: 8,
  complete: 9,
  failed: -1,
};

export function GenerationProgress({
  status,
  progress,
  currentStep,
  stepLabel
}: GenerationProgressProps) {
  const currentStepOrder = STEP_ORDER[currentStep];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{stepLabel}</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="space-y-3">
        {ORDERED_STEPS.map((step, index) => {
          const stepOrder = STEP_ORDER[step.id];
          const isComplete = status === 'complete' || stepOrder < currentStepOrder;
          const isCurrent = step.id === currentStep && status === 'generating';
          const isFailed = status === 'failed' && step.id === currentStep;

          return (
            <div key={step.id} className="flex items-center gap-3">
              {isComplete ? (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
              ) : isFailed ? (
                <Circle className="h-5 w-5 text-red-500 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <span
                className={
                  isComplete ? 'text-foreground' :
                  isCurrent ? 'text-foreground font-medium' :
                  isFailed ? 'text-red-500' :
                  'text-muted-foreground'
                }
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        {status === 'generating' && 'This typically takes 30-60 seconds...'}
        {status === 'complete' && 'Report ready! Redirecting...'}
        {status === 'failed' && 'An error occurred during generation.'}
      </p>
    </div>
  );
}
```

### Property Selector Component with Search and Filters
```tsx
// src/components/reports/PropertySelector.tsx
'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MapPin, Filter, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface PropertySelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface Filters {
  countyId: string | null;
  minTaxDue: string;
  maxTaxDue: string;
}

export function PropertySelector({ selectedId, onSelect }: PropertySelectorProps) {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    countyId: null,
    minTaxDue: '',
    maxTaxDue: '',
  });

  const debouncedSearch = useDebounce(search, 300);

  // Fetch counties for filter dropdown
  const { data: counties } = useQuery({
    queryKey: ['counties-list'],
    queryFn: async () => {
      const response = await fetch('/api/counties?limit=100');
      if (!response.ok) throw new Error('Failed to fetch counties');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      limit: '20',
      validation: 'APPROVED',
    });

    if (debouncedSearch) params.set('search', debouncedSearch);
    if (filters.countyId) params.set('countyId', filters.countyId);
    if (filters.minTaxDue) params.set('minTaxDue', filters.minTaxDue);
    if (filters.maxTaxDue) params.set('maxTaxDue', filters.maxTaxDue);

    return params.toString();
  }, [debouncedSearch, filters]);

  // Fetch properties
  const { data: properties, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['properties-for-report', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/properties?${queryParams}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch properties');
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const hasActiveFilters = filters.countyId || filters.minTaxDue || filters.maxTaxDue;

  const clearFilters = () => {
    setFilters({ countyId: null, minTaxDue: '', maxTaxDue: '' });
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address or parcel ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters || hasActiveFilters ? 'secondary' : 'outline'}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filters</h4>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* County Filter */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">County</label>
              <Select
                value={filters.countyId || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, countyId: value === 'all' ? null : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Counties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Counties</SelectItem>
                  {counties?.data?.map((county: any) => (
                    <SelectItem key={county.id} value={county.id}>
                      {county.county_name}, {county.state_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min Tax Due */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Min Tax Due</label>
              <Input
                type="number"
                placeholder="$0"
                value={filters.minTaxDue}
                onChange={(e) => setFilters({ ...filters, minTaxDue: e.target.value })}
              />
            </div>

            {/* Max Tax Due */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Max Tax Due</label>
              <Input
                type="number"
                placeholder="No limit"
                value={filters.maxTaxDue}
                onChange={(e) => setFilters({ ...filters, maxTaxDue: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && !showFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.countyId && (
            <Badge variant="secondary" className="gap-1">
              County
              <button onClick={() => setFilters({ ...filters, countyId: null })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.minTaxDue && (
            <Badge variant="secondary" className="gap-1">
              Min: ${filters.minTaxDue}
              <button onClick={() => setFilters({ ...filters, minTaxDue: '' })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.maxTaxDue && (
            <Badge variant="secondary" className="gap-1">
              Max: ${filters.maxTaxDue}
              <button onClick={() => setFilters({ ...filters, maxTaxDue: '' })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Property List */}
      <ScrollArea className="h-[400px] border rounded-lg">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <p className="text-destructive mb-2">
              {error instanceof Error ? error.message : 'Failed to load properties'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : properties?.data?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No approved properties found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <RadioGroup value={selectedId || ''} onValueChange={onSelect}>
            <div className="divide-y">
              {properties?.data?.map((property: any) => (
                <label
                  key={property.id}
                  className="flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <RadioGroupItem
                    value={property.id}
                    id={property.id}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {property.property_address || 'Address Unknown'}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {property.parcel_id} | {property.counties?.county_name}, {property.counties?.state_code}
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="outline">
                        ${property.total_due?.toLocaleString() || '0'}
                      </Badge>
                      {property.regrid_data?.building_sqft && (
                        <Badge variant="outline">
                          {property.regrid_data.building_sqft.toLocaleString()} sqft
                        </Badge>
                      )}
                      {property.regrid_data?.lot_size_acres && (
                        <Badge variant="outline">
                          {property.regrid_data.lot_size_acres.toFixed(2)} acres
                        </Badge>
                      )}
                      <Badge variant="default" className="bg-green-500">
                        Validated
                      </Badge>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </RadioGroup>
        )}
      </ScrollArea>

      {/* Results count */}
      {properties?.pagination && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {properties.data?.length || 0} of {properties.pagination.total} properties
        </div>
      )}
    </div>
  );
}
```

## Reports Listing Page

```tsx
// src/app/reports/page.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GradeDisplay } from '@/components/reports/shared/GradeDisplay';
import { useReports } from '@/hooks/use-reports';
import { Plus, FileText, ExternalLink } from 'lucide-react';

export default function ReportsPage() {
  const { data, isLoading, isError, error, refetch } = useReports();

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Property Reports</h1>
          <p className="text-muted-foreground">Your generated investment analysis reports</p>
        </div>
        <Link href="/reports/generate">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive mb-4">
              {error instanceof Error ? error.message : 'Failed to load reports'}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : data?.reports?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first property analysis report to get started.
            </p>
            <Link href="/reports/generate">
              <Button>Generate Report</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.reports?.map((report: any) => (
            <Link key={report.id} href={`/reports/${report.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {report.properties?.property_address || 'Address Unknown'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {report.properties?.counties?.county_name}, {report.properties?.counties?.state_code}
                      </p>
                    </div>
                    {report.status === 'complete' && (
                      <GradeDisplay
                        grade={report.grade}
                        score={report.total_score}
                        size="sm"
                      />
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Badge
                      variant={
                        report.status === 'complete' ? 'default' :
                        report.status === 'failed' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {report.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {report.confidence_level && report.status === 'complete' && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Confidence: {report.confidence_level}%
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

## TanStack Query Hooks with Proper Error Handling

```typescript
// src/hooks/use-reports.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Error type for API responses
interface APIError {
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

// Fetch helper with error handling
async function fetchWithError<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error: APIError = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }));
    throw new Error(error.message);
  }

  return response.json();
}

// Get CSRF token from cookie
function getCSRFToken(): string | null {
  const match = document.cookie.match(/csrf-token=([^;]+)/);
  return match ? match[1] : null;
}

// List reports hook
export function useReports(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['reports', page, limit],
    queryFn: () => fetchWithError<any>(`/api/reports?page=${page}&limit=${limit}`),
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
}

// Single report hook
export function useReport(id: string | null) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => fetchWithError<any>(`/api/reports/${id}`),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });
}

// Report status hook with proper refetchInterval typing
export function useReportStatus(id: string | null) {
  return useQuery({
    queryKey: ['report-status', id],
    queryFn: () => fetchWithError<{
      id: string;
      status: 'generating' | 'complete' | 'failed';
      error_message: string | null;
      generated_at: string | null;
      progress: number;
      currentStep: string;
      stepLabel: string;
    }>(`/api/reports/${id}/status`),
    enabled: !!id,
    // Fixed: refetchInterval callback signature
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'complete' || status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
    retry: false, // Don't retry on status checks
  });
}

// Generate report mutation
export function useGenerateReport(options?: {
  onSuccess?: (data: { reportId: string; jobId: string }) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      const csrfToken = getCSRFToken();
      return fetchWithError<{ reportId: string; jobId: string; status: string }>('/api/reports', {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        body: JSON.stringify({ propertyId }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error('Failed to start report generation', {
        description: error.message,
      });
      options?.onError?.(error);
    },
  });
}

// Delete report mutation
export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const csrfToken = getCSRFToken();
      return fetchWithError<{ success: boolean }>(`/api/reports/${reportId}`, {
        method: 'DELETE',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete report', {
        description: error.message,
      });
    },
  });
}

// Properties for report generation hook
export function usePropertiesForReport(search: string, filters: {
  countyId?: string;
  minTaxDue?: number;
  maxTaxDue?: number;
}) {
  const params = new URLSearchParams({
    limit: '20',
    validation: 'APPROVED',
  });

  if (search) params.set('search', search);
  if (filters.countyId) params.set('countyId', filters.countyId);
  if (filters.minTaxDue !== undefined) params.set('minTaxDue', String(filters.minTaxDue));
  if (filters.maxTaxDue !== undefined) params.set('maxTaxDue', String(filters.maxTaxDue));

  return useQuery({
    queryKey: ['properties-for-report', search, filters],
    queryFn: () => fetchWithError<any>(`/api/properties?${params}`),
    staleTime: 30 * 1000,
    retry: 2,
  });
}
```

## Debounce Hook

```typescript
// src/hooks/use-debounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

## Environment Variables

```env
# .env.local
# Rate limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Background worker webhook (optional)
REPORT_WORKER_WEBHOOK=https://your-worker.com/webhook
```

## Verification Steps

1. Test Zod validation with invalid inputs
2. Verify rate limiting headers in responses
3. Test CSRF protection on mutations
4. Verify real progress tracking updates correctly
5. Test property selector search and filters
6. Verify error states display properly
7. Test report generation end-to-end
8. Verify reports list pagination
9. Test report deletion with CSRF token
10. Check rate limit behavior when exceeded

## Next Phase

After completing Phase 4, proceed to [Phase 5: Sharing & PDF Export](./phase-5-sharing-export.md)
