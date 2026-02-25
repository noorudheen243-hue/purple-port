const fs = require('fs');

const files = [
    'f:\\Antigravity\\client\\src\\pages\\team\\StaffFormModal.tsx',
    'f:\\Antigravity\\client\\src\\pages\\team\\OnboardingPage.tsx'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Replace .optional().or(z.literal('')) with .nullish().or(z.literal(''))
    content = content.replace(/\.optional\(\)\.or\(z\.literal\(''\)\)/g, ".nullish().or(z.literal(''))");

    // Replace z.string().optional() with z.string().nullish().or(z.literal(''))
    content = content.replace(/z\.string\(\)\.optional\(\)/g, "z.string().nullish().or(z.literal(''))");

    // Replace z.enum([...]).optional() with .nullish().or(z.literal(''))
    content = content.replace(/z\.enum\(\[\s*(?:'[^']*'(?:\s*,\s*)?)*\s*\]\)\.optional\(\)/g, match => match.replace('.optional()', ".nullish().or(z.literal(''))"));

    // Replace z.coerce.number().optional() with z.coerce.number().nullish()
    content = content.replace(/z\.coerce\.number\(\)\.optional\(\)/g, "z.coerce.number().nullish()");

    // Any surviving .optional() which might cause issues (safeguard)
    content = content.replace(/\.nullable\(\)\.or\(z\.literal\(''\)\)/g, ".nullish().or(z.literal(''))");

    fs.writeFileSync(file, content, 'utf8');
}
console.log("Fix completed.");
