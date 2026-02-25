import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@qixads.com' },
        update: { password_hash: password },
        create: {
            email: 'admin@qixads.com',
            full_name: 'Admin User',
            password_hash: password,
            role: 'ADMIN',
            department: 'MANAGEMENT',
        },
    });

    const manager = await prisma.user.upsert({
        where: { email: 'manager@qixads.com' },
        update: { password_hash: password },
        create: {
            email: 'manager@qixads.com',
            full_name: 'Sarah Manager',
            password_hash: password,
            role: 'MANAGER',
            department: 'MANAGEMENT',
        },
    });

    const exec = await prisma.user.upsert({
        where: { email: 'exec@qixads.com' },
        update: { password_hash: password },
        create: {
            email: 'exec@qixads.com',
            full_name: 'Mike Executive',
            password_hash: password,
            role: 'MARKETING_EXEC',
            department: 'MARKETING',
        },
    });

    const designer = await prisma.user.upsert({
        where: { email: 'designer@qixads.com' },
        update: { password_hash: password },
        create: {
            email: 'designer@qixads.com',
            full_name: 'Alex Designer',
            password_hash: password,
            role: 'DESIGNER',
            department: 'CREATIVE',
        },
    });

    // Staff Profiles
    await prisma.staffProfile.upsert({
        where: { user_id: admin.id },
        update: {},
        create: {
            user_id: admin.id,
            staff_number: 'EMP001',
            designation: 'Director',
            department: 'MANAGEMENT',
            date_of_joining: new Date('2023-01-01'),
            base_salary: 100000,
        }
    });

    await prisma.staffProfile.upsert({
        where: { user_id: manager.id },
        update: {},
        create: {
            user_id: manager.id,
            staff_number: 'EMP002',
            designation: 'Manager',
            department: 'MANAGEMENT',
            date_of_joining: new Date('2023-06-01'),
            base_salary: 80000,
            reporting_manager_id: admin.id
        }
    });

    await prisma.staffProfile.upsert({
        where: { user_id: exec.id },
        update: {},
        create: {
            user_id: exec.id,
            staff_number: 'EMP003',
            designation: 'Marketing Executive',
            department: 'MARKETING',
            date_of_joining: new Date('2024-01-15'),
            base_salary: 50000,
            reporting_manager_id: manager.id
        }
    });

    await prisma.staffProfile.upsert({
        where: { user_id: designer.id },
        update: {},
        create: {
            user_id: designer.id,
            staff_number: 'EMP004',
            designation: 'Senior Designer',
            department: 'CREATIVE',
            date_of_joining: new Date('2024-02-01'),
            base_salary: 60000,
            reporting_manager_id: manager.id
        }
    });

    // Seed ONLY Users/Staff for fresh deployment
    console.log('Users seeded. Skipping Clients/Tasks for fresh production build.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
