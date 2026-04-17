
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const counts = await prisma.user.count();
    console.log('USER_COUNT:', counts);
    if (counts > 0) {
      const users = await prisma.user.findMany({ select: { email: true, full_name: true } });
      console.log('USERS:', JSON.stringify(users, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
