Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$LOCAL_DIST = "f:\Antigravity\client\dist"
$REMOTE_BASE = "/var/www/antigravity"

Write-Host "[1/4] Compressing build..."
if (Test-Path "f:\Antigravity\client_dist.zip") { Remove-Item "f:\Antigravity\client_dist.zip" }
Compress-Archive -Path "$LOCAL_DIST\*" -DestinationPath "f:\Antigravity\client_dist.zip" -Force
Write-Host "Compressed."

Write-Host "[2/4] Connecting to VPS..."
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "[3/4] Uploading via SCP..."
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\client_dist.zip" -Destination "$REMOTE_BASE/" -Force

Write-Host "[4/4] Extracting and reloading nginx..."
Invoke-SSHCommand -SSHSession $session -Command "cd $REMOTE_BASE && unzip -o client_dist.zip -d public/ && rm client_dist.zip && systemctl reload nginx"

Remove-SSHSession -SSHSession $session | Out-Null
Remove-Item "f:\Antigravity\client_dist.zip"
Write-Host "Frontend deployed successfully! Please hard refresh (Ctrl+F5)."
