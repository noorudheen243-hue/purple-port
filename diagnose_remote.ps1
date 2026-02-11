
$VPS_IP = "66.116.224.221"
$VPS_USER = "root"

Write-Host "--- Diagnosing VPS Deployment ---" -ForegroundColor Cyan

# 1. Check Directory Structure
Write-Host "`n[1/4] Checking server/public directory..."
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "ls -la /var/www/purple-port/server/public"

# 2. Check header of index.html
Write-Host "`n[2/4] Checking index.html timestamp..."
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "stat /var/www/purple-port/server/public/index.html"

# 3. Search for 'Clear All Tasks' in built assets
Write-Host "`n[3/4] Searching for new feature code ('Clear All Tasks') in assets..."
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "grep -r 'Clear All Tasks' /var/www/purple-port/server/public/assets/"

# 4. Search for 'ClientFormModal' related 'Save' text
Write-Host "`n[4/4] Searching for 'ClientFormModal' save button text..."
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "grep -r 'Save' /var/www/purple-port/server/public/assets/ | head -n 1"

Write-Host "`n--- Diagnosis Complete ---"
