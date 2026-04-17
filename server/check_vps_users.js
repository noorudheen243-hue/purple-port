const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: { email: true, role: true }
    });
    console.log('Users in DB:');
    users.forEach(u => console.log(`- ${u.email} (${u.role})`));
  } catch (e) {
    console.error('Database query failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
