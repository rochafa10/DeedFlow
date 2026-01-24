# Offline Functionality Testing Guide

**Date:** 2026-01-24
**Subtask:** subtask-6-2 - Test offline functionality
**Purpose:** Verify PWA offline capabilities and service worker caching

---

## Prerequisites

Before testing offline functionality, ensure:

✓ Dev server is running: `npm run dev` (or production build)
✓ Service worker is registered (check DevTools > Application > Service Workers)
✓ Browser supports service workers (Chrome, Edge, Safari, Firefox)
✓ HTTPS or localhost (service workers require secure context)

---

## Testing Environment Setup

### Option 1: Chrome DevTools (Recommended)

1. Open Chrome/Edge DevTools (F12)
2. Navigate to **Application** tab
3. Check **Service Workers** section - should show registered service worker
4. Check **Cache Storage** - will populate as you browse

### Option 2: Production Build (More realistic)

```bash
cd TaxDeedFlow
npm run build
npm start
```

**Note:** Production build is required for service worker to activate in production mode.

---

## Test Plan

### Test 1: Initial Cache Population (Online)

**Objective:** Verify that browsing while online populates the cache

**Steps:**
1. Clear all cache: DevTools > Application > Clear storage > Clear site data
2. Reload the page (Ctrl+R or Cmd+R)
3. Navigate to **/properties** page
4. Navigate to **/auctions** page
5. Navigate to **/watchlist** page
6. Check DevTools > Application > Cache Storage

**Expected Results:**
- ✓ Service worker registered successfully
- ✓ Cache Storage shows 3 caches:
  - `tax-deed-flow-static-v1` (CSS, JS, fonts, images)
  - `tax-deed-flow-api-v1` (API responses)
  - `tax-deed-flow-images-v1` (property images)
- ✓ Cached pages visible in cache viewer
- ✓ Static assets (CSS, JS) cached
- ✓ API responses cached (properties, auctions, alerts)

**How to Verify:**
```javascript
// Open DevTools Console and run:
caches.keys().then(console.log);
// Should show: ["tax-deed-flow-static-v1", "tax-deed-flow-api-v1", "tax-deed-flow-images-v1"]

caches.open('tax-deed-flow-api-v1').then(cache => cache.keys()).then(console.log);
// Should show cached API requests
```

---

### Test 2: Offline Page Load (Airplane Mode)

**Objective:** Verify app shows cached content when offline

**Steps:**
1. With caches populated (from Test 1), enable airplane mode:
   - **Windows:** Settings > Network & Internet > Airplane mode > On
   - **Mac:** Control Center > Wi-Fi > Off (or airplane mode)
   - **Chrome DevTools:** Network tab > Offline (faster option)
2. Refresh the page (Ctrl+R or Cmd+R)
3. Observe what loads

**Expected Results:**
- ✓ Page loads successfully (no connection error)
- ✓ Layout and styles render correctly
- ✓ Cached data displays (properties, auctions, watchlist)
- ✓ **OfflineBanner** appears at top: "No internet connection"
- ✓ Navigation works (Header, BottomNav)
- ✓ No JavaScript errors in console

**What NOT to Expect:**
- ✗ Real-time data updates (can't fetch new data)
- ✗ API mutations (can't create/update/delete)
- ✗ New images loading (only cached images display)

---

### Test 3: Navigate Between Cached Pages (Offline)

**Objective:** Verify navigation works for previously visited pages

**Steps:**
1. Remain offline (airplane mode or DevTools offline)
2. Click on **Properties** in navigation
3. Click on **Auctions** in navigation
4. Click on **Watchlist** in navigation
5. Click on **Dashboard** in navigation
6. Use BottomNav on mobile to navigate

**Expected Results:**
- ✓ All previously visited pages load from cache
- ✓ No "Offline" fallback page appears
- ✓ Page transitions are smooth
- ✓ Data from last online session displays
- ✓ Offline banner remains visible at top
- ✓ Navigation is responsive

**Success Criteria:**
All pages that were visited while online should work perfectly offline.

---

### Test 4: Navigate to Uncached Page (Offline)

**Objective:** Verify offline fallback page appears for uncached routes

**Steps:**
1. Remain offline
2. Navigate to a page you have NOT visited yet (e.g., **/settings**)
3. Or manually type: `http://localhost:3000/counties` (if not visited)
4. Press Enter

**Expected Results:**
- ✓ **Offline fallback page** loads (`/offline` page)
- ✓ Shows "You're Offline" heading
- ✓ Shows WifiOff icon
- ✓ Shows "No Internet Connection" message
- ✓ "Try Again" button is visible
- ✓ "Go to Home" link is visible
- ✓ "Available Offline" section lists cached features:
  - Properties you've viewed
  - Your watchlist
  - Auction data you've browsed
- ✓ Dark mode works on offline page

**How to Test Manually:**
```
1. Clear cache
2. Go online, visit: /, /properties, /auctions
3. Go offline
4. Try to visit /counties (not cached) → should show offline page
5. Try to visit /settings (not cached) → should show offline page
6. Try to visit /properties (cached) → should show cached properties
```

---

### Test 5: Offline Banner Behavior

**Objective:** Verify offline detection banner works correctly

**Steps:**
1. Start **online** (disable airplane mode)
2. Observe banner (should not be visible)
3. Enable **offline mode** (airplane mode or DevTools)
4. Wait 1-2 seconds
5. Observe banner
6. Disable **offline mode** (go back online)
7. Observe banner

**Expected Results:**

**When Offline:**
- ✓ Amber/yellow banner appears at top
- ✓ WifiOff icon visible
- ✓ Message: "No internet connection. You can still browse cached content."
- ✓ Banner has role="alert" and aria-live="polite"
- ✓ Fixed positioning (z-50, appears above all content)

**When Back Online:**
- ✓ Green banner appears: "Connection restored"
- ✓ Wifi icon visible
- ✓ Banner auto-hides after 3 seconds
- ✓ Amber offline banner disappears

**Implementation Check:**
The OfflineBanner component uses:
- `navigator.onLine` API for initial state
- `window.addEventListener('online')` for reconnection
- `window.addEventListener('offline')` for disconnection

---

### Test 6: API Request Handling (Offline)

**Objective:** Verify API requests fall back to cached responses when offline

**Steps:**
1. Go **online**
2. Open DevTools > Network tab
3. Navigate to **/properties**
4. Observe network request: `GET /api/properties` (200 OK)
5. Go **offline**
6. Refresh **/properties** page
7. Observe network request

**Expected Results:**
- ✓ API request shows `(from ServiceWorker)` in Network tab
- ✓ Response is cached data (may be stale)
- ✓ Page renders with cached data
- ✓ No network error in console
- ✓ User sees last known data state

**Service Worker Strategy:**
The service worker uses a **network-first** strategy for API requests:
```javascript
// From public/sw.js
if (url.pathname.startsWith('/api/')) {
  // Try network first, fall back to cache if offline
  return networkFirstStrategy(event);
}
```

---

### Test 7: Static Asset Caching (Offline)

**Objective:** Verify CSS, JS, fonts, and images load from cache

**Steps:**
1. Go **online**
2. Load the homepage (all assets download)
3. Open DevTools > Network tab
4. Go **offline**
5. Hard refresh (Ctrl+Shift+R)
6. Observe Network tab

**Expected Results:**
- ✓ All static assets load from ServiceWorker cache
- ✓ Network tab shows `(ServiceWorker)` for assets
- ✓ CSS styles render correctly
- ✓ JavaScript executes (interactive elements work)
- ✓ Fonts display correctly
- ✓ Previously viewed images appear

**Service Worker Strategy:**
Static assets use a **cache-first** strategy:
```javascript
// From public/sw.js
if (
  url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?|ttf|eot)$/)
) {
  return cacheFirstStrategy(event);
}
```

---

### Test 8: Reconnection and Data Sync (Online → Offline → Online)

**Objective:** Verify app syncs data when reconnecting

**Steps:**
1. Start **online**
2. Browse properties, auctions (data loads fresh)
3. Go **offline** (airplane mode)
4. Browse cached pages (stale data displays)
5. Go back **online**
6. Wait 2-3 seconds
7. Refresh the page or navigate to a new page

**Expected Results:**

**When Going Online:**
- ✓ Green "Connection restored" banner appears
- ✓ Banner auto-hides after 3 seconds
- ✓ New API requests hit the network (not cache)
- ✓ Fresh data replaces stale cached data
- ✓ User sees updated property counts, auction dates, etc.

**Expected Behavior:**
- Service worker continues using cached data until page refresh
- On next navigation or refresh, fresh data is fetched
- No automatic background sync (not implemented in this version)

**Future Enhancement:**
Background Sync API could be added to automatically sync when reconnecting:
```javascript
// Not yet implemented
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-properties') {
    event.waitUntil(syncProperties());
  }
});
```

---

### Test 9: Offline Functionality on Mobile Devices

**Objective:** Verify offline mode works on iOS and Android

**Setup:**
1. Install PWA on mobile device (see pwa-install-testing-guide.md)
2. Launch app in standalone mode
3. Browse several pages while online
4. Enable airplane mode on device

**Steps (iOS):**
1. Open installed Tax Deed Flow app
2. Navigate to Settings > Airplane Mode > On
3. Return to app
4. Browse previously visited pages
5. Try to visit new page

**Steps (Android):**
1. Open installed Tax Deed Flow app
2. Swipe down > Enable Airplane Mode
3. Return to app
4. Browse previously visited pages
5. Try to visit new page

**Expected Results:**
- ✓ Offline banner appears at top
- ✓ Cached pages load successfully
- ✓ Uncached pages show offline fallback
- ✓ BottomNav works for navigation
- ✓ Images previously viewed display correctly
- ✓ No app crash or white screen

---

## Service Worker Cache Strategies

The PWA implements three caching strategies:

### 1. Cache-First (Static Assets)
**Used for:** Images, CSS, JS, fonts
**Logic:** Check cache first, fall back to network if not cached
**Benefit:** Instant load times, works fully offline

### 2. Network-First (API Requests)
**Used for:** `/api/*` endpoints
**Logic:** Try network first, fall back to cache if offline
**Benefit:** Fresh data when online, stale data when offline

### 3. Navigation (HTML Pages)
**Used for:** Page navigations
**Logic:** Try network first, fall back to cache, then offline page
**Benefit:** Fast page loads, graceful offline degradation

---

## Cache Inspection Commands

Run these in DevTools Console to inspect caches:

```javascript
// List all caches
caches.keys().then(keys => console.log('Caches:', keys));

// List items in static cache
caches.open('tax-deed-flow-static-v1')
  .then(cache => cache.keys())
  .then(keys => console.log('Static cache:', keys));

// List items in API cache
caches.open('tax-deed-flow-api-v1')
  .then(cache => cache.keys())
  .then(keys => console.log('API cache:', keys));

// Delete all caches (for testing)
caches.keys().then(keys => {
  return Promise.all(keys.map(key => caches.delete(key)));
}).then(() => console.log('All caches cleared'));

// Check if service worker is active
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg ? 'Active' : 'Not registered');
});
```

---

## Troubleshooting

### Issue: Service Worker Not Registering

**Symptoms:**
- DevTools > Application shows no service worker
- Cache Storage is empty
- Offline mode doesn't work

**Solutions:**
1. Verify you're on HTTPS or localhost (required)
2. Check console for registration errors
3. Verify `public/sw.js` exists
4. Check `ServiceWorkerRegistration.tsx` component
5. Use production mode: `npm run build && npm start`

### Issue: Cache Not Populating

**Symptoms:**
- Service worker is active but Cache Storage is empty
- Offline mode shows offline page immediately

**Solutions:**
1. Check Network tab: requests should show `(from ServiceWorker)`
2. Verify sw.js has no syntax errors (check Console)
3. Clear all caches and reload
4. Check sw.js install/activate event handlers
5. Verify fetch event listener is working

### Issue: Stale Data Showing When Online

**Symptoms:**
- App shows old data even when online
- Data doesn't refresh after reconnecting

**Solutions:**
1. Hard refresh: Ctrl+Shift+R (bypasses service worker)
2. Clear cache in DevTools > Application > Clear storage
3. Update service worker: Increment version in sw.js (`v1` → `v2`)
4. Implement cache expiration strategy (future enhancement)

### Issue: Offline Page Appears for Cached Pages

**Symptoms:**
- Pages you visited while online show offline fallback

**Solutions:**
1. Verify pages are actually cached:
   ```javascript
   caches.match('/properties').then(response => {
     console.log('Cached:', response ? 'Yes' : 'No');
   });
   ```
2. Check service worker fetch handler logic
3. Verify navigation request handling in sw.js
4. Check for service worker errors in Console

### Issue: Offline Banner Doesn't Appear

**Symptoms:**
- Go offline but banner doesn't show
- Banner doesn't update on reconnection

**Solutions:**
1. Check OfflineBanner component is in layout.tsx
2. Verify `navigator.onLine` is supported (should be in all modern browsers)
3. Check browser console for component errors
4. Test with DevTools > Network > Offline (more reliable than airplane mode)
5. Verify OfflineBanner is not hidden by CSS (check z-index)

---

## Success Criteria Summary

This subtask is **COMPLETE** when all of the following work:

### ✓ Online Behavior
- [ ] Pages load normally when online
- [ ] API requests fetch fresh data
- [ ] No offline banner visible
- [ ] Service worker caches visited pages

### ✓ Offline Behavior
- [ ] Offline banner appears when disconnected
- [ ] Previously visited pages load from cache
- [ ] Uncached pages show offline fallback
- [ ] Static assets (CSS, JS, images) load from cache
- [ ] Navigation works between cached pages
- [ ] No white screen or app crash

### ✓ Reconnection Behavior
- [ ] Green "Connection restored" banner appears
- [ ] Banner auto-hides after 3 seconds
- [ ] Fresh data loads on next request
- [ ] Offline banner disappears

### ✓ Service Worker
- [ ] Registered successfully in DevTools
- [ ] Cache Storage shows 3 caches
- [ ] Fetch events intercepted correctly
- [ ] Install and activate events fire
- [ ] Version management works (v1, v2, etc.)

### ✓ Offline Page
- [ ] Displays for uncached routes
- [ ] Shows helpful messaging
- [ ] "Try Again" button works
- [ ] "Go to Home" link works
- [ ] Dark mode supported

---

## Testing Checklist

Use this checklist to verify all offline functionality:

```
ONLINE TESTING:
[ ] Service worker registers on page load
[ ] Cache Storage populates as you browse
[ ] Static assets cache (CSS, JS, fonts, images)
[ ] API responses cache
[ ] No offline banner visible

OFFLINE TESTING:
[ ] Offline banner appears when disconnected
[ ] Homepage loads from cache
[ ] /properties page loads from cache
[ ] /auctions page loads from cache
[ ] /watchlist page loads from cache
[ ] Uncached page shows offline fallback
[ ] Static assets load from cache
[ ] Navigation works between cached pages
[ ] No console errors

RECONNECTION TESTING:
[ ] Green banner appears when reconnected
[ ] Banner auto-hides after 3 seconds
[ ] Fresh data loads on next request
[ ] Offline banner disappears

MOBILE TESTING (iOS/Android):
[ ] Install PWA on device
[ ] Browse pages while online
[ ] Enable airplane mode
[ ] Verify offline functionality works
[ ] Verify BottomNav works offline
[ ] Re-enable connection
[ ] Verify data syncs
```

---

## Test Results

### Test Execution Date: ___________

### Tester: ___________

### Environment:
- [ ] Chrome Desktop
- [ ] Edge Desktop
- [ ] Safari Desktop
- [ ] Firefox Desktop
- [ ] iOS Safari
- [ ] Android Chrome

### Results:

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Cache Population | ⬜ Pass / ⬜ Fail | |
| Test 2: Offline Page Load | ⬜ Pass / ⬜ Fail | |
| Test 3: Cached Page Navigation | ⬜ Pass / ⬜ Fail | |
| Test 4: Uncached Page Fallback | ⬜ Pass / ⬜ Fail | |
| Test 5: Offline Banner | ⬜ Pass / ⬜ Fail | |
| Test 6: API Caching | ⬜ Pass / ⬜ Fail | |
| Test 7: Static Asset Caching | ⬜ Pass / ⬜ Fail | |
| Test 8: Reconnection & Sync | ⬜ Pass / ⬜ Fail | |
| Test 9: Mobile Offline | ⬜ Pass / ⬜ Fail | |

### Overall Result:
- [ ] All tests passed - Subtask 6-2 COMPLETE
- [ ] Some tests failed - See notes above

---

## Next Steps

After completing offline functionality testing:

1. **Document results** in this guide
2. **Fix any issues** discovered during testing
3. **Update implementation_plan.json** - Mark subtask-6-2 as "completed"
4. **Commit changes:** `git commit -m "auto-claude: subtask-6-2 - Test offline functionality"`
5. **Move to subtask-6-3:** Test push notifications end-to-end
6. **Move to subtask-6-4:** Run Lighthouse PWA audit

---

## Additional Resources

- **Service Worker Specification:** https://w3c.github.io/ServiceWorker/
- **MDN Service Worker API:** https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **PWA Offline Best Practices:** https://web.dev/offline-fallback-page/
- **Cache API:** https://developer.mozilla.org/en-US/docs/Web/API/Cache
- **Navigator.onLine:** https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine

---

**End of Offline Functionality Testing Guide**
