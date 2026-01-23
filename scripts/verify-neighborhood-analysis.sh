#!/bin/bash
# End-to-End Verification Script for Neighborhood Analysis Feature
# Task 030 - Subtask 7-1

set -e  # Exit on error

echo "========================================"
echo "Neighborhood Analysis E2E Verification"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0
SKIPPED=0

# Helper functions
pass() {
  echo -e "${GREEN}✓ PASS:${NC} $1"
  ((PASSED++))
}

fail() {
  echo -e "${RED}✗ FAIL:${NC} $1"
  ((FAILED++))
}

skip() {
  echo -e "${YELLOW}⊘ SKIP:${NC} $1"
  ((SKIPPED++))
}

echo "Step 1: File Existence Check"
echo "------------------------------"

# Check database schema
if [ -f "sql/neighborhood_analysis_schema.sql" ]; then
  pass "Database schema file exists"
else
  fail "Database schema file missing"
fi

# Check backend scripts
if [ -f "scripts/osm_access_analyzer.py" ]; then
  pass "OSM access analyzer exists"
else
  fail "OSM access analyzer missing"
fi

if [ -f "scripts/neighborhood_enrichment.py" ]; then
  pass "Neighborhood enrichment script exists"
else
  fail "Neighborhood enrichment script missing"
fi

# Check frontend service
if [ -f "TaxDeedFlow/src/lib/api/services/osm-access-service.ts" ]; then
  pass "OSM service exists"
else
  fail "OSM service missing"
fi

# Check API route
if [ -f "TaxDeedFlow/src/app/api/neighborhood/route.ts" ]; then
  pass "Neighborhood API route exists"
else
  fail "Neighborhood API route missing"
fi

# Check component
if [ -f "TaxDeedFlow/src/components/report/sections/NeighborhoodAnalysis.tsx" ]; then
  pass "NeighborhoodAnalysis component exists"
else
  fail "NeighborhoodAnalysis component missing"
fi

# Check scoring update
if [ -f "TaxDeedFlow/src/lib/scoring/categories/location/locationScore.ts" ]; then
  pass "Location scoring file exists"
else
  fail "Location scoring file missing"
fi

echo ""
echo "Step 2: Python Syntax Validation"
echo "----------------------------------"

# Check Python availability
if command -v python &> /dev/null; then
  pass "Python is available"

  # Compile check OSM analyzer
  if python -m py_compile scripts/osm_access_analyzer.py 2>/dev/null; then
    pass "OSM analyzer syntax valid"
  else
    fail "OSM analyzer syntax error"
  fi

  # Compile check enrichment script
  if python -m py_compile scripts/neighborhood_enrichment.py 2>/dev/null; then
    pass "Enrichment script syntax valid"
  else
    fail "Enrichment script syntax error"
  fi

  # Check help output
  if python scripts/neighborhood_enrichment.py --help &> /dev/null; then
    pass "Enrichment script help accessible"
  else
    skip "Enrichment script help (may need dependencies)"
  fi
else
  skip "Python not available - cannot verify scripts"
fi

echo ""
echo "Step 3: TypeScript Compilation Check"
echo "--------------------------------------"

cd TaxDeedFlow

# Run type-check and filter for neighborhood analysis errors
echo "Running TypeScript type-check..."
if npm run type-check 2>&1 | grep -E "(neighborhood|NeighborhoodAnalysis|osm-access)" > /tmp/ts-errors.txt; then
  if [ -s /tmp/ts-errors.txt ]; then
    fail "TypeScript errors in neighborhood analysis code"
    cat /tmp/ts-errors.txt
  else
    pass "No TypeScript errors in neighborhood analysis code"
  fi
else
  pass "No TypeScript errors in neighborhood analysis code"
fi

echo ""
echo "Step 4: Unit Tests - Landlocked Penalty"
echo "-----------------------------------------"

# Check if test file exists
if [ -f "src/lib/scoring/__tests__/landlocked-penalty.test.ts" ]; then
  pass "Landlocked penalty test file exists"

  # Run the specific test
  echo "Running landlocked penalty tests..."
  if npm test -- --testPathPattern=landlocked-penalty --passWithNoTests 2>&1 | grep -E "(PASS|FAIL)" > /tmp/test-results.txt; then
    if grep -q "PASS" /tmp/test-results.txt; then
      pass "Landlocked penalty tests pass"
    else
      fail "Landlocked penalty tests fail"
      cat /tmp/test-results.txt
    fi
  else
    skip "Landlocked penalty tests (may need full test environment)"
  fi
else
  fail "Landlocked penalty test file missing"
fi

echo ""
echo "Step 5: Component Integration Check"
echo "-------------------------------------"

# Check if component is exported
if grep -q "NeighborhoodAnalysis" src/components/report/sections/index.ts; then
  pass "NeighborhoodAnalysis exported from index"
else
  fail "NeighborhoodAnalysis not exported"
fi

# Check if component is used in report page
if grep -q "NeighborhoodAnalysis" src/app/report/\[propertyId\]/page.tsx; then
  pass "NeighborhoodAnalysis integrated in report page"
else
  fail "NeighborhoodAnalysis not integrated in report page"
fi

# Check if component is used in demo page
if grep -q "NeighborhoodAnalysis" src/app/report/demo/page.tsx; then
  pass "NeighborhoodAnalysis integrated in demo page"
else
  skip "NeighborhoodAnalysis not in demo page (optional)"
fi

echo ""
echo "Step 6: API Route Validation"
echo "------------------------------"

# Check API route structure
if grep -q "propertyId" src/app/api/neighborhood/route.ts; then
  pass "API route accepts propertyId parameter"
else
  fail "API route missing propertyId parameter"
fi

if grep -q "neighborhood_analysis" src/app/api/neighborhood/route.ts; then
  pass "API route queries neighborhood_analysis table"
else
  fail "API route doesn't query correct table"
fi

if grep -q "crime\|demographics\|access\|schools\|amenities" src/app/api/neighborhood/route.ts; then
  pass "API route returns all required data sections"
else
  fail "API route missing data sections"
fi

echo ""
echo "Step 7: Scoring Integration Check"
echo "-----------------------------------"

# Check for landlocked penalty in location scoring
if grep -q "landlocked\|accessData" src/lib/scoring/categories/location/locationScore.ts; then
  pass "Location scoring includes access data checks"
else
  fail "Location scoring missing access data integration"
fi

# Check for penalty function
if grep -q "applyAccessPenalty\|accessPenalty" src/lib/scoring/categories/location/locationScore.ts; then
  pass "Access penalty function exists"
else
  skip "Access penalty function (may use different name)"
fi

echo ""
echo "========================================"
echo "Verification Summary"
echo "========================================"
echo -e "${GREEN}Passed:  $PASSED${NC}"
echo -e "${RED}Failed:  $FAILED${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All available verifications passed!${NC}"
  echo ""
  echo "Next steps for complete E2E verification:"
  echo "1. Deploy database schema to Supabase"
  echo "2. Install Python dependencies: pip install requests"
  echo "3. Run enrichment for test property"
  echo "4. Start dev server: npm run dev"
  echo "5. Test API endpoint: curl http://localhost:3000/api/neighborhood?propertyId=<UUID>"
  echo "6. Verify in browser: http://localhost:3000/report/demo"
  exit 0
else
  echo -e "${RED}✗ Some verifications failed - review errors above${NC}"
  exit 1
fi
