
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function restoreAdmin() {
    const email = 'noorudheen243@gmail.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Restoring admin user: ${email}...`);

    // 1. Upsert User
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password_hash: hashedPassword,
            role: 'ADMIN',
            department: 'MANAGEMENT'
        },
        create: {
            email,
            full_name: 'Noorudheen',
            password_hash: hashedPassword,
            role: 'ADMIN',
            department: 'MANAGEMENT',
        }
    });

    console.log(`User restored. ID: ${user.id}`);

    // 2. Upsert Staff Profile
    console.log(`Restoring staff profile...`);

    // Check if profile exists to decide update vs create logic safely
    // (Upsert is cleaner but let's be explicit to avoid unique constraint issues on staff_number if feasible)

    await prisma.staffProfile.upsert({
        where: { user_id: user.id },
        update: {
            designation: 'Director',
            department: 'MANAGEMENT'
            // We don't update staff_number to avoid unique conflicts if it's already set
        },
        create: {
            user: { connect: { id: user.id } },
            staff_number: 'ADMIN001',
            designation: 'Director',
            department: 'MANAGEMENT',
            date_of_joining: new Date(),
            payroll_status: 'ACTIVE'
        }
    });

    console.log(`Staff Profile linked.`);
    console.log(`--- CREDENTIALS ---`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
}

restoreAdmin()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
