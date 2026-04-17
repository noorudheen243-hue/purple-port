const { PrismaClient } = require('@prisma/client');
const { calculateAutoLOP } = require('./dist/modules/payroll/service.js');

const prisma = new PrismaClient();

async function checkArjun() {
    console.log("Checking Arjun LOP...");
    const u = await prisma.user.findFirst({ where: { full_name: { contains: "Arjun" } } });
    if(u) {
        console.log("User found:", u.full_name);
        try {
            const lops = await calculateAutoLOP(u.id, 3, 2026);
            console.log("VPS calculateAutoLOP returns:", lops);
        } catch (e) {
            console.error(e);
        }
    } else {
        console.log("Arjun not found in DB.");
    }
    
    // Check if he has An existing drafted slip!
    if(u) {
        const slip = await prisma.payrollSlip.findFirst({
            where: {
                user_id: u.id,
                run: { month: 3, year: 2026 }
            }
        });
        if(slip) {
            console.log("Existing Draft Slip LOP:", slip.lop_days);
        } else {
            console.log("No Draft Slip found.");
        }
    }
    process.exit(0);
}

checkArjun();
