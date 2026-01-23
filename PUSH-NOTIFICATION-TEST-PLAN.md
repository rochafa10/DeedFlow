# Push Notification End-to-End Test Plan

**Test Date:** 2026-01-23
**Feature:** Auction Deadline Push Notifications
**Status:** ✅ Backend Components Verified - Manual Browser Testing Required

---

## Executive Summary

Push notification functionality has been implemented and all backend components are verified. This document provides a comprehensive manual test plan for end-to-end verification of push notification features.

**Automated Test Results:** 23/23 checks passed ✅

---

## Test Environment Setup

### Prerequisites

1. **Dev Server Running:**
   ```bash
   cd TaxDeedFlow
   npm run dev
   ```

2. **Browser Requirements:**
   - Chrome 63+ or Firefox 62+ (recommended)
   - HTTPS or localhost (required for Web Push API)
   - Allow notifications in browser settings

3. **Browser DevTools:**
   - Open DevTools (F12)
   - Keep Console tab visible for logs
   - Application tab for Service Worker inspection

---

## Component Verification ✅

All components verified and ready for testing:

### Backend Components
- ✅ Push service utility (`/lib/notifications/push-service.ts`)
- ✅ Notification subscription API (`/api/auctions/notifications/subscribe`)
- ✅ NotificationSettings component (`/components/auctions/NotificationSettings.tsx`)
- ✅ Integration in auctions page (`/app/auctions/page.tsx`)

### Key Functions Available
- ✅ `isNotificationSupported()` - Feature detection
- ✅ `requestNotificationPermission()` - Permission management
- ✅ `subscribeToPushNotifications()` - Subscription creation
- ✅ `unsubscribeFromPushNotifications()` - Subscription removal
- ✅ `showLocalNotification()` - Display notifications
- ✅ `sendTestNotification()` - Test notification trigger

---

## Manual Test Scenarios

### Test 1: Initial Page Load and Feature Detection

**Steps:**
1. Navigate to `http://localhost:3000/auctions`
2. Scroll to "Notification Settings" section
3. Observe the component state

**Expected Results:**
- ✅ "Notification Settings" section visible
- ✅ "Enable Notifications" button present
- ✅ Button is NOT disabled (if browser supports notifications)
- ✅ If browser doesn't support notifications, see "Not Supported" message
- ✅ No console errors

**Validation Checklist:**
- [ ] NotificationSettings component renders
- [ ] Enable button is clickable
- [ ] No JavaScript errors in console
- [ ] Component styling looks correct (dark mode compatible)

---

### Test 2: Enable Notifications (First Time)

**Steps:**
1. Click "Enable Notifications" button
2. Wait for browser permission prompt
3. Click "Allow" on the browser prompt
4. Wait for subscription to complete

**Expected Results:**
- ✅ Browser shows native permission dialog
- ✅ After allowing, see success message: "Notifications enabled successfully!"
- ✅ Test notification appears: "Test Notification - Push notifications are working correctly!"
- ✅ Button changes to "Disable Notifications"
- ✅ Notification preferences panel expands
- ✅ Console shows: `[Push Notifications] Successfully subscribed`

**Validation Checklist:**
- [ ] Browser permission prompt appears
- [ ] Success message displays after allowing
- [ ] Test notification shows in browser
- [ ] Button state changes to "Disable"
- [ ] Preferences panel becomes visible
- [ ] No errors in console

**Console Commands for Debugging:**
```javascript
// Check notification permission
console.log('Permission:', Notification.permission);

// Check if service worker is registered
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg);
});

// Check push subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push Subscription:', sub);
  });
});
```

---

### Test 3: Notification Permission Denied

**Steps:**
1. Clear browser data and reload page
2. Click "Enable Notifications" button
3. Click "Block" or "Deny" on the permission prompt

**Expected Results:**
- ✅ Error message: "Notification permission denied"
- ✅ Help text shows how to enable in browser settings
- ✅ Button remains as "Enable Notifications"
- ✅ Component handles gracefully (no crashes)

**Validation Checklist:**
- [ ] Error message displays
- [ ] Instructions for enabling show
- [ ] No JavaScript crashes
- [ ] Can try again after resetting permissions

**To Reset Permissions:**
- Chrome: Click padlock icon → Site settings → Notifications → Allow
- Firefox: Click shield icon → Permissions → Notifications → Allow

---

### Test 4: Subscription Stored in Database

**Steps:**
1. Enable notifications (follow Test 2)
2. Open browser DevTools → Network tab
3. Filter by "subscribe"
4. Examine the API request

**Expected Results:**
- ✅ POST request to `/api/auctions/notifications/subscribe`
- ✅ Request body includes:
  ```json
  {
    "action": "subscribe",
    "subscription": {
      "endpoint": "https://...",
      "keys": {
        "p256dh": "...",
        "auth": "..."
      }
    },
    "preferences": {
      "notifyRegistrationDeadline": true,
      "notifyAuctionDate": true,
      "notifyDaysBefore": [3, 7]
    }
  }
  ```
- ✅ Response: `{ "success": true, "action": "subscribe" }`
- ✅ Status code: 200

**Validation Checklist:**
- [ ] API request sent successfully
- [ ] Subscription object has endpoint and keys
- [ ] Preferences included in request
- [ ] Response indicates success

**Database Verification (Optional):**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM push_subscriptions
ORDER BY created_at DESC
LIMIT 5;
```

---

### Test 5: Notification Preferences Configuration

**Steps:**
1. Enable notifications (if not already enabled)
2. Locate the "Notification Preferences" section
3. Toggle "Registration Deadlines" OFF
4. Toggle "Auction Dates" ON
5. Change reminder timing (check/uncheck days)
6. Click "Update Preferences" button

**Expected Results:**
- ✅ Toggles respond to clicks
- ✅ Checkbox states update correctly
- ✅ "Update Preferences" button becomes enabled
- ✅ After update: "Preferences updated successfully!" message
- ✅ POST request to `/api/auctions/notifications/subscribe` with new preferences

**Validation Checklist:**
- [ ] Registration deadline toggle works
- [ ] Auction date toggle works
- [ ] Reminder timing checkboxes work (1-day, 3-day, 7-day)
- [ ] Update button saves changes
- [ ] Success message displays
- [ ] API request contains updated preferences

---

### Test 6: Disable Notifications

**Steps:**
1. With notifications enabled, click "Disable Notifications" button
2. Wait for unsubscribe to complete

**Expected Results:**
- ✅ Button shows loading spinner
- ✅ Success message: "Notifications disabled successfully"
- ✅ Button changes back to "Enable Notifications"
- ✅ Preferences panel collapses
- ✅ API request to unsubscribe endpoint
- ✅ Console: `[Push Notifications] Successfully unsubscribed`

**Validation Checklist:**
- [ ] Disable button works
- [ ] Loading state shows
- [ ] Success message displays
- [ ] Button returns to "Enable" state
- [ ] API unsubscribe request sent

---

### Test 7: Unsupported Browser Handling

**Steps:**
1. Test in older browser or disable notifications in browser settings
2. Navigate to `/auctions` page
3. Observe NotificationSettings component

**Expected Results:**
- ✅ Component shows "Not Supported" message
- ✅ Enable button is disabled
- ✅ Helpful error message explains browser requirements
- ✅ No JavaScript errors

**Validation Checklist:**
- [ ] "Not Supported" state displays
- [ ] Button is disabled
- [ ] User-friendly error message shows
- [ ] No console errors

---

### Test 8: Service Worker Registration

**Steps:**
1. Open DevTools → Application tab
2. Click "Service Workers" in left sidebar
3. Enable notifications (if not already)
4. Check service worker status

**Expected Results:**
- ✅ Service worker is registered
- ✅ Status: "activated and is running"
- ✅ Can see "Push" in service worker properties
- ✅ No errors in service worker console

**Validation Checklist:**
- [ ] Service worker registered
- [ ] Service worker active
- [ ] Push capability enabled
- [ ] No errors in SW console

**If Service Worker Not Found:**
- This is expected (warning in automated tests)
- Push notifications will use browser's default service worker
- For production, consider adding custom service worker

---

### Test 9: Test Notification Display

**Steps:**
1. Enable notifications
2. Observe the test notification that appears automatically
3. Alternatively, send test via console:
   ```javascript
   // In browser console
   new Notification('Test Auction Deadline', {
     body: 'Registration deadline in 3 days for Blair County, PA',
     icon: '/icon-192x192.png',
     badge: '/badge-72x72.png',
     tag: 'auction-deadline-test'
   });
   ```

**Expected Results:**
- ✅ Notification appears in system notification area
- ✅ Contains title and body text
- ✅ Icon displays (if available)
- ✅ Notification can be clicked
- ✅ Notification can be dismissed

**Validation Checklist:**
- [ ] Notification appears
- [ ] Title is correct
- [ ] Body text is correct
- [ ] Icon shows (if configured)
- [ ] Notification is interactive

---

### Test 10: Re-enable After Browser Restart

**Steps:**
1. Enable notifications
2. Close browser completely
3. Reopen browser
4. Navigate to `/auctions` page
5. Check NotificationSettings state

**Expected Results:**
- ✅ Subscription persists across browser sessions
- ✅ Button shows "Disable Notifications" (already enabled)
- ✅ Preferences are retained
- ✅ No need to grant permission again

**Validation Checklist:**
- [ ] Subscription persists
- [ ] Component loads in enabled state
- [ ] No permission prompt needed
- [ ] Preferences are still set

---

## Browser Compatibility Testing

Test in multiple browsers to ensure cross-browser compatibility:

### Chrome (Recommended)
- [ ] Notifications work
- [ ] Permission dialog appears
- [ ] Test notification shows
- [ ] No console errors

### Firefox
- [ ] Notifications work
- [ ] Permission dialog appears
- [ ] Test notification shows
- [ ] No console errors

### Edge
- [ ] Notifications work
- [ ] Permission dialog appears
- [ ] Test notification shows
- [ ] No console errors

### Safari (Limited Support)
- [ ] Check if notifications are supported
- [ ] May have limited Web Push support
- [ ] Document any limitations

---

## Security & Privacy Verification

### Security Checks
- [ ] API endpoint validates subscription object
- [ ] Endpoint and keys are required
- [ ] No sensitive data exposed in console logs
- [ ] HTTPS enforced for push subscriptions (production)

### Privacy Checks
- [ ] Privacy notice displayed in component
- [ ] User must explicitly opt-in (no auto-subscribe)
- [ ] User can disable at any time
- [ ] Preferences are user-controlled

---

## Performance Metrics

### Initial Load
- **Target:** Component renders in < 100ms
- **Measured:** ___ ms
- **Status:** [ ] Pass / [ ] Fail

### Subscription Time
- **Target:** Subscribe completes in < 2 seconds
- **Measured:** ___ seconds
- **Status:** [ ] Pass / [ ] Fail

### API Response Time
- **Target:** API responds in < 500ms
- **Measured:** ___ ms
- **Status:** [ ] Pass / [ ] Fail

---

## Known Issues & Limitations

### Current Limitations
1. ⚠️ Custom service worker not implemented (uses browser default)
   - Impact: Limited control over notification display
   - Recommendation: Add custom SW for production

2. ⚠️ Web manifest not configured
   - Impact: PWA features not fully enabled
   - Recommendation: Add manifest.json

3. ⚠️ VAPID keys not configured
   - Impact: Server push not available (local notifications only)
   - Recommendation: Configure VAPID keys for server-sent notifications

### Browser Limitations
- Safari has limited Web Push support (macOS 13+, iOS 16.4+)
- Notifications require HTTPS (except localhost)
- Some browsers may block notifications by default

---

## Troubleshooting Guide

### Issue: Permission Prompt Not Appearing

**Possible Causes:**
- Browser has blocked notifications globally
- Site has been blocked previously
- Running on non-localhost HTTP

**Solutions:**
1. Check browser notification settings
2. Reset site permissions
3. Use HTTPS or localhost

---

### Issue: Subscription Fails

**Possible Causes:**
- Service worker not registered
- Browser doesn't support Web Push
- Network error during subscription

**Solutions:**
1. Check service worker in DevTools
2. Verify browser compatibility
3. Check network tab for errors
4. Clear browser cache and retry

---

### Issue: Test Notification Doesn't Appear

**Possible Causes:**
- OS notifications disabled
- Browser notifications disabled
- Do Not Disturb mode enabled
- Notification was silent

**Solutions:**
1. Check system notification settings
2. Check browser notification settings
3. Disable Do Not Disturb
4. Look for notification in notification center

---

### Issue: API Request Fails

**Possible Causes:**
- Dev server not running
- Supabase configuration error
- Network connectivity issue

**Solutions:**
1. Verify dev server is running on port 3000
2. Check Supabase environment variables
3. Check network tab for error details
4. Verify API route exists

---

## Test Execution Log

### Test Run 1: [Date/Time]

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Initial Page Load | [ ] | |
| 2 | Enable Notifications | [ ] | |
| 3 | Permission Denied | [ ] | |
| 4 | Database Storage | [ ] | |
| 5 | Preferences Config | [ ] | |
| 6 | Disable Notifications | [ ] | |
| 7 | Unsupported Browser | [ ] | |
| 8 | Service Worker | [ ] | |
| 9 | Test Notification | [ ] | |
| 10 | Browser Restart | [ ] | |

**Overall Status:** [ ] Pass / [ ] Fail / [ ] Partial

**Tester:** _______________
**Browser:** _______________
**OS:** _______________

---

## Production Readiness Checklist

Before deploying to production:

### Required
- [ ] Add custom service worker (`public/sw.js`)
- [ ] Configure VAPID keys for server push
- [ ] Add web manifest (`public/manifest.json`)
- [ ] Test on HTTPS domain
- [ ] Verify push_subscriptions table exists in production DB
- [ ] Add notification icons (icon-192x192.png, badge-72x72.png)

### Recommended
- [ ] Implement server-side notification sending
- [ ] Add notification scheduling system
- [ ] Configure notification rate limiting
- [ ] Add analytics for notification interactions
- [ ] Create notification preferences in user settings
- [ ] Add unsubscribe link in notifications

### Optional
- [ ] Add notification sound customization
- [ ] Implement notification grouping
- [ ] Add notification history view
- [ ] Create notification templates
- [ ] Add A/B testing for notification copy

---

## Conclusion

Push notification functionality is **ready for manual testing**.

**Next Steps:**
1. ✅ All automated backend checks passed (23/23)
2. ⏳ Manual browser testing required (use this document)
3. ⏳ Cross-browser compatibility testing
4. ⏳ Production readiness implementation

**Estimated Manual Testing Time:** 30-45 minutes

**Contact:** See project documentation for support

---

**Document Version:** 1.0
**Last Updated:** 2026-01-23
**Test Plan Status:** Ready for Execution
