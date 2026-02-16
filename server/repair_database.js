#!/usr/bin/env node

// Standalone Database Repair Script for VPS
// Run this directly on the VPS to repair the corrupted SQLite database

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

async function repairDatabase() {
    const dbPath = path.join(__dirname, 'prisma', 'dev.db');
    const backupPath = `${dbPath}.backup.${Date.now()}`;
    const tempPath = `${dbPath}.temp`;
    const dumpPath = '/tmp/database_dump.sql';

    console.log('=== Database Repair Script ===');
    console.log(`Database: ${dbPath}`);
    console.log('');

    try {
        // Step 1: Backup
        console.log('[1/5] Creating backup...');
        await fs.copyFile(dbPath, backupPath);
        console.log(`✓ Backup created: ${backupPath}`);

        // Step 2: Integrity Check
        console.log('\n[2/5] Running integrity check...');
        const { stdout: integrityResult } = await execAsync(`sqlite3 "${dbPath}" "PRAGMA integrity_check;"`);
        console.log(`Result: ${integrityResult.trim()}`);

        if (integrityResult.trim() === 'ok') {
            console.log('✓ Database is healthy (no repair needed)');
            return;
        }

        // Step 3: Export Data
        console.log('\n[3/5] Exporting data...');
        await execAsync(`sqlite3 "${dbPath}" ".dump" > "${dumpPath}"`);
        console.log(`✓ Data exported to ${dumpPath}`);

        // Step 4: Create New Database
        console.log('\n[4/5] Creating new database...');
        await execAsync(`sqlite3 "${tempPath}" < "${dumpPath}"`);
        console.log('✓ New database created');

        // Step 5: Replace Old Database
        console.log('\n[5/5] Replacing corrupted database...');
        const corruptedPath = `${dbPath}.corrupted`;
        await fs.rename(dbPath, corruptedPath);
        await fs.rename(tempPath, dbPath);
        console.log('✓ Database replaced');

        // Final Check
        console.log('\n[Final] Running integrity check on repaired database...');
        const { stdout: finalCheck } = await execAsync(`sqlite3 "${dbPath}" "PRAGMA integrity_check;"`);
        console.log(`Result: ${finalCheck.trim()}`);

        console.log('\n=== REPAIR COMPLETE ===');
        console.log(`Corrupted DB: ${corruptedPath}`);
        console.log(`Backup: ${backupPath}`);
        console.log(`Repaired DB: ${dbPath}`);
        console.log('\nPlease restart your application: pm2 restart all');

    } catch (error) {
        console.error('\n=== REPAIR FAILED ===');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

repairDatabase();
