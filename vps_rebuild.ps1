$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- NPM INSTALL & BUILD (Background) ---"
    # We use a background command to avoid SSH timeout during the build process
    $cmd = "cd /var/www/purple-port/server && npm install && npx prisma generate && npm run build && pm2 start dist/server.js --name qix-api --update-env"
    
    # We'll run this in the background and tail the logs later
    $bg_cmd = "nohup bash -c '$cmd' > /var/www/purple-port/server/build.log 2>&1 &"
    Invoke-SSHCommand -SessionId $s.SessionId -Command $bg_cmd
    Write-Host "Rebuild started in background. Monitor /var/www/purple-port/server/build.log for progress."
    
    Start-Sleep -Seconds 10
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "tail -n 20 /var/www/purple-port/server/build.log"
    Write-Host "Initial Log Output:"
    Write-Host $r1.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
