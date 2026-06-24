Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

try {
    Write-Host "Connecting to $VPS as $User..."
    $session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force -ErrorAction Stop
    Write-Host "Successfully connected!"
    
    # 1. Append NODE_ENV=production to .env on the VPS
    Write-Host "Appending NODE_ENV=production to VPS .env file..."
    $cmd1 = 'echo "NODE_ENV=production" >> /var/www/purple-port/server/.env'
    $r1 = Invoke-SSHCommand -SSHSession $session -Command $cmd1 -ErrorAction Stop
    
    # 2. Check that it was appended
    Write-Host "Verifying VPS .env file contents..."
    $cmd2 = 'cat /var/www/purple-port/server/.env'
    $r2 = Invoke-SSHCommand -SSHSession $session -Command $cmd2 -ErrorAction Stop
    Write-Host ($r2.Output -join "`n")
    
    # 3. Restart PM2 process to apply new environment variables
    Write-Host "Restarting qix-api in PM2 with --update-env..."
    $cmd3 = 'pm2 restart qix-api --update-env'
    $r3 = Invoke-SSHCommand -SSHSession $session -Command $cmd3 -ErrorAction Stop
    Write-Host ($r3.Output -join "`n")
    
    # 4. Verify the active PM2 environment
    Write-Host "Verifying active PM2 process environment..."
    $cmd4 = 'pm2 env 0 | grep -i node_env'
    $r4 = Invoke-SSHCommand -SSHSession $session -Command $cmd4 -ErrorAction Stop
    Write-Host "Active NODE_ENV inside PM2: $($r4.Output -join ' ')"
    
    Remove-SSHSession -SSHSession $session
} catch {
    Write-Error $_.Exception.Message
}
