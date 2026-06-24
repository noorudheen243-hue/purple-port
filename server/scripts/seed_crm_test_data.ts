import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding CRM Test Data...');

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('password123', salt);

    // 1. Create a Test Client
    const client = await prisma.client.upsert({
        where: { client_code: 'TCC001' },
        update: {},
        create: {
            client_code: 'TCC001',
            name: 'Test Client Co',
            industry: 'Tech & Marketing',
            status: 'ACTIVE'
        }
    });
    console.log(`Created Client: ${client.name} (${client.id})`);

    // 2. Create Marketing Groups
    const groupA = await prisma.marketingGroup.upsert({
        where: { name_client_id: { name: 'Group A', client_id: client.id } },
        update: {},
        create: {
            name: 'Group A',
            client_id: client.id
        }
    });

    const groupB = await prisma.marketingGroup.upsert({
        where: { name_client_id: { name: 'Group B', client_id: client.id } },
        update: {},
        create: {
            name: 'Group B',
            client_id: client.id
        }
    });
    console.log(`Created Marketing Groups: ${groupA.name}, ${groupB.name}`);

    // 3. Create CRM Users
    // User 1: Client level full access
    const clientUser = await prisma.crmUser.upsert({
        where: { user_id: 'client_crm_full' },
        update: { password_hash },
        create: {
            user_id: 'client_crm_full',
            email: 'crm_full@testclient.com',
            full_name: 'John CRM Full Access',
            designation: 'Sales Manager',
            password_hash,
            client_id: client.id,
            campaign_group_id: null, // Full access
            status: 'ACTIVE'
        }
    });

    // User 2: Restricted to Group A
    const groupAUser = await prisma.crmUser.upsert({
        where: { user_id: 'client_crm_groupa' },
        update: { password_hash },
        create: {
            user_id: 'client_crm_groupa',
            email: 'crm_groupa@testclient.com',
            full_name: 'Alice Group A Agent',
            designation: 'Sales Agent',
            password_hash,
            client_id: client.id,
            campaign_group_id: groupA.id, // Restricted to Group A
            status: 'ACTIVE'
        }
    });
    console.log(`Created CRM Users: ${clientUser.user_id}, ${groupAUser.user_id}`);

    // 4. Create Leads
    // Lead 1: In Group A
    const lead1 = await prisma.lead.create({
        data: {
            client_id: client.id,
            group_id: groupA.id,
            name: 'Lead Group A - Bob',
            phone: '+919999999991',
            email: 'bob@example.com',
            location: 'Delhi',
            source: 'META',
            campaign_name: 'Meta Ads A',
            quality: 'HIGH',
            stage: 'New Lead'
        }
    });

    // Lead 2: In Group B
    const lead2 = await prisma.lead.create({
        data: {
            client_id: client.id,
            group_id: groupB.id,
            name: 'Lead Group B - Charlie',
            phone: '+919999999992',
            email: 'charlie@example.com',
            location: 'Mumbai',
            source: 'META',
            campaign_name: 'Meta Ads B',
            quality: 'MEDIUM',
            stage: 'Contacted'
        }
    });

    // Lead 3: Unassigned Group (General Lead)
    const lead3 = await prisma.lead.create({
        data: {
            client_id: client.id,
            group_id: null,
            name: 'Lead General - David',
            phone: '+919999999993',
            email: 'david@example.com',
            location: 'Bangalore',
            source: 'MANUAL',
            campaign_name: 'Direct Call',
            quality: 'LOW',
            stage: 'Qualified'
        }
    });

    console.log(`Created Leads: ${lead1.name}, ${lead2.name}, ${lead3.name}`);
    console.log('CRM Test Data Seeding Complete!');
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
