
# Deploy Cache Feature Update
$ServerIP = "66.116.224.221"
$User = "root"
$LocalProjectDir = "f:\Antigravity"
$TempDir = "$env:TEMP\deploy_cache_feature"

# 1. Build Backend
Write-Host "Building Backend..." -ForegroundColor Cyan
cd "$LocalProjectDir\server"
call npm run build

# 2. Build Frontend
Write-Host "Building Frontend..." -ForegroundColor Cyan
cd "$LocalProjectDir\client"
call npm run build

# 3. Create Package
Write-Host "Packaging Update..." -ForegroundColor Cyan
if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
New-Item -ItemType Directory -Force -Path "$TempDir" | Out-Null

# Copy Backend Dist
New-Item -ItemType Directory -Force -Path "$TempDir\server\dist" | Out-Null
Copy-Item "$LocalProjectDir\server\dist\*" "$TempDir\server\dist" -Recurse

# Copy Frontend Build
New-Item -ItemType Directory -Force -Path "$TempDir\client\dist" | Out-Null
Copy-Item "$LocalProjectDir\client\dist\*" "$TempDir\client\dist" -Recurse

# Zip It
$ZipFile = "$LocalProjectDir\cache_feature_update.zip"
Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipFile -Force

# 4. Upload
Write-Host "Uploading to VPS..." -ForegroundColor Cyan
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $ZipFile "$User@${ServerIP}:/var/www/"

# 5. Remote Install
Write-Host "Installing on VPS..." -ForegroundColor Cyan
$RemoteScript = @"
set -e
echo "Step 1: Unpacking..."
unzip -o -q /var/www/cache_feature_update.zip -d /var/www/purple-port

echo "Step 2: Moving Frontend..."
# Move client/dist to public (Nginx root)
rm -rf /var/www/purple-port/public/*
cp -r /var/www/purple-port/client/dist/* /var/www/purple-port/public/

echo "Step 3: Restarting Backend..."
cd /var/www/purple-port
pm2 reload all

echo "✅ UPDATE DEPLOYED!"
"@

# Base64 Encode to avoid shell syntax errors
# (We learned this lesson!)
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($RemoteScript)
$Encoded = [Convert]::ToBase64String($Bytes)
$Command = "echo '$Encoded' | base64 -d | bash"

ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -t "$User@$ServerIP" $Command
