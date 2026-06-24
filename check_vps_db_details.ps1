Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting SSH..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

try {
    Write-Host "`nListing details of database files:" -ForegroundColor Yellow
    Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -la /var/www/purple-port/server/dev.db 2>/dev/null" | Select-Object -ExpandProperty Output
    Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -la /var/www/purple-port/server/prisma/dev.db 2>/dev/null" | Select-Object -ExpandProperty Output
    Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -la /var/www/purple-port/server/prisma/" | Select-Object -ExpandProperty Output
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}
