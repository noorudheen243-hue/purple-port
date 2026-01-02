@echo off
echo ==================================================
echo      PURPLE PORT - FORCE REPAIR & DEPLOY
echo ==================================================
echo.
echo This script will FORCE RESYNC your online server with GitHub.
echo It fixes issues where "updates are not showing".
echo.
echo Step 1: Pushing local changes (just in case)...
git add .
git commit -m "chore: Force Repair Triggered"
git push origin main
echo.

echo Step 2: CONNECTING TO VPS...
echo You will be asked for the password (EzdanAdam@243)
echo.
echo COMMAND: git reset --hard origin/main
echo.

ssh root@72.61.246.22 "cd /var/www/purple-port && git fetch --all && git reset --hard origin/main && chmod +x deploy_update.sh && ./deploy_update.sh"

echo.
echo ==================================================
echo   IF YOU SAW "Deployment Complete" ABOVE:
echo   1. Clear your browser cache (Ctrl+Shift+R)
echo   2. Check the site again.
echo ==================================================
pause
