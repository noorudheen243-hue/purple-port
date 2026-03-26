# Deploy frontend dist to VPS using password auth
# Uses plink if available (PuTTY), else falls back to ssh with StrictHostKeyChecking

$ServerIP = "66.116.224.221"
$User = "root"
$Password = "EzdanAdam@243"
$LocalProjectDir = "f:\Antigravity"
$ZipFile = "$env:TEMP\frontend_update.zip"
$VPSPath = "/var/www/purple-port/server/public"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   DEPLOYING FRONTEND TO VPS ($ServerIP)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Step 1: Zip the built frontend
Write-Host "[1/4] Zipping frontend dist..." -ForegroundColor Yellow
if (Test-Path $ZipFile) { Remove-Item $ZipFile -Force }
Compress-Archive -Path "$LocalProjectDir\client\dist\*" -DestinationPath $ZipFile
Write-Host "   -> Zipped: $ZipFile" -ForegroundColor Green

# Step 2: Check for sshpass or plink
$plinkPath = Get-Command plink -ErrorAction SilentlyContinue
$sshpassPath = Get-Command sshpass -ErrorAction SilentlyContinue
$scpPath = Get-Command scp -ErrorAction SilentlyContinue

Write-Host "[2/4] Upload method detection..." -ForegroundColor Yellow

# Use plink/pscp (PuTTY tools) if available
if ($plinkPath) {
    Write-Host "   -> Using plink/pscp (PuTTY)" -ForegroundColor Green

    # Upload zip
    Write-Host "[3/4] Uploading zip to VPS..." -ForegroundColor Yellow
    echo y | pscp -pw $Password $ZipFile "${User}@${ServerIP}:/tmp/frontend_update.zip"

    # Remote extraction
    Write-Host "[4/4] Extracting on VPS and clearing cache..." -ForegroundColor Yellow
    $cmd = "rm -rf $VPSPath/* && unzip -o -q /tmp/frontend_update.zip -d $VPSPath && rm /tmp/frontend_update.zip && echo 'DONE'"
    echo y | plink -pw $Password "${User}@${ServerIP}" $cmd
}
else {
    # Use native Windows OpenSSH with StrictHostKeyChecking=no + send password via stdin trick
    # Since native ssh doesn't support password in args, we'll use a Python helper or direct scp
    Write-Host "   -> Using native OpenSSH (no plink found)" -ForegroundColor Yellow

    # Check if sshpass available (WSL or Git Bash)
    $wslPath = Get-Command wsl -ErrorAction SilentlyContinue
    if ($wslPath) {
        Write-Host "   -> Using WSL sshpass" -ForegroundColor Green
        $wslZipFile = (wsl bash -c "wslpath '${ZipFile}'").Trim()
        
        Write-Host "[3/4] Uploading zip via WSL sshpass..." -ForegroundColor Yellow
        wsl bash -c "sshpass -p '$Password' scp -o StrictHostKeyChecking=no '$wslZipFile' '${User}@${ServerIP}:/tmp/frontend_update.zip'"
        
        Write-Host "[4/4] Extracting on VPS..." -ForegroundColor Yellow
        wsl bash -c "sshpass -p '$Password' ssh -o StrictHostKeyChecking=no '${User}@${ServerIP}' 'rm -rf $VPSPath/* && unzip -o -q /tmp/frontend_update.zip -d $VPSPath && rm /tmp/frontend_update.zip && echo DONE'"
    }
    else {
        Write-Host "ERROR: Neither plink nor WSL found. Cannot do password-based upload." -ForegroundColor Red
        Write-Host "Please install PuTTY (plink/pscp) or enable WSL, then re-run." -ForegroundColor Red
        exit 1
    }
}

Write-Host "================================================" -ForegroundColor Green
Write-Host "   FRONTEND DEPLOYED SUCCESSFULLY!              " -ForegroundColor Green  
Write-Host "   Visit: http://$ServerIP                      " -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
