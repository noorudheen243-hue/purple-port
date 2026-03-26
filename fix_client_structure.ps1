Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$clientDir = "/var/www/antigravity/client"
$zipPath = "$clientDir/client_dist.zip"

Write-Host "=== Fixing client directory structure ==="

# 1. Remove the existing dist folder
Write-Host "Removing existing dist folder..."
Invoke-SSHCommand -SSHSession $session -Command "rm -rf $clientDir/dist"

# 2. Extract the zip to the client directory
# The zip already contains a 'dist' folder
Write-Host "Extracting $zipPath to $clientDir..."
Invoke-SSHCommand -SSHSession $session -Command "unzip -o $zipPath -d $clientDir/"

# 3. Verify the contents
Write-Host "Verifying /var/www/antigravity/client/dist/..."
$r1 = Invoke-SSHCommand -SSHSession $session -Command "ls -F $clientDir/dist/ | head -n 10"
Write-Host ($r1.Output -join [System.Environment]::NewLine)

# 4. Restart Nginx just in case
Write-Host "Restarting Nginx..."
Invoke-SSHCommand -SSHSession $session -Command "systemctl restart nginx"

Write-Host "Done!"
Remove-SSHSession -SSHSession $session | Out-Null
