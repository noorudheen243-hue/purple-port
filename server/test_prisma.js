const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.attendanceRecord.findFirst({
  where: {},
  include: {user: {include: {staffProfile: true}}}
}).then(p => {
  console.log(p);
  return prisma.$disconnect();
});
