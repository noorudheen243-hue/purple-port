
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findCoFounders() {
    try {
        console.log('Finding Co-Founders...');

        const staffIds = ['QIX0001', 'QIX0002'];

        const users = await prisma.user.findMany({
            where: {
                staffProfile: {
                    staff_number: { in: staffIds }
                }
            },
            select: {
                id: true,
                full_name: true,
                staffProfile: {
                    select: { staff_number: true }
                }
            }
        });

        console.log('Found Users:', users);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findCoFounders();
