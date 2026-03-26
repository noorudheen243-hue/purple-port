Param(
    [Parameter(Mandatory = $true)]
    [string]$Script
)

Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Upload debug script
$remotePath = "/var/www/antigravity/server"
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path $Script -Destination "$remotePath/debug_test.js" -Force

Write-Host "Running debug script on VPS..."
$r = Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath && node debug_test.js"

Write-Host "--- DEBUG OUTPUT ---"
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
