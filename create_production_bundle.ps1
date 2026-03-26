$zip = "half_day_leave_update.zip"
if (Test-Path $zip) { Remove-Item $zip }

$temp = "deploy_bundle"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null

# 1. Copy Server Dist
Write-Host "Copying Server Dist..."
New-Item -ItemType Directory -Path "$temp\dist" | Out-Null
Copy-Item -Path "server\dist\*" -Destination "$temp\dist" -Recurse

# 2. Copy Client Dist to 'public'
Write-Host "Copying Client Dist to public..."
New-Item -ItemType Directory -Path "$temp\public" | Out-Null
Copy-Item -Path "client\dist\*" -Destination "$temp\public" -Recurse

# 3. Copy Prisma
Write-Host "Copying Prisma..."
New-Item -ItemType Directory -Path "$temp\prisma" | Out-Null
Copy-Item -Path "server\prisma\schema.prisma" -Destination "$temp\prisma\"

# 4. Copy package.json
Write-Host "Copying package.json..."
Copy-Item -Path "server\package.json" -Destination "$temp\"

Write-Host "Zipping Bundle..."
Compress-Archive -Path "$temp\*" -DestinationPath $zip
Remove-Item $temp -Recurse -Force

Write-Host "Done! Created $zip"
