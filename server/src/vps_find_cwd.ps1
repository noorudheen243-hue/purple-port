
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$cmd = "pm2 jlist | node -e `"const stdin = process.stdin; let data = ''; stdin.on('data', chunk => data += chunk); stdin.on('end', () => { const list = JSON.parse(data); const proc = list.find(p => p.name === 'qix-api'); console.log(proc ? proc.pm2_env.pm_cwd : 'not found'); });`""
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
