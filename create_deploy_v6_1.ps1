$zip = "deploy_fix_v6_1.zip"
if (Test-Path $zip) { Remove-Item $zip }

$temp = "deploy_temp_v6_1"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null

# Copy Client DIST (New Frontend)
Write-Host "Copying Client Build..."
New-Item -ItemType Directory -Path "$temp\client_dist" | Out-Null
Copy-Item -Path "client\dist\*" -Destination "$temp\client_dist" -Recurse

Write-Host "Zipping V6.1..."
Compress-Archive -Path "$temp\*" -DestinationPath $zip
Remove-Item $temp -Recurse -Force
Write-Host "Done! Created $zip"
