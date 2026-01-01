@echo off
echo ==================================================
echo      PURPLE PORT - UNIFIED DEPLOYMENT SYSTEM
echo ==================================================
echo.
echo THIS WILL:
echo 1. Push all your changes to GitHub
echo 2. Connect to the Online Server (72.61.246.22)
echo 3. Automatically pull and deploy the changes
echo.
echo Please ensure you have tested your changes locally!
echo.
pause

echo.
echo [1/3] Committing changes to GitHub...
git add .
set /p commit_msg="Enter commit message: "
git commit -m "%commit_msg%"
git push origin main
if %errorlevel% neq 0 (
    echo [ERROR] Git push failed! Please fix conflicts first.
    pause
    exit /b
)

echo.
echo [2/3] Triggering Online Deployment...
echo Connecting to VPS (72.61.246.22)...
echo.
ssh root@72.61.246.22 "cd /var/www/purple-port && ./deploy_update.sh"

if %errorlevel% neq 0 (
    echo [ERROR] Online deployment failed! Check server logs.
) else (
    echo.
    echo [SUCCESS] Online Application Updated Successfully!
)

echo.
echo [3/3] Handling Local Application
echo If you are running the local server, it should update automatically via HMR/Nodemon.
echo If you need to rebuild the Desktop App installer, run:
echo    npm run dist (in desktop folder)
echo.
echo Deployment Complete.
pause
