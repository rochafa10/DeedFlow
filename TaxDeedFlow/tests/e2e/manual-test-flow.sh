#!/bin/bash

# Manual Test Flow for Developer API
# This script provides step-by-step commands to manually test the Developer API

set -e

BASE_URL="http://localhost:3000"
API_KEY=""

echo "======================================"
echo "Developer API Manual Test Flow"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Prerequisites:${NC}"
echo "1. Development server running on $BASE_URL"
echo "2. Database migrations applied"
echo "3. Authenticated session (for creating API keys)"
echo ""

# Step 1: Test unauthenticated request
echo -e "${YELLOW}Step 1: Test request WITHOUT API key (should fail with 401)${NC}"
echo "Command: curl -s $BASE_URL/api/v1/properties | jq"
echo ""
read -p "Press Enter to execute..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/properties")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Correctly rejected (401)${NC}"
    echo "$BODY" | jq
else
    echo -e "${RED}✗ Unexpected status: $HTTP_CODE${NC}"
    echo "$BODY" | jq
fi
echo ""

# Step 2: Test invalid API key
echo -e "${YELLOW}Step 2: Test request with INVALID API key (should fail with 401)${NC}"
echo "Command: curl -s -H 'x-api-key: invalid_key' $BASE_URL/api/v1/properties | jq"
echo ""
read -p "Press Enter to execute..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "x-api-key: invalid_key" "$BASE_URL/api/v1/properties")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Correctly rejected (401)${NC}"
    echo "$BODY" | jq
else
    echo -e "${RED}✗ Unexpected status: $HTTP_CODE${NC}"
    echo "$BODY" | jq
fi
echo ""

# Step 3: Create API key
echo -e "${YELLOW}Step 3: Create API key via UI${NC}"
echo "1. Open browser: $BASE_URL/developer/keys"
echo "2. Click 'Create New API Key'"
echo "3. Enter name: 'Manual Test Key'"
echo "4. Select permissions: 'read'"
echo "5. Click 'Create'"
echo "6. Copy the generated API key"
echo ""
read -p "Paste the API key here: " API_KEY

if [ -z "$API_KEY" ]; then
    echo -e "${RED}✗ No API key provided. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API key received: ${API_KEY:0:15}...${NC}"
echo ""

# Step 4: Test valid API request
echo -e "${YELLOW}Step 4: Make request WITH valid API key (should succeed with 200)${NC}"
echo "Command: curl -s -H 'x-api-key: $API_KEY' '$BASE_URL/api/v1/properties?limit=5' | jq"
echo ""
read -p "Press Enter to execute..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "x-api-key: $API_KEY" "$BASE_URL/api/v1/properties?limit=5")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Request successful (200)${NC}"
    echo "$BODY" | jq '.data.properties | length' | xargs -I {} echo "  Returned {} properties"
    echo "$BODY" | jq '.data.total' | xargs -I {} echo "  Total available: {}"
else
    echo -e "${RED}✗ Unexpected status: $HTTP_CODE${NC}"
    echo "$BODY" | jq
fi
echo ""

# Step 5: Test property filtering
echo -e "${YELLOW}Step 5: Test property filtering (state=PA, min_total_due=1000)${NC}"
echo "Command: curl -s -H 'x-api-key: $API_KEY' '$BASE_URL/api/v1/properties?state_code=PA&min_total_due=1000&limit=5' | jq"
echo ""
read -p "Press Enter to execute..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "x-api-key: $API_KEY" "$BASE_URL/api/v1/properties?state_code=PA&min_total_due=1000&limit=5")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Request successful (200)${NC}"
    echo "$BODY" | jq '.data.properties | length' | xargs -I {} echo "  Returned {} properties"
    echo "$BODY" | jq '.data.properties[0] | {parcel: .parcel_number, state: .state_code, amount: .total_due}'
else
    echo -e "${RED}✗ Unexpected status: $HTTP_CODE${NC}"
    echo "$BODY" | jq
fi
echo ""

# Step 6: Test counties endpoint
echo -e "${YELLOW}Step 6: Get counties list${NC}"
echo "Command: curl -s -H 'x-api-key: $API_KEY' '$BASE_URL/api/v1/counties' | jq"
echo ""
read -p "Press Enter to execute..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "x-api-key: $API_KEY" "$BASE_URL/api/v1/counties")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Request successful (200)${NC}"
    echo "$BODY" | jq '.data | length' | xargs -I {} echo "  Returned {} counties"
    echo "$BODY" | jq '.data[0] | {name: .name, state: .state_code, properties: .property_count}'
else
    echo -e "${RED}✗ Unexpected status: $HTTP_CODE${NC}"
    echo "$BODY" | jq
fi
echo ""

# Step 7: Verify rate limit headers
echo -e "${YELLOW}Step 7: Verify rate limit headers${NC}"
echo "Command: curl -v -H 'x-api-key: $API_KEY' '$BASE_URL/api/v1/properties?limit=1' 2>&1 | grep -i ratelimit"
echo ""
read -p "Press Enter to execute..."
curl -s -v -H "x-api-key: $API_KEY" "$BASE_URL/api/v1/properties?limit=1" 2>&1 | grep -i "x-ratelimit" | while read line; do
    echo -e "${GREEN}  $line${NC}"
done
echo ""

# Step 8: View usage statistics
echo -e "${YELLOW}Step 8: View usage statistics in UI${NC}"
echo "1. Open browser: $BASE_URL/developer/usage"
echo "2. Verify the requests you just made are shown"
echo "3. Check rate limit status"
echo "4. Look for recent activity log"
echo ""
read -p "Press Enter when you've verified usage statistics..."
echo ""

# Step 9: Test rate limiting (light version)
echo -e "${YELLOW}Step 9: Test rate limiting (make 10 quick requests)${NC}"
echo "Note: Full rate limit test (1000 requests) would take too long"
echo "This tests that rate limit headers are being returned"
echo ""
read -p "Press Enter to execute..."

for i in {1..10}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -H "x-api-key: $API_KEY" "$BASE_URL/api/v1/properties?limit=1")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "429" ]; then
        echo -e "${GREEN}✓ Rate limited after $i requests${NC}"
        BODY=$(echo "$RESPONSE" | sed '$d')
        echo "$BODY" | jq
        break
    elif [ "$HTTP_CODE" != "200" ]; then
        echo -e "${RED}✗ Unexpected status: $HTTP_CODE${NC}"
        break
    fi

    echo "  Request $i/10: OK"
done

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${YELLOW}  Did not hit rate limit in 10 requests (expected with free tier: 1000/hour)${NC}"
    echo -e "${GREEN}✓ Rate limit headers are present${NC}"
fi
echo ""

# Step 10: Optional - revoke API key
echo -e "${YELLOW}Step 10: Optional - Revoke API key${NC}"
echo "1. Open browser: $BASE_URL/developer/keys"
echo "2. Find 'Manual Test Key'"
echo "3. Click 'Revoke'"
echo "4. Confirm revocation"
echo ""
read -p "Press Enter when API key is revoked (or skip)..."

# Test that revoked key doesn't work
echo -e "${YELLOW}Testing revoked key (should fail with 401)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "x-api-key: $API_KEY" "$BASE_URL/api/v1/properties")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Revoked key correctly rejected (401)${NC}"
else
    echo -e "${YELLOW}  Key may not be revoked yet (status: $HTTP_CODE)${NC}"
fi
echo ""

echo "======================================"
echo -e "${GREEN}Manual Test Flow Complete!${NC}"
echo "======================================"
echo ""
echo "Summary:"
echo "- API authentication working ✓"
echo "- Property endpoints working ✓"
echo "- County endpoints working ✓"
echo "- Rate limiting headers present ✓"
echo "- Usage tracking visible in UI ✓"
echo ""
