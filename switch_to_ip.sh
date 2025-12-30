#!/bin/bash
# TEMPORARY IP SWITCH SCRIPT
# Use this when Domain DNS is taking too long.
# It configures the system to use the Raw IP Address.

YOUR_IP="72.61.246.22"

echo ">>> Switching System to use IP: $YOUR_IP"

# 1. Update Backend Environment (CLIENT_URL)
SERVER_ENV_FILE="server/.env"

if [ -f "$SERVER_ENV_FILE" ]; then
    # Remove existing CLIENT_URL line
    sed -i '/^CLIENT_URL=/d' "$SERVER_ENV_FILE"
    # Add IP-based URL
    echo "CLIENT_URL=http://$YOUR_IP" >> "$SERVER_ENV_FILE"
    echo ">>> Updated server/.env"
else
    echo ">>> ERROR: server/.env not found!"
    exit 1
fi

# 2. Run Full Repair to Rebuild Frontend with new IP
echo ">>> Triggering Full Repair/Rebuild..."
bash full_repair.sh
