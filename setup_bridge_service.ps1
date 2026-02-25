# Script to install the Biometric Bridge as a persistent background service

Clear-Host
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Installing Biometric Bridge Service" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Switch to server directory
cd f:\Antigravity\server

# 2. Stop/Delete existing service if any
Write-Host "Cleaning up old instances..."
pm2 stop QixBiometricBridge -s
pm2 delete QixBiometricBridge -s

# 3. Start the Bridge as a background process using PM2
Write-Host "Starting Biometric Bridge in the background..." -ForegroundColor Green
pm2 start ecosystem.config.js

# 4. Save the PM2 list
Write-Host "Saving process list..."
pm2 save

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  INSTALLATION COMPLETE!                  " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "The Biometric Bridge is now running silently in the background."
Write-Host "It will continuously push logs to qixport.com even if you close the terminal"
Write-Host "or stop 'npm run dev'."
Write-Host "To monitor it, you can run: pm2 logs QixBiometricBridge"
