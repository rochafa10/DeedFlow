#!/bin/bash

# Test script for Regrid route input validation
# Tests valid inputs and injection/SSRF attempts

API_URL="http://localhost:3000/api/scrape/regrid"
API_KEY="tdf-internal-scraper-key"

echo "========================================"
echo "Testing Regrid Route Input Validation"
echo "========================================"
echo ""

# Test 1: Valid input
echo "Test 1: Valid input (should succeed)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "property_id": "123e4567-e89b-12d3-a456-426614174000",
    "parcel_id": "12-34-567",
    "address": "123 Main St",
    "county": "Blair",
    "state": "PA"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n\n"

# Test 2: Invalid UUID
echo "Test 2: Invalid property_id UUID (should fail)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "property_id": "not-a-uuid",
    "parcel_id": "12-34-567",
    "county": "Blair",
    "state": "PA"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n\n"

# Test 3: SQL Injection attempt in parcel_id
echo "Test 3: SQL injection in parcel_id (should sanitize)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "property_id": "123e4567-e89b-12d3-a456-426614174000",
    "parcel_id": "12-34-567; DROP TABLE properties;--",
    "county": "Blair",
    "state": "PA"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n\n"

# Test 4: SSRF attempt with URL in address
echo "Test 4: SSRF attempt with URL in address (should sanitize)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "property_id": "123e4567-e89b-12d3-a456-426614174000",
    "parcel_id": "12-34-567",
    "address": "http://evil.com/malicious",
    "county": "Blair",
    "state": "PA"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n\n"

# Test 5: XSS attempt in county
echo "Test 5: XSS attempt in county (should sanitize)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "property_id": "123e4567-e89b-12d3-a456-426614174000",
    "parcel_id": "12-34-567",
    "county": "Blair<script>alert(\"XSS\")</script>",
    "state": "PA"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n\n"

# Test 6: Invalid state code
echo "Test 6: Invalid state code (should fail)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "property_id": "123e4567-e89b-12d3-a456-426614174000",
    "parcel_id": "12-34-567",
    "county": "Blair",
    "state": "Pennsylvania"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n\n"

# Test 7: Missing required fields
echo "Test 7: Missing required fields (should fail)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "property_id": "123e4567-e89b-12d3-a456-426614174000"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n\n"

# Test 8: javascript: protocol in address
echo "Test 8: javascript: protocol in address (should sanitize)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "property_id": "123e4567-e89b-12d3-a456-426614174000",
    "parcel_id": "12-34-567",
    "address": "javascript:alert(1)",
    "county": "Blair",
    "state": "PA"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n\n"

# Test 9: Lowercase state code (should auto-uppercase)
echo "Test 9: Lowercase state code (should auto-uppercase and succeed)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "property_id": "123e4567-e89b-12d3-a456-426614174000",
    "parcel_id": "12-34-567",
    "county": "Blair",
    "state": "pa"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n\n"

# Test 10: String too long
echo "Test 10: Parcel ID too long (should fail)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"property_id\": \"123e4567-e89b-12d3-a456-426614174000\",
    \"parcel_id\": \"$(printf 'A%.0s' {1..150})\",
    \"county\": \"Blair\",
    \"state\": \"PA\"
  }" \
  -w "\n\nHTTP Status: %{http_code}\n\n"

echo "========================================"
echo "Tests completed"
echo "========================================"
