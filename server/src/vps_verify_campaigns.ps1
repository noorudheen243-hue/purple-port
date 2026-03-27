
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$cmd = "node -e `"const { PrismaClient } = require('@prisma/client'); const axios = require('axios'); const prisma = new PrismaClient(); async function test() { const acc = await prisma.marketingAccount.findFirst({ where: { clientId: '1f4f0934-9915-4fd9-b085-87e71208cbe8', platform: 'meta' } }); if (!acc) { console.log('Account not found'); return; } const token = acc.accessToken; const correctId = 'act_657980315809710'; try { console.log('Fetching campaigns for ' + correctId + '...'); const res = await axios.get('https://graph.facebook.com/v19.0/' + correctId + '/campaigns', { params: { access_token: token, fields: 'id,name' } }); console.log('Meta Campaigns:'); res.data.data.forEach(c => console.log(' - ' + c.name + ' | ID: ' + c.id)); const dbCampaigns = await prisma.marketingCampaign.findMany({ where: { clientId: '1f4f0934-9915-4fd9-b085-87e71208cbe8', platform: 'meta' } }); console.log('DB Campaigns:'); dbCampaigns.forEach(c => console.log(' - ' + c.name + ' | ID: ' + c.externalCampaignId)); } catch (e) { console.error('API Error: ' + (e.response?.data?.error?.message || e.message)); } } test().then(() => process.exit(0));`""
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
