const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "file:../dev.db" } } });

async function findArjuns() {
    const users = await prisma.user.findMany({ where: { full_name: { contains: "Arjun" } } });
    console.log("Arjuns found:", users.length);
    users.forEach(u => console.log(u.full_name, u.id));
    process.exit(0);
}
findArjuns();
