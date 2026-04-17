$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    
    Write-Host "Creating a safety backup of the current dev.db before pushing schema changes..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && cp prisma/dev.db prisma/dev.db.safety_backup_pre_push"
    
    Write-Host "Running prisma db push to safely add missing tables and columns without dropping data..."
    # The --accept-data-loss=false flag ensures it will abort if any data loss would happen
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npx prisma db push --accept-data-loss=false"
    Write-Host $r1.Output
    
    Write-Host "Restarting the backend application so it recognizes the newly structured database tables..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 restart qix-ads-v2.7"
    
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
