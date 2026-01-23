
@echo off
echo ==========================================
echo      Qix Ads - Deployment Script
echo ==========================================
echo.
echo [1/2] Uploading Deployment Package...
echo (Please enter password 'EzdanAdam@243' if prompted)
scp f:\Antigravity\deploy_package.zip root@72.61.246.22:/root/
if %ERRORLEVEL% NEQ 0 (
    echo Upload Failed! Exiting.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Connecting to Server to Install...
echo (Please enter password 'EzdanAdam@243' if prompted)
ssh -t root@72.61.246.22 "echo 'Backing up .env...'; cp /var/www/purple-port/server/.env /root/env.backup || echo 'No .env to backup'; echo 'Cleaning old files...'; rm -rf /var/www/purple-port; mkdir -p /var/www/purple-port; echo 'Unzipping...'; unzip -o /root/deploy_package.zip -d /var/www/purple-port; echo 'Restoring .env...'; mkdir -p /var/www/purple-port/server; cp /root/env.backup /var/www/purple-port/server/.env || echo 'No backup to restore'; cd /var/www/purple-port/server; echo 'Installing Dependencies...'; npm install --production; echo 'Setting up Database...'; npx prisma db push; echo 'Restarting App...'; pm2 delete qix-ads || true; NODE_ENV=production pm2 start dist/server.js --name 'qix-ads'; pm2 save; echo 'DEPLOYMENT COMPLETE!'"

echo.
echo Done! App should be live at http://72.61.246.22:4001
pause
