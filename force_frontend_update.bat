@echo off
echo ========================================================
echo   FORCE FRONTEND UPDATE (Repair Script)
echo ========================================================
echo.
echo This script will manually wipe the old frontend files on the server
echo and force-copy the new ones from the uploaded package.
echo.
echo Please enter password 'EzdanAdam@243' when prompted.

ssh root@72.61.246.22 "cd /var/www/purple-port && echo '[1] Checking New Files...' && ls -l --time-style=long-iso client_dist/index.html && echo '[2] Wiping Old Files...' && rm -rf server/public/* && echo '[3] Copying New Files...' && cp -r client_dist/* server/public/ && echo '[4] Verifying Update...' && ls -l --time-style=long-iso server/public/index.html"

echo.
echo If the dates above match (are today), it is FIXED.
echo.
pause
