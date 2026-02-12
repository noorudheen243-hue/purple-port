
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';

const prismaDbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const uploadsDir = path.join(__dirname, '..', 'uploads');

const deleteFile = (filePath: string) => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${filePath}`);
    } else {
        console.log(`File not found (skipped): ${filePath}`);
    }
};

const deleteDirectoryContents = (directory: string) => {
    if (fs.existsSync(directory)) {
        const files = fs.readdirSync(directory);
        for (const file of files) {
            const filePath = path.join(directory, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(filePath);
            }
        }
        console.log(`Cleared contents of: ${directory}`);
    } else {
        console.log(`Directory not found (skipped): ${directory}`);
    }
};

const runCommand = (command: string) => {
    try {
        // Handle Windows npx execution
        const validCommand = process.platform === 'win32' && command.startsWith('npx') ? `${command}.cmd` : command;
        console.log(`Running: ${validCommand}`);
        execSync(validCommand, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (error) {
        console.error(`Error running command: ${command}`, error);
        process.exit(1);
    }
};

const main = async () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Check for --force flag
    const force = process.argv.includes('--force');

    if (!force) {
        const answer = await new Promise<string>(resolve => {
            rl.question('WARNING: This will delete ALL data (Database & Uploads) and reset the system. Are you sure? (yes/no): ', resolve);
        });

        if (answer.toLowerCase() !== 'yes') {
            console.log('Operation cancelled.');
            rl.close();
            process.exit(0);
        }
        rl.close();
    }

    console.log('\n--- STARTING SYSTEM RESET ---\n');

    // 1. Delete Database
    console.log('1. Deleting Database...');
    deleteFile(prismaDbPath);
    deleteFile(prismaDbPath + '-journal'); // SQLite journal if exists

    // 2. Delete Uploads
    console.log('2. Clearing Uploads...');
    deleteDirectoryContents(uploadsDir);

    // 3. Re-run Migrations
    console.log('3. Re-creating Database Structure...');
    runCommand('npx prisma migrate deploy'); // Deploy migrations for production

    // 4. Seed Database
    console.log('4. Seeding Default Data...');
    runCommand('npx prisma db seed');

    console.log('\n--- SYSTEM RESET COMPLETE! ---');
    console.log('Default Admin: admin@qixads.com / password123');
};

main();
