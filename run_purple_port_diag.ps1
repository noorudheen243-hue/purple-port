Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"  
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 60) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" }
    return $r
}

# Upload the diagnostic script
Write-Host "Uploading diagnostic script to purple-port..." -ForegroundColor Cyan
Set-SFTPItem -SFTPSession $sftp -Path 'f:\Antigravity\server\tmp_local_vps_db_test.js' -Destination '/var/www/purple-port/server/' -Force

# Run with the purple-port database
Write-Host "`nRunning diagnostic on LIVE purple-port database..." -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && DATABASE_URL='file:./prisma/dev.db' node tmp_local_vps_db_test.js 2>&1" 120

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Remove-SFTPSession -SFTPSession $sftp | Out-Null
