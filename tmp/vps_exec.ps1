param([string]$cmd)
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd
    Write-Host "Output: $($r.Output)"
    Write-Host "Error: $($r.Error)"
    Write-Host "ExitStatus: $($r.ExitStatus)"
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
