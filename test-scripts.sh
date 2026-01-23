#!/bin/bash

# ==========================================
# Smart Deal Alerts - Test Scripts
# Quick reference for E2E testing
# ==========================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
N8N_BASE_URL="${N8N_BASE_URL:-https://n8n.lfb-investments.com}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Smart Deal Alerts - Test Scripts${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "API Base URL: $API_BASE_URL"
echo "n8n Base URL: $N8N_BASE_URL"
echo ""

# ==========================================
# Test 1: Create Alert Rule
# ==========================================
test_create_alert_rule() {
    echo -e "${BLUE}Test 1: Create Alert Rule${NC}"

    curl -X POST "$API_BASE_URL/api/property-alerts/rules" \
        -H "Content-Type: application/json" \
        -H "Cookie: <your-auth-cookie>" \
        -d '{
            "name": "E2E Test - Blair County High-Value",
            "enabled": true,
            "score_threshold": 80,
            "county_ids": ["<blair-county-uuid>"],
            "property_types": ["Residential", "Commercial"],
            "max_bid": 5000,
            "min_acres": 0.25,
            "max_acres": 5.0,
            "notification_frequency": "daily"
        }'

    echo -e "\n${GREEN}✓ If successful, copy the rule ID for next tests${NC}\n"
}

# ==========================================
# Test 2: Get Alert Rules
# ==========================================
test_get_alert_rules() {
    echo -e "${BLUE}Test 2: Get Alert Rules${NC}"

    curl -X GET "$API_BASE_URL/api/property-alerts/rules" \
        -H "Cookie: <your-auth-cookie>"

    echo -e "\n${GREEN}✓ Should return array of alert rules${NC}\n"
}

# ==========================================
# Test 3: Trigger Alert Scan (Admin Only)
# ==========================================
test_trigger_scan() {
    echo -e "${BLUE}Test 3: Trigger Alert Scan${NC}"

    curl -X POST "$API_BASE_URL/api/property-alerts/scan" \
        -H "Content-Type: application/json" \
        -H "Cookie: <your-auth-cookie>" \
        -d '{}'

    echo -e "\n${GREEN}✓ Should return scan stats (alertsCreated, rulesChecked, propertiesScanned)${NC}\n"
}

# ==========================================
# Test 4: Trigger Scan via n8n Webhook
# ==========================================
test_trigger_scan_n8n() {
    echo -e "${BLUE}Test 4: Trigger Scan via n8n Webhook${NC}"

    curl -X POST "$N8N_BASE_URL/webhook/property-alert-scanner"

    echo -e "\n${GREEN}✓ Should return n8n workflow execution result${NC}\n"
}

# ==========================================
# Test 5: Get Property Alerts (Inbox)
# ==========================================
test_get_alerts() {
    echo -e "${BLUE}Test 5: Get Property Alerts${NC}"

    echo "All alerts:"
    curl -X GET "$API_BASE_URL/api/property-alerts" \
        -H "Cookie: <your-auth-cookie>"

    echo -e "\n\nUnread alerts only:"
    curl -X GET "$API_BASE_URL/api/property-alerts?read=false" \
        -H "Cookie: <your-auth-cookie>"

    echo -e "\n\nUnread count (for badge):"
    curl -X GET "$API_BASE_URL/api/property-alerts?read=false&count_only=true" \
        -H "Cookie: <your-auth-cookie>"

    echo -e "\n${GREEN}✓ Should return property alerts${NC}\n"
}

# ==========================================
# Test 6: Mark Alert as Read
# ==========================================
test_mark_alert_read() {
    echo -e "${BLUE}Test 6: Mark Alert as Read${NC}"

    ALERT_ID="${1:-<alert-id>}"

    curl -X POST "$API_BASE_URL/api/property-alerts" \
        -H "Content-Type: application/json" \
        -H "Cookie: <your-auth-cookie>" \
        -d "{\"alertIds\": [\"$ALERT_ID\"]}"

    echo -e "\n${GREEN}✓ Should mark alert as read${NC}\n"
}

# ==========================================
# Test 7: Mark All Alerts as Read
# ==========================================
test_mark_all_read() {
    echo -e "${BLUE}Test 7: Mark All Alerts as Read${NC}"

    curl -X PATCH "$API_BASE_URL/api/property-alerts" \
        -H "Cookie: <your-auth-cookie>"

    echo -e "\n${GREEN}✓ Should mark all alerts as read${NC}\n"
}

# ==========================================
# Test 8: Update Alert Rule
# ==========================================
test_update_rule() {
    echo -e "${BLUE}Test 8: Update Alert Rule${NC}"

    RULE_ID="${1:-<rule-id>}"

    curl -X PUT "$API_BASE_URL/api/property-alerts/rules/$RULE_ID" \
        -H "Content-Type: application/json" \
        -H "Cookie: <your-auth-cookie>" \
        -d '{
            "name": "Updated Test Rule",
            "enabled": false,
            "score_threshold": 90
        }'

    echo -e "\n${GREEN}✓ Should update rule${NC}\n"
}

# ==========================================
# Test 9: Delete Alert Rule
# ==========================================
test_delete_rule() {
    echo -e "${BLUE}Test 9: Delete Alert Rule${NC}"

    RULE_ID="${1:-<rule-id>}"

    curl -X DELETE "$API_BASE_URL/api/property-alerts/rules/$RULE_ID" \
        -H "Cookie: <your-auth-cookie>"

    echo -e "\n${GREEN}✓ Should delete rule${NC}\n"
}

# ==========================================
# Test 10: Trigger Email Digest
# ==========================================
test_trigger_email() {
    echo -e "${BLUE}Test 10: Trigger Email Digest${NC}"

    curl -X POST "$N8N_BASE_URL/webhook/property-alerts/email-digest" \
        -H "Content-Type: application/json" \
        -d '{"frequency": "daily"}'

    echo -e "\n${GREEN}✓ Should trigger email workflow${NC}\n"
}

# ==========================================
# Menu
# ==========================================
show_menu() {
    echo -e "${BLUE}Select a test to run:${NC}"
    echo "1) Create Alert Rule"
    echo "2) Get Alert Rules"
    echo "3) Trigger Scan (API)"
    echo "4) Trigger Scan (n8n)"
    echo "5) Get Property Alerts"
    echo "6) Mark Alert as Read"
    echo "7) Mark All as Read"
    echo "8) Update Alert Rule"
    echo "9) Delete Alert Rule"
    echo "10) Trigger Email Digest"
    echo "11) Run All Tests (Sequence)"
    echo "0) Exit"
    echo ""
    read -p "Enter choice: " choice

    case $choice in
        1) test_create_alert_rule ;;
        2) test_get_alert_rules ;;
        3) test_trigger_scan ;;
        4) test_trigger_scan_n8n ;;
        5) test_get_alerts ;;
        6)
            read -p "Enter alert ID: " alert_id
            test_mark_alert_read "$alert_id"
            ;;
        7) test_mark_all_read ;;
        8)
            read -p "Enter rule ID: " rule_id
            test_update_rule "$rule_id"
            ;;
        9)
            read -p "Enter rule ID: " rule_id
            test_delete_rule "$rule_id"
            ;;
        10) test_trigger_email ;;
        11)
            echo -e "${BLUE}Running all tests in sequence...${NC}"
            test_create_alert_rule
            sleep 2
            test_get_alert_rules
            sleep 2
            test_trigger_scan
            sleep 5
            test_get_alerts
            sleep 2
            test_trigger_email
            echo -e "${GREEN}✓ All tests complete${NC}"
            ;;
        0) exit 0 ;;
        *) echo -e "${RED}Invalid choice${NC}" ;;
    esac

    echo ""
    read -p "Press enter to continue..."
    show_menu
}

# ==========================================
# Main
# ==========================================
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: ./test-scripts.sh [test-number]"
    echo ""
    echo "Examples:"
    echo "  ./test-scripts.sh        # Interactive menu"
    echo "  ./test-scripts.sh 1      # Run test 1 (create alert rule)"
    echo "  ./test-scripts.sh 11     # Run all tests"
    echo ""
    echo "Environment Variables:"
    echo "  API_BASE_URL   - Base URL for API (default: http://localhost:3000)"
    echo "  N8N_BASE_URL   - Base URL for n8n (default: https://n8n.lfb-investments.com)"
    echo ""
    exit 0
fi

if [ -n "$1" ]; then
    # Run specific test
    case $1 in
        1) test_create_alert_rule ;;
        2) test_get_alert_rules ;;
        3) test_trigger_scan ;;
        4) test_trigger_scan_n8n ;;
        5) test_get_alerts ;;
        6) test_mark_alert_read ;;
        7) test_mark_all_read ;;
        8) test_update_rule ;;
        9) test_delete_rule ;;
        10) test_trigger_email ;;
        11)
            test_create_alert_rule
            test_get_alert_rules
            test_trigger_scan
            test_get_alerts
            test_trigger_email
            ;;
        *) echo -e "${RED}Invalid test number${NC}" ;;
    esac
else
    # Show interactive menu
    show_menu
fi
