$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    # Check modification time of index.html in public
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -lt /var/www/purple-port/public/index.html /var/www/purple-port/dist/index.js"
    $r.Output
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
