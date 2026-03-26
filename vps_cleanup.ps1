Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$remotePath = "/var/www/antigravity/server/dist/modules/marketing-tasks"
$files = @(
    "debug_test.js", "debug_ads.js", "debug_ads3.js", "debug_ads4.js", "debug_ads5.js",
    "test_ad_leads.js", "test_page_forms.js",
    "/var/www/antigravity/pm2_debug.txt",
    "/var/www/antigravity/pm2_debug2.txt",
    "/var/www/antigravity/pm2_leads.txt",
    "/var/www/antigravity/pm2_debug_sync.txt"
)

foreach ($file in $files) {
    if ($file -like "/*") {
        Invoke-SSHCommand -SSHSession $session -Command "rm -f $file"
    }
    else {
        Invoke-SSHCommand -SSHSession $session -Command "rm -f $remotePath/$file"
    }
}

Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "Cleanup completed!"
