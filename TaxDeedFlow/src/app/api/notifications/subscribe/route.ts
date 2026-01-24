/**
 * Push Notification Subscription API Endpoint
 *
 * Handles push notification subscription registration and management
 * Stores subscription data for sending push notifications via Web Push API
 *
 * @route POST /api/notifications/subscribe
 * @body subscription - PushSubscription object from browser
 * @body userId - Optional user ID to associate subscription with user account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Subscribe to push notifications
 * @route POST /api/notifications/subscribe
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, userId } = body;

    // Validate subscription data
    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription data is required' },
        { status: 400 }
      );
    }

    // Validate subscription structure
    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription format. Must include endpoint and keys.' },
        { status: 400 }
      );
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription keys. Must include p256dh and auth.' },
        { status: 400 }
      );
    }

    // Store subscription in database (upsert to handle re-subscriptions)
    // Use endpoint as unique identifier since each browser/device has unique endpoint
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          expiration_time: subscription.expirationTime,
          user_id: userId || null,
          subscribed_at: new Date().toISOString(),
          active: true,
        },
        {
          onConflict: 'endpoint',
        }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save subscription', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to push notifications',
      subscription: {
        id: data.id,
        endpoint: data.endpoint,
        subscribedAt: data.subscribed_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Unsubscribe from push notifications
 * @route DELETE /api/notifications/subscribe
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // Mark subscription as inactive instead of deleting
    // This allows tracking subscription history
    const { data, error } = await supabase
      .from('push_subscriptions')
      .update({
        active: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('endpoint', endpoint)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to unsubscribe', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
