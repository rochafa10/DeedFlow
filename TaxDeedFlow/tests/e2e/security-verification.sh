#!/bin/bash

# Developer API Security Verification Script
# Tests all security scenarios as required by subtask-7-2

set -e

echo "========================================"
echo "Developer API Security Verification"
echo "========================================"
echo ""

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_V1="$BASE_URL/api/v1"
API_DEV="$BASE_URL/api/developer"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test API endpoint
test_endpoint() {
    local test_name="$1"
    local method="$2"
    local url="$3"
    local headers="$4"
    local expected_status="$5"
    local data="$6"

    echo -n "Testing: $test_name ... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" $headers "$url")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST $headers -H "Content-Type: application/json" -d "$data" "$url")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE $headers "$url")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))

        # Check error message clarity
        if [ "$expected_status" = "401" ]; then
            if echo "$body" | grep -q "API key" || echo "$body" | grep -q "Invalid" || echo "$body" | grep -q "Unauthorized"; then
                echo "  Error message is clear: $(echo "$body" | jq -r '.error.message' 2>/dev/null || echo "$body")"
            else
                echo -e "  ${YELLOW}Warning: Error message may not be clear${NC}"
            fi

            # Check for security leaks
            if echo "$body" | grep -qiE "(database|postgres|sql|bcrypt|hash|salt)"; then
                echo -e "  ${RED}Warning: Error message may leak implementation details${NC}"
            fi
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got $http_code)"
        echo "  Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

echo "1. Testing Missing API Key Scenarios"
echo "========================================"
test_endpoint \
    "GET /api/v1/properties without x-api-key header" \
    "GET" \
    "$API_V1/properties" \
    "" \
    "401"

test_endpoint \
    "GET /api/v1/counties without x-api-key header" \
    "GET" \
    "$API_V1/counties" \
    "" \
    "401"

test_endpoint \
    "POST /api/v1/risk-analysis without x-api-key header" \
    "POST" \
    "$API_V1/risk-analysis" \
    "" \
    "401" \
    '{"property_id":"test-123"}'

echo ""
echo "2. Testing Invalid API Key Scenarios"
echo "========================================"
test_endpoint \
    "GET /api/v1/properties with invalid API key" \
    "GET" \
    "$API_V1/properties" \
    "-H 'x-api-key: invalid_key_123456'" \
    "401"

test_endpoint \
    "GET /api/v1/properties with wrong format API key" \
    "GET" \
    "$API_V1/properties" \
    "-H 'x-api-key: wrong_format'" \
    "401"

test_endpoint \
    "GET /api/v1/properties with empty API key" \
    "GET" \
    "$API_V1/properties" \
    "-H 'x-api-key: '" \
    "401"

test_endpoint \
    "GET /api/v1/properties with non-existent valid format key" \
    "GET" \
    "$API_V1/properties" \
    "-H 'x-api-key: tdf_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'" \
    "401"

echo ""
echo "3. Testing Revoked API Key Scenario"
echo "========================================"
echo "Note: This requires manual steps:"
echo "  1. Create an API key via /developer/keys UI"
echo "  2. Use the key to make a successful request"
echo "  3. Revoke the key via /developer/keys UI"
echo "  4. Try to use the revoked key (should get 401)"
echo ""
echo "Manual test with your API key (if you have one):"
read -p "Enter API key to test (or press Enter to skip): " USER_API_KEY

if [ -n "$USER_API_KEY" ]; then
    test_endpoint \
        "GET /api/v1/properties with user-provided API key" \
        "GET" \
        "$API_V1/properties?limit=1" \
        "-H 'x-api-key: $USER_API_KEY'" \
        "200"

    echo ""
    read -p "Have you revoked this key? (y/n): " REVOKED

    if [ "$REVOKED" = "y" ] || [ "$REVOKED" = "Y" ]; then
        test_endpoint \
            "GET /api/v1/properties with revoked API key" \
            "GET" \
            "$API_V1/properties" \
            "-H 'x-api-key: $USER_API_KEY'" \
            "401"
    fi
else
    echo -e "${YELLOW}Skipped: No API key provided${NC}"
fi

echo ""
echo "4. Testing Error Message Security"
echo "========================================"

# Test SQL injection attempt
test_endpoint \
    "SQL injection attempt in API key" \
    "GET" \
    "$API_V1/properties" \
    "-H \"x-api-key: ' OR '1'='1\"" \
    "401"

# Test XSS attempt
test_endpoint \
    "XSS attempt in API key" \
    "GET" \
    "$API_V1/properties" \
    "-H 'x-api-key: <script>alert(1)</script>'" \
    "401"

echo ""
echo "========================================"
echo "Security Verification Summary"
echo "========================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All security tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some security tests failed${NC}"
    exit 1
fi
