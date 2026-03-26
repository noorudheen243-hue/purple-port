Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$LOCAL_DIST = "f:\Antigravity\client\dist"
$REMOTE_DIR = "/var/www/antigravity/server/public"

Write-Host "[1/4] Compressing build..."
if (Test-Path "f:\Antigravity\client\frontend.zip") { Remove-Item "f:\Antigravity\client\frontend.zip" }
Compress-Archive -Path "$LOCAL_DIST\*" -DestinationPath "f:\Antigravity\client\frontend.zip" -Force
Write-Host "Compressed."

Write-Host "[2/4] Base64-encoding the zip..."
$b64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("f:\Antigravity\client\frontend.zip"))
Write-Host "Done encoding. Size: $($b64.Length) chars"

Write-Host "[3/4] Uploading and decoding on VPS..."
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Split into 4000-char chunks to avoid SSH argument limits
$chunks = [System.Text.RegularExpressions.Regex]::Matches($b64, '.{1,4000}')

# Init the base64 file on server
Invoke-SSHCommand -SSHSession $session -Command "rm -f /var/www/antigravity/frontend_b64.txt"
foreach ($chunk in $chunks) {
    $c = $chunk.Value
    Invoke-SSHCommand -SSHSession $session -Command "echo -n '$c' >> /var/www/antigravity/frontend_b64.txt"
}

Write-Host "Decoding on server..."
Invoke-SSHCommand -SSHSession $session -Command "base64 -d /var/www/antigravity/frontend_b64.txt > /var/www/antigravity/frontend.zip"

Write-Host "[4/4] Extracting and reloading nginx..."
Invoke-SSHCommand -SSHSession $session -Command "rm -rf $REMOTE_DIR/ && mkdir -p $REMOTE_DIR && unzip -o /var/www/antigravity/frontend.zip -d $REMOTE_DIR && rm /var/www/antigravity/frontend.zip /var/www/antigravity/frontend_b64.txt && systemctl reload nginx"

Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "Frontend deployed successfully!"
