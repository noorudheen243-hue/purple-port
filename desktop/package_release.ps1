$ErrorActionPreference = "Stop"

$version = "1.0.0"
$releaseDir = "release/v$version"
$distDir = "dist"

# Ensure Release Directory
if (Test-Path $releaseDir) {
    Remove-Item $releaseDir -Recurse -Force
}
New-Item -ItemType Directory -Path $releaseDir | Out-Null

Write-Host "Packaging Release v$version..."

# 1. Copy Installer
$installer = "$distDir/Purple Port Setup $version.exe"
if (Test-Path $installer) {
    Copy-Item $installer -Destination $releaseDir
    Write-Host "[OK] Copied Installer"
} else {
    Write-Warning "Installer not found at $installer. Build might still be running or failed."
}

# 2. Copy Portable Folder
$unpacked = "$distDir/win-unpacked"
if (Test-Path $unpacked) {
    Copy-Item $unpacked -Recurse -Destination "$releaseDir/Purple Port Portable"
    Write-Host "[OK] Copied Portable Folder"
} else {
    Write-Warning "Unpacked folder not found at $unpacked."
}

# 3. Create ZIP
$zipFile = "release/Purple_Port_v$version.zip"
if (Test-Path $zipFile) { Remove-Item $zipFile }

Write-Host "Compressing to $zipFile..."
Compress-Archive -Path "$releaseDir/*" -DestinationPath $zipFile

Write-Host "Done! Release Package at $zipFile"
