Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$files = @(
    "server/prisma/schema.prisma",
    "server/src/modules/marketing-tasks/controller.ts",
    "server/src/modules/marketing-tasks/normalizer/marketingNormalizer.ts",
    "server/src/modules/marketing-tasks/routes.ts",
    "server/src/modules/marketing-tasks/services/metaAdsService.ts",
    "server/src/modules/marketing-tasks/services/metaLeadsService.ts",
    "server/src/modules/marketing-tasks/services/marketingAiService.ts",
    "server/src/modules/marketing-tasks/sync/syncWorker.ts",
    "client/src/pages/marketing/MarketingDashboard.tsx",
    "client/src/pages/marketing/MetaAdsDashboard.tsx"
)

try {
    Write-Host "Connecting SFTP to $VPS..."
    $session = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
    
    foreach ($f in $files) {
        $localPath = "F:\Antigravity\$f"
        $remotePath = "/var/www/purple-port/$f"
        Write-Host "Uploading $localPath -> $remotePath..."
        
        # In SFTP, it's often better to specify the remote directoy if Set-SFTPItem behaves like cp
        # But we'll try to set the file directly.
        Set-SFTPItem -SFTPSession $session -Path $localPath -Destination $remotePath -Force
    }
    
    Remove-SFTPSession -SFTPSession $session
    Write-Host "Upload complete!"
} catch {
    Write-Error "Upload failed: $($_.Exception.Message)"
}
