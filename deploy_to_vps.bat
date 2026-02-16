@echo off
echo ===================================
echo VPS Deployment Script
echo ===================================
echo.

REM Use PuTTY's plink if available, otherwise use OpenSSH
where plink >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Using PuTTY plink...
    plink -batch root@66.116.224.221 "cd /var/www/purple-port && git pull && npm run build && pm2 restart all"
) else (
    echo Using OpenSSH...
    ssh -o StrictHostKeyChecking=no root@66.116.224.221 "cd /var/www/purple-port && git pull && npm run build && pm2 restart all"
)

echo.
echo ===================================
echo Deployment Complete!
echo ===================================
pause
