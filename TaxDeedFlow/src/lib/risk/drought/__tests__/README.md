# Drought Analyzer Manual Tests

This directory contains manual test scripts to verify the drought risk analyzer functionality.

## Test Coverage

The manual tests verify:

1. **Structure Validation** - DroughtRiskAnalysis object has all required fields
2. **Risk Level Classification** - Appropriate risk levels for different drought categories
3. **Mitigation Recommendations** - Quality and quantity of recommendations
4. **Confidence Scores** - Scores are in valid range (0-100%)
5. **Risk Score Calculation** - Scores map correctly to 0-5 scale
6. **Fallback Behavior** - Graceful degradation when API is unavailable

## Test Locations

The tests use representative coordinates:

- **California (Los Angeles)**: `{ lat: 34.05, lng: -118.24 }` - High drought risk state
- **Arizona (Phoenix)**: `{ lat: 33.45, lng: -112.07 }` - Extreme drought risk (85% of last 20 years)
- **Texas (Austin)**: `{ lat: 30.27, lng: -97.74 }` - Moderate-high drought risk
- **Washington (Seattle)**: `{ lat: 47.61, lng: -122.33 }` - Low drought risk (baseline)

## How to Run Tests

### Option 1: Browser Console (Easiest)

1. Start the development server:
   ```bash
   cd TaxDeedFlow
   npm run dev
   ```

2. Navigate to `http://localhost:3000` in your browser

3. Open browser console:
   - **Chrome/Edge**: Press `F12` or `Cmd+Option+J` (Mac) / `Ctrl+Shift+J` (Windows)
   - **Firefox**: Press `F12` or `Cmd+Option+K` (Mac) / `Ctrl+Shift+K` (Windows)
   - **Safari**: Enable Developer menu in Preferences, then `Cmd+Option+C`

4. Copy the entire contents of `browser-console-test.js`

5. Paste into the console and press `Enter`

6. Review the test results printed in the console

### Option 2: TypeScript Test File (Advanced)

Use the comprehensive TypeScript test file for full test suite:

```typescript
// In browser console after navigating to app:
import { runDroughtAnalyzerTests, quickDroughtTest } from '@/lib/risk/drought/__tests__/manual-test-drought-analyzer';

// Run full test suite:
await runDroughtAnalyzerTests();

// Or run quick test:
await quickDroughtTest();
```

### Option 3: Direct Function Testing

Test the analyzer directly in browser console:

```javascript
// Import the analyzer
const { analyzeDroughtRisk, getDroughtRiskScore } = await import('@/lib/risk/drought/drought-analyzer');

// Test California
const result = await analyzeDroughtRisk({ lat: 34.05, lng: -118.24 }, 'CA');
console.log('Risk Level:', result.riskLevel);
console.log('Drought Category:', result.droughtCategory);
console.log('Mitigations:', result.mitigationRecommendations);
console.log('Score:', getDroughtRiskScore(result));
```

## Expected Results

### High-Risk States (CA, AZ, TX)

- **Risk Level**: `moderate`, `high`, or `very_high`
- **Drought Category**: `D0` to `D4` (or `none` if not currently in drought)
- **Water Availability**: `adequate`, `limited`, `scarce`, or `critical`
- **Mitigations**: At least 5-10 recommendations
- **Confidence**: 30-100% (higher with API data)
- **Risk Score**: 1.5-4.5 out of 5

### Low-Risk States (WA, OR)

- **Risk Level**: `minimal` or `low`
- **Drought Category**: `none` or `D0`
- **Water Availability**: `abundant` or `adequate`
- **Mitigations**: 2-5 recommendations (preventative)
- **Confidence**: 30-100%
- **Risk Score**: 0.5-1.5 out of 5

### Fallback Behavior

When the Drought Monitor API is unavailable:

- **Data Source Type**: `estimated`
- **Confidence**: < 50%
- **Description**: Includes "(Estimated - API data unavailable)"
- **Risk Level**: Based on state baseline (high-risk states default to `D0`, others to `none`)

## Validation Criteria

✅ **PASS**: Test passes if:
- All required fields are present in DroughtRiskAnalysis object
- Risk levels are appropriate for the location
- Mitigation recommendations are populated (> 0 for drought conditions)
- Confidence score is between 0-100
- Risk score is between 0-5
- Fallback behavior returns valid analysis with low confidence

❌ **FAIL**: Test fails if:
- Missing required fields (riskLevel, droughtCategory, waterAvailability, etc.)
- Empty mitigation recommendations during drought
- Confidence or risk scores out of range
- Errors thrown during execution
- Fallback behavior doesn't work

## Troubleshooting

### Import Errors

If you see module import errors in browser console:

1. Make sure you're on a page that has the risk analysis code loaded
2. Try navigating to a property details page first
3. Check that the development server is running
4. Verify the file path in the import statement matches your project structure

### API Timeout or Rate Limiting

The Drought Monitor Service has:
- **Rate Limiting**: 10 requests per minute
- **Circuit Breaker**: Opens after 5 failures, half-open after 60s
- **Cache TTL**: 7 days

If tests fail due to rate limiting:
- Wait 60 seconds between test runs
- Results are cached, so repeated tests for same coordinates should be fast
- Check browser Network tab for failed API requests

### Type Errors

If you see TypeScript errors:

```bash
cd TaxDeedFlow
npm run type-check
```

All drought analyzer files should pass type checking.

## Integration Testing

To test integration with the combined risk service:

```javascript
// In browser console:
const { calculateRiskAssessment } = await import('@/lib/risk/combined/combined-risk-service');
const { analyzeDroughtRisk } = await import('@/lib/risk/drought/drought-analyzer');

// Get drought analysis
const drought = await analyzeDroughtRisk({ lat: 34.05, lng: -118.24 }, 'CA');

// Calculate combined risk
const combined = await calculateRiskAssessment({
  coordinates: { lat: 34.05, lng: -118.24 },
  stateCode: 'CA',
  propertyValue: 100000,
  drought: drought
});

console.log('Combined Risk Score:', combined.overallRiskScore);
console.log('Drought Category Score:', combined.categoryScores.drought);
console.log('Drought-specific recommendations:', combined.mitigationActions.filter(a => a.category === 'drought'));
```

## Files

- `manual-test-drought-analyzer.ts` - Comprehensive TypeScript test suite
- `browser-console-test.js` - Simple JavaScript test for browser console
- `README.md` - This file (test documentation)

## Success Criteria

All manual tests must pass before marking subtask-5-1 as complete:

1. ✅ Returns DroughtRiskAnalysis object with all required fields
2. ✅ Risk level is appropriate for location
3. ✅ Mitigation recommendations are populated and relevant
4. ✅ Confidence score is reasonable (0-100%)
5. ✅ Risk score calculation works (0-5 scale)
6. ✅ Fallback behavior works when service unavailable

---

**Last Updated**: 2026-01-22
**Author**: Claude Code Agent
**Related Spec**: `005-add-drought-risk-analyzer`
