import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

async function main() {
    console.log('Seeding mock marketing metrics...');

    // Fetch an existing client to attach campaigns to
    let client = await prisma.client.findFirst();
    if (!client) {
        console.log('No clients found. Creating a mock client...');
        client = await (prisma as any).client.create({
            data: {
                name: 'Acme Corp',
                status: 'ACTIVE'
            }
        });
    }
    const MOCK_CLIENT_ID = client!.id;

    // Create a mock campaign
    const campaign = await (prisma as any).marketingCampaign.create({
        data: {
            clientId: MOCK_CLIENT_ID,
            platform: 'meta',
            externalCampaignId: 'mock-ext-12345',
            name: 'Spring Sale 2026',
            objective: 'CONVERSIONS',
            status: 'ACTIVE',
        }
    });

    const campaignGoogle = await (prisma as any).marketingCampaign.create({
        data: {
            clientId: MOCK_CLIENT_ID,
            platform: 'google',
            externalCampaignId: 'mock-ext-54321',
            name: 'Search - Brand Terms',
            objective: 'TRAFFIC',
            status: 'ACTIVE',
        }
    });

    // Generate 30 days of data
    const metricsData = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);

        // Meta Metrics
        metricsData.push({
            campaignId: campaign.id,
            date: d,
            impressions: Math.floor(Math.random() * 5000) + 1000,
            clicks: Math.floor(Math.random() * 100) + 10,
            spend: Math.floor(Math.random() * 1000) + 200,
            conversions: Math.floor(Math.random() * 5),
        });

        // Google Metrics
        metricsData.push({
            campaignId: campaignGoogle.id,
            date: d,
            impressions: Math.floor(Math.random() * 3000) + 500,
            clicks: Math.floor(Math.random() * 200) + 30,
            spend: Math.floor(Math.random() * 800) + 100,
            conversions: Math.floor(Math.random() * 8),
        });
    }

    await (prisma as any).marketingMetric.createMany({
        data: metricsData
    });

    console.log('Mock marketing metrics seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
