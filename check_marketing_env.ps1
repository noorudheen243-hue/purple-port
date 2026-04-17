$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

    Write-Host "--- Checking .env for MARKETING_ENGINE_ENABLED ---"
    $env = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep MARKETING /var/www/purple-port/server/.env 2>&1"
    Write-Host $env.Output

    Write-Host "`n--- Testing groups API directly ---"
    $test = Invoke-SSHCommand -SessionId $s.SessionId -Command "curl -s -o /dev/null -w '%{http_code}' http://localhost:4001/api/marketing/groups 2>&1"
    Write-Host "HTTP Status: $($test.Output)"

} catch {
    Write-Host "Error: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
