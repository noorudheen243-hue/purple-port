
import fs from 'fs';
import path from 'path';

const SOURCE_DIR = path.join('f:', 'Antigravity', 'deploy_package', 'server', 'uploads');
const DEST_DIR = path.join(__dirname, '..', '..', 'uploads'); // f:\Antigravity\server\uploads

async function restoreUploads() {
    console.log(`Source: ${SOURCE_DIR}`);
    console.log(`Dest: ${DEST_DIR}`);

    if (!fs.existsSync(SOURCE_DIR)) {
        console.error('Source directory does not exist!');
        return;
    }

    if (!fs.existsSync(DEST_DIR)) {
        console.log('Creating destination directory...');
        fs.mkdirSync(DEST_DIR, { recursive: true });
    }

    const files = fs.readdirSync(SOURCE_DIR);
    let count = 0;
    let skipped = 0;

    for (const file of files) {
        const srcFile = path.join(SOURCE_DIR, file);
        const destFile = path.join(DEST_DIR, file);

        if (fs.lstatSync(srcFile).isDirectory()) continue;

        if (!fs.existsSync(destFile)) {
            fs.copyFileSync(srcFile, destFile);
            count++;
        } else {
            skipped++;
        }
    }

    console.log(`Restoration Complete.`);
    console.log(`- Copied: ${count} files`);
    console.log(`- Skipped: ${skipped} files (already existed)`);
}

restoreUploads();
