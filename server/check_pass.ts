import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkPassword() {
    const admin = await prisma.user.findFirst({ where: { email: 'admin@qixads.com' } });
    if (!admin) {
        console.log("Admin not found");
        return;
    }

    const isMatchAdmin123 = await bcrypt.compare('admin123', admin.password_hash);
    const isMatchPass123 = await bcrypt.compare('password123', admin.password_hash);

    console.log(`Match 'admin123': ${isMatchAdmin123}`);
    console.log(`Match 'password123': ${isMatchPass123}`);
}

checkPassword().catch(console.error).finally(() => prisma.$disconnect());
