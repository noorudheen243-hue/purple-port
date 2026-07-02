
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$session = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/purple-port/server && source $HOME/.nvm/nvm.sh 2>/dev/null; node test_db.js > test_db_out2.txt; cat test_db_out2.txt" | Select-Object -ExpandProperty Output

Remove-SSHSession -SessionId $session.SessionId

