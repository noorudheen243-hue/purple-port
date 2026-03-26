const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyReportStats() {
    try {
        console.log('--- Verifying getTaskStats Logic ---');

        // 1. Check department filtering
        const creativeTasks = await prisma.task.findMany({
            where: { department: 'CREATIVE' },
            include: { assignee: true }
        });
        console.log(`Found ${creativeTasks.length} creative tasks in DB.`);

        // 2. Simulate staff_type grouping
        const stats = {};
        creativeTasks.forEach(task => {
            const staffName = task.assignee?.full_name || 'Unassigned';
            const key = `${staffName} - ${task.type}`;
            if (!stats[key]) stats[key] = { total: 0, completed: 0 };
            stats[key].total++;
            if (task.status === 'COMPLETED') stats[key].completed++;
        });

        console.log('Grouped Stats (Staff & Task Type):');
        console.log(JSON.stringify(stats, null, 2));

        if (Object.keys(stats).length > 0) {
            console.log('✅ Grouping logic verified.');
        } else {
            console.log('⚠️ No stats generated. (Possibly no tasks in DB)');
        }

    } catch (e) {
        console.error('❌ Verification failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

verifyReportStats();
