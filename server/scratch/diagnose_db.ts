import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function diagnose() {
    let log = "--- SQLite Diagnostics ---\n";
    try {
        const result = await prisma.$queryRawUnsafe('PRAGMA integrity_check;');
        log += "Integrity Check Result: " + JSON.stringify(result, null, 2) + "\n";
    } catch (error: any) {
        log += "Integrity Check Failed: " + error.message + "\n";
    }

    const tables = [
        'user', 'client', 'campaign', 'task', 'ledger', 'attendanceRecord'
    ];

    for (const table of tables) {
        try {
            const count = await (prisma as any)[table].count();
            log += `Table ${table}: ${count} rows (Readable)\n`;
        } catch (error: any) {
            log += `Table ${table}: FAILED - ${error.message.split('\n')[0]}\n`;
        }
    }

    fs.writeFileSync('diag_output.txt', log);
    await prisma.$disconnect();
}

diagnose();
