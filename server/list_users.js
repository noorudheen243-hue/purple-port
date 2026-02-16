const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            staff_number: true,
            department: true,
            position: true
        }
    });

    console.log('\n=== USER LIST ===\n');

    if (users.length === 0) {
        console.log('⚠️  No users found in database!\n');
        console.log('The database was reset and needs admin user creation.\n');
    } else {
        console.table(users);
    }

    await prisma.$disconnect();
}

listUsers().catch(console.error);
