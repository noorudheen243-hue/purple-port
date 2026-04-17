import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PREDEFINED_TYPES = [
    "Poster Design", "Reel Video", "Motion Graphic Video", "AI Video",
    "Anchor Ads", "Carousel", "Logo Design", "Brochure Design",
    "Flyer Design", "Flex / Billboard Design", "Business Card", "Letter Head"
];

async function main() {
    console.log("Starting Content Types Migration...");

    // 1. Seed predefined types
    for (const name of PREDEFINED_TYPES) {
        await prisma.contentType.upsert({
            where: { name },
            update: { is_custom: false },
            create: { name, is_custom: false }
        });
    }
    console.log("Predefined types seeded.");

    const allTypes = await prisma.contentType.findMany();
    const typeMap = new Map(allTypes.map(t => [t.name, t.id]));

    // 2. Migrate existing ClientContentStrategy
    const strategies = await prisma.clientContentStrategy.findMany({
        where: { type: { not: null } }
    });

    let strategyUpdated = 0;
    for (const strat of strategies) {
        if (!strat.type) continue;
        
        // Find or create ContentType
        let typeId = typeMap.get(strat.type);
        if (!typeId) {
            const newType = await prisma.contentType.create({
                data: { name: strat.type, is_custom: true }
            });
            typeMap.set(strat.type, newType.id);
            typeId = newType.id;
            console.log(`Created custom type: ${strat.type}`);
        }

        // Migrate strategy to relational ID
        await prisma.clientContentStrategy.update({
            where: { id: strat.id },
            data: {
                content_type_id: typeId,
                monthly_target: strat.quantity || 0  // migrate legacy quantity to monthly_target
            }
        });
        strategyUpdated++;
    }
    console.log(`Migrated ${strategyUpdated} Content Strategies.`);

    // 3. Migrate Tasks
    const tasks = await prisma.task.findMany({
        where: { content_type: { not: null }, content_type_id: null }
    });

    let tasksUpdated = 0;
    for (const task of tasks) {
        if (!task.content_type) continue;
        
        let typeId = typeMap.get(task.content_type);
        if (!typeId) {
            const newType = await prisma.contentType.create({
                data: { name: task.content_type, is_custom: true }
            });
            typeMap.set(task.content_type, newType.id);
            typeId = newType.id;
            console.log(`Created custom type for task: ${task.content_type}`);
        }

        await prisma.task.update({
            where: { id: task.id },
            data: { content_type_id: typeId }
        });
        tasksUpdated++;
    }
    console.log(`Migrated ${tasksUpdated} Tasks.`);
    console.log("Migration Complete!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
