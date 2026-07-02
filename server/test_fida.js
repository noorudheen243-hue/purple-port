const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.user.findMany({
  where: {full_name: {contains: 'FIDA'}},
  include: {staffProfile: true}
}).then(u => {
  console.log(JSON.stringify(u, null, 2));
  return prisma.$disconnect();
});
