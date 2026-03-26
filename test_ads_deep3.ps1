Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Test script to dump `ads` with full creative
$script = @"
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

async function run() {
    const acc = await prisma.marketingAccount.findFirst({ where: { platform: 'meta' } });
    const formattedAccountId = acc.externalAccountId.startsWith('act_') ? acc.externalAccountId : 'act_' + acc.externalAccountId;
    
    try {
        const res = await axios.get(META_GRAPH_URL + '/' + formattedAccountId + '/ads', {
            params: {
                access_token: acc.accessToken,
                fields: 'id,name,creative{id,name,object_story_spec,asset_feed_spec,effective_object_story_id,call_to_action_type}',
                limit: 5
            }
        });
        const ads = res.data.data;
        for (const ad of ads) {
            console.log('\n--- AD:', ad.id, ad.name, '---');
            if (ad.creative) {
                // Look for lead_gen_form_id anywhere in the object
                const strObj = JSON.stringify(ad.creative);
                const match = strObj.match(/form_id["']?\s*:\s*["']?(\d+)["']?/i) || strObj.match(/[\w_]*form_id[\w_]*["']?\s*:\s*["']?(\d+)["']?/i);
                if (match) {
                    console.log('FOUND FORM ID VIA REGEX:', match[1]);
                    // Test fetch leads for this form
                    try {
                        const leadsRes = await axios.get(META_GRAPH_URL + '/' + match[1] + '/leads', {
                            params: { access_token: acc.accessToken, fields: 'id,created_time' }
                        });
                        console.log('Success! Leads found for form:', leadsRes.data.data.length);
                    } catch(e) {
                        console.log('Failed fetching form leads:', e.response ? e.response.data.error.message : e.message);
                    }
                } else {
                    console.log('No form ID found in creative string:', strObj.substring(0, 200) + '...');
                }
            }
        }
    } catch(e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
run().catch(console.error).finally(() => process.exit(0));
"@

$remotePath = "/var/www/antigravity/server/dist/modules/marketing-tasks"
Invoke-SSHCommand -SSHSession $session -Command "echo `"$script`" > $remotePath/debug_ads3.js"
$r = Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath && node debug_ads3.js"

Write-Host "--- SCRIPT OUTPUT ---"
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
