$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- VPS SOURCE: tracking.controller.ts ---"
    # Read the updateMetaAdsLog function range (approx lines 180-230)
    $cmd = "sed -n '180,240p' /var/www/purple-port/server/src/modules/client_portal/tracking.controller.ts"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd
    Write-Host $r1.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
