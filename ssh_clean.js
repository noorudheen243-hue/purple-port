const { spawn } = require('child_process');

const pythonScript = `
import sqlite3, os
paths = [
  '/var/www/antigravity/prisma/dev.db',
  '/var/www/antigravity/server/dist/prisma/dev.db',
  '/var/www/antigravity/server/prisma/dev.db',
  '/var/www/purple-port/server/prisma/dev.db',
  '/var/www/purple-port/prisma/dev.db',
  '/var/www/qix-ads/server/prisma/dev.sqlite',
  '/var/www/qix-ads-v2.6/server/prisma/dev.sqlite'
]
for db in paths:
  if os.path.exists(db):
    try:
      c = sqlite3.connect(db)
      c.execute("DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account'")
      c.commit()
      c.close()
      print(f"Cleaned {db}")
    except Exception as e:
      print(f"Error {db}: {e}")
print("Cleanup complete.")
`;

const bashScript = `
cat << 'PAYLOAD' > /var/www/clean_db.py
${pythonScript}
PAYLOAD
python3 /var/www/clean_db.py
exit
`;

console.log("Spawning SSH...");
const ssh = spawn('ssh', [
    '-o', 'HostKeyAlgorithms=+ssh-rsa',
    '-o', 'PubkeyAcceptedKeyTypes=+ssh-rsa',
    '-i', 'f:\\Antigravity\\qixport.pem',
    'root@66.116.224.221'
]);

ssh.stdout.on('data', data => process.stdout.write('[OUT] ' + data));
ssh.stderr.on('data', data => process.stderr.write('[ERR] ' + data));

ssh.on('close', code => {
    console.log(`SSH process exited with code ${code}`);
});

setTimeout(() => {
    console.log("Sending payload...");
    ssh.stdin.write(bashScript);
    ssh.stdin.end();
}, 2000);
