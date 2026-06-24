$VPS_IP = '66.116.224.221'
$VPS_USER = 'root'
$PROJECT_PATH = '/var/www/purple-port'
$sshArgs = '-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa'

Write-Host "Uploading script..."
Invoke-Expression "scp $sshArgs server/scratch/fix_tz.ts ${VPS_USER}@${VPS_IP}:${PROJECT_PATH}/server/scratch/fix_tz.ts"

Write-Host "Executing script..."
Invoke-Expression "ssh $sshArgs ${VPS_USER}@${VPS_IP} 'cd $PROJECT_PATH/server && npx ts-node scratch/fix_tz.ts'"

Write-Host "Done!"
