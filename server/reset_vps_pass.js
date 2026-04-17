const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = 'noorudheen243@gmail.com';
  const password = 'password123';
  const hash = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.update({
    where: { email },
    data: { password_hash: hash }
  });
  
  console.log('Password reset for:', user.email);
  process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
