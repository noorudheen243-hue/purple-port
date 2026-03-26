const { execSync } = require('child_process');

function runSql(sql) {
    try {
        const dbPath = '/var/www/purple-port/server/prisma/dev.db';
        const cmd = `sqlite3 ${dbPath} "${sql}"`;
        return execSync(cmd).toString();
    } catch (e) {
        return `ERROR: ${e.message}`;
    }
}

console.log('--- TABLE LIST ---');
console.log(runSql('.tables'));

console.log('\n--- LEAD TABLE SCHEMA ---');
console.log(runSql('.schema Lead'));

console.log('\n--- LEAD FOLLOW UP SCHEMA ---');
console.log(runSql('.schema LeadFollowUp'));
