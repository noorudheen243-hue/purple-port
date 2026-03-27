
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# The token I found in the DB (truncated for security in script but I'll use the full one from DB if I can)
# Actually I'll just pull it from the DB in the node script on the VPS
$cmd = "node -e `"const { PrismaClient } = require('@prisma/client'); const axios = require('axios'); const prisma = new PrismaClient(); async function test() { const acc = await prisma.marketingAccount.findFirst({ where: { externalAccountId: '616308347710249' } }); if (!acc) { console.log('Account not found in DB'); return; } const token = acc.accessToken; console.log('Testing token starting with: ' + token.substring(0, 10)); try { const me = await axios.get('https://graph.facebook.com/v19.0/me', { params: { access_token: token } }); console.log('Me: ' + me.data.name + ' (' + me.data.id + ')'); const accounts = await axios.get('https://graph.facebook.com/v19.0/me/adaccounts', { params: { access_token: token, fields: 'id,name' } }); console.log('Found ' + accounts.data.data.length + ' accounts'); const target = accounts.data.data.find(a => a.id === 'act_616308347710249' || a.id === '616308347710249'); if (target) { console.log('Target account FOUND in me/adaccounts: ' + target.name); } else { console.log('Target account NOT FOUND in me/adaccounts'); console.log('Available accounts: ' + JSON.stringify(accounts.data.data.map(a => a.id))); } } catch (e) { console.error('API Error: ' + (e.response?.data?.error?.message || e.message)); } } test().then(() => process.exit(0));`""
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
