# E2E Tests for Tax Deed Flow

## Setup

Before running E2E tests, ensure you have:

1. **Environment variables configured**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

2. **Dependencies installed**
   ```bash
   npm install
   ```

3. **Dev server running**
   ```bash
   npm run dev
   ```
   The server should be accessible at http://localhost:3000

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run specific test file
```bash
npm run test:e2e -- ssrf-protection.spec.ts
```

### Run with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run specific test by name
```bash
npx playwright test -g "should reject localhost URLs"
```

## SSRF Protection Tests

The `ssrf-protection.spec.ts` file contains comprehensive tests for Server-Side Request Forgery (SSRF) protection in the screenshot scraper endpoint.

### Test Coverage

- ✅ Valid Regrid URLs are accepted
- ✅ Localhost URLs are rejected (localhost, 127.0.0.1, 0.0.0.0, [::1])
- ✅ Private IP addresses are rejected (10.x, 172.16-31.x, 192.168.x)
- ✅ AWS metadata service URLs are rejected (169.254.169.254)
- ✅ Dangerous protocols are rejected (file://, ftp://, data://)
- ✅ Non-Regrid domains are rejected
- ✅ Malformed URLs are rejected
- ✅ Error messages are descriptive
- ✅ Authentication is required
- ✅ Regrid subdomains are accepted
- ✅ URL sanitization works (whitespace trimming)

### Troubleshooting

**Tests timing out?**
- Ensure the dev server is running: `npm run dev`
- Check that port 3000 is not blocked
- Verify .env file has valid Supabase credentials
- Try increasing timeout in playwright.config.ts

**Database errors?**
- Check SUPABASE_URL and SUPABASE_ANON_KEY in .env
- Verify your Supabase project is accessible
- Check network connectivity

**SSRF validation not working?**
- Verify the SSRF protection utility is in place: `src/lib/security/ssrf-protection.ts`
- Check that the screenshot route imports and uses `validateRegridUrl`
- Run unit tests first: `npm test -- ssrf-protection.test.ts`
