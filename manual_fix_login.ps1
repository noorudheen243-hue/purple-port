
$VPS_IP = "66.116.224.221"
$VPS_USER = "root"

Write-Host "--- MANUAL LOGIN FIX STARTED ---" -ForegroundColor Cyan

# 1. Force Upload of Local Database (The one where you reset the password)
Write-Host "`n[1/4] Force Uploading Local Database (dev.db)..."
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa f:\Antigravity\server\prisma\dev.db "${VPS_USER}@${VPS_IP}:/var/www/purple-port/server/prisma/dev.db"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database uploaded successfully." -ForegroundColor Green
}
else {
    Write-Host "❌ Database upload failed." -ForegroundColor Red
    exit
}

# 2. Upload the Admin Creation Script (Just to be sure it's there)
Write-Host "`n[2/4] Uploading Admin Fix Script..."
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa f:\Antigravity\server\src\scripts\create_dev_admin.ts "${VPS_USER}@${VPS_IP}:/var/www/purple-port/server/src/scripts/"

# 3. Execute the Admin Creation Script on the Server
Write-Host "`n[3/4] Executing Admin Creation on VPS..."
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa "${VPS_USER}@${VPS_IP}" "cd /var/www/purple-port/server && npx ts-node src/scripts/create_dev_admin.ts"

# 4. Restart Server to ensure new DB/Data is loaded
Write-Host "`n[4/4] Restarting Server Process..."
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa "${VPS_USER}@${VPS_IP}" "pm2 restart all"

Write-Host "`n--- DONE! Try logging in now. ---" -ForegroundColor Cyan
Write-Host "Email: noorudheen243@gmail.com"
Write-Host "Pass : password123"
