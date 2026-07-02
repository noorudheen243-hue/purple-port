import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const tasks = await prisma.task.findMany({
        where: {
            assignee: { full_name: { contains: 'Hasna' } },
            department: 'CREATIVE'
        }
    });
    
    const juneTasks = tasks.filter(t => {
        const d = t.completed_date || t.updatedAt;
        return d && d.getFullYear() === 2026 && d.getMonth() === 5; // June is 5
    });
    console.log(`June 2026 CREATIVE Tasks for Hasna: ${juneTasks.length}`);
}
run();
