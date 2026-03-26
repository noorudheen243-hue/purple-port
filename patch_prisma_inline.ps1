# Patch Prisma Client without heredoc issues
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 60) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

Write-Host "`n[1] Apply Patch using a single inline Node command" -ForegroundColor Yellow
$nodeScript = @"
const fs = require('fs');
const files = [
  '/var/www/antigravity/node_modules/.prisma/client/index.js',
  '/var/www/antigravity/node_modules/@prisma/client/index.js'
];
for (const f of files) {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/""file:\.\/dev\.db""/g, '""file:/var/www/purple-port/server/prisma/dev.db""');
    c = c.replace(/'file:\.\/dev\.db'/g, "'file:/var/www/purple-port/server/prisma/dev.db'");
    c = c.replace(/file:\.\/dev\.db/g, 'file:/var/www/purple-port/server/prisma/dev.db');
    fs.writeFileSync(f, c);
    console.log('PATCHED ' + f);
  }
}
"@
# Replace newlines with spaces for a single line command
$singleLineScript = $nodeScript -replace "`r`n", " " -replace "`n", " "
Run "node -e `"$singleLineScript`""

Write-Host "`n[2] Restart PM2" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart qix-backend && pm2 save"

Write-Host "`n[3] Wait and test health" -ForegroundColor Yellow
Run "sleep 4 && curl -s http://localhost:4001/health"

Write-Host "`n[4] Test client login NOW" -ForegroundColor Yellow
Run "curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""qixads@qix.com"",""password"":""password123""}' | head -100"

Remove-SSHSession -SessionId $s.SessionId | Out-Null
