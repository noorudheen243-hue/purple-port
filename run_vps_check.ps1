Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 600
    if ($r.Output) { Write-Host $r.Output }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" }
    return $r
}

try {
    Run "cd /var/www/purple-port && git fetch origin && git reset --hard origin/main"
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null && cd /var/www/purple-port/server && npx ts-node src/scripts/check_nidhin.ts"
}
finally {
    if ($s) {
        Remove-SSHSession -SessionId $s.SessionId | Out-Null
    }
}
