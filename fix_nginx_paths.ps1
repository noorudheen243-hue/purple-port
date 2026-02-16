
# Script to Fix Nginx Path Mismatch
$ServerIP = "66.116.224.221"
$User = "root"

Write-Host "Fixing Nginx Configuration on $ServerIP..." -ForegroundColor Cyan

$RemoteScript = @"
echo "1. Checking current structure..."
ls -ld /var/www/purple-port/public
ls -ld /var/www/purple-port/server/public || echo "Directory /server/public NOT FOUND (Expected)"

echo "2. Updating Nginx Config..."
# Replace wrong path with correct path
sed -i 's|root /var/www/purple-port/server/public;|root /var/www/purple-port/public;|g' /etc/nginx/sites-available/default

echo "3. Verifying Config..."
grep "root" /etc/nginx/sites-available/default
nginx -t

echo "4. Restarting Nginx..."
systemctl restart nginx

echo "✅ NGINX PATH FIXED!"
"@

# Sanitize
$RemoteScript = $RemoteScript -replace "`r", ""

ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -t "$User@$ServerIP" "bash -c '$RemoteScript'"
