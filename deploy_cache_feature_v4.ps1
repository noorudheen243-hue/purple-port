
# Deploy Cache Feature Update (v4 - Windows tar Fix)
$ServerIP = "66.116.224.221"
$User = "root"
$LocalProjectDir = "f:\Antigravity"
$TempDir = "$env:TEMP\deploy_cache_feature"

# 1. Build Backend
Write-Host "Building Backend..." -ForegroundColor Cyan
cd "$LocalProjectDir\server"
cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) { Write-Error "Backend Build Failed"; exit 1 }

# 2. Build Frontend
Write-Host "Building Frontend..." -ForegroundColor Cyan
cd "$LocalProjectDir\client"
cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend Build Failed"; exit 1 }

# 3. Create Package Structure
Write-Host "Packaging Update..." -ForegroundColor Cyan
if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
New-Item -ItemType Directory -Force -Path "$TempDir" | Out-Null

# Copy Backend Dist
New-Item -ItemType Directory -Force -Path "$TempDir\server\dist" | Out-Null
Copy-Item "$LocalProjectDir\server\dist\*" "$TempDir\server\dist" -Recurse

# Copy Frontend Build
New-Item -ItemType Directory -Force -Path "$TempDir\client\dist" | Out-Null
Copy-Item "$LocalProjectDir\client\dist\*" "$TempDir\client\dist" -Recurse

# 4. Zip It (Using Windows built-in tar for forward slashes)
$ZipFile = "$LocalProjectDir\cache_feature_update.zip"
if (Test-Path $ZipFile) { Remove-Item $ZipFile }

Write-Host "Zipping with tar (Forward Slashes)..." -ForegroundColor Cyan
# Change to TempDir so paths are relative inside the zip
Push-Location "$TempDir"
# Use tar to create zip. 
# -a: auto-detect output format (zip)
# -c: create
# -f: filename
# *: include everything recursively
tar -a -c -f "$ZipFile" *
Pop-Location

if (-not (Test-Path $ZipFile)) {
    Write-Error "Zip creation failed!"
    exit 1
}

# 5. Upload
Write-Host "Uploading to VPS..." -ForegroundColor Cyan
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $ZipFile "$User@${ServerIP}:/var/www/"

# 6. Remote Install
Write-Host "Installing on VPS..." -ForegroundColor Cyan
$RemoteScript = @"
set -e

echo "Step 1: Unpacking..."
# Clean previous extraction
rm -rf /var/www/purple-port/server/dist
rm -rf /var/www/purple-port/client/dist

# Unzip (will create files relative to current dir or absolute? 'unzip' usually handles tar-created zips fine if paths are relative)
# tar creates relative paths if run from inside dir.
unzip -o -q /var/www/cache_feature_update.zip -d /var/www/purple-port

if [ ! -d "/var/www/purple-port/client/dist" ]; then
    echo "❌ ERROR: Client dist not found after unzip. Directory structure might be wrong."
    ls -R /var/www/purple-port | head -n 10
    exit 1
fi

echo "Step 2: Updating Frontend..."
# Move client/dist to public (Nginx root)
mkdir -p /var/www/purple-port/public
rm -rf /var/www/purple-port/public/*
cp -r /var/www/purple-port/client/dist/* /var/www/purple-port/public/

echo "Step 3: Restarting Backend..."
cd /var/www/purple-port
pm2 reload all

echo "✅ UPDATE DEPLOYED!"
"@

# Remove Windows Carriage Returns (`r) BEFORE Encoding
if ($RemoteScript.Contains("`r")) {
    $RemoteScript = $RemoteScript -replace "`r", ""
}

# Base64 Encode
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($RemoteScript)
$Encoded = [Convert]::ToBase64String($Bytes)
$Command = "echo '$Encoded' | base64 -d | bash"

ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -t "$User@$ServerIP" $Command
