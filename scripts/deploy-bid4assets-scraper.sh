#!/bin/bash
# Deploy Bid4Assets Scraper to VPS pwrunner container
#
# Usage: ./deploy-bid4assets-scraper.sh
#
# Prerequisites:
# - SSH access to VPS (192.241.153.13)
# - Docker running on VPS with pwrunner container

VPS_IP="192.241.153.13"
CONTAINER_NAME="n8n-production-pwrunner-1"
SCRIPT_NAME="bid4assets-scraper.js"
REMOTE_PATH="/app/scripts"

echo "=============================================="
echo "Deploying Bid4Assets Scraper to VPS"
echo "=============================================="

# Check if script exists locally
if [ ! -f "$SCRIPT_NAME" ]; then
    echo "Error: $SCRIPT_NAME not found in current directory"
    exit 1
fi

echo "[1/4] Copying script to VPS..."
scp "$SCRIPT_NAME" root@$VPS_IP:/tmp/

echo "[2/4] Copying script to pwrunner container..."
ssh root@$VPS_IP "docker cp /tmp/$SCRIPT_NAME $CONTAINER_NAME:$REMOTE_PATH/$SCRIPT_NAME"

echo "[3/4] Setting permissions..."
ssh root@$VPS_IP "docker exec $CONTAINER_NAME chmod +x $REMOTE_PATH/$SCRIPT_NAME"

echo "[4/4] Verifying deployment..."
ssh root@$VPS_IP "docker exec $CONTAINER_NAME ls -la $REMOTE_PATH/$SCRIPT_NAME"

echo ""
echo "=============================================="
echo "Deployment complete!"
echo "=============================================="
echo ""
echo "To run the scraper manually:"
echo "  ssh root@$VPS_IP"
echo "  docker exec $CONTAINER_NAME node $REMOTE_PATH/$SCRIPT_NAME --state PA"
echo ""
echo "To run with login (requires env vars):"
echo "  docker exec -e BID4ASSETS_EMAIL=your@email.com -e BID4ASSETS_PASSWORD=yourpass $CONTAINER_NAME node $REMOTE_PATH/$SCRIPT_NAME --login --state PA"
echo ""
