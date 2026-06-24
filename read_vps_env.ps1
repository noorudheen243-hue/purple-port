Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

try {
    $session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force -ErrorAction Stop
    $r = Invoke-SSHCommand -SSHSession $session -Command "cat /var/www/purple-port/server/.env" -ErrorAction Stop
    Write-Host "=== VPS .env FILE ==="
    Write-Host ($r.Output -join "`n")
    Remove-SSHSession -SSHSession $session
} catch {
    Write-Error $_.Exception.Message
}
