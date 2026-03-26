$scriptPath = "f:\Antigravity\clean_all_sqlite.js"
$remotePath = "/var/www/clean_final.js"

# Read file and push via standard input to bypass all quoting issues
cmd.exe /c "ssh -i qixport.pem root@66.116.224.221 `"cat > $remotePath`" < $scriptPath"

# Execute on remote
.\vps_exec.ps1 -Command "node $remotePath"
