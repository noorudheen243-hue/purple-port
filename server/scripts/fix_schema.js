const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const content = fs.readFileSync(schemaPath, 'utf8');

const marker = '@@unique([user_id, app_id])';
const markerIndex = content.lastIndexOf(marker);

if (markerIndex !== -1) {
    // We want to keep everything up to the marker + its length
    const keepTill = markerIndex + marker.length;

    const cleanHead = content.substring(0, keepTill);

    // Define the new tail explicitly
    const newTail = `
}

model TransactionSequence {
  id        String @id @default(uuid())
  year      Int
  month     Int
  last_seq  Int    @default(0)

  @@unique([year, month])
}
`;
    // Write the clean head + new tail
    fs.writeFileSync(schemaPath, cleanHead + newTail, 'utf8');
    console.log('Schema fixed: Added closing brace and clean model definition.');
} else {
    console.error('Marker not found!');
}
