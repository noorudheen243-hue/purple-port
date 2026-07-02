Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$sshSession = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sshId = $sshSession.SessionId

$scriptContent = @"
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function run() {
    const clientId = `"1f4f0934-9915-4fd9-b085-87e71208cbe8`";
    const account = await prisma.marketingAccount.findFirst({
        where: { clientId, platform: `"meta`" }
    });

    if (!account) {
        console.log(`"No account found`");
        return;
    }

    console.log(`"Token:`", account.accessToken?.substring(0, 20) + `"...\`"`);

    try {
        const pagesRes = await axios.get(\`"https://graph.facebook.com/v19.0/me/accounts\`", {
            params: { access_token: account.accessToken, fields: `"id,name,access_token`" }
        });

        const pages = pagesRes.data.data;
        console.log(\`"Found \`\${pages.length} pages\`");

        for (const page of pages) {
            console.log(\`"Checking page \`\${page.name} (\`\${page.id})\`");
            try {
                const formsRes = await axios.get(\`"https://graph.facebook.com/v19.0/\`\${page.id}/leadgen_forms\`", {
                    params: { access_token: page.access_token, fields: `"id,name,leads_count,status`" }
                });
                console.log(\`"  Forms:\`", formsRes.data.data);
            } catch (e) {
                console.log(\`"  Forms Error:\`", e.response?.data || e.message);
            }
        }
    } catch (e) {
        console.log(`"Error:`", e.response?.data || e.message);
    }
}

run().catch(console.error).finally(() => prisma.`$disconnect());
"@

$Bytes = [System.Text.Encoding]::UTF8.GetBytes($scriptContent)
$Base64 = [Convert]::ToBase64String($Bytes)

$UploadCMD = "echo $Base64 | base64 -d > /var/www/purple-port/server/check_meta_forms.ts && cd /var/www/purple-port/server && npx ts-node check_meta_forms.ts"
$r1 = Invoke-SSHCommand -SessionId $sshId -Command $UploadCMD
Write-Host $r1.Output
if ($r1.Error) { Write-Host "ERROR: " $r1.Error }

Remove-SSHSession -SessionId $sshId | Out-Null
