const ts = require('typescript');
const fs = require('fs');

const file = './src/pages/crm/ClientCrmWorkspace.tsx';
const code = fs.readFileSync(file, 'utf8');

function check(start, end) {
    let lines = code.split('\n');
    let testLines = lines.map((l, i) => {
        if (i < 35) return l;
        if (i >= start && i <= end) return l;
        return '';
    });
    
    let testCode = testLines.join('\n');
    let sourceFile = ts.createSourceFile('test.tsx', testCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let diagnostics = sourceFile.parseDiagnostics;
    if (diagnostics.length > 0) {
        return diagnostics[0].messageText;
    }
    return null;
}

console.log('Line 859 to 1200:', check(858, 1199));
console.log('Line 1080 to 1200 (dialog only):', check(1080, 1199));
console.log('Line 1080 to 1187 (dialog content only):', check(1080, 1186));
console.log('Line 1087 to 1187 (dialog inner div grid only):', check(1086, 1186));
