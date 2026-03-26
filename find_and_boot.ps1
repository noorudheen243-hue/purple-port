# Find and Boot Backend on VPS
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "--- Scanning /var/www/antigravity for entry point ---"
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "find /var/www/antigravity -name 'index.js' -o -name 'server.js' | grep dist"
Write-Host "Potential Entry Points:"
$r.Output

# Attempt to start the first one found
$entryPoint = ($r.Output -split "`n")[0].Trim()
if ($entryPoint) {
    Write-Host "Starting Entry Point: $entryPoint"
    # Extract directory
    $entryDir = $entryPoint.Substring(0, $entryPoint.LastIndexOf('/'))
    $entryFile = $entryPoint.Substring($entryPoint.LastIndexOf('/') + 1)
    
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd $entryDir && pm2 start $entryFile --name qix-ads-v2.5"
}
else {
    Write-Host "ERROR: No entry point found!"
}

# Final check
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 list"
$r2.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null
