
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'arjunkp259@gmail.com';
    const newPassword = 'Welcome@123';

    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { email },
        data: { password_hash: hash }
    });

    console.log(`Password for ${email} reset to ${newPassword}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
