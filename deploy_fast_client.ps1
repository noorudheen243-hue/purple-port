$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$REMOTE_PATH = "/var/www/purple-port"
$KEY_PATH = "f:\Antigravity\deploy_key"

Write-Host "Creating zip using tar..."
if (Test-Path "./deploy_client_fast.zip") { Remove-Item "./deploy_client_fast.zip" -Force }
tar.exe -a -c -f deploy_client_fast.zip -C client/dist .

Write-Host "Uploading to VPS..."
scp -i $KEY_PATH -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no ./deploy_client_fast.zip "$SSH_USER@$SERVER_IP`:/tmp/"

Write-Host "Extracting on VPS..."
$REMOTE_SCRIPT = @"
mkdir -p $REMOTE_PATH/client/dist
rm -rf $REMOTE_PATH/client/dist/*
unzip /tmp/deploy_client_fast.zip -d $REMOTE_PATH/client/dist/

mkdir -p $REMOTE_PATH/server/public
cp -rf $REMOTE_PATH/client/dist/* $REMOTE_PATH/server/public/

nginx -s reload
echo "Deployment successful."
"@

$REMOTE_SCRIPT = $REMOTE_SCRIPT -replace "`r`n", "`n"
ssh -i $KEY_PATH -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP $REMOTE_SCRIPT

Remove-Item ./deploy_client_fast.zip -Force
Write-Host "Done!"
