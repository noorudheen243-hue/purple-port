# Deploy Payroll Fixes to Online VPS (66.116.224.221)
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$FilesToUpload = @(
    "server/src/modules/accounting/service.ts",
    "server/src/modules/payroll/service.ts",
    "server/src/modules/attendance/service.ts"
)

$APP = "/var/www/purple-port/server"

try {
    Write-Host "Connecting SSH to $VPS..." -ForegroundColor Cyan
    $s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
    
    Write-Host "Connecting SFTP to $VPS..." -ForegroundColor Cyan
    $sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

    Write-Host "`n[1/3] Uploading source files..." -ForegroundColor Yellow
    foreach ($f in $FilesToUpload) {
        $local = "f:\Antigravity\$f"
        # Destination MUST be a directory for Posh-SSH Set-SFTPItem to work correctly
        # Updated base path to /var/www/antigravity/
        $remoteDir = ("/var/www/antigravity/" + [System.IO.Path]::GetDirectoryName($f) + "/").Replace("\", "/")
        Write-Host "   $f -> $remoteDir"
        Set-SFTPItem -SFTPSession $sftp -Path $local -Destination $remoteDir -Force
    }

    function Run($cmd, $timeout = 300) {
        Write-Host "`n>> $cmd" -ForegroundColor DarkGray
        $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
        if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
        if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
        return $r
    }

    $APP_ROOT = "/var/www/antigravity/server"

    Write-Host "`n[2/3] Rebuilding Server..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP_ROOT && npm run build 2>&1 | tail -10" 300

    Write-Host "`n[3/3] Restarting PM2 processes..." -ForegroundColor Yellow
    # Using specific app name qix-ads-v2.7
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart qix-ads-v2.7 || pm2 restart all" 60
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 save"

    Write-Host "`n[4/4] Syncing Ledgers (Initialize fixes)..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && node -e ""const { syncEntityLedgers } = require('./dist/src/modules/accounting/service'); syncEntityLedgers().then(r => { console.log(JSON.stringify(r)); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })"""
    
    Remove-SSHSession -SessionId $s.SessionId | Out-Null
    Remove-SFTPSession -SFTPSession $sftp | Out-Null
    
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "   PAYROLL FIXES LIVE ONLINE!             " -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Test: https://www.qixport.com" -ForegroundColor Cyan

} catch {
    Write-Error "Deployment Failed: $($_.Exception.Message)"
}
