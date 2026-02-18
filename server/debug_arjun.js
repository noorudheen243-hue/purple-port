
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getSalaryDraft } = require('./src/modules/payroll/service');

async function debugArjun() {
    try {
        console.log("Searching for user 'Arjun'...");
        const users = await prisma.user.findMany({
            where: { full_name: { contains: 'Arjun' } },
            include: { staffProfile: true }
        });

        if (users.length === 0) {
            console.log("No user found with name containing 'Arjun'");
            return;
        }

        for (const user of users) {
            console.log(`\n--- Found User: ${user.full_name} (${user.id}) ---`);
            console.log("Profile:", user.staffProfile);

            if (user.staffProfile) {
                console.log("\nCalculating Draft Salary (MONTHLY)...");
                try {
                    const monthly = await getSalaryDraft(user.id, 2, 2026, undefined, 'MONTHLY');
                    console.log("Monthly Basic:", monthly.basic_salary);
                    console.log("Monthly Gross:", monthly.gross_total);
                } catch (err) {
                    console.error("ERROR in MONTHLY calc:", err);
                }

                console.log("\nCalculating Draft Salary (TILL_DATE)...");
                try {
                    const tillDate = await getSalaryDraft(user.id, 2, 2026, undefined, 'TILL_DATE');
                    console.log("Till Date Basic:", tillDate.basic_salary);
                    console.log("Till Date Gross:", tillDate.gross_total);
                } catch (err) {
                    console.error("ERROR in TILL_DATE calc:", err);
                }
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

debugArjun();
