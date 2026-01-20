# Phase 5: Sharing & PDF Export

## Overview
Implement secure token-based report sharing for public access with password protection, view limits, analytics tracking, and PDF export functionality using html2pdf.js.

## Enhanced Share Token System

### 1. Secure Token Generation (256-bit)

```typescript
// src/lib/sharing/generate-token.ts
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

interface ShareOptions {
  reportId: string;
  expiresInDays?: number;
  password?: string;
  viewLimit?: number;
}

interface ShareResult {
  shareToken: string;
  shareUrl: string;
  expiresAt: Date;
  viewLimit: number | null;
  isPasswordProtected: boolean;
}

/**
 * Generate a cryptographically secure 256-bit token
 * Uses crypto.randomBytes for true randomness, not UUID v4
 */
function generateSecureToken(): string {
  // 32 bytes = 256 bits of entropy
  const buffer = randomBytes(32);
  // Convert to URL-safe base64
  return buffer.toString('base64url');
}

export async function generateShareToken(
  options: ShareOptions
): Promise<ShareResult> {
  const { reportId, expiresInDays = 30, password, viewLimit } = options;
  const supabase = createClient();

  // Generate 256-bit secure token
  let shareToken = generateSecureToken();

  // Check for collision (extremely unlikely but important for security)
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from('report_shares')
      .select('id')
      .eq('share_token', shareToken)
      .single();

    if (!existing) break;

    // Token collision detected, regenerate
    console.warn(`Token collision detected, regenerating (attempt ${attempts + 1})`);
    shareToken = generateSecureToken();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique token after maximum attempts');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Hash password if provided
  let passwordHash: string | null = null;
  if (password) {
    passwordHash = await bcrypt.hash(password, 12);
  }

  // Insert share record
  const { error } = await supabase
    .from('report_shares')
    .insert({
      report_id: reportId,
      share_token: shareToken,
      expires_at: expiresAt.toISOString(),
      created_by: user?.id,
      password_hash: passwordHash,
      view_limit: viewLimit || null,
      view_count: 0,
    });

  if (error) {
    throw new Error(`Failed to create share token: ${error.message}`);
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reports/shared/${shareToken}`;

  return {
    shareToken,
    shareUrl,
    expiresAt,
    viewLimit: viewLimit || null,
    isPasswordProtected: !!password,
  };
}
```

### 2. Enhanced Token Validation with Password & View Limits

```typescript
// src/lib/sharing/validate-token.ts
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';

interface ShareValidation {
  isValid: boolean;
  isExpired: boolean;
  isPasswordProtected: boolean;
  requiresPassword: boolean;
  viewLimitReached: boolean;
  reportId?: string;
  report?: PropertyReport;
  error?: string;
}

interface ValidateOptions {
  token: string;
  password?: string;
}

export async function validateShareToken(
  options: ValidateOptions
): Promise<ShareValidation> {
  const { token, password } = options;
  const supabase = createClient();

  // Fetch share record directly first to check password
  const { data: shareRecord, error: shareError } = await supabase
    .from('report_shares')
    .select('*')
    .eq('share_token', token)
    .single();

  if (shareError || !shareRecord) {
    return {
      isValid: false,
      isExpired: false,
      isPasswordProtected: false,
      requiresPassword: false,
      viewLimitReached: false,
      error: 'Share token not found',
    };
  }

  // Check expiration
  if (new Date(shareRecord.expires_at) < new Date()) {
    return {
      isValid: false,
      isExpired: true,
      isPasswordProtected: !!shareRecord.password_hash,
      requiresPassword: false,
      viewLimitReached: false,
      error: 'This share link has expired',
    };
  }

  // Check view limit
  if (shareRecord.view_limit !== null && shareRecord.view_count >= shareRecord.view_limit) {
    return {
      isValid: false,
      isExpired: false,
      isPasswordProtected: !!shareRecord.password_hash,
      requiresPassword: false,
      viewLimitReached: true,
      error: 'This share link has reached its view limit',
    };
  }

  // Check password protection
  if (shareRecord.password_hash) {
    if (!password) {
      return {
        isValid: false,
        isExpired: false,
        isPasswordProtected: true,
        requiresPassword: true,
        viewLimitReached: false,
        error: 'Password required',
      };
    }

    const passwordValid = await bcrypt.compare(password, shareRecord.password_hash);
    if (!passwordValid) {
      return {
        isValid: false,
        isExpired: false,
        isPasswordProtected: true,
        requiresPassword: true,
        viewLimitReached: false,
        error: 'Invalid password',
      };
    }
  }

  // Get referrer for analytics
  const headersList = headers();
  const referrer = headersList.get('referer') || null;

  // Use the database function that updates view count and logs analytics
  const { data, error } = await supabase
    .rpc('get_report_by_share_token_v2', {
      p_token: token,
      p_referrer: referrer,
    });

  if (error) {
    return {
      isValid: false,
      isExpired: false,
      isPasswordProtected: !!shareRecord.password_hash,
      requiresPassword: false,
      viewLimitReached: false,
      error: error.message,
    };
  }

  if (!data || data.length === 0) {
    return {
      isValid: false,
      isExpired: false,
      isPasswordProtected: false,
      requiresPassword: false,
      viewLimitReached: false,
      error: 'Report not found',
    };
  }

  const shareData = data[0];

  return {
    isValid: true,
    isExpired: false,
    isPasswordProtected: !!shareRecord.password_hash,
    requiresPassword: false,
    viewLimitReached: false,
    reportId: shareData.report_id,
    report: {
      id: shareData.report_id,
      propertyId: shareData.property_id,
      totalScore: shareData.total_score,
      grade: shareData.grade,
      reportData: shareData.report_data,
      confidenceLevel: shareData.confidence_level,
      generatedAt: shareData.generated_at,
    },
  };
}
```

### 3. Database Migration for Enhanced Sharing

```sql
-- Migration: enhance_report_shares
-- Add password protection, view limits, and analytics

ALTER TABLE report_shares
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS view_limit INTEGER,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- Create share view analytics table
CREATE TABLE IF NOT EXISTS share_view_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES report_shares(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT, -- Hashed IP for privacy
  country_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_view_analytics_share_id ON share_view_analytics(share_id);
CREATE INDEX idx_share_view_analytics_viewed_at ON share_view_analytics(viewed_at);

-- Enhanced function to get report and track analytics
CREATE OR REPLACE FUNCTION get_report_by_share_token_v2(
  p_token TEXT,
  p_referrer TEXT DEFAULT NULL
)
RETURNS TABLE (
  report_id UUID,
  property_id UUID,
  total_score INTEGER,
  grade TEXT,
  report_data JSONB,
  confidence_level INTEGER,
  generated_at TIMESTAMPTZ,
  is_expired BOOLEAN,
  view_count INTEGER
) AS $$
DECLARE
  v_share_id UUID;
  v_current_view_count INTEGER;
  v_view_limit INTEGER;
BEGIN
  -- Get share record
  SELECT rs.id, rs.view_count, rs.view_limit
  INTO v_share_id, v_current_view_count, v_view_limit
  FROM report_shares rs
  WHERE rs.share_token = p_token;

  IF v_share_id IS NULL THEN
    RETURN;
  END IF;

  -- Check view limit before incrementing
  IF v_view_limit IS NOT NULL AND v_current_view_count >= v_view_limit THEN
    RETURN;
  END IF;

  -- Increment view count and update last viewed
  UPDATE report_shares
  SET view_count = view_count + 1,
      last_viewed_at = NOW()
  WHERE id = v_share_id;

  -- Log analytics (referrer tracking)
  INSERT INTO share_view_analytics (share_id, referrer)
  VALUES (v_share_id, p_referrer);

  -- Return report data
  RETURN QUERY
  SELECT
    pr.id as report_id,
    pr.property_id,
    pr.total_score,
    pr.grade,
    pr.report_data,
    pr.confidence_level,
    pr.generated_at,
    rs.expires_at < NOW() as is_expired,
    rs.view_count
  FROM report_shares rs
  JOIN property_reports pr ON pr.id = rs.report_id
  WHERE rs.share_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Rate Limiting for Public Share Endpoints

### 1. Rate Limiter Implementation

```typescript
// src/lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const tokenCache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  return {
    check: (key: string, limit: number): RateLimitResult => {
      const now = Date.now();
      const windowStart = now - options.interval;

      const timestamps = tokenCache.get(key) || [];
      const validTimestamps = timestamps.filter(ts => ts > windowStart);

      if (validTimestamps.length >= limit) {
        return {
          success: false,
          limit,
          remaining: 0,
          reset: Math.ceil((validTimestamps[0] + options.interval - now) / 1000),
        };
      }

      validTimestamps.push(now);
      tokenCache.set(key, validTimestamps);

      return {
        success: true,
        limit,
        remaining: limit - validTimestamps.length,
        reset: Math.ceil(options.interval / 1000),
      };
    },
  };
}

// Pre-configured rate limiters
export const shareViewLimiter = createRateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export const shareCreateLimiter = createRateLimiter({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 100,
});
```

### 2. Rate Limited Share View Middleware

```typescript
// src/middleware/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server';
import { shareViewLimiter } from '@/lib/rate-limit';

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limiter: typeof shareViewLimiter,
  limit: number = 30
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Get IP for rate limiting
    const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? 'anonymous';
    const key = `rate-limit:${ip}`;

    const result = limiter.check(key, limit);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': result.reset.toString(),
          },
        }
      );
    }

    const response = await handler(req);

    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.reset.toString());

    return response;
  };
}
```

## API Routes

### 1. Create Share Token (Enhanced)

```typescript
// src/app/api/reports/[id]/share/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateShareToken } from '@/lib/sharing/generate-token';
import { shareCreateLimiter } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limit check
    const rateLimitResult = shareCreateLimiter.check(`create:${user.id}`, 10);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many share links created. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify user owns this report
    const { data: report } = await supabase
      .from('property_reports')
      .select('id, user_id')
      .eq('id', params.id)
      .single();

    if (!report || report.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Report not found or access denied' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      expiresInDays = 30,
      password,
      viewLimit,
    } = body;

    // Validate inputs
    if (expiresInDays < 1 || expiresInDays > 365) {
      return NextResponse.json(
        { error: 'Expiration must be between 1 and 365 days' },
        { status: 400 }
      );
    }

    if (viewLimit !== undefined && (viewLimit < 1 || viewLimit > 10000)) {
      return NextResponse.json(
        { error: 'View limit must be between 1 and 10,000' },
        { status: 400 }
      );
    }

    if (password && password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters' },
        { status: 400 }
      );
    }

    const result = await generateShareToken({
      reportId: params.id,
      expiresInDays,
      password,
      viewLimit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating share token:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

// Get existing shares for a report
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: shares, error } = await supabase
      .from('report_shares')
      .select(`
        *,
        analytics:share_view_analytics(count)
      `)
      .eq('report_id', params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Add share URLs and computed fields
    const sharesWithUrls = shares?.map(share => ({
      ...share,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reports/shared/${share.share_token}`,
      isExpired: new Date(share.expires_at) < new Date(),
      isPasswordProtected: !!share.password_hash,
      viewLimitReached: share.view_limit !== null && share.view_count >= share.view_limit,
    }));

    return NextResponse.json(sharesWithUrls);
  } catch (error) {
    console.error('Error fetching shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shares' },
      { status: 500 }
    );
  }
}
```

### 2. Delete Share Token

```typescript
// src/app/api/reports/shares/[shareId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // RLS will ensure user can only delete their own shares
    const { error } = await supabase
      .from('report_shares')
      .delete()
      .eq('id', params.shareId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting share:', error);
    return NextResponse.json(
      { error: 'Failed to delete share' },
      { status: 500 }
    );
  }
}
```

### 3. Verify Share Password

```typescript
// src/app/api/reports/shared/[token]/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateShareToken } from '@/lib/sharing/validate-token';
import { shareViewLimiter } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // Rate limit password attempts
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'anonymous';
    const rateLimitResult = shareViewLimiter.check(`password:${ip}:${params.token}`, 5);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many password attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      );
    }

    const validation = await validateShareToken({
      token: params.token,
      password,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid password' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying password:', error);
    return NextResponse.json(
      { error: 'Failed to verify password' },
      { status: 500 }
    );
  }
}
```

## Dynamic OG Images for Social Sharing

### 1. OG Image Route

```typescript
// src/app/api/og/report/[token]/route.tsx
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createClient();

    // Fetch share and report data
    const { data: shareData } = await supabase
      .from('report_shares')
      .select(`
        report:property_reports(
          total_score,
          grade,
          property:properties(
            property_address,
            county:counties(county_name, state_code)
          )
        )
      `)
      .eq('share_token', params.token)
      .single();

    if (!shareData?.report) {
      // Return default image if not found
      return new ImageResponse(
        (
          <div
            style={{
              display: 'flex',
              fontSize: 60,
              color: 'black',
              background: '#f6f6f6',
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Property Report
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    const { total_score, grade, property } = shareData.report;
    const address = property?.property_address || 'Property Report';
    const location = property?.county
      ? `${property.county.county_name}, ${property.county.state_code}`
      : '';

    // Grade colors
    const gradeColors: Record<string, string> = {
      A: '#22c55e',
      B: '#84cc16',
      C: '#eab308',
      D: '#f97316',
      F: '#ef4444',
    };

    const gradeColor = gradeColors[grade] || '#6b7280';

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
            padding: '60px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
            <div
              style={{
                fontSize: '24px',
                color: 'white',
                opacity: 0.8,
              }}
            >
              Tax Deed Flow - Property Analysis Report
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Left: Property Info */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: 'white',
                  marginBottom: '16px',
                  lineHeight: 1.2,
                }}
              >
                {address}
              </div>
              {location && (
                <div
                  style={{
                    fontSize: '28px',
                    color: 'white',
                    opacity: 0.8,
                  }}
                >
                  {location}
                </div>
              )}
            </div>

            {/* Right: Score */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'white',
                borderRadius: '24px',
                padding: '40px 60px',
                marginLeft: '40px',
              }}
            >
              <div
                style={{
                  fontSize: '100px',
                  fontWeight: 'bold',
                  color: gradeColor,
                }}
              >
                {grade}
              </div>
              <div
                style={{
                  fontSize: '32px',
                  color: '#374151',
                  marginTop: '8px',
                }}
              >
                {total_score}/125 points
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '40px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ fontSize: '18px', color: 'white', opacity: 0.6 }}>
              Investment Analysis Report
            </div>
            <div style={{ fontSize: '18px', color: 'white', opacity: 0.6 }}>
              taxdeedflow.com
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
```

## Public Report Viewer

### 1. Shared Report Page with Password Protection

```typescript
// src/app/reports/shared/[token]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { validateShareToken } from '@/lib/sharing/validate-token';
import { createClient } from '@/lib/supabase/server';
import { PropertyReport } from '@/components/reports/PropertyReport';
import { SharedReportHeader } from '@/components/reports/shared/SharedReportHeader';
import { ExpiredShareMessage } from '@/components/reports/shared/ExpiredShareMessage';
import { ViewLimitReachedMessage } from '@/components/reports/shared/ViewLimitReachedMessage';
import { PasswordPrompt } from '@/components/reports/shared/PasswordPrompt';
import { cookies } from 'next/headers';

interface Props {
  params: { token: string };
  searchParams: { password?: string };
}

// Generate dynamic metadata with OG image
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();

  // Quick check without incrementing view count
  const { data: shareData } = await supabase
    .from('report_shares')
    .select(`
      expires_at,
      password_hash,
      report:property_reports(
        total_score,
        grade,
        confidence_level,
        property:properties(property_address)
      )
    `)
    .eq('share_token', params.token)
    .single();

  if (!shareData?.report) {
    return {
      title: 'Report Not Found',
    };
  }

  const { total_score, grade, property } = shareData.report;
  const address = property?.property_address || 'Property Report';

  return {
    title: `Property Analysis Report - Grade ${grade}`,
    description: `Investment analysis report with a score of ${total_score}/125. View detailed property assessment.`,
    openGraph: {
      title: `Property Analysis Report - Grade ${grade}`,
      description: `Investment score: ${total_score}/125 | Confidence: ${shareData.report.confidence_level}%`,
      type: 'article',
      images: [
        {
          url: `/api/og/report/${params.token}`,
          width: 1200,
          height: 630,
          alt: `${address} - Grade ${grade}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Property Analysis Report - Grade ${grade}`,
      description: `Investment score: ${total_score}/125`,
      images: [`/api/og/report/${params.token}`],
    },
  };
}

export default async function SharedReportPage({ params, searchParams }: Props) {
  // Check for stored password in cookie
  const cookieStore = cookies();
  const storedPassword = cookieStore.get(`share_password_${params.token}`)?.value;
  const password = searchParams.password || storedPassword;

  const validation = await validateShareToken({
    token: params.token,
    password,
  });

  // Handle different validation states
  if (!validation.isValid) {
    if (validation.isExpired) {
      return <ExpiredShareMessage />;
    }

    if (validation.viewLimitReached) {
      return <ViewLimitReachedMessage />;
    }

    if (validation.requiresPassword) {
      return <PasswordPrompt token={params.token} />;
    }

    notFound();
  }

  // Fetch full report data with property info
  const supabase = createClient();
  const { data: fullReport } = await supabase
    .from('property_reports')
    .select(`
      *,
      property:properties(
        id,
        parcel_id,
        property_address,
        county:counties(county_name, state_code)
      )
    `)
    .eq('id', validation.reportId)
    .single();

  if (!fullReport) {
    notFound();
  }

  // Fetch comparables
  const { data: comparables } = await supabase
    .from('comparable_sales')
    .select('*')
    .eq('report_id', validation.reportId)
    .order('similarity_score', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <SharedReportHeader
        propertyAddress={fullReport.property?.property_address}
        grade={fullReport.grade}
        score={fullReport.total_score}
      />

      <main className="container mx-auto px-4 py-8">
        <PropertyReport
          report={fullReport}
          property={fullReport.property}
          comparables={comparables || []}
          isSharedView={true}
        />
      </main>

      <footer className="py-8 text-center text-sm text-gray-500">
        <p>Generated by Tax Deed Flow</p>
        <p className="mt-1">
          Report generated on {new Date(fullReport.generated_at).toLocaleDateString()}
        </p>
      </footer>
    </div>
  );
}
```

### 2. Password Prompt Component

```typescript
// src/components/reports/shared/PasswordPrompt.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface PasswordPromptProps {
  token: string;
}

export function PasswordPrompt({ token }: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    try {
      const response = await fetch(`/api/reports/shared/${token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid password');
      }

      // Store password in cookie for subsequent requests
      document.cookie = `share_password_${token}=${password}; path=/; max-age=3600; samesite=strict`;

      // Reload the page with password
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Invalid password',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">
            Password Protected
          </h1>
          <p className="text-gray-600 text-center mb-6">
            This report is password protected. Enter the password to view.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!password || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'View Report'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

### 3. View Limit Reached Message

```typescript
// src/components/reports/shared/ViewLimitReachedMessage.tsx
import Link from 'next/link';
import { Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ViewLimitReachedMessage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Ban className="w-8 h-8 text-orange-500" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          View Limit Reached
        </h1>
        <p className="text-gray-600 mb-6">
          This shared report has reached its maximum number of views.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          If you need continued access to this report, please contact the person who
          shared it with you to request a new link.
        </p>
        <Link href="/">
          <Button variant="outline">Go to Homepage</Button>
        </Link>
      </div>
    </div>
  );
}
```

### 4. Shared Report Header Component

```typescript
// src/components/reports/shared/SharedReportHeader.tsx
'use client';

import { GradeDisplay } from '@/components/reports/shared/GradeDisplay';

interface SharedReportHeaderProps {
  propertyAddress?: string;
  grade: string;
  score: number;
}

export function SharedReportHeader({
  propertyAddress,
  grade,
  score,
}: SharedReportHeaderProps) {
  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Property Analysis Report</p>
            <h1 className="text-xl font-semibold text-gray-900">
              {propertyAddress || 'Property Report'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <GradeDisplay grade={grade} size="lg" />
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{score}</p>
              <p className="text-sm text-gray-500">of 125 points</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
```

### 5. Expired Share Message

```typescript
// src/components/reports/shared/ExpiredShareMessage.tsx
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ExpiredShareMessage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Link Expired
        </h1>
        <p className="text-gray-600 mb-6">
          This shared report link has expired. Share links are valid for a limited time
          after creation.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          If you need access to this report, please contact the person who
          shared it with you.
        </p>
        <Link href="/">
          <Button variant="outline">Go to Homepage</Button>
        </Link>
      </div>
    </div>
  );
}
```

## PDF Export with Progress Indicator

### 1. Install html2pdf.js

```bash
npm install html2pdf.js
npm install --save-dev @types/html2pdf.js
npm install lru-cache bcryptjs
npm install --save-dev @types/bcryptjs
```

### 2. Enhanced PDF Export Hook with Progress

```typescript
// src/hooks/usePdfExport.ts
'use client';

import { useState, useCallback, useRef } from 'react';
import html2pdf from 'html2pdf.js';

interface PdfExportOptions {
  filename?: string;
  margin?: number;
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  onProgress?: (progress: number) => void;
}

interface UsePdfExportReturn {
  exportToPdf: (elementId: string, options?: PdfExportOptions) => Promise<void>;
  isExporting: boolean;
  progress: number;
  error: string | null;
  cancel: () => void;
}

export function usePdfExport(): UsePdfExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const exportToPdf = useCallback(
    async (elementId: string, options: PdfExportOptions = {}) => {
      setIsExporting(true);
      setProgress(0);
      setError(null);
      cancelledRef.current = false;

      try {
        const element = document.getElementById(elementId);
        if (!element) {
          throw new Error(`Element with id "${elementId}" not found`);
        }

        const {
          filename = 'property-report.pdf',
          margin = 10,
          pageSize = 'a4',
          orientation = 'portrait',
          onProgress,
        } = options;

        // Stage 1: Preparing (0-20%)
        setProgress(10);
        onProgress?.(10);

        if (cancelledRef.current) {
          throw new Error('Export cancelled');
        }

        // Clone element to avoid modifying the original
        const clone = element.cloneNode(true) as HTMLElement;
        clone.style.width = '210mm'; // A4 width

        // Stage 2: Rendering (20-60%)
        setProgress(30);
        onProgress?.(30);

        const opt = {
          margin,
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true,
            onclone: (clonedDoc: Document) => {
              // Progress update during rendering
              setProgress(50);
              onProgress?.(50);
            },
          },
          jsPDF: {
            unit: 'mm',
            format: pageSize,
            orientation,
          },
          pagebreak: {
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.page-break-before',
            after: '.page-break-after',
            avoid: '.avoid-break',
          },
        };

        if (cancelledRef.current) {
          throw new Error('Export cancelled');
        }

        // Stage 3: Generating PDF (60-90%)
        setProgress(70);
        onProgress?.(70);

        await html2pdf()
          .set(opt)
          .from(element)
          .toPdf()
          .get('pdf')
          .then((pdf: any) => {
            if (cancelledRef.current) {
              throw new Error('Export cancelled');
            }
            setProgress(90);
            onProgress?.(90);
          })
          .save();

        // Stage 4: Complete (100%)
        setProgress(100);
        onProgress?.(100);
      } catch (err) {
        if (err instanceof Error && err.message === 'Export cancelled') {
          setError('Export was cancelled');
        } else {
          const message = err instanceof Error ? err.message : 'Failed to export PDF';
          setError(message);
          console.error('PDF export error:', err);
        }
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return {
    exportToPdf,
    isExporting,
    progress,
    error,
    cancel,
  };
}
```

### 3. PDF Export Button with Progress

```typescript
// src/components/reports/PdfExportButton.tsx
'use client';

import { Download, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePdfExport } from '@/hooks/usePdfExport';
import { useToast } from '@/hooks/use-toast';

interface PdfExportButtonProps {
  reportElementId: string;
  filename: string;
  propertyAddress?: string;
}

export function PdfExportButton({
  reportElementId,
  filename,
  propertyAddress,
}: PdfExportButtonProps) {
  const { exportToPdf, isExporting, progress, error, cancel } = usePdfExport();
  const { toast } = useToast();

  const handleExport = async () => {
    await exportToPdf(reportElementId, {
      filename: `${filename}.pdf`,
      margin: 10,
      pageSize: 'a4',
      orientation: 'portrait',
    });

    if (error) {
      toast({
        title: 'Export Failed',
        description: error,
        variant: 'destructive',
      });
    } else if (!error) {
      toast({
        title: 'PDF Exported',
        description: `Report saved as ${filename}.pdf`,
      });
    }
  };

  const handleCancel = () => {
    cancel();
    toast({
      title: 'Export Cancelled',
      description: 'PDF export was cancelled.',
    });
  };

  if (isExporting) {
    return (
      <div className="flex items-center gap-3 min-w-[200px]">
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Exporting...</span>
            <span className="text-gray-500">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      Download PDF
    </Button>
  );
}
```

### 4. Print-Optimized Styles

```css
/* src/styles/print.css */
@media print {
  /* Hide non-printable elements */
  .no-print,
  button,
  nav,
  header,
  footer {
    display: none !important;
  }

  /* Reset backgrounds for printing */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Page breaks */
  .page-break-before {
    page-break-before: always;
  }

  .page-break-after {
    page-break-after: always;
  }

  .avoid-break {
    page-break-inside: avoid;
  }

  /* Report sections */
  .report-section {
    page-break-inside: avoid;
    margin-bottom: 20px;
  }

  /* Charts and maps */
  .chart-container,
  .map-container {
    page-break-inside: avoid;
    max-height: 400px;
  }

  /* Tables */
  table {
    page-break-inside: avoid;
  }

  /* Ensure consistent sizing */
  body {
    font-size: 12pt;
    line-height: 1.4;
  }

  h1 {
    font-size: 18pt;
  }

  h2 {
    font-size: 14pt;
  }

  h3 {
    font-size: 12pt;
  }
}
```

## Share Analytics Dashboard

### 1. Share Analytics Dashboard Component

```typescript
// src/components/reports/ShareAnalyticsDashboard.tsx
'use client';

import { useState } from 'react';
import {
  Eye,
  Calendar,
  Link as LinkIcon,
  TrendingUp,
  Globe,
  Clock,
  BarChart3,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useShareAnalytics } from '@/hooks/queries/use-share-analytics';
import { formatDistanceToNow, format, subDays } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ShareAnalyticsDashboardProps {
  reportId: string;
}

export function ShareAnalyticsDashboard({ reportId }: ShareAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { data: analytics, isLoading } = useShareAnalytics(reportId, timeRange);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const {
    totalViews,
    uniqueViews,
    activeLinks,
    totalLinks,
    viewsByDay,
    topReferrers,
    recentViews,
  } = analytics;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Share Analytics</h2>
          <p className="text-sm text-gray-500">
            Track who's viewing your shared reports
          </p>
        </div>
        <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Eye className="w-4 h-4" />
              Total Views
            </div>
            <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              Unique Views
            </div>
            <p className="text-2xl font-bold">{uniqueViews.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <LinkIcon className="w-4 h-4" />
              Active Links
            </div>
            <p className="text-2xl font-bold">
              {activeLinks}/{totalLinks}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <BarChart3 className="w-4 h-4" />
              Avg Daily Views
            </div>
            <p className="text-2xl font-bold">
              {viewsByDay.length > 0
                ? Math.round(totalViews / viewsByDay.length)
                : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Views Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={viewsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(value) =>
                      format(new Date(value), 'MMM d, yyyy')
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Referrers</CardTitle>
          </CardHeader>
          <CardContent>
            {topReferrers.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-[120px] h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topReferrers}
                        dataKey="count"
                        nameKey="referrer"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                      >
                        {topReferrers.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {topReferrers.slice(0, 5).map((ref, index) => (
                    <div
                      key={ref.referrer}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-gray-600 truncate max-w-[150px]">
                          {ref.referrer || 'Direct'}
                        </span>
                      </div>
                      <span className="font-medium">{ref.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No referrer data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentViews.length > 0 ? (
            <div className="space-y-3">
              {recentViews.slice(0, 10).map((view, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Eye className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-gray-900">
                        {view.referrer ? `From ${new URL(view.referrer).hostname}` : 'Direct view'}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {formatDistanceToNow(new Date(view.viewed_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2. Share Analytics Hook

```typescript
// src/hooks/queries/use-share-analytics.ts
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { subDays } from 'date-fns';

interface ViewByDay {
  date: string;
  views: number;
}

interface Referrer {
  referrer: string;
  count: number;
}

interface RecentView {
  viewed_at: string;
  referrer: string | null;
}

interface ShareAnalytics {
  totalViews: number;
  uniqueViews: number;
  activeLinks: number;
  totalLinks: number;
  viewsByDay: ViewByDay[];
  topReferrers: Referrer[];
  recentViews: RecentView[];
}

export function useShareAnalytics(
  reportId: string,
  timeRange: '7d' | '30d' | '90d' = '30d'
) {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const startDate = subDays(new Date(), days).toISOString();

  return useQuery({
    queryKey: ['share-analytics', reportId, timeRange],
    queryFn: async (): Promise<ShareAnalytics> => {
      const supabase = createClient();

      // Get shares for this report
      const { data: shares } = await supabase
        .from('report_shares')
        .select('id, view_count, expires_at, created_at')
        .eq('report_id', reportId);

      if (!shares || shares.length === 0) {
        return {
          totalViews: 0,
          uniqueViews: 0,
          activeLinks: 0,
          totalLinks: 0,
          viewsByDay: [],
          topReferrers: [],
          recentViews: [],
        };
      }

      const shareIds = shares.map((s) => s.id);

      // Get view analytics
      const { data: viewData } = await supabase
        .from('share_view_analytics')
        .select('viewed_at, referrer')
        .in('share_id', shareIds)
        .gte('viewed_at', startDate)
        .order('viewed_at', { ascending: false });

      // Calculate total views
      const totalViews = shares.reduce((sum, s) => sum + s.view_count, 0);

      // Get unique views (by day for simplicity)
      const uniqueDays = new Set(
        viewData?.map((v) => v.viewed_at.split('T')[0]) || []
      );
      const uniqueViews = uniqueDays.size;

      // Active vs total links
      const now = new Date();
      const activeLinks = shares.filter(
        (s) => new Date(s.expires_at) > now
      ).length;

      // Views by day
      const viewsByDayMap = new Map<string, number>();
      viewData?.forEach((v) => {
        const day = v.viewed_at.split('T')[0];
        viewsByDayMap.set(day, (viewsByDayMap.get(day) || 0) + 1);
      });
      const viewsByDay = Array.from(viewsByDayMap.entries())
        .map(([date, views]) => ({ date, views }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top referrers
      const referrerMap = new Map<string, number>();
      viewData?.forEach((v) => {
        const ref = v.referrer || 'Direct';
        referrerMap.set(ref, (referrerMap.get(ref) || 0) + 1);
      });
      const topReferrers = Array.from(referrerMap.entries())
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recent views
      const recentViews =
        viewData?.slice(0, 20).map((v) => ({
          viewed_at: v.viewed_at,
          referrer: v.referrer,
        })) || [];

      return {
        totalViews,
        uniqueViews,
        activeLinks,
        totalLinks: shares.length,
        viewsByDay,
        topReferrers,
        recentViews,
      };
    },
    enabled: !!reportId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
```

## Share Management UI (Enhanced)

### 1. Enhanced Share Dialog Component

```typescript
// src/components/reports/ShareDialog.tsx
'use client';

import { useState } from 'react';
import {
  Copy,
  Link,
  Trash2,
  Loader2,
  Lock,
  Eye,
  Calendar,
  Settings2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateShare,
  useReportShares,
  useDeleteShare,
} from '@/hooks/queries/use-shares';
import { formatDistanceToNow, format } from 'date-fns';

interface ShareDialogProps {
  reportId: string;
  trigger?: React.ReactNode;
}

export function ShareDialog({ reportId, trigger }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [viewLimit, setViewLimit] = useState<number | undefined>();
  const [useViewLimit, setUseViewLimit] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState('30');
  const { toast } = useToast();

  const { data: shares, isLoading: loadingShares } = useReportShares(reportId);
  const createShare = useCreateShare();
  const deleteShare = useDeleteShare();

  const handleCreateShare = async () => {
    try {
      await createShare.mutateAsync({
        reportId,
        expiresInDays: parseInt(expiresInDays),
        password: usePassword ? password : undefined,
        viewLimit: useViewLimit ? viewLimit : undefined,
      });

      // Reset form
      setPassword('');
      setUsePassword(false);
      setViewLimit(undefined);
      setUseViewLimit(false);

      toast({
        title: 'Share link created',
        description: 'The link has been copied to your clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create share link.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copied',
      description: 'Share link copied to clipboard.',
    });
  };

  const handleDeleteShare = async (shareId: string) => {
    try {
      await deleteShare.mutateAsync(shareId);
      toast({
        title: 'Share link deleted',
        description: 'The share link has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete share link.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Link className="w-4 h-4" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Report</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="create" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Link</TabsTrigger>
            <TabsTrigger value="manage">
              Manage ({shares?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            {/* Expiration */}
            <div className="space-y-2">
              <Label>Link Expiration</Label>
              <Select
                value={expiresInDays}
                onValueChange={setExpiresInDays}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Password Protection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password Protection
                </Label>
                <Switch
                  id="use-password"
                  checked={usePassword}
                  onCheckedChange={setUsePassword}
                />
              </div>
              {usePassword && (
                <Input
                  type="password"
                  placeholder="Enter password (min 4 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </div>

            {/* View Limit */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-view-limit" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  View Limit
                </Label>
                <Switch
                  id="use-view-limit"
                  checked={useViewLimit}
                  onCheckedChange={setUseViewLimit}
                />
              </div>
              {useViewLimit && (
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  placeholder="Maximum number of views"
                  value={viewLimit || ''}
                  onChange={(e) => setViewLimit(parseInt(e.target.value) || undefined)}
                />
              )}
            </div>

            <Button
              onClick={handleCreateShare}
              disabled={createShare.isPending || (usePassword && password.length < 4)}
              className="w-full"
            >
              {createShare.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 mr-2" />
                  Create Share Link
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="manage" className="mt-4">
            {loadingShares ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : shares && shares.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className={`p-4 rounded-lg border ${
                      share.isExpired || share.viewLimitReached
                        ? 'bg-gray-50 opacity-60'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap gap-1">
                        {share.isPasswordProtected && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Password
                          </Badge>
                        )}
                        {share.view_limit && (
                          <Badge variant="secondary" className="text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            {share.view_count}/{share.view_limit}
                          </Badge>
                        )}
                        {share.isExpired && (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        )}
                        {share.viewLimitReached && (
                          <Badge variant="destructive" className="text-xs">
                            Limit Reached
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteShare(share.id)}
                        disabled={deleteShare.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        value={share.shareUrl}
                        readOnly
                        className="text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleCopyLink(share.shareUrl)}
                        disabled={share.isExpired || share.viewLimitReached}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>
                        {share.view_count} view{share.view_count !== 1 ? 's' : ''}
                      </span>
                      <span>
                        Expires{' '}
                        {formatDistanceToNow(new Date(share.expires_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No share links created yet.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

### 2. Enhanced Share Hooks

```typescript
// src/hooks/queries/use-shares.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ShareResult {
  id: string;
  share_token: string;
  shareUrl: string;
  expires_at: string;
  view_count: number;
  view_limit: number | null;
  isExpired: boolean;
  isPasswordProtected: boolean;
  viewLimitReached: boolean;
  created_at: string;
  last_viewed_at: string | null;
}

interface CreateShareParams {
  reportId: string;
  expiresInDays?: number;
  password?: string;
  viewLimit?: number;
}

// Fetch shares for a report
export function useReportShares(reportId: string) {
  return useQuery({
    queryKey: ['report-shares', reportId],
    queryFn: async (): Promise<ShareResult[]> => {
      const response = await fetch(`/api/reports/${reportId}/share`);
      if (!response.ok) throw new Error('Failed to fetch shares');
      return response.json();
    },
    enabled: !!reportId,
  });
}

// Create a new share
export function useCreateShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateShareParams) => {
      const response = await fetch(`/api/reports/${params.reportId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiresInDays: params.expiresInDays,
          password: params.password,
          viewLimit: params.viewLimit,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create share');
      }
      const data = await response.json();

      // Copy to clipboard
      await navigator.clipboard.writeText(data.shareUrl);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['report-shares', variables.reportId],
      });
    },
  });
}

// Delete a share
export function useDeleteShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shareId: string) => {
      const response = await fetch(`/api/reports/shares/${shareId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete share');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-shares'] });
    },
  });
}
```

## Report Action Bar

Combined component for sharing and PDF export:

```typescript
// src/components/reports/ReportActionBar.tsx
'use client';

import { ShareDialog } from './ShareDialog';
import { PdfExportButton } from './PdfExportButton';
import { ShareAnalyticsDashboard } from './ShareAnalyticsDashboard';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, BarChart3 } from 'lucide-react';
import { useState } from 'react';

interface ReportActionBarProps {
  reportId: string;
  propertyAddress: string;
  isOwner?: boolean;
}

export function ReportActionBar({
  reportId,
  propertyAddress,
  isOwner = true,
}: ReportActionBarProps) {
  const [showAnalytics, setShowAnalytics] = useState(false);

  const sanitizedAddress = propertyAddress
    .replace(/[^a-zA-Z0-9]/g, '-')
    .toLowerCase();
  const filename = `property-report-${sanitizedAddress}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {isOwner && <ShareDialog reportId={reportId} />}
        <PdfExportButton
          reportElementId="property-report"
          filename={filename}
          propertyAddress={propertyAddress}
        />
        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showAnalytics ? 'rotate-180' : ''
              }`}
            />
          </Button>
        )}
      </div>

      {isOwner && showAnalytics && (
        <ShareAnalyticsDashboard reportId={reportId} />
      )}
    </div>
  );
}
```

## Verification Steps

1. Create share token with 256-bit entropy and verify collision checking
2. Test password-protected sharing (create, access with password, wrong password)
3. Test view limit enforcement (access until limit reached, then blocked)
4. Verify rate limiting on public share endpoints
5. Test dynamic OG image generation for social sharing
6. Access shared URL and verify report loads correctly
7. Verify view count increments and analytics are tracked
8. Test referrer tracking in analytics
9. Test expired link shows appropriate message
10. Test view limit reached shows appropriate message
11. Test PDF export with progress indicator
12. Test PDF export cancellation
13. Verify social meta tags appear when sharing URL
14. Test share deletion removes access
15. Test copying share URL to clipboard
16. Verify analytics dashboard shows accurate data

## Dependencies

```bash
npm install html2pdf.js uuid bcryptjs lru-cache
npm install --save-dev @types/uuid @types/bcryptjs
npm install recharts date-fns
```

## Security Considerations

1. **Token Security**: 256-bit tokens provide 2^256 possible values, making brute-force infeasible
2. **Password Hashing**: bcrypt with cost factor 12 for secure password storage
3. **Rate Limiting**: Prevents brute-force attacks on passwords and tokens
4. **View Limits**: Prevents unlimited access to sensitive reports
5. **Expiration**: All tokens expire, preventing indefinite access
6. **Referrer Tracking**: Privacy-conscious (no IP storage, only referrer domain)

## Next Phase

After completing Phase 5, proceed to [Phase 6: Scoring Algorithm Implementation](./phase-6-scoring-algorithm.md)
