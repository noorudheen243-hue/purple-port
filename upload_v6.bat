@echo off
echo ==========================================
echo      UPLOADING V6 PATCH TO SERVER
echo ==========================================
echo.
echo Command: scp deploy_fix_v6.zip root@72.61.246.22:/var/www/purple-port/
echo.
echo [IMPORTANT] You will be asked for the VPS Password.
echo Please type it and press Enter.
echo.
scp deploy_fix_v6.zip root@72.61.246.22:/var/www/purple-port/
echo.
echo ==========================================
echo        UPLOAD PROCESS FINISHED
echo ==========================================
pause
