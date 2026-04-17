$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    # List all possible backup directories
    $targets = @(
        "/var/backups/antigravity",
        "/var/www/purple-port/server/prisma",
        "/var/www/purple-port/backups",
        "/var/www/antigravity/server/prisma"
    )
    $output = @()
    foreach ($t in $targets) {
        $output += "--- Listing $t ---"
        $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -lhpt $t | head -n 15"
        $output += $r.Output
    }
    $output -join "`n"
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
