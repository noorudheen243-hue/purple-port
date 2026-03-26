const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { email: true, role: true, status: true }
    });
    console.log("Local Admin Users:");
    users.filter(u => u.email.includes("admin")).forEach(u => console.log(JSON.stringify(u)));
    console.log(`\nTotal Users Local: ${users.length}`);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
