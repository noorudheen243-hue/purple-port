
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const client = await prisma.client.findFirst({
        where: {
            name: 'Qix Media'
        }
    });

    if (client) {
        console.log('Found Client:', client);
    } else {
        console.log('Client "Koomen" not found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
