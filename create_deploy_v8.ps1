$zip = "deploy_update_v8.zip"
if (Test-Path $zip) { Remove-Item $zip }

$temp = "deploy_temp_v8"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null

# Copy Server
Write-Host "Copying Server..."
New-Item -ItemType Directory -Path "$temp\server" | Out-Null
Copy-Item -Path "server\dist" -Destination "$temp\server" -Recurse

# Copy Client
Write-Host "Copying Client..."
New-Item -ItemType Directory -Path "$temp\client_dist" | Out-Null
Copy-Item -Path "client\dist\*" -Destination "$temp\client_dist" -Recurse

Write-Host "Waiting for file handles..."
Start-Sleep -Seconds 3

Write-Host "Zipping V8..."
Compress-Archive -Path "$temp\*" -DestinationPath $zip
Remove-Item $temp -Recurse -Force
Write-Host "Done! Created $zip"
