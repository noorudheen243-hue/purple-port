import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateBankAccounts() {
    console.log("🏦 Updating Bank Accounts...");

    // 1. Rename "Main Bank Account" to "Main Bank A/C (Canara Bank)"
    const mainLedger = await prisma.ledger.findFirst({
        where: { name: 'Main Bank Account' }
    });

    if (mainLedger) {
        await prisma.ledger.update({
            where: { id: mainLedger.id },
            data: { name: 'Main Bank A/C (Canara Bank)' }
        });
        console.log("✅ Renamed 'Main Bank Account' to 'Main Bank A/C (Canara Bank)'");
    } else {
        console.log("⚠️ 'Main Bank Account' not found. Checking if already renamed...");
        const existingCanara = await prisma.ledger.findFirst({
            where: { name: 'Main Bank A/C (Canara Bank)' }
        });
        if (existingCanara) {
            console.log("ℹ️ 'Main Bank A/C (Canara Bank)' already exists.");
        } else {
            console.error("❌ Could not find Main Bank Account to rename.");
        }
    }

    // 2. Add "Secondary Bank Account (HDFC Bank)"
    // Need to find 'Assets' head first.
    const assetsHead = await prisma.accountHead.findUnique({
        where: { name: 'Assets' }
    });

    if (!assetsHead) {
        console.error("❌ 'Assets' Account Head not found!");
        return;
    }

    const hdfcName = 'Secondary Bank Account (HDFC Bank)';
    const existingHDFC = await prisma.ledger.findFirst({
        where: { name: hdfcName }
    });

    if (!existingHDFC) {
        // Check for old "Secondary Bank Account" to rename if it exists
        const oldSecondary = await prisma.ledger.findFirst({
            where: { name: 'Secondary Bank Account' }
        });

        if (oldSecondary) {
            await prisma.ledger.update({
                where: { id: oldSecondary.id },
                data: { name: hdfcName }
            });
            console.log("✅ Renamed 'Secondary Bank Account' to 'Secondary Bank Account (HDFC Bank)'");
        } else {
            // Create new
            await prisma.ledger.create({
                data: {
                    name: hdfcName,
                    head_id: assetsHead.id,
                    entity_type: 'BANK', // Using BANK type based on schema/seed
                    balance: 0.0,
                    status: 'ACTIVE'
                }
            });
            console.log(`✅ Created '${hdfcName}'`);
        }
    } else {
        console.log(`ℹ️ '${hdfcName}' already exists.`);
    }
}

updateBankAccounts()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
