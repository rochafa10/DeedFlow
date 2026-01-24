# Push Notifications End-to-End Testing Guide

This comprehensive guide will help you test the complete push notification system for Tax Deed Flow PWA.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup VAPID Keys](#setup-vapid-keys)
3. [Test Scenarios](#test-scenarios)
4. [Verification Commands](#verification-commands)
5. [Troubleshooting](#troubleshooting)
6. [Success Criteria](#success-criteria)

---

## Prerequisites

Before testing push notifications, ensure the following are in place:

### Environment Requirements

- [ ] Development server running (`npm run dev`)
- [ ] Service worker registered (check DevTools > Application > Service Workers)
- [ ] Browser supports Push API (Chrome, Edge, Firefox, Safari 16+)
- [ ] HTTPS connection (localhost is exempt, but production requires HTTPS)
- [ ] Supabase environment variables configured in `.env.local`

### Database Requirements

The `push_subscriptions` table must exist in Supabase:

```sql
-- Check if table exists
SELECT * FROM push_subscriptions LIMIT 1;

-- Expected columns:
-- id, endpoint, p256dh_key, auth_key, expiration_time, user_id,
-- subscribed_at, unsubscribed_at, active
```

### Required Files

- [ ] `src/lib/pwa/notification-manager.ts` - Client-side notification utilities
- [ ] `public/sw.js` - Service worker with push event handlers
- [ ] `src/app/api/notifications/subscribe/route.ts` - Subscription API
- [ ] `src/app/api/notifications/test/route.ts` - Test notification API

---

## Setup VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for Web Push API.

### Step 1: Generate VAPID Keys

**Option 1: Using web-push CLI (Recommended)**

```bash
cd TaxDeedFlow

# Generate VAPID keys
npx web-push generate-vapid-keys
```

**Option 2: Using Node.js Script**

Create a script to generate keys:

```javascript
// scripts/generate-vapid-keys.js
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
```

Run it:

```bash
node scripts/generate-vapid-keys.js
```

### Step 2: Add VAPID Keys to Environment Variables

Add the generated keys to your `.env.local` file:

```env
# .env.local

# Existing Supabase config
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_SUBJECT=mailto:support@taxdeedflow.com
```

**Important:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Public key (exposed to client)
- `VAPID_PRIVATE_KEY` - Private key (server-side only, NEVER expose to client)
- `VAPID_SUBJECT` - Contact email or website URL

### Step 3: Restart Development Server

After adding environment variables, restart your dev server:

```bash
cd TaxDeedFlow
npm run dev
```

### Step 4: Verify VAPID Configuration

Check if VAPID keys are configured:

```bash
curl http://localhost:3000/api/notifications/test
```

Expected response:

```json
{
  "ready": false,
  "vapidConfigured": true,
  "activeSubscriptions": 0,
  "vapidPublicKey": "BKx...",
  "message": "Ready to send test notifications to 0 active subscription(s)"
}
```

---

## Test Scenarios

### Test 1: Request Notification Permission

**Objective:** Grant notification permission in the browser

**Steps:**

1. Open the app in your browser: `http://localhost:3000`

2. Open DevTools Console (F12 > Console tab)

3. Check current permission status:

```javascript
console.log('Notification permission:', Notification.permission);
// Should show: "default", "granted", or "denied"
```

4. Request permission programmatically:

```javascript
// Request permission
const permission = await Notification.requestPermission();
console.log('Permission granted:', permission);
```

5. Alternatively, click the notification bell icon in the header
   - If permission is "default", a banner will appear
   - Click "Enable Notifications" button

**Expected Results:**

- ✅ Browser shows native permission prompt
- ✅ After granting, `Notification.permission === "granted"`
- ✅ No errors in console
- ✅ Permission persists across page refreshes

**Troubleshooting:**

- If permission is "denied", you must reset it manually:
  - Chrome: Site Settings > Notifications > Allow
  - Firefox: Site Permissions > Notifications > Allow
  - Safari: Safari > Settings > Websites > Notifications > Allow

---

### Test 2: Subscribe to Push Notifications

**Objective:** Create a push subscription and save it to the database

**Steps:**

1. Ensure notification permission is granted (Test 1)

2. Open DevTools Console

3. Subscribe to push notifications:

```javascript
// Import notification manager utilities
const { subscribeToPushNotifications } = await import('/src/lib/pwa/notification-manager.ts');

// Get VAPID public key from API
const response = await fetch('/api/notifications/test');
const { vapidPublicKey } = await response.json();

// Subscribe to push notifications
const subscription = await subscribeToPushNotifications(vapidPublicKey);
console.log('Push subscription:', subscription);
```

4. Save subscription to database via API:

```javascript
// Send subscription to backend
const saveResponse = await fetch('/api/notifications/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    subscription: subscription.toJSON(),
  }),
});

const result = await saveResponse.json();
console.log('Subscription saved:', result);
```

5. Verify in Supabase:

```sql
-- Check if subscription was saved
SELECT * FROM push_subscriptions
WHERE active = true
ORDER BY subscribed_at DESC
LIMIT 1;
```

**Expected Results:**

- ✅ `subscription` object returned with `endpoint`, `keys.p256dh`, `keys.auth`
- ✅ API returns `{ success: true, message: "Successfully subscribed..." }`
- ✅ Subscription appears in `push_subscriptions` table
- ✅ `active = true` in database
- ✅ No console errors

**Verification Commands:**

```bash
# Check subscription count
curl http://localhost:3000/api/notifications/test | jq '.activeSubscriptions'

# Should return: 1 (or more if multiple browsers/devices)
```

---

### Test 3: Trigger Test Notification from Backend

**Objective:** Send a push notification from the server and verify it appears

**Steps:**

1. Ensure you have an active subscription (Test 2)

2. Send test notification via API:

**Option 1: Using curl**

```bash
# Send test notification to all active subscriptions
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Auction Alert",
    "body": "New property added to Blair County auction - Opening bid $5,000",
    "url": "/properties",
    "alertType": "new_property"
  }'
```

**Option 2: Using DevTools Console**

```javascript
// Send test notification
const response = await fetch('/api/notifications/test', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Test Auction Alert',
    body: 'New property added to Blair County auction - Opening bid $5,000',
    url: '/properties',
    alertType: 'new_property',
  }),
});

const result = await response.json();
console.log('Notification sent:', result);
```

**Option 3: Using Postman/Insomnia**

- Method: `POST`
- URL: `http://localhost:3000/api/notifications/test`
- Headers: `Content-Type: application/json`
- Body (JSON):

```json
{
  "title": "Test Auction Alert",
  "body": "New property added to Blair County auction - Opening bid $5,000",
  "url": "/properties",
  "alertType": "new_property"
}
```

**Expected Results:**

- ✅ API returns `{ success: true, sent: 1, failed: 0 }`
- ✅ Browser shows native push notification
- ✅ Notification displays correct title and body
- ✅ Notification icon shows Tax Deed Flow logo
- ✅ No errors in console or API response

**Expected Notification Appearance:**

```
┌─────────────────────────────────────┐
│ 🔔 Tax Deed Flow                    │
│                                     │
│ Test Auction Alert                  │
│ New property added to Blair County  │
│ auction - Opening bid $5,000        │
│                                     │
│ [View Details] [Dismiss]            │
└─────────────────────────────────────┘
```

**Troubleshooting:**

- If notification doesn't appear:
  - Check browser notification settings (should be "Allow")
  - Check service worker is active (DevTools > Application > Service Workers)
  - Check console for push event errors
  - Verify VAPID keys are correctly configured
  - Check API response for errors

---

### Test 4: Click Notification and Verify Navigation

**Objective:** Verify clicking notification opens the correct page

**Steps:**

1. Send a test notification with a specific URL:

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Property Alert",
    "body": "Blair County property requires attention",
    "url": "/properties/123",
    "propertyId": "123"
  }'
```

2. When notification appears, **click** on it (not on action buttons)

**Expected Results:**

- ✅ Notification closes when clicked
- ✅ Browser window focuses (if already open)
- ✅ Navigates to `/properties/123`
- ✅ If no window open, opens new window with correct URL
- ✅ If window already on correct URL, just focuses it

**Test Different URLs:**

Test navigation to different pages:

```javascript
// Test navigation to auctions page
await fetch('/api/notifications/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Auction Starting Soon',
    body: 'Blair County auction starts in 30 minutes',
    url: '/auctions',
  }),
});

// Test navigation to watchlist
await fetch('/api/notifications/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Watchlist Update',
    body: 'A property on your watchlist was updated',
    url: '/watchlist',
  }),
});

// Test navigation to specific property
await fetch('/api/notifications/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Property Details',
    body: 'New information available for property #456',
    url: '/properties/456',
  }),
});
```

**Service Worker Verification:**

Check service worker console for notificationclick events:

1. Open DevTools > Application > Service Workers
2. Click "console" link next to your service worker
3. Trigger notification and click it
4. Should see: `[Service Worker] Notification clicked: /properties/123`

---

### Test 5: Test Notification Actions

**Objective:** Verify notification action buttons work correctly

**Steps:**

1. Send notification with custom actions:

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Auction Property",
    "body": "123 Main St, Blair County - $8,500 opening bid",
    "url": "/properties/789",
    "actions": [
      { "action": "view", "title": "View Property" },
      { "action": "watchlist", "title": "Add to Watchlist" },
      { "action": "dismiss", "title": "Dismiss" }
    ]
  }'
```

2. When notification appears, click different action buttons

**Expected Results:**

- ✅ Notification shows action buttons
- ✅ Clicking "View Property" opens the property page
- ✅ Clicking any action closes the notification
- ✅ Service worker notificationclick event fires

**Note:** Action button functionality beyond navigation requires additional implementation in the service worker's notificationclick handler.

---

### Test 6: Multiple Subscriptions (Multi-Device)

**Objective:** Test notifications across multiple devices/browsers

**Steps:**

1. Subscribe from multiple browsers/devices:
   - Desktop Chrome
   - Desktop Edge/Firefox
   - Mobile Chrome (Android)
   - Mobile Safari (iOS 16+)

2. Check subscription count:

```bash
curl http://localhost:3000/api/notifications/test | jq '.activeSubscriptions'
# Should return number of active subscriptions
```

3. Send test notification to all subscriptions:

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{ "title": "Multi-Device Test", "body": "This should appear on all devices" }'
```

**Expected Results:**

- ✅ All subscribed devices receive the notification
- ✅ API reports correct sent/failed counts
- ✅ Each device can click and navigate independently
- ✅ No duplicate subscriptions for same device (upsert works)

---

### Test 7: Unsubscribe from Notifications

**Objective:** Test unsubscribe functionality

**Steps:**

1. Get current subscription:

```javascript
const { getPushSubscription } = await import('/src/lib/pwa/notification-manager.ts');
const subscription = await getPushSubscription();
console.log('Current subscription:', subscription);
```

2. Unsubscribe via browser API:

```javascript
const { unsubscribeFromPushNotifications } = await import('/src/lib/pwa/notification-manager.ts');
const success = await unsubscribeFromPushNotifications();
console.log('Unsubscribed:', success);
```

3. Update database:

```javascript
await fetch('/api/notifications/subscribe', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoint: subscription.endpoint,
  }),
});
```

4. Verify in database:

```sql
SELECT * FROM push_subscriptions
WHERE endpoint = 'your-endpoint-here';
-- Should show: active = false, unsubscribed_at = timestamp
```

**Expected Results:**

- ✅ `unsubscribeFromPushNotifications()` returns `true`
- ✅ Database shows `active = false`
- ✅ `unsubscribed_at` timestamp is set
- ✅ Sending test notification returns `sent: 0`
- ✅ No notifications appear after unsubscribing

---

### Test 8: Expired/Invalid Subscription Cleanup

**Objective:** Test automatic cleanup of expired subscriptions

**Steps:**

1. Simulate expired subscription by manually invalidating one

2. Send test notification:

```bash
curl -X POST http://localhost:3000/api/notifications/test
```

3. Check API response for failures:

```json
{
  "success": true,
  "sent": 2,
  "failed": 1,
  "failures": [
    {
      "endpoint": "expired-endpoint",
      "error": "Gone",
      "statusCode": 410
    }
  ]
}
```

4. Verify expired subscription is marked inactive:

```sql
SELECT * FROM push_subscriptions
WHERE endpoint = 'expired-endpoint';
-- Should show: active = false
```

**Expected Results:**

- ✅ API detects 410 Gone status from push service
- ✅ Automatically marks subscription as inactive
- ✅ Sets `unsubscribed_at` timestamp
- ✅ Doesn't break other valid subscriptions
- ✅ Returns detailed failure information

---

### Test 9: Real-World Auction Alert Integration

**Objective:** Test push notifications with real auction alerts

**Steps:**

This test requires integration with the alerts system.

1. Create auction alert via UI:
   - Go to `/auctions`
   - Create alert for specific county/criteria
   - Enable push notifications for alert

2. Trigger alert condition (simulation):

```javascript
// Simulate new property matching alert criteria
await fetch('/api/alerts/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    alertId: 'your-alert-id',
    property: {
      id: '123',
      address: '123 Main St',
      county: 'Blair County',
      openingBid: 5000,
    },
  }),
});
```

3. Verify notification appears with real alert data

**Expected Results:**

- ✅ Notification triggered by alert condition
- ✅ Contains relevant property information
- ✅ Clicking opens property detail page
- ✅ Alert marked as delivered in database
- ✅ User can manage notifications in settings

---

## Verification Commands

### Check Service Worker Status

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => {
    console.log('Service Worker:', registration);
    console.log('State:', registration.active.state);
  });
});
```

### Check Push Subscription Status

```javascript
// Get current subscription
navigator.serviceWorker.ready.then(registration => {
  registration.pushManager.getSubscription().then(subscription => {
    console.log('Push subscription:', subscription);
    if (subscription) {
      console.log('Endpoint:', subscription.endpoint);
      console.log('Keys:', subscription.toJSON().keys);
    }
  });
});
```

### Check Notification Permission

```javascript
console.log('Notification permission:', Notification.permission);
console.log('Push supported:', 'PushManager' in window);
console.log('Service worker supported:', 'serviceWorker' in navigator);
```

### Test Local Notification (No Push)

```javascript
// Show local notification without push server
const { showNotification } = await import('/src/lib/pwa/notification-manager.ts');
await showNotification('Local Test', {
  body: 'This is a local notification (no push subscription needed)',
  icon: '/icons/icon-192x192.png',
});
```

### Query Database for Subscriptions

```sql
-- All active subscriptions
SELECT id, endpoint, subscribed_at, user_id
FROM push_subscriptions
WHERE active = true
ORDER BY subscribed_at DESC;

-- Count by status
SELECT active, COUNT(*) as count
FROM push_subscriptions
GROUP BY active;

-- Recent subscriptions
SELECT * FROM push_subscriptions
WHERE subscribed_at > NOW() - INTERVAL '24 hours'
ORDER BY subscribed_at DESC;
```

---

## Troubleshooting

### Notification Permission Denied

**Problem:** `Notification.permission === "denied"`

**Solutions:**

1. **Reset Browser Permissions:**
   - **Chrome:** `chrome://settings/content/notifications` > Remove site > Refresh page
   - **Firefox:** Click lock icon > Permissions > Notifications > Clear > Refresh
   - **Safari:** Safari > Settings > Websites > Notifications > Remove > Refresh

2. **Check Browser Support:**
   ```javascript
   console.log('Notification API:', 'Notification' in window);
   console.log('Push API:', 'PushManager' in window);
   console.log('Service Worker:', 'serviceWorker' in navigator);
   ```

3. **Use Incognito/Private Mode:** Sometimes a fresh browser session helps

---

### Service Worker Not Registering

**Problem:** Service worker not found in DevTools > Application

**Solutions:**

1. **Check service worker file exists:**
   ```bash
   ls -la TaxDeedFlow/public/sw.js
   ```

2. **Check registration code:**
   - Open `TaxDeedFlow/src/app/layout.tsx`
   - Verify `ServiceWorkerRegistration` component is included

3. **Force re-registration:**
   ```javascript
   // Unregister all service workers
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(r => r.unregister());
   });

   // Refresh page to re-register
   location.reload();
   ```

4. **Check browser console for registration errors**

---

### Push Notification Not Appearing

**Problem:** API shows `sent: 1` but notification doesn't appear

**Solutions:**

1. **Check browser notification settings:**
   - System notification settings (Windows/Mac/Linux)
   - Browser notification settings (must be "Allow")
   - Do Not Disturb mode (should be off)

2. **Check service worker push handler:**
   ```javascript
   // In service worker console (DevTools > Application > Service Workers > console)
   // You should see push events when notifications are sent
   ```

3. **Test with local notification first:**
   ```javascript
   const { showNotification } = await import('/src/lib/pwa/notification-manager.ts');
   await showNotification('Test', { body: 'Local test' });
   ```

4. **Check for errors in service worker console**

5. **Verify push event is firing:**
   - Add `console.log` to service worker's push event handler
   - Check service worker console when sending notification

---

### VAPID Key Errors

**Problem:** "VAPID keys not configured" or authentication errors

**Solutions:**

1. **Verify environment variables:**
   ```bash
   # Check if .env.local exists
   ls -la TaxDeedFlow/.env.local

   # Restart dev server after adding variables
   cd TaxDeedFlow && npm run dev
   ```

2. **Verify keys are valid:**
   ```bash
   # Generate new keys if needed
   npx web-push generate-vapid-keys
   ```

3. **Check API can access keys:**
   ```bash
   curl http://localhost:3000/api/notifications/test | jq '.vapidConfigured'
   # Should return: true
   ```

4. **Ensure public key matches between client and server**

---

### Subscription Fails to Save

**Problem:** `/api/notifications/subscribe` returns error

**Solutions:**

1. **Check Supabase connection:**
   ```bash
   # Verify environment variables
   grep SUPABASE TaxDeedFlow/.env.local
   ```

2. **Verify database table exists:**
   ```sql
   -- Create table if missing
   CREATE TABLE IF NOT EXISTS push_subscriptions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     endpoint TEXT UNIQUE NOT NULL,
     p256dh_key TEXT NOT NULL,
     auth_key TEXT NOT NULL,
     expiration_time BIGINT,
     user_id UUID REFERENCES auth.users(id),
     subscribed_at TIMESTAMPTZ DEFAULT NOW(),
     unsubscribed_at TIMESTAMPTZ,
     active BOOLEAN DEFAULT true
   );
   ```

3. **Check API logs for detailed error:**
   - Look at terminal running dev server
   - Check browser Network tab for API response

---

### Notification Click Doesn't Navigate

**Problem:** Clicking notification doesn't open the app

**Solutions:**

1. **Check service worker notificationclick handler:**
   ```bash
   grep -A 20 "notificationclick" TaxDeedFlow/public/sw.js
   ```

2. **Verify URL in notification data:**
   ```javascript
   // When sending test notification, check the data
   console.log('Notification data:', event.notification.data);
   ```

3. **Check service worker console for click events**

4. **Test with simple URL first:**
   ```bash
   curl -X POST http://localhost:3000/api/notifications/test \
     -H "Content-Type: application/json" \
     -d '{ "url": "/" }'
   ```

---

### Multiple Subscriptions for Same Browser

**Problem:** Same browser creates multiple subscriptions

**Solutions:**

1. **Check upsert logic:**
   - Verify `/api/notifications/subscribe` uses `onConflict: 'endpoint'`
   - Endpoint should be unique identifier

2. **Clean duplicate subscriptions:**
   ```sql
   -- Find duplicates
   SELECT endpoint, COUNT(*)
   FROM push_subscriptions
   GROUP BY endpoint
   HAVING COUNT(*) > 1;

   -- Keep newest, mark others inactive
   UPDATE push_subscriptions
   SET active = false
   WHERE id NOT IN (
     SELECT DISTINCT ON (endpoint) id
     FROM push_subscriptions
     ORDER BY endpoint, subscribed_at DESC
   );
   ```

---

## Success Criteria

Use this checklist to verify push notifications are working correctly:

### Basic Functionality

- [ ] Notification permission can be requested
- [ ] Permission status persists across page refreshes
- [ ] Push subscription is created successfully
- [ ] Subscription is saved to database with correct structure
- [ ] VAPID keys are properly configured
- [ ] Service worker is registered and active
- [ ] Push event handler exists in service worker
- [ ] Notificationclick event handler exists in service worker

### Notification Display

- [ ] Test notification appears when sent from API
- [ ] Notification shows correct title and body
- [ ] Notification icon displays (Tax Deed Flow logo)
- [ ] Notification badge displays
- [ ] Notification actions are visible (if provided)
- [ ] Notification appears even when app is closed
- [ ] Notification appears even when browser is closed (desktop)

### Notification Interaction

- [ ] Clicking notification closes it
- [ ] Clicking notification opens/focuses app
- [ ] Clicking notification navigates to correct URL
- [ ] If window already open, it focuses instead of opening new
- [ ] If window on correct page, just focuses it
- [ ] Action buttons are clickable (if implemented)

### Multi-Device Support

- [ ] Can subscribe from multiple browsers/devices
- [ ] Each device receives notifications independently
- [ ] API reports correct sent/failed counts
- [ ] Same device doesn't create duplicate subscriptions (upsert works)
- [ ] Works on desktop Chrome
- [ ] Works on desktop Edge/Firefox
- [ ] Works on Android Chrome
- [ ] Works on iOS Safari 16+ (if available)

### Subscription Management

- [ ] Can unsubscribe via browser API
- [ ] Unsubscribe updates database (active = false)
- [ ] Unsubscribed devices don't receive notifications
- [ ] Expired subscriptions are detected (410 Gone)
- [ ] Expired subscriptions are marked inactive automatically
- [ ] Can re-subscribe after unsubscribing

### Error Handling

- [ ] API handles missing VAPID keys gracefully
- [ ] API handles no active subscriptions gracefully
- [ ] API handles invalid subscription data with 400 error
- [ ] API handles database errors with 500 error
- [ ] Failed notifications are reported in API response
- [ ] Service worker handles push events without data
- [ ] Service worker handles malformed push data

### Production Readiness

- [ ] VAPID keys stored in environment variables (not hardcoded)
- [ ] Private VAPID key never exposed to client
- [ ] Subscription endpoint used as unique identifier
- [ ] Subscription history preserved (soft delete)
- [ ] No console.log statements in production code
- [ ] TypeScript compilation passes with no errors
- [ ] No security warnings or vulnerabilities
- [ ] HTTPS enforced in production (localhost exempt)

### API Endpoints

- [ ] `POST /api/notifications/subscribe` - Saves subscription
- [ ] `DELETE /api/notifications/subscribe` - Unsubscribes
- [ ] `POST /api/notifications/test` - Sends test notification
- [ ] `GET /api/notifications/test` - Shows configuration status
- [ ] All endpoints have proper error handling
- [ ] All endpoints return consistent response format

### Integration

- [ ] Works with existing alerts system
- [ ] Works with auction monitoring
- [ ] Works with property watchlist
- [ ] Notification data includes relevant context (auctionId, propertyId)
- [ ] Clicking notification opens correct detail page
- [ ] Notifications respect user preferences

---

## Test Results Documentation

Use this template to document your test results:

```markdown
## Push Notification Test Results

**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Environment:** Development / Staging / Production

### Test Environment
- Browser: Chrome 120.0.6099.129 (or other)
- OS: Windows 11 / macOS / Linux / Android / iOS
- Service Worker Version: v1
- VAPID Configured: Yes/No

### Test 1: Request Permission
- Status: ✅ PASS / ❌ FAIL
- Notes: [Any issues or observations]

### Test 2: Subscribe to Push
- Status: ✅ PASS / ❌ FAIL
- Subscription Endpoint: [First 50 chars of endpoint]
- Notes: [Any issues or observations]

### Test 3: Send Test Notification
- Status: ✅ PASS / ❌ FAIL
- Sent Count: 1
- Failed Count: 0
- Notes: [Any issues or observations]

### Test 4: Click Notification
- Status: ✅ PASS / ❌ FAIL
- Target URL: /properties/123
- Navigation: ✅ Success / ❌ Failed
- Notes: [Any issues or observations]

### Test 5: Notification Actions
- Status: ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
- Notes: [Any issues or observations]

### Test 6: Multi-Device
- Status: ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
- Devices Tested: 2 (Desktop Chrome, Mobile Android)
- Notes: [Any issues or observations]

### Test 7: Unsubscribe
- Status: ✅ PASS / ❌ FAIL
- Notes: [Any issues or observations]

### Test 8: Expired Subscription
- Status: ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
- Notes: [Any issues or observations]

### Test 9: Real Alert Integration
- Status: ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
- Notes: [Requires alert system integration]

### Overall Status
- Tests Passed: X / 9
- Tests Failed: X / 9
- Tests Skipped: X / 9
- Ready for Production: ✅ YES / ❌ NO / ⚠️ WITH CAVEATS

### Issues Found
1. [Issue description and severity]
2. [Issue description and severity]

### Recommendations
1. [Recommendation for improvement]
2. [Recommendation for improvement]
```

---

## Next Steps

After completing all tests and verifying success criteria:

1. **Document VAPID Keys Securely**
   - Store production VAPID keys in secure password manager
   - Add to production environment variables
   - Never commit to version control

2. **Production Deployment Checklist**
   - [ ] VAPID keys configured in production environment
   - [ ] HTTPS enforced (required for push notifications)
   - [ ] Service worker deployed and accessible
   - [ ] Database table exists in production
   - [ ] Test notification API protected (auth required)
   - [ ] Error monitoring configured (Sentry, etc.)

3. **User Documentation**
   - Create help article for enabling notifications
   - Add notification settings to user profile
   - Document how to manage notification preferences

4. **Monitoring**
   - Track subscription metrics (new, active, expired)
   - Monitor notification delivery rates (sent vs failed)
   - Alert on high failure rates
   - Track user engagement (click-through rates)

5. **Future Enhancements**
   - Implement notification scheduling
   - Add notification preferences (frequency, types)
   - Implement notification history/archive
   - Add rich notification content (images, progress bars)
   - Implement notification groups/categories

---

## Additional Resources

- [Web Push API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notification API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Service Worker API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web-push Node.js Library](https://github.com/web-push-libs/web-push)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)

---

**End of Testing Guide**

For questions or issues, refer to the troubleshooting section or check the service worker console for detailed error messages.
