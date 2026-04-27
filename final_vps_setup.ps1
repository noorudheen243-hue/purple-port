$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host ">>> Running Unified Migration on VPS..."
    $r1 = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/purple-port/server && node dist/scripts/migrate_to_unified.js"
    Write-Host "Migration Output: $($r1.Output)"

    Write-Host ">>> Enabling Unified System on VPS..."
    $r2 = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/purple-port/server && node dist/scripts/toggle_unified.js on"
    Write-Host "Toggle Output: $($r2.Output)"

    Write-Host ">>> Verifying..."
    $r3 = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/purple-port/server && node dist/scripts/verify_unified.js"
    Write-Host "Verify Output: $($r3.Output)"

} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SSHSession $s }
}
