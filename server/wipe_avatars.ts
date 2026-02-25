import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const prisma = new PrismaClient();

async function main() {
    // 1. Clear avatar_url from all users
    const updated = await prisma.user.updateMany({
        data: { avatar_url: null }
    });
    console.log(`✅ Cleared avatar_url for ${updated.count} users`);

    // 2. Also clear logo_url from all clients
    try {
        const clientsUpdated = await (prisma as any).client.updateMany({
            data: { logo_url: null }
        });
        console.log(`✅ Cleared logo_url for ${clientsUpdated.count} clients`);
    } catch (e) {
        console.log('Note: Could not clear client logos (may not exist):', (e as any).message);
    }

    // 3. Delete all files in the uploads directory
    const uploadsDir = path.join(__dirname, '../server/uploads');
    if (fs.existsSync(uploadsDir)) {
        let count = 0;
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                fs.unlinkSync(filePath);
                count++;
            }
        }
        console.log(`✅ Deleted ${count} files from ${uploadsDir}`);
    } else {
        console.log('⚠️  Uploads directory not found at:', uploadsDir);
        // Try alternate path
        const altUploadsDir = path.join(__dirname, 'uploads');
        if (fs.existsSync(altUploadsDir)) {
            let count = 0;
            const files = fs.readdirSync(altUploadsDir);
            for (const file of files) {
                const filePath = path.join(altUploadsDir, file);
                const stat = fs.statSync(filePath);
                if (stat.isFile()) {
                    fs.unlinkSync(filePath);
                    count++;
                }
            }
            console.log(`✅ Deleted ${count} files from ${altUploadsDir}`);
        }
    }

    console.log('\n✅ Done! All profile images wiped from local database and uploads.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
