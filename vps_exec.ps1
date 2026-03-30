param (
    [Parameter(Mandatory = $true)]
    [string]$Command
)
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$r = Invoke-SSHCommand -SSHSession $session -Command $Command
Write-Output $r.Output
if ($r.Error) {
    Write-Warning "SSH Error: $($r.Error)"
}
Remove-SSHSession -SSHSession $session | Out-Null
