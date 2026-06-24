Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting SSH..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

try {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 show qix-api" -TimeOut 60
    if ($r.Output) {
        $out = $r.Output -join "`n"
        # Print lines containing path, cwd, or directory information
        $out.Split("`n") | Where-Object { $_ -match "cwd" -or $_ -match "path" -or $_ -match "status" -or $_ -match "directory" -or $_ -match "exec" -or $_ -match "script" } | Write-Host
    }
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}
