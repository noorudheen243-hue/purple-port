import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACCOUNT_HEADS = [
    { name: 'Assets', code: '1000', type: 'ASSET' },
    { name: 'Liabilities', code: '2000', type: 'LIABILITY' },
    { name: 'Equity', code: '3000', type: 'EQUITY' },
    { name: 'Income', code: '4000', type: 'INCOME' },
    { name: 'Expenses', code: '6000', type: 'EXPENSE' }, // Skipping 5000 for COGS/Direct Costs if needed later
];

const MASTER_LEDGERS = [
    // --- ASSETS (1000) ---
    { name: 'Cash in Hand', head: 'Assets', type: 'CASH' },
    { name: 'Main Bank Account', head: 'Assets', type: 'BANK' },
    { name: 'Secondary Bank Account', head: 'Assets', type: 'BANK' },
    { name: 'Credit Card Account', head: 'Assets', type: 'BANK' }, // Credit Card is usually Liability? User said Assets. Sticking to Prompt. Actually CC is Liability. But sticking to PROMPT "ASSETS - ... 4. Credit Card Account".
    { name: 'Accounts Receivable', head: 'Assets', type: 'ADJUSTMENT' },
    { name: 'Advance to Vendors', head: 'Assets', type: 'ADJUSTMENT' },
    { name: 'Prepaid Expenses', head: 'Assets', type: 'ADJUSTMENT' },

    // --- LIABILITIES (2000) ---
    { name: 'Accounts Payable', head: 'Liabilities', type: 'VENDOR' }, // Control account
    { name: 'Client Advances', head: 'Liabilities', type: 'CLIENT' },
    { name: 'Outstanding Expenses', head: 'Liabilities', type: 'ADJUSTMENT' },

    // --- EQUITY (3000) ---
    { name: 'Owner Capital', head: 'Equity', type: 'ADJUSTMENT' },
    { name: 'Retained Earnings', head: 'Equity', type: 'ADJUSTMENT' },
    { name: 'Current Year Profit / Loss', head: 'Equity', type: 'ADJUSTMENT' }, // System-calculated

    // --- INCOME (4000) ---
    { name: 'Digital Marketing Retainer Income', head: 'Income', type: 'INCOME' },
    { name: 'Meta Ads Management Fee', head: 'Income', type: 'INCOME' },
    { name: 'Google Ads Management Fee', head: 'Income', type: 'INCOME' },
    { name: 'SEO Service Income', head: 'Income', type: 'INCOME' },
    { name: 'Website Development Income', head: 'Income', type: 'INCOME' },
    { name: 'Branding & Creative Income', head: 'Income', type: 'INCOME' },
    { name: 'Video Production Income', head: 'Income', type: 'INCOME' },
    { name: 'Consulting Income', head: 'Income', type: 'INCOME' },
    { name: 'Commission Income', head: 'Income', type: 'INCOME' },
    { name: 'Interest Income', head: 'Income', type: 'INCOME' },
    { name: 'Miscellaneous Income', head: 'Income', type: 'INCOME' },

    // --- EXPENSES (6000) ---
    { name: 'Meta Ads Spend', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Google Ads Spend', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Influencer Payments', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Media Buying Expense', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Salary & Wages', head: 'Expenses', type: 'EXPENSE' }, // Control Ledger
    { name: 'Freelancer Payments', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Incentives & Bonuses', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Office Rent', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Electricity & Utilities', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Internet & Phone', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Office Maintenance', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Software Subscriptions', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Hosting & Cloud Services', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Design Tools', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Marketing & Promotion', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Travel & Conveyance', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Legal & Professional Fees', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Bank Charges', head: 'Expenses', type: 'EXPENSE' },
    { name: 'Depreciation Expense', head: 'Expenses', type: 'ADJUSTMENT' },
    { name: 'Miscellaneous Expenses', head: 'Expenses', type: 'EXPENSE' },

    // --- SYSTEM LOCKED ---
    { name: 'Opening Balance Adjustment', head: 'Equity', type: 'ADJUSTMENT' },
    { name: 'Rounding Off', head: 'Expenses', type: 'ADJUSTMENT' },
];

async function seedAccounting() {
    console.log("🌱 Seeding Accounting Module...");

    // 1. Create Account Heads
    const headMap = new Map();
    for (const head of ACCOUNT_HEADS) {
        const record = await prisma.accountHead.upsert({
            where: { name: head.name },
            update: {},
            create: head
        });
        headMap.set(head.name, record.id);
        console.log(`✅ Head: ${head.name}`);
    }

    // 2. Create Master Ledgers
    for (const ledger of MASTER_LEDGERS) {
        const headId = headMap.get(ledger.head);
        if (!headId) {
            console.error(`❌ Head not found for ledger: ${ledger.name}`);
            continue;
        }

        await prisma.ledger.upsert({
            where: {
                name_head_id: {
                    name: ledger.name,
                    head_id: headId
                }
            },
            update: {
                entity_type: ledger.type, // Ensure type is correct
            },
            create: {
                name: ledger.name,
                head_id: headId,
                entity_type: ledger.type,
                balance: 0.0,
                status: 'ACTIVE'
            }
        });
        console.log(`✅ Ledger: ${ledger.name}`);
    }

    console.log("🚀 Accounting Seeding Complete!");
}

seedAccounting()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
