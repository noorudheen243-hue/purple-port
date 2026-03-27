
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$cmd = "node -e `"const { PrismaClient } = require('@prisma/client'); const axios = require('axios'); const prisma = new PrismaClient(); async function test() { const clientId = '1f4f0934-9915-4fd9-b085-87e71208cbe8'; const acc = await prisma.marketingAccount.findFirst({ where: { clientId, platform: 'meta' } }); const token = acc.accessToken; try { const debug = await axios.get('https://graph.facebook.com/debug_token', { params: { input_token: token, access_token: token } }); console.log('Token Scopes: ' + JSON.stringify(debug.data.data.scopes)); } catch (e) { console.error('Token Debug Error: ' + (e.response?.data?.error?.message || e.message)); } } test().then(() => process.exit(0));`""
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
