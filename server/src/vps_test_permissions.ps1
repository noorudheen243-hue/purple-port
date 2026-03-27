
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$cmd = "node -e `"const { PrismaClient } = require('@prisma/client'); const axios = require('axios'); const prisma = new PrismaClient(); async function test() { const acc = await prisma.marketingAccount.findFirst({ where: { externalAccountId: '616308347710249' } }); if (!acc) { console.log('Account not found in DB'); return; } const token = acc.accessToken; try { console.log('Testing /act_616308347710249/ads...'); const ads = await axios.get('https://graph.facebook.com/v19.0/act_616308347710249/ads', { params: { access_token: token, fields: 'id,name' } }); console.log('Found ' + ads.data.data.length + ' ads'); } catch (e) { console.error('API Error (/ads): ' + (e.response?.data?.error?.message || e.message)); } try { console.log('Testing /act_616308347710249/leads...'); const leads = await axios.get('https://graph.facebook.com/v19.0/act_616308347710249/leads', { params: { access_token: token, fields: 'id' } }); console.log('Found ' + leads.data.data.length + ' leads at account level'); } catch (e) { console.error('API Error (/leads): ' + (e.response?.data?.error?.message || e.message)); } } test().then(() => process.exit(0));`""
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
