$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- INTERNAL API TEST (curl) ---"
    # Testing with -I to see headers and status code
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "curl -is http://localhost:4001/api/marketing/meta/accounts"
    Write-Host $r1.Output
    
    Write-Host "`n--- RECENT BUILD LOG (Last 20) ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "tail -n 20 /var/www/purple-port/server/build.log"
    Write-Host $r2.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
