# E2E Tests for Team Collaboration

End-to-end tests for the team collaboration features using Playwright.

## Overview

These tests verify the complete team collaboration workflow:

1. **Organization Management** - Create and configure organizations
2. **Team Member Management** - Invite, manage, and assign roles to team members
3. **Shared Watchlists** - Create and share watchlists across the organization
4. **Deal Pipeline** - Manage deals through pipeline stages
5. **Audit Logging** - Track all team activities for compliance
6. **Data Isolation** - Verify organization-level data separation

## Prerequisites

- Node.js 18+ installed
- Project dependencies installed (`npm install`)
- Development server running (or configured to auto-start)

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run specific test file
```bash
npx playwright test tests/e2e/team-collaboration.spec.ts
```

### Run specific test
```bash
npx playwright test -g "should create and manage organization"
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run tests in debug mode
```bash
npx playwright test --debug
```

## Test Structure

### `team-collaboration.spec.ts`
Main test suite covering all team collaboration features:

- Test 1: Organization Management
- Test 2: Team Member Management
- Test 3: Role-Based Permissions
- Test 4: Watchlist Creation and Sharing
- Test 5: Deal Pipeline Management
- Test 6: Audit Log Verification
- Test 7: Data Isolation Between Organizations
- Test 8: Property Assignment Workflow
- Test 9: Organization Switcher
- Test 10: Full Collaboration Workflow (Complete E2E)

### `helpers.ts`
Shared helper functions for tests:

- `loginAsDemoUser()` - Authenticate as demo user
- `logout()` - Sign out
- `navigateToTeamPage()` - Navigate to team management
- `navigateToWatchlistsPage()` - Navigate to watchlists
- `createWatchlist()` - Create a new watchlist
- `inviteTeamMember()` - Invite a team member
- `clearStorage()` - Clear browser storage
- `verifyNoConsoleErrors()` - Check for console errors

## Test Data

Tests use demo mode data:

- **Demo Organization**: Pre-configured organization
- **Demo Users**:
  - Admin User (full access)
  - Analyst User (read/write access)
  - Viewer User (read-only access)

## Verification Steps

Each test follows the acceptance criteria:

✅ **Create Organization** - Verify organization can be created/configured
✅ **Invite Team Member** - Verify invitations can be sent
✅ **Create Shared Watchlist** - Verify watchlists can be shared
✅ **Verify Data Isolation** - Verify organization-level separation

## CI/CD Integration

These tests are configured to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Debugging Failed Tests

### View test report
```bash
npx playwright show-report
```

### View screenshots
Failed test screenshots are saved to `test-results/`

### View videos
Failed test videos are saved to `test-results/`

### View traces
```bash
npx playwright show-trace test-results/.../trace.zip
```

## Configuration

See `playwright.config.ts` for configuration:

- **Base URL**: `http://localhost:3000`
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries on CI, 0 locally
- **Browsers**: Chromium, Firefox, WebKit
- **Screenshots**: On failure only
- **Videos**: On failure only

## Best Practices

1. **Use helper functions** - Reuse common actions
2. **Wait for navigation** - Always wait for page loads
3. **Use semantic selectors** - Prefer role-based selectors
4. **Verify state changes** - Check that actions had the expected effect
5. **Clean up** - Each test starts fresh
6. **Test isolation** - Tests don't depend on each other

## Troubleshooting

### Tests failing with "Element not found"
- Increase timeout in `playwright.config.ts`
- Add `await page.waitForLoadState('networkidle')`
- Check if selectors match the actual UI

### Tests failing with "Page not loading"
- Verify dev server is running
- Check `baseURL` in config
- Verify network connectivity

### Tests flaky/intermittent
- Add explicit waits with `await page.waitForSelector()`
- Use `waitForLoadState()` after navigation
- Increase retry count in config

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
