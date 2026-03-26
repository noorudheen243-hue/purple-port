Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Test script to fetch leads via Ad ID or Page ID
$script = @"
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

async function run() {
    const acc = await prisma.marketingAccount.findFirst({ where: { platform: 'meta' } });
    const formattedAccountId = acc.externalAccountId.startsWith('act_') ? acc.externalAccountId : 'act_' + acc.externalAccountId;
    
    console.log('Fetching ads for', formattedAccountId);
    try {
        const res = await axios.get(META_GRAPH_URL + '/' + formattedAccountId + '/ads', {
            params: { access_token: acc.accessToken, fields: 'id,name', limit: 3 }
        });
        const ads = res.data.data;
        for (const ad of ads) {
            console.log('--- Testing Leads for AD:', ad.id, '---');
            try {
                const leadsRes = await axios.get(META_GRAPH_URL + '/' + ad.id + '/leads', {
                    params: { access_token: acc.accessToken, fields: 'id,created_time,field_data' }
                });
                console.log('Success! Leads found:', leadsRes.data.data.length);
                if (leadsRes.data.data.length > 0) {
                    console.log('Sample Lead:', JSON.stringify(leadsRes.data.data[0]));
                }
            } catch(e) {
                console.log('Failed fetching ad leads:', e.response ? e.response.data.error.message : e.message);
            }
        }
    } catch(e) {
        console.error('Failed fetching ads:', e.response ? e.response.data : e.message);
    }
}
run().catch(console.error).finally(() => process.exit(0));
"@

$remotePath = "/var/www/antigravity/server/dist/modules/marketing-tasks"
Invoke-SSHCommand -SSHSession $session -Command "echo `"$script`" > $remotePath/test_ad_leads.js"
$r = Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath && node test_ad_leads.js"

Write-Host "--- SCRIPT OUTPUT ---"
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
