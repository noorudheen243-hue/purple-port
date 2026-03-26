import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function checkImport() {
    const rawData = fs.readFileSync(path.join(__dirname, 'full_backup.json'), 'utf-8');
    const data = JSON.parse(rawData);

    try {
        console.log('Testing single staff profile creation...');
        await prisma.staffProfile.create({ data: data.staffProfiles[0] });
    } catch (e: any) {
        console.error('Real error for StaffProfile:', e.message);
    }
}

checkImport().finally(() => prisma.$disconnect());
