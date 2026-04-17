const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:../dev.db"
    }
  }
});

async function checkSlip() {
    const u = await prisma.user.findFirst({ where: { full_name: { contains: "Arjun" } } });
    if(u) {
        const slip = await prisma.payrollSlip.findFirst({
            where: {
                user_id: u.id,
                run: { month: 3, year: 2026 }
            }
        });
        console.log("Arjun's Saved PayrollSlip for March 2026:");
        console.log(slip);
    }
    process.exit(0);
}

checkSlip();
