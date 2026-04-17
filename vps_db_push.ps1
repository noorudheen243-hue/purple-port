$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- BACKING UP DB ---"
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cp /var/www/purple-port/server/prisma/dev.db /var/www/purple-port/server/prisma/dev.db.$timestamp.bak"
    
    Write-Host "--- RUNNING PRISMA DB PUSH ---"
    # Using --skip-generate as we already generated client in the previous build step
    $cmd = "cd /var/www/purple-port/server && npx prisma db push --skip-generate"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd
    Write-Host $r1.Output
    
    Write-Host "--- VERIFYING TABLE ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npx prisma db pull --print | grep MarketingGroup"
    Write-Host "Verification result:"
    Write-Host $r2.Output
    
    Write-Host "--- RESTARTING APP TO PICK UP NEW SCHEMA ---"
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 restart qix-api"
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
