
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMAIL = "noorudheen243@gmail.com";
const NEW_PASSWORD = "password123";

async function forceReset() {
    console.log(`Finding user: ${EMAIL}...`);
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });

    if (!user) {
        console.error("❌ User not found!");
        return;
    }

    console.log(`Found user: ${user.full_name} (${user.role})`);

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(NEW_PASSWORD, salt);

    await prisma.user.update({
        where: { id: user.id },
        data: { password_hash: hash }
    });

    console.log(`\n✅ Password for ${EMAIL} has been forcefully set to: ${NEW_PASSWORD}`);
    console.log("Try logging in now.");
}

forceReset()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
