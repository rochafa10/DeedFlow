# E2E Testing Checklist - Property Watchlist System

**Subtask:** subtask-4-4
**Date:** 2026-01-23
**Dev Server:** http://localhost:3000
**Authentication Required:** YES

---

## Prerequisites

Before starting, ensure:
- ✅ Dev server is running: `cd TaxDeedFlow && npm run dev`
- ✅ Database migrations applied (watchlists and watchlist_items tables exist)
- ✅ You are logged in as an authenticated user (admin or analyst role)
- ✅ Browser console open for debugging (F12)
- ✅ Network tab open to monitor API calls

---

## Test Flow Walkthrough

### ✅ Test 1: Create Watchlist "High Priority"

**Steps:**
1. Navigate to http://localhost:3000/watchlist
2. Look for "Create Watchlist" or "+ New Watchlist" button
3. Click the button to open modal
4. Fill in the form:
   - **Name:** `High Priority`
   - **Description:** `Properties for immediate bidding`
   - **Color:** Select red or any color
5. Click "Create" button

**✅ Success Criteria:**
- [ ] Modal opens without errors
- [ ] Form fields are visible and functional
- [ ] Success toast appears: "Watchlist created successfully" (or similar)
- [ ] Modal closes automatically after creation
- [ ] "High Priority" watchlist appears in the sidebar/list
- [ ] Console shows no errors
- [ ] Network tab shows `POST /api/watchlist` with status 201

**🐛 Common Issues:**
- **401 Unauthorized:** Not logged in - go to /login first
- **403 Forbidden:** Logged in as viewer - need admin/analyst role
- **409 Conflict:** Watchlist with name "High Priority" already exists - delete it or use different name
- **Modal doesn't open:** Check console for JavaScript errors

---

### ✅ Test 2: Add Property to Watchlist from Properties Page

**Steps:**
1. Navigate to http://localhost:3000/properties
2. Find any property in the table/list
3. In the "Actions" column, locate the Heart icon (watchlist button)
4. Click the Heart icon
5. Dropdown should appear with all your watchlists
6. Click on "High Priority" from the dropdown

**✅ Success Criteria:**
- [ ] Heart icon is visible in each property row
- [ ] Clicking opens dropdown menu
- [ ] "High Priority" watchlist is listed in dropdown
- [ ] Dropdown shows watchlist color and item count
- [ ] Success toast appears: "Added to High Priority" (or similar)
- [ ] Dropdown closes after selection
- [ ] Console shows no errors
- [ ] Network tab shows `POST /api/watchlist/items` with status 201

**🐛 Common Issues:**
- **409 Conflict:** Property already in "High Priority" watchlist - shows info toast
- **Dropdown doesn't open:** Check console for errors
- **Empty dropdown:** No watchlists exist - create one first

---

### ✅ Test 3: Verify Property in Watchlist

**Steps:**
1. Navigate to http://localhost:3000/watchlist
2. In the sidebar or dropdown, select "High Priority" watchlist
3. Verify the property you added appears in the list
4. Check that property details are correct:
   - Parcel ID
   - Property Address
   - Total Due amount
   - Auction Date (if available)

**✅ Success Criteria:**
- [ ] Watchlist page loads successfully
- [ ] "High Priority" is selectable from watchlist switcher
- [ ] Property added in Test 2 is visible in the list
- [ ] All property details display correctly
- [ ] Item count shows "1" (or correct number)
- [ ] Console shows no errors
- [ ] Network tab shows `GET /api/watchlist/items?watchlist_id=[id]` with status 200

**🐛 Common Issues:**
- **Property not showing:** Check if it was actually added (look for success toast in Test 2)
- **Wrong watchlist selected:** Use dropdown to switch to "High Priority"
- **Empty list:** Property might have been added to different watchlist

---

### ✅ Test 4: Update Max Bid

**Steps:**
1. On watchlist page with "High Priority" selected
2. Find the property you added
3. Look for "Max Bid" field or "Edit Max Bid" button
4. Click to edit (field becomes input or modal opens)
5. Enter value: `15000`
6. Click "Save" button or press Enter
7. Observe the save confirmation

**✅ Success Criteria:**
- [ ] Max bid field is editable (click to edit or always editable)
- [ ] Can enter numeric value "15000"
- [ ] Save/Cancel buttons appear (if inline editing)
- [ ] Success toast appears: "Max bid updated" (or similar)
- [ ] Value persists and shows "$15,000" after save
- [ ] Cancel button reverts changes if clicked
- [ ] Console shows no errors
- [ ] Network tab shows `PUT /api/watchlist/items/[id]` with status 200

**🐛 Common Issues:**
- **Field not editable:** Check if edit button needs to be clicked first
- **Value doesn't persist:** Check network tab for failed PUT request
- **403 Forbidden:** Logged in as viewer - need admin/analyst role

---

### ✅ Test 5: Create Second Watchlist "Research Needed"

**Steps:**
1. On watchlist page
2. Click "Create Watchlist" button again
3. Fill in the form:
   - **Name:** `Research Needed`
   - **Description:** `Properties requiring additional research`
   - **Color:** Select yellow or different color from first watchlist
4. Click "Create" button

**✅ Success Criteria:**
- [ ] Modal opens with empty form (not pre-filled)
- [ ] Form validates required fields
- [ ] Success toast appears: "Watchlist created successfully"
- [ ] Modal closes automatically
- [ ] "Research Needed" appears in sidebar
- [ ] Total watchlist count is now 2
- [ ] Both watchlists are visible and selectable
- [ ] Console shows no errors
- [ ] Network tab shows `POST /api/watchlist` with status 201

**🐛 Common Issues:**
- **Form pre-filled with old data:** Clear form before opening or refresh page
- **409 Conflict:** Watchlist named "Research Needed" already exists

---

### ✅ Test 6: Move Property to Different List

**Steps:**
1. On watchlist page, select "High Priority" watchlist
2. Find the property with max bid $15,000
3. Click the Delete/Trash icon to remove from "High Priority"
4. Confirm deletion if dialog appears
5. Property should disappear from the list
6. Now navigate to http://localhost:3000/properties
7. Find the same property (search by parcel ID or address)
8. Click the Heart icon
9. Select "Research Needed" from dropdown
10. Return to http://localhost:3000/watchlist
11. Select "Research Needed" watchlist
12. Verify property now appears there

**✅ Success Criteria:**
- [ ] Property removes from "High Priority" successfully
- [ ] Success toast: "Removed from watchlist"
- [ ] Property disappears from "High Priority" list
- [ ] Can add same property to "Research Needed" without error
- [ ] Success toast: "Added to Research Needed"
- [ ] Property appears in "Research Needed" list
- [ ] Item count for "High Priority" decreased by 1
- [ ] Item count for "Research Needed" increased by 1
- [ ] Console shows no errors
- [ ] Network tab shows:
  - `DELETE /api/watchlist/items/[id]` with status 200
  - `POST /api/watchlist/items` with status 201

**🐛 Common Issues:**
- **Can't find same property again:** Note the parcel ID before deleting
- **409 Conflict when adding:** Property wasn't actually deleted from first list

---

### ✅ Test 7: Delete Property from Watchlist

**Steps:**
1. On watchlist page, select "Research Needed" watchlist
2. Find the property you just moved
3. Click the Delete/Trash icon
4. Confirm deletion if prompted
5. Observe property removal

**✅ Success Criteria:**
- [ ] Delete button/icon is visible next to property
- [ ] Confirmation dialog appears (optional feature)
- [ ] Success toast: "Removed from watchlist" or "Property deleted"
- [ ] Property disappears from list immediately
- [ ] Item count decrements by 1
- [ ] If list is now empty, empty state message appears
- [ ] Console shows no errors
- [ ] Network tab shows `DELETE /api/watchlist/items/[id]` with status 200

**🐛 Common Issues:**
- **Property doesn't disappear:** Check network tab for failed request
- **403 Forbidden:** Logged in as viewer role

---

### ✅ Test 8: Delete Entire Watchlist

**Steps:**
1. On watchlist page
2. Look for the "Research Needed" watchlist card in sidebar
3. Find the Delete/Trash icon on the watchlist card (not on individual properties)
4. Click the watchlist delete button
5. Confirmation dialog should appear with warning message
6. Read the warning (e.g., "This will delete the watchlist and all X properties")
7. Confirm the deletion
8. Observe watchlist removal

**✅ Success Criteria:**
- [ ] Delete button is visible on watchlist card
- [ ] Confirmation dialog appears with clear warning message
- [ ] Dialog mentions number of properties that will be affected
- [ ] Success toast: "Watchlist deleted" or "Research Needed deleted"
- [ ] "Research Needed" disappears from sidebar
- [ ] If it was the active watchlist, another one is auto-selected OR empty state shows
- [ ] "High Priority" watchlist still exists and is intact
- [ ] Console shows no errors
- [ ] Network tab shows `DELETE /api/watchlist/[id]` with status 200

**🐛 Common Issues:**
- **Watchlist still appears:** Check network tab for failed DELETE request
- **All watchlists deleted:** Wrong button clicked - should only delete "Research Needed"
- **403 Forbidden:** Logged in as viewer role

---

## Additional Verification Tests

### Authentication & Authorization
- [ ] Try accessing http://localhost:3000/watchlist without being logged in → should redirect to /login
- [ ] Try accessing API endpoints directly without auth → should return 401 Unauthorized
- [ ] Try creating/editing/deleting as viewer role → should return 403 Forbidden

### Error Handling
- [ ] Try creating watchlist with duplicate name → 409 Conflict with appropriate error message
- [ ] Try adding same property to watchlist twice → 409 Conflict with info toast (not error)
- [ ] Try submitting form with empty required fields → validation error message
- [ ] Test with network offline (throttle to offline in dev tools) → shows error message

### UI/UX Verification
- [ ] All loading spinners work during async operations
- [ ] All success/error toasts appear and disappear correctly
- [ ] Empty states show when no watchlists exist
- [ ] Empty states show when watchlist has no properties
- [ ] Icons are intuitive (Heart, Trash, Edit, etc.)
- [ ] Colors are visible and distinguishable
- [ ] Buttons are properly labeled
- [ ] Responsive design works on mobile (resize browser to 375px width)

### Performance
- [ ] Page loads in under 2 seconds
- [ ] API responses return in under 500ms
- [ ] No unnecessary API calls (check network tab)
- [ ] Smooth animations and transitions

---

## Test Completion Summary

**Date Tested:** _______________
**Tested By:** _______________
**Browser:** _______________
**User Role:** _______________

### Results

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Create "High Priority" | ⬜ PASS / ⬜ FAIL | |
| Test 2: Add Property | ⬜ PASS / ⬜ FAIL | |
| Test 3: Verify in Watchlist | ⬜ PASS / ⬜ FAIL | |
| Test 4: Update Max Bid | ⬜ PASS / ⬜ FAIL | |
| Test 5: Create "Research Needed" | ⬜ PASS / ⬜ FAIL | |
| Test 6: Move Property | ⬜ PASS / ⬜ FAIL | |
| Test 7: Delete Property | ⬜ PASS / ⬜ FAIL | |
| Test 8: Delete Watchlist | ⬜ PASS / ⬜ FAIL | |

### Overall Status

**Total Tests:** 8
**Passed:** ___
**Failed:** ___
**Pass Rate:** ____%

**Ready for Production:** ⬜ YES / ⬜ NO

### Issues Found

If any tests failed, document issues here:

**Issue 1:**
- Test: _______
- Severity: Critical / High / Medium / Low
- Description: _______
- Steps to Reproduce: _______
- Expected: _______
- Actual: _______

---

## Next Steps

After completing all tests:

1. **If all tests pass:**
   - Update implementation_plan.json → subtask-4-4 status to "completed"
   - Commit changes: `git add . && git commit -m "auto-claude: subtask-4-4 - End-to-end verification complete"`
   - Update build-progress.txt with summary

2. **If any tests fail:**
   - Document issues in detail
   - Fix issues before marking subtask complete
   - Re-run failed tests after fixes
   - Update notes in implementation_plan.json

---

## Screenshots (Optional)

Attach screenshots for:
- Watchlist page with multiple lists
- Property detail page with watchlist button
- Properties list page with watchlist buttons
- Create watchlist modal
- Confirmation dialogs

---

**Notes:**
- This checklist assumes clean state (no pre-existing watchlists named "High Priority" or "Research Needed")
- If watchlists already exist, either delete them first or use different names
- Test with an admin or analyst role user account
- All API calls should complete successfully with appropriate status codes
