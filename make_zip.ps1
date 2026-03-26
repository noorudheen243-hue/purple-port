$PACKAGE_DIR = "deploy_temp"
if (Test-Path $PACKAGE_DIR) { Remove-Item -Recurse -Force $PACKAGE_DIR }
New-Item -ItemType Directory -Path "$PACKAGE_DIR/client_dist" -Force | Out-Null
New-Item -ItemType Directory -Path "$PACKAGE_DIR/server_dist" -Force | Out-Null
Copy-Item -Path "client/dist\*" -Destination "$PACKAGE_DIR/client_dist" -Recurse -Force
Copy-Item -Path "server/dist\*" -Destination "$PACKAGE_DIR/server_dist" -Recurse -Force
New-Item -ItemType Directory -Path "$PACKAGE_DIR/server_dist/src" -Force | Out-Null
Copy-Item -Path "server/src\*" -Destination "$PACKAGE_DIR/server_dist/src" -Recurse -Force
Copy-Item -Path "server/package.json" -Destination "$PACKAGE_DIR/server_dist" -Force
New-Item -ItemType Directory -Path "$PACKAGE_DIR/server_dist/prisma" -Force | Out-Null
Copy-Item -Path "server/prisma/schema.prisma" -Destination "$PACKAGE_DIR/server_dist/prisma/" -Force
if (Test-Path "./deploy_package.zip") { Remove-Item "./deploy_package.zip" -Force }
tar.exe -a -c -f deploy_package.zip -C deploy_temp .
Remove-Item -Recurse -Force $PACKAGE_DIR
Write-Host "Zip Created successfully"
