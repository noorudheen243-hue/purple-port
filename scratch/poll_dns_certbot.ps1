Import-Module Posh-SSH -Force

$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASS = "EzdanAdam@243"
$Domain = "crm.qixads.com"

$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

Write-Host "Monitoring DNS propagation for $Domain..." -ForegroundColor Yellow

$resolved = $false
for ($i = 1; $i -le 90; $i++) {
    Write-Host "Attempt $i/90: Resolving $Domain..."
    
    # Try resolving via Google DNS
    $dns = Resolve-DnsName -Name $Domain -Server 8.8.8.8 -ErrorAction SilentlyContinue
    if ($dns -and $dns.IPAddress -eq $SERVER_IP) {
        Write-Host "Success! DNS has propagated: $Domain points to $SERVER_IP" -ForegroundColor Green
        $resolved = $true
        break
    }
    
    Start-Sleep -Seconds 10
}

if ($resolved) {
    try {
        Write-Host "Opening SSH session to VPS to run Certbot..." -ForegroundColor Yellow
        $session = New-SSHSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force
        
        $remoteScript = "certbot --nginx -d $Domain --non-interactive --agree-tos --email admin@qixads.com"
        Write-Host "Executing on VPS: $remoteScript" -ForegroundColor Yellow
        $res = Invoke-SSHCommand -SSHSession $session -Command $remoteScript
        
        Write-Host "`n=== Certbot Output ===" -ForegroundColor Green
        Write-Host $res.Output -ForegroundColor White
        
        if ($res.Error) {
            Write-Host "`n=== Certbot Warnings/Errors ===" -ForegroundColor Red
            Write-Host $res.Error -ForegroundColor Red
        }
    } catch {
        Write-Error $_
    } finally {
        if ($session) { Remove-SSHSession -SSHSession $session | Out-Null }
    }
} else {
    Write-Host "DNS did not propagate within 15 minutes. Please try again later or verify your DNS setup." -ForegroundColor Red
}
