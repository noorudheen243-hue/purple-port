Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Find all db files and check which one has MarketingAccount table
$r = Invoke-SSHCommand -SSHSession $session -Command "find /var/www -name '*.db' 2>/dev/null"
Write-Host "All DBs:" $r.Output

# Check each for MarketingAccount table
foreach ($db in ($r.Output -split '\n' | Where-Object { $_ -ne '' })) {
    $tb = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db '.tables' 2>/dev/null | tr ' ' '\n' | grep -i marketing"
    if ($tb.Output) {
        Write-Host "--- Found in $db ---"
        Write-Host $tb.Output
        $acc = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db 'SELECT platform, externalAccountId, CASE WHEN accessToken IS NULL THEN ''NO_TOKEN'' ELSE ''HAS_TOKEN'' END as tok FROM MarketingAccount;' 2>/dev/null"
        Write-Host "Accounts:" $acc.Output
    }
}

Remove-SSHSession -SSHSession $session | Out-Null
