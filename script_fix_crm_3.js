const fs = require('fs');
const path = require('path');
const filePath = path.join('f:', 'Antigravity', 'client', 'src', 'pages', 'crm', 'ClientCrmWorkspace.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/const assigneeUser = null;/g, 'const assigneeUser: any = null;');
content = content.replace(/const writer = null;/g, 'const writer: any = null;');
content = content.replace(/const agent = null;/g, 'const agent: any = null;');
content = content.replace(/const leadAgent = null;/g, 'const leadAgent: any = null;');

fs.writeFileSync(filePath, content);
console.log('Fixed types to any');
