
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$cmd = "node -e `"const { PrismaClient } = require('@prisma/client'); const axios = require('axios'); const prisma = new PrismaClient(); async function test() { const acc = await prisma.marketingAccount.findFirst({ where: { externalAccountId: '616308347710249' } }); if (!acc) { console.log('Account not found in DB'); return; } const token = acc.accessToken; try { const accounts = await axios.get('https://graph.facebook.com/v19.0/me/adaccounts', { params: { access_token: token, fields: 'id,name,account_id' } }); console.log('All Accessible Accounts:'); accounts.data.data.forEach(a => { console.log(' - ' + a.name + ' | ID: ' + a.id + ' | AccountID: ' + a.account_id); }); } catch (e) { console.error('API Error: ' + (e.response?.data?.error?.message || e.message)); } } test().then(() => process.exit(0));`""
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
