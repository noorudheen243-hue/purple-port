if (Test-Path 'f:\Antigravity\client_dist.zip') { Remove-Item 'f:\Antigravity\client_dist.zip' -Force }
Write-Host "Starting archive compression..."
Compress-Archive -Path "f:\Antigravity\client\dist\*" -DestinationPath "f:\Antigravity\client_dist.zip" -Force
Write-Host "Archive created. Executing deployment script..."
. "f:\Antigravity\redeploy_client_only.ps1"
