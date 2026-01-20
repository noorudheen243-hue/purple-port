@echo off
title Biometric Bridge Agent
echo Starting Biometric Bridge...
echo Connecting local device (192.168.1.201) to Private Cloud (72.61.246.22)...
echo.

cd %~dp0
call npm install zkteco-js axios
call npx ts-node server/src/scripts/biometric_bridge.ts
pause
