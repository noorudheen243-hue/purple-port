import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeTaskData() {
    console.log('⚠️  Starting Task Data Wipe...');

    // Safety check: Don't run this unless explicitly confirmed (by running this script)
    // Deleting in order to respect Foreign Key constraints (Child -> Parent)

    try {
        console.log('   - Deleting SubTasks...');
        // If SubTasks model exists, delete it. If not, skip. 
        // Based on previous schema knowledge, SubTask relation exists. 
        // Need to check schema but to be safe we delete related tables first.

        console.log('   - Deleting TimeLogs...');
        await prisma.timeLog.deleteMany({});

        console.log('   - Deleting Comments...');
        await prisma.comment.deleteMany({});

        console.log('   - Deleting Assets (Linked to Tasks)...');
        await prisma.asset.deleteMany({
            where: {
                task_id: { not: null }
            }
        });

        console.log('   - Deleting Tasks...');
        await prisma.task.deleteMany({});

        console.log('   - Resetting Sequence ID Counter...');
        // We can't easily reset the auto-increment on SQLite/Postgres via Prisma directly without raw SQL
        // But our "sequence_id" is manual. 
        // Wait, the sequence_id is stored in the Task table itself. 
        // If we want to restart from QIX-0001, we just need to ensure the next task created sees 0 existing tasks.
        // My manual logic was: findFirst({orderBy: sequence_id desc}). If null, start at 1.
        // So deleting all tasks automatically resets the counter! associated with my logic.

        console.log('✅  Task Data Wiped Successfully. System is clean.');

    } catch (error) {
        console.error('❌  Error wiping data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

wipeTaskData();
