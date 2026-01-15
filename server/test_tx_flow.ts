import { PrismaClient } from '@prisma/client';
// Use relative path carefully. The file is in root/server, service is in root/server/src/...
import { ensureLedger, recordTransaction, getTransactions } from './src/modules/accounting/service';

const prisma = new PrismaClient();

async function runTest() {
    console.log('--- STARTING TRANSACTION FLOW TEST ---');

    // 1. Find or Create a Test Client
    let client = await prisma.client.findFirst();
    if (!client) {
        console.log('No client found. Creating one...');
        client = await prisma.client.create({
            data: {
                name: "Test Client LLC",
                company_email: "test@client.com",
                contact_number: "1234567890",
                status: "ACTIVE"
            }
        });
    }
    console.log(`Using Client: ${client.name} (${client.id})`);

    // 2. Ensure Ledger Exists (This logic is critical)
    console.log('Ensuring Ledger...');
    const ledger = await ensureLedger('CLIENT', client.id, '1000'); // 1000 = Asset/Receivable usually? Or generic
    console.log(`Ledger ID: ${ledger.id}, Name: ${ledger.name}`);

    // 3. Ensure a Cash Ledger exists for the other side of transaction
    const cashLedger = await ensureLedger('INTERNAL', 'CASH_MAIN', '1000', 'Main Cash'); // Fix head code usage if needed

    // 4. Record a Test Transaction
    console.log('Recording Transaction...');
    const amount = 500.00;
    const tx = await recordTransaction({
        date: new Date(),
        description: "Test Manual Transaction via Script",
        amount: amount,
        type: "PAYMENT", // Client paid us? Or we paid client? Let's say Client Paid (Receipt) usually. But logic is generic.
        from_ledger_id: ledger.id,  // Client GIVES (Credit Client)
        to_ledger_id: cashLedger.id,// We RECEIVE (Debit Cash) - Assuming Payment FROM Client
        user_id: "TEST_SCRIPT"
    });
    console.log(`Transaction Recorded. ID: ${tx.id}`);

    // 5. Test Retrieval (The part that was failing)
    console.log('Fetching Transactions as Client (mimicking Controller)...');

    // Test A: Direct Client ID filter
    const entries = await getTransactions(50, undefined, undefined, client.id);

    console.log(`\n--- RESULT ---`);
    if (entries.length > 0) {
        console.log(`SUCCESS! Found ${entries.length} transactions for client.`);
        const found = entries.find(e => e.id === tx.id);
        if (found) {
            console.log('Specific test transaction verified in list.');
        } else {
            console.log('WARNING: Test transaction NOT in top 50 list (might be sort order?).');
        }
    } else {
        console.log('FAILURE: No transactions found for this client.');

        // Debug: Why?
        console.log('Debug Checks:');
        console.log(`Client ID: ${client.id}`);
        console.log(`Ledger Entity ID: ${ledger.entity_id}`);
        console.log(`Ledger Name: ${ledger.name}`);
    }

    // Cleanup (Optional, but good for test)
    // await prisma.journalEntry.delete({ where: { id: tx.id } });
}

runTest()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
