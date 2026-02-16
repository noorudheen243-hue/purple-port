import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');
const BACKUP_PATH = path.join(process.cwd(), 'prisma', `dev_backup_${Date.now()}.db`);
const REPAIRED_PATH = path.join(process.cwd(), 'prisma', 'dev_repaired.db');

console.log('=== SQLite Database Repair Tool ===\n');

try {
    // 1. Create backup
    console.log('Step 1: Creating backup...');
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
    console.log(`✅ Backup created: ${BACKUP_PATH}\n`);

    // 2. Try to repair using SQLite dump and restore
    console.log('Step 2: Attempting repair via dump/restore...');

    try {
        // Export to SQL
        const dumpCommand = `sqlite3 "${DB_PATH}" .dump`;
        const sqlDump = execSync(dumpCommand, { encoding: 'utf8' });

        // Create new database from dump
        const restoreCommand = `sqlite3 "${REPAIRED_PATH}"`;
        execSync(restoreCommand, { input: sqlDump, encoding: 'utf8' });

        console.log('✅ Database successfully repaired!\n');

        // 3. Replace corrupted DB with repaired version
        console.log('Step 3: Replacing corrupted database...');
        fs.unlinkSync(DB_PATH);
        fs.copyFileSync(REPAIRED_PATH, DB_PATH);
        fs.unlinkSync(REPAIRED_PATH);

        console.log('✅ Database replaced with repaired version\n');
        console.log('✅ REPAIR COMPLETE! Try the cleanup again.');

    } catch (dumpError: any) {
        console.error('❌ Dump/restore failed:', dumpError.message);
        console.log('\n⚠️  Advanced repair required. Options:');
        console.log('1. Restore from backup manually');
        console.log('2. Delete database and re-run migrations (DATA LOSS!)');
        console.log('3. Contact support with backup file');
    }

} catch (error: any) {
    console.error('❌ CRITICAL ERROR:', error.message);
    console.log('\nBackup location:', BACKUP_PATH);
}
