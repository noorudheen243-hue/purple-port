
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$session = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/purple-port/server && source $HOME/.nvm/nvm.sh 2>/dev/null; npx ts-node src/scripts/test_zk.ts > zk_out.txt; cat zk_out.txt" | Select-Object -ExpandProperty Output

Remove-SSHSession -SessionId $session.SessionId

