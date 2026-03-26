Import-Module Posh-SSH -Force
$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASS = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

$sftp = New-SFTPSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force
Write-Host "Uploading ZIP..."
Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\deploy_package.zip" -Destination "/root/deploy_package.zip" -Force
Remove-SFTPSession -SFTPSession $sftp | Out-Null

$session = New-SSHSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content -Raw "f:\Antigravity\vps_deploy_internal.sh")))
$cmd = "echo '$b64' | base64 -d > /tmp/deploy.sh && chmod +x /tmp/deploy.sh && bash /tmp/deploy.sh"

Write-Host "Running Remote Script..."
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host "Output: " ($r.Output | Out-String)
Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "Done!"
