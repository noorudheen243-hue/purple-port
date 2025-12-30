@echo off
echo Starting Purple Port Full Stack Bundle...

:: Start Server (relative to this script)
echo Starting Backend Server...
start "Purple Port Server" cmd /k "cd server && npm run dev"

:: Start Client (relative to this script)
echo Starting Frontend Client...
start "Purple Port Client" cmd /k "cd client && npm run dev"

echo.
echo Environment initialized.
echo Backend: http://localhost:4000
echo Frontend: http://localhost:5173
echo.
echo Please wait for the application to connect...
:: Allow time for servers to spin up
timeout /t 5
exit
