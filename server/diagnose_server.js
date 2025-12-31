
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== PURPLE PORT DIAGNOSTIC TOOL ===');
console.log('Timestamp:', new Date().toISOString());
console.log('Current Directory:', process.cwd());

try {
    const gitStatus = execSync('git status --short').toString();
    console.log('\n[GIT STATUS]\n', gitStatus || 'Clean working tree');
    const gitLog = execSync('git log -1 --format="%h - %s"').toString();
    console.log('[LATEST COMMIT]', gitLog.trim());
} catch (e) {
    console.log('[GIT ERROR] Not a git repository or git not found');
}

console.log('\n[FILE CHECKS]');
const checks = [
    'public/index.html',
    '../client/dist/index.html',
    'src/app.ts',
    'package.json'
];

checks.forEach(f => {
    const p = path.join(process.cwd(), f);
    if (fs.existsSync(p)) {
        const stats = fs.statSync(p);
        console.log(`✅ FOUND: ${f} (Modified: ${stats.mtime.toLocaleString()})`);
    } else {
        console.log(`❌ MISSING: ${f}`);
    }
});

console.log('\n[PROCESS CHECK]');
try {
    const pm2List = execSync('pm2 list').toString();
    console.log(pm2List);
} catch (e) {
    console.log('PM2 not found or error listing processes');
}

console.log('===================================');
