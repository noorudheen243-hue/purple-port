$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- STOPPING PM2 ---"
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 stop qix-api"
    
    Write-Host "--- CLEANING & RESETTING GIT ---"
    # Force sync and remove any build artifacts
    $cmd = "cd /var/www/purple-port && git fetch origin main && git clean -df && git reset --hard origin/main"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd
    Write-Host $r1.Output
    
    Write-Host "--- VERIFYING ROUTE SOURCE ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep -C 2 '/meta/accounts' /var/www/purple-port/server/src/modules/marketing-tasks/routes.ts"
    Write-Host "Grep result for /meta/accounts:"
    Write-Host $r2.Output
    
    Write-Host "--- CLEARING DIST ---"
    Invoke-SSHCommand -SessionId $s.SessionId -Command "rm -rf /var/www/purple-port/server/dist"
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
