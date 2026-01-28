@echo off
echo ==========================================
echo      ANTIGRAVITY LOCAL RECOVERY KIT
echo ==========================================

echo 1. Stopping any stuck server processes...
taskkill /F /IM node.exe >nul 2>&1

echo 2. Switching to Server Directory...
F:
cd \Antigravity\server

echo 3. Refreshing Database Schema...
call npx prisma generate

echo 4. Pushing Database Changes...
call npx prisma db push

echo 5. Creating Admin User (seed_local.ts)...
call npx ts-node seed_local.ts

echo ==========================================
echo      STARTING SERVER NOW...
echo ==========================================
call npm run dev
