
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany();
    console.log('USERS:', JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Error fetching users:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
