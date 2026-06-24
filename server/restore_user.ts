
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.user.upsert({
        where: { email: 'noorudheen243@gmail.com' },
        update: {},
        create: {
            email: 'noorudheen243@gmail.com',
            full_name: 'Noorudheen',
            password_hash: '$2a$10$Tg.CZk4CyQydq2dG93S6S.8vM9PbbeV/D4O7pmrGym0G5t455ohB2',
            role: 'DEVELOPER_ADMIN',
            department: 'MANAGEMENT',
        },
    });
    console.log('User noorudheen243@gmail.com restored successfully.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
