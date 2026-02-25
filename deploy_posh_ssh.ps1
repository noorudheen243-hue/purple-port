# VPS Deploy using Posh-SSH (installs if needed, uses password auth)
param()

$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$LocalDir = "f:\Antigravity"
$TempDir = "$LocalDir\deploy_temp_v9"
$ZipFile = "$LocalDir\backup_feature_update.zip"

# Install Posh-SSH if not present
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Host "Installing Posh-SSH module..." -ForegroundColor Yellow
    Install-Module Posh-SSH -Force -Scope CurrentUser -AllowClobber
}
Import-Module Posh-SSH -Force

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " DEPLOYING BACKUP FEATURE TO VPS        " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Package
Write-Host "[1/4] Packaging builds..." -ForegroundColor Yellow
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path $TempDir | Out-Null
Copy-Item "$LocalDir\server\dist" "$TempDir\dist" -Recurse
Copy-Item "$LocalDir\server\package.json" "$TempDir\package.json"
Copy-Item "$LocalDir\server\package-lock.json" "$TempDir\package-lock.json"
Copy-Item "$LocalDir\server\prisma" "$TempDir\prisma" -Recurse
@("$TempDir\prisma\dev.db", "$TempDir\prisma\prod.db") | Where-Object { Test-Path $_ } | Remove-Item -Force
New-Item -ItemType Directory -Path "$TempDir\public" | Out-Null
Copy-Item "$LocalDir\client\dist\*" "$TempDir\public" -Recurse
if (Test-Path $ZipFile) { Remove-Item $ZipFile }
Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipFile
$zipSize = [math]::Round((Get-Item $ZipFile).Length / 1MB, 1)
Write-Host "   Package: $ZipFile ($zipSize MB)" -ForegroundColor Green

# Create SSH session
Write-Host "[2/4] Connecting to VPS ($VPS)..." -ForegroundColor Yellow
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$Session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force -ErrorAction Stop
Write-Host "   SSH connected. SessionId: $($Session.SessionId)" -ForegroundColor Green

# Upload zip via SFTP
Write-Host "[3/4] Uploading package via SFTP..." -ForegroundColor Yellow
$SFTPSession = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force -ErrorAction Stop
Set-SFTPItem -SessionId $SFTPSession.SessionId -Path $ZipFile -Destination "/var/www/backup_feature_update.zip" -Force
Remove-SFTPSession -SessionId $SFTPSession.SessionId | Out-Null
Write-Host "   Upload complete." -ForegroundColor Green

# Run remote commands
Write-Host "[4/4] Running remote install + restart..." -ForegroundColor Yellow
$RemoteCmd = @"
export PATH=`$PATH:/usr/local/bin
[ -s "`$HOME/.nvm/nvm.sh" ] && . "`$HOME/.nvm/nvm.sh"

echo '-> Extracting to /var/www/antigravity...'
unzip -o -q /var/www/backup_feature_update.zip -d /var/www/antigravity

[ -d /var/www/purple-port ] && unzip -o -q /var/www/backup_feature_update.zip -d /var/www/purple-port && echo '-> Also extracted to /var/www/purple-port'

echo '-> Installing dependencies...'
cd /var/www/antigravity && npm install --production --no-audit --silent

echo '-> Creating backup storage directory...'
mkdir -p /var/backups/antigravity && chmod 755 /var/backups/antigravity

echo '-> Patching .env files...'
for ENV_FILE in /var/www/antigravity/.env /var/www/purple-port/.env; do
  [ -f "`$ENV_FILE" ] || continue
  grep -q BACKUP_DIR "`$ENV_FILE" || echo 'BACKUP_DIR=/var/backups/antigravity' >> "`$ENV_FILE"
  grep -q AUTO_BACKUP_ENABLED "`$ENV_FILE" || echo 'AUTO_BACKUP_ENABLED=true' >> "`$ENV_FILE"
  echo "   Patched: `$ENV_FILE"
done

echo '-> Restarting with PM2...'
pm2 restart all

echo 'SUCCESS'
"@
$result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $RemoteCmd -TimeOut 300
Write-Host $result.Output -ForegroundColor White
if ($result.Output -contains "SUCCESS") {
    Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
}
else {
    Write-Host "Check output above for any issues." -ForegroundColor Yellow
}

Remove-SSHSession -SessionId $Session.SessionId | Out-Null

# Cleanup
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " TEST: https://www.qixport.com/dashboard/settings" -ForegroundColor Green
Write-Host " Login as DEVELOPER_ADMIN → Settings → Backup & Restore tab" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
