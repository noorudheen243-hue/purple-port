@echo off
echo Starting Biometric Bridge Agent...
echo.

:: Navigate to the directory of this script (Project Root)
cd /d "%~dp0"

:: Check if server folder exists
if not exist "server" (
    echo Error: 'server' folder not found.
    echo Please ensure this file is in the Antigravity project root.
    pause
    exit /b
)

:: Navigate to server folder
cd server

:: Run the bridge script using npx (cmd-based, bypasses PowerShell)
call npx ts-node src/scripts/biometric_bridge.ts

:: Keep window open if it crashes
pause
