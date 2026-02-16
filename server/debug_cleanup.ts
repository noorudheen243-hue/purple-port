
import prisma from './src/utils/prisma';
import fs from 'fs';
import path from 'path';

async function testCleanup() {
    console.log('Starting Debug Cleanup...');

    try {
        // 1. Delete all Asset records
        console.log('Deleting assets from DB...');
        const result = await prisma.asset.deleteMany({});
        console.log(`Deleted ${result.count} asset records.`);

        // 2. Clear Uploads Directory
        const uploadDir = path.join(process.cwd(), 'uploads');
        console.log(`Cleaning upload dir: ${uploadDir}`);

        if (fs.existsSync(uploadDir)) {
            const files = fs.readdirSync(uploadDir);
            for (const file of files) {
                const filePath = path.join(uploadDir, file);
                try {
                    if (fs.statSync(filePath).isFile()) {
                        console.log(`Deleting file: ${file}`);
                        // fs.unlinkSync(filePath); // Commented out for safety in debug, or keep to test
                    } else {
                        console.log(`Skipping directory: ${file}`);
                    }
                } catch (err: any) {
                    console.error(`Error deleting ${file}:`, err.message);
                }
            }
        } else {
            console.log('Uploads dir does not exist.');
        }

        console.log('Cleanup logic finished successfully.');

    } catch (error: any) {
        console.error('CRITICAL FAILURE during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testCleanup();
