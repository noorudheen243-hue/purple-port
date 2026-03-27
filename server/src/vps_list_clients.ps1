
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Use a simpler node command and grep for the name
$cmd = "node -e `"const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.client.findMany({ select: { id: true, name: true } }).then(r => { console.log(JSON.stringify(r)); process.exit(0); });`""
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
