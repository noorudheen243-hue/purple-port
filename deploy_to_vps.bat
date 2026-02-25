@echo off
echo ==========================================
echo   DEPLOYING BACKUP FEATURE TO VPS
echo ==========================================
echo.
echo Step 1: Upload zip to VPS (enter root password when prompted)
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no "f:\Antigravity\backup_feature_update.zip" "root@66.116.224.221:/var/www/backup_feature_update.zip"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Upload failed
    pause
    exit /b 1
)
echo Upload OK.

echo.
echo Step 2: Upload deploy script (enter root password when prompted)
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no "f:\Antigravity\vps_deploy_backup.sh" "root@66.116.224.221:/var/www/vps_deploy_backup.sh"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Script upload failed
    pause
    exit /b 1
)

echo.
echo Step 3: Running deploy on VPS (enter root password when prompted)
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no root@66.116.224.221 "chmod +x /var/www/vps_deploy_backup.sh && bash /var/www/vps_deploy_backup.sh"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Remote deploy failed
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   SUCCESS! Backup feature is now live!
echo   Visit: https://www.qixport.com/dashboard/settings
echo ==========================================
pause
