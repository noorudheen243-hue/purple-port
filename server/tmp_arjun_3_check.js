const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "file:../dev.db" } } });

async function checkSecondArjunAll() {
    const month = 3;
    const year = 2026;
    const startDate = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const u = await prisma.user.findUnique({ where: { id: "ecd0e572-e055-4f20-84e6-7d2b60fed47f" } });
    const attendance = await prisma.attendanceRecord.findMany({
        where: { user_id: u.id, date: { gte: startDate, lte: monthEnd } }
    });
    console.log("Arjun 2 Total Records:", attendance.length);

    console.log("WAIT!!! Are we using the right Arjun ID? Let me find ALL Users with the Profile Department match.");
    // The screenshot says: "Arjun - Digital Marketing Executive/Web Development"
    const allUsers = await prisma.user.findMany({
        include: { profile: true }
    });
    allUsers.forEach(user => {
        if(user.full_name.includes("Arjun")) {
            console.log(user.id, user.full_name, "-", user.profile?.designation, "/", user.profile?.department);
        }
    });

    process.exit(0);
}
checkSecondArjunAll();
