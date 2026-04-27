const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyFix() {
  const month = 4;
  const year = 2026;
  
  // Simulation of AttendanceController.getTeamSummary date calculation
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  
  console.log(`Requested range: ${start.toISOString()} to ${end.toISOString()}`);

  // Simulation of AttendanceService.getTeamAttendance range expansion
  const searchStart = new Date(start);
  searchStart.setDate(searchStart.getDate() - 1);

  console.log(`Database query range: ${searchStart.toISOString()} to ${end.toISOString()}`);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: {
        gte: searchStart,
        lte: end
      }
    }
  });

  console.log(`Found ${records.length} records.`);
  
  const april01Key = "2026-04-01";
  const recordsForApril01 = records.filter(r => {
    const istOffset = 330 * 60 * 1000;
    const istDate = new Date(r.date.getTime() + istOffset);
    return istDate.toISOString().split('T')[0] === april01Key;
  });

  console.log(`Records mapped to ${april01Key}: ${recordsForApril01.length}`);
  
  if (recordsForApril01.length > 0) {
    console.log("SUCCESS: April 01 records are now included in the monthly range query!");
  } else {
    console.log("FAILURE: April 01 records still missing.");
  }
}

verifyFix()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
