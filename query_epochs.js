const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
async function main() {
    const records = await db.attendanceRecord.findMany({
        where: { date: { gte: new Date("2026-06-30T18:30:00.000Z") } },
        take: 5
    });
    for (const r of records) {
        console.log(r.id, r.check_in?.getTime(), r.check_in?.toISOString());
    }
}
main().catch(console.error).finally(() => db.$disconnect());
