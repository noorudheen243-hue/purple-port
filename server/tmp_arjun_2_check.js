const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "file:../dev.db" } } });

async function checkSecondArjun() {
    const u = await prisma.user.findUnique({ where: { id: "ecd0e572-e055-4f20-84e6-7d2b60fed47f" } });
    if(!u) return console.log("Arjun 2 not found");

    console.log("Found Arjun:", u.full_name, "ID:", u.id);

    const month = 3;
    const year = 2026;
    const startDate = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const endDate = monthEnd;

    const attendance = await prisma.attendanceRecord.findMany({
        where: { user_id: u.id, date: { gte: startDate, lte: endDate } }
    });
    
    let halfDays = 0;
    let absents = 0;
    attendance.forEach(a => {
        if(a.status === 'HALF_DAY') halfDays++;
        if(a.status === 'ABSENT') absents++;
    });

    console.log(`Arjun 2 has ${halfDays} HALF_DAY and ${absents} ABSENT in DB.`);
    process.exit(0);
}
checkSecondArjun();
