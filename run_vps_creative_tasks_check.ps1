Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

try {
    $sftpSession = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
    $sshSession = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
    
    Set-SFTPItem -SessionId $sftpSession.SessionId -Path "f:\Antigravity\server\src\scripts\check_vps_creative_tasks.ts" -Destination "/var/www/purple-port/server" -Force

    $RemoteCMD = "cd /var/www/purple-port/server && npx ts-node check_vps_creative_tasks.ts"
    $r = Invoke-SSHCommand -SessionId $sshSession.SessionId -Command $RemoteCMD
    Write-Host $r.Output
} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($sftpSession) { Remove-SFTPSession -SessionId $sftpSession.SessionId }
    if ($sshSession) { Remove-SSHSession -SessionId $sshSession.SessionId }
}
