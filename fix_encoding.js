const fs = require('fs');
const path = require('path');

const filePath = 'f:/Antigravity/client/src/pages/portal/ManageServicesView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace em-dash and other related special characters often mangled
content = content.replace(/\u2014/g, '-');
content = content.replace(/\u2013/g, '-');
content = content.replace(/\u0097/g, '-');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Encoding fix complete.');
