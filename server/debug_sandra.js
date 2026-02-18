
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getSalaryDraft } = require('./src/modules/payroll/service');

async function debugSandra() {
    try {
        console.log("Searching for user 'Sandra'...");
        const users = await prisma.user.findMany({
            where: { full_name: { contains: 'Sandra' } },
            include: { staffProfile: true }
        });

        if (users.length === 0) {
            console.log("No user found with name containing 'Sandra'");
            return;
        }

        for (const user of users) {
            console.log(`\n--- Found User: ${user.full_name} (${user.id}) ---`);
            console.log("Profile:", user.staffProfile);

            if (user.staffProfile) {
                console.log("\nCalculating Draft Salary (MONTHLY)...");
                const monthly = await getSalaryDraft(user.id, 2, 2026, undefined, 'MONTHLY');
                console.log("Monthly Basic:", monthly.basic_salary);
                console.log("Monthly Gross:", monthly.gross_total);

                console.log("\nCalculating Draft Salary (TILL_DATE)...");
                const tillDate = await getSalaryDraft(user.id, 2, 2026, undefined, 'TILL_DATE');
                console.log("Till Date Basic:", tillDate.basic_salary);
                console.log("Till Date Gross:", tillDate.gross_total);
                console.log("Till Date LOP Days:", tillDate.lop_days);
            } else {
                console.log("No Staff Profile found!");
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debugSandra();
