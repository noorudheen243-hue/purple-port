import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Attendance Criteria Rules...');

  const rules = [
    // PRESENT RULES
    {
      rule_code: 'A1',
      rule_type: 'PRESENT',
      name: 'Standard Present',
      description: 'Punch-In AND Punch-Out within shift time (including grace time)',
      parameters: JSON.stringify({ grace_minutes: 15 }),
      is_enabled: true,
    },
    {
      rule_code: 'A2',
      rule_type: 'PRESENT',
      name: 'Regularization Approved',
      description: 'Attendance marked as present due to approved regularization request',
      parameters: JSON.stringify({}),
      is_enabled: true,
    },
    {
      rule_code: 'A3',
      rule_type: 'PRESENT',
      name: 'Approved Leave',
      description: 'Marked as leave based on approved request (excluding LOP)',
      parameters: JSON.stringify({ exclude_types: ['LOP', 'UNPAID'] }),
      is_enabled: true,
    },
    {
      rule_code: 'A4',
      rule_type: 'PRESENT',
      name: 'Holiday / Sunday',
      description: 'Sundays and Admin-defined holidays are counted as Present (Status: Holiday)',
      parameters: JSON.stringify({}),
      is_enabled: true,
    },

    // HALF-DAY RULES
    {
      rule_code: 'C1',
      rule_type: 'HALF_DAY',
      name: 'Late In + Missed Out',
      description: 'Late Punch-In and missing Punch-Out with at least 4 working hours',
      parameters: JSON.stringify({ min_hours: 4 }),
      is_enabled: true,
    },
    {
      rule_code: 'C2',
      rule_type: 'HALF_DAY',
      name: 'Missed In + Early Out',
      description: 'Missing Punch-In and early Punch-Out with at least 4 working hours',
      parameters: JSON.stringify({ min_hours: 4 }),
      is_enabled: true,
    },
    {
      rule_code: 'C3',
      rule_type: 'HALF_DAY',
      name: 'Late In + Early Out',
      description: 'Late Punch-In and early Punch-Out with at least 4 working hours',
      parameters: JSON.stringify({ min_hours: 4 }),
      is_enabled: true,
    },
    {
      rule_code: 'C4',
      rule_type: 'HALF_DAY',
      name: 'Single Punch',
      description: 'Missing any one punch (default case)',
      parameters: JSON.stringify({}),
      is_enabled: true,
    },
    {
      rule_code: 'C5',
      rule_type: 'HALF_DAY',
      name: 'Late Entry',
      description: 'Punch-In after grace time but before limit',
      parameters: JSON.stringify({}),
      is_enabled: true,
    },
    {
      rule_code: 'C6',
      rule_type: 'HALF_DAY',
      name: 'Early Exit',
      description: 'Punch-Out before shift end with at least 4 working hours',
      parameters: JSON.stringify({ min_hours: 4 }),
      is_enabled: true,
    },

    // ABSENT RULES
    {
      rule_code: 'B1',
      rule_type: 'ABSENT',
      name: 'No Punches',
      description: 'No Punch-In AND No Punch-Out recorded',
      parameters: JSON.stringify({}),
      is_enabled: true,
    },
    {
      rule_code: 'B2',
      rule_type: 'ABSENT',
      name: 'Approved LOP',
      description: 'Marked as absent due to approved Loss of Pay (LOP) leave',
      parameters: JSON.stringify({ types: ['LOP', 'UNPAID'] }),
      is_enabled: true,
    },
  ];

  for (const rule of rules) {
    await prisma.attendanceCriteriaConfig.upsert({
      where: { rule_code: rule.rule_code },
      update: rule,
      create: rule,
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
