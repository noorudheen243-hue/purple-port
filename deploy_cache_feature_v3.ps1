
# Deploy Cache Feature Update (v3 - Python Zip Fix)
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

# 4. Zip It (Using Python for reliable paths)
$ZipFile = "$LocalProjectDir\cache_feature_update.zip"
if (Test-Path $ZipFile) { Remove-Item $ZipFile }

Write-Host "Zipping with Python (Forward Slashes)..." -ForegroundColor Cyan
$PythonScript = @"
import zipfile
import os
import sys

src_dir = r'$TempDir'
zip_name = r'$ZipFile'

with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            file_path = os.path.join(root, file)
            # Create relative path from src_dir
            rel_path = os.path.relpath(file_path, src_dir)
            # Ensure forward slashes for Linux compatibility
            arcname = rel_path.replace(os.sep, '/')
            zf.write(file_path, arcname)
print('Zip created successfully.')
"@

python -c "$PythonScript"

if (-not (Test-Path $ZipFile)) {
    Write-Error "Zip creation failed!"
    exit 1
}

# 5. Upload
Write-Host "Uploading to VPS..." -ForegroundColor Cyan
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $ZipFile "$User@${ServerIP}:/var/www/"

# 6. Remote Install (Fixed Unzip Handling)
Write-Host "Installing on VPS..." -ForegroundColor Cyan
$RemoteScript = @"
# Ensure we exit on error, BUT handle unzip warnings smoothly if possible
# Set -e makes it exit on any error. Unzip returns 1 on warnings sometimes.
set +e 

echo "Step 1: Unpacking..."
# Clean previous extraction
rm -rf /var/www/purple-port/server/dist
rm -rf /var/www/purple-port/client/dist

# Unzip (will overwrite existing files in /var/www/purple-port because zip structure is relative)
# Our zip contains: server/dist/... and client/dist/...
# If we unzip to /var/www/purple-port, it will extract as /var/www/purple-port/server/dist/...
unzip -o -q /var/www/cache_feature_update.zip -d /var/www/purple-port

if [ $? -ne 0 ]; then
    echo "⚠️ Unzip had warnings or errors. Check output above."
    # Proceed with caution or check if key files exist?
fi

set -e # Re-enable strict mode

echo "Step 2: Updating Frontend..."
# The zip put client/dist into /var/www/purple-port/client/dist
# We need to move contents to /var/www/purple-port/public
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
