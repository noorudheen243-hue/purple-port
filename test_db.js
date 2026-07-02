const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const records = await prisma.attendanceRecord.findMany({
    where: { method: "BIOMETRIC", check_out: { not: null } },
    orderBy: { date: "desc" },
    take: 5
  });
  console.log(records);
}
main().catch(console.error).finally(() => prisma.$disconnect());
