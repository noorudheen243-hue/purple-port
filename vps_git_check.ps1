$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- GIT STATUS ON VPS ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port && git status"
    Write-Host $r1.Output
    
    Write-Host "`n--- CHECKING MISSING FILES ON VPS ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -la /var/www/purple-port/client/src/pages/marketing/SalesIntelligenceManager.tsx"
    Write-Host $r2.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
