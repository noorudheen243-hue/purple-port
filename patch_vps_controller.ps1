Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$controllerPath = "/var/www/antigravity/server/dist/modules/marketing-tasks/controller.js"

Write-Host "=== Before: tokenExpiry occurrences ==="
$before = Invoke-SSHCommand -SSHSession $session -Command "grep -n 'tokenExpiry' $controllerPath"
Write-Host ($before.Output -join [System.Environment]::NewLine)

Write-Host "=== Patching MetaToken upsert - replacing tokenExpiry with expires_at (only in upsert block) ==="
# Use a Python one-liner to do a smarter replacement - only in the upsert block, not in marketingAccount blocks
$patchCmd = @'
python3 -c "
import re
with open('/var/www/antigravity/server/dist/modules/marketing-tasks/controller.js', 'r') as f:
    content = f.read()

# Replace tokenExpiry only in metaToken.upsert() context
# The upsert for metaToken has: update: { access_token, account_name, meta_user_id, tokenExpiry
# and create: { id, user_id, access_token, account_name, meta_user_id, tokenExpiry
content = content.replace('meta_user_id: metaUserId,\n                    tokenExpiry:', 'meta_user_id: metaUserId,\n                    expires_at:')

with open('/var/www/antigravity/server/dist/modules/marketing-tasks/controller.js', 'w') as f:
    f.write(content)
print('Done')
"
'@
$r = Invoke-SSHCommand -SSHSession $session -Command $patchCmd
Write-Host ($r.Output -join [System.Environment]::NewLine)

Write-Host "=== After: tokenExpiry occurrences ==="
$after = Invoke-SSHCommand -SSHSession $session -Command "grep -n 'tokenExpiry\|expires_at' $controllerPath"
Write-Host ($after.Output -join [System.Environment]::NewLine)

Write-Host "=== Restarting PM2 ==="
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

Write-Host "Done!"
Remove-SSHSession -SSHSession $session | Out-Null
