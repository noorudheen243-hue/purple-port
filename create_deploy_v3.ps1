$zip = "deploy_fix_v3.zip"
if (Test-Path $zip) { Remove-Item $zip }

$temp = "deploy_temp_v3"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null

# Copy Server
Write-Host "Copying Server..."
New-Item -ItemType Directory -Path "$temp\server" | Out-Null
Copy-Item -Path "server\*" -Destination "$temp\server" -Recurse

# CLEANUP: Remove source files and junk, BUT KEEP DIST
Remove-Item "$temp\server\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$temp\server\.env" -Force -ErrorAction SilentlyContinue
Remove-Item "$temp\server\dev.db" -Force -ErrorAction SilentlyContinue
# Remove-Item "$temp\server\src" -Recurse -Force -ErrorAction SilentlyContinue # Optional: Keep src for reference or delete to save space? Let's keep it safe.

# Copy Client Build (DIST ONLY)
Write-Host "Copying Client Build..."
New-Item -ItemType Directory -Path "$temp\client_dist" | Out-Null
Copy-Item -Path "client\dist\*" -Destination "$temp\client_dist" -Recurse

# Configs
Copy-Item "package.json" -Destination "$temp"

Write-Host "Zipping..."
Compress-Archive -Path "$temp\*" -DestinationPath $zip
Remove-Item $temp -Recurse -Force
Write-Host "Done! Created $zip"
