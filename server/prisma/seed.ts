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

    // Clients
    const clientAlpha = await prisma.client.create({
        data: {
            name: 'Alpha Corp',
            industry: 'Technology',
            status: 'ACTIVE',
            account_manager_id: exec.id,
            brand_colors: JSON.stringify(['#FF5733', '#C70039']) // Stored as string in SQLite
        }
    });

    const clientBeta = await prisma.client.create({
        data: {
            name: 'Beta Retail',
            industry: 'E-commerce',
            status: 'ACTIVE',
            account_manager_id: exec.id,
            brand_colors: JSON.stringify(['#007BFF', '#28A745'])
        }
    });

    // Campaigns
    const campaign1 = await prisma.campaign.create({
        data: {
            title: 'Q1 Brand Awareness',
            client_id: clientAlpha.id,
            start_date: new Date('2025-01-01'),
            end_date: new Date('2025-03-31'),
            budget: 15000,
            status: 'ACTIVE'
        }
    });

    const campaign2 = await prisma.campaign.create({
        data: {
            title: 'Spring Collection Launch',
            client_id: clientBeta.id,
            start_date: new Date('2025-04-01'),
            end_date: new Date('2025-05-31'),
            budget: 50000,
            status: 'PLANNING'
        }
    });

    // Tasks
    await prisma.task.create({
        data: {
            title: 'Logo Refresh Concepts',
            type: 'GRAPHIC',
            priority: 'HIGH',
            status: 'COMPLETED',
            campaign_id: campaign1.id,
            assignee_id: designer.id,
            reporter_id: exec.id,
            due_date: new Date('2025-01-15'),
            completed_date: new Date('2025-01-14'),
        }
    });

    await prisma.task.create({
        data: {
            title: 'Promo Video Editing',
            type: 'VIDEO',
            priority: 'URGENT',
            status: 'IN_PROGRESS',
            campaign_id: campaign1.id,
            assignee_id: designer.id,
            reporter_id: exec.id,
            due_date: new Date('2025-02-20'),
            actual_start_date: new Date('2025-02-10'),
        }
    });

    await prisma.task.create({
        data: {
            title: 'Website Banner Assets',
            type: 'WEB',
            priority: 'MEDIUM',
            status: 'REVIEW',
            campaign_id: campaign2.id,
            assignee_id: designer.id,
            reporter_id: exec.id,
            due_date: new Date('2025-03-01'),
        }
    });

    console.log('Seeding finished.');
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
