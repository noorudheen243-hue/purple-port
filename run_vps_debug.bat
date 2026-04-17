@echo off
ssh -i f:\Antigravity\deploy_key root@66.116.224.221 -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no "source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/antigravity/server && node tmp_vps_debug.js" > f:\Antigravity\vps_debug_output.txt 2>&1
