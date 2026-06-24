Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting SSH..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

try {
    Write-Host "`nListing unique attendance statuses:" -ForegroundColor Yellow
    $cmd1 = "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && node -e ""const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.attendanceRecord.groupBy({by:['status'], _count:true}).then(r=>{console.log(JSON.stringify(r)); process.exit(0);})"""
    Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd1 | Select-Object -ExpandProperty Output

    Write-Host "`nListing recent HALF_DAY or other non-PRESENT records:" -ForegroundColor Yellow
    $cmd2 = "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && node -e ""const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.attendanceRecord.findMany({where:{status:{in:['HALF_DAY','HALF_DAY_PRESENT']}}, take:10, select:{user_id:true, date:true, status:true}}).then(r=>{console.log(JSON.stringify(r)); process.exit(0);})"""
    Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd2 | Select-Object -ExpandProperty Output
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}
