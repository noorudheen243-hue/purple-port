const { Client } = require('ssh2');
const conn = new Client();

const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

console.log('Connecting to VPS to trigger deployment...');

conn.on('ready', () => {
  console.log('SSH Connection Ready.');
  
  // Command 1: Run the main deployment script
  // Command 2: Patch the database for Interman Learning
  const remoteCmd = `
    cd /var/www/purple-port
    echo ">>> Running deploy_update.sh..."
    bash deploy_update.sh

    echo ">>> Patching Production Database for Interman Learning..."
    # We use a simple sqlite3 command to ensure the Ad Account ID is updated in the production DB
    sqlite3 /var/www/purple-port/server/prisma/dev.db "UPDATE MarketingAccount SET externalAccountId = '616308347710249' WHERE clientId = '1f4f0934-9915-4fd9-b085-87e71208cbe8' AND platform = 'meta';"
    
    echo ">>> Verification: Checking updated record..."
    sqlite3 /var/www/purple-port/server/prisma/dev.db "SELECT clientId, externalAccountId FROM MarketingAccount WHERE clientId = '1f4f0934-9915-4fd9-b085-87e71208cbe8' AND platform = 'meta';"
  `;

  conn.exec(remoteCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream closed with code ' + code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).connect({
  host: serverIp,
  port: 22,
  username: username,
  password: password
});
