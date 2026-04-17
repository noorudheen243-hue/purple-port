$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    
    $jsScript = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const accounts = await prisma.marketingAccount.findMany({ where: { platform: 'meta' } });
    const clients = await prisma.client.findMany();
    for (const acc of accounts) {
        const client = clients.find(c => c.id === acc.clientId);
        console.log(\`Account \${acc.externalAccountId} -> Client: \${client?.name || 'Unknown'}\`);
    }
}
main().catch(console.error).finally(() => prisma.`$disconnect());
"@
    
    Invoke-SSHCommand -SessionId $s.SessionId -Command "echo '$jsScript' > /var/www/purple-port/server/tmp_accounts.js"
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && node tmp_accounts.js"
    Write-Host $r.Output
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
