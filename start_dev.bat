@echo off
echo Starting Qix Ads Development Environment...

:: Start Server
start "Qix Ads Server" cmd /k "cd server && npm run dev"

:: Start Client
start "Qix Ads Client" cmd /k "cd client && npm run dev"

echo.
echo Servers are starting in new windows!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:4000
echo.
echo If the backend fails, please check your database credentials in server/.env
pause
