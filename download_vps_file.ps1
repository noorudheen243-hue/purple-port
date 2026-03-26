Import-Module Posh-SSH -Force
$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASS = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

Write-Host "Downloading controller.js from VPS..."
Get-SCPItem -ComputerName $SERVER_IP -Credential $Cred -Path "/var/www/purple-port/server/dist/modules/team/controller.js" -Destination "f:\Antigravity\vps_controller.js" -Force
Write-Host "Download Complete."
