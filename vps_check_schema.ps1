$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- VPS SCHEMA CHECK ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep -n 'model MarketingGroup' /var/www/purple-port/server/prisma/schema.prisma"
    Write-Host $r1.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
