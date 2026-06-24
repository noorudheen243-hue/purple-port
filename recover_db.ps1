Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

try {
    $cmd = @"
cd /var/www/purple-port/server/prisma
pm2 stop qix-api
sqlite3 dev.db ".recover" | sqlite3 dev_recovered.db
if [ -f dev_recovered.db ]; then
    mv dev.db dev.corrupted.db
    mv dev_recovered.db dev.db
    echo "Database recovered successfully."
else
    echo "Failed to recover."
fi
pm2 start qix-api
"@
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 120
    if ($r.Output) { Write-Host ($r.Output -join "`n") }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Red }
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}
