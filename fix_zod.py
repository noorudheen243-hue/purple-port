import re

files = [
    r'f:\Antigravity\client\src\pages\team\StaffFormModal.tsx',
    r'f:\Antigravity\client\src\pages\team\OnboardingPage.tsx'
]

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    # Replace .optional().or(z.literal('')) with .nullish().or(z.literal(''))
    content = content.replace(".optional().or(z.literal(''))", ".nullish().or(z.literal(''))")
    
    # Replace remaining .optional() on z.string() with .nullish().or(z.literal(''))
    content = content.replace("z.string().optional()", "z.string().nullish().or(z.literal(''))")

    # Replace .optional() on z.enum(...) with .nullish()
    content = re.sub(r'z\.enum\(\[.*?\]\)\.optional\(\)', lambda m: m.group(0).replace('.optional()', ".nullish().or(z.literal(''))"), content)

    # For z.coerce.number().optional()
    content = content.replace("z.coerce.number().optional()", "z.coerce.number().nullish()")

    with open(filepath, 'w') as f:
        f.write(content)

print("Fix completed.")
