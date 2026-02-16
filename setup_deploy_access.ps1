
# Setup Deployment Access (Passwordless SSH)
$ServerIP = "66.116.224.221"
$User = "root"
$KeyName = "deploy_key"
$KeyPath = "$PSScriptRoot\$KeyName"

# 1. Generate Key if missing
if (-not (Test-Path "$KeyPath")) {
    Write-Host "Generating Deployment Key..." -ForegroundColor Cyan
    ssh-keygen -t rsa -b 4096 -f "$KeyPath" -N "" -q
}

# 2. Read Public Key
$PubKey = Get-Content "$KeyPath.pub"

# 3. Install Key on VPS & Create Directories
Write-Host "---------------------------------------------------" -ForegroundColor Yellow
Write-Host "Please enter the VPS Root Password when prompted below." -ForegroundColor Yellow
Write-Host "This will authorize this computer for future deployments." -ForegroundColor Yellow
Write-Host "---------------------------------------------------" -ForegroundColor Yellow

# We run a single SSH command to do everything:
# - Create .ssh dir
# - Add key to authorized_keys
# - Create /var/www structure
# - Set permissions
$RemoteCmd = "mkdir -p ~/.ssh && echo '$PubKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && mkdir -p /var/www/purple-port && chmod 755 /var/www"

ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no "$User@$ServerIP" "$RemoteCmd"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Access Setup Complete! You can now deploy without passwords." -ForegroundColor Green
}
else {
    Write-Error "Failed to setup access. Did you enter the correct password?"
}
