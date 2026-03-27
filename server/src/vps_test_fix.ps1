
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$cmd = "node -e `"const { PrismaClient } = require('@prisma/client'); const axios = require('axios'); const prisma = new PrismaClient(); async function test() { const clientId = '1f4f0934-9915-4fd9-b085-87e71208cbe8'; const acc = await prisma.marketingAccount.findFirst({ where: { clientId, platform: 'meta' } }); const token = acc.accessToken; const accountId = 'act_' + acc.externalAccountId; console.log('Testing with Account ID: ' + accountId); try { const ads = await axios.get('https://graph.facebook.com/v19.0/' + accountId + '/ads', { params: { access_token: token, fields: 'id,name' } }); console.log('Successfully fetched ' + ads.data.data.length + ' ads'); if (ads.data.data.length > 0) { const adId = ads.data.data[0].id; console.log('Testing lead fetch for Ad ID: ' + adId); const leads = await axios.get('https://graph.facebook.com/v19.0/' + adId + '/leads', { params: { access_token: token } }); console.log('Successfully fetched ' + leads.data.data.length + ' leads for ad'); } } catch (e) { console.error('API Error: ' + (e.response?.data?.error?.message || e.message)); } } test().then(() => process.exit(0));`""
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
