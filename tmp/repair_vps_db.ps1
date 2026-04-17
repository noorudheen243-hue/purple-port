$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    
    Write-Host "Stopping PM2 to prevent further corruption or file locks..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 stop qix-ads-v2.7"
    
    Write-Host "Checking Database Integrity..."
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server/prisma && sqlite3 dev.db 'PRAGMA integrity_check;'"
    Write-Host "Integrity Check Result: $($r1.Output)"
    
    Write-Host "Attempting Database Repair (Dump & Restore)..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server/prisma && sqlite3 dev.db '.dump' > dump.sql"
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server/prisma && rm -f dev_recovered.db && sqlite3 dev_recovered.db < dump.sql"
    
    Write-Host "Checking Recovered Database Integrity..."
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server/prisma && sqlite3 dev_recovered.db 'PRAGMA integrity_check;'"
    Write-Host "Recovered DB Integrity: $($r2.Output)"
    
    # If recovered db is OK, swap it in
    if ($r2.Output.Contains("ok") -or $r2.Output.Contains("OK")) {
        Write-Host "Swapping databases..."
        Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server/prisma && mv dev.db dev.db.malformed && mv dev_recovered.db dev.db"
    } else {
        Write-Host "Recovery failed. Recovered DB is still malformed or missing."
    }
    
    Write-Host "Restarting PM2 Service..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 start qix-ads-v2.7"
    
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
