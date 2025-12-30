#!/bin/bash
# FIX CORS BLINKING ISSUE
# Adds the VPSS IP to the allowed list in server/.env

echo ">>> Applying Fix for Login Page..."

# 1. Navigate to Server
cd ~/purple-port/server || exit

# 2. Add CLIENT_URL if it doesn't exist
# We use grep to check if it's already there to avoid duplicates
if grep -q "CLIENT_URL" .env; then
  echo ">>> CLIENT_URL already exists, updating it..."
  # Use sed to replace the existing line
  sed -i 's|CLIENT_URL=.*|CLIENT_URL="http://72.61.246.22"|g' .env
else
  echo ">>> Adding CLIENT_URL to .env..."
  echo "" >> .env
  echo 'CLIENT_URL="http://72.61.246.22"' >> .env
fi

# 3. Restart Backend
echo ">>> Restarting Server..."
pm2 restart qix-api

echo "---------------------------------------"
echo ">>> FIXED! Try logging in now."
echo "---------------------------------------"
