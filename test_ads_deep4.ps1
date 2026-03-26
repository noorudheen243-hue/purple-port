Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Simple script
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
            params: { access_token: acc.accessToken, fields: 'id,creative{object_story_spec,asset_feed_spec}' }
        });
        const ads = res.data.data;
        for (const ad of ads) {
            console.log('AD ID:', ad.id);
            const str = JSON.stringify(ad.creative);
            const match = str.match(/"lead_gen_form_id":"(\d+)"/);
            if (match) {
                console.log('FOUND FORM:', match[1]);
                try {
                    const lRes = await axios.get(META_GRAPH_URL + '/' + match[1] + '/leads', { params: { access_token: acc.accessToken }});
                    console.log('FOUND LEADS:', lRes.data.data.length);
                    console.log(JSON.stringify(lRes.data.data, null, 2));
                } catch(e) { console.log('Err:', e.message); }
            } else {
                console.log('No form ID in this ad.');
            }
        }
    } catch(e) { console.log(e.message); }
}
run();
"@

$remotePath = "/var/www/antigravity/server/dist/modules/marketing-tasks"
Invoke-SSHCommand -SSHSession $session -Command "echo `"$script`" > $remotePath/debug_ads4.js"
$r = Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath && node debug_ads4.js"

Write-Host "--- SCRIPT OUTPUT ---"
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
