Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 60
    if ($r.Output) { Write-Host $r.Output }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" }
    return $r
}

# Step 1: Confirm the correct live path
Write-Host "=== Step 1: Locating the live app ===" -ForegroundColor Cyan
Run "ls /var/www/purple-port/server/dist/modules/payroll/"
Run "ls /var/www/purple-port/server/"

# Step 2: Upload compiled JS to the CORRECT path
Write-Host "`n=== Step 2: Uploading to CORRECT purple-port path ===" -ForegroundColor Yellow
Set-SFTPItem -SFTPSession $sftp -Path 'f:\Antigravity\server\dist\modules\payroll\service.js' -Destination '/var/www/purple-port/server/dist/modules/payroll/' -Force
Write-Host "JS Service uploaded to purple-port!" -ForegroundColor Green

# Step 3: Restart PM2
Write-Host "`n=== Step 3: Restarting PM2 ===" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart all"

Write-Host "`n=== Done! ===" -ForegroundColor Green

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Remove-SFTPSession -SFTPSession $sftp | Out-Null
