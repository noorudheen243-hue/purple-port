$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host ">>> Running Cleanup on VPS..."
    $r1 = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/purple-port/server && node dist/scripts/cleanup_duplicates.js"
    Write-Host "Cleanup Output: $($r1.Output)"

    Write-Host ">>> Verifying..."
    $r2 = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/purple-port/server && node dist/scripts/verify_unified.js"
    Write-Host "Verify Output: $($r2.Output)"

} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SSHSession $s }
}
