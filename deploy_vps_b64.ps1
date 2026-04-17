Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$files = @(
    "client/src/pages/marketing/MetaAdsDashboard.tsx",
    "client/src/pages/marketing/MarketingDashboard.tsx",
    "server/src/modules/marketing-tasks/services/marketingAiService.ts",
    "client/src/pages/portal/services/MetaAdsView.tsx",
    "client/src/pages/portal/services/GoogleAdsView.tsx",
    "client/src/pages/payroll/SalaryOverview.tsx",
    "client/src/pages/payroll/SalaryCalculator.tsx",
    "client/src/pages/portal/PortalDashboard.tsx",
    "client/src/pages/payroll/Payslips.tsx",
    "client/src/pages/team/TeamProfile.tsx",
    "client/src/pages/team/OnboardingPage.tsx",
    "client/src/pages/tasks/TaskDashboard.tsx",
    "client/src/pages/payroll/PayrollSettings.tsx",
    "client/src/pages/payroll/PayrollProcess.tsx",
    "client/src/pages/payroll/PayrollManager.tsx"
)

try {
    Write-Host "Connecting SSH to $VPS..."
    $session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
    
    foreach ($f in $files) {
        $localPath = "F:\Antigravity\$f"
        if (-Not (Test-Path $localPath)) {
            Write-Warning "File not found: $localPath"
            continue
        }
        
        $remotePath = "/var/www/purple-port/$f"
        $remoteDir = [System.IO.Path]::GetDirectoryName($remotePath).Replace("\", "/")
        
        Write-Host "Processing $f..."
        $content = Get-Content -Path $localPath -Raw
        $b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
        
        # Command to ensure directory exists and write file
        $cmd = "mkdir -p $remoteDir && echo '$b64' | base64 -d > $remotePath"
        
        Write-Host "Uploading to $remotePath..."
        $r = Invoke-SSHCommand -SSHSession $session -Command $cmd
        if ($r.Error) {
            Write-Error "Error uploading $($f): $($r.Error)"
        }
    }
    
    # Final Deployment Steps on VPS
    Write-Host "Running final deployment steps on VPS..."
    $deployCmd = "cd /var/www/purple-port/server && npx prisma db push --accept-data-loss && npm run build && cd ../client && npm run build && rm -rf ../server/public/* && cp -r dist/* ../server/public/ && pm2 restart qix-api"
    $r = Invoke-SSHCommand -SSHSession $session -Command $deployCmd
    Write-Host "Deployment Logs: " ($r.Output | Out-String)
    
    Remove-SSHSession -SSHSession $session
    Write-Host "✅ DEPLOYMENT COMPLETE!"
} catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
}
