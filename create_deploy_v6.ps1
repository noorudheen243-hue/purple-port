$zip = "deploy_fix_v6.zip"
if (Test-Path $zip) { Remove-Item $zip }

$temp = "deploy_temp_v6"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null

# Copy Server DIST
Write-Host "Copying Server Logic..."
New-Item -ItemType Directory -Path "$temp\server" | Out-Null
Copy-Item -Path "server\dist" -Destination "$temp\server" -Recurse

# Copy Client DIST (New Frontend)
Write-Host "Copying Client Build..."
New-Item -ItemType Directory -Path "$temp\client_dist" | Out-Null
Copy-Item -Path "client\dist\*" -Destination "$temp\client_dist" -Recurse

Write-Host "Zipping V6..."
Compress-Archive -Path "$temp\*" -DestinationPath $zip
Remove-Item $temp -Recurse -Force
Write-Host "Done! Created $zip"
