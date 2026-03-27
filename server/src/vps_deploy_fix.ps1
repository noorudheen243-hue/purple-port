
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Read the local file content
$localPath = "f:\Antigravity\server\src\modules\marketing-tasks\services\metaLeadsService.ts"
$content = Get-Content -Path $localPath -Raw

# Escape single quotes for the shell command
$escapedContent = $content.Replace("'", "'\''")

# Write to VPS
$targetPath = "/var/www/purple-port/server/src/modules/marketing-tasks/services/metaLeadsService.ts"
Write-Host "Updating $targetPath on VPS..."
# Using a temp file to avoid issues with large echo commands if any
$r = Invoke-SSHCommand -SSHSession $session -Command "cat <<'EOF' > $targetPath`n$content`nEOF"
Write-Host $r.Error

Write-Host "Rebuilding server on VPS..."
$r2 = Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/purple-port/server && npm run build"
Write-Host $r2.Output
Write-Host $r2.Error

Write-Host "Restarting PM2 processes..."
$r3 = Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-api"
Write-Host $r3.Output

Remove-SSHSession -SSHSession $session | Out-Null
