
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function restoreAdmin() {
    const email = 'noorudheen243@gmail.com';
    const password = 'password123'; // Default temporary password
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Restoring admin: ${email}...`);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password_hash: hashedPassword,
            role: 'ADMIN',
            account_status: 'ACTIVE'
        },
        create: {
            email,
            full_name: 'Noorudheen',
            password_hash: hashedPassword,
            role: 'ADMIN',
            department: 'MANAGEMENT',
            designation: 'Director',
            account_status: 'ACTIVE',
            employee_id: 'ADMIN001',
            joining_date: new Date()
        }
    });

    console.log(`SUCCESS: User ${user.email} restored.`);
    console.log(`Password set to: ${password}`);
}

restoreAdmin()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
