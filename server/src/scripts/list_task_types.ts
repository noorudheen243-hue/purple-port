import prisma from '../utils/prisma';

async function main() {
  const types = await prisma.task.groupBy({
    by: ['type'],
    _count: {
      type: true,
    },
  });
  console.log('Task Types in DB:');
  console.log(types);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
