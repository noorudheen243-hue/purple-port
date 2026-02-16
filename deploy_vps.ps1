# VPS Deployment via PowerShell
# This script deploys the latest code to the VPS

$VPS_IP = "66.116.224.221"
$VPS_USER = "root"
$PROJECT_PATH = "/var/www/purple-port"

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "VPS Deployment Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Commands to run on VPS
$commands = @(
    "cd $PROJECT_PATH",
    "git pull origin main",
    "npm install",
    "npm run build",
    "pm2 restart all"
)

$commandString = $commands -join " && "

Write-Host "Connecting to VPS: $VPS_USER@$VPS_IP" -ForegroundColor Yellow
Write-Host "Running deployment commands..." -ForegroundColor Yellow
Write-Host ""

# Try using ssh with relaxed security (for testing)
$sshCommand = "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $VPS_USER@$VPS_IP `"$commandString`""

try {
    Invoke-Expression $sshCommand
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Green
    Write-Host "Deployment Complete!" -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Red
    Write-Host "Deployment Failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "====================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please deploy manually via SSH or contact your VPS administrator." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
