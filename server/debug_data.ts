import prisma from './src/utils/prisma';

async function checkClientData() {
    try {
        const clients = await prisma.client.findMany({
            select: { id: true, name: true, service_engagement: true }
        });
        console.log("--- CLIENT DATA DUMP ---");
        clients.forEach(c => {
            console.log(`Client: ${c.name} (${c.id})`);
            console.log(`Raw Service Engagement:`, c.service_engagement);
            try {
                const parsed = JSON.parse(c.service_engagement as string);
                console.log(`Parsed:`, parsed);
                console.log(`Is Array?`, Array.isArray(parsed));
            } catch (e: any) {
                console.log(`Parse Error:`, e.message);
            }
            console.log("------------------------");
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkClientData();
