@echo off
echo ========================================================
echo   QIX ADS DEPLOYMENT V7 (Admin & Sync)
echo ========================================================
echo.
echo 1. UPLOADING Patch File...
echo    (Enter password 'EzdanAdam@243')
scp deploy_update_v7.zip root@72.61.246.22:/var/www/purple-port/

echo.
echo 2. INSTALLING Patch on Server...
echo    (Enter password again)
ssh root@72.61.246.22 "cd /var/www/purple-port && unzip -o deploy_update_v7.zip && cp -r client_dist/* server/public/ && pm2 restart qix-api"

echo.
echo ========================================================
echo   DEPLOYMENT COMPLETE!
echo ========================================================
pause
