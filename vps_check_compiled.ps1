$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- VPS COMPILED: tracking.controller.js ---"
    # Find the updateMetaAdsLog in the compiled JS
    $cmd = "grep -A 20 'updateMetaAdsLog' /var/www/purple-port/server/dist/modules/client_portal/tracking.controller.js | head -n 40"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd
    Write-Host $r1.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
