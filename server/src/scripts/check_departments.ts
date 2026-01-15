
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDepartments() {
    try {
        console.log('Checking Departments...');
        const users = await prisma.user.groupBy({
            by: ['department'],
            _count: {
                _all: true
            }
        });
        console.log('Departments found:', users);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDepartments();
