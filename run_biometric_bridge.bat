@echo off
title Biometric Bridge Agent
echo ===================================================
echo   Antigravity Biometric Bridge - Local to Cloud
echo ===================================================
echo.
echo Starting Bridge Agent...
echo.
cd server
cmd /k "npx ts-node src/scripts/biometric_bridge.ts"
pause
