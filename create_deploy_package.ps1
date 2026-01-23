$zip = "deploy_package.zip"
if (Test-Path $zip) { Remove-Item $zip }

# Create a temp folder
$temp = "deploy_temp"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null

# Copy Server (Excluding node_modules and .git)
Write-Host "Copying Server Files..."
New-Item -ItemType Directory -Path "$temp\server" | Out-Null
Copy-Item -Path "server\*" -Destination "$temp\server" -Recurse
# Cleanup Server junk
Remove-Item "$temp\server\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$temp\server\.env" -Force -ErrorAction SilentlyContinue
Remove-Item "$temp\server\dev.db" -Force -ErrorAction SilentlyContinue
Remove-Item "$temp\server\dev.db-journal" -Force -ErrorAction SilentlyContinue

# Copy Client Build
Write-Host "Copying Client Build..."
New-Item -ItemType Directory -Path "$temp\server\public" | Out-Null
Copy-Item -Path "client\dist\*" -Destination "$temp\server\public" -Recurse

# Copy Configs
Copy-Item "package.json" -Destination "$temp"

# Zip it
Write-Host "Zipping..."
Compress-Archive -Path "$temp\*" -DestinationPath $zip

# Cleanup
Remove-Item $temp -Recurse -Force

Write-Host "Done! created $zip"
