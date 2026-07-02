const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.staffProfile.findMany({
  where: {staff_number: {contains: 'QIX0009'}},
  include: {user: true}
}).then(p => {
  console.log(JSON.stringify(p, null, 2));
  return prisma.$disconnect();
});
