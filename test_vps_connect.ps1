Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

try {
    Write-Host "Connecting to $VPS as $User..."
    $session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force -ErrorAction Stop
    Write-Host "Successfully connected!"
    
    $r = Invoke-SSHCommand -SSHSession $session -Command "hostname; date; uptime; pm2 list; systemctl status nginx --no-pager" -ErrorAction Stop
    Write-Host "--- Command Output ---"
    Write-Host ($r.Output -join "`n")
    
    Remove-SSHSession -SSHSession $session
} catch {
    Write-Error "Connection failed: $($_.Exception.Message)"
}
