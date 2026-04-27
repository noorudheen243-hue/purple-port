$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host ">>> Running Unified Migration on VPS..."
    $r = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/purple-port/server && node dist/scripts/migrate_to_unified.js"
    Write-Host $r.Output
    if ($r.Error) { Write-Error $r.Error }
} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SSHSession $s }
}
