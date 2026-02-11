
# VPS Reprovisioning Script Wrapper - PIPE METHOD - ROBUST ARGS
# Reads the local setup script and pipes it directly to SSH execution

$vpsUser = "user"
$vpsHost = "66.116.224.221"
$localScriptPath = "f:\Antigravity\setup_vps.sh"
 
Write-Host "Starting VPS Reprovisioning (Pipe Method v2)..." -ForegroundColor Cyan

if (-not (Test-Path $localScriptPath)) {
    Write-Host "Local script not found at $localScriptPath" -ForegroundColor Red
    exit 1
}

# Use type to pipe the content. 
# We explicitly quote the ssh arguments to prevent PowerShell parsing issues.
# we use cmd /c type for raw piping

cmd /c type $localScriptPath | ssh -o "StrictHostKeyChecking=no" -o "HostKeyAlgorithms=+ssh-rsa" -o "PubkeyAcceptedKeyTypes=+ssh-rsa" ${vpsUser}@${vpsHost} "bash -s"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Reprovisioning Complete!" -ForegroundColor Green
}
else {
    Write-Host "Reprovisioning Failed. Exit Code: $LASTEXITCODE" -ForegroundColor Red
}
