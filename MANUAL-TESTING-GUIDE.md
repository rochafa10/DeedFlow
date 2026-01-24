# Manual Testing Guide: Property Override Flow

## Overview
This guide provides step-by-step instructions for manually testing the Property Changes Persistence feature end-to-end. This ensures all user stories from the specification are verified.

## Prerequisites

### 1. Environment Setup
- ✅ Next.js development server running (`npm run dev`)
- ✅ Supabase project configured with proper environment variables
- ✅ Database migration applied (property_overrides table exists)
- ✅ Test user account with 'analyst' or 'admin' role

### 2. Verify Database Setup
Before testing, confirm the database is ready:

```sql
-- Check table exists
SELECT * FROM information_schema.tables
WHERE table_name = 'property_overrides';

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN (
  'upsert_property_override',
  'revert_property_override',
  'get_property_overrides',
  'get_override_history'
);
```

### 3. Test Data Setup
You need at least one property in the database for testing:

```sql
-- Find a test property
SELECT id, parcel_id, property_address, total_due, assessed_value
FROM properties
LIMIT 1;

-- Note the property ID for testing
```

---

## Test Scenarios

### Scenario 1: Edit Property Field and Verify Persistence

**User Story:** _As an investor, I want my property corrections to be saved so that I don't lose my work_

#### Steps:
1. **Navigate to Property Detail Page**
   - Open browser to `http://localhost:3000/properties`
   - Click on any property from the list
   - Note the current value of `Total Due` field (e.g., $1,000)

2. **Enter Edit Mode**
   - Click the "Edit" button in the top right corner
   - Verify all editable fields become input fields

3. **Modify a Field**
   - Change the `Total Due` value to $1,500
   - Optionally add other changes (address, city, etc.)

4. **Save Changes**
   - Click the "Save" button
   - **Expected:** Button shows loading state ("Saving...")
   - **Expected:** Save completes successfully
   - **Expected:** Edit mode exits automatically
   - **Expected:** New value ($1,500) is displayed

5. **Verify API Call** (Check browser DevTools Network tab)
   - **Expected:** PATCH request to `/api/properties/[id]`
   - **Expected:** Request payload contains: `{"total_due": 1500}`
   - **Expected:** Response status: 200 OK
   - **Expected:** Response body contains updated property

6. **Test Persistence - Page Refresh**
   - Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
   - **Expected:** Page loads successfully
   - **Expected:** `Total Due` still shows $1,500 (not original $1,000)
   - **Expected:** No data loss

✅ **Pass Criteria:** Field value persists after page refresh

---

### Scenario 2: Override Indicator Visibility

**User Story:** _As an investor, I want to see which fields I've modified so that I know what's original vs custom_

#### Steps:
1. **Check for Override Indicator**
   - After completing Scenario 1, locate the `Total Due` field
   - **Expected:** Small badge/pill appears next to the "Total Due ($)" label
   - **Expected:** Badge has distinct styling (e.g., colored background)
   - **Expected:** Badge text reads "Modified" or similar

2. **Verify Other Fields**
   - Check other fields that were NOT modified (e.g., Address, City)
   - **Expected:** No override indicator on unmodified fields

3. **Verify Database Record** (Optional - via Supabase dashboard)
   ```sql
   SELECT * FROM property_overrides
   WHERE property_id = '[test-property-id]'
   AND field_name = 'total_due'
   AND is_active = true;
   ```
   - **Expected:** One record exists
   - **Expected:** `original_value`: "1000"
   - **Expected:** `override_value`: "1500"
   - **Expected:** `is_active`: true

✅ **Pass Criteria:** Override indicator appears only on modified fields

---

### Scenario 3: Tooltip Shows Original Value

**User Story:** _As an investor, I want to see which fields I've modified so that I know what's original vs custom_

#### Steps:
1. **Hover Over Indicator**
   - Move mouse over the override indicator badge on `Total Due`
   - Wait for tooltip to appear (should be instant or <500ms)

2. **Verify Tooltip Content**
   - **Expected:** Tooltip displays
   - **Expected:** Shows "Original: $1,000" (or similar formatting)
   - **Expected:** May show modification reason if provided
   - **Expected:** May show who made the change and when

3. **Test Tooltip Behavior**
   - Move mouse away
   - **Expected:** Tooltip disappears
   - Move mouse back
   - **Expected:** Tooltip reappears

✅ **Pass Criteria:** Tooltip displays original value correctly

---

### Scenario 4: View Change History

**User Story:** _As an investor, I want to see which fields I've modified so that I know what's original vs custom_

#### Steps:
1. **Open Change History Modal**
   - Locate the "View Changes" button (should be next to Edit button)
   - Click "View Changes"
   - **Expected:** Modal dialog opens

2. **Verify Modal Content**
   - **Expected:** Modal title: "Change History" or similar
   - **Expected:** Lists all modifications made to this property
   - **Expected:** For each change, displays:
     - Field name (e.g., "Total Due")
     - Before value ("$1,000")
     - After value ("$1,500")
     - Arrow or visual indicator showing change direction
     - Timestamp (e.g., "2 hours ago" or formatted date)
     - User who made the change
     - Status badge ("Active" or "Reverted")

3. **Verify Multiple Changes** (if tested)
   - If you modified multiple fields, all should appear
   - **Expected:** Changes grouped by field name
   - **Expected:** Chronological order (newest first)

4. **Test Empty State** (use a fresh property with no overrides)
   - **Expected:** Shows "No changes yet" or similar message

5. **Close Modal**
   - Click X or "Close" button
   - **Expected:** Modal closes
   - **Expected:** Can reopen and see same data

✅ **Pass Criteria:** Change history accurately reflects all modifications

---

### Scenario 5: Revert Field to Original Value

**User Story:** _As an investor, I want to undo my changes so that I can restore original data if needed_

#### Steps:
1. **Trigger Revert**
   - Click on the override indicator badge on `Total Due` field
   - **OR** Find revert button/link in the tooltip or modal
   - **Expected:** Confirmation prompt may appear (optional)

2. **Confirm Revert**
   - If confirmation appears, click "Revert" or "Yes"
   - **Expected:** Loading state shows briefly

3. **Verify Immediate UI Update**
   - **Expected:** Field value changes from $1,500 back to $1,000
   - **Expected:** Override indicator disappears
   - **Expected:** Success message or toast notification (optional)

4. **Verify API Call** (Check DevTools Network tab)
   - **Expected:** DELETE request to `/api/properties/[id]/overrides?field=total_due`
   - **Expected:** Response status: 200 OK
   - **Expected:** Response message: "Override reverted successfully"

5. **Check Change History Again**
   - Open "View Changes" modal
   - **Expected:** The total_due change now shows status "Reverted"
   - **Expected:** Original change record is preserved (not deleted)
   - **Expected:** May show a new entry for the revert action

6. **Verify Database** (Optional - via Supabase)
   ```sql
   SELECT * FROM property_overrides
   WHERE property_id = '[test-property-id]'
   AND field_name = 'total_due'
   ORDER BY created_at DESC;
   ```
   - **Expected:** Record still exists
   - **Expected:** `is_active`: false (not true)
   - **Expected:** Preserves history

✅ **Pass Criteria:** Revert restores original value and updates UI

---

### Scenario 6: Revert Persistence

**User Story:** _As an investor, I want my property corrections to be saved so that I don't lose my work_

#### Steps:
1. **After Completing Scenario 5**
   - Verify field shows original value ($1,000)
   - Verify no override indicator visible

2. **Refresh Page**
   - Hard refresh (Ctrl+Shift+R)
   - **Expected:** Page loads successfully

3. **Verify State Persisted**
   - **Expected:** `Total Due` shows $1,000 (original value)
   - **Expected:** No override indicator visible
   - **Expected:** Field looks exactly as it did before any edits

4. **Check Change History**
   - Open "View Changes" modal
   - **Expected:** History shows both the original edit AND the revert
   - **Expected:** Clearly indicates the field is no longer modified

✅ **Pass Criteria:** Reverted state persists across page refreshes

---

## Advanced Test Scenarios

### Scenario 7: Multiple Field Edits

1. Edit multiple fields at once (address, city, total_due, assessed_value)
2. Save all changes
3. Verify all fields show override indicators
4. Refresh page - verify all persist
5. Revert one field - verify only that indicator disappears
6. Verify other fields remain modified

### Scenario 8: Re-editing a Field

1. Edit total_due from $1,000 to $1,500
2. Save and verify
3. Edit total_due again from $1,500 to $2,000
4. Save and verify
5. Check change history - should show progression
6. Revert - should return to original $1,000 (not $1,500)

### Scenario 9: Permission Testing

1. Log out and try to edit as unauthenticated user
   - **Expected:** Cannot enter edit mode OR save fails with 401 error

2. Log in as 'viewer' role
   - **Expected:** Cannot save changes (403 Forbidden)

3. Log in as 'analyst' or 'admin' role
   - **Expected:** Can save changes successfully

### Scenario 10: Edge Cases

1. **Empty Value:** Try to save a field with empty value
   - Test if validation prevents this or if it's allowed

2. **Invalid Data:** Try to save non-numeric value in Total Due
   - **Expected:** Client-side validation prevents or server returns 400

3. **Concurrent Edits:** Open property in two browser tabs
   - Edit different fields in each tab
   - Save both and verify no data loss

4. **Network Error Simulation:**
   - Disable network in DevTools
   - Try to save changes
   - **Expected:** Error message shown
   - Re-enable network and retry
   - **Expected:** Changes eventually save

---

## Acceptance Criteria Checklist

From the original specification:

- [ ] User property overrides persist to Supabase
  - _Tested in Scenario 1, Step 6_

- [ ] Changes survive page refresh and new sessions
  - _Tested in Scenario 1, Step 6 and Scenario 6_

- [ ] Users can see which fields they've modified
  - _Tested in Scenario 2 and Scenario 3_

- [ ] Users can revert to original data if needed
  - _Tested in Scenario 5 and Scenario 6_

- [ ] Change history is tracked with timestamps
  - _Tested in Scenario 4_

---

## Troubleshooting

### Issue: "Database not configured" error
**Solution:** Verify `.env.local` has correct Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Issue: 401 Unauthorized on save
**Solution:** Ensure you're logged in with analyst or admin role

### Issue: Override indicator doesn't appear
**Solution:**
1. Check DevTools console for errors
2. Verify API response includes override data
3. Check `usePropertyOverrides` hook is being called

### Issue: Changes don't persist after refresh
**Solution:**
1. Check Network tab - verify PATCH request succeeded
2. Verify database migration was applied
3. Check server logs for errors

---

## Manual Test Execution Checklist

**Tester:** _______________
**Date:** _______________
**Environment:** _______________
**Browser:** _______________

| Scenario | Pass | Fail | Notes |
|----------|------|------|-------|
| 1. Edit & Persist | ☐ | ☐ | |
| 2. Override Indicator | ☐ | ☐ | |
| 3. Tooltip Original | ☐ | ☐ | |
| 4. Change History | ☐ | ☐ | |
| 5. Revert Field | ☐ | ☐ | |
| 6. Revert Persist | ☐ | ☐ | |
| 7. Multiple Fields | ☐ | ☐ | |
| 8. Re-editing | ☐ | ☐ | |
| 9. Permissions | ☐ | ☐ | |
| 10. Edge Cases | ☐ | ☐ | |

**Overall Result:** ☐ PASS ☐ FAIL

**Issues Found:**
_____________________________________________
_____________________________________________

**Sign-off:** _______________

---

## Next Steps After Testing

If all tests pass:
1. ✅ Mark subtask-5-1 as completed
2. ✅ Update implementation_plan.json
3. ✅ Proceed to subtask-5-2 (database migration)
4. ✅ Deploy to staging environment
5. ✅ Conduct user acceptance testing (UAT)

If tests fail:
1. Document failures in e2e-test-report.md
2. Create GitHub issues for each bug
3. Fix issues before marking subtask complete
4. Re-test after fixes
