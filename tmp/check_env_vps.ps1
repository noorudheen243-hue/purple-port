$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    $output = @()
    $output += "--- .env in purple-port ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cat /var/www/purple-port/.env | grep DATABASE_URL"
    $output += $r1.Output
    
    $output += "--- .env in antigravity ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cat /var/www/antigravity/.env | grep DATABASE_URL"
    $output += $r2.Output
    
    $output -join "`n"
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
