@echo off
echo Checking PM2 Configuration and File Paths...
echo (Enter password 'EzdanAdam@243' when prompted)
echo.

echo --- PM2 STATUS ---
ssh root@72.61.246.22 "pm2 describe qix-api"

echo.
echo --- CHECKING SERVER/PUBLIC ---
ssh root@72.61.246.22 "ls -l /var/www/purple-port/server/public/index.html"

echo.
echo --- CHECKING ROOT/PUBLIC ---
ssh root@72.61.246.22 "ls -l /var/www/purple-port/public/index.html"

echo.
echo --- CHECKING BACKEND FILE (Routes) ---
ssh root@72.61.246.22 "ls -l --time-style=long-iso /var/www/purple-port/server/dist/modules/backup/routes.js"

pause
