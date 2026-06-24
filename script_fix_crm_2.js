const fs = require('fs');
const path = require('path');

const filePath = path.join('f:', 'Antigravity', 'client', 'src', 'pages', 'crm', 'ClientCrmWorkspace.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace {staffList.map...
content = content.replace(/\{staffList\.map\([\s\S]*?<\/SelectItem>\)\}/g, '');

// Replace assigneeUser
content = content.replace(/const assigneeUser = staffList\.find[^\n]*\n/g, 'const assigneeUser = null;\n');

// Replace writer
content = content.replace(/const writer = staffList\.find[^\n]*\n/g, 'const writer = null;\n');

// Replace agent
content = content.replace(/const agent = staffList\.find[^\n]*\n/g, 'const agent = null;\n');

// Also remove leadAgent just in case
content = content.replace(/const leadAgent = staffList\.find[^\n]*\n/g, 'const leadAgent = null;\n');

fs.writeFileSync(filePath, content);
console.log('Cleanup completed.');
