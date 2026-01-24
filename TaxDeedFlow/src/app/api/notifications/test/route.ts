/**
 * Test Push Notification API Endpoint
 *
 * Sends a test push notification to all active subscriptions or a specific subscription
 * Used for testing and debugging push notification functionality
 *
 * @route POST /api/notifications/test
 * @body endpoint - Optional specific endpoint to test (defaults to all active subscriptions)
 * @body title - Optional custom notification title
 * @body body - Optional custom notification body
 * @body url - Optional URL to open when notification is clicked
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configure web-push with VAPID keys
// Note: In production, store these in environment variables
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@taxdeedflow.com';

// Only set VAPID details if we have real keys (not placeholders)
if (vapidPublicKey && vapidPrivateKey && !vapidPublicKey.includes('placeholder')) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (error) {
    // Silently fail during build if VAPID keys are invalid
    console.warn('VAPID configuration skipped - invalid keys');
  }
}

/**
 * Send test push notification
 * @route POST /api/notifications/test
 */
export async function POST(request: NextRequest) {
  try {
    // Check if VAPID is configured
    if (!vapidPublicKey || !vapidPrivateKey || vapidPublicKey.includes('placeholder')) {
      return NextResponse.json(
        {
          error: 'VAPID keys not configured',
          message: 'Please generate VAPID keys using: node scripts/generate-vapid-keys.js',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      endpoint,
      title = 'Tax Deed Flow - Test Notification',
      body: notificationBody = 'This is a test push notification. Tap to view.',
      url = '/properties',
      auctionId,
      propertyId,
      alertType = 'test',
    } = body;

    // Get subscriptions to send notification to
    let subscriptions;
    if (endpoint) {
      // Send to specific endpoint
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('endpoint', endpoint)
        .eq('active', true)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Subscription not found or inactive' },
          { status: 404 }
        );
      }

      subscriptions = [data];
    } else {
      // Send to all active subscriptions
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('active', true);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch subscriptions', details: error.message },
          { status: 500 }
        );
      }

      subscriptions = data || [];
    }

    if (subscriptions.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No active subscriptions found',
          sent: 0,
          failed: 0,
        },
        { status: 200 }
      );
    }

    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        {
          error: 'Push notifications not configured',
          message:
            'VAPID keys not found. Please configure NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.',
          subscriptions: subscriptions.length,
        },
        { status: 503 }
      );
    }

    // Prepare notification payload
    const notificationPayload = {
      title,
      body: notificationBody,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: `test-${Date.now()}`,
      url,
      auctionId,
      propertyId,
      alertType,
      timestamp: new Date().toISOString(),
      actions: [
        {
          action: 'view',
          title: 'View Details',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    };

    // Send push notification to each subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        };

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(notificationPayload),
            {
              TTL: 60 * 60 * 24, // 24 hours
            }
          );

          return {
            success: true,
            endpoint: subscription.endpoint,
          };
        } catch (error: any) {
          // Check if subscription is expired/invalid (410 Gone)
          if (error.statusCode === 410) {
            // Mark subscription as inactive
            await supabase
              .from('push_subscriptions')
              .update({
                active: false,
                unsubscribed_at: new Date().toISOString(),
              })
              .eq('endpoint', subscription.endpoint);
          }

          return {
            success: false,
            endpoint: subscription.endpoint,
            error: error.message,
            statusCode: error.statusCode,
          };
        }
      })
    );

    // Count successes and failures
    const sent = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    ).length;

    // Get failure details
    const failures = results
      .filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      )
      .map((r) => {
        if (r.status === 'rejected') {
          return { error: r.reason?.message || 'Unknown error' };
        }
        return r.value;
      });

    return NextResponse.json({
      success: true,
      message: `Test notification sent to ${sent} subscription(s)`,
      sent,
      failed,
      total: subscriptions.length,
      failures: failed > 0 ? failures : undefined,
      notification: {
        title,
        body: notificationBody,
        url,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Get test notification status
 * @route GET /api/notifications/test
 */
export async function GET() {
  try {
    // Get count of active subscriptions
    const { count, error } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions', details: error.message },
        { status: 500 }
      );
    }

    // Check if VAPID keys are configured
    const vapidConfigured = !!(vapidPublicKey && vapidPrivateKey);

    return NextResponse.json({
      ready: vapidConfigured && (count || 0) > 0,
      vapidConfigured,
      activeSubscriptions: count || 0,
      vapidPublicKey: vapidConfigured ? vapidPublicKey : undefined,
      message: vapidConfigured
        ? `Ready to send test notifications to ${count || 0} active subscription(s)`
        : 'VAPID keys not configured. Cannot send push notifications.',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
