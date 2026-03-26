
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: {
            full_name: {
                contains: 'Noorudheen'
            }
        }
    });

    if (user) {
        console.log('Found User:', user.full_name);
        console.log('Role:', user.role);
        console.log('Department:', user.department);
    } else {
        console.log('User Noorudheen not found');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
