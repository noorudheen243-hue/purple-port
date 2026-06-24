Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting SSH..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

try {
    Write-Host "`nRunning calculateAutoLOP test on VPS..." -ForegroundColor Yellow
    # Let's run calculateAutoLOP for user '4ce1fee1-86dc-4ed9-9857-d91539a0e5f6' for June 2026
    $cmd = "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && node -e ""const {calculateAutoLOP}=require('./dist/src/modules/payroll/service'); calculateAutoLOP('4ce1fee1-86dc-4ed9-9857-d91539a0e5f6', 6, 2026).then(r=>console.log('Result LOP days:', r)).catch(console.error)"""
    Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd | Select-Object -ExpandProperty Output

    Write-Host "`nChecking attendance records for that user in June 2026:" -ForegroundColor Yellow
    $cmd2 = "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && node -e ""const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.attendanceRecord.findMany({where:{user_id:'4ce1fee1-86dc-4ed9-9857-d91539a0e5f6', date:{gte:new Date('2026-06-01T00:00:00Z'), lte:new Date('2026-06-30T23:59:59Z')}}, orderBy:{date:'asc'}}).then(r=>{console.log(JSON.stringify(r)); process.exit(0);})"""
    Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd2 | Select-Object -ExpandProperty Output
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}
