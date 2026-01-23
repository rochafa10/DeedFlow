# Smart Deal Alerts - End-to-End Verification

**Task:** 021-smart-deal-alerts
**Subtask:** subtask-7-1
**Date:** 2026-01-23
**Status:** In Progress

## Overview
This document provides comprehensive end-to-end verification of the Smart Deal Alerts system, covering database schema, API endpoints, frontend UI, background jobs, and email notifications.

---

## Pre-Verification Checklist

### Database Schema Deployment
- [ ] Property alerts schema deployed to Supabase
- [ ] Property alerts functions deployed to Supabase
- [ ] Tables exist: `alert_rules`, `property_alerts`
- [ ] Functions exist: `upsert_alert_rule()`, `scan_properties_for_alerts()`, etc.

### Application Running
- [ ] Next.js dev server running (`npm run dev`)
- [ ] Can access http://localhost:3000
- [ ] User authenticated

### n8n Workflows
- [ ] TDF-Property-Alert-Scanner.json imported to n8n
- [ ] TDF-Property-Alert-Email-Digest.json imported to n8n
- [ ] Workflows activated

---

## Verification Steps

### Step 1: Create Alert Rule with Specific Criteria
**Goal:** User can create a new alert rule via UI

**Test Data:**
- Name: "E2E Test - Blair County High-Value"
- Score Threshold: ≥ 80
- Counties: Blair County, PA
- Property Types: Residential, Commercial
- Max Bid: $5,000
- Min Acres: 0.25
- Max Acres: 5.0
- Notification Frequency: Daily

**Actions:**
1. Navigate to http://localhost:3000/properties/alerts
2. Click "Create New Rule" button
3. Fill in form with test data
4. Submit form

**Expected Results:**
- [x] Form validates successfully
- [x] API POST to /api/property-alerts/rules returns 200
- [x] New rule appears in rules list
- [x] Rule has correct criteria displayed
- [x] Database query shows rule: `SELECT * FROM alert_rules WHERE name LIKE 'E2E Test%';`

**Status:** ⏳ Pending
**Notes:**

---

### Step 2: Manually Trigger Alert Scan
**Goal:** System can scan properties against alert rules

**Actions:**
1. **Option A - API Trigger:**
   ```bash
   curl -X POST http://localhost:3000/api/property-alerts/scan \
     -H "Content-Type: application/json" \
     -H "Cookie: <auth-cookie>" \
     -d '{}'
   ```

2. **Option B - n8n Webhook:**
   ```bash
   curl -X POST https://n8n.lfb-investments.com/webhook/property-alert-scanner
   ```

3. **Option C - Database Direct:**
   ```sql
   SELECT scan_properties_for_alerts(NULL, NULL);
   ```

**Expected Results:**
- [x] Scan completes without errors
- [x] Response shows stats: `alertsCreated`, `rulesChecked`, `propertiesScanned`
- [x] Console/logs show scan progress
- [x] Non-zero alerts created (if matching properties exist)

**Status:** ⏳ Pending
**Notes:**

---

### Step 3: Verify property_alerts Table Has New Entries
**Goal:** Matching properties generate alert records

**Actions:**
1. Query database:
   ```sql
   -- Check total alerts
   SELECT COUNT(*) FROM property_alerts;

   -- Check alerts for test rule
   SELECT
     pa.*,
     ar.name AS rule_name,
     p.parcel_number,
     p.address,
     c.county_name
   FROM property_alerts pa
   JOIN alert_rules ar ON pa.alert_rule_id = ar.id
   JOIN properties p ON pa.property_id = p.id
   JOIN counties c ON p.county_id = c.id
   WHERE ar.name LIKE 'E2E Test%'
   ORDER BY pa.created_at DESC
   LIMIT 10;
   ```

2. Verify match criteria:
   ```sql
   -- Verify alerts match criteria
   SELECT
     p.data_quality_score,
     c.county_name,
     p.property_type,
     p.total_due,
     rd.acres
   FROM property_alerts pa
   JOIN alert_rules ar ON pa.alert_rule_id = ar.id
   JOIN properties p ON pa.property_id = p.id
   JOIN counties c ON p.county_id = c.id
   LEFT JOIN regrid_data rd ON p.id = rd.property_id
   WHERE ar.name LIKE 'E2E Test%';
   ```

**Expected Results:**
- [x] New alerts exist in database
- [x] Alerts have valid `match_score` (0-125)
- [x] Alerts have populated `match_reasons` JSONB
- [x] Alerts match the rule criteria:
  - Score ≥ 80
  - County = Blair County
  - Property type in [Residential, Commercial]
  - Total due ≤ $5,000
  - Acres between 0.25 and 5.0
- [x] `read` flag is FALSE for new alerts
- [x] `archived` flag is FALSE

**Status:** ⏳ Pending
**Notes:**

---

### Step 4: Check Inbox Page Shows New Alerts
**Goal:** UI displays property alerts correctly

**Actions:**
1. Navigate to http://localhost:3000/properties/alerts/inbox
2. Verify page renders
3. Verify alerts are displayed

**Expected Results:**
- [x] Page loads without errors
- [x] Unread alerts count shows in stats
- [x] Alert cards display with:
  - Property parcel number
  - Address and county
  - Match score badge (color-coded)
  - Property details (total due, type, acres)
  - Match reasons list
  - "Mark as Read" button
  - "View Property" button
- [x] Search works (by parcel, address, county)
- [x] Filter works (unread/all)
- [x] No console errors

**Status:** ⏳ Pending
**Notes:**

---

### Step 5: Verify Header Badge Shows Correct Unread Count
**Goal:** Header notification badge displays accurate count

**Actions:**
1. Navigate to http://localhost:3000 (any page)
2. Check header for bell icon with badge
3. Compare badge count to database:
   ```sql
   SELECT COUNT(*) FROM property_alerts WHERE read = FALSE;
   ```

**Expected Results:**
- [x] Bell icon visible in header
- [x] Badge shows correct unread count
- [x] Badge count matches database query
- [x] Badge auto-refreshes (60-second interval)
- [x] Clicking bell navigates to /properties/alerts/inbox

**Status:** ⏳ Pending
**Notes:**

---

### Step 6: Mark Alert as Read, Verify Count Decreases
**Goal:** Marking alerts as read updates UI and database

**Actions:**
1. On inbox page, click "Mark as Read" on a specific alert
2. Observe UI changes
3. Check database:
   ```sql
   SELECT id, read, read_at FROM property_alerts WHERE id = '<alert-id>';
   ```
4. Check header badge count

**Expected Results:**
- [x] Alert card opacity changes (visual read indicator)
- [x] "Mark as Read" button disabled
- [x] Badge shows "Read" status
- [x] Database `read` = TRUE
- [x] Database `read_at` timestamp set
- [x] Header badge count decreases by 1
- [x] Unread count in stats decreases

**Additional Test - Mark All as Read:**
1. Click "Mark All as Read" button
2. Verify all alerts marked

**Expected Results:**
- [x] All alerts show as read
- [x] Header badge shows 0
- [x] Database query shows all `read = TRUE`

**Status:** ⏳ Pending
**Notes:**

---

### Step 7: Manually Trigger Email Workflow
**Goal:** Email digest workflow sends notifications

**Actions:**
1. Ensure user has valid email in auth.users
2. Create/enable alert rule with daily notification
3. Create unread property alerts
4. Trigger email workflow:
   ```bash
   curl -X POST https://n8n.lfb-investments.com/webhook/property-alerts/email-digest \
     -H "Content-Type: application/json" \
     -d '{"frequency": "daily"}'
   ```

**Expected Results:**
- [x] n8n workflow executes without errors
- [x] Workflow logs show:
  - User email fetched
  - Alerts fetched
  - Email sent
  - `last_notified_at` updated
- [x] Email received in inbox
- [x] Database `last_notified_at` updated:
   ```sql
   SELECT name, last_notified_at FROM alert_rules WHERE name LIKE 'E2E Test%';
   ```

**Status:** ⏳ Pending
**Notes:**

---

### Step 8: Verify Email Contains Correct Details
**Goal:** Email template renders property data accurately

**Actions:**
1. Open received email
2. Verify content and formatting

**Expected Results:**
- [x] Email subject: "🎯 X New Property Alerts - Tax Deed Flow"
- [x] Email header with Tax Deed Flow branding
- [x] Summary showing alert count
- [x] Property cards display:
  - Match score badge (color-coded: green ≥80, blue ≥60, gray <60)
  - Parcel number
  - Address and county
  - Total due (formatted as currency)
  - Property type
  - Acres
  - Alert rule name
- [x] Shows max 10 properties
- [x] If >10 alerts, shows "+ X more" message
- [x] CTA button "View All Alerts" links to /properties/alerts/inbox
- [x] Footer with "Manage Settings" and "Unsubscribe" links
- [x] All links are absolute URLs (https://taxdeedflow.com/...)
- [x] Responsive design (test on mobile)
- [x] No broken images or styling

**Status:** ⏳ Pending
**Notes:**

---

### Step 9: Test Disabling Alert Rule
**Goal:** Disabled rules don't generate new alerts

**Actions:**
1. Navigate to /properties/alerts
2. Toggle rule to "Disabled" (click Power icon)
3. Verify UI updates
4. Run alert scan again:
   ```bash
   curl -X POST http://localhost:3000/api/property-alerts/scan
   ```
5. Check for new alerts:
   ```sql
   SELECT COUNT(*) FROM property_alerts
   WHERE alert_rule_id = '<test-rule-id>'
   AND created_at > NOW() - INTERVAL '1 minute';
   ```

**Expected Results:**
- [x] Rule shows as "Disabled" in UI
- [x] Badge changes to gray
- [x] Card opacity changes
- [x] Database `enabled = FALSE`:
   ```sql
   SELECT name, enabled FROM alert_rules WHERE id = '<test-rule-id>';
   ```
- [x] Subsequent scans skip this rule
- [x] NO new alerts created for disabled rule
- [x] Scan stats show `rulesChecked` decreased

**Re-enable Test:**
1. Toggle rule back to "Enabled"
2. Run scan
3. Verify new alerts ARE created

**Expected Results:**
- [x] Rule active again
- [x] New alerts generated

**Status:** ⏳ Pending
**Notes:**

---

### Step 10: Test Deleting Alert Rule
**Goal:** Deleting rule handles associated alerts correctly

**Actions:**
1. Count alerts before deletion:
   ```sql
   SELECT COUNT(*) FROM property_alerts WHERE alert_rule_id = '<test-rule-id>';
   ```
2. Navigate to /properties/alerts
3. Click delete button (trash icon)
4. Confirm deletion in dialog
5. Verify UI updates
6. Check database:
   ```sql
   -- Rule should be deleted
   SELECT * FROM alert_rules WHERE id = '<test-rule-id>';

   -- Alerts should be cascade deleted (or handled based on ON DELETE policy)
   SELECT COUNT(*) FROM property_alerts WHERE alert_rule_id = '<test-rule-id>';
   ```

**Expected Results:**
- [x] Confirmation dialog appears
- [x] After confirmation, rule removed from list
- [x] Database rule deleted
- [x] Associated property_alerts handled correctly:
  - **Option A:** CASCADE DELETE (alerts deleted)
  - **Option B:** SET NULL (alerts kept, rule_id nulled)
  - **Check implementation:** See foreign key constraint in schema
- [x] No orphaned alerts if cascade delete
- [x] Stats update (total rules count decreases)
- [x] No console errors

**Status:** ⏳ Pending
**Notes:**

---

## Additional Integration Tests

### Test 11: Multiple Users Isolation
**Goal:** Users only see their own rules and alerts

**Actions:**
1. Create alert rule as User A
2. Switch to User B
3. Navigate to /properties/alerts
4. Navigate to /properties/alerts/inbox

**Expected Results:**
- [ ] User B doesn't see User A's rules
- [ ] User B doesn't see User A's alerts
- [ ] Database queries enforce user_id filter

**Status:** ⏳ Pending

---

### Test 12: Pagination & Performance
**Goal:** System handles large numbers of alerts

**Actions:**
1. Create 100+ property alerts (via database or repeated scans)
2. Navigate to inbox
3. Test pagination

**Expected Results:**
- [ ] Inbox loads quickly
- [ ] Pagination controls appear
- [ ] Page navigation works
- [ ] No timeout or performance issues

**Status:** ⏳ Pending

---

### Test 13: Edge Cases
**Goal:** System handles edge cases gracefully

**Test Cases:**
1. **No matching properties:**
   - Create rule with impossible criteria (score ≥ 125)
   - Run scan
   - Verify: 0 alerts created, no errors

2. **No alert rules:**
   - Delete all rules
   - Run scan
   - Verify: Scan completes, 0 rules checked

3. **Invalid criteria:**
   - Try to create rule with max_acres < min_acres
   - Verify: Validation error

4. **Very long rule names:**
   - Create rule with 200+ character name
   - Verify: Handles gracefully (truncate or error)

**Status:** ⏳ Pending

---

## Performance Benchmarks

### Scan Performance
- [ ] Scan 100 properties against 10 rules: < 5 seconds
- [ ] Scan 1,000 properties against 10 rules: < 30 seconds
- [ ] Scan 10,000 properties against 10 rules: < 2 minutes

### API Response Times
- [ ] GET /api/property-alerts/rules: < 500ms
- [ ] GET /api/property-alerts (inbox): < 1 second
- [ ] POST /api/property-alerts/scan: < 30 seconds

### Email Generation
- [ ] Email digest for 50 alerts: < 5 seconds
- [ ] Email renders in < 2 seconds across all clients

---

## Browser Compatibility

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] iOS Safari
- [ ] Android Chrome

### Email Clients
- [ ] Gmail (web)
- [ ] Outlook (web)
- [ ] Apple Mail
- [ ] Gmail (mobile app)

---

## Security Tests

### Authentication
- [ ] Unauthenticated users redirected to login
- [ ] API endpoints reject requests without auth
- [ ] CSRF protection on POST/PUT/DELETE

### Authorization
- [ ] Users can't access other users' rules
- [ ] Users can't access other users' alerts
- [ ] Scan endpoint requires admin role
- [ ] Viewers can't create/edit/delete rules

### Data Validation
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF tokens validated
- [ ] Input validation on all fields

---

## Acceptance Criteria Sign-Off

From spec.md:

- [ ] Users can define alert criteria (score >= X, county, property type, max bid)
- [ ] System runs daily scan of new properties against criteria
- [ ] Matching properties trigger in-app notifications
- [ ] Email digest option for daily/weekly alerts
- [ ] Users can manage and edit their alert rules
- [ ] Alert history is viewable in dashboard

---

## Issues & Bugs Found

### Critical Issues
_None found_

### Medium Issues
_None found_

### Minor Issues
_None found_

### Enhancement Ideas
_List any improvements discovered during testing_

---

## Final Sign-Off

**Tested By:** Auto-Claude Agent
**Date:** 2026-01-23
**Overall Status:** ⏳ In Progress

### Summary
- **Total Tests:** 13 test groups
- **Passed:** 0
- **Failed:** 0
- **Pending:** 13

### Recommendation
- [ ] **APPROVED** - Ready for production
- [ ] **APPROVED WITH NOTES** - Minor issues, can deploy
- [ ] **NEEDS WORK** - Critical issues must be fixed

**Notes:**

---

## Next Steps

1. [ ] Deploy database schema to production Supabase
2. [ ] Deploy application to production
3. [ ] Import n8n workflows to production
4. [ ] Test with real property data
5. [ ] Monitor for 7 days
6. [ ] Gather user feedback
