$zip = "deploy_fix_v2.zip"
if (Test-Path $zip) { Remove-Item $zip }

$temp = "deploy_temp_v2"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null

# Copy Server
Write-Host "Copying Server..."
New-Item -ItemType Directory -Path "$temp\server" | Out-Null
Copy-Item -Path "server\*" -Destination "$temp\server" -Recurse
# Cleanup Server
Remove-Item "$temp\server\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$temp\server\.env" -Force -ErrorAction SilentlyContinue
Remove-Item "$temp\server\dev.db" -Force -ErrorAction SilentlyContinue
Remove-Item "$temp\server\dev.db-journal" -Force -ErrorAction SilentlyContinue
Remove-Item "$temp\server\dist" -Recurse -Force -ErrorAction SilentlyContinue 

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
