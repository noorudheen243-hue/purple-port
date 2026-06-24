Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$code = @"
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.attendanceRecord.findFirst({
  where: {
    user: { staffProfile: { staff_number: 'QIX0003' } },
    date: new Date('2026-05-31T18:30:00.000Z')
  }
}).then(console.log).finally(() => p.\$disconnect());
"@

# Replace double quotes or single quotes to make sure it writes correctly
$escapedCode = $code.Replace("'", "'\''")

$cmd = "echo '$escapedCode' > /tmp/check_nidhin.js && source `$HOME/.nvm/nvm.sh 2>/dev/null && cd /var/www/purple-port/server && node /tmp/check_nidhin.js"
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd
Write-Host $r.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null
