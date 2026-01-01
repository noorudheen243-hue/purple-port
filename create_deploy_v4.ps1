$zip = "deploy_fix_v4.zip"
if (Test-Path $zip) { Remove-Item $zip }

$temp = "deploy_temp_v4"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null

# Copy ONLY Server DIST (The compiled logic)
Write-Host "Copying Server Logic..."
New-Item -ItemType Directory -Path "$temp\server" | Out-Null
Copy-Item -Path "server\dist" -Destination "$temp\server" -Recurse

Write-Host "Zipping Patch..."
Compress-Archive -Path "$temp\*" -DestinationPath $zip
Remove-Item $temp -Recurse -Force
Write-Host "Done! Created $zip"
