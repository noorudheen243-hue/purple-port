Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Read PM2 cwd using Node API to avoid string parsing breaking in bash
$NodeCmd = "source `$HOME/.nvm/nvm.sh 2>/dev/null; node -e `"const pm2 = require('/root/.nvm/versions/node/v20.20.0/lib/node_modules/pm2'); pm2.connect(function(err){ pm2.list((err, list)=>{ list.forEach(l => console.log(l.name, l.pm2_env.pm_cwd)); process.exit(0); }); });`""

$r = Invoke-SSHCommand -SessionId $s.SessionId -Command $NodeCmd
# MUST Write-Host otherwise output is lost
Write-Host "PM2 PATHS:"
Write-Host $r.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null
