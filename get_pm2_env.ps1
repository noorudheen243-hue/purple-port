Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting SSH..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

try {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 env 0" -TimeOut 60
    if ($r.Output) {
        $out = $r.Output -join "`n"
        $out.Split("`n") | Where-Object { $_ -match "DATABASE_URL" -or $_ -match "database" -or $_ -match "DB" } | Write-Host
    }
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}
