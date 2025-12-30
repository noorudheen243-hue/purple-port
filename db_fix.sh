#!/bin/bash
# FIX DATABASE PROVIDER SCRIPT
# Re-generates Prisma Client for PostgreSQL

echo ">>> Applying Database Provider Fix..."

cd ~/purple-port/server || exit

# 1. Update the Client
echo ">>> Regenerating Prisma Client..."
npx prisma generate

# 2. Push Schema (again, just to be sure)
echo ">>> Pushing Schema..."
npx prisma db push

# 3. Restart Server
echo ">>> Restarting Server..."
pm2 restart qix-api

echo "---------------------------------------"
echo ">>> FIXED! Try logging in now."
echo "---------------------------------------"
