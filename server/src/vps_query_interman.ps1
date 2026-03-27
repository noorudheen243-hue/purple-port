
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Querying database for Interman Learning..."
$cmd = "sqlite3 /var/www/purple-port/server/dev.db `"SELECT id, name FROM Client WHERE name LIKE '%Interman%';`""
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host "Client Query Output: $($r.Output)"

if ($r.Output) {
    # Extract ID from output (assuming format: ID|Name)
    $clientId = ($r.Output -split '\|')[0].Trim()
    Write-Host "Found Client ID: $clientId"
    
    Write-Host "Querying MarketingAccount for Client ID: $clientId..."
    $cmd2 = "sqlite3 /var/www/purple-port/server/dev.db `"SELECT id, platform, externalAccountId, metaTokenId FROM MarketingAccount WHERE clientId = '$clientId';`""
    $r2 = Invoke-SSHCommand -SSHSession $session -Command $cmd2
    Write-Host "MarketingAccount Output: $($r2.Output)"
} else {
    Write-Host "Client not found with LIKE '%Interman%'"
}

Remove-SSHSession -SSHSession $session | Out-Null
