@echo off
echo ========================================================
echo   QIX ADS DEPLOYMENT V6.1 (Frontend Fix)
echo ========================================================
echo.
echo 1. UPLOADING Patch File...
echo    (Please enter password 'EzdanAdam@243' if asked)
scp deploy_fix_v6_1.zip root@72.61.246.22:/var/www/purple-port/

echo.
echo 2. INSTALLING Patch on Server...
echo    (Enter password again if asked)
ssh root@72.61.246.22 "cd /var/www/purple-port && unzip -o deploy_fix_v6_1.zip && cp -r client_dist/* server/public/ && pm2 restart qix-api"

echo.
echo ========================================================
echo   DEPLOYMENT COMPLETE!
echo ========================================================
pause
