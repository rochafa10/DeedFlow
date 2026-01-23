# Combined Risk Service Integration Tests

This directory contains comprehensive tests to verify that the **drought risk analyzer** is properly integrated into the **combined risk assessment system**.

## Test Coverage

The test suite validates the following requirements:

1. ✅ **Drought appears in categoryScores** - Drought is included in the risk assessment breakdown
2. ✅ **Weights sum to 1.0** - All risk region configurations have properly normalized weights
3. ✅ **Drought contributes to overall risk score** - Drought analysis affects the final risk score
4. ✅ **Drought mitigations appear** - Mitigation actions are generated for moderate/high drought risk
5. ✅ **Regional weights work correctly** - MOUNTAIN_WEST has higher drought weight than other regions
6. ✅ **Full integration** - All components work together seamlessly

## Test Files

### 1. `manual-test-combined-risk-integration.ts`

**Full TypeScript test suite** with comprehensive validation.

**Features:**
- 6 separate test functions covering all integration points
- Detailed console output with visual formatting
- Validates structure, scores, weights, and mitigations
- Exports: `testCombinedRiskIntegration()`, `quickIntegrationTest()`

**Usage:**
```typescript
import { testCombinedRiskIntegration } from '@/lib/risk/combined/__tests__/manual-test-combined-risk-integration';

// Run full test suite
await testCombinedRiskIntegration();

// Or quick test
await quickIntegrationTest();
```

### 2. `browser-console-integration-test.js`

**Simplified JavaScript version** for easy browser console testing.

**Usage:**
1. Start dev server: `npm run dev`
2. Open http://localhost:3000 in browser
3. Open browser console (F12)
4. Copy and paste the entire file contents
5. Tests run automatically with visual results

## Expected Results

### Test 1: Drought in Category Scores ✅

Drought should appear in the `categoryScores` array with the following fields:
- `category`: `'drought'`
- `rawScore`: 0-100 (drought severity score)
- `weight`: Region-specific weight (e.g., 0.15 for MOUNTAIN_WEST)
- `weightedScore`: `rawScore * weight`
- `riskLevel`: `'minimal'` | `'low'` | `'moderate'` | `'high'` | `'very_high'`
- `dataAvailability`: `'full'` | `'partial'` | `'none'`

### Test 2: Weights Sum to 1.0 ✅

All risk regions should have weights that sum to approximately 1.0 (±0.01):

| Region | Drought Weight | Total Sum |
|--------|---------------|-----------|
| MOUNTAIN_WEST | 0.15 | ~1.00 |
| TORNADO_ALLEY | 0.10 | ~1.00 |
| WEST_COAST | 0.08 | ~1.00 |
| DEFAULT | 0.05 | ~1.00 |
| GULF_COAST | 0.05 | ~1.00 |
| ATLANTIC_COAST | 0.05 | ~1.00 |
| MIDWEST | 0.05 | ~1.00 |
| NORTHEAST | 0.05 | ~1.00 |

### Test 3: Drought Contributes to Overall Score ✅

Running `calculateRiskAssessment()` with and without drought should produce different overall scores:

```
With Drought (AZ):    45/100
Without Drought (AZ): 38/100
Difference:          +7.00
```

The difference should be proportional to the drought weight and severity.

### Test 4: Drought Mitigations Appear ✅

For moderate to high drought risk (raw score ≥ 40), mitigation actions should appear:

**Example Mitigations:**
1. Install water-efficient irrigation and xeriscaping
   - Priority: 1-5 (based on score)
   - Cost: $3,000 - $15,000
   - Effectiveness: moderate
   - Timeframe: 2-4 weeks

2. Install rainwater collection system and storage tanks (high risk only, score ≥ 60)
   - Priority: 1-5
   - Cost: $5,000 - $25,000
   - Effectiveness: high
   - Timeframe: 4-8 weeks

### Test 5: Regional Weights ✅

MOUNTAIN_WEST should have the highest drought weight:

```
Drought Weight Rankings:
🥇 MOUNTAIN_WEST:     0.1500 (15.00%)
🥈 TORNADO_ALLEY:     0.1000 (10.00%)
🥉 WEST_COAST:        0.0800 (8.00%)
   DEFAULT:           0.0500 (5.00%)
   GULF_COAST:        0.0500 (5.00%)
   ATLANTIC_COAST:    0.0500 (5.00%)
   MIDWEST:           0.0500 (5.00%)
   NORTHEAST:         0.0500 (5.00%)
```

## Running the Tests

### Method 1: Browser Console (Recommended for Quick Testing)

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Open browser developer console (F12 or Ctrl+Shift+I)

4. Copy and paste contents of `browser-console-integration-test.js`

5. Press Enter - tests will run automatically

### Method 2: TypeScript Tests (For Development)

```typescript
// In browser console or test file
import { testCombinedRiskIntegration } from '@/lib/risk/combined/__tests__/manual-test-combined-risk-integration';

// Full test suite (6 tests)
await testCombinedRiskIntegration();

// Quick test (basic validation)
await quickIntegrationTest();
```

### Method 3: Direct Function Testing

```typescript
import { calculateRiskAssessment } from '@/lib/risk/combined/combined-risk-service';
import { analyzeDroughtRisk } from '@/lib/risk/drought/drought-analyzer';

// Get drought analysis
const droughtAnalysis = await analyzeDroughtRisk({ lat: 33.45, lng: -112.07 }, 'AZ');

// Create risk input
const riskInput = {
  flood: null,
  earthquake: null,
  wildfire: null,
  hurricane: null,
  sinkhole: null,
  environmental: null,
  radon: null,
  slope: null,
  drought: droughtAnalysis,
};

// Calculate combined risk
const assessment = calculateRiskAssessment(riskInput, 'AZ');

// Inspect results
console.log('Overall Risk Score:', assessment.riskScore);
console.log('Drought in Scores:', assessment.categoryScores.find(s => s.category === 'drought'));
console.log('Weights Used:', assessment.weightsUsed);
console.log('Drought Mitigations:', assessment.mitigationActions.filter(m => m.riskType === 'drought'));
```

## Verification Checklist

Use this checklist to manually verify integration:

- [ ] **Drought in categoryScores**: `assessment.categoryScores` includes a `drought` entry
- [ ] **Weights sum to 1.0**: `Object.values(assessment.weightsUsed).reduce((a,b) => a+b, 0) ≈ 1.0`
- [ ] **Drought contributes to score**: Risk score changes when drought is included vs excluded
- [ ] **Drought mitigations**: `assessment.mitigationActions` includes `riskType: 'drought'` entries when risk is moderate/high
- [ ] **Regional weights**: `RISK_REGIONS.MOUNTAIN_WEST.drought > RISK_REGIONS.DEFAULT.drought`
- [ ] **Assessment.drought field**: `assessment.drought` contains the `DroughtRiskAnalysis` object
- [ ] **No TypeScript errors**: `npm run type-check` passes
- [ ] **No console errors**: Browser console is clean when running tests

## Troubleshooting

### Test fails: "Drought not in categoryScores"

**Cause:** Drought analyzer or combined risk service not properly integrated.

**Fix:**
1. Verify `drought` field exists in `RiskInput` type
2. Verify `getDroughtScore()` function exists in combined-risk-service.ts
3. Check that drought is included in `scores` object in `calculateRiskAssessment()`

### Test fails: "Weights don't sum to 1.0"

**Cause:** Risk region weights not properly normalized.

**Fix:**
1. Verify all 9 risk types are included in each region configuration
2. Check that `normalizeWeights()` function includes drought
3. Manually calculate sum: `flood + earthquake + wildfire + hurricane + sinkhole + environmental + radon + slope + drought = 1.0`

### Test fails: "Drought doesn't contribute to score"

**Cause:** Drought score calculation not integrated into weighted total.

**Fix:**
1. Verify `getDroughtScore()` is called in `calculateRiskAssessment()`
2. Check that drought is included in `scores` object
3. Verify drought weight is applied in weighted score calculation

### Test fails: "No drought mitigations"

**Cause:** Drought mitigation generation logic may be missing or threshold too high.

**Fix:**
1. Check `getMitigationsForCategory()` includes `case 'drought':`
2. Verify drought score is ≥ 40 (moderate risk threshold)
3. Check that mitigations are properly returned from drought case

### Import errors in browser

**Cause:** Module imports not available in browser console.

**Fix:**
1. Use the `browser-console-integration-test.js` file instead
2. Ensure dev server is running (`npm run dev`)
3. Make sure you're on a page that loads the risk modules

## Success Criteria

All tests should pass with the following results:

```
✅ Drought in Category Scores
✅ Weights Sum to 1.0
✅ Drought Contributes to Score
✅ Drought Mitigations Appear
✅ Regional Weights Correct
✅ Full Integration

6/6 tests passed (100%)

✅ ALL TESTS PASSED - Combined Risk Integration is working correctly!
   Drought is fully integrated into the combined risk assessment system.
```

## Related Files

- **Types**: `@/types/risk-analysis.ts` - Type definitions for drought and risk assessment
- **Drought Analyzer**: `@/lib/risk/drought/drought-analyzer.ts` - Core drought analysis logic
- **Combined Service**: `@/lib/risk/combined/combined-risk-service.ts` - Risk integration logic
- **Drought Monitor Service**: `@/lib/api/services/drought-monitor-service.ts` - Drought data API

## Next Steps

After verifying integration:

1. Test in property detail pages to see drought risk displayed
2. Verify drought appears in risk charts and visualizations
3. Test with various states (high-risk vs low-risk)
4. Validate insurance estimates include drought-related costs
5. Check that recommendations include drought-specific guidance

---

**Last Updated:** 2026-01-22
**Test Version:** 1.0
**Author:** Claude Code Agent
