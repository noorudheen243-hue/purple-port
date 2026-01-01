@echo off
echo ===================================================
echo      FIXING ANTIGRAVITY SERVER AND DATABASE
echo ===================================================
echo.
echo 1. Stopping any stuck Node.js/Server processes...
taskkill /F /IM node.exe /T 2>nul
echo Done.
echo.

echo 2. Regenerating Database Client (Prisma)...
cd server
call npx prisma generate
echo.

echo 3. Verifying Database Sync...
call npx prisma db push
echo.

echo ===================================================
echo      RESTARTING SERVER NOW
echo ===================================================
echo.
npm run dev
pause
