
import prisma from '../utils/prisma';

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'bridge@antigravity.com' }
    });
    console.log('Bridge User:', user);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
