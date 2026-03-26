Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Test script to fetch forms via Page ID
$script = @"
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';
const PAGE_ID = '936952939492449';

async function run() {
    const acc = await prisma.marketingAccount.findFirst({ where: { platform: 'meta' } });
    const formattedAccountId = acc.externalAccountId.startsWith('act_') ? acc.externalAccountId : 'act_' + acc.externalAccountId;
    
    console.log('Fetching forms for page', PAGE_ID);
    try {
        const res = await axios.get(META_GRAPH_URL + '/' + PAGE_ID + '/leadgen_forms', {
            params: { access_token: acc.accessToken, fields: 'id,name,leads_count' }
        });
        console.log('Forms:', JSON.stringify(res.data.data, null, 2));

        if (res.data.data.length > 0) {
            const formId = res.data.data[0].id;
            console.log('Fetching leads for form', formId);
            const leadsRes = await axios.get(META_GRAPH_URL + '/' + formId + '/leads', {
                params: { access_token: acc.accessToken, fields: 'id,created_time,field_data' }
            });
            console.log('Success! Leads found for form:', leadsRes.data.data.length);
            console.log(JSON.stringify(leadsRes.data.data, null, 2));
        }
    } catch(e) {
        console.error('Failed fetching page forms:', e.response ? e.response.data.error.message : e.message);
    }
}
run().catch(console.error).finally(() => process.exit(0));
"@

$remotePath = "/var/www/antigravity/server/dist/modules/marketing-tasks"
Invoke-SSHCommand -SSHSession $session -Command "echo `"$script`" > $remotePath/debug_page_forms.js"
$r = Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath && node debug_page_forms.js"

Write-Host "--- SCRIPT OUTPUT ---"
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
