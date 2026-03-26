const { execSync } = require('child_process');
const fs = require('fs');

const dbPaths = [
    '/var/www/antigravity/prisma/dev.db',
    '/var/www/antigravity/server/dist/prisma/dev.db',
    '/var/www/antigravity/server/prisma/dev.db',
    '/var/www/purple-port/server/prisma/dev.db',
    '/var/www/qix-ads-v2.6/server/prisma/dev.sqlite'
];

console.log('Starting global SQLite cleanup for mock-meta-ad-account...');

for (const db of dbPaths) {
    if (fs.existsSync(db)) {
        console.log(`Checking ${db}`);
        try {
            // Use raw SQLite to forcefully delete the rogue entries regardless of Prisma schema definitions
            const query = `sqlite3 ${db} "DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';"`;
            execSync(query);
            console.log(`✅ Cleaned mock entries from ${db} if any existed.`);
        } catch (e) {
            console.error(`❌ Error cleaning ${db}:`, e.message);
        }
    } else {
        console.log(`⚠️ Skipped ${db} (File not found)`);
    }
}
console.log('Cleanup complete.');
