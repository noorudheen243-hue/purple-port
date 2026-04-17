Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$APP = "/var/www/purple-port/server"

function Run($cmd, $timeout = 300) {
    Write-Host ">> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

# The file is already uploaded. Run it without quoting issues using a shell script wrapper.
Write-Host "[1] Creating shell launcher on VPS..." -ForegroundColor Cyan
Run "printf '#!/bin/bash\nsource ~/.nvm/nvm.sh 2>/dev/null\ncd $APP\nexec node tmp_sync_runner.js\n' > /tmp/run_sync.sh && chmod +x /tmp/run_sync.sh" 10

Write-Host "[2] Launching sync in background..." -ForegroundColor Cyan
Run "nohup /tmp/run_sync.sh > /tmp/meta_sync.log 2>&1 & echo Sync started PID: `$!" 10

Write-Host "[3] Checking log after 8 seconds..." -ForegroundColor Cyan
Start-Sleep 8
Run "cat /tmp/meta_sync.log | head -40" 15

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "Done - sync is running on VPS." -ForegroundColor Green
