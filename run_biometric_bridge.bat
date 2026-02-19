@echo off
title Antigravity - Biometric Bridge Agent
color 0A
echo.
echo ===================================================
echo   Antigravity Biometric Bridge - Local to Cloud
echo ===================================================
echo.
echo  Device  : 192.168.1.201:4370
echo  Server  : http://66.116.224.221/api
echo  Interval: Every 5 seconds
echo.
echo  KEEP THIS WINDOW OPEN all day for live punch sync.
echo  Closing this window will STOP biometric sync.
echo.
echo ===================================================
echo.
cd /d "%~dp0\server"
cmd /k "npx ts-node src/scripts/biometric_bridge.ts"
pause
