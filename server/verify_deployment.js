const fs = require('fs');
const path = require('path');

const clientDist = path.join(__dirname, '../client/dist/index.html');
const serverPublic = path.join(__dirname, 'public/index.html');

console.log('--- Deployment Verification ---');

function checkFile(filePath, label) {
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`[${label}] Found.`);
        console.log(`   Path: ${filePath}`);
        console.log(`   Modified: ${stats.mtime.toLocaleString()}`);
        return stats.mtime;
    } else {
        console.log(`[${label}] NOT FOUND at ${filePath}`);
        return null;
    }
}

const distTime = checkFile(clientDist, 'Client Build (dist)');
const publicTime = checkFile(serverPublic, 'Server Public (public)');

if (distTime && publicTime) {
    if (publicTime < distTime) {
        console.error('\n[ERROR] Server Public is OLDER than Client Build.');
        console.error('>>> You must run: cp -r ../client/dist/* ./public/');
    } else {
        console.log('\n[SUCCESS] Server Public is up to date.');
    }
} else {
    console.log('\n[INFO] Cannot compare timestamps due to missing files.');
}
console.log('-------------------------------');
