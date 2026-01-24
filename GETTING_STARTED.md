# Agent Activity Feed - Getting Started Guide

## Quick Verification Steps

Since automated tests are blocked by network issues, follow these manual steps to verify the Agent Activity Feed feature:

### Step 1: Visual Inspection (2 minutes)

1. Open your browser to: http://localhost:3000/orchestration

2. Scroll down to find the **Agent Activity Feed** section

3. Verify these elements are present:
   - ✅ "Agent Activity Feed" heading with Activity icon
   - ✅ "Real-time updates from orchestration sessions and agent assignments" subtitle
   - ✅ Search input box with placeholder text
   - ✅ Refresh button (circular arrow icon) in top-right corner

### Step 2: Test Real-Time Updates (5 minutes)

**Option A: Using Supabase Dashboard**

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project → Table Editor
3. Open `orchestration_sessions` table
4. Click "Insert row"
5. Fill in:
   - session_type: `regrid_scraping`
   - status: `active`
   - trigger_source: `manual_test`
   - properties_processed: `0`
   - properties_failed: `0`
   - agents_used: `["Regrid Scraper"]`
   - work_assigned: `100`
   - work_completed: `0`
   - notes: `Test session for verification`
6. Click "Save"
7. **Check browser:** New session should appear in ActivityFeed WITHOUT refresh

**Option B: Using SQL Editor**

1. Open Supabase Dashboard → SQL Editor
2. Run this query:
   ```sql
   INSERT INTO orchestration_sessions (
     session_type, status, trigger_source,
     properties_processed, properties_failed,
     agents_used, work_assigned, work_completed, notes
   ) VALUES (
     'regrid_scraping', 'active', 'manual_test',
     0, 0, ARRAY['Regrid Scraper'], 100, 0,
     'Test session - ' || NOW()::text
   );
   ```
3. **Check browser:** New session should appear immediately

### Step 3: Test Search (2 minutes)

1. In the search box, type: `regrid`
2. Wait 300ms (search is debounced)
3. **Expected:** Only items containing "regrid" display
4. Click the X button to clear search
5. **Expected:** All items return

### Step 4: Test Refresh (1 minute)

1. Click the refresh button (circular arrow icon)
2. **Expected:**
   - Button shows spinning animation
   - "Refreshing..." text appears briefly
   - Feed updates with latest data

## Troubleshooting

### Issue: "No activity yet" message displays

**Cause:** Database has no orchestration sessions or agent assignments

**Solution:** Follow Step 2 above to create test data

### Issue: Changes in database don't appear in feed

**Possible causes:**
1. Real-time subscriptions not enabled in Supabase
2. Network connectivity issues
3. Page not connected to Supabase

**Solutions:**
1. Check Supabase Dashboard → Database → Replication
   - Ensure `orchestration_sessions` is in publication list
   - Ensure `agent_assignments` is in publication list
2. Check browser console for errors
3. Try clicking the refresh button manually

### Issue: Search doesn't filter results

**Possible causes:**
1. Debounce delay (wait 300ms after typing)
2. JavaScript error

**Solutions:**
1. Type slowly and wait before expecting results
2. Check browser console for errors
3. Try refreshing the page

### Issue: Network connectivity errors

**Error:** `Cannot connect to Supabase`

**Solutions:**
1. Check your internet connection
2. Verify firewall isn't blocking supabase.co
3. Try: `ping filvghircyrnlhzaeavm.supabase.co`
4. Check if VPN is interfering

## Manual Test Checklist

Use this quick checklist for verification:

- [ ] ActivityFeed component renders on orchestration page
- [ ] Search input is visible and functional
- [ ] Refresh button is visible and functional
- [ ] Create test session → appears in feed immediately
- [ ] Create test assignment → appears in feed immediately
- [ ] Update session status → updates in feed immediately
- [ ] Search for "regrid" → filters correctly
- [ ] Clear search → all items return
- [ ] Click refresh → data reloads

## SQL Cleanup

After testing, remove test data:

```sql
-- Delete test sessions
DELETE FROM orchestration_sessions
WHERE notes LIKE '%Test session%'
   OR notes LIKE '%manual_test%';

-- Delete test assignments
DELETE FROM agent_assignments
WHERE notes LIKE '%Test assignment%'
   OR notes LIKE '%manual_test%';
```

## Full Documentation

For comprehensive testing instructions, see:
- `VERIFICATION_REPORT.md` - Complete test plan and findings
- `README.md` - Overview of verification package
- `TaxDeedFlow/tests/verify-activity-feed.spec.ts` - Automated test suite (when network is fixed)

## Need Help?

1. Check browser console for errors
2. Verify dev server is running: http://localhost:3000
3. Check Supabase connection in .env.local
4. Review VERIFICATION_REPORT.md troubleshooting section
