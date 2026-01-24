/**
 * Auction Alerts API Endpoint
 *
 * Fetches alerts from the auction_alerts table joined with counties and upcoming_sales
 * Falls back to empty array if no alerts found
 *
 * @route GET /api/alerts
 * @query acknowledged - Filter by acknowledged status (true/false/all)
 * @query severity - Filter by severity (critical/warning/info/all)
 * @query limit - Max number of alerts to return (default: 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

export interface AuctionAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  date: string;
  auctionId: string | null;
  county: string;
  state: string;
  auctionDate: string | null;
  acknowledged: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    if (!supabase) {
      console.warn('[Alerts API] Database not configured, returning empty alerts');
      return NextResponse.json({
        alerts: [],
        count: 0,
        hasData: false,
        dataSource: 'empty',
      });
    }

    const { searchParams } = new URL(request.url);
    const acknowledgedFilter = searchParams.get('acknowledged');
    const severityFilter = searchParams.get('severity');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Build query
    let query = supabase
      .from('auction_alerts')
      .select(`
        id,
        alert_type,
        severity,
        title,
        message,
        days_until_event,
        acknowledged,
        acknowledged_at,
        created_at,
        sale_id,
        county_id,
        counties!auction_alerts_county_id_fkey (
          county_name,
          state_code
        ),
        upcoming_sales!auction_alerts_sale_id_fkey (
          sale_date
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (acknowledgedFilter === 'true') {
      query = query.eq('acknowledged', true);
    } else if (acknowledgedFilter === 'false') {
      query = query.eq('acknowledged', false);
    }

    if (severityFilter && severityFilter !== 'all') {
      query = query.eq('severity', severityFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch alerts', details: error.message },
        { status: 500 }
      );
    }

    // Transform data to match frontend format
    const alerts: AuctionAlert[] = (data || []).map((alert: any) => ({
      id: alert.id,
      type: mapSeverityToType(alert.severity),
      title: alert.title,
      message: alert.message || '',
      date: new Date(alert.created_at).toISOString().split('T')[0],
      auctionId: alert.sale_id,
      county: alert.counties?.county_name || 'Unknown',
      state: alert.counties?.state_code || 'PA',
      auctionDate: alert.upcoming_sales?.sale_date
        ? new Date(alert.upcoming_sales.sale_date).toISOString().split('T')[0]
        : null,
      acknowledged: alert.acknowledged || false,
    }));

    return NextResponse.json({
      alerts,
      count: alerts.length,
      hasData: alerts.length > 0,
      dataSource: alerts.length > 0 ? 'live' : 'empty',
    });
  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Acknowledge an alert
 * @route POST /api/alerts
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { alertId, acknowledge } = body;

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('auction_alerts')
      .update({
        acknowledged: acknowledge !== false,
        acknowledged_at: acknowledge !== false ? new Date().toISOString() : null,
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      console.error('Error acknowledging alert:', error);
      return NextResponse.json(
        { error: 'Failed to acknowledge alert', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alert: data,
    });
  } catch (error) {
    console.error('Alerts POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Acknowledge all alerts
 * @route PATCH /api/alerts
 */
export async function PATCH() {
  try {
    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('auction_alerts')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('acknowledged', false)
      .select();

    if (error) {
      console.error('Error acknowledging all alerts:', error);
      return NextResponse.json(
        { error: 'Failed to acknowledge alerts', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('Alerts PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Map database severity to frontend alert type
 */
function mapSeverityToType(severity: string): 'critical' | 'warning' | 'info' {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'critical';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
}
