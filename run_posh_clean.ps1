Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$commands = @(
    "sqlite3 /var/www/antigravity/prisma/dev.db `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`"",
    "sqlite3 /var/www/antigravity/server/dist/prisma/dev.db `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`"",
    "sqlite3 /var/www/antigravity/server/prisma/dev.db `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`"",
    "sqlite3 /var/www/purple-port/server/prisma/dev.db `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`"",
    "sqlite3 /var/www/purple-port/prisma/dev.db `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`"",
    "sqlite3 /var/www/qix-ads/server/prisma/dev.sqlite `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`"",
    "sqlite3 /var/www/qix-ads-v2.6/server/prisma/dev.sqlite `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`""
)

foreach ($cmd in $commands) {
    Write-Host "Executing: $cmd"
    $r = Invoke-SSHCommand -SSHSession $session -Command $cmd
    Write-Host $r.Output
}

Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "Done!"
