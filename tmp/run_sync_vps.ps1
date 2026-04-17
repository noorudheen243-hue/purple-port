$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    
    $jsScript = @"
const { MarketingSyncWorker } = require('./dist/modules/marketing-tasks/sync/syncWorker');
async function main() {
    console.log('Forcing 2-year background Meta Ads sync directly on the server...');
    await MarketingSyncWorker.syncAllActiveCampaigns(730);
    console.log('Sync fully completed.');
}
main().catch(console.error).then(() => process.exit(0));
"@
    
    Invoke-SSHCommand -SessionId $s.SessionId -Command "echo `"$jsScript`" > /var/www/purple-port/server/run_manual_sync.js"
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && node run_manual_sync.js"
    Write-Host $r.Output
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
