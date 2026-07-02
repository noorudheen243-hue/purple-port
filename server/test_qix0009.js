const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.user.findFirst({
  where: {staffProfile: {staff_number: 'QIX0009'}},
  include: {staffProfile: true}
}).then(u => {
  console.log(u);
  return prisma.$disconnect();
});
